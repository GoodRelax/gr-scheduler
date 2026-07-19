/**
 * Framework layer: single-file app shell / bootstrap (ARCH-C-032).
 *
 * M2 wires the editing stack on top of the M1 walking skeleton: an immutable
 * store with Undo/Redo (ADR-002), a pointer editing controller (create / move /
 * resize / label drag with alignment snapping), a property panel, a floating tool
 * palette, keyboard shortcuts and copy/paste. The renderer keeps its virtualized
 * diff pipeline; edits flow model-first (store) and the renderer re-renders the
 * diff. The RISK-001 benchmark harness (`?bench=<N>` / button) is preserved.
 */

import type {
  CursorGuideMode,
  FontScale,
  Locale,
  PlanActualDisplay,
  Watermark,
} from '../domain/model/schedule-model.js';
import {
  DEFAULT_PROGRESS_LINE_COLOR,
  DEFAULT_WATERMARK_HIDE_PASSWORD_HASH,
  DEFAULT_WATERMARK_TEXT,
} from '../domain/model/schedule-model.js';
import {
  formatWatermarkTimestampUtc,
  resolveWatermark,
} from '../domain/usecase/watermark-builder.js';
import { matchesWatermarkHidePassword } from '../adapters/security/watermark-password.js';
import { SvgRenderer } from '../adapters/render/svg-renderer.js';
import { applyUniformFontScale, ensureUiFontStylesheet } from './font-scale.js';
import { uiLabel } from '../domain/usecase/i18n.js';
import { AUTOSAVE_FAIL_HEX, AUTOSAVE_OK_HEX } from '../domain/usecase/a11y-tokens.js';
import { CUD_GREEN_ACCENT_HEX } from '../domain/usecase/render-tokens.js';
import { ScheduleStore } from '../domain/command/schedule-store.js';
import {
  createCommentCommand,
  createRoundedBoxCommand,
} from '../domain/command/annotation-commands.js';
import { worldXToDate } from '../domain/usecase/time-coordinate-mapper.js';
import {
  classificationCollapseLevel,
  clampRowIndexToSection,
  collapseRows,
  contiguousSectionBands,
  rebuildClassification,
} from '../domain/usecase/classification-tree.js';
import { orderedVisibleRows } from '../domain/usecase/section-organizer.js';
import { EditingController } from '../adapters/input/editing-controller.js';
import { PropertyPanel } from '../adapters/ui/property-panel.js';
import { LeftClassificationPane } from '../adapters/ui/left-pane.js';
import { mountShapePicker, type ToolPaletteHandle } from '../adapters/ui/tool-palette.js';
import { enablePanelDrag } from '../adapters/ui/draggable.js';
import { ItemClipboard } from '../adapters/clipboard/item-clipboard.js';
import { attachKeyboardShortcuts } from '../adapters/input/keyboard-shortcuts.js';
import { attachCanvasKeyboardNavigation } from '../adapters/input/keyboard-navigation.js';
import { ensureA11yStylesheet, VISUALLY_HIDDEN_CLASS } from '../adapters/a11y/a11y-stylesheet.js';
import { LiveRegionAnnouncer } from '../adapters/a11y/live-region.js';
import { generateSampleDocument, generateTemplateDocument, DEFAULT_ITEM_COUNT } from './sample-data.js';
import { formatBenchmarkReport, parseBenchParam, runBenchmark } from './benchmark.js';
import { createLogger } from './logger.js';
import { HelpModal } from '../adapters/ui/help-modal.js';
import {
  applyThemePreference,
  installThemeStylesheet,
  readStoredThemePreference,
  resolveThemeMode,
  writeStoredThemePreference,
  type ThemeMode,
  type ThemePreference,
} from './theme.js';
import type { ScheduleDocument } from '../domain/model/schedule-model.js';
import { serializeScheduleDocument } from '../domain/usecase/json-codec.js';
import { exportMspdi } from '../domain/usecase/mspdi-codec.js';
import { exportScheduleSvg } from '../domain/usecase/svg-exporter.js';
import { ImportRejectedError } from '../domain/usecase/import-sanitizer.js';
import { downloadTextFile, pickFile } from '../adapters/io/file-io.js';
import { importDocumentFile, importIconFile } from '../adapters/io/import-service.js';
import {
  AutosaveController,
  clearAutosavedDocument,
  hasAutosavedDocument,
  loadAutosavedDocument,
} from '../adapters/io/autosave.js';

const log = createLogger('grsch:shell');

const STATUS_HINT =
  'arm a shape then click/drag a row to create; drag items to move, edges to resize; ' +
  'wheel = scroll, Ctrl/Shift/Alt+wheel = zoom, Ctrl+drag = pan, Fit frames all';

interface Chrome {
  stage: HTMLElement;
  panelHost: HTMLElement;
  header: HTMLElement;
  scheduleNameLabel: HTMLElement;
  helpButton: HTMLButtonElement;
  themeButton: HTMLButtonElement;
  commandPalette: HTMLElement;
  paletteDragHandle: HTMLElement;
  minimizeButton: HTMLButtonElement;
  propertiesToggleButton: HTMLButtonElement;
  fitButton: HTMLButtonElement;
  fullscreenButton: HTMLButtonElement;
  benchButton: HTMLButtonElement;
  linkButton: HTMLButtonElement;
  linkHint: HTMLElement;
  planButton: HTMLButtonElement;
  actualButton: HTMLButtonElement;
  todayButton: HTMLButtonElement;
  cursorGuideButtons: HTMLButtonElement[];
  gridDateButton: HTMLButtonElement;
  gridCategoryButton: HTMLButtonElement;
  commentButton: HTMLButtonElement;
  boxButton: HTMLButtonElement;
  exportJsonButton: HTMLButtonElement;
  exportXmlButton: HTMLButtonElement;
  exportSvgButton: HTMLButtonElement;
  importDocButton: HTMLButtonElement;
  importIconButton: HTMLButtonElement;
  watermarkButton: HTMLButtonElement;
  watermarkNameInput: HTMLInputElement;
  languageButton: HTMLButtonElement;
  saveStatusLabel: HTMLElement;
  benchOutput: HTMLPreElement;
  statusLabel: HTMLElement;
  fontButtons: HTMLButtonElement[];
}

/** CSS class of the minimal app header (item6.1 minimized header). */
const APP_HEADER_CLASS = 'grsch-app-header';
/** CSS class of the floating translucent command palette (item6.2). */
const COMMAND_PALETTE_CLASS = 'grsch-command-palette';

/**
 * Install the stylesheet for the minimal header and the floating command palette.
 *
 * The command palette floats over the canvas (TOOL-L1-006 / STK-L0-019) and is
 * see-through while idle so it never steals drawing area (item6 / item6.2 /
 * item58): the panel surface, borders and BUTTON fills are translucent (low alpha)
 * so the schedule shows through, while the ink (button text / glyphs) stays fully
 * opaque and dark. Fading the WHOLE element's opacity would composite the labels
 * below WCAG AA contrast (M5c hazard, mirrored from the shape palette), so only the
 * chrome fades, not the text. Hover / `:focus-within` restore the solid surface, so
 * a keyboard user always operates the palette against an opaque background.
 */
function ensureCommandChromeStylesheet(doc: Document): void {
  const styleId = 'grsch-command-chrome-style';
  if (doc.getElementById(styleId) !== null) {
    return;
  }
  const style = doc.createElement('style');
  style.id = styleId;
  style.textContent = `
.${APP_HEADER_CLASS} {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  min-height: 30px;
  padding: 1px 12px;
  background: var(--grsch-header-bg);
  color: var(--grsch-header-fg);
  font-family: system-ui, sans-serif;
  font-size: 0.78em;
}
.${APP_HEADER_CLASS} .grsch-header-branding {
  justify-self: start;
  display: flex;
  flex-direction: column;
  line-height: 1.04;
}
.${APP_HEADER_CLASS} .grsch-brand-name { font-weight: 700; font-size: 0.9em; }
.${APP_HEADER_CLASS} .grsch-brand-line {
  font-size: 0.64em;
  color: var(--grsch-header-muted);
}
.${APP_HEADER_CLASS} .grsch-schedule-name {
  justify-self: center;
  text-align: center;
  font-weight: 600;
  font-size: 1.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 46vw;
}
.${APP_HEADER_CLASS} .grsch-header-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 6px;
}
.${APP_HEADER_CLASS} .grsch-header-btn {
  cursor: pointer;
  min-width: 26px;
  height: 24px;
  padding: 0 7px;
  font-size: 1em;
  line-height: 1;
  border: 1px solid var(--grsch-header-muted);
  border-radius: 5px;
  background: transparent;
  color: var(--grsch-header-fg);
}
.${APP_HEADER_CLASS} .grsch-header-btn:hover { background: rgba(127, 127, 127, 0.22); }
.${COMMAND_PALETTE_CLASS} {
  position: absolute;
  top: 38px;
  right: 10px;
  z-index: 12;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 5px;
  max-width: min(66vw, 560px);
  padding: 3px 5px;
  border: 1px solid var(--grsch-palette-border);
  border-radius: 7px;
  background: var(--grsch-palette-surface);
  box-shadow: none;
  font-family: system-ui, sans-serif;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.${COMMAND_PALETTE_CLASS}:hover,
.${COMMAND_PALETTE_CLASS}:focus-within {
  background: var(--grsch-palette-surface-solid);
  border-color: var(--grsch-palette-border-solid);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.${COMMAND_PALETTE_CLASS} .grsch-cmd-drag-handle {
  cursor: grab;
  align-self: stretch;
  display: flex;
  align-items: center;
  padding: 0 2px;
  margin-right: 1px;
  color: var(--grsch-drag-handle);
  font-size: 0.9em;
  line-height: 1;
  border-radius: 3px;
  touch-action: none;
}
.${COMMAND_PALETTE_CLASS} .grsch-cmd-drag-handle:active { cursor: grabbing; }
.${COMMAND_PALETTE_CLASS} .grsch-cmd-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.${COMMAND_PALETTE_CLASS} .grsch-cmd-group-label {
  font-size: 0.58em;
  letter-spacing: 0.2px;
  text-transform: uppercase;
  color: var(--grsch-group-label);
  margin-right: 1px;
}
.${COMMAND_PALETTE_CLASS} button {
  cursor: pointer;
  min-width: 16px;
  padding: 1px 3px;
  font-size: 0.72em;
  line-height: 1.3;
  border: 1px solid var(--grsch-btn-border);
  border-radius: 4px;
  background: var(--grsch-btn-bg);
  color: var(--grsch-btn-text);
}
.${COMMAND_PALETTE_CLASS}:hover button,
.${COMMAND_PALETTE_CLASS}:focus-within button { background: var(--grsch-btn-bg-solid); }
.${COMMAND_PALETTE_CLASS} button:hover { background: var(--grsch-btn-hover); }
.${COMMAND_PALETTE_CLASS} button[aria-pressed="true"],
.${COMMAND_PALETTE_CLASS} button[role="radio"][aria-checked="true"] {
  background: var(--grsch-accent);
  border-color: var(--grsch-accent-border);
  color: var(--grsch-accent-text);
}
.${COMMAND_PALETTE_CLASS} button:disabled { opacity: 0.4; cursor: default; }
.${COMMAND_PALETTE_CLASS} input {
  font-size: 0.72em;
  padding: 1px 4px;
  border: 1px solid var(--grsch-btn-border);
  border-radius: 4px;
  background: var(--grsch-input-bg);
  color: var(--grsch-input-text);
}
.${COMMAND_PALETTE_CLASS} .grsch-armed-readout {
  font-size: 0.66em;
  color: var(--grsch-armed-readout);
  white-space: nowrap;
}
.${COMMAND_PALETTE_CLASS} .grsch-save-status {
  font-size: 0.66em;
  min-width: 42px;
}
/* Minimized: collapse to just the drag handle + the expand toggle so the palette
   surrenders the drawing area, staying keyboard-reachable via the toggle. */
.${COMMAND_PALETTE_CLASS}[data-minimized="true"] {
  gap: 2px;
  padding: 2px 4px;
}
.${COMMAND_PALETTE_CLASS}[data-minimized="true"] > .grsch-cmd-group,
.${COMMAND_PALETTE_CLASS}[data-minimized="true"] > .grsch-save-status {
  display: none;
}`;
  doc.head.appendChild(style);
}

/** Create a compact command button with a matching accessible name and tooltip. */
function makeCommandButton(glyph: string, accessibleName: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = glyph;
  button.setAttribute('aria-label', accessibleName);
  button.title = accessibleName;
  return button;
}

/** Wrap controls in a labelled group so related commands stay together when wrapped. */
function makeCommandGroup(label: string, controls: readonly HTMLElement[]): HTMLElement {
  const group = document.createElement('div');
  group.className = 'grsch-cmd-group';
  if (label.length > 0) {
    const caption = document.createElement('span');
    caption.className = 'grsch-cmd-group-label';
    caption.textContent = label;
    caption.setAttribute('aria-hidden', 'true');
    group.appendChild(caption);
  }
  group.append(...controls);
  return group;
}

/** Sanitize a document title into a safe download file stem. */
function toFileStem(title: string): string {
  const stem = title.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return stem.length > 0 ? stem : 'schedule';
}

/** Whether the PLAN side is shown under a display filter (fix 8). */
function isPlanShown(display: PlanActualDisplay | undefined): boolean {
  const value = display ?? 'both';
  return value === 'both' || value === 'plan-only';
}

/** Whether the ACTUAL side is shown under a display filter (fix 8). */
function isActualShown(display: PlanActualDisplay | undefined): boolean {
  const value = display ?? 'both';
  return value === 'both' || value === 'actual-only';
}

/**
 * Combine two independent Plan / Actual toggles into a single display filter
 * (fix 8): both on -> both, only one on -> that side, neither -> none.
 */
function planActualDisplayFrom(planShown: boolean, actualShown: boolean): PlanActualDisplay {
  if (planShown && actualShown) {
    return 'both';
  }
  if (planShown) {
    return 'plan-only';
  }
  if (actualShown) {
    return 'actual-only';
  }
  return 'none';
}

/**
 * Build the DOM chrome: a minimal header, a full-viewport stage, a floating
 * translucent command palette over the stage, and the property panel region.
 *
 * item6 / item6.1 / item6.2 (STK-L0-021 / TOOL-L1-001): the schedule canvas fills
 * the viewport; command controls live in a floating see-through palette overlaid
 * on the canvas (never a fixed band that steals drawing area); the header is a
 * slim bar showing only the schedule name.
 */
function buildChrome(root: HTMLElement): Chrome {
  root.innerHTML = '';
  root.style.position = 'absolute';
  root.style.inset = '0';
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.fontFamily = 'system-ui, sans-serif';
  ensureCommandChromeStylesheet(document);

  // ---- header (SHELL item 1): three zones -- branding LEFT, document TITLE
  // centered, and the help / theme actions on the RIGHT. The old usage hint is
  // moved out of the header and into the Help modal (it is usage instruction, not
  // chrome), keeping the header uncluttered.
  const header = document.createElement('header');
  header.dataset.role = 'app-header';
  header.className = APP_HEADER_CLASS;

  // Branding block (left), English.
  const brandingBlock = document.createElement('div');
  brandingBlock.className = 'grsch-header-branding';
  brandingBlock.dataset.role = 'app-branding';
  const brandName = document.createElement('span');
  brandName.className = 'grsch-brand-name';
  brandName.textContent = 'GR Scheduler';
  const brandCopyright = document.createElement('span');
  brandCopyright.className = 'grsch-brand-line';
  brandCopyright.textContent = '© 2026 GoodRelax.';
  const brandLicense = document.createElement('span');
  brandLicense.className = 'grsch-brand-line';
  brandLicense.textContent = 'Apache License 2.0';
  brandingBlock.append(brandName, brandCopyright, brandLicense);

  // Centered document title.
  const scheduleNameLabel = document.createElement('span');
  scheduleNameLabel.className = 'grsch-schedule-name';
  scheduleNameLabel.dataset.role = 'schedule-name';
  scheduleNameLabel.textContent = 'gr-scheduler';

  // Right-side actions: dark-mode toggle + the [?] help button.
  const headerActions = document.createElement('div');
  headerActions.className = 'grsch-header-actions';
  const themeButton = document.createElement('button');
  themeButton.type = 'button';
  themeButton.className = 'grsch-header-btn';
  themeButton.dataset.role = 'toggle-theme';
  themeButton.setAttribute('aria-pressed', 'false');
  themeButton.textContent = '☽'; // last-quarter moon glyph
  const helpButton = document.createElement('button');
  helpButton.type = 'button';
  helpButton.className = 'grsch-header-btn';
  helpButton.dataset.role = 'open-help';
  helpButton.textContent = '?';
  helpButton.setAttribute('aria-label', 'Help');
  helpButton.setAttribute('aria-haspopup', 'dialog');
  helpButton.title = 'Help';
  headerActions.append(themeButton, helpButton);

  // Kept for the internal benchmark status path (fix 9): a detached label the
  // benchmark harness writes progress into; no longer shown in the header.
  const statusLabel = document.createElement('span');
  statusLabel.className = 'grsch-header-hint';
  statusLabel.textContent = STATUS_HINT;

  header.append(brandingBlock, scheduleNameLabel, headerActions);

  // ---- floating command palette (item6.2 / TOOL-L1-006 / STK-L0-019). ----
  const commandPalette = document.createElement('div');
  commandPalette.dataset.role = 'command-palette';
  commandPalette.className = COMMAND_PALETTE_CLASS;
  // Named toolbar landmark so assistive tech can reach the controls (WCAG 4.1.2).
  commandPalette.setAttribute('role', 'toolbar');
  commandPalette.setAttribute('aria-label', uiLabel('toolbar'));

  // Drag handle (item: command palette draggable): a grip that repositions the
  // floating palette like the shape palette. Kept out of the tab order and hidden
  // from assistive tech (it is a pointer affordance; the toolbar itself is the
  // landmark). The palette stays operable by keyboard regardless of position.
  const paletteDragHandle = document.createElement('span');
  paletteDragHandle.className = 'grsch-cmd-drag-handle';
  paletteDragHandle.dataset.role = 'command-palette-drag-handle';
  paletteDragHandle.textContent = '⠿';
  paletteDragHandle.title = 'Move toolbar (double-click to minimize)';
  paletteDragHandle.setAttribute('aria-hidden', 'true');

  // Minimize / expand toggle (item: minimizable palette). A real focusable button
  // so the minimized palette stays reachable and toggleable by keyboard; a
  // double-click on the palette or its handle toggles the same state. Kept as a
  // DIRECT child (not inside a group) so it remains visible when minimized.
  const minimizeButton = makeCommandButton('▁', 'Minimize toolbar');
  minimizeButton.dataset.role = 'toggle-minimize';
  minimizeButton.classList.add('grsch-cmd-min-btn');
  minimizeButton.setAttribute('aria-expanded', 'true');

  // Properties panel show/hide toggle (item: properties panel toggle). Keeps the
  // panel as a fixed right region but lets the user reclaim its width for drawing.
  const propertiesToggleButton = makeCommandButton('▤', 'Toggle properties panel');
  propertiesToggleButton.dataset.role = 'toggle-properties';
  propertiesToggleButton.setAttribute('aria-pressed', 'true');

  // Fit: frame the whole schedule in the viewport (fix 7).
  const fitButton = makeCommandButton('⤢', uiLabel('fit_to_content'));
  fitButton.dataset.role = 'fit-to-content';
  // Fullscreen toggle: the F11 effect via the Fullscreen API (fix 12).
  const fullscreenButton = makeCommandButton('⛶', uiLabel('toggle_fullscreen'));
  fullscreenButton.dataset.role = 'toggle-fullscreen';
  fullscreenButton.setAttribute('aria-pressed', 'false');

  // The benchmark button is kept for the internal `?bench=` path but is NOT placed
  // in the palette any more (fix 9); it stays a detached, wired element.
  const benchButton = makeCommandButton('⏱', uiLabel('run_benchmark'));
  const linkButton = makeCommandButton('↔', uiLabel('link_mode'));
  linkButton.dataset.role = 'toggle-link';
  linkButton.setAttribute('aria-pressed', 'false');
  // Active-state hint for click-to-pick link mode (item 4): a polite status text shown
  // only while the mode is on, telling the user to pick a source then a target.
  const linkHint = document.createElement('span');
  linkHint.dataset.role = 'link-hint';
  linkHint.className = 'grsch-cmd-group-label';
  linkHint.setAttribute('role', 'status');
  linkHint.setAttribute('aria-live', 'polite');
  linkHint.style.display = 'none';
  linkHint.textContent = '';
  // Two INDEPENDENT plan / actual visibility toggles (fix 8), each aria-pressed.
  const planButton = makeCommandButton('P', uiLabel('plan_display'));
  planButton.dataset.role = 'toggle-plan';
  planButton.setAttribute('aria-pressed', 'true');
  const actualButton = makeCommandButton('A', uiLabel('actual_display'));
  actualButton.dataset.role = 'toggle-actual';
  actualButton.setAttribute('aria-pressed', 'true');
  const todayButton = makeCommandButton('║T', uiLabel('today_line'));
  todayButton.setAttribute('aria-pressed', 'true');
  // Pointer-following cursor-guide selector (items 9-12): FOUR exclusive modes as a
  // radio group (not a toggle). Only the active button carries aria-checked="true".
  const cursorGuideGroup = document.createElement('div');
  cursorGuideGroup.className = 'grsch-cmd-group';
  cursorGuideGroup.dataset.role = 'cursor-guide-modes';
  cursorGuideGroup.setAttribute('role', 'radiogroup');
  cursorGuideGroup.setAttribute('aria-label', uiLabel('cursor_guide'));
  const cursorGuideModes: ReadonlyArray<{ mode: CursorGuideMode; glyph: string; labelKey: string }> = [
    { mode: 'none', glyph: '⃠', labelKey: 'cursor_guide_none' },
    { mode: 'crosshair', glyph: '✛', labelKey: 'cursor_guide_crosshair' },
    { mode: 'single-vertical', glyph: '│', labelKey: 'cursor_guide_single_vertical' },
    { mode: 'double-vertical', glyph: '‖', labelKey: 'cursor_guide_double_vertical' },
  ];
  const cursorGuideButtons: HTMLButtonElement[] = cursorGuideModes.map(({ mode, glyph, labelKey }) => {
    const button = makeCommandButton(glyph, uiLabel(labelKey));
    button.dataset.role = 'cursor-guide-mode';
    button.dataset.guideMode = mode;
    button.dataset.labelKey = labelKey;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    cursorGuideGroup.appendChild(button);
    return button;
  });
  // Gridline toggles (fix 6): vertical date lines + horizontal category boundaries.
  // Both default ON; real focusable buttons carrying aria-pressed so the state is
  // conveyed to assistive tech, and the state round-trips via the view state.
  const gridDateButton = makeCommandButton('☰|', uiLabel('grid_date_lines'));
  gridDateButton.dataset.role = 'toggle-grid-date';
  gridDateButton.setAttribute('aria-pressed', 'true');
  const gridCategoryButton = makeCommandButton('≡', uiLabel('grid_category_lines'));
  gridCategoryButton.dataset.role = 'toggle-grid-category';
  gridCategoryButton.setAttribute('aria-pressed', 'true');
  const commentButton = makeCommandButton('💬', uiLabel('add_comment'));
  const boxButton = makeCommandButton('▢', uiLabel('add_box'));

  // Export/import: short visible glyphs but full accessible names so screen
  // readers and the E2E specs still address them by purpose (WCAG 1.1.1 / 4.1.2).
  const exportJsonButton = makeCommandButton('JSON', uiLabel('export_json'));
  const exportXmlButton = makeCommandButton('XML', uiLabel('export_xml'));
  const exportSvgButton = makeCommandButton('SVG', uiLabel('export_svg'));
  const importDocButton = makeCommandButton('↑', uiLabel('import'));
  const importIconButton = makeCommandButton('🖼', uiLabel('import_icon'));

  // Watermark controls (TOOL-L1-007, TOOL-L2-001/003): a local user-name input
  // plus a visibility toggle. Both feed the view state so they round-trip.
  const watermarkNameInput = document.createElement('input');
  watermarkNameInput.type = 'text';
  watermarkNameInput.placeholder = uiLabel('user_name');
  watermarkNameInput.setAttribute('aria-label', uiLabel('user_name'));
  watermarkNameInput.style.width = '96px';
  const watermarkButton = makeCommandButton('©', uiLabel('watermark'));
  watermarkButton.setAttribute('aria-pressed', 'false');

  // UI language toggle (PROP-L1-003): switches displayed labels/values (en/ja).
  const languageButton = makeCommandButton('EN', uiLabel('language'));

  const saveStatusLabel = document.createElement('span');
  saveStatusLabel.className = 'grsch-save-status';
  // Polite status region for autosave outcome (WCAG 4.1.3 Status Messages).
  saveStatusLabel.setAttribute('role', 'status');
  saveStatusLabel.setAttribute('aria-live', 'polite');
  saveStatusLabel.setAttribute('aria-label', uiLabel('autosave_status'));
  saveStatusLabel.style.color = AUTOSAVE_OK_HEX;
  saveStatusLabel.textContent = '';

  const fontScaleNames: Record<FontScale, string> = {
    S: uiLabel('font_size_small'),
    M: uiLabel('font_size_medium'),
    L: uiLabel('font_size_large'),
  };
  const fontGlyphs: Record<FontScale, string> = { S: 'A-', M: 'A', L: 'A+' };
  const fontButtons: HTMLButtonElement[] = (['S', 'M', 'L'] as FontScale[]).map((scale) => {
    const button = makeCommandButton(fontGlyphs[scale], fontScaleNames[scale]);
    button.dataset.fontScale = scale;
    return button;
  });

  // Functional grouping (fix 13): File | View | Show | Guides | Add | Marks | Lang
  // | Font, each a labelled group so related commands stay together when the
  // toolbar wraps. The shape picker (milestone + task, on one aligned row) and the
  // Undo/Redo group are injected by mountShapePicker just before the save-status
  // readout. The benchmark button is intentionally omitted (fix 9).
  commandPalette.append(
    paletteDragHandle,
    minimizeButton,
    makeCommandGroup('File', [
      exportJsonButton,
      exportXmlButton,
      exportSvgButton,
      importDocButton,
      importIconButton,
    ]),
    makeCommandGroup('View', [fitButton, fullscreenButton, propertiesToggleButton]),
    makeCommandGroup('Show', [planButton, actualButton]),
    makeCommandGroup('Guides', [todayButton, linkButton, linkHint]),
    cursorGuideGroup,
    makeCommandGroup('Grid', [gridDateButton, gridCategoryButton]),
    makeCommandGroup('Add', [commentButton, boxButton]),
    makeCommandGroup('Marks', [watermarkButton, watermarkNameInput]),
    makeCommandGroup('Lang', [languageButton]),
    makeCommandGroup('Font', fontButtons),
    saveStatusLabel,
  );

  // ---- body: full-viewport stage + property panel region. ----
  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flex = '1';
  body.style.minHeight = '0';

  const stage = document.createElement('div');
  stage.style.position = 'relative';
  stage.style.flex = '1';
  stage.style.overflow = 'hidden';
  stage.style.minHeight = '0';
  stage.style.minWidth = '0';

  const panelHost = document.createElement('div');

  const benchOutput = document.createElement('pre');
  benchOutput.style.position = 'absolute';
  benchOutput.style.top = '12px';
  benchOutput.style.left = '12px';
  benchOutput.style.margin = '0';
  benchOutput.style.padding = '10px 12px';
  benchOutput.style.background = 'rgba(20,20,20,0.85)';
  benchOutput.style.color = '#e8e8e8';
  benchOutput.style.font = '12px/1.5 ui-monospace, monospace';
  benchOutput.style.borderRadius = '6px';
  benchOutput.style.pointerEvents = 'none';
  benchOutput.style.whiteSpace = 'pre';
  benchOutput.style.zIndex = '20';
  benchOutput.style.display = 'none';

  stage.append(benchOutput);

  body.append(stage, panelHost);
  root.append(header, body);
  // The command palette floats over the WHOLE app (mounted on root, not the stage)
  // so it can be dragged up over/into the minimal header band (item: draggable into
  // the header). It is inserted first so the main commands lead the focus sequence
  // (WCAG 2.4.3). Being absolutely positioned, DOM order does not affect layout.
  root.insertBefore(commandPalette, header);
  return {
    stage,
    panelHost,
    header,
    scheduleNameLabel,
    helpButton,
    themeButton,
    commandPalette,
    paletteDragHandle,
    minimizeButton,
    propertiesToggleButton,
    fitButton,
    fullscreenButton,
    benchButton,
    linkButton,
    linkHint,
    planButton,
    actualButton,
    todayButton,
    cursorGuideButtons,
    gridDateButton,
    gridCategoryButton,
    commentButton,
    boxButton,
    exportJsonButton,
    exportXmlButton,
    exportSvgButton,
    importDocButton,
    importIconButton,
    watermarkButton,
    watermarkNameInput,
    languageButton,
    saveStatusLabel,
    benchOutput,
    statusLabel,
    fontButtons,
  };
}

/**
 * Shared, mutable UI-locale state with a change registry (PROP-L1-003). The
 * language toggle flips the locale and calls {@link LocaleController.emit}, which
 * re-runs every locale-dependent label sync that a `wire*` helper registered via
 * {@link LocaleController.onChange}. This replaces the god-function's direct
 * cross-calls between sibling `sync*` closures.
 */
interface LocaleController {
  /** The active UI locale. */
  get(): Locale;
  /** Set the active UI locale (does not emit; the caller emits when ready). */
  set(next: Locale): void;
  /** Register a callback to run whenever the locale changes. */
  onChange(listener: () => void): void;
  /** Run every registered locale-change callback. */
  emit(): void;
}

/**
 * Choose the starting document. A benchmark run needs the deterministic mid-size
 * fixture; a normal startup offers crash recovery (IO-L1-005) and otherwise starts
 * from the small, clean multi-section template (fix 6b).
 *
 * @param benchItemCountFromUrl - Requested benchmark item count, or null.
 * @returns The document to seed the store with.
 */
function loadInitialDocument(benchItemCountFromUrl: number | null): ScheduleDocument {
  if (benchItemCountFromUrl !== null) {
    return generateSampleDocument(benchItemCountFromUrl);
  }
  const template = generateTemplateDocument();
  if (!hasAutosavedDocument()) {
    return template;
  }
  if (window.confirm('Restore your previous session?')) {
    return loadAutosavedDocument() ?? template;
  }
  clearAutosavedDocument();
  return template;
}

/**
 * Application entry point. A short orchestrator: it builds the shell services in a
 * fixed order (theme, chrome, store, renderer, controller), then hands each feature
 * seam to a focused `wire*` helper IN THE SAME ORDER the god-function used, so the
 * DOM-wiring effects (append order, initial syncs, event registration) are
 * unchanged (review R1 / H-2).
 */
function bootstrap(): void {
  const root = document.getElementById('app');
  if (root === null) {
    throw new Error('Bootstrap failed: #app host element not found');
  }
  // Install the theme (CSS variables) FIRST so the chrome + canvas resolve their
  // themed colors as soon as they mount, and apply the persisted preference (or
  // the OS `prefers-color-scheme` when none was chosen) before first paint.
  installThemeStylesheet(document);
  const initialThemePreference = readStoredThemePreference();
  applyThemePreference(document, initialThemePreference);
  const chrome = buildChrome(root);
  // Install the uniform font-scale stylesheet (TOOL-L1-002) and the accessibility
  // stylesheet (focus indicators 2.4.7, reduced-motion 2.3.3, sr-only utility M5c).
  ensureUiFontStylesheet(document);
  ensureA11yStylesheet(document);
  // Polite live region for autosave / import / keyboard-focus announcements.
  const announcer = new LiveRegionAnnouncer(root, 'gr-scheduler status');

  const benchItemCountFromUrl = parseBenchParam(window.location.search);

  // The store normalizes every dispatched/replaced document by re-deriving the
  // classification tree (sections / rows / rowId) from the items' categories, so
  // the tree always follows the items and edits stay undoable.
  const store = new ScheduleStore(
    loadInitialDocument(benchItemCountFromUrl),
    undefined,
    rebuildClassification,
  );

  const renderer = new SvgRenderer();
  renderer.mount(chrome.stage);
  renderer.setDocument(store.getDocument());
  // Paint the initial view SYNCHRONOUSLY so a fresh load shows the schedule
  // immediately, instead of staying blank until the first animation frame happens
  // to run (a background tab, a throttled/headless context, or a delayed compositor
  // can defer rAF indefinitely). The subsequent Fit reframes on the next frame.
  renderer.renderNow();

  // Apply the persisted font scale uniformly across the chrome (TOOL-L1-002).
  applyUniformFontScale(root, store.getDocument().viewState.fontScale);

  const controller = new EditingController(renderer, store);
  controller.attach();
  const clipboard = new ItemClipboard();

  // Single source of truth for the property panel's visibility, shared by the
  // toolbar toggle, the panel's own × close button (fix 10) and double-click
  // (fix 10) so the toggle's aria-pressed never drifts from the actual state.
  const setPropertiesPanelHidden = (hidden: boolean): void => {
    propertyPanel.setHidden(hidden);
    chrome.propertiesToggleButton.setAttribute('aria-pressed', hidden ? 'false' : 'true');
    renderer.requestRender();
  };
  const propertyPanel = new PropertyPanel(chrome.panelHost, store, () =>
    setPropertiesPanelHidden(true),
  );

  // Active UI locale (PROP-L1-003), from view state, held as shared mutable state
  // so the language toggle can re-run every registered locale-dependent sync.
  let activeLocale: Locale = store.getDocument().viewState.activeLocale ?? 'en';
  const localeListeners: Array<() => void> = [];
  const locale: LocaleController = {
    get: () => activeLocale,
    set: (next) => {
      activeLocale = next;
    },
    onChange: (listener) => {
      localeListeners.push(listener);
    },
    emit: () => {
      for (const listener of localeListeners) {
        listener();
      }
    },
  };

  wirePaletteChrome(root, chrome);
  wireProperties(chrome, controller, propertyPanel, setPropertiesPanelHidden);

  // The fixed, resizable left classification pane (frozen column) wires itself to
  // store + view-state changes (CANVAS-L1-006 / L2-001, SECT-L1-006).
  new LeftClassificationPane(chrome.stage, store, renderer);
  // Merge the shape/milestone/task picker + Undo/Redo INTO the one command palette
  // (item: merge the two palettes) so there is a single role="toolbar" and no
  // overlap. Inserted before the save-status readout so it stays last.
  const toolPalette = mountShapePicker(
    chrome.commandPalette,
    {
      onArmShape: (shape) => controller.setPendingCreateShape(shape),
      onUndo: () => store.undo(),
      onRedo: () => store.redo(),
    },
    activeLocale,
    chrome.saveStatusLabel,
  );
  attachKeyboardShortcuts({ store, controller, clipboard });

  // Help modal (SHELL item 2): the [?] button opens an accessible dialog listing
  // all features + shortcuts; the modal owns its own focus trap and Esc handling
  // (it stops propagation so the shell's Esc handler does not double-fire).
  const helpModal = new HelpModal(root);
  wireHelp(chrome, helpModal);
  wireTheme(chrome, renderer, locale, initialThemePreference);
  wireEscHandling(controller, propertyPanel, helpModal, setPropertiesPanelHidden);

  // Screen-reader-only keyboard help, referenced by the canvas via aria-describedby
  // so a focused canvas announces how to operate it (WCAG 2.1.1 discoverability).
  const canvasHelp = document.createElement('p');
  canvasHelp.id = 'grsch-canvas-help';
  canvasHelp.className = VISUALLY_HIDDEN_CLASS;
  canvasHelp.textContent = uiLabel('canvas_keyboard_help', activeLocale);
  wireCanvasAccessibility(root, chrome, renderer, controller, store, announcer, canvasHelp, locale);

  syncScheduleName(chrome, store);
  wireToolbarLocalization(chrome, locale);
  wireFontScale(chrome, renderer, root, store);
  wireWatermark(chrome, renderer, locale);
  wireLanguage(chrome, renderer, toolPalette, canvasHelp, locale);
  wireDependencyLinkMode(chrome, controller, locale);
  wirePlanActual(chrome, renderer, locale);
  wireFit(chrome, renderer);
  wireFullscreen(chrome, locale);
  wireTodayLine(chrome, renderer, locale);
  wireProgressLine(propertyPanel, renderer);
  wireCursorGuide(chrome, renderer);
  wireGridToggles(chrome, renderer, locale);
  wireAnnotationCreation(chrome, store, renderer, controller);
  wireStoreSubscriptions(
    store,
    renderer,
    controller,
    propertyPanel,
    toolPalette,
    setPropertiesPanelHidden,
  );

  wireInputOutput(chrome, renderer, store, announcer);
  wireInitialFraming(renderer, benchItemCountFromUrl);

  log.info('bootstrap_complete', {
    initial_item_count: store.getDocument().items.length,
    bench_from_url: benchItemCountFromUrl !== null,
  });

  wireBenchmark(chrome, renderer, store, benchItemCountFromUrl);
}

/**
 * Wire the floating command palette's chrome: drag-to-move by its grip (clamped
 * within `root` so it can reach the header band yet never go fully off-screen) and
 * the minimize/expand toggle (double-click or the ▁ button), which collapses the
 * palette to just the handle + toggle to free the drawing area (fix 11).
 */
function wirePaletteChrome(root: HTMLElement, chrome: Chrome): void {
  enablePanelDrag({
    element: chrome.commandPalette,
    handle: chrome.paletteDragHandle,
    host: root,
  });

  // Keep the (possibly dragged) palette fully within the viewport (fix 11). Only
  // acts once the palette has an explicit left/top from a drag; while it still uses
  // its default top/right anchor it grows leftward and can never clip off-screen.
  const clampPaletteIntoView = (): void => {
    const palette = chrome.commandPalette;
    const left = palette.style.left;
    if (left === '' || left === 'auto') {
      return;
    }
    const maxLeft = Math.max(0, root.clientWidth - palette.offsetWidth);
    const maxTop = Math.max(0, root.clientHeight - palette.offsetHeight);
    const currentLeft = Number.parseFloat(left) || 0;
    const currentTop = Number.parseFloat(palette.style.top) || 0;
    palette.style.left = `${Math.min(Math.max(0, currentLeft), maxLeft)}px`;
    palette.style.top = `${Math.min(Math.max(0, currentTop), maxTop)}px`;
  };
  const setPaletteMinimized = (minimized: boolean): void => {
    chrome.commandPalette.dataset.minimized = minimized ? 'true' : 'false';
    chrome.minimizeButton.setAttribute('aria-expanded', minimized ? 'false' : 'true');
    chrome.minimizeButton.textContent = minimized ? '▢' : '▁';
    const name = minimized ? 'Expand toolbar' : 'Minimize toolbar';
    chrome.minimizeButton.setAttribute('aria-label', name);
    chrome.minimizeButton.title = name;
    // Re-expanding at an edge would push the wider palette off-screen; clamp it back
    // (fix 11). Reading offsetWidth after the dataset change forces the reflow so the
    // measured width is the expanded one.
    clampPaletteIntoView();
  };
  window.addEventListener('resize', clampPaletteIntoView);
  const togglePaletteMinimized = (): void => {
    setPaletteMinimized(chrome.commandPalette.dataset.minimized !== 'true');
  };
  setPaletteMinimized(false);
  chrome.minimizeButton.addEventListener('click', togglePaletteMinimized);
  chrome.commandPalette.addEventListener('dblclick', (event) => {
    // Ignore double-clicks that land on an interactive control (a fast double tap
    // of a command button should not also minimize the palette); the handle and
    // the palette chrome itself still toggle.
    const target = event.target;
    if (
      target instanceof Element &&
      target !== chrome.minimizeButton &&
      target.closest('button, input, select, textarea') !== null
    ) {
      return;
    }
    togglePaletteMinimized();
  });
}

/**
 * Wire the properties-panel show/hide toggle and the double-click-to-open path
 * (fix 10): hidden -> the flex canvas widens; shown -> the panel returns. The
 * controller has already applied the selection on activate; here we reveal it.
 */
function wireProperties(
  chrome: Chrome,
  controller: EditingController,
  propertyPanel: PropertyPanel,
  setPropertiesPanelHidden: (hidden: boolean) => void,
): void {
  chrome.propertiesToggleButton.addEventListener('click', () => {
    setPropertiesPanelHidden(!propertyPanel.isHidden());
  });
  controller.onItemActivate(() => {
    if (propertyPanel.isHidden()) {
      setPropertiesPanelHidden(false);
    }
  });
}

/** Wire the [?] help button to open the accessible help dialog (SHELL item 2). */
function wireHelp(chrome: Chrome, helpModal: HelpModal): void {
  chrome.helpButton.addEventListener('click', () => helpModal.open(chrome.helpButton));
}

/**
 * Wire the dark-mode toggle (SHELL item 3): an explicit light / dark choice,
 * persisted in localStorage and mirrored into the document view state so it
 * round-trips on export. The OS `prefers-color-scheme` still drives the initial
 * look until the user first chooses (preference 'system').
 */
function wireTheme(
  chrome: Chrome,
  renderer: SvgRenderer,
  locale: LocaleController,
  initialThemePreference: ThemePreference,
): void {
  let themePreference: ThemePreference = initialThemePreference;
  let themeMode: ThemeMode = resolveThemeMode(themePreference);
  const syncThemeButton = (): void => {
    const isDark = themeMode === 'dark';
    chrome.themeButton.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    // Show the glyph for the action available: a sun to go light while dark, a
    // moon to go dark while light.
    chrome.themeButton.textContent = isDark ? '☀' : '☽';
    const name = `${uiLabel('theme_toggle', locale.get())}: ${isDark ? 'on' : 'off'}`;
    chrome.themeButton.setAttribute('aria-label', name);
    chrome.themeButton.title = name;
  };
  syncThemeButton();
  chrome.themeButton.addEventListener('click', () => {
    themePreference = themeMode === 'dark' ? 'light' : 'dark';
    themeMode = applyThemePreference(document, themePreference);
    writeStoredThemePreference(themePreference);
    renderer.setViewState({ ...renderer.getViewState(), themePreference });
    syncThemeButton();
  });
  locale.onChange(syncThemeButton);
}

/**
 * Wire the window-level ESC handler (SHELL item 4): capture Esc ONLY when it is
 * actually used -- (a) a gesture/drag/marquee is in progress (cancel it), (b) the
 * Help modal is open (it handles + stops its own Esc, so it never reaches here), or
 * (c) the properties panel is open (close it). When NONE apply, Esc is left
 * un-prevented so it propagates to the browser (e.g. to exit native F11).
 */
function wireEscHandling(
  controller: EditingController,
  propertyPanel: PropertyPanel,
  helpModal: HelpModal,
  setPropertiesPanelHidden: (hidden: boolean) => void,
): void {
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (helpModal.isOpen()) {
      // The modal's own handler already closed it and stopped propagation; guard
      // anyway so the panel-close branch never runs while the modal is up.
      return;
    }
    if (controller.isGestureInProgress() || controller.hasArmedShape()) {
      controller.cancelActiveGesture();
      event.preventDefault();
      return;
    }
    if (!propertyPanel.isHidden()) {
      setPropertiesPanelHidden(true);
      event.preventDefault();
    }
    // Otherwise: idle + panel hidden -> do NOT preventDefault; let the browser have
    // the Esc (F11 fullscreen exit, etc.).
  });
}

/**
 * Wire canvas accessibility: reflect the locale on `<html lang>` (WCAG 3.1.1),
 * attach the screen-reader-only keyboard help (2.1.1), enable canvas keyboard
 * navigation (2.1.1 / 2.1.2) and set the logical focus order (2.4.3) by moving the
 * left pane then the canvas to the end of the stage (DOM order only, no visual
 * move since overlays are absolutely positioned).
 */
function wireCanvasAccessibility(
  root: HTMLElement,
  chrome: Chrome,
  renderer: SvgRenderer,
  controller: EditingController,
  store: ScheduleStore,
  announcer: LiveRegionAnnouncer,
  canvasHelp: HTMLParagraphElement,
  locale: LocaleController,
): void {
  document.documentElement.lang = locale.get();
  root.appendChild(canvasHelp);
  renderer.getSvgElement().setAttribute('aria-describedby', canvasHelp.id);

  attachCanvasKeyboardNavigation({
    renderer,
    controller,
    store,
    announce: (message) => announcer.announce(message),
    getLocale: () => locale.get(),
    onActivateItem: () => {
      const firstField = chrome.panelHost.querySelector<HTMLElement>('input, select, textarea');
      firstField?.focus();
    },
  });

  const leftPaneElement = chrome.stage.querySelector<HTMLElement>(
    '[data-role="left-classification-pane"]',
  );
  if (leftPaneElement !== null) {
    chrome.stage.appendChild(leftPaneElement);
  }
  chrome.stage.appendChild(renderer.getSvgElement());
}

/**
 * Reflect the active document title in the minimal header (item6.1), falling back
 * to `gr-scheduler` when the title is blank.
 */
function syncScheduleName(chrome: Chrome, store: ScheduleStore): void {
  const title = store.getDocument().title.trim();
  chrome.scheduleNameLabel.textContent = title.length > 0 ? title : 'gr-scheduler';
}

/**
 * Wire the localized accessible names of the command palette (PROP-L1-003). The
 * buttons show compact glyphs; their aria-label/title (the name a screen reader
 * announces and the E2E specs target) localize here and re-localize on a locale
 * change. Buttons that carry dynamic on/off state are re-synced by their own
 * wire helpers.
 */
function wireToolbarLocalization(chrome: Chrome, locale: LocaleController): void {
  const localizeCommandName = (button: HTMLButtonElement, labelKey: string, loc: Locale): void => {
    const name = uiLabel(labelKey, loc);
    button.setAttribute('aria-label', name);
    button.title = name;
  };
  const localizeToolbar = (loc: Locale): void => {
    chrome.commandPalette.setAttribute('aria-label', uiLabel('toolbar', loc));
    localizeCommandName(chrome.exportJsonButton, 'export_json', loc);
    localizeCommandName(chrome.exportXmlButton, 'export_xml', loc);
    localizeCommandName(chrome.exportSvgButton, 'export_svg', loc);
    localizeCommandName(chrome.importDocButton, 'import', loc);
    localizeCommandName(chrome.importIconButton, 'import_icon', loc);
    localizeCommandName(chrome.benchButton, 'run_benchmark', loc);
    localizeCommandName(chrome.fitButton, 'fit_to_content', loc);
    localizeCommandName(chrome.commentButton, 'add_comment', loc);
    localizeCommandName(chrome.boxButton, 'add_box', loc);
    chrome.watermarkNameInput.setAttribute('aria-label', uiLabel('user_name', loc));
    chrome.watermarkNameInput.placeholder = uiLabel('user_name', loc);
    chrome.saveStatusLabel.setAttribute('aria-label', uiLabel('autosave_status', loc));
    chrome.languageButton.setAttribute('aria-label', uiLabel('language', loc));
    chrome.languageButton.title = uiLabel('language', loc);
    localizeCommandName(chrome.fontButtons[0] as HTMLButtonElement, 'font_size_small', loc);
    localizeCommandName(chrome.fontButtons[1] as HTMLButtonElement, 'font_size_medium', loc);
    localizeCommandName(chrome.fontButtons[2] as HTMLButtonElement, 'font_size_large', loc);
    // Cursor-guide radio buttons carry their own i18n key in dataset.labelKey.
    for (const button of chrome.cursorGuideButtons) {
      const key = button.dataset.labelKey;
      if (key !== undefined) {
        localizeCommandName(button, key, loc);
      }
    }
  };
  localizeToolbar(locale.get());
  locale.onChange(() => localizeToolbar(locale.get()));
}

/**
 * Wire the A- / A / A+ font-scale buttons: reflect the active scale (WCAG 4.1.2)
 * and, on click, apply the step to the SVG schedule labels (view state) AND all
 * HTML chrome (root font variable) so one control scales everything uniformly
 * (TOOL-L1-002).
 */
function wireFontScale(
  chrome: Chrome,
  renderer: SvgRenderer,
  root: HTMLElement,
  store: ScheduleStore,
): void {
  const syncFontButtons = (scale: FontScale): void => {
    for (const button of chrome.fontButtons) {
      button.setAttribute('aria-pressed', button.dataset.fontScale === scale ? 'true' : 'false');
    }
  };
  syncFontButtons(store.getDocument().viewState.fontScale);
  for (const button of chrome.fontButtons) {
    button.addEventListener('click', () => {
      const scale = button.dataset.fontScale as FontScale;
      renderer.setViewState({ ...renderer.getViewState(), fontScale: scale });
      applyUniformFontScale(root, scale);
      syncFontButtons(scale);
    });
  }
}

/**
 * Wire the watermark on/off toggle and user-name input (TOOL-L1-007, TOOL-L2-003).
 * Kept in view state so it round-trips on export without polluting Undo/Redo. The
 * mark is shown by DEFAULT (resolveWatermark treats an absent value as an enabled
 * "GoodRelax" mark); hiding it requires the password (only the hash is ever kept;
 * client-side gating is a soft deterrent only, security-design §6).
 */
function wireWatermark(chrome: Chrome, renderer: SvgRenderer, locale: LocaleController): void {
  const currentWatermark = (): Watermark => resolveWatermark(renderer.getViewState().watermark);
  const isWatermarkEnabled = (): boolean => currentWatermark().enabled;
  const syncWatermarkButton = (): void => {
    const enabled = isWatermarkEnabled();
    const name = `${uiLabel('watermark', locale.get())}: ${enabled ? 'on' : 'off'}`;
    chrome.watermarkButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    chrome.watermarkButton.setAttribute('aria-label', name);
    chrome.watermarkButton.title = name;
  };
  const applyWatermark = (next: Watermark): void => {
    renderer.setViewState({ ...renderer.getViewState(), watermark: next });
    syncWatermarkButton();
  };
  chrome.watermarkNameInput.value = currentWatermark().userName;
  chrome.watermarkButton.addEventListener('click', () => {
    const base = currentWatermark();
    if (!base.enabled) {
      // Turning the mark ON needs no password; refresh the timestamp in UTC ISO-8601.
      applyWatermark({
        ...base,
        enabled: true,
        userName: chrome.watermarkNameInput.value.trim() || DEFAULT_WATERMARK_TEXT,
        timestamp: formatWatermarkTimestampUtc(Date.now()),
      });
      return;
    }
    // Hiding the mark requires the password: hash the input and compare to the
    // stored hash (only the hash is ever kept).
    const entered = window.prompt(uiLabel('watermark_hide_prompt', locale.get())) ?? '';
    const expectedHash = base.hideHash ?? DEFAULT_WATERMARK_HIDE_PASSWORD_HASH;
    void matchesWatermarkHidePassword(entered, expectedHash).then((ok) => {
      if (!ok) {
        window.alert(uiLabel('watermark_hide_denied', locale.get()));
        return; // wrong password: the watermark stays visible.
      }
      applyWatermark({ ...base, enabled: false });
    });
  });
  chrome.watermarkNameInput.addEventListener('change', () => {
    const base = currentWatermark();
    applyWatermark({
      ...base,
      userName: chrome.watermarkNameInput.value.trim() || DEFAULT_WATERMARK_TEXT,
    });
  });
  syncWatermarkButton();
  locale.onChange(syncWatermarkButton);
}

/**
 * Wire the UI language toggle (PROP-L1-003): cycle en <-> ja (property NAMES stay
 * English), mirror the locale into the view state and the shape picker, then emit
 * the locale change so every registered label sync re-runs, and keep `<html lang>`
 * and the canvas keyboard help in step (WCAG 3.1.1 / 2.1.1).
 */
function wireLanguage(
  chrome: Chrome,
  renderer: SvgRenderer,
  toolPalette: ToolPaletteHandle,
  canvasHelp: HTMLParagraphElement,
  locale: LocaleController,
): void {
  chrome.languageButton.addEventListener('click', () => {
    locale.set(locale.get() === 'en' ? 'ja' : 'en');
    const active = locale.get();
    renderer.setViewState({ ...renderer.getViewState(), activeLocale: active });
    toolPalette.setLocale(active);
    locale.emit();
    document.documentElement.lang = active;
    canvasHelp.textContent = uiLabel('canvas_keyboard_help', active);
    chrome.languageButton.textContent = active.toUpperCase();
  });
  chrome.languageButton.textContent = locale.get().toUpperCase();
}

/**
 * Wire the dependency link-mode toggle (DEP-L1). Reflect state via aria-pressed + a
 * localized title (glyph stays stable, WCAG 4.1.2), and show the click-to-pick hint
 * (item 4) while the mode is on: pick a source, then a target.
 */
function wireDependencyLinkMode(
  chrome: Chrome,
  controller: EditingController,
  locale: LocaleController,
): void {
  const syncLinkButton = (enabled: boolean): void => {
    const name = `${uiLabel('link_mode', locale.get())}: ${enabled ? 'on' : 'off'}`;
    chrome.linkButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    chrome.linkButton.setAttribute('aria-label', name);
    chrome.linkButton.title = name;
  };
  chrome.linkButton.addEventListener('click', () => {
    const enabled = !controller.isLinkMode();
    controller.setLinkMode(enabled);
    syncLinkButton(enabled);
  });
  syncLinkButton(controller.isLinkMode());

  controller.onLinkStateChange((state) => {
    if (!state.enabled) {
      chrome.linkHint.style.display = 'none';
      chrome.linkHint.textContent = '';
      return;
    }
    chrome.linkHint.style.display = '';
    chrome.linkHint.textContent =
      state.armedSourceItemId === null
        ? 'Dependency link: pick source -> target'
        : `Dependency link: ${state.armedSourceItemId} -> pick target`;
  });
}

/**
 * Wire the two independent Plan / Actual visibility toggles (fix 8, PLAN-L1-002),
 * held in view state (not the edit history). Together they drive the single display
 * filter: both on -> both, one on -> that side, neither -> none.
 */
function wirePlanActual(chrome: Chrome, renderer: SvgRenderer, locale: LocaleController): void {
  const syncPlanActualButtons = (display: PlanActualDisplay | undefined): void => {
    const planShown = isPlanShown(display);
    const actualShown = isActualShown(display);
    const planName = `${uiLabel('plan_display', locale.get())}: ${planShown ? 'on' : 'off'}`;
    chrome.planButton.setAttribute('aria-pressed', planShown ? 'true' : 'false');
    chrome.planButton.setAttribute('aria-label', planName);
    chrome.planButton.title = planName;
    const actualName = `${uiLabel('actual_display', locale.get())}: ${actualShown ? 'on' : 'off'}`;
    chrome.actualButton.setAttribute('aria-pressed', actualShown ? 'true' : 'false');
    chrome.actualButton.setAttribute('aria-label', actualName);
    chrome.actualButton.title = actualName;
  };
  chrome.planButton.addEventListener('click', () => {
    const current = renderer.getViewState().planActualDisplay;
    const next = planActualDisplayFrom(!isPlanShown(current), isActualShown(current));
    renderer.setViewState({ ...renderer.getViewState(), planActualDisplay: next });
    syncPlanActualButtons(next);
  });
  chrome.actualButton.addEventListener('click', () => {
    const current = renderer.getViewState().planActualDisplay;
    const next = planActualDisplayFrom(isPlanShown(current), !isActualShown(current));
    renderer.setViewState({ ...renderer.getViewState(), planActualDisplay: next });
    syncPlanActualButtons(next);
  });
  syncPlanActualButtons(renderer.getViewState().planActualDisplay);
  locale.onChange(() => syncPlanActualButtons(renderer.getViewState().planActualDisplay));
}

/** Wire the Fit button: frame the whole schedule in the viewport (fix 7). */
function wireFit(chrome: Chrome, renderer: SvgRenderer): void {
  chrome.fitButton.addEventListener('click', () => renderer.fitToContent());
}

/** Wire the fullscreen toggle (fix 12): the F11 effect via the Fullscreen API. */
function wireFullscreen(chrome: Chrome, locale: LocaleController): void {
  const syncFullscreenButton = (): void => {
    const active = globalThis.document.fullscreenElement !== null;
    const name = `${uiLabel('toggle_fullscreen', locale.get())}: ${active ? 'on' : 'off'}`;
    chrome.fullscreenButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    chrome.fullscreenButton.setAttribute('aria-label', name);
    chrome.fullscreenButton.title = name;
  };
  chrome.fullscreenButton.addEventListener('click', () => {
    const doc = globalThis.document;
    if (doc.fullscreenElement === null) {
      const request = doc.documentElement.requestFullscreen?.();
      if (request !== undefined) {
        void request.catch(() => undefined);
      }
    } else {
      const exit = doc.exitFullscreen?.();
      if (exit !== undefined) {
        void exit.catch(() => undefined);
      }
    }
  });
  globalThis.document.addEventListener('fullscreenchange', syncFullscreenButton);
  syncFullscreenButton();
  locale.onChange(syncFullscreenButton);
}

/** Wire the today-line visibility toggle (CURS-L1-001 / L1-004). */
function wireTodayLine(chrome: Chrome, renderer: SvgRenderer, locale: LocaleController): void {
  const syncTodayButton = (visible: boolean): void => {
    const name = `${uiLabel('today_line', locale.get())}: ${visible ? 'on' : 'off'}`;
    chrome.todayButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
    chrome.todayButton.setAttribute('aria-label', name);
    chrome.todayButton.title = name;
  };
  chrome.todayButton.addEventListener('click', () => {
    const visible = renderer.getViewState().todayLineVisible !== true;
    renderer.setViewState({ ...renderer.getViewState(), todayLineVisible: visible });
    syncTodayButton(visible);
  });
  syncTodayButton(renderer.getViewState().todayLineVisible === true);
}

/**
 * Wire the progress-line (イナズマ線) show/hide + color controls (item 2), hosted in
 * the property panel so the floating toolbar is untouched. Both settings live in
 * view state so they round-trip via JSON / autosave; absent visibility is treated
 * as shown (legacy default). English-only labels (SHELL item 5).
 */
function wireProgressLine(propertyPanel: PropertyPanel, renderer: SvgRenderer): void {
  propertyPanel.attachProgressLineControls({
    isVisible: () => renderer.getViewState().progressLineVisible !== false,
    getColor: () => renderer.getViewState().progressLineColor ?? DEFAULT_PROGRESS_LINE_COLOR,
    onToggle: (visible) =>
      renderer.setViewState({ ...renderer.getViewState(), progressLineVisible: visible }),
    onColor: (color) =>
      renderer.setViewState({ ...renderer.getViewState(), progressLineColor: color }),
    label: uiLabel('progress_line', 'en'),
    colorLabel: uiLabel('progress_line_color', 'en'),
  });
}

/**
 * Wire the pointer-following cursor-guide selector (items 9-12): four EXCLUSIVE
 * modes as a radio group, held in view state (cursorGuideMode) so the choice
 * round-trips via JSON / autosave. Default is `none` (off).
 */
function wireCursorGuide(chrome: Chrome, renderer: SvgRenderer): void {
  const syncCursorGuideButtons = (mode: CursorGuideMode): void => {
    for (const button of chrome.cursorGuideButtons) {
      button.setAttribute('aria-checked', button.dataset.guideMode === mode ? 'true' : 'false');
    }
  };
  for (const button of chrome.cursorGuideButtons) {
    button.addEventListener('click', () => {
      const mode = (button.dataset.guideMode ?? 'none') as CursorGuideMode;
      renderer.setViewState({ ...renderer.getViewState(), cursorGuideMode: mode });
      syncCursorGuideButtons(mode);
    });
  }
  syncCursorGuideButtons(renderer.getViewState().cursorGuideMode ?? 'none');
}

/**
 * Wire the vertical date-line and horizontal category-line gridline toggles
 * (fix 6): both default ON (absent flag treated as visible). The state is written
 * to the view state so it round-trips via JSON / autosave (WCAG 4.1.2).
 */
function wireGridToggles(chrome: Chrome, renderer: SvgRenderer, locale: LocaleController): void {
  const syncGridDateButton = (visible: boolean): void => {
    const name = `${uiLabel('grid_date_lines', locale.get())}: ${visible ? 'on' : 'off'}`;
    chrome.gridDateButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
    chrome.gridDateButton.setAttribute('aria-label', name);
    chrome.gridDateButton.title = name;
  };
  chrome.gridDateButton.addEventListener('click', () => {
    const visible = renderer.getViewState().gridDateLinesVisible === false;
    renderer.setViewState({ ...renderer.getViewState(), gridDateLinesVisible: visible });
    syncGridDateButton(visible);
  });
  syncGridDateButton(renderer.getViewState().gridDateLinesVisible !== false);

  const syncGridCategoryButton = (visible: boolean): void => {
    const name = `${uiLabel('grid_category_lines', locale.get())}: ${visible ? 'on' : 'off'}`;
    chrome.gridCategoryButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
    chrome.gridCategoryButton.setAttribute('aria-label', name);
    chrome.gridCategoryButton.title = name;
  };
  chrome.gridCategoryButton.addEventListener('click', () => {
    const visible = renderer.getViewState().gridCategoryLinesVisible === false;
    renderer.setViewState({ ...renderer.getViewState(), gridCategoryLinesVisible: visible });
    syncGridCategoryButton(visible);
  });
  syncGridCategoryButton(renderer.getViewState().gridCategoryLinesVisible !== false);
}

/**
 * Wire the undoable annotation-creation buttons (CURS-L1-005/006/007). New
 * annotations land near the current horizontal viewport center so they are visible.
 */
function wireAnnotationCreation(
  chrome: Chrome,
  store: ScheduleStore,
  renderer: SvgRenderer,
  controller: EditingController,
): void {
  const viewportCenterDate = (): string => {
    const view = renderer.getViewState();
    const centerWorldX = view.scrollX + 200;
    return worldXToDate(centerWorldX, store.getDocument().epochDate, view.zoomX);
  };
  chrome.commentButton.addEventListener('click', () => {
    // When exactly one item is selected, ITEM-anchor the comment to it (anchor
    // point 4 = center) so the comment follows the item as it moves (CURS-L1-005);
    // otherwise drop a free-world comment at the viewport center.
    const selection = [...controller.getSelection()];
    const anchorItemId = selection.length === 1 ? selection[0] : undefined;
    store.dispatch(
      createCommentCommand({
        id: `comment-${Date.now()}`,
        annotationKind: 'callout-box',
        text: 'note',
        anchorDate: viewportCenterDate(),
        anchorRowIndex: 0,
        ...(anchorItemId !== undefined ? { anchorItemId, anchorPoint: 4 as const } : {}),
        bodyOffsetPx: { dx: 48, dy: -36 },
      }),
    );
  });
  chrome.boxButton.addEventListener('click', () => {
    const startDate = viewportCenterDate();
    const view = renderer.getViewState();
    const scheduleDocument = store.getDocument();
    const endDate = worldXToDate(view.scrollX + 360, scheduleDocument.epochDate, view.zoomX);
    // Single-section constraint (user choice): keep the new box inside one section.
    const visible0 = orderedVisibleRows(scheduleDocument.sections, scheduleDocument.rows);
    const displayRows = collapseRows(visible0, classificationCollapseLevel(view.zoomY)).rows;
    const bands = contiguousSectionBands(displayRows, scheduleDocument.sections);
    const topRowIndex = 0;
    const bottomRowIndex = clampRowIndexToSection(bands, topRowIndex, 2);
    store.dispatch(
      createRoundedBoxCommand({
        id: `box-${Date.now()}`,
        annotationKind: 'rounded-box',
        startDate,
        endDate,
        topRowIndex,
        bottomRowIndex,
        strokeColor: CUD_GREEN_ACCENT_HEX,
        cornerRadiusPx: 10,
      }),
    );
  });
}

/**
 * Wire the store subscriptions: re-render items and refresh Undo/Redo state on every
 * document change, and keep the property panel pointed at the current item selection
 * (item 5) or dependency selection (item 1), revealing the panel for a selected line.
 */
function wireStoreSubscriptions(
  store: ScheduleStore,
  renderer: SvgRenderer,
  controller: EditingController,
  propertyPanel: PropertyPanel,
  toolPalette: ToolPaletteHandle,
  setPropertiesPanelHidden: (hidden: boolean) => void,
): void {
  store.subscribe((scheduleDocument) => {
    renderer.updateItems(scheduleDocument);
    toolPalette.updateHistoryState(store.canUndo(), store.canRedo());
  });
  controller.onSelectionChange((selectedItemIds) => {
    // Pass the WHOLE selection so a fill-color edit applies to all selected items
    // (item 5); the panel shows the first item's field values.
    propertyPanel.setSelectedItemIds(selectedItemIds);
  });
  controller.onDependencySelectionChange((dependencyId) => {
    propertyPanel.setSelectedDependency(dependencyId);
    if (dependencyId !== null && propertyPanel.isHidden()) {
      setPropertiesPanelHidden(false);
    }
  });
  toolPalette.updateHistoryState(store.canUndo(), store.canRedo());
}

/**
 * Frame the whole schedule on startup (fix 7), unless a benchmark run owns the
 * renderer. Deferred one frame so the stage is measured and the first layout has run
 * before Fit reads the extent, then painted SYNCHRONOUSLY so the framed view appears
 * even if the following animation frame is throttled.
 */
function wireInitialFraming(renderer: SvgRenderer, benchItemCountFromUrl: number | null): void {
  if (benchItemCountFromUrl !== null) {
    return;
  }
  requestAnimationFrame(() => {
    renderer.fitToContent();
    renderer.renderNow();
  });
  // Also fit immediately: the stage is already measured at mount, so a fresh load
  // is framed without waiting for the deferred frame (belt-and-suspenders so the
  // canvas is never left blank on load).
  renderer.fitToContent();
  renderer.renderNow();
}

/** Wire Export/Import toolbar buttons and localStorage autosave (IO-L1-004/005). */
function wireInputOutput(
  chrome: Chrome,
  renderer: SvgRenderer,
  store: ScheduleStore,
  announcer: LiveRegionAnnouncer,
): void {
  const adoptDocument = (scheduleDocument: ScheduleDocument): void => {
    // replaceDocument normalizes (re-derives the classification tree); hand the
    // renderer the normalized result so both stay in sync.
    store.replaceDocument(scheduleDocument);
    renderer.setDocument(store.getDocument());
    // Frame the freshly imported schedule so the whole thing is visible (fix 7).
    renderer.fitToContent();
    // Keep the minimal header's schedule name in sync with the adopted document
    // (item6.1): an import replaces the title shown in the header.
    const title = scheduleDocument.title.trim();
    chrome.scheduleNameLabel.textContent = title.length > 0 ? title : 'gr-scheduler';
  };

  const reportImportFailure = (error: unknown): void => {
    const reason =
      error instanceof ImportRejectedError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    log.error('import_failed', { reason });
    // Announce politely (WCAG 4.1.3) in addition to the modal alert.
    announcer.announce(`Import rejected: ${reason}`);
    window.alert(`Import rejected: ${reason}`);
  };

  // Merge the renderer's live view state (font scale / locale / watermark) into
  // the store document so those display settings round-trip on export. The
  // watermark is materialized via resolveWatermark so the default-ON mark (and its
  // hide-password HASH -- never the raw password) is present in the exported JSON.
  const documentForExport = (): ScheduleDocument => {
    const viewState = renderer.getViewState();
    return {
      ...store.getDocument(),
      viewState: { ...viewState, watermark: resolveWatermark(viewState.watermark) },
    };
  };

  chrome.exportJsonButton.addEventListener('click', () => {
    const stem = toFileStem(store.getDocument().title);
    downloadTextFile(`${stem}.json`, 'application/json', serializeScheduleDocument(documentForExport(), true));
  });

  chrome.exportXmlButton.addEventListener('click', () => {
    const stem = toFileStem(store.getDocument().title);
    downloadTextFile(`${stem}.xml`, 'application/xml', exportMspdi(documentForExport()));
  });

  chrome.exportSvgButton.addEventListener('click', () => {
    const stem = toFileStem(store.getDocument().title);
    // Embed the evidence watermark into the exported/shared SVG when enabled
    // (TOOL-L1-007), using the shared builder so it matches the on-screen mark.
    // resolveWatermark applies the default-ON mark for a document that never set
    // one, so a shared export still carries the "GoodRelax" mark.
    const watermark = resolveWatermark(renderer.getViewState().watermark);
    const svg = exportScheduleSvg(
      documentForExport(),
      watermark.enabled
        ? { watermark: { userName: watermark.userName, timestamp: watermark.timestamp } }
        : {},
    );
    downloadTextFile(`${stem}.svg`, 'image/svg+xml', svg);
  });

  chrome.importDocButton.addEventListener('click', () => {
    void (async (): Promise<void> => {
      try {
        const file = await pickFile('.json,.xml,application/json,application/xml');
        if (file === null) {
          return;
        }
        const result = await importDocumentFile(file);
        adoptDocument(result.document);
      } catch (error) {
        reportImportFailure(error);
      }
    })();
  });

  chrome.importIconButton.addEventListener('click', () => {
    void (async (): Promise<void> => {
      try {
        const file = await pickFile('.svg,.png,image/svg+xml,image/png');
        if (file === null) {
          return;
        }
        const result = await importIconFile(file);
        // M5a wiring: pool the sanitized asset on the document so it is preserved
        // by export/save; item-level icon assignment is an editing-panel concern.
        const current = store.getDocument();
        adoptDocument({ ...current, assets: [...(current.assets ?? []), result.asset] });
        log.info('icon_pooled', { asset_id: result.asset.id, asset_format: result.asset.assetFormat });
      } catch (error) {
        reportImportFailure(error);
      }
    })();
  });

  const autosave = new AutosaveController(store);
  autosave.onStatus((status) => {
    chrome.saveStatusLabel.style.color = status === 'saved' ? AUTOSAVE_OK_HEX : AUTOSAVE_FAIL_HEX;
    chrome.saveStatusLabel.textContent = status === 'saved' ? 'saved' : 'save failed';
  });
  autosave.start();
}

/** Wire the benchmark button and optional auto-run; restores the store doc after. */
function wireBenchmark(
  chrome: Chrome,
  renderer: SvgRenderer,
  store: ScheduleStore,
  benchItemCountFromUrl: number | null,
): void {
  let benchmarkRunning = false;
  const executeBenchmark = async (itemCount: number): Promise<void> => {
    if (benchmarkRunning) {
      return;
    }
    benchmarkRunning = true;
    chrome.benchButton.disabled = true;
    chrome.statusLabel.textContent = `benchmarking ${itemCount} items...`;
    chrome.benchOutput.style.display = 'block';
    chrome.benchOutput.textContent = `Running benchmark (${itemCount} items)...`;
    try {
      const result = await runBenchmark(renderer, itemCount);
      chrome.benchOutput.textContent = formatBenchmarkReport(result);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      chrome.benchOutput.textContent = `Benchmark failed: ${reason}`;
      log.error('benchmark_failed', { reason });
    } finally {
      // The benchmark drives the renderer directly; restore the live store doc.
      renderer.setDocument(store.getDocument());
      benchmarkRunning = false;
      chrome.benchButton.disabled = false;
      chrome.statusLabel.textContent = STATUS_HINT;
    }
  };

  chrome.benchButton.addEventListener('click', () => {
    void executeBenchmark(benchItemCountFromUrl ?? DEFAULT_ITEM_COUNT);
  });

  if (benchItemCountFromUrl !== null) {
    void executeBenchmark(benchItemCountFromUrl);
  }
}

bootstrap();
