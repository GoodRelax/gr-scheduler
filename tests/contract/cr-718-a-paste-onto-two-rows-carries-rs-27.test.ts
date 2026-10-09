// CR-718 spec-only cases: a paste while two or more rows are chosen leaves the document alone, carries RS-27, and stands no notice (FR-033, FR-076).

import { afterEach, describe, expect, it, vi } from 'vitest'

import { bare } from './spec-table'
import { DISPLAY_WORDS, keyOf, REQUIREMENTS, rowDocument, rowOf, shell, taskOf, type ShellBench } from '../unit/cr-541-stage'

// WHY: RS-27 shows nothing, so the raise is only visible on the seam the shell sends every event through (notices/noticeRaised, T-290).
const seen = vi.hoisted(() => ({ raised: [] as string[] }))

vi.mock('../../src/use-case/advance-screen-session/advance-screen-session', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/use-case/advance-screen-session/advance-screen-session')>()
  return {
    ...real,
    advanceScreenSession: (session: never, event: { type: string; reason?: string }) => {
      if (event.type === 'noticeRaised' && typeof event.reason === 'string') seen.raised.push(event.reason)
      return (real.advanceScreenSession as (a: never, b: unknown) => unknown)(session, event)
    },
  }
})

const SEVERAL_ROWS_ARE_REFUSED =
  '⛔ 貼り付け先として行が 2 つ以上選ばれているときは、貼り付けを受け付けず、行えない理由を `FR-029` のとおり通知の仕組みへ運ぶこと（MUST） —— どの行の子とするかが決まらない。'
const THE_REASON_IS_RS_27 = '⚠️ この場面に当たる 表 T-233 の行は無いので、運ぶ理由は同要求の落ち先の `RS-27` である。'
const A_REASON_IS_A_T_233_ROW = '⭐ 通知が運ぶ理由は 表 T-233 の行とすること（MUST）'
const A_HIDDEN_REASON_STANDS_NO_CARD =
  '「出さない」の理由は、上げられても通知の欄に 1 枚を立てない —— 行は理由として残り、`Agent API` の拒否の値（表 T-035 の `AG-9a`）はその行を運ぶ。'
const SAME_ROW = '**複製した `Task` は、複製元と同じ行に載せること（MUST）'

describe('FR-033 / FR-076 -- the clauses this file is driven by still stand', () => {
  it.each([SEVERAL_ROWS_ARE_REFUSED, THE_REASON_IS_RS_27, A_REASON_IS_A_T_233_ROW, A_HIDDEN_REASON_STANDS_NO_CARD, SAME_ROW])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const COPY = keyOf('C', { ctrl: true })
const PASTE = keyOf('V', { ctrl: true })
const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

/** @purity pure */
function wordsOf(rowId: string): { readonly ja: string; readonly en: string } {
  const found = (DISPLAY_WORDS.reasons as { rowId: string; text: { ja: string; en: string } }[]).find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no ${rowId}`)
  return found.text
}

// WHY: one Task per row, all at the WBS top, so the paste has nothing to infer a parent from.
/** @purity pure */
function threeRows(): Record<string, any> {
  const document = rowDocument([
    { id: 'row-1', parentId: null },
    { id: 'row-2', parentId: null },
    { id: 'row-3', parentId: null },
  ])
  document.schedule.tasks = [1, 2, 3].map((uid) => taskOf(uid, { name: `T${uid}` }))
  return document
}

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
  seen.raised.length = 0
})

/** @purity non-pure */
function pickRow(bench: ShellBench, groupId: string, modifier: 'ctrl' | 'shift' | 'meta' | null): void {
  bench.aim({ part: ROW_TITLE_PANEL, entry: null, format: null, rowGroupId: groupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as never)
  bench.click(60, 120, modifier === null ? {} : { [modifier]: true })
  bench.aim(null)
}

const pickedRows = (bench: ShellBench): readonly string[] =>
  bench.last().rowTitlePanel.titles.filter((one: any) => one.isSelected).map((one: any) => one.groupId)

/** @purity non-pure */
function copiedTask(bench: ShellBench, uid: number): void {
  const drawn = (bench.loop.current()?.geometry.tasks as any[] | undefined)?.find((one) => one.taskUid === uid)
  if (drawn?.plan?.form !== 'outline') throw new Error(`premise: Task ${uid} has no bar body to press`)
  const xs = drawn.plan.points.map((one: any) => one.x)
  const ys = drawn.plan.points.map((one: any) => one.y)
  bench.click((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2)
  bench.send(COPY)
}

// WHY: no row names the modifier that adds a row to the chosen rows, so each is tried on a fresh shell until two rows stand chosen.
/** @purity non-pure */
function copiedThenRowsChosen(rows: readonly string[]): ShellBench {
  for (const modifier of ['ctrl', 'shift', 'meta'] as const) {
    const bench = shell(threeRows())
    benches.push(bench)
    copiedTask(bench, 1)
    rows.forEach((groupId, index) => pickRow(bench, groupId, index === 0 ? null : modifier))
    if (pickedRows(bench).length === rows.length) {
      seen.raised.length = 0
      return bench
    }
  }
  throw new Error(`premise: some modifier chooses ${rows.length} rows (FR-085)`)
}

describe('FR-033 -- a paste while two rows are chosen is refused, carries RS-27, and stands no notice', () => {
  it(`${SEVERAL_ROWS_ARE_REFUSED} -- the document does not change`, () => {
    const bench = copiedThenRowsChosen(['row-2', 'row-3'])
    const before = JSON.stringify(bench.loop.document())
    const unsavedBefore = bench.loop.hasUnsavedEdits()
    bench.send(PASTE)
    expect(JSON.stringify(bench.loop.document())).toBe(before)
    expect(bench.loop.hasUnsavedEdits(), 'the paste adds no unsaved edit').toBe(unsavedBefore)
  })

  it(`${THE_REASON_IS_RS_27} -- RS-27 is carried`, () => {
    const bench = copiedThenRowsChosen(['row-2', 'row-3'])
    bench.send(PASTE)
    expect(seen.raised, `RS-27 is raised (raised: ${JSON.stringify(seen.raised)})`).toContain('RS-27')
    expect(seen.raised, 'no other row of T-233 is raised for this refusal').toEqual(expect.not.arrayContaining(['RS-10', 'RS-15']))
  })

  it(`${A_HIDDEN_REASON_STANDS_NO_CARD} -- no notice stands`, () => {
    const bench = copiedThenRowsChosen(['row-2', 'row-3'])
    bench.send(PASTE)
    expect(seen.raised, 'premise: RS-27 was raised').toContain('RS-27')
    expect(bench.notices()).toEqual([])
    const said = bench.notices().join(' | ')
    for (const language of ['ja', 'en'] as const) {
      expect(said.includes(wordsOf('RS-27')[language]), `RS-27 words (${language}) are not on the screen`).toBe(false)
    }
  })
})

describe('controls -- one row chosen, the paste goes through and raises no RS-27', () => {
  it(`${SAME_ROW} -- one chosen row`, () => {
    const bench = copiedThenRowsChosen(['row-2'])
    const before = (bench.loop.document() as any).schedule.tasks.length
    bench.send(PASTE)
    expect((bench.loop.document() as any).schedule.tasks.length, 'one copy was made').toBe(before + 1)
    expect(seen.raised).not.toContain('RS-27')
    expect(bench.notices()).toEqual([])
  })
})
