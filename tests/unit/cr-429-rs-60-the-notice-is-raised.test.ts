// CR-429: opening an MSPDI file with a leaf repeated under one Task raises T-233 RS-60 (MR-3, NT-5).

import { readFileSync } from 'node:fs'
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
  Notice,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'
import { currentDocument, pj12Fixture, withTask } from './cr-429-mspdi-fixtures'
import { insertedAfter, leaf, mspdiText, type Spec } from './cr-429-mspdi-schema'

const T_265: SpecTable = specTable('T-265')
const T_233: SpecTable = specTable('T-233')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const RS_60 = 'RS-60'

function mannerOfRs60(): string {
  return bare(rowOf(T_233, RS_60).by['作法'] ?? '')
}

interface ReasonEntry {
  readonly rowId: string
  readonly text: { readonly ja: string; readonly en: string }
}

function reasonWordsOf(rowId: string): ReasonEntry {
  const path = join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json')
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { reasons: ReasonEntry[] }
  const found = raw.reasons.find((each) => each.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${rowId}`)
  return found
}

function withTaskLeafTwice(root: Spec, uid: number, afterName: string, repeated: Spec): Spec {
  return withTask(root, uid, (children) => insertedAfter(children, afterName, repeated))
}

const CLEAN_TEXT = mspdiText(pj12Fixture())

const ONE_REPEAT_TEXT = mspdiText(
  withTaskLeafTwice(pj12Fixture(), 2, 'Name', leaf('Name', 'Piers again')),
)

const TWO_REPEATS_TEXT = mspdiText(
  withTaskLeafTwice(
    withTaskLeafTwice(pj12Fixture(), 2, 'Name', leaf('Name', 'Piers again')),
    2,
    'Name',
    leaf('Name', 'Piers once more'),
  ),
)

const T_103: SpecTable = specTable('T-103')
const T_036: SpecTable = specTable('T-036')

function partNameOf(id: string): string {
  const name = bare(rowOf(T_103, id).by['確定名（英）'] ?? '')
  if (name === '') throw new Error(`table T-103 row ${id} names no UI part`)
  return name
}

function assignmentsIn(cell: string): readonly (readonly string[])[] {
  return cell
    .split('／')
    .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
    .filter((keys) => keys.length > 0)
}

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

const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame

function host(): Host {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as unknown as { requestAnimationFrame: (callback: (time: number) => void) => number }).requestAnimationFrame =
    (callback) => {
      waiting.push(callback)
      return waiting.length
    }
  return {
    surface: { showSvg: () => undefined },
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
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
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

function pointer(phase: PointerPhase, x: number, y: number): PointerInput {
  return { kind: 'pointer', phase, button: 'left', x, y, modifiers: NO_MODIFIERS, clickCount: 1 }
}

function takeEntry(loop: FrameLoop, screen: ScreenPane, surface: string, entry: string): void {
  screen.drawAt({
    part: surface,
    entry,
    format: null,
    rowGroupId: null,
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
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
    confirmationAnswer: answer,
  } as unknown as ScreenPart)
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  screen.drawAt(null)
}

async function openAnMspdiFile(
  loop: FrameLoop,
  pane: Host,
  files: StoreProbe,
  text: string,
): Promise<void> {
  loop.receiveInput(SK_10)
  pane.runAnimationFrames()
  await settle()
  files.handOver(text, 'incoming.xml')
  await settle()
  pane.runAnimationFrames()
}

afterEach(() => {
  if (realRaf === undefined) {
    delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  } else {
    ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
  }
})

const OPEN_CHOOSER = partNameOf('U-56')
const CONFIRMATION = partNameOf('U-55')

async function replacedWithMspdi(text: string): Promise<{ loop: FrameLoop; screen: ScreenPane }> {
  const pane = host()
  const screen = screenPane()
  const files = fileStore()
  const loop = frameLoop(pane.surface, currentDocument(), SCREEN, screen.wiring, files.store)

  await openAnMspdiFile(loop, pane, files, text)
  takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
  await settle()
  pane.runAnimationFrames()
  answerQuestion(loop, screen, PROCEED_ANSWER)
  await settle()
  pane.runAnimationFrames()

  return { loop, screen }
}

function rs60NoticeIn(notices: readonly Notice[]): Notice | undefined {
  return notices.find((one) => one.text === reasonWordsOf(RS_60).text.ja)
}

describe('RS-60 (T-233, MR-3, NT-5): the app raises the notice when an MSPDI import repeats a leaf', () => {
  it('MR-3: table T-265 still takes the first of a repeated leaf and tells RS-60', () => {
    const cells = rowOf(T_265, 'MR-3').cells.join(' | ')
    expect(cells).toContain(
      '値だけを持つ子（葉）が同じ親の下に同じ名前で 2 つ以上あるときは、最初のものを採り、表 T-233 の `RS-60` で告げること（MUST）。',
    )
  })

  it('RS-60 (NT-5): table T-233 still holds the row under manner NT-5, sourced from MR-3', () => {
    expect(mannerOfRs60()).toBe('NT-5')
    expect(rowOf(T_233, RS_60).by['正'] ?? '').toContain('`MR-3`')
  })

  it('RS-60: an MSPDI Task with one repeated Name leaf raises the notice with count 1', async () => {
    const { loop, screen } = await replacedWithMspdi(ONE_REPEAT_TEXT)

    const task = loop.document().schedule.tasks.find((each) => each.uid === 2)
    expect(task?.name).toBe('Piers')

    const notice = rs60NoticeIn(screen.last().notices)
    expect(notice).toBeDefined()
    expect(notice?.manner).toBe(mannerOfRs60())
    expect(notice?.affectedCount).toBe(1)
  })

  it('RS-60: an MSPDI file with no repeated leaf raises no RS-60 notice', async () => {
    const { screen } = await replacedWithMspdi(CLEAN_TEXT)

    const notice = rs60NoticeIn(screen.last().notices)
    expect(notice).toBeUndefined()
  })

  it('RS-60: three copies of one leaf raise the notice with count 2', async () => {
    const { screen } = await replacedWithMspdi(TWO_REPEATS_TEXT)

    const notice = rs60NoticeIn(screen.last().notices)
    expect(notice).toBeDefined()
    expect(notice?.affectedCount).toBe(2)
  })
})
