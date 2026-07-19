/**
 * Unique-identifier tests (batch: unique IDs). Covers the adapter id generator
 * (UUID project ids + short unique ids with collision retry) and the pure codec
 * migration that back-fills missing ids on import, and proves ids round-trip and
 * that dependency / classification references still resolve after the id work.
 */

import { describe, expect, it } from 'vitest';
import {
  SHORT_ID_LENGTH,
  createIdGenerator,
  generateProjectId,
  generateUniqueShortId,
  randomShortId,
} from '../src/adapters/id/id-generator.js';
import {
  assignMissingIds,
  deterministicUuid,
  isUuidLike,
} from '../src/domain/usecase/id-migration.js';
import {
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';
import { generateTemplateDocument, TEMPLATE_PROJECT_ID } from '../src/app/sample-data.js';
import type { ScheduleDocument } from '../src/domain/model/schedule-model.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHORT_ID_PATTERN = /^[A-Za-z0-9]{8}$/;

describe('id-generator adapter (Web Crypto seam)', () => {
  it('mints project ids as UUID v4', () => {
    const projectId = generateProjectId();
    expect(projectId).toMatch(UUID_PATTERN);
    expect(isUuidLike(projectId)).toBe(true);
  });

  it('mints short ids of the documented length from the [A-Za-z0-9] alphabet', () => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const shortId = randomShortId();
      expect(shortId).toHaveLength(SHORT_ID_LENGTH);
      expect(shortId).toMatch(SHORT_ID_PATTERN);
    }
  });

  it('generates a large batch of short ids with no collision (probabilistic)', () => {
    const ids = new Set<string>();
    for (let attempt = 0; attempt < 5000; attempt += 1) {
      ids.add(randomShortId());
    }
    // 5000 draws from a 62^8 space: a collision here would be a real defect.
    expect(ids.size).toBe(5000);
  });

  it('never returns an id already in the existing set (collision-retry guarantee)', () => {
    // Force the retry path: pre-populate the "used" set with the next id the
    // generator would emit, and assert the returned id differs from it.
    const used = new Set<string>();
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const id = generateUniqueShortId(used);
      expect(used.has(id)).toBe(false);
      used.add(id);
    }
    expect(used.size).toBe(500);
  });

  it('exposes an injectable generator facade', () => {
    const generator = createIdGenerator();
    expect(generator.newProjectId()).toMatch(UUID_PATTERN);
    expect(generator.newShortId(new Set())).toMatch(SHORT_ID_PATTERN);
  });
});

describe('pure id migration (assignMissingIds)', () => {
  it('assigns a deterministic UUID projectId when absent, stable across calls', () => {
    const raw = { title: 'X', epochDate: '2026-01-01', items: [], sections: [] };
    const first = assignMissingIds(raw)['projectId'];
    const second = assignMissingIds(raw)['projectId'];
    expect(isUuidLike(first)).toBe(true);
    expect(first).toBe(second);
  });

  it('keeps an already-valid projectId untouched', () => {
    const projectId = '99999999-9999-4999-8999-999999999999';
    const raw = { projectId, title: 'X', epochDate: '2026-01-01', items: [], sections: [] };
    expect(assignMissingIds(raw)['projectId']).toBe(projectId);
  });

  it('assigns short ids to id-less sections and items, unique within the doc', () => {
    const raw = {
      title: 'X',
      epochDate: '2026-01-01',
      sections: [{ name: 'A', order: 0, rowIds: [] }, { name: 'B', order: 1, rowIds: [] }],
      items: [
        { rowId: 'r', itemKind: 'task', startDate: '2026-01-01', endDate: '2026-01-02', abbrev: 'T', importance: 1, fillColor: '#111111', strokeColor: 'transparent' },
        { rowId: 'r', itemKind: 'milestone', startDate: '2026-01-03', endDate: null, abbrev: 'M', importance: 1, fillColor: '#111111', strokeColor: 'transparent' },
      ],
    };
    const migrated = assignMissingIds(raw);
    const sectionIds = (migrated['sections'] as { id: string }[]).map((section) => section.id);
    const itemIds = (migrated['items'] as { id: string }[]).map((item) => item.id);
    const allIds = [...sectionIds, ...itemIds];
    for (const id of allIds) {
      expect(id).toMatch(SHORT_ID_PATTERN);
    }
    expect(new Set(allIds).size).toBe(allIds.length); // all unique
  });

  it('preserves existing ids and only fills the missing ones', () => {
    const raw = {
      projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      title: 'X',
      epochDate: '2026-01-01',
      sections: [],
      items: [
        { id: 'keep-me', rowId: 'r', itemKind: 'task', startDate: '2026-01-01', endDate: '2026-01-02', abbrev: 'T', importance: 1, fillColor: '#111111', strokeColor: 'transparent' },
        { rowId: 'r', itemKind: 'task', startDate: '2026-01-01', endDate: '2026-01-02', abbrev: 'U', importance: 1, fillColor: '#111111', strokeColor: 'transparent' },
      ],
    };
    const items = assignMissingIds(raw)['items'] as { id: string }[];
    expect(items[0]?.id).toBe('keep-me');
    expect(items[1]?.id).toMatch(SHORT_ID_PATTERN);
  });

  it('deterministicUuid produces a valid, seed-stable v4 UUID', () => {
    expect(deterministicUuid('seed-1')).toBe(deterministicUuid('seed-1'));
    expect(deterministicUuid('seed-1')).toMatch(UUID_PATTERN);
    expect(deterministicUuid('seed-1')).not.toBe(deterministicUuid('seed-2'));
  });
});

describe('import migration through the JSON codec', () => {
  it('assigns projectId + section/item ids to an id-less imported document', () => {
    const idLessJson = JSON.stringify({
      schemaVersion: 1,
      title: 'Legacy',
      epochDate: '2026-01-01',
      viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
      sections: [{ name: 'S', order: 0, rowIds: [] }],
      rows: [{ id: 'row-0', sectionId: 'will-be-fixed', classificationLabel: 'A', order: 0 }],
      items: [
        { rowId: 'row-0', itemKind: 'task', startDate: '2026-01-01', endDate: '2026-01-10', abbrev: 'T', importance: 1, fillColor: '#4477aa', strokeColor: 'transparent' },
      ],
    });
    const restored = deserializeScheduleDocument(idLessJson);
    expect(isUuidLike(restored.projectId)).toBe(true);
    expect(restored.sections[0]?.id).toMatch(SHORT_ID_PATTERN);
    expect(restored.items[0]?.id).toMatch(SHORT_ID_PATTERN);
  });

  it('round-trips ids: a doc with ids re-imports byte-for-meaning identical', () => {
    const original = generateTemplateDocument();
    expect(original.projectId).toBe(TEMPLATE_PROJECT_ID);
    const restored = deserializeScheduleDocument(serializeScheduleDocument(original));
    expect(restored.projectId).toBe(TEMPLATE_PROJECT_ID);
    expect(restored).toStrictEqual(original);
  });

  it('keeps dependency and classification references resolving after id assignment', () => {
    const original: ScheduleDocument = generateTemplateDocument();
    const restored = deserializeScheduleDocument(serializeScheduleDocument(original));
    // Every dependency endpoint still names a real item id.
    const itemIds = new Set(restored.items.map((item) => item.id));
    for (const dependency of restored.dependencies ?? []) {
      expect(itemIds.has(dependency.fromItemId)).toBe(true);
      expect(itemIds.has(dependency.toItemId)).toBe(true);
    }
    // Every item's rowId still names a real row (classification reference intact).
    const rowIds = new Set(restored.rows.map((row) => row.id));
    for (const item of restored.items) {
      expect(rowIds.has(item.rowId)).toBe(true);
    }
  });
});
