// Property panel dates: Delete / Backspace empties the whole date, and the empty commit follows JDG-366 / FR-044.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  commandFromFieldCommit,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  FieldCommit,
  PropertiesPanel,
  PropertyControl,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  NOT_STORED_ZOOM_BOUNDS,
  editTask,
  type DocumentCommand,
  type TaskCommand,
} from '../../src/use-case/edit-document/edit-document'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  descendants,
  oneByRole,
  stage,
  wiringOf,
  type FakeElement,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const RULING_2026_09_23 = 'user ruling 2026-09-23: Delete or Backspace while editing a date empties the whole date'
const JDG_366_NO_DATELESS_TASK =
  '⚠️ 日付を欠くタスクは不変条件 `IV-10` が許すが、今は作る道も開く道も無い（画面から作るタスクは必ず両方の日付を持ち、日付を欠くタスクを含むファイルは開けない）。'
const FR_044_CLEARING_RESUME = '置いた再開日を消したときは、`resumeValid` を `false` に戻すこと（MUST）'

const T_016 = specTable('T-016')
const columnsOf = (id: string): readonly string[] =>
  [...(T_016.rows.find((one) => one.id === id)?.by['列（`GRS JSON`）'] ?? '').matchAll(/`([^`]+)`/g)].map(
    (hit) => hit[1] as string,
  )
const PROPERTIES_PANEL = bare(specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '')

const THEME: ScreenTheme = { preference: 'light', hue: 214 }
const THE_DATE = '2026-04-24'

const datePanel = (row: string, column: string): PropertiesPanel => ({
  showing: 'selection',
  isSubjectGone: false,
  commands: [],
  fields: [
    {
      row,
      name: column,
      text: THE_DATE,
      isEditable: true,
      controls: [
        {
          key: { holder: 'task', uid: 1, column },
          kind: 'date',
          text: THE_DATE,
          choices: null,
          min: null,
          max: null,
          widthInFontSizes: 8,
        } as unknown as PropertyControl,
      ],
    },
  ],
})

const viewWith = (panel: PropertiesPanel): ScreenView => ({
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: panel,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
})

function raise(built: Stage, node: FakeElement, type: string, extra: Record<string, unknown> = {}): FakeEvent {
  const event = {
    type,
    key: '',
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: null,
    relatedTarget: null,
    defaultPrevented: false,
    preventDefault(): void {
      ;(this as { defaultPrevented: boolean }).defaultPrevented = true
    },
    stopPropagation(): void {},
    ...extra,
  } as unknown as FakeEvent
  let at: FakeElement | null = node
  while (at !== null) {
    for (const one of [...built.world.registrations]) {
      if (one.node === at && one.type === type) {
        ;(event as { currentTarget: FakeElement | null }).currentTarget = at
        one.listener(event)
      }
    }
    at = at.parentNode
  }
  return event
}

interface Editing {
  readonly built: Stage
  readonly surface: ScreenSurface
  readonly entry: FakeElement
}

function editingDate(row: string, column: string): Editing {
  const built = stage({ 'App Header': 37 })
  const surface = domScreenSurface(wiringOf(built, THEME))
  surface.showScreenView(viewWith(datePanel(row, column)))
  const panel = oneByRole(built.root(), PROPERTIES_PANEL)
  const entry = descendants(panel).find(
    (one) => one.tagName === 'INPUT' && one.getAttribute('data-field-row') === row,
  ) as FakeElement
  expect(entry, `premise: the panel drew an entry for ${row}`).toBeDefined()
  expect(entry.getAttribute('type'), 'premise: a date item is a date entry').toBe('date')
  // WHY: a browser reflects the type attribute onto the property; the shared fake does not.
  ;(entry as unknown as { type: string | null }).type = entry.getAttribute('type')
  entry.value = THE_DATE
  entry.focus()
  raise(built, entry, 'focusin')
  return { built, surface, entry }
}

const DATE_ITEMS = [
  ['PR-3', 'start'],
  ['PR-3', 'finish'],
  ['PR-4', 'actualStart'],
  ['PR-6', 'actualFinish'],
  ['PR-7', 'resume'],
  ['PR-10', 'deadline'],
] as const

describe('T-016 -- the date items these cases drive', () => {
  it.each(DATE_ITEMS)('%s holds %s', (row, column) => {
    expect(columnsOf(row)).toContain(column)
  })
})

describe('date field -- Delete or Backspace empties the whole date', () => {
  for (const key of ['Delete', 'Backspace'] as const) {
    it.each(DATE_ITEMS)(`${key} on %s %s empties the field and hands back an empty commit`, (row, column) => {
      const { built, surface, entry } = editingDate(row, column)
      const pressed = raise(built, entry, 'keydown', { key })
      expect(entry.value, RULING_2026_09_23).toBe('')
      expect(pressed.defaultPrevented, `${RULING_2026_09_23} -- not one segment at a time`).toBe(true)
      const commit = surface.readFieldCommit()
      expect(commit?.row, RULING_2026_09_23).toBe(row)
      expect(commit?.text, RULING_2026_09_23).toBe('')
      expect((commit?.key as { column?: string } | undefined)?.column).toBe(column)
    })
  }

  it('a text field is left to the host: Delete does not empty it (control)', () => {
    const { built, entry } = editingDate('PR-10', 'deadline')
    ;(entry as unknown as { type: string }).type = 'text'
    raise(built, entry, 'keydown', { key: 'Delete' })
    expect(entry.value).toBe(THE_DATE)
  })
})

const nested = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[path[path.length - 1] as string] = flat[key]
  }
  return out
}

const SETTINGS = nested({ ...SETTINGS_DEFAULTS, scrollDate: '2026-01-01', scrollGroupId: 'g1' }) as unknown as DocumentSettings
const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
const THE_TASK = 1

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    uid: THE_TASK,
    wbsParentUid: null,
    wbsOrder: 1,
    name: 'the one task',
    start: '2026-04-06',
    finish: '2026-04-24',
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...part,
  }) as unknown as Task

const groupOf = (): TaskGroup =>
  ({
    id: 'g1',
    parentId: null,
    label: 'row',
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
  }) as unknown as TaskGroup

const scheduleWith = (task: Task): Schedule =>
  ({
    project: {
      title: 'A',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      themeHue: 214,
      uidHighWaterMark: 100,
      importSeq: 0,
      revision: 1,
      carry: {},
      carryElements: [],
    },
    calendars: [],
    tasks: [task],
    resources: [],
    assignments: [],
    taskGroups: [groupOf()],
    taskGroupMembers: [{ taskUid: THE_TASK, groupId: 'g1', stackOrder: null }],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const documentOf = (schedule: Schedule): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule,
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const contextFor = (schedule: Schedule): InputContext => {
  const regions = regionsFromScreen(ENV, SETTINGS)
  const layout = layoutFromSchedule(schedule, SETTINGS, regions)
  const geometry = geometryFromLayout(schedule, SETTINGS, layout, regions, emptySelection())
  return {
    document: documentOf(schedule),
    layout,
    geometry,
    regions,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    zoomStep: 3,
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
  } as unknown as InputContext
}

interface Settled {
  readonly commands: readonly DocumentCommand[]
  readonly accepted: number
  readonly task: Record<string, unknown>
}

function emptied(task: Task, row: string, column: string): Settled {
  const schedule = scheduleWith(task)
  const commit = { row, key: { holder: 'task', uid: THE_TASK, column }, text: '' } as unknown as FieldCommit
  const commands = commandFromFieldCommit(commit, contextFor(schedule))
  let document = documentOf(schedule)
  let accepted = 0
  for (const command of commands) {
    const result = editTask(document, command as TaskCommand, 'row')
    if (!result.ok) continue
    accepted += 1
    document = result.document
  }
  const after = (document.schedule.tasks as readonly Task[]).find((one) => one.uid === THE_TASK)
  return { commands, accepted, task: after as unknown as Record<string, unknown> }
}

const PLANNED = taskOf({})
const DEADLINED = taskOf({ deadline: '2026-05-01' })
const IN_PROGRESS = taskOf({ actualStart: '2026-04-06', percentComplete: 30 })
const COMPLETED = taskOf({ actualStart: '2026-04-06', actualFinish: '2026-04-20', percentComplete: 100 })
const RESUME_SET = taskOf({ actualStart: '2026-04-06', stop: '2026-04-10', resume: '2026-05-11', resumeValid: true })

describe('the manuscript the emptied commit answers to', () => {
  it('JDG-366 (EX-12 note) and FR-044 still say it, word for word', () => {
    expect(REQUIREMENTS).toContain(JDG_366_NO_DATELESS_TASK)
    expect(REQUIREMENTS).toContain(FR_044_CLEARING_RESUME)
  })
})

describe('an emptied date -- what the commit writes', () => {
  it.each([
    ['start', '2026-04-06'],
    ['finish', '2026-04-24'],
  ])('PR-3 %s emptied writes nothing: the plan date stays (JDG-366)', (column, kept) => {
    const settled = emptied(PLANNED, 'PR-3', column)
    expect(settled.accepted, JDG_366_NO_DATELESS_TASK).toBe(0)
    expect(settled.task[column], JDG_366_NO_DATELESS_TASK).toBe(kept)
    expect(settled.task['start']).toBe('2026-04-06')
    expect(settled.task['finish']).toBe('2026-04-24')
  })

  it('PR-10 deadline emptied becomes null', () => {
    const settled = emptied(DEADLINED, 'PR-10', 'deadline')
    expect(settled.accepted, 'premise: the commit asks for an edit').toBeGreaterThan(0)
    expect(settled.task['deadline']).toBeNull()
  })

  it('PR-4 actualStart emptied becomes null', () => {
    const settled = emptied(IN_PROGRESS, 'PR-4', 'actualStart')
    expect(settled.accepted, 'premise: the commit asks for an edit').toBeGreaterThan(0)
    expect(settled.task['actualStart']).toBeNull()
  })

  it('PR-6 actualFinish emptied becomes null', () => {
    const settled = emptied(COMPLETED, 'PR-6', 'actualFinish')
    expect(settled.accepted, 'premise: the commit asks for an edit').toBeGreaterThan(0)
    expect(settled.task['actualFinish']).toBeNull()
  })

  it('PR-7 resume emptied becomes null, and resumeValid goes back to false (FR-044)', () => {
    const settled = emptied(RESUME_SET, 'PR-7', 'resume')
    expect(settled.accepted, 'premise: the commit asks for an edit').toBeGreaterThan(0)
    expect(settled.task['resume']).toBeNull()
    expect(settled.task['resumeValid'], FR_044_CLEARING_RESUME).toBe(false)
  })
})
