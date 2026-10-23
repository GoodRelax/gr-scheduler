// DFC-2304 spec-only cases: FR-098 -- the tasks of a pinned task group are drawn once, in the pinned band, and stay there while the schedule scrolls vertically; the tasks of the scrolling task groups are cut at the band's lower edge and never drawn over the band; a press on a task bar in the band picks that task (T-023c SL-2), and the drawing and the hit test agree on which tasks are in the band (T-064 PI-6).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { SCREEN, day, scheduleOf, taskOf } from '../unit/cr-430-cross-section-scene'

const REQUIREMENTS = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')

const FR_098_LIFT = 'ピン止めしたタスクグループは、スクロールする領域から抜いて画面の上端へ固定すること（MUST）'
const FR_098_ONCE = '同じタスクグループを本来の縦位置にも描いてはならない（MUST NOT）'
const FR_098_NOT_UNDER = 'スクロールするタスクグループを帯の下へ潜らせてはならない（MUST NOT）'
const FR_098_EVERY_FIGURE =
  'タスクグループの地だけでなく、そのタスクグループのバー・ラベル・進捗マーカー・依存線を含めて、帯が占める場所へ 1 つも描いてはならない（MUST NOT）'
const FR_098_CUT_AT = '切る先は残りの領域の上端であり'
const FR_098_SCROLL_IS_NO_REASON = '縦にスクロールしたことは理由にならない（MUST NOT）'
const EL_1_UNDER_IS_NOT_SEEN = '帯の下へ潜ったタスクグループの端は見えていない —— そのタスクグループを帯の中に描いてはならないからである'
const SL_2_CLICK = '| SL-2 | 1 つ選ぶ | 対象をクリックする。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-098 lift into the band', FR_098_LIFT],
  ['FR-098 drawn once', FR_098_ONCE],
  ['FR-098 not under the band', FR_098_NOT_UNDER],
  ['FR-098 every figure of the task group', FR_098_EVERY_FIGURE],
  ['FR-098 the cut is the top of the rest', FR_098_CUT_AT],
  ['FR-098 scrolling is no reason to stop drawing', FR_098_SCROLL_IS_NO_REASON],
  ['T-303 EL-1 under the band is not seen', EL_1_UNDER_IS_NOT_SEEN],
  ['T-023c SL-2 a click picks', SL_2_CLICK],
]

// WHY: four task groups of one task each, at four different days so no two bars share an x; the third is pinned,
// so it is lifted out of the middle of the tree (FR-098 / LF-14).
const GROUPS = ['g1', 'g2', 'g3', 'g4'] as const
const PINNED_GROUP = 'g3'
const PINNED_UID = 3
const UNDER_UID = 1
const TASKS = [
  taskOf({ uid: 1, name: 'one', start: day(2), finish: day(6) }),
  taskOf({ uid: 2, name: 'two', start: day(8), finish: day(12) }),
  taskOf({ uid: 3, name: 'three', start: day(14), finish: day(18) }),
  taskOf({ uid: 4, name: 'four', start: day(20), finish: day(24) }),
]
const UIDS = [1, 2, 3, 4] as const

const group = (id: string, order: number): unknown => ({
  id,
  parentId: null,
  name: id,
  derivedFromTaskUid: null,
  order,
  treeState: 'auto',
  color: null,
  minHeightPx: null,
})

// WHY: S-78 / S-176 are the vertical scroll; three places of it -- nothing under the band, g1 wholly under it,
// and g1 half under it so its bar straddles the band's lower edge.
interface ScrollState {
  readonly name: string
  readonly scrollTaskGroupId: string
  readonly scrollTaskGroupFraction: number
}
const SCROLLS: readonly ScrollState[] = [
  { name: 'top at g1', scrollTaskGroupId: 'g1', scrollTaskGroupFraction: 0 },
  { name: 'top at g2 (g1 under the band)', scrollTaskGroupId: 'g2', scrollTaskGroupFraction: 0 },
  { name: 'top halfway into g1 (g1 straddles the band edge)', scrollTaskGroupId: 'g1', scrollTaskGroupFraction: 0.5 },
]
const [AT_G1, AT_G2, HALF_G1] = SCROLLS as [ScrollState, ScrollState, ScrollState]

interface Scene {
  readonly schedule: Schedule
  readonly settings: Parameters<typeof layoutFromSchedule>[1]
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
}

const sceneAt = (scroll: ScrollState): Scene => {
  const base = scheduleOf({ tasks: TASKS })
  const schedule = {
    ...base,
    taskGroups: GROUPS.map((id, order) => group(id, order)),
    taskGroupMembers: UIDS.map((uid) => ({ taskUid: uid, taskGroupId: GROUPS[uid - 1] })),
  } as unknown as Schedule
  const settings = {
    ...SETTINGS_DEFAULTS,
    zoomX: 8,
    scrollDate: day(1),
    stackDirection: 'down',
    pinnedTaskGroupIds: [PINNED_GROUP],
    scrollTaskGroupId: scroll.scrollTaskGroupId,
    scrollTaskGroupFraction: scroll.scrollTaskGroupFraction,
  } as unknown as Parameters<typeof layoutFromSchedule>[1]
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  return { schedule, settings, regions, layout, geometry }
}

const svgOf = (scene: Scene, geometry: ScheduleGeometry = scene.geometry): string =>
  svgFromSchedule(scene.schedule, scene.settings as never, scene.layout, geometry, scene.regions, emptySelection(), 'screen', {
    themePreference: 'light',
    guideCursorMode: 'none',
  } as never)

interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface Figure {
  readonly key: string
  readonly clips: readonly string[]
}

interface Picture {
  readonly figures: readonly Figure[]
  readonly clipRects: ReadonlyMap<string, Rect>
  readonly rects: ReadonlyMap<string, Rect>
}

const attr = (tag: string, name: string): string | null => {
  const found = new RegExp(`\\s${name}="([^"]*)"`).exec(tag)
  return found === null ? null : (found[1] as string)
}

const rectOf = (tag: string): Rect => ({
  x: Number(attr(tag, 'x')),
  y: Number(attr(tag, 'y')),
  width: Number(attr(tag, 'width')),
  height: Number(attr(tag, 'height')),
})

// WHY: walks the SVG tags once, keeping the clip-path ids every open element carries, so each figure knows the
// clips it is drawn under; also reads each clipPath's rectangle and every rect that names its figure.
const pictureOf = (svg: string): Picture => {
  const figures: Figure[] = []
  const clipRects = new Map<string, Rect>()
  const rects = new Map<string, Rect>()
  const open: (string | null)[] = []
  let clipPathId: string | null = null
  for (const found of svg.matchAll(/<(\/?)([A-Za-z][\w:-]*)((?:"[^"]*"|[^>"])*?)(\/?)>/g)) {
    const [whole, closing, name, , selfClosing] = found as unknown as [string, string, string, string, string]
    if (closing === '/') {
      open.pop()
      if (name === 'clipPath') clipPathId = null
      continue
    }
    if (name === 'clipPath') clipPathId = attr(whole, 'id')
    if (name === 'rect' && clipPathId !== null && !clipRects.has(clipPathId)) clipRects.set(clipPathId, rectOf(whole))
    const own = attr(whole, 'clip-path')
    const ownId = own === null ? null : (/url\(#([^)]+)\)/.exec(own)?.[1] ?? null)
    const key = attr(whole, 'data-figure')
    if (key !== null) {
      const clips = [...open, ownId].filter((one): one is string => one !== null)
      figures.push({ key, clips })
      if (name === 'rect') rects.set(key, rectOf(whole))
    }
    if (selfClosing !== '/') open.push(ownId)
  }
  return { figures, clipRects, rects }
}

const figuresOfTask = (picture: Picture, uid: number): readonly Figure[] =>
  picture.figures.filter((one) => one.key.startsWith(`task-${uid}-`))

const bandOf = (geometry: ScheduleGeometry): NonNullable<ScheduleGeometry['pinnedBand']> => {
  if (geometry.pinnedBand === undefined) throw new Error('the geometry carries no pinned band')
  return geometry.pinnedBand
}

// WHY: a clip is "the band cut" when its rectangle begins at the band's lower edge -- the top of the rest (FR-098).
const isCutAtBand = (picture: Picture, clipId: string, scrollTop: number): boolean => {
  const rect = picture.clipRects.get(clipId)
  return rect !== undefined && Math.abs(rect.y - scrollTop) <= 0.01
}

// WHY: true when the task's figures are drawn free of the band cut -- that is, drawn in the band.
const drawnInBand = (picture: Picture, uid: number, scrollTop: number): boolean => {
  const figures = figuresOfTask(picture, uid)
  if (figures.length === 0) throw new Error(`task ${uid} has no figure in the picture`)
  const cut = figures.map((one) => one.clips.some((clip) => isCutAtBand(picture, clip, scrollTop)))
  // WHY: one task's figures all go one way; a split would itself break FR-098 (bar in the band, label under it).
  expect(new Set(cut).size, `task ${uid}: some figures are cut at the band edge and some are not`).toBe(1)
  return cut[0] === false
}

interface Bar {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly planHeight: number
}

const barOf = (scene: Scene, uid: number): Bar => {
  const found = taskPlacement(scene.layout, uid)
  if (found === null) throw new Error(`task ${uid} was not placed`)
  return found as unknown as Bar
}

const pickedAt = (geometry: ScheduleGeometry, x: number, y: number): number | null => {
  const hit = itemAtPointer(geometry, x, y, grabSizesOf())
  return hit !== null && hit.item.kind === 'task' ? hit.item.taskUid : null
}

// WHY: the middle of the part of the bar above the band's lower edge; null when no part of it is there.
const pointInBandOn = (bar: Bar, scrollTop: number): { x: number; y: number } | null => {
  const top = bar.y
  const bottom = Math.min(bar.y + bar.planHeight, scrollTop)
  if (bottom - top < 2) return null
  return { x: bar.x + bar.width / 2, y: (top + bottom) / 2 }
}

const SCENES = SCROLLS.map((scroll) => ({ scroll, scene: sceneAt(scroll) }))
const sceneOf = (scroll: ScrollState): Scene => {
  const found = SCENES.find((one) => one.scroll === scroll)
  if (found === undefined) throw new Error(`no scene for ${scroll.name}`)
  return found.scene
}

describe('DFC-2304 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('%s still stands (FR-098, T-303 EL-1, T-023c SL-2)', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('DFC-2304: the pinned band holds its tasks in the picture and in the hit test (FR-098, PI-6)', () => {
  it('FR-098 premise: in every scroll state the band holds the pinned task, g1 is under it at g2 and straddles it halfway into g1', () => {
    for (const { scroll, scene } of SCENES) {
      const band = bandOf(scene.geometry)
      expect([...band.pinnedTaskUids], scroll.name).toEqual([PINNED_UID])
      const pinned = barOf(scene, PINNED_UID)
      expect(pinned.y + pinned.planHeight, `${scroll.name}: the pinned bar ends above the band edge`).toBeLessThanOrEqual(band.scrollTop)
    }
    const under = barOf(sceneOf(AT_G2), UNDER_UID)
    expect(under.y + under.planHeight).toBeLessThanOrEqual(bandOf(sceneOf(AT_G2).geometry).scrollTop)
    const straddling = barOf(sceneOf(HALF_G1), UNDER_UID)
    const edge = bandOf(sceneOf(HALF_G1).geometry).scrollTop
    expect(straddling.y).toBeLessThan(edge - 2)
    expect(straddling.y + straddling.planHeight).toBeGreaterThan(edge + 2)
    const free = barOf(sceneOf(AT_G1), UNDER_UID)
    expect(free.y).toBeGreaterThanOrEqual(bandOf(sceneOf(AT_G1).geometry).scrollTop)
  })

  it('FR-098 the pinned task stays at the top of the Task Group Area while the schedule scrolls vertically, and the others move', () => {
    const [first, ...rest] = SCENES
    if (first === undefined) throw new Error('no scene')
    const pinnedAt = barOf(first.scene, PINNED_UID)
    expect(pinnedAt.y).toBeGreaterThanOrEqual(first.scene.regions.taskGroupArea.y)
    for (const { scroll, scene } of rest) {
      const pinned = barOf(scene, PINNED_UID)
      expect({ x: pinned.x, y: pinned.y }, scroll.name).toEqual({ x: pinnedAt.x, y: pinnedAt.y })
      expect(barOf(scene, 4).y, `${scroll.name}: the scroll moved nothing, so the premise is void`).not.toBe(barOf(first.scene, 4).y)
    }
  })

  it('FR-098 every task is drawn once -- the pinned task is not drawn again at its own place in the tree', () => {
    for (const { scroll, scene } of SCENES) {
      const picture = pictureOf(svgOf(scene))
      for (const uid of UIDS) {
        expect(picture.figures.filter((one) => one.key === `task-${uid}-plan`).length, `${scroll.name}: task ${uid}`).toBe(1)
      }
    }
  })

  it('FR-098 the figures of the pinned task are drawn in the band, free of the cut at its lower edge', () => {
    for (const { scroll, scene } of SCENES) {
      const picture = pictureOf(svgOf(scene))
      expect(drawnInBand(picture, PINNED_UID, bandOf(scene.geometry).scrollTop), scroll.name).toBe(true)
    }
  })

  it('FR-098 every figure of a scrolling task -- bar, label, marker -- is cut at the band edge, and the cut is the top of the rest down to the foot of the Task Group Area', () => {
    for (const { scroll, scene } of SCENES) {
      const picture = pictureOf(svgOf(scene))
      const scrollTop = bandOf(scene.geometry).scrollTop
      for (const uid of UIDS.filter((one) => one !== PINNED_UID)) {
        const kinds = new Set(figuresOfTask(picture, uid).map((one) => one.key.replace(`task-${uid}-`, '')))
        expect([...kinds], `${scroll.name}: task ${uid} premise -- bar, label and marker are drawn`).toEqual(
          expect.arrayContaining(['plan', 'label', 'marker']),
        )
        expect(drawnInBand(picture, uid, scrollTop), `${scroll.name}: task ${uid}`).toBe(false)
      }
      const area = scene.regions.taskGroupArea
      const cuts = [...picture.clipRects.entries()].filter(([id]) => isCutAtBand(picture, id, scrollTop))
      expect(cuts.length, `${scroll.name}: a clip begins at the band edge`).toBeGreaterThan(0)
      for (const [, rect] of cuts) expect(rect.y + rect.height, scroll.name).toBeGreaterThanOrEqual(area.y + area.height - 0.01)
    }
  })

  it('FR-098 the cut never lets a scrolling figure onto the band: it begins at or below the pinned task group\'s band', () => {
    for (const { scroll, scene } of SCENES) {
      const picture = pictureOf(svgOf(scene))
      const ground = picture.rects.get(`task-group-${PINNED_GROUP}-band`)
      if (ground === undefined) throw new Error(`${scroll.name}: the pinned task group's band is not drawn`)
      expect(bandOf(scene.geometry).scrollTop, scroll.name).toBeGreaterThanOrEqual(ground.y + ground.height - 0.01)
    }
  })

  it('SL-2 / FR-098 a press on the pinned task bar in the band picks that task, in every scroll state', () => {
    for (const { scroll, scene } of SCENES) {
      const at = pointInBandOn(barOf(scene, PINNED_UID), bandOf(scene.geometry).scrollTop)
      if (at === null) throw new Error(`${scroll.name}: the pinned bar has no part in the band`)
      expect(pickedAt(scene.geometry, at.x, at.y), scroll.name).toBe(PINNED_UID)
    }
  })

  it('EL-1 / FR-098 a press in the band where a scrolled-under task lies does not pick it (g1 wholly under the band)', () => {
    const scene = sceneOf(AT_G2)
    const at = pointInBandOn(barOf(scene, UNDER_UID), bandOf(scene.geometry).scrollTop)
    if (at === null) throw new Error('premise: task 1 lies under the band')
    expect(pickedAt(scene.geometry, at.x, at.y)).not.toBe(UNDER_UID)
  })

  it('EL-1 / SL-2 / FR-098 a bar straddling the band edge answers below the edge and not above it', () => {
    const scene = sceneOf(HALF_G1)
    const bar = barOf(scene, UNDER_UID)
    const edge = bandOf(scene.geometry).scrollTop
    const x = bar.x + bar.width / 2
    expect(pickedAt(scene.geometry, x, (bar.y + edge) / 2), 'above the edge').not.toBe(UNDER_UID)
    expect(pickedAt(scene.geometry, x, (edge + bar.y + bar.planHeight) / 2), 'below the edge').toBe(UNDER_UID)
  })

  it('PI-6 / FR-098 the drawing and the hit test agree, task by task, on which tasks are in the band', () => {
    for (const { scroll, scene } of SCENES) {
      const band = bandOf(scene.geometry)
      const picture = pictureOf(svgOf(scene))
      for (const uid of UIDS) {
        const inPicture = drawnInBand(picture, uid, band.scrollTop)
        expect(inPicture, `${scroll.name}: task ${uid} drawn in the band vs the geometry's band`).toBe(band.pinnedTaskUids.has(uid))
        const at = pointInBandOn(barOf(scene, uid), band.scrollTop)
        if (at === null) continue
        expect(pickedAt(scene.geometry, at.x, at.y) === uid, `${scroll.name}: task ${uid} answers in the band`).toBe(inPicture)
      }
    }
  })

  it('PI-6 / FR-098 one geometry, one answer: whatever band the geometry carries, the picture and the hit test read the same set', () => {
    // WHY: the geometry is the one place the band is judged (PI-6); handing both readers a geometry whose band also
    // holds task 1 must move the drawing and the press together -- two judgements would part here.
    const scene = sceneOf(AT_G2)
    const band = bandOf(scene.geometry)
    const widened: ScheduleGeometry = {
      ...scene.geometry,
      pinnedBand: { scrollTop: band.scrollTop, pinnedTaskUids: new Set([...band.pinnedTaskUids, UNDER_UID]) },
    }
    const picture = pictureOf(svgOf(scene, widened))
    const at = pointInBandOn(barOf(scene, UNDER_UID), band.scrollTop)
    if (at === null) throw new Error('premise: task 1 lies under the band')
    const inPicture = drawnInBand(picture, UNDER_UID, band.scrollTop)
    const answers = pickedAt(widened, at.x, at.y) === UNDER_UID
    expect({ inPicture, answers }).toEqual({ inPicture: true, answers: true })
  })
})
