/**
 * Adapter layer: the Help modal (SHELL batch item 2).
 *
 * An accessible dialog (`role="dialog"`, `aria-modal="true"`) that presents ALL
 * app features on one screen in a three-column layout (CR-011), each with its
 * keyboard shortcut where one exists. Opened from the header `[?]` button, it is
 * focus-trapped, closes on Esc / the × button / a backdrop click, and returns
 * focus to the opener (WCAG 2.1.2 / 2.4.3 / 2.4.7).
 *
 * The feature catalogue is a pure data model ({@link buildHelpModel}) so it is
 * unit-testable without a DOM, and every documented shortcut is one that actually
 * exists in the input layer (keyboard-shortcuts / keyboard-navigation / wheel-mode
 * / the delete dialog) -- no phantom shortcuts.
 *
 * English only (product decision for the help surface); the rest of the app's i18n
 * is untouched.
 */

import type { Locale } from '../../domain/model/schedule-model.js';
import {
  buildModalLocaleToggle,
  ensureModalLocaleToggleStylesheet,
} from './modal-locale-toggle.js';

/** A single documented capability, optionally with its keyboard shortcut. */
export interface HelpEntry {
  /** What the feature does (English). */
  readonly feature: string;
  /** The keyboard shortcut, or undefined when the feature is pointer-only. */
  readonly shortcut?: string;
}

/** A titled group of related capabilities. */
export interface HelpSection {
  readonly title: string;
  readonly entries: readonly HelpEntry[];
}

/**
 * The complete, comprehensive feature catalogue shown in the Help modal. Pure
 * data (no DOM) so tests can assert coverage of features and shortcuts.
 *
 * The prose is localized (CR-006 Part 4 / DEC-005): `en` (default) returns the English
 * catalogue and `ja` a concise Japanese translation. Keyboard shortcut strings and
 * property identifiers (fill_color, icon_shape_kind, JSON / XML / SVG ...) stay English
 * in both, so the shortcuts remain ASCII.
 *
 * @param locale - The catalogue language ('en' default, 'ja' for Japanese).
 * @returns The ordered help sections.
 */
export function buildHelpModel(locale: Locale = 'en'): readonly HelpSection[] {
  return locale === 'ja' ? buildHelpModelJa() : buildHelpModelEn();
}

/** The English feature catalogue (default). */
function buildHelpModelEn(): readonly HelpSection[] {
  return [
    {
      title: 'Create & draw',
      entries: [
        { feature: 'Arm a milestone shape (diamond / circle / triangle / square / star), then click a row' },
        { feature: 'Arm a task shape (bar / arrow / chevron / span), then click or drag across a row' },
        { feature: 'Move an item by dragging its body' },
        { feature: 'Resize a task by dragging its start / end edge' },
        { feature: 'Place an armed shape at the caret', shortcut: 'Enter' },
      ],
    },
    {
      title: 'Select & edit',
      entries: [
        { feature: 'Select an item by clicking it' },
        { feature: 'Marquee-select by dragging over empty canvas' },
        { feature: 'Select every item', shortcut: 'Ctrl+A' },
        { feature: 'Delete the selection (item / dependency / annotation)', shortcut: 'Delete / Backspace' },
        { feature: 'Copy the selection', shortcut: 'Ctrl+C' },
        { feature: 'Paste the clipboard', shortcut: 'Ctrl+V' },
        { feature: 'Undo', shortcut: 'Ctrl+Z' },
        { feature: 'Redo', shortcut: 'Ctrl+Y / Ctrl+Shift+Z' },
        { feature: 'Cancel a gesture, or close the panel / a dialog', shortcut: 'Esc' },
      ],
    },
    {
      title: 'Navigate the canvas',
      entries: [
        { feature: 'Scroll the timeline', shortcut: 'Wheel' },
        { feature: 'Zoom (time / row axis)', shortcut: 'Ctrl / Shift / Alt + Wheel' },
        { feature: 'Pan the canvas', shortcut: 'Ctrl + Drag' },
        { feature: 'Move focus between items', shortcut: 'Tab' },
        { feature: 'Nudge the focused item by a day / row', shortcut: 'Arrow keys' },
        { feature: 'Resize the focused task', shortcut: 'Shift + Left / Right' },
        { feature: 'Fit the whole schedule into view' },
      ],
    },
    {
      title: 'Properties',
      entries: [
        { feature: 'Edit dates, categories, assignee, status and remarks' },
        { feature: 'Change fill_color and stroke_color (CUD palette or picker)' },
        { feature: 'Change icon_shape_kind and label_position' },
        { feature: 'Toggle plan / actual per item; set line_weight and fade days' },
        {
          feature:
            'Edit predecessor_item_ids / successor_item_ids (comma-separated ItemIDs) to wire dependencies',
        },
        { feature: 'Show or hide the properties panel' },
      ],
    },
    {
      title: 'Classification pane',
      entries: [
        { feature: 'Add a section or a sub-category' },
        { feature: 'Reorder a node among its siblings (move up / down)' },
        { feature: 'Hide a node, or show all under a section' },
        { feature: 'Copy / paste a node subtree', shortcut: 'Ctrl+C / Ctrl+V' },
        { feature: 'Delete a node (with confirm dialog)', shortcut: 'D confirm / C cancel' },
        { feature: 'Resize the pane by dragging its divider' },
      ],
    },
    {
      title: 'Display & overlays',
      entries: [
        { feature: 'Toggle plan and actual visibility' },
        { feature: 'Toggle date and category gridlines' },
        { feature: 'Cursor guide: off / crosshair / single / double vertical' },
        { feature: 'Toggle the today line and the progress (lightning) line' },
        {
          feature:
            'Dependency link mode: click a source item then a target to link (repeat for n:n); click a linked pair again to unlink',
        },
        { feature: 'Add comments and enclosure boxes' },
        { feature: 'Toggle the evidence watermark' },
        { feature: 'Switch light / dark theme and UI language' },
        { feature: 'Adjust the font size (small / medium / large)' },
        { feature: 'Toggle browser fullscreen' },
      ],
    },
    {
      title: 'Files',
      entries: [
        { feature: 'Export the schedule as JSON, MSProject XML or SVG' },
        { feature: 'Import a JSON / XML document' },
        { feature: 'Import an SVG / PNG icon' },
        { feature: 'Autosave to local storage with crash recovery' },
      ],
    },
  ];
}

/**
 * The concise Japanese feature catalogue (CR-006 Part 4). Keyboard shortcut strings
 * and property identifiers stay English so the shortcuts remain ASCII.
 */
function buildHelpModelJa(): readonly HelpSection[] {
  return [
    {
      title: '作成・描画',
      entries: [
        { feature: 'マイルストーン図形（菱形/円/三角/四角/星）を選び、行をクリックして配置' },
        { feature: 'タスク図形（バー/矢印/シェブロン/スパン）を選び、行をクリックまたはドラッグ' },
        { feature: 'アイテムの本体をドラッグして移動' },
        { feature: 'タスクの開始/終了の端をドラッグしてリサイズ' },
        { feature: '選択中の図形をキャレット位置に配置', shortcut: 'Enter' },
      ],
    },
    {
      title: '選択・編集',
      entries: [
        { feature: 'アイテムをクリックして選択' },
        { feature: '空きキャンバスをドラッグして矩形選択' },
        { feature: 'すべてのアイテムを選択', shortcut: 'Ctrl+A' },
        { feature: '選択（アイテム/依存線/注釈）を削除', shortcut: 'Delete / Backspace' },
        { feature: '選択をコピー', shortcut: 'Ctrl+C' },
        { feature: 'クリップボードを貼り付け', shortcut: 'Ctrl+V' },
        { feature: '元に戻す', shortcut: 'Ctrl+Z' },
        { feature: 'やり直す', shortcut: 'Ctrl+Y / Ctrl+Shift+Z' },
        { feature: '操作の取り消し、またはパネル/ダイアログを閉じる', shortcut: 'Esc' },
      ],
    },
    {
      title: 'キャンバス操作',
      entries: [
        { feature: 'タイムラインをスクロール', shortcut: 'Wheel' },
        { feature: 'ズーム（時間軸/行軸）', shortcut: 'Ctrl / Shift / Alt + Wheel' },
        { feature: 'キャンバスをパン', shortcut: 'Ctrl + Drag' },
        { feature: 'アイテム間でフォーカスを移動', shortcut: 'Tab' },
        { feature: 'フォーカス中のアイテムを1日/1行ずらす', shortcut: 'Arrow keys' },
        { feature: 'フォーカス中のタスクをリサイズ', shortcut: 'Shift + Left / Right' },
        { feature: '日程表全体を表示に収める' },
      ],
    },
    {
      title: 'プロパティ',
      entries: [
        { feature: '日付・分類・担当者・状態・備考を編集' },
        { feature: 'fill_color と stroke_color を変更（CUD パレットまたはピッカー）' },
        { feature: 'icon_shape_kind と label_position を変更' },
        { feature: 'アイテムごとの予実切替、line_weight とフェード日数を設定' },
        {
          feature:
            'predecessor_item_ids / successor_item_ids（カンマ区切りの ItemID）を編集して依存を接続',
        },
        { feature: 'プロパティパネルの表示/非表示' },
      ],
    },
    {
      title: '分類ペイン',
      entries: [
        { feature: 'セクションまたはサブ分類を追加' },
        { feature: '同じ階層内でノードを並べ替え（上/下へ移動）' },
        { feature: 'ノードを隠す、またはセクション配下をすべて表示' },
        { feature: 'ノードの部分木をコピー/貼り付け', shortcut: 'Ctrl+C / Ctrl+V' },
        { feature: 'ノードを削除（確認ダイアログ付き）', shortcut: 'D confirm / C cancel' },
        { feature: '仕切りをドラッグしてペイン幅を変更' },
      ],
    },
    {
      title: '表示・オーバーレイ',
      entries: [
        { feature: '予定と実績の表示切替' },
        { feature: '日付グリッド線と分類グリッド線の切替' },
        { feature: 'ガイドカーソル: なし/十字/縦1本/縦2本' },
        { feature: '本日線とイナズマ線（進捗線）の切替' },
        {
          feature:
            '依存リンクモード: 起点アイテムをクリックしてから対象をクリックで接続（n:n は繰り返し）。接続済みの対を再クリックで解除',
        },
        { feature: 'コメントと囲み枠を追加' },
        { feature: '証跡透かしの切替' },
        { feature: 'ライト/ダークテーマと UI 言語の切替' },
        { feature: '文字サイズを調整（小/中/大）' },
        { feature: 'ブラウザの全画面表示を切替' },
      ],
    },
    {
      title: 'ファイル',
      entries: [
        { feature: '日程表を JSON / MSProject XML / SVG で書き出し' },
        { feature: 'JSON / XML ドキュメントを取り込み' },
        { feature: 'SVG / PNG アイコンを取り込み' },
        { feature: 'ローカルストレージへ自動保存（クラッシュ復旧付き）' },
      ],
    },
  ];
}

/** The usage hint moved out of the header into the Help modal (SHELL item 1). */
export const HELP_USAGE_HINT =
  'Arm a shape then click or drag a row to create; drag items to move, edges to ' +
  'resize; wheel = scroll, Ctrl/Shift/Alt+wheel = zoom, Ctrl+drag = pan, Fit frames all.';

/** The Japanese usage hint (CR-006 Part 4). */
export const HELP_USAGE_HINT_JA =
  '図形を選んでから行をクリックまたはドラッグして作成。アイテムをドラッグで移動、端で' +
  'リサイズ。ホイール=スクロール、Ctrl/Shift/Alt+ホイール=ズーム、Ctrl+ドラッグ=パン、' +
  'Fit で全体表示。';

/** The localized usage hint for the Help modal (CR-006 Part 4). */
export function helpUsageHint(locale: Locale): string {
  return locale === 'ja' ? HELP_USAGE_HINT_JA : HELP_USAGE_HINT;
}

/** The localized Help-dialog title (CR-006 Part 4). */
export function helpTitle(locale: Locale): string {
  return locale === 'ja' ? 'gr-scheduler ヘルプ' : 'gr-scheduler help';
}

/**
 * The localized label for the "Download GR Scheduler" button (CR-010 Part 1). The
 * product name "GR Scheduler" stays as-is in both locales; only the verb is localized.
 */
export function downloadAppLabel(locale: Locale): string {
  return locale === 'ja' ? 'GR Scheduler をダウンロード' : 'Download GR Scheduler';
}

/** CSS class of the modal backdrop + dialog (installed once). */
const HELP_MODAL_STYLE_ID = 'grsch-help-modal-style';

/**
 * The Help-modal stylesheet (CR-011: fits on one screen without scroll, in both
 * English and Japanese). Exported as a string so tests can assert the fitting
 * invariants without a DOM.
 *
 * CR-011 fitting strategy, in priority order:
 * - Part 2 keep `column-count: 3` -- never collapse to 1/2 columns or a tab/accordion.
 * - Part 3 widen first: the dialog is `96vw` (was `85vw`) and the backdrop /
 *   column gutters are trimmed, so the three columns gain horizontal room and the
 *   content is shorter, removing the need to scroll.
 * - Part 4 font shrink is the LAST resort: the base `font-size` is a `clamp()` that
 *   sits at the readable `13px` ceiling on real desktop widths and only eases down
 *   to an `11px` floor when the viewport is narrow enough that width alone cannot
 *   fit -- it never breaks the columns nor introduces a scrollbar to fit.
 * - Part 1 no scroll: the old `max-height: 92vh; overflow: auto` (which used a
 *   scrollbar AS the fitting mechanism) is gone. The dialog is bounded to the
 *   viewport (`max-height: calc(100vh - 16px)`) with `overflow: hidden` as a purely
 *   non-triggering clip safety net -- at desktop sizes nothing overflows, so no
 *   scrollbar appears for either language.
 *
 * Narrow-breakpoint decision (CR-011 §7 open item): the product is desktop-focused,
 * so the former `@media (max-width: 900px) -> 2 cols` and `(max-width: 620px) -> 1 col`
 * collapses are REMOVED; `column-count: 3` now holds at every width and the narrow
 * fit is absorbed by the `clamp()` font floor instead of by dropping columns.
 */
export const HELP_MODAL_STYLESHEET = `
.grsch-help-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--grsch-scrim);
  padding: 8px;
  box-sizing: border-box;
}
.grsch-help-dialog {
  width: 96vw;
  max-width: 96vw;
  max-height: calc(100vh - 16px);
  overflow: hidden;
  background: var(--grsch-surface-strong);
  color: var(--grsch-text);
  border: 1px solid var(--grsch-menu-border);
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  font-family: system-ui, sans-serif;
  font-size: clamp(11px, 0.95vw, 13px);
  line-height: 1.38;
  box-sizing: border-box;
}
.grsch-help-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--grsch-panel-border);
}
.grsch-help-head h2 { margin: 0; font-size: 1.15em; color: var(--grsch-text-strong); }
.grsch-help-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.grsch-help-download {
  cursor: pointer;
  border: 1px solid var(--grsch-btn-border);
  border-radius: 5px;
  background: var(--grsch-btn-bg-solid);
  color: var(--grsch-text);
  font-size: 0.95em;
  line-height: 1;
  padding: 5px 10px;
  white-space: nowrap;
}
.grsch-help-close {
  cursor: pointer;
  border: 1px solid var(--grsch-menu-border);
  border-radius: 5px;
  background: var(--grsch-btn-bg-solid);
  color: var(--grsch-text);
  font-size: 1.1em;
  line-height: 1;
  padding: 2px 9px;
}
.grsch-help-hint {
  margin: 0;
  padding: 6px 14px;
  color: var(--grsch-text-muted);
  border-bottom: 1px solid var(--grsch-panel-border);
}
.grsch-help-columns {
  column-count: 3;
  column-gap: 18px;
  padding: 10px 14px 12px;
}
.grsch-help-section {
  break-inside: avoid;
  margin: 0 0 10px;
}
.grsch-help-section h3 {
  margin: 0 0 3px;
  font-size: 0.95em;
  color: var(--grsch-text-strong);
  border-bottom: 1px solid var(--grsch-panel-border);
  padding-bottom: 2px;
}
.grsch-help-entry {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 1px 0;
}
.grsch-help-key {
  flex: 0 0 auto;
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
  color: var(--grsch-text-strong);
  background: var(--grsch-btn-bg-solid);
  border: 1px solid var(--grsch-btn-border);
  border-radius: 4px;
  padding: 0 5px;
  white-space: nowrap;
  align-self: start;
}`;

/** Install the Help-modal stylesheet once (themed via the shared CSS variables). */
function ensureHelpModalStylesheet(doc: Document): void {
  if (doc.getElementById(HELP_MODAL_STYLE_ID) !== null) {
    return;
  }
  const style = doc.createElement('style');
  style.id = HELP_MODAL_STYLE_ID;
  style.textContent = HELP_MODAL_STYLESHEET;
  doc.head.appendChild(style);
}

/** Selector for focusable controls, used by the focus trap. */
const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The Help modal controller. Build once with a host element; {@link open} shows it
 * (trapping focus and remembering the opener), {@link close} hides it and returns
 * focus. Content is rendered from {@link buildHelpModel}.
 */
export class HelpModal {
  private readonly host: HTMLElement;
  private readonly onDownloadApp: (() => void) | null;
  private backdrop: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private returnFocusTo: HTMLElement | null = null;
  /** The language the help CONTENT is displayed in (CR-006 Part 4); toggle-switched. */
  private locale: Locale;
  /** Live element refs updated in place when the language toggle flips. */
  private titleEl: HTMLElement | null = null;
  private hintEl: HTMLElement | null = null;
  private columnsEl: HTMLElement | null = null;
  private downloadButtonEl: HTMLButtonElement | null = null;

  /**
   * @param host - The element the modal is appended to when open (usually the app root).
   * @param initialLocale - The content language the modal opens in ('en' default).
   * @param onDownloadApp - Invoked when the "Download GR Scheduler" button is clicked
   *   (CR-010 Part 1); omit to hide the button.
   */
  public constructor(
    host: HTMLElement,
    initialLocale: Locale = 'en',
    onDownloadApp: (() => void) | null = null,
  ) {
    this.host = host;
    this.locale = initialLocale;
    this.onDownloadApp = onDownloadApp;
    ensureHelpModalStylesheet(document);
    ensureModalLocaleToggleStylesheet(document);
  }

  /**
   * Switch the displayed help language and rebuild the title, usage hint and the
   * feature columns in place. No-op when the language is unchanged.
   */
  private applyLocale(next: Locale): void {
    if (next === this.locale) {
      return;
    }
    this.locale = next;
    if (this.titleEl !== null) {
      this.titleEl.textContent = helpTitle(this.locale);
    }
    if (this.hintEl !== null) {
      this.hintEl.textContent = helpUsageHint(this.locale);
    }
    if (this.downloadButtonEl !== null) {
      const label = downloadAppLabel(this.locale);
      this.downloadButtonEl.textContent = label;
      this.downloadButtonEl.title = label;
      this.downloadButtonEl.setAttribute('aria-label', label);
    }
    if (this.columnsEl !== null) {
      this.columnsEl.replaceChildren(
        ...buildHelpModel(this.locale).map((section) => renderSection(section)),
      );
    }
  }

  /** Whether the modal is currently open. */
  public isOpen(): boolean {
    return this.backdrop !== null;
  }

  /**
   * Open the modal and trap focus inside it.
   *
   * @param returnFocusTo - The control focus returns to on close (the opener).
   */
  public open(returnFocusTo: HTMLElement | null): void {
    if (this.isOpen()) {
      return;
    }
    this.returnFocusTo = returnFocusTo;
    this.render();
    // Move focus into the dialog (the close button) so the trap has an anchor.
    const closeButton = this.dialog?.querySelector<HTMLElement>('[data-role="help-close"]');
    closeButton?.focus();
  }

  /** Close the modal and return focus to the opener. */
  public close(): void {
    if (this.backdrop === null) {
      return;
    }
    this.backdrop.remove();
    this.backdrop = null;
    this.dialog = null;
    this.titleEl = null;
    this.hintEl = null;
    this.columnsEl = null;
    this.downloadButtonEl = null;
    this.returnFocusTo?.focus();
    this.returnFocusTo = null;
  }

  private render(): void {
    const backdrop = document.createElement('div');
    backdrop.className = 'grsch-help-backdrop';
    backdrop.dataset.role = 'help-backdrop';
    // A click on the backdrop (outside the dialog) closes it.
    backdrop.addEventListener('pointerdown', (event) => {
      if (event.target === backdrop) {
        this.close();
      }
    });

    const dialog = document.createElement('div');
    dialog.className = 'grsch-help-dialog';
    dialog.dataset.role = 'help-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'grsch-help-title');
    dialog.tabIndex = -1;
    dialog.addEventListener('keydown', (event) => this.handleKeydown(event));

    const head = document.createElement('div');
    head.className = 'grsch-help-head';
    const title = document.createElement('h2');
    title.id = 'grsch-help-title';
    title.textContent = helpTitle(this.locale);
    this.titleEl = title;
    // CR-006 Part 4 / DEC-005: the [en]/[jp] toggle sits to the LEFT of the close button
    // and switches THIS dialog's content language.
    const localeToggle = buildModalLocaleToggle(this.locale, (next) => this.applyLocale(next));
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'grsch-help-close';
    closeButton.dataset.role = 'help-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Close help');
    closeButton.title = 'Close help';
    closeButton.addEventListener('click', () => this.close());

    // CR-010 Part 1: the "Download GR Scheduler" button lives in the Help destination
    // (NOT a new header element -- the 15-element header order is fixed). It re-fetches
    // the clean delivered single-HTML app and saves it (see the wired onDownloadApp).
    const actions = document.createElement('div');
    actions.className = 'grsch-help-actions';
    if (this.onDownloadApp !== null) {
      const downloadButton = document.createElement('button');
      downloadButton.type = 'button';
      downloadButton.className = 'grsch-help-download';
      downloadButton.dataset.role = 'download-app';
      const downloadLabel = downloadAppLabel(this.locale);
      downloadButton.textContent = downloadLabel;
      downloadButton.title = downloadLabel;
      downloadButton.setAttribute('aria-label', downloadLabel);
      downloadButton.addEventListener('click', () => this.onDownloadApp?.());
      this.downloadButtonEl = downloadButton;
      actions.appendChild(downloadButton);
    }
    actions.append(localeToggle.element, closeButton);
    head.append(title, actions);

    const hint = document.createElement('p');
    hint.className = 'grsch-help-hint';
    hint.dataset.role = 'help-hint';
    hint.textContent = helpUsageHint(this.locale);
    this.hintEl = hint;

    const columns = document.createElement('div');
    columns.className = 'grsch-help-columns';
    for (const section of buildHelpModel(this.locale)) {
      columns.appendChild(renderSection(section));
    }
    this.columnsEl = columns;

    dialog.append(head, hint, columns);
    backdrop.appendChild(dialog);
    this.host.appendChild(backdrop);
    this.backdrop = backdrop;
    this.dialog = dialog;
  }

  /** Focus trap + Esc close (Tab / Shift+Tab wrap within the dialog). */
  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      // Stop the shell's window-level Esc handler from also acting on this Esc.
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== 'Tab' || this.dialog === null) {
      return;
    }
    const focusable = Array.from(
      this.dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((element) => !element.hasAttribute('disabled'));
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === this.dialog)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  }
}

/** Build the DOM for one help section. */
function renderSection(section: HelpSection): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'grsch-help-section';
  wrapper.dataset.role = 'help-section';
  const heading = document.createElement('h3');
  heading.textContent = section.title;
  wrapper.appendChild(heading);
  for (const entry of section.entries) {
    const row = document.createElement('div');
    row.className = 'grsch-help-entry';
    const label = document.createElement('span');
    label.textContent = entry.feature;
    row.appendChild(label);
    if (entry.shortcut !== undefined) {
      const key = document.createElement('span');
      key.className = 'grsch-help-key';
      key.textContent = entry.shortcut;
      row.appendChild(key);
    }
    wrapper.appendChild(row);
  }
  return wrapper;
}
