// Pins what the spec asks of the open surfaces the DOM surface draws (CR-439).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  CommandItem,
  OpenModal,
  ScreenPart,
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
  iconEntry,
  oneByRole,
  selfAndDescendants,
  stage,
  wiringOf,
  type Stage,
} from '../fixtures/fake-browser'
import { specTable, unbroken } from '../contract/spec-table'

if (!Object.getOwnPropertyDescriptor(FakeElement.prototype, 'parentElement')) {
  Object.defineProperty(FakeElement.prototype, 'parentElement', {
    get(this: FakeElement): FakeElement | null {
      return this.parentNode
    },
  })
}

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

function rowOf(table: string, id: string) {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const rowText = (table: string, id: string): string => unbroken(rowOf(table, id).cells.join(' '))
const englishNames = (id: string): string[] =>
  (rowOf('T-103', id).by['確定名（英）'] ?? '').split('/').map((one) => one.replace(/[`*]/g, '').trim())

const FR_036 = '利用者がヘルプを開いたとき、`GRS` は、ショートカットキーとアイコンの一覧を画面上で示すこと。'
const FR_068 = '⭐ 面にはその文書を読める形で出すこと（MUST）。'
const FR_099 = '作成者が名簿を求めたとき、`GRS` は、文書が持つ担当者の一覧を出し、そこから担当者を消せるようにすること。'
const FR_023 = '`innerHTML` への直挿しを行ってはならない（MUST NOT）。'
const U_62 = '取り込みが落とした `Task` の名前を並べて告げる面'
const IF_9_FORMAT = '書き出しの選択面では 表 T-024 のどの形式の上かを答える'
const IF_9_ENTRY_OR_FORMAT = '入口と形式は別の表の行であり、一方の上にあるとき他方は `null` である'

const [HELP_MODAL, AI_EXPORT_MODAL] = englishNames('U-30') as [string, string]
const [RESOURCE_ROSTER] = englishNames('U-49') as [string]
const [IMPORT_REPORT] = englishNames('U-62') as [string]
const [EXPORT_CHOOSER] = englishNames('U-54') as [string]

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

const command = (icon: string): CommandItem => ({
  icon,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: `label of ${icon}`,
})

function viewWith(openModal: OpenModal): ScreenView {
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
    propertiesPanel: null,
    commandPalette: null,
    openModal,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }
}

function drawn(openModal: OpenModal): { built: Stage; surface: ScreenSurface } {
  const built = stage({ 'App Header': 37 })
  const surface = domScreenSurface(wiringOf(built, THEME))
  surface.showScreenView(viewWith(openModal))
  return { built, surface }
}

function partOn(built: Stage, surface: ScreenSurface, node: FakeElement): ScreenPart | null {
  ;(built.host as unknown as { elementFromPoint: (x: number, y: number) => FakeElement }).elementFromPoint =
    () => node
  return surface.readScreenPartAt(1, 1)
}

const HELP: OpenModal = {
  surface: 'Help Modal',
  heading: 'Help heading',
  commands: [],
  legend: 'IC-22',
  language: 'ja',
  licenceText: 'Licence text',
  copyrightNotice: 'Copyright notice',
  attributions: ['An attribution'],
  entries: [
    {
      table: 'T-036',
      row: 'SK-19',
      text: 'Settle the edit',
      press: null,
      keys: 'Enter',
      icon: 'IC-5',
      kind: 'key',
      column: 'c1',
      block: 'b1',
      segment: null,
      glyphs: ['IC-5'],
      indent: false,
    },
  ],
}

const ROSTER: OpenModal = {
  surface: 'Resource Roster',
  heading: 'Roster heading',
  commands: [command('IC-80')],
  resources: [
    { uid: 7, name: 'Alice', isReferenced: true, isSelected: false, unassignedTaskNames: ['Design review'] },
    { uid: 8, name: 'Bob', isReferenced: false, isSelected: true, unassignedTaskNames: [] },
  ],
}

const HOSTILE_NAME = '<img src=x onerror=alert(1)>'

const REPORT: OpenModal = {
  surface: 'Import Report',
  heading: 'Report heading',
  commands: [],
  droppedTaskNames: [HOSTILE_NAME, 'Plain dropped task'],
  text: 'Some tasks were dropped',
  nextStep: 'Fix the dates and read again',
  dismissText: 'OK',
}

const CHOOSER: OpenModal = {
  surface: 'Export Chooser',
  heading: 'Chooser heading',
  commands: [],
  formats: [
    { row: 'IO-1', name: 'GRS JSON', extension: '.json' },
    { row: 'IO-2', name: 'MSPDI', extension: '.xml' },
  ],
}

const AI_EXPORT: OpenModal = {
  surface: 'AI Export Modal',
  heading: 'AI export heading',
  commands: [command('IC-52')],
  documentText: '{"schema":"grs","tasks":[]}',
}

describe('CR-439 open surfaces -- the clauses still stand', () => {
  it('FR-036, FR-068, FR-099, FR-023, U-62 and IF-9 still say what these cases test', () => {
    for (const clause of [FR_036, FR_068, FR_099, FR_023]) expect(REQUIREMENTS).toContain(clause)
    expect(rowText('T-103', 'U-62')).toContain(U_62)
    expect(rowText('T-065', 'IF-9')).toContain(IF_9_FORMAT)
    expect(rowText('T-065', 'IF-9')).toContain(IF_9_ENTRY_OR_FORMAT)
    expect([HELP_MODAL, AI_EXPORT_MODAL, RESOURCE_ROSTER, IMPORT_REPORT, EXPORT_CHOOSER]).toEqual([
      'Help Modal',
      'AI Export Modal',
      'Resource Roster',
      'Import Report',
      'Export Chooser',
    ])
  })
})

describe('Help Modal (U-30) -- FR-036', () => {
  it('FR-036 ショートカットキーとアイコンの一覧を画面上で示すこと -- each entry shows its words, its keys and its icon', () => {
    const { built } = drawn(HELP)
    const modal = oneByRole(built.root(), HELP_MODAL)
    expect(modal.textContent).toContain('Help heading')
    expect(modal.textContent).toContain('Settle the edit')
    expect(modal.textContent).toContain('Enter')
    expect(selfAndDescendants(modal).some((one) => one.tagName === 'SVG')).toBe(true)
  })

  it('the licence, the copyright notice and the attributions the description carries are shown', () => {
    const { built } = drawn(HELP)
    const text = oneByRole(built.root(), HELP_MODAL).textContent
    expect(text).toContain('Licence text')
    expect(text).toContain('Copyright notice')
    expect(text).toContain('An attribution')
  })
})

describe('AI Export Modal (U-30) -- FR-068', () => {
  it('FR-068 面にはその文書を読める形で出すこと（MUST） -- the document text itself is on the surface', () => {
    const { built } = drawn(AI_EXPORT)
    const modal = oneByRole(built.root(), AI_EXPORT_MODAL)
    expect(modal.textContent).toContain('{"schema":"grs","tasks":[]}')
    expect(built.world.markupWrites).toHaveLength(0)
  })
})

describe('Resource Roster (U-49) -- FR-099', () => {
  it('FR-099 文書が持つ担当者の一覧を出し -- every resource is listed by name', () => {
    const { built } = drawn(ROSTER)
    const roster = oneByRole(built.root(), RESOURCE_ROSTER)
    expect(roster.textContent).toContain('Alice')
    expect(roster.textContent).toContain('Bob')
    expect(roster.textContent).toContain('Design review')
  })

  it('IF-9 画面上の点がどの UI パーツ -- a press on a resource answers the roster and that resource', () => {
    const { built, surface } = drawn(ROSTER)
    const roster = oneByRole(built.root(), RESOURCE_ROSTER)
    const bobText = descendants(roster).find((one) =>
      one.childNodes.some((child) => !(child instanceof FakeElement) && child.data === 'Bob'),
    ) as FakeElement
    expect(bobText).toBeDefined()
    const part = partOn(built, surface, bobText)
    expect(part?.part).toBe(RESOURCE_ROSTER)
    expect(part?.resourceUid).toBe(8)
  })

  it('the entrances the description gives the roster are drawn on it', () => {
    const { built } = drawn(ROSTER)
    expect(iconEntry(oneByRole(built.root(), RESOURCE_ROSTER), 'IC-80')).toBeDefined()
  })
})

describe('Import Report (U-62) -- U-62 and FR-023', () => {
  it('U-62 取り込みが落とした Task の名前を並べて告げる面 -- every dropped name is listed, with the text and the next step', () => {
    const { built } = drawn(REPORT)
    const report = oneByRole(built.root(), IMPORT_REPORT)
    expect(report.textContent).toContain('Some tasks were dropped')
    expect(report.textContent).toContain('Fix the dates and read again')
    expect(report.textContent).toContain('Plain dropped task')
  })

  it('FR-023 innerHTML への直挿しを行ってはならない（MUST NOT） -- a name read from a file is text, never markup', () => {
    const { built } = drawn(REPORT)
    const report = oneByRole(built.root(), IMPORT_REPORT)
    expect(built.world.markupWrites).toHaveLength(0)
    expect(report.textContent).toContain(HOSTILE_NAME)
    expect(selfAndDescendants(report).some((one) => one.tagName === 'IMG')).toBe(false)
  })

  it('U-62 閉じる入口 -- the one entrance says the words it is given and answers as the dismissal', () => {
    const { built, surface } = drawn(REPORT)
    const report = oneByRole(built.root(), IMPORT_REPORT)
    const buttons = descendants(report).filter((one) => one.tagName === 'BUTTON')
    expect(buttons).toHaveLength(1)
    const ok = buttons[0] as FakeElement
    expect(ok.textContent).toBe('OK')
    const part = partOn(built, surface, ok)
    expect(part?.part).toBe(IMPORT_REPORT)
    expect(part?.isImportReportDismiss).toBe(true)
  })
})

describe('Export Chooser (U-54) -- IF-9', () => {
  it('IF-9 書き出しの選択面では 表 T-024 のどの形式の上かを答える -- and the entry is null there', () => {
    const { built, surface } = drawn(CHOOSER)
    const chooser = oneByRole(built.root(), EXPORT_CHOOSER)
    const choices = descendants(chooser).filter((one) => one.tagName === 'BUTTON')
    const answered = choices.map((one) => partOn(built, surface, one))
    const formats = answered.map((one) => one?.format).filter((one) => one !== null && one !== undefined)
    expect(formats.sort()).toEqual(['IO-1', 'IO-2'])
    for (const one of answered.filter((each) => each?.format !== null && each?.format !== undefined)) {
      expect(one?.part).toBe(EXPORT_CHOOSER)
      expect(one?.entry ?? null).toBeNull()
    }
  })

  it('each format is offered by the name the description gives it', () => {
    const { built } = drawn(CHOOSER)
    const text = oneByRole(built.root(), EXPORT_CHOOSER).textContent
    expect(text).toContain('GRS JSON')
    expect(text).toContain('MSPDI')
  })
})
