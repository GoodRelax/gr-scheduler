// Contract tests: settling a field with the value it started with writes nothing, and its text still stands unsettled.

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
import { bare, specTable, type SpecRow, type SpecTable, unbroken } from './spec-table'
import {
  descendants,
  oneByRole,
  surfaceOf,
  wire,
  type FakeElement,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { textEntryStandsOpen } from '../fixtures/field-edit-notices'

const T_016: SpecTable = specTable('T-016')
const T_028: SpecTable = specTable('T-028')
const T_036: SpecTable = specTable('T-036')
const T_103: SpecTable = specTable('T-103')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const wholeRow = (table: SpecTable, id: string): string => rowOf(table, id).cells.join(' ')

const THE_SAME_VALUE_MUST_NOT = '始めた値と同じ値を書いてはならない（MUST NOT）'

const THE_SAME_SETTLING = '`SK-19` の `Enter` と同じ確定である'

const THE_SINGLE_KEY_MUST_NOT =
  '単文字キーと `Delete` / `Backspace` は、文字入力を確定していない間は効かないこと（MUST NOT）'

const columnOf = (id: string): string => bare(rowOf(T_016, id).by['列（`GRS JSON`）'] ?? '')

const inputFormOf = (id: string): string => bare(rowOf(T_016, id).by['入力の型'] ?? '')

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

const U_25 = settledName('U-25')

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
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

// Spec: T-016, PR-1, PR-2
const TYPED_ROWS = ['PR-1', 'PR-2'] as const

const STARTED_WITH: Record<string, string> = {
  'PR-1': 'TheValueItStartedWith',
  'PR-2': 'TheNotesItStartedWith',
}

const SOMETHING_ELSE: Record<string, string> = {
  'PR-1': 'SomethingElseEntirely',
  'PR-2': 'OtherNotesEntirely',
}

const TASK_UID = 1

// Why: the join is T-016's own input form column, so a row whose form moves reaches here.
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

// Summary: raise() walks one event from the node up its ancestors to the listeners the unit itself registered.
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

function enterField(built: Stage, row: string): FakeElement {
  const control = controlFor(built, row)
  control.focus()
  raise(built, control, 'focusin')
  return control
}

function type(built: Stage, control: FakeElement, text: string): void {
  control.value = text
  raise(built, control, 'input')
}

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

const textStandsUnsettled = (built: Stage): boolean => textEntryStandsOpen(surfaceOf(built))

// Spec: IN-6, IN-5a, SK-19, T-028, T-036, T-016
describe('the manuscript still says what these cases read', () => {
  it('⭐ IN-6 still forbids writing the value it started with', () => {
    expect(wholeRow(T_028, 'IN-6')).toContain(THE_SAME_VALUE_MUST_NOT)
  })

  it('⭐ IN-6 still says SK-19’s `Enter` is that same settling', () => {
    // Why: this sentence is what lets a rule written about a pointer press be asked of the SK-19 key.
    expect(wholeRow(T_028, 'IN-6')).toContain(THE_SAME_SETTLING)
  })

  it('⭐ IN-6 keeps the MUST NOT, and no longer rests it on a consequence that cannot happen', () => {
    // Trap: IN-6 once rested on a second undo step, which FR-031 made impossible; this case fails if that
    // retired consequence is written back into IN-6 as its reason.
    const inSix = wholeRow(T_028, 'IN-6')
    expect(inSix).toContain(THE_SAME_VALUE_MUST_NOT)
    expect(inSix, 'IN-6 lost the reason that survives FR-031').toContain(
      '何も変えない書き込みを、そもそも道に乗せない',
    )
    // Why: the retired consequence may still be printed as a named non-reason, quoted for check 42, so each
    // occurrence must be followed by the words that forbid resting on it.
    const retired = '取り消しが 2 段になる'
    for (let at = inSix.indexOf(retired); at >= 0; at = inSix.indexOf(retired, at + 1)) {
      expect(
        inSix.slice(at, at + 200),
        'IN-6 rests on a consequence FR-031 makes impossible',
      ).toContain('を本行の理由にしてはならない')
    }
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

// Spec: IN-6, SK-19, IF-9
// Why: a second settling raised by the host's own change on the way out is not asserted, since no
// row says when the description a field compares itself against is refreshed.
describe('IN-6 (MUST NOT) -- settling an unchanged field raises nothing', () => {
  for (const row of TYPED_ROWS) {
    it(`⛔ ${row}: entering the field and pressing SK-19 without typing raises nothing`, () => {
      const built = drawnPanel()
      const control = enterField(built, row)
      pressSettle(built, control)

      expect(takeCommit(built), `${row}: a value nobody changed was handed back`).toBeNull()
    })

    it(`⛔ ${row}: typing the SAME value back in and pressing SK-19 raises nothing`, () => {
      // Why: a unit that only watched whether a keystroke arrived passes the case above and fails this one.
      const built = drawnPanel()
      const control = enterField(built, row)
      type(built, control, STARTED_WITH[row] ?? '')
      pressSettle(built, control)

      expect(takeCommit(built), `${row}: the same value was written back`).toBeNull()
    })

    it(`⭐ ${row}: a DIFFERENT value is still handed back (the control for both above)`, () => {
      // Why: without this control, a unit that never hands anything back passes the two cases above.
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
      // Why: the second press finds the value it now started with; raising it again writes twice for one edit,
      // and FR-031 (UN-3) leaves no undo step for that, so the write itself is what is guarded.
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

// Spec: IN-5a, IF-9
// Why: a fix that answered that no text stands unsettled would pass the IN-6 cases and open the
// single-key gate, so this side is pinned too.
describe('IN-5a (MUST NOT) -- the unchanged value does not open the single-key gate', () => {
  for (const row of TYPED_ROWS) {
    it(`⛔ ${row}: with the caret in the field and nothing typed, text stands unsettled`, () => {
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
      // Why: the other direction, so the cases above are not passed by a unit that always answers true;
      // SK-19's second stage needs the answer to become false.
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
