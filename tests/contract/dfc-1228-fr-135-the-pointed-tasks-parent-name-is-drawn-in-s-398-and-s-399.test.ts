// DFC-1228: while a Task is pointed in family view, its parent's name label is drawn in S-398 and S-399; otherwise it is not (FR-135).

import { describe, expect, it } from 'vitest'

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { ScheduleLayout } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { C, D, F, P, Q, cellOf, numberIn, rowText, sceneOf, type FamiliesSpec } from '../unit/cr-631-scene'
import { figuresKeyed } from '../fixtures/svg-selected-scene'

// see T-236
const S_398 = /#[0-9a-f]{6}/i.exec(rowText('T-236', 'S-398'))?.[0] ?? ''
const S_399 = numberIn(cellOf('T-206', 'S-399', '既定'))
const S_245 = numberIn(cellOf('T-206', 'S-245', '既定'))

const labelOf = (spec: FamiliesSpec | null, uid: number): Readonly<Record<string, string>> => {
  const scene = sceneOf(spec)
  const svg = svgFromSchedule(
    scene.schedule,
    scene.settings as never,
    scene.context.layout as ScheduleLayout,
    scene.geometry,
    scene.context.regions as ScreenRegions,
    emptySelection(),
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
  const labels = figuresKeyed(svg, `task-${uid}-label`)
  expect(labels.length, `task ${uid} has a name label`).toBeGreaterThan(0)
  return labels[0]!
}

describe('DFC-1228: the parent name label of the pointed Task (FR-135, S-398, S-399)', () => {
  it('S-398 premise: the color is read from the table', () => {
    expect(S_398).not.toBe('')
  })

  it('FR-135 a stated parent: pointing F draws the name of P in the S-398 color', () => {
    expect(labelOf({ ownerUids: [], pointedUid: F }, P)['fill']).toBe(S_398)
  })

  it('FR-135 a stated parent: pointing F draws the name of P in the S-399 weight', () => {
    expect(Number(labelOf({ ownerUids: [], pointedUid: F }, P)['font-weight'])).toBe(S_399)
  })

  it('FR-135 a derived parent: pointing D draws the name of Q in the S-398 color and the S-399 weight', () => {
    const label = labelOf({ ownerUids: [], pointedUid: D }, Q)
    expect(label['fill']).toBe(S_398)
    expect(Number(label['font-weight'])).toBe(S_399)
  })

  it('FR-135 the other names stay in the ordinary ink and the S-245 weight while a parent is shown', () => {
    const other = labelOf({ ownerUids: [], pointedUid: F }, C)
    expect(other['fill']).not.toBe(S_398)
    expect(Number(other['font-weight'])).toBe(S_245)
  })

  it('FR-135 with no Task pointed and no family view, no name is drawn in S-398', () => {
    expect(labelOf(null, P)['fill']).not.toBe(S_398)
    expect(Number(labelOf(null, P)['font-weight'])).toBe(S_245)
  })
})
