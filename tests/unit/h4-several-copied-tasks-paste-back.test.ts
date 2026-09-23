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
  rowDocument,
  rowOf,
  shell,
  taskOf,
  type ShellBench,
} from './cr-541-stage'

const MANY_TASKS_ALL_COPIED =
  '⭐ `Task` が 2 つ以上選ばれているときは、選ばれた `Task` をすべて複製し、それぞれを上の段のとおり複製元と同じ行に載せること（MUST）'
const DESCENDANT_COPIED_ONCE =
  '⭐ 選ばれた `Task` のうち、ほかの選ばれた `Task` の WBS の子孫であるものは、その祖先の部分木として 1 度だけ複製すること（MUST）'
const ROOT_IS_A_SIBLING =
  '⭐ 複製の根（選ばれた `Task` の複製）は、複製元と同じ WBS の親の下に兄弟として置き、部分木の内側の親子は複製どうしへ付け替えること（MUST）'
const SAME_ROW = '**複製した `Task` は、複製元と同じ行に載せること（MUST）'
const NO_SAME_UID = '複製した `Task` に、複製元と同じ `UID` を使ってはならない（MUST NOT）'
const CM_8_ROW = '| CM-8 | `Task` | `pasteTaskSubtree` | ⭐ | 部分木を複製する（複製元の `Task` を 1 つ以上運ぶ） | `FR-033` |'
const COPY_TAKEN_ROW =
  '| `selection/copyTaken` | 入力（写せる選び方のときだけ呼び手が送る。写せないときは `RS-27` で断り、出来事を作らない）: `SK-4` ・ `FR-033` | `copiedForPaste` | 根 |'
const CR_541_ROW_8 = '| 8 | Q16 で行と `Task` が両方選ばれたとき | いまの振る舞い（行を写す）のまま。何も書かない | そのまま |'

const readText = (...parts: string[]): string =>
  readFileSync(join(process.cwd(), ...parts), 'utf8').replace(/\r\n/g, '\n')
const GLOSSARY = unbroken(readText('docs', 'spec', '_assets', 'tbl-glossary.md'))
const STATE_MACHINES = unbroken(readText('docs', 'spec', '_assets', 'tbl-state-machines.md'))
const CR_541 = readText('change-request', 'CR-541-land-the-2026-09-22-rulings-in-the-specification.md')

describe('FR-033 / CM-8 / T-293 -- the clauses this file is driven by still stand', () => {
  it.each([MANY_TASKS_ALL_COPIED, DESCENDANT_COPIED_ONCE, ROOT_IS_A_SIBLING, SAME_ROW, NO_SAME_UID])(
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
    expect(copiedForPasteOf(['row-a'], picked(task(1), task(2)))).toEqual({ kind: 'row', groupId: 'row-a' })
  })

  it('FR-033 (row half) control: one row and no Task -> the row is copied', () => {
    expect(copiedForPasteOf(['row-b'], NOTHING)).toEqual({ kind: 'row', groupId: 'row-b' })
  })
})

// WHY: these two are the parent brief's seam contract; no clause of docs/spec decides them
// (PND-449 records them as the old behaviour). Kept apart so a spec reader can drop them.
describe('copiedForPasteOf -- the brief contract, NOT a spec clause', () => {
  it('brief: the task copy lists the Tasks in pick order (SL-7b keeps that order)', () => {
    expect(uidsOf(copiedForPasteOf([], picked(task(7), task(3), task(5))))).toEqual([7, 3, 5])
  })

  it('brief: two rows chosen at copy time -> null, whatever Tasks are chosen', () => {
    expect(copiedForPasteOf(['row-a', 'row-b'], NOTHING)).toBeNull()
    expect(copiedForPasteOf(['row-a', 'row-b'], picked(task(1)))).toBeNull()
  })
})

const P = 1
const A = 2
const A1 = 3
const B = 4
const COPY = keyOf('C', { ctrl: true })
const PASTE = keyOf('V', { ctrl: true })
const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')
const RS_27_WORDS: string = (DISPLAY_WORDS.reasons as { rowId: string; text: { ja: string } }[]).find(
  (one) => one.rowId === 'RS-27',
)!.text.ja

// WHY: P on row-1 holds A (row-2), A holds A1 (row-3); B is a root on row-1. Dates differ
// so no two bars overlap and every bar has its own body to press.
const wbsDocument = (): Record<string, unknown> =>
  rowDocument(
    [
      { id: 'row-1', parentId: null },
      { id: 'row-2', parentId: null },
      { id: 'row-3', parentId: null },
    ],
    {},
    {
      tasks: [
        taskOf(P, { name: 'P', start: '2026-04-06T08:00:00', finish: '2026-04-10T17:00:00' }),
        taskOf(A, { name: 'A', wbsParentUid: P, start: '2026-04-13T08:00:00', finish: '2026-04-17T17:00:00' }),
        taskOf(A1, { name: 'A1', wbsParentUid: A, start: '2026-04-20T08:00:00', finish: '2026-04-24T17:00:00' }),
        taskOf(B, { name: 'B', start: '2026-04-27T08:00:00', finish: '2026-05-01T17:00:00' }),
      ],
      taskGroupMembers: [
        { taskUid: P, groupId: 'row-1', stackOrder: null },
        { taskUid: A, groupId: 'row-2', stackOrder: null },
        { taskUid: A1, groupId: 'row-3', stackOrder: null },
        { taskUid: B, groupId: 'row-1', stackOrder: null },
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
  rowOfTask(uid: number): string | undefined
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
    rowOfTask: (uid) => schedule().taskGroupMembers.find((one: any) => one.taskUid === uid)?.groupId,
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
    expect(stage.rowOfTask(byName.get('A1').uid), 'SAME_ROW for A1').toBe('row-3')
    expect(stage.rowOfTask(byName.get('B').uid), 'SAME_ROW for B').toBe('row-1')
  })

  it('FR-033 ROOT_IS_A_SIBLING: each copy root sits under its source WBS parent', () => {
    const { byName } = copyThenPaste([A1, B])
    expect(byName.get('A1')?.wbsParentUid, 'A1 copy is a sibling of A1, under A').toBe(A)
    expect(byName.get('B')?.wbsParentUid, 'B copy is a sibling of B, at the top').toBeNull()
  })

  it('FR-033 NO_SAME_UID: no copy wears a source UID', () => {
    const { stage, made } = copyThenPaste([A1, B])
    expect(made, 'premise: both copies were made').toHaveLength(2)
    expect(stage.tasks().map((one) => one.uid).sort((a, b) => a - b), 'the four sources keep their UIDs').toEqual(
      expect.arrayContaining([P, A, A1, B]),
    )
    for (const one of made) expect([P, A, A1, B]).not.toContain(one.uid)
  })

  it('FR-033 DESCENDANT_COPIED_ONCE: descendant picked FIRST, then its ancestor -> the subtree once', () => {
    const { made, byName } = copyThenPaste([A1, A])
    expect(made.map((one) => one.name).sort()).toEqual(['A', 'A1'])
    expect(byName.get('A')?.wbsParentUid, 'the copy root stays under P').toBe(P)
    expect(byName.get('A1')?.wbsParentUid, 'inside the subtree the parent is the copy').toBe(byName.get('A')?.uid)
  })

  it('FR-033 MANY_TASKS_ALL_COPIED + DESCENDANT_COPIED_ONCE: A, A1 and B picked -> A, A1, B once each', () => {
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
    let pickRow: ((groupId: string, adding: boolean) => void) | null = null
    for (const modifier of ['ctrl', 'shift', 'meta'] as const) {
      const trial = shell(wbsDocument())
      benches.push(trial)
      const pick = (groupId: string, adding: boolean): void => {
        trial.aim({ part: ROW_TITLE_PANEL, entry: null, format: null, rowGroupId: groupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as never)
        trial.click(60, 120, adding ? { [modifier]: true } : {})
        trial.aim(null)
      }
      pick('row-1', false)
      pick('row-2', true)
      if (trial.last().rowTitlePanel.titles.filter((one) => one.isSelected).length === 2) {
        built = trial
        pickRow = pick
        break
      }
    }
    expect(built, 'premise: some modifier picks two rows (FR-085)').not.toBeNull()
    const before = JSON.stringify(built!.loop.document())
    built!.send(COPY)
    expect(built!.notices(), 'the copy is told RS-27').toContain(RS_27_WORDS)
    expect(JSON.stringify(built!.loop.document()), 'a copy is not an edit').toBe(before)
    pickRow!('row-3', false)
    built!.send(PASTE)
    expect(JSON.stringify(built!.loop.document()), 'nothing was held, so the paste adds nothing').toBe(before)
  })

  it('control: Ctrl+C with one row chosen, then Ctrl+V -> the document changes', () => {
    const trial = shell(wbsDocument())
    benches.push(trial)
    trial.aim({ part: ROW_TITLE_PANEL, entry: null, format: null, rowGroupId: 'row-3', resourceUid: null, dividerPanel: null, noticeDismissKey: null } as never)
    trial.click(60, 120)
    trial.aim(null)
    const before = JSON.stringify(trial.loop.document())
    trial.send(COPY)
    trial.send(PASTE)
    expect(JSON.stringify(trial.loop.document())).not.toBe(before)
  })
})
