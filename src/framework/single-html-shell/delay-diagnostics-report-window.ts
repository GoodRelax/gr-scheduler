// SingleHtmlShell -- answers the Delay Diagnostics Report window's entries: its tables and frame, IC-108, IC-140 and the fixes (IC-154 .. IC-160).
// @unit      UF-195  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import { proposeDelayFixes, type DelayFixRow } from '../../entity/document-model/schedule/delay-fixes'
import type { DelayDiagnosticsReport, Schedule } from '../../entity/document-model/schedule/schedule'
import { writeClipboard, type Clipboard } from '../../adapter/clipboard-gateway/clipboard-gateway'
import type { TableView } from '../../use-case/advance-screen-session/advance-screen-session'
import type { DocumentFileFault, FileStore } from '../../adapter/file-gateway/file-gateway'
import {
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportFileNameOf,
  delayDiagnosticsReportMarkdownOf,
  type DelayDiagnosticsReportWindow,
  type DisplayLanguage,
  type IconId,
  type ScreenPart,
} from '../../adapter/screen-renderer/screen-renderer'

export const DELAY_DIAGNOSTICS_REPORT_SURFACE = 'Delay Diagnostics Report'

const COPY_ENTRY: IconId = 'IC-108'
const EXPORT_ENTRY: IconId = 'IC-140'
const MARKDOWN_EXTENSION = '.md'

export interface ReportHeld {
  readonly window: DelayDiagnosticsReportWindow
  readonly view: TableView
  readonly report: DelayDiagnosticsReport
  readonly schedule: Schedule
  readonly documentName: string
  readonly language: DisplayLanguage
  readonly fixTables?: DelayFixTables
}

export type DelayFixTables = NonNullable<Parameters<typeof delayDiagnosticsReportAfterEntry>[4]['fixTables']>
type DelayReportAsk = NonNullable<NonNullable<ReturnType<typeof delayDiagnosticsReportAfterEntry>>['asked']>
type DelayFixWriteForm = Extract<DelayReportAsk, { readonly kind: 'fixWrite' }>['writeForm']
type FixJumpCell = Extract<DelayReportAsk, { readonly kind: 'fixJump' }>['target']

export interface ReportOutlets {
  readonly clipboard: Clipboard | undefined
  readonly files: FileStore | undefined
  readonly confirmOverwrite: () => Promise<boolean>
  readonly raiseCopyRefused: () => void
  readonly raiseFileFault: (fault: DocumentFileFault) => void
  readonly holdWindow: (window: DelayDiagnosticsReportWindow | null) => void
  readonly writeView: (view: TableView) => void
  readonly askFixWrite?: (writeForm: DelayFixWriteForm, fixBundle: readonly DelayFixRow[]) => void
  readonly jumpToFix?: (target: FixJumpCell) => void
}

// see RW-6
/** @purity pure */
function madeAtText(now: Date): string {
  const two = (value: number): string => String(value).padStart(2, '0')
  return `${now.getFullYear()}/${two(now.getMonth() + 1)}/${two(now.getDate())} ${two(now.getHours())}:${two(now.getMinutes())}`
}

// see FR-134, RW-6, RW-7, T-227
// WHY: a text that is no document: never the opened file (FR-096 holds one export entry), always asked before an occupied file.
// TRAP: started inside the input's own call; deferred, the browser can refuse the clipboard write and the picker.
/** @purity non-pure */
function handOutMarkdown(entry: IconId, held: ReportHeld, outlets: ReportOutlets): void {
  const stamp = { documentName: held.documentName, madeAt: madeAtText(new Date()) }
  const text = delayDiagnosticsReportMarkdownOf(held.window, held.view, held.report, held.schedule, held.language, stamp)
  if (entry === COPY_ENTRY) {
    const seam = outlets.clipboard
    if (seam === undefined) return outlets.raiseCopyRefused()
    void writeClipboard(seam, { kind: 'document', text }).then((writing) => (writing.ok ? undefined : outlets.raiseCopyRefused()))
    return
  }
  const files = outlets.files
  if (files === undefined) return
  void files
    .writeChosenFile({
      bytes: new TextEncoder().encode(text),
      suggestedFileName: delayDiagnosticsReportFileNameOf(held.documentName, held.report.statusDate),
      extension: MARKDOWN_EXTENSION,
      shouldBecomeOpenedFile: false,
      askToWriteOver: async (there) => !(there.kind === 'occupied' && there.bytes.byteLength > 0) || (await outlets.confirmOverwrite()),
    })
    .then((writing) => (writing.ok ? undefined : outlets.raiseFileFault(writing.fault)))
}

// see T-346, IC-108, IC-140, RW-1, TV-8, UN-20
// WHY: the view is written before the window is held, so a close that lifts the filter writes it once (CM-92).
/** @purity non-pure */
export function answerDelayDiagnosticsReportEntry(
  entry: IconId,
  filterColumn: string | null,
  held: ReportHeld | null,
  outlets: ReportOutlets,
  listed?: readonly string[] | null,
): boolean {
  if (held === null) return false
  if (entry === COPY_ENTRY || entry === EXPORT_ENTRY) {
    handOutMarkdown(entry, held, outlets)
    return true
  }
  const answer = delayDiagnosticsReportAfterEntry(held.window, held.view, entry, filterColumn, held, listed)
  return answer !== null && handOn(answer, outlets)
}

// see RW-12, RW-14, FR-155
/** @purity non-pure */
function handOn(answer: NonNullable<ReturnType<typeof delayDiagnosticsReportAfterEntry>>, outlets: ReportOutlets): true {
  outlets.writeView(answer.view)
  outlets.holdWindow(answer.window)
  if (answer.asked?.kind === 'fixWrite') outlets.askFixWrite?.(answer.asked.writeForm, answer.asked.fixBundle)
  if (answer.asked?.kind === 'fixJump') outlets.jumpToFix?.(answer.asked.target)
  return true
}

/** @purity pure */
export function jumpLandingOf(cell: NonNullable<ScreenPart['searchJumpTarget']>) {
  if (cell.kind !== 'task') return { landedTarget: cell, landedRelatedTasks: [] }
  return { landedTarget: { kind: 'task' as const, taskUid: cell.taskUid }, landedRelatedTasks: cell.relatedTaskUids ?? [] }
}

/** @purity pure */
export function withoutDelayFixes(window: DelayDiagnosticsReportWindow): DelayDiagnosticsReportWindow {
  if (window.fixes === undefined) return window
  return { shown: window.shown, panel: window.panel, isInFront: window.isInFront }
}

const NO_PICKS = {}

// see RW-16, DX-11, DX-12, FR-155
// WHY: the proposals are made again on each diagnosis (a new document) and each pick, never per frame (rule 04).
/** @purity non-pure */
export function delayFixTablesKeeper() {
  let made: { readonly of: Document; readonly report: DelayDiagnosticsReport; readonly picks: unknown; readonly rows: readonly DelayFixRow[] } | null = null
  return (diagnosis: { readonly of: Document; readonly report: DelayDiagnosticsReport }, window: DelayDiagnosticsReportWindow, log: readonly DelayFixRow[]): DelayFixTables => {
    const picks = window.fixes?.picks ?? NO_PICKS
    const isFresh = made !== null && made.of === diagnosis.of && made.report === diagnosis.report && made.picks === picks
    if (!isFresh) made = { ...diagnosis, picks, rows: proposeDelayFixes(diagnosis.of, diagnosis.report, picks) }
    return { proposals: made?.rows ?? [], log: log.map((row) => ({ row, fixedAt: null })) }
  }
}
