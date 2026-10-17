// CR-777 spec-only tests: the AnnotationAnchor value of CM-46 / CM-50, the rewrite on CM-7 / CM-53, and the merge mapping.

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { editDocument, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import { importDocument, type ImportRequest } from '../../src/use-case/import-document/import-document'
import { NO_MODIFIERS, restoreAnimationFrames } from '../unit/cr-646-stage'
import {
  BAR_UID,
  COMMENT_ID,
  HIGHLIGHT_ID,
  LIMITS,
  MILESTONE_UID,
  OTHER_COMMENT_ID,
  SECOND_BAR_UID,
  april,
  boxOfTask,
  commentRow,
  documentWith,
  frameOf,
  groupOf,
  highlightRow,
  stage,
} from './cr-777-stage'

afterEach(restoreAnimationFrames)

const DELETE_REWRITES = 'じ命令の中で、その対象に吸着した線先を ① の自由点に書き換えること（MUST）'
const MERGE_MAPS = 'AT-164` を、合流で振り直したタスクの `UID` へ写すこと（MUST）'

const FREE = { date: april(15, '12:00:00'), taskGroupId: groupOf(3) }
const TASK_TARGET = { taskUid: BAR_UID, taskFigure: 'plannedBar', snapPoint: 'topMiddle' } as const

type Anchor = Extract<DocumentCommand, { kind: 'createCommentBox' }>['anchor']

const base = (): Document => documentWith([commentRow({ id: OTHER_COMMENT_ID })], [highlightRow()])

const create = (anchor: Anchor, document: Document = base()) =>
  editDocument(document, { kind: 'createCommentBox', commentBoxId: COMMENT_ID, anchor }, LIMITS, 'row')

const reanchor = (anchor: Anchor, document: Document = base()) =>
  editDocument(document, { kind: 'setCommentBoxAnchor', commentBoxId: OTHER_COMMENT_ID, anchor }, LIMITS, 'row')

const rowOf = (document: Document, id: string) => document.schedule.commentBoxes.find((one) => one.id === id)!

describe('CM-46 / CM-50: the value AnnotationAnchor writes five more columns, a left-out key as null', () => {
  it('a free anchor with only date and task group writes the five new columns as null', () => {
    const made = create(FREE)
    if (!made.ok) throw new Error(`premise: accepted, was ${JSON.stringify(made.refusals)}`)
    const row = rowOf(made.document, COMMENT_ID)
    expect([row.anchorBandFraction, row.anchorTaskUid, row.anchorTaskFigure, row.anchorHighlightBoxId, row.anchorSnapPoint]).toEqual([
      null,
      null,
      null,
      null,
      null,
    ])
  })

  it('a snapped anchor to a task writes the target, the figure, the point and the fraction', () => {
    const made = create({ ...FREE, bandFraction: 0.4, ...TASK_TARGET })
    if (!made.ok) throw new Error(`premise: accepted, was ${JSON.stringify(made.refusals)}`)
    const row = rowOf(made.document, COMMENT_ID)
    expect([row.anchorBandFraction, row.anchorTaskUid, row.anchorTaskFigure, row.anchorSnapPoint, row.anchorHighlightBoxId]).toEqual([
      0.4,
      BAR_UID,
      'plannedBar',
      'topMiddle',
      null,
    ])
  })

  it('a snapped anchor to a highlight box writes its id and the point and no task', () => {
    const made = reanchor({ ...FREE, highlightBoxId: HIGHLIGHT_ID, snapPoint: 'leftMiddle' })
    if (!made.ok) throw new Error(`premise: accepted, was ${JSON.stringify(made.refusals)}`)
    const row = rowOf(made.document, OTHER_COMMENT_ID)
    expect([row.anchorHighlightBoxId, row.anchorSnapPoint, row.anchorTaskUid, row.anchorTaskFigure]).toEqual([HIGHLIGHT_ID, 'leftMiddle', null, null])
  })

  it('a later free anchor clears the target a snapped box held', () => {
    const snapped = reanchor({ ...FREE, ...TASK_TARGET })
    if (!snapped.ok) throw new Error('premise: the snap is accepted')
    const freed = reanchor(FREE, snapped.document)
    if (!freed.ok) throw new Error('premise: the free anchor is accepted')
    const row = rowOf(freed.document, OTHER_COMMENT_ID)
    expect([row.anchorTaskUid, row.anchorTaskFigure, row.anchorSnapPoint]).toEqual([null, null, null])
  })
})

describe('CM-46 / CM-50: the anchors the commands refuse', () => {
  const REFUSED: readonly (readonly [string, Anchor])[] = [
    ['a band fraction above 1', { ...FREE, bandFraction: 1.5 }],
    ['a band fraction below 0', { ...FREE, bandFraction: -0.1 }],
    ['a task uid the document does not hold', { ...FREE, ...TASK_TARGET, taskUid: 999 }],
    ['a highlight box id the document does not hold', { ...FREE, highlightBoxId: '77700000-0000-4000-8000-0000000000ff', snapPoint: 'topMiddle' }],
    ['both targets at once', { ...FREE, ...TASK_TARGET, highlightBoxId: HIGHLIGHT_ID }],
    ['a task without a figure', { ...FREE, taskUid: BAR_UID, snapPoint: 'topMiddle' }],
    ['a figure without a task', { ...FREE, taskFigure: 'plannedBar', snapPoint: 'topMiddle' }],
    ['a snap point without a target', { ...FREE, snapPoint: 'topMiddle' }],
    ['a target without a snap point', { ...FREE, taskUid: BAR_UID, taskFigure: 'plannedBar' }],
  ]

  it.each(REFUSED)('createCommentBox refuses %s', (_label, anchor) => {
    expect(create(anchor).ok).toBe(false)
  })

  it.each(REFUSED)('setCommentBoxAnchor refuses %s and leaves the document as it was', (_label, anchor) => {
    const before = base()
    const result = reanchor(anchor, before)
    expect(result.ok).toBe(false)
    expect(before.schedule.commentBoxes).toEqual(base().schedule.commentBoxes)
  })

  it('a fraction of exactly 0 and exactly 1 is accepted', () => {
    expect(create({ ...FREE, bandFraction: 0 }).ok).toBe(true)
    expect(create({ ...FREE, bandFraction: 1 }).ok).toBe(true)
  })
})

describe(`FR-019: ${DELETE_REWRITES}`, () => {
  const snappedTo = (part: Record<string, unknown>): Document =>
    documentWith(
      [
        commentRow({
          anchorDate: april(28, '00:00:00'),
          anchorTaskGroupId: groupOf(3),
          anchorBandFraction: 0.4,
          ...part,
        }),
        commentRow({ id: OTHER_COMMENT_ID, anchorTaskUid: SECOND_BAR_UID, anchorTaskFigure: 'plannedBar', anchorSnapPoint: 'topMiddle', anchorTaskGroupId: groupOf(SECOND_BAR_UID) }),
      ],
      [highlightRow()],
    )

  const columnsOf = (document: Document, id: string) => {
    const row = rowOf(document, id)
    return {
      date: String(row.anchorDate).slice(0, 16),
      group: row.anchorTaskGroupId,
      fraction: row.anchorBandFraction,
      target: [row.anchorTaskUid, row.anchorTaskFigure, row.anchorHighlightBoxId, row.anchorSnapPoint],
    }
  }

  it('deleting a task turns the tip snapped to its planned bar left corner into a free point at the bar start', () => {
    const document = snappedTo({ anchorTaskGroupId: groupOf(BAR_UID), anchorTaskUid: BAR_UID, anchorTaskFigure: 'plannedBar', anchorSnapPoint: 'topLeftCorner' })
    const result = editDocument(document, { kind: 'deleteTask', taskUid: BAR_UID }, LIMITS, 'row')
    if (!result.ok) throw new Error(`premise: accepted, was ${JSON.stringify(result.refusals)}`)
    expect(columnsOf(result.document, COMMENT_ID)).toEqual({
      date: '2026-04-06T00:00',
      group: groupOf(BAR_UID),
      fraction: 0.4,
      target: [null, null, null, null],
    })
  })

  it('the actual bar left corner becomes the actual start instant', () => {
    const document = snappedTo({ anchorTaskGroupId: groupOf(BAR_UID), anchorTaskUid: BAR_UID, anchorTaskFigure: 'actualBar', anchorSnapPoint: 'bottomLeftCorner' })
    const result = editDocument(document, { kind: 'deleteTask', taskUid: BAR_UID }, LIMITS, 'row')
    if (!result.ok) throw new Error('premise: accepted')
    expect(columnsOf(result.document, COMMENT_ID).date).toBe('2026-04-07T00:00')
    expect(columnsOf(result.document, COMMENT_ID).target).toEqual([null, null, null, null])
  })

  it('a tip snapped to another task is not touched', () => {
    const document = snappedTo({ anchorTaskGroupId: groupOf(BAR_UID), anchorTaskUid: BAR_UID, anchorTaskFigure: 'plannedBar', anchorSnapPoint: 'topLeftCorner' })
    const result = editDocument(document, { kind: 'deleteTask', taskUid: BAR_UID }, LIMITS, 'row')
    if (!result.ok) throw new Error('premise: accepted')
    expect(rowOf(result.document, OTHER_COMMENT_ID)).toEqual(rowOf(document, OTHER_COMMENT_ID))
  })

  it('deleting a highlight box turns a top-row tip into a free point at its top task group, fraction 0', () => {
    const document = snappedTo({ anchorHighlightBoxId: HIGHLIGHT_ID, anchorSnapPoint: 'topLeftCorner' })
    const result = editDocument(document, { kind: 'deleteHighlightBox', highlightBoxId: HIGHLIGHT_ID }, LIMITS, 'row')
    if (!result.ok) throw new Error(`premise: accepted, was ${JSON.stringify(result.refusals)}`)
    expect(columnsOf(result.document, COMMENT_ID)).toEqual({
      date: '2026-04-08T00:00',
      group: groupOf(MILESTONE_UID),
      fraction: 0,
      target: [null, null, null, null],
    })
  })

  it('a bottom-row tip goes to the bottom task group with fraction 1', () => {
    const document = snappedTo({ anchorHighlightBoxId: HIGHLIGHT_ID, anchorSnapPoint: 'bottomLeftCorner' })
    const result = editDocument(document, { kind: 'deleteHighlightBox', highlightBoxId: HIGHLIGHT_ID }, LIMITS, 'row')
    if (!result.ok) throw new Error('premise: accepted')
    expect(columnsOf(result.document, COMMENT_ID)).toEqual({
      date: '2026-04-08T00:00',
      group: groupOf(SECOND_BAR_UID),
      fraction: 1,
      target: [null, null, null, null],
    })
  })

  it('one undo of the deletion by the screen brings back the target and the snapped tip together', () => {
    const document = documentWith(
      [commentRow({ anchorTaskGroupId: groupOf(SECOND_BAR_UID), anchorTaskUid: SECOND_BAR_UID, anchorTaskFigure: 'plannedBar', anchorSnapPoint: 'topLeftCorner' })],
      [],
    )
    const built = stage(document)
    const before = structuredClone(built.loop.document())
    const box = boxOfTask(built.loop, SECOND_BAR_UID, 'plan')
    built.click((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2)
    built.send({ kind: 'key', key: 'Delete', modifiers: { ...NO_MODIFIERS } })
    const afterDelete = built.loop.document()
    expect(afterDelete.schedule.tasks.some((one) => one.uid === SECOND_BAR_UID), 'premise: the task was deleted').toBe(false)
    expect(afterDelete.schedule.commentBoxes[0]!.anchorTaskUid, 'the tip still names the deleted task').toBeNull()
    built.send({ kind: 'key', key: 'Z', modifiers: { ...NO_MODIFIERS, ctrl: true } })
    expect(built.loop.document().schedule).toEqual(before.schedule)
  })

  it('one undo of a highlight box deletion by the screen brings back the box and the snapped tip together', () => {
    const document = documentWith(
      [commentRow({ anchorTaskGroupId: groupOf(MILESTONE_UID), anchorHighlightBoxId: HIGHLIGHT_ID, anchorSnapPoint: 'topLeftCorner' })],
      [highlightRow()],
    )
    const built = stage(document)
    const before = structuredClone(built.loop.document())
    const box = frameOf(built.loop).geometry.highlightBoxes.find((one) => one.id === HIGHLIGHT_ID)!.box
    built.click(box.x + box.width / 4, box.y)
    built.send({ kind: 'key', key: 'Delete', modifiers: { ...NO_MODIFIERS } })
    const afterDelete = built.loop.document()
    expect(afterDelete.schedule.highlightBoxes, 'premise: the box was deleted').toHaveLength(0)
    expect(afterDelete.schedule.commentBoxes[0]!.anchorHighlightBoxId, 'the tip still names the deleted box').toBeNull()
    built.send({ kind: 'key', key: 'Z', modifiers: { ...NO_MODIFIERS, ctrl: true } })
    expect(built.loop.document().schedule).toEqual(before.schedule)
  })
})

describe(`FR-019: ${DELETE_REWRITES} -- the task group of the released tip`, () => {
  const snapped = (part: Record<string, unknown>, memberOf: readonly number[] = []): Document => {
    const document = documentWith([
      commentRow({
        anchorDate: april(28, '00:00:00'),
        anchorBandFraction: 0.4,
        anchorTaskUid: BAR_UID,
        anchorTaskFigure: 'plannedBar',
        anchorSnapPoint: 'topLeftCorner',
        ...part,
      }),
    ])
    for (const group of memberOf) {
      ;(document.schedule.taskGroupMembers as { taskUid: number; taskGroupId: string }[]).push({
        taskUid: BAR_UID,
        taskGroupId: groupOf(group),
      })
    }
    return document
  }

  const groupAfter = (document: Document, command: DocumentCommand): unknown => {
    const result = editDocument(document, command, LIMITS, 'row')
    if (!result.ok) throw new Error(`premise: accepted, was ${JSON.stringify(result.refusals)}`)
    return rowOf(result.document, COMMENT_ID).anchorTaskGroupId
  }

  it('a stale stored band the task is not a member of is replaced by the task band', () => {
    const document = snapped({ anchorTaskGroupId: groupOf(3) })
    expect(groupAfter(document, { kind: 'deleteTask', taskUid: BAR_UID })).toBe(groupOf(BAR_UID))
  })

  it('a stored band the task is still a member of is kept', () => {
    const document = snapped({ anchorTaskGroupId: groupOf(3) }, [3])
    expect(groupAfter(document, { kind: 'deleteTask', taskUid: BAR_UID })).toBe(groupOf(3))
  })

  it('deleting a task group frees a tip whose own band survives, and the tip keeps its box', () => {
    const document = snapped({ anchorTaskGroupId: groupOf(3) }, [3])
    const result = editDocument(document, { kind: 'deleteTaskGroup', taskGroupId: groupOf(BAR_UID), newTaskGroupId: 'unused' }, LIMITS, 'row')
    if (!result.ok) throw new Error(`premise: accepted, was ${JSON.stringify(result.refusals)}`)
    expect(result.document.schedule.tasks.some((one) => one.uid === BAR_UID), 'premise: the task went with its group').toBe(false)
    const row = rowOf(result.document, COMMENT_ID)
    expect([row.anchorTaskUid, row.anchorTaskFigure, row.anchorHighlightBoxId, row.anchorSnapPoint]).toEqual([null, null, null, null])
    expect(row.anchorTaskGroupId).toBe(groupOf(3))
    expect(row.anchorBandFraction).toBe(0.4)
    expect(String(row.anchorDate).slice(0, 16)).toBe('2026-04-06T00:00')
  })

  it('a tip whose own band is the deleted task group goes with it', () => {
    const document = snapped({ anchorTaskGroupId: groupOf(BAR_UID) })
    const result = editDocument(document, { kind: 'deleteTaskGroup', taskGroupId: groupOf(BAR_UID), newTaskGroupId: 'unused' }, LIMITS, 'row')
    if (!result.ok) throw new Error(`premise: accepted, was ${JSON.stringify(result.refusals)}`)
    expect(result.document.schedule.commentBoxes.some((one) => one.id === COMMENT_ID)).toBe(false)
  })

  it('a tip snapped to a highlight box is freed when the box goes with a deleted task group', () => {
    const document = documentWith(
      [commentRow({ anchorTaskGroupId: groupOf(3), anchorHighlightBoxId: HIGHLIGHT_ID, anchorSnapPoint: 'topLeftCorner' })],
      [highlightRow({ topTaskGroupId: groupOf(BAR_UID), bottomTaskGroupId: groupOf(BAR_UID) })],
    )
    const result = editDocument(document, { kind: 'deleteTaskGroup', taskGroupId: groupOf(BAR_UID), newTaskGroupId: 'unused' }, LIMITS, 'row')
    if (!result.ok) throw new Error(`premise: accepted, was ${JSON.stringify(result.refusals)}`)
    expect(result.document.schedule.highlightBoxes, 'premise: the box went with its group').toHaveLength(0)
    const row = rowOf(result.document, COMMENT_ID)
    expect([row.anchorHighlightBoxId, row.anchorSnapPoint]).toEqual([null, null])
  })
})

describe(`FR-019: ${MERGE_MAPS}`, () => {
  const DEFAULTS: Record<string, unknown> = (() => {
    const out: Record<string, any> = {}
    for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
      const parts = key.split('.')
      let at = out
      for (const part of parts.slice(0, -1)) at = at[part] ??= {}
      at[parts[parts.length - 1]!] = structuredClone(value)
    }
    return out
  })()

  const requestOf = (incoming: Document, mapping: 'allSame' | 'allDifferent'): ImportRequest => ({
    current: documentWith([]),
    incoming,
    format: 'grsJson',
    choice: 'merge',
    validationPassed: true,
    anotherOpenInProgress: false,
    unsavedEditsDiscardConfirmed: true,
    merge: { mapping: { kind: mapping }, profileConflict: 'keepExisting', settingsConflict: 'keepExisting' },
    defaultSettings: structuredClone(DEFAULTS) as never,
    importSessionId: 'cr-777-session',
  })

  const incomingWithSnap = (): Document =>
    documentWith([commentRow({ id: OTHER_COMMENT_ID, anchorTaskGroupId: groupOf(BAR_UID), anchorTaskUid: BAR_UID, anchorTaskFigure: 'plannedBar', anchorSnapPoint: 'topMiddle' })])

  it('a task added as a different task carries the tip to its new UID', () => {
    const outcome = importDocument(requestOf(incomingWithSnap(), 'allDifferent'))
    if (!outcome.ok) throw new Error(`premise: accepted, was ${JSON.stringify(outcome.refusal)}`)
    const renumbered = outcome.report.addedAsDifferent.find((one) => one.incomingTaskUid === BAR_UID)
    if (renumbered === undefined) throw new Error('premise: the incoming task was renumbered')
    expect(renumbered.taskUid).not.toBe(BAR_UID)
    const row = rowOf(outcome.document, OTHER_COMMENT_ID)
    expect(row.anchorTaskUid).toBe(renumbered.taskUid)
    expect([row.anchorTaskFigure, row.anchorSnapPoint]).toEqual(['plannedBar', 'topMiddle'])
  })

  it('a tip that names a task the merge did not take becomes a free point, kept in the document', () => {
    const incoming = documentWith([
      commentRow({
        id: OTHER_COMMENT_ID,
        anchorTaskGroupId: groupOf(BAR_UID),
        anchorTaskUid: 999,
        anchorTaskFigure: 'plannedBar',
        anchorSnapPoint: 'topMiddle',
      }),
    ])
    const outcome = importDocument(requestOf(incoming, 'allDifferent'))
    if (!outcome.ok) throw new Error(`premise: accepted, was ${JSON.stringify(outcome.refusal)}`)
    const row = rowOf(outcome.document, OTHER_COMMENT_ID)
    expect([row.anchorTaskUid, row.anchorTaskFigure, row.anchorHighlightBoxId, row.anchorSnapPoint]).toEqual([null, null, null, null])
    expect(row.anchorTaskGroupId).toBe(groupOf(BAR_UID))
    expect(row.anchorDate).toBe(april(15, '12:00:00'))
  })

  it('a task taken as the same task keeps the UID the tip names', () => {
    const outcome = importDocument(requestOf(incomingWithSnap(), 'allSame'))
    if (!outcome.ok) throw new Error(`premise: accepted, was ${JSON.stringify(outcome.refusal)}`)
    expect(rowOf(outcome.document, OTHER_COMMENT_ID).anchorTaskUid).toBe(BAR_UID)
  })
})
