// DFC-3000 stage: the Help and the App Header built through public entries only, shared by DFC-3000 .. DFC-3006.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  screenViewFromRegions,
  type DisplayLanguage,
  type HelpModal,
  type ScreenView,
  type ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ScreenRect, ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  oneByRole,
  paintedColor,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  FakeElement,
  FakeText,
  type FakeNode,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

export type Words = Readonly<Record<string, string>>

export const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

const SPEC = join(process.cwd(), 'docs', 'spec')

export const REQUIREMENTS: string = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))

export function requirementText(uid: string): string {
  const at = REQUIREMENTS.indexOf(`**UID**: ${uid}\n`)
  if (at < 0) throw new Error(`the requirements have no ${uid}`)
  const next = REQUIREMENTS.indexOf('\n#### ', at)
  return REQUIREMENTS.slice(at, next < 0 ? undefined : next)
}

interface Dictionary {
  readonly icons: readonly { readonly rowId: string; readonly label: Words; readonly hint: Words }[]
  readonly helpLinks?: readonly { readonly link: string; readonly rowId?: string; readonly text: Words }[]
  readonly helpHeadings?: readonly { readonly block: string; readonly text: Words }[]
  readonly assignments?: readonly { readonly rowId: string; readonly text: Words }[]
}

// see FR-038
export const DICTIONARY = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as Dictionary

export function linkWords(link: string, language: DisplayLanguage): string {
  const found = (DICTIONARY.helpLinks ?? []).find((one) => one.link === link)?.text[language]
  if (found === undefined) throw new Error(`the dictionary has no helpLinks ${link} in ${language}`)
  return found
}

export function iconLabel(rowId: string, language: DisplayLanguage): string {
  const found = DICTIONARY.icons.find((one) => one.rowId === rowId)?.label[language]
  if (found === undefined) throw new Error(`the dictionary has no icon label ${rowId} in ${language}`)
  return found
}

export function headingWords(block: string, language: DisplayLanguage): string {
  const found = (DICTIONARY.helpHeadings ?? []).find((one) => one.block === block)?.text[language]
  if (found === undefined) throw new Error(`the dictionary has no helpHeadings ${block} in ${language}`)
  return found
}

// see S-350, S-459, S-583
const T_206 = specTable('T-206')
export function addressOf(id: string): string {
  const row = T_206.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  return bare(row.by['既定'] ?? '')
}
export const DOWNLOAD_ADDRESS = addressOf('S-350')
export const ABOUT_ADDRESS = addressOf('S-583')
export const REPOSITORY_ADDRESS = addressOf('S-459')

// see S-503
const S_503 = specTable('T-236').rows.find((one) => one.id === 'S-503')
export const LINK_INK = {
  light: bare(S_503?.by['明るいテーマ'] ?? '').toLowerCase(),
  dark: bare(S_503?.by['暗いテーマ'] ?? '').toLowerCase(),
} as const

// see T-109
export interface IconRow {
  readonly id: string
  readonly surfaces: readonly string[]
  readonly group: string
}
export const T_109_ROWS: readonly IconRow[] = specTable('T-109').rows.map((one) => ({
  id: one.id,
  surfaces: Array.from((one.by['面'] ?? '').matchAll(/`([^`]+)`/g), (found) => found[1] ?? ''),
  group: bare(one.by['群'] ?? '').trim(),
}))

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({ x, y, width, height })

const SETTINGS = { ...SETTINGS_DEFAULTS, taskGroupPanelWidthPx: 400 } as unknown as DocumentSettings

const REGIONS: ScreenRegions = (() => {
  const width = 1920
  const height = 1080
  const headerHeight = 56
  const rulerHeightPx = 48
  const titleWidth = 400
  const propertiesWidth = 300
  const padding = SETTINGS_CONSTANTS.canvasPadding
  const barThickness = 8
  const canvas = rect(0, headerHeight, width, height - headerHeight)
  const areaWidth = canvas.width - padding - titleWidth - propertiesWidth - barThickness
  const areaHeight = canvas.height - rulerHeightPx - padding - barThickness
  return {
    appHeader: rect(0, 0, width, headerHeight),
    scheduleCanvas: canvas,
    taskGroupPanel: rect(canvas.x, canvas.y, titleWidth, canvas.height),
    timeRuler: rect(canvas.x + titleWidth, canvas.y, areaWidth, rulerHeightPx),
    propertiesPanel: rect(canvas.x + canvas.width - propertiesWidth, canvas.y, propertiesWidth, canvas.height),
    taskGroupArea: rect(canvas.x + titleWidth, canvas.y + rulerHeightPx, areaWidth, areaHeight),
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

const sessionWith = (screenLanguage: DisplayLanguage, helpLanguage: DisplayLanguage, isHelpShown: boolean): ScreenSession =>
  ({
    ...emptyScreenSession,
    screen: {
      ...emptyScreenSession.screen,
      screenLanguage,
      helpLanguage,
      propertiesPanelContentState: {
        kind: 'selectionDisplayed',
        subject: { selection: emptySelection(), taskGroupIds: [] },
      },
      ...(isHelpShown ? { helpDisplayState: { kind: 'shown', child: { kind: 'normal' } } } : {}),
    },
  }) as unknown as ScreenSession

export function viewOf(screenLanguage: DisplayLanguage, helpLanguage: DisplayLanguage, isHelpShown: boolean): ScreenView {
  return screenViewFromRegions(
    REGIONS,
    SCHEDULE,
    SETTINGS,
    emptySelection(),
    sessionWith(screenLanguage, helpLanguage, isHelpShown),
    READINGS,
  )
}

export function helpOf(helpLanguage: DisplayLanguage, screenLanguage: DisplayLanguage = helpLanguage): HelpModal {
  const modal = viewOf(screenLanguage, helpLanguage, true).helpModal
  if (modal === undefined || modal === null) throw new Error('the help is open but the view carries no help')
  return modal
}

export interface Drawn {
  readonly built: Stage
  readonly help: FakeElement
}

export function drawnHelp(
  helpLanguage: DisplayLanguage,
  preference: 'light' | 'dark' = 'light',
  screenLanguage: DisplayLanguage = helpLanguage,
): Drawn {
  const view = viewOf(screenLanguage, helpLanguage, true)
  const built = wire({ preference, hue: 214 }, { 'App Header': 56 })
  surfaceOf(built).showScreenView(view)
  return { built, help: oneByRole(built.root(), 'Help Modal') }
}

const declared = (element: FakeElement, name: string): string => {
  const attribute = element.getAttribute(name)
  if (attribute !== null) return attribute
  const property = (element as unknown as Record<string, unknown>)[name]
  return typeof property === 'string' ? property : ''
}

export const hrefOf = (anchor: FakeElement): string => declared(anchor, 'href')
export const targetOf = (anchor: FakeElement): string => declared(anchor, 'target')

export const anchorsIn = (root: FakeElement): FakeElement[] => selfAndDescendants(root).filter((one) => one.tagName === 'A')

export const anchorsTo = (root: FakeElement, address: string): FakeElement[] =>
  anchorsIn(root).filter((one) => hrefOf(one) === address)

// WHY: color and text-decoration pass down the tree, so the nearest write at or above the anchor is what the reader sees.
function nearestStyle(element: FakeElement, property: string, stop: FakeElement): string {
  for (let at: FakeElement | null = element; at !== null; at = at.parentNode) {
    const written = styleMap(at).get(property)
    if (written !== undefined && written.trim() !== '') return written
    if (at === stop) break
  }
  return ''
}

export const isUnderlined = (anchor: FakeElement, stop: FakeElement): boolean =>
  /underline/.test(`${nearestStyle(anchor, 'text-decoration', stop)} ${nearestStyle(anchor, 'text-decoration-line', stop)}`)

export function inkOf(built: Stage, anchor: FakeElement, stop: FakeElement): string {
  for (let at: FakeElement | null = anchor; at !== null; at = at.parentNode) {
    const painted = paintedColor(built, at)
    if (painted !== '') return painted
    if (at === stop) break
  }
  return ''
}

export function textsInOrder(root: FakeElement): string[] {
  const out: string[] = []
  const walk = (node: FakeNode): void => {
    if (node instanceof FakeElement) {
      for (const child of node.childNodes) walk(child)
      return
    }
    if (node instanceof FakeText) out.push(node.data)
  }
  walk(root)
  return out
}

export function nearestHolding(element: FakeElement, words: string, stop: FakeElement): FakeElement | null {
  for (let at: FakeElement | null = element; at !== null; at = at.parentNode) {
    if (at.textContent.includes(words)) return at
    if (at === stop) break
  }
  return null
}
