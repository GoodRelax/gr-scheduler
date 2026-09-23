// CR-551 items 1-5: plan dates beside the name (ND-5, FR-002), the delay mark (FR-013), the chevron ends (FD-5),

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/json-codec'
import type { ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { rowDocument, taskOf, SCREEN } from './cr-541-stage'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))

const rowIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}
const numberOf = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}
const hexOf = (cell: string): string => {
  const found = /#[0-9a-fA-F]{6}/.exec(cell)
  if (found === null) throw new Error(`no colour in ${JSON.stringify(cell)}`)
  return found[0].toLowerCase()
}

// see S-325
const S_325 = numberOf(rowIn('T-206', 'S-325').by['既定'] ?? '')
// see S-30, LC-5
const LABEL_COEF = numberOf(rowIn('T-201', 'S-30').by['既定値'] ?? '')
// see S-24
const S_24 = numberOf(rowIn('T-201', 'S-24').by['既定値'] ?? '')
// see S-326, S-327
const S_326_LIGHT = hexOf(rowIn('T-236', 'S-326').by['明るいテーマ'] ?? '')
const S_327_LIGHT = hexOf(rowIn('T-236', 'S-327').by['明るいテーマ'] ?? '')
// see S-328, S-329, S-330, S-331
const S_328 = numberOf(rowIn('T-206', 'S-328').by['既定'] ?? '')
const S_329 = numberOf(rowIn('T-206', 'S-329').by['既定'] ?? '')
const S_330 = numberOf(rowIn('T-206', 'S-330').by['既定'] ?? '')
const S_331 = numberOf(rowIn('T-206', 'S-331').by['既定'] ?? '')

// see FR-093
const units = (text: string): number => [...text].length
// see LC-5
const lc5 = (text: string, font: number): number => units(text) * font * LABEL_COEF


const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

interface Bench {
  readonly loop: FrameLoop
  svg(): string
  view(): ScreenView
}

function bench(document: Record<string, unknown>): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const svgs: string[] = []
  const views: ScreenView[] = []
  const surface = {
    showScreenView: (view: ScreenView) => views.push(view),
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readFieldEditNotices: () => [],
    readScreenPartAt: () => null,
  } as unknown as ScreenSurface
  const loop = frameLoop({ showSvg: (svg: string) => svgs.push(svg) } as never, document as never, SCREEN, {
    surface,
    language: 'ja',
  })
  drain()
  return {
    loop,
    svg: () => svgs[svgs.length - 1] ?? '',
    view: () => views[views.length - 1] as ScreenView,
  }
}

interface Seed {
  readonly name: string
  readonly start: string
  readonly finish: string
  readonly part?: Record<string, unknown>
}

function documentOf(seeds: readonly Seed[], settings: Record<string, unknown> = {}, schedule: Record<string, unknown> = {}) {
  const rows = seeds.map((_one, index) => ({ id: `g${index + 1}`, parentId: null }))
  const document = rowDocument(rows, { progressMarkerVisible: false, ...settings }, schedule)
  document.schedule.tasks = seeds.map((one, index) =>
    taskOf(index + 1, { name: one.name, start: `${one.start}T08:00:00`, finish: `${one.finish}T17:00:00`, ...one.part }),
  )
  return document
}

const placementOf = (loop: FrameLoop, uid: number) => {
  const found = loop.current()?.layout.placements.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`the layout placed no task ${uid}`)
  return found
}

const labelOf = (loop: FrameLoop, uid: number): string => placementOf(loop, uid).label


const ND_5_ONE_YEAR = '文書のすべてのタスクとマイルストーンの `start` と `finish` が 1 つの暦年に収まるときは書かない。'
const ND_5_TWO_DIGITS = '年（西暦の下 2 桁、1 桁のときは 0 を詰めて 2 桁とする）、`/`、月、`/`、日 の順で書く'

describe('ND-5 (table T-251) -- the year beside the plan dates', () => {
  it('ND-5 still says: 1 つの暦年に収まるときは書かない / 西暦の下 2 桁、1 桁のときは 0 を詰めて 2 桁', () => {
    expect(REQUIREMENTS).toContain(ND_5_ONE_YEAR)
    expect(REQUIREMENTS).toContain(ND_5_TWO_DIGITS)
  })

  it('ND-5: 1 つの暦年に収まるときは書かない -- a one-year document writes month/day only', () => {
    // see ND-5
    const built = bench(
      documentOf(
        [
          { name: 'Alpha', start: '2026-04-06', finish: '2026-04-10' },
          { name: 'Beta', start: '2026-11-02', finish: '2026-12-30' },
        ],
        { planDatesVisible: true },
      ),
    )
    expect(labelOf(built.loop, 1)).toBe('Alpha 4/6 - 4/10')
    expect(labelOf(built.loop, 2)).toBe('Beta 11/2 - 12/30')
  })

  it('ND-5: 2 つ以上の暦年にまたがるときは、すべての日を 年（西暦の下 2 桁） / 月 / 日 -- every day of the document', () => {
    // see ND-5
    const built = bench(
      documentOf(
        [
          { name: 'Alpha', start: '2025-12-29', finish: '2026-01-05' },
          { name: 'Beta', start: '2026-04-06', finish: '2026-04-10' },
        ],
        { planDatesVisible: true },
      ),
    )
    expect(labelOf(built.loop, 1)).toBe('Alpha 25/12/29 - 26/1/5')
    expect(labelOf(built.loop, 2), 'ND-5: a task inside one year still carries the year').toBe('Beta 26/4/6 - 26/4/10')
  })

  it('ND-5: 1 桁のときは 0 を詰めて 2 桁とする -- 2005 is written 05', () => {
    // see ND-5
    const built = bench(
      documentOf([{ name: 'Alpha', start: '2005-12-29', finish: '2006-01-05' }], {
        planDatesVisible: true,
        scrollDate: '2005-12-01',
      }),
    )
    expect(labelOf(built.loop, 1)).toBe('Alpha 05/12/29 - 06/1/5')
  })
})


const FR_002_SIZE =
  '予定日の文字（その前に置く半角空白を含む）は、名前の字の大きさに `_assets/tbl-settings.md` の 表 T-206 の `S-325` を掛けた大きさで描くこと（MUST）'
const FR_002_SUM =
  '`FR-109` の 表 T-273 が「入る」を判ずる幅と、表 T-038 の `OC-1` が数える幅は、名前の部分と予定日の部分をそれぞれの大きさで測った和とすること（MUST）'

const LABEL_TEXT = /<text\b([^>]*)data-figure="task-(\d+)-label"[^>]*>([^<]*)<tspan\b([^>]*)>([^<]*)<\/tspan><\/text>/g

const attr = (attributes: string, name: string): number => Number(new RegExp(`\\b${name}="([^"]+)"`).exec(attributes)?.[1])

describe('FR-002 -- plan dates at the name size x S-325', () => {
  it('FR-002 still says: 名前の字の大きさに ... S-325 を掛けた大きさで描く / それぞれの大きさで測った和', () => {
    expect(REQUIREMENTS).toContain(FR_002_SIZE)
    expect(REQUIREMENTS).toContain(FR_002_SUM)
  })

  it('FR-002: 予定日の文字（その前に置く半角空白を含む）は ... S-325 を掛けた大きさで描く -- the drawn tspan', () => {
    // see FR-002, S-325
    const built = bench(documentOf([{ name: 'Alpha', start: '2026-04-06', finish: '2026-04-24' }], { planDatesVisible: true }))
    const drawn = [...built.svg().matchAll(LABEL_TEXT)]
    expect(drawn.length, 'premise: the label is drawn as the name followed by one smaller part').toBe(1)
    const [, nameAttributes, , nameText, datesAttributes, datesText] = drawn[0] as RegExpMatchArray
    const nameSize = attr(nameAttributes ?? '', 'font-size')
    const datesSize = attr(datesAttributes ?? '', 'font-size')
    expect(nameText).toBe('Alpha')
    expect(datesText, 'FR-002: the half-width space goes with the dates').toBe(' 4/6 - 4/24')
    expect(datesSize).toBeCloseTo(nameSize * S_325, 1)
  })

  it('FR-002: 名前の部分と予定日の部分をそれぞれの大きさで測った和 -- the width T-273 and OC-1 read', () => {
    // see FR-002, LC-5, OC-1
    const document = documentOf([{ name: 'Alpha', start: '2026-04-06', finish: '2026-04-24' }], { planDatesVisible: true })
    const shown = placementOf(bench(document).loop, 1)
    const font = shown.labelFontSize
    expect(shown.labelTextWidth).toBeCloseTo(lc5('Alpha', font) + lc5(' 4/6 - 4/24', font * S_325), 3)
  })

  it('FR-002 / OC-1: switching S-232 on widens the occupied width by the dates part measured at x S-325', () => {
    // see OC-1, FR-002
    // WHY: a one-day bar, so the name stands outside the shape with and without the dates.
    const seeds = [{ name: 'Alpha', start: '2026-04-06', finish: '2026-04-06' }]
    const hidden = placementOf(bench(documentOf(seeds, { planDatesVisible: false })).loop, 1)
    const shown = placementOf(bench(documentOf(seeds, { planDatesVisible: true })).loop, 1)
    expect([hidden.labelPlacement, shown.labelPlacement], 'premise: the label stands outside the shape').toEqual(['right', 'right'])
    const grown = shown.occupiedX1 - shown.occupiedX0 - (hidden.occupiedX1 - hidden.occupiedX0)
    expect(grown).toBeCloseTo(lc5(' 4/6 - 4/6', shown.labelFontSize * S_325), 3)
  })
})


const FR_013_COLOURS =
  'ただし遅れ（表 T-021 の `PM-4`）のマーカーは、地を `_assets/tbl-settings.md` の 表 T-236 の `S-326`、記号を同表の `S-327` で塗ること（MUST）'
const FR_013_BAR = '遅れの記号 `(!)` の縦棒の太さは、`S-24` に 表 T-206 の `S-328` を掛けた値とすること（MUST）'
const FR_013_PARTS = '縦棒の下端・点の中心・点の半径は、同表の `S-329` ・ `S-330` ・ `S-331` とすること（MUST）'

interface DelayMark {
  readonly svg: string
  readonly centre: { x: number; y: number }
  readonly radius: number
}

function delayMark(): DelayMark {
  // WHY: a task that should have finished before the status date and has no actual start is late (PM-4).
  const document = documentOf(
    [{ name: 'Alpha', start: '2026-04-06', finish: '2026-04-24' }],
    { progressMarkerVisible: true, themePreference: 'light' },
  )
  document.schedule.project.statusDate = '2026-05-08'
  const built = bench(document)
  const marker = built.loop.current()?.geometry.tasks.find((one) => one.taskUid === 1)?.marker
  expect(marker?.symbol, 'premise: the late task carries PM-4').toBe('PM-4')
  const svg = [...built.svg().matchAll(/<[^>]*data-figure="task-1-marker[^"]*"[^>]*>(?:[\s\S]*?<\/g>)?/g)]
    .map((one) => one[0])
    .join('\n')
  const group = /<g\b[^>]*data-figure="task-1-marker"[^>]*>[\s\S]*?<\/g>/.exec(built.svg())?.[0]
  return { svg: group ?? svg, centre: marker?.centre as { x: number; y: number }, radius: marker?.radius as number }
}

const shapesIn = (svg: string): string[] => [...svg.matchAll(/<(circle|line|path|rect|polygon)\b[^>]*>/g)].map((one) => one[0])
const paintOf = (shape: string, name: 'fill' | 'stroke'): string =>
  (new RegExp(`\\b${name}="([^"]+)"`).exec(shape)?.[1] ?? '').toLowerCase()

describe('FR-013 -- the delay mark', () => {
  it('FR-013 still says: 地を S-326、記号を S-327 / S-24 に S-328 を掛けた値 / S-329 ・ S-330 ・ S-331', () => {
    expect(REQUIREMENTS).toContain(FR_013_COLOURS)
    expect(REQUIREMENTS).toContain(FR_013_BAR)
    expect(REQUIREMENTS).toContain(FR_013_PARTS)
  })

  it('FR-013: 地を S-326 で塗る -- the ground of the PM-4 mark is S-326 (light theme)', () => {
    // see FR-013, S-326
    const { svg } = delayMark()
    const grounds = shapesIn(svg).filter((one) => one.startsWith('<circle') && paintOf(one, 'fill') === S_326_LIGHT)
    expect(grounds.length, `the drawn mark: ${svg}`).toBeGreaterThanOrEqual(1)
  })

  it('FR-013: 記号を同表の S-327 で塗る -- the (!) glyph is painted S-327', () => {
    // see FR-013, S-327
    const { svg } = delayMark()
    const glyph = shapesIn(svg).filter(
      (one) => !(one.startsWith('<circle') && paintOf(one, 'fill') === S_326_LIGHT) &&
        (paintOf(one, 'fill') === S_327_LIGHT || paintOf(one, 'stroke') === S_327_LIGHT),
    )
    expect(glyph.length, `the bar and the dot of (!): ${svg}`).toBeGreaterThanOrEqual(2)
  })

  it('FR-013: 縦棒の太さは S-24 に S-328 を掛けた値 -- the bar width', () => {
    // see FR-013, S-24, S-328
    const { svg } = delayMark()
    const bar = shapesIn(svg).find((one) => /^<(line|path)/.test(one) && paintOf(one, 'stroke') === S_327_LIGHT)
    expect(bar, `a stroked bar in ${svg}`).toBeDefined()
    // WHY: the ring is S-24 as drawn (the whole mark is scaled together, FR-094), so the bar is read against it.
    const ring = shapesIn(svg).find((one) => one.startsWith('<circle') && paintOf(one, 'fill') === S_326_LIGHT) ?? ''
    const ringWidth = attr(ring, 'stroke-width')
    expect(ringWidth, 'premise: the ring of the mark is stroked (S-24)').toBeGreaterThan(0)
    expect(attr(bar ?? '', 'stroke-width') / ringWidth).toBeCloseTo(S_328, 1)
    expect(S_24, 'premise: S-24 is the ring the bar multiplies').toBeGreaterThan(0)
  })

  it('FR-013: 縦棒の下端・点の中心・点の半径は S-329 ・ S-330 ・ S-331 (a gap between bar and dot)', () => {
    // see S-329, S-330, S-331
    // TRAP: S-329 / S-330 measure against the half height of the symbol, which no row sizes;
    // so both are checked against ONE common half height, and S-331 against the radius it names.
    const { svg, centre, radius } = delayMark()
    const shapes = shapesIn(svg)
    const bar = shapes.find((one) => /^<(line|path)/.test(one) && paintOf(one, 'stroke') === S_327_LIGHT) ?? ''
    const dot = shapes.find((one) => one.startsWith('<circle') && paintOf(one, 'fill') === S_327_LIGHT) ?? ''
    const ys = bar.startsWith('<line')
      ? [attr(bar, 'y1'), attr(bar, 'y2')]
      : [...(/\bd="([^"]+)"/.exec(bar)?.[1] ?? '').matchAll(/-?\d+(?:\.\d+)?/g)].map((one) => Number(one[0])).filter((_v, i) => i % 2 === 1)
    const barBottom = Math.max(...ys)
    const halfHeight = (barBottom - centre.y) / S_329
    expect(halfHeight, 'S-329: the bar ends below the centre').toBeGreaterThan(0)
    expect(halfHeight, 'the half height of the symbol stays inside the mark').toBeLessThanOrEqual(radius + 0.05)
    expect((attr(dot, 'cy') - centre.y) / halfHeight, 'S-330 against the same half height as S-329').toBeCloseTo(S_330, 1)
    expect(attr(dot, 'r'), 'S-331: dot radius').toBeCloseTo(S_331 * radius, 1)
    expect(attr(dot, 'cy') - attr(dot, 'r'), 'a gap between the bar and the dot').toBeGreaterThan(barBottom)
  })
})


const FD_5_PER_END = '矢羽根では、開始側の切り込みの深さを `fadeIn` に、終了側の先端の深さを `fadeOut` に、端ごとに置き換えること（MUST）'
const FD_5_MUST_NOT = '一方の端のフェード長で、もう一方の端の形を変えてはならない（MUST NOT）'
const FD_5_ZERO_END = 'フェード長が 0 の端は、フェードの無い矢羽根と同じ深さのままとする'

interface Ends {
  readonly startNotch: number
  readonly endTip: number
  readonly fadeInPx: number
  readonly fadeOutPx: number
}

function chevronEnds(fadeInDays: number | null, fadeOutDays: number | null): Ends {
  const document = documentOf([
    { name: 'Alpha', start: '2026-04-06', finish: '2026-05-29', part: { fadeInDays, fadeOutDays } },
  ])
  document.schedule.taskVisuals = [
    { taskUid: 1, shapeKind: 'chevron', milestoneGlyph: null, fillColor: null, strokeColor: null, lineWeight: null },
  ]
  const built = bench(document)
  const plan = built.loop.current()?.geometry.tasks.find((one) => one.taskUid === 1)?.plan as
    | { form: string; points: readonly { x: number; y: number }[] }
    | undefined
  expect(plan?.form, 'premise: the chevron is an outline').toBe('outline')
  const points = plan?.points ?? []
  const ys = points.map((one) => one.y)
  const mid = (Math.min(...ys) + Math.max(...ys)) / 2
  const onMid = points.filter((one) => Math.abs(one.y - mid) < 0.01).map((one) => one.x)
  const offMid = points.filter((one) => Math.abs(one.y - mid) >= 0.01).map((one) => one.x)
  const tip = Math.max(...onMid)
  const notch = Math.min(...onMid)
  const placement = placementOf(built.loop, 1)
  return {
    startNotch: notch - Math.min(...offMid),
    endTip: tip - Math.max(...offMid),
    fadeInPx: placement.fadeInPx,
    fadeOutPx: placement.fadeOutPx,
  }
}

describe('FD-5 (table T-012a) -- the chevron ends', () => {
  it('FD-5 still says: 端ごとに置き換える / もう一方の端の形を変えてはならない / 0 の端は ... 同じ深さ', () => {
    expect(REQUIREMENTS).toContain(FD_5_PER_END)
    expect(REQUIREMENTS).toContain(FD_5_MUST_NOT)
    expect(REQUIREMENTS).toContain(FD_5_ZERO_END)
  })

  it('FD-5: 開始側の切り込みの深さを fadeIn に -- and the end tip keeps the plain depth', () => {
    // see FD-5
    const plain = chevronEnds(null, null)
    const faded = chevronEnds(4, null)
    expect(faded.fadeInPx, 'premise: the fade is wider than the plain notch').not.toBeCloseTo(plain.startNotch, 1)
    expect(faded.startNotch).toBeCloseTo(faded.fadeInPx, 2)
    expect(faded.endTip, `${FD_5_MUST_NOT} / ${FD_5_ZERO_END}`).toBeCloseTo(plain.endTip, 2)
  })

  it('FD-5: 終了側の先端の深さを fadeOut に -- and the start notch keeps the plain depth', () => {
    // see FD-5
    const plain = chevronEnds(null, null)
    const faded = chevronEnds(null, 4)
    expect(faded.endTip).toBeCloseTo(faded.fadeOutPx, 2)
    expect(faded.startNotch, `${FD_5_MUST_NOT} / ${FD_5_ZERO_END}`).toBeCloseTo(plain.startNotch, 2)
  })

  it('FD-5: 2 つの端は別々 -- both fades set, each end takes its own length', () => {
    // see FD-5
    const faded = chevronEnds(2, 6)
    expect(faded.startNotch).toBeCloseTo(faded.fadeInPx, 2)
    expect(faded.endTip).toBeCloseTo(faded.fadeOutPx, 2)
  })
})


describe('S-63 -- progressMarkerVisible defaults to false', () => {
  it('S-63: 既定 `false` -- the table, the settings defaults and the startup template agree', () => {
    // see S-63
    const row = rowIn('T-202', 'S-63')
    const key = bare(row.by['キー'] ?? '')
    expect(key).toBe('progressMarkerVisible')
    expect(bare(row.by['既定'] ?? '')).toBe('false')
    expect((SETTINGS_DEFAULTS as unknown as Record<string, unknown>)[key]).toBe(false)
    const template = JSON.parse(
      readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
    ) as { documentSettings: Record<string, unknown> }
    expect(template.documentSettings[key]).toBe(false)
  })
})


const T_297_DROP_FIRST = 'スキーマを走らせる前に、表 T-297 の列を捨てて読むこと（MUST）'
const T_297_SILENT = '捨てた列を通知してはならず、書き戻してもならない（MUST NOT）'

const RETIRED: readonly { readonly entity: string; readonly column: string }[] = specTable('T-297').rows.map((row) => ({
  entity: bare(row.cells[0] ?? ''),
  column: bare(row.cells[1] ?? ''),
}))

function oldDocumentText(): string {
  const document = documentOf([{ name: 'Alpha', start: '2026-04-06', finish: '2026-04-24' }])
  const visual: Record<string, unknown> = {
    taskUid: 1,
    shapeKind: 'rectangle',
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
  }
  // WHY: the two values a saved document used to carry; any value is dropped before the schema runs.
  for (const one of RETIRED) visual[one.column] = one.column === 'nameAnchor' ? 'middleRight' : 'start'
  document.schedule.taskVisuals = [visual]
  return JSON.stringify(document)
}

describe('T-297 -- retired columns are dropped when read', () => {
  it('T-297 still says: スキーマを走らせる前に ... 捨てて読む / 通知してはならず、書き戻してもならない', () => {
    expect(DESIGN).toContain(T_297_DROP_FIRST)
    expect(DESIGN).toContain(T_297_SILENT)
    expect(RETIRED).toEqual([
      { entity: 'TaskVisual', column: 'nameAnchor' },
      { entity: 'TaskVisual', column: 'nameAlign' },
    ])
  })

  it('RK-1 / RK-2: a document with nameAnchor / nameAlign opens without error and without a notice', () => {
    // see T-297, RK-1, RK-2
    const decoded = documentFromJson(oldDocumentText())
    expect(decoded.ok, JSON.stringify(decoded.ok ? '' : decoded.faults)).toBe(true)
    if (!decoded.ok) return
    for (const one of RETIRED) {
      expect(decoded.unreadColumns.join(' '), `${T_297_SILENT}: ${one.column}`).not.toContain(one.column)
    }
    const visual = decoded.document.schedule.taskVisuals[0] as unknown as Record<string, unknown>
    for (const one of RETIRED) expect(Object.keys(visual)).not.toContain(one.column)
  })

  it('RK-1 / RK-2: opening it raises no notice on the screen', () => {
    // see T-297
    const decoded = documentFromJson(oldDocumentText())
    if (!decoded.ok) throw new Error('premise: the document opens')
    const built = bench(decoded.document as unknown as Record<string, unknown>)
    expect(built.view().notices, T_297_SILENT).toEqual([])
  })

  it('RK-1 / RK-2: 書き戻してもならない -- saving does not write them back', () => {
    // see T-297
    const decoded = documentFromJson(oldDocumentText())
    if (!decoded.ok) throw new Error('premise: the document opens')
    const written = jsonFromDocument(decoded.document)
    for (const one of RETIRED) expect(written, T_297_SILENT).not.toContain(`"${one.column}"`)
  })
})
