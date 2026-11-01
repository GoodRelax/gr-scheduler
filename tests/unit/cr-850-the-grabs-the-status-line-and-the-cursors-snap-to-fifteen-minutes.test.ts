// CR-850 (spec-only): table T-378 snaps to 15 minutes at the hour tier; the grabs, the status line and the cursors read it.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { commandFromFieldCommit } from '../../src/adapter/input-command-translator/input-command-translator'
import type { FieldCommit, PropertyControl } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { snapMinutesOf, xFromDay } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { editDocument, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import { contextOf as fieldContextOf } from '../contract/cr-606-stage'
import { RATIO, cellOf, stored } from './cr-430-cross-section-scene'
import {
  ALT,
  DAY_TIER_SHOWN,
  DEFAULT_FINISH_TIME,
  HALF_HOUR_TIER,
  HOUR_TIER,
  PLAIN,
  S_577,
  S_578,
  TASK_GROUP_B,
  TIME_HIDDEN,
  bandOf,
  cursorScene,
  dragBy,
  fixtureDocument,
  frameOf,
  oneFieldOf,
  pinClock,
  planBox,
  planFinishGrab,
  pointer,
  pxOfMinutes,
  pxPerDay,
  settingsOf,
  settingsPanel,
  stage,
  statusDateOf,
  statusLineGrab,
  statusLineOf,
  taskOf,
  unpinClock,
  type Scene,
} from './cr-850-stage'

beforeEach(pinClock)
afterEach(unpinClock)

const DAY = 1440
const FIFTEEN = 15

// see S-8, DS-1, FR-017
// WHY: FR-017 compares pxPerDay with the threshold after dividing by (the ruler font / S-8); the ratio is the display ratio.
const PX_SCALE = (((settingsOf(HOUR_TIER) as unknown as Record<string, number>)['rulerFontSizePx'] as number) * RATIO) / stored('S-8')

const withTime = (shows: boolean): ReturnType<typeof settingsOf> => settingsOf({ ...HOUR_TIER, isTimeOfDayVisible: shows })

describe('T-378: the snap unit', () => {
  it.each([
    ['SG-1: time hidden, however wide the day', false, S_578 * 4, DAY],
    ['SG-1: time shown, the ruler below the hour tier', true, S_577 - 1, DAY],
    ['SG-2: time shown, just into the hour tier', true, S_577 + 1, FIFTEEN],
    ['SG-2: time shown, just under the half-hour width', true, S_578 - 1, FIFTEEN],
    ['SG-2: time shown, just over the half-hour width (S-578)', true, S_578 + 1, FIFTEEN],
    ['SG-2: time shown, far over the half-hour width', true, S_578 * 5, FIFTEEN],
  ])('%s', (_name, shows, threshold, minutes) => {
    expect(snapMinutesOf(threshold * PX_SCALE, withTime(shows))).toBe(minutes)
  })

  it('the table names the day and 15 minutes, and SG-3 and SG-4 are retired', () => {
    expect(cellOf('T-378', 'SG-1', '単位')).toBe('日')
    expect(cellOf('T-378', 'SG-2', '単位')).toBe('15 分')
    expect(cellOf('T-378', 'SG-3', '単位')).toBe('—')
    expect(cellOf('T-378', 'SG-4', '単位')).toBe('—')
  })

  it.each([
    ['hour tier', HOUR_TIER, FIFTEEN],
    ['half-hour tier', HALF_HOUR_TIER, FIFTEEN],
    ['day tier, time shown', DAY_TIER_SHOWN, DAY],
    ['time hidden', TIME_HIDDEN, DAY],
  ] as const)('premise: the %s scene sits on its row', (_name, scene, minutes) => {
    const built = stage(scene)
    expect(snapMinutesOf(pxPerDay(built.loop), settingsOf(scene))).toBe(minutes)
  })
})

// WHY: the plan finish is 12:00; a release 113 minutes left is 10:07, 112 minutes left is 10:08.
const RELEASES = [
  ['10:07 lands at 10:00', 113, '2026-10-14T10:00:00'],
  ['10:08 lands at 10:15', 112, '2026-10-14T10:15:00'],
] as const

describe('FR-103 GO-2: a grabbed plan finish released at the hour tier snaps to 15 minutes; Alt changes nothing (MK-12)', () => {
  const SCENES: readonly (readonly [string, Scene])[] = [
    ['hour tier', HOUR_TIER],
    ['half-hour tier', HALF_HOUR_TIER],
  ]
  const KEYS = [
    ['no key', PLAIN],
    ['Alt held', ALT],
  ] as const

  describe.each(SCENES)('%s', (_tier, scene) => {
    describe.each(KEYS)('%s', (_keys, keys) => {
      it.each(RELEASES)('%s', (_name, minutesLeft, finish) => {
        const built = stage(scene)
        dragBy(built, planFinishGrab(built), -pxOfMinutes(built.loop, minutesLeft), keys, keys)
        expect(taskOf(built).finish).toBe(finish)
        expect(taskOf(built).start, 'GO-2 keeps the start').toBe(scene.start)
      })
    })
  })

  it('Alt held at the press only, or at the release only, gives the same 15-minute instant', () => {
    for (const [pressed, released] of [
      [ALT, PLAIN],
      [PLAIN, ALT],
    ] as const) {
      const built = stage(HOUR_TIER)
      dragBy(built, planFinishGrab(built), -pxOfMinutes(built.loop, 112), pressed, released)
      expect(taskOf(built).finish).toBe('2026-10-14T10:15:00')
    }
  })
})

describe('FR-046: the status line dragged at 15 minutes', () => {
  it.each(RELEASES)('half-hour tier: %s', (_name, minutesLeft, instant) => {
    const built = stage(HALF_HOUR_TIER)
    dragBy(built, statusLineGrab(built), -pxOfMinutes(built.loop, minutesLeft))
    expect(statusDateOf(built)).toBe(instant)
  })

  it.each(RELEASES)('hour tier, Alt held: %s', (_name, minutesLeft, instant) => {
    const built = stage(HOUR_TIER)
    dragBy(built, statusLineGrab(built), -pxOfMinutes(built.loop, minutesLeft), ALT, ALT)
    expect(statusDateOf(built)).toBe(instant)
  })

  it('pulled right to 12:22 lands at 12:15, and to 12:23 at 12:30', () => {
    const near = stage(HOUR_TIER)
    dragBy(near, statusLineGrab(near), pxOfMinutes(near.loop, 22))
    expect(statusDateOf(near)).toBe('2026-10-14T12:15:00')
    const far = stage(HOUR_TIER)
    dragBy(far, statusLineGrab(far), pxOfMinutes(far.loop, 23))
    expect(statusDateOf(far)).toBe('2026-10-14T12:30:00')
  })

  it('the line then stands at the written instant', () => {
    const built = stage(HOUR_TIER)
    dragBy(built, statusLineGrab(built), -pxOfMinutes(built.loop, 112))
    const box = planBox(built.loop)
    expect(statusLineOf(built.loop).x).toBeCloseTo(box.x + pxOfMinutes(built.loop, 75), 1)
  })
})

describe('FR-046: the status line position', () => {
  it('time shown: a status date of 10:15 stands 75 minutes right of the 09:00 bar start', () => {
    const built = stage({ ...HOUR_TIER, statusDate: '2026-10-14T10:15:00' })
    expect(statusLineOf(built.loop).x).toBeCloseTo(planBox(built.loop).x + pxOfMinutes(built.loop, 75), 1)
  })

  it('time shown at the day tier: the line still stands at the instant (17:00), not at the column edge', () => {
    const built = stage(DAY_TIER_SHOWN)
    const columnLeft = xFromDay(frameOf(built.loop).layout, { year: 2026, month: 10, day: 14 })
    const [hour, minute] = DEFAULT_FINISH_TIME.split(':').map(Number) as [number, number]
    expect(statusLineOf(built.loop).x).toBeCloseTo(columnLeft + pxOfMinutes(built.loop, hour * 60 + minute), 1)
  })

  it('time hidden: the line stands at the left edge of the status day column whatever the time', () => {
    for (const statusDate of ['2026-10-14T17:00:00', '2026-10-14T10:37:00']) {
      const built = stage({ ...TIME_HIDDEN, statusDate })
      const columnLeft = xFromDay(frameOf(built.loop).layout, { year: 2026, month: 10, day: 14 })
      expect(statusLineOf(built.loop).x, statusDate).toBeCloseTo(columnLeft, 1)
    }
  })
})

// see FR-046, TX-3, T-108
const STATUS_DATE_ROW = 'IC-44'
const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 240, taskGroupAreaWidthWithoutPanels: 982 }

const statusControlOf = (document: Document): PropertyControl => {
  const control = oneFieldOf(settingsPanel(document), STATUS_DATE_ROW).controls[0]
  if (control === undefined) throw new Error('the status date field has no control')
  return control
}

const isDateTime = (control: PropertyControl): boolean => (control as { isDateTime?: unknown }).isDateTime === true

function statusDateAfterTyping(document: Document, text: string): unknown {
  const control = statusControlOf(document)
  const commit = { row: STATUS_DATE_ROW, key: control.key, text } as FieldCommit
  const commands = commandFromFieldCommit(commit, fieldContextOf(document))
  expect(commands.length, 'the commit issues a command').toBeGreaterThan(0)
  let current = document
  for (const command of commands) {
    const result = editDocument(current, command as DocumentCommand, LIMITS, 'row')
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) current = result.document
  }
  return current.schedule.project.statusDate
}

describe('FR-046 FO-8: the status date field follows TX-3', () => {
  it('is a date-and-time field while the time is shown, and a date field while it is hidden', () => {
    const shown = statusControlOf(fixtureDocument(HOUR_TIER))
    expect(shown.kind).toBe('date')
    expect(isDateTime(shown)).toBe(true)
    const hidden = statusControlOf(fixtureDocument(TIME_HIDDEN))
    expect(hidden.kind).toBe('date')
    expect(isDateTime(hidden)).toBe(false)
  })

  it('time shown: 10:37 typed is written as typed, not rounded to 15 minutes', () => {
    expect(statusDateAfterTyping(fixtureDocument(HOUR_TIER), '2026-10-16T10:37')).toBe('2026-10-16T10:37:00')
  })

  it('time shown: a status date of 10:37 is shown in the field as 10:37', () => {
    const control = statusControlOf(fixtureDocument({ ...HOUR_TIER, statusDate: '2026-10-16T10:37:00' }))
    expect(control.text ?? '').toContain('2026-10-16')
    expect(control.text ?? '').toMatch(/10:37/)
  })

  it('time hidden: a date alone takes the finish-side default time (WT-4)', () => {
    expect(statusDateAfterTyping(fixtureDocument(TIME_HIDDEN), '2026-10-16')).toBe(`2026-10-16T${DEFAULT_FINISH_TIME}`)
  })
})

describe('CU-3: the Guide Cursor label reads table T-378', () => {
  it.each([
    ['hour tier', HOUR_TIER],
    ['half-hour tier', HALF_HOUR_TIER],
  ] as const)('%s: 10:07 reads 10:00 and 10:08 reads 10:15', (_name, scene) => {
    const cursor = cursorScene(scene)
    expect(cursor.label(cursor.pointAt('2026-10-14T10:07:00'))).toBe('2026/10/14 (水) 10:00')
    expect(cursor.label(cursor.pointAt('2026-10-14T10:08:00'))).toBe('2026/10/14 (水) 10:15')
  })

  it('time hidden: the label is the day alone', () => {
    const cursor = cursorScene(TIME_HIDDEN)
    expect(cursor.label(cursor.pointAt('2026-10-14T10:08:00'))).toBe('2026/10/14 (水)')
  })
})

describe('DC-3: the Dual Cursor line stands at the instant snapped by table T-378', () => {
  const PLACED = { cursorADate: '2026-10-14T00:00:00', cursorBDate: '2026-10-20T00:00:00' }

  it.each([
    ['2026-10-14T10:07:00', '2026/10/14 (水) 10:00'],
    ['2026-10-14T10:08:00', '2026/10/14 (水) 10:15'],
  ])('the following cursor A at %s reads %s', (instant, shown) => {
    const cursor = cursorScene(HOUR_TIER)
    const lines = cursor.readout('placingCursorA', PLACED, cursor.pointAt(instant))
    expect(lines?.[0]).toBe(`左: ${shown}`)
  })

  it('IC-45, then a click at 10:08 places cursor A at 10:15 and a click at 10:07 places cursor B at 10:00 (DC-2)', () => {
    const built = stage(HOUR_TIER)
    const band = bandOf(built.loop, TASK_GROUP_B)
    const barStart = planBox(built.loop).x
    const at = (minutesAfterNine: number) => ({ x: barStart + pxOfMinutes(built.loop, minutesAfterNine), y: band.y + band.height / 2 })
    const click = (minutesAfterNine: number): void => {
      for (const phase of ['move', 'down', 'up'] as const) built.send(pointer(phase, at(minutesAfterNine)))
    }
    // STEP: enter the mode, click at 10:08 for cursor A, then at 10:07 for cursor B (minutes after the 09:00 bar start).
    built.press('IC-45')
    click(68)
    click(67)
    const drawn = (frameOf(built.loop).geometry as unknown as { dualCursor: { cursorAX: number; cursorBX: number } | null }).dualCursor
    expect(drawn, 'the two lines are drawn').not.toBeNull()
    expect(drawn?.cursorAX).toBeCloseTo(at(75).x, 1)
    expect(drawn?.cursorBX).toBeCloseTo(at(60).x, 1)
  })
})

describe('FR-014: a lane with no vertex passes where the status line stands', () => {
  const pointsOf = (built: ReturnType<typeof stage>): readonly { x: number; y: number }[] =>
    (frameOf(built.loop).geometry as unknown as { progressLine: readonly { x: number; y: number }[] }).progressLine

  it.each([
    ['time shown, a status date of 10:15', { ...HOUR_TIER, statusDate: '2026-10-14T10:15:00' }],
    ['time hidden', TIME_HIDDEN],
  ] as const)('%s: the points in the empty task group B stand on the status line x', (_name, scene) => {
    const built = stage(scene)
    built.press('IC-39')
    const band = bandOf(built.loop, TASK_GROUP_B)
    const inB = pointsOf(built).filter((one) => one.y > band.y && one.y < band.y + band.height)
    expect(inB.length, 'premise: the progress line crosses task group B').toBeGreaterThan(0)
    for (const one of inB) expect(one.x).toBeCloseTo(statusLineOf(built.loop).x, 1)
  })
})

describe('FR-046 / FR-103: a status line pull on the day unit writes the column the release falls in', () => {
  it('time hidden: pulled 1.5 days right of the 10/14 column edge writes 10/15 at the default finish time', () => {
    const built = stage(TIME_HIDDEN)
    dragBy(built, statusLineGrab(built), 1.5 * pxPerDay(built.loop))
    expect(statusDateOf(built)).toBe(`2026-10-15T${DEFAULT_FINISH_TIME}`)
  })
})

describe('DC-3: the interval row (3rd) reads the snapped 15 minutes, and the day tier reads whole days with the time shown', () => {
  it('cursor A at 10:15, the following cursor at 11:22: row 2 reads 11:15 and the interval adds 1h', () => {
    const cursor = cursorScene(HOUR_TIER)
    const placed = { cursorADate: '2026-10-14T10:15:00', cursorBDate: '2026-10-14T10:15:00' }
    const lines = cursor.readout('placingCursorB', placed, cursor.pointAt('2026-10-14T11:22:00'))
    expect(lines?.[1]).toBe('右: 2026/10/14 (水) 11:15')
    expect(lines?.[2]).toBe('間隔: 0年 0か月 0日 (0 days) 1h')
  })

  it('cursor A at 10/13 10:15, the following cursor at 10/14 11:52: the interval adds 1h 30m (11:45)', () => {
    const cursor = cursorScene(HOUR_TIER)
    const placed = { cursorADate: '2026-10-13T10:15:00', cursorBDate: '2026-10-13T10:15:00' }
    const lines = cursor.readout('placingCursorB', placed, cursor.pointAt('2026-10-14T11:52:00'))
    expect(lines?.[1]).toBe('右: 2026/10/14 (水) 11:45')
    expect(lines?.[2]).toBe('間隔: 0年 0か月 1日 (1 day) 1h 30m')
  })

  it('day tier with the time shown: the following cursor at 10:08 reads the day at 0:00, and the interval adds 0h', () => {
    const cursor = cursorScene(DAY_TIER_SHOWN)
    const placed = { cursorADate: '2026-10-14T00:00:00', cursorBDate: '2026-10-20T00:00:00' }
    const lines = cursor.readout('placingCursorA', placed, cursor.pointAt('2026-10-14T10:08:00'))
    expect(lines?.[0]).toBe('左: 2026/10/14 (水) 0:00')
    expect(lines?.[2]).toBe('間隔: 0年 0か月 6日 (6 days) 0h')
  })
})
