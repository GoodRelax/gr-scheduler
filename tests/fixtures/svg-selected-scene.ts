// A drawn picture of the cr-430 scene with any Selection chosen, for the tests that read the SVG text.

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import type { Selection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { SCREEN, sceneOf, scheduleOf, type SceneWish } from '../unit/cr-430-cross-section-scene'

// WHY: the scene's own selection is ignored, so a test can choose a statusLine or a box, which SceneWish cannot.
export const svgSelecting = (wish: SceneWish, selection: Selection): string => {
  const scene = sceneOf(wish)
  const schedule = scheduleOf(wish)
  const regions = regionsFromScreen(SCREEN, scene.settings)
  const layout = layoutFromSchedule(schedule, scene.settings, regions)
  const geometry = geometryFromLayout(schedule, scene.settings, layout, regions, selection, wish.dualCursor ?? null)
  return svgFromSchedule(
    schedule,
    scene.settings,
    layout,
    geometry,
    regions,
    selection,
    'screen',
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

// WHY: the picture names a figure by data-figure; this reads the attributes of every element carrying one key.
export const figuresKeyed = (svg: string, key: string): readonly Readonly<Record<string, string>>[] => {
  const out: Record<string, string>[] = []
  for (const tag of svg.matchAll(/<[a-z]+\b[^>]*\/?>/g)) {
    if (!tag[0].includes(`data-figure="${key}"`)) continue
    const attributes: Record<string, string> = {}
    for (const one of tag[0].matchAll(/([a-z-]+)="([^"]*)"/g)) attributes[one[1]!] = one[2]!
    out.push(attributes)
  }
  return out
}
