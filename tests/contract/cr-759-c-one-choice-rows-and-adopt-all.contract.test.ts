// CR-759 spec-only cases: a choose row of one choice is taken by its tick (FM-1, FM-8), and IC-166 ticks every machine and one-choice row (RW-18)

import { describe, expect, it } from 'vitest'

import { ACTUAL_AFTER_STATUS_DATE, FINISHED_CHILDREN, NOT_STARTED_AFTER_START, ONE_PARENT } from './cr-731-documents'
import { undoKey } from './cr-731-shell'
import { REQUIREMENTS, cellOf, dayOf, oneRow, proposed, taskIn, WORDS } from './cr-731-stage'
import type { WindowStage } from './cr-731-window-stage'
import {
  FM_1_ONE_CHOICE,
  FM_8_ONE_CHOICE_WORD,
  RW_18_HIDDEN_ROWS_TOO,
  RW_18_INERT,
  RW_18_NO_STEP,
  RW_18_TICKS,
  RW_18_UNTOUCHED,
  T_373_ONE_CHOICE,
} from './cr-759-clauses'
import {
  EVERY_KIND,
  TWO_ONE_CHOICE_ROWS,
  cellUnder,
  choiceListOf,
  countText,
  footerEntry,
  footerOf,
  isInert,
  isTicked,
  keyOf,
  needBox,
  pressBox,
  proposalsOpened,
} from './cr-759-stage'
import type { Document } from '../../src/entity/document-model/document/document'

const statusDayOf = (document: Document): string | null =>
  dayOf((document.schedule as unknown as { project: { statusDate: unknown } }).project.statusDate)

const countIs = (stage: WindowStage, n: number): void => {
  expect(footerOf(stage).textContent).toContain(countText(n))
}

const adoptAllOf = (stage: WindowStage) => {
  const entry = footerEntry(stage, 'IC-166')
  expect(entry, 'IC-166 stands in the footer band').not.toBeNull()
  return entry!
}

const theOneChoiceWord = (): string => {
  const said = /択は 1 つ:\s*(.+)$/.exec(cellOf('T-373', 'FA-20', '直し（修正後）'))
  expect(said, 'premise: T-373 FA-20 has one choice').not.toBeNull()
  const wanted = said![1]!.trim().replace(/、/g, '')
  const words = (WORDS['delayFixes'] as readonly Record<string, any>[]).filter((one) => one['text']['ja'] === wanted)
  expect(words, `premise: one dictionary word for the choice of FA-20 (${wanted})`).toHaveLength(1)
  return wanted
}

describe('CR-759 the manuscript these cases read', () => {
  it('T-373 and T-374 still say a one-choice row draws no list and its tick takes the choice', () => {
    expect(REQUIREMENTS).toContain(T_373_ONE_CHOICE)
    expect(REQUIREMENTS).toContain(FM_1_ONE_CHOICE)
    expect(REQUIREMENTS).toContain(FM_8_ONE_CHOICE_WORD)
  })

  it('RW-18 still says what IC-166 ticks, what it leaves, when it is inert and that it pushes no step', () => {
    for (const clause of [RW_18_TICKS, RW_18_HIDDEN_ROWS_TOO, RW_18_UNTOUCHED, RW_18_INERT, RW_18_NO_STEP]) expect(REQUIREMENTS).toContain(clause)
  })

  it('the premise: the documents hold the rows the cases name', () => {
    const one = oneRow(proposed(ACTUAL_AFTER_STATUS_DATE()), 'VS-5', 1)
    expect([one.fixRow, one.fixType, (one.choices ?? []).length]).toEqual(['FA-20', 'choose', 1])
    const every = proposed(EVERY_KIND()).map((row) => [row.findingRow, row.taskUid, row.fixType, (row.choices ?? []).length])
    expect(every).toEqual(
      expect.arrayContaining([
        ['VC-11', 1, 'automatic', 0],
        ['VC-11', 10, 'automatic', 0],
        ['VS-5', 4, 'choose', 1],
        ['VO-2', 4, 'choose', 2],
        ['VO-1', 5, 'suggestedDate', 0],
      ]),
    )
    expect(oneRow(proposed(EVERY_KIND()), 'VC-11', 10).refusal, 'the row of the read-only task group does not act').toBeTruthy()
  })
})

describe('T-374 FM-1 / FM-8 -- a choose row with exactly one choice', () => {
  const key = (): string => keyOf(ACTUAL_AFTER_STATUS_DATE(), 'VS-5', 1)

  it('draws no choice list', async () => {
    const stage = await proposalsOpened(ACTUAL_AFTER_STATUS_DATE())
    expect(needBox(stage, key()), 'premise: the row has a box').toBeDefined()
    expect(choiceListOf(stage, key())).toBeNull()
  })

  it('shows the word of its one choice under 修正後', async () => {
    const stage = await proposalsOpened(ACTUAL_AFTER_STATUS_DATE())
    expect(cellUnder(stage, key(), 'FM-8').textContent.trim()).toBe(theOneChoiceWord())
  })

  it('a tick shows it ticked and raises the count from 0 to 1', async () => {
    const stage = await proposalsOpened(ACTUAL_AFTER_STATUS_DATE())
    countIs(stage, 0)
    await pressBox(stage, needBox(stage, key()))
    countIs(stage, 1)
    expect(isTicked(needBox(stage, key()))).toBe(true)
  })

  it('IC-157 after the tick applies that choice: the status date moves to the day of the actual start', async () => {
    const stage = await proposalsOpened(ACTUAL_AFTER_STATUS_DATE())
    await pressBox(stage, needBox(stage, key()))
    stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
    await stage.press('IC-157')
    expect(stage.written).toEqual(['chosen.json'])
    expect(statusDayOf(stage.loop.document())).toBe(dayOf(taskIn(ACTUAL_AFTER_STATUS_DATE(), 1)['actualStart']))
  })
})

describe('T-346 RW-18 -- IC-166 ticks every machine row and every one-choice row', () => {
  const keys = () => {
    const document = EVERY_KIND()
    return {
      machine: keyOf(document, 'VC-11', 1),
      readOnly: keyOf(document, 'VC-11', 10),
      oneChoice: keyOf(document, 'VS-5', 4),
      twoChoices: keyOf(document, 'VO-2', 4),
      suggested: keyOf(document, 'VO-1', 5),
    }
  }

  it('ticks the one-choice row beside the machine row that was ticked already, and nothing else', async () => {
    const stage = await proposalsOpened(EVERY_KIND())
    const key = keys()
    countIs(stage, 1)
    await stage.press('IC-166')
    countIs(stage, 2)
    expect(isTicked(needBox(stage, key.machine)), 'the machine row').toBe(true)
    expect(isTicked(needBox(stage, key.oneChoice)), 'the one-choice row').toBe(true)
    expect(isTicked(needBox(stage, key.twoChoices)), 'a row of two choices is left').toBe(false)
    expect(isTicked(needBox(stage, key.suggested)), 'a suggested date is left').toBe(false)
    expect(isTicked(needBox(stage, key.readOnly)), 'a row that does not act is left').toBe(false)
  })

  it('ticks a machine row the person unticked', async () => {
    const stage = await proposalsOpened(EVERY_KIND())
    await pressBox(stage, needBox(stage, keys().machine))
    countIs(stage, 0)
    await stage.press('IC-166')
    countIs(stage, 2)
    expect(isTicked(needBox(stage, keys().machine))).toBe(true)
  })

  it('unticks nothing: a suggested date the person ticked stays ticked', async () => {
    const stage = await proposalsOpened(EVERY_KIND())
    await pressBox(stage, needBox(stage, keys().suggested))
    countIs(stage, 2)
    await stage.press('IC-166')
    countIs(stage, 3)
    expect(isTicked(needBox(stage, keys().suggested))).toBe(true)
  })

  it('ticks two one-choice rows at once', async () => {
    const document = TWO_ONE_CHOICE_ROWS()
    const stage = await proposalsOpened(document)
    countIs(stage, 0)
    await stage.press('IC-166')
    countIs(stage, 2)
    for (const uid of [4, 6]) expect(isTicked(needBox(stage, keyOf(document, 'VS-5', uid))), `task ${String(uid)}`).toBe(true)
  })

  it('then IC-157 applies both the machine row and the one choice in the one bundle', async () => {
    const stage = await proposalsOpened(EVERY_KIND())
    await stage.press('IC-166')
    stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
    await stage.press('IC-157')
    expect(stage.written).toEqual(['chosen.json'])
    const after = stage.loop.document()
    expect(statusDayOf(after), 'VS-5: the status date moved to the actual start of task 4').toBe('2027-05-03')
    expect(dayOf(taskIn(after, 1)['finish']), 'VC-11: the parent ends with its last child').toBe('2027-05-26')
  })

  it.todo('rows out of the list by a column filter or by the word are ticked too: the window stage can neither type the word (a typed word never reached the window, measured) nor press a column filter, and the pure seam needs a DelayDiagnosticsReportWindow whose fields the specification does not name')
})

describe('T-346 RW-18 -- IC-166 is inert while there is nothing to tick (FR-092)', () => {
  it.each([
    ['every machine row ticked and nothing else', ONE_PARENT],
    ['only a suggested date', NOT_STARTED_AFTER_START],
    ['machine rows ticked and a row by hand', FINISHED_CHILDREN],
  ] as const)('%s: IC-166 stands and does not act', async (_name, make) => {
    const stage = await proposalsOpened(make())
    expect(isInert(adoptAllOf(stage))).toBe(true)
  })

  it('it acts once the person unticks a machine row', async () => {
    const stage = await proposalsOpened(ONE_PARENT())
    await pressBox(stage, needBox(stage, keyOf(ONE_PARENT(), 'VC-11', 1)))
    expect(isInert(adoptAllOf(stage))).toBe(false)
  })

  it('it acts while a one-choice row is unticked, and stops acting once IC-166 has ticked it', async () => {
    const stage = await proposalsOpened(EVERY_KIND())
    expect(isInert(adoptAllOf(stage))).toBe(false)
    await stage.press('IC-166')
    expect(isInert(adoptAllOf(stage))).toBe(true)
  })
})

describe('T-346 RW-18 -- IC-166 does not change the document and pushes no undo step', () => {
  it('the document is as it was and nothing is unsaved after IC-166', async () => {
    const stage = await proposalsOpened(EVERY_KIND())
    const before = structuredClone(stage.loop.document())
    await stage.press('IC-166')
    countIs(stage, 2)
    expect(stage.loop.document()).toEqual(before)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
  })

  it('an undo after IC-166 takes nothing back: the ticks stay', async () => {
    const stage = await proposalsOpened(EVERY_KIND())
    await stage.press('IC-166')
    await stage.key(undoKey())
    countIs(stage, 2)
    expect(isTicked(needBox(stage, keyOf(EVERY_KIND(), 'VS-5', 4)))).toBe(true)
  })
})
