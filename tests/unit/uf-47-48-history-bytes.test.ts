// Unit tests for the ONE LINE of UF-48 `frame-loop.ts` that turns the undo
// memory bound from the unit the specification states it in into the unit the
// history counts in (table T-075 of docs/spec/05-07-design.md; UF-47 / UF-48
// are `SingleHtmlShell`, CP-25 of table T-062).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNITS' BODIES (docs/development-rules/
// 04-verification.md §1 -- the one who wrote a unit does not write its test).
// What was read of `frame-loop.ts`: its head comment, its four exported
// declarations (`FrameEnvironment`, `FrameValues`, `FrameLoop`, `ScreenWiring`)
// and the one signature `frameLoop(surface, first, env, screen?): FrameLoop`.
// What was read of `edit-history.ts` (UF-4): its head comment, `HistoryLimits`,
// `EditHistory`, the signatures beside them, and the generated block at its
// foot. ⚠️ ONE HONEST EXCEPTION: while looking for that generated block the
// bodies of `historyWithStep` / `previousStep` / `nextStep` passed under the
// eye. NOTHING below is expected because of what they do -- every number comes
// from `docs/spec/_source/settings.json` or is computed from the document under
// test, and every behaviour from a requirement or a table row.
// ⚠️ A SECOND HONEST EXCEPTION, from the pass that added block D: searching
// `frame-loop.ts` for the factor showed the one line that holds it,
// `BYTES_PER_MEGABYTE`, and the comment above it. That line had to be found to
// be broken on purpose (below), and no expectation here is taken from it --
// every one of them is still derived from the manuscript, which is why the
// break could make a case fall at all.
//
// ⭐ WHY THIS FILE EXISTS -- the line no test could see.
// S-95 is stated in MEGABYTES and the history counts in BYTES, so somebody has
// to multiply. That somebody is the shell, and the multiplication was missing
// once already: the bound reached the history as 64 BYTES, one step of any real
// document blew straight past it, and the history was one step deep for every
// document ever opened -- 「もう一度 `Ctrl+Z` を押す —— 何も動かない」.
// Three test files stand next to that line and not one of them can see it:
//   - tests/unit/uf-8-9-history-depth.test.ts drives the write path with
//     `REAL_LIMITS` that the FILE ITSELF converts, so it holds the meaning of
//     the two rows and not the shell's arithmetic;
//   - tests/unit/uf-27-28-29.test.ts hands the write path `maxSteps: 1`;
//   - tests/unit/document-model.test.ts hands `EditHistory` a bound of 1000
//     bytes and never meets a document.
// Each one states the bound it wants. Nothing asked the SHELL what bound it
// makes -- `frameLoop` publishes neither the history nor its depth, so the only
// way to ask is from outside, in the application's own currency: write, undo,
// and count what came back. That is what this file does, and putting `64` back
// in place of the converted value has to fail here.
//
// ⭐ AND A WRONG MULTIPLICATION, NOT ONLY A MISSING ONE. 「1 MB = 1024 × 1024
// バイトとする」 names ONE of the two readings of 「MB」; the other one -- the SI
// megabyte of 1000 × 1000 bytes -- is 4.86 % smaller, and on the startup
// document that difference buys nothing: S-94 段 of it fit inside EITHER
// reading, so a shell that multiplied by 1000 × 1000 would keep exactly the
// same S-94 段 and blocks A-C would not notice. A bound is only observable
// where the two readings answer differently, so block D stands there: a
// document padded until 段 of it fill S-95, at a size where the mebibyte
// reading admits one more 段 than the SI reading does. ⛔ That size is not
// chosen by hand -- `FOIL_KEPT` and `FOIL_STEP_TARGET` compute it from S-94,
// S-95 and the two readings, so it follows the manuscript if the manuscript
// moves.
//
// The rules these cases answer to, all of them from docs/spec:
//   FR-031        「段数と合計メモリに上限を持ち、上限を超えたときは最も古い段
//                 から捨てること（MUST）。値は表 T-206 の `S-94` / `S-95`。
//                 1 段の大きさは、その段の文書を詰めた `GRS JSON`（字下げも改行
//                 も持たない形）へ直列化し、UTF-8 で符号化した長さ（バイト）で
//                 測ること（MUST）。」
//                 ⚠️ 「文字数で測ってはならない（MUST NOT）—— `S-95` はバイト
//                 の単位で書かれており、和文は 1 文字が 3 バイトになるので、
//                 文字数で測ると上限が 3 倍に緩む。」
//                 ⭐ 「取り消しの対象は表 T-027 に従うこと」, and the promise the
//                 whole file is about: 「直前の編集を取り消し、取り消した編集を
//                 やり直せるようにすること」
//   表 T-206 S-94 「取り消しの段数 | 50」
//   表 T-206 S-95 「取り消しの合計メモリ上限 | `64` MB」, whose own remark states
//                 the conversion in as many words: 「1 MB = 1024 × 1024 バイト
//                 とする」
//   表 T-027 UN-13 「文書全体の設定の変更 …… 基準日（`FR-046`。出す / 動かす /
//                 消すのいずれも）」 -- the 対象 every write below is
//   表 T-036 SK-20 「基準日線を出す / 消す」 `Ctrl` ＋ `Shift` ＋ `D`, and
//   表 T-036 SK-6  「元に戻す」 `Ctrl+Z` -- FR-070 makes the shell accept both,
//                 and they are the only entrance a test has to a shell that
//                 publishes no history
//   表 T-230 RD-1 取り消し: 「履歴 = 問う先が答えたものを据える」「刻印 = 入って
//                 きたまま」「取り消しの 1 段 = 積まない」 -- which is why an
//                 undone document may be compared byte for byte with the one it
//                 returns to
//   表 T-034 BT-4 the bundled template FR-027 keeps exactly one of -- the
//                 document the application actually boots, and the only
//                 document whose values the specification has decided
//   表 T-078 FT-1 「人の入力（ポインタとキー）」 reaches the loop over IF-2
//
// ⭐ WHERE THE VALUES COME FROM. 04-verification.md §2 asks that a test of a
// value the manuscript owns fail when the manuscript moves, so not one number
// the specification decides is typed here:
//   - S-94's 段数, S-95's number AND its unit word are read out of
//     docs/spec/_source/settings.json, which is the SSOT for table T-206
//     (`_assets/tbl-settings.md` is printed from it by `npm run gen`);
//   - the megabyte factor AND the unit word it converts are read out of S-95's
//     OWN remark -- 「1 MB = 1024 × 1024 バイトとする」 -- because THAT is the
//     sentence the shipped defect walked past. ⛔ NOT ONE CASE BELOW TYPES
//     `1024 * 1024` as an expected value: a test that did would agree with a
//     manuscript that had never said it, and would still agree after the
//     manuscript said something else. What the cases compare the shell against
//     is the parsed factor, and what proves the parse is that the shell's own
//     history has to come out at the depth it predicts;
//   - the two key assignments are read out of table T-036's 割当 column;
//   - one 段's size is computed from the document, never written down:
//     「その段の文書を詰めた `GRS JSON`（字下げも改行も持たない形）へ直列化し、
//     UTF-8 で符号化した長さ」 is `Buffer.byteLength(compact, 'utf8')`, and the
//     compact form is the saved form (PI-20 `jsonFromDocument`) with its
//     indentation and line breaks taken out;
//   - how many 段 a document may keep is derived from those two, never assumed;
//   - the SI megabyte (`SI_FACTOR`) is the ONE number here that the
//     specification does not decide, and it is never an expectation. It is a
//     foil, in exactly the sense `stepChars` is one: the reading S-95's remark
//     exists to rule out, named so that a case can stand where the two readings
//     part company and say which of them the shell applied.
// ⛔ The generated `NOT_STORED_LIMITS` is deliberately NOT used as the source of
// an expectation here. It carries S-95 in MB, which is the very value the shell
// has to convert -- a test that read the bound from there would be reading half
// of the line it is supposed to be watching.
//
// ⚠️ THE DOCUMENT IS THE BUNDLED ONE (BT-4), read through the real decoder.
// A small fixture cannot show the defect: its compact form is small enough that
// 64 bytes and 64 MB keep the same number of 段. The startup document's compact
// form is ~640 KiB, so ONE step already exceeds S-95 read as a bare number --
// which is exactly why the shipped history was one step deep.
//
// ⭐ THE CASES WERE CHECKED AGAINST BOTH DEFECTS THEY EXIST FOR, by breaking
// the shell on purpose, running this file, and putting the shell straight back
// (04-verification.md §4.2). The one line broken both times is the factor the
// shell converts S-95 with, `BYTES_PER_MEGABYTE` of `frame-loop.ts`:
//   - THE CONVERSION DROPPED (factor set to 1, so the bound reaches the history
//     as the bare number 64). All five shell-driven cases fell, the first of
//     them with 「undo 2 of 50」 -- which is the report the shipped defect
//     arrived as.
//   - THE WRONG READING OF THE SAME UNIT (factor changed to 1000 × 1000, the SI
//     megabyte). ⛔ Blocks A, B and C ALL STAYED GREEN, and only block D fell,
//     with 「expected 19 to be 20」. That green is the hole block D exists to
//     close: a bound stated in one unit and applied in another is invisible
//     everywhere except where the two units disagree, and until block D was
//     written this file could not tell the two factors apart.
// After each break the file was restored and compared byte for byte with the
// copy taken before it. Block D's own premise case was checked the same way,
// from this side: padding the document to a quarter of the size it wants makes
// the two readings agree and D fails with 「expected 50 to be greater than 50」,
// and padding it to sit exactly on the boundary fails D's margin assertion.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, because nothing in docs/spec decides it:
//   - what happens when ONE step alone is larger than S-95. FR-031 says to drop
//     the oldest 段 while the bound is passed and does not say whether the last
//     one standing is dropped too, so no case goes there;
//   - the exact instant or writer a shell-made write stamps (FR-063 and table
//     T-229 own those, and tests/unit/uf-48-input.test.ts holds them);
//   - anything a frame draws. No case below runs an animation frame: the frame
//     queue exists only so that the loop has one to ask.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type {
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { SvgSurface } from '../../src/adapter/svg-renderer/svg-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// 1. The manuscript, read at read time rather than copied.
// ---------------------------------------------------------------------------

interface ManuscriptFigure {
  readonly num?: string
  readonly suffix?: string
}

interface ManuscriptRow {
  readonly id?: string
  readonly default?: ManuscriptFigure
  readonly value?: ManuscriptFigure
  readonly note?: { readonly ja?: string }
}

const SETTINGS_MANUSCRIPT = join(process.cwd(), 'docs', 'spec', '_source', 'settings.json')

const manuscriptRow = (id: string): ManuscriptRow => {
  const manuscript = JSON.parse(readFileSync(SETTINGS_MANUSCRIPT, 'utf8')) as {
    blocks?: { rows?: ManuscriptRow[] }[]
  }
  for (const block of manuscript.blocks ?? []) {
    for (const row of block.rows ?? []) {
      if (row.id === id) return row
    }
  }
  throw new Error(`docs/spec/_source/settings.json has no row ${id}`)
}

const figureOf = (row: ManuscriptRow): ManuscriptFigure => {
  const figure = row.default ?? row.value
  if (figure === undefined || figure.num === undefined) {
    throw new Error(`row ${row.id ?? '?'} of the settings manuscript states no default`)
  }
  return figure
}

const S_94_ROW = manuscriptRow('S-94')
const S_95_ROW = manuscriptRow('S-95')

/** S-94 -- 「取り消しの段数」. The N every case below writes and undoes. */
const S_94 = Number.parseInt(figureOf(S_94_ROW).num ?? '', 10)

/** S-95 -- 「取り消しの合計メモリ上限」, the number and the unit word beside it. */
const S_95_NUMBER = Number.parseInt(figureOf(S_95_ROW).num ?? '', 10)
const S_95_UNIT = (figureOf(S_95_ROW).suffix ?? '').trim()

/** A unit word and what one of it is worth in bytes, as a sentence states it. */
interface StatedUnit {
  readonly word: string
  readonly bytes: number
}

/**
 * S-95's own remark: 「1 MB = 1024 × 1024 バイトとする」.
 *
 * ⭐ Parsed rather than assumed, and the UNIT WORD is parsed beside the figure.
 * This one sentence is the whole subject of the file: it is what the shell has
 * to do to S-95 before the history may compare against it, and it is what the
 * shipped defect walked past. Taking the word out of the same sentence lets a
 * case ask whether the row is still stated in the unit its remark converts,
 * without typing either of them.
 */
const megabyteStatedIn = (sentence: string): StatedUnit => {
  const said = /1\s*([A-Za-z]+)\s*=\s*(\d+)\s*×\s*(\d+)\s*バイト/.exec(sentence)
  if (said === null) {
    throw new Error(`this sentence no longer states what one MB is: ${sentence}`)
  }
  return {
    word: said[1] ?? '',
    bytes: Number.parseInt(said[2] ?? '', 10) * Number.parseInt(said[3] ?? '', 10),
  }
}

const S_95_MEGABYTE = megabyteStatedIn(S_95_ROW.note?.ja ?? '')
const MB_FACTOR = S_95_MEGABYTE.bytes

/** S-95, converted the way S-95 itself says to convert it. */
const S_95_BYTES = S_95_NUMBER * MB_FACTOR

/**
 * The OTHER reading of the same unit word: the SI megabyte of 1000 × 1000
 * bytes.
 *
 * ⛔ Never an expectation, and the one number in this file the specification
 * does not decide -- it is a foil in the same sense `stepChars` below is one.
 * S-95's remark exists precisely because 「MB」 can be read two ways, and a
 * bound applied in the wrong one is invisible until a document is large enough
 * for the two readings to keep a different number of 段. Block D is put where
 * they do.
 */
const SI_FACTOR = 1000 * 1000
const S_95_SI_BYTES = S_95_NUMBER * SI_FACTOR

/**
 * One row of table T-036, as the manuscript spells its assignment.
 *
 * ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
 * be driven by that table, so the two keys these cases press are read out of it
 * rather than typed: `Ctrl` ＋ `Shift` ＋ `D` and `Ctrl+Z` are one spelling
 * apart, and `KeyInput.key` is documented to use the table's own column.
 */
function keyOf(row: string): KeyInput {
  const found = specTable('T-036').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  const assignment = (found.by['割当'] ?? '').split('/')[0] ?? ''
  const parts = assignment
    .replace(/`/g, '')
    .replace(/＋/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${row} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: {
      ctrl: named('Ctrl'),
      shift: named('Shift'),
      alt: named('Alt'),
      meta: named('Cmd'),
    } satisfies InputModifiers,
  }
}

/** SK-20 -- 「基準日線を出す / 消す」, the 対象 (UN-13) every write below is. */
const SK_20 = keyOf('SK-20')
/** SK-6 -- 「元に戻す」. */
const SK_6 = keyOf('SK-6')

// ---------------------------------------------------------------------------
// 2. FR-031's measure of one 段, computed from the document.
// ---------------------------------------------------------------------------

/**
 * 「その段の文書を詰めた `GRS JSON`（字下げも改行も持たない形）へ直列化し」.
 *
 * ⭐ Built out of the saved form rather than out of the in-memory object, so
 * that this is the GRS JSON of the document and not some other JSON of it:
 * `jsonFromDocument` (PI-20) writes the GRS JSON, and re-printing what it wrote
 * with no separators is that same JSON 「字下げも改行も持たない形」.
 */
const compactGrsJson = (document: Document): string =>
  JSON.stringify(JSON.parse(jsonFromDocument(document)))

/** FR-031's measure: 「UTF-8 で符号化した長さ（バイト）」. */
const stepBytes = (document: Document): number =>
  Buffer.byteLength(compactGrsJson(document), 'utf8')

/**
 * The measure FR-031 forbids: 「文字数で測ってはならない（MUST NOT）」.
 *
 * ⛔ Never an expectation -- only ever what a wrong shell WOULD have kept, so
 * that a case can state that the answer is not that one.
 */
const stepChars = (document: Document): number => compactGrsJson(document).length

/**
 * How many 段 a history may keep for a document of this size, by FR-031:
 * 「段数と合計メモリに上限を持ち、上限を超えたときは最も古い段から捨てる」.
 */
const stepsThatFit = (sizeOfOneStep: number, bound: number): number =>
  Math.min(S_94, Math.floor(bound / sizeOfOneStep))

/**
 * The number of 段 block D is put at: the largest depth at which the whole
 * distance between the two readings of S-95 is available to stand in.
 *
 * ⭐ WHY A SEARCH AND NOT A NUMBER. A step of size `s` leaves the mebibyte
 * reading keeping `k` 段 while `s` is in `(S_95_BYTES / (k + 1), S_95_BYTES /
 * k]`, and leaves the SI reading keeping fewer while `s > S_95_SI_BYTES / k`.
 * Deep histories have those two windows barely overlap; shallow ones have the
 * first window swallow the second, so the whole 4.86 % between the readings is
 * room to stand in. This walks down from just under S-94 -- so that S-95 and
 * not S-94 is the bound that decides -- to the deepest place where that is
 * still true.
 */
const FOIL_KEPT = (() => {
  let kept = S_94 - 1
  while (kept > 2 && S_95_SI_BYTES / kept < S_95_BYTES / (kept + 1)) kept -= 1
  return kept
})()

/**
 * The size one 段 has to be for `FOIL_KEPT` of them to fill S-95 read as
 * mebibytes while one fewer fills S-95 read as SI megabytes: the middle of the
 * two, so that a few bytes of difference between the size this file measures
 * and the size the shell measures cannot move either answer.
 */
const FOIL_STEP_TARGET = Math.sqrt(S_95_BYTES * S_95_SI_BYTES) / FOIL_KEPT

// ---------------------------------------------------------------------------
// 3. The document. BT-4 of table T-034, through the real decoder.
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE_TEXT = readFileSync(TEMPLATE_PATH, 'utf8')

function documentOf(text: string): Document {
  const read = documentFromJson(text)
  if (!read.ok) throw new Error(`not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

/** The document the application boots. */
const START = documentOf(TEMPLATE_TEXT)
const START_STEP_BYTES = stepBytes(START)

/**
 * One CJK character, which FR-031's MUST NOT is about: 「和文は 1 文字が 3 バイト
 * になるので、文字数で測ると上限が 3 倍に緩む」.
 */
const CJK = '漢'
const CJK_BYTES = Buffer.byteLength(CJK, 'utf8')

/**
 * The startup document with one Task's `notes` filled with CJK text until one
 * 段 of it is about `target` bytes, so that S-95 and not S-94 is the bound that
 * binds and so that a case may be stood at a size it names.
 *
 * ⚠️ `notes` is a Task's own column (AT-32 of table T-058) and carries no rule
 * about its length, so a long one changes nothing but the size of the document
 * -- which is the one property these cases are about.
 * ⚠️ The size that follows is APPROXIMATE, and no case trusts it: every case
 * measures the document it was handed. What the target has to do is land the
 * document in the window its block needs, and the first case of each block
 * says that it did.
 */
const paddedTo = (target: number): Document => {
  const filler = Math.ceil((target - START_STEP_BYTES) / CJK_BYTES)
  if (filler <= 0) throw new Error(`the startup document is already larger than ${target} bytes`)
  const draft = JSON.parse(TEMPLATE_TEXT) as {
    schedule: { tasks: { notes: string | null }[] }
  }
  const first = draft.schedule.tasks[0]
  if (first === undefined) throw new Error('the bundled template has no Task to write notes on')
  first.notes = CJK.repeat(filler)
  return documentOf(JSON.stringify(draft))
}

/**
 * Block C's document: sized so that the two readings of FR-031's MEASURE --
 * bytes and 文字数 -- keep a DIFFERENT number of 段.
 *
 * ⭐ The target is a step of about `S-95 ÷ 10.5`, which puts the answer halfway
 * between two whole numbers of steps: the compact GRS JSON this file computes
 * and the one the shell computes may differ by a few tenths of a percent
 * without moving the number of 段 either of them admits.
 */
const PADDED = paddedTo(S_95_BYTES / 10.5)

/**
 * Block D's document: sized so that the two readings of S-95's UNIT keep a
 * different number of 段 -- `FOIL_KEPT` of it fit inside S-95 read the way its
 * own remark says, and one fewer fits inside S-95 read as SI megabytes.
 */
const UNIT_FOIL = paddedTo(FOIL_STEP_TARGET)

// ---------------------------------------------------------------------------
// 4. The host UF-48 is given.
// ---------------------------------------------------------------------------

/**
 * BO-1 of table T-077 has already settled these by the time a frame loop
 * exists. FR-051 keeps the last two out of the settings because they differ
 * from one machine to the next.
 */
const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Waiting {
  (time: number): void
}

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame

/**
 * Vitest runs under node (vitest.config.ts), where there is no
 * `requestAnimationFrame` for the loop to ask. Each case installs one that
 * collects and never runs: FT-1 reaches the document before any frame does, and
 * nothing below looks at a drawing.
 */
function host(): SvgSurface {
  const waiting: Waiting[] = []
  ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (
    callback: Waiting,
  ): number => waiting.push(callback)
  return { showSvg: () => {} }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  else (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
})

/** FR-046's own column, and the only one SK-20 moves. */
const baseDateOf = (document: Document): string | null => document.schedule.project.statusDate

interface Driven {
  readonly loop: FrameLoop
  /** The base date after the start and after each write, oldest first. */
  readonly seen: (string | null)[]
}

/**
 * `writes` real writes through the real shell, each one SK-20 -- 「基準日線を
 * 出す / 消す」, which UN-13 of table T-027 makes a 対象 either way round.
 *
 * ⚠️ Nothing is handed in but the document: the bounds the history is held to
 * are the shell's own, which is the whole point of the file.
 */
function drive(first: Document, writes: number): Driven {
  const loop = frameLoop(host(), first, SCREEN)
  const seen: (string | null)[] = [baseDateOf(loop.document())]
  for (let i = 1; i <= writes; i += 1) {
    loop.receiveInput(SK_20)
    const now = baseDateOf(loop.document())
    if (now === seen[seen.length - 1]) {
      throw new Error(`write ${i} of ${writes} moved nothing, so it left no 段 to undo`)
    }
    seen.push(now)
  }
  return { loop, seen }
}

/**
 * How many 段 the history really holds, asked in the only currency the shell
 * publishes: press SK-6 until the document stops moving.
 *
 * ⚠️ Bounded well above S-94, so a loop that answered every undo would end the
 * case rather than run for ever.
 */
function undoWhileItMoves(loop: FrameLoop): number {
  let moved = 0
  let before = baseDateOf(loop.document())
  for (let i = 0; i < S_94 * 2 + 8; i += 1) {
    loop.receiveInput(SK_6)
    const after = baseDateOf(loop.document())
    if (after === before) return moved
    moved += 1
    before = after
  }
  throw new Error(`the shell undid more than ${S_94 * 2 + 8} times, so the history has no bound`)
}

// ===========================================================================
// A. The two values, and the conversion S-95 states in as many words.
// ===========================================================================

describe('表 T-206 -- the two rows FR-031 says the bounds are', () => {
  it('GIVEN the settings manuscript WHEN S-94 and S-95 are read THEN the printed table T-206 states the same two figures and the same conversion', () => {
    // ⭐ The manuscript is the SSOT and `_assets/tbl-settings.md` is printed
    // from it, so a test may read either -- but only if the two agree. This is
    // the case that says they do, so every case below may quote the row IDs.
    const row = (id: string): { readonly by: Readonly<Record<string, string>> } => {
      const found = specTable('T-206').rows.find((one) => one.id === id)
      if (found === undefined) throw new Error(`table T-206 has no row ${id}`)
      return found
    }
    const printed = (id: string): string => row(id).by['既定'] ?? ''
    expect(Number.parseInt(bare(printed('S-94')), 10)).toBe(S_94)
    expect(printed('S-95')).toContain(`\`${S_95_NUMBER}\``)
    expect(printed('S-95')).toContain(S_95_UNIT)

    // ⭐ AND the sentence this whole file turns on: 「1 MB = 1024 × 1024 バイト
    // とする」 has to reach the printed table saying the same thing, because the
    // conversion is a fact about the row and not about the manuscript's
    // formatting. ⛔ Neither side is compared against a typed factor -- they are
    // compared against each other.
    const printedRemark = megabyteStatedIn(row('S-95').by['保存しない理由'] ?? '')
    expect(printedRemark.bytes).toBe(MB_FACTOR)
    expect(printedRemark.word).toBe(S_95_MEGABYTE.word)
  })

  it('GIVEN the bundled startup document WHEN one 段 is measured THEN it alone exceeds S-95 read as a bare number, and S-94 of them still fit inside S-95 converted', () => {
    // ⭐ The premise the next block stands on, both halves of it. One step of
    // the real document is hundreds of thousands of bytes, so a shell that
    // forgot the conversion cannot keep two 段; and S-94 of them still fit
    // inside the converted bound, so S-94 -- not S-95 -- is what decides the
    // depth of a real history.
    expect(START_STEP_BYTES).toBeGreaterThan(S_95_NUMBER)
    expect(S_94 * START_STEP_BYTES).toBeLessThanOrEqual(S_95_BYTES)
    expect(stepsThatFit(START_STEP_BYTES, S_95_BYTES)).toBe(S_94)
  })
})

// ===========================================================================
// B. The shell's own bound, asked through the shell.
//    FR-031: 「直前の編集を取り消し、取り消した編集をやり直せるようにすること。
//    段数と合計メモリに上限を持ち」
// ===========================================================================

describe('FR-031 / S-94 / S-95 -- the bound the REAL shell holds the REAL startup document to', () => {
  it('GIVEN the real shell holding the startup document WHEN S-94 changes are written THEN S-94 undos each walk one 段 back', () => {
    // ⛔ THE CASE THE MISSING CONVERSION FAILS. With S-95 handed over as the
    // bare number the row prints, one step of this document is already past the
    // bound, every write drops what came before it, and the second undo moves
    // nothing -- 「もう一度 `Ctrl+Z` を押す —— 何も動かない」. With S-95
    // converted the way its own remark says, S-94 段 fit (block A pins that),
    // and all S-94 of them come back.
    const { loop, seen } = drive(START, S_94)

    for (let undone = 1; undone <= S_94; undone += 1) {
      loop.receiveInput(SK_6)
      expect(baseDateOf(loop.document()), `undo ${undone} of ${S_94}`).toBe(seen[S_94 - undone])
    }
  })

  it('GIVEN S-94 changes written through the real shell WHEN every 段 is undone THEN the document is byte-identical to the one the writes started from', () => {
    // 「直前の編集を取り消し」 all the way back, and RD-1 of table T-230 makes
    // the comparison a byte-for-byte one: 「刻印 = 入ってきたまま」, so the
    // document that comes back carries the stamp it left with.
    const { loop } = drive(START, S_94)
    for (let undone = 1; undone <= S_94; undone += 1) loop.receiveInput(SK_6)

    expect(compactGrsJson(loop.document())).toBe(compactGrsJson(START))
  })

  it('GIVEN the real shell WHEN more changes are written than S-94 THEN exactly S-94 段 are left to undo', () => {
    // 「上限を超えたときは最も古い段から捨てること（MUST）」 -- S-94 is the
    // bound that binds for this document (block A), so the oldest three go and
    // the count stops at S-94. ⚠️ This is the half that fails if the conversion
    // is ever made too generous as well as the half that fails if it is
    // dropped: a bound of 64 bytes keeps 1, and no bound at all keeps S-94 + 3.
    const { loop } = drive(START, S_94 + 3)
    expect(undoWhileItMoves(loop)).toBe(S_94)
  })
})

// ===========================================================================
// C. FR-031's MUST NOT: 「文字数で測ってはならない」.
// ===========================================================================

describe('FR-031 -- 1 段 is measured in bytes, and never in 文字数', () => {
  it('GIVEN a document whose text is CJK WHEN its compact GRS JSON is measured both ways THEN the byte length and the character length admit a different number of 段', () => {
    // ⭐ The premise that makes the next case discriminating, and FR-031's own
    // reason for the MUST NOT: 「和文は 1 文字が 3 バイトになるので、文字数で
    // 測ると上限が 3 倍に緩む」.
    expect(CJK_BYTES).toBe(3)
    expect(stepBytes(PADDED)).toBeGreaterThan(stepChars(PADDED))
    expect(stepsThatFit(stepBytes(PADDED), S_95_BYTES)).toBeLessThan(
      stepsThatFit(stepChars(PADDED), S_95_BYTES),
    )
    // Both readings have to bite before S-94 does, or the case would be
    // measuring S-94 and not the memory bound at all.
    expect(stepsThatFit(stepChars(PADDED), S_95_BYTES)).toBeLessThan(S_94)
  })

  it('GIVEN the real shell holding a document of CJK text WHEN more changes are written than either measure admits THEN the 段 that survive are the byte count, not the character count', () => {
    // 「1 段の大きさは …… UTF-8 で符号化した長さ（バイト）で測ること（MUST）。
    // 文字数で測ってはならない（MUST NOT）」. A shell that measured 文字数
    // would keep three times as many 段 of this document, and the specification
    // says what that costs: 「上限が 3 倍に緩む」.
    const byBytes = stepsThatFit(stepBytes(PADDED), S_95_BYTES)
    const byCharacters = stepsThatFit(stepChars(PADDED), S_95_BYTES)

    const { loop } = drive(PADDED, byCharacters + 3)
    const kept = undoWhileItMoves(loop)

    expect(kept).toBe(byBytes)
    expect(kept).not.toBe(byCharacters)
  }, 300_000)
})

// ===========================================================================
// D. S-95's UNIT: 「1 MB = 1024 × 1024 バイトとする」.
//    Blocks A-C are all satisfied by a shell that multiplies by 1000 × 1000,
//    because the documents they use keep the same number of 段 under either
//    reading. These two stand where the readings part company.
// ===========================================================================

describe('表 T-206 S-95 -- which reading of 「MB」 the shell actually applied', () => {
  it('GIVEN the document padded to the size the two readings disagree about WHEN one 段 is measured THEN S-95 read as its remark says admits more 段 than S-95 read as SI megabytes, and both stop short of S-94', () => {
    // ⭐ The premise the next case stands on, and the reason it can see what
    // blocks A-C cannot. ⛔ If this one fails the next one proves nothing: it
    // would be asking a question both readings answer the same way.
    // First, that the row is still stated in the unit its own remark converts
    // -- 「1 MB = ...」 and 「`64` MB」 have to be the same MB, or there is no
    // conversion to watch.
    expect(S_95_UNIT).toBe(S_95_MEGABYTE.word)

    const size = stepBytes(UNIT_FOIL)
    const byMebibyte = stepsThatFit(size, S_95_BYTES)
    const bySiMegabyte = stepsThatFit(size, S_95_SI_BYTES)

    expect(byMebibyte).toBeGreaterThan(bySiMegabyte)
    // 「上限を超えたときは最も古い段から捨てること」 -- S-95 has to be the bound
    // that decides here, or the case would be measuring S-94 again.
    expect(byMebibyte).toBeLessThan(S_94)
    // and the shallower reading still keeps a real history, so the difference
    // between them is not the undecided case FR-031 says nothing about (one 段
    // alone larger than the bound).
    expect(bySiMegabyte).toBeGreaterThan(1)

    // ⭐ AND IT SITS BETWEEN THE TWO WITH ROOM TO SPARE. The shell measures its
    // own 段 and this file measures these; the two differ by the handful of
    // bytes a stamp weighs, and that must not be able to move the answer.
    const toSiEdge = size - S_95_SI_BYTES / byMebibyte
    const toMebibyteEdge = S_95_BYTES / byMebibyte - size
    expect(Math.min(toSiEdge, toMebibyteEdge) / size).toBeGreaterThan(0.01)
  })

  it('GIVEN the real shell holding that document WHEN more changes are written than either reading admits THEN the 段 that survive are S-95 converted the way its own remark converts it, and not the SI reading', () => {
    // 「値は表 T-206 の `S-94` / `S-95`」, and S-95 is written in a unit the
    // history does not count in. This is the case a WRONG multiplication fails:
    // a shell that used 1000 × 1000 keeps `bySiMegabyte` 段 of this document,
    // one fewer than the remark's own factor allows, and nothing else in this
    // file can tell the two apart.
    const size = stepBytes(UNIT_FOIL)
    const byMebibyte = stepsThatFit(size, S_95_BYTES)
    const bySiMegabyte = stepsThatFit(size, S_95_SI_BYTES)

    const { loop } = drive(UNIT_FOIL, byMebibyte + 3)
    const kept = undoWhileItMoves(loop)

    expect(kept).toBe(byMebibyte)
    expect(kept).not.toBe(bySiMegabyte)
  }, 300_000)
})
