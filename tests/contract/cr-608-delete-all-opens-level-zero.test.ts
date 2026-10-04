// CR-608 tests 9-11: delete-all opens level zero, and the one row table T-050 makes is temporarilyExpanded.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { DocumentStamp } from '../../src/entity/document-model/document-stamp/document-stamp'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import type { Schedule, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { frameLoop, type FrameLoop, type FrameValues } from '../../src/framework/single-html-shell/frame-loop'
import {
  planDocumentChange,
  planDocumentReplacement,
  type ReplacementCall,
  type WriteMoment,
} from '../../src/use-case/apply-document-change/document-change-plan'
import type { ChangeStep } from '../../src/use-case/apply-document-change/apply-document-change'
import { surfaceOf, wire } from '../fixtures/fake-browser'
import { NO_MODS, pointerOf, rowDocument, SCREEN, type RowSeed } from '../unit/cr-541-stage'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  confirmation: { answer: string; text: { ja: string } }[]
}

const HF_20_OPENS = '消すときは、段 0 の畳み（`_assets/tbl-settings.md` の `S-418`）を開くこと（MUST）'
const HF_20_ONE_STEP = '取り消し 1 回で、消す前の行と畳みへ戻る'
const HF_20_NO_VIEW_WRITE = '倍率と表示位置は書かない'
const FR_032_VALUE = 'その行の `treeState` も `temporarilyExpanded` とすること（MUST）'
const FR_032_ANY_ROAD = '行を 0 にしたのがどの操作でも同じ値で立てる'
const OP_10_FIT = '`FR-055` の全体表示が選ぶ倍率と表示位置にすること（MUST）'
const CD_2_NULL = 'その行を指す表示位置（同 `S-78`）は消さず `null` へ戻す'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')
const DELETE_EVERY_ROW = rowOf('T-109', 'IC-106').id
const UNDO = rowOf('T-109', 'IC-5').id
const REDO = rowOf('T-109', 'IC-6').id
const FIT = rowOf('T-109', 'IC-10').id
const APP_HEADER = bare(rowOf('T-109', 'IC-5').cells[0] ?? '')

const YES = (WORDS.confirmation.find((one) => one.answer === 'proceed')?.text.ja ?? '').slice(0, 1).toUpperCase()

describe('CR-608 -- the manuscript these cases are driven by', () => {
  it.each([HF_20_OPENS, HF_20_ONE_STEP, HF_20_NO_VIEW_WRITE, FR_032_VALUE, FR_032_ANY_ROAD, OP_10_FIT, CD_2_NULL])(
    '%s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )

  it('the entrances are IC-106 on the Row Title Panel and IC-5 / IC-6 / IC-10 in the App Header', () => {
    expect(ROW_TITLE_PANEL).toBe('Row Title Panel')
    expect([DELETE_EVERY_ROW, UNDO, REDO, FIT, APP_HEADER]).toEqual(['IC-106', 'IC-5', 'IC-6', 'IC-10', 'App Header'])
    expect(YES).not.toBe('')
  })
})

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const partOn = (part: string, entry: string | null): ScreenPart =>
  ({ part, entry, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null }) as unknown as ScreenPart

interface Bench {
  readonly loop: FrameLoop
  press(part: string, entry: string): void
  key(key: string): void
  groups(): TaskGroup[]
  levelZero(): unknown
  drawn(): string[]
  frame(): FrameValues | null
}

function bench(document: Record<string, unknown>): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': SCREEN.appHeaderHeight })
  const drawn = surfaceOf(built)
  let aimed: ScreenPart | null = null
  const surface = {
    showScreenView: (view: never) => drawn.showScreenView(view),
    readDialogueInput: () => drawn.readDialogueInput(),
    readFieldCommit: () => drawn.readFieldCommit(),
    readFieldEditNotices: () =>
      (drawn as unknown as { readFieldEditNotices?: () => unknown[] }).readFieldEditNotices?.() ?? [],
    readScreenPartAt: () => aimed,
  } as unknown as ScreenSurface
  const loop = frameLoop({ showSvg: () => undefined } as never, document as never, SCREEN, { surface, language: 'ja' })
  drain()
  const send = (input: Parameters<FrameLoop['receiveInput']>[0]): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    press: (part, entry) => {
      aimed = partOn(part, entry)
      send(pointerOf('down', 80, 120))
      send(pointerOf('up', 80, 120))
      aimed = null
    },
    key: (key) => send({ kind: 'key', key, modifiers: { ...NO_MODS } }),
    groups: () => loop.document().schedule.taskGroups as TaskGroup[],
    levelZero: () => (loop.document().documentSettings as unknown as Record<string, unknown>)['levelZeroTreeState'],
    drawn: () => (loop.current()?.layout.rows ?? []).map((one) => one.groupId),
    frame: () => loop.current(),
  }
}

function deleteEveryRow(built: Bench): void {
  built.press(ROW_TITLE_PANEL, DELETE_EVERY_ROW)
  built.key(YES)
}

const ROWS: readonly RowSeed[] = [
  { id: 'd6080000-0000-4000-8000-000000000001', parentId: null, treeState: 'expanded' },
  { id: 'd6080000-0000-4000-8000-000000000002', parentId: 'd6080000-0000-4000-8000-000000000001', treeState: 'collapsed' },
  { id: 'd6080000-0000-4000-8000-000000000003', parentId: null },
]

const statesOf = (groups: readonly TaskGroup[]) => groups.map((one) => ({ id: one.id, treeState: one.treeState }))

describe(`CR-608 test 10 -- ${HF_20_OPENS}`, () => {
  it('level zero opens, the one row stands temporarilyExpanded and is drawn; one undo gives back the rows and the fold', () => {
    const built = bench(rowDocument(ROWS, { levelZeroTreeState: 'collapsed' }))
    const before = statesOf(built.groups())
    expect(built.drawn(), 'premise: TD-1 draws no row under a folded level zero').toEqual([])

    deleteEveryRow(built)

    expect(built.loop.document().schedule.tasks, 'premise: the answer deleted every task').toEqual([])
    expect(built.levelZero(), HF_20_OPENS).toBe('auto')
    const rows = built.groups()
    expect(rows, 'table T-050: one row is made').toHaveLength(1)
    expect(rows[0]?.treeState, FR_032_VALUE).toBe('temporarilyExpanded')
    expect(built.drawn(), 'the row left behind can be read').toEqual([rows[0]?.id])

    built.press(APP_HEADER, UNDO)

    expect(statesOf(built.groups()), HF_20_ONE_STEP).toEqual(before)
    expect(built.levelZero(), HF_20_ONE_STEP).toBe('collapsed')
  })

  it('control: with level zero open, delete-all leaves it open and still makes the one row temporarilyExpanded', () => {
    const built = bench(rowDocument(ROWS, { levelZeroTreeState: 'auto' }))
    deleteEveryRow(built)
    expect(built.levelZero()).toBe('auto')
    expect(built.groups().map((one) => one.treeState), FR_032_VALUE).toEqual(['temporarilyExpanded'])
  })

  it(`redo after the undo lands on the same step -- ${FR_032_ANY_ROAD}`, () => {
    const built = bench(rowDocument(ROWS, { levelZeroTreeState: 'collapsed' }))
    deleteEveryRow(built)
    built.press(APP_HEADER, UNDO)
    expect(built.groups().length, 'premise: the undo gave the rows back').toBe(ROWS.length)
    built.press(APP_HEADER, REDO)
    expect(built.groups().map((one) => one.treeState), FR_032_VALUE).toEqual(['temporarilyExpanded'])
    expect(built.levelZero(), HF_20_OPENS).toBe('auto')
  })
})

function pictureOf(frame: FrameValues | null) {
  if (frame === null) throw new Error('no frame was drawn')
  return {
    pxPerDay: frame.layout.pxPerDay,
    originX: frame.layout.originX,
    rows: frame.layout.rows.map((one) => ({ groupId: one.groupId, y: one.y, height: one.height })),
  }
}

describe(`CR-608 test 9 (regression) -- ${CD_2_NULL}; OP-10: ${OP_10_FIT}`, () => {
  it('the picture after delete-all is the picture IC-10 (fit) gives the same document, and delete-all writes no zoom', () => {
    const control = bench(rowDocument(ROWS, { zoomY: 1, zoomX: 3 }))
    const stored = pictureOf(control.frame())
    control.press(APP_HEADER, FIT)
    expect(pictureOf(control.frame()), 'premise: the stored view is not the fit view').not.toEqual(stored)

    const built = bench(rowDocument(ROWS, { zoomY: 1, zoomX: 3 }))
    const zoomBefore = built.loop.document().documentSettings.zoomY
    deleteEveryRow(built)
    expect(built.loop.document().documentSettings.zoomY, HF_20_NO_VIEW_WRITE).toBe(zoomBefore)
    const afterDelete = pictureOf(built.frame())
    expect(afterDelete.rows.map((one) => one.groupId), 'the one row is the top of the tree').toEqual(
      built.groups().map((one) => one.id),
    )

    built.press(APP_HEADER, FIT)
    expect(afterDelete, OP_10_FIT).toEqual(pictureOf(built.frame()))
  })
})

const DEFAULT_SETTINGS: Record<string, unknown> = (() => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out
})()

const STAMP: DocumentStamp = {
  scheduleUpdatedUtc: '2026-10-01T00:00:00Z',
  lastEditedBy: 'user',
  settingsUpdatedUtc: '2026-10-01T00:00:00Z',
  fileSavedUtc: null,
}

const groupOf = (id: string, treeState: TaskGroup['treeState']): TaskGroup =>
  ({
    id,
    parentId: null,
    label: 'the only row',
    derivedFromTaskUid: null,
    order: 0,
    treeState,
    editGroup: null,
    color: null,
    minHeight: null,
  }) as TaskGroup

const documentOf = (taskGroups: readonly TaskGroup[]): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: { title: 'A', statusDate: null, themeHue: 214, startDate: null },
      calendars: [],
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups,
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    } as unknown as Schedule,
    documentSettings: { ...DEFAULT_SETTINGS } as unknown as DocumentSettings,
    documentStamp: STAMP,
    changeLog: [],
  }) as unknown as Document

const EMPTY_OF_ROWS = documentOf([])
const ONE_ROW = documentOf([groupOf('g1', 'auto')])

const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, deliveringNotices: false }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }
const ROW_WORD = (() => {
  const found = displayWords.defaultNames.find((one) => one.use === 'row')
  if (found === undefined) throw new Error('the dictionary has no defaultNames entry for row')
  return found.text.en
})()

const theOneRow = (document: Document): TaskGroup => {
  const rows = document.schedule.taskGroups
  expect(rows, 'table T-050: one row').toHaveLength(1)
  const row = rows[0]
  if (row === undefined) throw new Error('unreachable')
  expect(row.id, 'premise: the row is the one the road made').toBe('fresh-row')
  return row
}

function replaced(call: ReplacementCall, history: EditHistory<ChangeStep> = EMPTY_HISTORY): Document {
  const plan = planDocumentReplacement({
    defaultRowName: ROW_WORD,
    newGroupId: 'fresh-row',
    held: { document: ONE_ROW, history },
    readStamp: null,
    moment: CALM,
    call,
  })
  expect(plan.ok, 'the road was not refused').toBe(true)
  if (!plan.ok) throw new Error('refused')
  return plan.next.document
}

const EMPTY_STEP = [{ step: { document: EMPTY_OF_ROWS, commands: ['setProjectTitle'] }, sizeBytes: 1 }] as never

describe(`CR-608 test 11 -- ${FR_032_VALUE} -- ${FR_032_ANY_ROAD}`, () => {
  it('deleting the last row (CD-2) makes the one row temporarilyExpanded', () => {
    const plan = planDocumentChange({
      defaultRowName: ROW_WORD,
      document: ONE_ROW,
      readStamp: ONE_ROW.documentStamp,
      commands: [{ kind: 'deleteTaskGroup', groupId: 'g1', newGroupId: 'fresh-row' }],
      moment: CALM,
      history: EMPTY_HISTORY,
      historyLimits: { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 },
      settingsLimits: { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 },
      editedBy: 'user',
      updatedUtc: '2026-10-01T01:00:00Z',
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(theOneRow(plan.document).treeState, FR_032_VALUE).toBe('temporarilyExpanded')
  })

  it('RD-2: a redo that lands on a document with no row', () => {
    const document = replaced({ row: 'RD-2' }, { done: [], undone: EMPTY_STEP })
    expect(theOneRow(document).treeState, FR_032_ANY_ROAD).toBe('temporarilyExpanded')
  })

  it('RD-1: an undo that lands on a document with no row', () => {
    const document = replaced({ row: 'RD-1' }, { done: EMPTY_STEP, undone: [] })
    expect(theOneRow(document).treeState, FR_032_ANY_ROAD).toBe('temporarilyExpanded')
  })

  it('RD-4: replacing the document with one that holds no row (OP-3)', () => {
    const document = replaced({
      row: 'RD-4',
      importing: {
        incoming: EMPTY_OF_ROWS,
        format: 'grsJson',
        choice: 'replace',
        validationPassed: true,
        anotherOpenInProgress: false,
        unsavedEditsDiscardConfirmed: true,
        merge: null,
        defaultSettings: DEFAULT_SETTINGS as unknown as DocumentSettings,
        importSessionId: 'cr-608-import',
      },
    })
    expect(theOneRow(document).treeState, FR_032_ANY_ROAD).toBe('temporarilyExpanded')
  })

  it.each(['RD-6', 'RD-7'] as const)('%s: a document brought with no row', (row) => {
    const document = replaced(
      row === 'RD-6'
        ? { row, document: EMPTY_OF_ROWS }
        : { row, document: EMPTY_OF_ROWS, editedBy: 'user', updatedUtc: '2026-10-03T00:00:00Z' },
    )
    expect(theOneRow(document).treeState, FR_032_ANY_ROAD).toBe('temporarilyExpanded')
  })
})
