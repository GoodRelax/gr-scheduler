// CR-561 spec-only tests: table T-107 AM-19 readDelayDiagnostics (seam S-6) through installAgentApi (PI-17).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  installAgentApi,
  type AgentApi,
  type AgentApiWiring,
  type AgentSnapshot,
  type FrameSnapshot,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { DEFAULT_ROW_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptyDialogueLog, type DialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, type Selection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { ChangeStep, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import {
  emptyChangeWatchers,
  notifyChangeWatchers,
  unwatchChanges,
} from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { specTable, unbroken } from './spec-table'
import { rowDocument, taskOf } from '../unit/cr-541-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const AM_19_RETURNS = '遅延診断のレポート（`FR-134` の 表 T-317）を凍結した値で返す。'
const AM_19_NO_WRITE = '画面の値も文書も書かない'
const AG_4_COPY = '読み出しは**凍結された複製**を返すこと。'
const AG_4_UNCHANGED = '受け取った側がそれを書き換えても本体が変わらない'
const FR_134_TWO_READERS =
  '`GRS` は、診断の結果を 表 T-317 の欄を持つ 1 つのレポートにまとめ、人には遅延診断レポートの窓（`_assets/tbl-glossary.md` の `U-66`）として、AI には `Agent API` の 表 T-107 の `AM-19` の値として渡すこと。'
const FR_133_NO_S_63 =
  '⛔ そのために `S-63` を書いてはならない（MUST NOT） —— 画面の値 `delayDiagnosticsShown`（`_assets/tbl-settings.md` の 表 T-206 の `S-445`）を真にする。'

function cellOf(table: string, id: string, heading: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(row.by[heading] ?? '')
}

type Loose = Record<string, unknown>

const S = (day: number): string => `2026-04-${String(day).padStart(2, '0')}T08:00:00`
const F = (day: number): string => `2026-04-${String(day).padStart(2, '0')}T17:00:00`

function chainDocument(statusDate: string | null): Document {
  const raw = rowDocument([
    { id: 'r0', parentId: null },
    { id: 'r1', parentId: 'r0' },
  ])
  raw.schedule.project.statusDate = statusDate
  raw.schedule.project.uidHighWaterMark = 1000
  raw.schedule.tasks = [
    taskOf(100, { name: 'Programme', start: S(6), finish: F(10), actualStart: S(6) }),
    taskOf(101, { name: 'Design', wbsParentUid: 100, start: S(6), finish: F(8), actualStart: S(6), percentComplete: 40 }),
    taskOf(102, {
      name: 'Build',
      wbsParentUid: 100,
      start: S(9),
      finish: F(10),
      dependencies: [{ predecessorUid: 101, linkType: 1, lag: 0, lagFormat: 7, carry: {}, carryElements: [] }],
    }),
  ]
  raw.schedule.taskGroupMembers = [
    { taskUid: 100, groupId: 'r0', stackOrder: null },
    { taskUid: 101, groupId: 'r1', stackOrder: null },
    { taskUid: 102, groupId: 'r1', stackOrder: null },
  ]
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document
}

const HISTORY_LIMITS = { maxSteps: NOT_STORED_LIMITS['S-94'], maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024 }
const SETTINGS_LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }
const SCREEN: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }
const READ_AT = '2026-08-20T08:30:00Z'

function frameOf(document: Document): FrameSnapshot {
  const settings = document.documentSettings
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(document.schedule, settings, regions)
  const geometry = geometryFromLayout(document.schedule, settings, layout, regions, emptySelection(), null)
  return { layout, geometry, regions }
}

const CHANGE_WATCHERS = emptyChangeWatchers()
const WRITERS: string[] = []

interface Bench {
  readonly api: AgentApi
  readonly state: {
    document: Document
    history: EditHistory<ChangeStep>
    dialogue: DialogueLog
    selection: Selection
  }
}

let benchCount = 0

function bench(statusDate: string | null): Bench {
  benchCount += 1
  const writerName = `cr-561 agent ${benchCount}`
  WRITERS.push(writerName)
  const state = {
    document: chainDocument(statusDate),
    history: { done: [], undone: [] } as EditHistory<ChangeStep>,
    dialogue: emptyDialogueLog(),
    selection: emptySelection(),
    isDeliveringNotices: false,
  }
  const snapshotOf = (): AgentSnapshot => ({
    defaultRowName: DEFAULT_ROW_NAME,
    document: state.document,
    selection: state.selection,
    dialogue: state.dialogue,
    frame: frameOf(state.document),
    exportScene: null,
    isGestureInFlight: false,
    isEditingInPlace: false,
    isDeliveringNotices: state.isDeliveringNotices,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: SETTINGS_LIMITS,
    readAt: READ_AT,
  })
  const wiring: AgentApiWiring = {
    source: { readSnapshot: snapshotOf },
    changeWatchers: CHANGE_WATCHERS,
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next) => {
        state.document = next.document
        state.history = next.history
      },
    },
    audience: {
      deliver: (document, hasMovedSchedule) => {
        state.isDeliveringNotices = true
        try {
          notifyChangeWatchers(CHANGE_WATCHERS, { document, hasMovedSchedule, dialogue: state.dialogue })
        } finally {
          state.isDeliveringNotices = false
        }
      },
    },
    dialogueHolder: {
      read: () => state.dialogue,
      replace: (next) => {
        state.dialogue = next
      },
    },
    dialogueAudience: {
      deliver: (log) => {
        state.dialogue = log
      },
    },
    rasterizer: undefined,
    takeInDocument: undefined,
    appShell: undefined,
    writerName,
    schemaVersion: String(state.document.schemaVersion),
  }
  return { api: installAgentApi(wiring), state }
}

afterEach(() => {
  for (const one of WRITERS) unwatchChanges(CHANGE_WATCHERS, one)
  WRITERS.length = 0
})

/** @purity semi-pure-b */
function readDelayDiagnosticsOf(api: AgentApi): unknown {
  const member = (api as unknown as { readDelayDiagnostics?: () => unknown }).readDelayDiagnostics
  if (typeof member !== 'function') throw new Error('AM-19: the Agent API has no member readDelayDiagnostics')
  return member.call(api)
}

/** @purity pure */
function diagnosed(document: Document): unknown {
  const seam = (scheduleEntry as unknown as { diagnoseDelay?: (d: Document, c: unknown) => unknown }).diagnoseDelay
  if (typeof seam !== 'function') throw new Error('S-1: the Schedule entry (schedule.ts) publishes no diagnoseDelay')
  return seam(document, scheduleEntry.workingCalendarOf(document.schedule))
}

function reachable(value: unknown, seen = new Set<unknown>()): readonly object[] {
  if (value === null || typeof value !== 'object' || seen.has(value)) return []
  seen.add(value)
  const found: object[] = [value]
  const inside = value instanceof Map ? [...value.keys(), ...value.values()] : value instanceof Set ? [...value] : Object.values(value)
  for (const one of inside) found.push(...reachable(one, seen))
  return found
}

describe('table T-107 AM-19 -- the clauses these cases are driven by', () => {
  it('AM-19 is readDelayDiagnostics, and still says what it returns and what it leaves alone', () => {
    expect(cellOf('T-107', 'AM-19', '確定名')).toBe('`readDelayDiagnostics`')
    expect(cellOf('T-107', 'AM-19', '何を担うか')).toContain(AM_19_RETURNS)
    expect(cellOf('T-107', 'AM-19', '何を担うか')).toContain(AM_19_NO_WRITE)
    expect(cellOf('T-035', 'AG-4', specTable('T-035').headings[1] ?? '')).toContain(AG_4_COPY)
    expect(cellOf('T-035', 'AG-4', specTable('T-035').headings[1] ?? '')).toContain(AG_4_UNCHANGED)
    expect(REQUIREMENTS).toContain(FR_134_TWO_READERS)
    expect(REQUIREMENTS).toContain(FR_133_NO_S_63)
  })
})

describe(`AM-19 readDelayDiagnostics -- ${AM_19_RETURNS}`, () => {
  it(`${FR_134_TWO_READERS} -- the value is the report diagnoseDelay makes of the open document`, () => {
    const one = bench(F(15))
    expect(readDelayDiagnosticsOf(one.api)).toEqual(diagnosed(one.state.document))
  })

  it('with no status date it still answers the report (FR-130 DX-1), not a throw', () => {
    const one = bench(null)
    expect(readDelayDiagnosticsOf(one.api)).toEqual(diagnosed(one.state.document))
  })

  it(`${AG_4_COPY} -- frozen all the way down`, () => {
    const read = readDelayDiagnosticsOf(bench(F(15)).api)
    expect(reachable(read).length).toBeGreaterThan(0)
    expect(reachable(read).every((one) => Object.isFrozen(one))).toBe(true)
  })

  it(`${AG_4_COPY} -- shares no object with the running document`, () => {
    const one = bench(F(15))
    const theirs = new Set<object>(reachable(one.state.document))
    expect(reachable(readDelayDiagnosticsOf(one.api)).filter((part) => theirs.has(part))).toEqual([])
  })

  it(`${AG_4_UNCHANGED} -- a write to the answer throws and the next read is as before`, () => {
    const one = bench(F(15))
    const first = readDelayDiagnosticsOf(one.api) as Loose
    expect(() => {
      first['tampered'] = true
    }).toThrow()
    expect(readDelayDiagnosticsOf(one.api)).toEqual(diagnosed(one.state.document))
  })
})

describe(`AM-19 readDelayDiagnostics -- ${AM_19_NO_WRITE}`, () => {
  it('the document, the undo history and the selection stay as they were', () => {
    const one = bench(F(15))
    const document = one.state.document
    const before = structuredClone(document)
    const selection = one.state.selection
    readDelayDiagnosticsOf(one.api)
    expect(one.state.document).toBe(document)
    expect(one.state.document).toEqual(before)
    expect(one.state.history.done).toHaveLength(0)
    expect(one.state.selection).toBe(selection)
  })

  it(`${FR_133_NO_S_63} -- S-63 (progressMarkerVisible) is not written`, () => {
    const one = bench(F(15))
    const shown = one.state.document.documentSettings.progressMarkerVisible
    readDelayDiagnosticsOf(one.api)
    expect(one.state.document.documentSettings.progressMarkerVisible).toBe(shown)
  })
})
