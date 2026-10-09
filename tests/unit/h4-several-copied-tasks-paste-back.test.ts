// H4 spec-only cases: several selected Tasks are copied and pasted back (FR-033, CM-8, Q16).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { copiedForPasteOf } from '../../src/framework/single-html-shell/frame-loop'
import type { ItemRef, Selection } from '../../src/entity/document-model/selection/selection'
import { bare, unbroken } from '../contract/spec-table'
import {
  DISPLAY_WORDS,
  keyOf,
  REQUIREMENTS,
  taskGroupDocument,
  rowOf,
  shell,
  taskOf,
  type ShellBench,
} from './cr-541-stage'

const MANY_TASKS_ALL_COPIED =
  '⭐ `Task` が 2 つ以上選ばれているときは、選ばれた `Task` をすべて複製し、それぞれを上の段のとおり複製元と同じタスクグループに載せること（MUST）'
// WHY: CR-706 moved both rules into T-223 DU-1: only the chosen Tasks are copied, each once; CR-714 made a copy's
// parent task its source parent's copy when that parent is copied too, else the parent read off the landing row.
const ONLY_CHOSEN_COPIED =
  '⭐ 選ばれていない `Task` を複製するかどうかと、コピーの親タスクは、表 T-223 の `DU-1` に従うこと（MUST）'
const PARENT_FROM_THE_TASK_GROUP =
  'コピー元の親をコピーしないとき（コピー元が親を持たないときを含む）は、コピーの親タスクを、コピーを載せたタスクグループから推定すること（MUST）'
const SAME_TASK_GROUP = '**複製した `Task` は、複製元と同じタスクグループに載せること（MUST）'
const NO_SAME_UID = '複製した `Task` に、複製元と同じ `UID` を使ってはならない（MUST NOT）'
const CM_8_ROW =
  '| CM-8 | `Task` | `pasteTasks` | ⭐ | 選んだ `Task` を複製する（複製元の `Task` を 1 つ以上運び、運ばない子孫タスクはコピーしない —— `01-04-requirements.md` の 表 T-223 の `DU-1`）。`Ctrl` ドラッグのコピーは、ずらす日数と、コピーを載せるタスクグループも運ぶ（`FR-033` の 表 T-308 の `CY-5` ・ `CY-6`） | `FR-033` |'
const COPY_TAKEN_ROW =
  '| `selection/copyTaken` | 入力（コピーできる選び方のときだけ呼び手が送る。コピーできないときは `RS-27` で断り、出来事を作らない）: `SK-4` ・ `FR-033` | `copiedForPaste` | 根 |'
const CR_541_ROW_8 = '| 8 | Q16 で行と `Task` が両方選ばれたとき | いまの振る舞い（行を写す）のまま。何も書かない | そのまま |'

const readText = (...parts: string[]): string =>
  readFileSync(join(process.cwd(), ...parts), 'utf8').replace(/\r\n/g, '\n')
const GLOSSARY = unbroken(readText('docs', 'spec', '_assets', 'tbl-glossary.md'))
const STATE_MACHINES = unbroken(readText('docs', 'spec', '_assets', 'tbl-state-machines.md'))
const CR_541 = readText('change-request', 'CR-541-land-the-2026-09-22-rulings-in-the-specification.md')

describe('FR-033 / CM-8 / T-293 -- the clauses this file is driven by still stand', () => {
  it.each([MANY_TASKS_ALL_COPIED, ONLY_CHOSEN_COPIED, PARENT_FROM_THE_TASK_GROUP, SAME_TASK_GROUP, NO_SAME_UID])(
    'FR-033: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )
  it('CM-8 carries one or more source Tasks', () => {
    expect(GLOSSARY).toContain(CM_8_ROW)
  })
  it('selection/copyTaken: an uncopyable choice is refused with RS-27 and makes no event', () => {
    expect(STATE_MACHINES).toContain(COPY_TAKEN_ROW)
  })
  it('CR-541 section 11 row 8: a row and Tasks chosen together copy the row', () => {
    expect(CR_541).toContain(CR_541_ROW_8)
  })
})

const task = (uid: number): ItemRef => ({ kind: 'task', uid })
const picked = (...items: ItemRef[]): Selection => ({ items, ordered: true })
const NOTHING: Selection = { items: [], ordered: true }

const uidsOf = (copied: ReturnType<typeof copiedForPasteOf>): readonly number[] => {
  if (copied === null || copied.kind !== 'task') throw new Error(`not a task copy: ${JSON.stringify(copied)}`)
  return (copied as unknown as { uids: readonly number[] }).uids
}

describe('copiedForPasteOf -- the seam the copy key goes through', () => {
  it('FR-033 MANY_TASKS_ALL_COPIED: two Tasks and no row -> a task copy carrying both', () => {
    const copied = copiedForPasteOf([], picked(task(7), task(3)))
    expect(copied?.kind).toBe('task')
    expect([...uidsOf(copied)].sort((a, b) => a - b)).toEqual([3, 7])
  })

  it('FR-033 MANY_TASKS_ALL_COPIED: three Tasks -> all three, none twice', () => {
    const uids = uidsOf(copiedForPasteOf([], picked(task(5), task(9), task(2))))
    expect([...uids].sort((a, b) => a - b)).toEqual([2, 5, 9])
  })

  it('control: one Task and no row -> a task copy of that one', () => {
    expect(uidsOf(copiedForPasteOf([], picked(task(4))))).toEqual([4])
  })

  it('CM-8 (one or more Tasks): only the Task items are carried; other selected kinds are not Tasks', () => {
    const copied = copiedForPasteOf(
      [],
      picked(task(8), { kind: 'dependency', successorUid: 8, ordinal: 0 }, { kind: 'commentBox', id: 'c-1' }, task(6)),
    )
    expect([...uidsOf(copied)].sort((a, b) => a - b)).toEqual([6, 8])
  })

  it('CM-8 (one or more Tasks) / copyTaken: nothing chosen -> nothing to copy (null)', () => {
    expect(copiedForPasteOf([], NOTHING)).toBeNull()
  })

  it('CM-8 (one or more Tasks) / copyTaken: only non-Task items chosen -> null', () => {
    expect(copiedForPasteOf([], picked({ kind: 'highlightBox', id: 'h-1' }))).toBeNull()
  })

  it('CR-541 section 11 row 8: one row and two Tasks chosen -> the row is copied', () => {
    expect(copiedForPasteOf(['task-group-a'], picked(task(1), task(2)))).toEqual({ kind: 'row', groupId: 'task-group-a' })
  })

  it('FR-033 (row half) control: one row and no Task -> the row is copied', () => {
    expect(copiedForPasteOf(['task-group-b'], NOTHING)).toEqual({ kind: 'row', groupId: 'task-group-b' })
  })
})

// WHY: these two are the parent brief's seam contract; no clause of docs/spec decides them
// (PND-449 records them as the old behaviour). Kept apart so a spec reader can drop them.
describe('copiedForPasteOf -- the brief contract, NOT a spec clause', () => {
  it('brief: the task copy lists the Tasks in pick order (SL-7b keeps that order)', () => {
    expect(uidsOf(copiedForPasteOf([], picked(task(7), task(3), task(5))))).toEqual([7, 3, 5])
  })

  it('brief: two rows chosen at copy time -> null, whatever Tasks are chosen', () => {
    expect(copiedForPasteOf(['task-group-a', 'task-group-b'], NOTHING)).toBeNull()
    expect(copiedForPasteOf(['task-group-a', 'task-group-b'], picked(task(1)))).toBeNull()
  })
})

const P = 1
const A = 2
const A1 = 3
const B = 4
const COPY = keyOf('C', { ctrl: true })
const PASTE = keyOf('V', { ctrl: true })
const TASK_GROUP_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')
const RS_27_WORDS: string = (DISPLAY_WORDS.reasons as { rowId: string; text: { ja: string } }[]).find(
  (one) => one.rowId === 'RS-27',
)!.text.ja

// WHY: P on task-group-1 holds A (task-group-2), A holds A1 (task-group-3); B is a root on task-group-1. Dates differ
// so no two bars overlap and every bar has its own body to press.
const wbsDocument = (): Record<string, unknown> =>
  taskGroupDocument(
    [
      { id: 'task-group-1', parentId: null },
      { id: 'task-group-2', parentId: null },
      { id: 'task-group-3', parentId: null },
    ],
    {},
    {
      tasks: [
        taskOf(P, { name: 'P', start: '2026-04-06T08:00:00', finish: '2026-04-10T17:00:00' }),
        taskOf(A, { name: 'A', parentTaskUid: P, start: '2026-04-13T08:00:00', finish: '2026-04-17T17:00:00' }),
        taskOf(A1, { name: 'A1', parentTaskUid: A, start: '2026-04-20T08:00:00', finish: '2026-04-24T17:00:00' }),
        taskOf(B, { name: 'B', start: '2026-04-27T08:00:00', finish: '2026-05-01T17:00:00' }),
      ],
      taskGroupMembers: [
        { taskUid: P, groupId: 'task-group-1' },
        { taskUid: A, groupId: 'task-group-2' },
        { taskUid: A1, groupId: 'task-group-3' },
        { taskUid: B, groupId: 'task-group-1' },
      ],
    },
  )

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

interface Staged {
  readonly bench: ShellBench
  pickTasks(uids: readonly number[]): void
  tasks(): any[]
  taskGroupOfTask(uid: number): string | undefined
}

function staged(): Staged {
  const bench = shell(wbsDocument())
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
    pickTasks: (uids) => {
      uids.forEach((uid, index) => {
        const at = middleOf(uid)
        bench.click(at.x, at.y, index === 0 ? {} : { shift: true })
      })
    },
    tasks: () => schedule().tasks,
    taskGroupOfTask: (uid) => schedule().taskGroupMembers.find((one: any) => one.taskUid === uid)?.groupId,
  }
}

const copyThenPaste = (uids: readonly number[]) => {
  const stage = staged()
  const before = new Set<number>(stage.tasks().map((one) => one.uid))
  stage.pickTasks(uids)
  stage.bench.send(COPY)
  stage.bench.send(PASTE)
  const made = stage.tasks().filter((one) => !before.has(one.uid))
  return { stage, made, byName: new Map<string, any>(made.map((one) => [one.name, one])) }
}

describe('FR-033 through the shell -- Ctrl+C then Ctrl+V on several picked Tasks', () => {
  it('FR-033 MANY_TASKS_ALL_COPIED: two leaf Tasks picked -> two copies, each on its source row', () => {
    const { stage, made, byName } = copyThenPaste([A1, B])
    expect(made.map((one) => one.name).sort()).toEqual(['A1', 'B'])
    expect(stage.taskGroupOfTask(byName.get('A1').uid), 'SAME_TASK_GROUP for A1').toBe('task-group-3')
    expect(stage.taskGroupOfTask(byName.get('B').uid), 'SAME_TASK_GROUP for B').toBe('task-group-1')
  })

  it('FR-033 PARENT_FROM_THE_TASK_GROUP: no row here derives from a Task, so each copy whose parent is not copied is a root', () => {
    const { byName } = copyThenPaste([A1, B])
    expect(byName.get('A1')?.parentTaskUid, 'A1 copy does not carry the link to A').toBeNull()
    expect(byName.get('B')?.parentTaskUid, 'B copy is at the top').toBeNull()
  })

  it('FR-033 NO_SAME_UID: no copy wears a source UID', () => {
    const { stage, made } = copyThenPaste([A1, B])
    expect(made, 'premise: both copies were made').toHaveLength(2)
    expect(stage.tasks().map((one) => one.uid).sort((a, b) => a - b), 'the four sources keep their UIDs').toEqual(
      expect.arrayContaining([P, A, A1, B]),
    )
    for (const one of made) expect([P, A, A1, B]).not.toContain(one.uid)
  })

  it('FR-033 ONLY_CHOSEN_COPIED: descendant picked FIRST, then its ancestor -> the subtree once', () => {
    const { made, byName } = copyThenPaste([A1, A])
    expect(made.map((one) => one.name).sort()).toEqual(['A', 'A1'])
    expect(byName.get('A')?.parentTaskUid, 'P is not copied and task-group-2 derives from no Task: the root').toBeNull()
    expect(byName.get('A1')?.parentTaskUid, 'inside the subtree the parent is the copy').toBe(byName.get('A')?.uid)
  })

  it('FR-033 MANY_TASKS_ALL_COPIED + ONLY_CHOSEN_COPIED: A, A1 and B picked -> A, A1, B once each', () => {
    const { made } = copyThenPaste([B, A1, A])
    expect(made.map((one) => one.name).sort()).toEqual(['A', 'A1', 'B'])
  })

  it('control (passes even if only the first Task were kept): ancestor picked first -> the subtree once', () => {
    const { made } = copyThenPaste([A, A1])
    expect(made.map((one) => one.name).sort()).toEqual(['A', 'A1'])
  })

  it('control: one leaf Task picked -> exactly one copy', () => {
    const { made } = copyThenPaste([B])
    expect(made.map((one) => one.name)).toEqual(['B'])
  })
})

// WHY: brief contract only (see the seam block above); the RS-27 fall-through itself is
// T-293 copyTaken, but no clause says two chosen rows are an uncopyable choice.
describe('two rows chosen at copy time -- the brief contract, NOT a spec clause', () => {
  it('brief + copyTaken RS-27: Ctrl+C with two rows chosen is told RS-27 and holds nothing to paste', () => {
    let built: ShellBench | null = null
    let pickTaskGroup: ((groupId: string, adding: boolean) => void) | null = null
    for (const modifier of ['ctrl', 'shift', 'meta'] as const) {
      const trial = shell(wbsDocument())
      benches.push(trial)
      const pick = (groupId: string, adding: boolean): void => {
        trial.aim({ part: TASK_GROUP_PANEL, entry: null, format: null, taskGroupId: groupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as never)
        trial.click(60, 120, adding ? { [modifier]: true } : {})
        trial.aim(null)
      }
      pick('task-group-1', false)
      pick('task-group-2', true)
      if (trial.last().taskGroupPanel.titles.filter((one) => one.isSelected).length === 2) {
        built = trial
        pickTaskGroup = pick
        break
      }
    }
    expect(built, 'premise: some modifier picks two rows (FR-085)').not.toBeNull()
    const before = JSON.stringify(built!.loop.document())
    built!.send(COPY)
    expect(built!.notices(), 'the copy carries RS-27, which is not shown (CR-712)').not.toContain(RS_27_WORDS)
    expect(JSON.stringify(built!.loop.document()), 'a copy is not an edit').toBe(before)
    pickTaskGroup!('task-group-3', false)
    built!.send(PASTE)
    expect(JSON.stringify(built!.loop.document()), 'nothing was held, so the paste adds nothing').toBe(before)
  })

  it('control: Ctrl+C with one row chosen, then Ctrl+V -> the document changes', () => {
    const trial = shell(wbsDocument())
    benches.push(trial)
    trial.aim({ part: TASK_GROUP_PANEL, entry: null, format: null, taskGroupId: 'task-group-3', resourceUid: null, dividerPanel: null, noticeDismissKey: null } as never)
    trial.click(60, 120)
    trial.aim(null)
    const before = JSON.stringify(trial.loop.document())
    trial.send(COPY)
    trial.send(PASTE)
    expect(JSON.stringify(trial.loop.document())).not.toBe(before)
  })
})
