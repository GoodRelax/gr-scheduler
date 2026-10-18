// CR-807 spec-only cases, use-case level: looking around (T-027 outside-history writes) moves no stamp.

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import type {
  ChangeStep,
  DocumentCommand,
  SettingsLimits,
  WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import { bare, specTable } from './spec-table'

// see T-108
function kindOf(row: string): DocumentCommand['kind'] {
  const found = specTable('T-108').rows.find((one) => one.id === row)
  const name = bare(found?.by['確定名'] ?? '')
  if (name === '') throw new Error(`table T-108 has no ${row}`)
  return name as DocumentCommand['kind']
}

const BUILT_VERSION: string = (startupTemplate as { schemaVersion: string }).schemaVersion

function documentOf(): Document {
  const read = documentFromJson(JSON.stringify(startupTemplate), BUILT_VERSION)
  if (!read.ok) throw new Error(`the startup template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const DOCUMENT = documentOf()
const STAMP = DOCUMENT.documentStamp
const SETTINGS = DOCUMENT.documentSettings
const FIRST_TASK_GROUP = DOCUMENT.schedule.taskGroups[0]?.id ?? null
const FIRST_TASK = DOCUMENT.schedule.tasks[0]

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }

const WRITER = 'cr-807-tester'
const WRITE_TIME = '2031-01-02T03:04:05Z'

const cmd = (value: Record<string, unknown>): DocumentCommand => value as unknown as DocumentCommand

function planOf(document: Document, commands: readonly DocumentCommand[], expectedStamp = document.documentStamp) {
  return planDocumentChange({
    defaultTaskGroupName: 'cr-807 default task group name',
    document,
    expectedStamp,
    commands,
    moment: CALM,
    history: EMPTY_HISTORY,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: WRITER,
    updatedAt: WRITE_TIME,
  })
}

// see CM-66, UN-8
const SCROLL = cmd({
  kind: kindOf('CM-66'),
  scrollDate: '2026-03-09',
  scrollTaskGroupId: FIRST_TASK_GROUP,
  scrollDateFraction: 0.25,
  scrollTaskGroupFraction: 0.5,
})
// see CM-65, UN-8
const ZOOM = cmd({ kind: kindOf('CM-65'), zoomX: SETTINGS.zoomX * 1.5, zoomY: SETTINGS.zoomY * 1.5 })
// see CM-58, UN-7
const TOGGLE = cmd({ kind: kindOf('CM-58'), setting: 'isBaselineVisible', isVisible: !SETTINGS.isBaselineVisible })
// see CM-67, UN-16
const PANEL_WIDTH = cmd({ kind: kindOf('CM-67'), taskGroupPanelWidthPx: SETTINGS.taskGroupPanelWidthPx + 20 })
// see CM-62, UN-13
const FONT_STEP = cmd({ kind: kindOf('CM-62'), fontSizeStep: SETTINGS.fontSizeStep === 'L' ? 'S' : 'L' })
// see CM-9, UN-3
const RENAME = cmd({ kind: kindOf('CM-9'), taskUid: FIRST_TASK?.uid, name: 'cr-807 renamed task' })

describe('premises', () => {
  it('the writer and time differ from what the stamp holds; the template has a task', () => {
    expect(STAMP.lastEditedBy).not.toBe(WRITER)
    expect(STAMP.scheduleUpdatedAt).not.toBe(WRITE_TIME)
    expect(STAMP.settingsUpdatedAt).not.toBe(WRITE_TIME)
    expect(FIRST_TASK).toBeDefined()
  })
})

describe('FR-063 star: a write made only of T-027 outside-history rows moves no stamp field', () => {
  it.each([
    ['UN-8 setScrollPosition', SCROLL, (d: Document) => d.documentSettings.scrollDate],
    ['UN-8 setZoom', ZOOM, (d: Document) => d.documentSettings.zoomX],
    ['UN-7 setVisibilitySetting', TOGGLE, (d: Document) => d.documentSettings.isBaselineVisible],
    ['UN-16 setTaskGroupPanelWidthPx', PANEL_WIDTH, (d: Document) => d.documentSettings.taskGroupPanelWidthPx],
  ])('%s alone changes the value and keeps all four stamp fields', (_name, command, read) => {
    const planned = planOf(DOCUMENT, [command])
    expect(planned.ok).toBe(true)
    if (!planned.ok) return
    expect(read(planned.document), 'premise: the value moved').not.toEqual(read(DOCUMENT))
    expect(planned.document.documentStamp).toEqual(STAMP)
    expect(planned.hasUpdatedSchedule).toBe(false)
  })

  it('a batch of several outside-history writes keeps the stamp too', () => {
    const planned = planOf(DOCUMENT, [SCROLL, ZOOM, TOGGLE, PANEL_WIDTH])
    expect(planned.ok).toBe(true)
    if (!planned.ok) return
    expect(planned.document.documentStamp).toEqual(STAMP)
  })
})

describe('AG-2 / WS-1: looking around does not make the next schedule write stale', () => {
  it('a schedule write holding the ORIGINAL stamp passes after a scroll-only write', () => {
    const looked = planOf(DOCUMENT, [SCROLL])
    if (!looked.ok) throw new Error(`premise: scroll accepted; ${JSON.stringify(looked.refusal)}`)
    const edited = planOf(looked.document, [RENAME], STAMP)
    expect(edited.ok ? null : edited.refusal).toBeNull()
    if (!edited.ok) return
    expect(edited.document.documentStamp.scheduleUpdatedAt).toBe(WRITE_TIME)
    expect(edited.document.documentStamp.lastEditedBy).toBe(WRITER)
  })
})

describe('WS-5: one undoable write in the batch moves the stamp as before', () => {
  it('[setScrollPosition, setTaskName] advances settingsUpdatedAt and lastEditedBy', () => {
    const planned = planOf(DOCUMENT, [SCROLL, RENAME])
    expect(planned.ok).toBe(true)
    if (!planned.ok) return
    expect(planned.document.documentStamp.settingsUpdatedAt).toBe(WRITE_TIME)
    expect(planned.document.documentStamp.lastEditedBy).toBe(WRITER)
    expect(planned.document.documentStamp.scheduleUpdatedAt).toBe(WRITE_TIME)
  })

  it('[setScrollPosition, setFontSizeStep] (view group, UN-13) advances the settings time and writer', () => {
    const planned = planOf(DOCUMENT, [SCROLL, FONT_STEP])
    expect(planned.ok).toBe(true)
    if (!planned.ok) return
    expect(planned.document.documentStamp.settingsUpdatedAt).toBe(WRITE_TIME)
    expect(planned.document.documentStamp.lastEditedBy).toBe(WRITER)
  })
})

describe('control (UN-13): an undoable view-group write still moves the stamp and still fights a stale one', () => {
  it('setFontSizeStep alone advances settingsUpdatedAt and lastEditedBy, not the schedule time', () => {
    const planned = planOf(DOCUMENT, [FONT_STEP])
    expect(planned.ok).toBe(true)
    if (!planned.ok) return
    expect(planned.document.documentSettings.fontSizeStep).not.toBe(SETTINGS.fontSizeStep)
    expect(planned.document.documentStamp.settingsUpdatedAt).toBe(WRITE_TIME)
    expect(planned.document.documentStamp.lastEditedBy).toBe(WRITER)
    expect(planned.document.documentStamp.scheduleUpdatedAt).toBe(STAMP.scheduleUpdatedAt)
  })

  it('a stale expectedStamp is refused with WS-1 staleStamp', () => {
    const stale = { ...STAMP, settingsUpdatedAt: '1999-01-01T00:00:00Z' }
    expect(planOf(DOCUMENT, [FONT_STEP], stale)).toEqual({ ok: false, refusal: { step: 'WS-1', reason: 'staleStamp' } })
  })

  it('a stale expectedStamp is refused even for a scroll-only write (WS-1 comes first)', () => {
    const stale = { ...STAMP, lastEditedBy: 'someone-else' }
    expect(planOf(DOCUMENT, [SCROLL], stale)).toEqual({ ok: false, refusal: { step: 'WS-1', reason: 'staleStamp' } })
  })
})

describe('WS-4: a write outside the history pushes no step', () => {
  it('scroll-only leaves history.done as it was', () => {
    const planned = planOf(DOCUMENT, [SCROLL])
    expect(planned.ok).toBe(true)
    if (!planned.ok) return
    expect(planned.history.done).toHaveLength(EMPTY_HISTORY.done.length)
  })

  it('control: an undoable write pushes one step', () => {
    const planned = planOf(DOCUMENT, [FONT_STEP])
    expect(planned.ok).toBe(true)
    if (!planned.ok) return
    expect(planned.history.done).toHaveLength(1)
  })
})
