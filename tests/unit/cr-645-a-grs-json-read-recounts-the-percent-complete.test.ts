// CR-645: reading a GRS JSON recounts percentComplete from the dates and tells RS-52; MSPDI keeps its value (FR-012, FR-021).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromEmbeddedHtml } from '../../src/adapter/document-codec/embedded-html-codec'
import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/json-codec'
import { documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/mspdi-codec'
import type { ChosenFileWrite, FileReading, FileStore } from '../../src/adapter/file-gateway/file-gateway'
import type { InputModifiers, KeyInput, PointerInput, PointerPhase } from '../../src/adapter/input-command-translator/input-command-translator'
import type { Notice, ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { blankTaskVisual, type Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'

const LAST_SAVED_AT = '2026-10-03T09:00:00'

const SPEC_DIR = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = readFileSync(join(SPEC_DIR, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n')
const SCHEMA_TEXT = readFileSync(join(SPEC_DIR, '_source', 'grs-document.schema.json'), 'utf8')

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

// see FR-012
function statementOfFr012(): string {
  const begin = REQUIREMENTS.indexOf('**UID**: FR-012')
  const end = REQUIREMENTS.indexOf('**Relations**', begin)
  if (begin < 0 || end < 0) throw new Error('FR-012 is not where the requirements keep it')
  return REQUIREMENTS.slice(begin, end)
}

const stored = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}T00:00:00`

const taskRow = (uid: number, part: Record<string, unknown>): Record<string, unknown> => ({
  uid,
  wbsParentUid: null,
  wbsOrder: uid,
  name: `T${uid}`,
  start: stored(5),
  finish: stored(12),
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

const ROW = '5c000000-0000-4000-8000-000000000645'

const documentObject = (tasks: readonly Record<string, unknown>[]): Record<string, any> => {
  const template = structuredClone(TEMPLATE)
  return {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
      tasks,
      resources: [],
      assignments: [],
      taskGroups: [
        { id: ROW, parentId: null, label: 'A', derivedFromTaskUid: null, order: 0, treeState: 'auto', color: null, minHeight: null },
      ],
      taskGroupMembers: tasks.map((one) => ({ taskUid: one['uid'], groupId: ROW })),
      taskVisuals: tasks.map((one) => blankTaskVisual(one['uid'] as number)),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: template.documentSettings,
    documentStamp: template.documentStamp,
    changeLog: [],
  }
}

// WHY: Mon 5 Jan to Mon 12 Jan 2026 is a plan of 6 working days (FR-012 since CR-667: both end days count).
const UNSTARTED_WRITTEN_70 = taskRow(1, { percentComplete: 70 })
// WHY: begun Mon 5, stopped Tue 6 = 2 working days held (FR-011 counts both end days), so round(2 / 6 x 100) = 33.
const RUNNING_WRITTEN_0 = taskRow(2, { actualStart: stored(5), stop: stored(6), resumeValid: true })
// WHY: a one-day plan finished in its one day is 100 whatever was written (FR-012, CR-667).
const POINT_FINISHED_WRITTEN_30 = taskRow(3, {
  start: stored(7),
  finish: stored(7),
  actualStart: stored(7),
  actualFinish: stored(7),
  resumeValid: false,
  percentComplete: 30,
})
const AGREEING = taskRow(4, { percentComplete: 0 })

const disagreeingText = (): string =>
  JSON.stringify(documentObject([UNSTARTED_WRITTEN_70, RUNNING_WRITTEN_0, POINT_FINISHED_WRITTEN_30, AGREEING]))

const taskOf = (document: Document, uid: number): Task => {
  const found = document.schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`no Task ${uid}`)
  return found
}

const greatest = (): string => TEMPLATE['schemaVersion'] as string

// WHY: the document a test opens over; built from the bundled template so it is accepted as is.
function currentDocument(): Document {
  const parsed = structuredClone(TEMPLATE) as { schedule: { project: Record<string, unknown> } }
  parsed.schedule.project['sourceFormat'] ??= 'grs'
  const read = documentFromJson(jsonFromDocument((parsed) as never), greatest())
  if (!read.ok) throw new Error('the bundled template was refused')
  return read.document
}

describe('CR-645 the clauses as the manuscript holds them', () => {
  it('FR-012: a GRS JSON read recounts, an MSPDI read keeps, and the recount is told', () => {
    const statement = statementOfFr012()
    expect(statement).toContain('**`GRS JSON` を読んだときも、格納済みの完了率を日付から数え直すこと（MUST）**')
    expect(statement).toContain('⛔ `MSPDI` を読んだときは数え直してはならない（MUST NOT） —— 取り込んだ値を保つ（`FR-021`）。')
    expect(statement).toContain('`NT-3` と `RS-52`')
    expect(statement).toContain('数え直しだけを理由に、未保存の編集（`FR-100`）を立ててはならない（MUST NOT）')
  })

  it('OP-6: percentComplete is not restored but recounted', () => {
    const cells = rowOf(specTable('T-024a'), 'OP-6').cells.join(' | ')
    expect(cells).toContain('`percentComplete` は、文書の値を復元せず、日付から数え直すこと（MUST）')
  })

  it('RS-52 (NT-3): the reason names both a calendar change and a GRS JSON read', () => {
    const row = rowOf(specTable('T-233'), 'RS-52')
    expect(bare(row.by['作法'] ?? '')).toBe('NT-3')
    expect(row.cells.join(' | ')).toContain('`GRS JSON` を読んだとき')
  })

  it('AT-39: the schema note says GRS recounts it whenever it reads the file', () => {
    expect(SCHEMA_TEXT).toContain('GRS recounts it whenever the dates change and whenever it reads this file, so the dates decide')
  })
})

describe('FR-012: documentFromJson recounts percentComplete from the dates', () => {
  const read = documentFromJson(disagreeingText(), greatest())
  if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults).slice(0, 400)}`)

  it('an unstarted Task written as 70 reads as 0', () => {
    expect(taskOf(read.document, 1).percentComplete).toBe(0)
  })

  it('a running Task written as 0 reads as its worked days over its plan, 33', () => {
    expect(taskOf(read.document, 2).percentComplete).toBe(33)
  })

  it('a finished one-day Task written as 30 reads as 100', () => {
    expect(taskOf(read.document, 3).percentComplete).toBe(100)
  })

  it('RS-52: the reading counts the Tasks whose value moved, and only those', () => {
    expect(taskOf(read.document, 4).percentComplete).toBe(0)
    expect(read.recountedCount).toBe(3)
  })

  it('a document whose values agree with its dates reads with nothing recounted', () => {
    const again = documentFromJson(jsonFromDocument((read.document) as never), greatest())
    if (!again.ok) throw new Error('the recounted document was refused')
    expect(again.recountedCount).toBe(0)
  })

  it('VC-5: after the recount a positive value without actualStart is left nowhere', () => {
    const standing = read.document.schedule.tasks.filter(
      (one) => (one.percentComplete ?? 0) > 0 && one.actualStart === null,
    )
    expect(standing).toEqual([])
  })
})

describe('FR-012 / IO-7: a GRS JSON embedded in a single .html is recounted too', () => {
  it('the embedded document reads with the same recount', () => {
    const html = `<!doctype html><html><head></head><body><script type="application/json" id="grs-document">${disagreeingText()}</script></body></html>`
    const read = documentFromEmbeddedHtml(html, ['grs-document'], greatest())
    if (!read.ok) throw new Error(`refused: ${JSON.stringify(read).slice(0, 400)}`)
    expect(taskOf(read.document, 1).percentComplete).toBe(0)
    expect(read.recountedCount).toBe(3)
  })
})

describe('FR-012 / FR-021: an MSPDI read keeps the value it carried', () => {
  it('a Task written as 70 with no actuals still reads as 70', () => {
    const source = documentObject([UNSTARTED_WRITTEN_70, AGREEING]) as unknown as Document
    const text = mspdiFromDocument(source, LAST_SAVED_AT).text
    const read = documentFromMspdi(text, source)
    if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults).slice(0, 400)}`)
    expect(taskOf(read.document, 1).percentComplete).toBe(70)
  })
})

const T_036: SpecTable = specTable('T-036')
const T_103: SpecTable = specTable('T-103')

function keyOf(id: string): KeyInput {
  const cell = rowOf(T_036, id).by['割当'] ?? ''
  const first = cell.split('／')[0] ?? ''
  const parts = [...first.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? '')
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: named('Cmd') } satisfies InputModifiers,
  }
}

function partNameOf(id: string): string {
  const name = bare(rowOf(T_103, id).by['確定名（英）'] ?? '')
  if (name === '') throw new Error(`table T-103 row ${id} names no UI part`)
  return name
}

interface ReasonEntry {
  readonly rowId: string
  readonly text: { readonly ja: string; readonly en: string }
}

function reasonTextOf(rowId: string): string {
  const path = join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json')
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { reasons: ReasonEntry[] }
  const found = raw.reasons.find((each) => each.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${rowId}`)
  return found.text.ja
}

const SCREEN: FrameEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) {
    delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  } else {
    ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
  }
})

function frames(): () => void {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as unknown as { requestAnimationFrame: (callback: (time: number) => void) => number }).requestAnimationFrame =
    (callback) => {
      waiting.push(callback)
      return waiting.length
    }
  return () => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
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

interface Opened {
  readonly loop: FrameLoop
  readonly notices: () => readonly Notice[]
}

// see OP-3, OP-4
async function openedByReplacing(text: string, fileName: string): Promise<Opened> {
  const runFrames = frames()
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  }
  const wiring: ScreenWiring = { surface, language: 'ja' }
  const waiting: ((reading: FileReading) => void)[] = []
  const store: FileStore = {
    readFileToOpen: () => new Promise<FileReading>((resolve) => { waiting.push(resolve) }),
    adoptFileReadToOpen: () => undefined,
    forgetOpenedFile: () => undefined,
    readOpenedFileState: async () => ({ kind: 'none' }),
    restoreOpenedFilePermission: async () => ({ kind: 'none' }),
    overwriteOpenedFile: async () => ({ ok: false, fault: { reason: 'noOpenedFile', what: 'never in a file' } }),
    writeChosenFile: async (write: ChosenFileWrite) => ({ ok: true, openedFile: { kind: 'writable', fileName: write.suggestedFileName } }),
  }
  const loop = frameLoop({ showSvg: () => undefined }, currentDocument(), SCREEN, wiring, store)
  const press = (next: Record<string, unknown>): void => {
    part = {
      entry: null,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
      ...next,
    } as unknown as ScreenPart
    loop.receiveInput(pointer('down'))
    loop.receiveInput(pointer('up'))
    part = null
  }

  loop.receiveInput(keyOf('SK-10'))
  runFrames()
  await settle()
  const answer = waiting.shift()
  if (answer === undefined) throw new Error('SK-10 asked the store for no file')
  answer({ ok: true, file: { bytes: new TextEncoder().encode(text), fileName } })
  await settle()
  runFrames()
  press({ part: partNameOf('U-56'), entry: 'IC-71' })
  await settle()
  runFrames()
  press({ part: partNameOf('U-55'), confirmationAnswer: 'proceed' })
  await settle()
  runFrames()

  return {
    loop,
    notices: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view.notices
    },
  }
}

describe('RS-52 (NT-3): opening a GRS JSON that disagrees with its dates tells the recount', () => {
  it('the notice carries the number of Tasks whose value moved, and the opened document holds the recount', async () => {
    const { loop, notices } = await openedByReplacing(disagreeingText(), 'incoming.json')
    expect(taskOf(loop.document(), 1).percentComplete).toBe(0)
    const told = notices().find((one) => one.text === reasonTextOf('RS-52'))
    expect(told).toBeDefined()
    expect(told?.manner).toBe('NT-3')
    expect(told?.affectedCount).toBe(3)
  })

  it('FR-012 / FR-100: a recount alone leaves no unsaved edits after a replacing open', async () => {
    const { loop } = await openedByReplacing(disagreeingText(), 'incoming.json')
    expect(loop.hasUnsavedEdits()).toBe(false)
  })

  it('FR-012 / FR-021: opening an MSPDI with the same value tells no recount and keeps 70', async () => {
    const source = documentObject([UNSTARTED_WRITTEN_70, AGREEING]) as unknown as Document
    const { loop, notices } = await openedByReplacing(mspdiFromDocument(source, LAST_SAVED_AT).text, 'incoming.xml')
    expect(taskOf(loop.document(), 1).percentComplete).toBe(70)
    expect(notices().find((one) => one.text === reasonTextOf('RS-52'))).toBeUndefined()
  })
})
