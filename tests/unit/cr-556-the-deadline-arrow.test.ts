// CR-556: the deadline drawn as a green down-pointing arrow (FR-045, table T-304).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { ScreenView, ScreenViewReadings, Tooltip } from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule, taskPlacement } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { FakeElement, oneByRole, selfAndDescendants, stage, wiringOf } from '../fixtures/fake-browser'
import {
  MARKER_D,
  SCREEN,
  bandOf,
  cellOf,
  day,
  notStored,
  rowOf,
  scheduleOf,
  stored,
  taskOf,
  type Bar,
  type Pt,
  type SceneWish,
} from './cr-430-cross-section-scene'

const rowText = (table: string, id: string): string => unbroken(rowOf(table, id).by['規則'] ?? '')
const anyRowText = (table: string, id: string): string => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(found.cells.join(' '))
}

const DA_1_DRAW = '`deadline` が `null` でない `Task` の印を、その `Task` を置いた行を描くときに描くこと（MUST）'
const DA_1_NULL = '`deadline` が `null` の `Task` には描かないこと（MUST）'
const DA_1_NOT_THE_TOGGLES = '従わせてはならない（MUST NOT）'
const DA_1_FOLDED = '畳んだ行・隠した行・詳しさの段で描かない行に載る `Task` の印は描かない'
const DA_2_ONE_SHAPE = '1 つの塗りの形として描くこと（MUST）'
const DA_2_HEIGHT = '箱の高さ d は、その `Task` の進捗マーカーの径とすること（MUST）'
const DA_2_RATIOS = '軸の太さは d × 同表の `S-367` とすること（MUST）'
const DA_2_TIP = '矢じりの先端を箱の下端に置くこと（MUST）'
const DA_3_FILL = '塗りを `_assets/tbl-settings.md` の 表 T-236 の `S-364` とすること（MUST）'
const DA_3_HALO = '形の縁を、地の色（同表の `S-146`）で、d × 表 T-201 の `S-34` の太さに描くこと（MUST）'
const DA_4_AT_THE_DAY = '軸の中心（矢じりの先端）を、`deadline` の日を時間軸に置いた位置に立てること（MUST）'
const DA_4_FINISH = '`finish` と `deadline` が同じ日なら、先端は予定の右端に立つ'
const DA_4_MILESTONE = 'マイルストーンで `start` と `deadline` が同じ日なら、先端は菱形の中心に立つ'
const DA_4_NO_SNAP = '非稼働日の期限を稼働日へ寄せてはならない（MUST NOT）'
const DA_5_CENTRE = '箱の中心を予定と同じ中心に置くこと（MUST）'
const DA_5_TIER_ONE = '箱を 1 段目（表 T-271 の `XS-4`）に置くこと（MUST） —— 先端が 2 段目の予定の線を指す'
const DA_5_MILESTONE = '箱の中心を予定の菱形と同じ中心に置くこと（MUST）'
const DA_5_SAME_BAND = '箱はマーカーと同じ帯に収まる'
const DA_6_NO_HIT = '⛔ 印を押しの当たり判定の対象にしてはならない（MUST NOT）'
const DA_6_SAME_ANSWER = '⇒ 印の上でポインタを押したときは、印が無いときと同じものが応える'
const DA_6_OWN_HINT = '⭐ 印の上でポインタを止めたときは、印そのものの説明を出すこと（MUST）'
const DA_7_CUT = '`Row Area` の外に立つ印は、ほかの形と同じく `Row Area` の縁で切って描くこと（MUST）'
const OC_9_WIDTH = '数える幅は、印の軸を中心とした矢じりの幅（表 T-304 の `DA-2`）とすること（MUST）'
const OC_9_ONE_OCCUPATION = '形状から離れて立つ印も、形状とのあいだを含めて 1 つの占有として数えること（MUST）'
const ZO_13_PLACE = '形と依存線より手前、イナズマ線と線の道具（`ZO-8`）・進捗マーカー（`ZO-3`）・札（`ZO-5`）より奥とする'
const TL_9_LINE = '期限の語と `deadline` の日（`TL-10`）を、半角空白 1 つで区切って書くこと（MUST）'
const TL_9_THE_WORD = '期限の語は、プロパティパネルの期限の欄と同じ語（`FR-038` の辞書の `properties` の `PR-10` の語）とすること（MUST）'
const TL_9_NO_LINE = '`deadline` が `null` のときは、期限の行を出さないこと（MUST）'
const TL_10_DAY = '月、`/`、日 の順とし、月も日も 0 で埋めない（表 T-251 の `ND-4` と同じ）'
const TL_1_ORDER = '`TL-9` の期限を、この順に 1 行ずつ出すこと（MUST）'
// WHY: 2026-03-20 is a Friday; TL-11 adds the weekday word of the dictionary's weekdays.
const DAY_20 = { ja: '3/20 (金)', en: '3/20 (Fri)' } as const
const IN_7_ONE_LINE = 'ツールチップは、説明の各行を折り返さずに 1 行で出すこと（MUST）'
const EP_5_HAS_THE_MARK = '`Deadline Mark`（`U-63`）'

const S_34 = stored('S-34')
const S_365 = notStored('S-365')
const S_366 = notStored('S-366')
const S_367 = notStored('S-367')
const KEY_OF = (id: string): string => cellOf('T-202', id, 'キー')
const PLAN_VISIBLE = KEY_OF('S-227')
const ACTUAL_VISIBLE = KEY_OF('S-228')
const MARKER_VISIBLE = KEY_OF('S-63')
const S_439_MS = ((): number => {
  const found = /(\d+(?:\.\d+)?)/.exec(bare(rowOf('T-212', 'S-439').by['値'] ?? ''))
  if (found === null) throw new Error('table T-212 row S-439 states no number')
  return Number(found[1])
})()

const THEME_HUE = Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? ''))
const t236 = (id: string, preference: 'light' | 'dark'): string => {
  const cell = bare(rowOf('T-236', id).by[preference === 'dark' ? '暗いテーマ' : '明るいテーマ'] ?? '')
  if (!/^(#|hsl\(|rgba?\()/.test(cell)) throw new Error(`table T-236 ${id} states no colour: ${cell}`)
  return normalColour(cell.replace('H', String(THEME_HUE)))
}
const normalColour = (text: string): string => text.replace(/\s+/g, '').toLowerCase()

// see T-012
const KIND_OF = (id: string): string => cellOf('T-012', id, '値').replace(/'/g, '')
const SH = ['SH-1', 'SH-2', 'SH-3', 'SH-4', 'SH-5'] as const
const LAID_BELOW = new Set(['SH-3', 'SH-4'])

interface PropertyWords {
  readonly rowId: string
  readonly label: Readonly<Record<'ja' | 'en', string>>
}
const PR_10_WORD = ((): Readonly<Record<'ja' | 'en', string>> => {
  const words = (
    JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
      properties: PropertyWords[]
    }
  ).properties
  const found = words.find((one) => one.rowId === 'PR-10')
  if (found === undefined) throw new Error('FR-038 dictionary has no properties entry PR-10')
  return found.label
})()

const TOOLTIP_ROLE = bare(rowOf('T-103', 'U-53').by['確定名（英）'] ?? '')

const GEO_EPS = 1e-6
const SVG_EPS = 0.05

interface DeadlineShape {
  readonly outline: readonly Pt[]
  readonly haloWidth: number
}

interface MarkedTask {
  readonly taskUid: number
  readonly plan: Bar | null
  readonly actual: Bar | null
  readonly milestoneFigure: Bar | null
  readonly marker: { readonly centre: Pt; readonly radius: number } | null
  readonly deadline?: DeadlineShape | null
}

interface MarkedPlacement {
  readonly stack: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly labelFontSize: number
  readonly occupiedX0: number
  readonly occupiedX1: number
  readonly deadlineX?: number | null
}

interface Stage2 {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly layout: { readonly pxPerDay: number }
  readonly regions: { readonly rowArea: { x: number; y: number; width: number; height: number } }
  readonly geometry: { readonly tasks: readonly MarkedTask[] }
  readonly whole: unknown
  readonly placed: (uid: number) => MarkedPlacement | null
  readonly drawn: (uid: number) => MarkedTask | undefined
  readonly svg: (picture?: 'screen' | 'export', preference?: 'light' | 'dark') => string
}

const settingsOf = (over: Readonly<Record<string, unknown>>): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    zoomX: 8,
    scrollDate: day(1),
    stackDirection: 'down',
    ...over,
  }) as unknown as DocumentSettings

const built = (schedule: Schedule, over: Readonly<Record<string, unknown>> = {}): Stage2 => {
  const settings = settingsOf(over)
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection, null)
  const tasks = (geometry as unknown as { tasks: readonly MarkedTask[] }).tasks
  return {
    schedule,
    settings,
    layout: layout as unknown as { pxPerDay: number },
    regions: regions as unknown as Stage2['regions'],
    geometry: { tasks },
    whole: geometry,
    placed: (uid) => taskPlacement(layout, uid) as unknown as MarkedPlacement | null,
    drawn: (uid) => tasks.find((one) => one.taskUid === uid),
    svg: (picture = 'screen', preference = 'light') =>
      svgFromSchedule(schedule, settings, layout, geometry, regions, selection, picture, {
        themePreference: preference,
        guideCursorMode: 'none',
      } as never),
  }
}

const sceneOf = (wish: SceneWish): Stage2 => built(scheduleOf(wish), wish.settings ?? {})

const placedOf = (scene: Stage2, uid: number): MarkedPlacement => {
  const found = scene.placed(uid)
  if (found === null) throw new Error(`task ${uid} was not placed`)
  return found
}

const drawnOf = (scene: Stage2, uid: number): MarkedTask => {
  const found = scene.drawn(uid)
  if (found === undefined) throw new Error(`task ${uid} was not drawn`)
  return found
}

const markOf = (scene: Stage2, uid: number): DeadlineShape => {
  const found = drawnOf(scene, uid).deadline ?? null
  if (found === null) throw new Error(`FR-045 DA-1 (MUST): task ${uid} has a deadline but no mark in its geometry`)
  return found
}

interface ArrowParts {
  readonly tip: Pt
  readonly top: number
  readonly bottom: number
  readonly headWidth: number
  readonly headHeight: number
  readonly shaftWidth: number
  readonly shaftBottom: number
  readonly centreX: number
}

const partsOf = (outline: readonly Pt[]): ArrowParts => {
  if (outline.length !== 7) throw new Error(`S-2: the outline has ${outline.length} points, not 7`)
  const [shaftTopLeft, shaftBottomLeft, headLeft, tip, headRight, shaftBottomRight, shaftTopRight] = outline as [
    Pt, Pt, Pt, Pt, Pt, Pt, Pt,
  ]
  const ys = outline.map((one) => one.y)
  return {
    tip,
    top: Math.min(...ys),
    bottom: Math.max(...ys),
    headWidth: headRight.x - headLeft.x,
    headHeight: tip.y - (headLeft.y + headRight.y) / 2,
    shaftWidth: shaftTopRight.x - shaftTopLeft.x,
    shaftBottom: (shaftBottomLeft.y + shaftBottomRight.y) / 2,
    centreX: (shaftTopLeft.x + shaftTopRight.x) / 2,
  }
}

// see DA-2, FR-094
const diameterOf = (scene: Stage2, uid: number, sh: string): number =>
  LAID_BELOW.has(sh) ? placedOf(scene, uid).labelFontSize : MARKER_D

const attrOf = (attrs: string, name: string): string | null => {
  const found = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  return found === null ? null : (found[1] as string)
}

const markTagsOf = (svg: string, uid: number): readonly string[] =>
  [...svg.matchAll(/<([a-zA-Z]+)\b([^>]*)>/g)]
    .filter((one) => (one[2] ?? '').includes(`data-figure="task-${uid}-deadline"`))
    .map((one) => `${one[1]} ${one[2]}`)

const pointsOf = (attrs: string): readonly Pt[] => {
  const numbers = (attrOf(attrs, 'points') ?? '').match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []
  const out: Pt[] = []
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    out.push({ x: Number(numbers[index]), y: Number(numbers[index + 1]) })
  }
  return out
}

interface SvgElement {
  readonly tag: string
  readonly attrs: string
  readonly at: number
  readonly zo: readonly string[]
  readonly clips: readonly string[]
}

const elementsOf = (svg: string): readonly SvgElement[] => {
  const out: SvgElement[] = []
  const groups: { zo: string | null; clip: string | null }[] = []
  for (const match of svg.matchAll(/<(\/?)([a-zA-Z]+)((?:[^<>"]|"[^"]*")*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    const clipOf = (text: string): string | null => /url\(#([^)]+)\)/.exec(attrOf(text, 'clip-path') ?? '')?.[1] ?? null
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') groups.push({ zo: attrOf(attrs as string, 'data-zo'), clip: clipOf(attrs as string) })
      continue
    }
    if (closing === '/') continue
    const own = clipOf(attrs as string)
    out.push({
      tag: tag as string,
      attrs: attrs as string,
      at: match.index ?? 0,
      zo: groups.map((one) => one.zo).filter((one): one is string => one !== null),
      clips: [...groups.map((one) => one.clip), own].filter((one): one is string => one !== null),
    })
  }
  return out
}

const markElementOf = (svg: string, uid: number): SvgElement => {
  const found = elementsOf(svg).filter((one) => one.attrs.includes(`data-figure="task-${uid}-deadline"`))
  if (found.length !== 1) throw new Error(`FR-045: task ${uid} has ${found.length} mark elements in the picture`)
  return found[0] as SvgElement
}

const zoOrderOf = (svg: string): readonly string[] => [...svg.matchAll(/data-zo="([^"]+)"/g)].map((one) => one[1] as string)

const PLAIN = { uid: 1, name: null, start: day(2), finish: day(8) }

const oneTask = (over: Readonly<Record<string, unknown>>, settings: Readonly<Record<string, unknown>> = {}, shapeKind = 'rectangle'): Stage2 =>
  sceneOf({ tasks: [taskOf({ ...PLAIN, ...over })], shapeKind, settings })

const withTwoRows = (hiddenState: 'hidden' | 'collapsedParent'): Stage2 => {
  const base = scheduleOf({
    tasks: [
      taskOf({ ...PLAIN, uid: 1, deadline: day(6) }),
      taskOf({ ...PLAIN, uid: 2, deadline: day(6) }),
    ],
  }) as unknown as Record<string, unknown>
  const g1 = (base['taskGroups'] as Record<string, unknown>[])[0] as Record<string, unknown>
  const groups =
    hiddenState === 'hidden'
      ? [g1, { ...g1, id: 'g2', label: 'g2', order: 1, treeState: 'hidden' }]
      : [{ ...g1, treeState: 'collapsed' }, { ...g1, id: 'g2', label: 'g2', parentId: 'g1', order: 0 }]
  const members = [
    { taskUid: 1, groupId: 'g1', stackOrder: null },
    { taskUid: 2, groupId: 'g2', stackOrder: null },
  ]
  return built({ ...base, taskGroups: groups, taskGroupMembers: members } as unknown as Schedule)
}

const weekendOff = (tasks: readonly Task[]): Stage2 => {
  const base = scheduleOf({ tasks }) as unknown as Record<string, unknown>
  const calendar = (base['calendars'] as Record<string, unknown>[])[0] as Record<string, unknown>
  const weekDays = (calendar['weekDays'] as Record<string, unknown>[]).map((one) => ({
    ...one,
    dayWorking: one['dayType'] !== 1 && one['dayType'] !== 7,
  }))
  return built({ ...base, calendars: [{ ...calendar, weekDays }] } as unknown as Schedule)
}

describe('CR-556 -- the clauses these cases quote still stand', () => {
  it('FR-045 T-304 DA-1 .. DA-7, T-038 OC-9, T-020 ZO-13, T-040 EZ-6, T-028 IN-7, T-076 EP-5', () => {
    expect(rowText('T-304', 'DA-1')).toContain(DA_1_DRAW)
    expect(rowText('T-304', 'DA-1')).toContain(DA_1_NULL)
    expect(rowText('T-304', 'DA-1')).toContain(DA_1_NOT_THE_TOGGLES)
    expect(rowText('T-304', 'DA-1')).toContain(DA_1_FOLDED)
    expect(rowText('T-304', 'DA-2')).toContain(DA_2_ONE_SHAPE)
    expect(rowText('T-304', 'DA-2')).toContain(DA_2_HEIGHT)
    expect(rowText('T-304', 'DA-2')).toContain(DA_2_RATIOS)
    expect(rowText('T-304', 'DA-2')).toContain(DA_2_TIP)
    expect(rowText('T-304', 'DA-3')).toContain(DA_3_FILL)
    expect(rowText('T-304', 'DA-3')).toContain(DA_3_HALO)
    expect(rowText('T-304', 'DA-4')).toContain(DA_4_AT_THE_DAY)
    expect(rowText('T-304', 'DA-4')).toContain(DA_4_FINISH)
    expect(rowText('T-304', 'DA-4')).toContain(DA_4_MILESTONE)
    expect(rowText('T-304', 'DA-4')).toContain(DA_4_NO_SNAP)
    expect(rowText('T-304', 'DA-5')).toContain(DA_5_CENTRE)
    expect(rowText('T-304', 'DA-5')).toContain(DA_5_TIER_ONE)
    expect(rowText('T-304', 'DA-5')).toContain(DA_5_MILESTONE)
    expect(rowText('T-304', 'DA-5')).toContain(DA_5_SAME_BAND)
    expect(rowText('T-304', 'DA-6')).toContain(DA_6_NO_HIT)
    expect(rowText('T-304', 'DA-6')).toContain(DA_6_SAME_ANSWER)
    expect(rowText('T-304', 'DA-7')).toContain(DA_7_CUT)
    expect(anyRowText('T-038', 'OC-9')).toContain(OC_9_WIDTH)
    expect(anyRowText('T-038', 'OC-9')).toContain(OC_9_ONE_OCCUPATION)
    expect(anyRowText('T-020', 'ZO-13')).toContain(ZO_13_PLACE)
    expect(rowText('T-304', 'DA-6')).toContain(DA_6_OWN_HINT)
    expect(anyRowText('T-348', 'TL-9')).toContain(TL_9_LINE)
    expect(anyRowText('T-348', 'TL-9')).toContain(TL_9_THE_WORD)
    expect(anyRowText('T-348', 'TL-9')).toContain(TL_9_NO_LINE)
    expect(anyRowText('T-348', 'TL-10')).toContain(TL_10_DAY)
    expect(anyRowText('T-348', 'TL-1')).toContain(TL_1_ORDER)
    expect(anyRowText('T-028', 'IN-7')).toContain(IN_7_ONE_LINE)
    expect(anyRowText('T-076', 'EP-5')).toContain(EP_5_HAS_THE_MARK)
  })

  it('the read values are numbers, and the arrowhead is wider than the shaft (S-367 note)', () => {
    for (const one of [S_34, S_365, S_366, S_367, S_439_MS, MARKER_D]) expect(Number.isFinite(one)).toBe(true)
    expect(S_367).toBeLessThan(S_365)
    expect(S_366).toBeGreaterThan(0)
    expect(S_366).toBeLessThan(1)
    expect(PR_10_WORD.ja.length).toBeGreaterThan(0)
    expect(PR_10_WORD.en.length).toBeGreaterThan(0)
  })
})

describe('DA-1 -- when the mark is drawn', () => {
  it(`DA-1 「${DA_1_NULL}」: no mark in the placement, the geometry or the picture`, () => {
    const scene = oneTask({ deadline: null })
    expect(placedOf(scene, 1).deadlineX ?? null, 'S-1 deadlineX').toBeNull()
    expect(drawnOf(scene, 1).deadline ?? null, 'S-2 deadline').toBeNull()
    expect(markTagsOf(scene.svg(), 1)).toEqual([])
  })

  it(`DA-1 「${DA_1_DRAW}」: a Task with a deadline has one mark (control for the null case)`, () => {
    const scene = oneTask({ deadline: day(6) })
    expect(placedOf(scene, 1).deadlineX ?? null, 'S-1 deadlineX').not.toBeNull()
    expect(markOf(scene, 1).outline).toHaveLength(7)
    expect(markTagsOf(scene.svg(), 1)).toHaveLength(1)
  })

  it('DA-1: a milestone with a deadline has one mark too (マイルストーンも同じである)', () => {
    const scene = oneTask({ start: day(6), finish: day(6), milestone: true, deadline: day(9) }, {}, KIND_OF('SH-5'))
    expect(markOf(scene, 1).outline).toHaveLength(7)
    expect(markTagsOf(scene.svg(), 1)).toHaveLength(1)
  })

  const toggles: readonly (readonly [string, Readonly<Record<string, unknown>>])[] = [
    [`S-227 ${PLAN_VISIBLE} false`, { [PLAN_VISIBLE]: false, [MARKER_VISIBLE]: true }],
    [`S-228 ${ACTUAL_VISIBLE} false`, { [ACTUAL_VISIBLE]: false, [MARKER_VISIBLE]: true }],
    [`S-63 ${MARKER_VISIBLE} false`, { [MARKER_VISIBLE]: false }],
    ['S-227, S-228 and S-63 all false', { [PLAN_VISIBLE]: false, [ACTUAL_VISIBLE]: false, [MARKER_VISIBLE]: false }],
  ]
  for (const [name, over] of toggles) {
    it(`DA-1 ⛔ ${DA_1_NOT_THE_TOGGLES}: drawn with ${name}`, () => {
      const scene = oneTask({ deadline: day(6), actualStart: day(2), percentComplete: 40 }, over)
      expect(markOf(scene, 1).outline).toHaveLength(7)
      expect(markTagsOf(scene.svg(), 1), name).toHaveLength(1)
    })
  }

  for (const state of ['hidden', 'collapsedParent'] as const) {
    it(`DA-1 「${DA_1_FOLDED}」: a Task in a ${state} row has no mark, the Task in the drawn row has one`, () => {
      const scene = withTwoRows(state)
      const drawnTwo = scene.drawn(2)
      expect(scene.placed(2) === null || drawnTwo === undefined, `premise: task 2 sits in a ${state} row`).toBe(true)
      expect(drawnTwo?.deadline ?? null).toBeNull()
      const svg = scene.svg()
      expect(markTagsOf(svg, 2)).toEqual([])
      expect(markTagsOf(svg, 1), 'the Task in the drawn row keeps its mark').toHaveLength(1)
    })
  }
})

describe('DA-2 -- the shape: one filled down arrow, its box as tall as the marker', () => {
  for (const sh of SH) {
    it(`DA-2 「${DA_2_HEIGHT}」 ${sh}: box height d, head d x S-365 by d x S-366, shaft d x S-367, tip at the box bottom`, () => {
      const milestone = sh === 'SH-5'
      const scene = oneTask(
        milestone ? { start: day(6), finish: day(6), milestone: true, deadline: day(9) } : { deadline: day(12) },
        {},
        KIND_OF(sh),
      )
      const d = diameterOf(scene, 1, sh)
      const parts = partsOf(markOf(scene, 1).outline)
      expect(parts.bottom - parts.top, `${sh} box height = d`).toBeCloseTo(d, 6)
      expect(parts.tip.y, `${sh} ${DA_2_TIP}`).toBeCloseTo(parts.bottom, 6)
      expect(parts.headWidth, `${sh} head width = d x S-365`).toBeCloseTo(d * S_365, 6)
      expect(parts.headHeight, `${sh} head height = d x S-366`).toBeCloseTo(d * S_366, 6)
      expect(parts.shaftWidth, `${sh} shaft = d x S-367`).toBeCloseTo(d * S_367, 6)
      expect(parts.shaftBottom, `${sh} the shaft runs down to the head's base`).toBeCloseTo(parts.bottom - d * S_366, 6)
      expect(parts.centreX, `${sh} the shaft is centred on the tip`).toBeCloseTo(parts.tip.x, 6)
    })
  }

  it(`DA-2 「${DA_2_ONE_SHAPE}」: one polygon of the seven outline points in the picture`, () => {
    const scene = oneTask({ deadline: day(12) })
    const element = markElementOf(scene.svg(), 1)
    expect(element.tag).toBe('polygon')
    const drawn = pointsOf(element.attrs)
    const outline = markOf(scene, 1).outline
    expect(drawn).toHaveLength(outline.length)
    drawn.forEach((one, index) => {
      expect(one.x).toBeCloseTo((outline[index] as Pt).x, 1)
      expect(one.y).toBeCloseTo((outline[index] as Pt).y, 1)
    })
  })

  it('DA-2 control: the rectangle mark and the arrow mark differ in size when the marker and the label font differ', () => {
    const rect = oneTask({ deadline: day(12) }, {}, KIND_OF('SH-1'))
    const arrow = oneTask({ deadline: day(12) }, {}, KIND_OF('SH-3'))
    const dRect = diameterOf(rect, 1, 'SH-1')
    const dArrow = diameterOf(arrow, 1, 'SH-3')
    expect(Math.abs(dRect - dArrow), 'premise: FR-094 gives the two shapes different diameters').toBeGreaterThan(SVG_EPS)
    const hRect = partsOf(markOf(rect, 1).outline)
    const hArrow = partsOf(markOf(arrow, 1).outline)
    expect(Math.abs(hRect.bottom - hRect.top - (hArrow.bottom - hArrow.top))).toBeGreaterThan(SVG_EPS)
  })
})

describe('DA-3 -- the colours and the halo', () => {
  for (const preference of ['light', 'dark'] as const) {
    it(`DA-3 「${DA_3_FILL}」 and 「${DA_3_HALO}」 (${preference})`, () => {
      const scene = oneTask({ deadline: day(12) })
      const d = diameterOf(scene, 1, 'SH-1')
      expect(markOf(scene, 1).haloWidth, 'S-2 haloWidth = d x S-34').toBeCloseTo(d * S_34, 6)
      const element = markElementOf(scene.svg('screen', preference), 1)
      expect(normalColour(attrOf(element.attrs, 'fill') ?? ''), 'fill S-364').toBe(t236('S-364', preference))
      expect(normalColour(attrOf(element.attrs, 'stroke') ?? ''), 'halo S-146').toBe(t236('S-146', preference))
      expect(Number(attrOf(element.attrs, 'stroke-width'))).toBeCloseTo(d * S_34, 2)
    })
  }

  it('DA-3 control: S-364 is not the ground colour, so a fill of S-146 would fail the fill case', () => {
    expect(t236('S-364', 'light')).not.toBe(t236('S-146', 'light'))
    expect(t236('S-364', 'dark')).not.toBe(t236('S-146', 'dark'))
  })
})

describe('DA-4 -- where the tip stands across', () => {
  it(`DA-4 「${DA_4_FINISH}」`, () => {
    const scene = oneTask({ start: day(2), finish: day(12), deadline: day(12) })
    const plan = drawnOf(scene, 1).plan
    if (plan === null) throw new Error('premise: the plan is drawn')
    expect(partsOf(markOf(scene, 1).outline).tip.x).toBeCloseTo(bandOf(plan).right, 6)
    expect(placedOf(scene, 1).deadlineX ?? Number.NaN, 'S-1 deadlineX is the tip').toBeCloseTo(bandOf(plan).right, 6)
  })

  it(`DA-4 「${DA_4_MILESTONE}」`, () => {
    const scene = oneTask({ start: day(6), finish: day(6), milestone: true, deadline: day(6) }, {}, KIND_OF('SH-5'))
    const figure = drawnOf(scene, 1).plan ?? drawnOf(scene, 1).milestoneFigure
    if (figure === null) throw new Error('premise: the diamond is drawn')
    const band = bandOf(figure)
    expect(partsOf(markOf(scene, 1).outline).tip.x).toBeCloseTo((band.left + band.right) / 2, 6)
  })

  it(`DA-4 「${DA_4_AT_THE_DAY}」: one day later moves the tip by one day's width`, () => {
    const earlier = oneTask({ deadline: day(12) })
    const later = oneTask({ deadline: day(13) })
    const step = partsOf(markOf(later, 1).outline).tip.x - partsOf(markOf(earlier, 1).outline).tip.x
    expect(step).toBeCloseTo(earlier.layout.pxPerDay, 6)
  })

  const WEEK = [9, 10, 11, 12, 13, 14, 15]
  const weekTasks = (): readonly Task[] =>
    WEEK.map((n, index) => taskOf({ uid: index + 1, name: null, start: day(2), finish: day(4), deadline: day(n) }))

  it('DA-4 premise: under this calendar the time axis still gives each of the seven days one pxPerDay', () => {
    const scene = weekendOff(
      WEEK.map((n, index) => taskOf({ uid: index + 1, name: null, start: day(n), finish: day(n + 1) })),
    )
    const first = placedOf(scene, 1).x
    WEEK.forEach((_n, index) => {
      expect(placedOf(scene, index + 1).x - first).toBeCloseTo(index * scene.layout.pxPerDay, 6)
    })
  })

  it(`DA-4 ⛔ 「${DA_4_NO_SNAP}」: deadlines on the seven days of a week with two days off stand one day apart`, () => {
    const scene = weekendOff(weekTasks())
    const first = partsOf(markOf(scene, 1).outline).tip.x
    WEEK.forEach((n, index) => {
      const tip = partsOf(markOf(scene, index + 1).outline).tip.x
      expect(tip - first, `deadline 2026-03-${n}`).toBeCloseTo(index * scene.layout.pxPerDay, 6)
    })
  })
})

describe('DA-5 -- where the box stands down the row', () => {
  for (const sh of SH) {
    it(`DA-5 「${DA_5_SAME_BAND}」 ${sh}: the box spans the marker's band`, () => {
      const milestone = sh === 'SH-5'
      const scene = oneTask(
        milestone
          ? { start: day(6), finish: day(6), milestone: true, deadline: day(9), percentComplete: 0 }
          : { deadline: day(12), actualStart: day(2), percentComplete: 40 },
        { [MARKER_VISIBLE]: true },
        KIND_OF(sh),
      )
      const marker = drawnOf(scene, 1).marker
      if (marker === null) throw new Error(`premise: ${sh} draws its marker with S-63 true`)
      const parts = partsOf(markOf(scene, 1).outline)
      expect((parts.top + parts.bottom) / 2, `${sh} box centre = marker centre`).toBeCloseTo(marker.centre.y, 6)
    })
  }

  for (const sh of ['SH-1', 'SH-2'] as const) {
    it(`DA-5 「${DA_5_CENTRE}」 ${sh}`, () => {
      const scene = oneTask({ deadline: day(12) }, {}, KIND_OF(sh))
      const plan = drawnOf(scene, 1).plan
      if (plan === null) throw new Error('premise: the plan is drawn')
      const parts = partsOf(markOf(scene, 1).outline)
      expect((parts.top + parts.bottom) / 2).toBeCloseTo(bandOf(plan).centre, 6)
    })
  }

  for (const sh of ['SH-3', 'SH-4'] as const) {
    it(`DA-5 「${DA_5_TIER_ONE}」 ${sh}: the tip stands on or above the plan line, the box in the tier above it`, () => {
      const scene = oneTask({ deadline: day(12) }, {}, KIND_OF(sh))
      const plan = drawnOf(scene, 1).plan
      if (plan === null) throw new Error('premise: the plan is drawn')
      const parts = partsOf(markOf(scene, 1).outline)
      const line = bandOf(plan)
      expect(parts.tip.y).toBeLessThanOrEqual(line.top + GEO_EPS)
      expect(line.centre + (parts.bottom - parts.top) / 2).toBeGreaterThan(line.top)
    })
  }

  it(`DA-5 「${DA_5_MILESTONE}」 SH-5`, () => {
    const scene = oneTask({ start: day(6), finish: day(6), milestone: true, deadline: day(9) }, {}, KIND_OF('SH-5'))
    const figure = drawnOf(scene, 1).plan ?? drawnOf(scene, 1).milestoneFigure
    if (figure === null) throw new Error('premise: the diamond is drawn')
    const parts = partsOf(markOf(scene, 1).outline)
    expect((parts.top + parts.bottom) / 2).toBeCloseTo(bandOf(figure).centre, 6)
  })

  it('DA-5 ⭐ 印のために縦の占有を足さない: the row and the Task stand where they stand without a deadline', () => {
    for (const sh of SH) {
      const milestone = sh === 'SH-5'
      const base = milestone ? { start: day(6), finish: day(6), milestone: true } : {}
      const without = oneTask({ ...base, deadline: null }, {}, KIND_OF(sh))
      const withMark = oneTask({ ...base, deadline: day(9) }, {}, KIND_OF(sh))
      expect(placedOf(withMark, 1).y, sh).toBeCloseTo(placedOf(without, 1).y, 6)
      expect(markOf(withMark, 1).outline, sh).toHaveLength(7)
    }
  })
})

describe('DA-6 -- the mark takes no press, and a rest on it tells its own hint', () => {
  const sizes = grabSizesOf()
  for (const [name, deadline] of [
    ['far right of the bar', day(20)],
    ['over the bar', day(5)],
  ] as const) {
    it(`DA-6 「${DA_6_SAME_ANSWER}」: every point of the mark (${name}) answers as the same scene without a deadline`, () => {
      const withMark = oneTask({ deadline, actualStart: day(2), percentComplete: 40 }, { [MARKER_VISIBLE]: true })
      const without = oneTask({ deadline: null, actualStart: day(2), percentComplete: 40 }, { [MARKER_VISIBLE]: true })
      expect(placedOf(withMark, 1).x, 'premise: one Task, placed alike').toBeCloseTo(placedOf(without, 1).x, 6)
      const parts = partsOf(markOf(withMark, 1).outline)
      const xs = markOf(withMark, 1).outline.map((one) => one.x)
      const probes: Pt[] = [parts.tip, { x: parts.centreX, y: (parts.top + parts.bottom) / 2 }]
      for (let x = Math.min(...xs); x <= Math.max(...xs); x += 1) {
        for (let y = parts.top; y <= parts.bottom; y += 1) probes.push({ x, y })
      }
      for (const at of probes) {
        for (const resolving of ['press', 'doubleClick'] as const) {
          const a = itemAtPointer(withMark.whole as never, at.x, at.y, sizes, resolving)
          const b = itemAtPointer(without.whole as never, at.x, at.y, sizes, resolving)
          expect(a, `${DA_6_NO_HIT} (${resolving} at ${at.x},${at.y})`).toEqual(b)
        }
      }
    })
  }

  it(`DA-6 「${DA_6_OWN_HINT}」: a rest on the mark far right of the bar names the deadline hint`, () => {
    const withMark = oneTask({ deadline: day(20) })
    const tip = partsOf(markOf(withMark, 1).outline).tip
    const centre = { x: tip.x, y: tip.y - 1 }
    expect(itemAtPointer(withMark.whole as never, centre.x, centre.y, sizes, 'hint')).toEqual({
      kind: 'deadline',
      taskUid: 1,
    })
  })

  it('DA-6 control: far right of the bar, the tip of the mark is on no Task without it', () => {
    const without = oneTask({ deadline: null })
    const withMark = oneTask({ deadline: day(20) })
    const tip = partsOf(markOf(withMark, 1).outline).tip
    const centre = { x: tip.x, y: tip.y - 1 }
    expect(itemAtPointer(without.whole as never, centre.x, centre.y, grabSizesOf())).toBeNull()
  })
})

describe('DA-7 -- cut at the Row Area as the other shapes are', () => {
  it(`DA-7 「${DA_7_CUT}」: the mark sits under the same clips as the Task's plan bar`, () => {
    const scene = oneTask({ deadline: day(12) })
    const svg = scene.svg()
    const mark = markElementOf(svg, 1)
    const plan = elementsOf(svg).find((one) => one.zo.includes('ZO-1') && one.attrs.includes('data-figure="task-1'))
    if (plan === undefined) throw new Error('premise: the picture draws a ZO-1 figure')
    expect(plan.clips.length, 'premise: the shapes are cut by a clip').toBeGreaterThan(0)
    expect(mark.clips).toEqual(plan.clips)
  })
})

describe('OC-9 -- the mark counts in the occupied width', () => {
  it(`OC-9 「${OC_9_WIDTH}」: a deadline right of the bar ends the occupation at the head's right edge`, () => {
    const scene = oneTask({ start: day(2), finish: day(4), deadline: day(20) })
    const placed = placedOf(scene, 1)
    const d = diameterOf(scene, 1, 'SH-1')
    const x = placed.deadlineX ?? Number.NaN
    expect(x).toBeCloseTo(partsOf(markOf(scene, 1).outline).tip.x, 6)
    expect(placed.occupiedX1).toBeCloseTo(x + (d * S_365) / 2, 6)
  })

  it(`OC-9 「${OC_9_WIDTH}」: a deadline left of the bar starts the occupation at the head's left edge`, () => {
    const scene = oneTask({ start: day(16), finish: day(18), deadline: day(3) })
    const placed = placedOf(scene, 1)
    const d = diameterOf(scene, 1, 'SH-1')
    expect(placed.occupiedX0).toBeCloseTo((placed.deadlineX ?? Number.NaN) - (d * S_365) / 2, 6)
  })

  for (const [side, a, b] of [
    ['right', { start: day(2), finish: day(4), deadline: day(20) }, { start: day(10), finish: day(12) }],
    ['left', { start: day(16), finish: day(18), deadline: day(3) }, { start: day(8), finish: day(10) }],
  ] as const) {
    it(`OC-9 「${OC_9_ONE_OCCUPATION}」: a Task between the bar and a mark on its ${side} goes to another tier`, () => {
      const scene = (withDeadline: boolean): Stage2 =>
        sceneOf({
          tasks: [
            taskOf({ uid: 1, name: null, ...a, deadline: withDeadline ? a.deadline : null }),
            taskOf({ uid: 2, name: null, ...b }),
          ],
        })
      const control = scene(false)
      expect(placedOf(control, 1).stack, 'control: without the deadline the two share a tier').toBe(
        placedOf(control, 2).stack,
      )
      const marked = scene(true)
      expect(placedOf(marked, 1).stack).not.toBe(placedOf(marked, 2).stack)
    })
  }
})

describe('ZO-13 -- the layer the mark is drawn in', () => {
  const rich = (): Stage2 =>
    sceneOf({
      tasks: [
        taskOf({ uid: 1, name: 'the first', start: day(2), finish: day(8), actualStart: day(2), percentComplete: 40, deadline: day(6) }),
        taskOf({
          uid: 2,
          name: 'the second',
          start: day(10),
          finish: day(24),
          actualStart: day(10),
          percentComplete: 70,
          dependencies: [{ predecessorUid: 1, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] }],
        }),
      ],
      assignedTaskUids: [1, 2],
      statusDate: day(14),
      settings: { assigneeVisible: true, percentCompleteVisible: true, [MARKER_VISIBLE]: true },
    })

  it(`ZO-13 「${ZO_13_PLACE}」: the mark is inside the ZO-13 layer`, () => {
    const mark = markElementOf(rich().svg(), 1)
    expect(mark.zo).toContain('ZO-13')
  })

  it(`ZO-13 「${ZO_13_PLACE}」: ZO-1, ZO-2, ZO-4 behind it; ZO-8, ZO-3, ZO-5 in front`, () => {
    const order = zoOrderOf(rich().svg())
    const here = order.indexOf('ZO-13')
    expect(here, 'the ZO-13 layer is drawn').toBeGreaterThanOrEqual(0)
    for (const behind of ['ZO-1', 'ZO-2', 'ZO-4']) {
      expect(order.indexOf(behind), `${behind} drawn`).toBeGreaterThanOrEqual(0)
      expect(order.indexOf(behind), `${behind} behind ZO-13`).toBeLessThan(here)
    }
    for (const front of ['ZO-8', 'ZO-3', 'ZO-5']) {
      expect(order.indexOf(front), `${front} drawn`).toBeGreaterThanOrEqual(0)
      expect(order.indexOf(front), `${front} in front of ZO-13`).toBeGreaterThan(here)
    }
  })
})

describe('EP-5 / WY-3 -- the export draws the mark as the screen does', () => {
  it(`EP-5 「${EP_5_HAS_THE_MARK}」 is drawn: the exported picture has the same mark`, () => {
    const scene = oneTask({ deadline: day(12) })
    const onScreen = pointsOf(markElementOf(scene.svg('screen'), 1).attrs)
    const exported = markElementOf(scene.svg('export'), 1)
    expect(exported.tag).toBe('polygon')
    const points = pointsOf(exported.attrs)
    expect(points).toHaveLength(onScreen.length)
    points.forEach((one, index) => {
      expect(one.x, 'WY-3 same place').toBeCloseTo((onScreen[index] as Pt).x, 1)
      expect(one.y, 'WY-3 same place').toBeCloseTo((onScreen[index] as Pt).y, 1)
    })
  })

  it('EP-5 control: an exported Task without a deadline has no mark', () => {
    expect(markTagsOf(oneTask({ deadline: null }).svg('export'), 1)).toEqual([])
  })
})

const VIEW: Omit<ScreenView, 'tooltips'> = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [],
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

const sessionIn = (language: 'ja' | 'en'): ScreenSession => ({
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: language, helpLanguage: language },
})

const restingOn = (task: Task): ScreenViewReadings => ({
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: { x: 300, y: 200 },
  pointerRestedMs: S_439_MS + 1,
  hintTargetDwellMs: S_439_MS + 1,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  hintHolderUnderPointer: { kind: 'task', taskUid: task.uid },
  themePreference: 'light',
  themeHue: THEME_HUE,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}) as unknown as ScreenViewReadings

const taskTipOf = (task: Task, language: 'ja' | 'en'): string => {
  const tips = tooltipsFromScreenView(
    { ...VIEW, language },
    SETTINGS_DEFAULTS as unknown as DocumentSettings,
    sessionIn(language),
    restingOn(task),
    { tasks: [task], resources: [], assignments: [], baselineTasks: [] } as unknown as Schedule,
  ).filter((one) => one.anchor.kind === 'task')
  if (tips.length !== 1) throw new Error(`EZ-6: ${tips.length} task tooltips after resting S-439 on a task`)
  return (tips[0] as Tooltip).text
}

const HINTED = { uid: 3, name: 'a named task', start: day(2), finish: day(8) }

describe('TL-9 -- the tooltip names the deadline on its last line', () => {
  for (const language of ['ja', 'en'] as const) {
    it(`TL-9 「${TL_9_LINE}」 / 「${TL_9_THE_WORD}」 / 「${TL_10_DAY}」 (${language})`, () => {
      const plain = taskTipOf(taskOf({ ...HINTED, deadline: null }), language)
      const withDeadline = taskTipOf(taskOf({ ...HINTED, deadline: day(20) }), language)
      const lines = withDeadline.split('\n')
      expect(lines.slice(0, -1).join('\n'), 'the lines before it are the tooltip without a deadline').toBe(plain)
      expect(lines.at(-1)).toBe(`${PR_10_WORD[language]} ${DAY_20[language]}`)
    })

    it(`TL-9 「${TL_9_NO_LINE}」 (${language})`, () => {
      const plain = taskTipOf(taskOf({ ...HINTED, deadline: null }), language)
      expect(plain.includes(PR_10_WORD[language])).toBe(false)
      expect(plain.split('\n')[0], 'the first line still names the Task').toBe(HINTED.name)
    })
  }

  it('EZ-6 control: the two languages print different words, so a fixed word fails one of them', () => {
    expect(PR_10_WORD.ja).not.toBe(PR_10_WORD.en)
  })
})

describe('IN-7 / S-7 -- the tooltip drawer shows each line as its own line', () => {
  const THEME: ScreenTheme = { preference: 'light', hue: THEME_HUE }
  const viewWith = (tooltips: readonly Tooltip[]): ScreenView => ({ ...VIEW, tooltips })
  const drawnTip = (text: string): FakeElement => {
    const stagebuilt = stage({ 'App Header': 37 })
    domScreenSurface(wiringOf(stagebuilt, THEME)).showScreenView(
      viewWith([{ anchor: { kind: 'task', taskUid: 3 }, text, assignment: null, at: { x: 200, y: 150 } }]),
    )
    const tips = oneByRole(stagebuilt.root(), TOOLTIP_ROLE).children
    if (tips.length !== 1) throw new Error(`${tips.length} tooltips drawn`)
    return tips[0] as FakeElement
  }

  it(`IN-7 「${IN_7_ONE_LINE}」 with TL-9's line: one element per line, no line break character left in any`, () => {
    const first = 'a named task'
    const second = `${PR_10_WORD.ja} ${DAY_20.ja}`
    const tip = drawnTip(`${first}\n${second}`)
    const all = selfAndDescendants(tip)
    expect(all.some((one) => one.textContent === first), 'the first line is one element').toBe(true)
    expect(all.some((one) => one.textContent === second), 'the second line is one element').toBe(true)
    expect(all.filter((one) => (one.textContent ?? '').includes('\n'))).toEqual([])
  })

  it('IN-7 control: a text without a line break stays one element holding the whole text', () => {
    const text = 'a named task'
    expect(selfAndDescendants(drawnTip(text)).some((one) => one.textContent === text)).toBe(true)
  })
})
