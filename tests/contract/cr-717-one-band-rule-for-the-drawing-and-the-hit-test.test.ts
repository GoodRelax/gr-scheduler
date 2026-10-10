// CR-717, DFC-2161: the drawing and the hit test read one rule for whether a dependency line sits in the pinned band (FR-098, T-303 EL-4, EL-19, PI-6).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { dependencyLinkParts, linkKeyOf } from '../../src/adapter/svg-renderer/schedule-task-figures'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  answersAtPointer,
  grabSizesOf,
  pointerWalkOf,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout, isLinkInBand } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { drawnSettingsOf, regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { SCREEN, day, scheduleOf, taskOf } from '../unit/cr-430-cross-section-scene'

const ONE_RULE =
  '⭐ 依存線が帯の中に在るかの判じは 1 つとし、描く側と当たり判定（表 T-023d）が同じ判じを読むこと（MUST）'
const REQUIREMENTS = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')

const PINNED_UID = 1
const FAR_UID = 2
const PINNED_GROUP = 'gp'
const SCROLLING_GROUP = 'gs'

// WHY: the successor starts a year to the right, so only the predecessor's end is seen and the line is drawn as EL-4.
const TASKS = [
  taskOf({ uid: PINNED_UID, name: 'pinned', start: day(2), finish: day(6) }),
  taskOf({
    uid: FAR_UID,
    name: 'far',
    start: '2027-03-02T00:00:00',
    finish: '2027-03-06T00:00:00',
    dependencies: [{ predecessorUid: PINNED_UID, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] }],
  }),
]

const GROUP_OF: Readonly<Record<number, string>> = { [PINNED_UID]: PINNED_GROUP, [FAR_UID]: SCROLLING_GROUP }

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

interface Pt {
  readonly x: number
  readonly y: number
}

const build = () => {
  const base = scheduleOf({ tasks: TASKS })
  const schedule = {
    ...base,
    taskGroups: [group(PINNED_GROUP, 0), group(SCROLLING_GROUP, 1)],
    taskGroupMembers: TASKS.map((one) => {
      const uid = (one as unknown as { uid: number }).uid
      return { taskUid: uid, groupId: GROUP_OF[uid] }
    }),
  } as unknown as Schedule
  const settings = {
    ...SETTINGS_DEFAULTS,
    zoomX: 8,
    scrollDate: day(1),
    stackDirection: 'down',
    pinnedGroupIds: [PINNED_GROUP],
    scrollGroupId: SCROLLING_GROUP,
    scrollGroupOffset: 0,
  } as unknown as Parameters<typeof layoutFromSchedule>[1]
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  return { settings, geometry }
}

const SCENE = build()
const LINE = SCENE.geometry.dependencies[0]
const BAND = SCENE.geometry.pinnedBand
const LANDED = { predecessorUid: PINNED_UID, successorUid: FAR_UID }

// WHY: one line, so the layer it went to is the one list that is not empty.
const drawnInBand = (isLanding: boolean): boolean => {
  const parts = dependencyLinkParts({
    geometry: SCENE.geometry,
    settings: drawnSettingsOf(SCENE.settings as never),
    themed: () => '#000000',
    selectedLinks: new Set(),
    landingLink: isLanding && LINE !== undefined ? linkKeyOf(LINE) : null,
    haloCuts: [],
    arrowId: 'arrow',
    dependencyHaloMaskId: 'halo',
    width: SCREEN.width,
    height: SCREEN.height,
    skipsOffScreen: false,
    drawnFrom: 0,
    drawnTo: 0,
    drawnLeftOf: 0,
    drawnRightOf: 0,
  })
  expect(parts.depLinkParts.length + parts.depLinkPartsPinned.length).toBe(1)
  return parts.depLinkPartsPinned.length === 1
}

const answersAt = (at: Pt, isLanding: boolean): boolean => {
  const walk = pointerWalkOf(SCENE.geometry, grabSizesOf(), isLanding ? LANDED : null)
  const hit = answersAtPointer(walk, at.x, at.y).hit
  return hit !== null && hit.item.kind === 'dependency' && hit.item.successorUid === FAR_UID
}

// WHY: points along the drawn short line that lie above the band's foot and are not on the predecessor's bar.
const pointsInTheBand = (): readonly Pt[] => {
  if (LINE === undefined || BAND === undefined) return []
  const out: Pt[] = []
  const drawn = LINE.drawnPoints
  for (let at = 1; at < drawn.length; at++) {
    const from = drawn[at - 1]!
    const to = drawn[at]!
    for (const t of [0.25, 0.5, 0.75, 1]) {
      const one = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
      if (one.y < BAND.scrollTop - 1) out.push(one)
    }
  }
  return out.filter((one) => !answersAtPointer(pointerWalkOf(SCENE.geometry, grabSizesOf()), one.x, one.y).hit?.item.kind.startsWith('task'))
}

describe('CR-717 / DFC-2161: one band rule for the drawing and the hit test (FR-098, EL-4, EL-19, PI-6)', () => {
  it('FR-098 the clause this file is driven by still stands', () => {
    expect(REQUIREMENTS).toContain(ONE_RULE)
  })

  it('FR-098 premise: the predecessor is pinned, the line is drawn as EL-4, and part of it lies in the band', () => {
    expect(BAND).toBeDefined()
    expect(LINE?.elision).toBe('EL-4')
    expect(BAND?.pinnedTaskUids.has(PINNED_UID)).toBe(true)
    expect(pointsInTheBand().length).toBeGreaterThan(0)
  })

  it('EL-4 / FR-098 the short line from a pinned predecessor is drawn in the band, and answers there', () => {
    expect(drawnInBand(false)).toBe(true)
    for (const at of pointsInTheBand()) expect(answersAt(at, false)).toBe(true)
  })

  it('EL-19 / FR-098 the landed line is drawn below the band, and does not answer in it (DFC-2161)', () => {
    expect(drawnInBand(true)).toBe(false)
    for (const at of pointsInTheBand()) expect(answersAt(at, true)).toBe(false)
  })

  it('FR-098 / PI-6 at every point in the band, the hit test answers exactly where the drawing puts the line in the band', () => {
    for (const isLanding of [false, true]) {
      const inBand = drawnInBand(isLanding)
      for (const at of pointsInTheBand()) expect(answersAt(at, isLanding)).toBe(inBand)
    }
  })

  it('PI-6 the published rule is the one both read: in the band unless the line is drawn whole', () => {
    if (LINE === undefined) throw new Error('the scene holds no dependency line')
    expect(isLinkInBand(BAND, LINE, false)).toBe(true)
    expect(isLinkInBand(BAND, LINE, true)).toBe(false)
    expect(isLinkInBand(undefined, LINE, false)).toBe(false)
  })
})
