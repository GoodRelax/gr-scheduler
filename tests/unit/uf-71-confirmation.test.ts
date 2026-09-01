// Unit tests for the `Confirmation` surface -- U-55 of table T-103 -- and for
// NT-7's two WORD BUTTONS: the answer that goes on, and the answer that calls
// it off.
//
// ⚠️ THEY WERE TWO ROWS OF TABLE T-109 UNTIL CR-327 (2026-09-02). That change
// made them word buttons, and NT-7 now (MUST NOT) refuses them a row there:
// 「答えの入口に 表 T-109 の行を与えてはならない（MUST NOT）—— 同表と 図 F-019
// が持つのは図形の入口であり、語のボタンは図形を持たない」. ⛔ The fixed copy of
// that table is kept and ASSERTED rather than deleted: the first case below
// reads its 面 column and goes red if any row names U-55 again.
//
// Two units meet here and both are exercised through their own published names:
//   UF-67  src/adapter/screen-renderer/notices.ts        `confirmationFromSession`
//          -- the composing half. It WIDENS what was raised, because the words
//          of the two answers are FR-038's dictionary's and not the asker's.
//   UF-71  src/framework/dom-screen-surface/dom-screen-surface.ts
//          -- the drawing half (CP-38 of table T-062, PI-38 of table T-064), the one
//          implementation of `ScreenSurface` (IF-9 of table T-065).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. table T-218 of Chapter 7 gives them their place: TS-6, tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING EITHER UNIT'S BODY (docs/development-rules/
// 04-verification.md §1 -- the one who wrote a unit does not write its test).
// What was read: docs/spec/ for every rule below, docs/review/rulings-2026-08-22/
// for the ruling that put the two answers into table T-109 at all (03 Q3), the seam
// declaration `src/adapter/screen-renderer/screen-surface.ts`, the `ScreenView`
// family in `src/adapter/screen-renderer/screen-renderer.ts`, and of the two
// units themselves only their head comments and their signatures --
// `confirmationFromSession(session): Confirmation | null` and
// `domScreenSurface(wiring): ScreenSurface`. Every expected value here comes
// from a requirement, a table or a generated file that is itself made from a
// table -- never from the implementation.
//
// The rules these cases answer to:
//   table T-103 U-55  `Confirmation` -- the surface that asks whether to go on.
//                  The manner of asking is NT-7 of table T-037; the two answers
//                  are that row's word buttons, whose words the `confirmation`
//                  section of FR-038's dictionary holds.
//                  ⚠️ It is NOT a `Notice`: a notice asks for no answer
//   table T-109    the whole of the icons (FR-029). Its surface column holds
//                  table T-103's settled names, and since CR-327 it prints NO
//                  row at all against `Confirmation`
//   table T-037 NT-7  (MUST) what is about to happen is shown, and then going on
//                  or calling it off is CHOSEN. (MUST) Where something goes or
//                  is released, its NAME is given. A count may not stand in for
//                  a name, although NT-3's count may sit beside one
//   FR-076         (MUST) table T-037 is the manner of every telling
//   FR-032         (MUST) the names of the tasks that go are shown, and a count
//                  alone is forbidden (MUST NOT). (MUST) A task that goes with a
//                  row but is DRAWN on another row is marked as such
//   table T-024a OP-4 (MUST) a replace asks before the unsaved edits are thrown
//                  away
//   table T-227 DI-4  (MUST) writing over something that cannot be taken for
//                  this document asks first, in NT-7's manner.
//                  ⚠️ Naming what goes is expressly NOT owed here, so an EMPTY
//                  list of names is a real answer
//   table T-227 DI-5  (MUST) FR-060's path does NOT ask -- so a surface that
//                  stands whenever a file is written would break this row; the
//                  surface stands only where a question was raised
//   table T-028 IN-3  the tooltip's manner -- three conditions (MUST), of which
//                  the third stands only 「引き金が外れるまで」. Quoted only to
//                  keep it OFF this surface: a tooltip may go once its trigger
//                  comes off, while a confirmation goes only when ANSWERED
//   table T-023a   (MUST) the decision order is applied to the schedule's
//                  drawing area ALONE -- the confirmation is drawn OVER that
//                  area and holds no `ScreenRegions` rectangle, so a non-null
//                  answer over it is what stops a press from becoming PD-5's
//                  marquee underneath
//   table T-065 IF-9  the seam answers which UI part (table T-103) a point on
//                  the screen is on, and -- on this surface -- WHICH of NT-7's
//                  two answers, with the MUST under that table: the side that
//                  DREW an entrance is the side that answers where it is
//   FR-029         what cannot be used is drawn faint and gives its reason
//                  rather than going quiet -- quoted here only to say that on
//                  THIS surface nothing may be spent at all
//   R3.4           intervals are half-open; a point on the right or the bottom
//                  edge belongs to whatever comes next. ⛔ QUOTED ONLY TO SAY
//                  THAT IT DOES NOT BIND THIS UNIT: R3.4 binds whoever owns the
//                  rectangle, and this one owns none -- it hands the point to
//                  the host and reads the row off the node that came back. The
//                  edge cases below therefore assert what the UNIT does with the
//                  host's answer, never where this file's own boxes end
//   R7.3 / LY-5    the browser ARRIVES; nothing here is reached for globally
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
// be driven by a fixed copy of that table. Two copies are held here:
//   - table T-109, through the generated `icon-roster.json`, FILTERED on the
//     surface column. ⛔ It is asserted EMPTY -- that is NT-7's MUST NOT -- and
//     a separate case checks the roster against the .md so that neither can
//     fall behind the other.
//   - the `confirmation` section of `docs/spec/_source/display-words.json`,
//     which is where NT-7 (MUST) sends the two answers' words. The two keys and
//     their order come out of it; nothing below writes a word of either.
//
// ⚠️ FIVE THINGS ARE DELIBERATELY NOT ASSERTED, because no requirement decides
// them:
//   - what the two words ARE. FR-038 (MUST) makes `display-words.json` the one
//     store of translated strings, and this file may not settle a word -- so
//     every word it uses is READ out of the manuscript. ⚠️ WHAT IS ASSERTED
//     HERE is that the word which was read reaches the screen WHOLE, that its
//     first character is drawn bold (NT-7 MUST), and -- for the sentence NT-7
//     (MUST) shows and FR-032's mark -- that the row that was RAISED is the row
//     the drawn surface carries.
//   - ⚠️ NO LONGER ON THIS LIST: whether a PERSON can READ that a thing which
//     goes is drawn on another row. FR-032 (MUST) asks for the fact to be SHOWN,
//     its reason being "it is not visible on that row on the screen", so the
//     mark is owed to the reader and not only to the markup. That was recorded
//     here as UNMET while the dictionary held no entry a mark on an item could
//     be read from (PD-160). ⛔ The manuscript has since grown one, CR-218
//     having settled the medium as a WORD, so the case below reads that word and
//     asks whether it is on the surface -- and asks that nothing wears it where
//     the flag is not set.
//   - which of the two answers stands FIRST on the screen. The dictionary has a
//     print order and this file holds the answers to it, but nothing says the
//     drawn surface may not lay them out right-to-left; what is asserted is the
//     order of the DESCRIPTION and of the DOM the description produced.
//   - what is drawn for an item whose `name` is `null`. `Task.name` (AT-27) is
//     optional, so a nameless task has to survive the list rather than be
//     dropped (uf-67 covers that on the composing side), but NT-7 asks for a
//     NAME and there is none to draw.
//   - the geometry of the surface or of its two answers. Nothing in docs/spec
//     fixes an entrance's rectangle -- that is the very reason IF-9 needs
//     `readScreenPartAt` -- so the boxes below are this file's own, and NOTHING
//     is asserted about where they end. ⛔ Two cases here used to press an
//     entry's edges and demand R3.4's half-open answer; they measured this
//     file's `holdsPoint` and nothing else, going red when the fake browser's
//     arithmetic changed and staying green when the unit's did. They were
//     rewritten, not deleted: the points are still pressed, and what is asked
//     of them now is the unit's own share -- that the point reaches the host
//     unchanged, that no box is measured on that path, and that the answer is
//     the entry the node the HOST landed on belongs to.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { confirmationFromSession } from '../../src/adapter/screen-renderer/notices'
import type {
  AppHeaderItems,
  CommandItem,
  Confirmation,
  ConfirmationItem,
  RaisedConfirmation,
  ScreenFrame,
  ScreenPart,
  ScreenSession,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// the copy from the .md at read time, which is what keeps the rosters below from
// falling behind a row.
import { specTable, bare } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// What the tables say, read at load time.
// ---------------------------------------------------------------------------

const specText = (...parts: string[]): string =>
  readFileSync(join(process.cwd(), 'docs', 'spec', ...parts), 'utf8')

/** The row of table T-103 that settles the name of this surface. */
const U_55 = 'U-55'

/** The row of table T-037 whose manner this surface follows. */
const ASKING = 'NT-7'

/** The display language every case below asks the screen for. */
const LANGUAGE = 'en'

/**
 * Table T-234 -- the whole of what FR-076 (MUST) lets a question show, and
 * (MUST NOT) the whole of it. `namesWhatGoes` is that table's own
 * 名前を挙げるか column, so no case here decides for a row whether NT-7's names
 * are owed on it.
 *
 * ⭐ Read from the .md at load time, the move every roster in this file makes.
 * ⚠️ The 名前を挙げるか column is read raw rather than through `bare`: its cells
 * carry a code span (`Task`) that `bare` would hand back in place of the answer.
 */
const T_234 = specTable('T-234').rows.map((row) => ({
  row: row.id,
  namesWhatGoes: (row.by['名前を挙げるか'] ?? '').trim().startsWith('挙げる'),
  by: (row.by['正'] ?? '').trim(),
}))

/** A row of table T-234, taken from the fixed copy in its print order; `at` wraps. */
const questionRow = (at: number): string =>
  (T_234[at % T_234.length] as { readonly row: string }).row

/**
 * The sentence FR-038's one dictionary holds for a row of table T-234, in the
 * language these cases ask the screen for.
 *
 * ⭐ WHY THIS FILE READS A WORD AT ALL, having read none before. What a question
 * SHOWS is no longer something an asker hands over: FR-076 (MUST) makes it a row
 * of that table and FR-038 (MUST) keeps the sentence in the generated
 * dictionary, so the sentence NT-7 (MUST) has on the screen can only be named
 * by reading it. ⛔ It is READ, never written here -- FR-038's MUST NOT bars the
 * words from a requirement and from a table, and a bench may not mint one either.
 */
const DISPLAY_WORDS = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'),
    'utf8',
  ),
) as {
  readonly questions: readonly { readonly rowId: string; readonly text: Record<string, string> }[]
  readonly confirmationMarks: readonly {
    readonly mark: string
    readonly text: Record<string, string>
  }[]
}

const QUESTION_WORDS = DISPLAY_WORDS.questions

/** The `confirmationMarks` section -- the word an item wears when FR-032 asks for one. */
const MARK_WORDS = DISPLAY_WORDS.confirmationMarks

/**
 * The word FR-032's mark is made of, in the language these cases ask for.
 *
 * ⛔ READ, NEVER WRITTEN, for the reason `sentenceFor` is: CR-218 settles the
 * medium as a word and FR-038 (MUST) keeps it in the one dictionary. ⚠️ Which
 * mark it is, is the dictionary's own key -- this file names no mark of its own.
 */
const SHOWN_ON_ANOTHER_ROW_MARK: string = (() => {
  const held = MARK_WORDS[0]
  if (held === undefined) throw new Error('FR-032: the dictionary holds no mark for an item')
  return held.text[LANGUAGE] ?? ''
})()

const sentenceFor = (question: string): string => {
  const held = QUESTION_WORDS.find((one) => one.rowId === question)
  if (held === undefined) throw new Error(`the dictionary holds no row of table T-234 for ${question}`)
  return held.text[LANGUAGE] ?? ''
}

/**
 * The settled name of U-55, spelled as table T-103 spells it.
 *
 * ⛔ Not written out here. The preamble above table T-109 says that its surface
 * column holds table T-103's settled names and that no new surface name is
 * coined, so the one name in play has to
 * come from the table that settles it, or the join between the two tables is a
 * coincidence rather than a rule.
 */
function settledNameOf(row: string): string {
  const held = specTable('T-103').rows.find((one) => one.id === row)
  if (held === undefined) throw new Error(`table T-103 no longer holds ${row}`)
  // The heading of the settled-name column, in the table's own language.
  const name = bare(held.by['確定名（英）'] ?? held.cells[0] ?? '')
  if (name === '') throw new Error(`table T-103 ${row} has no settled name`)
  return name
}

const CONFIRMATION = settledNameOf(U_55)

/** One row of the GENERATED roster, which is table T-109 turned into data. */
interface RosterIcon {
  readonly rowId: string
  readonly surfaces: readonly string[]
  readonly group: string | null
  readonly entryTo: string
  readonly authority: string
}

interface Roster {
  readonly columns: Readonly<Record<string, string>>
  readonly icons: readonly RosterIcon[]
}

/**
 * `src/adapter/screen-renderer/icon-roster.json`, read the way the unit reads it.
 *
 * ⭐ THE ROSTER IS WHAT DRIVES THESE CASES. It is generated from table T-109 by
 * tools/generate_icon_roster.py and `npm run gen:check` fails on drift, so
 * filtering it on the surface column is the same question as reading that
 * column out of the .md -- and the unit under test reads the very same
 * file. ⛔ The two row ids are never written down here.
 */
const ROSTER: Roster = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'icon-roster.json'),
    'utf8',
  ),
) as Roster

/**
 * table T-109 filtered on its surface column: the entries that stand on U-55.
 *
 * ⛔⛔ EMPTY SINCE CR-327, AND THAT IS NT-7's OWN MUST NOT. Kept and asserted
 * rather than deleted -- a row that named U-55 again would be the manuscript
 * coming back on itself, and the first case below is where that is caught.
 */
const ON_THE_CONFIRMATION: readonly RosterIcon[] = ROSTER.icons.filter((one) =>
  one.surfaces.includes(CONFIRMATION),
)

/** Their row ids, in the roster's order -- which is table T-109's print order. */
const ENTRY_ROWS: readonly string[] = ON_THE_CONFIRMATION.map((one) => one.rowId)

/**
 * The `confirmation` section of `docs/spec/_source/display-words.json` -- where
 * NT-7 (MUST) sends the words of its two answers.
 *
 * ⭐ THE MANUSCRIPT AND NOT THE GENERATED COPY, so that a word which never made
 * the crossing is caught here rather than agreed with. ⛔ Neither key nor word
 * is written down in this file: both come out of this section.
 */
const MANUSCRIPT_ANSWERS: readonly { readonly answer: string; readonly text: Record<string, string> }[] =
  (
    JSON.parse(
      readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
    ) as {
      confirmation: { answer: string; text: Record<string, string> }[]
    }
  ).confirmation

/** Their keys, in the section's own print order. */
const ANSWER_KEYS: readonly string[] = MANUSCRIPT_ANSWERS.map((one) => one.answer)

/**
 * The word one answer carries in the display language these cases are drawn in.
 *
 * ⭐ READ, NEVER WRITTEN: FR-038 (MUST) keeps every printed word in the one
 * dictionary, and a test that spelt one would be a second store of them.
 */
function answerWordFor(answer: string): string {
  const held = MANUSCRIPT_ANSWERS.find((one) => one.answer === answer)?.text[LANGUAGE]
  if (held === undefined || held === '') {
    throw new Error(`FR-038: the manuscript holds no ${LANGUAGE} word for the answer ${answer}`)
  }
  return held
}

/**
 * NT-7 of table T-037, sentence by sentence. Quoted in the specification's own
 * language because these cases assert that the sentences are still there.
 */
const NT_7_SHOW_AND_CHOOSE = '何が起きるかを示したうえで、続けるか取りやめるかを選ばせること（MUST）'
const NT_7_BY_NAME = 'その名前を挙げること（MUST）'
const NT_7_COUNT_IS_NO_SUBSTITUTE = '件数は名前の代わりにできない'
const NT_7_ONLY_WHERE_ASKED = '問うてよいのは、要求が確認を求めると定めた場面だけとすること（MUST）'
/** The sentence CR-327 added: the answers are words, not shapes. */
const NT_7_WORD_BUTTONS = '答えの入口は、図形ではなく語のボタンとすること（MUST）'
/** ⛔ And where those words come from, spelt the same in every display language. */
const NT_7_SAME_IN_EVERY_LANGUAGE =
  '`FR-038` の辞書の `confirmation` の語を、どの表示言語でも `Yes` / `No` と綴ること（MUST）'
/** ⛔ The MUST NOT that takes the two off table T-109. */
const NT_7_NO_ROW_OF_T_109 = '答えの入口に 表 T-109 の行を与えてはならない（MUST NOT）'
/** ⭐ The head letter, and why it is drawn bold. */
const NT_7_BOLD_HEAD = '頭の 1 文字（`Y` と `N`）を太字にすること（MUST）'
/** ⭐ The two keys, and the order they are spent in. */
const NT_7_ANSWERED_BY_KEY = '`y` と `n` の打鍵でも答えられること（MUST）'
const NT_7_KEYS_GO_NOWHERE_ELSE =
  '問いが立っているあいだ、この 2 つのキーをほかの何にも渡してはならない（MUST NOT）'

/** FR-032's two halves that reach the screen. */
const FR_032_NAMES_NOT_A_COUNT = '件数だけを示してはならない（MUST NOT）'
const FR_032_SHOWN_ON_ANOTHER_ROW = 'その旨を示すこと（MUST）'

/** The note under table T-023a that the table of other surfaces belongs to. */
const T_023A_ONLY_THE_DRAWING_AREA = '判定順序を適用するのは日程の描画領域だけとすること（MUST）。'

/**
 * The preamble above table T-109, which is what joins its surface column to
 * table T-103. Quoted, because the join is the whole reason this file may read
 * one table and drive cases about the other.
 */
const T_109_PREAMBLE_SURFACE_COLUMN =
  '**`面` の欄は 表 T-103 の確定名である。** 新しい面の名を作らない。'

/** The MUST under table T-065 that puts the answer on the side that drew it. */
const T_065_THE_SIDE_THAT_DREW_IT = '点がどの入口の上かは、その入口を描いた側が答えること（MUST）'

// ---------------------------------------------------------------------------
// The fake browser. ⛔ A browser's rules, and no opinion of this file's.
// ---------------------------------------------------------------------------

interface FakeEvent {
  readonly type: string
  readonly key: string
  readonly isComposing: boolean
  readonly shiftKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
  target: FakeElement | null
  currentTarget: FakeElement | null
  defaultPrevented: boolean
  preventDefault(): void
  stopPropagation(): void
}

interface Registration {
  readonly node: FakeElement
  readonly type: string
  readonly listener: (event: FakeEvent) => void
}

type StyleWrite =
  | { readonly kind: 'reset'; readonly css: string }
  | { readonly kind: 'set'; readonly property: string; readonly value: string }

/** One question about a point, as the unit put it. */
interface PointQuery {
  readonly member: string
  readonly x: number
  readonly y: number
}

class FakeText {
  parentNode: FakeElement | null = null
  constructor(public data: string) {}
}

type FakeNode = FakeElement | FakeText

class FakeElement {
  readonly tagName: string
  readonly attributes = new Map<string, string>()
  readonly childNodes: FakeNode[] = []
  readonly styleWrites: StyleWrite[] = []
  parentNode: FakeElement | null = null
  /** Only an `input` really has one; harmless elsewhere and it keeps the fake small. */
  value = ''
  isMount = false

  constructor(
    tagName: string,
    readonly world: World,
  ) {
    this.tagName = tagName.toUpperCase()
  }

  // -- attributes ---------------------------------------------------------

  setAttribute(name: string, value: string): void {
    if (name === 'style') {
      this.styleWrites.push({ kind: 'reset', css: value })
      return
    }
    this.attributes.set(name, String(value))
  }

  getAttribute(name: string): string | null {
    if (name === 'style') return inlineStyle(this)
    return this.attributes.get(name) ?? null
  }

  hasAttribute(name: string): boolean {
    if (name === 'style') return this.styleWrites.length > 0
    return this.attributes.has(name)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  get dataset(): Record<string, string> {
    const element = this
    return new Proxy(
      {},
      {
        get(_target, property): string | undefined {
          if (typeof property !== 'string') return undefined
          return element.attributes.get(`data-${kebab(property)}`)
        },
        set(_target, property, value): boolean {
          if (typeof property === 'string') {
            element.attributes.set(`data-${kebab(property)}`, String(value))
          }
          return true
        },
      },
    ) as Record<string, string>
  }

  get id(): string {
    return this.attributes.get('id') ?? ''
  }

  set id(value: string) {
    this.attributes.set('id', value)
  }

  get className(): string {
    return this.attributes.get('class') ?? ''
  }

  set className(value: string) {
    this.attributes.set('class', value)
  }

  get classList(): {
    add: (...names: string[]) => void
    remove: (...names: string[]) => void
    contains: (name: string) => boolean
    toggle: (name: string, force?: boolean) => void
  } {
    const element = this
    const names = (): Set<string> =>
      new Set(element.className.split(/\s+/).filter((one) => one.length > 0))
    const write = (set: Set<string>): void => {
      element.className = [...set].join(' ')
    }
    return {
      add: (...added) => {
        const set = names()
        for (const one of added) set.add(one)
        write(set)
      },
      remove: (...removed) => {
        const set = names()
        for (const one of removed) set.delete(one)
        write(set)
      },
      contains: (name) => names().has(name),
      toggle: (name, force) => {
        const set = names()
        const on = force ?? !set.has(name)
        if (on) set.add(name)
        else set.delete(name)
        write(set)
      },
    }
  }

  /** ⛔ FR-023: an assignment here would be markup. It is recorded, never obeyed. */
  get innerHTML(): string {
    this.world.markupWrites.push({ node: this, value: '(read)' })
    return ''
  }

  set innerHTML(value: string) {
    this.world.markupWrites.push({ node: this, value })
  }

  get style(): Record<string, string> {
    const element = this
    return new Proxy(
      {},
      {
        get(_target, property): unknown {
          if (property === 'setProperty') {
            return (name: string, value: string): void => {
              element.styleWrites.push({ kind: 'set', property: name, value })
            }
          }
          if (typeof property !== 'string') return undefined
          return styleMap(element).get(kebab(property)) ?? ''
        },
        set(_target, property, value): boolean {
          if (typeof property !== 'string') return true
          if (property === 'cssText') {
            element.styleWrites.push({ kind: 'reset', css: String(value) })
            return true
          }
          element.styleWrites.push({ kind: 'set', property: kebab(property), value: String(value) })
          return true
        },
      },
    ) as Record<string, string>
  }

  /**
   * ⚠️ Mirrors the real property so that a unit which wrote `el.disabled = true`
   * instead of `setAttribute` is caught by the same case.
   */
  get disabled(): boolean {
    return this.attributes.has('disabled')
  }

  set disabled(value: boolean) {
    if (value) this.attributes.set('disabled', '')
    else this.attributes.delete('disabled')
  }

  // -- the tree -----------------------------------------------------------

  private adopt(node: FakeNode | string): FakeNode {
    if (typeof node === 'string') return new FakeText(node)
    node.parentNode?.detach(node)
    return node
  }

  private detach(node: FakeNode): void {
    const at = this.childNodes.indexOf(node)
    if (at >= 0) this.childNodes.splice(at, 1)
    node.parentNode = null
  }

  append(...nodes: (FakeNode | string)[]): void {
    for (const one of nodes) {
      const node = this.adopt(one)
      node.parentNode = this
      this.childNodes.push(node)
    }
  }

  appendChild(node: FakeNode): FakeNode {
    this.append(node)
    return node
  }

  replaceChildren(...nodes: (FakeNode | string)[]): void {
    for (const one of [...this.childNodes]) this.detach(one)
    this.append(...nodes)
  }

  removeChild(node: FakeNode): FakeNode {
    this.detach(node)
    return node
  }

  insertBefore(node: FakeNode, reference: FakeNode | null): FakeNode {
    const adopted = this.adopt(node)
    const at = reference === null ? this.childNodes.length : this.childNodes.indexOf(reference)
    this.childNodes.splice(at < 0 ? this.childNodes.length : at, 0, adopted)
    adopted.parentNode = this
    return adopted
  }

  remove(): void {
    this.parentNode?.detach(this)
  }

  get children(): FakeElement[] {
    return this.childNodes.filter((one): one is FakeElement => one instanceof FakeElement)
  }

  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null
  }

  get lastChild(): FakeNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null
  }

  get parentElement(): FakeElement | null {
    return this.parentNode
  }

  get textContent(): string {
    return this.childNodes
      .map((one) => (one instanceof FakeText ? one.data : one.textContent))
      .join('')
  }

  set textContent(value: string) {
    for (const one of [...this.childNodes]) this.detach(one)
    if (value !== '') this.append(new FakeText(value))
  }

  get isConnected(): boolean {
    let at: FakeElement | null = this
    while (at !== null) {
      if (at.isMount) return true
      at = at.parentNode
    }
    return false
  }

  contains(node: FakeElement): boolean {
    let at: FakeElement | null = node
    while (at !== null) {
      if (at === this) return true
      at = at.parentNode
    }
    return false
  }

  closest(selector: string): FakeElement | null {
    let at: FakeElement | null = this
    while (at !== null) {
      if (matches(at, selector)) return at
      at = at.parentNode
    }
    return null
  }

  querySelector(selector: string): FakeElement | null {
    this.world.selectors.push(selector)
    return descendants(this).find((one) => matches(one, selector)) ?? null
  }

  querySelectorAll(selector: string): FakeElement[] {
    this.world.selectors.push(selector)
    return descendants(this).filter((one) => matches(one, selector))
  }

  // -- what only a browser can answer -------------------------------------

  getBoundingClientRect(): {
    x: number
    y: number
    width: number
    height: number
    top: number
    left: number
    right: number
    bottom: number
  } {
    this.world.measured.push(this)
    const box = laidOut(this)
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      top: box.y,
      left: box.x,
      right: box.x + box.width,
      bottom: box.y + box.height,
    }
  }

  focus(): void {
    this.world.activeElement = this
  }

  blur(): void {
    if (this.world.activeElement === this) this.world.activeElement = null
  }

  // -- events -------------------------------------------------------------

  addEventListener(type: string, listener: (event: FakeEvent) => void): void {
    this.world.registrations.push({ node: this, type, listener })
  }

  removeEventListener(type: string, listener: (event: FakeEvent) => void): void {
    const at = this.world.registrations.findIndex(
      (one) => one.node === this && one.type === type && one.listener === listener,
    )
    if (at >= 0) this.world.registrations.splice(at, 1)
  }

  dispatchEvent(event: FakeEvent): boolean {
    event.target = this
    let stopped = false
    const stop = event.stopPropagation.bind(event)
    Object.defineProperty(event, 'stopPropagation', {
      configurable: true,
      value: (): void => {
        stopped = true
        stop()
      },
    })
    let at: FakeElement | null = this
    while (at !== null && !stopped) {
      const here: FakeElement = at
      for (const one of [...this.world.registrations]) {
        if (one.node === here && one.type === event.type) {
          event.currentTarget = here
          one.listener(event)
        }
      }
      at = at.parentNode
    }
    return !event.defaultPrevented
  }
}

interface World {
  readonly created: FakeElement[]
  readonly registrations: Registration[]
  readonly measured: FakeElement[]
  readonly selectors: string[]
  readonly markupWrites: { node: FakeElement; value: string }[]
  readonly hostMembers: string[]
  readonly pointQueries: PointQuery[]
  /** This file's own placing, by `data-icon` first and then by `data-role`. */
  readonly layout: Map<string, ScreenRect>
  mount: FakeElement | null
  activeElement: FakeElement | null
}

// ---------------------------------------------------------------------------
// The fake's geometry.
// ---------------------------------------------------------------------------

const ZERO: ScreenRect = { x: 0, y: 0, width: 0, height: 0 }

const layoutKey = (element: FakeElement): string | null => {
  const icon = element.attributes.get('data-icon')
  if (icon !== undefined) return `icon:${icon}`
  // NT-7's two answers, which carry no `data-icon` (MUST NOT) and so need a key
  // of their own here, exactly as they need a member of their own on
  // `ScreenPart`.
  const answer = element.attributes.get('data-confirmation-answer')
  if (answer !== undefined) return `answer:${answer}`
  const role = element.attributes.get('data-role')
  if (role !== undefined) return `role:${role}`
  return null
}

/**
 * Where this node sits.
 *
 * ⭐ Worked out from the ATTRIBUTES the unit wrote rather than from a table keyed
 * by node, so that a measurement taken while drawing and one taken while
 * answering a point cannot disagree. A node the layout does not place takes the
 * union of what it holds, the way a plain box does.
 */
function laidOut(element: FakeElement): ScreenRect {
  const key = layoutKey(element)
  if (key !== null) {
    const placed = element.world.layout.get(key)
    if (placed !== undefined) return placed
  }
  let box: ScreenRect | null = null
  for (const child of element.children) {
    const inside = laidOut(child)
    if (inside.width === 0 && inside.height === 0) continue
    box = box === null ? inside : union(box, inside)
  }
  return box ?? ZERO
}

function union(a: ScreenRect, b: ScreenRect): ScreenRect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  }
}

/**
 * Half-open on both axes -- the same rule `rectHoldsPoint` follows in
 * src/entity/layout-engine/screen-regions/screen-regions.ts, which cites R3.4.
 */
const holdsPoint = (box: ScreenRect, x: number, y: number): boolean =>
  box.width > 0 &&
  box.height > 0 &&
  x >= box.x &&
  x < box.x + box.width &&
  y >= box.y &&
  y < box.y + box.height

const isHiddenHere = (element: FakeElement): boolean => {
  const style = styleOf(element)
  return style.includes('visibility:hidden') || style.includes('display:none')
}

/**
 * Every node the point lands on, topmost first.
 *
 * ⭐ A browser's order: later in document order paints over earlier, and a
 * subtree that is not shown takes no pointer. ⛔ Which of two UI PARTS wins is
 * not decided here -- that is the unit's answer, and this only says what a page
 * would have looked like.
 */
function stackAt(root: FakeElement, x: number, y: number): FakeElement[] {
  const found: FakeElement[] = []
  const walk = (at: FakeElement): void => {
    if (isHiddenHere(at)) return
    if (holdsPoint(laidOut(at), x, y)) found.push(at)
    for (const child of at.children) walk(child)
  }
  walk(root)
  return found.reverse()
}

// ---------------------------------------------------------------------------
// Wiring the unit up.
// ---------------------------------------------------------------------------

interface Stage {
  readonly world: World
  readonly host: Document
  readonly mount: FakeElement
  readonly reportedHeights: number[]
  surface: ScreenSurface | undefined
  root(): FakeElement
}

/**
 * A browser that is only what `ScreenSurfaceWiring` says it is, plus the one
 * member a real `Document` offers for a point.
 *
 * ⚠️ The host is a Proxy so that every member the unit reaches for is recorded.
 */
function stage(layout: Map<string, ScreenRect>): Stage {
  const world: World = {
    created: [],
    registrations: [],
    measured: [],
    selectors: [],
    markupWrites: [],
    hostMembers: [],
    pointQueries: [],
    layout,
    mount: null,
    activeElement: null,
  }

  const mount = new FakeElement('div', world)
  mount.isMount = true
  world.mount = mount

  const base: Record<string, unknown> = {
    createElement(tagName: string): FakeElement {
      const made = new FakeElement(tagName, world)
      world.created.push(made)
      return made
    },
    elementFromPoint(x: number, y: number): FakeElement | null {
      world.pointQueries.push({ member: 'elementFromPoint', x, y })
      return stackAt(mount, x, y)[0] ?? null
    },
    elementsFromPoint(x: number, y: number): FakeElement[] {
      world.pointQueries.push({ member: 'elementsFromPoint', x, y })
      return stackAt(mount, x, y)
    },
  }

  const host = new Proxy(base, {
    get(target, property, receiver): unknown {
      if (typeof property === 'string') world.hostMembers.push(property)
      return Reflect.get(target, property, receiver)
    },
    has(target, property): boolean {
      if (typeof property === 'string') world.hostMembers.push(property)
      return Reflect.has(target, property)
    },
  }) as unknown as Document

  return {
    world,
    host,
    mount,
    reportedHeights: [],
    surface: undefined,
    root(): FakeElement {
      const first = mount.children[0]
      if (first === undefined) throw new Error('the unit mounted nothing')
      return first
    },
  }
}

function wiringOf(built: Stage): ScreenSurfaceWiring {
  return {
    host: built.host,
    mount: built.mount as unknown as Element,
    readAuthor: (): string => 'Watcher',
    readClockMs: (): number => Date.UTC(2026, 7, 22, 3, 4, 5),
    onAppHeaderHeightPx: (heightPx: number): void => {
      built.reportedHeights.push(heightPx)
    },
    // ⭐ `THEME` is the same pair the session below carries, and it is declared
    // beside it: a question is words and two answers, so no case here reads a
    // colour back. The member is REQUIRED all the same -- FR-041 (MUST NOT)
    // leaves the environment no say -- so the bench has to state one.
    readTheme: (): ScreenTheme => THEME,
  }
}

function wire(layout: Map<string, ScreenRect> = LAYOUT): Stage {
  const built = stage(layout)
  built.surface = domScreenSurface(wiringOf(built))
  return built
}

function surfaceOf(built: Stage): ScreenSurface {
  if (built.surface === undefined) throw new Error('the surface was not built')
  return built.surface
}

/** Wire up and draw -- the shape almost every case takes. */
function drawn(view: ScreenView): Stage {
  const built = wire()
  surfaceOf(built).showScreenView(view)
  return built
}

const ask = (built: Stage, at: { readonly x: number; readonly y: number }): ScreenPart | null =>
  surfaceOf(built).readScreenPartAt(at.x, at.y)

/**
 * What the HOST says is under the point -- the fake browser's own answer, taken
 * through the one member of `Document` the wiring offers for a point.
 *
 * ⭐ This is how a case can ask what the UNIT did with the host's answer without
 * re-deciding where the point fell. Whose the geometry is, is the whole question
 * these edge cases turn on.
 */
const hostLanding = (
  built: Stage,
  at: { readonly x: number; readonly y: number },
): FakeElement | null =>
  (built.host as unknown as { elementFromPoint(x: number, y: number): FakeElement | null })
    .elementFromPoint(at.x, at.y)

/** The four corners of a box: the points R3.4 tells apart, whoever owns the box. */
const edgesOf = (box: ScreenRect): readonly { readonly x: number; readonly y: number }[] => [
  { x: box.x, y: box.y },
  { x: box.x + box.width, y: box.y },
  { x: box.x, y: box.y + box.height },
  { x: box.x + box.width, y: box.y + box.height },
]

// ---------------------------------------------------------------------------
// Reading the tree the unit built.
// ---------------------------------------------------------------------------

const kebab = (name: string): string => name.replace(/[A-Z]/g, (one) => `-${one.toLowerCase()}`)

function styleMap(element: FakeElement): Map<string, string> {
  const held = new Map<string, string>()
  for (const write of element.styleWrites) {
    if (write.kind === 'reset') {
      held.clear()
      for (const one of write.css.split(';')) {
        const at = one.indexOf(':')
        if (at < 0) continue
        held.set(one.slice(0, at).trim().toLowerCase(), one.slice(at + 1).trim())
      }
      continue
    }
    held.set(write.property.toLowerCase(), write.value)
  }
  return held
}

function inlineStyle(element: FakeElement): string {
  return [...styleMap(element)].map(([property, value]) => `${property}:${value}`).join(';')
}

const styleOf = (element: FakeElement): string =>
  inlineStyle(element).replace(/\s+/g, '').toLowerCase()

function descendants(element: FakeElement): FakeElement[] {
  const found: FakeElement[] = []
  for (const child of element.children) {
    found.push(child, ...descendants(child))
  }
  return found
}

const selfAndDescendants = (element: FakeElement): FakeElement[] => [
  element,
  ...descendants(element),
]

const byRole = (root: FakeElement, role: string): FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.getAttribute('data-role') === role)

/** The one `[data-role="Confirmation"]` node, or a failure that says how many there were. */
function confirmationPartOf(built: Stage): FakeElement {
  const found = byRole(built.root(), CONFIRMATION)
  expect(found, `table T-103 ${U_55}: exactly one ${CONFIRMATION} is drawn`).toHaveLength(1)
  const first = found[0]
  if (first === undefined) throw new Error('unreachable')
  return first
}

/** Every node carrying a row of table T-109, in document order. */
const entryNodesIn = (element: FakeElement): FakeElement[] =>
  selfAndDescendants(element).filter((one) => one.getAttribute('data-icon') !== null)

const entryRowsIn = (element: FakeElement): string[] =>
  entryNodesIn(element).map((one) => one.getAttribute('data-icon') ?? '')

/** Every node carrying one of NT-7's two answers, in document order. */
const answerNodesIn = (element: FakeElement): FakeElement[] =>
  selfAndDescendants(element).filter(
    (one) => one.getAttribute('data-confirmation-answer') !== null,
  )

const answerKeysIn = (element: FakeElement): string[] =>
  answerNodesIn(element).map((one) => one.getAttribute('data-confirmation-answer') ?? '')

function answerNodeFor(element: FakeElement, answer: string): FakeElement {
  const found = answerNodesIn(element).filter(
    (one) => one.getAttribute('data-confirmation-answer') === answer,
  )
  expect(found, `${answer} is drawn once on the ${CONFIRMATION}`).toHaveLength(1)
  const first = found[0]
  if (first === undefined) throw new Error('unreachable')
  return first
}

const isShown = (element: FakeElement): boolean => {
  let at: FakeElement | null = element
  while (at !== null) {
    if (isHiddenHere(at)) return false
    at = at.parentNode
  }
  return true
}

/** Only what a person can still see: a hidden subtree contributes nothing. */
function shownText(element: FakeElement): string {
  if (isHiddenHere(element)) return ''
  return element.childNodes
    .map((one) => (one instanceof FakeText ? one.data : shownText(one)))
    .join('')
}

/** Attributes and text together, for a case that asks whether two nodes differ at all. */
function serialize(element: FakeElement): string {
  const attributes = [...element.attributes].map(([name, value]) => ` ${name}="${value}"`).join('')
  const style = inlineStyle(element)
  const inside = element.childNodes
    .map((one) => (one instanceof FakeText ? one.data : serialize(one)))
    .join('')
  const tag = element.tagName.toLowerCase()
  return `<${tag}${attributes}${style === '' ? '' : ` style="${style}"`}>${inside}</${tag}>`
}

/**
 * The nodes whose whole text is exactly this one string.
 *
 * ⭐ THIS IS HOW "ITS NAME IS GIVEN" IS ASKED WITHOUT FIXING A SPELLING. A name
 * that reached the screen as its own element answers here; a list of names run
 * together into one sentence, or replaced by a count, answers with nothing.
 */
const nodesReadingExactly = (root: FakeElement, text: string): FakeElement[] =>
  selfAndDescendants(root).filter((one) => shownText(one) === text)

/** A tiny selector engine: enough for `[attr]`, `[attr="value"]`, a tag and a descendant. */
function matches(element: FakeElement, selector: string): boolean {
  const parts = selector.trim().split(/\s+(?![^[]*\])/)
  const last = parts[parts.length - 1]
  if (last === undefined) return false
  if (!matchesSimple(element, last)) return false
  let at = element.parentNode
  for (let index = parts.length - 2; index >= 0; index -= 1) {
    const want = parts[index]
    if (want === undefined) continue
    let found = false
    while (at !== null) {
      if (matchesSimple(at, want)) {
        found = true
        at = at.parentNode
        break
      }
      at = at.parentNode
    }
    if (!found) return false
  }
  return true
}

function matchesSimple(element: FakeElement, selector: string): boolean {
  const attribute = /^\[([^\]=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/.exec(selector)
  if (attribute !== null) {
    const name = attribute[1] ?? ''
    const wanted = attribute[2] ?? attribute[3] ?? attribute[4]
    const held = element.getAttribute(name)
    if (held === null) return false
    return wanted === undefined || held === wanted
  }
  if (selector.startsWith('#')) return element.id === selector.slice(1)
  if (selector.startsWith('.')) return element.classList.contains(selector.slice(1))
  return element.tagName === selector.toUpperCase()
}

// ---------------------------------------------------------------------------
// The screen these cases press on.
// ---------------------------------------------------------------------------

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

const WINDOW = { width: 1000, height: 800 } as const
const HEADER_HEIGHT = 40

/**
 * ⛔ THESE BOXES ARE THIS FILE'S OWN, AND SO IS THE RULE ABOUT THEIR EDGES.
 * Nothing in docs/spec fixes the geometry of a surface or of an entry -- that is
 * the very reason IF-9 needs `readScreenPartAt` -- and the unit reads no
 * rectangle at all: it asks the host which node a point landed on. So `holdsPoint`
 * below is the FAKE BROWSER's arithmetic, and no case may turn it into a claim
 * about the unit; what the edge cases ask is what the unit did with the host's
 * answer.
 * The two answers are laid apart on purpose, so that a strip of bare
 * `Confirmation` lies between them, so "on the surface, off every answer" can be
 * told from "on an answer" without leaving the surface.
 */
const CONFIRMATION_BOX = rect(300, 250, 400, 200)
const ANSWER_BOXES: readonly ScreenRect[] = [rect(330, 380, 120, 32), rect(470, 380, 120, 32)]

const boxOfAnswer = (index: number): ScreenRect =>
  ANSWER_BOXES[index] ?? rect(330 + index * 140, 380, 120, 32)

const LAYOUT = new Map<string, ScreenRect>([
  ['role:App Header', rect(0, 0, WINDOW.width, HEADER_HEIGHT)],
  [`role:${CONFIRMATION}`, CONFIRMATION_BOX],
  ...ANSWER_KEYS.map(
    (answer, index): [string, ScreenRect] => [`answer:${answer}`, boxOfAnswer(index)],
  ),
])

/** The middle of the box the answer in this position of the dictionary was given. */
function midOfAnswer(index: number): { readonly x: number; readonly y: number } {
  const box = boxOfAnswer(index)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const AT = {
  /** Inside the surface, above both answers -- on the surface, off every answer. */
  surfaceOnly: { x: 620, y: 300 },
  /** The bare strip between the two answers, still inside the surface. */
  betweenTheAnswers: { x: 460, y: 396 },
  /** Where the schedule is exposed: outside the header and outside the surface. */
  scheduleExposed: { x: 100, y: 300 },
} as const

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  // FR-053: the entrance is not armed. ⛔ A separate member from `isPressed`,
  // because IC-54 says the palette entry is not a button and FR-053 (MUST NOT)
  // bars the pressed form -- so an arm may not travel on the toggle.
  isArmed: false,
  label: '',
  ...patch,
})

const FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const HEADER: AppHeaderItems = {
  documentTitle: 'DocumentTitleHere',
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [command({ icon: 'IC-7' })],
  // FR-038 (MUST): the header says which language is on, and it is the one
  // `BASE_VIEW` below carries -- S-99 is a single state for the whole screen.
  language: 'en',
}

const BASE_VIEW: ScreenView = {
  language: 'en',
  frame: FRAME,
  appHeaderItems: HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...BASE_VIEW, ...patch })

// ---------------------------------------------------------------------------
// Raising a question, and composing it into the surface.
// ---------------------------------------------------------------------------

/**
 * S-73's default hue, read out of table T-216 the way the other tables here
 * are read. DR-5 of table T-052 keeps the hue on `Project` rather than in the
 * settings, so no generated constant carries it.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

/**
 * The same pair as one value, for `ScreenSurfaceWiring.readTheme`.
 *
 * ⛔ S-72's default is read from the generated `SETTINGS_DEFAULTS` rather than
 * typed, for the reason rule 03 section 1 gives: a value the manuscript holds
 * goes stale the moment it is copied.
 */
const THEME: ScreenTheme = {
  preference: SETTINGS_DEFAULTS['themePreference'] as ScreenTheme['preference'],
  hue: THEME_HUE,
}

const sessionAsking = (raised: RaisedConfirmation | null): ScreenSession => ({
  language: LANGUAGE,
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  iconUnderPointer: null,
  commandPaletteAt: { x: 0, y: 0 },
  // No case here reads the theme or the milestone glyph list: a question is
  // words and two answers, and neither S-72 nor S-142 reaches it. Both take
  // the manuscript's default; S-73 is read above.
  themePreference: THEME.preference,
  themeHue: THEME.hue,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesShowing: null,
  propertiesSubject: null,
  notices: [],
  confirmation: raised,
  rowBoxes: [],
})

/**
 * A question as an asker hands it over: the manner, a ROW of table T-234, and
 * what would go.
 *
 * ⛔ NOT A SENTENCE. FR-076 (MUST) makes what a question shows a row of that
 * table and (MUST NOT) bars a question it does not hold; FR-038 (MUST) keeps the
 * sentence itself in the one dictionary. An asker that supplied one would be the
 * second store of translated strings the same requirement forbids.
 */
const raise = (question: string, items: readonly ConfirmationItem[] = []): RaisedConfirmation => ({
  manner: ASKING,
  question,
  items,
})

const named = (name: string, isShownOnAnotherRow = false): ConfirmationItem => ({
  name,
  isShownOnAnotherRow,
})

/**
 * The question as the screen receives it: raised by whoever asks, WIDENED by
 * UF-67 with the entries table T-109 puts on U-55.
 *
 * ⛔ Composed rather than written out, so that every case below is driven by the
 * roster all the way to the screen.
 */
function composed(raised: RaisedConfirmation): Confirmation {
  const shown = confirmationFromSession(sessionAsking(raised))
  if (shown === null) throw new Error('a raised question came back as none')
  return shown
}

const asking = (question: string, items: readonly ConfirmationItem[] = []): ScreenView =>
  viewWith({ confirmation: composed(raise(question, items)) })

/**
 * Every place a requirement says a confirmation is asked for -- which is table
 * T-234, walked row by row (Chapter 1.9 :275).
 *
 * ⛔ A roster of INPUTS, never of what may be shown: FR-031 forbids enumerating
 * the places that may ask (MUST NOT). They stand here only so that one case can
 * show the same surface answering for each. ⭐ WHICH ROWS EXIST IS THE TABLE'S
 * ANSWER, and so is whether NT-7's names are owed on one -- `items` follows the
 * 名前を挙げるか column instead of a pairing this file would have to invent. The
 * names themselves are the document's values and never the dictionary's, so
 * they are this file's own ASCII stand-ins.
 */
const ASKING_SITES: readonly {
  readonly by: string
  readonly question: string
  readonly items: readonly ConfirmationItem[]
}[] = T_234.map((entry) => ({
  by: `${entry.row} (${entry.by})`,
  question: entry.row,
  items: entry.namesWhatGoes ? [named('foundation work'), named('steel delivery', true)] : [],
}))

// ===========================================================================
// 0. The specification still says what these cases copy.
// ===========================================================================

describe('the specification still says what these cases copy', () => {
  it('GIVEN table T-103 WHEN U-55 is read THEN it still settles the name of the surface that asks', () => {
    const row = specTable('T-103').rows.find((one) => one.id === U_55)
    expect(row, `table T-103 no longer holds ${U_55}`).toBeDefined()

    const whole = row?.cells.join(' ') ?? ''
    expect(whole).toContain('続けてよいかを問う面')
    // U-55 names both of the tables this file joins.
    expect(whole).toContain('T-037')
    expect(whole).toContain(ASKING)
    expect(whole).toContain('T-109')
    // ⚠️ U-55 says in as many words that this is NOT a `Notice`, because a
    // notice asks for no answer.
    expect(whole).toContain('通知')
    expect(whole).toContain('ではない')
  })

  it('GIVEN the preamble above table T-109 WHEN it is read THEN its surface column still holds the settled names of table T-103', () => {
    expect(specText('_assets', 'tbl-glossary.md')).toContain(T_109_PREAMBLE_SURFACE_COLUMN)
  })

  it('⛔ GIVEN table T-109 WHEN it is filtered on its surface column THEN it prints NO row against Confirmation (NT-7 MUST NOT)', () => {
    const fromTheTable = specTable('T-109')
      // The heading of the surface column, in the table's own language.
      .rows.filter((one) => bare(one.by['面'] ?? one.cells[0] ?? '') === CONFIRMATION)
      .map((one) => one.id)

    // ⛔ THE MUST NOT ITSELF, quoted in the row's own words above.
    expect(
      fromTheTable,
      `table T-109 prints ${fromTheTable.join(' / ')} against ${CONFIRMATION}, which NT-7 forbids`,
    ).toEqual([])
    // ⭐ The generated roster is what the drawing side reads; this is the one
    // place the two are held against each other, so neither can fall behind.
    expect(ENTRY_ROWS).toEqual(fromTheTable)
    // ⭐ AND THE ANSWERS HAVE SOMEWHERE ELSE TO BE, which is what makes the two
    // lines above a move rather than a loss.
    expect(ANSWER_KEYS.length, 'NT-7 asks for TWO answers').toBe(2)
  })

  it('GIVEN the roster WHEN its column names are read THEN the column filtered on is the surface column of table T-109', () => {
    expect(ROSTER.columns['surfaces']).toBe('面')
    expect(ROSTER.columns['rowId']).toBe('行 ID')
  })

  it('GIVEN the manuscript dictionary WHEN its confirmation section is read THEN it holds one word per answer, spelt the same in every display language (NT-7 MUST)', () => {
    // ⛔ 「どの表示言語でも `Yes` / `No` と綴ること（MUST）。訳してはならない
    // （MUST NOT）—— 頭文字が下の打鍵を指さなくなる」. ⭐ The reason is the whole
    // point, so the head letter is asserted beside the word.
    // ⚠️ READ AND NEVER SPELT HERE: this file may not settle a word (FR-038).
    for (const held of MANUSCRIPT_ANSWERS) {
      const spellings = new Set(Object.values(held.text))
      expect(spellings.size, `${held.answer} is spelt differently by language`).toBe(1)
      const word = answerWordFor(held.answer)
      expect(word.length, `${held.answer} has no word to draw a head letter from`).toBeGreaterThan(0)
    }
    // ⭐ AND THE TWO HEADS DIFFER, which is what lets one key name one answer.
    const heads = ANSWER_KEYS.map((answer) => answerWordFor(answer).slice(0, 1))
    expect(new Set(heads).size, 'the two answers share a head letter').toBe(heads.length)
  })

  it('GIVEN table T-037 WHEN NT-7 is read THEN it still asks for what happens to be shown and for the choice to be made', () => {
    const manner = specTable('T-037').rows.find((one) => one.id === ASKING)?.cells.join(' ') ?? ''
    expect(manner).toContain(NT_7_SHOW_AND_CHOOSE)
    expect(manner).toContain(NT_7_BY_NAME)
    expect(manner).toContain(NT_7_COUNT_IS_NO_SUBSTITUTE)
    expect(manner).toContain(NT_7_ONLY_WHERE_ASKED)
  })

  it('GIVEN table T-037 WHEN NT-7 is read THEN it still makes the two answers WORD BUTTONS, bolds their head letter, and refuses them a row of table T-109', () => {
    // ⭐ THE FIXED COPY OF WHAT CR-327 ADDED. Every case below that draws a word
    // button, or asserts a bold head, or asks that no `data-icon` is written,
    // is driven by one of these five sentences -- so if the manuscript takes one
    // back, this case says so before the drawing cases start disagreeing with
    // a specification nobody has read.
    const manner = specTable('T-037').rows.find((one) => one.id === ASKING)?.cells.join(' ') ?? ''
    expect(manner).toContain(NT_7_WORD_BUTTONS)
    expect(manner).toContain(NT_7_SAME_IN_EVERY_LANGUAGE)
    expect(manner).toContain(NT_7_NO_ROW_OF_T_109)
    expect(manner).toContain(NT_7_BOLD_HEAD)
    expect(manner).toContain(NT_7_ANSWERED_BY_KEY)
    expect(manner).toContain(NT_7_KEYS_GO_NOWHERE_ELSE)
  })

  it('GIVEN FR-032 WHEN its confirmation sentence is read THEN a count still may not stand in for the names', () => {
    const text = specText('01-04-requirements.md')
    expect(text).toContain(FR_032_NAMES_NOT_A_COUNT)
    expect(text).toContain(FR_032_SHOWN_ON_ANOTHER_ROW)
  })

  it('GIVEN table T-024a OP-4 and table T-227 DI-4 / DI-5 WHEN they are read THEN two ask by NT-7 and one forbids asking', () => {
    const op4 = specTable('T-024a').rows.find((one) => one.id === 'OP-4')?.cells.join(' ') ?? ''
    expect(op4).toContain('捨てる前に確認を求めること（MUST）')

    const di4 = specTable('T-227').rows.find((one) => one.id === 'DI-4')?.cells.join(' ') ?? ''
    expect(di4).toContain('上書きしてよいかを問うこと（MUST）')
    expect(di4).toContain(ASKING)
    // ⚠️ DI-4 says in as many words that naming what goes is not owed here, so
    // an empty list of names is a real answer and not a missing one.
    expect(di4).toContain('消えるものの名前を挙げる義務はここには無い')

    const di5 = specTable('T-227').rows.find((one) => one.id === 'DI-5')?.cells.join(' ') ?? ''
    expect(di5).toContain('問わないこと（MUST）')
  })

  it('GIVEN table T-023a WHEN its note is read THEN the decision order is still the drawing area alone (MUST)', () => {
    expect(specText('01-04-requirements.md')).toContain(T_023A_ONLY_THE_DRAWING_AREA)
  })

  it('GIVEN table T-065 WHEN IF-9 and the MUST under it are read THEN the side that drew an entry still answers where it is', () => {
    const row = specTable('T-065').rows.find((one) => one.id === 'IF-9')
    const supply = row?.cells[row.cells.length - 1] ?? ''
    expect(supply).toContain('画面上の点')
    expect(supply).toContain('T-103')
    expect(specText('05-07-design.md')).toContain(T_065_THE_SIDE_THAT_DREW_IT)
  })

  it('GIVEN table T-028 IN-3 WHEN it is read THEN it governs the tooltip, which is not this surface', () => {
    // ⚠️ Quoted to keep IN-3 OFF the confirmation: a tooltip goes away when it
    // is dismissed AND when its trigger comes off, while NT-7 (MUST) has this
    // one wait until it is ANSWERED.
    //
    // ⭐ THE ROW WAS REWRITTEN, AND SO IS THE MIRROR. IN-3 used to read
    // 「勝手に消えないこと」 -- absolutely, with no end named. Version 1.05 of
    // A-appendix.md (CR-240) records why that went: SC 1.4.13 of
    // `docs/reference/wcag/` limits its third condition to 「引き金が外れるまで」
    // and the specification 「その限りを落として絶対化していた」. The row now
    // names three conditions and counts them, so the mirror names all three and
    // the count with them -- a mirror that could still pass on the old wording,
    // or on any wording, would not be one.
    const manner = specTable('T-028').rows.find((one) => one.id === 'IN-3')?.cells.join(' ') ?? ''
    expect(manner).toContain('ツールチップ')
    expect(manner).toContain('次の 3 つをすべて満たすこと（MUST）')
    // Dismissible, Hoverable, Persistent -- the three, in the row's own words.
    expect(manner).toContain('消せること')
    expect(manner).toContain('ポインタを乗せられること')
    expect(manner).toContain('引き金が外れるまで出ていること')
    // ⭐ And the clause that keeps the row off THIS surface: the tooltip is let
    // go once its trigger comes off. Nothing takes a confirmation away but an
    // answer, so a rule with an end of its own cannot be this one's.
    expect(manner).toContain('引き金が外れたら消してよい')
  })
})

// ===========================================================================
// 1. UF-67 -- the two answers are the dictionary's, not the asker's.
// ===========================================================================

describe('NT-7 -- the two word buttons that stand on the surface', () => {
  it('GIVEN the manuscript dictionary WHEN its confirmation section is read THEN it holds two distinct answers', () => {
    // ⛔ Neither key is written down in this file. If the manuscript ever prints
    // a third answer, this case starts describing it and every case below
    // starts driving it.
    expect(ANSWER_KEYS.length).toBeGreaterThanOrEqual(2)
    expect(new Set(ANSWER_KEYS).size).toBe(ANSWER_KEYS.length)
  })

  it('GIVEN a question was raised WHEN it is composed THEN it carries every answer the dictionary holds, in that dictionary order', () => {
    const shown = composed(raise(questionRow(0)))

    expect(shown.answers.map((one) => one.answer)).toEqual(ANSWER_KEYS)
  })

  it('GIVEN a question was raised WHEN it is composed THEN the raised half survives beside the answers the dictionary added', () => {
    const raised = raise(questionRow(1), [named('foundation work')])

    const shown = composed(raised)

    expect(shown.manner).toBe(raised.manner)
    expect(shown.question).toBe(raised.question)
    expect(shown.items).toEqual(raised.items)
    // ⭐ AND THE HALF THAT WAS NOT RAISED IS ADDED: the sentence is the
    // dictionary's answer for that row (FR-076, FR-038), never the asker's.
    expect(shown.text).toBe(sentenceFor(raised.question))
  })

  it('GIVEN no question was raised WHEN the view is filled THEN there is nothing to answer', () => {
    // NT-7 (MUST): a question may be asked only where a requirement says one is.
    expect(confirmationFromSession(sessionAsking(null))).toBeNull()
  })

  it('GIVEN each place a requirement asks WHEN each is composed THEN the same two answers stand on all of them (FR-031 MUST NOT: the places are not enumerated)', () => {
    for (const site of ASKING_SITES) {
      const shown = composed(raise(site.question, site.items))

      expect(shown.answers.map((one) => one.answer), site.by).toEqual(ANSWER_KEYS)
    }
  })
})

// ===========================================================================
// 2. NT-7's first MUST -- what happens is shown, and the choice is made.
// ===========================================================================

describe('table T-037 NT-7 (MUST) -- going on or calling it off is CHOSEN', () => {
  it('⛔ GIVEN a question was raised WHEN it is composed THEN neither answer carries a row of table T-109 or an entrance state (NT-7 MUST NOT)', () => {
    // ⛔ 「答えの入口に 表 T-109 の行を与えてはならない（MUST NOT）」, read back
    // from the VALUE: a unit that went on composing `CommandItem`s would answer
    // with `icon`, `isEnabled`, `isPressed` and `isArmed`.
    // ⭐ The three states are named beside the row id because they are the same
    // claim from the other end: choosing between the two IS this surface, so an
    // answer that could not be pressed would leave the person unable to answer
    // at all -- and there is no state for one of them to be in.
    const shown = composed(raise(questionRow(0)))

    expect(shown.answers.length).toBe(ANSWER_KEYS.length)
    for (const one of shown.answers) {
      expect(one, one.answer).not.toHaveProperty('icon')
      expect(one, one.answer).not.toHaveProperty('isEnabled')
      expect(one, one.answer).not.toHaveProperty('isPressed')
      expect(one, one.answer).not.toHaveProperty('isArmed')
      expect(Object.keys(one).sort(), one.answer).toEqual(['answer', 'text'])
    }
  })

  it('GIVEN a question was raised WHEN it is composed THEN each answer carries the word the manuscript holds for its own key (FR-038 MUST)', () => {
    const shown = composed(raise(questionRow(2)))

    for (const one of shown.answers) {
      expect(one.text, one.answer).toBe(answerWordFor(one.answer))
    }
  })

  it('GIVEN a question stands WHEN the screen is drawn THEN what is about to happen is on it, in words -- one case walks every row of table T-234', () => {
    // NT-7 (MUST): what is about to happen is shown. ⭐ WHAT the sentence says is not
    // this file's to settle: FR-076 (MUST) makes it a row of table T-234 and
    // FR-038 (MUST) keeps the sentence in the one dictionary, so what is asked
    // here is that the sentence held for the row that was RAISED is the one the
    // drawn surface carries. ⛔ Chapter 1.9 (:275): one case walks every row.
    for (const entry of T_234) {
      const built = drawn(asking(entry.row, []))

      expect(shownText(confirmationPartOf(built)), entry.by).toContain(sentenceFor(entry.row))
      // ⛔ AND THE ROW ITSELF IS NOT ON THE SCREEN: the row is the join, and
      // FR-038 (MUST) makes the printed thing a word.
      expect(shownText(confirmationPartOf(built)), entry.by).not.toContain(entry.row)
    }
  })

  it('GIVEN a question stands WHEN the screen is drawn THEN every answer the dictionary holds is drawn on that surface, in the dictionary order', () => {
    const built = drawn(asking(questionRow(1)))

    expect(answerKeysIn(confirmationPartOf(built))).toEqual(ANSWER_KEYS)
  })

  it('⛔ GIVEN a question stands WHEN the drawn answers are read THEN none carries a row of table T-109 (NT-7 MUST NOT)', () => {
    // ⛔ 「同表と 図 F-019 が持つのは図形の入口であり、語のボタンは図形を持たない」
    // -- so nothing on this surface may wear a `data-icon`, which is the join
    // `commandEntry` writes for a row of that table.
    const part = confirmationPartOf(drawn(asking(questionRow(1))))

    expect(entryRowsIn(part), 'a word button was drawn as an entry of table T-109').toEqual([])
  })

  it('GIVEN a question stands WHEN the drawn answers are read THEN each is shown, none is disabled, and each can be chosen', () => {
    // ⭐ "the choice is made" read as what a person can do: the answer is on the
    // screen, nothing takes it out of the tree, and a press on it reaches THAT
    // answer.
    // ⚠️ The last of the three is the one with teeth -- a disabled control is
    // still drawn, so the DOM's silence about `disabled` proves nothing on its
    // own. See the control case below.
    const built = drawn(asking(questionRow(2)))
    const part = confirmationPartOf(built)

    ANSWER_KEYS.forEach((answer, index) => {
      const node = answerNodeFor(part, answer)
      expect(isShown(node), `${answer} is on the screen`).toBe(true)
      expect(node.disabled, `${answer} may not be disabled`).toBe(false)
      expect(node.hasAttribute('disabled'), `${answer} may not be disabled`).toBe(false)
      expect(node.getAttribute('aria-disabled'), `${answer} may not be disabled`).not.toBe('true')
      expect(
        ask(built, midOfAnswer(index))?.confirmationAnswer,
        `${answer} can be chosen`,
      ).toBe(answer)
    })
  })

  it('⭐ GIVEN a question stands WHEN each answer is read THEN it carries the whole word, with its FIRST character drawn bold (NT-7 MUST)', () => {
    // ⭐ 「頭の 1 文字（`Y` と `N`）を太字にすること（MUST）—— 打鍵で答えられる
    // ことを、ボタン自身に名乗らせるためである」.
    // ⛔ THE WORD IS NOT SPELT HERE: it is read out of the manuscript, so a
    // change to the dictionary moves this case with it.
    // ⚠️ THE WHOLE WORD IS ASKED FOR BESIDE THE HEAD, because a surface that
    // drew ONLY the bold head would satisfy a head-alone claim and leave the
    // person reading 「Y」 where NT-7 asks for 「Yes」.
    const part = confirmationPartOf(drawn(asking(questionRow(2))))

    for (const answer of ANSWER_KEYS) {
      const word = answerWordFor(answer)
      const node = answerNodeFor(part, answer)

      expect(shownText(node), `${answer} shows its whole word`).toBe(word)

      const bold = selfAndDescendants(node).filter((one) =>
        (one.getAttribute('style') ?? '').replace(/\s+/g, '').includes('font-weight:bold'),
      )
      expect(bold.length, `${answer} draws no bold head`).toBe(1)
      expect(shownText(bold[0] as FakeElement), `${answer} bolds more or less than its head`).toBe(
        word.slice(0, 1),
      )
    }
  })

  it('⛔ GIVEN two answers whose words differ WHEN the two surfaces are compared THEN they differ -- so the case above is not a green that proves nothing (04-verification §2)', () => {
    // ⚠️ A description no requirement allows -- NT-7 fixes the two words -- built
    // here only to show that the surface DOES carry `ConfirmationAnswer.text` to
    // the screen. Without this, "the whole word is shown" could hold of a
    // surface that wrote a constant.
    const live = composed(raise(questionRow(2)))
    const renamed: Confirmation = {
      ...live,
      answers: live.answers.map((one) => ({ ...one, text: `${one.answer}Word` })),
    }

    const asLive = serialize(confirmationPartOf(drawn(viewWith({ confirmation: live }))))
    const asRenamed = serialize(confirmationPartOf(drawn(viewWith({ confirmation: renamed }))))

    expect(asRenamed).not.toBe(asLive)
  })

  it('GIVEN each place a requirement asks WHEN the screen is drawn THEN the surface stands with both answers on it every time', () => {
    for (const site of ASKING_SITES) {
      const built = drawn(asking(site.question, site.items))
      const part = confirmationPartOf(built)

      expect(shownText(part), site.by).toContain(sentenceFor(site.question))
      expect(answerKeysIn(part), site.by).toEqual(ANSWER_KEYS)
    }
  })

  it('GIVEN nothing was raised WHEN the screen is drawn THEN no such surface stands at all (NT-7: only where a requirement asks)', () => {
    // ⚠️ DI-5 of table T-227 turns on this: FR-060's path may NOT ask (MUST)
    // -- a surface that stood whenever something was written would
    // break that row without anyone raising a question.
    const built = drawn(viewWith({ confirmation: null }))

    expect(byRole(built.root(), CONFIRMATION)).toHaveLength(0)
    expect(answerKeysIn(built.root())).toEqual([])
  })
})

// ===========================================================================
// 3. NT-7's second MUST -- where something goes, its NAME is given.
// ===========================================================================

describe('table T-037 NT-7 (MUST) -- what would go is named, one by one', () => {
  const NAMES = ['foundation work', 'steel delivery', 'first coat of paint'] as const

  it('GIVEN three things would go WHEN the question is drawn THEN each name stands as its own element', () => {
    // ⭐ "given by name" is a list, not a sentence. FR-032 turns the same duty
    // into a
    // MUST for the row case and forbids a count in its place (MUST NOT).
    const built = drawn(asking(questionRow(1), NAMES.map((name) => named(name))))
    const part = confirmationPartOf(built)

    for (const name of NAMES) {
      expect(
        nodesReadingExactly(part, name).length,
        `"${name}" has an element of its own`,
      ).toBeGreaterThanOrEqual(1)
    }
  })

  it('⛔ GIVEN a surface that ran the same three names together into ONE string WHEN it is read the same way THEN not one of them answers -- so the case above is not a green that proves nothing (04-verification §2)', () => {
    // ⚠️ A hand-built tree, not the unit's: it exists only to show that the
    // reading above can FAIL, and that it fails on exactly the shape NT-7 bars
    // -- the names run together instead of being given one by one.
    const joined = new FakeElement('div', stage(new Map()).world)
    joined.setAttribute('data-role', CONFIRMATION)
    joined.textContent = NAMES.join(', ')

    for (const name of NAMES) {
      expect(nodesReadingExactly(joined, name), `"${name}" is not on its own`).toHaveLength(0)
    }
    // ⭐ And every name really is THERE: what the reading catches is "run into
    // one sentence", not "never written at all".
    for (const name of NAMES) {
      expect(shownText(joined)).toContain(name)
    }
  })

  it('GIVEN three things would go WHEN the question is drawn THEN no name is missing from the surface', () => {
    const built = drawn(asking(questionRow(1), NAMES.map((name) => named(name))))
    const text = shownText(confirmationPartOf(built))

    for (const name of NAMES) {
      expect(text, `"${name}" reached the screen`).toContain(name)
    }
  })

  it("GIVEN three things would go WHEN the question is drawn THEN a count does not stand in for them (NT-3's count sits beside the names, never instead of them)", () => {
    // ⛔ The count is allowed BESIDE the names and never instead of them, so the
    // case that matters is that the names survive a surface that also counts.
    const built = drawn(asking(questionRow(3), NAMES.map((name) => named(name))))
    const part = confirmationPartOf(built)

    const eachHasItsOwn = NAMES.every((name) => nodesReadingExactly(part, name).length > 0)
    expect(eachHasItsOwn, 'a count may not stand in for the names').toBe(true)
  })

  it('GIVEN twelve things would go WHEN the question is drawn THEN every one of them reaches the surface (there is no cap)', () => {
    const many = Array.from({ length: 12 }, (_unused, index) => named(`task number ${index}`))

    const built = drawn(asking(questionRow(4), many))
    const part = confirmationPartOf(built)

    for (const item of many) {
      const name = item.name ?? ''
      expect(
        nodesReadingExactly(part, name).length,
        `"${name}" reached the screen`,
      ).toBeGreaterThanOrEqual(1)
    }
  })

  it('GIVEN a thing that goes is drawn on ANOTHER row WHEN the question is drawn THEN the flag reaches the drawn surface, on the item it belongs to', () => {
    // ⭐ WHAT THIS CASE GUARDS: the flag survives the whole way to the drawn
    // surface, ON the item that carries it -- which is the half that has to be
    // in place before any mark can be drawn, and the half that would rot
    // silently while the mark itself was still waiting on a word.
    // ⚠️ WHAT IT NO LONGER SAYS. Its title used to end by calling FR-032's MUST
    // unmet, on the ground that the dictionary held no entry a mark on
    // an item could be read from (PD-160). ⛔ THAT GROUND IS GONE: the
    // manuscript has since grown the section that answers for it, and the case
    // below reads the word out of that section and finds it on the drawn
    // surface. ⛔ NOTHING IS INVENTED HERE EITHER WAY -- the word is READ, and
    // FR-038's MUST NOT still bars a bench from minting one.
    const question = questionRow(1)
    const here = 'foundation work'
    const elsewhere = 'steel delivery'

    // 1. The flag reaches the surface at all: the same question, drawn twice.
    const unmarked = serialize(confirmationPartOf(drawn(asking(question, [named(elsewhere, false)]))))
    const marked = serialize(confirmationPartOf(drawn(asking(question, [named(elsewhere, true)]))))
    expect(marked, 'FR-032: the flag reached the drawn surface').not.toBe(unmarked)

    // 2. And it reaches the ITEM it belongs to, not the surface as a whole: two
    // items, the flag moved from one to the other. ⚠️ A surface that answered
    // the flag once, over the list, comes out identical both ways -- and could
    // never grow into 「その `Task` に示す」.
    const onTheFirst = serialize(
      confirmationPartOf(drawn(asking(question, [named(here, true), named(elsewhere, false)]))),
    )
    const onTheSecond = serialize(
      confirmationPartOf(drawn(asking(question, [named(here, false), named(elsewhere, true)]))),
    )
    expect(onTheSecond, 'FR-032: the flag belongs to the item, not to the list').not.toBe(
      onTheFirst,
    )
  })

  it('GIVEN a thing that goes is drawn on ANOTHER row WHEN the question is drawn THEN the WORD the dictionary holds for that mark is on the surface (FR-032 MUST)', () => {
    // FR-032 (MUST): a `Task` that goes with the row but is DRAWN on another
    // one is shown as such, and the requirement gives its reason -- that one is
    // not visible on the row being deleted. So the mark is owed to the READER,
    // and the flag reaching the markup is
    // not yet the duty met. ⭐ CR-218 settles the medium as a WORD (RC-13 of
    // table T-026 keeps a new SHAPE the user's own ruling), and FR-038 (MUST)
    // puts that word in the one dictionary -- which is why it is READ here and
    // not written.
    // ⛔ AND IT IS OWED ONLY WHERE THE FLAG IS: a surface that printed the word
    // over an item drawn on the row being deleted would be marking what needs no
    // mark, so the unmarked twin is asked for too.
    const question = questionRow(1)

    const marked = shownText(
      confirmationPartOf(drawn(asking(question, [named('steel delivery', true)]))),
    )
    const unmarked = shownText(
      confirmationPartOf(drawn(asking(question, [named('steel delivery', false)]))),
    )

    expect(marked, 'FR-032 (MUST): the mark is a word, and it reached the reader').toContain(
      SHOWN_ON_ANOTHER_ROW_MARK,
    )
    expect(unmarked, 'FR-032: nothing is marked where the flag is not set').not.toContain(
      SHOWN_ON_ANOTHER_ROW_MARK,
    )
  })

  it('⭐ GIVEN forty things would go WHEN the question is drawn THEN BOTH answers are still there, still live, and still reachable (NT-7 MUST)', () => {
    // ⭐ THE TWO MUSTs OF NT-7 READ TOGETHER, which neither case above does on
    // its own: 「何が起きるかを示したうえで、続けるか取りやめるかを選ばせること
    // (MUST)」 and 「消えるもの・解かれるものがあるときは、その名前を挙げること
    // (MUST)」. The choosing case above is drawn with NO names, and the
    // twelve-name case asks only that the names arrive -- so a surface that let
    // a long list crowd the two answers out, disable them, or stop answering for
    // them would pass both and still leave the person unable to answer.
    // ⛔ CD-2 of table T-050 makes such a list ordinary, not extreme: deleting a
    // row takes 「その行に載っているすべての `Task`」 and every descendant row
    // with it.
    const many = Array.from({ length: 40 }, (_unused, index) => named(`task number ${index}`))

    const built = drawn(asking(questionRow(3), many))
    const part = confirmationPartOf(built)

    expect(answerKeysIn(part), 'both answers stand, in the dictionary order').toEqual(ANSWER_KEYS)

    ANSWER_KEYS.forEach((answer, index) => {
      const node = answerNodeFor(part, answer)
      expect(isShown(node), `${answer} is on the screen beside forty names`).toBe(true)
      expect(node.disabled, `${answer} may not be disabled`).toBe(false)
      expect(node.hasAttribute('disabled'), `${answer} may not be disabled`).toBe(false)
      expect(node.getAttribute('aria-disabled'), `${answer} may not be disabled`).not.toBe('true')
      expect(
        ask(built, midOfAnswer(index))?.confirmationAnswer,
        `${answer} can still be chosen`,
      ).toBe(answer)
    })
  })

  it('⭐ GIVEN forty things would go WHEN the question is drawn THEN every name is there WHOLE -- the list is not cut short and no name is cut (FR-032 MUST NOT)', () => {
    // FR-032 (MUST NOT): 「件数だけを示してはならない」, and NT-7 (MUST): 「その
    // 名前を挙げること」. ⛔ A list that stopped at some number, or that showed a
    // shortened name, would be showing a count of the rest by another road.
    // ⚠️ The names below are deliberately long enough that a surface which cut
    // them would be caught: each is read back as the WHOLE string.
    const many = Array.from({ length: 40 }, (_unused, index) =>
      named(`foundation work on the north elevation, phase ${index}`),
    )

    const part = confirmationPartOf(drawn(asking(questionRow(3), many)))

    for (const item of many) {
      const name = item.name ?? ''
      expect(
        nodesReadingExactly(part, name).length,
        `"${name}" is on the screen whole`,
      ).toBeGreaterThanOrEqual(1)
    }
  })

  it('GIVEN a question that takes nothing with it WHEN it is drawn THEN it still stands with both answers (table T-227 DI-4)', () => {
    // ⚠️ DI-4 owes no names at all. An empty list is a
    // real answer, so dropping the surface for having no names would silence the
    // one MUST of that table.
    const question = questionRow(5)

    const built = drawn(asking(question, []))
    const part = confirmationPartOf(built)

    expect(shownText(part)).toContain(sentenceFor(question))
    expect(answerKeysIn(part)).toEqual(ANSWER_KEYS)
  })
})

// ===========================================================================
// 4. table T-023a (MUST) -- the decision order is the drawing area's alone.
// ===========================================================================

describe("table T-023a (MUST) -- a press on the confirmation is not a marquee on the schedule", () => {
  it('GIVEN the confirmation stands over the schedule WHEN a point on it but on no entry is pressed THEN the surface is named and the entry is none', () => {
    // ⛔ This is what stops PD-5. table T-023a applies its decision order to the
    // schedule's drawing area ALONE (MUST), and `ScreenRegions` holds no
    // rectangle for this surface -- so "on the surface, off every entry" has to
    // be an answer,
    // or the press falls through and drags a marquee across the schedule.
    const built = drawn(asking(questionRow(0)))

    expect(ask(built, AT.surfaceOnly)).toEqual({
      part: CONFIRMATION,
      entry: null,
      format: null,
      // ⚠️ The confirmation stands OVER the schedule and against no row and no
      // person, which is what `ScreenPart` states for both keys: neither stands
      // in for "the document holds none".
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('GIVEN the confirmation stands WHEN the bare strip between the two answers is pressed THEN the surface is still named', () => {
    const built = drawn(asking(questionRow(0)))

    expect(ask(built, AT.betweenTheAnswers)).toEqual({
      part: CONFIRMATION,
      entry: null,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('GIVEN the confirmation stands WHEN a point where the schedule is exposed is pressed THEN nothing is on it and PD-5 may run', () => {
    const built = drawn(asking(questionRow(0)))

    expect(ask(built, AT.scheduleExposed)).toBeNull()
  })

  it('GIVEN no question was raised WHEN the place the surface would have stood is pressed THEN nothing is on it', () => {
    const built = drawn(viewWith({ confirmation: null }))

    expect(ask(built, AT.surfaceOnly)).toBeNull()
  })
})

// ===========================================================================
// 5. table T-065 IF-9 -- the point names the surface and the answer that was pressed.
// ===========================================================================

describe('table T-065 IF-9 -- which UI part and which answer the point is on', () => {
  it('GIVEN both answers are drawn WHEN each is pressed THEN the part is the settled name of U-55 and the answer is that key of the dictionary', () => {
    const built = drawn(asking(questionRow(1)))

    ANSWER_KEYS.forEach((answer, index) => {
      expect(ask(built, midOfAnswer(index)), answer).toEqual({
        part: CONFIRMATION,
        // ⛔ NT-7 (MUST NOT) refuses these two a row of table T-109, so the
        // member that carries one is empty and the answer travels on its own.
        entry: null,
        format: null,
        // ⛔ The two answers are the question's own and are keyed by nothing
        // else: what the telling carries is already in the description, so
        // neither key is the way this press is turned into a command.
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
        confirmationAnswer: answer,
      })
    })
  })

  it('GIVEN both answers are drawn WHEN each is pressed THEN neither answers with the other key', () => {
    // ⭐ NT-7 gives the surface TWO answers and not one answer in two states, so
    // a shell hanging "proceed" and "cancel" on one entrance has nothing to
    // tell them apart by.
    const built = drawn(asking(questionRow(1)))

    const answered = ANSWER_KEYS.map(
      (_unused, index) => ask(built, midOfAnswer(index))?.confirmationAnswer ?? null,
    )

    expect(answered).toEqual(ANSWER_KEYS)
    expect(new Set(answered).size).toBe(ANSWER_KEYS.length)
  })

  it('GIVEN both answers are drawn WHEN what was answered is held against the tree THEN the unit answers only what it itself drew (the MUST under table T-065)', () => {
    const built = drawn(asking(questionRow(1)))
    const part = confirmationPartOf(built)

    const answered = ANSWER_KEYS.map(
      (_unused, index) => ask(built, midOfAnswer(index))?.confirmationAnswer ?? null,
    )

    expect(answered).toEqual(answerKeysIn(part))
  })

  it('GIVEN a point on an entry edge WHEN the unit is asked what is on it THEN it hands that very point to the host and measures no box of its own', () => {
    // ⛔ WHY THESE TWO CASES NO LONGER SAY "R3.4". They used to press an entry's
    // left/top edge and demand the entry, and its right/bottom edge and demand
    // none -- R3.4's half-open interval. ⚠️ THAT MEASURED THIS FILE, NOT THE
    // UNIT. R3.4 binds whoever OWNS the rectangle: `rectHoldsPoint` of
    // src/entity/layout-engine/screen-regions/ owns the schedule's, and the
    // BROWSER owns what is laid out on a page. This unit owns none -- the MUST
    // under table T-065 makes the side that DREW an entry answer where a point
    // is, and the way it answers is to ask the host which node the point landed
    // on and read the row off what it itself drew there. So the half-open edge
    // was `holdsPoint` in this file, the fake browser's own arithmetic: changing
    // THAT turned the old cases red, and changing the unit did not.
    // ⭐ What IS this unit's, and is asserted here: the point reaches the host
    // exactly as it was given, and nothing on this path measures a box -- which
    // is what leaves the edge to the party R3.4 actually binds.
    const built = drawn(asking(questionRow(1)))
    const box = ANSWER_BOXES[0]
    if (box === undefined) throw new Error('this file placed no answer')

    for (const point of edgesOf(box)) {
      const askedBefore = built.world.pointQueries.length
      const measuredBefore = built.world.measured.length

      ask(built, point)

      expect(
        built.world.pointQueries.slice(askedBefore),
        `${point.x},${point.y} reached the host as it stands`,
      ).toContainEqual({ member: expect.any(String), x: point.x, y: point.y })
      expect(
        built.world.measured.length - measuredBefore,
        'the edge is the host to decide: no box of its own is measured',
      ).toBe(0)
    }
  })

  it('GIVEN the host has landed a point on a node WHEN the unit answers THEN the answer is the entry that node belongs to, neither widened nor narrowed (the MUST under table T-065)', () => {
    // ⭐ THE EXPECTATION IS READ BACK OFF THE HOST, never computed from the boxes
    // above. Wherever the fake browser puts a point -- an edge, a middle, the
    // bare strip between the two answers -- the unit owes the row it drew THERE,
    // and none where it drew no entry. ⛔ So changing this file's own arithmetic
    // moves the expectation with the answer and proves nothing either way, while
    // a unit that walked up to the wrong node, that widened a bare strip into an
    // entry, or that hit-tested with a rectangle of its own goes red.
    const built = drawn(asking(questionRow(1)))
    const box = ANSWER_BOXES[0]
    if (box === undefined) throw new Error('this file placed no answer')

    const points = [
      ...ANSWER_KEYS.map((_unused, index) => midOfAnswer(index)),
      ...edgesOf(box),
      AT.surfaceOnly,
      AT.betweenTheAnswers,
    ]

    for (const point of points) {
      const landedOn = hostLanding(built, point)
      const where = `${point.x},${point.y}`
      expect(landedOn, `${where}: the host landed on nothing at all`).not.toBeNull()
      const inside = confirmationPartOf(built).contains(landedOn as FakeElement)
      const pressed = (landedOn as FakeElement).closest('[data-confirmation-answer]')

      const answer = ask(built, point)

      expect(answer?.confirmationAnswer ?? null, where).toBe(
        pressed?.getAttribute('data-confirmation-answer') ?? null,
      )
      expect(answer?.part ?? null, where).toBe(inside ? CONFIRMATION : null)
    }
  })

  it('GIVEN the answer is read WHEN it is inspected THEN it carries every member `ScreenPart` declares and nothing else', () => {
    const built = drawn(asking(questionRow(1)))

    const answer = ask(built, midOfAnswer(0))

    expect(answer).not.toBeNull()
    // ⛔ THE ROSTER IS WRITTEN DOWN AND NOT DERIVED. `ScreenPart` is a type and
    // leaves nothing behind at run time, so a list kept here is the only thing
    // that can notice a member being DROPPED -- reading the keys off the very
    // answer being checked would agree with any answer at all. ⚠️ Each name is
    // one the seam declares in src/adapter/screen-renderer/screen-surface.ts.
    expect(Object.keys(answer ?? {}).sort()).toEqual([
      'confirmationAnswer',
      'dividerPanel',
      'entry',
      'format',
      'noticeDismissKey',
      'part',
      'resourceUid',
      'rowGroupId',
    ])
  })

  it('GIVEN the question is taken away WHEN the same point is pressed again THEN the entry stops answering (the answer comes from what is drawn NOW)', () => {
    const built = wire()
    surfaceOf(built).showScreenView(asking(questionRow(0)))
    expect(ask(built, midOfAnswer(0))?.part).toBe(CONFIRMATION)

    surfaceOf(built).showScreenView(viewWith({ confirmation: null }))

    expect(ask(built, midOfAnswer(0))).toBeNull()
  })

  it('GIVEN nothing has been drawn yet WHEN a point on the surface is asked about THEN nothing is on it (BO-1 of table T-077)', () => {
    const built = wire()

    expect(ask(built, midOfAnswer(0))).toBeNull()
  })

  it('GIVEN a point is asked about WHEN the tree is compared before and after THEN nothing was written (reading a point is not a redraw)', () => {
    const built = drawn(asking(questionRow(1)))
    const before = serialize(built.root())

    ask(built, midOfAnswer(0))
    ask(built, AT.surfaceOnly)

    expect(serialize(built.root())).toBe(before)
    expect(built.world.markupWrites, 'FR-023: no markup was written').toEqual([])
  })
})
