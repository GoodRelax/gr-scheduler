// DFC-540 (4) and (5): a no-op Resource or Dependency write answers the same document, and CM-11 is judged by IV-12 on the dates it writes.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import type {
  ChangeStep,
  DocumentCommand,
  SettingsLimits,
  WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import { editDocument } from '../../src/use-case/edit-document/edit-document'
import { documentOf, personOf, seatOf, taskOf } from '../contract/cr-606-stage'

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }
const ROW_NAME = 'row'

const run = (document: Document, command: unknown) => editDocument(document, command as DocumentCommand, LIMITS, ROW_NAME)

const planOf = (document: Document, commands: readonly unknown[]) =>
  planDocumentChange({
    defaultRowName: ROW_NAME,
    document,
    readStamp: document.documentStamp,
    commands: commands as readonly DocumentCommand[],
    moment: CALM,
    history: EMPTY_HISTORY,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'agent',
    updatedUtc: '2099-01-01T00:00:00Z',
  })

const FROM = 1
const TO = 2
const ANNA = 41
const BORIS = 42

const dependencyLink = { predecessorUid: FROM, linkType: 1, lag: 0, lagFormat: 7, carry: {}, carryElements: [] }

// WHY: two resources, one of them assigned (so "delete the unreferenced" has something to keep), one task with a dependency line.
const withResourcesAndALine = (): Document =>
  documentOf({
    tasks: [taskOf(FROM), taskOf(TO, { dependencies: [dependencyLink] })],
    resources: [personOf(ANNA, 'Anna'), personOf(BORIS, 'Boris')],
    assignments: [seatOf(91, FROM, ANNA), seatOf(92, TO, BORIS)],
  })

describe('FR-020 / FR-063 (DFC-540 4) -- a Resource or Dependency write that changed nothing answers the same document', () => {
  it('CM-41 setResourceName: the name the Resource already holds, written again, is the same document', () => {
    const document = withResourcesAndALine()
    const same = run(document, { kind: 'setResourceName', uid: ANNA, name: 'Anna' })
    expect(same.ok).toBe(true)
    if (!same.ok) return
    expect(same.document, 'FR-020 reads the reference: a new object here moves the trail instant').toBe(document)
    const moved = run(document, { kind: 'setResourceName', uid: ANNA, name: 'Anna B' })
    expect(moved.ok && moved.document !== document, 'the same command with a new name still writes').toBe(true)
  })

  it('CM-42 deleteResource: an empty choice is the same document', () => {
    const document = withResourcesAndALine()
    const same = run(document, { kind: 'deleteResource', uids: [] })
    expect(same.ok && same.document === document).toBe(true)
  })

  it('CM-43 deleteUnreferencedResources: written twice, the second answers the same document', () => {
    const document = withResourcesAndALine()
    const referencedOnly = documentOf({
      tasks: [taskOf(FROM)],
      resources: [personOf(ANNA, 'Anna')],
      assignments: [seatOf(91, FROM, ANNA)],
    })
    const same = run(referencedOnly, { kind: 'deleteUnreferencedResources' })
    expect(same.ok && same.document === referencedOnly, 'nothing is unreferenced, so nothing is written').toBe(true)
    const first = run(document, { kind: 'createResource', name: 'Unused' })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const swept = run(first.document, { kind: 'deleteUnreferencedResources' })
    expect(swept.ok).toBe(true)
    if (!swept.ok) return
    expect(swept.document, 'the unused one went').not.toBe(first.document)
    const again = run(swept.document, { kind: 'deleteUnreferencedResources' })
    expect(again.ok && again.document === swept.document, 'the second sweep has nothing left to do').toBe(true)
  })

  it('CM-38 setDependencyLag: the lag the line already holds, written again, is the same document', () => {
    const document = withResourcesAndALine()
    const first = run(document, { kind: 'setDependencyLag', predecessorUid: FROM, successorUid: TO, lagWorkingDays: 2 })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.document, 'a new lag writes').not.toBe(document)
    const second = run(first.document, { kind: 'setDependencyLag', predecessorUid: FROM, successorUid: TO, lagWorkingDays: 2 })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.document, 'FR-020 reads the reference').toBe(first.document)
  })

  it('FR-063: the schedule instant does not move for any of the writes above, and moves for a write that changed a value', () => {
    const document = withResourcesAndALine()
    const before = document.documentStamp.scheduleUpdatedUtc
    for (const command of [
      { kind: 'setResourceName', uid: ANNA, name: 'Anna' },
      { kind: 'deleteResource', uids: [] },
      { kind: 'deleteUnreferencedResources' },
    ]) {
      const plan = planOf(document, [command])
      expect(plan.ok, command.kind).toBe(true)
      if (!plan.ok) continue
      expect(plan.hasMovedSchedule, command.kind).toBe(false)
      expect(plan.document.documentStamp.scheduleUpdatedUtc, command.kind).toBe(before)
    }
    const moved = planOf(document, [{ kind: 'setResourceName', uid: ANNA, name: 'Anna B' }])
    expect(moved.ok).toBe(true)
    if (!moved.ok) return
    expect(moved.hasMovedSchedule).toBe(true)
    expect(moved.document.documentStamp.scheduleUpdatedUtc).toBe('2099-01-01T00:00:00Z')
  })
})

describe('IV-12 (DFC-540 5) -- CM-11 setTaskPlanDates is measured on the dates about to be written', () => {
  const FADED = 7
  const longPlan = { start: '2026-04-06T08:00:00', finish: '2026-04-30T17:00:00' }

  const fadedDocument = (): Document =>
    documentOf({ tasks: [taskOf(FADED, { ...longPlan, fadeInDays: 5, fadeOutDays: 5 })] })

  it('shrinking a task with 5 + 5 fade days to a 5-day span is refused by IV-12, although the dates it holds now are long', () => {
    const document = fadedDocument()
    const result = run(document, {
      kind: 'setTaskPlanDates',
      uid: FADED,
      start: '2026-04-06T08:00:00',
      finish: '2026-04-10T17:00:00',
    })
    expect(result.ok, 'the fades (10) are longer than the new span (5)').toBe(false)
    if (result.ok) return
    expect(result.refusals.some((one) => 'rule' in one && one.rule === 'IV-12'), JSON.stringify(result.refusals)).toBe(true)
  })

  it('moving the same task to dates that still hold both fades is accepted and the fades stay as they were', () => {
    const document = fadedDocument()
    const result = run(document, {
      kind: 'setTaskPlanDates',
      uid: FADED,
      start: '2026-05-04T08:00:00',
      finish: '2026-05-29T17:00:00',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.document.schedule.tasks.find((one) => one.uid === FADED)
    expect(after?.fadeInDays).toBe(5)
    expect(after?.fadeOutDays).toBe(5)
  })

  it('a task without fades may be shrunk to one day: IV-12 has nothing to add', () => {
    const document = documentOf({ tasks: [taskOf(FADED, longPlan)] })
    const result = run(document, {
      kind: 'setTaskPlanDates',
      uid: FADED,
      start: '2026-04-06T08:00:00',
      finish: '2026-04-06T17:00:00',
    })
    expect(result.ok).toBe(true)
  })
})
