/**
 * UseCase layer: the lightweight i18n value resolver (PROP-L1-003, ADR-008,
 * DATA-JSON-012). Pure, no DOM. Localizes user-visible VALUES and built-in UI
 * labels; property NAMES (field keys) stay English (PROP-L1-004) and are never
 * routed through here.
 *
 * The mechanism is deliberately minimal: a value is either a plain `string`
 * (a non-localized literal the user typed) or an {@link I18nValue} locale map
 * ({en, ja}). {@link resolveI18nValue} returns the active-locale string, falling
 * back to the default locale, then to any present locale, then to an empty
 * string, so a missing translation never breaks rendering.
 */

import type { I18nValue, Locale } from '../model/schedule-model.js';

/** The default locale used when none is active or a translation is missing. */
export const DEFAULT_LOCALE: Locale = 'en';

/** The locales this build ships (ADR-008). */
export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'ja'];

/** True when a value is a locale map rather than a plain literal string. */
function isI18nValue(value: string | I18nValue): value is I18nValue {
  return typeof value === 'object' && value !== null;
}

/**
 * Resolve a possibly-localized value to a display string for the active locale
 * (PROP-L1-003). A plain string is returned verbatim (a literal user value that
 * is not translated). For a locale map, the active locale wins; then the default
 * locale; then any present locale; otherwise an empty string.
 *
 * @param value - A plain string or an {en, ja} locale map.
 * @param activeLocale - The UI locale to display (defaults to DEFAULT_LOCALE).
 * @returns The best display string for the active locale.
 */
export function resolveI18nValue(
  value: string | I18nValue | undefined,
  activeLocale: Locale = DEFAULT_LOCALE,
): string {
  if (value === undefined) {
    return '';
  }
  if (!isI18nValue(value)) {
    return value;
  }
  const active = value[activeLocale];
  if (active !== undefined) {
    return active;
  }
  const fallback = value[DEFAULT_LOCALE];
  if (fallback !== undefined) {
    return fallback;
  }
  for (const locale of SUPPORTED_LOCALES) {
    const candidate = value[locale];
    if (candidate !== undefined) {
      return candidate;
    }
  }
  return '';
}

/**
 * Built-in UI label keys with en/ja translations (PROP-L1-003). Only the
 * chrome/palette labels the app itself renders live here; user data values are
 * localized via their own {@link I18nValue} maps. Keys are stable English
 * identifiers.
 */
export const UI_LABELS: Readonly<Record<string, I18nValue>> = {
  properties: { en: 'Properties', ja: 'プロパティ' },
  tools: { en: 'Tools', ja: 'ツール' },
  milestone: { en: 'Milestone', ja: 'マイルストーン' },
  task: { en: 'Task', ja: 'タスク' },
  undo: { en: 'Undo', ja: '元に戻す' },
  redo: { en: 'Redo', ja: 'やり直し' },
  armed: { en: 'armed', ja: '選択中' },
  none: { en: 'none', ja: 'なし' },
  watermark: { en: 'Watermark', ja: '透かし' },
  user_name: { en: 'User name', ja: 'ユーザー名' },
  language: { en: 'Language', ja: '言語' },
  export_json: { en: 'Export JSON', ja: 'JSON 出力' },
  export_xml: { en: 'Export XML', ja: 'XML 出力' },
  export_svg: { en: 'Export SVG', ja: 'SVG 出力' },
  import: { en: 'Import', ja: '取り込み' },
  import_icon: { en: 'Import icon', ja: 'アイコン取り込み' },
  // Command-palette action accessible names (floating toolbar, TOOL-L1-006).
  run_benchmark: { en: 'Run benchmark', ja: 'ベンチマーク実行' },
  link_mode: { en: 'Dependency link mode', ja: '依存リンクモード' },
  plan_actual_display: { en: 'Plan/actual display', ja: '予実表示' },
  plan_display: { en: 'Plan', ja: '予定' },
  actual_display: { en: 'Actual', ja: '実績' },
  fit_to_content: { en: 'Fit schedule to view', ja: '全体表示' },
  toggle_fullscreen: { en: 'Toggle fullscreen', ja: '全画面表示' },
  today_line: { en: 'Today line', ja: '本日線' },
  dual_cursor: { en: 'Dual cursor', ja: 'デュアルカーソル' },
  grid_date_lines: { en: 'Date gridlines', ja: '日付グリッド線' },
  grid_category_lines: { en: 'Category gridlines', ja: '分類グリッド線' },
  add_comment: { en: 'Add comment', ja: 'コメント追加' },
  add_box: { en: 'Add box', ja: '枠追加' },
  font_size_small: { en: 'Font size small', ja: '文字サイズ 小' },
  font_size_medium: { en: 'Font size medium', ja: '文字サイズ 中' },
  font_size_large: { en: 'Font size large', ja: '文字サイズ 大' },
  commands: { en: 'Commands', ja: 'コマンド' },
  select_item_hint: {
    en: 'Select an item to edit its properties.',
    ja: 'アイテムを選択してプロパティを編集します。',
  },
  // Accessible-name / a11y strings (M5c, WCAG 4.1.2 / 1.1.1 / 2.1.1).
  date_range_to: { en: 'to', ja: 'から' },
  schedule_canvas: { en: 'Schedule chart', ja: '日程表キャンバス' },
  canvas_keyboard_help: {
    en: 'Use Tab to move between items, arrow keys to move the selected item by a day or a row, Shift with left or right arrow to resize, Enter to place an armed shape or edit, and Escape to cancel.',
    ja: 'Tab でアイテム間を移動、矢印キーで選択アイテムを 1 日または 1 行移動、Shift + 左右矢印でリサイズ、Enter で選択中の図形の配置または編集、Escape で取り消し。',
  },
  toolbar: { en: 'Main toolbar', ja: 'メインツールバー' },
  classification_pane: { en: 'Classification pane', ja: '分類ペイン' },
  hide_section: { en: 'Hide section', ja: 'セクションを隠す' },
  show_section: { en: 'Show section', ja: 'セクションを表示' },
  autosave_status: { en: 'Autosave status', ja: '自動保存の状態' },
} as const;

/**
 * Look up a built-in UI label for the active locale (PROP-L1-003). Unknown keys
 * return the key itself so a missing entry is visible but non-fatal.
 *
 * @param labelKey - A key of {@link UI_LABELS}.
 * @param activeLocale - The UI locale to display.
 * @returns The localized label, or the key when unknown.
 */
export function uiLabel(labelKey: string, activeLocale: Locale = DEFAULT_LOCALE): string {
  const entry = UI_LABELS[labelKey];
  return entry === undefined ? labelKey : resolveI18nValue(entry, activeLocale);
}
