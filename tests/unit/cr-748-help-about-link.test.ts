// CR-748 (re-pointed by CR-785): FR-036 puts the about link, the lower of two, above the frame of the basics block, in the help language.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { helpModalFromSession } from '../../src/adapter/screen-renderer/open-modals'
import type { DisplayLanguage, HelpModal, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { oneByRole, selfAndDescendants, surfaceOf, whatWasDrawn, wire, type FakeElement } from '../fixtures/fake-browser'


const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const RULE_OPENING = String.fromCodePoint(0x2b50, 0x20, 0x30d8, 0x30eb, 0x30d7, 0x306f, 0x3001, 0x57fa, 0x672c, 0x64cd, 0x4f5c, 0x306e, 0x584a, 0xff08, 0x8f9e, 0x66f8, 0x306e, 0x898b, 0x51fa, 0x3057, 0x306e, 0x20, 0x60, 0x62, 0x61, 0x73, 0x69, 0x63, 0x73, 0x60, 0xff09, 0x306e, 0x67a0, 0x306e, 0x3059, 0x3050, 0x4e0a, 0x306b)

const WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as { readonly helpLinks?: readonly { readonly link: string; readonly text: Record<string, string> }[] }

const ABOUT_ENTRIES = (WORDS.helpLinks ?? []).filter((one) => one.link === 'about')

const T_206 = specTable('T-206')
const H_DEFAULT = String.fromCodePoint(0x65e2, 0x5b9a)

function addressOfS583(): string {
  const row = T_206.rows.find((one) => one.id === 'S-583')
  if (row === undefined) throw new Error('table T-206 no longer has row S-583')
  return bare(row.by[H_DEFAULT] ?? '')
}

const BASE_ADDRESS = addressOfS583()

const wordsFor = (language: DisplayLanguage): string => ABOUT_ENTRIES[0]?.text[language] ?? ''
const addressFor = (language: DisplayLanguage): string => `${BASE_ADDRESS}?lang=${language}`

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

describe('CR-748 -- the premises read from the specification', () => {
  it('FR-036 still carries the paragraph that places the link above the basics block', () => {
    expect(REQUIREMENTS).toContain(RULE_OPENING)
  })

  it('the dictionary holds exactly one `about` entry with words in both languages', () => {
    expect(ABOUT_ENTRIES).toHaveLength(1)
    for (const language of LANGUAGES) expect(wordsFor(language), language).not.toBe('')
    expect(wordsFor('ja')).not.toBe(wordsFor('en'))
  })

  it('S-583 states an https address that carries no query of its own', () => {
    expect(BASE_ADDRESS).toMatch(/^https:\/\/\S+$/)
    expect(BASE_ADDRESS).not.toContain('?')
    expect(BASE_ADDRESS).not.toContain('`')
  })
})


const AREA = { belowAppHeader: { x: 0, y: 37, width: 1280, height: 763 } }

function sessionWith(helpLanguage: DisplayLanguage, screenLanguage: DisplayLanguage = helpLanguage): ScreenSession {
  const root: ScreenSession = {
    ...emptyScreenSession,
    screen: { ...emptyScreenSession.screen, screenLanguage, helpLanguage },
  }
  return {
    ...root,
    screen: { ...root.screen, helpDisplayState: { kind: 'shown', child: { kind: 'normal' } } },
  } as unknown as ScreenSession
}

function helpModal(helpLanguage: DisplayLanguage, screenLanguage: DisplayLanguage = helpLanguage): HelpModal {
  const modal = helpModalFromSession(sessionWith(helpLanguage, screenLanguage), AREA)
  if (modal === null) throw new Error('the help is open but nothing describes it')
  return modal
}

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

const EMPTY_VIEW: ScreenView = {
  language: 'en',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'en',
  },
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

function drawnHelp(helpLanguage: DisplayLanguage, screenLanguage: DisplayLanguage = helpLanguage): FakeElement {
  const built = wire(THEME, { 'App Header': 37 })
  surfaceOf(built).showScreenView({
    ...EMPTY_VIEW,
    language: screenLanguage,
    helpModal: helpModal(helpLanguage, screenLanguage),
  })
  return oneByRole(built.root(), 'Help Modal')
}

const withAttribute = (root: FakeElement, name: string, value: string): FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.getAttribute(name) === value)

function declared(element: FakeElement, name: string): string {
  const attribute = element.getAttribute(name)
  if (attribute !== null) return attribute
  const property = (element as unknown as Record<string, unknown>)[name]
  return typeof property === 'string' ? property : ''
}

function theAboutLine(help: FakeElement): FakeElement {
  const found = withAttribute(help, 'data-help-link', 'about')
  if (found.length !== 1) {
    throw new Error(`expected exactly one [data-help-link="about"], found ${found.length}: ${whatWasDrawn(help).slice(0, 600)}`)
  }
  return found[0] as FakeElement
}

function theAnchorIn(line: FakeElement): FakeElement {
  const anchors = selfAndDescendants(line).filter((one) => one.tagName === 'A')
  if (anchors.length !== 1) throw new Error(`the about line holds ${anchors.length} anchors: ${whatWasDrawn(line)}`)
  return anchors[0] as FakeElement
}

function theBasicsBlock(help: FakeElement): FakeElement {
  const found = withAttribute(help, 'data-help-block', 'basics')
  if (found.length !== 1) throw new Error(`expected one [data-help-block="basics"], found ${found.length}`)
  return found[0] as FakeElement
}

function frameOfBlock(block: FakeElement, column: FakeElement): FakeElement {
  let at: FakeElement = block
  while (at.parentNode !== null && at.parentNode !== column) at = at.parentNode
  return at
}

const previousElementOf = (element: FakeElement): FakeElement | null => {
  const siblings = element.parentNode?.children ?? []
  const at = siblings.indexOf(element)
  return at > 0 ? (siblings[at - 1] as FakeElement) : null
}


describe('FR-036 (MUST) -- the help carries the about link, in the help language', () => {
  it.each(LANGUAGES)('%s: the words are the dictionary words for that language', (language) => {
    expect(helpModal(language).aboutLink.words).toBe(wordsFor(language))
  })

  it.each(LANGUAGES)('%s: the address is S-583 plus ?lang= plus the help language', (language) => {
    const modal = helpModal(language)
    expect(modal.helpLanguage).toBe(language)
    expect(modal.aboutLink.address).toBe(addressFor(language))
  })

  it('switching the help language changes both the words and the lang in the address', () => {
    const ja = helpModal('ja').aboutLink
    const en = helpModal('en').aboutLink
    expect(en.words).not.toBe(ja.words)
    expect(en.address).not.toBe(ja.address)
    expect(ja.address).toMatch(/\?lang=ja$/)
    expect(en.address).toMatch(/\?lang=en$/)
    expect(en.address.replace(/\?lang=en$/, '')).toBe(ja.address.replace(/\?lang=ja$/, ''))
  })

  it.each(LANGUAGES)('%s: the address follows the HELP language, not the screen language', (language) => {
    const other: DisplayLanguage = language === 'ja' ? 'en' : 'ja'
    const modal = helpModal(language, other)
    expect(modal.helpLanguage).toBe(language)
    expect(modal.aboutLink.address).toBe(addressFor(language))
  })
})


describe('FR-036 (MUST) -- the about line is drawn right above the frame of the basics block', () => {
  it.each(LANGUAGES)('%s: exactly one [data-help-link="about"] is drawn', (language) => {
    const help = drawnHelp(language)
    expect(withAttribute(help, 'data-help-link', 'about')).toHaveLength(1)
  })

  it.each(LANGUAGES)('%s: it stands in the column of the basics block, as the element right before its frame', (language) => {
    const help = drawnHelp(language)
    const line = theAboutLine(help)
    const block = theBasicsBlock(help)

    const columnOfLine = line.closest('[data-help-column]')
    const columnOfBlock = block.closest('[data-help-column]')
    expect(columnOfLine, 'the about line is in no help column').not.toBeNull()
    expect(columnOfLine).toBe(columnOfBlock)

    const frame = frameOfBlock(block, columnOfBlock as FakeElement)
    expect(line.parentNode, `the column reads ${whatWasDrawn(columnOfBlock as FakeElement).slice(0, 500)}`).toBe(frame.parentNode)
    expect(previousElementOf(frame)).toBe(line)
  })

  it.each(LANGUAGES)('%s: it is a link to the address, opened in a new tab, with noopener', (language) => {
    const help = drawnHelp(language)
    const anchor = theAnchorIn(theAboutLine(help))
    expect(declared(anchor, 'href')).toBe(addressFor(language))
    expect(declared(anchor, 'target')).toBe('_blank')
    expect(declared(anchor, 'rel')).toContain('noopener')
  })

  it.each(LANGUAGES)('%s: the line shows the dictionary words for that language', (language) => {
    const line = theAboutLine(drawnHelp(language))
    expect(line.textContent).toContain(wordsFor(language))
  })

  it('switching the help language changes the words and the lang of the drawn link', () => {
    const ja = theAboutLine(drawnHelp('ja'))
    const en = theAboutLine(drawnHelp('en'))
    expect(ja.textContent).toContain(wordsFor('ja'))
    expect(en.textContent).toContain(wordsFor('en'))
    expect(ja.textContent).not.toContain(wordsFor('en'))
    expect(en.textContent).not.toContain(wordsFor('ja'))
    expect(declared(theAnchorIn(ja), 'href')).toMatch(/\?lang=ja$/)
    expect(declared(theAnchorIn(en), 'href')).toMatch(/\?lang=en$/)
  })

  it.each(LANGUAGES)('%s: the drawn address follows the help language when the screen language differs', (language) => {
    const other: DisplayLanguage = language === 'ja' ? 'en' : 'ja'
    const anchor = theAnchorIn(theAboutLine(drawnHelp(language, other)))
    expect(declared(anchor, 'href')).toBe(addressFor(language))
  })
})
