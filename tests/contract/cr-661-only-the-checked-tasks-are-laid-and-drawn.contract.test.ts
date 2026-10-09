// CR-661 spec-only tests: the shown set decides the lanes (FR-003), the rows (TD-8), what is laid (TV-3) and the unseen ends (EL-20, FR-135).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { blankTaskVisual } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout, type ScheduleGeometry } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ParentTaskFamilies } from '../../src/entity/layout-engine/schedule-geometry/parent-task-arrows'
import { drawnGroups } from '../../src/entity/layout-engine/schedule-layout/drawn-task-groups'
import { layoutFromSchedule, type ScheduleLayout } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'

import { unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_003_LANES = '表示の絞り込み（`FR-151` の 表 T-353）のあいだは、描くタスクだけで段を割り当てること（MUST）'
const TD_8_KEEPS_TREE_STATE = '⛔ この条件のために `treeState` を書き換えてはならない（MUST NOT）'
const TD_8_ANCESTORS = '⭐ 祖先は、子孫にチェックしたタスクがあるので見出しとして描かれる。'
const TV_3_NOT_FAINT = '「描かれていないタスク」）。⛔ 薄く描いてはならない（MUST NOT）'
const EL_20_FILTERED_END =
  '⭐ 端の `Task` が表示の絞り込み（`FR-151` の 表 T-353 の `TV-3`）で描かれないときも、その端は見えていない端とすること（MUST）'
const EL_20_TASK_GROUP_DRAWN = '載るタスクグループが描かれていても同じである'
const EL_20_NOT_DROPPED = '⛔ 立つ所が無いとして線を落としてはならない（MUST NOT）'
const FR_135_FILTERED_END =
  '家族の矢印の片方の端のタスクが表示の絞り込み（`FR-151` の 表 T-353 の `TV-3`）で描かれないときは、依存線の見えていない端（表 T-303 の `EL-20`）と同じく、見えている側に短い線と続きの印を描くこと（MUST）'
const FR_135_ONE_MANNER = '同じ「見えない端」の作法を 2 種の線で分けない。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-003 (MUST) lanes from the drawn tasks only', FR_003_LANES],
  ['TD-8 (MUST NOT) treeState is not written', TD_8_KEEPS_TREE_STATE],
  ['TD-8 ancestors stand as headings', TD_8_ANCESTORS],
  ['TV-3 (MUST NOT) not drawn faint', TV_3_NOT_FAINT],
  ['EL-20 (MUST) a filtered end is an unseen end', EL_20_FILTERED_END],
  ['EL-20 even on a drawn row', EL_20_TASK_GROUP_DRAWN],
  ['EL-20 (MUST NOT) the line is not dropped', EL_20_NOT_DROPPED],
  ['FR-135 (MUST) a family arrow with a filtered end', FR_135_FILTERED_END],
  ['FR-135 one manner for both lines', FR_135_ONE_MANNER],
]

describe('CR-661 the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('01-04 still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

// WHY: January 2026; Alpha and Bravo overlap in row C so the row stacks two lanes, Charlie sits alone in row Q.
const day = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}T00:00:00`

const TASK_GROUP_P = '5c000000-0000-4000-8000-000000006610'
const TASK_GROUP_C = '5c000000-0000-4000-8000-000000006611'
const TASK_GROUP_Q = '5c000000-0000-4000-8000-000000006612'
const ALPHA = 1
const BRAVO = 2
const CHARLIE = 3

const taskRow = (uid: number, name: string, from: number, to: number, part: Record<string, unknown> = {}): Record<string, unknown> => ({
  uid,
  parentTaskUid: null,
  wbsOrder: uid,
  name,
  start: day(from),
  finish: day(to),
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

const taskGroup = (id: string, parentId: string | null, label: string, order: number, treeState: string): Record<string, unknown> => ({
  id,
  parentId,
  label,
  derivedFromTaskUid: null,
  order,
  treeState,
  color: null,
  minHeight: null,
})

const FS = { predecessorUid: ALPHA, linkType: 1, lag: 0, lagFormat: 7, carry: {}, carryElements: [] }

function readDocument(parentState: string): Document {
  const tasks = [
    taskRow(ALPHA, 'Alpha', 5, 9),
    taskRow(BRAVO, 'Bravo', 6, 8, { parentTaskUid: ALPHA }),
    taskRow(CHARLIE, 'Charlie', 12, 14, { dependencies: [FS] }),
  ]
  const text = JSON.stringify({
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE['schemaVersion'],
    schedule: {
      project: { ...TEMPLATE['schedule']['project'], uidHighWaterMark: 100, statusDate: null },
      calendars: TEMPLATE['schedule']['calendars'],
      tasks,
      resources: [],
      assignments: [],
      taskGroups: [taskGroup(TASK_GROUP_P, null, 'P', 0, parentState), taskGroup(TASK_GROUP_C, TASK_GROUP_P, 'C', 1, 'auto'), taskGroup(TASK_GROUP_Q, null, 'Q', 2, 'auto')],
      taskGroupMembers: [
        { taskUid: ALPHA, groupId: TASK_GROUP_C },
        { taskUid: BRAVO, groupId: TASK_GROUP_C },
        { taskUid: CHARLIE, groupId: TASK_GROUP_Q },
      ],
      taskVisuals: tasks.map((one) => blankTaskVisual(one['uid'] as number)),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...TEMPLATE['documentSettings'], scrollDate: day(1), scrollDayOffset: 0, zoomX: 6 },
    documentStamp: TEMPLATE['documentStamp'],
    changeLog: [],
  })
  const read = documentFromJson(text, TEMPLATE['schemaVersion'] as string)
  if (!read.ok) throw new Error(`the fixture was refused: ${JSON.stringify(read.faults).slice(0, 400)}`)
  return read.document
}

const OPEN = readDocument('expanded')
const FOLDED = readDocument('collapsed')

const ENV: ScreenEnvironment = { width: 1600, height: 900, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }

const settingsOf = (document: Document): DocumentSettings => document.documentSettings

const layoutOf = (document: Document, shown: readonly number[] | null): ScheduleLayout => {
  const settings = settingsOf(document)
  const regions = regionsFromScreen(ENV, settings)
  return layoutFromSchedule(document.schedule, settings, regions, undefined, undefined, shown === null ? null : new Set(shown))
}

// WHY: Bravo states Alpha as its parent task; the family is drawn for Bravo as its owner (FR-135).
const FAMILIES: ParentTaskFamilies = {
  resolutions: new Map([[BRAVO, { kind: 'stated', parentUid: ALPHA }]]),
  ownerUids: [BRAVO],
  pointedUid: null,
  selectedLinkChildUids: new Set(),
}

const geometryOf = (document: Document, shown: readonly number[] | null): ScheduleGeometry => {
  const settings = settingsOf(document)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutOf(document, shown)
  return geometryFromLayout(document.schedule, settings, layout, regions, emptySelection(), null, undefined, FAMILIES)
}

const rowOf = (layout: ScheduleLayout, id: string) => layout.taskGroups.find((one) => one.groupId === id)

describe(`FR-003 (MUST): ${FR_003_LANES}`, () => {
  it('unfiltered, the overlapping Alpha and Bravo stack two lanes in row C', () => {
    expect(rowOf(layoutOf(OPEN, null), TASK_GROUP_C)?.stackCount).toBe(2)
  })

  it('with only Alpha checked, row C stacks one lane and its height follows that count', () => {
    const whole = rowOf(layoutOf(OPEN, null), TASK_GROUP_C)
    const narrowed = rowOf(layoutOf(OPEN, [ALPHA, CHARLIE]), TASK_GROUP_C)
    expect(narrowed?.stackCount).toBe(1)
    expect(narrowed?.height ?? 0).toBeLessThan(whole?.height ?? 0)
  })

  it('with only Bravo checked, Bravo takes the first lane instead of the one beside the hidden Alpha', () => {
    const laid = layoutOf(OPEN, [BRAVO]).placements.find((one) => one.taskUid === BRAVO)
    expect(laid?.stack).toBe(0)
  })
})

describe(`TD-8 (MUST NOT): ${TD_8_KEEPS_TREE_STATE}`, () => {
  it('a row with no checked task at or below it is not drawn; the ancestor of a checked task is', () => {
    const ids = (shown: readonly number[]): string[] =>
      drawnGroups(OPEN.schedule, OPEN.documentSettings, new Set(shown)).map((one) => one.id)
    expect(ids([CHARLIE])).toEqual([TASK_GROUP_Q])
    expect(ids([BRAVO])).toEqual([TASK_GROUP_P, TASK_GROUP_C])
  })

  it('narrowing writes no treeState: the document is byte for byte what it was', () => {
    const before = JSON.stringify(OPEN)
    layoutOf(OPEN, [CHARLIE])
    geometryOf(OPEN, [CHARLIE])
    expect(JSON.stringify(OPEN)).toBe(before)
    expect(OPEN.schedule.taskGroups.map((one) => one.treeState)).toEqual(['expanded', 'auto', 'auto'])
  })

  it('a folded ancestor is not opened by the narrowing itself: the other rows of T-329 still apply', () => {
    const ids = drawnGroups(FOLDED.schedule, FOLDED.documentSettings, new Set([ALPHA])).map((one) => one.id)
    expect(ids).toContain(TASK_GROUP_P)
    expect(ids).not.toContain(TASK_GROUP_C)
    expect(FOLDED.schedule.taskGroups[0]?.treeState).toBe('collapsed')
  })
})

describe(`TV-3 (MUST NOT): ${TV_3_NOT_FAINT}`, () => {
  it('an unchecked task is not laid and has no geometry, so nothing of it can be drawn faint', () => {
    const shown = [ALPHA, CHARLIE]
    expect(layoutOf(OPEN, shown).placements.map((one) => one.taskUid).sort()).toEqual([ALPHA, CHARLIE])
    expect(geometryOf(OPEN, shown).tasks.map((one) => one.taskUid)).not.toContain(BRAVO)
  })
})

describe(`EL-20 (MUST): ${EL_20_FILTERED_END}`, () => {
  const linkOf = (geometry: ScheduleGeometry) =>
    geometry.dependencies.find((one) => one.predecessorUid === ALPHA && one.successorUid === CHARLIE)

  it('both ends checked: the line runs end to end with no continuation mark', () => {
    expect(linkOf(geometryOf(OPEN, [ALPHA, CHARLIE]))?.continuation ?? null).toBeNull()
  })

  // WHY: row Q is left undrawn by TD-8 and has no drawn ancestor, so the end stands per EL-20's earlier rule.
  it(`Charlie unchecked and row Q undrawn: ${EL_20_NOT_DROPPED}`, () => {
    const link = linkOf(geometryOf(OPEN, [ALPHA]))
    expect(link?.continuation?.farUid).toBe(CHARLIE)
    expect(link?.continuation?.dots.length ?? 0).toBeGreaterThan(0)
  })

  it(`Alpha unchecked while its row C is drawn for Bravo: ${EL_20_TASK_GROUP_DRAWN}`, () => {
    const geometry = geometryOf(OPEN, [BRAVO, CHARLIE])
    expect(geometry.tasks.map((one) => one.taskUid)).not.toContain(ALPHA)
    const link = linkOf(geometry)
    expect(link?.continuation?.farUid).toBe(ALPHA)
    expect(link?.continuation?.dots.length ?? 0).toBeGreaterThan(0)
  })
})

describe(`FR-135 (MUST): ${FR_135_FILTERED_END}`, () => {
  const arrowOf = (geometry: ScheduleGeometry) => geometry.parentTasks?.arrows.find((one) => one.childUid === BRAVO)

  it('both ends drawn: the family arrow carries no continuation mark', () => {
    expect(arrowOf(geometryOf(OPEN, null))?.continuationDots ?? []).toEqual([])
  })

  it.each([
    ['the parent Alpha is unchecked (the child Bravo is seen)', [BRAVO, CHARLIE]],
    ['the child Bravo is unchecked (the parent Alpha is seen)', [ALPHA, CHARLIE]],
  ] as const)('%s: a short line and the continuation dots are drawn from the seen end', (_name, shown) => {
    const arrow = arrowOf(geometryOf(OPEN, shown))
    expect(arrow).toBeDefined()
    expect(arrow?.points.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(arrow?.continuationDots?.length ?? 0).toBeGreaterThan(0)
  })

  it(`${FR_135_ONE_MANNER} -- the same dot count and dot radius as the dependency line's mark`, () => {
    const geometry = geometryOf(OPEN, [BRAVO, CHARLIE])
    const arrow = arrowOf(geometry)
    const mark = geometry.dependencies.find((one) => one.continuation !== null)?.continuation
    expect(mark).toBeDefined()
    expect(arrow?.continuationDots?.length).toBe(mark?.dots.length)
    expect(arrow?.continuationRadius).toBeCloseTo(mark?.radius ?? -1, 6)
  })
})
