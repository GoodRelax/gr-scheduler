// Branches of the screen picture that docs/spec decides, read off the SVG string alone.

import { describe, expect, it } from 'vitest'

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { cellOf, day, notStored, RATIO, SCREEN, scheduleOf, stored, taskOf } from './cr-430-cross-section-scene'

const EPS = 1e-6
const ROUNDING = 0.01

const settingsOf = (over: Readonly<Record<string, unknown>> = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  const flat = { ...SETTINGS_DEFAULTS, zoomX: 8, scrollDate: day(1), stackDirection: 'down', ...over }
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    out[head] = { ...((out[head] as Record<string, unknown> | undefined) ?? {}), [key.slice(dot + 1)]: value }
  }
  return out as unknown as DocumentSettings
}

interface DrawWish {
  readonly settings?: Readonly<Record<string, unknown>>
  readonly selected?: ItemRef | null
  readonly rowArea?: Partial<ScreenRegions['rowArea']>
  readonly watermark?: { readonly openedBy: string; readonly stampedAt: string } | null
}

interface Drawn {
  readonly svg: string
  readonly regions: ScreenRegions
}

const drawOf = (schedule: Schedule, wish: DrawWish = {}): Drawn => {
  const settings = settingsOf(wish.settings)
  const screen = regionsFromScreen(SCREEN, settings)
  const regions: ScreenRegions =
    wish.rowArea === undefined ? screen : { ...screen, rowArea: { ...screen.rowArea, ...wish.rowArea } }
  const selection: Selection =
    wish.selected == null ? emptySelection() : selectionWith(emptySelection(), wish.selected)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, selection)
  const svg = svgFromSchedule(
    schedule, settings, layout, geometry, regions, selection, 'screen',
    null, [], null, null, null, (wish.watermark ?? null) as never,
  )
  return { svg, regions }
}

interface Element {
  readonly tag: string
  readonly attrs: string
  readonly index: number
  readonly zo: string | null
  readonly clips: readonly string[]
  readonly masks: readonly string[]
  readonly text: string
}

const attrOf = (attrs: string, name: string): string | null => {
  const hit = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  return hit === null ? null : (hit[1] ?? null)
}

const numOf = (attrs: string, name: string): number => {
  const raw = attrOf(attrs, name)
  if (raw === null) throw new Error(`no ${name} in ${attrs}`)
  return Number.parseFloat(raw)
}

const idOf = (url: string | null): string | null => {
  if (url === null) return null
  const hit = /url\(#([^)]+)\)/.exec(url)
  return hit === null ? null : (hit[1] ?? null)
}

const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const stack: { tag: string; attrs: string }[] = []
  const scan = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g
  let hit = scan.exec(svg)
  while (hit !== null) {
    const [, closing, tag = '', attrs = '', selfClosing] = hit
    if (closing === '/') {
      stack.pop()
    } else {
      const chain = [...stack, { tag, attrs }]
      const zoHolder = [...chain].reverse().find((one) => attrOf(one.attrs, 'data-zo') !== null)
      const inDefs = stack.some((one) => ['defs', 'mask', 'clipPath', 'marker'].includes(one.tag))
      const after = svg.slice(scan.lastIndex)
      const text = tag === 'text' && selfClosing !== '/' ? after.slice(0, Math.max(0, after.indexOf('</text>'))) : ''
      out.push({
        tag,
        attrs,
        index: out.length,
        zo: inDefs || zoHolder === undefined ? null : attrOf(zoHolder.attrs, 'data-zo'),
        clips: chain.map((one) => idOf(attrOf(one.attrs, 'clip-path'))).filter((one): one is string => one !== null),
        masks: chain.map((one) => idOf(attrOf(one.attrs, 'mask'))).filter((one): one is string => one !== null),
        text,
      })
      if (selfClosing !== '/') stack.push({ tag, attrs })
    }
    hit = scan.exec(svg)
  }
  return out
}

const figureOf = (element: Element): string => attrOf(element.attrs, 'data-figure') ?? ''

const painted = (elements: readonly Element[]): readonly Element[] =>
  elements.filter((one) => one.zo !== null && one.tag !== 'g')

interface Box {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

const pairsOf = (raw: string): (readonly [number, number])[] => {
  const numbers = (raw.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  const out: (readonly [number, number])[] = []
  for (let at = 0; at + 1 < numbers.length; at += 2) out.push([numbers[at] as number, numbers[at + 1] as number])
  return out
}

const boxOf = (element: Element): Box => {
  const { tag, attrs } = element
  if (tag === 'rect') {
    const x = numOf(attrs, 'x')
    const y = numOf(attrs, 'y')
    return { x0: x, y0: y, x1: x + numOf(attrs, 'width'), y1: y + numOf(attrs, 'height') }
  }
  if (tag === 'line') {
    const xs = [numOf(attrs, 'x1'), numOf(attrs, 'x2')]
    const ys = [numOf(attrs, 'y1'), numOf(attrs, 'y2')]
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
  }
  if (tag === 'circle') {
    const r = numOf(attrs, 'r')
    return { x0: numOf(attrs, 'cx') - r, y0: numOf(attrs, 'cy') - r, x1: numOf(attrs, 'cx') + r, y1: numOf(attrs, 'cy') + r }
  }
  if (tag === 'text') {
    const y = numOf(attrs, 'y')
    return { x0: numOf(attrs, 'x'), y0: y, x1: numOf(attrs, 'x'), y1: y }
  }
  const points = pairsOf(attrOf(attrs, 'points') ?? attrOf(attrs, 'd') ?? '')
  if (points.length === 0) throw new Error(`no geometry in <${tag} ${attrs}>`)
  return {
    x0: Math.min(...points.map((one) => one[0])),
    y0: Math.min(...points.map((one) => one[1])),
    x1: Math.max(...points.map((one) => one[0])),
    y1: Math.max(...points.map((one) => one[1])),
  }
}

const unionOf = (boxes: readonly Box[]): Box => ({
  x0: Math.min(...boxes.map((one) => one.x0)),
  y0: Math.min(...boxes.map((one) => one.y0)),
  x1: Math.max(...boxes.map((one) => one.x1)),
  y1: Math.max(...boxes.map((one) => one.y1)),
})

const clipRectOf = (svg: string, id: string): Box => {
  const at = svg.indexOf(`<clipPath id="${id}"`)
  if (at < 0) throw new Error(`no clipPath ${id}`)
  const body = svg.slice(at, svg.indexOf('</clipPath>', at))
  const rect = elementsOf(body).find((one) => one.tag === 'rect')
  if (rect === undefined) throw new Error(`clipPath ${id} holds no rect`)
  return boxOf(rect)
}

const maskHolesOf = (svg: string, id: string): readonly Box[] => {
  const at = svg.indexOf(`<mask id="${id}"`)
  if (at < 0) throw new Error(`no mask ${id}`)
  const body = svg.slice(at, svg.indexOf('</mask>', at))
  return elementsOf(body)
    .filter((one) => one.tag === 'rect' && attrOf(one.attrs, 'fill') === 'black')
    .map(boxOf)
}

const rgbOf = (colour: string): readonly [number, number, number] => {
  const text = colour.trim().toLowerCase()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(text)
  if (short !== null) return [1, 2, 3].map((at) => Number.parseInt(`${short[at]}${short[at]}`, 16)) as never
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(text)
  if (long !== null) return [1, 2, 3].map((at) => Number.parseInt(long[at] as string, 16)) as never
  const rgb = /^rgb\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*\)$/.exec(text)
  if (rgb !== null) return [1, 2, 3].map((at) => Number(rgb[at])) as never
  const hsl = /^hsl\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/.exec(text)
  if (hsl !== null) {
    const h = Number(hsl[1])
    const s = Number(hsl[2]) / 100
    const l = Number(hsl[3]) / 100
    const k = (n: number): number => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number): number => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))
    return [f(0), f(8), f(4)]
  }
  throw new Error(`a colour this file cannot read: ${colour}`)
}

const isAchromatic = (colour: string): boolean => {
  const [r, g, b] = rgbOf(colour)
  return r === g && g === b
}

const MS_PER_DAY = 86400000
const dayFrom = (offset: number): string =>
  `${new Date(Date.UTC(2026, 2, 1) + offset * MS_PER_DAY).toISOString().slice(0, 10)}T00:00:00`

const withGroups = (schedule: Schedule, rows: readonly { readonly id: string; readonly taskUids: readonly number[] }[]): Schedule =>
  ({
    ...schedule,
    taskGroups: rows.map((row, order) => ({
      id: row.id,
      parentId: null,
      label: row.id,
      derivedFromTaskUid: null,
      order,
      isCollapsed: false,
      isHidden: false,
      color: null,
      height: null,
    })),
    taskGroupMembers: rows.flatMap((row) => row.taskUids.map((taskUid) => ({ taskUid, groupId: row.id, stackOrder: null }))),
  }) as unknown as Schedule

const GROUND = cellOf('T-236', 'S-146', String.fromCharCode(0x660e, 0x308b, 0x3044, 0x30c6, 0x30fc, 0x30de))
const DEPENDENCY_WIDTH = stored('S-18') * RATIO
const SELECTED_LINE = notStored('S-178')
const HALO = notStored('S-224')
const CORNER_RADIUS = Number(cellOf('T-217', 'S-132', String.fromCharCode(0x65e2, 0x5b9a)))

const dependencyParts = (elements: readonly Element[], figure: string): { halo: Element[]; main: Element[] } => {
  const own = painted(elements).filter((one) => one.zo === 'ZO-4' && figureOf(one) === figure)
  const isHalo = (one: Element): boolean => (attrOf(one.attrs, 'stroke') ?? '').toLowerCase() === GROUND.toLowerCase()
  return { halo: own.filter(isHalo), main: own.filter((one) => !isHalo(one)) }
}

describe('CR-432 -- branches of svgFromSchedule the specification decides', () => {
  it('SL-8, FR-049, EP-12: with S-227 off and S-228 on, a selected Task is framed around its drawn actual', () => {
    const schedule = scheduleOf({
      tasks: [taskOf({ uid: 1, name: 'a', start: day(3), finish: day(9), actualStart: day(4), actualFinish: day(12) })],
    })
    const elements = elementsOf(
      drawOf(schedule, { settings: { planVisible: false, actualVisible: true }, selected: { kind: 'task', uid: 1 } }).svg,
    )
    const actual = painted(elements).filter((one) => figureOf(one) === 'task-1-actual')
    const frame = painted(elements).filter((one) => figureOf(one) === 'task-1-frame')
    expect(actual.length, 'the actual is drawn while S-228 is on').toBeGreaterThan(0)
    expect(frame.length, 'タスク・ハイライトボックス・コメントボックスは、外接矩形に沿った破線の枠で囲むこと（MUST）').toBeGreaterThan(0)
    const inner = unionOf(actual.map(boxOf))
    const outer = unionOf(frame.map(boxOf))
    expect(outer.x0).toBeLessThanOrEqual(inner.x0 + ROUNDING)
    expect(outer.y0).toBeLessThanOrEqual(inner.y0 + ROUNDING)
    expect(outer.x1).toBeGreaterThanOrEqual(inner.x1 - ROUNDING)
    expect(outer.y1).toBeGreaterThanOrEqual(inner.y1 - ROUNDING)
  })

  it('FR-041, S-74: a custom colour (CV-2) on a Task fill and a TaskGroup color is drawn achromatic under monochrome', () => {
    const base = scheduleOf({ tasks: [taskOf({ uid: 1, name: 'a', start: day(3), finish: day(9) })] })
    const schedule = {
      ...base,
      taskVisuals: base.taskVisuals.map((one) => ({ ...one, fillColor: '#cc6633/' })),
      taskGroups: base.taskGroups.map((one) => ({ ...one, color: '#33cc66/' })),
    } as unknown as Schedule
    const fillsOf = (monochrome: boolean): { plan: string; band: string } => {
      const elements = painted(elementsOf(drawOf(schedule, { settings: { themeMonochrome: monochrome } }).svg))
      const fill = (figure: string): string => {
        const found = elements.find((one) => figureOf(one) === figure)
        if (found === undefined) throw new Error(`${figure} was not drawn`)
        return attrOf(found.attrs, 'fill') ?? ''
      }
      return { plan: fill('task-1-plan'), band: fill('row-g1-band') }
    }
    const colour = fillsOf(false)
    expect(isAchromatic(colour.plan), 'the chosen fill reaches the picture in colour').toBe(false)
    expect(isAchromatic(colour.band), 'the chosen row colour reaches the picture in colour').toBe(false)
    const mono = fillsOf(true)
    const why = 'モノクロは描画の段で効くので、人が指定した色も無彩色で描かれる。'
    expect({ fill: mono.plan, achromatic: isAchromatic(mono.plan) }, why).toEqual({ fill: mono.plan, achromatic: true })
    expect({ fill: mono.band, achromatic: isAchromatic(mono.band) }, why).toEqual({ fill: mono.band, achromatic: true })
  })

  it('FR-089, FR-017: 間隔は、いま出ている段（`FR-017` の 表 T-238 の `TM-1` 年 ／ `TM-2` 月 ／ `TM-3` 週 ／ `TM-4` 日）が刷る行のうち、最も細かい行が刷る単位とすること（MUST）', () => {
    const schedule = scheduleOf({ tasks: [taskOf({ uid: 1, name: 'a', start: day(3), finish: day(9) })] })
    const finestRows: string[] = []
    for (const zoomX of [8, 1, 0.25]) {
      const elements = elementsOf(
        drawOf(schedule, { settings: { dateGridLinesVisible: true, scrollDate: day(1), zoomX } }).svg,
      )
      const gridXs = elements.filter((one) => figureOf(one).startsWith('date-grid-')).map((one) => boxOf(one).x0)
      const tickRows = new Map<string, number[]>()
      for (const one of elements) {
        const hit = /^ruler-(.+)-tick-/.exec(figureOf(one))
        if (hit === null) continue
        const row = hit[1] as string
        tickRows.set(row, [...(tickRows.get(row) ?? []), boxOf(one).x0])
      }
      const [finestRow, finest] = [...tickRows.entries()].reduce<[string, number[]]>(
        (most, entry) => (entry[1].length > most[1].length ? entry : most),
        ['', []],
      )
      finestRows.push(finestRow)
      const matches = (x: number, xs: readonly number[]): boolean => xs.some((other) => Math.abs(other - x) <= ROUNDING)
      expect(gridXs.length, `zoomX ${zoomX}: date grid lines are drawn`).toBeGreaterThan(0)
      expect(
        {
          zoomX,
          finestRow,
          gridWithoutTick: gridXs.filter((x) => !matches(x, finest)),
          tickWithoutGrid: finest.filter((x) => !matches(x, gridXs)),
        },
        '1 日あたりの表示幅によらず一定の間隔で引いてはならない（MUST NOT）。',
      ).toEqual({ zoomX, finestRow, gridWithoutTick: [], tickWithoutGrid: [] })
    }
    expect(new Set(finestRows).size, `the finest ruler row changes with the zoom: ${finestRows.join(', ')}`).toBeGreaterThan(1)
  })

  it('FR-020:**`Row Area` の外へ重ねてはならない（MUST NOT）。** -- no watermark when the Row Area has zero width or height', () => {
    const schedule = scheduleOf({ tasks: [taskOf({ uid: 1, name: 'a', start: day(3), finish: day(9) })] })
    const watermark = { openedBy: 'viewer-zq', stampedAt: '2026-01-01T00:00:00Z' }
    const written = (svg: string): number =>
      elementsOf(svg).filter((one) => one.tag === 'text' && one.text.includes(watermark.openedBy)).length
    expect(written(drawOf(schedule, { watermark }).svg), 'the watermark is drawn on a Row Area with room').toBeGreaterThan(0)
    for (const rowArea of [{ width: 0 }, { height: 0 }]) {
      expect({ rowArea, written: written(drawOf(schedule, { watermark, rowArea }).svg) }).toEqual({ rowArea, written: 0 })
    }
  })

  it('FR-019, S-132, AT-122: ハイライトボックスの角の丸みは `_assets/tbl-settings.md` の表 T-217 が持ち、倍率によらず一定に描くこと（MUST）', () => {
    const schedule = scheduleOf({
      tasks: [taskOf({ uid: 1, name: 'a', start: day(3), finish: day(9) })],
      highlightBoxes: [
        {
          id: 'h1',
          startDate: day(2),
          endDate: day(8),
          topGroupId: 'g1',
          bottomGroupId: 'g1',
          strokeColor: '#4527a0/',
          cornerRadiusPx: CORNER_RADIUS,
        },
      ],
    })
    const radiiAt = (zoom: Readonly<Record<string, unknown>>): number[] =>
      painted(elementsOf(drawOf(schedule, { settings: zoom }).svg))
        .filter((one) => one.tag === 'rect' && attrOf(one.attrs, 'rx') !== null && figureOf(one).includes('h1'))
        .flatMap((one) => [numOf(one.attrs, 'rx'), attrOf(one.attrs, 'ry') === null ? numOf(one.attrs, 'rx') : numOf(one.attrs, 'ry')])
    const near = radiiAt({ zoomX: 8, zoomY: 1 })
    const far = radiiAt({ zoomX: 2, zoomY: 2 })
    expect(near.length, 'the highlight box is drawn with a corner radius').toBeGreaterThan(0)
    expect(near).toEqual(near.map(() => CORNER_RADIUS))
    expect(far).toEqual(near)
  })

  it('FR-098, FR-044, ZO-3, ZO-5, OC-2: the pinned row\'s resume icon and label sit in their layers, inside the band, uncut', () => {
    const rows = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6']
    const tasks: Task[] = rows.map((_, at) =>
      at === 0
        ? taskOf({ uid: 1, name: 'pinned', start: day(3), finish: day(15), actualStart: day(3), stop: day(6), resumeValid: false, percentComplete: 30 })
        : taskOf({ uid: at + 1, name: `row ${at + 1}`, start: day(2 + at), finish: day(8 + at) }),
    )
    const schedule = withGroups(
      scheduleOf({ tasks, assignedTaskUids: [1] }),
      rows.map((id, at) => ({ id, taskUids: [at + 1] })),
    )
    const { svg } = drawOf(schedule, {
      settings: {
        pinnedGroupIds: ['g1'],
        scrollGroupId: 'g4',
        assigneeVisible: true,
        percentCompleteVisible: true,
        progressMarkerVisible: true, // see S-63
      },
    })
    const elements = painted(elementsOf(svg))
    const band = elements.find((one) => figureOf(one) === 'row-g1-band')
    if (band === undefined) throw new Error('the pinned row has no ground')
    const bandBox = boxOf(band)
    const resume = elements.filter((one) => figureOf(one) === 'task-1-resume')
    const label = elements.filter((one) => /^task-1-(oc2|assignee|percent)-label$/.test(figureOf(one)))
    expect(resume.length, '中断のあいだは再開アイコンを描くこと（MUST）').toBeGreaterThan(0)
    expect(label.length, 'the assignee and percent card is drawn').toBeGreaterThan(0)
    const checked = [
      ...resume.map((one) => ({ one, layer: 'ZO-3' })),
      ...label.map((one) => ({ one, layer: 'ZO-5' })),
    ]
    for (const { one, layer } of checked) {
      const box = boxOf(one)
      const cutAway = one.clips.filter((id) => {
        const clip = clipRectOf(svg, id)
        return clip.y0 > box.y0 + ROUNDING || clip.y1 < box.y1 - ROUNDING
      })
      expect({
        figure: figureOf(one),
        layer: one.zo,
        inBand: box.y0 >= bandBox.y0 - ROUNDING && box.y1 <= bandBox.y1 + ROUNDING,
        cutAway,
      }, 'ピン止めした行は、スクロールする領域から抜いて画面の上端へ固定すること（MUST）').toEqual({
        figure: figureOf(one),
        layer,
        inBand: true,
        cutAway: [],
      })
    }
  })

  it('FR-009, ZO-4, SL-8, S-178: 依存線と基準日線は、その線自身の太さに 表 T-206 の `S-178` を掛けて太く描くこと（MUST） -- and the selected line comes last', () => {
    const schedule = scheduleOf({
      tasks: [
        taskOf({ uid: 1, name: 'a', start: day(2), finish: day(6) }),
        taskOf({ uid: 2, name: 'b', start: day(8), finish: day(12), dependencies: [{ predecessorUid: 1, linkType: 1 }] }),
        taskOf({ uid: 3, name: 'c', start: day(9), finish: day(14), dependencies: [{ predecessorUid: 1, linkType: 1 }] }),
      ],
    })
    const elements = elementsOf(drawOf(schedule, { selected: { kind: 'dependency', successorUid: 2, ordinal: 0 } }).svg)
    const picked = dependencyParts(elements, 'dep-1-2')
    const other = dependencyParts(elements, 'dep-1-3')
    expect(picked.main.length).toBeGreaterThan(0)
    expect(other.main.length).toBeGreaterThan(0)
    const pickedFirst = Math.min(...[...picked.halo, ...picked.main].map((one) => one.index))
    const otherLast = Math.max(...[...other.halo, ...other.main].map((one) => one.index))
    expect(pickedFirst > otherLast, '⛔ **どちらが手前かは、次の順で決めること（MUST）**').toBe(true)
    const width = (one: Element): number => numOf(one.attrs, 'stroke-width')
    for (const line of picked.main) {
      expect(width(line)).toBeCloseTo(width(other.main[0] as Element) * SELECTED_LINE, 2)
      expect(width(line)).toBeCloseTo(DEPENDENCY_WIDTH * SELECTED_LINE, 1)
    }
  })

  it('FR-009, S-224: ⛔ **手当ては、手前の線に地の色（`S-146`）の縁を敷くこととする（MUST）** -- unbroken across the screen when both Tasks are far off it', () => {
    const schedule = scheduleOf({
      tasks: [
        taskOf({ uid: 1, name: 'a', start: dayFrom(-320), finish: dayFrom(-300) }),
        taskOf({ uid: 2, name: 'b', start: dayFrom(400), finish: dayFrom(420), dependencies: [{ predecessorUid: 1, linkType: 1 }] }),
      ],
    })
    const { svg, regions } = drawOf(schedule)
    const elements = elementsOf(svg)
    const { halo, main } = dependencyParts(elements, 'dep-1-2')
    expect(main.length, '⭐ **本線は敷かない区間でも描く**').toBeGreaterThan(0)
    expect(halo.length).toBeGreaterThan(0)
    const left = regions.rowArea.x
    const right = regions.rowArea.x + regions.rowArea.width
    for (const one of [...halo, ...main]) {
      const box = boxOf(one)
      expect({ figure: figureOf(one), crosses: box.x0 <= left + EPS && box.x1 >= right - EPS }).toEqual({
        figure: figureOf(one),
        crosses: true,
      })
    }
    for (const one of halo) {
      expect(numOf(one.attrs, 'stroke-width')).toBeCloseTo(numOf((main[0] as Element).attrs, 'stroke-width') * HALO, 2)
      const half = numOf(one.attrs, 'stroke-width') / 2
      const points = pairsOf(attrOf(one.attrs, 'points') ?? attrOf(one.attrs, 'd') ?? '')
      const holes = one.masks.flatMap((id) => maskHolesOf(svg, id))
      const breaks = points.slice(1).flatMap((to, at) => {
        const from = points[at] as readonly [number, number]
        const seg = {
          x0: Math.max(left, Math.min(from[0], to[0]) - half),
          x1: Math.min(right, Math.max(from[0], to[0]) + half),
          y0: Math.min(from[1], to[1]) - half,
          y1: Math.max(from[1], to[1]) + half,
        }
        if (seg.x1 <= seg.x0) return []
        return holes.filter((hole) => hole.x0 < seg.x1 && hole.x1 > seg.x0 && hole.y0 < seg.y1 && hole.y1 > seg.y0)
      })
      expect(breaks, '⛔ **バーに重なる区間では、縁を敷いてはならない（MUST NOT）**').toEqual([])
    }
  })
})
