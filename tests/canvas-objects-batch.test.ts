/**
 * Unit coverage for the CANVAS-OBJECTS feedback batch (pure-logic parts). The real
 * rendered-DOM behavior for each item is asserted in
 * tests/e2e/canvas-objects-batch.spec.ts; here we lock the pure domain functions the
 * DOM behavior is built on:
 *
 *  1. Dependency lines default to yamabuki gold; the set-color command is undoable;
 *     remove deletes; the per-line color round-trips through the JSON codec and is
 *     rejected when it is an external paint reference.
 *  2. The progress line default color is purple; its color + visibility live in view
 *     state and round-trip through the JSON codec.
 *  3. The stacked-bar height ratio is 0.90 (a 10% gap between stacked bars).
 *  4. icon_shape_kind resolves the effective glyph (with legacy fallback), builds a
 *     distinct path per task shape, is set at creation, round-trips through JSON, and
 *     is editable via the edit-property command.
 */

import { describe, expect, it } from 'vitest';
import type { Dependency, ScheduleDocument, ScheduleItem } from '../src/domain/model/schedule-model.js';
import {
  DEFAULT_DEPENDENCY_LINE_COLOR,
  DEFAULT_PROGRESS_LINE_COLOR,
} from '../src/domain/model/schedule-model.js';
import { STACKED_BAR_HEIGHT_RATIO } from '../src/domain/usecase/layout-engine.js';
import {
  editPropertyCommand,
  removeDependencyCommand,
  setDependencyColorCommand,
} from '../src/domain/command/commands.js';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import { generateTemplateDocument } from '../src/app/sample-data.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';
import {
  effectiveMilestoneShape,
  effectiveTaskShape,
  iconShapeKindForCreate,
  taskGlyphPath,
  taskShapeIsStroked,
  taskShapeUsesPath,
} from '../src/domain/usecase/task-glyph.js';
import { ImportRejectedError } from '../src/domain/usecase/import-sanitizer.js';

const GLYPH_RECT = { x: 100, y: 40, width: 80, height: 18 };

function taskItem(id: string, iconShapeKind?: ScheduleItem['iconShapeKind']): ScheduleItem {
  return {
    id,
    rowId: 'row-0',
    itemKind: 'task',
    startDate: '2026-01-01',
    endDate: '2026-01-10',
    abbrev: id,
    importance: 1,
    fillColor: '#0072b2',
    strokeColor: 'transparent',
    ...(iconShapeKind !== undefined ? { iconShapeKind } : {}),
  };
}

describe('item 1: dependency lines default to yamabuki gold and are recolorable/deletable', () => {
  it('exposes the yamabuki-gold default color', () => {
    expect(DEFAULT_DEPENDENCY_LINE_COLOR).toBe('#F8B500');
  });

  it('the template ships dependencies with NO explicit color (fall back to the default)', () => {
    const document = generateTemplateDocument();
    expect((document.dependencies ?? []).length).toBeGreaterThan(0);
    for (const dependency of document.dependencies ?? []) {
      expect(dependency.strokeColor).toBeUndefined();
    }
  });

  it('sets a per-line color undoably and removes a line undoably', () => {
    const document = generateTemplateDocument();
    const store = new ScheduleStore(document);
    const depId = (document.dependencies ?? [])[0]!.id;

    store.dispatch(setDependencyColorCommand(depId, '#cc79a7'));
    const recolored = store.getDocument().dependencies!.find((d) => d.id === depId)!;
    expect(recolored.strokeColor).toBe('#cc79a7');
    store.undo();
    const reverted = store.getDocument().dependencies!.find((d) => d.id === depId)!;
    expect(reverted.strokeColor).toBeUndefined();

    store.dispatch(removeDependencyCommand(depId));
    expect(store.getDocument().dependencies!.some((d) => d.id === depId)).toBe(false);
    store.undo();
    expect(store.getDocument().dependencies!.some((d) => d.id === depId)).toBe(true);
  });

  it('setting the SAME color is a no-op (adds no history entry)', () => {
    const document = generateTemplateDocument();
    const store = new ScheduleStore(document);
    const depId = (document.dependencies ?? [])[0]!.id;
    store.dispatch(setDependencyColorCommand(depId, '#F8B500'));
    expect(store.canUndo()).toBe(true);
    const before = store.getDocument();
    store.dispatch(setDependencyColorCommand(depId, '#F8B500'));
    // Same reference: the no-op command did not push a new state.
    expect(store.getDocument()).toBe(before);
  });

  it('round-trips a per-line color through the JSON codec', () => {
    const base = generateTemplateDocument();
    const dependencies: Dependency[] = (base.dependencies ?? []).map((dependency, index) =>
      index === 0 ? { ...dependency, strokeColor: '#F8B500' } : dependency,
    );
    const document: ScheduleDocument = { ...base, dependencies };
    const restored = deserializeScheduleDocument(serializeScheduleDocument(document));
    expect(restored.dependencies![0]!.strokeColor).toBe('#F8B500');
  });

  it('rejects a dependency color that is an external paint reference', () => {
    const base = generateTemplateDocument();
    const dependencies: Dependency[] = (base.dependencies ?? []).map((dependency, index) =>
      index === 0 ? { ...dependency, strokeColor: 'url(http://evil/beacon)' } : dependency,
    );
    const document: ScheduleDocument = { ...base, dependencies };
    expect(() => deserializeScheduleDocument(serializeScheduleDocument(document))).toThrow(
      ImportRejectedError,
    );
  });
});

describe('item 2: progress line defaults to purple and its color/visibility round-trip', () => {
  it('exposes the purple default color', () => {
    expect(DEFAULT_PROGRESS_LINE_COLOR).toBe('#7B2FBF');
  });

  it('round-trips a chosen progress-line color and hidden state through JSON', () => {
    const base = generateTemplateDocument();
    const document: ScheduleDocument = {
      ...base,
      viewState: {
        ...base.viewState,
        progressLineColor: '#009e73',
        progressLineVisible: false,
      },
    };
    const restored = deserializeScheduleDocument(serializeScheduleDocument(document));
    expect(restored.viewState.progressLineColor).toBe('#009e73');
    expect(restored.viewState.progressLineVisible).toBe(false);
  });

  it('treats an absent visibility flag as shown (legacy default)', () => {
    const document = generateTemplateDocument();
    expect(document.viewState.progressLineVisible).toBeUndefined();
  });
});

describe('item 3: stacked bars are 90% of the lane height', () => {
  it('uses a 0.90 ratio (10% gap)', () => {
    expect(STACKED_BAR_HEIGHT_RATIO).toBe(0.9);
    expect(1 - STACKED_BAR_HEIGHT_RATIO).toBeCloseTo(0.1, 6);
  });
});

describe('item 4: icon_shape_kind drives shape and round-trips', () => {
  it('resolves the effective task shape from icon_shape_kind, with legacy fallback', () => {
    expect(effectiveTaskShape(taskItem('a', 'arrow'))).toBe('arrow');
    expect(effectiveTaskShape(taskItem('b', 'span'))).toBe('span');
    // Legacy item: no iconShapeKind, falls back to taskShape.
    const legacy: ScheduleItem = { ...taskItem('c'), taskShape: 'chevron' };
    expect(effectiveTaskShape(legacy)).toBe('chevron');
    // Nothing set -> bar.
    expect(effectiveTaskShape(taskItem('d'))).toBe('bar');
  });

  it('resolves the effective milestone shape, ignoring a task kind on iconShapeKind', () => {
    const baseMilestone: ScheduleItem = {
      id: 'm',
      rowId: 'row-0',
      itemKind: 'milestone',
      startDate: '2026-01-01',
      endDate: null,
      abbrev: 'M',
      importance: 1,
      fillColor: '#0072b2',
      strokeColor: 'transparent',
    };
    expect(effectiveMilestoneShape({ ...baseMilestone, iconShapeKind: 'star' })).toBe('star');
    // Legacy fallback + default (no iconShapeKind present).
    expect(effectiveMilestoneShape({ ...baseMilestone, milestoneShape: 'triangle' })).toBe('triangle');
    expect(effectiveMilestoneShape(baseMilestone)).toBe('diamond');
  });

  it('builds a DISTINCT non-empty path for arrow / chevron / span and none for bar', () => {
    const arrow = taskGlyphPath('arrow', GLYPH_RECT);
    const chevron = taskGlyphPath('chevron', GLYPH_RECT);
    const span = taskGlyphPath('span', GLYPH_RECT);
    expect(arrow.length).toBeGreaterThan(0);
    expect(chevron.length).toBeGreaterThan(0);
    expect(span.length).toBeGreaterThan(0);
    // The three shapes differ from one another.
    expect(new Set([arrow, chevron, span]).size).toBe(3);
    // A span is drawn stroked (multi-subpath: contains an internal move command).
    expect(span).toContain('M');
    expect((span.match(/M /g) ?? []).length).toBeGreaterThan(1);
    // A plain bar is drawn as a rect, so no path is produced here.
    expect(taskGlyphPath('bar', GLYPH_RECT)).toBe('');
  });

  it('classifies which shapes draw as a path vs a stroked connector', () => {
    expect(taskShapeUsesPath('arrow')).toBe(true);
    expect(taskShapeUsesPath('chevron')).toBe(true);
    expect(taskShapeUsesPath('span')).toBe(true);
    expect(taskShapeUsesPath('bar')).toBe(false);
    expect(taskShapeIsStroked('span')).toBe(true);
    expect(taskShapeIsStroked('arrow')).toBe(false);
  });

  it('picks the creation icon_shape_kind from the armed family shape', () => {
    expect(iconShapeKindForCreate('task', undefined, 'arrow')).toBe('arrow');
    expect(iconShapeKindForCreate('task', undefined, 'span')).toBe('span');
    expect(iconShapeKindForCreate('milestone', 'star', undefined)).toBe('star');
    expect(iconShapeKindForCreate('task', undefined, undefined)).toBe('bar');
  });

  it('edits an item icon_shape_kind undoably and it round-trips through JSON', () => {
    const base = generateTemplateDocument();
    const task = base.items.find((item) => item.itemKind === 'task')!;
    const store = new ScheduleStore(base);
    store.dispatch(editPropertyCommand(task.id, { iconShapeKind: 'span', taskShape: 'span' }));
    const edited = store.getDocument().items.find((item) => item.id === task.id)!;
    expect(edited.iconShapeKind).toBe('span');
    expect(effectiveTaskShape(edited)).toBe('span');

    const restored = deserializeScheduleDocument(serializeScheduleDocument(store.getDocument()));
    const restoredItem = restored.items.find((item) => item.id === task.id)!;
    expect(restoredItem.iconShapeKind).toBe('span');

    store.undo();
    const reverted = store.getDocument().items.find((item) => item.id === task.id)!;
    expect(reverted.iconShapeKind ?? 'bar').toBe('bar');
  });
});
