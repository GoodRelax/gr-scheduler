// DFC-2030 spec-only cases: a task body drag moves the highlight and comment boxes the Selection holds (T-270, SL-1, SL-7, CY-4, FR-031).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import { grabSizesOf, itemAtPointer, type Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { BarGeometry, Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { RowPlacement } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const rowText = (table: string, id: string): string => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(found.cells.join(' | '))
}

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const T_270_WHOLE =
  'それまでの選択は置き換える（表 T-023c の `SL-2`）。⭐ 選択に含まれるものの本体を引けば、選択の全部が動くこと（MUST）'
const T_270_KEPT = '—— 横は同じ日数、縦は同じ行数である。離した後も全部が選ばれたままとすること（MUST）'
const T_270_STOP =
  '行の数は画面に描いた行で数え、最初の行より上か最後の行より下へ出るものがあれば、全体をそこで止めること（MUST）'
const T_270_SHIFT =
  '⭐ `Shift` だけを伴って本体（`PE-1` ・ `PE-6`）を引いたときは、横の成分を当てず、縦だけを当てること（MUST）'
const SL_7 = '| SL-7 | まとめて動かす | 選択に含まれる対象の本体をドラッグしたとき、選択されている全部を動かすこと（MUST）'
const SL_1_TARGETS = 'タスク・依存線・ハイライトボックス・コメントボックス・基準日線。'
const CY_4_TASKS_ONLY = 'これらが選択に混ざっていても、写すのはタスクだけである'

describe('DFC-2030 -- the clauses these cases are driven by', () => {
  it('T-270, SL-1, SL-7 and CY-4 still read this way', () => {
    for (const clause of [T_270_WHOLE, T_270_KEPT, T_270_STOP, T_270_SHIFT, SL_7]) expect(REQUIREMENTS, clause).toContain(clause)
    expect(rowText('T-023c', 'SL-1')).toContain(SL_1_TARGETS)
    expect(rowText('T-308', 'CY-4')).toContain(CY_4_TASKS_ONLY)
  })
})

const ROWS = [0, 1, 2, 3, 4, 5].map((one) => `20300000-0000-4000-8000-00000000000${one}`)
const rowId = (index: number): string => ROWS[index] as string

const SEL = 1
const OUT = 2
const HIGHLIGHT_ID = 'dfc-2030-highlight'
const COMMENT_ID = 'dfc-2030-comment'

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const task = (uid: number, name: string, start: string, finish: string): Task =>
  ({
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name,
    start,
    finish,
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
  }) as unknown as Task

interface Layout {
  readonly highlightRows: readonly [number, number]
  readonly commentRow: number
}

// WHY: SEL on row 1 and OUT on row 4 start on a Monday; OUT runs long so the opening Fit (OP-10) keeps the boxes in view.
function fixtureDocument(at: Layout): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  return {
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...(schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100, statusDate: null },
      calendars: schedule['calendars'],
      tasks: [task(SEL, 'Selected', '2026-04-06T08:00:00', '2026-04-10T17:00:00'),
        task(OUT, 'Outside', '2026-04-06T08:00:00', '2026-06-26T17:00:00'),
      ],
      resources: [],
      assignments: [],
      taskGroups: ROWS.map((id, order) => ({
        id,
        parentId: null,
        label: `row ${order}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: [
        { taskUid: SEL, groupId: rowId(1) },
        { taskUid: OUT, groupId: rowId(4) },
      ],
      taskVisuals: [],
      commentBoxes: [
        {
          id: COMMENT_ID,
          leaderShapeKind: null,
          text: 'a note',
          anchorDate: '2026-05-04',
          anchorGroupId: rowId(at.commentRow),
          bodyOffsetPx: null,
          strokeColor: null,
          strokeWidthPx: null,
          fillColor: null,
          fillTransparencyPercent: null,
          textColor: null,
        },
      ],
      highlightBoxes: [
        {
          id: HIGHLIGHT_ID,
          startDate: '2026-04-20T08:00:00',
          endDate: '2026-04-24T17:00:00',
          topGroupId: rowId(at.highlightRows[0]),
          bottomGroupId: rowId(at.highlightRows[1]),
          strokeColor: null,
          cornerRadiusPx: null,
          strokeWidthPx: null,
          fillColor: null,
          fillTransparencyPercent: null,
        },
      ],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      zoomX: 20 / SETTINGS_CONSTANTS.pxPerDayAt1x,
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1400, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

interface Bench {
  readonly loop: FrameLoop
  send(input: HumanInput): void
}

function bench(at: Layout): Bench {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const loop = frameLoop({ showSvg: () => undefined } as never, fixtureDocument(at), SCREEN, wiring, undefined, () => undefined)
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
  }
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, at: Point, modifiers: Partial<InputModifiers> = {}): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
  clickCount: 1,
})

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const hitAt = (loop: FrameLoop, at: Point): Hit | null => itemAtPointer(frameOf(loop).geometry, at.x, at.y, grabSizesOf())

const BODY_GRABS = ['GA-9', 'GA-14', 'GA-15']

function bodyOf(loop: FrameLoop, uid: number): Point {
  const bar = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)?.plan as BarGeometry | null | undefined
  if (bar === null || bar === undefined) throw new Error(`Task ${uid} is not drawn`)
  const points: readonly Point[] = bar.form === 'outline' ? bar.points : [bar.from, bar.to]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const at = { x: Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * 0.6, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  const hit = hitAt(loop, at)
  expect(hit?.item.kind, `the body point of Task ${uid} hits a task`).toBe('task')
  expect(BODY_GRABS, `the body point of Task ${uid} is a body grab`).toContain(hit?.grab as string)
  return at
}

// WHY: the place a box answers a press is the unit's own answer, so it is found by asking, not computed here.
function pointOnBox(loop: FrameLoop, kind: 'highlightBox' | 'commentBox'): Point {
  const area = frameOf(loop).regions.rowArea
  for (let y = area.y + 1; y < area.y + area.height; y += 2) {
    for (let x = area.x + 1; x < area.x + area.width; x += 2) {
      const hit = hitAt(loop, { x, y })
      if (hit?.item.kind === kind) return { x, y }
    }
  }
  throw new Error(`no point of the canvas answers a ${kind}`)
}

const drawnRow = (loop: FrameLoop, groupId: string): RowPlacement => {
  const found = frameOf(loop).layout.rows.find((one) => one.groupId === groupId)
  if (found === undefined) throw new Error(`the frame drew no row ${groupId}`)
  return found
}

const travel = (loop: FrameLoop, days: number, rows: number): Point => ({
  x: days * frameOf(loop).layout.pxPerDay,
  y: drawnRow(loop, rowId(1 + rows)).y - drawnRow(loop, rowId(1)).y,
})

const click = (built: Bench, at: Point, modifiers: Partial<InputModifiers> = {}): void => {
  built.send(pointer('move', at, modifiers))
  built.send(pointer('down', at, modifiers))
  built.send(pointer('up', at, modifiers))
}

function drag(built: Bench, from: Point, by: Point, modifiers: Partial<InputModifiers> = {}): void {
  const to = { x: from.x + by.x, y: from.y + by.y }
  built.send(pointer('move', from, modifiers))
  built.send(pointer('down', from, modifiers))
  built.send(pointer('move', to, modifiers))
  built.send(pointer('up', to, modifiers))
}

const undo = (built: Bench): void => built.send({ kind: 'key', key: 'Z', modifiers: { ...NO_MODIFIERS, ctrl: true } })

interface Seen {
  readonly selStart: string
  readonly selRow: number
  readonly outStart: string
  readonly outRow: number
  readonly highlight: { readonly start: string; readonly end: string; readonly top: number; readonly bottom: number }
  readonly comment: { readonly date: string; readonly row: number }
  readonly taskCount: number
  readonly boxCount: number
}

const day = (value: string | null | undefined): string => (value ?? '').slice(0, 10)

function seen(built: Bench): Seen {
  const schedule = built.loop.document().schedule
  const rowOf = (uid: number): number =>
    ROWS.indexOf(schedule.taskGroupMembers.find((one) => one.taskUid === uid)?.groupId ?? '')
  const taskOf = (uid: number): Task => {
    const found = schedule.tasks.find((one) => one.uid === uid)
    if (found === undefined) throw new Error(`no Task ${uid}`)
    return found
  }
  const box = schedule.highlightBoxes.find((one) => one.id === HIGHLIGHT_ID)
  const note = schedule.commentBoxes.find((one) => one.id === COMMENT_ID)
  return {
    selStart: day(taskOf(SEL).start),
    selRow: rowOf(SEL),
    outStart: day(taskOf(OUT).start),
    outRow: rowOf(OUT),
    highlight: {
      start: day(box?.startDate),
      end: day(box?.endDate),
      top: ROWS.indexOf(box?.topGroupId ?? ''),
      bottom: ROWS.indexOf(box?.bottomGroupId ?? ''),
    },
    comment: { date: day(note?.anchorDate), row: ROWS.indexOf(note?.anchorGroupId ?? '') },
    taskCount: schedule.tasks.length,
    boxCount: schedule.highlightBoxes.length + schedule.commentBoxes.length,
  }
}

type SelectedItem = { readonly kind: string; readonly uid?: number; readonly id?: string }

const selectedOf = (built: Bench): readonly string[] =>
  (
    (built.loop.agentApiSeams().source.readSnapshot().selection as unknown as { readonly items: readonly SelectedItem[] })
      .items
  )
    .map((one) => (one.kind === 'task' ? `task:${String(one.uid)}` : `${one.kind}:${String(one.id)}`))
    .sort()

const WHOLE = [`commentBox:${COMMENT_ID}`, `highlightBox:${HIGHLIGHT_ID}`, `task:${SEL}`]

function selectAll(built: Bench): void {
  click(built, bodyOf(built.loop, SEL))
  click(built, pointOnBox(built.loop, 'highlightBox'), { shift: true })
  click(built, pointOnBox(built.loop, 'commentBox'), { shift: true })
  expect(selectedOf(built), 'premise: SL-4 builds a Selection of the task and both boxes').toEqual(WHOLE)
}

// WHY: a whole week, so every moved end stays on a working day and no CR-668 question stops the release.
const WEEK = 7

const SPREAD: Layout = { highlightRows: [0, 1], commentRow: 2 }

const shifted = (date: string, days: number): string => {
  const at = new Date(`${date}T00:00:00Z`)
  at.setUTCDate(at.getUTCDate() + days)
  return at.toISOString().slice(0, 10)
}

describe(`DFC-2030 T-270 "${T_270_WHOLE}"`, () => {
  it('a plain body drag moves the task, the highlight box and the comment box (by its anchor) by the same days and rows', () => {
    const built = bench(SPREAD)
    const before = seen(built)
    selectAll(built)
    drag(built, bodyOf(built.loop, SEL), travel(built.loop, WEEK, 1))
    const after = seen(built)
    expect(after.selStart).toBe(shifted(before.selStart, WEEK))
    expect(after.selRow).toBe(before.selRow + 1)
    expect(after.highlight).toEqual({
      start: shifted(before.highlight.start, WEEK),
      end: shifted(before.highlight.end, WEEK),
      top: before.highlight.top + 1,
      bottom: before.highlight.bottom + 1,
    })
    expect(after.comment).toEqual({ date: shifted(before.comment.date, WEEK), row: before.comment.row + 1 })
    expect(selectedOf(built), 'T-270: all stay chosen after the release').toEqual(WHOLE)
  })

  it(`FR-031: one undo puts the task and both boxes back`, () => {
    const built = bench(SPREAD)
    const before = seen(built)
    selectAll(built)
    drag(built, bodyOf(built.loop, SEL), travel(built.loop, WEEK, 1))
    expect(seen(built)).not.toEqual(before)
    undo(built)
    expect(seen(built)).toEqual(before)
  })

  it(`${T_270_SHIFT} -- Shift moves the rows of all three and no date`, () => {
    const built = bench(SPREAD)
    const before = seen(built)
    selectAll(built)
    drag(built, bodyOf(built.loop, SEL), travel(built.loop, WEEK, 1), { shift: true })
    const after = seen(built)
    expect(after.selStart).toBe(before.selStart)
    expect(after.selRow).toBe(before.selRow + 1)
    expect(after.highlight).toEqual({ ...before.highlight, top: before.highlight.top + 1, bottom: before.highlight.bottom + 1 })
    expect(after.comment).toEqual({ ...before.comment, row: before.comment.row + 1 })
  })

  it.each([
    ['the highlight box bottom', { highlightRows: [0, 3], commentRow: 2 } as Layout, 2],
    ['the comment box anchor', { highlightRows: [0, 1], commentRow: 4 } as Layout, 1],
  ] as const)(`${T_270_STOP} -- %s reaching the last row stops the whole Selection`, (_name, layout, allowed) => {
    const built = bench(layout)
    const before = seen(built)
    selectAll(built)
    drag(built, bodyOf(built.loop, SEL), travel(built.loop, 0, 4))
    const after = seen(built)
    expect(after.selRow, 'the task stops with the box').toBe(before.selRow + allowed)
    expect(after.highlight.top - before.highlight.top).toBe(allowed)
    expect(after.highlight.bottom - before.highlight.bottom).toBe(allowed)
    expect(after.comment.row - before.comment.row).toBe(allowed)
    expect(Math.max(after.highlight.bottom, after.comment.row, after.selRow), 'nothing leaves the last row').toBe(ROWS.length - 1)
  })

  it(`CY-4 "${CY_4_TASKS_ONLY}" -- Ctrl + Shift copies the task only; the boxes are neither copied nor moved`, () => {
    const built = bench(SPREAD)
    const before = seen(built)
    selectAll(built)
    drag(built, bodyOf(built.loop, SEL), travel(built.loop, WEEK, 1), { ctrl: true, shift: true })
    const after = seen(built)
    expect(after.taskCount, 'one copy of the task').toBe(before.taskCount + 1)
    expect(after.boxCount, 'no box is copied').toBe(before.boxCount)
    expect(after.highlight).toEqual(before.highlight)
    expect(after.comment).toEqual(before.comment)
    expect(after.selStart).toBe(before.selStart)
    expect(after.selRow).toBe(before.selRow)
  })

  it('a plain drag of a task the Selection does not hold moves that task and leaves the boxes', () => {
    const built = bench(SPREAD)
    const before = seen(built)
    selectAll(built)
    drag(built, bodyOf(built.loop, OUT), travel(built.loop, WEEK, -1))
    const after = seen(built)
    expect(after.outStart).toBe(shifted(before.outStart, WEEK))
    expect(after.outRow).toBe(before.outRow - 1)
    expect(after.highlight).toEqual(before.highlight)
    expect(after.comment).toEqual(before.comment)
    expect(after.selStart).toBe(before.selStart)
    expect(after.selRow).toBe(before.selRow)
  })
})
