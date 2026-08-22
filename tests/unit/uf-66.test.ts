// Unit tests for `openModalFromScreenState` (unit UF-66 of table T-075,
// component CP-37 of table T-062, which table T-064 publishes as PI-37).
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN AGAINST THE SPECIFICATION ALONE (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, `screen-renderer.ts` in full because it is the contract that fixes the
// signature and the shape of `OpenModal`, the entity types the inputs are built
// from, and the head comment plus the exported signature of `open-modals.ts`.
// No function body of the unit was read, and no expected value below comes from
// what the unit happens to produce.
//
// WHERE THE SPECIFICATION DECIDES NOTHING, NOTHING IS ASSERTED. Four questions
// have no answer in docs/spec, and no case here invents one:
//   * THE WORDS. FR-038 (MUST) shows menus and panels in the chosen language
//     and names no store of translated strings; table T-103 holds names, not
//     screen text, and section 8 of `_assets/tbl-glossary.md` refuses table
//     T-109 an English column because it would mint settled names the glossary
//     has not settled. So no case asserts a word -- one case asserts instead
//     that none was minted.
//   * THE ORDER two entries stand in on one surface. FR-029 (MUST) binds the
//     roster and the placement to table T-109 and says nothing of the order
//     within one surface, so every case below compares SETS of row ids.
//   * WHICH SURFACE FR-074 AND FR-088 OPEN. Table T-103 has settled no name for
//     either, so nothing this unit receives can tell one from the other and no
//     case can ask either for its contents.
//   * WHAT AN EMPTY NAME MEANS. S-99g's default is that none is open and `null`
//     is how `ScreenState` spells it; the specification gives no second
//     spelling, so the empty name is driven through the SAME oracle as every
//     other name (IN-4 by way of `escapeTarget`) rather than by a rule of its
//     own.
//
// The rules these cases answer to:
//   T-075 UF-66  `pure`, and the five requirements that open a surface --
//                FR-036 / FR-074 / FR-099 / FR-088 / FR-068
//   S-99g        one open surface, defaulting to none open (table T-206)
//   IN-4         a surface is what the first level of Esc closes (table T-028)
//   FR-029       the roster of icons AND its placement follow table T-109
//                (MUST); one entry for one function (MUST NOT), whose single
//                exception is the display language
//   FR-038       the language entry goes in two places, the top of the screen
//                and inside the help (MUST)
//   U-30 / U-49  the only settled surface names (table T-103)
//   FR-099       the roster shows the resources the document holds, and MUST
//                NOT reduce to a count what a deletion would unassign
//   R7.1         `pure`: rewriting an argument is a non-pure effect
//
// Chapter 1.9 asks a test of a requirement that points at a table to be driven
// by a fixed copy of that table. T_109_MODAL_PLACEMENTS and
// FR_038_SECOND_ENTRY below are that copy.

import { describe, expect, it } from 'vitest'

import type { Resource, Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptyScreenState,
  escapeTarget,
  screenStateWithSurface,
  type EscapeContext,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import type {
  CommandItem,
  DisplayLanguage,
  OpenModal,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { openModalFromScreenState } from '../../src/adapter/screen-renderer/open-modals'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * Table T-103 -- the settled surface names, spelling and all (rule 03 section
 * 1). U-30 settles two of them, U-49 a third and U-54 a fourth; the surfaces
 * FR-074 and FR-088 open have no row, which is why neither appears below.
 *
 * ⭐ U-54 was settled on 2026-08-21. Until then the surface FR-096 opens had no
 * name `ScreenState.surface` could hold, so IN-4's first level could not close
 * it -- and IC-52's surface column could not name it either.
 */
const U_30_HELP = 'Help Modal'
const U_30_AI_EXPORT = 'AI Export Modal'
const U_49_ROSTER = 'Resource Roster'
const U_54_EXPORT_CHOOSER = 'Export Chooser'

/**
 * Table T-109 -- every row whose surface column names a surface UF-66
 * describes. Section 8 of `_assets/tbl-glossary.md` makes that column table
 * T-103's settled names. IC-52 closes whichever of them is open, and the
 * roster FR-099 asks for carries six entries of its own.
 */
const T_109_MODAL_PLACEMENTS = [
  { row: 'IC-52', surfaces: [U_30_HELP, U_30_AI_EXPORT, U_49_ROSTER, U_54_EXPORT_CHOOSER] },
  { row: 'IC-63', surfaces: [U_49_ROSTER] },
  { row: 'IC-64', surfaces: [U_49_ROSTER] },
  { row: 'IC-65', surfaces: [U_49_ROSTER] },
  { row: 'IC-66', surfaces: [U_49_ROSTER] },
  { row: 'IC-67', surfaces: [U_49_ROSTER] },
  { row: 'IC-68', surfaces: [U_49_ROSTER] },
] as const

/**
 * The one placement the surface column of table T-109 does not carry. IC-21's
 * own note in that table calls it the only entry placed in two places, FR-038
 * (MUST) says the second place is inside the help, and FR-029 repeats that the
 * display language is its single exception.
 */
const FR_038_SECOND_ENTRY = { row: 'IC-21', surface: U_30_HELP } as const

/**
 * The row ids FR-029 (MUST) places on `surface`, as a set.
 *
 * Reading the answer out of the two copies above is what keeps the cases from
 * repeating the placement a third time.
 */
const iconsPlacedOn = (surface: string): readonly string[] => {
  const fromTable = T_109_MODAL_PLACEMENTS.filter((entry) =>
    (entry.surfaces as readonly string[]).includes(surface),
  ).map((entry) => entry.row)
  const fromRequirement = surface === FR_038_SECOND_ENTRY.surface ? [FR_038_SECOND_ENTRY.row] : []
  return [...fromRequirement, ...fromTable]
}

/**
 * Surfaces this unit is asked about. The last two carry no settled name: one
 * stands for the surfaces FR-074 and FR-088 open, the other for the empty name
 * `ScreenState.surface` admits without the specification giving it a meaning.
 */
const SURFACES_ASKED = [
  U_30_HELP,
  U_30_AI_EXPORT,
  U_49_ROSTER,
  U_54_EXPORT_CHOOSER,
  'a surface with no settled name',
  '',
]

// ---------------------------------------------------------------------------
// Inputs. UF-66 fills one member of `ScreenView` and reads none of the others,
// so every member below that a case does not mean is inert.
// ---------------------------------------------------------------------------

const surfaceState = (surface: string | null): ScreenState =>
  screenStateWithSurface(emptyScreenState(), surface)

const sessionOf = (language: DisplayLanguage = 'ja'): ScreenSession => ({
  language,
  autosave: { kind: 'saved', at: '2026-08-19T09:00:00Z' },
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  // The four members `ScreenSession` requires that no case here varies:
  // `iconUnderPointer` is EZ-2's place condition (`null` -- the pointer rests
  // on no icon), `selectedGroupIds` is FR-085's set of rows and
  // `selectedResourceUids` FR-099's set of resources (both empty -- none
  // chosen), and `propertiesSubject` is FR-072's remembered subject (`null` --
  // no operation has chosen one yet).
  iconUnderPointer: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
})

const resourceOf = (uid: number, name: string): Resource =>
  ({
    uid,
    name,
    resourceKind: null,
    isCostResource: null,
    calendarUid: null,
    carry: {},
    carryElements: [],
  }) as unknown as Resource

const scheduleOf = (part: Record<string, unknown> = {}): Schedule =>
  ({
    project: {
      id: null,
      name: null,
      title: null,
      subject: null,
      category: null,
      company: null,
      manager: null,
      author: null,
      created: null,
      revision: null,
      lastSaved: null,
      startDate: null,
      statusDate: null,
      minutesPerDay: null,
      minutesPerWeek: null,
      daysPerMonth: null,
      weekStartDay: null,
      calendarUid: null,
      themeHue: 214,
      uidHighWaterMark: 0,
      importSeq: 0,
      carry: {},
      carryElements: [],
    },
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

/** A document with nothing in it: every collection of DR-2 is empty. */
const EMPTY_DOCUMENT = scheduleOf()

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

/** Fails the case when no surface is described, so a case can go on reading. */
const describedOn = (surface: string | null, schedule: Schedule = EMPTY_DOCUMENT): OpenModal => {
  const modal = openModalFromScreenState(surfaceState(surface), schedule, sessionOf())
  expect(modal, `S-99g: a surface is open, so one is described`).not.toBeNull()
  return modal as OpenModal
}

const iconsOf = (modal: OpenModal): string[] => modal.commands.map((entry) => entry.icon).sort()

/** A word carries a letter or a digit; a separator or an empty string does not. */
const hasWord = (text: string): boolean => /[\p{L}\p{N}]/u.test(text)

/** Every string the description carries, whatever member it sits in. */
const wordsOf = (modal: OpenModal): string[] => [
  modal.heading,
  ...modal.commands.map((entry: CommandItem) => entry.label),
]

const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value
  for (const inner of Object.values(value as Record<string, unknown>)) deepFreeze(inner)
  return Object.freeze(value)
}

// ---------------------------------------------------------------------------

describe('UF-66 -- S-99g: one open surface, and none open by default', () => {
  it('describes nothing while S-99g says none is open', () => {
    // S-99g's default is that none is open, and `ScreenView.openModal` is
    // `null` for exactly that.
    expect(openModalFromScreenState(emptyScreenState(), EMPTY_DOCUMENT, sessionOf())).toBeNull()
    expect(openModalFromScreenState(surfaceState(null), EMPTY_DOCUMENT, sessionOf())).toBeNull()
  })

  it('describes at most one surface, because S-99g holds one', () => {
    // The description is a single value rather than a list: nothing in this
    // unit's answer can hold two surfaces at once.
    for (const surface of SURFACES_ASKED) {
      const modal = describedOn(surface)
      expect(Array.isArray(modal)).toBe(false)
    }
  })

  it('carries the name S-99g holds, untouched', () => {
    // Table T-103 has settled a name for three of the five surfaces and for
    // neither of the other two, so a name may not be minted, translated or
    // trimmed on the way through.
    for (const surface of SURFACES_ASKED) {
      expect(describedOn(surface).surface).toBe(surface)
    }
  })

  it('describes a surface exactly when IN-4 has Esc close one', () => {
    // IN-4 of table T-028 defines a surface by what the FIRST level of Esc
    // takes. `escapeTarget` is where that order lives, so the two answers have
    // to agree name by name -- including for the empty name, which no
    // requirement gives a second meaning to.
    const nothingElseToConsume: EscapeContext = { gestureInFlight: false, dualCursorMode: false }
    for (const surface of [null, ...SURFACES_ASKED]) {
      const state = surfaceState(surface)
      const closesASurface = escapeTarget(state, nothingElseToConsume) === 'surface'
      const isDescribed = openModalFromScreenState(state, EMPTY_DOCUMENT, sessionOf()) !== null
      expect(isDescribed, `IN-4: Esc and the description disagree about "${surface}"`).toBe(
        closesASurface,
      )
    }
  })
})

describe('UF-66 -- FR-029 (MUST): the placement follows table T-109', () => {
  it('places on each surface the rows of table T-109 that name it, and no other', () => {
    // One pass over the table copy, one surface at a time (Chapter 1.9: one
    // test walks every row).
    for (const surface of SURFACES_ASKED) {
      expect(iconsOf(describedOn(surface)), `FR-029: the placement on "${surface}"`).toEqual(
        [...iconsPlacedOn(surface)].sort(),
      )
    }
  })

  it('gives the help both entries: IC-52 and FR-038 second language entry', () => {
    // IC-52 closes the open surface (table T-109), and FR-038 (MUST) puts the
    // second language entry inside the help.
    const icons = iconsOf(describedOn(U_30_HELP))
    expect(icons).toContain('IC-52')
    expect(icons).toContain(FR_038_SECOND_ENTRY.row)
    expect(icons.length).toBe(2)
  })

  it('keeps the language entry off the AI export, which FR-038 does not name', () => {
    // FR-038 names the top of the screen and the help. The other half of U-30
    // is neither, so IC-52 stands alone there.
    expect(iconsOf(describedOn(U_30_AI_EXPORT))).toEqual(['IC-52'])
  })

  it('places no entry on a surface no row of table T-109 names', () => {
    // The two unnamed surfaces carry no row of table T-109, and FR-029 (MUST)
    // forbids minting one. IN-4 is why nothing is trapped: Esc still closes
    // them. ⭐ U-49 is no longer one of them -- its rows are asserted by the
    // case above, which walks the placement of every surface.
    expect(describedOn('a surface with no settled name').commands).toEqual([])
    expect(describedOn('').commands).toEqual([])
  })

  it('never places the same entry twice on one surface (MUST NOT)', () => {
    // FR-029 forbids two entries onto the same function, and its single
    // exception puts the language entry on two DIFFERENT surfaces, never twice
    // on one.
    for (const surface of SURFACES_ASKED) {
      const icons = iconsOf(describedOn(surface))
      expect(new Set(icons).size, `FR-029 (MUST NOT): a repeat on "${surface}"`).toBe(icons.length)
    }
  })

  it('lets no entry of another surface reach a surface it is not placed on', () => {
    // The surface column of table T-109 is the placement, so an `App Header`
    // row such as IC-1 or a `Command Palette` row such as IC-23 may not appear
    // here at all.
    const everyIconDescribed = SURFACES_ASKED.flatMap((surface) => iconsOf(describedOn(surface)))
    const everyIconPlaced = new Set(SURFACES_ASKED.flatMap((surface) => iconsPlacedOn(surface)))
    for (const icon of everyIconDescribed) {
      expect(everyIconPlaced.has(icon), `FR-029 (MUST): ${icon} is not placed on a surface`).toBe(
        true,
      )
    }
  })
})

describe('UF-66 -- FR-029 (MUST): an entry that can be used is not drawn faint', () => {
  it('offers every entry as usable, since nothing makes one unusable here', () => {
    // FR-029 draws faint what cannot be used and gives its reason; no rule
    // takes IC-52 or the language entry away while the surface is open, and an
    // entry that does nothing reads as a fault.
    for (const surface of SURFACES_ASKED) {
      for (const entry of describedOn(surface).commands) {
        expect(entry.isEnabled, `FR-029: ${entry.icon} on "${surface}"`).toBe(true)
      }
    }
  })

  it('shows no entry as a toggle that is on', () => {
    // `isPressed` is a toggle that is on, which FR-065 shows of IC-20 and
    // FR-072 of IC-17. Closing a surface is not a toggle, and FR-038's choice
    // between two languages has no off.
    for (const surface of SURFACES_ASKED) {
      for (const entry of describedOn(surface).commands) {
        expect(entry.isPressed, `${entry.icon} on "${surface}"`).toBe(false)
      }
    }
  })
})

describe('UF-66 -- FR-038: the display language', () => {
  it('does not translate the name S-99g holds', () => {
    // FR-038 leaves the document's own values untranslated and table T-103's
    // settled names are English on both sides of the choice.
    for (const language of ['ja', 'en'] as const) {
      for (const surface of SURFACES_ASKED) {
        const modal = openModalFromScreenState(
          surfaceState(surface),
          EMPTY_DOCUMENT,
          sessionOf(language),
        )
        expect((modal as OpenModal).surface, `${language}: "${surface}"`).toBe(surface)
      }
    }
  })

  it('mints no word, because no table settles one', () => {
    // FR-038 (MUST) shows menus and panels in the chosen language and names no
    // store of translated strings; section 8 of `_assets/tbl-glossary.md`
    // refuses table T-109 an English column for exactly this reason. So a word
    // written here would settle wording the glossary has not.
    for (const language of ['ja', 'en'] as const) {
      for (const surface of SURFACES_ASKED) {
        const modal = openModalFromScreenState(
          surfaceState(surface),
          EMPTY_DOCUMENT,
          sessionOf(language),
        ) as OpenModal
        for (const text of wordsOf(modal)) {
          expect(hasWord(text), `${language}: a word was minted on "${surface}"`).toBe(false)
        }
      }
    }
  })
})

describe('UF-66 -- table T-075 makes the unit `pure` (R7.1)', () => {
  it('rewrites none of its three arguments', () => {
    // A `pure` unit that rewrites an argument is the defect
    // docs/development-rules/04-verification.md records having been caught by
    // a specification-driven run.
    const state = deepFreeze(surfaceState(U_30_HELP))
    const schedule = deepFreeze(scheduleOf({ resources: [resourceOf(1, 'Ida Lovelace')] }))
    const session = deepFreeze(sessionOf())
    const before = JSON.stringify([state, schedule, session])

    openModalFromScreenState(state, schedule, session)

    expect(JSON.stringify([state, schedule, session])).toBe(before)
  })

  it('answers the same for the same inputs', () => {
    for (const surface of SURFACES_ASKED) {
      const state = surfaceState(surface)
      const first = openModalFromScreenState(state, EMPTY_DOCUMENT, sessionOf())
      const second = openModalFromScreenState(state, EMPTY_DOCUMENT, sessionOf())
      expect(second).toEqual(first)
    }
  })
})

describe('UF-66 -- boundaries the specification admits', () => {
  it('describes a surface over a document holding nothing', () => {
    // DR-2's collections may all be empty; no requirement makes a surface
    // depend on there being a task, a row or a resource.
    for (const surface of SURFACES_ASKED) {
      expect(describedOn(surface, EMPTY_DOCUMENT).surface).toBe(surface)
    }
  })

  it('describes the roster over a document holding one resource', () => {
    const oneResource = scheduleOf({ resources: [resourceOf(1, 'Ida Lovelace')] })
    expect(describedOn(U_49_ROSTER, oneResource).surface).toBe(U_49_ROSTER)
  })

  it('puts no cap on the name a surface carries, because none is settled', () => {
    // No row of table T-206 and no key of `_assets/tbl-settings.md` bounds
    // `ScreenState.surface`, so a long name travels through like any other.
    const longName = 'a'.repeat(4096)
    expect(describedOn(longName).surface).toBe(longName)
  })
})

describe('UF-66 -- FR-099 (MUST): the roster shows the resources the document holds', () => {
  it('carries every resource of the document into the description of U-49', () => {
    // FR-099's STATEMENT is a requirement (Chapter 1.9: a requirement ends in
    // "-- suru koto"), and the UF-66 row of table T-075 gives it to this unit.
    // FR-099 also forbids reducing to a count what a deletion would unassign
    // (MUST NOT), so a number in place of the names cannot satisfy it either.
    // `ScreenView.openModal` is the one member this unit fills, and `schedule`
    // is an argument of the signature the contract fixes -- there is nowhere
    // else for the roster to reach the screen from.
    const roster = scheduleOf({
      resources: [resourceOf(1, 'Ida Lovelace'), resourceOf(2, 'Grace Murray')],
      assignments: [{ uid: 1, taskUid: 10, resourceUid: 1, carry: {}, carryElements: [] }],
    })
    const described = JSON.stringify(describedOn(U_49_ROSTER, roster))

    for (const resource of roster.resources) {
      expect(described, `FR-099: the roster does not show ${resource.name}`).toContain(
        resource.name as string,
      )
    }
  })
})
