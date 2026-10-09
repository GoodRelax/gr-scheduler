// DFC-2160: a range pick and a dependency end pick in the pinned band reach only what the band shows (FR-098, T-303 EL-1, T-023c SL-3).

import { describe, expect, it } from 'vitest'

import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { dependencyEndAtPointer, itemsInMarquee } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule, taskPlacement } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { SCREEN, day, scheduleOf, taskOf } from '../unit/cr-430-cross-section-scene'

const PINNED_UID = 1
const HIDDEN_UID = 2
const SHOWN_UID = 3

const PINNED_GROUP = 'gp'
const HIDDEN_GROUP = 'gh'
const SHOWN_GROUP = 'gs'

const TASKS = [
  taskOf({ uid: PINNED_UID, name: 'pinned', start: day(2), finish: day(6) }),
  taskOf({ uid: HIDDEN_UID, name: 'hidden', start: day(10), finish: day(14) }),
  taskOf({ uid: SHOWN_UID, name: 'shown', start: day(18), finish: day(22) }),
]

const GROUP_OF: Readonly<Record<number, string>> = {
  [PINNED_UID]: PINNED_GROUP,
  [HIDDEN_UID]: HIDDEN_GROUP,
  [SHOWN_UID]: SHOWN_GROUP,
}

// WHY: the view's top is the third row, so the second row lies wholly above it -- under the pinned band.
const SCROLLED = {
  zoomX: 8,
  scrollDate: day(1),
  stackDirection: 'down',
  pinnedGroupIds: [PINNED_GROUP],
  scrollGroupId: SHOWN_GROUP,
  scrollGroupOffset: 0,
}

const group = (id: string, order: number): unknown => ({
  id,
  parentId: null,
  label: id,
  derivedFromTaskUid: null,
  order,
  treeState: 'auto',
  color: null,
  minHeight: null,
})

const build = () => {
  const base = scheduleOf({ tasks: TASKS })
  const schedule = {
    ...base,
    taskGroups: [group(PINNED_GROUP, 0), group(HIDDEN_GROUP, 1), group(SHOWN_GROUP, 2)],
    taskGroupMembers: TASKS.map((one) => ({ taskUid: (one as unknown as { uid: number }).uid, groupId: GROUP_OF[(one as unknown as { uid: number }).uid] })),
  } as unknown as Schedule
  const settings = { ...SETTINGS_DEFAULTS, ...SCROLLED } as unknown as Parameters<typeof layoutFromSchedule>[1]
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  return { regions, layout, geometry }
}

interface Band {
  readonly scrollTop: number
}

const SCENE = build()
const bandBottom = (SCENE.geometry as unknown as { pinnedBand?: Band }).pinnedBand?.scrollTop

const placement = (uid: number): { readonly x: number; readonly y: number; readonly width: number; readonly planHeight: number } => {
  const found = taskPlacement(SCENE.layout, uid)
  if (found === null) throw new Error(`task ${uid} was not placed`)
  return found as unknown as { readonly x: number; readonly y: number; readonly width: number; readonly planHeight: number }
}

describe('DFC-2160: what the pinned band shows is all a pick in it can reach (FR-098, EL-1, SL-3)', () => {
  it('FR-098 premise: the hidden row lies above the foot of the pinned band', () => {
    expect(bandBottom).toBeDefined()
    const hidden = placement(HIDDEN_UID)
    expect(hidden.y + hidden.planHeight).toBeLessThanOrEqual(bandBottom as number)
    const drawn = (SCENE.geometry as unknown as { tasks: readonly { taskUid: number }[] }).tasks
    expect(drawn.map((one) => one.taskUid)).toContain(HIDDEN_UID)
  })

  const bandMarquee = (): { x: number; y: number; width: number; height: number } => {
    const area = (SCENE.regions as unknown as { taskGroupArea: { x: number; y: number; width: number } }).taskGroupArea
    return { x: area.x, y: area.y, width: area.width, height: (bandBottom as number) - area.y }
  }

  it('SL-3 / FR-098 a range pick over the band takes the pinned task it shows', () => {
    const picked = itemsInMarquee(SCENE.geometry, bandMarquee())
    expect(picked).toContainEqual({ kind: 'task', taskUid: PINNED_UID })
  })

  it('SL-3 / EL-1 / FR-098 a range pick over the band does not take a task hidden under it (DFC-2160)', () => {
    const picked = itemsInMarquee(SCENE.geometry, bandMarquee())
    expect(picked).not.toContainEqual({ kind: 'task', taskUid: HIDDEN_UID })
  })

  const middleOf = (uid: number): { x: number; y: number } => {
    const one = placement(uid)
    return { x: one.x + one.width / 2, y: one.y + one.planHeight / 2 }
  }

  it('EL-1 / FR-098 a press in the band on the pinned task answers its end', () => {
    const at = middleOf(PINNED_UID)
    expect(dependencyEndAtPointer(SCENE.geometry, at.x, at.y, null)?.taskUid).toBe(PINNED_UID)
  })

  it('EL-1 / FR-098 a press in the band where a hidden task would stand answers no end (DFC-2160)', () => {
    const at = middleOf(HIDDEN_UID)
    expect(dependencyEndAtPointer(SCENE.geometry, at.x, at.y, null)).toBeNull()
  })
})
