/**
 * Adapter layer: the [AI] helper modal (SHELL batch item 5).
 *
 * This tool has NO built-in AI inference. Instead it hands the user a ready-to-copy
 * ENGLISH prompt plus the canonical GR Scheduler JSON Schema so they can turn a
 * PowerPoint / Excel / PDF schedule into a valid GR Scheduler document with an
 * external AI, then import the resulting JSON via File Import.
 *
 * The schema shown is the SINGLE source of truth re-exported by
 * `document-schema.ts` (inlined at build), so the copied schema can never drift
 * from the codec's accepted format. The Copy button writes `prompt + schema` to the
 * clipboard as one payload.
 *
 * Accessibility: `role="dialog"` + `aria-modal="true"`, focus-trapped, Esc / the ×
 * button / a backdrop click close it, and focus returns to the opener (WCAG 2.1.2 /
 * 2.4.3 / 2.4.7).
 */

import type { Locale } from '../../domain/model/schedule-model.js';
import {
  buildModalLocaleToggle,
  ensureModalLocaleToggleStylesheet,
} from './modal-locale-toggle.js';
import {
  GR_SCHEDULER_DOCUMENT_SCHEMA,
  GR_SCHEDULER_DOCUMENT_SCHEMA_ID,
} from '../../domain/usecase/document-schema.js';

/** The canonical schema serialized for display / copy (pretty-printed, stable). */
export function schemaJsonText(): string {
  return JSON.stringify(GR_SCHEDULER_DOCUMENT_SCHEMA, null, 2);
}

/**
 * Build the instruction prompt an external AI receives. It tells the AI to read the
 * pasted schedule image / file and emit ONLY a valid GR Scheduler JSON document
 * conforming to the included schema, mapping the salient schedule concepts.
 *
 * The prompt PROSE is localized (CR-006 Part 4 / DEC-005): `en` returns the English
 * text and `ja` a Japanese translation. Field / schema IDENTIFIERS (startDate,
 * majorCategory, actualStart, "milestone", "task", "abbrev", the schema id ...) stay
 * English in both languages so the emitted JSON conforms; only the surrounding
 * instructions change. The JSON SCHEMA block appended by
 * {@link buildAiClipboardPayload} is NEVER translated.
 *
 * @param locale - The prompt language ('en' default, 'ja' for Japanese).
 * @returns The prompt text.
 */
export function buildAiPromptText(locale: Locale = 'en'): string {
  if (locale === 'ja') {
    return [
      'あなたはマルチバー日程表ツール「GR Scheduler」向けのデータ抽出アシスタントです。',
      '',
      'タスク: 私が画像またはファイル（PowerPoint スライド、Excel シート、プロジェクト日程の',
      'PDF）として貼り付ける日程表を読み取り、それを再現する GR Scheduler の JSON',
      'ドキュメントを 1 つ生成してください。',
      '',
      'ルール:',
      '1. 出力は有効な JSON のみ。説明文・Markdown・コードフェンスは付けないこと。',
      '2. JSON は下記の JSON Schema（draft 2020-12）に必ず適合させること。',
      '3. 各マイルストーンは "milestone" アイテムに、各タスク/フェーズ/バーは "task" アイテムに',
      '   対応させ、タスクの開始と終了は startDate / endDate（ISO yyyy-mm-dd）に入れること。',
      '4. 行のグルーピングを保持すること: majorCategory / middleCategory / minorCategory で',
      '   日程表のスイムレーン・チーム・フェーズを表現する。',
      '5. 実績（実施済み）の日付がある場合は、予定と同じアイテムに actualStart / actualEnd',
      '   （および progressRatio を [0,1] で）を設定すること。別の "actual" アイテムは作らない。',
      '6. 各アイテムには短い表示名を "abbrev" に入れること。',
      '7. 値が不明な場合は、データを捏造せず任意フィールドを省略すること。',
      '',
      '次のスキーマに適合する JSON ドキュメントを今すぐ返してください',
      `(schema id: ${GR_SCHEDULER_DOCUMENT_SCHEMA_ID}):`,
    ].join('\n');
  }
  return [
    'You are a data-extraction assistant for "GR Scheduler", a multi-bar schedule tool.',
    '',
    'TASK: Read the schedule I paste as an image or file (a PowerPoint slide, an Excel',
    'sheet, or a PDF of a project schedule) and produce ONE GR Scheduler JSON document',
    'that reproduces it.',
    '',
    'RULES:',
    '1. Output ONLY valid JSON. No prose, no Markdown, no code fences.',
    '2. The JSON MUST conform to the JSON Schema included below (draft 2020-12).',
    '3. Map each milestone to a "milestone" item and each task/phase/bar to a "task"',
    '   item; put a task\'s start and end on startDate / endDate (ISO yyyy-mm-dd).',
    '4. Preserve the row grouping: use majorCategory / middleCategory / minorCategory',
    '   to reflect the schedule\'s swimlanes, teams or phases.',
    '5. When the source shows actual (as-run) dates, put them on the SAME item as its',
    '   plan: set actualStart / actualEnd (and progressRatio in [0,1]) alongside',
    '   startDate / endDate. Do not create a separate "actual" item.',
    '6. Use a short human label in "abbrev" for each item.',
    '7. If a value is unknown, omit the optional field rather than inventing data.',
    '',
    'Return the JSON document now, conforming to this schema',
    `(schema id: ${GR_SCHEDULER_DOCUMENT_SCHEMA_ID}):`,
  ].join('\n');
}

/**
 * The full clipboard payload: the (localized) prompt followed by the schema JSON. The
 * SCHEMA portion is ALWAYS the English SSOT regardless of `locale` (CR-006 Part 4), so
 * the copied JSON schema never drifts from the codec. Pure so a unit test can assert
 * the schema text is exactly the SSOT and stays English under `ja`.
 *
 * @param locale - The PROMPT language ('en' default, 'ja' for Japanese).
 * @returns The `prompt + schema` text placed on the clipboard by Copy.
 */
export function buildAiClipboardPayload(locale: Locale = 'en'): string {
  return `${buildAiPromptText(locale)}\n\n${schemaJsonText()}\n`;
}

/** CSS class / style id of the AI modal (installed once). */
const AI_MODAL_STYLE_ID = 'grsch-ai-modal-style';

/** Install the AI-modal stylesheet once (themed via the shared CSS variables). */
function ensureAiModalStylesheet(doc: Document): void {
  if (doc.getElementById(AI_MODAL_STYLE_ID) !== null) {
    return;
  }
  const style = doc.createElement('style');
  style.id = AI_MODAL_STYLE_ID;
  style.textContent = `
.grsch-ai-backdrop {
  position: fixed;
  inset: 0;
  z-index: 52;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--grsch-scrim);
  padding: 20px;
  box-sizing: border-box;
}
.grsch-ai-dialog {
  width: min(760px, 94vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--grsch-surface-strong);
  color: var(--grsch-text);
  border: 1px solid var(--grsch-menu-border);
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  font-family: system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.4;
}
.grsch-ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--grsch-panel-border);
}
.grsch-ai-head h2 { margin: 0; font-size: 1.15em; color: var(--grsch-text-strong); }
.grsch-ai-close {
  cursor: pointer;
  border: 1px solid var(--grsch-menu-border);
  border-radius: 5px;
  background: var(--grsch-btn-bg-solid);
  color: var(--grsch-text);
  font-size: 1.1em;
  line-height: 1;
  padding: 2px 9px;
}
.grsch-ai-intro { margin: 0; padding: 10px 16px; color: var(--grsch-text-muted); }
.grsch-ai-body { overflow: auto; padding: 0 16px 12px; }
.grsch-ai-actions { padding: 10px 16px; border-top: 1px solid var(--grsch-panel-border); }
.grsch-ai-copy {
  cursor: pointer;
  border: 1px solid var(--grsch-accent-border);
  border-radius: 5px;
  background: var(--grsch-accent);
  color: var(--grsch-accent-text);
  font-size: 1em;
  padding: 6px 14px;
}
.grsch-ai-copy-status { margin-left: 10px; color: var(--grsch-text-muted); font-size: 0.9em; }
.grsch-ai-payload {
  margin: 0;
  padding: 10px 12px;
  max-height: 46vh;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, monospace;
  font-size: 0.86em;
  color: var(--grsch-text-strong);
  background: var(--grsch-btn-face-alt);
  border: 1px solid var(--grsch-panel-border);
  border-radius: 6px;
}`;
  doc.head.appendChild(style);
}

/** Selector for focusable controls, used by the focus trap. */
const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The [AI] modal controller. Build once with a host element; {@link open} shows it
 * and traps focus, {@link close} hides it and returns focus to the opener.
 */
export class AiExportModal {
  private readonly host: HTMLElement;
  private backdrop: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private returnFocusTo: HTMLElement | null = null;
  /** The language the modal CONTENT is displayed in (CR-006 Part 4); toggle-switched. */
  private locale: Locale;
  /** Live element refs updated in place when the language toggle flips. */
  private titleEl: HTMLElement | null = null;
  private introEl: HTMLElement | null = null;
  private payloadEl: HTMLElement | null = null;
  private copyButtonEl: HTMLButtonElement | null = null;

  /**
   * @param host - The element the modal is appended to when open (usually the root).
   * @param writeToClipboard - Injectable clipboard writer (defaults to the async
   *   Clipboard API), used by the Copy button. Injectable for testability.
   * @param initialLocale - The content language the modal opens in ('en' default).
   */
  public constructor(
    host: HTMLElement,
    private readonly writeToClipboard: (text: string) => Promise<void> = defaultClipboardWriter,
    initialLocale: Locale = 'en',
  ) {
    this.host = host;
    this.locale = initialLocale;
    ensureAiModalStylesheet(document);
    ensureModalLocaleToggleStylesheet(document);
  }

  /** Localized dialog title. */
  private titleText(): string {
    return this.locale === 'ja' ? 'AI から日程表 JSON を取得' : 'Get a schedule JSON from AI';
  }

  /** Localized intro paragraph. */
  private introText(): string {
    return this.locale === 'ja'
      ? '下のプロンプトとスキーマをコピーし、日程表の画像やファイルと一緒に AI へ貼り付け、' +
          '返ってきた JSON を File Import で取り込んでください。'
      : 'Copy the prompt and schema below, paste them into an AI together with an image ' +
          'or file of your schedule, then import the JSON it returns via File Import.';
  }

  /** Localized Copy-button label. */
  private copyLabel(): string {
    return this.locale === 'ja' ? 'プロンプトとスキーマをコピー' : 'Copy prompt + schema';
  }

  /**
   * Switch the displayed content language and update the live text in place: the
   * title, intro, the payload PROMPT (the schema block stays English) and the Copy
   * label. No-op when the language is unchanged.
   */
  private applyLocale(next: Locale): void {
    if (next === this.locale) {
      return;
    }
    this.locale = next;
    if (this.titleEl !== null) {
      this.titleEl.textContent = this.titleText();
    }
    if (this.introEl !== null) {
      this.introEl.textContent = this.introText();
    }
    if (this.payloadEl !== null) {
      this.payloadEl.textContent = buildAiClipboardPayload(this.locale);
    }
    if (this.copyButtonEl !== null) {
      this.copyButtonEl.textContent = this.copyLabel();
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
    const closeButton = this.dialog?.querySelector<HTMLElement>('[data-role="ai-close"]');
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
    this.introEl = null;
    this.payloadEl = null;
    this.copyButtonEl = null;
    this.returnFocusTo?.focus();
    this.returnFocusTo = null;
  }

  private render(): void {
    const backdrop = document.createElement('div');
    backdrop.className = 'grsch-ai-backdrop';
    backdrop.dataset.role = 'ai-backdrop';
    backdrop.addEventListener('pointerdown', (event) => {
      if (event.target === backdrop) {
        this.close();
      }
    });

    const dialog = document.createElement('div');
    dialog.className = 'grsch-ai-dialog';
    dialog.dataset.role = 'ai-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'grsch-ai-title');
    dialog.tabIndex = -1;
    dialog.addEventListener('keydown', (event) => this.handleKeydown(event));

    const head = document.createElement('div');
    head.className = 'grsch-ai-head';
    const title = document.createElement('h2');
    title.id = 'grsch-ai-title';
    title.textContent = this.titleText();
    this.titleEl = title;
    // CR-006 Part 4 / DEC-005: the [en]/[jp] toggle sits to the LEFT of the close button
    // and switches THIS dialog's content language (the schema block stays English).
    const localeToggle = buildModalLocaleToggle(this.locale, (next) => this.applyLocale(next));
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'grsch-ai-close';
    closeButton.dataset.role = 'ai-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Close AI helper');
    closeButton.title = 'Close AI helper';
    closeButton.addEventListener('click', () => this.close());
    head.append(title, localeToggle.element, closeButton);

    const intro = document.createElement('p');
    intro.className = 'grsch-ai-intro';
    intro.dataset.role = 'ai-intro';
    intro.textContent = this.introText();
    this.introEl = intro;

    const body = document.createElement('div');
    body.className = 'grsch-ai-body';
    const payload = document.createElement('pre');
    payload.className = 'grsch-ai-payload';
    payload.dataset.role = 'ai-payload';
    payload.textContent = buildAiClipboardPayload(this.locale);
    this.payloadEl = payload;
    body.appendChild(payload);

    const actions = document.createElement('div');
    actions.className = 'grsch-ai-actions';
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'grsch-ai-copy';
    copyButton.dataset.role = 'ai-copy';
    copyButton.textContent = this.copyLabel();
    copyButton.setAttribute('aria-label', 'Copy prompt and schema to clipboard');
    this.copyButtonEl = copyButton;
    const copyStatus = document.createElement('span');
    copyStatus.className = 'grsch-ai-copy-status';
    copyStatus.dataset.role = 'ai-copy-status';
    copyStatus.setAttribute('role', 'status');
    copyStatus.setAttribute('aria-live', 'polite');
    copyButton.addEventListener('click', () => {
      // Copy the payload in the CURRENTLY SELECTED language (prompt localized, schema
      // English), so the toggle determines what lands on the clipboard.
      void this.writeToClipboard(buildAiClipboardPayload(this.locale)).then(
        () => {
          copyStatus.textContent = this.locale === 'ja' ? 'コピーしました。' : 'Copied.';
        },
        () => {
          copyStatus.textContent =
            this.locale === 'ja'
              ? 'コピーに失敗しました。テキストを選択して手動でコピーしてください。'
              : 'Copy failed - select the text and copy manually.';
        },
      );
    });
    actions.append(copyButton, copyStatus);

    dialog.append(head, intro, body, actions);
    backdrop.appendChild(dialog);
    this.host.appendChild(backdrop);
    this.backdrop = backdrop;
    this.dialog = dialog;
  }

  /** Focus trap + Esc close (Tab / Shift+Tab wrap within the dialog). */
  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
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

/** Default clipboard writer using the async Clipboard API (best-effort). */
function defaultClipboardWriter(text: string): Promise<void> {
  if (navigator.clipboard?.writeText !== undefined) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error('Clipboard API unavailable'));
}
