/**
 * UseCase layer: section / row organizer (ARCH-C-015, ADR of SECT domain).
 *
 * Pure, side-effect-free helpers that reorder sections (SECT-L1-002), resolve the
 * visible-and-ordered row sequence when some sections are collapsed
 * (SECT-L1-003), enumerate the small re-show tabs for hidden sections
 * (SECT-L1-004), and describe the section bands used to draw classification
 * horizontal lines (SECT-L1-001). None of these touch the DOM or the store; the
 * command layer wraps them into undoable transforms and the adapters render the
 * result.
 */

import type { Row, Section } from '../model/schedule-model.js';

/** Whether a section is currently hidden (collapsed). Absent = visible. */
export function isSectionCollapsed(section: Section): boolean {
  return section.collapsed === true;
}

/** Sections sorted by their `order` field (ascending), stable for ties. */
export function sectionsInOrder(sections: readonly Section[]): Section[] {
  return [...sections].sort((left, right) => left.order - right.order);
}

/**
 * Move a section to a new position in the visible order and renumber every
 * section's `order` to a dense 0..n-1 sequence, so reordering is idempotent and
 * never leaves gaps (SECT-L1-002).
 *
 * @param sections - All sections.
 * @param sectionId - The section being dragged.
 * @param targetIndex - Destination index within the ordered section list.
 * @returns A new section array (same references when nothing moved).
 */
export function moveSectionToIndex(
  sections: readonly Section[],
  sectionId: string,
  targetIndex: number,
): Section[] {
  const ordered = sectionsInOrder(sections);
  const fromIndex = ordered.findIndex((section) => section.id === sectionId);
  if (fromIndex === -1) {
    return [...sections];
  }
  const clampedTarget = Math.min(Math.max(targetIndex, 0), ordered.length - 1);
  if (clampedTarget === fromIndex) {
    return [...sections];
  }
  const moving = ordered[fromIndex];
  if (moving === undefined) {
    return [...sections];
  }
  ordered.splice(fromIndex, 1);
  ordered.splice(clampedTarget, 0, moving);
  return ordered.map((section, index) => ({ ...section, order: index }));
}

/** Direction of a single-step section reorder nudge. */
export type SectionMoveDirection = 'up' | 'down';

/**
 * Compute the destination index for nudging a section one step up or down in the
 * ordered section list, or `null` when the move is not possible because the
 * section is already at that end (SECT-L1-002). The left pane uses this both to
 * dispatch {@link reorderSectionCommand} and to disable the ▲ / ▼ button at the
 * boundaries, so the affordance and its enabled state share one source of truth.
 *
 * @param sections - All sections.
 * @param sectionId - The section to nudge.
 * @param direction - `'up'` (towards index 0) or `'down'` (towards the end).
 * @returns The target index, or `null` when the section cannot move that way.
 */
export function sectionReorderTarget(
  sections: readonly Section[],
  sectionId: string,
  direction: SectionMoveDirection,
): number | null {
  const ordered = sectionsInOrder(sections);
  const currentIndex = ordered.findIndex((section) => section.id === sectionId);
  if (currentIndex === -1) {
    return null;
  }
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex > ordered.length - 1) {
    return null;
  }
  return targetIndex;
}

/**
 * Toggle or set a section's collapsed (hidden) flag (SECT-L1-003).
 *
 * @param sections - All sections.
 * @param sectionId - The section to change.
 * @param collapsed - The new collapsed value.
 * @returns A new section array (same references when unchanged).
 */
export function setSectionCollapsed(
  sections: readonly Section[],
  sectionId: string,
  collapsed: boolean,
): readonly Section[] {
  let changed = false;
  const next = sections.map((section) => {
    if (section.id !== sectionId || isSectionCollapsed(section) === collapsed) {
      return section;
    }
    changed = true;
    return { ...section, collapsed };
  });
  // Return the SAME reference when nothing changed so callers (the command layer)
  // can detect a no-op by identity and skip a spurious history entry.
  return changed ? next : sections;
}

/**
 * Resolve the rows that should be laid out, in vertical (top-to-bottom) order:
 * sections in their `order`, each visible section's rows in row `order`, with
 * collapsed sections' rows omitted entirely (SECT-L1-002 order + SECT-L1-003
 * hide). Rows whose section is missing or absent from `rowIds` are appended at
 * the end so no row is silently dropped.
 *
 * @param sections - All sections.
 * @param rows - All rows.
 * @returns The ordered, visible rows for the layout engine.
 */
export function orderedVisibleRows(
  sections: readonly Section[],
  rows: readonly Row[],
): Row[] {
  const rowById = new Map<string, Row>();
  for (const row of rows) {
    rowById.set(row.id, row);
  }
  const emitted = new Set<string>();
  const result: Row[] = [];

  for (const section of sectionsInOrder(sections)) {
    if (isSectionCollapsed(section)) {
      // Mark this section's rows as "accounted for" so they are not re-emitted
      // as orphans below; they are intentionally hidden.
      for (const rowId of section.rowIds) {
        emitted.add(rowId);
      }
      continue;
    }
    const sectionRows = section.rowIds
      .map((rowId) => rowById.get(rowId))
      .filter((row): row is Row => row !== undefined)
      .sort((left, right) => left.order - right.order);
    for (const row of sectionRows) {
      if (!emitted.has(row.id)) {
        emitted.add(row.id);
        result.push(row);
      }
    }
  }

  for (const row of rows) {
    if (!emitted.has(row.id)) {
      emitted.add(row.id);
      result.push(row);
    }
  }
  return result;
}

/** A re-show tab for one collapsed section (SECT-L1-004). */
export interface HiddenSectionTab {
  readonly sectionId: string;
  readonly name: string;
  /** 0-based index among the hidden tabs; the tab count equals hidden count. */
  readonly tabIndex: number;
}

/**
 * Enumerate the small tabs for hidden sections (SECT-L1-004/005). The tab count
 * equals the number of collapsed sections, so adding a hidden section adds one
 * tab -- the caller lays them out side by side WITHOUT thickening the line.
 *
 * @param sections - All sections.
 * @returns One tab per collapsed section, in section order.
 */
export function hiddenSectionTabs(sections: readonly Section[]): HiddenSectionTab[] {
  const tabs: HiddenSectionTab[] = [];
  for (const section of sectionsInOrder(sections)) {
    if (isSectionCollapsed(section)) {
      tabs.push({ sectionId: section.id, name: section.name, tabIndex: tabs.length });
    }
  }
  return tabs;
}

/** A contiguous band of visible rows belonging to one section. */
export interface SectionBand {
  readonly sectionId: string;
  readonly name: string;
  /** Index of the band's first row within {@link orderedVisibleRows}. */
  readonly startRowIndex: number;
  /** Number of visible rows in the band (>= 1). */
  readonly rowCount: number;
}

/**
 * Describe the visible sections as contiguous row bands, so the renderer can
 * draw one classification horizontal line at the top of each band (SECT-L1-001)
 * and the left pane can group rows under section headers.
 *
 * @param sections - All sections.
 * @param rows - All rows.
 * @returns Bands aligned with {@link orderedVisibleRows} indexing.
 */
export function visibleSectionBands(
  sections: readonly Section[],
  rows: readonly Row[],
): SectionBand[] {
  const visibleRows = orderedVisibleRows(sections, rows);
  const sectionById = new Map<string, Section>();
  for (const section of sections) {
    sectionById.set(section.id, section);
  }
  const bands: SectionBand[] = [];
  visibleRows.forEach((row, index) => {
    const last = bands[bands.length - 1];
    if (last !== undefined && last.sectionId === row.sectionId) {
      bands[bands.length - 1] = { ...last, rowCount: last.rowCount + 1 };
      return;
    }
    bands.push({
      sectionId: row.sectionId,
      name: sectionById.get(row.sectionId)?.name ?? row.sectionId,
      startRowIndex: index,
      rowCount: 1,
    });
  });
  return bands;
}
