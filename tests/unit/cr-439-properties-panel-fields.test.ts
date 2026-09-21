// Pins what the spec asks of the Properties Panel fields the DOM surface draws (CR-439).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  PropertiesPanel,
  PropertyControl,
  PropertyField,
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

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

function rowOf(table: string, id: string) {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const FR_006 =
  'プロパティパネルが選択を出しているとき、`GRS` は、**表 T-016 の項目**をプロパティパネルに出し、**同表が読み取り専用と記した項目を除いて**編集できるようにすること。'
const FR_007 =
  '作成者が色を選ぶとき、`GRS` は、**表 T-017 のパレット色**から選ばせ、線色と塗り色を個別に指定できるようにすること。'
const IF_9_COMMIT = '**編集できる欄で確定した値を、その欄が名乗る行 ID とともに返し**'

const CL_1_COLOURS = (rowOf('T-017', 'CL-1').cells[1] ?? '')
  .split('/')
  .map((one) => one.replace(/\*/g, '').trim())
  .filter((one) => one !== '')

const PROPERTIES_PANEL = bare(rowOf('T-103', 'U-25').by['確定名（英）'] ?? '')
const SK_19_KEY = bare(rowOf('T-036', 'SK-19').by['割当'] ?? '')

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

const controlOf = (column: string, kind: PropertyControl['kind'], text: string, choices: string[] | null = null): PropertyControl =>
  ({
    key: { holder: 'task', uid: 1, column },
    kind,
    text,
    choices,
    min: null,
    max: null,
    widthInFontSizes: 8,
  }) as unknown as PropertyControl

const field = (row: string, name: string, isEditable: boolean, controls: PropertyControl[]): PropertyField => ({
  row,
  name,
  text: controls[0]?.text ?? '',
  isEditable,
  controls,
})

const FIELDS: PropertyField[] = [
  field('PR-1', 'Name label', true, [controlOf('name', 'text', 'Kick-off')]),
  // WHY: the renderer gives a read-only row no control, so this description gives none either.
  { row: 'PR-9', name: 'Percent label', text: '50', isEditable: false, controls: [] },
  field('PR-17', 'Glyph label', true, [controlOf('milestoneGlyph', 'choice', 'circle', ['circle', 'diamond', 'star'])]),
  field('PR-12', 'Stroke label', true, [controlOf('strokeColor', 'color', '#000000')]),
]

const PANEL: PropertiesPanel = { showing: 'selection', isSubjectGone: false, fields: FIELDS, commands: [] }

function viewWith(panel: PropertiesPanel | null): ScreenView {
  return {
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
    propertiesPanel: panel,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }
}

function drawn(panel: PropertiesPanel | null = PANEL): { built: Stage; surface: ScreenSurface } {
  const built = stage({ 'App Header': 37 })
  const surface = domScreenSurface(wiringOf(built, THEME))
  surface.showScreenView(viewWith(panel))
  return { built, surface }
}

function raise(built: Stage, node: FakeElement, type: string, extra: Record<string, unknown> = {}): void {
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

const ENTRY_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']

function entriesOf(built: Stage, row: string): FakeElement[] {
  const panel = oneByRole(built.root(), PROPERTIES_PANEL)
  return descendants(panel).filter(
    (one) => ENTRY_TAGS.includes(one.tagName) && one.getAttribute('data-field-row') === row,
  )
}

function settleTyped(built: Stage, entry: FakeElement, text: string): void {
  entry.focus()
  raise(built, entry, 'focusin')
  entry.value = text
  raise(built, entry, 'input')
  raise(built, entry, 'change')
  raise(built, entry, 'keydown', { key: SK_19_KEY })
}

describe('CR-439 Properties Panel -- the clauses still stand', () => {
  it('FR-006, FR-007, T-016, T-017 and IF-9 still say what these cases test', () => {
    expect(REQUIREMENTS).toContain(FR_006)
    expect(REQUIREMENTS).toContain(FR_007)
    expect(unbroken(rowOf('T-065', 'IF-9').cells.join(' '))).toContain(IF_9_COMMIT)
    expect(CL_1_COLOURS).toHaveLength(11)
    expect(CL_1_COLOURS).toContain('透明')
    expect(rowOf('T-016', 'PR-9').by['入力の型']).toContain('読み取り専用')
    expect(rowOf('T-016', 'PR-17').by['入力の型']).toBe('選択')
    expect(rowOf('T-016', 'PR-12').by['入力の型']).toContain('色')
    expect(SK_19_KEY).toBe('Enter')
  })
})

describe('FR-006 -- 表 T-016 の項目をプロパティパネルに出し', () => {
  it('every field is drawn with the name the description gives it', () => {
    const { built } = drawn()
    const panel = oneByRole(built.root(), PROPERTIES_PANEL)
    for (const one of FIELDS) {
      expect(panel.textContent).toContain(one.name)
      if (one.isEditable) expect(entriesOf(built, one.row).length, `no entry for ${one.row}`).toBeGreaterThan(0)
    }
  })

  it('no panel in the description, no panel on the screen', () => {
    const { built } = drawn(null)
    const panel = oneByRole(built.root(), PROPERTIES_PANEL)
    expect(descendants(panel).filter((one) => ENTRY_TAGS.includes(one.tagName))).toHaveLength(0)
  })

  it('IF-9 編集できる欄で確定した値を、その欄が名乗る行 ID とともに返し -- PR-1 comes back as PR-1', () => {
    const { built, surface } = drawn()
    settleTyped(built, entriesOf(built, 'PR-1')[0] as FakeElement, 'Kick-off meeting')
    const commit = surface.readFieldCommit()
    expect(commit?.row).toBe('PR-1')
    expect(commit?.text).toBe('Kick-off meeting')
    expect(commit?.key).toEqual({ holder: 'task', uid: 1, column: 'name' })
  })

  it('IF-9 -- one settled value is handed back once', () => {
    const { built, surface } = drawn()
    settleTyped(built, entriesOf(built, 'PR-1')[0] as FakeElement, 'Kick-off meeting')
    expect(surface.readFieldCommit()).not.toBeNull()
    expect(surface.readFieldCommit()).toBeNull()
  })

  it('FR-006 同表が読み取り専用と記した項目を除いて -- PR-9 shows its value, offers no entry, and hands back nothing', () => {
    const { built, surface } = drawn()
    const panel = oneByRole(built.root(), PROPERTIES_PANEL)
    expect(panel.textContent).toContain('50')
    expect(entriesOf(built, 'PR-9')).toHaveLength(0)
    expect(surface.readFieldCommit()).toBeNull()
  })

  it('T-016 PR-17 選択 -- a choice field offers exactly the choices the description carries', () => {
    const { built } = drawn()
    const entry = entriesOf(built, 'PR-17')[0] as FakeElement
    const offered = descendants(entry)
      .filter((one) => one.tagName === 'OPTION')
      .map((one) => one.getAttribute('value') ?? one.textContent)
    expect(offered).toEqual(['circle', 'diamond', 'star'])
  })

  // DEVIATION: spec says the T-017 palette; here the host colour picker (DFC-566)
  it.fails('FR-007 表 T-017 のパレット色から選ばせ -- the colour field offers the CL-1 palette, not the host picker', () => {
    const { built } = drawn()
    const entries = entriesOf(built, 'PR-12')
    for (const one of entries) expect(one.getAttribute('type')).not.toBe('color')
    const panel = oneByRole(built.root(), PROPERTIES_PANEL)
    const row = descendants(panel).find(
      (one) => one.getAttribute('data-field-row') === 'PR-12' && !ENTRY_TAGS.includes(one.tagName),
    ) as FakeElement
    const choices = descendants(row).filter(
      (one) => one.tagName === 'OPTION' || one.tagName === 'BUTTON',
    )
    expect(choices).toHaveLength(CL_1_COLOURS.length)
  })
})
