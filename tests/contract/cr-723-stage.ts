// CR-723 spec-only stage: a small document that carries the three tables' views, the seam names of CR-723 section 5 and the one write path.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { ColumnFilter, ColumnSort, DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import type { ChangeStep, DocumentCommand, SettingsLimits, WriteMoment } from '../../src/use-case/apply-document-change/apply-document-change'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { redoEdit } from '../../src/use-case/redo-edit/redo-edit'
import * as screenValues from '../../src/use-case/advance-screen-session/screen-values'
import type { TableView, TableVisibility, VisibilityTable } from '../../src/use-case/advance-screen-session/screen-values'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'

import { ALPHA, BRAVO, CHARLIE, DELTA, ECHO, IDLE, SATO, TANAKA, documentText, scheduleFixture, templateCopy, type Loose } from './cr-723-fixture'
import { unbroken } from './spec-table'

export { ALPHA, BRAVO, CHARLIE, DELTA, ECHO, IDLE, SATO, TANAKA, documentText, scheduleFixture, templateCopy }
export type { Loose }
export type { ColumnFilter, ColumnSort, TableView, TableVisibility, VisibilityTable }

const SPEC = join(process.cwd(), 'docs', 'spec')
const read = (...parts: string[]): string => unbroken(readFileSync(join(SPEC, ...parts), 'utf8'))

export const REQUIREMENTS = read('01-04-requirements.md')
export const GLOSSARY = read('_assets', 'tbl-glossary.md')
export const SETTINGS_BOOK = read('_assets', 'tbl-settings.md')
export const SETTINGS_SOURCE = JSON.parse(readFileSync(join(SPEC, '_source', 'settings.json'), 'utf8')) as unknown

export const TABLES: readonly VisibilityTable[] = ['searchPanel', 'delayDiagnosticsReport', 'resourceList']

export const BUILT_VERSION: string = (startupTemplate as { schemaVersion: string }).schemaVersion

// see S-560, S-561, S-562, S-563, S-564, S-565, S-566, S-567, S-568, S-569, S-570, S-571, S-572
export const KEYS_OF: Readonly<Record<VisibilityTable, readonly string[]>> = {
  searchPanel: ['columnFilters', 'hiddenTaskUids', 'isScheduleFilterApplied', 'sort'],
  delayDiagnosticsReport: ['columnFilters', 'hiddenTaskUids', 'isScheduleFilterApplied', 'sort'],
  resourceList: ['columnFilters', 'hiddenResourceUids', 'isScheduleFilterApplied', 'isUnassignedHidden', 'sort'],
}

// see TV-2
export const ALL_SHOWN: TableVisibility = { hiddenKeys: [], isUnassignedHidden: false, isApplied: false }
export const DEFAULT_VIEW: TableView = { visibility: ALL_SHOWN, columnFilters: [], sort: null }

export const view = (part: Partial<TableView> = {}): TableView => ({ ...DEFAULT_VIEW, ...part })

// WHY: T-372 names the date fields fromDate and toDate and takes the schedule's date text.
export const STATUS_FILTER: ColumnFilter = { column: 'SQ-5', hiddenValues: ['Done'], fromDate: null, toDate: null }
export const DATE_FILTER: ColumnFilter = { column: 'SQ-3', hiddenValues: [], fromDate: '2026-04-02T00:00:00', toDate: '2026-04-06T00:00:00' }
export const BY_RESOURCE: ColumnSort = { column: 'SQ-2', direction: 'descending' }

export const SEARCH_VIEW: TableView = view({
  visibility: { hiddenKeys: [ALPHA, BRAVO], isUnassignedHidden: false, isApplied: true },
  columnFilters: [STATUS_FILTER, DATE_FILTER],
  sort: BY_RESOURCE,
})
export const REPORT_VIEW: TableView = view({
  visibility: { hiddenKeys: [DELTA], isUnassignedHidden: false, isApplied: false },
  columnFilters: [{ column: 'DT-1', hiddenValues: ['Done'], fromDate: null, toDate: null }],
  sort: { column: 'DT-4', direction: 'ascending' },
})
export const RESOURCE_VIEW: TableView = view({
  visibility: { hiddenKeys: [TANAKA], isUnassignedHidden: true, isApplied: true },
  columnFilters: [{ column: 'RQ-2', hiddenValues: [''], fromDate: null, toDate: null }],
  sort: { column: 'RQ-4', direction: 'descending' },
})

/** @purity pure */
export function openedFrom(text: string): Document {
  const opened = documentFromJson(text, BUILT_VERSION)
  if (!opened.ok) throw new Error(`refused: ${JSON.stringify(opened.faults)}`)
  return opened.document
}

/** @purity pure */
export function tableViewsText(views: Readonly<Record<VisibilityTable, TableView>>): Loose {
  const rows = (one: TableView): Loose => ({
    isScheduleFilterApplied: one.visibility.isApplied,
    columnFilters: one.columnFilters,
    sort: one.sort,
  })
  return {
    searchPanel: { ...rows(views.searchPanel), hiddenTaskUids: views.searchPanel.visibility.hiddenKeys },
    delayDiagnosticsReport: { ...rows(views.delayDiagnosticsReport), hiddenTaskUids: views.delayDiagnosticsReport.visibility.hiddenKeys },
    resourceList: {
      ...rows(views.resourceList),
      hiddenResourceUids: views.resourceList.visibility.hiddenKeys,
      isUnassignedHidden: views.resourceList.visibility.isUnassignedHidden,
    },
  }
}

export const VIEWS_SAVED: Readonly<Record<VisibilityTable, TableView>> = {
  searchPanel: SEARCH_VIEW,
  delayDiagnosticsReport: REPORT_VIEW,
  resourceList: RESOURCE_VIEW,
}

/** @purity pure */
export function savedTextOf(document: Document): string {
  return jsonFromDocument(document)
}

/** @purity pure */
export function savedObjectOf(document: Document): Loose {
  return JSON.parse(jsonFromDocument(document)) as Loose
}

/** @purity pure */
export function tableViewsIn(saved: Loose): Record<string, Loose> {
  return ((saved['documentSettings'] as Loose)['tableViews'] ?? {}) as Record<string, Loose>
}

// see CM-92
export const setTableView = (table: VisibilityTable, one: TableView): DocumentCommand =>
  ({ kind: 'setTableView', table, view: one }) as unknown as DocumentCommand

// WHY: until the seam is exported a call throws, so the case reds for the right reason.
/** @purity pure */
export function tableViewOf(settings: DocumentSettings, table: VisibilityTable): TableView {
  const seam = (screenValues as unknown as { tableViewOf?: (settings: DocumentSettings, table: VisibilityTable) => TableView }).tableViewOf
  if (seam === undefined) throw new Error('the seam tableViewOf(settings, table) is not exported from use-case/advance-screen-session/screen-values')
  return seam(settings, table)
}

/** @purity pure */
export function viewsOf(document: Document): Readonly<Record<VisibilityTable, TableView>> {
  return {
    searchPanel: tableViewOf(document.documentSettings, 'searchPanel'),
    delayDiagnosticsReport: tableViewOf(document.documentSettings, 'delayDiagnosticsReport'),
    resourceList: tableViewOf(document.documentSettings, 'resourceList'),
  }
}

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
export const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
export const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

export interface Held {
  readonly document: Document
  readonly history: EditHistory<ChangeStep>
}

export const heldOf = (document: Document): Held => ({ document, history: EMPTY_HISTORY })

// see FR-031
/** @purity pure */
export function written(held: Held, commands: readonly DocumentCommand[]): Held {
  const plan = planDocumentChange({
    defaultTaskGroupName: 'Row',
    document: held.document,
    readStamp: held.document.documentStamp,
    commands,
    moment: CALM,
    history: held.history,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'tester',
    updatedUtc: '2026-10-11T00:00:00Z',
  })
  if (!plan.ok) throw new Error(`refused: ${JSON.stringify(plan.refusal)}`)
  return { document: plan.document, history: plan.history }
}

/** @purity pure */
export function undone(held: Held): Held {
  const outcome = undoEdit(held)
  if (!outcome.undone) throw new Error('nothing to undo')
  return outcome.next
}

/** @purity pure */
export function redone(held: Held): Held {
  const outcome = redoEdit(held)
  if (!outcome.redone) throw new Error('nothing to redo')
  return outcome.next
}

export const stepsOf = (held: Held): number => held.history.done.length
