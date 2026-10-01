// CR-606 spec-only cases: TaskVisual.strokeWidthPx (AT-104, CL-2) is an integer 1..10 or null, drawn on

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule, taskPlacement } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
// WHY: outlineWidthOf is not on the ScheduleLayout entry (T-064 does not publish it, check 26b).
import { outlineWidthOf } from '../../src/entity/layout-engine/schedule-layout/shape-cross-sections'
import {
  displayRatioOf,
  drawnSettingsOf,
  regionsFromScreen,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { editDocument, type DocumentCommand, type EditResult } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import { SCREEN, day, scheduleOf, stored, taskOf as sceneTaskOf } from '../unit/cr-430-cross-section-scene'
import { DESIGN, REQUIREMENTS, documentOf, highlightBoxOf, taskOf, visualOf } from './cr-606-stage'
import { bare, specTable, unbroken } from './spec-table'

// see CL-2, AT-104, VG-5, BL-3
const CL_2_RANGE_AT_AT_104 = '受ける下限と上限は列の定義（`AT-104`）に書く。'
const CL_2_NULL_IS_S_39 = '`null` のときは `_assets/tbl-settings.md` の 表 T-201 の `S-39` の太さで描く'
const AT_104_BOTH_OUTLINES = '予定バーと実績バーの縁の両方をこの太さで描く。'
const VG_5_OUTER_EDGE =
  '枠線（その形の枠線の太さの列 `AT-104` の値、`null` のときは `S-39` に、描く比を掛けた太さ）は形の端を中心に引くので、その半分が形の外へ出る。'
const BL_3_KEEPS_S_39 =
  '太さは同書の 表 T-201 の `S-39`（枠線の太さを指定していない予定の輪郭と同じ太さ —— 今の予定の `AT-104` は継がない）'
// see FR-019, HB-12, IV-9
const FR_019_NO_LINE = 'ハイライトボックスの枠の線にも、タスクと同じく透明（線なし）を選ばせること（MUST）'
const FR_019_NOT_BOTH = '⛔ ただし、塗りと枠の線を同時に透明にすることを許してはならない（MUST NOT）'
const FR_019_NULL_FILL =
  '⭐ 塗りの色の列が `null` のときは、テーマの色（`_assets/tbl-settings.md` の 表 T-236 の `S-155`）で塗ること（MUST）'
const FR_019_NULL_DEFAULTS = '⭐ 線の太さと透過率の列が `null` のときは、表 T-217 の同じ列の既定で描くこと（MUST）'
const FR_019_PLACED_UNFILLED =
  '⭐ 置くとき（表 T-108 の `CM-52`）は、塗りの色の列に 表 T-217 の `S-370`（透明）を写すこと（MUST）'
const HB_12_SAME_BAND = '⭐ 枠の線が透明（線なし）でも、掴み代は同じ所に同じ幅で置くこと（MUST）'
const IV_9_BOTH_ENTITIES = '`TaskVisual` と `HighlightBox` のそれぞれで、`fillColor` と `strokeColor` が同時に透明でないこと'

const SPEC = join(process.cwd(), 'docs', 'spec')
const ERD_DETAIL = unbroken(readFileSync(join(SPEC, '_assets', 'fig-erd-detail.md'), 'utf8').replace(/\r\n/g, '\n'))
const cellText = (table: string, id: string): string =>
  unbroken((specTable(table).rows.find((one) => one.id === id)?.cells ?? []).join(' '))

describe('CR-606 premise -- the clauses these cases quote still stand', () => {
  it.each([
    ['CL-2 range', 'T-017', 'CL-2', CL_2_RANGE_AT_AT_104],
    ['CL-2 null', 'T-017', 'CL-2', CL_2_NULL_IS_S_39],
    ['VG-5 outer edge', 'T-259', 'VG-5', VG_5_OUTER_EDGE],
    ['BL-3 keeps S-39', 'T-339', 'BL-3', BL_3_KEEPS_S_39],
    ['HB-12 same band', 'T-246', 'HB-12', HB_12_SAME_BAND],
    ['IV-9 both entities', 'T-220', 'IV-9', IV_9_BOTH_ENTITIES],
  ])('%s', (_name, table, id, clause) => {
    expect(cellText(table, id)).toContain(clause)
  })

  it.each([FR_019_NO_LINE, FR_019_NOT_BOTH, FR_019_NULL_FILL, FR_019_NULL_DEFAULTS, FR_019_PLACED_UNFILLED])(
    'FR-019 holds %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )

  it('AT-104 says the width is drawn on both outlines; IV-9 is read from 05-07-design', () => {
    expect(ERD_DETAIL).toContain(AT_104_BOTH_OUTLINES)
    expect(DESIGN).toContain(IV_9_BOTH_ENTITIES)
  })
})

interface ErdColumn {
  readonly seat: number
  readonly name: string
  readonly json?: { readonly kind?: string; readonly min?: number; readonly max?: number; readonly null?: boolean }
}
const ERD = JSON.parse(readFileSync(join(SPEC, '_source', 'erd.json'), 'utf8')) as {
  readonly entities: readonly { readonly columns?: readonly ErdColumn[] }[]
}
const AT_104 = ERD.entities.flatMap((one) => one.columns ?? []).find((one) => one.seat === 104)
const LOW = AT_104?.json?.min ?? Number.NaN
const HIGH = AT_104?.json?.max ?? Number.NaN
const S_39 = stored('S-39')

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }
const TASK = 1

describe(`AT-104 -- ${CL_2_RANGE_AT_AT_104}`, () => {
  it('premise: AT-104 is strokeWidthPx, an integer column that takes null, 1..10', () => {
    expect(AT_104?.name).toBe('strokeWidthPx')
    expect(AT_104?.json?.kind).toBe('integer')
    expect(AT_104?.json?.null).toBe(true)
    expect([LOW, HIGH]).toEqual([1, 10])
  })

  const plain = (): Document =>
    documentOf({ tasks: [taskOf(TASK)], visuals: [visualOf(TASK, { shapeKind: 'rectangle' })] })

  const setWidth = (strokeWidthPx: number | null): EditResult =>
    editDocument(plain(), { kind: 'setTaskVisualStrokeWidth', uid: TASK, strokeWidthPx } as DocumentCommand, LIMITS, 'row')

  const storedWidth = (result: EditResult): unknown =>
    result.ok ? result.document.schedule.taskVisuals.find((one) => one.taskUid === TASK)?.strokeWidthPx : 'refused'

  it.each([[LOW], [2], [HIGH - 1], [HIGH], [null]])('CM-24 setTaskVisualStrokeWidth places %s', (value) => {
    const result = setWidth(value)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    expect(storedWidth(result)).toBe(value)
  })

  it.each([[LOW - 1], [HIGH + 1], [2.5], [-3]])('CM-24 refuses %s, outside the integers 1..10', (value) => {
    expect(setWidth(value).ok).toBe(false)
  })

  const TEMPLATE_TEXT = readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  )
  const templateWith = (visual: Record<string, unknown>): string => {
    const json = JSON.parse(TEMPLATE_TEXT) as Record<string, any>
    const visuals = json['schedule']['taskVisuals'] as Record<string, unknown>[]
    if (visuals.length === 0) throw new Error('premise: the startup template holds a TaskVisual')
    visuals[0] = { ...visuals[0], ...visual }
    return JSON.stringify(json)
  }

  it('the GRS JSON read takes a width inside the range', () => {
    for (const width of [LOW, HIGH, null]) {
      const read = documentFromJson(templateWith({ strokeWidthPx: width }))
      expect(read.ok, `width ${String(width)}`).toBe(true)
    }
  })

  it('the GRS JSON read refuses a width outside the range (the schema the column definition makes)', () => {
    for (const width of [LOW - 1, HIGH + 1]) {
      expect(documentFromJson(templateWith({ strokeWidthPx: width })).ok, `width ${width}`).toBe(false)
    }
  })

  it('an old lineWeight is never converted into a width (JDG-864: no old-format reading)', () => {
    const read = documentFromJson(templateWith({ strokeWidthPx: null, lineWeight: 'thick' }))
    if (!read.ok) return
    const visual = read.document.schedule.taskVisuals[0] as unknown as Record<string, unknown>
    expect(visual['strokeWidthPx']).toBeNull()
    expect('lineWeight' in visual).toBe(false)
  })
})

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    zoomX: 8,
    scrollDate: day(1),
    stackDirection: 'down',
    ...part,
  }) as unknown as DocumentSettings

const withWidths = (schedule: Schedule, widths: Readonly<Record<number, number | null>>): Schedule =>
  ({
    ...schedule,
    taskVisuals: schedule.taskVisuals.map((one) => {
      const { lineWeight: _dropped, ...rest } = one as unknown as Record<string, unknown>
      return { ...rest, strokeWidthPx: widths[one.taskUid] ?? null }
    }),
  }) as unknown as Schedule

interface Drawn {
  readonly svg: string
  readonly layout: ReturnType<typeof layoutFromSchedule>
  readonly geometry: ReturnType<typeof geometryFromLayout>
}

const drawn = (schedule: Schedule, settings: DocumentSettings = settingsOf()): Drawn => {
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const selection = emptySelection()
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection, null)
  const svg = svgFromSchedule(schedule, settings, layout, geometry, regions, selection, 'screen', {
    themePreference: 'light',
    guideCursorMode: 'none',
  } as never)
  return { svg, layout, geometry }
}

const attrOf = (attrs: string, name: string): string | null => {
  const found = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  if (found !== null) return found[1] as string
  const style = /(?:^|\s)style="([^"]*)"/.exec(attrs)?.[1] ?? ''
  const prop = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(style)
  return prop === null ? null : (prop[1] as string).trim()
}

interface SvgElement {
  readonly tag: string
  readonly attrs: string
  readonly zo: readonly string[]
  readonly groupAttrs: readonly string[]
}

const elementsOf = (svg: string): readonly SvgElement[] => {
  const out: SvgElement[] = []
  const groups: string[] = []
  for (const match of svg.matchAll(/<(\/?)([a-zA-Z]+)((?:[^<>"]|"[^"]*")*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') groups.push(attrs as string)
      continue
    }
    if (closing === '/') continue
    out.push({
      tag: tag as string,
      attrs: attrs as string,
      zo: groups.map((one) => attrOf(one, 'data-zo')).filter((one): one is string => one !== null),
      groupAttrs: [...groups],
    })
  }
  return out
}

// WHY: a stroke width may sit on the nearest group rather than on the shape.
const painted = (element: SvgElement, name: string): string | null => {
  const own = attrOf(element.attrs, name)
  if (own !== null) return own
  for (let index = element.groupAttrs.length - 1; index >= 0; index -= 1) {
    const inherited = attrOf(element.groupAttrs[index] as string, name)
    if (inherited !== null) return inherited
  }
  return null
}

const figureOf = (svg: string, figure: string): SvgElement => {
  const found = elementsOf(svg).filter((one) => attrOf(one.attrs, 'data-figure') === figure)
  if (found.length === 0) throw new Error(`premise: the picture draws no ${figure}`)
  return found[0] as SvgElement
}

// WHY: the SVG writes numbers to two decimals.
const EPS = 0.006

const PLAN_AND_ACTUAL = sceneTaskOf({
  uid: TASK,
  start: day(4),
  finish: day(12),
  actualStart: day(4),
  actualFinish: day(8),
  percentComplete: 100,
})

describe(`CL-2 / AT-104 -- ${AT_104_BOTH_OUTLINES}`, () => {
  const settings = settingsOf()
  const ratio = displayRatioOf(settings)

  it(`outlineWidthOf: null draws S-39 times the drawn ratio (${CL_2_NULL_IS_S_39})`, () => {
    expect(outlineWidthOf(null, drawnSettingsOf(settings))).toBeCloseTo(S_39 * ratio, 9)
  })

  it.each([[1], [3], [10]])('outlineWidthOf: %s px draws that width times the drawn ratio (VG-5)', (width) => {
    expect(outlineWidthOf(width, drawnSettingsOf(settings))).toBeCloseTo(width * ratio, 9)
  })

  it.each([[null], [1], [4], [10]])('width %s: the plan and the actual outline are both drawn at it', (width) => {
    const schedule = withWidths(scheduleOf({ tasks: [PLAN_AND_ACTUAL], shapeKind: 'rectangle' }), { [TASK]: width })
    const { svg } = drawn(schedule, settings)
    const expected = (width ?? S_39) * ratio
    for (const part of ['plan', 'actual']) {
      const value = Number(painted(figureOf(svg, `task-${TASK}-${part}`), 'stroke-width'))
      expect(Math.abs(value - expected), `${part}: ${value} vs ${expected}`).toBeLessThanOrEqual(EPS)
    }
  })
})

describe(`VG-5 -- ${VG_5_OUTER_EDGE}`, () => {
  // WHY: two tasks over the same days stack in the one row; the gap is measured between the outer
  // edges, so the distance between the two shapes grows by one whole outline width (half from each).
  const BELOW = 2
  const stackedGap = (width: number | null): number => {
    const tasks = [
      sceneTaskOf({ uid: TASK, start: day(4), finish: day(12) }),
      sceneTaskOf({ uid: BELOW, start: day(4), finish: day(12) }),
    ]
    const schedule = withWidths(scheduleOf({ tasks, shapeKind: 'rectangle' }), { [TASK]: width, [BELOW]: width })
    const { layout } = drawn(schedule)
    const one = taskPlacement(layout, TASK)
    const two = taskPlacement(layout, BELOW)
    if (one === null || two === null) throw new Error('premise: both tasks are placed')
    expect(one.stack, 'premise: the two tasks stack').not.toBe(two.stack)
    return Math.abs(two.y - one.y)
  }

  it.each([[4], [10]])('both outlines at %s px push the stacked shapes apart by the difference from S-39', (width) => {
    const ratio = displayRatioOf(settingsOf())
    expect(stackedGap(width) - stackedGap(null)).toBeCloseTo((width - S_39) * ratio, 6)
  })
})

describe(`BL-3 -- ${BL_3_KEEPS_S_39}`, () => {
  const baselineKey = bare(specTable('T-202').rows.find((one) => one.id === 'S-69')?.by['キー'] ?? '').replace(/`/g, '')

  it('a task drawn at 6 px keeps its pre-change outline at S-39', () => {
    const settings = settingsOf({ [baselineKey]: true })
    const schedule = {
      ...withWidths(scheduleOf({ tasks: [sceneTaskOf({ uid: TASK, start: day(4), finish: day(10) })], shapeKind: 'rectangle' }), {
        [TASK]: 6,
      }),
      baselineTasks: [{ uid: TASK, name: null, start: day(6), finish: day(14), milestone: false }],
    } as unknown as Schedule
    const { svg } = drawn(schedule, settings)
    const ratio = displayRatioOf(settings)
    const outlines = elementsOf(svg).filter(
      (one) => one.zo.includes('ZO-15') && ['rect', 'polygon', 'path', 'polyline'].includes(one.tag),
    )
    expect(outlines.length, 'premise: the pre-change outline is drawn (ZO-15)').toBeGreaterThan(0)
    for (const one of outlines) {
      expect(Math.abs(Number(painted(one, 'stroke-width')) - S_39 * ratio)).toBeLessThanOrEqual(EPS)
    }
    const plan = Number(painted(figureOf(svg, `task-${TASK}-plan`), 'stroke-width'))
    expect(Math.abs(plan - 6 * ratio), 'control: the plan itself is drawn at 6 px').toBeLessThanOrEqual(EPS)
  })
})

const BOX = 'h1'
const TRANSPARENT = 'transparent'

const boxDocument = (part: Record<string, unknown>): Document =>
  documentOf({ tasks: [taskOf(TASK)], highlightBoxes: [highlightBoxOf(BOX, part)] })

const run = (document: Document, command: Record<string, unknown>): EditResult =>
  editDocument(document, command as unknown as DocumentCommand, LIMITS, 'row')

const isIv9 = (result: EditResult): boolean => !result.ok && result.refusals.some((one) => one.rule === 'IV-9')

describe(`FR-019 -- ${FR_019_NO_LINE}`, () => {
  it('CM-55 places a transparent outline on a filled box', () => {
    const result = run(boxDocument({ fillColor: 'red' }), { kind: 'setHighlightBoxStrokeColor', id: BOX, strokeColor: TRANSPARENT })
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) expect(result.document.schedule.highlightBoxes[0]?.strokeColor).toBe(TRANSPARENT)
  })

  it('CM-55 places a transparent outline on a box whose fill is null (the theme colour, not transparent)', () => {
    expect(run(boxDocument({ fillColor: null }), { kind: 'setHighlightBoxStrokeColor', id: BOX, strokeColor: TRANSPARENT }).ok).toBe(true)
  })
})

describe(`FR-019 / IV-9 -- ${FR_019_NOT_BOTH}`, () => {
  it('CM-55: a transparent outline on a transparent fill is refused by IV-9', () => {
    const result = run(boxDocument({ fillColor: TRANSPARENT }), {
      kind: 'setHighlightBoxStrokeColor',
      id: BOX,
      strokeColor: TRANSPARENT,
    })
    expect(isIv9(result), JSON.stringify(result)).toBe(true)
  })

  it('CM-78: a transparent fill under a transparent outline is refused by IV-9', () => {
    const result = run(boxDocument({ strokeColor: TRANSPARENT, fillColor: 'red' }), {
      kind: 'setHighlightBoxFillColor',
      id: BOX,
      fillColor: TRANSPARENT,
    })
    expect(isIv9(result), JSON.stringify(result)).toBe(true)
  })

  it('control: a transparent fill under a coloured outline is accepted', () => {
    expect(run(boxDocument({ strokeColor: 'red' }), { kind: 'setHighlightBoxFillColor', id: BOX, fillColor: TRANSPARENT }).ok).toBe(true)
  })

  it('IV-9 still refuses both transparent on a TaskVisual', () => {
    const document = documentOf({ tasks: [taskOf(TASK)], visuals: [visualOf(TASK, { shapeKind: 'rectangle' })] })
    const result = run(document, { kind: 'setTaskVisualColors', uid: TASK, fillColor: TRANSPARENT, strokeColor: TRANSPARENT })
    expect(result.ok).toBe(false)
  })
})

describe(`FR-019 -- ${FR_019_PLACED_UNFILLED}`, () => {
  it('CM-52 createHighlightBox stores S-370 in fillColor', () => {
    const s370 = /'([^']*)'/.exec(specTable('T-217').rows.find((one) => one.id === 'S-370')?.by['既定'] ?? '')?.[1]
    expect(s370).toBe(TRANSPARENT)
    const result = run(documentOf({ tasks: [taskOf(TASK)] }), {
      kind: 'createHighlightBox',
      id: 'h-new',
      range: { startDate: '2026-04-06', endDate: '2026-04-09', topGroupId: 'g1', bottomGroupId: 'g1' },
    })
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) expect(result.document.schedule.highlightBoxes.find((one) => one.id === 'h-new')?.fillColor).toBe(s370)
  })
})

describe(`FR-019 -- ${FR_019_NULL_FILL}`, () => {
  const hue = scheduleOf({ tasks: [] }).project.themeHue ?? 0
  const s155 = bare(specTable('T-236').rows.find((one) => one.id === 'S-155')?.by['明るいテーマ'] ?? '').replace('H', String(hue))
  const s371 = Number(/\d+/.exec(specTable('T-217').rows.find((one) => one.id === 'S-371')?.by['既定'] ?? '')?.[0])

  const boxSvg = (part: Record<string, unknown>): string =>
    drawn(
      scheduleOf({
        tasks: [sceneTaskOf({ uid: TASK, start: day(4), finish: day(10) })],
        shapeKind: 'rectangle',
        highlightBoxes: [{ ...highlightBoxOf(BOX, part), startDate: day(3), endDate: day(12) }],
      }),
    ).svg

  const fillOf = (svg: string): SvgElement | undefined =>
    elementsOf(svg).find((one) => attrOf(one.attrs, 'data-figure') === `box-${BOX}-fill`)

  const hslNumbers = (text: string): readonly number[] =>
    (text.replace(/\s+/g, ' ').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

  it(`a null fill is painted with S-155 at ${FR_019_NULL_DEFAULTS}`, () => {
    const fill = fillOf(boxSvg({ fillColor: null }))
    expect(fill, 'a null fill is painted').toBeDefined()
    const colour = painted(fill as SvgElement, 'fill') ?? ''
    expect(hslNumbers(colour), `${colour} vs ${s155}`).toEqual(hslNumbers(s155))
    expect(Number(painted(fill as SvgElement, 'fill-opacity'))).toBeCloseTo(1 - s371 / 100, 6)
  })

  it('control: a transparent fill paints nothing', () => {
    expect(fillOf(boxSvg({ fillColor: TRANSPARENT }))).toBeUndefined()
  })
})

describe(`HB-12 -- ${HB_12_SAME_BAND}`, () => {
  const geometryOf = (strokeColor: string | null) => {
    const schedule = scheduleOf({
      tasks: [],
      highlightBoxes: [{ ...highlightBoxOf(BOX, { strokeColor, fillColor: 'red', strokeWidthPx: 3 }), startDate: day(3), endDate: day(12) }],
    })
    return drawn(schedule).geometry
  }

  it('the frame answers the same presses whether its line is coloured or transparent', () => {
    const coloured = geometryOf('red')
    const clear = geometryOf(TRANSPARENT)
    const box = coloured.highlightBoxes.find((one) => one.id === BOX)?.box
    if (box === undefined) throw new Error('premise: the box is laid out')
    const sizes = grabSizesOf()
    const middle = box.y + box.height / 2
    const onTheLine = itemAtPointer(coloured, box.x, middle, sizes)
    expect(onTheLine?.item, 'premise: a press on the left frame line takes the box').toEqual({ kind: 'highlightBox', id: BOX })
    for (let dx = -8; dx <= 8; dx += 1) {
      for (const [x, y] of [
        [box.x + dx, middle],
        [box.x + box.width + dx, middle],
        [box.x + box.width / 2, box.y + dx],
      ] as const) {
        expect(itemAtPointer(clear, x, y, sizes), `at (${x}, ${y})`).toEqual(itemAtPointer(coloured, x, y, sizes))
      }
    }
  })
})
