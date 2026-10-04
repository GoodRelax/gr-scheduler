// CR-662 (FR-110, table T-020 ZO-16 / ZO-8 / ZO-13): the progress line's own layer, on screen and in the export.

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  SCREEN,
  cellOf,
  day,
  scheduleOf,
  sceneOf,
  taskOf,
  type SceneWish,
} from '../unit/cr-430-cross-section-scene'

const ELEMENT = '要素'

const FR_110_ONE_TABLE =
  '`GRS` は、日程表に描くものの前後（どれが手前に見えるか）を 1 つの表で決めること（MUST）。'
const FR_110_EXCEPT_THE_PROGRESS_LINE =
  '名称・担当と進捗・進捗マーカーは、イナズマ線を除く線と形より手前に描くこと（MUST）。'
const ZO_16_PLACE =
  '進捗マーカー（`ZO-3`）と名称ラベル・札（`ZO-5`）より手前、コメントボックス（`ZO-9`）より奥とする'
const ZO_8_HOLDS = '基準日線・2 連カーソル・ガイドカーソル・ハイライトボックスの枠'
const ZO_13_PLACE =
  '線の道具（`ZO-8`）・進捗マーカー（`ZO-3`）・札（`ZO-5`）・イナズマ線（`ZO-16`）より奥とする'
const PROGRESS_LINE_WORD = 'イナズマ線'

const elementOf = (row: string): string => {
  const found = specTable('T-020').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-020 has no row ${row}`)
  return unbroken(found.by[ELEMENT] ?? '')
}

// see S-64
// WHY: the progress line is off by default, so the scene turns it on.
const PROGRESS_LINE_VISIBLE = cellOf('T-202', 'S-64', 'キー')

const COMMENT_BOX = {
  id: 'c1',
  leaderShapeKind: 'calloutBox',
  text: 'a note',
  anchorDate: '2026-03-10',
  anchorGroupId: 'g1',
  bodyOffsetPx: { dx: 40, dy: -30 },
}

const SCENE: SceneWish = {
  tasks: [
    taskOf({
      uid: 1,
      name: 'the first task',
      start: day(2),
      finish: day(12),
      actualStart: day(2),
      percentComplete: 30,
    }),
    taskOf({
      uid: 2,
      name: 'the second task',
      start: day(6),
      finish: day(20),
      actualStart: day(6),
      percentComplete: 60,
      dependencies: [{ predecessorUid: 1, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] }],
    }),
  ],
  assignedTaskUids: [1, 2],
  commentBoxes: [COMMENT_BOX],
  statusDate: day(14),
  settings: {
    assigneeVisible: true,
    percentCompleteVisible: true,
    progressMarkerVisible: true, // see S-63
    [PROGRESS_LINE_VISIBLE]: true,
  },
}

type Picture = 'screen' | 'export'

const pictureOf = (wish: SceneWish, picture: Picture): string => {
  const scene = sceneOf(wish)
  const schedule = scheduleOf(wish)
  const regions = regionsFromScreen(SCREEN, scene.settings)
  const layout = layoutFromSchedule(schedule, scene.settings, regions)
  const geometry = geometryFromLayout(schedule, scene.settings, layout, regions, scene.selection, null)
  return svgFromSchedule(
    schedule,
    scene.settings,
    layout,
    geometry,
    regions,
    scene.selection,
    picture,
    { themePreference: 'light', guideCursorMode: 'none' },
    null as never,
    [],
    null as never,
    null,
    null as never,
    null as never,
    null as never,
  )
}

interface Drawn {
  readonly attrs: string
  readonly layers: readonly string[]
}

// WHY: every drawn element with the data-zo layers of the groups it sits inside.
const drawnElementsOf = (svg: string): readonly Drawn[] => {
  const out: Drawn[] = []
  const groups: (string | null)[] = []
  for (const match of svg.matchAll(/<(\/?)([a-zA-Z]+)((?:[^<>"]|"[^"]*")*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match
    if (tag === 'g') {
      if (closing === '/') groups.pop()
      else if (selfClosing !== '/') groups.push(/data-zo="([^"]+)"/.exec(attrs as string)?.[1] ?? null)
      continue
    }
    if (closing === '/') continue
    out.push({ attrs: attrs as string, layers: groups.filter((one): one is string => one !== null) })
  }
  return out
}

const layerOrderOf = (svg: string): readonly string[] =>
  [...svg.matchAll(/data-zo="([^"]+)"/g)].map((one) => one[1] as string)

const layersOfFigure = (svg: string, figure: string): readonly (readonly string[])[] =>
  drawnElementsOf(svg)
    .filter((one) => one.attrs.includes(`data-figure="${figure}"`))
    .map((one) => one.layers)

const PROGRESS_LINE = 'progress-line'
const STATUS_LINE = 'status-line'

describe('CR-662 -- the words the cases below are written against', () => {
  it(`FR-110 still says 「${FR_110_EXCEPT_THE_PROGRESS_LINE}」`, () => {
    expect(PROGRESS_LINE_WORD.length).toBeGreaterThan(0)
    expect(elementOf('ZO-16'), 'ZO-16 holds the progress line').toContain(PROGRESS_LINE_WORD)
    expect(elementOf('ZO-16')).toContain(ZO_16_PLACE)
    expect(elementOf('ZO-8')).toBe(ZO_8_HOLDS)
    expect(elementOf('ZO-8'), 'ZO-8 no longer names the progress line').not.toContain(PROGRESS_LINE_WORD)
    expect(elementOf('ZO-13')).toContain(ZO_13_PLACE)
  })
})

for (const picture of ['screen', 'export'] as const) {
  describe(`CR-662 ZO-16 -- the progress line's layer (${picture} picture)`, () => {
    it(`ZO-16 「${ZO_16_PLACE}」: the progress line is drawn inside the ZO-16 layer only`, () => {
      const svg = pictureOf(SCENE, picture)
      const found = layersOfFigure(svg, PROGRESS_LINE)
      expect(found.length, 'premise: S-64 on with a status date draws the progress line').toBeGreaterThan(0)
      for (const layers of found) {
        expect(layers, ZO_16_PLACE).toContain('ZO-16')
        expect(layers, 'the progress line is not drawn in the ZO-8 layer').not.toContain('ZO-8')
      }
    })

    it(`ZO-16 「${ZO_16_PLACE}」: ZO-3 and ZO-5 are drawn before it, ZO-9 after it`, () => {
      const order = layerOrderOf(pictureOf(SCENE, picture))
      const here = order.indexOf('ZO-16')
      expect(here, 'the ZO-16 layer is drawn').toBeGreaterThanOrEqual(0)
      for (const behind of ['ZO-3', 'ZO-5']) {
        expect(order.indexOf(behind), `premise: ${behind} is drawn`).toBeGreaterThanOrEqual(0)
        expect(order.indexOf(behind), `${behind} behind ZO-16: ${ZO_16_PLACE}`).toBeLessThan(here)
      }
      expect(order.indexOf('ZO-9'), 'premise: the comment box layer ZO-9 is drawn').toBeGreaterThanOrEqual(0)
      expect(order.indexOf('ZO-9'), `ZO-9 in front of ZO-16: ${ZO_16_PLACE}`).toBeGreaterThan(here)
    })

    it(`FR-110 「${FR_110_EXCEPT_THE_PROGRESS_LINE}」: the progress line is the one line in front of the labels`, () => {
      const order = layerOrderOf(pictureOf(SCENE, picture))
      const labels = order.indexOf('ZO-5')
      const markers = order.indexOf('ZO-3')
      expect(order.indexOf('ZO-16')).toBeGreaterThan(labels)
      expect(order.indexOf('ZO-16')).toBeGreaterThan(markers)
      for (const line of ['ZO-4', 'ZO-8']) {
        expect(order.indexOf(line), `premise: ${line} is drawn`).toBeGreaterThanOrEqual(0)
        expect(order.indexOf(line), `${line} stays behind the labels`).toBeLessThan(labels)
      }
    })

    it(`ZO-8 「${ZO_8_HOLDS}」: the status line is still drawn in ZO-8`, () => {
      const found = layersOfFigure(pictureOf(SCENE, picture), STATUS_LINE)
      expect(found.length, 'premise: a status date draws the status line').toBeGreaterThan(0)
      for (const layers of found) {
        expect(layers, ZO_8_HOLDS).toContain('ZO-8')
        expect(layers).not.toContain('ZO-16')
      }
    })
  })
}

describe(`CR-662 -- 「${FR_110_ONE_TABLE}」: the export follows the same table`, () => {
  it('the exported picture draws the layers of the screen picture in the same order', () => {
    const onScreen = layerOrderOf(pictureOf(SCENE, 'screen'))
    const exported = layerOrderOf(pictureOf(SCENE, 'export'))
    const shared = onScreen.filter((one) => exported.includes(one))
    expect(shared, 'premise: both pictures carry ZO-16').toContain('ZO-16')
    expect(exported.filter((one) => shared.includes(one))).toEqual(shared)
  })

  it('control: with S-64 off there is no ZO-16 layer and no progress line', () => {
    const off: SceneWish = { ...SCENE, settings: { ...SCENE.settings, [PROGRESS_LINE_VISIBLE]: false } }
    for (const picture of ['screen', 'export'] as const) {
      const svg = pictureOf(off, picture)
      expect(layerOrderOf(svg)).not.toContain('ZO-16')
      expect(layersOfFigure(svg, PROGRESS_LINE)).toEqual([])
    }
  })
})
