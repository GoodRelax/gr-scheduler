// Guard cases for DFC-751: the property field focus request answers false to retry and true when done.

import { describe, expect, it } from 'vitest'

import type { PropertiesPanel, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { ROLE, domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { descendants, stage, wiringOf, type FakeElement, type Stage } from '../fixtures/fake-browser'
import { bare, specTable } from './spec-table'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const THEME: ScreenTheme = { preference: 'light', hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')) }
const HEADER_PX = 37
const FIELD_WIDTH_EM = 8
const NAME_TASK_GROUP = 'PR-1'
const TASK_GROUP_NAME_TASK_GROUP = 'AT-53'
const FIELD_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']
const column = bare(rowOf('T-016', NAME_TASK_GROUP).by['列（`GRS JSON`）'] ?? '')

const PANEL = {
  showing: 'selection',
  isSubjectGone: false,
  fields: [
    {
      row: NAME_TASK_GROUP,
      name: column,
      text: 'a name',
      isEditable: true,
      controls: [
        {
          key: { holder: 'task', uid: 1, column },
          kind: 'text',
          text: 'a name',
          choices: null,
          min: null,
          max: null,
          widthInFontSizes: FIELD_WIDTH_EM,
        },
      ],
    },
  ],
  commands: [],
} as unknown as PropertiesPanel

const VIEW = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  },
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: PANEL,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
} as unknown as ScreenView

// WHY: the shared fake host has no activeElement, and a host that cannot say where the focus
// is reads as focused; this stage lends one so the false answer can be reached at all.
function wired(): { built: Stage; focusField: (row: string) => boolean } {
  const built = stage({ [ROLE.appHeader]: HEADER_PX })
  const host = {
    createElement: (tag: string): unknown => built.host.createElement(tag),
    get activeElement(): unknown {
      return built.world.activeElement
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
  return {
    built,
    focusField: (row: string): boolean => {
      if (held.focus === null) throw new Error('the surface handed over no focus seam')
      return held.focus(row)
    },
  }
}

function controlOf(built: Stage, row: string): FakeElement {
  const found = descendants(built.root()).find(
    (one) => FIELD_TAGS.includes(one.tagName) && one.getAttribute('data-field-row') === row,
  )
  if (found === undefined) throw new Error(`nothing drawn names ${row}`)
  return found
}

describe('DFC-751 / IF-9, IN-5b, MK-13 -- the focus request answers retry or done', () => {
  it('IF-9, MK-13: a drawn field the focus enters answers true, with the focus on that field', () => {
    const { built, focusField } = wired()
    expect(focusField(NAME_TASK_GROUP)).toBe(true)
    expect(built.world.activeElement).toBe(controlOf(built, NAME_TASK_GROUP))
  })

  it('IF-9, IN-5b: a drawn field the focus does not enter answers false, and true once a later ask lands', () => {
    const { built, focusField } = wired()
    const control = controlOf(built, NAME_TASK_GROUP)
    const lands = control.focus.bind(control)
    // STEP: the host refuses the focus on this frame
    control.focus = (): void => {}
    expect(focusField(NAME_TASK_GROUP)).toBe(false)
    expect(built.world.activeElement).toBeNull()
    // STEP: the next frame asks again and the host lets the focus in
    control.focus = lands
    expect(focusField(NAME_TASK_GROUP)).toBe(true)
  })

  it('IF-9, IN-5a: a row whose field the drawn panel lacks answers true, so the request is withdrawn', () => {
    const { built, focusField } = wired()
    expect(descendants(built.root()).some((one) => one.getAttribute('data-field-row') === TASK_GROUP_NAME_TASK_GROUP)).toBe(false)
    expect(focusField(TASK_GROUP_NAME_TASK_GROUP)).toBe(true)
  })
})
