/**
 * Adapter layer: a polite ARIA live region (WCAG 4.1.3 Status Messages, tied to
 * the observability toasts in CLAUDE.md). It creates a visually hidden,
 * `aria-live="polite"` container so status changes -- autosave success/failure,
 * import rejections, and the currently keyboard-focused item -- are announced by
 * assistive technology without moving focus.
 *
 * The text is toggled with a trailing marker even when repeated so a screen
 * reader re-reads an identical message (e.g. two "save failed" in a row).
 */

import { VISUALLY_HIDDEN_CLASS } from './a11y-stylesheet.js';

/** A polite screen-reader announcer backed by an off-screen live region. */
export class LiveRegionAnnouncer {
  private readonly region: HTMLElement;
  private alternateToggle = false;

  /**
   * @param host - The element to append the live region to (e.g. the app root).
   * @param label - Accessible label for the region.
   */
  public constructor(host: HTMLElement, label: string) {
    this.region = host.ownerDocument.createElement('div');
    this.region.className = VISUALLY_HIDDEN_CLASS;
    this.region.setAttribute('role', 'status');
    this.region.setAttribute('aria-live', 'polite');
    this.region.setAttribute('aria-atomic', 'true');
    this.region.setAttribute('aria-label', label);
    host.appendChild(this.region);
  }

  /**
   * Announce a message politely. An empty message clears the region.
   *
   * @param message - The text to announce.
   */
  public announce(message: string): void {
    if (message.length === 0) {
      this.region.textContent = '';
      return;
    }
    // Alternate a trailing space so identical consecutive messages still trigger
    // a re-announcement in screen readers that de-duplicate text.
    this.alternateToggle = !this.alternateToggle;
    this.region.textContent = this.alternateToggle ? message : message + String.fromCharCode(160);
  }
}
