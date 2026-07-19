import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import type { ScheduleDocument } from '../src/domain/model/schedule-model.js';
import { orderedVisibleRows } from '../src/domain/usecase/section-organizer.js';
import { rebuildClassification } from '../src/domain/usecase/classification-tree.js';
import { LeftClassificationPane } from '../src/adapters/ui/left-pane.js';
import type { SvgRenderer } from '../src/adapters/render/svg-renderer.js';

/**
 * Interaction test for the left pane's ▲ / ▼ section-reorder buttons
 * (SECT-L1-002, review finding F-01 wiring). The adapter touches the DOM, but the
 * Vitest run is a DOM-free Node environment, so we install a minimal fake DOM that
 * implements exactly the surface the pane uses (createElement, style/dataset bags,
 * children, listeners, focus, and a small querySelector). This exercises the real
 * click handler -> store.dispatch(reorderSectionCommand) -> re-render path,
 * including focus restoration and boundary disabling.
 */

/** Tracks the currently focused fake element, like `document.activeElement`. */
interface FocusState {
  active: FakeElement | null;
}

/** Minimal stand-in for an HTMLElement covering only the pane's usage. */
class FakeElement {
  public readonly tagName: string;
  public readonly style: Record<string, string> = {};
  public readonly dataset: Record<string, string> = {};
  public readonly attributes: Record<string, string> = {};
  public readonly children: FakeElement[] = [];
  public readonly listeners: Record<string, Array<() => void>> = {};
  public textContent = '';
  public type = '';
  public title = '';
  public disabled = false;

  public constructor(
    tagName: string,
    private readonly focusState: FocusState,
  ) {
    this.tagName = tagName.toUpperCase();
  }

  public setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  public appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  public append(...nodes: FakeElement[]): void {
    for (const node of nodes) {
      this.children.push(node);
    }
  }

  public removeChild(child: FakeElement): void {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
    }
  }

  public get firstChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  public addEventListener(type: string, callback: () => void): void {
    (this.listeners[type] ??= []).push(callback);
  }

  public focus(): void {
    this.focusState.active = this;
  }

  public querySelector(selector: string): FakeElement | null {
    const predicate = compileSelector(selector);
    return findDescendant(this, predicate);
  }
}

/** camelCase a `data-foo-bar` attribute name into its `dataset` key `fooBar`. */
function datasetKey(attributeName: string): string {
  return attributeName
    .replace(/^data-/, '')
    .replace(/-([a-z])/g, (_all, letter: string) => letter.toUpperCase());
}

/** Compile the tiny subset of CSS selectors the pane relies on. */
function compileSelector(selector: string): (element: FakeElement) => boolean {
  const tagMatch = /^[a-z]+/i.exec(selector);
  const tag = tagMatch ? (tagMatch[0] ?? '').toUpperCase() : null;
  const attributePairs: Array<readonly [string, string]> = [];
  const attributePattern = /\[([\w-]+)="([^"]*)"\]/g;
  let match: RegExpExecArray | null;
  while ((match = attributePattern.exec(selector)) !== null) {
    attributePairs.push([match[1] ?? '', match[2] ?? '']);
  }
  return (element) => {
    if (tag !== null && element.tagName !== tag) {
      return false;
    }
    for (const [name, value] of attributePairs) {
      const actual = name.startsWith('data-')
        ? element.dataset[datasetKey(name)]
        : element.attributes[name];
      if (actual !== value) {
        return false;
      }
    }
    return true;
  };
}

/** Depth-first search of descendants (not self), first match wins. */
function findDescendant(
  root: FakeElement,
  predicate: (element: FakeElement) => boolean,
): FakeElement | null {
  for (const child of root.children) {
    if (predicate(child)) {
      return child;
    }
    const nested = findDescendant(child, predicate);
    if (nested !== null) {
      return nested;
    }
  }
  return null;
}

/** Invoke every registered click handler, mimicking a user click / Enter. */
function fireClick(element: FakeElement): void {
  for (const callback of element.listeners['click'] ?? []) {
    callback();
  }
}

/** A renderer stub exposing only the view-state surface the pane reads. */
function createRendererStub(): SvgRenderer {
  return {
    getViewState: () => ({ leftPaneWidth: 200, scrollY: 0, zoomY: 1 }),
    getContentTopOffsetPx: () => 32,
    onViewStateChange: (_callback: () => void) => {
      /* the test drives re-render through the store, not view-state changes */
    },
    setLeftPaneWidth: (_width: number) => {
      /* only invoked by divider drag, which this test never triggers */
    },
  } as unknown as SvgRenderer;
}

function threeSectionDocument(): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'left-pane-interaction-fixture',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [
      { id: 's0', name: 'Alpha', order: 0, rowIds: ['r0'], collapsed: false },
      { id: 's1', name: 'Beta', order: 1, rowIds: ['r1'], collapsed: false },
      { id: 's2', name: 'Gamma', order: 2, rowIds: ['r2'], collapsed: false },
    ],
    rows: [
      { id: 'r0', sectionId: 's0', classificationLabel: 'A', order: 0 },
      { id: 'r1', sectionId: 's1', classificationLabel: 'B', order: 0 },
      { id: 'r2', sectionId: 's2', classificationLabel: 'C', order: 0 },
    ],
    items: [],
    dependencies: [],
  };
}

const focusState: FocusState = { active: null };
let globalWithDom: { document?: unknown; window?: unknown };

beforeEach(() => {
  focusState.active = null;
  const fakeDocument = {
    createElement: (tagName: string): FakeElement => new FakeElement(tagName, focusState),
  };
  globalWithDom = globalThis as unknown as { document?: unknown; window?: unknown };
  globalWithDom.document = fakeDocument;
  globalWithDom.window = { document: fakeDocument };
});

afterEach(() => {
  delete globalWithDom.document;
  delete globalWithDom.window;
});

describe('LeftClassificationPane: ▲ / ▼ section reorder wiring (SECT-L1-002 / F-01)', () => {
  it('renders a focusable, accessibly named move-down button per section', () => {
    const store = new ScheduleStore(threeSectionDocument());
    const host = new FakeElement('div', focusState);
    new LeftClassificationPane(host as unknown as HTMLElement, store, createRendererStub());

    const downButton = host.querySelector(
      'button[data-role="section-move-down"][data-section-id="s0"]',
    );
    expect(downButton).not.toBeNull();
    expect(downButton?.tagName).toBe('BUTTON');
    expect(downButton?.attributes['aria-label']).toBe('Move section Alpha down');
    expect(downButton?.title).toBe('Move section Alpha down');
  });

  it('disables ▲ on the first section and ▼ on the last section', () => {
    const store = new ScheduleStore(threeSectionDocument());
    const host = new FakeElement('div', focusState);
    new LeftClassificationPane(host as unknown as HTMLElement, store, createRendererStub());

    const firstUp = host.querySelector(
      'button[data-role="section-move-up"][data-section-id="s0"]',
    );
    const lastDown = host.querySelector(
      'button[data-role="section-move-down"][data-section-id="s2"]',
    );
    expect(firstUp?.disabled).toBe(true);
    expect(lastDown?.disabled).toBe(true);
  });

  it('clicking ▼ dispatches the reorder, changes section order, and Undo reverts it', () => {
    const store = new ScheduleStore(threeSectionDocument());
    const host = new FakeElement('div', focusState);
    new LeftClassificationPane(host as unknown as HTMLElement, store, createRendererStub());

    const orderById = (): Map<string, number> =>
      new Map(store.getDocument().sections.map((section) => [section.id, section.order]));

    expect(orderById().get('s0')).toBe(0);

    const downButton = host.querySelector(
      'button[data-role="section-move-down"][data-section-id="s0"]',
    );
    expect(downButton).not.toBeNull();
    fireClick(downButton as unknown as FakeElement);

    // Section order changed in the store: Alpha (s0) moved below Beta (s1).
    expect(orderById().get('s0')).toBe(1);
    expect(orderById().get('s1')).toBe(0);
    const document = store.getDocument();
    expect(orderedVisibleRows(document.sections, document.rows).map((row) => row.id)).toEqual([
      'r1',
      'r0',
      'r2',
    ]);

    // The reorder participated in Undo/Redo history.
    expect(store.canUndo()).toBe(true);
    store.undo();
    expect(orderById().get('s0')).toBe(0);
    expect(orderById().get('s1')).toBe(1);
  });

  it('restores keyboard focus to the moved section after the re-render', () => {
    const store = new ScheduleStore(threeSectionDocument());
    const host = new FakeElement('div', focusState);
    new LeftClassificationPane(host as unknown as HTMLElement, store, createRendererStub());

    const downButton = host.querySelector(
      'button[data-role="section-move-down"][data-section-id="s0"]',
    );
    fireClick(downButton as unknown as FakeElement);

    // s0 moved to the middle: its ▼ is still enabled, so focus returns to it.
    expect(focusState.active).not.toBeNull();
    expect(focusState.active?.dataset['role']).toBe('section-move-down');
    expect(focusState.active?.dataset['sectionId']).toBe('s0');
  });
});

/** A store whose normalizer re-derives declared + item classification rows. */
function editableStore(): ScheduleStore {
  const document: ScheduleDocument = {
    schemaVersion: 1,
    title: 'sect-editing-dom-fixture',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [],
    rows: [],
    items: [
      {
        id: 'i0',
        rowId: 'pending',
        itemKind: 'task',
        startDate: '2026-01-01',
        endDate: '2026-01-05',
        abbrev: 'i0',
        importance: 1,
        fillColor: '#4477aa',
        strokeColor: '#333333',
        majorCategory: 'Dev',
      },
    ],
    dependencies: [],
  };
  return new ScheduleStore(document, undefined, rebuildClassification);
}

describe('LeftClassificationPane: section / category editing controls (SECT rework)', () => {
  it('renders a focusable, accessibly named global "Add section" button', () => {
    const store = editableStore();
    const host = new FakeElement('div', focusState);
    new LeftClassificationPane(host as unknown as HTMLElement, store, createRendererStub());

    const addButton = host.querySelector('button[data-role="add-section"]');
    expect(addButton?.tagName).toBe('BUTTON');
    expect(addButton?.attributes['aria-label']).toBe('Add section');
  });

  it('clicking "Add section" adds a visible None1 section, undoably', () => {
    const store = editableStore();
    const host = new FakeElement('div', focusState);
    new LeftClassificationPane(host as unknown as HTMLElement, store, createRendererStub());

    fireClick(host.querySelector('button[data-role="add-section"]') as unknown as FakeElement);

    // The None1 section now renders, carrying its own remove control.
    expect(store.getDocument().sections.map((section) => section.name)).toContain('None1');
    expect(host.querySelector('button[aria-label="Remove section None1"]')).not.toBeNull();

    store.undo();
    expect(store.getDocument().sections.map((section) => section.name)).not.toContain('None1');
  });

  it('adding a second section yields None2 (sequential naming)', () => {
    const store = editableStore();
    const host = new FakeElement('div', focusState);
    new LeftClassificationPane(host as unknown as HTMLElement, store, createRendererStub());

    fireClick(host.querySelector('button[data-role="add-section"]') as unknown as FakeElement);
    fireClick(host.querySelector('button[data-role="add-section"]') as unknown as FakeElement);
    expect(host.querySelector('button[aria-label="Remove section None2"]')).not.toBeNull();
  });

  it('"↓" on a section adds a None1 track, and "✕" removes the section', () => {
    const store = editableStore();
    const host = new FakeElement('div', focusState);
    new LeftClassificationPane(host as unknown as HTMLElement, store, createRendererStub());

    fireClick(host.querySelector('button[data-role="add-section"]') as unknown as FakeElement);
    // Add a track under None1 via its "Add sub-category under None1" button.
    fireClick(
      host.querySelector(
        'button[aria-label="Add sub-category under None1"]',
      ) as unknown as FakeElement,
    );
    expect(store.getDocument().declaredCategories).toContainEqual({
      major: 'None1',
      middle: 'None1',
    });
    // The track shows its own remove control.
    expect(host.querySelector('button[aria-label="Remove category None1"]')).not.toBeNull();

    // Remove the whole section via its "✕" remove button.
    fireClick(
      host.querySelector('button[aria-label="Remove section None1"]') as unknown as FakeElement,
    );
    expect(store.getDocument().sections.map((section) => section.name)).not.toContain('None1');
  });
});
