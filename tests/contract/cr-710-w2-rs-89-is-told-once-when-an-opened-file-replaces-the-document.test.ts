// CR-710 wave 2 (spec-only): FR-054 tells RS-89 once when an opened file holds a working day whose spans do not add up to minutesPerDay.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { ChosenFileWrite, FileReading, FileStore } from '../../src/adapter/file-gateway/file-gateway'
import type {
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { Notice, ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { documentOf, taskOf, visualOf } from './cr-606-stage'
import {
  FRIDAY,
  MONDAY,
  THURSDAY,
  TUESDAY,
  WEDNESDAY,
  calendarRowOf,
  spansOf,
  type WorkingByDayType,
} from './cr-710-w1-stage'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))

const FR_054_OPEN =
  '⭐ 時間帯の合計が `minutesPerDay` と違う稼働日を持つ文書を開いたときは、表 T-233 の `RS-89` を 1 度だけ告げること（MUST）'

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly reasons: readonly { readonly rowId: string; readonly text: { readonly ja: string; readonly en: string } }[]
}
const RS_89_TEXT = WORDS.reasons.find((one) => one.rowId === 'RS-89')?.text.ja ?? '(no dictionary word for RS-89)'

describe('the clause and the row these cases are built from still read as quoted', () => {
  it('FR-054 tells RS-89 once on opening', () => {
    expect(REQUIREMENTS).toContain(FR_054_OPEN)
  })

  it('table T-233 holds RS-89 and the dictionary holds its words', () => {
    expect(specTable('T-233').rows.some((one) => one.id === 'RS-89')).toBe(true)
    expect(RS_89_TEXT).not.toContain('no dictionary word')
  })
})

const currentDocument = (): Document => documentOf({ tasks: [taskOf(1)], visuals: [visualOf(1)] })

const SCREEN: FrameEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }

const T_103 = specTable('T-103')
const T_036 = specTable('T-036')
const partNameOf = (id: string): string => bare(T_103.rows.find((one) => one.id === id)?.by['確定名（英）'] ?? '')
const OPEN_CHOOSER = partNameOf('U-56')
const CONFIRMATION = partNameOf('U-55')

function keyOf(id: string): KeyInput {
  const cell = T_036.rows.find((one) => one.id === id)?.by['割当'] ?? ''
  const first = cell.split('／')[0] ?? ''
  const parts = [...first.matchAll(/`([^`]+)`/g)].map((one) => one[1] ?? '')
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: named('Cmd') } satisfies InputModifiers,
  }
}
const SK_10 = keyOf('SK-10')
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  else (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
})

interface Stage {
  readonly loop: FrameLoop
  runFrames(): void
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
  handOver(text: string, fileName: string): void
}

function stageOf(document: Document): Stage {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as unknown as { requestAnimationFrame: (callback: (time: number) => void) => number }).requestAnimationFrame = (callback) => {
    waiting.push(callback)
    return waiting.length
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
  }
  const reading: ((value: FileReading) => void)[] = []
  const store: FileStore = {
    readFileToOpen: () =>
      new Promise<FileReading>((resolve) => {
        reading.push(resolve)
      }),
    adoptFileReadToOpen: () => undefined,
    forgetOpenedFile: () => undefined,
    readOpenedFileState: async () => ({ kind: 'none' }),
    restoreOpenedFilePermission: async () => ({ kind: 'none' }),
    overwriteOpenedFile: async () => ({ ok: false, fault: { reason: 'noOpenedFile', what: 'this document has never been in a file' } }),
    writeChosenFile: async (write: ChosenFileWrite) => ({ ok: true, openedFile: { kind: 'writable', fileName: write.suggestedFileName } }),
  }
  const wiring: ScreenWiring = { surface, language: 'ja' }
  const loop = frameLoop({ showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined }, document, SCREEN, wiring, store)
  return {
    loop,
    runFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
    },
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    handOver: (text, fileName) => {
      const answer = reading.shift()
      if (answer === undefined) throw new Error('SK-10 asked the store for no file, so there is nothing to hand over')
      answer({ ok: true, file: { bytes: new TextEncoder().encode(text), fileName } })
    },
  }
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput =>
  ({ kind: 'pointer', phase, button: 'left', x, y, modifiers: NO_MODIFIERS, clickCount: 1 }) as PointerInput

function press(stage: Stage, part: Record<string, unknown>): void {
  stage.drawAt({
    part: part['part'],
    entry: part['entry'] ?? null,
    format: null,
    taskGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
    ...(part['confirmationAnswer'] === undefined ? {} : { confirmationAnswer: part['confirmationAnswer'] }),
  } as unknown as ScreenPart)
  stage.loop.receiveInput(pointer('down', 500, 300))
  stage.loop.receiveInput(pointer('up', 500, 300))
  stage.drawAt(null)
}

async function openFile(stage: Stage, text: string): Promise<void> {
  stage.loop.receiveInput(SK_10)
  stage.runFrames()
  await settle()
  stage.handOver(text, 'incoming.json')
  await settle()
  stage.runFrames()
  press(stage, { part: OPEN_CHOOSER, entry: 'IC-71' })
  await settle()
  stage.runFrames()
  press(stage, { part: CONFIRMATION, confirmationAnswer: 'proceed' })
  await settle()
  stage.runFrames()
}

// WHY: a document whose one calendar holds Monday to Friday with the given spans, and a given minutesPerDay (null reads as S-128, 480).
function fileText(spans: WorkingByDayType, minutesPerDay: number | null): string {
  const base = currentDocument() as unknown as Record<string, unknown>
  const schedule = base['schedule'] as Record<string, unknown>
  const project = schedule['project'] as Record<string, unknown>
  const document = {
    ...base,
    schedule: {
      ...schedule,
      project: { ...project, calendarUid: 1, minutesPerDay },
      calendars: [calendarRowOf({ working: spans })],
    },
  } as unknown as Document
  return jsonFromDocument(document)
}

const everyWeekday = (spanList: ReturnType<typeof spansOf>): WorkingByDayType => ({
  [MONDAY]: spanList,
  [TUESDAY]: spanList,
  [WEDNESDAY]: spanList,
  [THURSDAY]: spanList,
  [FRIDAY]: spanList,
})

const MORNING_ONLY = everyWeekday(spansOf(['08:00', '12:00']))
const WHOLE_DAY = everyWeekday(spansOf(['08:00', '12:00'], ['13:00', '17:00']))
const SEVEN_HOURS = everyWeekday(spansOf(['08:00', '12:00'], ['13:00', '16:00']))

const told = (notices: readonly Notice[]): readonly Notice[] => notices.filter((one) => one.text === RS_89_TEXT)

describe('FR-054, RS-89: an opened file whose working day does not add up to the day', () => {
  it('tells RS-89 once for a day of 240 minutes against the 480 of S-128', async () => {
    const stage = stageOf(currentDocument())
    await openFile(stage, fileText(MORNING_ONLY, null))
    expect(told(stage.last().notices)).toHaveLength(1)
  })

  it('tells it once and not again on the frames that follow', async () => {
    const stage = stageOf(currentDocument())
    await openFile(stage, fileText(MORNING_ONLY, null))
    for (let turn = 0; turn < 4; turn += 1) {
      stage.runFrames()
      await settle()
    }
    expect(told(stage.last().notices)).toHaveLength(1)
  })

  it('compares with the minutesPerDay of the file: 480 of spans against 420 is told', async () => {
    const stage = stageOf(currentDocument())
    await openFile(stage, fileText(WHOLE_DAY, 420))
    expect(told(stage.last().notices)).toHaveLength(1)
  })

  it('says nothing when the spans add up to the day: 480 against the 480 of S-128', async () => {
    const stage = stageOf(currentDocument())
    await openFile(stage, fileText(WHOLE_DAY, null))
    expect(told(stage.last().notices)).toHaveLength(0)
  })

  it('says nothing when the spans add up to the minutesPerDay of the file: 420 against 420', async () => {
    const stage = stageOf(currentDocument())
    await openFile(stage, fileText(SEVEN_HOURS, 420))
    expect(told(stage.last().notices)).toHaveLength(0)
  })

  it('premise: the file replaced the document', async () => {
    const stage = stageOf(currentDocument())
    await openFile(stage, fileText(MORNING_ONLY, null))
    const calendar = stage.loop.document().schedule.calendars[0]
    expect(calendar?.weekDays.find((one) => one.dayType === MONDAY)?.workingTimes).toHaveLength(1)
  })
})
