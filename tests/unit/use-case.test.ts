// Unit tests for the UseCase units of wave W3.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import {
  applyDocumentChange,
  type ChangeStep,
  type DocumentCommand,
  type DocumentHolder,
  type SettingsLimits,
  type WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import { editDocumentSettings, editProject } from '../../src/use-case/edit-document/edit-document'

// A whole Document is far more than these cases read, so they carry the keys
// the aggregates actually touch. Same idiom as the other unit files.
const documentOf = (part: Record<string, unknown> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: { title: 'A', statusDate: null, themeHue: 214, startDate: null },
      taskGroups: [],
      tasks: [],
      ...((part.schedule as Record<string, unknown>) ?? {}),
    },
    documentSettings: {
      stackDirection: 'up',
      planActualDisplay: 'both',
      guideCursorMode: 'none',
      dualCursor: null,
      fontScale: 'M',
      fontScaleSizes: { S: 12, M: 14, L: 16 },
      rulerFont: 14,
      rulerHeight: 48,
      canvasPadding: 10,
      rowTitlePanelWidth: 170,
      propertyPanelWidth: 280,
      pinnedGroupIds: [],
      pinnedRowMax: 5,
      zoomX: 1,
      zoomY: 1,
      scrollDate: null,
      scrollGroupId: null,
      exportPngScale: 1,
      dependencyVisible: true,
      ...((part.documentSettings as Record<string, unknown>) ?? {}),
    },
    revisionStamp: { revision: 3, lastEditedBy: 'user', updatedAt: '2026-08-17T00:00:00' },
    changeLog: [],
  }) as unknown as Document

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, screenWidth: 1000 }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSize: 64 * 1024 * 1024 }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

const planOf = (
  document: Document,
  commands: readonly DocumentCommand[],
  part: Record<string, unknown> = {},
) =>
  planDocumentChange({
    document,
    readStamp: document.revisionStamp,
    commands,
    moment: CALM,
    history: EMPTY_HISTORY,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'user',
    updatedAt: '2026-08-17T01:00:00',
    ...part,
  })

describe('EditDocument (PI-9) -- the Project aggregate', () => {
  it('FR-035 refuses an empty document name but accepts null', () => {
    const document = documentOf()
    const empty = editProject(document, { kind: 'setProjectTitle', title: '' })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.refusals[0]!.rule).toBe('FR-035')
    // `null` is a legitimate state -- FR-035 gives it the tab heading Untitled.
    const cleared = editProject(document, { kind: 'setProjectTitle', title: null })
    expect(cleared.ok).toBe(true)
  })

  it('T-224 writes the eight editable columns and cannot reach the document name', () => {
    const result = editProject(documentOf(), {
      kind: 'setProjectProfile',
      fields: { author: 'yamada', company: 'acme', revision: 7, startDate: '2026-01-01' },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const project = result.document.schedule.project
    expect([project.author, project.company, project.revision]).toEqual(['yamada', 'acme', 7])
    // PF-9 / PF-10 and `title` are absent from the field type, so CM-2 leaves
    // the document name where FR-035 put it.
    expect(project.title).toBe('A')
  })

  it('PF-8 refuses a startDate that is not a date', () => {
    const result = editProject(documentOf(), {
      kind: 'setProjectProfile',
      fields: { startDate: 'soon' },
    })
    expect(result.ok).toBe(false)
  })

  it('FR-046 makes erasing the status line a null, with no separate flag', () => {
    const set = editProject(documentOf(), { kind: 'setStatusDate', date: '2026-06-01' })
    expect(set.ok && set.document.schedule.project.statusDate).toBe('2026-06-01')
    const cleared = editProject(documentOf(), { kind: 'clearStatusDate' })
    expect(cleared.ok && cleared.document.schedule.project.statusDate).toBeNull()
  })

  it('S-73 holds the theme hue to 0..359', () => {
    expect(editProject(documentOf(), { kind: 'setThemeHue', hue: 360 }).ok).toBe(false)
    expect(editProject(documentOf(), { kind: 'setThemeHue', hue: 0 }).ok).toBe(true)
  })
})

describe('EditDocument (PI-9) -- the presentation aggregate', () => {
  const settingsOf = (document: Document) => document.documentSettings

  it('FR-016 clamps the zoom into what S-75 and S-76 allow rather than refusing', () => {
    const result = editDocumentSettings(
      documentOf(),
      { kind: 'setZoom', zoomX: 1000, zoomY: 0.0001 },
      LIMITS,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(settingsOf(result.document).zoomX).toBe(64)
    expect(settingsOf(result.document).zoomY).toBe(0.02)
  })

  it('FR-052 judges the two panel widths together, not one at a time', () => {
    const ok = editDocumentSettings(
      documentOf(),
      { kind: 'setPanelWidths', rowTitlePanelWidth: 170, propertyPanelWidth: 280 },
      LIMITS,
    )
    expect(ok.ok).toBe(true)
    // 1000 - 10 padding - 600 - 400 leaves the Row Area at or below zero.
    const tooWide = editDocumentSettings(
      documentOf(),
      { kind: 'setPanelWidths', rowTitlePanelWidth: 600, propertyPanelWidth: 400 },
      LIMITS,
    )
    expect(tooWide.ok).toBe(false)
    if (!tooWide.ok) expect(tooWide.refusals[0]!.rule).toBe('FR-052')
  })

  it('FR-098 refuses a pin at the cap and leaves the ones already placed alone', () => {
    const full = documentOf({
      documentSettings: { pinnedGroupIds: ['a', 'b', 'c', 'd', 'e'], pinnedRowMax: 5 },
    })
    const result = editDocumentSettings(full, { kind: 'pinTaskGroup', groupId: 'f' }, LIMITS)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.refusals[0]!.rule).toBe('FR-098')
    // MUST NOT: the oldest pin is NOT pushed out to make room.
    expect(settingsOf(full).pinnedGroupIds).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('DC-7 is the only way the two measuring lines go away', () => {
    const placed = editDocumentSettings(
      documentOf(),
      { kind: 'setDualCursor', date1: '2026-01-01', date2: '2026-02-01' },
      LIMITS,
    )
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    // DC-4 (MUST NOT): choosing the guide cursor's "none" must not take the
    // Dual Cursor down with it -- FR-048 keeps the three kinds independent.
    const guide = editDocumentSettings(
      placed.document,
      { kind: 'setGuideCursorMode', mode: 'none' },
      LIMITS,
    )
    expect(guide.ok && settingsOf(guide.document).dualCursor).not.toBeNull()
    const cleared = editDocumentSettings(placed.document, { kind: 'clearDualCursor' }, LIMITS)
    expect(cleared.ok && settingsOf(cleared.document).dualCursor).toBeNull()
  })

  it('IV-13 refuses a dual cursor unless both dates are dates', () => {
    const result = editDocumentSettings(
      documentOf(),
      { kind: 'setDualCursor', date1: '2026-01-01', date2: 'later' },
      LIMITS,
    )
    expect(result.ok).toBe(false)
  })

  it('FR-039 drags the ruler type and band along with the font scale', () => {
    const result = editDocumentSettings(documentOf(), { kind: 'setFontScale', scale: 'L' }, LIMITS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(settingsOf(result.document).rulerFont).toBe(16)
    expect(settingsOf(result.document).rulerHeight).toBe(16 * 3 + 6)
  })
})

describe('ApplyDocumentChange (PI-8) -- the seven steps of table T-067', () => {
  it('WS-1 turns away a writer that read an older stamp', () => {
    const document = documentOf()
    const plan = planOf(document, [{ kind: 'clearStatusDate' }], {
      readStamp: { ...document.revisionStamp, revision: 2 },
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.refusal).toEqual({ step: 'WS-1', reason: 'staleStamp' })
  })

  it('WS-1 compares all three fields, so a presentation-only write is still seen', () => {
    const document = documentOf()
    // FR-063 leaves the revision alone for a presentation write, so only
    // lastEditedBy and updatedAt can tell that one happened.
    const plan = planOf(document, [{ kind: 'clearStatusDate' }], {
      readStamp: { ...document.revisionStamp, lastEditedBy: 'someone else' },
    })
    expect(plan.ok).toBe(false)
  })

  it('WS-2 refuses mid-gesture, mid-edit and while notices are going out', () => {
    const document = documentOf()
    for (const key of ['gestureInFlight', 'editingInPlace', 'deliveringNotices'] as const) {
      const plan = planOf(document, [{ kind: 'clearStatusDate' }], {
        moment: { ...CALM, [key]: true },
      })
      expect(plan.ok).toBe(false)
      if (!plan.ok) expect(plan.refusal).toEqual({ step: 'WS-2', reason: key })
    }
  })

  it('WS-3 throws the whole bundle away when one command is refused', () => {
    const document = documentOf()
    const plan = planOf(document, [
      { kind: 'setProjectTitle', title: 'B' },
      { kind: 'setThemeHue', hue: 999 }, // refused
    ])
    expect(plan.ok).toBe(false)
    // AG-3: nothing was replaced, so the accepted first command is gone too.
    expect(document.schedule.project.title).toBe('A')
  })

  it('WS-4 records a step for an undoable command and none for UN-7 or UN-16', () => {
    const document = documentOf()
    const undoable = planOf(document, [{ kind: 'setProjectTitle', title: 'B' }])
    expect(undoable.ok && undoable.history.done).toHaveLength(1)

    for (const command of [
      { kind: 'setElementVisible', element: 'dependencyVisible', visible: false }, // UN-7
      { kind: 'setExportPngScale', scale: 2 }, // UN-16
      { kind: 'setZoom', zoomX: 2, zoomY: 2 }, // UN-8
    ] as const) {
      const plan = planOf(document, [command as DocumentCommand])
      expect(plan.ok && plan.history.done).toHaveLength(0)
    }
  })

  it('WS-5 raises the revision for the schedule group and not for the presentation group', () => {
    const document = documentOf()
    const schedule = planOf(document, [{ kind: 'setProjectTitle', title: 'B' }])
    expect(schedule.ok && schedule.raisedRevision).toBe(true)
    expect(schedule.ok && schedule.document.revisionStamp.revision).toBe(4)

    const presentation = planOf(document, [{ kind: 'setStackDirection', direction: 'down' }])
    expect(presentation.ok && presentation.raisedRevision).toBe(false)
    expect(presentation.ok && presentation.document.revisionStamp.revision).toBe(3)
    // FR-063: who wrote last and when are replaced either way.
    expect(presentation.ok && presentation.document.revisionStamp.updatedAt).toBe(
      '2026-08-17T01:00:00',
    )
  })

  it('WS-5 raises it for fit, because HF-8 discards a TaskGroup column', () => {
    // ⚠️ The group column of table T-108 files this under 見せ方の群, so
    // reading THAT would answer no. What changed is what counts.
    const document = documentOf({
      schedule: { taskGroups: [{ id: 'g1', isCollapsed: true }] },
    })
    const plan = planOf(document, [
      { kind: 'fitScheduleToScreen', zoomX: 2, zoomY: 2, scrollDate: null, scrollGroupId: null },
    ])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.raisedRevision).toBe(true)
    expect(plan.document.schedule.taskGroups[0]!.isCollapsed).toBe(false)
    // UN-17 makes that half undoable, so the press leaves one step.
    expect(plan.history.done).toHaveLength(1)
  })

  it('leaves the revision alone when fit had no collapse to discard', () => {
    const plan = planOf(documentOf({ schedule: { taskGroups: [{ id: 'g1', isCollapsed: false }] } }), [
      { kind: 'fitScheduleToScreen', zoomX: 2, zoomY: 2, scrollDate: null, scrollGroupId: null },
    ])
    expect(plan.ok && plan.raisedRevision).toBe(false)
  })

  it('WS-7 hands out the notice AFTER the swap, never before', () => {
    const document = documentOf()
    const seen: string[] = []
    let held = { document, history: EMPTY_HISTORY }
    const holder: DocumentHolder = {
      read: () => held,
      replace: (next, history) => {
        seen.push('replace')
        held = { document: next, history }
      },
    }
    const audience = {
      deliver: (given: Document) => {
        seen.push('deliver')
        // The subscriber must be able to read the NEW document, which is the
        // whole reason table T-067 fixes this order.
        expect(given.schedule.project.title).toBe('B')
        expect(held.document).toBe(given)
      },
    }
    const outcome = applyDocumentChange(
      {
        readStamp: document.revisionStamp,
        commands: [{ kind: 'setProjectTitle', title: 'B' }],
        moment: CALM,
        historyLimits: HISTORY_LIMITS,
        settingsLimits: LIMITS,
        editedBy: 'user',
        updatedAt: '2026-08-17T01:00:00',
      },
      holder,
      audience,
    )
    expect(outcome.accepted).toBe(true)
    expect(seen).toEqual(['replace', 'deliver'])
  })

  it('neither swaps nor tells when the plan refused', () => {
    const document = documentOf()
    const seen: string[] = []
    const holder: DocumentHolder = {
      read: () => ({ document, history: EMPTY_HISTORY }),
      replace: () => seen.push('replace'),
    }
    const outcome = applyDocumentChange(
      {
        readStamp: { ...document.revisionStamp, revision: 1 },
        commands: [{ kind: 'setProjectTitle', title: 'B' }],
        moment: CALM,
        historyLimits: HISTORY_LIMITS,
        settingsLimits: LIMITS,
        editedBy: 'user',
        updatedAt: '2026-08-17T01:00:00',
      },
      holder,
      { deliver: () => seen.push('deliver') },
    )
    expect(outcome.accepted).toBe(false)
    expect(seen).toEqual([])
  })
})
