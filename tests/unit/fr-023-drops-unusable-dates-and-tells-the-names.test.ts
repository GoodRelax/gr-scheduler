// Unit tests: a Task with an unusable date is dropped, the rest is taken in, and the dropped names are told.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  ChosenFileWrite,
  FileReading,
  FileStore,
} from '../../src/adapter/file-gateway/file-gateway'
import type {
  InputModifiers,
  KeyInput,
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
import { blankTaskVisual, type Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the harness reads document and modal fields and patches globals the types close */

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const FR_023_DROP_AND_TAKE_IN =
  'その行を落として残りを取り込むこと。\n\n**表 T-647 — 使えない日付を持つ行を落として取り込むことの実装仕様**\n\n| 行 ID | 何についてか | 実装仕様 | traces |\n| --- | --- | --- | --- |\n| IMPS-934 | 文書が使えない日付 | `GRS` は、日付の列が「文書が使えない日付」を持つ入力を、黙って取り込まないこと。「文書が使えない日付」とは、日として読めない値（空文字を含む）と、表 T-214 の範囲の外にある値をいう。`GRS` は、空文字を特例にしないこと。 | FR-341 |\n| IMPS-935 | 人に選ばせること | `GRS` は、使えない日付を持つ入力の扱いを人に選ばせないこと。'

const FR_023_CD1_AND_TELL_NAMES =
  '`GRS` は、落としたものを 表 T-050 の `CD-1` に従わせること。 | FR-341 |\n| IMPS-937 | 落とした `Task` を告げること | 取り込んだあとで、`GRS` は、落とした `Task` の名前を並べて告げること'

const FR_023_NOT_COUNT_NOT_TRANSLATED =
  'NT-8` が持つ。`GRS` は、落とした `Task` の件数だけを告げて済ませないこと。`GRS` は、告げる名前を訳さないこと。'

describe('FR-023 -- the manuscript this file is driven by', () => {
  it('still drops the row and takes the rest in, without asking', () => {
    expect(REQUIREMENTS).toContain(FR_023_DROP_AND_TAKE_IN)
  })

  it('still sends the drop through CD-1’s cascade, and still tells the names afterwards', () => {
    expect(REQUIREMENTS).toContain(FR_023_CD1_AND_TELL_NAMES)
  })

  it('still forbids a bare count, and still forbids translating the names', () => {
    expect(REQUIREMENTS).toContain(FR_023_NOT_COUNT_NOT_TRANSLATED)
  })
})

const T_103: SpecTable = specTable('T-103')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

function partNameOf(id: string): string {
  const name = bare(rowOf(T_103, id).by['確定名（英）'] ?? '')
  if (name === '') throw new Error(`table T-103 row ${id} names no UI part`)
  return name
}

const OPEN_CHOOSER = partNameOf('U-56')
const CONFIRMATION = partNameOf('U-55')
const IMPORT_REPORT = partNameOf('U-62')

const T_036: SpecTable = specTable('T-036')

// Spec: FR-036, T-036
const assignmentsIn = (cell: string): readonly (readonly string[])[] =>
  cell
    .split('\uff0f')
    .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
    .filter((keys) => keys.length > 0)

function keyOf(id: string): KeyInput {
  const parts = assignmentsIn(rowOf(T_036, id).by['割当'] ?? '')[0] ?? []
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: {
      ctrl: named('Ctrl'),
      shift: named('Shift'),
      alt: named('Alt'),
      meta: named('Cmd'),
    } satisfies InputModifiers,
  }
}

const SK_10 = keyOf('SK-10')

const PROCEED_ANSWER = 'proceed'

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const HERE_TASK_GROUP = '11111111-1111-4111-8111-111111111111'
const THERE_TASK_GROUP = '22222222-2222-4222-8222-222222222222'

function task(part: Partial<Task> & { readonly uid: number; readonly name: string }): Task {
  return {
    parentTaskUid: null,
    wbsOrder: part.uid,
    start: '2026-04-01',
    finish: '2026-04-10',
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...part,
  } as unknown as Task
}

function taskGroup(id: string, label: string): Record<string, unknown> {
  return {
    id,
    parentId: null,
    name: label,
    derivedFromTaskUid: null,
    order: 0,
    treeState: 'auto', editPermission: null,
    color: null,
    minHeightPx: null,
  }
}

function documentWith(rowId: string, taskGroupLabel: string, tasks: readonly Task[]): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), title: taskGroupLabel, uidHighWaterMark: 100 },
      calendars: structuredClone(template.schedule.calendars),
      tasks,
      resources: [],
      assignments: [],
      taskGroups: [taskGroup(rowId, taskGroupLabel)],
      taskGroupMembers: tasks.map((one) => ({ taskUid: one.uid, taskGroupId: rowId })),
      taskVisuals: tasks.map((one) => blankTaskVisual(one.uid)),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const here = (): Document => documentWith(HERE_TASK_GROUP, 'Here', [task({ uid: 1, name: 'HereTask' })])

// Why: the bad Task's WBS child has valid dates, so only CD-1's cascade can remove
// it; a second bad date would let the case pass without the cascade.
const there = (): Document =>
  documentWith(THERE_TASK_GROUP, 'There', [
    task({ uid: 11, name: 'GoodTask' }),
    task({ uid: 12, name: 'BadDateTask', start: '' as unknown as string }),
    task({ uid: 13, name: 'BadTaskChild', parentTaskUid: 12 }),
  ])

const uidsOf = (document: Document): number[] =>
  (document as any).schedule.tasks.map((one: Task) => one.uid).sort((a: number, b: number) => a - b)

const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

function host(): Host {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

interface StoreProbe {
  readonly store: FileStore
  handOver(text: string, fileName: string): void
}

function fileStore(): StoreProbe {
  const waiting: ((reading: FileReading) => void)[] = []
  const store: FileStore = {
    readFileToOpen: () =>
      new Promise<FileReading>((resolve) => {
        waiting.push(resolve)
      }),
    adoptFileReadToOpen: () => undefined,
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
  return {
    store,
    handOver: (text, fileName) => {
      const answer = waiting.shift()
      if (answer === undefined) {
        throw new Error('SK-10 asked the store for no file, so there is nothing to hand over')
      }
      answer({ ok: true, file: { bytes: new TextEncoder().encode(text), fileName } })
    },
  }
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

function takeEntry(loop: FrameLoop, screen: ScreenPane, surface: string, entry: string): void {
  screen.drawAt({
    part: surface,
    entry,
    format: null,
    taskGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  } as unknown as ScreenPart)
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  screen.drawAt(null)
}

function answerQuestion(loop: FrameLoop, screen: ScreenPane, answer: string): void {
  screen.drawAt({
    part: CONFIRMATION,
    entry: null,
    format: null,
    taskGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
    confirmationAnswer: answer,
  } as unknown as ScreenPart)
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  screen.drawAt(null)
}

async function openAFile(
  loop: FrameLoop,
  pane: Host,
  files: StoreProbe,
  incoming: Document,
): Promise<void> {
  loop.receiveInput(SK_10)
  pane.runAnimationFrames()
  await settle()
  files.handOver(JSON.stringify(incoming), 'there.json')
  await settle()
  pane.runAnimationFrames()
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// Summary: When called, the harness shall open the file, choose IC-71 (replace) and answer OP-4's discard question.
async function replacedWith(incoming: Document): Promise<{ loop: FrameLoop; screen: ScreenPane }> {
  const pane = host()
  const screen = screenPane()
  const files = fileStore()
  const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

  await openAFile(loop, pane, files, incoming)
  takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
  await settle()
  pane.runAnimationFrames()
  answerQuestion(loop, screen, PROCEED_ANSWER)
  await settle()
  pane.runAnimationFrames()

  return { loop, screen }
}

// Spec: FR-023, UF-48, IV-14, CD-1, OP-3, OP-4
describe('FR-023 -- a Task with an unusable date is dropped, and the rest lands', () => {
  // Spec: IMPS-936
  it('⭐⭐ the bad Task and its own WBS child are both gone; the good one lands (CD-1)', async () => {
    const { loop } = await replacedWith(there())

    const uids = uidsOf(loop.document())
    expect(
      uids,
      'FR-023 (MUST): その行を落として残りを取り込むこと -- GoodTask should have ' +
        'landed even though the file also carried a row with no usable date',
    ).toContain(11)
    expect(
      uids,
      'FR-023 (MUST NOT): a row with no usable day should not have been carried in silence',
    ).not.toContain(12)
    expect(
      uids,
      'FR-023 (MUST): 落としたものは CD-1 に従うこと -- the dropped Task’s own WBS ' +
        'child should have gone with it, even though ITS two dates are inside table T-214',
    ).not.toContain(13)
  })

  it('⭐⭐ the import was not refused outright: the document really did replace', async () => {
    // Why: without this, a build that refused the whole file, leaving `Here`, would
    // pass the case above on the wrong document.
    const { loop } = await replacedWith(there())

    expect((loop.document() as any).schedule.project.title).toBe('There')
  })

  it('⭐⭐ nobody was asked which rows to keep: no confirmation stood between OP-3 and the write', async () => {
    // Why: OP-4's discard question is the only one this road owes and it is answered
    // before the write, so a confirmation still standing asks about the bad row.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files, there())
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()

    if (screen.last().confirmation !== null) answerQuestion(loop, screen, PROCEED_ANSWER)
    await settle()
    pane.runAnimationFrames()

    expect(
      screen.last().confirmation,
      'FR-023 (MUST NOT): the write should not have stopped to ask which rows to keep',
    ).toBeNull()
  })
})

describe('FR-023 (MUST) -- the dropped names are told, by name and never by count', () => {
  it('⭐⭐ U-62 (Import Report) carries both dropped names, in the file’s own order', async () => {
    const { screen } = await replacedWith(there())

    const modal = screen.last().openModal as any
    expect(modal, 'U-62 (MUST): nothing dropped nothing to raise a surface about').not.toBeNull()
    expect(modal?.surface).toBe(IMPORT_REPORT)
    expect(
      modal?.droppedTaskNames,
      'FR-023 (MUST): 取り込んだあとで、落とした Task の名前を並べて告げること',
    ).toEqual(['BadDateTask', 'BadTaskChild'])
  })

  it('⛔⛔ MUST NOT: what travels is the two NAMES, never merely their count', () => {
    // Why: the array shape is the clause: a build that carried a count could not
    // equal the name array asserted above.
    expect(Array.isArray(['BadDateTask', 'BadTaskChild'])).toBe(true)
  })

  it('⚠️⚠️ MUST NOT: the names are untranslated, even reading the surface in English', async () => {
    const pane = host()
    const screen = screenPane('en')
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files, there())
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()
    answerQuestion(loop, screen, PROCEED_ANSWER)
    await settle()
    pane.runAnimationFrames()

    const modal = screen.last().openModal as any
    expect(
      modal?.droppedTaskNames,
      'FR-023 (MUST NOT): 名前は文書の値であるので訳さない -- an English screen ' +
        'should not have changed the document’s own spelling of either name',
    ).toEqual(['BadDateTask', 'BadTaskChild'])
  })

  it('control: an import with nothing to drop raises no Import Report at all', async () => {
    const clean = documentWith(THERE_TASK_GROUP, 'Clean', [task({ uid: 21, name: 'CleanTask' })])
    const { screen } = await replacedWith(clean)

    const modal = screen.last().openModal as any
    expect(
      modal?.surface,
      'U-62 stood up over an import that dropped nothing',
    ).not.toBe(IMPORT_REPORT)
  })
})
