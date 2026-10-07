// DFC-1015: the highlight box draws around the rows the screen shows, so hiding an end row shrinks it (FR-019, UC-008 4a).

import { describe, expect, it } from 'vitest'

import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { SCREEN, day, scheduleOf, taskOf } from '../unit/cr-430-cross-section-scene'

const GROUPS = ['ga', 'gb', 'gc', 'gd', 'ge'] as const
type GroupId = (typeof GROUPS)[number]

const TASKS = GROUPS.map((_, index) => taskOf({ uid: index + 1, name: `task ${index + 1}`, start: day(3), finish: day(9) }))

const BOX = {
  id: 'h1',
  startDate: '2026-03-02',
  endDate: '2026-03-12',
  topGroupId: 'gb',
  bottomGroupId: 'gd',
  strokeColor: null,
  cornerRadiusPx: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
}

interface Frame {
  readonly y: number
  readonly height: number
}

interface RowAt {
  readonly groupId: string
  readonly y: number
  readonly height: number
}

const sceneWith = (hidden: readonly GroupId[], box: Readonly<Record<string, unknown>> = BOX) => {
  const base = scheduleOf({ tasks: TASKS, highlightBoxes: [box] })
  const schedule = {
    ...base,
    taskGroups: GROUPS.map((id, order) => ({
      id,
      parentId: null,
      label: id,
      derivedFromTaskUid: null,
      order,
      treeState: hidden.includes(id) ? 'hidden' : 'auto',
      color: null,
      minHeight: null,
    })),
    taskGroupMembers: TASKS.map((one, index) => ({ taskUid: (one as unknown as { uid: number }).uid, groupId: GROUPS[index] })),
  } as unknown as Schedule
  const settings = { ...SETTINGS_DEFAULTS, zoomX: 8, scrollDate: day(1), stackDirection: 'down' } as unknown as Parameters<typeof layoutFromSchedule>[1]
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  const rows = (layout as unknown as { rows: readonly RowAt[] }).rows
  const frames = (geometry as unknown as { highlightBoxes: readonly { box: Frame }[] }).highlightBoxes
  const rowOf = (id: GroupId): RowAt => {
    const found = rows.find((one) => one.groupId === id)
    if (found === undefined) throw new Error(`row ${id} is not drawn`)
    return found
  }
  return { rowOf, frame: frames[0]?.box, rows }
}

describe('DFC-1015: the frame closes round the rows the screen shows (FR-019, UC-008 4a)', () => {
  it('FR-019 premise: with every row shown the frame spans the stored top to the stored bottom row', () => {
    const shown = sceneWith([])
    expect(shown.frame?.y).toBeCloseTo(shown.rowOf('gb').y, 3)
    const bottom = shown.rowOf('gd')
    expect((shown.frame?.y ?? 0) + (shown.frame?.height ?? 0)).toBeCloseTo(bottom.y + bottom.height, 3)
  })

  it('FR-019 hiding the bottom end row ends the frame at the last shown row of the range (DFC-1015)', () => {
    const hidden = sceneWith(['gd'])
    const last = hidden.rowOf('gc')
    expect((hidden.frame?.y ?? 0) + (hidden.frame?.height ?? 0)).toBeCloseTo(last.y + last.height, 3)
  })

  it('FR-019 hiding the bottom end row makes the frame shorter, never taller (DFC-1015)', () => {
    expect(sceneWith(['gd']).frame?.height).toBeLessThan(sceneWith([]).frame?.height ?? 0)
  })

  it('FR-019 hiding the top end row starts the frame at the first shown row of the range (DFC-1015)', () => {
    const hidden = sceneWith(['gb'])
    expect(hidden.frame?.y).toBeCloseTo(hidden.rowOf('gc').y, 3)
  })

  it('FR-019 the frame never reaches a row outside the shown screen rows (DFC-1015)', () => {
    const hidden = sceneWith(['gd'])
    const bottomOfScreen = Math.max(...hidden.rows.map((one) => one.y + one.height))
    expect((hidden.frame?.y ?? 0) + (hidden.frame?.height ?? 0)).toBeLessThanOrEqual(bottomOfScreen + 1e-6)
  })
})
