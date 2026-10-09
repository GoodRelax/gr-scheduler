// CR-586 spec-only cases: an MSPDI merge realigns the kept shape (MG-8), and ND-1 / ND-2 and the FS rule read Task.milestone.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Task, TaskVisual } from '../../src/entity/document-model/schedule/schedule'
import { taskPlacement } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { editDocument, type DependencyCommand } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import { importDocument, type ImportRequest } from '../../src/use-case/import-document/import-document'
import { taskGroupDocument, shell } from '../unit/cr-541-stage'
import { bare, specTable, unbroken, type SpecRow, type SpecTable } from './spec-table'

const LAST_SAVED_AT = '2026-10-03T09:00:00'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const T_032: SpecTable = specTable('T-032')
const T_018: SpecTable = specTable('T-018')
const T_251: SpecTable = specTable('T-251')
const T_294: SpecTable = specTable('T-294')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

// see MG-8
const MG_8_KEEP = '見た目（色・形状）と、どの行に載っているかを保つこと（MUST）。'
const MG_8_REALIGN =
  '⭐ ただし、上書きで `Task.milestone` が変わり、保った形（`TaskVisual.shapeKind`）が `05-07-design.md` の 表 T-220 の `IV-22` に外れるときは、その形を `null` へ戻すこと（MUST）'
// see T-251
const ND_BY_TASK_MILESTONE =
  '⭐ `ND-1` と `ND-2` のどちらで書くかは、`Task.milestone` だけで決めること（MUST） —— 描いた形（`TaskVisual.shapeKind`）で決めてはならない（MUST NOT）。'
// see FR-009
const FS_WHEN_MILESTONE = 'マイルストーンが端に来る依存は、画面上で作るとき FS とすること（MUST）。'
const FS_MILESTONE_IS_TASK_MILESTONE =
  '⭐ 本段の「マイルストーン」は、`Task.milestone` が真の `Task` とすること（MUST） —— 描いた形は数えない。'
const EDGES_ARE_THE_KIND = '引き出した辺と引き入れた辺の組合せは、4 つの種別と 1 対 1 に対応する（MUST）。'

describe('CR-586 premise -- the clauses these cases are built from', () => {
  it('T-032 MG-8, the T-251 closing paragraph and FR-009 still read as quoted', () => {
    const mg8 = rowOf(T_032, 'MG-8').by['規則'] ?? ''
    expect(mg8).toContain(MG_8_KEEP)
    expect(mg8).toContain(MG_8_REALIGN)
    expect(REQUIREMENTS).toContain(ND_BY_TASK_MILESTONE)
    expect(REQUIREMENTS).toContain(FS_WHEN_MILESTONE)
    expect(REQUIREMENTS).toContain(FS_MILESTONE_IS_TASK_MILESTONE)
    expect(REQUIREMENTS).toContain(EDGES_ARE_THE_KIND)
  })
})

type Json = Record<string, any>

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

function decoded(json: Json): Document {
  const read = documentFromJson(JSON.stringify(json))
  if (!read.ok) throw new Error(`premise: the scene is GRS JSON, was ${JSON.stringify(read.faults).slice(0, 400)}`)
  return read.document
}

// see T-294
const PALETTE: readonly string[] = T_294.rows.map((row) => bare(row.by['保存する綴り'] ?? ''))

const nested = (flat: Readonly<Record<string, unknown>>): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[path[path.length - 1] as string] = structuredClone(flat[key])
  }
  return out as unknown as DocumentSettings
}

interface MergeScene {
  readonly taskUid: number
  readonly before: TaskVisual
  readonly groupId: string
  readonly merged: Document
}

// see MG-8
function mergedFlip(shapeIsMilestone: boolean, flip: boolean): MergeScene {
  const json = JSON.parse(TEMPLATE_TEXT) as Json
  const visuals = json['schedule']['taskVisuals'] as Json[]
  const visual = visuals.find(
    (one) => one['shapeKind'] !== null && (one['shapeKind'] === 'milestone') === shapeIsMilestone,
  )
  if (visual === undefined) throw new Error('premise: the template holds such a visual')
  const taskUid = visual['taskUid'] as number
  // WHY: MG-8 keeps colours; null colours would keep themselves by doing nothing, so the scene paints them.
  visual['fillColor'] = PALETTE[3]
  visual['strokeColor'] = PALETTE[4]
  const current = decoded(json)
  const task = (json['schedule']['tasks'] as Json[]).find((one) => one['uid'] === taskUid)
  if (task === undefined) throw new Error(`premise: the template holds task ${taskUid}`)
  if (flip) task['milestone'] = !(task['milestone'] === true)
  const source = decoded(json)
  const read = documentFromMspdi(mspdiFromDocument(source, LAST_SAVED_AT).text, current)
  if (!read.ok) throw new Error(`premise: the MSPDI text decodes, was ${JSON.stringify(read).slice(0, 400)}`)
  const incomingTask = read.document.schedule.tasks.find((one) => one.uid === taskUid)
  expect(incomingTask?.milestone === true, 'premise: the MSPDI carries the milestone value').toBe(
    task['milestone'] === true,
  )
  const request: ImportRequest = {
    current,
    incoming: read.document,
    format: 'mspdi',
    choice: 'merge',
    validationPassed: true,
    anotherOpenInProgress: false,
    unsavedEditsDiscardConfirmed: true,
    merge: { mapping: { kind: 'allSame' }, profileConflict: 'keepExisting', settingsConflict: 'keepExisting' },
    defaultSettings: nested(SETTINGS_DEFAULTS as Readonly<Record<string, unknown>>),
    importSessionId: 'cr-586-merge',
  }
  const outcome = importDocument(request)
  if (!outcome.ok) throw new Error(`premise: the merge is accepted, was ${JSON.stringify(outcome.refusal)}`)
  const before = current.schedule.taskVisuals.find((one) => one.taskUid === taskUid)
  const member = current.schedule.taskGroupMembers.find((one) => one.taskUid === taskUid)
  if (before === undefined || member === undefined) throw new Error('premise: the task has a visual and a row')
  return { taskUid, before, groupId: member.groupId, merged: outcome.document }
}

const visualIn = (document: Document, taskUid: number): TaskVisual | undefined =>
  document.schedule.taskVisuals.find((one) => one.taskUid === taskUid)

const taskIn = (document: Document, taskUid: number): Task | undefined =>
  document.schedule.tasks.find((one) => one.uid === taskUid)

describe('T-032 MG-8: an MSPDI merge that flips Task/Milestone on a held task (CR-586 seam S-3)', () => {
  it.each([
    ['a milestone shape whose task stops being a milestone', true],
    ['a bar shape whose task becomes a milestone', false],
  ] as const)(`${MG_8_REALIGN} -- %s: the shape goes back to null`, (_label, shapeIsMilestone) => {
    const scene = mergedFlip(shapeIsMilestone, true)
    expect(taskIn(scene.merged, scene.taskUid)?.milestone === true, 'the merged Task took the flip').toBe(
      !shapeIsMilestone,
    )
    const after = visualIn(scene.merged, scene.taskUid)
    expect(after, 'the visual is kept, not dropped').toBeDefined()
    expect(after?.shapeKind).toBeNull()
  })

  it.each([
    ['a milestone shape', true],
    ['a bar shape', false],
  ] as const)(`${MG_8_KEEP} -- after the realignment on %s, everything else of the visual and the row stay`, (_label, shapeIsMilestone) => {
    const scene = mergedFlip(shapeIsMilestone, true)
    const after = visualIn(scene.merged, scene.taskUid)
    expect({ ...after, shapeKind: scene.before.shapeKind }).toEqual(scene.before)
    const member = scene.merged.schedule.taskGroupMembers.find((one) => one.taskUid === scene.taskUid)
    expect(member?.groupId).toBe(scene.groupId)
  })

  it(`${MG_8_KEEP} -- control: a merge that leaves Task/Milestone alone keeps the shape too`, () => {
    for (const shapeIsMilestone of [true, false]) {
      const scene = mergedFlip(shapeIsMilestone, false)
      expect(visualIn(scene.merged, scene.taskUid), `shape is milestone: ${shapeIsMilestone}`).toEqual(scene.before)
    }
  })
})

const DATE_SEPARATOR = ' - '

// see ND-2
function premiseNd2Separator(): void {
  expect(rowOf(T_251, 'ND-2').by['書き方'] ?? '').toContain('半角空白 1 つ、`-`、半角空白 1 つ')
}

interface LabelScene {
  readonly milestone: boolean
  readonly shapeKind: TaskVisual['shapeKind']
}

// see FR-002, T-251, S-232
function labelDatesOf(scene: LabelScene): string {
  const document = taskGroupDocument([{ id: 'r1', parentId: null }], { planDatesVisible: true }, {
    taskVisuals: [
      {
        taskUid: 1,
        shapeKind: scene.shapeKind,
        milestoneGlyph: null,
        fillColor: null,
        strokeColor: null,
        strokeWidthPx: null,
      },
    ],
  })
  document['schedule']['tasks'][0]['milestone'] = scene.milestone
  const bench = shell(document)
  try {
    const layout = bench.loop.current()?.layout
    if (layout === undefined) throw new Error('premise: a frame has run')
    const placed = taskPlacement(layout, 1)
    if (placed === null) throw new Error('premise: the task is drawn')
    return placed.labelDates
  } finally {
    bench.restore()
  }
}

describe('T-251 ND-1 / ND-2 read Task.milestone only (FR-002, CR-586 E-01)', () => {
  it('premise: ND-2 joins its two dates with a half-width space, a hyphen and a half-width space', () => {
    premiseNd2Separator()
  })

  it(`${ND_BY_TASK_MILESTONE} -- drawn as a milestone, Task.milestone false: ND-2 (two dates)`, () => {
    const dates = labelDatesOf({ milestone: false, shapeKind: 'milestone' })
    expect(dates).toContain(DATE_SEPARATOR)
    expect(dates).toBe(labelDatesOf({ milestone: false, shapeKind: null }))
  })

  it(`${ND_BY_TASK_MILESTONE} -- drawn as a bar, Task.milestone true: ND-1 (one date)`, () => {
    const dates = labelDatesOf({ milestone: true, shapeKind: 'rectangle' })
    expect(dates.trim()).not.toBe('')
    expect(dates).not.toContain(DATE_SEPARATOR)
    expect(dates).toBe(labelDatesOf({ milestone: true, shapeKind: null }))
  })
})

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

// see T-018
const linkTypeOf = (id: string): number => Number(bare(rowOf(T_018, id).by['`linkType`'] ?? ''))

// see FR-009, T-018
function createdLinkType(milestone: boolean, shapeKind: TaskVisual['shapeKind']): number | string {
  const json = taskGroupDocument([
    { id: 'r1', parentId: null },
    { id: 'r2', parentId: null },
  ], {}, {
    taskVisuals: [
      { taskUid: 1, shapeKind, milestoneGlyph: null, fillColor: null, strokeColor: null, strokeWidthPx: null },
    ],
  })
  json['schedule']['tasks'][0]['milestone'] = milestone
  json['schedule']['tasks'][1]['start'] = '2026-04-20T08:00:00'
  json['schedule']['tasks'][1]['finish'] = '2026-04-24T17:00:00'
  const command: DependencyCommand = {
    kind: 'createDependency',
    predecessorUid: 1,
    successorUid: 2,
    predecessorEdge: 'finish',
    successorEdge: 'finish',
  }
  const result = editDocument(json as unknown as Document, command, LIMITS, 'row')
  if (!result.ok) return `refused: ${JSON.stringify(result.refusals)}`
  const link = taskIn(result.document, 2)?.dependencies.find((one) => one.predecessorUid === 1)
  return link?.linkType ?? 'no dependency was made'
}

describe('FR-009 FS rule reads Task.milestone only (CR-586 E-02)', () => {
  it('premise: T-018 names DP-1 FS and DP-3 FF', () => {
    expect(rowOf(T_018, 'DP-1').by['名'] ?? '').toContain('FS')
    expect(rowOf(T_018, 'DP-3').by['名'] ?? '').toContain('FF')
  })

  it(`${FS_MILESTONE_IS_TASK_MILESTONE} -- a Task.milestone true end drawn as a bar makes FS from finish-to-finish edges`, () => {
    expect(createdLinkType(true, 'rectangle')).toBe(linkTypeOf('DP-1'))
  })

  it(`${FS_MILESTONE_IS_TASK_MILESTONE} -- an end drawn as a milestone whose Task.milestone is false keeps the edges' kind (FF)`, () => {
    expect(createdLinkType(false, 'milestone')).toBe(linkTypeOf('DP-3'))
  })

  it(`${EDGES_ARE_THE_KIND} -- control: plain bars keep the edges' kind (FF)`, () => {
    expect(createdLinkType(false, null)).toBe(linkTypeOf('DP-3'))
  })
})
