// The place of the latest version (S-350) read from the settings manuscript, and the seat a word names it by.

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

const s350Cell = (): string => {
  for (const block of SETTINGS.blocks) {
    const row = block.rows?.find((one) => one.id === 'S-350')
    if (row?.default?.ja !== undefined) return row.default.ja
  }
  throw new Error('the settings manuscript has no default for S-350')
}

// see S-350
export const DOWNLOAD_ADDRESS: string = s350Cell().replace(/^`|`$/g, '')

// see FR-073
export const DOWNLOAD_URL_SEAT = '{downloadUrl}'

// see FR-073
export const withDownloadAddress = (word: string): string => word.split(DOWNLOAD_URL_SEAT).join(DOWNLOAD_ADDRESS)
