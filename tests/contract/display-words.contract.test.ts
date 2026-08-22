// Contract test: the road that carries the display words to the screen.
//
// FR-038 (MUST) shows the menus and the panels in the language the reader
// chose, and its fifth paragraph (MUST) puts every word the screen prints in
// ONE per-language dictionary -- ⛔ forbidding the words to be written into a
// requirement or a table (MUST NOT). Chapter 6.2 fixes the manuscript as
// `docs/spec/_source/display-words.json` and says the words reach `src/` as one
// generated file (MUST). CR-194 built both and left every word empty on
// purpose; ruling 06 of docs/review/rulings-2026-08-22 asks for the acceptance
// case CR-194 section 5 defines:
//
//   "the manuscript's word is changed by one -> does a test fall?
//    ⛔ if none falls, that word is reaching nowhere"
//
// THREE GROUPS, ALL DRIVEN BY READING THE DICTIONARY AT LOAD TIME, so that no
// word is re-typed here (which FR-038's MUST NOT would forbid anyway):
//
//   1. THE CARRIAGE   every entry that HOLDS a word: the unit that owns that
//                     place prints exactly it, in both languages. ⭐ DRIVEN BY
//                     A FILLED DICTIONARY THIS FILE BUILDS, stood where the
//                     five units import theirs from, so every case really runs
//                     while the manuscript is empty (PD-160). ⛔ No word is
//                     written into the manuscript to achieve that -- the words
//                     are the user's decision.
//   2. THE FALLBACK   every entry that is EMPTY: the place still prints a
//                     string, and where a requirement forbids emptiness the
//                     stand-in is not the empty string (FR-072).
//   3. THE ACCEPTANCE what holds the other two together -- the roster is the
//                     whole of table T-109, the generated file matches the
//                     manuscript cell for cell, no entry is passed over in
//                     silence, group 1's filled copy really covers every cell,
//                     and a guard that FALLS the moment one word of the
//                     manuscript changes (CR-194 section 5 item 2).
//
// WRITTEN WITHOUT READING THE UNITS' BODIES (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec (FR-038, FR-072,
// FR-037, FR-029, tables T-103, T-109, T-023, T-040, T-064 row PI-37, T-075
// rows UF-60 .. UF-69), docs/review/rulings-2026-08-22/, change-request/
// CR-194-*.md, the two `display-words.json` AS DATA, and -- in the five owning
// units and `screen-renderer.ts` -- the head comment, the exported types and
// the signatures. ⛔ No expected value here was taken from how a unit computes
// its answer.
//
// Test placement is TS-6 of table T-218: a contract test lives in
// tests/contract/. This one is at the contract level because the road it walks
// is `screenViewFromRegions`, the published entry of table T-064's PI-37 -- not
// one unit's function.
//
// FIVE THINGS THIS FILE DELIBERATELY DOES NOT ASSERT, each searched for first:
//
//   1. WHAT THE STAND-IN SAYS while an entry is empty. CR-194 section 0 item ⑧
//      settled "empty means keep printing what it printed before" WITHOUT
//      asking the user, and docs/spec fixes no stand-in for a label, a group
//      name, a surface heading or a tooltip. Pinning one here would record the
//      code rather than the specification, so group 2 asserts only that a
//      string arrives -- plus FR-072's headings, which the specification does
//      constrain.
//   2. THE `notices` AND `confirmation` SECTIONS, and IC-69 / IC-70 with them.
//      Their places are UF-67's (`notices.ts`), which is not one of the five
//      units this file may look at.
//   3. IC-58 / IC-59 / IC-60. Table T-109 stands them on the `Row Title
//      Panel`, which is UF-63's -- not one of the five either. ⚠️ IC-53 ..
//      IC-57 are left out for a different reason: table T-109 says in as many
//      words that they are not entries a person presses, so no `CommandItem`
//      carries their word.
//   4. THE `構え` GROUP OF THE COMMAND PALETTE (keyed `IC-54`). Table T-109
//      marks IC-54 「ボタンではない」 and no other row sits in that group, so the
//      group holds no entry and `CommandPalette` publishes no member that
//      would carry its name -- `armedText` is FR-053's own text, not a heading.
//   5. TWELVE OF THE FOURTEEN `assignments`. FR-037 shows an assignment where a
//      person reaches for the slower way, and the only slower ways this
//      component describes are the two scrollbars -- MK-1 (縦スクロール) and
//      MK-5 (横スクロール) of table T-023. The other twelve rows are help
//      content (FR-036), whose surface is not assembled yet.
//
// ⭐ Every one of those is recorded by `DROPPED` below rather than passed over,
// and the acceptance group holds the dictionary against the two lists together:
// an entry that is neither a place nor a stated omission fails.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { bare, specTable } from './spec-table'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { emptyDialogueLog, type DialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  screenStateWithPalette,
  screenStateWithSurface,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
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
  type DisplayLanguage,
  type ScreenSession,
  type ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'

// ---------------------------------------------------------------------------
// The dictionary, read as data at load time.
// ---------------------------------------------------------------------------

/** One entry's word per language: the `{ "ja": "", "en": "" }` of both files. */
type Words = Readonly<Record<string, string>>

/** One entry of one section, e.g. `{ rowId, label, hint }`. */
type Entry = Readonly<Record<string, unknown>>

/** The dictionary with `$comment` dropped: section name -> its entries. */
type Dictionary = Readonly<Record<string, readonly Entry[]>>

const ROOT = process.cwd()

/** Chapter 6.2 (MUST): the manuscript. */
const MANUSCRIPT_PATH = join(ROOT, 'docs', 'spec', '_source', 'display-words.json')

/** Chapter 6.2 (MUST): the one generated file the words reach `src/` by. */
const GENERATED_PATH = join(ROOT, 'src', 'adapter', 'screen-renderer', 'display-words.json')

/** The module id the five units import; group 3 stands a filled copy in its place. */
const GENERATED_MODULE = '../../src/adapter/screen-renderer/display-words.json'

const readDictionary = (path: string): Dictionary => {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  const out: Record<string, readonly Entry[]> = {}
  for (const [section, value] of Object.entries(raw)) {
    if (Array.isArray(value)) out[section] = value as readonly Entry[]
  }
  return out
}

const MANUSCRIPT = readDictionary(MANUSCRIPT_PATH)
const GENERATED = readDictionary(GENERATED_PATH)

/**
 * Which member of an entry is its key. ⚠️ Not invented here: CR-194 section 0
 * item ⑧ 4 fixes a group's key as the FIRST row of table T-109 that sits in it,
 * and every other key is a row ID, a settled name of table T-103, or the state
 * FR-072 / NT-7 names.
 */
const KEY_FIELD: Readonly<Record<string, string>> = {
  icons: 'rowId',
  paletteGroups: 'firstRow',
  surfaces: 'name',
  notices: 'rowId',
  confirmation: 'answer',
  panelHeadings: 'showing',
  assignments: 'rowId',
}

const isWords = (value: unknown): value is Words =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((word) => typeof word === 'string')

const keyOf = (section: string, entry: Entry): string => String(entry[KEY_FIELD[section] ?? ''] ?? '')

/** The members of an entry that hold words, e.g. `label` and `hint` of an icon. */
const wordFieldsOf = (entry: Entry): readonly string[] =>
  Object.entries(entry)
    .filter(([, value]) => isWords(value))
    .map(([field]) => field)

const wordsOf = (entry: Entry, field: string): Words => entry[field] as Words

/** One `{ section, key, field, language }` cell of the dictionary. */
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

/**
 * The languages the dictionary offers a word in. Read from the file rather than
 * typed out; the acceptance group holds them against FR-038's two.
 */
const LANGUAGES: readonly string[] = [...new Set(GENERATED_CELLS.map((cell) => cell.language))]

// ---------------------------------------------------------------------------
// Fixed copies of the specification the places are found by (Chapter 1.9).
// ---------------------------------------------------------------------------

/** Table T-109 -- the whole of the icons (FR-029, MUST). Its 面 column IS the placement. */
const T109 = specTable('T-109')

/** Table T-023 -- what the pointer and the keyboard are assigned to. */
const T023 = specTable('T-023')

const t109Row = (rowId: string) => T109.rows.find((row) => row.id === rowId)

/** The 面 cell names one or more settled names of table T-103, separated by `/`. */
const surfacesOf = (rowId: string): readonly string[] =>
  (t109Row(rowId)?.by['面'] ?? '').split('/').map((name) => bare(name.trim())).filter((name) => name !== '')

const groupOf = (rowId: string): string => bare(t109Row(rowId)?.by['群'] ?? '')

/**
 * ⚠️ Table T-109 holds rows that are not entries at all -- it says so in the
 * 何の入口か column in as many words, and `CommandItem` is only for the ones a
 * person can press.
 */
const isEntry = (rowId: string): boolean =>
  !/ボタンではない/.test(t109Row(rowId)?.by['何の入口か'] ?? '')

/** Table T-103's four surfaces, as IC-52's 面 column lists them. */
const SURFACE_NAMES = surfacesOf('IC-52')

/** The row of table T-023 whose 動作 is the scrolling a scrollbar does slowly (FR-037). */
const assignmentForAxis = (axis: 'horizontal' | 'vertical'): string | undefined =>
  T023.rows.find((row) => row.by['動作']?.includes(axis === 'vertical' ? '縦スクロール' : '横スクロール'))?.id

/** `iconHintDelayMs` (S-124), read from the generated defaults, never typed. */
const ICON_HINT_MS = SETTINGS_DEFAULTS['iconHintDelayMs'] as number

// ---------------------------------------------------------------------------
// One frame of input. ⚠️ Nothing here is asserted -- these are the conditions a
// place needs in order to be on the screen at all.
// ---------------------------------------------------------------------------

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

const SETTINGS = { ...SETTINGS_DEFAULTS, rowTitlePanelWidth: 400 } as unknown as DocumentSettings

/** The screen cut into table T-103's parts by FR-052's own expression. */
const REGIONS: ScreenRegions = (() => {
  const width = 1280
  const height = 800
  const headerHeight = 56
  const rulerHeight = 48
  const titleWidth = 400
  const propertiesWidth = 280
  const padding = SETTINGS_DEFAULTS['canvasPadding'] as number
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

const THE_TASK = 1

const SCHEDULE = {
  project: { title: 'a document', themeHue: 214, uidHighWaterMark: 0, minutesPerDay: null },
  calendars: [],
  tasks: [
    {
      uid: THE_TASK,
      wbsParentUid: null,
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
      nameAnchor: null,
      nameAlign: null,
      shapeKind: null,
      milestoneGlyph: null,
      fillColor: null,
      strokeColor: null,
      lineWeight: null,
    },
  ],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const TASK_REF: ItemRef = { kind: 'task', uid: THE_TASK }
const HOLDING_A_TASK: Selection = selectionWith(emptySelection(), TASK_REF)

const SESSION: ScreenSession = {
  language: 'ja',
  autosave: { kind: 'saving' },
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  iconUnderPointer: null,
  commandPaletteAt: { x: 500, y: 300 },
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesShowing: 'selection',
  propertiesSubject: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

/** The whole argument list of `screenViewFromRegions` (PI-37), in its declared order. */
interface Frame {
  readonly regions: ScreenRegions
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly selection: Selection
  readonly state: ScreenState
  readonly dialogueLog: DialogueLog
  readonly session: ScreenSession
}

const BASE: Frame = {
  regions: REGIONS,
  schedule: SCHEDULE,
  settings: SETTINGS,
  selection: HOLDING_A_TASK,
  state: emptyScreenState(),
  dialogueLog: emptyDialogueLog(),
  session: SESSION,
}

const frameWith = (part: Partial<Frame>): Frame => ({ ...BASE, ...part })

const sessionWith = (part: Partial<ScreenSession>): ScreenSession => ({ ...SESSION, ...part })

/** S-99e says the palette is shown (FR-053). */
const PALETTE_SHOWN = frameWith({ state: screenStateWithPalette(emptyScreenState(), true) })

/** S-99g says which surface is open (IN-4 of table T-028). */
const surfaceOpen = (surface: string): Frame =>
  frameWith({ state: screenStateWithSurface(emptyScreenState(), surface) })

// ---------------------------------------------------------------------------
// Reading the answer through the published entry (table T-064, PI-37).
// ---------------------------------------------------------------------------

type Build = typeof screenViewFromRegions

const viewOf = (build: Build, frame: Frame, language: string): ScreenView =>
  build(
    frame.regions,
    frame.schedule,
    frame.settings,
    frame.selection,
    frame.state,
    frame.dialogueLog,
    { ...frame.session, language: language as DisplayLanguage },
  )

const labelIn = (commands: readonly CommandItem[] | undefined, icon: string): string | undefined =>
  commands?.find((command) => command.icon === icon)?.label

const paletteCommands = (view: ScreenView): readonly CommandItem[] =>
  (view.commandPalette?.groups ?? []).flatMap((group) => group.commands)

const iconTooltip = (view: ScreenView, icon: string): string | undefined =>
  view.tooltips.find((tip) => tip.anchor.kind === 'icon' && tip.anchor.icon === icon)?.text

const scrollbarTooltip = (view: ScreenView, axis: string): string | undefined =>
  view.tooltips.find((tip) => tip.anchor.kind === 'scrollbar' && tip.anchor.axis === axis)?.text

/** Where the palette floats this frame (FR-053 has the person drag it there). */
const PALETTE_BOX: ScreenRect =
  viewOf(screenViewFromRegions, PALETTE_SHOWN, 'ja').commandPalette?.box ?? REGIONS.scheduleCanvas

/** The middle of a scrollbar lane, so that FR-037's pointer is on it. */
const scrollbarPointer = (axis: 'horizontal' | 'vertical'): { x: number; y: number } => {
  const bar = viewOf(screenViewFromRegions, BASE, 'ja').frame.scrollbars.find((one) => one.axis === axis)
  if (bar === undefined) throw new Error(`SC-4 of table T-031 keeps both bars drawn, and the ${axis} one is absent`)
  return { x: bar.track.x + bar.track.width / 2, y: bar.track.y + bar.track.height / 2 }
}

// ---------------------------------------------------------------------------
// Where each entry of the dictionary is printed. ⭐ Built by walking the
// dictionary and asking the tables where that key stands -- no place is typed
// out, so an entry the tables move follows.
// ---------------------------------------------------------------------------

interface Place {
  readonly section: string
  readonly key: string
  readonly field: string
  /** The row of table T-075 that owns it. */
  readonly unit: string
  /** Reads as "the App Header entry IC-1". */
  readonly what: string
  readonly frame: Frame
  readonly read: (view: ScreenView) => string | undefined
}

/** An entry of the dictionary this file states no place for, and why. */
interface Dropped {
  readonly section: string
  readonly key: string
  readonly why: string
}

const PLACES: Place[] = []
const DROPPED: Dropped[] = []

const place = (part: Place): void => {
  PLACES.push(part)
}

const drop = (section: string, key: string, why: string): void => {
  DROPPED.push({ section, key, why })
}

// -- icons: the entry's own word (`label`) and the explanation EZ-2 shows (`hint`)

/**
 * Where an icon is drawn, and where the pointer is while it rests on that icon.
 *
 * ⚠️ THE POINT DOES NOT NAME THE ICON, and cannot: no member of `ScreenView`
 * carries an entry's rectangle, which is the whole reason
 * `ScreenSession.iconUnderPointer` exists (PD-141). What the point is for is a
 * session that holds together -- `pointer: null` means the pointer is outside
 * the window, which cannot be true while it rests on an entry.
 */
const iconFrames = new Map<string, Frame>()

for (const entry of GENERATED['icons'] ?? []) {
  const rowId = keyOf('icons', entry)
  const row = t109Row(rowId)
  if (row === undefined) {
    drop('icons', rowId, 'table T-109 has no such row')
    continue
  }
  if (!isEntry(rowId)) {
    drop('icons', rowId, 'table T-109 says it is not an entry a person presses')
    continue
  }

  const surfaces = surfacesOf(rowId)
  const on = (
    what: string,
    unit: string,
    frame: Frame,
    within: ScreenRect,
    read: (view: ScreenView) => string | undefined,
  ): void => {
    place({ section: 'icons', key: rowId, field: 'label', unit, what, frame, read })
    if (!iconFrames.has(rowId)) {
      iconFrames.set(rowId, {
        ...frame,
        session: {
          ...frame.session,
          pointer: { x: within.x + within.width / 2, y: within.y + within.height / 2 },
          iconUnderPointer: rowId,
          pointerRestedMs: ICON_HINT_MS + 1,
        },
      })
    }
  }

  if (surfaces.includes('App Header')) {
    on(`the App Header entry ${rowId}`, 'UF-62', BASE, REGIONS.appHeader, (view) =>
      labelIn(view.appHeaderItems.commands, rowId),
    )
  }
  if (surfaces.includes('Command Palette')) {
    on(`the Command Palette entry ${rowId}`, 'UF-65', PALETTE_SHOWN, PALETTE_BOX, (view) =>
      labelIn(paletteCommands(view), rowId),
    )
  }
  for (const surface of surfaces.filter((name) => SURFACE_NAMES.includes(name))) {
    on(`the ${surface} entry ${rowId}`, 'UF-66', surfaceOpen(surface), REGIONS.scheduleCanvas, (view) =>
      labelIn(view.openModal?.commands, rowId),
    )
  }

  if (!PLACES.some((one) => one.section === 'icons' && one.key === rowId)) {
    drop('icons', rowId, `no unit of the five publishes a member for an entry on ${surfaces.join(' / ')}`)
  }
}

for (const [rowId, frame] of iconFrames) {
  // EZ-2 of table T-040 (MUST): the explanation of the icon the pointer rests
  // on, once `iconHintDelayMs` (S-124) has passed.
  place({
    section: 'icons',
    key: rowId,
    field: 'hint',
    unit: 'UF-69',
    what: `the explanation EZ-2 shows against ${rowId}`,
    frame,
    read: (view) => iconTooltip(view, rowId),
  })
}

// -- paletteGroups: the 群 column of table T-109, keyed by the group's first row

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

// -- surfaces: the heading of each surface table T-103 has named

for (const entry of GENERATED['surfaces'] ?? []) {
  const name = keyOf('surfaces', entry)
  if (!SURFACE_NAMES.includes(name)) {
    drop('surfaces', name, 'IC-52 of table T-109 does not name that surface')
    continue
  }
  place({
    section: 'surfaces',
    key: name,
    field: 'heading',
    unit: 'UF-66',
    what: `the heading of ${name}`,
    frame: surfaceOpen(name),
    read: (view) => view.openModal?.heading,
  })
}

// -- panelHeadings: the three states FR-072 makes the panel tell apart

/**
 * FR-072 (MUST): the heading says which of the two is showing, and when the
 * selection has gone the panel keeps what it had and says so.
 */
const PANEL_STATES: Readonly<Record<string, Frame>> = {
  selection: frameWith({ session: sessionWith({ propertiesShowing: 'selection' }) }),
  documentSettings: frameWith({ session: sessionWith({ propertiesShowing: 'documentSettings' }) }),
  noSelection: frameWith({
    selection: emptySelection(),
    session: sessionWith({ propertiesShowing: 'selection' }),
  }),
}

for (const entry of GENERATED['panelHeadings'] ?? []) {
  const showing = keyOf('panelHeadings', entry)
  const frame = PANEL_STATES[showing]
  if (frame === undefined) {
    drop('panelHeadings', showing, 'FR-072 names no such state of the panel')
    continue
  }
  place({
    section: 'panelHeadings',
    key: showing,
    field: 'text',
    unit: 'UF-64',
    what: `the properties panel heading while it shows ${showing}`,
    frame,
    read: (view) => view.propertiesPanel?.heading,
  })
}

// -- assignments: FR-037's hint, shown while the pointer rests on a scrollbar

for (const entry of GENERATED['assignments'] ?? []) {
  const rowId = keyOf('assignments', entry)
  const axis = (['vertical', 'horizontal'] as const).find((one) => assignmentForAxis(one) === rowId)
  if (axis === undefined) {
    drop('assignments', rowId, 'no slower way this component describes does what that row of table T-023 does')
    continue
  }
  place({
    section: 'assignments',
    key: rowId,
    field: 'text',
    unit: 'UF-69',
    what: `the hint FR-037 shows on the ${axis} scrollbar`,
    frame: frameWith({ session: sessionWith({ pointer: scrollbarPointer(axis) }) }),
    read: (view) => scrollbarTooltip(view, axis),
  })
}

// -- the sections whose place is not one of the five units this file may read

for (const section of ['notices', 'confirmation']) {
  for (const entry of GENERATED[section] ?? []) {
    drop(section, keyOf(section, entry), 'its place is UF-67 (notices.ts), which this file may not read')
  }
}

/** One case per place per language, so a failure names one cell of the dictionary. */
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

/** The cells with no word yet -- every one of them today (PD-160). */
const EMPTY = CASES.filter((one) => one.word === '')

const printed = (at: Place, language: string, build: Build = screenViewFromRegions): string | undefined =>
  at.read(viewOf(build, at.frame, language))

// ---------------------------------------------------------------------------
// 1. THE CARRIAGE -- what a written word has to satisfy.
// ---------------------------------------------------------------------------

/**
 * The dictionary this group drives the units with: the generated one with a
 * word that names its own cell in place of every cell. ⛔ It is built here and
 * never written to `_source/display-words.json` -- the 172 words are the user's
 * decision (PD-160), and a test that wrote one would be making it for them.
 */
const FILLED = fillEveryWord(GENERATED)

describe('FR-038 -- a word the dictionary holds is the word the screen prints', () => {
  /**
   * ⭐ WHY THIS GROUP BUILDS ITS OWN DICTIONARY. Every cell of the manuscript
   * is empty today (PD-160), so a group that stood by until a word was written
   * asserted nothing at all -- 272 cases that returned on their first line, and
   * three deliberate breaks of the road each turned exactly ONE of them red.
   * The dictionary is data: standing a FILLED copy where the five units import
   * theirs from drives the carriage for every place a word is owed, now, and
   * leaves the manuscript untouched.
   *
   * ⭐ WHY THE FILLED WORDS CANNOT PASS BY ACCIDENT. Each names its own cell
   * -- section, key, field and language -- and appears nowhere else in the
   * tree. A unit that prints its stand-in, or another entry's word, or the
   * other language's word, or another member of the same entry, prints
   * something this case did not ask for and goes red.
   */
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

  /** ⛔ Never falls back to the real build: that would make every case vacuous again. */
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
      // FR-038 (MUST) shows the menus in the language the READER chose, and
      // 「対象は `ja` と `en` の 2 言語とする」. ⛔ A place that answers the same
      // string whichever language is asked for is not reading the language at
      // all -- it would satisfy the case above in one of the two by luck.
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
      // ⭐ THE SAME CLAIM AGAINST THE DICTIONARY AS IT STANDS. PD-160 leaves
      // every cell empty, so this has no case today; the moment the user writes
      // one it gets a case, and the word comes from the file rather than here.
      expect(
        printed(one, one.language),
        `FR-038 (MUST): ${one.what} is ${one.unit}'s, and the dictionary gives it ${JSON.stringify(one.word)}`,
      ).toBe(one.word)
    },
  )
})

// ---------------------------------------------------------------------------
// 2. THE FALLBACK -- what stands there while the word is not written.
// ---------------------------------------------------------------------------

describe('PD-160 -- an entry with no word still leaves something at its place', () => {
  it.each(EMPTY)(
    '$section $key $field is empty in $language -> the view is built -> $what still prints a string',
    (one: Case) => {
      // ⛔ WHAT the stand-in says is not asserted: CR-194 settled "keep printing
      // what it printed before" without asking, and docs/spec fixes no wording.
      // What IS asserted is that the place is still there -- an entry that lost
      // its member would be a road that drops the word once one is written.
      expect(
        typeof printed(one, one.language),
        `${one.what} is ${one.unit}'s and the dictionary has no word for it, so the stand-in has to stand`,
      ).toBe('string')
    },
  )

  it.each(LANGUAGES)(
    'no heading is written for the panel in %s -> the three states FR-072 names are built -> each says what it is showing',
    (language) => {
      const headings = Object.entries(PANEL_STATES).map(([showing, frame]) => ({
        showing,
        heading: viewOf(screenViewFromRegions, frame, language).propertiesPanel?.heading,
      }))

      for (const { showing, heading } of headings) {
        expect(
          heading ?? '',
          `FR-072 (MUST): the panel says what it is showing, and it is showing ${showing}`,
        ).not.toBe('')
      }
      expect(
        new Set(headings.map((one) => one.heading)).size,
        'FR-072 (MUST): selection / documentSettings / the selection having gone read alike',
      ).toBe(headings.length)
    },
  )

  it('says the selection has gone by the member FR-072 asks the heading to answer for', () => {
    // The `noSelection` heading is only that heading while this is the state it
    // stands in; without it the case above would be comparing two of the same.
    const panel = viewOf(screenViewFromRegions, PANEL_STATES['noSelection'] as Frame, 'ja').propertiesPanel
    expect(panel?.showing, 'FR-072 (MUST NOT): clearing the selection does not move it to the settings').toBe(
      'selection',
    )
    expect(panel?.isSubjectGone, 'FR-072 (MUST): the panel keeps what it had and says the selection has gone').toBe(
      true,
    )
  })
})

// ---------------------------------------------------------------------------
// 3. THE ACCEPTANCE -- CR-194 section 5, which ruling 06 asks for.
// ---------------------------------------------------------------------------

describe('CR-194 section 5 -- change one word of the manuscript and a case falls', () => {
  it('offers a word per language -> the languages are read from the dictionary -> they are FR-038 s two', () => {
    // FR-038: 「対象は `ja` と `en` の 2 言語とする」.
    expect(new Set(LANGUAGES)).toEqual(new Set(['ja', 'en']))
  })

  it('the manuscript is the source -> both files are read -> the generated dictionary matches it cell for cell', () => {
    // ⛔ Without this the guard below would be blind: a manuscript that changed
    // without `npm run gen` leaves the screen reading the old words.
    expect(
      GENERATED_CELLS.map((cell) => `${cell.section}.${cell.key}.${cell.field}.${cell.language}=${cell.word}`),
    ).toEqual(
      MANUSCRIPT_CELLS.map((cell) => `${cell.section}.${cell.key}.${cell.field}.${cell.language}=${cell.word}`),
    )
  })

  it('holds an entry per word the screen needs -> each is looked for -> every one is a place here or a stated omission', () => {
    // ⛔ Without this an entry could be passed over in silence -- a section
    // added to the dictionary would simply have no case, and the guard below
    // would then say "one word changed" about a word nothing here can read.
    const accounted = new Set([
      ...PLACES.map((at) => `${at.section}.${at.key}`),
      ...DROPPED.map((one) => `${one.section}.${one.key}`),
    ])
    const held = Object.entries(GENERATED).flatMap(([section, entries]) =>
      entries.map((entry) => `${section}.${keyOf(section, entry)}`),
    )
    expect([...new Set(held)].filter((id) => !accounted.has(id))).toEqual([])
  })

  it('holds a word for every row of table T-109 -> the two rosters are compared -> the icons section is that table', () => {
    // FR-029 (MUST) makes table T-109 the whole of the icons, so a word missing
    // from this section is a place the road cannot reach whatever is written.
    expect((GENERATED['icons'] ?? []).map((entry) => keyOf('icons', entry))).toEqual(
      T109.rows.map((row) => row.id),
    )
  })

  it('the carriage group drives a dictionary of its own -> that copy is read back -> every cell of it holds a word that names only itself', () => {
    // ⛔ THE GUARD ON THE CARRIAGE GROUP ITSELF. Its cases are worth their
    // titles only while the copy they drive really holds a word in every
    // cell: a `fillEveryWord` that skipped a section would leave them comparing
    // a stand-in against a stand-in, which is the vacuity this file was
    // repaired out of. ⚠️ And a word that named two cells would let a unit
    // print the wrong one and pass.
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
    // ⚠️ The carriage group reads a sentinel as proof that the word came from
    // the dictionary. That reading holds only while no unit could produce the
    // same string on its own, so the shape is checked against the five units'
    // own source rather than assumed.
    const { readdirSync } = await import('node:fs')
    const dir = join(ROOT, 'src', 'adapter', 'screen-renderer')
    const inTheTree = readdirSync(dir)
      .filter((name) => name.endsWith('.ts'))
      .filter((name) => readFileSync(join(dir, name), 'utf8').includes('<word '))

    expect(inTheTree, 'a unit that could write this shape itself would make the carriage group pass by accident').toEqual(
      [],
    )
  })

  it('no word is written in the manuscript yet (PD-160) -> the manuscript is read -> every word that IS written is on the screen, and this guard falls', () => {
    // ⭐ THE HALF RULING 06 ASKS FOR: 「原稿の語を 1 つ変えると落ちる試験」.
    // Write one word, run `npm run gen`, and this case falls -- ⛔ if it does
    // not, that word is reaching nowhere. It checks the arrival FIRST, so a
    // road that is cut fails on the line above with the place's own name.
    const written = MANUSCRIPT_CELLS.filter((cell) => cell.word !== '')

    for (const cell of written) {
      for (const at of PLACES.filter(
        (one) => one.section === cell.section && one.key === cell.key && one.field === cell.field,
      )) {
        expect(
          printed(at, cell.language),
          `FR-038 (MUST): ${at.what} has to print the word the manuscript gives it`,
        ).toBe(cell.word)
      }
    }

    expect(
      written.map((cell) => `${cell.section}.${cell.key}.${cell.field}.${cell.language}`),
      'A word has been written, and the case above has just checked that it reaches the screen. ' +
        'This guard is CR-194 section 5 item 2 and falls on purpose: re-read the fallback group, ' +
        'which assumes PD-160 -- that no word is written yet.',
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The filled copy the acceptance case stands in place of the dictionary.
// ---------------------------------------------------------------------------

/** A word that stands for one cell and for nothing else. */
function sentinel(section: string, key: string, field: string, language: string): string {
  return `<word ${section}.${key}.${field}.${language}>`
}

/** The dictionary with every cell filled by the word that names it. */
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
