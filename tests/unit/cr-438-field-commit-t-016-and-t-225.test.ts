// CR-438 stage-5 spec-only cases for a settled property field: UF-100 (T-016, T-225).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
} from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import type {
  FieldCommit,
  PropertyFieldKey,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import {
  commandFromFieldCommit,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'

const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const held = built[head]
    const group = (typeof held === 'object' && held !== null ? held : {}) as Record<string, unknown>
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

const SETTINGS = {
  ...nestedFrom(SETTINGS_DEFAULTS),
  scrollDate: '2026-01-01',
  scrollGroupId: 'g1',
  stackDirection: 'down',
  rulerHeight: 48,
  rulerFont: 12,
  assigneeVisible: true,
} as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1200, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

const TASK_ID = 5
const SEATED_ID = 1

const TASK = {
  uid: TASK_ID,
  name: 'before',
  start: '2026-01-05',
  finish: '2026-01-09',
  milestone: null,
  percentComplete: null,
  actualStart: null,
  actualDuration: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
} as unknown as Task

const resourceOf = (uid: number, name: string): Schedule['resources'][number] =>
  ({
    uid,
    name,
    resourceKind: 1,
    isCostResource: false,
    calendarUid: null,
    carry: {},
    carryElements: [],
  }) as unknown as Schedule['resources'][number]

const SCHEDULE = {
  project: { calendarUid: null, statusDate: null, themeHue: 214, title: null, uidHighWaterMark: 20 },
  calendars: [],
  tasks: [TASK],
  resources: [resourceOf(SEATED_ID, 'Seated'), resourceOf(2, 'Other')],
  assignments: [{ uid: 9, taskUid: TASK_ID, resourceUid: SEATED_ID, carry: {}, carryElements: [] }],
  taskGroups: [{ id: 'g1', parentId: null, label: 'row 1', order: 0, height: null }],
  taskGroupMembers: [{ groupId: 'g1', taskUid: TASK_ID }],
  taskVisuals: [],
  commentBoxes: [
    { id: 'c1', leaderShapeKind: null, text: 'old words', anchorDate: '2026-01-06', anchorGroupId: 'g1', bodyOffsetPx: null },
  ],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)

const CONTEXT: InputContext = {
  document: {
    schemaVersion: '2026-01-01',
    schedule: SCHEDULE,
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  } as unknown as Document,
  layout: LAYOUT,
  geometry: geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection()),
  regions: REGIONS,
  screen: emptyScreenSession.screen,
  selection: emptySelection(),
  zoomStep: 1.1,
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  pressed: null,
  isTextEntryUnsettled: false,
  isSurfaceStanding: false,
  dualCursorFollowing: null,
  today: '2026-03-01T00:00:00',
  newGroupId: 'row-minted-outside',
  newCommentBoxId: 'comment-box-minted-outside',
  newHighlightBoxId: 'highlight-box-minted-outside',
}

const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    language: 'ja',
    propertiesPanelContentState: {
      kind: 'selectionDisplayed',
      subject: { selection: emptySelection(), groupIds: [] },
    },
  },
}

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const keyOnPanel = (item: ItemRef, row: string): PropertyFieldKey => {
  const panel = propertiesPanelFromSelection(
    SCHEDULE,
    SETTINGS,
    selectionWith(emptySelection(), item),
    ROOT,
    READINGS,
  )
  const field = panel?.fields.find((one) => one.row === row)
  const key = field?.controls[0]?.key
  if (key === undefined) throw new Error(`the panel offers no control for ${row}`)
  return key
}

const commit = (row: string, key: PropertyFieldKey, text: string): readonly DocumentCommand[] =>
  commandFromFieldCommit({ row, key, text } as FieldCommit, CONTEXT)

const kindsOf = (commands: readonly DocumentCommand[]): readonly string[] => commands.map((one) => one.kind)

describe('UF-100 table T-016 (FR-006) -- a settled field becomes the command of table T-108', () => {
  it('PR-1: the name of a Task is written by CM-9 setTaskName', () => {
    const written = commit('PR-1', { holder: 'task', uid: TASK_ID, column: 'name' }, 'after')
    expect(written).toEqual([{ kind: 'setTaskName', uid: TASK_ID, name: 'after' }])
  })

  it('PR-21: the words of a comment box are written by CM-48 setCommentBoxText', () => {
    const written = commit('PR-21', { holder: 'commentBox', id: 'c1', column: 'text' }, 'new words')
    expect(written).toEqual([{ kind: 'setCommentBoxText', id: 'c1', text: 'new words' }])
  })
})

describe('UF-100 table T-225 (FR-008) -- the assignee field PR-16', () => {
  const assignee = (): PropertyFieldKey => keyOnPanel({ kind: 'task', uid: TASK_ID }, 'PR-16')

  it('AS-3 / AS-4: settling "-" unassigns the seated person and creates no Resource named "-"', () => {
    const written = commit('PR-16', assignee(), '-')
    expect(written).toContainEqual({ kind: 'unassignResource', taskUid: TASK_ID, resourceUid: SEATED_ID })
    expect(kindsOf(written)).not.toContain('createResource')
    expect(kindsOf(written)).not.toContain('createAssignment')
  })

  it('AS-10: naming the person already on the task adds no second assignment', () => {
    expect(kindsOf(commit('PR-16', assignee(), 'Seated'))).not.toContain('createAssignment')
  })
})
