/**
 * CR-004 Part 6c: milestone shape vocabulary. Asserts the extended 12-value
 * MILESTONE_SHAPE_KINDS (base 5 + special 7), that the special shapes are present
 * in the SSOT schema enums, and that a document carrying a special milestone shape
 * round-trips through the json-codec unchanged (DEF-007 decision D-1).
 */

import { describe, expect, it } from 'vitest';
import {
  MILESTONE_SHAPE_KINDS,
  type IconShapeKind,
  type MilestoneShape,
  type ScheduleDocument,
} from '../src/domain/model/schedule-model.js';
import {
  CURRENT_SCHEMA_VERSION,
  deserializeScheduleDocument,
  serializeScheduleDocument,
} from '../src/domain/usecase/json-codec.js';
import { GR_SCHEDULER_DOCUMENT_SCHEMA } from '../src/domain/usecase/document-schema.js';

const SPECIAL_MILESTONE_SHAPES = ['file', 'box3d', 'floppy', 'cylinder', 'person', 'smiley', 'beer'];

/** The item property enum in the SSOT schema, resolved via #/$defs/item. */
function schemaEnum(propertyName: string): unknown[] {
  const defs = GR_SCHEDULER_DOCUMENT_SCHEMA['$defs'] as Record<string, Record<string, unknown>>;
  const itemProperties = defs['item']?.['properties'] as Record<string, Record<string, unknown>>;
  return itemProperties[propertyName]?.['enum'] as unknown[];
}

/** A minimal document with one milestone of the given shape. */
function docWithMilestoneShape(shape: string): ScheduleDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: 'Special milestone',
    epochDate: '2026-01-01',
    viewState: { zoomX: 1, zoomY: 1, scrollX: 0, scrollY: 0, fontScale: 'M' },
    sections: [{ id: 'sec-1', name: 'S', order: 0, rowIds: ['row-1'] }],
    rows: [{ id: 'row-1', sectionId: 'sec-1', classificationLabel: 'R', order: 0 }],
    items: [
      {
        id: 'ms-1',
        rowId: 'row-1',
        itemKind: 'milestone',
        startDate: '2026-02-01',
        endDate: null,
        abbrev: 'REL',
        importance: 80,
        milestoneShape: shape as MilestoneShape,
        iconShapeKind: shape as IconShapeKind,
        fillColor: '#ffffff',
        strokeColor: '#4d4d4d',
      },
    ],
  };
}

describe('MILESTONE_SHAPE_KINDS (CR-004 Part 6c / DEF-007 D-1)', () => {
  it('is the base 5 + special 7 = 12 shapes in canonical order', () => {
    expect(MILESTONE_SHAPE_KINDS).toStrictEqual([
      'circle',
      'triangle',
      'square',
      'diamond',
      'star',
      'file',
      'box3d',
      'floppy',
      'cylinder',
      'person',
      'smiley',
      'beer',
    ]);
    expect(MILESTONE_SHAPE_KINDS).toHaveLength(12);
  });

  it('exposes the special 7 shapes in the SSOT schema milestoneShape / iconShapeKind enums', () => {
    for (const shape of SPECIAL_MILESTONE_SHAPES) {
      expect(schemaEnum('milestoneShape')).toContain(shape);
      expect(schemaEnum('iconShapeKind')).toContain(shape);
    }
  });

  it("round-trips a 'floppy' milestone through the json-codec unchanged", () => {
    const original = docWithMilestoneShape('floppy');
    const restored = deserializeScheduleDocument(serializeScheduleDocument(original));
    expect(restored.items[0]?.milestoneShape).toBe('floppy');
    expect(restored.items[0]?.iconShapeKind).toBe('floppy');
  });
});
