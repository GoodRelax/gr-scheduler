// CR-710 wave 2 (spec-only): FR-017 / TM-5 draws the hour ruler, the hour grid lines and the 30-minute dotted lines; OD-1 shades the hours outside the working time.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { instantOf } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule, xOfInstant, type ScheduleLayout } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { RATIO, SCREEN, cellOf, rowOf, scheduleOf, stored, taskOf } from '../unit/cr-430-cross-section-scene'
import { MONDAY_TO_FRIDAY_WITH_SPANS, calendarRowOf } from './cr-710-w1-stage'
import { bare, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-017, FR-089, OD-1, S-581
const CLAUSES = [
  '時刻を表示しているあいだ、日付罫線（`FR-089`）は、時の段では毎正時に実線で引き、1 日の幅が `_assets/tbl-settings.md` の 表 T-205 の `S-578` 以上のときは毎 30 分にも点線（刻みは 表 T-201 の `S-581`）を引くこと（MUST）',
  '⛔ 30 分の線を実線で引いてはならない（MUST NOT）',
  '線の色と太さは日付罫線（`U-17`）と同じとする。',
  '⭐ 時刻を表示し（`FR-158`）、目盛が時の段（`FR-017` の 表 T-238 の `TM-5`）にあるときは、稼働日の時間帯の外の時間も塗ること（MUST）',
  '`TM-5` の 1 行目は `TM-2` 〜 `TM-4` の年月の畳み方の例外であり、曜の語は 表 T-348 の `TL-11` と同じ辞書の語とする。',
  '⭐ `TM-5` は時刻を表示するとき（`FR-158`）だけ刷る —— 表示しないときは、どの倍率でも `TM-4` が最も細かい段である。',
  '**目盛の帯の高さは、目盛の段階が変わっても動かさないこと（MUST）。**',
  '間隔は、いま出ている段（`FR-017` の 表 T-238 の `TM-1` 年 ／ `TM-2` 月 ／ `TM-3` 週 ／ `TM-4` 日 ／ `TM-5` 時）が刷る行のうち、最も細かい行が刷る単位とすること（MUST）',
]

describe('the clauses these cases are built from still read as quoted', () => {
  it.each(CLAUSES)('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// see S-8, DS-1, FR-017, T-205
const PX_SCALE = ((SETTINGS_DEFAULTS['rulerFontSizePx'] as number) * RATIO) / stored('S-8')
const thresholdOf = (id: string): number => Number(bare(rowOf('T-205', id).by['既定'] ?? ''))
const S_577 = thresholdOf('S-577')
const S_578 = thresholdOf('S-578')
// see S-581
const S_581 = bare(cellOf('T-201', 'S-581', '既定値')).replace(/🔎/g, '').trim()

// WHY: widths clear of the boundaries: inside the day tier, inside the hour tier, and from the half-hour width on.
const DAY_TIER = S_577 / 2
const HOUR_TIER = (S_577 + S_578) / 2
const HALF_HOUR = S_578 * 1.25
// WHY: a day wide enough that the rest days of a Friday-first view start well inside the area.
const WIDE_DAY = S_578 * 2.1
// WHY: a day tier width at which one view holds a Monday and the weekend after it.
const NARROW_DAY = 150

const MONDAY = '2026-01-05'
const FRIDAY = '2026-01-09'

interface Frame {
  readonly svg: string
  readonly layout: ScheduleLayout
}

function frameOf(threshold: number, shows: boolean, grid = true, scrollDay = MONDAY): Frame {
  const settings = {
    ...SETTINGS_DEFAULTS,
    isDateGridLinesVisible: grid,
    zoomX: (threshold * PX_SCALE) / (SETTINGS_CONSTANTS.pxPerDayAt1x * RATIO),
    scrollDate: `${scrollDay}T00:00:00`,
    stackDirection: 'down',
    isTimeOfDayVisible: shows,
  } as unknown as DocumentSettings
  const base = scheduleOf({
    tasks: [taskOf({ uid: 1, name: 'a', start: `${MONDAY}T08:00:00`, finish: '2026-01-06T17:00:00' })],
  }) as unknown as Record<string, unknown>
  const schedule = {
    ...base,
    project: { ...(base['project'] as object), calendarUid: 1 },
    calendars: [calendarRowOf({ working: MONDAY_TO_FRIDAY_WITH_SPANS })],
  } as unknown as Schedule
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  const svg = svgFromSchedule(schedule, settings, layout, geometry, regions, emptySelection(), 'screen', {
    themePreference: 'light',
    guideCursorMode: 'none',
  } as never, null, WEEKDAY_WORDS)
  return { svg, layout }
}

// WHY: the renderer is handed the weekday words by position, Sunday first, the way the screen hands them.
const WEEKDAY_WORDS = ['日', '月', '火', '水', '木', '金', '土']

const at = (hhmm: string, day = MONDAY): number => instantOf(`${day}T${hhmm}:00`) as number

const elementOf = (svg: string, figure: string): string | null => {
  const found = new RegExp(`<[a-z]+ [^>]*data-figure="${figure}"[^>]*>`).exec(svg)
  return found === null ? null : found[0]
}

const attrOf = (element: string, name: string): string | null =>
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(element)?.[1] ?? null

const figuresOf = (svg: string, prefix: string): readonly string[] =>
  [...svg.matchAll(new RegExp(`data-figure="(${prefix}[^"]*)"`, 'g'))].map((one) => one[1] as string)

const hourLineOf = (frame: Frame, hhmm: string): string | null => elementOf(frame.svg, `hour-grid-${at(hhmm)}`)
const dateLineOf = (frame: Frame, day = MONDAY): string | null =>
  elementOf(frame.svg, `date-grid-${Math.floor(at('00:00', day) / 1440)}`)

describe('FR-017: the hour lines of the date grid, on every hour of the hour tier', () => {
  const frame = frameOf(HOUR_TIER, true)

  it('premise: the width is inside the hour tier', () => {
    expect(frame.layout.tier).toBe('dayHour')
  })

  it.each(['01:00', '09:00', '10:00', '12:00', '13:00', '17:00', '23:00'])('draws a line on the hour %s', (hhmm) => {
    expect(hourLineOf(frame, hhmm), hhmm).not.toBeNull()
  })

  it.each(['09:30', '10:15', '12:30'])('draws no line on %s at this width: 30 minutes come from S-578 on', (hhmm) => {
    expect(hourLineOf(frame, hhmm), hhmm).toBeNull()
  })

  it('stands the line of an hour on the x of that instant (RV-1, RV-6)', () => {
    for (const hhmm of ['09:00', '14:00', '20:00']) {
      const line = hourLineOf(frame, hhmm) as string
      const x = xOfInstant(frame.layout, at(hhmm))
      expect(Number(attrOf(line, 'x1')), hhmm).toBeCloseTo(x, 1)
      expect(Number(attrOf(line, 'x2')), hhmm).toBeCloseTo(x, 1)
    }
  })

  it('draws every hour line solid: no dash', () => {
    const lines = figuresOf(frame.svg, 'hour-grid-')
    expect(lines.length).toBeGreaterThan(0)
    for (const figure of lines) {
      expect(attrOf(elementOf(frame.svg, figure) as string, 'stroke-dasharray'), figure).toBeNull()
    }
  })

  it('gives the hour line the color and the thickness of the date line (U-17)', () => {
    const date = dateLineOf(frame) as string
    const hour = hourLineOf(frame, '09:00') as string
    expect(date).not.toBeNull()
    expect(attrOf(hour, 'stroke')).toBe(attrOf(date, 'stroke'))
    expect(attrOf(hour, 'stroke-width')).toBe(attrOf(date, 'stroke-width'))
  })

  it('keeps the date line of midnight', () => {
    expect(dateLineOf(frame)).not.toBeNull()
    expect(dateLineOf(frame, '2026-01-06')).not.toBeNull()
  })
})

describe('FR-017: the 30-minute dotted lines, from the day width S-578', () => {
  const frame = frameOf(HALF_HOUR, true)

  it('premise: S-581 is the dash 2 3', () => {
    expect(S_581).toBe('2 3')
  })

  it.each(['09:30', '10:30', '12:30', '16:30'])('draws a dotted line on %s with the dash of S-581', (hhmm) => {
    const line = hourLineOf(frame, hhmm)
    expect(line, hhmm).not.toBeNull()
    expect(attrOf(line as string, 'stroke-dasharray')).toBe(S_581)
  })

  it.each(['09:00', '10:00', '17:00'])('keeps the hour %s a solid line', (hhmm) => {
    const line = hourLineOf(frame, hhmm)
    expect(line, hhmm).not.toBeNull()
    expect(attrOf(line as string, 'stroke-dasharray')).toBeNull()
  })

  it('dots only the lines that are not on the hour', () => {
    for (const figure of figuresOf(frame.svg, 'hour-grid-')) {
      const minute = Number(figure.replace('hour-grid-', ''))
      const dashed = attrOf(elementOf(frame.svg, figure) as string, 'stroke-dasharray') !== null
      expect(dashed, figure).toBe(minute % 60 !== 0)
    }
  })

  it('gives the dotted line the color and the thickness of the date line (U-17)', () => {
    const date = dateLineOf(frame) as string
    const half = hourLineOf(frame, '09:30') as string
    expect(attrOf(half, 'stroke')).toBe(attrOf(date, 'stroke'))
    expect(attrOf(half, 'stroke-width')).toBe(attrOf(date, 'stroke-width'))
  })

  it('stands the dotted line on the x of its instant', () => {
    const line = hourLineOf(frame, '09:30') as string
    expect(Number(attrOf(line, 'x1'))).toBeCloseTo(xOfInstant(frame.layout, at('09:30')), 1)
  })

  it('draws no dotted line just under the width of S-578, and the hour lines stay', () => {
    const narrower = frameOf(S_578 * 0.9, true)
    expect(hourLineOf(narrower, '09:30')).toBeNull()
    expect(hourLineOf(narrower, '09:00')).not.toBeNull()
  })
})

describe('FR-089: the date line goes by the finest row the ruler prints', () => {
  it('stands on every midnight at the day tier and draws no hour line there', () => {
    const frame = frameOf(DAY_TIER, false)
    expect(frame.layout.tier).toBe('yearMonthDayWeekday')
    for (const day of [MONDAY, '2026-01-06', '2026-01-07']) expect(dateLineOf(frame, day), day).not.toBeNull()
    expect(figuresOf(frame.svg, 'hour-grid-')).toEqual([])
  })

  it('stands on every midnight and every hour at the hour tier: the hour row is the finest', () => {
    const frame = frameOf(HOUR_TIER, true)
    for (const day of [MONDAY, '2026-01-06']) expect(dateLineOf(frame, day), day).not.toBeNull()
    expect(hourLineOf(frame, '10:00')).not.toBeNull()
  })
})

describe('FR-017: no hour line while the time is not shown or the ruler is not on the hour tier', () => {
  it.each([
    ['the time not shown, at the hour width', HOUR_TIER, false],
    ['the time not shown, at the half-hour width', HALF_HOUR, false],
    ['the time shown, on the day tier', DAY_TIER, true],
  ])('%s', (_name, threshold, shows) => {
    const frame = frameOf(threshold, shows)
    expect(figuresOf(frame.svg, 'hour-grid-')).toEqual([])
    expect(figuresOf(frame.svg, 'ruler-hour-')).toEqual([])
  })

  it('draws no date line at all while the date grid lines are off, with the time shown', () => {
    const frame = frameOf(HALF_HOUR, true, false)
    expect(figuresOf(frame.svg, 'hour-grid-')).toEqual([])
    expect(figuresOf(frame.svg, 'date-grid-')).toEqual([])
  })
})

describe('TM-5: the ruler of the hour tier', () => {
  const frame = frameOf(HOUR_TIER, true)

  it('prints the hours row only while the time is shown and the ruler is on the hour tier', () => {
    expect(figuresOf(frame.svg, 'ruler-hour-label-').length).toBeGreaterThan(0)
    expect(figuresOf(frameOf(HOUR_TIER, false).svg, 'ruler-hour-label-')).toEqual([])
    expect(figuresOf(frameOf(DAY_TIER, true).svg, 'ruler-hour-label-')).toEqual([])
  })

  const hourLabelsOf = (svg: string): readonly { readonly minute: number; readonly text: string }[] =>
    [...svg.matchAll(/<text [^>]*data-figure="ruler-hour-label-(\d+)"[^>]*>([^<]*)<\/text>/g)].map((one) => ({
      minute: Number(one[1]),
      text: (one[2] as string).trim(),
    }))

  it('writes the hour of the day, 0 to 23, with no padding and no minutes', () => {
    const labels = hourLabelsOf(frame.svg)
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      const hour = Math.floor((label.minute % 1440) / 60)
      expect(label.text, `${label.minute}`).toBe(String(hour))
    }
  })

  it('thins the digits by a whole stride of 1, 2 or 3 hours, the same across the row', () => {
    for (const threshold of [S_577 + 5, HOUR_TIER, S_578 - 5, HALF_HOUR, S_578 * 3]) {
      const labels = hourLabelsOf(frameOf(threshold, true).svg)
      const gaps = new Set<number>()
      for (let i = 1; i < labels.length; i += 1) {
        const gap = ((labels[i]?.minute as number) - (labels[i - 1]?.minute as number)) / 60
        // WHY: the row restarts at each midnight, so a gap that spans one is the stride or less.
        if (labels[i]?.minute !== undefined && Math.floor((labels[i]?.minute as number) / 1440) === Math.floor((labels[i - 1]?.minute as number) / 1440)) gaps.add(gap)
      }
      expect(gaps.size, `threshold ${threshold}`).toBeLessThanOrEqual(1)
      for (const gap of gaps) expect([1, 2, 3], `threshold ${threshold}`).toContain(gap)
    }
  })

  it('never thins the digits more as the day widens', () => {
    const strideOf = (threshold: number): number => {
      const labels = hourLabelsOf(frameOf(threshold, true).svg)
      const first = labels.findIndex((one, i) => i > 0 && Math.floor(one.minute / 1440) === Math.floor((labels[i - 1]?.minute as number) / 1440))
      return first < 0 ? 1 : ((labels[first]?.minute as number) - (labels[first - 1]?.minute as number)) / 60
    }
    let last = Number.POSITIVE_INFINITY
    for (const threshold of [S_577 + 5, (S_577 + S_578) / 2, S_578 * 1.25, S_578 * 3, S_578 * 6]) {
      const stride = strideOf(threshold)
      expect(stride, `threshold ${threshold}`).toBeLessThanOrEqual(last)
      last = stride
    }
    expect(last).toBe(1)
  })

  it('prints every hour at a day wide enough for every digit', () => {
    const labels = hourLabelsOf(frameOf(S_578 * 6, true).svg)
    const monday = labels.filter((one) => Math.floor(one.minute / 1440) === Math.floor(at('00:00') / 1440))
    expect(monday.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < monday.length; i += 1) expect((monday[i]?.minute as number) - (monday[i - 1]?.minute as number)).toBe(60)
  })

  it('writes the date row as yyyy/m/d (weekday), with neither month nor day padded', () => {
    const labels = [...frame.svg.matchAll(/<text [^>]*data-figure="ruler-[A-Za-z]+-label-\d+"[^>]*>([^<]*)<\/text>/g)].map((one) => (one[1] as string).trim())
    expect(labels.some((one) => /^2026\/1\/5 \(月\)$/.test(one)), labels.slice(0, 6).join(' | ')).toBe(true)
  })

  it('keeps the height of the ruler band the same on every tier and with the time shown or not', () => {
    const footOf = (threshold: number, shows: boolean): string | null => {
      const element = elementOf(frameOf(threshold, shows).svg, 'ruler-foot-rule')
      return element === null ? null : attrOf(element, 'y1')
    }
    const reference = footOf(DAY_TIER, false)
    expect(reference).not.toBeNull()
    for (const [threshold, shows] of [[DAY_TIER, true], [HOUR_TIER, true], [HALF_HOUR, true], [HOUR_TIER, false], [2, false], [20, false]] as const) {
      expect(footOf(threshold, shows), `${threshold} ${shows}`).toBe(reference)
    }
  })
})

interface Run {
  readonly x0: number
  readonly x1: number
}

function shadeRunsOf(svg: string): readonly Run[] {
  const found = [...svg.matchAll(/<path [^>]*data-figure="non-working-days"[^>]*>/g)]
  expect(found.length, 'one element for all the shade (OD-6)').toBe(1)
  const d = attrOf(found[0]?.[0] as string, 'd') ?? ''
  const num = '(-?\\d+(?:\\.\\d+)?)'
  const rect = new RegExp(`M\\s*${num}[\\s,]+${num}\\s*H\\s*${num}\\s*V\\s*${num}\\s*H\\s*${num}\\s*Z`, 'g')
  return [...d.matchAll(rect)]
    .map((one) => ({ x0: Math.min(Number(one[1]), Number(one[3])), x1: Math.max(Number(one[1]), Number(one[3])) }))
    .sort((a, b) => a.x0 - b.x0)
}

describe('OD-1, OD-2, OD-6: the hours outside the working time are shaded on the hour tier, in one element', () => {
  const coveredAt = (runs: readonly Run[], x: number): boolean => runs.some((one) => one.x0 - 0.02 <= x && x <= one.x1 + 0.02)
  const midOf = (frame: Frame, from: string, to: string, day = MONDAY): number =>
    (xOfInstant(frame.layout, at(from, day)) + xOfInstant(frame.layout, at(to, day))) / 2

  it('shades the time before work, the lunch hour and the evening of a working day', () => {
    const frame = frameOf(HOUR_TIER, true)
    const runs = shadeRunsOf(frame.svg)
    expect(coveredAt(runs, midOf(frame, '01:00', '07:00')), 'before work').toBe(true)
    expect(coveredAt(runs, midOf(frame, '12:15', '12:45')), 'the lunch hour').toBe(true)
    expect(coveredAt(runs, midOf(frame, '18:00', '23:00')), 'the evening').toBe(true)
    expect(coveredAt(runs, midOf(frame, '00:30', '07:30', '2026-01-06')), 'Tuesday before work').toBe(true)
  })

  it('shades before work and the lunch hour from the half-hour width on', () => {
    const frame = frameOf(HALF_HOUR, true)
    const runs = shadeRunsOf(frame.svg)
    expect(coveredAt(runs, midOf(frame, '01:00', '07:00')), 'before work').toBe(true)
    expect(coveredAt(runs, midOf(frame, '12:15', '12:45')), 'the lunch hour').toBe(true)
  })

  // WHY: DFC-2467 -- red until the shade compared its rounded x strings ('1147.5' > '697.5' is false), at 600 to 1000 px per day.
  it('shades the evening of a working day from the half-hour width on', () => {
    const frame = frameOf(HALF_HOUR, true)
    const runs = shadeRunsOf(frame.svg)
    expect(coveredAt(runs, midOf(frame, '18:00', '23:00')), 'the evening').toBe(true)
  })

  it.each([
    ['the hour tier', HOUR_TIER],
    ['the half-hour width', HALF_HOUR],
  ])('does not shade the working time of a working day (%s)', (_name, threshold) => {
    const frame = frameOf(threshold, true)
    const runs = shadeRunsOf(frame.svg)
    expect(coveredAt(runs, midOf(frame, '08:30', '11:30')), 'the morning').toBe(false)
    expect(coveredAt(runs, midOf(frame, '13:30', '16:30')), 'the afternoon').toBe(false)
    expect(coveredAt(runs, midOf(frame, '08:30', '11:30', '2026-01-06')), 'Tuesday morning').toBe(false)
  })

  it('shades a whole rest day: Saturday from 00:00 to 24:00, on a wide day', () => {
    const frame = frameOf(WIDE_DAY, true, true, FRIDAY)
    const runs = shadeRunsOf(frame.svg)
    const saturday = '2026-01-10'
    expect(coveredAt(runs, midOf(frame, '09:00', '16:00', saturday))).toBe(true)
    expect(coveredAt(runs, midOf(frame, '00:30', '23:30', saturday))).toBe(true)
  })

  // WHY: DFC-2467 -- red until the same string comparison dropped Friday 17:00 to Monday 08:00 at 432 px per day.
  it('shades a whole rest day: Saturday from 00:00 to 24:00, on the hour tier', () => {
    const frame = frameOf(HOUR_TIER, true, true, FRIDAY)
    const runs = shadeRunsOf(frame.svg)
    const saturday = '2026-01-10'
    expect(coveredAt(runs, midOf(frame, '09:00', '16:00', saturday))).toBe(true)
    expect(coveredAt(runs, midOf(frame, '00:30', '23:30', saturday))).toBe(true)
  })

  it('shades only whole days on the day tier, as before', () => {
    const frame = frameOf(DAY_TIER, true, true, FRIDAY)
    const runs = shadeRunsOf(frame.svg)
    expect(coveredAt(runs, midOf(frame, '12:15', '12:45', FRIDAY))).toBe(false)
    expect(coveredAt(runs, midOf(frame, '09:00', '16:00', '2026-01-10'))).toBe(true)
  })

  it('shades only whole days while the time is not shown: the lunch hour stays clear, the weekend is shaded', () => {
    const frame = frameOf(NARROW_DAY, false)
    const runs = shadeRunsOf(frame.svg)
    expect(coveredAt(runs, midOf(frame, '12:15', '12:45'))).toBe(false)
    expect(coveredAt(runs, midOf(frame, '00:30', '07:30'))).toBe(false)
    expect(coveredAt(runs, midOf(frame, '09:00', '16:00', '2026-01-10'))).toBe(true)
  })
})

// see TM-5, FR-017, DFC-2457
const TM_5_THINNED_HOURS = '⭐ 間引いた数字は、0 時から数えて刻みの倍数の時に置く（0・2・4… ／ 0・3・6…）'

describe('DFC-2457 TM-5: a thinned hour digit stands on a multiple of the stride counted from 0 o\'clock', () => {
  const labelsAt = (threshold: number): readonly { readonly minute: number; readonly hour: number }[] =>
    [...frameOf(threshold, true).svg.matchAll(/<text [^>]*data-figure="ruler-hour-label-(\d+)"[^>]*>([^<]*)<\/text>/g)].map((one) => ({
      minute: Number(one[1]),
      hour: Number((one[2] as string).trim()),
    }))
  // WHY: the stride is the gap between two digits of one day; the row restarts at each midnight.
  const strideOf = (labels: readonly { readonly minute: number }[]): number | null => {
    for (let i = 1; i < labels.length; i += 1) {
      const [a, b] = [labels[i - 1]?.minute as number, labels[i]?.minute as number]
      if (Math.floor(a / 1440) === Math.floor(b / 1440)) return (b - a) / 60
    }
    return null
  }
  // WHY: a sweep of the hour tier, so the widths at which the stride is 2 and 3 are found rather than guessed.
  const SWEEP = Array.from({ length: 40 }, (_unused, i) => S_577 + 1 + ((S_578 - S_577 - 2) * i) / 39)
  const byStride = new Map<number, number>()
  for (const threshold of SWEEP) {
    const stride = strideOf(labelsAt(threshold))
    if (stride !== null && !byStride.has(stride)) byStride.set(stride, threshold)
  }

  it('table T-238 TM-5 still reads as quoted', () => {
    expect(REQUIREMENTS).toContain(TM_5_THINNED_HOURS)
  })

  // WHY: the narrowest width of the hour tier may already fit two-digit labels every 2 hours, so 3 is checked only where it is reached.
  const thinned = (): readonly (readonly [number, number])[] => [...byStride].filter(([stride]) => stride > 1)

  it('premise: some width of the hour tier thins the digits to every 2 hours', () => {
    expect(byStride.has(2), `strides found: ${[...byStride.keys()].join(', ')}`).toBe(true)
  })

  it('every digit at a thinned stride is a multiple of it, on every day of the row', () => {
    for (const [stride, threshold] of thinned()) {
      const labels = labelsAt(threshold)
      expect(labels.length, `stride ${stride}`).toBeGreaterThan(0)
      for (const label of labels) expect(label.hour % stride, `stride ${stride}: ${label.minute} reads ${label.hour}`).toBe(0)
    }
  })

  it('a thinned stride puts a digit on midnight (hour 0) of each whole day in view', () => {
    for (const [stride, threshold] of thinned()) {
      const labels = labelsAt(threshold)
      const days = [...new Set(labels.map((one) => Math.floor(one.minute / 1440)))]
      expect(days.length, `stride ${stride}: premise, the view holds a whole day`).toBeGreaterThan(2)
      // WHY: the first and the last day may be cut by the edges of the view; a day between them is shown whole.
      for (const day of days.slice(1, -1)) {
        expect(labels.some((one) => one.minute === day * 1440 && one.hour === 0), `stride ${stride}: day ${day}`).toBe(true)
      }
    }
  })
})
