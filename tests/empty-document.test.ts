/**
 * Unit coverage for the fresh-empty document used by All Clear (SHELL batch item 2).
 * It must be a valid, normalized ScheduleDocument with no items / dependencies /
 * annotations, so the confirmed reset lands the app in a clean editable state.
 */

import { describe, expect, it } from 'vitest';
import { generateEmptyDocument } from '../src/app/sample-data.js';
import { serializeScheduleDocument } from '../src/domain/usecase/json-codec.js';
import { GR_SCHEDULER_DOCUMENT_SCHEMA } from '../src/domain/usecase/document-schema.js';

describe('generateEmptyDocument', () => {
  it('produces an empty but valid document', () => {
    const doc = generateEmptyDocument('00000000-0000-4000-8000-0000000000ab');
    expect(doc.items).toHaveLength(0);
    expect(doc.dependencies).toHaveLength(0);
    expect(doc.annotations).toHaveLength(0);
    expect(doc.projectId).toBe('00000000-0000-4000-8000-0000000000ab');
    // Normalization derives the tree from items, so an item-free reset has no rows.
    expect(doc.rows).toHaveLength(0);
    expect(Array.isArray(doc.sections)).toBe(true);
  });

  it('serializes to JSON with the schema-declared top-level fields', () => {
    const doc = generateEmptyDocument();
    const json = JSON.parse(serializeScheduleDocument(doc)) as Record<string, unknown>;
    const required = (GR_SCHEDULER_DOCUMENT_SCHEMA as { required?: string[] }).required ?? [];
    for (const key of required) {
      expect(json, `missing required field: ${key}`).toHaveProperty(key);
    }
  });
});
