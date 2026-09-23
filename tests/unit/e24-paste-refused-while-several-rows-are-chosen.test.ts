// E-24 (CR-541) spec-only cases: a copied Task pasted while two or more rows are chosen is refused (FR-033).

import { afterEach, describe, expect, it } from 'vitest'

import { bare, specTable } from '../contract/spec-table'
import {
  DISPLAY_WORDS,
  keyOf,
  REQUIREMENTS,
  rowDocument,
  rowOf,
  shell,
  taskOf,
  type ShellBench,
} from './cr-541-stage'

// WHY: E-24 names no kind of copy, so it binds every paste FR-033 makes, a Task paste included.
const SEVERAL_TARGET_ROWS_REFUSED =
  '⛔ 貼り付け先として行が 2 つ以上選ばれているときは、貼り付けを受け付けずに通知すること（MUST）'
const TARGET_IS_THE_CHOSEN_ROW = '貼り付け先は、選んでいる行の子とすること（MUST）'
const SAME_ROW = '**複製した `Task` は、複製元と同じ行に載せること（MUST）'
const EDIT_GROUP_LANDS_ON_CHOSEN_ROW =
  '⛐ **ただ 1 つの例外は、複製元の行が `editGroup` を名乗っているときである** —— そのときに限り、**選んでいる自分の行に載せること（MUST）**'
const MANY_TASKS_ALL_COPIED =
  '⭐ `Task` が 2 つ以上選ばれているときは、選ばれた `Task` をすべて複製し、それぞれを上の段のとおり複製元と同じ行に載せること（MUST）'
const ROOT_IS_A_SIBLING =
  '⭐ 複製の根（選ばれた `Task` の複製）は、複製元と同じ WBS の親の下に兄弟として置き、部分木の内側の親子は複製どうしへ付け替えること（MUST）'
const NO_SAME_UID = '複製した `Task` に、複製元と同じ `UID` を使ってはならない（MUST NOT）'
const REASON_IS_A_T233_ROW = '⭐ 通知が運ぶ理由は 表 T-233 の行とすること（MUST）'

describe('FR-033 / T-233 -- the clauses this file is driven by still stand', () => {
  it.each([
    SEVERAL_TARGET_ROWS_REFUSED,
    TARGET_IS_THE_CHOSEN_ROW,
    SAME_ROW,
    EDIT_GROUP_LANDS_ON_CHOSEN_ROW,
    MANY_TASKS_ALL_COPIED,
    ROOT_IS_A_SIBLING,
    NO_SAME_UID,
    REASON_IS_A_T233_ROW,
  ])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const COPY = keyOf('C', { ctrl: true })
const PASTE = keyOf('V', { ctrl: true })
const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')
const EDIT_GROUP_NAME = 'fixture edit group'

// WHY: no T-233 row names the E-24 refusal, so the case asks only what REASON_IS_A_T233_ROW
// asks: the words told are the words of some T-233 row.
const T233_IDS = new Set(specTable('T-233').rows.map((one) => one.id))
const T233_WORDS: readonly string[] = (DISPLAY_WORDS.reasons as { rowId: string; text: { ja: string } }[])
  .filter((one) => T233_IDS.has(one.rowId))
  .map((one) => one.text.ja)

// WHY: one Task per row, all at the WBS top, so ROOT_IS_A_SIBLING and "nothing chosen -> top"
// agree on where a copy root goes.
const threeRows = (editGroupOnRowOne: boolean): Record<string, any> => {
  const document = rowDocument([
    { id: 'row-1', parentId: null },
    { id: 'row-2', parentId: null },
    { id: 'row-3', parentId: null },
  ])
  const taskName = (uid: number): Record<string, unknown> => ({ name: `T${uid}` })
  document.schedule.tasks = [taskOf(1, taskName(1)), taskOf(2, taskName(2)), taskOf(3, taskName(3))]
  if (editGroupOnRowOne) document.schedule.taskGroups[0].editGroup = EDIT_GROUP_NAME
  return document
}

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

interface Stage {
  readonly bench: ShellBench
  copyTasks(uids: readonly number[]): void
  pickRow(groupId: string, adding: boolean): void
  pickedRows(): readonly string[]
  tasks(): any[]
  rowOfTask(uid: number): string | undefined
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
    pickRow: (groupId, adding) => {
      bench.aim({ part: ROW_TITLE_PANEL, entry: null, format: null, rowGroupId: groupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as never)
      bench.click(60, 120, adding ? { [modifier]: true } : {})
      bench.aim(null)
    },
    pickedRows: () => bench.last().rowTitlePanel.titles.filter((one) => one.isSelected).map((one) => one.groupId),
    tasks: () => schedule().tasks,
    rowOfTask: (uid) => schedule().taskGroupMembers.find((one: any) => one.taskUid === uid)?.groupId,
  }
}

const copyTasks = (stage: Stage, uids: readonly number[]): void => stage.copyTasks(uids)

// WHY: no row names the modifier that adds a row to the picked rows (as in the cr-541 Q15
// case), so each is tried on a fresh shell; the premise fails only when none picks two.
function copiedThenTwoRowsPicked(document: () => Record<string, any>, uids: readonly number[]): Stage {
  for (const modifier of ['ctrl', 'shift', 'meta'] as const) {
    const stage = stageOf(document(), modifier)
    copyTasks(stage, uids)
    stage.pickRow('row-2', false)
    stage.pickRow('row-3', true)
    if (stage.pickedRows().length === 2) return stage
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
  expect(told.length, 'and it is told').toBeGreaterThan(toldBefore)
  expect(toldAT233Reason(told), `the told reason is a T-233 row (told: ${JSON.stringify(told)})`).toBe(true)
}

describe('E-24 -- a copied Task pasted while two rows are chosen is refused', () => {
  it(`${SEVERAL_TARGET_ROWS_REFUSED} -- one copied Task`, () => {
    expectRefused(copiedThenTwoRowsPicked(() => threeRows(false), [1]))
  })

  it(`${SEVERAL_TARGET_ROWS_REFUSED} -- two copied Tasks`, () => {
    expectRefused(copiedThenTwoRowsPicked(() => threeRows(false), [1, 2]))
  })

  // WHY: here EDIT_GROUP_LANDS_ON_CHOSEN_ROW makes the chosen row the landing row, so two
  // chosen rows leave the landing row undecided -- the reading of E-24 least open to doubt.
  it(`${SEVERAL_TARGET_ROWS_REFUSED} -- one Task copied from an editGroup row`, () => {
    expectRefused(copiedThenTwoRowsPicked(() => threeRows(true), [1]))
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
  it(`${SAME_ROW} -- one copied Task, ONE row chosen: one copy, on its source row`, () => {
    const stage = stageOf(threeRows(false), 'ctrl')
    copyTasks(stage, [1])
    stage.pickRow('row-2', false)
    expect(stage.pickedRows(), 'premise: one row is chosen').toEqual(['row-2'])
    const made = newTasks(stage, () => stage.bench.send(PASTE))
    expect(made.map((one) => one.name)).toEqual(['T1'])
    expect(stage.rowOfTask(made[0].uid), 'SAME_ROW').toBe('row-1')
  })

  it(`${MANY_TASKS_ALL_COPIED} -- two copied Tasks, ONE row chosen: two copies`, () => {
    const stage = stageOf(threeRows(false), 'ctrl')
    copyTasks(stage, [1, 2])
    stage.pickRow('row-3', false)
    expect(stage.pickedRows(), 'premise: one row is chosen').toEqual(['row-3'])
    const made = newTasks(stage, () => stage.bench.send(PASTE))
    expect(made.map((one) => one.name).sort()).toEqual(['T1', 'T2'])
  })

  it(`${ROOT_IS_A_SIBLING} / ${NO_SAME_UID} -- one copied Task, NO row chosen`, () => {
    const stage = stageOf(threeRows(false), 'ctrl')
    copyTasks(stage, [1])
    expect(stage.pickedRows(), 'premise: no row is chosen').toEqual([])
    const made = newTasks(stage, () => stage.bench.send(PASTE))
    expect(made.map((one) => one.name)).toEqual(['T1'])
    expect(made[0].uid, 'NO_SAME_UID').not.toBe(1)
    expect(made[0].wbsParentUid, 'the copy root is a sibling at the WBS top').toBeNull()
    expect(stage.rowOfTask(made[0].uid), 'SAME_ROW').toBe('row-1')
  })
})

// WHY: the control of the editGroup refusal case above; it reads the FR-033 exception, not
// E-24, so hoisting the E-24 refusal alone does not turn it green.
describe('FR-033 editGroup exception -- one row chosen, the copy lands on it', () => {
  // DEVIATION: spec says a copy from an editGroup row lands on the chosen row (FR-033); here it lands on its source row (DFC-730)
  it.fails(`${EDIT_GROUP_LANDS_ON_CHOSEN_ROW} -- one Task from an editGroup row, ONE row chosen`, () => {
    const stage = stageOf(threeRows(true), 'ctrl')
    copyTasks(stage, [1])
    stage.pickRow('row-2', false)
    expect(stage.pickedRows(), 'premise: one row is chosen').toEqual(['row-2'])
    const made = newTasks(stage, () => stage.bench.send(PASTE))
    expect(made.map((one) => one.name)).toEqual(['T1'])
    expect(stage.rowOfTask(made[0].uid), 'the copy lands on the chosen row').toBe('row-2')
  })
})
