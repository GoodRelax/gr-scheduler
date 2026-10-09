// DFC-1338, DFC-1356: the task tooltip is name, plan, actual, assignees, percent, deadline, one line each, none left empty (EZ-6, T-348 TL-1..TL-11).

import { describe, expect, it } from 'vitest'

import type { ScreenView, ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import { SETTINGS_CONSTANTS, SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { scheduleOf, taskOf } from '../unit/cr-430-cross-section-scene'

const SETTINGS = SETTINGS_DEFAULTS as unknown as DocumentSettings

const sessionIn = (language: 'ja' | 'en'): ScreenSession => ({
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
    selectedGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }) as unknown as ScreenViewReadings

const WEEKDAYS: Readonly<Record<'ja' | 'en', readonly string[]>> = {
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}

// see TL-10, TL-11
const dayText = (iso: string, language: 'ja' | 'en', withYear = false): string => {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number) as [number, number, number]
  const weekday = WEEKDAYS[language][new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${withYear ? `${year}/` : ''}${month}/${day} (${weekday})`
}

interface Wish {
  readonly task: Readonly<Record<string, unknown>>
  readonly assignees?: readonly string[]
  readonly others?: readonly Readonly<Record<string, unknown>>[]
}

const linesOf = (wish: Wish, language: 'ja' | 'en' = 'ja'): readonly string[] => {
  const tasks = [taskOf({ uid: 1, ...wish.task }), ...(wish.others ?? []).map((one) => taskOf(one))]
  const base = scheduleOf({ tasks })
  const names = wish.assignees ?? []
  const schedule = {
    ...base,
    resources: names.map((name, index) => ({
      uid: 10 + index,
      name,
      resourceKind: 1,
      isCostResource: false,
      calendarUid: null,
      carry: {},
      carryElements: [],
    })),
    assignments: names.map((_name, index) => ({ uid: 100 + index, taskUid: 1, resourceUid: 10 + index, carry: {}, carryElements: [] })),
  } as unknown as Schedule
  const shown = { frame: { scrollbars: [] } } as unknown as Omit<ScreenView, 'tooltips'>
  const tip = tooltipsFromScreenView(shown, SETTINGS, sessionIn(language), readingsOn(1), schedule).find(
    (one) => one.anchor.kind === 'task',
  )
  if (tip === undefined) throw new Error('no task tooltip was raised')
  return tip.text.split('\n')
}

describe('DFC-1338: a started task tells its actual, its assignees and its percent (EZ-6, TL-6, TL-7, TL-8)', () => {
  const STARTED = {
    name: 'alpha',
    start: '2026-06-01T00:00:00',
    finish: '2026-06-05T00:00:00',
    actualStart: '2026-06-03T00:00:00',
    percentComplete: 50,
    deadline: '2026-06-09T00:00:00',
  }

  it('TL-1 the lines come in the order name, plan, actual, assignees, percent, deadline', () => {
    const lines = linesOf({ task: STARTED, assignees: ['Ada', 'Bob'] })
    expect(lines).toHaveLength(6)
    expect(lines[0]).toBe('alpha')
    expect(lines[1]).toBe(`予定: ${dayText('2026-06-01', 'ja')} - ${dayText('2026-06-05', 'ja')}`)
    expect(lines[2]?.startsWith('実績: ')).toBe(true)
    expect(lines[3]?.startsWith('担当: ')).toBe(true)
    expect(lines[4]?.startsWith('進捗: ')).toBe(true)
    expect(lines[5]).toContain(dayText('2026-06-09', 'ja'))
  })

  it('TL-6 an actual that has not finished writes the start day, a space, a hyphen and stops', () => {
    expect(linesOf({ task: STARTED })[2]).toBe(`実績: ${dayText('2026-06-03', 'ja')} -`)
  })

  it('TL-6 an actual that has finished writes both days', () => {
    const lines = linesOf({ task: { ...STARTED, actualFinish: '2026-06-04T00:00:00', percentComplete: 100 } })
    expect(lines[2]).toBe(`実績: ${dayText('2026-06-03', 'ja')} - ${dayText('2026-06-04', 'ja')}`)
  })

  it('TL-6 an unfinished task never gets its stop day written as an end day', () => {
    const lines = linesOf({ task: { ...STARTED, stop: '2026-06-04T00:00:00' } })
    expect(lines[2]).not.toContain(dayText('2026-06-04', 'ja'))
  })

  it('TL-7 the assignees are one line, in name order, joined by a comma and a space', () => {
    const lines = linesOf({ task: STARTED, assignees: ['Bob', 'Ada'] })
    expect(lines).toContain('担当: Ada, Bob')
  })

  it('TL-7 a task with nobody assigned has no assignee line and leaves no gap', () => {
    const lines = linesOf({ task: STARTED })
    expect(lines.some((one) => one.startsWith('担当'))).toBe(false)
    expect(lines.every((one) => one.trim() !== '')).toBe(true)
  })

  it('TL-8 the percent is the whole number and a percent sign, not rounded', () => {
    expect(linesOf({ task: STARTED })).toContain('進捗: 50%')
  })

  it('TL-8 a started task at 0 percent still tells 0%', () => {
    expect(linesOf({ task: { ...STARTED, percentComplete: 0 } })).toContain('進捗: 0%')
  })

  it('TL-8 an empty percent gives no percent line', () => {
    expect(linesOf({ task: { ...STARTED, percentComplete: null } }).some((one) => one.startsWith('進捗'))).toBe(false)
  })

  it('TL-6 / TL-8 a task not started tells neither actual nor percent', () => {
    const lines = linesOf({ task: { ...STARTED, actualStart: null, percentComplete: 30 } })
    expect(lines.some((one) => one.startsWith('実績'))).toBe(false)
    expect(lines.some((one) => one.startsWith('進捗'))).toBe(false)
  })

  it('TL-11 the weekday word follows the screen language', () => {
    const lines = linesOf({ task: STARTED }, 'en')
    expect(lines[1]).toContain(`(${WEEKDAYS.en[new Date(Date.UTC(2026, 5, 1)).getUTCDay()]})`)
  })

  it('TL-10 / ND-5 a document across two calendar years writes the year on every day', () => {
    const lines = linesOf({
      task: STARTED,
      others: [{ uid: 2, name: 'later', start: '2027-01-04T00:00:00', finish: '2027-01-08T00:00:00' }],
    })
    expect(lines[1]).toBe(`予定: ${dayText('2026-06-01', 'ja', true)} - ${dayText('2026-06-05', 'ja', true)}`)
    expect(lines[2]).toBe(`実績: ${dayText('2026-06-03', 'ja', true)} -`)
  })
})

describe('DFC-1356: a milestone tells one day for its plan and one for its actual (TL-5, TL-6)', () => {
  const MILESTONE = {
    name: 'gate',
    milestone: true,
    start: '2026-06-10T00:00:00',
    finish: '2026-06-10T00:00:00',
    actualStart: '2026-06-10T00:00:00',
    percentComplete: 100,
  }

  it('TL-5 the plan of a milestone is its start day alone', () => {
    expect(linesOf({ task: MILESTONE })[1]).toBe(`予定: ${dayText('2026-06-10', 'ja')}`)
  })

  it('TL-5 the plan of a milestone writes no hyphen and no second day', () => {
    expect(linesOf({ task: MILESTONE })[1]).not.toContain(' - ')
  })

  it('TL-6 the actual of a milestone is its actualStart day alone', () => {
    expect(linesOf({ task: MILESTONE })[2]).toBe(`実績: ${dayText('2026-06-10', 'ja')}`)
  })

  it('TL-6 an unstarted milestone has no actual line', () => {
    const lines = linesOf({ task: { ...MILESTONE, actualStart: null, percentComplete: null } })
    expect(lines.some((one) => one.startsWith('実績'))).toBe(false)
  })
})
