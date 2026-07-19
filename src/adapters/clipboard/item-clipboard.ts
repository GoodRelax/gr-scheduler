/**
 * Adapter layer: in-memory item clipboard (ARCH-C-027, TOOL-L1-003).
 *
 * Holds a snapshot of copied items and produces offset clones with fresh ids on
 * paste. Kept intentionally simple (session-local, no OS clipboard) for M2.
 */

import type { ScheduleItem } from '../../domain/model/schedule-model.js';
import { fromDayNumber, toDayNumber } from '../../domain/usecase/time-coordinate-mapper.js';

/** Days a pasted clone is shifted so it does not land exactly on the original. */
export const PASTE_OFFSET_DAYS = 3;

/** Session-local clipboard for schedule items. */
export class ItemClipboard {
  private copied: readonly ScheduleItem[] = [];
  private pasteSerial = 0;

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
   * with new unique ids, preserving all other properties (TOOL-L1-003).
   *
   * @returns The cloned items to append (empty when the clipboard is empty).
   */
  public createPasteClones(): ScheduleItem[] {
    const batch = this.pasteSerial++;
    return this.copied.map((item, index) => {
      const clone: ScheduleItem = {
        ...item,
        id: `item-paste-${Date.now()}-${batch}-${index}`,
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
