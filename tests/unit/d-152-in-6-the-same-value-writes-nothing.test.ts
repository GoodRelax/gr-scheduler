// Unit tests for the last clause of `IN-6` of 表 T-028: 「⛔ **始めた値と同じ値を
// 書いてはならない（MUST NOT）** —— 同じ値を 2 度書くと取り消しが 2 段になる
// （`FR-031` と 表 T-027 の `UN-3`）」.
//
// Unit under test: UF-71 `dom-screen-surface.ts` (CP-38 of 表 T-062), the side
// of `IF-9` that HAS a field to settle -- 「まだ確定していない文字入力があるかを
// 答え」 and 「プロパティパネルの欄で確定した値を…返し」 are both its answers, and
// this file asks for both because the ledger row says a naive fix to the first
// breaks the second.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE LEDGER ROW IT STANDS IN FOR
// ---------------------------------------------------------------------------
//
// `docs/development-records/defects.md` D-152: 「⛔ **同じ `Enter` を繰り返すと、
// 誰も編集していない取り消しの段が積まれる**」, 期待値 「値が変わっていなければ
// 何も書かない」. Its 詳細状況 column names the rule verbatim -- 「**表 T-028 の
// `IN-6` が逐語で「始めた値と同じ値を書いてはならない」と定めている。**」 -- and
// its 補足 column names the trap this file exists to keep shut:
//
//   「⛔⛔ **前の体の見立て「`hasUnsettledTextEntry()` を偽にすればよい」は誤りで
//     あった** —— **同じ答えを 表 T-028 の `IN-5a` が単文字キーの門にも使っており、
//     偽にすると名称の欄で `p` と打っただけでパレットが開く。**」
//
// ⭐ So both sides are pinned here: the unchanged value raises nothing, AND the
// answer `IN-5a`'s gate is built on still stands while the caret is in a field.
// ⛔ A case that only pinned the first would go green on exactly the fix the
// ledger says is wrong.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES ANSWER TO (rule 03 §3: name the row, do not copy it)
// ---------------------------------------------------------------------------
//
//   表 T-028 `IN-6` -- the MUST NOT quoted above, and the sentence that makes it
//            reach `Enter` and not only a pointer press: 「⚠️ **`SK-19` の `Enter`
//            と同じ確定である** —— 引き金が 3 つ目になるだけで、確定の意味は 1 つ
//            である」
//   表 T-028 `IN-5a` 「**単文字キーと `Delete` / `Backspace` は、文字入力を確定
//            していない間は効かないこと（MUST NOT）**」, whose gate is the answer
//            asserted in section 3
//   表 T-036 `SK-19` 「その場の編集を確定する（…プロパティの入力）」, `Enter`
//   表 T-065 `IF-9` -- the two answers these cases read: the settled value with
//            the row it names, and whether text stands unsettled
//   `FR-031` / 表 T-027 `UN-3` -- why a second write of the same value is a
//            defect and not a waste: it costs a 段, and `Ctrl+Z` then takes two
//            presses to undo one edit
//   表 T-016 `PR-1` `name` and `PR-2` `notes` -- the two rows that are settled by
//            typing, which is where D-152 was measured
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WAS READ OF `src/`: NOT ONE FILE. The unit is reached through
// tests/fixtures/fake-browser.ts, which other cases already drive it with.
// ---------------------------------------------------------------------------
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, each searched for before being given up
//
//   1. THAT A POINTER PRESS OUTSIDE THE FIELD SETTLES IT. That is `IN-6`'s FIRST
//      half, and the press it speaks of lands on the schedule, which `IF-1` puts
//      up as its own surface beside this unit's tree -- so the listener is on the
//      host and tests/unit/uf-71.test.ts already records where it sits. This file
//      drives the trigger `SK-19` names, which `IN-6` says is the same settling.
//   2. HOW MANY 段 THE HISTORY ENDS UP WITH. That is UF-8 / UF-9's answer and
//      tests/unit/uf-8-9-history-depth.test.ts owns it. What this unit owes is
//      to raise nothing; what the loop then does with nothing is not its rule.
//   3. ⚠️ A SECOND SETTLING RAISED BY THE HOST'S OWN `change` ON THE WAY OUT.
//      Measured while writing this file: with the panel still describing the OLD
//      text, a `change` after the settling `Enter` hands the same value back a
//      second time. ⛔ It is NOT asserted either way, because no row says when the
//      description a field compares itself against is refreshed -- in the running
//      application the frame that `FT-1` raises redraws the panel first. Reported
//      rather than settled here.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  AppHeaderItems,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'
import {
  descendants,
  oneByRole,
  surfaceOf,
  wire,
  type FakeElement,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'

// ---------------------------------------------------------------------------
// The manuscript, read at read time rather than copied (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const T_016: SpecTable = specTable('T-016')
const T_028: SpecTable = specTable('T-028')
const T_036: SpecTable = specTable('T-036')
const T_103: SpecTable = specTable('T-103')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/** Everything one row writes, as one string. */
const wholeRow = (table: SpecTable, id: string): string => rowOf(table, id).cells.join(' ')

/** ⛔ THE GROUND OF THIS FILE, read rather than typed. */
const THE_SAME_VALUE_MUST_NOT = '始めた値と同じ値を書いてはならない（MUST NOT）'

/** `IN-6`'s sentence that makes the MUST NOT reach `SK-19`'s `Enter`. */
const THE_SAME_SETTLING = '`SK-19` の `Enter` と同じ確定である'

/** `IN-5a`'s own MUST NOT -- the gate the ledger says a naive fix opens. */
const THE_SINGLE_KEY_MUST_NOT =
  '単文字キーと `Delete` / `Backspace` は、文字入力を確定していない間は効かないこと（MUST NOT）'

/** The `GRS JSON` column 表 T-016 gives one row. */
const columnOf = (id: string): string => bare(rowOf(T_016, id).by['列（`GRS JSON`）'] ?? '')

/** The 入力の型 表 T-016 gives one row. */
const inputFormOf = (id: string): string => bare(rowOf(T_016, id).by['入力の型'] ?? '')

/** The keystroke 表 T-036 assigns one row, read out of its 割当 column. */
function keyOf(id: string): KeyInput {
  const parts = (bare(rowOf(T_036, id).by['割当'] ?? '').split('/')[0] ?? '')
    .replace(/＋/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
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

const SK_19 = keyOf('SK-19')

function settledName(id: string): string {
  const COLUMN = '確定名（英）'
  if (!T_103.headings.includes(COLUMN)) {
    throw new Error(`table T-103 no longer has a ${COLUMN} column`)
  }
  return bare(rowOf(T_103, id).by[COLUMN] ?? '')
}

/** `U-25` -- the `Properties Panel`. */
const U_25 = settledName('U-25')

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

// ---------------------------------------------------------------------------
// The description these cases draw
// ---------------------------------------------------------------------------

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
} as unknown as ScreenView

const controlOf = (
  patch: Partial<PropertyControl> & Pick<PropertyControl, 'key' | 'kind'>,
): PropertyControl => ({
  text: '',
  choices: null,
  min: null,
  max: null,
  widthInFontSizes: 8,
  ...patch,
})

/** The two rows of 表 T-016 that are settled by typing, which is where D-152 was measured. */
const TYPED_ROWS = ['PR-1', 'PR-2'] as const

/** ⭐ THE VALUE THE PERSON STARTED WITH -- what `IN-6`'s MUST NOT is about. */
const STARTED_WITH: Record<string, string> = {
  'PR-1': 'TheValueItStartedWith',
  'PR-2': 'TheNotesItStartedWith',
}

/** A value that is not that one, for the control cases. */
const SOMETHING_ELSE: Record<string, string> = {
  'PR-1': 'SomethingElseEntirely',
  'PR-2': 'OtherNotesEntirely',
}

const TASK_UID = 1

/** The join is 表 T-016's own 入力の型 column, so a row whose form moves reaches here. */
const FORM_OF_KIND: Record<string, string> = { 文字: 'text', 複数行: 'multiline' }

function fieldOf(row: string): PropertyField {
  const form = FORM_OF_KIND[inputFormOf(row)]
  if (form === undefined) {
    throw new Error(`表 T-016 row ${row} no longer states an 入力の型 this file can drive`)
  }
  const text = STARTED_WITH[row] ?? ''
  return {
    row,
    name: columnOf(row),
    text,
    isEditable: true,
    controls: [
      controlOf({
        key: { holder: 'task', uid: TASK_UID, column: columnOf(row) },
        kind: form,
        text,
      } as unknown as PropertyControl),
    ],
  } as unknown as PropertyField
}

const PANEL: PropertiesPanel = {
  showing: 'selection',
  isSubjectGone: false,
  fields: TYPED_ROWS.map(fieldOf),
  commands: [],
} as unknown as PropertiesPanel

const THEME: ScreenTheme = { preference: 'light', hue: 214 }
const HEADER_HEIGHT = { 'App Header': 37 }

function drawnPanel(): Stage {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, propertiesPanel: PANEL })
  return built
}

// ---------------------------------------------------------------------------
// Driving one field
// ---------------------------------------------------------------------------

/**
 * Raise one event on a node and let it bubble, the way a browser would.
 *
 * ⛔ Nothing about the unit is decided here: which listeners exist is the unit's
 * own answer, read out of `world.registrations`; this only walks the chain a
 * real event walks.
 */
function raise(
  built: Stage,
  node: FakeElement,
  type: string,
  extra: Record<string, unknown> = {},
): void {
  const event = {
    type,
    key: '',
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: null,
    defaultPrevented: false,
    preventDefault(): void {
      ;(this as { defaultPrevented: boolean }).defaultPrevented = true
    },
    stopPropagation(): void {},
    ...extra,
  } as unknown as FakeEvent
  let at: FakeElement | null = node
  while (at !== null) {
    for (const one of [...built.world.registrations]) {
      if (one.node === at && one.type === type) {
        ;(event as { currentTarget: FakeElement | null }).currentTarget = at
        one.listener(event)
      }
    }
    at = at.parentNode
  }
}

function controlFor(built: Stage, row: string): FakeElement {
  const panel = oneByRole(built.root(), U_25)
  const found = descendants(panel).filter(
    (one) =>
      (one.tagName === 'INPUT' || one.tagName === 'TEXTAREA') &&
      one.getAttribute('data-field-row') === row,
  )
  if (found.length !== 1) {
    throw new Error(`the panel drew ${found.length} controls for 表 T-016 row ${row}`)
  }
  return found[0] as FakeElement
}

/** A person putting the caret in one field. */
function enterField(built: Stage, row: string): FakeElement {
  const control = controlFor(built, row)
  control.focus()
  raise(built, control, 'focusin')
  return control
}

/** A person typing one value into a field they are already in. */
function type(built: Stage, control: FakeElement, text: string): void {
  control.value = text
  raise(built, control, 'input')
}

/** The key `SK-19` assigns, pressed in the field. */
const pressSettle = (built: Stage, control: FakeElement): void => {
  raise(built, control, 'keydown', { key: SK_19.key })
}

interface Commit {
  readonly row: string
  readonly key: { readonly holder: string; readonly uid: number; readonly column: string }
  readonly text: string
}

const takeCommit = (built: Stage): Commit | null =>
  surfaceOf(built).readFieldCommit() as unknown as Commit | null

const textStandsUnsettled = (built: Stage): boolean => surfaceOf(built).hasUnsettledTextEntry()

// ===========================================================================
// The manuscript still says what these cases read
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ IN-6 still forbids writing the value it started with', () => {
    expect(wholeRow(T_028, 'IN-6')).toContain(THE_SAME_VALUE_MUST_NOT)
  })

  it('⭐ IN-6 still says SK-19’s `Enter` is that same settling', () => {
    // 「⚠️ **`SK-19` の `Enter` と同じ確定である** —— 引き金が 3 つ目になるだけで、
    //   確定の意味は 1 つである」 -- which is what lets a rule written about a
    // pointer press be asked of a key.
    expect(wholeRow(T_028, 'IN-6')).toContain(THE_SAME_SETTLING)
  })

  it('⭐ IN-6 still gives the undo history as its reason', () => {
    // 「同じ値を 2 度書くと取り消しが 2 段になる（`FR-031` と 表 T-027 の `UN-3`）」
    const inSix = wholeRow(T_028, 'IN-6')
    expect(inSix).toContain('取り消しが 2 段になる')
    expect(inSix).toContain('FR-031')
    expect(inSix).toContain('UN-3')
  })

  it('⛔ IN-5a still shuts single-character keys while text stands unsettled', () => {
    expect(wholeRow(T_028, 'IN-5a')).toContain(THE_SINGLE_KEY_MUST_NOT)
    expect(REQUIREMENTS).toContain(THE_SINGLE_KEY_MUST_NOT)
  })

  it('⭐ SK-19 is still `Enter`, and 表 T-016 still gives both rows a typed form', () => {
    expect(SK_19.key).toBe('Enter')
    for (const row of TYPED_ROWS) expect(Object.keys(FORM_OF_KIND)).toContain(inputFormOf(row))
  })
})

// ===========================================================================
// 1. IN-6 (MUST NOT) -- the value it started with is not written
// ===========================================================================

describe('IN-6 (MUST NOT) -- settling an unchanged field raises nothing', () => {
  for (const row of TYPED_ROWS) {
    it(`⛔ ${row}: entering the field and pressing SK-19 without typing raises nothing`, () => {
      // 「⛔ **始めた値と同じ値を書いてはならない（MUST NOT）**」. Nothing was
      // typed, so the value is the one it started with, exactly.
      const built = drawnPanel()
      const control = enterField(built, row)
      pressSettle(built, control)

      expect(takeCommit(built), `${row}: a value nobody changed was handed back`).toBeNull()
    })

    it(`⛔ ${row}: typing the SAME value back in and pressing SK-19 raises nothing`, () => {
      // ⭐ THE HARDER HALF. A unit that only watched whether a keystroke had
      // arrived would pass the case above and fail this one: the person really
      // did type, and the value really is the one they started with.
      const built = drawnPanel()
      const control = enterField(built, row)
      type(built, control, STARTED_WITH[row] ?? '')
      pressSettle(built, control)

      expect(takeCommit(built), `${row}: the same value was written back`).toBeNull()
    })

    it(`⭐ ${row}: a DIFFERENT value is still handed back (the control for both above)`, () => {
      // ⛔ Without this, a unit that never handed anything back at all would pass
      // the two cases above -- which is the state D-130 measured.
      const built = drawnPanel()
      const control = enterField(built, row)
      const wanted = SOMETHING_ELSE[row] ?? ''
      type(built, control, wanted)
      pressSettle(built, control)

      const commit = takeCommit(built)
      expect(commit?.row).toBe(row)
      expect(commit?.text).toBe(wanted)
    })

    it(`⛔ ${row}: pressing SK-19 twice on one change writes once, not twice`, () => {
      // 「同じ値を 2 度書くと取り消しが 2 段になる（`FR-031` と 表 T-027 の `UN-3`）」
      // -- the second press finds the value it now started with, so it raises
      // nothing. ⛔ If it raised the same value again, one `Ctrl+Z` would no
      // longer undo one edit.
      const built = drawnPanel()
      const control = enterField(built, row)
      type(built, control, SOMETHING_ELSE[row] ?? '')
      pressSettle(built, control)
      expect(takeCommit(built)?.text).toBe(SOMETHING_ELSE[row] ?? '')

      pressSettle(built, control)
      expect(takeCommit(built), `${row}: a second SK-19 wrote the same value again`).toBeNull()
    })
  }
})

// ===========================================================================
// 2. IN-5a -- and the gate it is built on is still shut
// ===========================================================================

describe('IN-5a (MUST NOT) -- the unchanged value does not open the single-key gate', () => {
  for (const row of TYPED_ROWS) {
    it(`⛔ ${row}: with the caret in the field and nothing typed, text stands unsettled`, () => {
      // ⭐⭐ THE OTHER SIDE OF D-152, AND THE ONE ITS 補足 COLUMN WARNS ABOUT:
      // 「**同じ答えを 表 T-028 の `IN-5a` が単文字キーの門にも使っており、偽にする
      //   と名称の欄で `p` と打っただけでパレットが開く。**」 So an implementation
      // that made the first section pass by answering 「確定していない文字入力は
      // 無い」 breaks `IN-5a` -- and fails here.
      const built = drawnPanel()
      enterField(built, row)

      expect(textStandsUnsettled(built)).toBe(true)
    })

    it(`⛔ ${row}: it still stands unsettled after the SAME value is typed back`, () => {
      const built = drawnPanel()
      const control = enterField(built, row)
      type(built, control, STARTED_WITH[row] ?? '')

      expect(textStandsUnsettled(built)).toBe(true)
    })

    it(`⭐ ${row}: and the settling SK-19 is what lets go of it`, () => {
      // ⚠️ THE OTHER DIRECTION, so that the two cases above are not passed by a
      // unit that simply always answers 真. `SK-19`'s second stage 「確定していない
      // その場の編集が 1 つも無いときは、プロパティパネルを…出すのをやめること
      // （MUST）」 has nothing to stand on unless the answer can become 偽.
      const built = drawnPanel()
      const control = enterField(built, row)
      expect(textStandsUnsettled(built)).toBe(true)

      pressSettle(built, control)

      expect(textStandsUnsettled(built)).toBe(false)
    })
  }

  it('⭐ nothing stands unsettled before anyone has entered a field', () => {
    expect(textStandsUnsettled(drawnPanel())).toBe(false)
  })
})
