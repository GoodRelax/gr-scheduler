// Guard cases for DFC-545: only a text entry opens an edit; a choice, a checkbox or a gone title does not.

import { describe, expect, it } from 'vitest'

import type {
  PropertiesPanel,
  PropertyControlKind,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { ROLE, domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { descendants, oneByRole, stage, wiringOf, type FakeElement, type FakeEvent, type Stage } from '../fixtures/fake-browser'
import { textEntryStandsOpen } from '../fixtures/field-edit-notices'
import { bare, specTable } from './spec-table'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const THEME: ScreenTheme = { preference: 'light', hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')) }
const HEADER_PX = 37
const U_25 = bare(rowOf('T-103', 'U-25').by['確定名（英）'] ?? '')
const DOCUMENT_TITLE_ROW = 'U-27'
const columnOf = (id: string): string => bare(rowOf('T-016', id).by['列（`GRS JSON`）'] ?? '')

const TEXT_ROW = 'PR-1'
const CHOICE_ROW = 'PR-17'
const BOOLEAN_ROW = 'PR-8'
const FIELD_WIDTH_EM = 8
const FIELD_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']

function fieldOf(row: string, kind: PropertyControlKind, text: string, choices: readonly string[] | null) {
  return {
    row,
    name: columnOf(row),
    text,
    isEditable: true,
    controls: [{ key: { holder: 'task', uid: 1, column: columnOf(row) }, kind, text, choices, min: null, max: null, widthInFontSizes: FIELD_WIDTH_EM }],
  }
}

const PANEL = {
  showing: 'selection',
  isSubjectGone: false,
  fields: [
    fieldOf(TEXT_ROW, 'text', 'a name', null),
    fieldOf(CHOICE_ROW, 'choice', 'diamond', ['diamond', 'star']),
    fieldOf(BOOLEAN_ROW, 'boolean', 'true', null),
  ],
  commands: [],
} as unknown as PropertiesPanel

const VIEW = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: 'A plan',
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
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
} as unknown as ScreenView

interface Wired {
  readonly built: Stage
  readonly surface: ScreenSurface
  readonly focusField: (row: string) => boolean
  readonly pressHost: (target: FakeElement) => void
}

// WHY: the shared fake host has neither activeElement nor addEventListener; a press on the
// host and the focus question both need them, so this stage lends the two.
function wired(): Wired {
  const built = stage({ [ROLE.appHeader]: HEADER_PX })
  const hostListeners: { type: string; listener: (event: unknown) => void }[] = []
  const host = {
    createElement: (tag: string): unknown => built.host.createElement(tag),
    get activeElement(): unknown {
      return built.world.activeElement
    },
    addEventListener: (type: string, listener: (event: unknown) => void): void => {
      hostListeners.push({ type, listener })
    },
  } as unknown as Document
  const held: { focus: ((row: string) => boolean) | null } = { focus: null }
  const surface = domScreenSurface({
    ...wiringOf(built, THEME),
    host,
    holdFocusPropertyField: (focus) => {
      held.focus = focus
    },
  })
  surface.showScreenView(VIEW)
  const focusField = (row: string): boolean => {
    if (held.focus === null) throw new Error('the surface handed over no focus seam')
    return held.focus(row)
  }
  const pressHost = (target: FakeElement): void => {
    for (const one of hostListeners.filter((each) => each.type === 'pointerdown')) one.listener({ type: 'pointerdown', target })
  }
  return { built, surface, focusField, pressHost }
}

function raise(built: Stage, node: FakeElement, type: string): void {
  const event = { type, key: '', target: node, currentTarget: null, defaultPrevented: false, relatedTarget: null } as unknown as FakeEvent
  for (let at: FakeElement | null = node; at !== null; at = at.parentNode) {
    for (const one of [...built.world.registrations]) {
      if (one.node === at && one.type === type) one.listener(event)
    }
  }
}

function controlOf(built: Stage, row: string): FakeElement {
  const found = descendants(built.root()).find(
    (one) => FIELD_TAGS.includes(one.tagName) && one.getAttribute('data-field-row') === row,
  )
  if (found === undefined) throw new Error(`nothing drawn names ${row}`)
  return found
}

function focusIn(built: Stage, control: FakeElement): void {
  control.focus()
  raise(built, control, 'focusin')
}

describe('DFC-545 / IN-5a, IF-9 -- a focused choice or checkbox is not an unsettled text entry', () => {
  it('IF-9: focusing the text field of PR-1 opens an edit (the stage reaches the seam)', () => {
    const { built, surface } = wired()
    focusIn(built, controlOf(built, TEXT_ROW))
    expect(textEntryStandsOpen(surface)).toBe(true)
  })

  it.each([
    ['choice field', CHOICE_ROW],
    ['checkbox field', BOOLEAN_ROW],
  ])('IN-5a, SK-3: a focused %s (%s) tells no edit began, so Delete still reaches SK-3', (_kind, row) => {
    const { built, surface } = wired()
    const control = controlOf(built, row)
    expect(oneByRole(built.root(), U_25).contains(control), `${row} sits in the Properties Panel`).toBe(true)
    focusIn(built, control)
    expect(surface.readFieldEditNotices?.() ?? []).toEqual([])
    expect(textEntryStandsOpen(surface)).toBe(false)
  })

  it('IN-5a: moving the focus from the text field to the choice field leaves no edit open', () => {
    const { built, surface } = wired()
    const text = controlOf(built, TEXT_ROW)
    focusIn(built, text)
    expect(textEntryStandsOpen(surface)).toBe(true)
    // STEP: the focus leaves the text field and lands on the choice field
    raise(built, text, 'focusout')
    focusIn(built, controlOf(built, CHOICE_ROW))
    expect(textEntryStandsOpen(surface)).toBe(false)
  })
})

describe('DFC-545 / IF-9, SK-19, WS-2 -- the document title field ends its edit when it loses the focus', () => {
  it(`IF-9: the ${DOCUMENT_TITLE_ROW} field opened by a focus request tells ended on focusout`, () => {
    const { built, surface, focusField } = wired()
    focusField(DOCUMENT_TITLE_ROW)
    expect(textEntryStandsOpen(surface), 'the title field is open').toBe(true)
    const title = controlOf(built, DOCUMENT_TITLE_ROW)
    raise(built, title, 'focusout')
    expect(textEntryStandsOpen(surface)).toBe(false)
  })
})

describe('DFC-545 / IN-6, WS-2 -- a press outside ends the edit on a host that raises no focusout', () => {
  it('IN-6: a pointerdown outside the held text field ends its edit with no focusout', () => {
    const { built, surface, pressHost } = wired()
    focusIn(built, controlOf(built, TEXT_ROW))
    expect(textEntryStandsOpen(surface)).toBe(true)
    pressHost(built.root())
    expect(textEntryStandsOpen(surface)).toBe(false)
  })
})
