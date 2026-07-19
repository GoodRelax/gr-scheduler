/**
 * Adapter layer: pointer-driven editing controller (ARCH-C-023 pointer
 * controller). Translates screen gestures into pure domain commands dispatched
 * to the {@link ScheduleStore}, implementing WYSIWYG create/move/resize
 * (ALIGN-L1-002), bidirectional coordinate<->date sync (ALIGN-L1-003), light
 * alignment snapping (ALIGN-L2-001) and abbreviation-label drag (ITEM-L1-010).
 *
 * Interaction model: listeners are attached in the capture phase on the render
 * host. When a gesture starts on an item the controller consumes the event
 * (stopPropagation), so the renderer's own pan handler stays dormant; on empty
 * canvas the event is left alone and the renderer pans (or a create gesture runs
 * when a palette shape is armed). During a drag the controller renders a *preview*
 * by applying the same command to the pre-drag snapshot without touching the
 * store, then commits exactly one command on release -- so a whole drag is a
 * single Undo step.
 */

import type {
  MilestoneShape,
  Row,
  ScheduleDocument,
  ScheduleItem,
  TaskShape,
  ViewState,
} from '../../domain/model/schedule-model.js';
import { DEFAULT_FILL_COLOR, DEFAULT_STROKE_COLOR } from '../../domain/model/cud-palette.js';
import type { ScheduleStore } from '../../domain/command/schedule-store.js';
import {
  addDependencyCommand,
  createItemCommand,
  editPropertyCommand,
  moveItemCommand,
  removeDependencyCommand,
  resizeItemCommand,
  setDependencyColorCommand,
  type ClassificationTarget,
  type ResizeEdge,
  type ScheduleCommand,
} from '../../domain/command/commands.js';
import {
  moveCommentCommand,
  resizeRoundedBoxCommand,
  type RoundedBoxRectPatch,
} from '../../domain/command/annotation-commands.js';
import { isComment } from '../../domain/model/annotation.js';
import {
  collectStartDateBaselinesX,
  snapToNearestBaseline,
  DEFAULT_SNAP_THRESHOLD_PX,
} from '../../domain/usecase/alignment-solver.js';
import {
  dateToWorldX,
  fromDayNumber,
  pixelsPerDay,
  toDayNumber,
  worldXToDate,
} from '../../domain/usecase/time-coordinate-mapper.js';
import { rowBandHeight } from '../../domain/usecase/layout-engine.js';
import {
  fadeInDaysFromPointer,
  fadeOutDaysFromPointer,
} from '../../domain/usecase/fade-geometry.js';
import { orderedVisibleRows, type SectionBand } from '../../domain/usecase/section-organizer.js';
import {
  classificationCollapseLevel,
  clampRowIndexToSection,
  collapseRows,
  contiguousSectionBands,
  defaultMiddleForMajor,
} from '../../domain/usecase/classification-tree.js';
import { nearestAnchor } from '../../domain/usecase/dependency-router.js';
import { iconShapeKindForCreate } from '../../domain/usecase/task-glyph.js';
import type { AnnotationHit, ItemHit, SvgRenderer, WorldPoint } from '../render/svg-renderer.js';
import { createLogger } from '../../app/logger.js';

const log = createLogger('grsch:edit');

/** A shape armed on the tool palette, awaiting placement on the canvas. */
export type PendingCreateShape =
  | { readonly itemKind: 'milestone'; readonly milestoneShape: MilestoneShape }
  | { readonly itemKind: 'task'; readonly taskShape: TaskShape };

/** Callback invoked when the current selection changes. */
export type SelectionListener = (selectedItemIds: ReadonlySet<string>) => void;

interface MoveGesture {
  readonly mode: 'move';
  readonly itemId: string;
  readonly baseline: ScheduleDocument;
  readonly startWorldX: number;
  readonly startWorldY: number;
  readonly originalStartX: number;
  /** Snap baselines collected ONCE at gesture start (M-02, immutable mid-drag). */
  readonly baselinesX: readonly number[];
  moved: boolean;
}

interface ResizeGesture {
  readonly mode: 'resize';
  readonly itemId: string;
  readonly edge: ResizeEdge;
  readonly baseline: ScheduleDocument;
  readonly startWorldX: number;
  readonly edgeWorldX: number;
  /** Snap baselines collected ONCE at gesture start (M-02). */
  readonly baselinesX: readonly number[];
  moved: boolean;
}

/** Which fade corner of a task is being dragged. */
type FadeEdge = 'fade-in' | 'fade-out';

interface FadeGesture {
  readonly mode: 'fade';
  readonly itemId: string;
  readonly edge: FadeEdge;
  readonly baseline: ScheduleDocument;
  readonly startWorldX: number;
  moved: boolean;
}

interface CreateGesture {
  readonly mode: 'create';
  readonly shape: PendingCreateShape;
  readonly rowId: string;
  /** Classification path of the target display row (null for legacy keyless rows). */
  readonly target: ClassificationTarget | null;
  readonly startWorldX: number;
  readonly rowIndex: number;
}

interface MarqueeGesture {
  readonly mode: 'marquee';
  readonly startWorldX: number;
  readonly startWorldY: number;
  /** Shift held at press: add the framed items to the current selection. */
  readonly additive: boolean;
  moved: boolean;
}

interface LabelGesture {
  readonly mode: 'label';
  readonly itemId: string;
  readonly baseline: ScheduleDocument;
  readonly startWorldX: number;
  readonly startWorldY: number;
  readonly baseDx: number;
  readonly baseDy: number;
  moved: boolean;
}

/** Corner of a rounded-box annotation being dragged (CURS-L1-007). */
type BoxCorner = 'nw' | 'ne' | 'sw' | 'se';

interface AnnotationResizeGesture {
  readonly mode: 'annotation-resize';
  readonly annotationId: string;
  readonly corner: BoxCorner;
  readonly baseline: ScheduleDocument;
  readonly startWorldX: number;
  readonly startWorldY: number;
  moved: boolean;
}

/**
 * Dragging a comment's bubble (speech box), which updates its `bodyOffsetPx`
 * (undoable) so the bubble moves and the leader line re-routes to the anchor
 * (CURS-L1-005). The content group is translated (never scaled), so a world-space
 * delta equals the screen-space bubble-offset delta.
 */
interface CommentMoveGesture {
  readonly mode: 'comment-move';
  readonly annotationId: string;
  readonly baseline: ScheduleDocument;
  readonly startWorldX: number;
  readonly startWorldY: number;
  moved: boolean;
}

type Gesture =
  | MoveGesture
  | ResizeGesture
  | FadeGesture
  | CreateGesture
  | LabelGesture
  | MarqueeGesture
  | AnnotationResizeGesture
  | CommentMoveGesture;

/**
 * The live state of the click-to-pick dependency link mode (item 4), surfaced to the
 * shell so it can show an active-state hint. `armedSourceItemId` is the source item
 * awaiting a target click, or null when the mode is on but no source is picked yet.
 */
export interface LinkModeState {
  readonly enabled: boolean;
  readonly armedSourceItemId: string | null;
}

/** Callback invoked when the dependency link-mode state changes (item 4). */
export type LinkModeListener = (state: LinkModeState) => void;

/** Minimum drag distance (px) before a press is treated as a drag, not a click. */
const DRAG_THRESHOLD_PX = 3;

/**
 * Editing controller. Construct with a mounted renderer and a store, then call
 * {@link attach}. Arm a create shape with {@link setPendingCreateShape}.
 */
export class EditingController {
  private readonly renderer: SvgRenderer;
  private readonly store: ScheduleStore;
  private selectedItemIds: ReadonlySet<string> = new Set();
  /** The currently selected annotation (rounded-box / comment), or null. */
  private selectedAnnotationId: string | null = null;
  /** The currently selected dependency line, or null (item 1). */
  private selectedDependencyId: string | null = null;
  /** Notified when the selected dependency line changes (drives the property panel). */
  private dependencySelectionListener: ((dependencyId: string | null) => void) | null = null;
  private pendingCreateShape: PendingCreateShape | null = null;
  private gesture: Gesture | null = null;
  private activePointerId: number | null = null;
  private nextItemSerial = 0;
  private nextDependencySerial = 0;
  private linkMode = false;
  /**
   * The source item picked in click-to-pick link mode, awaiting a target click (item
   * 4). Null when link mode is off or armed but no source chosen yet.
   */
  private linkSourceItemId: string | null = null;
  /** Notified when the link-mode state (enabled / armed source) changes (item 4). */
  private linkModeListener: LinkModeListener | null = null;
  private readonly selectionListeners = new Set<SelectionListener>();
  /** Notified when an item is double-clicked (opens the property panel, fix 10). */
  private itemActivateListener: ((itemId: string) => void) | null = null;

  /**
   * @param renderer - The mounted SVG renderer to hit-test and preview through.
   * @param store - The schedule store commands are dispatched to.
   */
  public constructor(renderer: SvgRenderer, store: ScheduleStore) {
    this.renderer = renderer;
    this.store = store;
  }

  /**
   * The renderer's LIVE view state (calibration fix, fix 1 / fix 6a). All
   * coordinate math -- world<->date, world y -> row index, snap baselines -- must
   * use the same zoom/scroll the renderer draws with and that {@link SvgRenderer.
   * screenToWorld} inverts. The store document's own viewState is NOT kept in sync
   * with wheel-zoom / pan / Fit, so reading zoom from the store (as this controller
   * used to) made drags mistrack and vertical moves snap to the wrong row once the
   * live zoom diverged from the document's stale zoom.
   */
  private liveViewState(): ViewState {
    return this.renderer.getViewState();
  }

  /** Attach capture-phase pointer listeners to the render host. */
  public attach(): void {
    const host = this.renderer.getHostElement();
    if (host === null) {
      throw new Error('EditingController.attach called before the renderer was mounted');
    }
    host.addEventListener('pointerdown', (event) => this.handlePointerDown(event), { capture: true });
    host.addEventListener('pointermove', (event) => this.handlePointerMove(event), { capture: true });
    host.addEventListener('pointerup', (event) => this.handlePointerUp(event), { capture: true });
    host.addEventListener('pointercancel', (event) => this.handlePointerUp(event), { capture: true });
    // Bubble-phase hover handler: applies contextual cursors while no gesture and
    // no button is active (col-resize on task edges, corner cursors on box handles,
    // crosshair in link/create modes), leaving the default arrow otherwise.
    host.addEventListener('pointermove', (event) => this.updateHoverCursor(event));
    // Double-click an item to open/show the property panel and select it (fix 10).
    host.addEventListener('dblclick', (event) => this.handleDoubleClick(event));
  }

  /**
   * Register a listener invoked when an item is double-clicked (fix 10). The shell
   * uses it to reveal the property panel; the item is already selected by then.
   *
   * @param listener - Called with the double-clicked item id.
   */
  public onItemActivate(listener: (itemId: string) => void): void {
    this.itemActivateListener = listener;
  }

  /** Select and activate (open the panel for) a double-clicked item (fix 10). */
  private handleDoubleClick(event: MouseEvent): void {
    const hit = this.renderer.hitTest(event.clientX, event.clientY);
    if (hit === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.setSelection(new Set([hit.itemId]));
    this.itemActivateListener?.(hit.itemId);
  }

  /** Apply a contextual cursor on hover (interaction hardening). */
  private updateHoverCursor(event: PointerEvent): void {
    if (this.gesture !== null || event.buttons !== 0) {
      return;
    }
    const host = this.renderer.getHostElement();
    if (host === null) {
      return;
    }
    if (this.linkMode || this.pendingCreateShape !== null) {
      host.style.cursor = 'crosshair';
      return;
    }
    const hit = this.renderer.hitTest(event.clientX, event.clientY);
    if (hit !== null && (hit.region === 'fade-in' || hit.region === 'fade-out')) {
      // Diagonal resize cursor over a fade corner handle (top-left / bottom-right
      // both lie on the NW<->SE diagonal).
      host.style.cursor = 'nwse-resize';
      return;
    }
    if (hit !== null && (hit.region === 'resize-start' || hit.region === 'resize-end')) {
      host.style.cursor = 'col-resize';
      return;
    }
    if (hit !== null) {
      // Over a selectable item/icon: a pointer (hand) cursor advertises that it can
      // be grabbed / selected (fix 2).
      host.style.cursor = 'pointer';
      return;
    }
    if (hit === null && this.selectedAnnotationId !== null) {
      const annotationHit = this.renderer.hitTestAnnotation(event.clientX, event.clientY);
      if (annotationHit !== null && annotationHit.region !== 'body') {
        host.style.cursor = cornerCursor(annotationHit.region);
        return;
      }
    }
    host.style.cursor = 'default';
  }

  /** The currently selected annotation id, or null (for delete/keyboard wiring). */
  public getSelectedAnnotationId(): string | null {
    return this.selectedAnnotationId;
  }

  /** Select an annotation (mutually exclusive with an item / dependency selection). */
  private selectAnnotation(annotationId: string): void {
    this.selectedAnnotationId = annotationId;
    this.renderer.setSelectedAnnotation(annotationId);
    // Clear any item selection so the property panel + item outlines reset.
    if (this.selectedItemIds.size > 0) {
      this.setSelection(new Set());
    }
    this.clearDependencySelection();
  }

  /** Clear the annotation selection, if any. */
  public clearAnnotationSelection(): void {
    if (this.selectedAnnotationId !== null) {
      this.selectedAnnotationId = null;
      this.renderer.setSelectedAnnotation(null);
    }
  }

  /** The currently selected dependency line id, or null (item 1). */
  public getSelectedDependencyId(): string | null {
    return this.selectedDependencyId;
  }

  /**
   * Register a listener invoked when the selected dependency line changes (item 1).
   * The shell uses it to point the property panel at the line's color control.
   *
   * @param listener - Called with the selected dependency id, or null.
   */
  public onDependencySelectionChange(listener: (dependencyId: string | null) => void): void {
    this.dependencySelectionListener = listener;
  }

  /**
   * Set (or clear with null) the color of the currently selected dependency line
   * (item 1), dispatching an undoable command. No-op when no line is selected.
   *
   * @param strokeColor - The new CSS color string.
   */
  public setSelectedDependencyColor(strokeColor: string): void {
    if (this.selectedDependencyId === null) {
      return;
    }
    this.store.dispatch(setDependencyColorCommand(this.selectedDependencyId, strokeColor));
    log.debug('dependency_recolored', { dependency_id: this.selectedDependencyId });
  }

  /**
   * Delete the currently selected dependency line (item 1), dispatching an undoable
   * remove command and clearing the selection. Returns true when a line was removed.
   */
  public deleteSelectedDependency(): boolean {
    if (this.selectedDependencyId === null) {
      return false;
    }
    const id = this.selectedDependencyId;
    this.store.dispatch(removeDependencyCommand(id));
    this.clearDependencySelection();
    log.debug('dependency_deleted', { dependency_id: id });
    return true;
  }

  /** Select a dependency line, clearing item + annotation selection (mutually exclusive). */
  private selectDependency(dependencyId: string): void {
    this.selectedDependencyId = dependencyId;
    this.renderer.setSelectedDependency(dependencyId);
    if (this.selectedItemIds.size > 0) {
      this.setSelection(new Set());
    }
    this.clearAnnotationSelection();
    this.dependencySelectionListener?.(dependencyId);
  }

  /** Clear the dependency-line selection, if any (item 1). */
  public clearDependencySelection(): void {
    if (this.selectedDependencyId !== null) {
      this.selectedDependencyId = null;
      this.renderer.setSelectedDependency(null);
      this.dependencySelectionListener?.(null);
    }
  }

  /** Subscribe to selection changes; returns an unsubscribe function. */
  public onSelectionChange(listener: SelectionListener): () => void {
    this.selectionListeners.add(listener);
    return () => {
      this.selectionListeners.delete(listener);
    };
  }

  /** The currently selected item ids. */
  public getSelection(): ReadonlySet<string> {
    return this.selectedItemIds;
  }

  /**
   * Arm (or disarm with null) a shape for the next create gesture. While armed,
   * a press on empty canvas places the shape instead of panning.
   *
   * @param shape - The shape to create next, or null to clear.
   */
  public setPendingCreateShape(shape: PendingCreateShape | null): void {
    this.pendingCreateShape = shape;
  }

  /**
   * Enable or disable dependency-link mode (DEP-L1-002, item 4). While enabled, a
   * CLICK on a source item then a CLICK on a target item creates a directed dependency
   * between their nearest 9-point anchors; repeat to build n:n. Clicking the same
   * source again disarms it; clicking an existing source->target pair removes that edge
   * (toggle). Turning the mode off clears any armed source.
   *
   * @param enabled - True to arm link creation.
   */
  public setLinkMode(enabled: boolean): void {
    this.linkMode = enabled;
    this.linkSourceItemId = null;
    this.notifyLinkState();
  }

  /** Whether dependency-link mode is currently armed. */
  public isLinkMode(): boolean {
    return this.linkMode;
  }

  /** The source item awaiting a target click in link mode, or null (item 4). */
  public getLinkSourceItemId(): string | null {
    return this.linkSourceItemId;
  }

  /**
   * Register a listener invoked when the link-mode state changes (item 4). The shell
   * uses it to show/update the active-state hint ("pick source -> target").
   *
   * @param listener - Called with the current {@link LinkModeState}.
   */
  public onLinkStateChange(listener: LinkModeListener): void {
    this.linkModeListener = listener;
  }

  /** Notify the shell of the current link-mode state (item 4). */
  private notifyLinkState(): void {
    this.linkModeListener?.({ enabled: this.linkMode, armedSourceItemId: this.linkSourceItemId });
  }

  /**
   * Handle a click on an item while link mode is armed (item 4, click-to-pick). The
   * first click arms the SOURCE; a click on a DIFFERENT item creates the source->target
   * edge (or removes it when it already exists, a toggle) while KEEPING the source armed
   * so the user can fan out to many targets (1:n); a click on the SAME source disarms it.
   */
  private handleLinkPick(event: PointerEvent, itemId: string, world: WorldPoint): void {
    this.consume(event);
    if (this.linkSourceItemId === null) {
      this.linkSourceItemId = itemId;
      this.setSelection(new Set([itemId]));
      this.notifyLinkState();
      return;
    }
    if (this.linkSourceItemId === itemId) {
      // Second click on the source disarms it (cancel).
      this.linkSourceItemId = null;
      this.notifyLinkState();
      return;
    }
    const sourceId = this.linkSourceItemId;
    const document = this.store.getDocument();
    const existing = (document.dependencies ?? []).find(
      (edge) => edge.fromItemId === sourceId && edge.toItemId === itemId,
    );
    if (existing !== undefined) {
      // Toggle: a click on an already-linked pair removes that edge (undoable).
      this.store.dispatch(removeDependencyCommand(existing.id));
      log.debug('dependency_unlinked', { from_item_id: sourceId, to_item_id: itemId });
      this.notifyLinkState();
      return;
    }
    const fromRect = this.renderer.getItemRect(sourceId);
    const toRect = this.renderer.getItemRect(itemId);
    if (fromRect === null || toRect === null) {
      return;
    }
    const fromAnchor = nearestAnchor(fromRect, { x: world.worldX, y: world.worldY });
    const toAnchor = nearestAnchor(toRect, { x: world.worldX, y: world.worldY });
    const id = `dep-${Date.now()}-${this.nextDependencySerial++}`;
    this.store.dispatch(
      addDependencyCommand({ id, fromItemId: sourceId, fromAnchor, toItemId: itemId, toAnchor }),
    );
    log.debug('dependency_created', {
      dependency_id: id,
      from_item_id: sourceId,
      to_item_id: itemId,
    });
    // Keep the source armed so repeated target clicks build a 1:n fan (item 4).
    this.notifyLinkState();
  }

  /** Replace the selection and notify listeners + the renderer. */
  public setSelection(itemIds: ReadonlySet<string>): void {
    this.selectedItemIds = new Set(itemIds);
    this.renderer.setSelection(this.selectedItemIds);
    // Selecting one or more items clears any annotation / dependency selection (all
    // mutually exclusive). An empty set leaves them intact so selectAnnotation() /
    // selectDependency() can clear items without wiping what they just selected.
    if (this.selectedItemIds.size > 0) {
      this.clearAnnotationSelection();
      this.clearDependencySelection();
    }
    for (const listener of this.selectionListeners) {
      listener(this.selectedItemIds);
    }
  }

  /** Clear the selection. */
  public clearSelection(): void {
    if (this.selectedItemIds.size > 0) {
      this.setSelection(new Set());
    }
  }

  /** Whether a create shape is currently armed (keyboard/pointer placement). */
  public hasArmedShape(): boolean {
    return this.pendingCreateShape !== null;
  }

  /** Whether a pointer gesture (move/resize/create/marquee/...) is in progress (item 6). */
  public isGestureInProgress(): boolean {
    return this.gesture !== null;
  }

  /**
   * The visible items in a stable keyboard-navigation order (WCAG 2.1.1): by row
   * (top to bottom), then start date, then id. Only items on a visible row are
   * included, mirroring what the renderer can show.
   *
   * @returns Ordered item ids for roving keyboard focus.
   */
  public getVisibleItemIdOrder(): string[] {
    const document = this.store.getDocument();
    const visible0 = orderedVisibleRows(document.sections, document.rows);
    const collapse = collapseRows(visible0, classificationCollapseLevel(this.liveViewState().zoomY));
    const rowIndexById = new Map<string, number>();
    collapse.rows.forEach((row, index) => rowIndexById.set(row.id, index));
    const displayIndexOf = (rowId: string): number | undefined =>
      rowIndexById.get(collapse.rowIdToDisplayId.get(rowId) ?? rowId);
    return document.items
      .filter((item) => displayIndexOf(item.rowId) !== undefined)
      .map((item) => ({
        id: item.id,
        rowIndex: displayIndexOf(item.rowId) ?? 0,
        startDay: toDayNumber(item.startDate),
      }))
      .sort(
        (left, right) =>
          left.rowIndex - right.rowIndex ||
          left.startDay - right.startDay ||
          left.id.localeCompare(right.id),
      )
      .map((entry) => entry.id);
  }

  /**
   * Keyboard nudge (WCAG 2.1.1): move the single selected item by a whole-day and
   * whole-row delta. Row movement targets the adjacent visible row so the item
   * stays on a real lane. No-op unless exactly one item is selected.
   *
   * @param deltaDays - Signed day offset (0 for a pure row move).
   * @param deltaRows - Signed row offset (0 for a pure day move).
   * @returns True when a move command was dispatched.
   */
  public nudgeSelection(deltaDays: number, deltaRows: number): boolean {
    const itemId = this.onlySelectedItemId();
    if (itemId === null || (deltaDays === 0 && deltaRows === 0)) {
      return false;
    }
    const targetRow = deltaRows === 0 ? undefined : this.adjacentRow(itemId, deltaRows);
    // A row nudge past the top/bottom edge yields no target row: keep the day move
    // if any, otherwise treat the whole nudge as a no-op.
    if (deltaRows !== 0 && targetRow === undefined && deltaDays === 0) {
      return false;
    }
    const targetCategory = targetRow === undefined ? undefined : this.categoryTargetForRow(targetRow);
    this.store.dispatch(
      moveItemCommand(
        itemId,
        deltaDays,
        undefined,
        targetCategory === null ? undefined : targetCategory,
      ),
    );
    log.debug('keyboard_nudge', { item_id: itemId, delta_days: deltaDays, delta_rows: deltaRows });
    return true;
  }

  /**
   * Keyboard resize (WCAG 2.1.1): grow/shrink the selected task's end edge by a
   * whole-day delta. No-op for milestones or when the selection is not a single
   * item.
   *
   * @param deltaDays - Signed day offset applied to the end edge.
   * @returns True when a resize command was dispatched.
   */
  public resizeSelection(deltaDays: number): boolean {
    const itemId = this.onlySelectedItemId();
    if (itemId === null || deltaDays === 0) {
      return false;
    }
    const item = this.findItem(this.store.getDocument(), itemId);
    if (item === null || item.itemKind !== 'task') {
      return false;
    }
    this.store.dispatch(resizeItemCommand(itemId, 'end', deltaDays));
    log.debug('keyboard_resize', { item_id: itemId, delta_days: deltaDays });
    return true;
  }

  /**
   * Keyboard create (WCAG 2.1.1): place the armed palette shape at the keyboard
   * caret -- the selected item's row and date, or the first visible row at the
   * viewport-center date when nothing is selected. Selects and returns the new
   * item, then disarms. No-op when no shape is armed or no row exists.
   *
   * @param viewportCenterWorldX - World x of the viewport center (caret fallback).
   * @returns The new item id, or null when nothing was created.
   */
  public placeArmedItemAtCaret(viewportCenterWorldX: number): string | null {
    const shape = this.pendingCreateShape;
    if (shape === null) {
      return null;
    }
    const document = this.store.getDocument();
    const { epochDate } = document;
    const zoomX = this.liveViewState().zoomX;
    const selectedId = this.onlySelectedItemId();
    const selected = selectedId === null ? null : this.findItem(document, selectedId);
    const firstRow = this.visibleRows()[0];
    // Inherit the caret's classification: the selected item's own categories, else
    // the first visible display row's. The store normalizer re-derives rowId.
    const target =
      selected !== null ? classificationTargetOfItem(selected) : this.createTargetForRow(firstRow);
    const rowId = selected?.rowId ?? firstRow?.id ?? null;
    if (rowId === null) {
      return null;
    }
    const rowIndex = Math.max(
      0,
      this.visibleRows().findIndex((row) => row.id === this.displayRowIdOf(rowId)),
    );
    const startDate =
      selected?.startDate ?? worldXToDate(viewportCenterWorldX, epochDate, zoomX);
    const startDay = toDayNumber(startDate);
    const id = `item-key-${Date.now()}-${this.nextItemSerial++}`;
    const base = {
      id,
      rowId,
      startDate,
      abbrev: shape.itemKind === 'milestone' ? 'M' : 'T',
      importance: 1,
      fillColor: DEFAULT_FILL_COLOR,
      strokeColor: DEFAULT_STROKE_COLOR,
      lineWeight: 'medium' as const,
      ...categoryFields(target),
    };
    const item: ScheduleItem =
      shape.itemKind === 'milestone'
        ? {
            ...base,
            itemKind: 'milestone',
            endDate: null,
            milestoneShape: shape.milestoneShape,
            iconShapeKind: iconShapeKindForCreate('milestone', shape.milestoneShape, undefined),
          }
        : {
            ...base,
            itemKind: 'task',
            endDate: fromDayNumber(startDay + 7),
            taskShape: shape.taskShape,
            iconShapeKind: iconShapeKindForCreate('task', undefined, shape.taskShape),
          };
    this.store.dispatch(createItemCommand(item));
    this.setSelection(new Set([id]));
    this.setPendingCreateShape(null);
    log.debug('keyboard_item_created', { item_id: id, item_kind: item.itemKind, row_index: rowIndex });
    return id;
  }

  /**
   * Cancel the active interaction (WCAG 2.1.1 / Escape): abort an in-progress
   * pointer gesture, else disarm a pending create shape, else clear the selection.
   */
  public cancelActiveGesture(): void {
    const gesture = this.gesture;
    if (gesture !== null) {
      const baseline = 'baseline' in gesture ? gesture.baseline : this.store.getDocument();
      this.gesture = null;
      this.activePointerId = null;
      this.renderer.showAlignmentGuide(null);
      this.renderer.showCreatePreview(null);
      this.renderer.showDependencyPreview(null);
      this.renderer.showMarquee(null);
      this.renderer.updateItems(baseline);
      return;
    }
    if (this.pendingCreateShape !== null) {
      this.setPendingCreateShape(null);
      return;
    }
    this.clearSelection();
  }

  /** The single selected item id, or null when the selection is not exactly one. */
  private onlySelectedItemId(): string | null {
    if (this.selectedItemIds.size !== 1) {
      return null;
    }
    return [...this.selectedItemIds][0] ?? null;
  }

  /** Display row `deltaRows` away from an item's current display row, or undefined. */
  private adjacentRow(itemId: string, deltaRows: number): Row | undefined {
    const item = this.findItem(this.store.getDocument(), itemId);
    if (item === null) {
      return undefined;
    }
    const rows = this.visibleRows();
    const displayId = this.displayRowIdOf(item.rowId);
    const currentIndex = rows.findIndex((row) => row.id === displayId);
    if (currentIndex === -1) {
      return undefined;
    }
    const targetIndex = currentIndex + deltaRows;
    if (targetIndex < 0 || targetIndex >= rows.length) {
      return undefined;
    }
    return rows[targetIndex];
  }

  private handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    // Ctrl/Cmd + drag is the pan gesture (fix 4): leave the event untouched so it
    // bubbles to the renderer's pan handler instead of starting an item gesture.
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    // A press that originates on a floating overlay control (command palette /
    // tool palette / left pane / any button/field) must reach that control, not
    // start a canvas gesture. Without this guard the capture-phase handler could
    // hit-test an item UNDER the translucent palette and consume the event,
    // swallowing the control's own click (mirrors the renderer's pan guard, F-01).
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(
        'button, input, select, textarea, a[href], [role="toolbar"], [data-role="left-classification-pane"], [data-role="command-palette-drag-handle"]',
      ) !== null
    ) {
      return;
    }
    const hit = this.renderer.hitTest(event.clientX, event.clientY);
    const world = this.renderer.screenToWorld(event.clientX, event.clientY);

    if (this.linkMode && hit !== null) {
      this.handleLinkPick(event, hit.itemId, world);
      return;
    }
    if (this.pendingCreateShape !== null && hit === null) {
      this.beginCreate(event, world.worldX, world.worldY);
      return;
    }
    if (hit === null) {
      // No item under the pointer: try a dependency line (item 1). A thin line is
      // hit-tested geometrically with a pixel tolerance; selecting it is unambiguous
      // because item bodies were already tested and won above.
      const dependencyId = this.renderer.hitTestDependency(event.clientX, event.clientY);
      if (dependencyId !== null) {
        this.consume(event);
        this.selectDependency(dependencyId);
        return;
      }
      // Then the annotations (rounded-box / comment).
      const annotationHit = this.renderer.hitTestAnnotation(event.clientX, event.clientY);
      if (annotationHit !== null) {
        this.beginAnnotationGesture(event, annotationHit, world.worldX, world.worldY);
        return;
      }
      // Empty canvas, no armed shape: begin a rubber-band marquee (item 3). A plain
      // click that never drags falls back to clearing the selection (in commitMarquee);
      // Shift makes the marquee additive. Ctrl+drag pan was already handled above.
      this.beginMarquee(event, world.worldX, world.worldY, event.shiftKey);
      return;
    }
    this.beginItemGesture(event, hit, world.worldX, world.worldY);
  }

  private beginAnnotationGesture(
    event: PointerEvent,
    annotationHit: AnnotationHit,
    worldX: number,
    worldY: number,
  ): void {
    this.consume(event);
    // A corner handle on the already-selected box starts a resize; anything else
    // (a body hit, or a corner of a not-yet-selected box) just selects it.
    if (
      annotationHit.region !== 'body' &&
      annotationHit.annotationId === this.selectedAnnotationId
    ) {
      const host = this.renderer.getHostElement();
      const corner = cornerOf(annotationHit.region);
      if (host !== null) {
        host.style.cursor = cornerCursor(annotationHit.region);
      }
      this.gesture = {
        mode: 'annotation-resize',
        annotationId: annotationHit.annotationId,
        corner,
        baseline: this.store.getDocument(),
        startWorldX: worldX,
        startWorldY: worldY,
        moved: false,
      };
      return;
    }
    // A body hit on a COMMENT begins a bubble drag: it selects the comment and,
    // if the pointer moves, updates its bodyOffsetPx (undoable) and re-routes the
    // leader (CURS-L1-005). A plain click that never drags just selects.
    const annotation = this.store
      .getDocument()
      .annotations?.find((candidate) => candidate.id === annotationHit.annotationId);
    if (annotationHit.region === 'body' && annotation !== undefined && isComment(annotation)) {
      this.selectAnnotation(annotationHit.annotationId);
      this.gesture = {
        mode: 'comment-move',
        annotationId: annotationHit.annotationId,
        baseline: this.store.getDocument(),
        startWorldX: worldX,
        startWorldY: worldY,
        moved: false,
      };
      return;
    }
    this.selectAnnotation(annotationHit.annotationId);
  }

  private beginMarquee(
    event: PointerEvent,
    worldX: number,
    worldY: number,
    additive: boolean,
  ): void {
    this.consume(event);
    this.gesture = {
      mode: 'marquee',
      startWorldX: worldX,
      startWorldY: worldY,
      additive,
      moved: false,
    };
  }

  private beginCreate(event: PointerEvent, worldX: number, worldY: number): void {
    const shape = this.pendingCreateShape;
    if (shape === null) {
      return;
    }
    const rowIndex = this.rowIndexAtWorldY(worldY);
    const row = this.rowAtIndex(rowIndex);
    const rowId = row?.id ?? null;
    if (rowId === null) {
      return;
    }
    this.consume(event);
    this.gesture = {
      mode: 'create',
      shape,
      rowId,
      target: this.createTargetForRow(row),
      rowIndex,
      startWorldX: worldX,
    };
  }

  private beginItemGesture(
    event: PointerEvent,
    hit: ItemHit,
    worldX: number,
    worldY: number,
  ): void {
    this.consume(event);
    const baseline = this.store.getDocument();
    this.setSelection(new Set([hit.itemId]));
    // M-02: collect snap baselines ONCE here; they are invariant for the drag. Use
    // the LIVE zoom so the baselines share the world space of the dragged worldX.
    const baselinesX = collectStartDateBaselinesX(
      baseline.items,
      hit.itemId,
      baseline.epochDate,
      this.liveViewState().zoomX,
    );

    if (hit.region === 'label') {
      const item = this.findItem(baseline, hit.itemId);
      const offset = item?.labelOffset ?? { dx: 0, dy: 0 };
      this.gesture = {
        mode: 'label',
        itemId: hit.itemId,
        baseline,
        startWorldX: worldX,
        startWorldY: worldY,
        baseDx: offset.dx,
        baseDy: offset.dy,
        moved: false,
      };
      return;
    }
    if (hit.region === 'fade-in' || hit.region === 'fade-out') {
      this.gesture = {
        mode: 'fade',
        itemId: hit.itemId,
        edge: hit.region,
        baseline,
        startWorldX: worldX,
        moved: false,
      };
      return;
    }
    if (hit.region === 'resize-start' || hit.region === 'resize-end') {
      const edge: ResizeEdge = hit.region === 'resize-start' ? 'start' : 'end';
      this.gesture = {
        mode: 'resize',
        itemId: hit.itemId,
        edge,
        baseline,
        startWorldX: worldX,
        edgeWorldX: worldX,
        baselinesX,
        moved: false,
      };
      return;
    }
    const item = this.findItem(baseline, hit.itemId);
    const originalStartX =
      item === null ? worldX : dateToWorldX(item.startDate, baseline.epochDate, this.liveViewState().zoomX);
    this.gesture = {
      mode: 'move',
      itemId: hit.itemId,
      baseline,
      startWorldX: worldX,
      startWorldY: worldY,
      originalStartX,
      baselinesX,
      moved: false,
    };
  }

  private handlePointerMove(event: PointerEvent): void {
    const gesture = this.gesture;
    if (gesture === null || event.pointerId !== this.activePointerId) {
      return;
    }
    this.consume(event);
    const world = this.renderer.screenToWorld(event.clientX, event.clientY);
    switch (gesture.mode) {
      case 'move':
        this.previewMove(gesture, world.worldX, world.worldY);
        break;
      case 'resize':
        this.previewResize(gesture, world.worldX);
        break;
      case 'fade':
        this.previewFade(gesture, world.worldX);
        break;
      case 'label':
        this.previewLabel(gesture, world.worldX, world.worldY);
        break;
      case 'create':
        this.previewCreate(gesture, world.worldX);
        break;
      case 'marquee':
        this.previewMarquee(gesture, world.worldX, world.worldY);
        break;
      case 'annotation-resize':
        this.previewAnnotationResize(gesture, world.worldX, world.worldY);
        break;
      case 'comment-move':
        this.previewCommentMove(gesture, world.worldX, world.worldY);
        break;
      default:
        break;
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    const gesture = this.gesture;
    if (gesture === null || event.pointerId !== this.activePointerId) {
      return;
    }
    event.stopPropagation();
    this.gesture = null;
    this.activePointerId = null;
    this.renderer.showAlignmentGuide(null);
    this.renderer.showCreatePreview(null);
    this.renderer.showDependencyPreview(null);
    this.renderer.showMarquee(null);
    const world = this.renderer.screenToWorld(event.clientX, event.clientY);

    switch (gesture.mode) {
      case 'move':
        this.commitMove(gesture, world.worldX, world.worldY);
        break;
      case 'resize':
        this.commitResize(gesture, world.worldX);
        break;
      case 'fade':
        this.commitFade(gesture, world.worldX);
        break;
      case 'label':
        this.commitLabel(gesture, world.worldX, world.worldY);
        break;
      case 'create':
        this.commitCreate(gesture, world.worldX);
        break;
      case 'marquee':
        this.commitMarquee(gesture, world.worldX, world.worldY);
        break;
      case 'annotation-resize':
        this.commitAnnotationResize(gesture, world.worldX, world.worldY);
        break;
      case 'comment-move':
        this.commitCommentMove(gesture, world.worldX, world.worldY);
        break;
      default:
        break;
    }
    const host = this.renderer.getHostElement();
    if (host !== null) {
      host.style.cursor = 'default';
    }
  }

  // ----- move -----------------------------------------------------------------

  private previewMove(gesture: MoveGesture, worldX: number, worldY: number): void {
    const command = this.buildMoveCommand(gesture, worldX, worldY);
    if (command === null) {
      return;
    }
    if (Math.abs(worldX - gesture.startWorldX) > DRAG_THRESHOLD_PX) {
      gesture.moved = true;
    }
    this.renderer.updateItems(command.command.execute(gesture.baseline));
    this.renderer.showAlignmentGuide(command.guideWorldX);
  }

  private commitMove(gesture: MoveGesture, worldX: number, worldY: number): void {
    if (!gesture.moved) {
      this.renderer.updateItems(gesture.baseline);
      return;
    }
    const command = this.buildMoveCommand(gesture, worldX, worldY);
    this.renderer.updateItems(gesture.baseline);
    if (command !== null) {
      this.store.dispatch(command.command);
      log.debug('move_committed', { item_id: gesture.itemId, command_label: command.command.label });
    }
  }

  private buildMoveCommand(
    gesture: MoveGesture,
    worldX: number,
    worldY: number,
  ): { command: ScheduleCommand; guideWorldX: number | null } | null {
    const { zoomX } = this.liveViewState();
    const deltaWorldX = worldX - gesture.startWorldX;
    const proposedStartX = gesture.originalStartX + deltaWorldX;
    const snap = snapToNearestBaseline(proposedStartX, gesture.baselinesX, DEFAULT_SNAP_THRESHOLD_PX);
    const effectiveDeltaX = snap.value - gesture.originalStartX;
    const deltaDays = Math.round(effectiveDeltaX / pixelsPerDay(zoomX));
    const rowIndex = this.rowIndexAtWorldY(worldY);
    const targetRow = this.rowAtIndex(rowIndex);
    const targetCategory = this.categoryTargetForRow(targetRow);
    return {
      command: moveItemCommand(
        gesture.itemId,
        deltaDays,
        targetCategory === null ? (targetRow?.id ?? undefined) : undefined,
        targetCategory === null ? undefined : targetCategory,
      ),
      guideWorldX: snap.snapped ? snap.baseline : null,
    };
  }

  // ----- resize ---------------------------------------------------------------

  private previewResize(gesture: ResizeGesture, worldX: number): void {
    const command = this.buildResizeCommand(gesture, worldX);
    if (Math.abs(worldX - gesture.startWorldX) > DRAG_THRESHOLD_PX) {
      gesture.moved = true;
    }
    this.renderer.updateItems(command.command.execute(gesture.baseline));
    this.renderer.showAlignmentGuide(command.guideWorldX);
  }

  private commitResize(gesture: ResizeGesture, worldX: number): void {
    if (!gesture.moved) {
      this.renderer.updateItems(gesture.baseline);
      return;
    }
    const command = this.buildResizeCommand(gesture, worldX);
    this.renderer.updateItems(gesture.baseline);
    this.store.dispatch(command.command);
    log.debug('resize_committed', { item_id: gesture.itemId, edge: gesture.edge });
  }

  private buildResizeCommand(
    gesture: ResizeGesture,
    worldX: number,
  ): { command: ScheduleCommand; guideWorldX: number | null } {
    const { zoomX } = this.liveViewState();
    const snap = snapToNearestBaseline(worldX, gesture.baselinesX, DEFAULT_SNAP_THRESHOLD_PX);
    const effectiveX = snap.snapped ? snap.value : worldX;
    const deltaDays = Math.round((effectiveX - gesture.edgeWorldX) / pixelsPerDay(zoomX));
    return {
      command: resizeItemCommand(gesture.itemId, gesture.edge, deltaDays),
      guideWorldX: snap.snapped ? snap.baseline : null,
    };
  }

  // ----- fade (corner taper) --------------------------------------------------

  private previewFade(gesture: FadeGesture, worldX: number): void {
    const command = this.buildFadeCommand(gesture, worldX);
    if (Math.abs(worldX - gesture.startWorldX) > DRAG_THRESHOLD_PX) {
      gesture.moved = true;
    }
    if (command === null) {
      this.renderer.updateItems(gesture.baseline);
      return;
    }
    this.renderer.updateItems(command.execute(gesture.baseline));
  }

  private commitFade(gesture: FadeGesture, worldX: number): void {
    if (!gesture.moved) {
      this.renderer.updateItems(gesture.baseline);
      return;
    }
    const command = this.buildFadeCommand(gesture, worldX);
    this.renderer.updateItems(gesture.baseline);
    if (command !== null) {
      this.store.dispatch(command);
      log.debug('fade_committed', { item_id: gesture.itemId, edge: gesture.edge });
    }
  }

  /**
   * Build the undoable command that sets a task's fade-in or fade-out from a corner
   * pointer x. Dragging the top-left corner RIGHT increases fade-in; dragging the
   * bottom-right corner LEFT increases fade-out. Each side is clamped to
   * `[0, length - otherFade]` so the trapezoid never crosses. Uses the LIVE zoom
   * (liveViewState) so the day mapping matches the drawn geometry. Null when the
   * item is not a spanning task.
   */
  private buildFadeCommand(gesture: FadeGesture, worldX: number): ScheduleCommand | null {
    const document = gesture.baseline;
    const item = this.findItem(document, gesture.itemId);
    if (item === null || item.itemKind !== 'task' || item.endDate === null) {
      return null;
    }
    const { zoomX } = this.liveViewState();
    const startDay = toDayNumber(item.startDate);
    const endDay = toDayNumber(item.endDate);
    const lengthDays = endDay - startDay;
    const dayAtPointer = toDayNumber(worldXToDate(worldX, document.epochDate, zoomX));
    if (gesture.edge === 'fade-in') {
      const fadeInDays = fadeInDaysFromPointer(dayAtPointer, startDay, lengthDays, item.fadeOutDays ?? 0);
      return editPropertyCommand(gesture.itemId, { fadeInDays });
    }
    const fadeOutDays = fadeOutDaysFromPointer(dayAtPointer, endDay, lengthDays, item.fadeInDays ?? 0);
    return editPropertyCommand(gesture.itemId, { fadeOutDays });
  }

  // ----- label drag -----------------------------------------------------------

  private previewLabel(gesture: LabelGesture, worldX: number, worldY: number): void {
    if (
      Math.abs(worldX - gesture.startWorldX) > DRAG_THRESHOLD_PX ||
      Math.abs(worldY - gesture.startWorldY) > DRAG_THRESHOLD_PX
    ) {
      gesture.moved = true;
    }
    this.renderer.updateItems(this.buildLabelCommand(gesture, worldX, worldY).execute(gesture.baseline));
  }

  private commitLabel(gesture: LabelGesture, worldX: number, worldY: number): void {
    if (!gesture.moved) {
      this.renderer.updateItems(gesture.baseline);
      return;
    }
    const command = this.buildLabelCommand(gesture, worldX, worldY);
    this.renderer.updateItems(gesture.baseline);
    this.store.dispatch(command);
    log.debug('label_moved', { item_id: gesture.itemId });
  }

  private buildLabelCommand(gesture: LabelGesture, worldX: number, worldY: number): ScheduleCommand {
    const dx = gesture.baseDx + (worldX - gesture.startWorldX);
    const dy = gesture.baseDy + (worldY - gesture.startWorldY);
    return {
      label: 'move-label',
      execute: (document) => ({
        ...document,
        items: document.items.map((item) =>
          item.id === gesture.itemId ? { ...item, labelOffset: { dx, dy } } : item,
        ),
      }),
    };
  }

  // ----- create ---------------------------------------------------------------

  private previewCreate(gesture: CreateGesture, worldX: number): void {
    if (gesture.shape.itemKind === 'milestone') {
      return;
    }
    const bandTop = this.rowBandTop(gesture.rowIndex);
    const left = Math.min(gesture.startWorldX, worldX);
    const width = Math.abs(worldX - gesture.startWorldX);
    this.renderer.showCreatePreview({
      worldX: left,
      worldY: bandTop,
      worldWidth: width,
      worldHeight: rowBandHeight(this.liveViewState().zoomY) * 0.4,
    });
  }

  private commitCreate(gesture: CreateGesture, worldX: number): void {
    const document = this.store.getDocument();
    const { epochDate } = document;
    const zoomX = this.liveViewState().zoomX;
    const startDate = worldXToDate(gesture.startWorldX, epochDate, zoomX);
    const item = this.buildNewItem(gesture, startDate, worldX, epochDate, zoomX);
    this.store.dispatch(createItemCommand(item));
    this.setSelection(new Set([item.id]));
    this.setPendingCreateShape(null);
    log.debug('item_created', { item_id: item.id, item_kind: item.itemKind });
  }

  private buildNewItem(
    gesture: CreateGesture,
    startDate: string,
    worldX: number,
    epochDate: string,
    zoomX: number,
  ): ScheduleItem {
    const id = `item-new-${Date.now()}-${this.nextItemSerial++}`;
    const base = {
      id,
      rowId: gesture.rowId,
      startDate,
      abbrev: gesture.shape.itemKind === 'milestone' ? 'M' : 'T',
      importance: 1,
      fillColor: DEFAULT_FILL_COLOR,
      strokeColor: DEFAULT_STROKE_COLOR,
      lineWeight: 'medium' as const,
      ...categoryFields(gesture.target),
    };
    if (gesture.shape.itemKind === 'milestone') {
      return {
        ...base,
        itemKind: 'milestone',
        endDate: null,
        milestoneShape: gesture.shape.milestoneShape,
        iconShapeKind: iconShapeKindForCreate('milestone', gesture.shape.milestoneShape, undefined),
      };
    }
    const startDay = toDayNumber(startDate);
    const endDay = Math.max(
      startDay + 1,
      toDayNumber(worldXToDate(worldX, epochDate, zoomX)),
    );
    return {
      ...base,
      itemKind: 'task',
      endDate: fromDayNumber(endDay),
      taskShape: gesture.shape.taskShape,
      iconShapeKind: iconShapeKindForCreate('task', undefined, gesture.shape.taskShape),
    };
  }

  // ----- marquee (rubber-band) selection --------------------------------------

  private previewMarquee(gesture: MarqueeGesture, worldX: number, worldY: number): void {
    if (
      Math.abs(worldX - gesture.startWorldX) > DRAG_THRESHOLD_PX ||
      Math.abs(worldY - gesture.startWorldY) > DRAG_THRESHOLD_PX
    ) {
      gesture.moved = true;
    }
    if (!gesture.moved) {
      return;
    }
    this.renderer.showMarquee(marqueeWorldRect(gesture, worldX, worldY));
  }

  private commitMarquee(gesture: MarqueeGesture, worldX: number, worldY: number): void {
    this.renderer.showMarquee(null);
    if (!gesture.moved) {
      // A plain click on empty canvas: clear all selections (unless Shift-additive).
      if (!gesture.additive) {
        this.clearSelection();
        this.clearAnnotationSelection();
        this.clearDependencySelection();
      }
      return;
    }
    const framedIds = this.renderer.itemsIntersectingWorldRect(
      marqueeWorldRect(gesture, worldX, worldY),
    );
    const next = gesture.additive
      ? new Set<string>([...this.selectedItemIds, ...framedIds])
      : new Set<string>(framedIds);
    this.setSelection(next);
    log.debug('marquee_select', { framed_count: framedIds.length, additive: gesture.additive });
  }

  // ----- annotation (rounded-box) resize --------------------------------------

  private previewAnnotationResize(
    gesture: AnnotationResizeGesture,
    worldX: number,
    worldY: number,
  ): void {
    if (
      Math.abs(worldX - gesture.startWorldX) > DRAG_THRESHOLD_PX ||
      Math.abs(worldY - gesture.startWorldY) > DRAG_THRESHOLD_PX
    ) {
      gesture.moved = true;
    }
    const command = this.buildAnnotationResizeCommand(gesture, worldX, worldY);
    this.renderer.updateItems(command.execute(gesture.baseline));
  }

  private commitAnnotationResize(
    gesture: AnnotationResizeGesture,
    worldX: number,
    worldY: number,
  ): void {
    if (!gesture.moved) {
      this.renderer.updateItems(gesture.baseline);
      return;
    }
    const command = this.buildAnnotationResizeCommand(gesture, worldX, worldY);
    this.renderer.updateItems(gesture.baseline);
    this.store.dispatch(command);
    log.debug('annotation_resized', { annotation_id: gesture.annotationId, corner: gesture.corner });
  }

  // ----- comment (bubble) move ------------------------------------------------

  private previewCommentMove(gesture: CommentMoveGesture, worldX: number, worldY: number): void {
    if (
      Math.abs(worldX - gesture.startWorldX) > DRAG_THRESHOLD_PX ||
      Math.abs(worldY - gesture.startWorldY) > DRAG_THRESHOLD_PX
    ) {
      gesture.moved = true;
    }
    const command = this.buildCommentMoveCommand(gesture, worldX, worldY);
    this.renderer.updateItems(command.execute(gesture.baseline));
  }

  private commitCommentMove(gesture: CommentMoveGesture, worldX: number, worldY: number): void {
    if (!gesture.moved) {
      this.renderer.updateItems(gesture.baseline);
      return;
    }
    const command = this.buildCommentMoveCommand(gesture, worldX, worldY);
    this.renderer.updateItems(gesture.baseline);
    this.store.dispatch(command);
    log.debug('comment_moved', { annotation_id: gesture.annotationId });
  }

  private buildCommentMoveCommand(
    gesture: CommentMoveGesture,
    worldX: number,
    worldY: number,
  ): ScheduleCommand {
    // World px == screen px (content group is only translated), so the world delta
    // is the bubble-offset delta applied to the baseline document.
    return moveCommentCommand(gesture.annotationId, {
      dx: worldX - gesture.startWorldX,
      dy: worldY - gesture.startWorldY,
    });
  }

  private buildAnnotationResizeCommand(
    gesture: AnnotationResizeGesture,
    worldX: number,
    worldY: number,
  ): ScheduleCommand {
    const document = gesture.baseline;
    const zoomX = this.renderer.getViewState().zoomX;
    const date = worldXToDate(worldX, document.epochDate, zoomX);
    const rawRowIndex = Math.max(0, this.renderer.rowIndexAtWorldY(worldY));
    // Single-section constraint (user choice): a rounded box may not span sections.
    // The dragged edge is clamped into the band that holds the box's FIXED edge.
    const bands = this.sectionBands();
    const box = document.annotations?.find(
      (annotation) => annotation.id === gesture.annotationId,
    );
    const fixedRowIndex =
      box !== undefined && box.annotationKind === 'rounded-box'
        ? gesture.corner === 'nw' || gesture.corner === 'ne'
          ? box.bottomRowIndex
          : box.topRowIndex
        : rawRowIndex;
    const rowIndex = clampRowIndexToSection(bands, fixedRowIndex, rawRowIndex);
    const patch: RoundedBoxRectPatch =
      gesture.corner === 'nw'
        ? { startDate: date, topRowIndex: rowIndex }
        : gesture.corner === 'ne'
          ? { endDate: date, topRowIndex: rowIndex }
          : gesture.corner === 'sw'
            ? { startDate: date, bottomRowIndex: rowIndex }
            : { endDate: date, bottomRowIndex: rowIndex };
    return resizeRoundedBoxCommand(gesture.annotationId, patch);
  }

  // ----- geometry helpers -----------------------------------------------------

  /**
   * The DISPLAY rows actually laid out for the current vertical zoom: section
   * order, collapsed sections omitted, then the vertical-LOD collapse (minor ->
   * middle -> major) applied so row indices match exactly what the renderer draws.
   */
  private visibleRows(): Row[] {
    const document = this.store.getDocument();
    const visible0 = orderedVisibleRows(document.sections, document.rows);
    return collapseRows(visible0, classificationCollapseLevel(this.liveViewState().zoomY)).rows;
  }

  /** The section bands over the current display rows (for the box single-section clamp). */
  private sectionBands(): SectionBand[] {
    return contiguousSectionBands(this.visibleRows(), this.store.getDocument().sections);
  }

  /** Map a level-0 (stored) item rowId to its current display row id. */
  private displayRowIdOf(rowId: string): string {
    const document = this.store.getDocument();
    const visible0 = orderedVisibleRows(document.sections, document.rows);
    return (
      collapseRows(visible0, classificationCollapseLevel(this.liveViewState().zoomY)).rowIdToDisplayId.get(
        rowId,
      ) ?? rowId
    );
  }

  /** The classification target that places a new/moved item onto a display row. */
  private categoryTargetForRow(row: Row | undefined): ClassificationTarget | null {
    if (row?.majorLabel === undefined) {
      return null;
    }
    return {
      major: row.majorLabel,
      ...(row.middleLabel !== undefined ? { middle: row.middleLabel } : {}),
      ...(row.minorLabel !== undefined ? { minor: row.minorLabel } : {}),
    };
  }

  /**
   * The classification a NEWLY CREATED item on `row` should adopt (middle
   * auto-default). It inherits the row's own category, but a bare-major row (no
   * track) auto-assigns the section's first/default track -- creating a `NoneN`
   * track when the section has none -- so a new item never floats at the bare-major
   * level. Never hard-blocks creation. Distinct from {@link categoryTargetForRow}
   * (used for MOVE/nudge), which must not silently re-classify a dragged item.
   */
  private createTargetForRow(row: Row | undefined): ClassificationTarget | null {
    const base = this.categoryTargetForRow(row);
    if (base === null || base.middle !== undefined) {
      return base;
    }
    const middle = defaultMiddleForMajor(this.store.getDocument(), base.major);
    return { major: base.major, middle };
  }

  private rowIndexAtWorldY(worldY: number): number {
    // Resolve against the renderer's variable-height row geometry (item: multi-lane
    // stacking) so a create/move targets the row actually drawn under the pointer,
    // even when a tall (multi-lane) row shifted the ones below it down.
    const index = this.renderer.rowIndexAtWorldY(worldY);
    const rowCount = this.visibleRows().length;
    return Math.min(Math.max(index, 0), Math.max(0, rowCount - 1));
  }

  private rowBandTop(rowIndex: number): number {
    return this.renderer.rowBandTopWorldY(rowIndex) + 4;
  }

  private rowAtIndex(rowIndex: number): Row | undefined {
    return this.visibleRows()[rowIndex];
  }

  private findItem(document: ScheduleDocument, itemId: string): ScheduleItem | null {
    return document.items.find((item) => item.id === itemId) ?? null;
  }

  private consume(event: PointerEvent): void {
    event.stopPropagation();
    if (event.type === 'pointerdown') {
      this.activePointerId = event.pointerId;
      const host = this.renderer.getHostElement();
      host?.setPointerCapture(event.pointerId);
    }
  }
}

/** The normalized world-space rectangle a marquee drag currently spans. */
function marqueeWorldRect(
  gesture: MarqueeGesture,
  worldX: number,
  worldY: number,
): { worldX: number; worldY: number; worldWidth: number; worldHeight: number } {
  const left = Math.min(gesture.startWorldX, worldX);
  const top = Math.min(gesture.startWorldY, worldY);
  return {
    worldX: left,
    worldY: top,
    worldWidth: Math.abs(worldX - gesture.startWorldX),
    worldHeight: Math.abs(worldY - gesture.startWorldY),
  };
}

/** Trimmed non-empty string, or undefined. */
function nonBlank(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined;
}

/** Build a classification target from an item's own categories, or null when it has no major. */
function classificationTargetOfItem(item: ScheduleItem): ClassificationTarget | null {
  const major = nonBlank(item.majorCategory);
  if (major === undefined) {
    return null;
  }
  const middle = nonBlank(item.middleCategory);
  const minor = middle === undefined ? undefined : nonBlank(item.minorCategory);
  return {
    major,
    ...(middle !== undefined ? { middle } : {}),
    ...(minor !== undefined ? { minor } : {}),
  };
}

/** Spread the category fields for a new item from a classification target (or nothing). */
function categoryFields(
  target: ClassificationTarget | null,
): { majorCategory?: string; middleCategory?: string; minorCategory?: string } {
  if (target === null) {
    return {};
  }
  return {
    majorCategory: target.major,
    ...(target.middle !== undefined ? { middleCategory: target.middle } : {}),
    ...(target.minor !== undefined ? { minorCategory: target.minor } : {}),
  };
}

/** Map an annotation resize-handle region to its box corner. */
function cornerOf(region: AnnotationHit['region']): BoxCorner {
  switch (region) {
    case 'resize-nw':
      return 'nw';
    case 'resize-ne':
      return 'ne';
    case 'resize-sw':
      return 'sw';
    case 'resize-se':
    default:
      return 'se';
  }
}

/** Map an annotation resize-handle region to a diagonal resize cursor. */
function cornerCursor(region: AnnotationHit['region']): string {
  return region === 'resize-nw' || region === 'resize-se' ? 'nwse-resize' : 'nesw-resize';
}
