/**
 * UseCase layer: the lightweight immutable store with command history
 * (ARCH-C-019, ADR-002). It holds the single source of truth `ScheduleDocument`,
 * notifies subscribers on change, and keeps snapshot stacks so any command can be
 * undone and redone (TOOL-L1-004).
 *
 * Design notes:
 * - Snapshot history (not inverse commands): because documents are immutable and
 *   commands are pure transforms, pushing the pre-edit document onto an undo
 *   stack is both simple and exactly reversible.
 * - Dispatching a new command clears the redo stack (branching discards the
 *   abandoned redo future), matching standard editor semantics.
 * - View state (zoom/scroll/selection) is deliberately NOT stored here, so
 *   panning or selecting never pollutes the edit history.
 */

import type { ScheduleDocument } from '../model/schedule-model.js';
import type { ScheduleCommand } from './commands.js';

/** Notified with the new document whenever the store's document changes. */
export type StoreListener = (document: ScheduleDocument) => void;

/**
 * Post-command normalizer applied to every dispatched/replaced document before it
 * becomes the source of truth. Used by the app to re-materialize the derived
 * classification tree (rows / rowId) after any edit, so the tree always follows
 * the items' categories. Must be pure and idempotent. Defaults to identity, so
 * unit tests that construct a store without one keep the raw command behavior.
 */
export type DocumentNormalizer = (document: ScheduleDocument) => ScheduleDocument;

/** Default cap on undo depth to bound memory for long sessions. */
export const DEFAULT_HISTORY_LIMIT = 200;

/**
 * Immutable schedule store with undo/redo. Instantiate with an initial document,
 * {@link subscribe} to changes, and {@link dispatch} commands to edit.
 */
export class ScheduleStore {
  private currentDocument: ScheduleDocument;
  private readonly undoStack: ScheduleDocument[] = [];
  private readonly redoStack: ScheduleDocument[] = [];
  private readonly listeners = new Set<StoreListener>();
  private readonly historyLimit: number;
  private readonly normalize: DocumentNormalizer;

  /**
   * @param initialDocument - The starting document (becomes the source of truth).
   * @param historyLimit - Maximum number of undo snapshots to retain.
   * @param normalize - Optional post-command normalizer (defaults to identity).
   */
  public constructor(
    initialDocument: ScheduleDocument,
    historyLimit: number = DEFAULT_HISTORY_LIMIT,
    normalize: DocumentNormalizer = (document) => document,
  ) {
    this.normalize = normalize;
    this.currentDocument = normalize(initialDocument);
    this.historyLimit = Math.max(1, historyLimit);
  }

  /** The current document (immutable source of truth). */
  public getDocument(): ScheduleDocument {
    return this.currentDocument;
  }

  /**
   * Subscribe to document changes.
   *
   * @param listener - Called with the new document after every change.
   * @returns An unsubscribe function.
   */
  public subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Execute a command, recording the prior state for undo. If the command is a
   * no-op (returns the same document reference), history is left untouched.
   *
   * @param command - The edit command to apply.
   */
  public dispatch(command: ScheduleCommand): void {
    const previous = this.currentDocument;
    const executed = command.execute(previous);
    if (executed === previous) {
      return;
    }
    const next = this.normalize(executed);
    if (next === previous) {
      return;
    }
    this.pushUndo(previous);
    this.redoStack.length = 0;
    this.currentDocument = next;
    this.notify();
  }

  /** Whether an undo is currently possible. */
  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Whether a redo is currently possible. */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Undo the most recent command, if any. */
  public undo(): void {
    const restored = this.undoStack.pop();
    if (restored === undefined) {
      return;
    }
    this.redoStack.push(this.currentDocument);
    this.currentDocument = restored;
    this.notify();
  }

  /** Redo the most recently undone command, if any. */
  public redo(): void {
    const restored = this.redoStack.pop();
    if (restored === undefined) {
      return;
    }
    this.undoStack.push(this.currentDocument);
    this.currentDocument = restored;
    this.notify();
  }

  /**
   * Replace the document wholesale (e.g. loading a file or a new template) and
   * clear all history. This is not an undoable edit by design.
   *
   * @param document - The document to adopt.
   */
  public replaceDocument(document: ScheduleDocument): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.currentDocument = this.normalize(document);
    this.notify();
  }

  private pushUndo(document: ScheduleDocument): void {
    this.undoStack.push(document);
    if (this.undoStack.length > this.historyLimit) {
      this.undoStack.shift();
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentDocument);
    }
  }
}
