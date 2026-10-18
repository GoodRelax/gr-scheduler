// CR-754 spec-only stage: manuscripts, the marked dictionary, the startup document, its properties panel and that panel drawn.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  AppHeaderItems,
  DisplayLanguage,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  ScreenFrame,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection, selectionWith, type ItemRef } from '../../src/entity/document-model/selection/selection'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { oneByRole, surfaceOf, wire, type FakeElement } from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

export type Loose = Record<string, any>

const SPEC = join(process.cwd(), 'docs', 'spec')
const read = (...parts: string[]): string => unbroken(readFileSync(join(SPEC, ...parts), 'utf8').replace(/\r\n/g, '\n'))

export const REQUIREMENTS = read('01-04-requirements.md')
export const SETTINGS_BOOK = read('_assets', 'tbl-settings.md')

// WHY: read WITH its break marks -- FR-038 lets a panel item name carry `|` where it may wrap.
export const MARKED_WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as Loose

export const BREAK_MARK = '|'
export const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

/** @purity pure */
export const withoutMarks = (word: string): string => word.split(BREAK_MARK).join('')

// see T-104
/** @purity pure */
export function markedSettingLabel(rowId: string, language: DisplayLanguage): string {
  const entry = (MARKED_WORDS['settings'] as readonly Loose[]).find((one) => one['rowId'] === rowId)
  if (entry === undefined) throw new Error(`the dictionary has no settings row ${rowId}`)
  return entry['label'][language] as string
}

/** @purity pure */
export const settingLabel = (rowId: string, language: DisplayLanguage): string => withoutMarks(markedSettingLabel(rowId, language))

/** @purity pure */
export function partWord(section: string, part: string, language: DisplayLanguage): string {
  const entry = (MARKED_WORDS[section] as readonly Loose[] | undefined)?.find((one) => one['part'] === part)
  if (entry === undefined) throw new Error(`the dictionary section ${section} has no part ${part}`)
  return withoutMarks(entry['text'][language] as string)
}

/** @purity pure */
export function iconLabel(rowId: string, language: DisplayLanguage): string {
  const entry = (MARKED_WORDS['icons'] as readonly Loose[]).find((one) => one['rowId'] === rowId)
  if (entry === undefined) throw new Error(`the dictionary has no icon row ${rowId}`)
  return entry['label'][language] as string
}

/** @purity pure */
export function surfaceHeading(name: string, language: DisplayLanguage): string {
  const entry = (MARKED_WORDS['surfaces'] as readonly Loose[]).find((one) => one['name'] === name)
  if (entry === undefined) throw new Error(`the dictionary has no surface ${name}`)
  return entry['heading'][language] as string
}

// see T-206
/** @purity pure */
export function settingValue(id: string): number {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  const found = /-?\d+(?:\.\d+)?/.exec(bare(row.by['既定'] ?? '').replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`table T-206 row ${id} states no number: ${row.by['既定']}`)
  return value
}

// see T-103
/** @purity pure */
export const partName = (id: string): string => bare(specTable('T-103').rows.find((one) => one.id === id)?.by['確定名（英）'] ?? '')

const TEMPLATE_PATH = join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json')

/** @purity non-pure */
function templateDocument(): Document {
  const opened = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!opened.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(opened.faults)}`)
  return opened.document
}

export const TEMPLATE = templateDocument()

// WHY: the first plain Task and the first task group of the startup document are the selections pressed.
export const FIRST_TASK_UID = ((): number => {
  const found = (TEMPLATE.schedule.tasks as readonly Loose[]).find((one) => one['milestone'] !== true && one['summary'] !== true)
  if (found === undefined) throw new Error('premise: the startup document holds a plain Task')
  return found['uid'] as number
})()
export const FIRST_GROUP_ID = ((): string => {
  const found = (TEMPLATE.schedule.taskGroups as readonly Loose[])[0]
  if (found === undefined) throw new Error('premise: the startup document holds a task group')
  return found['id'] as string
})()

export interface Look {
  readonly language: DisplayLanguage
  readonly settings: Loose
  readonly project: Loose
  readonly tasks: Readonly<Record<number, Loose>>
}

const PLAIN: Look = { language: 'ja', settings: {}, project: {}, tasks: {} }

/** @purity pure */
function documentLooking(look: Look): { readonly schedule: Document['schedule']; readonly settings: DocumentSettings } {
  const tasks = (TEMPLATE.schedule.tasks as readonly Loose[]).map((one) => {
    const part = look.tasks[one['uid'] as number]
    return part === undefined ? one : { ...one, ...part }
  })
  const schedule = { ...TEMPLATE.schedule, tasks, project: { ...TEMPLATE.schedule.project, ...look.project } } as unknown as Document['schedule']
  const settings = { ...(TEMPLATE.documentSettings as Loose), ...look.settings } as unknown as DocumentSettings
  return { schedule, settings }
}

/** @purity pure */
function readingsOf(schedule: Document['schedule'], showing: 'documentSettings' | 'selection', taskGroupIds: readonly string[]): ScreenViewReadings {
  return {
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
    themeHue: schedule.project.themeHue ?? 0,
    isMilestoneListOpen: false,
    isPaletteMinimized: false,
    dualCursorFollowing: null,
    selectedTaskGroupIds: [...taskGroupIds],
    selectedResourceUids: [],
    propertiesSubject: null,
    propertiesShowing: showing,
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  } as unknown as ScreenViewReadings
}

/** @purity pure */
function sessionOf(language: DisplayLanguage, content: Loose): ScreenSession {
  return {
    ...emptyScreenSession,
    screen: {
      ...emptyScreenSession.screen,
      screenLanguage: language,
      helpLanguage: language,
      themePreference: 'light',
      propertiesPanelContentState: content,
    },
  } as unknown as ScreenSession
}

// see FR-072, IC-17
/** @purity pure */
export function settingsPanel(look: Partial<Look> = {}): PropertiesPanel {
  const whole = { ...PLAIN, ...look }
  const { schedule, settings } = documentLooking(whole)
  const panel = propertiesPanelFromSelection(
    schedule,
    settings,
    emptySelection(),
    sessionOf(whole.language, { kind: 'documentSettingsDisplayed' }),
    readingsOf(schedule, 'documentSettings', []),
  )
  if (panel === null) throw new Error('premise: the panel showing the document settings is drawn')
  return panel
}

// see FR-072, FR-006, FR-042
/** @purity pure */
export function selectionPanel(item: ItemRef | null, taskGroupIds: readonly string[], look: Partial<Look> = {}): PropertiesPanel {
  const whole = { ...PLAIN, ...look }
  const { schedule, settings } = documentLooking(whole)
  const selection = item === null ? emptySelection() : selectionWith(emptySelection(), item)
  const panel = propertiesPanelFromSelection(
    schedule,
    settings,
    selection,
    sessionOf(whole.language, { kind: 'selectionDisplayed', subject: { selection, taskGroupIds: [...taskGroupIds] } }),
    readingsOf(schedule, 'selection', taskGroupIds),
  )
  if (panel === null) throw new Error('premise: the panel describes the selection')
  return panel
}

/** @purity pure */
export const taskPanel = (look: Partial<Look> = {}): PropertiesPanel => selectionPanel({ kind: 'task', uid: FIRST_TASK_UID }, [], look)

/** @purity pure */
export const taskGroupPanel = (look: Partial<Look> = {}): PropertiesPanel => selectionPanel(null, [FIRST_GROUP_ID], look)

/** @purity pure */
export const dateControlsOf = (panel: PropertiesPanel): readonly { readonly field: PropertyField; readonly control: PropertyControl }[] =>
  panel.fields.flatMap((field) => field.controls.filter((control) => control.kind === 'date').map((control) => ({ field, control })))

/** @purity pure */
export function fieldNamed(panel: PropertiesPanel, name: string): PropertyField {
  const found = panel.fields.filter((one) => one.name === name)
  if (found.length !== 1) {
    throw new Error(`expected one field named ${JSON.stringify(name)}, got ${found.length}: ${panel.fields.map((one) => one.name).join(' / ')}`)
  }
  return found[0] as PropertyField
}

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  tooltips: [],
} as unknown as ScreenView

export const PROPERTIES_PANEL_PART = partName('U-25')

// see U-25
/** @purity non-pure */
export function drawnPanel(panel: PropertiesPanel): FakeElement {
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, propertiesPanel: panel })
  return oneByRole(built.root(), PROPERTIES_PANEL_PART)
}
