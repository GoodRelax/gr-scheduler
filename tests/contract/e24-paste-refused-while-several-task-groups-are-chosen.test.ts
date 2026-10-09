// E-24 (CR-541) spec-only cases: a copied Task pasted while two or more rows are chosen is refused (FR-033).

import { afterEach, describe, expect, it } from 'vitest'

import { bare, specTable } from './spec-table'
import {
  DISPLAY_WORDS,
  keyOf,
  REQUIREMENTS,
  taskGroupDocument,
  rowOf,
  shell,
  taskOf,
  type ShellBench,
} from '../unit/cr-541-stage'

// WHY: E-24 names no kind of copy, so it binds every paste FR-033 makes, a Task paste included.
const SEVERAL_TARGET_TASK_GROUPS_REFUSED =
  '⛔ 貼り付け先としてタスクグループが 2 つ以上選ばれているときは、貼り付けを受け付けず、行えない理由を `FR-029` のとおり通知の仕組みへ運ぶこと（MUST）'
const TARGET_IS_THE_CHOSEN_TASK_GROUP = '貼り付け先は、選んでいるタスクグループの子とすること（MUST）'
const SAME_TASK_GROUP = '**複製した `Task` は、複製元と同じタスクグループに載せること（MUST）'
const EDIT_GROUP_LANDS_ON_CHOSEN_TASK_GROUP =
  '⛐ **ただ 1 つの例外は、複製元のタスクグループが `editGroup` を名乗っているときである** —— そのときに限り、**選んでいる自分のタスクグループに載せること（MUST）**'
const MANY_TASKS_ALL_COPIED =
  '⭐ `Task` が 2 つ以上選ばれているときは、選ばれた `Task` をすべて複製し、それぞれを上の段のとおり複製元と同じタスクグループに載せること（MUST）'
// WHY: CR-714 (JDG-1736) replaced "the copy keeps its source's parent" with a parent inferred from the landing row.
const PARENT_FROM_THE_TASK_GROUP =
  'コピー元の親をコピーしないとき（コピー元が親を持たないときを含む）は、コピーの親タスクを、コピーを載せたタスクグループから推定すること（MUST）'
const NO_SAME_UID = '複製した `Task` に、複製元と同じ `UID` を使ってはならない（MUST NOT）'
const REASON_IS_A_T233_ROW = '⭐ 通知が運ぶ理由は 表 T-233 の行とすること（MUST）'

describe('FR-033 / T-233 -- the clauses this file is driven by still stand', () => {
  it.each([
    SEVERAL_TARGET_TASK_GROUPS_REFUSED,
    TARGET_IS_THE_CHOSEN_TASK_GROUP,
    SAME_TASK_GROUP,
    EDIT_GROUP_LANDS_ON_CHOSEN_TASK_GROUP,
    MANY_TASKS_ALL_COPIED,
    PARENT_FROM_THE_TASK_GROUP,
    NO_SAME_UID,
    REASON_IS_A_T233_ROW,
  ])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const COPY = keyOf('C', { ctrl: true })
const PASTE = keyOf('V', { ctrl: true })
const TASK_GROUP_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')
const EDIT_GROUP_NAME = 'fixture edit group'

// WHY: no T-233 row names the E-24 refusal, so the case asks only what REASON_IS_A_T233_ROW
// asks: the words told are the words of some T-233 row.
const T233_IDS = new Set(specTable('T-233').rows.map((one) => one.id))
const T233_WORDS: readonly string[] = (DISPLAY_WORDS.reasons as { rowId: string; text: { ja: string } }[])
  .filter((one) => T233_IDS.has(one.rowId))
  .map((one) => one.text.ja)

// WHY: one Task per row, all at the WBS top, so PARENT_FROM_THE_TASK_GROUP and "nothing chosen -> top"
// agree on where a copy root goes.
const threeTaskGroups = (editGroupOnTaskGroupOne: boolean): Record<string, any> => {
  const document = taskGroupDocument([
    { id: 'task-group-1', parentId: null },
    { id: 'task-group-2', parentId: null },
    { id: 'task-group-3', parentId: null },
  ])
  const taskName = (uid: number): Record<string, unknown> => ({ name: `T${uid}` })
  document.schedule.tasks = [taskOf(1, taskName(1)), taskOf(2, taskName(2)), taskOf(3, taskName(3))]
  if (editGroupOnTaskGroupOne) document.schedule.taskGroups[0].editGroup = EDIT_GROUP_NAME
  return document
}

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

interface Stage {
  readonly bench: ShellBench
  copyTasks(uids: readonly number[]): void
  pickTaskGroup(groupId: string, adding: boolean): void
  pickedTaskGroups(): readonly string[]
  tasks(): any[]
  taskGroupOfTask(uid: number): string | undefined
}

function stageOf(document: Record<string, any>, modifier: 'ctrl' | 'shift' | 'meta'): Stage {
  const bench = shell(document)
  benches.push(bench)
  const middleOf = (uid: number): { x: number; y: number } => {
    const drawn = (bench.loop.current()?.geometry.tasks as any[] | undefined)?.find((one) => one.taskUid === uid)
    if (drawn?.plan?.form !== 'outline') throw new Error(`premise: Task ${uid} has no bar body to press`)
    const xs = drawn.plan.points.map((one: any) => one.x)
    const ys = drawn.plan.points.map((one: any) => one.y)
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  }
  const schedule = (): any => (bench.loop.document() as any).schedule
  return {
    bench,
    // see SL-2, SL-4
    copyTasks: (uids) => {
      uids.forEach((uid, index) => {
        const at = middleOf(uid)
        bench.click(at.x, at.y, index === 0 ? {} : { shift: true })
      })
      bench.send(COPY)
    },
    pickTaskGroup: (groupId, adding) => {
      bench.aim({ part: TASK_GROUP_PANEL, entry: null, format: null, taskGroupId: groupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as never)
      bench.click(60, 120, adding ? { [modifier]: true } : {})
      bench.aim(null)
    },
    pickedTaskGroups: () => bench.last().taskGroupPanel.titles.filter((one) => one.isSelected).map((one) => one.groupId),
    tasks: () => schedule().tasks,
    taskGroupOfTask: (uid) => schedule().taskGroupMembers.find((one: any) => one.taskUid === uid)?.groupId,
  }
}

const copyTasks = (stage: Stage, uids: readonly number[]): void => stage.copyTasks(uids)

// WHY: no row names the modifier that adds a row to the picked rows (as in the cr-541 Q15
// case), so each is tried on a fresh shell; the premise fails only when none picks two.
function copiedThenTwoTaskGroupsPicked(document: () => Record<string, any>, uids: readonly number[]): Stage {
  for (const modifier of ['ctrl', 'shift', 'meta'] as const) {
    const stage = stageOf(document(), modifier)
    copyTasks(stage, uids)
    stage.pickTaskGroup('task-group-2', false)
    stage.pickTaskGroup('task-group-3', true)
    if (stage.pickedTaskGroups().length === 2) return stage
  }
  throw new Error('premise: some modifier picks two rows (FR-085)')
}

const toldAT233Reason = (notices: readonly string[]): boolean =>
  notices.some((text) => T233_WORDS.some((words) => text.includes(words)))

function expectRefused(stage: Stage): void {
  const before = JSON.stringify(stage.bench.loop.document())
  const toldBefore = stage.bench.notices().length
  stage.bench.send(PASTE)
  expect(JSON.stringify(stage.bench.loop.document()), 'the paste is not accepted: the document is unchanged').toBe(before)
  const told = stage.bench.notices()
  const raised = told.slice(toldBefore)
  expect(raised.every((text) => toldAT233Reason([text])), `FR-076 (CR-712): a reason shown is a T-233 row, and RS-27 is not shown (told: ${JSON.stringify(told)})`).toBe(true)
}

describe('E-24 -- a copied Task pasted while two rows are chosen is refused', () => {
  it(`${SEVERAL_TARGET_TASK_GROUPS_REFUSED} -- one copied Task`, () => {
    expectRefused(copiedThenTwoTaskGroupsPicked(() => threeTaskGroups(false), [1]))
  })

  it(`${SEVERAL_TARGET_TASK_GROUPS_REFUSED} -- two copied Tasks`, () => {
    expectRefused(copiedThenTwoTaskGroupsPicked(() => threeTaskGroups(false), [1, 2]))
  })

  // WHY: here EDIT_GROUP_LANDS_ON_CHOSEN_TASK_GROUP makes the chosen row the landing row, so two
  // chosen rows leave the landing row undecided -- the reading of E-24 least open to doubt.
  it(`${SEVERAL_TARGET_TASK_GROUPS_REFUSED} -- one Task copied from an editGroup row`, () => {
    expectRefused(copiedThenTwoTaskGroupsPicked(() => threeTaskGroups(true), [1]))
  })
})

const newTasks = (stage: Stage, act: () => void): any[] => {
  const before = new Set<number>(stage.tasks().map((one) => one.uid))
  act()
  return stage.tasks().filter((one) => !before.has(one.uid))
}

// WHY: these pass today and must keep passing once the refusal is hoisted; a refusal that
// also caught one chosen row or none would turn them red.
describe('controls -- one row or no row chosen, the Task paste goes through', () => {
  it(`${SAME_TASK_GROUP} -- one copied Task, ONE row chosen: one copy, on its source row`, () => {
    const stage = stageOf(threeTaskGroups(false), 'ctrl')
    copyTasks(stage, [1])
    stage.pickTaskGroup('task-group-2', false)
    expect(stage.pickedTaskGroups(), 'premise: one row is chosen').toEqual(['task-group-2'])
    const made = newTasks(stage, () => stage.bench.send(PASTE))
    expect(made.map((one) => one.name)).toEqual(['T1'])
    expect(stage.taskGroupOfTask(made[0].uid), 'SAME_TASK_GROUP').toBe('task-group-1')
  })

  it(`${MANY_TASKS_ALL_COPIED} -- two copied Tasks, ONE row chosen: two copies`, () => {
    const stage = stageOf(threeTaskGroups(false), 'ctrl')
    copyTasks(stage, [1, 2])
    stage.pickTaskGroup('task-group-3', false)
    expect(stage.pickedTaskGroups(), 'premise: one row is chosen').toEqual(['task-group-3'])
    const made = newTasks(stage, () => stage.bench.send(PASTE))
    expect(made.map((one) => one.name).sort()).toEqual(['T1', 'T2'])
  })

  it(`${PARENT_FROM_THE_TASK_GROUP} / ${NO_SAME_UID} -- one copied Task, NO row chosen`, () => {
    const stage = stageOf(threeTaskGroups(false), 'ctrl')
    copyTasks(stage, [1])
    expect(stage.pickedTaskGroups(), 'premise: no row is chosen').toEqual([])
    const made = newTasks(stage, () => stage.bench.send(PASTE))
    expect(made.map((one) => one.name)).toEqual(['T1'])
    expect(made[0].uid, 'NO_SAME_UID').not.toBe(1)
    expect(made[0].parentTaskUid, 'task-group-1 derives from no Task, so the inferred parent is the root').toBeNull()
    expect(stage.taskGroupOfTask(made[0].uid), 'SAME_TASK_GROUP').toBe('task-group-1')
  })
})

// WHY: the control of the editGroup refusal case above; it reads the FR-033 exception, not
// E-24, so hoisting the E-24 refusal alone does not turn it green.
describe('FR-033 editGroup exception -- one row chosen, the copy lands on it', () => {
  // DEVIATION: spec says a copy from an editGroup row lands on the chosen row (FR-033); here it lands on its source row (DFC-730)
  it.fails(`${EDIT_GROUP_LANDS_ON_CHOSEN_TASK_GROUP} -- one Task from an editGroup row, ONE row chosen`, () => {
    const stage = stageOf(threeTaskGroups(true), 'ctrl')
    copyTasks(stage, [1])
    stage.pickTaskGroup('task-group-2', false)
    expect(stage.pickedTaskGroups(), 'premise: one row is chosen').toEqual(['task-group-2'])
    const made = newTasks(stage, () => stage.bench.send(PASTE))
    expect(made.map((one) => one.name)).toEqual(['T1'])
    expect(stage.taskGroupOfTask(made[0].uid), 'the copy lands on the chosen row').toBe('task-group-2')
  })
})
