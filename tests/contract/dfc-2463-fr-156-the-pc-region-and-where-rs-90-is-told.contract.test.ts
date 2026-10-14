// DFC-2463 (spec-only): FR-156 sets the PC's region as the schedule data's zone, folds a region outside T-376, and tells RS-90 only where it says.

import { describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Notice } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { TIME_ZONE_ROWS, regionForPc } from '../../src/entity/document-model/schedule/time-zone'
import { readPcRegion } from '../../src/framework/single-html-shell/frame-loop'
import {
  OPEN_CHOOSER,
  REQUIREMENTS,
  UTF8,
  closeImportReport,
  here,
  reasonWords,
  shellStage,
  surfaceOfEntrance,
  type ShellStage,
} from './cr-610-file-flow-stage'
import { bare, specTable } from './spec-table'

// see FR-156, RS-90
const FR_156_PC_REGION =
  '⭐ MSPDI を置き換えて開いた文書と、新しく作った文書（表 T-342 の `BK-4`）の日程データのタイムゾーンは、その PC の地域とすること（MUST） —— 表 T-376 に無い地域は、その時点の UTC の差が同じ行へ、同じ行が無ければ差が最も近い行（同じ近さなら本表の上の行）へ寄せる（例 UTC+05:45 は `ZN-20`）。'
const FR_156_MERGE_KEEPS = 'MSPDI を合流・重ねで読むときは、今の文書の日程データのタイムゾーンを変えない。'
const FR_156_TOLD =
  '寄せたこと・決めたことを 表 T-233 の `RS-90` で告げること（MUST） —— 告げるのは MSPDI を置き換えて開いたときと、入口 `IC-98` で新しく始めたときとし、起動したときの空の文書では告げない（起動のたびに 1 行が出る）。'

const T_376 = specTable('T-376')
const regionOfRow = (id: string): string => bare(T_376.rows.find((one) => one.id === id)?.by['地域名'] ?? '')
const RS_90_TEXT = reasonWords('RS-90').text.ja

describe('the clauses and the rows these cases are built from still read as quoted', () => {
  it.each([FR_156_PC_REGION, FR_156_MERGE_KEEPS, FR_156_TOLD])('FR-156: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-376 holds 28 rows, and the regions the code offers are those rows in that order', () => {
    expect(T_376.rows).toHaveLength(28)
    expect(TIME_ZONE_ROWS.map((one) => one.region)).toEqual(T_376.rows.map((one) => regionOfRow(one.id)))
  })

  it('table T-233 holds RS-90 and the dictionary holds its words', () => {
    expect(specTable('T-233').rows.some((one) => one.id === 'RS-90')).toBe(true)
    expect(RS_90_TEXT.length).toBeGreaterThan(0)
  })
})

const MINUTE = 60000
// WHY: one moment in the northern summer and one in the northern winter, so a row's offset "at that moment" differs.
const JULY = Date.UTC(2026, 6, 1, 0, 0) / MINUTE
const JANUARY = Date.UTC(2026, 0, 15, 0, 0) / MINUTE

describe('DFC-2463 (b) FR-156: regionForPc folds a region outside table T-376', () => {
  it('keeps a region of the table as it is, and says it moved nothing', () => {
    expect(regionForPc({ region: regionOfRow('ZN-24'), offsetMinutes: 540 }, JULY)).toEqual({ region: regionOfRow('ZN-24'), isMoved: false })
  })

  it('UTC+05:45 folds to ZN-20: +05:30 and +06:00 are as near, and the upper row wins', () => {
    expect(regionForPc({ region: 'Asia/Kathmandu', offsetMinutes: 345 }, JULY)).toEqual({ region: regionOfRow('ZN-20'), isMoved: true })
  })

  it('UTC+09:30 in July folds to ZN-24 (+09:00): ZN-25 is +10:00 then and as near, and the upper row wins', () => {
    expect(regionForPc({ region: 'Australia/Darwin', offsetMinutes: 570 }, JULY).region).toBe(regionOfRow('ZN-24'))
  })

  it('a region of the same offset as a row folds to that row: UTC+09:00 is ZN-24', () => {
    expect(regionForPc({ region: 'Asia/Seoul', offsetMinutes: 540 }, JANUARY)).toEqual({ region: regionOfRow('ZN-24'), isMoved: true })
  })

  it('reads the offset of each row at that moment: UTC+02:00 is ZN-15 in July (summer time) and ZN-16 in January', () => {
    expect(regionForPc({ region: 'Africa/Johannesburg', offsetMinutes: 120 }, JULY).region).toBe(regionOfRow('ZN-15'))
    expect(regionForPc({ region: 'Africa/Johannesburg', offsetMinutes: 120 }, JANUARY).region).toBe(regionOfRow('ZN-16'))
  })

  it('a PC that names no region folds by its offset alone', () => {
    expect(regionForPc({ region: null, offsetMinutes: 345 }, JULY)).toEqual({ region: regionOfRow('ZN-20'), isMoved: true })
  })
})

// WHY: a zone of the table other than this PC's, so a change to the PC's region shows.
const PC_REGION = readPcRegion().region
const OTHER_REGION = TIME_ZONE_ROWS.map((one) => one.region).find((one) => one !== PC_REGION) as string

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

const toldOf = (notices: readonly Notice[]): number => notices.filter((one) => one.text === RS_90_TEXT).length
const zoneOf = (built: ShellStage): string => built.loop.document().schedule.project.scheduleDataTimeZone

async function openMspdiBy(built: ShellStage, entry: string): Promise<void> {
  await built.open(built.file('incoming.xml', UTF8.encode(MSPDI)))
  expect(built.last().openModal, 'precondition: SK-10 raised no U-56').not.toBeNull()
  await built.press(OPEN_CHOOSER(), entry)
  if (built.last().confirmation !== null) await built.answer('proceed')
  await closeImportReport(built)
}

describe('DFC-2463 (a) FR-156: where the PC region is set and RS-90 is told', () => {
  it('premise: the bench document stands in another zone than this PC', () => {
    expect(OTHER_REGION).not.toBe(PC_REGION)
  })

  it('a launch tells no RS-90', async () => {
    const built = await shellStage({ document: heldIn(OTHER_REGION) })
    await built.repaint()
    expect(toldOf(built.last().notices)).toBe(0)
  })

  it('an MSPDI opened to replace the document (IC-71) takes the PC region and tells RS-90 once', async () => {
    const built = await shellStage({ document: heldIn(OTHER_REGION) })
    await openMspdiBy(built, 'IC-71')
    expect(built.loop.document().schedule.tasks.some((one) => one.uid === 51), 'precondition: the file replaced the document').toBe(true)
    expect(zoneOf(built)).toBe(PC_REGION)
    expect(toldOf(built.last().notices)).toBe(1)
  })

  it('a new document started by IC-98 takes the PC region and tells RS-90 once', async () => {
    const built = await shellStage({ document: heldIn(OTHER_REGION) })
    await built.press(surfaceOfEntrance('IC-98'), 'IC-98')
    if (built.last().confirmation?.question === 'QN-5') await built.answer('proceed')
    expect(built.loop.document().schedule.tasks.some((one) => one.uid === 1), 'precondition: IC-98 replaced the document').toBe(false)
    expect(zoneOf(built)).toBe(PC_REGION)
    expect(toldOf(built.last().notices)).toBe(1)
  })

  it('an MSPDI merged into the document (IC-72) keeps the zone of the document and tells no RS-90', async () => {
    const built = await shellStage({ document: heldIn(OTHER_REGION) })
    await openMspdiBy(built, 'IC-72')
    expect(built.loop.document().schedule.tasks.length, 'precondition: the merge added the task of the file').toBeGreaterThan(1)
    expect(zoneOf(built)).toBe(OTHER_REGION)
    expect(toldOf(built.last().notices)).toBe(0)
  })

  it('an MSPDI laid over as the plan before the change (IC-73) keeps the zone of the document and tells no RS-90', async () => {
    const built = await shellStage({ document: heldIn(OTHER_REGION) })
    await openMspdiBy(built, 'IC-73')
    expect(built.last().openModal, 'precondition: IC-73 closed U-56').toBeNull()
    expect(zoneOf(built)).toBe(OTHER_REGION)
    expect(toldOf(built.last().notices)).toBe(0)
  })
})
