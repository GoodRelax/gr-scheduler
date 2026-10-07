// W3 spec-only tester 5: table T-270 -- a press and a drag are told apart by S-208 on either axis.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  hasDraggedPastThreshold,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see T-270
const T_270_ONE_DISTANCE =
  '⭐ 押して離す（動かさない）と引くを分ける距離は、本表のすべての行で `_assets/tbl-settings.md` の 表 T-206 の `S-208` とすること（MUST）'
const T_270_EITHER_AXIS = '押した点から横か縦のどちらかへ `S-208` を超えて離せば引く、どちらも超えなければ押して離すである。'

/** @purity pure */
function settingPx(id: string): number {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  const found = /(\d+(?:\.\d+)?)\s*px/.exec(row?.by['既定'] ?? '')
  if (found === null) throw new Error(`table T-206 row ${id} states no px value`)
  return Number(found[1])
}

const S_208 = settingPx('S-208')
const AT = { x: 400, y: 300 }

// WHY: the predicate reads only where the press began; the other members of a press are not this clause's.
const PRESS = {
  at: { kind: 'pointer', phase: 'down', button: 'primary', x: AT.x, y: AT.y, modifiers: {}, clickCount: 1 },
  hit: null,
  on: null,
  pressRow: null,
} as unknown as PointerPress

describe('W3-T5 -- the manuscript these cases are driven by', () => {
  it.each([T_270_ONE_DISTANCE, T_270_EITHER_AXIS])('01-04 T-270 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('S-208 is a positive px distance', () => {
    expect(S_208).toBeGreaterThan(0)
  })
})

describe(`T-270 "${T_270_ONE_DISTANCE}"`, () => {
  it.each([
    ['still', 0, 0, false],
    ['exactly S-208 to the right', S_208, 0, false],
    ['exactly S-208 to the left', -S_208, 0, false],
    ['exactly S-208 down', 0, S_208, false],
    ['exactly S-208 up', 0, -S_208, false],
    ['S-208 on both axes at once', S_208, S_208, false],
    ['just over S-208 to the right', S_208 + 0.01, 0, true],
    ['just over S-208 to the left', -S_208 - 0.01, 0, true],
    ['just over S-208 down', 0, S_208 + 0.01, true],
    ['just over S-208 up', 0, -S_208 - 0.01, true],
    ['one px over S-208 across, under it down', S_208 + 1, S_208 - 1, true],
  ] as const)('%s: dragged = %s', (_name, dx, dy, dragged) => {
    expect(hasDraggedPastThreshold(PRESS, { x: AT.x + dx, y: AT.y + dy }), `${T_270_ONE_DISTANCE} / ${T_270_EITHER_AXIS}`).toBe(dragged)
  })
})
