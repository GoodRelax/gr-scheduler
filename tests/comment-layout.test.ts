/**
 * Coverage for the comment position model (CURS-L1-005/006): item-anchored vs
 * free anchor, leader-line re-routing from the bubble's nearest edge, and the
 * item-follow behavior. These are the pure functions the SVG renderer projects; the
 * live rendered-DOM behavior is asserted in tests/e2e/watermark-comments-batch.spec.ts.
 */

import { describe, expect, it } from 'vitest';
import type { Rect } from '../src/domain/usecase/dependency-router.js';
import {
  DEFAULT_COMMENT_ANCHOR_POINT,
  commentLeaderEndpoints,
  nearestPointOnRect,
  resolveItemAnchorPoint,
} from '../src/domain/usecase/comment-layout.js';
import type { CommentAnnotation } from '../src/domain/model/annotation.js';
import type { ScheduleDocument } from '../src/domain/model/schedule-model.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';

describe('resolveItemAnchorPoint: the anchor follows the item box (CURS-L1-005)', () => {
  const rect: Rect = { x: 100, y: 50, width: 80, height: 20 };

  it('places the anchor at the requested 9-point of the item box', () => {
    // Center (4).
    expect(resolveItemAnchorPoint(rect, 4)).toEqual({ x: 140, y: 60 });
    // Top-left (0) and bottom-right (8).
    expect(resolveItemAnchorPoint(rect, 0)).toEqual({ x: 100, y: 50 });
    expect(resolveItemAnchorPoint(rect, 8)).toEqual({ x: 180, y: 70 });
  });

  it('defaults to the CENTER anchor when none is given', () => {
    expect(DEFAULT_COMMENT_ANCHOR_POINT).toBe(4);
    expect(resolveItemAnchorPoint(rect, undefined)).toEqual({ x: 140, y: 60 });
  });

  it('FOLLOWS the item: moving the item box moves the resolved anchor', () => {
    const before = resolveItemAnchorPoint(rect, 4);
    // The item moved right by 200 and down by 30 (its rect is recomputed each frame).
    const movedRect: Rect = { x: 300, y: 80, width: 80, height: 20 };
    const after = resolveItemAnchorPoint(movedRect, 4);
    expect(after.x - before.x).toBe(200);
    expect(after.y - before.y).toBe(30);
  });
});

describe('commentLeaderEndpoints: leader from bubble nearest edge -> anchor (CURS-L1-006)', () => {
  const bubble: Rect = { x: 200, y: 100, width: 60, height: 20 };

  it('starts at the bubble edge nearest the anchor and ends exactly on the anchor', () => {
    const anchor = { x: 100, y: 110 }; // left of the bubble, vertically inside it.
    const { fromBubble, toAnchor } = commentLeaderEndpoints(bubble, anchor);
    // Nearest point is on the bubble's LEFT edge at the anchor's y.
    expect(fromBubble).toEqual({ x: 200, y: 110 });
    expect(toAnchor).toEqual(anchor);
  });

  it('RE-ROUTES when the bubble moves: the leader start tracks the moved bubble', () => {
    const anchor = { x: 100, y: 110 };
    const start = commentLeaderEndpoints(bubble, anchor).fromBubble;
    // The bubble is dragged right by 150 (bodyOffsetPx changed); the nearest edge moves.
    const movedBubble: Rect = { x: 350, y: 100, width: 60, height: 20 };
    const moved = commentLeaderEndpoints(movedBubble, anchor).fromBubble;
    expect(moved.x).toBe(350);
    expect(moved.x).not.toBe(start.x);
    // The leader still ends on the SAME anchor.
    expect(commentLeaderEndpoints(movedBubble, anchor).toAnchor).toEqual(anchor);
  });

  it('nearestPointOnRect clamps a corner-diagonal anchor to the nearest corner', () => {
    // Anchor above-left of the bubble -> the top-left corner is nearest.
    expect(nearestPointOnRect(bubble, { x: 0, y: 0 })).toEqual({ x: 200, y: 100 });
    // Anchor below-right -> the bottom-right corner.
    expect(nearestPointOnRect(bubble, { x: 999, y: 999 })).toEqual({ x: 260, y: 120 });
  });
});

describe('comment anchor fields round-trip through the JSON codec (CURS-L1-005)', () => {
  function documentWithComment(comment: CommentAnnotation): ScheduleDocument {
    return {
      schemaVersion: 1,
      title: 'comment round-trip',
      epochDate: '2026-01-01',
      viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
      sections: [],
      rows: [],
      items: [],
      annotations: [comment],
    };
  }

  it('preserves anchorItemId + anchorPoint + bodyOffsetPx (item-anchored)', () => {
    const comment: CommentAnnotation = {
      id: 'c-item',
      annotationKind: 'callout-box',
      text: 'follows the item',
      anchorDate: '2026-02-01',
      anchorRowIndex: 3,
      anchorItemId: 'item-42',
      anchorPoint: 5,
      bodyOffsetPx: { dx: 48, dy: -36 },
    };
    const restored = deserializeScheduleDocument(
      serializeScheduleDocument(documentWithComment(comment)),
    );
    expect(restored.annotations?.[0]).toEqual(comment);
  });

  it('preserves a free-world comment (no item anchor)', () => {
    const comment: CommentAnnotation = {
      id: 'c-free',
      annotationKind: 'polyline',
      text: 'fixed in world',
      anchorDate: '2026-03-15',
      anchorRowIndex: 1,
      bodyOffsetPx: { dx: -20, dy: 40 },
    };
    const restored = deserializeScheduleDocument(
      serializeScheduleDocument(documentWithComment(comment)),
    );
    const back = restored.annotations?.[0] as CommentAnnotation;
    expect(back).toEqual(comment);
    expect(back.anchorItemId).toBeUndefined();
  });
});
