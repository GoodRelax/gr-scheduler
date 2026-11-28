// CR-620 seam 4, re-pointed by CR-785: the IC-20 item of the help carries a link to S-350 (FR-036, FR-038, FR-073), through screenViewFromRegions (PI-37).

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DOWNLOAD_ADDRESS, DOWNLOAD_URL_SEAT } from '../fixtures/download-address'

import {
  SETTINGS_DEFAULTS,
  SETTINGS_CONSTANTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ScreenRect, ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  screenViewFromRegions,
  type DisplayLanguage,
  type HelpModal,
  type ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'

type Words = Readonly<Record<string, string>>

interface Manuscript {
  readonly helpFootnotes?: unknown
  readonly helpNotes?: readonly { readonly specTableRowId: string; readonly text: Words }[]
  readonly helpLinks?: readonly { readonly link: string; readonly specTableRowId?: string; readonly text: Words }[]
  readonly icons?: readonly { readonly specTableRowId: string; readonly label: Words }[]
}

const MANUSCRIPT = JSON.parse(
  readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as Manuscript

const AGENT_API_LINKS = (MANUSCRIPT.helpLinks ?? []).filter((one) => one.link === 'agentApi')

const nameOf = (specTableRowId: string, language: DisplayLanguage): string => {
  const found = (MANUSCRIPT.icons ?? []).find((one) => one.specTableRowId === specTableRowId)?.label[language]
  if (found === undefined) throw new Error(`the dictionary has no icons ${specTableRowId} in ${language}`)
  return found
}

const helpNoteOf = (specTableRowId: string, language: DisplayLanguage): string => {
  const found = (MANUSCRIPT.helpNotes ?? []).find((one) => one.specTableRowId === specTableRowId)?.text[language]
  if (found === undefined) throw new Error(`the dictionary has no helpNotes ${specTableRowId} in ${language}`)
  return found
}

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en'] as DisplayLanguage[]

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({ x, y, width, height })

const SETTINGS = { ...SETTINGS_DEFAULTS, taskGroupPanelWidthPx: 400 } as unknown as DocumentSettings

const REGIONS: ScreenRegions = (() => {
  const width = 1920
  const height = 1080
  const headerHeight = 56
  const rulerHeightPx = 48
  const titleWidth = SETTINGS.taskGroupPanelWidthPx
  const propertiesWidth = 300
  const padding = SETTINGS_CONSTANTS.canvasPadding
  const barThickness = 8
  const canvas = rect(0, headerHeight, width, height - headerHeight)
  const taskGroupAreaWidth = canvas.width - padding - titleWidth - propertiesWidth - barThickness
  const taskGroupAreaHeight = canvas.height - rulerHeightPx - padding - barThickness
  return {
    appHeader: rect(0, 0, width, headerHeight),
    scheduleCanvas: canvas,
    taskGroupPanel: rect(canvas.x, canvas.y, titleWidth, canvas.height),
    timeRuler: rect(canvas.x + titleWidth, canvas.y, taskGroupAreaWidth, rulerHeightPx),
    propertiesPanel: rect(canvas.x + canvas.width - propertiesWidth, canvas.y, propertiesWidth, canvas.height),
    taskGroupArea: rect(canvas.x + titleWidth, canvas.y + rulerHeightPx, taskGroupAreaWidth, taskGroupAreaHeight),
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
  selectedTaskGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
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
      subject: { selection: emptySelection(), taskGroupIds: [] },
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
    READINGS,
  )
  if (view.helpModal === undefined || view.helpModal === null) throw new Error('the help is not in the view')
  return view.helpModal
}


describe('SEAM-4 the IC-20 item carries a link to the latest-version page (FR-036, FR-038, FR-073, S-350, CR-785)', () => {
  it('FR-038: the dictionary holds the agentApi link for IC-20 in both languages, and note *1 is gone', () => {
    expect(AGENT_API_LINKS).toHaveLength(1)
    expect(AGENT_API_LINKS[0]?.specTableRowId).toBe('IC-20')
    for (const language of LANGUAGES) {
      expect((AGENT_API_LINKS[0]?.text[language] ?? '').length, language).toBeGreaterThan(0)
      expect(AGENT_API_LINKS[0]?.text[language]?.includes(DOWNLOAD_URL_SEAT), language).toBe(false)
    }
    expect(MANUSCRIPT.helpFootnotes).toBeUndefined()
    expect((MANUSCRIPT.helpNotes ?? []).map((one) => one.specTableRowId)).toEqual(['IC-54'])
  })

  it('FR-036: the help has no footnotes member any more', () => {
    for (const language of LANGUAGES) {
      expect('footnotes' in helpOf(language), language).toBe(false)
    }
  })

  it('FR-036 / FR-073: the IC-20 item links to S-350 with the dictionary words in the help language', () => {
    for (const language of LANGUAGES) {
      const entries = helpOf(language).entries.filter((entry) => entry.row === 'IC-20')
      expect(entries, language).toHaveLength(1)
      expect(entries[0]?.link, language).toEqual({ words: AGENT_API_LINKS[0]?.text[language], address: DOWNLOAD_ADDRESS })
    }
  })

  it('FR-036: the IC-20 item text is the name words only -- no parentheses, no link words, no address', () => {
    for (const language of LANGUAGES) {
      const text = helpOf(language).entries.find((entry) => entry.row === 'IC-20')?.text ?? ''
      expect(text, language).toBe(nameOf('IC-20', language))
      expect(/[()（）]/.test(text), language).toBe(false)
      expect(text.includes(AGENT_API_LINKS[0]?.text[language] ?? '\u0000'), language).toBe(false)
      expect(text.includes(DOWNLOAD_ADDRESS), language).toBe(false)
    }
  })

  // Spec: FR-380
  it('FR-038: the link follows the help language, not the screen language', () => {
    const entry = helpOf('en' as DisplayLanguage, 'ja' as DisplayLanguage).entries.find((one) => one.row === 'IC-20')
    expect(entry?.link?.words).toBe(AGENT_API_LINKS[0]?.text['en'])
    const other = helpOf('ja' as DisplayLanguage, 'en' as DisplayLanguage).entries.find((one) => one.row === 'IC-20')
    expect(other?.link?.words).toBe(AGENT_API_LINKS[0]?.text['ja'])
  })

  it('FR-036: no other item carries a link', () => {
    for (const language of LANGUAGES) {
      const carrying = helpOf(language).entries.filter((entry) => entry.link !== null)
      expect(carrying.map((entry) => entry.row), language).toEqual(['IC-20'])
    }
  })

  it('FR-036: the items are the same in number in both help languages -- the link adds none', () => {
    expect(helpOf('ja' as DisplayLanguage).entries.length).toBe(helpOf('en' as DisplayLanguage).entries.length)
  })

  it('FR-036: no item text carries the S-350 address or the {downloadUrl} seat', () => {
    for (const language of LANGUAGES) {
      const carrying = helpOf(language).entries.filter(
        (entry) => entry.text.includes(DOWNLOAD_ADDRESS) || entry.text.includes(DOWNLOAD_URL_SEAT),
      )
      expect(carrying.map((entry) => entry.row), language).toEqual([])
    }
  })
})

describe('SEAM-4 only IC-54 keeps a word in parentheses (FR-036, CR-785)', () => {
  it('FR-036: the IC-54 item text ends with the helpNotes word of IC-54, in each help language', () => {
    for (const language of LANGUAGES) {
      const entry = helpOf(language).entries.find((one) => one.row === 'IC-54')
      expect(entry?.text.endsWith(helpNoteOf('IC-54', language)), `${language}: ${entry?.text ?? ''}`).toBe(true)
    }
  })
})
