// Contract tests: a value typed into PR-1 or PR-2 and settled by SK-19 reaches the document.

import { readRepoFile } from '../spec-files'
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

/* eslint-disable @typescript-eslint/no-explicit-any -- the fakes stand in for browser globals the types do not describe */

const T_016: SpecTable = specTable('T-016')
const T_036: SpecTable = specTable('T-036')
const T_103: SpecTable = specTable('T-103')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const FR_006_STATEMENT =
  'プロパティパネルが選択を出している間、`GRS` は、表 T-016 の項目のうち表 T-016 が読み取り専用と記した項目を除く項目を、プロパティパネルで編集できるようにすること。'

// Why: the GRS JSON column, not the name shown on screen.
const columnOf = (id: string): string => bare(rowOf(T_016, id).by['列（`GRS JSON`）'] ?? '')

const inputFormOf = (id: string): string => bare(rowOf(T_016, id).by['入力の型'] ?? '')

const wholeRowOf = (id: string): string => rowOf(T_016, id).cells.join(' ')

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

// Why: only PR-1 and PR-2 settle by typing and Enter, and they are the two rows found not to reach the document;
// the other editable rows settle on the key that changes the value, and PR-12 needs the host's color chooser.
const TYPED_ROWS = ['PR-1', 'PR-2'] as const
const READ_ONLY_ROW = 'PR-9'
const READ_ONLY_MARK = '読み取り専用'

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

// Why: widthInFontSizes is this file's own and decides nothing; no case here reads a width.
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

const ALREADY_THERE: Record<string, string> = {
  'PR-1': 'NameAlreadyHere',
  'PR-2': 'NotesAlreadyHere',
}

// Why: a different text per row, so no case can pass on the other row's value.
const TYPED_IN: Record<string, string> = {
  'PR-1': 'NameSettledByTheCase',
  'PR-2': 'NotesSettledByTheCase',
}

const TASK_UID = 1

// Why: the join is T-016's own input-type column, so a row whose form moves fails here instead of going stale;
// only the two rows driven here are mapped.
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

// Summary: raise one event on a node and walk it up the parent chain through the listeners the unit registered.
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

// Why: no row rules on which DOM event a settling travels on, IF-9 names only the answer,
// so focusin, input and the keystroke are all raised and no single listener is asserted.
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

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

function templateDocument(): Document {
  const read = documentFromJson(readRepoFile(TEMPLATE_PATH, 'utf8'))
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
  press(key: KeyInput): void
  hold(commit: unknown): void
  drawn(): string
}

// Why: IF-1 puts the schedule up as its own surface, so the drawn Task is the only witness
// this seam offers of a changed name; ScreenView carries the panel, not the bar's label.
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
    readFieldCommit: () => {
      const one = held
      held = null
      return one as never
    },
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

// Spec: FR-006, PR-1, PR-2, PR-9, SK-19, T-016, T-036
describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-006 still makes every row of 表 T-016 editable but the read-only ones', () => {
    expect(REQUIREMENTS).toContain(FR_006_STATEMENT)
  })

  it('⭐ 表 T-016 still gives PR-1 and PR-2 a typed form, and marks neither read-only', () => {
    expect(columnOf('PR-1')).toBe('name')
    expect(columnOf('PR-2')).toBe('notes')
    expect(Object.keys(FORM_OF_KIND)).toContain(inputFormOf('PR-1'))
    expect(Object.keys(FORM_OF_KIND)).toContain(inputFormOf('PR-2'))
    expect(wholeRowOf(READ_ONLY_ROW)).toContain(READ_ONLY_MARK)
    for (const row of TYPED_ROWS) expect(wholeRowOf(row)).not.toContain(READ_ONLY_MARK)
  })

  it('⭐ 表 T-036 still has SK-19 settle the panel’s typing, on `Enter`', () => {
    const sk19 = rowOf(T_036, 'SK-19').cells.join(' ')
    expect(sk19).toContain('出ている通知が無い間、 `Enter` を押したとき、`GRS` は、その場の編集（名称・担当名・タスクグループ名・文書名・プロパティの入力）を確定すること。')
    expect(sk19).toContain('プロパティの入力')
    expect(SK_19.key).toBe('Enter')
    expect(SK_19.modifiers).toEqual({ ctrl: false, shift: false, alt: false, meta: false })
  })
})

// Spec: FR-006, SK-19, IF-9, PR-1, PR-2, U-25
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
      // Why: the key names the column T-016 gives the row, so the answer points at a place in the document, not at a widget.
      expect(commit?.key.column).toBe(columnOf(row))
      expect(commit?.key.uid).toBe(TASK_UID)
    })
  }

  it('⛔ the two rows do not answer for each other', () => {
    // Why: both fields stand at once, so a unit that handed back the last or first field drawn would pass a single-row case.
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

// Spec: FR-006, PR-1, WS-3, WS-6, FT-1, IF-1, BT-4, T-067
describe('FR-006 / 表 T-067 -- a settled PR-1 changes the document', () => {
  it('⛔ the drawn schedule stops carrying the old name and carries the new one', () => {
    // Why: PR-1 is the label drawn on the bar, so the drawn schedule is where the change shows.
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
    // Why: without this, a loop that renamed the Task on any press at all would pass the case above.
    const document = templateDocument()
    const wasNamed = document.schedule.tasks[0]?.name ?? ''

    const one = loopWith(document)
    one.press(SK_19)

    expect(one.drawn()).toContain(wasNamed)
  })
})
