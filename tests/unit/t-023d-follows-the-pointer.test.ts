// Unit tests: a held grab of table T-023d follows the pointer and settles on the release.

/* eslint-disable @typescript-eslint/no-explicit-any -- the cases read frame and document fields no public type names */

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type {
  BarGeometry,
  Point,
  TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from '../contract/spec-table'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readRepoFile(join(SPEC, '01-04-requirements.md'), 'utf8')).split('\n')

const rowIdsIn = (text: string): readonly string[] => text.match(/GR-\d+/g) ?? []

// Summary: The paragraph holding the words, its per-sentence line breaks joined with nothing between.
function paragraphHolding(words: string): string | undefined {
  const at = REQUIREMENTS.findIndex((line) => line.includes(words))
  if (at < 0) return undefined
  let from = at
  while (from > 0 && (REQUIREMENTS[from - 1] ?? '').trim() !== '') from -= 1
  const said: string[] = []
  for (const line of REQUIREMENTS.slice(from)) {
    if (line.trim() === '') break
    said.push(line.trim())
  }
  return said.join('')
}

function closingRuleLine(): string {
  const found = paragraphHolding('を掴んでいるあいだ、置くことになる姿を、ポインタに追従させて描いて示すこと')
  if (found === undefined) {
    throw new Error('table T-023d no longer states the closing rule this file is about')
  }
  return found
}

function writeBanLine(): string {
  const found = paragraphHolding('を掴んでいるあいだ値を文書へ書いてはならない')
  if (found === undefined) {
    throw new Error('table T-023d no longer forbids a write while a grab is held')
  }
  return found
}

// Why: the rows are read out of the sentence, not copied, so a row the rule gains or loses
// turns these cases red instead of leaving a stale list passing.
function closingRuleRows(): readonly string[] {
  const rule = closingRuleLine()
  // Why: the sentence and not the paragraph, because a row named by a neighbouring
  // sentence is not a row this rule names.
  const at = rule.indexOf('を掴んでいるあいだ')
  const head = rule.slice(rule.lastIndexOf('。', at) + 1, at)
  return rowIdsIn(head)
}

function exemptLine(): string {
  const found = paragraphHolding('操作 の欄が')
  if (found === undefined) {
    throw new Error('table T-023d no longer states which rows follow and which do not')
  }
  return found
}

function exemptSegment(): string {
  const line = exemptLine()
  const from = line.indexOf('残る行が追従しないのは')
  const to = line.indexOf('⚠', from)
  if (from < 0 || to < 0) throw new Error('the exempt list is no longer where this file reads it')
  return line.slice(from, to)
}

const exemptRows = (): readonly string[] => rowIdsIn(exemptSegment())

// Spec: GA-7, GA-8, GA-5, GA-6, GA-17
function coveredElsewhereRows(): readonly string[] {
  const line = exemptLine()
  const from = line.indexOf('⚠', line.indexOf('残る行が追従しないのは'))
  if (from < 0) throw new Error('the paragraph no longer names the rows the other rules cover')
  return rowIdsIn(line.slice(from))
}

const FOLLOWING_ROWS = closingRuleRows()

// Spec: FR-052, GR-22
// Why: GR-22 joined T-023d with an operation cell that sends the held picture to FR-052, and none
// of the three closing sentences of T-023d names it; FR-052 states that MUST itself.
const FR_052_HELD_PICTURE =
  '境界を掴んでいる間、`GRS` は、`IMPS-1785`・`IMPS-1794` の場合と、タスクグループパネルの幅が床を下回る場合を除き、境界を掴んでいる時点のポインタ位置が決める 2 つの幅で画面を描くこと。'

function followedByFr052Rows(): readonly string[] {
  return specTable('T-023d')
    .rows.filter((one) => (one.by['操作'] ?? '').includes('`FR-052`'))
    .map((one) => one.id)
}

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readRepoFile(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const TASK_GROUP_A = '2a000000-0000-4000-8000-000000000001'
const TASK_GROUP_B = '2a000000-0000-4000-8000-000000000002'
const TASK_GROUP_C = '2a000000-0000-4000-8000-000000000003'
const TASK_GROUP_D = '2a000000-0000-4000-8000-000000000004'
const TASK_GROUP_E = '2a000000-0000-4000-8000-000000000005'

const PLAIN_UID = 1
const MILESTONE_UID = 3
const SUSPENDED_UID = 4
const OVERFLOW_UID = 900

const BOX_ID = '2b000000-0000-4000-8000-000000000001'

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

const dayOf = (stored: string | null): string => {
  if (stored === null) throw new Error('the column this case reads holds nothing')
  return stored.slice(0, 10)
}

const PLAIN_START = day(6)
const PLAIN_FINISH = day(24)
const PLAIN_ACTUAL_START = day(9)
const PLAIN_ACTUAL_LAST_DAY = day(14)

const MILESTONE_DAY = day(13)
const MILESTONE_ACTUAL_START = day(17)

const SUSPENDED_START = day(3)
const SUSPENDED_FINISH = day(27)
const SUSPENDED_ACTUAL_START = day(6)
const SUSPENDED_RESUME = day(20)

const STATUS_DATE = day(22)
const BOX_ANCHOR = day(6)

// Why: the drawn day width is set wide so that one day spans enough pixels to press and to measure.
const PX_PER_DAY_AT_1X = 20

function task(over: Partial<Task> & { readonly uid: number }): Task {
  return {
    parentTaskUid: null,
    wbsOrder: over.uid,
    name: null,
    start: null,
    finish: null,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...over,
  } as unknown as Task
}

const group = (id: string, order: number, label: string): unknown => ({
  id,
  parentId: null,
  name: label,
  derivedFromTaskUid: null,
  order,
  treeState: 'auto', color: null,
  minHeightPx: null,
})

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        // Why: GR-16 needs a status line to grab, and CU-1 draws one only while
        // Project.statusDate holds a value.
        statusDate: STATUS_DATE,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        // Why: actualStart is later than start and the actual end inside the plan end, because the
        // table prefers GA-1 / GA-2 to GA-3 / GA-4 and coinciding ends would hide the actual pair.
        task({
          uid: PLAIN_UID,
          name: 'Alpha',
          start: PLAIN_START,
          finish: PLAIN_FINISH,
          actualStart: PLAIN_ACTUAL_START,
          stop: PLAIN_ACTUAL_LAST_DAY,
          percentComplete: 25,
        }),
        // Why: the milestone's actual stands on another day so the plan and actual figures do not overlap.
        task({
          uid: MILESTONE_UID,
          name: 'Gamma',
          start: MILESTONE_DAY,
          finish: MILESTONE_DAY,
          milestone: true,
          actualStart: MILESTONE_ACTUAL_START,
          stop: MILESTONE_ACTUAL_START,
        }),
        // Why: suspended with a resume date is the only state that draws the resume icon GA-20 grabs.
        task({
          uid: SUSPENDED_UID,
          name: 'Delta',
          start: SUSPENDED_START,
          finish: SUSPENDED_FINISH,
          actualStart: SUSPENDED_ACTUAL_START,
          stop: day(8),
          actualFinish: null,
          resume: SUSPENDED_RESUME,
          resumeValid: true,
          percentComplete: 15,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        group(TASK_GROUP_A, 0, 'A'),
        // Why: empty on purpose, so GA-9's vertical drag has a task group to land on and the
        // membership that changes is the only one in it.
        group(TASK_GROUP_B, 1, 'B'),
        group(TASK_GROUP_C, 2, 'C'),
        group(TASK_GROUP_D, 3, 'D'),
        // Why: also empty, so no Task's bar can outrank the comment box GR-14 grabs or the
        // point GR-16's line is pressed at.
        group(TASK_GROUP_E, 4, 'E'),
      ],
      taskGroupMembers: [
        { taskUid: PLAIN_UID, taskGroupId: TASK_GROUP_A },
        { taskUid: MILESTONE_UID, taskGroupId: TASK_GROUP_C },
        { taskUid: SUSPENDED_UID, taskGroupId: TASK_GROUP_D },
      ],
      taskVisuals: [],
      commentBoxes: [
        {
          id: BOX_ID,
          leaderShapeKind: 'polyline',
          text: 'Note',
          anchorDate: BOX_ANCHOR,
          anchorTaskGroupId: TASK_GROUP_E,
          bodyOffsetPx: null,
        },
      ],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      // Why: S-1 is a constant; the stored zoomX (S-75) carries the day width this fixture draws at.
      zoomX: PX_PER_DAY_AT_1X / SETTINGS_CONSTANTS.pxPerDayAt1x,
      isProgressMarkerVisible: true, // Spec: S-63
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  return draft as unknown as Document
}

const taskOf = (loop: FrameLoop, uid: number): Task => {
  const found = loop.document().schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`the document has no Task ${uid}`)
  return found
}

const memberGroupOf = (loop: FrameLoop, uid: number): string => {
  const found = (loop.document().schedule as any).taskGroupMembers.find(
    (one: any) => one.taskUid === uid,
  )
  if (found === undefined) throw new Error(`Task ${uid} is on no task group`)
  return found.taskGroupId as string
}

const storedBoxOf = (loop: FrameLoop): any => {
  const found = (loop.document().schedule as any).commentBoxes.find((one: any) => one.id === BOX_ID)
  if (found === undefined) throw new Error('the document has no comment box')
  return found
}

const statusDateOf = (loop: FrameLoop): string | null =>
  (loop.document().schedule as any).project.statusDate

const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 700,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

// Summary: The host drains the animation-frame queue node lacks and decides nothing about presses, pictures or documents.
function host(): Host {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      // Why: bounded, so a loop that asks for a frame from inside a frame (NFR-010 forbids it)
      // ends the test instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

// Why: null everywhere, because every press below lands on the schedule's drawing area,
// where table T-023d rules, and a press the surface answers for is on an entry instead.
function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  return { surface, language }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
}

function stage(): Stage {
  const pen = host()
  const loop = frameLoop(pen.surface as any, fixtureDocument(), SCREEN, screenPane())
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  // Why: the first frame is owed by making the loop, not by any input, so it is drained
  // before any case reads current().
  pen.runAnimationFrames()
  return { loop, send }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const pxPerDay = (loop: FrameLoop): number => (frameOf(loop).layout as any).pxPerDay as number

function bandOf(loop: FrameLoop, taskGroupId: string): { readonly y: number; readonly height: number } {
  const found = (frameOf(loop).layout as any).taskGroups.find((one: any) => one.taskGroupId === taskGroupId)
  if (found === undefined) throw new Error(`the frame drew no band for task group ${taskGroupId}`)
  return { y: found.y as number, height: found.height as number }
}

const drawnTask = (loop: FrameLoop, uid: number): TaskGeometry => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not in this frame`)
  return found
}

interface Box {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

function boxOfBar(bar: BarGeometry | null, what: string): Box {
  if (bar === null) throw new Error(`${what} is not drawn`)
  const points: readonly Point[] =
    bar.form === 'outline'
      ? bar.points
      : [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((one) => one.at)]
  if (points.length === 0) throw new Error(`${what} came out with no points`)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

const midY = (box: Box): number => (box.y0 + box.y1) / 2
const midX = (box: Box): number => (box.x0 + box.x1) / 2

const planBox = (loop: FrameLoop, uid: number): Box =>
  boxOfBar(drawnTask(loop, uid).plan, `Task ${uid}'s plan bar`)
const actualBox = (loop: FrameLoop, uid: number): Box =>
  boxOfBar(drawnTask(loop, uid).actual, `Task ${uid}'s actual figure`)

function centroid(points: readonly Point[], what: string): Point {
  if (points.length === 0) throw new Error(`${what} was drawn with no points`)
  const x = points.reduce((sum, one) => sum + one.x, 0) / points.length
  const y = points.reduce((sum, one) => sum + one.y, 0) / points.length
  return { x, y }
}

function markerOf(loop: FrameLoop, uid: number) {
  const found = drawnTask(loop, uid).marker
  if (found === null) throw new Error(`Task ${uid} has no progress marker drawn`)
  return found
}

function resumeOf(loop: FrameLoop, uid: number) {
  const found = drawnTask(loop, uid).resume
  if (found === null) throw new Error(`Task ${uid} has no resume icon drawn`)
  return found
}

// Why: the arrow head and not the whole icon, because GA-18 outranks GA-20 and a point
// averaged over the whole icon could fall back inside the marker's circle.
const resumePoint = (loop: FrameLoop, uid: number): Point =>
  centroid(resumeOf(loop, uid).head, `Task ${uid}'s resume icon head`)

function commentOf(loop: FrameLoop) {
  const found = frameOf(loop).geometry.commentBoxes.find((one) => one.id === BOX_ID)
  if (found === undefined) throw new Error('the frame drew no comment box')
  return found
}

function statusLineOf(loop: FrameLoop) {
  const found = frameOf(loop).geometry.statusLine
  if (found === null) throw new Error('the frame drew no status line')
  return found
}

interface Follower {
  readonly row: string
  readonly area: string
  readonly press: (loop: FrameLoop) => Point
  readonly reads: (loop: FrameLoop) => number
}

// Why: every press point is taken from the drawn picture, never a number, because the grab
// allowances live in table T-206 and a drawn edge or centre is inside any of them.
const FOLLOWERS: readonly Follower[] = [
  {
    row: 'GA-1',
    area: '予定の開始点 -- 予定バーの左端',
    press: (loop) => ({ x: planBox(loop, PLAIN_UID).x0, y: midY(planBox(loop, PLAIN_UID)) }),
    reads: (loop) => planBox(loop, PLAIN_UID).x0,
  },
  {
    row: 'GA-2',
    area: '予定の終了点 -- 予定バーの右端',
    press: (loop) => ({ x: planBox(loop, PLAIN_UID).x1, y: midY(planBox(loop, PLAIN_UID)) }),
    reads: (loop) => planBox(loop, PLAIN_UID).x1,
  },
  {
    row: 'GA-3',
    area: '実績の開始点 -- 実績バーの左端',
    press: (loop) => ({ x: actualBox(loop, PLAIN_UID).x0, y: midY(actualBox(loop, PLAIN_UID)) }),
    reads: (loop) => actualBox(loop, PLAIN_UID).x0,
  },
  {
    row: 'GA-4',
    area: '実績の終了点 -- 実績バーの右端',
    press: (loop) => ({ x: actualBox(loop, PLAIN_UID).x1, y: midY(actualBox(loop, PLAIN_UID)) }),
    reads: (loop) => actualBox(loop, PLAIN_UID).x1,
  },
  {
    row: 'GA-20',
    area: '再開アイコン -- マーカーのさらに外側',
    press: (loop) => resumePoint(loop, SUSPENDED_UID),
    reads: (loop) => centroid(resumeOf(loop, SUSPENDED_UID).head, 'the resume icon head').x,
  },
  {
    row: 'GA-9',
    area: '予定バー本体 -- 端点を除いた中間',
    // Why: four days in from the right end is clear of GA-2 and of GA-4, so the press
    // cannot be claimed by a row the table prefers to this one.
    press: (loop) => ({
      x: planBox(loop, PLAIN_UID).x1 - 4 * pxPerDay(loop),
      y: midY(planBox(loop, PLAIN_UID)),
    }),
    reads: (loop) => planBox(loop, PLAIN_UID).x0,
  },
  {
    row: 'GR-14',
    area: 'コメントボックス -- 本体',
    press: (loop) => {
      const body = commentOf(loop).body
      return { x: body.x + body.width / 2, y: body.y + body.height / 2 }
    },
    reads: (loop) => commentOf(loop).body.x,
  },
  {
    row: 'GA-16',
    area: '実績のマイルストーン -- 実績の図形の上',
    press: (loop) => ({
      x: midX(actualBox(loop, MILESTONE_UID)),
      y: midY(actualBox(loop, MILESTONE_UID)),
    }),
    reads: (loop) => midX(actualBox(loop, MILESTONE_UID)),
  },
  {
    row: 'GR-16',
    area: '基準日線 -- 線の上',
    // Why: pressed on the empty task group, since GR-16 is the last row and a point where the
    // line crosses a bar belongs to GA-9; the comment box stands far to the left.
    press: (loop) => {
      const band = bandOf(loop, TASK_GROUP_E)
      return { x: statusLineOf(loop).x, y: band.y + band.height / 2 }
    },
    reads: (loop) => statusLineOf(loop).x,
  },
]

const GRIP_ROW = 'GR-21'

const TRAVEL_DAYS = 4

// Spec: T-023d, FR-031
describe('the manuscript still states the rule this file is about', () => {
  it('names the four rows table T-023d kept, with every schedule shape behind GR-23', () => {
    expect(
      FOLLOWING_ROWS,
      'table T-023d: the closing rule that makes a held grab follow the pointer',
    ).toEqual(['GR-23', 'GR-14', 'GR-16', 'GR-21'])
    expect(
      closingRuleLine(),
      'the schedule shapes the cases below drive stand behind GR-23',
    ).toContain('日程の形（`GR-23`）')
  })

  it('is a MUST, and forbids a write while the button is down (MUST NOT)', () => {
    const line = closingRuleLine()
    expect(line, 'table T-023d: ……描いて示すこと（MUST）').toContain('（MUST）')
    expect(
      writeBanLine(),
      'table T-023d: 掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）',
    ).toContain('掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）')
    expect(writeBanLine(), 'table T-023d: the ban cites `FR-031`').toContain('`FR-031`')
    for (const row of closingRuleRows()) {
      expect(writeBanLine(), `table T-023d: the write ban no longer names ${row}`).toContain(
        `\`${row}\``,
      )
    }
    expect(line, 'table T-023d: 確定は 表 T-028 の `IN-1` に従う（離した時点）').toContain(
      '表 T-028 の `IN-1`',
    )
  })

  it('makes the plan body follow vertically as well (MUST), for the task group re-seating of HM-3', () => {
    const line = closingRuleLine()
    expect(line, 'table T-023d: 予定の本体は縦にも追従すること（MUST）').toContain(
      '予定の本体は縦にも追従すること（MUST）',
    )
    expect(
      line,
      'the reason it gives: タスクグループの載せ替え（表 T-015a の `HM-3`）は縦の移動そのもの',
    ).toContain('表 T-015a の `HM-3`')
  })

  it('leaves no row of table T-023d unaccounted for (MUST NOT)', () => {
    // Trap: weakening this to not.toContain or to a subset check lets a new T-023d row join
    // the table with no closing sentence accounting for it.
    const every = specTable('T-023d').rows.map((one) => one.id)
    expect(REQUIREMENTS.join('\n'), 'FR-052 still owes the held picture GR-22 relies on').toContain(
      FR_052_HELD_PICTURE,
    )
    expect(followedByFr052Rows(), 'T-023d GR-22 sends its operation to FR-052').toEqual(['GR-22'])
    const accounted = new Set([
      ...FOLLOWING_ROWS,
      ...exemptRows(),
      ...coveredElsewhereRows(),
      ...followedByFr052Rows(),
    ])
    const missing = every.filter((id) => !accounted.has(id))
    expect(missing, 'table T-023d: 追従しない行を残してはならない（MUST NOT）').toEqual([])
    expect(accounted.size, 'and nothing is accounted for twice').toBe(every.length)
  })

  // Spec: GR-10, GR-11, GR-26, GR-27, GR-19
  it('gives every exempted row a reason of its own', () => {
    const segment = exemptSegment()
    expect(exemptRows()).toEqual(['GR-10', 'GR-11', 'GR-26', 'GR-27', 'GR-19'])
    const clauses = segment.split('、').filter((part) => rowIdsIn(part).length > 0)
    for (const clause of clauses) {
      expect(
        clause,
        `table T-023d exempts ${rowIdsIn(clause).join(' / ')} with no reason`,
      ).toContain('（')
    }
  })
})

describe('the fixture draws every figure the nine rows are grabbed on', () => {
  it('draws a plan bar and an actual bar whose ends do not stand on one another', () => {
    const built = stage()
    const plan = planBox(built.loop, PLAIN_UID)
    const actual = actualBox(built.loop, PLAIN_UID)
    const oneDay = pxPerDay(built.loop)
    expect(
      actual.x0 - plan.x0,
      'the actual start stands days away from the plan start',
    ).toBeGreaterThan(2 * oneDay)
    expect(plan.x1 - actual.x1, 'the actual end stands days away from the plan end').toBeGreaterThan(
      2 * oneDay,
    )
  })

  it('draws a progress marker and a resume icon on the suspended Task (FR-044, MUST)', () => {
    const built = stage()
    const marker = markerOf(built.loop, SUSPENDED_UID)
    const icon = resumeOf(built.loop, SUSPENDED_UID)
    expect(icon.arm.length, 'FR-044: 中断のあいだは再開アイコンを描くこと（MUST）').toBeGreaterThan(
      0,
    )
    expect(icon.head.length).toBeGreaterThan(0)
    const at = resumePoint(built.loop, SUSPENDED_UID)
    const away = Math.hypot(at.x - marker.center.x, at.y - marker.center.y)
    expect(away, 'table T-023d GA-20: 再開アイコンはマーカーのさらに外側').toBeGreaterThan(
      marker.radius,
    )
  })

  it('draws the milestone an actual figure of its own (GA-16)', () => {
    const built = stage()
    const plan = boxOfBar(drawnTask(built.loop, MILESTONE_UID).plan, "the milestone's plan figure")
    const actual = actualBox(built.loop, MILESTONE_UID)
    expect(midX(actual), 'the two figures stand on different days').not.toBeCloseTo(midX(plan), 3)
  })

  it('draws the comment box and the status line, clear of one another', () => {
    const built = stage()
    const body = commentOf(built.loop).body
    const line = statusLineOf(built.loop)
    expect(line.x, 'the status line stands clear of the comment box').toBeGreaterThan(
      body.x + body.width,
    )
  })

  it('puts the empty task group GR-16 is pressed on inside the line it presses', () => {
    const built = stage()
    const band = bandOf(built.loop, TASK_GROUP_E)
    const line = statusLineOf(built.loop)
    const at = band.y + band.height / 2
    expect(at).toBeGreaterThanOrEqual(line.top)
    expect(at).toBeLessThanOrEqual(line.bottom)
  })
})

// Spec: T-023d, GA-1, GA-2, GA-3, GA-4, GA-9, GA-16, GA-20, GR-14, GR-16, FR-031
describe.each(FOLLOWERS.map((one) => [one.row, one] as [string, Follower]))(
  'table T-023d %s: the picture follows the pointer while it is held',
  (row, follower) => {
    it(`carries the drawn ${row} with the pointer (MUST)`, () => {
      const built = stage()
      const at = follower.press(built.loop)
      built.send(pointer('down', at.x, at.y))
      // Why: read after the press, because the held picture, not the one before the button
      // went down, is what the move is measured against.
      const held = follower.reads(built.loop)
      const travel = TRAVEL_DAYS * pxPerDay(built.loop)
      built.send(pointer('move', at.x + travel, at.y))
      const now = follower.reads(built.loop)
      expect(
        now,
        `table T-023d (${follower.area}): 掴んでいるあいだ、置くことになる姿を、ポインタに追従させて描いて示すこと（MUST）`,
      ).toBeGreaterThan(held)
      // Why: within one day and not to the pixel, because the figure that would be placed is
      // a whole day and a picture quantized to the day is one the specification permits.
      expect(
        Math.abs(now - held - travel),
        `${row} did not follow the pointer: it moved ${now - held} where the pointer moved ${travel}`,
      ).toBeLessThanOrEqual(pxPerDay(built.loop) + 1e-6)
    })

    it(`follows every move, not only the last one (${row})`, () => {
      const built = stage()
      const at = follower.press(built.loop)
      built.send(pointer('down', at.x, at.y))
      const held = follower.reads(built.loop)
      const oneDay = pxPerDay(built.loop)
      let last = held
      for (const days of [1, 2, 3, 4]) {
        built.send(pointer('move', at.x + days * oneDay, at.y))
        const now = follower.reads(built.loop)
        expect(
          now,
          `table T-023d (${follower.area}): the picture stopped following at day ${days}`,
        ).toBeGreaterThan(last - oneDay / 2)
        last = now
      }
      expect(last, `${row} never moved at all`).toBeGreaterThan(held)
    })

    it(`carries the drawn ${row} BACK when the pointer comes back`, () => {
      // Why: a preview that only ever grows passes the case above and still shows a day the
      // person is no longer pointing at.
      const built = stage()
      const at = follower.press(built.loop)
      built.send(pointer('down', at.x, at.y))
      const held = follower.reads(built.loop)
      const travel = TRAVEL_DAYS * pxPerDay(built.loop)
      built.send(pointer('move', at.x + travel, at.y))
      expect(follower.reads(built.loop)).toBeGreaterThan(held)
      built.send(pointer('move', at.x, at.y))
      expect(
        follower.reads(built.loop),
        `table T-023d (${follower.area}): 追従 means the picture is the POINTER's, so it comes back with it`,
      ).toBeCloseTo(held, 6)
    })

    it(`writes nothing to the document while ${row} is held (MUST NOT)`, () => {
      const built = stage()
      const before = structuredClone(built.loop.document())
      const at = follower.press(built.loop)
      built.send(pointer('down', at.x, at.y))
      expect(
        built.loop.document(),
        `table T-023d (${follower.area}): the press alone wrote to the document`,
      ).toEqual(before)
      const oneDay = pxPerDay(built.loop)
      for (const days of [1, 2, 3, 4]) {
        built.send(pointer('move', at.x + days * oneDay, at.y))
        expect(
          built.loop.document(),
          'table T-023d: 掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）（`FR-031`）',
        ).toEqual(before)
      }
    })
  },
)

// Spec: GA-9, HM-3
describe('table T-023d GA-9: the plan bar follows the pointer downwards too', () => {
  const grabPoint = (loop: FrameLoop): Point => ({
    x: planBox(loop, PLAIN_UID).x1 - 4 * pxPerDay(loop),
    y: midY(planBox(loop, PLAIN_UID)),
  })

  const downToTaskGroupB = (loop: FrameLoop): number => bandOf(loop, TASK_GROUP_B).y - bandOf(loop, TASK_GROUP_A).y

  it('carries the drawn bar down with the pointer (MUST)', () => {
    const built = stage()
    const at = grabPoint(built.loop)
    built.send(pointer('down', at.x, at.y))
    const held = midY(planBox(built.loop, PLAIN_UID))
    const down = downToTaskGroupB(built.loop)
    expect(down, 'task group B stands below task group A').toBeGreaterThan(0)
    built.send(pointer('move', at.x, at.y + down))
    expect(
      midY(planBox(built.loop, PLAIN_UID)),
      'table T-023d: `GA-9` は縦にも追従すること（MUST）—— 縦を止めるとどのタスクグループへ載るのかが見えない',
    ).toBeGreaterThan(held)
  })

  it('carries it back up when the pointer comes back up', () => {
    const built = stage()
    const at = grabPoint(built.loop)
    built.send(pointer('down', at.x, at.y))
    const held = midY(planBox(built.loop, PLAIN_UID))
    const down = downToTaskGroupB(built.loop)
    built.send(pointer('move', at.x, at.y + down))
    expect(midY(planBox(built.loop, PLAIN_UID))).toBeGreaterThan(held)
    built.send(pointer('move', at.x, at.y))
    expect(
      midY(planBox(built.loop, PLAIN_UID)),
      "the vertical picture is the pointer's too, so it comes back with it",
    ).toBeCloseTo(held, 6)
  })

  it('leaves the task group membership in the document alone while the button is down (MUST NOT)', () => {
    const built = stage()
    const at = grabPoint(built.loop)
    const before = memberGroupOf(built.loop, PLAIN_UID)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + downToTaskGroupB(built.loop)))
    expect(
      memberGroupOf(built.loop, PLAIN_UID),
      'table T-023d: 掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）',
    ).toBe(before)
  })
})

// Spec: IN-1, FR-011
describe('table T-028 IN-1: the release settles what the picture was showing', () => {
  function dragRight(built: Stage, at: Point): void {
    const travel = TRAVEL_DAYS * pxPerDay(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + travel, at.y))
    built.send(pointer('up', at.x + travel, at.y))
  }

  it('GA-1 settles `start` on the release', () => {
    const built = stage()
    const before = dayOf(taskOf(built.loop, PLAIN_UID).start)
    dragRight(built, {
      x: planBox(built.loop, PLAIN_UID).x0,
      y: midY(planBox(built.loop, PLAIN_UID)),
    })
    expect(
      dayOf(taskOf(built.loop, PLAIN_UID).start) > before,
      'table T-023d GA-1: 予定の開始点 …… `start` を変える。確定は 表 T-028 の `IN-1`',
    ).toBe(true)
  })

  it('GA-2 settles `finish` on the release', () => {
    const built = stage()
    const before = dayOf(taskOf(built.loop, PLAIN_UID).finish)
    dragRight(built, {
      x: planBox(built.loop, PLAIN_UID).x1,
      y: midY(planBox(built.loop, PLAIN_UID)),
    })
    expect(
      dayOf(taskOf(built.loop, PLAIN_UID).finish) > before,
      'table T-023d GA-2: 予定の終了点 …… `finish` を変える',
    ).toBe(true)
  })

  it('GA-3 settles `actualStart` on the release', () => {
    const built = stage()
    const before = dayOf(taskOf(built.loop, PLAIN_UID).actualStart)
    dragRight(built, {
      x: actualBox(built.loop, PLAIN_UID).x0,
      y: midY(actualBox(built.loop, PLAIN_UID)),
    })
    expect(
      dayOf(taskOf(built.loop, PLAIN_UID).actualStart) > before,
      'table T-023d GA-3: 実績の開始点 …… `actualStart` を変える',
    ).toBe(true)
  })

  it('GA-4 settles `stop` on the release', () => {
    const built = stage()
    const before = dayOf(taskOf(built.loop, PLAIN_UID).stop)
    dragRight(built, {
      x: actualBox(built.loop, PLAIN_UID).x1,
      y: midY(actualBox(built.loop, PLAIN_UID)),
    })
    expect(
      dayOf(taskOf(built.loop, PLAIN_UID).stop) > before,
      'table T-023d GA-4: the last day of an unfinished actual is held in stop',
    ).toBe(true)
  })

  it("GA-16 settles the milestone's `actualStart` on the release", () => {
    const built = stage()
    const before = dayOf(taskOf(built.loop, MILESTONE_UID).actualStart)
    dragRight(built, {
      x: midX(actualBox(built.loop, MILESTONE_UID)),
      y: midY(actualBox(built.loop, MILESTONE_UID)),
    })
    expect(
      dayOf(taskOf(built.loop, MILESTONE_UID).actualStart) > before,
      'table T-023d GA-16: 実績のマイルストーン …… `actualStart` を動かす',
    ).toBe(true)
  })

  it('GR-16 settles `Project.statusDate` on the release', () => {
    const built = stage()
    const before = dayOf(statusDateOf(built.loop))
    const band = bandOf(built.loop, TASK_GROUP_E)
    dragRight(built, { x: statusLineOf(built.loop).x, y: band.y + band.height / 2 })
    expect(
      dayOf(statusDateOf(built.loop)) > before,
      'table T-023d GR-16: 基準日線 …… 左右に動かして `statusDate` を変える（`FR-046`）',
    ).toBe(true)
  })

  it('GA-9 settles the plan dates on the release, and leaves the actual ones alone (MUST NOT)', () => {
    const built = stage()
    const before = structuredClone(taskOf(built.loop, PLAIN_UID))
    dragRight(built, {
      x: planBox(built.loop, PLAIN_UID).x1 - 4 * pxPerDay(built.loop),
      y: midY(planBox(built.loop, PLAIN_UID)),
    })
    const after = taskOf(built.loop, PLAIN_UID)
    expect(dayOf(after.start) > dayOf(before.start), 'FR-011: 予定の日付だけをずらし').toBe(true)
    expect(dayOf(after.finish) > dayOf(before.finish), 'the whole bar moved, not one end').toBe(true)
    expect(after.actualStart, 'FR-011: 実績の日付を変えてはならない（MUST NOT）').toBe(
      before.actualStart,
    )
    expect(after.actualFinish, 'FR-011: 実績の日付を変えてはならない（MUST NOT）').toBe(
      before.actualFinish,
    )
  })

  it('GA-9 settles the task group on a downward release, and moves no date and no parent task', () => {
    const built = stage()
    const before = structuredClone(taskOf(built.loop, PLAIN_UID))
    const at = {
      x: planBox(built.loop, PLAIN_UID).x1 - 4 * pxPerDay(built.loop),
      y: midY(planBox(built.loop, PLAIN_UID)),
    }
    const down = bandOf(built.loop, TASK_GROUP_B).y - bandOf(built.loop, TASK_GROUP_A).y
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x, at.y + down))
    built.send(pointer('up', at.x, at.y + down))
    expect(
      memberGroupOf(built.loop, PLAIN_UID),
      'table T-023d GA-9: 縦に動かしたときのタスクグループの載せ替え（表 T-015a の `HM-3`）',
    ).toBe(TASK_GROUP_B)
    const after = taskOf(built.loop, PLAIN_UID)
    expect(after.start, 'FR-011: どちらの日付も変わらない（MUST NOT）').toBe(before.start)
    expect(after.finish, 'FR-011: どちらの日付も変わらない（MUST NOT）').toBe(before.finish)
    expect(after.actualStart, 'FR-011: どちらの日付も変わらない（MUST NOT）').toBe(
      before.actualStart,
    )
    expect(
      after.parentTaskUid,
      'T-015a HM-3: タスクバーを別のタスクグループへ移す操作では WBS を変えてはならない（MUST NOT）',
    ).toBe(before.parentTaskUid)
  })

  it('settles once: moves that come after the release change nothing', () => {
    const built = stage()
    dragRight(built, {
      x: planBox(built.loop, PLAIN_UID).x0,
      y: midY(planBox(built.loop, PLAIN_UID)),
    })
    const settled = structuredClone(taskOf(built.loop, PLAIN_UID))
    const oneDay = pxPerDay(built.loop)
    const bar = planBox(built.loop, PLAIN_UID)
    built.send(pointer('move', bar.x0 + 4 * oneDay, midY(bar)))
    built.send(pointer('move', bar.x0 + 8 * oneDay, midY(bar)))
    expect(
      taskOf(built.loop, PLAIN_UID),
      'IN-1: the gesture ended at the release, so a pointer with no button settles nothing',
    ).toEqual(settled)
  })
})

// Spec: FR-044, IN-1, CM-13
describe('table T-028 IN-1: GA-20 settles the resume date on the release', () => {
  it('moves `resume` to the day the pointer left the icon on', () => {
    const built = stage()
    const before = dayOf(taskOf(built.loop, SUSPENDED_UID).resume)
    const at = resumePoint(built.loop, SUSPENDED_UID)
    const travel = TRAVEL_DAYS * pxPerDay(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + travel, at.y))
    built.send(pointer('up', at.x + travel, at.y))
    expect(
      dayOf(taskOf(built.loop, SUSPENDED_UID).resume) > before,
      'FR-044: 作成者が再開予定日を画面上で置き、置いた後に動かせるようにすること / table T-023d GA-20: `resume` を変える',
    ).toBe(true)
  })

  it('leaves `resumeValid` true, so the suspension does not silently come undone', () => {
    const built = stage()
    const at = resumePoint(built.loop, SUSPENDED_UID)
    const travel = TRAVEL_DAYS * pxPerDay(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + travel, at.y))
    built.send(pointer('up', at.x + travel, at.y))
    expect(
      taskOf(built.loop, SUSPENDED_UID).resumeValid,
      'FR-044: 再開予定日を置いたとき、`resumeValid` を `true` にすること（MUST）',
    ).toBe(true)
  })
})

// Spec: GR-14, IN-1, FR-016, FR-019, CM-50, CM-51
describe('table T-028 IN-1: GR-14 settles the comment box on the release', () => {
  // Why: only the move is judged, because no table gives the anchor or the corners
  // a size, so a resize case would be judged on a rectangle nothing fixes.
  it('moves the box in the document when the pointer carried its picture', () => {
    const built = stage()
    const before = structuredClone(storedBoxOf(built.loop))
    const body = commentOf(built.loop).body
    const at = { x: body.x + body.width / 2, y: body.y + body.height / 2 }
    const travel = TRAVEL_DAYS * pxPerDay(built.loop)
    built.send(pointer('down', at.x, at.y))
    built.send(pointer('move', at.x + travel, at.y))
    built.send(pointer('up', at.x + travel, at.y))
    const after = storedBoxOf(built.loop)
    // Why: either the anchor or the offset may carry the move, so the case asserts the box
    // moved and does not choose between the two.
    const moved =
      after.anchorDate !== before.anchorDate ||
      JSON.stringify(after.bodyOffsetPx) !== JSON.stringify(before.bodyOffsetPx)
    expect(
      moved,
      'table T-023d GR-14: コメントボックス …… 動かす。確定は 表 T-028 の `IN-1`（離した時点）',
    ).toBe(true)
  })
})

// Spec: GA-18, PE-8
describe('table T-023d GA-18: the progress marker is pressed, not carried', () => {
  // Why: the press is in the marker's right half, because LP-1 puts the actual start at
  // its centre and GA-3, which does follow, claims that point.
  it('draws no following picture while the marker is held', () => {
    const built = stage()
    const marker = markerOf(built.loop, SUSPENDED_UID)
    // Why: measured against the unpressed picture, because the still press previews the
    // state the press would cycle to.
    const unpressed = structuredClone(drawnTask(built.loop, SUSPENDED_UID))
    const pressX = marker.center.x + marker.radius / 2
    built.send(pointer('down', pressX, marker.center.y))
    const oneDay = pxPerDay(built.loop)
    for (const days of [1, 2, 3, 4]) {
      built.send(pointer('move', pressX + days * oneDay, marker.center.y))
      expect(
        structuredClone(drawnTask(built.loop, SUSPENDED_UID)),
        'table T-270 `PE-10`（進捗マーカー、中断のあいだ）: 横に引く ＝ 何もしない',
      ).toEqual(unpressed)
    }
  })

  it('writes nothing to the document while the marker is held either', () => {
    const built = stage()
    const before = structuredClone(built.loop.document())
    const marker = markerOf(built.loop, SUSPENDED_UID)
    built.send(pointer('down', marker.center.x, marker.center.y))
    built.send(pointer('move', marker.center.x + 4 * pxPerDay(built.loop), marker.center.y))
    expect(
      built.loop.document(),
      'table T-028 IN-1: ポインタ操作は押した時点で実行せず、離した時点で確定すること',
    ).toEqual(before)
  })
})

// Spec: GA-18, FR-013
describe('table T-023d GA-18 / table T-280 progressMarkerPressed (DFC-708): the step is written once the press has ended', () => {
  it('a press that is released on the marker writes the next state as a landed edit', () => {
    const built = stage()
    const before = structuredClone(drawnTask(built.loop, SUSPENDED_UID))
    const marker = markerOf(built.loop, SUSPENDED_UID)
    const pressX = marker.center.x + marker.radius / 2
    built.send(pointer('down', pressX, marker.center.y))
    built.send(pointer('up', pressX, marker.center.y))
    expect(built.loop.hasUnsavedEdits(), 'GA-18 cycles the state on release: the write landed (WS-2 did not refuse it)').toBe(true)
    expect(structuredClone(drawnTask(built.loop, SUSPENDED_UID)), 'the Task is drawn in its next state').not.toEqual(before)
  })
})

// Spec: GR-21, FR-051, SC-4, AG-9, UN-8
// Why: SCREEN gives the scrollbars no thickness, so this fixture picks one; FR-051
// takes the thickness from the host, so nothing is asserted of this value.
const LANE_THICKNESS = 14

const overflowTaskGroupId = (n: number): string => `2a000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// Why: FR-055's fit shrinks any span to the Task Group Area, so only a span past the
// S-97 zoom floor overflows the width; the forty extra groups overflow the height.
function wideFixtureDocument(): Document {
  const draft = fixtureDocument() as unknown as {
    schedule: {
      tasks: Task[]
      taskGroups: unknown[]
      taskGroupMembers: { taskUid: number; taskGroupId: string }[]
    }
  }
  const overflowGroup = overflowTaskGroupId(900)
  draft.schedule.taskGroups.push(group(overflowGroup, 900, 'Overflow'))
  draft.schedule.taskGroupMembers.push({
    taskUid: OVERFLOW_UID,
    taskGroupId: overflowGroup,
  })
  draft.schedule.tasks.push(
    task({
      uid: OVERFLOW_UID,
      name: 'Overflow',
      start: '2026-04-01T00:00:00',
      // Why: sixty years, since S-1 is the constant 6: thirty no longer outgrow the Task Group Area at the S-97 floor.
      finish: '2086-04-01T00:00:00',
    }),
  )
  for (let extra = 0; extra < 40; extra += 1) {
    draft.schedule.taskGroups.push(group(overflowTaskGroupId(901 + extra), 901 + extra, `Filler ${extra}`))
  }
  return draft as unknown as Document
}

interface LaneStage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  view(): ScreenView
}

// Why: the thumb is drawn in the ScreenFrame and not in FrameValues, so this surface
// answers where the lanes are, as the side that drew them (SC-4).
function laneStage(): LaneStage {
  const pen = host()
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (one) => {
      views.push(one)
    },
    readFieldCommit: () => null,
    // Why: a point on either lane answers that lane's axis, grip and band alike, because
    // table T-023d leaves the band's own behaviour undecided.
    readScreenPartAt: (x, y): ScreenPart | null => {
      const last = views[views.length - 1]
      if (last === undefined) return null
      const on = last.frame.scrollbars.find(
        (bar) =>
          x >= bar.track.x &&
          x <= bar.track.x + bar.track.width &&
          y >= bar.track.y &&
          y <= bar.track.y + bar.track.height,
      )
      if (on === undefined) return null
      return {
        part: 'Schedule Canvas',
        entry: null,
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
        scrollbarAxis: on.axis,
      }
    },
  }
  const loop = frameLoop(
    pen.surface as any,
    wideFixtureDocument(),
    { ...SCREEN, scrollbarThickness: LANE_THICKNESS },
    { surface, language: 'en' },
  )
  pen.runAnimationFrames()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    view: () => {
      const last = views[views.length - 1]
      if (last === undefined) throw new Error('the loop showed no screen view')
      return last
    },
  }
}

function laneOf(built: LaneStage, axis: 'horizontal' | 'vertical') {
  const found = built.view().frame.scrollbars.find((one) => one.axis === axis)
  if (found === undefined) throw new Error(`UF-61 described no ${axis} scrollbar`)
  return found
}

const thumbCenter = (built: LaneStage, axis: 'horizontal' | 'vertical'): Point => {
  const bar = laneOf(built, axis)
  return { x: bar.thumb.x + bar.thumb.width / 2, y: bar.thumb.y + bar.thumb.height / 2 }
}

describe('table T-023d GR-21: the schedule follows the pointer while its grip is held', () => {

  it('is one of the ten the closing rule names, and no sentence exempts it', () => {
    expect(FOLLOWING_ROWS, 'table T-023d: the closing rule names GR-21').toContain(
      GRIP_ROW,
    )
    expect(exemptRows(), 'GR-21 is not among the rows the paragraph exempts').not.toContain(
      GRIP_ROW,
    )
    expect(
      coveredElsewhereRows(),
      'and not among the rows the other two closing rules cover',
    ).not.toContain(GRIP_ROW)
  })

  it('is drawn on both axes, over a document that genuinely overflows the Task Group Area', () => {
    // Why: scrolling gears to zero where the content fits, so without an overflow on both
    // axes the cases below could not tell a working grab from a dead one.
    const built = laneStage()
    expect(built.view().frame.scrollbars.map((one) => one.axis)).toEqual([
      'horizontal',
      'vertical',
    ])
    for (const axis of ['horizontal', 'vertical'] as const) {
      const bar = laneOf(built, axis)
      const length = axis === 'horizontal' ? 'width' : 'height'
      expect(bar.thumb[length], `${axis}: the thumb has no length to press`).toBeGreaterThan(0)
    }
    const frame = frameOf(built.loop)
    const area = (built.loop.current() as any).regions.taskGroupArea as { width: number; height: number }
    expect(
      (frame.layout as any).contentWidth,
      'wideFixtureDocument: the horizontal content must overflow the Task Group Area',
    ).toBeGreaterThan(area.width)
    expect(
      (frame.layout as any).contentHeight,
      'wideFixtureDocument: the vertical content must overflow the Task Group Area',
    ).toBeGreaterThan(area.height)
  })

  for (const axis of ['vertical', 'horizontal'] as const) {
    it(`follows the pointer through the ${axis} drag, while it is held`, () => {
      const built = laneStage()
      const at = thumbCenter(built, axis)
      // Why: OVERFLOW_UID and not PLAIN_UID, because at the floor zoom PLAIN_UID's bar is too
      // thin a fraction of the picture to be placed in geometry.tasks at all.
      const heldReading = (): number =>
        axis === 'vertical' ? bandOf(built.loop, TASK_GROUP_A).y : planBox(built.loop, OVERFLOW_UID).x0
      built.send(pointer('down', at.x, at.y))
      const held = heldReading()
      built.send(pointer('move', at.x + (axis === 'vertical' ? 0 : 120), at.y + (axis === 'vertical' ? 120 : 0)))
      expect(
        heldReading(),
        `table T-023d GR-21: the ${axis} drag drew nothing new while it was held`,
      ).not.toBe(held)
    })
  }

  for (const axis of ['horizontal', 'vertical'] as const) {
    it(`settles the ${axis} display position on the release (table T-028 IN-1)`, () => {
      const built = laneStage()
      const before = built.loop.document().documentSettings
      const at = thumbCenter(built, axis)
      const to = axis === 'vertical' ? { x: at.x, y: at.y + 120 } : { x: at.x + 120, y: at.y }
      built.send(pointer('down', at.x, at.y))
      built.send(pointer('move', to.x, to.y))
      built.send(pointer('up', to.x, to.y))
      const after = built.loop.document().documentSettings
      expect(
        axis === 'vertical' ? after.scrollTaskGroupId : after.scrollDate,
        `table T-023d GR-21: 掴めば表示位置を変える（規則は FR-051） -- the ${axis} release settled nothing`,
      ).not.toBe(axis === 'vertical' ? before.scrollTaskGroupId : before.scrollDate)
    })
  }
})
