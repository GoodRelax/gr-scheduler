/**
 * Adapter layer: the shape/milestone/task picker, injected INTO the single merged
 * command palette (ARCH-C-030, TOOL-L1-001).
 *
 * The app previously showed TWO floating panels -- the command palette and a
 * separate shape "Tools" palette -- which overlapped and were hard to read (user
 * feedback). They are now ONE palette: this module appends the shape-arming
 * controls (milestone / task pickers), the armed-state readout and the Undo/Redo
 * buttons as additional command groups inside the existing command toolbar, so
 * there is a single `role="toolbar"` landmark and no overlap. It owns no position,
 * translucency, role or drag behavior -- those belong to the host palette.
 *
 * - i18n labels (PROP-L1-003): captions/buttons localize to the active UI locale;
 *   {@link ToolPaletteHandle.setLocale} re-localizes in place.
 * - Icon-only shape buttons carry a localized accessible name + tooltip so their
 *   purpose is conveyed without text (WCAG 1.1.1 / 4.1.2, NFR-L1-005).
 */

import type { Locale, MilestoneShape, TaskShape } from '../../domain/model/schedule-model.js';
import type { PendingCreateShape } from '../input/editing-controller.js';
import { uiLabel } from '../../domain/usecase/i18n.js';
import { paletteShapeAccessibleName } from '../../domain/usecase/accessible-name.js';

/** Callbacks the palette invokes on user action. */
export interface ToolPaletteHandlers {
  readonly onArmShape: (shape: PendingCreateShape) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

/** The control surface returned by {@link mountShapePicker}. */
export interface ToolPaletteHandle {
  /** Enable/disable the Undo/Redo buttons from the store's history state. */
  readonly updateHistoryState: (canUndo: boolean, canRedo: boolean) => void;
  /** Re-localize all shape-picker text to a new active UI locale (PROP-L1-003). */
  readonly setLocale: (locale: Locale) => void;
}

/** Milestone shapes offered by the palette (subset the renderer can draw). */
const MILESTONE_CHOICES: ReadonlyArray<{ shape: MilestoneShape; glyph: string }> = [
  { shape: 'circle', glyph: 'O' },
  { shape: 'triangle', glyph: 'Δ' },
  { shape: 'square', glyph: '□' },
  { shape: 'diamond', glyph: '◇' },
  { shape: 'star', glyph: '★' },
];

/** Task shapes offered by the palette. */
const TASK_CHOICES: ReadonlyArray<{ shape: TaskShape; glyph: string }> = [
  { shape: 'bar', glyph: '▭' },
  { shape: 'arrow', glyph: '→' },
  { shape: 'chevron', glyph: '»' },
];

/**
 * Append the shape-picker command groups into an existing command palette.
 *
 * @param container - The merged command palette element (already `role="toolbar"`).
 * @param handlers - Action callbacks.
 * @param initialLocale - The UI locale to render labels in (defaults to 'en').
 * @param beforeNode - Optional child to insert the groups before (keeps the
 *   save-status readout last); appended at the end when omitted.
 * @returns A {@link ToolPaletteHandle}.
 */
export function mountShapePicker(
  container: HTMLElement,
  handlers: ToolPaletteHandlers,
  initialLocale: Locale = 'en',
  beforeNode: Node | null = null,
): ToolPaletteHandle {
  let locale: Locale = initialLocale;
  /** Registered re-localizers, invoked on every locale change. */
  const localizers: Array<(active: Locale) => void> = [];

  const armedLabel = document.createElement('span');
  armedLabel.dataset.role = 'armed-readout';
  armedLabel.className = 'grsch-armed-readout';
  /** The armed selection as an i18n-agnostic descriptor, or null for none. */
  let armedText: string | null = null;
  const refreshArmedLabel = (active: Locale): void => {
    const value = armedText ?? uiLabel('none', active);
    armedLabel.textContent = `${uiLabel('armed', active)}: ${value}`;
  };
  localizers.push(refreshArmedLabel);
  const setArmed = (text: string | null): void => {
    armedText = text;
    refreshArmedLabel(locale);
  };

  const milestoneGroup = makeShapeGroup('milestone', MILESTONE_CHOICES, localizers, (shape) => {
    handlers.onArmShape({ itemKind: 'milestone', milestoneShape: shape });
    setArmed(`${uiLabel('milestone', locale)} ${shape}`);
  });
  const taskGroup = makeShapeGroup('task', TASK_CHOICES, localizers, (shape) => {
    handlers.onArmShape({ itemKind: 'task', taskShape: shape });
    setArmed(`${uiLabel('task', locale)} ${shape}`);
  });

  const historyGroup = makeGroup('');
  const undoButton = makeButton('', handlers.onUndo);
  const redoButton = makeButton('', handlers.onRedo);
  localizers.push((active) => {
    undoButton.textContent = uiLabel('undo', active);
    redoButton.textContent = uiLabel('redo', active);
  });
  historyGroup.append(undoButton, redoButton);

  const armedGroup = makeGroup('');
  armedGroup.appendChild(armedLabel);

  // Fix 13: keep the milestone-shape icons and the task-shape icons on ONE aligned
  // row by wrapping both shape groups in a single non-wrapping flex container, so
  // they always share the same height instead of drifting onto separate lines.
  const shapesRow = document.createElement('div');
  shapesRow.className = 'grsch-cmd-group';
  shapesRow.dataset.role = 'shape-groups';
  shapesRow.style.flexWrap = 'nowrap';
  shapesRow.append(milestoneGroup, taskGroup);

  const groups = [shapesRow, armedGroup, historyGroup];
  for (const group of groups) {
    container.insertBefore(group, beforeNode);
  }

  // Initial localization pass.
  for (const localize of localizers) {
    localize(locale);
  }

  return {
    updateHistoryState: (canUndo, canRedo) => {
      undoButton.disabled = !canUndo;
      redoButton.disabled = !canRedo;
    },
    setLocale: (next) => {
      locale = next;
      for (const localize of localizers) {
        localize(next);
      }
    },
  };
}

/** Build a labelled command group using the command palette's group styling. */
function makeGroup(labelKey: string, localizers?: Array<(active: Locale) => void>): HTMLElement {
  const group = document.createElement('div');
  group.className = 'grsch-cmd-group';
  if (labelKey.length > 0) {
    const caption = document.createElement('span');
    caption.className = 'grsch-cmd-group-label';
    caption.setAttribute('aria-hidden', 'true');
    localizers?.push((active) => {
      caption.textContent = uiLabel(labelKey, active);
    });
    group.appendChild(caption);
  }
  return group;
}

function makeShapeGroup<S>(
  titleKey: string,
  choices: ReadonlyArray<{ shape: S; glyph: string }>,
  localizers: Array<(active: Locale) => void>,
  onPick: (shape: S) => void,
): HTMLElement {
  const group = makeGroup(titleKey, localizers);
  const itemKind: 'milestone' | 'task' = titleKey === 'task' ? 'task' : 'milestone';
  for (const choice of choices) {
    const button = makeButton(choice.glyph, () => onPick(choice.shape));
    localizers.push((active) => {
      const name = paletteShapeAccessibleName(itemKind, String(choice.shape), active);
      button.setAttribute('aria-label', name);
      button.title = name;
    });
    group.appendChild(button);
  }
  return group;
}

function makeButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}
