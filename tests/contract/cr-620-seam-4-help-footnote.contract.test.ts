// CR-620 spec-only tests: SEAM-4, the help's note *1 and the IC-20 item (FR-036, FR-038, FR-073, S-350) through screenViewFromRegions (PI-37).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DOWNLOAD_ADDRESS, DOWNLOAD_URL_SEAT, withDownloadAddress } from '../fixtures/download-address'

import {
  SETTINGS_DEFAULTS,
  SETTINGS_CONSTANTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { emptyDialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ScreenRect, ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  screenViewFromRegions,
  type DisplayLanguage,
  type HelpFootnote,
  type HelpModal,
  type LinkedWords,
  type ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'

type Words = Readonly<Record<string, string>>

interface Manuscript {
  readonly helpFootnotes?: readonly { readonly footnote: number; readonly text: Words }[]
  readonly helpNotes?: readonly { readonly rowId: string; readonly text: Words }[]
}

const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as Manuscript

const FOOTNOTES = MANUSCRIPT.helpFootnotes ?? []

const helpNoteOf = (rowId: string, language: DisplayLanguage): string => {
  const found = (MANUSCRIPT.helpNotes ?? []).find((one) => one.rowId === rowId)?.text[language]
  if (found === undefined) throw new Error(`the dictionary has no helpNotes ${rowId} in ${language}`)
  return found
}

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en'] as DisplayLanguage[]

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({ x, y, width, height })

const SETTINGS = { ...SETTINGS_DEFAULTS, rowTitlePanelWidth: 400 } as unknown as DocumentSettings

const REGIONS: ScreenRegions = (() => {
  const width = 1920
  const height = 1080
  const headerHeight = 56
  const rulerHeight = 48
  const titleWidth = SETTINGS.rowTitlePanelWidth
  const propertiesWidth = 300
  const padding = SETTINGS_CONSTANTS.canvasPadding
  const barThickness = 8
  const canvas = rect(0, headerHeight, width, height - headerHeight)
  const rowAreaWidth = canvas.width - padding - titleWidth - propertiesWidth - barThickness
  const rowAreaHeight = canvas.height - rulerHeight - padding - barThickness
  return {
    appHeader: rect(0, 0, width, headerHeight),
    scheduleCanvas: canvas,
    rowTitlePanel: rect(canvas.x, canvas.y, titleWidth, canvas.height),
    timeRuler: rect(canvas.x + titleWidth, canvas.y, rowAreaWidth, rulerHeight),
    propertiesPanel: rect(canvas.x + canvas.width - propertiesWidth, canvas.y, propertiesWidth, canvas.height),
    rowArea: rect(canvas.x + titleWidth, canvas.y + rulerHeight, rowAreaWidth, rowAreaHeight),
  }
})()

const SCHEDULE = {
  project: { title: 'a document', themeHue: 214, uidHighWaterMark: 0, minutesPerDay: null },
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
} as unknown as Schedule

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  iconUnderPointer: null,
  commandPaletteAt: { x: 500, y: 300 },
  themePreference: 'light',
  themeHue: 214,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const helpShown = (screenLanguage: DisplayLanguage, helpLanguage: DisplayLanguage): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage,
    helpLanguage,
    propertiesPanelContentState: {
      kind: 'selectionDisplayed',
      subject: { selection: emptySelection(), groupIds: [] },
    },
    helpDisplayState: { kind: 'shown', child: { kind: 'normal' } },
  },
})

const helpOf = (helpLanguage: DisplayLanguage, screenLanguage: DisplayLanguage = helpLanguage): HelpModal => {
  const view = screenViewFromRegions(
    REGIONS,
    SCHEDULE,
    SETTINGS,
    emptySelection(),
    helpShown(screenLanguage, helpLanguage),
    emptyDialogueLog(),
    READINGS,
  )
  if (view.helpModal === undefined || view.helpModal === null) throw new Error('the help is not in the view')
  return view.helpModal
}

const joined = (words: LinkedWords): string => `${words.before}${words.address}${words.after}`

describe('SEAM-4 the note *1 at the end of the IC-20 column (FR-036, FR-073, S-350, JDG-1048)', () => {
  it('FR-036 / FR-038: the dictionary holds note *1 in both languages, each with the {downloadUrl} seat', () => {
    expect(FOOTNOTES.map((one) => one.footnote)).toEqual([1])
    for (const language of LANGUAGES) {
      expect(FOOTNOTES[0]?.text[language]?.includes(DOWNLOAD_URL_SEAT), language).toBe(true)
    }
  })

  it('FR-036: the help carries one footnote per helpFootnotes entry', () => {
    for (const language of LANGUAGES) {
      expect(helpOf(language).footnotes, language).toHaveLength(FOOTNOTES.length)
    }
  })

  it('FR-036 / FR-073: note *1 is the dictionary\'s words in the help language with S-350 in the seat', () => {
    for (const language of LANGUAGES) {
      const note = helpOf(language).footnotes[0] as HelpFootnote
      const words = FOOTNOTES[0]?.text[language] ?? ''
      expect(note.address, language).toBe(DOWNLOAD_ADDRESS)
      expect(joined(note), language).toBe(withDownloadAddress(words))
      expect(note.before, language).toBe(words.split(DOWNLOAD_URL_SEAT)[0])
    }
  })

  it('FR-073: the seat itself is never printed', () => {
    for (const language of LANGUAGES) {
      expect(joined(helpOf(language).footnotes[0] as HelpFootnote).includes(DOWNLOAD_URL_SEAT), language).toBe(false)
    }
  })

  it('FR-038: the note follows the help language, not the screen language', () => {
    const note = helpOf('en' as DisplayLanguage, 'ja' as DisplayLanguage).footnotes[0] as HelpFootnote
    expect(joined(note)).toBe(withDownloadAddress(FOOTNOTES[0]?.text['en'] ?? ''))
  })
})

describe('SEAM-4 the note is not an item (FR-036, S-202)', () => {
  it('FR-036 (JDG-1048): note *1 stands in the column that holds the IC-20 item, in each help language', () => {
    for (const language of LANGUAGES) {
      const help = helpOf(language)
      const ic20 = help.entries.filter((entry) => entry.row === 'IC-20')
      expect(ic20, language).toHaveLength(1)
      expect((help.footnotes[0] as HelpFootnote).column, language).toBe(ic20[0]?.column)
    }
  })

  it('FR-036: the note adds no column -- its column is one the items already fill', () => {
    for (const language of LANGUAGES) {
      const help = helpOf(language)
      const columns = new Set(help.entries.map((entry) => entry.column))
      expect(columns.has((help.footnotes[0] as HelpFootnote).column), language).toBe(true)
    }
  })

  it('FR-036: no item of the help carries the note\'s words or the S-350 address', () => {
    for (const language of LANGUAGES) {
      const help = helpOf(language)
      const note = joined(help.footnotes[0] as HelpFootnote)
      const carrying = help.entries.filter(
        (entry) => entry.text.includes(DOWNLOAD_ADDRESS) || entry.text.includes(note) || entry.text.includes(DOWNLOAD_URL_SEAT),
      )
      expect(carrying.map((entry) => entry.row), language).toEqual([])
    }
  })

  it('FR-036: the items are the same in number in both help languages -- the note adds none', () => {
    expect(helpOf('ja' as DisplayLanguage).entries.length).toBe(helpOf('en' as DisplayLanguage).entries.length)
  })
})

describe('SEAM-4 the IC-20 item points at the note (FR-036, CR-620 J-02)', () => {
  it('FR-036: the IC-20 item\'s text ends with the helpNotes word of IC-20, in each help language', () => {
    for (const language of LANGUAGES) {
      const entries = helpOf(language).entries.filter((entry) => entry.row === 'IC-20')
      expect(entries, language).toHaveLength(1)
      expect(entries[0]?.text.endsWith(helpNoteOf('IC-20', language)), `${language}: ${entries[0]?.text ?? ''}`).toBe(true)
    }
  })

  it('FR-036: as IC-54\'s item does with its own helpNotes word', () => {
    for (const language of LANGUAGES) {
      const entry = helpOf(language).entries.find((one) => one.row === 'IC-54')
      expect(entry?.text.endsWith(helpNoteOf('IC-54', language)), `${language}: ${entry?.text ?? ''}`).toBe(true)
    }
  })
})
