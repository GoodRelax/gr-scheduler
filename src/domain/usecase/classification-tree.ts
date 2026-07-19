/**
 * UseCase layer: classification-tree derivation (SECT domain rework).
 *
 * The left classification tree is DERIVED from each item's three-level category
 * (`majorCategory` / `middleCategory` / `minorCategory`). Rules:
 *
 * - `major` is REQUIRED and names the section (大分類). `middle` is the track
 *   (中分類); `minor` is the detail leaf (小分類).
 * - Placement of an item on its leaf row:
 *   - middle empty AND minor empty -> the item sits at the MAJOR level.
 *   - middle set AND minor empty    -> the item sits at the MIDDLE level.
 *   - middle set AND minor set      -> the item sits at the MINOR level.
 *   - middle empty AND minor set    -> INVALID (rejected on import; prevented in
 *     the editor). Treated defensively here as "minor unset".
 * - Only branches that actually contain items produce a row: empty tracks /
 *   details never render.
 *
 * {@link rebuildClassification} MATERIALIZES this tree into the document's
 * `sections` / `rows` and each item's `rowId`, at the finest (level-0) detail, so
 * the whole downstream pipeline (layout engine, SVG export, codecs) keeps working
 * unchanged. Vertical level-of-detail is a pure, zoom-driven display transform
 * applied on top by {@link collapseRows} -- it never mutates the document, so it
 * cannot pollute Undo/Redo.
 *
 * Pure and side-effect free.
 */

import type {
  DeclaredCategory,
  Row,
  ScheduleDocument,
  ScheduleItem,
  Section,
} from '../model/schedule-model.js';
import type { SectionBand } from './section-organizer.js';

/** Depth of a classification row: 0 major, 1 middle, 2 minor. */
export type ClassificationDepth = 0 | 1 | 2;

/**
 * Vertical zoom at/above which the MINOR (小) level stays expanded. Below it the
 * detail rows collapse onto their middle (track) lane (vertical LOD, mirrors the
 * time-axis LOD).
 */
export const MINOR_EXPAND_MIN_ZOOM_Y = 0.6;

/**
 * Vertical zoom at/above which the MIDDLE (中) level stays expanded. Below it the
 * track rows collapse onto their major (section) lane. `major` is always kept.
 */
export const MIDDLE_EXPAND_MIN_ZOOM_Y = 0.32;

/** Fallback major used only defensively when an item carries no major. */
export const UNCLASSIFIED_MAJOR = '(uncategorized)';

/**
 * The collapse LEVEL for a vertical zoom: 0 shows all three levels, 1 hides
 * `minor` (details render on the middle lane), 2 also hides `middle` (tracks
 * render on the major lane). `major` is always shown.
 *
 * @param zoomY - Vertical zoom multiplier (> 0).
 * @returns 0, 1 or 2.
 */
export function classificationCollapseLevel(zoomY: number): 0 | 1 | 2 {
  if (zoomY < MIDDLE_EXPAND_MIN_ZOOM_Y) {
    return 2;
  }
  if (zoomY < MINOR_EXPAND_MIN_ZOOM_Y) {
    return 1;
  }
  return 0;
}

/** Field separator for the encoded classification path (control char, unused in labels). */
const PATH_SEPARATOR = '';

/**
 * Encode a classification path (major + optional middle + optional minor) into a
 * stable, unique row id. Deeper components are omitted, so a major-only row and a
 * major+middle row never collide.
 *
 * @param major - The (required) major value.
 * @param middle - The middle value, when the row is at middle depth or deeper.
 * @param minor - The minor value, when the row is at minor depth.
 * @returns A deterministic row id string.
 */
export function classificationRowId(major: string, middle?: string, minor?: string): string {
  const parts = [major];
  if (middle !== undefined) {
    parts.push(middle);
    if (minor !== undefined) {
      parts.push(minor);
    }
  }
  return `row:${parts.join(PATH_SEPARATOR)}`;
}

/** A trimmed non-empty string, or undefined when the value is absent/blank. */
function nonEmpty(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** The resolved classification path of an item (defensive against the invalid combo). */
export interface ClassificationPath {
  readonly major: string;
  readonly middle?: string;
  readonly minor?: string;
  readonly depth: ClassificationDepth;
}

/**
 * Resolve an item's classification path, applying the placement rules. A minor
 * set without a middle is treated as "minor unset" (the invalid combo is rejected
 * at import and prevented in the editor; this keeps rendering robust).
 *
 * @param item - The item to classify.
 * @returns The resolved path with its depth.
 */
export function resolveClassificationPath(item: ScheduleItem): ClassificationPath {
  const major = nonEmpty(item.majorCategory) ?? UNCLASSIFIED_MAJOR;
  const middle = nonEmpty(item.middleCategory);
  const minor = middle === undefined ? undefined : nonEmpty(item.minorCategory);
  if (middle !== undefined && minor !== undefined) {
    return { major, middle, minor, depth: 2 };
  }
  if (middle !== undefined) {
    return { major, middle, depth: 1 };
  }
  return { major, depth: 0 };
}

/**
 * Validate an item's classification against the STRICT product rules: `major` is
 * required, and `minor` requires `middle`.
 *
 * @param item - The item to validate.
 * @returns An error message, or null when the classification is valid.
 */
export function classificationValidationError(item: ScheduleItem): string | null {
  const major = nonEmpty(item.majorCategory);
  const middle = nonEmpty(item.middleCategory);
  const minor = nonEmpty(item.minorCategory);
  if (major === undefined) {
    return 'major category is required';
  }
  if (minor !== undefined && middle === undefined) {
    return 'minor category requires a middle category';
  }
  return null;
}

/**
 * Import-time (relaxed) classification check: reject only genuinely malformed
 * classification so legacy documents without categories still import. Rejects a
 * `minor` without a `middle`, and any middle/minor set without a `major`.
 *
 * @param item - The candidate item.
 * @returns An error message, or null when acceptable to import.
 */
export function classificationImportError(item: ScheduleItem): string | null {
  const major = nonEmpty(item.majorCategory);
  const middle = nonEmpty(item.middleCategory);
  const minor = nonEmpty(item.minorCategory);
  if (minor !== undefined && middle === undefined) {
    return 'minor category requires a middle category';
  }
  if (major === undefined && (middle !== undefined || minor !== undefined)) {
    return 'middle/minor category requires a major category';
  }
  return null;
}

/** The leaf label shown for a row at a given depth (middle for 1, minor for 2). */
function leafLabelFor(path: { middle?: string; minor?: string }, depth: ClassificationDepth): string {
  if (depth >= 2) {
    return path.minor ?? '';
  }
  if (depth >= 1) {
    return path.middle ?? '';
  }
  return '';
}

/**
 * Rebuild the document's `sections`, `rows` and every item's `rowId` from the
 * items' three-level categories (finest / level-0 detail). Section ORDER and
 * COLLAPSED state are preserved by matching an existing section's `name` to a
 * major value, so reorder / hide survive a rebuild; new majors are appended in
 * first-appearance order.
 *
 * DECLARED classification nodes ({@link ScheduleDocument.declaredCategories}) are
 * folded in as well: every declared node forces its section to exist and, for a
 * track/detail, contributes an EMPTY row so a user-added-but-empty branch stays
 * visible (unlike item-derived empty branches, which never render). A section that
 * would otherwise have no rows gets one bare major-level placeholder row so its
 * header is drawn and items can be created into it (the created item then produces
 * the same row id and the placeholder merges away).
 *
 * @param document - The document whose classification to re-derive.
 * @returns A new document with a materialized classification tree.
 */
export function rebuildClassification(document: ScheduleDocument): ScheduleDocument {
  // Preserve order + collapsed + id for any existing section, keyed by its major name.
  const existingByName = new Map<string, Section>();
  for (const section of document.sections) {
    if (!existingByName.has(section.name)) {
      existingByName.set(section.name, section);
    }
  }

  // First-appearance order of majors across items.
  const majorOrder: string[] = [];
  const seenMajor = new Set<string>();
  // Per-major: ordered distinct row ids + their row record.
  const rowsByMajor = new Map<string, Row[]>();
  const rowSeenByMajor = new Map<string, Set<string>>();
  const rowIdByItemId = new Map<string, string>();

  for (const item of document.items) {
    const path = resolveClassificationPath(item);
    const { major, depth } = path;
    if (!seenMajor.has(major)) {
      seenMajor.add(major);
      majorOrder.push(major);
      rowsByMajor.set(major, []);
      rowSeenByMajor.set(major, new Set());
    }
    const sectionId = existingByName.get(major)?.id ?? `sec:${major}`;
    const rowId = classificationRowId(
      major,
      depth >= 1 ? path.middle : undefined,
      depth >= 2 ? path.minor : undefined,
    );
    rowIdByItemId.set(item.id, rowId);
    const seen = rowSeenByMajor.get(major);
    const bucket = rowsByMajor.get(major);
    if (seen !== undefined && bucket !== undefined && !seen.has(rowId)) {
      seen.add(rowId);
      bucket.push({
        id: rowId,
        sectionId,
        classificationLabel: leafLabelFor(path, depth),
        ...(depth >= 2 && path.minor !== undefined ? { subClassificationLabel: path.minor } : {}),
        order: bucket.length,
        majorLabel: major,
        ...(depth >= 1 && path.middle !== undefined ? { middleLabel: path.middle } : {}),
        ...(depth >= 2 && path.minor !== undefined ? { minorLabel: path.minor } : {}),
        depth,
      });
    }
  }

  /** Register a major so it yields a section even with no item rows yet. */
  const registerMajor = (major: string): void => {
    if (!seenMajor.has(major)) {
      seenMajor.add(major);
      majorOrder.push(major);
      rowsByMajor.set(major, []);
      rowSeenByMajor.set(major, new Set());
    }
  };

  /** Append an EMPTY declared row (no items) at its depth, if not already present. */
  const pushDeclaredRow = (
    major: string,
    middle: string | undefined,
    minor: string | undefined,
    depth: ClassificationDepth,
  ): void => {
    const rowId = classificationRowId(
      major,
      depth >= 1 ? middle : undefined,
      depth >= 2 ? minor : undefined,
    );
    const seen = rowSeenByMajor.get(major);
    const bucket = rowsByMajor.get(major);
    if (seen === undefined || bucket === undefined || seen.has(rowId)) {
      return;
    }
    seen.add(rowId);
    const sectionId = existingByName.get(major)?.id ?? `sec:${major}`;
    bucket.push({
      id: rowId,
      sectionId,
      classificationLabel: depth >= 2 ? minor ?? '' : depth >= 1 ? middle ?? '' : '',
      ...(depth >= 2 && minor !== undefined ? { subClassificationLabel: minor } : {}),
      order: bucket.length,
      majorLabel: major,
      ...(depth >= 1 && middle !== undefined ? { middleLabel: middle } : {}),
      ...(depth >= 2 && minor !== undefined ? { minorLabel: minor } : {}),
      depth,
    });
  };

  // Fold DECLARED nodes into the tree: force their major to exist and add an empty
  // row for each declared track/detail so an added-but-empty branch stays visible.
  for (const declared of document.declaredCategories ?? []) {
    const major = nonEmpty(declared.major);
    if (major === undefined) {
      continue;
    }
    registerMajor(major);
    const middle = nonEmpty(declared.middle);
    const minor = middle === undefined ? undefined : nonEmpty(declared.minor);
    if (middle !== undefined && minor !== undefined) {
      pushDeclaredRow(major, middle, minor, 2);
    } else if (middle !== undefined) {
      pushDeclaredRow(major, middle, undefined, 1);
    }
    // A bare `{ major }` declaration just needs the section to exist; its
    // placeholder row (below) is only added when the section has no other rows.
  }

  // Any major that still has zero rows (a freshly declared, empty section) gets one
  // bare major-level placeholder row so its header renders and items can be created
  // onto it (the created item reuses this row id, so the placeholder then merges).
  for (const major of majorOrder) {
    const bucket = rowsByMajor.get(major);
    if (bucket !== undefined && bucket.length === 0) {
      pushDeclaredRow(major, undefined, undefined, 0);
    }
  }

  // Order majors: existing sections first (by their order), then new majors.
  const orderedMajors = orderMajors(majorOrder, existingByName);

  const sections: Section[] = [];
  const rows: Row[] = [];
  orderedMajors.forEach((major, index) => {
    const bucket = rowsByMajor.get(major) ?? [];
    const existing = existingByName.get(major);
    const sectionId = existing?.id ?? `sec:${major}`;
    sections.push({
      id: sectionId,
      name: major,
      order: index,
      rowIds: bucket.map((row) => row.id),
      collapsed: existing?.collapsed ?? false,
    });
    for (const row of bucket) {
      rows.push(row);
    }
  });

  const items = document.items.map((item) => {
    const rowId = rowIdByItemId.get(item.id);
    return rowId !== undefined && rowId !== item.rowId ? { ...item, rowId } : item;
  });

  return { ...document, sections, rows, items };
}

/** Order the discovered majors: existing sections in their order first, then the rest. */
function orderMajors(majorOrder: readonly string[], existingByName: Map<string, Section>): string[] {
  const present = new Set(majorOrder);
  const fromExisting = [...existingByName.values()]
    .filter((section) => present.has(section.name))
    .sort((left, right) => left.order - right.order)
    .map((section) => section.name);
  const known = new Set(fromExisting);
  const appended = majorOrder.filter((major) => !known.has(major));
  return [...fromExisting, ...appended];
}

/** Result of collapsing level-0 rows for a vertical zoom. */
export interface CollapsedRows {
  /** The display rows in vertical order (deduplicated at the collapse level). */
  readonly rows: Row[];
  /** Maps each level-0 row id to the display row id it collapsed into. */
  readonly rowIdToDisplayId: Map<string, string>;
}

/**
 * Collapse level-0 (finest) rows for a vertical collapse level, merging detail
 * rows onto their track (and tracks onto their section) as the level rises. Rows
 * that carry no derived `depth` (legacy / hand-built fixtures) are passed through
 * unchanged, so pre-rework documents render exactly as before.
 *
 * @param orderedRows - Level-0 rows already in vertical (top-to-bottom) order.
 * @param level - Collapse level from {@link classificationCollapseLevel}.
 * @returns The display rows plus the level-0 -> display id mapping.
 */
export function collapseRows(orderedRows: readonly Row[], level: 0 | 1 | 2): CollapsedRows {
  const maxDepth = (2 - level) as ClassificationDepth;
  const byDisplayId = new Map<string, Row>();
  const order: string[] = [];
  const rowIdToDisplayId = new Map<string, string>();

  for (const row of orderedRows) {
    if (row.depth === undefined || row.majorLabel === undefined) {
      // Legacy row without a derived path: keep as-is (identity collapse).
      rowIdToDisplayId.set(row.id, row.id);
      if (!byDisplayId.has(row.id)) {
        byDisplayId.set(row.id, row);
        order.push(row.id);
      }
      continue;
    }
    const effectiveDepth = Math.min(row.depth, maxDepth) as ClassificationDepth;
    const displayId = classificationRowId(
      row.majorLabel,
      effectiveDepth >= 1 ? row.middleLabel : undefined,
      effectiveDepth >= 2 ? row.minorLabel : undefined,
    );
    rowIdToDisplayId.set(row.id, displayId);
    if (!byDisplayId.has(displayId)) {
      byDisplayId.set(displayId, {
        id: displayId,
        sectionId: row.sectionId,
        classificationLabel: effectiveDepth >= 1 ? row.middleLabel ?? '' : '',
        ...(effectiveDepth >= 2 && row.minorLabel !== undefined
          ? { subClassificationLabel: row.minorLabel }
          : {}),
        order: order.length,
        majorLabel: row.majorLabel,
        ...(effectiveDepth >= 1 && row.middleLabel !== undefined
          ? { middleLabel: row.middleLabel }
          : {}),
        ...(effectiveDepth >= 2 && row.minorLabel !== undefined
          ? { minorLabel: row.minorLabel }
          : {}),
        depth: effectiveDepth,
      });
      order.push(displayId);
    }
  }
  return { rows: order.map((id) => byDisplayId.get(id) as Row), rowIdToDisplayId };
}

/**
 * Describe an ordered row list as contiguous per-section bands (parallel to
 * {@link SectionBand} from the section organizer, but over already-ordered rows so
 * it works for collapsed display rows too).
 *
 * @param rows - The ordered (already visible + collapsed) rows.
 * @param sections - All sections (for the band display name).
 * @returns One band per contiguous section run.
 */
export function contiguousSectionBands(
  rows: readonly Row[],
  sections: readonly Section[],
): SectionBand[] {
  const nameById = new Map(sections.map((section) => [section.id, section.name]));
  const bands: SectionBand[] = [];
  rows.forEach((row, index) => {
    const last = bands[bands.length - 1];
    if (last !== undefined && last.sectionId === row.sectionId) {
      bands[bands.length - 1] = { ...last, rowCount: last.rowCount + 1 };
      return;
    }
    bands.push({
      sectionId: row.sectionId,
      name: nameById.get(row.sectionId) ?? row.majorLabel ?? row.sectionId,
      startRowIndex: index,
      rowCount: 1,
    });
  });
  return bands;
}

/**
 * Clamp a row-index range so it stays within the single section band that
 * contains the fixed anchor row (rounded-box single-section constraint). The
 * dragged edge is pulled back to the band's edge when it would cross into an
 * adjacent section.
 *
 * @param bands - The current section bands (contiguous, in vertical order).
 * @param anchorRowIndex - The FIXED edge's row index (defines the allowed band).
 * @param draggedRowIndex - The dragged edge's proposed row index.
 * @returns The dragged row index clamped into the anchor's band.
 */
export function clampRowIndexToSection(
  bands: readonly SectionBand[],
  anchorRowIndex: number,
  draggedRowIndex: number,
): number {
  const band = bandContaining(bands, anchorRowIndex);
  if (band === null) {
    return draggedRowIndex;
  }
  const top = band.startRowIndex;
  const bottom = band.startRowIndex + band.rowCount - 1;
  return Math.min(Math.max(draggedRowIndex, top), bottom);
}

/** The band whose row range contains `rowIndex`, or null. */
export function bandContaining(
  bands: readonly SectionBand[],
  rowIndex: number,
): SectionBand | null {
  for (const band of bands) {
    if (rowIndex >= band.startRowIndex && rowIndex < band.startRowIndex + band.rowCount) {
      return band;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Declared-node registry (SECT editing rework): create / name / remove branches
// ---------------------------------------------------------------------------

/** Prefix for auto-generated default classification names (`None1`, `None2`, ...). */
export const DEFAULT_CATEGORY_PREFIX = 'None';

/**
 * The next unused `NoneN` name (smallest integer N >= 1) whose `NoneN` form is not
 * already present in `existingNames`. Used to name a newly added section / track /
 * detail uniquely within its PARENT scope (SECT editing rework req 4).
 *
 * @param existingNames - Sibling names already in the parent scope.
 * @returns The first free `NoneN` name.
 */
export function nextDefaultCategoryName(existingNames: Iterable<string>): string {
  const taken = new Set(existingNames);
  let n = 1;
  while (taken.has(`${DEFAULT_CATEGORY_PREFIX}${n}`)) {
    n += 1;
  }
  return `${DEFAULT_CATEGORY_PREFIX}${n}`;
}

/**
 * Every distinct MAJOR (section) name currently in use, from items AND declared
 * nodes. The parent scope for naming a new section.
 *
 * @param document - The document to inspect.
 * @returns The set of section names.
 */
export function existingMajorNames(document: ScheduleDocument): Set<string> {
  const names = new Set<string>();
  for (const item of document.items) {
    const major = nonEmpty(item.majorCategory);
    if (major !== undefined) {
      names.add(major);
    }
  }
  for (const declared of document.declaredCategories ?? []) {
    const major = nonEmpty(declared.major);
    if (major !== undefined) {
      names.add(major);
    }
  }
  return names;
}

/**
 * Every distinct MIDDLE (track) name under one major, from items AND declared
 * nodes. The parent scope for naming a new track.
 *
 * @param document - The document to inspect.
 * @param major - The owning section name.
 * @returns The set of track names under `major`.
 */
export function existingMiddleNames(document: ScheduleDocument, major: string): Set<string> {
  const names = new Set<string>();
  for (const item of document.items) {
    if (nonEmpty(item.majorCategory) !== major) {
      continue;
    }
    const middle = nonEmpty(item.middleCategory);
    if (middle !== undefined) {
      names.add(middle);
    }
  }
  for (const declared of document.declaredCategories ?? []) {
    if (nonEmpty(declared.major) !== major) {
      continue;
    }
    const middle = nonEmpty(declared.middle);
    if (middle !== undefined) {
      names.add(middle);
    }
  }
  return names;
}

/**
 * Every distinct MINOR (detail) name under one (major, middle) track, from items
 * AND declared nodes. The parent scope for naming a new detail.
 *
 * @param document - The document to inspect.
 * @param major - The owning section name.
 * @param middle - The owning track name.
 * @returns The set of detail names under (`major`, `middle`).
 */
export function existingMinorNames(
  document: ScheduleDocument,
  major: string,
  middle: string,
): Set<string> {
  const names = new Set<string>();
  for (const item of document.items) {
    if (nonEmpty(item.majorCategory) !== major || nonEmpty(item.middleCategory) !== middle) {
      continue;
    }
    const minor = nonEmpty(item.minorCategory);
    if (minor !== undefined) {
      names.add(minor);
    }
  }
  for (const declared of document.declaredCategories ?? []) {
    if (nonEmpty(declared.major) !== major || nonEmpty(declared.middle) !== middle) {
      continue;
    }
    const minor = nonEmpty(declared.minor);
    if (minor !== undefined) {
      names.add(minor);
    }
  }
  return names;
}

/**
 * The FIRST (default) middle/track name under a section, in tree order: the first
 * item-derived track under `major`, else the first declared track. Used to give a
 * new item created at the SECTION (major) level a sensible default track instead of
 * leaving it floating at the bare-major level (middle auto-default).
 *
 * @param document - The document to inspect.
 * @param major - The owning section name.
 * @returns The first track name under `major`, or undefined when the section has
 *   none yet.
 */
export function firstMiddleNameOfMajor(document: ScheduleDocument, major: string): string | undefined {
  for (const item of document.items) {
    if (nonEmpty(item.majorCategory) !== major) {
      continue;
    }
    const middle = nonEmpty(item.middleCategory);
    if (middle !== undefined) {
      return middle;
    }
  }
  for (const declared of document.declaredCategories ?? []) {
    if (nonEmpty(declared.major) !== major) {
      continue;
    }
    const middle = nonEmpty(declared.middle);
    if (middle !== undefined) {
      return middle;
    }
  }
  return undefined;
}

/**
 * Resolve the DEFAULT track a new item should adopt when created at the SECTION
 * (major) level (middle auto-default): the section's first existing track, or a
 * freshly named `NoneN` track when the section has none. Never hard-blocks creation
 * -- it always returns a usable middle name so the new item lands under a track.
 *
 * @param document - The document to inspect.
 * @param major - The owning section name.
 * @returns A track name to use as the new item's `middleCategory`.
 */
export function defaultMiddleForMajor(document: ScheduleDocument, major: string): string {
  return firstMiddleNameOfMajor(document, major) ?? nextDefaultCategoryName(existingMiddleNames(document, major));
}

/** The depth implied by which path components a declared node sets (0/1/2). */
export function declaredCategoryDepth(node: DeclaredCategory): ClassificationDepth {
  if (nonEmpty(node.middle) !== undefined && nonEmpty(node.minor) !== undefined) {
    return 2;
  }
  if (nonEmpty(node.middle) !== undefined) {
    return 1;
  }
  return 0;
}

/** True when two declared nodes denote the same branch. */
function sameDeclaredCategory(left: DeclaredCategory, right: DeclaredCategory): boolean {
  return (
    nonEmpty(left.major) === nonEmpty(right.major) &&
    nonEmpty(left.middle) === nonEmpty(right.middle) &&
    nonEmpty(left.minor) === nonEmpty(right.minor)
  );
}

/**
 * Append a declared node to the registry unless an identical branch is already
 * declared. Returns the SAME array reference when nothing was added, so the
 * command layer can detect a no-op by identity.
 *
 * @param declared - The current declared registry (may be undefined).
 * @param node - The branch to declare.
 * @returns The next registry array.
 */
export function appendDeclaredCategory(
  declared: readonly DeclaredCategory[] | undefined,
  node: DeclaredCategory,
): readonly DeclaredCategory[] {
  const list = declared ?? [];
  if (list.some((existing) => sameDeclaredCategory(existing, node))) {
    return list;
  }
  return [...list, node];
}

/**
 * Remove a declared branch AND all of its declared descendants (a major drops its
 * tracks and details; a track drops its details). Returns the SAME reference when
 * nothing matched, so a no-op is detectable by identity.
 *
 * @param declared - The current declared registry (may be undefined).
 * @param node - The branch (subtree root) to remove.
 * @returns The next registry array.
 */
export function removeDeclaredSubtree(
  declared: readonly DeclaredCategory[] | undefined,
  node: DeclaredCategory,
): readonly DeclaredCategory[] {
  const list = declared ?? [];
  const depth = declaredCategoryDepth(node);
  const major = nonEmpty(node.major);
  const middle = nonEmpty(node.middle);
  const minor = nonEmpty(node.minor);
  const next = list.filter((entry) => {
    if (nonEmpty(entry.major) !== major) {
      return true;
    }
    if (depth >= 1 && nonEmpty(entry.middle) !== middle) {
      return true;
    }
    if (depth >= 2 && nonEmpty(entry.minor) !== minor) {
      return true;
    }
    return false;
  });
  return next.length === list.length ? list : next;
}
