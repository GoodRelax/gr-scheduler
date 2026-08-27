// Contract test: the road that carries the display words to the screen.
//
// FR-038 (MUST) shows the menus and the panels in the language the reader
// chose, and its fifth paragraph (MUST) puts every word the screen prints in
// ONE per-language dictionary -- ⛔ forbidding the words to be written into a
// requirement or a table (MUST NOT). Chapter 6.2 fixes the manuscript as
// `docs/spec/_source/display-words.json` and says the words reach `src/` as one
// generated file (MUST). CR-194 built both and left every word empty on
// purpose; the user has since written every one of them. Ruling 06 of
// docs/review/rulings-2026-08-22 asks for the acceptance case CR-194 section 5
// defines:
//
//   "the manuscript's word is changed by one -> does a test fall?
//    ⛔ if none falls, that word is reaching nowhere"
//
// THREE GROUPS, ALL DRIVEN BY READING THE DICTIONARY AT LOAD TIME, so that no
// word is re-typed here (which FR-038's MUST NOT would forbid anyway):
//
//   1. THE CARRIAGE   every entry that HOLDS a word: the unit that owns that
//                     place prints exactly it, in both languages. ⭐ DRIVEN BY
//                     A FILLED DICTIONARY THIS FILE BUILDS, stood where the
//                     five units import theirs from, so every case really runs
//                     whatever the manuscript holds. ⛔ No word is written into
//                     the manuscript to achieve that -- the words are the
//                     user's decision. ⚠️ It was built when the manuscript was
//                     empty and every case would otherwise have been vacuous;
//                     it earns its keep still, because a cell the user has yet
//                     to write would go vacuous again.
//   2. THE FALLBACK   every entry that is EMPTY: the place still prints a
//                     string, and where a requirement forbids emptiness the
//                     stand-in is not the empty string (FR-072).
//   3. THE ACCEPTANCE what holds the other two together -- the roster is the
//                     whole of table T-109, the generated file matches the
//                     manuscript cell for cell, no entry is passed over in
//                     silence, group 1's filled copy really covers every cell,
//                     and the claim PD-160's row asks for: 「原稿の 1 語を埋め
//                     ると画面に届く試験」-- a word that IS written is printed.
//                     ⚠️ While every cell was empty that claim could only be
//                     made as a guard that FELL the moment a word appeared
//                     (CR-194 section 5 item 2). ⛔ Every cell has since been
//                     written, so the guard is stated as the thing it stood in
//                     for, and NOT as "no word is written", which would sleep
//                     through every one of them.
//
// WRITTEN WITHOUT READING THE UNITS' BODIES (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec (FR-038, FR-072,
// FR-037, FR-032, FR-029, FR-017, tables T-103, T-109, T-023, T-040, T-050,
// T-064 row PI-37, T-075 rows UF-32 and UF-60 .. UF-71, T-015a row HM-10,
// T-026 row RC-13, T-037 row NT-7, T-058 row AT-17, Chapter 6.2),
// docs/review/rulings-2026-08-22/, change-request/
// CR-194-*.md and CR-218-*.md, docs/development-records/pending-decisions.md
// (PD-160, PD-175), the two `display-words.json` AS DATA, and -- in the five
// owning units and `screen-renderer.ts` -- the head comment, the exported types
// and the signatures (version 0.70 of the appendix says the specification
// deliberately does not write the confirmation's member names and types, and
// sends the reader to `src/`'s published entry for them: CR-146). ⛔ No
// expected value here was taken from how a unit computes its answer, and ⛔ no
// file that DRAWS the mark was opened -- which is why the mark is never named
// by member below, only asked for by word.
//
// Test placement is TS-5 of table T-218: a contract test lives in
// tests/contract/. This one is at the contract level because the road it walks
// is `screenViewFromRegions`, the published entry of table T-064's PI-37 -- not
// one unit's function.
//
// SIX THINGS THIS FILE DELIBERATELY DOES NOT ASSERT, each searched for first:
//
//   1. WHAT THE STAND-IN SAYS while an entry is empty. CR-194 section 0 item ⑧
//      settled "empty means keep printing what it printed before" WITHOUT
//      asking the user, and docs/spec fixes no stand-in for a label, a group
//      name, a surface heading or a tooltip. Pinning one here would record the
//      code rather than the specification, so group 2 asserts only that a
//      string arrives -- plus FR-072's headings, which the specification does
//      constrain.
//   2. THE `notices`, `reasons`, `questions`, `confirmation` AND
//      `confirmationMarks` SECTIONS, and IC-69 / IC-70 with them. Their places are UF-67's
//      (`notices.ts`), which is not one of the five units this file may look
//      at. ⭐ THAT IS NOT THE SAME AS LEAVING THEM UNCHECKED: a word cannot be
//      held against a member this file may not name, but it CAN be held against
//      the whole of what `screenViewFromRegions` (PI-37) hands out -- which is
//      how the acceptance group reaches `confirmationMarks` (FR-032, MUST), the
//      two answers of `confirmation`, the words of the entries table T-109
//      stands on U-55, and now every row of `reasons`: FR-076 (MUST) makes a
//      telling carry a row of table T-233 and the dictionary answers for it, so
//      this file raises one telling per row of that table and asks whether the
//      words arrive. ⚠️ That claim was impossible while the dictionary held no
//      section a reason could be looked up under -- the debt was the
//      manuscript's, it has been paid, and tests/unit/uf-67.test.ts no longer
//      stands red on it.
//      ⭐ THE SAME NOW HOLDS OF THE QUESTIONS. FR-076 (MUST) makes what a
//      question shows a row of table T-234 and bars a question it does not hold
//      (MUST NOT), so this file raises one question per row of that table too.
//      ⚠️ The `questions` section arrived KEYED but UNREAD here: `KEY_FIELD`
//      had no field for it, so every one of its entries collapsed onto the
//      empty key and the filled copy the carriage group drives held one word
//      for all of them (484 cells, 470 distinct).
//      ⭐ AND OF `noticeDismiss` (CR-259). NT-8 of table T-037 (MUST) lets a
//      person put a told notice away and puts the word of that entrance in
//      FR-038's dictionary, so the word rides on a member of UF-67's that this
//      file may not name -- and the whole-view reading reaches it on every
//      telling this file already raises.
//      ⛔ THE `notices` SECTION STAYS OUT: what a row of table T-037 is CALLED
//      is carried by a member of UF-67's that this file may not name, and the
//      whole-view reading could only reach the three manners table T-233 writes
//      a row against. `tests/unit/uf-67.test.ts` is where that member is held.
//   3. IC-58 / IC-59 / IC-60. Table T-109 stands them on the `Row Title
//      Panel`, which is UF-63's -- not one of the five either. ⚠️ IC-53 ..
//      IC-57 are left out for a different reason: table T-109 says in as many
//      words that they are not entries a person presses, so no `CommandItem`
//      carries their word.
//   4. THE `構え` GROUP OF THE COMMAND PALETTE (keyed `IC-54`). Table T-109
//      marks IC-54 「ボタンではない」 and no other row sits in that group, so the
//      group holds no entry and `CommandPalette` publishes no member that
//      would carry the GROUP's name.
//      ⭐ THAT IS NOT THE `arms` SECTION, WHICH IS HELD. Table T-023b's closing
//      rule (MUST) now puts the word of each arm in this dictionary 「辞書が持
//      ち、行 ID で引き」 and bars the row id from the screen (MUST NOT), and
//      FR-053 (MUST) has what is armed readable on the screen -- so each of
//      AR-1 .. AR-6 is a place here, on the palette, read off
//      `CommandPalette.armedText`. ⚠️ `armedText` is not the group heading, and
//      one carrying the other would be this omission and that place at once.
//   5. TWELVE OF THE FOURTEEN `assignments`. FR-037 shows an assignment where a
//      person reaches for the slower way, and the only slower ways this
//      component describes are the two scrollbars -- MK-1 (縦スクロール) and
//      MK-5 (横スクロール) of table T-023. The other twelve rows are help
//      content (FR-036), whose surface is not assembled yet.
//   6. WHERE THE SEVEN `weekdays` ARE PRINTED. FR-017 (MUST) fixes what each
//      ruler tier prints -- 「年と月は 1 段に `YYYY-MM` で並べ、週の段はその週
//      の始まりの日の数字、日の段は日の数字、曜日の段は曜日をそれぞれ 1 段に
//      持つ」(利用者の裁定 2026-08-27) -- and sends the words themselves here:
//      「⭐ 曜日の語がどこに住むかは `FR-038` が持つ。」 ⛔ THE PLACE IS THE TIME RULER'S BAND, which is
//      UF-32's (`svg-renderer.ts`) and NOT one of UF-60 .. UF-69: `ScreenView`,
//      the answer PI-37 of table T-064 hands out, carries no `Time Ruler` at
//      all. ⭐ So this is a stronger omission than 2 and 3, not a weaker one --
//      there the member was unnameable but the surface could still be raised
//      and the acceptance group's whole-view reading reached the word; here the
//      published entry this file walks has nothing that could print it, in any
//      frame, so the arrival claim is not one to make against PI-37. ⛔ AND
//      THE ROAD REALLY IS UNBUILT TODAY -- reported rather than asserted: it
//      is the ONE section of the thirteen that no file under `src/` reads, so
//      FR-017's day tier
//      prints its number without its weekday. That belongs to UF-32's own
//      test, which can name the band; asking it here would be asking this file
//      to disprove the scope it declared. ⭐ WHAT IS ASSERTED INSTEAD is the
//      roster: the seven, in AT-17's order, each with a word in each language.
//
// ⭐ Every one of those is recorded by `DROPPED` below rather than passed over,
// and the acceptance group holds the dictionary against the two lists together:
// an entry that is neither a place nor a stated omission fails.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { bare, specTable } from './spec-table'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { emptyDialogueLog, type DialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  screenStateWithArmed,
  screenStateWithPalette,
  screenStateWithSurface,
  type Armed,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  screenViewFromRegions,
  type CommandItem,
  type DisplayLanguage,
  type ScreenSession,
  type ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'

// ---------------------------------------------------------------------------
// The dictionary, read as data at load time.
// ---------------------------------------------------------------------------

/** One entry's word per language: the `{ "ja": "", "en": "" }` of both files. */
type Words = Readonly<Record<string, string>>

/** One entry of one section, e.g. `{ rowId, label, hint }`. */
type Entry = Readonly<Record<string, unknown>>

/** The dictionary with `$comment` dropped: section name -> its entries. */
type Dictionary = Readonly<Record<string, readonly Entry[]>>

const ROOT = process.cwd()

/** Chapter 6.2 (MUST): the manuscript. */
const MANUSCRIPT_PATH = join(ROOT, 'docs', 'spec', '_source', 'display-words.json')

/** Chapter 6.2 (MUST): the one generated file the words reach `src/` by. */
const GENERATED_PATH = join(ROOT, 'src', 'adapter', 'screen-renderer', 'display-words.json')

/** The module id the five units import; group 3 stands a filled copy in its place. */
const GENERATED_MODULE = '../../src/adapter/screen-renderer/display-words.json'

const readDictionary = (path: string): Dictionary => {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  const out: Record<string, readonly Entry[]> = {}
  for (const [section, value] of Object.entries(raw)) {
    // ⚠️ `$comment` is a string in the generated file and a list of lines in
    // the manuscript, so dropping it by name is the only way to drop both --
    // and the section roster below is a list of sections, not of everything
    // the file happens to hold.
    if (section.startsWith('$')) continue
    if (Array.isArray(value)) out[section] = value as readonly Entry[]
  }
  return out
}

const MANUSCRIPT = readDictionary(MANUSCRIPT_PATH)
const GENERATED = readDictionary(GENERATED_PATH)

/**
 * Which member of an entry is its key, in the order the sections are printed.
 * ⚠️ Not invented here: CR-194 section 0 item ⑧ 4 fixes a group's key as the
 * FIRST row of table T-109 that sits in it, and every other key is a row ID, a
 * settled name of table T-103, the state FR-072 / NT-7 names, or the mark
 * FR-032 asks for (CR-218 section 0 item ⑧ 2).
 *
 * ⭐ THIS IS THE ROSTER OF SECTIONS THIS FILE CAN READ, and the acceptance
 * group holds both files against it slot for slot -- a section the
 * specification adds (as FR-032 has just added `confirmationMarks`) is a
 * section every entry of which would otherwise be keyed by the empty string
 * and pass under one name.
 */
const KEY_FIELD: Readonly<Record<string, string>> = {
  icons: 'rowId',
  paletteGroups: 'firstRow',
  surfaces: 'name',
  notices: 'rowId',
  reasons: 'rowId',
  questions: 'rowId',
  confirmation: 'answer',
  noticeDismiss: 'answer',
  confirmationMarks: 'mark',
  panelHeadings: 'showing',
  assignments: 'rowId',
  // ⭐ THE ROW OF TABLE T-023b THE PALETTE HAS ARMED. Its closing rule (MUST)
  // 「⭐ **構えの語は 表 T-233 の結びが理由の語について定めるのと同じ扱いとする
  // こと（MUST）** —— 辞書が持ち、行 ID で引き、行を足すなら原稿にも項を足す。」
  // -- so the key is the row id, exactly as `reasons` is keyed. ⚠️ It stands
  // LAST here because this roster is the GENERATED file's printed order and the
  // generator prints it after `assignments`; the manuscript keeps it between
  // `panelHeadings` and `assignments`, and no row of docs/spec asks the two
  // files to agree on the order of their sections.
  arms: 'rowId',
  // ⭐ THE SEVEN WEEKDAYS THE FOURTH RULER TIER PRINTS. FR-017 (MUST) gives
  // the weekday a 段 of its own -- 「曜日の段は曜日」をそれぞれ 1 段に持つ
  // (利用者の裁定 2026-08-27; it used to share the day's 段) -- and leaves the
  // words to FR-038: 「⭐ 曜日の語がどこに住むかは `FR-038` が持つ。」 ⛔ THERE IS NO TABLE TO KEY THEM BY, and that is deliberate:
  // Chapter 6.2 (MUST NOT) forbids printing the words into a table of the
  // specification 「空の欄が並ぶだけで、規則を 1 つも述べない表になる」, and a
  // seven-row table of weekdays would be exactly that (version 1.19 of the
  // appendix: 「⛔ 7 行の表は立てない」). ⭐ So the key is the entry's own
  // `weekday`, and the ORDER is AT-17's -- see `AT_17_ORDER` below. ⚠️ It
  // stands last for the same reason `arms` does: this roster is the GENERATED
  // file's printed order, and the generator prints `weekdays` after `arms`.
  weekdays: 'weekday',
}

const isWords = (value: unknown): value is Words =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((word) => typeof word === 'string')

const keyOf = (section: string, entry: Entry): string => String(entry[KEY_FIELD[section] ?? ''] ?? '')

/** The members of an entry that hold words, e.g. `label` and `hint` of an icon. */
const wordFieldsOf = (entry: Entry): readonly string[] =>
  Object.entries(entry)
    .filter(([, value]) => isWords(value))
    .map(([field]) => field)

const wordsOf = (entry: Entry, field: string): Words => entry[field] as Words

/** One `{ section, key, field, language }` cell of the dictionary. */
interface Cell {
  readonly section: string
  readonly key: string
  readonly field: string
  readonly language: string
  readonly word: string
}

const cellsOf = (dictionary: Dictionary): readonly Cell[] => {
  const cells: Cell[] = []
  for (const [section, entries] of Object.entries(dictionary)) {
    for (const entry of entries) {
      const key = keyOf(section, entry)
      for (const field of wordFieldsOf(entry)) {
        for (const [language, word] of Object.entries(wordsOf(entry, field))) {
          cells.push({ section, key, field, language, word })
        }
      }
    }
  }
  return cells
}

const MANUSCRIPT_CELLS = cellsOf(MANUSCRIPT)
const GENERATED_CELLS = cellsOf(GENERATED)

/**
 * The languages the dictionary offers a word in. Read from the file rather than
 * typed out; the acceptance group holds them against FR-038's two.
 */
const LANGUAGES: readonly string[] = [...new Set(GENERATED_CELLS.map((cell) => cell.language))]

// ---------------------------------------------------------------------------
// Fixed copies of the specification the places are found by (Chapter 1.9).
// ---------------------------------------------------------------------------

/** Table T-109 -- the whole of the icons (FR-029, MUST). Its 面 column IS the placement. */
const T109 = specTable('T-109')

/** Table T-023 -- what the pointer and the keyboard are assigned to. */
const T023 = specTable('T-023')

/**
 * Table T-233 -- every reason a telling may carry (FR-076, MUST), with the row
 * of table T-037 each one is written against in its 作法 column.
 *
 * ⭐ Read from the specification at load time (Chapter 1.9), so a row added or
 * re-mannered brings its frame with it instead of leaving a word with nowhere
 * to arrive.
 */
const T233 = specTable('T-233').rows.map((row) => ({
  row: row.id,
  manner: bare(row.by['作法'] ?? ''),
}))

/**
 * Table T-234 -- every question a confirmation may show (FR-076, MUST), with
 * that table's own answer to whether the question names what would go.
 *
 * ⭐ The same move `T233` above makes, for the same reason: FR-076 says in as
 * many words that the way the words are held and the way a row is added are the
 * ones it has just stated for table T-233. ⚠️ The 名前を挙げるか column is read
 * raw rather than through `bare`, because its cells carry a code span
 * (`Task`) that `bare` would return in place of the answer.
 */
const T234 = specTable('T-234').rows.map((row) => ({
  row: row.id,
  namesWhatGoes: (row.by['名前を挙げるか'] ?? '').trim().startsWith('挙げる'),
}))

const t109Row = (rowId: string) => T109.rows.find((row) => row.id === rowId)

/** The 面 cell names one or more settled names of table T-103, separated by `/`. */
const surfacesOf = (rowId: string): readonly string[] =>
  (t109Row(rowId)?.by['面'] ?? '').split('/').map((name) => bare(name.trim())).filter((name) => name !== '')

const groupOf = (rowId: string): string => bare(t109Row(rowId)?.by['群'] ?? '')

/**
 * ⚠️ Table T-109 holds rows that are not entries at all -- it says so in the
 * 何の入口か column in as many words, and `CommandItem` is only for the ones a
 * person can press.
 */
const isEntry = (rowId: string): boolean =>
  !/ボタンではない/.test(t109Row(rowId)?.by['何の入口か'] ?? '')

/** The surfaces IC-52's 面 column lists, each a settled name of table T-103. */
const SURFACE_NAMES = surfacesOf('IC-52')

/**
 * AT-17 of table T-058 (docs/spec/_assets/fig-erd-detail.md) -- the 意味 cell
 * that numbers the weekdays, read raw rather than through `bare` because the
 * numbering is stated in the cell's prose and `bare` would return the first
 * code span (`FR-088`) in place of it.
 *
 * ⚠️ READ IN JAPANESE ON PURPOSE (docs/development-rules/03-implementation.md
 * section 5 allows it where the Japanese itself is what is being handled, and
 * asks for the reason): the specification writes this numbering nowhere else,
 * and the roster below is worth nothing unless the sentence it was taken from
 * still says what it said.
 */
const AT_17 = specTable('T-058').rows.find((row) => row.id === 'AT-17')?.by['意味'] ?? ''

/**
 * The seven weekdays in AT-17's order, which is the order the `weekdays`
 * section holds them in.
 *
 * ⛔ THE ORDER IS NOT CHOSEN HERE. AT-17 (docs/spec/_assets/fig-erd-detail.md)
 * fixes it -- 「**`0` が日曜で、土曜の `6` まで 1 ずつ増える**（正は Chapter
 * 6.2 が指す公式 XSD）」-- and `Project.weekStartDay` is the column stored
 * against that numbering, so the roster and the stored number index the same
 * list. ⚠️ Written out here rather than read, because there is no table of
 * seven rows to read it from and Chapter 6.2 (MUST NOT) is why there is not.
 * The case that uses it holds AT-17's own sentence first, so a numbering the
 * specification re-fixes fails there instead of passing against this copy.
 * ⛔ THESE ARE KEYS, NOT WORDS: the words are the user's, in the manuscript,
 * and FR-038 (MUST NOT) is what keeps them from being re-typed here.
 */
const AT_17_ORDER: readonly string[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

/** Table T-103 -- the settled names, of which U-55 is the one NT-7 asks on. */
const T103 = specTable('T-103')

/** U-55's settled name, read out of table T-103 rather than spelt here. */
const U_55_CONFIRMATION = bare(T103.rows.find((row) => row.id === 'U-55')?.cells[0] ?? '')

/**
 * The rows table T-109 stands on U-55 -- IC-69 and IC-70, the two answers NT-7
 * of table T-037 asks for. ⚠️ Their words have no NAMED place here (UF-67 owns
 * the member), but the acceptance group's frame raises that surface, so they
 * ARE held to the arrival claim.
 */
const ON_U_55: readonly string[] = T109.rows
  .filter((row) => surfacesOf(row.id).includes(U_55_CONFIRMATION))
  .map((row) => row.id)

/** The row of table T-023 whose 動作 is the scrolling a scrollbar does slowly (FR-037). */
const assignmentForAxis = (axis: 'horizontal' | 'vertical'): string | undefined =>
  T023.rows.find((row) => row.by['動作']?.includes(axis === 'vertical' ? '縦スクロール' : '横スクロール'))?.id

/** `iconHintDelayMs` (S-124), read from the generated defaults, never typed. */
const ICON_HINT_MS = SETTINGS_DEFAULTS['iconHintDelayMs'] as number

// ---------------------------------------------------------------------------
// One frame of input. ⚠️ Nothing here is asserted -- these are the conditions a
// place needs in order to be on the screen at all.
// ---------------------------------------------------------------------------

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

/** The middle of a region, so a pointer put there is on it however it is cut. */
const centreOf = (region: ScreenRect): { readonly x: number; readonly y: number } => ({
  x: region.x + region.width / 2,
  y: region.y + region.height / 2,
})

/**
 * ⚠️ BOTH PANEL WIDTHS ARE STATED HERE, not inherited from the generated
 * defaults. S-80's default is the CLOSED properties panel, and a panel of no
 * width is a part of table T-103 that no printed word can stand on -- so this
 * frame opens it, the way a person who is editing has it open.
 */
const SETTINGS = {
  ...SETTINGS_DEFAULTS,
  rowTitlePanelWidth: 400,
  propertyPanelWidth: 300,
} as unknown as DocumentSettings

/** The screen cut into table T-103's parts by FR-052's own expression. */
const REGIONS: ScreenRegions = (() => {
  const width = 1280
  const height = 800
  const headerHeight = 56
  const rulerHeight = 48
  // ⛔ Read off the settings above rather than re-typed: the cut and the
  // settings the same frame carries have to be the same screen.
  const titleWidth = SETTINGS.rowTitlePanelWidth
  const propertiesWidth = SETTINGS.propertyPanelWidth
  const padding = SETTINGS_DEFAULTS['canvasPadding'] as number
  const barThickness = 8
  const canvas = rect(0, headerHeight, width, height - headerHeight)
  const rowAreaWidth = canvas.width - padding - titleWidth - propertiesWidth - barThickness
  const rowAreaHeight = canvas.height - rulerHeight - padding - barThickness
  return {
    appHeader: rect(0, 0, width, headerHeight),
    scheduleCanvas: canvas,
    rowTitlePanel: rect(canvas.x, canvas.y, titleWidth, canvas.height),
    timeRuler: rect(canvas.x + titleWidth, canvas.y, rowAreaWidth, rulerHeight),
    propertiesPanel: rect(canvas.x + canvas.width - propertiesWidth, canvas.y, propertiesWidth, canvas.height),
    rowArea: rect(canvas.x + titleWidth, canvas.y + rulerHeight, rowAreaWidth, rowAreaHeight),
  }
})()

const THE_TASK = 1

const SCHEDULE = {
  project: { title: 'a document', themeHue: 214, uidHighWaterMark: 0, minutesPerDay: null },
  calendars: [],
  tasks: [
    {
      uid: THE_TASK,
      wbsParentUid: null,
      wbsOrder: null,
      name: 'a task',
      start: null,
      finish: null,
      milestone: null,
      deadline: null,
      notes: null,
      calendarUid: null,
      actualStart: null,
      actualDuration: null,
      actualFinish: null,
      resume: null,
      resumeValid: null,
      percentComplete: null,
      fadeInDays: null,
      fadeOutDays: null,
      dependencies: [],
      carry: {},
      carryElements: [],
    },
  ],
  resources: [
    {
      uid: 1,
      name: 'a resource',
      resourceKind: null,
      isCostResource: null,
      calendarUid: null,
      carry: {},
      carryElements: [],
    },
  ],
  assignments: [],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [
    {
      taskUid: THE_TASK,
      nameAnchor: null,
      nameAlign: null,
      shapeKind: null,
      milestoneGlyph: null,
      fillColor: null,
      strokeColor: null,
      lineWeight: null,
    },
  ],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const TASK_REF: ItemRef = { kind: 'task', uid: THE_TASK }
const HOLDING_A_TASK: Selection = selectionWith(emptySelection(), TASK_REF)

const SESSION: ScreenSession = {
  language: 'ja',
  autosave: { kind: 'saving' },
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  iconUnderPointer: null,
  commandPaletteAt: { x: 500, y: 300 },
  // No case here reads the theme. S-72 takes the manuscript's default; S-73 is
  // read off the very document this frame draws, which is where the shell gets
  // it from too (DR-5 of table T-052 keeps the hue on `Project`, not in the
  // settings). S-142 is the palette's, and `PALETTE_SHOWN` states it.
  themePreference: 'light',
  themeHue: SCHEDULE.project.themeHue,
  isMilestoneListOpen: false,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesShowing: 'selection',
  propertiesSubject: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

/** The whole argument list of `screenViewFromRegions` (PI-37), in its declared order. */
interface Frame {
  readonly regions: ScreenRegions
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly selection: Selection
  readonly state: ScreenState
  readonly dialogueLog: DialogueLog
  readonly session: ScreenSession
}

const BASE: Frame = {
  regions: REGIONS,
  schedule: SCHEDULE,
  settings: SETTINGS,
  selection: HOLDING_A_TASK,
  state: emptyScreenState(),
  dialogueLog: emptyDialogueLog(),
  session: SESSION,
}

const frameWith = (part: Partial<Frame>): Frame => ({ ...BASE, ...part })

const sessionWith = (part: Partial<ScreenSession>): ScreenSession => ({ ...SESSION, ...part })

/**
 * S-99e says the palette is shown (FR-053), and S-142 says its list of
 * milestone figures is open.
 *
 * ⛔ THE SECOND HALF IS WHY EIGHT ENTRIES OF TABLE T-109 CAN BE ASKED FOR AT
 * ALL. FR-053 (MUST, docs/spec/01-04-requirements.md:2426):
 * 「マイルストーンの図形の入口は、一覧を開くまで出さないこと（MUST）。開閉の
 * 状態は 表 T-206 の `S-142` が持ち、既定は閉じている」-- so on a frame that
 * leaves S-142 at its default those entrances are not on the palette, their
 * words are printed nowhere, and the acceptance case below is right to say the
 * words reach nothing.
 * ⭐ OPENING IT HIDES NOTHING. FR-053 states one condition on one set of
 * entrances and no requirement makes any other entry depend on S-142, so what
 * the open list shows is what the closed one shows and eight rows besides --
 * which is what lets the whole of the palette's roster stand on this one frame
 * rather than on two that would have to be told apart by a rule this file
 * invented.
 * ⚠️ Whether the palette hides IC-50 once the list is open is NOT decided here
 * and is not decided by the specification either; table T-109 gives the opening
 * and the folding two rows and says nothing about showing one at a time. If
 * that is ever settled, this frame is where it lands.
 */
const PALETTE_SHOWN = frameWith({
  state: screenStateWithPalette(emptyScreenState(), true),
  session: sessionWith({ isMilestoneListOpen: true }),
})

/** S-99g says which surface is open (IN-4 of table T-028). */
const surfaceOpen = (surface: string): Frame =>
  frameWith({ state: screenStateWithSurface(emptyScreenState(), surface) })

// ---------------------------------------------------------------------------
// Reading the answer through the published entry (table T-064, PI-37).
// ---------------------------------------------------------------------------

type Build = typeof screenViewFromRegions

const viewOf = (build: Build, frame: Frame, language: string): ScreenView =>
  build(
    frame.regions,
    frame.schedule,
    frame.settings,
    frame.selection,
    frame.state,
    frame.dialogueLog,
    { ...frame.session, language: language as DisplayLanguage },
  )

const labelIn = (commands: readonly CommandItem[] | undefined, icon: string): string | undefined =>
  commands?.find((command) => command.icon === icon)?.label

const paletteCommands = (view: ScreenView): readonly CommandItem[] =>
  (view.commandPalette?.groups ?? []).flatMap((group) => group.commands)

const iconTooltip = (view: ScreenView, icon: string): string | undefined =>
  view.tooltips.find((tip) => tip.anchor.kind === 'icon' && tip.anchor.icon === icon)?.text

const scrollbarTooltip = (view: ScreenView, axis: string): string | undefined =>
  view.tooltips.find((tip) => tip.anchor.kind === 'scrollbar' && tip.anchor.axis === axis)?.text

/**
 * Where the palette floats this frame (FR-053 has the person drag it there).
 *
 * ⭐ A POINT, NOT A RECTANGLE: FR-053 (MUST) makes the palette's size follow its
 * contents, so no description carries an extent to take a centre of. Nothing
 * below needs one -- the pointer only has to be somewhere on the palette for
 * EZ-2 to be asked, and which entry it rests on is `iconUnderPointer`'s answer.
 */
const PALETTE_AT: { readonly x: number; readonly y: number } =
  viewOf(screenViewFromRegions, PALETTE_SHOWN, 'ja').commandPalette?.at ?? { x: 0, y: 0 }

/** The middle of a scrollbar lane, so that FR-037's pointer is on it. */
const scrollbarPointer = (axis: 'horizontal' | 'vertical'): { x: number; y: number } => {
  const bar = viewOf(screenViewFromRegions, BASE, 'ja').frame.scrollbars.find((one) => one.axis === axis)
  if (bar === undefined) throw new Error(`SC-4 of table T-031 keeps both bars drawn, and the ${axis} one is absent`)
  return { x: bar.track.x + bar.track.width / 2, y: bar.track.y + bar.track.height / 2 }
}

// ---------------------------------------------------------------------------
// Where each entry of the dictionary is printed. ⭐ Built by walking the
// dictionary and asking the tables where that key stands -- no place is typed
// out, so an entry the tables move follows.
// ---------------------------------------------------------------------------

interface Place {
  readonly section: string
  readonly key: string
  readonly field: string
  /** The row of table T-075 that owns it. */
  readonly unit: string
  /** Reads as "the App Header entry IC-1". */
  readonly what: string
  readonly frame: Frame
  readonly read: (view: ScreenView) => string | undefined
}

/** An entry of the dictionary this file states no place for, and why. */
interface Dropped {
  readonly section: string
  readonly key: string
  readonly why: string
}

const PLACES: Place[] = []
const DROPPED: Dropped[] = []

const place = (part: Place): void => {
  PLACES.push(part)
}

const drop = (section: string, key: string, why: string): void => {
  DROPPED.push({ section, key, why })
}

// -- icons: the entry's own word (`label`) and the explanation EZ-2 shows (`hint`)

/**
 * Where an icon is drawn, and where the pointer is while it rests on that icon.
 *
 * ⚠️ THE POINT DOES NOT NAME THE ICON, and cannot: no member of `ScreenView`
 * carries an entry's rectangle, which is the whole reason
 * `ScreenSession.iconUnderPointer` exists (PD-141). What the point is for is a
 * session that holds together -- `pointer: null` means the pointer is outside
 * the window, which cannot be true while it rests on an entry.
 */
const iconFrames = new Map<string, Frame>()

for (const entry of GENERATED['icons'] ?? []) {
  const rowId = keyOf('icons', entry)
  const row = t109Row(rowId)
  if (row === undefined) {
    drop('icons', rowId, 'table T-109 has no such row')
    continue
  }
  if (!isEntry(rowId)) {
    drop('icons', rowId, 'table T-109 says it is not an entry a person presses')
    continue
  }

  const surfaces = surfacesOf(rowId)
  const on = (
    what: string,
    unit: string,
    frame: Frame,
    // ⚠️ A POINT rather than a rectangle: the palette has no extent to take a
    // centre of (FR-053, MUST NOT), so each caller hands over the point it
    // means directly.
    pointer: { readonly x: number; readonly y: number },
    read: (view: ScreenView) => string | undefined,
  ): void => {
    place({ section: 'icons', key: rowId, field: 'label', unit, what, frame, read })
    if (!iconFrames.has(rowId)) {
      iconFrames.set(rowId, {
        ...frame,
        session: {
          ...frame.session,
          pointer,
          iconUnderPointer: rowId,
          pointerRestedMs: ICON_HINT_MS + 1,
        },
      })
    }
  }

  if (surfaces.includes('App Header')) {
    on(`the App Header entry ${rowId}`, 'UF-62', BASE, centreOf(REGIONS.appHeader), (view) =>
      labelIn(view.appHeaderItems.commands, rowId),
    )
  }
  if (surfaces.includes('Command Palette')) {
    on(`the Command Palette entry ${rowId}`, 'UF-65', PALETTE_SHOWN, PALETTE_AT, (view) =>
      labelIn(paletteCommands(view), rowId),
    )
  }
  for (const surface of surfaces.filter((name) => SURFACE_NAMES.includes(name))) {
    on(`the ${surface} entry ${rowId}`, 'UF-66', surfaceOpen(surface), centreOf(REGIONS.scheduleCanvas), (view) =>
      labelIn(view.openModal?.commands, rowId),
    )
  }

  if (!PLACES.some((one) => one.section === 'icons' && one.key === rowId)) {
    drop('icons', rowId, `no unit of the five publishes a member for an entry on ${surfaces.join(' / ')}`)
  }
}

for (const [rowId, frame] of iconFrames) {
  // EZ-2 of table T-040 (MUST): the explanation of the icon the pointer rests
  // on, once `iconHintDelayMs` (S-124) has passed.
  place({
    section: 'icons',
    key: rowId,
    field: 'hint',
    unit: 'UF-69',
    what: `the explanation EZ-2 shows against ${rowId}`,
    frame,
    read: (view) => iconTooltip(view, rowId),
  })
}

// -- paletteGroups: the 群 column of table T-109, keyed by the group's first row

for (const entry of GENERATED['paletteGroups'] ?? []) {
  const firstRow = keyOf('paletteGroups', entry)
  const group = groupOf(firstRow)
  const held = T109.rows
    .filter((row) => surfacesOf(row.id).includes('Command Palette'))
    .filter((row) => groupOf(row.id) === group)
    .filter((row) => isEntry(row.id))
  const first = held[0]
  if (group === '' || first === undefined) {
    drop('paletteGroups', firstRow, 'table T-109 puts no entry in that group, so no group of the palette holds it')
    continue
  }
  place({
    section: 'paletteGroups',
    key: firstRow,
    field: 'name',
    unit: 'UF-65',
    what: `the name of the palette group that holds ${first.id}`,
    frame: PALETTE_SHOWN,
    read: (view) =>
      view.commandPalette?.groups.find((one) => one.commands.some((command) => command.icon === first.id))?.name,
  })
}

// -- surfaces: the heading of each surface table T-103 has named

for (const entry of GENERATED['surfaces'] ?? []) {
  const name = keyOf('surfaces', entry)
  if (!SURFACE_NAMES.includes(name)) {
    drop('surfaces', name, 'IC-52 of table T-109 does not name that surface')
    continue
  }
  place({
    section: 'surfaces',
    key: name,
    field: 'heading',
    unit: 'UF-66',
    what: `the heading of ${name}`,
    frame: surfaceOpen(name),
    read: (view) => view.openModal?.heading,
  })
}

// -- panelHeadings: the three states FR-072 makes the panel tell apart

/**
 * FR-072 (MUST): the heading says which of the two is showing, and when the
 * selection has gone the panel keeps what it had and says so.
 */
const PANEL_STATES: Readonly<Record<string, Frame>> = {
  selection: frameWith({ session: sessionWith({ propertiesShowing: 'selection' }) }),
  documentSettings: frameWith({ session: sessionWith({ propertiesShowing: 'documentSettings' }) }),
  noSelection: frameWith({
    selection: emptySelection(),
    session: sessionWith({ propertiesShowing: 'selection' }),
  }),
}

for (const entry of GENERATED['panelHeadings'] ?? []) {
  const showing = keyOf('panelHeadings', entry)
  const frame = PANEL_STATES[showing]
  if (frame === undefined) {
    drop('panelHeadings', showing, 'FR-072 names no such state of the panel')
    continue
  }
  place({
    section: 'panelHeadings',
    key: showing,
    field: 'text',
    unit: 'UF-64',
    what: `the properties panel heading while it shows ${showing}`,
    frame,
    read: (view) => view.propertiesPanel?.heading,
  })
}

// -- assignments: FR-037's hint, shown while the pointer rests on a scrollbar

for (const entry of GENERATED['assignments'] ?? []) {
  const rowId = keyOf('assignments', entry)
  const axis = (['vertical', 'horizontal'] as const).find((one) => assignmentForAxis(one) === rowId)
  if (axis === undefined) {
    drop('assignments', rowId, 'no slower way this component describes does what that row of table T-023 does')
    continue
  }
  place({
    section: 'assignments',
    key: rowId,
    field: 'text',
    unit: 'UF-69',
    what: `the hint FR-037 shows on the ${axis} scrollbar`,
    frame: frameWith({ session: sessionWith({ pointer: scrollbarPointer(axis) }) }),
    read: (view) => scrollbarTooltip(view, axis),
  })
}

// -- arms: the row of table T-023b the palette has armed, read off the palette

/**
 * The rows of table T-023b, each with the `Armed` value that IS that row.
 *
 * ⛔ THE PAIRING IS NOT INVENTED HERE. `Armed` is the published type of UF-59
 * (table T-064, PI-36) and its own declaration marks each member with the row
 * it stands for -- 「/** AR-1 *\/ | { readonly kind: 'none' }」 and so on down to
 * AR-6 -- which is the only thing read out of `src/` for it (rule 04 section 1
 * allows the head, the published types and the signatures). ⚠️ The two values
 * that carry a further choice take one the specification spells: `'rectangle'`
 * is SH-1 of table T-012, and `'diamond'` is the default `_source/erd.json`
 * gives `milestoneGlyph`. Neither reaches the word -- table T-023b gives AR-2
 * and AR-3 one row each, whatever shape is on them.
 */
const ARMED_BY_ROW: Readonly<Record<string, Armed>> = {
  'AR-1': { kind: 'none' },
  'AR-2': { kind: 'taskShape', shapeKind: 'rectangle' },
  'AR-3': { kind: 'milestoneShape', glyph: 'diamond' },
  'AR-4': { kind: 'dependency' },
  'AR-5': { kind: 'commentBox' },
  'AR-6': { kind: 'highlightBox' },
}

for (const entry of GENERATED['arms'] ?? []) {
  const rowId = keyOf('arms', entry)
  const armed = ARMED_BY_ROW[rowId]
  if (armed === undefined) {
    drop('arms', rowId, 'table T-023b has no such row, so nothing can be armed with it')
    continue
  }
  // FR-053 (MUST, docs/spec/01-04-requirements.md:2423):
  // 「**いま構えているものが画面上で読めること（MUST）。** 構えの全数は表 T-023b
  //   が持ち、**依存線は図形ではない。**」 -- and the closing rule of table T-023b
  // (MUST NOT) bars the row id itself from the screen, so what is read here is
  // the WORD the dictionary holds for the armed row.
  // ⭐ ON THE PALETTE, because FR-053 is the requirement that says it and the
  // palette is the surface FR-053 governs; `CommandPalette.armedText` is the
  // member UF-65 publishes for it.
  place({
    section: 'arms',
    key: rowId,
    field: 'text',
    unit: 'UF-65',
    what: `what the palette says it has armed while ${rowId} is armed`,
    frame: {
      ...PALETTE_SHOWN,
      state: screenStateWithArmed(PALETTE_SHOWN.state, armed),
    },
    read: (view) => view.commandPalette?.armedText,
  })
}

// -- the sections whose place is not one of the five units this file may read

for (const section of ['notices', 'reasons', 'questions', 'confirmation', 'noticeDismiss', 'confirmationMarks']) {
  for (const entry of GENERATED[section] ?? []) {
    drop(
      section,
      keyOf(section, entry),
      'its place is UF-67 (notices.ts), which this file may not read, so no member is named for it -- ' +
        'the acceptance group holds its word against the whole of what PI-37 hands out instead',
    )
  }
}

// -- weekdays: the fourth ruler tier, which PI-37 does not hand out at all

// FR-017 (MUST) fixes what each tier of the ruler prints and gives the weekday
// a 段 of its own on the fourth: 「曜日の段は曜日」をそれぞれ 1 段に持つ, with
// the words left to this dictionary -- 「⭐ 曜日の語がどこに住むかは `FR-038`
// が持つ。」
// ⛔ THE BAND IS UF-32'S (`svg-renderer.ts`, table T-075), and `ScreenView` --
// the whole of what PI-37 of table T-064 hands out -- carries no `Time Ruler`
// member for any tier to print into. ⭐ So this is not the omission the six
// sections above make: there the member could not be NAMED but the surface
// could still be raised, and the acceptance group's whole-view reading reached
// the word anyway. Here no frame this file can build could print a weekday
// however the road were wired, so the arrival claim is not one to make against
// PI-37 -- it belongs to a test that may name the band. ⚠️ The roster itself is
// held instead, by the case AT-17 drives in the acceptance group below.
for (const entry of GENERATED['weekdays'] ?? []) {
  drop(
    'weekdays',
    keyOf('weekdays', entry),
    'FR-017 (MUST) prints it on the day tier of the Time Ruler, which is UF-32 s band -- and ScreenView, ' +
      'the whole of what PI-37 hands out, carries no Time Ruler at all, so no frame this file can raise ' +
      'could print it; the roster and its order are held against AT-17 instead',
  )
}

/** One case per place per language, so a failure names one cell of the dictionary. */
interface Case extends Place {
  readonly language: string
  readonly word: string
}

const wordAt = (dictionary: Dictionary, at: Place, language: string): string | undefined =>
  cellsOf(dictionary).find(
    (cell) =>
      cell.section === at.section &&
      cell.key === at.key &&
      cell.field === at.field &&
      cell.language === language,
  )?.word

const CASES: readonly Case[] = PLACES.flatMap((at) =>
  LANGUAGES.map((language) => ({ ...at, language, word: wordAt(GENERATED, at, language) ?? '' })),
)

/**
 * The cells with no word yet. ⚠️ This was every cell a place is named for
 * (PD-160) and is now none of them -- no cell of the dictionary stands empty at
 * all. ⭐ The group below therefore has no case today and gets one the moment a
 * cell is emptied or a new roster entry appears unwritten.
 */
const EMPTY = CASES.filter((one) => one.word === '')

const printed = (at: Place, language: string, build: Build = screenViewFromRegions): string | undefined =>
  at.read(viewOf(build, at.frame, language))

// ---------------------------------------------------------------------------
// Reading a word WITHOUT naming the member that carries it, for the sections
// whose place is UF-67's (`notices.ts`) -- see the head comment's omission 2.
// ---------------------------------------------------------------------------

/** Every string the published view carries, wherever in it the string sits. */
const stringsIn = (value: unknown, found: string[] = [], seen = new Set<unknown>()): readonly string[] => {
  if (typeof value === 'string') found.push(value)
  else if (typeof value === 'object' && value !== null && !seen.has(value)) {
    seen.add(value)
    for (const one of Object.values(value)) stringsIn(one, found, seen)
  }
  return found
}

/**
 * One question raised per row of table T-234 -- the frame the words of the
 * `questions` section have to arrive on, and the one FR-032's mark needs in
 * order to be on the screen at all.
 *
 * ⭐ WHAT AN ASKER HANDS OVER, and nothing else: the row of table T-037 the
 * question follows, the row of table T-234 that says WHICH question it is, and
 * the things that would go. FR-038 (MUST) keeps the sentence on the far side of
 * this seam, exactly as it keeps a telling's -- so there is no prose here to be
 * mistaken for the dictionary's answer.
 *
 * ⭐ WHETHER ANYTHING GOES IS THE TABLE'S ANSWER, read from its 名前を挙げるか
 * column rather than decided here. A row that names what goes is what puts
 * FR-032's mark on the screen at all: HM-10 of table T-015a leaves a `Task`
 * drawn on another row, FR-032 (MUST) has that one shown as such, and CR-218
 * settles the medium as a WORD (RC-13 of table T-026 keeps a new SHAPE the
 * user's own ruling).
 *
 * ⚠️ NOTHING HERE IS ASSERTED and no member of it is read back. The shape is
 * the published entry's own declaration of `RaisedConfirmation` -- version 0.70
 * of the appendix records that the specification deliberately writes no member
 * name or type for it and sends the reader to `src/`'s published entry
 * (CR-146). ⛔ The strings that are not row ids are ASCII stand-ins for what a
 * caller raises; none of them may be a word of the dictionary, or a case would
 * find its own input.
 */
const ASKING = (question: string, namesWhatGoes: boolean): Frame =>
  frameWith({
    session: sessionWith({
      confirmation: {
        manner: 'the manner NT-7 asks for',
        question,
        items: namesWhatGoes ? [{ name: 'a task', isShownOnAnotherRow: true }] : [],
      },
    }),
  })

/**
 * One telling raised per row of table T-233 -- the frame the words of the
 * `reasons` section have to arrive on.
 *
 * ⭐ WHAT A RAISER HANDS OVER, and nothing else: the row of table T-037 the
 * telling follows and the row of table T-233 that is its reason. FR-038 (MUST)
 * keeps the words on the far side of this seam, so a raiser that supplied one
 * would be the second store of translated strings the same requirement forbids
 * (MUST NOT) -- which is why there is no sentence here to be mistaken for the
 * dictionary's answer. ⚠️ NT-3's count is `null`: table T-233's rows are not
 * the destructive ones, and a number is not a word.
 *
 * ⚠️ NOTHING HERE IS ASSERTED and no member of it is read back. The shape is
 * the published entry's own declaration of `RaisedNotice` (table T-064, PI-37).
 */
const TELLING = (manner: string, reason: string): Frame =>
  frameWith({ session: sessionWith({ notices: [{ manner, reason, affectedCount: null }] }) })

/** Every frame this file knows how to put on the screen, each named. */
const FRAMES: readonly { readonly what: string; readonly frame: Frame }[] = [
  ...PLACES.map((at) => ({ what: at.what, frame: at.frame })),
  ...T234.map((entry) => ({
    what: `the question ${entry.row} of table T-234 raises`,
    frame: ASKING(entry.row, entry.namesWhatGoes),
  })),
  ...T233.map((entry) => ({
    what: `the telling ${entry.row} of table T-233 raises, in the manner of ${entry.manner}`,
    frame: TELLING(entry.manner, entry.row),
  })),
]

/** The frames that print exactly this word when the view is asked for in this language. */
const framesPrinting = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] =>
  FRAMES.filter((one) => stringsIn(viewOf(screenViewFromRegions, one.frame, language)).includes(word))

// ---------------------------------------------------------------------------
// 1. THE CARRIAGE -- what a written word has to satisfy.
// ---------------------------------------------------------------------------

/**
 * The dictionary this group drives the units with: the generated one with a
 * word that names its own cell in place of every cell. ⛔ It is built here and
 * never written to `_source/display-words.json` -- the words are the user's
 * decision (PD-160), and a test that wrote one would be making it for them.
 */
const FILLED = fillEveryWord(GENERATED)

describe('FR-038 -- a word the dictionary holds is the word the screen prints', () => {
  /**
   * ⭐ WHY THIS GROUP BUILDS ITS OWN DICTIONARY. It was built when every cell
   * this group has a place for was empty (PD-160), so a group that stood by
   * until a word was written asserted nothing at all -- 272 cases that returned
   * on their first line, and three deliberate breaks of the road each turned
   * exactly ONE of them red. ⚠️ THE WORDS HAVE SINCE BEEN WRITTEN, and the
   * filled copy is kept rather than retired: the third case below is the same
   * claim against the dictionary AS IT STANDS, and it is the one that goes
   * vacuous again for any cell the user empties or has yet to write. The
   * dictionary is data: standing a FILLED copy where the five units import
   * theirs from drives the carriage for every place a word is owed, whatever
   * the manuscript holds, and leaves the manuscript untouched.
   *
   * ⭐ WHY THE FILLED WORDS CANNOT PASS BY ACCIDENT. Each names its own cell
   * -- section, key, field and language -- and appears nowhere else in the
   * tree. A unit that prints its stand-in, or another entry's word, or the
   * other language's word, or another member of the same entry, prints
   * something this case did not ask for and goes red.
   */
  let carriage: Build | undefined

  beforeAll(async () => {
    vi.resetModules()
    vi.doMock(GENERATED_MODULE, () => ({ default: FILLED }))
    carriage = (await import('../../src/adapter/screen-renderer/screen-renderer'))
      .screenViewFromRegions as Build
  })

  afterAll(() => {
    vi.doUnmock(GENERATED_MODULE)
    vi.resetModules()
  })

  /** ⛔ Never falls back to the real build: that would make every case vacuous again. */
  const driven = (): Build => {
    if (carriage === undefined) {
      throw new Error('the filled dictionary was never stood in place of the generated one')
    }
    return carriage
  }

  it('has one case per place per language, over every section but UF-67 s two', () => {
    expect(PLACES.length, 'no place was found at all -- the tables moved under this file').toBeGreaterThan(0)
    expect(CASES).toHaveLength(PLACES.length * LANGUAGES.length)
  })

  it.each(CASES)(
    '$section $key $field holds a word in $language -> the view is built -> $what prints exactly it',
    (one: Case) => {
      expect(
        printed(one, one.language, driven()),
        `FR-038 (MUST): ${one.what} is ${one.unit}'s, and the dictionary gives ` +
          `${one.section}.${one.key}.${one.field} a word of its own in ${one.language}`,
      ).toBe(sentinel(one.section, one.key, one.field, one.language))
    },
  )

  it.each(PLACES)(
    '$section $key $field holds a different word per language -> the view is built in each -> $what answers a different one in each',
    (at: Place) => {
      // FR-038 (MUST) shows the menus in the language the READER chose, and
      // 「対象は `ja` と `en` の 2 言語とする」. ⛔ A place that answers the same
      // string whichever language is asked for is not reading the language at
      // all -- it would satisfy the case above in one of the two by luck.
      const answers = LANGUAGES.map((language) => printed(at, language, driven()))
      expect(
        new Set(answers).size,
        `FR-038 (MUST): ${at.what} is ${at.unit}'s, and the dictionary gives ` +
          `${at.section}.${at.key}.${at.field} a word per language: ${JSON.stringify(answers)}`,
      ).toBe(LANGUAGES.length)
    },
  )

  it.each(CASES.filter((one) => one.word !== ''))(
    '$section $key $field is written in $language -> the view is built from the file -> $what prints exactly it',
    (one: Case) => {
      // ⭐ THE SAME CLAIM AGAINST THE DICTIONARY AS IT STANDS, and the word
      // comes from the file rather than from here. ⚠️ It had no case at all
      // while PD-160 left every cell empty; it now has one per written cell,
      // and each is asked in EACH language -- which is what makes it, and not
      // the acceptance group, the place a placed cell's language claim is made.
      // ⛔ A cell the user leaves empty drops out here and is picked up by the
      // fallback group instead.
      expect(
        printed(one, one.language),
        `FR-038 (MUST): ${one.what} is ${one.unit}'s, and the dictionary gives it ${JSON.stringify(one.word)}`,
      ).toBe(one.word)
    },
  )
})

// ---------------------------------------------------------------------------
// 2. THE FALLBACK -- what stands there while the word is not written.
// ---------------------------------------------------------------------------

describe('PD-160 -- an entry with no word still leaves something at its place', () => {
  it.each(EMPTY)(
    '$section $key $field is empty in $language -> the view is built -> $what still prints a string',
    (one: Case) => {
      // ⛔ WHAT the stand-in says is not asserted: CR-194 settled "keep printing
      // what it printed before" without asking, and docs/spec fixes no wording.
      // What IS asserted is that the place is still there -- an entry that lost
      // its member would be a road that drops the word once one is written.
      expect(
        typeof printed(one, one.language),
        `${one.what} is ${one.unit}'s and the dictionary has no word for it, so the stand-in has to stand`,
      ).toBe('string')
    },
  )

  it.each(LANGUAGES)(
    'no heading is written for the panel in %s -> the three states FR-072 names are built -> each says what it is showing',
    (language) => {
      const headings = Object.entries(PANEL_STATES).map(([showing, frame]) => ({
        showing,
        heading: viewOf(screenViewFromRegions, frame, language).propertiesPanel?.heading,
      }))

      for (const { showing, heading } of headings) {
        expect(
          heading ?? '',
          `FR-072 (MUST): the panel says what it is showing, and it is showing ${showing}`,
        ).not.toBe('')
      }
      expect(
        new Set(headings.map((one) => one.heading)).size,
        'FR-072 (MUST): selection / documentSettings / the selection having gone read alike',
      ).toBe(headings.length)
    },
  )

  it('says the selection has gone by the member FR-072 asks the heading to answer for', () => {
    // The `noSelection` heading is only that heading while this is the state it
    // stands in; without it the case above would be comparing two of the same.
    const panel = viewOf(screenViewFromRegions, PANEL_STATES['noSelection'] as Frame, 'ja').propertiesPanel
    expect(panel?.showing, 'FR-072 (MUST NOT): clearing the selection does not move it to the settings').toBe(
      'selection',
    )
    expect(panel?.isSubjectGone, 'FR-072 (MUST): the panel keeps what it had and says the selection has gone').toBe(
      true,
    )
  })
})

// ---------------------------------------------------------------------------
// 3. THE ACCEPTANCE -- CR-194 section 5, which ruling 06 asks for.
// ---------------------------------------------------------------------------

describe('CR-194 section 5 / PD-160 -- fill one word of the manuscript and it reaches the screen', () => {
  it('offers a word per language -> the languages are read from the dictionary -> they are FR-038 s two', () => {
    // FR-038: 「対象は `ja` と `en` の 2 言語とする」.
    expect(new Set(LANGUAGES)).toEqual(new Set(['ja', 'en']))
  })

  it('the manuscript is the source -> both files are read -> the generated dictionary matches it cell for cell', () => {
    // ⛔ Without this the guard below would be blind: a manuscript that changed
    // without `npm run gen` leaves the screen reading the old words.
    //
    // ⚠️ SECTION BY SECTION, AND NOT AS ONE LIST, for the reason the case below
    // states in as many words: the generated file is printed in the order its
    // generator fixes, and nothing in docs/spec asks a hand-kept JSON to hold
    // its sections in that same order. Chapter 6.2 (MUST) asks only 「生成物は、
    // 原稿から作り直した結果と一致すること（MUST）」, which is about the words,
    // not about where a section is printed. ⭐ THE CONTENT CLAIM IS UNWEAKENED:
    // every section of either file is walked, and within a section the entries,
    // the fields and the languages are still held in order -- so a word that
    // differs, an entry that is missing, an entry that has moved inside its
    // section, and a section one file holds and the other does not all fail
    // here. ⚠️ `arms` is what made the difference visible: the manuscript keeps
    // it between `panelHeadings` and `assignments` and the generator prints it
    // last.
    const held = (cells: readonly Cell[], section: string): readonly string[] =>
      cells
        .filter((cell) => cell.section === section)
        .map((cell) => `${cell.section}.${cell.key}.${cell.field}.${cell.language}=${cell.word}`)

    const sections = [...new Set([...Object.keys(GENERATED), ...Object.keys(MANUSCRIPT)])].sort()
    for (const section of sections) {
      expect(held(GENERATED_CELLS, section), `section ${section}`).toEqual(held(MANUSCRIPT_CELLS, section))
    }
  })

  it('the specification says which words the screen needs, and FR-032 has just added one -> both files are read section by section and entry by entry -> every section is one this file can key and every entry is a place here or a stated omission', () => {
    // ⛔ Without this an entry could be passed over in silence -- a section
    // added to the dictionary would simply have no case, and the guard below
    // would then say "one word changed" about a word nothing here can read.
    //
    // ⚠️ THE SLOT-FOR-SLOT PART COMES FIRST, and it is held against BOTH files.
    // `keyOf` answers the empty string for a section this file has no key
    // field for, so a new section does not fail loudly by itself -- every one
    // of its entries collapses onto one name. FR-032 added `confirmationMarks`
    // exactly that way (the mark shown against a `Task` that HM-10 of table
    // T-015a leaves drawn on another row; CR-218 ruled the medium a word). ⛔ A
    // roster typed twice would go stale in silence, so the check is a walk
    // section by section, not a count.
    //
    // ⚠️ The GENERATED file is walked in its printed order, which the generator
    // fixes; the MANUSCRIPT is walked by name, because nothing asks a hand-kept
    // JSON to hold its sections in one order and a false red would teach the
    // reader to stop believing this case.
    expect(
      Object.keys(GENERATED),
      'the generated dictionary holds a section this file cannot key, or has lost one, or has re-ordered them',
    ).toEqual(Object.keys(KEY_FIELD))
    expect(
      [...Object.keys(MANUSCRIPT)].sort(),
      'the manuscript holds a section this file cannot key, or has lost one',
    ).toEqual([...Object.keys(KEY_FIELD)].sort())
    expect(
      Object.entries(GENERATED)
        .flatMap(([section, entries]) => entries.map((entry) => ({ section, key: keyOf(section, entry) })))
        .filter((one) => one.key === '')
        .map((one) => one.section),
      'an entry with no key is an entry this file reads under the same name as its neighbours',
    ).toEqual([])

    const accounted = new Set([
      ...PLACES.map((at) => `${at.section}.${at.key}`),
      ...DROPPED.map((one) => `${one.section}.${one.key}`),
    ])
    const held = Object.entries(GENERATED).flatMap(([section, entries]) =>
      entries.map((entry) => `${section}.${keyOf(section, entry)}`),
    )
    expect([...new Set(held)].filter((id) => !accounted.has(id))).toEqual([])
  })

  it('holds a word for every row of table T-109 -> the two rosters are compared -> the icons section is that table', () => {
    // FR-029 (MUST) makes table T-109 the whole of the icons, so a word missing
    // from this section is a place the road cannot reach whatever is written.
    expect((GENERATED['icons'] ?? []).map((entry) => keyOf('icons', entry))).toEqual(
      T109.rows.map((row) => row.id),
    )
  })

  it('FR-017 (MUST) gives the weekday a 段 of its own -> AT-17 s cell and the roster are read -> the seven stand in AT-17 s order, each with a word in each language', () => {
    // ⭐ THE ONE CLAIM THIS FILE CAN MAKE ABOUT THE `weekdays` SECTION, and the
    // reason omission 6 of the head comment is not the whole answer. Where the
    // words are printed is UF-32's band, which PI-37 does not hand out -- but
    // WHICH seven there are, and in WHAT ORDER, is fixed by the specification
    // and is readable here.
    //
    // ⛔ AT-17 IS HELD FIRST, so this case is driven by the specification's own
    // sentence rather than by the roster below it (Chapter 1.9 :275). AT-17 of
    // table T-058: 「週の始まりの曜日。…**`0` が日曜で、土曜の `6` まで 1 ずつ
    // 増える**（正は Chapter 6.2 が指す公式 XSD）。」 ⚠️ Matched in Japanese
    // because that sentence is the only place the specification states the
    // numbering; there is no table of seven rows to read, and Chapter 6.2
    // (MUST NOT) is why -- 「空の欄が並ぶだけで、規則を 1 つも述べない表になる」.
    expect(AT_17, 'AT-17 no longer numbers the weekdays from 0 = Sunday').toMatch(/`0` が日曜/)
    expect(AT_17, 'AT-17 no longer rises to 6 = Saturday').toMatch(/土曜の `6`/)

    // ⛔ THE ORDER IS LOAD-BEARING, not cosmetic: `Project.weekStartDay` (AT-17)
    // is stored as a number against this very numbering, so a roster in another
    // order would have the ruler print Monday's word against Sunday's index.
    expect(
      (GENERATED['weekdays'] ?? []).map((entry) => keyOf('weekdays', entry)),
      'AT-17 of table T-058: 0 is Sunday and it rises by one to 6 for Saturday, and Project.weekStartDay is stored against that numbering',
    ).toEqual(AT_17_ORDER)

    // FR-017 (MUST): the fourth tier holds a 段 that prints 曜日. ⛔ An empty cell here
    // leaves that MUST unmet the way FR-032's mark does -- a weekday with no
    // word prints no weekday -- and NOT the way PD-160 leaves a label to the
    // user, which the fallback group is for. ⚠️ Held against the MANUSCRIPT,
    // which Chapter 6.2 (MUST) makes the source; the case above already holds
    // the generated file to it cell for cell.
    const seven = MANUSCRIPT_CELLS.filter((cell) => cell.section === 'weekdays')
    expect(
      seven.filter((cell) => cell.word === '').map((cell) => `${cell.key}.${cell.field}.${cell.language}`),
      'FR-017 (MUST): the fourth tier holds a 段 of weekdays, and an empty cell prints none',
    ).toEqual([])
    expect(
      seven.length,
      'FR-038 (MUST): the two languages are ja and en, so the seven owe one word each in each of them',
    ).toBe(AT_17_ORDER.length * LANGUAGES.length)
  })

  it('the carriage group drives a dictionary of its own -> that copy is read back -> every cell of it holds a word that names only itself', () => {
    // ⛔ THE GUARD ON THE CARRIAGE GROUP ITSELF. Its cases are worth their
    // titles only while the copy they drive really holds a word in every
    // cell: a `fillEveryWord` that skipped a section would leave them comparing
    // a stand-in against a stand-in, which is the vacuity this file was
    // repaired out of. ⚠️ And a word that named two cells would let a unit
    // print the wrong one and pass.
    const filledCells = cellsOf(FILLED as Dictionary)

    expect(
      filledCells.map((cell) => `${cell.section}.${cell.key}.${cell.field}.${cell.language}`),
      'the filled copy has to cover the dictionary cell for cell, or a place is driven by nothing',
    ).toEqual(
      GENERATED_CELLS.map((cell) => `${cell.section}.${cell.key}.${cell.field}.${cell.language}`),
    )
    expect(
      filledCells.filter((cell) => cell.word === '').map((cell) => `${cell.section}.${cell.key}`),
      'an empty cell of the filled copy is a case that asserts nothing',
    ).toEqual([])
    expect(
      new Set(filledCells.map((cell) => cell.word)).size,
      'two cells sharing a word would let a place print the other one and pass',
    ).toBe(filledCells.length)
  })

  it('the words it fills with stand for nothing else -> the tree is searched -> no unit can be printing one of its own', async () => {
    // ⚠️ The carriage group reads a sentinel as proof that the word came from
    // the dictionary. That reading holds only while no unit could produce the
    // same string on its own, so the shape is checked against the five units'
    // own source rather than assumed.
    const { readdirSync } = await import('node:fs')
    const dir = join(ROOT, 'src', 'adapter', 'screen-renderer')
    const inTheTree = readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .filter((name) => readFileSync(join(dir, name), 'utf8').includes('<word '))

    expect(inTheTree, 'a unit that could write this shape itself would make the carriage group pass by accident').toEqual(
      [],
    )
  })

  it('FR-032 (MUST) shows its mark as a word -> the manuscript is read and every frame this file can build is put on the screen -> that word is written, and every word that IS written is printed on one of them in its own language', () => {
    // ⭐ THE HALF RULING 06 ASKS FOR, and PD-160's row words it: 「原稿の 1 語
    // を埋めると画面に届く試験」. ⛔ While every cell was empty the only way to
    // say that was a guard that FELL the moment a word appeared (CR-194 section
    // 5 item 2). A word has appeared, so the guard is now stated as the claim
    // it stood in for -- ⛔ NOT as "no word is written", which would sleep
    // through every word the user writes from here on.
    //
    // ⭐ NO MEMBER IS NAMED. FR-032's mark is printed by UF-67 (`notices.ts`),
    // which this file may not read, so the claim is made against the WHOLE of
    // what `screenViewFromRegions` (PI-37) hands out: the word has to be
    // somewhere in it. That is weaker than pointing at one member and far
    // stronger than nothing -- and ⭐ it cannot be shaped around an
    // implementation it never reads, which is the point of rule 04 section 1.

    // FR-032 (MUST): a `Task` that goes with the row but is drawn on another
    // row is SHOWN as such, and CR-218 settles the medium as a word. ⛔ Unlike
    // the cells PD-160 leaves to the user, an empty cell here leaves that MUST
    // unmet -- an empty word shows nothing.
    const mark = MANUSCRIPT_CELLS.filter((cell) => cell.section === 'confirmationMarks')
    expect(
      mark.length,
      'FR-032 (MUST) needs a word per language for the mark, and the manuscript holds no cell for it at all',
    ).toBe(LANGUAGES.length)
    expect(
      mark.filter((cell) => cell.word === '').map((cell) => `${cell.key}.${cell.field}.${cell.language}`),
      'FR-032 (MUST): the medium is a word (CR-218), so this cell cannot stand empty the way PD-160 leaves the others',
    ).toEqual([])

    const written = MANUSCRIPT_CELLS.filter((cell) => cell.word !== '')

    // ⭐ WHICH WRITTEN CELLS THIS CASE CAN HOLD TO A FRAME, now that the
    // manuscript is nearly full rather than nearly empty. Every cell this file
    // NAMES A PLACE FOR -- and, for the sections whose member it may not name
    // (omission 2 of the head comment), the cells NT-7's own surface prints:
    // the two answers, FR-032's mark, and the words of the entries table T-109
    // stands on U-55.
    //
    // ⛔ A STATED OMISSION IS OUT, AND OUT BY NAME. `DROPPED` is this file's
    // own record of the cells it can raise no frame for -- an entry table T-109
    // says is not pressed, one whose surface belongs to a unit this file may
    // not read, a row of table T-023 whose surface is not assembled yet. Asking
    // arrival of those would be asking this file to disprove the scope it
    // declared, and the answer would be "no frame prints it" for a reason that
    // is nothing to do with the road. ⚠️ THE CASE ABOVE IS WHAT KEEPS THAT LIST
    // HONEST: an entry that is neither a place nor a stated omission fails
    // there, so nothing can slip out of this loop by being forgotten.
    const stated = new Set(DROPPED.map((one) => `${one.section}.${one.key}`))
    // ⭐ THE STATED OMISSIONS THIS FILE CAN STILL RAISE A FRAME FOR. A cell whose
    // MEMBER is UF-67's is named nowhere here, but the surface it stands on can
    // be put on the screen -- NT-7's question for the two answers and FR-032's
    // mark, and now a telling per row of table T-233 for the words FR-076 (MUST)
    // makes every reason carry. ⛔ So being dropped for want of a member is not
    // being let off the arrival claim.
    const onASurfaceUf67Draws = (cell: Cell): boolean =>
      cell.section === 'confirmation' ||
      cell.section === 'confirmationMarks' ||
      cell.section === 'reasons' ||
      cell.section === 'questions' ||
      (cell.section === 'icons' && cell.field === 'label' && ON_U_55.includes(cell.key))
    const owed = written.filter(
      (cell) => !stated.has(`${cell.section}.${cell.key}`) || onASurfaceUf67Draws(cell),
    )

    expect(
      owed.some((cell) => cell.section === 'confirmationMarks'),
      'FR-032 (MUST): the mark is what this case exists to hold, and it fell out of the loop',
    ).toBe(true)
    expect(
      new Set(owed.filter((cell) => cell.section === 'reasons').map((cell) => cell.key)),
      'FR-076 (MUST): every row of table T-233 owes NT-1 s words and NT-3a s next step',
    ).toEqual(new Set(T233.map((entry) => entry.row)))
    expect(
      new Set(owed.filter((cell) => cell.section === 'questions').map((cell) => cell.key)),
      'FR-076 (MUST): every row of table T-234 owes NT-7 s sentence -- what is about to happen, in words',
    ).toEqual(new Set(T234.map((entry) => entry.row)))

    for (const cell of owed) {
      const at = `${cell.section}.${cell.key}.${cell.field}`

      // ⭐ The arrival itself: one of the frames prints exactly this word.
      const on = framesPrinting(cell.word, cell.language)
      expect(
        on.length,
        `FR-038 (MUST): ${at} is written in ${cell.language}, and none of the ${FRAMES.length} frames this ` +
          'file can build prints it -- that word is reaching nowhere (PD-160, CR-194 section 5 item 2). ' +
          'Run `npm run gen` first; if it still fails, the road from the dictionary to the screen is cut, ' +
          'or the word is printed by a frame this file does not know how to raise.',
      ).toBeGreaterThan(0)

      // ⭐ And it arrives BECAUSE of the language, not by luck: FR-038 (MUST)
      // shows the words in the language the reader chose, so a frame that
      // prints this one when the other language is asked for is not reading
      // the dictionary by language at all. ⚠️ Only checked where the entry
      // really holds two different words -- a repeated word is legitimate.
      //
      // ⛔ AND ONLY FOR THE CELLS WITH NO NAMED PLACE. For a cell this file
      // names a place for, the carriage group's third case already holds that
      // place to the written word in EACH language, which is the same claim
      // made against ONE member instead of against every string in the view.
      // ⚠️ Made here too, the whole-view reading turns false the moment a word
      // is spelt like something the view carries untranslated: the settled
      // names of table T-103 travel on `openModal.surface` in either language,
      // and one entry's English word is spelt exactly like the surface it
      // opens. That is FR-038 working, not failing -- table T-103 holds names,
      // not screen text.
      if (PLACES.some((one) => one.section === cell.section && one.key === cell.key)) continue
      for (const other of LANGUAGES.filter((one) => one !== cell.language)) {
        const twin = MANUSCRIPT_CELLS.find(
          (one) =>
            one.section === cell.section &&
            one.key === cell.key &&
            one.field === cell.field &&
            one.language === other,
        )
        if (twin === undefined || twin.word === '' || twin.word === cell.word) continue
        for (const one of on) {
          expect(
            stringsIn(viewOf(screenViewFromRegions, one.frame, other)).includes(cell.word),
            `FR-038 (MUST): ${at} holds a word of its own per language, so ${one.what} must not print the ` +
              `${cell.language} one when the view is asked for in ${other}`,
          ).toBe(false)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// The filled copy the acceptance case stands in place of the dictionary.
// ---------------------------------------------------------------------------

/** A word that stands for one cell and for nothing else. */
function sentinel(section: string, key: string, field: string, language: string): string {
  return `<word ${section}.${key}.${field}.${language}>`
}

/** The dictionary with every cell filled by the word that names it. */
function fillEveryWord(dictionary: Dictionary): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [section, entries] of Object.entries(dictionary)) {
    out[section] = entries.map((entry) => {
      const key = keyOf(section, entry)
      const filled: Record<string, unknown> = { ...entry }
      for (const field of wordFieldsOf(entry)) {
        const words: Record<string, string> = {}
        for (const language of Object.keys(wordsOf(entry, field))) {
          words[language] = sentinel(section, key, field, language)
        }
        filled[field] = words
      }
      return filled
    })
  }
  return out
}
