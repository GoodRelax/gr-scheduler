// CR-605 part B1: CM-39 carries the exception list and makes a Calendar when the default would answer (FR-088).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { Calendar } from '../../src/entity/document-model/schedule/schedule'
import {
  applyDocumentChange,
  type ChangeAudience,
  type ChangeStep,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type SettingsLimits,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { editDocument } from '../../src/use-case/edit-document/edit-document'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { unbroken } from '../contract/spec-table'
import { rowOf } from './cr-430-cross-section-scene'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const ERD = unbroken(readFileSync(join(SPEC, '_assets', 'fig-erd-detail.md'), 'utf8'))

// see FR-088
const FR_088_MAKE =
  '⭐ 文書の暦が 表 T-209 の既定に解けるとき、`CM-39` は同じ書き込みで `Calendar` を 1 行作り、`Project.calendarUid` に指させてから、曜日と例外日を書くこと（MUST） —— 作らないと、新しい文書では暦を 1 つも直せない。'
const FR_088_UID = '作る暦の `uid` は `Project.uidHighWaterMark`（`AT-20`）に従って採り、`isBaseCalendar` を真とする。'
const FR_088_EXCEPTIONS = '例外日は、繰り返しの無いもの（表 T-058 の `AT-82` が言う繰り返しの無い例外日）を足し、直し、消せること（MUST）。'
const FR_088_DAY_WORKING = '行ごとに休みか稼働か（`AT-81`）を選べること（MUST） —— 交換相手の `Exception` がその両方を持つ。'
const FR_088_RECURRING_DELETE =
  '⚠️ 取り込んだ繰り返しの例外日は、一覧に出して消せるようにし、直させてはならない（MUST NOT） —— 繰り返しを展開しない（`FR-054`）ので、直した結果を画面で確かめられない。'
const FR_088_UNDO = '**変更は取り消しの対象とすること（MUST）**（表 T-027 の `UN-13`）。'
// see FR-054
const FR_054_RESOLVE =
  '指していないとき、および指す先が無いときは、`isBaseCalendar` が真の `Calendar` のうち `ordinal` が最小のものとし、それも無いときは表 T-209 の既定とすること（MUST）。'
// see CM-39
const CM_39_DOES = '暦（稼働する曜日・例外日）と週の始まりを直す。既定の暦のままなら、暦を 1 つ作ってから直す'
// see AT-67
const AT_67_NEXT = '`GRS` が足す暦（合流の `MG-5` ほか）は、既にある暦の最大の次を取る'
// see AT-20
const AT_20_MAX = '発番済みの `uid` の最大値。'
// see WC-7
const WC_7_NO_WRITE = '⭐ 下書きが文書と同じなら書かない —— 何も変えなかった書き込みは取り消しの段を残さない（`FR-031`）'
// see S-106
const S_106_CELL = '月・火・水・木・金'
// see S-107
const S_107_CELL = '無し'

// see S-106, AT-73
const S_106_WORKING: readonly number[] = [2, 3, 4, 5, 6]

interface ExceptionRow {
  readonly ordinal: number
  readonly name: string | null
  readonly fromDate: string | null
  readonly toDate: string | null
  readonly dayWorking: boolean | null
  readonly recurrenceKind: number | null
  readonly carry: Readonly<Record<string, string>>
  readonly carryElements: readonly unknown[]
}

// WHY: CM-39 writes the WT-6 / WT-7 times on a row it adds (CR-649), so the rows carry them and read back as sent.
const exceptionOf = (part: Partial<ExceptionRow> & { ordinal: number }): ExceptionRow => ({
  name: `x${part.ordinal}`,
  fromDate: '2026-08-13T00:00:00',
  toDate: '2026-08-14T23:59:00',
  dayWorking: false,
  recurrenceKind: 9,
  carry: {},
  carryElements: [],
  ...part,
})

const SHUTDOWN = exceptionOf({ ordinal: 0, name: 'shutdown' })
const WORKED_SATURDAY = exceptionOf({
  ordinal: 1,
  name: 'worked saturday',
  fromDate: '2026-08-22T00:00:00',
  toDate: '2026-08-22T23:59:00',
  dayWorking: true,
})
// WHY: an imported yearly row with a carried column, so a rewrite that drops carry shows.
const IMPORTED_YEARLY = exceptionOf({
  ordinal: 2,
  name: 'new year',
  fromDate: '2026-01-01T00:00:00',
  toDate: '2026-01-01T23:59:00',
  recurrenceKind: 2,
  carry: { EnteredByOccurrences: '0' },
})

const weekDaysOf = (working: readonly number[]): readonly unknown[] =>
  [1, 2, 3, 4, 5, 6, 7].map((dayType, ordinal) => ({
    ordinal,
    dayType,
    dayWorking: working.includes(dayType),
    carry: {},
    carryElements: [],
  }))

const calendarOf = (part: Record<string, unknown> = {}): Calendar =>
  ({
    uid: 1,
    name: 'Standard',
    isBaseCalendar: true,
    baseCalendarUid: null,
    ordinal: 0,
    carry: {},
    carryElements: [],
    weekDays: weekDaysOf(S_106_WORKING),
    exceptions: [],
    ...part,
  }) as unknown as Calendar

const HIGH_WATER = 40

const documentOf = (project: Record<string, unknown>, calendars: readonly Calendar[]): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: {
        title: 'A',
        statusDate: null,
        startDate: null,
        themeHue: 214,
        minutesPerDay: null,
        weekStartDay: 1,
        calendarUid: null,
        defaultStartTime: null,
        defaultFinishTime: null,
        uidHighWaterMark: HIGH_WATER,
        carry: {},
        carryElements: [],
        ...project,
      },
      calendars,
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      stackDirection: 'up',
      planActualDisplay: 'both',
      guideCursorMode: 'none',
      dualCursor: null,
      fontScale: 'M',
      fontScaleSizes: { S: 12, M: 14, L: 16 },
      rulerFont: 14,
      rulerHeight: 48,
      canvasPadding: 10,
      taskGroupPanelWidth: 170,
      propertyPanelWidth: 280,
      pinnedGroupIds: [],
      pinnedTaskGroupMax: 5,
      zoomX: 1,
      zoomY: 1,
      scrollDate: null,
      scrollGroupId: null,
      dependencyVisible: true,
    },
    documentStamp: {
      scheduleUpdatedUtc: '2026-10-01T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-10-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const POINTED = (): Document => documentOf({ calendarUid: 1 }, [calendarOf({ exceptions: [IMPORTED_YEARLY] })])
const NO_CALENDAR = (): Document => documentOf({ calendarUid: null }, [])
// WHY: two non-base calendars and no pointer, so FR-054 falls through to the default.
const ONLY_NON_BASE = (pointer: number | null): Document =>
  documentOf({ calendarUid: pointer }, [
    calendarOf({ uid: 5, ordinal: 3, isBaseCalendar: false }),
    calendarOf({ uid: 6, ordinal: 7, isBaseCalendar: false }),
  ])

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

const setCalendar = (part: Record<string, unknown>): DocumentCommand => ({ kind: 'setCalendar', ...part }) as unknown as DocumentCommand

const edited = (document: Document, part: Record<string, unknown>): Document => {
  const result = editDocument(document, setCalendar(part), LIMITS, 'row')
  if (!result.ok) throw new Error(`CM-39 was refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

const calendarWithUid = (document: Document, uid: number): Calendar | undefined =>
  document.schedule.calendars.find((one) => one.uid === uid)

const workingOf = (calendar: Calendar | undefined): readonly number[] =>
  (calendar?.weekDays ?? [])
    .filter((one) => one.dayWorking === true)
    .map((one) => one.dayType as number)
    .sort((a, b) => a - b)

const exceptionsOf = (calendar: Calendar | undefined): readonly unknown[] =>
  (calendar as unknown as { exceptions?: readonly unknown[] } | undefined)?.exceptions ?? []

const projectOf = (document: Document): { calendarUid: number | null; uidHighWaterMark: number; weekStartDay: number | null } =>
  document.schedule.project as unknown as { calendarUid: number | null; uidHighWaterMark: number; weekStartDay: number | null }

const CALM = { gestureInFlight: false, editingInPlace: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }

interface Bench {
  readonly held: () => HeldDocument
  readonly write: (command: DocumentCommand) => void
}

const benchOf = (document: Document): Bench => {
  let held: HeldDocument = { document, history: { done: [], undone: [] } } as unknown as HeldDocument
  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      held = next
    },
  }
  const audience: ChangeAudience = { deliver: () => {} }
  return {
    held: () => held,
    write: (command) => {
      applyDocumentChange(
        {
          defaultTaskGroupName: 'row',
          readStamp: held.document.documentStamp,
          commands: [command],
          moment: CALM,
          historyLimits: HISTORY_LIMITS,
          settingsLimits: LIMITS,
          editedBy: 'user',
          updatedUtc: '2026-10-01T01:00:00Z',
        } as never,
        holder,
        audience,
      )
    },
  }
}

const doneOf = (held: HeldDocument): readonly ChangeStep[] =>
  (held.history as unknown as { done: readonly ChangeStep[] }).done

describe('CR-605 -- the clauses these cases rest on still stand', () => {
  it('FR-088 still holds the made Calendar, its uid and the exception rows', () => {
    for (const one of [FR_088_MAKE, FR_088_UID, FR_088_EXCEPTIONS, FR_088_DAY_WORKING, FR_088_RECURRING_DELETE, FR_088_UNDO]) {
      expect(REQUIREMENTS).toContain(one)
    }
    expect(REQUIREMENTS).toContain(FR_054_RESOLVE)
  })

  it('T-108 CM-39, AT-67, AT-20, T-344 WC-7 and T-209 S-106 / S-107 still say what the cases use', () => {
    expect(rowOf('T-108', 'CM-39').by['何を担うか'] ?? '').toContain(CM_39_DOES)
    expect(ERD).toContain(AT_67_NEXT)
    expect(ERD).toContain(AT_20_MAX)
    expect(rowOf('T-344', 'WC-7').by['定め'] ?? '').toContain(WC_7_NO_WRITE)
    expect(rowOf('T-209', 'S-106').by['値'] ?? '').toContain(S_106_CELL)
    expect(rowOf('T-209', 'S-107').by['値'] ?? '').toContain(S_107_CELL)
  })
})

describe('CM-39 carries the exception list (FR-088)', () => {
  it(`「${FR_088_EXCEPTIONS}」 the list the command carries becomes the calendar's list`, () => {
    const list = [SHUTDOWN, WORKED_SATURDAY, IMPORTED_YEARLY]
    const after = edited(POINTED(), { exceptions: list })
    expect(exceptionsOf(calendarWithUid(after, 1))).toEqual(list)
    expect(after.schedule.calendars, 'no calendar is made when one is pointed at').toHaveLength(1)
    expect(projectOf(after).uidHighWaterMark, 'no uid is spent').toBe(HIGH_WATER)
  })

  it(`「${FR_088_DAY_WORKING}」 a working row and an off row both land as written`, () => {
    const after = edited(POINTED(), { exceptions: [SHUTDOWN, WORKED_SATURDAY] })
    const rows = exceptionsOf(calendarWithUid(after, 1)) as readonly ExceptionRow[]
    expect(rows.map((one) => one.dayWorking)).toEqual([false, true])
  })

  it(`「${FR_088_RECURRING_DELETE}」 a list without the imported recurring row deletes it`, () => {
    const after = edited(POINTED(), { exceptions: [SHUTDOWN] })
    expect(exceptionsOf(calendarWithUid(after, 1))).toEqual([SHUTDOWN])
  })

  it('an empty list empties the calendar of exceptions', () => {
    const after = edited(POINTED(), { exceptions: [] })
    expect(exceptionsOf(calendarWithUid(after, 1))).toEqual([])
  })

  it('a command without exceptions leaves the list as it is while the weekdays move', () => {
    const after = edited(POINTED(), { workingDayTypes: [2, 3, 4, 5, 6, 7] })
    expect(workingOf(calendarWithUid(after, 1))).toEqual([2, 3, 4, 5, 6, 7])
    expect(exceptionsOf(calendarWithUid(after, 1))).toEqual([IMPORTED_YEARLY])
  })

  it('weekdays, week start and exceptions land in ONE document from ONE command', () => {
    const after = edited(POINTED(), { workingDayTypes: [2, 3, 4], weekStartDay: 0, exceptions: [SHUTDOWN] })
    expect(workingOf(calendarWithUid(after, 1))).toEqual([2, 3, 4])
    expect(projectOf(after).weekStartDay).toBe(0)
    expect(exceptionsOf(calendarWithUid(after, 1))).toEqual([SHUTDOWN])
  })
})

describe('CM-39 makes a Calendar when the document calendar resolves to the T-209 default (FR-088, FR-054)', () => {
  it(`「${FR_088_MAKE}」 a document with no calendar gets one, pointed at, holding the weekdays and exceptions`, () => {
    const after = edited(NO_CALENDAR(), { workingDayTypes: [2, 3, 4, 5, 6, 7], exceptions: [SHUTDOWN] })
    expect(after.schedule.calendars, 'one Calendar is made').toHaveLength(1)
    const made = after.schedule.calendars[0] as Calendar
    expect(projectOf(after).calendarUid, 'Project.calendarUid points at it').toBe(made.uid)
    expect(workingOf(made)).toEqual([2, 3, 4, 5, 6, 7])
    expect(exceptionsOf(made)).toEqual([SHUTDOWN])
  })

  it(`「${FR_088_UID}」 uid = uidHighWaterMark + 1, the mark moves to it, isBaseCalendar is true`, () => {
    const after = edited(NO_CALENDAR(), { exceptions: [SHUTDOWN] })
    const made = after.schedule.calendars[0] as Calendar
    expect(made.uid).toBe(HIGH_WATER + 1)
    expect(projectOf(after).uidHighWaterMark).toBe(HIGH_WATER + 1)
    expect(made.isBaseCalendar).toBe(true)
  })

  it(`「${AT_67_NEXT}」 with no calendar at all the made one takes ordinal 0`, () => {
    const made = edited(NO_CALENDAR(), { exceptions: [SHUTDOWN] }).schedule.calendars[0] as Calendar
    expect(made.ordinal).toBe(0)
  })

  for (const pointer of [null, 999] as const) {
    it(`「${FR_054_RESOLVE}」 pointer ${pointer} and only non-base calendars: one is made at ordinal max + 1`, () => {
      const before = ONLY_NON_BASE(pointer)
      const after = edited(before, { exceptions: [SHUTDOWN] })
      expect(after.schedule.calendars).toHaveLength(3)
      const made = calendarWithUid(after, HIGH_WATER + 1)
      expect(made, 'the made calendar carries uid high water + 1').toBeDefined()
      expect((made as Calendar).ordinal, `${AT_67_NEXT}`).toBe(8)
      expect((made as Calendar).isBaseCalendar).toBe(true)
      expect(projectOf(after).calendarUid).toBe(HIGH_WATER + 1)
      expect(exceptionsOf(made)).toEqual([SHUTDOWN])
      for (const uid of [5, 6]) expect(calendarWithUid(after, uid), `calendar ${uid} untouched`).toEqual(calendarWithUid(before, uid))
    })
  }

  it('the made calendar starts from S-106 when the command carries no weekdays', () => {
    const made = edited(NO_CALENDAR(), { exceptions: [SHUTDOWN] }).schedule.calendars[0] as Calendar
    expect(workingOf(made)).toEqual(S_106_WORKING)
  })

  it('control: a pointed calendar is edited in place and nothing is made', () => {
    const after = edited(POINTED(), { exceptions: [SHUTDOWN] })
    expect(after.schedule.calendars.map((one) => one.uid)).toEqual([1])
    expect(projectOf(after).calendarUid).toBe(1)
  })
})

describe('a command that changes nothing writes nothing (WC-7, FR-031)', () => {
  it(`「${WC_7_NO_WRITE}」 the same list on a pointed calendar returns the same document`, () => {
    const before = POINTED()
    const result = editDocument(before, setCalendar({ exceptions: [IMPORTED_YEARLY] }), LIMITS, 'row')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.document, 'the same document, not an equal one').toBe(before)
  })

  it(`「${WC_7_NO_WRITE}」 S-106 and no exceptions on a default document make no Calendar`, () => {
    const before = NO_CALENDAR()
    const result = editDocument(before, setCalendar({ workingDayTypes: S_106_WORKING, exceptions: [] }), LIMITS, 'row')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document, 'the same document').toBe(before)
    expect(result.document.schedule.calendars).toEqual([])
    expect(projectOf(result.document).uidHighWaterMark).toBe(HIGH_WATER)
  })

  it(`「${WC_7_NO_WRITE}」 through the write path the unchanged command leaves no undo step`, () => {
    const bench = benchOf(NO_CALENDAR())
    bench.write(setCalendar({ workingDayTypes: S_106_WORKING, exceptions: [] }))
    expect(doneOf(bench.held())).toHaveLength(0)
    expect(bench.held().document.schedule.calendars).toEqual([])
  })
})

describe('undo takes the made Calendar back in one step (FR-088, UN-13)', () => {
  it(`「${FR_088_UNDO}」 one write, one step; one undo restores no calendar, no pointer and the old high water`, () => {
    const bench = benchOf(NO_CALENDAR())
    bench.write(setCalendar({ workingDayTypes: [2, 3, 4], exceptions: [SHUTDOWN] }))
    const held = bench.held()
    expect(held.document.schedule.calendars, 'premise: the write made a calendar').toHaveLength(1)
    expect(doneOf(held), 'ONE step for the one command').toHaveLength(1)
    const undone = undoEdit({ document: held.document, history: held.history } as never) as unknown as {
      undone: boolean
      next: HeldDocument
    }
    expect(undone.undone).toBe(true)
    expect(undone.next.document.schedule.calendars).toEqual([])
    expect(projectOf(undone.next.document).calendarUid).toBeNull()
    expect(projectOf(undone.next.document).uidHighWaterMark).toBe(HIGH_WATER)
    expect(doneOf(undone.next), 'nothing left to undo').toHaveLength(0)
  })

  it(`「${FR_088_UNDO}」 one undo puts back an exception list the write replaced`, () => {
    const bench = benchOf(POINTED())
    bench.write(setCalendar({ exceptions: [SHUTDOWN] }))
    const held = bench.held()
    expect(doneOf(held)).toHaveLength(1)
    const undone = undoEdit({ document: held.document, history: held.history } as never) as unknown as { next: HeldDocument }
    expect(exceptionsOf(calendarWithUid(undone.next.document, 1))).toEqual([IMPORTED_YEARLY])
  })
})
