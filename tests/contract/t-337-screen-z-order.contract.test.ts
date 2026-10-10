// FR-152 table T-337: the data-uz layers of the screen stack by z-index in the front-to-back order the table gives.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  Confirmation,
  Notice,
  OpenModal,
  DelayDiagnosticsReportView,
  PaletteGroup,
  ScreenView,
  SearchPanelView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  byRole,
  selfAndDescendants,
  serialize,
  styleMap,
  surfaceOf,
  wire,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_152_ONE_TABLE =
  '`GRS` は、画面の上で重なる UI パーツの前後（どれが手前に見え、どれが押下を受けるか）を 1 つの表で決めること（MUST）。'
const FR_152_FOLLOW_T_337 = '前後は表 T-337 に従うこと。'
const T_337_CAPTION = '**表 T-337 — 画面の重ね順（前面から背面へ）**'
const T_337_NO_PART_WITHOUT_A_ROW =
  '⛔ 本表に行の無い UI パーツを画面に重ねてはならない（MUST NOT） —— 新しく重なる UI パーツを足す日は、本表に行を足すこと（MUST）。'
const T_337_THE_FRONT_ONE_TAKES_THE_PRESS = '⭐ 押下は、その点で最も手前に描かれた UI パーツが受けること（MUST）。'
const T_337_ROW_ORDER_IS_NOT_ID_ORDER = '⚠️ 本表の並び順と行 ID の順は一致しない —— 理由は 表 T-020 の注と同じである。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-152 (MUST) -- one table decides the front and back of the UI parts', FR_152_ONE_TABLE],
  ['FR-152 -- the order is table T-337', FR_152_FOLLOW_T_337],
  ['T-337 -- the caption says the rows run front to back', T_337_CAPTION],
  ['T-337 (MUST NOT) -- no UI part is stacked on the screen without a row', T_337_NO_PART_WITHOUT_A_ROW],
  ['T-337 (MUST) -- the part drawn in front takes the press', T_337_THE_FRONT_ONE_TAKES_THE_PRESS],
  ['T-337 -- the written order is not the row ID order', T_337_ROW_ORDER_IS_NOT_ID_ORDER],
]

describe('T-337 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const RANK = '順'
const PART = 'UI パーツ'

const numberIn = (text: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(text)
  if (found === null) throw new Error(`no number in ${JSON.stringify(text)}`)
  return Number(found[0])
}

const ROWS = specTable('T-337').rows.map((row) => ({
  id: row.id,
  rank: numberIn(row.by[RANK] ?? ''),
  part: row.by[PART] ?? '',
}))

const says = (id: string): string => {
  const row = ROWS.find((one) => one.id === id)
  return row === undefined ? `T-337 has no row ${id}` : `T-337 ${id} [${RANK}: ${row.rank}] ${row.part}`
}

// WHY: CR-575 section 5 reserved UZ-6 until a window was drawn there; the search panel and the
// report window (DFC-1711) now are, so no row is reserved. The exemption covers absence only.
const RESERVED_NOT_YET_ON_SCREEN = new Set<string>()

const englishName = (id: string): string => {
  const row = specTable('T-103').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-103 has no row ${id}`)
  return bare(row.by['確定名（英）'] ?? '')
}

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: patch.icon,
  ...patch,
})

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const PALETTE = {
  at: { x: 400, y: 300 },
  grabBandHeight: 24,
  minimize: command({ icon: 'IC-75' }),
  isMinimized: false,
  groups: [{ name: 'PaletteGroupOne', commands: [command({ icon: 'IC-61', label: 'PaletteCommandOne' })] } as PaletteGroup],
  armedText: 'ArmedWordHere',
} as CommandPalette

const NOTICE: Notice = {
  manner: 'NT-1',
  mannerText: 'Not accepted',
  text: 'The finish is before the start',
  nextSteps: ['Move the finish after the start'],
  affectedCount: 3,
  dismissText: 'OK',
  dismissKey: 'notice-1',
  raisedNotices: [],
}

const CONFIRMATION: Confirmation = {
  manner: 'NT-7',
  mannerText: 'Confirm',
  question: 'Delete these task groups?',
  text: 'Delete these task groups?',
  items: [{ name: 'Task group alpha', isShownOnAnotherTaskGroup: false }],
  answers: [
    { answer: 'yes', text: 'Yes' },
    { answer: 'no', text: 'No' },
  ],
  shownOnAnotherTaskGroupMark: '*',
}

const HELP: OpenModal = { surface: 'Help Modal', heading: 'HelpHeading', commands: [] }

const CHOOSER: OpenModal = {
  surface: 'Export Chooser',
  heading: 'Chooser heading',
  commands: [],
  formats: [{ row: 'IO-1', name: 'GRS JSON', extension: '.json' }],
}

const CANVAS = { x: 0, y: 40, width: 800, height: 600 }

const SEARCH_PANEL: SearchPanelView = {
  heading: 'SearchHeading',
  shown: 'normal',
  canvas: CANVAS,
  at: null,
  size: null,
  textSizeStep: 0,
  tableEntries: [],
  titleEntries: [],
  word: '',
  table: 'tasks',
  columns: [],
  filterMenu: null,
  rows: [],
}

const { table: _table, ...SEARCH_PANEL_FRAME } = SEARCH_PANEL

const REPORT: DelayDiagnosticsReportView = {
  ...SEARCH_PANEL_FRAME,
  heading: 'ReportHeading',
  isInFront: true,
  toolEntries: [],
  summary: [],
  rows: [],
  jumpAt: 3,
}

const viewWith = (openModal: OpenModal): ScreenView => ({
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: EMPTY_HEADER,
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: PALETTE,
  openModal,
  notices: [NOTICE],
  confirmation: CONFIRMATION,
  dialogueField: null,
  tooltips: [],
  searchPanel: SEARCH_PANEL,
  delayDiagnosticsReport: REPORT,
})

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

// WHY: one surface is open at a time (S-99g), so the help and the export chooser -- UZ-7 and
// UZ-13 -- are each drawn on a screen of their own.
function screens(): { help: Stage; chooser: Stage } {
  const help = wire(THEME, { 'App Header': 37 })
  surfaceOf(help).showScreenView(viewWith(HELP))
  const chooser = wire(THEME, { 'App Header': 37 })
  surfaceOf(chooser).showScreenView(viewWith(CHOOSER))
  return { help, chooser }
}

const LAYER = 'data-uz'

const layersOf = (built: Stage): FakeElement[] =>
  selfAndDescendants(built.root()).filter((one) => one.getAttribute(LAYER) !== null)

const layerIdsOf = (built: Stage): string[] => layersOf(built).map((one) => one.getAttribute(LAYER) ?? '')

const zIndexOf = (element: FakeElement): number => {
  const written = (styleMap(element).get('z-index') ?? '').trim()
  return /^-?\d+$/.test(written) ? Number(written) : Number.NaN
}

const isPositioned = (element: FakeElement): boolean =>
  ['absolute', 'fixed', 'relative', 'sticky'].includes((styleMap(element).get('position') ?? '').trim())

const layerHolding = (element: FakeElement): string | null => {
  for (let at: FakeElement | null = element; at !== null; at = at.parentNode) {
    const id = at.getAttribute(LAYER)
    if (id !== null) return id
  }
  return null
}

const isFrontToBack = (
  stacked: readonly { id: string; z: number }[],
  ranked: readonly { id: string; rank: number }[],
): boolean => {
  for (const front of stacked) {
    for (const back of stacked) {
      const frontRank = ranked.find((one) => one.id === front.id)?.rank
      const backRank = ranked.find((one) => one.id === back.id)?.rank
      if (frontRank === undefined || backRank === undefined) return false
      if (frontRank < backRank && !(front.z > back.z)) return false
    }
  }
  return true
}

const stackedOf = (built: Stage): { id: string; z: number }[] =>
  layersOf(built).map((one) => ({ id: one.getAttribute(LAYER) ?? '', z: zIndexOf(one) }))

describe('T-337 -- the premises read from the manuscript', () => {
  it(`${T_337_CAPTION}: the rows are written in the order of ${RANK}, 1 at the top`, () => {
    expect(ROWS.length, T_337_CAPTION).toBeGreaterThan(0)
    expect(ROWS.map((one) => one.rank), T_337_CAPTION).toEqual(ROWS.map((_one, index) => index + 1))
  })

  it(T_337_ROW_ORDER_IS_NOT_ID_ORDER, () => {
    const written = ROWS.map((one) => one.id)
    const byId = [...written].sort((a, b) => numberIn(a) - numberIn(b))
    expect(written, T_337_ROW_ORDER_IS_NOT_ID_ORDER).not.toEqual(byId)
  })

  it('CR-575 section 5: every reserved row is still a row of the table', () => {
    for (const id of RESERVED_NOT_YET_ON_SCREEN) expect(ROWS.map((one) => one.id), says(id)).toContain(id)
  })
})

describe('T-337 -- every row of the table is a layer on the screen, and nothing else is', () => {
  for (const row of ROWS) {
    if (RESERVED_NOT_YET_ON_SCREEN.has(row.id)) continue
    it(`${says(row.id)} -- a ${LAYER}="${row.id}" layer is on the screen`, () => {
      const { help, chooser } = screens()
      expect(layerIdsOf(help), `${says(row.id)} (help open)`).toContain(row.id)
      expect(layerIdsOf(chooser), `${says(row.id)} (export chooser open)`).toContain(row.id)
    })
  }

  it(`${T_337_NO_PART_WITHOUT_A_ROW} -- every ${LAYER} on the screen names a row of the table`, () => {
    const { help, chooser } = screens()
    const known = new Set(ROWS.map((one) => one.id))
    for (const id of [...layerIdsOf(help), ...layerIdsOf(chooser)]) {
      expect(known.has(id), `${LAYER}="${id}" is on the screen but table T-337 has no such row`).toBe(true)
    }
  })
})

describe('T-337 -- the layers stack by z-index in the order the table gives', () => {
  it('every layer states an integer z-index on a positioned box, and all share one parent (one stacking context)', () => {
    const { help } = screens()
    const layers = layersOf(help)
    expect(layers.length, `no ${LAYER} layer is on the screen`).toBeGreaterThan(0)
    for (const layer of layers) {
      expect(Number.isInteger(zIndexOf(layer)), `${serialize(layer)} states no integer z-index`).toBe(true)
      expect(isPositioned(layer), `${serialize(layer)} is not positioned, so its z-index stacks nothing`).toBe(true)
    }
    const parents = new Set(layers.map((one) => one.parentNode))
    expect(parents.size, `the ${LAYER} layers sit under ${parents.size} parents, not one stacking context`).toBe(1)
  })

  for (const row of ROWS) {
    it(`${says(row.id)} -- every row above it is stacked in front, every row below it behind`, () => {
      for (const built of Object.values(screens())) {
        const stacked = stackedOf(built)
        const here = stacked.filter((one) => one.id === row.id)
        if (here.length === 0) {
          expect(RESERVED_NOT_YET_ON_SCREEN.has(row.id), `${says(row.id)} is not on the screen`).toBe(true)
          continue
        }
        for (const mine of here) {
          for (const other of stacked) {
            if (other.id === row.id) continue
            const otherRank = ROWS.find((one) => one.id === other.id)?.rank
            if (otherRank === undefined) continue
            if (otherRank < row.rank) {
              expect(other.z, `${says(other.id)} in front of ${says(row.id)}`).toBeGreaterThan(mine.z)
            } else {
              expect(other.z, `${says(other.id)} behind ${says(row.id)}`).toBeLessThan(mine.z)
            }
          }
        }
      }
    })
  }
})

// WHY: each pair is checked against the row's UI part cell first, so a part that moves to another
// row turns the premise red instead of this list going stale.
const PARTS: readonly (readonly [string, string, 'help' | 'chooser'])[] = [
  ['U-55', 'UZ-3', 'help'],
  ['U-57', 'UZ-4', 'help'],
  ['U-26', 'UZ-5', 'help'],
  ['U-54', 'UZ-13', 'chooser'],
  ['U-30', 'UZ-7', 'help'],
  ['U-31', 'UZ-8', 'help'],
  ['U-64', 'UZ-6', 'help'],
  ['U-66', 'UZ-6', 'help'],
]

describe('T-337 -- each UI part is drawn inside the layer of the row that names it', () => {
  it.each(PARTS)('T-103 %s is drawn in the %s layer', (part, row, which) => {
    const name = englishName(part)
    const cell = ROWS.find((one) => one.id === row)?.part ?? ''
    expect(cell, `premise: ${says(row)} names \`${name}\``).toContain(`\`${name}\``)
    const drawn = byRole(screens()[which].root(), name)
    expect(drawn.length, `premise: the view draws a [data-role="${name}"]`).toBeGreaterThan(0)
    for (const one of drawn) expect(layerHolding(one), `${says(row)}: ${serialize(one)}`).toBe(row)
  })
})

describe('T-337 control -- the order check refuses a swapped pair', () => {
  const sound = ROWS.map((one, index) => ({ id: one.id, z: ROWS.length - index }))
  const zOf = (id: string): number => sound.find((one) => one.id === id)?.z ?? Number.NaN

  it('accepts z-indexes that fall row by row down the table', () => {
    expect(isFrontToBack(sound, ROWS)).toBe(true)
  })

  it('refuses the Command Palette (UZ-5) stacked behind the App Header (UZ-8)', () => {
    const swapped = sound.map((one) =>
      one.id === 'UZ-5' ? { ...one, z: zOf('UZ-8') } : one.id === 'UZ-8' ? { ...one, z: zOf('UZ-5') } : one,
    )
    expect(isFrontToBack(swapped, ROWS)).toBe(false)
  })

  it('refuses the help (UZ-7) at the same z-index as the other surfaces (UZ-13)', () => {
    const tied = sound.map((one) => (one.id === 'UZ-7' ? { ...one, z: zOf('UZ-13') } : one))
    expect(isFrontToBack(tied, ROWS)).toBe(false)
  })
})
