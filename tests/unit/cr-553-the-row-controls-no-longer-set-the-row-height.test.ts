// CR-553: the row controls no longer set the row height; the lattice is reserved under the last row instead.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  fitZoom,
  layoutFromSchedule,
  type ScheduleLayout,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  rowControlLatticeHeightPx,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { NOT_STORED_ZOOM_STEP } from '../../src/adapter/input-command-translator/input-command-translator'
import { specTable } from '../contract/spec-table'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

const numberOf = (table: string, id: string, column: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec((rowOf(table, id).by[column] ?? '').replace(/`/g, ''))
  if (found === null) throw new Error(`table ${table} row ${id} states no number in ${column}`)
  return Number(found[0])
}

// see T-201
const t201 = (id: string): number => numberOf('T-201', id, '既定値')

// see T-202, T-203, T-206
const byDefault = (table: string, id: string): number => numberOf(table, id, '既定')

const HF_19_NOT_A_FLOOR =
  '`HF-1` の格子（`HF-4` の並び、2 段）が縦に取る高さを、行の帯高の下限にしてはならない（MUST NOT）'
const HF_19_MAY_OVERLAP = '帯高が格子より低い行では、描いた格子とその地（`HF-6`）が、下の行の帯の上へはみ出して重なってよい'
const LF_16_THE_AMOUNT =
  'スクロールする行（`LF-14` の帯へ上げた行を除く）のいちばん下の行の下に、行の操作子の格子（`01-04-requirements.md` の 表 T-051 の `HF-1`）が縦に取る高さからその行の帯高を引いた長さの余白を加える'
const LF_16_ZERO = '引いた長さが 0 を下回るとき（帯高が格子以上のとき）と、スクロールする行が 1 つも無いときは 0 とする'
const LF_16_IN_THE_FIT = '`FR-055` が収まるかを見る縦の高さにも入る'
const FR_055_COUNTS_THE_RESERVE =
  '収まるかを見る縦の高さには、最後の行の下に置く余白（`05-07-design.md` の 表 T-221 の `LF-16`）を含めること（MUST）'
const SWS_2_EMPTY_ROW = '空の段と空の行が矩形 1 段ぶんを取る'

// see FR-039, T-252
const RATIO = (byDefault('T-202', 'S-234') / 100) * byDefault('T-206', 'S-236')

// see FR-094
const PLAN =
  Math.max((t201('S-6') * RATIO) / t201('S-5'), t201('S-4') * RATIO * byDefault('T-203', 'S-76')) * t201('S-13')

// see VG-5
const RECTANGLE = PLAN + t201('S-39') * RATIO

// see VG-2, VG-3, VG-4
const GAP = t201('S-11') + t201('S-18') * RATIO + t201('S-11')

// see LF-2
const ONE_LANE = RECTANGLE + GAP

// see LF-16, FR-029
const LATTICE = 2 * (byDefault('T-206', 'S-138') + byDefault('T-206', 'S-243') * 2) * byDefault('T-206', 'S-235')

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
    scrollDate: '2026-01-01',
    stackDirection: 'down',
    ...part,
  }) as unknown as DocumentSettings

const SETTINGS = settingsOf()

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }

const REGIONS = regionsFromScreen(ENV, SETTINGS)

const taskOf = (uid: number, from = '2026-01-05', days = 20): Task => {
  const finish = new Date(new Date(`${from}T00:00:00Z`).getTime() + days * 86400000)
  return {
    uid,
    name: null,
    start: from,
    finish: finish.toISOString().slice(0, 10),
    milestone: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
  } as unknown as Task
}

interface RowSpec {
  readonly id: string
  readonly parentId?: string | null
  readonly tasks?: number
}

const scheduleOf = (rows: readonly RowSpec[]): Schedule => {
  let uid = 0
  const tasks: Task[] = []
  const members: { groupId: string; taskUid: number }[] = []
  for (const row of rows) {
    for (let lane = 0; lane < (row.tasks ?? 0); lane += 1) {
      uid += 1
      tasks.push(taskOf(uid, `2026-01-0${lane + 5}`))
      members.push({ groupId: row.id, taskUid: uid })
    }
  }
  return {
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: rows.map((row, order) => ({ id: row.id, parentId: row.parentId ?? null, order, height: null })),
    taskGroupMembers: members,
    taskVisuals: [],
    highlightBoxes: [],
    commentBoxes: [],
  } as unknown as Schedule
}

const laid = (
  schedule: Schedule,
  settings: DocumentSettings = SETTINGS,
  regions: ScreenRegions = REGIONS,
  measured?: number,
): ScheduleLayout => layoutFromSchedule(schedule, settings, regions, undefined, measured)

const bandsOf = (layout: ScheduleLayout): number =>
  layout.rows.filter((row) => row.isPinned !== true).reduce((sum, row) => sum + row.height, 0)

describe('CR-553 -- the manuscript these cases are driven by', () => {
  it('HF-19 (MUST NOT) forbids the floor and lets the lattice overlap the row below', () => {
    expect(says('T-051', 'HF-19')).toContain(HF_19_NOT_A_FLOOR)
    expect(says('T-051', 'HF-19')).toContain(HF_19_MAY_OVERLAP)
  })

  it('LF-16 states the amount, its zero cases and that FR-055 counts it; FR-055 says the same (MUST)', () => {
    expect(says('T-221', 'LF-16')).toContain(LF_16_THE_AMOUNT)
    expect(says('T-221', 'LF-16')).toContain(LF_16_ZERO)
    expect(says('T-221', 'LF-16')).toContain(LF_16_IN_THE_FIT)
  })

  it('FR-055 (MUST) counts the reserve, and SWS-2 gives an empty row one rectangle lane', () => {
    const read = (file: string): string =>
      readFileSync(join(process.cwd(), 'docs', 'spec', file), 'utf8').replace(/<br\s*\/?>/gi, '')
    expect(read('01-04-requirements.md')).toContain(FR_055_COUNTS_THE_RESERVE)
    expect(read('05-07-design.md')).toContain(SWS_2_EMPTY_ROW)
  })
})

describe('S-6 / LF-2 (decision 1): one lane at display scale 100, derived from the settings rows', () => {
  it('is FR-094 plan + S-39 x ratio (VG-5) + S-11 + S-18 x ratio + S-11 (VG-2), and 21.625px as a cross-check', () => {
    expect(RATIO).toBeCloseTo(0.625, 12)
    expect(ONE_LANE).toBeCloseTo(21.625, 9)
    expect(ONE_LANE, 'the premise every case below stands on').toBeLessThan(LATTICE)
  })

  it('PI-35 rowControlLatticeHeightPx answers the lattice LF-16 composes (S-6 of CR-553)', () => {
    expect(rowControlLatticeHeightPx()).toBeCloseTo(LATTICE, 9)
  })

  it('HF-19 (MUST NOT): a one-lane rectangle row is that lane, lower than the lattice', () => {
    const [row] = laid(scheduleOf([{ id: 'g1', tasks: 1 }])).rows
    expect(row?.height, HF_19_NOT_A_FLOOR).toBeCloseTo(ONE_LANE, 9)
    expect(row?.height).toBeLessThan(LATTICE)
  })

  it('HF-19 control: a two-lane row is taller than the lattice anyway, so nothing there tells a floor apart', () => {
    const [row] = laid(scheduleOf([{ id: 'g1', tasks: 2 }])).rows
    expect(row?.height).toBeCloseTo(2 * ONE_LANE, 9)
    expect(row?.height).toBeGreaterThan(LATTICE)
  })
})

describe('LF-2 / SWS-2 (decision 13, DFC-840): an empty row is the one-lane band', () => {
  it('a row holding no Task is one rectangle lane and one VG-2 gap, the same as a one-lane row', () => {
    const layout = laid(scheduleOf([{ id: 'g1', tasks: 1 }, { id: 'g2' }]))
    const [full, empty] = layout.rows
    expect(empty?.height, SWS_2_EMPTY_ROW).toBeCloseTo(ONE_LANE, 9)
    expect(empty?.height).toBeCloseTo(full?.height ?? Number.NaN, 9)
  })

  it('so placing the first Task on it moves no row below it', () => {
    const before = laid(scheduleOf([{ id: 'g1' }, { id: 'g2', tasks: 1 }]))
    const after = laid(scheduleOf([{ id: 'g1', tasks: 1 }, { id: 'g2', tasks: 1 }]))
    expect(after.rows[1]?.y).toBeCloseTo(before.rows[1]?.y ?? Number.NaN, 9)
  })
})

describe('LF-16 (HF-19 MUST): the reserve under the last scrolling row', () => {
  it('is the lattice minus the last band, inside contentHeight', () => {
    const layout = laid(scheduleOf([{ id: 'g1', tasks: 2 }, { id: 'g2', tasks: 1 }]))
    expect(layout.contentHeight, LF_16_THE_AMOUNT).toBeCloseTo(bandsOf(layout) + (LATTICE - ONE_LANE), 9)
  })

  it('reads the LAST row only: a tall row above does not cancel it', () => {
    const layout = laid(scheduleOf([{ id: 'g1', tasks: 3 }, { id: 'g2' }]))
    expect(layout.contentHeight).toBeCloseTo(bandsOf(layout) + (LATTICE - ONE_LANE), 9)
  })

  it('is 0 when the last band is at or above the lattice', () => {
    const layout = laid(scheduleOf([{ id: 'g1', tasks: 1 }, { id: 'g2', tasks: 2 }]))
    expect(layout.contentHeight, LF_16_ZERO).toBeCloseTo(bandsOf(layout), 9)
  })

  it('is 0 when there is no row at all', () => {
    expect(laid(scheduleOf([])).contentHeight, LF_16_ZERO).toBe(0)
  })

  it('is 0 when every row is lifted into the pinned band, and the pinned band gets none', () => {
    const layout = laid(scheduleOf([{ id: 'g1', tasks: 1 }]), settingsOf({ pinnedGroupIds: ['g1'] }))
    expect(layout.rows.filter((row) => row.isPinned === true), 'the premise: g1 is pinned').toHaveLength(1)
    expect(layout.contentHeight, LF_16_ZERO).toBe(0)
    expect(layout.pinnedBandHeight, 'LF-16 is not added to the pinned band').toBeCloseTo(ONE_LANE, 9)
  })

  it('reads the last SCROLLING row when a row above it is pinned', () => {
    const layout = laid(
      scheduleOf([{ id: 'g1', tasks: 1 }, { id: 'g2', tasks: 1 }]),
      settingsOf({ pinnedGroupIds: ['g1'] }),
    )
    expect(layout.pinnedBandHeight).toBeCloseTo(ONE_LANE, 9)
    expect(layout.contentHeight).toBeCloseTo(ONE_LANE + (LATTICE - ONE_LANE), 9)
  })

  it('takes the lattice the surface measured when it is taller (UF-105, decision 7)', () => {
    const measured = LATTICE + 10
    const layout = laid(scheduleOf([{ id: 'g1', tasks: 1 }]), SETTINGS, REGIONS, measured)
    expect(layout.contentHeight).toBeCloseTo(ONE_LANE + (measured - ONE_LANE), 9)
    expect(layout.rows[0]?.height, 'the measured lattice floors no band either').toBeCloseTo(ONE_LANE, 9)
  })
})

describe('FR-055 (MUST): the fit counts the LF-16 reserve', () => {
  const tree = scheduleOf([
    { id: 'r0', tasks: 1 },
    { id: 'r0.0', parentId: 'r0', tasks: 1 },
    { id: 'r1', tasks: 1 },
    { id: 'r1.0', parentId: 'r1', tasks: 1 },
  ])
  const zoom = { step: NOT_STORED_ZOOM_STEP['S-96'], min: NOT_STORED_ZOOM_BOUNDS['S-97'], max: NOT_STORED_ZOOM_BOUNDS['S-98'] }
  // see FR-018
  const depthTwoZoom = SETTINGS_DEFAULTS['groupLevelOfDetailBase'] as number
  const atDepthTwo = laid(tree, settingsOf({ zoomY: depthTwoZoom }))
  const bands = bandsOf(atDepthTwo)
  const reserve = atDepthTwo.contentHeight - bands
  const offset = ENV.height - REGIONS.rowArea.height

  const fittedDepth = (rowAreaHeight: number): number => {
    const regions = regionsFromScreen({ ...ENV, height: rowAreaHeight + offset }, SETTINGS)
    const fit = fitZoom(tree, SETTINGS, regions, zoom)
    const drawn = laid(tree, settingsOf({ zoomY: fit.zoomY }), regions)
    return drawn.rows.reduce((deepest, row) => Math.max(deepest, row.depth), 0)
  }

  it('the premise: depth 2 draws four one-lane rows and a reserve above zero', () => {
    expect(atDepthTwo.rows).toHaveLength(4)
    expect(reserve).toBeCloseTo(LATTICE - (atDepthTwo.rows[3]?.height ?? Number.NaN), 9)
    expect(reserve).toBeGreaterThan(1)
  })

  it('refuses depth 2 where the bands fit but the bands and the reserve do not', () => {
    expect(fittedDepth(bands + reserve / 2), FR_055_COUNTS_THE_RESERVE).toBe(1)
  })

  it('the control: takes depth 2 once the Row Area holds the reserve as well', () => {
    expect(fittedDepth(bands + reserve + 0.5)).toBe(2)
  })
})
