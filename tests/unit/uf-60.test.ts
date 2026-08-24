// Unit tests for `screenViewFromRegions` and `dialogueMessageFromInput` (unit
// UF-60 of table T-075, component CP-37 of table T-062, published as PI-37 of
// table T-064).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⭐ WHAT IS UNDER TEST IS THE COMPOSITION. UF-60's row of table T-075 says it
// binds the nine UI-part files together and publishes them; the nine own every
// rule about what a part looks like, and tests/unit/uf-61.test.ts ..
// uf-69.test.ts already drive those. ⛔ Nothing below re-tests them. What is
// tested here is only what the binding can get wrong:
//
//   1. every member of `ScreenView` is filled, and filled from its OWN unit --
//      table T-075 gives the component eleven units, nine of which describe one
//      part each (UF-61 .. UF-69), and UF-67 fills two members because it
//      answers to two manners of 表 T-037. ⭐ ONE member is UF-60's own rather
//      than any part's, because its own cell of that table says so -- see the
//      note headed WHAT MOVED below;
//   2. the ORDER. `tooltipsFromScreenView` takes the members already built, so
//      tooltip that explains a part has to see that part as the units that own
//      the other members built it -- not as some earlier or emptier value;
//   3. the ARGUMENTS. Each of the nine has a fixed argument list, and a caller
//      that hands one the wrong value cannot be caught by that unit's own
//      tests;
//   4. a part that is ABSENT -- a closed properties panel (FR-072), a hidden
//      palette (S-99e), no open surface (S-99g), the `Agent API` off (FR-066)
//      -- comes back `null` without making a neighbour wrong;
//   5. `dialogueMessageFromInput` refuses what has not been settled. AG-11 of
//      table T-035 states that as a MUST NOT.
//
// ⭐ WHAT MOVED, AND IN WHICH DIRECTION. UF-60's cell of 表 T-075 read
// 「UI パーツごとの 9 ファイルを束ねて公開する」 when this file was written.
// Version 0.71 of the specification (CR-194) rewrote it, and it now reads:
//
//     | UF-60 | `ScreenRenderer` | `screen-renderer.ts` | `pure` | UI パーツ
//     ごとの 9 ファイルを束ねて公開し、画面全体に効く表示言語を運ぶ（`FR-038`）|
//
// 「運ぶ」-- to carry -- is put on UF-60 ITSELF, not on one of the nine, and
// A-appendix.md:99 says why in as many words: 「表 T-075 の `UF-60` を「…束ねて
// 公開し、画面全体に効く表示言語を運ぶ」に直し、その 1 セルを根拠に `ScreenView`
// がメンバを 1 つ持つようにした」. Two MUSTs of FR-038 had nothing to stand on
// while no value carried it -- 「言語の状態は 1 つとし、画面全体に効くこと
// （MUST）。ヘルプだけを別の言語にできてはならない（MUST NOT）」and 「押す前に
// 現在どちらの言語かが読めること（MUST）」, whose second entrance is in the
// header, where nothing could be read.
//
// ⛔ THAT IS THE MANUSCRIPT MOVING, NOT THIS FILE'S EXPECTATION BEING BENT TO
// THE CODE. The copy of 表 T-075 below is the thing that went stale; the claim
// it drives is unchanged and just as tight -- `ScreenView` describes what that
// table gives this component AND NOTHING BESIDE, so a member the table names no
// owner for still fails. The new row is not "whatever the code returns": it is
// the duty quoted above, and the value's source is settled by the
// specification too -- FR-038 (MUST NOT) keeps the chosen language out of the
// document, and LY-5 of 表 T-060 leaves the Framework as the only layer that
// may hold a current value, which of the seven arguments leaves
// `ScreenSession.language` (S-99 of `_assets/tbl-settings.md`) alone.
//
// ⛔ HOW THE EXPECTED VALUES ARE OBTAINED (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// named below, docs/development-rules/, the entity types the arguments are
// built from, and in `screen-renderer.ts` its head comment, its declared types
// and its exported signatures -- including the "nine unit contracts" section,
// which is the declaration of what each of the nine is handed.
//
// ⚠️ HONEST NOTE ON WHAT WAS SEEN. The body of `screenViewFromRegions` sits in
// the same file as those declarations and was seen while reading them. ⭐ No
// expected value below is taken from it: every member is compared against the
// answer of the unit that table T-075 makes its owner, called with the
// arguments the contract section declares. That comparison is the composition's
// whole contract, and it is written from the contract, not from the body.
//
// The rules these cases answer to:
//   表 T-075   UF-60 binds the nine UI-part files, publishes them AND carries
//              the display language that reaches the whole screen (FR-038);
//              UF-61 .. UF-69 are those nine, and the component is `pure`
//   FR-038     one language state, reaching the WHOLE screen (MUST), the help
//              not excepted (MUST NOT), and never saved in the document
//              (MUST NOT)
//   表 T-064   PI-37 publishes `ScreenView`, `screenViewFromRegions` and
//              `dialogueMessageFromInput`, and points the last one at AG-11
//   AG-11      表 T-035 (docs/spec/01-04-requirements.md:3491) -- its last
//              clause is a MUST NOT against reading the half-typed line as an
//              utterance, and it makes the log count utterances in an order of
//              its own, which `logWithMessage` (PI-33) assigns, not this unit
//   FR-066     the dialogue field stands while the `Agent API` is on
//   FR-072     the properties panel shows one of two, and is closed when the
//              session names neither
//   S-99e      the palette's shown-or-hidden state, kept out of the document
//   S-99g      the one open surface, and none open by default
//   FR-085     a row name that does not fit is cut and shown whole in a tooltip
//   FR-037     the faster assignment is shown while the pointer rests on a
//              scrollbar, and taken away when it leaves
//   EZ-2       table T-040 (MUST): an icon explains itself under TWO
//              conditions, the PLACE and the TIME -- the pointer is ON that
//              icon, and it has rested there longer than `iconHintDelayMs`
//              (S-124). ⭐ The row promises the explanation OF THAT ICON, so an
//              entry the pointer is not on explains nothing however long the
//              rest has run
//   R7.1/R7.6  `pure` in table T-075: what was handed over comes back untouched
//              and the same frame answers the same way twice
//
// ⭐ THREE THINGS THIS FILE DELIBERATELY DOES NOT ASSERT:
//   1. WHAT any part contains. That is the nine units' own contract, and
//      tests/unit/uf-61.test.ts .. uf-69.test.ts already drive it. Every
//      assertion here is either "this member equals what its own unit answers"
//      or "this member is null". ⚠️ ONE EXCEPTION, and it is not a part's
//      contents but a rule ACROSS two members: FR-038 (MUST NOT) forbids the
//      help standing in a language of its own, and the two values it speaks of
//      are filled by two units that read none of each other -- so the pair can
//      only be compared where they meet, which is here.
//   2. THE KEY ORDER of the returned object. `ScreenView` prints its members in
//      UF-60 .. UF-69 order, but no requirement makes the enumeration order of
//      a JavaScript object observable, so the cases compare the SET of members.
//   3. WHETHER AN EMPTY OR BLANK utterance is refused. AG-11 and FR-066 state
//      no rule on the text and `_assets/tbl-settings.md` holds no dialogue row,
//      so a case asserting either way would settle a rule the specification has
//      not. What is asserted is that settledness alone decides.

import { describe, expect, it } from 'vitest'

import {
  emptyDialogueLog,
  logWithMessage,
  type DialogueLog,
} from '../../src/entity/document-model/dialogue-log/dialogue-log'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  screenStateWithPalette,
  screenStateWithSurface,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection, type Selection } from '../../src/entity/document-model/selection/selection'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { appHeaderItemsFromDocument } from '../../src/adapter/screen-renderer/app-header-items'
import { commandPaletteFromScreenState } from '../../src/adapter/screen-renderer/command-palette'
import { dialogueFieldFromLog } from '../../src/adapter/screen-renderer/dialogue-field'
import {
  confirmationFromSession,
  noticesFromSession,
} from '../../src/adapter/screen-renderer/notices'
import { openModalFromScreenState } from '../../src/adapter/screen-renderer/open-modals'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import { rowTitlePanelFromSchedule } from '../../src/adapter/screen-renderer/row-title-panel'
import { screenFrameFromRegions } from '../../src/adapter/screen-renderer/screen-frame'
import {
  dialogueMessageFromInput,
  screenViewFromRegions,
  type DialogueInput,
  type DisplayLanguage,
  type HelpModal,
  type ScreenSession,
  type ScreenView,
  type Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'

// ---------------------------------------------------------------------------
// Fixed copies of the specification the cases are driven by (Chapter 1.9).
// ---------------------------------------------------------------------------

/**
 * 表 T-075 -- the nine rows of the `ScreenRenderer` component that describe one
 * UI part each, in the table's own printed order, against the member of
 * `ScreenView` each one fills.
 *
 * ⭐ The unit and the file name are the table's; the member name is the one the
 * declared type publishes for that unit (its doc comment names the row).
 */
const T_075_PARTS = [
  { unit: 'UF-61', file: 'screen-frame.ts', member: 'frame' },
  { unit: 'UF-62', file: 'app-header-items.ts', member: 'appHeaderItems' },
  { unit: 'UF-63', file: 'row-title-panel.ts', member: 'rowTitlePanel' },
  { unit: 'UF-64', file: 'properties-panel.ts', member: 'propertiesPanel' },
  { unit: 'UF-65', file: 'command-palette.ts', member: 'commandPalette' },
  { unit: 'UF-66', file: 'open-modals.ts', member: 'openModal' },
  { unit: 'UF-67', file: 'notices.ts', member: 'notices' },
  // ⭐ UF-67 twice. Its row of 表 T-075 reads 「通知と確認（FR-076。作法は
  // 表 T-037）」, and NT-7 -- the manner for ASKING, which that table gained on
  // 2026-08-21 -- is a row of the same table. One more manner, not one more unit:
  // a tenth FILE would need a tenth row in 表 T-075.
  { unit: 'UF-67', file: 'notices.ts', member: 'confirmation' },
  { unit: 'UF-68', file: 'dialogue-field.ts', member: 'dialogueField' },
  { unit: 'UF-69', file: 'tooltips.ts', member: 'tooltips' },
] as const

/**
 * 表 T-075 -- the OTHER half of UF-60's own cell, which owns no file below it.
 *
 * ⭐ The cell reads 「UI パーツごとの 9 ファイルを束ねて公開し、画面全体に効く
 * 表示言語を運ぶ（`FR-038`）」. The second clause is a duty of UF-60 itself, so
 * this member has no owner among UF-61 .. UF-69 and no case below asks a part
 * for it. What it is compared against is FR-038's own answer: the one language
 * state, which reaches the composition as `ScreenSession.language` (S-99).
 */
const T_075_UF_60_OWN = [
  { unit: 'UF-60', file: 'screen-renderer.ts', member: 'language' },
] as const

/**
 * Every member 表 T-075 gives this component: UF-60's own, then the nine parts'
 * -- in the table's own printed order of rows.
 */
const T_075_MEMBERS = [...T_075_UF_60_OWN, ...T_075_PARTS]

/**
 * The part members whose owner is compared one by one below -- the nine less
 * UF-69's own, which is compared against the members built before it instead.
 * ⚠️ UF-60's own member is not here: no part fills it.
 */
const T_075_BEFORE_TOOLTIPS = T_075_PARTS.filter((part) => part.unit !== 'UF-69')

/** 表 T-103 -- the settled name of the surface FR-036 opens, spelling and all. */
const U_30_HELP = 'Help Modal'

/** A row of 表 T-109 placed on the `App Header`: IC-7 shows and hides the palette. */
const IC_COMMAND_PALETTE = 'IC-7'

/**
 * 表 T-109's IC-52 -- the entry that closes an open surface. ⭐ Used here
 * because its surface column names the modals ALONE: FR-029 (MUST) makes that
 * column the placement, so an entry that stands on the `App Header` as well
 * (IC-21, which FR-038 puts in the help too) could not tell "the surface went"
 * from "the header still has it".
 */
const IC_CLOSE_SURFACE = 'IC-52'

// ---------------------------------------------------------------------------
// Inputs. A whole `DocumentSettings` is 100+ keys, so a case pins the ones it
// means and the rest come from the generated defaults -- ⛔ rule 03 of
// docs/development-rules forbids re-typing a value the manuscript holds.
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/**
 * The same numbers uf-63's cases are driven from: `rowTitleFont` x `labelCoef`
 * is 10px per half-width character, so how much of a row name fits in
 * `rowTitlePanelWidth` (S-79) is arithmetic rather than a measurement.
 */
const SETTINGS = settingsOf({
  rowTitlePanelWidth: 400, // S-79
  rowTitleIndent: 20, // S-37
  rowTitleFont: 20, // S-36
  rowTitleTopScale: 1, // S-38
  labelCoef: 0.5, // S-30
  maxGroupDepth: 5, // S-125
  truncateUnits: 24, // S-35
  pinnedGroupIds: [], // S-126
  pinnedRowMax: 5, // S-127
})

/** `iconHintDelayMs` (S-124), read from the generated defaults, never typed. */
const ICON_HINT_MS = SETTINGS_DEFAULTS['iconHintDelayMs'] as number

/** `canvasPadding` (S-56), likewise. */
const PADDING = SETTINGS_DEFAULTS['canvasPadding'] as number

/**
 * What the shell measured this frame. ⚠️ FR-051 (MUST NOT) keeps the header
 * height and the bar thickness out of the settings, so none of these is a
 * specification value and no case asserts one.
 */
const SCREEN = {
  width: 1280,
  height: 800,
  appHeaderHeight: 56,
  rulerHeight: 48,
  rowTitlePanelWidth: SETTINGS.rowTitlePanelWidth as unknown as number,
  propertyPanelWidth: 280,
  canvasPadding: PADDING,
  scrollbarThickness: 8,
} as const

/**
 * The screen cut into table T-103's parts by FR-052's own expression -- the
 * canvas width less `canvasPadding`, the two panel widths and the vertical bar
 * is the `Row Area`'s width -- and U-50's, which takes the ruler band and the
 * padding off the canvas height.
 *
 * ⭐ Built here rather than through `regionsFromScreen` (UF-58): these
 * rectangles are this component's INPUT, and driving the input from another
 * unit's code would make a shared misreading invisible.
 */
// Every key of SCREEN is a measurement in pixels, so the override is typed by
// its keys rather than by SCREEN's own literal types -- `as const` would
// otherwise let a case pass only the number it already holds.
const regionsOf = (part: Partial<Record<keyof typeof SCREEN, number>> = {}): ScreenRegions => {
  const screen = { ...SCREEN, ...part }
  const canvas: ScreenRect = {
    x: 0,
    y: screen.appHeaderHeight,
    width: screen.width,
    height: screen.height - screen.appHeaderHeight,
  }
  const rowAreaWidth =
    canvas.width -
    screen.canvasPadding -
    screen.rowTitlePanelWidth -
    screen.propertyPanelWidth -
    screen.scrollbarThickness
  const rowAreaHeight =
    canvas.height - screen.rulerHeight - screen.canvasPadding - screen.scrollbarThickness

  return {
    appHeader: { x: 0, y: 0, width: screen.width, height: screen.appHeaderHeight },
    scheduleCanvas: canvas,
    rowTitlePanel: {
      x: canvas.x,
      y: canvas.y,
      width: screen.rowTitlePanelWidth,
      height: canvas.height,
    },
    timeRuler: {
      x: canvas.x + screen.rowTitlePanelWidth,
      y: canvas.y,
      width: rowAreaWidth,
      height: screen.rulerHeight,
    },
    propertiesPanel: {
      x: canvas.x + canvas.width - screen.propertyPanelWidth,
      y: canvas.y,
      width: screen.propertyPanelWidth,
      height: canvas.height,
    },
    rowArea: {
      x: canvas.x + screen.rowTitlePanelWidth,
      y: canvas.y + screen.rulerHeight,
      width: rowAreaWidth,
      height: rowAreaHeight,
    },
  }
}

const REGIONS = regionsOf()

/** Every nullable column of ET-4 spelled out; leaving one `undefined` reads as "set". */
const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    parentId: null,
    label: null,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

const scheduleOf = (groups: readonly TaskGroup[], tasks: readonly Task[] = []): Schedule =>
  ({
    project: { title: null, themeHue: 214, uidHighWaterMark: 0 },
    calendars: [],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: groups,
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

/** One half-width character costs 10px under SETTINGS, so 400 of them never fit. */
const NAME_TOO_LONG = 'x'.repeat(400)

/** Short enough to fit whole, so FR-085 has nothing to cut. */
const NAME_THAT_FITS = 'ab'

const SCHEDULE = scheduleOf([groupOf({ id: 'g1', label: NAME_THAT_FITS, order: 0 })])

/** Where the shell drew the one row -- inside the `Row Title Panel`, clear of both lanes. */
const ROW_BOX: ScreenRect = { x: 0, y: 104, width: 400, height: 24 }

const SESSION: ScreenSession = {
  language: 'ja',
  autosave: { kind: 'saved', at: '2026-08-19T09:00:00Z' },
  isAgentApiEnabled: true,
  pointer: null,
  pointerRestedMs: 0,
  iconUnderPointer: null,
  commandPaletteAt: { x: 500, y: 300 },
  // No case here reads the theme or the milestone glyph list. S-72 takes the
  // manuscript's default and S-142 stays closed; S-73 is read off the very
  // document this frame draws, which is where the shell gets it from too
  // (DR-5 of table T-052 keeps the hue on `Project`, not in the settings).
  themePreference: 'light',
  themeHue: SCHEDULE.project.themeHue,
  isMilestoneListOpen: false,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesShowing: 'selection',
  propertiesSubject: null,
  notices: [],
  confirmation: null,
  rowBoxes: [{ groupId: 'g1', box: ROW_BOX }],
}

const sessionWith = (part: Partial<ScreenSession>): ScreenSession => ({ ...SESSION, ...part })

const STATE = screenStateWithSurface(emptyScreenState(), U_30_HELP)

const LOG = [
  { author: 'person', text: 'move the milestone', settledAt: '2026-08-19T09:00:00Z' },
  { author: 'ai', text: 'moved it to the 21st', settledAt: '2026-08-19T09:00:04Z' },
].reduce(logWithMessage, emptyDialogueLog())

/** The whole argument list of `screenViewFromRegions`, in its declared order. */
interface Frame {
  readonly regions: ScreenRegions
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly selection: Selection
  readonly state: ScreenState
  readonly dialogueLog: DialogueLog
  readonly session: ScreenSession
}

const FRAME: Frame = {
  regions: REGIONS,
  schedule: SCHEDULE,
  settings: SETTINGS,
  selection: emptySelection(),
  state: STATE,
  dialogueLog: LOG,
  session: SESSION,
}

const frameWith = (part: Partial<Frame>): Frame => ({ ...FRAME, ...part })

// ---------------------------------------------------------------------------
// Reading the answer, and the oracle it is read against.
// ---------------------------------------------------------------------------

const viewOf = (frame: Frame = FRAME): ScreenView =>
  screenViewFromRegions(
    frame.regions,
    frame.schedule,
    frame.settings,
    frame.selection,
    frame.state,
    frame.dialogueLog,
    frame.session,
  )

/**
 * What each owner answers when called with the arguments its own contract
 * declares. ⭐ This -- not a copy of a part's contents -- is what the
 * composition owes: table T-075 makes each member's unit its owner.
 * ⚠️ Nine members, not nine units: UF-67 owns two of them.
 *
 * ⚠️ TEN members, because one of them has no part for an owner. UF-60's own
 * cell of 表 T-075 carries 「画面全体に効く表示言語」, so the oracle for that one
 * is not a unit's answer but the language the session stands in -- FR-038
 * (MUST NOT) bars the document from holding it and LY-5 of 表 T-060 leaves the
 * Framework holding it, so `ScreenSession.language` (S-99) is the only argument
 * of the seven it can lawfully come from.
 */
const membersFrom = (frame: Frame): Omit<ScreenView, 'tooltips'> => ({
  language: frame.session.language,
  frame: screenFrameFromRegions(frame.regions, frame.settings, frame.state),
  appHeaderItems: appHeaderItemsFromDocument(
    frame.schedule,
    frame.settings,
    frame.state,
    frame.session,
  ),
  rowTitlePanel: rowTitlePanelFromSchedule(
    frame.schedule,
    frame.settings,
    frame.selection,
    frame.session,
  ),
  propertiesPanel: propertiesPanelFromSelection(
    frame.schedule,
    frame.settings,
    frame.selection,
    frame.session,
  ),
  commandPalette: commandPaletteFromScreenState(frame.state, frame.selection, frame.session),
  openModal: openModalFromScreenState(frame.state, frame.schedule, frame.session),
  notices: noticesFromSession(frame.session),
  confirmation: confirmationFromSession(frame.session),
  dialogueField: dialogueFieldFromLog(frame.dialogueLog, frame.session),
})

/** The rest as they came back from the composition, which is what UF-69 is owed. */
const membersOf = (view: ScreenView): Omit<ScreenView, 'tooltips'> => {
  const { tooltips: _tooltips, ...rest } = view
  return rest
}

const anchorsOf = (tooltips: readonly Tooltip[], kind: Tooltip['anchor']['kind']): readonly string[] =>
  tooltips
    .filter((one) => one.anchor.kind === kind)
    .map((one) => JSON.stringify(one.anchor))

const iconsIn = (view: ScreenView): readonly string[] => [
  ...view.appHeaderItems.commands.map((one) => one.icon),
  ...(view.commandPalette?.groups.flatMap((group) => group.commands.map((one) => one.icon)) ?? []),
  ...(view.openModal?.commands.map((one) => one.icon) ?? []),
]

const iconTooltipsIn = (view: ScreenView): readonly string[] =>
  view.tooltips
    .filter((one) => one.anchor.kind === 'icon')
    .map((one) => (one.anchor as { icon: string }).icon)

/**
 * A pointer satisfying BOTH conditions EZ-2 of table T-040 puts on an explanation:
 * the PLACE -- it is on the named entry -- and the TIME -- it has rested there
 * longer than `iconHintDelayMs` (S-124).
 *
 * ⚠️ The place is answered by `ScreenSession.iconUnderPointer`, not by the
 * coordinate: IF-9 of table T-065 puts answering where an entry is on the side
 * that DREW it, and none of `ScreenView`'s parts carries an entry's rectangle.
 */
const restedOn = (icon: string, part: Partial<ScreenSession> = {}): ScreenSession =>
  sessionWith({
    pointer: { x: 5, y: 5 },
    pointerRestedMs: ICON_HINT_MS + 1,
    iconUnderPointer: icon,
    ...part,
  })

/** The pointer resting on IC-7, which the `App Header` draws whatever else is. */
const RESTED = restedOn(IC_COMMAND_PALETTE)

// ---------------------------------------------------------------------------

describe('UF-60 -- the nine parts of table T-075, one member each but UF-67', () => {
  it('describes every one of them, and nothing beside them', () => {
    // 表 T-075 gives `ScreenRenderer` nine units that describe a UI part
    // (UF-61 .. UF-69); UF-60 binds them, carries the display language its own
    // cell names, and UF-70 declares the seam. A member beyond the copies above
    // would be a part no unit of that table owns.
    // ⚠️ UF-67's row reads 「通知と確認」, so it owns two: NT-1 .. NT-6 are
    // manners of telling and NT-7 is the manner of asking, all of 表 T-037.
    // ⚠️ `language` is UF-60's own 「画面全体に効く表示言語を運ぶ」, which is why
    // it is the one member no part below is asked for.
    const members = Object.keys(viewOf()).sort()
    expect(members).toEqual(T_075_MEMBERS.map((one) => one.member).slice().sort())
  })

  it('leaves no member undefined', () => {
    // ⭐ `null` is an answer four of the nine may give (a part that is not
    // there); `undefined` is a member nobody filled.
    const view: Record<string, unknown> = { ...viewOf() }
    for (const one of T_075_MEMBERS) {
      expect(view[one.member], `${one.unit} fills ${one.member}`).not.toBeUndefined()
    }
  })

  for (const part of T_075_BEFORE_TOOLTIPS) {
    it(`fills ${part.member} with what ${part.unit} (${part.file}) answers`, () => {
      const view = viewOf()
      const owner = membersFrom(FRAME) as Record<string, unknown>
      expect((view as unknown as Record<string, unknown>)[part.member]).toEqual(owner[part.member])
    })
  }

  it('fills tooltips with what UF-69 (tooltips.ts) answers for that very frame', () => {
    const view = viewOf(frameWith({ session: RESTED }))
    expect(view.tooltips).toEqual(
      tooltipsFromScreenView(membersOf(view), FRAME.settings, RESTED),
    )
  })
})

describe('UF-60 -- the order: UF-69 is handed the rest already built', () => {
  it('hands UF-69 the rest exactly as they came back to the caller', () => {
    // ⭐ The contract of UF-69 takes `Omit<ScreenView, "tooltips">`, so the
    // tooltips a caller receives have to be the answer for the rest that same
    // caller receives. Anything else means a tooltip explains a part the reader
    // is not looking at.
    for (const frame of [FRAME, frameWith({ session: RESTED })]) {
      const view = viewOf(frame)
      expect(view.tooltips).toEqual(
        tooltipsFromScreenView(membersOf(view), frame.settings, frame.session),
      )
    }
  })

  it('does not build the tooltips before the rest', () => {
    // ⛔ The failure this rules out: tooltips computed against a frame that is
    // still empty. With the pointer rested, an empty frame explains nothing,
    // while this one holds the `App Header` entries UF-62 built.
    const view = viewOf(frameWith({ session: RESTED }))
    expect(iconTooltipsIn(view).length).toBeGreaterThan(0)
    expect(iconsIn(view)).toEqual(expect.arrayContaining([...iconTooltipsIn(view)]))
  })

  it('explains a row name as UF-63 cut it (FR-085)', () => {
    // FR-085 (MUST): a row name that does not fit is cut and the whole of it is
    // shown in a tooltip. The cut is UF-63's answer and the tooltip is UF-69's,
    // so the two agreeing is the composition's doing.
    const view = viewOf(
      frameWith({
        schedule: scheduleOf([groupOf({ id: 'g1', label: NAME_TOO_LONG, order: 0 })]),
        session: sessionWith({ pointer: { x: ROW_BOX.x + 1, y: ROW_BOX.y + 1 } }),
      }),
    )

    const cut = [...view.rowTitlePanel.pinnedTitles, ...view.rowTitlePanel.titles].filter(
      (title) => title.isLabelTruncated,
    )
    expect(cut.map((title) => title.groupId)).toEqual(['g1'])
    expect(anchorsOf(view.tooltips, 'rowTitle')).toEqual([
      JSON.stringify({ kind: 'rowTitle', groupId: 'g1' }),
    ])
  })

  it('explains no row when UF-63 had nothing to cut', () => {
    // The same frame with a name that fits: UF-63 says nothing was cut, and the
    // tooltip has to follow that answer rather than the schedule.
    const view = viewOf(
      frameWith({ session: sessionWith({ pointer: { x: ROW_BOX.x + 1, y: ROW_BOX.y + 1 } }) }),
    )

    expect(
      [...view.rowTitlePanel.pinnedTitles, ...view.rowTitlePanel.titles].map(
        (title) => title.isLabelTruncated,
      ),
    ).toEqual([false])
    expect(anchorsOf(view.tooltips, 'rowTitle')).toEqual([])
  })

  it('explains the scrollbar UF-61 placed, at the place UF-61 placed it (FR-037)', () => {
    // FR-037: the faster assignment is shown while the pointer rests ON the
    // scrollbar. Where that lane is, is UF-61's answer -- so this case reads
    // the lane out of the frame the composition returned and points at it.
    const lane = viewOf().frame.scrollbars.find((bar) => bar.axis === 'vertical')
    expect(lane, 'SC-4 keeps both bars drawn at all times').toBeDefined()

    const inside = {
      x: (lane as { track: ScreenRect }).track.x + 1,
      y: (lane as { track: ScreenRect }).track.y + 1,
    }
    const onLane = viewOf(frameWith({ session: sessionWith({ pointer: inside }) }))
    expect(anchorsOf(onLane.tooltips, 'scrollbar')).toEqual([
      JSON.stringify({ kind: 'scrollbar', axis: 'vertical' }),
    ])

    // ⭐ And away from it there is none -- so the tooltip is keyed to the lane's
    // own rectangle, not to the axis being present in the frame.
    const offLane = viewOf(frameWith({ session: sessionWith({ pointer: { x: 5, y: 300 } }) }))
    expect(anchorsOf(offLane.tooltips, 'scrollbar')).toEqual([])
  })

  it('explains the entries of the surface UF-66 opened, and none once it is closed', () => {
    // ⭐ EZ-2 of table T-040 puts TWO conditions on an explanation, not one,
    // and both are read off that row: the PLACE -- the pointer is placed on an
    // icon, and what is explained is THAT icon and no other -- and the TIME --
    // a set span has passed, the span being `iconHintDelayMs` (S-124).
    //
    // ⚠️ THE PLACE IS THE CONDITION THIS CASE USED TO LEAVE OUT. It rested the
    // pointer on IC-7 and then asked for an explanation of EVERY entry UF-66
    // drew. Under EZ-2 an entry the pointer is not on explains nothing, however
    // long the pointer has rested, so the old claim asked for a rule the
    // specification does not state.
    const opened = viewOf(frameWith({ session: restedOn(IC_CLOSE_SURFACE) }))
    expect(opened.openModal).not.toBeNull()
    const surfaceIcons = opened.openModal?.commands.map((one) => one.icon) ?? []
    expect(surfaceIcons, 'IC-52 closes an open surface').toContain(IC_CLOSE_SURFACE)

    // The place: the entry under the pointer explains itself, and no other
    // entry the composition drew does -- neither its neighbours on the surface
    // nor IC-7, which the `App Header` draws all the while.
    expect(iconTooltipsIn(opened)).toContain(IC_CLOSE_SURFACE)
    for (const other of [
      ...surfaceIcons.filter((icon) => icon !== IC_CLOSE_SURFACE),
      IC_COMMAND_PALETTE,
    ]) {
      expect(iconsIn(opened), `${other} is drawn`).toContain(other)
      expect(iconTooltipsIn(opened), `EZ-2: the pointer is not on ${other}`).not.toContain(other)
    }

    // The time: the same place, the wait not yet over, and that entry explains
    // nothing either.
    const tooSoon = viewOf(
      frameWith({ session: restedOn(IC_CLOSE_SURFACE, { pointerRestedMs: ICON_HINT_MS - 1 }) }),
    )
    expect(iconTooltipsIn(tooSoon), 'S-124: the wait is not over').not.toContain(IC_CLOSE_SURFACE)

    // S-99g: none open. The entry goes, and so does the explanation of it --
    // with the pointer now on IC-7, which the closing did not take away.
    const closed = viewOf(
      frameWith({
        state: screenStateWithSurface(emptyScreenState(), null),
        session: RESTED,
      }),
    )
    expect(closed.openModal).toBeNull()
    expect(iconsIn(closed)).not.toContain(IC_CLOSE_SURFACE)
    expect(iconTooltipsIn(closed)).not.toContain(IC_CLOSE_SURFACE)
    expect(iconTooltipsIn(closed), 'IC-7 is still drawn, so it still explains itself').toContain(
      IC_COMMAND_PALETTE,
    )
  })

  it('explains the entries of the palette UF-65 built, and none once S-99e hides it', () => {
    // The same two conditions of EZ-2. ⚠️ THE PLACE IS AGAIN WHAT THIS CASE
    // USED TO LEAVE OUT: it rested the pointer on IC-7 -- an `App Header` entry
    // -- and then asked for an explanation of every entry the palette built.
    const shown = viewOf(frameWith({ session: RESTED }))
    expect(shown.commandPalette).not.toBeNull()
    const paletteIcons =
      shown.commandPalette?.groups.flatMap((group) => group.commands.map((one) => one.icon)) ?? []
    expect(paletteIcons.length, 'U-34 `Palette Commands`').toBeGreaterThan(0)

    // The pointer is on IC-7, so IC-7 is what explains itself and not one entry
    // of the palette does.
    expect(iconTooltipsIn(shown)).toContain(IC_COMMAND_PALETTE)
    for (const icon of paletteIcons) {
      expect(iconTooltipsIn(shown), `EZ-2: the pointer is not on ${icon}`).not.toContain(icon)
    }

    // Move it onto one entry of the palette: that one explains itself, and the
    // entries beside it in the same palette still do not.
    const first = paletteIcons[0] as string
    const onEntry = viewOf(frameWith({ session: restedOn(first) }))
    expect(iconTooltipsIn(onEntry)).toContain(first)
    for (const other of [
      ...paletteIcons.filter((icon) => icon !== first),
      IC_COMMAND_PALETTE,
    ]) {
      expect(iconTooltipsIn(onEntry), `EZ-2: the pointer is not on ${other}`).not.toContain(other)
    }

    // The time (S-124): the same entry, the wait not over, nothing explained.
    const tooSoon = viewOf(
      frameWith({ session: restedOn(first, { pointerRestedMs: ICON_HINT_MS - 1 }) }),
    )
    expect(iconTooltipsIn(tooSoon), 'S-124: the wait is not over').not.toContain(first)

    // S-99e hides it. ⭐ The member goes null -- what the palette held is
    // UF-65's contract and not re-tested here -- and with the pointer back on
    // IC-7 the explanation that stands is IC-7's, none of the palette's.
    const hidden = viewOf(
      frameWith({ state: screenStateWithPalette(STATE, false), session: RESTED }),
    )
    expect(hidden.commandPalette).toBeNull()
    for (const icon of paletteIcons) {
      expect(iconTooltipsIn(hidden), `${icon} is gone with the palette`).not.toContain(icon)
    }
    expect(iconTooltipsIn(hidden)).toContain(IC_COMMAND_PALETTE)
  })
})

describe("UF-60 -- 表 T-075: 「画面全体に効く表示言語を運ぶ（FR-038）」, UF-60's own cell", () => {
  /** The two FR-038 admits: 「対象は `ja` と `en` の 2 言語とする」. */
  const BOTH_LANGUAGES = ['ja', 'en'] as const satisfies readonly DisplayLanguage[]

  it('GIVEN the session stands in one of the two languages WHEN the frame is described THEN the description carries that very language', () => {
    // FR-038 (MUST): 「言語の状態は 1 つとし、画面全体に効くこと」. The screen's
    // description is the whole screen, so the state has to reach it -- and
    // 表 T-075 puts the carrying on UF-60 rather than on any of the nine.
    for (const language of BOTH_LANGUAGES) {
      const view = viewOf(frameWith({ session: sessionWith({ language }) }))

      expect(view.language, `FR-038: the screen stands in ${language}`).toBe(language)
    }
  })

  it('GIVEN the help is the open surface WHEN the frame is described THEN the help stands in the same language as the screen (FR-038 MUST NOT)', () => {
    // FR-038 (docs/spec/01-04-requirements.md:3809): 「言語の状態は 1 つとし、
    // 画面全体に効くこと（MUST）。ヘルプだけを別の言語にできてはならない
    // （MUST NOT）」, and :3807: 「押す前に現在どちらの言語かが読めること
    // （MUST）」-- the second entrance is inside the help, so the help has to
    // say which language is on before it is pressed.
    //
    // ⭐ ONLY THE COMPOSITION CAN BE ASKED THIS, which is why the case stands
    // in this file rather than in uf-66.test.ts: the two values are filled by
    // two different units and neither reads the other's member, so "one state"
    // is a claim about the pair.
    //
    // ⛔ KNOWN RED -- A DEFECT IN THE IMPLEMENTATION, NOT IN THIS CASE.
    // `openModalFromScreenState` (UF-66) answers a `HelpModal` carrying only
    // `surface`, `heading` and `commands`; `language` is `undefined`, although
    // `HelpModal` declares it required and its own doc comment calls it
    // 「FR-038 (MUST): which language is on NOW, readable BEFORE the toggle is
    // pressed」. ⚠️ Version 0.71 of A-appendix.md records that 「現在の言語を運ぶ
    // 値がヘルプ側にしか無く」-- the help side was the half that HAD it -- so
    // this is the header being mended while the help went empty. ⛔ The
    // expectation is NOT bent to `undefined`: the specification is plain, so
    // the case stays red until UF-66 fills the member.
    for (const language of BOTH_LANGUAGES) {
      const view = viewOf(frameWith({ session: sessionWith({ language }) }))
      const help = view.openModal as HelpModal | null

      expect(help?.surface, 'U-30 `Help Modal` is the surface FRAME opens').toBe(U_30_HELP)
      expect(help?.language, 'FR-038 (MUST NOT): one state, the help not excepted').toBe(
        view.language,
      )
    }
  })

  it('GIVEN another document and other settings WHEN the frame is described THEN the language does not move with them (FR-038 MUST NOT)', () => {
    // FR-038 (MUST NOT): 「どの言語で開くかは読む人の環境であり、文書に保存しない」
    // -- so nothing in the document or its settings may decide this member.
    const other = frameWith({
      schedule: scheduleOf([groupOf({ id: 'g2', label: 'and another', order: 1 })]),
      settings: settingsOf({ ...SETTINGS, rowTitlePanelWidth: 320 }),
    })

    expect(viewOf(other).language).toBe(SESSION.language)
    expect(viewOf(other).rowTitlePanel, 'the other document really is another one').not.toEqual(
      viewOf().rowTitlePanel,
    )
  })

  it('GIVEN the language is the only thing that changed WHEN two frames are described THEN each answers with its own, and the same one twice (R7.6)', () => {
    const ja = viewOf(frameWith({ session: sessionWith({ language: 'ja' }) }))
    const en = viewOf(frameWith({ session: sessionWith({ language: 'en' }) }))

    expect(ja.language).not.toBe(en.language)
    expect(viewOf(frameWith({ session: sessionWith({ language: 'en' }) })).language).toBe(
      en.language,
    )
  })
})

describe('UF-60 -- the arguments each unit receives', () => {
  /** The members no contract lets the named argument reach, compared across two frames. */
  const expectUnreached = (
    changed: Frame,
    members: readonly (keyof Omit<ScreenView, 'tooltips'>)[],
  ): void => {
    const before = viewOf() as unknown as Record<string, unknown>
    const after = viewOf(changed) as unknown as Record<string, unknown>
    for (const member of members) {
      expect(after[member], `${member} is out of this argument's reach`).toEqual(before[member])
    }
  }

  it('gives the regions to UF-61 and to no other part', () => {
    // The contract lists `regions` in UF-61's signature alone. ⚠️ `tooltips` is
    // left out of the comparison on purpose: UF-69 reads the frame UF-61 built,
    // so it is reached THROUGH UF-61 and not by the argument.
    const narrower = frameWith({ regions: regionsOf({ propertyPanelWidth: 360 }) })
    expect(viewOf(narrower).frame).not.toEqual(viewOf().frame)
    expectUnreached(narrower, [
      'appHeaderItems',
      'rowTitlePanel',
      'propertiesPanel',
      'commandPalette',
      'openModal',
      'notices',
      'dialogueField',
    ])
  })

  it('gives the dialogue log to UF-68 and to no other part', () => {
    const spoken = frameWith({
      dialogueLog: logWithMessage(LOG, {
        author: 'person',
        text: 'and the next one',
        settledAt: '2026-08-19T09:01:00Z',
      }),
    })
    expect(viewOf(spoken).dialogueField).not.toEqual(viewOf().dialogueField)
    expectUnreached(spoken, [
      'frame',
      'appHeaderItems',
      'rowTitlePanel',
      'propertiesPanel',
      'commandPalette',
      'openModal',
      'notices',
    ])
  })

  it('keeps the schedule out of the four parts whose contract does not name it', () => {
    // UF-62 / UF-63 / UF-64 / UF-66 take a `Schedule`; UF-61, UF-65, UF-67 and
    // UF-68 do not.
    const other = frameWith({
      schedule: scheduleOf([
        groupOf({ id: 'g1', label: 'renamed', order: 0 }),
        groupOf({ id: 'g2', label: 'and another', order: 1 }),
      ]),
    })
    // ⛔ First that the new schedule is a different one at all, so the four
    // "unchanged" assertions cannot pass because nothing moved anywhere.
    expect(viewOf(other).rowTitlePanel).not.toEqual(viewOf().rowTitlePanel)
    expectUnreached(other, ['frame', 'commandPalette', 'notices', 'dialogueField'])
  })

  it('keeps the notices of the session in UF-67 alone', () => {
    // UF-67's contract takes the session and nothing else, and `notices` is the
    // member it fills. ⭐ The other seven take a session too, so this checks
    // that the composition does not route the raised notices anywhere else.
    const raised = frameWith({
      session: sessionWith({
        notices: [{ manner: 'NT-1', reason: 'that day is not a day', affectedCount: null }],
      }),
    })
    expect(viewOf(raised).notices).toEqual(noticesFromSession(raised.session))
    expect(viewOf(raised).notices).not.toEqual(viewOf().notices)
    expectUnreached(raised, ['frame', 'rowTitlePanel', 'dialogueField'])
  })

  it("answers with each owner's own answer for a frame nothing was pinned in", () => {
    // ⭐ The whole argument list at once: an empty document, an empty selection,
    // an empty log and a screen with nothing open. Every member still has to be
    // its owner's answer for THESE arguments.
    const bare: Frame = {
      regions: REGIONS,
      schedule: scheduleOf([]),
      settings: SETTINGS,
      selection: emptySelection(),
      state: emptyScreenState(),
      dialogueLog: emptyDialogueLog(),
      session: sessionWith({ rowBoxes: [], propertiesShowing: null, isAgentApiEnabled: false }),
    }
    const view = viewOf(bare)
    expect(membersOf(view)).toEqual(membersFrom(bare))
    expect(view.tooltips).toEqual(tooltipsFromScreenView(membersOf(view), bare.settings, bare.session))
  })
})

describe('UF-60 -- a part that is absent comes back null', () => {
  /** Every member but the named one still has to be its own unit's answer. */
  const expectNeighboursIntact = (frame: Frame): void => {
    const view = viewOf(frame)
    expect(membersOf(view)).toEqual(membersFrom(frame))
    expect(view.tooltips).toEqual(
      tooltipsFromScreenView(membersOf(view), frame.settings, frame.session),
    )
  }

  it('answers null for a closed properties panel (FR-072) without disturbing a neighbour', () => {
    const closed = frameWith({ session: sessionWith({ propertiesShowing: null }) })
    expect(viewOf(closed).propertiesPanel).toBeNull()
    expectNeighboursIntact(closed)
  })

  it('answers null for a hidden palette (S-99e) without disturbing a neighbour', () => {
    const hidden = frameWith({ state: screenStateWithPalette(STATE, false) })
    expect(viewOf(hidden).commandPalette).toBeNull()
    expectNeighboursIntact(hidden)
  })

  it('answers null when no surface is open (S-99g) without disturbing a neighbour', () => {
    const none = frameWith({ state: screenStateWithSurface(emptyScreenState(), null) })
    expect(viewOf(none).openModal).toBeNull()
    expectNeighboursIntact(none)
  })

  it('answers null for the dialogue field while the `Agent API` is off (FR-066)', () => {
    const off = frameWith({ session: sessionWith({ isAgentApiEnabled: false }) })
    expect(viewOf(off).dialogueField).toBeNull()
    expectNeighboursIntact(off)
  })

  it('answers null four times over, and still describes the five that remain', () => {
    // ⭐ All four absent at once. The five members no requirement lets go away
    // -- UF-61, UF-62, UF-63, UF-67 and UF-69 -- are still their owners'
    // answers, so one part's absence cannot empty another.
    const bare = frameWith({
      state: screenStateWithPalette(screenStateWithSurface(emptyScreenState(), null), false),
      session: sessionWith({ propertiesShowing: null, isAgentApiEnabled: false }),
    })
    const view = viewOf(bare)

    expect(view.propertiesPanel).toBeNull()
    expect(view.commandPalette).toBeNull()
    expect(view.openModal).toBeNull()
    expect(view.dialogueField).toBeNull()

    expect(view.frame).toEqual(membersFrom(bare).frame)
    expect(view.appHeaderItems).toEqual(membersFrom(bare).appHeaderItems)
    expect(view.rowTitlePanel).toEqual(membersFrom(bare).rowTitlePanel)
    expect(view.notices).toEqual(membersFrom(bare).notices)
    expect(view.tooltips).toEqual(
      tooltipsFromScreenView(membersOf(view), bare.settings, bare.session),
    )
  })
})

describe('PI-37 dialogueMessageFromInput -- AG-11 of table T-035 (MUST NOT)', () => {
  const inputOf = (part: Partial<DialogueInput> = {}): DialogueInput => ({
    text: 'move the milestone to the 21st',
    isSettled: true,
    author: 'person',
    settledAt: '2026-08-19T09:00:00Z',
    ...part,
  })

  it('refuses a line that has not been settled', () => {
    // AG-11 (docs/spec/01-04-requirements.md:3491) forbids reading the
    // half-typed line as an utterance (MUST NOT). `null` is the whole answer.
    expect(dialogueMessageFromInput(inputOf({ isSettled: false }))).toBeNull()
  })

  it('lets nothing of the unsettled line through', () => {
    // ⛔ Not "an utterance with empty text" -- an utterance at all would already
    // be a reading of what was not settled.
    const half = inputOf({ text: 'move the mile', isSettled: false })
    expect(dialogueMessageFromInput(half)).toBeNull()
    expect(JSON.stringify(dialogueMessageFromInput(half))).not.toContain('move the mile')
  })

  it('refuses a blank line that has not been settled', () => {
    expect(dialogueMessageFromInput(inputOf({ text: '', isSettled: false }))).toBeNull()
    expect(dialogueMessageFromInput(inputOf({ text: '   ', isSettled: false }))).toBeNull()
  })

  it('lets a settled line through, carrying the three values it arrived with', () => {
    // ⚠️ `author` and `settledAt` are carried, not read: table T-066's CS-1
    // keeps the clock and the identity out of a `pure` unit.
    expect(dialogueMessageFromInput(inputOf())).toEqual({
      author: 'person',
      text: 'move the milestone to the 21st',
      settledAt: '2026-08-19T09:00:00Z',
    })
  })

  it('does not number the utterance', () => {
    // AG-11 (MUST): the log counts utterances in an order of its own, and PI-33
    // `logWithMessage` is what assigns the number -- two writers choosing one
    // would lose a message from AG-6's selection.
    expect(Object.keys(dialogueMessageFromInput(inputOf()) ?? {})).not.toContain('sequence')
  })

  it('is settledness alone that decides', () => {
    // ⭐ The same three values, twice, differing in the flag AG-11 names.
    const settled = inputOf({ text: 'the same words', isSettled: true })
    const unsettled = inputOf({ text: 'the same words', isSettled: false })
    expect(dialogueMessageFromInput(settled)).not.toBeNull()
    expect(dialogueMessageFromInput(unsettled)).toBeNull()
  })

  it('does not write to the input it was handed (R7.1)', () => {
    const input = inputOf()
    const before = structuredClone(input)
    dialogueMessageFromInput(input)
    expect(input).toEqual(before)
  })
})

describe('UF-60 -- `pure` in table T-075', () => {
  it('gives the same frame the same answer twice (R7.6)', () => {
    expect(viewOf()).toEqual(viewOf())
    expect(viewOf(frameWith({ session: RESTED }))).toEqual(viewOf(frameWith({ session: RESTED })))
  })

  it('writes to none of the seven arguments it was handed (R7.1)', () => {
    const before = structuredClone(FRAME)
    viewOf()
    expect(FRAME).toEqual(before)
  })
})
