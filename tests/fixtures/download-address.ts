// The place of the latest version (S-350), of the repository (S-459), of the latest schema (S-540) and of the about page (S-583) read from the settings manuscript, and the seat a word names S-350 by.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

interface SettingsManuscript {
  readonly blocks: readonly {
    readonly id?: string
    readonly rows?: readonly { readonly id?: string; readonly default?: { readonly ja?: string } }[]
  }[]
}

const SETTINGS = JSON.parse(
  readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'settings.json'), 'utf8'),
) as SettingsManuscript

const defaultAddressOf = (id: string): string => {
  for (const block of SETTINGS.blocks) {
    const row = block.rows?.find((one) => one.id === id)
    if (row?.default?.ja !== undefined) return row.default.ja.replace(/^`|`$/g, '')
  }
  throw new Error(`the settings manuscript has no default for ${id}`)
}

// Spec: S-350
export const DOWNLOAD_ADDRESS: string = defaultAddressOf('S-350')

// Spec: S-459, FR-069, BR-4
export const REPOSITORY_ADDRESS: string = defaultAddressOf('S-459')

// Spec: S-540, DR-4
export const SCHEMA_ADDRESS: string = defaultAddressOf('S-540')

// Spec: S-583, FR-036
export const ABOUT_ADDRESS: string = defaultAddressOf('S-583')

// Spec: FR-073
export const DOWNLOAD_URL_SEAT = '{downloadUrl}'

// Spec: FR-073
export const withDownloadAddress = (word: string): string => word.split(DOWNLOAD_URL_SEAT).join(DOWNLOAD_ADDRESS)
