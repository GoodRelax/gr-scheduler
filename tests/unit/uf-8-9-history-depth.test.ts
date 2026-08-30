// Unit tests for the DEPTH of the undo history FR-031 promises, driven through
// the one write path -- UF-8 `apply-document-change.ts` (WS-6 / WS-7) and UF-9
// `document-change-plan.ts` (WS-1 to WS-5, and WS-4 is the line under test),
// then walked back and forward through UF-20 `undo-edit.ts` and UF-21
// `redo-edit.ts` over UF-4 `edit-history.ts` (table T-075 of
// docs/spec/05-07-design.md; components CP-8, CP-11, CP-12, CP-4 of table
// T-062).
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNITS' BODIES (docs/development-rules/
// 04-verification.md §1 -- the one who wrote a unit does not write its test).
// Read of `apply-document-change.ts`: its head comment, `HeldDocument`,
// `DocumentHolder`, `ChangeAudience`, `ApplyOutcome` and the signature
// `applyDocumentChange(input, holder, audience): ApplyOutcome`. Read of
// `undo-edit.ts` / `redo-edit.ts`: their head comments, `UndoOutcome` /
// `RedoOutcome` and the two signatures. `document-change-plan.ts` was not
// opened at all, so WS-4 -- the line these cases exist for -- is a black box
// here. ⚠️ ONE HONEST EXCEPTION: `edit-history.ts` is 200 lines and was printed
// whole, so the bodies of `historyWithStep` / `previousStep` / `nextStep` were
// seen. NOTHING below is expected because of what they do; every number comes
// from the manuscript and every behaviour from a requirement or a table row,
// and the cases were designed before that file was opened.
//
// ⭐ WHY THIS FILE EXISTS -- what 2296 green tests did not hold.
// The three nearest test files each leave the same hole:
//   - tests/unit/uf-20-21.test.ts walks a three-step history built BY HAND with
//     a step size of 1. `historyWithStep` is never reached through a write, so
//     no real step size and no real bound is ever exercised.
//   - tests/unit/uf-27-28-29.test.ts asserts the write path honours the bound
//     it was handed, but hands it `maxSteps: 1` -- a history capped at one step
//     satisfies that case with or without a memory bound.
//   - tests/unit/document-model.test.ts drives `EditHistory` at the value level
//     with `{ maxSteps: 3, maxTotalSizeBytes: 1000 }` and never meets a document.
// Nothing ran N REAL writes with the REAL bounds and then asked whether N undos
// were there. A shipped defect passed straight through that hole: the shell
// handed `S-95` over as a bare number, so the bound was 64 BYTES rather than
// 64 MB, and every write collapsed the history to a single step against S-94's
// promise of 50.
//
// The rules these cases answer to, all of them from docs/spec:
//   FR-031        「作成者が取り消しを求めたとき、`GRS` は、直前の編集を取り
//                 消し、取り消した編集をやり直せるようにすること。取り消しの
//                 対象は表 T-027 に従うこと。段数と合計メモリに上限を持ち、
//                 上限を超えたときは最も古い段から捨てること（MUST）。値は表
//                 T-206 の `S-94` / `S-95`。1 段の大きさは、その段の保存形を
//                 UTF-8 で符号化した長さ（バイト）で測ること（MUST）。」
//                 ⚠️ 「文字数で測ってはならない（MUST NOT）」 -- 「`S-95` は
//                 バイトの単位で書かれており」 -- and the reason the unit is
//                 the whole point: 「測り方を定めないと、同じ文書が端末ごとに
//                 違う段数を保つ。」
//   表 T-206 S-94 「取り消しの段数 | 50」
//   表 T-206 S-95 「取り消しの合計メモリ上限 | `64` MB」, whose own remark
//                 settles the conversion: 「1 MB = 1024 × 1024 バイトとする」
//   表 T-027      which operations earn a 段 and which do not. UN-3 (a Task
//                 property of table T-016, and PR-1 is `name`) is the 対象 row
//                 these cases write with; UN-16 -- 「見る場所の割り付けと出力
//                 の設定 —— パネル幅（`FR-052`）・ピン止め（`FR-098`）・PNG の
//                 倍率（`FR-025`）」 -- is the 対象外 row they walk
//   表 T-108      CM-9 `setTaskName`, and CM-67 / CM-68 / CM-69 / CM-70, the
//                 four commands whose 正 is one of UN-16's three requirements
//   表 T-067 WS-4 「取り消しの履歴に 1 段積む。表 T-027 の対象外なら積まない」
//                 -- the step is pushed by the write path and nowhere else
//   表 T-042 MS-1 `applyDocumentChange` is the ONE write path, so a history
//                 depth that is only reachable by hand is not the application's
//   表 T-034 BT-4 the bundled template FR-027 keeps exactly one of -- the
//                 document the application actually boots
//
// ⭐ WHERE THE VALUES COME FROM. 04-verification.md §2 asks that a test of a
// value the manuscript owns fail when the manuscript moves, so not one number
// the specification decides is typed here:
//   - S-94's 段数 and S-95's number AND its unit word are read out of
//     docs/spec/_assets/tbl-settings.md at read time through `specTable`
//   - the megabyte factor is read out of S-95's OWN remark, not assumed --
//     「1 MB = 1024 × 1024 バイトとする」 is parsed from the cell
//   - the excluded commands are resolved manuscript-to-manuscript: the `FR-`
//     ids inside table T-027's UN-16 cell select the rows of table T-108 whose
//     正 column names them
//   - one 段's size is `Buffer.byteLength(jsonFromDocument(document), 'utf8')`
//     -- FR-031's 「その段の保存形を UTF-8 で符号化した長さ（バイト）」,
//     computed from the document rather than written down
// ⚠️ `NOT_STORED_LIMITS` is the generated copy of those two rows (it reaches
// `src/` through `npm run gen`); the first case checks it against the
// manuscript so that the rest may use it as the caller does.
//
// ⚠️ THE DOCUMENT IS THE BUNDLED ONE (BT-4), read through `documentFromJson`.
// A hand-built two-task fixture cannot show the defect this file is about: its
// saved form is small enough that 64 bytes and 64 MB are not far enough apart
// to be told apart by the number of steps that survive. The startup document's
// saved form is ~875 KiB, so ONE step already exceeds S-95 read as bytes --
// which is exactly why the shipped history was one step deep.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, because nothing in docs/spec decides it:
//   - the EXACT number of steps a byte bound admits when that bound is the one
//     that binds. FR-031 fixes the unit and the measure but leaves the serial
//     form of a 段 to whoever records one, and 「保存形」 admits both the
//     indented GRS JSON `jsonFromDocument` writes and a compact one. So the
//     bound-binds case asserts the SHAPE of the answer (more bound, more steps;
//     fewer than S-94 either way) and the S-95 case asserts the value only
//     where S-94 is what binds, which both readings agree on.
//   - how an undo reaches WS-6. `undo-edit.ts` records in its own head comment
//     that the specification does not decide it and that no entry exists, so
//     the pure units are driven over the pair this file holds.
//   - what `editedBy` should say for a write made by a test. Table T-229 owns
//     the words the application signs with; none of them is this.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
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
import { redoEdit } from '../../src/use-case/redo-edit/redo-edit'
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

const S_94_ROW = rowOf('T-206', 'S-94')
const S_95_ROW = rowOf('T-206', 'S-95')

/** S-94 of table T-206 -- 「取り消しの段数」. */
const S_94 = Number.parseInt(bare(S_94_ROW.by['既定'] ?? '').replace(/[^\d]/g, ''), 10)

/**
 * S-95 of table T-206 -- 「取り消しの合計メモリ上限」, number and unit word.
 *
 * ⭐ The unit is read, not assumed. FR-031 says in as many words that 「`S-95`
 * は バイトの単位で書かれており」 the count must be bytes, so a manuscript that
 * re-stated this row in some other unit has to reach this file.
 */
const S_95_STATED = /`?(\d+)`?\s*(MB|KB|GB|B)\b/.exec(S_95_ROW.by['既定'] ?? '')
if (S_95_STATED === null) {
  throw new Error(`table T-206 row S-95: no "<number> <unit>" in ${S_95_ROW.by['既定'] ?? ''}`)
}
const S_95_NUMBER = Number.parseInt(S_95_STATED[1] ?? '', 10)
const S_95_UNIT = S_95_STATED[2] ?? ''

/**
 * S-95's own remark: 「1 MB = 1024 × 1024 バイトとする」.
 *
 * ⭐ Parsed rather than assumed, because THIS is the sentence the shipped
 * defect walked past. A test that wrote `* 1024 * 1024` by hand would agree
 * with a manuscript that had never said it.
 */
const MB_FACTOR = (() => {
  const said = /1\s*MB\s*=\s*(\d+)\s*×\s*(\d+)\s*バイト/.exec(S_95_ROW.by['保存しない理由'] ?? '')
  if (said === null) {
    throw new Error('table T-206 row S-95: its remark no longer states what one MB is')
  }
  return Number.parseInt(said[1] ?? '', 10) * Number.parseInt(said[2] ?? '', 10)
})()

/** S-95, converted the way S-95 itself says to convert it. */
const S_95_BYTES = S_95_NUMBER * MB_FACTOR

/**
 * The `FR-` ids table T-027's UN-16 names, and the table T-108 commands whose
 * 正 is one of them.
 *
 * ⭐ Manuscript-to-manuscript: UN-16 says 「パネル幅（`FR-052`）・PNG の倍率
 * （`FR-025`）」 and table T-108's 正 column says which
 * command each of those requirements owns. Nothing here decides which commands
 * are out of scope; the two tables do, and re-deciding either one reaches this
 * file.
 */
const UN_16_REQUIREMENTS = [
  ...new Set((rowOf('T-027', 'UN-16').by['操作'] ?? '').match(/FR-\d+/g) ?? []),
]

interface ExcludedCommand {
  readonly commandRow: string
  readonly kind: string
  readonly requirement: string
}

const UN_16_COMMANDS: readonly ExcludedCommand[] = specTable('T-108')
  .rows.filter((row) => UN_16_REQUIREMENTS.includes(bare(row.by['正'] ?? '')))
  .map((row) => ({
    commandRow: row.id,
    kind: bare(row.by['確定名'] ?? ''),
    requirement: bare(row.by['正'] ?? ''),
  }))

/** CM-9 of table T-108 -- 「名称を変える」, the 対象 row UN-3 reaches through PR-1. */
const CM_9 = bare(rowOf('T-108', 'CM-9').by['確定名'] ?? '')

// ---------------------------------------------------------------------------
// The document. BT-4 of table T-034: the one template FR-027 keeps, and the one
// document whose values the specification has actually decided.
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE_TEXT = readFileSync(TEMPLATE_PATH, 'utf8')

function templateDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) {
    throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const START = templateDocument()

/**
 * FR-031's measure of one 段: 「その段の保存形を UTF-8 で符号化した長さ
 * （バイト）」. `jsonFromDocument` is the saved form (PI-20 of table T-064),
 * and `Buffer.byteLength(..., 'utf8')` is the encoded length -- never
 * `.length`, which is the 文字数 the same sentence forbids.
 */
const STEP_BYTES = Buffer.byteLength(jsonFromDocument(START), 'utf8')

/** The first `TaskGroup` of the bundled document, for FR-098's two commands. */
const FIRST_GROUP_ID = START.schedule.taskGroups[0]?.id ?? ''
/** The first `Task`, for CM-9. */
const FIRST_TASK_UID = START.schedule.tasks[0]?.uid ?? 0

// ---------------------------------------------------------------------------
// One running write path, small enough to hold in a test.
// ---------------------------------------------------------------------------

/**
 * LY-5 of table T-060 keeps these outside the three inner layers, so they
 * arrive as arguments. The two zoom bounds and the row width are not what this
 * file is about; they are wide enough that no case below is refused by them.
 */
const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: 0.02,
  zoomMax: 64,
  rowAreaWidthWithoutPanels: 982,
}

/** S-94 and S-95 as the caller has to state them: steps, and BYTES. */
const REAL_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * MB_FACTOR,
}

const WRITER = 'the case at the keyboard'

/** FR-063: 「刻はいずれも `ISO 8601`・UTC・秒まで」. One second per write. */
const instantOf = (nth: number): string =>
  new Date(Date.UTC(2026, 7, 22, 0, 0, 0) + nth * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')

interface Bench {
  /** What LY-5 says the Framework holds: the document and its history, as one. */
  held: HeldDocument
  /** One trip through CP-8, the ONE write path (MS-1 of table T-042). */
  write(commands: readonly DocumentCommand[]): ApplyOutcome
  /** How many 段 the history holds right now. */
  depth(): number
  /** The document's saved form, for a byte-identical comparison. */
  json(): string
}

function bench(limits: HistoryLimits = REAL_LIMITS): Bench {
  let held: HeldDocument = { document: START, history: emptyHistory<ChangeStep>() }
  let writes = 0

  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      held = next
    },
  }
  // WS-7 of table T-067 runs after the swap. Nothing in this file watches, so
  // the audience only has to exist -- what it is told is uf-27-28-29's case.
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
          historyLimits: limits,
          settingsLimits: SETTINGS_LIMITS,
          editedBy: WRITER,
          updatedUtc: instantOf(writes),
        },
        holder,
        audience,
      )
    },
    depth: () => stepCount(held.history),
    json: () => JSON.stringify(held.document),
  }
}

/**
 * `nth` real writes, each of which changes the document and each of which is a
 * 対象 of table T-027 (UN-3, a `Task` property -- PR-1 `name` of table T-016).
 *
 * ⚠️ The cast is the price of taking the kind out of the manuscript instead of
 * typing it: `CM_9` is a `string` until table T-108 is read, so the discriminant
 * cannot be checked at compile time. The first case in the T-027 block is what
 * catches a table T-108 that has renamed the row -- the write would be refused
 * and `writeNames` would throw with the refusal in the message.
 */
function writeNames(one: Bench, nth: number): void {
  for (let i = 1; i <= nth; i += 1) {
    const outcome = one.write([
      { kind: CM_9, uid: FIRST_TASK_UID, name: `edit ${i}` } as unknown as DocumentCommand,
    ])
    if (!outcome.accepted) {
      throw new Error(`write ${i} was refused: ${JSON.stringify(outcome.refusal)}`)
    }
  }
}

/**
 * A payload for each command table T-027's UN-16 puts out of scope.
 *
 * ⚠️ Each value differs from what the bundled document already holds
 * (`rowTitlePanelWidth` 170, `propertyPanelWidth` 280, `exportPngScale` 1,
 * nothing pinned), because a command that changed nothing would leave no 段
 * for a reason that has nothing to do with table T-027. The cases assert the
 * change before they assert the absence of the 段.
 */
const PAYLOAD: Readonly<Record<string, DocumentCommand>> = {
  setPanelWidths: { kind: 'setPanelWidths', rowTitlePanelWidth: 200, propertyPanelWidth: 300 },
  pinTaskGroup: { kind: 'pinTaskGroup', groupId: FIRST_GROUP_ID },
  unpinTaskGroup: { kind: 'unpinTaskGroup', groupId: FIRST_GROUP_ID },
  setExportPngScale: { kind: 'setExportPngScale', scale: 2 },
}

// ---------------------------------------------------------------------------
// 1. The two rows of table T-206, before anything is driven by them.
// ---------------------------------------------------------------------------

describe('表 T-206 -- the two values FR-031 says the bounds are', () => {
  it('S-94: the generated constant carries the 段数 the manuscript states', () => {
    expect(S_94).toBeGreaterThan(0)
    expect(NOT_STORED_LIMITS['S-94']).toBe(S_94)
  })

  it('S-95: the manuscript states it in MB, and the generated constant is that number', () => {
    expect(S_95_UNIT).toBe('MB')
    expect(NOT_STORED_LIMITS['S-95']).toBe(S_95_NUMBER)
  })

  it('S-95: its own remark settles the factor -- 「1 MB = 1024 × 1024 バイトとする」', () => {
    expect(MB_FACTOR).toBe(1024 * 1024)
    expect(S_95_BYTES).toBe(S_95_NUMBER * MB_FACTOR)
  })
})

// ---------------------------------------------------------------------------
// 2. FR-031 -- 「段数と合計メモリに上限を持ち、上限を超えたときは最も古い段から
//    捨てること（MUST）。値は表 T-206 の `S-94` / `S-95`」
// ---------------------------------------------------------------------------

describe('FR-031 / S-94 -- 段数の上限は、実際の書き込みを通して届くこと', () => {
  it('S-94: more real writes than S-94 through CP-8 leave exactly S-94 段', () => {
    const one = bench()
    writeNames(one, S_94 + 3)
    expect(one.depth()).toBe(S_94)
  })

  it('S-94 / WS-4: every write below the bound adds one 段, so depth counts writes', () => {
    const one = bench()
    for (let i = 1; i <= 5; i += 1) {
      writeNames(one, 1)
      expect(one.depth(), `after ${i} writes`).toBe(i)
    }
  })

  it('S-94: S-94 undos each change the document, and the next one does not', () => {
    const one = bench()
    writeNames(one, S_94 + 3)

    let held = one.held
    for (let i = 1; i <= S_94; i += 1) {
      const before = JSON.stringify(held.document)
      const back = undoEdit(held)
      expect(back.undone, `undo ${i} of ${S_94}`).toBe(true)
      held = back.next
      expect(JSON.stringify(held.document), `undo ${i} changed the document`).not.toBe(before)
    }

    const past = JSON.stringify(held.document)
    const beyond = undoEdit(held)
    expect(beyond.undone, `undo ${S_94 + 1}`).toBe(false)
    expect(JSON.stringify(beyond.next.document)).toBe(past)
  })

  it('S-94: 上限を超えたときは最も古い段から捨てる -- the OLDEST goes, so the newest still undoes', () => {
    const one = bench()
    writeNames(one, S_94 + 3)

    const back = undoEdit(one.held)
    expect(back.undone).toBe(true)
    // The last write named the task `edit S_94 + 3`; undoing it must land on the
    // one before, never on the template's own name.
    const undoneTo = back.next.document.schedule.tasks.find((drawnText) => drawnText.uid === FIRST_TASK_UID)
    expect(undoneTo?.name).toBe(`edit ${S_94 + 2}`)
  })
})

// ---------------------------------------------------------------------------
// 3. FR-031 -- 「1 段の大きさは、その段の保存形を UTF-8 で符号化した長さ
//    （バイト）で測ること（MUST）」, and S-95 is the bound it is measured against.
// ---------------------------------------------------------------------------

describe('FR-031 / S-95 -- 合計メモリの上限は MB で書かれ、バイトで数えられる', () => {
  it('S-95: one 段 of the bundled document already exceeds S-95 read as a bare byte count', () => {
    // ⭐ This is what makes the S-94 depth cases discriminating. If the two
    // readings of S-95 were not far enough apart for this document, a history
    // bounded at S-95 bytes and one bounded at S-95 MB would keep the same
    // number of 段 and no depth assertion could tell them apart. It is also
    // why BT-4 and not a two-task fixture: a small enough document fits inside
    // the bare number and hides the whole defect.
    expect(STEP_BYTES).toBeGreaterThan(NOT_STORED_LIMITS['S-95'])
  })

  it('S-95 / S-94: the 段数 that fits is min(S-94, S-95 バイト ÷ 1 段の保存形)', () => {
    const fitsByMemory = Math.floor(S_95_BYTES / STEP_BYTES)
    const expected = Math.min(S_94, fitsByMemory)

    const one = bench()
    writeNames(one, S_94 + 3)
    expect(one.depth()).toBe(expected)
  })

  it('S-95: handed over unconverted, the bound is S-95 バイト and the history collapses below S-94', () => {
    // ⛔ The defect that shipped: the shell passed `NOT_STORED_LIMITS['S-95']`
    // straight through. FR-031 says 「`S-95` はバイトの単位で書かれており」 the
    // COUNT is in bytes -- it does not say the VALUE is, and S-95's own 既定
    // cell says MB. This case pins the difference so the two can never be
    // confused again silently.
    const one = bench({ maxSteps: S_94, maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] })
    writeNames(one, S_94 + 3)
    expect(one.depth()).toBeLessThan(S_94)
  })

  it('S-95: the 合計 is measured against the document, so a wider bound keeps more 段', () => {
    // ⚠️ The EXACT counts are not asserted: FR-031 fixes the measure
    // (「保存形を UTF-8 で符号化した長さ」) but leaves the serial form of a 段 to
    // whoever records one, and both the indented and a compact GRS JSON are
    // 保存形. What every reading agrees on is the shape: a bound of a few
    // documents keeps a few 段, a wider one keeps more, and neither reaches
    // S-94.
    const narrow = bench({ maxSteps: S_94, maxTotalSizeBytes: STEP_BYTES * 3 })
    writeNames(narrow, 20)
    const wide = bench({ maxSteps: S_94, maxTotalSizeBytes: STEP_BYTES * 12 })
    writeNames(wide, 20)

    expect(narrow.depth()).toBeGreaterThan(1)
    expect(narrow.depth()).toBeLessThan(wide.depth())
    expect(wide.depth()).toBeLessThan(S_94)
  })
})

// ---------------------------------------------------------------------------
// 4. FR-031 -- 「取り消しの対象は表 T-027 に従うこと」, through the same path.
//    WS-4 of table T-067: 「表 T-027 の対象外なら積まない」.
// ---------------------------------------------------------------------------

describe('FR-031 / 表 T-027 -- 対象と対象外を、同じ書き込みの経路で', () => {
  it('UN-3 / CM-9: a `Task` property change (PR-1 `name`) leaves one 段', () => {
    const one = bench()
    const before = one.json()
    writeNames(one, 1)
    expect(one.json()).not.toBe(before)
    expect(one.depth()).toBe(1)
  })

  // ⚠️ UN-16 NAMED PINNING (FR-098) UNTIL 2026-08-28, AND THESE TWO NUMBERS ARE
  // WHERE THAT SHOWS. CR-277 moved pinning to UN-14 -- 対象, inside the history
  // -- because UN-16 and IV-3 of table T-220 stated opposite things about a pin
  // whose row an undo removes. CM-68 / CM-69 therefore leave this file's scope,
  // and the 対象 half of their behaviour is owed a home (D-102).
  it('UN-16 names two requirements, and table T-108 gives them two commands', () => {
    expect(UN_16_REQUIREMENTS.sort()).toEqual(['FR-025', 'FR-052'])
    expect(UN_16_COMMANDS.map((oneCell) => oneCell.commandRow)).toEqual(['CM-67', 'CM-70'])
  })

  describe('UN-16 対象外 -- 見る場所の割り付けと出力の設定', () => {
    for (const command of UN_16_COMMANDS) {
      it(`UN-16 / ${command.commandRow} \`${command.kind}\` (${command.requirement}): changes the document and leaves NO 段`, () => {
        const one = bench()
        // FR-098's 外す half needs something pinned; pinning is itself 対象外,
        // so the history is still empty when the case's own write happens.
        if (command.kind === 'unpinTaskGroup') {
          const pinned = one.write([PAYLOAD['pinTaskGroup'] as DocumentCommand])
          expect(pinned.accepted, 'the precondition write').toBe(true)
        }

        const payload = PAYLOAD[command.kind]
        expect(payload, `no payload for ${command.kind}`).toBeDefined()

        const before = one.json()
        const outcome = one.write([payload as DocumentCommand])

        expect(outcome.accepted, JSON.stringify(outcome)).toBe(true)
        // ⚠️ Without this the case would pass on a command that was silently a
        // no-op: nothing happened, so nothing was pushed.
        expect(one.json(), 'the command really did change the document').not.toBe(before)
        expect(one.depth()).toBe(0)
      })
    }
  })

  it('UN-16 / WS-4: an out-of-scope write cannot bury the 段 the edit before it left', () => {
    const one = bench()
    writeNames(one, 1)
    expect(one.depth()).toBe(1)
    one.write([PAYLOAD['setExportPngScale'] as DocumentCommand])
    expect(one.depth()).toBe(1)

    const back = undoEdit(one.held)
    expect(back.undone).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 5. FR-031 -- 「直前の編集を取り消し、取り消した編集をやり直せるようにする
//    こと」, all the way back and all the way forward.
// ---------------------------------------------------------------------------

describe('FR-031 -- 取り消して、やり直して、元の文書へ戻る', () => {
  it('undoing every 段 lands byte-identically on the document the writes started from', () => {
    const one = bench()
    const started = JSON.stringify(START)
    writeNames(one, 5)
    expect(one.json()).not.toBe(started)

    let held = one.held
    for (let i = 1; i <= 5; i += 1) {
      const back = undoEdit(held)
      expect(back.undone, `undo ${i}`).toBe(true)
      held = back.next
    }
    expect(JSON.stringify(held.document)).toBe(started)
  })

  it('redoing every 段 lands byte-identically on the document the undos started from', () => {
    const one = bench()
    writeNames(one, 5)
    const afterWrites = one.json()

    let held = one.held
    for (let i = 1; i <= 5; i += 1) held = undoEdit(held).next
    for (let i = 1; i <= 5; i += 1) {
      const forward = redoEdit(held)
      expect(forward.redone, `redo ${i}`).toBe(true)
      held = forward.next
    }
    expect(JSON.stringify(held.document)).toBe(afterWrites)
  })

  it('S-94: the full round trip holds at the bound too -- S-94 undos, then S-94 redos', () => {
    const one = bench()
    writeNames(one, S_94 + 3)
    const afterWrites = one.json()

    let held = one.held
    for (let i = 1; i <= S_94; i += 1) {
      const back = undoEdit(held)
      expect(back.undone, `undo ${i} of ${S_94}`).toBe(true)
      held = back.next
    }
    for (let i = 1; i <= S_94; i += 1) {
      const forward = redoEdit(held)
      expect(forward.redone, `redo ${i} of ${S_94}`).toBe(true)
      held = forward.next
    }
    expect(JSON.stringify(held.document)).toBe(afterWrites)
  })
})
