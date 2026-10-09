// Unit test: DFC-1224 -- only a replace (IC-71) makes the chosen file the save target (FR-060, T-290).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { bare, specTable, unbroken } from './spec-table'
import { mspdiFromDocument } from '../../src/adapter/document-codec/document-codec'
import type {
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  fileSystemAccessFileStore,
  type FileHandle,
  type FileSystemAccessEnvironment,
} from '../../src/framework/file-system-access-file-store/file-system-access-file-store'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
} from '../../src/framework/single-html-shell/frame-loop'

const LAST_SAVED_AT = '2026-10-03T09:00:00'

const T_036 = specTable('T-036')
const T_103 = specTable('T-103')
const T_036_ASSIGNMENT = 1
const T_103_NAME = 0

const cellOf = (
  table: { rows: readonly { id: string; cells: readonly string[] }[] },
  id: string,
  at: number,
): string => {
  const row = table.rows.find((one) => one.id === id)
  const cell = row?.cells[at]
  if (cell === undefined) throw new Error(`no cell ${at} in row ${id}`)
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
    modifiers: { ctrl: named('Ctrl'), shift: named('Shift'), alt: named('Alt'), meta: named('Cmd') },
  }
}

const SK_10 = keyOf('SK-10')
const SK_11 = keyOf('SK-11')
const OPEN_CHOOSER = bare(cellOf(T_103, 'U-56', T_103_NAME))
const CONFIRMATION = bare(cellOf(T_103, 'U-55', T_103_NAME))
const PROCEED_ANSWER = 'proceed'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)
const THE_SAVE_TARGET_MUST =
  '合流と重ね（表 T-024a の `OP-3`）で開いた後も、上書きする先はそれまでのままとすること（MUST）'

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const HERE_TASK_GROUP = '11111111-1111-4111-8111-111111111111'
const THERE_TASK_GROUP = '22222222-2222-4222-8222-222222222222'

function documentWith(title: string, rowId: string, uids: readonly number[]): Document {
  const template = structuredClone(TEMPLATE) as Record<string, any>
  return {
    '$schema': template['$schema'],
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...structuredClone(template['schedule'].project), title, uidHighWaterMark: 100 },
      calendars: structuredClone(template['schedule'].calendars),
      tasks: uids.map((uid) => ({
        uid, parentTaskUid: null, wbsOrder: uid, name: `Task ${uid}`,
        start: '2026-04-01', finish: '2026-04-10', milestone: false, deadline: null,
        notes: null, calendarUid: null, actualStart: null, stop: null, actualFinish: null,
        resume: null, resumeValid: null, percentComplete: 0, fadeInDays: null,
        fadeOutDays: null, dependencies: [], carry: {}, carryElements: [],
      })),
      resources: [],
      assignments: [],
      taskGroups: [{
        id: rowId, parentId: null, label: title, derivedFromTaskUid: null, order: 0,
        treeState: 'auto', editGroup: null, color: null, minHeight: null,
      }],
      taskGroupMembers: uids.map((uid) => ({ taskUid: uid, groupId: rowId })),
      taskVisuals: uids.map((uid) => ({
        taskUid: uid, shapeKind: null, milestoneGlyph: null, fillColor: null, strokeColor: null, strokeWidthPx: null,
      })),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template['documentSettings']),
    documentStamp: structuredClone(template['documentStamp']),
    changeLog: [],
  } as unknown as Document
}

const here = (): Document => documentWith('Here', HERE_TASK_GROUP, [1, 2])
const there = (): Document => documentWith('There', THERE_TASK_GROUP, [11, 12])
const overlapping = (): Document => documentWith('There', THERE_TASK_GROUP, [1, 12])

const SAVED_FILE_NAME = 'plan-of-record.json'
const CHOSEN_FILE_NAME = 'there.json'
const CHOSEN_MSPDI_NAME = 'there.xml'

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

interface RecordingHandle {
  readonly handle: FileHandle
  readonly writes: Uint8Array[]
}

function recordingHandle(name: string, text: string): RecordingHandle {
  const writes: Uint8Array[] = []
  let content = new TextEncoder().encode(text)
  const handle: FileHandle = {
    kind: 'file',
    name,
    getFile: async () => {
      const bytes = content
      return {
        name,
        size: bytes.byteLength,
        arrayBuffer: async () => bytes.slice().buffer,
      }
    },
    createWritable: async () => {
      let pending = new Uint8Array(0)
      return {
        write: async (data: BufferSource) => {
          pending = new Uint8Array(data as ArrayBuffer)
        },
        close: async () => {
          content = pending
          writes.push(pending)
        },
        abort: async () => undefined,
      }
    },
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
  }
  return { handle, writes }
}

interface Browser {
  readonly environment: FileSystemAccessEnvironment
  saveFilePickerCalls(): number
}

function browser(saveTo: RecordingHandle, openFrom: RecordingHandle): Browser {
  let saveCalls = 0
  return {
    environment: {
      openFilePicker: async () => [openFrom.handle],
      saveFilePicker: async () => {
        saveCalls += 1
        return saveTo.handle
      },
      dropSurface: { addEventListener: () => undefined },
    },
    saveFilePickerCalls: () => saveCalls,
  }
}

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  else (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
})

async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase): PointerInput => ({
  kind: 'pointer', phase, button: 'left', x: 500, y: 300, modifiers: { ...NO_MODIFIERS }, clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  readonly browser: Browser
  press(key: KeyInput): Promise<void>
  take(surface: string, entry: string | null, answer?: string): Promise<void>
  confirmation(): ScreenView['confirmation']
}

async function stage(saveTo: RecordingHandle, openFrom: RecordingHandle): Promise<Stage> {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (
    callback: (time: number) => void,
  ): number => waiting.push(callback)
  const frames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => void views.push(view),
    readDialogueInput: () => null,
    readFieldCommit: () => null as never,
    readScreenPartAt: () => part,
  }
  const host = browser(saveTo, openFrom)
  const store = fileSystemAccessFileStore(host.environment)
  const loop = frameLoop({ showSvg: () => undefined }, here(), SCREEN, { surface, language: 'en' }, store)
  frames()
  await settle()
  frames()
  const turn = async (): Promise<void> => {
    frames()
    await settle()
    frames()
  }
  return {
    loop,
    browser: host,
    press: async (key) => {
      loop.receiveInput(key)
      await turn()
    },
    take: async (at, entry, answer) => {
      part = {
        part: at, entry, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null,
        noticeDismissKey: null, ...(answer === undefined ? {} : { confirmationAnswer: answer }),
      } as unknown as ScreenPart
      loop.receiveInput(pointer('down'))
      loop.receiveInput(pointer('up'))
      part = null
      await turn()
    },
    confirmation: () => views[views.length - 1]?.confirmation ?? null,
  }
}

async function savedThenChosen(openFrom: RecordingHandle): Promise<{ built: Stage; saveTo: RecordingHandle }> {
  const saveTo = recordingHandle(SAVED_FILE_NAME, '')
  const built = await stage(saveTo, openFrom)
  await built.press(SK_11)
  expect(saveTo.writes.length, 'the first SK-11 did not reach the save target').toBe(1)
  await built.press(SK_10)
  return { built, saveTo }
}

describe('DFC-1224 -- only a replace makes the chosen file the save target', () => {
  it('FR-060 holds the clause these cases drive', () => {
    expect(REQUIREMENTS).toContain(THE_SAVE_TARGET_MUST)
  })

  it('IC-72: after a merge, SK-11 writes the previous save target, not the chosen file', async () => {
    const chosen = recordingHandle(CHOSEN_FILE_NAME, JSON.stringify(there()))
    const { built, saveTo } = await savedThenChosen(chosen)
    await built.take(OPEN_CHOOSER, 'IC-72')
    expect(built.loop.document().schedule.tasks.length, 'the merge never landed').toBeGreaterThan(2)

    await built.press(SK_11)

    expect(chosen.writes.length, 'the merged document was written over the chosen file').toBe(0)
    expect(saveTo.writes.length).toBe(2)
  })

  it('IC-73: after an overlay, SK-11 writes the previous save target, not the chosen file', async () => {
    const chosen = recordingHandle(CHOSEN_FILE_NAME, JSON.stringify(overlapping()))
    const { built, saveTo } = await savedThenChosen(chosen)
    await built.take(OPEN_CHOOSER, 'IC-73')
    expect(built.loop.document().schedule.baselineTasks.length, 'the overlay never landed').toBeGreaterThan(0)

    await built.press(SK_11)

    expect(chosen.writes.length, 'the overlaid document was written over the chosen file').toBe(0)
    expect(saveTo.writes.length).toBe(2)
  })

  it('IC-52: closing U-56 unanswered leaves the save target where it was', async () => {
    const chosen = recordingHandle(CHOSEN_FILE_NAME, JSON.stringify(there()))
    const { built, saveTo } = await savedThenChosen(chosen)
    await built.take(OPEN_CHOOSER, 'IC-52')

    await built.press(SK_11)

    expect(chosen.writes.length, 'a file nobody opened was written over').toBe(0)
    expect(saveTo.writes.length).toBe(2)
  })

  it('OP-5: a file refused before U-56 leaves the save target where it was', async () => {
    const chosen = recordingHandle(CHOSEN_FILE_NAME, '{ this is not GRS JSON')
    const { built, saveTo } = await savedThenChosen(chosen)

    await built.press(SK_11)

    expect(chosen.writes.length, 'a refused file was written over').toBe(0)
    expect(saveTo.writes.length).toBe(2)
  })

  it('IC-72 with no save target yet: SK-11 asks for a file instead of writing the chosen one', async () => {
    const chosen = recordingHandle(CHOSEN_FILE_NAME, JSON.stringify(there()))
    const saveTo = recordingHandle(SAVED_FILE_NAME, '')
    const built = await stage(saveTo, chosen)
    await built.press(SK_10)
    await built.take(OPEN_CHOOSER, 'IC-72')

    await built.press(SK_11)

    expect(chosen.writes.length).toBe(0)
    expect(built.browser.saveFilePickerCalls()).toBe(1)
    expect(saveTo.writes.length).toBe(1)
  })

  it('IC-71: a replace makes the chosen file the save target', async () => {
    const chosen = recordingHandle(CHOSEN_FILE_NAME, JSON.stringify(there()))
    const { built, saveTo } = await savedThenChosen(chosen)
    await built.take(OPEN_CHOOSER, 'IC-71')
    if (built.confirmation() !== null) await built.take(CONFIRMATION, null, PROCEED_ANSWER)
    expect(built.loop.document().schedule.project.title, 'the replace never landed').toBe('There')

    await built.press(SK_11)

    expect(chosen.writes.length, 'SK-11 did not write over the replacing file (FR-060)').toBe(1)
    expect(saveTo.writes.length).toBe(1)
  })

  it('IC-71 from an MSPDI file: the first SK-11 still asks for a file (FR-096)', async () => {
    const chosen = recordingHandle(CHOSEN_MSPDI_NAME, mspdiFromDocument(there(), LAST_SAVED_AT).text)
    const { built, saveTo } = await savedThenChosen(chosen)
    await built.take(OPEN_CHOOSER, 'IC-71')
    if (built.confirmation() !== null) await built.take(CONFIRMATION, null, PROCEED_ANSWER)
    expect(built.loop.document().schedule.project.title, 'the replace never landed').toBe('There')

    await built.press(SK_11)

    expect(chosen.writes.length, 'GRS JSON was written over an MSPDI file').toBe(0)
    expect(built.browser.saveFilePickerCalls()).toBe(2)
    expect(saveTo.writes.length, 'the earlier save target was written without QN-4').toBe(1)
  })
})
