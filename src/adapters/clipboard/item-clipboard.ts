/**
 * Adapter layer: in-memory item clipboard (ARCH-C-027, TOOL-L1-003).
 *
 * Holds a snapshot of copied items and produces offset clones with fresh ids on
 * paste. Kept intentionally simple (session-local, no OS clipboard) for M2.
 */

import type { ScheduleItem } from '../../domain/model/schedule-model.js';
import { fromDayNumber, toDayNumber } from '../../domain/usecase/time-coordinate-mapper.js';
import { generateUniqueShortId } from '../id/id-generator.js';

/** Days a pasted clone is shifted so it does not land exactly on the original. */
export const PASTE_OFFSET_DAYS = 3;

/** Session-local clipboard for schedule items. */
export class ItemClipboard {
  private copied: readonly ScheduleItem[] = [];

  /** True when there is at least one copied item available to paste. */
  public hasContent(): boolean {
    return this.copied.length > 0;
  }

  /**
   * Copy a set of items (a defensive snapshot is stored).
   *
   * @param items - The items to copy.
   */
  public copy(items: readonly ScheduleItem[]): void {
    this.copied = items.map((item) => ({ ...item }));
  }

  /**
   * Produce fresh clones of the copied items, shifted by {@link PASTE_OFFSET_DAYS}
   * with new short unique ids, preserving all other properties (TOOL-L1-003). Each
   * clone's id is minted via the id-generator seam and guaranteed not to collide
   * with any id already in the document nor with an earlier clone in this batch.
   *
   * @param existingItemIds - Ids already present in the document to avoid.
   * @returns The cloned items to append (empty when the clipboard is empty).
   */
  public createPasteClones(existingItemIds: ReadonlySet<string>): ScheduleItem[] {
    const usedIds = new Set(existingItemIds);
    return this.copied.map((item) => {
      const id = generateUniqueShortId(usedIds);
      usedIds.add(id);
      const clone: ScheduleItem = {
        ...item,
        id,
        startDate: fromDayNumber(toDayNumber(item.startDate) + PASTE_OFFSET_DAYS),
        endDate:
          item.endDate === null
            ? null
            : fromDayNumber(toDayNumber(item.endDate) + PASTE_OFFSET_DAYS),
      };
      return clone;
    });
  }
}
