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
  ClassificationNodeState,
  DeclaredCategory,
  Dependency,
  Row,
  ScheduleDocument,
  ScheduleItem,
  Section,
} from '../model/schedule-model.js';
import type { SectionBand } from './section-organizer.js';
import {
  makeDependencyIdFactory,
  nextNumericSuffixName,
  partitionDependenciesForCopy,
} from './classification-copy.js';

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

// ---------------------------------------------------------------------------
// Per-node state (order + hidden) indexing (CLASSIFICATION-PANE restructure)
// ---------------------------------------------------------------------------

/**
 * Sort-key base for a sibling that has NO explicit {@link ClassificationNodeState.sortIndex}
 * yet: it sorts AFTER every reordered sibling (which carry a dense 0..n-1 index),
 * preserving first-appearance order among the not-yet-reordered ones.
 */
const APPEARANCE_SORT_BASE = 1_000_000;

/** Indexed per-node state: explicit sort keys and the set of hidden node keys. */
interface IndexedNodeStates {
  readonly sortIndexByKey: Map<string, number>;
  readonly hiddenKeys: Set<string>;
}

/** Build fast lookups (sortIndex / hidden) keyed by classification path. */
function indexNodeStates(
  states: readonly ClassificationNodeState[] | undefined,
): IndexedNodeStates {
  const sortIndexByKey = new Map<string, number>();
  const hiddenKeys = new Set<string>();
  for (const state of states ?? []) {
    const major = nonEmpty(state.major);
    if (major === undefined) {
      continue;
    }
    const middle = nonEmpty(state.middle);
    const minor = middle === undefined ? undefined : nonEmpty(state.minor);
    const key = classificationRowId(major, middle, minor);
    if (state.sortIndex !== undefined && Number.isFinite(state.sortIndex)) {
      sortIndexByKey.set(key, state.sortIndex);
    }
    if (state.hidden === true) {
      hiddenKeys.add(key);
    }
  }
  return { sortIndexByKey, hiddenKeys };
}

/** The effective sort key of a sibling (explicit index, else appearance order). */
function siblingSortKey(
  sortIndexByKey: ReadonlyMap<string, number>,
  key: string,
  appearanceIndex: number,
): number {
  const explicit = sortIndexByKey.get(key);
  return explicit !== undefined ? explicit : APPEARANCE_SORT_BASE + appearanceIndex;
}

/** Stably order sibling names by their per-node sort key. */
function orderSiblings(
  names: readonly string[],
  keyOf: (name: string) => string,
  sortIndexByKey: ReadonlyMap<string, number>,
): string[] {
  return names
    .map((name, appearanceIndex) => ({
      name,
      sortKey: siblingSortKey(sortIndexByKey, keyOf(name), appearanceIndex),
      appearanceIndex,
    }))
    .sort((left, right) =>
      left.sortKey !== right.sortKey
        ? left.sortKey - right.sortKey
        : left.appearanceIndex - right.appearanceIndex,
    )
    .map((entry) => entry.name);
}

/** Aggregated per-middle content while building one major's subtree. */
interface MiddleAgg {
  hasMiddleItem: boolean;
  /** A declared `{ major, middle }` (no minor) forces an empty track row to show. */
  emptyDeclared: boolean;
  readonly minors: string[];
  readonly minorSeen: Set<string>;
}

/** Aggregated per-major content while building the tree. */
interface MajorAgg {
  hasMajorItem: boolean;
  readonly middles: string[];
  readonly middleSeen: Set<string>;
  readonly perMiddle: Map<string, MiddleAgg>;
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
 * MIDDLE / MINOR sibling ORDER and HIDDEN state come from
 * {@link ScheduleDocument.classificationNodeStates}: siblings are emitted in their
 * `sortIndex` order (first-appearance for those never reordered), and a hidden
 * node (and its whole subtree) is dropped from `rows` / `rowIds` so its items get
 * no placement on the canvas -- exactly like a collapsed section, but per node. A
 * section whose entire content is hidden still gets a bare placeholder row so its
 * header (carrying the show-all control) remains reachable.
 *
 * @param scheduleDocument - The document whose classification to re-derive.
 * @returns A new document with a materialized classification tree.
 */
export function rebuildClassification(scheduleDocument: ScheduleDocument): ScheduleDocument {
  // Preserve order + collapsed + id for any existing section, keyed by its major name.
  const existingByName = new Map<string, Section>();
  for (const section of scheduleDocument.sections) {
    if (!existingByName.has(section.name)) {
      existingByName.set(section.name, section);
    }
  }

  const { sortIndexByKey, hiddenKeys } = indexNodeStates(scheduleDocument.classificationNodeStates);

  // First-appearance order of majors, and per-major aggregated subtree content.
  const majorOrder: string[] = [];
  const seenMajor = new Set<string>();
  const aggByMajor = new Map<string, MajorAgg>();
  const rowIdByItemId = new Map<string, string>();

  const ensureMajor = (major: string): MajorAgg => {
    let agg = aggByMajor.get(major);
    if (agg === undefined) {
      seenMajor.add(major);
      majorOrder.push(major);
      agg = {
        hasMajorItem: false,
        middles: [],
        middleSeen: new Set(),
        perMiddle: new Map(),
      };
      aggByMajor.set(major, agg);
    }
    return agg;
  };
  const ensureMiddle = (agg: MajorAgg, middle: string): MiddleAgg => {
    let mid = agg.perMiddle.get(middle);
    if (mid === undefined) {
      agg.middles.push(middle);
      agg.middleSeen.add(middle);
      mid = { hasMiddleItem: false, emptyDeclared: false, minors: [], minorSeen: new Set() };
      agg.perMiddle.set(middle, mid);
    }
    return mid;
  };

  for (const item of scheduleDocument.items) {
    const path = resolveClassificationPath(item);
    const { major, depth } = path;
    const agg = ensureMajor(major);
    rowIdByItemId.set(
      item.id,
      classificationRowId(
        major,
        depth >= 1 ? path.middle : undefined,
        depth >= 2 ? path.minor : undefined,
      ),
    );
    if (depth === 0) {
      agg.hasMajorItem = true;
      continue;
    }
    if (path.middle === undefined) {
      continue;
    }
    const mid = ensureMiddle(agg, path.middle);
    if (depth === 1) {
      mid.hasMiddleItem = true;
      continue;
    }
    if (path.minor !== undefined && !mid.minorSeen.has(path.minor)) {
      mid.minorSeen.add(path.minor);
      mid.minors.push(path.minor);
    }
  }

  // Fold DECLARED nodes: force the major/middle to exist and mark empty declared
  // tracks / detail leaves so an added-but-empty branch still renders a row.
  for (const declared of scheduleDocument.declaredCategories ?? []) {
    const major = nonEmpty(declared.major);
    if (major === undefined) {
      continue;
    }
    const agg = ensureMajor(major);
    const middle = nonEmpty(declared.middle);
    if (middle === undefined) {
      continue;
    }
    const mid = ensureMiddle(agg, middle);
    const minor = nonEmpty(declared.minor);
    if (minor === undefined) {
      mid.emptyDeclared = true;
    } else if (!mid.minorSeen.has(minor)) {
      mid.minorSeen.add(minor);
      mid.minors.push(minor);
    }
  }

  const orderedMajors = orderMajors(majorOrder, existingByName);

  const sections: Section[] = [];
  const rows: Row[] = [];
  orderedMajors.forEach((major, index) => {
    const agg = aggByMajor.get(major);
    const existing = existingByName.get(major);
    const sectionId = existing?.id ?? `sec:${major}`;
    const bucket: Row[] = [];
    const pushRow = (
      middle: string | undefined,
      minor: string | undefined,
      depth: ClassificationDepth,
    ): void => {
      const rowId = classificationRowId(
        major,
        depth >= 1 ? middle : undefined,
        depth >= 2 ? minor : undefined,
      );
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

    if (agg !== undefined) {
      if (agg.hasMajorItem) {
        pushRow(undefined, undefined, 0);
      }
      const orderedMiddles = orderSiblings(
        agg.middles,
        (middle) => classificationRowId(major, middle),
        sortIndexByKey,
      );
      for (const middle of orderedMiddles) {
        if (hiddenKeys.has(classificationRowId(major, middle))) {
          continue; // hidden track: drop the whole subtree from layout + pane
        }
        const mid = agg.perMiddle.get(middle);
        if (mid === undefined) {
          continue;
        }
        if (mid.hasMiddleItem || mid.emptyDeclared) {
          pushRow(middle, undefined, 1);
        }
        const orderedMinors = orderSiblings(
          mid.minors,
          (minor) => classificationRowId(major, middle, minor),
          sortIndexByKey,
        );
        for (const minor of orderedMinors) {
          if (hiddenKeys.has(classificationRowId(major, middle, minor))) {
            continue; // hidden detail leaf
          }
          pushRow(middle, minor, 2);
        }
      }
    }

    // A section with no visible rows still needs a placeholder so its header (and
    // its show-all control) stay reachable and items can be created into it.
    if (bucket.length === 0) {
      pushRow(undefined, undefined, 0);
    }

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

  const items = scheduleDocument.items.map((item) => {
    const rowId = rowIdByItemId.get(item.id);
    return rowId !== undefined && rowId !== item.rowId ? { ...item, rowId } : item;
  });

  return { ...scheduleDocument, sections, rows, items };
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
 * @param scheduleDocument - The document to inspect.
 * @returns The set of section names.
 */
export function existingMajorNames(scheduleDocument: ScheduleDocument): Set<string> {
  const names = new Set<string>();
  for (const item of scheduleDocument.items) {
    const major = nonEmpty(item.majorCategory);
    if (major !== undefined) {
      names.add(major);
    }
  }
  for (const declared of scheduleDocument.declaredCategories ?? []) {
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
 * @param scheduleDocument - The document to inspect.
 * @param major - The owning section name.
 * @returns The set of track names under `major`.
 */
export function existingMiddleNames(scheduleDocument: ScheduleDocument, major: string): Set<string> {
  const names = new Set<string>();
  for (const item of scheduleDocument.items) {
    if (nonEmpty(item.majorCategory) !== major) {
      continue;
    }
    const middle = nonEmpty(item.middleCategory);
    if (middle !== undefined) {
      names.add(middle);
    }
  }
  for (const declared of scheduleDocument.declaredCategories ?? []) {
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
 * @param scheduleDocument - The document to inspect.
 * @param major - The owning section name.
 * @param middle - The owning track name.
 * @returns The set of detail names under (`major`, `middle`).
 */
export function existingMinorNames(
  scheduleDocument: ScheduleDocument,
  major: string,
  middle: string,
): Set<string> {
  const names = new Set<string>();
  for (const item of scheduleDocument.items) {
    if (nonEmpty(item.majorCategory) !== major || nonEmpty(item.middleCategory) !== middle) {
      continue;
    }
    const minor = nonEmpty(item.minorCategory);
    if (minor !== undefined) {
      names.add(minor);
    }
  }
  for (const declared of scheduleDocument.declaredCategories ?? []) {
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
 * @param scheduleDocument - The document to inspect.
 * @param major - The owning section name.
 * @returns The first track name under `major`, or undefined when the section has
 *   none yet.
 */
export function firstMiddleNameOfMajor(scheduleDocument: ScheduleDocument, major: string): string | undefined {
  for (const item of scheduleDocument.items) {
    if (nonEmpty(item.majorCategory) !== major) {
      continue;
    }
    const middle = nonEmpty(item.middleCategory);
    if (middle !== undefined) {
      return middle;
    }
  }
  for (const declared of scheduleDocument.declaredCategories ?? []) {
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
 * @param scheduleDocument - The document to inspect.
 * @param major - The owning section name.
 * @returns A track name to use as the new item's `middleCategory`.
 */
export function defaultMiddleForMajor(scheduleDocument: ScheduleDocument, major: string): string {
  return firstMiddleNameOfMajor(scheduleDocument, major) ?? nextDefaultCategoryName(existingMiddleNames(scheduleDocument, major));
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

// ---------------------------------------------------------------------------
// Per-node ORDER + HIDDEN + COPY registry (CLASSIFICATION-PANE restructure)
// ---------------------------------------------------------------------------

/** A one-step reorder direction among a node's siblings. */
export type CategoryMoveDirection = 'up' | 'down';

/** Distinct MIDDLE names under a major, in first-appearance order (items then declared). */
function appearanceMiddles(scheduleDocument: ScheduleDocument, major: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (value: string | undefined): void => {
    if (value !== undefined && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  };
  for (const item of scheduleDocument.items) {
    if (nonEmpty(item.majorCategory) === major) {
      add(nonEmpty(item.middleCategory));
    }
  }
  for (const declared of scheduleDocument.declaredCategories ?? []) {
    if (nonEmpty(declared.major) === major) {
      add(nonEmpty(declared.middle));
    }
  }
  return out;
}

/** Distinct MINOR names under a track, in first-appearance order (items then declared). */
function appearanceMinors(scheduleDocument: ScheduleDocument, major: string, middle: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (value: string | undefined): void => {
    if (value !== undefined && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  };
  for (const item of scheduleDocument.items) {
    if (nonEmpty(item.majorCategory) === major && nonEmpty(item.middleCategory) === middle) {
      add(nonEmpty(item.minorCategory));
    }
  }
  for (const declared of scheduleDocument.declaredCategories ?? []) {
    if (nonEmpty(declared.major) === major && nonEmpty(declared.middle) === middle) {
      add(nonEmpty(declared.minor));
    }
  }
  return out;
}

/**
 * The MIDDLE (track) siblings under a major in their current display order
 * (explicit sortIndex first, else first appearance). Includes hidden tracks so a
 * reorder renumbers the full sibling set consistently.
 *
 * @param scheduleDocument - The document to inspect.
 * @param major - The owning section name.
 * @returns The ordered middle names.
 */
export function orderedMiddlesUnderMajor(scheduleDocument: ScheduleDocument, major: string): string[] {
  const { sortIndexByKey } = indexNodeStates(scheduleDocument.classificationNodeStates);
  return orderSiblings(
    appearanceMiddles(scheduleDocument, major),
    (middle) => classificationRowId(major, middle),
    sortIndexByKey,
  );
}

/**
 * The MINOR (detail) siblings under a track in their current display order.
 *
 * @param scheduleDocument - The document to inspect.
 * @param major - The owning section name.
 * @param middle - The owning track name.
 * @returns The ordered minor names.
 */
export function orderedMinorsUnderMiddle(
  scheduleDocument: ScheduleDocument,
  major: string,
  middle: string,
): string[] {
  const { sortIndexByKey } = indexNodeStates(scheduleDocument.classificationNodeStates);
  return orderSiblings(
    appearanceMinors(scheduleDocument, major, middle),
    (minor) => classificationRowId(major, middle, minor),
    sortIndexByKey,
  );
}

/** Whether two normalized paths denote the same classification node. */
function pathEquals(
  state: ClassificationNodeState,
  major: string,
  middle: string | undefined,
  minor: string | undefined,
): boolean {
  return (
    nonEmpty(state.major) === major &&
    nonEmpty(state.middle) === middle &&
    nonEmpty(state.minor) === minor
  );
}

/**
 * Build a normalized node-state entry, or `null` when it carries neither a
 * `sortIndex` nor a `hidden` flag (an inert entry is dropped to keep the registry
 * clean and to make round-trip equality stable).
 */
function makeNodeState(
  major: string,
  middle: string | undefined,
  minor: string | undefined,
  sortIndex: number | undefined,
  hidden: boolean,
): ClassificationNodeState | null {
  if (sortIndex === undefined && !hidden) {
    return null;
  }
  return {
    major,
    ...(middle !== undefined ? { middle } : {}),
    ...(minor !== undefined ? { minor } : {}),
    ...(sortIndex !== undefined ? { sortIndex } : {}),
    ...(hidden ? { hidden: true } : {}),
  };
}

/**
 * Replace / insert / prune the state entry for one node path, returning the SAME
 * array reference when nothing changed so a no-op is detectable by identity.
 */
function putNodeState(
  states: readonly ClassificationNodeState[] | undefined,
  major: string,
  middle: string | undefined,
  minor: string | undefined,
  sortIndex: number | undefined,
  hidden: boolean,
): readonly ClassificationNodeState[] {
  const list = states ?? [];
  const replacement = makeNodeState(major, middle, minor, sortIndex, hidden);
  let found = false;
  let changed = false;
  const next: ClassificationNodeState[] = [];
  for (const state of list) {
    if (pathEquals(state, major, middle, minor)) {
      found = true;
      if (replacement === null) {
        changed = true;
        continue;
      }
      if (
        state.sortIndex !== replacement.sortIndex ||
        (state.hidden === true) !== (replacement.hidden === true)
      ) {
        changed = true;
      }
      next.push(replacement);
    } else {
      next.push(state);
    }
  }
  if (!found && replacement !== null) {
    next.push(replacement);
    changed = true;
  }
  return changed ? next : list;
}

/** The existing sortIndex for a node path, if any. */
function currentSortIndex(
  states: readonly ClassificationNodeState[] | undefined,
  major: string,
  middle: string | undefined,
  minor: string | undefined,
): number | undefined {
  for (const state of states ?? []) {
    if (pathEquals(state, major, middle, minor)) {
      return state.sortIndex;
    }
  }
  return undefined;
}

/** The existing hidden flag for a node path. */
function currentHidden(
  states: readonly ClassificationNodeState[] | undefined,
  major: string,
  middle: string | undefined,
  minor: string | undefined,
): boolean {
  for (const state of states ?? []) {
    if (pathEquals(state, major, middle, minor)) {
      return state.hidden === true;
    }
  }
  return false;
}

/**
 * Set (or clear) a MIDDLE / MINOR node's hidden flag. Returns the SAME reference
 * when already in that state so the command layer detects a no-op.
 *
 * @param states - The current per-node registry (may be undefined).
 * @param node - The node path (`{ major, middle }` or `{ major, middle, minor }`).
 * @param hidden - True to hide, false to reveal.
 * @returns The next registry (same reference when unchanged).
 */
export function setCategoryNodeHidden(
  states: readonly ClassificationNodeState[] | undefined,
  node: DeclaredCategory,
  hidden: boolean,
): readonly ClassificationNodeState[] {
  const major = nonEmpty(node.major);
  const middle = nonEmpty(node.middle);
  const minor = middle === undefined ? undefined : nonEmpty(node.minor);
  if (major === undefined || middle === undefined) {
    return states ?? [];
  }
  const sortIndex = currentSortIndex(states, major, middle, minor);
  return putNodeState(states, major, middle, minor, sortIndex, hidden);
}

/**
 * Reveal ALL hidden descendants under a node at once (the pane's `□` show-all):
 *
 * - under a MAJOR (`{ major }`): clear hidden on every track / detail of that section;
 * - under a MIDDLE (`{ major, middle }`): clear hidden on that track's details.
 *
 * Returns the SAME reference when nothing was hidden.
 *
 * @param states - The current per-node registry (may be undefined).
 * @param node - The subtree root whose descendants to reveal.
 * @returns The next registry (same reference when unchanged).
 */
export function revealDescendants(
  states: readonly ClassificationNodeState[] | undefined,
  node: DeclaredCategory,
): readonly ClassificationNodeState[] {
  const list = states ?? [];
  const major = nonEmpty(node.major);
  if (major === undefined) {
    return list;
  }
  const depth = declaredCategoryDepth(node);
  const middle = nonEmpty(node.middle);
  let changed = false;
  const next: ClassificationNodeState[] = [];
  for (const state of list) {
    const underMajor = nonEmpty(state.major) === major;
    const underMiddle = depth < 1 || nonEmpty(state.middle) === middle;
    if (underMajor && underMiddle && state.hidden === true) {
      changed = true;
      const kept = makeNodeState(
        major,
        nonEmpty(state.middle),
        nonEmpty(state.minor),
        state.sortIndex,
        false,
      );
      if (kept !== null) {
        next.push(kept);
      }
      continue;
    }
    next.push(state);
  }
  return changed ? next : list;
}

/** Move an element from `fromIndex` to `toIndex` in a copy of `values`. */
function moveInArray<T>(values: readonly T[], fromIndex: number, toIndex: number): T[] {
  const copy = [...values];
  const [moved] = copy.splice(fromIndex, 1);
  if (moved !== undefined) {
    copy.splice(toIndex, 0, moved);
  }
  return copy;
}

/**
 * Reorder a MIDDLE / MINOR node one step among its siblings (the pane's `▲` / `▼`).
 * Writes a dense `sortIndex` to every sibling so the derived tree order follows.
 * Returns `null` when the node cannot move that way (already at the boundary) or is
 * not a middle / minor.
 *
 * @param scheduleDocument - The current document (source of the sibling order).
 * @param node - The middle / minor node to nudge.
 * @param direction - `'up'` or `'down'`.
 * @returns The next per-node registry, or `null` when the move is impossible.
 */
export function reorderCategoryNodeStates(
  scheduleDocument: ScheduleDocument,
  node: DeclaredCategory,
  direction: CategoryMoveDirection,
): readonly ClassificationNodeState[] | null {
  const major = nonEmpty(node.major);
  if (major === undefined) {
    return null;
  }
  const depth = declaredCategoryDepth(node);
  const middle = nonEmpty(node.middle);
  if (depth === 1 && middle !== undefined) {
    const siblings = orderedMiddlesUnderMajor(scheduleDocument, major);
    return reindexAfterMove(scheduleDocument.classificationNodeStates, siblings, middle, direction, (name) => [
      major,
      name,
      undefined,
    ]);
  }
  if (depth === 2 && middle !== undefined) {
    const minor = nonEmpty(node.minor);
    if (minor === undefined) {
      return null;
    }
    const siblings = orderedMinorsUnderMiddle(scheduleDocument, major, middle);
    return reindexAfterMove(scheduleDocument.classificationNodeStates, siblings, minor, direction, (name) => [
      major,
      middle,
      name,
    ]);
  }
  return null;
}

/** Move `target` one step, then write a dense sortIndex to each sibling. */
function reindexAfterMove(
  states: readonly ClassificationNodeState[] | undefined,
  siblings: readonly string[],
  target: string,
  direction: CategoryMoveDirection,
  pathOf: (name: string) => [string, string | undefined, string | undefined],
): readonly ClassificationNodeState[] | null {
  const index = siblings.indexOf(target);
  if (index === -1) {
    return null;
  }
  const toIndex = direction === 'up' ? index - 1 : index + 1;
  if (toIndex < 0 || toIndex >= siblings.length) {
    return null;
  }
  const reordered = moveInArray(siblings, index, toIndex);
  let next = states;
  reordered.forEach((name, sortIndex) => {
    const [major, middle, minor] = pathOf(name);
    next = putNodeState(next, major, middle, minor, sortIndex, currentHidden(next, major, middle, minor));
  });
  return next ?? [];
}

/**
 * The next non-colliding "copy" name for a duplicated node: strips any trailing
 * ` (n)` suffix to a stem and appends the first free ` (n)` (n >= 2), e.g.
 * `Task-Plan` -> `Task-Plan (2)`, or `Task-Plan (2)` -> `Task-Plan (3)`.
 *
 * @param baseName - The source node's name.
 * @param existingNames - Sibling names already in the parent scope.
 * @returns The first free copy name.
 */
export function nextCopyName(baseName: string, existingNames: Iterable<string>): string {
  const taken = new Set(existingNames);
  const stem = baseName.replace(/ \(\d+\)$/, '');
  let n = 2;
  while (taken.has(`${stem} (${n})`)) {
    n += 1;
  }
  return `${stem} (${n})`;
}

/** A factory yielding item ids not present in `existing` (mutating the set). */
function makeItemIdFactory(existing: Set<string>): (base: string) => string {
  return (base) => {
    let candidate = `${base} (copy)`;
    let n = 2;
    while (existing.has(candidate)) {
      candidate = `${base} (copy ${n})`;
      n += 1;
    }
    existing.add(candidate);
    return candidate;
  };
}

/** Clone one item onto a duplicated branch, overriding the copied path components. */
function cloneItemOnto(
  item: ScheduleItem,
  overrides: { major?: string; middle?: string; minor?: string },
  nextId: (base: string) => string,
): ScheduleItem {
  return {
    ...item,
    id: nextId(item.id),
    rowId: 'pending',
    ...(overrides.major !== undefined ? { majorCategory: overrides.major } : {}),
    ...(overrides.middle !== undefined ? { middleCategory: overrides.middle } : {}),
    ...(overrides.minor !== undefined ? { minorCategory: overrides.minor } : {}),
  };
}

/**
 * Clone a list of source items onto a duplicated branch, RECORDING the
 * original-id -> new-id mapping into `idRemap` (used by the CR-007 dependency
 * partition, D-4).
 */
function cloneItemsRecordingRemap(
  sourceItems: readonly ScheduleItem[],
  overrides: { major?: string; middle?: string; minor?: string },
  nextId: (base: string) => string,
  idRemap: Map<string, string>,
): ScheduleItem[] {
  return sourceItems.map((item) => {
    const clone = cloneItemOnto(item, overrides, nextId);
    idRemap.set(item.id, clone.id);
    return clone;
  });
}

/** Options controlling how a subtree is duplicated (naming + dependency handling). */
export interface DuplicateSubtreeOptions {
  /** How a copied node is renamed; defaults to the ` (n)` copy-name strategy. */
  readonly nameFor?: (baseName: string, existingNames: Iterable<string>) => string;
  /**
   * When true, dependencies internal to the duplicated subtree are reproduced for
   * the copy (remapped to the new item ids) and boundary-crossing dependencies are
   * dropped (CR-007 Part 5, D-4). Defaults to false (no dependency reproduction).
   */
  readonly reproduceInternalDependencies?: boolean;
}

/**
 * The `dependencies` array for a duplicated document: the originals plus, when
 * `reproduce` is set, the reproduced internal edges (D-4). Returns the SAME
 * reference when nothing is added so callers can detect a no-op.
 */
function withReproducedDependencies(
  scheduleDocument: ScheduleDocument,
  idRemap: ReadonlyMap<string, string>,
  reproduce: boolean,
): readonly Dependency[] | undefined {
  if (!reproduce) {
    return scheduleDocument.dependencies;
  }
  const existingDeps = scheduleDocument.dependencies ?? [];
  const makeId = makeDependencyIdFactory(new Set(existingDeps.map((edge) => edge.id)));
  const { reproduced } = partitionDependenciesForCopy(existingDeps, idRemap, makeId);
  return reproduced.length === 0 ? scheduleDocument.dependencies : [...existingDeps, ...reproduced];
}

/** Seed a section for a duplicated major placed right AFTER the original in order. */
function insertSectionAfterMajor(
  sections: readonly Section[],
  originalMajor: string,
  newMajor: string,
): readonly Section[] {
  const original = sections.find((section) => section.name === originalMajor);
  const order = (original?.order ?? sections.length) + 0.5;
  return [...sections, { id: `sec:${newMajor}`, name: newMajor, order, rowIds: [], collapsed: false }];
}

/** Reassign dense sortIndex so `newName` sits immediately after `afterName`. */
function insertSiblingAfter(
  states: readonly ClassificationNodeState[] | undefined,
  siblings: readonly string[],
  afterName: string,
  newName: string,
  pathOf: (name: string) => [string, string | undefined, string | undefined],
): readonly ClassificationNodeState[] {
  const order: string[] = [];
  for (const name of siblings) {
    order.push(name);
    if (name === afterName) {
      order.push(newName);
    }
  }
  if (!order.includes(newName)) {
    order.push(newName);
  }
  let next = states;
  order.forEach((name, sortIndex) => {
    const [major, middle, minor] = pathOf(name);
    next = putNodeState(next, major, middle, minor, sortIndex, currentHidden(next, major, middle, minor));
  });
  return next ?? [];
}

/**
 * Duplicate a classification node (MAJOR / MIDDLE / MINOR) INCLUDING its subtree
 * and every item under it, pasting the copy as the NEXT sibling with a
 * non-colliding ` (n)` name (CLASSIFICATION-PANE restructure req 3). Cloned items
 * get fresh ids; declared descendant branches are cloned too, so an empty declared
 * branch also duplicates. Returns the SAME document reference when there is nothing
 * to copy (the node has neither items nor declared descendants).
 *
 * @param scheduleDocument - The document to duplicate within.
 * @param node - The subtree root to duplicate.
 * @returns The next document (same reference when nothing was copied).
 */
export function duplicateCategorySubtree(
  scheduleDocument: ScheduleDocument,
  node: DeclaredCategory,
  options: DuplicateSubtreeOptions = {},
): ScheduleDocument {
  const major = nonEmpty(node.major);
  if (major === undefined) {
    return scheduleDocument;
  }
  const nameFor = options.nameFor ?? nextCopyName;
  const reproduce = options.reproduceInternalDependencies ?? false;
  const depth = declaredCategoryDepth(node);
  const middle = nonEmpty(node.middle);
  const minor = nonEmpty(node.minor);
  const nextId = makeItemIdFactory(new Set(scheduleDocument.items.map((item) => item.id)));
  const declaredList = scheduleDocument.declaredCategories ?? [];
  const idRemap = new Map<string, string>();

  if (depth === 0) {
    const newMajor = nameFor(major, existingMajorNames(scheduleDocument));
    const clonedItems = cloneItemsRecordingRemap(
      scheduleDocument.items.filter((item) => nonEmpty(item.majorCategory) === major),
      { major: newMajor },
      nextId,
      idRemap,
    );
    const clonedDeclared = declaredList
      .filter((entry) => nonEmpty(entry.major) === major)
      .map((entry) => ({ ...entry, major: newMajor }));
    if (clonedItems.length === 0 && clonedDeclared.length === 0) {
      return scheduleDocument;
    }
    return {
      ...scheduleDocument,
      items: [...scheduleDocument.items, ...clonedItems],
      declaredCategories: [...declaredList, ...clonedDeclared],
      sections: insertSectionAfterMajor(scheduleDocument.sections, major, newMajor),
      ...dependenciesPatch(scheduleDocument, idRemap, reproduce),
    };
  }

  if (depth === 1 && middle !== undefined) {
    const newMiddle = nameFor(middle, existingMiddleNames(scheduleDocument, major));
    const clonedItems = cloneItemsRecordingRemap(
      scheduleDocument.items.filter(
        (item) => nonEmpty(item.majorCategory) === major && nonEmpty(item.middleCategory) === middle,
      ),
      { middle: newMiddle },
      nextId,
      idRemap,
    );
    const clonedDeclared = declaredList
      .filter((entry) => nonEmpty(entry.major) === major && nonEmpty(entry.middle) === middle)
      .map((entry) => ({ ...entry, middle: newMiddle }));
    if (clonedItems.length === 0 && clonedDeclared.length === 0) {
      return scheduleDocument;
    }
    const classificationNodeStates = insertSiblingAfter(
      scheduleDocument.classificationNodeStates,
      orderedMiddlesUnderMajor(scheduleDocument, major),
      middle,
      newMiddle,
      (name) => [major, name, undefined],
    );
    return {
      ...scheduleDocument,
      items: [...scheduleDocument.items, ...clonedItems],
      declaredCategories: [...declaredList, ...clonedDeclared],
      classificationNodeStates,
      ...dependenciesPatch(scheduleDocument, idRemap, reproduce),
    };
  }

  if (depth === 2 && middle !== undefined && minor !== undefined) {
    const newMinor = nameFor(minor, existingMinorNames(scheduleDocument, major, middle));
    const clonedItems = cloneItemsRecordingRemap(
      scheduleDocument.items.filter(
        (item) =>
          nonEmpty(item.majorCategory) === major &&
          nonEmpty(item.middleCategory) === middle &&
          nonEmpty(item.minorCategory) === minor,
      ),
      { minor: newMinor },
      nextId,
      idRemap,
    );
    const clonedDeclared = declaredList
      .filter(
        (entry) =>
          nonEmpty(entry.major) === major &&
          nonEmpty(entry.middle) === middle &&
          nonEmpty(entry.minor) === minor,
      )
      .map((entry) => ({ ...entry, minor: newMinor }));
    if (clonedItems.length === 0 && clonedDeclared.length === 0) {
      return scheduleDocument;
    }
    const classificationNodeStates = insertSiblingAfter(
      scheduleDocument.classificationNodeStates,
      orderedMinorsUnderMiddle(scheduleDocument, major, middle),
      minor,
      newMinor,
      (name) => [major, middle, name],
    );
    return {
      ...scheduleDocument,
      items: [...scheduleDocument.items, ...clonedItems],
      declaredCategories: [...declaredList, ...clonedDeclared],
      classificationNodeStates,
      ...dependenciesPatch(scheduleDocument, idRemap, reproduce),
    };
  }

  return scheduleDocument;
}

/**
 * The spreadable `{ dependencies }` patch for a duplicated document: present only
 * when dependency reproduction is on AND at least one internal edge was reproduced
 * (D-4), so an unchanged dependency array keeps its identity.
 */
function dependenciesPatch(
  scheduleDocument: ScheduleDocument,
  idRemap: ReadonlyMap<string, string>,
  reproduce: boolean,
): { dependencies?: readonly Dependency[] } {
  const dependencies = withReproducedDependencies(scheduleDocument, idRemap, reproduce);
  return dependencies === scheduleDocument.dependencies || dependencies === undefined
    ? {}
    : { dependencies };
}

/**
 * Duplicate a MAJOR (section) or MIDDLE (track) classification node per CR-007
 * Part 5: the copy is named with a numeric suffix (`Body` -> `Body-1`), its child
 * rows AND items are cloned with fresh ids (categories remapped to the copy), and
 * dependencies are handled per D-4 -- internal edges reproduced (remapped), edges
 * crossing the duplication boundary dropped. Pastes the copy as the next sibling.
 * Returns the SAME document reference when there is nothing to copy.
 *
 * @param scheduleDocument - The document to duplicate within.
 * @param node - The subtree root to duplicate (`{ major }` or `{ major, middle }`).
 * @returns The next document (same reference when nothing was copied).
 */
export function copyClassificationSubtree(
  scheduleDocument: ScheduleDocument,
  node: DeclaredCategory,
): ScheduleDocument {
  return duplicateCategorySubtree(scheduleDocument, node, {
    nameFor: nextNumericSuffixName,
    reproduceInternalDependencies: true,
  });
}
