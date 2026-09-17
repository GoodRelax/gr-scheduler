// CR-407: a confirmation that names what goes keeps question and answers above an S-242 rule and scrolls only the list.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  ConfirmationItem,
  RaisedConfirmation,
  ScreenSession,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { confirmationFromSession } from '../../src/adapter/screen-renderer/notices'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-076 (MUST) -- the naming questions of T-234 follow T-258', '⭐ 表 T-234 の `名前を挙げるか` の欄が「挙げる」で始まる行の問いは、名前の一覧を持つ確認であり、表 T-258 のとおりに組むこと（MUST）'],
  ['T-258 CQ-1 (MUST) -- question, then answers, at the top', '面の上に置き、問いの文（表 T-234 の行）と、答えの入口（表 T-037 の `NT-7` の `Yes` / `No`）を、この順に並べること（MUST）'],
  ['T-258 CQ-1 (MUST NOT) -- the header does not scroll', '⛔ 見出し部をスクロールさせてはならない（MUST NOT）'],
  ['T-258 CQ-2 (MUST) -- one line between header and list', '見出し部と一覧のあいだに、面の横いっぱいの線を 1 本引くこと（MUST）'],
  ['T-258 CQ-3 (MUST) -- only the list scrolls', '挙げる名前を線の下に並べ、面の中でスクロールするのは一覧だけとすること（MUST）'],
  ['T-258 CQ-4 (MUST) -- no names, no line and no list', '挙げる名前が 1 つも無いときは、線も一覧も描かないこと（MUST）'],
]

describe('CR-407 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const H_NAMES = String.fromCodePoint(0x540d, 0x524d, 0x3092, 0x6319, 0x3052, 0x308b, 0x304b)
const LISTS = String.fromCodePoint(0x6319, 0x3052, 0x308b)
const H_DEFAULT = String.fromCodePoint(0x65e2, 0x5b9a)

const T_234 = specTable('T-234')
const NAMING_ROWS = T_234.rows.filter((row) => (row.by[H_NAMES] ?? '').trim().startsWith(LISTS)).map((row) => row.id)
const SILENT_ROWS = T_234.rows.filter((row) => !NAMING_ROWS.includes(row.id)).map((row) => row.id)

const S_242_CELL = bare(specTable('T-206').rows.find((row) => row.id === 'S-242')?.by[H_DEFAULT] ?? '')
const S_242 = Number(/\d+(?:\.\d+)?/.exec(S_242_CELL)?.[0] ?? Number.NaN)

describe('CR-407 -- the premises read from the manuscript', () => {
  it('T-234 names QN-1, QN-2, QN-3 and QN-5 as the questions that list names', () => {
    expect(NAMING_ROWS).toEqual(['QN-1', 'QN-2', 'QN-3', 'QN-5'])
    expect(SILENT_ROWS).toEqual(['QN-4', 'QN-9', 'QN-8'])
  })

  it('S-242 is 1 screen px', () => {
    expect(S_242_CELL).toContain('px')
    expect(S_242).toBe(1)
  })
})

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

const sessionAsking = (raised: RaisedConfirmation): ScreenSession =>
  ({
    language: 'en',
    openedFileName: null,
    fileSavedAt: null,
    isAgentApiEnabled: false,
    isDialogueFieldVisible: true,
    pointer: null,
    pointerRestedMs: 0,
    iconUnderPointer: null,
    commandPaletteAt: { x: 0, y: 0 },
    themePreference: 'light',
    themeHue: 214,
    isMilestoneListOpen: false,
    isPaletteMinimised: false,
    dualCursorFollowing: null,
    selectedGroupIds: [],
    selectedResourceUids: [],
    propertiesShowing: null,
    propertiesSubject: null,
    notices: [],
    confirmation: raised,
    rowBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }) as ScreenSession

const EMPTY_VIEW: ScreenView = {
  language: 'en',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null, openedFileName: null, fileSavedAt: null,
    fileNeverSavedText: '', commands: [], language: 'en',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const NAMES = ['GoingNameOne', 'GoingNameTwo', 'GoingNameThree', 'GoingNameFour'] as const

const itemsNamed = (count: number): readonly ConfirmationItem[] =>
  NAMES.slice(0, count).map((name, index) => ({ name, isShownOnAnotherRow: index === 1 }))

interface Drawn {
  readonly part: FakeElement
  readonly question: string
  readonly mark: string
}

function drawnAsking(question: string, items: readonly ConfirmationItem[]): Drawn {
  const shown = confirmationFromSession(sessionAsking({ manner: 'NT-7', question, items }))
  if (shown === null) throw new Error('a raised question came back as none')
  const built = wire(THEME, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, confirmation: shown })
  const parts = selfAndDescendants(built.root()).filter((one) => one.getAttribute('data-role') === 'Confirmation')
  if (parts.length !== 1) throw new Error(`${parts.length} Confirmation parts are drawn`)
  return { part: parts[0] as FakeElement, question: shown.text, mark: shown.shownOnAnotherRowMark }
}

function innermostShowing(root: FakeElement, text: string): FakeElement {
  const showing = selfAndDescendants(root).filter((one) => one.textContent.includes(text))
  const innermost = showing.filter((one) => !one.children.some((child) => child.textContent.includes(text)))
  if (innermost.length === 0) throw new Error(`nothing shows ${text}: ${whatWasDrawn(root)}`)
  return innermost[0] as FakeElement
}

const answersIn = (part: FakeElement): readonly FakeElement[] =>
  selfAndDescendants(part).filter((one) => one.getAttribute('data-confirmation-answer') !== null)

const scrolls = (element: FakeElement): boolean => {
  const style = styleMap(element)
  const values = [style.get('overflow') ?? '', style.get('overflow-x') ?? '', style.get('overflow-y') ?? '']
  return values.some((value) => value.split(/\s+/).some((one) => one === 'auto' || one === 'scroll'))
}

// WHY: the surface box itself shares the stopping-box overflow of every modal; what CQ-1 and CQ-3 decide
// is which box inside it holds the header and which the names, so the surface box is not counted.
const scrollersIn = (part: FakeElement): readonly FakeElement[] =>
  selfAndDescendants(part).filter((one) => one !== part && scrolls(one))

const order = (part: FakeElement, node: FakeElement): number => selfAndDescendants(part).indexOf(node)

const LINE_PROPERTIES = ['border-top', 'border-bottom', 'border-block-start', 'border-block-end', 'border-top-width', 'border-bottom-width']

const widthToken = (value: string): string =>
  value.split(/\s+/).find((token) => /^(calc\(|var\(|[\d.]+(px|em|rem)?$|thin|medium|thick)/.test(token)) ?? ''

const isDrawn = (value: string | undefined): value is string =>
  value !== undefined && value.trim() !== '' && !/^(none|0|0px)$/.test(value.trim())

function lineNodesIn(part: FakeElement): readonly { node: FakeElement; width: string }[] {
  const found: { node: FakeElement; width: string }[] = []
  for (const node of selfAndDescendants(part)) {
    if (node === part) continue
    const style = styleMap(node)
    const sides = LINE_PROPERTIES.map((property) => style.get(property)).filter(isDrawn)
    const isRuleNode = node.tagName === 'HR' || node.getAttribute('data-confirmation-part') === 'rule'
    const bar =
      node.textContent.trim() === '' && isDrawn(style.get('height')) && isDrawn(style.get('background') ?? style.get('background-color'))
    if (sides.length > 0) {
      for (const side of sides) found.push({ node, width: widthToken(side) })
      continue
    }
    if (bar) {
      found.push({ node, width: widthToken(style.get('height') ?? '') })
      continue
    }
    if (isRuleNode) found.push({ node, width: widthToken(style.get('border') ?? style.get('height') ?? '') })
  }
  return found
}

const QUESTION_WITH_NAMES = NAMING_ROWS.map((row) => [row] as const)

describe('T-258 CQ-1 (MUST / MUST NOT) -- question and answers stand above the names and do not scroll', () => {
  it.each(QUESTION_WITH_NAMES)('%s: the question comes before the answers, and both before every name', (row) => {
    const { part, question } = drawnAsking(row, itemsNamed(NAMES.length))
    const questionAt = order(part, innermostShowing(part, question))
    const answers = answersIn(part)
    expect(answers.length, whatWasDrawn(part)).toBe(2)
    const names = NAMES.map((name) => order(part, innermostShowing(part, name)))
    for (const answer of answers) {
      expect(order(part, answer), 'CQ-1: question, then answers').toBeGreaterThan(questionAt)
      expect(order(part, answer), 'CQ-1: answers above the list').toBeLessThan(Math.min(...names))
    }
  })

  it.each(QUESTION_WITH_NAMES)('%s: no box holding the question or an answer scrolls', (row) => {
    const { part, question } = drawnAsking(row, itemsNamed(NAMES.length))
    const header = [innermostShowing(part, question), ...answersIn(part)]
    for (const scroller of scrollersIn(part)) {
      for (const node of header) expect(scroller.contains(node), whatWasDrawn(scroller).slice(0, 400)).toBe(false)
    }
  })
})

describe('T-258 CQ-3 (MUST) -- the list, and only the list, scrolls', () => {
  it.each(QUESTION_WITH_NAMES)('%s: exactly one box scrolls, and it holds every name', (row) => {
    const { part } = drawnAsking(row, itemsNamed(NAMES.length))
    const scrollers = scrollersIn(part)
    expect(scrollers.length, whatWasDrawn(part).slice(0, 800)).toBe(1)
    for (const name of NAMES) expect((scrollers[0] as FakeElement).contains(innermostShowing(part, name)), name).toBe(true)
  })

  it('QN-1: the shown-on-another-row mark stands in the row of its own name', () => {
    const { part, mark } = drawnAsking('QN-1', itemsNamed(NAMES.length))
    expect(mark).not.toBe('')
    const named = innermostShowing(part, NAMES[1])
    const marks = selfAndDescendants(part).filter(
      (one) => one.textContent.includes(mark) && !one.children.some((child) => child.textContent.includes(mark)),
    )
    expect(marks.length).toBe(1)
    let row: FakeElement | null = named
    while (row !== null && !row.contains(marks[0] as FakeElement)) row = row.parentNode
    expect(row).not.toBeNull()
    const others = NAMES.filter((one) => one !== NAMES[1])
    for (const other of others) expect((row as FakeElement).textContent.includes(other), other).toBe(false)
  })
})

describe('T-258 CQ-2 (MUST) -- one line of S-242 px between the header and the list', () => {
  it.each(QUESTION_WITH_NAMES)('%s: a line stands after the answers and before the first name', (row) => {
    const { part } = drawnAsking(row, itemsNamed(NAMES.length))
    const lastAnswer = Math.max(...answersIn(part).map((one) => order(part, one)))
    const firstName = Math.min(...NAMES.map((name) => order(part, innermostShowing(part, name))))
    const between = lineNodesIn(part).filter((one) => {
      const at = order(part, one.node)
      const holdsName = NAMES.some((name) => one.node.textContent.includes(name))
      const holdsAnswer = answersIn(part).some((answer) => one.node.contains(answer))
      const isListBox = holdsName && at < firstName && at > lastAnswer
      const isHeaderBox = holdsAnswer && !holdsName
      return (at > lastAnswer && at < firstName) || isListBox || isHeaderBox
    })
    expect(between.length, whatWasDrawn(part).slice(0, 1200)).toBe(1)
  })

  it.each(QUESTION_WITH_NAMES)('%s: that line is written as S-242 px, not scaled', (row) => {
    const { part } = drawnAsking(row, itemsNamed(NAMES.length))
    const lines = lineNodesIn(part)
    expect(lines.length, whatWasDrawn(part).slice(0, 800)).toBeGreaterThan(0)
    for (const line of lines) expect(line.width).toBe(`${S_242}px`)
  })

  it.skip('CQ-2: the line runs the full width of the surface -- needs layout, only a browser can measure it', () => {})
})

describe('T-258 CQ-4 (MUST) and the questions that list nothing', () => {
  it.each(QUESTION_WITH_NAMES)('%s with no names: no line and no scrolling list', (row) => {
    const { part } = drawnAsking(row, [])
    expect(lineNodesIn(part), whatWasDrawn(part)).toEqual([])
    expect(scrollersIn(part).map((one) => whatWasDrawn(one).slice(0, 200))).toEqual([])
  })

  it.each(SILENT_ROWS.map((row) => [row] as const))('%s: names nothing, so no line is drawn', (row) => {
    const { part } = drawnAsking(row, [])
    expect(lineNodesIn(part), whatWasDrawn(part)).toEqual([])
  })

  it.each(QUESTION_WITH_NAMES)('%s with no names: the question and both answers are still drawn', (row) => {
    const { part, question } = drawnAsking(row, [])
    expect(innermostShowing(part, question)).toBeDefined()
    expect(answersIn(part).length).toBe(2)
  })
})
