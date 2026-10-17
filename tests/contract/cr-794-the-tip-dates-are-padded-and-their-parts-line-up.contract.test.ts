// CR-794 (table T-348 TL-10 / TL-13, TX-2): the task tip writes yyyy/mm/dd and lines up each part of its days.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { ScreenView, ScreenViewReadings, Tooltip, TooltipRow } from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { keepTooltipsInside, tooltipElement } from '../../src/framework/dom-screen-surface/tooltips-drawing'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { stage, styleMap, type FakeElement } from '../fixtures/fake-browser'
import { scheduleOf, taskOf } from '../unit/cr-430-cross-section-scene'
import { unbroken } from './spec-table'

type Language = 'ja' | 'en'
type Labeled = Extract<TooltipRow, { kind: 'labeled' }>

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const TL_10_PADDED = '年（西暦の 4 桁）、`/`、月、`/`、日 の順とし、月と日は 2 桁に 0 で埋めること（MUST）'
const TL_10_NOT_THE_NAME_LABEL = '⚠️ 名称ラベルの日（表 T-251 の `ND-4`・`ND-5`）とは違う形である'
const TX_2_FORM = '時も 2 桁に 0 で埋める（例: `2026/06/03 (月) 09:00`）'
const TL_13_PARTS =
  '⭐ 日を書く行（`TL-5`・`TL-6`・`TL-9`）の値は、さらに部分（始めの日・その曜日・その時刻・`-`・終わりの日・その曜日・その時刻）ごとに列に置き、同じ部分は行をまたいで同じ位置から書くこと（MUST）'

const SETTINGS = SETTINGS_DEFAULTS as unknown as DocumentSettings
const TIME_SHOWN = { ...SETTINGS_DEFAULTS, isTimeOfDayVisible: true, viewTimeZone: null } as unknown as DocumentSettings
const THE_UID = 3

type Weekday = 'Thu' | 'Fri' | 'Sat'
const WEEKDAY: Readonly<Record<Language, Readonly<Record<Weekday, string>>>> = {
  ja: { Thu: '木', Fri: '金', Sat: '土' },
  en: { Thu: 'Thu', Fri: 'Fri', Sat: 'Sat' },
}
// WHY: 2026-04-23 and 2026-07-16 are Thursdays, 2026-04-24 and 2026-05-01 Fridays, 2026-04-25 a Saturday.
const dayName = (language: Language, name: Weekday): string => ` (${WEEKDAY[language][name]})`

const sessionIn = (language: Language): ScreenSession => ({
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: language, helpLanguage: language },
})

const readings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: { x: 500, y: 300 },
  pointerRestedMs: SETTINGS_CONSTANTS.taskHintDelayMs,
  hintTargetDwellMs: SETTINGS_CONSTANTS.taskHintDelayMs,
  hintHolderUnderPointer: { kind: 'task', taskUid: THE_UID },
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
} as unknown as ScreenViewReadings

const tipOf = (task: Readonly<Record<string, unknown>>, language: Language, settings: DocumentSettings = SETTINGS): Tooltip => {
  const shown = { frame: { scrollbars: [] } } as unknown as Omit<ScreenView, 'tooltips'>
  const schedule: Schedule = scheduleOf({ tasks: [taskOf({ uid: THE_UID, name: 'a named task', ...task })] })
  const tip = tooltipsFromScreenView(shown, settings, sessionIn(language), readings, schedule).find(
    (one) => one.anchor.kind === 'task',
  )
  if (tip === undefined) throw new Error('no task tooltip was raised')
  return tip
}

const labeledOf = (tip: Tooltip, label: string): Labeled => {
  const found = (tip.rows ?? []).find((one): one is Labeled => one.kind === 'labeled' && one.label === label)
  if (found === undefined) throw new Error(`no labelled row ${label}`)
  return found
}

const RANGE = { start: '2026-04-23T00:00:00', finish: '2026-07-16T00:00:00' }
const RANGE_WITH_TIME = { start: '2026-04-23T09:00:00', finish: '2026-07-16T18:00:00' }

describe('CR-794 -- the manuscript these cases are driven by', () => {
  it.each([TL_10_PADDED, TL_10_NOT_THE_NAME_LABEL, TX_2_FORM, TL_13_PARTS])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(unbroken(clause))
  })
})

describe('CR-794 TL-10 -- the tip day is yyyy/mm/dd with the year always written', () => {
  for (const language of ['ja', 'en'] as const) {
    const plan = language === 'ja' ? '予定:' : 'Plan:'
    const deadline = language === 'ja' ? '期限:' : 'Deadline:'

    it(`TL-10 「${TL_10_PADDED}」: a one-digit month and day are padded, the year is written in a one-year document (${language})`, () => {
      const tip = tipOf({ start: '2026-04-03T00:00:00', finish: '2026-04-09T00:00:00' }, language)
      expect(labeledOf(tip, plan).value).toBe(`2026/04/03${dayName(language, 'Fri')} - 2026/04/09${dayName(language, 'Thu')}`)
    })

    it(`TL-10: a month and day of two digits stay as they are (${language})`, () => {
      expect(labeledOf(tipOf(RANGE, language), plan).value).toBe(
        `2026/04/23${dayName(language, 'Thu')} - 2026/07/16${dayName(language, 'Thu')}`,
      )
    })

    it(`TL-9 / TL-10: the deadline day inside the tip is padded as well (${language})`, () => {
      expect(labeledOf(tipOf({ ...RANGE, deadline: '2026-05-01T00:00:00' }, language), deadline).value).toBe(
        `2026/05/01${dayName(language, 'Fri')}`,
      )
    })
  }

  it('TX-2: with the time of day shown the day reads yyyy/mm/dd (weekday) hh:mm, the hour padded (09:00)', () => {
    expect(labeledOf(tipOf(RANGE_WITH_TIME, 'en', TIME_SHOWN), 'Plan:').value).toBe(
      '2026/04/23 (Thu) 09:00 - 2026/07/16 (Thu) 18:00',
    )
    expect(labeledOf(tipOf(RANGE_WITH_TIME, 'ja', TIME_SHOWN), '予定:').value).toBe(
      '2026/04/23 (木) 09:00 - 2026/07/16 (木) 18:00',
    )
  })

  it('TX-2: with the time of day hidden no clock is written', () => {
    expect(labeledOf(tipOf(RANGE_WITH_TIME, 'en'), 'Plan:').value).toBe('2026/04/23 (Thu) - 2026/07/16 (Thu)')
  })
})

describe('CR-794 TL-13 -- Tooltip.rows parts: their join is the value, the value is the text line', () => {
  const FULL = {
    ...RANGE,
    actualStart: '2026-04-24T00:00:00',
    percentComplete: 40,
    deadline: '2026-05-01T00:00:00',
  }

  for (const language of ['ja', 'en'] as const) {
    it(`every labelled row with parts joins to its value, and "<label> <value>" is the tip.text line (${language})`, () => {
      const tip = tipOf(FULL, language)
      const lines = tip.text.split('\n')
      const withParts = (tip.rows ?? []).filter((one): one is Labeled => one.kind === 'labeled' && one.parts !== undefined)
      expect(withParts.length, 'plan, actual and deadline carry parts').toBe(3)
      for (const row of withParts) {
        expect((row.parts ?? []).join(''), row.label).toBe(row.value)
        expect(lines, row.label).toContain(`${row.label} ${row.value}`)
      }
    })
  }

  it('a range: start date, its weekday, " -", end date, its weekday', () => {
    expect(labeledOf(tipOf(RANGE, 'en'), 'Plan:').parts).toEqual(['2026/04/23', ' (Thu)', ' -', ' 2026/07/16', ' (Thu)'])
    expect(labeledOf(tipOf(RANGE, 'ja'), '予定:').parts).toEqual(['2026/04/23', ' (木)', ' -', ' 2026/07/16', ' (木)'])
  })

  it('a range with the time shown: each day carries its clock part after the weekday', () => {
    expect(labeledOf(tipOf(RANGE_WITH_TIME, 'en', TIME_SHOWN), 'Plan:').parts).toEqual([
      '2026/04/23',
      ' (Thu)',
      ' 09:00',
      ' -',
      ' 2026/07/16',
      ' (Thu)',
      ' 18:00',
    ])
  })

  it('a milestone: its one date and weekday only', () => {
    const milestone = {
      milestone: true,
      start: '2026-04-23T00:00:00',
      finish: '2026-04-23T00:00:00',
      actualStart: '2026-04-24T00:00:00',
      percentComplete: 100,
    }
    const tip = tipOf(milestone, 'en')
    expect(labeledOf(tip, 'Plan:').parts).toEqual(['2026/04/23', ' (Thu)'])
    expect(labeledOf(tip, 'Actual:').parts).toEqual(['2026/04/24', ' (Fri)'])
  })

  it('an actual that has not finished stops at " -"', () => {
    expect(labeledOf(tipOf(FULL, 'en'), 'Actual:').parts).toEqual(['2026/04/24', ' (Fri)', ' -'])
  })

  it('an actual that has finished has both days', () => {
    const tip = tipOf({ ...FULL, actualFinish: '2026-04-25T00:00:00', percentComplete: 100 }, 'en')
    expect(labeledOf(tip, 'Actual:').parts).toEqual(['2026/04/24', ' (Fri)', ' -', ' 2026/04/25', ' (Sat)'])
  })

  it('the deadline line: its day parts only (date, weekday), and the clock when the time is shown', () => {
    expect(labeledOf(tipOf(FULL, 'en'), 'Deadline:').parts).toEqual(['2026/05/01', ' (Fri)'])
    const timed = tipOf({ ...RANGE_WITH_TIME, deadline: '2026-05-01T17:00:00' }, 'en', TIME_SHOWN)
    expect(labeledOf(timed, 'Deadline:').parts).toEqual(['2026/05/01', ' (Fri)', ' 17:00'])
  })
})

describe('CR-794 TL-13 -- tooltipElement and keepTooltipsInside line the same part up across lines', () => {
  const WITH_ACTUAL = {
    ...RANGE_WITH_TIME,
    actualStart: '2026-04-24T09:00:00',
    percentComplete: 40,
    deadline: '2026-05-01T17:00:00',
  }

  const lineBoxes = (root: FakeElement): FakeElement[][] =>
    (root.children as FakeElement[])
      .map((line) => (line.children as FakeElement[])[1])
      .filter((value): value is FakeElement => value !== undefined && value.children.length > 0)
      .map((value) => value.children as FakeElement[])

  it('each part of a day line is its own box inside the value, in order', () => {
    const tip = tipOf(WITH_ACTUAL, 'en', TIME_SHOWN)
    const built = stage()
    const root = tooltipElement(built.host, tip, () => undefined) as unknown as FakeElement
    const drawnParts = lineBoxes(root).map((boxes) => boxes.map((box) => box.textContent))
    const wanted = (tip.rows ?? [])
      .filter((one): one is Labeled => one.kind === 'labeled' && one.parts !== undefined)
      .map((one) => one.parts)
    expect(drawnParts).toEqual(wanted)
  })

  it('after keepTooltipsInside the boxes of one index get one width (the widest of that index), every line alike', () => {
    const tip = tipOf(WITH_ACTUAL, 'en', TIME_SHOWN)
    const built = stage()
    const root = tooltipElement(built.host, tip, () => undefined) as unknown as FakeElement
    const layer = built.host.createElement('div') as unknown as FakeElement
    layer.append(root)
    const lines = lineBoxes(root)
    expect(lines.length, 'plan, actual and deadline').toBe(3)
    const widthOf = (line: number, index: number): number => 20 + 8 * ((line * 3 + index * 5) % 7) + 6 * index
    lines.forEach((boxes, line) => {
      boxes.forEach((box, index) => {
        const width = widthOf(line, index)
        ;(box as unknown as { getBoundingClientRect: () => unknown }).getBoundingClientRect = () => ({
          x: 0,
          y: 0,
          width,
          height: 10,
          top: 0,
          left: 0,
          right: width,
          bottom: 10,
        })
      })
    })
    keepTooltipsInside(layer as unknown as HTMLElement)
    const longest = Math.max(...lines.map((boxes) => boxes.length))
    for (let index = 0; index < longest; index += 1) {
      const wanted = Math.max(...lines.flatMap((boxes, line) => (boxes[index] === undefined ? [] : [widthOf(line, index)])))
      lines.forEach((boxes) => {
        const box = boxes[index]
        if (box !== undefined) expect(styleMap(box).get('width'), `part ${index}`).toBe(`${wanted}px`)
      })
    }
    const firstWidths = new Set(lines.map((boxes) => styleMap(boxes[0] as FakeElement).get('width')))
    expect(firstWidths.size, 'the start date has one width on every line, the deadline included').toBe(1)
  })
})
