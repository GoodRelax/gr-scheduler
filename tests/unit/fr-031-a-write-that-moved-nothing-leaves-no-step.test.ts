// Unit tests for the ruling of 2026-09-08 written into `FR-031`: a write that
// changed no value of the document leaves no undo step.
//
// Units driven:
//   UF-8   `apply-document-change.ts` (CP-8 of table T-062, PI-8 of table
//          T-064) -- WS-6 and WS-7 of table T-067, and the ONE write path
//          (MS-1 of table T-042).
//   UF-9   `document-change-plan.ts` -- WS-1 to WS-5, and WS-4 is the line
//          under test. ⛔ NOT OPENED AT ALL by this file, so the decision these
//          cases press is a black box here.
//   UF-20  `undo-edit.ts` -- how far back one 段 goes.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WAS READ OF `src/` (docs/development-rules/04-verification.md §1 --
//    the one who wrote a unit does not write its test)
// ---------------------------------------------------------------------------
// The opening declaration of each file, and these exported declarations only:
//   apply-document-change.ts -- its head comment; `DocumentHolder`,
//     `ChangeAudience`, `ApplyOutcome`; the re-exported names `DocumentCommand`,
//     `SettingsLimits`, `ChangeStep`, `HeldDocument`, `PlanInput`; and the
//     signature `applyDocumentChange(input, holder, audience): ApplyOutcome`.
//   document.ts -- its head comment, `Document` and its five root keys.
//   document-settings.ts -- the two field declarations `rowTitlePanelWidth`
//     and `propertyPanelWidth` of the exported settings interface.
// ⚠️ TWO HONEST EXCEPTIONS, both in `apply-document-change.ts` and neither of
// them the member under test: while locating the signature above, the body of
// the file-private `replaceThenTell` and the first three lines of
// `applyDocumentChange` were on screen. Nothing below is expected because of
// what either does -- WS-4, which decides whether a 段 is pushed, lives in
// `document-change-plan.ts` and that file was never opened.
// ⛔ `undo-edit.ts`, `edit-history.ts` and `document-codec.ts` were not opened
// either; the names imported from them were taken from the import list of
// tests/unit/uf-8-9-history-depth.test.ts, which is a test and not a unit.
//
// ---------------------------------------------------------------------------
// ⭐ WHY THIS FILE EXISTS, AND WHAT ITS NEIGHBOUR DOES NOT HOLD
// ---------------------------------------------------------------------------
// tests/unit/uf-8-9-history-depth.test.ts drives the same road for `S-94` and
// `S-95`, but every write it makes moves a value, so a build that pushed a 段
// for EVERY accepted write would pass all of it. The rule added on 2026-09-08
// is exactly about the writes that move nothing, and nothing under tests/ ran
// one through this path and then counted.
//
// ---------------------------------------------------------------------------
// THE ROWS AND REQUIREMENTS THESE CASES ANSWER TO
// ---------------------------------------------------------------------------
//   FR-031      the three clauses of section 1, and the harm they name -- an
//               undo that swings at nothing, and 段 with no document to go
//               back to eating `S-94` and `S-95`.
//   表 T-027    which KIND of operation may push a 段 at all. `UN-3` (a `Task`
//               property of table T-016; `PR-1` is `name`) is the 対象 row
//               these cases write with; `UN-16` -- the panel widths of
//               `FR-052` -- is the 対象外 row they walk.
//   表 T-028    `IN-6`, which the requirement names as the same rule stated
//               earlier for one entrance. ⭐ Its own reason is the one FR-031
//               now widens: writing the value already held would leave two 段
//               for one edit. That entrance is a screen surface and is held by
//               tests/unit/d-152-in-6-the-same-value-writes-nothing.test.ts;
//               this file holds the write path underneath every entrance.
//   表 T-067    `WS-4` -- the 段 is pushed by the write path and nowhere else.
//   表 T-108    `CM-9` (the 対象 command) and `CM-67` (the 対象外 one).
//   表 T-206    `S-94` (段数) and `S-95` (合計メモリ) -- the two budgets the
//               requirement says an empty 段 eats.
//   表 T-034    `BT-4`, the bundled template FR-027 keeps exactly one of.
//
// ---------------------------------------------------------------------------
// ⭐ EVERY CLAUSE CONSTANT IN SECTION 1 WAS CUT OUT OF THE MANUSCRIPT BY
// SCRIPT, never retyped, and each is asserted at read time to still be present
// in the file it came from. The lengths differ because check 39 falls back
// through 120 / 90 / 60 / 40 / 28 characters, and the first clause's longer
// windows reach back across the blank line above its paragraph, which no
// single-quoted literal can carry.
//
// ---------------------------------------------------------------------------
// ⛔ THE TRAP THIS FILE'S NEIGHBOUR PAID FOR, AND HOW IT IS AVOIDED HERE
// ---------------------------------------------------------------------------
// uf-8-9-history-depth.test.ts had a write helper whose name counter restarted
// at 1 on every call, so its second call wrote the name the document already
// held -- under the new rule that write correctly adds nothing, and the case
// went red for a reason that had nothing to do with what it was testing. So
// this file has NO counter: every write names its own value at the call site,
// and every write meant to be real is followed by an assertion that the saved
// form of the document actually changed. Every write meant to be a no-op is
// followed by an assertion that it did not.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  NOT_STORED_LIMITS,
  emptyHistory,
  stepCount,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
import {
  applyDocumentChange,
  type ApplyOutcome,
  type ChangeAudience,
  type ChangeStep,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type SettingsLimits,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { bare, specTable } from '../contract/spec-table'

// ===========================================================================
// 1. The three clauses, verbatim, and the manuscript they were cut from
// ===========================================================================

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/**
 * The ruling itself. ⚠️ Held at 40 characters: every longer window reaches
 * back over the blank line that ends table T-027.
 */
const NO_VALUE_MOVED_NO_STEP =
  'が文書の値を 1 つも変えなかったときは、取り消しの段を残さないこと（MUST）'

/**
 * The second clause, held at 120: the classification of table T-027 stands,
 * and this rule stands on top of it.
 */
const THE_RULE_SITS_ON_TOP_OF_THE_TABLE =
  'しの段を残さないこと（MUST）**（利用者の裁定 2026-09-08）—— **段とは戻す先の文書であり、動いていない文書に戻す先は無い。**⭐ **本表の 対象／対象外 は命令の種類で決まる分類であり、本規則はその上に載る（MUST）'

/**
 * The third clause, held at 120: the MUST NOT against re-deciding the table's
 * own rows by whether a value moved.
 */
const THE_ROWS_ARE_NOT_REWRITTEN_BY_MOVEMENT =
  '対象外 は命令の種類で決まる分類であり、本規則はその上に載る（MUST）** —— **種類が「段を積みうるか」を決め、値が動いたかが「実際に積むか」を決める。**⛔ **本表の行を、動いたかどうかで書き換えてはならない（MUST NOT）'

const CLAUSES: ReadonlyArray<readonly [string, string]> = [
  ['a write that moved no value leaves no 段', NO_VALUE_MOVED_NO_STEP],
  ['the rule sits on top of table T-027', THE_RULE_SITS_ON_TOP_OF_THE_TABLE],
  ['the rows are not rewritten by movement', THE_ROWS_ARE_NOT_REWRITTEN_BY_MOVEMENT],
]

describe("the clauses this file holds are still the manuscript's own words", () => {
  it.each(CLAUSES)('%s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// ===========================================================================
// 2. The bench -- one running write path, and the two kinds of command
// ===========================================================================

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** `S-94` of table T-206 -- the 段数 budget the requirement names as harmed. */
const S_94 = Number.parseInt(
  bare(rowOf('T-206', 'S-94').by['既定'] ?? '').replace(/[^\d]/g, ''),
  10,
)

/** `S-95`'s own remark settles the factor, so it is read and not assumed. */
const MB_FACTOR = (() => {
  const said = /1\s*MB\s*=\s*(\d+)\s*×\s*(\d+)\s*バイト/.exec(
    rowOf('T-206', 'S-95').by['保存しない理由'] ?? '',
  )
  if (said === null) {
    throw new Error('table T-206 row S-95: its remark no longer states what one MB is')
  }
  return Number.parseInt(said[1] ?? '', 10) * Number.parseInt(said[2] ?? '', 10)
})()

/**
 * `CM-9` of table T-108 -- the 対象 command, reached by `UN-3` through `PR-1`
 * (`name`) of table T-016. The kind is read from the manuscript rather than
 * typed, so a renamed row reaches this file.
 */
const CM_9 = bare(rowOf('T-108', 'CM-9').by['確定名'] ?? '')

/**
 * `CM-67` of table T-108 -- the 対象外 command, the one table T-027's `UN-16`
 * still names through `FR-052`.
 */
const CM_67 = bare(rowOf('T-108', 'CM-67').by['確定名'] ?? '')

// ---------------------------------------------------------------------------
// The document: `BT-4` of table T-034, the one template FR-027 keeps.
// ---------------------------------------------------------------------------

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

function templateDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) {
    throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const START = templateDocument()
const STARTED_JSON = JSON.stringify(START)
/** One 段's saved form, in bytes -- FR-031's own measure. */
const STEP_BYTES = Buffer.byteLength(STARTED_JSON, 'utf8')

const FIRST_TASK_UID = START.schedule.tasks[0]?.uid ?? 0
/** The name the bundled document already holds for that `Task`. */
const FIRST_TASK_NAME = START.schedule.tasks[0]?.name ?? ''

/** The panel widths the bundled document already holds, for `CM-67`. */
const HELD_ROW_TITLE_WIDTH = START.documentSettings.rowTitlePanelWidth
const HELD_PROPERTY_WIDTH = START.documentSettings.propertyPanelWidth

/** LY-5 of table T-060 keeps these outside the three inner layers. */
const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: 0.02,
  zoomMax: 64,
  rowAreaWidthWithoutPanels: 982,
}

/** `S-94` and `S-95` as the caller has to state them: steps, and BYTES. */
const REAL_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * MB_FACTOR,
}

interface Bench {
  held: HeldDocument
  /** One trip through CP-8, the one write path. Refusals throw. */
  write(command: DocumentCommand): ApplyOutcome
  /** How many 段 the history holds right now. */
  depth(): number
  /** The document's saved form, for a byte-identical comparison. */
  json(): string
  /** How many writes this bench has accepted, so a case cannot pass on silence. */
  accepted(): number
}

function bench(limits: HistoryLimits = REAL_LIMITS): Bench {
  let held: HeldDocument = { document: START, history: emptyHistory<ChangeStep>() }
  let writes = 0
  let taken = 0

  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      held = next
    },
  }
  // WS-7 runs after the swap. Nothing here watches, so the audience only has
  // to exist.
  const audience: ChangeAudience = { deliver: () => {} }

  return {
    get held() {
      return held
    },
    write: (command) => {
      writes += 1
      const outcome = applyDocumentChange(
        {
          readStamp: held.document.documentStamp,
          commands: [command],
          moment: { gestureInFlight: false, editingInPlace: false, deliveringNotices: false },
          historyLimits: limits,
          settingsLimits: SETTINGS_LIMITS,
          editedBy: 'the case at the keyboard',
          // FR-063: 「刻はいずれも `ISO 8601`・UTC・秒まで」. One second per write,
          // so no two writes of a case share an instant.
          updatedUtc: new Date(Date.UTC(2026, 8, 8, 0, 0, 0) + writes * 1000)
            .toISOString()
            .replace(/\.\d{3}Z$/, 'Z'),
        },
        holder,
        audience,
      )
      if (!outcome.accepted) {
        throw new Error(`write ${writes} was refused: ${JSON.stringify(outcome.refusal)}`)
      }
      taken += 1
      return outcome
    },
    depth: () => stepCount(held.history),
    json: () => JSON.stringify(held.document),
    accepted: () => taken,
  }
}

/**
 * The 対象 command (`UN-3` / `CM-9`), naming its value at the call site.
 *
 * ⛔ THERE IS NO COUNTER HERE ON PURPOSE. Every caller below that means a REAL
 * write passes a name the document does not already hold, and asserts the
 * change; every caller that means a no-op passes the name it just wrote.
 */
const nameTask = (name: string): DocumentCommand =>
  ({ kind: CM_9, uid: FIRST_TASK_UID, name }) as unknown as DocumentCommand

/** The 対象外 command (`UN-16` / `CM-67`, `FR-052`). */
const setPanelWidths = (rowTitle: number, property: number): DocumentCommand =>
  ({
    kind: CM_67,
    rowTitlePanelWidth: rowTitle,
    propertyPanelWidth: property,
  }) as unknown as DocumentCommand

// ===========================================================================
// 3. The control, and the ruling itself
// ===========================================================================

describe('FR-031 -- 書き込みが文書の値を 1 つも変えなかったとき', () => {
  it('THE CONTROL: a 対象 write that MOVES a value leaves exactly one 段', () => {
    // ⭐ THE CONTROL FOR EVERY CASE BELOW. A build that pushed NO 段 at all
    // would satisfy each "leaves none" case in this file for entirely the
    // wrong reason; this is the case that goes red on it. It is also the case
    // that goes red if `CM-9` has been renamed in table T-108, because the
    // write would be refused and `bench.write` throws with the refusal.
    const one = bench()
    const before = one.json()

    one.write(nameTask('a name the bundled document does not hold'))

    expect(one.json(), 'the write really did move a value').not.toBe(before)
    expect(one.depth()).toBe(1)
  })

  it('the SAME write repeated writes the value already held, and leaves no 段', () => {
    // ⭐ CONTROL: the depth is asserted BEFORE the second write as well as
    // after, so a build that pushed nothing for either write fails the first
    // assertion. And the document is asserted UNCHANGED by the second write --
    // without that, a second write that silently wrote something else would
    // pass "no new 段" for a reason that is not this ruling.
    const one = bench()
    const value = 'the one and only value this case writes'

    one.write(nameTask(value))
    const afterTheRealEdit = one.json()
    expect(afterTheRealEdit, 'the first write moved a value').not.toBe(STARTED_JSON)
    expect(one.depth(), 'the first write pushed its 段').toBe(1)

    one.write(nameTask(value))

    expect(one.json(), 'the second write moved nothing').toBe(afterTheRealEdit)
    expect(one.depth(), 'and so left no 段').toBe(1)
    expect(one.accepted(), 'both writes were accepted, not refused').toBe(2)
  })

  it('the depth does not grow across several such writes', () => {
    // ⭐ CONTROL: `accepted()` is asserted to be 8. A build that REFUSED the
    // seven repeats would also leave the depth at 1, and that build breaks
    // FR-031's neighbour clause -- the write is accepted, it simply has
    // nothing to record. This case tells the two apart.
    const one = bench()
    const value = 'written once, then written again seven times'

    one.write(nameTask(value))
    const afterTheRealEdit = one.json()
    expect(one.depth()).toBe(1)

    for (let i = 1; i <= 7; i += 1) {
      one.write(nameTask(value))
      expect(one.json(), `repeat ${i} moved nothing`).toBe(afterTheRealEdit)
      expect(one.depth(), `repeat ${i} left no 段`).toBe(1)
    }
    expect(one.accepted(), 'eight accepted writes, one 段').toBe(8)
  })
})

// ===========================================================================
// 4. 表 T-027 -- the kind decides whether a 段 is possible, the movement
//    decides whether one is pushed
// ===========================================================================

describe('FR-031 / 表 T-027 -- 種類と、値が動いたかの、四つの組み合わせ', () => {
  it('UN-16 / CM-67: a 対象外 kind pushes no 段 EVEN WHEN the value moves', () => {
    // ⭐ CONTROL, AND THE CASE THAT KEEPS THE OTHERS HONEST. The panel widths
    // really do move here -- asserted -- so the absent 段 cannot be the new
    // ruling's doing. It is the KIND. Without this case a build that had
    // simply deleted the 対象外 branch of WS-4 and kept only the value
    // comparison would pass everything else in this file.
    // ⭐ It is also what holds the third clause upright: the row is still
    // 対象外 although the value moved, so movement did not rewrite it.
    const one = bench()
    const before = one.json()

    one.write(setPanelWidths(HELD_ROW_TITLE_WIDTH + 30, HELD_PROPERTY_WIDTH + 30))

    expect(one.json(), 'the 対象外 command really did move a value').not.toBe(before)
    expect(one.held.document.documentSettings.rowTitlePanelWidth).toBe(
      HELD_ROW_TITLE_WIDTH + 30,
    )
    expect(one.depth()).toBe(0)
  })

  it('UN-16 / CM-67: a 対象外 kind that moves nothing pushes no 段 either', () => {
    // ⭐ CONTROL: the document is asserted unchanged, so this is genuinely the
    // fourth corner of the table and not a disguised repeat of the case above.
    const one = bench()
    const before = one.json()

    one.write(setPanelWidths(HELD_ROW_TITLE_WIDTH, HELD_PROPERTY_WIDTH))

    expect(one.json(), 'the write moved nothing').toBe(before)
    expect(one.depth()).toBe(0)
  })

  it('UN-3 / CM-9: a 対象 kind that moves nothing pushes no 段, and the row stays 対象', () => {
    // ⭐ CONTROL, and the whole of the second clause in one case: after the
    // no-op the SAME kind is written again with a value that does move, and it
    // pushes its 段. So the kind was never demoted -- 「種類が「段を積みうるか」
    // を決め、値が動いたかが「実際に積むか」を決める」. A build that had
    // rewritten `UN-3` into 対象外 the moment one of its writes moved nothing
    // would fail the second half.
    const one = bench()

    one.write(nameTask(FIRST_TASK_NAME))
    expect(one.json(), 'writing the held name moved nothing').toBe(STARTED_JSON)
    expect(one.depth(), 'so it left no 段').toBe(0)

    one.write(nameTask('and now a name that is genuinely different'))
    expect(one.json()).not.toBe(STARTED_JSON)
    expect(one.depth(), 'the same kind still earns its 段 when it moves a value').toBe(1)
  })
})

// ===========================================================================
// 5. ⭐ THE COMPLAINT THE RULING ANSWERS
// ===========================================================================

describe('FR-031 -- 取り消しが空振りしないこと', () => {
  it('after a real edit and then a no-op write, ONE undo returns to before the real edit', () => {
    // ⭐ THIS IS THE WHOLE POINT. On the build the ruling was given against,
    // the no-op write pushed a 段 whose document was the one already on
    // screen, so the first undo swung at nothing and the person had to press
    // twice. The control is the second assertion: `not.toBe(afterTheRealEdit)`
    // goes red on exactly that build, and `toBe(STARTED_JSON)` goes red on a
    // build that undid too far.
    const one = bench()
    const value = 'the edit the person actually made'

    one.write(nameTask(value))
    const afterTheRealEdit = one.json()
    expect(afterTheRealEdit).not.toBe(STARTED_JSON)

    one.write(nameTask(value))
    expect(one.json(), 'the second write moved nothing').toBe(afterTheRealEdit)

    const back = undoEdit(one.held)

    expect(back.undone, 'one undo was available').toBe(true)
    expect(JSON.stringify(back.next.document), 'the one undo did not swing at nothing').not.toBe(
      afterTheRealEdit,
    )
    expect(JSON.stringify(back.next.document)).toBe(STARTED_JSON)
  })
})

// ===========================================================================
// 6. The two budgets FR-031 names the harm in: `S-94` and `S-95`
// ===========================================================================

describe('FR-031 -- 戻す先を持たない段が S-94 / S-95 を食わないこと', () => {
  it('S-94: no-op writes do not push the oldest real 段 off the end', () => {
    // ⭐ CONTROL, and it is the eviction that provides it. Exactly `S-94` real
    // writes fill the budget to the brim; ten no-op writes then follow. On a
    // build that pushes a 段 for every accepted write, ten oldest 段 are
    // dropped and the walk back cannot reach the template again -- the last
    // assertion goes red. On a build that pushed nothing at all, the FIRST
    // assertion (depth === S-94) goes red.
    const one = bench()
    for (let i = 1; i <= S_94; i += 1) one.write(nameTask(`real edit number ${i}`))
    expect(one.depth(), 'S-94 real writes fill the 段数 budget').toBe(S_94)

    const afterTheRealEdits = one.json()
    for (let i = 1; i <= 10; i += 1) one.write(nameTask(`real edit number ${S_94}`))
    expect(one.json(), 'not one of the ten moved a value').toBe(afterTheRealEdits)
    expect(one.depth(), 'and not one of them took a 段').toBe(S_94)

    let held = one.held
    for (let i = 1; i <= S_94; i += 1) {
      const back = undoEdit(held)
      expect(back.undone, `undo ${i} of ${S_94}`).toBe(true)
      held = back.next
    }
    expect(
      JSON.stringify(held.document),
      'S-94 undos still reach the document the writes started from',
    ).toBe(STARTED_JSON)
  })

  it('S-95: no-op writes do not push the oldest real 段 out of the memory budget', () => {
    // ⭐ The bound that binds here is the BYTE one, not `S-94`: two documents'
    // worth of saved form, against a template whose saved form is ~875 KiB.
    // ⚠️ The exact number of 段 a byte bound admits is NOT asserted -- FR-031
    // fixes the measure but leaves the serial form of a 段 to whoever records
    // one, so the case reads the settled depth and asserts it does not move.
    // ⭐ CONTROL: with a budget this narrow, a build that pushed a 段 per
    // accepted write would evict BOTH real 段 within a couple of no-ops, and
    // the walk back could not reach the template.
    const one = bench({ maxSteps: S_94, maxTotalSizeBytes: STEP_BYTES * 3 })

    one.write(nameTask('the first real edit under a narrow memory budget'))
    one.write(nameTask('the second real edit under a narrow memory budget'))
    const settled = one.depth()
    expect(settled, 'both real 段 fit inside three documents of budget').toBe(2)

    const afterTheRealEdits = one.json()
    for (let i = 1; i <= 10; i += 1) {
      one.write(nameTask('the second real edit under a narrow memory budget'))
    }
    expect(one.json(), 'not one of the ten moved a value').toBe(afterTheRealEdits)
    expect(one.depth(), 'and the memory budget lost nothing to them').toBe(settled)

    let held = one.held
    for (let i = 1; i <= settled; i += 1) {
      const back = undoEdit(held)
      expect(back.undone, `undo ${i} of ${settled}`).toBe(true)
      held = back.next
    }
    expect(JSON.stringify(held.document)).toBe(STARTED_JSON)
  })
})
