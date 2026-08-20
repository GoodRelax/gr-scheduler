// Unit tests for `appHeaderItemsFromDocument` (unit UF-62 of table T-075,
// component CP-37 of table T-062, `app-header-items.ts`).
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, and the declarations a tester may read -- the head comment and the
// signature of `app-header-items.ts`, the "nine unit contracts" section of
// `screen-renderer.ts` which fixes that signature, and the entity types the
// four arguments are made of. No expected value here was taken from how the
// unit computes its answer.
//
// The rules these cases answer to:
//   AT-3     (table T-058) `Project.title` is the `Document Title` (U-27) and
//            is nullable
//   FR-035   `Untitled` is fixed for the BROWSER TAB (MUST), and the empty
//            string is refused as a title (MUST NOT). Neither rule asks the
//            header to substitute anything
//   FR-038   the document's own value is not translated; menus and panels are
//            shown in the chosen language (MUST); the language is kept out of
//            the document (MUST NOT)
//   FR-061   the three autosave states are told apart (MUST) and the time rides
//            with `saved`
//   FR-029   the roster of icons AND the placement of each follow table T-109
//            (MUST); one function may not have two entries on the screen
//            (MUST NOT); what cannot be used is drawn faint rather than going
//            quiet, so `isEnabled: false` is a claim that pressing the entry
//            achieves nothing
//   T-109    the whole of the icons. Its surface column IS the placement, and the
//            table counts itself -- so the roster below is a fixed copy of that
//            column's `App Header` rows, in the table's own printed order
//   FR-049   the three values of S-59, and the MUST NOT that forbids hiding
//            both halves
//   FR-015   the overlay of the plan before the change (S-69), which IC-4 shows
//            and hides
//   FR-053   the entry that shows and hides the palette sits OUTSIDE the
//            palette (MUST); S-99e holds whether it is shown
//   FR-071   full screen is entered and left by the same entry (S-99f)
//   FR-072   which of the two the properties panel is showing is told by the
//            pressed state (MUST)
//   FR-065   while the `Agent API` is on, that it is on is shown (MUST)
//   FR-066   the dialogue field is up only while the `Agent API` is on
//   T-075    the UF-62 row: `pure`, and the four things it names -- the
//            `Document Title` (FR-035), the `Autosave Status` (FR-061), the
//            `Agent API` being on (FR-065) and the display-language entry
//            (FR-038)
//   R7.1     `pure` in table T-075, so the unit may neither write to what it
//            was handed nor answer differently to the same arguments
//
// Chapter 1.9 asks a test of a requirement that points at a table to be driven
// by a fixed copy of that table. T_109_APP_HEADER and S_59_ROWS below are those
// copies; nothing here re-reads the manuscript, and nothing re-reads the
// generated roster the unit itself is built from -- reading that would test the
// generator against itself rather than the table against the code.
//
// FIVE THINGS THIS FILE DELIBERATELY DOES NOT ASSERT, each searched for before
// being given up on:
//
//   1. The words of `CommandItem.label`. FR-038 requires menus and panels in
//      the chosen language and names no store of translated strings; W-5 of
//      table T-006a settles only the NOTATION of an i18n key; table T-109 has
//      no English column and says why; table T-103's Japanese column is prose
//      about the part, not screen text; `_assets/tbl-settings.md` holds no row
//      for any wording. So no case here reads `label`.
//   2. Whether IC-21 (the display-language entry) reports the CURRENT language.
//      FR-038 states that as a MUST and table T-075 puts the display-language
//      entry in this unit's row -- but no member of `CommandItem` can carry a
//      choice between two values: `isPressed` is declared as a toggle that is
//      on, and neither `ja` nor `en` is the off side. The same hole stands for
//      IC-16 (S-72, light/dark). Reported as a gap rather than asserted, since
//      any assertion would settle a reading no requirement states.
//   3. Whether IC-1, IC-5 and IC-6 are faint. OP-8 of table T-024a refuses an
//      open while an import or another open is under way (MUST NOT), and an
//      undo with an empty history achieves nothing -- but none of the four
//      arguments carries either fact, and no requirement writes the faintness
//      out. Every input a case can build is therefore "nothing under way", and
//      the cases assert only that.
//   4. Whether IC-12 .. IC-15 are faint at the end of the zoom travel. FR-018
//      states no rule for the entries, and the bounds S-97 / S-98 name (figures
//      at S-54 / S-55) are rows table T-206 keeps out of the document, so
//      nothing generated into `src/` holds them.
//   5. Whether IC-4 is faint while the document holds no overlay. FR-015 makes
//      the document carry what is overlaid, but no requirement conditions the
//      toggle on what the overlay would contain. The overlay cases below
//      therefore assert `isPressed` alone.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  screenStateWithFullScreen,
  screenStateWithPalette,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import type {
  AppHeaderItems,
  AutosaveStatus,
  CommandItem,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { appHeaderItemsFromDocument } from '../../src/adapter/screen-renderer/app-header-items'

// ---------------------------------------------------------------------------
// Fixed copies of the specification the cases are driven by (Chapter 1.9).
// ---------------------------------------------------------------------------

/**
 * Table T-109 -- every row whose surface column reads `App Header`, in the table's
 * own printed order.
 *
 * FR-029 (MUST) makes both the roster and the placement follow this table, and
 * rule 03 section 3 of docs/development-rules keeps the printed order as the
 * code's order. The count is the table's own: FR-029 forbids even the
 * requirement to state it, so no case below writes a number.
 */
const T_109_APP_HEADER = [
  'IC-1',
  'IC-2',
  'IC-3',
  'IC-4',
  'IC-5',
  'IC-6',
  'IC-7',
  'IC-8',
  'IC-9',
  'IC-10',
  'IC-11',
  'IC-12',
  'IC-13',
  'IC-14',
  'IC-15',
  'IC-16',
  'IC-17',
  'IC-18',
  'IC-19',
  'IC-20',
  'IC-21',
  'IC-22',
] as const

/**
 * Rows of table T-109 placed on some OTHER surface. None of them may reach the
 * header: that column is the placement FR-029 makes a MUST.
 *
 * IC-52 is the modals', IC-53 / IC-54 and IC-23 are the `Command Palette`'s,
 * IC-55 .. IC-57 are the `Autosave Status`'s and IC-58 .. IC-60 are the
 * `Row Title Panel`'s. The table marks IC-53 .. IC-57 "not a button" as well,
 * so they could not be `CommandItem`s even on their own surface.
 */
const T_109_ELSEWHERE = [
  'IC-23',
  'IC-52',
  'IC-53',
  'IC-54',
  'IC-55',
  'IC-56',
  'IC-57',
  'IC-58',
  'IC-59',
  'IC-60',
  'IC-61',
] as const

/** The rows of table T-109 whose entry a requirement keys a state on. */
const IC_BASELINE_OVERLAY = 'IC-4'
const IC_COMMAND_PALETTE = 'IC-7'
const IC_PLAN = 'IC-8'
const IC_ACTUAL = 'IC-9'
const IC_FULL_SCREEN = 'IC-11'
const IC_DOCUMENT_SETTINGS = 'IC-17'
const IC_DIALOGUE_FIELD = 'IC-18'
const IC_AGENT_API = 'IC-20'

/**
 * The App Header rows table T-109 keys no state on at all -- it writes neither
 * a show-and-hide entry nor a settings key against them, so there is no toggle that
 * could be on. IC-16 and IC-21 are absent on purpose: both are a choice between
 * two values, which is note 2 of the head comment.
 */
const T_109_APP_HEADER_ACTIONS = [
  'IC-1',
  'IC-2',
  'IC-3',
  'IC-5',
  'IC-6',
  'IC-10',
  'IC-12',
  'IC-13',
  'IC-14',
  'IC-15',
  'IC-19',
  'IC-22',
] as const

/**
 * S-59 of table T-202, with what FR-049 makes each value mean for the two
 * halves. The three values are the row's own, spelled through the generated
 * `DocumentSettings` type so that a change to S-59 fails the compiler.
 *
 * `isEnabled` is NOT a column here: FR-049's MUST NOT ("both halves may not be
 * hidden") is what decides it, and the cases derive it from the OTHER half
 * rather than restating it.
 */
const S_59_ROWS: readonly {
  readonly value: DocumentSettings['planActualDisplay']
  readonly isPlanShown: boolean
  readonly isActualShown: boolean
}[] = [
  { value: 'both', isPlanShown: true, isActualShown: true },
  { value: 'plan-only', isPlanShown: true, isActualShown: false },
  { value: 'actual-only', isPlanShown: false, isActualShown: true },
]

/** S-99 (table T-206). FR-038 admits exactly these two. */
const S_99_LANGUAGES: readonly ScreenSession['language'][] = ['ja', 'en']

/** FR-061 (MUST): the three states that have to be told apart. */
const FR_061_STATES: readonly AutosaveStatus[] = [
  { kind: 'saved', at: '2026-08-19T04:05:06Z' },
  { kind: 'saving' },
  { kind: 'failed' },
]

// ---------------------------------------------------------------------------
// Inputs. A whole DocumentSettings is 100+ keys, so a case pins the ones it
// means and everything else comes from SETTINGS_DEFAULTS, which is generated
// from the manuscript -- rule 03 section 1 forbids re-typing a value the
// specification holds.
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({})

/**
 * A document whose only member any requirement points this unit at is
 * `project.title` (AT-3). Everything else is empty, so a case that adds one
 * row or one overlaid task is adding the only difference there is.
 */
const scheduleOf = (title: string | null, part: Partial<Schedule> = {}): Schedule =>
  ({
    project: { title },
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
    ...part,
  }) as unknown as Schedule

const UNNAMED = scheduleOf(null)

/** One overlaid task, so that FR-015's overlay has something in it (see note 5). */
const WITH_OVERLAY = scheduleOf(null, {
  baselineTasks: [{ uid: 1, name: null, start: null, finish: null, milestone: null }],
})

const STATE: ScreenState = emptyScreenState()

/**
 * Every member of `ScreenSession` is spelled out, so that a case which means to
 * vary one of them varies exactly one. The `Agent API` is off here because
 * FR-065 makes turning it on the reader's own act.
 */
const SESSION: ScreenSession = {
  language: 'ja',
  autosave: { kind: 'saving' },
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
}

const sessionWith = (part: Partial<ScreenSession>): ScreenSession => ({ ...SESSION, ...part })

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

const itemsOf = (
  schedule: Schedule = UNNAMED,
  settings: DocumentSettings = SETTINGS,
  state: ScreenState = STATE,
  session: ScreenSession = SESSION,
): AppHeaderItems => appHeaderItemsFromDocument(schedule, settings, state, session)

const iconsOf = (items: AppHeaderItems): readonly string[] =>
  items.commands.map((command) => command.icon)

const commandFor = (items: AppHeaderItems, icon: string): CommandItem => {
  const found = items.commands.filter((command) => command.icon === icon)
  expect(found).toHaveLength(1)
  return found[0] as CommandItem
}

/** The entries this unit claims achieve nothing, in the roster's order. */
const faintIconsOf = (items: AppHeaderItems): readonly string[] =>
  items.commands.filter((command) => !command.isEnabled).map((command) => command.icon)

// ---------------------------------------------------------------------------
// U-27 `Document Title` -- AT-3, FR-035, FR-038.
// ---------------------------------------------------------------------------

describe('UF-62 documentTitle', () => {
  it('carries Project.title through untouched (AT-3)', () => {
    expect(itemsOf(scheduleOf('Line 3 relocation')).documentTitle).toBe('Line 3 relocation')
  })

  it('leaves a title that has none as null (AT-3 admits it, FR-035 fixes Untitled for the tab)', () => {
    expect(itemsOf(scheduleOf(null)).documentTitle).toBeNull()
  })

  it('never substitutes the browser tab\'s Untitled (FR-035 writes that MUST for the tab)', () => {
    for (const title of [null, '']) {
      expect(itemsOf(scheduleOf(title)).documentTitle).not.toBe('Untitled')
    }
  })

  it('does not translate the document\'s own value (FR-038)', () => {
    const titles = S_99_LANGUAGES.map(
      (language) => itemsOf(scheduleOf('Kanji Title'), SETTINGS, STATE, sessionWith({ language })).documentTitle,
    )
    expect(new Set(titles).size).toBe(1)
    expect(titles[0]).toBe('Kanji Title')
  })

  it('does not read the rest of the document', () => {
    const withRows = scheduleOf('same', {
      baselineTasks: [{ uid: 9, name: 'a', start: null, finish: null, milestone: null }],
    })
    expect(itemsOf(withRows).documentTitle).toBe(itemsOf(scheduleOf('same')).documentTitle)
  })
})

// ---------------------------------------------------------------------------
// U-28 `Autosave Status` -- FR-061.
// ---------------------------------------------------------------------------

describe('UF-62 autosaveStatus', () => {
  it('carries each of the three states whole (FR-061, MUST)', () => {
    for (const autosave of FR_061_STATES) {
      expect(itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ autosave }))).toMatchObject({
        autosaveStatus: autosave,
      })
    }
  })

  it('keeps the three apart (FR-061, MUST)', () => {
    const kinds = FR_061_STATES.map(
      (autosave) => itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ autosave })).autosaveStatus.kind,
    )
    expect(new Set(kinds).size).toBe(FR_061_STATES.length)
  })

  it('carries the time the saved state rides with, rather than making one (CS-1: a pure unit has no clock)', () => {
    const at = '1999-12-31T23:59:59Z'
    const status = itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ autosave: { kind: 'saved', at } }))
      .autosaveStatus
    expect(status).toEqual({ kind: 'saved', at })
  })

  it('does not read the display language (FR-038 translates menus and panels, not a clock reading)', () => {
    const at = '2026-01-02T03:04:05Z'
    const shown = S_99_LANGUAGES.map(
      (language) =>
        itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ language, autosave: { kind: 'saved', at } }))
          .autosaveStatus,
    )
    expect(shown[0]).toEqual(shown[1])
  })
})

// ---------------------------------------------------------------------------
// U-35 `Header Commands` -- the roster itself. FR-029 and table T-109.
// ---------------------------------------------------------------------------

describe('UF-62 commands: the roster and its order', () => {
  it('is exactly the App Header rows of table T-109, in that table\'s order (FR-029, MUST)', () => {
    expect(iconsOf(itemsOf())).toEqual([...T_109_APP_HEADER])
  })

  it('carries no row placed on another surface (the surface column is the placement)', () => {
    const shown = new Set(iconsOf(itemsOf()))
    for (const icon of T_109_ELSEWHERE) {
      expect(shown.has(icon)).toBe(false)
    }
  })

  it('gives one function one entry (FR-029, MUST NOT)', () => {
    const icons = iconsOf(itemsOf())
    expect(new Set(icons).size).toBe(icons.length)
  })

  it('keeps the same roster whatever the document holds', () => {
    expect(iconsOf(itemsOf(WITH_OVERLAY))).toEqual(iconsOf(itemsOf(scheduleOf('named'))))
  })

  it('keeps the same roster in both display languages (FR-038 changes the words, not the roster)', () => {
    const rosters = S_99_LANGUAGES.map((language) =>
      iconsOf(itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ language }))),
    )
    expect(rosters[0]).toEqual(rosters[1])
  })

  it('keeps the same roster whatever is switched on', () => {
    const everything = itemsOf(
      WITH_OVERLAY,
      settingsOf({ baselineVisible: true, planActualDisplay: 'actual-only' }),
      screenStateWithFullScreen(screenStateWithPalette(STATE, false), true),
      sessionWith({ isAgentApiEnabled: true, propertiesShowing: 'documentSettings' }),
    )
    expect(iconsOf(everything)).toEqual([...T_109_APP_HEADER])
  })
})

// ---------------------------------------------------------------------------
// IC-8 / IC-9 -- FR-049 and S-59 of table T-202.
// ---------------------------------------------------------------------------

describe('UF-62 IC-8 / IC-9: the plan and the actual (FR-049, S-59)', () => {
  const itemsAt = (value: DocumentSettings['planActualDisplay']): AppHeaderItems =>
    itemsOf(UNNAMED, settingsOf({ planActualDisplay: value }))

  it('presses each entry exactly while its own half is drawn', () => {
    for (const row of S_59_ROWS) {
      const items = itemsAt(row.value)
      expect(commandFor(items, IC_PLAN).isPressed).toBe(row.isPlanShown)
      expect(commandFor(items, IC_ACTUAL).isPressed).toBe(row.isActualShown)
    }
  })

  it('never lets both halves be hidden (FR-049, MUST NOT)', () => {
    for (const row of S_59_ROWS) {
      const items = itemsAt(row.value)
      const shown = [commandFor(items, IC_PLAN), commandFor(items, IC_ACTUAL)].filter(
        (command) => command.isPressed,
      )
      expect(shown.length).toBeGreaterThan(0)
    }
  })

  it('faints the entry that would hide the last drawn half (FR-049 MUST NOT, through FR-029)', () => {
    for (const row of S_59_ROWS) {
      const items = itemsAt(row.value)
      expect(commandFor(items, IC_PLAN).isEnabled).toBe(row.isActualShown)
      expect(commandFor(items, IC_ACTUAL).isEnabled).toBe(row.isPlanShown)
    }
  })

  it('leaves both usable while both halves are drawn', () => {
    const items = itemsAt('both')
    expect(commandFor(items, IC_PLAN).isEnabled).toBe(true)
    expect(commandFor(items, IC_ACTUAL).isEnabled).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// The remaining entries a requirement keys a state on.
// ---------------------------------------------------------------------------

describe('UF-62 IC-4: the overlay of the plan before the change (FR-049 through FR-015, S-69)', () => {
  it('presses exactly while the overlay is drawn', () => {
    for (const baselineVisible of [true, false]) {
      const items = itemsOf(WITH_OVERLAY, settingsOf({ baselineVisible }))
      expect(commandFor(items, IC_BASELINE_OVERLAY).isPressed).toBe(baselineVisible)
    }
  })

  it('reads S-69 and not what the overlay holds', () => {
    const empty = itemsOf(UNNAMED, settingsOf({ baselineVisible: true }))
    expect(commandFor(empty, IC_BASELINE_OVERLAY).isPressed).toBe(true)
  })
})

describe('UF-62 IC-7: the command palette (FR-053, S-99e)', () => {
  it('presses exactly while the palette is shown', () => {
    for (const paletteShown of [true, false]) {
      const items = itemsOf(UNNAMED, SETTINGS, screenStateWithPalette(STATE, paletteShown))
      expect(commandFor(items, IC_COMMAND_PALETTE).isPressed).toBe(paletteShown)
    }
  })

  it('keeps the entry outside the palette and usable while the palette is hidden (FR-053, MUST)', () => {
    const hidden = itemsOf(UNNAMED, SETTINGS, screenStateWithPalette(STATE, false))
    expect(commandFor(hidden, IC_COMMAND_PALETTE).isEnabled).toBe(true)
  })
})

describe('UF-62 IC-11: full screen (FR-071, S-99f)', () => {
  it('presses exactly while the view is full screen', () => {
    for (const fullScreen of [true, false]) {
      const items = itemsOf(UNNAMED, SETTINGS, screenStateWithFullScreen(STATE, fullScreen))
      expect(commandFor(items, IC_FULL_SCREEN).isPressed).toBe(fullScreen)
    }
  })

  it('is the one entry that also leaves full screen, so it stays usable inside it (FR-071)', () => {
    const inside = itemsOf(UNNAMED, SETTINGS, screenStateWithFullScreen(STATE, true))
    expect(commandFor(inside, IC_FULL_SCREEN).isEnabled).toBe(true)
  })
})

describe('UF-62 IC-17: what the properties panel is showing (FR-072, MUST)', () => {
  it('presses only for the document settings', () => {
    const showing: readonly ScreenSession['propertiesShowing'][] = [
      'documentSettings',
      'selection',
      null,
    ]
    const pressed = showing.map(
      (propertiesShowing) =>
        commandFor(itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ propertiesShowing })), IC_DOCUMENT_SETTINGS)
          .isPressed,
    )
    expect(pressed).toEqual([true, false, false])
  })

  it('stays usable while the panel is closed, since the entry is what opens it (FR-072)', () => {
    const closed = itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ propertiesShowing: null }))
    expect(commandFor(closed, IC_DOCUMENT_SETTINGS).isEnabled).toBe(true)
  })
})

describe('UF-62 IC-20: the Agent API (FR-065, MUST)', () => {
  it('shows on the screen that the Agent API is on', () => {
    for (const isAgentApiEnabled of [true, false]) {
      const items = itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ isAgentApiEnabled }))
      expect(commandFor(items, IC_AGENT_API).isPressed).toBe(isAgentApiEnabled)
    }
  })

  it('stays usable both ways, since the same entry turns it off (table T-109 IC-20)', () => {
    for (const isAgentApiEnabled of [true, false]) {
      const items = itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ isAgentApiEnabled }))
      expect(commandFor(items, IC_AGENT_API).isEnabled).toBe(true)
    }
  })
})

describe('UF-62 IC-18: the dialogue field (FR-066)', () => {
  it('follows the Agent API, which is the only condition FR-066 states for the field', () => {
    for (const isAgentApiEnabled of [true, false]) {
      const entry = commandFor(
        itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ isAgentApiEnabled })),
        IC_DIALOGUE_FIELD,
      )
      expect(entry.isPressed).toBe(isAgentApiEnabled)
      expect(entry.isEnabled).toBe(isAgentApiEnabled)
    }
  })

  it('is a second entry for the field and not for the Agent API (FR-029, MUST NOT)', () => {
    const off = itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ isAgentApiEnabled: false }))
    expect(commandFor(off, IC_DIALOGUE_FIELD).isEnabled).toBe(false)
    expect(commandFor(off, IC_AGENT_API).isEnabled).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// What is faint, and what is not. FR-029.
// ---------------------------------------------------------------------------

describe('UF-62 faintness is a claim, not a default (FR-029)', () => {
  it('faints nothing beyond what the requirements settle, with the Agent API on', () => {
    const on = itemsOf(UNNAMED, SETTINGS, STATE, sessionWith({ isAgentApiEnabled: true }))
    expect(faintIconsOf(on)).toEqual([])
  })

  it('faints only the dialogue field while the Agent API is off (FR-066)', () => {
    expect(faintIconsOf(itemsOf())).toEqual([IC_DIALOGUE_FIELD])
  })

  it('faints only the half that may not be hidden, and the dialogue field', () => {
    const planOnly = itemsOf(UNNAMED, settingsOf({ planActualDisplay: 'plan-only' }))
    expect(faintIconsOf(planOnly)).toEqual([IC_PLAN, IC_DIALOGUE_FIELD])

    const actualOnly = itemsOf(UNNAMED, settingsOf({ planActualDisplay: 'actual-only' }))
    expect(faintIconsOf(actualOnly)).toEqual([IC_ACTUAL, IC_DIALOGUE_FIELD])
  })

  it('does not faint an entry because the document is empty', () => {
    const withRows = itemsOf(WITH_OVERLAY)
    expect(faintIconsOf(itemsOf(UNNAMED))).toEqual(faintIconsOf(withRows))
  })
})

describe('UF-62 the entries table T-109 keys no state on', () => {
  it('reports none of them as a toggle that is on', () => {
    const items = itemsOf()
    for (const icon of T_109_APP_HEADER_ACTIONS) {
      expect(commandFor(items, icon).isPressed).toBe(false)
    }
  })

  it('leaves them alone when a state that is not theirs moves', () => {
    const before = itemsOf()
    const after = itemsOf(
      WITH_OVERLAY,
      settingsOf({ baselineVisible: true, planActualDisplay: 'actual-only' }),
      screenStateWithFullScreen(screenStateWithPalette(STATE, false), true),
      sessionWith({ isAgentApiEnabled: true, propertiesShowing: 'documentSettings' }),
    )
    for (const icon of T_109_APP_HEADER_ACTIONS) {
      expect(commandFor(after, icon)).toEqual(commandFor(before, icon))
    }
  })
})

// ---------------------------------------------------------------------------
// R7.1 -- table T-075 makes this unit `pure`.
// ---------------------------------------------------------------------------

describe('UF-62 purity (R7.1, table T-075)', () => {
  it('answers the same to the same arguments', () => {
    expect(itemsOf()).toEqual(itemsOf())
  })

  it('writes to nothing it was handed', () => {
    const schedule = scheduleOf('kept', {
      baselineTasks: [{ uid: 3, name: null, start: null, finish: null, milestone: null }],
    })
    const settings = settingsOf({ planActualDisplay: 'plan-only', baselineVisible: true })
    const state = screenStateWithPalette(STATE, false)
    const session = sessionWith({ isAgentApiEnabled: true, propertiesShowing: 'selection' })

    const before = structuredClone({ schedule, settings, state, session })
    appHeaderItemsFromDocument(schedule, settings, state, session)

    expect({ schedule, settings, state, session }).toEqual(before)
  })
})
