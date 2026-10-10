// CR-719 spec-only cases: a screen write refused by IV-2, IV-9, IV-12 or IV-21 is told RS-82, RS-84, RS-86 or RS-88, never RS-10 (FR-076, FR-033).

import { afterEach, describe, expect, it } from 'vitest'

import { bare } from './spec-table'
import { keyOfRow } from './cr-610-file-flow-stage'
import { firstTask, REQUIREMENTS, rowOf, settleLoop, templateDocument, wordsOf } from './cr-719-stage'
import { keyOf, shell, taskGroupDocument, taskOf, type ShellBench } from '../unit/cr-541-stage'

const FR_076_A_T_220_REFUSAL_CARRIES_ITS_ROW =
  '⭐ 画面からの書き込みが Chapter 6.1 の 表 T-220 の行で拒まれたときは、本表のうち出典の欄がその行を名指す行を運ぶこと（MUST）'
const FR_076_NO_COLLAPSE_OF_THE_REASON = '拒否の理由を 1 つの行へ潰してはならない（MUST NOT）'
const FR_076_CHECK_THE_ROUTE_EXISTS = '本表に行を足す者は、その行へ振り分ける道が在ることまで確かめること（MUST）'
const NT_1_SAYS_WHY_IN_WORDS = 'どの項目が、なぜ誤りかを文字で示すこと（MUST）'

describe('FR-076 -- the clauses this file is driven by still stand', () => {
  it.each([FR_076_A_T_220_REFUSAL_CARRIES_ITS_ROW, FR_076_NO_COLLAPSE_OF_THE_REASON, FR_076_CHECK_THE_ROUTE_EXISTS, NT_1_SAYS_WHY_IN_WORDS])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each([
    ['RS-82', 'IV-2'],
    ['RS-84', 'IV-9'],
    ['RS-86', 'IV-12'],
    ['RS-88', 'IV-21'],
  ])('table T-233 gives %s the source %s, written against NT-1', (row, rule) => {
    expect(rowOf('T-233', row).by['正']).toContain(rule)
    expect(bare(rowOf('T-233', row).cells[1] ?? '')).toBe('NT-1')
    expect(rowOf('T-220', rule).id).toBe(rule)
  })

  it('the dictionary spells RS-82, RS-84, RS-86, RS-88 and RS-10 each in words of its own', () => {
    const spelled = ['RS-10', 'RS-82', 'RS-84', 'RS-86', 'RS-88'].map((row) => wordsOf(row).ja)
    expect(new Set(spelled).size).toBe(spelled.length)
  })
})

describe(`IV-9 -- ${FR_076_A_T_220_REFUSAL_CARRIES_ITS_ROW}: a fill and a line both transparent`, () => {
  it('settling the second of the two colors as transparent is told RS-84 and not RS-10', () => {
    const document = templateDocument()
    const task = firstTask(document)
    const one = settleLoop(document)
    one.settle({ row: 'PR-12', key: { holder: 'taskVisual', uid: task.uid, column: 'fillColor' }, text: 'transparent' })
    expect(one.notices(), 'premise: the first transparent color is accepted').toEqual([])
    one.settle({ row: 'PR-39', key: { holder: 'taskVisual', uid: task.uid, column: 'strokeColor' }, text: 'transparent' })
    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf('RS-84').ja)
    expect(told[0]?.text).not.toBe(wordsOf('RS-10').ja)
    expect(told[0]?.manner).toBe('NT-1')
  })
})

describe('IV-12 -- the fade days longer than the task', () => {
  it('a fade of more days than the task lasts is told RS-86 and not RS-10', () => {
    const document = templateDocument()
    const task = firstTask(document)
    const one = settleLoop(document)
    one.settle({ row: 'PR-14', key: { holder: 'task', uid: task.uid, column: 'fadeInDays' }, text: '9999' })
    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf('RS-86').ja)
    expect(told[0]?.text).not.toBe(wordsOf('RS-10').ja)
    expect(told[0]?.manner).toBe('NT-1')
  })
})

describe('IV-21 -- an actual finish before the actual start', () => {
  it('an actual finish typed before the actual start is told RS-88 and not RS-10', () => {
    const document = templateDocument()
    const task = firstTask(document)
    const start = (task.start as string).slice(0, 10)
    const before = `${Number(start.slice(0, 4)) - 1}${start.slice(4)}`
    const one = settleLoop(document)
    one.settle({ row: 'PR-4', key: { holder: 'task', uid: task.uid, column: 'actualStart' }, text: start })
    expect(one.notices(), 'premise: an actual start is accepted').toEqual([])
    one.settle({ row: 'PR-6', key: { holder: 'task', uid: task.uid, column: 'actualFinish' }, text: before })
    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf('RS-88').ja)
    expect(told[0]?.text).not.toBe(wordsOf('RS-10').ja)
    expect(told[0]?.manner).toBe('NT-1')
  })
})

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const COPY = keyOfRow('SK-4')
const PASTE = keyOfRow('SK-5')
// WHY: the SK-3 cell lists Delete and Backspace joined by a full-width slash, which keyOfRow does not split.
const DELETE = keyOf('Delete')

// WHY: one Task on one task group; the paste has nothing to infer a parent from.
const twoTaskDocument = (): Record<string, any> => {
  const document = taskGroupDocument([{ id: 'task-group-1', parentId: null }])
  document.schedule.tasks = [1, 2].map((uid) => taskOf(uid, { name: `T${uid}` }))
  document.schedule.taskGroupMembers = [1, 2].map((taskUid) => ({ taskUid, groupId: 'task-group-1' }))
  document.schedule.taskVisuals = document.schedule.taskVisuals.slice(0, 1).concat(document.schedule.taskVisuals.slice(0, 1).map((one: any) => ({ ...one, taskUid: 2 })))
  return document
}

// see FR-033
const pressedTask = (bench: ShellBench, uid: number): void => {
  const drawn = (bench.loop.current()?.geometry.tasks as any[] | undefined)?.find((one) => one.taskUid === uid)
  if (drawn?.plan?.form !== 'outline') throw new Error(`premise: Task ${uid} has no bar body to press`)
  const xs = drawn.plan.points.map((one: any) => one.x)
  const ys = drawn.plan.points.map((one: any) => one.y)
  bench.click((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2)
}

describe(`IV-2 -- ${FR_076_A_T_220_REFUSAL_CARRIES_ITS_ROW}: a write that points at what is gone`, () => {
  it('a parent task naming a Task the document does not hold is told RS-82 and not RS-10', () => {
    const document = templateDocument()
    const task = firstTask(document)
    const absent = Math.max(...document.schedule.tasks.map((one) => one.uid)) + 1000
    const one = settleLoop(document)
    one.settle({ row: 'PR-15', key: { holder: 'task', uid: task.uid, column: 'parentTaskUid' }, text: String(absent) })
    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf('RS-82').ja)
    expect(told[0]?.text).not.toBe(wordsOf('RS-10').ja)
    expect(told[0]?.manner).toBe('NT-1')
  })

  it('a paste after the copied source was deleted is told RS-82 and not RS-10', () => {
    const bench = shell(twoTaskDocument())
    benches.push(bench)
    pressedTask(bench, 1)
    bench.send(COPY)
    bench.send(DELETE)
    expect((bench.loop.document() as any).schedule.tasks.map((one: any) => one.uid), 'premise: the copied Task is gone').toEqual([2])
    const before = JSON.stringify(bench.loop.document())
    bench.send(PASTE)
    expect(JSON.stringify(bench.loop.document()), 'the refused paste does not change the document').toBe(before)
    const told = bench.notices()
    expect(told, JSON.stringify(told)).toContain(wordsOf('RS-82').ja)
    expect(told).not.toContain(wordsOf('RS-10').ja)
  })

  it('a control: a paste with the copied source still there makes a copy and tells nothing', () => {
    const bench = shell(twoTaskDocument())
    benches.push(bench)
    pressedTask(bench, 1)
    bench.send(COPY)
    bench.send(PASTE)
    expect((bench.loop.document() as any).schedule.tasks.length).toBe(3)
    expect(bench.notices()).toEqual([])
  })
})
