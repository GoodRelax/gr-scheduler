import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import type { ScheduleDocument, ScheduleItem } from '../src/domain/model/schedule-model.js';
import {
  duplicateCategorySubtreeCommand,
  reorderCategoryNodeCommand,
  revealDescendantsCommand,
  setCategoryNodeHiddenCommand,
} from '../src/domain/command/commands.js';
import { rebuildClassification } from '../src/domain/usecase/classification-tree.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';
import { LeftClassificationPane } from '../src/adapters/ui/left-pane.js';
import type { SvgRenderer } from '../src/adapters/render/svg-renderer.js';

/**
 * CLASSIFICATION-PANE restructure coverage. The DOMAIN blocks exercise the pure
 * commands (reorder / hide+reveal / duplicate for MIDDLE / MINOR) against a store
 * whose normalizer re-derives the classification tree, asserting the materialized
 * `rows` (which drive the canvas) actually follow. The UI blocks drive the real
 * {@link LeftClassificationPane} against a minimal fake DOM, asserting the rendered
 * icon-row order / aria-labels, label alignment, the confirm dialog, and copy/paste.
 */

/** A task item carrying an explicit three-level classification path. */
function item(id: string, major: string, middle?: string, minor?: string): ScheduleItem {
  return {
    id,
    rowId: 'pending',
    itemKind: 'task',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    abbrev: id,
    importance: 1,
    fillColor: '#4477aa',
    strokeColor: '#333333',
    majorCategory: major,
    ...(middle !== undefined ? { middleCategory: middle } : {}),
    ...(minor !== undefined ? { minorCategory: minor } : {}),
  };
}

function documentOf(items: ScheduleItem[]): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'classification-pane-fixture',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [],
    rows: [],
    items,
    dependencies: [],
  };
}

function storeOf(items: ScheduleItem[]): ScheduleStore {
  return new ScheduleStore(documentOf(items), undefined, rebuildClassification);
}

const middleOrder = (document: ScheduleDocument, major: string): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of document.rows) {
    if (row.majorLabel === major && row.middleLabel !== undefined && !seen.has(row.middleLabel)) {
      seen.add(row.middleLabel);
      out.push(row.middleLabel);
    }
  }
  return out;
};

const minorOrder = (document: ScheduleDocument, major: string, middle: string): string[] => {
  const out: string[] = [];
  for (const row of document.rows) {
    if (row.majorLabel === major && row.middleLabel === middle && row.minorLabel !== undefined) {
      out.push(row.minorLabel);
    }
  }
  return out;
};

describe('req 1: reorder MIDDLE / MINOR among siblings (canvas row order follows; undoable)', () => {
  it('moves a MIDDLE up among its sibling middles and Undo reverts it', () => {
    const store = storeOf([item('a', 'Dev', 'Frontend'), item('b', 'Dev', 'Backend')]);
    expect(middleOrder(store.getDocument(), 'Dev')).toEqual(['Frontend', 'Backend']);

    store.dispatch(reorderCategoryNodeCommand({ major: 'Dev', middle: 'Backend' }, 'up'));
    expect(middleOrder(store.getDocument(), 'Dev')).toEqual(['Backend', 'Frontend']);

    store.undo();
    expect(middleOrder(store.getDocument(), 'Dev')).toEqual(['Frontend', 'Backend']);
  });

  it('moves a MINOR down among its sibling minors within the same track', () => {
    const store = storeOf([
      item('a', 'Dev', 'Frontend', 'UI'),
      item('b', 'Dev', 'Frontend', 'API'),
      item('c', 'Dev', 'Frontend', 'DB'),
    ]);
    expect(minorOrder(store.getDocument(), 'Dev', 'Frontend')).toEqual(['UI', 'API', 'DB']);

    store.dispatch(reorderCategoryNodeCommand({ major: 'Dev', middle: 'Frontend', minor: 'UI' }, 'down'));
    expect(minorOrder(store.getDocument(), 'Dev', 'Frontend')).toEqual(['API', 'UI', 'DB']);

    store.undo();
    expect(minorOrder(store.getDocument(), 'Dev', 'Frontend')).toEqual(['UI', 'API', 'DB']);
  });

  it('is a no-op (same document) at the sibling boundary', () => {
    const store = storeOf([item('a', 'Dev', 'Frontend'), item('b', 'Dev', 'Backend')]);
    const before = store.getDocument();
    store.dispatch(reorderCategoryNodeCommand({ major: 'Dev', middle: 'Frontend' }, 'up'));
    expect(store.getDocument()).toBe(before);
  });
});

describe('req 2: hide MIDDLE / MINOR + parent show-all + round-trip', () => {
  it('hiding a MIDDLE drops its rows from the derived tree (canvas), keeping siblings', () => {
    const store = storeOf([item('a', 'Dev', 'Frontend', 'UI'), item('b', 'Dev', 'Backend')]);
    store.dispatch(setCategoryNodeHiddenCommand({ major: 'Dev', middle: 'Frontend' }, true));

    const rows = store.getDocument().rows;
    expect(rows.some((row) => row.middleLabel === 'Frontend')).toBe(false);
    expect(rows.some((row) => row.minorLabel === 'UI')).toBe(false);
    expect(rows.some((row) => row.middleLabel === 'Backend')).toBe(true);
  });

  it('hidden state round-trips through the JSON codec', () => {
    const store = storeOf([item('a', 'Dev', 'Frontend', 'UI')]);
    store.dispatch(setCategoryNodeHiddenCommand({ major: 'Dev', middle: 'Frontend', minor: 'UI' }, true));
    const restored = deserializeScheduleDocument(serializeScheduleDocument(store.getDocument()));
    expect(restored.classificationNodeStates).toContainEqual({
      major: 'Dev',
      middle: 'Frontend',
      minor: 'UI',
      hidden: true,
    });
  });

  it("a parent's show-all reveals every hidden descendant at once; Undo re-hides", () => {
    const store = storeOf([item('a', 'Dev', 'Frontend', 'UI'), item('b', 'Dev', 'Backend')]);
    store.dispatch(setCategoryNodeHiddenCommand({ major: 'Dev', middle: 'Frontend' }, true));
    store.dispatch(setCategoryNodeHiddenCommand({ major: 'Dev', middle: 'Backend' }, true));
    expect(store.getDocument().rows.some((row) => row.middleLabel === 'Frontend')).toBe(false);
    expect(store.getDocument().rows.some((row) => row.middleLabel === 'Backend')).toBe(false);

    store.dispatch(revealDescendantsCommand({ major: 'Dev' }));
    expect(store.getDocument().rows.some((row) => row.middleLabel === 'Frontend')).toBe(true);
    expect(store.getDocument().rows.some((row) => row.middleLabel === 'Backend')).toBe(true);

    store.undo();
    expect(store.getDocument().rows.some((row) => row.middleLabel === 'Frontend')).toBe(false);
  });
});

describe('req 3: duplicate a MAJOR / MIDDLE / MINOR subtree as a sibling copy', () => {
  it('duplicates a MIDDLE + its items with a non-colliding name, as the next sibling', () => {
    const store = storeOf([item('a', 'Dev', 'Frontend', 'UI'), item('b', 'Dev', 'Backend')]);
    store.dispatch(duplicateCategorySubtreeCommand({ major: 'Dev', middle: 'Frontend' }));

    const document = store.getDocument();
    expect(document.items.some((it) => it.middleCategory === 'Frontend (2)' && it.minorCategory === 'UI')).toBe(
      true,
    );
    // Original survives and the copy sits immediately AFTER it among the siblings.
    expect(middleOrder(document, 'Dev')).toEqual(['Frontend', 'Frontend (2)', 'Backend']);

    store.undo();
    expect(store.getDocument().items.some((it) => it.middleCategory === 'Frontend (2)')).toBe(false);
  });

  it('duplicates a whole MAJOR section placed right after the original', () => {
    const store = storeOf([item('a', 'A', 'm1'), item('b', 'B')]);
    store.dispatch(duplicateCategorySubtreeCommand({ major: 'A' }));
    const names = store.getDocument().sections.map((section) => section.name);
    expect(names).toEqual(['A', 'A (2)', 'B']);
    expect(store.getDocument().items.some((it) => it.majorCategory === 'A (2)')).toBe(true);
  });

  it('duplicates a MINOR leaf under the same track', () => {
    const store = storeOf([item('a', 'Dev', 'Frontend', 'UI')]);
    store.dispatch(duplicateCategorySubtreeCommand({ major: 'Dev', middle: 'Frontend', minor: 'UI' }));
    expect(minorOrder(store.getDocument(), 'Dev', 'Frontend')).toEqual(['UI', 'UI (2)']);
  });
});

// ---------------------------------------------------------------------------
// UI (real LeftClassificationPane against a minimal fake DOM)
// ---------------------------------------------------------------------------

interface FocusState {
  active: FakeElement | null;
}

class FakeElement {
  public readonly tagName: string;
  public readonly style: Record<string, string> = {};
  public readonly dataset: Record<string, string> = {};
  public readonly attributes: Record<string, string> = {};
  public readonly children: FakeElement[] = [];
  public readonly listeners: Record<string, Array<(event: unknown) => void>> = {};
  public parentNode: FakeElement | null = null;
  public textContent = '';
  public type = '';
  public title = '';
  public id = '';
  public tabIndex = -1;
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
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  public append(...nodes: FakeElement[]): void {
    for (const node of nodes) {
      node.parentNode = this;
      this.children.push(node);
    }
  }

  public removeChild(child: FakeElement): void {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parentNode = null;
    }
  }

  public get firstChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  public addEventListener(type: string, callback: (event: unknown) => void): void {
    (this.listeners[type] ??= []).push(callback);
  }

  public focus(): void {
    this.focusState.active = this;
  }

  public querySelector(selector: string): FakeElement | null {
    const predicate = compileSelector(selector);
    return findDescendant(this, predicate);
  }

  public buttonChildren(): FakeElement[] {
    // The per-node controls now nest inside a collapsible `[data-role="node-controls"]`
    // wrapper (hidden until hover / focus / selection), so gather descendant buttons
    // in document order rather than only DIRECT children.
    const buttons: FakeElement[] = [];
    const walk = (element: FakeElement): void => {
      for (const child of element.children) {
        if (child.tagName === 'BUTTON') {
          buttons.push(child);
        }
        walk(child);
      }
    };
    walk(this);
    return buttons;
  }
}

function datasetKey(attributeName: string): string {
  return attributeName
    .replace(/^data-/, '')
    .replace(/-([a-z])/g, (_all, letter: string) => letter.toUpperCase());
}

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

function fireClick(element: FakeElement | null): void {
  for (const callback of element?.listeners['click'] ?? []) {
    callback({ target: element });
  }
}

function fireEvent(element: FakeElement | null, type: string, event: Record<string, unknown>): void {
  for (const callback of element?.listeners[type] ?? []) {
    callback({ preventDefault: () => undefined, stopPropagation: () => undefined, ...event });
  }
}

function createRendererStub(): SvgRenderer {
  return {
    getViewState: () => ({ zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M', leftPaneWidth: 220 }),
    getContentTopOffsetPx: () => 32,
    onViewStateChange: (_callback: () => void) => undefined,
    setLeftPaneWidth: (_width: number) => undefined,
  } as unknown as SvgRenderer;
}

const focusState: FocusState = { active: null };
let globalWithDom: { document?: unknown; window?: unknown };

beforeEach(() => {
  focusState.active = null;
  const fakeDocument = {
    createElement: (tagName: string): FakeElement => new FakeElement(tagName, focusState),
    createTextNode: (text: string): FakeElement => {
      const node = new FakeElement('#text', focusState);
      node.textContent = text;
      return node;
    },
    get activeElement(): FakeElement | null {
      return focusState.active;
    },
  };
  globalWithDom = globalThis as unknown as { document?: unknown; window?: unknown };
  globalWithDom.document = fakeDocument;
  globalWithDom.window = { document: fakeDocument };
});

afterEach(() => {
  delete globalWithDom.document;
  delete globalWithDom.window;
});

function mountPane(items: ScheduleItem[]): { host: FakeElement; store: ScheduleStore } {
  const store = new ScheduleStore(documentOf(items), undefined, rebuildClassification);
  const host = new FakeElement('div', focusState);
  new LeftClassificationPane(host as unknown as HTMLElement, store, createRendererStub());
  return { host, store };
}

describe('req 5: consolidated icon row [name] ▲ ▼ □ + - X', () => {
  it('renders the name first, then exactly ▲ ▼ □ + - X for a MIDDLE (old ↓ gone -> +)', () => {
    const { host } = mountPane([item('a', 'Dev', 'Frontend', 'UI')]);
    const track = host.querySelector('[data-role="track-label"]');
    expect(track).not.toBeNull();
    // Name is the FIRST child.
    expect(track?.children[0]?.dataset['role']).toBe('node-name');
    const buttons = track?.buttonChildren() ?? [];
    expect(buttons.map((button) => button.dataset['role'])).toEqual([
      'category-move-up',
      'category-move-down',
      'show-all',
      'add-subcategory',
      'hide-node',
      'remove-track',
    ]);
    expect(buttons[0]?.textContent).toBe('▲');
    expect(buttons[1]?.textContent).toBe('▼');
    expect(buttons[2]?.textContent).toBe('□');
    // The renamed add-subcategory glyph is now "+", never the old "↓".
    expect(buttons[3]?.textContent).toBe('+');
    expect(buttons.map((button) => button.textContent)).not.toContain('↓');
    // Accessible names on each control (WCAG 4.1.2).
    expect(buttons[0]?.attributes['aria-label']).toBe('Move Frontend up');
    expect(buttons[2]?.attributes['aria-label']).toBe('Show all sub-sections of Frontend');
    expect(buttons[3]?.attributes['aria-label']).toBe('Add sub-category under Frontend');
    expect(buttons[4]?.attributes['aria-label']).toBe('Hide Frontend');
    expect(buttons[5]?.attributes['aria-label']).toBe('Remove category Frontend');
  });

  it('a MINOR leaf shows ▲ ▼ - X only (no show-all / add-sub)', () => {
    const { host } = mountPane([item('a', 'Dev', 'Frontend', 'UI')]);
    const detail = host.querySelector('[data-role="detail-label"]');
    const buttons = detail?.buttonChildren() ?? [];
    expect(buttons.map((button) => button.dataset['role'])).toEqual([
      'category-move-up',
      'category-move-down',
      'hide-node',
      'remove-detail',
    ]);
  });
});

describe('req 4: Middle top-aligned, Minor center-aligned', () => {
  it('renders the middle band flex-start and the minor band center', () => {
    const { host } = mountPane([item('a', 'Dev', 'Frontend', 'UI')]);
    const track = host.querySelector('[data-role="track-label"]');
    const detail = host.querySelector('[data-role="detail-label"]');
    expect(track?.style['alignItems']).toBe('flex-start');
    expect(detail?.style['alignItems']).toBe('center');
  });
});

describe('req 2 (UI): hide via "-" removes rows; parent "□" restores', () => {
  it('hides a middle from the canvas and reveals it again from the section show-all', () => {
    const { host, store } = mountPane([item('a', 'Dev', 'Frontend', 'UI'), item('b', 'Dev', 'Backend')]);
    const track = host.querySelector('[data-role="track-label"]'); // Frontend (first)
    fireClick(track?.querySelector('button[data-role="hide-node"]') ?? null);
    expect(store.getDocument().rows.some((row) => row.middleLabel === 'Frontend')).toBe(false);

    const header = host.querySelector('[data-role="section-header"]');
    fireClick(header?.querySelector('button[data-role="show-all"]') ?? null);
    expect(store.getDocument().rows.some((row) => row.middleLabel === 'Frontend')).toBe(true);
  });
});

describe('req 3 (UI): Ctrl+C / Ctrl+V and context-menu copy / paste', () => {
  it('Ctrl+C then Ctrl+V on a selected node duplicates its subtree as a sibling', () => {
    const { host, store } = mountPane([item('a', 'Dev', 'Frontend', 'UI')]);
    const track = host.querySelector('[data-role="track-label"]');
    // Select the middle by focusing/clicking its name span.
    fireClick(track?.children[0] ?? null);
    const pane = host.querySelector('[data-role="left-classification-pane"]');
    fireEvent(pane, 'keydown', { ctrlKey: true, key: 'c' });
    fireEvent(pane, 'keydown', { ctrlKey: true, key: 'v' });
    expect(store.getDocument().items.some((it) => it.middleCategory === 'Frontend (2)')).toBe(true);
  });

  it('the right-click context menu Copy then Paste duplicates the node', () => {
    const { host, store } = mountPane([item('a', 'Dev', 'Frontend', 'UI')]);
    const track = host.querySelector('[data-role="track-label"]');
    fireEvent(track, 'contextmenu', { clientX: 10, clientY: 10 });
    fireClick(host.querySelector('button[data-role="context-copy"]'));
    // Re-open the menu and Paste.
    fireEvent(track, 'contextmenu', { clientX: 10, clientY: 10 });
    fireClick(host.querySelector('button[data-role="context-paste"]'));
    expect(store.getDocument().items.some((it) => it.middleCategory === 'Frontend (2)')).toBe(true);
  });
});

describe('req 6: delete confirmation dialog', () => {
  it('opens a modal dialog (no immediate delete); Cancel leaves the node and returns focus', () => {
    const { host, store } = mountPane([item('a', 'Dev', 'Frontend', 'UI')]);
    const track = host.querySelector('[data-role="track-label"]');
    const trigger = track?.querySelector('button[data-role="remove-track"]') ?? null;
    fireClick(trigger);

    // The dialog is open and NOTHING was deleted yet.
    const dialog = host.querySelector('[data-role="delete-dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.attributes['role']).toBe('dialog');
    expect(dialog?.attributes['aria-modal']).toBe('true');
    expect(store.getDocument().items.some((it) => it.middleCategory === 'Frontend')).toBe(true);

    // Default focus is on Cancel (safer for a destructive action).
    const cancel = host.querySelector('button[data-role="dialog-cancel"]');
    const del = host.querySelector('button[data-role="dialog-delete"]');
    expect(focusState.active).toBe(cancel);
    // The first letters D / C are rendered BOLD (afford the shortcuts).
    expect(del?.children[0]?.tagName).toBe('B');
    expect(del?.children[0]?.textContent).toBe('D');
    expect(cancel?.children[0]?.tagName).toBe('B');
    expect(cancel?.children[0]?.textContent).toBe('C');

    fireClick(cancel);
    expect(host.querySelector('[data-role="delete-dialog"]')).toBeNull();
    // Focus returns to the triggering X button.
    expect(focusState.active).toBe(trigger);
    expect(store.getDocument().items.some((it) => it.middleCategory === 'Frontend')).toBe(true);
  });

  it('confirming (Delete button) removes the node, undoably', () => {
    const { host, store } = mountPane([item('a', 'Dev', 'Frontend', 'UI')]);
    const track = host.querySelector('[data-role="track-label"]');
    fireClick(track?.querySelector('button[data-role="remove-track"]') ?? null);
    fireClick(host.querySelector('button[data-role="dialog-delete"]'));
    expect(store.getDocument().rows.some((row) => row.middleLabel === 'Frontend')).toBe(false);
    store.undo();
    expect(store.getDocument().rows.some((row) => row.middleLabel === 'Frontend')).toBe(true);
  });

  it('the D key confirms and the C key cancels', () => {
    const { host, store } = mountPane([item('a', 'Dev', 'Frontend', 'UI')]);
    const track = host.querySelector('[data-role="track-label"]');
    // C cancels.
    fireClick(track?.querySelector('button[data-role="remove-track"]') ?? null);
    fireEvent(host.querySelector('[data-role="delete-dialog"]'), 'keydown', { key: 'c' });
    expect(host.querySelector('[data-role="delete-dialog"]')).toBeNull();
    expect(store.getDocument().rows.some((row) => row.middleLabel === 'Frontend')).toBe(true);
    // D confirms.
    const track2 = host.querySelector('[data-role="track-label"]');
    fireClick(track2?.querySelector('button[data-role="remove-track"]') ?? null);
    fireEvent(host.querySelector('[data-role="delete-dialog"]'), 'keydown', { key: 'd' });
    expect(store.getDocument().rows.some((row) => row.middleLabel === 'Frontend')).toBe(false);
  });
});
