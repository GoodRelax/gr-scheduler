// CR-709 spec-only cases: T-017a CT-4 (a shape with no outline draws its plan in the outline color) and FR-102 (the record's start and stop lines).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Clipboard, ClipboardContent } from '../../src/adapter/clipboard-gateway/clipboard'
import type { InputModifiers, PointerInput, PointerPhase } from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
// see CT-4
const CT_4_LINE_COLOR =
  '予定の線・矢じり・端点を、予定の輪郭線と同じ色（表 T-017b の `CV-6` の縁の値 —— テーマに従うときは `_assets/tbl-settings.md` の `S-156`）で描くこと（MUST）'
// see FR-102
const FR_102_START_AND_STOP =
  '⭐ 始めたときは、始めたことと押した入口の行 ID を 1 行に書き、止めたときは、渡す前に、止めたことと押した入口の行 ID を記録の最後の行に書くこと（MUST）'
const FR_102_SPELLING = '綴りは、始めの行が `started entrance=IC-76`、止めの行が `stopped entrance=IC-76` である。'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// see T-012
// WHY: the spelling the document stores is the second cell of each T-012 row, read rather than typed.
const shapeKindOf = (id: string): string => {
  const cell = rowOf('T-012', id).cells[1] ?? ''
  const found = /'([A-Za-z]+)'/.exec(bare(cell))
  if (found === null) throw new Error(`table T-012 row ${id} names no shapeKind: ${cell}`)
  return found[1] as string
}

describe('CR-709 -- the clauses these cases are driven by', () => {
  it('CT-4 and FR-102 still read this way', () => {
    for (const clause of [CT_4_LINE_COLOR, FR_102_START_AND_STOP, FR_102_SPELLING]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
    expect(REQUIREMENTS, 'the retired fill-against-background clause is gone').not.toContain('予定の塗りと背景の比')
  })

  it('T-012 says SH-1 has an outline and SH-3 / SH-4 have none', () => {
    expect(bare(rowOf('T-012', 'SH-1').cells[3] ?? '')).toBe('あり')
    expect(bare(rowOf('T-012', 'SH-3').cells[3] ?? '')).toBe('なし')
    expect(bare(rowOf('T-012', 'SH-4').cells[3] ?? '')).toBe('なし')
  })
})

type Json = Record<string, any>

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

function decoded(json: Json): Document {
  const read = documentFromJson(JSON.stringify(json))
  if (!read.ok) throw new Error(`premise: the scene is GRS JSON, was ${JSON.stringify(read.faults).slice(0, 400)}`)
  return read.document
}

const SCREEN: FrameEnvironment = { width: 1400, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  else (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
})

function heldFrames(): () => void {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as unknown as { requestAnimationFrame: (callback: (time: number) => void) => number }).requestAnimationFrame =
    (callback) => waiting.push(callback)
  return () => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
}

const silentSurface = (part: () => ScreenPart | null): ScreenSurface =>
  ({
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: () => part(),
  }) as ScreenSurface


// see T-294
// WHY: a palette name the line-color field offers; the drawn value is the table's, never typed here.
const CHOSEN_STROKE = 'red'

interface Figure {
  readonly uid: number
  readonly shape: string
  readonly stroke: string | null
}

// WHY: one rectangle and one of each line shape, theme-colored, then the same three with a chosen line color.
const FIGURES: readonly Figure[] = [
  { uid: 1, shape: 'SH-1', stroke: null },
  { uid: 2, shape: 'SH-3', stroke: null },
  { uid: 3, shape: 'SH-4', stroke: null },
  { uid: 4, shape: 'SH-1', stroke: CHOSEN_STROKE },
  { uid: 5, shape: 'SH-3', stroke: CHOSEN_STROKE },
  { uid: 6, shape: 'SH-4', stroke: CHOSEN_STROKE },
]

function sceneJson(): Json {
  const json = JSON.parse(TEMPLATE_TEXT) as Json
  const schedule = json['schedule'] as Json
  const firstTask = (schedule['tasks'] as Json[])[0]
  const firstGroup = (schedule['taskGroups'] as Json[])[0]
  if (firstTask === undefined || firstGroup === undefined) throw new Error('premise: the template holds a task and a task group')
  const groupIdOf = (uid: number): string => `70900000-0000-4000-8000-${String(uid).padStart(12, '0')}`
  schedule['tasks'] = FIGURES.map((one) => ({
    ...structuredClone(firstTask),
    uid: one.uid,
    parentTaskUid: null,
    wbsOrder: one.uid,
    name: `figure ${one.uid}`,
    milestone: false,
    deadline: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    dependencies: [],
  }))
  schedule['taskGroups'] = FIGURES.map((one, order) => ({
    ...structuredClone(firstGroup),
    id: groupIdOf(one.uid),
    parentId: null,
    label: `row ${order}`,
    derivedFromTaskUid: null,
    order,
    color: null,
  }))
  schedule['taskGroupMembers'] = FIGURES.map((one) => ({ taskUid: one.uid, groupId: groupIdOf(one.uid) }))
  schedule['taskVisuals'] = FIGURES.map((one) => ({
    taskUid: one.uid,
    shapeKind: shapeKindOf(one.shape),
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: one.stroke,
    strokeWidthPx: null,
  }))
  schedule['commentBoxes'] = []
  schedule['highlightBoxes'] = []
  schedule['taskOrigins'] = []
  schedule['baselineTasks'] = []
  return json
}

interface Mark {
  readonly tag: string
  readonly fill: string | null
  readonly stroke: string | null
}

function drawnPicture(): string {
  const frames = heldFrames()
  const pictures: string[] = []
  const wiring: ScreenWiring = { surface: silentSurface(() => null), language: 'en' }
  frameLoop({ showSvg: (svg: string) => pictures.push(svg) } as never, decoded(sceneJson()), SCREEN, wiring)
  frames()
  const last = pictures[pictures.length - 1]
  if (last === undefined) throw new Error('premise: the loop drew a picture')
  return last
}

const attributeOf = (attributes: string, name: string): string | null =>
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes)?.[1] ?? null

// see FR-007
// WHY: the plan figure is every element keyed task-<uid>-plan; the halo masks and the actual carry other keys.
function planMarksOf(picture: string, uid: number): readonly Mark[] {
  const marks: Mark[] = []
  for (const found of picture.matchAll(/<(line|polygon|circle|path|rect|polyline)\b([^>]*)>/g)) {
    const attributes = found[2] ?? ''
    if (attributeOf(attributes, 'data-figure') !== `task-${uid}-plan`) continue
    marks.push({ tag: found[1] ?? '', fill: attributeOf(attributes, 'fill'), stroke: attributeOf(attributes, 'stroke') })
  }
  if (marks.length === 0) throw new Error(`the picture holds no plan figure for task ${uid}`)
  return marks
}

// WHY: a line draws with its stroke; a head and a dot are filled. Each takes the color it shows.
const inkOf = (mark: Mark): string | null => (mark.tag === 'line' || mark.tag === 'polyline' ? mark.stroke : mark.fill)

describe(`CT-4 -- ${CT_4_LINE_COLOR}`, () => {
  const picture = drawnPicture()
  const rectangle = (uid: number) => {
    const [body] = planMarksOf(picture, uid)
    if (body === undefined) throw new Error('premise: the rectangle drew a body')
    return body
  }

  it('premise: the rectangle (SH-1) draws its outline in a color other than its fill', () => {
    const body = rectangle(1)
    expect(body.stroke).not.toBeNull()
    expect(body.fill).not.toBeNull()
    expect(body.stroke).not.toBe(body.fill)
  })

  it.each([
    ['SH-3', 2],
    ['SH-4', 3],
  ] as const)('%s following the theme: every mark of the plan is drawn in the outline color, not the fill', (_shape, uid) => {
    const outline = rectangle(1)
    const marks = planMarksOf(picture, uid)
    expect(marks.some((one) => one.tag === 'line'), 'premise: the plan is drawn as a line').toBe(true)
    expect(marks.length, 'premise: a line shape draws its head or its end dots too').toBeGreaterThan(1)
    for (const mark of marks) {
      expect(inkOf(mark), `${CT_4_LINE_COLOR} -- <${mark.tag}>`).toBe(outline.stroke)
      expect(inkOf(mark), `${CT_4_LINE_COLOR} -- <${mark.tag}> is not the plan fill`).not.toBe(outline.fill)
    }
  })

  it.each([
    ['SH-3', 5],
    ['SH-4', 6],
  ] as const)('%s with a chosen line color: every mark of the plan takes that color (CV-6), as the rectangle outline does', (_shape, uid) => {
    const chosen = rectangle(4)
    expect(chosen.stroke, 'premise: a chosen line color changes the rectangle outline').not.toBe(rectangle(1).stroke)
    for (const mark of planMarksOf(picture, uid)) {
      expect(inkOf(mark), `${CT_4_LINE_COLOR} -- <${mark.tag}>`).toBe(chosen.stroke)
    }
  })
})


const RECORD_ENTRANCE = 'IC-76'
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, at: { x: number; y: number }): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

const recordPart = (): ScreenPart =>
  ({
    part: 'Command Palette',
    entry: RECORD_ENTRANCE,
    format: null,
    taskGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  }) as ScreenPart

interface RecordBench {
  readonly loop: FrameLoop
  readonly records: string[]
  frames(): void
  pressRecordEntrance(): void
}

function recordBench(): RecordBench {
  const frames = heldFrames()
  const records: string[] = []
  let part: ScreenPart | null = null
  const wiring: ScreenWiring = { surface: silentSurface(() => part), language: 'ja' }
  const clipboard: Clipboard = {
    writeClipboardContent: (content: ClipboardContent) => {
      if (content.kind === 'record') records.push(content.text)
      return Promise.resolve({ ok: true })
    },
  }
  const template = decoded(JSON.parse(TEMPLATE_TEXT) as Json)
  const loop = frameLoop({ showSvg: () => undefined } as never, template, SCREEN, wiring, undefined, undefined, clipboard)
  frames()
  return {
    loop,
    records,
    frames,
    pressRecordEntrance: () => {
      const at = { x: 30, y: 650 }
      part = recordPart()
      loop.receiveInput(pointer('down', at))
      loop.receiveInput(pointer('up', at))
      part = null
      frames()
    },
  }
}

const START_LINE = 'started entrance=IC-76'
const STOP_LINE = 'stopped entrance=IC-76'

function oneRecord(): readonly string[] {
  const bench = recordBench()
  bench.pressRecordEntrance()
  bench.frames()
  bench.loop.receiveInput(pointer('move', { x: 400, y: 300 }))
  bench.frames()
  bench.pressRecordEntrance()
  const record = bench.records[bench.records.length - 1]
  if (record === undefined) throw new Error('premise: stopping the record handed it to the clipboard (FR-102)')
  return record.split('\n').filter((line) => line.length > 0)
}

describe(`FR-102 -- ${FR_102_START_AND_STOP}`, () => {
  it('the spelling the clause gives is the one these cases look for', () => {
    expect(FR_102_SPELLING).toContain(`\`${START_LINE}\``)
    expect(FR_102_SPELLING).toContain(`\`${STOP_LINE}\``)
  })

  it('the record holds exactly one start line, and it comes before every frame line', () => {
    const lines = oneRecord()
    const starts = lines.filter((line) => line.endsWith(START_LINE))
    expect(starts, FR_102_START_AND_STOP).toHaveLength(1)
    const startAt = lines.findIndex((line) => line.endsWith(START_LINE))
    const firstFrame = lines.findIndex((line) => line.split('\t')[2] === 'frame')
    expect(firstFrame, 'premise: a frame was drawn while recording').toBeGreaterThan(-1)
    expect(startAt, FR_102_START_AND_STOP).toBeLessThan(firstFrame)
  })

  it('the last line of the record handed to the clipboard is the stop line, and it appears once', () => {
    const lines = oneRecord()
    expect(lines[lines.length - 1]?.endsWith(STOP_LINE), FR_102_START_AND_STOP).toBe(true)
    expect(lines.filter((line) => line.endsWith(STOP_LINE)), FR_102_START_AND_STOP).toHaveLength(1)
  })

  it('a second recording starts afresh: its record carries its own start line and not the first one', () => {
    const bench = recordBench()
    bench.pressRecordEntrance()
    bench.pressRecordEntrance()
    bench.pressRecordEntrance()
    bench.frames()
    bench.pressRecordEntrance()
    expect(bench.records, 'premise: two records were handed over').toHaveLength(2)
    const second = (bench.records[1] ?? '').split('\n')
    expect(second.filter((line) => line.endsWith(START_LINE)), FR_102_START_AND_STOP).toHaveLength(1)
    expect(second.filter((line) => line.endsWith(STOP_LINE)), FR_102_START_AND_STOP).toHaveLength(1)
  })
})
