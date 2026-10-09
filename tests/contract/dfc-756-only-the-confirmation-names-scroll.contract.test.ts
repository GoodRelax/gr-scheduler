// Guard cases for DFC-756: the confirmation face does not scroll; only its list of names does.

import { describe, expect, it } from 'vitest'

import type { Confirmation, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { ROLE, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { descendants, oneByRole, styleMap, surfaceOf, wire, type FakeElement } from '../fixtures/fake-browser'
import { bare, specTable } from './spec-table'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const THEME: ScreenTheme = { preference: 'light', hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')) }
const HEADER_PX = 37
const QUESTION_TEXT = 'Delete these task groups?'
const NAMES = ['Alpha', 'Beta', 'Gamma']
const SCROLLING = ['auto', 'scroll']

const ASKED = {
  manner: 'NT-7',
  question: '',
  items: NAMES.map((name) => ({ name, isShownOnAnotherTaskGroup: false })),
  mannerText: '',
  text: QUESTION_TEXT,
  answers: [
    { answer: 'yes', text: 'Yes' },
    { answer: 'no', text: 'No' },
  ],
  shownOnAnotherTaskGroupMark: '',
} as unknown as Confirmation

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
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: ASKED,
  dialogueField: null,
  tooltips: [],
} as unknown as ScreenView

function drawnFace(): FakeElement {
  const built = wire(THEME, { [ROLE.appHeader]: HEADER_PX })
  surfaceOf(built).showScreenView(VIEW)
  return oneByRole(built.root(), ROLE.confirmation)
}

function scrollsOf(element: FakeElement): string[] {
  const style = styleMap(element)
  return ['overflow', 'overflow-y'].map((property) => style.get(property) ?? '').filter((value) => SCROLLING.includes(value))
}

function listOf(face: FakeElement): FakeElement {
  const lines = descendants(face).filter((one) => NAMES.includes(one.textContent))
  const parents = new Set(lines.map((one) => one.parentNode))
  const [list] = [...parents]
  if (lines.length !== NAMES.length || parents.size !== 1 || list === null || list === undefined) {
    throw new Error('the names are not drawn as one list')
  }
  return list
}

describe('DFC-756 / CQ-1, CQ-3, NT-7 -- the face keeps its header and lets the names scroll', () => {
  it('CQ-1: the confirmation face itself does not scroll, so the header with the answers stays in view', () => {
    const face = drawnFace()
    expect(styleMap(face).get('overflow')).toBe('hidden')
    expect(scrollsOf(face)).toEqual([])
    const header = face.children.find((one) => one.textContent.includes(QUESTION_TEXT))
    expect(header, 'the face draws its question').toBeDefined()
    if (header !== undefined) expect(scrollsOf(header)).toEqual([])
  })

  it('CQ-3: the list of names scrolls and may shrink below its content, instead of growing the face', () => {
    const list = listOf(drawnFace())
    expect(scrollsOf(list).length, 'the names do not scroll').toBeGreaterThan(0)
    expect(styleMap(list).get('min-height')).toBe('0')
  })
})
