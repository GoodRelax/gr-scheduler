/**
 * Adapter layer: import orchestration (IO-L1-001/002/006, ITEM-L1-008,
 * ARCH-C-024/026). Reads a user-chosen File, routes it to the correct pure codec
 * / sanitizer by inspecting its bytes (never trusting the extension alone,
 * security-design §3.5), and returns either a whole ScheduleDocument (JSON /
 * MSPDI) or a single sanitized icon ImportedAsset (SVG / PNG). Nothing reaches
 * the store until it has passed the trust-boundary gate.
 */

import type { ImportedAsset, ScheduleDocument } from '../../domain/model/schedule-model.js';
import { deserializeScheduleDocument } from '../../domain/usecase/json-codec.js';
import { importMspdi } from '../../domain/usecase/mspdi-codec.js';
import {
  ImportRejectedError,
  sanitizeSvg,
  svgToDataUri,
  validatePng,
} from '../../domain/usecase/import-sanitizer.js';
import { readFileAsBytes, readFileAsText } from './file-io.js';
import { createLogger } from '../../app/logger.js';

const log = createLogger('grsch:import');

/** A whole-document import (replaces the current document, DATA-JSON-001). */
export interface DocumentImportResult {
  readonly resultKind: 'document';
  readonly document: ScheduleDocument;
}

/** A single sanitized icon import (added to the document's asset pool). */
export interface AssetImportResult {
  readonly resultKind: 'asset';
  readonly asset: ImportedAsset;
}

/** The outcome of a successful import. */
export type ImportResult = DocumentImportResult | AssetImportResult;

let assetCounter = 0;

/** Allocate a process-unique imported-asset id. */
function nextAssetId(): string {
  assetCounter += 1;
  return `asset-${Date.now().toString(36)}-${assetCounter}`;
}

/** True when the bytes begin with the PNG signature. */
function looksLikePng(bytes: Uint8Array): boolean {
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

/** True when trimmed text begins an SVG/XML document. */
function looksLikeSvg(text: string): boolean {
  const head = text.trimStart().slice(0, 256).toLowerCase();
  return head.includes('<svg') || head.startsWith('<?xml');
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

/**
 * Import an icon file (SVG or PNG) as a sanitized ImportedAsset (ITEM-L1-008,
 * ITEM-L2-001). SVG is allowlist-sanitized; PNG is magic-byte/dimension
 * validated. Any other format is rejected (§3.5 C-10).
 *
 * @param file - The chosen icon file.
 * @returns An asset import result.
 * @throws {ImportRejectedError} On unsupported format or sanitization failure.
 */
export async function importIconFile(file: File): Promise<AssetImportResult> {
  const bytes = await readFileAsBytes(file);
  if (looksLikePng(bytes)) {
    const validated = validatePng(bytes);
    log.info('icon_imported', { file_name: file.name, asset_format: 'png', width: validated.width, height: validated.height });
    return {
      resultKind: 'asset',
      asset: { id: nextAssetId(), assetFormat: 'png', sanitizedDataUri: validated.sanitizedDataUri },
    };
  }

  const text = new TextDecoder().decode(bytes);
  if (looksLikeSvg(text)) {
    const sanitized = sanitizeSvg(text);
    log.info('icon_imported', { file_name: file.name, asset_format: 'svg', byte_length: sanitized.length });
    return {
      resultKind: 'asset',
      asset: { id: nextAssetId(), assetFormat: 'svg', sanitizedDataUri: svgToDataUri(sanitized) },
    };
  }

  throw new ImportRejectedError('Unsupported icon format (only sanitized SVG and PNG are accepted)');
}
