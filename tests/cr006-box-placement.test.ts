/**
 * State-level coverage for CR-006 Part 8: the Add Box 2-click placement genuinely
 * MUTATES state. Armed via `armBoxPlacement`, the FIRST canvas press records the
 * top-left corner and the SECOND creates a RoundedBoxAnnotation spanning the clicked
 * rect (dates ordered, rows single-section-clamped). Esc / re-arm cancels without
 * creating anything.
 *
 * The editing controller is driven through a minimal fake host + mock renderer (no
 * DOM), so the two-click gesture is exercised end-to-end in the Node environment: the
 * capture-phase `pointerdown` listener registered by `attach()` is invoked directly
 * with crafted pointer events.
 */

import { describe, expect, it } from 'vitest';
import { EditingController } from '../src/adapters/input/editing-controller.js';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import { generateTemplateDocument } from '../src/app/sample-data.js';
import { rebuildClassification } from '../src/domain/usecase/classification-tree.js';
import {
  createRoundedBoxCommand,
  type RoundedBoxRect,
} from '../src/domain/command/annotation-commands.js';
import { toDayNumber } from '../src/domain/usecase/time-coordinate-mapper.js';
import type { SvgRenderer } from '../src/adapters/render/svg-renderer.js';

/** A fake render host that records the capture-phase listeners `attach()` registers. */
class FakeHost {
  public readonly listeners = new Map<string, Array<(event: unknown) => void>>();
  public readonly style: Record<string, string> = {};
  public addEventListener(type: string, handler: (event: unknown) => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(handler);
    this.listeners.set(type, list);
  }
  public removeEventListener(): void {
    /* not needed for the test */
  }
  public setPointerCapture(): void {
    /* pointer capture is a no-op in the fake host */
  }
  /** Fire the FIRST capture-phase pointerdown listener with a crafted event. */
  public firePointerDown(clientX: number, clientY: number): void {
    const handler = this.listeners.get('pointerdown')?.[0];
    if (handler === undefined) {
      throw new Error('no pointerdown listener registered');
    }
    handler({
      button: 0,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      target: null,
      pointerId: 1,
      type: 'pointerdown',
      clientX,
      clientY,
      stopPropagation: () => undefined,
      preventDefault: () => undefined,
    });
  }
}

/**
 * Build a controller wired to a real store (template document) and a mock renderer
 * whose `screenToWorld` is identity (client px == world px) and whose row mapping is
 * `worldY < 50 -> row 0`, else row 1, so two clicks land on adjacent rows of the same
 * top section.
 */
function makeController(): { controller: EditingController; store: ScheduleStore; host: FakeHost } {
  const store = new ScheduleStore(generateTemplateDocument(), undefined, rebuildClassification);
  const host = new FakeHost();
  const viewState = store.getDocument().viewState;
  const renderer = {
    getHostElement: () => host,
    screenToWorld: (screenX: number, screenY: number) => ({ worldX: screenX, worldY: screenY }),
    getViewState: () => viewState,
    rowIndexAtWorldY: (worldY: number) => (worldY < 50 ? 0 : 1),
    // A stray click after cancellation falls through to hit-testing / marquee; these
    // return "nothing here" so that path is inert (no box is created).
    hitTest: () => null,
    hitTestDependency: () => null,
    hitTestAnnotation: () => null,
  } as unknown as SvgRenderer;
  const controller = new EditingController(renderer, store);
  controller.attach();
  return { controller, store, host };
}

describe('CR-006 Part 8: Add Box 2-click placement mutates state', () => {
  it('creates a rounded box spanning the two clicked corners', () => {
    const { controller, store, host } = makeController();
    let placed: RoundedBoxRect | null = null;
    controller.armBoxPlacement((rect) => {
      placed = rect;
      store.dispatch(
        createRoundedBoxCommand({
          id: 'box-test',
          annotationKind: 'rounded-box',
          startDate: rect.startDate,
          endDate: rect.endDate,
          topRowIndex: rect.topRowIndex,
          bottomRowIndex: rect.bottomRowIndex,
          strokeColor: '#009e73',
          cornerRadiusPx: 10,
        }),
      );
    });
    expect(controller.isBoxPlacementArmed()).toBe(true);

    const before = store.getDocument().annotations?.length ?? 0;
    // First click = top-left; second click = bottom-right (larger world x, lower row).
    host.firePointerDown(100, 10);
    expect(placed).toBeNull(); // one corner only: nothing created yet
    expect(controller.isBoxPlacementArmed()).toBe(true);
    host.firePointerDown(400, 100);

    // The placement callback fired once with a normalized rect, and the mode disarmed.
    const rect = placed as unknown as RoundedBoxRect;
    expect(rect).not.toBeNull();
    expect(toDayNumber(rect.startDate)).toBeLessThanOrEqual(toDayNumber(rect.endDate));
    expect(rect.topRowIndex).toBe(0);
    expect(rect.bottomRowIndex).toBeGreaterThanOrEqual(rect.topRowIndex);
    expect(controller.isBoxPlacementArmed()).toBe(false);

    // A RoundedBoxAnnotation with the clicked rect was appended to the document.
    const annotations = store.getDocument().annotations ?? [];
    expect(annotations.length).toBe(before + 1);
    const created = annotations[annotations.length - 1];
    expect(created?.annotationKind).toBe('rounded-box');
    expect(created?.id).toBe('box-test');
    if (created?.annotationKind === 'rounded-box') {
      expect(created.startDate).toBe(rect.startDate);
      expect(created.endDate).toBe(rect.endDate);
      expect(created.topRowIndex).toBe(rect.topRowIndex);
      expect(created.bottomRowIndex).toBe(rect.bottomRowIndex);
    }
  });

  it('cancels cleanly (Esc / re-arm) without creating a box', () => {
    const { controller, store, host } = makeController();
    let placed = false;
    controller.armBoxPlacement(() => {
      placed = true;
    });
    const before = store.getDocument().annotations?.length ?? 0;
    host.firePointerDown(100, 10); // first corner recorded
    controller.cancelActiveGesture(); // Esc path
    expect(controller.isBoxPlacementArmed()).toBe(false);
    // A later stray click does not resurrect the cancelled placement.
    host.firePointerDown(400, 100);
    expect(placed).toBe(false);
    expect(store.getDocument().annotations?.length ?? 0).toBe(before);
  });
});
