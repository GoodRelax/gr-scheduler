// DFC-920: every colour spelling the copied image-to-data prompt (FR-068) allows is one the GRS JSON read path opens (AT-102, AT-58).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { rowDocument } from '../unit/cr-541-stage'
import { unbroken } from './spec-table'
import { exportStage, restoreAnimationFrames, SMALL_SCREEN, templateDocument } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const FIGURE = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'), 'utf8').replace(/\r\n/g, '\n'),
)

// WHY: each clause is cut from the manuscript as check 39 reads it, so the cases cannot drift from the words they test.
const AT_102_SPELLING =
  'カスタムカラーの `明るいテーマの値/暗いテーマの値`（それぞれ `#rrggbb` か空、両方空は無い。例: `#c0504d/`）'
const AT_58_SAME_FORM = '行の帯の色。形は `AT-102` と同じ。'

describe('DFC-920 the manuscript these cases are driven by', () => {
  it.each([AT_102_SPELLING, AT_58_SAME_FORM])('fig-erd-detail still says it: %s', (clause) => {
    expect(FIGURE).toContain(clause)
  })
})

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

// see FR-068, IC-115
async function copiedPrompt(language: DisplayLanguage): Promise<string> {
  const stage = exportStage(templateDocument(), SMALL_SCREEN, language)
  await stage.take('IC-115')
  const last = stage.clipped[stage.clipped.length - 1]
  if (last === undefined || last.kind !== 'document') throw new Error('IC-115 copied no text')
  return last.text
}

// WHY: the prompt ends its manuscript where the version line begins; the schema after it holds patterns, not advice.
const manuscriptOf = (prompt: string): string => prompt.slice(0, prompt.indexOf('schemaVersion:'))

// WHY: the prompt writes the digits as r, g, b letters; a real digit string stands in for them.
const SAMPLE_DIGITS = 'ff8800'
const spellingsIn = (manuscript: string): string[] =>
  [...manuscript.matchAll(/"(#[^"\s]*)"/g)].map((one) => (one[1] ?? '').replace(/rrggbb/i, SAMPLE_DIGITS))

// WHY: the shared bench decodes a document with one task and one row, whose visual and band colours are the ones under test.
function documentWith(colour: string): string {
  const raw = rowDocument([{ id: 'r1', parentId: null }])
  raw['schedule'].taskVisuals[0].fillColor = colour
  raw['schedule'].taskVisuals[0].strokeColor = colour
  raw['schedule'].taskGroups[0].color = colour
  return JSON.stringify(raw)
}

describe('FR-068 / AT-102 (MUST): the prompt offers the author a custom colour only in a spelling GRS opens (DFC-920)', () => {
  it.each(LANGUAGES)('the %s prompt names at least one custom colour spelling', async (language) => {
    expect(spellingsIn(manuscriptOf(await copiedPrompt(language))).length).toBeGreaterThan(0)
  })

  it.each(LANGUAGES)('every custom colour the %s prompt allows opens as fill, outline and row band', async (language) => {
    for (const spelling of spellingsIn(manuscriptOf(await copiedPrompt(language)))) {
      const read = documentFromJson(documentWith(spelling))
      expect(read.ok, `${language} prompt allows ${JSON.stringify(spelling)}`).toBe(true)
    }
  })

  it('the spelling AT-102 gives as its example opens', () => {
    expect(documentFromJson(documentWith('#c0504d/')).ok).toBe(true)
    expect(documentFromJson(documentWith('/#c0504d')).ok).toBe(true)
    expect(documentFromJson(documentWith('#c0504d/#4d50c0')).ok).toBe(true)
  })

  it('a bare #rrggbb is not one of the spellings (the light-theme value is followed by a slash)', () => {
    expect(documentFromJson(documentWith('#ff8800')).ok).toBe(false)
  })

  it('both values empty is not a spelling (AT-102 "両方空は無い")', () => {
    expect(documentFromJson(documentWith('/')).ok).toBe(false)
  })
})
