// CR-780 spec-only cases: a write that leaves the document as it was raises no unsaved edits (FR-100, ZE-4, T-290, QN-5).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi, type AgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type { Document } from '../../src/entity/document-model/document/document'
import { taskGroupDocument } from '../unit/cr-541-stage'
import { unbroken } from './spec-table'
import { exportStage, restoreAnimationFrames, type ExportStage } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'),
)

const CLAUSE_UNCHANGED_WRITE_RAISES_NOTHING =
  '⭐ 書き込みが文書を変えなかったとき（取り消しの手が増えないとき —— 手で同じ値に打ち直した、掴んだものを元の所で離した）は、未保存の編集を立ててはならない（MUST NOT）'

const TASK_GROUP_TITLE_DIVIDER = 'taskGroupPanel'
const HIGHLIGHT_ID = 'cr780-highlight-box'
const NEW_DOCUMENT_ENTRY = 'IC-98'

const documentOf = (): Document =>
  taskGroupDocument(
    [
      { id: 'g1', parentId: null },
      { id: 'g2', parentId: null },
    ],
    {},
    {
      highlightBoxes: [
        {
          id: HIGHLIGHT_ID,
          start: '2026-04-06T00:00:00',
          finish: '2026-04-16T00:00:00',
          topTaskGroupId: 'g1',
          bottomTaskGroupId: 'g2',
          strokeColor: null,
          cornerRadiusPx: null,
        },
      ],
    },
  ) as unknown as Document

function stageOf(): ExportStage {
  return exportStage(documentOf())
}

function apiOf(stage: ExportStage): AgentApi {
  return installAgentApi({
    ...stage.loop.agentApiSeams(),
    writerName: 'cr-780 tester',
    schemaVersion: documentOf().schemaVersion,
  } as never)
}

const write = (api: AgentApi, commands: readonly unknown[]) =>
  api.applyCommands({ expectedStamp: api.readStamp(), commands: commands as never })

const taskNameOf = (stage: ExportStage, uid: number): string => {
  const found = (stage.loop.document().schedule.tasks as unknown as { uid: number; name: string }[]).find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`premise: task ${uid} exists`)
  return found.name
}

function dividerOf(stage: ExportStage): { readonly x: number; readonly y: number } {
  const divider = stage.lastView().frame.dividers.find((one) => one.panel === TASK_GROUP_TITLE_DIVIDER)
  if (divider === undefined) throw new Error('premise: the Task Group Panel divider is drawn')
  return { x: divider.line.x + divider.line.width / 2, y: divider.line.y + divider.line.height / 2 }
}

function highlightCorner(stage: ExportStage): { readonly x: number; readonly y: number } {
  const found = stage.loop.current()?.geometry.highlightBoxes.find((one) => one.id === HIGHLIGHT_ID)
  if (found === undefined) throw new Error('premise: the frame drew the highlight box')
  return { x: found.box.x + found.box.width, y: found.box.y }
}

const pxPerDay = (stage: ExportStage): number => {
  const values = stage.loop.current()
  if (values === null) throw new Error('premise: the loop has run a frame')
  return values.layout.pxPerDay
}

// WHY: the entrance the question hangs on is pressed as a person presses it; QN-5 stands on the view only when asked.
async function newDocumentAsks(stage: ExportStage): Promise<string | null> {
  await stage.take(NEW_DOCUMENT_ENTRY)
  return stage.lastView().confirmation?.question ?? null
}

describe('CR-780 -- the manuscript still says what these cases read', () => {
  it(CLAUSE_UNCHANGED_WRITE_RAISES_NOTHING, () => {
    expect(REQUIREMENTS).toContain(CLAUSE_UNCHANGED_WRITE_RAISES_NOTHING)
  })
})

describe(`premise -- a document just opened holds nothing unsaved`, () => {
  it('FR-100 / FR-095 -- the new-document entry asks nothing', async () => {
    const stage = stageOf()
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
    expect(await newDocumentAsks(stage)).toBeNull()
  })
})

describe(`(a) a screen write that changes nothing -- ${CLAUSE_UNCHANGED_WRITE_RAISES_NOTHING}`, () => {
  it('a task group panel divider held and let go where it was: no unsaved edits, QN-5 not raised', async () => {
    const stage = stageOf()
    const at = dividerOf(stage)
    await stage.dragDivider(TASK_GROUP_TITLE_DIVIDER, at.x, at.x, at.y)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
    expect(await newDocumentAsks(stage)).toBeNull()
  })

  it('a highlight box corner held and let go where it was: no unsaved edits, QN-5 not raised', async () => {
    const stage = stageOf()
    const at = highlightCorner(stage)
    stage.pointer('down', at.x, at.y)
    stage.pointer('move', at.x + 1, at.y)
    stage.pointer('move', at.x, at.y)
    stage.pointer('up', at.x, at.y)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
    expect(await newDocumentAsks(stage)).toBeNull()
  })
})

describe('(b) control -- a screen write that changes a value raises unsaved edits', () => {
  it('a task group panel divider let go at another width: unsaved edits, QN-5 raised', async () => {
    const stage = stageOf()
    const at = dividerOf(stage)
    await stage.dragDivider(TASK_GROUP_TITLE_DIVIDER, at.x, at.x - 40, at.y)
    expect(stage.loop.hasUnsavedEdits()).toBe(true)
    expect(await newDocumentAsks(stage)).toBe('QN-5')
  })

  it('a highlight box corner pulled one day outward: unsaved edits, QN-5 raised', async () => {
    const stage = stageOf()
    const at = highlightCorner(stage)
    // WHY: at this zoom one day is a few pixels, so the pull is four days to clear the drag threshold.
    const day = pxPerDay(stage) * 4
    stage.pointer('down', at.x, at.y)
    stage.pointer('move', at.x + day / 2, at.y)
    stage.pointer('move', at.x + day, at.y)
    stage.pointer('up', at.x + day, at.y)
    expect(stage.loop.hasUnsavedEdits()).toBe(true)
    expect(await newDocumentAsks(stage)).toBe('QN-5')
  })
})

describe(`(c) the Agent API write path -- ${CLAUSE_UNCHANGED_WRITE_RAISES_NOTHING}`, () => {
  it('applyCommands setting a task name to the name it holds: accepted, no unsaved edits, QN-5 not raised', async () => {
    const stage = stageOf()
    const api = apiOf(stage)
    const outcome = write(api, [{ kind: 'setTaskName', uid: 1, name: taskNameOf(stage, 1) }])
    expect(outcome.ok, 'premise: the write is accepted').toBe(true)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
    expect(await newDocumentAsks(stage)).toBeNull()
  })

  it('applyCommands of a bundle whose every command sets the held value: no unsaved edits', () => {
    const stage = stageOf()
    const api = apiOf(stage)
    const outcome = write(api, [
      { kind: 'setTaskName', uid: 1, name: taskNameOf(stage, 1) },
      { kind: 'setTaskName', uid: 2, name: taskNameOf(stage, 2) },
    ])
    expect(outcome.ok, 'premise: the write is accepted').toBe(true)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
  })

  it('control: applyCommands setting a task name to a new name: unsaved edits, QN-5 raised', async () => {
    const stage = stageOf()
    const api = apiOf(stage)
    const outcome = write(api, [{ kind: 'setTaskName', uid: 1, name: 'Renamed by the agent' }])
    expect(outcome.ok, 'premise: the write is accepted').toBe(true)
    expect(taskNameOf(stage, 1)).toBe('Renamed by the agent')
    expect(stage.loop.hasUnsavedEdits()).toBe(true)
    expect(await newDocumentAsks(stage)).toBe('QN-5')
  })
})

// see SK-6 (T-036 spells the key as Z)
const UNDO = { kind: 'key', key: 'Z', modifiers: { ctrl: true, shift: false, alt: false, meta: false } } as never

const highlightFinish = (stage: ExportStage): string =>
  (stage.loop.document().schedule.highlightBoxes as unknown as { finish: string }[])[0]?.finish ?? ''

async function pullHighlightOutward(stage: ExportStage): Promise<void> {
  const at = highlightCorner(stage)
  const day = pxPerDay(stage) * 4
  stage.pointer('down', at.x, at.y)
  stage.pointer('move', at.x + day / 2, at.y)
  stage.pointer('move', at.x + day, at.y)
  stage.pointer('up', at.x + day, at.y)
}

describe('(d) undo after a write that changed nothing -- no undo step was added (FR-100)', () => {
  it('Ctrl+Z after an unchanged write has nothing to undo and leaves nothing unsaved', async () => {
    const stage = stageOf()
    const before = JSON.stringify(stage.loop.document().schedule)
    const at = dividerOf(stage)
    await stage.dragDivider(TASK_GROUP_TITLE_DIVIDER, at.x, at.x, at.y)
    await stage.press(UNDO)
    expect(JSON.stringify(stage.loop.document().schedule)).toBe(before)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
  })

  it('control: one Ctrl+Z after a real highlight box write undoes it', async () => {
    const stage = stageOf()
    const original = highlightFinish(stage)
    await pullHighlightOutward(stage)
    expect(highlightFinish(stage), 'premise: the pull moved the finish').not.toBe(original)
    await stage.press(UNDO)
    expect(highlightFinish(stage)).toBe(original)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
  })

  it('one Ctrl+Z after a real write and then an unchanged write undoes the real write', async () => {
    const stage = stageOf()
    const original = highlightFinish(stage)
    await pullHighlightOutward(stage)
    expect(highlightFinish(stage), 'premise: the pull moved the finish').not.toBe(original)
    const at = dividerOf(stage)
    await stage.dragDivider(TASK_GROUP_TITLE_DIVIDER, at.x, at.x, at.y)
    await stage.press(UNDO)
    expect(highlightFinish(stage), 'the unchanged write stacked an undo step of its own').toBe(original)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
  })
})
