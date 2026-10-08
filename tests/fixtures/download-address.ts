// The place of the latest version (S-350), of the repository (S-459) and of the latest schema (S-540) read from the settings manuscript, and the seat a word names S-350 by.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface SettingsManuscript {
  readonly blocks: readonly {
    readonly id?: string
    readonly rows?: readonly { readonly id?: string; readonly default?: { readonly ja?: string } }[]
  }[]
}

const SETTINGS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'settings.json'), 'utf8'),
) as SettingsManuscript

const defaultAddressOf = (id: string): string => {
  for (const block of SETTINGS.blocks) {
    const row = block.rows?.find((one) => one.id === id)
    if (row?.default?.ja !== undefined) return row.default.ja.replace(/^`|`$/g, '')
  }
  throw new Error(`the settings manuscript has no default for ${id}`)
}

// see S-350
export const DOWNLOAD_ADDRESS: string = defaultAddressOf('S-350')

// see S-459, FR-069, BR-4
export const REPOSITORY_ADDRESS: string = defaultAddressOf('S-459')

// see S-540, DR-4
export const SCHEMA_ADDRESS: string = defaultAddressOf('S-540')

// see FR-073
export const DOWNLOAD_URL_SEAT = '{downloadUrl}'

// see FR-073
export const withDownloadAddress = (word: string): string => word.split(DOWNLOAD_URL_SEAT).join(DOWNLOAD_ADDRESS)
