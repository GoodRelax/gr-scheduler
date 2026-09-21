// Pins what the spec asks of the notices and the Confirmation the DOM surface draws (CR-439).

import { describe, expect, it } from 'vitest'

import type {
  Confirmation,
  Notice,
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
  inlineStyle,
  oneByRole,
  selfAndDescendants,
  stage,
  styleMap,
  wiringOf,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

if (!Object.getOwnPropertyDescriptor(FakeElement.prototype, 'parentElement')) {
  Object.defineProperty(FakeElement.prototype, 'parentElement', {
    get(this: FakeElement): FakeElement | null {
      return this.parentNode
    },
  })
}

function rowOf(table: string, id: string) {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const rowText = (table: string, id: string): string => unbroken(rowOf(table, id).cells.join(' '))
const englishName = (id: string): string => bare(rowOf('T-103', id).by['確定名（英）'] ?? '')

const NT_3_COUNT = '対象の**件数**を添えること'
const NT_5_TELL_APART = '**`NT-1`（受け付けないとき）と見分けがつく形にすること（MUST）**'
const NT_7_WORD_BUTTONS = '**答えの入口は、図形ではなく語のボタンとすること（MUST）**'
const NT_7_BOLD_INITIAL = '**頭の 1 文字（`Y` と `N`）を太字にすること（MUST）**'
const NT_7_NAMES = '消えるもの・解かれるものがあるときは、**その名前を挙げること（MUST）**'
const NT_8_DISMISS = '**人がその場で消せること（MUST）**'
const NT_8_NOT_ON_NT_7 = '**`NT-7` の確認に置いてはならない（MUST NOT）**'
const NT_9_ONE_LINE = '通知が示すものと `NT-8` の入口を、1 行に並べること（MUST）'
const NT_9_NO_CAP = '**固定の幅や、画面に対する割合で頭打ちにしてはならない（MUST NOT）**'

const NOTIFICATION_AREA = englishName('U-57')
const CONFIRMATION = englishName('U-55')

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

const notice = (over: Partial<Notice> = {}): Notice => ({
  manner: 'NT-1',
  mannerText: 'Not accepted',
  text: 'The finish is before the start',
  nextSteps: ['Move the finish after the start'],
  affectedCount: 3,
  dismissText: 'OK',
  dismissKey: 'notice-1',
  ...over,
})

const CONFIRMATION_VIEW: Confirmation = {
  manner: 'NT-7',
  mannerText: 'Confirm',
  question: 'Delete these rows?',
  text: 'Delete these rows?',
  items: [
    { name: 'Row alpha', isShownOnAnotherRow: false },
    { name: 'Row beta', isShownOnAnotherRow: true },
  ],
  answers: [
    { answer: 'yes', text: 'Yes' },
    { answer: 'no', text: 'No' },
  ],
  shownOnAnotherRowMark: '*',
}

function viewWith(notices: readonly Notice[], confirmation: Confirmation | null): ScreenView {
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
    openModal: null,
    notices,
    confirmation,
    dialogueField: null,
    tooltips: [],
  }
}

function drawn(notices: readonly Notice[], confirmation: Confirmation | null = null): { built: Stage; surface: ScreenSurface } {
  const built = stage({ 'App Header': 37 })
  const surface = domScreenSurface(wiringOf(built, THEME))
  surface.showScreenView(viewWith(notices, confirmation))
  return { built, surface }
}

function partOn(built: Stage, surface: ScreenSurface, node: FakeElement): ScreenPart | null {
  ;(built.host as unknown as { elementFromPoint: (x: number, y: number) => FakeElement }).elementFromPoint =
    () => node
  return surface.readScreenPartAt(1, 1)
}

function noticeBoxes(built: Stage): FakeElement[] {
  return oneByRole(built.root(), NOTIFICATION_AREA).children
}

const buttonsIn = (node: FakeElement): FakeElement[] =>
  descendants(node).filter((one) => one.tagName === 'BUTTON')

describe('CR-439 notices and confirmation -- the clauses still stand', () => {
  it('NT-3, NT-5, NT-7, NT-8 and NT-9 still say what these cases test', () => {
    expect(rowText('T-037', 'NT-3')).toContain(NT_3_COUNT)
    expect(rowText('T-037', 'NT-5')).toContain(NT_5_TELL_APART)
    expect(rowText('T-037', 'NT-7')).toContain(NT_7_WORD_BUTTONS)
    expect(rowText('T-037', 'NT-7')).toContain(NT_7_BOLD_INITIAL)
    expect(rowText('T-037', 'NT-7')).toContain(NT_7_NAMES)
    expect(rowText('T-037', 'NT-8')).toContain(NT_8_DISMISS)
    expect(rowText('T-037', 'NT-8')).toContain(NT_8_NOT_ON_NT_7)
    expect(rowText('T-037', 'NT-9')).toContain(NT_9_ONE_LINE)
    expect(rowText('T-037', 'NT-9')).toContain(NT_9_NO_CAP)
  })
})

describe('notices (U-57)', () => {
  it('one notice in the description, one box on the screen, carrying its text and next step', () => {
    const { built } = drawn([notice()])
    const boxes = noticeBoxes(built)
    expect(boxes).toHaveLength(1)
    expect(boxes[0]?.textContent).toContain('The finish is before the start')
    expect(boxes[0]?.textContent).toContain('Move the finish after the start')
  })

  it('NT-3 対象の件数を添えること -- the count the description carries is shown', () => {
    const { built } = drawn([notice({ affectedCount: 12 })])
    expect(noticeBoxes(built)[0]?.textContent).toMatch(/(^|\D)12(\D|$)/)
  })

  it('NT-8 人がその場で消せること -- each notice carries its own dismiss entrance, answering its key', () => {
    const { built, surface } = drawn([notice(), notice({ dismissKey: 'notice-2', text: 'Second' })])
    const answered = noticeBoxes(built).map((box) => {
      const buttons = buttonsIn(box)
      expect(buttons).toHaveLength(1)
      expect(buttons[0]?.textContent).toBe('OK')
      return partOn(built, surface, buttons[0] as FakeElement)?.noticeDismissKey
    })
    expect(answered.sort()).toEqual(['notice-1', 'notice-2'])
  })

  it('NT-9 1 行に並べること / 頭打ちにしてはならない -- the box is a row with no fixed or proportional width cap', () => {
    const { built } = drawn([notice()])
    const box = noticeBoxes(built)[0] as FakeElement
    const style = styleMap(box)
    expect(style.get('flex-direction') ?? 'row').not.toMatch(/column/)
    expect(style.get('display') ?? '').toMatch(/flex|inline/)
    for (const one of selfAndDescendants(box)) {
      const own = styleMap(one)
      expect(own.get('width'), inlineStyle(one)).toBeUndefined()
      expect(own.get('max-width'), inlineStyle(one)).toBeUndefined()
    }
    const button = buttonsIn(box)[0] as FakeElement
    expect(button.parentNode).toBe(box)
  })

  // WHY: it.fails -- the code draws this notice exactly like a refusal; the mismatch goes to the ledger.
  it.fails('NT-5 NT-1 と見分けがつく形にすること（MUST） -- an accepted-with-caution notice does not look like a refusal', () => {
    const { built } = drawn([
      notice({ manner: 'NT-1', mannerText: 'Not accepted', dismissKey: 'a' }),
      notice({ manner: 'NT-5', mannerText: 'Accepted, with a caution', dismissKey: 'b' }),
    ])
    const [refused, accepted] = noticeBoxes(built) as [FakeElement, FakeElement]
    const look = (box: FakeElement): string =>
      selfAndDescendants(box)
        .map((one) => `${one.tagName}{${inlineStyle(one)}}${one.childNodes.filter((c) => !(c instanceof FakeElement)).map((c) => (c as { data: string }).data).join('')}`)
        .join('|')
    expect(look(refused)).not.toBe(look(accepted))
  })
})

describe('the Confirmation (U-55) -- NT-7', () => {
  it('NT-7 答えの入口は、図形ではなく語のボタンとすること -- two word buttons, no glyph, each answering its answer', () => {
    const { built, surface } = drawn([], CONFIRMATION_VIEW)
    const box = oneByRole(built.root(), CONFIRMATION)
    const buttons = buttonsIn(box)
    expect(buttons.map((one) => one.textContent)).toEqual(['Yes', 'No'])
    for (const one of buttons) expect(selfAndDescendants(one).some((each) => each.tagName === 'SVG')).toBe(false)
    expect(buttons.map((one) => partOn(built, surface, one)?.confirmationAnswer)).toEqual(['yes', 'no'])
  })

  it('NT-7 頭の 1 文字（Y と N）を太字にすること -- the initial alone is bold', () => {
    const { built } = drawn([], CONFIRMATION_VIEW)
    for (const button of buttonsIn(oneByRole(built.root(), CONFIRMATION))) {
      const initial = button.textContent.charAt(0)
      const bold = selfAndDescendants(button).filter(
        (one) =>
          one.tagName === 'B' ||
          one.tagName === 'STRONG' ||
          /bold|[6-9]00/.test(styleMap(one).get('font-weight') ?? ''),
      )
      expect(bold.map((one) => one.textContent)).toEqual([initial])
    }
  })

  it('NT-7 その名前を挙げること -- every item the question is about is named', () => {
    const { built } = drawn([], CONFIRMATION_VIEW)
    const text = oneByRole(built.root(), CONFIRMATION).textContent
    expect(text).toContain('Row alpha')
    expect(text).toContain('Row beta')
    expect(text).toContain('Delete these rows?')
  })

  it('NT-8 NT-7 の確認に置いてはならない（MUST NOT） -- the confirmation carries no notice-dismiss entrance', () => {
    const { built, surface } = drawn([], CONFIRMATION_VIEW)
    for (const one of buttonsIn(oneByRole(built.root(), CONFIRMATION))) {
      expect(one.textContent).not.toBe('OK')
      expect(partOn(built, surface, one)?.noticeDismissKey ?? null).toBeNull()
    }
  })
})
