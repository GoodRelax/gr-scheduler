// CR-718 spec-only cases: a bar shape pressed and released without a drag makes no task, carries RS-53, and stands no notice (FR-001 TC-8, FR-076).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { bare, specTable, unbroken } from './spec-table'
import { DISPLAY_WORDS, pointerOf, taskGroupDocument, shell, type ShellBench } from '../unit/cr-541-stage'

// WHY: the shell sends every event to the session through advanceScreenSession (notices/noticeRaised, T-290); a hidden
// reason is raised and stands no card, so the raise is only visible on this seam.
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

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const TC_8_CARRIES_THE_REASON = '⭐ 作らなかった理由として 表 T-233 の `RS-53` を運ぶこと（MUST）'
const A_CLICK_MAKES_NO_BAR_TASK = '⛔ クリックでは、バーの形状のタスクを作らないこと（MUST NOT）'
const A_BAR_SHAPE_DRAG_MAKES_THE_SPAN =
  '⭐ バーの形状（表 T-012 の `SH-1` 〜 `SH-4`）を構えてドラッグしたときは、引いた期間のタスクを作ること（MUST）'
const A_MILESTONE_IS_PLACED_BY_A_PRESS_ALONE = '⛔ マイルストーンは押すだけで置くこと（MUST）'
const A_HIDDEN_REASON_STANDS_NO_CARD =
  '「出さない」の理由は、上げられても通知の欄に 1 枚を立てない —— 行は理由として残り、`Agent API` の拒否の値（表 T-035 の `AG-9a`）はその行を運ぶ。'
const THE_TEXT_DOES_NOT_DECIDE_AGAIN =
  '⛔ 要求の本文に「告げる」と書かれていても、出すかどうかを本文で決め直してはならない（MUST NOT） —— 欄が唯一の正である。'

describe('FR-001 / FR-076 -- the clauses this file is driven by still stand', () => {
  it.each([
    TC_8_CARRIES_THE_REASON,
    A_CLICK_MAKES_NO_BAR_TASK,
    A_BAR_SHAPE_DRAG_MAKES_THE_SPAN,
    A_MILESTONE_IS_PLACED_BY_A_PRESS_ALONE,
    A_HIDDEN_REASON_STANDS_NO_CARD,
    THE_TEXT_DOES_NOT_DECIDE_AGAIN,
  ])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

interface Entrance {
  readonly row: string
  readonly surface: string
}

// see T-109, T-012
/** @purity pure */
function entranceArming(arm: string, shapeRow: string | null): Entrance {
  const found = specTable('T-109').rows.filter(
    (row) => bare(row.by['構え'] ?? '') === arm && (shapeRow === null || bare(row.by['何の入口か'] ?? '') === shapeRow),
  )
  if (found.length === 0) throw new Error(`table T-109 arms ${arm} ${shapeRow ?? ''} from no entrance`)
  const first = found[0] as (typeof found)[number]
  return { row: first.id, surface: bare(first.by['面'] ?? '') }
}

const RECTANGLE = entranceArming('AR-2', 'SH-1')
const CHEVRON = entranceArming('AR-2', 'SH-2')
const MILESTONE = entranceArming('AR-3', null)

const GROUND = { x: 700, y: 400 }
const FAR_GROUND = { x: 1000, y: 460 }

/** @purity pure */
function wordsOf(rowId: string): { readonly ja: string; readonly en: string } {
  const found = (DISPLAY_WORDS.reasons as { rowId: string; text: { ja: string; en: string } }[]).find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no ${rowId}`)
  return found.text
}

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
  seen.raised.length = 0
})

/** @purity non-pure */
function emptyShell(): ShellBench {
  const bench = shell(taskGroupDocument([]))
  benches.push(bench)
  seen.raised.length = 0
  return bench
}

const tasksOf = (bench: ShellBench): any[] => (bench.loop.document() as any).schedule.tasks

describe('TC-8 -- a bar shape pressed and released without travel makes no task and carries RS-53', () => {
  it.each([
    ['the rectangle', RECTANGLE],
    ['the chevron', CHEVRON],
  ])(`${TC_8_CARRIES_THE_REASON} -- %s`, (_name, entrance) => {
    const bench = emptyShell()
    const before = JSON.stringify(bench.loop.document())
    bench.press(entrance.surface, entrance.row, null)
    const raisedBefore = seen.raised.length
    bench.click(GROUND.x, GROUND.y)
    const raised = seen.raised.slice(raisedBefore)
    expect(raised, `RS-53 is carried (raised: ${JSON.stringify(seen.raised)})`).toContain('RS-53')
    expect(raised, 'the fallback RS-27 is not what is carried').not.toContain('RS-27')
    expect(raised, 'the bundle row RS-10 is not what is carried').not.toContain('RS-10')
    expect(raised, 'the catch-all RS-15 is not what is carried').not.toContain('RS-15')
    expect(JSON.stringify(bench.loop.document()), A_CLICK_MAKES_NO_BAR_TASK).toBe(before)
    expect(tasksOf(bench)).toHaveLength(0)
    expect(bench.loop.hasUnsavedEdits()).toBe(false)
  })

  it(`${A_HIDDEN_REASON_STANDS_NO_CARD} -- no notice stands`, () => {
    const bench = emptyShell()
    bench.press(RECTANGLE.surface, RECTANGLE.row, null)
    bench.click(GROUND.x, GROUND.y)
    expect(seen.raised, 'premise: RS-53 was raised').toContain('RS-53')
    expect(bench.notices(), THE_TEXT_DOES_NOT_DECIDE_AGAIN).toEqual([])
    const said = bench.notices().join(' | ')
    for (const rowId of ['RS-53', 'RS-27', 'RS-10', 'RS-15']) {
      for (const language of ['ja', 'en'] as const) {
        expect(said.includes(wordsOf(rowId)[language]), `${rowId} words (${language}) are not on the screen`).toBe(false)
      }
    }
  })
})

describe('controls -- the same shell raises RS-53 for nothing but the click', () => {
  it(`${A_BAR_SHAPE_DRAG_MAKES_THE_SPAN} -- a drag makes a task and raises no RS-53`, () => {
    const bench = emptyShell()
    bench.press(RECTANGLE.surface, RECTANGLE.row, null)
    const raisedBefore = seen.raised.length
    bench.send(pointerOf('down', GROUND.x, GROUND.y))
    bench.send(pointerOf('move', FAR_GROUND.x, FAR_GROUND.y))
    bench.send(pointerOf('up', FAR_GROUND.x, FAR_GROUND.y))
    expect(tasksOf(bench), 'a task was made by the drag').toHaveLength(1)
    expect(seen.raised.slice(raisedBefore)).not.toContain('RS-53')
    expect(bench.notices()).toEqual([])
  })

  it(`${A_MILESTONE_IS_PLACED_BY_A_PRESS_ALONE} -- a milestone press makes a task and raises no RS-53`, () => {
    const bench = emptyShell()
    bench.press(MILESTONE.surface, MILESTONE.row, null)
    const raisedBefore = seen.raised.length
    bench.click(GROUND.x, GROUND.y)
    expect(tasksOf(bench), 'a milestone was made by the press').toHaveLength(1)
    expect(tasksOf(bench)[0].milestone).toBe(true)
    expect(seen.raised.slice(raisedBefore)).not.toContain('RS-53')
    expect(bench.notices()).toEqual([])
  })
})
