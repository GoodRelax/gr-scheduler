// CR-768 spec-only bench: table T-024 read by its headings, and the generated regions of src read as text.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { bare, specTable, unbroken } from './spec-table'

// WHY: the two headings CR-768 (JDG-2163) added to table T-024; read by name so a moved column moves nothing here.
export const MEDIA_TYPE_HEADING = '保存の選択面に渡す媒体の型'
export const OFFERED_HEADING = '`IC-2` に出す'
export const EXTENSION_HEADING = '拡張子'
export const DIRECTION_HEADING = '方向'

// WHY: how table T-024 writes "this row has no such value".
const NO_VALUE = '—'

export const OFFERED_WORD = '出す'
export const NOT_OFFERED_WORD = '出さない'

export interface FormatRow {
  readonly id: string
  readonly direction: string
  readonly extension: string | null
  readonly mediaType: string | null
  readonly offered: string
}

const valueOf = (cell: string | undefined): string | null => {
  const text = bare(cell ?? '').trim()
  return text === NO_VALUE || text === '' ? null : text
}

export function formatRows(): readonly FormatRow[] {
  return specTable('T-024').rows.map((row) => ({
    id: row.id,
    direction: row.by[DIRECTION_HEADING] ?? '',
    extension: valueOf(row.by[EXTENSION_HEADING]),
    mediaType: valueOf(row.by[MEDIA_TYPE_HEADING]),
    offered: (row.by[OFFERED_HEADING] ?? '').trim(),
  }))
}

export const fileRows = (): readonly FormatRow[] => formatRows().filter((one) => one.extension !== null)

export const offeredRows = (): readonly FormatRow[] => formatRows().filter((one) => one.offered === OFFERED_WORD)

export function rowOf(id: string): FormatRow {
  const found = formatRows().find((one) => one.id === id)
  if (found === undefined) throw new Error(`table T-024 has no row ${id}`)
  return found
}

export const extensionOf = (id: string): string => {
  const extension = rowOf(id).extension
  if (extension === null) throw new Error(`table T-024 row ${id} carries no extension`)
  return extension
}

export const mediaTypeOf = (id: string): string => {
  const mediaType = rowOf(id).mediaType
  if (mediaType === null) throw new Error(`table T-024 row ${id} carries no media type`)
  return mediaType
}

const SPEC = join(process.cwd(), 'docs', 'spec')

export const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))

export function requirementText(uid: string): string {
  const from = REQUIREMENTS.indexOf(`**UID**: ${uid}\n`)
  if (from < 0) throw new Error(`the specification has no requirement ${uid}`)
  const next = REQUIREMENTS.indexOf('\n#### ', from)
  return REQUIREMENTS.slice(from, next < 0 ? undefined : next)
}

export const sourceText = (relative: string): string =>
  readFileSync(join(process.cwd(), relative), 'utf8').replace(/\r\n/g, '\n')

const REGION = /\/\/ <generated[^\n]*\n[\s\S]*?\n\/\/ <\/generated>/g

export const generatedRegions = (text: string): readonly string[] => text.match(REGION) ?? []

export function regionHolding(relative: string, needle: string): string {
  const found = generatedRegions(sourceText(relative)).find((region) => region.includes(needle))
  if (found === undefined) throw new Error(`${relative}: no generated region holds ${needle}`)
  return found
}

export const quotedMembers = (text: string): readonly string[] =>
  [...text.matchAll(/'([^']+)'/g)].map((one) => one[1] ?? '')
