// FR-066 (MUST / MUST NOT): the dialogue field's VISIBILITY is a value of its
// own, separate from whether the `Agent API` is enabled -- so `IC-18` says
// whether the field is up, and `IC-20` says whether the API is on, and neither
// answers for the other.
//
// ⛔ THIS FILE IS THE COVER FOR DEFECT D-149. What was measured on 2026-08-30:
// `IC-18` and `IC-20` read ONE value, so pressing `IC-20` raised `IC-18`'s
// pressed state, and `IC-18` had no working 「非表示にする」 half at all. The
// ruling of 2026-08-31 gave the visibility its own row -- `S-99i` of 表 T-206 --
// and 表 T-237 its own paint row, `EN-5`.
//
// Units under test, both of table T-075, both `pure`, both in component CP-37
// of table T-062:
//   UF-62  `app-header-items.ts`  -- `appHeaderItemsFromDocument`, which is
//          where `IC-18` and `IC-20` get their pressed and faint states
//   UF-68  `dialogue-field.ts`    -- `dialogueFieldFromLog`, which is where the
//          field itself is either described or left `null`
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING EITHER UNIT'S BODY, AND WITHOUT READING ANY FILE
// UNDER src/ AT ALL (docs/development-rules/04-verification.md, section 1 --
// this bench was fenced tighter than that section requires). What was read:
// docs/spec/ for every rule named below, docs/development-records/defects.md
// for what D-149 measured, and the neighbouring tests for the argument lists
// and the member names. ⚠️ That last one is the honest weak point, and GAP 1
// below says so: no row of the specification writes `ScreenSession`'s members.
//
// ---------------------------------------------------------------------------
// The sentences these cases hold
// ---------------------------------------------------------------------------
//
//   FR-066 (Chapter 3, 「AI と画面上で対話する」):
//
//     「`Agent API` が有効であるあいだ、`GRS` は、画面上で AI と言葉をやり取りする
//      欄を表示すること。」
//     ⭐ 「閲覧者がその欄を非表示にしているあいだは表示しないこと（MUST）」 ——
//      「見え方は `_assets/tbl-settings.md` の 表 T-206 の `S-99i` が持ち、切り替え
//      の入口は `_assets/tbl-glossary.md` の 表 T-109 の `IC-18` である。」
//     ⛔ 「`Agent API` の有効・無効（`FR-065`）と 1 つの値で兼ねてはならない
//      （MUST NOT）」 —— 「能力と見え方は別の概念であり、兼ねると `Agent API` を
//      有効にしただけで `IC-18` が押された状態になる」（実測 2026-08-30）
//     ⚠️ 「`Agent API` が無効のあいだ `IC-18` は薄く描かれる」 —— 「規則は `FR-029`
//      が、告げる理由は同要求の 表 T-233 の `RS-35` が持つ。」
//
//   表 T-206 の `S-99i` 「対話欄（`_assets/tbl-glossary.md` の `U-44`）を表示して
//     いるか（`FR-066`）」, 既定 「表示」:
//     ⛔ 「`Agent API` が有効かどうか（`S-99b`）とは別の値として持つこと。1 つの値で
//      兼ねてはならない」 —— 「あちらは能力であり、本行は見え方である。」
//     ⚠️ 「兼ねていたので、`Agent API` を有効にしただけで `IC-18` の押下状態が立って
//      いた」（実測 2026-08-30。利用者の裁定 2026-08-31）
//     ⭐ 「既定が「表示」なのは、`FR-066` が有効なあいだ欄を表示すると定めているから
//      である」 —— 「有効にした人が、もう一度別の入口を押すまで何も出ない形にしない。」
//
//   FR-029, 表 T-237 の `EN-5` 「その入口が表示・非表示を切り替えるものを、いま表示
//     している（表 T-206）」, 塗りの色 `S-183`, 定める要求 本要求.
//     ⭐ 「いま表示している」 is the whole of what the fill claims, and it is why
//     `IC-18` is NOT filled while the `Agent API` is off: the field is not up.
//   FR-029 (MUST NOT): ⛔ 「上の薄く描く入口には当ててはならない（MUST NOT）」 ——
//     an entrance drawn faint may not also be filled, which says the same thing
//     from the other side.
//   FR-029 (MUST): 「その入口を押しても、いま文書にも画面にも何も変えられないときは、
//     その入口を薄く描くこと（MUST）」／「押されたときに限り、行えない理由を通知する
//     こと（MUST）…運ぶ理由は…表 T-233 の行とすること（MUST）」
//   表 T-233 の `RS-35` 「`Agent API` が入っていないので、対話欄を出せない」, 作法
//     `NT-1`, 正 `FR-066` -- the half of D-149 that was never broken.
//   表 T-109 の `IC-18` 「AI との対話欄を表示する・非表示にする」（正 `FR-066`）と
//     `IC-20` 「`Agent API` を有効にする・無効にする」（正 `FR-065`）
//     ⚠️ THE WORDING IS NEW. Thirteen rows of 表 T-109 read 「出す・しまう」 until
//     the ruling of 2026-08-31（「出す・しまう は用語が違うな…適切な用語を使え。
//     コードも仕様書もだ」）. The guards below pin the NEW words; a file that
//     pinned 「出す・しまう」 would report the corrected manuscript as wrong.
//   FR-065: 「人が `Agent API` を画面上で有効にできるようにし、有効であるあいだ、
//     そのことを画面上に示すこと（MUST）」 -- `IC-20`'s whole duty.
//   FR-072: 「その押下状態の見せ方は `FR-029` の 表 T-237 の `EN-4` に従うこと
//     （MUST）」 -- quoted because it is where 「押下状態」 is settled as the name of
//     the boolean 表 T-237 paints, which is what lets `EN-5` reach `isPressed`.
//   表 T-075: UF-62 and UF-68 are both `pure`, so neither may answer differently
//     to the same arguments.
//
// ---------------------------------------------------------------------------
// GAPS -- reported rather than invented (rule 04 section 1)
// ---------------------------------------------------------------------------
//
//   GAP 1. THE MEMBER NAME IS NOWHERE IN THE SPECIFICATION. `S-99i` says what
//     is remembered and 表 T-064's `PI-37` does not enumerate `ScreenSession`'s
//     members at all, so no row of docs/spec/ spells the key. `defects.md`'s
//     D-149 row says only 「`ScreenSession` に行が要り」 and the ruling asks for
//     the 「`Visible`」 vocabulary and the `xxxVisible` settings-key shape. This
//     file therefore writes `isDialogueFieldVisible`, which is the name the
//     neighbouring tests already use -- NOT a name the manuscript states.
//     ⚠️ It cannot hide a wrong guess: a member the unit does not read is a
//     member that changes nothing, and every case below would fall.
//
//   GAP 2. 表 T-233's `RS-35` says 「`Agent API` が入っていない」 -- not IN -- while
//     FR-066, FR-065 and 表 T-109's `IC-20` all speak of 有効・無効. Whether "not
//     in" and "disabled" are one situation or two is stated nowhere. No case
//     here decides it: the cases assert that `IC-18` is FAINT while the API is
//     disabled (which FR-066's ⚠️ states in as many words) and leave which row
//     the press then carries to tests/unit/fr-029-the-reason-a-press-carries.
//
//   GAP 3. WHAT BECOMES OF `S-99i` WHEN THE API IS TURNED OFF AND ON AGAIN is
//     not settled. FR-066 states two conditions and no transition; `S-99i` says
//     only that the two values are separate. So no case below asserts that
//     hiding the field survives a disable, nor that it is forgotten by one.
//     Every case fixes both values and reads the answer for that pair.
//
//   GAP 4. `EN-5` says 「その入口が表示・非表示を切り替えるものを、いま表示している
//     （表 T-206）」, which by its own words reaches every entrance toggling a row
//     of 表 T-206 -- `IC-7` (`S-99e`) as well as `IC-18` (`S-99i`). Whether
//     `IC-11` (`S-99f`, full screen) is one of them is not decided, since 表
//     T-109 words that row 「全画面表示に入り、同じ入口で出る」 and not
//     表示・非表示. This file asserts `IC-18` only.
//
//   GAP 5. NO ROW SAYS WHICH MEMBER OF `ScreenView` CARRIES `EN-5`, the same
//     hole tests/unit/fr-029-in-effect-is-filled-not-rimmed.test.ts reports for
//     `EN-1` .. `EN-4`. `CommandItem` has two booleans that can mean 「いま効いて
//     いる」, and FR-072 settles 「押下状態」 as the word for the one 表 T-237 paints,
//     so `EN-5` is driven through `isPressed` here for the same reason that file
//     drives `EN-2` and `EN-4` through it.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT THIS BENCH FOUND ON ITS FIRST RUN, AND WHAT WAS DONE ABOUT IT
// ---------------------------------------------------------------------------
//
// Four cases were red on their first run, all on ONE disagreement: with the
// `Agent API` OFF and `S-99i` at 「表示」, `IC-18` came back `isPressed: true`.
// ⚠️ That is the STARTUP state -- `S-99i` defaults to 「表示」 and FR-065 makes
// the API off until a person turns it on. The two sentences that decide it:
//
//   表 T-237 の `EN-5`: 「その入口が表示・非表示を切り替えるものを、いま表示している」
//     —— 「いま表示している」 is a present state of the thing toggled, and while
//     the API is off the field is NOT up (FR-066's first sentence; UF-68
//     answers `null`, which the group below confirms). So `EN-5` does not hit.
//   FR-029: ⛔ 「上の薄く描く入口には当ててはならない（MUST NOT）」 —— 「効いていて、
//     かついま何も変えられない入口が濃くなると、薄さの意味が消える。」 `IC-18` IS
//     drawn faint while the API is off (FR-066's own ⚠️), so the fill may not
//     be applied to it.
//
// ⭐ The unit was corrected to read both values, and the four cases are green.
// ⚠️ THE OTHER READING IS WRITTEN DOWN HERE BECAUSE IT IS NOT ABSURD: GAP 5
// below says no row names the member that carries `EN-5`, and UF-72 already
// refuses to fill a faint entrance
// (tests/unit/fr-029-in-effect-is-filled-not-rimmed.test.ts), so nothing would
// have been MISDRAWN. What would have been wrong is the description claiming
// 「いま表示している」 of a field that is not up -- and that claim is what D-149 was.
//
// ---------------------------------------------------------------------------
// ⛔ A CASE THIS FILE REPLACES
// ---------------------------------------------------------------------------
//
// tests/unit/uf-62.test.ts held, when this file was written:
//
//     it('follows the Agent API, which is the only condition FR-066 states for
//        the field', ...)   expect(entry.isPressed).toBe(isAgentApiEnabled)
//
// That WAS a correct reading of FR-066 before the ruling of 2026-08-31 -- the
// requirement then stated one condition -- and it is exactly the wiring D-149
// measured. It is now the thing FR-066's MUST NOT forbids. ⭐ That case has
// been rewritten to the requirement as it now reads; the four-state walk lives
// here, and uf-62.test.ts keeps only the one entry it owns.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  emptyDialogueLog,
  logWithMessage,
  type DialogueLog,
} from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import type {
  AppHeaderItems,
  CommandItem,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { appHeaderItemsFromDocument } from '../../src/adapter/screen-renderer/app-header-items'
import { dialogueFieldFromLog } from '../../src/adapter/screen-renderer/dialogue-field'
import { bare, specTable } from '../contract/spec-table'

// ===========================================================================
// The manuscript, read at run time. Chapter 1.9 (:275) asks a test of a
// requirement that points at a table to be driven by a copy of that table;
// rule 03 section 1 forbids re-typing a value the specification holds.
// ===========================================================================

const CHAPTER_1_4 = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** A manuscript cell or line with its emphasis marks taken off. */
const plain = (text: string): string => text.replace(/\*/g, '')

/** The STATEMENT paragraph of one requirement, by its UID. */
function statementOf(uid: string): string {
  const lines = CHAPTER_1_4.split('\n')
  const at = lines.findIndex((line) => line.trim() === `**UID**: ${uid}`)
  if (at < 0) throw new Error(`Chapter 1-4 has no requirement ${uid}`)
  const said = lines.slice(at).find((line) => line.startsWith('**STATEMENT**:'))
  if (said === undefined) throw new Error(`${uid} has no STATEMENT`)
  return plain(said)
}

const FR_066 = statementOf('FR-066')
const FR_065 = statementOf('FR-065')

/** The sentences of FR-066 that every case below leans on, quoted verbatim. */
const FR_066_NOT_WHILE_HIDDEN = '閲覧者がその欄を非表示にしているあいだは表示しないこと（MUST）'
const FR_066_S_99I_HOLDS_THE_LOOK =
  '見え方は `_assets/tbl-settings.md` の 表 T-206 の `S-99i` が持ち、切り替えの入口は `_assets/tbl-glossary.md` の 表 T-109 の `IC-18` である'
const FR_066_NOT_ONE_VALUE =
  '`Agent API` の有効・無効（`FR-065`）と 1 つの値で兼ねてはならない（MUST NOT）'
const FR_066_WHY_NOT_ONE_VALUE =
  '兼ねると `Agent API` を有効にしただけで `IC-18` が押された状態になる'
const FR_066_FAINT_WHILE_OFF = '`Agent API` が無効のあいだ `IC-18` は薄く描かれる'
const FR_066_RS_35_TELLS_WHY = '告げる理由は同要求の 表 T-233 の `RS-35` が持つ'

/** FR-065's own MUST -- what `IC-20`, and only `IC-20`, is answerable for. */
const FR_065_SHOW_THAT_IT_IS_ON = '有効であるあいだ、そのことを画面上に示すこと（MUST）'

// ---------------------------------------------------------------------------
// 表 T-206 の `S-99i` -- the row the whole defect turns on.
// ---------------------------------------------------------------------------

const S_99I = specTable('T-206').rows.find((row) => row.id === 'S-99i')
if (S_99I === undefined) {
  throw new Error('表 T-206 has no row S-99i: the row D-149 added is gone')
}
const S_99B = specTable('T-206').rows.find((row) => row.id === 'S-99b')
if (S_99B === undefined) throw new Error('表 T-206 has no row S-99b')

const S_99I_VALUE = plain(S_99I.by['値'] ?? '')
const S_99I_NOTE = plain(S_99I.by['保存しない理由'] ?? '')
const S_99I_DEFAULT_CELL = plain(S_99I.by['既定'] ?? '').trim()

/**
 * The two words 表 T-206 writes for a visibility, and the boolean each is.
 *
 * ⚠️ 「表示」 is a substring of 「非表示」, so the hidden word is tried FIRST. A
 * `startsWith`/`includes` reading here would call the row's default 「表示」 and
 * 「非表示」 the same thing, which is the one distinction this file exists for.
 */
const SHOWN_WORD = '表示'
const HIDDEN_WORD = '非表示'
const visibilityOf = (cell: string): boolean => {
  if (cell === HIDDEN_WORD) return false
  if (cell === SHOWN_WORD) return true
  throw new Error(`表 T-206 の S-99i writes a default this file cannot read: ${JSON.stringify(cell)}`)
}

/**
 * `S-99i`'s default, taken from the manuscript rather than typed.
 *
 * ⭐ THIS IS THE VALUE CASE 4 OF THIS BENCH RESTS ON. The row's own note says
 * why it is 「表示」: 「有効にした人が、もう一度別の入口を押すまで何も出ない形にし
 * ない」. Change 「表示」 to 「非表示」 in `_source/settings.json`, run `npm run gen`,
 * and the default cases below flip -- which is rule 04 section 2's test of
 * whether a manuscript value actually reaches anything.
 */
const S_99I_DEFAULT = visibilityOf(S_99I_DEFAULT_CELL)

/** The MUST NOT that `S-99i` carries, and the measurement that produced it. */
const S_99I_NOT_ONE_VALUE =
  '`Agent API` が有効かどうか（`S-99b`）とは別の値として持つこと。1 つの値で兼ねてはならない'
const S_99I_WHAT_WAS_MEASURED =
  '兼ねていたので、`Agent API` を有効にしただけで `IC-18` の押下状態が立っていた'
const S_99I_WHY_THE_DEFAULT =
  '既定が「表示」なのは、`FR-066` が有効なあいだ欄を表示すると定めているからである'

// ---------------------------------------------------------------------------
// 表 T-109 -- the two entrances, and the words the ruling of 2026-08-31 gave
// the first of them.
// ---------------------------------------------------------------------------

const IC_DIALOGUE_FIELD = 'IC-18'
const IC_AGENT_API = 'IC-20'

const T_109 = specTable('T-109')
const t109 = (icon: string): { readonly duty: string; readonly rule: string } => {
  const row = T_109.rows.find((one) => one.id === icon)
  if (row === undefined) throw new Error(`表 T-109 has no row ${icon}`)
  return { duty: plain(row.by['何の入口か'] ?? ''), rule: plain(row.by['正'] ?? '') }
}

/** The new words. ⛔ 「出す・しまう」 is what these replaced, and is asserted absent. */
const IC_18_DUTY = 'AI との対話欄を表示する・非表示にする'
const IC_20_DUTY = '`Agent API` を有効にする・無効にする'
const THE_RETIRED_WORDING = '出す・しまう'

// ---------------------------------------------------------------------------
// 表 T-237 の `EN-5` -- the paint row the ruling added.
// ---------------------------------------------------------------------------

const STATE_COLUMN = '何が効いているか'
const FILL_COLUMN = '塗りの色'
const OWNER_COLUMN = '定める要求'

/**
 * 表 T-237, through the reader Chapter 1.9 (:275) asks a test about a table to
 * be driven by.
 *
 * ⚠️ tests/unit/fr-029-in-effect-is-filled-not-rimmed.test.ts had to parse this
 * table by hand, because 表 T-237 wrote its row ids inside code spans and
 * `specTable` matches only a bare id (Chapter 1.9 :274). The backticks have
 * since come off all five ids, so the ordinary reader works and no second
 * parser is kept here.
 */
const T_237 = specTable('T-237')

function t237(enRow: string): { readonly by: Readonly<Record<string, string>> } {
  const found = T_237.rows.find((one) => one.id === enRow)
  if (found === undefined) throw new Error(`表 T-237 has no row ${enRow}`)
  return found
}

const EN_5_SHOWS_IT_NOW = 'その入口が表示・非表示を切り替えるものを、いま表示している'

// ---------------------------------------------------------------------------
// 表 T-233 の `RS-35` -- the half of D-149 that already worked.
// ---------------------------------------------------------------------------

const RS_35 = specTable('T-233').rows.find((row) => row.id === 'RS-35')
if (RS_35 === undefined) throw new Error('表 T-233 has no row RS-35')

// ===========================================================================
// Inputs.
// ===========================================================================

/**
 * S-73's default hue, read out of 表 T-216 rather than written here. DR-5 of
 * 表 T-052 keeps the hue on `Project`, so no generated constant carries it.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('表 T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

const SETTINGS: DocumentSettings = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings

/**
 * A document with nothing in it. No requirement points either unit under test
 * at the schedule's contents, so an empty one keeps the only differences
 * between cases in the session, which is where both values live.
 */
const SCHEDULE: Schedule = {
  project: { title: null },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const STATE: ScreenState = emptyScreenState()

/**
 * Every member of `ScreenSession` is spelled out, so that a case which means to
 * vary one of them varies exactly one.
 *
 * ⭐ THE TWO THAT MATTER ARE THE FIRST TWO OF THE PAIR BELOW, and D-149 is that
 * they used to be one. `isAgentApiEnabled` is `S-99b` (the capability, which
 * FR-065 makes the reader's own act) and `isDialogueFieldVisible` is `S-99i`
 * (the look). Both start OFF here so that a case turning one on is adding the
 * only difference there is -- ⚠️ which is NOT `S-99i`'s manuscript default, and
 * the default group below is what asserts against that default instead.
 * GAP 1 above governs the second name.
 */
const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  // The members no case here varies: `iconUnderPointer` is EZ-2's place
  // condition (`null` -- the pointer rests on no icon), `themePreference` is
  // S-72 and `isMilestoneListOpen` S-142, `themeHue` is S-73 read from the
  // manuscript, `selectedGroupIds` is FR-085's set of rows and
  // `selectedResourceUids` FR-099's, and `propertiesSubject` /
  // `propertiesShowing` are FR-072's, which EN-4 owns and EN-5 does not.
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

const sessionWith = (part: Partial<ScreenSession>): ScreenSession => ({ ...SESSION, ...part })

/** A settled conversation, so that no case turns on the log being empty. */
const LOG: DialogueLog = [
  { author: 'person', text: 'move the milestone', settledAt: '2026-08-19T09:00:00Z' },
  { author: 'ai', text: 'moved it to the 21st', settledAt: '2026-08-19T09:00:04Z' },
].reduce(logWithMessage, emptyDialogueLog())

// ---------------------------------------------------------------------------
// The four states the two values can stand in. ⭐ THE WHOLE OF D-149 IS THAT
// ONE VALUE CANNOT TELL FOUR STATES APART.
// ---------------------------------------------------------------------------

interface Pair {
  readonly name: string
  readonly apiEnabled: boolean
  readonly fieldVisible: boolean
}

const PAIRS: readonly Pair[] = [
  { name: 'the API on, the field shown', apiEnabled: true, fieldVisible: true },
  { name: 'the API on, the field hidden', apiEnabled: true, fieldVisible: false },
  { name: 'the API off, the field shown', apiEnabled: false, fieldVisible: true },
  { name: 'the API off, the field hidden', apiEnabled: false, fieldVisible: false },
]

const sessionOf = (pair: Pair): ScreenSession =>
  sessionWith({ isAgentApiEnabled: pair.apiEnabled, isDialogueFieldVisible: pair.fieldVisible })

/**
 * What FR-066 makes true of the field in each of the four states: it is up
 * while the API is enabled AND the reader has not hidden it.
 *
 * ⛔ THIS IS THE SPECIFICATION'S ANSWER, NOT THE CODE'S. Its two clauses are
 * the requirement's first sentence (「`Agent API` が有効であるあいだ…欄を表示する
 * こと」) and its MUST (「閲覧者がその欄を非表示にしているあいだは表示しないこと」),
 * and the group of guards above holds both sentences against the manuscript
 * before any case leans on them.
 */
const fieldIsUp = (pair: Pair): boolean => pair.apiEnabled && pair.fieldVisible

// ===========================================================================
// Reading the answers.
// ===========================================================================

const itemsOf = (session: ScreenSession): AppHeaderItems =>
  appHeaderItemsFromDocument(SCHEDULE, SETTINGS, STATE, session)

const commandFor = (items: AppHeaderItems, icon: string): CommandItem => {
  const found = items.commands.filter((command) => command.icon === icon)
  expect(found, `表 T-109's ${icon} has exactly one entry (FR-029, MUST NOT)`).toHaveLength(1)
  return found[0] as CommandItem
}

const entryOf = (pair: Pair, icon: string): CommandItem => commandFor(itemsOf(sessionOf(pair)), icon)

/** Whether UF-68 describes a field at all -- `null` is 「出ていない」. */
const fieldShownFor = (pair: Pair): boolean => dialogueFieldFromLog(LOG, sessionOf(pair)) !== null

// ===========================================================================
// The premises every case below stands on.
//
// Rule 04 section 2: a mechanism that carries a value out of the manuscript is
// not verified until it has been seen to fall. Every one of these fails the
// moment a sentence the cases were driven from stops being in the manuscript.
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST A COLUMN WOULD MAKE EVERY CASE BELOW
    // AGREE WITH ANYTHING.
    expect(FR_066.length).toBeGreaterThan(0)
    expect(S_99I_VALUE.length).toBeGreaterThan(0)
    expect(S_99I_NOTE.length).toBeGreaterThan(0)
    expect(t109(IC_DIALOGUE_FIELD).duty.length).toBeGreaterThan(0)
    expect(T_237.rows.length).toBeGreaterThan(0)
  })

  it('⛔ 表 T-206 still holds `S-99i`, and holds it APART from `S-99b`', () => {
    // ⭐ THE ROW IS THE FIX. Before the ruling of 2026-08-31 there was no row
    // for 「対話欄を表示しているか」 in 表 T-206 or 表 T-203 at all, which is what
    // left `IC-18` reading `S-99b`.
    expect(S_99I_VALUE, 'S-99i is the dialogue field U-44, and it points at FR-066').toContain(
      'FR-066',
    )
    expect(S_99I_VALUE).toContain('U-44')
    expect(S_99I_NOTE, 'the MUST NOT that forbids one value for both').toContain(
      S_99I_NOT_ONE_VALUE,
    )
    expect(S_99I_NOTE, 'and what was measured when they were one').toContain(
      S_99I_WHAT_WAS_MEASURED,
    )
    // ⚠️ The capability is still its own row, still in `localStorage`.
    expect(plain(S_99B.by['値'] ?? '')).toContain('Agent API')
  })

  it('⭐ 表 T-206 still makes the default 「表示」, and still says why', () => {
    expect(S_99I_DEFAULT_CELL).toBe(SHOWN_WORD)
    expect(S_99I_DEFAULT).toBe(true)
    expect(S_99I_NOTE).toContain(S_99I_WHY_THE_DEFAULT)
  })

  it('⛔ and the reader of that default is not a constant `true`', () => {
    // ⛔ WITHOUT THIS, THE DEFAULT GROUP BELOW WOULD PASS ON A MANUSCRIPT THAT
    // SAID 「非表示」 -- rule 04 section 2: a mechanism carrying a value out of
    // the manuscript is not verified until it has been seen to fall. ⚠️ The
    // manuscript itself cannot be doctored from this bench (it may only read
    // docs/), so the fall is shown on the reader instead: the same function,
    // handed the other word the table writes, answers the other way.
    expect(visibilityOf(SHOWN_WORD)).toBe(true)
    expect(visibilityOf(HIDDEN_WORD)).toBe(false)
    // ⚠️ 「表示」 IS A SUBSTRING OF 「非表示」. A reader written with `includes`
    // would call both of them 「表示」, which is the one distinction this whole
    // file exists for.
    expect(HIDDEN_WORD).toContain(SHOWN_WORD)
    expect(() => visibilityOf('出している')).toThrow()
  })

  it('⛔ FR-066 still states both conditions, and the MUST NOT between them', () => {
    expect(FR_066, 'the field is not up while the reader has hidden it').toContain(
      FR_066_NOT_WHILE_HIDDEN,
    )
    expect(FR_066, 'the look is S-99i and the entrance is IC-18').toContain(
      FR_066_S_99I_HOLDS_THE_LOOK,
    )
    expect(FR_066, 'and the two may not be one value').toContain(FR_066_NOT_ONE_VALUE)
    // ⛔ THE SENTENCE THAT NAMES THE DEFECT. A manuscript that dropped it would
    // leave the cases below arguing for a rule nothing states.
    expect(FR_066).toContain(FR_066_WHY_NOT_ONE_VALUE)
  })

  it('⚠️ FR-066 still draws `IC-18` faint while the API is off, and points at `RS-35`', () => {
    expect(FR_066).toContain(FR_066_FAINT_WHILE_OFF)
    expect(FR_066).toContain(FR_066_RS_35_TELLS_WHY)
    expect(plain(RS_35.by['作法'] ?? '')).toContain('NT-1')
    expect(plain(RS_35.by['正'] ?? '')).toContain('FR-066')
  })

  it('⛔ FR-065 still makes `IC-20` answerable for the capability and nothing else', () => {
    expect(FR_065).toContain(FR_065_SHOW_THAT_IT_IS_ON)
  })

  it('⭐ 表 T-237 still holds `EN-5`, in `S-183`, defined by FR-029 itself', () => {
    // The row that gives the fill of `IC-18` a basis. Before it, no row of
    // 表 T-237 remembered 「対話欄が出ている」 and the paint had nothing to stand on.
    expect(T_237.rows.map((row) => row.id)).toContain('EN-5')
    expect(plain(t237('EN-5').by[STATE_COLUMN] ?? '')).toContain(EN_5_SHOWS_IT_NOW)
    expect(plain(t237('EN-5').by[STATE_COLUMN] ?? ''), 'and the value is one of 表 T-206').toContain(
      'T-206',
    )
    expect(bare(t237('EN-5').by[FILL_COLUMN] ?? '')).toBe('S-183')
    expect(plain(t237('EN-5').by[OWNER_COLUMN] ?? '')).toBe('本要求')
  })

  it('⛔ 表 T-109 still gives the two entrances two duties and two requirements', () => {
    // ⚠️ THE WORDS ARE THE NEW ONES (利用者の裁定 2026-08-31). Thirteen rows moved
    // from 「出す・しまう」 to 表示する・非表示にする in the same commit that gave
    // `S-99i` its row, and a bench pinning the old words would call the
    // corrected manuscript wrong.
    expect(t109(IC_DIALOGUE_FIELD).duty).toContain(IC_18_DUTY)
    expect(t109(IC_DIALOGUE_FIELD).duty).not.toContain(THE_RETIRED_WORDING)
    expect(t109(IC_AGENT_API).duty).toContain(IC_20_DUTY)

    expect(t109(IC_DIALOGUE_FIELD).rule).toContain('FR-066')
    expect(t109(IC_AGENT_API).rule).toContain('FR-065')
    // ⭐ Two rows, two requirements. That is the shape one value cannot have.
    expect(t109(IC_DIALOGUE_FIELD).rule).not.toBe(t109(IC_AGENT_API).rule)
  })
})

// ===========================================================================
// UF-62 -- `IC-18` and `IC-20` read two values, not one. (D-149)
// ===========================================================================

describe('UF-62 IC-20: the Agent API, and only the Agent API (FR-065, MUST)', () => {
  it('presses exactly while the capability is on, whatever the field is doing', () => {
    // FR-065 (MUST): 「有効であるあいだ、そのことを画面上に示すこと」. `S-99i` is
    // not part of that sentence, so moving it may not move this entry.
    for (const pair of PAIRS) {
      expect(entryOf(pair, IC_AGENT_API).isPressed, pair.name).toBe(pair.apiEnabled)
    }
  })

  it('stays usable both ways, since the same entrance turns it off (表 T-109 の IC-20)', () => {
    // 「`Agent API` を有効にする・無効にする」 -- one entrance, both directions, so
    // there is no state in which pressing it achieves nothing (FR-029).
    for (const pair of PAIRS) {
      expect(entryOf(pair, IC_AGENT_API).isEnabled, pair.name).toBe(true)
    }
  })
})

describe('UF-62 IC-18: pressing IC-20 does not press it (FR-066, MUST NOT)', () => {
  it('⛔⛔ turning the Agent API on does not by itself press IC-18 -- THIS IS D-149', () => {
    // ⛔ THE REPORTED DEFECT, IN ONE CASE. FR-066: 「兼ねると `Agent API` を有効に
    // しただけで `IC-18` が押された状態になる」（実測 2026-08-30）, and 表 T-206 の
    // `S-99i`: 「兼ねていたので、`Agent API` を有効にしただけで `IC-18` の押下状態が
    // 立っていた」.
    //
    // ⭐ WHAT WOULD TURN THIS RED: `IC-18` reading `isAgentApiEnabled` for its
    // pressed state -- which is exactly what the unit did before the fix, and
    // what the group at the foot of this file reconstructs and shows failing.
    const hidden = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: false })
    const items = itemsOf(hidden)

    expect(
      commandFor(items, IC_AGENT_API).isPressed,
      'FR-065 (MUST): IC-20 does say the capability is on',
    ).toBe(true)
    expect(
      commandFor(items, IC_DIALOGUE_FIELD).isPressed,
      'FR-066 (MUST NOT): and IC-18 says nothing of the sort while the field is hidden',
    ).toBe(false)
  })

  it('⭐ presses exactly while the field is up -- 表 T-237 の EN-5, 「いま表示している」', () => {
    // EN-5 is worded as a present state of the thing toggled, not as a wish:
    // 「その入口が表示・非表示を切り替えるものを、いま表示している」. The field is up
    // when FR-066's two conditions both hold, which is `fieldIsUp`.
    for (const pair of PAIRS) {
      expect(entryOf(pair, IC_DIALOGUE_FIELD).isPressed, pair.name).toBe(fieldIsUp(pair))
    }
  })

  it('⛔ answers differently where one value could not, and alike where it must', () => {
    // ⭐ THE SHARPEST FORM OF THE MUST NOT THAT IS ACTUALLY REACHABLE. If both
    // entrances read ONE stored value, then two sessions agreeing on that value
    // must get the same answer from both. The two states below AGREE on the
    // capability and DISAGREE on `S-99i`, so a wiring with one value is forced
    // to answer `IC-18` alike in both -- and FR-066 requires it to answer
    // differently. ⛔ No single-value wiring can satisfy this case, whatever
    // else it does; it is red for the whole family D-149 belongs to.
    const on = PAIRS.filter((pair) => pair.apiEnabled)
    expect(on).toHaveLength(2)

    const ic18 = on.map((pair) => entryOf(pair, IC_DIALOGUE_FIELD).isPressed)
    const ic20 = on.map((pair) => entryOf(pair, IC_AGENT_API).isPressed)

    expect(new Set(ic18).size, 'IC-18 tells the two states apart').toBe(2)
    expect(new Set(ic20).size, 'while IC-20 says the same thing in both').toBe(1)
  })

  it('⚠️ and FOUR distinct answers is NOT asked for -- 表 T-237 forbids it', () => {
    // ⛔⛔ WRITTEN DOWN SO THAT NOBODY RE-RAISES IT. A first draft of this bench
    // asked for four distinct answers across the four states, on the arithmetic
    // that one value can produce only two. ⭐ That over-claimed, and the reason
    // is in FR-029 itself: the two API-OFF states CANNOT differ on screen.
    //
    //   FR-066 ⚠️: 「`Agent API` が無効のあいだ `IC-18` は薄く描かれる」 -- both
    //     API-off states draw the entrance faint.
    //   FR-029 ⛔: 「上の薄く描く入口には当ててはならない（MUST NOT）」 -- and a faint
    //     entrance may not be filled. So both are faint AND unfilled, and
    //     telling them apart would take a picture the requirement forbids.
    //
    // ⭐ THE MUST NOT IS ABOUT THE STORED VALUE, NOT THE PICTURE: 「1 つの値で
    // 兼ねてはならない」, and the harm it names is 「`Agent API` を有効にしただけで
    // `IC-18` が押された状態になる」 -- which is an API-ON state. ⚠️ What `S-99i`
    // holds while the API is off is a preference that nothing draws; GAP 3
    // above says the specification has not settled whether it even survives.
    const off = PAIRS.filter((pair) => !pair.apiEnabled)
    expect(off).toHaveLength(2)

    const answers = off.map((pair) => {
      const entry = entryOf(pair, IC_DIALOGUE_FIELD)
      return [entry.isEnabled, entry.isPressed].join('/')
    })
    expect(new Set(answers).size, `both API-off states are faint and unfilled: ${answers.join(' ')}`).toBe(
      1,
    )
    expect(answers[0]).toBe([false, false].join('/'))
  })

  it('⭐ has a working 「非表示にする」 half: hiding the field lifts the press', () => {
    // 表 T-109 の `IC-18`: 「AI との対話欄を表示する・非表示にする」. D-149's ledger
    // row says which half was dead -- 「死んでいるのは「しまう」の半分である」 -- so
    // the two states below are the halves, and the entry has to tell them apart.
    const shown = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: true })
    const hidden = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: false })

    expect(commandFor(itemsOf(shown), IC_DIALOGUE_FIELD).isPressed).toBe(true)
    expect(commandFor(itemsOf(hidden), IC_DIALOGUE_FIELD).isPressed).toBe(false)
  })
})

describe('UF-62 IC-18: faint while the API is off (FR-066 ⚠️, through FR-029)', () => {
  it('⭐ is faint exactly while the capability is off -- the half that never broke', () => {
    // FR-066: 「`Agent API` が無効のあいだ `IC-18` は薄く描かれる」. D-149's ledger
    // row records this half as working（「壊れていなかった半分」）, so these cases
    // are a guard against losing it while the other half is repaired.
    for (const pair of PAIRS) {
      expect(entryOf(pair, IC_DIALOGUE_FIELD).isEnabled, pair.name).toBe(pair.apiEnabled)
    }
  })

  it('⛔ does not become usable just because `S-99i` says 「表示」', () => {
    // ⚠️ A REPAIR COULD PLAUSIBLY GO WRONG HERE: an entry keyed on `S-99i` alone
    // would light up while the API is off. FR-066 conditions the FIELD on the
    // API, so with the API off there is nothing a press can put on the screen,
    // and FR-029's 「何も変えられないときは…薄く描くこと（MUST）」 applies.
    const off = sessionWith({ isAgentApiEnabled: false, isDialogueFieldVisible: true })
    expect(commandFor(itemsOf(off), IC_DIALOGUE_FIELD).isEnabled).toBe(false)
  })

  it('⛔ is never faint AND filled at once (FR-029, MUST NOT)', () => {
    // FR-029: 「⛔ 上の薄く描く入口には当ててはならない（MUST NOT）」 —— 「効いていて、
    // かついま何も変えられない入口が濃くなると、薄さの意味が消える。」 ⭐ This is the
    // second, independent road to the same answer for the two API-off states:
    // even a reader who took `EN-5` to mean 「表示することになっている」 rather than
    // 「いま表示している」 lands here.
    for (const pair of PAIRS) {
      const entry = entryOf(pair, IC_DIALOGUE_FIELD)
      if (!entry.isEnabled) expect(entry.isPressed, pair.name).toBe(false)
    }
  })

  it('⚠️ is the entry FR-029 leaves pressable so that `RS-35` can be told', () => {
    // FR-029: 「⛔ 薄く描いた入口を、宿主の意味で無効にしてはならない（MUST NOT）」 ——
    // 「無効にすると押下そのものが届かず、下の理由を告げる引き金が消える。」 So
    // `isEnabled: false` is a claim about the DRAWING, and the entry still has
    // to be in the roster to be pressed at all.
    // ⚠️ WHICH reason the press then carries is not asserted here -- 表 T-233 の
    // `RS-35` is driven by tests/unit/fr-029-the-reason-a-press-carries.test.ts,
    // and GAP 2 above says why this bench does not restate its 場面.
    const off = sessionWith({ isAgentApiEnabled: false, isDialogueFieldVisible: false })
    const icons = itemsOf(off).commands.map((command) => command.icon)
    expect(icons).toContain(IC_DIALOGUE_FIELD)
  })
})

// ===========================================================================
// UF-68 -- the field itself. `dialogueFieldFromLog` answers `null` for 「出て
// いない」, so this is where the 「非表示にする」 half actually takes effect.
// ===========================================================================

describe('UF-68: the field is described only while both conditions hold (FR-066)', () => {
  it('⭐ describes it while the API is on and the field is shown', () => {
    // FR-066's first sentence, with the MUST not standing in the way.
    expect(dialogueFieldFromLog(LOG, sessionOf(PAIRS[0] as Pair))).not.toBeNull()
  })

  it('⛔ describes nothing while the API is on and the reader has hidden it (MUST)', () => {
    // ⛔ 「閲覧者がその欄を非表示にしているあいだは表示しないこと（MUST）」. This is
    // the sentence that had no implementation at all before the ruling: the
    // ledger's 「死んでいるのは「しまう」の半分である」.
    //
    // ⭐ WHAT WOULD TURN THIS RED: a unit that conditions the field on
    // `isAgentApiEnabled` alone -- which is what it did, and what the
    // reconstruction at the foot of this file shows failing here.
    const hidden = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: false })
    expect(dialogueFieldFromLog(LOG, hidden)).toBeNull()
  })

  it('⛔ describes nothing while the API is off, whichever way `S-99i` stands', () => {
    for (const pair of PAIRS.filter((one) => !one.apiEnabled)) {
      expect(dialogueFieldFromLog(LOG, sessionOf(pair)), pair.name).toBeNull()
    }
  })

  it('⭐ answers for all four states as FR-066 states them', () => {
    for (const pair of PAIRS) {
      expect(fieldShownFor(pair), pair.name).toBe(fieldIsUp(pair))
    }
  })

  it('⛔ answers `null` and not an empty field when the field is hidden', () => {
    // An empty field is not the same answer as no field: it would draw an empty
    // conversation over a field the reader put away. ⚠️ The log here HOLDS
    // utterances, so an empty `messages` array would be a second wrong answer.
    const hidden = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: false })
    expect(dialogueFieldFromLog(LOG, hidden)).toBeNull()
    expect(dialogueFieldFromLog(emptyDialogueLog(), hidden)).toBeNull()
  })

  it('⚠️ reads `S-99i` and not the log: a hidden field with things said stays hidden', () => {
    // ⛔ A repair that showed the field again as soon as something was said
    // would take the 「非表示」 decision away from the reader on the AI's next
    // utterance (AM-18 of 表 T-107 lets the AI settle one).
    const hidden = sessionWith({ isAgentApiEnabled: true, isDialogueFieldVisible: false })
    const spoken = logWithMessage(LOG, {
      author: 'ai',
      text: 'and moved the next one too',
      settledAt: '2026-08-19T09:00:09Z',
    })
    expect(dialogueFieldFromLog(spoken, hidden)).toBeNull()
  })
})

// ===========================================================================
// The two units have to agree. 表 T-237 の `EN-5` says the fill means 「いま表示
// している」, and UF-68 is what decides whether it is showing.
// ===========================================================================

describe('EN-5: the press on IC-18 says what the screen is actually doing', () => {
  it('⭐ IC-18 is pressed in exactly the states in which a field is described', () => {
    // ⛔ NEITHER UNIT ALONE CAN BE HELD TO THIS. `EN-5` reads 「いま表示している」,
    // so the entry's fill is a claim about the other unit's answer; the two are
    // filled by two units that read none of each other, so the pair can only be
    // compared where they meet, which is here.
    for (const pair of PAIRS) {
      expect(entryOf(pair, IC_DIALOGUE_FIELD).isPressed, pair.name).toBe(fieldShownFor(pair))
    }
  })
})

// ===========================================================================
// The default. `S-99i` is 「表示」, so enabling the API is one press, not two.
// ===========================================================================

describe('the default of `S-99i` -- one press, not two (表 T-206)', () => {
  const atTheDefault = (isAgentApiEnabled: boolean): ScreenSession =>
    sessionWith({ isAgentApiEnabled, isDialogueFieldVisible: S_99I_DEFAULT })

  it('⭐ turning the API on puts the field up, with no second press', () => {
    // 表 T-206 の `S-99i`: 「既定が「表示」なのは、`FR-066` が有効なあいだ欄を表示
    // すると定めているからである」 —— 「有効にした人が、もう一度別の入口を押すまで
    // 何も出ない形にしない。」
    //
    // ⭐ WHAT WOULD TURN THIS RED: the manuscript's default moving to 「非表示」,
    // or a session that started the value at `false` regardless. ⚠️ The value
    // asserted is READ FROM THE MANUSCRIPT (`S_99I_DEFAULT`), so this case
    // follows a ruling that changed it rather than contradicting one.
    expect(S_99I_DEFAULT, 'the manuscript still says 「表示」').toBe(true)
    expect(dialogueFieldFromLog(LOG, atTheDefault(true))).not.toBeNull()
  })

  it('⭐ and IC-18 is pressed at once, because the field really is up', () => {
    expect(commandFor(itemsOf(atTheDefault(true)), IC_DIALOGUE_FIELD).isPressed).toBe(true)
  })

  it('⛔ but the default does not put a field up while the API is off', () => {
    // FR-066's first condition is unmoved by the default of the second.
    expect(dialogueFieldFromLog(LOG, atTheDefault(false))).toBeNull()
    expect(commandFor(itemsOf(atTheDefault(false)), IC_DIALOGUE_FIELD).isPressed).toBe(false)
    expect(commandFor(itemsOf(atTheDefault(false)), IC_DIALOGUE_FIELD).isEnabled).toBe(false)
  })
})

// ===========================================================================
// ⛔ THE CASES ABOVE ARE SHOWN TO BITE.
//
// Rule 04 section 2: a check is not verified until it has been broken on
// purpose and seen to fail. The wiring D-149 measured is reconstructed here --
// ONE value read by both entrances and by the field -- and the same predicates
// the cases above assert are run against it. ⭐ A predicate that the pre-fix
// wiring satisfies is a predicate that would have passed on the defect, and
// that is what these cases refuse to be.
//
// ⚠️ NOTHING HERE IS READ FROM src/. The reconstruction is written from what
// defects.md records of the measurement: 「`IC-18` と `IC-20` が同じ 1 つの値
// （`isAgentApiEnabled`）を読んでいる」.
// ===========================================================================

describe('the wiring D-149 measured fails these cases', () => {
  /** `IC-18`'s pressed state before the fix: the capability, read twice. */
  const pressedUnderTheDefect = (pair: Pair): boolean => pair.apiEnabled

  /** And the field's, likewise. */
  const fieldUnderTheDefect = (pair: Pair): boolean => pair.apiEnabled

  /** What FR-066 requires of both, from the manuscript's two conditions. */
  const required = (pair: Pair): boolean => fieldIsUp(pair)

  it('⛔ presses IC-18 in a state FR-066 forbids -- and in exactly that one', () => {
    const wrong = PAIRS.filter((pair) => pressedUnderTheDefect(pair) !== required(pair))
    expect(wrong.map((pair) => pair.name)).toEqual(['the API on, the field hidden'])
  })

  it('⛔ leaves the field up in that same state, so the 「非表示」 half does nothing', () => {
    const wrong = PAIRS.filter((pair) => fieldUnderTheDefect(pair) !== required(pair))
    expect(wrong.map((pair) => pair.name)).toEqual(['the API on, the field hidden'])
  })

  it('⛔ cannot tell the two API-on states apart, because it has nothing to tell them with', () => {
    // ⭐ THE COUNTING ARGUMENT THE MUST NOT RESTS ON, run against the defect.
    // The two API-on states agree on the capability, so a wiring that reads
    // only the capability answers them alike -- which is what the case headed
    // 「answers differently where one value could not」 forbids. ⛔ That case is
    // therefore red on this wiring by arithmetic and not by luck.
    const on = PAIRS.filter((pair) => pair.apiEnabled)
    expect(new Set(on.map(pressedUnderTheDefect)).size).toBe(1)
    expect(new Set(on.map(required)).size, 'while FR-066 asks for two').toBe(2)
  })

  it('⭐ agrees with the specification in the other three states, which is why it was missed', () => {
    // ⚠️ Worth stating: the defect was not wrong everywhere. Three of the four
    // states looked right, and a bench that only tried the API on with the
    // field at its default would have gone green on the broken wiring.
    const agreed = PAIRS.filter((pair) => pressedUnderTheDefect(pair) === required(pair))
    expect(agreed).toHaveLength(3)
  })
})
