// CR-586 spec-only cases: IV-22 (T-220) through scheduleViolations and the GRS JSON open path (FR-076).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { ChosenFileWrite, FileReading, FileStore } from '../../src/adapter/file-gateway/file-gateway'
import type {
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  Notice,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { scheduleViolations, type Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken, type SpecRow, type SpecTable } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const T_220: SpecTable = specTable('T-220')
const T_036: SpecTable = specTable('T-036')
const T_103: SpecTable = specTable('T-103')
const T_024A: SpecTable = specTable('T-024a')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const IV_22 = rowOf(T_220, 'IV-22')

// see IV-22
const IV_22_RULE =
  '`TaskVisual.shapeKind` が非 `null` のとき、それが `\'milestone\'` であることと、その `TaskVisual` が指す `Task` の `milestone` が真であることが一致すること。'
const IV_22_NULL_EXEMPT = '⚠️ **`shapeKind` が `null` の `TaskVisual` は対象外**'
// see T-233
const T_233_CLOSING =
  '⭐ ⇒ 取り込みの検証が拒んだとき、`NT-1` の通知が運ぶ理由は、拒んだ 表 T-220 の行の行 ID とすること（MUST）'
// see T-251
const NO_MISMATCHED_DOCUMENT =
  '⚠️ 2 つが食い違う文書は作らせない —— `GRS JSON` から来た食い違いは `05-07-design.md` の 表 T-220 の `IV-22` が取り込みで拒み'
// see OP-5
const OP_5_BEFORE_OP_3 = '**`OP-3` を問う前に通すこと（MUST）**'

// see T-220
const KIND_WORD_COMBINATION = '組合せ'

describe('CR-586 premise -- the clauses these cases are built from', () => {
  it('T-220 IV-22 still reads as quoted, and is a combination row', () => {
    const rule = IV_22.by['不変条件'] ?? ''
    expect(rule).toContain(IV_22_RULE)
    expect(rule).toContain(IV_22_NULL_EXEMPT)
    expect(IV_22.by['種別']).toBe(KIND_WORD_COMBINATION)
  })

  it('T-233 closing paragraph, FR-002 (T-251) and OP-5 still read as quoted', () => {
    expect(REQUIREMENTS).toContain(T_233_CLOSING)
    expect(REQUIREMENTS).toContain(NO_MISMATCHED_DOCUMENT)
    expect(rowOf(T_024A, 'OP-5').by['規則'] ?? '').toContain(OP_5_BEFORE_OP_3)
  })
})

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

type Json = Record<string, any>

const templateJson = (): Json => JSON.parse(TEMPLATE_TEXT) as Json

function decoded(json: Json): Document {
  const read = documentFromJson(jsonFromDocument((json) as never))
  if (!read.ok) throw new Error(`premise: the scene is GRS JSON, was ${JSON.stringify(read.faults).slice(0, 400)}`)
  return read.document
}

interface Picked {
  readonly taskUid: number
  readonly index: number
}

function visualShaped(json: Json, wantMilestone: boolean): Picked {
  const visuals = json['schedule']['taskVisuals'] as Json[]
  const index = visuals.findIndex(
    (one) => one['shapeKind'] !== null && (one['shapeKind'] === 'milestone') === wantMilestone,
  )
  if (index < 0) throw new Error(`premise: the template holds no visual with milestone shape = ${wantMilestone}`)
  return { taskUid: visuals[index]?.['taskUid'] as number, index }
}

function withMilestone(json: Json, taskUid: number, milestone: boolean | null): Json {
  const tasks = json['schedule']['tasks'] as Json[]
  const task = tasks.find((one) => one['uid'] === taskUid)
  if (task === undefined) throw new Error(`premise: the template holds no task ${taskUid}`)
  task['milestone'] = milestone
  return json
}

const DRAWN_MILESTONE = visualShaped(templateJson(), true)
const DRAWN_BAR = visualShaped(templateJson(), false)

// see IV-22
const shapeSaysMilestone = (): Json => withMilestone(templateJson(), DRAWN_MILESTONE.taskUid, false)
// see IV-22
const taskSaysMilestone = (): Json => withMilestone(templateJson(), DRAWN_BAR.taskUid, true)

const iv22In = (document: Document) =>
  scheduleViolations(document.schedule as Schedule, document.documentSettings).filter(
    (one) => one.row === 'IV-22',
  )

describe('T-220 IV-22 through scheduleViolations (CR-586 seam S-1)', () => {
  it('the template, whose shapes agree with Task.milestone, breaks no IV-22', () => {
    expect(iv22In(decoded(templateJson()))).toEqual([])
  })

  it(`${IV_22_RULE} -- a visual drawn as 'milestone' over a Task whose milestone is false breaks it`, () => {
    const found = iv22In(decoded(shapeSaysMilestone()))
    expect(found.length, JSON.stringify(found)).toBeGreaterThan(0)
    for (const one of found) expect(one.kind).toBe('combination')
    expect(found.map((one) => one.at)).toContain(`/schedule/taskVisuals/${DRAWN_MILESTONE.index}`)
    const named = found.find((one) => one.at === `/schedule/taskVisuals/${DRAWN_MILESTONE.index}`)
    expect(named?.what ?? '').toContain(String(DRAWN_MILESTONE.taskUid))
  })

  it(`${IV_22_RULE} -- a visual drawn as a bar over a Task whose milestone is true breaks it`, () => {
    const found = iv22In(decoded(taskSaysMilestone()))
    expect(found.map((one) => one.at), JSON.stringify(found)).toContain(`/schedule/taskVisuals/${DRAWN_BAR.index}`)
    for (const one of found) expect(one.kind).toBe('combination')
  })

  it('a Task whose milestone is null counts as not true (IV-22 matches "is true"), so under a milestone shape it breaks', () => {
    const found = iv22In(decoded(withMilestone(templateJson(), DRAWN_MILESTONE.taskUid, null)))
    expect(found.map((one) => one.at), JSON.stringify(found)).toContain(
      `/schedule/taskVisuals/${DRAWN_MILESTONE.index}`,
    )
  })

  it(`${IV_22_NULL_EXEMPT} -- a null shape over either milestone value breaks nothing`, () => {
    for (const milestone of [true, false]) {
      const json = withMilestone(templateJson(), DRAWN_MILESTONE.taskUid, milestone)
      json['schedule']['taskVisuals'][DRAWN_MILESTONE.index]['shapeKind'] = null
      expect(iv22In(decoded(json)), `milestone ${milestone}`).toEqual([])
    }
  })
})

function keyOf(id: string): KeyInput {
  const cell = rowOf(T_036, id).by['割当'] ?? ''
  const parts = [...(cell.split('／')[0] ?? '').matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? '')
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: named('Cmd') },
  }
}

// see SK-10
const SK_10 = keyOf('SK-10')
const OPEN_CHOOSER = bare(rowOf(T_103, 'U-56').by['確定名（英）'] ?? '')
const CONFIRMATION = bare(rowOf(T_103, 'U-55').by['確定名（英）'] ?? '')
// see IC-71, OP-3
const REPLACE_ENTRY = 'IC-71'
// see IO-2
const FILE_NAME = 'incoming.json'

const SCREEN: FrameEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  else (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
})

interface Bench {
  readonly loop: FrameLoop
  view(): ScreenView
  frames(): void
  aim(part: ScreenPart | null): void
  handOver(text: string): void
}

function bench(): Bench {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as unknown as { requestAnimationFrame: (callback: (time: number) => void) => number }).requestAnimationFrame =
    (callback) => waiting.push(callback)
  const frames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  } as ScreenSurface
  const wiring: ScreenWiring = { surface, language: 'ja' }
  const answers: ((reading: FileReading) => void)[] = []
  const store: FileStore = {
    readFileToOpen: () =>
      new Promise<FileReading>((resolve) => {
        answers.push(resolve)
      }),
    adoptFileReadToOpen: () => {},
    forgetOpenedFile: () => undefined,
    readOpenedFileState: async () => ({ kind: 'none' }),
    restoreOpenedFilePermission: async () => ({ kind: 'none' }),
    overwriteOpenedFile: async () => ({
      ok: false,
      fault: { reason: 'noOpenedFile', what: 'this document has never been in a file' },
    }),
    writeChosenFile: async (write: ChosenFileWrite) => ({
      ok: true,
      openedFile: { kind: 'writable', fileName: write.suggestedFileName },
    }),
  }
  const loop = frameLoop({ showSvg: () => undefined } as never, decoded(templateJson()), SCREEN, wiring, store)
  frames()
  return {
    loop,
    view: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    frames,
    aim: (next) => {
      part = next
    },
    handOver: (text) => {
      const answer = answers.shift()
      if (answer === undefined) throw new Error('SK-10 asked the store for no file')
      answer({ ok: true, file: { bytes: new TextEncoder().encode(text), fileName: FILE_NAME } })
    },
  }
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const pointer = (phase: PointerPhase): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: 500,
  y: 300,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

function pressPart(one: Bench, part: Record<string, unknown>): void {
  one.aim({
    part: null,
    entry: null,
    format: null,
    taskGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
    ...part,
  } as unknown as ScreenPart)
  one.loop.receiveInput(pointer('down'))
  one.loop.receiveInput(pointer('up'))
  one.aim(null)
}

const showsOpenChooser = (view: ScreenView): boolean =>
  JSON.stringify(view.openModal ?? null).includes(OPEN_CHOOSER)

interface Opened {
  readonly one: Bench
  readonly chooserShown: boolean
}

// see SK-10, OP-3, OP-4
async function open(json: Json): Promise<Opened> {
  const one = bench()
  one.loop.receiveInput(SK_10)
  one.frames()
  await settle()
  one.handOver(JSON.stringify(json))
  await settle()
  one.frames()
  const chooserShown = showsOpenChooser(one.view())
  if (!chooserShown) return { one, chooserShown }
  pressPart(one, { part: OPEN_CHOOSER, entry: REPLACE_ENTRY })
  await settle()
  one.frames()
  if (one.view().confirmation !== null) {
    pressPart(one, { part: CONFIRMATION, confirmationAnswer: 'proceed' })
    await settle()
    one.frames()
  }
  return { one, chooserShown }
}

const milestoneOf = (loop: FrameLoop, taskUid: number): boolean | null =>
  loop.document().schedule.tasks.find((task) => task.uid === taskUid)?.milestone ?? null

interface InvariantWords {
  readonly rowId: string
  readonly text: { readonly ja: string; readonly en: string }
}

const IV_22_WORDS: string = (() => {
  const words = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
    invariants: InvariantWords[]
  }
  const found = words.invariants.find((one) => one.rowId === 'IV-22')
  if (found === undefined) throw new Error('premise: the dictionary holds no IV-22 entry (CR-586 E-05)')
  return found.text.ja
})()

const refusalNoticeIn = (notices: readonly Notice[]): Notice | undefined =>
  notices.find((one) => one.manner === 'NT-1' && one.text === IV_22_WORDS)

// see CV-9
const CV_9_REFUSED =
  '⛔ 一覧の外の名（黒）は、`CM-30`（`FR-042`）も、`GRS JSON` の取り込み（`05-07-design.md` の 表 T-220 の前文のスキーマ、拒んだときの理由は 表 T-233 の `RS-25`）も受けてはならない（MUST NOT）'
const BLACK = bare(rowOf(specTable('T-294'), 'S-315').by['保存する綴り'] ?? '')

describe('the GRS JSON open path refuses IV-22 and a bandless row colour (CR-586 seam S-5, FR-076, T-233 closing)', () => {
  it('control: the same file with the one milestone value agreeing opens, through the chooser, and replaces', async () => {
    const json = withMilestone(templateJson(), DRAWN_MILESTONE.taskUid, true)
    json['schedule']['tasks'].find((one: Json) => one['uid'] === DRAWN_BAR.taskUid)['name'] = 'control marker'
    const { one, chooserShown } = await open(json)
    expect(chooserShown, 'OP-3: a file that passes FR-023 is asked about').toBe(true)
    const marked = one.loop.document().schedule.tasks.find((task) => task.uid === DRAWN_BAR.taskUid)
    expect(marked?.name, 'the control file replaced the document').toBe('control marker')
  })

  it.each([
    ['the shape says milestone and the Task says false', shapeSaysMilestone, DRAWN_MILESTONE.taskUid, true],
    ['the shape says bar and the Task says true', taskSaysMilestone, DRAWN_BAR.taskUid, false],
  ] as const)(
    `${T_233_CLOSING} -- %s: refused before OP-3, the document is kept, an NT-1 notice carries IV-22`,
    async (_label, scene, taskUid, heldValue) => {
      const { one, chooserShown } = await open(scene())
      expect(chooserShown, 'OP-5: FR-023 runs before OP-3, so a refused file never reaches the chooser').toBe(false)
      expect(milestoneOf(one.loop, taskUid), 'the held document is not replaced').toBe(heldValue)
      const notice = refusalNoticeIn(one.view().notices)
      expect(notice, JSON.stringify(one.view().notices)).toBeDefined()
    },
  )

  it(`${CV_9_REFUSED} -- a row coloured with the bandless name is refused before OP-3 and the document is kept`, async () => {
    expect(rowOf(specTable('T-017b'), 'CV-9').cells.join(' ')).toContain(CV_9_REFUSED)
    const json = templateJson()
    const heldColour = json['schedule']['taskGroups'][0]['color'] as string | null
    json['schedule']['taskGroups'][0]['color'] = BLACK
    const { one, chooserShown } = await open(json)
    expect(chooserShown).toBe(false)
    expect(one.loop.document().schedule.taskGroups[0]?.color ?? null).toBe(heldColour)
  })
})
