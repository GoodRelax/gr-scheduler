/**
 * UseCase layer: MSPDI (MS Project Data Interchange) XML codec (IO-L1-002,
 * ARCH-C-018, DATA-MSPDI-001..006). Pure string <-> model, no DOM.
 *
 * MSPDI assumes "one task = one row = one bar" and has no representation for most
 * gr-scheduler concepts (multi-bar, icons, colors, comments, watermark,
 * viewState). Per 40-data-format §2 those are
 * preserved for round-trip in a namespaced JSON sidecar embedded in the Project
 * Notes field (DATA-MSPDI-006); the sidecar carries the entire serialized
 * document, so Export -> Import is loss-free when the sidecar is present.
 *
 * The standard MSPDI elements (Project/Name, Project/Title, Tasks/Task with UID/Name/Start/
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
  LinkType,
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
import { createLogger } from '../../app/logger.js';

/** Namespaced dev logger for best-effort/lossy codec notes (no console.log). */
const log = createLogger('grsch:mspdi');

/** Marker prefix identifying the gr-scheduler sidecar inside Project Notes. */
const SIDECAR_PREFIX = 'grsch-sidecar:';

/**
 * Dependency {@link LinkType} <-> MSPDI PredecessorLink/Type code (DATA-MSPDI-004):
 * FF=0, FS=1, SF=2, SS=3. FS (finish-to-start) is the default.
 */
const LINK_TYPE_TO_CODE: Record<LinkType, number> = { FF: 0, FS: 1, SF: 2, SS: 3 };
const CODE_TO_LINK_TYPE: Record<number, LinkType> = { 0: 'FF', 1: 'FS', 2: 'SF', 3: 'SS' };
const DEFAULT_LINK_TYPE: LinkType = 'FS';

/**
 * MSPDI LinkLag encodes elapsed time in 1/10-minute units. gr-scheduler holds no
 * calendar and approximates a lag as ELAPSED (calendar) days, so one day is
 * 24h * 60min * 10 = 14400 units; e.g. lagDays 10 -> LinkLag 144000 (DATA-MSPDI-004).
 */
const CALENDAR_DAY_LAG_UNITS = 14400;

/** MSPDI LagFormat value for elapsed (calendar) days (DATA-MSPDI-004). */
const ELAPSED_DAYS_LAG_FORMAT = 8;

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
 * elements a real MS Project can read -- section Summary tasks + OutlineLevel
 * hierarchy (B-1), per-item leaf Tasks with plan/actual dates (B-4), PercentComplete
 * (B-3), Deadline (Part C), description Notes (B-6), PredecessorLink Type/LinkLag
 * (Part C), and Resources/Assignments for assignees (B-2) -- plus a base64 sidecar
 * (in Project Notes) that carries the full document for loss-free re-import.
 *
 * Best-effort baseline (DATA-MSPDI-003, CR-002 Part 3): when a `baselineDocument`
 * (a SEPARATE runtime reference past-plan snapshot, DATA-JSON-016) is supplied, each
 * exported leaf Task whose item id matches a baseline item id also emits Baseline0
 * Start/Finish synthesized from that baseline item's plan dates. Unmatched items emit
 * no Baseline element (lossy, per spec). Import does NOT round-trip these back (see
 * {@link importMspdi}) because the model has no per-item baseline field.
 *
 * @param scheduleDocument - The document to export.
 * @param baselineDocument - Optional separate past-plan reference; when present, its
 *   items are id-matched against exported tasks to synthesize Baseline0 Start/Finish.
 * @returns MSPDI XML text.
 */
export function exportMspdi(
  scheduleDocument: ScheduleDocument,
  baselineDocument?: ScheduleDocument,
): string {
  const items = scheduleDocument.items;

  // Best-effort baseline (DATA-MSPDI-003): match by item id; a matched task emits
  // Baseline0 Start/Finish, an unmatched task emits none. A milestone baseline item
  // (endDate=null) collapses BaselineFinish to its start, mirroring plan Finish.
  const baselineDatesByItemId = new Map<string, { readonly start: string; readonly finish: string }>();
  for (const baselineItem of baselineDocument?.items ?? []) {
    baselineDatesByItemId.set(baselineItem.id, {
      start: baselineItem.startDate,
      finish: baselineItem.endDate ?? baselineItem.startDate,
    });
  }
  // Leaf-task UIDs are 1..N (stable, index-based) so dependency references stay simple;
  // section Summary tasks take UIDs after the items (B-1).
  const uidByItemId = new Map<string, number>();
  items.forEach((item, index) => uidByItemId.set(item.id, index + 1));

  const predecessorsByTargetId = new Map<string, Dependency[]>();
  for (const dependency of scheduleDocument.dependencies ?? []) {
    const bucket = predecessorsByTargetId.get(dependency.toItemId);
    if (bucket) {
      bucket.push(dependency);
    } else {
      predecessorsByTargetId.set(dependency.toItemId, [dependency]);
    }
  }

  // Group items under their row's section for the Summary/OutlineLevel hierarchy (B-1).
  const sectionIdByRowId = new Map<string, string>();
  for (const row of scheduleDocument.rows) {
    sectionIdByRowId.set(row.id, row.sectionId);
  }
  const itemsBySectionId = new Map<string, ScheduleItem[]>();
  const orphanItems: ScheduleItem[] = [];
  for (const item of items) {
    const sectionId = sectionIdByRowId.get(item.rowId);
    if (sectionId === undefined) {
      orphanItems.push(item);
      continue;
    }
    const bucket = itemsBySectionId.get(sectionId);
    if (bucket) {
      bucket.push(item);
    } else {
      itemsBySectionId.set(sectionId, [item]);
    }
  }

  const renderLeaf = (item: ScheduleItem, outlineLevel: number): string => {
    const uid = uidByItemId.get(item.id) ?? 0;
    const predecessorLinks = (predecessorsByTargetId.get(item.id) ?? [])
      .map((dependency) =>
        renderPredecessorLinkXml(dependency, uidByItemId.get(dependency.fromItemId) ?? 0),
      )
      .join('');
    const baselineDates = baselineDatesByItemId.get(item.id);
    const baselineXml = baselineDates === undefined ? '' : renderBaselineXml(baselineDates);
    return renderTaskXml(item, uid, outlineLevel, predecessorLinks, baselineXml);
  };

  const orderedSections = [...scheduleDocument.sections].sort((left, right) => left.order - right.order);
  let summaryUid = items.length + 1;
  const taskXmlParts: string[] = [];
  for (const section of orderedSections) {
    const sectionItems = itemsBySectionId.get(section.id) ?? [];
    taskXmlParts.push(renderSummaryTaskXml(summaryUid, section.name));
    summaryUid += 1;
    for (const item of sectionItems) {
      taskXmlParts.push(renderLeaf(item, 2));
    }
  }
  // Items whose row belongs to no section stay at the top outline level (best-effort).
  for (const item of orphanItems) {
    taskXmlParts.push(renderLeaf(item, 1));
  }
  const taskXml = taskXmlParts.join('');

  const { resourcesXml, assignmentsXml } = renderResourcesAndAssignmentsXml(items, uidByItemId);

  const sidecarBase64 = bytesToBase64(stringToUtf8Bytes(serializeScheduleDocument(scheduleDocument)));
  const notes = `${SIDECAR_PREFIX}${sidecarBase64}`;

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Project xmlns="http://schemas.microsoft.com/project">' +
    // CR-016: emit the project name into BOTH Project/Name and Project/Title, in the
    // xsd:sequence order the vendored mspdi_pj12.xsd declares (UID?, Name?, Title?),
    // because MS Project shows the *Name* as the project's name while gr-scheduler has
    // historically round-tripped only the Title. Import keeps Title authoritative and
    // falls back to Name (see projectTitleFromMspdi).
    `<Name>${escapeXml(scheduleDocument.title)}</Name>` +
    `<Title>${escapeXml(scheduleDocument.title)}</Title>` +
    `<CreationDate>${toMspdiDateTime(scheduleDocument.epochDate)}</CreationDate>` +
    `<Notes>${escapeXml(notes)}</Notes>` +
    `<Tasks>${taskXml}</Tasks>` +
    resourcesXml +
    assignmentsXml +
    '</Project>'
  );
}

/** Render one section as a MSPDI Summary task (B-1). */
function renderSummaryTaskXml(uid: number, sectionName: string): string {
  return (
    '<Task>' +
    `<UID>${uid}</UID>` +
    `<Name>${escapeXml(sectionName)}</Name>` +
    '<OutlineLevel>1</OutlineLevel>' +
    '<Summary>1</Summary>' +
    '</Task>'
  );
}

/** Render one dependency as a PredecessorLink with Type/LinkLag (Part C, DATA-MSPDI-004). */
function renderPredecessorLinkXml(dependency: Dependency, predecessorUid: number): string {
  const typeCode = LINK_TYPE_TO_CODE[dependency.linkType ?? DEFAULT_LINK_TYPE];
  const parts = [`<PredecessorUID>${predecessorUid}</PredecessorUID>`, `<Type>${typeCode}</Type>`];
  const lagDays = dependency.lagDays;
  if (lagDays !== undefined && lagDays !== 0) {
    parts.push(`<LinkLag>${lagDays * CALENDAR_DAY_LAG_UNITS}</LinkLag>`);
    parts.push(`<LagFormat>${ELAPSED_DAYS_LAG_FORMAT}</LagFormat>`);
  }
  return `<PredecessorLink>${parts.join('')}</PredecessorLink>`;
}

/**
 * Render Baseline0 Start/Finish for an item matched against a baseline document
 * (DATA-MSPDI-003, best-effort). Uses the same MSPDI dateTime format as plan
 * Start/Finish so a real MS Project reads a consistent baseline bar.
 */
function renderBaselineXml(dates: { readonly start: string; readonly finish: string }): string {
  return (
    '<BaselineNumber>0</BaselineNumber>' +
    `<BaselineStart>${toMspdiDateTime(dates.start)}</BaselineStart>` +
    `<BaselineFinish>${toMspdiDateTime(dates.finish)}</BaselineFinish>`
  );
}

/** Render a leaf item as a MSPDI Task with plan/actual/progress/deadline fields. */
function renderTaskXml(
  item: ScheduleItem,
  uid: number,
  outlineLevel: number,
  predecessorLinksXml: string,
  baselineXml: string,
): string {
  const isMilestone = item.itemKind === 'milestone' || item.endDate === null;
  const finishDate = item.endDate ?? item.startDate;
  const name = item.fullName ?? item.abbrev;
  const parts: string[] = [
    `<UID>${uid}</UID>`,
    `<Name>${escapeXml(name)}</Name>`,
    `<OutlineLevel>${outlineLevel}</OutlineLevel>`,
    '<Summary>0</Summary>',
    `<Start>${toMspdiDateTime(item.startDate)}</Start>`,
    `<Finish>${toMspdiDateTime(finishDate)}</Finish>`,
    `<Milestone>${isMilestone ? 1 : 0}</Milestone>`,
  ];
  // Actual span (B-4): emit only recorded actual dates (absent stays absent).
  if (item.actualStart !== undefined) {
    parts.push(`<ActualStart>${toMspdiDateTime(item.actualStart)}</ActualStart>`);
  }
  if (item.actualEnd !== undefined && item.actualEnd !== null) {
    parts.push(`<ActualFinish>${toMspdiDateTime(item.actualEnd)}</ActualFinish>`);
  }
  // Progress (B-3): 0..1 ratio -> 0..100 integer percent.
  if (item.progressRatio !== undefined) {
    parts.push(`<PercentComplete>${Math.round(item.progressRatio * 100)}</PercentComplete>`);
  }
  // Deadline (Part C): the target-end marker, not a scheduler constraint.
  if (item.targetDate !== undefined) {
    parts.push(`<Deadline>${toMspdiDateTime(item.targetDate)}</Deadline>`);
  }
  // Baseline0 (DATA-MSPDI-003): present only when a baseline document matched this
  // item id; empty otherwise (unmatched items emit no Baseline element).
  if (baselineXml.length > 0) {
    parts.push(baselineXml);
  }
  // Description (B-6): the task's own Notes, distinct from the Project-level sidecar Notes.
  if (item.description !== undefined && item.description.length > 0) {
    parts.push(`<Notes>${escapeXml(item.description)}</Notes>`);
  }
  parts.push(predecessorLinksXml);
  return `<Task>${parts.join('')}</Task>`;
}

/**
 * Render the Resources and Assignments blocks for item assignees (B-2). Each unique
 * assignee becomes one Resource; each item that names an assignee gets one Assignment
 * linking its TaskUID to that ResourceUID.
 */
function renderResourcesAndAssignmentsXml(
  items: readonly ScheduleItem[],
  uidByItemId: Map<string, number>,
): { resourcesXml: string; assignmentsXml: string } {
  const resourceUidByName = new Map<string, number>();
  for (const item of items) {
    const assignee = item.assignee;
    if (assignee !== undefined && assignee.length > 0 && !resourceUidByName.has(assignee)) {
      resourceUidByName.set(assignee, resourceUidByName.size + 1);
    }
  }
  if (resourceUidByName.size === 0) {
    return { resourcesXml: '', assignmentsXml: '' };
  }
  const resourceXml = [...resourceUidByName.entries()]
    .map(([name, uid]) => `<Resource><UID>${uid}</UID><Name>${escapeXml(name)}</Name></Resource>`)
    .join('');
  const assignmentXml = items
    .map((item) => {
      const assignee = item.assignee;
      if (assignee === undefined || assignee.length === 0) {
        return '';
      }
      const taskUid = uidByItemId.get(item.id) ?? 0;
      const resourceUid = resourceUidByName.get(assignee) ?? 0;
      return `<Assignment><TaskUID>${taskUid}</TaskUID><ResourceUID>${resourceUid}</ResourceUID></Assignment>`;
    })
    .join('');
  return {
    resourcesXml: `<Resources>${resourceXml}</Resources>`,
    assignmentsXml: `<Assignments>${assignmentXml}</Assignments>`,
  };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/** Return the inner text of the first `<tag>...</tag>` in `xml`, or null. */
function firstTagText(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
  return match === null ? null : (match[1] ?? '');
}

/**
 * The project-level scalar prefix of an MSPDI document: everything before the first
 * `<Tasks>` element. Project scalars (Name / Title / CreationDate) live there, so
 * scoping a name lookup to this prefix keeps a TASK's own `<Name>` from being mistaken
 * for the project name (CR-016 fallback).
 */
function projectScalarScope(xmlText: string): string {
  const tasksIndex = xmlText.search(/<Tasks\b/i);
  return tasksIndex < 0 ? xmlText : xmlText.slice(0, tasksIndex);
}

/**
 * Resolve the project title on import (CR-016): `<Title>` is authoritative; when it is
 * absent or blank the MS Project-facing `<Name>` is used; when neither carries text a
 * neutral placeholder keeps the required `title` field populated.
 *
 * @param xmlText - The whole MSPDI document.
 * @returns The project title to adopt.
 */
function projectTitleFromMspdi(xmlText: string): string {
  const scope = projectScalarScope(xmlText);
  for (const tag of ['Title', 'Name']) {
    const raw = firstTagText(scope, tag);
    if (raw === null) {
      continue;
    }
    const text = unescapeXml(raw).trim();
    if (text.length > 0) {
      return text;
    }
  }
  return 'Imported project';
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
 * Best-effort baseline asymmetry (DATA-MSPDI-003, CR-002 Part 3): standard Baseline0
 * Start/Finish are recognized but INTENTIONALLY NOT restored. The model holds the
 * baseline (past plan) as a SEPARATE runtime reference document (DATA-JSON-016), not
 * as a per-item field, so there is no natural home on the imported document. Export
 * can synthesize Baseline elements from a supplied baseline document; import drops
 * them (logged) rather than fabricate document state -- hence "best-effort" round-trip.
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

/** One imported task's parsed standard fields (before hierarchy/split expansion). */
interface ParsedLeafTask {
  readonly uid: string;
  readonly name: string;
  readonly start: string;
  readonly endDate: string | null;
  readonly isMilestone: boolean;
  readonly actualStart?: string;
  readonly actualEnd?: string;
  readonly progressRatio?: number;
  readonly targetDate?: string;
  readonly description?: string;
  readonly splitParts: readonly { readonly start: string; readonly finish: string }[];
}

/** Parse the standard plan/actual/progress/deadline fields of a leaf Task block. */
function parseLeafTask(block: string, uid: string, epochDate: string): ParsedLeafTask {
  const name = unescapeXml(firstTagText(block, 'Name') ?? `Task ${uid}`);
  const start = toIsoDate((firstTagText(block, 'Start') ?? epochDate).trim());
  const finishRaw = firstTagText(block, 'Finish');
  const isMilestone = (firstTagText(block, 'Milestone') ?? '0').trim() === '1';
  const endDate = isMilestone || finishRaw === null ? null : toIsoDate(finishRaw.trim());

  const actualStartRaw = firstTagText(block, 'ActualStart');
  const actualFinishRaw = firstTagText(block, 'ActualFinish');
  const percentRaw = firstTagText(block, 'PercentComplete');
  const deadlineRaw = firstTagText(block, 'Deadline');
  const notesRaw = firstTagText(block, 'Notes');

  const splitParts: { start: string; finish: string }[] = [];
  const splitsBlock = firstTagText(block, 'Splits');
  if (splitsBlock !== null) {
    for (const partBlock of allTagBlocks(splitsBlock, 'SplitPart')) {
      const partStart = firstTagText(partBlock, 'Start');
      const partFinish = firstTagText(partBlock, 'Finish');
      if (partStart !== null && partFinish !== null) {
        splitParts.push({
          start: toIsoDate(partStart.trim()),
          finish: toIsoDate(partFinish.trim()),
        });
      }
    }
  }

  let progressRatio: number | undefined;
  if (percentRaw !== null) {
    const percent = Number.parseInt(percentRaw.trim(), 10);
    if (Number.isFinite(percent)) {
      progressRatio = Math.min(1, Math.max(0, percent / 100));
    }
  }

  return {
    uid,
    name,
    start,
    endDate,
    isMilestone,
    ...(actualStartRaw !== null ? { actualStart: toIsoDate(actualStartRaw.trim()) } : {}),
    ...(!isMilestone && actualFinishRaw !== null
      ? { actualEnd: toIsoDate(actualFinishRaw.trim()) }
      : {}),
    ...(progressRatio !== undefined ? { progressRatio } : {}),
    ...(deadlineRaw !== null ? { targetDate: toIsoDate(deadlineRaw.trim()) } : {}),
    ...(notesRaw !== null && notesRaw.trim().length > 0
      ? { description: unescapeXml(notesRaw).trim() }
      : {}),
    splitParts,
  };
}

/**
 * Minimal (lossy) reconstruction from standard MSPDI elements, no sidecar. Restores
 * the section hierarchy from Summary/OutlineLevel (B-1), assignees from
 * Resources/Assignments (B-2), progress from PercentComplete (B-3), actual dates from
 * ActualStart/ActualFinish (B-4), multi-bar items from SplitParts (B-5), descriptions
 * from Notes (B-6), and dependency linkType/lagDays from PredecessorLink Type/LinkLag.
 */
function reconstructFromStandardMspdi(xmlText: string): ScheduleDocument {
  const title = projectTitleFromMspdi(xmlText);
  const creation = firstTagText(xmlText, 'CreationDate');
  const epochDate = creation !== null ? toIsoDate(creation.trim()) : '2026-01-01';

  const tasksBlock = firstTagText(xmlText, 'Tasks') ?? xmlText;
  const taskBlocks = allTagBlocks(tasksBlock, 'Task');
  if (taskBlocks.length > IMPORT_LIMITS.maxItemCount) {
    throw new ImportRejectedError(
      `MSPDI has ${taskBlocks.length} tasks, exceeding the ${IMPORT_LIMITS.maxItemCount} import limit`,
    );
  }

  const assigneeByTaskUid = parseResourceAssignments(xmlText);

  const sections: Section[] = [];
  const rows: Row[] = [];
  const items: ScheduleItem[] = [];
  const dependencies: Dependency[] = [];
  const idByUid = new Map<string, string>();

  let currentRowId: string | null = null;
  let currentSectionName = title;

  const startNewRow = (sectionName: string): void => {
    const sectionId = `section-${sections.length}`;
    const rowId = `row-${rows.length}`;
    sections.push({ id: sectionId, name: sectionName, order: sections.length, rowIds: [rowId] });
    rows.push({ id: rowId, sectionId, classificationLabel: sectionName, order: rows.length });
    currentRowId = rowId;
    currentSectionName = sectionName;
  };

  taskBlocks.forEach((block, index) => {
    const uid = (firstTagText(block, 'UID') ?? String(index + 1)).trim();
    const isSummary = (firstTagText(block, 'Summary') ?? '0').trim() === '1';
    if (isSummary) {
      // A Summary task opens a new section + row (B-1).
      startNewRow(unescapeXml(firstTagText(block, 'Name') ?? `Section ${uid}`));
      return;
    }
    if (currentRowId === null) {
      // Leaf tasks before any Summary land in a default section named after the project.
      startNewRow(title);
    }
    const rowId = currentRowId as string;
    const parsed = parseLeafTask(block, uid, epochDate);
    const baseId = `item-${uid}`;
    // Dependencies reference the leaf's base id (the first split part).
    idByUid.set(uid, baseId);
    const assignee = assigneeByTaskUid.get(uid);

    if (parsed.splitParts.length >= 2) {
      // SplitParts -> one gr-scheduler item per split on the SAME row (multi-bar, B-5).
      parsed.splitParts.forEach((part, partIndex) => {
        items.push(
          buildReconstructedItem(parsed, {
            id: partIndex === 0 ? baseId : `${baseId}-part-${partIndex}`,
            rowId,
            majorCategory: currentSectionName,
            startDate: part.start,
            endDate: part.finish,
            forceTask: true,
            ...(assignee !== undefined ? { assignee } : {}),
          }),
        );
      });
    } else {
      items.push(
        buildReconstructedItem(parsed, {
          id: baseId,
          rowId,
          majorCategory: currentSectionName,
          startDate: parsed.start,
          endDate: parsed.endDate,
          forceTask: false,
          ...(assignee !== undefined ? { assignee } : {}),
        }),
      );
    }
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
      dependencies.push(parsePredecessorLink(linkBlock, `dep-${uid}-${linkIndex}`, fromId, targetId));
    });
  });

  // Best-effort baseline (DATA-MSPDI-003): recognize but DROP Baseline0 Start/Finish.
  // There is no per-item baseline field to receive them -- the baseline is a separate
  // runtime reference document (DATA-JSON-016) -- so reconstructing one would fabricate
  // state. Record the drop for diagnostics instead of silently discarding it. This is
  // the export/import asymmetry documented in DATA-MSPDI-003 "best-effort".
  const droppedBaselineCount = taskBlocks.filter(
    (block) => firstTagText(block, 'BaselineStart') !== null,
  ).length;
  if (droppedBaselineCount > 0) {
    log.debug('baseline_elements_dropped_no_document_field', {
      dropped_baseline_count: droppedBaselineCount,
    });
  }

  if (sections.length === 0) {
    // No tasks at all: keep a well-formed empty document with one placeholder section.
    startNewRow(title);
  }

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
  };
}

/** Build one reconstructed item, merging parsed optional fields with per-instance overrides. */
function buildReconstructedItem(
  parsed: ParsedLeafTask,
  fields: {
    readonly id: string;
    readonly rowId: string;
    readonly majorCategory: string;
    readonly startDate: string;
    readonly endDate: string | null;
    readonly forceTask: boolean;
    readonly assignee?: string;
  },
): ScheduleItem {
  const isMilestone = !fields.forceTask && parsed.isMilestone;
  return {
    id: fields.id,
    rowId: fields.rowId,
    itemKind: isMilestone ? 'milestone' : 'task',
    startDate: fields.startDate,
    endDate: isMilestone ? null : fields.endDate,
    abbrev: parsed.name,
    fullName: parsed.name,
    majorCategory: fields.majorCategory,
    importance: 1,
    fillColor: '#4477aa',
    strokeColor: '#28527a',
    ...(isMilestone ? { milestoneShape: 'diamond' as const } : { taskShape: 'bar' as const }),
    ...(fields.assignee !== undefined ? { assignee: fields.assignee } : {}),
    ...(parsed.actualStart !== undefined ? { actualStart: parsed.actualStart } : {}),
    ...(!isMilestone && parsed.actualEnd !== undefined ? { actualEnd: parsed.actualEnd } : {}),
    ...(parsed.progressRatio !== undefined ? { progressRatio: parsed.progressRatio } : {}),
    ...(parsed.targetDate !== undefined ? { targetDate: parsed.targetDate } : {}),
    ...(parsed.description !== undefined ? { description: parsed.description } : {}),
  };
}

/** Parse Resources + Assignments into a TaskUID -> assignee-name map (B-2). */
function parseResourceAssignments(xmlText: string): Map<string, string> {
  const resourceNameByUid = new Map<string, string>();
  const resourcesBlock = firstTagText(xmlText, 'Resources');
  if (resourcesBlock !== null) {
    for (const resourceBlock of allTagBlocks(resourcesBlock, 'Resource')) {
      const resourceUid = (firstTagText(resourceBlock, 'UID') ?? '').trim();
      const resourceName = unescapeXml(firstTagText(resourceBlock, 'Name') ?? '');
      if (resourceUid.length > 0) {
        resourceNameByUid.set(resourceUid, resourceName);
      }
    }
  }
  const assigneeByTaskUid = new Map<string, string>();
  const assignmentsBlock = firstTagText(xmlText, 'Assignments');
  if (assignmentsBlock !== null) {
    for (const assignmentBlock of allTagBlocks(assignmentsBlock, 'Assignment')) {
      const taskUid = (firstTagText(assignmentBlock, 'TaskUID') ?? '').trim();
      const resourceUid = (firstTagText(assignmentBlock, 'ResourceUID') ?? '').trim();
      const name = resourceNameByUid.get(resourceUid);
      if (taskUid.length > 0 && name !== undefined && name.length > 0) {
        assigneeByTaskUid.set(taskUid, name);
      }
    }
  }
  return assigneeByTaskUid;
}

/** Parse one PredecessorLink into a Dependency, decoding Type and LinkLag (Part C). */
function parsePredecessorLink(
  linkBlock: string,
  id: string,
  fromItemId: string,
  toItemId: string,
): Dependency {
  const typeCode = Number.parseInt((firstTagText(linkBlock, 'Type') ?? '1').trim(), 10);
  const linkType = CODE_TO_LINK_TYPE[typeCode] ?? DEFAULT_LINK_TYPE;
  const lagRaw = firstTagText(linkBlock, 'LinkLag');
  const base: Dependency = {
    id,
    fromItemId,
    fromAnchor: 5,
    toItemId,
    toAnchor: 3,
    linkType,
  };
  if (lagRaw !== null) {
    const lagUnits = Number.parseInt(lagRaw.trim(), 10);
    if (Number.isFinite(lagUnits) && lagUnits !== 0) {
      return { ...base, lagDays: Math.round(lagUnits / CALENDAR_DAY_LAG_UNITS) };
    }
  }
  return base;
}
