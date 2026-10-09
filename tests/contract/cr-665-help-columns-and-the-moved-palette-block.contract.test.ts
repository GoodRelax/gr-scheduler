// CR-665 spec-only tests: table T-256 places the help blocks, the palette's align group moves under the Task Group Panel, and the open details leave the help.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  screenViewFromRegions,
  type DisplayLanguage,
  type HelpEntry,
  type HelpModal,
  type ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { emptyDialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import { SETTINGS_CONSTANTS, SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ScreenRect, ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const T_256_SPLIT =
  '4` は後から足した段である）。⭐ `Command Palette` の入口を 2 つの塊に分け、表 T-109 の `群` が `揃える` の行を、`HC-4` の `Task Group Panel` の塊の下の塊へ移すこと（MUST）'
const T_256_CONTINUED_HEADING =
  '段目を行見出しパネルの下の枠へ移すと定めた。群は名で名指す —— 群の中の行は 表 T-109 の `群` の欄が決めるので、行が群を移っても本表は書き換えない。⭐ 移した塊の見出しは、パレットの続きであることを言う語とすること（MUST）'
const FR_036_LEFT_OFF =
  'd`・`Open Chooser`・`Difference Review` の面だけ（`Help Modal` を併せて持つものを含む）である行と、`IC-52`・`IC-53`・`IC-75` を、段に載せてはならない（MUST NOT）'
const T_256_USER_WORDS = '（利用者が「コマンドパレット（続き）」と定めた）'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['T-256 (MUST) the align group moves under the Task Group Panel', T_256_SPLIT],
  ['T-256 (MUST) the moved block says it continues the palette', T_256_CONTINUED_HEADING],
  ['FR-036 (MUST NOT) the surfaces left off the help', FR_036_LEFT_OFF],
  ['T-256 the user named the heading', T_256_USER_WORDS],
]

describe('CR-665 the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('01-04 still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const T_256 = specTable('T-256')
const T_109 = specTable('T-109')

const surfaceOf = (cell: string): string => cell.replace(/`/g, '').trim()

// see T-109
const PALETTE_ALIGN_ROWS: readonly string[] = T_109.rows
  .filter((row) => surfaceOf(row.by['面'] ?? '') === 'Command Palette' && bare(row.by['群'] ?? '') === '揃える')
  .map((row) => row.id)

// see FR-036
const LEFT_OFF_SURFACES = new Set(['Open Chooser', 'Difference Review'])
const LEFT_OFF_ROWS: readonly string[] = T_109.rows
  .filter((row) => LEFT_OFF_SURFACES.has(surfaceOf(row.by['面'] ?? '')))
  .map((row) => row.id)

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({ x, y, width, height })

const SETTINGS = { ...SETTINGS_DEFAULTS, taskGroupPanelWidth: 400 } as unknown as DocumentSettings

const REGIONS: ScreenRegions = (() => {
  const width = 1280
  const height = 627
  const headerHeight = 56
  const rulerHeight = 48
  const titleWidth = SETTINGS.taskGroupPanelWidth
  const padding = SETTINGS_CONSTANTS.canvasPadding
  const canvas = rect(0, headerHeight, width, height - headerHeight)
  const taskGroupAreaWidth = canvas.width - padding - titleWidth - 8
  return {
    appHeader: rect(0, 0, width, headerHeight),
    scheduleCanvas: canvas,
    taskGroupPanel: rect(canvas.x, canvas.y, titleWidth, canvas.height),
    timeRuler: rect(canvas.x + titleWidth, canvas.y, taskGroupAreaWidth, rulerHeight),
    propertiesPanel: rect(canvas.x + canvas.width, canvas.y, 0, canvas.height),
    taskGroupArea: rect(canvas.x + titleWidth, canvas.y + rulerHeight, taskGroupAreaWidth, canvas.height - rulerHeight - padding - 8),
  }
})()

const SCHEDULE = {
  project: { title: 'a document', themeHue: 214, uidHighWaterMark: 0, minutesPerDay: null },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  iconUnderPointer: null,
  commandPaletteAt: { x: 500, y: 300 },
  themePreference: 'light',
  themeHue: 214,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const helpShown = (language: DisplayLanguage): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage: language,
    helpLanguage: language,
    propertiesPanelContentState: { kind: 'selectionDisplayed', subject: { selection: emptySelection(), groupIds: [] } },
    helpDisplayState: { kind: 'shown', child: { kind: 'normal' } },
  },
})

const helpOf = (language: DisplayLanguage): HelpModal => {
  const view = screenViewFromRegions(REGIONS, SCHEDULE, SETTINGS, emptySelection(), helpShown(language), emptyDialogueLog(), READINGS)
  if (view.helpModal === undefined || view.helpModal === null) throw new Error('the help is not in the view')
  return view.helpModal
}

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en'] as DisplayLanguage[]

/** @purity pure */
function inFirstSeenOrder(values: readonly string[]): string[] {
  const out: string[] = []
  for (const one of values) if (!out.includes(one)) out.push(one)
  return out
}

const blocksIn = (entries: readonly HelpEntry[], column: string): string[] =>
  inFirstSeenOrder(entries.filter((entry) => entry.column === column).map((entry) => entry.block))

const itemRowsOf = (entries: readonly HelpEntry[], block: string): string[] =>
  entries.filter((entry) => entry.block === block && entry.kind !== 'heading').map((entry) => entry.row)

const headingOf = (entries: readonly HelpEntry[], block: string): string => {
  const found = entries.find((entry) => entry.block === block && entry.kind === 'heading')
  if (found === undefined) throw new Error(`the block ${block} has no heading`)
  return found.text
}

describe('T-256: the columns stand in the table\'s row order, HC-4 third', () => {
  it.each(LANGUAGES)('%s: the columns, left to right, are the rows of table T-256 in order', (language) => {
    expect(inFirstSeenOrder(helpOf(language).entries.map((entry) => entry.column))).toEqual(T_256.rows.map((row) => row.id))
  })
})

describe(`T-256 (MUST): ${T_256_SPLIT}`, () => {
  it('premise: table T-109 holds palette rows in the align group', () => {
    expect(PALETTE_ALIGN_ROWS.length).toBeGreaterThan(0)
  })

  it.each(LANGUAGES)('%s: HC-4 holds the Task Group Panel block, then one block more, and nothing else', (language) => {
    const blocks = blocksIn(helpOf(language).entries, 'HC-4')
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toBe('Task Group Panel')
  })

  it.each(LANGUAGES)('%s: the block under the Task Group Panel holds exactly the align group of the palette', (language) => {
    const entries = helpOf(language).entries
    const moved = blocksIn(entries, 'HC-4')[1] ?? ''
    expect([...itemRowsOf(entries, moved)].sort()).toEqual([...PALETTE_ALIGN_ROWS].sort())
  })

  it.each(LANGUAGES)('%s: HC-3 keeps the palette without the align group', (language) => {
    const entries = helpOf(language).entries
    const rows = entries.filter((entry) => entry.column === 'HC-3' && entry.kind !== 'heading').map((entry) => entry.row)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.filter((row) => PALETTE_ALIGN_ROWS.includes(row))).toEqual([])
  })
})

describe(`T-256 (MUST): ${T_256_CONTINUED_HEADING}`, () => {
  it('ja: the moved block is headed with the user\'s words', () => {
    const entries = helpOf('ja' as DisplayLanguage).entries
    expect(headingOf(entries, blocksIn(entries, 'HC-4')[1] ?? '')).toBe('コマンドパレット（続き）')
  })

  it.each(LANGUAGES)('%s: the moved block heading names the palette and differs from the HC-3 heading', (language) => {
    const entries = helpOf(language).entries
    const moved = headingOf(entries, blocksIn(entries, 'HC-4')[1] ?? '')
    const palette = headingOf(entries, blocksIn(entries, 'HC-3')[0] ?? '')
    expect(moved.startsWith(palette), `${moved} / ${palette}`).toBe(true)
    expect(moved).not.toBe(palette)
  })
})

describe(`FR-036 (MUST NOT): ${FR_036_LEFT_OFF}`, () => {
  it('premise: the open choices and the review choices are rows of table T-109', () => {
    for (const id of ['IC-71', 'IC-72', 'IC-73', 'IC-95', 'IC-96', 'IC-97']) expect(LEFT_OFF_ROWS).toContain(id)
  })

  it.each(LANGUAGES)('%s: no item of the help is an Open Chooser or Difference Review row, nor IC-52 / IC-53 / IC-75', (language) => {
    const rows = helpOf(language).entries.map((entry) => entry.row)
    const banned = [...LEFT_OFF_ROWS, 'IC-52', 'IC-53', 'IC-75']
    expect(rows.filter((row) => banned.includes(row))).toEqual([])
  })
})
