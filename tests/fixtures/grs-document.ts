// The shared fixture for anything that reads or writes a `GRS JSON` document.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js'

const SCHEMA_PATH = join(process.cwd(), 'docs', 'spec', '_source', 'grs-document.schema.json')

export const documentSchema: unknown = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))

const ajv = new Ajv2020({ allErrors: true, strict: false })
// WHY: registered once under its own $id so a reference reaches it, rather
// than compiling the schema a second time for each reference.
const schemaId = (documentSchema as { $id: string }).$id
ajv.addSchema(documentSchema as object, schemaId)

// WHY: ajv's getSchema returns undefined, not a thrown error, for an
// unresolved id -- turned into one here so no call site must check for it.
const compiledSchema = (id: string): ValidateFunction => {
  const found = ajv.getSchema(id)
  if (found === undefined) throw new Error(`${id} did not compile`)
  return found
}

const validator = compiledSchema(schemaId)

export interface ValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

export function validateDocument(value: unknown): ValidationResult {
  const valid = validator(value)
  const errors = (validator.errors ?? []).map(
    (e: ErrorObject) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`,
  )
  return { valid, errors }
}

export function validateEntity(entity: string, value: unknown): ValidationResult {
  const defs = (documentSchema as { $defs?: Record<string, unknown> }).$defs ?? {}
  if (!(entity in defs)) throw new Error(`the schema has no definition for ${entity}`)
  const check = compiledSchema(`${schemaId}#/$defs/${entity}`)
  const valid = check(value)
  const errors = (check.errors ?? []).map(
    (e: ErrorObject) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`,
  )
  return { valid, errors }
}
