// Unit tests: the shipped startup template draws its task group hierarchy on its very first frame.

import { describe, expect, it } from 'vitest'
import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { specTable } from '../contract/spec-table'
import { SETTINGS_CONSTANTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import { dayOf, type Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  groupDepthLimit,
  layoutFromSchedule,
  xFromDay,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  drawnSettingsOf,
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import type { DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import {
  commandFromInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { displayRatioAt } from '../fixtures/display-scale'
import { settingNumber } from '../fixtures/setting-number'

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

type Loose = Record<string, unknown>

// Spec: FR-027, BT-4
const template = (): Document =>
  JSON.parse(readRepoFile(TEMPLATE_PATH, 'utf8')) as unknown as Document

const TEMPLATE = template()
const SETTINGS = TEMPLATE.documentSettings as DocumentSettings
const SCHEDULE = TEMPLATE.schedule as Schedule

const GROUPS = (SCHEDULE as unknown as Loose)['taskGroups'] as readonly Loose[]
const TASKS = (SCHEDULE as unknown as Loose)['tasks'] as readonly Loose[]

const rowOf = (tableId: string, specTableRowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === specTableRowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${specTableRowId}`)
  return found.by
}

const firstNumberOf = (cell: string): number => {
  const hit = /[0-9]+(?:\.[0-9]+)?/.exec(cell)
  if (hit === null) throw new Error(`no figure in the cell: ${cell}`)
  return Number(hit[0])
}

const TP_8 = rowOf('T-226', 'TP-8')

// Summary: depthByParent() counts a root as depth 1, the sense TaskGroupPlacement.depth publishes.
function depthByParent(
  rows: readonly Loose[],
  keyOf: (row: Loose) => unknown,
  parentOf: (row: Loose) => unknown,
): number {
  const byKey = new Map<unknown, Loose>(
    rows.map((row): [unknown, Loose] => [keyOf(row), row]),
  )
  let deepest = 0
  for (const row of rows) {
    let depth = 1
    let walk: Loose | undefined = row
    // Why: bounded by the row count: IV-2 forbids a cycle, and a bound makes a broken
    // artifact fail here instead of hanging.
    while (walk !== undefined && depth <= rows.length) {
      const parent = parentOf(walk)
      if (parent === null || parent === undefined) break
      const above = byKey.get(parent)
      // Why: a parent that resolves to nothing is an IV-2 break; counting it as a
      // level would hide that behind a depth one too deep.
      expect(above, `a parent reference resolves to no task group: ${String(parent)}`).toBeDefined()
      walk = above
      depth += 1
    }
    deepest = Math.max(deepest, depth)
  }
  return deepest
}

const taskGroupForestDepth = (): number =>
  depthByParent(GROUPS, (row) => row['id'], (row) => row['parentId'])

const wbsDepth = (): number =>
  depthByParent(TASKS, (row) => row['uid'], (row) => row['parentTaskUid'])

// Why: no case's answer is a figure of this window: FR-018 depths follow zoomY
// alone, and the one Task Group Area case re-measures from these regions.
const SCREEN: ScreenEnvironment = {
  width: 1920,
  height: 1080,
  appHeaderHeight: 48,
  scrollbarThickness: 8,
  propertyPanelWidth: 0,
}

const REGIONS: ScreenRegions = regionsFromScreen(SCREEN, SETTINGS)

// Why: the last argument tells the boot the document came from BT-4, which OP-10
// excludes; a BT-1 or BT-2 boot, where OP-10 is in force, leaves it unset.
const bootFrame = (() => {
  const painted: string[] = []
  const loop = frameLoop(
    { showMarqueeOverlaySvg: () => undefined, showSvg: (one: string) => painted.push(one) },
    template(),
    SCREEN,
    undefined,
    undefined,
    undefined,
    undefined,
    true,
  )
  const values = loop.current()
  if (values === null) throw new Error('BO-1 settled no size, so no frame was drawn')
  return { values, held: loop.document(), painted }
})()

const deepestDrawn = (layout: ScheduleLayout): number =>
  layout.taskGroups.reduce((deepest, taskGroup) => Math.max(deepest, taskGroup.depth), 0)

const drawnDepths = (layout: ScheduleLayout): number[] =>
  [...new Set(layout.taskGroups.map((taskGroup) => taskGroup.depth))].sort((a, b) => a - b)

// Spec: OP-10
// Trap: the shipped template answers the same day with finish, actualFinish or
// resume added, so no case here catches a column OP-10 excludes.
const TASK_DATE_COLUMNS = ['start', 'actualStart'] as const

const firstDayCovered = (): string => {
  const days: string[] = []
  for (const task of TASKS) {
    for (const column of TASK_DATE_COLUMNS) {
      const value = task[column]
      if (typeof value === 'string' && dayOf(value) !== null) days.push(value)
    }
  }
  expect(days.length, 'the template covers days at all').toBeGreaterThan(0)
  return days.reduce((earliest, one) => (one < earliest ? one : earliest))
}

// Why: not GROUPS[0]: the artifact's array order is no row of any table; LC-9's
// tree order reaches the root with the lowest order first (AT-55).
const headOfTaskGroupTree = (): unknown => {
  const roots = GROUPS.filter((row) => row['parentId'] === null || row['parentId'] === undefined)
  expect(roots.length, 'TP-4 makes the top level a forest, so it has at least one root').toBeGreaterThan(0)
  const first = roots.reduce((earliest, one) =>
    (one['order'] as number) < (earliest['order'] as number) ? one : earliest,
  )
  return first['id']
}

const taskGroupsInFirstScreenful = (layout: ScheduleLayout) =>
  layout.taskGroups.filter(
    (taskGroup) =>
      taskGroup.y < REGIONS.taskGroupArea.y + REGIONS.taskGroupArea.height && taskGroup.y + taskGroup.height > REGIONS.taskGroupArea.y,
  )

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
// Why: SK-18 of table T-036 prints its key upper case, and so does this press.
const PRESS_F: KeyInput = { kind: 'key', key: 'F', modifiers: NO_MODS }

// Why: the answer FR-055 owes is read off the CM-71 write, since no row says which
// component holds the loop that runs table T-068 up to twice.
function fitWrite(settings: DocumentSettings): Record<string, unknown> {
  const layout = layoutFromSchedule(SCHEDULE, settings, REGIONS)
  const context = {
    document: { ...TEMPLATE, documentSettings: settings },
    layout,
    geometry: geometryFromLayout(SCHEDULE, settings, layout, REGIONS, emptySelection(), null),
    regions: REGIONS,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    // Why: S-53 arrives as a value; no case here reads it, so it is deliberately
    // not the figure the manuscript prints.
    zoomStep: 3,
    pressed: null,
    isTextEntryUnsettled: false,
    isDualCursorMode: false,
    today: '2026-04-01T00:00:00',
    newTaskGroupId: 'task-group-minted-outside',
  } as unknown as InputContext

  const answer = commandFromInput(PRESS_F, context)
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') {
    throw new Error('SK-18 owes a changeDocument and this press did not ask for one')
  }
  const writes = (action.writes as readonly (readonly DocumentCommand[])[])
    .flat()
    .filter((one) => one.kind === 'fitScheduleToScreen')
  expect(writes, 'exactly one CM-71 per press (FR-031)').toHaveLength(1)
  return writes[0] as unknown as Record<string, unknown>
}

// Why: bisection, not S-87's expression: only where the rung stands matters, and
// S-88 above one keeps the ladder monotone in zoomY.
// Summary: rungOf() returns the smallest zoomY at which FR-018 admits a depth, between S-97 and S-98.
function rungOf(depth: number, settings: DocumentSettings): number {
  let below = NOT_STORED_ZOOM_BOUNDS['S-97']
  let above = NOT_STORED_ZOOM_BOUNDS['S-98']
  expect(groupDepthLimit(drawnSettingsOf({ ...settings, zoomY: above })), 'S-98 must admit the depth').toBeGreaterThanOrEqual(depth)
  expect(groupDepthLimit(drawnSettingsOf({ ...settings, zoomY: below })), 'S-97 must not').toBeLessThan(depth)
  for (let step = 0; step < 60; step++) {
    const middle = (below + above) / 2
    if (groupDepthLimit(drawnSettingsOf({ ...settings, zoomY: middle })) >= depth) above = middle
    else below = middle
  }
  return above
}

// Spec: TP-8, T-226
describe('TP-8 of table T-226 -- the shipped template on both axes', () => {
  it('gives the task group forest the number of levels the cell writes', () => {
    expect(taskGroupForestDepth()).toBe(firstNumberOf(TP_8['値'] ?? ''))
  })

  it('gives the WBS the same number, which is what 「同じ ... に揃える」 asks', () => {
    // Why: TP-8 levels the two axes for this document only; 5.4 keeps them apart as a
    // rule, so the case compares both counts rather than assuming one implies the other.
    expect(wbsDepth()).toBe(firstNumberOf(TP_8['値'] ?? ''))
    expect(wbsDepth()).toBe(taskGroupForestDepth())
  })

  it('really does hang most Tasks off a parent task, so the second axis is not one level wearing five', () => {
    // Why: five Tasks in one chain and 995 roots would pass the case above; TP-8 means
    // the document is built on the axis.
    const parented = TASKS.filter((task) => task['parentTaskUid'] !== null).length
    expect(parented).toBeGreaterThan(TASKS.length - parented)
  })

  it('ships nothing collapsed and nothing hidden, so what is undrawn is FR-018 doing it', () => {
    // Why: HR-1a takes a collapsed task group's children out and HR-6 a hidden branch,
    // so either would remove task groups the level of detail never touched.
    expect(GROUPS.filter((row) => row['treeState'] === 'collapsed')).toHaveLength(0)
    expect(GROUPS.filter((row) => row['treeState'] === 'hidden')).toHaveLength(0)
  })
})

// Spec: OP-10, S-77, S-78
describe('OP-10 (MUST NOT) -- the template carries no place of its own', () => {
  it('ships no day, because OP-10 forbids giving it one', () => {
    expect(SETTINGS.scrollDate).toBeNull()
  })

  it('ships no row id either, for the same MUST NOT', () => {
    expect(SETTINGS.scrollTaskGroupId).toBeNull()
  })

  it('so both halves of OP-10 condition are met, and only the BT-4 exclusion keeps the fit off', () => {
    expect(SETTINGS.scrollDate === null || SETTINGS.scrollTaskGroupId === null).toBe(true)
  })
})

// Spec: FR-018, FR-094, OP-10, LC-9, BO-3
describe('FR-018 -- the depths the first frame of the shipped template draws', () => {
  it('draws task groups deeper than the first level', () => {
    expect(deepestDrawn(bootFrame.values.layout)).toBeGreaterThan(1)
  })

  // Spec: IMPS-1019
  it('starts at the head of the task group tree, drawn from the top of the Task Group Area', () => {
    const first = bootFrame.values.layout.taskGroups[0]
    expect(first, 'the boot drew task groups at all').toBeDefined()
    expect(first?.taskGroupId).toBe(headOfTaskGroupTree())
    expect(first?.y).toBe(REGIONS.taskGroupArea.y)
  })

  it('⭐ puts a task group deeper than the first level into the FIRST SCREENFUL, not merely into the layout', () => {
    const drawn = bootFrame.values.layout
    expect(drawn.contentHeight, 'TP-5 keeps this document taller than the Task Group Area').toBeGreaterThan(
      REGIONS.taskGroupArea.height,
    )

    const seen = taskGroupsInFirstScreenful(drawn)
    expect(seen.length, 'the Task Group Area is not empty').toBeGreaterThan(0)
    expect(
      seen.reduce((deepest, taskGroup) => Math.max(deepest, taskGroup.depth), 0),
      'the first screenful is not seven roots',
    ).toBeGreaterThan(1)
  })

  it('⭐ and a parent stands directly above its own child there, which is what 「木の順」 means', () => {
    // Why: measured on the task groups a person sees, so a tree order that holds only
    // far down the document fails.
    const seen = taskGroupsInFirstScreenful(bootFrame.values.layout)
    const parentOf = new Map(GROUPS.map((row) => [row['id'], row['parentId']]))
    const pairs = seen.filter(
      (taskGroup, index) => index > 0 && parentOf.get(taskGroup.taskGroupId) === seen[index - 1]?.taskGroupId,
    )
    expect(pairs.length, 'no child follows its own parent in the first screenful').toBeGreaterThan(0)
  })

  it('draws exactly the depths the ladder admits at the stored zoomY, and none deeper', () => {
    const admitted = groupDepthLimit(drawnSettingsOf(SETTINGS))
    expect(admitted, 'the ladder admits more than the first level at the stored zoom').toBeGreaterThan(1)

    const owed: number[] = []
    for (let depth = 1; depth <= Math.min(admitted, taskGroupForestDepth()); depth++) owed.push(depth)
    expect(drawnDepths(bootFrame.values.layout)).toEqual(owed)
  })

  it('draws the left edge at the first day the document covers, and one day at the width S-1 x S-75 gives it', () => {
    const first = dayOf(firstDayCovered())
    expect(first, 'the template covers a day').not.toBeNull()
    expect(xFromDay(bootFrame.values.layout, first!)).toBeCloseTo(
      bootFrame.values.regions.taskGroupArea.x + settingNumber('S-134') / 2 + settingNumber('S-268') / 2,
      6,
    )
    expect(
      bootFrame.values.layout.pxPerDay,
      'FR-039 の 表 T-252 の DS-4: S-1 x S-75 に、その文書の表示の倍率の描く比を掛けた幅',
    ).toBe(SETTINGS_CONSTANTS.pxPerDayAt1x * SETTINGS.zoomX * displayRatioAt(SETTINGS.displayScale))
  })

  // Spec: HF-8, OP-10
  it('HF-8 (MUST NOT): boot discards nothing -- the shipped settings still say what they said', () => {
    const held = bootFrame.held.documentSettings as DocumentSettings
    expect(held.scrollDate).toBe(SETTINGS.scrollDate)
    expect(held.scrollTaskGroupId).toBe(SETTINGS.scrollTaskGroupId)
    expect(held.zoomX).toBe(SETTINGS.zoomX)
    expect(held.zoomY).toBe(SETTINGS.zoomY)
    expect(
      (bootFrame.held.schedule as unknown as Loose)['taskGroups'] as readonly Loose[],
    ).toEqual(GROUPS)
  })
})

// Spec: FR-055, OP-10
describe('FR-055 -- one press still answers the first level on this document', () => {
  it('has no second level to take: its drawing overruns the Task Group Area at its own rung', () => {
    const rung = rungOf(2, SETTINGS)
    const drawn = layoutFromSchedule(SCHEDULE, { ...SETTINGS, zoomY: rung }, REGIONS)

    expect(deepestDrawn(drawn), 'the rung really does open the second level').toBe(2)
    expect(drawn.contentHeight).toBeGreaterThan(REGIONS.taskGroupArea.height)
  })

  it('answers the first level, because it is the deepest one that fits', () => {
    // Why: the landing zoomY is not asserted: FR-018 gives depth 1 no rung, so
    // FR-055's MUST NOT bounds the zoom from below only.
    const write = fitWrite(SETTINGS)
    const drawn = layoutFromSchedule(
      SCHEDULE,
      { ...SETTINGS, zoomY: write['zoomY'] as number },
      REGIONS,
    )

    expect(deepestDrawn(drawn)).toBe(1)
    // Why: FR-055 allows a gap under the drawing, so the case says nothing of how
    // much of the Task Group Area the answer uses.
  })

  // Why: the fit is not asked to change: it answers FR-055 rightly on a template T-226 makes
  // larger than the MC-7 scale GL-002 is judged at.
  it('so the fit and the BT-4 boot are two different pictures, which is why the exclusion is what shows the depth', () => {
    const write = fitWrite(SETTINGS)
    const afterFit = layoutFromSchedule(
      SCHEDULE,
      { ...SETTINGS, zoomY: write['zoomY'] as number },
      REGIONS,
    )
    expect(deepestDrawn(afterFit)).toBeLessThan(deepestDrawn(bootFrame.values.layout))
  })
})
