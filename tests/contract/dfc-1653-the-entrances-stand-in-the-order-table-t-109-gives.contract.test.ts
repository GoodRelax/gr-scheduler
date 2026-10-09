// DFC-1653: T-109 preamble -- a surface's entrances stand in one order: the groups gather into blocks, a block opens where its first row stands, rows keep the table's order.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { appHeaderItemsFromDocument } from '../../src/adapter/screen-renderer/app-header-items'
import { commandPaletteFromSession } from '../../src/adapter/screen-renderer/command-palette'
import type { ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'
import { settingDefaultOf } from '../fixtures/setting-default'
import { bare, specTable, unbroken } from './spec-table'
import { templateDocument } from './w3-t3-frame-stage'

const GLOSSARY = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-glossary.md'), 'utf8').replace(/\r\n/g, '\n'))

// WHY: each clause is cut from the manuscript as check 39 reads it, so the cases cannot drift from the words they test.
const T_109_ORDER =
  '入口を並べる順は、面ごとに、本表の `群` の欄と行の順が決める —— 同じ面で同じ `群` の行を 1 つの塊に寄せ、塊どうしは塊の最初の行が本表に現れる順に、塊の中は本表の行の順に並べること（MUST）'
const T_109_GROUP_ONLY_FOR_BLOCKS = '⛔ 本表の `群` の欄は、この塊を決めるためだけに在る。'
const IC_7_FIRST = '`App Header` の左端に置くためである'

describe('DFC-1653 the manuscript these cases are driven by', () => {
  it('T-109 still gives one order rule and keeps the group column to blocks only', () => {
    expect(GLOSSARY).toContain(T_109_ORDER)
    expect(GLOSSARY).toContain(T_109_GROUP_ONLY_FOR_BLOCKS)
    expect(GLOSSARY).toContain(IC_7_FIRST)
  })
})

interface Row {
  readonly id: string
  readonly surfaces: readonly string[]
  readonly group: string
}

// see T-109
const ROWS: readonly Row[] = specTable('T-109').rows.map((one) => ({
  id: one.id,
  surfaces: [...(one.by['面'] ?? '').matchAll(/`([^`]+)`/g)].map((found) => found[1] ?? ''),
  group: bare(one.by['群'] ?? '').trim(),
}))

// WHY: the rule of the preamble, written out: blocks open where their first row stands, rows inside a block keep the table's order.
function orderedByTheRule(onSurface: string): readonly string[] {
  const rows = ROWS.filter((one) => one.surfaces.includes(onSurface))
  const blocks: { group: string; ids: string[] }[] = []
  for (const row of rows) {
    const block = blocks.find((one) => one.group === row.group)
    if (block === undefined) blocks.push({ group: row.group, ids: [row.id] })
    else block.ids.push(row.id)
  }
  return blocks.flatMap((one) => one.ids)
}

const SETTINGS = ((): DocumentSettings => {
  const heads = new Set(Object.keys(SETTINGS_DEFAULTS).map((key) => key.split('.')[0] as string))
  const built: Record<string, unknown> = {}
  for (const head of heads) built[head] = settingDefaultOf(head)
  built['displayScale'] = DEFAULT_DISPLAY_SCALE
  return built as unknown as DocumentSettings
})()

const SESSION: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: 'en', helpLanguage: 'en', paletteDisplayState: { kind: 'shown', child: { kind: 'expanded' } } },
}

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

describe('T-109 (MUST): the App Header shows its entrances in the table order, groups as blocks (DFC-1653)', () => {
  const document = templateDocument()
  const shown = appHeaderItemsFromDocument(document.schedule, SETTINGS, SESSION, READINGS).commands.map((one) => one.icon)
  const expected = orderedByTheRule('App Header')

  it('the table holds entrances for the App Header to walk', () => {
    expect(expected.length).toBeGreaterThan(5)
  })

  it('every App Header entrance of the table is drawn, in the rule\'s order', () => {
    expect(shown).toEqual(expected)
  })

  it('IC-7, the only row of its group, stands at the left end (its note says so)', () => {
    expect(shown[0]).toBe('IC-7')
  })
})

describe('T-109 (MUST): the Command Palette shows its entrances in the same rule\'s order', () => {
  const document = templateDocument()
  const palette = commandPaletteFromSession(SESSION, SETTINGS, emptySelection(), READINGS, document.schedule)
  const shown = (palette?.groups ?? []).flatMap((group) => group.commands.map((one) => one.icon))
  const expected = orderedByTheRule('Command Palette')

  it('the palette is drawn and holds entrances', () => {
    expect(palette).not.toBeNull()
    expect(shown.length).toBeGreaterThan(5)
  })

  // WHY: the palette may fold or leave out rows (FR-078, the two non-button rows), so what it shows must be an ordered subset of the rule's order.
  it('what it shows is the rule\'s order with some rows left out, none out of place', () => {
    const kept = expected.filter((id) => shown.includes(id))
    expect(shown).toEqual(kept)
  })

  it('each group is one block of the palette', () => {
    const groups = (palette?.groups ?? []).map((group) => group.commands.map((one) => one.icon))
    const seen = new Set<string>()
    for (const ids of groups) {
      for (const id of ids) {
        expect(seen.has(id), `${id} appears in two groups`).toBe(false)
        seen.add(id)
      }
    }
  })
})
