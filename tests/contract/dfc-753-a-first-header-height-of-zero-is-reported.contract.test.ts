// Guard cases for DFC-753: a first measured App Header height of zero still reaches the shell, once.

import { describe, expect, it } from 'vitest'

import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { ROLE, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { surfaceOf, wire } from '../fixtures/fake-browser'
import { bare, specTable } from './spec-table'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const THEME: ScreenTheme = { preference: 'light', hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')) }
const ZERO_HEIGHT_PX = 0
const LATER_HEIGHT_PX = 37

function viewTitled(documentTitle: string): ScreenView {
  return {
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: {
      documentTitle,
      openedFileName: null,
      fileSavedAt: null,
      fileSavedByteLength: null,
      fileNeverSavedText: '',
      commands: [],
      language: 'ja',
    },
    taskGroupPanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  } as unknown as ScreenView
}

describe('DFC-753 / FR-051 -- the App Header height settled from the host is reported even when it is zero', () => {
  it('FR-051: a host that measures the header at zero reports zero once, at startup', () => {
    const built = wire(THEME, { [ROLE.appHeader]: ZERO_HEIGHT_PX })
    expect(built.reportedHeights).toEqual([ZERO_HEIGHT_PX])
  })

  it('FR-051: redrawing a header still measured at zero does not report it again', () => {
    const built = wire(THEME, { [ROLE.appHeader]: ZERO_HEIGHT_PX })
    surfaceOf(built).showScreenView(viewTitled('A plan'))
    surfaceOf(built).showScreenView(viewTitled('Another plan'))
    expect(built.reportedHeights).toEqual([ZERO_HEIGHT_PX])
  })

  it('FR-051: a header that grows from zero reports its new height', () => {
    const built = wire(THEME, { [ROLE.appHeader]: ZERO_HEIGHT_PX })
    // STEP: the host now measures the header taller, and the header is redrawn
    built.world.heightsByRole.set(ROLE.appHeader, LATER_HEIGHT_PX)
    surfaceOf(built).showScreenView(viewTitled('A plan'))
    expect(built.reportedHeights).toEqual([ZERO_HEIGHT_PX, LATER_HEIGHT_PX])
  })
})
