// CR-862 spec-only cases: a pinned task group is drawn even when it or an ancestor is hidden or collapsed (TD-2, TD-3).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import { blankTaskVisual } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule, type ScheduleLayout } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { searchJumpWrites } from '../../src/use-case/edit-document/edit-document'
import { SCREEN, shell, taskGroupDocument, taskOf, type ShellBench, type TaskGroupSeed } from '../unit/cr-541-stage'
import { specTable } from './spec-table'

type TreeState = 'auto' | 'collapsed' | 'expanded' | 'temporarilyExpanded' | 'hidden'
type Loose = Record<string, any>

const CR_862 = readFileSync(
  join(process.cwd(), 'change-request', 'CR-862-a-pinned-task-group-is-drawn-even-when-hidden.md'),
  'utf8',
)

const cellsOf = (table: string, id: string): string => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found.cells.join(' | ')
}

// Spec: T-109, S-126
const TASK_GROUP_PANEL = 'Task Group Panel'
const APP_HEADER = 'App Header'
const OPEN_ONE_LEVEL = 'IC-90'
const OPEN_ALL_BELOW = 'IC-58'
const ADD_CHILD = 'IC-91'
const HIDE = 'IC-59'
const FOLD_BELOW = 'IC-77'
const UNDO = 'IC-5'
const PINNED_KEY = 'pinnedTaskGroupIds'

// Spec: S-87, S-88
const thresholdOf = (depth: number): number =>
  SETTINGS_CONSTANTS.groupLevelOfDetailBase * SETTINGS_CONSTANTS.groupLevelOfDetailRatio ** (depth - 2)

// Why: X > A > P > {K1 > K1a, K2}, and a second root Y > Y1. P is the pinned task group at depth 3.
const X = 'c8620000-0000-4000-8000-000000000001'
const A = 'c8620000-0000-4000-8000-000000000002'
const P = 'c8620000-0000-4000-8000-000000000003'
const K1 = 'c8620000-0000-4000-8000-000000000004'
const K1a = 'c8620000-0000-4000-8000-000000000005'
const K2 = 'c8620000-0000-4000-8000-000000000006'
const Y = 'c8620000-0000-4000-8000-000000000007'
const Y1 = 'c8620000-0000-4000-8000-000000000008'
const TREE: readonly { readonly id: string; readonly parentId: string | null }[] = [
  { id: X, parentId: null },
  { id: A, parentId: X },
  { id: P, parentId: A },
  { id: K1, parentId: P },
  { id: K1a, parentId: K1 },
  { id: K2, parentId: P },
  { id: Y, parentId: null },
  { id: Y1, parentId: Y },
]
const NAMES: Readonly<Record<string, string>> = { [X]: 'X', [A]: 'A', [P]: 'P', [K1]: 'K1', [K1a]: 'K1a', [K2]: 'K2', [Y]: 'Y', [Y1]: 'Y1' }
const ID_OF: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(NAMES).map(([id, name]) => [name, id]))
// Why: taskGroupDocument lays one task per task group, uid = position + 1.
const TASK_OF: Readonly<Record<string, number>> = Object.fromEntries(TREE.map((one, index) => [NAMES[one.id]!, index + 1]))

const named = (ids: readonly string[]): string[] => ids.map((id) => NAMES[id] ?? id)
const sortedNames = (ids: readonly string[]): string[] => named(ids).sort()

interface Arranged {
  readonly zoomY: number
  readonly states?: Readonly<Record<string, TreeState>>
  readonly pinned?: readonly string[]
  readonly levelZero?: 'auto' | 'collapsed'
}

const seedsOf = (arranged: Arranged): TaskGroupSeed[] =>
  TREE.map((one) => ({ ...one, treeState: arranged.states?.[NAMES[one.id]!] ?? 'auto' }))

function documentOf(arranged: Arranged, schedule: Loose = {}): Loose {
  return taskGroupDocument(
    seedsOf(arranged),
    {
      zoomY: arranged.zoomY,
      scrollTaskGroupId: X,
      levelZeroTreeState: arranged.levelZero ?? 'auto',
      [PINNED_KEY]: (arranged.pinned ?? []).map((name) => ID_OF[name]!),
    },
    schedule,
  )
}

const ENVIRONMENT = { ...SCREEN, propertyPanelWidth: 0 }

function layoutOfDocument(doc: Loose, shown: readonly number[] | null = null): ScheduleLayout {
  const regions = regionsFromScreen(ENVIRONMENT as never, doc.documentSettings)
  return layoutFromSchedule(doc.schedule, doc.documentSettings, regions, undefined, undefined, shown === null ? null : new Set(shown))
}

const drawnOf = (arranged: Arranged, shown: readonly number[] | null = null): string[] =>
  layoutOfDocument(documentOf(arranged), shown).taskGroups.map((one) => one.taskGroupId)

const benches: ShellBench[] = []
afterEach(() => {
  for (const bench of benches.splice(0, benches.length).reverse()) bench.restore()
})
const stageOf = (doc: Loose): ShellBench => {
  const bench = shell(doc)
  benches.push(bench)
  return bench
}
const drawnIn = (bench: ShellBench): string[] => (bench.loop.current()?.layout.taskGroups ?? []).map((one) => one.taskGroupId)
const statesIn = (bench: ShellBench): Record<string, string> =>
  Object.fromEntries(bench.groups().map((one: Loose) => [NAMES[one.id] ?? one.id, one.treeState]))

describe('CR-862 -- the manuscript these cases are driven by', () => {
  it('CR-862 names the rulings it applies and the rows it changes', () => {
    for (const token of ['JDG-3804', 'JDG-3811', '`TD-2`', '`TD-3`', '`TD-5`', '`HF-14`', '`EL-20`', '`SJ-2`']) {
      expect(CR_862, `CR-862 mentions ${token}`).toContain(token)
    }
  })

  it('table T-329 still holds TD-1 .. TD-8, and FR-018 owns each row', () => {
    expect(specTable('T-329').rows.map((one) => one.id), 'T-329').toEqual(['TD-1', 'TD-2', 'TD-3', 'TD-4', 'TD-5', 'TD-6', 'TD-7', 'TD-8'])
    expect(cellsOf('T-329', 'TD-1'), 'TD-1 reads S-418').toContain('S-418')
    expect(cellsOf('T-329', 'TD-5'), 'TD-5 is the pin (FR-098)').toContain('FR-098')
  })

  it('table T-109 gives the entrances this file presses (HF-13, HF-2, HF-14, HF-3, HF-11, undo)', () => {
    expect(cellsOf('T-109', OPEN_ONE_LEVEL), 'IC-90').toContain('HF-13')
    expect(cellsOf('T-109', OPEN_ALL_BELOW), 'IC-58').toContain('HF-2')
    expect(cellsOf('T-109', ADD_CHILD), 'IC-91').toContain('HF-14')
    expect(cellsOf('T-109', HIDE), 'IC-59').toContain('HF-3')
    expect(cellsOf('T-109', FOLD_BELOW), 'IC-77').toContain('HF-11')
    expect(cellsOf('T-109', UNDO), 'IC-5').toContain(APP_HEADER)
    expect(cellsOf('T-203', 'S-126'), 'S-126 is the pin key').toContain(PINNED_KEY)
  })

  it('premise: the fixture is laid out as the depth ladder says when nothing is hidden or pinned (TD-4)', () => {
    expect(thresholdOf(4), 'premise: zoom 1 draws depth 4').toBeLessThanOrEqual(1)
    expect(thresholdOf(5), 'premise: zoom 1 drops depth 5').toBeGreaterThan(1)
    expect(sortedNames(drawnOf({ zoomY: 1 })), 'TD-4').toEqual(['A', 'K1', 'K2', 'P', 'X', 'Y', 'Y1'])
  })
})

describe('CR-862 TD-2 / TD-3 -- a pinned task group is drawn when it or an ancestor is hidden or collapsed; the pin draws it alone', () => {
  const cases: readonly { readonly name: string; readonly states: Readonly<Record<string, TreeState>>; readonly drawn: readonly string[] }[] = [
    { name: 'TD-2: P itself is hidden', states: { P: 'hidden' }, drawn: ['A', 'P', 'X', 'Y', 'Y1'] },
    { name: 'TD-3: the parent A is hidden', states: { A: 'hidden' }, drawn: ['P', 'X', 'Y', 'Y1'] },
    { name: 'TD-3: the grandparent X is hidden', states: { X: 'hidden' }, drawn: ['P', 'Y', 'Y1'] },
    { name: 'TD-3: the parent A is collapsed (JDG-3811)', states: { A: 'collapsed' }, drawn: ['A', 'P', 'X', 'Y', 'Y1'] },
    { name: 'TD-3: the grandparent X is collapsed (JDG-3811)', states: { X: 'collapsed' }, drawn: ['P', 'X', 'Y', 'Y1'] },
    { name: 'TD-2 and TD-3: P and A are both hidden', states: { A: 'hidden', P: 'hidden' }, drawn: ['P', 'X', 'Y', 'Y1'] },
    { name: 'TD-3: A is hidden and P is expanded -- its children still are not drawn', states: { A: 'hidden', P: 'expanded' }, drawn: ['P', 'X', 'Y', 'Y1'] },
  ]

  it.each(cases)('$name: P is drawn, its ancestors and children stay as the other rows say', ({ states, drawn }) => {
    expect(sortedNames(drawnOf({ zoomY: 1, states, pinned: ['P'] })), 'CR-862 TD-2 / TD-3 (the pin draws only P)').toEqual([...drawn].sort())
  })

  it.each(cases)('$name: unpinned, P is not drawn (TD-2 / TD-3 hold again)', ({ states }) => {
    expect(named(drawnOf({ zoomY: 1, states })), 'CR-862: without the pin the hide wins').not.toContain('P')
  })
})

describe('CR-862 -- what still beats the pin, and what the pin still beats', () => {
  it.each([{}, { A: 'hidden' }, { P: 'hidden' }] as const)('TD-1: a collapsed level zero draws no task group, the pinned one included (%o)', (states) => {
    expect(drawnOf({ zoomY: 1, states, pinned: ['P'], levelZero: 'collapsed' }), 'CR-862 TD-1 still beats the pin').toEqual([])
  })

  it.each([{}, { A: 'hidden' }, { P: 'hidden' }] as const)('TD-8: the schedule filter leaves out P and everything under it, so P is not drawn (%o)', (states) => {
    const shown = [TASK_OF['Y1']!]
    expect(named(drawnOf({ zoomY: 1, states, pinned: ['P'] }, shown)), 'CR-862 decision 4: TD-8 beats the pin').not.toContain('P')
  })

  it('TD-8 control: the filter keeps the task on P, so P is drawn under its hidden parent, and the hidden parent is not', () => {
    const drawn = named(drawnOf({ zoomY: 1, states: { A: 'hidden' }, pinned: ['P'] }, [TASK_OF['P']!]))
    expect(drawn, 'CR-862 TD-3 with TD-8 kept').toContain('P')
    expect(drawn, 'TD-2: A stays hidden').not.toContain('A')
  })

  it('TD-5: below the depth-2 threshold, P under a hidden parent is still drawn', () => {
    const zoomY = thresholdOf(2) * 0.5
    expect(named(drawnOf({ zoomY, states: { A: 'hidden' }, pinned: ['P'] })), 'CR-862 TD-5 still beats the zoom drop').toContain('P')
  })

  it.each([{ A: 'hidden' }, { P: 'hidden' }, { A: 'collapsed' }, { X: 'collapsed' }] as const)(
    'monotonic: with the values fixed (%o), lowering zoomY never draws more task groups, and P stays drawn',
    (states) => {
      let before = Number.POSITIVE_INFINITY
      for (const zoomY of [4, 2, 1.2, 1, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1]) {
        const drawn = drawnOf({ zoomY, states, pinned: ['P'] })
        expect(drawn.length, `CR-862 monotonic at ${zoomY}`).toBeLessThanOrEqual(before)
        expect(named(drawn), `CR-862 TD-5: P is drawn at ${zoomY}`).toContain('P')
        before = drawn.length
      }
    },
  )
})

describe('CR-862 section 5 -- the presses of the Gherkin scenarios, through the Task Group Panel', () => {
  it('HF-3 on the ancestor A: A is not drawn, the pinned P is, and P\'s children are not', () => {
    const bench = stageOf(documentOf({ zoomY: 1, pinned: ['P'] }))
    expect(named(drawnIn(bench)), 'premise: A is drawn').toContain('A')
    bench.press(TASK_GROUP_PANEL, HIDE, A)
    expect(statesIn(bench)['A'], 'premise: T-328 hidePressed wrote hidden on A').toBe('hidden')
    const drawn = named(drawnIn(bench))
    expect(drawn, 'CR-862 TD-3: A is not drawn').not.toContain('A')
    expect(drawn, 'CR-862 TD-3: the pinned P is drawn').toContain('P')
    for (const child of ['K1', 'K2', 'K1a']) expect(drawn, `CR-862: the pin does not draw ${child}`).not.toContain(child)
  })

  it('HF-11 on the ancestor X: P keeps the value T-328 writes and is drawn; unpinned, it is not drawn', () => {
    const bench = stageOf(documentOf({ zoomY: 1, pinned: ['P'] }))
    bench.press(TASK_GROUP_PANEL, FOLD_BELOW, X)
    expect(statesIn(bench)['P'], 'T-328 allBelowFoldPressed: P below X is collapsed').toBe('collapsed')
    expect(named(drawnIn(bench)), 'CR-862 TD-3 (JDG-3811): P is drawn under the collapsed X').toContain('P')
    const unpinned = structuredClone(bench.loop.document()) as Loose
    unpinned.documentSettings[PINNED_KEY] = []
    expect(named(layoutOfDocument(unpinned).taskGroups.map((one) => one.taskGroupId)), 'CR-862: unpinned, the fold wins').not.toContain('P')
  })
})

describe('CR-862 decision 2 -- a press on P drawn only by its pin writes auto on the hidden / collapsed way up, in the same step', () => {
  // Why: zoom 0.6 draws depth 3 but not depth 4, so P's children are drawn only through P's tree state.
  const ZOOM = 0.6
  const WAYS: readonly { readonly name: string; readonly way: Readonly<Record<string, TreeState>> }[] = [
    { name: 'A hidden', way: { A: 'hidden' } },
    { name: 'A collapsed', way: { A: 'collapsed' } },
    { name: 'X hidden and A collapsed', way: { X: 'hidden', A: 'collapsed' } },
  ]
  // Spec: T-328, HF-13, HF-2, HF-14
  // Why: the own values are the T-328 rows on an auto P with auto children.
  const PRESSES: readonly {
    readonly row: string
    readonly entry: string
    readonly own: Readonly<Record<string, TreeState>>
    readonly drawnAfter: readonly string[]
    readonly adds: boolean
  }[] = [
    { row: 'HF-13', entry: OPEN_ONE_LEVEL, own: { P: 'expanded' }, drawnAfter: ['A', 'P', 'K1', 'K2'], adds: false },
    { row: 'HF-2', entry: OPEN_ALL_BELOW, own: { P: 'temporarilyExpanded', K1: 'temporarilyExpanded' }, drawnAfter: ['A', 'P', 'K1', 'K2', 'K1a'], adds: false },
    { row: 'HF-14', entry: ADD_CHILD, own: { P: 'temporarilyExpanded' }, drawnAfter: ['A', 'P', 'K1', 'K2'], adds: true },
  ]
  const cases = WAYS.flatMap((way) => PRESSES.map((press) => ({ ...way, ...press })))

  it.each(cases)('$row on P with $name: the way is auto, P takes its T-328 value, and what the press opens is drawn', ({ way, entry, own, drawnAfter, adds, row }) => {
    const bench = stageOf(documentOf({ zoomY: ZOOM, states: way, pinned: ['P'] }))
    const before = statesIn(bench)
    const beforeIds = bench.groups().map((one: Loose) => one.id as string)
    expect(named(drawnIn(bench)), 'premise: P is drawn by its pin').toContain('P')
    for (const child of ['K1', 'K2']) expect(named(drawnIn(bench)), `premise: ${child} is not drawn`).not.toContain(child)

    bench.press(TASK_GROUP_PANEL, entry, P)

    const after = statesIn(bench)
    const expected: Record<string, string> = { ...before, ...Object.fromEntries(Object.keys(way).map((name) => [name, 'auto'])), ...own }
    const addedIds = bench.groups().map((one: Loose) => one.id as string).filter((id: string) => !beforeIds.includes(id))
    expect(addedIds.length, `${row}: the press adds ${adds ? 'one task group' : 'nothing'}`).toBe(adds ? 1 : 0)
    for (const id of addedIds) {
      expect(after[id], 'HF-14: the added task group stands temporarilyExpanded').toBe('temporarilyExpanded')
      expected[id] = 'temporarilyExpanded'
    }
    expect(after, `CR-862 decision 2 / ${row}: the way up is written auto, the rest as T-328 says`).toEqual(expected)
    const drawn = drawnIn(bench)
    for (const name of drawnAfter) expect(named(drawn), `CR-862 decision 2 / ${row}: ${name} is drawn`).toContain(name)
    for (const id of addedIds) expect(drawn, 'CR-862 decision 2 / HF-14: the added task group is drawn').toContain(id)
  })

  it.each(cases)('$row on P with $name: one undo takes the way and the press back together (UN-14)', ({ way, entry, row }) => {
    const bench = stageOf(documentOf({ zoomY: ZOOM, states: way, pinned: ['P'] }))
    const before = statesIn(bench)
    bench.press(TASK_GROUP_PANEL, entry, P)
    expect(statesIn(bench), `premise: ${row} changed the tree`).not.toEqual(before)
    bench.press(APP_HEADER, UNDO, null)
    expect(statesIn(bench), `CR-862 decision 2 / ${row}: one undo restores every value and removes what was added`).toEqual(before)
  })
})

describe('CR-862 decision 3 -- P\'s own hide still writes its values as today', () => {
  it('HF-3 on P drawn by its pin under a hidden A: P is hidden, its subtree collapsed, A stays hidden, and P stays drawn', () => {
    const bench = stageOf(documentOf({ zoomY: 1, states: { A: 'hidden' }, pinned: ['P'] }))
    const before = statesIn(bench)
    bench.press(TASK_GROUP_PANEL, HIDE, P)
    expect(statesIn(bench), 'CR-862 decision 3 / T-328 hidePressed: no way write').toEqual({
      ...before,
      P: 'hidden',
      K1: 'collapsed',
      K1a: 'collapsed',
      K2: 'collapsed',
    })
    const drawn = named(drawnIn(bench))
    expect(drawn, 'CR-862 TD-2: P is drawn by its pin').toContain('P')
    for (const name of ['A', 'K1', 'K2', 'K1a']) expect(drawn, `CR-862: ${name} is not drawn`).not.toContain(name)
  })
})

describe('CR-862 section 4 (EL-20 row) -- a dependency end in a drawn pinned task group is no EL-20 end', () => {
  const dependent = (pinned: readonly string[], states: Readonly<Record<string, TreeState>>): Loose =>
    documentOf(
      { zoomY: 1, states, pinned },
      {
        tasks: [
          taskOf(1),
          taskOf(2, {
            start: '2026-04-13T08:00:00',
            finish: '2026-04-17T17:00:00',
            dependencies: [{ predecessorUid: 1, linkType: 1, linkLag: null, lagFormat: null, carry: {}, carryElements: [] }],
          }),
        ],
        taskGroupMembers: [
          { taskUid: 1, taskGroupId: Y },
          { taskUid: 2, taskGroupId: P },
        ],
        taskVisuals: [blankTaskVisual(1), blankTaskVisual(2)],
      },
    )
  const scene = (doc: Loose) => {
    const regions = regionsFromScreen(ENVIRONMENT as never, doc.documentSettings)
    const layout = layoutFromSchedule(doc.schedule, doc.documentSettings, regions)
    const geometry = geometryFromLayout(doc.schedule, doc.documentSettings, layout, regions, emptySelection(), null)
    const line = (geometry.dependencies as unknown as readonly Loose[]).find((one) => one.predecessorUid === 1 && one.successorUid === 2)
    return { placed: layout.placements.some((one) => one.taskUid === 2), line }
  }

  it.each([{ A: 'hidden' }, { P: 'hidden' }, { A: 'collapsed' }] as const)('%o: unpinned, Task 2 is not drawn and its end is an EL-20 end (premise)', (states) => {
    const { placed, line } = scene(dependent([], states))
    expect(placed, 'premise: Task 2 is not drawn').toBe(false)
    expect(line?.continuation?.farUid, 'premise EL-20: the line carries a mark leading to Task 2').toBe(2)
  })

  it.each([{ A: 'hidden' }, { P: 'hidden' }, { A: 'collapsed' }] as const)('%o: pinned, Task 2 is drawn and the line carries no EL-20 mark to it', (states) => {
    const { placed, line } = scene(dependent(['P'], states))
    expect(placed, 'CR-862 TD-2 / TD-3: Task 2 in the drawn pinned task group is drawn').toBe(true)
    expect(line, 'CR-862: the line is laid').toBeDefined()
    expect(line?.continuation?.farUid, 'CR-862 section 4 (EL-20 row): the end in a drawn pinned task group is no EL-20 end').toBeUndefined()
  })
})

describe('CR-862 / JDG-3692 -- the folded count leaves out a pinned task group drawn because of its pin', () => {
  const countOf = (bench: ShellBench, id: string): number => {
    const panel = bench.last().taskGroupPanel
    const title = [...panel.pinnedTitles, ...panel.titles].find((one) => one.taskGroupId === id)
    if (title === undefined) throw new Error(`the panel drew no title for ${NAMES[id] ?? id}`)
    return title.foldedTaskGroupCount ?? 0
  }

  it.each([{ A: 'hidden' }, { A: 'collapsed' }] as const)('%o: X counts one task group less when P is pinned', (states) => {
    const without = countOf(stageOf(documentOf({ zoomY: 1, states })), X)
    const pinned = countOf(stageOf(documentOf({ zoomY: 1, states, pinned: ['P'] })), X)
    expect(without, 'premise HF-18: X counts the task groups folded under it').toBeGreaterThan(0)
    expect(pinned, 'CR-862 / JDG-3692: the drawn pinned P is not counted').toBe(without - 1)
  })
})

describe('CR-862 decision 5 -- a search jump to a target inside a drawn pinned task group writes no tree state (SJ-2)', () => {
  const TARGET = { kind: 'task', taskUid: TASK_OF['P']! } as const
  const planOf = (arranged: Arranged) => {
    const doc = documentOf(arranged)
    const reach = { pxPerDay: 10, leftReachPx: 0, drawnTaskGroups: layoutOfDocument(doc).taskGroups, areaWidth: 800, landing: null }
    return searchJumpWrites(doc as unknown as Document, TARGET, true, reach)
  }

  it.each([{ A: 'hidden' }, { P: 'hidden' }, { A: 'collapsed' }, { X: 'hidden', A: 'collapsed' }] as const)(
    '%o: P is drawn by its pin, so the jump writes no tree state',
    (states) => {
      expect(named(drawnOf({ zoomY: 1, states, pinned: ['P'] })), 'premise CR-862: P is drawn').toContain('P')
      expect(planOf({ zoomY: 1, states, pinned: ['P'] }).treeStateWrites, 'CR-862 decision 5 / SJ-2').toEqual([])
    },
  )

  it('control: unpinned under a hidden A, the jump writes the way open (SJ-2)', () => {
    const writes = planOf({ zoomY: 1, states: { A: 'hidden' } }).treeStateWrites as unknown as readonly Loose[]
    expect(writes.some((one) => one['taskGroupId'] === A), 'SJ-2: the hidden A is written').toBe(true)
  })
})
