/**
 * UseCase layer: accessible-name builders (WCAG 4.1.2 Name/Role/Value,
 * 1.1.1 Non-text Content). Pure, no DOM. Produces the human-readable text that
 * the adapters attach as `aria-label` / `<title>` to non-text graphics and
 * icon-only controls, so a screen reader announces something meaningful.
 *
 * The item name follows the spec hint "abbrev + kind + dates" (M5c): a milestone
 * reads as "<abbrev> milestone, <date>" and a task as
 * "<abbrev> task, <start> to <end>". Kind and connective words are localized
 * through the shared i18n label table (PROP-L1-003) so the announcement matches
 * the active UI locale; the property NAMES themselves stay English (PROP-L1-004),
 * which is unaffected here because these are user-facing VALUES/labels.
 */

import type { Locale, ScheduleItem } from '../model/schedule-model.js';
import { uiLabel } from './i18n.js';

/**
 * Build the accessible name of a schedule item (WCAG 1.1.1 / 4.1.2). Never empty:
 * when the abbreviation is blank the kind word carries the name.
 *
 * @param item - The item to describe.
 * @param locale - Active UI locale for the kind/connective words.
 * @returns A non-empty descriptive name, e.g. "M1 milestone, 2026-01-05".
 */
export function itemAccessibleName(item: ScheduleItem, locale: Locale = 'en'): string {
  const kindWord = uiLabel(item.itemKind === 'milestone' ? 'milestone' : 'task', locale);
  const abbrev = item.abbrev.trim();
  const head = abbrev.length > 0 ? `${abbrev} ${kindWord}` : kindWord;
  if (item.itemKind === 'task' && item.endDate !== null) {
    const between = uiLabel('date_range_to', locale);
    return `${head}, ${item.startDate} ${between} ${item.endDate}`;
  }
  return `${head}, ${item.startDate}`;
}

/**
 * Build the accessible name of a tool-palette shape button (WCAG 1.1.1 / 4.1.2):
 * the icon glyph alone conveys nothing to assistive tech, so this pairs the item
 * kind with the concrete shape, e.g. "milestone circle" / "task bar". Always
 * non-empty.
 *
 * @param itemKind - Whether the button arms a milestone or a task.
 * @param shapeName - The concrete shape identifier (e.g. "circle", "bar").
 * @param locale - Active UI locale for the kind word.
 * @returns A non-empty descriptive name for the button.
 */
export function paletteShapeAccessibleName(
  itemKind: 'milestone' | 'task',
  shapeName: string,
  locale: Locale = 'en',
): string {
  const kindWord = uiLabel(itemKind, locale);
  return `${kindWord} ${shapeName}`;
}
