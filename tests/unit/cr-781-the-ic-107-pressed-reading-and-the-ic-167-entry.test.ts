// CR-781 / CR-797 spec-only unit cases: IC-107 looks pressed while the report window is open (RW-1, S-451), and IC-168 (the End Diagnostics entry is retired) stands first on the RW-3 line with its word.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { appHeaderItemsFromDocument } from '../../src/adapter/screen-renderer/app-header-items'
import { delayDiagnosticsReportFromWindow } from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import { OPENED_DELAY_DIAGNOSTICS_REPORT, type ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import type { DelayDiagnosticsReport, Schedule } from '../../src/entity/document-model/schedule/schedule'
import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { NO_ROW_CHECKED, emptyScreenSession, type ScreenSession, type TableView } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { specTable } from '../contract/spec-table'
import { templateDocument } from '../contract/w3-t3-frame-stage'
import { DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'
import { settingDefaultOf } from '../fixtures/setting-default'

type Language = 'ja' | 'en'

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly icons: readonly { readonly rowId: string; readonly label: Record<Language, string> }[]
}
const wordOf = (row: string, language: Language): string => {
  const found = WORDS.icons.find((one) => one.rowId === row)?.label[language]
  if (found === undefined) throw new Error(`the dictionary has no word for ${row}`)
  return found
}

const SETTINGS = ((): DocumentSettings => {
  const heads = new Set(Object.keys(SETTINGS_DEFAULTS).map((key) => key.split('.')[0] as string))
  const built: Record<string, unknown> = {}
  for (const head of heads) built[head] = settingDefaultOf(head)
  built['displayScale'] = DEFAULT_DISPLAY_SCALE
  return built as unknown as DocumentSettings
})()

const sessionIn = (language: Language): ScreenSession =>
  ({
    ...emptyScreenSession,
    screen: { ...emptyScreenSession.screen, screenLanguage: language, helpLanguage: language, paletteDisplayState: { kind: 'shown', child: { kind: 'expanded' } } },
  }) as ScreenSession

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  selectedTaskGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const headerWith = (readings: Partial<ScreenViewReadings>) =>
  appHeaderItemsFromDocument(templateDocument().schedule, SETTINGS, sessionIn('en'), { ...READINGS, ...readings }).commands

const pressedIc107 = (readings: Partial<ScreenViewReadings>): boolean | undefined => headerWith(readings).find((one) => one.icon === 'IC-107')?.isPressed

describe('RW-1 / T-109 IC-107 -- the pressed look is the window being open (S-451), not the diagnosis being shown (S-445)', () => {
  it('premise: IC-107 stands in the App Header', () => {
    expect(headerWith({}).some((one) => one.icon === 'IC-107')).toBe(true)
  })

  it('with the window open it looks pressed', () => {
    expect(pressedIc107({ isDelayDiagnosticsReportOpen: true, isDelayDiagnosticsShown: true })).toBe(true)
  })

  it('with the window closed and the marks still shown it does not look pressed', () => {
    expect(pressedIc107({ isDelayDiagnosticsReportOpen: false, isDelayDiagnosticsShown: true })).toBe(false)
  })

  it('with nothing shown it does not look pressed', () => {
    expect(pressedIc107({ isDelayDiagnosticsReportOpen: false, isDelayDiagnosticsShown: false })).toBe(false)
    expect(pressedIc107({})).toBe(false)
  })

  it('the open window alone decides: it looks pressed even where the other reading is absent or false', () => {
    expect(pressedIc107({ isDelayDiagnosticsReportOpen: true })).toBe(true)
    expect(pressedIc107({ isDelayDiagnosticsReportOpen: true, isDelayDiagnosticsShown: false })).toBe(true)
  })
})

describe('T-109 -- IC-168 is a row of the report window, standing just before IC-140', () => {
  const rows = specTable('T-109').rows

  it('the row exists, names the Delay Diagnostics Report and stands immediately before IC-140', () => {
    const at = rows.findIndex((one) => one.id === 'IC-168')
    expect(at, 'IC-168 is in T-109').toBeGreaterThanOrEqual(0)
    expect(rows[at + 1]?.id).toBe('IC-140')
    expect(rows[at]?.cells.join(' ')).toContain('Delay Diagnostics Report')
  })

  it('the dictionary words are 再診断 and Diagnose Again', () => {
    expect(wordOf('IC-168', 'ja')).toBe('再診断')
    expect(wordOf('IC-168', 'en')).toBe('Diagnose Again')
  })
})

// WHY: the smallest report that gives the window something to draw; the cases below read only the entries of the RW-3 line.
const REPORT: DelayDiagnosticsReport = {
  outcome: 'diagnosed',
  statusDate: '2026-01-02T00:00:00',
  findings: [],
  bottlenecks: [],
  terminalPushOuts: [],
  walls: [],
  unreliableCount: 0,
  markerStates: [{ uid: 1, row: 'DG-4' }],
  settledPushOuts: [],
  derivedParentTasks: [],
  lateDays: [],
}
const SCHEDULE = {
  tasks: [
    {
      uid: 1,
      name: 'Alpha',
      start: '2026-03-02T08:00:00',
      finish: '2026-03-02T17:00:00',
      milestone: false,
      actualStart: null,
      actualFinish: null,
      percentComplete: 0,
    },
  ],
  project: { minutesPerDay: null },
  resources: [],
  assignments: [],
} as unknown as Schedule
const NO_VIEW: TableView = { visibility: NO_ROW_CHECKED, columnFilters: [], sort: null }

const viewIn = (language: Language) =>
  delayDiagnosticsReportFromWindow(sessionIn(language), OPENED_DELAY_DIAGNOSTICS_REPORT, NO_VIEW, REPORT, SCHEDULE, {
    canvas: { x: 0, y: 40, width: 1000, height: 600 },
    textSizeStep: 1,
  })

describe('T-346 RW-3 -- the line under the title holds IC-168, IC-140 and IC-108, IC-168 first and shown with its word', () => {
  it.each<[Language]>([['ja'], ['en']])('the entries are IC-168, IC-140, IC-108 in that order (%s)', (language) => {
    expect(viewIn(language)?.toolEntries.map((one) => one.icon)).toEqual(['IC-168', 'IC-140', 'IC-108'])
  })

  it.each<[Language]>([['ja'], ['en']])('IC-168 is enabled, shown with its word, and carries the word of the dictionary (%s)', (language) => {
    const entry = viewIn(language)?.toolEntries[0]
    expect(entry?.icon).toBe('IC-168')
    expect(entry?.isEnabled).toBe(true)
    expect(entry?.isLabelShown).toBe(true)
    expect(entry?.label).toBe(wordOf('IC-168', language))
  })

  it('IC-168 is not a title-bar entry (RW-2 keeps its list)', () => {
    const titled = viewIn('en')?.titleEntries.map((one) => one.icon) ?? []
    expect(titled).toEqual(['IC-127', 'IC-129', 'IC-130', 'IC-52'])
    expect(viewIn('en')?.tableEntries.map((one) => one.icon)).toEqual(['IC-153', 'IC-143'])
  })
})
