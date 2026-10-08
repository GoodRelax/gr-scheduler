// W3 tester 3: FR-068 -- the copied image-to-data prompt is built from the screen language's manuscript at the moment of the copy.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { unbroken } from './spec-table'
import { exportStage, restoreAnimationFrames, SMALL_SCREEN, templateDocument, type ExportStage } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const SOURCE = join(process.cwd(), 'docs', 'spec', '_source')
const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'),
)

const CLAUSE_SCREEN_LANGUAGE = '⭐ プロンプトは、コピーした瞬間の画面の言語（`FR-038` の `S-99`、`screenLanguage`）の原稿から作ること（MUST）'

const COPY_PROMPT = 'IC-115'
const CHOOSE_SCREEN_LANGUAGE = 'IC-21'
const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

// WHY: the manuscript's first line is its own role line; its longest plain line tells the language apart.
function markerLineOf(language: DisplayLanguage): string {
  const lines = readFileSync(join(SOURCE, `image-to-grs-json-prompt.${language}.md`), 'utf8')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .slice(1)
    .filter((one) => one.trim() !== '' && !one.includes('{{'))
  const longest = [...lines].sort((a, b) => b.length - a.length)[0]
  if (longest === undefined) throw new Error(`the ${language} manuscript has no plain line`)
  return longest
}

const otherOf = (language: DisplayLanguage): DisplayLanguage => (language === 'ja' ? 'en' : 'ja')

function lastCopiedText(stage: ExportStage): string {
  const last = stage.clipped[stage.clipped.length - 1]
  if (last === undefined || last.kind !== 'document') throw new Error(`${COPY_PROMPT} copied no text`)
  return last.text
}

describe('W3-T3 -- the manuscript still says what these cases read', () => {
  it(CLAUSE_SCREEN_LANGUAGE, () => {
    expect(REQUIREMENTS).toContain(CLAUSE_SCREEN_LANGUAGE)
    expect(markerLineOf('ja')).not.toBe(markerLineOf('en'))
  })
})

describe('FR-068 -- the prompt follows the screen language', () => {
  it.each(LANGUAGES)(`"${CLAUSE_SCREEN_LANGUAGE}" -- a screen in %s copies that manuscript`, async (language) => {
    const stage = exportStage(templateDocument(), SMALL_SCREEN, language)
    await stage.take(COPY_PROMPT)
    const text = lastCopiedText(stage)
    expect(text).toContain(markerLineOf(language))
    expect(text).not.toContain(markerLineOf(otherOf(language)))
  })

  it.each(LANGUAGES)(`"${CLAUSE_SCREEN_LANGUAGE}" -- switched away from %s, the next copy follows the switch`, async (language) => {
    const stage = exportStage(templateDocument(), SMALL_SCREEN, language)
    await stage.take(COPY_PROMPT)
    await stage.take(CHOOSE_SCREEN_LANGUAGE)
    expect(stage.lastView().language, `premise: ${CHOOSE_SCREEN_LANGUAGE} switched the screen language`).toBe(otherOf(language))
    await stage.take(COPY_PROMPT)
    const text = lastCopiedText(stage)
    expect(text).toContain(markerLineOf(otherOf(language)))
    expect(text).not.toContain(markerLineOf(language))
  })
})
