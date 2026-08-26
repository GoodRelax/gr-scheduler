// Unit tests for the 対象外 half of table T-027 -- what the undo history does
// NOT hold -- driven through the one write path: UF-8 `apply-document-change.ts`
// (WS-6 / WS-7) and UF-9 `document-change-plan.ts` (WS-1 to WS-5, WS-4 being
// the line these cases stand on), then walked back through UF-20 `undo-edit.ts`
// over UF-4 `edit-history.ts`. Components CP-8, CP-11 and CP-4 of table T-062.
//
// ⭐ WHICH DOOR AN UNDO IS PRESSED ON, AND WHY IT IS NOT `undoEdit`. The undo
// half of section 3 goes through `replaceDocument` (PI-8) naming row RD-1 of
// table T-230, not through `undoEdit` (PI-11) called by hand. The requirement
// asserted does not move -- FR-031 and the rows of table T-027 are the same
// ones -- but the unit that keeps the 対象外 columns is not UF-20. Both units
// that walk the history decline that table IN THEIR OWN HEADERS:
// `src/use-case/undo-edit/undo-edit.ts` 「this unit reads table T-027 nowhere」
// and `src/use-case/redo-edit/redo-edit.ts` 「this unit never reads table T-027
// itself」. Their one caller is `planDocumentReplacement` in
// `src/use-case/apply-document-change/document-change-plan.ts`, which claims
// the ground 「THIS FILE IS THE ONE PLACE TABLE T-027 IS READ」 and reads it
// twice -- `isUndoable` for the writes that leave no 段, `columnsOutsideHistory`
// for the columns those writes own. ⭐ One reading there closes RD-1 and RD-2
// together; a reading in UF-20 would need a second copy in UF-21, and that
// duplication is what R2.7 of docs/development-rules/07-review-standards.md
// refuses (DRY, SHOULD).
// ⚠️ THE ROW NUMBER THIS FILE WAS HANDED FOR THAT ARGUMENT WAS R3.4, AND IT IS
// THE WRONG ONE -- R3.4 rules on half-open intervals and off-by-one, nothing
// else. The argument is R2.7's. Reported rather than copied on.
// ⚠️ THE DOOR IS THE PUBLIC ONE for a second and stronger reason: R2.19 (MUST)
// lets a caller reach only the face Chapter 5.3 declares, and
// `document-change-plan.ts` is not that face. So the cases ask
// `replaceDocument` (PI-8), which is what calls `planDocumentReplacement`.
// ⚠️ Sections 2, 4 and the first half of section 3 still press `undoEdit`
// directly, because they were green before this move and a green case is not
// re-pointed on a whim.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WHAT WAS READ OF `src/`, HONESTLY (docs/development-rules/
// 04-verification.md §1 -- the one who wrote a unit does not write its test).
// Read: the head comments and published declarations of
// `apply-document-change.ts` (`DocumentHolder`, `ChangeAudience`,
// `ApplyOutcome`, both signatures), `undo-edit.ts` (`ChangeStep`,
// `HeldDocument`, `UndoOutcome`, `undoEdit`), `edit-history.ts`'s exported
// names, `document.ts`'s `Document` and `ROOT_KEYS`,
// `document-settings.ts`'s `DocumentSettings` keys, and the published command
// unions in `edit-document-settings.ts` / `edit-task-group.ts` / `edit-task.ts`.
// ⛔ THREE EXCEPTIONS THAT MUST BE DECLARED, because they are more than a
// signature. The first two are from the blind round; the third is from the
// round that re-pointed the undo at its seam:
//   1. `apply-document-change.ts` was printed from its exports down, so the
//      bodies of `applyDocumentChange` and `replaceDocument` were seen.
//   2. `document-change-plan.ts` was printed to line 149, which includes the
//      head of the private predicate that decides whether a command earns a
//      段. ⛔ THAT IS THIS FILE'S SUBJECT, so nothing below is expected because
//      of what it lists. Every command in the tables below is resolved from
//      表 T-027, 表 T-202 and 表 T-108 AT READ TIME, and the one place the two
//      readings differ is written up under `WHAT IS DELIBERATELY NOT ASSERTED`
//      -- reported as a hole in the manuscript, not settled from the code.
//   3. ⛔ A THIRD, ADDED WHEN THE UNDO WAS RE-POINTED AT ITS SEAM. To find the
//      door, `document-change-plan.ts` was read whole -- `columnsOutsideHistory`
//      included -- along with `undo-edit.ts`, `apply-document-change.ts`, the
//      T-027 paragraph of `redo-edit.ts`, and `VisibleElement` in
//      `edit-document-settings.ts`. That file NAMES the columns it keeps and
//      the two it does not, so a reader could mistake the reds below for
//      matched expectations. ⛔ THEY ARE NOT: `watermarkVisible` is 対象外
//      because 表 T-202 types S-144 真偽 and FR-049 makes every 真偽 row a
//      toggle, which UN-7 excludes; `pinnedGroupIds` is 対象外 because UN-16
//      names ピン止め（`FR-098`）in as many words. Both were resolved from the
//      manuscript, and both are LEFT RED rather than tuned to what the code
//      does. ⚠️ No value below was changed by this reading.
//
// ⭐ WHY THIS FILE EXISTS -- the hole the neighbours leave.
//   - tests/unit/uf-8-9-history-depth.test.ts walks UN-16's four commands and
//     asserts each leaves NO 段, and that an out-of-scope write cannot bury the
//     段 before it. It never asks what the VALUE is after an undo.
//   - tests/unit/use-case.test.ts asserts WS-4 pushes no 段 for one command of
//     UN-7, one of UN-8 and one of UN-16, and owns the fit-press pair
//     (CM-71 then CM-72) all the way through one undo.
//   - Nothing anywhere sets an out-of-scope value, makes an UNRELATED edit
//     after it, undoes that edit, and asks whether the value the reader last
//     set is still there. ⛔ It is not: WS-4 pushes the document as it stood
//     BEFORE the write, so a 段 pushed before the out-of-scope write carries
//     the OLD value and the undo hands it back.
//
// ⭐ THE RULE THAT MAKES THAT A DEFECT AND NOT A TASTE. FR-031 spells the
// mechanism out for UN-8 in its own prose, while settling the order of the two
// writes one fit press makes:
//   「⚠️ 1 つにまとめて書くと、段が古い倍率ごと持つので、取り消しが `UN-8` を
//     破る。」
// A 段 that carries the old value, handed back by an undo, BREAKS the row.
// That sentence is about UN-8 and the fit, but the mechanism it names is the
// history's, not the fit's, so it reaches every 対象外 row. UN-16 states the
// same thing as a principle:
//   「⚠️ 保存することと戻せることは別である —— `UN-12` が `Dual Cursor` の位置
//     で同じ形を既に採っている。いずれも読む人の都合であって、日程の内容では
//     ない」
// -- the value IS saved in the document, and it is still not something an undo
// may give back.
//
// The rows these cases answer to (rule 03 §3: name the row, do not copy it):
//   FR-031    the requirement; 「取り消しの対象は表 T-027 に従うこと」, the
//             two-write order of one fit press, and the sentence quoted above
//   表 T-027  UN-7 / UN-8 / UN-9 / UN-10 / UN-11 / UN-12 / UN-16 are 対象外;
//             UN-13 is 対象 and deliberately keeps the multi-valued
//             presentation columns INSIDE the history; UN-3 is the 対象 row
//             the unrelated edit uses. The rule printed after the table --
//             「対象外の操作で文書が戻ってはならない（MUST NOT）」
//   表 T-067  WS-4 「取り消しの履歴に 1 段積む。表 T-027 の対象外なら積まない」,
//             and 5.2's note that a 段 holds the document BEFORE the write
//   表 T-108  the command roster; which CM- row each T-027 row reaches
//   表 T-202  which display rows are 真偽 (UN-7) and which are 多値 (UN-13)
//   FR-049    「対象は型が真偽である行だけとすること（MUST）」 -- the boundary
//             between UN-7 and UN-13, resolved from the 型 column and not here
//   表 T-203  S-75 / S-76 / S-77 / S-78 / S-79 / S-80 / S-126, the keys the
//             UN-8 and UN-16 commands write
//   表 T-034  BT-4, the bundled template -- the one document whose values the
//             specification has actually decided
//
// ⭐ WHERE THE NAMES COME FROM. 04-verification §2 asks that a test of a value
// the manuscript owns fail when the manuscript moves, so no command name and no
// row split is typed here: every `kind` is read out of 表 T-108's 確定名 column
// at read time, every UN-7 case is generated from 表 T-202's 真偽 rows, and the
// completeness case reads 表 T-027's 区分 column. ⚠️ Japanese string literals
// appear only where a Japanese column or cell is being PARSED, which rule 03 §5
// names as its one exception, and in the two rulings quoted above.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, because docs/spec does not decide it:
//   - THE MIRROR FOR REDO. Table T-027's caption is 「取り消しの対象と対象外」
//     and every rule that points at it -- FR-031, WS-4 of 表 T-067, AG-10 of
//     表 T-035 -- speaks of 取り消し. RD-2 of 表 T-230 says a redo 「積まない」
//     and leaves the stamp as it came, which is about the 段 a redo pushes, not
//     about what a redo may rewind. ⛔ Nothing in the manuscript says whether a
//     redo of an unrelated edit may give back an out-of-scope value. Inventing
//     the mirror here would put the rule in a test file instead of in the
//     specification, so it is reported as a hole and left unwritten.
//     ⚠️ The seam now used for the undo makes the mirror ONE ARGUMENT away --
//     `call: { row: 'RD-2' }` on the same `replaceDocument` -- so the hole is
//     purely a hole in the manuscript, not in what can be driven. ⛔ It is
//     still not written: no row says what a redo owes table T-027, and RD-2's
//     three columns (「問う先が答えたものを据える／入ってきたまま／積まない」)
//     rule on the history, the stamp and the 段, none of them on the columns.
//   - CM-61 `clearDualCursor`. UN-12 reads 「`Dual Cursor` の位置の変更」 and
//     DC-6 of 表 T-029 repeats 「位置の変更は取り消しの対象としない」. ⛔ Both
//     say 位置の変更; neither says whether CLEARING the pair is one. CM-60 is
//     asserted, CM-61 is not.
//   - UN-6's ⚠️ note that 置き換え (OP-3) is 対象外. That is a row of 表 T-230
//     on the `replaceDocument` road, and tests/unit/uf-8-9-replace-document.test.ts
//     is where that road is driven.
//   - the history bounds. S-94 and S-95 are uf-8-9-history-depth's subject; the
//     bench below keeps them far enough away that no case here meets them.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { ROOT_KEYS, type Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
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
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
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

/**
 * The rows 表 T-027 files under 対象外, in the order the table prints them.
 *
 * ⚠️ The 区分 column is read as Japanese because that is the classification
 * itself -- rule 03 §5's one exception, 「分類の欄を解析するなど」.
 */
const T_027_OUTSIDE_ROWS = specTable('T-027')
  .rows.filter((row) => bare(row.by['区分'] ?? '') === '対象外')
  .map((row) => row.id)

/** The rows 表 T-027 files under 対象. UN-3 and UN-13 are the ones used below. */
const T_027_INSIDE_ROWS = specTable('T-027')
  .rows.filter((row) => bare(row.by['区分'] ?? '') === '対象')
  .map((row) => row.id)

/** Whether one row of 表 T-202 is a toggle, by its own 型 column. */
const isBooleanRow = (row: { readonly by: Readonly<Record<string, string>> }): boolean =>
  bare(row.by['型'] ?? '') === '真偽'

/**
 * 表 T-202's 真偽 rows -- what FR-049 calls toggles, and therefore what UN-7
 * puts outside the history.
 *
 * ⭐ Resolved from the 型 column, never listed here. UN-13's own ⚠️ note makes
 * the 型 column the boundary: 「表 T-202 のうち多値のものは本行、真偽のものは
 * `UN-7` である」.
 */
const T_202_BOOLEAN_ROWS: readonly { readonly id: string; readonly key: string }[] = specTable(
  'T-202',
)
  .rows.filter(isBooleanRow)
  .map((row) => ({ id: row.id, key: bare(row.by['キー'] ?? '') }))

/** The same table's rows that are NOT 真偽 -- UN-13's half, plus S-65. */
const T_202_OTHER_ROWS: readonly string[] = specTable('T-202')
  .rows.filter((row) => !isBooleanRow(row))
  .map((row) => row.id)

// ---------------------------------------------------------------------------
// The document. BT-4 of table T-034: the one template FR-027 keeps.
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

/** The first `TaskGroup`, for FR-098's two commands and for S-78. */
const FIRST_GROUP_ID = START.schedule.taskGroups[0]?.id ?? ''
/** The first `Task`, for CM-9 -- the unrelated edit every case below makes. */
const FIRST_TASK_UID = START.schedule.tasks[0]?.uid ?? 0

/** One key of the 見せ方の群, by name, so a case can name the row it watches. */
const settingOf = (document: Document, key: string): unknown =>
  (document.documentSettings as unknown as Record<string, unknown>)[key]

/** The whole 見せ方の群, for the case that watches all of it at once. */
const settingsOf = (document: Document): string => JSON.stringify(document.documentSettings)

// ---------------------------------------------------------------------------
// One running write path, small enough to hold in a test.
// ---------------------------------------------------------------------------

/**
 * LY-5 of table T-060 keeps these outside the three inner layers, so they
 * arrive as arguments. ⚠️ `rowAreaWidthWithoutPanels` is only wide enough that
 * FR-052's bound does not refuse the panel widths CM-67 writes below; the
 * arithmetic itself belongs to `regionsFromScreen` and to FR-052's own tests.
 */
const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  rowAreaWidthWithoutPanels: 982,
}

/**
 * FR-031's measure of one 段: 「その段の文書を詰めた `GRS JSON`（字下げも改行も
 * 持たない形）へ直列化し、UTF-8 で符号化した長さ（バイト）」. `JSON.stringify`
 * with no replacer and no space IS that compact form, and `Buffer.byteLength`
 * is the encoded length -- never `.length`, which is the 文字数 the same
 * sentence forbids.
 */
const STEP_BYTES = Buffer.byteLength(JSON.stringify(START), 'utf8')

/**
 * S-94 as the caller must state it, and a memory bound deliberately wider than
 * anything this file pushes. ⚠️ No case here is about the bounds; a bound that
 * bound would collapse the history for a reason that has nothing to do with
 * 表 T-027.
 */
const ROOMY_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: STEP_BYTES * (NOT_STORED_LIMITS['S-94'] + 2),
}

const WRITER = 'the case at the keyboard'

/** FR-063: 「刻はいずれも `ISO 8601`・UTC・秒まで」. One second per write. */
const instantOf = (nth: number): string =>
  new Date(Date.UTC(2026, 7, 27, 0, 0, 0) + nth * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')

interface Bench {
  /** What LY-5 says the Framework holds: the document and its history, as one. */
  held: HeldDocument
  /** One trip through CP-8, the ONE write path (MS-1 of table T-042). */
  write(commands: readonly DocumentCommand[]): ApplyOutcome
  /**
   * One press of undo, through the door 表 T-230 opens for it: `RD-1`, whose
   * WS-3 column names `UndoEdit` (PI-11) and whose caller is `replaceDocument`
   * (PI-8). The same import line the writes above travel on.
   *
   * ⭐ WHY NOT `undoEdit` ITSELF. 表 T-027 is not read in that unit and cannot
   * be: `undo-edit.ts` states in its own header 「this unit reads table T-027
   * nowhere」 and `redo-edit.ts` states 「this unit never reads table T-027
   * itself」 -- so the reading that keeps the 対象外 columns has to sit on the
   * caller's side, where ONE reading serves both directions. That caller is
   * `planDocumentReplacement`, and its own head comment claims the same ground:
   * 「THIS FILE IS THE ONE PLACE TABLE T-027 IS READ」. ⛔ A case that pressed
   * `undoEdit` directly would be asking the unit that declines 表 T-027 to obey
   * it, and the second copy that answer would need in `redo-edit.ts` is what
   * R2.7 of docs/development-rules/07-review-standards.md refuses (DRY).
   * ⚠️ The entrance is the PUBLIC one for a second reason: R2.19 (MUST) lets a
   * caller reach only the face Chapter 5.3 declares, and `document-change-plan.ts`
   * is not it -- so `replaceDocument` (PI-8) is asked, and it is what calls
   * `planDocumentReplacement`.
   *
   * ⚠️ IT IS THE DOOR THAT MOVES AND NOT THE RULE. FR-031 and every row of
   * 表 T-027 asserted below are unchanged; what this seam adds is WS-1, WS-2,
   * WS-6 and WS-7 around the same step of history.
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
  // WS-7 runs after the swap. Nothing here watches, so the audience only has
  // to exist -- what it is told is uf-27-28-29's case.
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
          // document holds now, never against a stamp coming in (表 T-230,
          // MUST NOT). The bench holds that pair, so it can declare it honestly.
          readStamp: held.document.documentStamp,
          moment: { gestureInFlight: false, editingInPlace: false, deliveringNotices: false },
          // ⛔ 表 T-230 forbids a replacement that names no row (MUST NOT), and
          // RD-1 is the undo row: 「問う先が答えたものを据える／入ってきたまま
          // ／積まない」.
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

/**
 * One press of undo through the RD-1 seam, refused loudly rather than silently,
 * answering the document WS-6 put in place.
 *
 * ⚠️ WHERE `undone: true` WENT. `undoEdit`'s own answer carries that flag;
 * `ReplaceOutcome` does not, because RD-1 commits the very pair it was given
 * when nothing moved (FR-031 calls an empty history an answer, not an error).
 * Each case below proves the 段 really was walked by asserting that the UN-3
 * edit itself was rewound, which is a stronger statement than the flag.
 */
function mustUndo(one: Bench, why: string): Document {
  const outcome = one.undo()
  if (!outcome.accepted) {
    throw new Error(`${why}: the undo was refused: ${JSON.stringify(outcome.refusal)}`)
  }
  return outcome.document
}

/**
 * The UNRELATED edit every case below undoes: CM-9 `setTaskName`, which UN-3
 * files under 対象 through PR-1 `name` of table T-016.
 *
 * ⭐ It writes into the 日程データの群 only, so it cannot itself move any key
 * this file watches -- which is what makes the assertions after the undo
 * attributable to the history and to nothing else.
 */
function writeUnrelatedEdit(one: Bench, name: string): void {
  mustWrite(
    one,
    [{ kind: commandKindOf('CM-9'), uid: FIRST_TASK_UID, name } as unknown as DocumentCommand],
    `CM-9 ${JSON.stringify(name)}`,
  )
}

// ---------------------------------------------------------------------------
// The 対象外 rows, and the command each of them reaches.
// ---------------------------------------------------------------------------

interface OutsideCase {
  /** The row of 表 T-027 that puts this outside the history. */
  readonly undoRow: string
  /** The row of 表 T-108 whose 確定名 this case writes. */
  readonly commandRow: string
  /** The rows of `_assets/tbl-settings.md` whose keys it moves. */
  readonly settingRows: readonly string[]
  readonly keys: readonly string[]
  /** What the reader last set, key by key. */
  readonly expected: readonly unknown[]
  readonly command: DocumentCommand
  /** What the document needs before the case's own write makes sense. */
  readonly before: readonly DocumentCommand[]
}

/** UN-7: one case per 真偽 row of 表 T-202, flipped away from the template's. */
const UN_7_CASES: readonly OutsideCase[] = T_202_BOOLEAN_ROWS.map((row) => {
  const wanted = !(settingOf(START, row.key) as boolean)
  return {
    undoRow: 'UN-7',
    commandRow: 'CM-58',
    settingRows: [row.id],
    keys: [row.key],
    expected: [wanted],
    command: {
      kind: commandKindOf('CM-58'),
      element: row.key,
      visible: wanted,
    } as unknown as DocumentCommand,
    before: [],
  }
})

/**
 * UN-8, UN-12 and UN-16 -- the 対象外 rows whose values live in the 見せ方の群
 * under a key of their own.
 *
 * ⚠️ Every value below differs from what the bundled document already holds, so
 * that a command which silently did nothing could not pass by leaving no 段 for
 * the wrong reason. Each case asserts the change before it asserts the absence.
 */
const KEYED_CASES: readonly OutsideCase[] = [
  {
    undoRow: 'UN-8',
    commandRow: 'CM-65',
    settingRows: ['S-75', 'S-76'],
    keys: ['zoomX', 'zoomY'],
    expected: [3, 3],
    command: { kind: commandKindOf('CM-65'), zoomX: 3, zoomY: 3 } as unknown as DocumentCommand,
    before: [],
  },
  {
    undoRow: 'UN-8',
    commandRow: 'CM-66',
    settingRows: ['S-77', 'S-78', 'S-176', 'S-177'],
    keys: ['scrollDate', 'scrollGroupId', 'scrollDayOffset', 'scrollGroupOffset'],
    expected: ['2026-05-01', FIRST_GROUP_ID, 0, 0],
    command: {
      kind: commandKindOf('CM-66'),
      scrollDate: '2026-05-01',
      scrollGroupId: FIRST_GROUP_ID,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    } as unknown as DocumentCommand,
    before: [],
  },
  {
    // ⭐ FR-031 files the fit's first write under this row in as many words:
    // 「① 倍率と表示位置を置く（表 T-108 の `CM-71`。表 T-027 の `UN-8` により
    // 段を積まない）」. Its second write (CM-72) is UN-17's and is 対象, so it
    // is not a case here.
    undoRow: 'UN-8',
    commandRow: 'CM-71',
    settingRows: ['S-75', 'S-76', 'S-77', 'S-78'],
    keys: ['zoomX', 'zoomY', 'scrollDate', 'scrollGroupId'],
    expected: [4, 4, '2026-06-01', FIRST_GROUP_ID],
    command: {
      kind: commandKindOf('CM-71'),
      zoomX: 4,
      zoomY: 4,
      scrollDate: '2026-06-01',
      scrollGroupId: FIRST_GROUP_ID,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    } as unknown as DocumentCommand,
    before: [],
  },
  {
    undoRow: 'UN-12',
    commandRow: 'CM-60',
    settingRows: ['S-65'],
    keys: ['dualCursor'],
    expected: [{ date1: '2026-05-01', date2: '2026-06-01' }],
    command: {
      kind: commandKindOf('CM-60'),
      date1: '2026-05-01',
      date2: '2026-06-01',
    } as unknown as DocumentCommand,
    before: [],
  },
  {
    undoRow: 'UN-16',
    commandRow: 'CM-67',
    settingRows: ['S-79', 'S-80'],
    keys: ['rowTitlePanelWidth', 'propertyPanelWidth'],
    expected: [200, 300],
    command: {
      kind: commandKindOf('CM-67'),
      rowTitlePanelWidth: 200,
      propertyPanelWidth: 300,
    } as unknown as DocumentCommand,
    before: [],
  },
  {
    undoRow: 'UN-16',
    commandRow: 'CM-68',
    settingRows: ['S-126'],
    keys: ['pinnedGroupIds'],
    expected: [[FIRST_GROUP_ID]],
    command: {
      kind: commandKindOf('CM-68'),
      groupId: FIRST_GROUP_ID,
    } as unknown as DocumentCommand,
    before: [],
  },
  {
    // FR-098's 外す half needs something pinned first. Pinning is itself 対象外
    // (CM-68 above), so the history is still empty when this case's own write
    // happens.
    undoRow: 'UN-16',
    commandRow: 'CM-69',
    settingRows: ['S-126'],
    keys: ['pinnedGroupIds'],
    expected: [[]],
    command: {
      kind: commandKindOf('CM-69'),
      groupId: FIRST_GROUP_ID,
    } as unknown as DocumentCommand,
    before: [
      { kind: commandKindOf('CM-68'), groupId: FIRST_GROUP_ID } as unknown as DocumentCommand,
    ],
  },
  {
    undoRow: 'UN-16',
    commandRow: 'CM-70',
    settingRows: ['S-82'],
    keys: ['exportPngScale'],
    expected: [2],
    command: { kind: commandKindOf('CM-70'), scale: 2 } as unknown as DocumentCommand,
    before: [],
  },
]

const OUTSIDE_CASES: readonly OutsideCase[] = [...UN_7_CASES, ...KEYED_CASES]

/**
 * The three 対象外 rows that have no column in the document at all.
 *
 * UN-9 is `Selection` (CP-32), UN-10 is the display language FR-038 gives to
 * `ScreenRenderer`, UN-11 is the 構え of 表 T-023b, held in `ScreenState`
 * (CP-36). ⭐ None of them can be reached by an undo for a structural reason
 * rather than a behavioural one, which is what their case asserts.
 */
const ROWS_WITH_NO_DOCUMENT_COLUMN = ['UN-9', 'UN-10', 'UN-11'] as const

// ---------------------------------------------------------------------------
// 1. 表 T-027 itself, before anything is driven by it.
// ---------------------------------------------------------------------------

describe('表 T-027 -- the 対象外 half, and this file covering all of it', () => {
  it('every 対象外 row is either driven through a command here or has no document column', () => {
    const driven = [...new Set(OUTSIDE_CASES.map((one) => one.undoRow))]
    const covered = [...driven, ...ROWS_WITH_NO_DOCUMENT_COLUMN].sort()
    // ⛔ A new 対象外 row in the manuscript must reach this file rather than
    // being quietly untested.
    expect([...T_027_OUTSIDE_ROWS].sort()).toEqual(covered)
  })

  it('UN-13 and UN-3 are 対象, so the other direction below has something to prove', () => {
    expect(T_027_INSIDE_ROWS).toContain('UN-13')
    expect(T_027_INSIDE_ROWS).toContain('UN-3')
  })

  it('UN-7 covers exactly the 真偽 rows of 表 T-202, and 多値 rows are left to UN-13 and UN-12', () => {
    // FR-049 (MUST): 「対象は型が真偽である行だけとすること」. The split is the
    // 型 column's, so both halves are counted from it.
    expect(T_202_BOOLEAN_ROWS.length).toBeGreaterThan(0)
    expect(UN_7_CASES).toHaveLength(T_202_BOOLEAN_ROWS.length)
    // S-65 is the one 多値 row that belongs to UN-12 rather than UN-13; the
    // rest are the four UN-13 names below.
    expect([...T_202_OTHER_ROWS].sort()).toEqual(['S-58', 'S-59', 'S-65', 'S-66', 'S-70'])
  })
})

// ---------------------------------------------------------------------------
// 2. WS-4 of 表 T-067 -- 「表 T-027 の対象外なら積まない」.
// ---------------------------------------------------------------------------

describe('表 T-067 WS-4 -- an 対象外 write pushes no 段 of its own', () => {
  for (const one of OUTSIDE_CASES) {
    const name = `${one.undoRow} / ${one.commandRow} (${one.keys.join(', ')})`
    it(`${name}: changes the document and leaves the history empty`, () => {
      const run = bench()
      for (const first of one.before) mustWrite(run, [first], `${one.commandRow}'s precondition`)

      const settingsBefore = settingsOf(run.held.document)
      const outcome = run.write([one.command])

      // ⚠️ A refusal here is not a T-027 finding. For a UN-7 case it is
      // FR-049's -- 「対象は型が真偽である行だけとすること（MUST）」 makes every
      // 真偽 row of 表 T-202 a toggle, S-144 `watermarkVisible` included.
      expect(outcome.accepted, `${name}: ${JSON.stringify(outcome)}`).toBe(true)
      // Without this the case would pass on a command that silently did
      // nothing: nothing happened, so nothing was pushed.
      expect(settingsOf(run.held.document), `${name}: the write moved nothing`).not.toBe(
        settingsBefore,
      )
      one.keys.forEach((key, at) => {
        expect(settingOf(run.held.document, key), `${name}: ${key}`).toEqual(one.expected[at])
      })

      expect(run.depth(), `${name}: 表 T-027 ${one.undoRow} is 対象外`).toBe(0)
    })
  }
})

// ---------------------------------------------------------------------------
// 3. FR-031 -- an 対象外 value must not be rewound by an undo of something else.
//
//    ⭐ 「⚠️ 保存することと戻せることは別である」 (表 T-027, UN-16). The value is
//    saved in the document AND it is not something an undo may give back.
//
//    ⛔ 「⚠️ 1 つにまとめて書くと、段が古い倍率ごと持つので、取り消しが `UN-8`
//    を破る。」 (FR-031). A 段 that carries the old value, handed back by an
//    undo, breaks the row -- which is exactly what happens whenever the 段 was
//    pushed BEFORE the 対象外 write.
// ---------------------------------------------------------------------------

describe('FR-031 -- 対象外 の値は、無関係な編集の取り消しで戻ってはならない', () => {
  for (const one of OUTSIDE_CASES) {
    const name = `${one.undoRow} / ${one.commandRow} (${one.keys.join(', ')})`

    it(`${name}: set BEFORE the unrelated edit, it survives that edit's undo`, () => {
      // ⭐ The order FR-031 requires of one fit press, generalised: the 対象外
      // write happens first, so the 段 the next write pushes already carries the
      // new value. This half is expected to hold today; it is here so that the
      // failing half below is known to be about the ORDER and not about the
      // command.
      const run = bench()
      for (const first of one.before) mustWrite(run, [first], `${one.commandRow}'s precondition`)
      mustWrite(run, [one.command], one.commandRow)

      writeUnrelatedEdit(run, 'a name the case will undo')
      expect(run.depth(), `${name}: the 対象 edit pushed its 段`).toBe(1)

      const back = undoEdit(run.held)
      expect(back.undone, name).toBe(true)
      one.keys.forEach((key, at) => {
        expect(settingOf(back.next.document, key), `${name}: ${key}`).toEqual(one.expected[at])
      })
    })

    it(`${name}: set AFTER the unrelated edit, it STILL survives that edit's undo`, () => {
      // ⛔ THE CASE THIS FILE EXISTS FOR. WS-4 pushes the document as it stood
      // BEFORE the 対象 write, so that 段 carries the OLD value of this key. An
      // undo that hands the 段 back whole hands the old value back with it --
      // 「取り消しが `UN-8` を破る」, and by the same mechanism every other
      // 対象外 row.
      //
      // ⭐ THE DOOR IS `replaceDocument` ON ROW RD-1 OF 表 T-230, NOT `undoEdit`
      // (PI-11) -- see `Bench.undo`. 表 T-027 is declined by BOTH units that
      // walk the history: `src/use-case/undo-edit/undo-edit.ts` says in its
      // header 「this unit reads table T-027 nowhere」 and
      // `src/use-case/redo-edit/redo-edit.ts` says 「this unit never reads table
      // T-027 itself」. So the reading that keeps these columns lives once in
      // their caller, `planDocumentReplacement` -- 「THIS FILE IS THE ONE PLACE
      // TABLE T-027 IS READ」 -- and serves RD-1 and RD-2 together. Asking
      // `undoEdit` for it would demand a second copy in `redo-edit.ts`, which
      // is the duplication R2.7 of docs/development-rules/07-review-standards.md
      // refuses. ⚠️ And the door is the PUBLIC entry, not the plan file: R2.19
      // (MUST) lets a caller reach only what Chapter 5.3 declares.
      // ⚠️ NOTHING THE CASE ASSERTS MOVED. Every expected value below is still
      // the one 表 T-027 makes it, on the same rows; only the entrance changed.
      const run = bench()
      // ⚠️ The precondition runs BEFORE the 対象 edit on purpose. CM-69 undoes
      // CM-68, so a run that pinned after the edit would expect the template's
      // own empty list back and could not tell a correct build from one that
      // rewound the pin -- the two answers would be the same value.
      for (const first of one.before) mustWrite(run, [first], `${one.commandRow}'s precondition`)

      writeUnrelatedEdit(run, 'a name the case will undo')
      expect(run.depth(), `${name}: the 対象 edit pushed its 段`).toBe(1)

      mustWrite(run, [one.command], one.commandRow)
      expect(run.depth(), `${name}: the 対象外 write added no 段`).toBe(1)

      const after = mustUndo(run, name)

      // The 対象 edit really was undone -- otherwise the assertions after it
      // would pass on a build where undo did nothing at all.
      expect(
        after.schedule.tasks.find((task) => task.uid === FIRST_TASK_UID)?.name,
        `${name}: UN-3 is 対象 and must have been rewound`,
      ).toBe(START.schedule.tasks.find((task) => task.uid === FIRST_TASK_UID)?.name)

      one.keys.forEach((key, at) => {
        expect(
          settingOf(after, key),
          `${name}: ${key} (${one.settingRows.join(' / ')}) was rewound by an undo`,
        ).toEqual(one.expected[at])
      })
    })
  }

  it('UN-3 writes nothing in the 見せ方の群, so undoing it may move none of it', () => {
    // ⭐ The same finding stated once over the whole group rather than key by
    // key: CM-9 touches the 日程データの群 only, so every difference the undo
    // makes to 見せ方の群 is a 対象外 value it had no right to touch.
    //
    // ⭐ THE SAME DOOR AS THE CASES ABOVE, AND FOR THE SAME REASON: RD-1 of
    // 表 T-230 through `replaceDocument` (PI-8), never `undoEdit` (PI-11).
    // `undo-edit.ts` 「reads table T-027 nowhere」 and `redo-edit.ts` 「never
    // reads table T-027 itself」, both in their own headers, so the one reading
    // of that table sits in their caller `planDocumentReplacement` and covers
    // the undo and the redo at once (R2.7, DRY -- and reached through PI-8's
    // public face, which R2.19 makes the only one a test may reach).
    // ⚠️ The assertion is the one it always was: the 見せ方の群 must come back
    // byte for byte as it stood.
    const run = bench()
    writeUnrelatedEdit(run, 'a name the case will undo')
    // ⚠️ In the printed order CM-68 pins the row that CM-69 then unpins, so no
    // case's `before` has to be replayed here -- and replaying CM-68 twice
    // would ask FR-098 to pin a row that is already pinned.
    for (const one of KEYED_CASES) mustWrite(run, [one.command], one.commandRow)
    expect(run.depth(), 'only the UN-3 edit earned a 段').toBe(1)

    const beforeUndo = settingsOf(run.held.document)
    const after = mustUndo(run, 'the UN-3 edit')
    // The 段 really was walked -- the same proof the keyed cases use, in place
    // of `undoEdit`'s `undone` flag (see `mustUndo`).
    expect(
      after.schedule.tasks.find((task) => task.uid === FIRST_TASK_UID)?.name,
      'UN-3 is 対象 and must have been rewound',
    ).toBe(START.schedule.tasks.find((task) => task.uid === FIRST_TASK_UID)?.name)
    expect(settingsOf(after)).toBe(beforeUndo)
  })
})

// ---------------------------------------------------------------------------
// 4. The other direction. ⭐ Without this block every case above would pass on a
//    build whose undo did nothing at all.
//
//    UN-13 is 対象 and deliberately keeps the multi-valued presentation columns
//    INSIDE the history: 「⚠️ 表 T-202 のうち多値のものは本行、真偽のものは
//    `UN-7` である」.
// ---------------------------------------------------------------------------

interface InsideCase {
  readonly commandRow: string
  readonly settingRow: string
  readonly key: string
  readonly wanted: unknown
  readonly command: DocumentCommand
}

const UN_13_CASES: readonly InsideCase[] = [
  {
    // 積む向き（`FR-003`）
    commandRow: 'CM-56',
    settingRow: 'S-58',
    key: 'stackDirection',
    wanted: 'down',
    command: { kind: commandKindOf('CM-56'), direction: 'down' } as unknown as DocumentCommand,
  },
  {
    // 予実の表示（`FR-049`）
    commandRow: 'CM-57',
    settingRow: 'S-59',
    key: 'planActualDisplay',
    wanted: 'plan-only',
    command: { kind: commandKindOf('CM-57'), display: 'plan-only' } as unknown as DocumentCommand,
  },
  {
    // ガイドカーソル（`FR-048`）
    commandRow: 'CM-59',
    settingRow: 'S-66',
    key: 'guideCursorMode',
    wanted: 'crosshair',
    command: { kind: commandKindOf('CM-59'), mode: 'crosshair' } as unknown as DocumentCommand,
  },
  {
    // 文字サイズ（`FR-039`） -- UN-13 names it as the row that already stands in
    // this form, which is how the 型 column became the boundary at all.
    commandRow: 'CM-62',
    settingRow: 'S-70',
    key: 'fontScale',
    wanted: 'L',
    command: { kind: commandKindOf('CM-62'), scale: 'L' } as unknown as DocumentCommand,
  },
]

describe('表 T-027 UN-13 -- a 見せ方 column the table does NOT exclude IS rewound', () => {
  for (const one of UN_13_CASES) {
    const name = `UN-13 / ${one.commandRow} (${one.key}, ${one.settingRow})`

    it(`${name}: pushes one 段, and the undo puts the template's value back`, () => {
      const run = bench()
      const started = settingOf(START, one.key)
      expect(one.wanted, `${name}: the case must actually change something`).not.toEqual(started)

      mustWrite(run, [one.command], one.commandRow)
      expect(settingOf(run.held.document, one.key), name).toEqual(one.wanted)
      // ⛔ WS-4: 対象 rows DO push a 段.
      expect(run.depth(), `${name}: UN-13 is 対象`).toBe(1)

      const back = undoEdit(run.held)
      expect(back.undone, name).toBe(true)
      expect(settingOf(back.next.document, one.key), `${name}: the undo must rewind it`).toEqual(
        started,
      )
    })
  }
})

// ---------------------------------------------------------------------------
// 5. UN-9 / UN-10 / UN-11 -- the 対象外 rows with no column to rewind.
// ---------------------------------------------------------------------------

describe('表 T-027 UN-9 / UN-10 / UN-11 -- outside the document, not merely outside the history', () => {
  it('表 T-108 holds no command for the selection, the display language or the 構え', () => {
    // ⚠️ The three words are matched in Japanese because the 何を担うか column is
    // written in it -- rule 03 §5's parsing exception. 表 T-108 is the whole set
    // of `DocumentCommand` (PI-8), so a roster with none of them is a roster
    // that cannot write any of the three into a document.
    const duties = specTable('T-108').rows.map((row) => row.by['何を担うか'] ?? '')
    for (const word of ['選択', '表示言語', '構え']) {
      expect(duties.filter((duty) => duty.includes(word)), word).toHaveLength(0)
    }
    // FR-038 owns the display language, and no command row answers to it.
    const owners = specTable('T-108').rows.map((row) => bare(row.by['正'] ?? ''))
    expect(owners).not.toContain('FR-038')
  })

  it('the document root and the 見せ方の群 hold no key for any of the three', () => {
    // ⭐ A 段 of the history is a whole `Document` (`ChangeStep`), so a value
    // with no key anywhere in a `Document` cannot be in a 段 -- which is why
    // these three rows need no behavioural case, and why a future manuscript
    // that gave one of them a column would have to answer 表 T-027 again.
    const named = ['selection', 'selectedIds', 'language', 'displayLanguage', 'armed', 'stance']
    const keys = [...ROOT_KEYS, ...Object.keys(SETTINGS_DEFAULTS)]
    for (const key of named) expect(keys, key).not.toContain(key)
  })
})
