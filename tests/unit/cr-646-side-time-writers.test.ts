// CR-646 X-1 / X-2: the side-aware writers table T-064 row PI-1 publishes, pressed against table T-350.

import { describe, expect, it } from 'vitest'

import type { Project } from '../../src/entity/document-model/schedule/schedule'
import { DEFAULT_CALENDAR_VALUES, dayOf } from '../../src/entity/document-model/schedule/schedule'
import { specTable } from '../contract/spec-table'
import {
  DAY_END,
  DAY_START,
  PI_1_SIDE_NAMES,
  PUBLISHED_ENTRIES,
  REQUIREMENTS,
  S_482,
  S_483,
  documentObject,
  published,
} from './cr-646-stage'

const STAMPED = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/

/** @purity pure */
function projectWith(part: Record<string, unknown>): Project {
  return { ...documentObject().schedule.project, ...part } as unknown as Project
}

const EMPTY_DEFAULTS = projectWith({ defaultStartTime: null, defaultFinishTime: null })
const OWN_DEFAULTS = projectWith({ defaultStartTime: '09:00:00', defaultFinishTime: '18:30:00' })

/** @purity pure */
function someDay(text: string): unknown {
  const day = dayOf(text)
  if (day === null) throw new Error(`${text} is not a day`)
  return day
}

const TUESDAY = someDay('2026-04-07T13:45:00')

describe('CR-646 the manuscript as these cases read it', () => {
  it('T-350 holds WT-1..WT-10 and EX-7 points at it', () => {
    expect(specTable('T-350').rows.map((one) => one.id)).toEqual([
      'WT-1', 'WT-2', 'WT-3', 'WT-4', 'WT-5', 'WT-6', 'WT-7', 'WT-8', 'WT-9', 'WT-10',
    ])
    expect(REQUIREMENTS).toContain('**`GRS` が書く日時の時刻は 表 T-350 に従うこと（MUST）**')
  })

  it('S-482 / S-483 (T-209): the defaults the settings table holds reach the generated values', () => {
    expect(S_482).toBe('08:00:00')
    expect(S_483).toBe('17:00:00')
    expect(DEFAULT_CALENDAR_VALUES['S-482']).toBe(S_482)
    expect(DEFAULT_CALENDAR_VALUES['S-483']).toBe(S_483)
  })

  it.each(PI_1_SIDE_NAMES)('T-064 PI-1 publishes %s (CR-646 K-1)', (name) => {
    const row = PUBLISHED_ENTRIES.rows.find((one) => one.id === 'PI-1')
    expect(row?.members.map((one) => one.name)).toContain(name)
  })
})

describe('WT-6 / WT-7 / WT-8: the whole-day writers', () => {
  it('WT-6: DAY_START_TIME is 00:00:00', () => {
    expect(published('DAY_START_TIME')).toBe(DAY_START)
  })

  it('WT-7: DAY_END_TIME is 23:59:00', () => {
    expect(published('DAY_END_TIME')).toBe(DAY_END)
  })

  it('WT-6 / WT-8: textOfDayStart writes the day at 00:00:00 whatever time the day was read from', () => {
    expect(published('textOfDayStart')(TUESDAY)).toBe(`2026-04-07T${DAY_START}`)
  })

  it('WT-7: textOfDayEnd writes the day at 23:59:00', () => {
    expect(published('textOfDayEnd')(TUESDAY)).toBe(`2026-04-07T${DAY_END}`)
  })
})

describe('WT-1..WT-5 with AT-154 / AT-155 and the fallback S-482 / S-483', () => {
  it('AT-154 / S-482: defaultStartTimeOf an empty column is S-482', () => {
    expect(published('defaultStartTimeOf')(EMPTY_DEFAULTS)).toBe(S_482)
  })

  it('AT-155 / S-483: defaultFinishTimeOf an empty column is S-483', () => {
    expect(published('defaultFinishTimeOf')(EMPTY_DEFAULTS)).toBe(S_483)
  })

  it('AT-154: defaultStartTimeOf a filled column is the column', () => {
    expect(published('defaultStartTimeOf')(OWN_DEFAULTS)).toBe('09:00:00')
  })

  it('AT-155: defaultFinishTimeOf a filled column is the column', () => {
    expect(published('defaultFinishTimeOf')(OWN_DEFAULTS)).toBe('18:30:00')
  })

  it('WT-1 / WT-3: textOfStartSide writes S-482 when the column is empty', () => {
    expect(published('textOfStartSide')(TUESDAY, EMPTY_DEFAULTS, false)).toBe(`2026-04-07T${S_482}`)
  })

  it('WT-1 / AT-154: textOfStartSide writes the project default start time', () => {
    expect(published('textOfStartSide')(TUESDAY, OWN_DEFAULTS, false)).toBe('2026-04-07T09:00:00')
  })

  it('WT-2 / WT-4: textOfFinishSide writes S-483 when the column is empty', () => {
    expect(published('textOfFinishSide')(TUESDAY, EMPTY_DEFAULTS)).toBe(`2026-04-07T${S_483}`)
  })

  it('WT-2 / AT-155: textOfFinishSide writes the project default finish time', () => {
    expect(published('textOfFinishSide')(TUESDAY, OWN_DEFAULTS)).toBe('2026-04-07T18:30:00')
  })

  it('WT-5: a milestone start takes the finish time (S-483 when empty)', () => {
    expect(published('textOfStartSide')(TUESDAY, EMPTY_DEFAULTS, true)).toBe(`2026-04-07T${S_483}`)
  })

  it('WT-5: a milestone start takes the project default finish time', () => {
    expect(published('textOfStartSide')(TUESDAY, OWN_DEFAULTS, true)).toBe('2026-04-07T18:30:00')
  })

  it('EX-7: every side writer spells a date-time with no zone, to the second', () => {
    const written = [
      published('textOfStartSide')(TUESDAY, EMPTY_DEFAULTS, false),
      published('textOfStartSide')(TUESDAY, OWN_DEFAULTS, true),
      published('textOfFinishSide')(TUESDAY, EMPTY_DEFAULTS),
      published('textOfDayStart')(TUESDAY),
      published('textOfDayEnd')(TUESDAY),
    ]
    for (const one of written) expect(one).toMatch(STAMPED)
  })
})
