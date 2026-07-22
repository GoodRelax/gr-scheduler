/**
 * CR-016 + DEF-010: the project title as first-class, editable, exported content.
 *
 * Covered seams (all pure / DOM-free, so the DOM wiring in `main.ts` stays a thin
 * adapter over them):
 * - DEF-010: the header text is DERIVED from `ScheduleDocument.title` and FOLLOWS the
 *   store -- a rename, its Undo and its Redo each refresh it, as does a whole-document
 *   swap (load / New).
 * - CR-016 edit: Enter commits an undoable command, Escape reverts, blank/unchanged
 *   edits commit nothing.
 * - CR-016 export: MSPDI carries the title in BOTH `<Name>` (what MS Project shows as
 *   the project name) and `<Title>`; import prefers `<Title>` and falls back to
 *   `<Name>`; the round-trip stays lossless.
 */

import { describe, expect, it } from 'vitest';
import {
  bindHeaderTitleText,
  headerTitlePlaceholder,
  resolveHeaderTitleText,
} from '../src/app/header-model.js';
import { ScheduleStore } from '../src/domain/command/schedule-store.js';
import {
  resolveTitleEditOutcome,
  setScheduleTitleCommand,
} from '../src/domain/command/commands.js';
import { exportMspdi, importMspdi } from '../src/domain/usecase/mspdi-codec.js';
import {
  CURRENT_SCHEMA_VERSION,
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';
import type { Locale, ScheduleDocument } from '../src/domain/model/schedule-model.js';

function makeDocument(title: string): ScheduleDocument {
  return {
    projectId: '66666666-6666-4666-8666-666666666666',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title,
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M', leftPaneWidth: 220 },
    sections: [{ id: 'sec-1', name: 'Body', order: 0, rowIds: ['row-1'] }],
    rows: [{ id: 'row-1', sectionId: 'sec-1', classificationLabel: 'Design', order: 0 }],
    items: [
      {
        id: 'it-1',
        rowId: 'row-1',
        itemKind: 'milestone',
        startDate: '2026-08-01',
        endDate: null,
        abbrev: 'DR1',
        fullName: 'Design Review 1',
        importance: 90,
        milestoneShape: 'diamond',
        fillColor: '#ffffff',
        strokeColor: '#4e79a7',
      },
    ],
    dependencies: [],
    annotations: [],
  };
}

/** Strip the loss-free sidecar so the standard-element import path is exercised. */
function stripSidecar(xml: string): string {
  return xml.replace(/<Notes>[\s\S]*?<\/Notes>/, '');
}

describe('DEF-010: the header title follows the store document', () => {
  it('paints the document title immediately on binding', () => {
    const store = new ScheduleStore(makeDocument('Vehicle A Program'));
    const painted: string[] = [];
    bindHeaderTitleText(store, (text) => painted.push(text));
    expect(painted).toEqual(['Vehicle A Program']);
  });

  it('refreshes on a rename, on its Undo and on its Redo', () => {
    const store = new ScheduleStore(makeDocument('Vehicle A Program'));
    const painted: string[] = [];
    bindHeaderTitleText(store, (text) => painted.push(text));

    store.dispatch(setScheduleTitleCommand('Vehicle B Program'));
    store.undo();
    store.redo();

    expect(painted).toEqual([
      'Vehicle A Program',
      'Vehicle B Program',
      'Vehicle A Program',
      'Vehicle B Program',
    ]);
  });

  it('follows a whole-document swap (load / New)', () => {
    const store = new ScheduleStore(makeDocument('Vehicle A Program'));
    let headerText = '';
    bindHeaderTitleText(store, (text) => {
      headerText = text;
    });
    store.replaceDocument(makeDocument('Imported plan 2027'));
    expect(headerText).toBe('Imported plan 2027');
  });

  it('shows the placeholder -- never a literal product name -- for a blank title', () => {
    const store = new ScheduleStore(makeDocument(''));
    let headerText = '';
    bindHeaderTitleText(store, (text) => {
      headerText = text;
    });
    expect(headerText).toBe(headerTitlePlaceholder());
    store.dispatch(setScheduleTitleCommand('Named at last'));
    expect(headerText).toBe('Named at last');
  });

  it('paints the placeholder in the ACTIVE locale and repaints on a switch (DEF-012)', () => {
    const store = new ScheduleStore(makeDocument(''));
    let activeLocale: Locale = 'en';
    let headerText = '';
    bindHeaderTitleText(
      store,
      (text) => {
        headerText = text;
      },
      () => activeLocale,
    );
    expect(headerText).toBe(headerTitlePlaceholder('en'));
    activeLocale = 'ja';
    // A locale switch does not touch the document, so the shell repaints from the
    // store; the same binding then resolves the placeholder in the new locale.
    store.replaceDocument(makeDocument(''));
    expect(headerText).toBe(headerTitlePlaceholder('ja'));
    expect(headerText).not.toBe(headerTitlePlaceholder('en'));
  });

  it('stops repainting after the returned unsubscribe runs', () => {
    const store = new ScheduleStore(makeDocument('Vehicle A Program'));
    const painted: string[] = [];
    const unsubscribe = bindHeaderTitleText(store, (text) => painted.push(text));
    unsubscribe();
    store.dispatch(setScheduleTitleCommand('Vehicle B Program'));
    expect(painted).toEqual(['Vehicle A Program']);
  });
});

describe('CR-016: inline title edit commits undoably and reverts', () => {
  it('commits the edited title as an undoable command (Enter)', () => {
    const store = new ScheduleStore(makeDocument('Vehicle A Program'));
    const outcome = resolveTitleEditOutcome('commit', store.getDocument().title, 'Vehicle B Program');
    expect(outcome).toEqual({ commit: true, title: 'Vehicle B Program' });

    store.dispatch(setScheduleTitleCommand(outcome.title));
    expect(store.getDocument().title).toBe('Vehicle B Program');
    expect(store.canUndo()).toBe(true);

    store.undo();
    expect(store.getDocument().title).toBe('Vehicle A Program');
    store.redo();
    expect(store.getDocument().title).toBe('Vehicle B Program');
  });

  it('reverts to the prior title on Escape and dispatches nothing', () => {
    const store = new ScheduleStore(makeDocument('Vehicle A Program'));
    const outcome = resolveTitleEditOutcome('cancel', store.getDocument().title, 'typed but abandoned');
    expect(outcome).toEqual({ commit: false, title: 'Vehicle A Program' });
    expect(store.canUndo()).toBe(false);
    expect(resolveHeaderTitleText(store.getDocument().title)).toBe('Vehicle A Program');
  });

  it('trims the committed title and rejects a blank or unchanged edit', () => {
    expect(resolveTitleEditOutcome('commit', 'Old', '  New  ')).toEqual({ commit: true, title: 'New' });
    expect(resolveTitleEditOutcome('commit', 'Old', 'Old')).toEqual({ commit: false, title: 'Old' });
    expect(resolveTitleEditOutcome('commit', 'Old', '   ')).toEqual({ commit: false, title: 'Old' });
  });

  it('records no history entry when the command is a no-op', () => {
    const store = new ScheduleStore(makeDocument('Vehicle A Program'));
    store.dispatch(setScheduleTitleCommand('Vehicle A Program'));
    expect(store.canUndo()).toBe(false);
  });

  it('changes nothing but the title', () => {
    const original = makeDocument('Vehicle A Program');
    const renamed = setScheduleTitleCommand('Vehicle B Program').execute(original);
    expect(renamed).toStrictEqual({ ...original, title: 'Vehicle B Program' });
  });

  it('round-trips the renamed title through JSON', () => {
    const renamed = setScheduleTitleCommand('Vehicle B Program').execute(makeDocument('Vehicle A Program'));
    expect(deserializeScheduleDocument(serializeScheduleDocument(renamed)).title).toBe(
      'Vehicle B Program',
    );
  });
});

describe('CR-016: MSPDI carries the project name in Name and Title', () => {
  it('exports the title into BOTH <Name> and <Title>, in XSD sequence order', () => {
    const xml = exportMspdi(makeDocument('Vehicle A Program'));
    expect(xml).toContain('<Name>Vehicle A Program</Name>');
    expect(xml).toContain('<Title>Vehicle A Program</Title>');
    expect(xml.indexOf('<Name>Vehicle A Program</Name>')).toBeLessThan(
      xml.indexOf('<Title>Vehicle A Program</Title>'),
    );
  });

  it('escapes XML-special characters in both elements', () => {
    const xml = exportMspdi(makeDocument('R&D "X" <plan>'));
    expect(xml).toContain('<Name>R&amp;D &quot;X&quot; &lt;plan&gt;</Name>');
    expect(xml).toContain('<Title>R&amp;D &quot;X&quot; &lt;plan&gt;</Title>');
  });

  it('keeps the round-trip lossless (sidecar path)', () => {
    const original = makeDocument('Vehicle A Program');
    expect(importMspdi(exportMspdi(original))).toStrictEqual(original);
  });

  it('preserves the title through the standard-element (sidecar-less) path', () => {
    const xml = stripSidecar(exportMspdi(makeDocument('Vehicle A Program')));
    expect(importMspdi(xml).title).toBe('Vehicle A Program');
  });

  it('prefers <Title> over <Name> on import', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Project xmlns="http://schemas.microsoft.com/project">' +
      '<Name>Name element</Name><Title>Title element</Title>' +
      '<Tasks><Task><UID>1</UID><Name>Task one</Name><Start>2026-05-01T08:00:00</Start>' +
      '<Finish>2026-05-05T17:00:00</Finish></Task></Tasks>' +
      '</Project>';
    expect(importMspdi(xml).title).toBe('Title element');
  });

  it('falls back to <Name> when <Title> is absent or blank', () => {
    const projectXml = (scalars: string): string =>
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Project xmlns="http://schemas.microsoft.com/project">' +
      scalars +
      '<Tasks><Task><UID>1</UID><Name>Task one</Name><Start>2026-05-01T08:00:00</Start>' +
      '<Finish>2026-05-05T17:00:00</Finish></Task></Tasks>' +
      '</Project>';
    expect(importMspdi(projectXml('<Name>Name only</Name>')).title).toBe('Name only');
    expect(importMspdi(projectXml('<Name>Name only</Name><Title>   </Title>')).title).toBe(
      'Name only',
    );
  });

  it('never mistakes a TASK name for the project name', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Project xmlns="http://schemas.microsoft.com/project">' +
      '<Tasks><Task><UID>1</UID><Name>Task one</Name><Start>2026-05-01T08:00:00</Start>' +
      '<Finish>2026-05-05T17:00:00</Finish></Task></Tasks>' +
      '</Project>';
    const imported = importMspdi(xml);
    expect(imported.title).not.toBe('Task one');
    expect(imported.title).toBe('Imported project');
  });
});
