// CR-690 spec-only cases: the row title panel width fields (table T-368), the settings face order (table T-369).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { commandFromFieldCommit } from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  FieldCommit,
  PropertyField,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { descendants, oneByRole, styleMap, surfaceOf, wire, type FakeElement } from '../fixtures/fake-browser'
import { contextOf, documentOf, fieldOf as taskFieldOf, panelOf, taskItem, taskOf } from './cr-606-stage'
import { bare, specTable, unbroken } from './spec-table'
import { exportStage, restoreAnimationFrames, type ExportStage } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))

type Words = readonly { readonly part: string; readonly text: Record<DisplayLanguage, string> }[]

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly settings: readonly { readonly rowId: string; readonly label: Record<DisplayLanguage, string> }[]
  readonly icons: readonly { readonly rowId: string; readonly label: Record<DisplayLanguage, string> }[]
  readonly rowTitleWidthField: Words
  readonly fitSpanField: Words
}

const WF_1 =
  '入口の形は `FR-055` の 表 T-367 の `FX-4` と同じ 1 つのチェックボックスとし、名の語は 表 T-104 の `K-143`、発行する命令は 表 T-108 の `CM-91` とすること（MUST）'
const WF_2_NAME = '名を辞書が 表 T-104 の `K-71` に持つ語とし、数の入力の右に辞書の `rowTitleWidthField` の `unit` の語を置くこと（MUST）'
const WF_2_VALUE =
  '入力に示す値は `_assets/tbl-settings.md` の 表 T-203 の `S-79`（表示の倍率を掛ける前の px）を px の整数へ四捨五入した値とし、整数を打たせ、確定した値で 表 T-108 の `CM-67` を 1 回発行すること（MUST）'
const WF_2_UNFIXED =
  '⭐ 入力は固定しているあいだ（同表の `S-533` が真）だけ書けるものとし、固定していないあいだは値を示したまま書けないと示すこと（MUST）'
const WF_2_REFUSE = '⭐ `S-79` の下限より小さい値と整数でない値は拒み、命令を出さずに入力を保存している値へ戻すこと（MUST）'
const WF_3_VALUE =
  '読むだけの値とし、名は辞書の `rowTitleWidthField` の `currentName` の語、値は同節の `currentValue` の語とし、その数はいま描いている行見出しパネルの幅（`FR-039` の 表 T-252 の後の段の、`S-79` に描く比を掛けた値と床の大きい方）を px の整数へ四捨五入した値とすること（MUST）'
const WF_3_FOLLOW = '⭐ 表示の倍率・幅・行の段が変わったら、次に描く絵で書き換えること（MUST）'
const WF_3_NOT_INPUT = '（表 T-338 の `MH-4` と同じ）。⛔ 入力の形で描いてはならない（MUST NOT）'
const WF_4_NO_BAND = '⭐ 幅を固定しているあいだ、行見出しパネルの側の境界に 表 T-023d の `GR-22` の掴み帯を敷かないこと（MUST）'
const WF_4_SCALE =
  '⭐ 表示の倍率を変えたときは、固定していても `S-79` を書き換えず、描く幅は 表 T-252 の `DS-9` のまま描く比に従うこと（MUST）'
const FR_052_T_368 =
  '⭐ 文書の設定の面に置く行見出しパネルの幅の欄と、幅を固定しているあいだの境界は、本要求の 表 T-368 に従うこと（MUST）'
const FR_052_HIDDEN = '⭐ プロパティパネルを出していないあいだ（`S-99h`）、その境界に掴み帯を敷かないこと（MUST）'
const FR_072_ORDER = '⭐ 本面の欄の並びと欄の名は 表 T-369 に従うこと（MUST）'
const FR_072_NO_ANCHOR = '⛔ 欄を置く要求が、ほかの欄を錨にして置き場を言ってはならない（MUST NOT）'
const FR_041_RING =
  '⭐ 文書の `themeHue` と等しい行の見本を、`_assets/tbl-settings.md` の 表 T-206 の `S-530` の太さの縁で、`S-531` だけ隔てて囲むこと（MUST）'
const FR_131_FIELD =
  '`FR-072` の 表 T-369 の `FO-12` の場所に置き、0 以上の整数（稼働日）を打たせ、確定した値で 表 T-108 の `CM-87` を 1 回発行すること（MUST）'

const CLAUSES = [
  WF_1,
  WF_2_NAME,
  WF_2_VALUE,
  WF_2_UNFIXED,
  WF_2_REFUSE,
  WF_3_VALUE,
  WF_3_FOLLOW,
  WF_3_NOT_INPUT,
  WF_4_NO_BAND,
  WF_4_SCALE,
  FR_052_T_368,
  FR_052_HIDDEN,
  FR_072_ORDER,
  FR_072_NO_ANCHOR,
  FR_041_RING,
  FR_131_FIELD,
]

interface SettingRow {
  readonly id: string
  readonly default?: { readonly num?: string }
  readonly value?: { readonly num?: string }
}

const SETTING_ROWS: readonly SettingRow[] = (
  JSON.parse(readFileSync(join(SPEC, '_source', 'settings.json'), 'utf8')) as { blocks: { rows?: SettingRow[] }[] }
).blocks.flatMap((block) => block.rows ?? [])

function setting(id: string): number {
  const row = SETTING_ROWS.find((one) => one.id === id)
  const value = Number(row?.default?.num ?? row?.value?.num ?? Number.NaN)
  if (!Number.isFinite(value)) throw new Error(`settings.json holds no number for ${id}`)
  return value
}

// see S-79
const S_79_FLOOR = setting('S-37') * setting('S-125')

// see T-206
const sizeOf = (id: string): number => Number.parseFloat(bare(specTable('T-206').rows.find((one) => one.id === id)?.by['既定'] ?? ''))
const S_530 = sizeOf('S-530')
const S_531 = sizeOf('S-531')

// see T-108
const commandNameOf = (id: string): string => bare(specTable('T-108').rows.find((one) => one.id === id)?.by['確定名'] ?? '')
const CM_67 = commandNameOf('CM-67')
const CM_87 = commandNameOf('CM-87')
const CM_91 = commandNameOf('CM-91')

const K_60 = 'K-60'
const K_71 = 'K-71'
const K_125 = 'K-125'
const K_140 = 'K-140'
const K_143 = 'K-143'
const WF_3 = 'WF-3'

const partWordOf = (words: Words, part: string, language: DisplayLanguage): string =>
  words.find((one) => one.part === part)?.text[language] ?? `(no dictionary word for ${part})`
const settingsWordOf = (rowId: string, language: DisplayLanguage): string =>
  WORDS.settings.find((one) => one.rowId === rowId)?.label[language] ?? `(no dictionary word for ${rowId})`
const iconWordOf = (rowId: string, language: DisplayLanguage): string =>
  WORDS.icons.find((one) => one.rowId === rowId)?.label[language] ?? `(no dictionary word for ${rowId})`

const DOCUMENT = documentOf({ tasks: [taskOf(1), taskOf(2, { start: '2026-05-04T08:00:00', finish: '2026-05-15T17:00:00' })] })

const withWidth = (width: number, fixed: boolean): Document => ({
  ...DOCUMENT,
  documentSettings: { ...DOCUMENT.documentSettings, rowTitlePanelWidth: width, rowTitlePanelWidthFixed: fixed },
})

async function settingsStage(document: Document, language: DisplayLanguage = 'ja'): Promise<ExportStage> {
  const stage = exportStage(document, undefined, language)
  await stage.take('IC-17')
  return stage
}

const fieldOf = (view: ScreenView, row: string): PropertyField => {
  const found = view.propertiesPanel?.fields.filter((one) => one.row === row) ?? []
  if (found.length !== 1) throw new Error(`expected one field ${row} on the settings face, got ${found.length}`)
  return found[0] as PropertyField
}

const commitOf = (row: string, column: string, text: string, holder = 'documentSettings'): FieldCommit =>
  ({ row, key: { holder, column }, text }) as FieldCommit

async function commitOn(stage: ExportStage, commit: FieldCommit): Promise<void> {
  stage.commitNext(commit)
  await stage.pointAt(1, 1)
}

const kindsOf = (commands: readonly unknown[]): string[] => commands.map((one) => String((one as { kind?: unknown }).kind))

const dividersOf = (stage: ExportStage): string[] => stage.lastView().frame.dividers.map((one) => one.panel)

const drawnWidthOf = (stage: ExportStage): number => {
  const frame = stage.loop.current()
  if (frame === null) throw new Error('premise: a frame was drawn')
  return frame.regions.rowTitlePanel.width
}

const readoutOf = (px: number, language: DisplayLanguage = 'ja'): string =>
  partWordOf(WORDS.rowTitleWidthField, 'currentValue', language).replace('{px}', String(Math.round(px)))

describe('CR-690 -- the manuscript still says what these cases press', () => {
  it.each(CLAUSES)('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('premise: the command rows and sizes these cases read exist', () => {
    expect([CM_67, CM_87, CM_91].every((one) => one !== '')).toBe(true)
    expect([S_79_FLOOR, S_530, S_531].every((one) => Number.isFinite(one) && one > 0)).toBe(true)
  })
})

describe('FR-052 T-368 WF-1 / WF-2 -- the fix check and the width input', () => {
  it.each(['ja', 'en'] as const)(`${WF_1} -- %s`, async (language) => {
    const field = fieldOf((await settingsStage(DOCUMENT, language)).lastView(), K_143)
    expect(field.name).toBe(settingsWordOf(K_143, language))
    expect(field.controls.map((one) => one.kind)).toEqual(['boolean'])
    const fix = commitOf(K_143, 'rowTitlePanelWidthFixed', 'true')
    expect(kindsOf(commandFromFieldCommit(fix, contextOf(DOCUMENT)))).toEqual([CM_91])
  })

  it.each(['ja', 'en'] as const)(`${WF_2_NAME} -- %s`, async (language) => {
    const field = fieldOf((await settingsStage(DOCUMENT, language)).lastView(), K_71)
    expect([field.name, field.unit]).toEqual([settingsWordOf(K_71, language), partWordOf(WORDS.rowTitleWidthField, 'unit', language)])
    expect(field.controls.map((one) => one.kind)).toEqual(['number'])
  })

  it(`${WF_2_VALUE} -- the stored width rounded, and a whole width settles as one ${CM_67}`, async () => {
    const stage = await settingsStage(withWidth(250.6, true))
    expect(fieldOf(stage.lastView(), K_71).controls[0]?.text).toBe('251')
    const commit = commitOf(K_71, 'rowTitlePanelWidth', '260')
    expect(kindsOf(commandFromFieldCommit(commit, contextOf(withWidth(250.6, true))))).toEqual([CM_67])
    await commitOn(stage, commit)
    expect(stage.loop.document().documentSettings.rowTitlePanelWidth).toBe(260)
  })

  it(`${WF_2_UNFIXED} -- unfixed it shows the value and cannot be written; fixed it can`, async () => {
    const unfixed = fieldOf((await settingsStage(withWidth(300, false))).lastView(), K_71).controls[0]
    expect([unfixed?.text, unfixed?.isDisabled === true]).toEqual(['300', true])
    const fixed = fieldOf((await settingsStage(withWidth(300, true))).lastView(), K_71).controls[0]
    expect(fixed?.isDisabled === true).toBe(false)
  })

  it.each([String(S_79_FLOOR - 1), '250.5', 'wide'])(`${WF_2_REFUSE} -- %s issues nothing and the input keeps the stored width`, async (text) => {
    const commit = commitOf(K_71, 'rowTitlePanelWidth', text)
    expect(commandFromFieldCommit(commit, contextOf(withWidth(300, true)))).toEqual([])
    const stage = await settingsStage(withWidth(300, true))
    await commitOn(stage, commit)
    expect(stage.loop.document().documentSettings.rowTitlePanelWidth).toBe(300)
    expect(fieldOf(stage.lastView(), K_71).controls[0]?.text).toBe('300')
  })

  it(`${WF_2_REFUSE} -- the floor itself is taken`, () => {
    const commit = commitOf(K_71, 'rowTitlePanelWidth', String(S_79_FLOOR))
    expect(kindsOf(commandFromFieldCommit(commit, contextOf(withWidth(300, true))))).toEqual([CM_67])
  })
})

describe('FR-052 T-368 WF-3 -- the drawn width read-out', () => {
  it.each(['ja', 'en'] as const)(`${WF_3_VALUE} / ${WF_3_NOT_INPUT} -- %s`, async (language) => {
    const stage = await settingsStage(DOCUMENT, language)
    const field = fieldOf(stage.lastView(), WF_3)
    expect(field.name).toBe(partWordOf(WORDS.rowTitleWidthField, 'currentName', language))
    expect(field.readout).toBe(readoutOf(drawnWidthOf(stage), language))
    expect([field.isEditable, field.controls]).toEqual([false, []])
  })

  it(`${WF_3_FOLLOW} -- a display scale and a width change rewrite it on the next picture`, async () => {
    const stage = await settingsStage(withWidth(300, true))
    const before = fieldOf(stage.lastView(), WF_3).readout
    await commitOn(stage, commitOf(K_125, 'displayScale', '150'))
    const scaled = fieldOf(stage.lastView(), WF_3).readout
    expect(scaled).not.toBe(before)
    expect(scaled).toBe(readoutOf(drawnWidthOf(stage)))
    await commitOn(stage, commitOf(K_71, 'rowTitlePanelWidth', '250'))
    expect(fieldOf(stage.lastView(), WF_3).readout).toBe(readoutOf(drawnWidthOf(stage)))
    expect(fieldOf(stage.lastView(), WF_3).readout).not.toBe(scaled)
  })
})

describe('FR-052 T-368 WF-4 -- the boundary while the width is fixed', () => {
  it(`${FR_052_T_368} / ${WF_4_NO_BAND} -- no row title band; the properties panel keeps its band`, async () => {
    expect(dividersOf(await settingsStage(withWidth(300, false)))).toEqual(['rowTitlePanel', 'propertiesPanel'])
    expect(dividersOf(await settingsStage(withWidth(300, true)))).toEqual(['propertiesPanel'])
  })

  it(FR_052_HIDDEN, () => {
    const stage = exportStage(withWidth(300, false))
    expect(stage.lastView().propertiesPanel, 'premise: the properties panel is not shown').toBeNull()
    expect(dividersOf(stage)).toEqual(['rowTitlePanel'])
  })

  it(`${WF_4_SCALE} -- S-79 stays, and the drawn width is the one the unfixed width draws`, async () => {
    const fixed = await settingsStage(withWidth(300, true))
    await commitOn(fixed, commitOf(K_125, 'displayScale', '150'))
    const unfixed = await settingsStage(withWidth(300, false))
    await commitOn(unfixed, commitOf(K_125, 'displayScale', '150'))
    expect(fixed.loop.document().documentSettings.rowTitlePanelWidth).toBe(300)
    expect(drawnWidthOf(fixed)).toBe(drawnWidthOf(unfixed))
  })
})

// see T-369
const nameCellIdOf = (cell: string): string | null => /(?:K|IC)-\d+/.exec(cell)?.[0] ?? null
const ruleRowOf = (cell: string): string => /(?:WF|FX)-\d+/.exec(cell)?.[0] ?? ''
const FACE_ROWS = specTable('T-369').rows.filter((row) => row.id !== 'FO-1')

const faceRowOf = (row: (typeof FACE_ROWS)[number]): string => nameCellIdOf(row.by['名の語'] ?? '') ?? ruleRowOf(row.by['規則'] ?? '')

const faceNameOf = (row: (typeof FACE_ROWS)[number], language: DisplayLanguage): string => {
  const id = nameCellIdOf(row.by['名の語'] ?? '')
  if (id?.startsWith('K-')) return settingsWordOf(id, language)
  if (id?.startsWith('IC-')) return iconWordOf(id, language)
  const words = ruleRowOf(row.by['規則'] ?? '') === WF_3 ? WORDS.rowTitleWidthField : WORDS.fitSpanField
  return partWordOf(words, 'currentName', language)
}

describe('FR-072 T-369 -- the order and the names of the settings face', () => {
  it.each(['ja', 'en'] as const)(`${FR_072_ORDER} -- %s`, async (language) => {
    const fields = (await settingsStage(DOCUMENT, language)).lastView().propertiesPanel?.fields ?? []
    const placed = fields.slice(0, FACE_ROWS.length)
    expect(placed.map((one) => one.row)).toEqual(FACE_ROWS.map(faceRowOf))
    expect(placed.map((one) => one.name)).toEqual(FACE_ROWS.map((row) => faceNameOf(row, language)))
  })

  it(`${FR_072_NO_ANCHOR} -- each field another requirement places names its T-369 row`, () => {
    const placedElsewhere = FACE_ROWS.filter((row) => ruleRowOf(row.by['規則'] ?? '') === '')
    expect(placedElsewhere.length).toBeGreaterThan(0)
    for (const row of placedElsewhere) {
      expect(new RegExp(`\`${row.id}\` (の場所に置|とすること)`).test(REQUIREMENTS), row.id).toBe(true)
    }
    expect(/の欄の(下|上)に置|先頭の欄とすること/.test(REQUIREMENTS)).toBe(false)
  })

  it(`${FR_131_FIELD} -- a whole number of working days settles as one ${CM_87}`, async () => {
    const field = fieldOf((await settingsStage(DOCUMENT)).lastView(), K_140)
    expect(field.controls.map((one) => one.kind)).toEqual(['number'])
    const commit = commitOf(K_140, 'parentProgressToleranceDays', '3', 'project')
    const commands = commandFromFieldCommit(commit, contextOf(DOCUMENT))
    expect(kindsOf(commands)).toEqual([CM_87])
    expect(Object.values(commands[0] as unknown as Record<string, unknown>)).toContain(3)
  })

  it(`${FR_131_FIELD} -- T-369 FO-12: not on the panel of a chosen task`, () => {
    const panel = panelOf(DOCUMENT, taskItem(1))
    expect(panel.fields.length, 'premise: the task panel has fields').toBeGreaterThan(0)
    expect(panel.fields.map((one) => one.row)).not.toContain(K_140)
    expect(() => taskFieldOf(panel, K_140)).toThrow()
  })
})

// see U-25
const U_25 = bare(specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '')

const HEADER_HEIGHT = { 'App Header': 37 }

function hueButtonsOf(view: ScreenView, hue: number): FakeElement[] {
  const built = wire({ preference: 'light', hue }, HEADER_HEIGHT)
  surfaceOf(built).showScreenView(view)
  const panel = oneByRole(built.root(), U_25)
  const inHueField = (node: FakeElement): boolean => {
    for (let at: FakeElement | null = node; at !== null && at !== panel; at = at.parentNode) {
      if (at.getAttribute('data-field-row') === K_60) return true
    }
    return false
  }
  return descendants(panel).filter((one) => one.tagName === 'BUTTON' && one.getAttribute('data-icon') === null && inHueField(one))
}

describe('FR-041 -- the chosen theme hue swatch is ringed', () => {
  it(`${FR_041_RING} -- the swatch equal to themeHue alone carries the S-530 outline at S-531`, async () => {
    const stage = await settingsStage(DOCUMENT)
    const hue = stage.loop.document().schedule.project.themeHue
    const choiceValues = fieldOf(stage.lastView(), K_60).controls[0]?.choiceValues ?? []
    const buttons = hueButtonsOf(stage.lastView(), hue)
    expect(buttons).toHaveLength(choiceValues.length)
    const ringed = buttons.map((one) => (styleMap(one).get('outline') ?? '') !== '')
    expect(ringed).toEqual(choiceValues.map((value) => value === String(hue)))
    const chosen = buttons[choiceValues.indexOf(String(hue))]
    expect(styleMap(chosen as FakeElement).get('outline') ?? '').toContain(`${S_530}px`)
    expect(styleMap(chosen as FakeElement).get('outline-offset')).toBe(`${S_531}px`)
  })
})
