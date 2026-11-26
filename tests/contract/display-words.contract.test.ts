// Contract tests: the road that carries the display words to the screen.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { bare, bareAll, specTable } from './spec-table'
import { DISPLAY_SCALE_STEPS } from '../fixtures/display-scale'
import { withDownloadAddress } from '../fixtures/download-address'

import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { DelayDiagnosticsReport, Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  screenViewFromRegions,
  type CommandItem,
  type HelpEntry,
  type DisplayLanguage,
  type ScreenViewReadings,
  type ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { NO_DELAY_FIX_VALUES, OPENED_DELAY_DIAGNOSTICS_REPORT } from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import { OPENED_RESOURCE_LIST } from '../../src/adapter/screen-renderer/resource-list'
import {
  emptyScreenSession,
  emptySearchPanelSession,
  type ScreenSession,
  type ScreenValues,
  type SearchPanelSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { readStateMachineView } from './state-machine-manuscript'

type Words = Readonly<Record<string, string>>

type Entry = Readonly<Record<string, unknown>>

type Dictionary = Readonly<Record<string, readonly Entry[]>>

const ROOT = process.cwd()

const MANUSCRIPT_PATH = join(ROOT, 'docs', 'spec', '_source', 'display-words.json')

const GENERATED_PATH = join(ROOT, 'src', 'adapter', 'screen-renderer', 'display-words.json')

// Why: the carriage group stands a filled copy in place of this module id.
const GENERATED_MODULE = '../../src/adapter/screen-renderer/display-words.json'

// Spec: FR-038
// Why: the manuscript may mark where an item name wraps; the generator takes the marks out, so the cells compare without them.
const BREAK_MARK = /\|/g
const withoutBreakMarks = (_key: string, value: unknown): unknown =>
  typeof value === 'string' ? value.replace(BREAK_MARK, '') : value

const readDictionary = (path: string): Dictionary => {
  const raw = JSON.parse(readFileSync(path, 'utf8'), withoutBreakMarks) as Record<string, unknown>
  const out: Record<string, readonly Entry[]> = {}
  for (const [section, value] of Object.entries(raw)) {
    // Why: `$comment` is a string in the generated file and a list in the manuscript, so it is
    // dropped by name; the roster below is a list of sections only.
    if (section.startsWith('$')) continue
    if (Array.isArray(value)) out[section] = value as readonly Entry[]
  }
  return out
}

const MANUSCRIPT = readDictionary(MANUSCRIPT_PATH)
const GENERATED = readDictionary(GENERATED_PATH)

// Why: the roster of sections this file can read: a section the spec adds and this roster lacks
// would key every entry by the empty string and pass under one name.
const KEY_FIELD: Readonly<Record<string, string>> = {
  icons: 'specTableRowId',
  // Why: keyed by the row and not the column: a row may carry several columns and show one name
  // (PR-14 over two).
  properties: 'specTableRowId',
  // Why: keyed by the row of T-104 and not by the key it edits: one row may fix several keys
  // (K-105 spells three) and shows one name over them.
  settings: 'specTableRowId',
  paletteGroups: 'firstRow',
  surfaces: 'name',
  notices: 'specTableRowId',
  shortcuts: 'specTableRowId',
  helpHeadings: 'block',
  // Why: this keys the help's two license words (FR-069) by the part they fill.
  helpLegal: 'part',
  helpNotes: 'specTableRowId',
  // Why: this keys the one sentence under the browser functions block (FR-036) by that block.
  helpBlockNotes: 'block',
  helpLinks: 'link',
  browserFunctions: 'specTableRowId',
  reasons: 'specTableRowId',
  invariants: 'specTableRowId',
  questions: 'specTableRowId',
  confirmation: 'answer',
  noticeDismiss: 'answer',
  confirmationMarks: 'mark',
  // Why: fileStatus is keyed by the state before the first write, which no table numbers (FR-101);
  // exportFormats by its row of T-024, as FR-038 bars the format column from the screen.
  fileStatus: 'state',
  // Why: this keys the App Header's Branding word (BR-1 of table T-349) by the part it fills.
  branding: 'part',
  // Why: keyed by what the default is for (`use`): FR-032 sends the word here by name and no table
  // numbers it; it is the one section whose word no frame prints.
  defaultNames: 'use',
  exportFormats: 'specTableRowId',
  // Why: this keys the settings face's fit span field's words by the part they fill (T-367).
  fitSpanField: 'part',
  // Why: this keys the Export Chooser's span line by the part it fills; FR-096 holds no table row for it.
  exportChooser: 'part',
  // Why: this keys the Open Chooser's words by the part they fill.
  openChooser: 'part',
  // Why: this keys the Drop Cue's line (OP-17, U-68) by the part it fills.
  dropCue: 'part',
  differenceReview: 'part',
  // Why: no panelHeadings key: FR-072 names no state of the panel for a word to be printed in,
  // and the case below says so by name.
  assignments: 'specTableRowId',
  // Why: keyed by row id as reasons is; it stands last because this roster is the generated file's
  // printed order, and nothing asks the two files to agree on where a section is printed.
  arms: 'specTableRowId',
  // Why: keyed by the entry's own weekday in AT-17's order, as no table of seven rows may exist;
  // it stands last for the same reason arms does.
  weekdays: 'weekday',
  // Why: this keys a bar tooltip's line words by their row of table T-348.
  hintLines: 'specTableRowId',
  // Why: this keys a palette color by its stored spelling (table T-294) and a
  // part of the color field by the part it names (CV-9); neither is a row.
  colorNames: 'spelling',
  colorField: 'part',
  // Why: this keys the words a property field fills around a value (a dependency end, the
  // assignee field's add item) by the part they fill; no row of table T-016 numbers them.
  propertyField: 'part',
  // Why: this keys the min-height field's words by the part of the field they fill.
  rowMinHeightField: 'part',
  // Why: this keys the settings face's width field's words the same way (T-368).
  taskGroupPanelWidthField: 'part',
  // Why: this keys a theme hue by its row of table T-305 (FR-041).
  themeHues: 'specTableRowId',
  // Why: this keys a time zone's shown name by its row of table T-376 (FR-156).
  timeZones: 'specTableRowId',
  // Why: this keys the words of the zone fields and of the Time Shift question by their part.
  timeZoneField: 'part',
  // Why: this keys the words of the Shift Whole Schedule row (FO-17) and of its question by their part.
  wholeScheduleShiftField: 'part',
  // Why: this keys the words of the read-only rows of the settings face (table T-380) by their part.
  readOnlySettings: 'part',
  // Why: this keys the Holiday Settings words (U-65, T-344) by the part they fill.
  holidaySettings: 'part',
  // Why: this keys the end word of SE-2 by the end it names, max or min.
  scaleEcho: 'end',
  // Why: this keys the two words FR-036 prints around the keys (the join and the plus key) by their part.
  keyNotation: 'part',
  // Why: this keys the lines of DC-3's readout by the line they fill.
  dualCursorReadout: 'line',
  // Why: this keys a search column's heading by its row of T-331 (FR-151), SQ-5's state word by its row
  // of T-019a, and the panel's own words (SV-7's blank item, SQ-1's no-name word) by part.
  searchColumns: 'specTableRowId',
  planActualStates: 'specTableRowId',
  searchPanel: 'part',
  // Why: this keys the two values of the Task Type column (SQ-14, DT-9, FM-9) by the part they name, task or milestone.
  taskTypes: 'part',
  // Why: this keys the Resource List's headings by their row of table T-371, and its (Unassigned) and joining words by part.
  resourceListColumns: 'specTableRowId',
  resourceList: 'part',
  // Why: this keys QN-12's two choices by the part they fill (PTL-13): the armed and the unarmed
  // wording of the first choice, then the arrows; no table row numbers them.
  parentTaskChoice: 'part',
  // Why: this keys the report's headings by T-347 row, its statuses by the DG / DX row each is
  // made of (DT-1), and its summary, Markdown and DT-7 words by the part they fill (FR-134).
  delayReportColumns: 'specTableRowId',
  delayReportStatuses: 'specTableRowId',
  delayReportSummary: 'part',
  delayReportMarkdown: 'part',
  delayReportReasons: 'part',
  // Why: this keys DT-7's aspect words by their row of table T-310 / T-311 and its wall words by their row of T-316.
  delayReportAspects: 'specTableRowId',
  delayReportWalls: 'specTableRowId',
  // Why: this keys the fix tables' headings by their row of table T-374 and the other fix words by part (FR-155).
  delayFixColumns: 'specTableRowId',
  delayFixes: 'part',
}

const isWords = (value: unknown): value is Words =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((word) => typeof word === 'string')

const keyOf = (section: string, entry: Entry): string => String(entry[KEY_FIELD[section] ?? ''] ?? '')

const wordFieldsOf = (entry: Entry): readonly string[] =>
  Object.entries(entry)
    .filter(([, value]) => isWords(value))
    .map(([field]) => field)

const wordsOf = (entry: Entry, field: string): Words => entry[field] as Words

interface Cell {
  readonly section: string
  readonly key: string
  readonly field: string
  readonly language: string
  readonly word: string
}

const cellsOf = (dictionary: Dictionary): readonly Cell[] => {
  const cells: Cell[] = []
  for (const [section, entries] of Object.entries(dictionary)) {
    for (const entry of entries) {
      const key = keyOf(section, entry)
      for (const field of wordFieldsOf(entry)) {
        for (const [language, word] of Object.entries(wordsOf(entry, field))) {
          cells.push({ section, key, field, language, word })
        }
      }
    }
  }
  return cells
}

const MANUSCRIPT_CELLS = cellsOf(MANUSCRIPT)
const GENERATED_CELLS = cellsOf(GENERATED)

const LANGUAGES: readonly string[] = [...new Set(GENERATED_CELLS.map((cell) => cell.language))]

const T109 = specTable('T-109')

const T023 = specTable('T-023')

const T233 = specTable('T-233').rows.map((row) => ({
  row: row.id,
  manner: bare(row.by['作法'] ?? ''),
  sharesWords: (row.by['まとめ方'] ?? '').startsWith('語は'),
}))

// Why: the column of whether a question names what goes is read raw, not through `bare`,
// because its cells carry a code span that `bare` would return in place of the answer.
const T234 = specTable('T-234').rows.map((row) => ({
  row: row.id,
  namesWhatGoes: (row.by['名前を挙げるか'] ?? '').trim().startsWith('挙げる'),
}))

const T220 = specTable('T-220').rows.map((row) => row.id)

const T220_SHARING: Readonly<Record<string, string>> = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'notice-reasons.json'), 'utf8')) as {
    readonly invariantRefusals: { readonly wordsOf?: Record<string, string> }
  }
).invariantRefusals.wordsOf ?? {}

// Spec: FR-076
const IMPORT_REFUSAL_MANNER = ((): string => {
  const requirements = readFileSync(join(ROOT, 'docs', 'spec', '01-04-requirements.md'), 'utf8')
  const found = /取り込みの検証が拒んだとき、`GRS` は `(NT-\d+[a-z]?)` の通知に、拒んだ Chapter 6\.1 の 表 T-220 の行の行 ID を理由として運ぶこと/.exec(requirements)
  if (found === null) throw new Error('FR-076 no longer names the manner an import refusal is told in')
  return found[1] as string
})()

const t109Row = (specTableRowId: string) => T109.rows.find((row) => row.id === specTableRowId)

const surfacesOf = (specTableRowId: string): readonly string[] =>
  (t109Row(specTableRowId)?.by['面'] ?? '').split('/').map((name) => bare(name.trim())).filter((name) => name !== '')

const groupOf = (specTableRowId: string): string => bare(t109Row(specTableRowId)?.by['群'] ?? '')

const isEntry = (specTableRowId: string): boolean =>
  !/ボタンではない/.test(t109Row(specTableRowId)?.by['何の入口か'] ?? '')

const SURFACE_NAMES = surfacesOf('IC-52')

// Why: AT-17's cell is read raw, not through `bare`, because the numbering is in its prose
// and `bare` would return the first code span instead.
const AT_17 = specTable('T-058').rows.find((row) => row.id === 'AT-17')?.by['意味'] ?? ''

// Why: written out because no seven-row table may exist; the case holds AT-17's sentence first,
// so a re-fixed numbering fails there. These are keys, not words.
const AT_17_ORDER: readonly string[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const T103 = specTable('T-103')

const U_55_CONFIRMATION = bare(T103.rows.find((row) => row.id === 'U-55')?.cells[0] ?? '')

// Why: expected empty: NT-7 gives its two word-button answers no row of T-109;
// their words are the confirmation section's alone.
const ON_U_55: readonly string[] = T109.rows
  .filter((row) => surfacesOf(row.id).includes(U_55_CONFIRMATION))
  .map((row) => row.id)

const assignmentForAxis = (axis: 'horizontal' | 'vertical'): string | undefined =>
  T023.rows.find((row) => row.by['動作']?.includes(axis === 'vertical' ? '縦スクロール' : '横スクロール'))?.id

const ICON_HINT_MS = SETTINGS_CONSTANTS.iconHintDelayMs

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

const centerOf = (region: ScreenRect): { readonly x: number; readonly y: number } => ({
  x: region.x + region.width / 2,
  y: region.y + region.height / 2,
})

// Why: both panel widths are stated, because a panel of no width holds no printed word;
// this frame opens the properties panel as an editing person has it (S-171).
const SETTINGS = {
  ...SETTINGS_DEFAULTS,
  taskGroupPanelWidthPx: 400,
} as unknown as DocumentSettings

const PROPERTIES_PANEL_WIDTH = 300

const REGIONS: ScreenRegions = (() => {
  const width = 1280
  const height = 800
  const headerHeight = 56
  const rulerHeightPx = 48
  // Why: read off the settings above, since the cut and the settings of one frame must be one screen.
  const titleWidth = SETTINGS.taskGroupPanelWidthPx
  const propertiesWidth = PROPERTIES_PANEL_WIDTH
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

const THE_TASK = 1

const SCHEDULE = {
  project: { title: 'a document', themeHue: 214, uidHighWaterMark: 0, minutesPerDay: null },
  calendars: [],
  tasks: [
    {
      uid: THE_TASK,
      parentTaskUid: null,
      wbsOrder: null,
      name: 'a task',
      start: null,
      finish: null,
      milestone: null,
      deadline: null,
      notes: null,
      calendarUid: null,
      actualStart: null,
      actualDuration: null,
      actualFinish: null,
      resume: null,
      resumeValid: null,
      percentComplete: null,
      fadeInDays: null,
      fadeOutDays: null,
      dependencies: [],
      carry: {},
      carryElements: [],
    },
  ],
  resources: [
    {
      uid: 1,
      name: 'a resource',
      resourceKind: null,
      isCostResource: null,
      calendarUid: null,
      carry: {},
      carryElements: [],
    },
  ],
  assignments: [],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [
    {
      taskUid: THE_TASK,
      shapeKind: null,
      milestoneGlyph: null,
      // Why: one custom color with each side left undefined, so the color field
      // prints both notes of CV-9.
      fillColor: '#c0504d/',
      strokeColor: '/#3a5f8a',
      strokeWidthPx: null,
    },
  ],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const TASK_REF: ItemRef = { kind: 'task', uid: THE_TASK }
const HOLDING_A_TASK: Selection = selectionWith(emptySelection(), TASK_REF)

const SESSION: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  iconUnderPointer: null,
  commandPaletteAt: { x: 500, y: 300 },
  // Why: no case reads the theme; S-73 is read off the drawn document as the shell does (DR-5).
  themePreference: 'light',
  themeHue: SCHEDULE.project.themeHue,
  selectedTaskGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  // Why: a whole of zero is everything fits, the lane-long grip SC-4 draws; no case asks it of GR-21.
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const SCREEN_ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage: 'ja',
    helpLanguage: 'ja',
    propertiesPanelContentState: {
      kind: 'selectionDisplayed',
      subject: { selection: emptySelection(), taskGroupIds: [] },
    },
  },
}

const rootWith = (part: Partial<ScreenSession['screen']>): ScreenSession => ({
  ...SCREEN_ROOT,
  screen: { ...SCREEN_ROOT.screen, ...part },
})

const withScreen = (root: ScreenSession, part: Partial<ScreenSession['screen']>): ScreenSession => ({
  ...root,
  screen: { ...root.screen, ...part },
})

const openSurfaceRowsIn = (node: unknown): readonly string[] => {
  if (Array.isArray(node)) return node.flatMap(openSurfaceRowsIn)
  if (node === null || typeof node !== 'object') return []
  const one = node as Record<string, unknown>
  const carries = one['key'] === 'open' ? one['carries'] : undefined
  if (!Array.isArray(carries)) return Object.values(one).flatMap(openSurfaceRowsIn)
  return (carries as { name: string; rows?: string[] }[]).filter((carried) => carried.name === 'surfaceName').flatMap((carried) => carried.rows ?? [])
}

const SURFACE_ROWS_OF_T_280: ReadonlySet<string> = new Set(
  openSurfaceRowsIn(readStateMachineView()),
)

const surfaceRowOf = (surface: string): string => {
  const row = T103.rows.find((one) => bareAll(one.cells[0] ?? '').includes(surface))
  if (row === undefined || !SURFACE_ROWS_OF_T_280.has(row.id)) throw new Error(`${surface} is no U row T-280 lets S-99g carry`)
  return row.id
}

const rootWithSurface = (surface: string | null): ScreenSession =>
  rootWith({
    openSurfaceState: surface === null ? { kind: 'closed' } : { kind: 'open', surfaceName: surfaceRowOf(surface) },
  })

interface Frame {
  readonly regions: ScreenRegions
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly selection: Selection
  readonly root: ScreenSession
  readonly readings: ScreenViewReadings
}

const BASE: Frame = {
  regions: REGIONS,
  schedule: SCHEDULE,
  settings: SETTINGS,
  selection: HOLDING_A_TASK,
  root: SCREEN_ROOT,
  readings: SESSION,
}

const frameWith = (part: Partial<Frame>): Frame => ({ ...BASE, ...part })

const sessionWith = (part: Partial<ScreenViewReadings>): ScreenViewReadings => ({
  ...SESSION,
  ...part,
})

// Why: the milestone list is opened (S-142) so every figure entrance FR-053 shows only then has a
// place; opening it hides nothing, so the palette's whole roster stands on this one frame.
const PALETTE_SHOWN = frameWith({
  root: rootWith({ milestoneListDisplayState: { kind: 'open' } }),
})

// Why: the states carry no word since FR-072 dropped the heading; the frames stay because two
// cases below still ask what the panel is in each.
const PANEL_STATES: Readonly<Record<string, Frame>> = {
  selection: frameWith({
    root: rootWith({
      propertiesPanelContentState: {
        kind: 'selectionDisplayed',
        subject: { selection: emptySelection(), taskGroupIds: [] },
      },
    }),
  }),
  documentSettings: frameWith({
    root: rootWith({ propertiesPanelContentState: { kind: 'documentSettingsDisplayed' } }),
  }),
  noSelection: frameWith({
    selection: emptySelection(),
    root: rootWith({
      propertiesPanelContentState: {
        kind: 'selectionDisplayed',
        subject: { selection: emptySelection(), taskGroupIds: [] },
      },
    }),
  }),
}

// Spec: FR-151, T-330, T-331, T-019a
// Why: one task per row of T-019a, so each state word has a cell to print in (SQ-5); the PS-1 task
// has no name (SQ-1) and no task an assignee, so the assignee filter offers the blank item (SV-7).
const SEARCH_STARTED = '2026-01-05T08:00:00'
const SEARCH_TASK_BY_STATE: Readonly<
  Record<string, { readonly uid: number; readonly name: string; readonly actuals: object }>
> = {
  'PS-1': { uid: 1, name: '', actuals: {} },
  'PS-2': { uid: 2, name: 'a finished task', actuals: { actualStart: SEARCH_STARTED, actualFinish: '2026-01-09T17:00:00' } },
  'PS-3': { uid: 3, name: 'a task paused with no resume date', actuals: { actualStart: SEARCH_STARTED, resumeValid: false } },
  'PS-4': {
    uid: 4,
    name: 'a task paused with a resume date',
    actuals: { actualStart: SEARCH_STARTED, resume: '2026-02-02T08:00:00', resumeValid: true },
  },
  'PS-5': { uid: 5, name: 'a task in progress', actuals: { actualStart: SEARCH_STARTED } },
}

const SEARCH_TEMPLATE_TASK = (SCHEDULE.tasks as readonly object[])[0] as object

const SCHEDULE_TO_SEARCH = {
  ...SCHEDULE,
  tasks: Object.values(SEARCH_TASK_BY_STATE).map((one) => ({
    ...SEARCH_TEMPLATE_TASK,
    uid: one.uid,
    name: one.name,
    ...one.actuals,
  })),
  taskVisuals: [],
} as unknown as Schedule

// Why: the search table's view (Visibility column, Schedule Filter, column filters, sort) is the document's, so it
// is handed in through the settings the frame carries, not through the panel reading.
type SearchTableViewSetting = DocumentSettings['tableViews']['searchPanel']

// Trap: SETTINGS is built from the flat SETTINGS_DEFAULTS, so it holds no nested tableViews group of its own.
const NO_SEARCH_VIEW: SearchTableViewSetting = { columnFilters: [], shownTaskUids: [], isScheduleFilterApplied: false, sort: null }

const searchFrame = (
  shown: 'normal' | 'maximized' | 'minimized',
  panel: Partial<SearchPanelSession>,
  view: Partial<SearchTableViewSetting> = {},
): Frame =>
  frameWith({
    settings: { ...SETTINGS, tableViews: { ...SETTINGS.tableViews, searchPanel: { ...NO_SEARCH_VIEW, ...view } } },
    schedule: SCHEDULE_TO_SEARCH,
    selection: emptySelection(),
    root: rootWith({ searchPanelDisplayState: { kind: 'shown', child: { kind: shown } } }),
    readings: sessionWith({ searchPanel: { ...emptySearchPanelSession, ...panel } }),
  })

const ASSIGNEE_COLUMN = 'SQ-2'
const STATE_COLUMN = 'SQ-5'
const NAME_COLUMN = 'SQ-1'
const MAXIMIZE_ENTRY = 'IC-121'
const COMMENT_BOX_COLUMNS: ReadonlySet<string> = new Set(['SQ-7', 'SQ-8', 'SQ-9'])

const SEARCH_TASKS_SHOWN = searchFrame('normal', { filters: { open: ASSIGNEE_COLUMN } })
// Spec: SQ-10, TV-11
const SHOWN_SEARCH_UIDS: readonly number[] = [2, 3]
// Why: TV-2: every row starts unchecked (Hide), so the rows named are the checked (Show) ones.
const checkedOnly = (shown: readonly number[], isScheduleFilterApplied: boolean): Partial<SearchTableViewSetting> => ({
  shownTaskUids: Object.values(SEARCH_TASK_BY_STATE).map((one) => one.uid).filter((uid) => shown.includes(uid)),
  isScheduleFilterApplied: isScheduleFilterApplied,
})
// Why: TV-5: IC-143 is idle for two reasons: no row is checked (the frame's default) or every row is checked (nothing to narrow).
const SEARCH_EVERY_TASK_CHECKED = searchFrame('normal', {}, checkedOnly(Object.values(SEARCH_TASK_BY_STATE).map((one) => one.uid), false))
// Why: the shell hands the product in as a reading (TV-1); the band counts it.
const SEARCH_SCHEDULE_FILTERED: Frame = (() => {
  const frame = searchFrame('minimized', {}, checkedOnly(SHOWN_SEARCH_UIDS, true))
  return { ...frame, readings: { ...frame.readings, drawnTaskUids: new Set(SHOWN_SEARCH_UIDS) } }
})()
// Why: TV-11 fills {tables}, {total} and {shown}, so the table name and the digits are put back to see the literal word
// (as minHeightWordOf does for MH-3); a sentinel holds no digit standing alone and passes unchanged.
const countSlotsOf = (text: string | null | undefined, tables: string | undefined): string | undefined =>
  text === null || text === undefined || tables === undefined
    ? undefined
    : text
        .replace(tables, '{tables}')
        .replace(new RegExp(`(?<![0-9])${Object.keys(SEARCH_TASK_BY_STATE).length}(?![0-9])`), '{total}')
        .replace(new RegExp(`(?<![0-9])${SHOWN_SEARCH_UIDS.length}(?![0-9])`), '{shown}')

const SEARCH_COMMENT_BOXES_SHOWN = searchFrame('normal', { table: 'commentBoxes' })
const SEARCH_MAXIMIZED = searchFrame('maximized', {})

const surfaceOpen = (surface: string): Frame => frameWith({ root: rootWithSurface(surface) })

const HELP_SURFACE = surfacesOf('IC-129')[0] ?? ''

const helpShown = (window: 'normal' | 'maximized'): Frame =>
  frameWith({ root: rootWith({ helpDisplayState: { kind: 'shown', child: { kind: window } } }) })

const HELP_SHOWN = helpShown('normal')

// Why: T-335 WB-4 draws IC-131 only while the help is maximized (WB-3), in the place of IC-130.
const HELP_MAXIMIZED = helpShown('maximized')

// Spec: T-335, WB-3, WB-4
const RESTORE_ENTRY = 'IC-131'

// Why: IC-143 refuses while no row is Hide (TV-5), and its hint would then carry the reason too.
const SEARCH_TASKS_CHECKED = searchFrame('normal', { filters: { open: ASSIGNEE_COLUMN } }, checkedOnly(SHOWN_SEARCH_UIDS, false))

// Spec: S-451, RW-1
// Why: the shell holds the report and hands it in as a reading; an empty diagnosis still raises the window.
const NO_DELAY_FOUND: DelayDiagnosticsReport = {
  outcome: 'diagnosed',
  statusDate: null,
  findings: [],
  bottlenecks: [],
  terminalPushOuts: [],
  walls: [],
  unreliableCount: 0,
  markerStates: [],
  settledPushOuts: [],
  derivedParentTasks: [],
  lateDays: [],
}

// Why: a filter stands open, so IC-123 .. IC-126 stand in its menu (RW-2, SV-7).
const REPORT_FILTER_OPEN = { ...OPENED_DELAY_DIAGNOSTICS_REPORT.panel, filters: { open: 'DT-1' } }
// Why: IC-157 and IC-158 stand in the footer under the fix proposals only (RW-12), so their frame shows that table.
const delayReportShown = (shown: 'normal' | 'maximized', table: 'diagnosis' | 'proposals' | 'log' = 'diagnosis'): Frame =>
  frameWith({
    readings: sessionWith({
      delayDiagnosticsReport: {
        window: { ...OPENED_DELAY_DIAGNOSTICS_REPORT, shown, panel: REPORT_FILTER_OPEN, fixes: { ...NO_DELAY_FIX_VALUES, table } },
        report: NO_DELAY_FOUND,
        fixTables: ONE_FIX_LOGGED,
      },
    }),
  })

// Spec: RW-12
const FIX_FOOTER_ENTRIES: readonly string[] = ['IC-166', 'IC-157', 'IC-158']

const FIX_LOG_FOOTER_ENTRIES: readonly string[] = ['IC-169']

// Why: IC-156 stands only once the fix log holds a row (RW-11); the row's own fields are not read here.
const ONE_FIX_LOGGED = {
  proposals: [],
  log: [{
    fixedAt: '2027-05-02T09:00:00',
    order: 0,
    fixRow: 'FA-11',
    findingRow: 'VC-11',
    taskUid: 1,
    taskName: null,
    column: null,
    before: { kind: 'empty' as const },
    after: { kind: 'empty' as const },
    isCascade: false,
  }],
}

// Spec: FR-099, T-370, T-371, S-545
// Why: the one resource of SCHEDULE is chosen for IC-67 and not for IC-68 (RQ-3), and a filter stands open for IC-123 .. IC-126.
const resourceListShown = (shown: 'normal' | 'maximized', isChosen: boolean): Frame => {
  const panel = { ...OPENED_RESOURCE_LIST.panel, filters: { open: 'RQ-2' } }
  const resourceList = { ...OPENED_RESOURCE_LIST, shown, panel }
  return frameWith({ readings: sessionWith({ resourceList, selectedResourceUids: isChosen ? [1] : [] }) })
}

type TableWindowView =
  | NonNullable<ScreenView['searchPanel']>
  | NonNullable<ScreenView['delayDiagnosticsReport']>
  | NonNullable<ScreenView['resourceList']>

// Spec: FR-151, FR-134, T-335, SV-7
const tableWindowEntries = (window: TableWindowView | null | undefined): readonly CommandItem[] | undefined =>
  window === null || window === undefined
    ? undefined
    : [
        ...window.titleEntries,
        ...window.tableEntries,
        ...('toolEntries' in window ? window.toolEntries : []),
        ...('tabEntries' in window ? [...(window.tabEntries ?? []), ...(window.walkEntries ?? []), ...(window.fixFooter?.entries ?? [])] : []),
        ...('choiceEntries' in window ? [...window.choiceEntries, ...window.rows.flatMap((row) => row.chosenEntry ?? [])] : []),
        ...window.columns.map((column) => column.filterEntry),
        ...(window.filterMenu?.entries ?? []),
      ]

// Spec: FR-072, FR-153, AS-5
const propertiesPanelEntries = (panel: ScreenView['propertiesPanel']): readonly CommandItem[] | undefined =>
  panel === null
    ? undefined
    : [
        ...panel.commands,
        ...(panel.headEntry === undefined ? [] : [panel.headEntry]),
        ...panel.fields.flatMap((field) => field.controls.flatMap((control) => control.assignee?.sortEntries ?? [])),
        ...panel.fields.flatMap((field) => field.controls.flatMap((control) => control.assignee?.checkEntries ?? [])),
        ...panel.fields.flatMap((field) => field.controls.flatMap((control) => wordEntranceOf(field.row, control.press))),
      ]

// Spec: FO-16, IC-162
// Why: an entrance of table T-109 drawn as its own field's word button stands in that field, not beside IC-52.
const wordEntranceOf = (row: string, press: string | undefined): readonly CommandItem[] =>
  press === undefined || !row.startsWith('IC-')
    ? []
    : [{ icon: row as CommandItem['icon'], label: press, isEnabled: true, isPressed: false, isArmed: false, isChosen: false }]

// Spec: FR-153, FO-16
const ON_THE_SETTINGS_FACE_ONLY: readonly string[] = ['IC-139', 'IC-162']

// Spec: IC-52, T-109
interface SurfaceScene {
  readonly frame: (specTableRowId: string | null) => Frame
  readonly heading: ((view: ScreenView) => string | undefined) | null
  readonly entries: (view: ScreenView) => readonly CommandItem[] | undefined
}

// Spec: T-280, S-99g, IC-52
// Why: S-99g holds U rows only, so the help, the panel and the windows are raised by their own scenes.
const SCENE_OF_WINDOW: ReadonlyMap<string, SurfaceScene> = new Map([
  [
    HELP_SURFACE,
    {
      frame: (specTableRowId) => (specTableRowId === RESTORE_ENTRY ? HELP_MAXIMIZED : HELP_SHOWN),
      heading: (view) => view.helpModal?.heading,
      entries: (view) => view.helpModal?.commands,
    },
  ],
  [
    'Search Panel',
    {
      frame: (specTableRowId) => (specTableRowId === RESTORE_ENTRY ? SEARCH_MAXIMIZED : SEARCH_TASKS_CHECKED),
      heading: (view) => view.searchPanel?.heading,
      entries: (view) => tableWindowEntries(view.searchPanel),
    },
  ],
  [
    'Delay Diagnostics Report',
    {
      frame: (specTableRowId) => delayReportShown(specTableRowId === RESTORE_ENTRY ? 'maximized' : 'normal', FIX_FOOTER_ENTRIES.includes(specTableRowId ?? '') ? 'proposals' : FIX_LOG_FOOTER_ENTRIES.includes(specTableRowId ?? '') ? 'log' : 'diagnosis'),
      heading: (view) => view.delayDiagnosticsReport?.heading,
      entries: (view) => tableWindowEntries(view.delayDiagnosticsReport),
    },
  ],
  [
    'Resource List',
    {
      frame: (specTableRowId) => resourceListShown(specTableRowId === RESTORE_ENTRY ? 'maximized' : 'normal', specTableRowId === 'IC-67'),
      heading: (view) => view.resourceList?.heading,
      entries: (view) => tableWindowEntries(view.resourceList),
    },
  ],
  [
    'Properties Panel',
    {
      // Why: IC-139 stands at the head of the document-settings face only (FR-153), IC-162 in its field (FO-16).
      frame: (specTableRowId) => (PANEL_STATES[ON_THE_SETTINGS_FACE_ONLY.includes(specTableRowId ?? '') ? 'documentSettings' : 'selection'] as Frame),
      // Why: FR-072 puts no heading row at the panel's head, so no member carries this word.
      heading: null,
      entries: (view) => propertiesPanelEntries(view.propertiesPanel),
    },
  ],
])

// Spec: T-280, S-99g
const openSurfaceScene = (surface: string): SurfaceScene => ({
  frame: () => surfaceOpen(surface),
  heading: (view) => view.openModal?.heading,
  entries: (view) => view.openModal?.commands,
})

// Spec: U-65, T-344, WC-1, WC-2, WC-4, WC-6, WC-7, WC-8
// Why: the title bar holds IC-52 alone (WC-1); every other entry stands in its own section,
// Why: so the scene reads them there. One day-off exception row raises IC-136 and IC-137 (WC-4).
const HOLIDAY_SETTINGS_SURFACE = 'Holiday Settings'
const ONE_DAY_OFF = {
  ordinal: 0,
  name: 'a day off',
  fromDate: '2026-01-05T00:00:00',
  toDate: '2026-01-05T23:59:00',
  dayWorking: false,
  recurrenceKind: null,
  workingTimes: [],
  carry: {},
  carryElements: [],
}
const SCHEDULE_WITH_A_DAY_OFF = {
  ...SCHEDULE,
  calendars: [
    {
      uid: 1,
      name: 'a calendar',
      isBaseCalendar: true,
      baseCalendarUid: null,
      ordinal: 0,
      carry: {},
      carryElements: [],
      weekDays: [],
      exceptions: [ONE_DAY_OFF],
    },
  ],
} as unknown as Schedule
const holidaySettingsOf = (view: ScreenView) =>
  view.openModal !== null && 'holidaySettings' in view.openModal ? view.openModal.holidaySettings : undefined
const HOLIDAY_SETTINGS_SCENE: SurfaceScene = {
  frame: () => frameWith({ root: rootWithSurface(HOLIDAY_SETTINGS_SURFACE), schedule: SCHEDULE_WITH_A_DAY_OFF }),
  heading: (view) => view.openModal?.heading,
  entries: (view) => {
    const face = holidaySettingsOf(view)
    if (face === undefined) return undefined
    return [
      ...(view.openModal?.commands ?? []),
      ...face.weekdays.map((one) => one.item),
      ...face.workingTimes.map((one) => one.remove.item),
      face.addWorkingTime.item,
      ...face.exceptions.flatMap((one) => (one.kind === null ? [one.remove.item] : [one.kind.item, one.remove.item])),
      face.addException.item,
      face.apply.item,
    ]
  },
}

// Spec: WC-3, WC-8, IC-134, IC-165
// Why: these two are fields (a chooser and the time fields), named by the holidaySettings words.
const HOLIDAY_SETTINGS_FIELD_ENTRIES: readonly string[] = ['IC-134', 'IC-165']

const sceneOf = (surface: string): SurfaceScene =>
  SCENE_OF_WINDOW.get(surface) ?? (surface === HOLIDAY_SETTINGS_SURFACE ? HOLIDAY_SETTINGS_SCENE : openSurfaceScene(surface))

const surfaceFrame = (surface: string, specTableRowId: string | null = null): Frame => sceneOf(surface).frame(specTableRowId)

type Build = typeof screenViewFromRegions

// Why: the arrival sweep asks every frame once per written word; one build per frame and language
// Why: keeps that case from rebuilding the same view hundreds of times.
const VIEWS_BUILT = new Map<Build, WeakMap<Frame, Map<string, ScreenView>>>()

const viewOf = (build: Build, frame: Frame, language: string): ScreenView => {
  const byFrame = VIEWS_BUILT.get(build) ?? new WeakMap<Frame, Map<string, ScreenView>>()
  VIEWS_BUILT.set(build, byFrame)
  const byLanguage = byFrame.get(frame) ?? new Map<string, ScreenView>()
  byFrame.set(frame, byLanguage)
  const held = byLanguage.get(language)
  if (held !== undefined) return held
  const view = freshViewOf(build, frame, language)
  byLanguage.set(language, view)
  return view
}

const freshViewOf = (build: Build, frame: Frame, language: string): ScreenView =>
  build(
    frame.regions,
    frame.schedule,
    frame.settings,
    frame.selection,
    withScreen(frame.root, { screenLanguage: language as DisplayLanguage, helpLanguage: language as DisplayLanguage }),
    frame.readings,
  )

const labelIn = (commands: readonly CommandItem[] | undefined, icon: string): string | undefined =>
  commands?.find((command) => command.icon === icon)?.label

// Why: the band's own entrance is in no group (T-109 gives IC-75 none; FR-053 puts it on the band),
// so `groups` alone would miss a word the dictionary holds.
const paletteCommands = (view: ScreenView): readonly CommandItem[] => {
  const inGroups = (view.commandPalette?.groups ?? []).flatMap((group) => group.commands)
  const onBand = view.commandPalette?.minimize
  return onBand === undefined ? inGroups : [...inGroups, onBand]
}

const iconTooltip = (view: ScreenView, icon: string): string | undefined =>
  view.tooltips.find((tip) => tip.anchor.kind === 'icon' && tip.anchor.icon === icon)?.text

const scrollbarTooltip = (view: ScreenView, axis: string): string | undefined =>
  view.tooltips.find((tip) => tip.anchor.kind === 'scrollbar' && tip.anchor.axis === axis)?.text

// Why: a point, not a rectangle: FR-053 makes the palette's size follow its contents, so no
// description carries an extent; EZ-2 needs only a pointer on the palette.
const PALETTE_AT: { readonly x: number; readonly y: number } =
  viewOf(screenViewFromRegions, PALETTE_SHOWN, 'ja').commandPalette?.at ?? { x: 0, y: 0 }

const scrollbarPointer = (axis: 'horizontal' | 'vertical'): { x: number; y: number } => {
  const bar = viewOf(screenViewFromRegions, BASE, 'ja').frame.scrollbars.find((one) => one.axis === axis)
  if (bar === undefined) throw new Error(`SC-4 of table T-031 keeps both bars drawn, and the ${axis} one is absent`)
  return { x: bar.track.x + bar.track.width / 2, y: bar.track.y + bar.track.height / 2 }
}

// Why: the places are built by walking the dictionary and asking the tables where each key stands,
// so no place is typed and an entry the tables move follows.

interface Place {
  readonly section: string
  readonly key: string
  readonly field: string
  readonly unit: string
  readonly what: string
  readonly frame: Frame
  readonly read: (view: ScreenView) => string | undefined
}

interface Dropped {
  readonly section: string
  readonly key: string
  readonly why: string
}

const PLACES: Place[] = []
const DROPPED: Dropped[] = []
const HEADINGLESS_SURFACES_HELD: string[] = []

const place = (part: Place): void => {
  PLACES.push(part)
}

const drop = (section: string, key: string, why: string): void => {
  DROPPED.push({ section, key, why })
}

// Why: the point does not name the icon, as no ScreenView member carries an entry's rectangle;
// it only keeps the session whole, since a null pointer is outside the window.
const iconFrames = new Map<string, Frame>()

for (const entry of GENERATED['icons'] ?? []) {
  const specTableRowId = keyOf('icons', entry)
  const row = t109Row(specTableRowId)
  if (row === undefined) {
    drop('icons', specTableRowId, 'table T-109 has no such row')
    continue
  }
  if (!isEntry(specTableRowId)) {
    drop('icons', specTableRowId, 'table T-109 says it is not an entry a person presses')
    continue
  }

  const surfaces = surfacesOf(specTableRowId)
  const on = (
    what: string,
    unit: string,
    frame: Frame,
    pointer: { readonly x: number; readonly y: number },
    read: (view: ScreenView) => string | undefined,
  ): void => {
    place({ section: 'icons', key: specTableRowId, field: 'label', unit, what, frame, read })
    if (!iconFrames.has(specTableRowId)) {
      iconFrames.set(specTableRowId, {
        ...frame,
        readings: {
          ...frame.readings,
          pointer,
          iconUnderPointer: specTableRowId,
          pointerRestedMs: ICON_HINT_MS + 1,
          hintTargetDwellMs: ICON_HINT_MS + 1,
        },
      })
    }
  }

  if (surfaces.includes('App Header')) {
    on(`the App Header entry ${specTableRowId}`, 'UF-62', BASE, centerOf(REGIONS.appHeader), (view) =>
      labelIn(view.appHeaderItems.commands, specTableRowId),
    )
  }
  if (surfaces.includes('Command Palette')) {
    on(`the Command Palette entry ${specTableRowId}`, 'UF-65', PALETTE_SHOWN, PALETTE_AT, (view) =>
      labelIn(paletteCommands(view), specTableRowId),
    )
  }
  for (const surface of surfaces.filter((name) => SURFACE_NAMES.includes(name))) {
    if (surface === HOLIDAY_SETTINGS_SURFACE && HOLIDAY_SETTINGS_FIELD_ENTRIES.includes(specTableRowId)) {
      drop('icons', specTableRowId, 'a field of table T-344 (WC-3, WC-8): it prints its value under a holidaySettings word, not a label')
      continue
    }
    on(`the ${surface} entry ${specTableRowId}`, 'UF-66', surfaceFrame(surface, specTableRowId), centerOf(REGIONS.scheduleCanvas), (view) =>
      labelIn(sceneOf(surface).entries(view), specTableRowId),
    )
  }

  if (!PLACES.some((one) => one.section === 'icons' && one.key === specTableRowId)) {
    drop('icons', specTableRowId, `no unit of the five publishes a member for an entry on ${surfaces.join(' / ')}`)
  }
}

for (const [specTableRowId, frame] of iconFrames) {
  place({
    section: 'icons',
    key: specTableRowId,
    field: 'hint',
    unit: 'UF-69',
    what: `the explanation EZ-2 shows against ${specTableRowId}`,
    frame,
    read: (view) => iconTooltip(view, specTableRowId),
  })
}

for (const entry of GENERATED['paletteGroups'] ?? []) {
  const firstRow = keyOf('paletteGroups', entry)
  const group = groupOf(firstRow)
  const held = T109.rows
    .filter((row) => surfacesOf(row.id).includes('Command Palette'))
    .filter((row) => groupOf(row.id) === group)
    .filter((row) => isEntry(row.id))
  const first = held[0]
  if (group === '' || first === undefined) {
    drop('paletteGroups', firstRow, 'table T-109 puts no entry in that group, so no group of the palette holds it')
    continue
  }
  place({
    section: 'paletteGroups',
    key: firstRow,
    field: 'name',
    unit: 'UF-65',
    what: `the name of the palette group that holds ${first.id}`,
    frame: PALETTE_SHOWN,
    read: (view) =>
      view.commandPalette?.groups.find((one) => one.commands.some((command) => command.icon === first.id))?.name,
  })
}

for (const entry of GENERATED['surfaces'] ?? []) {
  const name = keyOf('surfaces', entry)
  if (!SURFACE_NAMES.includes(name)) {
    drop('surfaces', name, 'IC-52 of table T-109 does not name that surface')
    continue
  }
  const heading = sceneOf(name).heading
  // Why: a surface that prints no heading holds no heading word; the FR-072 case below fails on one.
  if (heading === null) {
    HEADINGLESS_SURFACES_HELD.push(name)
    continue
  }
  place({
    section: 'surfaces',
    key: name,
    field: 'heading',
    unit: 'UF-66',
    what: `the heading of ${name}`,
    frame: surfaceFrame(name),
    read: heading,
  })
}

// Why: read by row and never by position: FR-006's order is a rule of its own held elsewhere,
// so a reordering must not make this file fall too.
const propertyFieldName = (view: ScreenView, specTableRowId: string): string | undefined => {
  const field = view.propertiesPanel?.fields.find((one) => one.row === specTableRowId)
  // Why: a command row (PR-48, PR-49) has no name cell; its word is the one button it draws.
  return field?.name === '' ? field.controls[0]?.press : field?.name
}

// Why: FR-006 prints only the rows whose target matches what is selected, so a TaskGroup row's
// word needs a frame that picks a task group, not one that holds only a task.
const T016 = specTable('T-016')
const APPLIES_TO_COLUMN = '対象'
const GRS_COLUMN = '列（`GRS JSON`）'
const ON_A_TASK = 'Task'
const ON_A_TASK_GROUP = 'TaskGroup'
// Why: MK-13 sends a double click on a comment box to PR-21, so its word arrives on a frame
// that picks a comment box and nowhere on the task's frame.
const ON_A_COMMENT_BOX = 'CommentBox'
const ON_A_HIGHLIGHT_BOX = 'HighlightBox'

// Why: a TaskGroup row's field declares AT-53 for the name only (IR-1 of T-263, FR-085); other
// fields declare their T-016 row, so the AT row is read out of IR-1 and matched through T-058.
const ENTITY_COLUMN = 'エンティティ'
const COLUMN_COLUMN = '列'
const T058 = specTable('T-058')

const NAME_FIELD_CLAUSE = /プロパティパネルのタスクグループ名の欄なら `_assets\/fig-erd-detail\.md` の `(AT-\d+)`/
const NAME_FIELD_ROW = ((): string => {
  const how = specTable('T-263').rows.find((row) => row.id === 'IR-1')?.by['書き方'] ?? ''
  const found = NAME_FIELD_CLAUSE.exec(how)?.[1]
  if (found === undefined) throw new Error('IR-1 of table T-263 no longer names the task-group-name field by an AT row')
  return found
})()

const declaredRowOf = (specTableRowId: string): string => {
  const item = T016.rows.find((row) => row.id === specTableRowId)
  if (item === undefined) return specTableRowId
  if (bare(item.by[APPLIES_TO_COLUMN] ?? '') !== ON_A_TASK_GROUP) return specTableRowId
  const column = bare(item.by[GRS_COLUMN] ?? '')
  const attribute = T058.rows.find(
    (row) => bare(row.by[ENTITY_COLUMN] ?? '') === ON_A_TASK_GROUP && bare(row.by[COLUMN_COLUMN] ?? '') === column,
  )
  if (attribute === undefined) {
    throw new Error(`table T-058 has no row for ${ON_A_TASK_GROUP}.${column}, which table T-016 ${specTableRowId} edits`)
  }
  return attribute.id === NAME_FIELD_ROW ? attribute.id : specTableRowId
}

const THE_TASK_GROUP = '11111111-1111-4111-8111-111111111111'

const SCHEDULE_WITH_A_TASK_GROUP = {
  ...SCHEDULE,
  taskGroups: [
    {
      id: THE_TASK_GROUP,
      parentId: null,
      name: 'a task group',
      derivedFromTaskUid: null,
      order: 0,
      treeState: 'auto', color: null,
      minHeightPx: null,
    },
  ],
} as unknown as Schedule

// Why: no task picked beside the task group: FR-006 shows one subject's fields, so a picked task would hide the task group's.
const TASK_GROUP_PICKED: Frame = frameWith({
  schedule: SCHEDULE_WITH_A_TASK_GROUP,
  selection: emptySelection(),
  readings: sessionWith({ selectedTaskGroupIds: [THE_TASK_GROUP] }),
})

// Spec: MH-3
// Why: placedTaskGroups makes the panel show `currentValue`, not `currentlyHidden`; kept
// off TASK_GROUP_PICKED so every other `properties` place() reads that one unchanged.
const TASK_GROUP_PLACED: Frame = frameWith({
  schedule: SCHEDULE_WITH_A_TASK_GROUP,
  selection: emptySelection(),
  readings: sessionWith({
    selectedTaskGroupIds: [THE_TASK_GROUP],
    placedTaskGroups: [{ taskGroupId: THE_TASK_GROUP, depth: 0, y: 0, height: 42, stackCount: 1, stackTops: [0] }],
  }),
})

// Why: the pick is in the selection, not the session: a panel task group is held by
// selectedTaskGroupIds (FR-085), everything T-023c admits by Selection (SL-1).
const THE_BOX = 'c1'

const SCHEDULE_WITH_A_COMMENT_BOX = {
  ...SCHEDULE,
  commentBoxes: [
    {
      id: THE_BOX,
      leaderShapeKind: null,
      text: 'a body',
      anchorDate: null,
      anchorTaskGroupId: null,
      bodyOffsetPx: null,
    },
  ],
} as unknown as Schedule

const BOX_PICKED: Frame = frameWith({
  schedule: SCHEDULE_WITH_A_COMMENT_BOX,
  selection: selectionWith(emptySelection(), { kind: 'commentBox', id: THE_BOX }),
})

const THE_HIGHLIGHT_BOX = 'h1'

const HIGHLIGHT_BOX_PICKED: Frame = frameWith({
  schedule: {
    ...SCHEDULE,
    highlightBoxes: [
      {
        id: THE_HIGHLIGHT_BOX,
        start: null,
        finish: null,
        topTaskGroupId: null,
        bottomTaskGroupId: null,
        strokeColor: null,
        cornerRadiusPx: null,
      },
    ],
  } as unknown as Schedule,
  selection: selectionWith(emptySelection(), { kind: 'highlightBox', id: THE_HIGHLIGHT_BOX }),
})

// Spec: T-016, ET-3
// Why: the successor holds a dependency line, so the pick names it and the line's place.
const ON_A_DEPENDENCY = 'Dependency'
const THE_PREDECESSOR = 2

const SCHEDULE_WITH_A_DEPENDENCY = {
  ...SCHEDULE,
  tasks: [
    {
      ...SCHEDULE.tasks[0],
      dependencies: [
        { predecessorUid: THE_PREDECESSOR, linkType: 1, linkLag: 0, lagFormat: 7, carry: {}, carryElements: [] },
      ],
    },
    { ...SCHEDULE.tasks[0], uid: THE_PREDECESSOR, name: 'a predecessor', dependencies: [] },
  ],
} as unknown as Schedule

const DEPENDENCY_PICKED: Frame = frameWith({
  schedule: SCHEDULE_WITH_A_DEPENDENCY,
  selection: selectionWith(emptySelection(), { kind: 'dependency', successorUid: THE_TASK, ordinal: 0 }),
})

// Spec: FR-006, T-016
// Why: a milestone row is printed only for a milestone task, so its word arrives on this frame.
const SHOWN_FOR_COLUMN = '出す種類'
const FOR_A_MILESTONE = 'milestone'

const MILESTONE_PICKED: Frame = frameWith({
  schedule: {
    ...SCHEDULE,
    tasks: [{ ...SCHEDULE.tasks[0], milestone: true }],
  } as unknown as Schedule,
})

// Why: throws on an unknown target rather than falling back to the task's frame, or the road
// would be reported broken while only a frame is missing.
const frameFor = (specTableRowId: string): Frame => {
  const appliesTo = bare(T016.rows.find((row) => row.id === specTableRowId)?.by[APPLIES_TO_COLUMN] ?? '')
  if (appliesTo === ON_A_TASK) {
    const shownFor = bare(T016.rows.find((row) => row.id === specTableRowId)?.by[SHOWN_FOR_COLUMN] ?? '')
    return shownFor === FOR_A_MILESTONE ? MILESTONE_PICKED : (PANEL_STATES['selection'] as Frame)
  }
  if (appliesTo === ON_A_TASK_GROUP) return TASK_GROUP_PICKED
  if (appliesTo === ON_A_COMMENT_BOX) return BOX_PICKED
  if (appliesTo === ON_A_HIGHLIGHT_BOX) return HIGHLIGHT_BOX_PICKED
  if (appliesTo === ON_A_DEPENDENCY) return DEPENDENCY_PICKED
  throw new Error(
    `table T-016 ${specTableRowId} carries 対象 ${JSON.stringify(appliesTo)}, which this file can raise no frame for`,
  )
}

for (const entry of GENERATED['properties'] ?? []) {
  const specTableRowId = keyOf('properties', entry)
  const declared = declaredRowOf(specTableRowId)
  place({
    section: 'properties',
    key: specTableRowId,
    field: 'label',
    unit: 'UF-67',
    what: `the name the properties panel shows for ${specTableRowId}`,
    frame: frameFor(specTableRowId),
    read: (view) => propertyFieldName(view, declared),
  })
  // Why: a row shown for both kinds may carry the milestone's own name too (FR-006).
  if ('milestoneLabel' in entry) {
    place({
      section: 'properties',
      key: specTableRowId,
      field: 'milestoneLabel',
      unit: 'UF-67',
      what: `the name the properties panel shows for ${specTableRowId} while a milestone is selected`,
      frame: MILESTONE_PICKED,
      read: (view) => propertyFieldName(view, declared),
    })
  }
}

// Spec: PR-43, FR-038
const NAME_SLOT = '{name}'
const UID_SLOT = '{uid}'
const PREDECESSOR_NAME = 'a predecessor'
// Why: a row of table T-016 may list several columns; these two rows each edit one.
const isOnlyColumn = (row: (typeof T016.rows)[number], column: string): boolean =>
  (row.by[GRS_COLUMN] ?? '').trim() === `\`${column}\``
const PREDECESSOR_ROW = T016.rows.find(
  (row) => bare(row.by[APPLIES_TO_COLUMN] ?? '') === ON_A_DEPENDENCY && isOnlyColumn(row, 'predecessorUid'),
)?.id
const dependencyEndWordOf = (text: string): string =>
  text
    .split(PREDECESSOR_NAME)
    .join(NAME_SLOT)
    .replace(new RegExp(`(?<![0-9])${THE_PREDECESSOR}(?![0-9])`), UID_SLOT)
// Spec: PR-16, AS-5
const ASSIGNEE_ROW = T016.rows.find(
  (row) => bare(row.by[APPLIES_TO_COLUMN] ?? '') === ON_A_TASK && isOnlyColumn(row, 'assignee'),
)?.id
const PROPERTY_FIELD_READS: Readonly<Record<string, Pick<Place, 'frame' | 'read'>>> = {
  dependencyEnd: {
    frame: DEPENDENCY_PICKED,
    read: (view) => {
      const text = view.propertiesPanel?.fields.find((field) => field.row === PREDECESSOR_ROW)?.text
      return text === undefined ? undefined : dependencyEndWordOf(text)
    },
  },
  addResource: {
    frame: PANEL_STATES['selection'] as Frame,
    read: (view) =>
      view.propertiesPanel?.fields
        .find((field) => field.row === ASSIGNEE_ROW)
        ?.controls.find((control) => control.assignee !== undefined)?.assignee?.addWord,
  },
}

for (const entry of GENERATED['propertyField'] ?? []) {
  const part = keyOf('propertyField', entry)
  const reading = PROPERTY_FIELD_READS[part]
  if (reading === undefined) {
    drop('propertyField', part, 'no row of table T-016 names where this part of a property field is printed')
    continue
  }
  place({
    section: 'propertyField',
    key: part,
    field: 'text',
    unit: 'UF-67',
    what: `the ${part} word a property field fills around its value (FR-006, FR-038)`,
    frame: reading.frame,
    read: reading.read,
  })
}

const CONFIRMED_NAME_COLUMN = '確定名（英）'

// Why: a row may fix several keys (K-103 spells two, K-105 three), so the whole list is kept.
const T104 = specTable('T-104').rows.map((row) => ({
  row: row.id,
  keys: (row.by[CONFIRMED_NAME_COLUMN] ?? '')
    .split('/')
    .map((one) => one.replace(/`|\*/g, '').trim())
    .filter((one) => one.length > 0),
}))

// Why: the longest spelling the table holds wins: keys are dotted, and T-104 names some leaves
// (`fontSizeStepSizes.S` is K-105) and some groups (`exportCanvas` is K-87).
const rowOfSettingsKey = (key: string): string | undefined => {
  const parts = key.split('.')
  for (let take = parts.length; take > 0; take -= 1) {
    const spelling = parts.slice(0, take).join('.')
    const found = T104.find((item) => item.keys.includes(spelling))
    if (found !== undefined) return found.row
  }
  return undefined
}

// Why: measured from the group, not listed: a T-104 row whose key is outside the drawing settings
// (DR-3) has no field on the face, e.g. themeHue (DR-5) or language (FR-038).
const ROWS_ON_THE_SETTINGS_FACE = new Set(
  Object.keys(SETTINGS_DEFAULTS)
    .map(rowOfSettingsKey)
    .filter((row): row is string => row !== undefined),
)

// Why: read by row and never by position: no row fixes the order the settings face lists its keys in.
const settingsFieldName = (view: ScreenView, specTableRowId: string): string | undefined =>
  view.propertiesPanel?.fields.find((field) => field.row === specTableRowId)?.name

// Spec: FO-15, K-145
// Why: four display rows named by the setting's name and a number; row 1's name less ' 1' is the word.
const NUMBERED_SETTINGS_ROWS: ReadonlySet<string> = new Set(['K-145'])
const FIRST_ROW_NUMBER = ' 1'
const numberedFieldName = (view: ScreenView, specTableRowId: string): string | undefined => {
  const name = settingsFieldName(view, `${specTableRowId}:1`)
  return name?.endsWith(FIRST_ROW_NUMBER) === true ? name.slice(0, -FIRST_ROW_NUMBER.length) : name
}

// Spec: T-380, RN-3
// Why: the left and top edges are stored as two keys each but read as one row each, named by
// readOnlySettings viewLeftEdge / viewTopEdge -- so the settings face prints no name of these four rows.
const ROWS_JOINED_ON_THE_SETTINGS_FACE: ReadonlySet<string> = new Set(['K-69', 'K-121', 'K-70', 'K-120'])

for (const entry of GENERATED['settings'] ?? []) {
  const specTableRowId = keyOf('settings', entry)
  if (ROWS_JOINED_ON_THE_SETTINGS_FACE.has(specTableRowId)) {
    drop(
      'settings',
      specTableRowId,
      'T-380 RN-3 (CR-787) joins this key with its partner into one read-only row named by ' +
        'readOnlySettings viewLeftEdge / viewTopEdge, so no field of the settings face carries this name',
    )
    continue
  }
  if (!ROWS_ON_THE_SETTINGS_FACE.has(specTableRowId)) {
    drop(
      'settings',
      specTableRowId,
      'the presentation group (DR-3 of table T-052) that IC-17 opens the face on holds no key ' +
        'on this row, so no field of that face carries its name',
    )
    continue
  }
  place({
    section: 'settings',
    key: specTableRowId,
    field: 'label',
    unit: 'UF-64',
    what: `the name the settings face shows for ${specTableRowId}`,
    frame: PANEL_STATES['documentSettings'] as Frame,
    read: (view) => NUMBERED_SETTINGS_ROWS.has(specTableRowId) ? numberedFieldName(view, specTableRowId) : settingsFieldName(view, specTableRowId),
  })
}

// Why: one place per row, so a row whose word nobody wrote reports as reaching nowhere; read by
// row, since FR-036's order is held elsewhere.
const helpEntryText = (view: ScreenView, specTableRowId: string): string | undefined => {
  const entries: readonly HelpEntry[] | undefined = view.helpModal?.entries
  return entries?.find((entry) => entry.row === specTableRowId)?.text
}

for (const entry of GENERATED['shortcuts'] ?? []) {
  const specTableRowId = keyOf('shortcuts', entry)
  place({
    section: 'shortcuts',
    key: specTableRowId,
    field: 'text',
    unit: 'UF-66',
    what: `what the help says about ${specTableRowId}`,
    frame: HELP_SHOWN,
    read: (view) => helpEntryText(view, specTableRowId),
  })
}

// Spec: FR-036
// Why: the two words stand between keys, so each is read back by cutting the keys of one item off its entry.
const KEY_NOTATION_READS: Readonly<Record<string, { readonly row: string; readonly before: string; readonly after: string }>> = {
  alternative: { row: 'IC-6', before: 'Ctrl+Y', after: 'Ctrl+Shift+Z' },
  plusKey: { row: 'IC-13', before: 'Shift+', after: '' },
}
for (const entry of GENERATED['keyNotation'] ?? []) {
  const part = keyOf('keyNotation', entry)
  const cut = KEY_NOTATION_READS[part]
  if (cut === undefined) {
    drop('keyNotation', part, 'FR-036 names no item this file can read this part from')
    continue
  }
  place({
    section: 'keyNotation',
    key: part,
    field: 'text',
    unit: 'UF-66',
    what: `the ${part} word of the keys on the help item ${cut.row}`,
    frame: HELP_SHOWN,
    read: (view) => {
      const keys = view.helpModal?.entries.find((one) => one.kind === 'item' && one.row === cut.row)?.keys
      if (keys === undefined || keys === null || !keys.startsWith(cut.before) || !keys.endsWith(cut.after)) return undefined
      return keys.slice(cut.before.length, keys.length - cut.after.length)
    },
  })
}

// Spec: FR-036
// Why: every block carries its heading as a heading entry keyed by the block, whose name also travels
// untranslated on each entry (T-256) -- so only a place, not the whole-view reading, can hold this word.
for (const entry of GENERATED['helpHeadings'] ?? []) {
  const block = keyOf('helpHeadings', entry)
  place({
    section: 'helpHeadings',
    key: block,
    field: 'text',
    unit: 'UF-66',
    what: `the heading of the help block ${block}`,
    frame: HELP_SHOWN,
    read: (view) => view.helpModal?.entries.find((one) => one.kind === 'heading' && one.row === block)?.text,
  })
}

for (const entry of GENERATED['helpNotes'] ?? []) {
  drop(
    'helpNotes',
    keyOf('helpNotes', entry),
    'FR-036 names no member of the help that carries this word, so the whole-view reading asks for it instead',
  )
}

// Why: FR-036 names no member for the browser block's sentence, so the whole-view reading asks for it.
for (const entry of GENERATED['helpBlockNotes'] ?? []) {
  drop('helpBlockNotes', keyOf('helpBlockNotes', entry), 'FR-036 names no member of the help that carries this sentence')
}

// Spec: FR-036
// Why: two links stand above the basics block (download, about) and one on the IC-20 item (agentApi).
const HELP_LINK_READS: Readonly<Record<string, (view: ScreenView) => string | undefined>> = {
  download: (view) => view.helpModal?.downloadLink.words,
  about: (view) => view.helpModal?.aboutLink.words,
  agentApi: (view) => view.helpModal?.entries.find((one) => one.row === 'IC-20')?.link?.words,
}
for (const entry of GENERATED['helpLinks'] ?? []) {
  const link = keyOf('helpLinks', entry)
  place({
    section: 'helpLinks',
    key: link,
    field: 'text',
    unit: 'UF-66',
    what: `the help link ${link}`,
    frame: HELP_SHOWN,
    read: HELP_LINK_READS[link] ?? ((): undefined => undefined),
  })
}

// Spec: FR-036, T-255
const T_255_HELD_BY_T_036 = ((): ReadonlySet<string> => {
  const combosOf = (cell: string): readonly string[] =>
    cell
      .split(' / ')
      .map((one) => one.replace(/`/g, '').replace(/\uff0b/g, '+').replace(/\s+/g, ''))
      .filter((one) => one !== '')
  const keys = String.fromCodePoint(0x5272, 0x5f53)
  const t036 = new Set(specTable('T-036').rows.flatMap((row) => combosOf(row.by[keys] ?? '')))
  return new Set(
    specTable('T-255')
      .rows.filter((row) => combosOf(row.by[keys] ?? '').some((one) => t036.has(one)))
      .map((row) => row.id),
  )
})()

for (const entry of GENERATED['browserFunctions'] ?? []) {
  const specTableRowId = keyOf('browserFunctions', entry)
  if (T_255_HELD_BY_T_036.has(specTableRowId)) {
    drop(
      'browserFunctions',
      specTableRowId,
      'T-255 (MUST NOT): a row of T-036 holds the same combination, so the help never lists this row',
    )
    continue
  }
  place({
    section: 'browserFunctions',
    key: specTableRowId,
    field: 'text',
    unit: 'UF-66',
    what: `what the help says about the browser function ${specTableRowId}`,
    frame: HELP_SHOWN,
    read: (view) => helpEntryText(view, specTableRowId),
  })
}

for (const entry of GENERATED['invariants'] ?? []) {
  drop(
    'invariants',
    keyOf('invariants', entry),
    'its place is a member of UF-67 (notices.ts); a telling per row of table T-220 is raised for the whole-view reading instead',
  )
}

// Why: no place is built for a panel heading: FR-072 leaves none on the screen, so a place would
// be a road to a forbidden part; the acceptance group asserts the section's absence by name.

for (const entry of GENERATED['assignments'] ?? []) {
  const specTableRowId = keyOf('assignments', entry)
  const axis = (['vertical', 'horizontal'] as const).find((one) => assignmentForAxis(one) === specTableRowId)
  if (axis === undefined) {
    drop('assignments', specTableRowId, 'no slower way this component describes does what that row of table T-023 does')
    continue
  }
  place({
    section: 'assignments',
    key: specTableRowId,
    field: 'text',
    unit: 'UF-69',
    what: `the hint FR-037 shows on the ${axis} scrollbar`,
    frame: frameWith({ readings: sessionWith({ pointer: scrollbarPointer(axis) }) }),
    read: (view) => scrollbarTooltip(view, axis),
  })
}

// Why: each arm is a child of the composite `armed`; the shapes taken (SH-1 rectangle, the
// default diamond) do not reach the word, as T-023b gives AR-2 and AR-3 one row each.
const ARMED_BY_ROW: Readonly<Record<string, ScreenValues['armModeState']>> = {
  'AR-1': { kind: 'notArmed' },
  'AR-2': { kind: 'armed', child: { kind: 'taskShapeArmed', shapeKind: 'rectangle' } },
  'AR-3': { kind: 'armed', child: { kind: 'milestoneShapeArmed', glyph: 'diamond' } },
  'AR-4': { kind: 'armed', child: { kind: 'dependencyArmed' } },
  'AR-5': { kind: 'armed', child: { kind: 'commentBoxArmed' } },
  'AR-6': { kind: 'armed', child: { kind: 'highlightBoxArmed' } },
}

for (const entry of GENERATED['arms'] ?? []) {
  const specTableRowId = keyOf('arms', entry)
  const armed = ARMED_BY_ROW[specTableRowId]
  if (armed === undefined) {
    drop('arms', specTableRowId, 'table T-023b has no such row, so nothing can be armed with it')
    continue
  }
  // Why: read on the palette because FR-053 governs it; the row id is barred from the screen,
  // so what is read is the dictionary's word for the armed row (CommandPalette.armedText).
  place({
    section: 'arms',
    key: specTableRowId,
    field: 'text',
    unit: 'UF-65',
    what: `what the palette says it has armed while ${specTableRowId} is armed`,
    frame: {
      ...PALETTE_SHOWN,
      root: withScreen(PALETTE_SHOWN.root, { armModeState: armed }),
    },
    // Why: `?? undefined` folds the one null state into no reading, which cannot arise here:
    // PALETTE_SHOWN is not minimized, the only state whose armedText is null.
    read: (view) => view.commandPalette?.armedText ?? undefined,
  })
}

for (const section of ['notices', 'reasons', 'questions', 'confirmation', 'noticeDismiss', 'confirmationMarks', 'parentTaskChoice']) {
  for (const entry of GENERATED[section] ?? []) {
    drop(
      section,
      keyOf(section, entry),
      'its place is UF-67 (notices.ts), which this file may not read, so no member is named for it -- ' +
        'the acceptance group holds its word against the whole of what PI-37 hands out instead',
    )
  }
}

// Why: neither section is out of reach: no row fixes a ScreenView member for fileStatus (FR-101)
// or exportFormats (FR-096), so the acceptance group's whole-view reading holds both instead.
for (const section of ['fileStatus', 'exportFormats']) {
  for (const entry of GENERATED[section] ?? []) {
    drop(
      section,
      keyOf(section, entry),
      'this file names no member of ScreenView for it -- the acceptance group holds its word against the ' +
        'whole of what PI-37 hands out instead',
    )
  }
}

// Why: FR-032 writes this word into TaskGroup.name, so no frame prints it as screen text, and a
// frame that did would find its own input; which language is written is not settled by the spec.
for (const entry of GENERATED['defaultNames'] ?? []) {
  drop(
    'defaultNames',
    keyOf('defaultNames', entry),
    'FR-032 (MUST) settles it into TaskGroup.name, so it is document data and not screen text -- and ' +
      'no frame this file can raise prints it at all, because the word is settled into the document ' +
      'before any frame could -- ⛔ NOT because タスクグループ名 is untranslatable: FR-038 withdrew that sentence ' +
      'on 2026-09-04 and now puts task group names under the display language like every other word',
  )
}

// Why: the weekday tier is the Time Ruler band of UF-32 and ScreenView carries no Time Ruler,
// so the arrival claim belongs to a test that may name the band; the roster is held instead.
for (const entry of GENERATED['weekdays'] ?? []) {
  drop(
    'weekdays',
    keyOf('weekdays', entry),
    'FR-017 (MUST) prints it on the day tier of the Time Ruler, which is UF-32 s band -- and ScreenView, ' +
      'the whole of what PI-37 hands out, carries no Time Ruler at all, so no frame this file can raise ' +
      'could print it; the roster and its order are held against AT-17 instead',
  )
}

for (const entry of GENERATED['branding'] ?? []) {
  const part = keyOf('branding', entry)
  if (part !== 'logo') {
    drop('branding', part, 'BR-1 of table T-349 prints one word, the logo; no other part is drawn')
    continue
  }
  place({
    section: 'branding',
    key: part,
    field: 'text',
    unit: 'UF-62',
    what: 'the Branding word BR-1 prints at the App Header s left end',
    frame: BASE,
    read: (view) => view.appHeaderItems.brandingText,
  })
}

// Why: TL-1 prints the name first, then the plan line and the actual line; the word stands before ': '.
const HINT_LINE_INDEX: Readonly<Record<string, number>> = { 'TL-5': 1, 'TL-6': 2 }
const RESTING_ON_A_STARTED_TASK = frameWith({
  selection: emptySelection(),
  schedule: {
    ...SCHEDULE,
    tasks: SCHEDULE.tasks.map((task) => ({
      ...task,
      start: '2026-04-01T08:00:00',
      finish: '2026-04-08T17:00:00',
      actualStart: '2026-04-02T08:00:00',
    })),
  },
  readings: sessionWith({
    pointer: { x: REGIONS.taskGroupArea.x + REGIONS.taskGroupArea.width / 2, y: REGIONS.taskGroupArea.y + REGIONS.taskGroupArea.height / 2 },
    pointerRestedMs: SETTINGS_CONSTANTS.taskHintDelayMs,
    hintHolderUnderPointer: { kind: 'task', taskUid: THE_TASK },
  }),
})
for (const entry of GENERATED['hintLines'] ?? []) {
  const row = keyOf('hintLines', entry)
  const index = HINT_LINE_INDEX[row]
  if (index === undefined) {
    drop('hintLines', row, 'table T-348 names no line of the task tooltip for this row')
    continue
  }
  place({
    section: 'hintLines',
    key: row,
    field: 'text',
    unit: 'UF-69',
    what: `the word line ${row} of table T-348 opens the task tooltip with`,
    frame: RESTING_ON_A_STARTED_TASK,
    read: (view) => {
      const tip = view.tooltips.find((one) => one.anchor.kind === 'task')
      return tip?.text.split('\n')[index]?.split(': ')[0]
    },
  })
}

// Spec: FR-069
for (const entry of GENERATED['helpLegal'] ?? []) {
  const part = keyOf('helpLegal', entry) as 'licensedUnder' | 'fullText'
  place({
    section: 'helpLegal',
    key: part,
    field: 'text',
    unit: 'UF-66',
    what: `the help's license word ${part}`,
    frame: HELP_SHOWN,
    read: (view) => view.helpModal?.helpLegal[part],
  })
}

// Spec: OP-16
// Why: the chooser stands while the file flow waits for the OP-3 answer, which is what carries the file read.
const OPEN_CHOOSER_SHOWN = frameWith({
  root: {
    ...rootWithSurface('Open Chooser'),
    fileFlow: {
      ...SCREEN_ROOT.fileFlow,
      fileOperationState: {
        kind: 'awaitingOpenChoice',
        incomingFile: { fileName: 'IncomingFileName.json', byteLength: 2048, documentTitle: null },
      },
    },
  },
})
const OPEN_CHOOSER_WORD: Readonly<Record<string, 'fileWord' | 'documentTitleWord' | 'cancelWord'>> = {
  file: 'fileWord',
  documentTitle: 'documentTitleWord',
  cancel: 'cancelWord',
}
for (const entry of GENERATED['differenceReview'] ?? []) {
  drop(
    'differenceReview',
    keyOf('differenceReview', entry),
    'its place is the separate-task note of the Difference Review (MG-10, U-61), which needs merge candidates no frame here builds',
  )
}

for (const entry of GENERATED['openChooser'] ?? []) {
  const part = keyOf('openChooser', entry)
  const member = OPEN_CHOOSER_WORD[part]
  if (member === undefined) {
    drop('openChooser', part, 'OP-16 names no row of the Open Chooser for this part')
    continue
  }
  place({
    section: 'openChooser',
    key: part,
    field: 'text',
    unit: 'UF-66',
    what: `the Open Chooser's ${part} word`,
    frame: OPEN_CHOOSER_SHOWN,
    read: (view) => {
      const chooser = view.openModal
      return chooser !== null && 'choices' in chooser ? chooser[member] : undefined
    },
  })
}

// Spec: OP-17, U-68
for (const entry of GENERATED['dropCue'] ?? []) {
  const part = keyOf('dropCue', entry)
  if (part !== 'dropToOpen') {
    drop('dropCue', part, 'OP-17 names no line of the Drop Cue for this part')
    continue
  }
  place({
    section: 'dropCue',
    key: part,
    field: 'text',
    unit: 'UF-60',
    what: "the Drop Cue's line",
    frame: frameWith({ root: rootWith({ dropCueDisplayState: { kind: 'shown' } }) }),
    read: (view) => view.dropCue?.text,
  })
}

// Spec: FR-096, IX-12, FX-1, FX-8
// Why: the line stands only while the document fixes its fit span (S-532), so this frame
// stores one; its two days are put back as {start} and {finish} to hold the line to the written word.
const EXPORT_CHOOSER_WITH_SPAN = frameWith({
  root: rootWithSurface('Export Chooser'),
  settings: { ...SETTINGS, isFitSpanFixed: true, fitSpanStart: '2026-11-02T00:00:00', fitSpanFinish: '2026-12-25T23:59:00' },
})
const SPAN_DAY = /(\d{4}\/)?\d{1,2}\/\d{1,2}/
const exportSpanWordOf = (line: string): string => line.replace(SPAN_DAY, '{start}').replace(SPAN_DAY, '{finish}')
for (const entry of GENERATED['exportChooser'] ?? []) {
  const part = keyOf('exportChooser', entry)
  if (part !== 'fitSpan') {
    drop('exportChooser', part, 'FR-096 names no line of the Export Chooser for this part')
    continue
  }
  place({
    section: 'exportChooser',
    key: part,
    field: 'text',
    unit: 'UF-66',
    what: "the Export Chooser's export span line",
    frame: EXPORT_CHOOSER_WITH_SPAN,
    read: (view) => {
      const chooser = view.openModal
      if (chooser === null || !('formats' in chooser) || chooser.fitSpanLine === null) return undefined
      return exportSpanWordOf(chooser.fitSpanLine)
    },
  })
}

// Spec: FR-039, SE-2
for (const entry of GENERATED['scaleEcho'] ?? []) {
  const end = keyOf('scaleEcho', entry)
  const step = end === 'max' ? DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]! : DISPLAY_SCALE_STEPS[0]!
  place({
    section: 'scaleEcho',
    key: end,
    field: 'text',
    unit: 'UF-62',
    what: `the word SE-2 puts after the percentage at the ${end} step`,
    frame: frameWith({
      root: rootWith({ scaleMessageDisplayState: { kind: 'shown', percent: step, end: end as 'max' | 'min' } }),
    }),
    // Why: SE-2 writes the value and % first, so the word is what follows them.
    read: (view) => view.scaleMessage?.startsWith(`${step}%`) === true ? view.scaleMessage.slice(`${step}%`.length) : undefined,
  })
}

// Spec: DC-3
// Why: the mode is on and the pointer stands on the Task Group Area, the one frame DC-3 shows the readout in.
const DUAL_CURSOR_READOUT_LINE: Readonly<Record<string, number>> = { left: 0, right: 1, span: 2 }
// Why: this frame stores no date and its axis has no day, so DC-3 writes its dash where the word
// holds {date} or {span}; the mark is put back so the line can be held to the written word.
const READOUT_DASH = /—$/
const READOUT_MARKS: readonly string[] = ['{date}', '{date}', '{span}']
const readoutWordOf = (line: string, index: number): string =>
  line.replace(READOUT_DASH, READOUT_MARKS[index] ?? '')
for (const entry of GENERATED['dualCursorReadout'] ?? []) {
  const line = keyOf('dualCursorReadout', entry)
  const index = DUAL_CURSOR_READOUT_LINE[line]
  if (index === undefined) {
    drop(
      'dualCursorReadout',
      line,
      'DC-3 prints it inside the span line, in place of that line s {span}; a filled span word carries no {span}, so no frame here can show it',
    )
    continue
  }
  place({
    section: 'dualCursorReadout',
    key: line,
    field: 'text',
    unit: 'UF-69',
    what: `line ${line} of the readout DC-3 shows beside the pointer`,
    frame: frameWith({
      root: rootWith({ dualCursorModeState: { kind: 'on', child: { kind: 'placingCursorA' } } }),
      readings: sessionWith({
        pointer: {
          x: REGIONS.taskGroupArea.x + REGIONS.taskGroupArea.width / 2,
          y: REGIONS.taskGroupArea.y + REGIONS.taskGroupArea.height / 2,
        },
      }),
    }),
    read: (view) => {
      const shown = view.dualCursorReadout?.lines[index]
      return shown === undefined ? undefined : readoutWordOf(shown, index)
    },
  })
}

// Spec: MH-3, MH-4, MH-6, FR-042
// Why: keyed by which control the field is, not by a row -- no row of table
// T-016 names it, the same reason `defaultNames` is keyed by `use`.
const TASK_GROUP_MIN_HEIGHT_PX_SLOT = '{px}'
// Spec: T-338, MH-2, PR-20, MH-3
const minHeightTaskGroupOf = (view: ScreenView, row: string) =>
  view.propertiesPanel?.fields.find((field) => field.row === row)
// Why: MH-3's `currentValue` fills the `{px}` slot with the real height, so this
// puts the digits back to see the literal word (as `readoutWordOf` does for DC-3).
const minHeightWordOf = (text: string): string => text.replace(/\d+/, TASK_GROUP_MIN_HEIGHT_PX_SLOT)
const TASK_GROUP_MIN_HEIGHT_READS: Readonly<Record<string, (view: ScreenView) => string | undefined>> = {
  enable: (view) => minHeightTaskGroupOf(view, 'MH-2')?.name,
  unit: (view) => minHeightTaskGroupOf(view, 'PR-20')?.unit,
  basisHint: (view) => minHeightTaskGroupOf(view, 'PR-20')?.controls[0]?.hint,
  currentName: (view) => minHeightTaskGroupOf(view, 'MH-3')?.name,
  currentValue: (view) => {
    const readout = minHeightTaskGroupOf(view, 'MH-3')?.readout
    return readout === undefined ? undefined : minHeightWordOf(readout)
  },
  currentlyHidden: (view) => minHeightTaskGroupOf(view, 'MH-3')?.readout,
}
for (const entry of GENERATED['rowMinHeightField'] ?? []) {
  const part = keyOf('rowMinHeightField', entry)
  place({
    section: 'rowMinHeightField',
    key: part,
    field: 'text',
    unit: 'UF-67',
    what: `the ${part} word MH-2..MH-3 of table T-338 have the Task Group Panel's min-height rows show`,
    // Why: MH-3 withholds the number while the task group is not drawn (TASK_GROUP_PICKED's
    // state, no placedTaskGroups entry) -- `currentValue` needs TASK_GROUP_PLACED instead.
    frame: part === 'currentValue' ? TASK_GROUP_PLACED : TASK_GROUP_PICKED,
    read: (view) => TASK_GROUP_MIN_HEIGHT_READS[part]?.(view),
  })
}

// Spec: FX-6, FX-7, WF-2, WF-3
// Why: the two read-outs come from the readings (the shown span, the drawn width), so this frame
// carries both; their dates and digits are put back as the slots to hold them to the written word.
const SETTINGS_WITH_READOUTS = frameWith({
  root: rootWith({ propertiesPanelContentState: { kind: 'documentSettingsDisplayed' } }),
  readings: sessionWith({
    shownSpan: { start: '2026-11-02T00:00:00', finish: '2026-12-25T23:59:00' },
    taskGroupPanelDrawnWidth: 300,
  }),
})
const SHOWN_DAY = /\d{4}\/\d{2}\/\d{2}/
const shownSpanWordOf = (text: string): string => text.replace(SHOWN_DAY, '{start}').replace(SHOWN_DAY, '{finish}')
const settingsRowOf = (view: ScreenView, row: string) => view.propertiesPanel?.fields.find((field) => field.row === row)
const SETTINGS_FIELD_READS: Readonly<Record<string, Readonly<Record<string, (view: ScreenView) => string | undefined>>>> = {
  fitSpanField: {
    currentName: (view) => settingsRowOf(view, 'FX-6')?.name,
    currentValue: (view) => {
      const readout = settingsRowOf(view, 'FX-6')?.readout
      return readout === undefined ? undefined : shownSpanWordOf(readout)
    },
    copyCurrent: (view) => settingsRowOf(view, 'FX-6')?.controls[0]?.press,
  },
  taskGroupPanelWidthField: {
    unit: (view) => settingsRowOf(view, 'K-71')?.unit,
    currentName: (view) => settingsRowOf(view, 'WF-3')?.name,
    currentValue: (view) => {
      const readout = settingsRowOf(view, 'WF-3')?.readout
      return readout === undefined ? undefined : minHeightWordOf(readout)
    },
  },
}
for (const section of ['fitSpanField', 'taskGroupPanelWidthField'] as const) {
  for (const entry of GENERATED[section] ?? []) {
    const part = keyOf(section, entry)
    place({
      section,
      key: part,
      field: 'text',
      unit: 'UF-64',
      what: `the ${part} word table T-367 / T-368 have the settings face show`,
      frame: SETTINGS_WITH_READOUTS,
      read: (view) => SETTINGS_FIELD_READS[section]?.[part]?.(view),
    })
  }
}

// Spec: FR-041, T-305
// Why: the hue field of the settings face lists table T-305's rows in that table's order.
const T305_ROWS: readonly string[] = specTable('T-305').rows.map((row) => row.id)
const themeHueControlOf = (view: ScreenView) =>
  view.propertiesPanel?.fields
    .flatMap((field) => field.controls)
    .find((control) => control.key.holder === 'project' && control.key.column === 'themeHue')
for (const entry of GENERATED['themeHues'] ?? []) {
  const specTableRowId = keyOf('themeHues', entry)
  place({
    section: 'themeHues',
    key: specTableRowId,
    field: 'text',
    unit: 'UF-64',
    what: `the choice ${specTableRowId} of table T-305 on the settings face's theme color field`,
    frame: PANEL_STATES['documentSettings'] as Frame,
    read: (view) => themeHueControlOf(view)?.choices?.[T305_ROWS.indexOf(specTableRowId)],
  })
}

// Spec: FR-156, T-376, FO-14, FO-15
// Why: a zone's place is line 2 of its two-line name; display row 1 offers none and then every row.
const ZONE_ROWS_IN_ORDER: readonly string[] = (GENERATED['timeZones'] ?? []).map((entry) => keyOf('timeZones', entry))
for (const specTableRowId of ZONE_ROWS_IN_ORDER) {
  place({
    section: 'timeZones',
    key: specTableRowId,
    field: 'label',
    unit: 'UF-64',
    what: `line 2 of the two-line name of ${specTableRowId} in display time zone row 1 of the settings face (FR-156)`,
    frame: PANEL_STATES['documentSettings'] as Frame,
    read: (view) => settingsRowOf(view, 'K-145:1')?.controls[0]?.choiceLines?.[ZONE_ROWS_IN_ORDER.indexOf(specTableRowId) + 1]?.[1],
  })
}

// Spec: FO-14, FO-15, FO-16, FR-156, FR-157
const TIME_ZONE_FIELD_READS: Readonly<Record<string, (view: ScreenView) => string | undefined>> = {
  none: (view) => settingsRowOf(view, 'K-145:1')?.controls[0]?.choices?.[0],
  shiftUnit: (view) => settingsRowOf(view, 'IC-162')?.unit,
}
// Why: the answers stand only while a draft holds another zone, which no frame here holds.
// Why: zoneHead and offsetName are shapes with slots; the QN-14 lines are composed when the shell asks.
const ONLY_WHILE_DRAFTED = 'FO-14 shows it only while a draft holds a time zone other than the shown base (FR-156); no frame here holds one'
const TIME_ZONE_FIELD_NOT_ON_A_FRAME: Readonly<Record<string, string>> = {
  baseChangeQuestion: ONLY_WHILE_DRAFTED,
  keepGlobalTime: ONLY_WHILE_DRAFTED,
  keepGlobalTimeHint: ONLY_WHILE_DRAFTED,
  keepLocalTime: ONLY_WHILE_DRAFTED,
  keepLocalTimeHint: ONLY_WHILE_DRAFTED,
  cancelBaseChange: ONLY_WHILE_DRAFTED,
  beforeLine: ONLY_WHILE_DRAFTED,
  afterLine: ONLY_WHILE_DRAFTED,
  zoneHead: 'a shape with slots (FR-156, CR-787): line 1 of every zone name fills them, so the shape itself is never printed alone',
  offsetName: 'a shape with a slot (FR-017): printed filled, only for a row without an abbreviation (UTC-12:00)',
  shiftAmountLine: 'a QN-14 line: the shell composes it when it raises the question (FR-157), outside these frames',
  shiftTaskCountLine: 'a QN-14 line: the shell composes it when it raises the question (FR-157), outside these frames',
  shiftOutsideCountLine: 'a QN-14 line: the shell composes it when it raises the question (FR-157), outside these frames',
  shiftExampleLine: 'a QN-14 line: the shell composes it when it raises the question (FR-157), outside these frames',
}
for (const entry of GENERATED['timeZoneField'] ?? []) {
  const part = keyOf('timeZoneField', entry)
  const why = TIME_ZONE_FIELD_NOT_ON_A_FRAME[part]
  if (why !== undefined) {
    drop('timeZoneField', part, why)
    continue
  }
  place({
    section: 'timeZoneField',
    key: part,
    field: 'text',
    unit: 'UF-64',
    what: `the ${part} word of the zone fields of the settings face (T-369)`,
    frame: SETTINGS_WITH_READOUTS,
    read: (view) => TIME_ZONE_FIELD_READS[part]?.(view),
  })
}

// Spec: FO-17, FR-159, WH-1, WH-12
// Why: the frame's document holds no task, so the current start reads as the dash WH-1 names; it is put back as the slot.
const NO_CURRENT_START = '—'
const READOUT_LINE_BREAK = '\n'
const WHOLE_SCHEDULE_SHIFT_READS: Readonly<Record<string, (view: ScreenView) => string | undefined>> = {
  name: (view) => settingsRowOf(view, 'FO-17')?.name,
  apply: (view) => settingsRowOf(view, 'FO-17')?.controls[1]?.press,
  newStartUnit: (view) => settingsRowOf(view, 'FO-17')?.unit,
  currentStart: (view) => settingsRowOf(view, 'FO-17')?.readout?.split(READOUT_LINE_BREAK)[0]?.replace(NO_CURRENT_START, '{date}'),
}
const WHOLE_SCHEDULE_SHIFT_NOT_ON_A_FRAME = 'a QN-15 line or the WH-2 holiday line: it needs a dated task and a typed date, which no frame of this file holds'
for (const entry of GENERATED['wholeScheduleShiftField'] ?? []) {
  const part = keyOf('wholeScheduleShiftField', entry)
  if (WHOLE_SCHEDULE_SHIFT_READS[part] === undefined) {
    drop('wholeScheduleShiftField', part, WHOLE_SCHEDULE_SHIFT_NOT_ON_A_FRAME)
    continue
  }
  place({
    section: 'wholeScheduleShiftField',
    key: part,
    field: 'text',
    unit: 'UF-64',
    what: `the ${part} word of the Shift Whole Schedule row of the settings face (FO-17 of table T-369)`,
    frame: SETTINGS_WITH_READOUTS,
    read: (view) => WHOLE_SCHEDULE_SHIFT_READS[part]?.(view),
  })
}

// Spec: T-380, FR-072
// Why: the heading line, the group names and the words the default settings of the frame show.
const readOnlyGroupNameOf = (view: ScreenView, key: string): string | undefined =>
  view.propertiesPanel?.fields.find((field) => field.readOnlyGroup?.key === key)?.readOnlyGroup?.name
const SEARCH_VIEW_ROW = (key: string): string => `tableViews.searchPanel.${key}`
const READ_ONLY_SETTINGS_READS: Readonly<Record<string, (view: ScreenView) => string | undefined>> = {
  heading: (view) => view.propertiesPanel?.readOnlyHeading,
  groupShowHide: (view) => readOnlyGroupNameOf(view, 'groupShowHide'),
  groupLabels: (view) => readOnlyGroupNameOf(view, 'groupLabels'),
  groupView: (view) => readOnlyGroupNameOf(view, 'groupView'),
  groupGridLinesAndColor: (view) => readOnlyGroupNameOf(view, 'groupGridLinesAndColor'),
  groupRulerAndStack: (view) => readOnlyGroupNameOf(view, 'groupRulerAndStack'),
  groupTableViews: (view) => readOnlyGroupNameOf(view, 'groupTableViews'),
  scheduleFilter: (view) => settingsRowOf(view, SEARCH_VIEW_ROW('isScheduleFilterApplied'))?.name,
  shownTasks: (view) => settingsRowOf(view, SEARCH_VIEW_ROW('shownTaskUids'))?.name,
  shownResources: (view) => settingsRowOf(view, 'tableViews.resourceList.shownResourceUids')?.name,
  unassignedRow: (view) => settingsRowOf(view, 'tableViews.resourceList.isUnassignedShown')?.name,
  columnFilters: (view) => settingsRowOf(view, SEARCH_VIEW_ROW('columnFilters'))?.name,
  sortOrder: (view) => settingsRowOf(view, SEARCH_VIEW_ROW('sort'))?.name,
  shown: (view) => settingsRowOf(view, 'K-122')?.text,
  hidden: (view) => settingsRowOf(view, 'K-79')?.text,
  notOverlaid: (view) => settingsRowOf(view, 'K-84')?.text,
  color: (view) => settingsRowOf(view, 'K-61')?.text,
  filterOff: (view) => settingsRowOf(view, SEARCH_VIEW_ROW('isScheduleFilterApplied'))?.text,
  stackUp: (view) => settingsRowOf(view, 'K-73')?.text,
  expandedAuto: (view) => settingsRowOf(view, 'K-138')?.text,
  none: (view) => settingsRowOf(view, SEARCH_VIEW_ROW('shownTaskUids'))?.text,
  defaultOrder: (view) => settingsRowOf(view, SEARCH_VIEW_ROW('sort'))?.text,
  // Why: T-380 RN-3: the joined left and top edge rows stand under K-69 / K-70; the frame holds no view place.
  viewLeftEdge: (view) => settingsRowOf(view, 'K-69')?.name,
  viewTopEdge: (view) => settingsRowOf(view, 'K-70')?.name,
  notSet: (view) => settingsRowOf(view, 'K-69')?.text,
  notSetFromTop: (view) => settingsRowOf(view, 'K-70')?.text,
}
// Why: the frame holds the default settings, so the other value of each pair and the slotted shapes are not printed on it.
const READ_ONLY_SETTINGS_NOT_ON_A_FRAME =
  'a value word the default settings of the frame do not show, or a shape with slots printed only filled (T-380)'
for (const entry of GENERATED['readOnlySettings'] ?? []) {
  const part = keyOf('readOnlySettings', entry)
  if (READ_ONLY_SETTINGS_READS[part] === undefined) {
    drop('readOnlySettings', part, READ_ONLY_SETTINGS_NOT_ON_A_FRAME)
    continue
  }
  place({
    section: 'readOnlySettings',
    key: part,
    field: 'text',
    unit: 'UF-64',
    what: `the ${part} word of the read-only rows of the settings face (T-380)`,
    frame: SETTINGS_WITH_READOUTS,
    read: (view) => READ_ONLY_SETTINGS_READS[part]?.(view),
  })
}

// Spec: U-65, T-344, WC-2, WC-3, WC-4, WC-8, WC-10
// Why: the headings and column words of Holiday Settings, read off the surface its scene opens.
const HOLIDAY_SETTINGS_READS: Readonly<Record<string, (view: ScreenView) => string | undefined>> = {
  workingWeekdays: (view) => holidaySettingsOf(view)?.weekdaysHeading,
  weekStart: (view) => holidaySettingsOf(view)?.weekStartName,
  workingHours: (view) => holidaySettingsOf(view)?.workingHoursHeading,
  rangeFrom: (view) => holidaySettingsOf(view)?.workingHoursColumns[0],
  rangeTo: (view) => holidaySettingsOf(view)?.workingHoursColumns[1],
  exceptionDays: (view) => holidaySettingsOf(view)?.exceptionsHeading,
  exceptionName: (view) => holidaySettingsOf(view)?.exceptionColumns[0],
  exceptionFrom: (view) => holidaySettingsOf(view)?.exceptionColumns[1],
  exceptionTo: (view) => holidaySettingsOf(view)?.exceptionColumns[2],
  exceptionKind: (view) => holidaySettingsOf(view)?.exceptionColumns[3],
}
// Why: the scene's calendar holds one day off and one set of hours, and no draft, so no refusal stands.
const HOLIDAY_SETTINGS_NOT_ON_THE_SCENE = 'the Holiday Settings scene holds one day off, one set of hours and no refused draft'
for (const entry of GENERATED['holidaySettings'] ?? []) {
  const part = keyOf('holidaySettings', entry)
  if (HOLIDAY_SETTINGS_READS[part] === undefined) {
    drop('holidaySettings', part, HOLIDAY_SETTINGS_NOT_ON_THE_SCENE)
    continue
  }
  place({
    section: 'holidaySettings',
    key: part,
    field: 'text',
    unit: 'UF-204',
    what: `the ${part} word of Holiday Settings (U-65, T-344)`,
    frame: HOLIDAY_SETTINGS_SCENE.frame(null),
    read: (view) => HOLIDAY_SETTINGS_READS[part]?.(view),
  })
}

// Spec: CV-9, T-294, FR-019
// Why: CV-9 bans neither black nor transparent on a highlight box; its fill's null follows the
// theme (S-155) and its frame's is the fixed S-312, so one box prints both forms of entrance 2.
const colorControlOf = (view: ScreenView, holder: string, column: string) =>
  view.propertiesPanel?.fields
    .flatMap((field) => field.controls)
    .find((control) => control.key.holder === holder && control.key.column === column)
const BOX_FILL = (view: ScreenView) => colorControlOf(view, 'highlightBox', 'fillColor')
const BOX_FRAME = (view: ScreenView) => colorControlOf(view, 'highlightBox', 'strokeColor')
// Why: SCHEDULE's task holds a custom fill, so the custom entrance's tooltip names its value (CV-9).
const TASK_FILL = (view: ScreenView) => colorControlOf(view, 'taskVisual', 'fillColor')
const CUSTOM_VALUE_SLOT = '{value}'
for (const entry of GENERATED['colorNames'] ?? []) {
  const spelling = keyOf('colorNames', entry)
  place({
    section: 'colorNames',
    key: spelling,
    field: 'text',
    unit: 'UF-67',
    what: `the name ${spelling} of table T-294 on the highlight box's fill field`,
    frame: HIGHLIGHT_BOX_PICKED,
    read: (view) => {
      const control = BOX_FILL(view)
      const at = control?.choiceValues?.indexOf(spelling) ?? -1
      return at < 0 ? undefined : control?.choices?.[at]
    },
  })
}
const COLOR_FIELD_READS: Readonly<
  Record<string, { readonly frame: Frame; readonly read: (view: ScreenView) => string | undefined }>
> = {
  custom: { frame: HIGHLIGHT_BOX_PICKED, read: (view) => BOX_FILL(view)?.color?.custom.hint },
  themeHint: { frame: HIGHLIGHT_BOX_PICKED, read: (view) => BOX_FILL(view)?.color?.theme.hint },
  noFill: { frame: HIGHLIGHT_BOX_PICKED, read: (view) => BOX_FILL(view)?.color?.transparentWord },
  noLine: { frame: HIGHLIGHT_BOX_PICKED, read: (view) => BOX_FRAME(view)?.color?.transparentWord },
  defaultColor: { frame: HIGHLIGHT_BOX_PICKED, read: (view) => BOX_FRAME(view)?.color?.theme.hint },
  themeGlyph: { frame: HIGHLIGHT_BOX_PICKED, read: (view) => BOX_FILL(view)?.color?.theme.glyph },
  customGlyph: { frame: HIGHLIGHT_BOX_PICKED, read: (view) => BOX_FILL(view)?.color?.custom.glyph },
  customValue: {
    frame: BASE,
    read: (view) => TASK_FILL(view)?.color?.custom.hint.replace(/#[0-9A-F]{6}/, CUSTOM_VALUE_SLOT),
  },
}
for (const entry of GENERATED['colorField'] ?? []) {
  const part = keyOf('colorField', entry)
  const at = COLOR_FIELD_READS[part]
  if (at === undefined) continue
  place({
    section: 'colorField',
    key: part,
    field: 'text',
    unit: 'UF-67',
    what: `the ${part} word CV-9 of table T-017b has a color field show`,
    frame: at.frame,
    read: at.read,
  })
}

// Spec: SQ-1, SQ-5
const searchCellOf = (view: ScreenView, taskUid: number, column: string): string | undefined => {
  const panel = view.searchPanel
  const at = panel?.columns.findIndex((one) => one.column === column) ?? -1
  const row = panel?.rows.find((one) => one.target.kind === 'task' && one.target.taskUid === taskUid)
  return at < 0 ? undefined : row?.cells[at]
}

for (const entry of GENERATED['searchColumns'] ?? []) {
  const column = keyOf('searchColumns', entry)
  place({
    section: 'searchColumns',
    key: column,
    field: 'text',
    unit: 'UF-180',
    what: `the heading of column ${column} of table T-331 on the Search Panel's table`,
    frame: COMMENT_BOX_COLUMNS.has(column) ? SEARCH_COMMENT_BOXES_SHOWN : SEARCH_TASKS_SHOWN,
    read: (view) => view.searchPanel?.columns.find((one) => one.column === column)?.heading,
  })
}

for (const entry of GENERATED['planActualStates'] ?? []) {
  const state = keyOf('planActualStates', entry)
  place({
    section: 'planActualStates',
    key: state,
    field: 'text',
    unit: 'UF-180',
    what: `the state word ${state} of table T-019a in column SQ-5 of the Search Panel's task table`,
    frame: SEARCH_TASKS_SHOWN,
    read: (view) => {
      const task = SEARCH_TASK_BY_STATE[state]
      return task === undefined ? undefined : searchCellOf(view, task.uid, STATE_COLUMN)
    },
  })
}

// Why: the search frame's tasks all have Task.milestone empty, so the milestone word of SQ-14 gets a frame of its own
// in which the PS-2 task is a milestone.
const TASK_TYPE_COLUMN = 'SQ-14'
const SEARCH_MILESTONE_UID = SEARCH_TASK_BY_STATE['PS-2']?.uid ?? 0
const SEARCH_WITH_A_MILESTONE: Frame = {
  ...SEARCH_TASKS_SHOWN,
  schedule: {
    ...SCHEDULE_TO_SEARCH,
    tasks: SCHEDULE_TO_SEARCH.tasks.map((one) => (one.uid === SEARCH_MILESTONE_UID ? { ...one, milestone: true } : one)),
  } as unknown as Schedule,
}
const TASK_TYPE_PLACES: Readonly<Record<string, { readonly frame: Frame; readonly uid: number }>> = {
  task: { frame: SEARCH_TASKS_SHOWN, uid: SEARCH_TASK_BY_STATE['PS-1']?.uid ?? 0 },
  milestone: { frame: SEARCH_WITH_A_MILESTONE, uid: SEARCH_MILESTONE_UID },
}

for (const entry of GENERATED['taskTypes'] ?? []) {
  const part = keyOf('taskTypes', entry)
  const at = TASK_TYPE_PLACES[part]
  if (at === undefined) {
    drop('taskTypes', part, 'table T-331 SQ-14 names only the two values task and milestone')
    continue
  }
  place({
    section: 'taskTypes',
    key: part,
    field: 'text',
    unit: 'UF-180',
    what: `the ${part} word of column SQ-14 of the Search Panel's task table`,
    frame: at.frame,
    read: (view) => searchCellOf(view, at.uid, TASK_TYPE_COLUMN),
  })
}

// Spec: SV-7, SV-13, SQ-1
const SEARCH_PANEL_READS: Readonly<
  Record<string, { readonly frame: Frame; readonly read: (view: ScreenView) => string | undefined }>
> = {
  blank: {
    frame: SEARCH_TASKS_SHOWN,
    read: (view) => {
      const menu = view.searchPanel?.filterMenu
      return menu?.kind === 'values' ? menu.values.find((one) => one.value === '')?.label : undefined
    },
  },
  noName: {
    frame: SEARCH_TASKS_SHOWN,
    read: (view) => searchCellOf(view, SEARCH_TASK_BY_STATE['PS-1']?.uid ?? 0, NAME_COLUMN),
  },
  restore: {
    frame: SEARCH_MAXIMIZED,
    read: (view) => labelIn(view.searchPanel?.titleEntries, MAXIMIZE_ENTRY),
  },
  nothingHidden: {
    frame: SEARCH_EVERY_TASK_CHECKED,
    read: (view) => view.searchPanel?.entryRefusals?.find((one) => one.icon === 'IC-143')?.reason,
  },
  nothingChecked: {
    frame: SEARCH_TASKS_SHOWN,
    read: (view) => view.searchPanel?.entryRefusals?.find((one) => one.icon === 'IC-143')?.reason,
  },
  scheduleFilterBar: {
    frame: SEARCH_SCHEDULE_FILTERED,
    read: (view) => countSlotsOf(view.scheduleFilterBar?.text, view.searchPanel?.heading),
  },
  scheduleFilterOff: {
    frame: SEARCH_SCHEDULE_FILTERED,
    read: (view) => view.scheduleFilterBar?.scheduleFilterOffLabel,
  },
}

for (const entry of GENERATED['searchPanel'] ?? []) {
  const part = keyOf('searchPanel', entry)
  const reading = SEARCH_PANEL_READS[part]
  if (part === 'tableNameSeparator') {
    drop('searchPanel', part, 'the joining word stands only inside the {tables} slot of the band (TV-11), and a cell-naming word holds no slot to put it in')
    continue
  }
  // Why: the Visibility column has no value list, so no frame prints these two words any more; the Agent API's table cells (AM-28) still carry them.
  if (part === 'showValue' || part === 'hideValue') {
    drop('searchPanel', part, 'the Visibility column holds no value list (SV-7, CR-798); only the table cells the Agent API reads (AM-28) print this word')
    continue
  }
  if (reading === undefined) {
    drop('searchPanel', part, 'no requirement of FR-151 names where this part of the Search Panel is printed')
    continue
  }
  place({
    section: 'searchPanel',
    key: part,
    field: 'text',
    unit: 'UF-180',
    what: `the ${part} word of the Search Panel (FR-151)`,
    frame: reading.frame,
    read: reading.read,
  })
}

for (const section of ['resourceListColumns', 'resourceList']) {
  for (const entry of GENERATED[section] ?? []) {
    drop(
      section,
      keyOf(section, entry),
      'the Resource List window is held by the shell and never by the session (S-545); this file raises it only for its heading and its entries (IC-52), and its column words and (Unassigned) are read off the view by the CR-722 tests',
    )
  }
}

for (const section of ['delayReportColumns', 'delayReportStatuses', 'delayReportSummary', 'delayReportMarkdown', 'delayReportReasons', 'delayReportAspects', 'delayReportWalls', 'delayFixColumns', 'delayFixes']) {
  for (const entry of GENERATED[section] ?? []) {
    drop(
      section,
      keyOf(section, entry),
      'the report window is held by the shell and never by the session (S-451); this file raises it only for its heading and its entries (IC-52), and tests/unit/cr-648-the-delay-diagnostics-report-window-fixes.test.ts reads these words off the report view',
    )
  }
}

interface Case extends Place {
  readonly language: string
  readonly word: string
}

const wordAt = (dictionary: Dictionary, at: Place, language: string): string | undefined =>
  cellsOf(dictionary).find(
    (cell) =>
      cell.section === at.section &&
      cell.key === at.key &&
      cell.field === at.field &&
      cell.language === language,
  )?.word

const CASES: readonly Case[] = PLACES.flatMap((at) =>
  LANGUAGES.map((language) => ({ ...at, language, word: wordAt(GENERATED, at, language) ?? '' })),
)

// Why: no cell stands empty today, so the fallback group has no case until a cell is emptied
// or a new entry appears unwritten.
const EMPTY = CASES.filter((one) => one.word === '')

const printed = (at: Place, language: string, build: Build = screenViewFromRegions): string | undefined =>
  at.read(viewOf(build, at.frame, language))

const stringsIn = (value: unknown, found: string[] = [], seen = new Set<unknown>()): readonly string[] => {
  if (typeof value === 'string') found.push(value)
  else if (typeof value === 'object' && value !== null && !seen.has(value)) {
    seen.add(value)
    for (const one of Object.values(value)) stringsIn(one, found, seen)
  }
  return found
}

const STRINGS_READ = new WeakMap<ScreenView, readonly string[]>()

const stringsOfView = (view: ScreenView): readonly string[] => {
  const held = STRINGS_READ.get(view)
  if (held !== undefined) return held
  const read = stringsIn(view)
  STRINGS_READ.set(view, read)
  return read
}

// Why: the strings that are not row ids are ASCII stand-ins for what a caller raises; none may be
// a word of the dictionary, or a case would find its own input.
const ASKING = (question: string, namesWhatGoes: boolean): Frame =>
  frameWith({
    readings: sessionWith({
      confirmation: {
        manner: 'the manner NT-7 asks for',
        question,
        items: namesWhatGoes ? [{ name: 'a task', isShownOnAnotherTaskGroup: true }] : [],
      },
    }),
  })

// Spec: QN-12, PTL-13
const PARENT_TASK_CHOICE = (isArmed: boolean): Frame =>
  frameWith({ readings: sessionWith({ parentTaskChoice: { at: { x: 40, y: 40 }, isArmed } }) })

const TELLING = (manner: string, reason: string): Frame =>
  frameWith({ readings: sessionWith({ notices: [{ manner, reason, affectedCount: null }] }) })

// Why: one frame is counted once however many places stand on it, by identity: the acceptance
// sweep costs words x frames, and two lookalike frames are both still built.
const FRAMES: readonly { readonly what: string; readonly frame: Frame }[] = (() => {
  const seen = new Set<Frame>()
  const each: { readonly what: string; readonly frame: Frame }[] = []
  for (const one of [
    ...PLACES.map((at) => ({ what: at.what, frame: at.frame })),
    ...T234.map((entry) => ({
      what: `the question ${entry.row} of table T-234 raises`,
      frame: ASKING(entry.row, entry.namesWhatGoes),
    })),
    ...T233.map((entry) => ({
      what: `the telling ${entry.row} of table T-233 raises, in the manner of ${entry.manner}`,
      frame: TELLING(entry.manner, entry.row),
    })),
    ...T220.map((row) => ({
      what: `the import refusal ${row} of table T-220 raises, in the manner of ${IMPORT_REFUSAL_MANNER}`,
      frame: TELLING(IMPORT_REFUSAL_MANNER, row),
    })),
    { what: 'a picked task group that is placed (MH-3 of table T-338)', frame: TASK_GROUP_PLACED },
    { what: 'the QN-12 chooser while parent tasks are armed', frame: PARENT_TASK_CHOICE(true) },
    { what: 'the QN-12 chooser while nothing is armed', frame: PARENT_TASK_CHOICE(false) },
  ]) {
    if (seen.has(one.frame)) continue
    seen.add(one.frame)
    each.push(one)
  }
  return each
})()

const GLYPH_TOKEN = /\{(IC-\d+[a-z]?)\}/g

const glyphRowsIn = (text: string): readonly string[] =>
  [...text.matchAll(GLYPH_TOKEN)].map((found) => found[1] as string)

// Spec: FR-036, T-109
const FIGURED_ROWS: ReadonlySet<string> = new Set(
  [
    ...readFileSync(join(ROOT, 'docs', 'spec', '_assets', 'fig-icons.svg'), 'utf8').matchAll(
      /<text class="lbl"[^>]*>(IC-\d+[a-z]?)<\/text>/g,
    ),
  ].map((found) => found[1] as string),
)

// Spec: FR-036, FR-038
const FR_076_NO_SETTING_COPIED = '`FR-038` の辞書は、設定値を理由の語に書き写さないこと。'

// Spec: FR-076
// Why: a reason word names a setting in braces and the screen prints its value.
const withSettingValues = (word: string): string => {
  const settings: Readonly<Record<string, unknown>> = SETTINGS_CONSTANTS
  return word.replace(/\{([A-Za-z]+)\}/g, (slot: string, name: string) => {
    const value = settings[name]
    return typeof value === 'number' || typeof value === 'string' ? String(value) : slot
  })
}

const shows = (word: string, strings: readonly string[]): boolean => {
  const glyphs = glyphRowsIn(word)
  if (glyphs.length === 0) return strings.includes(word)
  if (glyphs.some((row) => t109Row(row) === undefined || !FIGURED_ROWS.has(row))) return false
  if (word.replace(GLYPH_TOKEN, '').trim() !== '') return strings.includes(word)
  return glyphs.every((row) => strings.some((one) => glyphRowsIn(one).includes(row)))
}

// Spec: FR-036, FR-038
const framesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] =>
  FRAMES.filter((one) => shows(word, stringsOfView(viewOf(screenViewFromRegions, one.frame, language))))

// Spec: FR-039, SE-2, FR-038
const scaleEchoFramesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] =>
  FRAMES.filter((one) =>
    stringsOfView(viewOf(screenViewFromRegions, one.frame, language)).some((text) => /^\d+%/.test(text) && text.endsWith(word)),
  )

// Spec: DC-3, FR-038
const dualCursorReadoutFramesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] =>
  FRAMES.filter((one) =>
    (viewOf(screenViewFromRegions, one.frame, language).dualCursorReadout?.lines ?? []).some(
      (line, index) => readoutWordOf(line, index) === word,
    ),
  )

// Spec: FR-096, IX-12, FR-038
// Why: the span line fills {start} and {finish} with the two days (ND-4), so they are put back before matching.
const exportSpanFramesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] =>
  FRAMES.filter((one) => {
    const chooser = viewOf(screenViewFromRegions, one.frame, language).openModal
    if (chooser === null || !('formats' in chooser) || chooser.fitSpanLine === null) return false
    return exportSpanWordOf(chooser.fitSpanLine) === word
  })

// Spec: TL-5, TL-6, FR-038
const hintLineFramesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] =>
  FRAMES.filter((one) =>
    viewOf(screenViewFromRegions, one.frame, language).tooltips.some((tip) =>
      tip.text.split('\n').some((line) => line.startsWith(`${word}: `)),
    ),
  )

// Spec: FR-036, FR-038
const helpNoteFramesShowing = (
  specTableRowId: string,
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] =>
  FRAMES.filter((one) => {
    const text = helpEntryText(viewOf(screenViewFromRegions, one.frame, language), specTableRowId)
    return text !== undefined && text.includes(word)
  })

// Spec: FR-036
// Why: the join and the plus key stand inside an item's keys, so a frame shows them when some help item's keys hold them.
const keyNotationFramesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] =>
  FRAMES.filter((one) =>
    (viewOf(screenViewFromRegions, one.frame, language).helpModal?.entries ?? []).some(
      (entry) => entry.keys !== null && entry.keys.includes(word),
    ),
  )

// Spec: FR-038
// Why: `current` carries a `{px}` slot filled with the real height, so a
// literal match would never see it -- the other three entries hold no slot.
const escapeForRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const rowMinHeightFieldFramesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] => {
  const pattern = new RegExp(`^${word.split(TASK_GROUP_MIN_HEIGHT_PX_SLOT).map(escapeForRegExp).join('\\d+')}$`)
  return FRAMES.filter((one) =>
    stringsOfView(viewOf(screenViewFromRegions, one.frame, language)).some((text) => pattern.test(text)),
  )
}

// Spec: FX-6, FX-8
// Why: `currentValue` fills `{start}` and `{finish}` with the shown days, so its slots are matched open.
const shownSpanFramesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] => {
  const pattern = new RegExp(`^${word.split(/\{start\}|\{finish\}/).map(escapeForRegExp).join('\\d{4}/\\d{2}/\\d{2}')}$`)
  return FRAMES.filter((one) =>
    stringsOfView(viewOf(screenViewFromRegions, one.frame, language)).some((text) => pattern.test(text)),
  )
}

// Spec: FO-17, WH-1, TX-12
// Why: `currentStart` fills `{date}` with a shown day or WH-1's dash, on the first line of the read-out.
const wholeScheduleShiftFramesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] => {
  const pattern = new RegExp(`^${word.split('{date}').map(escapeForRegExp).join('(?:\\d{4}/\\d{2}/\\d{2}|\\u2014)')}$`)
  return FRAMES.filter((one) =>
    stringsOfView(viewOf(screenViewFromRegions, one.frame, language)).some((text) => text.split(READOUT_LINE_BREAK).some((line) => pattern.test(line))),
  )
}

// Spec: CV-9, FR-038
// Why: `customValue` fills `{value}` with the stored custom color, so its slot is matched open.
const customValueFramesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] => {
  const pattern = new RegExp(`^${word.split(CUSTOM_VALUE_SLOT).map(escapeForRegExp).join('#[0-9A-F]{6}')}$`)
  return FRAMES.filter((one) =>
    stringsOfView(viewOf(screenViewFromRegions, one.frame, language)).some((text) => pattern.test(text)),
  )
}

// Spec: PR-37, PR-38, PR-43, PR-44, FR-038
// Why: a property field fills `{name}` and `{uid}` with a task's own, one line per end,
// so the word is matched line by line with its slots open (a literal word still matches).
const propertyFieldFramesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] => {
  const pattern = new RegExp(
    `^${word
      .split(NAME_SLOT)
      .map((part) => part.split(UID_SLOT).map(escapeForRegExp).join('[0-9]+'))
      .join('.*')}$`,
  )
  return FRAMES.filter((one) =>
    stringsOfView(viewOf(screenViewFromRegions, one.frame, language)).some((text) =>
      text.split('\n').some((line) => pattern.test(line)),
    ),
  )
}

// Spec: TV-11
// Why: the band fills {total} and {shown} with counts, so the word is matched with its slots open.
const COUNT_SLOTTED_SEARCH_PANEL_PARTS: ReadonlySet<string> = new Set(['scheduleFilterBar'])
const countSlottedFramesShowing = (
  word: string,
  language: string,
): readonly { readonly what: string; readonly frame: Frame }[] => {
  const slot = (one: string): string => (one === '{tables}' ? '.+' : one.startsWith('{') ? '[0-9]+' : escapeForRegExp(one))
  const pattern = new RegExp(`^${word.split(/(\{total\}|\{shown\}|\{tables\})/).map(slot).join('')}$`)
  return FRAMES.filter((one) =>
    stringsOfView(viewOf(screenViewFromRegions, one.frame, language)).some((text) => pattern.test(text)),
  )
}

// Why: the filled copy is built here and never written to the manuscript: the words are the
// user's decision, and a test that wrote one would be making it for them.
const FILLED = fillEveryWord(GENERATED)

// Spec: FR-038
describe('FR-038 -- a word the dictionary holds is the word the screen prints', () => {
  // Why: each filled word names its own cell and appears nowhere else, so a unit printing a stand-in,
  // another entry's word or the other language's prints something not asked for and goes red.
  let carriage: Build | undefined

  beforeAll(async () => {
    vi.resetModules()
    vi.doMock(GENERATED_MODULE, () => ({ default: FILLED }))
    carriage = (await import('../../src/adapter/screen-renderer/screen-renderer'))
      .screenViewFromRegions as Build
  })

  afterAll(() => {
    vi.doUnmock(GENERATED_MODULE)
    vi.resetModules()
  })

  // Trap: falling back to the real build here makes every case vacuous again.
  const driven = (): Build => {
    if (carriage === undefined) {
      throw new Error('the filled dictionary was never stood in place of the generated one')
    }
    return carriage
  }

  it('has one case per place per language, over every section but UF-67 s two', () => {
    expect(PLACES.length, 'no place was found at all -- the tables moved under this file').toBeGreaterThan(0)
    expect(CASES).toHaveLength(PLACES.length * LANGUAGES.length)
  })

  it.each(CASES)(
    '$section $key $field holds a word in $language -> the view is built -> $what prints exactly it',
    (one: Case) => {
      expect(
        printed(one, one.language, driven()),
        `FR-038 (MUST): ${one.what} is ${one.unit}'s, and the dictionary gives ` +
          `${one.section}.${one.key}.${one.field} a word of its own in ${one.language}`,
      ).toBe(sentinel(one.section, one.key, one.field, one.language))
    },
  )

  it.each(PLACES)(
    '$section $key $field holds a different word per language -> the view is built in each -> $what answers a different one in each',
    (at: Place) => {
      // Why: a place that answers the same string whichever language is asked for is not reading the
      // language at all; it would pass the case above in one of the two by luck.
      const answers = LANGUAGES.map((language) => printed(at, language, driven()))
      expect(
        new Set(answers).size,
        `FR-038 (MUST): ${at.what} is ${at.unit}'s, and the dictionary gives ` +
          `${at.section}.${at.key}.${at.field} a word per language: ${JSON.stringify(answers)}`,
      ).toBe(LANGUAGES.length)
    },
  )

  it.each(CASES.filter((one) => one.word !== ''))(
    '$section $key $field is written in $language -> the view is built from the file -> $what prints exactly it',
    (one: Case) => {
      // Why: the same claim against the dictionary as it stands, asked in each language; a cell left
      // empty drops out here and is picked up by the fallback group.
      expect(
        printed(one, one.language),
        `FR-038 (MUST): ${one.what} is ${one.unit}'s, and the dictionary gives it ${JSON.stringify(one.word)}`,
      ).toBe(one.word)
    },
  )
})

// Spec: FR-038, FR-072
describe('PND-160 -- an entry with no word still leaves something at its place', () => {
  it.each(EMPTY)(
    '$section $key $field is empty in $language -> the view is built -> $what still prints a string',
    (one: Case) => {
      // Why: what the stand-in says is not asserted, as no wording is fixed; only that the place is
      // still there, or the road would drop the word once one is written.
      expect(
        typeof printed(one, one.language),
        `${one.what} is ${one.unit}'s and the dictionary has no word for it, so the stand-in has to stand`,
      ).toBe('string')
    },
  )

  it.each(LANGUAGES)(
    'the dictionary has no place left for a panel heading in %s -> the three states FR-072 names are built -> not one of them hands a heading on',
    (language) => {
      // Why: the member is read without being named in a type, so a description that still declares
      // a heading makes this case fall rather than the whole file before any case runs.
      for (const [showing, frame] of Object.entries(PANEL_STATES)) {
        const panel = viewOf(screenViewFromRegions, frame, language).propertiesPanel
        expect(
          (panel as unknown as Record<string, unknown> | null | undefined)?.['heading'],
          `FR-072 (MUST NOT): a heading is handed on while the panel shows ${showing}, in ${language}`,
        ).toBeUndefined()
      }
    },
  )

  it('⛔ MUST NOT move to the settings when the selection is cleared, whatever it stops saying', () => {
    // Why: FR-072 keeps the panel on what it had but no longer tells so; the state is asserted, no word.
    const panel = viewOf(screenViewFromRegions, PANEL_STATES['noSelection'] as Frame, 'ja').propertiesPanel
    expect(panel?.showing, 'FR-072 (MUST NOT): clearing the selection does not move it to the settings').toBe(
      'selection',
    )
    expect(panel?.isSubjectGone, 'FR-072 (MUST): the panel goes on showing what it had').toBe(true)
  })
})

// Spec: FR-038, FR-032, FR-072, FR-029, NT-7, NT-8, HM-10, FR-017, AT-17
describe('CR-194 section 5 / PND-160 -- fill one word of the manuscript and it reaches the screen', () => {
  it('offers a word per language -> the languages are read from the dictionary -> they are FR-038 s two', () => {
    expect(new Set(LANGUAGES)).toEqual(new Set(['ja', 'en']))
  })

  it('the manuscript is the source -> both files are read -> the generated dictionary matches it cell for cell', () => {
    // Why: compared section by section, not as one list: the generator fixes the generated order and
    // nothing asks the hand-kept manuscript to match it; within a section order is still held.
    const held = (cells: readonly Cell[], section: string): readonly string[] =>
      cells
        .filter((cell) => cell.section === section)
        .map((cell) => `${cell.section}.${cell.key}.${cell.field}.${cell.language}=${cell.word}`)

    const sections = [...new Set([...Object.keys(GENERATED), ...Object.keys(MANUSCRIPT)])].sort()
    for (const section of sections) {
      expect(held(GENERATED_CELLS, section), `section ${section}`).toEqual(held(MANUSCRIPT_CELLS, section))
    }
  })

  it('the specification says which words the screen needs, and FR-032 has just added one -> both files are read section by section and entry by entry -> every section is one this file can key and every entry is a place here or a stated omission', () => {
    // Why: keyOf answers the empty string for a section with no key field, so a new section fails
    // only through this walk; the manuscript is walked by name, as its section order is free.
    expect(
      Object.keys(GENERATED),
      'the generated dictionary holds a section this file cannot key, or has lost one, or has re-ordered them',
    ).toEqual(Object.keys(KEY_FIELD))
    expect(
      [...Object.keys(MANUSCRIPT)].sort(),
      'the manuscript holds a section this file cannot key, or has lost one',
    ).toEqual([...Object.keys(KEY_FIELD)].sort())
    expect(
      Object.entries(GENERATED)
        .flatMap(([section, entries]) => entries.map((entry) => ({ section, key: keyOf(section, entry) })))
        .filter((one) => one.key === '')
        .map((one) => one.section),
      'an entry with no key is an entry this file reads under the same name as its neighbors',
    ).toEqual([])

    const accounted = new Set([
      ...PLACES.map((at) => `${at.section}.${at.key}`),
      ...DROPPED.map((one) => `${one.section}.${one.key}`),
    ])
    const held = Object.entries(GENERATED).flatMap(([section, entries]) =>
      entries.map((entry) => `${section}.${keyOf(section, entry)}`),
    )
    expect([...new Set(held)].filter((id) => !accounted.has(id))).toEqual([])
  })

  it('⛔ FR-072 names no state of the panel for a word -> both files are read -> neither holds a section for a panel heading', () => {
    // Why: the roster sits with the requirement that puts a word on the screen (Chapter 6.2), and
    // FR-072 names no heading, so a held section would be words for a forbidden part.
    expect(
      Object.keys(GENERATED),
      'the generated dictionary still holds panelHeadings; FR-072 raises no roster for it',
    ).not.toContain('panelHeadings')
    expect(
      Object.keys(MANUSCRIPT),
      'the manuscript still holds panelHeadings; FR-072 raises no roster for it',
    ).not.toContain('panelHeadings')
    expect(
      HEADINGLESS_SURFACES_HELD,
      'FR-072 (MUST NOT): a surface that prints no heading still holds a heading word in surfaces (CR-711)',
    ).toEqual([])
    expect(MANUSCRIPT['surfaces']?.map((entry) => keyOf('surfaces', entry))).not.toContain('Properties Panel')
  })

  it('FR-036 lists only keys and icons -> both files are read -> no section for tables T-023a, T-023c or T-023d is left, shortcuts is the key rows with no entrance, and invariants is table T-220', () => {
    for (const retired of ['pressOrder', 'selecting', 'grabAreas']) {
      expect(Object.keys(GENERATED), `the generated dictionary still holds ${retired}`).not.toContain(retired)
      expect(Object.keys(MANUSCRIPT), `the manuscript still holds ${retired}`).not.toContain(retired)
    }
    const keyRowsWithoutEntrance = specTable('T-036')
      .rows.filter((row) => (row.by['入口'] ?? '').replace(/`/g, '').trim() === '—')
      .filter((row) => !/^[—-]$/.test((row.by['割当'] ?? '').trim()))
      .map((row) => row.id)
    expect(keyRowsWithoutEntrance.length).toBeGreaterThan(0)
    const helpRoster = JSON.parse(
      readFileSync(join(ROOT, 'src', 'adapter', 'screen-renderer', 'help-roster.json'), 'utf8'),
    ) as { readonly entries: readonly { readonly kind: string; readonly table: string; readonly row: string }[] }
    const keyRowsOnTheirOwn = helpRoster.entries
      .filter((entry) => entry.kind === 'item' && entry.table === 'T-036')
      .map((entry) => entry.row)
    expect(
      keyRowsOnTheirOwn,
      'CR-637 (FR-036): the help lists the key rows with no entrance, and those whose entrance item it leaves off',
    ).toEqual(expect.arrayContaining(keyRowsWithoutEntrance))
    expect((MANUSCRIPT['shortcuts'] ?? []).map((entry) => keyOf('shortcuts', entry)).sort()).toEqual(
      [...keyRowsOnTheirOwn].sort(),
    )
    expect(T220.length).toBeGreaterThan(0)
    expect((MANUSCRIPT['invariants'] ?? []).map((entry) => keyOf('invariants', entry)).sort()).toEqual(
      T220.filter((row) => !(row in T220_SHARING)).sort(),
    )
  })

  it('holds a word for every row of table T-109 -> the two rosters are compared -> the icons section is that table', () => {
    expect((GENERATED['icons'] ?? []).map((entry) => keyOf('icons', entry))).toEqual(
      T109.rows.map((row) => row.id),
    )
  })

  it('⛔ NT-7 (MUST NOT) gives its two answers no row of table T-109 -> that table is filtered on its surface column -> it stands nothing at all on U-55, and the confirmation section holds the two words instead', () => {
    // Why: driven off the manuscript and not a list written here, so the day a T-109 row names U-55
    // again this case goes red first.
    expect(ON_U_55, `table T-109 stands ${ON_U_55.join(' / ')} on ${U_55_CONFIRMATION}`).toEqual([])
    // Why: NT-7 sends the two words to the confirmation section, which makes the line above a move, not a loss.
    expect((GENERATED['confirmation'] ?? []).length).toBeGreaterThan(0)
  })

  it('FR-017 (MUST) gives the weekday a 段 of its own -> AT-17 s cell and the roster are read -> the seven stand in AT-17 s order, each with a word in each language', () => {
    // Why: AT-17's own sentence is held first, so the case is driven by the spec and not the roster;
    // it is matched in Japanese because that sentence is the only place the numbering is stated.
    expect(AT_17, 'AT-17 no longer numbers the weekdays from 0 = Sunday').toMatch(/`0` が日曜/)
    expect(AT_17, 'AT-17 no longer rises to 6 = Saturday').toMatch(/土曜の `6`/)

    // Why: the order is load-bearing: Project.weekStartDay is stored against this numbering, so
    // another order would print Monday's word against Sunday's index.
    expect(
      (GENERATED['weekdays'] ?? []).map((entry) => keyOf('weekdays', entry)),
      'AT-17 of table T-058: 0 is Sunday and it rises by one to 6 for Saturday, and Project.weekStartDay is stored against that numbering',
    ).toEqual(AT_17_ORDER)

    // Why: an empty weekday cell leaves FR-017 unmet (no weekday printed), unlike a label left to the
    // user; it is held against the manuscript, which Chapter 6.2 makes the source.
    const seven = MANUSCRIPT_CELLS.filter((cell) => cell.section === 'weekdays')
    expect(
      seven.filter((cell) => cell.word === '').map((cell) => `${cell.key}.${cell.field}.${cell.language}`),
      'FR-017 (MUST): the fourth tier holds a 段 of weekdays, and an empty cell prints none',
    ).toEqual([])
    expect(
      seven.length,
      'FR-038 (MUST): the two languages are ja and en, so the seven owe one word each in each of them',
    ).toBe(AT_17_ORDER.length * LANGUAGES.length)
  })

  it('the carriage group drives a dictionary of its own -> that copy is read back -> every cell of it holds a word that names only itself', () => {
    // Why: the carriage cases are worth their titles only while the copy holds a word in every cell,
    // and only while no word names two cells, or a unit printing the wrong one passes.
    const filledCells = cellsOf(FILLED as Dictionary)

    expect(
      filledCells.map((cell) => `${cell.section}.${cell.key}.${cell.field}.${cell.language}`),
      'the filled copy has to cover the dictionary cell for cell, or a place is driven by nothing',
    ).toEqual(
      GENERATED_CELLS.map((cell) => `${cell.section}.${cell.key}.${cell.field}.${cell.language}`),
    )
    expect(
      filledCells.filter((cell) => cell.word === '').map((cell) => `${cell.section}.${cell.key}`),
      'an empty cell of the filled copy is a case that asserts nothing',
    ).toEqual([])
    expect(
      new Set(filledCells.map((cell) => cell.word)).size,
      'two cells sharing a word would let a place print the other one and pass',
    ).toBe(filledCells.length)
  })

  it('the words it fills with stand for nothing else -> the tree is searched -> no unit can be printing one of its own', async () => {
    // Why: a sentinel proves the word came from the dictionary only while no unit could produce
    // the same string, so the shape is checked against the units' own source.
    const { readdirSync } = await import('node:fs')
    const dir = join(ROOT, 'src', 'adapter', 'screen-renderer')
    const inTheTree = readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .filter((name) => readFileSync(join(dir, name), 'utf8').includes('<word '))

    expect(inTheTree, 'a unit that could write this shape itself would make the carriage group pass by accident').toEqual(
      [],
    )
  })

  it('FR-032 (MUST) shows its mark as a word -> the manuscript is read and every frame this file can build is put on the screen -> that word is written, and every word that IS written is printed on one of them in its own language', () => {
    // Why: no member is named: FR-032's mark is printed by a unit this file may not read, so the
    // claim is made against the whole of what screenViewFromRegions (PI-37) hands out.

    // Why: an empty mark cell leaves FR-032 unmet, since an empty word shows nothing.
    const mark = MANUSCRIPT_CELLS.filter((cell) => cell.section === 'confirmationMarks')
    expect(
      mark.length,
      'FR-032 (MUST) needs a word per language for the mark, and the manuscript holds no cell for it at all',
    ).toBe(LANGUAGES.length)
    expect(
      mark.filter((cell) => cell.word === '').map((cell) => `${cell.key}.${cell.field}.${cell.language}`),
      'FR-032 (MUST): the medium is a word (CR-218), so this cell cannot stand empty the way PND-160 leaves the others',
    ).toEqual([])

    const written = MANUSCRIPT_CELLS.filter((cell) => cell.word !== '')

    // Why: a stated omission (DROPPED) is out by name, since asking arrival of it would disprove the
    // declared scope; the case above fails any entry that is neither a place nor stated.
    const stated = new Set(DROPPED.map((one) => `${one.section}.${one.key}`))
    // Why: dropped for want of a member is not let off arrival: the surfaces of NT-7, FR-032, T-233,
    // fileStatus (FR-101) and exportFormats (FR-096) can still be raised whole.
    const reachedByTheWholeView = (cell: Cell): boolean =>
      cell.section === 'confirmation' ||
      cell.section === 'confirmationMarks' ||
      cell.section === 'reasons' ||
      cell.section === 'invariants' ||
      cell.section === 'helpHeadings' ||
      cell.section === 'helpNotes' ||
      cell.section === 'helpBlockNotes' ||
      cell.section === 'questions' ||
      cell.section === 'fileStatus' ||
      cell.section === 'exportFormats' ||
      (cell.section === 'icons' && cell.field === 'label' && ON_U_55.includes(cell.key))
    expect(readFileSync(join(ROOT, 'docs', 'spec', '01-04-requirements.md'), 'utf8')).toContain(FR_076_NO_SETTING_COPIED)
    const owed = written.filter(
      (cell) => !stated.has(`${cell.section}.${cell.key}`) || reachedByTheWholeView(cell),
    )

    expect(
      owed.some((cell) => cell.section === 'confirmationMarks'),
      'FR-032 (MUST): the mark is what this case exists to hold, and it fell out of the loop',
    ).toBe(true)
    expect(
      new Set(owed.filter((cell) => cell.section === 'reasons').map((cell) => cell.key)),
      'FR-076 (MUST): every row of table T-233 owes NT-1 s words and NT-3a s next step',
    ).toEqual(new Set(T233.filter((entry) => !entry.sharesWords).map((entry) => entry.row)))
    expect(
      new Set(owed.filter((cell) => cell.section === 'questions').map((cell) => cell.key)),
      'FR-076 (MUST): every row of table T-234 owes NT-7 s sentence -- what is about to happen, in words',
    ).toEqual(new Set(T234.map((entry) => entry.row)))

    for (const cell of owed) {
      const at = `${cell.section}.${cell.key}.${cell.field}`

      // Why: a reason word is matched with S-350 printed in its {downloadUrl} seat (FR-073), and a
      // helpNotes or scaleEcho word on the frames that carry its row's text or SE-2's message.
      const printed = withSettingValues(withDownloadAddress(cell.word))
      const on =
        cell.section === 'helpNotes'
          ? helpNoteFramesShowing(cell.key, cell.word, cell.language)
          : cell.section === 'scaleEcho'
            ? scaleEchoFramesShowing(cell.word, cell.language)
            : cell.section === 'keyNotation'
            ? keyNotationFramesShowing(cell.word, cell.language)
            : cell.section === 'dualCursorReadout'
              ? dualCursorReadoutFramesShowing(cell.word, cell.language)
              : cell.section === 'exportChooser'
              ? exportSpanFramesShowing(cell.word, cell.language)
              : cell.section === 'hintLines'
              ? hintLineFramesShowing(cell.word, cell.language)
              : cell.section === 'rowMinHeightField' || cell.section === 'taskGroupPanelWidthField'
                ? rowMinHeightFieldFramesShowing(cell.word, cell.language)
                : cell.section === 'fitSpanField'
                ? shownSpanFramesShowing(cell.word, cell.language)
                : cell.section === 'wholeScheduleShiftField'
                ? wholeScheduleShiftFramesShowing(cell.word, cell.language)
                : cell.section === 'propertyField'
                ? propertyFieldFramesShowing(cell.word, cell.language)
                : cell.section === 'colorField' && cell.key === 'customValue'
                ? customValueFramesShowing(cell.word, cell.language)
                : cell.section === 'searchPanel' && COUNT_SLOTTED_SEARCH_PANEL_PARTS.has(cell.key)
                ? countSlottedFramesShowing(cell.word, cell.language)
                : cell.section === 'settings' && NUMBERED_SETTINGS_ROWS.has(cell.key)
                ? framesShowing(`${printed}${FIRST_ROW_NUMBER}`, cell.language)
                : framesShowing(printed, cell.language)
      expect(
        on.length,
        `FR-038 (MUST): ${at} is written in ${cell.language}, and none of the ${FRAMES.length} frames this ` +
          'file can build prints its text and carries each of its glyph tokens as a row figure F-019 draws ' +
          '(FR-036) -- that word is reaching nowhere (PND-160, CR-194 section 5 item 2). ' +
          'Run `npm run gen` first; if it still fails, the road from the dictionary to the screen is cut, ' +
          'or the word is printed by a frame this file does not know how to raise.',
      ).toBeGreaterThan(0)

      // Why: checked only for cells with no named place and two different words: a named place is held
      // per language above, and settled T-103 names travel untranslated in the whole view.
      if (PLACES.some((one) => one.section === cell.section && one.key === cell.key)) continue
      for (const other of LANGUAGES.filter((one) => one !== cell.language)) {
        const twin = MANUSCRIPT_CELLS.find(
          (one) =>
            one.section === cell.section &&
            one.key === cell.key &&
            one.field === cell.field &&
            one.language === other,
        )
        if (twin === undefined || twin.word === '' || twin.word === cell.word) continue
        for (const one of on) {
          expect(
            stringsOfView(viewOf(screenViewFromRegions, one.frame, other)).includes(printed),
            `FR-038 (MUST): ${at} holds a word of its own per language, so ${one.what} must not print the ` +
              `${cell.language} one when the view is asked for in ${other}`,
          ).toBe(false)
        }
      }
    }
  },
  // Why: the sweep builds every frame for every written word, so its cost is words x frames;
  // the budget is room for a loaded machine, and narrowing the sweep would let a word through.
  300_000,
  )
})

function sentinel(section: string, key: string, field: string, language: string): string {
  return `<word ${section}.${key}.${field}.${language}>`
}

function fillEveryWord(dictionary: Dictionary): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [section, entries] of Object.entries(dictionary)) {
    out[section] = entries.map((entry) => {
      const key = keyOf(section, entry)
      const filled: Record<string, unknown> = { ...entry }
      for (const field of wordFieldsOf(entry)) {
        const words: Record<string, string> = {}
        for (const language of Object.keys(wordsOf(entry, field))) {
          words[language] = sentinel(section, key, field, language)
        }
        filled[field] = words
      }
      return filled
    })
  }
  return out
}
