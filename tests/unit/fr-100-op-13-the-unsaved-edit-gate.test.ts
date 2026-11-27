// Unit tests: the unsaved-edit condition of FR-100 and the reopen road of OP-13.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { bare, specTable } from '../contract/spec-table'
import type {
  FileReading,
  FileStore,
  FileStoreFaultReason,
  OpenRoute,
  OpenedFileState,
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
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'

const T_036 = specTable('T-036')
const T_103 = specTable('T-103')
const T_234 = specTable('T-234')

const T_036_ASSIGNMENT = 1
const T_103_NAME = 0
const T_234_NAMES = 1

const cellOf = (table: { rows: readonly { id: string; cells: readonly string[] }[] }, id: string, at: number): string => {
  const row = table.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`no row ${id}`)
  const cell = row.cells[at]
  if (cell === undefined) throw new Error(`row ${id} has no cell ${at}`)
  return cell
}

const keyOf = (id: string): KeyInput => {
  const parts = (cellOf(T_036, id, T_036_ASSIGNMENT).split('/')[0] ?? '')
    .replace(/`/g, '')
    .replace(/＋/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
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
const SK_21 = keyOf('SK-21')

const OPEN_CHOOSER = bare(cellOf(T_103, 'U-56', T_103_NAME))
const CONFIRMATION = bare(cellOf(T_103, 'U-55', T_103_NAME))

const PROCEED_ANSWER = 'proceed'
const CANCEL_ANSWER = 'cancel'

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const templateDocument = (): Document => structuredClone(TEMPLATE) as unknown as Document

const firstTaskUid = (document: Document): number => {
  const uid = (document as unknown as { schedule: { tasks: { uid: number }[] } }).schedule.tasks[0]
    ?.uid
  if (uid === undefined) throw new Error('FR-027 template carries no Task to edit')
  return uid
}

const titleOf = (document: Document): string =>
  String(
    (document as unknown as { schedule: { project: { title: unknown } } }).schedule.project.title,
  )

const firstTaskName = (document: Document): string =>
  String(
    (document as unknown as { schedule: { tasks: { name: unknown }[] } }).schedule.tasks[0]?.name,
  )

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as unknown as { requestAnimationFrame?: unknown })
  .requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
}

function host(): Host {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = (
    callback: (time: number) => void,
  ): number => {
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
  commitField(value: unknown): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  let commit: unknown = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => {
      const one = commit
      commit = null
      return one as never
    },
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    commitField: (value) => {
      commit = value
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
  readonly routes: OpenRoute[]
  readonly written: number[]
  pendingOpens(): number
  handOver(document: Document, fileName: string): void
  failOpen(reason: FileStoreFaultReason): void
}

// Why: readFileToOpen does not answer at once, so a case can stand between the asking
// and the answer, which is where OP-13's question does or does not appear.
function fileStore(opened: OpenedFileState): StoreProbe {
  const routes: OpenRoute[] = []
  const written: number[] = []
  const waiting: ((reading: FileReading) => void)[] = []
  const store: FileStore = {
    readFileToOpen: (route) => {
      routes.push(route)
      return new Promise<FileReading>((resolve) => {
        waiting.push(resolve)
      })
    },
    adoptFileReadToOpen: () => undefined,
    forgetOpenedFile: () => undefined,
    readOpenedFileState: async () => opened,
    restoreOpenedFilePermission: async () => opened,
    overwriteOpenedFile: async () => {
      written.push(written.length)
      return { ok: true, openedFile: opened } as never
    },
    writeChosenFile: async (write) => {
      written.push(written.length)
      return {
        ok: true,
        openedFile: { kind: 'writable', fileName: write.suggestedFileName },
      } as never
    },
  }
  const answerOne = (reading: FileReading): void => {
    const answer = waiting.shift()
    if (answer === undefined) throw new Error('no read of a file is waiting for an answer')
    answer(reading)
  }
  return {
    store,
    routes,
    written,
    pendingOpens: () => waiting.length,
    handOver: (document, fileName) => {
      answerOne({
        ok: true,
        file: { bytes: new TextEncoder().encode(JSON.stringify(document)), fileName },
      })
    },
    failOpen: (reason) => {
      answerOne({ ok: false, fault: { reason, what: 'the case asked the store to fail' } })
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
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

const ENTER: KeyInput = { kind: 'key', key: 'Enter', modifiers: { ...NO_MODIFIERS } }

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  readonly files: StoreProbe
  frames(): void
  send(input: KeyInput | PointerInput): void
  turn(): Promise<void>
  rename(text: string): Promise<void>
  takeEntry(surface: string, entry: string): void
  answer(which: string): void
}

async function stage(opened: OpenedFileState): Promise<Stage> {
  const pane = host()
  const screen = screenPane()
  const files = fileStore(opened)
  const document = templateDocument()
  const uid = firstTaskUid(document)
  const loop = frameLoop(pane.surface, document, SCREEN, screen.wiring, files.store)
  pane.runAnimationFrames()
  await settle()
  pane.runAnimationFrames()

  const send = (input: KeyInput | PointerInput): void => {
    loop.receiveInput(input as never)
    pane.runAnimationFrames()
  }
  const turn = async (): Promise<void> => {
    await settle()
    pane.runAnimationFrames()
  }
  const at = (surface: string, entry: string | null, answerKey?: string): void => {
    screen.drawAt({
      part: surface,
      entry,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
      ...(answerKey === undefined ? {} : { confirmationAnswer: answerKey }),
    } as unknown as ScreenPart)
    send(pointer('down', 500, 300))
    send(pointer('up', 500, 300))
    screen.drawAt(null)
  }
  return {
    loop,
    screen,
    files,
    frames: () => pane.runAnimationFrames(),
    send,
    turn,
    rename: async (text) => {
      screen.commitField({ row: 'PR-1', key: { holder: 'task', uid, column: 'name' }, text })
      send(ENTER)
      await turn()
    },
    takeEntry: (surface, entry) => at(surface, entry),
    answer: (which) => at(CONFIRMATION, null, which),
  }
}

afterEach(() => {
  if (realRaf === undefined) {
    delete (globalThis as unknown as { requestAnimationFrame?: unknown }).requestAnimationFrame
  } else {
    ;(globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = realRaf
  }
})

// Spec: FR-100, LM-11
// Why: the host warning itself is reachable only through the page, as the shell exports
// nothing; these cases hold the condition it hangs on, hasUnsavedEdits.
describe('FR-100 -- whether there is an unsaved edit to be warned about', () => {
  it('⛔ MUST NOT: a document nobody has touched has no unsaved edit', async () => {
    const built = await stage({ kind: 'none' })
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })

  it('⭐ MUST: one settled edit is an unsaved edit', async () => {
    // Why: without this case the one above is green over a loop that answers false for ever.
    const built = await stage({ kind: 'none' })
    await built.rename('Renamed by the case')

    expect(firstTaskName(built.loop.document()), 'the edit did not land at all').toBe(
      'Renamed by the case',
    )
    expect(built.loop.hasUnsavedEdits()).toBe(true)
  })

  it('⭐ and writing the document out clears it again', async () => {
    const built = await stage({ kind: 'writable', fileName: 'plan-a.json' })
    await built.rename('Renamed by the case')
    expect(built.loop.hasUnsavedEdits()).toBe(true)

    built.send(SK_11)
    await built.turn()

    expect(built.files.written.length, 'SK-11 wrote nothing, so nothing was saved').toBeGreaterThan(
      0,
    )
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })
})

// Spec: QN-5, OP-4, NT-7, U-55
describe('T-234 QN-5 -- the question that stands before an unsaved edit is discarded', () => {
  it('⭐ MUST: replacing a document that holds an unsaved edit puts QN-5 up', async () => {
    const built = await stage({ kind: 'none' })
    await built.rename('Renamed by the case')
    const discarded = titleOf(built.loop.document())

    built.send(SK_10)
    await built.turn()
    built.files.handOver(templateDocument(), 'there.json')
    await built.turn()
    built.takeEntry(OPEN_CHOOSER, 'IC-71')
    await built.turn()

    const question = built.screen.last().confirmation
    expect(question, 'OP-4 (MUST NOT): the document would go in silence').not.toBeNull()
    expect(question?.question).toBe('QN-5')
    expect(question?.manner).toBe('NT-7')
    expect(cellOf(T_234, 'QN-5', T_234_NAMES)).toContain('挙げる')
    expect(question?.items.map((one) => one.name)).toEqual([discarded])
  })

  it('⛔ answering "no" keeps the document AND the unsaved edit', async () => {
    // Why: OP-4's MUST NOT is about the discarding, not the silence alone, so an edit thrown
    // away after a no is thrown away just the same.
    const built = await stage({ kind: 'none' })
    await built.rename('Renamed by the case')

    built.send(SK_10)
    await built.turn()
    built.files.handOver(templateDocument(), 'there.json')
    await built.turn()
    built.takeEntry(OPEN_CHOOSER, 'IC-71')
    await built.turn()
    built.answer(CANCEL_ANSWER)
    await built.turn()

    expect(firstTaskName(built.loop.document())).toBe('Renamed by the case')
    expect(built.loop.hasUnsavedEdits()).toBe(true)
    expect(built.screen.last().confirmation, 'the answered question is still standing').toBeNull()
  })

  it('⭐ answering "yes" is what discards it -- so the gate is a gate', async () => {
    // Why: without this the case above is green over a loop that never replaces anything.
    const built = await stage({ kind: 'none' })
    await built.rename('Renamed by the case')

    built.send(SK_10)
    await built.turn()
    built.files.handOver(templateDocument(), 'there.json')
    await built.turn()
    built.takeEntry(OPEN_CHOOSER, 'IC-71')
    await built.turn()
    built.answer(PROCEED_ANSWER)
    await built.turn()

    expect(firstTaskName(built.loop.document())).not.toBe('Renamed by the case')
    expect(built.screen.last().confirmation).toBeNull()
  })
})

// Spec: OP-13, SK-21, OP-3, OP-4, U-56
describe('T-024a OP-13 -- reading the open file again', () => {
  it('⭐ SK-21 is the key table T-036 assigns, and it reaches IF-3 by the reopen route', async () => {
    expect(SK_21.modifiers.ctrl, 'table T-036 no longer spells SK-21 with Ctrl').toBe(true)

    const built = await stage({ kind: 'writable', fileName: 'plan-a.json' })
    await built.rename('Renamed by the case')

    built.send(SK_21)
    await built.turn()

    expect(built.files.routes).toEqual(['reopen'])
  })

  it('⛔⛔ MUST: no surface asks which of OP-3 s three to do -- the answer is settled', async () => {
    const built = await stage({ kind: 'writable', fileName: 'plan-a.json' })
    await built.rename('Renamed by the case')

    built.send(SK_21)
    await built.turn()
    built.files.handOver(templateDocument(), 'plan-a.json')
    await built.turn()

    expect(
      built.screen.last().openModal?.surface ?? null,
      'OP-13 (MUST): the reopen opened the surface that asks which of the three to do',
    ).toBeNull()
  })

  it('⛔⛔ MUST: the re-read file replaces the document, through OP-4 s question', async () => {
    const built = await stage({ kind: 'writable', fileName: 'plan-a.json' })
    await built.rename('Renamed by the case')

    built.send(SK_21)
    await built.turn()
    built.files.handOver(templateDocument(), 'plan-a.json')
    await built.turn()

    expect(
      built.screen.last().confirmation?.question ?? null,
      'OP-13 (MUST): OP-4 の確認は掛かること -- and the unsaved edit is what it is about',
    ).toBe('QN-5')

    built.answer(PROCEED_ANSWER)
    await built.turn()

    expect(firstTaskName(built.loop.document())).not.toBe('Renamed by the case')
  })

  it('⚠️ nothing is replaced when there is no open file to re-read (MUST)', async () => {
    // Why: docs/spec does not say whether the loop may ask IF-3 (FR-060's file) before deciding
    // there is nothing to re-read, so the read answers noOpenedFile and only the outcome is asserted.
    const built = await stage({ kind: 'none' })
    await built.rename('Renamed by the case')

    built.send(SK_21)
    await built.turn()
    if (built.files.pendingOpens() > 0) built.files.failOpen('noOpenedFile')
    await built.turn()

    expect(firstTaskName(built.loop.document())).toBe('Renamed by the case')
    expect(built.loop.hasUnsavedEdits()).toBe(true)
    expect(built.screen.last().openModal?.surface ?? null).toBeNull()
    expect(built.screen.last().confirmation).toBeNull()
  })
})
