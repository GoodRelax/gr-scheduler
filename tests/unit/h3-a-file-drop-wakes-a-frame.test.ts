// H3 / Q17 / T-078 FT-1: a dropped file wakes one frame and opens through the drop route (OP-2, CS-4).

import { afterEach, describe, expect, it } from 'vitest'

import type {
  FileReading,
  FileStore,
  OpenRoute,
} from '../../src/adapter/file-gateway/file-gateway'
import type {
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  OPEN_ROUTE_FROM_DROP,
  type FrameLoop,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { DESIGN, REQUIREMENTS, rowDocument, SCREEN } from './cr-541-stage'

// see T-078
const FT_1_DROP = '人の入力（ポインタとキー）と、ファイルのドロップ（01-04 の 表 T-024a の `OP-2`）'
const FT_1_CONTINUATION = '⭐ **その入力の、待ち（表 T-066 の `CS-4`）をまたいだ続きを含む**'
const FT_1_SHELL_RAISES = '⚠️ **待ちをまたいだ続きを起こすのはシェル自身である**'
const T_078_MUST_NOT = '**本表に無い契機でフレームを起こしてはならない（MUST NOT）** —— これが `NFR-010` の具体である。'
// see T-066
const CS_4_ROW = '**人の応答を待つ 1 回のファイル操作**（開く・書き出す）'
const CS_4_NO_REREAD = '待っているあいだ、現在値を読み直してはならない（MUST NOT）。'
const CS_4_WAIT_CHANGES_NOTHING = '⛔ **待つことそのものは画面を何も変えない** —— 表 T-078 に契機が無いからである。'
const CS_4_NO_WAITING_SIGN = '**待っていることを示す表示を出してはならない（MUST NOT）。**'
const CS_4_QUESTION_FRAME =
  '⭐ 待ちが終わって問いが立つときのフレームは 表 T-078 の `FT-1` である —— その押下の、遅れて来た残りだからである。'
// see T-024a
const OP_2_ROUTES = 'ファイル選択、およびドラッグ＆ドロップ（表 T-008 の CHN-1）'
const OP_2_ONE_ENTRANCE = '入口は本要求の「開く」1 つとし、取込（合流）に別の入口を設けてはならない（MUST NOT）'
const OP_3_ASK = '**読んだ内容をどう扱うかを人に選ばせること（MUST）**'
const OP_3_NOT_BY_ITSELF = '**どちらになるかを`GRS` が勝手に決めてはならない（MUST NOT）。'

const DESIGN_CLAUSES: readonly (readonly [string, string])[] = [
  ['T-078 FT-1 -- a file drop is an input that wakes a frame', FT_1_DROP],
  ['T-078 FT-1 -- the continuation across a CS-4 wait is included', FT_1_CONTINUATION],
  ['T-078 FT-1 -- the shell itself raises the continuation', FT_1_SHELL_RAISES],
  ['T-078 (MUST NOT) -- no frame on a trigger the table does not hold', T_078_MUST_NOT],
  ['T-066 CS-4 -- one file operation that waits for a person', CS_4_ROW],
  ['T-066 CS-4 (MUST NOT) -- the current value is not re-read while waiting', CS_4_NO_REREAD],
  ['T-066 CS-4 -- waiting itself changes nothing on screen', CS_4_WAIT_CHANGES_NOTHING],
  ['T-066 CS-4 (MUST NOT) -- no sign that it is waiting', CS_4_NO_WAITING_SIGN],
  ['T-066 CS-4 -- the frame the question stands in is FT-1', CS_4_QUESTION_FRAME],
]

const REQUIREMENT_CLAUSES: readonly (readonly [string, string])[] = [
  ['T-024a OP-2 -- the chooser and drag and drop are the routes', OP_2_ROUTES],
  ['T-024a OP-2 (MUST NOT) -- one entrance, no second one for a merge', OP_2_ONE_ENTRANCE],
  ['T-024a OP-3 (MUST) -- the person chooses what the read content becomes', OP_3_ASK],
  ['T-024a OP-3 (MUST NOT) -- GRS does not choose by itself', OP_3_NOT_BY_ITSELF],
]

// see U-56
const OPEN_CHOOSER = ((): string => {
  const found = specTable('T-103').rows.find((one) => one.id === 'U-56')
  const name = bare(found?.cells[0] ?? '')
  if (name === '') throw new Error('table T-103 names no UI part U-56')
  return name
})()

const HERE_ROW = 'aaaaaaaa-0000-4000-8000-00000000000a'
const THERE_ROW = 'bbbbbbbb-0000-4000-8000-00000000000b'
const THERE_UID = 11

const here = (): Document => {
  const draft = rowDocument([{ id: HERE_ROW, parentId: null }])
  draft.schedule.project.title = 'Here'
  return draft as unknown as Document
}

// WHY: no uid is shared with here(), so FR-022 has no merge candidate and OP-3
// is the only question the drop can raise.
const there = (): Document => {
  const draft = rowDocument([{ id: THERE_ROW, parentId: null }])
  draft.schedule.project.title = 'There'
  draft.schedule.tasks[0].uid = THERE_UID
  draft.schedule.tasks[0].wbsOrder = THERE_UID
  draft.schedule.taskGroupMembers[0].taskUid = THERE_UID
  return draft as unknown as Document
}

const realRaf = (globalThis as any).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

interface Stage {
  readonly loop: FrameLoop
  readonly routes: OpenRoute[]
  framesAsked(): number
  runFrames(): void
  views(): number
  last(): ScreenView
  handOver(document: Document, fileName: string): void
  pendingReads(): number
}

// see UF-48, IF-3
async function stage(): Promise<Stage> {
  const waiting: ((time: number) => void)[] = []
  let asked = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    asked += 1
    waiting.push(callback)
    return asked
  }
  const runFrames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
    expect(waiting.length, 'the loop kept asking for frames with nothing to draw').toBe(0)
  }
  const shown: ScreenView[] = []
  const part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => void shown.push(view),
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  const routes: OpenRoute[] = []
  const answers: ((reading: FileReading) => void)[] = []
  // TRAP: the read never answers by itself, so a case can stand inside the
  // CS-4 wait; the file the drop left in the store is handed over by handOver.
  const store: FileStore = {
    readFileToOpen: (route) => {
      routes.push(route)
      return new Promise<FileReading>((resolve) => void answers.push(resolve))
    },
    readOpenedFileState: async () => ({ kind: 'none' }),
    restoreOpenedFilePermission: async () => ({ kind: 'none' }),
    overwriteOpenedFile: async () => ({
      ok: false,
      fault: { reason: 'noOpenedFile', what: 'never in a file' },
    }),
    writeChosenFile: async (write) => ({
      ok: true,
      openedFile: { kind: 'writable', fileName: write.suggestedFileName },
    }),
  }
  const loop = frameLoop({ showSvg: () => undefined }, here(), SCREEN, { surface, language: 'ja' }, store)
  runFrames()
  await settle()
  runFrames()
  return {
    loop,
    routes,
    framesAsked: () => asked,
    runFrames,
    views: () => shown.length,
    last: () => {
      const view = shown[shown.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    handOver: (document, fileName) => {
      const answer = answers.shift()
      if (answer === undefined) throw new Error('no read of a dropped file is waiting')
      answer({ ok: true, file: { bytes: new TextEncoder().encode(JSON.stringify(document)), fileName } })
    },
    pendingReads: () => answers.length,
  }
}

describe('H3 -- the manuscript these cases are driven by', () => {
  it.each(DESIGN_CLAUSES)('05-07 still says it, word for word: %s', (_name, clause) => {
    expect(DESIGN).toContain(clause)
  })

  it.each(REQUIREMENT_CLAUSES)('01-04 still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('FT-1 of table T-078 names OP-2, and its authority is NFR-010', () => {
    const ft1 = specTable('T-078').rows.find((one) => one.id === 'FT-1')
    expect(ft1?.cells.join(' ')).toContain('`OP-2`')
    expect(ft1?.cells.join(' ')).toContain('`NFR-010`')
  })

  it('the drop route is the IF-3 route a drop is read through', () => {
    expect(OPEN_ROUTE_FROM_DROP).toBe('drop')
  })

  it('both documents are valid GRS JSON documents', () => {
    for (const document of [here(), there()]) expect(validateDocument(document).errors).toEqual([])
  })
})

describe('T-078 FT-1 -- a file drop wakes a frame', () => {
  it('control: with no drop and no input the loop asks for no frame and reads no file', async () => {
    const run = await stage()
    const before = run.framesAsked()
    await settle()
    expect(run.framesAsked() - before, 'T-078 (MUST NOT): a frame with no trigger').toBe(0)
    expect(run.routes).toEqual([])
  })

  it('fileDropped asks for exactly one frame', async () => {
    const run = await stage()
    const before = run.framesAsked()
    run.loop.fileDropped()
    expect(run.framesAsked() - before, 'FT-1: a file drop is a trigger').toBe(1)
    run.runFrames()
  })

  it('the dropped file is read once, through the drop route (OP-2)', async () => {
    const run = await stage()
    run.loop.fileDropped()
    run.runFrames()
    await settle()
    run.runFrames()
    expect(run.routes).toEqual([OPEN_ROUTE_FROM_DROP])
  })

  it('OP-3: once the held file is handed over, the Open Chooser stands and nothing is settled', async () => {
    const run = await stage()
    const before = JSON.stringify(run.loop.document())
    run.loop.fileDropped()
    run.runFrames()
    await settle()
    run.handOver(there(), 'there.json')
    await settle()
    run.runFrames()
    expect(run.last().openModal?.surface, 'OP-3 (MUST): nobody is being asked').toBe(OPEN_CHOOSER)
    expect(JSON.stringify(run.loop.document()), 'OP-3 (MUST NOT): GRS chose by itself').toBe(before)
  })
})

describe('T-066 CS-4 -- the wait between the drop and the answer', () => {
  it('waiting for the store wakes no frame and draws nothing new', async () => {
    const run = await stage()
    const viewBefore = JSON.stringify(run.last())
    run.loop.fileDropped()
    run.runFrames()
    await settle()
    run.runFrames()
    expect(run.pendingReads(), 'the premise: the read is still waiting').toBe(1)
    const asked = run.framesAsked()
    const drawn = run.views()
    await settle()
    await settle()
    expect(run.framesAsked() - asked, 'CS-4: waiting itself wakes a frame').toBe(0)
    expect(run.views() - drawn).toBe(0)
    expect(JSON.stringify(run.last()), 'CS-4 (MUST NOT): a sign that it is waiting').toBe(viewBefore)
  })

  it('the answer arriving is the continuation of FT-1: the shell itself wakes a frame', async () => {
    const run = await stage()
    run.loop.fileDropped()
    run.runFrames()
    await settle()
    run.runFrames()
    const before = run.framesAsked()
    run.handOver(there(), 'there.json')
    await settle()
    expect(run.framesAsked() - before, 'FT-1: the continuation across the wait woke no frame').toBeGreaterThanOrEqual(1)
    run.runFrames()
    expect(run.last().openModal?.surface).toBe(OPEN_CHOOSER)
  })
})
