// CR-850 (spec-only): the five new MUST clauses of T-378, FR-046 and CU-3, each pressed against the shell, the panel or the label.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { commandFromFieldCommit } from '../../src/adapter/input-command-translator/input-command-translator'
import type { FieldCommit, PropertyControl } from '../../src/adapter/screen-renderer/screen-renderer'
import { guideCursorPointOf } from '../../src/adapter/svg-renderer/schedule-overlays'
import type { Document } from '../../src/entity/document-model/document/document'
import { xFromDay } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { editDocument, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import {
  DAY_TIER_SHOWN,
  DEFAULT_FINISH_TIME,
  HOUR_TIER,
  REQUIREMENTS,
  TIME_HIDDEN,
  cursorScene,
  dragBy,
  fixtureDocument,
  frameOf,
  oneFieldOf,
  pinClock,
  planBox,
  pxOfMinutes,
  pxPerDay,
  settingsPanel,
  stage,
  statusDateOf,
  statusLineGrab,
  statusLineOf,
  unpinClock,
} from '../unit/cr-850-stage'
import { contextOf as fieldContextOf } from './cr-606-stage'

beforeEach(pinClock)
afterEach(unpinClock)

const T_378_READ_BY_ALL =
  '⭐ 本表の単位は、掴み代のほか、基準日線のドラッグ（`FR-046`）、デュアルカーソルの線（`FR-082` の 表 T-029a の `DC-3`）、ガイドカーソルの札（表 T-029 の `CU-3`）も読むこと（MUST）'
const FR_046_DRAG_SNAPS = '⭐ 離した位置は、`FR-103` の 表 T-378 の単位で寄せて読むこと（MUST）'
const FR_046_LINE_AT_INSTANT = '⭐ 時刻を表示しているとき（`FR-158`）は、基準日線を `statusDate` の瞬間の位置に引くこと（MUST）'
const FR_046_FIELD_FORM =
  '⭐ 欄の形は `FR-158` の 表 T-375 の `TX-3` に従い、時刻を表示するときは日付と時刻の欄とし、打った分を丸めずに `statusDate` に書くこと（MUST）'
const CU_3_LABEL_SNAPS = '⭐ 札の日時は、縦の線が立つ点を `FR-103` の 表 T-378 の単位で寄せた瞬間とすること（MUST）'

const WEDNESDAY_14 = '2026/10/14 (水)'

describe(`T-378: ${T_378_READ_BY_ALL}`, () => {
  it('the requirements still carry the clause', () => {
    expect(REQUIREMENTS).toContain(T_378_READ_BY_ALL)
  })

  it('the status line drag, the Dual Cursor readout and the Guide Cursor label all read 10:08 as 10:15 at the hour tier', () => {
    const built = stage(HOUR_TIER)
    dragBy(built, statusLineGrab(built), -pxOfMinutes(built.loop, 112))
    expect(statusDateOf(built), 'FR-046').toBe('2026-10-14T10:15:00')
    const cursor = cursorScene(HOUR_TIER)
    const at = cursor.pointAt('2026-10-14T10:08:00')
    const placed = { cursorADate: '2026-10-14T00:00:00', cursorBDate: '2026-10-20T00:00:00' }
    expect(cursor.readout('placingCursorA', placed, at)?.[0], 'DC-3').toBe(`左: ${WEDNESDAY_14} 10:15`)
    expect(cursor.label(at), 'CU-3').toBe(`${WEDNESDAY_14} 10:15`)
  })

  it('with the time hidden all three read the day (SG-1)', () => {
    const built = stage(TIME_HIDDEN)
    dragBy(built, statusLineGrab(built), 1.5 * pxPerDay(built.loop))
    expect(statusDateOf(built), 'FR-046').toBe(`2026-10-15T${DEFAULT_FINISH_TIME}`)
    const cursor = cursorScene(TIME_HIDDEN)
    const at = cursor.pointAt('2026-10-14T10:08:00')
    const placed = { cursorADate: '2026-10-14T00:00:00', cursorBDate: '2026-10-20T00:00:00' }
    expect(cursor.readout('placingCursorA', placed, at)?.[0], 'DC-3').toBe(`左: ${WEDNESDAY_14}`)
    expect(cursor.label(at), 'CU-3').toBe(WEDNESDAY_14)
  })
})

describe(`FR-046: ${FR_046_DRAG_SNAPS}`, () => {
  it('the requirements still carry the clause', () => {
    expect(REQUIREMENTS).toContain(FR_046_DRAG_SNAPS)
  })

  it.each([
    ['10:07 writes 10:00', 113, '2026-10-14T10:00:00'],
    ['10:08 writes 10:15', 112, '2026-10-14T10:15:00'],
  ] as const)('15 minutes (SG-2): a release at %s, the snapped instant', (_name, minutesLeft, instant) => {
    const built = stage(HOUR_TIER)
    dragBy(built, statusLineGrab(built), -pxOfMinutes(built.loop, minutesLeft))
    expect(statusDateOf(built)).toBe(instant)
  })

  it('day (SG-1), time hidden: the day column the release falls in, at the finish-side default time (WT-4)', () => {
    const built = stage(TIME_HIDDEN)
    dragBy(built, statusLineGrab(built), 2.5 * pxPerDay(built.loop))
    expect(statusDateOf(built)).toBe(`2026-10-16T${DEFAULT_FINISH_TIME}`)
  })

  it('day (SG-1), time shown at the day tier: the column the release falls in, not the nearest midnight read on the finish side', () => {
    const built = stage(DAY_TIER_SHOWN)
    // STEP: the line stands at 10/14 at the default finish time; 0.4 day right falls in the 10/15 column.
    dragBy(built, statusLineGrab(built), 0.4 * pxPerDay(built.loop))
    expect(statusDateOf(built)).toBe(`2026-10-15T${DEFAULT_FINISH_TIME}`)
  })
})

describe(`FR-046: ${FR_046_LINE_AT_INSTANT}`, () => {
  it('the requirements still carry the clause', () => {
    expect(REQUIREMENTS).toContain(FR_046_LINE_AT_INSTANT)
  })

  it('time shown: a status date of 12:00 stands on the right edge of a bar that finishes at 12:00', () => {
    const built = stage(HOUR_TIER)
    const box = planBox(built.loop)
    expect(statusLineOf(built.loop).x).toBeCloseTo(box.x + box.width, 1)
  })

  it('time shown: a status date of 10:37 stands 97 minutes right of the 09:00 bar start, between the 15-minute steps', () => {
    const built = stage({ ...HOUR_TIER, statusDate: '2026-10-14T10:37:00' })
    expect(statusLineOf(built.loop).x).toBeCloseTo(planBox(built.loop).x + pxOfMinutes(built.loop, 97), 1)
  })

  it('time hidden: the line stands at the left edge of the status day column', () => {
    const built = stage({ ...TIME_HIDDEN, statusDate: '2026-10-14T12:00:00' })
    expect(statusLineOf(built.loop).x).toBeCloseTo(xFromDay(frameOf(built.loop).layout, { year: 2026, month: 10, day: 14 }), 1)
  })
})

// see FR-046, TX-3
const STATUS_DATE_ROW = 'IC-44'
const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 240, taskGroupAreaWidthWithoutPanels: 982 }

const statusControlOf = (document: Document): PropertyControl => {
  const control = oneFieldOf(settingsPanel(document), STATUS_DATE_ROW).controls[0]
  if (control === undefined) throw new Error('the status date field has no control')
  return control
}

function typed(document: Document, text: string): unknown {
  const control = statusControlOf(document)
  const commands = commandFromFieldCommit({ row: STATUS_DATE_ROW, key: control.key, text } as FieldCommit, fieldContextOf(document))
  expect(commands.length, 'the commit issues a command').toBeGreaterThan(0)
  let current = document
  for (const command of commands) {
    const result = editDocument(current, command as DocumentCommand, LIMITS, 'row')
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) current = result.document
  }
  return current.schedule.project.statusDate
}

describe(`FR-046: ${FR_046_FIELD_FORM}`, () => {
  it('the requirements still carry the clause', () => {
    expect(REQUIREMENTS).toContain(FR_046_FIELD_FORM)
  })

  it('time shown: the field is a date-and-time field', () => {
    expect((statusControlOf(fixtureDocument(HOUR_TIER)) as { isDateTime?: unknown }).isDateTime).toBe(true)
  })

  it.each(['2026-10-16T10:37', '2026-10-16T10:08', '2026-10-16T23:59'])('time shown: %s is written to the minute as typed', (text) => {
    expect(typed(fixtureDocument(HOUR_TIER), text)).toBe(`${text}:00`)
  })

  it('time hidden: a date field, and the date takes the finish-side default time', () => {
    const document = fixtureDocument(TIME_HIDDEN)
    expect((statusControlOf(document) as { isDateTime?: unknown }).isDateTime).not.toBe(true)
    expect(typed(document, '2026-10-16')).toBe(`2026-10-16T${DEFAULT_FINISH_TIME}`)
  })
})

describe(`CU-3: ${CU_3_LABEL_SNAPS}`, () => {
  it('the requirements still carry the clause', () => {
    expect(REQUIREMENTS).toContain(CU_3_LABEL_SNAPS)
  })

  it.each([
    ['2026-10-14T10:07:00', '10:00'],
    ['2026-10-14T10:08:00', '10:15'],
    ['2026-10-14T10:22:00', '10:15'],
    ['2026-10-14T10:23:00', '10:30'],
  ])('hour tier: a line at %s labels %s', (instant, clock) => {
    const cursor = cursorScene(HOUR_TIER)
    expect(cursor.label(cursor.pointAt(instant))).toBe(`${WEDNESDAY_14} ${clock}`)
  })

  it('the line itself follows the pointer, unsnapped', () => {
    const cursor = cursorScene(HOUR_TIER)
    const at = cursor.pointAt('2026-10-14T10:08:00')
    expect(guideCursorPointOf(cursor.regions, 'single-vertical', at)?.x).toBeCloseTo(at.x, 6)
  })
})
