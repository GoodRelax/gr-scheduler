/**
 * UseCase layer: MSPDI (MS Project Data Interchange) XML codec (IO-L1-002,
 * ARCH-C-018, DATA-MSPDI-001..006). Pure string <-> model, no DOM.
 *
 * MSPDI assumes "one task = one row = one bar" and has no representation for most
 * gr-scheduler concepts (multi-bar, icons, colors, comments, watermark,
 * previousPlan, viewState, imported assets). Per 40-data-format §2 those are
 * preserved for round-trip in a namespaced JSON sidecar embedded in the Project
 * Notes field (DATA-MSPDI-006); the sidecar carries the entire serialized
 * document, so Export -> Import is loss-free when the sidecar is present.
 *
 * The standard MSPDI elements (Project/Title, Tasks/Task with UID/Name/Start/
 * Finish/Milestone/OutlineLevel, PredecessorLink) are ALSO emitted so a real MS
 * Project can read tasks/dates/dependencies/hierarchy. On import the sidecar is
 * preferred; without it a minimal document is reconstructed from those standard
 * elements (lossy, per spec).
 *
 * Security: import rejects DOCTYPE/ENTITY (XXE / billion-laughs, §3.4) and runs
 * size limits before any scanning. The sidecar is base64 so it never introduces
 * XML-special characters into Notes.
 */

import type {
  Dependency,
  ScheduleDocument,
  ScheduleItem,
  Section,
  Row,
  ViewState,
} from '../model/schedule-model.js';
import {
  ImportRejectedError,
  IMPORT_LIMITS,
  assertWithinByteLimit,
  bytesToBase64,
  rejectXmlDoctype,
} from './import-sanitizer.js';
import {
  CURRENT_SCHEMA_VERSION,
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from './json-codec.js';

/** Marker prefix identifying the gr-scheduler sidecar inside Project Notes. */
const SIDECAR_PREFIX = 'grsch-sidecar:';

/** Default FinishToStart dependency type (DATA-MSPDI-004). */
const FINISH_TO_START = 1;

// ---------------------------------------------------------------------------
// UTF-8 <-> base64 helpers (pure, cross-env)
// ---------------------------------------------------------------------------

function stringToUtf8Bytes(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const codePoint of text) {
    const code = codePoint.codePointAt(0) ?? 0;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

const BASE64_LOOKUP = ((): Record<string, number> => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const table: Record<string, number> = {};
  for (let index = 0; index < alphabet.length; index += 1) {
    table[alphabet[index] as string] = index;
  }
  return table;
})();

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let index = 0; index < clean.length; index += 4) {
    const c0 = BASE64_LOOKUP[clean[index] as string] ?? 0;
    const c1 = BASE64_LOOKUP[clean[index + 1] as string] ?? 0;
    const c2 = BASE64_LOOKUP[clean[index + 2] as string] ?? 0;
    const c3 = BASE64_LOOKUP[clean[index + 3] as string] ?? 0;
    bytes.push((c0 << 2) | (c1 >> 4));
    if (index + 2 < clean.length) {
      bytes.push(((c1 & 0x0f) << 4) | (c2 >> 2));
    }
    if (index + 3 < clean.length) {
      bytes.push(((c2 & 0x03) << 6) | c3);
    }
  }
  return Uint8Array.from(bytes);
}

function utf8BytesToString(bytes: Uint8Array): string {
  let output = '';
  let index = 0;
  while (index < bytes.length) {
    const byte0 = bytes[index++] ?? 0;
    if (byte0 < 0x80) {
      output += String.fromCodePoint(byte0);
    } else if (byte0 < 0xe0) {
      const byte1 = bytes[index++] ?? 0;
      output += String.fromCodePoint(((byte0 & 0x1f) << 6) | (byte1 & 0x3f));
    } else if (byte0 < 0xf0) {
      const byte1 = bytes[index++] ?? 0;
      const byte2 = bytes[index++] ?? 0;
      output += String.fromCodePoint(((byte0 & 0x0f) << 12) | ((byte1 & 0x3f) << 6) | (byte2 & 0x3f));
    } else {
      const byte1 = bytes[index++] ?? 0;
      const byte2 = bytes[index++] ?? 0;
      const byte3 = bytes[index++] ?? 0;
      output += String.fromCodePoint(
        ((byte0 & 0x07) << 18) | ((byte1 & 0x3f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f),
      );
    }
  }
  return output;
}

// ---------------------------------------------------------------------------
// XML text helpers
// ---------------------------------------------------------------------------

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Format an ISO calendar date as an MSPDI dateTime at midnight. */
function toMspdiDateTime(isoDate: string): string {
  return `${isoDate}T00:00:00`;
}

/** Read an MSPDI dateTime back to an ISO calendar date. */
function toIsoDate(dateTime: string): string {
  return dateTime.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Serialize a ScheduleDocument to MSPDI XML (IO-L1-002). Emits standard MSPDI
 * task/dependency/hierarchy elements plus a base64 sidecar (in Project Notes)
 * that carries the full document for loss-free re-import.
 *
 * @param document - The document to export.
 * @returns MSPDI XML text.
 */
export function exportMspdi(document: ScheduleDocument): string {
  const uidByItemId = new Map<string, number>();
  document.items.forEach((item, index) => uidByItemId.set(item.id, index + 1));

  const predecessorsByTargetId = new Map<string, Dependency[]>();
  for (const dependency of document.dependencies ?? []) {
    const bucket = predecessorsByTargetId.get(dependency.toItemId);
    if (bucket) {
      bucket.push(dependency);
    } else {
      predecessorsByTargetId.set(dependency.toItemId, [dependency]);
    }
  }

  const taskXml = document.items
    .map((item) => renderTaskXml(item, uidByItemId, predecessorsByTargetId))
    .join('');

  const sidecarBase64 = bytesToBase64(stringToUtf8Bytes(serializeScheduleDocument(document)));
  const notes = `${SIDECAR_PREFIX}${sidecarBase64}`;

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Project xmlns="http://schemas.microsoft.com/project">' +
    `<Title>${escapeXml(document.title)}</Title>` +
    `<CreationDate>${toMspdiDateTime(document.epochDate)}</CreationDate>` +
    `<Notes>${escapeXml(notes)}</Notes>` +
    `<Tasks>${taskXml}</Tasks>` +
    '</Project>'
  );
}

function renderTaskXml(
  item: ScheduleItem,
  uidByItemId: Map<string, number>,
  predecessorsByTargetId: Map<string, Dependency[]>,
): string {
  const uid = uidByItemId.get(item.id) ?? 0;
  const isMilestone = item.itemKind === 'milestone' || item.endDate === null;
  const finishDate = item.endDate ?? item.startDate;
  const name = item.fullName ?? item.abbrev;
  const predecessorLinks = (predecessorsByTargetId.get(item.id) ?? [])
    .map((dependency) => {
      const predecessorUid = uidByItemId.get(dependency.fromItemId) ?? 0;
      return (
        '<PredecessorLink>' +
        `<PredecessorUID>${predecessorUid}</PredecessorUID>` +
        `<Type>${FINISH_TO_START}</Type>` +
        '</PredecessorLink>'
      );
    })
    .join('');
  return (
    '<Task>' +
    `<UID>${uid}</UID>` +
    `<Name>${escapeXml(name)}</Name>` +
    `<Start>${toMspdiDateTime(item.startDate)}</Start>` +
    `<Finish>${toMspdiDateTime(finishDate)}</Finish>` +
    `<Milestone>${isMilestone ? 1 : 0}</Milestone>` +
    '<OutlineLevel>1</OutlineLevel>' +
    predecessorLinks +
    '</Task>'
  );
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/** Return the inner text of the first `<tag>...</tag>` in `xml`, or null. */
function firstTagText(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
  return match === null ? null : (match[1] ?? '');
}

/** Return the inner content of every `<tag>...</tag>` block in `xml`. */
function allTagBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = [];
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    blocks.push(match[1] ?? '');
  }
  return blocks;
}

/**
 * Deserialize MSPDI XML into a ScheduleDocument (IO-L1-002). Prefers the
 * gr-scheduler sidecar (loss-free); falls back to a minimal reconstruction from
 * standard MSPDI elements when the sidecar is absent (lossy, per spec).
 *
 * @param xmlText - The untrusted MSPDI XML text.
 * @returns A validated ScheduleDocument.
 * @throws {ImportRejectedError} On size/DOCTYPE/parse/schema violations.
 */
export function importMspdi(xmlText: string): ScheduleDocument {
  assertWithinByteLimit(xmlText, IMPORT_LIMITS.maxXmlBytes, 'MSPDI XML');
  rejectXmlDoctype(xmlText);

  const notes = firstTagText(xmlText, 'Notes');
  if (notes !== null) {
    const decodedNotes = unescapeXml(notes).trim();
    if (decodedNotes.startsWith(SIDECAR_PREFIX)) {
      const base64 = decodedNotes.slice(SIDECAR_PREFIX.length).trim();
      const json = utf8BytesToString(base64ToBytes(base64));
      // The sidecar is itself untrusted text; deserialize applies the full
      // JSON sanitize + validate pipeline (defence in depth).
      return deserializeScheduleDocument(json);
    }
  }

  return reconstructFromStandardMspdi(xmlText);
}

/** Minimal (lossy) reconstruction from standard MSPDI elements, no sidecar. */
function reconstructFromStandardMspdi(xmlText: string): ScheduleDocument {
  const title = unescapeXml(firstTagText(xmlText, 'Title') ?? 'Imported project');
  const creation = firstTagText(xmlText, 'CreationDate');
  const epochDate = creation !== null ? toIsoDate(creation.trim()) : '2026-01-01';

  const taskBlocks = allTagBlocks(xmlText, 'Task');
  if (taskBlocks.length > IMPORT_LIMITS.maxItemCount) {
    throw new ImportRejectedError(
      `MSPDI has ${taskBlocks.length} tasks, exceeding the ${IMPORT_LIMITS.maxItemCount} import limit`,
    );
  }

  const rowId = 'row-0';
  const sectionId = 'section-0';
  const items: ScheduleItem[] = [];
  const dependencies: Dependency[] = [];
  const idByUid = new Map<string, string>();

  taskBlocks.forEach((block, index) => {
    const uid = (firstTagText(block, 'UID') ?? String(index + 1)).trim();
    const itemId = `item-${uid}`;
    idByUid.set(uid, itemId);
    const name = unescapeXml(firstTagText(block, 'Name') ?? `Task ${uid}`);
    const start = toIsoDate((firstTagText(block, 'Start') ?? epochDate).trim());
    const finishRaw = firstTagText(block, 'Finish');
    const isMilestone = (firstTagText(block, 'Milestone') ?? '0').trim() === '1';
    const endDate = isMilestone || finishRaw === null ? null : toIsoDate(finishRaw.trim());
    items.push({
      id: itemId,
      rowId,
      itemKind: isMilestone ? 'milestone' : 'task',
      startDate: start,
      endDate,
      abbrev: name,
      fullName: name,
      // Reconstructed tasks share the project title as their major so the derived
      // classification tree groups them under one well-formed section.
      majorCategory: title,
      importance: 1,
      fillColor: '#4477aa',
      strokeColor: '#28527a',
      ...(isMilestone ? { milestoneShape: 'diamond' as const } : { taskShape: 'bar' as const }),
    });
  });

  // Resolve predecessor links now that every UID -> id mapping exists.
  taskBlocks.forEach((block, index) => {
    const uid = (firstTagText(block, 'UID') ?? String(index + 1)).trim();
    const targetId = idByUid.get(uid);
    if (targetId === undefined) {
      return;
    }
    allTagBlocks(block, 'PredecessorLink').forEach((linkBlock, linkIndex) => {
      const predecessorUid = (firstTagText(linkBlock, 'PredecessorUID') ?? '').trim();
      const fromId = idByUid.get(predecessorUid);
      if (fromId === undefined) {
        return;
      }
      dependencies.push({
        id: `dep-${uid}-${linkIndex}`,
        fromItemId: fromId,
        fromAnchor: 5,
        toItemId: targetId,
        toAnchor: 3,
      });
    });
  });

  const rows: Row[] = [{ id: rowId, sectionId, classificationLabel: title, order: 0 }];
  const sections: Section[] = [{ id: sectionId, name: title, order: 0, rowIds: [rowId] }];
  const viewState: ViewState = {
    zoomX: 1,
    zoomY: 1,
    scrollX: 0,
    scrollY: 0,
    fontScale: 'M',
  };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title,
    epochDate,
    viewState,
    sections,
    rows,
    items,
    dependencies,
    annotations: [],
    assets: [],
  };
}
