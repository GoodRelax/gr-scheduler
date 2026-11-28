// Contract tests: the words a notice carries are read against the row of table T-233 they are carried for.

import { createHash } from 'node:crypto'
import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { bare, specTable } from './spec-table'

const ROOT = process.cwd()

const MANUSCRIPT_PATH = join(ROOT, 'docs', 'spec', '_source', 'display-words.json')

const GENERATED_PATH = join(ROOT, 'src', 'adapter', 'screen-renderer', 'display-words.json')

interface Words {
  readonly ja: string
  readonly en: string
}

interface ReasonEntry {
  readonly specTableRowId: string
  readonly text: Words
  readonly nextStep?: Words
}

const reasonsIn = (path: string): readonly ReasonEntry[] => {
  const raw = JSON.parse(readRepoFile(path, 'utf8')) as Record<string, unknown>
  const section = raw['reasons']
  if (!Array.isArray(section)) throw new Error(`${path} holds no reasons section`)
  return section as readonly ReasonEntry[]
}

const MANUSCRIPT = reasonsIn(MANUSCRIPT_PATH)
const DELIVERED = reasonsIn(GENERATED_PATH)

const T233 = specTable('T-233')

const SHARED_WORDS = /語は `(RS-\d+)`/
const wordsRowOf = (specTableRowId: string): string => {
  const row = T233.rows.find((one) => one.id === specTableRowId)
  const shared = SHARED_WORDS.exec(row?.by['まとめ方'] ?? '')
  return shared?.[1] ?? specTableRowId
}

const entryOf = (specTableRowId: string): ReasonEntry => {
  const found = DELIVERED.find((one) => one.specTableRowId === wordsRowOf(specTableRowId))
  if (found === undefined) throw new Error(`the dictionary holds no reason ${specTableRowId}`)
  return found
}

const sceneOf = (specTableRowId: string): string => {
  const row = T233.rows.find((one) => one.id === specTableRowId)
  if (row === undefined) throw new Error(`table T-233 has no row ${specTableRowId}`)
  const scene = row.by['場面']
  if (scene === undefined) throw new Error('table T-233 has no 場面 column')
  return scene
}

const mannerOf = (specTableRowId: string): string => {
  const row = T233.rows.find((one) => one.id === specTableRowId)
  if (row === undefined) throw new Error(`table T-233 has no row ${specTableRowId}`)
  return bare(row.by['作法'] ?? '')
}

const ROW_IDS: readonly string[] = T233.rows.map((row) => row.id)

const ROWS_WITH_OWN_WORDS: readonly string[] = ROW_IDS.filter((specTableRowId) => wordsRowOf(specTableRowId) === specTableRowId)

// Why: a fingerprint and not the words, since FR-038 admits one store of printed words and
// a copy here would be a second store that goes stale.
// Trap: pasting a new fingerprint from the failure message, without reading the scene and
// the words together and correcting the words first, defeats the latch.
// Trap: changing the space that joins the five fields re-keys every row with no pair re-read,
// which is that same paste-in.
const PAIRED_ON_2026_09_03: Readonly<Record<string, string>> = {
  'RS-1': '4e06709e0faeacdf',
  'RS-2': '99014ef99e47bb3d',
  'RS-3': 'faef8d7f1451cdb6',
  'RS-4': 'fa18413b8ba17296',
  'RS-5': 'b6abbf3323dd6bc9',
  'RS-6': '6bb7e2dac6ef2729',
  'RS-7': 'bee1f45e481ff210',
  'RS-8': '5246e70dbb9b5176',
  'RS-9': '2b82bc278eeb6198',
  'RS-10': '7511250cbfd09bdf',
  'RS-11': 'c6653e5783ae7df2',
  'RS-12': '95ad8c948d6a7601',
  'RS-13': 'f321af6f75bd49bf',
  'RS-14': 'cf268c722d841409',
  'RS-16': '1eac0dcebc65e01a',
  'RS-19': '653421bf0fe000be',
  'RS-20': '36f43f499a83ae7f',
  'RS-21': 'ee990c6018d1a693',
  'RS-22': '10eb5895e870b2fa',
  'RS-23': 'b9fa9d67de247443',
  'RS-24': 'ecaeb30723d6a2eb',
  'RS-25': 'b5ecfa5dbaf254af',
  'RS-26': 'a2d15b5a681f8f37',
  'RS-27': 'c5082717955315b1',
  'RS-28': '17384e3e95f1923c',
  'RS-29': 'e1e9b843248cfb66',
  'RS-30': 'ea287abd76bfec91',
  'RS-31': 'fbf6b90b3bd24213',
  'RS-32': '8f6a3b4632a549c0',
  'RS-33': '12ab5c81b0f353b9',
  'RS-34': '208cd7e4ab6ad6b4',
  'RS-40': 'ee6ace9eedfca0f0',
  'RS-41': '34729e01f76ee4ed',
  'RS-42': 'fcbbc9996fa64c05',
  'RS-43': 'fbb77a59bc23fc7c',
  'RS-44': '9470f42447a1e43c',
  'RS-46': 'd81a17a2a4e27f6b',
  'RS-48': 'a0e952c306b84841',
  'RS-63': 'a18f4a5cf5656086',
  'RS-64': 'a90a29e20cd784fa',
  'RS-49': '67a6574e42a4e7d2',
  'RS-50': 'ff56c31d6f15204a',
  'RS-51': '6e02150e3eddb51f',
  'RS-52': '9617566a64fa1a28',
  'RS-53': '29e1977f4a16d456',
  'RS-15': '6297993f46149221',
  'RS-54': '558c7caaaf951875',
  'RS-55': '6f50e8e196c6abc3',
  'RS-56': '87208aab9b1738c9',
  'RS-57': '7321f1ec92dfb996',
  'RS-58': '48b6575a7f704f7e',
  'RS-59': 'ca5ce244475236d8',
  'RS-60': '275f46ff4448f779',
  'RS-61': '13509a5ad232404f',
  'RS-62': '34079abfe2bdd00d',
  'RS-65': 'a159e9808bbc345e',
  'RS-66': '8902906e4fbc4e1f',
  'RS-67': '1271e9fd41af3746',
  'RS-68': 'f2d7f18901dcc0a0',
  'RS-69': '622c7c9858d60d6a',
  'RS-70': '164e7929c5bca997',
  'RS-71': 'e4cf8addf139dc9d',
  'RS-72': 'b9542a7c91a16d34',
  'RS-73': 'd09a368a5aadff7b',
  'RS-74': '2fda66aed54bfb73',
  'RS-75': 'd7540ecac35069e4',
  'RS-76': '12abe41d1b423c81',
  'RS-77': '4632023f72925b3e',
  'RS-78': '49e4427d5fbf4fc7',
  'RS-79': '8594e69ebd464347',
  'RS-80': '3adf2f4780a23be2',
  'RS-81': '8bfc0f5cc531d50c',
  'RS-82': 'edd8c91b06498800',
  'RS-83': '816c8fce5784f84a',
  'RS-84': '46510224ead9b67d',
  'RS-85': 'a1c7cd4f457dcc72',
  'RS-86': '118c544dd5ae1637',
  'RS-87': 'b6b6bb28f94a91c1',
  'RS-88': '0e1f8f1cef6b1cc1',
  'RS-89': 'afc4b6d7567c09ae',
  'RS-90': 'f6b4a054a668daef',
}

const fingerprintOf = (specTableRowId: string): string => {
  const entry = entryOf(specTableRowId)
  const payload = [
    sceneOf(specTableRowId),
    entry.text.ja,
    entry.text.en,
    entry.nextStep?.ja ?? '',
    entry.nextStep?.en ?? '',
  ].join(' ')
  return createHash('sha256').update(payload, 'utf8').digest('hex').slice(0, 16)
}

// Spec: T-233, T-037, NT-1, NT-3a
describe('table T-233 -- every row has its word, and no word has no row', () => {
  it('holds a reason for every row of the table and no reason outside it (MUST)', () => {
    expect([...DELIVERED.map((one) => one.specTableRowId)].sort()).toEqual([...ROWS_WITH_OWN_WORDS].sort())
  })

  it('the words that reach src/ are the words the manuscript holds (Chapter 6.2, MUST)', () => {
    // Why: the latch below fingerprints the delivered words, which say what a reader is told
    // only while they equal the manuscript.
    expect(DELIVERED).toEqual(MANUSCRIPT)
  })

  it('says something in both languages for every row (NT-1, MUST)', () => {
    for (const specTableRowId of ROW_IDS) {
      const entry = entryOf(specTableRowId)
      expect(entry.text.ja.trim(), `${specTableRowId} has no Japanese word`).not.toBe('')
      expect(entry.text.en.trim(), `${specTableRowId} has no English word`).not.toBe('')
    }
  })

  it('adds the next step wherever the row calls for NT-3a (MUST)', () => {
    const owing = ROW_IDS.filter((specTableRowId) => mannerOf(specTableRowId) === 'NT-3a')
    expect(owing.length, 'no row of T-233 calls for NT-3a any more').toBeGreaterThan(0)
    for (const specTableRowId of owing) {
      const next = entryOf(specTableRowId).nextStep
      expect(next?.ja.trim(), `${specTableRowId} is an NT-3a row with no next step in Japanese`).toBeTruthy()
      expect(next?.en.trim(), `${specTableRowId} is an NT-3a row with no next step in English`).toBeTruthy()
    }
  })
})

// Spec: T-233, FR-038
// Why: a review latch, not a claim the words are true: either the scene or the words moving
// fails the row, so neither side moves in silence.
describe('table T-233 -- the word and the row it is carried for were read together', () => {
  it('has a recorded pairing for every row, and none for a row that is gone', () => {
    expect(Object.keys(PAIRED_ON_2026_09_03).sort()).toEqual([...ROW_IDS].sort())
  })

  it.each(ROW_IDS)(
    '%s: the 場面 and the words it is answered with have not moved apart',
    (specTableRowId) => {
      const entry = entryOf(specTableRowId)
      expect(
        fingerprintOf(specTableRowId),
        `${specTableRowId}: read these together and correct the words if they no longer tell the scene, ` +
          `THEN record the new fingerprint.\n` +
          `  表 T-233 場面: ${sceneOf(specTableRowId)}\n` +
          `  ja: ${entry.text.ja}\n` +
          `  en: ${entry.text.en}\n` +
          `  next (ja): ${entry.nextStep?.ja ?? ''}\n` +
          `  next (en): ${entry.nextStep?.en ?? ''}`,
      ).toBe(PAIRED_ON_2026_09_03[specTableRowId])
    },
  )
})
