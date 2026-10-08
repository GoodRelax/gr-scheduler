// DFC-732 spec-only cases: T-263 IR-3 -- while a notice told for a refused import stands, every frame line of the record carries the T-220 row that refused it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Clipboard, ClipboardContent } from '../../src/adapter/clipboard-gateway/clipboard'
import type { ChosenFileWrite, FileReading, FileStore } from '../../src/adapter/file-gateway/file-gateway'
import type {
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see IR-3
const IR_3_ROW_ID =
  '出ている通知ごとに、その理由の行 ID（表 T-233 の `RS-` の行、または Chapter 6.1 の 表 T-220 の行）を書くこと（MUST）'
const IR_3_READABLE =
  '⚠️ 取り込みを拒んだ通知は 表 T-220 の行を運ぶ（`FR-076`、表 T-035 の `AG-9a`）—— 記録からも、検証のどの行で拒んだかが読める'
// see T-233
const T_233_CARRIES_THE_ROW =
  '⭐ ⇒ 取り込みの検証が拒んだとき、`NT-1` の通知が運ぶ理由は、拒んだ 表 T-220 の行の行 ID とすること（MUST）'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

type Json = Record<string, any>

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)
const templateJson = (): Json => JSON.parse(TEMPLATE_TEXT) as Json

function decoded(json: Json): Document {
  const read = documentFromJson(JSON.stringify(json))
  if (!read.ok) throw new Error(`premise: the scene is GRS JSON, was ${JSON.stringify(read.faults).slice(0, 400)}`)
  return read.document
}

// WHY: IV-23 (T-220) wants exactly one TaskVisual per Task, so a file that draws one Task twice is refused by that row.
const REFUSING_ROW = 'IV-23'
function fileRefusedByIv23(): Json {
  const json = templateJson()
  const visuals = json['schedule']['taskVisuals'] as Json[]
  const first = visuals[0]
  if (first === undefined) throw new Error('premise: the template holds a task visual')
  visuals.push(structuredClone(first))
  return json
}

const SCREEN: FrameEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

// see SK-10
function openKey(): KeyInput {
  const cell = rowOf('T-036', 'SK-10').by['割当'] ?? ''
  const parts = [...(cell.split('／')[0] ?? '').matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? '')
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error('table T-036 row SK-10 states no assignment')
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: named('Cmd') },
  }
}

const RECORD_ENTRANCE = 'IC-76'
const recordPart = (): ScreenPart =>
  ({
    part: 'Command Palette',
    entry: RECORD_ENTRANCE,
    format: null,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  }) as ScreenPart

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  else (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
})

const pointer = (phase: PointerPhase, at: { x: number; y: number }): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

interface Bench {
  readonly loop: FrameLoop
  readonly records: string[]
  readonly views: ScreenView[]
  frames(): void
  pressRecordEntrance(): void
  handOver(text: string): void
  raiseStanding(reason: string): void
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
  const records: string[] = []
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
  const clipboard: Clipboard = {
    writeClipboardContent: (content: ClipboardContent) => {
      if (content.kind === 'record') records.push(content.text)
      return Promise.resolve({ ok: true })
    },
  }
  const loop = frameLoop({ showSvg: () => undefined } as never, decoded(templateJson()), SCREEN, wiring, store, undefined, clipboard)
  frames()
  return {
    loop,
    records,
    views,
    frames,
    pressRecordEntrance: () => {
      const at = { x: 30, y: 650 }
      part = recordPart()
      loop.receiveInput(pointer('down', at))
      loop.receiveInput(pointer('up', at))
      part = null
      frames()
    },
    raiseStanding: (reason) => {
      // WHY: the only public raise seam of the loop; the cast hands it a T-220 row, which its type does not name.
      loop.raiseStartupNotice(reason as never)
      frames()
    },
    handOver: (text) => {
      const answer = answers.shift()
      if (answer === undefined) throw new Error('SK-10 asked the store for no file')
      answer({ ok: true, file: { bytes: new TextEncoder().encode(text), fileName: 'incoming.json' } })
    },
  }
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const valueIn = (line: string, name: string): string | null =>
  new RegExp(`(?:^|\\s)${name}=(\\S+)`).exec(line)?.[1] ?? null

const frameLinesOf = (record: string): readonly string[] =>
  record.split('\n').filter((line) => line.split('\t')[2] === 'frame')

describe('DFC-732 premise -- the clauses these cases press still stand', () => {
  it.each([IR_3_ROW_ID, IR_3_READABLE, T_233_CARRIES_THE_ROW])('01-04 holds %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-220 holds the row the refused file breaks', () => {
    expect(rowOf('T-220', REFUSING_ROW).id).toBe(REFUSING_ROW)
    expect(bare(rowOf('T-263', 'IR-3').by['項目'] ?? 'IR-3').length).toBeGreaterThan(0)
  })
})

async function recordedWhileANoticeStands(reason: string): Promise<string> {
  const one = bench()
  one.pressRecordEntrance()
  one.frames()
  one.raiseStanding(reason)
  one.frames()
  one.pressRecordEntrance()
  const record = one.records[one.records.length - 1]
  if (record === undefined) throw new Error('premise: stopping the record handed it to the clipboard')
  return record
}

describe(`T-263 IR-3 -- ${IR_3_ROW_ID}`, () => {
  it('a frame line drawn while a notice stands writes the row id that notice carries, a T-220 row included', async () => {
    const lines = frameLinesOf(await recordedWhileANoticeStands(REFUSING_ROW))
    const withNotice = lines.filter((line) => Number(valueIn(line, 'notices')) > 0)
    expect(withNotice.length, 'premise: a frame line was written while the notice stood').toBeGreaterThan(0)
    for (const line of withNotice) {
      expect((valueIn(line, 'noticeReasons') ?? '').split(','), IR_3_ROW_ID).toContain(REFUSING_ROW)
    }
  })

  it('a frame line carries as many reasons as the notices it counts, and "-" when none stands', async () => {
    for (const line of frameLinesOf(await recordedWhileANoticeStands(REFUSING_ROW))) {
      const reasons = valueIn(line, 'noticeReasons')
      const many = Number(valueIn(line, 'notices'))
      if (many === 0) expect(reasons, IR_3_ROW_ID).toBe('-')
      else expect((reasons ?? '').split(',').length, IR_3_ROW_ID).toBe(many)
    }
  })

  it('a frame line drawn before the notice names no reason', async () => {
    const first = frameLinesOf(await recordedWhileANoticeStands(REFUSING_ROW))[0]
    expect(first).toBeDefined()
    expect(Number(valueIn(first ?? '', 'notices'))).toBe(0)
    expect(valueIn(first ?? '', 'noticeReasons')).toBe('-')
  })
})

describe(`T-233 closing / T-263 IR-3 -- ${IR_3_READABLE}`, () => {
  it('premise: a file that breaks IV-23 is refused before the open chooser and the document is kept', async () => {
    const one = bench()
    const before = one.loop.document()
    one.loop.receiveInput(openKey())
    one.frames()
    await settle()
    one.handOver(JSON.stringify(fileRefusedByIv23()))
    await settle()
    one.frames()
    expect(JSON.stringify(one.views[one.views.length - 1]?.openModal ?? null), 'OP-5: FR-023 runs before OP-3').not.toContain('Open Chooser')
    expect(one.loop.document()).toBe(before)
  })

  // see DFC-732, T-233
  it('DFC-732: a refused import leaves an NT-1 notice standing whose reason is the T-220 row, and the record names it', async () => {
    const one = bench()
    one.pressRecordEntrance()
    one.frames()
    one.loop.receiveInput(openKey())
    one.frames()
    await settle()
    one.handOver(JSON.stringify(fileRefusedByIv23()))
    await settle()
    one.frames()
    one.pressRecordEntrance()
    const record = one.records[one.records.length - 1] ?? ''
    const withNotice = frameLinesOf(record).filter((line) => Number(valueIn(line, 'notices')) > 0)
    expect(withNotice.length, T_233_CARRIES_THE_ROW).toBeGreaterThan(0)
    for (const line of withNotice) {
      expect((valueIn(line, 'noticeReasons') ?? '').split(','), IR_3_READABLE).toContain(REFUSING_ROW)
    }
  })
})
