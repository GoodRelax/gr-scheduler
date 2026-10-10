// CR-727 spec-only stage: the screen regions, an empty document and the readings screenViewFromRegions needs (copied from the CR-620 contract test).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { emptyDialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ScreenRect, ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  screenViewFromRegions,
  type DisplayLanguage,
  type ScreenView,
  type ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

import { unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')

export const specText = (...parts: readonly string[]): string => unbroken(readFileSync(join(SPEC, ...parts), 'utf8'))

export function rowLine(text: string, id: string): string {
  const found = text.split('\n').find((line) => line.startsWith(`| ${id} |`))
  if (found === undefined) throw new Error(`no row ${id}`)
  return found
}

type Words = Readonly<Record<string, string>>
type Section = readonly { readonly part?: string; readonly rowId?: string; readonly text?: Words; readonly hint?: Words }[]

export const MANUSCRIPT_WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as Record<
  string,
  Section
>
export const GENERATED_WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'), 'utf8'),
) as Record<string, Section>

export const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en'] as DisplayLanguage[]

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({ x, y, width, height })

export const SETTINGS = { ...SETTINGS_DEFAULTS, taskGroupPanelWidth: 400 } as unknown as DocumentSettings

export const REGIONS: ScreenRegions = (() => {
  const width = 1920
  const height = 1080
  const headerHeight = 56
  const rulerHeight = 48
  const titleWidth = SETTINGS.taskGroupPanelWidth
  const propertiesWidth = 300
  const padding = SETTINGS_CONSTANTS.canvasPadding
  const barThickness = 8
  const canvas = rect(0, headerHeight, width, height - headerHeight)
  const taskGroupAreaWidth = canvas.width - padding - titleWidth - propertiesWidth - barThickness
  const taskGroupAreaHeight = canvas.height - rulerHeight - padding - barThickness
  return {
    appHeader: rect(0, 0, width, headerHeight),
    scheduleCanvas: canvas,
    taskGroupPanel: rect(canvas.x, canvas.y, titleWidth, canvas.height),
    timeRuler: rect(canvas.x + titleWidth, canvas.y, taskGroupAreaWidth, rulerHeight),
    propertiesPanel: rect(canvas.x + canvas.width - propertiesWidth, canvas.y, propertiesWidth, canvas.height),
    taskGroupArea: rect(canvas.x + titleWidth, canvas.y + rulerHeight, taskGroupAreaWidth, taskGroupAreaHeight),
  }
})()

export const SCHEDULE = {
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
  taskGroupBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
} as unknown as ScreenViewReadings

export const viewOf = (session: ScreenSession): ScreenView =>
  screenViewFromRegions(REGIONS, SCHEDULE, SETTINGS, emptySelection(), session, emptyDialogueLog(), READINGS)

export function inLanguage(session: ScreenSession, screenLanguage: DisplayLanguage): ScreenSession {
  return { ...session, screen: { ...session.screen, screenLanguage } }
}
