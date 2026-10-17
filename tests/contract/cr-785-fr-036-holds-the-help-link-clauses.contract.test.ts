// CR-785 spec-only tests: FR-036 holds the help-link clauses CR-785 wrote, each MUST clause quoted whole.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))
const FR_036_HEAD = '**UID**: FR-036'
const NEXT_UID = '**UID**: '
const MUST_MARK = '（MUST）'
// WHY: a quoted MUST clause names its rule only when it is this long, the mark included (check 39).
const MIN_MUST_CLAUSE_LENGTH = 28

// see FR-036, S-350, S-583
const FR_036_LINK_TARGETS =
  '下のリンクの宛先は同表の `S-583` の所にヘルプの言語を `?lang=ja` ／ `?lang=en` で付けたものとし、どちらも押したら閲覧環境の新しいタブで開くこと（MUST）'
// see FR-036, FR-038
const FR_036_LINK_WORDS = '2 つのリンクの語は `FR-038` の辞書（`helpLinks` の `download` と `about`）が持つこと（MUST）'
// see FR-036, S-503
const FR_036_LINK_LOOK =
  '`FR-069` の著作権表示 —— の字は、`_assets/tbl-settings.md` の 表 T-236 の `S-503` の色で下線を引いて描くこと（MUST）'
// see FR-036, IC-20
const FR_036_AGENT_API_LINK =
  '最新版を入手する頁（`_assets/tbl-settings.md` の 表 T-206 の `S-350`）へのリンクを添え、押したら閲覧環境の新しいタブで開くこと（MUST）'
// see FR-036, IC-54
const FR_036_PARENTHESES = '⭐ `IC-54` の項目に添える語は、丸括弧で囲むこと（MUST）'

const fr036Section = (): string => {
  const from = REQUIREMENTS.indexOf(FR_036_HEAD)
  if (from < 0) throw new Error('premise: the requirements hold FR-036')
  const to = REQUIREMENTS.indexOf(NEXT_UID, from + FR_036_HEAD.length)
  return REQUIREMENTS.slice(from, to < 0 ? undefined : to)
}

const CLAUSES: readonly (readonly [string, string])[] = [
  ['the two link targets and the new tab', FR_036_LINK_TARGETS],
  ['the dictionary holds the two link words', FR_036_LINK_WORDS],
  ['every help link is drawn in S-503 and underlined', FR_036_LINK_LOOK],
  ['the IC-20 item carries a link to S-350', FR_036_AGENT_API_LINK],
  ['only IC-54 takes parentheses', FR_036_PARENTHESES],
]

describe('FR-036 -- the help-link clauses CR-785 wrote stand in FR-036', () => {
  it.each(CLAUSES)('FR-036 holds %s', (_name, clause) => {
    expect(fr036Section()).toContain(clause)
  })
})

describe(`FR-036 -- each quoted clause ends with ${MUST_MARK} and names its rule`, () => {
  it.each(CLAUSES)(`%s ends with ${MUST_MARK} and is long enough`, (_name, clause) => {
    expect(clause.endsWith(MUST_MARK)).toBe(true)
    expect(clause.length).toBeGreaterThanOrEqual(MIN_MUST_CLAUSE_LENGTH)
  })
})

describe('FR-036 -- note *1 is gone', () => {
  it('FR-036 no longer places a note *1 above the license line', () => {
    expect(fr036Section()).not.toContain('備考 ※1')
  })
})
