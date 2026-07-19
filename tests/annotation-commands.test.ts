import { describe, expect, it } from 'vitest';
import type {
  CommentAnnotation,
  RoundedBoxAnnotation,
} from '../src/domain/model/annotation.js';
import type { ScheduleDocument } from '../src/domain/model/schedule-model.js';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import {
  createCommentCommand,
  createRoundedBoxCommand,
  deleteAnnotationCommand,
  moveCommentAnchorCommand,
  moveCommentCommand,
  recolorRoundedBoxCommand,
  resizeRoundedBoxCommand,
} from '../src/domain/command/annotation-commands.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';

function emptyDocument(): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'test',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [],
    rows: [],
    items: [],
  };
}

const comment: CommentAnnotation = {
  id: 'c1',
  annotationKind: 'callout-box',
  text: 'hello',
  anchorDate: '2026-02-01',
  anchorRowIndex: 0,
  bodyOffsetPx: { dx: 40, dy: -30 },
};

const box: RoundedBoxAnnotation = {
  id: 'b1',
  annotationKind: 'rounded-box',
  startDate: '2026-02-01',
  endDate: '2026-03-01',
  topRowIndex: 0,
  bottomRowIndex: 2,
  strokeColor: '#cc3311',
  cornerRadiusPx: 10,
};

describe('annotation creation is undoable through the M2 store (CURS-L1-005/006/007)', () => {
  it('creates a comment and undo removes it', () => {
    const store = new ScheduleStore(emptyDocument());
    store.dispatch(createCommentCommand(comment));
    expect(store.getDocument().annotations).toHaveLength(1);
    store.undo();
    expect(store.getDocument().annotations ?? []).toHaveLength(0);
    store.redo();
    expect(store.getDocument().annotations).toHaveLength(1);
  });

  it('creates a rounded box (undoable) alongside existing annotations', () => {
    const store = new ScheduleStore(emptyDocument());
    store.dispatch(createCommentCommand(comment));
    store.dispatch(createRoundedBoxCommand(box));
    expect(store.getDocument().annotations).toHaveLength(2);
    store.undo();
    expect(store.getDocument().annotations).toHaveLength(1);
    expect(store.getDocument().annotations?.[0]?.id).toBe('c1');
  });
});

describe('annotation edits (CURS-L1-005/007)', () => {
  it('moves a comment body by a screen-pixel delta', () => {
    const store = new ScheduleStore({ ...emptyDocument(), annotations: [comment] });
    store.dispatch(moveCommentCommand('c1', { dx: 10, dy: 5 }));
    const moved = store.getDocument().annotations?.[0] as CommentAnnotation;
    expect(moved.bodyOffsetPx).toEqual({ dx: 50, dy: -25 });
  });

  it('treats a zero move as a no-op (no history entry)', () => {
    const store = new ScheduleStore({ ...emptyDocument(), annotations: [comment] });
    store.dispatch(moveCommentCommand('c1', { dx: 0, dy: 0 }));
    expect(store.canUndo()).toBe(false);
  });

  it('moves a comment leader anchor to a new free world point (undoable)', () => {
    const store = new ScheduleStore({ ...emptyDocument(), annotations: [comment] });
    store.dispatch(moveCommentAnchorCommand('c1', { anchorDate: '2026-04-15', anchorRowIndex: 3 }));
    const moved = store.getDocument().annotations?.[0] as CommentAnnotation;
    expect(moved.anchorDate).toBe('2026-04-15');
    expect(moved.anchorRowIndex).toBe(3);
    // The bubble offset is untouched; only the anchor moved.
    expect(moved.bodyOffsetPx).toEqual({ dx: 40, dy: -30 });
    store.undo();
    const reverted = store.getDocument().annotations?.[0] as CommentAnnotation;
    expect(reverted.anchorDate).toBe('2026-02-01');
    expect(reverted.anchorRowIndex).toBe(0);
  });

  it('detaches an item-bound anchor when the anchor is dragged to a free point', () => {
    const itemBound: CommentAnnotation = {
      ...comment,
      id: 'c-bound',
      anchorItemId: 'item-x',
      anchorPoint: 5,
    };
    const store = new ScheduleStore({ ...emptyDocument(), annotations: [itemBound] });
    store.dispatch(moveCommentAnchorCommand('c-bound', { anchorDate: '2026-05-01', anchorRowIndex: 2 }));
    const moved = store.getDocument().annotations?.[0] as CommentAnnotation;
    expect(moved.anchorItemId).toBeUndefined();
    expect(moved.anchorPoint).toBeUndefined();
    expect(moved.anchorDate).toBe('2026-05-01');
    expect(moved.anchorRowIndex).toBe(2);
  });

  it('round-trips a moved anchor through the JSON codec', () => {
    const document: ScheduleDocument = {
      ...emptyDocument(),
      projectId: '00000000-0000-4000-8000-0000000000aa',
      annotations: [comment],
    };
    const store = new ScheduleStore(document);
    store.dispatch(moveCommentAnchorCommand('c1', { anchorDate: '2026-06-20', anchorRowIndex: 4 }));
    const restored = deserializeScheduleDocument(
      serializeScheduleDocument(store.getDocument()),
    );
    const restoredComment = restored.annotations?.[0] as CommentAnnotation;
    expect(restoredComment.anchorDate).toBe('2026-06-20');
    expect(restoredComment.anchorRowIndex).toBe(4);
  });

  it('recolors a rounded box and skips a no-op recolor', () => {
    const store = new ScheduleStore({ ...emptyDocument(), annotations: [box] });
    store.dispatch(recolorRoundedBoxCommand('b1', '#009e73'));
    expect((store.getDocument().annotations?.[0] as RoundedBoxAnnotation).strokeColor).toBe(
      '#009e73',
    );
    store.dispatch(recolorRoundedBoxCommand('b1', '#009e73'));
    // second identical recolor is a no-op: only the first is undoable.
    store.undo();
    expect((store.getDocument().annotations?.[0] as RoundedBoxAnnotation).strokeColor).toBe(
      '#cc3311',
    );
  });

  it('deletes an annotation by id (undoable)', () => {
    const store = new ScheduleStore({ ...emptyDocument(), annotations: [comment, box] });
    store.dispatch(deleteAnnotationCommand('c1'));
    expect(store.getDocument().annotations).toHaveLength(1);
    store.undo();
    expect(store.getDocument().annotations).toHaveLength(2);
  });
});

describe('rounded-box resize is undoable and zoom-invariant (CURS-L1-007 / L2-001)', () => {
  it('resizes the end edge + top row and undo restores the bounds', () => {
    const store = new ScheduleStore({ ...emptyDocument(), annotations: [box] });
    store.dispatch(
      resizeRoundedBoxCommand('b1', { endDate: '2026-04-01', topRowIndex: 1 }),
    );
    const resized = store.getDocument().annotations?.[0] as RoundedBoxAnnotation;
    expect(resized.endDate).toBe('2026-04-01');
    expect(resized.topRowIndex).toBe(1);
    expect(resized.bottomRowIndex).toBe(2);
    // The corner radius is untouched, so it stays a fixed screen-pixel value.
    expect(resized.cornerRadiusPx).toBe(10);
    store.undo();
    expect((store.getDocument().annotations?.[0] as RoundedBoxAnnotation).endDate).toBe('2026-03-01');
  });

  it('normalizes a handle dragged past the opposite edge (flips start/end)', () => {
    const store = new ScheduleStore({ ...emptyDocument(), annotations: [box] });
    // Drag the start handle to after the end date: the command flips them.
    store.dispatch(resizeRoundedBoxCommand('b1', { startDate: '2026-05-01' }));
    const flipped = store.getDocument().annotations?.[0] as RoundedBoxAnnotation;
    expect(flipped.startDate).toBe('2026-03-01');
    expect(flipped.endDate).toBe('2026-05-01');
  });

  it('clamps row indices to be non-negative', () => {
    const store = new ScheduleStore({ ...emptyDocument(), annotations: [box] });
    store.dispatch(resizeRoundedBoxCommand('b1', { topRowIndex: -5 }));
    const clamped = store.getDocument().annotations?.[0] as RoundedBoxAnnotation;
    expect(clamped.topRowIndex).toBe(0);
  });

  it('treats an unchanged resize as a no-op (no history entry)', () => {
    const store = new ScheduleStore({ ...emptyDocument(), annotations: [box] });
    store.dispatch(
      resizeRoundedBoxCommand('b1', { startDate: '2026-02-01', endDate: '2026-03-01' }),
    );
    expect(store.canUndo()).toBe(false);
  });
});
