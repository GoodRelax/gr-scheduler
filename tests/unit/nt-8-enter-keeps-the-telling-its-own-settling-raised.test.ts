// The anchor for ONE ordering in the shell: which tellings NT-8's stage is
// reckoned against (`noticeReasonsOnArrival` of `frame-loop.ts`).
//
// ⛔⛔ WHAT WAS MEASURED BEFORE THIS (2026-09-09). Settling a REFUSED value in a
// field of the `Properties Panel` and spending it with the key SK-19 assigns
// left ZERO tellings on the description, while the same value spent on a pointer
// move left the one that was raised. `spendFieldCommit` runs at the head of
// every happening, so by the time SK-19's first stage and IN-4's first level
// were read, `raisedNotices` already held the telling THIS press had just made
// -- and the press put its own answer away again before anyone could read it.
//
// Unit under test:
//   UF-48  `frame-loop.ts` (CP-25 of table T-062) -- the shell, which holds
//          `ScreenSession.notices` (LY-5 of table T-060) and is the one side
//          that puts a telling away.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// THE CLAUSES THESE CASES EXIST FOR (rule 03 section 3: quoted because holding
// them verbatim IS the point)
// ---------------------------------------------------------------------------
//
//   T-036 SK-19: 「⭐⭐ 出ている通知があるときは、それを 1 つ消すこと（MUST）...
//     ほかに何も出ていないときは、その場の編集を確定する」
//     ⇒ 出ている is a question about the instant the key ARRIVED.
//
//   T-037 NT-8:
//     「通知が 2 つ以上立っているときは、いちばん新しいものから消すこと（MUST）」
//       -- 「いちばん新しいものが、いま行った操作への答えだからである」
//     ⛔⛔ 「この消去を、`Enter` と `Esc` のどの階層よりも先に行うこと（MUST）」
//     ⛔ 「消すものが 1 つも無いときに、この階層で `Enter` や `Esc` を消費しては
//        ならない（MUST NOT）」 -- 「消費すると、通知が出ていないあいだ `IN-4` と
//        `SK-19` の第 1 階層が届かなくなる」
//
//   T-233 RS-55 / RS-58 -- the two refusals these cases raise, and FR-076 with
//     NT-1 is why a refused write has to be told at all.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - Whether the WRITE should have happened at all. SK-19 reads 「ほかに何も出て
//     いないときは、その場の編集を確定する」, and the settling itself happens in
//     `DomScreenSurface` before the shell hears the key (its own `keydown`
//     listener on the panel runs first) -- so whether a telling standing at the
//     moment of the press should HOLD BACK the write is a question about a seam
//     these cases cannot reach, and nothing here decides it.
//   - Which words the reader sees. FR-038 (MUST NOT) keeps them in one
//     dictionary; these cases compare against THAT, never against a spelling.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type {
  HumanInput,
  InputModifiers,
} from '../../src/adapter/input-command-translator/input-command-translator'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at read time rather than copied (Chapter 1.9)
// ---------------------------------------------------------------------------

const T_036: SpecTable = specTable('T-036')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/** The key table T-036 assigns one row, as that table spells it. */
const keyNameOf = (rowId: string): string => {
  const spelled = bare(rowOf(T_036, rowId).by['割当'] ?? '')
    .replace(/＋/g, '+')
    .split('/')[0]
  const parts = (spelled ?? '').split('+').map((one) => one.trim()).filter((one) => one.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error('table T-036 states no assignment for SK-19')
  if (parts.length !== 1) throw new Error(`SK-19 is no longer one bare key: ${spelled ?? ''}`)
  return last
}

/** The words FR-038's one dictionary holds for one row of table T-233. */
const wordsOf = (rowId: string): string => {
  const found = (displayWords as any).reasons.find((one: any) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${rowId}`)
  return found.text.ja as string
}

const RS_55 = 'RS-55'
const RS_58 = 'RS-58'

// ---------------------------------------------------------------------------
// The loop, driven the way a person settles a value in the Properties Panel
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

/** BT-4 of table T-034 -- the template FR-027 starts a reader with. */
function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) {
    throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

/** SK-19, spelled the way table T-036's assignment column spells it. */
const SETTLE_KEY_NAME = keyNameOf('SK-19')

const SETTLE_KEY: HumanInput = {
  kind: 'key',
  key: SETTLE_KEY_NAME,
  modifiers: { ...NO_MODIFIERS },
} as unknown as HumanInput

/**
 * A happening that spends a settled value and decides nothing else.
 *
 * ⭐ THE CONTRAST THE FIRST CASE IS BUILT ON: the shell reads IF-9's answer at
 * the head of EVERY happening, so this one carries the same write as the key --
 * and it is not on either of the two ladders NT-8 stands at the head of.
 */
const POINTER_MOVE: HumanInput = {
  kind: 'pointer',
  phase: 'move',
  button: 'left',
  x: 500,
  y: 400,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
} as unknown as HumanInput

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Loop {
  /** Hand the surface one settled value, then spend it on one happening. */
  settle(commit: { row: string; key: unknown; text: string }, spend: HumanInput): void
  /** One happening with no settled value waiting. */
  send(input: HumanInput): void
  /** The tellings the last drawn description carries, newest last. */
  told(): readonly string[]
}

/**
 * UF-48, driven with a surface that answers one settled value and then nothing.
 *
 * ⚠️ THE FAKE IS NOT THE TEST (R6.3). Nothing in it decides which telling stands.
 */
function loopWith(document: Document): Loop {
  const views: ScreenView[] = []
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  let held: unknown = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => {
      const one = held
      held = null
      return one as never
    },
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => null as ScreenPart | null,
  }
  const wiring: ScreenWiring = { surface, language: 'ja' as DisplayLanguage }
  const loop = frameLoop({ showSvg: () => undefined } as any, document, SCREEN, wiring)
  const runFrames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
    expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
  }
  runFrames()
  return {
    settle: (commit, spend) => {
      held = commit
      loop.receiveInput(spend)
      runFrames()
    },
    send: (input) => {
      loop.receiveInput(input)
      runFrames()
    },
    told: () =>
      ((views[views.length - 1]?.notices ?? []) as any[]).map((one) => one.text as string),
  }
}

/** The first `Task` of the bundled template, which every case below edits. */
function firstTask(document: Document): {
  uid: number
  start: string | null
  finish: string | null
} {
  const task = document.schedule.tasks[0]
  if (task === undefined) throw new Error('the bundled template holds no Task')
  return { uid: task.uid, start: task.start, finish: task.finish }
}

/** A day one year before the one handed in, spelled the way the document keeps it. */
function aYearBefore(day: string): string {
  const year = Number(day.slice(0, 4))
  return `${String(year - 1)}${day.slice(4)}`
}

/** `PR-15` of table T-016 -- a WBS parent that is the task itself (`RS-55`). */
const wbsParentOfItself = (uid: number) => ({
  row: 'PR-15',
  key: { holder: 'task', uid, column: 'wbsParentUid' },
  text: String(uid),
})

/** `PR-3` of table T-016 -- a finish before the start (`RS-58`). */
const finishBeforeStart = (uid: number, start: string) => ({
  row: 'PR-3',
  key: { holder: 'task', uid, column: 'finish' },
  text: aYearBefore(start),
})

// ===========================================================================
// The rows these cases are driven by are still in the manuscript
// ===========================================================================

describe('the rows these cases read are still in the manuscript', () => {
  it('⭐ SK-19 is still one bare key, and the dictionary still parts RS-55 from RS-58', () => {
    expect(SETTLE_KEY_NAME.length).toBeGreaterThan(0)
    expect(wordsOf(RS_55)).not.toBe(wordsOf(RS_58))
  })

  it('⭐ SK-19 still puts the dismissal ahead of settling the in-place edit', () => {
    // ⛔ GOES RED IF THE ROW IS REWORDED. The whole ordering these cases hold is
    // the row's own 「出ている通知があるときは ... ほかに何も出ていないときは」.
    const said = rowOf(T_036, 'SK-19').cells.join(' ')
    expect(said).toContain('出ている通知があるとき')
    expect(said).toContain('ほかに何も出ていないとき')
  })
})

// ===========================================================================
// The defect: a press must not put away the answer it has just raised
// ===========================================================================

describe('NT-8 / SK-19: the dismissal is reckoned at the moment the key arrived', () => {
  it('⭐⭐ THE DEFECT: settling a refused value with SK-19 leaves the telling standing', () => {
    // ⛔⛔ MEASURED BEFORE THE FIX: zero tellings. `spendFieldCommit` raised
    // `RS-55` at the head of the happening, SK-19's first stage then read
    // `raisedNotices` and found something to put away, and put away the very
    // telling this press had raised. ⚠️ NT-8's own MUST NOT is the same reading
    // from the other side: at the instant the key arrived there was nothing to
    // put away, so this stage may not consume the key at all.
    const document = templateDocument()
    const task = firstTask(document)
    const one = loopWith(document)

    one.settle(wbsParentOfItself(task.uid), SETTLE_KEY)

    expect(one.told(), 'FR-076 with NT-1 (MUST): the refusal is told').toEqual([wordsOf(RS_55)])
  })

  it('⛔ THE CONTRAST: the same value spent on a pointer move told the same thing', () => {
    // ⚠️ WITHOUT THIS THE CASE ABOVE COULD BE READ AS "the write now refuses".
    // The write refused before the fix too -- what differed was only the key.
    const document = templateDocument()
    const task = firstTask(document)
    const one = loopWith(document)

    one.settle(wbsParentOfItself(task.uid), POINTER_MOVE)

    expect(one.told()).toEqual([wordsOf(RS_55)])
  })

  it('⭐⭐ A telling that WAS standing is the one put away, not the one just raised', () => {
    // ⛔ THE OTHER HALF OF THE SAME ORDERING. 「いちばん新しいもの」 is explained by
    // NT-8 as 「いま行った操作への答え」 -- an answer the person has already been
    // shown and is now putting away. The telling this very press raised has not
    // been shown at all.
    // ⚠️ BEFORE THE FIX this ended with `RS-55` still standing and `RS-58` gone:
    // the list's own end was the telling the press had just made.
    const document = templateDocument()
    const task = firstTask(document)
    expect(task.start, 'the bundled template gives its first Task a start').not.toBeNull()
    const one = loopWith(document)

    one.settle(wbsParentOfItself(task.uid), POINTER_MOVE)
    expect(one.told()).toEqual([wordsOf(RS_55)])

    one.settle(finishBeforeStart(task.uid, task.start as string), SETTLE_KEY)

    expect(one.told()).toEqual([wordsOf(RS_58)])
  })

  it('⛔ THE CONTROL: with nothing being settled, SK-19 still puts a telling away', () => {
    // ⚠️ WITHOUT THIS, A BUILD THAT NEVER PUT A TELLING AWAY ON THE KEY WOULD
    // PASS EVERY CASE ABOVE -- and NT-8 (MUST) gives that key the power.
    const document = templateDocument()
    const task = firstTask(document)
    const one = loopWith(document)

    one.settle(wbsParentOfItself(task.uid), POINTER_MOVE)
    expect(one.told()).toEqual([wordsOf(RS_55)])

    one.send(SETTLE_KEY)

    expect(one.told()).toEqual([])
  })
})
