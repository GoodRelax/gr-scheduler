// The shared fixture for anything that reads or writes a `GRS JSON` document.
//
// There is one reason this file exists: if each of the 71 units builds its own
// idea of what a document looks like, no integration test can be written at
// all, because no two of them agree. So the shape comes from one place, and
// that place is the generated schema -- which check 17 keeps in step with
// docs/spec/_assets/source/erd.json and docs/spec/_assets/tbl-settings.md.
//
// Deliberately NOT here: a sample document.
// A sample needs values the specification has not decided -- what string
// `schemaVersion` carries, what a new document's stamp holds. Inventing them
// here would make this fixture the source of a decision nobody took, and every
// test built on it would inherit that. When those are ruled on, the sample
// belongs next to this file and is validated by `validateDocument` below.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Ajv2020, type ErrorObject } from 'ajv/dist/2020.js'

const SCHEMA_PATH = join(process.cwd(), 'docs', 'spec', '_assets', 'grs-document.schema.json')

/** The `GRS JSON` schema, as generated from its two sources. */
export const documentSchema: unknown = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))

const ajv = new Ajv2020({ allErrors: true, strict: false })
// Registered once under its own $id, so a definition inside it can be reached
// by reference instead of compiled a second time.
const schemaId = (documentSchema as { $id: string }).$id
ajv.addSchema(documentSchema as object, schemaId)
const validator = ajv.getSchema(schemaId)
if (validator === undefined) throw new Error('the GRS JSON schema did not compile')

export interface ValidationResult {
  readonly valid: boolean
  /** One line per failure: the JSON pointer and what was wrong with it. */
  readonly errors: readonly string[]
}

/** Validate a value as a whole `GRS JSON` document. */
export function validateDocument(value: unknown): ValidationResult {
  const valid = validator(value)
  const errors = (validator.errors ?? []).map(
    (e: ErrorObject) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`,
  )
  return { valid, errors }
}

/** Validate a value against one `$defs` entry, e.g. `Task` or `Calendar`. */
export function validateEntity(entity: string, value: unknown): ValidationResult {
  const defs = (documentSchema as { $defs?: Record<string, unknown> }).$defs ?? {}
  if (!(entity in defs)) throw new Error(`the schema has no definition for ${entity}`)
  const check = ajv.getSchema(`${schemaId}#/$defs/${entity}`)
  if (check === undefined) throw new Error(`${entity} did not compile`)
  const valid = check(value)
  const errors = (check.errors ?? []).map(
    (e: ErrorObject) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`,
  )
  return { valid, errors }
}
