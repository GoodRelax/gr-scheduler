/**
 * Adapter layer: the All-Clear confirmation dialog (SHELL file-ops batch item 2).
 *
 * A modal, focus-trapped `role="dialog"` that guards the destructive "reset the
 * document to a fresh empty state" action, reusing the same pattern as the
 * classification-pane delete dialog: the leading letter of each action is rendered
 * BOLD to afford its keyboard shortcut (A = All Clear / confirm, C = Cancel), Esc
 * also cancels, focus starts on the safer Cancel button and returns to the trigger
 * on close. Focus is trapped between the two buttons.
 *
 * The reset itself is a HARD reset (documented at the call site): it is applied via
 * `store.replaceDocument`, which resets the Undo/Redo history, so it is NOT undoable
 * -- the confirmation dialog is the safeguard.
 */

/** Options for {@link openAllClearDialog}. */
export interface AllClearDialogOptions {
  /** Element the modal overlay is appended to (usually the app root). */
  readonly host: HTMLElement;
  /** The button that opened the dialog; focus returns to it on close. */
  readonly trigger: HTMLElement | null;
  /** Invoked once when the user confirms the clear (A / All Clear button). */
  readonly onConfirm: () => void;
}

/** The live handle for an open All-Clear dialog (mainly for tests / teardown). */
export interface AllClearDialogHandle {
  /** Programmatically close the dialog (no confirm), returning focus to the trigger. */
  readonly close: () => void;
  /** The dialog element (`role="dialog"`). */
  readonly dialog: HTMLElement;
  /** The confirm ("All Clear") button. */
  readonly confirmButton: HTMLButtonElement;
  /** The cancel button. */
  readonly cancelButton: HTMLButtonElement;
}

/**
 * Open the modal All-Clear confirmation dialog.
 *
 * @param options - Host, trigger and confirm callback.
 * @returns A handle exposing the dialog nodes and a programmatic close.
 */
export function openAllClearDialog(options: AllClearDialogOptions): AllClearDialogHandle {
  const { host, trigger, onConfirm } = options;
  const doc = host.ownerDocument;

  const overlay = doc.createElement('div');
  overlay.dataset.role = 'all-clear-dialog-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '45';
  overlay.style.background = 'var(--grsch-scrim)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  const dialog = doc.createElement('div');
  dialog.dataset.role = 'all-clear-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'all-clear-dialog-title');
  dialog.style.background = 'var(--grsch-surface-strong)';
  dialog.style.borderRadius = '8px';
  dialog.style.boxShadow = '0 8px 28px rgba(0,0,0,0.32)';
  dialog.style.padding = '18px 20px';
  dialog.style.minWidth = '260px';
  dialog.style.font = 'inherit';
  dialog.style.fontFamily = 'system-ui, sans-serif';
  dialog.style.color = 'var(--grsch-text-strong)';

  const title = doc.createElement('p');
  title.id = 'all-clear-dialog-title';
  title.dataset.role = 'all-clear-dialog-body';
  title.textContent = 'Clear everything and start a new empty schedule? This cannot be undone.';
  title.style.margin = '0 0 16px';
  title.style.fontSize = '0.95em';
  title.style.lineHeight = '1.4';

  const buttonRow = doc.createElement('div');
  buttonRow.style.display = 'flex';
  buttonRow.style.justifyContent = 'flex-end';
  buttonRow.style.gap = '10px';

  const confirmButton = buildDialogButton(doc, 'all-clear-confirm', 'A', 'll Clear', 'All Clear');
  confirmButton.style.background = 'var(--grsch-danger)';
  confirmButton.style.color = 'var(--grsch-danger-text)';
  confirmButton.style.border = '1px solid var(--grsch-danger-border)';
  const cancelButton = buildDialogButton(doc, 'all-clear-cancel', 'C', 'ancel', 'Cancel');

  let closed = false;
  const close = (): void => {
    if (closed) {
      return;
    }
    closed = true;
    overlay.remove();
    if (trigger !== null && typeof trigger.focus === 'function') {
      trigger.focus();
    }
  };
  const confirm = (): void => {
    onConfirm();
    close();
  };

  confirmButton.addEventListener('click', confirm);
  cancelButton.addEventListener('click', close);

  // Keyboard: A confirms, C / Esc cancel, Enter confirms, Tab traps between the two.
  dialog.addEventListener('keydown', (event) => {
    const key = (event.key || '').toLowerCase();
    if (key === 'a') {
      event.preventDefault();
      event.stopPropagation();
      confirm();
    } else if (key === 'c' || event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      confirm();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const active = doc.activeElement;
      (active === cancelButton ? confirmButton : cancelButton).focus();
    }
  });
  // A backdrop press cancels (matches the delete dialog affordance).
  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  buttonRow.append(confirmButton, cancelButton);
  dialog.append(title, buttonRow);
  overlay.appendChild(dialog);
  host.appendChild(overlay);
  // Default focus on Cancel (safer for a destructive action).
  cancelButton.focus();

  return { close, dialog, confirmButton, cancelButton };
}

/**
 * Build one dialog action button with its leading letter BOLD (affording the
 * A / C keyboard shortcut).
 */
function buildDialogButton(
  doc: Document,
  role: string,
  boldLetter: string,
  rest: string,
  accessibleName: string,
): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.dataset.role = role;
  button.setAttribute('aria-label', accessibleName);
  button.style.cursor = 'pointer';
  button.style.padding = '5px 14px';
  button.style.borderRadius = '4px';
  button.style.border = '1px solid var(--grsch-btn-face-border)';
  button.style.background = 'var(--grsch-btn-face-alt)';
  button.style.color = 'var(--grsch-text-strong)';
  button.style.font = 'inherit';
  const bold = doc.createElement('b');
  bold.textContent = boldLetter;
  button.appendChild(bold);
  button.appendChild(doc.createTextNode(rest));
  return button;
}
