// Unit tests: a press on the one Import Report entrance closes its surface.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { openModalFromSession } from '../../src/adapter/screen-renderer/open-modals'
import type {
  AppHeaderItems,
  DisplayLanguage,
  OpenModal,
  ScreenFrame,
  ScreenPart,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
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
  pressedRowOf,
  screenEventFromInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { advanceScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
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

// Why: readScreenPartAt walks up through parentElement, which FakeElement lacks;
// one accessor over parentNode is added instead of declaring a richer element.
if (!Object.getOwnPropertyDescriptor(FakeElement.prototype, 'parentElement')) {
  Object.defineProperty(FakeElement.prototype, 'parentElement', {
    get(this: FakeElement): FakeElement | null {
      return this.parentNode
    },
  })
}

// Why: read out of table T-103 so a rename of U-62 fails this file.
const U_62 = (() => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-62')
  if (row === undefined) throw new Error('table T-103 no longer has row U-62')
  return bare(row.cells[0] ?? '')
})()

const U_62_ROW = 'U-62'

const RS_50 = specTable('T-233').rows.find((one) => one.id === 'RS-50')

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

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
      creationDate: null,
      revision: null,
      startDate: null,
      statusDate: null,
      minutesPerDay: null,
      minutesPerWeek: null,
      daysPerMonth: null,
      weekStartDay: null,
      calendarUid: null,
      defaultStartTime: null,
      defaultFinishTime: null,
      themeHue: 214,
      uidHighWaterMark: 0,
      importSequence: 0,
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

// Why: SETTINGS_DEFAULTS carries these four keys under dotted names; the layout reads objects.
const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontSizeStepSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const SETTINGS = { ...SETTINGS_DEFAULTS, ...NESTED } as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  propertyPanelWidth: 0,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection(), null)

const DOCUMENT: Document = {
  schemaVersion: '2026-01-01',
  schedule: SCHEDULE,
  documentSettings: SETTINGS,
  documentStamp: {
    scheduleUpdatedAt: '2026-01-01T00:00:00Z',
    lastEditedBy: 'test',
    settingsUpdatedAt: '2026-01-01T00:00:00Z',
  },
  changeLog: [],
} as unknown as Document

// Spec: FR-023, AT-27
const DROPPED_TASK_NAMES: readonly (string | null)[] = ['Foundation pour', null]

const rootOn = (surface: string | null, language: DisplayLanguage = 'ja'): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage: language,
    helpLanguage: language,
    openSurfaceState: surface === null ? { kind: 'closed' } : { kind: 'open', surfaceName: surface },
  },
})

const readingsOf = (): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer: null,
    pointerRestedMs: 0,
    hintTargetDwellMs: 0,
    iconUnderPointer: null,
    commandPaletteAt: { x: 0, y: 0 },
    themePreference: 'light',
    themeHue: 214,
    selectedTaskGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    droppedTaskNames: DROPPED_TASK_NAMES,
  }) as unknown as ScreenViewReadings

const stateOn = (surface: string | null): ScreenSession => rootOn(surface)

function describedOn(language: DisplayLanguage): OpenModal {
  const modal = openModalFromSession(rootOn(U_62_ROW, language), SCHEDULE, readingsOf(), SETTINGS)
  expect(modal, `S-99g holds ${U_62_ROW}, so UF-66 describes a surface`).not.toBeNull()
  return modal as OpenModal
}

const FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const HEADER: AppHeaderItems = {
  documentTitle: '',
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
} as unknown as AppHeaderItems

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

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
    taskGroupPanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: describedOn('ja'),
    notices: [],
    confirmation: null,
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

type ElementFromPoint = (x: number, y: number) => FakeElement | null

// Why: the fake is told what stood under the point; the walk up from it is under test,
// not the pixel a browser would land the press on.
// Trap: pass the surface drawnImportReport built; a fresh domScreenSurface walks up to
// a mount nothing was drawn into, and the walk never reaches it.
function readPartAt(
  built: Stage,
  surface: ReturnType<typeof domScreenSurface>,
  landingOn: FakeElement | null,
): ScreenPart | null {
  ;(built.host as unknown as { elementFromPoint: ElementFromPoint }).elementFromPoint = () =>
    landingOn
  return surface.readScreenPartAt(0, 0)
}

// Spec: FR-023, U-62, RS-50, S-99g, IN-4
describe('FR-023 -- a press on U-62 `Import Report`\'s one entrance', () => {
  it("FR-023 (MUST) still sends U-62's sentence to table T-233's RS-50", () => {
    // Why: the cases below rest on RS-50; if the row moved they would assert nothing.
    expect(RS_50, 'table T-233 no longer has row RS-50').not.toBeUndefined()
    expect(REQUIREMENTS.includes('RS-50'), 'FR-023 no longer names RS-50').toBe(true)
  })

  it('answers `ScreenPart.isImportReportDismiss` for a press on the OK entrance, and not for one beside it', () => {
    const { built, surface, okButton } = drawnImportReport()

    const onEntrance = readPartAt(built, surface, okButton)
    expect(onEntrance?.part, 'the part is still U-62').toBe(U_62)
    expect(onEntrance?.isImportReportDismiss, 'the entrance answers true').toBe(true)

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
      screen: stateOn(U_62_ROW).screen,
      selection: emptySelection(),
      zoomStep: 3,
      zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
      zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
      isTextEntryUnsettled: false,
      isSurfaceStanding: true,
      dualCursorFollowing: null,
      today: '2026-02-15T00:00:00',
      newTaskGroupId: 'task-group-minted-outside',
      newCommentBoxId: 'comment-box-minted-outside',
      newHighlightBoxId: 'highlight-box-minted-outside',
    }

    const onDismiss: ScreenPart = {
      part: U_62,
      entry: null,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
      isImportReportDismiss: true,
    }
    const pressedOnDismiss = {
      at: down,
      hit: null,
      on: onDismiss,
      pressRow: pressedRowOf({ at: down, hit: null }, baseContext),
    }
    const eventOnDismiss = screenEventFromInput(up, { ...baseContext, pressed: pressedOnDismiss })
    expect(eventOnDismiss, 'FR-023: the OK entrance asks to close the surface').toEqual({
      type: 'surfaceCloseAsked',
      target: 'surface',
    })
    const afterDismiss = advanceScreenSession(
      { ...emptyScreenSession, screen: baseContext.screen },
      eventOnDismiss as NonNullable<typeof eventOnDismiss>,
    ).state.screen
    expect(afterDismiss.openSurfaceState.kind, 'S-99g is put away').toBe('closed')

    const { isImportReportDismiss: _unused, ...onElsewhereRest } = onDismiss
    const onElsewhere: ScreenPart = onElsewhereRest
    const pressedElsewhere = {
      at: down,
      hit: null,
      on: onElsewhere,
      pressRow: pressedRowOf({ at: down, hit: null }, baseContext),
    }
    const eventElsewhere = screenEventFromInput(up, {
      ...baseContext,
      pressed: pressedElsewhere,
    })
    expect(eventElsewhere, `S-99g still holds ${U_62_ROW}: no close event off the entrance`).toBeNull()
  })
})
