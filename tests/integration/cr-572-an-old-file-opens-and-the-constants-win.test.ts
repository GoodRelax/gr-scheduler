// CR-572 / DFC-995: a file that still carries constants and screen values opens, drops them, and the constants win.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  documentFromJson,
  jsonFromDocument,
} from '../../src/adapter/document-codec/document-codec'
import type {
  CommandItem,
  IconId,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { drawnSettingsOf } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const OP_6_READS_WHAT_IT_KNOWS =
  '`documentSettings` は、この造りのスキーマ（`05-07-design.md` の Chapter 6.1）が解釈できるものだけを読むこと（MUST）'
const OP_6_DROPS_THE_UNKNOWN = '知らない鍵（退役した鍵を含む）は捨て'
const OP_6_NEVER_WRITES_BACK = '捨てた鍵を書き戻してはならない（MUST NOT）'
const OP_6_TELLS_NOTHING_WHEN_KNOWN =
  '形式の版がこの造りの知る最大の版を超えない文書では、捨てたことも既定値に戻したことも告げない'
const EZ_2_WAIT = 'ポインタがアイコンに入ってから `_assets/tbl-settings.md` の `S-124` が経ったら、そのアイコンの説明を出すこと（MUST）'

const BUILT_VERSION: string = (startupTemplate as { schemaVersion: string }).schemaVersion

/** @purity pure */
function msOfRow(table: string, id: string): number {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const found = /(\d+(?:\.\d+)?)/.exec(bare(row.by['値'] ?? ''))
  if (found === null) throw new Error(`table ${table} row ${id} states no number`)
  return Number(found[1])
}

const S_124_MS = msOfRow('T-212', 'S-124')
const STALE_DELAY_MS = 1000

const CARRIED_OVER: Readonly<Record<string, unknown>> = {
  iconHintDelayMs: STALE_DELAY_MS,
  basePlanHeight: 40,
  themePreference: 'dark',
  guideCursorMode: 'crosshair',
  dualCursor: { date1: '2026-01-05', date2: '2026-01-09' },
  propertyPanelWidth: 500,
}

/** @purity pure */
function oldFileText(): string {
  const root = JSON.parse(JSON.stringify(startupTemplate)) as Record<string, Record<string, unknown>>
  root['documentSettings'] = { ...root['documentSettings'], ...CARRIED_OVER }
  return JSON.stringify(root)
}

/** @purity pure */
function opened(): { document: Document; unreadColumns: readonly string[]; formatVersion: string } {
  const read = documentFromJson(oldFileText(), BUILT_VERSION)
  if (!read.ok) throw new Error(`OP-6 (MUST NOT refuse): refused ${JSON.stringify(read.faults)}`)
  return { document: read.document, unreadColumns: read.unreadColumns, formatVersion: read.formatVersion }
}

const ICON: IconId = 'IC-7'

const COMMAND: CommandItem = {
  icon: ICON,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: 'IC-7',
}

const VIEW: Omit<ScreenView, 'tooltips'> = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [COMMAND],
    language: 'ja',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
}

const SESSION: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: 'ja', helpLanguage: 'ja' },
}

/** @purity pure */
function restingOnTheIcon(restedMs: number): ScreenViewReadings {
  return {
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer: { x: 5, y: 5 },
    pointerRestedMs: restedMs,
    // WHY: EZ-2 -- the icon wait counts from entering the icon (CR-576)
    hintTargetDwellMs: restedMs,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: ICON,
    themePreference: 'light',
    themeHue: 214,
    selectedGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    rowBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }
}

describe('CR-572 item 3 -- the manuscript these cases are driven by', () => {
  it('OP-6 of table T-024a and EZ-2 of table T-040 still say it word for word', () => {
    expect(REQUIREMENTS).toContain(OP_6_READS_WHAT_IT_KNOWS)
    expect(REQUIREMENTS).toContain(OP_6_DROPS_THE_UNKNOWN)
    expect(REQUIREMENTS).toContain(OP_6_NEVER_WRITES_BACK)
    expect(REQUIREMENTS).toContain(OP_6_TELLS_NOTHING_WHEN_KNOWN)
    expect(REQUIREMENTS).toContain(EZ_2_WAIT)
  })

  it('the stale delay differs from S-124, so a case below can tell which one is in effect', () => {
    expect(S_124_MS).toBeGreaterThan(0)
    expect(S_124_MS + 1).toBeLessThan(STALE_DELAY_MS)
  })
})

describe('CR-572 item 3 -- an old file opens and the carried keys are dropped (OP-6)', () => {
  it(`OP-6 「${OP_6_READS_WHAT_IT_KNOWS}」: it opens, at this build's own version`, () => {
    expect(opened().formatVersion).toBe('known')
  })

  it(`OP-6 「${OP_6_DROPS_THE_UNKNOWN}」: none of the six is in the opened document's settings`, () => {
    const settings = opened().document.documentSettings as unknown as Record<string, unknown>
    expect(Object.keys(CARRIED_OVER).filter((key) => Object.hasOwn(settings, key))).toEqual([])
  })

  it(`OP-6 「${OP_6_TELLS_NOTHING_WHEN_KNOWN}」: no unread column is reported`, () => {
    expect(opened().unreadColumns).toEqual([])
  })

  it(`OP-6 「${OP_6_NEVER_WRITES_BACK}」: the next save writes none of them`, () => {
    const saved = JSON.parse(jsonFromDocument(opened().document)) as { documentSettings: Record<string, unknown> }
    expect(Object.keys(CARRIED_OVER).filter((key) => Object.hasOwn(saved.documentSettings, key))).toEqual([])
  })
})

describe('CR-572 item 3 -- the delay in effect is S-124, not the 1000 the file carried (DFC-995)', () => {
  it(`EZ-2 「${EZ_2_WAIT}」: resting S-124 + 1 ms on an icon of the opened document shows its explanation`, () => {
    const settings = opened().document.documentSettings
    expect(tooltipsFromScreenView(VIEW, settings, SESSION, restingOnTheIcon(S_124_MS + 1)).length).toBe(1)
  })

  it('EZ-2: a settings object still carrying the stale 1000 does not delay the explanation either', () => {
    const stale = { ...opened().document.documentSettings, ...CARRIED_OVER } as unknown as DocumentSettings
    expect(tooltipsFromScreenView(VIEW, stale, SESSION, restingOnTheIcon(S_124_MS + 1)).length).toBe(1)
  })

  it('control: resting less than S-124 shows nothing', () => {
    const settings = opened().document.documentSettings
    expect(tooltipsFromScreenView(VIEW, settings, SESSION, restingOnTheIcon(S_124_MS - 1))).toEqual([])
  })

  it('the drawn view carries S-124 and the constant basePlanHeight whatever the stored object carries', () => {
    const clean = opened().document.documentSettings
    const stale = { ...clean, ...CARRIED_OVER } as unknown as DocumentSettings
    expect(drawnSettingsOf(stale).iconHintDelayMs).toBe(S_124_MS)
    expect(drawnSettingsOf(clean).iconHintDelayMs).toBe(S_124_MS)
    expect(drawnSettingsOf(stale).basePlanHeight).toBe(drawnSettingsOf(clean).basePlanHeight)
  })
})
