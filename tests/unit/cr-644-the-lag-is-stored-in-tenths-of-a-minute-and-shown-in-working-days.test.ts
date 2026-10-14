// CR-644 spec-derived cases: a lag is stored in tenths of a minute and shown and typed in working days.

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { diagnoseDelay, workingCalendarOf } from '../../src/entity/document-model/schedule/schedule'
import type { ItemRef } from '../../src/entity/document-model/selection/selection'
import { editDependency } from '../../src/use-case/edit-document/edit-dependency'
import {
  commandsOf,
  documentOf,
  fieldOf,
  panelOf,
  recordOf,
  taskOf as panelTaskOf,
} from '../contract/cr-606-stage'
import { unbroken } from '../contract/spec-table'
import { DESIGN, REQUIREMENTS, numberIn, taskGroupDocument, rowOf, taskOf } from './cr-541-stage'

// see FR-009
const FR_009_SHOWN_AND_TYPED =
  '⭐ プロパティパネルは、時刻を表示しない文書（`FR-158`）では形式 `7` のラグを稼働日で、形式 `5`・`3` のラグを下の段の字面（`3h`・`30m`）で見せ、整数の稼働日で打たせ、時刻を表示する文書では `d` ／ `h` ／ `m` で見せて打たせること（MUST） —— 保存は 0.1 分であり（`_assets/fig-erd-detail.md` の `AT-47`）、1 稼働日（`1d`）を `Project.minutesPerDay` 分（空なら `S-128`）として換算する。'
const FR_009_WRITTEN =
  '打たれたラグを書くときは、`lag` に打たれた長さの分 × 10 を、`lagFormat` に打った単位の形式を書くこと（MUST） —— `d`（稼働日）は `7`、`h` は `5`、`m` は `3` である（利用者の判断）。'
const FR_009_CREATED = '依存を作るときも同じく書く'
const FR_009_UNDERSTOOD = '⭐ `GRS` が解するラグの形式は `lagFormat` が `7`（稼働日）・`5`（時）・`3`（分）のものとする（`AT-48`）。'
const FR_009_LITERAL =
  'ほかの形式のラグは、MS Project の字面 —— その形式の単位で表した数に、交換相手の XSD の記号を添えたもの（`2ed`・`1w`） —— で見せるだけにし、値と形式は往復でそのまま保つこと（MUST）'
const FR_009_MINUTES = '長さを決められない形式（百分率・経過の月・空の形式、長さを決める列が空のとき）は、分の字面（`2880m`）で見せる'
const FR_009_DECIMALS = '見せる数は小数 2 桁までとする'
// see VC-15, BD-2
const VC_15_LAG = '⭐ `lag` は稼働時間の分として数え（`FR-009` の換算 —— 形式 `7`・`5`・`3`）、先行の瞬間から文書の暦の稼働時間で進めた瞬間と比べる。'
const VC_15_NOT_JUDGED = '⛔ `FR-009` が解さない形式で `lag` が 0 でない依存を、本行で判じてはならない（MUST NOT）'
const BD_2_LAG = '⭐ `lag` は `VC-15` と同じく稼働時間の分で数え、文書の暦で進める。'
const BD_2_ZERO = '`FR-009` が解さない形式のラグは 0 として流す'
// see UF-128
const UF_128 = '文書の暦で稼働日を判じ、数え、進め、ラグを稼働日へ換算する'

// see S-128, AT-48
const S_128 = numberIn(rowOf('T-209', 'S-128').by['値'] ?? '')
const WORKING_DAYS = 7
const ELAPSED_DAYS = 8
const HOURS = 5
const PERCENT = 19
const ELAPSED_DAYS_ESTIMATED = 40
const TENTHS = 10
const tenthsOfDays = (days: number, minutesPerDay = S_128): number => days * minutesPerDay * TENTHS

describe('CR-644 premise -- the clauses these cases quote still stand', () => {
  it.each([
    ['FR-009 shown and typed', FR_009_SHOWN_AND_TYPED],
    ['FR-009 written', FR_009_WRITTEN],
    ['FR-009 created', FR_009_CREATED],
    ['FR-009 understood 7, 5 and 3', FR_009_UNDERSTOOD],
    ['FR-009 literal', FR_009_LITERAL],
    ['FR-009 minutes', FR_009_MINUTES],
    ['FR-009 decimals', FR_009_DECIMALS],
    ['VC-15 lag', VC_15_LAG],
    ['VC-15 not judged', VC_15_NOT_JUDGED],
    ['BD-2 lag', BD_2_LAG],
    ['BD-2 zero', BD_2_ZERO],
  ])('01-04 holds %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('05-07 T-075 UF-128 owns the conversion', () => {
    expect(DESIGN).toContain(UF_128)
  })

  it('T-213 S-118 is the unit the panel shows, working days', () => {
    const row = rowOf('T-213', 'S-118')
    expect(row.by['名前']).toContain('ラグを見せる単位')
    expect(row.by['値']).toContain('稼働日')
    expect(row.by['備考']).toContain('`AT-47`')
  })

  it('T-209 S-128 is a positive number of minutes', () => {
    expect(S_128).toBeGreaterThan(0)
  })
})

const FROM = 1
const TO = 2

const linkOf = (lag: number | null, lagFormat: number | null): Record<string, unknown> => ({
  predecessorUid: FROM,
  linkType: 1,
  lag,
  lagFormat,
  carry: {},
  carryElements: [],
})

function lineDocument(lag: number | null, lagFormat: number | null, minutesPerDay: number | null = null): Document {
  const built = documentOf({ tasks: [panelTaskOf(FROM), panelTaskOf(TO, { dependencies: [linkOf(lag, lagFormat)] })] })
  return { ...built, schedule: { ...built.schedule, project: { ...built.schedule.project, minutesPerDay } } }
}

const LINE: ItemRef = { kind: 'dependency', successorUid: TO, ordinal: 0 }
const lagFieldOf = (document: Document) => fieldOf(panelOf(document, LINE), 'PR-42')

describe(`FR-009 PR-42 -- ${FR_009_SHOWN_AND_TYPED}`, () => {
  it('PR-42 shows a lagFormat 7 lag of two working days as 2 (minutesPerDay empty, so S-128)', () => {
    const field = lagFieldOf(lineDocument(tenthsOfDays(2), WORKING_DAYS))
    expect(field.text).toBe('2')
    expect(field.controls[0]?.text).toBe('2')
  })

  it('PR-42 converts with Project.minutesPerDay when it is set', () => {
    expect(lagFieldOf(lineDocument(tenthsOfDays(3, 450), WORKING_DAYS, 450)).text).toBe('3')
  })

  it(`PR-42 ${FR_009_DECIMALS} -- an imported fraction is shown, rounded to two places`, () => {
    expect(lagFieldOf(lineDocument(tenthsOfDays(0.5), WORKING_DAYS)).text).toBe('0.5')
    expect(lagFieldOf(lineDocument(tenthsOfDays(1) / 3, WORKING_DAYS)).text).toBe('0.33')
  })

  it('PR-42 shows a zero lag as 0 whatever its format, empty included', () => {
    expect(lagFieldOf(lineDocument(0, null)).text).toBe('0')
    expect(lagFieldOf(lineDocument(0, PERCENT)).text).toBe('0')
  })

  it(`PR-42 ${FR_009_LITERAL}`, () => {
    expect(lagFieldOf(lineDocument(2 * 24 * 60 * TENTHS, ELAPSED_DAYS)).text).toBe('2ed')
    expect(lagFieldOf(lineDocument(3 * 60 * TENTHS, HOURS)).text).toBe('3h')
    expect(lagFieldOf(lineDocument(24 * 60 * TENTHS, ELAPSED_DAYS_ESTIMATED)).text).toBe('1ed?')
  })

  it(`PR-42 ${FR_009_MINUTES}`, () => {
    expect(lagFieldOf(lineDocument(2880 * TENTHS, PERCENT)).text).toBe('2880m')
    expect(lagFieldOf(lineDocument(2880 * TENTHS, null)).text).toBe('2880m')
  })

  it('CM-38 the typed text is whole working days, handed on as they are', () => {
    const document = lineDocument(0, WORKING_DAYS)
    const control = lagFieldOf(document).controls[0]
    expect(control).toBeDefined()
    const commands = commandsOf(document, { row: 'PR-42', key: control!.key, text: '3' })
    expect(commands).toHaveLength(1)
    expect(recordOf(commands[0]!)['kind']).toBe('setDependencyLag')
    expect(recordOf(commands[0]!)['lagWorkingDays']).toBe(3)
  })
})

function lagOf(result: ReturnType<typeof editDependency>): Readonly<Record<string, unknown>> {
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
  const successor = result.document.schedule.tasks.find((one) => one.uid === TO)
  const link = successor?.dependencies.find((one) => one.predecessorUid === FROM)
  if (link === undefined) throw new Error('premise: the link is there')
  return { lag: link.lag, lagFormat: link.lagFormat }
}

describe(`FR-009 CM-38 -- ${FR_009_WRITTEN}`, () => {
  const setLag = (document: Document, lagWorkingDays: number) =>
    editDependency(document, { kind: 'setDependencyLag', predecessorUid: FROM, successorUid: TO, lagWorkingDays })

  it('CM-38 two typed working days write 2 x S-128 x 10 and lagFormat 7 (minutesPerDay empty)', () => {
    expect(lagOf(setLag(lineDocument(0, null), 2))).toEqual({ lag: tenthsOfDays(2), lagFormat: WORKING_DAYS })
  })

  it('CM-38 the day is Project.minutesPerDay when it is set', () => {
    expect(lagOf(setLag(lineDocument(0, null, 450), 2))).toEqual({ lag: 2 * 450 * TENTHS, lagFormat: WORKING_DAYS })
  })

  it('CM-38 a lag in another format becomes a working-day lag once a person types it', () => {
    expect(lagOf(setLag(lineDocument(2 * 24 * 60 * TENTHS, ELAPSED_DAYS), 1)))
      .toEqual({ lag: tenthsOfDays(1), lagFormat: WORKING_DAYS })
  })

  it('CM-38 refuses a fraction of a working day', () => {
    expect(setLag(lineDocument(0, WORKING_DAYS), 1.5).ok).toBe(false)
  })

  it(`CM-36 ${FR_009_CREATED} -- a new link holds S-117 in tenths of a minute with lagFormat 7`, () => {
    const document = documentOf({ tasks: [panelTaskOf(FROM), panelTaskOf(TO)] })
    const result = editDependency(document, {
      kind: 'createDependency', predecessorUid: FROM, successorUid: TO, predecessorEdge: 'finish', successorEdge: 'start',
    })
    expect(lagOf(result)).toEqual({ lag: 0, lagFormat: WORKING_DAYS })
  })
})

const A = 101
const B = 102

interface Plan {
  readonly statusDate: string
  readonly aFinish: string
  readonly aActualFinish: string | null
  readonly bStart: string
  readonly lag: number
  readonly lagFormat: number
  readonly minutesPerDay?: number | null
}

// WHY: CR-710 reads the time of day (FR-054); an unpadded hour (T8:00:00) is no time and left the link unjudged.
const day = (date: number, hour: number): string => `2026-04-${String(date).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`

function planDocument(plan: Plan): Document {
  const raw = taskGroupDocument([{ id: 'r0', parentId: null }])
  raw.schedule.project.statusDate = plan.statusDate
  raw.schedule.project.minutesPerDay = plan.minutesPerDay ?? null
  raw.schedule.project.uidHighWaterMark = 1000
  for (const calendar of raw.schedule.calendars) calendar.exceptions = []
  const isDone = plan.aActualFinish !== null
  raw.schedule.tasks = [
    taskOf(A, {
      start: day(6, 8),
      finish: plan.aFinish,
      actualStart: isDone ? day(6, 8) : null,
      actualFinish: plan.aActualFinish,
      percentComplete: isDone ? 100 : 0,
    }),
    taskOf(B, {
      start: plan.bStart,
      finish: day(10, 17),
      dependencies: [{ ...linkOf(plan.lag, plan.lagFormat), predecessorUid: A }],
    }),
  ]
  raw.schedule.taskGroupMembers = [A, B].map((taskUid) => ({ taskUid, groupId: 'r0' }))
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document
}

const contradictionsOn = (document: Document): readonly string[] =>
  diagnoseDelay(document, workingCalendarOf(document.schedule)).findings
    .filter((one) => one.row === 'VC-15' && one.uid === B).map((one) => one.row)

// WHY: the status date sits before both tasks, so no omission and no projected delay can arise.
const BEFORE = day(3, 17)
const planned = (bStart: string, lag: number, lagFormat: number, minutesPerDay: number | null = null): Document =>
  planDocument({ statusDate: BEFORE, aFinish: day(7, 17), aActualFinish: null, bStart, lag, lagFormat, minutesPerDay })

describe(`VC-15 -- ${VC_15_LAG}`, () => {
  it('VC-15 A ends Tuesday the 7th; with a lag of 2 working days B may not start on the 8th', () => {
    expect(contradictionsOn(planned(day(8, 8), tenthsOfDays(2), WORKING_DAYS))).toEqual(['VC-15'])
  })

  // WHY: CR-710 advances the lag from A's instant (Tue 7th 17:00) by working minutes: two working days end Thu 9th 17:00,
  // so B holds from the next working morning (VC-15).
  it('VC-15 the same link holds when B starts on the 10th, two working days after A ends on the evening of the 7th', () => {
    expect(contradictionsOn(planned(day(10, 8), tenthsOfDays(2), WORKING_DAYS))).toEqual([])
  })

  it('VC-15 the working day is Project.minutesPerDay when it is set', () => {
    expect(contradictionsOn(planned(day(8, 8), tenthsOfDays(2, 450), WORKING_DAYS, 450))).toEqual(['VC-15'])
  })

  // WHY: CR-710 counts the lag in working minutes and no longer rounds it to whole days: 1.5 days end at noon on the 9th.
  it('VC-15 one and a half working days after the evening of the 7th end at noon on the 9th: B at 13:00 holds', () => {
    expect(contradictionsOn(planned(day(9, 13), tenthsOfDays(1.5), WORKING_DAYS))).toEqual([])
  })

  it(`VC-15 ${VC_15_NOT_JUDGED}`, () => {
    expect(contradictionsOn(planned(day(8, 8), 2 * 24 * 60 * TENTHS, ELAPSED_DAYS))).toEqual([])
  })
})

const terminalDelayOfB = (lagFormat: number): number | undefined => {
  const document = planDocument({
    statusDate: day(9, 17),
    aFinish: day(7, 17),
    aActualFinish: day(9, 17),
    bStart: day(10, 8),
    lag: tenthsOfDays(2),
    lagFormat,
  })
  return diagnoseDelay(document, workingCalendarOf(document.schedule)).terminalPushOuts
    // WHY: CR-710 counts the push-out in working minutes (T-314); read back as working days of S-128 minutes.
    .map((one) => ({ ...one, days: one.terminalDelayMinutes / S_128 })).find((one) => one.uid === B)?.days
}

describe(`BD-2 -- ${BD_2_LAG}`, () => {
  // WHY: CR-710 reads instants: A ends Thu 9th 17:00, two working days of lag run Fri and Mon, so B (one day, planned
  // Fri 10th) runs Tue 14th and ends two working days late (BD-2).
  it('BD-2 A finished on the evening of the 9th and B waits 2 working days after it, so B ends two working days late', () => {
    expect(terminalDelayOfB(WORKING_DAYS)).toBe(2)
  })

  it(`BD-2 ${BD_2_ZERO} -- the same number in another format pushes B nowhere`, () => {
    expect(terminalDelayOfB(ELAPSED_DAYS)).toBe(0)
  })
})

// see FR-009, TX-3, DFC-2465
const FR_009_DAY_DOCUMENT_LITERAL =
  '時を単位に打たれたラグを日の文書で稼働日の小数（`0.38`）に換えないのは、日の文書の見せ方を今のまま保つからである（利用者の判断）'
const TX_3_LAG = '時刻を表示しないときは整数の稼働日 —— 形式 `5`・`3` のラグは字面で見せる、`FR-009`'
const MINUTES = 3

describe('DFC-2465 FR-009 PR-42: a document that does not show the time of day shows a lagFormat 5 or 3 lag as its literal', () => {
  it('FR-009 and table T-375 TX-3 still read as quoted', () => {
    expect(REQUIREMENTS).toContain(FR_009_DAY_DOCUMENT_LITERAL)
    expect(Object.values(rowOf('T-375', 'TX-3').by).some((cell) => unbroken(cell).includes(TX_3_LAG))).toBe(true)
  })

  it('premise: the document does not show the time of day', () => {
    expect(lineDocument(0, WORKING_DAYS).documentSettings.showsTimeOfDay).toBe(false)
  })

  it.each([
    ['30 minutes in lagFormat 3', 30 * TENTHS, MINUTES, '30m'],
    ['90 minutes in lagFormat 3', 90 * TENTHS, MINUTES, '90m'],
    ['3 hours in lagFormat 5', 3 * 60 * TENTHS, HOURS, '3h'],
    ['90 minutes in lagFormat 5', 90 * TENTHS, HOURS, '1.5h'],
  ])('%s is shown as %s, not as a fraction of a working day', (_name, lag, lagFormat, shown) => {
    expect(lagFieldOf(lineDocument(lag, lagFormat)).text).toBe(shown)
  })

  it('a lagFormat 7 lag of 3 working days is shown as working days, 3', () => {
    expect(lagFieldOf(lineDocument(tenthsOfDays(3), WORKING_DAYS)).text).toBe('3')
  })
})

// see FR-009, TX-10, DFC-2466
const FR_009_FINEST_UNIT =
  '⭐ 2 つ以上の単位で打たれたとき（`1d 2h`）は、打たれた単位のうち最も細かいものの形式を書くこと（MUST） —— `1d 2h` は `5`、`2h 30m` は `3` である。'
const FR_009_BARE_NUMBER = '単位の無い整数は稼働日（`7`）と読む。'

describe('DFC-2466 FR-009 CM-38: a lag typed in two or more units writes the format of the finest unit typed', () => {
  it('FR-009 still reads as quoted', () => {
    expect(REQUIREMENTS).toContain(FR_009_FINEST_UNIT)
    expect(REQUIREMENTS).toContain(FR_009_BARE_NUMBER)
  })

  const timed = (document: Document): Document => ({
    ...document,
    documentSettings: { ...document.documentSettings, showsTimeOfDay: true },
  })

  function typed(text: string): Readonly<Record<string, unknown>> {
    const document = timed(lineDocument(0, WORKING_DAYS))
    const control = lagFieldOf(document).controls[0]
    if (control === undefined) throw new Error('premise: PR-42 takes a typed lag')
    const commands = commandsOf(document, { row: 'PR-42', key: control.key, text })
    if (commands.length !== 1) throw new Error(`premise: "${text}" is taken as one command, got ${commands.length}`)
    return lagOf(editDependency(document, commands[0] as Parameters<typeof editDependency>[1]))
  }

  it.each([
    ['1d 2h', (S_128 + 2 * 60) * TENTHS, HOURS],
    ['2h 30m', (2 * 60 + 30) * TENTHS, MINUTES],
    ['1d 30m', (S_128 + 30) * TENTHS, MINUTES],
    ['1d 2h 30m', (S_128 + 2 * 60 + 30) * TENTHS, MINUTES],
  ])('"%s" writes lag %i and the format of its finest unit, %i', (text, lag, lagFormat) => {
    expect(typed(text)).toEqual({ lag, lagFormat })
  })

  it.each([
    ['2d', tenthsOfDays(2), WORKING_DAYS],
    ['3h', 3 * 60 * TENTHS, HOURS],
    ['45m', 45 * TENTHS, MINUTES],
    ['3', tenthsOfDays(3), WORKING_DAYS],
  ])('"%s" in one unit, or none, writes lag %i and format %i', (text, lag, lagFormat) => {
    expect(typed(text)).toEqual({ lag, lagFormat })
  })
})
