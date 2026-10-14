// CR-750 (spec-only): T-233 RS-90's next step names the keepLocalTime word, then the IC-161 word, read from the dictionary (FR-038, FR-156).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// see FR-038, FR-156, IC-161
const MANUSCRIPT_PATH = join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json')
const GENERATED_PATH = join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json')

interface Words {
  readonly ja: string
  readonly en: string
}

interface Dictionary {
  readonly icons: readonly { readonly rowId: string; readonly label: Words }[]
  readonly timeZoneField: readonly { readonly part: string; readonly text: Words }[]
  readonly reasons: readonly { readonly rowId: string; readonly nextStep?: Words }[]
}

const dictionaryAt = (path: string): Dictionary => JSON.parse(readFileSync(path, 'utf8')) as Dictionary

const LANGUAGES = ['ja', 'en'] as const
type Language = (typeof LANGUAGES)[number]

describe.each([
  ['the manuscript', MANUSCRIPT_PATH],
  ['the generated dictionary', GENERATED_PATH],
])('RS-90 next step in %s', (_label, path) => {
  const dictionary = dictionaryAt(path)

  const entryWord = (language: Language): string => {
    const found = dictionary.icons.find((one) => one.rowId === 'IC-161')
    if (found === undefined) throw new Error('the dictionary holds no IC-161')
    return found.label[language]
  }

  const keepLocalTimeWord = (language: Language): string => {
    const found = dictionary.timeZoneField.find((one) => one.part === 'keepLocalTime')
    if (found === undefined) throw new Error('the dictionary holds no keepLocalTime word')
    return found.text[language]
  }

  const nextStep = (language: Language): string => {
    const found = dictionary.reasons.find((one) => one.rowId === 'RS-90')?.nextStep
    if (found === undefined) throw new Error('the dictionary holds no next step for RS-90')
    return found[language]
  }

  it.each(LANGUAGES)('holds the IC-161 word (%s)', (language) => {
    expect(entryWord(language).length).toBeGreaterThan(0)
    expect(nextStep(language)).toContain(entryWord(language))
  })

  it.each(LANGUAGES)('holds the keepLocalTime word (%s)', (language) => {
    expect(keepLocalTimeWord(language).length).toBeGreaterThan(0)
    expect(nextStep(language)).toContain(keepLocalTimeWord(language))
  })

  it.each(LANGUAGES)('names the choice before the press (%s)', (language) => {
    const text = nextStep(language)
    expect(text.indexOf(keepLocalTimeWord(language))).toBeGreaterThanOrEqual(0)
    expect(text.indexOf(entryWord(language))).toBeGreaterThan(text.indexOf(keepLocalTimeWord(language)))
  })

  it.each(LANGUAGES)('ends on the press, with no further choice or entry named after the IC-161 word (%s)', (language) => {
    const text = nextStep(language)
    const tail = text.slice(text.lastIndexOf(entryWord(language)) + entryWord(language).length)
    expect(tail).not.toMatch(/[\[「]/u)
    expect(tail).not.toContain(keepLocalTimeWord(language))
  })

  it('shows the Japanese entry in brackets and the English entry without', () => {
    expect(nextStep('ja')).toContain(`[${entryWord('ja')}]`)
    expect(nextStep('en')).not.toContain(`[${entryWord('en')}]`)
  })
})

// see FR-156
describe('the entry the next step names is the one that applies the choice', () => {
  const requirements = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')

  it('FR-156 applies the base when IC-161 is pressed, not when a region is only chosen', () => {
    expect(requirements.replace(/\r?\n/g, '')).toContain(
      '当てる入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-161`）を押したときに当てること（MUST）',
    )
  })
})
