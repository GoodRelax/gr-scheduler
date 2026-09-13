// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-65   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// Fills `ScreenView.commandPalette` only: the U-26 `Command Palette` of table
// T-103, with U-34's groups and commands. The signature is fixed by the "nine
// unit contracts" section of `screen-renderer.ts`.
//
// The place arrives as `ScreenSession.commandPaletteAt` (FR-053: the person
// drags it). No extent leaves here: the size follows the contents (FR-053) and
// is known only past IF-9. `grabBandHeight` (GR-19, S-135a) is how far the band
// reaches below that corner, not a size.
//
// Faintness is not answered here: FR-053 judges it by which part the pointer is
// on, which only the side that drew the parts knows (Chapter 5.3, IF-9). So
// `session.pointer` is not read.
//
// Entries and groups are read from the generated `icon-roster.json` (table
// T-109, FR-029) in the table's print order, never re-sorted (rule 03 section
// 4): the table returns to earlier groups, so another order would move entries
// out of their group.
//
// The group caption is not printed (FR-053), but its word is still resolved for
// the help (FR-036) and the group column still decides the order. The boundary
// rule between groups (S-143) is drawn by the surface: nothing points at it, so
// it carries no word, row or shape, and `groups` is already the boundary list.
//
// Milestone shapes past the first S-216 are offered only while the list is open
// (FR-053, S-142); folding changes which entries a group holds, never the groups.
//
// IC-53 and IC-54 are not entries (table T-109): they reach the screen as the
// grab band and as `armedText`.
//
// The armed entrance is marked by `isArmed`, never `isPressed` (FR-053). Table
// T-109's arm column names a KIND of arm (table T-023b) standing on several rows,
// so the roster's `armsShape` completes a 1-to-1 join. Not read from
// `input-command-translator.ts`'s own map: that is another component's internal
// unit (Chapter 5.3, LR-3 of table T-061).
//
// Nothing here judges a width, so FR-093's estimate is not called.

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

/** One row of the generated roster, so its shape is never written out here. */
type IconRosterRow = (typeof iconRoster.icons)[number]

/** U-26 of table T-103, as table T-109's surface column spells it (rule 03 section 1). */
const COMMAND_PALETTE = 'Command Palette'

/**
 * `FR-034` as table T-109's authority column writes it. Joined on that column,
 * not on row ids, so an alignment entry added later is covered without an edit.
 */
const ALIGN_REQUIREMENT = 'FR-034'

// STOP -- not carried by the generated roster: which rows of table T-109 are
// buttons. The table says it as prose in the entry column, so `icon-roster.json`
// has no field for it. Searched: table T-109 and the preamble of section 8 of
// `_assets/tbl-glossary.md`, FR-029, the note under figure F-019,
// `tools/generate_icon_roster.py` and `icon-roster.json`.
// Named by row id, the only join table T-109 admits; a future row of this kind
// has to be added here by hand.
const NOT_BUTTON_ROWS: readonly string[] = ['IC-53', 'IC-54']

/**
 * IC-75 of table T-109, the minimise toggle on the grab band (FR-053). It is a
 * button, so it is not in `NOT_BUTTON_ROWS`; it stays out of `groups` because
 * table T-109 gives it no group.
 */
const MINIMISE_ROW: IconId = 'IC-75'

/**
 * IC-76 of table T-109 (FR-102): its state S-206 rides on `ScreenSession`,
 * because FR-102 keeps it out of the document. Named by row id for the reason
 * `NOT_BUTTON_ROWS` gives.
 */
const INTERACTION_RECORD_ROW: IconId = 'IC-76'

/**
 * `FR-078` as table T-109's authority column writes it: the owner of the
 * milestone glyph entrances FR-053 folds. Joined on the column for the reason
 * `ALIGN_REQUIREMENT` gives; a new glyph arrives at the end of the order, which
 * is where a folded one belongs.
 */
const MILESTONE_GLYPH_REQUIREMENT = 'FR-078'

// STOP -- not carried by the generated roster: which row of table T-109 works
// the milestone list rather than sits in it (prose in the entry column). The
// authority column cannot tell it apart, since IC-50 carries `FR-078` too.
// Searched: table T-109, FR-053, FR-078, `tools/generate_icon_roster.py` and
// `icon-roster.json`. Named by row id, the only join that table admits.
const MILESTONE_LIST_CONTROL_ROWS: readonly string[] = ['IC-50']

/**
 * What an entry says while the dictionary holds no word for its row. An empty
 * cell means "not settled", not "print nothing".
 */
const NO_WORDS = ''

// Words come from `display-words.json`, generated from `_source/display-words.json`
// (FR-038, Chapter 6.2), keyed by row: table T-109 for entries and groups, table
// T-023b for arms, since neither table has an English column. The stand-ins
// below are reached only through a hand-edited generated file. Like `iconRoster`
// it is a compiled module constant, so UF-65 stays `pure`.

/**
 * Table T-109's words by row id, and group names by the first table T-109 row
 * in the group. `Map`s because a description is built every frame (NFR-013,
 * rule 05).
 */
const WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const GROUP_NAMES_BY_FIRST_ROW = new Map(
  displayWords.paletteGroups.map((entry) => [entry.firstRow, entry]),
)

/** Table T-023b's words by row id, which that table's closing rule keeps in the dictionary. */
const ARM_WORDS_BY_ROW = new Map(displayWords.arms.map((entry) => [entry.rowId, entry]))

/**
 * The accessible name of one entry (FR-038).
 *
 * `=== ''`, never `||` or `??`: an empty cell is unsettled, not a word. A row
 * missing from the dictionary altogether means a hand-edited generated file.
 *
 * @purity pure
 */
function entryLabel(icon: IconId, language: DisplayLanguage): string {
  const word = WORDS_BY_ROW.get(icon)?.label[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * The name of one palette group (FR-038).
 *
 * The stand-in is table T-109's group cell, not the empty string, since that
 * cell does hold a word (for `en` it is the Japanese cell, an accepted gap).
 * The caption is not printed (FR-053), but `PaletteGroup.name` still carries
 * the word the help lists entrances by (FR-036).
 *
 * The key is the first table T-109 row in the group, found by walking the
 * roster in order, so a reorder moves the key on both sides at once; the
 * specification gives a group no id. The dictionary key whose group's only
 * palette row is in `NOT_BUTTON_ROWS` is never asked for.
 *
 * @purity pure
 */
function groupName(groupCell: string, firstRow: string, language: DisplayLanguage): string {
  const word = GROUP_NAMES_BY_FIRST_ROW.get(firstRow)?.name[language]
  if (word === undefined) return groupCell
  return word === '' ? groupCell : word
}

/**
 * Whether an entry can be used; FR-029 draws faint the one that cannot.
 *
 * Only the alignment entries can be refused here: SL-7b of table T-023c needs an
 * ordered selection, and FR-034 lines tasks up against the last one picked, so
 * at least TWO tasks are needed (one alone is its own anchor; RS-34 of table
 * T-233). `input-command-translator.ts` makes the same reading, so the faint
 * entrance is the one that tells why. Every other entry stays usable.
 *
 * Counted on the drawn side (FR-029): `Selection` is not pruned when a fold, a
 * hiding or FR-018's depth limit takes a Task out of the picture. A `null`
 * `drawnTasks` means the picture was not handed over, and every chosen Task
 * counts, since a false faint tells the reader an entrance is broken; an empty
 * set means none of them is drawn.
 *
 * @purity pure
 */
function isEntryUsable(
  row: IconRosterRow,
  selection: Selection,
  drawnTasks: ReadonlySet<number> | null,
): boolean {
  if (!row.authority.includes(ALIGN_REQUIREMENT)) return true
  return (
    selection.ordered &&
    selection.items.filter(
      (item) => item.kind === 'task' && (drawnTasks === null || drawnTasks.has(item.uid)),
    ).length >= 2
  )
}

/**
 * The `Task.uid` of every Task the picture holds this frame.
 *
 * `ScreenSession.rowBoxes` is the rows the shell drew (folds, hiding and
 * FR-018's depth limit already applied), and `Schedule.taskGroupMembers` (ET-5)
 * says which row each Task sits in, the walk `schedule-layout.ts` makes. A Task
 * with no member row is not drawn and not counted.
 * Built once per frame, not per entry (NFR-013).
 *
 * @purity pure
 */
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

/**
 * The palette rows FR-049 turns into toggles over a boolean row of table T-202,
 * mapped to the `DocumentSettings` member that row names.
 *
 * The same join exists as `VISIBLE_ELEMENT_BY_ENTRY` in
 * `input-command-translator.ts`, in the opposite direction, and cannot be shared:
 * it is another component's internal unit (Chapter 5.3, LR-2 / LR-3 of table
 * T-061, check 26b). A row changed in one map must be carried to the other by
 * hand, and nothing checks that it was.
 * IC-4 is the App Header's (UF-62). IC-45, IC-47 and IC-48 are many-valued
 * (S-65 / S-66), not FR-049 toggles.
 */
const SETTINGS_KEY_BY_ROW: Readonly<Record<string, keyof DocumentSettings>> = {
  'IC-39': 'progressLineVisible',
  'IC-40': 'progressMarkerVisible',
  'IC-42': 'dateGridLinesVisible',
  'IC-43': 'groupGridLinesVisible',
  'IC-79': 'assigneeVisible',
  'IC-80': 'percentCompleteVisible',
  'IC-81': 'dependencyVisible',
}

/**
 * Whether one row's own boolean setting of table T-202 is ON, or `false` for
 * a row this component does not join to one (see `SETTINGS_KEY_BY_ROW`).
 *
 * @purity pure
 */
function isSettingsToggleOn(row: IconRosterRow, settings: DocumentSettings): boolean {
  const key = SETTINGS_KEY_BY_ROW[row.rowId]
  if (key === undefined) return false
  return settings[key] === true
}

/**
 * One row of table T-109 as it stands in the palette.
 *
 * `isPressed` reads `DocumentSettings` for the rows of `SETTINGS_KEY_BY_ROW`
 * (EN-2 of table T-237, FR-049) and `ScreenSession` for IC-76; no row is named by
 * both. IC-45, IC-47 and IC-48 read `false` (FR-049).
 * @provisional PND-417 -- an exclusive choice does NOT draw its own entrance
 * on here, because table T-237 holds no row meaning "this is the one now
 * chosen" and FR-029 (MUST) binds every fill to that table.
 * Arming is never folded into `isPressed` (FR-053); it is `isArmed`.
 *
 * @purity pure
 */
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
    // FR-102: IC-76 says whether the record runs. FR-049 / EN-2 of table T-237:
    // the `SETTINGS_KEY_BY_ROW` toggles are filled while their setting is ON.
    isPressed:
      (row.rowId === INTERACTION_RECORD_ROW && isRecording) || isSettingsToggleOn(row, settings),
    // FR-053: the arm column names a KIND, so `armsShape` completes the join.
    // No third condition on `row.arms === null`: `armedEntry` answers AR-1 while
    // nothing is armed, and no roster row carries AR-1. An arm whose shape no
    // entrance arms marks nothing.
    isArmed: row.arms === armed.row && row.armsShape === armed.shape,
    label: entryLabel(row.rowId, language),
  }
}

/**
 * One of the milestone shape entrances FR-078 owns, found by requirement rather
 * than row id, less the list control (`MILESTONE_LIST_CONTROL_ROWS`). Which of
 * them fold is `isFoldedMilestoneGlyph`'s.
 *
 * @purity pure
 */
function isMilestoneGlyphEntry(row: IconRosterRow): boolean {
  if (!row.authority.includes(MILESTONE_GLYPH_REQUIREMENT)) return false
  return !MILESTONE_LIST_CONTROL_ROWS.includes(row.rowId)
}

/**
 * Whether the `met`th milestone glyph entrance folds away while the list is
 * closed: FR-053 keeps the first S-216 on the palette.
 *
 * Counted in table T-109's order rather than named, since FR-053 points at
 * SH-5's area order. That the two orders agree is left to a test reading both
 * manuscripts, because a join here would have to name the glyphs (rule 03
 * section 1).
 *
 * Read from the generated block at the foot of the file, not a module constant
 * above it, which would read it before it is assigned.
 *
 * @purity pure
 */
function isFoldedMilestoneGlyph(met: number): boolean {
  return met > NOT_STORED_COMMAND_PALETTE_SIZES['S-216']
}

/**
 * The groups table T-109 places on the palette, in that table's order: a group
 * opens where its cell is first met and is appended to afterwards.
 *
 * A folded row still opens its group, because the group's dictionary key is the
 * first palette row in it (`groupName`); opening only on surviving rows would
 * move the key between the two fold states. Groups left empty are dropped,
 * since the surface draws a rule per boundary (S-143).
 *
 * Groups are gathered on the table's cell and named only at the end, because
 * two languages could spell two groups alike.
 *
 * @purity pure
 */
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

  // Glyph entrances met so far, counted over the roster in table T-109's order
  // and never over survivors: FR-053's boundary is a place in that order.
  let milestoneGlyphsMet = 0

  for (const row of iconRoster.icons) {
    if (!row.surfaces.includes(COMMAND_PALETTE)) continue
    if (NOT_BUTTON_ROWS.includes(row.rowId)) continue

    // A palette row with no group is dropped: IC-75 has none because FR-053 puts
    // it on the grab band (`minimise`). Minting a group here would coin a name
    // section 8 of `_assets/tbl-glossary.md` refuses.
    const cell = row.group
    if (cell === null) continue

    const opened = groups.find((group) => group.cell === cell)
    const group = opened ?? { cell, firstRow: row.rowId, commands: [] }
    if (opened === undefined) groups.push(group)

    // FR-053: glyph entrances past the first S-216 wait for the list. The count
    // moves on every glyph row, folded or not and whether or not the list is
    // open; counting only drawn ones would fold an entrance once the list had
    // been opened and closed.
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

/**
 * What the palette has armed, as the roster spells it: the table T-023b row, and
 * the shape or glyph where that row stands against several entrances. `shape`
 * is `null` for AR-1 and AR-4 to AR-6, matching the roster's own `null`.
 */
interface ArmedEntry {
  /** A row of table T-023b, AR-1 to AR-6. */
  readonly row: string
  /** A `TaskVisual.shapeKind` or `TaskVisual.milestoneGlyph` spelling. */
  readonly shape: string | null
}

/**
 * The table T-023b row the palette has armed, with the shape inside it: the key
 * `armedWord` looks words up by, never itself printed (table T-023b).
 *
 * A switch, not a lookup, so an arm added to `ScreenState.armed` stops it
 * compiling. Row and shape stay two members because they come from two columns
 * of two tables, and one key would need an invented separator.
 *
 * @purity pure
 */
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

/**
 * What the palette has armed, in words (FR-038, FR-053).
 *
 * The row id is not the fall-back (table T-023b forbids printing it), and table
 * T-023b has no fall-back row (unlike RS-15 or QN-8). `=== ''` for the reason
 * `entryLabel` gives. What an arm with no word says is not settled, so the empty
 * string stands in as the one thing neither rule forbids; both branches are
 * reachable only through a hand-edited generated file.
 *
 * @provisional PND-221
 * @purity pure
 */
function armedWord(armed: ScreenState['armed'], language: DisplayLanguage): string {
  const word = ARM_WORDS_BY_ROW.get(armedEntry(armed).row)?.text[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/**
 * The roster's own row for IC-75, never built here (that would copy table
 * T-109). Throws rather than falling back: a palette without its minimise toggle
 * would break FR-053 silently.
 *
 * @purity pure
 */
function minimiseRow(): IconRosterRow {
  const row = iconRoster.icons.find((one) => one.rowId === MINIMISE_ROW)
  if (row === undefined) {
    throw new Error(`table T-109 no longer holds ${MINIMISE_ROW}, which FR-053 requires`)
  }
  return row
}

/**
 * S-206 of table T-206 as `ScreenSession` reports it; absent means not
 * recording. One function, so no second call reads it the other way round.
 *
 * @purity pure
 */
function isRecordingInteractions(session: ScreenSession): boolean {
  return session.isRecordingInteractions === true
}

/**
 * The floating palette this frame, or `null` while S-99e says it is hidden.
 *
 * `null` is the only spelling of hidden; an empty palette is never a second one
 * (EP-11 of table T-076 reads the closed palette the same way). `settings` is
 * forwarded so `commandItemFor` can read EN-2 of table T-237.
 *
 * @purity pure
 */
export function commandPaletteFromScreenState(
  state: ScreenState,
  settings: DocumentSettings,
  selection: Selection,
  session: ScreenSession,
  schedule?: Schedule,
): CommandPalette | null {
  if (!state.paletteShown) return null

  // FR-029: counted on the drawn side, once for the whole palette, and read by
  // `isEntryUsable` alone.
  const drawnTasks = drawnTaskUids(schedule, session)

  // The corner is passed through untouched and no size is carried (FR-053).
  // The grab band is described whenever the palette is: GR-19 has no condition.
  return {
    at: session.commandPaletteAt,
    // GR-19 of table T-023d, height S-135a, read from the generated block at the
    // foot of the file (a module constant above it would read it unassigned).
    grabBandHeight: NOT_STORED_COMMAND_PALETTE_SIZES['S-135a'],
    // FR-053: glyphs past the first S-216 wait for the list (S-142, held by the
    // shell); the armed row and shape go down for `isArmed`, not the words.
    // FR-053: the minimise toggle rides on the band, in both states.
    minimise: commandItemFor(
      minimiseRow(),
      selection,
      // IC-75 is no FR-034 row, so `isEntryUsable` answers true; passed so that
      // one place names the row.
      drawnTasks,
      session.language,
      armedEntry(state.armed),
      // IC-75 is not IC-76, so this reads false; passed for the same reason.
      isRecordingInteractions(session),
      // IC-75 is not a `SETTINGS_KEY_BY_ROW` key either; same reason.
      settings,
    ),
    isMinimised: session.isPaletteMinimised,
    // FR-053: minimised shows the grab band alone, so the entries and the armed
    // reading are withdrawn. An empty list is not how hidden is said (`null` is).
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
    // FR-053: the armed words from FR-038's dictionary, keyed by the table T-023b
    // row, never the row id. `null` while minimised, so the drawing side lays
    // nothing out.
    armedText: session.isPaletteMinimised
      ? null
      : armedWord(state.armed, session.language),
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands instead of being handed
 * it: the contract in screen-renderer.ts fixes UF-61 at three
 * arguments, and FR-051 (MUST NOT) forbids a setting to hold the
 * value either -- so there is no door to pass it through. ⛔ It is
 * still not a document setting and must not become one.
 */
export const NOT_STORED_COMMAND_PALETTE_SIZES: {
  /** S-135a, in px */
  readonly 'S-135a': number
  /** S-216 */
  readonly 'S-216': number
} = {
  'S-135a': 24,
  'S-216': 6,
}
// </generated>
