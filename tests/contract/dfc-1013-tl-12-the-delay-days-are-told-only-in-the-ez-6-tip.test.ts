// DFC-1013 spec-only cases: FR-047 / T-348 TL-12 / T-038 OC-8 -- the days a Task is late are told only in the EZ-6 tip, as one line "<DG-4 word>: <days> <workingDaysUnit word>" (CR-793), counted as DX-10 counts them; the picture holds no such days.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenView, ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import { SETTINGS_CONSTANTS, SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { diagnoseDelay, workingCalendarOf, type Schedule } from '../../src/entity/document-model/schedule/schedule'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { day, scheduleOf, taskOf } from '../unit/cr-430-cross-section-scene'
import { SCREEN } from '../unit/cr-541-stage'
import { unbroken } from './spec-table'

type Language = 'ja' | 'en'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const FR_047_ONLY_IN_THE_TIP = '⛔ 遅れの日数を日程表に描いてはならない（MUST NOT）'
const TL_12_NO_NEW_WORD = '⛔ 遅れの行のために新しい語を辞書に持ってはならない（MUST NOT）'
// WHY: CR-793 -- the late line is the DG-4 word, a colon, the days and the working-days word.
const TL_12_THE_FORM = '遅れの語、`:`、半角空白 1 つ、日数、半角空白 1 つ、稼働日の語 の順に、1 行で書くこと（MUST）'
const TL_12_SAME_COUNT = '日数は、遅延診断の `DX-10` と同じ数え方で求めること（MUST）'
const TL_12_NO_STATUS_DATE = '基準日が置かれていないとき（`FR-046`）と、遅れていないときは行を出さない'
const OC_8_NOT_COUNTED = '**算入してはならない（MUST NOT）**'

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly delayReportReasons: readonly { readonly part: string; readonly text: Record<Language, string> }[]
  readonly delayReportStatuses: readonly { readonly rowId: string; readonly text: Record<Language, string> }[]
  readonly propertyField: readonly { readonly part: string; readonly text: Record<Language, string> }[]
}
// see DG-4
const lateSentence = (days: number, language: Language): string => {
  const late = WORDS.delayReportStatuses.find((one) => one.rowId === 'DG-4')?.text[language]
  const unit = WORDS.propertyField.find((one) => one.part === 'workingDaysUnit')?.text[language]
  if (late === undefined || unit === undefined) throw new Error('the dictionary holds no DG-4 word or workingDaysUnit')
  return `${late}: ${days} ${unit}`
}
// WHY: the pre-CR-793 sentence of the delay report; the tip no longer tells it.
const reportSentence = (days: number, language: Language): string => {
  const found = WORDS.delayReportReasons.find((one) => one.part === 'late')
  if (found === undefined) throw new Error('the dictionary holds no late sentence of the delay report')
  return found.text[language].replace('{days}', String(days))
}

const SETTINGS = SETTINGS_DEFAULTS as unknown as DocumentSettings
const STATUS_DATE = day(10)
const NOT_STARTED_LATE = 1
const IN_PROGRESS_LATE = 2
const ON_TIME = 3
const FINISHED = 4

const tasks = () => [
  taskOf({ uid: NOT_STARTED_LATE, name: 'not started', start: day(2), finish: day(4), milestone: false, percentComplete: 0 }),
  taskOf({ uid: IN_PROGRESS_LATE, name: 'in progress', start: day(1), finish: day(3), milestone: false, actualStart: day(1), percentComplete: 50 }),
  taskOf({ uid: ON_TIME, name: 'on time', start: day(12), finish: day(15), milestone: false, percentComplete: 0 }),
  taskOf({
    uid: FINISHED,
    name: 'finished',
    start: day(1),
    finish: day(3),
    milestone: false,
    actualStart: day(1),
    actualFinish: day(3),
    percentComplete: 100,
  }),
]

const scheduleWith = (statusDate: string | null): Schedule => scheduleOf({ tasks: tasks(), statusDate })

// see DX-10
const diagnosedDaysOf = (schedule: Schedule, uid: number): number | undefined =>
  diagnoseDelay({ schedule }, workingCalendarOf(schedule)).lateDays.find((one) => one.uid === uid)?.days

const sessionIn = (language: Language): ScreenSession => ({
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: language, helpLanguage: language },
})

const readingsOn = (taskUid: number): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer: { x: 500, y: 300 },
    pointerRestedMs: SETTINGS_CONSTANTS.taskHintDelayMs,
    hintTargetDwellMs: SETTINGS_CONSTANTS.taskHintDelayMs,
    hintHolderUnderPointer: { kind: 'task', taskUid },
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: 'light',
    themeHue: 214,
    selectedTaskGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }) as unknown as ScreenViewReadings

// see EZ-6, TL-12
function tipLinesOf(schedule: Schedule, uid: number, language: Language): readonly string[] {
  const shown = { frame: { scrollbars: [] } } as unknown as Omit<ScreenView, 'tooltips'>
  const tip = tooltipsFromScreenView(shown, SETTINGS, sessionIn(language), readingsOn(uid), schedule).find(
    (one) => one.anchor.kind === 'task',
  )
  if (tip === undefined) throw new Error('no task tooltip was raised')
  return tip.text.split('\n')
}

const lateLines = (lines: readonly string[], days: number, language: Language): readonly string[] =>
  lines.filter((one) => one === lateSentence(days, language))

describe('DFC-1013 -- the manuscript these cases are driven by', () => {
  it.each([FR_047_ONLY_IN_THE_TIP, TL_12_NO_NEW_WORD, TL_12_THE_FORM, TL_12_SAME_COUNT, TL_12_NO_STATUS_DATE, OC_8_NOT_COUNTED])(
    '01-04 still says: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )
})

describe('DFC-1013 -- TL-12 the tip of a late Task', () => {
  it('premise: both late Tasks are late by DX-10 and the other two are not', () => {
    const schedule = scheduleWith(STATUS_DATE)
    expect(diagnosedDaysOf(schedule, NOT_STARTED_LATE), 'DL-2').toBeGreaterThan(0)
    expect(diagnosedDaysOf(schedule, IN_PROGRESS_LATE), 'DL-1').toBeGreaterThan(0)
    expect(diagnosedDaysOf(schedule, ON_TIME)).toBeUndefined()
    expect(diagnosedDaysOf(schedule, FINISHED)).toBeUndefined()
  })

  it.each([
    [NOT_STARTED_LATE, 'ja'],
    [NOT_STARTED_LATE, 'en'],
    [IN_PROGRESS_LATE, 'ja'],
    [IN_PROGRESS_LATE, 'en'],
  ] as const)('a late Task (%s) says its days once, as DG-4 word, days and working-days word, as DX-10 counts them (%s)', (uid, language) => {
    const schedule = scheduleWith(STATUS_DATE)
    const days = diagnosedDaysOf(schedule, uid) ?? 0
    const lines = tipLinesOf(schedule, uid, language)
    expect(lateLines(lines, days, language)).toHaveLength(1)
    expect(lines.some((one) => one.includes(reportSentence(days, language))), 'not the delay report sentence').toBe(false)
  })

  it('the late line is its own line (one line, TL-12)', () => {
    const schedule = scheduleWith(STATUS_DATE)
    const days = diagnosedDaysOf(schedule, IN_PROGRESS_LATE) ?? 0
    const lines = tipLinesOf(schedule, IN_PROGRESS_LATE, 'ja')
    expect(lines).toContain(lateSentence(days, 'ja'))
    expect(lines[lines.length - 1], 'TL-1: the late line comes after the deadline line, last').toBe(lateSentence(days, 'ja'))
  })

  it('the late line reads like 遅れ: N 稼働日 / Late: N working days', () => {
    const schedule = scheduleWith(STATUS_DATE)
    const days = diagnosedDaysOf(schedule, IN_PROGRESS_LATE) ?? 0
    expect(lateSentence(days, 'ja')).toBe(`遅れ: ${days} 稼働日`)
    expect(lateSentence(days, 'en')).toBe(`Late: ${days} working days`)
  })

  it('a Task that is not late has no late line', () => {
    const schedule = scheduleWith(STATUS_DATE)
    for (const uid of [ON_TIME, FINISHED]) {
      const lines = tipLinesOf(schedule, uid, 'ja')
      expect(lines.some((one) => one.startsWith('遅れ: ')), String(uid)).toBe(false)
    }
  })

  it('with no status date the tip has no late line', () => {
    const schedule = scheduleWith(null)
    for (const uid of [NOT_STARTED_LATE, IN_PROGRESS_LATE]) {
      expect(tipLinesOf(schedule, uid, 'ja').some((one) => one.startsWith('遅れ: ')), String(uid)).toBe(false)
    }
  })
})

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
afterEach(() => {
  const scope = globalThis as { requestAnimationFrame?: unknown }
  if (realRaf === undefined) delete scope.requestAnimationFrame
  else scope.requestAnimationFrame = realRaf
})

describe('DFC-1013 -- FR-047 (MUST NOT) the picture holds no days of delay', () => {
  it('the drawn schedule carries the late sentence of no late Task, in either language', () => {
    const waiting: ((time: number) => void)[] = []
    ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (callback: (time: number) => void): number => {
      waiting.push(callback)
      return waiting.length
    }
    const schedule = scheduleWith(STATUS_DATE)
    const pictures: string[] = []
    const surface = {
      showScreenView: () => undefined,
      readFieldCommit: () => null,
      readScreenPartAt: () => null,
    }
    const document = {
      ...JSON.parse(readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8')),
    } as Record<string, unknown>
    const withTasks = { ...document, schedule: { ...(document['schedule'] as object), ...schedule } }
    frameLoop({ showSvg: (svg: string) => pictures.push(svg) } as never, withTasks as never, SCREEN, {
      surface: surface as never,
      language: 'ja',
    })
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
    expect(pictures.length, 'precondition: a picture was drawn').toBeGreaterThan(0)
    const picture = pictures[pictures.length - 1] ?? ''
    expect(picture, 'precondition: the late Task is in the picture').toContain('in progress')
    for (const uid of [NOT_STARTED_LATE, IN_PROGRESS_LATE]) {
      const days = diagnosedDaysOf(schedule, uid) ?? 0
      expect(picture).not.toContain(lateSentence(days, 'ja'))
      expect(picture).not.toContain(lateSentence(days, 'en'))
      expect(picture).not.toContain(reportSentence(days, 'ja'))
      expect(picture).not.toContain(reportSentence(days, 'en'))
    }
  })
})
