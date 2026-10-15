// DFC-2463, CR-755 (spec-only): FR-156 sets the PC's standard time as the schedule data zone and tells nothing.

import { describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { TIME_ZONE_ROWS, standardTimeZoneKeyForSystem } from '../../src/entity/document-model/schedule/time-zone'
import { readSystemStandardTimeZone } from '../../src/framework/single-html-shell/frame-loop'
import {
  OPEN_CHOOSER,
  REQUIREMENTS,
  UTF8,
  closeImportReport,
  here,
  shellStage,
  surfaceOfEntrance,
  type ShellStage,
} from './cr-610-file-flow-stage'
import { bare, specTable } from './spec-table'

// see FR-156, BK-4
const FR_156_PC_STANDARD =
  '⭐ MSPDI を置き換えて開いた文書と、新しく作った文書（表 T-342 の `BK-4`）の日程データのタイムゾーンは、その PC の標準時の行とすること（MUST） —— 夏時間の季節に開いても標準時とする（例 太平洋時間の PC は 8 月でも `UTC-08:00`）（利用者の判断）。'
const FR_156_PC_FOLD =
  '表 T-376 の標準時の行に同じ差が無いときは、差が最も近い標準時の行（同じ近さなら本表の上の行）へ寄せる（例 UTC+05:45 は `ZN-57` の `UTC+05:30`）。'
const FR_156_MERGE_KEEPS = 'MSPDI を合流・重ねで読むときは、今の文書の日程データのタイムゾーンを変えない。'
const FR_156_NOT_TOLD = '⛔ 寄せたことも決めたことも告げない（利用者の判断）'

const T_376 = specTable('T-376')
const keyOfRow = (id: string): string => bare(T_376.rows.find((one) => one.id === id)?.by['鍵'] ?? '')

describe('the clauses and the rows these cases are built from still read as quoted', () => {
  it.each([FR_156_PC_STANDARD, FR_156_PC_FOLD, FR_156_MERGE_KEEPS, FR_156_NOT_TOLD])('FR-156: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-376 holds 39 rows, and the keys the code offers are those rows in that order', () => {
    expect(T_376.rows).toHaveLength(39)
    expect(TIME_ZONE_ROWS.map((one) => one.key)).toEqual(T_376.rows.map((one) => keyOfRow(one.id)))
  })
})

describe('DFC-2463 (b) FR-156: standardTimeZoneKeyForSystem takes the smaller offset and folds to a standard-time row', () => {
  it('a PC on Pacific time (-480 in January, -420 in July) is UTC-08:00 all year, never the daylight row', () => {
    expect(standardTimeZoneKeyForSystem({ januaryOffsetMinutes: -480, julyOffsetMinutes: -420 })).toBe(keyOfRow('ZN-33'))
  })

  it('a PC on Sydney time (+660 in January, +600 in July) is UTC+10:00: the smaller offset is the standard time', () => {
    expect(standardTimeZoneKeyForSystem({ januaryOffsetMinutes: 660, julyOffsetMinutes: 600 })).toBe(keyOfRow('ZN-62'))
  })

  it('UTC+05:45 folds to ZN-57 (UTC+05:30): +05:30 and +06:00 are as near, and the upper row wins', () => {
    expect(standardTimeZoneKeyForSystem({ januaryOffsetMinutes: 345, julyOffsetMinutes: 345 })).toBe(keyOfRow('ZN-57'))
  })

  it('UTC+10:30 folds to ZN-62 (UTC+10:00): the daylight row UTC+11:00 DST is never offered, and +11:00 is the lower row', () => {
    expect(standardTimeZoneKeyForSystem({ januaryOffsetMinutes: 630, julyOffsetMinutes: 630 })).toBe(keyOfRow('ZN-62'))
  })

  it('a PC on UTC+09:00 is ZN-61', () => {
    expect(standardTimeZoneKeyForSystem({ januaryOffsetMinutes: 540, julyOffsetMinutes: 540 })).toBe(keyOfRow('ZN-61'))
  })
})

// WHY: a zone of the table other than this PC's, so a change to the PC's region shows.
const PC_REGION = readSystemStandardTimeZone()
const OTHER_REGION = TIME_ZONE_ROWS.filter((one) => !one.isDaylight).map((one) => one.key).find((one) => one !== PC_REGION) as string

function heldIn(region: string): Document {
  const draft = JSON.parse(jsonFromDocument(here())) as { schedule: { project: Record<string, unknown> } }
  draft.schedule.project['scheduleDataTimeZone'] = region
  const read = documentFromJson(JSON.stringify(draft))
  if (!read.ok) throw new Error(`premise: the bench document is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const NAMESPACE = 'http://schemas.microsoft.com/project/2007'
const BENCH_PROJECT = here().schedule.project
// WHY: the name (PF-1) and the start (PF-8) of the bench, so a merge meets no MG-4 question the shell cannot ask yet (PND-423).
const MSPDI = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  `<Project xmlns="${NAMESPACE}">`,
  '<SaveVersion>12</SaveVersion>',
  `<Name>${BENCH_PROJECT.name ?? ''}</Name>`,
  `<StartDate>${BENCH_PROJECT.startDate ?? ''}</StartDate>`,
  '<MinutesPerDay>480</MinutesPerDay>',
  '<Tasks><Task><UID>51</UID><ID>1</ID><Name>From the file</Name><OutlineNumber>1</OutlineNumber><OutlineLevel>1</OutlineLevel>' +
    '<Start>2026-04-06T08:00:00</Start><Finish>2026-04-07T17:00:00</Finish><Duration>PT16H0M0S</Duration><DurationFormat>7</DurationFormat>' +
    '<Milestone>0</Milestone><Summary>0</Summary></Task></Tasks>',
  '</Project>',
].join('\n')

const zoneOf = (built: ShellStage): string => built.loop.document().schedule.project.scheduleDataTimeZone

async function openMspdiBy(built: ShellStage, entry: string): Promise<void> {
  await built.open(built.file('incoming.xml', UTF8.encode(MSPDI)))
  expect(built.last().openModal, 'precondition: SK-10 raised no U-56').not.toBeNull()
  await built.press(OPEN_CHOOSER(), entry)
  if (built.last().confirmation !== null) await built.answer('proceed')
  await closeImportReport(built)
}

describe('DFC-2463 (a) FR-156: where the PC standard time is set, and that nothing is told', () => {
  it('premise: the bench document stands in another zone than this PC', () => {
    expect(OTHER_REGION).not.toBe(PC_REGION)
  })

  it('an MSPDI opened to replace the document (IC-71) takes the PC standard time and tells nothing', async () => {
    const built = await shellStage({ document: heldIn(OTHER_REGION) })
    await openMspdiBy(built, 'IC-71')
    expect(built.loop.document().schedule.tasks.some((one) => one.uid === 51), 'precondition: the file replaced the document').toBe(true)
    expect(zoneOf(built)).toBe(PC_REGION)
    expect(built.last().notices).toEqual([])
  })

  it('a new document started by IC-98 takes the PC standard time and tells nothing', async () => {
    const built = await shellStage({ document: heldIn(OTHER_REGION) })
    await built.press(surfaceOfEntrance('IC-98'), 'IC-98')
    if (built.last().confirmation?.question === 'QN-5') await built.answer('proceed')
    expect(built.loop.document().schedule.tasks.some((one) => one.uid === 1), 'precondition: IC-98 replaced the document').toBe(false)
    expect(zoneOf(built)).toBe(PC_REGION)
    expect(built.last().notices).toEqual([])
  })

  it('an MSPDI merged into the document (IC-72) keeps the zone of the document', async () => {
    const built = await shellStage({ document: heldIn(OTHER_REGION) })
    await openMspdiBy(built, 'IC-72')
    expect(built.loop.document().schedule.tasks.length, 'precondition: the merge added the task of the file').toBeGreaterThan(1)
    expect(zoneOf(built)).toBe(OTHER_REGION)
  })

  it('an MSPDI laid over as the plan before the change (IC-73) keeps the zone of the document', async () => {
    const built = await shellStage({ document: heldIn(OTHER_REGION) })
    await openMspdiBy(built, 'IC-73')
    expect(built.last().openModal, 'precondition: IC-73 closed U-56').toBeNull()
    expect(zoneOf(built)).toBe(OTHER_REGION)
  })
})
