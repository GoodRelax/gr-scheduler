// Unit tests: the Watermark Unlock surface (U-60) that FR-020 raises.

import { describe, expect, it } from 'vitest'

import { openModalFromSession } from '../../src/adapter/screen-renderer/open-modals'
import type {
  ConfirmationAnswer,
  DisplayLanguage,
  OpenModal,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import iconRoster from '../../src/adapter/screen-renderer/icon-roster.json'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { AppHeaderItems, ScreenFrame, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  domScreenSurface,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { WATERMARK_UNLOCK_DIGEST } from '../../src/framework/single-html-shell/frame-loop'
import { descendants, stage, type FakeElement } from '../fixtures/fake-browser'
import { bare, specTable } from '../contract/spec-table'

// Why: read out of the glossary, so a rename of the surface fails these
// cases instead of leaving them asserting a name nothing carries.
const U_60 = (() => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-60')
  if (row === undefined) throw new Error('table T-103 no longer has row U-60')
  return bare(row.cells[0] ?? '')
})()

const U_60_ROW = 'U-60'

const QN_9 = 'QN-9'

const RS_41 = 'RS-41'

// Spec: FR-038
const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

const scheduleOf = (): Schedule =>
  ({
    project: {
      id: null,
      name: null,
      title: null,
      subject: null,
      category: null,
      company: null,
      manager: null,
      author: null,
      creationDate: null,
      revision: null,
      startDate: null,
      statusDate: null,
      minutesPerDay: null,
      minutesPerWeek: null,
      daysPerMonth: null,
      weekStartDay: null,
      calendarUid: null,
      defaultStartTime: null,
      defaultFinishTime: null,
      themeHue: 214,
      uidHighWaterMark: 0,
      importSequence: 0,
      carry: {},
      carryElements: [],
    },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const EMPTY_DOCUMENT = scheduleOf()

const readingsOf = (): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer: null,
    pointerRestedMs: 0,
    hintTargetDwellMs: 0,
    iconUnderPointer: null,
    commandPaletteAt: { x: 0, y: 0 },
    themePreference: 'light',
    themeHue: 214,
    selectedTaskGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
  }) as unknown as ScreenViewReadings

const rootOn = (language: DisplayLanguage, surface: string | null): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage: language,
    helpLanguage: language,
    openSurfaceState: surface === null ? { kind: 'closed' } : { kind: 'open', surfaceName: surface },
  },
})

function describedOn(language: DisplayLanguage): OpenModal {
  const modal = openModalFromSession(
    rootOn(language, U_60_ROW),
    EMPTY_DOCUMENT,
    readingsOf(),
    SETTINGS_DEFAULTS as unknown as DocumentSettings,
  )
  expect(modal, `S-99g holds ${U_60_ROW}, so UF-66 describes a surface`).not.toBeNull()
  return modal as OpenModal
}

function questionWord(row: string, language: DisplayLanguage): string {
  const entry = displayWords.questions.find((one) => one.specTableRowId === row)
  if (entry === undefined) throw new Error(`the dictionary holds no question ${row}`)
  return entry.text[language]
}

describe('FR-020 -- U-60 `Watermark Unlock` as UF-66 describes it', () => {
  it('is described at all while S-99g holds its row', () => {
    // Why: S-99g is where an open surface's name stands, so a name there must
    // come back described, or the press raises something nothing draws.
    for (const language of LANGUAGES) {
      expect(describedOn(language).surface, `S-99g holds ${U_60_ROW}`).toBe(U_60)
    }
  })

  it('shows QN-9 of table T-234 and nothing minted beside it', () => {
    for (const language of LANGUAGES) {
      const shown = describedOn(language)
      expect('question' in shown, `${U_60} carries the sentence QN-9 holds`).toBe(true)
      expect((shown as { question: string }).question).toBe(questionWord(QN_9, language))
    }
  })

  it('says the two languages differently, so neither is the other one printed twice', () => {
    // Why: a surface that answered the same string for both languages would
    // pass the case above and still be untranslated.
    const ja = (describedOn('ja') as { question: string }).question
    const en = (describedOn('en') as { question: string }).question
    expect(ja).not.toBe(en)
    expect(ja).not.toBe('')
    expect(en).not.toBe('')
  })

  // Spec: NT-7
  it('carries two answers, spelled the same in every display language', () => {
    const dictionary = displayWords.confirmation
    for (const language of LANGUAGES) {
      const answers = (describedOn(language) as { answers: readonly ConfirmationAnswer[] }).answers
      expect(answers.length, 'FR-020 asks for two entrances').toBe(dictionary.length)
      expect(answers.map((one) => one.answer)).toEqual(dictionary.map((one) => one.answer))
      expect(answers.map((one) => one.text)).toEqual(
        dictionary.map((one) => one.text[language]),
      )
    }
    const ja = (describedOn('ja') as { answers: readonly ConfirmationAnswer[] }).answers
    const en = (describedOn('en') as { answers: readonly ConfirmationAnswer[] }).answers
    expect(ja.map((one) => one.text)).toEqual(en.map((one) => one.text))
  })

  it('gives neither answer a row of table T-109', () => {
    // Why: read off the generated roster, which is table T-109 generated into
    // src/, rather than off a list typed here.
    const rows = new Set(iconRoster.icons.map((one) => one.specTableRowId))
    const answers = (describedOn('ja') as { answers: readonly ConfirmationAnswer[] }).answers
    for (const answer of answers) {
      expect(rows.has(answer.answer), `${answer.answer} is not a row of table T-109`).toBe(false)
    }
  })

  it('is given no entrance of table T-109 at all', () => {
    expect(describedOn('ja').commands).toEqual([])
    const placed = iconRoster.icons.filter((one) => one.surfaces.includes(U_60))
    expect(placed.map((one) => one.specTableRowId), `table T-109 places nothing on ${U_60}`).toEqual([])
  })
})

describe('FR-020 -- the reason a mismatch is told with', () => {
  it('is RS-41 of table T-233, whose manner is NT-3a', () => {
    const row = specTable('T-233').rows.find((one) => one.id === RS_41)
    expect(row, 'table T-233 no longer has row RS-41').not.toBeUndefined()
    expect(bare(row?.cells[1] ?? '')).toBe('NT-3a')
  })

  // Spec: NT-1, NT-3a
  it('has words and a next step in both display languages', () => {
    // Why: FR-020 puts no cap on the tries, so trying again is a real next step,
    // which is why this row exists rather than RS-15 answering for it.
    const entry = displayWords.reasons.find((one) => one.specTableRowId === RS_41)
    expect(entry, 'the dictionary holds no reason RS-41').not.toBeUndefined()
    for (const language of LANGUAGES) {
      expect(entry?.text[language]).not.toBe('')
      expect(entry?.nextStep[language]).not.toBe('')
    }
  })
})

const FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const HEADER: AppHeaderItems = {
  documentTitle: '',
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
} as unknown as AppHeaderItems

const S_73 = specTable('T-216').rows.find((one) => one.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')

const THEME: ScreenTheme = {
  preference: emptyScreenSession.screen.themePreference,
  hue: Number(bare(S_73.by['既定'] ?? '')),
}

function drawnOn(language: DisplayLanguage): FakeElement {
  const built = stage()
  const surface = domScreenSurface({
    host: built.host,
    mount: built.mount as unknown as Element,
    readClockMs: (): number => 0,
    onAppHeaderHeightMeasured: (): void => {},
    readTheme: (): ScreenTheme => THEME,
  })
  const view: ScreenView = {
    language,
    frame: FRAME,
    appHeaderItems: HEADER,
    taskGroupPanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: describedOn(language),
    notices: [],
    confirmation: null,
    tooltips: [],
  } as unknown as ScreenView
  surface.showScreenView(view)
  const found = descendants(built.root()).filter(
    (one) => one.getAttribute('data-role') === U_60,
  )
  expect(found.length, `exactly one part named ${U_60} is drawn`).toBe(1)
  const first = found[0]
  if (first === undefined) throw new Error('unreachable')
  return first
}

describe('FR-020 -- how U-60 is drawn', () => {
  it('draws the answer masked', () => {
    // Why: a field the host masks is what can actually hide the characters; a
    // mask this unit painted would leave them in the tree under it.
    const typed = descendants(drawnOn('ja')).filter((one) => one.tagName === 'INPUT')
    expect(typed.length, 'FR-020 asks for one place to type the answer').toBe(1)
    expect(typed[0]?.getAttribute('type')).toBe('password')
  })

  // Spec: WM-7
  it('draws the two answers as words, with no shape and no row of table T-109', () => {
    const drawn = drawnOn('ja')
    const answers = descendants(drawn).filter(
      (one) => one.getAttribute('data-confirmation-answer') !== null,
    )
    const dictionary = displayWords.confirmation
    expect(answers.length).toBe(dictionary.length)
    expect(answers.map((one) => one.getAttribute('data-confirmation-answer'))).toEqual(
      dictionary.map((one) => one.answer),
    )
    for (const answer of answers) {
      expect(answer.tagName).toBe('BUTTON')
      expect(answer.getAttribute('data-icon'), 'a word button carries no shape').toBeNull()
    }
    expect(answers.map((one) => one.textContent)).toEqual(
      dictionary.map((one) => one.text['ja']),
    )
  })

  it('draws the first character of each answer bold', () => {
    const answers = descendants(drawnOn('en')).filter(
      (one) => one.getAttribute('data-confirmation-answer') !== null,
    )
    expect(answers.length).toBeGreaterThan(0)
    for (const answer of answers) {
      const head = answer.children[0]
      expect(head, 'the word is drawn in two pieces, head first').not.toBeUndefined()
      expect(head?.textContent.length, 'the head is one character').toBe(1)
      expect(head?.getAttribute('style') ?? '').toContain('font-weight:bold')
    }
  })

  it('draws the sentence QN-9 holds on the surface itself', () => {
    for (const language of LANGUAGES) {
      expect(drawnOn(language).textContent).toContain(questionWord(QN_9, language))
    }
  })
})

describe('FR-020 -- the default watermark unlock digest', () => {
  it('is the value table T-207 states at S-101', () => {
    // Why: change S-101 in the manuscript and this goes red, which shows the
    // value reaches src/ rather than having been typed there once.
    const row = specTable('T-207').rows.find((one) => one.id === 'S-101')
    expect(row, 'table T-207 no longer has row S-101').not.toBeUndefined()
    expect(WATERMARK_UNLOCK_DIGEST['S-101']).toBe(bare(row?.by['値'] ?? ''))
  })

  // Spec: WM-12
  it('is a SHA-256 and not the password itself', () => {
    // Why: two readings, because either alone is weak: the shape is a 64-digit
    // lower-case hexadecimal string, and it is not S-100.
    const password = specTable('T-207').rows.find((one) => one.id === 'S-100')
    expect(password, 'table T-207 no longer has row S-100').not.toBeUndefined()
    expect(WATERMARK_UNLOCK_DIGEST['S-101']).toMatch(/^[0-9a-f]{64}$/)
    expect(WATERMARK_UNLOCK_DIGEST['S-101']).not.toBe(bare(password?.by['値'] ?? ''))
  })
})
