// CR-782 spec-only tests: table T-269 PK-8 on the comment box body and leader, PK-11 on its anchor (FR-106).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { pointerRowOf } from '../../src/framework/single-html-shell/pointer-shape'
import { restoreAnimationFrames } from '../unit/cr-646-stage'
import { COMMENT_ID, commentDrawn, commentRow, documentWith, frameOf, stage, tipOf } from './cr-777-stage'
import { unbroken } from './spec-table'

afterEach(restoreAnimationFrames)

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-106, T-269, PK-8, PK-11
const BODY_AND_LEADER_ARE_THE_PALM =
  '（表 T-023d の `GR-14`、`_assets/tbl-settings.md` の 表 T-206 の `S-291`）では、表 T-269 の `PK-8` とすること（MUST）'
const ANCHOR_IS_THE_MOVE_SHAPE =
  '（表 T-023d の `GR-14`、`_assets/tbl-settings.md` の 表 T-206 の `S-292`）では、表 T-269 の `PK-11` とすること'

type Hit = NonNullable<Parameters<typeof pointerRowOf>[0]>

const hitOf = (boxPart?: Hit['boxPart']): Hit => {
  const base = { item: { kind: 'commentBox', id: COMMENT_ID }, grab: 'GR-14' } as const
  return boxPart === undefined ? base : { ...base, boxPart }
}

describe('FR-106: the clauses stand verbatim in the requirements', () => {
  it(`${BODY_AND_LEADER_ARE_THE_PALM}`, () => {
    expect(REQUIREMENTS).toContain(BODY_AND_LEADER_ARE_THE_PALM)
  })

  it(`${ANCHOR_IS_THE_MOVE_SHAPE}`, () => {
    expect(REQUIREMENTS).toContain(ANCHOR_IS_THE_MOVE_SHAPE)
  })
})

describe(`GR-14 comment box: ${BODY_AND_LEADER_ARE_THE_PALM}`, () => {
  it('the body shows PK-8', () => {
    expect(pointerRowOf(hitOf({ kind: 'body' }), false)).toBe('PK-8')
  })

  it('the leader shows PK-8', () => {
    expect(pointerRowOf(hitOf({ kind: 'leader' }), false)).toBe('PK-8')
  })

  it('a hit with no part (read as the body) shows PK-8', () => {
    expect(pointerRowOf(hitOf(), false)).toBe('PK-8')
  })
})

describe(`GR-14 comment box: ${ANCHOR_IS_THE_MOVE_SHAPE}`, () => {
  it('the anchor shows PK-11', () => {
    expect(pointerRowOf(hitOf({ kind: 'anchor' }), false)).toBe('PK-11')
  })
})

describe('FR-106: an armed tool wins over every row', () => {
  it.each([
    ['body', { kind: 'body' }],
    ['leader', { kind: 'leader' }],
    ['anchor', { kind: 'anchor' }],
  ] as const)('the %s shows no row while a tool is armed', (_name, part) => {
    expect(pointerRowOf(hitOf(part), true)).toBeNull()
  })

  it('no hit shows no row', () => {
    expect(pointerRowOf(null, false)).toBeNull()
  })
})

describe('GR-14 on the drawn figure: the grabbed parts answer the rows above', () => {
  const built = () => stage(documentWith([commentRow()]))
  const hitAt = (loop: ReturnType<typeof stage>['loop'], x: number, y: number) => itemAtPointer(frameOf(loop).geometry, x, y, grabSizesOf())

  it('the middle of the body is the PK-8 palm', () => {
    const { loop } = built()
    const body = commentDrawn(loop)!.body
    const hit = hitAt(loop, body.x + body.width / 2, body.y + body.height / 2)
    expect(hit?.item).toEqual({ kind: 'commentBox', id: COMMENT_ID })
    expect(pointerRowOf(hit, false)).toBe('PK-8')
  })

  it('the drawn tip is the PK-11 move shape', () => {
    const { loop } = built()
    const tip = tipOf(loop)
    const hit = hitAt(loop, tip.x, tip.y)
    expect(hit?.item).toEqual({ kind: 'commentBox', id: COMMENT_ID })
    expect(pointerRowOf(hit, false)).toBe('PK-11')
  })
})
