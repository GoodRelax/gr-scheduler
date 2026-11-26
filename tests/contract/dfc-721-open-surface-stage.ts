// DFC-721 spec-only stage: the U rows table T-280 lets openSurfaceStateMachine.open carry, read from the manuscript, and a screen view drawn with S-99g open on any value.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import {
  screenViewFromRegions,
  type DisplayLanguage,
  type ScreenView,
  type ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { REGIONS, SCHEDULE, SETTINGS } from './cr-727-stage'
import { bare, bareAll, specTable } from './spec-table'
import { readStateMachineView } from './state-machine-manuscript'

const SOURCE = join(process.cwd(), 'docs', 'spec', '_source')

interface Carried {
  readonly name: string
  readonly rows?: readonly string[]
}
interface RawMachine {
  readonly name: string
  readonly states: readonly { readonly key: string; readonly carries: readonly Carried[] }[]
}

// Spec: T-280
// Why: the table is read from its manuscript docs/spec/_source/state-machines.json
export const OPEN_SURFACE_ROWS: readonly string[] = (() => {
  const regions = (readStateMachineView() as {
    readonly regions: readonly { readonly machines?: readonly RawMachine[] }[]
  }).regions
  const rows = regions
    .flatMap((region) => region.machines ?? [])
    .find((machine) => machine.name === 'openSurfaceStateMachine')
    ?.states.find((state) => state.key === 'open')
    ?.carries.find((carried) => carried.name === 'surfaceName')?.rows
  if (rows === undefined || rows.length === 0) throw new Error('T-280 openSurfaceStateMachine.open carries no surfaceName rows')
  return rows
})()

// Spec: T-103
// Why: the settled English name of a U row
export const nameOfRow = (row: string): string => {
  const found = specTable('T-103').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-103 has no row ${row}`)
  return bare(found.by['確定名（英）'] ?? '')
}

// Spec: T-103
// Why: every settled English name a row states (a cell may state more than one)
export const namesOfRow = (row: string): readonly string[] =>
  bareAll(specTable('T-103').rows.find((one) => one.id === row)?.by['確定名（英）'] ?? '')

export const T_103_ROWS: readonly string[] = specTable('T-103').rows.map((one) => one.id)

type Words = Readonly<Record<string, string>>

// Spec: FR-038
// Why: the dictionary manuscript's surfaces section, heading per settled name
export const SURFACE_HEADINGS: ReadonlyMap<string, Words> = new Map(
  (
    JSON.parse(readRepoFile(join(SOURCE, 'display-words.json'), 'utf8')) as {
      readonly surfaces: readonly { readonly name: string; readonly heading: Words }[]
    }
  ).surfaces.map((one) => [one.name, one.heading]),
)

export const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

const READINGS = {
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
} as unknown as ScreenViewReadings

const NO_TABLE_VIEW = { columnFilters: [], shownTaskUids: [], isScheduleFilterApplied: false, sort: null }

// Trap: SETTINGS is the flat SETTINGS_DEFAULTS, so the windows' table views are put in here.
const SETTINGS_WITH_VIEWS = {
  ...SETTINGS,
  tableViews: { searchPanel: NO_TABLE_VIEW, delayDiagnosticsReport: NO_TABLE_VIEW },
} as unknown as typeof SETTINGS

export const sessionWith = (language: DisplayLanguage, screen: Readonly<Record<string, unknown>>): ScreenSession =>
  ({
    ...emptyScreenSession,
    screen: { ...emptyScreenSession.screen, screenLanguage: language, helpLanguage: language, ...screen },
  }) as unknown as ScreenSession

// Spec: S-99g
// Why: the screen with the open surface state open on `surfaceName`
export const sessionOpenOn = (surfaceName: string, language: DisplayLanguage): ScreenSession =>
  sessionWith(language, { openSurfaceState: { kind: 'open', surfaceName } })

export const viewOf = (session: ScreenSession, readings: Partial<Record<string, unknown>> = {}): ScreenView =>
  screenViewFromRegions(REGIONS, SCHEDULE, SETTINGS_WITH_VIEWS, emptySelection(), session, {
    ...READINGS,
    ...readings,
  } as ScreenViewReadings)
