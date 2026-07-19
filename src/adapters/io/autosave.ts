/**
 * Adapter layer: debounced localStorage autosave + crash recovery (IO-L1-005,
 * ARCH-C-025). The DOM/storage boundary; serialization/validation is delegated to
 * the pure json-codec so that a restored payload is re-validated as UNTRUSTED
 * input (security-design §5: localStorage may have been tampered with).
 *
 * Writes are debounced to avoid thrashing localStorage on every keystroke, and
 * every storage access is guarded (quota exceeded / disabled storage / corrupt
 * payload) so a storage failure degrades gracefully instead of breaking editing.
 */

import type { ScheduleDocument } from '../../domain/model/schedule-model.js';
import type { ScheduleStore } from '../../domain/command/schedule-store.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../../domain/usecase/json-codec.js';
import { createLogger } from '../../app/logger.js';

const log = createLogger('grsch:autosave');

/** App-prefixed localStorage key for the autosaved document (§5). */
export const AUTOSAVE_STORAGE_KEY = 'grsched.autosave.document';

/** Default debounce window for autosave writes, in milliseconds. */
export const DEFAULT_AUTOSAVE_DEBOUNCE_MS = 800;

/** Outcome flags surfaced to the UI for the save-status indicator. */
export type AutosaveStatus = 'saved' | 'failed';

/** Notified after each autosave attempt so the UI can show save state. */
export type AutosaveStatusListener = (status: AutosaveStatus) => void;

/**
 * Read and re-validate a previously autosaved document, if any (IO-L1-005). The
 * payload is treated as untrusted and passed through the full JSON validate
 * pipeline; a corrupt payload returns null (and is reported, not silently kept).
 *
 * @returns The restored document, or null when absent/corrupt/unavailable.
 */
export function loadAutosavedDocument(): ScheduleDocument | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(AUTOSAVE_STORAGE_KEY);
  } catch (error) {
    log.warn('autosave_read_unavailable', { reason: describeError(error) });
    return null;
  }
  if (raw === null || raw.length === 0) {
    return null;
  }
  try {
    return deserializeScheduleDocument(raw);
  } catch (error) {
    log.warn('autosave_corrupt', { reason: describeError(error) });
    return null;
  }
}

/** True when a non-empty autosave payload exists (for the restore prompt). */
export function hasAutosavedDocument(): boolean {
  try {
    const raw = window.localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    return raw !== null && raw.length > 0;
  } catch {
    return false;
  }
}

/** Remove the autosave payload (e.g. when the user declines to restore it). */
export function clearAutosavedDocument(): void {
  try {
    window.localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
  } catch (error) {
    log.warn('autosave_clear_failed', { reason: describeError(error) });
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Subscribes to a store and persists its document to localStorage on a debounce
 * (IO-L1-005). Guards quota/availability errors and reports status.
 */
export class AutosaveController {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;
  private readonly statusListeners = new Set<AutosaveStatusListener>();

  /**
   * @param store - The store whose document is autosaved.
   * @param debounceMs - Debounce window in milliseconds.
   */
  public constructor(
    private readonly store: ScheduleStore,
    private readonly debounceMs: number = DEFAULT_AUTOSAVE_DEBOUNCE_MS,
  ) {}

  /** Begin observing the store and autosaving its changes. */
  public start(): void {
    if (this.unsubscribe !== null) {
      return;
    }
    this.unsubscribe = this.store.subscribe(() => this.scheduleSave());
  }

  /** Stop observing and cancel any pending write. */
  public stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Subscribe to save-status changes; returns an unsubscribe function. */
  public onStatus(listener: AutosaveStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /** Force an immediate save (e.g. before an import replaces the document). */
  public saveNow(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.writeDocument();
  }

  private scheduleSave(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.writeDocument();
    }, this.debounceMs);
  }

  private writeDocument(): void {
    try {
      const text = serializeScheduleDocument(this.store.getDocument());
      window.localStorage.setItem(AUTOSAVE_STORAGE_KEY, text);
      this.emitStatus('saved');
    } catch (error) {
      // QuotaExceededError, disabled storage, private mode, etc.
      log.warn('autosave_write_failed', { reason: describeError(error) });
      this.emitStatus('failed');
    }
  }

  private emitStatus(status: AutosaveStatus): void {
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}
