// Pins what the spec asks of editing a text field the DOM surface draws (CR-439).

import { describe, expect, it } from 'vitest'

import type {
  PropertiesPanel,
  PropertyControl,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  domScreenSurface,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  descendants,
  FakeElement,
  oneByRole,
  stage,
  wiringOf,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

function rowOf(table: string, id: string) {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const rowText = (table: string, id: string): string => unbroken(rowOf(table, id).cells.join(' '))

const SK_19_SETTLES = 'ほかに何も出ていないときは、**その場の編集を確定する**'
const IN_4_RESTORE = '取り消したときは、編集を始める前の値へ戻すこと（MUST）。'
const IN_4_NO_WRITE = '書きかけの文字を文書へ書いてはならない（MUST NOT）（`FR-031`）。'
const IN_6_PRESS_OUTSIDE =
  '確定していないその場の編集があるとき、その入力欄の外でポインタを押したら、その編集を確定すること（MUST）。'
const IN_6_SAME_VALUE = '**始めた値と同じ値を書いてはならない（MUST NOT）**'
const IN_5A_UNSETTLED = '単文字キーと `Delete` / `Backspace` は、文字入力を確定していない間は効かないこと（MUST NOT）'

const PROPERTIES_PANEL = bare(rowOf('T-103', 'U-25').by['確定名（英）'] ?? '')
const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')
const SK_19_KEY = bare(rowOf('T-036', 'SK-19').by['割当'] ?? '')
const ESC_KEY = 'Escape'

const THEME: ScreenTheme = { preference: 'light', hue: 214 }
const STARTED_WITH = 'Kick-off'

const PANEL: PropertiesPanel = {
  showing: 'selection',
  isSubjectGone: false,
  commands: [],
  fields: [
    {
      row: 'PR-1',
      name: 'Name label',
      text: STARTED_WITH,
      isEditable: true,
      controls: [
        {
          key: { holder: 'task', uid: 1, column: 'name' },
          kind: 'text',
          text: STARTED_WITH,
          choices: null,
          min: null,
          max: null,
          widthInFontSizes: 8,
        } as unknown as PropertyControl,
      ],
    },
  ],
}

const VIEW: ScreenView = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: PANEL,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

function raise(built: Stage, node: FakeElement, type: string, extra: Record<string, unknown> = {}): FakeEvent {
  const event = {
    type,
    key: '',
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    button: 0,
    target: node,
    currentTarget: null,
    relatedTarget: null,
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

interface Editing {
  readonly built: Stage
  readonly surface: ScreenSurface
  readonly entry: FakeElement
}

function typing(text: string): Editing {
  const built = stage({ 'App Header': 37 })
  const surface = domScreenSurface(wiringOf(built, THEME))
  surface.showScreenView(VIEW)
  const panel = oneByRole(built.root(), PROPERTIES_PANEL)
  const entry = descendants(panel).find(
    (one) => (one.tagName === 'INPUT' || one.tagName === 'TEXTAREA') && one.getAttribute('data-field-row') === 'PR-1',
  ) as FakeElement
  expect(entry, 'the panel drew no entry for PR-1').toBeDefined()
  entry.focus()
  raise(built, entry, 'focusin')
  entry.value = text
  raise(built, entry, 'input')
  return { built, surface, entry }
}

function pressOutside({ built, entry }: Editing): void {
  const outside = oneByRole(built.root(), ROW_TITLE_PANEL)
  raise(built, outside, 'pointerdown')
  raise(built, outside, 'mousedown')
  entry.blur()
  raise(built, entry, 'change')
  raise(built, entry, 'focusout', { relatedTarget: null })
  raise(built, entry, 'blur', { relatedTarget: null })
}

describe('CR-439 text-field editing -- the clauses still stand', () => {
  it('SK-19, IN-4, IN-6 and IN-5a still say what these cases test', () => {
    expect(rowText('T-036', 'SK-19')).toContain(SK_19_SETTLES)
    expect(rowText('T-028', 'IN-4')).toContain(IN_4_RESTORE)
    expect(rowText('T-028', 'IN-4')).toContain(IN_4_NO_WRITE)
    expect(rowText('T-028', 'IN-6')).toContain(IN_6_PRESS_OUTSIDE)
    expect(rowText('T-028', 'IN-6')).toContain(IN_6_SAME_VALUE)
    expect(rowText('T-028', 'IN-5a')).toContain(IN_5A_UNSETTLED)
    expect(SK_19_KEY).toBe('Enter')
  })
})

describe('IN-5a -- 文字入力を確定していない間 (the state the surface answers)', () => {
  it('a field being typed in stands unsettled; a drawn panel nobody touched does not', () => {
    const idle = stage({ 'App Header': 37 })
    const idleSurface = domScreenSurface(wiringOf(idle, THEME))
    idleSurface.showScreenView(VIEW)
    expect(idleSurface.hasUnsettledTextEntry()).toBe(false)

    const { surface } = typing('Kick-off meeting')
    expect(surface.hasUnsettledTextEntry()).toBe(true)
  })

  it('AG-11 / IN-4 書きかけの文字 -- nothing is handed back while the text stands unsettled', () => {
    const { surface } = typing('Kick-off meeting')
    expect(surface.readFieldCommit()).toBeNull()
  })
})

describe('SK-19 -- その場の編集を確定する', () => {
  it('Enter settles the field: the value comes back, and the field no longer stands unsettled', () => {
    const editing = typing('Kick-off meeting')
    raise(editing.built, editing.entry, 'keydown', { key: SK_19_KEY })
    const commit = editing.surface.readFieldCommit()
    expect(commit?.row).toBe('PR-1')
    expect(commit?.text).toBe('Kick-off meeting')
    expect(editing.surface.hasUnsettledTextEntry()).toBe(false)
  })
})

describe('IN-4 -- Esc cancels the edit in place', () => {
  it('IN-4 取り消したときは、編集を始める前の値へ戻すこと（MUST） / 書きかけの文字を文書へ書いてはならない', () => {
    const editing = typing('Half typed')
    raise(editing.built, editing.entry, 'keydown', { key: ESC_KEY })
    expect(editing.surface.readFieldCommit()).toBeNull()
    expect(editing.entry.value).toBe(STARTED_WITH)
  })

  // WHY: one press clears one rung, so the surface lets go of the field on keyup; a browser sends both.
  it('IN-4 -- after one Esc press (down and up) no unsettled edit is left, nothing is handed back, the value is restored', () => {
    const editing = typing('Half typed')
    raise(editing.built, editing.entry, 'keydown', { key: ESC_KEY })
    raise(editing.built, editing.entry, 'keyup', { key: ESC_KEY })
    expect(editing.surface.hasUnsettledTextEntry()).toBe(false)
    expect(editing.surface.readFieldCommit()).toBeNull()
    expect(editing.entry.value).toBe(STARTED_WITH)
  })

  it('IN-4 -- a press outside after the Esc writes nothing either', () => {
    const editing = typing('Half typed')
    raise(editing.built, editing.entry, 'keydown', { key: ESC_KEY })
    pressOutside(editing)
    expect(editing.surface.readFieldCommit()).toBeNull()
  })
})

describe('IN-6 -- a press outside the field settles it', () => {
  it('IN-6 その入力欄の外でポインタを押したら、その編集を確定すること（MUST）', () => {
    const editing = typing('Kick-off meeting')
    pressOutside(editing)
    const commit = editing.surface.readFieldCommit()
    expect(commit?.row).toBe('PR-1')
    expect(commit?.text).toBe('Kick-off meeting')
    expect(editing.surface.hasUnsettledTextEntry()).toBe(false)
  })

  it('IN-6 始めた値と同じ値を書いてはならない（MUST NOT） -- by a press outside', () => {
    const editing = typing(STARTED_WITH)
    pressOutside(editing)
    expect(editing.surface.readFieldCommit()).toBeNull()
  })

  it('IN-6 始めた値と同じ値を書いてはならない（MUST NOT） -- by SK-19', () => {
    const editing = typing(STARTED_WITH)
    raise(editing.built, editing.entry, 'keydown', { key: SK_19_KEY })
    expect(editing.surface.readFieldCommit()).toBeNull()
  })

  it('IN-6 押下そのものの働きを止めてはならない（MUST NOT） -- the press outside is not swallowed', () => {
    const editing = typing('Kick-off meeting')
    const outside = oneByRole(editing.built.root(), ROW_TITLE_PANEL)
    const press = raise(editing.built, outside, 'pointerdown')
    expect(press.defaultPrevented).toBe(false)
  })
})
