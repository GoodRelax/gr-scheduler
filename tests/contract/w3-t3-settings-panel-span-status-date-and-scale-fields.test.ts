// W3 tester 3: the export span, status date and display scale fields of the document settings panel.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { commandFromFieldCommit } from '../../src/adapter/input-command-translator/input-command-translator'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  DisplayLanguage,
  FieldCommit,
  PropertiesPanel,
  PropertyField,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { contextOf } from './cr-606-stage'
import { bare, bareAll, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly icons: readonly { readonly rowId: string; readonly label: Record<DisplayLanguage, string> }[]
}

// WHY: CR-690 -- table T-369 holds the face's order; the fit span (K-141) stands under its fix (K-142, FO-9).
const CLAUSE_SPAN_FIELD_PLACE = '| FO-10 | 全体表示時の期間 | 表 T-104 の `K-141` | 同表の `FX-5` |'
const CLAUSE_STATUS_DATE_FIELD =
  '⭐ 基準日を打つ欄を、文書の設定の面（`FR-072`、面を出す入口は `_assets/tbl-glossary.md` の 表 T-109 の `IC-17`）の、`FR-072` の 表 T-369 の `FO-8` の場所に置き、日付を確定したら 表 T-108 の `CM-3` を、空にして確定したら同表の `CM-4` を 1 回発行すること（MUST）'
const CLAUSE_STATUS_DATE_NAME = '欄の名は `FR-038` の辞書が 表 T-109 の `IC-44` に持つ語とすること（MUST）'
const CLAUSE_SCALE_FIELD =
  '⭐ 表示の倍率を選ぶ欄を、文書の設定の面（`FR-072`、面を出す入口は `_assets/tbl-glossary.md` の 表 T-109 の `IC-17`）の、`FR-072` の 表 T-369 の `FO-3` の場所に置き、`S-234` の型の欄の段を同じ順に並べて選ばせ、選ばれた段で 表 T-108 の `CM-74` を 1 回発行すること（MUST）'
// WHY: in table T-369 FO-9's fix, FO-7's read-out and FO-2's theme color stand right above these three.
const K_SPAN_FIX = 'K-142'
const DRAWN_WIDTH_READOUT = 'WF-3'
const K_THEME = 'K-60'

// see T-104
const keyRowOf = (key: string): string => {
  const row = specTable('T-104').rows.find((one) => one.cells.some((cell) => bareAll(cell).includes(key)))
  if (row === undefined) throw new Error(`table T-104 has no row for the key ${key}`)
  return row.id
}
const K_TOLERANCE = keyRowOf('parentProgressToleranceDays')
const K_SPAN = keyRowOf('fitSpanStart')
const K_SCALE = keyRowOf('displayScale')
const IC_44 = 'IC-44'

// see T-108
const commandNameOf = (id: string): string => bare(specTable('T-108').rows.find((one) => one.id === id)?.by['確定名'] ?? '')
const CM_3 = commandNameOf('CM-3')
const CM_4 = commandNameOf('CM-4')
const CM_74 = commandNameOf('CM-74')

// see S-234
const S_234_STEPS = bareAll(specTable('T-202').rows.find((one) => one.id === 'S-234')?.cells[1] ?? '')

const statusDateWordOf = (language: DisplayLanguage): string =>
  WORDS.icons.find((one) => one.rowId === IC_44)?.label[language] ?? `(no dictionary word for ${IC_44})`

const TEMPLATE = ((): Document => {
  const read = documentFromJson(
    readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
  )
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
})()

function settingsPanel(language: DisplayLanguage = 'ja', document: Document = TEMPLATE): PropertiesPanel {
  const session = {
    ...emptyScreenSession,
    screen: {
      ...emptyScreenSession.screen,
      screenLanguage: language,
      helpLanguage: language,
      propertiesPanelContentState: { kind: 'documentSettingsDisplayed' },
    },
  } as unknown as ScreenSession
  const readings = {
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
    themeHue: document.schedule.project.themeHue,
    selectedGroupIds: [],
    selectedResourceUids: [],
    propertiesShowing: 'documentSettings',
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  } as unknown as ScreenViewReadings
  const panel = propertiesPanelFromSelection(document.schedule, document.documentSettings, emptySelection(), session, readings)
  if (panel === null || panel.showing !== 'documentSettings') throw new Error('premise: the document settings panel is drawn')
  return panel
}

const rowsOf = (panel: PropertiesPanel): string[] => panel.fields.map((one) => one.row)

const oneFieldOf = (panel: PropertiesPanel, row: string): PropertyField => {
  const found = panel.fields.filter((one) => one.row === row)
  if (found.length !== 1) throw new Error(`expected one field of row ${row}, got ${found.length}: ${rowsOf(panel).join(' ')}`)
  return found[0] as PropertyField
}

const placeOf = (panel: PropertiesPanel, row: string): number => {
  const at = rowsOf(panel).indexOf(row)
  if (at < 0) throw new Error(`the panel has no field of row ${row}: ${rowsOf(panel).join(' ')}`)
  return at
}

const commit = (field: PropertyField, text: string): FieldCommit => {
  const control = field.controls[0]
  if (control === undefined) throw new Error(`the field ${field.row} has no control to commit`)
  return { row: field.row, key: control.key, text } as FieldCommit
}

const kindsOf = (commands: readonly unknown[]): string[] =>
  commands.map((one) => String((one as { readonly kind?: unknown }).kind))

describe('W3-T3 -- the manuscript still says what these cases read', () => {
  it.each([CLAUSE_SPAN_FIELD_PLACE, CLAUSE_STATUS_DATE_FIELD, CLAUSE_STATUS_DATE_NAME, CLAUSE_SCALE_FIELD])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('premise: the rows and names these cases read exist', () => {
    expect([K_TOLERANCE, K_SPAN, K_SCALE]).toEqual(['K-140', 'K-141', 'K-125'])
    expect([CM_3, CM_4, CM_74].every((one) => one !== '')).toBe(true)
    expect(S_234_STEPS.length).toBeGreaterThan(2)
  })
})

describe('FR-072 T-369 FO-10 -- the fit span field stands right below its fix (FO-9)', () => {
  it(`"${CLAUSE_SPAN_FIELD_PLACE}"`, () => {
    const panel = settingsPanel()
    expect(placeOf(panel, K_SPAN)).toBe(placeOf(panel, K_SPAN_FIX) + 1)
  })
})

describe('FR-046 -- the status date field', () => {
  it(`"${CLAUSE_STATUS_DATE_FIELD}" -- it stands right below FO-7's current width`, () => {
    const panel = settingsPanel()
    expect(placeOf(panel, IC_44)).toBe(placeOf(panel, DRAWN_WIDTH_READOUT) + 1)
  })

  it(`"${CLAUSE_STATUS_DATE_FIELD}" -- a committed date issues ${CM_3} once`, () => {
    const field = oneFieldOf(settingsPanel(), IC_44)
    const date = '2027-07-01'
    const commands = commandFromFieldCommit(commit(field, date), contextOf(TEMPLATE))
    expect(kindsOf(commands).filter((one) => one === CM_3)).toHaveLength(1)
    expect(kindsOf(commands)).not.toContain(CM_4)
    expect(JSON.stringify(commands)).toContain(date)
  })

  it(`"${CLAUSE_STATUS_DATE_FIELD}" -- an emptied field issues ${CM_4} once`, () => {
    const field = oneFieldOf(settingsPanel(), IC_44)
    const commands = commandFromFieldCommit(commit(field, ''), contextOf(TEMPLATE))
    expect(kindsOf(commands)).toEqual([CM_4])
  })

  it.each(['ja', 'en'] as const)(`"${CLAUSE_STATUS_DATE_NAME}" -- %s`, (language) => {
    expect(oneFieldOf(settingsPanel(language), IC_44).name).toBe(statusDateWordOf(language))
  })
})

describe('FR-039 -- the display scale field', () => {
  it(`"${CLAUSE_SCALE_FIELD}" -- it stands right below FO-2's theme color field`, () => {
    const panel = settingsPanel()
    expect(placeOf(panel, K_SCALE)).toBe(placeOf(panel, K_THEME) + 1)
  })

  it(`"${CLAUSE_SCALE_FIELD}" -- its choices are the S-234 steps in the type cell's order`, () => {
    const control = oneFieldOf(settingsPanel(), K_SCALE).controls[0]
    expect(control?.choices).toEqual(S_234_STEPS)
  })

  it.each(S_234_STEPS)(`"${CLAUSE_SCALE_FIELD}" -- choosing %s issues ${CM_74} once with that step`, (step) => {
    const field = oneFieldOf(settingsPanel(), K_SCALE)
    const commands = commandFromFieldCommit(commit(field, step), contextOf(TEMPLATE))
    expect(kindsOf(commands)).toEqual([CM_74])
    expect(Object.values(commands[0] as unknown as Record<string, unknown>)).toContain(Number(step))
  })
})
