// CR-667 spec-only tests: FR-012 counts the plan by FR-011's rule (both end days, milestones 0) and EP-9 draws the Panel Divider in S-149.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { exportSvg, type ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import { screenFrameFromRegions } from '../../src/adapter/screen-renderer/screen-frame'
import type { AppHeaderItems, RowTitlePanel, ScreenFrame, ScreenView, ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { blankTaskVisual } from '../../src/entity/document-model/schedule/schedule'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_012_PLAN_BY_FR_011 =
  'ずれも稼働日）で算出して格納し、**人に直接入力させないこと（MUST NOT）。**⭐ **予定の期間は、`start` の日から `finish` の日までを、`FR-011` が実績の長さを数える規則で数えた日数とすること（MUST）'
const FR_012_MILESTONE_ZERO = 'マイルストーンの予定の期間は 0 とする —— 長さを持たない点である（`FR-011` と同じ扱い）。'
const FR_012_ON_PLAN_IS_100 =
  '⇒ 予定どおりの日に始めて予定どおりの日に終えたタスクは 100 であり、開始日と終了日が同じタスクの予定の期間は 1 日である。'
const FR_011_ENDS_COUNT = '⭐ ただし両端の日（`actualStart` と最後の日）は、非稼働日であっても 1 日として数えること（MUST）'
const EP_9_S_149 =
  ' | 操作子としては描かない。境界の線を描く | 境界が消えると行見出しと日程の境目が読めない。`Group Grid Lines`（`U-18`）と同じ太さの線を 1 本、表 T-236 の `S-149`（罫の色）で引くこと（MUST）'
const EP_9_NOT_S_165 = '⚠️ 色はグループ罫線の `S-165` ではない'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-012 (MUST) the plan is counted by FR-011', FR_012_PLAN_BY_FR_011],
  ['FR-012 a milestone plan is 0', FR_012_MILESTONE_ZERO],
  ['FR-012 an on-plan finish is 100', FR_012_ON_PLAN_IS_100],
  ['FR-011 (MUST) both end days count', FR_011_ENDS_COUNT],
  ['EP-9 (MUST) one line, U-18 thick, S-149', EP_9_S_149],
  ['EP-9 the colour is not S-165', EP_9_NOT_S_165],
]

describe('CR-667 the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('01-04 still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// see FR-012, OP-6
// WHY: a GRS JSON read recounts from the dates, so it is the public path that prices each case.
const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

// WHY: a Monday-to-Friday calendar and nothing else, so every count below is the weekdays alone.
const MON_TO_FRI_CALENDARS = (TEMPLATE['schedule']['calendars'] as Record<string, unknown>[]).map((one) => ({
  ...one,
  exceptions: [],
}))

// WHY: January 2026 runs Mon 5, Tue 6, Wed 7, Thu 8, Fri 9, Sat 10, Sun 11, Mon 12.
const day = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}T00:00:00`

const taskRow = (uid: number, part: Record<string, unknown>): Record<string, unknown> => ({
  uid,
  wbsParentUid: null,
  wbsOrder: uid,
  name: `T${uid}`,
  start: day(5),
  finish: day(6),
  milestone: false,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  actualFinish: null,
  stop: null,
  resume: null,
  resumeValid: null,
  percentComplete: 0,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
  carry: {},
  carryElements: [],
  ...part,
})

const finished = (from: number, to: number): Record<string, unknown> => ({
  actualStart: day(from),
  actualFinish: day(to),
  resumeValid: false,
})

interface Case {
  readonly name: string
  readonly row: Record<string, unknown>
  readonly expected: number
}

const CASES: readonly Case[] = [
  { name: 'a Mon-Tue plan finished Mon-Tue reads 100', row: taskRow(1, { ...finished(5, 6) }), expected: 100 },
  {
    name: 'a start = finish plan finished in its one day reads 100',
    row: taskRow(2, { start: day(7), finish: day(7), ...finished(7, 7) }),
    expected: 100,
  },
  {
    name: 'a start = finish plan finished in two days reads 200',
    row: taskRow(3, { start: day(7), finish: day(7), ...finished(7, 8) }),
    expected: 200,
  },
  {
    name: 'a milestone with actualFinish reads 100',
    row: taskRow(4, { start: day(7), finish: day(7), milestone: true, ...finished(7, 7) }),
    expected: 100,
  },
  {
    name: 'a milestone without actualFinish reads 0',
    row: taskRow(5, { start: day(7), finish: day(7), milestone: true }),
    expected: 0,
  },
  {
    name: 'a plan ending on a Saturday, finished on plan, reads 100 (both end days count, FR-011)',
    row: taskRow(6, { start: day(5), finish: day(10), ...finished(5, 10) }),
    expected: 100,
  },
  {
    name: 'a Mon-Tue plan running one day (Mon) reads 50',
    row: taskRow(7, { actualStart: day(5), stop: day(5), resumeValid: true }),
    expected: 50,
  },
  {
    name: 'a Mon-Fri plan finished the next Monday reads 120 (six worked days over five)',
    row: taskRow(8, { start: day(5), finish: day(9), ...finished(5, 12) }),
    expected: 120,
  },
]

const ROW_GROUP = '5c000000-0000-4000-8000-000000000667'

const documentText = (tasks: readonly Record<string, unknown>[]): string =>
  JSON.stringify({
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE['schemaVersion'],
    schedule: {
      project: { ...TEMPLATE['schedule']['project'], uidHighWaterMark: 100, statusDate: null },
      calendars: MON_TO_FRI_CALENDARS,
      tasks,
      resources: [],
      assignments: [],
      taskGroups: [
        { id: ROW_GROUP, parentId: null, label: 'A', derivedFromTaskUid: null, order: 0, treeState: 'auto', color: null, minHeight: null },
      ],
      taskGroupMembers: tasks.map((one) => ({ taskUid: one['uid'], groupId: ROW_GROUP })),
      taskVisuals: tasks.map((one) => blankTaskVisual(one['uid'] as number)),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: TEMPLATE['documentSettings'],
    documentStamp: TEMPLATE['documentStamp'],
    changeLog: [],
  })

function readDocument(): Document {
  const read = documentFromJson(documentText(CASES.map((one) => one.row)), TEMPLATE['schemaVersion'] as string)
  if (!read.ok) throw new Error(`the fixture was refused: ${JSON.stringify(read.faults).slice(0, 400)}`)
  return read.document
}

describe(`FR-012 (MUST): ${FR_012_PLAN_BY_FR_011}`, () => {
  const document = readDocument()
  it.each(CASES)('$name', ({ row, expected }) => {
    const task = document.schedule.tasks.find((one) => one.uid === row['uid'])
    expect(task?.percentComplete).toBe(expected)
  })
})

// see EP-9, T-236, WY-2
const T_236 = specTable('T-236')

const s236 = (id: string, theme: '明るいテーマ' | '暗いテーマ', hue: number): string => {
  const row = T_236.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-236 has no ${id}`)
  return bare(row.by[theme] ?? '').replace(/\bH\b/g, String(hue))
}

const SETTINGS = { ...SETTINGS_DEFAULTS } as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: SETTINGS_CONSTANTS.exportCanvas.width,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  propertyPanelWidth: 0,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)

const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: 'ja', helpLanguage: 'ja' },
}

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 0,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const frame = (): ScreenFrame => screenFrameFromRegions(REGIONS, SETTINGS, ROOT, READINGS)

const VIEW = {
  language: 'ja',
  appHeaderItems: { documentTitle: null, commands: [], language: 'ja' } as unknown as AppHeaderItems,
  rowTitlePanel: { pinnedTitles: [], titles: [] } as unknown as RowTitlePanel,
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

interface DrawnRect {
  readonly width: number
  readonly height: number
  readonly fill: string
}

function rectsOf(svg: string): DrawnRect[] {
  const found: DrawnRect[] = []
  const re = /<rect x="[^"]*" y="[^"]*" width="([^"]*)" height="([^"]*)" fill="([^"]*)"/g
  let one: RegExpExecArray | null
  while ((one = re.exec(svg)) !== null) found.push({ width: Number(one[1]), height: Number(one[2]), fill: one[3] ?? '' })
  return found
}

function dividerRectsExported(themePreference: 'light' | 'dark', themeHue: number): { lines: DrawnRect[]; frame: ScreenFrame } {
  const drawn = frame()
  const scene = {
    svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    regions: REGIONS,
    screenView: { ...VIEW, frame: drawn } as unknown as ScreenView,
    settings: SETTINGS,
    themePreference,
    themeHue,
  } as unknown as ExportScene
  const answer = exportSvg(scene)
  if (!answer.ok) throw new Error('the fixture is far under the height cap, so a refusal is the fixture')
  const rects = rectsOf(answer.svg)
  return { lines: rects.slice(-drawn.dividers.length), frame: drawn }
}

describe(`EP-9 (MUST): ${EP_9_S_149}`, () => {
  it('the frame carries at least the row title panel divider', () => {
    expect(frame().dividers.map((one) => one.panel)).toContain('rowTitlePanel')
  })

  it.each([
    ['light', '明るいテーマ', 214],
    ['dark', '暗いテーマ', 214],
    ['light', '明るいテーマ', 30],
  ] as const)('the export draws each divider line in S-149 (%s theme, column %s, hue %d)', (theme, column, hue) => {
    const { lines, frame: drawn } = dividerRectsExported(theme, hue)
    expect(lines).toHaveLength(drawn.dividers.length)
    for (const [at, line] of lines.entries()) {
      const divider = drawn.dividers[at]
      expect(line.fill, `${divider?.panel ?? at}`).toBe(s236('S-149', column, hue))
      expect(line.fill, `${EP_9_NOT_S_165} -- ${divider?.panel ?? at}`).not.toBe(s236('S-165', column, hue))
    }
  })

  it('the export draws each divider line at the width the frame gives it', () => {
    const { lines, frame: drawn } = dividerRectsExported('light', 214)
    for (const [at, line] of lines.entries()) {
      const divider = drawn.dividers[at]
      if (divider === undefined) throw new Error('no divider for an exported line')
      const thin = Math.min(divider.line.width, divider.line.height)
      expect(Math.min(line.width, line.height)).toBeCloseTo(thin, 5)
      expect(thin).toBeGreaterThan(0)
    }
  })
})

// see FR-012, DFC-682
// WHY: the Nth weekday counting from Monday 2026-01-05, so a "40 working day" plan needs no calendar arithmetic in the cases.
const weekday = (nth: number): string => {
  const date = new Date(Date.UTC(2026, 0, 5))
  let counted = 1
  while (counted < nth) {
    date.setUTCDate(date.getUTCDate() + 1)
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) counted += 1
  }
  return date.toISOString().slice(0, 19)
}

const roundingCase = (uid: number, name: string, planDays: number, actualDays: number, expected: number): Case => ({
  name,
  row: taskRow(uid, {
    start: weekday(1),
    finish: weekday(planDays),
    actualStart: weekday(1),
    actualFinish: weekday(actualDays),
    resumeValid: false,
  }),
  expected,
})

// WHY: FR-012 names `round`, not floor or ceil: a ratio of exactly .5 goes up, and a ratio near but off .5 goes the near way.
const ROUNDING_CASES: readonly Case[] = [
  // WHY: 23 / 40 is 57.5 exactly; the float product (23 / 40) * 100 is 57.49999999999999 and once read as 57.
  roundingCase(11, '23 of 40 working days (57.5) reads 58', 40, 23, 58),
  roundingCase(12, '3 of 40 working days (7.5) reads 8', 40, 3, 8),
  roundingCase(13, '7 of 40 working days (17.5) reads 18', 40, 7, 18),
  roundingCase(14, '15 of 40 working days (37.5) reads 38', 40, 15, 38),
  // WHY: floor reads the first as 66 and ceil reads the second as 34; round gives 67 and 33.
  roundingCase(15, '20 of 30 working days (66.67) reads 67', 30, 20, 67),
  roundingCase(16, '10 of 30 working days (33.33) reads 33', 30, 10, 33),
]

describe('FR-012 (MUST): the percent complete is round(actual / plan x 100), neither floor nor ceil (DFC-682)', () => {
  const read = documentFromJson(documentText(ROUNDING_CASES.map((one) => one.row)), TEMPLATE['schemaVersion'] as string)
  if (!read.ok) throw new Error(`the fixture was refused: ${JSON.stringify(read.faults).slice(0, 400)}`)
  it.each(ROUNDING_CASES)('$name', ({ row, expected }) => {
    expect(read.document.schedule.tasks.find((one) => one.uid === row['uid'])?.percentComplete).toBe(expected)
  })
})
