// CR-786 spec-only tests: FR-019 holds the four sentences CR-786 added, and its MUST clause is quoted whole.

import { describe, expect, it } from 'vitest'

import { FR_019_FRONT, FR_019_ORDER, FR_019_SHAPE, FR_019_SHOWN_DATE, REQUIREMENTS } from './cr-786-stage'

const MUST_MARK = '（MUST）'
// WHY: the handover asks a quoted MUST clause to be at least this long, the mark included, so it names its rule.
const MIN_MUST_CLAUSE_LENGTH = 28
const FR_019_HEAD = '**UID**: FR-019'
const SECTION_END = '**ORIGIN**'

const fr019Section = (): string => {
  const from = REQUIREMENTS.indexOf(FR_019_HEAD)
  if (from < 0) throw new Error('premise: the requirements hold FR-019')
  const to = REQUIREMENTS.indexOf(SECTION_END, from)
  return REQUIREMENTS.slice(from, to < 0 ? undefined : to)
}

describe('FR-019 -- the four sentences CR-786 added stand in the STATEMENT of FR-019', () => {
  it.each([
    ['the drawing and hit order', FR_019_ORDER],
    ['the Bring to Front command', FR_019_FRONT],
    ['the order is the array order', FR_019_SHAPE],
    ['the shown date of a tip', FR_019_SHOWN_DATE],
  ])('FR-019 holds %s', (_name, sentence) => {
    expect(fr019Section()).toContain(sentence)
  })
})

describe(`FR-019 -- the MUST clause is quoted with its mark ${MUST_MARK}`, () => {
  it(`the order clause ends with ${MUST_MARK} and is at least ${MIN_MUST_CLAUSE_LENGTH} characters long`, () => {
    expect(FR_019_ORDER.endsWith(MUST_MARK)).toBe(true)
    expect(FR_019_ORDER.length).toBeGreaterThanOrEqual(MIN_MUST_CLAUSE_LENGTH)
  })

  it('the clause found in FR-019 carries the mark at the same place', () => {
    const section = fr019Section()
    const at = section.indexOf(FR_019_ORDER)
    expect(at).toBeGreaterThanOrEqual(0)
    expect(section.slice(at + FR_019_ORDER.length - MUST_MARK.length, at + FR_019_ORDER.length)).toBe(MUST_MARK)
  })
})
