/**
 * UseCase layer: the canonical ScheduleDocument JSON Schema, re-exported for the
 * application from the SINGLE source of truth `docs/api/gr-scheduler.schema.json`
 * (DATA-JSON SSOT). The `.json` file is imported directly (resolveJsonModule) so
 * there is exactly ONE copy: the spec, the codec's accepted/serialized format and
 * the app's inlined schema all trace to that one file. `vite build` inlines this
 * JSON into the single self-contained HTML, so a later `[AI]` action can surface
 * the schema entirely offline.
 */

import schema from '../../../docs/api/gr-scheduler.schema.json';

/**
 * The exported-document JSON Schema (draft 2020-12) as a frozen plain object. This
 * is the machine-readable contract for the whole ScheduleDocument aggregate; the
 * conformance test validates freshly-serialized documents against it so any
 * divergence between the codec and this SSOT fails the build.
 */
export const GR_SCHEDULER_DOCUMENT_SCHEMA: Readonly<Record<string, unknown>> = schema as Readonly<
  Record<string, unknown>
>;

/** The `$id` of the canonical schema (stable identifier for tooling / references). */
export const GR_SCHEDULER_DOCUMENT_SCHEMA_ID: string =
  typeof (schema as Record<string, unknown>)['$id'] === 'string'
    ? ((schema as Record<string, unknown>)['$id'] as string)
    : '';
