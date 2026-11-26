// Unit tests: the Open Chooser, the Confirmation and the Export Chooser the frame loop puts up.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  ChosenFileWrite,
  FileReading,
  FileStore,
  FileStoreFaultReason,
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
import type {
  AppShellReading,
  AppShellSource,
} from '../../src/adapter/document-codec/document-codec'
import type {
  RasterFaultReason,
  RasterSizePx,
  Rastering,
  Rasterizer,
} from '../../src/adapter/image-exporter/image-exporter'
import type { Document } from '../../src/entity/document-model/document/document'
import { blankTaskVisual, type Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fakes stand in for host objects the types close */

const T_024: SpecTable = specTable('T-024')
const T_024A: SpecTable = specTable('T-024a')
const T_036: SpecTable = specTable('T-036')
const T_037: SpecTable = specTable('T-037')
const T_103: SpecTable = specTable('T-103')
const T_109: SpecTable = specTable('T-109')
const T_230: SpecTable = specTable('T-230')
const T_233: SpecTable = specTable('T-233')

/** @purity pure */
function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

// Why: by position, not by heading, as every heading here is Japanese prose; the guard
// describe at the foot pins each table's columns, so an inserted column reaches this file.
/** @purity pure */
function cellOf(table: SpecTable, id: string, at: number): string {
  const cells = rowOf(table, id).cells
  const cell = cells[at]
  if (cell === undefined) throw new Error(`table ${table.id} row ${id} has no cell ${at}`)
  return cell
}

const T_103_NAME = 0
const T_109_SURFACE = 0
const T_109_AUTHORITY = 3
const T_024_DIRECTION = 1
const T_024_EXTENSION = 2
const T_024_OFFERED = 4
const T_024_FIRST_CHARACTER = 5
const T_230_HISTORY = 2
const T_036_ASSIGNMENT = 1
const T_036_ENTRANCE = 2
const T_233_MANNER = 1

const T_233_SHARING = 3

const SHARED_WORDS = /語は `(RS-\d+)`/

function wordsRowOf(specTableRowId: string): string {
  return SHARED_WORDS.exec(cellOf(T_233, specTableRowId, T_233_SHARING))?.[1] ?? specTableRowId
}
// Spec: NT-3a
const NEXT_STEP_MANNER = 'NT-3a'

/** @purity pure */
function partNameOf(id: string): string {
  const name = bare(cellOf(T_103, id, T_103_NAME))
  if (name === '') throw new Error(`table T-103 row ${id} names no UI part`)
  return name
}

const OPEN_CHOOSER = partNameOf('U-56')
const EXPORT_CHOOSER = partNameOf('U-54')
const CONFIRMATION = partNameOf('U-55')

// Why: a row may name several surfaces (IC-52 names every surface IN-4 closes), so every
// code span in the cell is read rather than the cell as a whole.
/** @purity pure */
function entriesOn(surface: string): readonly string[] {
  return T_109.rows
    .filter((row) =>
      [...(row.cells[T_109_SURFACE] ?? '').matchAll(/`([^`]+)`/g)].some(
        (found) => found[1] === surface,
      ),
    )
    .map((row) => row.id)
}

// Why: the one Japanese word matched here: the direction column is prose with no other join,
// as the extension and first character belong to the rows OP-1 takes in.
const OUT_DIRECTION = '書出'

/** @purity pure */
function outDirectionRows(): readonly string[] {
  return T_024.rows
    .filter((row) => (row.cells[T_024_DIRECTION] ?? '').includes(OUT_DIRECTION))
    .map((row) => row.id)
}

const IN_DIRECTION = '取り込み'

// Spec: OP-1
/** @purity pure */
function inDirectionRows(): readonly string[] {
  return T_024.rows
    .filter((row) => (row.cells[T_024_DIRECTION] ?? '').includes(IN_DIRECTION))
    .map((row) => row.id)
}

const OFFERED_ON_IC_2 = '出す'

// Why: which rows are offered is the table's own answer, and an extension is no longer the
// test: IO-8 is a file and is not offered.
/** @purity pure */
function offeredOnIc2Rows(): readonly string[] {
  return T_024.rows.filter((row) => (row.cells[T_024_OFFERED] ?? '') === OFFERED_ON_IC_2).map((row) => row.id)
}

/** @purity pure */
function extensionOf(id: string): string | null {
  const cell = cellOf(T_024, id, T_024_EXTENSION)
  const found = /`([^`]+)`/.exec(cell)
  return found === null ? null : (found[1] ?? null)
}

/** @purity pure */
function firstCharacterOf(id: string): string | null {
  const cell = cellOf(T_024, id, T_024_FIRST_CHARACTER)
  const found = /`([^`]+)`/.exec(cell)
  return found === null ? null : (found[1] ?? null)
}

// Why: read, not trusted: the roster is generated from table T-024, so every value taken from
// here is joined back to the table by the guard at the foot of this file.
interface ExchangeFormat {
  readonly specTableRowId: string
  readonly extension: string | null
  readonly firstCharacter: string | null
}

const EXCHANGE_FORMATS: readonly ExchangeFormat[] = (
  JSON.parse(
    readFileSync(
      join(process.cwd(), 'src', 'adapter', 'document-codec', 'exchange-formats.json'),
      'utf8',
    ),
  ) as { formats: ExchangeFormat[] }
).formats

// Why: a notice carries its words but not its reason, so a case pins the row by its words.
interface ReasonWords {
  readonly specTableRowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
  readonly nextStep: Readonly<Record<DisplayLanguage, string>>
}

// Why: the manuscript's copy, not the built one, as these cases are driven from docs/spec.
const MANUSCRIPT_WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as {
  reasons: ReasonWords[]
  confirmation: { answer: string; text: Readonly<Record<DisplayLanguage, string>> }[]
}

const REASON_WORDS: readonly ReasonWords[] = MANUSCRIPT_WORDS.reasons

// Why: the answers come from the dictionary's confirmation section, not from table T-109,
// as NT-7 refuses them a row there.
const CONFIRMATION_ANSWERS: readonly string[] = MANUSCRIPT_WORDS.confirmation.map(
  (one) => one.answer,
)

const PROCEED_ANSWER = 'proceed'
const CANCEL_ANSWER = 'cancel'

/** @purity pure */
function wordsFor(specTableRowId: string): ReasonWords {
  const found = REASON_WORDS.find((one) => one.specTableRowId === wordsRowOf(specTableRowId))
  if (found === undefined) {
    throw new Error(
      `FR-076 (MUST): table T-233 row ${specTableRowId} has no entry in FR-038's dictionary, so a notice ` +
        'carrying it cannot be told in words',
    )
  }
  return found
}

/** @purity pure */
function mannerFor(specTableRowId: string): string {
  const manner = bare(cellOf(T_233, specTableRowId, T_233_MANNER))
  if (manner === '') throw new Error(`table T-233 row ${specTableRowId} names no manner`)
  return manner
}

/** @purity pure */
function keyOf(id: string): KeyInput {
  const parts =
    cellOf(T_036, id, T_036_ASSIGNMENT)
      .split('\uff0f')
      .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
      .filter((keys) => keys.length > 0)[0] ?? []
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
const SK_11 = keyOf('SK-11')
const SK_12 = keyOf('SK-12')
const SK_6 = keyOf('SK-6')
const SK_20 = keyOf('SK-20')

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const HERE_TASK_GROUP = '11111111-1111-4111-8111-111111111111'
const THERE_TASK_GROUP = '22222222-2222-4222-8222-222222222222'

// Why: no actual at all (PS-1), as FR-055 fits the drawn extent and an actual nobody asked
// for moves the zoom every case here stands on.
/** @purity pure */
function task(uid: number, start: string, finish: string, name: string): Task {
  return {
    uid,
    parentTaskUid: null,
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
  }
}

/** @purity pure */
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

// Why: the project profile is FR-027's template's own in both documents, so MG-4 has nothing to
// ask (the rows of table T-224 are equal) and OP-3 is the only question left.
/** @purity pure */
function documentWith(
  title: string | null,
  rowId: string,
  taskGroupLabel: string,
  uids: readonly number[],
): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        title,
        uidHighWaterMark: 100,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: uids.map((uid) => task(uid, '2026-04-01T00:00:00', '2026-04-10T00:00:00', `Task ${uid}`)),
      resources: [],
      assignments: [],
      taskGroups: [taskGroup(rowId, taskGroupLabel)],
      taskGroupMembers: uids.map((uid) => ({ taskUid: uid, taskGroupId: rowId })),
      taskVisuals: uids.map(blankTaskVisual),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  return draft as unknown as Document
}

const here = (title: string | null = 'Here'): Document =>
  documentWith(title, HERE_TASK_GROUP, 'Here', [1, 2])

const there = (): Document => documentWith('There', THERE_TASK_GROUP, 'There', [11, 12])

// Why: exactly one shared UID, as OP-9 puts only matching UIDs in the frame, so its contents
// are a stated number rather than all or none.
const HERE_AND_THERE = 1
const overlapping = (): Document =>
  documentWith('There', THERE_TASK_GROUP, 'There', [HERE_AND_THERE, 12])

const uidsOf = (document: Document): number[] =>
  (document as any).schedule.tasks.map((one: Task) => one.uid).sort((a: number, b: number) => a - b)

const titleOf = (document: Document): string | null =>
  (document as any).schedule.project.title as string | null

const baselineCountOf = (document: Document): number =>
  ((document as any).schedule.baselineTasks as unknown[]).length

const baselineUidsOf = (document: Document): number[] =>
  ((document as any).schedule.baselineTasks as { uid: number }[])
    .map((one) => one.uid)
    .sort((a, b) => a - b)

// Why: FR-051 keeps the last two out of the settings, as they differ from one machine to the next.
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

/** @purity non-pure */
function host(): Host {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => {} },
    runAnimationFrames: () => {
      // Why: bounded, so a loop that asks for a frame from inside a frame (NFR-010 forbids it)
      // ends the case instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
  screens(): number
}

/** @purity non-pure */
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
    screens: () => views.length,
  }
}

interface StoreProbe {
  readonly store: FileStore
  readonly written: ChosenFileWrite[]
  pendingOpens(): number
  handOver(text: string, fileName: string): void
  // Why: bytes, as RS-4 is about a byte sequence that is not UTF-8 (CN-5), and everything
  // this file encodes as text is UTF-8 by construction.
  handOverBytes(bytes: Uint8Array, fileName: string, ignoredFileCount?: number): void
  failOpen(reason: FileStoreFaultReason): void
}

// Why: the default store works, so a fault never rides in unnoticed.
interface StoreBehavior {
  readonly chosenWriteFault?: FileStoreFaultReason
}

// Why: readFileToOpen does not answer at once, as CS-4 is about the stretch between asking
// and being answered; readOpenedFileState answers none, as these were never in a file.
/** @purity non-pure */
function fileStore(behavior: StoreBehavior = {}): StoreProbe {
  const written: ChosenFileWrite[] = []
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
    writeChosenFile: async (write) => {
      written.push(write)
      if (behavior.chosenWriteFault !== undefined) {
        return {
          ok: false,
          fault: { reason: behavior.chosenWriteFault, what: 'the case asked the store to fail' },
        }
      }
      return { ok: true, openedFile: { kind: 'writable', fileName: write.suggestedFileName } }
    },
  }
  const answerOne = (reading: FileReading): void => {
    const answer = waiting.shift()
    if (answer === undefined) {
      throw new Error(
        'OP-2 of table T-024a makes SK-10 the one entrance for opening a document, and ' +
          'taking it asked IF-3 for no file -- so OP-3 has nothing to put a question about',
      )
    }
    answer(reading)
  }
  return {
    store,
    written,
    pendingOpens: () => waiting.length,
    handOver: (text, fileName) => {
      answerOne({ ok: true, file: { bytes: new TextEncoder().encode(text), fileName } })
    },
    handOverBytes: (bytes, fileName, ignoredFileCount) => {
      // Why: the member is left off rather than set, as its absence reads as 0, OP-11's ordinary
      // open, so a case that asks for no caution hands over a reading without it.
      answerOne(
        ignoredFileCount === undefined
          ? { ok: true, file: { bytes, fileName } }
          : { ok: true, file: { bytes, fileName }, ignoredFileCount },
      )
    },
    failOpen: (reason) => {
      answerOne({ ok: false, fault: { reason, what: 'the case asked the store to fail' } })
    },
  }
}

// Why: both queues are drained: awaits resolve on the microtask queue, host deferrals on the macrotask one.
/** @purity non-pure */
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

// Why: CS-2 settles the gesture on what was drawn at the press, so the surface is told what
// it drew before the button goes down.
/** @purity non-pure */
function takeEntry(loop: FrameLoop, screen: ScreenPane, surface: string, entry: string): void {
  screen.drawAt({ part: surface, entry, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null })
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  screen.drawAt(null)
}

// Why: a second member, not an entry: FR-096 forbids an entrance per format, so a row of
// table T-024 is pressed through ScreenPart.format.
/** @purity non-pure */
function takeFormat(loop: FrameLoop, screen: ScreenPane, format: string): void {
  screen.drawAt({ part: EXPORT_CHOOSER, entry: null, format, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null })
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  screen.drawAt(null)
}

// Why: not takeEntry: NT-7 refuses the two answers a row of table T-109, so a press on one
// reports ScreenPart.confirmationAnswer and never ScreenPart.entry.
/** @purity non-pure */
function answerQuestion(loop: FrameLoop, screen: ScreenPane, answer: string): void {
  screen.drawAt({ part: CONFIRMATION, entry: null, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null, confirmationAnswer: answer })
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  screen.drawAt(null)
}

/** @purity non-pure */
async function editSomething(loop: FrameLoop, screen: ScreenPane, pane: Host): Promise<void> {
  takeEntry(loop, screen, partNameOf('U-31'), 'IC-13')
  await settle()
  pane.runAnimationFrames()
  expect(loop.hasUnsavedEdits(), 'precondition: IC-13 left no unsaved edit').toBe(true)
}

async function openAFile(
  loop: FrameLoop,
  pane: Host,
  files: StoreProbe,
  incoming: Document = there(),
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

// Spec: OP-3, MG-4
describe('the documents these cases drive', () => {
  it('are valid GRS JSON documents', () => {
    for (const document of [here(), here(null), there()]) {
      const report = validateDocument(document)
      expect(report.errors).toEqual([])
      expect(report.valid).toBe(true)
    }
  })

  it('share nothing OP-3 does not ask about: no uid is in both, and the profiles are equal', () => {
    // Why: a premise: FR-022 gathers merge candidates by UID and MG-4 asks about table T-224,
    // and either would put a second question in the way of the one these cases are about.
    expect(uidsOf(here()).filter((uid) => uidsOf(there()).includes(uid))).toEqual([])
    const profile = (document: Document): Record<string, unknown> => {
      const project = { ...((document as any).schedule.project as Record<string, unknown>) }
      delete project['title']
      delete project['uidHighWaterMark']
      return project
    }
    expect(profile(here())).toEqual(profile(there()))
  })
})

// Spec: OP-3, U-56, IC-71, IC-72, IC-73, FR-029
describe('OP-3 -- reading a file puts the three-way question up', () => {
  it('U-56: taking SK-10 and handing over a file leaves the Open Chooser standing', async () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)

    expect(
      screen.last().openModal?.surface,
      `OP-3 (MUST): the file was read and no ${OPEN_CHOOSER} stands, so nobody is being asked`,
    ).toBe(OPEN_CHOOSER)
  })

  it('IC-71 / IC-72 / IC-73: the surface carries the entries table T-109 places on it', async () => {
    const placed = entriesOn(OPEN_CHOOSER)
    expect(placed, 'table T-109 places nothing on the surface U-56 names').not.toEqual([])

    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)

    const modal = screen.last().openModal
    expect(modal?.commands.map((entry) => entry.icon)).toEqual(placed)
    for (const entry of modal?.commands ?? []) {
      expect(entry.isEnabled, `${entry.icon} is drawn faint`).toBe(true)
      expect(entry.isPressed, `${entry.icon} is drawn as held down`).toBe(false)
    }
  })

  it('OP-3 (MUST NOT): while the question stands, GRS has settled nothing', async () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)

    expect(uidsOf(loop.document())).toEqual([1, 2])
    expect(titleOf(loop.document())).toBe('Here')
    expect(baselineCountOf(loop.document())).toBe(0)
  })
})

// Spec: OP-3, OP-4, OP-9, RD-3, RD-4, IC-71, IC-72, IC-73, FR-015, UN-6, UN-13
describe('OP-3 answered -- table T-230 says where each of the three lands', () => {
  it('IC-71 (RD-4): the read content replaces the current document, once OP-4 has been answered', async () => {
    // Why: two presses, as OP-4 puts a question between the choice and the discarding, so a
    // case that looked straight after IC-71 would look one answer too early.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()
    answerQuestion(loop, screen, PROCEED_ANSWER)
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual([11, 12])
    expect(titleOf(loop.document())).toBe('There')
  })

  it('IC-71 (RD-4): the history does not come across', async () => {
    expect(cellOf(T_230, 'RD-4', T_230_HISTORY)).not.toBe(
      cellOf(T_230, 'RD-3', T_230_HISTORY),
    )

    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)
    // Why: SK-20 is an undoable step either way round (UN-13), the one currency this file has
    // for asking whether a history is there, as the loop publishes none.
    loop.receiveInput(SK_20)
    pane.runAnimationFrames()

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()
    answerQuestion(loop, screen, PROCEED_ANSWER)
    await settle()
    pane.runAnimationFrames()

    const landed = uidsOf(loop.document())
    expect(landed, 'the replacement never landed, so there is no history to ask about').toEqual([
      11, 12,
    ])
    loop.receiveInput(SK_6)
    pane.runAnimationFrames()

    expect(
      uidsOf(loop.document()),
      'the step written before the open was still there to undo',
    ).toEqual(landed)
  })

  it('IC-72: joining does not throw the current document away', async () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-72')
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual(expect.arrayContaining([1, 2]))
  })

  it('IC-72 (RD-3): what was read is added to the current document', async () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-72')
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual([1, 2, 11, 12])
  })

  it('IC-73 (OP-9): overlaying changes neither the schedule nor the current document', async () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual([1, 2])
    expect(titleOf(loop.document())).toBe('Here')
  })

  it('IC-73 (OP-9): only a task the current document has by `UID` goes into the frame', async () => {
    // Why: one match out of two, so that neither all of them nor none of them can pass.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files, overlapping())
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    expect(baselineUidsOf(loop.document())).toEqual([HERE_AND_THERE])
  })

  it('IC-73 (OP-9): nothing matching leaves the frame empty, which is not "no overlay"', async () => {
    // Why: there() shares no uid with here(), so the empty frame is what the row answers, not a
    // sign that the overlay never ran.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    expect(baselineUidsOf(loop.document())).toEqual([])
  })

  it('FR-015 (MUST): a task the overlay could not match is told, not silently dropped', async () => {
    // Why: no row of table T-233 is named: what is driven is the MUST itself, that something is
    // told in words, so the case stays true whichever row carries it.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    const report = screen.last().openModal as { readonly reportLines?: readonly { reason: string; count: number | null; text: string }[] } | null
    const line = report?.reportLines?.find((one) => one.reason === 'RS-16')
    expect(line?.count, 'FR-015 (MUST): two tasks of the read file matched nothing and nobody was told').toBe(2)
    expect(line?.text, 'NT-1 (MUST): the line says nothing in words').toBe(wordsFor('RS-16').text.ja)
  })

  it('the question is no longer standing once it has been answered', async () => {
    // Why: no row says the surface closes on an answer, but OP-8 refuses another open while one
    // is in progress, so a question left standing would hold that refusal with nothing to ask.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()

    expect(screen.last().openModal?.surface).not.toBe(OPEN_CHOOSER)
  })
})

// Spec: OP-4, U-55, NT-7, FR-031, OP-9
describe('OP-4 -- replacing asks before it discards', () => {
  it('U-55 / NT-7: choosing IC-71 puts the question up and discards nothing yet', async () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await editSomething(loop, screen, pane)
    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()

    const question = screen.last().confirmation
    expect(
      question,
      'OP-4 (MUST NOT): IC-71 was taken and nothing was asked, so the document would go in silence',
    ).not.toBeNull()
    expect(question?.manner).toBe('NT-7')
    expect(uidsOf(loop.document())).toEqual([1, 2])
    expect(titleOf(loop.document())).toBe('Here')
  })

  it('NT-7 (MUST): the question carries the two word buttons the confirmation section of FR-038 s dictionary holds', async () => {
    expect(CONFIRMATION_ANSWERS, 'the manuscript holds no confirmation section').not.toEqual([])

    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await editSomething(loop, screen, pane)
    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()

    const question = screen.last().confirmation
    expect(question?.answers.map((one) => one.answer)).toEqual(CONFIRMATION_ANSWERS)
    // Why: NT-7 refuses the answers a row of table T-109, read back here from the value, not the type.
    for (const one of question?.answers ?? []) {
      expect(one, one.answer).not.toHaveProperty('icon')
      expect(one.text, one.answer).toBe(
        MANUSCRIPT_WORDS.confirmation.find((cell) => cell.answer === one.answer)?.text['ja'],
      )
    }
  })

  it('the canceling answer leaves the current document exactly as it was', async () => {
    // Why: OP-4's MUST NOT is about discarding in silence, and discarding after a no is the
    // same discarding.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await editSomething(loop, screen, pane)
    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()
    answerQuestion(loop, screen, CANCEL_ANSWER)
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual([1, 2])
    expect(titleOf(loop.document())).toBe('Here')
    expect(baselineCountOf(loop.document())).toBe(0)
    expect(
      screen.last().confirmation,
      'the question was answered and is still standing',
    ).toBeNull()
  })

  it('IC-72: joining is exempt, so no question stands', async () => {
    // Why: FR-031 admits a confirmation only where something undo cannot give back is lost, so
    // not needed reads as not asked.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-72')
    await settle()
    pane.runAnimationFrames()

    expect(
      screen.last().confirmation,
      'OP-4 exempts joining in as many words, and FR-031 (MUST NOT) forbids asking anyway',
    ).toBeNull()
    expect(uidsOf(loop.document())).toEqual([1, 2, 11, 12])
  })

  it('IC-73: overlaying is exempt for the same reason -- nothing of the current document goes', async () => {
    // Why: OP-4 names only replacing and joining; OP-9 with FR-031 settles overlaying, as
    // nothing of the current document is lost.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files, overlapping())
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    expect(screen.last().confirmation).toBeNull()
  })
})

// Why: derived, not spelled: NT-7 bolds the head letter so the key is the head of the word;
// upper case is how a single character reaches KeyInput.key.
function answerKeyFor(answer: string): KeyInput {
  const word = MANUSCRIPT_WORDS.confirmation.find((one) => one.answer === answer)?.text['ja'] ?? ''
  if (word === '') throw new Error(`FR-038: the manuscript holds no word for the answer ${answer}`)
  return {
    kind: 'key',
    key: word.slice(0, 1).toUpperCase(),
    modifiers: NO_MODIFIERS,
  }
}

const SK_7 = keyOf('SK-7')

const statusDateOf = (document: Document): string | null =>
  ((document as any).schedule.project as { statusDate: string | null }).statusDate

/** @purity non-pure */
async function standAtTheQuestion(): Promise<{
  readonly pane: Host
  readonly screen: ScreenPane
  readonly loop: FrameLoop
}> {
  const pane = host()
  const screen = screenPane()
  const files = fileStore()
  const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

  await editSomething(loop, screen, pane)
  await openAFile(loop, pane, files)
  takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
  await settle()
  pane.runAnimationFrames()
  expect(screen.last().confirmation, 'OP-4 (MUST): no question stands to answer').not.toBeNull()

  return { pane, screen, loop }
}

// Spec: NT-7, NT-8, SK-7, SK-19, IN-4, MK-10
describe('table T-037 NT-7 (MUST) -- the question is answered from the keyboard', () => {
  it('GIVEN table T-037 WHEN NT-7 is read THEN it still puts the two keys ahead of IN-4 and SK-19 and gives them to nothing else', () => {
    // Why: the fixed copy the cases below are driven by, so a sentence taken back turns this red first.
    const manner = cellOf(T_037, 'NT-7', 1)
    expect(manner).toContain('`y` と `n` の打鍵でも答えられること（MUST）')
    expect(manner).toContain(
      '問いが立っているあいだ、この 2 つのキーをほかの何にも渡してはならない（MUST NOT）',
    )
    expect(manner).toContain(
      '順位は `NT-8` の消去の次、表 T-028 の `IN-4` と 表 T-036 の `SK-19` の階層より先とする（MUST）',
    )
    expect(manner).toContain('頭の 1 文字（`Y` と `N`）を太字にすること（MUST）')
  })

  it('GIVEN a question stands WHEN the key of the going-on answer is pressed THEN the question is answered as though that word button had been pressed', async () => {
    const { pane, screen, loop } = await standAtTheQuestion()

    loop.receiveInput(answerKeyFor(PROCEED_ANSWER))
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document()), 'the replacement never landed').toEqual([11, 12])
    expect(titleOf(loop.document())).toBe('There')
    expect(screen.last().confirmation, 'the question was answered and is still standing').toBeNull()
  })

  it('GIVEN a question stands WHEN the key of the calling-off answer is pressed THEN the current document is left exactly as it was', async () => {
    const { pane, screen, loop } = await standAtTheQuestion()

    loop.receiveInput(answerKeyFor(CANCEL_ANSWER))
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual([1, 2])
    expect(titleOf(loop.document())).toBe('Here')
    expect(screen.last().confirmation, 'the question was answered and is still standing').toBeNull()
  })

  it('⛔ GIVEN a question stands WHEN the going-on key arrives with `Ctrl` held THEN it still answers the question and SK-7 does not redo (MUST NOT)', async () => {
    // Why: the row says keys, not combinations, and SK-7 gives Ctrl + Y to redoing, so this is
    // the one press where the MUST NOT has teeth.
    expect(SK_7.key, 'SK-7 no longer shares a key with an answer').toBe(
      answerKeyFor(PROCEED_ANSWER).key,
    )
    const { pane, screen, loop } = await standAtTheQuestion()

    loop.receiveInput(SK_7)
    await settle()
    pane.runAnimationFrames()

    expect(screen.last().confirmation, 'the press reached the question').toBeNull()
    expect(uidsOf(loop.document()), 'the going-on answer was given').toEqual([11, 12])
  })

  it('⭐ GIVEN NO question stands WHEN the same key arrives THEN nothing of the question is spent -- the guard is the standing question and not the key', async () => {
    // Why: the control: the MUST NOT holds only while a question stands, so a build that always
    // swallowed the two keys would pass every case above and take SK-7 away for good.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)
    // Why: SK-20 turns the line either way round, so the value before and after is compared
    // rather than a value written down here.
    const before = statusDateOf(loop.document())
    loop.receiveInput(SK_20)
    pane.runAnimationFrames()
    const written = statusDateOf(loop.document())
    expect(written, 'SK-20 moved nothing, so there is no step to undo').not.toBe(before)
    loop.receiveInput(SK_6)
    pane.runAnimationFrames()
    expect(statusDateOf(loop.document()), 'SK-6 undid nothing, so SK-7 has nothing to redo').toBe(
      before,
    )

    loop.receiveInput(SK_7)
    pane.runAnimationFrames()

    expect(statusDateOf(loop.document()), 'SK-7 was swallowed with no question standing').toBe(
      written,
    )
  })

  it('⛔ GIVEN a question stands WHEN MK-10 is asked about the two keys THEN the tool declares them its own, and does not while none stands', () => {
    // Why: a key the question spends is one the tool assigned (MK-10), so leaving the browser its
    // default would let the page act on the press as well.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)
    pane.runAnimationFrames()

    // Why: measured with no question first, so the readings differ for the row's reason and not
    // because the member always answers true.
    const beforeAnyQuestion = CONFIRMATION_ANSWERS.map((answer) =>
      loop.isBrowserDefaultStopped(answerKeyFor(answer)),
    )
    expect(beforeAnyQuestion, 'with no question standing only N is taken, as SK-25 of table T-036').toEqual([
      false,
      true,
    ])
  })

  it('⛔ GIVEN a question stands WHEN MK-10 is asked about the two keys THEN the tool declares both its own', async () => {
    const { loop } = await standAtTheQuestion()

    expect(CONFIRMATION_ANSWERS.map((answer) => loop.isBrowserDefaultStopped(answerKeyFor(answer)))).toEqual([
      true,
      true,
    ])
  })
})

// Spec: CS-4, FT-1, FT-3, NFR-011
describe('CS-4 -- what the screen does while the person is being waited on', () => {
  it('CS-4 (MUST NOT): nothing on the screen says the tool is waiting', async () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    expect(files.pendingOpens(), 'SK-10 asked the store for no file').toBe(1)

    const showing = screen.screens()
    pane.runAnimationFrames()

    expect(
      screen.screens(),
      '表 T-078 lists no trigger for waiting, so waiting may raise no frame',
    ).toBe(showing)
    expect(screen.last().notices, 'a notice was raised to say the tool is waiting').toEqual([])
    expect(screen.last().openModal).toBeNull()
  })

  it('FT-1: the frame that paints the question is the press coming back, with no second input', async () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    const beforeTheAnswer = screen.screens()

    files.handOver(JSON.stringify(there()), 'there.json')
    await settle()
    pane.runAnimationFrames()

    expect(
      screen.screens(),
      'the file came back and no frame was raised, so the question was never painted',
    ).toBeGreaterThan(beforeTheAnswer)
    expect(screen.last().openModal?.surface).toBe(OPEN_CHOOSER)
  })

  it('FT-3: the screen is not frozen while the question is owed', async () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    // Why: guarded, as a resize runs a frame whether or not anything is waited for, and the row
    // is about the resize running while the wait is on.
    expect(files.pendingOpens(), 'SK-10 asked the store for no file, so nothing is being waited for').toBe(1)
    const showing = screen.screens()

    loop.resize({ ...SCREEN, width: SCREEN.width + 200 })
    pane.runAnimationFrames()

    expect(screen.screens(), 'FT-3 did not run while the open was waiting').toBeGreaterThan(showing)
  })

  it('CS-4 (MUST): the answer lands on what the current value was, not on what it became', async () => {
    // Why: the outcome is driven: the write is made while the question stands and the overlay
    // keeps the schedule, so a landing built from a pre-wait copy shows that write missing.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    // Why: the overlapping fixture, so the landing has something in it; an empty frame either
    // way would not say which copy it was built on.
    await openAFile(loop, pane, files, overlapping())
    loop.receiveInput(SK_20)
    pane.runAnimationFrames()
    const written = (loop.document() as any).documentSettings

    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual([1, 2])
    expect(baselineUidsOf(loop.document())).toEqual([HERE_AND_THERE])
    // Why: FR-015 (MUST) sets S-69 of table T-202 true when an overlay is read -- so the landing turns
    // isBaselineVisible on and keeps every other value written in the wait.
    expect((loop.document() as any).documentSettings).toEqual({ ...written, isBaselineVisible: true })
  })
})

// Spec: FR-096, U-54, IC-2, IC-3, IC-52, IN-4, FR-025, FR-029
describe('FR-096 -- the Export Chooser', () => {
  it('U-54: SK-12 puts the surface up', () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_12)
    pane.runAnimationFrames()

    expect(screen.last().openModal?.surface).toBe(EXPORT_CHOOSER)
  })

  it('FR-096 (MUST): the surface offers every format of table T-024 that comes out as a file', () => {
    // Why: no row says which member carries the formats and table T-024 has no English column,
    // so the row ID is looked for anywhere in the description.
    const offered = offeredOnIc2Rows()
    expect(offered.length, 'table T-024 gives no file-bearing row an out direction').toBeGreaterThan(
      1,
    )

    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_12)
    pane.runAnimationFrames()

    const described = JSON.stringify(screen.last().openModal)
    for (const format of offered) {
      expect(
        described,
        `FR-096 (MUST): the ${EXPORT_CHOOSER} names no way to choose table T-024 row ${format}`,
      ).toContain(format)
    }
  })

  it('FR-096 (MUST): the surface offers them in the order table T-024 prints its rows', () => {
    // Why: the order is read out of the manuscript, not typed (the guard at the foot pins it
    // once), and is taken as the order the row IDs first appear in the description.
    const offered = offeredOnIc2Rows()
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_12)
    pane.runAnimationFrames()

    const described = JSON.stringify(screen.last().openModal)
    const at = (id: string): number => {
      const found = described.indexOf(id)
      if (found < 0) throw new Error(`the ${EXPORT_CHOOSER} names no way to choose ${id}`)
      return found
    }
    expect(
      [...offered].sort((one, other) => at(one) - at(other)),
      `FR-096 (MUST): the ${EXPORT_CHOOSER} does not offer the formats in table T-024's order`,
    ).toEqual(offered)
  })

  it('FR-096 (MUST NOT): IO-6 is not on the surface, because FR-025 carries it directly', () => {
    // Why: the row is named rather than derived, as this MUST NOT is about one row and must not
    // follow a new file-less row of table T-024.
    expect(
      outDirectionRows(),
      'table T-024 no longer gives IO-6 an out direction, so this prohibition has no subject',
    ).toContain('IO-6')

    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_12)
    pane.runAnimationFrames()

    expect(
      JSON.stringify(screen.last().openModal),
      `FR-096 (MUST NOT): the ${EXPORT_CHOOSER} offers table T-024 row IO-6`,
    ).not.toContain('IO-6')
  })

  it('IC-52: an entry taken on an open surface reaches the loop, and IN-4 closes it', () => {
    // Why: the one case about the road: when it is green and an OP-3 case is red, the road is
    // not what is missing.
    expect(entriesOn(EXPORT_CHOOSER)).toContain('IC-52')

    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_12)
    pane.runAnimationFrames()
    expect(screen.last().openModal?.surface).toBe(EXPORT_CHOOSER)

    takeEntry(loop, screen, EXPORT_CHOOSER, 'IC-52')
    pane.runAnimationFrames()

    expect(screen.last().openModal).toBeNull()
  })

  it('IC-2: table T-109 gives the whole act exactly one entry', () => {
    const writingOut = T_109.rows.filter((row) => (row.cells[T_109_AUTHORITY] ?? '').includes('`FR-096`'))
    expect(writingOut.map((row) => row.id)).toEqual(['IC-2'])
  })

  it('IC-3: the entry FR-025 carries the clipboard through is a second, separate one', () => {
    // Why: one entrance holds only while IC-2 and IC-3 rest on two requirements, one that opens
    // U-54 and one that does not.
    const toClipboard = T_109.rows.filter((row) =>
      (row.cells[T_109_AUTHORITY] ?? '').includes('`FR-025`'),
    )
    expect(toClipboard.map((row) => row.id)).toEqual(['IC-3'])
    expect(cellOf(T_109, 'IC-3', T_109_AUTHORITY)).toContain('`IO-6`')
  })
})

// Spec: FR-096, FR-035, SK-11, IO-2
describe('FR-096 -- the name the chooser proposes', () => {
  // Why: a document from the startup template has no destination, like the first SK-11 on an
  // MSPDI document, so the save asks for one.
  /** @purity non-pure */
  const saveOnce = async (document: Document): Promise<StoreProbe> => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, document, SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_11)
    pane.runAnimationFrames()
    await settle()
    return files
  }

  it('SK-11 writes GRS JSON, so the extension is the one table T-024 gives that row', async () => {
    const extension = extensionOf('IO-2')
    expect(extension, 'table T-024 row IO-2 gives no extension').not.toBeNull()

    const files = await saveOnce(here('Plan of record'))

    expect(
      files.written.length,
      'FR-096: the document has no file to overwrite, so a destination was owed',
    ).toBe(1)
    expect(
      files.written[0]?.suggestedFileName,
      'FR-096 (MUST) / T-352 FN-1 (CR-648): the document name with its spaces made _, then the extension of table T-024',
    ).toBe(`Plan_of_record${extension}`)
  })

  it('FR-035 empty: T-352 FN-5 proposes schedule with the extension (CR-648)', async () => {
    // Why: FR-035 keeps the title from ever being the empty string, so null is the one way a
    // document has no name.
    const extension = extensionOf('IO-2')

    const files = await saveOnce(here(null))

    expect(files.written.length).toBe(1)
    expect(
      files.written[0]?.suggestedFileName,
      'FR-096 (MUST) / T-352 FN-5: a name with nothing left is schedule',
    ).toBe(`schedule${extension}`)
  })

  it('⛔ the extension is not written out here: table T-024 is the one place it stands', () => {
    expect(extensionOf('IO-2')).toBe(bare(cellOf(T_024, 'IO-2', T_024_EXTENSION)))
    const unnamed = outDirectionRows().filter((id) => extensionOf(id) === null)
    expect(
      unnamed.length,
      'table T-024 leaves a file-bearing out-direction row without an extension, so FR-096 ' +
        'has no name to propose for it',
    ).toBe(1)
  })

  it('FR-096 (MUST): the name proposed for a chosen format is the one that format is given', async () => {
    // Why: IO-3, IO-4 and IO-7 hand the store nothing here (no writer, or no rasterizer in node),
    // so they are named; the case below fails if the roster stops carrying one of them.
    const cannotBeWritten = ['IO-3', 'IO-4', 'IO-7']
    for (const id of cannotBeWritten) {
      expect(
        EXCHANGE_FORMATS.some((format) => format.specTableRowId === id),
        `${id} is recorded as unwritable in this build but is no longer a format of table T-024`,
      ).toBe(true)
    }

    const drivable = EXCHANGE_FORMATS.filter(
      (format) => offeredOnIc2Rows().includes(format.specTableRowId) && !cannotBeWritten.includes(format.specTableRowId),
    )
    expect(drivable.length, 'no format of table T-024 can be written in this build').toBeGreaterThan(
      1,
    )

    for (const format of drivable) {
      const pane = host()
      const screen = screenPane()
      const files = fileStore()
      const loop = frameLoop(pane.surface, here('Plan of record'), SCREEN, screen.wiring, files.store)

      loop.receiveInput(SK_12)
      pane.runAnimationFrames()
      takeFormat(loop, screen, format.specTableRowId)
      await settle()
      pane.runAnimationFrames()

      expect(
        files.written.length,
        `FR-096 (MUST): choosing table T-024 row ${format.specTableRowId} handed the store nothing`,
      ).toBe(1)
      expect(
        files.written[0]?.suggestedFileName,
        `FR-096 (MUST): the name proposed for table T-024 row ${format.specTableRowId}`,
      ).toBe(`Plan_of_record${format.extension}`)
    }
  })

  it('FR-035 empty: T-352 FN-5 proposes schedule with the chosen format\'s extension (CR-648)', async () => {
    const drivable = EXCHANGE_FORMATS.filter(
      (format) => offeredOnIc2Rows().includes(format.specTableRowId) && !['IO-3', 'IO-4', 'IO-7'].includes(format.specTableRowId),
    )

    for (const format of drivable) {
      const pane = host()
      const screen = screenPane()
      const files = fileStore()
      const loop = frameLoop(pane.surface, here(null), SCREEN, screen.wiring, files.store)

      loop.receiveInput(SK_12)
      pane.runAnimationFrames()
      takeFormat(loop, screen, format.specTableRowId)
      await settle()
      pane.runAnimationFrames()

      expect(
        files.written[0]?.suggestedFileName,
        `FR-096 (MUST) / T-352 FN-5: the name proposed for table T-024 row ${format.specTableRowId} with no document name`,
      ).toBe(`schedule${format.extension}`)
    }
  })

  it('FR-096 (MUST): the chosen row’s extension travels beside the name, so the name cannot lose it', async () => {
    // Why: the person may overrule the name but not the extension, so a proposed name alone does
    // not keep it: the chosen row's extension travels beside the name.
    const drivable = EXCHANGE_FORMATS.filter(
      (format) => offeredOnIc2Rows().includes(format.specTableRowId) && !['IO-3', 'IO-4', 'IO-7'].includes(format.specTableRowId),
    )
    expect(drivable.length).toBeGreaterThan(1)

    for (const format of drivable) {
      const pane = host()
      const screen = screenPane()
      const files = fileStore()
      const loop = frameLoop(pane.surface, here('Plan of record'), SCREEN, screen.wiring, files.store)

      loop.receiveInput(SK_12)
      pane.runAnimationFrames()
      takeFormat(loop, screen, format.specTableRowId)
      await settle()
      pane.runAnimationFrames()

      const write = files.written[0]
      expect(write, `table T-024 row ${format.specTableRowId} handed the store nothing`).toBeDefined()
      expect(
        (write as unknown as { extension?: unknown }).extension,
        `FR-096 (MUST): the store was not told which form table T-024 row ${format.specTableRowId} is`,
      ).toBe(format.extension)
      expect(write?.suggestedFileName.endsWith(format.extension as string)).toBe(true)
    }
  })
})

// Spec: FR-029, FR-096, FR-076, FR-038
// Why: FR-029 governs entrances and a format is none, so its row-by-row pairing is not asserted:
// only that a press is never silent and says a row of table T-233.
describe('FR-029 / DFC-173 -- a format that cannot be written says so', () => {
  /** @purity non-pure */
  const press = async (
    specTableRowId: string,
  ): Promise<{ readonly written: number; readonly view: ScreenView }> => {
    const pane = host()
    const screen = screenPane('ja')
    const files = fileStore()
    const loop = frameLoop(pane.surface, here('Plan of record'), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_12)
    pane.runAnimationFrames()
    takeFormat(loop, screen, specTableRowId)
    await settle()
    pane.runAnimationFrames()
    return { written: files.written.length, view: screen.last() }
  }

  it('a press on an offered format either writes or says why -- never neither', async () => {
    // Why: every offered row is walked, read out of the manuscript, so a row added there is walked
    // the day it is added; a host with no rasterizer stays in, as RS-3 (LM-14) holds its row.
    for (const specTableRowId of offeredOnIc2Rows()) {
      const { written, view } = await press(specTableRowId)
      expect(
        `${written} written, ${view.notices.length} told`,
        `FR-029 (MUST): table T-024 row ${specTableRowId} is offered on the ${EXPORT_CHOOSER}, and ` +
          'pressing it wrote nothing and said nothing -- which is the outcome DFC-173 names',
      ).not.toBe('0 written, 0 told')
    }
  })

  it('what it says is a row of table T-233, in the words FR-038 holds for that row', async () => {
    // Why: any row of table T-233 told in its own words, not RS-40 alone, so a format refused
    // for another reason (RS-3) is still walked.
    const known = REASON_WORDS.map((one) => one.text.ja)
    let told = 0
    for (const specTableRowId of offeredOnIc2Rows()) {
      const { written, view } = await press(specTableRowId)
      if (written > 0) continue
      for (const notice of view.notices) {
        told += 1
        expect(
          known,
          `FR-076 (MUST): table T-024 row ${specTableRowId} was refused with words FR-038's dictionary ` +
            `does not hold: ${JSON.stringify(notice.text)}`,
        ).toContain(notice.text)
        expect(
          T_233.rows.map((row) => row.id).length,
          'table T-233 is empty, so nothing above can be a row of it',
        ).toBeGreaterThan(0)
        expect(
          T_037.rows.map((row) => row.id),
          `the manner ${JSON.stringify(notice.manner)} is not a row of table T-037`,
        ).toContain(notice.manner)
      }
    }
    expect(
      told,
      'no format of table T-024 refused a press, so this case walked nothing (rule 04, §2)',
    ).toBeGreaterThan(0)
  })
})

// Spec: FR-076, RS-40, RS-15
// Why: which formats this build cannot write is a fact of the build, not of the specification,
// so the walk asks only that no refused format lands on RS-15.
describe('FR-076 / RS-40 -- an unwritable form carries its own row, not RS-15', () => {
  /** @purity non-pure */
  const pressIn = async (
    specTableRowId: string,
    language: DisplayLanguage,
  ): Promise<{ readonly written: number; readonly view: ScreenView }> => {
    const pane = host()
    const screen = screenPane(language)
    const files = fileStore()
    const loop = frameLoop(pane.surface, here('Plan of record'), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_12)
    pane.runAnimationFrames()
    takeFormat(loop, screen, specTableRowId)
    await settle()
    pane.runAnimationFrames()
    return { written: files.written.length, view: screen.last() }
  }

  for (const language of ['ja', 'en'] as const) {
    it(`⛔ no refused format lands on RS-15 while a row exists (${language})`, async () => {
      const fallbackWords = wordsFor('RS-15')
      for (const specTableRowId of offeredOnIc2Rows()) {
        const { written, view } = await pressIn(specTableRowId, language)
        if (written > 0) continue
        for (const notice of view.notices) {
          expect(
            notice.text,
            `FR-076 (MUST NOT): table T-024 row ${specTableRowId} was refused with RS-15, the landing ` +
              'place for a reason table T-233 holds no row for -- and RS-40 is that row',
          ).not.toBe(fallbackWords.text[language])
        }
      }
    })

    it(`⭐ every refused format is told in the OWN words of the row it carries (${language})`, async () => {
      const carried: string[] = []
      for (const specTableRowId of offeredOnIc2Rows()) {
        const { written, view } = await pressIn(specTableRowId, language)
        if (written > 0) continue
        for (const notice of view.notices) {
          const row = REASON_WORDS.find((one) => one.text[language] === notice.text)
          expect(
            row,
            `FR-076 (MUST NOT): table T-024 row ${specTableRowId} was refused in words FR-038's ` +
              `dictionary holds for no row of table T-233 -- ${JSON.stringify(notice.text)}`,
          ).toBeDefined()
          if (row === undefined) continue
          expect(
            row.specTableRowId,
            `FR-076: table T-024 row ${specTableRowId} landed on RS-15, the place kept for a reason ` +
              'table T-233 holds no row for',
          ).not.toBe('RS-15')
          carried.push(row.specTableRowId)
          expect(
            notice.manner,
            `table T-233 makes ${row.specTableRowId}'s manner ${mannerFor(row.specTableRowId)}`,
          ).toBe(mannerFor(row.specTableRowId))
          expect(
            notice.nextSteps,
            'NT-3a (MUST NOT): told it failed with nothing to do next',
          ).toContain(row.nextStep[language])
        }
      }
      expect(
        carried.length,
        'FR-029 (MUST): no format of table T-024 refused a press, so this case walked ' +
          'nothing (rule 04, §2)',
      ).toBeGreaterThan(0)
    })
  }
})

// Spec: FR-076, RS-4, RS-14, OP-11, CN-5
describe('FR-076 -- a notice raised while a file is opened carries a row of table T-233', () => {
  it('RS-4: bytes that are not UTF-8 are told in that row of the table, in its own words', async () => {
    const words = wordsFor('RS-4')
    const pane = host()
    const screen = screenPane('ja')
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    // Why: lone continuation bytes decode to nothing at all, which is the situation the row names.
    files.handOverBytes(new Uint8Array([0x7b, 0xff, 0xfe]), 'there.json')
    await settle()
    pane.runAnimationFrames()

    const notices = screen.last().notices
    expect(
      notices.length,
      'FR-076 (MUST): the file could not be read as characters and nobody was told',
    ).toBe(1)
    expect(notices[0]?.manner, 'the manner table T-233 gives RS-4').toBe(mannerFor('RS-4'))
    expect(notices[0]?.text, 'the words FR-038 holds for RS-4').toBe(words.text.ja)
    expect(notices[0]?.nextSteps, 'NT-3a: the next step FR-038 holds for RS-4').toContain(
      words.nextStep.ja,
    )
    // Why: OP-5 puts FR-023's verification before OP-3's question, so nothing was read to ask about.
    expect(screen.last().openModal?.surface).not.toBe(OPEN_CHOOSER)
  })

  it('RS-4 in the other language: the words come from the dictionary, not from this loop', async () => {
    // Why: FR-038 forbids a second store, so the other language is the same row from the same
    // dictionary, and the two words differ, which is what makes this a test.
    const words = wordsFor('RS-4')
    expect(words.text.en, 'FR-038: RS-4 has one word for two languages').not.toBe(words.text.ja)

    const pane = host()
    const screen = screenPane('en')
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    files.handOverBytes(new Uint8Array([0x7b, 0xff, 0xfe]), 'there.json')
    await settle()
    pane.runAnimationFrames()

    expect(screen.last().notices[0]?.text).toBe(words.text.en)
  })

  it('⛔ canceled is owed nothing: IF-3 keeps it apart so that it is not reported', async () => {
    // Why: table T-233 gives canceled no row and FR-076 forbids carrying a reason it lacks;
    // RS-15's fallback is for reasons that ought to be told.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    files.failOpen('canceled')
    await settle()
    pane.runAnimationFrames()

    expect(
      screen.last().notices,
      'the person stopped the chooser and was told they had failed at something',
    ).toEqual([])
    expect(screen.last().confirmation).toBeNull()
    expect(screen.last().openModal).toBeNull()
    expect(uidsOf(loop.document())).toEqual([1, 2])
  })

  it('RS-14: several files at once open none, and OP-11 (MUST) refuses them with NT-1', async () => {
    const words = wordsFor('RS-14')
    const pane = host()
    const screen = screenPane('ja')
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)
    const before = uidsOf(loop.document())

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    files.handOverBytes(new TextEncoder().encode(JSON.stringify(there())), 'there.json', 2)
    await settle()
    pane.runAnimationFrames()

    expect(screen.last().openModal, 'OP-11 (MUST): a chooser stood for files that open none').toBeNull()
    expect(uidsOf(loop.document()), 'OP-11 (MUST): the current document changed').toEqual(before)
    expect(
      screen.last().notices.map((notice) => notice.text),
      'OP-11 (MUST): several files were refused and nobody was told',
    ).toContain(words.text.ja)
  })

  it('⛔ no caution where none is owed: an ordinary open leaves the notices empty', async () => {
    // Why: the guard that keeps the case above from passing on a loop that cautions every time.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)

    expect(screen.last().notices).toEqual([])
  })
})

// Spec: OP-12, OP-1, RS-11, RS-12, RS-13
describe('FR-076 -- OP-12 of table T-024a tells its three refusals apart', () => {
  /** @purity pure */
  const readableFormats = (): readonly ExchangeFormat[] =>
    EXCHANGE_FORMATS.filter((one) => one.firstCharacter !== null)

  /** @purity non-pure */
  const openAndRead = async (text: string, fileName: string): Promise<ScreenView> => {
    const pane = host()
    const screen = screenPane('ja')
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    files.handOver(text, fileName)
    await settle()
    pane.runAnimationFrames()
    return screen.last()
  }

  it('the rows a file may be read as are the rows OP-1 accepts', () => {
    expect(readableFormats().map((one) => one.specTableRowId)).toEqual(inDirectionRows())
    expect(new Set(readableFormats().map((one) => one.firstCharacter)).size).toBeGreaterThan(1)
    for (const format of readableFormats()) {
      expect(firstCharacterOf(format.specTableRowId), `table T-024 row ${format.specTableRowId}`).not.toBeNull()
      expect(extensionOf(format.specTableRowId), `table T-024 row ${format.specTableRowId}`).not.toBeNull()
    }
  })

  it('RS-11: an extension no row of table T-024 carries', async () => {
    const words = wordsFor('RS-11')
    const readable = readableFormats()[0]
    const view = await openAndRead(`${readable?.firstCharacter ?? ''}}`, 'there.rtf')

    expect(view.notices.length, 'OP-12 (MUST NOT): the file was read anyway').toBe(1)
    expect(view.notices[0]?.manner).toBe(mannerFor('RS-11'))
    expect(view.notices[0]?.text).toBe(words.text.ja)
    expect(view.openModal?.surface).not.toBe(OPEN_CHOOSER)
  })

  it('RS-12: a first character no row of table T-024 carries', async () => {
    const words = wordsFor('RS-12')
    const readable = readableFormats()[0]
    const view = await openAndRead('zzz', `there${readable?.extension ?? ''}`)

    expect(view.notices.length, 'OP-12 (MUST NOT): the file was read anyway').toBe(1)
    expect(view.notices[0]?.manner).toBe(mannerFor('RS-12'))
    expect(view.notices[0]?.text).toBe(words.text.ja)
    expect(view.openModal?.surface).not.toBe(OPEN_CHOOSER)
  })

  it('RS-13: the extension and the first character point at different rows', async () => {
    const words = wordsFor('RS-13')
    const one = readableFormats()[0]
    const other = readableFormats()[1]
    const view = await openAndRead(
      `${other?.firstCharacter ?? ''}whatever`,
      `there${one?.extension ?? ''}`,
    )

    expect(view.notices.length, 'OP-12 (MUST NOT): the file was read anyway').toBe(1)
    expect(view.notices[0]?.manner).toBe(mannerFor('RS-13'))
    expect(view.notices[0]?.text).toBe(words.text.ja)
    expect(view.openModal?.surface).not.toBe(OPEN_CHOOSER)
  })
})

// Spec: FR-076, RS-3, NT-3a, LM-14
describe('FR-076 -- a notice raised while a document is written out', () => {
  it('RS-3: a write the environment could not do is told with a next step', async () => {
    const words = wordsFor('RS-3')
    const pane = host()
    const screen = screenPane('ja')
    const files = fileStore({ chosenWriteFault: 'unavailable' })
    const loop = frameLoop(pane.surface, here('Plan of record'), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_11)
    pane.runAnimationFrames()
    await settle()
    pane.runAnimationFrames()

    const notices = screen.last().notices
    expect(notices.length, 'FR-076 (MUST): the write failed and nobody was told').toBe(1)
    expect(notices[0]?.manner, 'the manner table T-233 gives RS-3').toBe(mannerFor('RS-3'))
    expect(notices[0]?.text).toBe(words.text.ja)
    expect(
      notices[0]?.nextSteps,
      'NT-3a (MUST NOT): told it failed with nothing to do next',
    ).toContain(words.nextStep.ja)
  })

  it('⛔ a write that lands tells nobody anything', async () => {
    // Why: NT-3a is a failure notice, so a loop that raised one on the way past would tell a
    // person that a save they watched succeed had failed.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here('Plan of record'), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_11)
    pane.runAnimationFrames()
    await settle()
    pane.runAnimationFrames()

    expect(files.written.length, 'the write never reached the store').toBe(1)
    expect(screen.last().notices).toEqual([])
  })
})

// Spec: T-024, T-024a, T-036, T-103, T-109, T-230, T-233, OP-5
describe('the tables are read by position, so the positions are pinned', () => {
  it('table T-024 prints format, direction and extension in that order, and its rows in FR-096 order', () => {
    expect(T_024.headings.length).toBe(10)
    // Why: the row order is a requirement and this is the one place it is pinned, as the cases
    // that drive the surface read the same table and would follow a reorder in silence.
    expect(outDirectionRows()).toEqual(['IO-2', 'IO-1', 'IO-7', 'IO-3', 'IO-4', 'IO-8', 'IO-9', 'IO-10', 'IO-6'])
    expect(offeredOnIc2Rows()).toEqual(['IO-2', 'IO-1', 'IO-7', 'IO-3', 'IO-4'])
    expect(offeredOnIc2Rows().map((id) => extensionOf(id))).toEqual([
      '.json',
      '.xml',
      '.html',
      '.svg',
      '.png',
    ])
  })

  it('table T-103 prints the settled English name first', () => {
    expect(T_103.headings.length).toBe(3)
    expect(OPEN_CHOOSER).toBe('Open Chooser')
    expect(EXPORT_CHOOSER).toBe('Export Chooser')
  })

  it('table T-109 prints the surface an entry stands on first', () => {
    expect(T_109.headings.length).toBe(7)
    // Why: the count alone is no guard, as a column inserted while another is dropped keeps it,
    // so the two positions read are pinned by what stands in them.
    expect(cellOf(T_109, 'IC-1', T_109_SURFACE)).toContain('`' + partNameOf('U-31') + '`')
    expect(cellOf(T_109, 'IC-1', T_109_AUTHORITY)).toContain('`FR-087`')
    // Why: IC-52 leads both rosters, as entriesOn keeps the print order and that row comes before IC-71.
    expect(entriesOn(OPEN_CHOOSER)).toEqual(['IC-52', 'IC-71', 'IC-72', 'IC-73'])
    expect(entriesOn(EXPORT_CHOOSER)).toEqual(['IC-52'])
    // Why: not even IC-52: NT-7 makes the two answers the whole surface, and calling the
    // question off is one of them.
    expect(entriesOn(CONFIRMATION)).toEqual([])
    expect(CONFIRMATION_ANSWERS).toEqual([PROCEED_ANSWER, CANCEL_ANSWER])
  })

  it('table T-233 prints the manner second, and every row of it has words to be told in', () => {
    // Why: a row without a dictionary entry cannot be told, so a row added without words fails here.
    expect(T_233.headings.length).toBe(6)
    expect(T_233.rows.filter((row) => wordsRowOf(row.id) === row.id).length).toBe(REASON_WORDS.length)
    const manners = new Set(T_037.rows.map((row) => row.id))
    for (const row of T_233.rows) {
      const words = wordsFor(row.id)
      for (const language of ['ja', 'en'] as const) {
        expect(words.text[language], `table T-233 row ${row.id} has no word in ${language}`).not.toBe(
          '',
        )
        expect(
          words.nextStep[language] === '',
          `table T-233 row ${row.id} has a next step in one language only`,
        ).toBe(words.nextStep.ja === '')
        if (mannerFor(row.id) !== NEXT_STEP_MANNER) continue
        expect(
          words.nextStep[language],
          `table T-233 row ${row.id} is ${NEXT_STEP_MANNER} and has no next step in ${language}`,
        ).not.toBe('')
      }
      expect(
        manners.has(mannerFor(row.id)),
        `table T-233 row ${row.id} names ${mannerFor(row.id)}, which is not a row of table T-037`,
      ).toBe(true)
    }
  })

  it('the roster of formats agrees with table T-024, column for column', () => {
    // Why: exchange-formats.json is printed from table T-024, so a generator that stopped
    // running reaches this line.
    expect(EXCHANGE_FORMATS.map((one) => one.specTableRowId)).toEqual(outDirectionRows())
    for (const format of EXCHANGE_FORMATS) {
      expect(format.extension, `table T-024 row ${format.specTableRowId} extension`).toBe(
        extensionOf(format.specTableRowId),
      )
      expect(format.firstCharacter, `table T-024 row ${format.specTableRowId} first character`).toBe(
        firstCharacterOf(format.specTableRowId),
      )
    }
  })

  it('table T-230 prints the history column third', () => {
    expect(T_230.headings.length).toBe(7)
    expect(cellOf(T_230, 'RD-4', T_230_HISTORY)).toBe('捨てる')
    expect(cellOf(T_230, 'RD-3', T_230_HISTORY)).toBe(
      'いまのものを残す',
    )
  })

  it('table T-036 prints the assignment second, and OP-2 keeps opening to one row', () => {
    expect(T_036.headings.length).toBe(5)
    // Why: the count alone is no guard; the new column is pinned by what stands in SK-12's cell.
    expect(cellOf(T_036, 'SK-12', T_036_ENTRANCE)).toBe('IC-2')
    expect(cellOf(T_036, 'SK-10', T_036_ENTRANCE)).toBe('IC-1')
    expect(SK_10).toEqual({
      kind: 'key',
      key: 'O',
      modifiers: { ctrl: true, shift: false, alt: false, meta: false },
    })
    expect(SK_12).toEqual({
      kind: 'key',
      key: 'E',
      modifiers: { ctrl: true, shift: true, alt: false, meta: false },
    })
  })

  it('table T-024a still asks OP-3 before anything of the file is applied', () => {
    expect(rowOf(T_024A, 'OP-5').cells.join(' ')).toContain('`OP-3`')
  })
})

// Spec: FR-096, FR-029, IO-3, IO-4, IO-7, IF-6, IF-8, LM-14
// Why: IF-6 paints IO-4 and IF-8 supplies the application for IO-7, so a host that hands
// neither can write neither, which is LM-14's environment rather than a defect.
describe('table T-024 / FR-096 -- the three picture forms are written', () => {
  const paintingRasterizer = (): Rasterizer => ({
    rasterizePng: async (_svg: string, sizePx: RasterSizePx): Promise<Rastering> => ({
      ok: true,
      pngBytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, sizePx.heightPx % 251]),
    }),
  })

  const refusingRasterizer = (reason: RasterFaultReason): Rasterizer => ({
    rasterizePng: async (): Promise<Rastering> => ({
      ok: false,
      fault: { reason, what: 'the case asked the canvas to refuse' },
    }),
  })

  const APP_SHELL_HTML = '<!DOCTYPE html>\n<html><head></head><body>GRS</body></html>\n'

  const readableAppShell = (): AppShellSource => ({
    readAppShell: async (): Promise<AppShellReading> => ({
      ok: true,
      appShell: { html: APP_SHELL_HTML, embeddedDocumentElementId: 'embedded-document', omittedElementIds: [] },
    }),
  })

  const unreadableAppShell = (): AppShellSource => ({
    readAppShell: async (): Promise<AppShellReading> => ({
      ok: false,
      what: 'the case asked the application not to read itself',
    }),
  })

  interface Pressed {
    readonly written: readonly ChosenFileWrite[]
    readonly view: ScreenView
  }

  /** @purity non-pure */
  const pressWithSeams = async (
    specTableRowId: string,
    seams: { rasterizer?: Rasterizer; appShell?: AppShellSource } = {},
    language: DisplayLanguage = 'ja',
  ): Promise<Pressed> => {
    const pane = host()
    const screen = screenPane(language)
    const files = fileStore()
    const loop = frameLoop(
      pane.surface,
      here('Plan of record'),
      SCREEN,
      screen.wiring,
      files.store,
      undefined,
      undefined,
      undefined,
      seams.rasterizer,
      seams.appShell,
    )
    loop.receiveInput(SK_12)
    pane.runAnimationFrames()
    takeFormat(loop, screen, specTableRowId)
    await settle()
    pane.runAnimationFrames()
    return { written: files.written, view: screen.last() }
  }

  const textOf = (write: ChosenFileWrite | undefined): string =>
    write === undefined ? '' : new TextDecoder().decode(write.bytes)

  it('⭐ IO-3 writes the picture PI-21 assembled (DFC-173: it wrote nothing)', async () => {
    // Why: WY-2 makes the SVG the same drawing IO-4 is painted from, which is why the root is the export's.
    const { written } = await pressWithSeams('IO-3')
    expect(written, 'FR-029 (MUST): the press wrote nothing and said nothing').toHaveLength(1)
    const text = textOf(written[0])
    expect(text.startsWith('<svg')).toBe(true)
    expect(text.trimEnd().endsWith('</svg>')).toBe(true)
    expect(written[0]?.extension, 'FR-096 (MUST): table T-024 gives IO-3 its extension').toBe(
      '.svg',
    )
  })

  it('⭐ IO-7 writes the application with this document inside it (FR-067)', async () => {
    // Why: the container is the one BT-1 reads back, so a file this writes can be opened again.
    const { written } = await pressWithSeams('IO-7', { appShell: readableAppShell() })
    expect(written, 'FR-029 (MUST): the press wrote nothing and said nothing').toHaveLength(1)
    const text = textOf(written[0])
    expect(text.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(text, 'the application itself is in the file').toContain('<body>GRS')
    expect(text, 'BT-1 reads the document out of this container').toContain(
      '<script type="application/json" id="embedded-document">',
    )
    expect(text, 'FR-024: the document inside it is GRS JSON').toContain('"schemaVersion"')
    expect(written[0]?.extension).toBe('.html')
  })

  it('⭐ IO-4 writes the bytes IF-6 painted, at the size the picture asks for', async () => {
    // Why: FR-025 forbids a scale, and the fake folds the height it was asked for into its last
    // byte, so a route that asked for another size answers with another file.
    const { written } = await pressWithSeams('IO-4', { rasterizer: paintingRasterizer() })
    expect(written).toHaveLength(1)
    expect([...(written[0]?.bytes ?? [])].slice(0, 4)).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect(written[0]?.extension).toBe('.png')
  })

  for (const language of ['ja', 'en'] as const) {
    it(`⭐ a canvas that refuses is told in RS-42's or RS-43's own words (${language})`, async () => {
      // Why: tooLarge has a known cause and a next step a reader can take, so it is RS-43; the
      // other two are RS-42 (FR-102).
      const owed: Readonly<Record<RasterFaultReason, string>> = {
        unsupported: 'RS-42',
        tooLarge: 'RS-43',
        rasterFailed: 'RS-42',
      }
      for (const reason of Object.keys(owed) as readonly RasterFaultReason[]) {
        const specTableRowId = owed[reason]
        const words = wordsFor(specTableRowId)
        const { written, view } = await pressWithSeams(
          'IO-4',
          { rasterizer: refusingRasterizer(reason) },
          language,
        )
        expect(written, `${reason}: nothing may be written when the canvas refused`).toHaveLength(0)
        const texts = view.notices.map((notice) => notice.text)
        expect(texts, `${reason} is owed table T-233 row ${specTableRowId}`).toContain(words.text[language])
        if (wordsRowOf(specTableRowId) !== 'RS-15') {
          expect(texts, 'FR-076 (MUST NOT): RS-15 is for a reason with no row').not.toContain(
            wordsFor('RS-15').text[language],
          )
        }
        for (const notice of view.notices) {
          if (notice.text !== words.text[language]) continue
          expect(notice.manner).toBe(mannerFor(specTableRowId))
          expect(
            notice.nextSteps,
            'NT-3a (MUST): a failure is told with what can be done next',
          ).toContain(words.nextStep[language])
        }
      }
    })

    it(`⭐ an application that cannot read itself carries a reason 表 T-233 still holds (${language})`, async () => {
      // Why: no row of table T-233 states this scene (RS-42, RS-3 and RS-15 do not fit), and
      // choosing one is a ruling, so only the MUST NOT is measured.
      const { written, view } = await pressWithSeams(
        'IO-7',
        { appShell: unreadableAppShell() },
        language,
      )
      expect(written).toHaveLength(0)
      expect(
        view.notices.length,
        'FR-029 (MUST): the press could not act and said nothing',
      ).toBeGreaterThan(0)
      for (const notice of view.notices) {
        const carried = REASON_WORDS.find((one) => one.text[language] === notice.text)
        expect(
          carried?.specTableRowId,
          `表 T-233 の閉じ（MUST NOT）: 同表に無い理由を運んではならない -- the words ` +
            `${JSON.stringify(notice.text)} belong to no row of table T-233`,
        ).toBeDefined()
        const specTableRowId = carried!.specTableRowId
        expect(
          T_233.rows.map((row) => row.id),
          `${specTableRowId} is not a row of table T-233`,
        ).toContain(specTableRowId)
        expect(notice.manner, `the manner table T-233 gives ${specTableRowId}`).toBe(mannerFor(specTableRowId))
        if (mannerFor(specTableRowId) === 'NT-3a') {
          expect(
            notice.nextSteps,
            'NT-3a (MUST): 次に取れる手段を添えること',
          ).toContain(carried!.nextStep[language])
        }
      }
    })
  }

  it('⛔ a host that hands neither seam refuses both, and says so (LM-14 / RS-3)', async () => {
    const words = wordsFor('RS-3')
    for (const specTableRowId of ['IO-4', 'IO-7']) {
      const { written, view } = await pressWithSeams(specTableRowId)
      expect(written, `${specTableRowId} wrote a file with no seam to make it from`).toHaveLength(0)
      expect(view.notices.map((notice) => notice.text), `${specTableRowId} said nothing`).toContain(
        words.text['ja'],
      )
    }
  })
})

// Spec: FR-025, FR-080, RS-43, S-81, S-217
// Why: the exported height is the screen's height times the canvas ratio (FR-080), so the
// ceiling is crossed by the screen's shape and the two screens differ in nothing else.
describe('FR-025 (MUST) -- a picture past the height ceiling is refused with RS-43', () => {
  const settingNumbers = (specTableRowId: string): readonly number[] => {
    const found = specTable('T-204').rows.find((one) => one.id === specTableRowId)
    if (found === undefined) throw new Error(`表 T-204 no longer holds ${specTableRowId}`)
    const cell = found.by['既定'] ?? ''
    const numbers = [...cell.matchAll(/\d+(?:\.\d+)?/g)].map((hit) => Number(hit[0]))
    if (numbers.length === 0) throw new Error(`${specTableRowId} states no number in its 既定 column`)
    return numbers
  }

  const CANVAS_WIDTH = settingNumbers('S-81')[0] as number
  const HEIGHT_CAP = settingNumbers('S-217')[0] as number

  // Why: a width of a quarter of the canvas makes the ratio 4, so the height is solved from
  // the ceiling rather than chosen.
  const screenWhosePictureIs = (times: number): FrameEnvironment => {
    const width = CANVAS_WIDTH / 4
    return {
      width,
      height: Math.round((HEIGHT_CAP * times) / (CANVAS_WIDTH / width)),
      appHeaderHeight: SCREEN.appHeaderHeight,
      scrollbarThickness: SCREEN.scrollbarThickness,
    }
  }

  const SCREEN_THAT_FITS = screenWhosePictureIs(0.875)
  const SCREEN_TOO_TALL = screenWhosePictureIs(1.25)

  interface Exported {
    readonly written: readonly ChosenFileWrite[]
    readonly view: ScreenView
  }

  /** @purity non-pure */
  const exportOn = async (
    environment: FrameEnvironment,
    specTableRowId: string,
    seams: { rasterizer?: Rasterizer; appShell?: AppShellSource } = {},
    language: DisplayLanguage = 'ja',
  ): Promise<Exported> => {
    const pane = host()
    const screen = screenPane(language)
    const files = fileStore()
    const loop = frameLoop(
      pane.surface,
      here('Plan of record'),
      environment,
      screen.wiring,
      files.store,
      undefined,
      undefined,
      undefined,
      seams.rasterizer,
      seams.appShell,
    )
    loop.receiveInput(SK_12)
    pane.runAnimationFrames()
    takeFormat(loop, screen, specTableRowId)
    await settle()
    pane.runAnimationFrames()
    return { written: files.written, view: screen.last() }
  }

  // Why: answering with bytes, so a PNG refusal cannot be the canvas's.
  const willingRasterizer = (): Rasterizer => ({
    rasterizePng: async (_svg: string, sizePx: RasterSizePx): Promise<Rastering> => ({
      ok: true,
      pngBytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, sizePx.heightPx % 251]),
    }),
  })

  // Why: answering with an application, so IO-7 cannot fail for want of one.
  const willingAppShell = (): AppShellSource => ({
    readAppShell: async (): Promise<AppShellReading> => ({
      ok: true,
      appShell: {
        html: '<!DOCTYPE html><html><body>GRS</body></html>',
        embeddedDocumentElementId: 'embedded-document',
        omittedElementIds: [],
      },
    }),
  })

  const heightOf = (write: ChosenFileWrite | undefined): number => {
    const text = write === undefined ? '' : new TextDecoder().decode(write.bytes)
    const found = /<svg\b[^>]*\bheight="(\d+(?:\.\d+)?)"/.exec(text)
    if (found === null) throw new Error('the write is not an SVG with a height')
    return Number(found[1])
  }

  it('⭐ the premise: under the ceiling the SAME press writes the picture', async () => {
    // Why: without this every case below could pass because the export road is broken; the height
    // written is read back, so the pair is known to straddle S-217.
    const { written } = await exportOn(SCREEN_THAT_FITS, 'IO-3')
    expect(written, 'FR-096: a picture inside the ceiling is written').toHaveLength(1)
    const height = heightOf(written[0])
    expect(height, `FR-025: the picture is ${height}px, inside the ${HEIGHT_CAP}px ceiling`).toBeLessThanOrEqual(
      HEIGHT_CAP,
    )
    expect(
      SCREEN_TOO_TALL.height / SCREEN_THAT_FITS.height,
      'the two screens differ only in height',
    ).toBeGreaterThan(1)
    expect(SCREEN_TOO_TALL.width).toBe(SCREEN_THAT_FITS.width)
  })

  for (const language of ['ja', 'en'] as const) {
    it(`⛔ IO-3: the SVG is not written, and the reason is RS-43 (${language})`, async () => {
      const words = wordsFor('RS-43')
      const { written, view } = await exportOn(SCREEN_TOO_TALL, 'IO-3', {}, language)

      expect(written, 'FR-025 (MUST NOT): 「一部だけを描いてはならない」 -- a picture was written').toHaveLength(0)
      const texts = view.notices.map((notice) => notice.text)
      expect(texts, 'FR-025 (MUST): 「理由は 表 T-233 の `RS-43` とすること」').toContain(words.text[language])
      expect(texts, 'FR-076 (MUST NOT): RS-15 is for a reason with no row').not.toContain(
        wordsFor('RS-15').text[language],
      )
      for (const notice of view.notices) {
        if (notice.text !== words.text[language]) continue
        expect(notice.manner).toBe(mannerFor('RS-43'))
        expect(
          notice.nextSteps,
          'NT-3a (MUST): a failure is told with what can be done next',
        ).toContain(words.nextStep[language])
      }
    })
  }

  it('⛔ IO-4: the PNG is refused too, and the refusal is not the canvas`s', async () => {
    // Why: the rasterizer handed in would have painted, so what is measured is GRS's own refusal
    // and not RasterFaultReason.tooLarge in RS-43's words.
    const words = wordsFor('RS-43')
    const { written, view } = await exportOn(SCREEN_TOO_TALL, 'IO-4', {
      rasterizer: willingRasterizer(),
    })

    expect(written, 'FR-025 (MUST): the PNG road writes nothing either').toHaveLength(0)
    expect(view.notices.map((notice) => notice.text)).toContain(words.text['ja'])
  })

  it('⛔ IO-2 / IO-1 / IO-7 are not pictures, so the same screen still writes them', async () => {
    // Why: a plan too tall to picture must still be saveable and handed on, or the ceiling
    // takes the document with it.
    const rs43 = wordsFor('RS-43')

    for (const specTableRowId of ['IO-2', 'IO-1', 'IO-7']) {
      const extension = extensionOf(specTableRowId)
      const { written, view } = await exportOn(
        SCREEN_TOO_TALL,
        specTableRowId,
        specTableRowId === 'IO-7' ? { appShell: willingAppShell() } : {},
      )
      expect(written, `${specTableRowId} is not a picture, so no height ceiling applies to it`).toHaveLength(1)
      expect(written[0]?.extension, `table T-024 gives ${specTableRowId} its extension`).toBe(extension)
      expect(
        view.notices.map((notice) => notice.text),
        `${specTableRowId} was told RS-43, which belongs to the picture rows`,
      ).not.toContain(rs43.text['ja'])
    }
  })
})
