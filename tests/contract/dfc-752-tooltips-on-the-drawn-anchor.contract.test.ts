// Guard cases for DFC-752: tooltips measure the anchor drawn this frame.

import { describe, expect, it } from 'vitest'

import type { CommandItem, ScreenView, Tooltip } from '../../src/adapter/screen-renderer/screen-renderer'
import { ROLE, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { descendants, oneByRole, surfaceOf, wire, type FakeElement, type Stage } from '../fixtures/fake-browser'
import { bare, specTable } from './spec-table'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const THEME: ScreenTheme = { preference: 'light', hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')) }
const HEADER_PX = 37
const HEADER_ICON = 'IC-20'

const headerCommand: CommandItem = {
  icon: HEADER_ICON,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: HEADER_ICON,
} as CommandItem

const tooltipOn = (text: string): Tooltip => ({ anchor: { kind: 'icon', icon: HEADER_ICON }, text, assignment: null }) as Tooltip

function viewWith(patch: { title: string; tooltips: readonly Tooltip[] }): ScreenView {
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
    taskGroupPanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    tooltips: patch.tooltips,
  } as unknown as ScreenView
}

const headerEntryOf = (built: Stage): FakeElement | undefined =>
  descendants(oneByRole(built.root(), ROLE.appHeader)).find((one) => one.getAttribute('data-icon') === HEADER_ICON)

describe('DFC-752 / IN-3, EZ-2 -- a tooltip is placed against the entry drawn in the same frame', () => {
  it('EZ-2: when the App Header and its tooltip change in one frame, the tooltip measures the new entry, not the gone one', () => {
    const built = wire(THEME, { [ROLE.appHeader]: HEADER_PX })
    const surface = surfaceOf(built)
    surface.showScreenView(viewWith({ title: 'A plan', tooltips: [tooltipOn('first')] }))
    const before = headerEntryOf(built)
    const measuredBefore = built.world.measured.length
    // STEP: one frame redraws the header and changes the tooltip
    surface.showScreenView(viewWith({ title: 'Another plan', tooltips: [tooltipOn('second')] }))
    const after = headerEntryOf(built)
    expect(after, 'the header drew its entry anew').not.toBe(before)
    const measured = built.world.measured.slice(measuredBefore)
    expect(measured, 'the tooltip measured the new entry').toContain(after)
    expect(measured.filter((one) => !one.isConnected), 'something measured is no longer drawn').toEqual([])
  })
})
