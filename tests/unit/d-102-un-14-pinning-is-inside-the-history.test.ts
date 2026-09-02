// Unit tests for the 対象 half of pinning -- 表 T-027's `UN-14` -- driven
// through the one write path: UF-8 `apply-document-change.ts` (WS-6 / WS-7) and
// UF-9 `document-change-plan.ts` (WS-1 to WS-5, WS-4 being the line these cases
// stand on), then walked back through `replaceDocument` (PI-8) naming `RD-1` of
// 表 T-230. Components CP-8, CP-11 and CP-4 of 表 T-062.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔⛔ SIX OF THESE CASES ARE RED AGAINST TODAY'S BUILD, AND THAT IS THE POINT
// ---------------------------------------------------------------------------
//
// Measured 2026-09-03, driving the seams below and nothing else:
//   - `CM-68` writes `S-126` and leaves the history at 0 段 -- `WS-4` of 表 T-067
//     pushes none, which is what it owes a 対象外 row and not a 対象 one.
//   - an undo after `CM-68` hands the document back STILL PINNED -- the column
//     is carried across the undo, which is what `UN-16` asked for until CR-277.
// ⇒ ⛔ The build still files pinning under `UN-16`; 表 T-027 has filed it under
// `UN-14` since CR-277 (利用者の裁定 2026-08-27). Nothing in `src/` was read to
// say so: both readings above are the seams' own answers.
//
// ⛔ THE CASES ARE LEFT DISAGREEING (docs/development-rules/04-verification.md
// §1). Tuning them to what the build does would file pinning back under a row
// the manuscript no longer has it in, and would make D-102 look closed while the
// 対象 half is still unguarded -- which is the exact state that row was raised
// to record.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE LEDGER ROW IT STANDS IN FOR
// ---------------------------------------------------------------------------
//
// `docs/development-records/defects.md` D-102: 「ピン止めが『取り消しの対象』で
// あることを測る試験がどこにも無い」, whose 期待値 column reads 「`CM-68` /
// `CM-69` の書き込みが、無関係な編集の取り消しで巻き戻ることを測る」.
//
// ⭐ HOW THE HOLE WAS MADE. `UN-16` named pinning until 2026-08-28. CR-277 moved
// it to `UN-14` -- 対象, inside the history -- because a pin carried across an
// undo can name a row that undo removed, which `IV-3` of 表 T-220 forbids. The
// two cases that stood in tests/unit/t-027-outside-the-history.test.ts were then
// measuring a retired rule and were dropped; that file records the debt at its
// line 560 (「⚠️ THE 対象 HALF IS OWED A HOME, NOT COVERED SOMEWHERE ELSE
// (D-102)」) and tests/unit/uf-8-9-history-depth.test.ts records the same at its
// line 510. ⛔ Neither wrote the replacement, because rule 05 section 7 forbids
// the session that moved a row from writing the test of the value it moved.
// This file is that replacement, written from docs/spec alone.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES ANSWER TO (rule 03 §3: name the row, do not copy it)
// ---------------------------------------------------------------------------
//
//   FR-031    the requirement -- 「取り消しの対象は表 T-027 に従うこと」
//   表 T-027  `UN-14` 区分 対象: 「**行（`TaskGroup`）の追加・削除・名前の変更、
//             行の色と高さの変更、畳みと非表示の変更、およびピン止め**」, with
//             the ruling that put pinning there: 「⭐ **ピン止め（`FR-098`）が
//             対象なのは、`UN-16` に置くと 2 つの MUST が正面からぶつかるから
//             である**（利用者の裁定 2026-08-27）—— **取り消しをまたいで持ち越す
//             と、行を作った編集を取り消したときに、持ち越した識別子が消えた行を
//             指す。**⛔ **`05-07-design.md` の `IV-3`（ピンした行は実在すること）
//             が破れる。**⭐ **履歴の中に入れば、その不変条件は掃除の規則を 1 つも
//             書かずに保たれる**」, and its stated cost: 「⚠️ **代償**: ピン止めと
//             ピン外しが取り消しの 1 段を積む」
//             `UN-16` 対象外, which now says in as many words 「⛔ **ピン止めは
//             本行ではない** —— `UN-14` が持つ（利用者の裁定 2026-08-27）」
//             `UN-3` 対象 -- the unrelated edit these cases undo
//   表 T-067  `WS-4` 「取り消しの履歴に 1 段積む。表 T-027 の対象外なら積まない」,
//             and 5.2's note that a 段 holds the document BEFORE the write
//   表 T-108  `CM-68` `pinTaskGroup` / `CM-69` `unpinTaskGroup`, both 見せ方の群,
//             both 由来 `FR-098`; and `CM-9` `setTaskName`, the unrelated edit
//   表 T-203  `S-126` `pinnedGroupIds`, the column the two commands move, and
//             `S-127` `pinnedRowMax`, its upper bound
//   表 T-230  `RD-1`, the row an undo is asked for through `replaceDocument`
//   表 T-034  `BT-4`, the bundled template -- the one document whose values the
//             specification has actually decided
//
// ⭐ WHERE THE NAMES COME FROM. 04-verification §2 asks that a test of a value
// the manuscript owns fail when the manuscript moves, so no command name and no
// settings key is typed here: every `kind` is read out of 表 T-108's 確定名
// column at read time, the key is read out of 表 T-203's キー column, and the
// 区分 of `UN-14` and `UN-16` is read out of 表 T-027's own 区分 column.
// ⚠️ Japanese string literals appear only where a Japanese column or cell is
// being PARSED, which rule 03 §5 names as its one exception.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WAS READ OF `src/`: NOT ONE FILE. The unit is reached through the
// declarations tests/unit/t-027-outside-the-history.test.ts already imports, and
// the bench below is that file's, mirrored -- it drives the 対象外 half of the
// same table through the same two doors. Every expectation here comes from a
// row of docs/spec.
// ---------------------------------------------------------------------------
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, because docs/spec does not decide it:
//   - THE MIRROR FOR REDO. 表 T-027's caption is 「取り消しの対象と対象外」 and
//     every rule that points at it speaks of 取り消し. `RD-2` of 表 T-230 rules
//     on the history, the stamp and the 段 -- none of them on whether a redo may
//     give a pin back. The neighbouring file reports the same hole; it is left
//     unwritten here rather than invented.
//   - `S-127`'s upper bound. `FR-098` sends the over-the-limit case to the shape
//     `FR-085` uses, and tests/unit/uf-8-9-history-depth.test.ts owns the bounds
//     of the history itself. No case here goes near either: one row is pinned.
//   - `CD-2` of 表 T-050 -- what becomes of a pin when its row is deleted. That
//     is a rule about deletion, not about the history.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { type Document } from '../../src/entity/document-model/document/document'
import {
  NOT_STORED_LIMITS,
  emptyHistory,
  stepCount,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
import {
  applyDocumentChange,
  replaceDocument,
  type ApplyOutcome,
  type ChangeAudience,
  type ChangeStep,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type ReplaceOutcome,
  type SettingsLimits,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at read time rather than copied.
// ---------------------------------------------------------------------------

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** The 確定名 表 T-108 gives one command row. Renaming the row reaches here. */
const commandKindOf = (commandRow: string): string => {
  const named = bare(rowOf('T-108', commandRow).by['確定名'] ?? '')
  if (named === '') throw new Error(`table T-108 row ${commandRow} names no command`)
  return named
}

/** The キー 表 T-203 gives one settings row. */
const settingKeyOf = (settingRow: string): string => {
  const named = bare(rowOf('T-203', settingRow).by['キー'] ?? '')
  if (named === '') throw new Error(`table T-203 row ${settingRow} names no key`)
  return named
}

/**
 * The 区分 表 T-027 files one row under.
 *
 * ⚠️ Read as Japanese because the classification IS the cell -- rule 03 §5's one
 * exception, 「分類の欄を解析するなど」.
 */
const undoClassOf = (undoRow: string): string => bare(rowOf('T-027', undoRow).by['区分'] ?? '')

const INSIDE = '対象'
const OUTSIDE = '対象外'

/** Everything 表 T-027's `UN-14` writes, as one string. */
const UN_14 = rowOf('T-027', 'UN-14').cells.join(' ')
/** Everything 表 T-027's `UN-16` writes, as one string. */
const UN_16 = rowOf('T-027', 'UN-16').cells.join(' ')

/** `S-126` -- the column `CM-68` and `CM-69` move. */
const PINNED_KEY = settingKeyOf('S-126')

// ---------------------------------------------------------------------------
// The document. `BT-4` of 表 T-034: the one template `FR-027` keeps.
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) {
    throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const START = templateDocument()

/** The first `TaskGroup` -- the row `FR-098`'s two commands are given. */
const FIRST_GROUP_ID = START.schedule.taskGroups[0]?.id ?? ''
/** The first `Task`, for `CM-9` -- the unrelated edit every case below makes. */
const FIRST_TASK_UID = START.schedule.tasks[0]?.uid ?? 0

/** What `S-126` holds in one document, as a plain array of row ids. */
const pinnedIn = (document: Document): readonly string[] =>
  ((document.documentSettings as unknown as Record<string, unknown>)[PINNED_KEY] ??
    []) as readonly string[]

/** The name of the first `Task`, which is what the unrelated edit moves. */
const firstTaskNameIn = (document: Document): string | null =>
  document.schedule.tasks[0]?.name ?? null

// ---------------------------------------------------------------------------
// One running write path, small enough to hold in a test.
// ---------------------------------------------------------------------------

/**
 * `LY-5` of 表 T-060 keeps these outside the three inner layers, so they arrive
 * as arguments. ⚠️ `rowAreaWidthWithoutPanels` is wide enough that nothing here
 * meets `FR-052`'s bound; no case in this file writes a panel width.
 */
const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  rowAreaWidthWithoutPanels: 982,
}

/**
 * `FR-031`'s measure of one 段: 「その段の文書を詰めた `GRS JSON`（字下げも改行も
 * 持たない形）へ直列化し、UTF-8 で符号化した長さ（バイト）」.
 */
const STEP_BYTES = Buffer.byteLength(JSON.stringify(START), 'utf8')

/**
 * `S-94` as the caller must state it, with a memory bound deliberately wider
 * than anything this file pushes. ⚠️ No case here is about the bounds.
 */
const ROOMY_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: STEP_BYTES * (NOT_STORED_LIMITS['S-94'] + 2),
}

const WRITER = 'the case at the keyboard'

/** `FR-063`: 「刻はいずれも `ISO 8601`・UTC・秒まで」. One second per write. */
const instantOf = (nth: number): string =>
  new Date(Date.UTC(2026, 7, 28, 0, 0, 0) + nth * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')

interface Bench {
  /** What `LY-5` says the Framework holds: the document and its history, as one. */
  held: HeldDocument
  /** One trip through CP-8, the ONE write path (`MS-1` of 表 T-042). */
  write(commands: readonly DocumentCommand[]): ApplyOutcome
  /**
   * One press of undo, through the door 表 T-230 opens for it: `RD-1`, whose
   * WS-3 column names `UndoEdit` (PI-11) and whose caller is `replaceDocument`
   * (PI-8) -- the same seam tests/unit/t-027-outside-the-history.test.ts uses
   * for the other half of this table, and for the reason that file records:
   * `undo-edit.ts` declines 表 T-027 in its own header, so the reading that
   * keeps the table has to sit on the caller's side.
   */
  undo(): ReplaceOutcome
  /** How many 段 the history holds right now. */
  depth(): number
}

function bench(): Bench {
  let held: HeldDocument = { document: START, history: emptyHistory<ChangeStep>() }
  let writes = 0

  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      held = next
    },
  }
  // WS-7 runs after the swap. Nothing here watches, so the audience only has to
  // exist.
  const audience: ChangeAudience = { deliver: () => {} }

  return {
    get held() {
      return held
    },
    write: (commands) => {
      writes += 1
      return applyDocumentChange(
        {
          readStamp: held.document.documentStamp,
          commands,
          moment: { gestureInFlight: false, editingInPlace: false, deliveringNotices: false },
          historyLimits: ROOMY_LIMITS,
          settingsLimits: SETTINGS_LIMITS,
          editedBy: WRITER,
          updatedUtc: instantOf(writes),
        },
        holder,
        audience,
      )
    },
    undo: () =>
      replaceDocument(
        {
          // WS-1 matches what the caller says it READ against the stamp the
          // document holds now (表 T-230, MUST NOT).
          readStamp: held.document.documentStamp,
          moment: { gestureInFlight: false, editingInPlace: false, deliveringNotices: false },
          // ⛔ 表 T-230 forbids a replacement that names no row (MUST NOT), and
          // `RD-1` is the undo row.
          call: { row: 'RD-1' },
        },
        holder,
        audience,
      ),
    depth: () => stepCount(held.history),
  }
}

/** One write, refused loudly rather than silently. */
function mustWrite(one: Bench, commands: readonly DocumentCommand[], why: string): void {
  const outcome = one.write(commands)
  if (!outcome.accepted) {
    throw new Error(`${why} was refused: ${JSON.stringify(outcome.refusal)}`)
  }
}

/** One press of undo through the `RD-1` seam, refused loudly rather than silently. */
function mustUndo(one: Bench, why: string): Document {
  const outcome = one.undo()
  if (!outcome.accepted) {
    throw new Error(`${why}: the undo was refused: ${JSON.stringify(outcome.refusal)}`)
  }
  return outcome.document
}

/** `CM-68` -- pin one row. */
const pin = (groupId: string): DocumentCommand =>
  ({ kind: commandKindOf('CM-68'), groupId }) as unknown as DocumentCommand

/** `CM-69` -- take the pin off again. */
const unpin = (groupId: string): DocumentCommand =>
  ({ kind: commandKindOf('CM-69'), groupId }) as unknown as DocumentCommand

/**
 * The UNRELATED edit these cases undo: `CM-9` `setTaskName`, which `UN-3` files
 * under 対象 through `PR-1` `name` of 表 T-016.
 *
 * ⭐ It writes into the 日程データの群 only, so it cannot itself move `S-126` --
 * which is what makes every assertion after the undo attributable to the history
 * and to nothing else.
 */
const rename = (name: string): DocumentCommand =>
  ({ kind: commandKindOf('CM-9'), uid: FIRST_TASK_UID, name }) as unknown as DocumentCommand

const NAME_BEFORE = firstTaskNameIn(START)
const NAME_AFTER = 'RenamedWhileARowWasPinned'

// ===========================================================================
// 1. 表 T-027 itself, before anything is driven by it.
// ===========================================================================

describe('表 T-027 -- pinning is 対象, and the neighbouring row says so too', () => {
  it('⭐ files UN-14 under 対象, which is the whole premise of this file', () => {
    expect(undoClassOf('UN-14')).toBe(INSIDE)
  })

  it('⭐ UN-14 is the row that names pinning, and names FR-098 as its authority', () => {
    // 「**行（`TaskGroup`）の追加・削除・名前の変更、行の色と高さの変更、畳みと
    //   非表示の変更、およびピン止め**」
    expect(UN_14).toContain('ピン止め')
    expect(UN_14).toContain('FR-098')
  })

  it('⛔ UN-16 is still 対象外 and still says pinning is NOT its row', () => {
    // 「⛔ **ピン止めは本行ではない** —— `UN-14` が持つ（利用者の裁定
    //   2026-08-27）」 -- the sentence CR-277 left behind, and the reason the two
    // cases that used to stand in the 対象外 file were dropped.
    expect(undoClassOf('UN-16')).toBe(OUTSIDE)
    expect(UN_16).toContain('ピン止めは本行ではない')
  })

  it('⭐ UN-14 states the cost this file measures: pinning pushes a 段', () => {
    // 「⚠️ **代償**: ピン止めとピン外しが取り消しの 1 段を積む」
    expect(UN_14).toContain('ピン止めとピン外しが取り消しの 1 段を積む')
  })

  it('⭐ table T-203 still gives S-126 the key these cases watch', () => {
    expect(PINNED_KEY).not.toBe('')
    expect(pinnedIn(START)).toEqual([])
    expect(FIRST_GROUP_ID).not.toBe('')
  })
})

// ===========================================================================
// 2. WS-4 -- a 対象 write leaves a 段
// ===========================================================================

describe('表 T-067 WS-4 -- a write UN-14 files under 対象 pushes one 段', () => {
  it('⭐ CM-68 pins the row and leaves exactly one 段', () => {
    // WS-4: 「取り消しの履歴に 1 段積む。表 T-027 の対象外なら積まない」. UN-14
    // is 対象, so the 段 IS pushed -- which is the cost UN-14 spells out.
    const one = bench()
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')

    expect(pinnedIn(one.held.document)).toEqual([FIRST_GROUP_ID])
    expect(one.depth()).toBe(1)
  })

  it('⭐ CM-69 takes the pin off and leaves a second 段', () => {
    const one = bench()
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')
    mustWrite(one, [unpin(FIRST_GROUP_ID)], 'CM-69')

    expect(pinnedIn(one.held.document)).toEqual([])
    expect(one.depth()).toBe(2)
  })
})

// ===========================================================================
// 3. UN-14 対象 -- an undo rewinds the pin
// ===========================================================================

describe('FR-031 / 表 T-027 UN-14 -- an undo takes a pin back', () => {
  it('⭐ one undo after CM-68 leaves the row unpinned again', () => {
    const one = bench()
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')
    expect(pinnedIn(one.held.document)).toEqual([FIRST_GROUP_ID])

    const after = mustUndo(one, 'the undo of CM-68')

    expect(after.documentSettings).toBeDefined()
    expect(pinnedIn(after)).toEqual([])
    expect(pinnedIn(one.held.document)).toEqual([])
  })

  it('⭐ one undo after CM-69 puts the pin back', () => {
    const one = bench()
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')
    mustWrite(one, [unpin(FIRST_GROUP_ID)], 'CM-69')
    expect(pinnedIn(one.held.document)).toEqual([])

    const after = mustUndo(one, 'the undo of CM-69')

    expect(pinnedIn(after)).toEqual([FIRST_GROUP_ID])
  })

  // ⭐⭐ THE CASE D-102 ASKS FOR, AND THE ONE THAT TELLS 対象 FROM 対象外 APART.
  // For a 対象外 column the writing of it leaves no 段 at all, so an undo of the
  // edit AFTER it hands back a document that never held the value -- which is
  // why tests/unit/t-027-outside-the-history.test.ts asserts the value SURVIVES.
  // For a 対象 column the opposite has to hold: the pin's own 段 carries the
  // document as it stood BEFORE the pin (5.2 of 表 T-067), so walking back over
  // it must take the pin away. An implementation that carried `S-126` forward
  // across an undo -- which is what UN-16 asked for until CR-277 -- passes every
  // case above and fails this one.
  it('⛔ an unrelated edit made BEFORE the pin is not what the undo takes back', () => {
    const one = bench()
    mustWrite(one, [rename(NAME_AFTER)], 'CM-9')
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')
    expect(one.depth()).toBe(2)

    const after = mustUndo(one, 'the undo of CM-68 over an earlier CM-9')

    // The pin is gone, because UN-14 is 対象 …
    expect(pinnedIn(after)).toEqual([])
    // … and the edit under it is untouched, because only ONE 段 was walked.
    expect(firstTaskNameIn(after)).toBe(NAME_AFTER)
    expect(one.depth()).toBe(1)
  })

  it('⛔ the pin outlives the undo of a LATER edit, and the next undo takes it back', () => {
    // ⭐ THE OTHER SIDE OF THE SAME MECHANISM. The 段 `CM-9` pushed carries the
    // document as it stood before that rename, and that document was already
    // pinned -- so the first undo hands the pin back rather than dropping it.
    // ⛔ A pin that vanished here would be a pin kept OUTSIDE the history, which
    // is the reading CR-277 retired.
    const one = bench()
    mustWrite(one, [pin(FIRST_GROUP_ID)], 'CM-68')
    mustWrite(one, [rename(NAME_AFTER)], 'CM-9')
    expect(one.depth()).toBe(2)

    const afterFirst = mustUndo(one, 'the undo of the unrelated CM-9')
    expect(firstTaskNameIn(afterFirst)).toBe(NAME_BEFORE)
    expect(pinnedIn(afterFirst)).toEqual([FIRST_GROUP_ID])

    const afterSecond = mustUndo(one, 'the undo of CM-68 itself')
    expect(pinnedIn(afterSecond)).toEqual([])
    expect(firstTaskNameIn(afterSecond)).toBe(NAME_BEFORE)
  })
})
