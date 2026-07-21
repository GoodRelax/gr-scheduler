/**
 * Adapter layer: import orchestration (IO-L1-001/002/006, ARCH-C-024/026). Reads a
 * user-chosen File, routes it to the correct pure codec by inspecting its content
 * (never trusting the extension alone), and returns a whole ScheduleDocument
 * (JSON / MSPDI). Nothing reaches the store until it has passed the trust-boundary
 * gate. The external image-import path (SVG/PNG) was withdrawn in CR-004 Part 6a.
 */

import type { ScheduleDocument } from '../../domain/model/schedule-model.js';
import { deserializeScheduleDocument } from '../../domain/usecase/json-codec.js';
import { importMspdi } from '../../domain/usecase/mspdi-codec.js';
import { ImportRejectedError } from '../../domain/usecase/import-sanitizer.js';
import { readFileAsText } from './file-io.js';
import { createLogger } from '../../app/logger.js';

const log = createLogger('grsch:import');

/** A whole-document import (replaces the current document, DATA-JSON-001). */
export interface DocumentImportResult {
  readonly resultKind: 'document';
  readonly document: ScheduleDocument;
}

/**
 * Import a document file (JSON or MSPDI XML). Content is sniffed: a leading `<`
 * routes to MSPDI, otherwise JSON.
 *
 * @param file - The chosen file.
 * @returns A document import result.
 * @throws {ImportRejectedError} On any validation/sanitization failure.
 */
export async function importDocumentFile(file: File): Promise<DocumentImportResult> {
  const text = await readFileAsText(file);
  const isXml = text.trimStart().startsWith('<');
  const document = isXml ? importMspdi(text) : deserializeScheduleDocument(text);
  log.info('document_imported', {
    file_name: file.name,
    import_format: isXml ? 'mspdi' : 'json',
    item_count: document.items.length,
  });
  return { resultKind: 'document', document };
}

/**
 * Import a JSON file as a BASELINE reference document (CR-002 Part 3 /
 * PLAN-L1-004 / DATA-JSON-016). The baseline is JSON-ONLY (MSPDI XML is not a valid
 * baseline source), so a leading `<` is rejected here rather than routed to the
 * MSPDI codec. The returned document is a read-only past-plan snapshot; the caller
 * holds it as runtime state and never merges it into the edited document.
 *
 * @param file - The chosen JSON file.
 * @returns A document import result carrying the baseline document.
 * @throws {ImportRejectedError} When the file is not JSON, or on any codec failure.
 */
export async function importBaselineDocumentFile(file: File): Promise<DocumentImportResult> {
  const text = await readFileAsText(file);
  if (text.trimStart().startsWith('<')) {
    throw new ImportRejectedError('Baseline reference must be a JSON document, not MSPDI XML');
  }
  const document = deserializeScheduleDocument(text);
  log.info('baseline_imported', {
    file_name: file.name,
    item_count: document.items.length,
  });
  return { resultKind: 'document', document };
}
