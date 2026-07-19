import { describe, expect, it } from 'vitest';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import type { ScheduleDocument, ScheduleItem } from '../src/domain/model/schedule-model.js';
import {
  addSectionCommand,
  addSubcategoryCommand,
  removeClassificationNodeCommand,
} from '../src/domain/command/commands.js';
import {
  nextDefaultCategoryName,
  rebuildClassification,
} from '../src/domain/usecase/classification-tree.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';

/**
 * Unit coverage for the left-pane SECTION / CATEGORY editing rework: adding a
 * section / track / detail as a DECLARED (persisted) node named `NoneN`, removing
 * a node while reclassifying its items UP a level, the union of declared +
 * item-derived rows (declared-empty shown, item-derived-empty hidden), and the
 * major-required invariant. Every add / remove goes through the undoable store.
 */

/** An item carrying an explicit classification path (task, one row band). */
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

/** A minimal document wrapping items (no pre-seeded sections / declared nodes). */
function documentOf(items: ScheduleItem[]): ScheduleDocument {
  return {
    schemaVersion: 1,
    title: 'sect-editing-fixture',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [],
    rows: [],
    items,
  };
}

/** A store whose normalizer materializes the derived + declared classification tree. */
function storeOf(items: ScheduleItem[]): ScheduleStore {
  return new ScheduleStore(documentOf(items), undefined, rebuildClassification);
}

const sectionNames = (document: ScheduleDocument): string[] =>
  document.sections.map((section) => section.name);

describe('NoneN default naming (unique within parent scope)', () => {
  it('picks the first free NoneN integer, skipping taken siblings', () => {
    expect(nextDefaultCategoryName([])).toBe('None1');
    expect(nextDefaultCategoryName(['None1'])).toBe('None2');
    // A gap is reused: None2 removed leaves None1 + None3 -> next is None2.
    expect(nextDefaultCategoryName(['None1', 'None3'])).toBe('None2');
    // Unrelated names never block the sequence.
    expect(nextDefaultCategoryName(['Planning', 'Dev'])).toBe('None1');
  });
});

describe('addSectionCommand (declare a new, empty major)', () => {
  it('adds a visible None1 section that carries a placeholder row (no items)', () => {
    const store = storeOf([item('a', 'Planning')]);
    store.dispatch(addSectionCommand());

    const document = store.getDocument();
    expect(document.declaredCategories).toContainEqual({ major: 'None1' });
    expect(sectionNames(document)).toContain('None1');
    const none1 = document.sections.find((section) => section.name === 'None1');
    // A declared-empty section is SHOWN: it has exactly one placeholder row so its
    // header renders, and no item lives on it yet.
    expect(none1?.rowIds).toHaveLength(1);
    expect(document.items.every((it) => it.majorCategory !== 'None1')).toBe(true);
  });

  it('names successive sections None1, None2, ... uniquely and is undoable', () => {
    const store = storeOf([]);
    store.dispatch(addSectionCommand());
    store.dispatch(addSectionCommand());
    expect(sectionNames(store.getDocument())).toEqual(['None1', 'None2']);

    store.undo();
    expect(sectionNames(store.getDocument())).toEqual(['None1']);
    store.undo();
    expect(store.getDocument().sections).toHaveLength(0);
  });

  it('skips a NoneN name already used by an item major', () => {
    const store = storeOf([item('a', 'None1')]);
    store.dispatch(addSectionCommand());
    expect(store.getDocument().declaredCategories).toContainEqual({ major: 'None2' });
  });
});

describe('addSubcategoryCommand (nest a track / detail)', () => {
  it('adds a None1 TRACK (middle) under a major, shown even though empty', () => {
    const store = storeOf([item('a', 'Dev')]);
    store.dispatch(addSubcategoryCommand({ major: 'Dev' }));

    const document = store.getDocument();
    expect(document.declaredCategories).toContainEqual({ major: 'Dev', middle: 'None1' });
    const trackRow = document.rows.find(
      (row) => row.majorLabel === 'Dev' && row.middleLabel === 'None1',
    );
    expect(trackRow?.depth).toBe(1);
    // No item sits on the declared track yet: it is a declared-empty branch.
    expect(document.items.every((it) => it.middleCategory !== 'None1')).toBe(true);
  });

  it('adds a None1 DETAIL (minor) under a track', () => {
    const store = storeOf([item('a', 'Dev', 'Frontend')]);
    store.dispatch(addSubcategoryCommand({ major: 'Dev', middle: 'Frontend' }));

    const document = store.getDocument();
    expect(document.declaredCategories).toContainEqual({
      major: 'Dev',
      middle: 'Frontend',
      minor: 'None1',
    });
    const detailRow = document.rows.find(
      (row) =>
        row.majorLabel === 'Dev' && row.middleLabel === 'Frontend' && row.minorLabel === 'None1',
    );
    expect(detailRow?.depth).toBe(2);
  });

  it('names tracks per-major scope (None1 can exist under two different majors)', () => {
    const store = storeOf([item('a', 'Dev'), item('b', 'QA')]);
    store.dispatch(addSubcategoryCommand({ major: 'Dev' }));
    store.dispatch(addSubcategoryCommand({ major: 'QA' }));
    const declared = store.getDocument().declaredCategories ?? [];
    expect(declared).toContainEqual({ major: 'Dev', middle: 'None1' });
    expect(declared).toContainEqual({ major: 'QA', middle: 'None1' });
  });
});

describe('declared-empty is shown, item-derived-empty stays hidden', () => {
  it('does not invent empty branches for an item, but shows a declared one', () => {
    // An item at the MAJOR level derives ONLY a major row -- no phantom empty middle.
    const before = rebuildClassification(documentOf([item('a', 'Dev')]));
    expect(before.rows.filter((row) => row.depth === 1)).toHaveLength(0);

    // Declaring an (empty) middle makes exactly that one track row appear.
    const store = storeOf([item('a', 'Dev')]);
    store.dispatch(addSubcategoryCommand({ major: 'Dev' }));
    expect(store.getDocument().rows.filter((row) => row.depth === 1)).toHaveLength(1);
  });
});

describe('removeClassificationNodeCommand (reclassify items UP; undoable)', () => {
  it('removing a TRACK drops its items to the major level and is undoable', () => {
    const store = storeOf([item('a', 'Dev', 'Frontend', 'UI'), item('b', 'Dev', 'Frontend')]);
    store.dispatch(removeClassificationNodeCommand({ major: 'Dev', middle: 'Frontend' }));

    const document = store.getDocument();
    const a = document.items.find((it) => it.id === 'a');
    const b = document.items.find((it) => it.id === 'b');
    // Items keep their MAJOR but lose the removed middle (and its minor).
    expect(a?.majorCategory).toBe('Dev');
    expect(a?.middleCategory ?? '').toBe('');
    expect(a?.minorCategory ?? '').toBe('');
    expect(b?.middleCategory ?? '').toBe('');
    expect(document.rows.some((row) => row.middleLabel === 'Frontend')).toBe(false);

    store.undo();
    expect(store.getDocument().items.find((it) => it.id === 'a')?.middleCategory).toBe('Frontend');
  });

  it('removing a DETAIL drops its items to the track level, keeping the middle', () => {
    const store = storeOf([item('a', 'Dev', 'Frontend', 'UI')]);
    store.dispatch(
      removeClassificationNodeCommand({ major: 'Dev', middle: 'Frontend', minor: 'UI' }),
    );
    const a = store.getDocument().items.find((it) => it.id === 'a');
    expect(a?.middleCategory).toBe('Frontend');
    expect(a?.minorCategory ?? '').toBe('');
  });

  it('removes a declared-empty section (no items) and is undoable', () => {
    const store = storeOf([item('a', 'Dev')]);
    store.dispatch(addSectionCommand()); // None1, empty
    expect(sectionNames(store.getDocument())).toContain('None1');

    store.dispatch(removeClassificationNodeCommand({ major: 'None1' }));
    expect(sectionNames(store.getDocument())).not.toContain('None1');

    store.undo();
    expect(sectionNames(store.getDocument())).toContain('None1');
  });
});

describe('major-required invariant on section removal', () => {
  it('refuses to remove the last remaining major while it still has items (no-op)', () => {
    const store = storeOf([item('a', 'Only')]);
    const before = store.getDocument();
    store.dispatch(removeClassificationNodeCommand({ major: 'Only' }));
    // Refused: the document is unchanged and no item is left without a major.
    expect(store.getDocument()).toBe(before);
    expect(store.getDocument().items.every((it) => it.majorCategory === 'Only')).toBe(true);
  });

  it('absorbs items into a sibling major when a non-last section is removed', () => {
    const store = storeOf([item('a', 'A'), item('b', 'B')]);
    store.dispatch(removeClassificationNodeCommand({ major: 'A' }));

    const document = store.getDocument();
    expect(sectionNames(document)).not.toContain('A');
    // Item data is preserved: 'a' is re-homed under sibling 'B' (major level).
    const a = document.items.find((it) => it.id === 'a');
    expect(a?.majorCategory).toBe('B');
    expect(a?.middleCategory ?? '').toBe('');
  });
});

describe('declaredCategories JSON round-trip', () => {
  it('preserves declared nodes across serialize / deserialize', () => {
    const store = storeOf([item('a', 'Dev', 'Frontend')]);
    store.dispatch(addSectionCommand());
    store.dispatch(addSubcategoryCommand({ major: 'Dev', middle: 'Frontend' }));

    const document = store.getDocument();
    const restored = deserializeScheduleDocument(serializeScheduleDocument(document));
    expect(restored.declaredCategories).toStrictEqual(document.declaredCategories);
  });

  it('rejects a declaredCategories entry whose major is not a string', () => {
    const store = storeOf([item('a', 'Dev')]);
    const bad = {
      ...store.getDocument(),
      declaredCategories: [{ major: 42 }],
    } as unknown as ScheduleDocument;
    expect(() => deserializeScheduleDocument(serializeScheduleDocument(bad))).toThrow(
      /declaredCategories/,
    );
  });
});
