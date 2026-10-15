// CR-759 spec-only cases: a press on the box of a choose row with 2+ choices and none chosen ticks nothing and moves the focus to its list (FM-1)

import { describe, expect, it } from 'vitest'

import { ACTUAL_AFTER_STATUS_DATE, FS_SUCCESSOR_STARTED } from './cr-731-documents'
import { REQUIREMENTS, oneRow, proposed } from './cr-731-stage'
import { FM_1_TWO_CHOICES } from './cr-759-clauses'
import { activeElement, choiceListOf, countText, footerOf, isTicked, keyOf, needBox, pressBox, proposalsOpened } from './cr-759-stage'

describe('CR-759 the manuscript these cases read', () => {
  it('FM-1 still says the press ticks nothing and moves the focus to the list of that row', () => {
    expect(REQUIREMENTS).toContain(FM_1_TWO_CHOICES)
  })

  it('the premise: the VO-2 rows are choose rows of two choices', () => {
    for (const [make, uid] of [[ACTUAL_AFTER_STATUS_DATE, 1], [FS_SUCCESSOR_STARTED, 1], [FS_SUCCESSOR_STARTED, 2]] as const) {
      const row = oneRow(proposed(make()), 'VO-2', uid)
      expect([row.fixKind, (row.choices ?? []).length]).toEqual(['choose', 2])
    }
  })
})

describe('T-374 FM-1 -- the box of a row of two choices, none chosen', () => {
  const key = (): string => keyOf(ACTUAL_AFTER_STATUS_DATE(), 'VO-2', 1)

  it('stays unticked on the screen after the press', async () => {
    const stage = await proposalsOpened(ACTUAL_AFTER_STATUS_DATE())
    await pressBox(stage, needBox(stage, key()))
    expect(isTicked(needBox(stage, key()))).toBe(false)
  })

  it('leaves the count where it was', async () => {
    const stage = await proposalsOpened(ACTUAL_AFTER_STATUS_DATE())
    expect(footerOf(stage).textContent, 'premise').toContain(countText(0))
    await pressBox(stage, needBox(stage, key()))
    expect(footerOf(stage).textContent).toContain(countText(0))
  })

  it('moves the focus to the choice list of that row', async () => {
    const stage = await proposalsOpened(ACTUAL_AFTER_STATUS_DATE())
    await pressBox(stage, needBox(stage, key()))
    const list = choiceListOf(stage, key())
    expect(list, 'premise: the row has a choice list').not.toBeNull()
    expect(activeElement(stage)).toBe(list)
  })

  it('of two such rows, the focus goes to the list of the row pressed, not the other', async () => {
    const document = FS_SUCCESSOR_STARTED()
    const pressed = keyOf(document, 'VO-2', 2)
    const stage = await proposalsOpened(document)
    await pressBox(stage, needBox(stage, pressed))
    expect(activeElement(stage)).toBe(choiceListOf(stage, pressed))
    expect(activeElement(stage)).not.toBe(choiceListOf(stage, keyOf(document, 'VO-2', 1)))
    expect(footerOf(stage).textContent).toContain(countText(0))
  })

  it.todo('the list opens as the focus lands on it (FM-1 一覧を開く): the stand-in DOM has no picker to observe')
})
