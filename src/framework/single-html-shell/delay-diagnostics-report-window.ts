// SingleHtmlShell -- answers the Delay Diagnostics Report window's entries: its table and frame, IC-108 and IC-140.
// @unit      UF-195  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { DelayDiagnosticsReport, Schedule } from '../../entity/document-model/schedule/schedule'
import { writeClipboard, type Clipboard } from '../../adapter/clipboard-gateway/clipboard-gateway'
import type { DocumentFileFault, FileStore } from '../../adapter/file-gateway/file-gateway'
import {
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportFileNameOf,
  delayDiagnosticsReportMarkdownOf,
  type DelayDiagnosticsReportWindow,
  type DisplayLanguage,
  type IconId,
} from '../../adapter/screen-renderer/screen-renderer'

export const DELAY_DIAGNOSTICS_REPORT_SURFACE = 'Delay Diagnostics Report'

const COPY_ENTRY: IconId = 'IC-108'
const EXPORT_ENTRY: IconId = 'IC-140'
const MARKDOWN_EXTENSION = '.md'

export interface ReportHeld {
  readonly window: DelayDiagnosticsReportWindow
  readonly report: DelayDiagnosticsReport
  readonly schedule: Schedule
  readonly documentName: string
  readonly language: DisplayLanguage
}

export interface ReportOutlets {
  readonly clipboard: Clipboard | undefined
  readonly files: FileStore | undefined
  readonly confirmOverwrite: () => Promise<boolean>
  readonly raiseCopyRefused: () => void
  readonly raiseFileFault: (fault: DocumentFileFault) => void
  readonly holdWindow: (window: DelayDiagnosticsReportWindow | null) => void
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
  const text = delayDiagnosticsReportMarkdownOf(held.window, held.report, held.schedule, held.language, stamp)
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

// see T-346, IC-108, IC-140, RW-1
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
  const answer = delayDiagnosticsReportAfterEntry(held.window, entry, filterColumn, held, listed)
  if (answer === null) return false
  outlets.holdWindow(answer.window)
  return true
}
