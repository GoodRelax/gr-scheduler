// Unit tests for the two rows of 表 T-016 a person SETTLES BY TYPING -- `PR-1`
// `name` and `PR-2` `notes` -- from the keystroke that settles them to the
// document that changes.
//
// Two units, one road, in the order a person walks it:
//   UF-71 `dom-screen-surface.ts` (CP-38 of 表 T-062) -- the side that HAS a
//         field to type in. What a settled value leaves on is `IF-9`'s
//         `readFieldCommit` (表 T-065).
//   UF-48 `frame-loop.ts` (CP-25) -- the side that reads that answer and writes
//         the document (`WS-1` .. `WS-7` of 表 T-067).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE LEDGER ROW IT STANDS IN FOR
// ---------------------------------------------------------------------------
//
// `docs/development-records/defects.md` D-130: 「⛔⛔ **プロパティパネルで確定した
// 値が、文書に届かない**」, whose 期待値 column is 「`FR-006` が定めるとおり、表
// T-016 の読み取り専用でない項目を編集すると文書が変わる」. The row records what
// was measured on the shipped build -- 「`PR-1` … の値を `Survey phase` から
// `RenamedByProbe` に打ち替えて `Enter`。⇒ **画面の文字は `Survey phase` のまま
// 1 個、`RenamedByProbe` は 0 個。**」 -- and what was at fault: the keydown
// listener's `preventDefault()` took the host's `change` away, so 「`fieldCommit`
// を書く者が `onFieldChange` しか居らず、`readFieldCommit` は永久に `null`」.
// ⭐ The row also measured HOW MANY rows were hurt: 「編集できる 16 行のうち、
// **届いていなかったのは `PR-1` と `PR-2` の 2 行だけ**であり、どちらも「打ち込んで
// `Enter` で確定する」欄である」 -- which is why this file drives exactly those two.
// ⛔ The commit that claimed the fix touched no test file at all.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES ANSWER TO (rule 03 §3: name the row, do not copy it)
// ---------------------------------------------------------------------------
//
//   `FR-006`  「プロパティパネルが選択を出しているとき、`GRS` は、**表 T-016 の
//             項目**をプロパティパネルに出し、**同表が読み取り専用と記した項目を
//             除いて**編集できるようにすること」, and 「**入力の形は同表の「入力の
//             型」の欄に従うこと（MUST）**」
//   表 T-016  `PR-1` `name` 入力の型 文字, 対象 `Task`; `PR-2` `notes` 入力の型
//             複数行, 対象 `Task`. ⭐ Neither is marked 読み取り専用 -- `PR-9` is
//             the row that is, and it is read here to prove the mark exists and
//             that these two do not carry it
//   表 T-036  `SK-19` 「…ほかに何も出ていないときは、**その場の編集を確定する**
//             （名称・担当者名・行名・文書名・**プロパティの入力**）」, assignment
//             `Enter` -- the key these cases press, read out of the 割当 column
//   表 T-065  `IF-9` 「…**プロパティパネルの欄で確定した値を、その欄が名乗る行 ID
//             とともに返し**…」 -- the seam a settled value leaves on, and the
//             reason the row id is asserted beside the text
//   表 T-067  `WS-3` / `WS-6` -- the steps that build the new document and swap
//             the current value, which is what 「文書が変わる」 means here
//   表 T-078  `FT-1` 「人の入力（ポインタとキー）」 -- the trigger the frame that
//             spends the settled value runs on
//   表 T-034  `BT-4`, the bundled template
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WAS READ OF `src/`: NOT ONE FILE. UF-71 is reached through
// tests/fixtures/fake-browser.ts, which tests/unit/fr-101-the-name-stands-above
// -the-time.test.ts already drives this same unit with, and UF-48 through the
// declarations tests/unit/uf-47-48-choosers.test.ts already imports. Every
// expectation comes from a row of docs/spec.
// ---------------------------------------------------------------------------
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, each searched for before being given up
//
//   1. THAT THE HOST'S OWN `change` IS WHAT MUST NOT BE RELIED ON. The ledger
//      names `preventDefault` as the mechanism, but no row of docs/spec rules on
//      which DOM event a settling travels on -- 表 T-065's `IF-9` names the
//      ANSWER and not the road to it. So these cases press the key `SK-19`
//      assigns and ask for the answer; how the unit hears the press is its own.
//   2. THE OTHER FOURTEEN EDITABLE ROWS OF 表 T-016. The ledger measured them
//      as already arriving, and they settle on the key that changes the value
//      rather than on `Enter`. ⛔ `PR-12`'s two colour controls cannot be driven
//      at all without the host's colour chooser, which the ledger records as
//      「壊れているとも動くとも示せていない」.
//   3. THAT PRESSING `Enter` A SECOND TIME PUTS THE PANEL AWAY. That is
//      `SK-19`'s second stage and
//      tests/unit/fr-072-a-moved-selection-does-not-open-the-panel.test.ts owns it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
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
  ScreenPart,
  ScreenSurface,
  ScreenView,
  DisplayLanguage,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  frameLoop,
  type FrameEnvironment,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
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

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// The manuscript, read at read time rather than copied (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const T_016: SpecTable = specTable('T-016')
const T_036: SpecTable = specTable('T-036')
const T_103: SpecTable = specTable('T-103')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** ⛔ THE GROUND OF THIS FILE, read rather than typed. */
const FR_006_STATEMENT =
  '**表 T-016 の項目**をプロパティパネルに出し、**同表が読み取り専用と記した項目を除いて**編集できるようにすること'

/** The `GRS JSON` column 表 T-016 gives one row. ⚠️ Not the name shown on screen. */
const columnOf = (id: string): string => bare(rowOf(T_016, id).by['列（`GRS JSON`）'] ?? '')

/** The 入力の型 表 T-016 gives one row -- what `FR-006` (MUST) makes the control's form. */
const inputFormOf = (id: string): string => bare(rowOf(T_016, id).by['入力の型'] ?? '')

/** Everything one row of 表 T-016 writes, as one string. */
const wholeRowOf = (id: string): string => rowOf(T_016, id).cells.join(' ')

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

/** `SK-19` -- 「その場の編集を確定する」. */
const SK_19 = keyOf('SK-19')

/** The settled name one row of 表 T-103 gives, which reaches the DOM as `data-role`. */
function settledName(id: string): string {
  const COLUMN = '確定名（英）'
  if (!T_103.headings.includes(COLUMN)) {
    throw new Error(`table T-103 no longer has a ${COLUMN} column`)
  }
  return bare(rowOf(T_103, id).by[COLUMN] ?? '')
}

/** `U-25` -- the `Properties Panel`. */
const U_25 = settledName('U-25')

/** The two rows D-130 measured as not arriving, and the only two this file drives. */
const TYPED_ROWS = ['PR-1', 'PR-2'] as const
/** `PR-9` -- the row 表 T-016 DOES mark 読み取り専用, so the mark can be seen to exist. */
const READ_ONLY_ROW = 'PR-9'
const READ_ONLY_MARK = '読み取り専用'

// ---------------------------------------------------------------------------
// The description these cases draw. Copied from
// tests/unit/mk-13-the-name-field-is-armed.test.ts, which drives the same unit.
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

/**
 * ⚠️ `widthInFontSizes` IS THIS FILE'S OWN AND DECIDES NOTHING. `FR-006` has the
 * estimating side work the room out and tests/unit/fr-006-panel-typography.test.ts
 * holds that arithmetic; no case here reads a width.
 */
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

/** What each of the two rows already holds, so a settled value can differ from it. */
const ALREADY_THERE: Record<string, string> = {
  'PR-1': 'NameAlreadyHere',
  'PR-2': 'NotesAlreadyHere',
}

/** What the case types in. ⚠️ Different per row, so no case can pass on the other's. */
const TYPED_IN: Record<string, string> = {
  'PR-1': 'NameSettledByTheCase',
  'PR-2': 'NotesSettledByTheCase',
}

const TASK_UID = 1

/**
 * The form `FR-006` (MUST) takes from 表 T-016's 入力の型 column, as the
 * description spells it.
 *
 * ⚠️ THE JOIN IS THE TABLE'S OWN COLUMN, so a row whose 入力の型 moves reaches
 * this file instead of going stale. Only the two rows this file drives are
 * mapped; a third would have to say which form it takes.
 */
const FORM_OF_KIND: Record<string, string> = { 文字: 'text', 複数行: 'multiline' }

function fieldOf(row: string): PropertyField {
  const form = FORM_OF_KIND[inputFormOf(row)]
  if (form === undefined) {
    throw new Error(`表 T-016 row ${row} no longer states an 入力の型 this file can drive`)
  }
  const text = ALREADY_THERE[row] ?? ''
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

const panelWith = (rows: readonly string[]): PropertiesPanel =>
  ({
    showing: 'selection',
    isSubjectGone: false,
    fields: rows.map(fieldOf),
    commands: [],
  }) as unknown as PropertiesPanel

const THEME: ScreenTheme = { preference: 'light', hue: 214 }
const HEADER_HEIGHT = { 'App Header': 37 }

// ---------------------------------------------------------------------------
// Typing into a field, and pressing the key SK-19 assigns
// ---------------------------------------------------------------------------

/**
 * Raise one event on a node and let it bubble, the way a browser would.
 *
 * ⚠️ tests/fixtures/fake-browser.ts records every listener the unit registers but
 * raises none, because no case before this one needed to. ⛔ Nothing about the
 * unit is decided here: which listeners exist is the unit's own answer, read out
 * of `world.registrations`, and this only walks the chain a real event walks.
 */
function raise(
  built: Stage,
  node: FakeElement,
  type: string,
  extra: Record<string, unknown> = {},
): FakeEvent {
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
  return event
}

/** The control the unit drew for one row of 表 T-016, found by the row it names. */
function controlFor(built: Stage, row: string): FakeElement {
  const panel = oneByRole(built.root(), U_25)
  const found = descendants(panel).filter(
    (one) =>
      (one.tagName === 'INPUT' || one.tagName === 'TEXTAREA') &&
      one.getAttribute('data-field-row') === row,
  )
  if (found.length !== 1) {
    throw new Error(
      `FR-006 (MUST) makes 表 T-016 row ${row} editable, and the panel drew ${found.length} controls for it`,
    )
  }
  return found[0] as FakeElement
}

/**
 * A person putting the caret in one field, typing, and pressing the key
 * `SK-19` assigns.
 *
 * ⚠️ `focusin` then `input` then the keystroke IS what a browser raises for that;
 * the case raises them rather than asserting that the unit listens to any
 * particular one of the three.
 */
function typeAndSettle(built: Stage, row: string, text: string): void {
  const control = controlFor(built, row)
  control.focus()
  raise(built, control, 'focusin')
  control.value = text
  raise(built, control, 'input')
  raise(built, control, 'keydown', { key: SK_19.key })
}

function drawnPanel(rows: readonly string[] = TYPED_ROWS): Stage {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, propertiesPanel: panelWith(rows) })
  return built
}

// ---------------------------------------------------------------------------
// The loop, for the far end of the same road
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

const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Loop {
  /** Press one key at the loop, and run whatever frames it asks for. */
  press(key: KeyInput): void
  /** Hand the surface one settled value, to be taken once. */
  hold(commit: unknown): void
  /** The `Schedule Canvas` as the loop last drew it, through `IF-1`. */
  drawn(): string
}

/**
 * UF-48, driven with a surface that answers one settled value and then nothing.
 *
 * ⭐ WHY `showSvg` IS WHAT IS READ. 表 T-065's `IF-1` puts the schedule up as its
 * own surface, so the drawn `Task` is where a changed `name` becomes visible;
 * `ScreenView` carries the panel and the row titles, neither of which is the
 * bar's label. ⛔ It is the document that is being asked about, and the drawing
 * is the only witness this seam offers.
 */
function loopWith(document: Document): Loop {
  const svgs: string[] = []
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  let held: unknown = null

  const surface: ScreenSurface = {
    showScreenView: () => {},
    readDialogueInput: () => null,
    readFieldCommit: () => {
      const one = held
      held = null
      return one as never
    },
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => null as ScreenPart | null,
  }
  const wiring: ScreenWiring = { surface, language: 'ja' as DisplayLanguage }
  const loop = frameLoop(
    { showSvg: (svg: string) => svgs.push(svg) } as any,
    document,
    SCREEN,
    wiring,
  )
  const runFrames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
    expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
  }
  runFrames()
  return {
    press: (key) => {
      loop.receiveInput(key)
      runFrames()
    },
    hold: (commit) => {
      held = commit
    },
    drawn: () => svgs[svgs.length - 1] ?? '',
  }
}

// ===========================================================================
// The manuscript still says what these cases read
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-006 still makes every row of 表 T-016 editable but the read-only ones', () => {
    expect(REQUIREMENTS).toContain(FR_006_STATEMENT)
  })

  it('⭐ 表 T-016 still gives PR-1 and PR-2 a typed form, and marks neither read-only', () => {
    // 「PR-1 | `name` | 文字 | `Task`」 and 「PR-2 | `notes` | 複数行 | `Task`」.
    expect(columnOf('PR-1')).toBe('name')
    expect(columnOf('PR-2')).toBe('notes')
    expect(Object.keys(FORM_OF_KIND)).toContain(inputFormOf('PR-1'))
    expect(Object.keys(FORM_OF_KIND)).toContain(inputFormOf('PR-2'))
    // ⛔ THE MARK EXISTS, so 「読み取り専用と記した項目を除いて」 has something to
    // exclude -- and neither of these two carries it.
    expect(wholeRowOf(READ_ONLY_ROW)).toContain(READ_ONLY_MARK)
    for (const row of TYPED_ROWS) expect(wholeRowOf(row)).not.toContain(READ_ONLY_MARK)
  })

  it('⭐ 表 T-036 still has SK-19 settle the panel’s typing, on `Enter`', () => {
    const sk19 = rowOf(T_036, 'SK-19').cells.join(' ')
    expect(sk19).toContain('その場の編集を確定する')
    expect(sk19).toContain('プロパティの入力')
    expect(SK_19.key).toBe('Enter')
    expect(SK_19.modifiers).toEqual({ ctrl: false, shift: false, alt: false, meta: false })
  })
})

// ===========================================================================
// 1. UF-71 -- typing into the field and settling it
// ===========================================================================

describe('FR-006 / SK-19 -- what is typed into PR-1 and PR-2 leaves by IF-9', () => {
  it('⭐ draws one editable control for each of the two rows (FR-006, MUST)', () => {
    const built = drawnPanel()
    for (const row of TYPED_ROWS) {
      const control = controlFor(built, row)
      expect(control.getAttribute('data-field-row')).toBe(row)
      expect(control.hasAttribute('disabled')).toBe(false)
    }
  })

  for (const row of TYPED_ROWS) {
    it(`⛔ ${row}: typing and pressing SK-19 hands the value back with its row`, () => {
      // ⭐⭐ THE CASE D-130 ASKS FOR, at the end of the road it broke on. 表 T-065's
      // `IF-9`: 「**プロパティパネルの欄で確定した値を、その欄が名乗る行 ID とともに
      // 返し**」. ⛔ 「`readFieldCommit` は永久に `null`」 is exactly this answer
      // never arriving.
      const built = drawnPanel()
      const typed = TYPED_IN[row] ?? ''
      typeAndSettle(built, row, typed)

      const commit = surfaceOf(built).readFieldCommit() as unknown as {
        row: string
        key: { holder: string; uid: number; column: string }
        text: string
      } | null

      expect(commit, `${row}: nothing was handed back for a settled field`).not.toBeNull()
      expect(commit?.row).toBe(row)
      expect(commit?.text).toBe(typed)
      // ⭐ The key names the column 表 T-016 gives the row, which is what makes
      // the answer point at a place in the document rather than at a widget.
      expect(commit?.key.column).toBe(columnOf(row))
      expect(commit?.key.uid).toBe(TASK_UID)
    })
  }

  it('⛔ the two rows do not answer for each other', () => {
    // ⚠️ Both fields stand at once, so a unit that handed back the LAST field it
    // drew, or the first, would pass a single-row case and fail here.
    const first = drawnPanel()
    typeAndSettle(first, 'PR-2', TYPED_IN['PR-2'] ?? '')
    const forNotes = surfaceOf(first).readFieldCommit() as unknown as { row: string } | null
    expect(forNotes?.row).toBe('PR-2')

    const second = drawnPanel()
    typeAndSettle(second, 'PR-1', TYPED_IN['PR-1'] ?? '')
    const forName = surfaceOf(second).readFieldCommit() as unknown as { row: string } | null
    expect(forName?.row).toBe('PR-1')
  })
})

// ===========================================================================
// 2. UF-48 -- and the document changes
// ===========================================================================

describe('FR-006 / 表 T-067 -- a settled PR-1 changes the document', () => {
  it('⛔ the drawn schedule stops carrying the old name and carries the new one', () => {
    // 「表 T-016 の読み取り専用でない項目を編集すると文書が変わる」 -- the ledger's
    // own 期待値 column. ⭐ `PR-1` is 「バーに描くラベル」 by 表 T-016's own 備考
    // column, so the drawn schedule is where the change shows.
    const document = templateDocument()
    const uid = document.schedule.tasks[0]?.uid ?? 0
    const wasNamed = document.schedule.tasks[0]?.name ?? ''
    expect(wasNamed.length, 'the bundled template gives its first Task a name').toBeGreaterThan(0)

    const one = loopWith(document)
    expect(one.drawn(), 'the old name is drawn before the edit').toContain(wasNamed)

    const settled = 'NameSettledThroughTheLoop'
    one.hold({ row: 'PR-1', key: { holder: 'task', uid, column: columnOf('PR-1') }, text: settled })
    one.press(SK_19)

    expect(one.drawn()).toContain(settled)
    expect(one.drawn()).not.toContain(wasNamed)
  })

  it('⛔ a frame with nothing settled leaves the document alone', () => {
    // ⚠️ THE CONTROL FOR THE CASE ABOVE. Without it, a loop that renamed the
    // Task on any press at all would pass.
    const document = templateDocument()
    const wasNamed = document.schedule.tasks[0]?.name ?? ''

    const one = loopWith(document)
    one.press(SK_19)

    expect(one.drawn()).toContain(wasNamed)
  })
})
