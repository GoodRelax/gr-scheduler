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
  materializeWatermark,
  resolveWatermark,
} from '../domain/usecase/watermark-builder.js';
import { matchesWatermarkHidePassword } from '../adapters/security/watermark-password.js';
import { SvgRenderer } from '../adapters/render/svg-renderer.js';
import {
  applyCanvasFontScale,
  ensureUiFontStylesheet,
  FONT_SCALE_GLYPHS,
  toFontScale,
} from './font-scale.js';
import { uiLabel } from '../domain/usecase/i18n.js';
import { AUTOSAVE_FAIL_HEX, AUTOSAVE_OK_HEX } from '../domain/usecase/a11y-tokens.js';
import { CUD_GREEN_ACCENT_HEX } from '../domain/usecase/render-tokens.js';
import { ScheduleStore } from '../domain/command/schedule-store.js';
import {
  createCommentCommand,
  createRoundedBoxCommand,
} from '../domain/command/annotation-commands.js';
import { worldXToDate } from '../domain/usecase/time-coordinate-mapper.js';
import { isProgressLineVisible } from '../domain/usecase/progress-line-builder.js';
import { rebuildClassification } from '../domain/usecase/classification-tree.js';
import { EditingController } from '../adapters/input/editing-controller.js';
import { PropertyPanel } from '../adapters/ui/property-panel.js';
import { LeftClassificationPane } from '../adapters/ui/left-pane.js';
import { mountShapePicker } from '../adapters/ui/tool-palette.js';
import { enablePanelDrag } from '../adapters/ui/draggable.js';
import { ItemClipboard } from '../adapters/clipboard/item-clipboard.js';
import { attachKeyboardShortcuts } from '../adapters/input/keyboard-shortcuts.js';
import { attachCanvasKeyboardNavigation } from '../adapters/input/keyboard-navigation.js';
import { ensureA11yStylesheet, VISUALLY_HIDDEN_CLASS } from '../adapters/a11y/a11y-stylesheet.js';
import { LiveRegionAnnouncer } from '../adapters/a11y/live-region.js';
import {
  generateEmptyDocument,
  generateSampleDocument,
  generateTemplateDocument,
  DEFAULT_ITEM_COUNT,
} from './sample-data.js';
import { generateProjectId } from '../adapters/id/id-generator.js';
import {
  GR_SCHEDULER_DOCUMENT_SCHEMA,
  GR_SCHEDULER_DOCUMENT_SCHEMA_ID,
} from '../domain/usecase/document-schema.js';
import { formatBenchmarkReport, parseBenchParam, runBenchmark } from './benchmark.js';
import { createLogger } from './logger.js';
import { HelpModal } from '../adapters/ui/help-modal.js';
import { AiExportModal } from '../adapters/ui/ai-export-modal.js';
import { openAllClearDialog } from '../adapters/ui/all-clear-dialog.js';
import {
  copyPngToClipboardOrDownload,
  downloadPngBlob,
  rasterizeSvgToPng,
} from '../adapters/io/screen-capture.js';
import { buildViewportCaptureSvg } from './viewport-capture.js';
import {
  createHeaderMenu,
  ensureHeaderMenuStylesheet,
  type HeaderMenu,
} from '../adapters/ui/header-menu.js';
import {
  HEADER_CONTROL_ROLES,
  HEADER_LEFT_CONTROL_ROLES,
  LOAD_MENU_ITEMS,
  SAVE_MENU_ITEMS,
  THEME_BUTTON_SPECS,
} from './header-model.js';
import { resolvePlanActualStyle } from '../domain/usecase/plan-actual-geometry.js';
import type { RoundedBoxRect } from '../domain/command/annotation-commands.js';
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
import { downloadDeliveredApp, downloadTextFile, pickFile } from '../adapters/io/file-io.js';
import {
  importBaselineDocumentFile,
  importDocumentFile,
} from '../adapters/io/import-service.js';
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
  // CR-006 Part 1 / Part 2: the two LEFT-edge header controls, placed left of the
  // branding block. Fit frames the whole schedule; the palette toggle shows / minimizes
  // the floating command palette, bidirectionally synced with the palette's own [-].
  headerFitButton: HTMLButtonElement;
  headerPaletteToggleButton: HTMLButtonElement;
  helpButton: HTMLButtonElement;
  aiButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  redoButton: HTMLButtonElement;
  themeModeButtons: HTMLButtonElement[];
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
  // CR-006 palette toggles: progress-line (Part 5, default hidden), plan/actual style
  // [Ao]/[As] (Part 6) and the assignee-name show/hide toggle (Part 7).
  progressLineButton: HTMLButtonElement;
  planActualStyleGroup: HTMLElement;
  planActualStyleButtons: HTMLButtonElement[];
  assigneeButton: HTMLButtonElement;
  // CR-003 Part 1 header controls: SS (viewport PNG), Load / Save dropdown menus and
  // the Base V / Base I baseline-visibility buttons.
  ssButton: HTMLButtonElement;
  loadMenu: HeaderMenu;
  saveMenu: HeaderMenu;
  baselineShowButton: HTMLButtonElement;
  baselineHideButton: HTMLButtonElement;
  watermarkButton: HTMLButtonElement;
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
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: 28px;
  padding: 1px 12px;
  background: var(--grsch-header-bg);
  color: var(--grsch-header-fg);
  font-family: system-ui, sans-serif;
  font-size: 0.78em;
}
.${APP_HEADER_CLASS} .grsch-header-left {
  justify-self: start;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.${APP_HEADER_CLASS} .grsch-header-branding {
  display: flex;
  flex-direction: column;
  line-height: 1.0;
}
.${APP_HEADER_CLASS} .grsch-brand-name { font-weight: 700; font-size: 1.05em; letter-spacing: 0.2px; }
.${APP_HEADER_CLASS} .grsch-brand-line {
  font-size: 0.62em;
  color: var(--grsch-header-muted);
}
.${APP_HEADER_CLASS} a.grsch-brand-line { text-decoration: underline; }
.${APP_HEADER_CLASS} a.grsch-brand-line:hover { color: var(--grsch-header-fg); }
.${APP_HEADER_CLASS} .grsch-header-group {
  display: flex;
  align-items: center;
  gap: 3px;
}
.${APP_HEADER_CLASS} .grsch-header-group[role="radiogroup"] { gap: 2px; }
.${APP_HEADER_CLASS} .grsch-schedule-name {
  justify-self: center;
  text-align: center;
  font-weight: 600;
  font-size: 1.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 34vw;
}
.${APP_HEADER_CLASS} .grsch-header-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 6px;
}
.${APP_HEADER_CLASS} .grsch-header-btn {
  cursor: pointer;
  min-width: 24px;
  height: 22px;
  padding: 0 7px;
  font-size: 1em;
  line-height: 1;
  border: 1px solid var(--grsch-header-muted);
  border-radius: 5px;
  background: transparent;
  color: var(--grsch-header-fg);
  white-space: nowrap;
}
.${APP_HEADER_CLASS} .grsch-header-btn:hover { background: rgba(127, 127, 127, 0.22); }
.${APP_HEADER_CLASS} .grsch-header-btn:disabled { opacity: 0.4; cursor: default; }
.${APP_HEADER_CLASS} .grsch-file-btn { font-size: 0.9em; padding: 0 6px; }
.${APP_HEADER_CLASS} .grsch-undo-redo-btn { font-size: 1.15em; min-width: 24px; padding: 0 5px; }
.${APP_HEADER_CLASS} .grsch-theme-btn {
  font-size: 0.82em;
  min-width: 22px;
  padding: 0 6px;
}
.${APP_HEADER_CLASS} .grsch-theme-btn[aria-pressed="true"] {
  background: var(--grsch-accent);
  border-color: var(--grsch-accent-border);
  color: var(--grsch-accent-text);
}
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

/**
 * Create a header button (file-ops / theme / undo-redo / actions) with a visible
 * label, a matching accessible name + tooltip, and a stable `data-role`.
 */
function makeHeaderButton(
  className: string,
  label: string,
  accessibleName: string,
  role: string,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `grsch-header-btn ${className}`;
  button.dataset.role = role;
  button.textContent = label;
  button.setAttribute('aria-label', accessibleName);
  button.title = accessibleName;
  return button;
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

  // ---- header (SHELL item 1 / CR-003 Part 1 / TOOL-L1-008). Reading order:
  // branding -> title -> SS -> Load -> Save -> Light -> Dark -> Mono L -> Mono D ->
  // Base V -> Base I -> Undo -> Redo -> AI -> ?. The branding is pinned left, the
  // title centered, and every action control is appended to a right-aligned toolbar in
  // the canonical HEADER_CONTROL_ROLES order so the runtime layout can never drift
  // from the CR-003 contract (which a unit test asserts against the same constant).
  const header = document.createElement('header');
  header.dataset.role = 'app-header';
  header.className = APP_HEADER_CLASS;
  ensureHeaderMenuStylesheet(document);

  const headerLeft = document.createElement('div');
  headerLeft.className = 'grsch-header-left';

  // CR-006 Part 1 / Part 2: the two LEFT-edge controls placed to the LEFT of the
  // branding block, built in the canonical HEADER_LEFT_CONTROL_ROLES order via a
  // role -> element lookup (mirroring the right toolbar) so the DOM order can never
  // drift from the constant a unit test asserts against. [Fit] frames the whole
  // schedule; [P] shows / minimizes the floating palette.
  const headerFitButton = makeHeaderButton('grsch-file-btn', 'Fit', uiLabel('fit_to_content'), 'header-fit');
  const headerPaletteToggleButton = makeHeaderButton(
    'grsch-file-btn',
    'P',
    uiLabel('palette_toggle'),
    'header-palette-toggle',
  );
  headerPaletteToggleButton.setAttribute('aria-pressed', 'true');
  const headerLeftControlByRole = new Map<string, HTMLElement>([
    ['header-fit', headerFitButton],
    ['header-palette-toggle', headerPaletteToggleButton],
  ]);
  for (const role of HEADER_LEFT_CONTROL_ROLES) {
    const control = headerLeftControlByRole.get(role);
    if (control === undefined) {
      throw new Error(`Header build error: no left control for role "${role}"`);
    }
    headerLeft.appendChild(control);
  }

  // Branding block (left): TWO lines -- a larger product name, then a concise
  // copyright / license line that links to the GitHub repository (item 6).
  const brandingBlock = document.createElement('div');
  brandingBlock.className = 'grsch-header-branding';
  brandingBlock.dataset.role = 'app-branding';
  const brandName = document.createElement('span');
  brandName.className = 'grsch-brand-name';
  brandName.textContent = 'GR Scheduler';
  const brandLink = document.createElement('a');
  brandLink.className = 'grsch-brand-line';
  brandLink.dataset.role = 'app-repo-link';
  brandLink.textContent = '(c) GoodRelax. Apache License 2.0';
  brandLink.href = 'https://github.com/GoodRelax/gr-scheduler';
  brandLink.target = '_blank';
  brandLink.rel = 'noopener noreferrer';
  brandingBlock.append(brandName, brandLink);
  headerLeft.append(brandingBlock);

  // Centered document title (project name).
  const scheduleNameLabel = document.createElement('span');
  scheduleNameLabel.className = 'grsch-schedule-name';
  scheduleNameLabel.dataset.role = 'schedule-name';
  scheduleNameLabel.textContent = 'gr-scheduler';

  // SS: copy the CURRENT viewport image to the clipboard (CR-006 Part 3; falls back to
  // a PNG download when the clipboard is unavailable). Distinct from Save PNG, which is
  // the full-canvas fixed export.
  const ssButton = makeHeaderButton('grsch-file-btn', 'SS', 'Copy viewport image to clipboard', 'screenshot');

  // Load / Save dropdown menus (CR-003 Part 1). Load = JSON / XML import + JSON as a
  // baseline reference + New (clear all). Save = JSON / XML / SVG / PNG export.
  const loadMenu = createHeaderMenu({
    label: 'Load',
    accessibleName: 'Load a schedule',
    triggerRole: 'load',
    items: LOAD_MENU_ITEMS,
  });
  const saveMenu = createHeaderMenu({
    label: 'Save',
    accessibleName: 'Save the schedule',
    triggerRole: 'save',
    items: SAVE_MENU_ITEMS,
  });

  // Four-mode theme selector (item 3 / CR-003 Part 1): Light / Dark / Mono L / Mono D
  // as an exclusive segmented control (radio semantics). Each carries a unique role so
  // it can be ordered by HEADER_CONTROL_ROLES.
  const themeModeButtons: HTMLButtonElement[] = THEME_BUTTON_SPECS.map((spec) => {
    // Exclusive segmented toggle (aria-pressed) rather than a radiogroup: the four
    // buttons live directly in the header toolbar, not in a role="radiogroup" wrapper.
    const button = makeHeaderButton('grsch-theme-btn', spec.label, spec.accessibleName, spec.role);
    button.dataset.themeMode = spec.mode;
    button.setAttribute('aria-pressed', 'false');
    return button;
  });

  // Base V / Base I: baseline reference visibility (CR-002 Part 3 / PLAN-L1-004),
  // promoted from the temporary IM3 palette controls. Base V shows the grey baseline
  // underlay; Base I hides it -- a two-button segmented control (aria-pressed reflects
  // the active state).
  const baselineShowButton = makeHeaderButton('grsch-theme-btn', 'Base V', 'Show baseline reference', 'baseline-visible');
  baselineShowButton.setAttribute('aria-pressed', 'false');
  const baselineHideButton = makeHeaderButton('grsch-theme-btn', 'Base I', 'Hide baseline reference', 'baseline-invisible');
  baselineHideButton.setAttribute('aria-pressed', 'false');

  // Undo / Redo (SHELL item 4) with PowerPoint-like circular-arrow glyphs.
  const undoButton = makeHeaderButton('grsch-undo-redo-btn', '↶', 'Undo', 'undo');
  const redoButton = makeHeaderButton('grsch-undo-redo-btn', '↷', 'Redo', 'redo');
  const aiButton = makeHeaderButton('grsch-header-btn', 'AI', 'AI schedule import helper', 'open-ai');
  aiButton.setAttribute('aria-haspopup', 'dialog');
  const helpButton = makeHeaderButton('grsch-header-btn', '?', 'Help', 'open-help');
  helpButton.setAttribute('aria-haspopup', 'dialog');

  // Right-aligned toolbar: append every control in the canonical CR-003 order via a
  // role -> element lookup so the DOM order equals HEADER_CONTROL_ROLES exactly.
  const headerActions = document.createElement('div');
  headerActions.className = 'grsch-header-actions';
  headerActions.dataset.role = 'header-actions';
  headerActions.setAttribute('role', 'toolbar');
  headerActions.setAttribute('aria-label', 'Header actions');
  const controlByRole = new Map<string, HTMLElement>([
    ['screenshot', ssButton],
    ['load', loadMenu.trigger],
    ['save', saveMenu.trigger],
    ...themeModeButtons.map((button) => [button.dataset.role ?? '', button] as [string, HTMLElement]),
    ['baseline-visible', baselineShowButton],
    ['baseline-invisible', baselineHideButton],
    ['undo', undoButton],
    ['redo', redoButton],
    ['open-ai', aiButton],
    ['open-help', helpButton],
  ]);
  for (const role of HEADER_CONTROL_ROLES) {
    const control = controlByRole.get(role);
    if (control === undefined) {
      throw new Error(`Header build error: no control for role "${role}"`);
    }
    headerActions.appendChild(control);
  }

  // Kept for the internal benchmark status path (fix 9): a detached label the
  // benchmark harness writes progress into; no longer shown in the header.
  const statusLabel = document.createElement('span');
  statusLabel.className = 'grsch-header-hint';
  statusLabel.textContent = STATUS_HINT;

  header.append(headerLeft, scheduleNameLabel, headerActions);

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
  // Active-state hint for click-to-pick link mode (item 4): a polite status text
  // shown only while the mode is on. It is ABSOLUTELY positioned below the palette
  // (out of the flex flow) so toggling its visibility never reflows the palette
  // buttons (no-reflow requirement): the palette's button positions are identical
  // whether link mode is off or on.
  const linkHint = document.createElement('span');
  linkHint.dataset.role = 'link-hint';
  linkHint.className = 'grsch-cmd-group-label grsch-link-hint';
  linkHint.setAttribute('role', 'status');
  linkHint.setAttribute('aria-live', 'polite');
  linkHint.style.position = 'absolute';
  linkHint.style.top = '100%';
  linkHint.style.left = '6px';
  linkHint.style.marginTop = '3px';
  linkHint.style.visibility = 'hidden';
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
  boxButton.setAttribute('aria-pressed', 'false');

  // Progress line (イナズマ線) show/hide toggle (CR-006 Part 5), placed right of the
  // cursor-guide buttons. The default is HIDDEN (progressLineVisible defaults false), so
  // aria-pressed starts false; wirePaletteProgressLine seeds the true state from view state.
  const progressLineButton = makeCommandButton('⚡', uiLabel('progress_line'));
  // Distinct role from the property-panel progress control (`toggle-progress-line`) so
  // the two never collide (CR-006 defect fix); both read/drive viewState.progressLineVisible.
  progressLineButton.dataset.role = 'palette-progress-line-toggle';
  progressLineButton.setAttribute('aria-pressed', 'false');

  // Plan/actual style segmented toggle (CR-006 Part 6): [Ao] Overlap / [As] Separate,
  // an exclusive radio group bound to viewState.planActualStyle (default 'overlap').
  const planActualStyleGroup = document.createElement('div');
  planActualStyleGroup.className = 'grsch-cmd-group';
  planActualStyleGroup.dataset.role = 'palette-plan-actual-style';
  planActualStyleGroup.setAttribute('role', 'radiogroup');
  planActualStyleGroup.setAttribute('aria-label', uiLabel('plan_actual_style'));
  const planActualStyleSpecs: ReadonlyArray<{
    style: 'overlap' | 'separate';
    glyph: string;
    labelKey: string;
  }> = [
    { style: 'overlap', glyph: 'Ao', labelKey: 'plan_actual_style_overlap' },
    { style: 'separate', glyph: 'As', labelKey: 'plan_actual_style_separate' },
  ];
  const planActualStyleButtons: HTMLButtonElement[] = planActualStyleSpecs.map(
    ({ style, glyph, labelKey }) => {
      const button = makeCommandButton(glyph, uiLabel(labelKey));
      button.dataset.role = 'plan-actual-style-mode';
      button.dataset.planActualStyle = style;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      planActualStyleGroup.appendChild(button);
      return button;
    },
  );

  // Assignee-name show/hide toggle (CR-006 Part 7): flips viewState.assigneeVisible
  // (CR-004 Part 5 renders the label). Default hidden, so aria-pressed starts false.
  const assigneeButton = makeCommandButton('@', uiLabel('assignee_display'));
  assigneeButton.dataset.role = 'palette-assignee-toggle';
  assigneeButton.setAttribute('aria-pressed', 'false');

  // The document export/import buttons (JSON / SVG / XML / Import) now live in the
  // header file-ops group (item 1). External icon-image import was withdrawn in
  // CR-004 Part 6a.

  // Watermark visibility toggle (TOOL-L1-007, TOOL-L2-001/003). The user-name input
  // was removed from the palette (item 8): the watermark uses the default name.
  const watermarkButton = makeCommandButton('©', uiLabel('watermark'));
  watermarkButton.setAttribute('aria-pressed', 'false');

  // Baseline reference controls now live in the header (CR-003 Part 1): Load ->
  // "JSON as baseline" loads the underlay, and Base V / Base I toggle its visibility.
  // The temporary IM3 palette buttons were removed (superseded).

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
  const fontButtons: HTMLButtonElement[] = (['S', 'M', 'L'] as FontScale[]).map((scale) => {
    const button = makeCommandButton(FONT_SCALE_GLYPHS[scale], fontScaleNames[scale]);
    button.dataset.fontScale = scale;
    return button;
  });

  // Functional grouping (fix 13): View | Show | Guides | Grid | Add | Marks |
  // Font, each a labelled group so related commands stay together when the toolbar
  // wraps. Document File I/O (JSON / SVG / XML / Import) and the theme selector now
  // live in the header; the shape picker (milestone + task, on one aligned row) is
  // injected by mountShapePicker before the save-status readout. The benchmark
  // button is intentionally omitted (fix 9).
  commandPalette.append(
    paletteDragHandle,
    minimizeButton,
    makeCommandGroup('View', [fitButton, fullscreenButton, propertiesToggleButton]),
    makeCommandGroup('Show', [planButton, actualButton, assigneeButton]),
    planActualStyleGroup,
    makeCommandGroup('Guides', [todayButton, linkButton]),
    cursorGuideGroup,
    makeCommandGroup('Line', [progressLineButton]),
    makeCommandGroup('Grid', [gridDateButton, gridCategoryButton]),
    makeCommandGroup('Add', [commentButton, boxButton]),
    makeCommandGroup('Marks', [watermarkButton]),
    makeCommandGroup('Font', fontButtons),
    saveStatusLabel,
  );
  // The link-mode hint is absolutely positioned relative to the palette, so it is
  // appended as a direct palette child (out of any group's flex flow).
  commandPalette.appendChild(linkHint);

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
    headerFitButton,
    headerPaletteToggleButton,
    helpButton,
    aiButton,
    undoButton,
    redoButton,
    themeModeButtons,
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
    progressLineButton,
    planActualStyleGroup,
    planActualStyleButtons,
    assigneeButton,
    ssButton,
    loadMenu,
    saveMenu,
    baselineShowButton,
    baselineHideButton,
    watermarkButton,
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
  // A genuinely new project gets a freshly minted UUID at the app boundary (the id
  // seam), rather than the template fixture's fixed id.
  const template = generateTemplateDocument(generateProjectId());
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
/**
 * Read-only handle exposing the canonical document JSON Schema (SSOT) on a
 * namespaced global. This keeps the machine-readable contract inside the single
 * self-contained HTML build (fully offline) and is the seam the future `[AI]`
 * action reads to surface / inline the schema. No network is involved.
 */
interface GrSchedulerGlobal {
  readonly documentSchema: Readonly<Record<string, unknown>>;
  readonly documentSchemaId: string;
}

/** Attach the canonical schema to `globalThis.grScheduler` (idempotent). */
function exposeDocumentContract(): void {
  const contract: GrSchedulerGlobal = {
    documentSchema: GR_SCHEDULER_DOCUMENT_SCHEMA,
    documentSchemaId: GR_SCHEDULER_DOCUMENT_SCHEMA_ID,
  };
  (globalThis as typeof globalThis & { grScheduler?: GrSchedulerGlobal }).grScheduler = contract;
}

function bootstrap(): void {
  const root = document.getElementById('app');
  if (root === null) {
    throw new Error('Bootstrap failed: #app host element not found');
  }
  // Publish the canonical document schema (SSOT) into the offline bundle for the
  // future AI-export action before any UI mounts.
  exposeDocumentContract();
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

  // The persisted font scale is applied to the three scoped targets (CR-005 Part 2):
  // the property panel below (once built), and the left pane on its first render
  // (it reads viewState.fontScale). The header + palette are intentionally excluded.

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
  const propertyPanel = new PropertyPanel(
    chrome.panelHost,
    store,
    () => setPropertiesPanelHidden(true),
    {
      initialWidth: renderer.getViewState().propertyPanelWidth,
      // Mirror the resized width into the live view state so it round-trips via JSON /
      // autosave (the same mechanism as the left pane width), without an undo entry.
      onWidthChange: (width) => {
        renderer.setViewState({ ...renderer.getViewState(), propertyPanelWidth: width });
      },
    },
  );
  // Apply the persisted font scale to the property panel (one of the three CR-005
  // targets); the left pane self-applies on its first render, and comments read the
  // scale during the SVG render pass.
  propertyPanel.setFontScale(store.getDocument().viewState.fontScale);

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

  wirePaletteChrome(root, chrome, renderer);
  wireProperties(chrome, controller, propertyPanel, setPropertiesPanelHidden);

  // The fixed, resizable left classification pane (frozen column) wires itself to
  // store + view-state changes (CANVAS-L1-006 / L2-001, SECT-L1-006).
  new LeftClassificationPane(chrome.stage, store, renderer);
  // Merge the shape/milestone/task picker INTO the one command palette (item: merge
  // the two palettes) so there is a single role="toolbar" and no overlap. Inserted
  // before the save-status readout so it stays last. Undo/Redo now live in the
  // header (SHELL item 4).
  mountShapePicker(
    chrome.commandPalette,
    { onArmShape: (shape) => controller.setPendingCreateShape(shape) },
    activeLocale,
    chrome.saveStatusLabel,
  );
  attachKeyboardShortcuts({ store, controller, clipboard });

  // Undo / Redo in the header (SHELL item 4): wired to the store commands, their
  // disabled state driven by the history availability on every document change.
  const syncHistoryButtons = (): void => {
    chrome.undoButton.disabled = !store.canUndo();
    chrome.redoButton.disabled = !store.canRedo();
  };
  chrome.undoButton.addEventListener('click', () => store.undo());
  chrome.redoButton.addEventListener('click', () => store.redo());
  syncHistoryButtons();

  // Help modal (SHELL item 2): the [?] button opens an accessible dialog listing
  // all features + shortcuts; the modal owns its own focus trap and Esc handling
  // (it stops propagation so the shell's Esc handler does not double-fire).
  // CR-010: the Help modal hosts a "Download GR Scheduler" button that re-fetches the
  // CLEAN delivered single-HTML app (never the edited DOM) and saves gr-scheduler.html.
  // A fetch failure (offline / file://) is harmless -- the user already holds the file --
  // so it is reported gently via the polite live region rather than thrown.
  const helpModal = new HelpModal(root, activeLocale, () => {
    void downloadDeliveredApp().then((downloaded) => {
      if (!downloaded) {
        announcer.announce(
          activeLocale === 'ja'
            ? 'アプリのダウンロードはオフラインでは利用できません（このファイルは既にお手元にあります）'
            : 'App download is unavailable offline; you already have this file',
        );
      }
    });
  });
  wireHelp(chrome, helpModal);
  // [AI] modal (SHELL item 5): copy-a-prompt+schema helper to obtain a GR Scheduler
  // JSON from an external AI. It reads the inlined SSOT schema from document-schema.
  const aiModal = new AiExportModal(root, undefined, activeLocale);
  chrome.aiButton.addEventListener('click', () => aiModal.open(chrome.aiButton));
  wireTheme(chrome, renderer, initialThemePreference);
  wireEscHandling(controller, propertyPanel, helpModal, aiModal, setPropertiesPanelHidden);

  // Screen-reader-only keyboard help, referenced by the canvas via aria-describedby
  // so a focused canvas announces how to operate it (WCAG 2.1.1 discoverability).
  const canvasHelp = document.createElement('p');
  canvasHelp.id = 'grsch-canvas-help';
  canvasHelp.className = VISUALLY_HIDDEN_CLASS;
  canvasHelp.textContent = uiLabel('canvas_keyboard_help', activeLocale);
  wireCanvasAccessibility(root, chrome, renderer, controller, store, announcer, canvasHelp, locale);

  syncScheduleName(chrome, store);
  wireToolbarLocalization(chrome, locale);
  wireFontScale(chrome, renderer, store, propertyPanel);
  wireWatermark(chrome, renderer, locale);
  wireWatermarkTimestamp(store, renderer);
  wireDependencyLinkMode(chrome, controller, locale);
  wirePlanActual(chrome, renderer, locale);
  wireFit(chrome, renderer);
  wireFullscreen(chrome, locale);
  wireTodayLine(chrome, renderer, locale);
  wireProgressLine(chrome, propertyPanel, renderer);
  wirePlanActualStyle(chrome, renderer);
  wireAssigneeToggle(chrome, renderer);
  wireCursorGuide(chrome, renderer);
  wireGridToggles(chrome, renderer, locale);
  wireAnnotationCreation(chrome, store, renderer, controller);
  wireStoreSubscriptions(
    store,
    renderer,
    controller,
    propertyPanel,
    syncHistoryButtons,
    setPropertiesPanelHidden,
  );

  wireInputOutput(root, chrome, renderer, store, announcer);
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
function wirePaletteChrome(root: HTMLElement, chrome: Chrome, renderer: SvgRenderer): void {
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
    // CR-006 Part 2: keep the header [P] toggle in lock-step with the palette [-] so a
    // minimize from EITHER control updates both. aria-pressed=false (inactive / color
    // change) when minimized advertises that the palette is hidden; aria-expanded mirrors
    // the visibility so assistive tech reads the same state as the palette's own button.
    chrome.headerPaletteToggleButton.setAttribute('aria-pressed', minimized ? 'false' : 'true');
    chrome.headerPaletteToggleButton.setAttribute('aria-expanded', minimized ? 'false' : 'true');
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
  // Header [P] toggles the SAME state, so the two controls stay bidirectionally synced.
  chrome.headerPaletteToggleButton.addEventListener('click', togglePaletteMinimized);
  // Header [Fit] frames the whole schedule -- the same action as the palette Fit (Part 1).
  chrome.headerFitButton.addEventListener('click', () => renderer.fitToContent());
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
 * Wire the four-mode theme selector (SHELL item 3): Light / Dark / Mono-Light /
 * Mono-Dark as an exclusive segmented control. The chosen mode is applied to the
 * document root (`data-theme`), persisted in localStorage AND mirrored into the
 * document view state so it round-trips on export. The OS `prefers-color-scheme`
 * still drives the initial look until the user first chooses (preference 'system').
 */
function wireTheme(
  chrome: Chrome,
  renderer: SvgRenderer,
  initialThemePreference: ThemePreference,
): void {
  let themeMode: ThemeMode = resolveThemeMode(initialThemePreference);
  const syncThemeButtons = (): void => {
    for (const button of chrome.themeModeButtons) {
      button.setAttribute('aria-pressed', button.dataset.themeMode === themeMode ? 'true' : 'false');
    }
  };
  syncThemeButtons();
  for (const button of chrome.themeModeButtons) {
    button.addEventListener('click', () => {
      const nextMode = (button.dataset.themeMode ?? 'light') as ThemeMode;
      // An explicit mode is stored verbatim as the preference (it beats the OS media
      // query); the four buttons never select 'system'.
      themeMode = applyThemePreference(document, nextMode);
      writeStoredThemePreference(nextMode);
      renderer.setViewState({ ...renderer.getViewState(), themePreference: nextMode });
      syncThemeButtons();
    });
  }
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
  aiModal: AiExportModal,
  setPropertiesPanelHidden: (hidden: boolean) => void,
): void {
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (helpModal.isOpen() || aiModal.isOpen()) {
      // The modal's own handler already closed it and stopped propagation; guard
      // anyway so the panel-close branch never runs while a modal is up.
      return;
    }
    // Esc disarms dependency link mode FIRST (item 5), taking priority over the
    // gesture-cancel / panel-close / browser-release rules below.
    if (controller.isLinkMode()) {
      controller.setLinkMode(false);
      event.preventDefault();
      return;
    }
    if (
      controller.isGestureInProgress() ||
      controller.hasArmedShape() ||
      controller.isBoxPlacementArmed()
    ) {
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
    localizeCommandName(chrome.benchButton, 'run_benchmark', loc);
    localizeCommandName(chrome.fitButton, 'fit_to_content', loc);
    localizeCommandName(chrome.commentButton, 'add_comment', loc);
    localizeCommandName(chrome.boxButton, 'add_box', loc);
    chrome.saveStatusLabel.setAttribute('aria-label', uiLabel('autosave_status', loc));
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
  store: ScheduleStore,
  propertyPanel: PropertyPanel,
): void {
  const syncFontButtons = (scale: FontScale): void => {
    for (const button of chrome.fontButtons) {
      button.setAttribute('aria-pressed', button.dataset.fontScale === scale ? 'true' : 'false');
    }
  };
  syncFontButtons(store.getDocument().viewState.fontScale);
  for (const button of chrome.fontButtons) {
    button.addEventListener('click', () => {
      // Validate the untrusted dataset value rather than an unchecked assertion (L-3).
      const scale = toFontScale(button.dataset.fontScale);
      // The scale reaches its three CR-005 targets. The left pane updates SYNCHRONOUSLY
      // via the renderer's onViewStateChange listener and the property panel is updated
      // directly here; the canvas comment bodies are drawn by the SVG overlay, whose
      // re-render setViewState only SCHEDULES on the next animation frame. A discrete
      // font-scale click must update all three in lock-step, so applyCanvasFontScale
      // forces an immediate synchronous canvas re-render (renderNow) -- otherwise the
      // comment text keeps the scale from the previous render while the left pane already
      // shows the new size (the CR-005 Part 4 live defect). Header + palette are untouched.
      applyCanvasFontScale(renderer, scale);
      propertyPanel.setFontScale(scale);
      syncFontButtons(scale);
    });
  }
}

/**
 * Wire the watermark on/off toggle (TOOL-L1-007, TOOL-L2-003). Kept in view state
 * so it round-trips on export without polluting Undo/Redo. The mark is shown by
 * DEFAULT (resolveWatermark treats an absent value as an enabled "GoodRelax" mark)
 * with the default name (the palette user-name input was removed, item 8); hiding it
 * requires the password (only the hash is ever kept; client-side gating is a soft
 * deterrent only, security-design §6).
 *
 * The evidence UTC time is NOT stamped here: toggling visibility keeps the last
 * content-change time (CR-009 Part 3). Re-stamping is owned by
 * {@link wireWatermarkTimestamp}, driven by the store's content-change signal.
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
  chrome.watermarkButton.addEventListener('click', () => {
    const base = currentWatermark();
    if (!base.enabled) {
      // Turning the mark ON needs no password; keep the current user name AND the
      // last content-change UTC time (the toggle is NOT a content change, CR-009
      // Part 3), so showing/hiding never rewrites the evidence timestamp.
      applyWatermark({
        ...base,
        enabled: true,
        userName: base.userName || DEFAULT_WATERMARK_TEXT,
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
  syncWatermarkButton();
  locale.onChange(syncWatermarkButton);
}

/**
 * Wire the evidence watermark's MANDATORY UTC time (CR-009 Part 2 / Part 3,
 * DEC-005 #3). The timestamp answers "as of when is this the chart's content?", so
 * it is re-stamped ONLY when the document CONTENT changes -- an edit command, an
 * undo or a redo -- surfaced by the store's {@link ScheduleStore.onContentChange}
 * signal. It is deliberately NOT re-stamped on viewport-only changes (zoom / scroll
 * / pan never flow through the store) nor on the show/hide toggle alone (that goes
 * straight to the renderer's view state, not the store).
 *
 * Recursion safety: the re-stamp writes the time into the RENDERER's view state via
 * {@link SvgRenderer.setViewState}, entirely outside the undoable command flow. It
 * never dispatches a command, so it can never itself count as a content change and
 * cannot loop -- one content mutation yields exactly one re-stamp.
 *
 * A one-time seed stamps the current UTC time immediately so the default-ON mark
 * carries a time before the first edit; that seeded value is then stable across
 * zoom / scroll until the next content change.
 */
function wireWatermarkTimestamp(store: ScheduleStore, renderer: SvgRenderer): void {
  // One-time seed: pin a concrete UTC time into the initial document's mark so it is
  // stable across zoom / scroll from the first paint (an existing time is preserved).
  materializeWatermarkTimestamp(renderer);
  // Re-stamp to NOW on every content change (dispatch / undo / redo). This
  // unconditionally overwrites the time, unlike the seed above.
  store.onContentChange(() => {
    const viewState = renderer.getViewState();
    const resolved = resolveWatermark(viewState.watermark);
    renderer.setViewState({
      ...viewState,
      watermark: { ...resolved, timestamp: formatWatermarkTimestampUtc(Date.now()) },
    });
  });
}

/**
 * Pin the renderer watermark's mandatory UTC time ONCE for a freshly adopted document
 * (bootstrap seed OR import, CR-009 Part 2 / Part 3), writing a CONCRETE value into
 * the renderer view state so {@link resolveWatermark} returns it verbatim on every
 * later render -- stable across zoom / scroll. Without this, an imported document with
 * a completely absent `watermark` field would make {@link resolveWatermark} read the
 * clock every render and zooming would change the UTC. An imported chart that already
 * carries a real evidence time keeps it (see {@link materializeWatermark}).
 */
function materializeWatermarkTimestamp(renderer: SvgRenderer): void {
  const viewState = renderer.getViewState();
  renderer.setViewState({
    ...viewState,
    watermark: materializeWatermark(viewState.watermark),
  });
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
    // Keep the toggle button in sync so Esc-disarm (item 5) also un-presses it.
    syncLinkButton(state.enabled);
    if (!state.enabled) {
      // Reserved-space hint: toggle VISIBILITY (not display) and keep it absolutely
      // positioned so the palette buttons never reflow (no-reflow requirement).
      chrome.linkHint.style.visibility = 'hidden';
      chrome.linkHint.textContent = '';
      return;
    }
    chrome.linkHint.style.visibility = 'visible';
    if (state.rejectedReason === 'plan-actual-mismatch') {
      // Subtle hint (item 5): a plan<->actual pick is not linkable; keep the source armed.
      chrome.linkHint.textContent =
        'Dependency link: plan and actual cannot be linked -- pick a matching target';
      return;
    }
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
 * Wire BOTH progress-line (イナズマ線) show/hide controls (CR-006 Part 5) against the
 * single shared `viewState.progressLineVisible` flag: the palette `[⚡]` toggle
 * (`palette-progress-line-toggle`) and the property-panel control (color + shown/hidden,
 * `toggle-progress-line`). Flipping EITHER updates the flag, forces an IMMEDIATE canvas
 * re-render (renderNow, since setViewState only schedules an rAF that a throttled tab may
 * defer) and re-syncs BOTH controls so they never drift. The default is HIDDEN (absent =
 * not drawn); labels are English (SHELL item 5). The color input lives in the panel only.
 */
function wireProgressLine(
  chrome: Chrome,
  propertyPanel: PropertyPanel,
  renderer: SvgRenderer,
): void {
  const currentVisible = (): boolean =>
    isProgressLineVisible(renderer.getViewState().progressLineVisible);
  const syncPaletteButton = (): void => {
    chrome.progressLineButton.setAttribute('aria-pressed', currentVisible() ? 'true' : 'false');
  };
  // Both controls route through one applier so a click on either flips the flag, repaints
  // the canvas synchronously and refreshes the two controls in lock-step.
  const applyVisible = (visible: boolean): void => {
    renderer.setViewState({ ...renderer.getViewState(), progressLineVisible: visible });
    renderer.renderNow();
    syncPaletteButton();
    panelControls.sync();
  };
  const panelControls = propertyPanel.attachProgressLineControls({
    isVisible: currentVisible,
    getColor: () => renderer.getViewState().progressLineColor ?? DEFAULT_PROGRESS_LINE_COLOR,
    onToggle: (visible) => applyVisible(visible),
    onColor: (color) => {
      renderer.setViewState({ ...renderer.getViewState(), progressLineColor: color });
      renderer.renderNow();
    },
    label: uiLabel('progress_line', 'en'),
    colorLabel: uiLabel('progress_line_color', 'en'),
  });
  chrome.progressLineButton.addEventListener('click', () => {
    applyVisible(!currentVisible());
  });
  syncPaletteButton();
}

/**
 * Wire the [Ao] Overlap / [As] Separate plan-actual style toggle (CR-006 Part 6), an
 * exclusive radio group bound to viewState.planActualStyle. The default stays 'overlap'
 * (PLAN-L1-005); switching re-renders the plan/actual geometry without an undo entry.
 */
function wirePlanActualStyle(chrome: Chrome, renderer: SvgRenderer): void {
  const syncButtons = (style: 'overlap' | 'separate'): void => {
    for (const button of chrome.planActualStyleButtons) {
      button.setAttribute(
        'aria-checked',
        button.dataset.planActualStyle === style ? 'true' : 'false',
      );
    }
  };
  for (const button of chrome.planActualStyleButtons) {
    button.addEventListener('click', () => {
      const style = button.dataset.planActualStyle === 'separate' ? 'separate' : 'overlap';
      renderer.setViewState({ ...renderer.getViewState(), planActualStyle: style });
      // Repaint synchronously so the plan/actual geometry switches immediately (a
      // throttled tab may otherwise defer the scheduled rAF).
      renderer.renderNow();
      syncButtons(style);
    });
  }
  syncButtons(resolvePlanActualStyle(renderer.getViewState().planActualStyle));
}

/**
 * Wire the assignee-name show/hide palette toggle (CR-006 Part 7). Bound to
 * viewState.assigneeVisible (CR-004 Part 5 draws the label to the LEFT of each glyph);
 * default HIDDEN, so aria-pressed reflects only an explicit `true`.
 */
function wireAssigneeToggle(chrome: Chrome, renderer: SvgRenderer): void {
  const syncButton = (visible: boolean): void => {
    chrome.assigneeButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
  };
  chrome.assigneeButton.addEventListener('click', () => {
    const visible = renderer.getViewState().assigneeVisible !== true;
    renderer.setViewState({ ...renderer.getViewState(), assigneeVisible: visible });
    // Repaint synchronously so assignee names appear/disappear immediately.
    renderer.renderNow();
    syncButton(visible);
  });
  syncButton(renderer.getViewState().assigneeVisible === true);
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
  // CR-006 Part 8: Add Box no longer drops a box at a default position; instead it ARMS
  // 2-click rectangle placement (PowerPoint-like): the next canvas click sets the
  // top-left corner and the following click the bottom-right, then the controller hands
  // back the normalized rect (single-section clamped) and this callback dispatches the
  // undoable create with the box's styling. The screen-space corner radius is unchanged
  // (CURS-L2-001). Esc cancels (wireEscHandling -> cancelActiveGesture).
  const placeRoundedBox = (rect: RoundedBoxRect): void => {
    store.dispatch(
      createRoundedBoxCommand({
        id: `box-${Date.now()}`,
        annotationKind: 'rounded-box',
        startDate: rect.startDate,
        endDate: rect.endDate,
        topRowIndex: rect.topRowIndex,
        bottomRowIndex: rect.bottomRowIndex,
        strokeColor: CUD_GREEN_ACCENT_HEX,
        cornerRadiusPx: 10,
      }),
    );
  };
  chrome.boxButton.addEventListener('click', () => {
    if (controller.isBoxPlacementArmed()) {
      // A second press on Add Box cancels the pending placement (toggle affordance).
      controller.cancelBoxPlacement();
      return;
    }
    controller.armBoxPlacement(placeRoundedBox);
  });
  // Reflect the armed state on the Add Box button so the user sees placement is active.
  controller.onBoxPlacementChange((armed) => {
    chrome.boxButton.setAttribute('aria-pressed', armed ? 'true' : 'false');
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
  syncHistoryButtons: () => void,
  setPropertiesPanelHidden: (hidden: boolean) => void,
): void {
  store.subscribe((scheduleDocument) => {
    renderer.updateItems(scheduleDocument);
    syncHistoryButtons();
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
  syncHistoryButtons();
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

/** Wire file-ops toolbar buttons and localStorage autosave (IO-L1-004/005). */
function wireInputOutput(
  root: HTMLElement,
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
    // Pin the mandatory watermark UTC time ONCE for the adopted document (CR-009):
    // an import (or clear) is not a content-change re-stamp, but its mark must carry a
    // concrete, stable timestamp -- otherwise an import with a completely absent
    // watermark field would make resolveWatermark read the clock every render and zoom
    // would change the UTC. An imported chart's own evidence time is preserved.
    materializeWatermarkTimestamp(renderer);
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

  chrome.saveMenu.item('save-json').addEventListener('click', () => {
    const stem = toFileStem(store.getDocument().title);
    downloadTextFile(`${stem}.json`, 'application/json', serializeScheduleDocument(documentForExport(), true));
  });

  chrome.saveMenu.item('save-xml').addEventListener('click', () => {
    const stem = toFileStem(store.getDocument().title);
    // Best-effort baseline (CR-002 Part 3 / DATA-MSPDI-003): pass the currently loaded
    // baseline reference (runtime renderer state, never merged into the document) so
    // matched tasks emit Baseline0 Start/Finish. Absent baseline => no Baseline output.
    const baselineDocument = renderer.getBaselineDocument() ?? undefined;
    downloadTextFile(
      `${stem}.xml`,
      'application/xml',
      exportMspdi(documentForExport(), baselineDocument),
    );
  });

  // Build the self-contained export SVG (with the evidence watermark when enabled).
  // Shared by SVG export, PNG export and Screen Copy so all three are identical and
  // theme-independent (colors baked in, not CSS variables). resolveWatermark applies
  // the default-ON "GoodRelax" mark for a document that never set one.
  const buildExportSvg = (): string => {
    const watermark = resolveWatermark(renderer.getViewState().watermark);
    return exportScheduleSvg(
      documentForExport(),
      watermark.enabled
        ? { watermark: { userName: watermark.userName, timestamp: watermark.timestamp } }
        : {},
    );
  };

  // Save SVG (CR-003 Part 1): the FULL-canvas fixed export (distinct from SS).
  chrome.saveMenu.item('save-svg').addEventListener('click', () => {
    const stem = toFileStem(store.getDocument().title);
    downloadTextFile(`${stem}.svg`, 'image/svg+xml', buildExportSvg());
  });

  // Save PNG (CR-003 Part 1): rasterize the FULL-canvas self-contained SVG and download.
  chrome.saveMenu.item('save-png').addEventListener('click', () => {
    const stem = toFileStem(store.getDocument().title);
    void rasterizeSvgToPng(buildExportSvg()).then(
      (blob) => downloadPngBlob(`${stem}.png`, blob),
      (error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        log.error('png_export_failed', { reason });
        announcer.announce(`PNG export failed: ${reason}`);
      },
    );
  });

  // SS (CR-003 Part 1 / CR-006 Part 3): capture the CURRENT viewport -- exactly what is
  // on screen (scroll / zoom / virtualized subset), NOT the full canvas -- and COPY it to
  // the clipboard as a PNG image so it can be pasted straight into PowerPoint etc. When
  // the browser cannot write images to the clipboard (unsupported / permission denied),
  // it transparently FALLS BACK to a PNG download and announces that instead (toast).
  chrome.ssButton.addEventListener('click', () => {
    const stem = toFileStem(store.getDocument().title);
    let viewportSvg: string;
    try {
      viewportSvg = buildViewportCaptureSvg(renderer.getSvgElement(), document);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      log.error('screenshot_capture_failed', { reason });
      announcer.announce(`Screenshot failed: ${reason}`);
      return;
    }
    void rasterizeSvgToPng(viewportSvg)
      .then((blob) => copyPngToClipboardOrDownload(blob, `${stem}-viewport.png`))
      .then((outcome) => {
        announcer.announce(
          outcome === 'clipboard'
            ? 'Viewport image copied to the clipboard'
            : 'Clipboard image copy is unavailable; saved the viewport as a PNG download instead',
        );
      })
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        log.error('screenshot_failed', { reason });
        announcer.announce(`Screenshot failed: ${reason}`);
      });
  });

  // Load -> New (clear all): reset the document to a fresh empty state, but only after
  // a confirm dialog. This is a HARD reset (via replaceDocument, which clears the
  // Undo/Redo history) -- the confirmation is the safeguard.
  chrome.loadMenu.item('new-clear').addEventListener('click', () => {
    openAllClearDialog({
      host: root,
      trigger: chrome.loadMenu.trigger,
      onConfirm: () => {
        adoptDocument(generateEmptyDocument(generateProjectId()));
        announcer.announce('Schedule cleared');
      },
    });
  });

  // Load -> JSON / XML: import a document (IO-L1-006 sanitizes untrusted input).
  const importWithAccept = (accept: string): void => {
    void (async (): Promise<void> => {
      try {
        const file = await pickFile(accept);
        if (file === null) {
          return;
        }
        const result = await importDocumentFile(file);
        adoptDocument(result.document);
      } catch (error) {
        reportImportFailure(error);
      }
    })();
  };
  chrome.loadMenu.item('load-json').addEventListener('click', () => {
    importWithAccept('.json,application/json');
  });
  chrome.loadMenu.item('load-xml').addEventListener('click', () => {
    importWithAccept('.xml,application/xml');
  });

  // Baseline reference (CR-002 Part 3 / PLAN-L1-004, CR-003 Part 1): Load -> "JSON as
  // baseline" imports a JSON past-plan snapshot as a grey, read-only underlay held in
  // RUNTIME renderer state (never merged into the edited document / autosave / export).
  // The Base V / Base I header buttons are a two-button segmented visibility control,
  // independent of the plan/actual display filter.
  const syncBaselineVisibleButtons = (): void => {
    const visible = renderer.isBaselineVisible();
    chrome.baselineShowButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
    chrome.baselineHideButton.setAttribute('aria-pressed', visible ? 'false' : 'true');
  };
  chrome.loadMenu.item('load-json-baseline').addEventListener('click', () => {
    void (async (): Promise<void> => {
      try {
        const file = await pickFile('.json,application/json');
        if (file === null) {
          return;
        }
        const result = await importBaselineDocumentFile(file);
        renderer.setBaselineDocument(result.document);
        renderer.setBaselineVisible(true);
        syncBaselineVisibleButtons();
        announcer.announce('Baseline reference loaded');
      } catch (error) {
        reportImportFailure(error);
      }
    })();
  });
  chrome.baselineShowButton.addEventListener('click', () => {
    renderer.setBaselineVisible(true);
    syncBaselineVisibleButtons();
  });
  chrome.baselineHideButton.addEventListener('click', () => {
    renderer.setBaselineVisible(false);
    syncBaselineVisibleButtons();
  });
  syncBaselineVisibleButtons();

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
