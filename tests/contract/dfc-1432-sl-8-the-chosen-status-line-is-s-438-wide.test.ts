// DFC-1432: a chosen Status Line is drawn S-438 wide, with no S-178 factor, and an unchosen one S-333 wide (SL-8, CU-1).

import { describe, expect, it } from 'vitest'

import { emptySelection, selectionWith } from '../../src/entity/document-model/selection/selection'
import { day, notStored, taskOf } from '../unit/cr-430-cross-section-scene'
import { figuresKeyed, svgSelecting } from '../fixtures/svg-selected-scene'

const WISH = {
  tasks: [taskOf({ uid: 1, name: 'only', start: day(2), finish: day(8) })],
  statusDate: day(12),
}

const S_333 = notStored('S-333')
const S_438 = notStored('S-438')

const statusLineWidth = (chosen: boolean): number => {
  const selection = chosen ? selectionWith(emptySelection(), { kind: 'statusLine' }) : emptySelection()
  const lines = figuresKeyed(svgSelecting(WISH, selection), 'status-line')
  expect(lines).toHaveLength(1)
  return Number(lines[0]!['stroke-width'])
}

describe('DFC-1432: the width of the Status Line follows S-333 and S-438, never S-333 times S-178 (SL-8, CU-1)', () => {
  it('SL-8 an unchosen Status Line is drawn S-333 wide', () => {
    expect(statusLineWidth(false)).toBeCloseTo(S_333, 6)
  })

  it('SL-8 a chosen Status Line is drawn S-438 wide, the line own width (DFC-1432)', () => {
    expect(statusLineWidth(true)).toBeCloseTo(S_438, 6)
  })

  it('S-438 a chosen Status Line is never thinner than an unchosen one', () => {
    expect(statusLineWidth(true)).toBeGreaterThanOrEqual(statusLineWidth(false))
  })
})
