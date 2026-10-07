// Guard cases for DFC-752: a drawn frame lets go of the settled utterance, and tooltips measure the anchor drawn this frame.

import { describe, expect, it } from 'vitest'

import type { CommandItem, DialogueField, ScreenView, Tooltip } from '../../src/adapter/screen-renderer/screen-renderer'
import { ROLE, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { descendants, oneByRole, surfaceOf, wire, type FakeElement, type FakeEvent, type Stage } from '../fixtures/fake-browser'
import { bare, specTable } from './spec-table'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const THEME: ScreenTheme = { preference: 'light', hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')) }
const HEADER_PX = 37
const CANVAS_PX = { width: 800, height: 600 }
const SK_19_KEY = bare(rowOf('T-036', 'SK-19').by['割当'] ?? '')
const DIALOGUE_FIELD = bare(rowOf('T-103', 'U-44').by['確定名（英）'] ?? '')
const HEADER_ICON = 'IC-20'

const FIELD: DialogueField = {
  heading: '',
  shown: 'normal',
  titleEntries: [],
  place: { at: null, size: null },
  canvas: { x: 0, y: 0, ...CANVAS_PX },
  messages: [],
}

const headerCommand: CommandItem = {
  icon: HEADER_ICON,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: HEADER_ICON,
} as CommandItem

const tooltipOn = (text: string): Tooltip => ({ anchor: { kind: 'icon', icon: HEADER_ICON }, text, assignment: null }) as Tooltip

function viewWith(patch: { title: string; tooltips: readonly Tooltip[]; dialogueField: DialogueField | null }): ScreenView {
  return {
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: {
      documentTitle: patch.title,
      openedFileName: null,
      fileSavedAt: null,
      fileSavedByteLength: null,
      fileNeverSavedText: '',
      commands: [headerCommand],
      language: 'ja',
    },
    rowTitlePanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: patch.dialogueField,
    tooltips: patch.tooltips,
  } as unknown as ScreenView
}

function raise(built: Stage, node: FakeElement, type: string, key = ''): void {
  const event = {
    type,
    key,
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: null,
    defaultPrevented: false,
    preventDefault(): void {},
    stopPropagation(): void {},
  } as unknown as FakeEvent
  for (let at: FakeElement | null = node; at !== null; at = at.parentNode) {
    for (const one of [...built.world.registrations]) {
      if (one.node === at && one.type === type) one.listener(event)
    }
  }
}

function dialogueEntryOf(built: Stage): FakeElement {
  const entries = descendants(oneByRole(built.root(), DIALOGUE_FIELD)).filter((one) => one.tagName === 'INPUT')
  const entry = entries[0]
  if (entries.length !== 1 || entry === undefined) throw new Error('the Dialogue Field holds no single entry')
  return entry
}

const headerEntryOf = (built: Stage): FakeElement | undefined =>
  descendants(oneByRole(built.root(), ROLE.appHeader)).find((one) => one.getAttribute('data-icon') === HEADER_ICON)

describe('DFC-752 / IF-9, AG-11 -- one Enter hands over one utterance', () => {
  it('IF-9: the utterance settled by SK-19 is read once, and not again after the frame that read it is drawn', () => {
    const built = wire(THEME, { [ROLE.appHeader]: HEADER_PX })
    const surface = surfaceOf(built)
    const view = viewWith({ title: 'A plan', tooltips: [], dialogueField: FIELD })
    surface.showScreenView(view)
    const entry = dialogueEntryOf(built)
    // STEP: type a line and settle it with SK-19
    entry.value = 'Shift the launch by a week'
    raise(built, entry, 'keydown', SK_19_KEY)
    expect(surface.readDialogueInput()?.text).toBe('Shift the launch by a week')
    surface.showScreenView(view)
    expect(surface.readDialogueInput(), 'the same utterance came back after the draw').toBeNull()
  })
})

describe('DFC-752 / IN-3, EZ-2 -- a tooltip is placed against the entry drawn in the same frame', () => {
  it('EZ-2: when the App Header and its tooltip change in one frame, the tooltip measures the new entry, not the gone one', () => {
    const built = wire(THEME, { [ROLE.appHeader]: HEADER_PX })
    const surface = surfaceOf(built)
    surface.showScreenView(viewWith({ title: 'A plan', tooltips: [tooltipOn('first')], dialogueField: null }))
    const before = headerEntryOf(built)
    const measuredBefore = built.world.measured.length
    // STEP: one frame redraws the header and changes the tooltip
    surface.showScreenView(viewWith({ title: 'Another plan', tooltips: [tooltipOn('second')], dialogueField: null }))
    const after = headerEntryOf(built)
    expect(after, 'the header drew its entry anew').not.toBe(before)
    const measured = built.world.measured.slice(measuredBefore)
    expect(measured, 'the tooltip measured the new entry').toContain(after)
    expect(measured.filter((one) => !one.isConnected), 'something measured is no longer drawn').toEqual([])
  })
})
