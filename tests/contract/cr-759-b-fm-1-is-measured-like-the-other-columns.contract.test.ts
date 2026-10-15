// CR-759 spec-only cases: FM-1 takes its width by the SV-18 rule at every type step, with a right edge and the floor S-425, not the fixed S-496

import { describe, expect, it } from 'vitest'

import { ONE_PARENT } from './cr-731-documents'
import { REQUIREMENTS, cellOf } from './cr-731-stage'
import { T_374_FM_1_EDGE, T_374_FM_1_WIDTH } from './cr-759-clauses'
import { PROPOSALS_ROLE, columnWord, proposalsOpened, styleOf } from './cr-759-stage'
import type { WindowStage } from './cr-731-window-stage'
import { selfAndDescendants, type FakeElement } from '../fixtures/fake-browser'
import { specTable } from './spec-table'

const pxIn = (text: string): number => {
  const found = /(\d+(?:\.\d+)?)\s*`?\s*px/.exec(text)
  if (found === null) throw new Error(`no px value in ${text}`)
  return Number(found[1])
}

const STEPS: readonly number[] = specTable('T-333').rows.map((one) => pxIn(one.by['値'] ?? ''))
const FIXED_VISIBILITY_WIDTH = pxIn(cellOf('T-206', 'S-496', '既定'))

interface Drawn {
  readonly fontPx: number
  readonly widths: ReadonlyMap<string, number>
  readonly headings: readonly FakeElement[]
}

function drawnTable(stage: WindowStage): Drawn {
  const table = selfAndDescendants(stage.need(PROPOSALS_ROLE)).find((one) => one.tagName === 'TABLE')
  if (table === undefined) throw new Error('the proposals draw no table')
  const headings = selfAndDescendants(table).filter((one) => one.tagName === 'TH')
  const columns = selfAndDescendants(table).filter((one) => one.tagName === 'COL')
  expect(columns.length, 'premise: one column width for each heading').toBe(headings.length)
  const widths = new Map<string, number>()
  headings.forEach((heading, at) => widths.set(heading.textContent.trim(), pxIn(styleOf(columns[at]!, 'width'))))
  return { fontPx: pxIn(styleOf(table, 'font-size')), widths, headings }
}

const widthOfFix = (drawn: Drawn): number => {
  const width = drawn.widths.get(columnWord('FM-1'))
  if (width === undefined) throw new Error(`no heading reads ${columnWord('FM-1')}`)
  return width
}

async function tablesAtEveryStep(): Promise<Drawn[]> {
  const stage = await proposalsOpened(ONE_PARENT())
  const seen: Drawn[] = []
  for (let step = 0; step < STEPS.length; step += 1) {
    seen.push(drawnTable(stage))
    await stage.press('IC-127')
  }
  return seen
}

describe('CR-759 the manuscript these cases read', () => {
  it('T-374 still says FM-1 is measured by SV-18 and has a right edge and the floor S-425', () => {
    expect(REQUIREMENTS).toContain(T_374_FM_1_WIDTH)
    expect(REQUIREMENTS).toContain(T_374_FM_1_EDGE)
  })

  it('the premise: T-333 holds the steps 9, 10 and 12 px and S-496 is 28 px', () => {
    expect(STEPS).toEqual([9, 10, 12])
    expect(FIXED_VISIBILITY_WIDTH).toBe(28)
  })
})

describe('T-374 / SV-18 -- FM-1 is measured like the other columns at 9, 10 and 12 px', () => {
  it('the premise: IC-127 walks the table through the three steps of T-333', async () => {
    expect((await tablesAtEveryStep()).map((one) => one.fontPx)).toEqual(STEPS)
  })

  it.each([0, 1, 2])('at step %i FM-1 is not drawn at the fixed width of S-496', async (step) => {
    expect(widthOfFix((await tablesAtEveryStep())[step]!)).not.toBe(FIXED_VISIBILITY_WIDTH)
  })

  it.each([0, 1, 2])('at step %i FM-1 is no narrower than the narrowest other column, which is at least the floor S-425', async (step) => {
    const drawn = (await tablesAtEveryStep())[step]!
    const others = [...drawn.widths].filter(([heading]) => heading !== columnWord('FM-1')).map(([, width]) => width)
    expect(widthOfFix(drawn)).toBeGreaterThanOrEqual(Math.min(...others))
  })

  it('FM-1 widens with the type step, as a width measured at that step does', async () => {
    const seen = await tablesAtEveryStep()
    expect(widthOfFix(seen[2]!)).toBeGreaterThan(widthOfFix(seen[0]!))
  })
})

describe('T-374 / GR-28 / SV-7 -- FM-1 has a right edge like the other columns', () => {
  it('its heading holds IC-122 off the right edge by the same clearance as the next column (SV-7 sets it only where GR-28 stands)', async () => {
    const drawn = drawnTable(await proposalsOpened(ONE_PARENT()))
    const heading = (row: string): FakeElement => {
      const found = drawn.headings.find((one) => one.textContent.trim() === columnWord(row))
      if (found === undefined) throw new Error(`no heading reads ${columnWord(row)}`)
      return found
    }
    expect(selfAndDescendants(heading('FM-1')).some((one) => one.getAttribute('data-icon') === 'IC-122'), 'premise: FM-1 carries IC-122').toBe(true)
    expect(styleOf(heading('FM-3'), 'padding-right'), 'premise: FM-3 keeps a clearance').not.toBe('')
    expect(styleOf(heading('FM-1'), 'padding-right')).toBe(styleOf(heading('FM-3'), 'padding-right'))
  })

  it.todo('dragging the right edge of FM-1 changes its width and stops at S-425 (GR-28): the stand-in DOM lays nothing out, so no pointer can be aimed at a column edge from the window stage')
})
