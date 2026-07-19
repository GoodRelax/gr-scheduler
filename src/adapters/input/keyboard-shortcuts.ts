/**
 * Adapter layer: keyboard shortcut bindings (TOOL-L1-005).
 *
 * Wires the representative document-level shortcut set onto `window`: Undo
 * (Ctrl+Z), Redo (Ctrl+Y / Ctrl+Shift+Z), Copy (Ctrl+C), Paste (Ctrl+V) and
 * Delete. Arrow-key nudge/resize and Escape are canvas-focused interactions and
 * live in the keyboard-navigation adapter (M5c), so they are not duplicated here.
 * While a text field is focused, typing wins and shortcuts are suppressed, per the
 * requirement.
 */

import type { ScheduleStore } from '../../domain/command/schedule-store.js';
import { deleteItemsCommand, pasteItemsCommand } from '../../domain/command/commands.js';
import { deleteAnnotationCommand } from '../../domain/command/annotation-commands.js';
import type { EditingController } from './editing-controller.js';
import type { ItemClipboard } from '../clipboard/item-clipboard.js';
import { createLogger } from '../../app/logger.js';

const log = createLogger('grsch:keys');

/** Dependencies the shortcut layer coordinates. */
export interface ShortcutContext {
  readonly store: ScheduleStore;
  readonly controller: EditingController;
  readonly clipboard: ItemClipboard;
}

/**
 * Attach global keyboard shortcuts. Returns a detach function.
 *
 * @param context - The store/controller/clipboard to act on.
 * @returns A function that removes the listener.
 */
export function attachKeyboardShortcuts(context: ShortcutContext): () => void {
  const handler = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) {
      return;
    }
    const ctrl = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (ctrl && key === 'a') {
      // Select every item (item 4). The browser's default (select all page text) is
      // suppressed; the editable-target guard above already lets Ctrl+A behave
      // natively inside a text input / properties field.
      selectAll(context);
      event.preventDefault();
      return;
    }
    if (ctrl && key === 'z' && !event.shiftKey) {
      context.store.undo();
      event.preventDefault();
      return;
    }
    if (ctrl && (key === 'y' || (key === 'z' && event.shiftKey))) {
      context.store.redo();
      event.preventDefault();
      return;
    }
    if (ctrl && key === 'c') {
      copySelection(context);
      event.preventDefault();
      return;
    }
    if (ctrl && key === 'v') {
      pasteClipboard(context);
      event.preventDefault();
      return;
    }
    if (key === 'delete' || key === 'backspace') {
      deleteSelection(context);
      event.preventDefault();
    }
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

function selectAll(context: ShortcutContext): void {
  const allItemIds = new Set(context.store.getDocument().items.map((item) => item.id));
  context.controller.setSelection(allItemIds);
  log.debug('select_all', { selected_count: allItemIds.size });
}

function copySelection(context: ShortcutContext): void {
  const selected = context.controller.getSelection();
  if (selected.size === 0) {
    return;
  }
  const items = context.store.getDocument().items.filter((item) => selected.has(item.id));
  context.clipboard.copy(items);
  log.debug('clipboard_copy', { copied_count: items.length });
}

function pasteClipboard(context: ShortcutContext): void {
  if (!context.clipboard.hasContent()) {
    return;
  }
  const existingItemIds = new Set(context.store.getDocument().items.map((item) => item.id));
  const clones = context.clipboard.createPasteClones(existingItemIds);
  context.store.dispatch(pasteItemsCommand(clones));
  context.controller.setSelection(new Set(clones.map((clone) => clone.id)));
  log.debug('clipboard_paste', { pasted_count: clones.length });
}

function deleteSelection(context: ShortcutContext): void {
  const selected = context.controller.getSelection();
  if (selected.size > 0) {
    context.store.dispatch(deleteItemsCommand(selected));
    context.controller.clearSelection();
    log.debug('delete_selection', { deleted_count: selected.size });
    return;
  }
  // No item selected: a selected dependency line is deletable with the same key
  // (item 1), and is likewise undoable.
  if (context.controller.deleteSelectedDependency()) {
    return;
  }
  // Else fall back to a selected annotation (rounded-box / comment).
  const annotationId = context.controller.getSelectedAnnotationId();
  if (annotationId !== null) {
    context.store.dispatch(deleteAnnotationCommand(annotationId));
    context.controller.clearAnnotationSelection();
    log.debug('delete_annotation', { annotation_id: annotationId });
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
