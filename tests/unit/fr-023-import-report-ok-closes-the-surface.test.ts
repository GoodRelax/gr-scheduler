// Unit tests for the seam this round of work added: a press on U-62 `Import
// Report`'s one entrance now closes S-99g's surface.
//
// Two units meet here:
//   UF-71  src/framework/dom-screen-surface/dom-screen-surface.ts
//          -- `readScreenPartAt` (IF-9 of table T-065), which answers a press
//          on the entrance as `ScreenPart.isImportReportDismiss`.
//   UF-30  src/adapter/input-command-translator/input-command-translator.ts
//          -- `screenStateFromInput`, which reads that member and closes S-99g.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec, NOT FROM THE TWO UNITS' BODIES (docs/development-
// rules/04-verification.md section 1). What was read: table T-103's row U-62,
// table T-233's row RS-50, table T-037's row NT-8, table T-206's row S-99g, and
// FR-023 in 01-04-requirements.md. The harness (`stage`, `descendants`,
// `pointerOf`, the `InputContext` fixture) is copied from
// tests/unit/fr-020-the-surface-that-asks-for-the-watermark-password.test.ts
// and tests/unit/fr-034-align-to-the-last-picked.test.ts, the way rule 03
// section 1 already lets a harness travel between sibling files; every expected
// value below is this file's own, read out of a table at run time.
//
// The rows these cases answer to (rule 03: name the row, never copy its prose):
//   FR-023      (MUST) an import that drops rows raises U-62 with their names;
//               (MUST NOT) a count alone
//   table T-103 U-62 `Import Report` -- 「入口は `OK` の 1 つだけである」, not a
//               `Confirmation` (asks nothing) and not the `Notification Area`
//   table T-233 RS-50 -- the reason FR-023 sends U-62's sentence to
//   table T-037 NT-8 -- the word this entrance is spelled with, in every
//               display language
//   table T-206 S-99g -- what "面" means: opened over the screen, put away by
//               a press on this route or by `Esc`'s first level (IN-4)
//
// ⭐⭐ WHAT IS DELIBERATELY NOT ASSERTED, because no requirement decides it or
// another file already covers it:
//   - the exact word NT-8 spells the entrance with, and whether the two
//     display languages agree -- that is FR-038's dictionary, covered where
//     `notices.ts` is (this file only checks the entrance is drawn and words
//     something).
//   - what becomes of `ScreenSession.droppedTaskNames` once S-99g closes --
//     that bookkeeping is the shell's own (`frame-loop.ts`), read but not
//     rewritten by this round, and is outside the files this round may touch.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { openModalFromScreenState } from '../../src/adapter/screen-renderer/open-modals'
import type {
  AppHeaderItems,
  DisplayLanguage,
  OpenModal,
  ScreenFrame,
  ScreenPart,
  ScreenSession,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  emptyScreenState,
  screenStateWithSurface,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import type { Document } from '../../src/entity/document-model/document/document'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import {
  pressRowOf,
  screenStateFromInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  domScreenSurface,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  descendants,
  FakeElement,
  stage,
  wiringOf,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

// `readScreenPartAt` (UF-71) walks a press up through `Element.parentElement`,
// which the shared fixture's `FakeElement` does not carry -- it was built for
// the tests that only read what UF-71 DREW (`descendants`/`parentNode`), never
// for one that asks it where a point landed. tests/unit/uf-71-confirmation.
// test.ts and tests/unit/uf-72-screen-part.test.ts each answer the same gap by
// declaring their own richer element; this file instead adds the one missing
// accessor to the shared class, since `parentNode` already carries the answer.
if (!Object.getOwnPropertyDescriptor(FakeElement.prototype, 'parentElement')) {
  Object.defineProperty(FakeElement.prototype, 'parentElement', {
    get(this: FakeElement): FakeElement | null {
      return this.parentNode
    },
  })
}

// ---------------------------------------------------------------------------
// What the manuscript says, read at run time rather than copied
// ---------------------------------------------------------------------------

/** U-62 of table T-103, read out of the glossary so a rename fails this file. */
const U_62 = (() => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-62')
  if (row === undefined) throw new Error('table T-103 no longer has row U-62')
  return bare(row.cells[0] ?? '')
})()

/** RS-50 of table T-233 -- FR-023 (MUST) sends U-62's sentence to this row. */
const RS_50 = specTable('T-233').rows.find((one) => one.id === 'RS-50')

/** The manuscript text, read so FR-023 naming RS-50 can be checked at run time. */
const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

// ---------------------------------------------------------------------------
// Building the modal and the schedule/session it is drawn from
// ---------------------------------------------------------------------------

const scheduleOf = (): Schedule =>
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
  }) as unknown as Schedule

const SCHEDULE = scheduleOf()

/** The four keys `SETTINGS_DEFAULTS` carries under dotted names, as objects. */
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const SETTINGS = { ...SETTINGS_DEFAULTS, ...NESTED } as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection())

const DOCUMENT: Document = {
  schemaVersion: '2026-01-01',
  schedule: SCHEDULE,
  documentSettings: SETTINGS,
  documentStamp: {
    scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
    lastEditedBy: 'test',
    settingsUpdatedUtc: '2026-01-01T00:00:00Z',
  },
  changeLog: [],
} as unknown as Document

/** FR-023's dropped names -- one plain, one nameless (AT-27). */
const DROPPED_TASK_NAMES: readonly (string | null)[] = ['Foundation pour', null]

const sessionOf = (language: DisplayLanguage): ScreenSession =>
  ({
    language,
    openedFileName: null,
    fileSavedAt: null,
    isAgentApiEnabled: false,
    isDialogueFieldVisible: true,
    pointer: null,
    pointerRestedMs: 0,
    iconUnderPointer: null,
    commandPaletteAt: { x: 0, y: 0 },
    themePreference: 'light',
    themeHue: 214,
    isMilestoneListOpen: false,
    isPaletteMinimised: false,
    dualCursorFollowing: null,
    selectedGroupIds: [],
    selectedResourceUids: [],
    propertiesShowing: null,
    propertiesSubject: null,
    notices: [],
    confirmation: null,
    rowBoxes: [],
    droppedTaskNames: DROPPED_TASK_NAMES,
  }) as unknown as ScreenSession

const stateOn = (surface: string | null): ScreenState =>
  screenStateWithSurface(emptyScreenState(), surface)

/** U-62 as UF-66 describes it, with the case failed where S-99g holds nothing. */
function describedOn(language: DisplayLanguage): OpenModal {
  const modal = openModalFromScreenState(stateOn(U_62), SCHEDULE, sessionOf(language))
  expect(modal, `S-99g holds ${U_62}, so UF-66 describes a surface`).not.toBeNull()
  return modal as OpenModal
}

// ---------------------------------------------------------------------------
// UF-71 -- drawing U-62 and reading a press back
// ---------------------------------------------------------------------------

const FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const HEADER: AppHeaderItems = {
  documentTitle: '',
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
} as unknown as AppHeaderItems

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

/** Draws U-62, and answers with the built stage plus the button UF-71 made. */
function drawnImportReport(): {
  built: Stage
  surface: ReturnType<typeof domScreenSurface>
  okButton: FakeElement
} {
  const built = stage()
  const surface = domScreenSurface(wiringOf(built, THEME))
  const view: ScreenView = {
    language: 'ja',
    frame: FRAME,
    appHeaderItems: HEADER,
    rowTitlePanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: describedOn('ja'),
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  } as unknown as ScreenView
  surface.showScreenView(view)

  const found = descendants(built.root()).filter(
    (one) => one.getAttribute('data-role') === U_62,
  )
  expect(found.length, `exactly one part named ${U_62} is drawn`).toBe(1)
  const container = found[0]
  if (container === undefined) throw new Error('unreachable')

  const buttons = descendants(container).filter((one) => one.tagName === 'BUTTON')
  expect(buttons.length, 'U-62 draws exactly one entrance').toBe(1)
  const okButton = buttons[0]
  if (okButton === undefined) throw new Error('unreachable')

  return { built, surface, okButton }
}

/** The one `Document` member `readScreenPartAt` reaches for. */
type ElementFromPoint = (x: number, y: number) => FakeElement | null

/**
 * What the surface answers for a press landing on `landingOn`.
 *
 * ⭐ The fake's own geometry is not under test here (R6.3's limit, the same one
 * tests/unit/uf-72-screen-part.test.ts states): what this round changed is the
 * WALK from whatever `elementFromPoint` answers, up to the root, and not which
 * pixel a browser would have landed the press on -- so the fake is told
 * directly what stood under the point, the way a browser's own answer arrives.
 * ⚠️ THE SAME `surface` `drawnImportReport` BUILT, not a fresh one: a new
 * `domScreenSurface` would walk up to a mount nothing was drawn into, and
 * `landingOn`'s ancestry would never reach it.
 */
function readPartAt(
  built: Stage,
  surface: ReturnType<typeof domScreenSurface>,
  landingOn: FakeElement | null,
): ScreenPart | null {
  ;(built.host as unknown as { elementFromPoint: ElementFromPoint }).elementFromPoint = () =>
    landingOn
  return surface.readScreenPartAt(0, 0)
}

describe('FR-023 -- a press on U-62 `Import Report`\'s one entrance', () => {
  it("FR-023 (MUST) still sends U-62's sentence to table T-233's RS-50", () => {
    // Grounding: FR-023 (MUST) names RS-50 as the reason, so the row must
    // still exist and still be table T-233's -- a case built on a row that has
    // moved would be asserting nothing.
    expect(RS_50, 'table T-233 no longer has row RS-50').not.toBeUndefined()
    expect(REQUIREMENTS.includes('RS-50'), 'FR-023 no longer names RS-50').toBe(true)
  })

  it('answers `ScreenPart.isImportReportDismiss` for a press on the OK entrance, and not for one beside it', () => {
    const { built, surface, okButton } = drawnImportReport()

    const onEntrance = readPartAt(built, surface, okButton)
    expect(onEntrance?.part, 'the part is still U-62').toBe(U_62)
    expect(onEntrance?.isImportReportDismiss, 'the entrance answers true').toBe(true)

    // ⛔ `on.part` ALONE MAY NOT DO IT (FR-023, MUST NOT: no shortening of the
    // list) -- a press on the surface itself, off the one entrance, must not
    // answer the same way.
    const container = okButton.parentNode?.parentNode ?? null
    const elsewhere = readPartAt(built, surface, container)
    expect(elsewhere?.part, 'still landed on U-62').toBe(U_62)
    expect(
      elsewhere?.isImportReportDismiss,
      'a press beside the entrance is not the entrance',
    ).not.toBe(true)
  })

  it('closes S-99g when `screenStateFromInput` reads that member, and leaves it open otherwise', () => {
    const noMods: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
    const down: PointerInput = {
      kind: 'pointer',
      phase: 'down',
      button: 'left',
      x: 0,
      y: 0,
      modifiers: noMods,
      clickCount: 1,
    }
    const up: PointerInput = { ...down, phase: 'up' }

    const baseContext: Omit<InputContext, 'pressed'> = {
      document: DOCUMENT,
      layout: LAYOUT,
      geometry: GEOMETRY,
      regions: REGIONS,
      screenState: stateOn(U_62),
      selection: emptySelection(),
      zoomStep: 3,
      zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
      zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
      isTextEntryUnsettled: false,
      isSurfaceStanding: true,
      dualCursorFollowing: null,
      today: '2026-02-15T00:00:00',
      newGroupId: 'row-minted-outside',
      newCommentBoxId: 'comment-box-minted-outside',
      newHighlightBoxId: 'highlight-box-minted-outside',
    }

    const onDismiss: ScreenPart = {
      part: U_62,
      entry: null,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
      isImportReportDismiss: true,
    }
    const pressedOnDismiss = {
      at: down,
      hit: null,
      on: onDismiss,
      pressRow: pressRowOf({ at: down, hit: null }, baseContext),
    }
    const afterDismiss = screenStateFromInput(up, { ...baseContext, pressed: pressedOnDismiss })
    expect(afterDismiss.surface, 'S-99g is put away').toBeNull()

    // ⛔ (MUST NOT) THE SAME PRESS ANYWHERE ELSE ON U-62 MAY NOT CLOSE IT: the
    // member is what carries the entrance, not `on.part`.
    const { isImportReportDismiss: _unused, ...onElsewhereRest } = onDismiss
    const onElsewhere: ScreenPart = onElsewhereRest
    const pressedElsewhere = {
      at: down,
      hit: null,
      on: onElsewhere,
      pressRow: pressRowOf({ at: down, hit: null }, baseContext),
    }
    const afterElsewhere = screenStateFromInput(up, {
      ...baseContext,
      pressed: pressedElsewhere,
    })
    expect(afterElsewhere.surface, `S-99g still holds ${U_62}`).toBe(U_62)
  })
})
