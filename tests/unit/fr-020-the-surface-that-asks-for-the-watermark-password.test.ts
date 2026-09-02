// Unit tests for the surface FR-020 (MUST) raises before the watermark may be
// hidden -- U-60 `Watermark Unlock` of table T-103 (利用者の裁定 2026-08-31,
// CR-329, ledger row D-147).
//
// The units driven are UF-66 `open-modals.ts` (`ScreenRenderer`, CP-19 of table
// T-062) and UF-71 `dom-screen-surface.ts` (`DomScreenSurface`, CP-38), plus
// the value table T-207 states for the default digest.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// The rows these cases answer to (rule 03: name the row, never copy its prose):
//   FR-020   the surface, the masked answer, the two word buttons, the match by
//            SHA-256, the write on a match alone, and the MUST NOT against a
//            symmetric toggle
//   T-103    U-60 `Watermark Unlock` -- the settled name S-99g carries
//   T-234    QN-9 -- the sentence the surface shows
//   T-233    RS-41 -- the reason a mismatch is told with, and its manner NT-3a
//   T-037    NT-7 -- the manner FR-020 sends the two word buttons'作法 to
//   T-109    the roster of SHAPE entrances, which (MUST NOT) holds no row for
//            either answer and holds none for this surface
//   T-207    S-100 / S-101 -- the default password and the digest of it that
//            the artifact embeds
//
// ⛔ EVERY EXPECTED VALUE BELOW COMES FROM docs/spec OR FROM THE GENERATED
// DICTIONARY, never from a string typed here: the words are read out of
// `display-words.json` (which Chapter 6.2 generates from the manuscript) and
// the digest out of table T-207 itself.

import { describe, expect, it } from 'vitest'

import { openModalFromScreenState } from '../../src/adapter/screen-renderer/open-modals'
import type {
  ConfirmationAnswer,
  DisplayLanguage,
  OpenModal,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import iconRoster from '../../src/adapter/screen-renderer/icon-roster.json'
import {
  emptyScreenState,
  screenStateWithSurface,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { AppHeaderItems, ScreenFrame, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  domScreenSurface,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { WATERMARK_UNLOCK_DIGEST } from '../../src/framework/single-html-shell/frame-loop'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { descendants, stage, type FakeElement } from '../fixtures/fake-browser'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Fixed copies of the rows these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * U-60 of table T-103 -- the settled name, read out of the glossary rather than
 * typed here, so that a rename of the surface fails these cases rather than
 * leaving them asserting a name nothing carries.
 */
const U_60 = (() => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-60')
  if (row === undefined) throw new Error('table T-103 no longer has row U-60')
  return bare(row.cells[0] ?? '')
})()

/** QN-9 of table T-234 -- the row FR-020 names as this surface's question. */
const QN_9 = 'QN-9'

/** RS-41 of table T-233 -- the reason a mismatch is told with. */
const RS_41 = 'RS-41'

/** The two display languages FR-038 admits. */
const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

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
      created: null,
      revision: null,
      lastSaved: null,
      startDate: null,
      statusDate: null,
      minutesPerDay: null,
      minutesPerWeek: null,
      daysPerMonth: null,
      weekStartDay: null,
      calendarUid: null,
      themeHue: 214,
      uidHighWaterMark: 0,
      importSeq: 0,
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

const sessionOf = (language: DisplayLanguage): ScreenSession =>
  ({
    language,
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
    confirmation: null,
    rowBoxes: [],
  }) as unknown as ScreenSession

const stateOn = (surface: string | null): ScreenState =>
  screenStateWithSurface(emptyScreenState(), surface)

/** The surface as UF-66 describes it, with the case failed where none is. */
function describedOn(language: DisplayLanguage): OpenModal {
  const modal = openModalFromScreenState(stateOn(U_60), EMPTY_DOCUMENT, sessionOf(language))
  expect(modal, `S-99g holds ${U_60}, so UF-66 describes a surface`).not.toBeNull()
  return modal as OpenModal
}

/** The sentence the dictionary holds for one row of table T-234. */
function questionWord(row: string, language: DisplayLanguage): string {
  const entry = displayWords.questions.find((one) => one.rowId === row)
  if (entry === undefined) throw new Error(`the dictionary holds no question ${row}`)
  return entry.text[language]
}

// ---------------------------------------------------------------------------
// UF-66 -- what the surface says
// ---------------------------------------------------------------------------

describe('FR-020 -- U-60 `Watermark Unlock` as UF-66 describes it', () => {
  it('is described at all while S-99g holds its name', () => {
    // FR-020 (MUST): the press raises this surface, and S-99g is where the name
    // of an open surface stands -- so a name there has to come back described,
    // or the press raises something nothing draws.
    for (const language of LANGUAGES) {
      expect(describedOn(language).surface, `S-99g holds ${U_60}`).toBe(U_60)
    }
  })

  it('shows QN-9 of table T-234 and nothing minted beside it', () => {
    // FR-020 (MUST): 「問いの文は 表 T-234 の `QN-9` とすること」, and FR-038
    // (MUST NOT) keeps the words themselves in the one generated dictionary --
    // so the sentence shown IS that row's, in each display language.
    for (const language of LANGUAGES) {
      const shown = describedOn(language)
      expect('question' in shown, `${U_60} carries the sentence QN-9 holds`).toBe(true)
      expect((shown as { question: string }).question).toBe(questionWord(QN_9, language))
    }
  })

  it('says the two languages differently, so neither is the other one printed twice', () => {
    // FR-038 (MUST): one dictionary per language. ⚠️ A surface that answered the
    // same string for both would pass the case above and still be untranslated.
    const ja = (describedOn('ja') as { question: string }).question
    const en = (describedOn('en') as { question: string }).question
    expect(ja).not.toBe(en)
    expect(ja).not.toBe('')
    expect(en).not.toBe('')
  })

  it('carries two answers, spelled the same in every display language', () => {
    // FR-020 (MUST): 「答えの入口は 2 つとし、語のボタンとすること」, with the
    // 作法 NT-7 of table T-037 defines for word buttons -- which (MUST) has them
    // spelled `Yes` / `No` in every display language and (MUST NOT) forbids
    // translating them.
    const dictionary = displayWords.confirmation
    for (const language of LANGUAGES) {
      const answers = (describedOn(language) as { answers: readonly ConfirmationAnswer[] }).answers
      expect(answers.length, 'FR-020 asks for two entrances').toBe(dictionary.length)
      expect(answers.map((one) => one.answer)).toEqual(dictionary.map((one) => one.answer))
      expect(answers.map((one) => one.text)).toEqual(
        dictionary.map((one) => one.text[language]),
      )
    }
    // The same words in both, which is the MUST NOT stated above.
    const ja = (describedOn('ja') as { answers: readonly ConfirmationAnswer[] }).answers
    const en = (describedOn('en') as { answers: readonly ConfirmationAnswer[] }).answers
    expect(ja.map((one) => one.text)).toEqual(en.map((one) => one.text))
  })

  it('gives neither answer a row of table T-109', () => {
    // FR-020 (MUST NOT): 「表 T-109 の行を与えてはならない」 -- that table and
    // figure F-019 hold the entrances that are SHAPES, and a word button has
    // none. ⭐ Read off the generated roster rather than off a list here: it is
    // table T-109 generated into `src/`.
    const rows = new Set(iconRoster.icons.map((one) => one.rowId))
    const answers = (describedOn('ja') as { answers: readonly ConfirmationAnswer[] }).answers
    for (const answer of answers) {
      expect(rows.has(answer.answer), `${answer.answer} is not a row of table T-109`).toBe(false)
    }
  })

  it('is given no entrance of table T-109 at all', () => {
    // FR-029 (MUST) makes that table's surface column the whole of the
    // placement, and no row of it names U-60 -- so the way off this surface is
    // the first level of `Esc` (IN-4 of table T-028), which FR-020 (MUST) names.
    expect(describedOn('ja').commands).toEqual([])
    const placed = iconRoster.icons.filter((one) => one.surfaces.includes(U_60))
    expect(placed.map((one) => one.rowId), `table T-109 places nothing on ${U_60}`).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Table T-233 -- the reason a mismatch carries
// ---------------------------------------------------------------------------

describe('FR-020 -- the reason a mismatch is told with', () => {
  it('is RS-41 of table T-233, whose manner is NT-3a', () => {
    // FR-020 (MUST): 「合わなかったときは、面を閉じずに理由を告げること」, and
    // the reason is RS-41. Its manner column is what a raiser has to carry.
    const row = specTable('T-233').rows.find((one) => one.id === RS_41)
    expect(row, 'table T-233 no longer has row RS-41').not.toBeUndefined()
    expect(bare(row?.cells[1] ?? '')).toBe('NT-3a')
  })

  it('has words and a next step in both display languages', () => {
    // NT-1 (MUST) asks for the words and NT-3a (MUST) for the next step;
    // FR-020 (MUST NOT) puts no cap on the tries, so trying again really is
    // what a person can do next -- which is why this row exists rather than
    // RS-15 answering for it.
    const entry = displayWords.reasons.find((one) => one.rowId === RS_41)
    expect(entry, 'the dictionary holds no reason RS-41').not.toBeUndefined()
    for (const language of LANGUAGES) {
      expect(entry?.text[language]).not.toBe('')
      expect(entry?.nextStep[language]).not.toBe('')
    }
  })
})

// ---------------------------------------------------------------------------
// UF-71 -- how the surface is drawn
// ---------------------------------------------------------------------------

const FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const HEADER: AppHeaderItems = {
  documentTitle: '',
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
} as unknown as AppHeaderItems

const S_73 = specTable('T-216').rows.find((one) => one.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')

/**
 * ⛔ S-72's default is read from the generated `SETTINGS_DEFAULTS` and S-73's
 * out of table T-216, for the reason rule 03 section 1 gives: a value the
 * manuscript holds goes stale the moment it is copied.
 */
const THEME: ScreenTheme = {
  preference: SETTINGS_DEFAULTS['themePreference'] as ScreenTheme['preference'],
  hue: Number(bare(S_73.by['既定'] ?? '')),
}

/** The surface as UF-71 draws it, out of the description UF-66 built. */
function drawnOn(language: DisplayLanguage): FakeElement {
  const built = stage()
  const surface = domScreenSurface({
    host: built.host,
    mount: built.mount as unknown as Element,
    readAuthor: (): string => '',
    readClockMs: (): number => 0,
    onAppHeaderHeightPx: (): void => {},
    readTheme: (): ScreenTheme => THEME,
  })
  const view: ScreenView = {
    language,
    frame: FRAME,
    appHeaderItems: HEADER,
    rowTitlePanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: describedOn(language),
    notices: [],
    confirmation: null,
    dialogueField: null,
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
    // FR-020 (MUST): 「答えは打ち込む文字とし、伏せて描くこと」 -- 「証跡の面で
    // あっても、打っている文字が肩越しに読めてよい理由は無い」. ⭐ A field the
    // host masks, which is what an environment can actually hide characters
    // with; a mask this unit painted would leave them in the tree under it.
    const typed = descendants(drawnOn('ja')).filter((one) => one.tagName === 'INPUT')
    expect(typed.length, 'FR-020 asks for one place to type the answer').toBe(1)
    expect(typed[0]?.getAttribute('type')).toBe('password')
  })

  it('draws the two answers as words, with no shape and no row of table T-109', () => {
    // FR-020 (MUST): the two entrances are word buttons, 「作法は 表 T-037 の
    // `NT-7` が語のボタンについて定めるものに従う」. ⛔ (MUST NOT) 「表 T-109 の
    // 行を与えてはならない」 -- so neither carries a shape of figure F-019, which
    // is what `data-icon` names.
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
    // NT-7 (MUST): 「頭の 1 文字（`Y` と `N`）を太字にすること」 -- 「打鍵で答え
    // られることを、ボタン自身に名乗らせるためである」, which FR-020 sends U-60's
    // word buttons to.
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
    // FR-020 (MUST): the question is QN-9's, and FR-038 (MUST) keeps the words
    // the dictionary's -- so what stands on the surface IS that entry.
    for (const language of LANGUAGES) {
      expect(drawnOn(language).textContent).toContain(questionWord(QN_9, language))
    }
  })
})

// ---------------------------------------------------------------------------
// Table T-207 -- the digest the artifact embeds
// ---------------------------------------------------------------------------

describe('FR-020 -- the default watermark unlock digest', () => {
  it('is the value table T-207 states at S-101', () => {
    // FR-020 (MUST): 「既定の透かし解除パスワードを定め、その SHA-256 だけを成果
    // 物へ定数として埋め込むこと」, and table T-207 is where the value stands.
    // ⭐ THIS IS THE ACCEPTANCE TEST RULE 04 SECTION 2 ASKS FOR: change S-101 in
    // the manuscript and this case goes red, which is what says the value
    // actually reaches `src/` rather than having been typed there once.
    const row = specTable('T-207').rows.find((one) => one.id === 'S-101')
    expect(row, 'table T-207 no longer has row S-101').not.toBeUndefined()
    expect(WATERMARK_UNLOCK_DIGEST['S-101']).toBe(bare(row?.by['値'] ?? ''))
  })

  it('is a SHA-256 and not the password itself', () => {
    // FR-020 (MUST NOT): 「生の透かし解除パスワードをコード・モデル・出力に保存
    // してはならない」. ⭐ Two readings, because either alone is weak: the shape
    // is a 64-digit lower-case hexadecimal string, and it is not S-100.
    const password = specTable('T-207').rows.find((one) => one.id === 'S-100')
    expect(password, 'table T-207 no longer has row S-100').not.toBeUndefined()
    expect(WATERMARK_UNLOCK_DIGEST['S-101']).toMatch(/^[0-9a-f]{64}$/)
    expect(WATERMARK_UNLOCK_DIGEST['S-101']).not.toBe(bare(password?.by['値'] ?? ''))
  })
})
