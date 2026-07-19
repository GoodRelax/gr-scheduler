/**
 * Schema-conformance tests (DATA-JSON SSOT). A freshly-serialized ScheduleDocument
 * MUST validate against docs/api/gr-scheduler.schema.json, and any divergence
 * between the codec's output and that single source of truth MUST fail here.
 *
 * No JSON-Schema validator dependency is added (package.json is frozen); instead a
 * minimal structural validator drives assertions from the schema keys themselves.
 * It supports the subset of draft-2020-12 this schema uses: type (incl. unions),
 * required, properties, additionalProperties (bool), items, enum, $ref (#/$defs),
 * pattern and minimum/maximum.
 */

import { describe, expect, it } from 'vitest';
import { GR_SCHEDULER_DOCUMENT_SCHEMA } from '../src/domain/usecase/document-schema.js';
import { serializeScheduleDocument } from '../src/domain/usecase/json-codec.js';
import { generateSampleDocument, generateTemplateDocument } from '../src/app/sample-data.js';

type JsonSchema = Record<string, unknown>;

/** Resolve a local `#/$defs/...` reference against the root schema. */
function resolveRef(ref: string, root: JsonSchema): JsonSchema {
  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported $ref (only local #/ refs are supported): ${ref}`);
  }
  let node: unknown = root;
  for (const segment of ref.slice(2).split('/')) {
    node = (node as Record<string, unknown>)[segment];
    if (node === undefined) {
      throw new Error(`Unresolvable $ref: ${ref}`);
    }
  }
  return node as JsonSchema;
}

/** The JSON type name used by the schema's `type` keyword. */
function jsonTypeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

/** True when `actual` satisfies a schema `type` (string or array of names). */
function matchesType(typeKeyword: unknown, actual: string): boolean {
  const allowed = Array.isArray(typeKeyword) ? typeKeyword : [typeKeyword];
  // draft-2020-12: an integer value also satisfies type "number".
  return allowed.some((name) => name === actual || (name === 'number' && actual === 'integer'));
}

/**
 * Validate `value` against `schema`, collecting every violation path. An empty
 * result means the value conforms.
 */
function collectSchemaViolations(
  value: unknown,
  schema: JsonSchema,
  root: JsonSchema,
  path: string,
): string[] {
  if (typeof schema['$ref'] === 'string') {
    return collectSchemaViolations(value, resolveRef(schema['$ref'], root), root, path);
  }

  const violations: string[] = [];
  const actualType = jsonTypeOf(value);

  if (schema['type'] !== undefined && !matchesType(schema['type'], actualType)) {
    violations.push(`${path}: expected type ${JSON.stringify(schema['type'])} but got ${actualType}`);
    return violations; // further checks assume the base type held
  }
  if (Array.isArray(schema['enum']) && !schema['enum'].some((option) => option === value)) {
    violations.push(`${path}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema['enum'])}`);
  }
  if (typeof schema['pattern'] === 'string' && typeof value === 'string') {
    if (!new RegExp(schema['pattern']).test(value)) {
      violations.push(`${path}: ${JSON.stringify(value)} does not match /${schema['pattern']}/`);
    }
  }
  if (typeof schema['minimum'] === 'number' && typeof value === 'number' && value < schema['minimum']) {
    violations.push(`${path}: ${value} < minimum ${schema['minimum']}`);
  }
  if (typeof schema['maximum'] === 'number' && typeof value === 'number' && value > schema['maximum']) {
    violations.push(`${path}: ${value} > maximum ${schema['maximum']}`);
  }

  if (actualType === 'object') {
    violations.push(...validateObject(value as Record<string, unknown>, schema, root, path));
  } else if (actualType === 'array' && schema['items'] !== undefined) {
    (value as unknown[]).forEach((element, index) => {
      violations.push(
        ...collectSchemaViolations(element, schema['items'] as JsonSchema, root, `${path}[${index}]`),
      );
    });
  }
  return violations;
}

/** Object-specific checks: required, properties, additionalProperties. */
function validateObject(
  value: Record<string, unknown>,
  schema: JsonSchema,
  root: JsonSchema,
  path: string,
): string[] {
  const violations: string[] = [];
  const properties = (schema['properties'] as Record<string, JsonSchema> | undefined) ?? {};

  for (const requiredKey of (schema['required'] as string[] | undefined) ?? []) {
    if (!(requiredKey in value)) {
      violations.push(`${path}: missing required property "${requiredKey}"`);
    }
  }
  for (const [key, propertyValue] of Object.entries(value)) {
    const propertySchema = properties[key];
    if (propertySchema !== undefined) {
      violations.push(...collectSchemaViolations(propertyValue, propertySchema, root, `${path}.${key}`));
    } else if (schema['additionalProperties'] === false) {
      violations.push(`${path}: unexpected property "${key}" (additionalProperties is false)`);
    }
  }
  return violations;
}

/** Validate a serialized document string against the canonical schema. */
function conformanceViolations(serializedJson: string): string[] {
  const parsed: unknown = JSON.parse(serializedJson);
  return collectSchemaViolations(
    parsed,
    GR_SCHEDULER_DOCUMENT_SCHEMA as JsonSchema,
    GR_SCHEDULER_DOCUMENT_SCHEMA as JsonSchema,
    '$',
  );
}

describe('document-schema SSOT (docs/api/gr-scheduler.schema.json)', () => {
  it('exposes the schema as the single inlined source (draft 2020-12)', () => {
    expect(GR_SCHEDULER_DOCUMENT_SCHEMA['$schema']).toBe('https://json-schema.org/draft/2020-12/schema');
    expect((GR_SCHEDULER_DOCUMENT_SCHEMA['required'] as string[])).toContain('projectId');
  });

  it('the serialized starter template conforms to the schema', () => {
    const violations = conformanceViolations(serializeScheduleDocument(generateTemplateDocument()));
    expect(violations).toStrictEqual([]);
  });

  it('a serialized mid-size sample document conforms to the schema', () => {
    const violations = conformanceViolations(serializeScheduleDocument(generateSampleDocument(40, 8)));
    expect(violations).toStrictEqual([]);
  });

  it('FAILS when the codec output diverges from the schema (guard is real)', () => {
    // An unexpected top-level key must be reported: this is the divergence the test
    // exists to catch (additionalProperties:false at document root).
    const serialized = serializeScheduleDocument(generateTemplateDocument());
    const doctored = { ...JSON.parse(serialized), unexpectedField: 'drift' };
    const violations = conformanceViolations(JSON.stringify(doctored));
    expect(violations.some((message) => message.includes('unexpectedField'))).toBe(true);
  });

  it('FAILS when a required item field is dropped (structural guard)', () => {
    const parsed = JSON.parse(serializeScheduleDocument(generateTemplateDocument())) as {
      items: Record<string, unknown>[];
    };
    delete parsed.items[0]?.['abbrev'];
    const violations = conformanceViolations(JSON.stringify(parsed));
    expect(violations.some((message) => message.includes('abbrev'))).toBe(true);
  });
});
