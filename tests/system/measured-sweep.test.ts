// One sweep over the ledger rows that sat at `実測待ち` -- green in the
// automated tests, never pressed out of the shipped build. Twenty-three rows
// were handed to this file; nineteen of them are held down here, and the four
// that are not say why in prose below.
//
//   D-24   a fit throws the folds away, and what it lands on fits
//   D-43   double-clicking a task opens the panel with the name field ready
//   D-52   the written picture carries no trace of what was selected
//   D-65   the header's time is written small, and in the reader's own clock
//   D-66   a second save writes again, and asks no second time where to
//   D-82   nothing stands in front of a colour control showing its value
//   D-91   the weekday tier is ticked exactly where the day tier is
//   D-92   the ruler band keeps its height and divides it evenly
//   D-97   the save key writes GRS JSON, and the second press asks nothing
//   D-98   with no file open, the reload key does nothing
//   D-103  the minimise entrance rides the palette's grab band, not a group
//   D-105  a help item reads shape, description, assignment -- at S-203
//   D-106  the words a tooltip puts up are drawn at S-204
//   D-126  the file's name stands above the time it was written
//   D-130  a value settled in the panel reaches the document
//   D-152  settling the same value twice writes nothing
//   D-166  the reason a row gives for refusing is the reason that row holds
//   D-210  a click on the month tier lands on the end of the month
//   D-220  a picture too tall to draw is refused, and the other formats write
//
// ⭐ FIVE MORE ROWS WERE ADDED WITH CR-344, and they are of a different kind:
// four of them are lines that landed in the specification on 2026-09-03, and
// the fifth is a MUST that has stood for weeks with nobody asserting it. Every
// one of them was found by a person pressing the shipped build while 6,009 unit
// cases, 23 System cases and 32 machine checks were green.
//
//   D-232  a task drawn on empty ground leaves a name field under the keyboard
//          (found here; the case since MOVED -- see "D-232" in the prose below)
//   D-233  the settings surface prints dictionary words, and no raw identifier
//   D-234  an added row is brought into view, not just the field that names it
//   D-235  the bound document names the language the screen is in
//   D-236  one sheet per reason, counted up, with no ceiling on the sheets
//
// ⛔ FIVE ROWS ARE NOT HELD HERE. Four of them are the finding rather than a
// gap; the fifth, D-232, is a different shape -- it WAS held here, and moved.
//
//   D-15 asks that `FD-6` (table T-012a) and `IV-12` (table T-220) count the
//   same days. `FD-6` is a truncation rule and `IV-12` is an invariant; ⛔ the
//   shipped build puts NEITHER on the screen. Measured 2026-09-03: typing 999
//   into the fade field of `PR-14` on a task running 2026-05-01..2027-03-31
//   and settling it reads back 999 -- the panel reports what was typed, not
//   what `FD-6` truncated it to, and no requirement says it should. No notice
//   is raised either: `IV-12` is checked where nothing draws. ⇒ The agreement
//   this row is about can only be watched at the seam, which is where
//   `tests/contract/fd-6-iv-12-the-fade-span.contract.test.ts` already
//   watches it. A System case here would have to read the truncated span back
//   out of the drawing's geometry, and no row of the specification says the
//   drawn fade edge is the truncated value.
//
//   D-124 asks that a document handed at start-up which cannot be read raises
//   `RS-26` of table T-233. ⛔ The shipped build has no way to be handed one:
//   opened as a file, nothing hands it a document, so `OP-14` of table T-024a
//   is never reached and `RS-26`'s words are never printed. The ledger row
//   says the same in its own 実物確認 column. What would make it measurable is
//   a start-up route that hands a document in -- `BT-2` of table T-034 -- and
//   that route is not wired in this build.
//
//   D-202 asks that the application, when the body that runs the screen cannot
//   be found inside the file it is running from, says `RS-45` of table T-233
//   rather than `RS-42` (both are sourced to `FR-102`). ⛔ The shipped build has
//   no route to that fault. Measured 2026-09-03: the deliverable carries
//   exactly one `<script>` -- inline, no id, 1,105,353 characters -- and taking
//   it out of the document after it has run, then writing a single `.html`
//   (`IO-7` of table T-024), writes 2,001,354 characters, the same count as a
//   run that left it in place, and raises no notice at all. ⇒ What the build
//   writes its own body out of is not the element standing in the document, so
//   no press from outside can make it missing. A System case here could only
//   assert that the normal route succeeds, which is not what the row is about.
//
//   D-211 asks that a highlight box whose `startDate` is after its `endDate`,
//   or whose `topGroupId` is below its `bottomGroupId`, is refused -- `IV-19`
//   of table T-220. ⛔ Nothing that can be pressed reaches it. The row is one of
//   the document invariants, and Chapter 6.1 gives that table exactly one
//   driver: 「`scheduleViolations`（表 T-064 の `PI-1`）は本表を駆動して回ること
//   （MUST）」 -- a seam function, and no requirement puts its answer on a
//   screen. The one refusal a reader is shown for a badly shaped document is
//   `RS-25` of table T-233, which the same chapter hands to the GENERATED
//   SCHEMA, and that schema is forbidden a condition over more than one column
//   (「1 つの列だけで決まる条件を本表に書いてはならない（MUST NOT）」, read the
//   other way round); `IV-19` is over four columns. `FR-019` closes the other
//   door: values that came from a drag are normalised on release and can never
//   break the row, and table T-016 gives the Properties Panel no row for a
//   box's dates, so there is nothing to type either. ⇒ The seam is where this
//   agreement can be watched, and
//   `tests/contract/document-invariants.contract.test.ts` already watches it.
//
//   D-232 asks that a name can be typed the moment a task is drawn. This file
//   DID measure it (144x28px polygon count +1, typable-field count staying 0,
//   Properties Panel `display:none`, focus on `BODY`) and DID write a case for
//   it, and the case could not be made to pass: `FR-091` (MUST) has the field,
//   but nothing anywhere makes a just-drawn task the selection
//   `showPropertiesOfChoice()` needs to advance past, and that missing line is
//   ledger row D-228, still `裁定待ち`. Rule 05's "止まるときは緑で止まる" means a
//   case that cannot pass belongs to `tests/system/open-defect-pins.test.ts`'s
//   `PINNED` / `test.fail()` machinery and not to a plain assertion left red in
//   this file, so the case moved there. It stays in `HELD` just below: this
//   file still measured the row and still stands behind why it is
//   `裁定待ち`; `HELD`'s own gate only checks that the row is still in the
//   ledger, not that the case still lives in this file.
//
// ⛔ ONE HALF OF D-66 IS ALSO NOT SETTLED HERE, and it is named at that case:
// the run below writes through a REPLACED host save dialogue, so it proves
// what the application does once it holds a handle. It does not prove that the
// real dialogue's handle is accepted -- telling those apart means reading
// `src/`, which rule 04 section 1 forbids the writer of a test.
//
// ⛔ NO `swsCase` IS DECLARED HERE, for the reason
// `tests/system/user-reported-fixes.test.ts` gives: table T-219 (row TW-2) has
// Chapter 9's cases GENERATED from those declarations and hung from a
// `SWS-xxx` node of Chapter 6.1, and not one of `SWS-1`..`SWS-8` is about a
// header stamp, a tooltip's size, or where a minimise entrance stands. The
// rows each case leans on are quoted in prose at the case instead.
//
// ⭐ WHAT IS PRESSED IS THE SHIPPED BUILD -- `dist/index.html`, opened over
// `file:`, not the dev server the other two System files use. Rule 04 section
// 3 is about the running application, and the ledger's `実測待ち` means
// precisely "not yet pressed out of the deliverable".
//
// ⭐ ONE BROWSER, AND ALMOST ONE PAGE. Every case below shares one browser.
// Fourteen of them share one page as well, in an order that puts the ones which
// disturb the document last: reading cases, then the panel, then the rename,
// then the zoom, then the notice, then the ruler, then the fit. ⛔ SIX CASES
// CANNOT SHARE THAT PAGE. The clock a page reads, the host dialogue it calls
// and the size of the screen are all fixed when the context is made, so D-52,
// D-65's second half, D-66, D-97 and D-220 each run on a further context of the
// SAME browser, one fresh page each; D-210 takes one as well because it makes
// four tasks of its own and a fresh document is cheaper than putting them back.
// A browser launch costs a second or two and this file pays it once.
//
// ⭐ EVERY NUMBER ASSERTED IS READ OUT OF `docs/spec` AT READ TIME -- the three
// text-size coefficients, the tooltip's wait, the keys the help prints, the
// words a refusal carries. Nothing here is a number copied off a running
// screen. Chapter 1.9 (`:275`) asks that of a test driven by a table.
//
// ⭐ EACH CASE SAYS WHAT WOULD MAKE IT GO RED, in the sentence above its body.

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

// ---------------------------------------------------------------------------
// What the specification says, read at read time
// ---------------------------------------------------------------------------

const T016: SpecTable = specTable('T-016')
const T024: SpecTable = specTable('T-024')
const T025: SpecTable = specTable('T-025')
const T036: SpecTable = specTable('T-036')
const T109: SpecTable = specTable('T-109')
const T201: SpecTable = specTable('T-201')
const T204: SpecTable = specTable('T-204')
const T206: SpecTable = specTable('T-206')
const T212: SpecTable = specTable('T-212')
const T233: SpecTable = specTable('T-233')

/**
 * One cell of a row, taken by position, with the table's shape guarded.
 *
 * ⭐ By position and not by heading, for the reason `tests/system/sws-case.ts`
 * gives for `lastCellOf`: the headings are Japanese and rule 03 section 5 keeps
 * this tree ASCII. A caller reading a column other than the last guards the
 * column count itself, which is what `columns` is for -- so a table that grows
 * or loses a column fails loudly here rather than asserting the wrong cell.
 *
 * @purity pure
 */
function cellOf(table: SpecTable, rowId: string, column: number, columns: number): string {
  const row = rowOf(table, rowId)
  if (row.cells.length !== columns) {
    throw new Error(
      `table ${table.id} row ${rowId} has ${row.cells.length} cells after the row ID, not the ` +
        `${columns} this file reads by position -- a column was added or taken away`,
    )
  }
  return row.cells[column] ?? ''
}

/** The first number written in a cell. @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

/** Columns of table T-206 after the row ID: value, default, why it is not saved. */
const T206_COLUMNS = 3
const T206_DEFAULT = 1

/** Columns of table T-212 after the row ID: name, value, floor, ceiling, note. */
const T212_COLUMNS = 5
const T212_VALUE = 1

/** Columns of table T-036 after the row ID: what it does, the assignment, the shape. */
const T036_COLUMNS = 3
const T036_ASSIGNMENT = 1

/** Columns of table T-016 after the row ID: column, input kind, subject, note, MSPDI. */
const T016_COLUMNS = 5
const T016_INPUT_KIND = 1

/** Columns of table T-109 after the row ID: surface, group, what it opens, source, arming. */
const T109_COLUMNS = 5
const T109_PURPOSE = 2
const T109_SOURCE = 3

/** Columns of table T-233 after the row ID: the situation, the manner, the source. */
const T233_COLUMNS = 3
const T233_SITUATION = 0

/**
 * Columns of table T-024 after the row ID: the format, which way it goes, the
 * file's ending, the first character a reader sees, what it is for, the note.
 */
const T024_COLUMNS = 6
const T024_ENDING = 2
const T024_FIRST_CHARACTER = 3

/** Columns of table T-204 after the row ID: key, type, default, meaning. */
const T204_COLUMNS = 4
const T204_DEFAULT = 2

/**
 * Columns of table T-201 after the row ID: the group, the key, the unit, the
 * default, the floor, the ceiling, the note.
 */
const T201_COLUMNS = 7
const T201_DEFAULT = 3

/**
 * `S-37` (`rowTitleIndent`) of table T-201, 「行見出しの字下げ。1 段深くなるごと
 * にこの幅だけ字下げする」（利用者の裁定 2026-09-01）, which `FR-085` (MUST) also
 * subtracts from the width a name is cut against.
 *
 * ⛔ READ, NEVER WRITTEN DOWN. The row moved from 12 to 16 on 2026-09-01, and a
 * case holding either number would have gone red for the manuscript changing
 * rather than for the product moving.
 */
const ROW_INDENT = numberIn(cellOf(T201, 'S-37', T201_DEFAULT, T201_COLUMNS), 'T-201 S-37')

/**
 * `S-81` of table T-204: the size a picture is written at. `FR-025` (MUST) has
 * the WIDTH fixed here and the height stretch until the drawing is in, so the
 * number this file reads off the cell is the width -- the first of the two.
 */
const EXPORT_WIDTH = numberIn(cellOf(T204, 'S-81', T204_DEFAULT, T204_COLUMNS), 'T-204 S-81')

/**
 * `S-217` of table T-204: how far that height may stretch. `FR-025` (MUST) has
 * a picture that does not fit inside it not written at all, and (MUST NOT)
 * forbids writing a part of one.
 */
const EXPORT_HEIGHT_CAP = numberIn(cellOf(T204, 'S-217', T204_DEFAULT, T204_COLUMNS), 'T-204 S-217')

/** The screen of the base environment: table T-025, row `MC-6` (1920 x 1080). */
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

/**
 * `S-203` of table T-206: the coefficient the help's text size is decided by.
 * `FR-036` (MUST) fixes it here and (MUST NOT) forbids holding it in px.
 */
const HELP_TEXT_SCALE = numberIn(cellOf(T206, 'S-203', T206_DEFAULT, T206_COLUMNS), 'T-206 S-203')

/**
 * `S-204` of table T-206: the same for a tooltip's words. `FR-092` row `EZ-2`
 * (MUST) points at it.
 */
const TOOLTIP_TEXT_SCALE = numberIn(cellOf(T206, 'S-204', T206_DEFAULT, T206_COLUMNS), 'T-206 S-204')

/**
 * `S-210` of table T-206: the same for the header's written-at stamp.
 * `FR-101` (MUST) points at it and (MUST NOT) forbids px. ⚠️ The row says in as
 * many words that it is NOT applied to the file's name -- only the time.
 */
const SAVED_AT_TEXT_SCALE = numberIn(cellOf(T206, 'S-210', T206_DEFAULT, T206_COLUMNS), 'T-206 S-210')

/**
 * `S-124` (`iconHintDelayMs`) of table T-212: how long a pointer rests before
 * an explanation is put up. `FR-092` row `EZ-2` (MUST) has one value for every
 * surface and (MUST NOT) forbids a second.
 */
const HINT_DELAY_MS = numberIn(cellOf(T212, 'S-124', T212_VALUE, T212_COLUMNS), 'T-212 S-124')

/** The manuscript `FR-038` (MUST) makes the one home of every word the screen prints. */
const DICTIONARY = join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json')

/** One reason of table T-233 as the dictionary holds it. */
interface ReasonWords {
  readonly rowId: string
  readonly ja: string
  readonly en: string
}

/**
 * Every reason of table T-233, with the two sentences the dictionary gives it.
 *
 * ⭐ Read rather than spelled: `FR-038` (MUST) has every printed word live in
 * the dictionary and (MUST NOT) lets a requirement or a table spell one, so a
 * literal here would be a second copy of a word that has exactly one home.
 *
 * @purity semi-pure-b
 */
function reasonWordsOfDictionary(): ReasonWords[] {
  const held = JSON.parse(readFileSync(DICTIONARY, 'utf8')) as {
    reasons?: Array<{ rowId?: string; text?: { ja?: string; en?: string } }>
  }
  const reasons = held.reasons ?? []
  if (reasons.length === 0) throw new Error(`${DICTIONARY} holds no reasons at all`)
  return reasons.map((one) => ({
    rowId: one.rowId ?? '',
    ja: one.text?.ja ?? '',
    en: one.text?.en ?? '',
  }))
}

/**
 * The word `FR-101` (MUST) asks for while nothing has been written yet, in both
 * languages: 「まだ 1 度もファイルへ書いていないときは、時刻の代わりにその旨を
 * 示すこと（MUST）」.
 *
 * @purity semi-pure-b
 */
function neverSavedWords(): readonly string[] {
  const held = JSON.parse(readFileSync(DICTIONARY, 'utf8')) as {
    fileStatus?: Array<{ state?: string; text?: { ja?: string; en?: string } }>
  }
  const found = (held.fileStatus ?? []).find((one) => one.state === 'neverSaved')
  const words = [found?.text?.ja ?? '', found?.text?.en ?? ''].filter((one) => one !== '')
  if (words.length === 0) {
    throw new Error(`${DICTIONARY} holds no fileStatus word for a document never written to a file`)
  }
  return words
}

/**
 * The seven weekday words, in every language the dictionary spells them in.
 *
 * ⭐ Read rather than written, for the reason `FR-038` (MUST) gives and for one
 * more: the display language is chosen from the browser (`FR-038`), so a case
 * that spelled one language's seven would report a build running in the other
 * as broken. Both spellings are accepted and neither is in this file.
 *
 * @purity semi-pure-b
 */
function weekdayWords(): readonly string[] {
  const held = JSON.parse(readFileSync(DICTIONARY, 'utf8')) as {
    weekdays?: Array<{ text?: { ja?: string; en?: string } }>
  }
  const words = (held.weekdays ?? []).flatMap((one) => [one.text?.ja ?? '', one.text?.en ?? ''])
  const said = words.filter((one) => one !== '')
  if (said.length === 0) throw new Error(`${DICTIONARY} holds no weekday words`)
  return said
}

/**
 * Whether a piece of text is written in Japanese script.
 *
 * ⭐ Kana (U+3040..U+30FF) or han (U+4E00..U+9FFF), counted by code point so
 * that this file spells no character of either. Rule 03 section 5.
 *
 * @purity pure
 */
function isJapanese(text: string): boolean {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    if (code >= 0x3040 && code <= 0x30ff) return true
    if (code >= 0x4e00 && code <= 0x9fff) return true
  }
  return false
}

/** Whitespace flattened, so a manuscript cell and a drawn span compare. @purity pure */
function flat(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * The whole of an assignment cell, with the manuscript's own marking taken off.
 *
 * ⛔ NOT `bare` OF `tests/contract/spec-table.ts`. That one answers the FIRST
 * code span of a cell, which is right for a cell holding one name and wrong for
 * every cell here that holds two: `SK-3` writes 「`Delete` / `Backspace`」 and
 * `SK-16` writes 「`Shift` ＋ `+` / `Shift` ＋ `-`」, and the screen prints both
 * halves. Taking the first span would have this file assert that the screen
 * prints half of what the manuscript writes.
 *
 * @purity pure
 */
function assignmentText(cell: string): string {
  return flat(cell.replace(/[`*]/g, ''))
}

/**
 * One chord of the manuscript, spelled the way a driven keyboard wants it.
 *
 * ⚠️ THREE SPELLINGS DIFFER AND NOTHING IN THE SPECIFICATION IS WRONG ABOUT IT.
 * The manuscript writes a full-width plus (U+FF0B) between the parts of a chord
 * with spaces around it, and writes the modifier as `Ctrl`; the tool wants `+`
 * with no spaces and the name `Control`. Both are given as code points or short
 * literals here rather than left to a reader to guess.
 *
 * ⛔ ONE CHORD ONLY. A cell listing two of them (`SK-3`, `SK-7`, `SK-16`) has no
 * single answer, and quietly pressing the first is how a case ends up testing
 * something it never named.
 *
 * @purity pure
 */
function pressable(cell: string): string {
  const plus = String.fromCharCode(0xff0b)
  const said = assignmentText(cell)
  if (said.includes('/')) {
    throw new Error(`the assignment ${JSON.stringify(said)} lists more than one chord`)
  }
  return said.split(plus).join('+').replace(/\s+/g, '').replace(/^Ctrl\+/, 'Control+')
}

/**
 * The rows of table T-036 whose assignment is a bare key, with that key.
 *
 * ⛔ ROWS WHOSE CELL CARRIES PROSE ARE LEFT OUT. `SK-8` writes
 * 「`Esc`（規則は表 T-028 の `IN-4`）」 -- the key plus a pointer to the rule --
 * and the screen prints the key alone, quite correctly. Asserting the whole
 * cell there would be asserting the manuscript's punctuation. The filter is
 * "no Japanese script in the cell", which leaves 20 of the 23 rows.
 *
 * @purity pure
 */
function keyedShortcutRows(): ReadonlyArray<readonly [string, string]> {
  const out: Array<readonly [string, string]> = []
  for (const row of T036.rows) {
    if (!/^SK-/.test(row.id)) continue
    if (row.cells.length !== T036_COLUMNS) continue
    const key = assignmentText(row.cells[T036_ASSIGNMENT] ?? '')
    if (key === '' || isJapanese(key)) continue
    // U+2014, the dash the manuscript writes where a row has no assignment.
    if (key === String.fromCharCode(0x2014)) continue
    out.push([row.id, key])
  }
  if (out.length < 10) {
    throw new Error(`table T-036 gave only ${out.length} rows with a bare key; this file needs more`)
  }
  return out
}

/**
 * The rows of table T-016 whose input kind names a colour.
 *
 * ⭐ Taken from the table's own input-kind column rather than named here, so
 * that a property which becomes a colour is swept without editing this file.
 * ⚠️ The kind is written in Japanese (U+8272), given by code point for the
 * reason rule 03 section 5 gives.
 *
 * @purity pure
 */
function colourPropertyRows(): readonly string[] {
  const colour = String.fromCharCode(0x8272)
  const found = T016.rows
    .filter((row) => row.cells.length === T016_COLUMNS)
    .filter((row) => (row.cells[T016_INPUT_KIND] ?? '').includes(colour))
    .map((row) => row.id)
  if (found.length === 0) throw new Error('table T-016 marks no property as a colour')
  return found
}

/**
 * The one row of table T-109 with this text in the column given.
 *
 * ⭐ Used so that no case here spells an `IC-nn` of its own: an entrance is
 * found by what the table says it does (`T109_PURPOSE`) or by the requirement
 * the table gives as its source (`T109_SOURCE`). Renaming or renumbering an
 * entrance in the manuscript moves every case with it; two entrances answering
 * one description is a failure here rather than a silent choice of the first.
 *
 * @purity pure
 */
function entranceBy(column: number, ...texts: readonly string[]): string {
  const found = T109.rows
    .filter((row) => row.cells.length === T109_COLUMNS)
    .filter((row) => texts.every((text) => (row.cells[column] ?? '').includes(text)))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose column ${column} carries ` +
        `${JSON.stringify(texts)}, and this file needs exactly one`,
    )
  }
  return found[0]?.id ?? ''
}

/**
 * The entrance another entrance's own row names.
 *
 * ⭐ Table T-109 says of the minimise entrance 「⭐ **`IC-53` の右に並ぶ**
 * （`FR-053`）」 -- it names the band it rides. Reading the neighbour out of that
 * cell keeps both row IDs in the manuscript and neither in this file.
 *
 * @purity pure
 */
function entranceNamedIn(entrance: string): string {
  const said = cellOf(T109, entrance, T109_PURPOSE, T109_COLUMNS)
  const found = /IC-\d+/.exec(said)
  if (found === null) {
    throw new Error(`table T-109 row ${entrance} names no other entrance in its purpose`)
  }
  return found[0]
}

// The two words that tell the time axis apart from the row axis, and one
// direction of zoom from the other. ⚠️ Given as code points rather than
// written out: rule 03 section 5 keeps this tree ASCII, and
// `tests/system/user-reported-fixes.test.ts` gives the same reason for the one
// word it needs -- a literal would be invisible in a diff.
/** U+6642 U+9593 U+8EF8 -- the time axis. */
const TIME_AXIS = String.fromCharCode(0x6642, 0x9593, 0x8ef8)
/** U+62E1 U+5927 -- to enlarge. */
const ZOOM_IN = String.fromCharCode(0x62e1, 0x5927)
/** U+7E2E U+5C0F -- to shrink. */
const ZOOM_OUT = String.fromCharCode(0x7e2e, 0x5c0f)

// ---------------------------------------------------------------------------
// Driving the shipped build
// ---------------------------------------------------------------------------

/**
 * ⛔ THE DELIVERABLE, not the sources and not the dev server. `NFR-004` row
 * `CN-1` has `dist/` hold exactly one file and that file be the `.html`;
 * `tests/nfr/nfr-004-single-file.test.ts` is what assembles and judges it.
 * This file only presses it, and says so loudly when it is not there.
 */
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

/**
 * ⛔ THE SAME HANDLES `tests/system/live-app.ts` AND THE OTHER TWO SYSTEM FILES
 * LEAN ON, and no others. Nothing in the specification says how a part is
 * marked in the page; the shell writes the part's settled name of
 * `_assets/tbl-glossary.md`, and a change to that marking breaks these cases,
 * as it should -- at that point the tool and the tests disagree about how a
 * part is found and the specification cannot settle the argument.
 */
const CANVAS = '[data-role="Schedule Canvas"] svg'
const TOOLTIP = '[data-role="Tooltip"]'
const PANEL = '[data-role="Properties Panel"]'
const PALETTE = '[data-role="Command Palette"]'
const HELP = '[data-role="Help Modal"]'
const HEADER_FILE_STATUS = '[data-role="File Status"]'
const HEADER_FILE_NAME = '[data-role="Opened File Name"]'
const HEADER_SAVED_AT = '[data-role="File Saved At"]'

let browser: Browser | null = null
let plainContext: BrowserContext | null = null
let plainPage: Page | null = null

test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error(
      'the shipped build this file presses is not there; run `npm run build` first ' +
        '(dist/index.html)',
    )
  }
  browser = await launchReferenceBrowser()
  plainContext = await browser.newContext({ viewport: BASE_SCREEN })
  plainPage = await plainContext.newPage()
  await plainPage.goto(pathToFileURL(SHIPPED_BUILD).href)
  // ⚠️ Not a fixed pause. `BO-1` of table T-077 holds the page invisible until
  // the size is settled and the shell may legitimately draw twice on the way
  // up, so what is waited for is two identical readings of the drawing.
  await readSettledDrawnSvg(plainPage)
})

// ⛔ THE HOOK'S OWN ALLOWANCE, NOT AN ASSERTION'S. Closing the reference browser
// passes a hook's 30s default on this machine -- measured at 21s..163s over five
// launches -- so this file reported red at the very end however green all
// twenty-two cases were. `CLEARING_UP_MS` of `./live-app` carries the
// measurements, and why the contexts are not what is slow.
test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** The page every case of the first block shares. @purity semi-pure-b */
function shared(): Page {
  if (plainPage === null) throw new Error('the shipped build was not opened')
  return plainPage
}

/** A page of its own, in the same browser, with the host's dialogue replaced. */
interface Stubbed {
  readonly page: Page
  close(): Promise<void>
}

/**
 * A page whose clock is somewhere other than UTC and whose save dialogue is
 * answered without a person.
 *
 * ⛔ WHY THE DIALOGUE IS REPLACED AT ALL. The only route the shipped build has
 * for writing a file is the host's own save picker, and a driven browser cannot
 * answer one -- which is why the three rows below sat at `実測待ち` for a week.
 * What is put in its place keeps the shape the host's own gives back: a handle
 * with a `name` and a `createWritable()`, a writable with `write`/`close`. ⚠️
 * IT PROVES ONE HALF. What the application does once it holds a handle is
 * measured; whether the REAL picker's handle is accepted is not, and cannot be
 * from outside.
 *
 * ⚠️ `timezoneId` is chosen only for being a whole number of hours away from
 * UTC, which is what lets a printed hour tell the two apart. The case guards
 * that the offset it actually got is not zero, so a machine that ignores the
 * setting fails loudly rather than passing on a coincidence.
 *
 * ⚠️ THE SCREEN IS A PARAMETER, and every caller but one leaves it at `MC-6`.
 * The one that does not is the case for D-220: what makes a picture too tall to
 * write is the SHAPE OF THE SCREEN and not the document (the ledger's own
 * measurement, and `FR-025` says as much -- the width is fixed and the height
 * follows `FR-080`'s ratio), so that case has to be judged on a screen shaped to
 * reach the ceiling, and says so at the case.
 *
 * @purity non-pure
 */
async function openStubbedPage(screen: { width: number; height: number } = BASE_SCREEN): Promise<Stubbed> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({
    viewport: screen,
    timezoneId: 'America/Denver',
  })
  await context.addInitScript(() => {
    const written: string[] = []
    let asked = 0
    let minted = 0
    const record = { asked: () => asked, written: () => written }
    ;(window as unknown as { grsSweepPicker: typeof record }).grsSweepPicker = record
    const decoded = async (part: unknown): Promise<string> => {
      if (typeof part === 'string') return part
      if (part instanceof Blob) return part.text()
      if (part instanceof Uint8Array) return new TextDecoder().decode(part)
      if (part instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(part))
      return ''
    }
    const handleNamed = (name: string): unknown => ({
      kind: 'file',
      name,
      async createWritable() {
        const parts: unknown[] = []
        return {
          async write(part: unknown) {
            parts.push(part)
          },
          async close() {
            let text = ''
            for (const part of parts) text += await decoded(part)
            // ⭐ THE NAME AND THE BODY ARE PARTED BY `\0`, and it is written as
            // an escape rather than as the byte itself: a raw one makes this
            // file BINARY to `grep`, so the pre-publish sweep for secrets and
            // personal data cannot read it at all (measured 2026-09-03), and
            // rule 03 section 5 asks for ASCII besides. The character is chosen
            // because a file's name cannot hold it and the bodies below are
            // JSON, XML, SVG and HTML, none of which carries one either -- a
            // space or a newline would part the wrong pair.
            written.push(`${name}\0${text}`)
          },
          async abort() {},
        }
      },
      async queryPermission() {
        return 'granted'
      },
      async requestPermission() {
        return 'granted'
      },
      async getFile() {
        return new File([''], name)
      },
      async isSameEntry() {
        return false
      },
    })
    ;(window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker = async () => {
      asked += 1
      minted += 1
      return handleNamed(`sweep-${minted}`)
    }
  })
  const page = await context.newPage()
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  return {
    page,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

/** What the replaced dialogue was asked, and what went through it. */
interface Wrote {
  readonly asked: number
  readonly files: readonly string[]
  readonly bodies: readonly string[]
}

/** @purity semi-pure-b */
async function readWrites(page: Page): Promise<Wrote> {
  return page.evaluate(() => {
    const held = (window as unknown as { grsSweepPicker?: { asked(): number; written(): string[] } })
      .grsSweepPicker
    if (held === undefined) return { asked: -1, files: [], bodies: [] }
    const written = held.written()
    return {
      asked: held.asked(),
      files: written.map((one) => one.split('\0')[0] ?? ''),
      bodies: written.map((one) => one.slice((one.split('\0')[0] ?? '').length + 1)),
    }
  })
}

/**
 * Wait until a reading answers what is wanted, polling rather than sleeping.
 *
 * ⚠️ WHY IT EXISTS. The header catches up with a write some seconds after the
 * write itself -- measured 2026-09-03: nothing at 1.5s, the name and the stamp
 * both there by 5.5s. A fixed pause either wastes the difference on every run
 * or reports a working header as broken, and this project has already made the
 * second mistake once (the ledger's D-66).
 *
 * @purity non-pure
 */
async function until<T>(
  page: Page,
  read: () => Promise<T>,
  good: (seen: T) => boolean,
  what: string,
  timeoutMs = 20_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  let seen = await read()
  while (Date.now() < deadline) {
    if (good(seen)) return seen
    await page.waitForTimeout(150)
    seen = await read()
  }
  throw new Error(`${what} was still not true after ${timeoutMs}ms; last reading ${JSON.stringify(seen)}`)
}

/** Where an entrance stands right now, or null while it is not on the screen. @purity semi-pure-b */
async function entranceBox(
  page: Page,
  entrance: string,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return page.evaluate((wanted: string) => {
    const element = document.querySelector(`[data-icon="${wanted}"]`)
    if (element === null) return null
    const box = element.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  }, entrance)
}

/**
 * Press an entrance with a real pointer.
 *
 * ⛔ A REAL POINTER, not `element.click()`. The shell builds its input from
 * pointer events, and a synthetic click has reached nothing in this project
 * before -- `tests/system/user-reported-fixes.test.ts` and `tools/probe/`
 * both record the same.
 *
 * @purity non-pure
 */
async function pressEntrance(page: Page, entrance: string): Promise<boolean> {
  const box = await entranceBox(page, entrance)
  if (box === null) return false
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(400)
  return true
}

/** Whatever the notices are saying right now (table T-037). @purity semi-pure-b */
async function readNotices(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    // ⛔ THE ROLE IS `Notification Area`, and asking for a role called `Notice`
    // is how a probe of an earlier round found none and called a defect fixed.
    Array.from(document.querySelectorAll('[data-role]'))
      .filter((marked) => (marked.getAttribute('data-role') ?? '').includes('Notification'))
      .map((marked) => (marked.textContent ?? '').trim())
      .filter((said) => said !== ''),
  )
}

/**
 * The host's own ground text size, which is what the three coefficients are
 * multiplied by.
 *
 * ⛔ NOT `fontScaleSizes` OF TABLE T-215. `S-197`, `S-203`, `S-204` and `S-210`
 * all say in as many words that the multiplicand is the host's ground text and
 * not the drawing's own scale -- the frame around the schedule is not the
 * schedule. Read off the root element rather than `body`, so that a rule the
 * application puts on `body` cannot quietly become the baseline this file
 * compares against.
 *
 * @purity semi-pure-b
 */
async function groundTextPx(page: Page): Promise<number> {
  return page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
  )
}

/** The text sizes every leaf under a selector is drawn at. @purity semi-pure-b */
async function leafTextSizes(page: Page, selector: string): Promise<Array<{ text: string; px: number }>> {
  return page.evaluate((wanted: string) => {
    const host = document.querySelector(wanted)
    if (host === null) return []
    return Array.from(host.querySelectorAll('*'))
      .filter((element) => element.children.length === 0)
      .map((element) => ({
        text: (element.textContent ?? '').trim(),
        px: Number.parseFloat(getComputedStyle(element).fontSize),
      }))
  }, selector)
}

/** How many `<text>` of the drawing read exactly this. @purity semi-pure-b */
async function drawnTextsReading(page: Page, reading: string): Promise<number> {
  return page.evaluate(
    (asked: { canvas: string; wanted: string }) =>
      Array.from(document.querySelectorAll(`${asked.canvas} text`)).filter(
        (drawn) => (drawn.textContent ?? '').trim() === asked.wanted,
      ).length,
    { canvas: CANVAS, wanted: reading },
  )
}

/** A task bar whose middle is on the screen, or null when none is. @purity semi-pure-b */
async function firstBarOnScreen(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    (asked: { canvas: string; width: number }) => {
      const svg = document.querySelector(asked.canvas)
      if (svg === null) return null
      // ⚠️ THE DRAWING IS WIDER THAN THE WINDOW. A bar's own middle is often
      // off the right edge, and a pointer sent there presses nothing; what is
      // taken is the middle of the part that is actually on the screen.
      for (const shape of Array.from(svg.querySelectorAll('polygon'))) {
        const box = shape.getBoundingClientRect()
        const left = Math.max(box.x, 230)
        const right = Math.min(box.right, asked.width - 30)
        if (right - left < 120) continue
        if (box.y < 150 || box.bottom > 950) continue
        if (box.height < 20) continue
        return { x: Math.round((left + right) / 2), y: Math.round(box.y + box.height / 2) }
      }
      return null
    },
    { canvas: CANVAS, width: BASE_SCREEN.width },
  )
}

/**
 * Double-click a task's body, which is one of the two things table T-023 row
 * `MK-13` gives that gesture on a task.
 *
 * ⚠️ THE POINTER ARRIVES FROM SOMEWHERE ELSE FIRST, and the two presses are
 * Playwright's own double click rather than two presses of this file's making:
 * `MK-13` is judged on the click count, and two presses spaced by whatever a
 * loaded machine gives are not reliably one double click.
 *
 * @purity non-pure
 */
async function doubleClickBar(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x - 40, at.y - 40)
  await page.waitForTimeout(150)
  await page.mouse.dblclick(at.x, at.y)
  await page.waitForTimeout(1200)
}

/** One tier of the ruler band: the ticks that divide it and the words in it. */
interface RulerTier {
  readonly top: number
  readonly ticks: readonly number[]
  readonly words: readonly string[]
}

/**
 * The ruler band's tiers, each with the ticks it is divided by.
 *
 * ⛔ THE TICKS AND NOT THE WORDS ARE WHAT `LF-1` IS ABOUT. Table T-221 row
 * `LF-1` gives an INTERVAL to each tier -- 「年の段は 1 年、年と月の段は 1 か月、
 * 週の段は 7 日、日の段と曜日の段は 1 日」 -- and what is drawn at an interval is
 * the tick, not the label; a tier could print a word every second tick and still
 * be ticked every day. So the lines are read, grouped by the height they start
 * at, and the words are carried along only so that a case can say WHICH tier it
 * is holding.
 *
 * ⚠️ A tier's own ticks all start at that tier's top and are one tier high, so
 * the top is the grouping key. The zero-height lines the drawing also carries at
 * those heights are left out -- they divide nothing.
 *
 * @purity semi-pure-b
 */
async function rulerTiers(page: Page): Promise<RulerTier[]> {
  return page.evaluate((canvas: string) => {
    const svg = document.querySelector(canvas)
    const rows = Array.from(document.querySelectorAll('[data-depth]'))
    if (svg === null || rows.length === 0) return []
    const firstRowTop = Math.min(...rows.map((row) => row.getBoundingClientRect().top))
    const ticks = new Map<number, number[]>()
    for (const drawn of Array.from(svg.querySelectorAll('line'))) {
      const box = drawn.getBoundingClientRect()
      if (box.height < 2 || box.bottom > firstRowTop + 1) continue
      const top = Math.round(box.top)
      const held = ticks.get(top) ?? []
      held.push(Math.round(box.x * 100) / 100)
      ticks.set(top, held)
    }
    const words = new Map<number, string[]>()
    for (const drawn of Array.from(svg.querySelectorAll('text'))) {
      const box = drawn.getBoundingClientRect()
      const said = (drawn.textContent ?? '').trim()
      if (said === '') continue
      // ⛔ NOT THE WATERMARK. FR-020's marks are clipped to the Row Area,
      // so none of them PAINTS on the band -- but a clipped element still
      // reports its unclipped box, and this walk picks labels by geometry
      // alone. Measured 2026-09-05: without this, the band read
      // ['user 2026-09-05T...','2026','2027','2028'] and the month tier was
      // never found. `data-role="Watermark"` is what the attribute is for.
      if (drawn.closest('[data-role="Watermark"]') !== null) continue
      // ⚠️ THE MIDDLE, NOT THE EDGES. A word's box is taller than the tier it
      // stands in -- measured 2026-09-03, a 16px tier carries a 21px box that
      // starts 2px above the tier's own line and ends 3px below it -- so a
      // reading taken off the top puts every word one tier up and a reading
      // taken off the bottom puts every word one tier down and throws the
      // lowest tier away entirely.
      const middle = (box.top + box.bottom) / 2
      if (middle > firstRowTop) continue
      let nearest: number | null = null
      for (const top of ticks.keys()) {
        if (middle < top) continue
        if (nearest === null || top > nearest) nearest = top
      }
      if (nearest === null) continue
      const held = words.get(nearest) ?? []
      held.push(said)
      words.set(nearest, held)
    }
    return [...ticks.entries()]
      .sort((one, two) => one[0] - two[0])
      .map(([top, xs]) => ({
        top,
        ticks: xs.sort((one, two) => one - two),
        words: words.get(top) ?? [],
      }))
  }, CANVAS)
}

/**
 * The two dates the Properties Panel is showing, and the name beside them.
 *
 * ⭐ `PR-3` of table T-016 is 「`start` / `finish`」 in one row, and the panel
 * draws the row with two date controls in that order. Found by asking for the
 * row that HOLDS TWO -- the manuscript's own shape -- rather than by position.
 *
 * @purity semi-pure-b
 */
async function panelDates(page: Page): Promise<{ start: string; finish: string; name: string } | null> {
  return page.evaluate(() => {
    const row = Array.from(document.querySelectorAll('[data-field-row="PR-3"]')).find(
      (one) => one.querySelectorAll('input[type="date"]').length === 2,
    )
    if (row === undefined) return null
    const both = Array.from(row.querySelectorAll('input[type="date"]')).map(
      (one) => (one as HTMLInputElement).value,
    )
    const named = document.querySelector('[data-field-row="PR-1"] input') as HTMLInputElement | null
    return { start: both[0] ?? '', finish: both[1] ?? '', name: named?.value ?? '' }
  })
}

/** Every task shape on the drawing right now, as a string apiece. @purity semi-pure-b */
async function drawnShapes(page: Page): Promise<string[]> {
  return page.evaluate(
    (canvas: string) =>
      Array.from(document.querySelectorAll(`${canvas} polygon`)).map((drawn) => {
        const box = drawn.getBoundingClientRect()
        return [
          Math.round(box.x),
          Math.round(box.y),
          Math.round(box.width),
          Math.round(box.height),
        ].join(',')
      }),
    CANVAS,
  )
}

/**
 * Open the chooser of `FR-096` and press the format whose file ending is given.
 *
 * ⚠️ THE ENDING COMES FROM TABLE T-024, so the button is found by what the
 * manuscript says the format is called on disk rather than by anything read off
 * the screen. The words beside it are the dictionary's (`FR-038`) and are not
 * touched here.
 *
 * @purity non-pure
 */
async function pressExportFormat(page: Page, chooser: string, ending: string): Promise<boolean> {
  if (!(await pressEntrance(page, chooser))) return false
  await page.waitForTimeout(600)
  const at = await page.evaluate((wanted: string) => {
    const surface = document.querySelector('[data-role="Export Chooser"]')
    if (surface === null) return null
    const found = Array.from(surface.querySelectorAll('button')).filter((one) =>
      (one.textContent ?? '').includes(wanted),
    )
    const only = found[0]
    if (found.length !== 1 || only === undefined) return null
    const box = only.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, ending)
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  return true
}

// ---------------------------------------------------------------------------
// D-103 -- where the minimise entrance stands
// ---------------------------------------------------------------------------

// GOES RED IF: the entrance that minimises the command palette is drawn inside
// a `Palette Groups` or a `Palette Commands` box, or stops sitting at the right
// end of the grab band, or stops standing to the right of the band's own mark.
// Table T-109 says of that row 「掴み帯の右端で、パレットを最小化し、同じ入口で
// 戻す（`S-200`）。⭐ `IC-53` の右に並ぶ（`FR-053`）」 and gives the band's own
// mark 「掴んで動かせることを示す。**ボタンではない**」 -- so one of the two is a
// button inside the other, which is exactly what the boxes must not hold.
//
// ⚠️ THE BAND ITSELF CARRIES A `data-icon`. Asking the page for the band's mark
// answers the band, not a glyph inside it, and the minimise entrance is one of
// its children. A reading that took the innermost marked node would report the
// two as unrelated.
test('D-103: the minimise entrance rides the palette grab band, right of its mark, in no group', async () => {
  test.setTimeout(120_000)
  const page = shared()

  const minimise = entranceBy(T109_PURPOSE, 'S-200')
  const band = entranceNamedIn(minimise)

  const bandBox = await entranceBox(page, band)
  const minimiseBox = await entranceBox(page, minimise)
  expect(bandBox, `the grab band ${band} is not on the screen`).not.toBeNull()
  expect(minimiseBox, `the minimise entrance ${minimise} is not on the screen`).not.toBeNull()
  if (bandBox === null || minimiseBox === null) return

  const inside = await page.evaluate((wanted: string) => {
    const element = document.querySelector(`[data-icon="${wanted}"]`)
    if (element === null) return null
    return {
      groups: element.closest('[data-role="Palette Groups"]') !== null,
      commands: element.closest('[data-role="Palette Commands"]') !== null,
      inPalette: element.closest('[data-role="Command Palette"]') !== null,
    }
  }, minimise)
  expect(inside, `${minimise} vanished between two readings`).not.toBeNull()
  if (inside === null) return

  expect(
    inside.inPalette,
    `${minimise} is not drawn inside the Command Palette at all, and FR-053 puts it on its band`,
  ).toBe(true)
  expect(
    inside.groups,
    `${minimise} is drawn inside a Palette Groups box; table T-109 puts it on the grab band`,
  ).toBe(false)
  expect(
    inside.commands,
    `${minimise} is drawn inside a Palette Commands box; table T-109 puts it on the grab band`,
  ).toBe(false)

  expect(
    minimiseBox.x,
    `${minimise} does not stand to the right of ${band}, and table T-109 says it lines up right of it`,
  ).toBeGreaterThan(bandBox.x)
  expect(
    Math.round(minimiseBox.x + minimiseBox.width),
    `${minimise} is not at the right end of the band (band ends at ` +
      `${Math.round(bandBox.x + bandBox.width)})`,
  ).toBe(Math.round(bandBox.x + bandBox.width))
})

// ---------------------------------------------------------------------------
// D-126 -- the file's name above the time
// ---------------------------------------------------------------------------

// GOES RED IF: the two header parts stop being stacked, or the time is put
// first, or either part leaves the header. `FR-101` (MUST) says 「名前を時刻の
// 上に置くこと（MUST）」, and CR-299 settled that the requirement is met by the
// unit that DRAWS the header rather than by an order field in what it is handed
// (table T-075, `UF-71`) -- so the screen is the only place it can be judged.
//
// ⭐ THE STACKING IS ASKED FOR AS WELL AS THE ORDER. Two parts side by side
// would satisfy 「first in the box」 and satisfy nothing a reader would call
// 「above」, so both the box's own direction and the two boxes' tops are read.
test('D-126: the header stands the file name above the time it was written', async () => {
  test.setTimeout(120_000)
  const page = shared()

  const laid = await page.evaluate(
    (asked: { status: string; name: string; at: string }) => {
      const status = document.querySelector(asked.status)
      const name = document.querySelector(asked.name)
      const stamp = document.querySelector(asked.at)
      if (status === null || name === null || stamp === null) return null
      const order = Array.from(status.children).map((child) => child.getAttribute('data-role'))
      return {
        direction: getComputedStyle(status).flexDirection,
        order,
        nameTop: name.getBoundingClientRect().top,
        stampTop: stamp.getBoundingClientRect().top,
        nameHolds: name.parentElement === status,
        stampHolds: stamp.parentElement === status,
      }
    },
    { status: HEADER_FILE_STATUS, name: HEADER_FILE_NAME, at: HEADER_SAVED_AT },
  )
  expect(laid, 'the header has no File Status box holding the name and the stamp').not.toBeNull()
  if (laid === null) return

  expect(laid.nameHolds && laid.stampHolds, 'the name and the stamp are not both in File Status').toBe(true)
  expect(
    laid.direction,
    'File Status does not stack its children, so nothing in it can be above anything else',
  ).toBe('column')
  expect(
    laid.order,
    'File Status holds its two children in an order FR-101 does not ask for',
  ).toEqual(['Opened File Name', 'File Saved At'])
  expect(
    laid.nameTop,
    `the name is drawn at y=${laid.nameTop} and the stamp at y=${laid.stampTop}; FR-101 (MUST) ` +
      'puts the name above the time',
  ).toBeLessThanOrEqual(laid.stampTop)
})

// ---------------------------------------------------------------------------
// D-65, first half -- how the header's stamp is written
// ---------------------------------------------------------------------------

// GOES RED IF: the stamp stops being drawn at `S-210` times the host's ground
// text, or the same coefficient starts being applied to the file's NAME, or the
// header shows an empty stamp before anything has been written. `FR-101` (MUST)
// says 「更新日時の字の大きさは ... 表 T-206 の `S-210` が定める係数で決める
// こと（MUST）。px で持ってはならない（MUST NOT）」 and 「まだ 1 度もファイルへ
// 書いていないときは、時刻の代わりにその旨を示すこと（MUST）」; `S-210` says
// 「ファイルの名前には掛けない」 in as many words.
//
// ⭐ THE SECOND HALF OF D-65 -- that the time shown is the reader's own and not
// UTC -- needs a file to have been written, and is judged further down, on the
// page whose save dialogue is answered.
test('D-65: the header stamp is drawn at S-210 of the ground text, and says so before any write', async () => {
  test.setTimeout(120_000)
  const page = shared()

  const ground = await groundTextPx(page)
  expect(ground, 'the page reports no ground text size at all').toBeGreaterThan(0)

  const drawn = await page.evaluate(
    (asked: { at: string; name: string }) => {
      const stamp = document.querySelector(asked.at)
      const name = document.querySelector(asked.name)
      if (stamp === null || name === null) return null
      return {
        stampPx: Number.parseFloat(getComputedStyle(stamp).fontSize),
        namePx: Number.parseFloat(getComputedStyle(name).fontSize),
        said: (stamp.textContent ?? '').trim(),
      }
    },
    { at: HEADER_SAVED_AT, name: HEADER_FILE_NAME },
  )
  expect(drawn, 'the header has no File Saved At part').not.toBeNull()
  if (drawn === null) return

  expect(
    drawn.stampPx,
    `the stamp is drawn at ${drawn.stampPx}px, and S-210 (${SAVED_AT_TEXT_SCALE}) of the ground ` +
      `text (${ground}px) is ${ground * SAVED_AT_TEXT_SCALE}px`,
  ).toBeCloseTo(ground * SAVED_AT_TEXT_SCALE, 1)
  expect(
    drawn.stampPx,
    'the stamp is drawn at the ground size, so the coefficient reaches nothing',
  ).not.toBeCloseTo(ground, 1)

  const words = neverSavedWords()
  expect(
    words.some((one) => drawn.said.includes(one)),
    `nothing has been written yet and the header says ${JSON.stringify(drawn.said)}; FR-101 (MUST) ` +
      `asks for one of ${JSON.stringify(words)} in place of a time`,
  ).toBe(true)
})

// ---------------------------------------------------------------------------
// D-98 -- the reload key with no file open
// ---------------------------------------------------------------------------

// GOES RED IF: pressing the reload key with nothing open changes the drawing,
// raises a notice, opens a surface, or takes the page somewhere else -- or if
// the control before it shows that keys are not reaching the application at
// all. Table T-024a row `OP-13` (the rule table T-036 row `SK-21` points at)
// ends 「⚠️ 開いているファイルが無いときは何もしないこと（MUST）」, and this
// build opens with no file: the header says so, which the case reads first.
//
// ⛔ THE CONTROL IS NOT DECORATION. "Nothing happened" is also what a page
// answers when the key never reached it, so the case first presses the key of
// table T-036 row `SK-14`, watches the palette go, and presses it back.
test('D-98: with no file open, the reload key of SK-21 does nothing', async () => {
  test.setTimeout(120_000)
  const page = shared()

  const reloadKey = pressable(cellOf(T036, 'SK-21', T036_ASSIGNMENT, T036_COLUMNS))
  const paletteKey = pressable(cellOf(T036, 'SK-14', T036_ASSIGNMENT, T036_COLUMNS))

  const paletteStanding = async (): Promise<boolean> =>
    page.evaluate((wanted: string) => document.querySelector(wanted) !== null, PALETTE)

  await page.mouse.move(Math.round(BASE_SCREEN.width * 0.5), Math.round(BASE_SCREEN.height * 0.6))

  // The control: a key that IS assigned reaches the application.
  const before = await paletteStanding()
  await page.keyboard.press(paletteKey)
  await page.waitForTimeout(600)
  const during = await paletteStanding()
  expect(
    during,
    `pressing ${paletteKey} (table T-036 row SK-14) did not change whether the Command Palette ` +
      'stands, so keys are not reaching this build and the reading below would prove nothing',
  ).not.toBe(before)
  await page.keyboard.press(paletteKey)
  await page.waitForTimeout(600)
  expect(await paletteStanding(), 'the control did not put the palette back').toBe(before)

  const noFile = await page.evaluate(
    (wanted: string) => (document.querySelector(wanted)?.textContent ?? '').trim(),
    HEADER_SAVED_AT,
  )
  expect(
    neverSavedWords().some((one) => noFile.includes(one)),
    `this case needs a build with no file open and the header says ${JSON.stringify(noFile)}`,
  ).toBe(true)

  const wasDrawn = await readSettledDrawnSvg(page)
  const wasSurfaces = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-role]'))
      .map((marked) => marked.getAttribute('data-role') ?? '')
      .sort(),
  )
  const wasThere = page.url()

  await page.keyboard.press(reloadKey)
  await page.waitForTimeout(1500)

  expect(page.url(), `${reloadKey} took the page somewhere else`).toBe(wasThere)
  expect(
    await readNotices(page),
    `${reloadKey} raised a notice, and OP-13 (MUST) has it do nothing with no file open`,
  ).toEqual([])
  expect(
    await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-role]'))
        .map((marked) => marked.getAttribute('data-role') ?? '')
        .sort(),
    ),
    `${reloadKey} put a surface up or took one down`,
  ).toEqual(wasSurfaces)
  expect(
    (await readSettledDrawnSvg(page)) === wasDrawn,
    `${reloadKey} changed the drawing, and OP-13 (MUST) has it do nothing with no file open`,
  ).toBe(true)
})

// ---------------------------------------------------------------------------
// D-106 -- the size of a tooltip's words
// ---------------------------------------------------------------------------

// GOES RED IF: the words a tooltip puts up are drawn at the ground size, or at
// anything other than `S-204` of it, or nothing is put up at all after the wait
// table T-212 row `S-124` gives. `FR-092` row `EZ-2` (MUST) says 「字の大きさは
// 表 T-206 の `S-204` が定める係数で決めること（MUST）」 and puts the wait in
// `S-124`, so raising either in the manuscript moves this case.
//
// ⚠️ THE OUTER BOX IS NOT ASKED. `textContent` on a container answers its
// children's words, so the container reads as if it were drawing them; what is
// measured is every LEAF that carries text -- the nodes that actually draw.
// ⚠️ Measured 2026-09-03: a run that waited 2.5s when `S-124` was 3000ms saw no
// tooltip at all, which is why the wait is read from the table and not written.
test('D-106: the words a tooltip puts up are drawn at S-204 of the ground text', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const ground = await groundTextPx(page)
  const zoomIn = entranceBy(T109_PURPOSE, TIME_AXIS, ZOOM_IN)
  const box = await entranceBox(page, zoomIn)
  expect(box, `the entrance ${zoomIn} is not on the screen to rest a pointer on`).not.toBeNull()
  if (box === null) return

  // ⛔ THE POINTER ARRIVES FROM SOMEWHERE ELSE. `EZ-2` starts the wait when the
  // pointer stops, so a pointer already standing there has been resting for an
  // unknown time.
  await page.mouse.move(box.x - 200, box.y + 260)
  await page.waitForTimeout(250)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(HINT_DELAY_MS + 1500)

  const leaves = (await leafTextSizes(page, TOOLTIP)).filter((one) => one.text !== '')
  expect(
    leaves.length,
    `nothing was put up after resting ${HINT_DELAY_MS + 1500}ms on ${zoomIn}, so there is no text ` +
      'to measure',
  ).toBeGreaterThan(0)

  for (const leaf of leaves) {
    expect(
      leaf.px,
      `a tooltip leaf reading ${JSON.stringify(leaf.text)} is drawn at ${leaf.px}px, and S-204 ` +
        `(${TOOLTIP_TEXT_SCALE}) of the ground text (${ground}px) is ${ground * TOOLTIP_TEXT_SCALE}px`,
    ).toBeCloseTo(ground * TOOLTIP_TEXT_SCALE, 1)
  }
  expect(
    ground * TOOLTIP_TEXT_SCALE,
    'S-204 has become 1, so this case would pass with no coefficient applied at all',
  ).not.toBeCloseTo(ground, 1)

  await page.mouse.move(4, BASE_SCREEN.height - 10)
  await page.waitForTimeout(500)
})

// ---------------------------------------------------------------------------
// D-105 -- how a help item is built
// ---------------------------------------------------------------------------

// GOES RED IF: a help item stops holding exactly three places, or its shape
// leaves the first of them, or its description leaves the second, or a key of
// table T-036 stops standing in the third, or the list is drawn at anything
// other than `S-203` of the host's ground text. `FR-036` (MUST) says 「一覧の各
// 項目は、入口の図形・その行の説明・その行の割当の 3 つを、この順に並べること
// （MUST）」 and 「一覧の字の大きさは ... 表 T-206 の `S-203` が定める係数で決め
// ること（MUST）。px で持ってはならない（MUST NOT）」.
//
// ⭐ THE THIRD PLACE IS CHECKED AGAINST THE MANUSCRIPT'S OWN KEYS, not against
// anything read off the screen: every row of table T-036 whose assignment cell
// is a bare key must have that key, character for character, in the item's
// third place. Twenty of the twenty-three rows qualify; `SK-8` and the two that
// carry no key do not, and are named in `keyedShortcutRows` above.
test('D-105: a help item reads shape, description, assignment, drawn at S-203', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const ground = await groundTextPx(page)
  const helpEntrance = entranceBy(T109_SOURCE, 'FR-036')
  expect(await pressEntrance(page, helpEntrance), `${helpEntrance} is not on the screen`).toBe(true)
  await page.waitForTimeout(1200)

  const read = await page.evaluate((wanted: string) => {
    const modal = document.querySelector(wanted)
    if (modal === null) return null
    const items = Array.from(modal.querySelectorAll('[data-table][data-row]'))
    return {
      count: items.length,
      tables: Array.from(new Set(items.map((one) => one.getAttribute('data-table') ?? ''))).sort(),
      shaped: items.map((one) => ({
        table: one.getAttribute('data-table') ?? '',
        row: one.getAttribute('data-row') ?? '',
        places: one.children.length,
        svgAt: Array.from(one.children).map((place) => place.querySelectorAll('svg').length),
        texts: Array.from(one.children).map((place) => (place.textContent ?? '').replace(/\s+/g, ' ').trim()),
        sizes: Array.from(one.querySelectorAll('*'))
          .filter((leaf) => leaf.children.length === 0)
          .map((leaf) => Number.parseFloat(getComputedStyle(leaf).fontSize)),
      })),
    }
  }, HELP)
  expect(read, 'pressing the help entrance put no Help Modal on the screen').not.toBeNull()
  if (read === null) return

  // ⭐ A GUARD, NOT THE ASSERTION. `FR-036` (MUST) has the list cover tables
  // T-023a / T-023b / T-023c / T-023d / T-023 / T-036 and the palette's items,
  // so a run that opened an empty modal would otherwise pass every check below
  // vacuously.
  for (const table of ['T-023a', 'T-023b', 'T-023c', 'T-023d', 'T-023', 'T-036']) {
    expect(read.tables, `the help lists nothing from ${table}, which FR-036 (MUST) has it cover`).toContain(
      table,
    )
  }
  expect(read.count, 'the help put up fewer items than FR-036 asks it to cover').toBeGreaterThan(100)

  const wrongPlaces = read.shaped.filter((one) => one.places !== 3)
  expect(
    wrongPlaces.map((one) => `${one.row} has ${one.places}`),
    'a help item does not hold the three places FR-036 (MUST) asks for',
  ).toEqual([])

  const shapeOutOfPlace = read.shaped.filter((one) => (one.svgAt[1] ?? 0) + (one.svgAt[2] ?? 0) > 0)
  expect(
    shapeOutOfPlace.map((one) => one.row),
    'a help item draws its shape somewhere other than first',
  ).toEqual([])

  const silent = read.shaped.filter((one) => (one.texts[1] ?? '') === '')
  expect(
    silent.map((one) => one.row),
    'a help item carries no description in its second place',
  ).toEqual([])

  const printedByRow = new Map(read.shaped.map((one) => [one.row, one.texts]))
  const wrongKeys: string[] = []
  for (const [rowId, key] of keyedShortcutRows()) {
    const places = printedByRow.get(rowId)
    if (places === undefined) {
      wrongKeys.push(`${rowId} is not in the help at all`)
      continue
    }
    if ((places[2] ?? '') !== key) {
      wrongKeys.push(`${rowId} prints ${JSON.stringify(places[2] ?? '')} where T-036 writes ${JSON.stringify(key)}`)
    }
  }
  expect(wrongKeys, 'the help does not stand the keys of table T-036 in the third place').toEqual([])

  const wrongSize = read.shaped
    .flatMap((one) => one.sizes.map((px) => ({ row: one.row, px })))
    .filter((one) => Math.abs(one.px - ground * HELP_TEXT_SCALE) > 0.05)
  expect(
    wrongSize.slice(0, 8).map((one) => `${one.row} at ${one.px}px`),
    `a help item is drawn at a size other than S-203 (${HELP_TEXT_SCALE}) of the ground text ` +
      `(${ground}px), which is ${ground * HELP_TEXT_SCALE}px`,
  ).toEqual([])

  // `IN-4` of table T-028 (through table T-036 row `SK-8`) closes a surface.
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  expect(
    await page.evaluate((wanted: string) => document.querySelector(wanted) !== null, HELP),
    'the help would not close, so the cases after this one would be pressing through it',
  ).toBe(false)
})

// ---------------------------------------------------------------------------
// D-43 -- what a double click on a task does
// ---------------------------------------------------------------------------

// GOES RED IF: double-clicking a task's body leaves the panel closed, or puts
// the focus somewhere other than the name field, or leaves the text it holds
// unselected. Table T-023 row `MK-13` (MUST) says of a task 「（名称ラベルと本体
// のどちらでも） ＝ プロパティパネルを出し、名称の欄（表 T-016 の `PR-1`）を編集
// できる状態にして焦点を置き、既にある文字をすべて選んだ状態にすること（MUST）」.
//
// ⭐ THE SELECTION IS THE HALF THE LEDGER SAYS WAS NEVER MEASURED. The 実物確認
// column of D-43 records a run of 2026-09-01 that watched the panel open and
// the focus move and stopped there. What that run could not say is read below:
// `selectionStart` at 0 and `selectionEnd` at the whole length.
test('D-43: double-clicking a task opens the panel with all of the name selected', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const bar = await firstBarOnScreen(page)
  expect(bar, 'no task bar has a middle on the screen to double-click').not.toBeNull()
  if (bar === null) return

  await doubleClickBar(page, bar)

  const state = await page.evaluate((wanted: string) => {
    const panel = document.querySelector(wanted)
    const active = document.activeElement as HTMLInputElement | null
    return {
      panelShown: panel === null ? null : getComputedStyle(panel).display,
      tag: active?.tagName ?? '',
      row: active?.closest('[data-field-row]')?.getAttribute('data-field-row') ?? '',
      value: active?.value ?? '',
      start: active?.selectionStart ?? -1,
      end: active?.selectionEnd ?? -1,
    }
  }, PANEL)

  expect(state.panelShown, 'a double click on a task body left the Properties Panel hidden').not.toBe('none')
  expect(state.tag, 'the focus after a double click is not in a field at all').toBe('INPUT')
  expect(
    state.row,
    `the focus landed in field row ${JSON.stringify(state.row)}, and MK-13 (MUST) names PR-1`,
  ).toBe('PR-1')
  expect(state.value, 'the name field the focus landed in is empty, so a selection proves nothing').not.toBe('')
  expect(
    { start: state.start, end: state.end, length: state.value.length },
    `MK-13 (MUST) asks for 「既にある文字をすべて選んだ状態」 and the field holds ` +
      `${JSON.stringify(state.value)} with ${state.start}..${state.end} selected`,
  ).toEqual({ start: 0, end: state.value.length, length: state.value.length })
})

// ---------------------------------------------------------------------------
// D-82 -- nothing in front of a colour control
// ---------------------------------------------------------------------------

// GOES RED IF: anything standing before a colour control in its own field row
// shows that control's value -- by being painted with it, by carrying a `fill`,
// or by printing it. `FR-006` (MUST NOT) says 「現在の値を、その値を示す操作子の
// 手前に重ねて描いてはならない（MUST NOT）」 and adds 「`S-188` が持つのは見本の
// 寸法であって、何回描いてよいかではない」.
//
// ⭐ WHICH FIELDS ARE COLOURS IS TAKEN FROM TABLE T-016's OWN INPUT-KIND COLUMN,
// so a property that becomes a colour is swept without touching this file.
// ⚠️ The panel is left open by the case above, and this one only reads.
test('D-82: nothing standing before a colour control shows the colour it holds', async () => {
  test.setTimeout(120_000)
  const page = shared()

  const colourRows = colourPropertyRows()
  const found = await page.evaluate(
    (asked: { panel: string; rows: readonly string[] }) => {
      const panel = document.querySelector(asked.panel)
      if (panel === null) return null
      const out: Array<{ row: string; before: Array<{ tag: string; background: string; fill: string; text: string }>; value: string }> = []
      for (const control of Array.from(panel.querySelectorAll('input[type="color"]'))) {
        // ⚠️ `closest` STARTS AT THE ELEMENT ITSELF, and the control carries the
        // row's own mark, so it would answer the control. The row is looked for
        // from the control's parent.
        const row = control.parentElement?.closest('[data-field-row]') ?? null
        const rowId = control.getAttribute('data-field-row') ?? row?.getAttribute('data-field-row') ?? ''
        if (!asked.rows.includes(rowId)) continue
        if (row === null) continue
        const before: Array<{ tag: string; background: string; fill: string; text: string }> = []
        // Everything drawn in this row that stands before the control, in the
        // order the row draws them.
        const controls = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'OPTION']
        for (const node of Array.from(row.querySelectorAll('*'))) {
          if (node === control) break
          if (node.contains(control)) continue
          // ⛔ A CONTROL IS NOT A SWATCH. `FR-006` forbids a second showing of
          // the value in front of the control that already shows it; the OTHER
          // controls of the same row (`PR-12` carries two colours and a
          // thickness) show values of their own, and a colour control painted
          // with its own colour is the very thing the requirement calls
          // sufficient. Measured 2026-09-03: leaving them in reports the second
          // colour control as a swatch in front of itself.
          if (controls.includes(node.tagName)) continue
          before.push({
            tag: node.tagName,
            background: getComputedStyle(node).backgroundColor,
            fill: node.getAttribute('fill') ?? '',
            text: (node.textContent ?? '').trim(),
          })
        }
        out.push({ row: rowId, before, value: (control as HTMLInputElement).value })
      }
      return out
    },
    { panel: PANEL, rows: colourRows },
  )
  expect(found, 'the Properties Panel is not on the screen').not.toBeNull()
  if (found === null) return
  expect(
    found.length,
    `the panel drew no colour control for any of ${colourRows.join(', ')}, which table T-016 marks ` +
      'as colours -- so this case would pass on an empty panel',
  ).toBeGreaterThan(0)

  const showing: string[] = []
  for (const control of found) {
    for (const node of control.before) {
      // A painted swatch: anything with ink of its own behind it.
      if (node.background !== '' && !/rgba\(0, 0, 0, 0\)|transparent/.test(node.background)) {
        showing.push(`${control.row}: a ${node.tag} painted ${node.background} stands before the control`)
      }
      if (node.fill !== '' && node.fill !== 'none') {
        showing.push(`${control.row}: a ${node.tag} filled ${node.fill} stands before the control`)
      }
      // A printed one: the value written out where the control already shows it.
      if (/#[0-9a-fA-F]{3,8}/.test(node.text)) {
        showing.push(`${control.row}: a ${node.tag} prints ${JSON.stringify(node.text)}`)
      }
    }
  }
  expect(showing, 'FR-006 (MUST NOT) forbids showing the value in front of the control that shows it').toEqual(
    [],
  )
})

// ---------------------------------------------------------------------------
// D-130 -- a value settled in the panel reaches the document
// ---------------------------------------------------------------------------

// GOES RED IF: typing a name into the panel's `PR-1` and settling it with the
// key of table T-036 row `SK-19` leaves the drawing reading what it read
// before. `FR-006` has the items of table T-016 that are not read-only be
// editable, and `PR-1`'s own note in `_assets/tbl-property-items.md` calls it
// 「バーに描くラベル」 -- so the drawing is where a settled name has to appear.
//
// ⛔ THIS CASE CHANGES THE DOCUMENT, which is why it and the two after it stand
// at the end of the page's order. The name it writes is put back by the case
// below, through the undo the specification already has.
test('D-130: a name settled in the panel reaches the drawing', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const bar = await firstBarOnScreen(page)
  expect(bar, 'no task bar has a middle on the screen').not.toBeNull()
  if (bar === null) return
  await doubleClickBar(page, bar)

  const was = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.value ?? '')
  expect(was, 'the name field is empty, so there is nothing to change').not.toBe('')
  expect(
    await drawnTextsReading(page, was),
    `the drawing does not read ${JSON.stringify(was)} even once, so it is not the label of the bar ` +
      'that was double-clicked',
  ).toBe(1)

  // A reading distinctive enough that no document could hold it already.
  const now = 'SweptName-D130'
  expect(await drawnTextsReading(page, now), `${now} is already on the screen`).toBe(0)

  await page.keyboard.type(now)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1200)

  expect(
    await drawnTextsReading(page, now),
    `settling ${JSON.stringify(now)} in PR-1 did not put it on the drawing`,
  ).toBe(1)
  expect(
    await drawnTextsReading(page, was),
    `the old name ${JSON.stringify(was)} is still drawn after PR-1 was settled to something else`,
  ).toBe(0)
})

// ---------------------------------------------------------------------------
// D-152 -- settling the same value twice
// ---------------------------------------------------------------------------

// GOES RED IF: settling a value that has not changed writes a second time --
// which is read here as one undo failing to put the old name back. Table T-028
// row `IN-6` (MUST NOT) says 「始めた値と同じ値を書いてはならない（MUST NOT）
// —— 同じ値を 2 度書くと取り消しが 2 段になる（`FR-031` と 表 T-027 の …）」, so
// the second write, if it happened, would show up as a second undo step and one
// `SK-6` would leave the new name standing.
//
// ⛔ IT LEANS ON THE CASE ABOVE having left the drawing renamed, and it puts the
// document back: after it the drawing reads what it read at start-up.
test('D-152: settling the same value again writes nothing, so one undo puts the name back', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const now = 'SweptName-D130'
  expect(
    await drawnTextsReading(page, now),
    'the case for D-130 did not leave its name on the drawing, so there is nothing to settle twice',
  ).toBe(1)

  // The same value again, through the same key -- table T-036 row `SK-19`.
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  expect(
    await drawnTextsReading(page, now),
    'settling the same value again took the name off the drawing',
  ).toBe(1)

  const undo = pressable(cellOf(T036, 'SK-6', T036_ASSIGNMENT, T036_COLUMNS))
  await page.keyboard.press(undo)
  await page.waitForTimeout(1200)

  expect(
    await drawnTextsReading(page, now),
    `one ${undo} left ${JSON.stringify(now)} on the drawing, so a second, empty edit was written ` +
      'and the undo stack has a step nobody made (IN-6 MUST NOT)',
  ).toBe(0)
})

// ---------------------------------------------------------------------------
// D-92 -- the ruler band's height, and how it is shared
// ---------------------------------------------------------------------------

// GOES RED IF: the ruler band changes height when the granularity changes, or a
// 段 that stands on two 行 gives them anything other than half the band each, or
// the sweep stops crossing a 段 boundary. `FR-017` (MUST) says 「目盛の帯の高さは、目盛の段階が変わっても動かさ
// ないこと（MUST）」 and 「⭐ 段が 3 つに満たない段階では、帯の高さを段の数で
// 等分すること（MUST）... ⛔ 余りをどこかへ寄せてはならない（MUST NOT）」.
//
// ⭐ THE LINES ARE READ FROM TWO BASELINES, as the unit case for this row does:
// `S-136` and `S-179` place a label inside its line and neither names the line's
// own height, so the distance between two labels' tops is the only thing on the
// screen that a line's height can be read off. Even division is exactly what
// makes that distance the band over the count; pushing the remainder to one end
// would leave each line its natural height and the distance would not divide.
//
// ⛔⛔ THE SWEEP DOES NOT PROVE IT CROSSED A BOUNDARY BY COUNTING THE LINES, and
// it cannot: table T-238 (`FR-017`, MUST, 利用者の裁定 2026-09-03) gives `TM-2`
// 月 two 行 (`yyyy` over `m`) AND `TM-3` 週 two (`yyyy-mm` over `d`), so the one
// boundary this sweep crosses does not move the count at all. Until that ruling
// the 月 段 stood on a single folded `yyyy-mm` and a count told them apart; the
// ruling withdrew that -- 「⚠️ `TM-2`（月の段）はそれを覆し、`yyyy` と `m` を 2 段
// に分ける」 -- and a count-only guard then fires on a sweep that crossed the
// boundary perfectly well, which is the opposite of what a guard is for.
//
// ⭐ WHAT NAMES A 段 IS THE PAIR (how many 行 it stands on, what its first 行
// prints): 1/`yyyy`, 2/`yyyy`, 2/`yyyy-mm`, 3/`yyyy-mm` for `TM-1`..`TM-4`.
// Neither half alone separates all four; the pair does, and the case checks the
// four keys are still distinct in the table before it leans on them. Both halves
// are read out of table T-238 at read time. `tests/unit/uf-32-ruler-band.test.ts`
// reached the same answer for the drawing helper and D-210 below takes it too;
// 「月を語で書いてはならない（MUST NOT）」 keeps both shapes digits and a hyphen in
// either language, so no display word moves them.
//
// ⭐ THE GUARD IS STILL LOUD: a sweep that stopped crossing a boundary would see
// one 段 for all nine readings and fail below, and a reading that is none of the
// four 段 fails as well -- 「同表に無い行を刷ってはならない（MUST NOT）」.
//
// ⛔ THREE 行 ARE NOT REACHED HERE and are outside the even-division rule anyway:
// `TM-4` is the only 段 that stands on three, and 「段が 3 つに満たない段階」 is
// `TM-1`..`TM-3`. Measured 2026-09-04 on this build, from `zoomX` = 1: the nine
// readings below walk `TM-3`, `TM-3`, then `TM-2` seven times -- the boundary is
// crossed on the second press and no further one is reached, so no reading here
// claims anything about `TM-1` or `TM-4`.
//
// ⚠️ WIDENING THE SWEEP TO REACH `TM-1` WAS WEIGHED AND DROPPED. `S-53` steps the
// zoom by 1.1 and `S-83` puts the `TM-1` boundary at 1.4 px/day against `S-1`'s
// 6, so it is another six presses at least, and it would leave the shared page so
// far out that D-91 below has to climb all the way back before it finds its three
// 行. It would buy one thing -- the height MUST asked across two different 行
// counts -- and `tests/unit/uf-32-ruler-band.test.ts` already asks the band's
// height at all four 段. ⛔ It would NOT buy the guard: `TM-1` is a boundary this
// sweep does not cross, and proving a different crossing says nothing about the
// one the readings below actually walk.
test('D-92: the ruler band keeps its height across stages and splits it evenly', async () => {
  test.setTimeout(180_000)
  const page = shared()

  // ⭐ THE FOUR 段 OF TABLE T-238, TAKEN FROM THE TABLE AT READ TIME. A 段 is
  // named by how many of its three 行 it prints and by the shape of the first of
  // them. ⚠️ `docs/spec` states no grammar for the tokens the table writes, so
  // the reading of `yyyy` and `yyyy-mm` is written here as
  // `tests/unit/uf-32-ruler-band.test.ts` writes it, and a token the table grows
  // that this case cannot read throws rather than being guessed at.
  const notPrinted = String.fromCharCode(0x5237, 0x3089, 0x306a, 0x3044)
  const thirdLine = 3
  const shapeOf = (token: string): RegExp => {
    if (token === 'yyyy') return /^\d{4}$/
    if (token === 'yyyy-mm') return /^\d{4}-\d{1,2}$/
    throw new Error(
      `table T-238 writes ${JSON.stringify(token)} on a first 行, and this case reads only ` +
        '`yyyy` and `yyyy-mm`',
    )
  }
  const tiers = ['TM-1', 'TM-2', 'TM-3', 'TM-4'].map((row) => ({
    row,
    lines: [T238_FIRST_LINE, T238_SECOND_LINE, thirdLine].filter(
      (column) => tierLine(row, column) !== notPrinted,
    ).length,
    first: shapeOf(tierLine(row, T238_FIRST_LINE)),
  }))
  const keyOf = (one: { lines: number; first: RegExp }): string => `${one.lines}/${one.first.source}`
  expect(
    new Set(tiers.map(keyOf)).size,
    `table T-238 no longer tells its four 段 apart by how many 行 they stand on and what the first ` +
      `of them prints (${tiers.map((one) => `${one.row} ${keyOf(one)}`).join(', ')}), so a sweep ` +
      'can no longer say which boundary it crossed',
  ).toBe(4)

  const readBand = async (): Promise<{
    height: number
    lines: Array<{ top: number; words: string[] }>
  } | null> =>
    page.evaluate((canvas: string) => {
      const svg = document.querySelector(canvas)
      const rows = Array.from(document.querySelectorAll('[data-depth]'))
      if (svg === null || rows.length === 0) return null
      const firstRowTop = Math.min(...rows.map((row) => row.getBoundingClientRect().top))
      // The band is the full-width shape the first row band sits directly
      // under. ⚠️ Nothing in the specification marks it, so it is found by
      // where it is; a change to the drawing's shape breaks this case, as it
      // should.
      const band = Array.from(svg.querySelectorAll('rect'))
        .map((drawn) => drawn.getBoundingClientRect())
        .filter((box) => box.width > 500 && Math.abs(box.bottom - firstRowTop) < 1.5)
        .sort((one, two) => two.height - one.height)[0]
      if (band === undefined) return null
      // ⛔ A LABEL WITH NOTHING IN IT IS NOT A 行. FR-017 (MUST) says 「『刷らな
      // い』は『空で刷る』ではない」, so an empty box may not raise the count.
      const held = new Map<number, string[]>()
      for (const label of Array.from(svg.querySelectorAll('text'))) {
        const box = label.getBoundingClientRect()
        const said = (label.textContent ?? '').trim()
        if (said === '') continue
        // ⛔ NOT THE WATERMARK -- see the same guard on the walk above.
        if (label.closest('[data-role="Watermark"]') !== null) continue
        if (box.bottom <= firstRowTop && box.bottom > band.top - 8) {
          const top = Math.round(box.top * 100) / 100
          held.set(top, [...(held.get(top) ?? []), said])
        }
      }
      return {
        height: Math.round(band.height * 100) / 100,
        lines: [...held.entries()]
          .sort((one, two) => one[0] - two[0])
          .map(([top, words]) => ({ top, words })),
      }
    }, CANVAS)

  /** Which 段 of table T-238 a reading is, or null if it is none of them. */
  const nameOf = (band: { lines: Array<{ words: string[] }> }): string | null => {
    const first = band.lines[0]
    if (first === undefined || first.words.length === 0) return null
    const found = tiers.filter(
      (one) => one.lines === band.lines.length && first.words.every((said) => one.first.test(said)),
    )
    return found.length === 1 ? (found[0] as { row: string }).row : null
  }

  const seen: Array<{ height: number; lines: Array<{ top: number; words: string[] }>; tier: string | null }> = []
  // ⚠️ THE TICKS ARRIVE BEFORE THE WORDS -- D-91 below measured a frame with all
  // its 行 ticked and not one word in any of them -- and every reading here turns
  // on the words, so the drawing is settled before the first one as well as
  // before each of the eight that follow.
  await readSettledDrawnSvg(page)
  const first = await readBand()
  expect(first, 'no ruler band could be found above the first row band').not.toBeNull()
  if (first === null) return
  seen.push({ ...first, tier: nameOf(first) })

  // ⚠️ Zooming OUT, because the coarser 段 are the ones standing on fewer than
  // three 行 -- which is the only case FR-017's even-division MUST is about.
  const coarser = entranceBy(T109_PURPOSE, TIME_AXIS, ZOOM_OUT)
  for (let step = 0; step < 8; step += 1) {
    expect(await pressEntrance(page, coarser), `${coarser} is not on the screen`).toBe(true)
    await readSettledDrawnSvg(page)
    const now = await readBand()
    if (now !== null) seen.push({ ...now, tier: nameOf(now) })
  }

  const walked = seen
    .map((one) => `${one.tier ?? '?'}[${one.lines.map((line) => line.words[0] ?? '').join('|')}]`)
    .join(' -> ')
  expect(
    seen.filter((one) => one.tier === null).length,
    `a reading of the ruler is none of the four 段 of table T-238, and FR-017 (MUST NOT) says ` +
      `「同表に無い行を刷ってはならない」; the sweep walked ${walked}`,
  ).toBe(0)

  const crossed = new Set(seen.map((one) => one.tier))
  expect(
    crossed.size,
    `the sweep never left one 段 of table T-238 (${walked}), so it proved nothing about a stage ` +
      'boundary',
  ).toBeGreaterThan(1)

  const heights = new Set(seen.map((one) => one.height))
  expect(
    [...heights],
    `the ruler band changed height when the granularity changed, which FR-017 (MUST) forbids; the ` +
      `sweep walked ${walked}`,
  ).toHaveLength(1)

  for (const one of seen) {
    if (one.lines.length !== 2) continue
    const apart = Math.round((((one.lines[1]?.top ?? 0) - (one.lines[0]?.top ?? 0)) as number) * 100) / 100
    expect(
      apart,
      `the band is ${one.height}px and ${one.tier ?? '?'} stands on two 行, so FR-017 (MUST) gives ` +
        `each of them ${one.height / 2}px; the two baselines are ${apart}px apart`,
    ).toBeCloseTo(one.height / 2, 1)
  }
  expect(
    seen.some((one) => one.lines.length === 2),
    `no 段 in the sweep stood on two 行, so the even division was never asked; the sweep walked ${walked}`,
  ).toBe(true)
})

// ---------------------------------------------------------------------------
// D-166 -- the reason a refusal carries
// ---------------------------------------------------------------------------

// GOES RED IF: pressing an entrance that has nothing to do says something other
// than what table T-233 row `RS-30` holds -- in particular the retired sentence
// that told the reader the row was already folded, which is the opposite of the
// situation the row now names: 「直下に、画面へ戻せる子が 1 つも無い」.
//
// ⭐ THE WORDS ARE READ FROM THE DICTIONARY, not written here: `FR-038` (MUST)
// has every printed word live there. What the case asserts is that exactly one
// reason of the forty-two the dictionary holds is what the screen said, and that
// it is `RS-30`. ⚠️ A machine check will not catch this: it asks whether a row's
// word reached the screen, never whether that word is true of the row.
test('D-166: pressing the open-one-level entrance with nothing to bring back tells RS-30', async () => {
  test.setTimeout(180_000)
  const page = shared()

  const situation = cellOf(T233, 'RS-30', T233_SITUATION, T233_COLUMNS)
  expect(situation, 'table T-233 row RS-30 names no situation').not.toBe('')

  const oneLevel = entranceBy(T109_SOURCE, 'HF-13')

  // ⛔ A ROW'S OWN ENTRANCES ARE HIDDEN UNTIL THE POINTER IS ON ITS NAME
  // (table T-051 row `HF-6`), and the shell reads a real pointer -- a
  // dispatched event reaches nothing here, which `tools/probe/harness.mjs`
  // records as the way one session called a working feature broken. So the
  // pointer is moved onto the first row's name and the entrance looked for
  // afterwards.
  const firstRow = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll('[data-depth]'))
      .map((row) => row.getBoundingClientRect())
      .sort((one, two) => one.top - two.top)
    const found = boxes[0]
    if (found === undefined) return null
    return { nameX: found.x + 30, nameY: found.y + found.height / 2, top: found.top }
  })
  expect(firstRow, 'the row title panel drew no rows').not.toBeNull()
  if (firstRow === null) return

  await page.mouse.move(firstRow.nameX, firstRow.nameY)
  await page.waitForTimeout(500)
  const at = await page.evaluate(
    (asked: { entrance: string; top: number }) => {
      const found = Array.from(document.querySelectorAll(`[data-icon="${asked.entrance}"]`)).find(
        (one) => Math.abs(one.getBoundingClientRect().top - asked.top) < 40,
      )
      if (found === undefined) return null
      const box = found.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    { entrance: oneLevel, top: firstRow.top },
  )
  expect(at, `${oneLevel} is not drawn on the first row even with the pointer on its name`).not.toBeNull()
  if (at === null) return

  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(900)

  const said = (await readNotices(page)).join(' ')
  expect(said, `pressing ${oneLevel} on a row with nothing to bring back said nothing at all`).not.toBe('')

  const reasons = reasonWordsOfDictionary()
  const carried = reasons.filter(
    (one) => (one.ja !== '' && said.includes(one.ja)) || (one.en !== '' && said.includes(one.en)),
  )
  expect(
    carried.map((one) => one.rowId),
    `the notice reads ${JSON.stringify(said)}, and table T-233 row RS-30 is the reason its ` +
      `situation names: ${JSON.stringify(situation)}`,
  ).toEqual(['RS-30'])

  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
})

// ---------------------------------------------------------------------------
// D-91 -- where the weekday tier is ticked
// ---------------------------------------------------------------------------

// GOES RED IF: the tier that prints weekdays is ticked anywhere other than
// exactly where the tier that prints day numbers is ticked -- a different count,
// or the same count at different places. Table T-221 row `LF-1` (MUST NOT, since
// it closes with 「これ以外の間隔を採ってはならない」) says 「年の段は 1 年、年と
// 月の段は 1 か月、週の段は 7 日、**日の段と曜日の段は 1 日**」 and gives the
// reason on the same line: 「同じ軸を 2 段に割ったものだからである ... 別の間隔に
// すると、その日のものでない曜日が日の下に並ぶ」.
//
// ⭐ THE TICKS, NOT THE WORDS. `LF-1` gives each tier an interval, and what is
// drawn at that interval is the tick; the words are read only to say which tier
// is which, and they are read out of the dictionary rather than spelled here.
// ⚠️ ONLY THE FINEST STAGE HAS A WEEKDAY TIER, so the case presses the enlarging
// entrance until the band stands on three tiers rather than a fixed number of
// times: measured 2026-09-03, this build needs eighteen presses from start-up
// and the case reaches it from wherever the case above left the zoom.
test('D-91: the weekday tier of the ruler is ticked exactly where the day tier is', async () => {
  test.setTimeout(240_000)
  const page = shared()

  const finer = entranceBy(T109_PURPOSE, TIME_AXIS, ZOOM_IN)
  let tiers = await rulerTiers(page)
  for (let step = 0; step < 60 && tiers.length < 3; step += 1) {
    expect(await pressEntrance(page, finer), `${finer} is not on the screen`).toBe(true)
    tiers = await rulerTiers(page)
  }
  expect(
    tiers.length,
    `the ruler never came to stand on three tiers, so the stage that has a weekday tier at all ` +
      `was never reached; the band stands on ${tiers.length}`,
  ).toBe(3)

  // ⚠️ THE TICKS ARRIVE BEFORE THE WORDS. Measured 2026-09-03: a reading taken
  // the instant the third tier appeared saw all three tiers ticked and not one
  // word in any of them. The loop above stops on the ticks, so the drawing is
  // waited out before the words are read.
  await readSettledDrawnSvg(page)
  tiers = await rulerTiers(page)
  expect(tiers, 'the ruler fell back to fewer tiers while it was settling').toHaveLength(3)

  const weekdays = weekdayWords()
  const isWeekdayTier = (tier: RulerTier): boolean =>
    tier.words.length > 0 && tier.words.every((said) => weekdays.includes(said))
  const isDayTier = (tier: RulerTier): boolean =>
    tier.words.length > 0 && tier.words.every((said) => /^\d{1,2}$/.test(said))

  const weekdayTiers = tiers.filter(isWeekdayTier)
  const dayTiers = tiers.filter(isDayTier)
  expect(
    weekdayTiers.length,
    `the ruler stands on three tiers and ${weekdayTiers.length} of them print the weekday words the ` +
      'dictionary holds; this case needs exactly one',
  ).toBe(1)
  expect(
    dayTiers.length,
    `${dayTiers.length} tiers print bare day numbers; this case needs exactly one`,
  ).toBe(1)
  const weekday = weekdayTiers[0] as RulerTier
  const day = dayTiers[0] as RulerTier

  expect(
    weekday.ticks.length,
    `the day tier is divided by ${day.ticks.length} ticks and the weekday tier by ` +
      `${weekday.ticks.length}; LF-1 gives both of them one day`,
  ).toBe(day.ticks.length)
  expect(
    weekday.ticks,
    'the weekday tier is ticked at other places than the day tier, so the two are not on the same ' +
      'interval and a weekday would stand under a day that is not its own',
  ).toEqual(day.ticks)

  // ⭐ THE COARSE TIER IS READ TOO, so that a build which ticked every tier the
  // same would fail here rather than pass the comparison above.
  const coarse = tiers.filter((tier) => tier !== weekday && tier !== day)
  expect(coarse, 'the three tiers are not one coarse and the two fine ones').toHaveLength(1)
  expect(
    (coarse[0] as RulerTier).ticks.length,
    `the coarsest tier is divided by as many ticks as the day tier (${day.ticks.length}), and LF-1 ` +
      'gives it one month',
  ).toBeLessThan(day.ticks.length)

  // `LF-1` opens with 「段階ごとに固定とし」, so one interval and not several.
  const gaps = day.ticks.slice(1).map((one, at) => Math.round((one - (day.ticks[at] as number)) * 10) / 10)
  const distinct = [...new Set(gaps)]
  expect(
    distinct.length,
    `the day tier is ticked at ${distinct.length} different intervals (${distinct.slice(0, 6).join(', ')}px), ` +
      'and LF-1 fixes one interval per tier',
  ).toBeLessThanOrEqual(2)
})

// ---------------------------------------------------------------------------
// D-24 -- what a fit throws away, and what it lands on
// ---------------------------------------------------------------------------

// GOES RED IF: a fit leaves a row folded that a person had folded, or the rows
// it lands on run off the bottom of the drawing. The first run of table T-068's
// two says 「人が畳んだ状態をすべて捨て（表 T-051 の `HF-8`）...」 and `FR-055`
// gives the same in its own words 「本要求は、人が畳んだ状態をすべて捨てる ——
// 捨てないと、畳まれた行のぶんだけ「全体」が縮み、収める対象が人の操作で変わって
// しまう」; the STATEMENT has the zoom and the position brought to where the whole
// is in.
//
// ⛔ HOW MANY TIMES THE TABLE RAN CANNOT BE MEASURED HERE, and that is the row's
// own finding rather than this case's gap. The two runs of table T-068 differ in
// nothing a reader can see -- the second exists to retreat one depth when the
// first picked one that needs a zoom above `FR-094`'s floor -- and the shipped
// build publishes no count. The ledger's own 実物確認 column says the same of
// the seam: 「継ぎ目が回数を公開しておらず」. What is pressed here is the pair of
// things the two runs are FOR, both of which are MUSTs and both of which a
// reader can see.
//
// ⚠️ THE ESCAPE CLAUSE IS READ AS WELL. `FR-055` (STATEMENT) says in as many
// words 「ただし必ず収まることを保証しない。収まらない軸にはスクロールを残す
// こと」, and the depth it may not go below is one -- so what is asserted is that
// the rows fit OR that the drawing is already at depth 1.
test('D-24: a fit throws away what a person folded, and the rows it lands on fit', async () => {
  test.setTimeout(240_000)
  const page = shared()

  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  const foldAll = entranceBy(T109_SOURCE, 'HF-11')
  const fit = entranceBy(T109_SOURCE, 'FR-055')

  const firstRow = async (): Promise<{ said: string; nameX: number; nameY: number; top: number } | null> =>
    page.evaluate(() => {
      const found = Array.from(document.querySelectorAll('[data-depth]')).sort(
        (one, two) => one.getBoundingClientRect().top - two.getBoundingClientRect().top,
      )[0]
      if (found === undefined) return null
      const box = found.getBoundingClientRect()
      return {
        said: (found.textContent ?? '').replace(/\s+/g, ' ').trim(),
        nameX: box.x + 30,
        nameY: box.y + box.height / 2,
        top: box.top,
      }
    })

  const before = await firstRow()
  expect(before, 'the row title panel drew no rows to fold').not.toBeNull()
  if (before === null) return

  // ⛔ A ROW'S OWN ENTRANCES ARE HIDDEN UNTIL THE POINTER IS ON ITS NAME
  // (table T-051 row `HF-6`), which the case for D-166 records as well.
  await page.mouse.move(before.nameX, before.nameY)
  await page.waitForTimeout(500)
  const at = await page.evaluate(
    (asked: { entrance: string; top: number }) => {
      const found = Array.from(document.querySelectorAll(`[data-icon="${asked.entrance}"]`)).find(
        (one) => Math.abs(one.getBoundingClientRect().top - asked.top) < 40,
      )
      if (found === undefined) return null
      const box = found.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    { entrance: foldAll, top: before.top },
  )
  expect(at, `${foldAll} is not drawn on the first row even with the pointer on its name`).not.toBeNull()
  if (at === null) return
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(1000)

  const folded = await firstRow()
  expect(folded, 'the first row went off the screen when it was folded').not.toBeNull()
  if (folded === null) return
  expect(
    folded.said,
    `folding what is under ${JSON.stringify(before.said)} changed nothing the row says, so this ` +
      'case cannot tell afterwards whether the fold was thrown away',
  ).not.toBe(before.said)

  expect(await pressEntrance(page, fit), `${fit} is not on the screen`).toBe(true)
  await readSettledDrawnSvg(page)

  const after = await firstRow()
  expect(after, 'the first row went off the screen when the whole was fitted').not.toBeNull()
  if (after === null) return
  expect(
    after.said,
    `after a fit the row still reads ${JSON.stringify(after.said)} and not ` +
      `${JSON.stringify(before.said)}; the first run of table T-068 throws every fold a person made ` +
      'away, and FR-055 gives the reason -- a fold left standing shrinks what "the whole" means',
  ).toBe(before.said)

  const landed = await page.evaluate((canvas: string) => {
    const svg = document.querySelector(canvas)
    const rows = Array.from(document.querySelectorAll('[data-depth]'))
    if (svg === null || rows.length === 0) return null
    return {
      count: rows.length,
      deepest: Math.max(...rows.map((row) => Number(row.getAttribute('data-depth') ?? '0'))),
      bottom: Math.max(...rows.map((row) => row.getBoundingClientRect().bottom)),
      floor: svg.getBoundingClientRect().bottom,
    }
  }, CANVAS)
  expect(landed, 'nothing is drawn after the fit').not.toBeNull()
  if (landed === null) return
  expect(landed.count, 'the fit left no row on the screen at all').toBeGreaterThan(0)
  expect(
    landed.bottom <= landed.floor + 1 || landed.deepest <= 1,
    `the fit left the last row ending at y=${Math.round(landed.bottom)} with the drawing ending at ` +
      `y=${Math.round(landed.floor)}, at depth ${landed.deepest}; FR-055 has the deepest depth that ` +
      'fits taken, and only depth 1 may be left over the edge',
  ).toBe(true)
})

// ---------------------------------------------------------------------------
// D-52, D-66 and the second half of D-65 -- the page whose dialogue is answered
// ---------------------------------------------------------------------------

// ⛔ WHY THESE THREE STAND APART. A page's clock and the dialogue it calls are
// both fixed when its context is made, so they cannot be given to the page the
// eleven cases above share. They run on one further context of the SAME
// browser, one fresh page each: a fresh page is a fresh document, which is what
// keeps a write made by one of them out of the other's reading.

// GOES RED IF: the picture written out with something selected differs by one
// byte from the picture written out with nothing selected -- or if selecting
// something did not change the screen, which is the control that makes the
// first half mean anything. Table T-076 row `EP-12` puts `Selection` (`U-39`)
// among the things the written picture does not draw, and gives its reason:
// what is selected 「指している場所と構えを表すものであり、日程ではない」.
//
// ⭐ THE TWO PICTURES ARE COMPARED WHOLE, character for character. The ledger
// records why: a `Grab Point` has no row fixing what it is drawn as, so it
// cannot be looked for by tag, and only a difference between two productions
// catches it. The same comparison covers the dashed frame, the thickened line
// and anything a later round hangs off the selection.
test('D-52: the written picture is the same whether or not something is selected', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const chooser = entranceBy(T109_SOURCE, 'FR-096')

    const screenNow = async (): Promise<string> => readSettledDrawnSvg(page)
    const writeOne = async (): Promise<void> => {
      expect(await pressEntrance(page, chooser), `${chooser} is not on the screen`).toBe(true)
      await page.waitForTimeout(900)
      const at = await page.evaluate(() => {
        const surface = document.querySelector('[data-role="Export Chooser"]')
        if (surface === null) return null
        const wanted = Array.from(surface.querySelectorAll('button')).find((one) =>
          (one.textContent ?? '').includes('.svg'),
        )
        if (wanted === undefined) return null
        const box = wanted.getBoundingClientRect()
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      })
      expect(at, 'the export chooser offers nothing that writes an .svg').not.toBeNull()
      if (at === null) return
      await page.mouse.move(at.x, at.y)
      await page.mouse.down()
      await page.mouse.up()
    }

    const withNothing = await screenNow()
    await writeOne()
    await until(page, () => readWrites(page), (seen) => seen.bodies.length === 1, 'the first picture is written')

    const bar = await firstBarOnScreen(page)
    expect(bar, 'no task bar has a middle on the screen to select').not.toBeNull()
    if (bar === null) return
    await page.mouse.move(bar.x, bar.y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(900)
    const withOne = await screenNow()

    // ⛔ THE CONTROL. If pressing the bar selected nothing, the two pictures
    // below would be equal for a reason that has nothing to do with `EP-12`.
    expect(
      withOne === withNothing,
      'pressing a task bar changed nothing on the screen, so nothing was selected and the ' +
        'comparison below would prove nothing',
    ).toBe(false)

    await writeOne()
    const wrote = await until(
      page,
      () => readWrites(page),
      (seen) => seen.bodies.length === 2,
      'the second picture is written',
    )

    const [plain, selected] = wrote.bodies
    expect(plain ?? '', 'the first written picture is empty').not.toBe('')
    expect((plain ?? '').startsWith('<svg'), 'what was written is not an SVG').toBe(true)
    expect(
      (selected ?? '').length,
      `the picture written with something selected is ${(selected ?? '').length} characters and ` +
        `the one written with nothing selected is ${(plain ?? '').length}; EP-12 has the written ` +
        'picture draw no Selection at all',
    ).toBe((plain ?? '').length)
    expect(
      selected === plain,
      'the two written pictures differ, so something about what was selected reached the file',
    ).toBe(true)
  } finally {
    await opened.close()
  }
})

// GOES RED IF: a second save asks again where to write, or writes to a
// different file, or the header never comes to name the file that was written.
// `FR-101` (MUST) has the name of the file now open shown on the screen;
// `FR-060` holds the handle a save was given; and table T-227 row `DI-5` (MUST
// NOT) forbids asking every time. The ledger's own reading of this row is that
// the second save WAS succeeding and nothing on the screen said so.
//
// ⛔ WHAT THIS DOES NOT SETTLE. The dialogue answered here is a replacement, so
// the case measures what the build does once it holds a handle. Whether the
// host's own handle is accepted is a question about `src/`, which the writer of
// a test may not read (rule 04 section 1); the ledger's own note asks the user
// to press it, and that request stands.
test('D-66: a second save writes again to the same file, and asks no second time', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const saveKey = pressable(cellOf(T036, 'SK-11', T036_ASSIGNMENT, T036_COLUMNS))

    const before = await readWrites(page)
    expect(before.asked, 'the replaced save dialogue is not in place on this page').toBe(0)
    expect(before.files, 'something had already been written before the case pressed anything').toEqual([])

    await page.mouse.move(Math.round(BASE_SCREEN.width * 0.5), Math.round(BASE_SCREEN.height * 0.6))
    await page.keyboard.press(saveKey)
    const once = await until(page, () => readWrites(page), (seen) => seen.files.length === 1, 'the first save writes')
    expect(once.asked, `the first ${saveKey} asked ${once.asked} times where to write`).toBe(1)

    await page.keyboard.press(saveKey)
    const twice = await until(page, () => readWrites(page), (seen) => seen.files.length === 2, 'the second save writes')

    expect(
      twice.asked,
      `the second ${saveKey} opened the save dialogue again (asked ${twice.asked} times); FR-060 ` +
        'holds the handle and DI-5 (MUST NOT) forbids asking every time',
    ).toBe(1)
    expect(
      twice.files[1],
      'the second save wrote to a different file than the first',
    ).toBe(twice.files[0])

    const named = await until(
      page,
      async () =>
        page.evaluate(
          (asked: { name: string; at: string }) => ({
            name: (document.querySelector(asked.name)?.textContent ?? '').trim(),
            at: (document.querySelector(asked.at)?.textContent ?? '').trim(),
          }),
          { name: HEADER_FILE_NAME, at: HEADER_SAVED_AT },
        ),
      (seen) => seen.name !== '',
      'the header names the file that was written',
    )
    expect(
      named.name,
      `the header names ${JSON.stringify(named.name)} and the file written was ` +
        `${JSON.stringify(twice.files[0])}`,
    ).toContain(twice.files[0] ?? '')
    expect(
      neverSavedWords().some((one) => named.at.includes(one)),
      `the header still says ${JSON.stringify(named.at)} after two successful writes`,
    ).toBe(false)
  } finally {
    await opened.close()
  }
})

// GOES RED IF: the time the header prints is the UTC one rather than the
// reader's own. `FR-101` (MUST) says 「画面に出す時刻は、読む人のローカル時刻と
// すること（MUST）。保管は UTC のままとすること（MUST）」 and (MUST NOT) 「画面に
// UTC をそのまま出してはならない（MUST NOT）」.
//
// ⭐ NO FORMAT IS ASSERTED, because the requirement asserts none: 「時刻の綴り
// そのものは本書が定めない」. What is asked is that the hour and minute printed
// are an hour and minute of the reader's clock in the last few minutes, and are
// none of the same minutes read in UTC. The case first makes the page say what
// its offset is and refuses to judge on a machine where it is zero.
test('D-65: the time the header prints is the reader own clock, not UTC', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const saveKey = pressable(cellOf(T036, 'SK-11', T036_ASSIGNMENT, T036_COLUMNS))

    await page.mouse.move(Math.round(BASE_SCREEN.width * 0.5), Math.round(BASE_SCREEN.height * 0.6))
    await page.keyboard.press(saveKey)
    await until(page, () => readWrites(page), (seen) => seen.files.length === 1, 'the save writes')

    const shown = await until(
      page,
      async () =>
        page.evaluate(
          (wanted: string) => (document.querySelector(wanted)?.textContent ?? '').trim(),
          HEADER_SAVED_AT,
        ),
      (seen) => !neverSavedWords().some((one) => seen.includes(one)) && seen !== '',
      'the header replaces the never-written word with a time',
    )

    const clocks = await page.evaluate(() => {
      const pad = (value: number): string => String(value).padStart(2, '0')
      const now = Date.now()
      const local: string[] = []
      const utc: string[] = []
      for (let back = 0; back <= 5; back += 1) {
        const at = new Date(now - back * 60_000)
        local.push(`${pad(at.getHours())}:${pad(at.getMinutes())}`)
        utc.push(`${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}`)
      }
      return { local, utc, offsetMinutes: new Date().getTimezoneOffset() }
    })

    expect(
      clocks.offsetMinutes,
      'the page is running on UTC, so a local reading and a UTC reading are the same string and ' +
        'this case cannot tell them apart',
    ).not.toBe(0)
    expect(
      clocks.local.filter((one) => clocks.utc.includes(one)),
      'the two clocks share a reading in the window this case looks at',
    ).toEqual([])

    expect(
      clocks.local.filter((one) => shown.includes(one)),
      `the header prints ${JSON.stringify(shown)}, and none of the last few minutes of the ` +
        `reader clock (${clocks.local.join(', ')}) is in it`,
    ).not.toEqual([])
    expect(
      clocks.utc.filter((one) => shown.includes(one)),
      `the header prints ${JSON.stringify(shown)}, which carries a UTC reading; FR-101 (MUST NOT) ` +
        'forbids putting UTC on the screen',
    ).toEqual([])
  } finally {
    await opened.close()
  }
})

// GOES RED IF: the key of table T-036 row `SK-11` writes something that is not
// `GRS JSON`, or opens the dialogue a second time, or writes to a second file,
// or puts a question on the screen on either press. `SK-11` says 「`FR-096` の
// 定めにより `GRS JSON` で書く。上書き先は `FR-060`」, and table T-227 row `DI-5`
// (MUST) has the route of `FR-060` ask nothing.
//
// ⭐ WHAT THIS ADDS OVER D-66, which presses the same key. That case is about
// the header catching up with the write; this one is about WHAT IS IN THE FILE
// and about the question that must not be asked -- the ledger's own reading of
// D-97 is that the path existed and 「誰も試していなかった」, because every
// earlier test drove the arm that sends `FR-096` to the chooser instead.
// ⛔ IT PROVES ONE HALF, for the reason `openStubbedPage` gives: the dialogue is
// a replacement, so what is measured is what the build does once it holds a
// handle.
test('D-97: the save key writes GRS JSON, and a second press overwrites with no question', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const saveKey = pressable(cellOf(T036, 'SK-11', T036_ASSIGNMENT, T036_COLUMNS))
    // Table T-024 row `IO-2` gives `GRS JSON` its ending and the first
    // character a reader sees at the head of the file.
    const opensWith = assignmentText(cellOf(T024, 'IO-2', T024_FIRST_CHARACTER, T024_COLUMNS))
    expect(opensWith, 'table T-024 row IO-2 names no first character').not.toBe('')

    const surfaces = async (): Promise<string[]> =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-role]'))
          .map((marked) => marked.getAttribute('data-role') ?? '')
          .sort(),
      )
    const wasSurfaces = await surfaces()

    await page.mouse.move(Math.round(BASE_SCREEN.width * 0.5), Math.round(BASE_SCREEN.height * 0.6))
    await page.keyboard.press(saveKey)
    const once = await until(page, () => readWrites(page), (seen) => seen.files.length === 1, 'the save writes')
    expect(once.asked, `the first ${saveKey} asked ${once.asked} times where to write`).toBe(1)

    const body = once.bodies[0] ?? ''
    expect(body, `${saveKey} wrote an empty file`).not.toBe('')
    expect(
      body.trimStart().startsWith(opensWith),
      `${saveKey} wrote a file opening ${JSON.stringify(body.slice(0, 24))}, and table T-024 row ` +
        `IO-2 has GRS JSON open with ${JSON.stringify(opensWith)}`,
    ).toBe(true)
    const held: unknown = JSON.parse(body)
    expect(
      typeof held === 'object' && held !== null && !Array.isArray(held),
      'what SK-11 wrote parses, but not as an object a document could be held in',
    ).toBe(true)

    await page.keyboard.press(saveKey)
    const twice = await until(
      page,
      () => readWrites(page),
      (seen) => seen.files.length === 2,
      'the second save writes',
    )
    expect(
      twice.asked,
      `the second ${saveKey} opened the dialogue again (asked ${twice.asked} times); SK-11 sends the ` +
        'overwrite to FR-060 and table T-227 row DI-5 (MUST) has that route ask nothing',
    ).toBe(1)
    expect(twice.files[1], 'the second press wrote to a different file than the first').toBe(twice.files[0])
    expect(
      (twice.bodies[1] ?? '').length,
      'the second press wrote a file of a different length, and nothing was edited between the two',
    ).toBe(body.length)

    expect(
      await surfaces(),
      `pressing ${saveKey} twice put a surface on the screen; DI-5 (MUST) has this route ask nothing`,
    ).toEqual(wasSurfaces)
    expect(await readNotices(page), `pressing ${saveKey} twice raised a notice`).toEqual([])
  } finally {
    await opened.close()
  }
})

// GOES RED IF: a picture whose height would pass `S-217` is written anyway, or
// is refused with a reason other than `RS-43`, or if one of the three formats
// that are not pictures is refused in the same breath. `FR-025` (MUST) says
// 「⛔⛔ **伸ばしても `S-217` に収まらないときは、画像を書き出さないこと（MUST）。
// 一部だけを描いてはならない（MUST NOT）** ... **理由を告げること（MUST）。理由は
// 表 T-233 の `RS-43` とすること（MUST）**」 and names who is stopped:
// 「⚠️ **止めるのは 表 T-024 の `IO-3`（SVG）・`IO-4`（PNG）・`IO-6`（クリップ
// ボード）である** —— **`IO-1` / `IO-2` / `IO-7` は絵ではないので、高さの天井に
// 当たらない**」.
//
// ⛔ THE SCREEN IS NOT `MC-6` HERE, AND THAT IS THE POINT. `FR-025` fixes the
// written width at `S-81`'s and `FR-080` fixes the ratio from the screen, so the
// height a picture wants is the screen's shape and not the document's size --
// the ledger's own measurement records 1600x1120 for a 1000x700 screen at 50
// rows and at 1600. A screen shaped past `S-217 / S-81` therefore reaches the
// ceiling and no document can. The case works the shape out of the two rows
// rather than writing a viewport down, and guards that it really did pass.
//
// ⚠️ `IO-6` IS NOT PRESSED. It writes to the clipboard, which a driven browser
// has no answer for, and the two pictures that go to a file settle the rule.
test('D-220: a picture too tall to draw is refused as RS-43, and the other formats still write', async () => {
  test.setTimeout(300_000)
  const width = 600
  const height = Math.ceil(width * (EXPORT_HEIGHT_CAP / EXPORT_WIDTH)) + 64
  const wants = Math.round((EXPORT_WIDTH / width) * height)
  expect(
    wants,
    `a ${width}x${height} screen asks for a picture ${wants}px high, and S-217 caps it at ` +
      `${EXPORT_HEIGHT_CAP}px -- this case needs a shape that passes the cap`,
  ).toBeGreaterThan(EXPORT_HEIGHT_CAP)

  const opened = await openStubbedPage({ width, height })
  try {
    const page = opened.page
    const chooser = entranceBy(T109_SOURCE, 'FR-096')
    const reasons = reasonWordsOfDictionary()
    const endingOf = (row: string): string =>
      assignmentText(cellOf(T024, row, T024_ENDING, T024_COLUMNS))
    const carried = async (): Promise<string[]> => {
      const said = (await readNotices(page)).join(' ')
      return reasons
        .filter((one) => (one.ja !== '' && said.includes(one.ja)) || (one.en !== '' && said.includes(one.en)))
        .map((one) => one.rowId)
    }
    const clear = async (): Promise<void> => {
      // `NT-8` (MUST) has `Esc` take the newest notice down, and the same key
      // closes the chooser through `IN-4` of table T-028.
      for (let step = 0; step < 4; step += 1) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    }

    // The two that are pictures.
    for (const row of ['IO-3', 'IO-4']) {
      const ending = endingOf(row)
      expect(
        await pressExportFormat(page, chooser, ending),
        `the chooser offers nothing that writes ${ending} (table T-024 row ${row})`,
      ).toBe(true)
      await page.waitForTimeout(3000)
      const wrote = await readWrites(page)
      expect(
        wrote.files,
        `${row} (${ending}) wrote a file on a screen whose picture would be ${wants}px high, and ` +
          `FR-025 (MUST) has it not written at all past S-217 (${EXPORT_HEIGHT_CAP}px)`,
      ).toEqual([])
      expect(
        wrote.asked,
        `${row} (${ending}) opened the save dialogue before finding out it could not draw`,
      ).toBe(0)
      expect(
        await carried(),
        `the refusal of ${row} carries a reason other than RS-43, which FR-025 (MUST) names`,
      ).toEqual(['RS-43'])
      await clear()
    }

    // The three that are not pictures, in the same situation.
    let written = 0
    for (const row of ['IO-2', 'IO-1', 'IO-7']) {
      const ending = endingOf(row)
      expect(
        await pressExportFormat(page, chooser, ending),
        `the chooser offers nothing that writes ${ending} (table T-024 row ${row})`,
      ).toBe(true)
      written += 1
      const wrote = await until(
        page,
        () => readWrites(page),
        (seen) => seen.files.length === written,
        `${row} (${ending}) writes on a screen where a picture may not be drawn`,
      )
      expect(
        (wrote.bodies[written - 1] ?? '').length,
        `${row} (${ending}) wrote an empty file`,
      ).toBeGreaterThan(0)
      expect(
        await carried(),
        `${row} (${ending}) raised a reason of table T-233, and FR-025 says it does not meet the ` +
          'height ceiling at all because it is not a picture',
      ).toEqual([])
      await clear()
    }
  } finally {
    await opened.close()
  }
})

/** How many days a month holds. @purity pure */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Table T-238 (`FR-017`) -- what each tier of the ruler prints, read at read time. */
const T238: SpecTable = specTable('T-238')
/** Columns of table T-238 after the row ID: the tier, then its three lines. */
const T238_COLUMNS = 4
const T238_FIRST_LINE = 1
const T238_SECOND_LINE = 2

/** One line of a tier as table T-238 writes it, back-quotes taken off. @purity pure */
function tierLine(rowId: string, column: number): string {
  return cellOf(T238, rowId, column, T238_COLUMNS).replace(/`/g, '').trim()
}

/**
 * The day one month on from the day given, as `FR-001` (MUST) settles it:
 * 「1 単位を足した先が暦に無い日になるときは、その月の末日とすること（MUST）。
 * 翌月へこぼしてはならない（MUST NOT）」.
 *
 * @purity pure
 */
function oneMonthOn(day: string): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number]
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const landed = Math.min(date, daysInMonth(nextYear, nextMonth))
  const two = (value: number): string => String(value).padStart(2, '0')
  return `${nextYear}-${two(nextMonth)}-${two(landed)}`
}

// GOES RED IF: a click on the schedule while the ruler is stepping in months
// makes a task that ends on a day of the month after the one clicked, rather
// than on the last day of that month, when the day clicked does not exist there.
// `FR-001` (MUST) says 「クリックしたときは、押した日を起点に、いま目盛が刻んで
// いる最も細かい段の 1 単位ぶんのタスクを作ること（MUST）」 and 「⛔⛔ **1 単位を
// 足した先が暦に無い日になるときは、その月の末日とすること（MUST）** ... ⛔ **翌月
// へこぼしてはならない（MUST NOT）**」.
//
// ⭐ A CONTROL IS PRESSED AS WELL -- the fifteenth of the same month. Without it
// a build that clamped EVERY click to the end of the month would pass, and the
// clamp would be hiding a second defect rather than settling this row.
//
// ⚠️ WHICH MONTH IS TAKEN OFF THE RULER, not written here: the case looks along
// the tier the build is drawing for a month of 31 days whose successor is
// shorter, so the document may move its dates without moving this case.
test('D-210: on the month tier, a click on a day the next month has not lands on its last day', async () => {
  test.setTimeout(300_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const coarser = entranceBy(T109_PURPOSE, TIME_AXIS, ZOOM_OUT)
    const rectangle = entranceBy(T109_PURPOSE, 'SH-1')

    // ⚠️ WHICH TIER IS THE MONTH ONE IS READ OFF ITS FIRST LINE'S SHAPE. Table
    // T-238 (`FR-017`, MUST, 利用者の裁定 2026-09-03) says what each 段 prints:
    // `TM-1` 年 prints `yyyy`; `TM-2` 月 prints `yyyy` over `m`; `TM-3` 週 prints
    // `yyyy-mm` over `d`; `TM-4` 日 adds a 曜 under those two.
    //
    // ⛔ COUNTING THE TIERS CANNOT TELL THEM APART -- `TM-2` and `TM-3` both
    // stand on two, one because the year and the month were split and one
    // because they were folded and the week joined them.
    // ⛔ NOR CAN THE SECOND LINE -- a bare month number and a bare day of the
    // month are the same shape.
    // ⭐ THE FIRST LINE IS WHERE THEY DIFFER: `yyyy` alone at the month 段 and
    // `yyyy-mm` at the week and day ones, because FR-017 keeps the fold「畳みが
    // 要るのは `TM-3` と `TM-4` だけであり」. tests/unit/uf-32-ruler-band.test.ts
    // reached the same answer for the drawing helper, and a system test can take
    // it too: these shapes are digits and a hyphen, and FR-017 (MUST NOT) says
    // 「月を語で書いてはならない」exactly so that no language moves them.
    // ⛔⛔ THIS CASE USED TO LOOK FOR ONE TIER OF `YYYY-MM`, which was the whole
    // of the 2026-08-27 ruling and is now only `TM-3` and `TM-4`; the month 段
    // it was waiting for stopped existing on 2026-09-03 and the case went red at
    // its own precondition without the behaviour below ever being asked.
    expect(
      [
        tierLine('TM-2', T238_FIRST_LINE),
        tierLine('TM-2', T238_SECOND_LINE),
        tierLine('TM-3', T238_FIRST_LINE),
      ],
      'table T-238 no longer prints `yyyy` over `m` at the month tier and `yyyy-mm` at the week ' +
        'one, so the shapes this case tells the two apart by are no longer the table',
    ).toEqual(['yyyy', 'm', 'yyyy-mm'])

    const printsOnly = (line: RulerTier, shape: RegExp): boolean =>
      line.words.length > 0 && line.words.every((said) => shape.test(said))
    const monthly = (
      lines: readonly RulerTier[],
    ): { years: RulerTier; months: RulerTier } | null => {
      if (lines.length !== 2) return null
      const [years, months] = lines as [RulerTier, RulerTier]
      // `yyyy` and not `yyyy-mm` on the first line, a bare number on the second.
      if (!printsOnly(years, /^\d{4}$/) || !printsOnly(months, /^\d{1,2}$/)) return null
      return { years, months }
    }
    // ⚠️ THE DRAWING IS SETTLED BEFORE IT IS READ. D-91 measured the ticks of a
    // fresh stage arriving before any of its words; the reading below turns on
    // the words, so a half-drawn frame would answer null and the loop would zoom
    // past the stage it is looking for.
    await readSettledDrawnSvg(page)
    let seen = await rulerTiers(page)
    let stage = monthly(seen)
    for (let step = 0; step < 20 && stage === null; step += 1) {
      expect(await pressEntrance(page, coarser), `${coarser} is not on the screen`).toBe(true)
      await readSettledDrawnSvg(page)
      seen = await rulerTiers(page)
      stage = monthly(seen)
    }
    expect(
      stage,
      'the ruler never came to stand on the month tier of table T-238 -- `yyyy` on the first line ' +
        'and a bare month number on the second -- so the stage FR-001 is about was never reached; ' +
        `the band last stood on ${JSON.stringify(seen.map((one) => one.words.slice(0, 4)))}`,
    ).not.toBeNull()
    if (stage === null) return
    const { years, months: tier } = stage

    // Each tick of the month line opens a month, and the number that follows it
    // names that month. ⭐ THE YEAR IS NOT ON THAT LINE: `TM-2` gives it a line
    // of its own, ticked once a year (measured: one tick, two words), so it
    // cannot be paired tick for tick. What is taken is the year the leftmost
    // tick stands in -- the first word of that line, which the drawing clamps to
    // the view's left edge exactly as it clamps the first month -- and the
    // roll-over from 12 to 1 carries the year on from there.
    expect(
      tier.words.length,
      `the month line is divided by ${tier.ticks.length} ticks and prints ${tier.words.length} ` +
        'numbers; this case reads the number that follows each tick by position',
    ).toBe(tier.ticks.length)
    const opening = Number(years.words[0] ?? '')
    expect(
      Number.isInteger(opening),
      `the first line of the ruler prints ${JSON.stringify(years.words)}, and this case needs the ` +
        'year its leftmost tick stands in',
    ).toBe(true)
    let running = opening
    const months = tier.ticks.map((x, at) => {
      const month = Number(tier.words[at] ?? '')
      if (at > 0 && month < Number(tier.words[at - 1] ?? '')) running += 1
      return {
        x,
        next: tier.ticks[at + 1] ?? null,
        label: `${running}-${String(month).padStart(2, '0')}`,
      }
    })
    const clamping = months.find((one, at) => {
      if (one.next === null || !/^\d{4}-\d{2}$/.test(one.label)) return false
      const [year, month] = one.label.split('-').map(Number) as [number, number]
      const following = at + 1
      return (
        daysInMonth(year, month) === 31 &&
        daysInMonth(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1) < 31 &&
        months[following] !== undefined
      )
    })
    expect(
      clamping,
      `the ruler shows ${months.map((one) => one.label).join(', ')}, and none of them has 31 days ` +
        'with a shorter month after it -- there is nothing on the screen the clamp could apply to',
    ).not.toBeUndefined()
    if (clamping === undefined || clamping.next === null) return

    const [year, month] = clamping.label.split('-').map(Number) as [number, number]
    const pxPerDay = (clamping.next - clamping.x) / daysInMonth(year, month)

    const made: Array<{ aimed: number; start: string; finish: string }> = []
    for (const day of [15, 31]) {
      expect(await pressEntrance(page, rectangle), `${rectangle} is not on the screen`).toBe(true)
      const x = Math.round(clamping.x + (day - 1) * pxPerDay + pxPerDay / 2)
      let read: { start: string; finish: string; name: string } | null = null
      // ⚠️ THE HEIGHT IS SWEPT, NOT CHOSEN. `FR-001` makes a task only where the
      // press falls on no item at all, and which heights are free depends on
      // what the document draws; the first one that makes a shape is taken.
      for (const y of [980, 940, 900, 860, 800, 740, 680, 620, 560, 500, 440, 380, 320, 260]) {
        const before = await drawnShapes(page)
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.mouse.up()
        await page.waitForTimeout(900)
        const after = await drawnShapes(page)
        const fresh = after
          .filter((one) => !before.includes(one))
          .map((one) => one.split(',').map(Number))
          .filter((box) => (box[2] ?? 0) > 20 && (box[3] ?? 0) > 6)
          .sort((one, two) => (two[2] ?? 0) - (one[2] ?? 0))[0]
        if (fresh === undefined) continue
        const middle = { x: (fresh[0] ?? 0) + (fresh[2] ?? 0) / 2, y: (fresh[1] ?? 0) + (fresh[3] ?? 0) / 2 }
        await doubleClickBar(page, middle)
        read = await panelDates(page)
        break
      }
      expect(read, `no press at x=${x} made a task, so the ${day}th was never asked for`).not.toBeNull()
      if (read === null) return
      made.push({ aimed: day, start: read.start, finish: read.finish })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }

    for (const one of made) {
      expect(
        one.start,
        `the case aimed at the ${one.aimed}th of ${clamping.label} and the task starts on ` +
          `${one.start}; the reading below would be about another day`,
      ).toBe(`${clamping.label}-${String(one.aimed).padStart(2, '0')}`)
      expect(
        one.finish,
        `a click on ${one.start} made a task ending on ${one.finish}; FR-001 (MUST) puts the end one ` +
          'month on, at the last day of that month when the day itself is not in it, and (MUST NOT) ' +
          'forbids spilling into the month after',
      ).toBe(oneMonthOn(one.start))
    }

    // ⭐ THE TWO READINGS MUST DIFFER IN KIND, or the case has not shown a clamp.
    const clamped = made.find((one) => one.aimed === 31)
    const plain = made.find((one) => one.aimed === 15)
    expect(clamped?.finish.slice(-2), 'the 31st was not clamped to the end of the following month').not.toBe('31')
    expect(plain?.finish.slice(-2), 'the 15th was moved as well, so the clamp is not the rule it stands for').toBe(
      '15',
    )
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// D-49 -- one indent, for the screen and for the written picture
// ---------------------------------------------------------------------------

/** One drawn row: the tier it stands at, the word it shows, and that word's left edge. */
interface DrawnRowTitle {
  readonly depth: number
  readonly name: string
  readonly left: number
}

/**
 * Every row the panel is drawing, with the left edge of its NAME.
 *
 * ⭐ THE NAME AND NOT THE ROW. The row's own box starts at the panel's edge and
 * never moves; what `S-37` pushes is the word inside it, which is what a reader
 * sees as the indent and what `FR-085` measures the room against.
 *
 * @purity semi-pure-b
 */
async function drawnRowTitles(page: Page): Promise<DrawnRowTitle[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map((row) => {
      const span = row.querySelector('span')
      const box = span === null ? null : span.getBoundingClientRect()
      return {
        depth: Number(row.getAttribute('data-depth') ?? '0'),
        name: (span?.textContent ?? '').trim(),
        left: box === null ? Number.NaN : Math.round(box.x * 1000) / 1000,
      }
    }),
  )
}

/**
 * Where the written picture put this word, or `null` when it did not put it
 * exactly once.
 *
 * ⛔ EXACTLY ONCE, AND A SECOND MATCH IS A `null` RATHER THAN THE FIRST ONE. The
 * picture carries the task labels as `<text>` too, so a row whose name also
 * reads as a task's would otherwise be measured off the wrong element, silently.
 *
 * @purity pure
 */
function writtenTitleLeft(picture: string, name: string): number | null {
  const found: number[] = []
  const marks = /<text\b([^>]*)>([^<]*)<\/text>/g
  let one = marks.exec(picture)
  while (one !== null) {
    if ((one[2] ?? '') === name) {
      const at = /\bx="(-?\d+(?:\.\d+)?)"/.exec(one[1] ?? '')
      if (at !== null) found.push(Number(at[1]))
    }
    one = marks.exec(picture)
  }
  return found.length === 1 ? (found[0] ?? null) : null
}

/**
 * The one step per tier a set of readings is made of, or a failure naming them.
 *
 * ⭐ FITTED FROM THE OUTERMOST PAIR AND THEN CHECKED AGAINST EVERY TIER, so that
 * three tiers standing at 0 / 16 / 40 are a failure rather than an average of
 * 20. `left = base + step x depth` is the shape `FR-085` gives the indent.
 *
 * @purity pure
 */
function stepPerTier(byDepth: ReadonlyMap<number, number>, what: string, room: number): number {
  const tiers = [...byDepth.keys()].sort((one, two) => one - two)
  const low = tiers[0] ?? 0
  const high = tiers[tiers.length - 1] ?? 0
  if (tiers.length < 2 || high === low) {
    throw new Error(`${what} shows only the tier(s) ${JSON.stringify(tiers)}, so it holds no step to read`)
  }
  const step = ((byDepth.get(high) ?? 0) - (byDepth.get(low) ?? 0)) / (high - low)
  for (const tier of tiers) {
    const wanted = (byDepth.get(low) ?? 0) + step * (tier - low)
    const seen = byDepth.get(tier) ?? 0
    if (Math.abs(seen - wanted) > room) {
      throw new Error(
        `${what} does not move by one step per tier: tier ${tier} stands at ${seen} and a ` +
          `step of ${step} puts it at ${wanted} -- readings ${JSON.stringify([...byDepth])}`,
      )
    }
  }
  return step
}

// GOES RED IF: the screen and the written picture stop setting a row in by the
// same amount per tier, or either of them stops using `S-37` for it. The ledger
// row D-49 was opened by the user's instruction of 2026-08-26 -- 「1 階層下がる
// ごとに ... インデントしろ」 -- and measured, before CR-287, at screen minus
// picture of -8 / -4 / 0 / +4 / +8 px over tiers 1..5, because each side worked
// the number out for itself. `FR-085` (MUST) names one indent for both:
// 「その行の深さぶんのインデント（`rowTitleIndent`。表 T-201 の `S-37`）」, and
// `S-37` says 「1 段深くなるごとにこの幅だけ字下げする」.
//
// ⛔ THE PICTURE IS WRITTEN SMALLER THAN THE SCREEN, AND THAT IS NOT THE DEFECT.
// `FR-025` (MUST) fixes the written width at `S-81` (table T-204) while this
// page is `MC-6` wide (table T-025), so every length in the file is the screen's
// times `S-81 / MC-6`. The case divides by that ratio -- both numbers read out
// of the manuscript, neither measured off the file -- and guards that the file
// really was written at `S-81` before it does.
//
// ⚠️ THE PANEL IS SCROLLED FIRST, AND THE READING BELOW SAYS WHY. Measured
// 2026-09-03 on the shipped build: with the panel untouched the picture carries
// only the seven `L1` rows, so it holds no second tier and no step can be read
// off it at all; one notch of the wheel and it carries the same rows the screen
// does, at three tiers. ⛔ That difference is NOT what this case is about and it
// is not asserted here -- it is written down so the scroll is not mistaken for
// a convenience.
//
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED: the ledger's remaining 1px. The user's
// wording 「全角 1 文字ぶん」 measures 13.0px against `S-37`'s 16, and moving a
// settings value is a change request, not a disagreement between the two sides.
// Nothing here reads a font size, and every number comes from the manuscript.
test('D-49: the screen and the picture set a row in by the same one tier of S-37', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const chooser = entranceBy(T109_SOURCE, 'FR-096')
    const ending = assignmentText(cellOf(T024, 'IO-3', T024_ENDING, T024_COLUMNS))

    const overPanel = await page.evaluate(() => {
      const one = document.querySelector('[data-role="Row Title Panel"]')
      if (one === null) return null
      const box = one.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    })
    expect(overPanel, 'the row title panel is not on the screen').not.toBeNull()
    if (overPanel === null) return
    await page.mouse.move(overPanel.x, overPanel.y)
    for (let notch = 0; notch < 2; notch += 1) {
      await page.mouse.wheel(0, 200)
      await page.waitForTimeout(250)
    }
    await page.waitForTimeout(600)

    const drawn = await drawnRowTitles(page)
    expect(drawn.length, 'the panel is drawing no rows at all').toBeGreaterThan(1)
    // ⛔ ONLY NAMES THAT STAND ONCE. Two rows reading alike could not be paired
    // with one `<text>` of the picture, and a wrong pairing would be measured
    // rather than reported.
    const once = drawn.filter(
      (row) => drawn.filter((other) => other.name === row.name).length === 1 && row.name !== '',
    )
    expect(once.length, `no row name is unique in ${JSON.stringify(drawn.map((row) => row.name))}`).toBeGreaterThan(1)

    expect(
      await pressExportFormat(page, chooser, ending),
      `the chooser offers nothing that writes ${ending} (table T-024 row IO-3)`,
    ).toBe(true)
    const wrote = await until(
      page,
      () => readWrites(page),
      (seen) => seen.bodies.length === 1,
      'the picture is written',
    )
    const picture = wrote.bodies[0] ?? ''
    expect(picture.startsWith('<svg'), 'what was written is not an SVG').toBe(true)

    // The ratio every length in the file is the screen's times, from the two
    // rows that decide it and from nothing read off the file.
    const width = Number(/^<svg\b[^>]*\bwidth="(-?\d+(?:\.\d+)?)"/.exec(picture)?.[1] ?? '')
    expect(
      width,
      `the picture was written ${width}px wide and FR-025 (MUST) fixes the width at S-81; the ` +
        'ratio this case divides by would be the wrong one',
    ).toBe(EXPORT_WIDTH)
    const ratio = EXPORT_WIDTH / BASE_SCREEN.width

    const onScreen = new Map<number, number>()
    const inPicture = new Map<number, number>()
    const missing: string[] = []
    for (const row of once) {
      const at = writtenTitleLeft(picture, row.name)
      if (at === null) {
        missing.push(row.name)
        continue
      }
      onScreen.set(row.depth, row.left)
      inPicture.set(row.depth, at)
    }
    expect(
      inPicture.size,
      `the picture holds the tier(s) ${JSON.stringify([...inPicture.keys()])} of the rows the ` +
        `screen is drawing, and this case needs two; it wrote none of ${JSON.stringify(missing)}`,
    ).toBeGreaterThan(1)

    // ⚠️ THE ROOM IS FOR THE ROUNDING THE FILE ITSELF DOES -- it writes its
    // coordinates to two decimals -- and for a browser's sub-pixel layout. It is
    // far under the 4px the ledger measured the two sides apart by.
    const room = 0.1
    const screenStep = stepPerTier(onScreen, 'the screen', room)
    const pictureStep = stepPerTier(inPicture, 'the written picture', room) / ratio

    expect(
      Math.abs(screenStep - ROW_INDENT) <= room,
      `the screen sets a row in by ${screenStep}px per tier and S-37 (rowTitleIndent) is ` +
        `${ROW_INDENT}px -- readings ${JSON.stringify([...onScreen])}`,
    ).toBe(true)
    expect(
      Math.abs(pictureStep - ROW_INDENT) <= room,
      `the written picture sets a row in by ${pictureStep}px per tier once the S-81 / MC-6 ratio ` +
        `is taken off, and S-37 is ${ROW_INDENT}px -- readings ${JSON.stringify([...inPicture])}`,
    ).toBe(true)
    expect(
      Math.abs(screenStep - pictureStep) <= room,
      `the screen moves a row in by ${screenStep}px per tier and the picture by ${pictureStep}px; ` +
        'D-49 is exactly the two sides parting company',
    ).toBe(true)
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// D-229 -- the written picture carries the rows a person left standing
// ---------------------------------------------------------------------------

/** One line of the row title panel: the word, where it starts, how far down it stands. */
interface PanelLine {
  readonly name: string
  readonly at: number
  readonly down: number
}

/**
 * The lines the panel is drawing on the screen right now, topmost first.
 *
 * ⭐ THE NAME'S OWN BOX AND NOT THE ROW'S, for the reason `drawnRowTitles`
 * gives: the row's box starts at the panel's edge whatever tier it stands at,
 * and what a reader sees as the tier is where the word begins.
 *
 * ⛔ `data-depth` IS READ AS A SELECTOR AND NOT AS THE ANSWER. The written
 * picture carries no such attribute, so a tier taken from it on one side and
 * worked out from the drawing on the other would be two different measurements
 * being compared. Both sides are ranked by where the word starts instead --
 * `tiered` below.
 *
 * @purity semi-pure-b
 */
async function panelLinesOnScreen(page: Page): Promise<PanelLine[]> {
  const lines = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map((row) => {
      const span = row.querySelector('span')
      const box = span === null ? null : span.getBoundingClientRect()
      return {
        name: (span?.textContent ?? '').trim(),
        at: box === null ? Number.NaN : Math.round(box.x * 100) / 100,
        down: box === null ? Number.NaN : Math.round(box.y * 100) / 100,
      }
    }),
  )
  return [...lines].sort((one, two) => one.down - two.down)
}

/**
 * The lines the written picture puts in the panel, topmost first.
 *
 * ⚠️ THE WINDOW IS READ OFF THE SCREEN AND SHRUNK, not guessed. `FR-080` (MUST)
 * has the picture be the screen 「`exportCanvas` ... の幅 ÷ 画面の幅 の比で縮めた
 * 絵」, so the panel's own width and the bottom of its head both land at that
 * ratio; `right` and `below` are those two, already multiplied.
 *
 * ⛔ THE HEAD'S BAND IS CUT OFF DELIBERATELY, and `HF-12` of table T-051 is the
 * reason: folding every row 「行が 1 つも描かれない状態になりうる」 and the head
 * then 「頭にいま何行を畳み込んでいるかを示すこと（MUST）」. That count stands in
 * the head, above the tree, and it is not a row -- counting it as one would have
 * a build that obeys `HF-12` reported as drawing a row the screen does not.
 * `EP-1`'s `Document Title` sits higher still and is cut off by the same edge.
 *
 * @purity pure
 */
/**
 * The picture with FR-020's watermark layer cut out.
 *
 * ⚠️⚠️ WHY. The walk below reads the written picture as text and picks row
 * names by coordinate alone. The watermark is a grid of <text> marks laid
 * over the Row Area, so each of them looks like a row name standing at some
 * x and y. Measured 2026-09-05: four of them landed among the eleven row
 * names and the picture stopped agreeing with the screen.
 *
 * ⛔ The layer nests one <g> of its own (the rotation), so the closing tag
 * is counted rather than searched for.
 */
function withoutTheWatermark(picture: string): string {
  const at = picture.indexOf('<g data-role="Watermark"')
  if (at === -1) return picture
  let depth = 0
  let scan = at
  while (scan < picture.length) {
    const opens = picture.indexOf('<g', scan)
    const closes = picture.indexOf('</g>', scan)
    if (closes === -1) break
    if (opens !== -1 && opens < closes) {
      depth += 1
      scan = opens + 2
      continue
    }
    depth -= 1
    scan = closes + 4
    if (depth === 0) return picture.slice(0, at) + picture.slice(scan)
  }
  return picture.slice(0, at)
}

function panelLinesInPicture(picture: string, right: number, below: number): PanelLine[] {
  const found: PanelLine[] = []
  const scanned = withoutTheWatermark(picture)
  const marks = /<text\b([^>]*)>([^<]*)<\/text>/g
  let one = marks.exec(scanned)
  while (one !== null) {
    const attributes = one[1] ?? ''
    const across = Number(/\bx="(-?\d+(?:\.\d+)?)"/.exec(attributes)?.[1] ?? '')
    const down = Number(/\by="(-?\d+(?:\.\d+)?)"/.exec(attributes)?.[1] ?? '')
    const said = (one[2] ?? '').trim()
    if (Number.isFinite(across) && Number.isFinite(down) && across < right && down > below && said !== '') {
      found.push({ name: said, at: across, down })
    }
    one = marks.exec(scanned)
  }
  return found.sort((first, second) => first.down - second.down)
}

/**
 * The lines as `tier:name`, in the order they stand.
 *
 * ⭐ THE TIER IS A RANK AND NOT A LENGTH: how many distinct indents stand
 * shallower than this one. Neither side's own numbers are compared, so this
 * reading is free of both `S-37` and of the ratio -- which is what keeps this
 * case out of D-49's business. Measured 2026-09-03 on the shipped build: the
 * screen puts tier 1 at 36px and the picture at the equivalent of 16px, a
 * standing difference in the left inset that has nothing to do with which rows
 * are drawn, and an absolute comparison would report it here instead.
 *
 * @purity pure
 */
function tiered(lines: readonly PanelLine[]): string[] {
  const indents = [...new Set(lines.map((line) => line.at))].sort((one, two) => one - two)
  return lines.map((line) => `${indents.indexOf(line.at)}:${line.name}`)
}

// GOES RED IF: the rows the written picture draws in the row title panel stop
// being the rows the screen is drawing -- a different count, a different order,
// or a different tier -- after a fold has been pressed and nothing has been
// scrolled since.
//
// ⭐ THE REQUIREMENT IS `FR-080` (MUST), `docs/spec/01-04-requirements.md`, and
// it says two things this case leans on, word for word:
//   「画像として書き出したとき、`GRS` は、`GRS` が占める画面の全体を、
//     `exportCanvas`（`_assets/tbl-settings.md` の表 T-204 の `S-81`）の
//     幅 ÷ 画面の幅 の比で縮めた絵を出すこと」
//   「表示の切り替え・ズームの段階・LOD による増減の結果を、書き出しでも同じに
//     すること」
// and its reason: 「見えているものが成果物になることが、この道具の前提である。」
// Folding is a 表示の切り替え, and `EP-3` of table T-076 has the `Row Title
// Panel` and the `Row Title Tree` drawn, with 「書き出し専用の幅を設けてはならない
// （MUST NOT）」 -- which is why the two sides may be compared by the words
// themselves, cut short or not.
//
// ⛔ WHAT IS *NOT* CLAIMED: that scrolling puts it right. The ledger's D-229
// records that it does, and that reading is a symptom rather than a rule -- no
// row of the specification says a picture becomes true once a wheel is turned.
// What is asserted is only `FR-080`'s own agreement.
//
// ⭐ THE CONTROL IS ASSERTED FIRST so that a failure below is about the press
// and not about the way the two sides are read. Measured 2026-09-03 on the
// shipped build at 1920x1080: with the panel untouched the screen draws eight
// rows over three tiers while the picture carries seven, all at one tier; one
// notch of the wheel and the two agree exactly, name for name and tier for
// tier. The notch is therefore turned FIRST and that agreement is what the
// control holds -- the untouched reading is taken before it (it cannot be got
// back afterwards) and judged straight after.
//
// ⚠️ THE FOLD PRESSED IS THE PANEL HEAD'S, `HF-12` of table T-051 by way of
// table T-109, and it is the one press whose result cannot be reached by
// accident: `HF-12` (MUST) folds 「最も浅い段の行も」 as well, so the screen is
// left drawing no row at all, and a picture that carries any row after it
// carries a row the screen does not. `HF-10` presses it open again, and the
// second half of this case is that the picture comes back with it.
test('D-229: the written picture draws the rows the screen draws after a fold, with no scroll', async () => {
  test.setTimeout(300_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const chooser = entranceBy(T109_SOURCE, 'FR-096')
    const ending = assignmentText(cellOf(T024, 'IO-3', T024_ENDING, T024_COLUMNS))
    const foldAll = entranceBy(T109_SOURCE, 'HF-12')
    const openAll = entranceBy(T109_SOURCE, 'HF-10')

    const panel = await page.evaluate(() => {
      const one = document.querySelector('[data-role="Row Title Panel"]')
      if (one === null) return null
      const box = one.getBoundingClientRect()
      return { x: box.x, y: box.y, width: box.width, height: box.height }
    })
    expect(panel, 'the row title panel is not on the screen').not.toBeNull()
    if (panel === null) return
    const head = await entranceBox(page, foldAll)
    expect(head, `${foldAll} (table T-051 row HF-12) is not drawn on the panel head`).not.toBeNull()
    if (head === null) return

    const ratio = EXPORT_WIDTH / BASE_SCREEN.width
    const right = panel.width * ratio
    const below = (head.y + head.height) * ratio

    /** Write one picture and hand back its body, with the ratio's own guard. */
    const write = async (nth: number, when: string): Promise<string> => {
      expect(
        await pressExportFormat(page, chooser, ending),
        `the chooser offers nothing that writes ${ending} (table T-024 row IO-3)`,
      ).toBe(true)
      const wrote = await until(
        page,
        () => readWrites(page),
        (seen) => seen.bodies.length === nth,
        `the picture ${when} is written`,
      )
      const picture = wrote.bodies[nth - 1] ?? ''
      expect(picture.startsWith('<svg'), `what was written ${when} is not an SVG`).toBe(true)
      const width = Number(/^<svg\b[^>]*\bwidth="(-?\d+(?:\.\d+)?)"/.exec(picture)?.[1] ?? '')
      expect(
        width,
        `the picture ${when} was written ${width}px wide and FR-025 (MUST) fixes the width at ` +
          'S-81; the window this case reads the panel out of would be the wrong one',
      ).toBe(EXPORT_WIDTH)
      return picture
    }

    // Reading 1 -- nothing pressed. Taken now because a wheel cannot be turned
    // back, and judged after the control below.
    const untouchedScreen = tiered(await panelLinesOnScreen(page))
    const untouchedPicture = tiered(panelLinesInPicture(await write(1, 'with nothing pressed'), right, below))

    // The control -- one notch of the wheel over the panel and nothing else.
    const overPanel = { x: panel.x + panel.width / 2, y: panel.y + panel.height / 2 }
    await page.mouse.move(overPanel.x, overPanel.y)
    await page.mouse.wheel(0, 200)
    await readSettledDrawnSvg(page)
    const scrolledScreen = tiered(await panelLinesOnScreen(page))
    const scrolledPicture = tiered(panelLinesInPicture(await write(2, 'after one notch of the wheel'), right, below))
    expect(
      scrolledScreen.length,
      'the panel is drawing fewer than two rows, so the control holds no order to agree about',
    ).toBeGreaterThan(1)
    expect(
      new Set(scrolledScreen.map((line) => line.split(':')[0] ?? '')).size,
      `the control is drawing one tier only (${JSON.stringify(scrolledScreen)}), so an agreement ` +
        'about tiers would mean nothing',
    ).toBeGreaterThan(1)
    expect(
      scrolledPicture,
      'the control itself does not agree: the picture and the screen part company before anything ' +
        'has been folded, so nothing below can be laid at the fold',
    ).toEqual(scrolledScreen)

    expect(
      untouchedPicture,
      'with nothing pressed at all, the picture draws rows the screen does not; FR-080 (MUST) has ' +
        'the picture be the screen shrunk by one ratio',
    ).toEqual(untouchedScreen)

    // The claim -- a fold, and no scroll after it.
    expect(await pressEntrance(page, foldAll), `${foldAll} is not on the screen`).toBe(true)
    await readSettledDrawnSvg(page)
    const foldedScreen = tiered(await panelLinesOnScreen(page))
    expect(
      foldedScreen,
      `pressing ${foldAll} left the screen drawing exactly what it drew before, so this case ` +
        'never folded anything and has nothing to judge',
    ).not.toEqual(scrolledScreen)
    const foldedPicture = tiered(panelLinesInPicture(await write(3, 'after every row was folded'), right, below))
    expect(
      foldedPicture,
      `after ${foldAll} (table T-051 row HF-12) the screen draws ${foldedScreen.length} row(s) and ` +
        `the picture ${foldedPicture.length}; FR-080 (MUST) has 表示の切り替え の結果 be the same ` +
        'in the written picture, and nothing was scrolled in between',
    ).toEqual(foldedScreen)

    // And back the other way, so the case is not one about an empty drawing.
    expect(await pressEntrance(page, openAll), `${openAll} is not on the screen`).toBe(true)
    await readSettledDrawnSvg(page)
    const openedScreen = tiered(await panelLinesOnScreen(page))
    expect(
      openedScreen.length,
      `pressing ${openAll} (table T-051 row HF-10) brought no row back, so the second half of this ` +
        'case has nothing to judge',
    ).toBeGreaterThan(1)
    const openedPicture = tiered(panelLinesInPicture(await write(4, 'after every row was opened again'), right, below))
    expect(
      openedPicture,
      `after ${openAll} the screen draws ${openedScreen.length} row(s) and the picture ` +
        `${openedPicture.length}; FR-080 (MUST) has the two the same, and nothing was scrolled ` +
        'in between',
    ).toEqual(openedScreen)
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// What the five cases of CR-344 lean on
// ---------------------------------------------------------------------------

/**
 * Every word the dictionary holds, in every language it spells one in.
 *
 * ⭐ WALKED RATHER THAN NAMED SECTION BY SECTION. `FR-038` (MUST) has 「画面に
 * 刷る語は、言語ごとの辞書として 1 か所に持つこと」 and (MUST NOT) forbids a
 * requirement or a table from spelling one, so what a case may ask of a word on
 * the screen is whether the dictionary holds it -- not which heading of the
 * manuscript it was filed under. A section added or renamed moves with this.
 *
 * @purity semi-pure-b
 */
function dictionaryWords(): ReadonlySet<string> {
  const held = new Set<string>()
  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      const said = flat(value)
      if (said !== '') held.add(said)
      return
    }
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, one] of Object.entries(value as Record<string, unknown>)) {
        if (key === '$comment') continue
        walk(one)
      }
    }
  }
  walk(JSON.parse(readFileSync(DICTIONARY, 'utf8')))
  if (held.size === 0) throw new Error(`${DICTIONARY} holds no words at all`)
  return held
}

/**
 * The word `FR-101` asks for while nothing has been written yet, kept by the
 * language it is spelled in.
 *
 * ⭐ THIS IS HOW A CASE ASKS THE SCREEN WHICH LANGUAGE IT IS IN. `FR-038` (MUST)
 * makes the display language 「`ja` と `en` の 2 言語」 and the dictionary spells
 * every word in both, so the two spellings of one entry are a pair of witnesses:
 * whichever of them the header is carrying names the language on the screen. ⛔
 * NEITHER SPELLING IS IN THIS FILE, for the reason `FR-038` (MUST NOT) gives.
 *
 * ⚠️ The two are required to differ. An entry spelled the same way in both
 * languages would witness nothing, and a case leaning on it would pass whatever
 * the application did.
 *
 * @purity semi-pure-b
 */
function neverSavedByLanguage(): ReadonlyMap<string, string> {
  const held = JSON.parse(readFileSync(DICTIONARY, 'utf8')) as {
    fileStatus?: Array<{ state?: string; text?: Record<string, string> }>
  }
  const found = (held.fileStatus ?? []).find((one) => one.state === 'neverSaved')
  const said = new Map<string, string>()
  for (const [language, word] of Object.entries(found?.text ?? {})) {
    if (typeof word === 'string' && word !== '') said.set(language, word)
  }
  if (said.size < 2) {
    throw new Error(`${DICTIONARY} spells the never-saved word in fewer than two languages`)
  }
  if (new Set(said.values()).size !== said.size) {
    throw new Error(
      `${DICTIONARY} spells the never-saved word the same way in two languages, so no reading of ` +
        'the header can tell them apart',
    )
  }
  return said
}

/** The field the keyboard is going into right now, while it is one that takes text. */
interface TypedInto {
  readonly tag: string
  readonly width: number
  readonly height: number
  readonly value: string
}

/**
 * The focused element, when it is a field a person can type a name into.
 *
 * ⚠️ A BOX OF ITS OWN IS PART OF THE ANSWER. The shipped build keeps a 0x0
 * `input` in the page at all times (measured 2026-09-03), so "an input exists"
 * and even "an input holds the focus" can both be true of a page that offers
 * nobody anything. What is asked for is a field that is focused AND drawn.
 *
 * @purity semi-pure-b
 */
async function focusedTypableField(page: Page): Promise<TypedInto | null> {
  return page.evaluate(() => {
    const active = document.activeElement
    if (active === null) return null
    const tag = active.tagName
    const editable = (active as HTMLElement).isContentEditable === true
    const typed =
      tag === 'TEXTAREA' ||
      (tag === 'INPUT' && ['text', 'search', null, ''].includes(active.getAttribute('type')))
    if (!typed && !editable) return null
    const box = active.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return {
      tag,
      width: Math.round(box.width),
      height: Math.round(box.height),
      value: editable
        ? (active.textContent ?? '').trim()
        : (active as HTMLInputElement).value,
    }
  })
}

/** What one surface of the Properties Panel is printing: its item names, and every word on it. */
interface PanelPrinting {
  readonly names: readonly string[]
  readonly words: readonly string[]
}

/**
 * The item names the Properties Panel is printing right now, and everything else
 * it is printing beside them.
 *
 * ⛔ NOT DECIDED BY THE SPECIFICATION: the panel marks a field row with
 * `data-field-row` and prints its name in the row's first `span`. The
 * specification settles what the name must BE and says nothing about the
 * marking, so this is the same lean the cases above already take on
 * `[data-field-row="PR-1"]` -- and a change to it breaks these cases, as it
 * should.
 *
 * @purity semi-pure-b
 */
async function panelPrinting(page: Page): Promise<PanelPrinting> {
  return page.evaluate((panel: string) => {
    const host = document.querySelector(panel)
    if (host === null) return { names: [], words: [] }
    const names = Array.from(host.querySelectorAll('[data-field-row]'))
      .map((row) => (row.querySelector('span')?.textContent ?? '').trim())
      .filter((said) => said !== '')
    const words = Array.from(host.querySelectorAll('*'))
      .filter((element) => element.children.length === 0)
      .map((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter((said) => said !== '')
    return { names, words }
  }, PANEL)
}

/** How many notices are standing, and what the whole area reads. */
interface Standing {
  readonly sheets: number
  readonly text: string
}

/**
 * The notices standing right now, counted one sheet at a time.
 *
 * ⛔ `readNotices` COUNTS AREAS, NOT SHEETS, and every notice of the shipped
 * build stands in the one `Notification Area` (measured 2026-09-03: three
 * presses of a dead entrance gave one area holding three sheets, so a case that
 * counted what `readNotices` answers would have read 1 and called `NT-3`
 * honoured). The sheets are that area's own element children.
 *
 * @purity semi-pure-b
 */
async function standingNotices(page: Page): Promise<Standing> {
  return page.evaluate(() => {
    const areas = Array.from(document.querySelectorAll('[data-role]')).filter((marked) =>
      (marked.getAttribute('data-role') ?? '').includes('Notification'),
    )
    let sheets = 0
    let text = ''
    for (const area of areas) {
      sheets += Array.from(area.children).filter(
        (child) => (child.textContent ?? '').trim() !== '',
      ).length
      text += (area.textContent ?? '').replace(/\s+/g, ' ').trim()
    }
    return { sheets, text }
  })
}

/** How many of the dictionary's reasons a piece of screen text is carrying. @purity semi-pure-b */
function reasonsCarriedBy(said: string): readonly string[] {
  return reasonWordsOfDictionary()
    .filter((one) => (one.ja !== '' && said.includes(one.ja)) || (one.en !== '' && said.includes(one.en)))
    .map((one) => one.rowId)
}

/** How many times a piece of text carries one word. @purity pure */
function timesCarried(said: string, word: string): number {
  if (word === '') return 0
  return said.split(word).length - 1
}

/** One row as the Row Title Panel is drawing it. */
interface DrawnRow {
  readonly top: number
  readonly bottom: number
  readonly text: string
}

/**
 * The rows the Row Title Panel has drawn, and the panel's own box.
 *
 * ⚠️ `[data-depth]` IS THE DRAWN WINDOW AND NOT THE DOCUMENT. Eight rows is all
 * the shipped build draws at the base screen (measured 2026-09-03), so a row
 * that is missing from this answer is a row a person cannot see -- which is
 * exactly what `HF-17` (MUST) is about.
 *
 * @purity semi-pure-b
 */
async function drawnRowsAndPanel(
  page: Page,
): Promise<{ rows: readonly DrawnRow[]; panelTop: number; panelBottom: number }> {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-role="Row Title Panel"]')
    const box = panel?.getBoundingClientRect()
    const rows = Array.from(document.querySelectorAll('[data-depth]'))
      .map((row) => {
        const rowBox = row.getBoundingClientRect()
        return {
          top: Math.round(rowBox.top),
          bottom: Math.round(rowBox.bottom),
          text: (row.textContent ?? '').replace(/\s+/g, ' ').trim(),
        }
      })
      .sort((one, two) => one.top - two.top)
    return {
      rows,
      panelTop: Math.round(box?.top ?? 0),
      panelBottom: Math.round(box?.bottom ?? window.innerHeight),
    }
  })
}

/**
 * Put the pointer on a row's name and press one of that row's own entrances.
 *
 * ⛔ A ROW'S ENTRANCES ARE HIDDEN UNTIL THE POINTER IS ON ITS NAME (table T-051
 * row `HF-6`), and the shell reads a real pointer -- a dispatched event reaches
 * nothing here, which `tools/probe/harness.mjs` records as the way one session
 * called a working feature broken.
 *
 * @purity non-pure
 */
async function pressRowEntrance(page: Page, rowTop: number, entrance: string): Promise<boolean> {
  const name = await page.evaluate((wantedTop: number) => {
    const row = Array.from(document.querySelectorAll('[data-depth]')).find(
      (one) => Math.abs(one.getBoundingClientRect().top - wantedTop) < 2,
    )
    if (row === undefined) return null
    const box = row.getBoundingClientRect()
    return { x: Math.round(box.x + 30), y: Math.round(box.y + box.height / 2) }
  }, rowTop)
  if (name === null) return false
  await page.mouse.move(name.x, name.y)
  await page.waitForTimeout(500)
  const at = await page.evaluate(
    (asked: { entrance: string; top: number }) => {
      const found = Array.from(document.querySelectorAll(`[data-icon="${asked.entrance}"]`)).find(
        (one) => Math.abs(one.getBoundingClientRect().top - asked.top) < 60,
      )
      if (found === undefined) return null
      const box = found.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) return null
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    { entrance, top: rowTop },
  )
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(600)
  return true
}

// ---------------------------------------------------------------------------
// D-232 -- MOVED to `tests/system/open-defect-pins.test.ts` (see prose above,
// under "FIVE ROWS ARE NOT HELD HERE"). `focusedTypableField` stays: D-43 and
// the two cases beside it still call it.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// D-233 -- the settings surface prints words, not spellings
// ---------------------------------------------------------------------------

// GOES RED IF: the surface that shows the document's drawing settings prints an
// item name the dictionary does not hold, or prints an identifier as it is held
// inside. Chapter 1's paragraph under table T-006a (MUST) reads 「⛔ **プロパティ
// パネルの項目名は `W-2` に従うこと（MUST）** …… ⛔⛔ **同じ面が文書の設定を出す
// ときも、これに従うこと（MUST）。内部の綴りや識別子をそのまま出してはならない
// （MUST NOT）**」, and the preamble of table T-016 says where the names live:
// 「⛔ **画面に出す名は本表に無い（MUST NOT）** —— `FR-038` が「画面に刷る語は言語
// ごとの辞書 1 つに持つ」と定めるので、表示名は `_source/display-words.json` の
// `properties` 節が同じ行 ID で持つ」.
//
// ⭐ THE DICTIONARY IS WALKED WHOLE rather than asked for one section: the
// settings surface has no rows of table T-016, and which heading its words are
// filed under is the manuscript's business. What this case asks is `FR-038`'s
// own question -- whether the word on the screen is a word the dictionary holds.
//
// ⚠️ THE SECOND HALF IS NOT THE SAME CLAIM AS THE FIRST. A name may be absent
// from the dictionary without being an identifier, and an identifier may be
// printed beside a name that is perfectly good; the ledger's D-233 measured
// both at once (113 rows of internal spellings, and one raw UUID among the
// values).
test('D-233: the settings surface prints dictionary words and no raw identifier', async () => {
  test.setTimeout(180_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const settings = entranceBy(T109_SOURCE, 'FR-072')
    expect(await pressEntrance(page, settings), `${settings} is not on the screen`).toBe(true)
    await page.waitForTimeout(900)

    const printing = await panelPrinting(page)
    expect(
      printing.names.length,
      `pressing ${settings} put no field row on the panel, so this case has nothing to read`,
    ).toBeGreaterThan(0)

    const held = dictionaryWords()
    const strangers = [...new Set(printing.names)].filter((name) => !held.has(name))
    expect(
      strangers.slice(0, 12),
      `the settings surface prints ${strangers.length} of its ${printing.names.length} item ` +
        'name(s) as words the dictionary does not hold; the paragraph under table T-006a (MUST) ' +
        'has this surface follow the same rule as the panel, whose names FR-038 keeps in ' +
        `${DICTIONARY}`,
    ).toEqual([])

    // ⚠️ A UUID IS THE SHAPE THE LEDGER MEASURED (`scrollGroupId`). It is asked
    // for by shape rather than by field name so that an identifier printed in
    // some other row is caught by the same reading.
    const identifiers = printing.words.filter((said) =>
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(said),
    )
    expect(
      identifiers,
      'the settings surface prints an identifier as it is held inside, which the same paragraph ' +
        '(MUST NOT) forbids: 「内部の綴りや識別子をそのまま出してはならない」',
    ).toEqual([])
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// D-234 -- the added row is brought into view, not just its field
// ---------------------------------------------------------------------------

// GOES RED IF: a row added at the shallowest tier, or added under a row standing
// at the foot of the panel, is not drawn once its name is settled -- or is drawn
// outside the panel's own box. Table T-051 row `HF-17` (MUST) reads 「⛔ **足した
// 行が描かれていないときは、その行が見える位置まで表示位置を送ること（MUST）。
// 打ち込み口だけを送ってはならない（MUST NOT）** —— **口だけ送ると、確定した
// あとに行がどこへ行ったか読めない。**⚠️ **送り方は `HF-9` に従う。**⭐ **`HF-14`
// （配下に足す）も同じとすること（MUST）** —— **押した行が画面の下端に在るときに
// 同じことが起きる。**」
//
// ⭐ THE NAME IS WHAT MAKES THE ROW FINDABLE. `HF-14` (MUST) has the row stand
// with an empty name and (MUST) throws it away if the name is settled empty, so
// a row that is never named is a row this case may not look for -- and the name
// typed below is what tells the new row from the eight the build already draws.
//
// ⚠️ BOTH HALVES ARE PRESSED, and `HF-17`'s own last sentence is why: the two
// entrances differ only in where the row lands, and the row says in as many
// words that `HF-14` is held to the same thing.
test('D-234: a row added at the head, and one added under the last row, are both brought into view', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const addAtHead = entranceBy(T109_SOURCE, 'HF-17')
    const addUnderRow = entranceBy(T109_SOURCE, 'HF-14')

    // --- HF-17, the shallowest tier -------------------------------------
    expect(await pressEntrance(page, addAtHead), `${addAtHead} is not on the screen`).toBe(true)
    await page.waitForTimeout(600)
    const headField = await focusedTypableField(page)
    expect(
      headField,
      `pressing ${addAtHead} (table T-051 row HF-17) opened no field to type the new row's name ` +
        'into, and HF-14 (MUST) has the row stand with an empty name for a person to fill',
    ).not.toBeNull()
    if (headField === null) return

    const headName = 'ZetaHeadRow'
    await page.keyboard.type(headName)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1200)

    const afterHead = await drawnRowsAndPanel(page)
    const headRow = afterHead.rows.find((row) => row.text.includes(headName))
    expect(
      headRow,
      `after the name was settled the row named ${JSON.stringify(headName)} is drawn nowhere; ` +
        `the panel is drawing ${afterHead.rows.length} row(s) and HF-17 (MUST) has the view sent ` +
        'until the added row is one of them',
    ).not.toBeUndefined()
    if (headRow === undefined) return
    expect(
      headRow.top >= afterHead.panelTop && headRow.bottom <= afterHead.panelBottom,
      `the row named ${JSON.stringify(headName)} is drawn at ${headRow.top}..${headRow.bottom}px ` +
        `while the panel is at ${afterHead.panelTop}..${afterHead.panelBottom}px, so it is not at ` +
        'a position it can be read from',
    ).toBe(true)

    // --- HF-14, under the row standing lowest ---------------------------
    const lowest = [...afterHead.rows].sort((one, two) => two.top - one.top)[0]
    expect(lowest, 'the panel drew no row to add a child under').not.toBeUndefined()
    if (lowest === undefined) return
    expect(
      await pressRowEntrance(page, lowest.top, addUnderRow),
      `${addUnderRow} (table T-051 row HF-14) is not drawn on the row at the foot of the panel ` +
        'even with the pointer on its name',
    ).toBe(true)

    const childField = await focusedTypableField(page)
    expect(
      childField,
      `pressing ${addUnderRow} on the lowest row opened no field to type the new row's name into`,
    ).not.toBeNull()
    if (childField === null) return

    const childName = 'ZetaChildRow'
    await page.keyboard.type(childName)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1200)

    const afterChild = await drawnRowsAndPanel(page)
    const childRow = afterChild.rows.find((row) => row.text.includes(childName))
    expect(
      childRow,
      `after the name was settled the row named ${JSON.stringify(childName)} is drawn nowhere; ` +
        'HF-17 (MUST) holds HF-14 to the same thing -- 「`HF-14`（配下に足す）も同じとすること' +
        '（MUST）」',
    ).not.toBeUndefined()
    if (childRow === undefined) return
    expect(
      childRow.top >= afterChild.panelTop && childRow.bottom <= afterChild.panelBottom,
      `the row named ${JSON.stringify(childName)} is drawn at ${childRow.top}..${childRow.bottom}px ` +
        `while the panel is at ${afterChild.panelTop}..${afterChild.panelBottom}px`,
    ).toBe(true)
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// D-235 -- the bound document names the language the screen is in
// ---------------------------------------------------------------------------

// GOES RED IF: the display language is changed and the document goes on naming
// the language it named before. `FR-038` (MUST) reads 「⭐ **表示言語を替えた
// ときは、綴じた文書自身が名乗る言語も同じものに替えること（MUST）** ——
// **読み上げと自動翻訳がそれを見る。**⚠️ **画面には現れないので、押しても
// 気づけない。**」, and the same requirement fixes the two languages it can be:
// 「対象は `ja` と `en` の 2 言語とする」.
//
// ⛔ WHAT THE DOCUMENT NAMES ITS LANGUAGE WITH IS NOT SETTLED BY A REQUIREMENT,
// and the ledger's D-235 names the one place a bound HTML document has for it --
// the root element's `lang`. Nothing else in the deliverable declares a
// language, and it is what a screen reader and an automatic translation read,
// which is the reason the requirement gives.
//
// ⚠️ THE SCREEN IS ASKED WHICH LANGUAGE IT IS IN rather than told. The display
// language is chosen from the browser when nothing was stored (`FR-038`), so a
// case that assumed one language would report a build opened in the other as
// broken. The witness is the dictionary's own pair of spellings for the word
// `FR-101` puts in the header while nothing has been written to a file.
test('D-235: changing the display language changes the language the document names', async () => {
  test.setTimeout(180_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const toggle = entranceBy(T109_SOURCE, 'FR-038')
    const words = neverSavedByLanguage()

    /** Which language the header is printing in, by the word it carries. */
    const shownLanguage = async (): Promise<string> => {
      const said = await page.evaluate(() => {
        const header = document.querySelector('[data-role="App Header"]')
        return (header?.textContent ?? '').replace(/\s+/g, ' ').trim()
      })
      const found = [...words.entries()].filter(([, word]) => said.includes(word))
      if (found.length !== 1) {
        throw new Error(
          `the header reads ${JSON.stringify(said)}, which carries ${found.length} of the ` +
            "dictionary's never-saved words; exactly one is needed to name the language on the screen",
        )
      }
      return found[0]?.[0] ?? ''
    }

    const declared = async (): Promise<string> =>
      page.evaluate(() => document.documentElement.getAttribute('lang') ?? '')

    const wasShown = await shownLanguage()
    const wasDeclared = await declared()
    expect(
      wasDeclared,
      `before anything was pressed the screen is in ${JSON.stringify(wasShown)} and the document ` +
        `names ${JSON.stringify(wasDeclared)}`,
    ).toBe(wasShown)

    expect(await pressEntrance(page, toggle), `${toggle} is not on the screen`).toBe(true)
    await page.waitForTimeout(900)

    const nowShown = await shownLanguage()
    expect(
      nowShown,
      `pressing ${toggle} (table T-109, sourced to FR-038) left the screen in the same language, ` +
        'so this case never reached the moment the requirement is about',
    ).not.toBe(wasShown)
    expect(
      await declared(),
      `the screen changed from ${JSON.stringify(wasShown)} to ${JSON.stringify(nowShown)} and the ` +
        'document goes on naming the old one; FR-038 (MUST) has the two the same',
    ).toBe(nowShown)
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// D-236 -- one sheet per reason, and no ceiling on the sheets
// ---------------------------------------------------------------------------

// GOES RED IF: pressing one dead entrance again puts a second sheet up instead
// of adding to the one already standing, or the standing sheet reads exactly the
// same after the second press (nothing was counted), or a second reason is
// merged into the first. Table T-037 row `NT-3` (MUST) reads 「⛔⛔ **同じ理由の
// 通知が既に立っているときは、新しく積まずに、その 1 枚の件数を増やすこと
// （MUST）** …… ⭐ **件数の示し方は本行が既に持つ。**⭐ **`NT-8`（いちばん新しい
// ものから消す）とはそのまま両立する** …… ⛔ **枚数に上限を置いてはならない
// （MUST NOT）**」.
//
// ⭐ THE READING THAT CARRIES THE CLAIM IS THE REASON'S OWN WORDS, not the sheet
// count: 「同じ理由の通知」 is what may not be stacked, so what is counted is how
// many times the dictionary's sentence for that reason stands on the screen.
// The sheets are counted as well, and the two together are what tell a merge
// from a build that simply stopped raising the second notice.
//
// ⛔ THE CEILING IS WATCHED FROM THE OTHER SIDE. A cap cannot be reached by
// pressing one dead entrance -- merging keeps that at one sheet however often it
// is pressed -- so what is asserted instead is that a SECOND, DIFFERENT reason
// stands beside the first: a build that kept one sheet at all times would be
// capped at one, and `NT-8` (MUST) is written for two or more standing at once.
//
// ⚠️ THE PRESSES ARE SPACED. Table T-023 row `MK-13` gives a double click its
// own meaning, and two presses of one entrance inside the interval a browser
// calls a double click are not two presses of it.
test('D-236: pressing one dead entrance again counts on the standing notice instead of stacking', async () => {
  test.setTimeout(240_000)
  const opened = await openStubbedPage()
  try {
    const page = opened.page
    const spacing = 1600

    const faint = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-icon][data-enabled="false"]')).map(
        (one) => one.getAttribute('data-icon') ?? '',
      ),
    )
    expect(
      faint.length,
      'no entrance is drawn faint, so nothing on this page can be pressed to no effect and the ' +
        'case has no notice to raise',
    ).toBeGreaterThan(0)
    const dead = faint[0] ?? ''

    expect(await pressEntrance(page, dead), `${dead} is not on the screen`).toBe(true)
    await page.waitForTimeout(spacing)
    const once = await standingNotices(page)
    expect(once.sheets, `pressing the faint entrance ${dead} raised no notice at all`).toBe(1)

    const reasons = reasonsCarriedBy(once.text)
    expect(
      reasons,
      `the notice ${dead} raised reads ${JSON.stringify(once.text)}, and table T-233 is where ` +
        'every reason a notice may carry lives',
    ).toHaveLength(1)
    const carried = reasonWordsOfDictionary().find((one) => one.rowId === reasons[0])
    if (carried === undefined) return
    const word = once.text.includes(carried.ja) ? carried.ja : carried.en

    expect(await pressEntrance(page, dead), `${dead} left the screen between two presses`).toBe(true)
    await page.waitForTimeout(spacing)
    const twice = await standingNotices(page)
    expect(
      timesCarried(twice.text, word),
      `pressing ${dead} a second time put the same reason (${carried.rowId}) up ` +
        `${timesCarried(twice.text, word)} times; NT-3 (MUST) has the standing sheet counted up ` +
        'instead of a second one being stacked',
    ).toBe(1)
    expect(twice.sheets, `${dead} pressed twice leaves more than one sheet standing`).toBe(1)
    expect(
      twice.text,
      `the standing notice reads exactly what it read after one press, so nothing was counted; ` +
        'NT-3 (MUST) has its 件数 grow',
    ).not.toBe(once.text)

    expect(await pressEntrance(page, dead), `${dead} left the screen between two presses`).toBe(true)
    await page.waitForTimeout(spacing)
    const thrice = await standingNotices(page)
    expect(thrice.sheets, `${dead} pressed three times leaves more than one sheet standing`).toBe(1)
    expect(
      thrice.text,
      'the standing notice reads exactly what it read after two presses, so the third press was ' +
        'counted nowhere',
    ).not.toBe(twice.text)

    // ⭐ A SECOND REASON, WHICH IS WHERE THE CEILING WOULD SHOW. The other faint
    // entrances are pressed until one of them raises a reason the first did not.
    let second: Standing | null = null
    for (const other of faint.slice(1)) {
      if (!(await pressEntrance(page, other))) continue
      await page.waitForTimeout(spacing)
      const seen = await standingNotices(page)
      if (reasonsCarriedBy(seen.text).length > 1) {
        second = seen
        break
      }
    }
    expect(
      second,
      'none of the faint entrances on this page raises a reason different from the one already ' +
        'standing, so this half of NT-3 (MUST NOT: 枚数に上限を置いてはならない) cannot be judged here',
    ).not.toBeNull()
    if (second === null) return
    expect(
      second.sheets,
      `two different reasons are standing and the screen is showing ${second.sheets} sheet(s); ` +
        'NT-3 merges only 同じ理由, and NT-8 (MUST) is written for two or more standing at once',
    ).toBe(2)
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// The rows themselves
// ---------------------------------------------------------------------------

/** The ledger rows the cases above hold down. */
const HELD: readonly string[] = [
  'D-24',
  'D-43',
  'D-49',
  'D-52',
  'D-65',
  'D-66',
  'D-82',
  'D-91',
  'D-92',
  'D-97',
  'D-98',
  'D-103',
  'D-105',
  'D-106',
  'D-126',
  'D-130',
  'D-152',
  'D-166',
  'D-210',
  'D-220',
  'D-229',
  'D-232',
  'D-233',
  'D-234',
  'D-235',
  'D-236',
]

/**
 * The two files the ledger is kept in.
 *
 * ⛔ BOTH, AND `fixed-defects.md` IS NOT A SECOND LEDGER. Its own opening line
 * says it is the continuation of `defects.md` with the same nine columns and
 * that a row moves across once it has been measured -- which is exactly what
 * the cases above are for, so every row here is on its way across.
 */
const LEDGERS: readonly string[] = ['defects.md', 'fixed-defects.md']

// GOES RED IF: one of the rows above leaves the ledger altogether, or two
// entries name the same row.
test('every ledger row this file holds down is still a row of the ledger', () => {
  const written = LEDGERS.map((file) =>
    readFileSync(join(process.cwd(), 'docs', 'development-records', file), 'utf8'),
  )
  for (const row of HELD) {
    expect(
      written.some((ledger) => ledger.includes(`| ${row} |`)),
      `${row} has a case in this file but is a row of neither ${LEDGERS.join(' nor ')} under ` +
        'docs/development-records/',
    ).toBe(true)
  }
  expect(new Set(HELD).size, 'two entries name the same ledger row').toBe(HELD.length)
})
