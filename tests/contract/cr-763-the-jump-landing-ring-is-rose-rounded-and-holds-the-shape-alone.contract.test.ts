// CR-763 spec-only cases: the jump landing ring of T-332 SJ-10 (1), its ZO-8 layer, its monochrome double line and RW-13.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { jumpLandingRingOf, svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection, selectionWith, type Selection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable, unbroken } from './spec-table'

const rowCells = (table: string, id: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' | ')
}

const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[column]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no column ${column}`)
  return cell
}

const numberIn = (cell: string): number => {
  const found = cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/)
  if (found === null) throw new Error(`no number in ${cell}`)
  return Number(found[0])
}

const flat = (text: string): string => text.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const SETTINGS_MD = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-settings.md'), 'utf8'))
const PUBLISHED = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-published-entries.md'), 'utf8'))

const SJ_10_RING =
  '① 囲み —— 予定の形（タスクは描いた予定の図形で実績を含めず、コメントボックスは箱）の外接矩形から、線の内側の縁まで `_assets/tbl-settings.md` の `S-555` だけ空けて、表 T-236 の `S-585` の色で描く、太さ `S-556`、角の丸み `S-586` の実線の矩形。'
const SJ_10_TOUCHES = '⭐ 既定の `S-555`（0）では囲みの線は形に接し'
const SJ_10_ABOVE_RING = '選択の枠と掴み点は囲みより手前の層（`FR-110` の 表 T-020 の `ZO-10`）に描くので、囲みに隠れない。'
const SJ_10_NO_MARKER =
  '⛔ 進捗マーカー（表 T-273 の「マーカーの位置」）・担当と進捗の札・名称ラベルを囲んではならない（MUST NOT）'
const SJ_10_NO_HUE = '⭐ 色をテーマの色相に追随させないのは、追随すると実績バー（`S-157`）と同じ色相・ほぼ同じ明度になり、囲みが実績に溶けるからである'
const SJ_10_MONO =
  '⭐ モノクロ（`FR-041`）では、色は表 T-236 のほかの行と同じく灰にし、線を太さ `S-556` の中で 2 本に分ける（3 等分の外と内を描き、中を空ける —— 既定の 3px なら 1px の線 ＋ 1px の隙間 ＋ 1px の線）'
const SJ_10_RIPPLE =
  '② 波紋 —— 印を付けた時から、囲みと同じ色・太さ・角の丸みの矩形を、`S-558` の長さのあいだに囲みの所から各辺 `S-559` だけ外へ広げながら、不透明から透明へ消す。'
const SJ_10_Z = '日程表の前後（`FR-110` の 表 T-020）では `ZO-8` に在る —— 進捗マーカーと札より奥である。'
const ZO_8_RING = '飛んだ先の印の囲み（`FR-151` の 表 T-332 の `SJ-10`、関係するタスクの囲み `RW-13` も）'
const ZO_8_WHY = '⭐ 飛んだ先の囲みを進捗マーカー（`ZO-3`）と札（`ZO-5`）より奥に置くのは、形のすぐ外に立つマーカーと札を囲みの線が横切らないためである'
const ZO_10_FRAME = '選択の枠・フェードの掴み点（選んでいるタスクにだけ出す。'
const S_555_INNER = '⭐ 線の中心ではなく内側の縁までを測る —— 線は形の外 `S-555` 〜 `S-555` ＋ `S-556` に在る'
const S_586_MIDDLE = '飛んだ先の囲みの角の丸み —— 線の中心で測る半径。'
const S_586_EDGES = '線の外の縁の半径は `S-586` ＋ `S-556` の半分、内の縁は `S-586` − `S-556` の半分（0 を下回れば直角）'
const S_585_WHAT = '飛んだ先の囲みと波紋の色。'
const S_585_NO_THEME = '⛔ テーマ色に追随させない'
const RW_13_RING =
  '`SJ-10` の ① の囲みと同じ形の印を `_assets/tbl-settings.md` の 表 T-236 の `S-573` の色で描く —— 波紋は出さない。'
const RW_13_UNDRAWN = '描かれていないタスク（スケジュールフィルタの 表 T-353 の `TV-3` を含む）の印は描かない'
const FR_041_EVERY_ROW = '同書の 表 T-236 のすべての行を（色相の欄が ○ の行も — の行も）'
const T_294_KEEP_LIGHTNESS = 'モノクロは、その値を HSL の明度を保ったまま彩度 0 にして測った'
const PI_19_RING = '飛んだ先の印の囲みの箱と線の太さと角の丸み（表 T-332 の `SJ-10`、`S-555` ・ `S-556` ・ `S-586`）。'

const T206 = (id: string): number => numberIn(cellOf('T-206', id, '既定'))
const S_555 = T206('S-555')
const S_556 = T206('S-556')
const S_586 = T206('S-586')

const HUE_COLUMN = '色相追随'
const LIGHT = '明るいテーマ'
const DARK = '暗いテーマ'
const HUE_FIXED = '—'

describe('CR-763 -- the manuscript these cases are driven by', () => {
  it.each([
    ['T-332 SJ-10 (1) the ring', rowCells('T-332', 'SJ-10'), SJ_10_RING],
    ['T-332 SJ-10 (1) S-555 0 touches the shape', rowCells('T-332', 'SJ-10'), SJ_10_TOUCHES],
    ['T-332 SJ-10 (1) ZO-10 above the ring', rowCells('T-332', 'SJ-10'), SJ_10_ABOVE_RING],
    ['T-332 SJ-10 (1) MUST NOT circle markers and labels', rowCells('T-332', 'SJ-10'), SJ_10_NO_MARKER],
    ['T-332 SJ-10 (1) no theme hue', rowCells('T-332', 'SJ-10'), SJ_10_NO_HUE],
    ['T-332 SJ-10 (1) monochrome', rowCells('T-332', 'SJ-10'), SJ_10_MONO],
    ['T-332 SJ-10 (2) the ripple', rowCells('T-332', 'SJ-10'), SJ_10_RIPPLE],
    ['T-332 SJ-10 ZO-8', rowCells('T-332', 'SJ-10'), SJ_10_Z],
    ['T-020 ZO-8 (the ring)', rowCells('T-020', 'ZO-8'), ZO_8_RING],
    ['T-020 ZO-8 (why behind ZO-3 / ZO-5)', rowCells('T-020', 'ZO-8'), ZO_8_WHY],
    ['T-020 ZO-10', rowCells('T-020', 'ZO-10'), ZO_10_FRAME],
    ['T-206 S-555', rowCells('T-206', 'S-555'), S_555_INNER],
    ['T-206 S-586 (middle)', rowCells('T-206', 'S-586'), S_586_MIDDLE],
    ['T-206 S-586 (edges)', rowCells('T-206', 'S-586'), S_586_EDGES],
    ['T-236 S-585 (what)', rowCells('T-236', 'S-585'), S_585_WHAT],
    ['T-236 S-585 (no theme)', rowCells('T-236', 'S-585'), S_585_NO_THEME],
    ['T-346 RW-13 (ring)', rowCells('T-346', 'RW-13'), RW_13_RING],
    ['T-346 RW-13 (undrawn)', rowCells('T-346', 'RW-13'), RW_13_UNDRAWN],
  ] as const)('%s still says it', (_name, cell, clause) => {
    expect(flat(cell), clause).toContain(flat(clause))
  })

  it('FR-041, the T-294 preamble and PI-19 still say it', () => {
    expect(REQUIREMENTS, FR_041_EVERY_ROW).toContain(FR_041_EVERY_ROW)
    expect(SETTINGS_MD, T_294_KEEP_LIGHTNESS).toContain(T_294_KEEP_LIGHTNESS)
    expect(PUBLISHED, PI_19_RING).toContain(PI_19_RING)
  })

  it('the values: S-555 is not negative, S-556 is positive and S-586 is not negative; S-585 and S-573 follow no theme hue', () => {
    expect(S_555).toBeGreaterThanOrEqual(0)
    expect(S_556).toBeGreaterThan(0)
    expect(S_586).toBeGreaterThanOrEqual(0)
    expect(cellOf('T-236', 'S-585', HUE_COLUMN).trim()).toBe(HUE_FIXED)
    expect(cellOf('T-236', 'S-573', HUE_COLUMN).trim()).toBe(HUE_FIXED)
  })
})

type Theme = 'light' | 'dark'
type Rgb = readonly [number, number, number]
const CHANNEL_MAX = 255
const PERCENT = 100
const CHANNEL_TOLERANCE = 1

function rgbOfHsl(hue: number, saturationPercent: number, lightnessPercent: number): Rgb {
  const s = saturationPercent / PERCENT
  const l = lightnessPercent / PERCENT
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number): number => {
    const k = (n + hue / 30) % 12
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * CHANNEL_MAX
  }
  return [channel(0), channel(8), channel(4)]
}

function rgbOf(text: string): Rgb {
  const value = text.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value)
  if (hex !== null) {
    const digits = hex[1] ?? ''
    const wide = digits.length === 3 ? digits.replace(/./g, (one) => one + one) : digits
    const n = Number.parseInt(wide, 16)
    return [(n >> 16) & CHANNEL_MAX, (n >> 8) & CHANNEL_MAX, n & CHANNEL_MAX]
  }
  const hsl = /^hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,/]\s*([\d.]+)\s*)?\)$/.exec(value)
  if (hsl !== null) return rgbOfHsl(((Number(hsl[1]) % 360) + 360) % 360, Number(hsl[2]), Number(hsl[3]))
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/.exec(value)
  if (rgb !== null) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  throw new Error(`not a color this test can read: ${JSON.stringify(text)}`)
}

const sameRgb = (left: Rgb, right: Rgb): boolean => left.every((value, at) => Math.abs(value - (right[at] ?? Number.NaN)) <= CHANNEL_TOLERANCE)
const isGray = (rgb: Rgb): boolean => Math.abs(rgb[0] - rgb[1]) <= CHANNEL_TOLERANCE && Math.abs(rgb[1] - rgb[2]) <= CHANNEL_TOLERANCE
const lightnessOf = (rgb: Rgb): number => ((Math.max(...rgb) + Math.min(...rgb)) / 2 / CHANNEL_MAX) * PERCENT
// see T-294
const grayOf = (rgb: Rgb): Rgb => rgbOfHsl(0, 0, lightnessOf(rgb))

// see S-585, S-573, S-151
const t236 = (id: string, theme: Theme): string => bare(cellOf('T-236', id, theme === 'light' ? LIGHT : DARK))
const S_585 = (theme: Theme): Rgb => rgbOf(t236('S-585', theme))
const S_573 = (theme: Theme): Rgb => rgbOf(t236('S-573', theme))
const S_151 = (theme: Theme, hue: number): Rgb => rgbOf(t236('S-151', theme).replace(/\bH\b/g, String(hue)))

type Loose = Record<string, any>

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const ENVIRONMENT = { width: 1600, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }
const iso = (day: number): string => new Date(Date.UTC(2026, 1, 2) + day * 86400000).toISOString().slice(0, 10)
const HOME = iso(-7)
const HALF_PIXEL = 0.5

const taskOf = (uid: number, start: number, days: number, extra: Loose = {}): Loose => ({
  uid,
  parentTaskUid: null,
  wbsOrder: null,
  name: `t${uid}`,
  start: iso(start),
  finish: iso(start + days),
  milestone: null,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
  carry: {},
  ...extra,
})

const GROUP_IDS = Array.from({ length: 8 }, (_, at) => `g${String(at)}`)
const TARGET = 4
const RELATED = [3, 5] as const

// WHY: task 4 is finished (actual = plan), so it carries the PM-2 done marker; its name is long, so the name and the
// marker do not fit inside a two-day bar and stand right of it (T-273 LP-2); an assignee with a percent hangs left (OC-2).
const FINISHED: Loose = {
  name: 'A finished task whose name is far too long to fit inside its bar',
  actualStart: iso(30),
  actualFinish: iso(32),
  percentComplete: 100,
}

interface SceneSpec {
  readonly hue?: number
  readonly settings?: Loose
  readonly commentBoxes?: readonly Loose[]
}

const scheduleOf = (spec: SceneSpec): Loose => ({
  project: {
    ...structuredClone(TEMPLATE['schedule'].project),
    calendarUid: null,
    statusDate: null,
    title: null,
    themeHue: spec.hue ?? 214,
  },
  calendars: [],
  resources: [{ ...(TEMPLATE['schedule'].resources[0] as Loose), uid: 1001, name: 'Analyst A' }],
  assignments: [{ ...(TEMPLATE['schedule'].assignments[0] as Loose), uid: 2001, taskUid: TARGET, resourceUid: 1001 }],
  highlightBoxes: [],
  commentBoxes: spec.commentBoxes ?? [],
  tasks: GROUP_IDS.map((_, at) => (at + 1 === TARGET ? taskOf(TARGET, 30, 2, FINISHED) : taskOf(at + 1, 20 + at * 3, 5))),
  taskGroups: GROUP_IDS.map((id, order) => ({
    id,
    parentId: null,
    order,
    minHeight: null,
    label: id,
    derivedFromTaskUid: null,
    treeState: 'auto',
    editGroup: null,
    color: null,
  })),
  taskGroupMembers: GROUP_IDS.map((groupId, at) => ({ groupId, taskUid: at + 1 })),
  taskVisuals: GROUP_IDS.map((_, at) => ({ taskUid: at + 1, shapeKind: 'rectangle' })),
  taskOrigins: [],
  baselineTasks: [],
})

interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface Scene {
  readonly settings: Loose
  readonly schedule: Loose
  readonly regions: Loose
  readonly layout: Loose
  readonly geometry: Loose
  readonly selection: Selection
}

const BASE_SETTINGS: Loose = {
  scrollDate: HOME,
  zoomX: 1,
  progressMarkerVisible: true,
  assigneeVisible: true,
  percentCompleteVisible: true,
  actualVisible: true,
  planVisible: true,
}

const sceneOf = (spec: SceneSpec = {}, selection: Selection = emptySelection()): Scene => {
  const settings = { ...SETTINGS_DEFAULTS, ...BASE_SETTINGS, ...spec.settings }
  const regions = regionsFromScreen(ENVIRONMENT as never, settings as never)
  const schedule = scheduleOf(spec)
  const layout = layoutFromSchedule(schedule as never, settings as never, regions)
  const geometry = geometryFromLayout(schedule as never, settings as never, layout, regions, selection, null)
  return { settings, schedule, regions, layout, geometry, selection }
}

type Target = { readonly kind: 'task'; readonly taskUid: number } | { readonly kind: 'commentBox'; readonly commentBoxId: string }
const TASK = (taskUid: number): Target => ({ kind: 'task', taskUid })
const BOX = (commentBoxId: string): Target => ({ kind: 'commentBox', commentBoxId })

const landedOn = (target: Target, related?: readonly number[]): Loose => ({
  kind: 'shown',
  landedBy: 'jump',
  landedLink: null,
  landedTarget: target,
  ...(related === undefined ? {} : { landedRelatedTasks: related }),
})

const svgOf = (scene: Scene, landing: Loose, theme: Theme = 'light', picture: 'screen' | 'export' = 'screen'): string =>
  svgFromSchedule(
    scene.schedule as never,
    scene.settings as never,
    scene.layout as never,
    scene.geometry as never,
    scene.regions as never,
    scene.selection,
    picture,
    { themePreference: theme, guideCursorMode: 'none', landingMarkDisplayState: landing } as never,
  )

interface Element {
  readonly tag: string
  readonly attrs: string
  readonly zo: string | null
  readonly at: number
}

const attrOf = (attrs: string, name: string): string | null => {
  const found = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)
  return found === null ? null : found[1]!
}

const elementsOf = (svg: string): readonly Element[] => {
  const out: Element[] = []
  const groups: (string | null)[] = []
  const drawn = svg.replace(/<marker\b[\s\S]*?<\/marker>/g, '').replace(/<clipPath\b[\s\S]*?<\/clipPath>/g, '')
  for (const match of drawn.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') groups.push(attrOf(attrs!, 'data-zo'))
      continue
    }
    if (closing === '/') continue
    out.push({ tag: tag!, attrs: attrs!, zo: [...groups].reverse().find((one) => one !== null) ?? null, at: match.index ?? 0 })
  }
  return out
}

const RING = 'Jump Landing Ring'
const RELATED_RING = 'Jump Landing Related Ring'
const byRole = (svg: string, role: string): readonly Element[] => elementsOf(svg).filter((one) => attrOf(one.attrs, 'data-role') === role)

interface Drawn {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly rx: number
  readonly ry: number
  readonly strokeWidth: number
  readonly stroke: string
  readonly fill: string
}

const drawnOf = (one: Element): Drawn => ({
  x: Number(attrOf(one.attrs, 'x')),
  y: Number(attrOf(one.attrs, 'y')),
  width: Number(attrOf(one.attrs, 'width')),
  height: Number(attrOf(one.attrs, 'height')),
  rx: Number(attrOf(one.attrs, 'rx') ?? '0'),
  ry: Number(attrOf(one.attrs, 'ry') ?? attrOf(one.attrs, 'rx') ?? '0'),
  strokeWidth: Number(attrOf(one.attrs, 'stroke-width')),
  stroke: attrOf(one.attrs, 'stroke') ?? '',
  fill: (attrOf(one.attrs, 'fill') ?? '').toLowerCase(),
})

// see SJ-10
// WHY: the ring counts from the plan shape's bounding box with the actual left out -- the laid-out plan figure.
const planBoxOf = (scene: Scene, uid: number): Rect => {
  const placed = (scene.layout['placements'] as Loose[]).find((one) => one['taskUid'] === uid)
  if (placed === undefined) throw new Error(`the layout drew no task ${String(uid)}`)
  return { x: placed['x'], y: placed['y'], width: placed['width'], height: placed['planHeight'] }
}

// WHY: a stroked SVG rect names its line's middle, so the middle stands `offset` outside the box on every side.
const grown = (box: Rect, offset: number): Rect => ({
  x: box.x - offset,
  y: box.y - offset,
  width: box.width + 2 * offset,
  height: box.height + 2 * offset,
})

const expectRect = (drawn: Drawn, wanted: Rect, what: string): void => {
  expect(Math.abs(drawn.x - wanted.x), `${what}: x ${String(drawn.x)} against ${String(wanted.x)}`).toBeLessThanOrEqual(HALF_PIXEL)
  expect(Math.abs(drawn.y - wanted.y), `${what}: y ${String(drawn.y)} against ${String(wanted.y)}`).toBeLessThanOrEqual(HALF_PIXEL)
  expect(Math.abs(drawn.width - wanted.width), `${what}: width ${String(drawn.width)} against ${String(wanted.width)}`).toBeLessThanOrEqual(HALF_PIXEL)
  expect(Math.abs(drawn.height - wanted.height), `${what}: height ${String(drawn.height)} against ${String(wanted.height)}`).toBeLessThanOrEqual(HALF_PIXEL)
}

const isFrame = (drawn: Drawn): boolean => drawn.fill === 'none' || drawn.fill === 'transparent'

const commentBoxOf = (id: string, anchorGroupId: string, anchorDate: string | null): Loose => ({
  id,
  leaderShapeKind: null,
  text: id,
  anchorDate,
  anchorGroupId,
  bodyOffsetPx: null,
  strokeColor: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
  textColor: null,
})

const WITH_BOX: SceneSpec = { commentBoxes: [commentBoxOf('box-dated', 'g6', iso(40))] }

const boxBodyOf = (scene: Scene, id: string): Rect => {
  const found = (scene.geometry['commentBoxes'] as Loose[]).find((one) => one['id'] === id)
  if (found === undefined) throw new Error(`the geometry drew no comment box ${id}`)
  return found['body'] as Rect
}

const THEMES = ['light', 'dark'] as const
const HUES = [214, 0, 120, 335] as const
const MONO: SceneSpec = { settings: { themeMonochrome: true } }

// WHY: monochrome splits the S-556 band in thirds; a third's middle stands 1/6 and 5/6 of the band out from its inner edge.
const OUTER_THIRD = (5 / 6) * S_556
const INNER_THIRD = (1 / 6) * S_556
const OUTER_THIRD_RADIUS = S_586 + S_556 / 3
const INNER_THIRD_RADIUS = Math.max(0, S_586 - S_556 / 3)

describe(`T-332 SJ-10 -- ${SJ_10_RING} (the color)`, () => {
  for (const theme of THEMES) {
    it.each(HUES.map((hue) => [hue]))(`${theme}, theme hue %i: the ring is the S-585 ${theme} color, not S-151`, (hue) => {
      const rings = byRole(svgOf(sceneOf({ hue }), landedOn(TASK(TARGET)), theme), RING)
      expect(rings.length, 'one ring').toBe(1)
      const drawn = drawnOf(rings[0]!)
      expect(sameRgb(rgbOf(drawn.stroke), S_585(theme)), `S-585 ${theme}: ${drawn.stroke} against ${t236('S-585', theme)}`).toBe(true)
      expect(sameRgb(rgbOf(drawn.stroke), S_151(theme, hue)), `not S-151 at hue ${String(hue)}`).toBe(false)
    })

    it(`${theme}: ${S_585_NO_THEME} -- the ring's stroke is the same at every theme hue`, () => {
      const strokes = HUES.map((hue) => drawnOf(byRole(svgOf(sceneOf({ hue }), landedOn(TASK(TARGET)), theme), RING)[0]!).stroke)
      expect(new Set(strokes).size, strokes.join(', ')).toBe(1)
    })
  }

  it('the ring is a solid S-556 frame with no fill', () => {
    const drawn = drawnOf(byRole(svgOf(sceneOf(), landedOn(TASK(TARGET))), RING)[0]!)
    expect(drawn.strokeWidth, 'S-556').toBeCloseTo(S_556, 6)
    expect(isFrame(drawn), `fill ${drawn.fill}`).toBe(true)
    expect(attrOf(byRole(svgOf(sceneOf(), landedOn(TASK(TARGET))), RING)[0]!.attrs, 'stroke-dasharray'), 'a solid line').toBeNull()
  })
})

describe(`T-332 SJ-10 -- ${SJ_10_RING} (the place and the corner)`, () => {
  const scene = sceneOf()
  const plan = planBoxOf(scene, TARGET)
  const ring = drawnOf(byRole(svgOf(scene, landedOn(TASK(TARGET))), RING)[0]!)

  it(`${S_555_INNER}: the line's inner edge stands exactly S-555 outside the plan shape on all four sides`, () => {
    const inner = grown({ x: ring.x, y: ring.y, width: ring.width, height: ring.height }, -ring.strokeWidth / 2)
    expect(Math.abs(plan.x - inner.x - S_555), 'left').toBeLessThanOrEqual(HALF_PIXEL)
    expect(Math.abs(plan.y - inner.y - S_555), 'top').toBeLessThanOrEqual(HALF_PIXEL)
    expect(Math.abs(inner.x + inner.width - (plan.x + plan.width) - S_555), 'right').toBeLessThanOrEqual(HALF_PIXEL)
    expect(Math.abs(inner.y + inner.height - (plan.y + plan.height) - S_555), 'bottom').toBeLessThanOrEqual(HALF_PIXEL)
  })

  it('the line\'s outer edge stands S-555 + S-556 outside the plan shape on all four sides', () => {
    const outer = grown({ x: ring.x, y: ring.y, width: ring.width, height: ring.height }, ring.strokeWidth / 2)
    expectRect({ ...ring, ...outer }, grown(plan, S_555 + S_556), 'outer edge')
  })

  it('the rect names the line\'s middle: the plan shape grown by S-555 + S-556 / 2', () => {
    expectRect(ring, grown(plan, S_555 + S_556 / 2), 'the ring')
  })

  it(`${S_586_MIDDLE}: rx and ry are S-586`, () => {
    expect(ring.rx, 'rx').toBeCloseTo(S_586, 6)
    expect(ring.ry, 'ry').toBeCloseTo(S_586, 6)
  })

  it('premise: the plan shape is the plan alone (the actual figure is drawn and the ring is counted from the plan)', () => {
    expect(elementsOf(svgOf(scene, landedOn(TASK(TARGET)))).some((one) => attrOf(one.attrs, 'data-figure') === `task-${String(TARGET)}-actual`)).toBe(true)
  })

  it('a comment box target: the ring stands S-555 to its inner edge from the box, with S-586 corners', () => {
    const boxScene = sceneOf(WITH_BOX)
    const rings = byRole(svgOf(boxScene, landedOn(BOX('box-dated'))), RING)
    expect(rings.length, 'one ring').toBe(1)
    const drawn = drawnOf(rings[0]!)
    expectRect(drawn, grown(boxBodyOf(boxScene, 'box-dated'), S_555 + S_556 / 2), 'the ring around the box')
    expect(drawn.rx).toBeCloseTo(S_586, 6)
  })
})

describe(`T-332 SJ-10 / T-020 ZO-8 -- ${SJ_10_Z}`, () => {
  const scene = sceneOf()
  const svg = svgOf(scene, landedOn(TASK(TARGET)))
  const ring = byRole(svg, RING)[0]!
  const figure = (name: string): readonly Element[] =>
    elementsOf(svg).filter((one) => attrOf(one.attrs, 'data-figure') === `task-${String(TARGET)}-${name}`)

  it('the ring is in the ZO-8 layer', () => {
    expect(ring.zo).toBe('ZO-8')
  })

  it.each([
    ['marker', 'ZO-3'],
    ['label', 'ZO-5'],
    ['oc2-label', 'ZO-5'],
  ] as const)('the landed task\'s %s (%s) is drawn after the ring, so it stands in front of it', (name, zo) => {
    const drawn = figure(name)
    expect(drawn.length, `premise: task ${String(TARGET)} draws its ${name}`).toBeGreaterThan(0)
    for (const one of drawn) {
      expect(one.zo, name).toBe(zo)
      expect(one.at, `${name} after the ring`).toBeGreaterThan(ring.at)
    }
  })

  it(`${SJ_10_ABOVE_RING}: a selected landed task's selection frame and fade grab points (ZO-10) are drawn after the ring`, () => {
    const selected = sceneOf({}, selectionWith(emptySelection(), { kind: 'task', uid: TARGET }))
    const picture = svgOf(selected, landedOn(TASK(TARGET)))
    const landedRing = byRole(picture, RING)[0]!
    const own = elementsOf(picture).filter((one) => (attrOf(one.attrs, 'data-figure') ?? '').startsWith(`task-${String(TARGET)}-`))
    const frames = own.filter((one) => one.tag === 'rect' && attrOf(one.attrs, 'stroke-dasharray') !== null && one.zo === 'ZO-10')
    const grabs = own.filter((one) => one.zo === 'ZO-10' && attrOf(one.attrs, 'stroke-dasharray') === null)
    expect(frames.length, 'premise: the selection frame is drawn').toBeGreaterThan(0)
    expect(grabs.length, 'premise: the fade grab points are drawn').toBeGreaterThan(0)
    for (const one of [...frames, ...grabs]) expect(one.at, attrOf(one.attrs, 'data-figure') ?? '').toBeGreaterThan(landedRing.at)
  })
})

describe(`T-332 SJ-10 -- ${SJ_10_NO_MARKER}`, () => {
  const scene = sceneOf()
  const plan = planBoxOf(scene, TARGET)
  const svg = svgOf(scene, landedOn(TASK(TARGET)))
  const ring = drawnOf(byRole(svg, RING)[0]!)
  const outer = grown({ x: ring.x, y: ring.y, width: ring.width, height: ring.height }, ring.strokeWidth / 2)
  const inside = (x: number, y: number): boolean => x > outer.x && x < outer.x + outer.width && y > outer.y && y < outer.y + outer.height
  const one = (name: string): Element => {
    const found = elementsOf(svg).find((each) => attrOf(each.attrs, 'data-figure') === `task-${String(TARGET)}-${name}`)
    if (found === undefined) throw new Error(`task ${String(TARGET)} draws no ${name}`)
    return found
  }

  it('the done marker (PM-2, T-273 LP-2) stands outside the plan shape, and the ring does not take it in', () => {
    const marker = elementsOf(svg).find(
      (each) => attrOf(each.attrs, 'data-figure') === `task-${String(TARGET)}-marker` && each.tag === 'circle',
    )
    expect(marker, 'premise: the marker is a circle').toBeDefined()
    const cx = Number(attrOf(marker!.attrs, 'cx'))
    const cy = Number(attrOf(marker!.attrs, 'cy'))
    const r = Number(attrOf(marker!.attrs, 'r'))
    expect(cx - r, 'premise: the marker stands right of the plan shape').toBeGreaterThanOrEqual(plan.x + plan.width)
    expect(inside(cx, cy), `the marker's middle (${String(cx)}, ${String(cy)}) is not inside the ring's outer edge`).toBe(false)
    const wholly = cx - r >= outer.x && cx + r <= outer.x + outer.width && cy - r >= outer.y && cy + r <= outer.y + outer.height
    expect(wholly, 'the marker is not held by the ring').toBe(false)
  })

  it('the name label (start-anchored, right of the shape) begins outside the ring', () => {
    const label = one('label')
    const x = Number(attrOf(label.attrs, 'x'))
    expect(attrOf(label.attrs, 'text-anchor') ?? 'start').toBe('start')
    expect(x, `name label x ${String(x)} against the ring's outer right ${String(outer.x + outer.width)}`).toBeGreaterThanOrEqual(outer.x + outer.width)
  })

  it('the assignee and percent label (end-anchored, left of the shape) ends outside the ring', () => {
    const label = one('oc2-label')
    const x = Number(attrOf(label.attrs, 'x'))
    expect(attrOf(label.attrs, 'text-anchor')).toBe('end')
    expect(x, `assignee label end ${String(x)} against the ring's outer left ${String(outer.x)}`).toBeLessThanOrEqual(outer.x)
  })
})

describe(`T-332 SJ-10 -- ${SJ_10_MONO}`, () => {
  for (const theme of THEMES) {
    it.each([[214], [120]])(`${theme}, theme hue %i: two grey lines in the outer and inner thirds of the S-556 band`, (hue) => {
      const scene = sceneOf({ ...MONO, hue })
      const plan = planBoxOf(scene, TARGET)
      const rings = byRole(svgOf(scene, landedOn(TASK(TARGET)), theme), RING).map(drawnOf)
      expect(rings.length, 'two lines').toBe(2)
      const [outer, inner] = [...rings].sort((a, b) => b.width - a.width) as [Drawn, Drawn]
      const gray = grayOf(S_585(theme))
      for (const line of [outer, inner]) {
        const rgb = rgbOf(line.stroke)
        expect(isGray(rgb), `grey: ${line.stroke}`).toBe(true)
        expect(sameRgb(rgb, gray), `keeps the HSL lightness of S-585 ${theme}: ${line.stroke}`).toBe(true)
        expect(line.strokeWidth, 'a third of S-556').toBeCloseTo(S_556 / 3, 6)
        expect(isFrame(line), `fill ${line.fill}`).toBe(true)
      }
      expectRect(outer, grown(plan, S_555 + OUTER_THIRD), 'the outer third')
      expectRect(inner, grown(plan, S_555 + INNER_THIRD), 'the inner third')
      expect(outer.rx, 'outer radius').toBeCloseTo(OUTER_THIRD_RADIUS, 6)
      expect(inner.rx, 'inner radius').toBeCloseTo(INNER_THIRD_RADIUS, 6)
    })
  }

  it('the middle third is left empty: the outer line\'s inner edge and the inner line\'s outer edge are S-556 / 3 apart', () => {
    const scene = sceneOf(MONO)
    const rings = byRole(svgOf(scene, landedOn(TASK(TARGET))), RING).map(drawnOf)
    const [outer, inner] = [...rings].sort((a, b) => b.width - a.width) as [Drawn, Drawn]
    const gap = outer.x + outer.strokeWidth / 2 - (inner.x - inner.strokeWidth / 2)
    expect(Math.abs(-gap - S_556 / 3), `gap ${String(-gap)}`).toBeLessThanOrEqual(HALF_PIXEL)
  })

  it('both lines stay in ZO-8', () => {
    for (const one of byRole(svgOf(sceneOf(MONO), landedOn(TASK(TARGET))), RING)) expect(one.zo).toBe('ZO-8')
  })
})

describe(`T-346 RW-13 -- ${RW_13_RING}`, () => {
  for (const theme of THEMES) {
    it(`${theme}: each related task gets a ring of S-573, with the gap S-555, the width S-556 and the corner S-586`, () => {
      const scene = sceneOf()
      const svg = svgOf(scene, landedOn(TASK(TARGET), [...RELATED]), theme)
      const related = byRole(svg, RELATED_RING)
      expect(related.length, 'one ring per related task').toBe(RELATED.length)
      const drawn = related.map(drawnOf).sort((a, b) => a.y - b.y)
      const plans = RELATED.map((uid) => planBoxOf(scene, uid)).sort((a, b) => a.y - b.y)
      drawn.forEach((ring, at) => {
        expect(sameRgb(rgbOf(ring.stroke), S_573(theme)), `S-573 ${theme}: ${ring.stroke}`).toBe(true)
        expect(ring.strokeWidth).toBeCloseTo(S_556, 6)
        expect(ring.rx).toBeCloseTo(S_586, 6)
        expect(isFrame(ring)).toBe(true)
        expectRect(ring, grown(plans[at]!, S_555 + S_556 / 2), `related ring ${String(at)}`)
      })
      for (const one of related) expect(one.zo).toBe('ZO-8')
      expect(byRole(svg, RING).length, 'the target keeps its own ring').toBe(1)
    })
  }

  it(`${RW_13_UNDRAWN}: a related task the document does not hold gets no ring`, () => {
    expect(byRole(svgOf(sceneOf(), landedOn(TASK(TARGET), [9999])), RELATED_RING)).toEqual([])
  })

  it('with no related tasks there is no related ring', () => {
    expect(byRole(svgOf(sceneOf(), landedOn(TASK(TARGET))), RELATED_RING)).toEqual([])
  })

  for (const theme of THEMES) {
    it(`${theme}, monochrome: each related ring is two grey lines keeping S-573's lightness, in the thirds`, () => {
      const scene = sceneOf(MONO)
      const svg = svgOf(scene, landedOn(TASK(TARGET), [RELATED[0]]), theme)
      const rings = byRole(svg, RELATED_RING).map(drawnOf)
      expect(rings.length, 'two lines for one related task').toBe(2)
      const [outer, inner] = [...rings].sort((a, b) => b.width - a.width) as [Drawn, Drawn]
      const plan = planBoxOf(scene, RELATED[0])
      for (const line of [outer, inner]) {
        expect(sameRgb(rgbOf(line.stroke), grayOf(S_573(theme))), `grey of S-573 ${theme}: ${line.stroke}`).toBe(true)
        expect(line.strokeWidth).toBeCloseTo(S_556 / 3, 6)
      }
      expectRect(outer, grown(plan, S_555 + OUTER_THIRD), 'outer third')
      expectRect(inner, grown(plan, S_555 + INNER_THIRD), 'inner third')
      expect(outer.rx).toBeCloseTo(OUTER_THIRD_RADIUS, 6)
      expect(inner.rx).toBeCloseTo(INNER_THIRD_RADIUS, 6)
    })
  }
})

describe(`T-064 PI-19 jumpLandingRingOf -- ${PI_19_RING}`, () => {
  const ringOf = (scene: Scene, target: Target): Loose | null =>
    jumpLandingRingOf(scene.layout as never, scene.geometry as never, target as never) as unknown as Loose | null

  it('a task: inner is the plan shape grown by S-555, lineWidth is S-556, cornerRadius is S-586', () => {
    const scene = sceneOf()
    const ring = ringOf(scene, TASK(TARGET))
    expect(ring).not.toBeNull()
    const inner = ring!['inner'] as Rect
    expectRect({ ...inner, rx: 0, ry: 0, strokeWidth: 0, stroke: '', fill: '' }, grown(planBoxOf(scene, TARGET), S_555), 'inner')
    expect(ring!['lineWidth']).toBeCloseTo(S_556, 6)
    expect(ring!['cornerRadius']).toBeCloseTo(S_586, 6)
  })

  it('a comment box: inner is the box grown by S-555', () => {
    const scene = sceneOf(WITH_BOX)
    const ring = ringOf(scene, BOX('box-dated'))
    expect(ring).not.toBeNull()
    expectRect({ ...(ring!['inner'] as Rect), rx: 0, ry: 0, strokeWidth: 0, stroke: '', fill: '' }, grown(boxBodyOf(scene, 'box-dated'), S_555), 'inner')
  })

  it('the drawn ring is the same one: the SVG rect is inner grown by half the line, with rx the corner radius', () => {
    const scene = sceneOf()
    const ring = ringOf(scene, TASK(TARGET))!
    const drawn = drawnOf(byRole(svgOf(scene, landedOn(TASK(TARGET))), RING)[0]!)
    expectRect(drawn, grown(ring['inner'] as Rect, (ring['lineWidth'] as number) / 2), 'svg against jumpLandingRingOf')
    expect(drawn.rx).toBeCloseTo(ring['cornerRadius'] as number, 6)
  })

  it('a target the document does not hold has no ring', () => {
    expect(ringOf(sceneOf(), TASK(9999))).toBeNull()
  })
})
