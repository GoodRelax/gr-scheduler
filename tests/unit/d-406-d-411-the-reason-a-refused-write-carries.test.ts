// Anchors for two ledger rows about ONE line of the shell: which row of table
// T-233 a refused write is told on (`reasonOfWriteRefusal` of `frame-loop.ts`).
//
//   DFC-411 -- table T-233 gained four rows for write refusals (`RS-55` .. `RS-58`)
//            and nothing routed to them, so every one of those situations still
//            reached the reader as `RS-10` 「命令が拒否されたので、束ごと落とした」.
//   DFC-406 -- the WIDE half of that same line was unguarded. Measured 2026-09-08:
//            widening the shape's test to EVERY WS-3 refusal, so that `RS-10`
//            became unreachable from this road altogether, took ZERO cases red
//            in the whole suite.
//
// Unit under test:
//   UF-48  `frame-loop.ts` (CP-25 of table T-062) -- the shell, which is the one
//          side that turns a refusal into a telling (FR-076).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// THE CLAUSE THESE CASES EXIST FOR (rule 03 section 3: name the row; this one is
// quoted because holding it verbatim IS the point)
// ---------------------------------------------------------------------------
//
//   T-037's closing paragraph, under FR-076:
//     ⛔ 「拒否の理由を 1 つの行へ潰してはならない（MUST NOT）」 -- 「書き込みが
//        拒まれたとき、拒んだ命令の別を捨てて `RS-10` だけを運ぶ造りでは、本表に
//        場面ごとの行を何行足しても、画面に出る語は 1 文字も変わらない」
//     ⭐ 「本表に行を足す者は、その行へ振り分ける道が在ることまで確かめること
//        （MUST）」 -- 「行と辞書の項が揃っていても、運ぶ側が別を捨てていれば、
//        届くのは古い語である」
//     ⚠️ 「これは生成器も、辞書と表を突き合わせる検査も捕まえない」
//
//   T-233 RS-55  「動かす先が、その行自身か、その行の子孫である」, 正 表 T-015a の
//                `HM-4`, and the row itself says it covers BOTH axes
//   T-233 RS-58  「終了が開始より前である」, 正 Chapter 6.1 の 表 T-220 の `IV-10`
//   T-233 RS-10  「命令が拒否されたので、束ごと落とした」, 正 表 T-067 の `WS-3` --
//                the row every other write refusal keeps
//   T-067 WS-3   「操作を検証し、新しい文書を組み立てる。1 つでも拒まれたら全部を
//                捨てる」 -- why one bundle carries one telling
//   T-016 PR-3   `start` / `finish`, and PR-15 `wbsParentUid` -- the two panel
//                items these cases settle a value in
//   T-065 IF-9   the seam a value settled in a field of the `Properties Panel`
//                arrives on, carrying the row it names
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - `RS-56` 「同じ `Task` を、依存の先行と後続の両方にしようとした」. Its 正 is
//     FR-009, which forbids THREE dependencies in one sentence and gives none of
//     the three a row ID -- so `edit-dependency.ts` spells all of its refusals
//     `CM-36` against `FR-009`, and command and rule together cannot tell 「両端
//     が同じ」 from 「同じ対の重複」 or 「端点がタスクでない」. ⛔ A case that
//     asserted `RS-56` for that pair would be asserting a lie about the other
//     two. What is owed is row IDs for FR-009's three prohibitions, or a finer
//     「理由の区分」 on `Refusal` (AG-9a of table T-035).
//   - `RS-57` 「同じ id を持つものが、この文書に既に在る」. The routing exists (the
//     shell reads every `IV-1` refusal as that row) but nothing a person can
//     press reaches it: every id a write carries is minted by the shell, so a
//     duplicate cannot be asked for. ⚠️ The manuscript case below is what keeps
//     the routing honest until an entrance for it exists.
//   - Which words the reader sees. FR-038 (MUST NOT) keeps them in one
//     dictionary; these cases compare against THAT, never against a spelling.
//   - What `Enter` does to a telling raised by its own settling. ⚠️ MEASURED
//     2026-09-09 while these cases were being written: settling a refused value
//     with the key SK-19 assigns leaves ZERO tellings on the description, while
//     every other happening leaves the one raised. NT-8 of table T-037 puts the
//     dismissal of a standing telling ahead of SK-19's stages, and the shell
//     spends the settled value before either -- so the press raises a telling
//     and then puts it away again. ⛔ These cases spend the settled value on a
//     pointer move instead and say nothing about that ordering: it is a
//     different row's question, and reported rather than decided here.

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
import { bare, bareAll, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at read time rather than copied (Chapter 1.9)
// ---------------------------------------------------------------------------

const T_016: SpecTable = specTable('T-016')
const T_233: SpecTable = specTable('T-233')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/**
 * Every `GRS JSON` column one row of table T-016 names.
 *
 * ⚠️ `bareAll` AND NOT `bare`, because one panel item can edit two columns at
 * once: `PR-3` prints 「`start` / `finish`」 and taking the first would drop the
 * second in silence (DFC-351).
 */
const columnsOf = (id: string): readonly string[] => bareAll(rowOf(T_016, id).by['列（`GRS JSON`）'] ?? '')

/** The manner column table T-233 writes one reason against. */
const mannerOf = (rowId: string): string => bare(rowOf(T_233, rowId).cells[1] ?? '')

/** The 正 column table T-233 gives one reason, as printed. */
const authorityOf = (rowId: string): string => rowOf(T_233, rowId).cells[2] ?? ''

/** The words FR-038's one dictionary holds for one row of table T-233. */
const wordsOf = (rowId: string): { readonly ja: string; readonly en: string } => {
  const found = (displayWords as any).reasons.find((one: any) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${rowId}`)
  return found.text
}

const RS_10 = 'RS-10'
const RS_55 = 'RS-55'
const RS_56 = 'RS-56'
const RS_57 = 'RS-57'
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

/**
 * The happening that SPENDS a settled value.
 *
 * ⭐ ANY HAPPENING DOES: the shell reads IF-9's answer at the head of every one
 * of them, which is what makes a value settled by the host reach the document
 * whichever way the person carries on. ⚠️ A pointer move is chosen because it
 * decides nothing else -- see the note at the head of this file for why the key
 * SK-19 assigns cannot be used to look at what the write raised.
 */
const SPENDING_HAPPENING: HumanInput = {
  kind: 'pointer',
  phase: 'move',
  button: 'left',
  x: 500,
  y: 400,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
} as HumanInput

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Loop {
  /** Hand the surface one settled value, then spend it on one happening. */
  settle(commit: { row: string; key: unknown; text: string }): void
  /** The tellings the last drawn description carries. */
  notices(): readonly { readonly text: string; readonly manner: string }[]
}

/**
 * UF-48, driven with a surface that answers one settled value and then nothing.
 *
 * ⭐ THE SAME SHAPE `tests/unit/d-130-pr-1-pr-2-reach-the-document.test.ts`
 * DRIVES THIS UNIT WITH -- the road a person walks: a value is typed into a
 * field of the `Properties Panel`, the host reports it settled on IF-9, and the
 * shell writes the document.
 * ⚠️ THE FAKE IS NOT THE TEST (R6.3). Nothing in it decides which row is told.
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
    settle: (commit) => {
      held = commit
      loop.receiveInput(SPENDING_HAPPENING)
      runFrames()
    },
    notices: () => (views[views.length - 1]?.notices ?? []) as any,
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

// ===========================================================================
// The manuscript still says what these cases read
// ===========================================================================

describe('the rows these cases are driven by are still in the manuscript', () => {
  it('⭐ table T-233 still holds the four rows of 2026-09-09, each against NT-1', () => {
    // ⛔ GOES RED IF A ROW IS RETIRED OR ITS MANNER MOVES. NT-3a would say
    // something untrue of all four: that manner is an operation of OURS that
    // failed, and nothing here failed -- an input was not accepted.
    for (const row of [RS_55, RS_56, RS_57, RS_58]) {
      expect(mannerOf(row), `table T-233 writes ${row} against`).toBe('NT-1')
      expect(wordsOf(row).ja.length, `the dictionary spells ${row} in ja`).toBeGreaterThan(0)
      expect(wordsOf(row).en.length, `the dictionary spells ${row} in en`).toBeGreaterThan(0)
    }
  })

  it('⭐ the 正 of each row is the rule the routing is keyed on', () => {
    // ⛔⛔ THIS IS THE JOIN THE CLOSING PARAGRAPH OF TABLE T-037 ASKS FOR. The
    // shell picks a row out of a WS-3 bundle by the rule that refused, and the
    // rule it looks for is the one this column names -- so a 正 that moves has
    // to move the routing with it rather than quietly leaving `RS-10` behind.
    expect(authorityOf(RS_55)).toContain('HM-4')
    expect(authorityOf(RS_56)).toContain('FR-009')
    expect(authorityOf(RS_57)).toContain('IV-1')
    expect(authorityOf(RS_58)).toContain('IV-10')
  })

  it('⛔ the dictionary gives no two of these rows the same words', () => {
    // ⚠️ WITHOUT THIS EVERY CASE BELOW IS VACUOUS: telling `RS-55` and telling
    // `RS-10` would be indistinguishable, which is the whole of DFC-411.
    const spelled = [RS_10, RS_55, RS_56, RS_57, RS_58].map((row) => wordsOf(row).ja)
    expect(new Set(spelled).size).toBe(spelled.length)
  })

  it('⭐ table T-016 still edits the two items these cases settle a value in', () => {
    expect(columnsOf('PR-3')).toEqual(['start', 'finish'])
    expect(columnsOf('PR-15')).toEqual(['wbsParentUid'])
  })
})

// ===========================================================================
// DFC-411 -- the rows a press can actually reach
// ===========================================================================

describe('DFC-411 / table T-037: a write refusal is told its own row and not RS-10', () => {
  it('⭐⭐ RS-55: a WBS parent that is the task itself is told HM-4s own row', () => {
    // ⛔⛔ THE DEFECT. Table T-233 gained `RS-55` and the dictionary gained its
    // words, and the reader was still told `RS-10` -- 「命令が拒否されたので、束
    // ごと落とした」, whose next step is 「拒まれた変更を取り除いて、もう一度」.
    // ⭐ A person who typed one uid into one field has nothing to take out.
    const document = templateDocument()
    const task = firstTask(document)
    const one = loopWith(document)

    one.settle({
      row: 'PR-15',
      key: { holder: 'task', uid: task.uid, column: 'wbsParentUid' },
      text: String(task.uid),
    })

    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf(RS_55).ja)
    expect(told[0]?.text).not.toBe(wordsOf(RS_10).ja)
    expect(told[0]?.manner).toBe(mannerOf(RS_55))
  })

  it('⭐⭐ RS-58: a finish before the start is told IV-10s own row', () => {
    const document = templateDocument()
    const task = firstTask(document)
    expect(task.start, 'the bundled template gives its first Task a start').not.toBeNull()
    const one = loopWith(document)

    one.settle({
      row: 'PR-3',
      key: { holder: 'task', uid: task.uid, column: 'finish' },
      text: aYearBefore(task.start as string),
    })

    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf(RS_58).ja)
    expect(told[0]?.text).not.toBe(wordsOf(RS_10).ja)
    expect(told[0]?.manner).toBe(mannerOf(RS_58))
  })

  it('⛔ THE CONTROL: a value the write accepts is told nothing at all', () => {
    // ⚠️ WITHOUT THIS, A BUILD THAT TOLD RS-58 ON EVERY SETTLED DATE WOULD PASS.
    // The same field, the same happening, a finish the aggregate takes.
    const document = templateDocument()
    const task = firstTask(document)
    const one = loopWith(document)

    one.settle({
      row: 'PR-3',
      key: { holder: 'task', uid: task.uid, column: 'finish' },
      text: task.finish as string,
    })

    expect(one.notices().length).toBe(0)
  })
})

// ===========================================================================
// DFC-406 -- the wide half: what is NOT one of those rows stays RS-10
// ===========================================================================

describe('DFC-406 / table T-233: a refusal the table names no row for keeps RS-10', () => {
  it('⭐⭐ a WBS parent naming a uid the document does not hold is told RS-10', () => {
    // ⛔⛔ THE HALF THAT WAS UNGUARDED (measured 2026-09-08). Widening the
    // shell's test until `RS-10` became unreachable took ZERO cases red, so
    // nothing held the routing in the other direction: a build that answered
    // every WS-3 refusal with one of the situation rows would be telling the
    // reader something untrue about what was refused.
    // ⭐ THE SAME COMMAND AS THE `RS-55` CASE ABOVE, refused on a different rule
    // (`IV-2`, a foreign key pointing at nothing) -- so what separates the two
    // cases is the rule alone, which is what the routing reads.
    const document = templateDocument()
    const task = firstTask(document)
    const absent = Math.max(...document.schedule.tasks.map((one) => one.uid)) + 1000
    const one = loopWith(document)

    one.settle({
      row: 'PR-15',
      key: { holder: 'task', uid: task.uid, column: 'wbsParentUid' },
      text: String(absent),
    })

    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf(RS_10).ja)
    expect(told[0]?.text).not.toBe(wordsOf(RS_55).ja)
    expect(told[0]?.manner).toBe(mannerOf(RS_10))
  })
})
