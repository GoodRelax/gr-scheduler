// Builds the Command Palette description for one frame.
// @unit      UF-65   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type { Selection } from '../../entity/document-model/selection/selection'
import type {
  CommandItem,
  CommandPalette,
  DisplayLanguage,
  IconId,
  PaletteGroup,
  ScreenSession,
} from './screen-renderer'
import iconRoster from './icon-roster.json'
import displayWords from './display-words.json'

type IconRosterRow = (typeof iconRoster.icons)[number]

const COMMAND_PALETTE = 'Command Palette'

const ALIGN_REQUIREMENT = 'FR-034'

// STOP: spec does not decide which T-109 rows are not buttons. Looked in T-109, FR-029, F-019
const NOT_BUTTON_ROWS: readonly string[] = ['IC-53', 'IC-54']

const MINIMISE_ROW: IconId = 'IC-75'

const INTERACTION_RECORD_ROW: IconId = 'IC-76'

const MILESTONE_GLYPH_REQUIREMENT = 'FR-078'

// STOP: spec does not decide which T-109 row works the milestone list. Looked in T-109, FR-053, FR-078
const MILESTONE_LIST_CONTROL_ROWS: readonly string[] = ['IC-50']

const NO_WORDS = ''

const WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const GROUP_NAMES_BY_FIRST_ROW = new Map(
  displayWords.paletteGroups.map((entry) => [entry.firstRow, entry]),
)

const ARM_WORDS_BY_ROW = new Map(displayWords.arms.map((entry) => [entry.rowId, entry]))

// see FR-038
/** @purity pure */
function entryLabel(icon: IconId, language: DisplayLanguage): string {
  const word = WORDS_BY_ROW.get(icon)?.label[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

// see FR-036, FR-038
/** @purity pure */
function groupName(groupCell: string, firstRow: string, language: DisplayLanguage): string {
  const word = GROUP_NAMES_BY_FIRST_ROW.get(firstRow)?.name[language]
  if (word === undefined) return groupCell
  return word === '' ? groupCell : word
}

// see FR-029, FR-034
/** @purity pure */
function isEntryUsable(
  row: IconRosterRow,
  selection: Selection,
  drawnTasks: ReadonlySet<number> | null,
): boolean {
  if (!row.authority.includes(ALIGN_REQUIREMENT)) return true
  return (
    selection.ordered &&
    // TRAP: count only drawn Tasks; Selection is not pruned when a fold or hiding takes one out.
    selection.items.filter(
      (item) => item.kind === 'task' && (drawnTasks === null || drawnTasks.has(item.uid)),
    ).length >= 2
  )
}

/** @purity pure */
function drawnTaskUids(
  schedule: Schedule | undefined,
  session: ScreenSession,
): ReadonlySet<number> | null {
  if (schedule === undefined) return null
  const drawnGroupIds = new Set(session.rowBoxes.map((placed) => placed.groupId))
  const uids = new Set<number>()
  for (const member of schedule.taskGroupMembers) {
    if (drawnGroupIds.has(member.groupId)) uids.add(member.taskUid)
  }
  return uids
}

// see FR-049, T-202
// TRAP: input-command-translator.ts holds this join reversed (VISIBLE_ELEMENT_BY_ENTRY);
// change both together, nothing checks that they agree.
const SETTINGS_KEY_BY_ROW: Readonly<Record<string, keyof DocumentSettings>> = {
  'IC-39': 'progressLineVisible',
  'IC-40': 'progressMarkerVisible',
  'IC-42': 'dateGridLinesVisible',
  'IC-43': 'groupGridLinesVisible',
  'IC-79': 'assigneeVisible',
  'IC-80': 'percentCompleteVisible',
  'IC-81': 'dependencyVisible',
}

/** @purity pure */
function isSettingsToggleOn(row: IconRosterRow, settings: DocumentSettings): boolean {
  const key = SETTINGS_KEY_BY_ROW[row.rowId]
  if (key === undefined) return false
  return settings[key] === true
}

// see FR-049, FR-053, FR-102
// STOP: spec does not decide whether a chosen exclusive entry draws on. Looked in T-237, FR-029
// @provisional PND-417
/** @purity pure */
function commandItemFor(
  row: IconRosterRow,
  selection: Selection,
  drawnTasks: ReadonlySet<number> | null,
  language: DisplayLanguage,
  armed: ArmedEntry,
  isRecording: boolean,
  settings: DocumentSettings,
): CommandItem {
  return {
    icon: row.rowId,
    isEnabled: isEntryUsable(row, selection, drawnTasks),
    isPressed:
      (row.rowId === INTERACTION_RECORD_ROW && isRecording) || isSettingsToggleOn(row, settings),
    isArmed: row.arms === armed.row && row.armsShape === armed.shape,
    label: entryLabel(row.rowId, language),
  }
}

/** @purity pure */
function isMilestoneGlyphEntry(row: IconRosterRow): boolean {
  if (!row.authority.includes(MILESTONE_GLYPH_REQUIREMENT)) return false
  return !MILESTONE_LIST_CONTROL_ROWS.includes(row.rowId)
}

/** @purity pure */
function isFoldedMilestoneGlyph(met: number): boolean {
  return met > NOT_STORED_COMMAND_PALETTE_SIZES['S-216']
}

// see T-109, FR-053
/** @purity pure */
function paletteGroups(
  selection: Selection,
  drawnTasks: ReadonlySet<number> | null,
  language: DisplayLanguage,
  isMilestoneListOpen: boolean,
  armed: ArmedEntry,
  isRecording: boolean,
  settings: DocumentSettings,
): readonly PaletteGroup[] {
  const groups: {
    readonly cell: string
    readonly firstRow: IconId
    readonly commands: CommandItem[]
  }[] = []

  let milestoneGlyphsMet = 0

  for (const row of iconRoster.icons) {
    if (!row.surfaces.includes(COMMAND_PALETTE)) continue
    if (NOT_BUTTON_ROWS.includes(row.rowId)) continue

    const cell = row.group
    if (cell === null) continue

    // TRAP: a folded row must still open its group; the group's word is keyed by its first row.
    const opened = groups.find((group) => group.cell === cell)
    const group = opened ?? { cell, firstRow: row.rowId, commands: [] }
    if (opened === undefined) groups.push(group)

    // TRAP: count every glyph row, folded or not, or an entry folds after the list opens and closes.
    if (isMilestoneGlyphEntry(row)) {
      milestoneGlyphsMet += 1
      if (isFoldedMilestoneGlyph(milestoneGlyphsMet) && !isMilestoneListOpen) continue
    }
    group.commands.push(
      commandItemFor(row, selection, drawnTasks, language, armed, isRecording, settings),
    )
  }

  return groups
    .filter((group) => group.commands.length > 0)
    .map((group) => ({
      name: groupName(group.cell, group.firstRow, language),
      commands: group.commands,
    }))
}

interface ArmedEntry {
  readonly row: string
  readonly shape: string | null
}

// see T-023b
/** @purity pure */
function armedEntry(armed: ScreenState['armed']): ArmedEntry {
  switch (armed.kind) {
    case 'none':
      return { row: 'AR-1', shape: null }
    case 'taskShape':
      return { row: 'AR-2', shape: armed.shapeKind }
    case 'milestoneShape':
      return { row: 'AR-3', shape: armed.glyph }
    case 'dependency':
      return { row: 'AR-4', shape: null }
    case 'commentBox':
      return { row: 'AR-5', shape: null }
    case 'highlightBox':
      return { row: 'AR-6', shape: null }
  }
}

// see FR-038, FR-053
// STOP: spec does not decide what an arm with no word says. Looked in T-023b, FR-038
// @provisional PND-221
/** @purity pure */
function armedWord(armed: ScreenState['armed'], language: DisplayLanguage): string {
  const word = ARM_WORDS_BY_ROW.get(armedEntry(armed).row)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/** @purity pure */
function minimiseRow(): IconRosterRow {
  const row = iconRoster.icons.find((one) => one.rowId === MINIMISE_ROW)
  if (row === undefined) {
    throw new Error(`table T-109 no longer holds ${MINIMISE_ROW}, which FR-053 requires`)
  }
  return row
}

/** @purity pure */
function isRecordingInteractions(session: ScreenSession): boolean {
  return session.isRecordingInteractions === true
}

// see FR-053, S-99e
/** @purity pure */
export function commandPaletteFromScreenState(
  state: ScreenState,
  settings: DocumentSettings,
  selection: Selection,
  session: ScreenSession,
  schedule?: Schedule,
): CommandPalette | null {
  if (!state.paletteShown) return null

  const drawnTasks = drawnTaskUids(schedule, session)

  return {
    at: session.commandPaletteAt,
    grabBandHeight: NOT_STORED_COMMAND_PALETTE_SIZES['S-135a'],
    minimise: commandItemFor(
      minimiseRow(),
      selection,
      drawnTasks,
      session.language,
      armedEntry(state.armed),
      isRecordingInteractions(session),
      settings,
    ),
    isMinimised: session.isPaletteMinimised,
    groups: session.isPaletteMinimised
      ? []
      : paletteGroups(
          selection,
          drawnTasks,
          session.language,
          session.isMilestoneListOpen,
          armedEntry(state.armed),
          isRecordingInteractions(session),
          settings,
        ),
    armedText: session.isPaletteMinimised
      ? null
      : armedWord(state.armed, session.language),
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_COMMAND_PALETTE_SIZES: {
  readonly 'S-135a': number
  readonly 'S-216': number
} = {
  'S-135a': 24,
  'S-216': 6,
}
// </generated>
