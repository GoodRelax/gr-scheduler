// LF-3 / HF-19 (CR-553): a band is set by its lanes and LF-3's floors, and never raised to the controls' lattice.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  rowControlLatticeHeightPx,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS, S_235, displayRatioAt } from '../fixtures/display-scale'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

const numberIn = (cell: string | undefined, id: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(cell ?? '')
  if (found === null) throw new Error(`${id} states no number in its default column`)
  return Number(found[0])
}

// see T-206
const t206 = (id: string): number => numberIn(rowOf('T-206', id).by['既定'], id)

// see T-201
const t201 = (id: string): number => numberIn(rowOf('T-201', id).by['既定値'], id)

const HF_19_NOT_A_FLOOR =
  '`HF-1` の格子（`HF-4` の並び。2 段）が縦に取る高さを、行の帯高の下限にしてはならない（MUST NOT）'
const HF_19_NO_SHRINKING = '格子の側を縮めて合わせてはならない（MUST NOT）'
const HF_19_THE_RESERVE =
  '最後の行の格子が画面の下端（行見出しパネルと `Row Area` の下端）で切れないよう、行の並びの下に余白を置くこと（MUST）'
const HF_1_TWO_BY_TWO = '並びは 2 × 2 の格子とすること（MUST）'
const LF_3_NOT_COUNTED =
  '行の操作子（`01-04-requirements.md` の 表 T-051 の `HF-1` の格子）が縦に取る高さは、帯高の床に数えない'
const LF_3_RECTANGLE_FLOOR = '帯高は矩形が縦に取る高さを下回らない'
const LF_2_EMPTY_LANE = '`Task` を 1 つも持たない段は、矩形が縦に取る高さとする'

// see LF-16, FR-029
const LATTICE = 2 * (t206('S-138') + t206('S-243') * 2) * S_235

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }

const settingsAt = (displayScale: number): DocumentSettings =>
  settingsOf({
    rulerHeight: 48,
    scrollDate: '2026-01-01',
    rulerFont: 12,
    stackDirection: 'down',
    shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1.5 },
    displayScale,
  })

const ZOOM_Y = settingsAt(DEFAULT_DISPLAY_SCALE).zoomY

// see FR-094, VG-5
const rectangleAt = (step: number): number => {
  const ratio = displayRatioAt(step)
  const plan = Math.max((t201('S-6') * ratio) / t201('S-5'), t201('S-4') * ratio * ZOOM_Y) * t201('S-13')
  return plan + t201('S-39') * ratio
}

// see VG-2, VG-3, VG-4
const gapAt = (step: number): number => t201('S-11') * 2 + t201('S-18') * displayRatioAt(step)

// see LF-3, FR-085
const nameBoxAt = (step: number): number => t201('S-36') * displayRatioAt(step) * t201('S-38')

// see LF-2
const oneLaneAt = (step: number): number => rectangleAt(step) + gapAt(step)

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    highlightBoxes: [],
    commentBoxes: [],
    ...part,
  }) as unknown as Schedule

const oneRow = (tasks: readonly Task[], group: Record<string, unknown> = {}): Schedule =>
  scheduleOf({
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null, ...group }],
    taskGroupMembers: tasks.map((one) => ({ groupId: 'g1', taskUid: one.uid })),
  })

const spanning = (uid: number, from: string, days: number): Task => {
  const finish = new Date(new Date(`${from}T00:00:00Z`).getTime() + days * 86400000)
  return taskOf({ uid, start: from, finish: finish.toISOString().slice(0, 10) })
}

const layoutAt = (schedule: Schedule, step = DEFAULT_DISPLAY_SCALE) => {
  const settings = settingsAt(step)
  return layoutFromSchedule(schedule, settings, regionsFromScreen(ENV, settings))
}

const heightsOf = (schedule: Schedule, step = DEFAULT_DISPLAY_SCALE): readonly number[] =>
  layoutAt(schedule, step).rows.map((one) => one.height)

describe('the manuscript these cases read', () => {
  it('HF-19 (MUST NOT): the lattice is not the floor of a band, and the controls are not shrunk instead', () => {
    expect(says('T-051', 'HF-19')).toContain(HF_19_NOT_A_FLOOR)
    expect(says('T-051', 'HF-19')).toContain(HF_19_NO_SHRINKING)
    expect(says('T-051', 'HF-19')).toContain(HF_19_THE_RESERVE)
    expect(says('T-051', 'HF-1')).toContain(HF_1_TWO_BY_TWO)
  })

  it('LF-3 leaves the lattice out of its floors and keeps the rectangle; LF-2 gives an empty lane the rectangle', () => {
    expect(says('T-221', 'LF-3')).toContain(LF_3_NOT_COUNTED)
    expect(says('T-221', 'LF-3')).toContain(LF_3_RECTANGLE_FLOOR)
    expect(says('T-221', 'LF-2')).toContain(LF_2_EMPTY_LANE)
  })

  it('LF-16 composes the lattice as two rungs of S-138 + 2 x S-243 at S-235, and PI-35 answers the same', () => {
    expect(t206('S-138') + t206('S-243') * 2, 'S-138 and S-243 as table T-206 prints them').toBe(18)
    expect(S_235).toBe(0.6667)
    expect(LATTICE).toBeCloseTo(24.0012, 9)
    expect(rowControlLatticeHeightPx(), 'PI-35 rowControlLatticeHeightPx').toBeCloseTo(LATTICE, 9)
  })
})

describe('HF-19 (MUST NOT) / LF-3: the lattice never floors a band', () => {
  it('a one-lane rectangle row is its lane and one VG-2 gap, which stands below the lattice', () => {
    const [height] = heightsOf(oneRow([spanning(1, '2026-01-05', 20)]))
    expect(oneLaneAt(DEFAULT_DISPLAY_SCALE), 'the premise: one lane is lower than the lattice').toBeLessThan(LATTICE)
    expect(height, `${HF_19_NOT_A_FLOOR} -- LF-2`).toBeCloseTo(oneLaneAt(DEFAULT_DISPLAY_SCALE), 9)
    expect(height, 'decision 1 of CR-553, as a cross-check').toBeCloseTo(21.625, 9)
  })

  it('a row holding no Task is one rectangle lane and one VG-2 gap (LF-2, SWS-2), not the lattice', () => {
    const [height] = heightsOf(oneRow([]))
    expect(height, `${LF_2_EMPTY_LANE} -- ${HF_19_NOT_A_FLOOR}`).toBeCloseTo(oneLaneAt(DEFAULT_DISPLAY_SCALE), 9)
    expect(height).toBeLessThan(LATTICE)
  })

  it('so is every row of a board built only of rows that hold no Task', () => {
    const many = 5
    const schedule = scheduleOf({
      taskGroups: Array.from({ length: many }, (_unused, index) => ({
        id: `g${index + 1}`,
        parentId: null,
        order: index,
        height: null,
      })),
    })
    const heights = heightsOf(schedule)
    expect(heights, 'the board did not draw every row').toHaveLength(many)
    for (const [index, height] of heights.entries()) {
      expect(height, `row ${index + 1} of ${many}`).toBeCloseTo(oneLaneAt(DEFAULT_DISPLAY_SCALE), 9)
    }
  })

  it('a stated height (FR-042) below the lattice is kept as a floor and not raised to the lattice', () => {
    const [height] = heightsOf(oneRow([], { height: 1 }))
    expect(height, `a row that asked for 1px -- ${HF_19_NOT_A_FLOOR}`).toBeCloseTo(
      oneLaneAt(DEFAULT_DISPLAY_SCALE),
      9,
    )
  })

  it('the control: a stated height above the lattice is kept (FR-042)', () => {
    const tall = LATTICE * 3
    const [height] = heightsOf(oneRow([], { height: tall }))
    expect(height).toBe(tall)
  })

  it.each(DISPLAY_SCALE_STEPS)('at display scale %s a one-lane row is the larger of LF-2 and the LF-3 floors, never the lattice', (step) => {
    const [height] = heightsOf(oneRow([spanning(1, '2026-01-05', 20)]), step)
    const expected = Math.max(oneLaneAt(step), rectangleAt(step), nameBoxAt(step))
    expect(height, `display scale ${step}`).toBeCloseTo(expected, 9)
    if (expected < LATTICE) expect(height, `${HF_19_NOT_A_FLOOR} at display scale ${step}`).toBeLessThan(LATTICE)
  })

  it('HF-19 control: a two-lane row is taller than the lattice anyway, and is exactly two lanes and two gaps', () => {
    const [height] = heightsOf(oneRow([spanning(1, '2026-01-05', 20), spanning(2, '2026-01-06', 20)]))
    expect(height).toBeCloseTo(2 * oneLaneAt(DEFAULT_DISPLAY_SCALE), 9)
    expect(height).toBeGreaterThan(LATTICE)
  })
})

describe('LF-16 / HF-19 (MUST): the lattice is room under the last row instead', () => {
  it('two one-lane rows reserve the lattice minus the last band below them, inside contentHeight', () => {
    const schedule = scheduleOf({
      tasks: [spanning(1, '2026-01-05', 20), spanning(2, '2026-01-05', 20)],
      taskGroups: [
        { id: 'g1', parentId: null, order: 0, height: null },
        { id: 'g2', parentId: null, order: 1, height: null },
      ],
      taskGroupMembers: [
        { groupId: 'g1', taskUid: 1 },
        { groupId: 'g2', taskUid: 2 },
      ],
    })
    const layout = layoutAt(schedule)
    const bands = layout.rows.reduce((sum, row) => sum + row.height, 0)
    const reserve = LATTICE - oneLaneAt(DEFAULT_DISPLAY_SCALE)
    expect(reserve, 'the premise: the last band is lower than the lattice').toBeGreaterThan(0)
    expect(layout.contentHeight, HF_19_THE_RESERVE).toBeCloseTo(bands + reserve, 9)
  })
})
