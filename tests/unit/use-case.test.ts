// Unit tests for the UseCase units of wave W3.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import {
  applyDocumentChange,
  type ChangeAudience,
  type ChangeStep,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type SettingsLimits,
  type WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import { editDocumentSettings, editProject } from '../../src/use-case/edit-document/edit-document'
// WHY: RD-1 puts UndoEdit in WS-3's position, so one press of undo is
// undoEdit over the held pair. The pair-of-writes case below needs it.
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import { DEFAULT_DISPLAY_RATIO } from '../fixtures/display-scale'
import { specTable } from '../contract/spec-table'
import {
  installAgentApi,
  type AgentApi,
  type AgentWriteOutcome,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { unwatchChanges } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { rowDocument, shell, TEMPLATE } from './cr-541-stage'

// see S-3, T-201, CR-418
const RULER_FONT_FACTOR = ((): number => {
  const cell = specTable('T-201').rows.find((one) => one.id === 'S-3')?.by['既定値'] ?? ''
  const found = /`fontScaleSizes\[fontScale\]`\s*×\s*(\d+(?:\.\d+)?)/.exec(cell)
  if (found === null) throw new Error(`S-3 states no factor on the text size: ${cell}`)
  return Number(found[1])
})()

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'

// WHY: read from SETTINGS_DEFAULTS, not a hand-typed list -- a hand-typed
// list once missed a new key (CR-200) and could not catch the break it caused.
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

// WHY: a whole Document is far more than these cases read, so they carry
// only the keys the aggregates touch.
const documentOf = (part: Record<string, unknown> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: { title: 'A', statusDate: null, themeHue: 214, startDate: null },
      // WHY: not an empty array -- table T-050 requires at least one
      // TaskGroup, and an empty fixture is not a document the spec admits.
      taskGroups: [{ id: 'g0', parentId: null, label: 'row 1', derivedFromTaskUid: null,
                     order: 0, isCollapsed: null, isHidden: null, color: null, height: null }],
      tasks: [],
      ...((part.schedule as Record<string, unknown>) ?? {}),
    },
    documentSettings: {
      ...DEFAULT_SETTINGS,
      ...((part.documentSettings as Record<string, unknown>) ?? {}),
    },
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

// WHY: rowAreaWidthWithoutPanels is what the caller reads off the frame's
// ScreenRegions (CS-1) and hands over; the arithmetic is layoutEngine's.
const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

const planOf = (
  document: Document,
  commands: readonly DocumentCommand[],
  part: Record<string, unknown> = {},
) =>
  planDocumentChange({
    defaultRowName: DEFAULT_ROW_NAME_FIXTURE,
    document,
    readStamp: document.documentStamp,
    commands,
    moment: CALM,
    history: EMPTY_HISTORY,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'user',
    updatedUtc: '2026-08-17T01:00:00Z',
    ...part,
  })

describe('ApplyDocumentChange -- how big one undo step is (FR-031)', () => {
  // WHY: FR-031 measures a step's size in UTF-8 bytes, not characters, and
  // S-95 is in megabytes, so counting characters would run the bound loose.
  it('measures the stored form in bytes, not characters', () => {
    // WHY: the step measures the document BEFORE the edit, so the two
    // documents differ in their starting title -- both five characters.
    const ascii = 'abcde'
    const japanese = '日程表の名'
    expect([...ascii]).toHaveLength([...japanese].length)

    const sizeOf = (title: string): number => {
      const document = documentOf({
        schedule: { project: { title, statusDate: null, themeHue: 214, startDate: null },
                    taskGroups: [], tasks: [] },
      })
      const plan = planOf(document, [{ kind: 'setProjectTitle', title: 'zz' }])
      expect(plan.ok).toBe(true)
      if (!plan.ok) throw new Error('the plan was refused')
      expect(plan.history.done).toHaveLength(1)
      return plan.history.done[0]!.sizeBytes
    }

    // WHY: each of the five characters is three bytes where a letter is one.
    expect(sizeOf(japanese) - sizeOf(ascii)).toBe([...japanese].length * 2)
  })
})

describe('EditDocument (PI-9) -- the Project aggregate', () => {
  it('FR-035 refuses an empty document name but accepts null', () => {
    const document = documentOf()
    const empty = editProject(document, { kind: 'setProjectTitle', title: '' })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.refusals[0]!.rule).toBe('FR-035')
    // WHY: null is a legitimate state -- FR-035 gives it the tab heading Untitled.
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
    // WHY: PF-9 / PF-10 and title are absent from the field type, so CM-2
    // leaves the document name where FR-035 put it.
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
    // WHY: 982 - 600 - 400 leaves the Row Area at or below zero; the pair
    // passes one at a time but fails together, which is the MUST NOT.
    const tooWide = editDocumentSettings(
      documentOf(),
      {
        kind: 'setPanelWidths',
        rowTitlePanelWidth: 600 / DEFAULT_DISPLAY_RATIO,
        propertyPanelWidth: 400,
      },
      LIMITS,
    )
    expect(tooWide.ok).toBe(false)
    if (!tooWide.ok) expect(tooWide.refusals[0]!.rule).toBe('FR-052')
  })

  it('FR-052 refuses a row title panel of zero, which SC-3 forbids', () => {
    // WHY: the scrollbar term is already in rowAreaWidthWithoutPanels, so a
    // pair that only fits when the scrollbar is forgotten is refused.
    const grazing = editDocumentSettings(
      documentOf(),
      {
        kind: 'setPanelWidths',
        rowTitlePanelWidth: 972 / DEFAULT_DISPLAY_RATIO,
        propertyPanelWidth: 10,
      },
      LIMITS,
    )
    expect(grazing.ok).toBe(false)
    // WHY: width 0 breaks SC-3's "showing at every zoom" (MUST NOT), so it
    // is refused even though the Row Area would be at its widest.
    const flat = editDocumentSettings(
      documentOf(),
      { kind: 'setPanelWidths', rowTitlePanelWidth: 0, propertyPanelWidth: 280 },
      LIMITS,
    )
    expect(flat.ok).toBe(false)
    if (!flat.ok) expect(flat.refusals[0]!.rule).toBe('FR-052')
    // WHY: S-80 keeps its lower bound 0 (S-248 stops only a divider drag, FR-052); zero is legitimate.
    const collapsed = editDocumentSettings(
      documentOf(),
      { kind: 'setPanelWidths', rowTitlePanelWidth: 170, propertyPanelWidth: 0 },
      LIMITS,
    )
    expect(collapsed.ok).toBe(true)
  })

  it('FR-098 refuses a pin at the cap and leaves the ones already placed alone', () => {
    const full = documentOf({
      documentSettings: { pinnedGroupIds: ['a', 'b', 'c', 'd', 'e'], pinnedRowMax: 5 },
    })
    const result = editDocumentSettings(full, { kind: 'pinTaskGroup', groupId: 'f' }, LIMITS)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.refusals[0]!.rule).toBe('FR-098')
    // WHY: the oldest pin is NOT pushed out to make room (MUST NOT).
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
    // WHY: DC-4 says choosing the guide cursor's "none" must not take the
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
    // WHY: FR-039 (S-2, S-3) has the font scale carry ruler type and band
    // height with it; only the two 3s are literal, every size is read.
    // WHY: CR-418 section 7.2 -- S-3 is fontScaleSizes[fontScale] x the T-201 factor, so L writes 16 x 1.5.
    const sizeL = (SETTINGS_DEFAULTS['fontScaleSizes.L'] as number) * RULER_FONT_FACTOR
    const pad = SETTINGS_DEFAULTS['rulerLabelPad'] as number
    const result = editDocumentSettings(documentOf(), { kind: 'setFontScale', scale: 'L' }, LIMITS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(settingsOf(result.document).rulerFont).toBe(sizeL)
    expect(settingsOf(result.document).rulerHeight).toBe(sizeL * 3 + pad * 3)

    // WHY: a value read from the manuscript is only shown to arrive when
    // moving it moves the answer -- a wider rulerLabelPad here does.
    const padded = editDocumentSettings(
      documentOf({ documentSettings: { rulerLabelPad: pad + 2 } }),
      { kind: 'setFontScale', scale: 'L' },
      LIMITS,
    )
    expect(padded.ok).toBe(true)
    if (!padded.ok) return
    expect(settingsOf(padded.document).rulerHeight).toBe(sizeL * 3 + (pad + 2) * 3)
  })
})

describe('ApplyDocumentChange (PI-8) -- the seven steps of table T-067', () => {
  it('WS-1 turns away a writer that read a stamp that is not this one', () => {
    // WHY: AG-2 requires a mismatch to refuse the write and return the current document.
    const document = documentOf()
    const plan = planOf(document, [{ kind: 'clearStatusDate' }], {
      readStamp: { ...document.documentStamp, scheduleUpdatedUtc: '2026-08-17T00:00:02Z' },
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.refusal).toEqual({ step: 'WS-1', reason: 'staleStamp' })
  })

  it('WS-1 refuses on any ONE of the three differing, EARLIER stamps included', () => {
    // WHY: AG-2 checks all three stamp fields for equality, and FR-063 (MUST
    // NOT) forbids reading them as an order, so an earlier stamp is a mismatch too.
    const document = documentOf()
    for (const differing of [
      { scheduleUpdatedUtc: '2020-01-01T00:00:00Z' },
      { lastEditedBy: 'someone else' },
      { settingsUpdatedUtc: '2020-01-01T00:00:00Z' },
      { settingsUpdatedUtc: '2030-01-01T00:00:00Z' },
    ] as const) {
      const plan = planOf(document, [{ kind: 'clearStatusDate' }], {
        readStamp: { ...document.documentStamp, ...differing },
      })
      expect(plan.ok, JSON.stringify(differing)).toBe(false)
    }
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
      { kind: 'setThemeHue', hue: 999 },
    ])
    expect(plan.ok).toBe(false)
    // WHY: AG-3 has nothing replaced, so the accepted first command is gone too.
    expect(document.schedule.project.title).toBe('A')
  })

  it('WS-4 records a step for an undoable command and none for UN-7 or UN-16', () => {
    const document = documentOf()
    const undoable = planOf(document, [{ kind: 'setProjectTitle', title: 'B' }])
    expect(undoable.ok && undoable.history.done).toHaveLength(1)

    for (const command of [
      { kind: 'setElementVisible', element: 'dependencyVisible', visible: false },
      { kind: 'setPanelWidths', rowTitlePanelWidth: 210, propertyPanelWidth: 310 },
      { kind: 'setZoom', zoomX: 2, zoomY: 2 },
    ] as const) {
      const plan = planOf(document, [command as DocumentCommand])
      expect(plan.ok && plan.history.done).toHaveLength(0)
    }
  })

  it('WS-5 moves the schedule instant for the schedule group and not for the presentation group', () => {
    const document = documentOf()
    const schedule = planOf(document, [{ kind: 'setProjectTitle', title: 'B' }])
    expect(schedule.ok && schedule.hasMovedSchedule).toBe(true)
    expect(schedule.ok && schedule.document.documentStamp.scheduleUpdatedUtc).toBe(
      '2026-08-17T01:00:00Z',
    )

    const presentation = planOf(document, [{ kind: 'setStackDirection', direction: 'down' }])
    expect(presentation.ok && presentation.hasMovedSchedule).toBe(false)
    // WHY: FR-063 (MUST NOT) forbids a presentation-only update from moving
    // the schedule-data group's instant.
    expect(presentation.ok && presentation.document.documentStamp.scheduleUpdatedUtc).toBe(
      document.documentStamp.scheduleUpdatedUtc,
    )
    // WHY: FR-063 (MUST) replaces who wrote last and whichever group's
    // instant moved, either way.
    expect(presentation.ok && presentation.document.documentStamp.settingsUpdatedUtc).toBe(
      '2026-08-17T01:00:00Z',
    )
  })

  // WHY: FR-031 splits one fit press into two ordered writes -- place
  // zoom/scroll (CM-71, no step), then expand all (CM-72, one step).

  it('CM-71 over a document with a collapsed row places zoom and scroll only, pushing no step (UN-8) and leaving the schedule instant (FR-063)', () => {
    // WHY: CM-71 places the whole-view zoom and scroll only -- the collapse
    // half of the press is CM-72's, so a collapsed row stays collapsed here.
    const document = documentOf({
      schedule: { taskGroups: [{ id: 'g1', isCollapsed: true, isHidden: false }] },
    })
    const plan = planOf(document, [
      {
        kind: 'fitScheduleToScreen',
        zoomX: 2,
        zoomY: 2,
        scrollDate: '2026-03-01',
        scrollGroupId: 'g1',
        // WHY: FR-080 has the anchors carry a fraction of their own extent
        // too, and a whole-view fit lands top-left, so both fractions are 0.
        scrollDayOffset: 0,
        scrollGroupOffset: 0,
      },
    ])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return

    expect(plan.document.documentSettings.zoomX).toBe(2)
    expect(plan.document.documentSettings.zoomY).toBe(2)
    expect(plan.document.documentSettings.scrollDate).toBe('2026-03-01')
    expect(plan.document.documentSettings.scrollGroupId).toBe('g1')
    expect(plan.document.schedule.taskGroups[0]!.isCollapsed).toBe(true)

    // WHY: UN-8 files zoom/scroll/pan as out of scope, so WS-4 (MUST NOT)
    // must not push an undo step for it.
    expect(plan.history.done).toHaveLength(0)

    // WHY: FR-063 (MUST NOT) forbids a presentation-only update from moving
    // the schedule-data instant, and CM-71 touches nothing else.
    expect(plan.hasMovedSchedule).toBe(false)
    expect(plan.document.documentStamp.scheduleUpdatedUtc).toBe(
      document.documentStamp.scheduleUpdatedUtc,
    )
    // WHY: FR-063 (MUST) still replaces who wrote last and whichever
    // group's instant moved.
    expect(plan.document.documentStamp.settingsUpdatedUtc).toBe('2026-08-17T01:00:00Z')
  })

  it('CM-72 over two collapsed rows opens both in ONE step (UN-17) and moves the schedule instant, leaving the hidden state alone (HF-8)', () => {
    const document = documentOf({
      schedule: {
        taskGroups: [
          { id: 'g1', isCollapsed: true, isHidden: false },
          { id: 'g2', isCollapsed: true, isHidden: true },
          { id: 'g3', isCollapsed: false, isHidden: false },
        ],
      },
    })
    const plan = planOf(document, [{ kind: 'expandAllTaskGroups' }])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return

    // WHY: whether "discarded" lands on false or null is unsettled, so this
    // checks only that it is not collapsed, never a missing key (FR-024).
    for (const group of plan.document.schedule.taskGroups) {
      expect([false, null]).toContain(group.isCollapsed)
    }
    // WHY: HF-8 discards the collapse only -- the hidden state stays.
    expect(plan.document.schedule.taskGroups[1]!.isHidden).toBe(true)

    // WHY: FR-031 folds one whole-view-display press into one step, so
    // opening two rows must not cost two steps.
    expect(plan.history.done).toHaveLength(1)

    // WHY: UN-17 files this as in scope, and isCollapsed is a schedule-data
    // column, so FR-063 (MUST) moves the schedule-data instant.
    expect(plan.hasMovedSchedule).toBe(true)
    expect(plan.document.documentStamp.scheduleUpdatedUtc).toBe('2026-08-17T01:00:00Z')
  })

  it('one press written CM-71 then CM-72 and undone once brings the collapse back while the new zoom stays (FR-031, UN-8 + UN-17)', () => {
    // WHY: WS-4 pushes the document as it stood BEFORE the second write, so
    // undoing after both restores only the collapse, never the older zoom.
    const start = documentOf({
      schedule: { taskGroups: [{ id: 'g1', isCollapsed: true, isHidden: false }] },
    })

    // STEP: CM-71 -- place zoom and scroll (UN-8: no step)
    const first = planOf(start, [
      {
        kind: 'fitScheduleToScreen',
        zoomX: 4,
        zoomY: 4,
        scrollDate: null,
        scrollGroupId: null,
        scrollDayOffset: 0,
        scrollGroupOffset: 0,
      },
    ])
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.history.done).toHaveLength(0)

    // STEP: CM-72 -- expand all, as a second write against what step 1 left
    const second = planOf(first.document, [{ kind: 'expandAllTaskGroups' }], {
      history: first.history,
      updatedUtc: '2026-08-17T02:00:00Z',
    })
    expect(second.ok).toBe(true)
    if (!second.ok) return

    expect(second.history.done).toHaveLength(1)
    // WHY: the pushed step carries the NEW zoom, not the old one -- the
    // assertion the MUST NOT on the write order lives or dies by.
    expect(second.history.done[0]!.step.document.documentSettings.zoomX).toBe(4)

    // STEP: undo once
    const undone = undoEdit({ document: second.document, history: second.history })
    expect(undone.undone).toBe(true)
    expect(undone.next.document.schedule.taskGroups[0]!.isCollapsed).toBe(true)
    // WHY: UN-17 files the collapse as in scope but zoom/scroll stay out of
    // scope (UN-8), so the zoom stays where step 1 put it.
    expect(undone.next.document.documentSettings.zoomX).toBe(4)
    expect(undone.next.document.documentSettings.zoomY).toBe(4)
    expect(undone.next.history.done).toHaveLength(0)
  })

  it('WS-7 hands out the notice AFTER the swap, never before', () => {
    const document = documentOf()
    const seen: string[] = []
    let held = { document, history: EMPTY_HISTORY }
    const holder: DocumentHolder = {
      read: () => held,
      replace: (next) => {
        seen.push('replace')
        held = next
      },
    }
    const audience: ChangeAudience = {
      deliver: (given: Document, hasMovedSchedule: boolean) => {
        seen.push('deliver')
        // WHY: the subscriber must read the NEW document -- the whole
        // reason table T-067 fixes this order.
        expect(given.schedule.project.title).toBe('B')
        expect(held.document).toBe(given)
        // WHY: AG-6 selects a live watcher by WS-5's judgement, and R2.7
        // carries that judgement to the audience rather than re-derive it.
        expect(hasMovedSchedule).toBe(true)
      },
    }
    const outcome = applyDocumentChange(
      {
        defaultRowName: DEFAULT_ROW_NAME_FIXTURE,
        readStamp: document.documentStamp,
        commands: [{ kind: 'setProjectTitle', title: 'B' }],
        moment: CALM,
        historyLimits: HISTORY_LIMITS,
        settingsLimits: LIMITS,
        editedBy: 'user',
        updatedUtc: '2026-08-17T01:00:00Z',
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
        defaultRowName: DEFAULT_ROW_NAME_FIXTURE,
        readStamp: { ...document.documentStamp, scheduleUpdatedUtc: '2020-01-01T00:00:00Z' },
        commands: [{ kind: 'setProjectTitle', title: 'B' }],
        moment: CALM,
        historyLimits: HISTORY_LIMITS,
        settingsLimits: LIMITS,
        editedBy: 'user',
        updatedUtc: '2026-08-17T01:00:00Z',
      },
      holder,
      { deliver: () => seen.push('deliver') },
    )
    expect(outcome.accepted).toBe(false)
    expect(seen).toEqual([])
  })

  it('WS-2 refuses a write made from inside the delivery, and swaps only once -- through the shell', () => {
    // WHY: Chapter 5.5 refuses a write made during delivery; the subscriber
    // cannot know it is inside one. Since CR-440 section 5 the window is the
    // session's state (SM-38 of table T-286) and the CALLER fills WS-2's
    // moment from it, so the UseCase alone cannot show this any more: the
    // write is driven through the shell's holder, audience and snapshot.
    const built = shell(rowDocument([{ id: 'row-1', parentId: null }]))
    const apiFor = (writerName: string): AgentApi =>
      installAgentApi({
        ...built.loop.agentApiSeams(),
        writerName,
        schemaVersion: TEMPLATE.schemaVersion,
      } as never)
    const outside = apiFor('use-case WS-2 writer')
    const inside = apiFor('use-case WS-2 subscriber')
    const nested: AgentWriteOutcome[] = []
    try {
      inside.watchChanges(() => {
        if (nested.length > 0) return
        nested.push(
          inside.applyCommands({
            readStamp: inside.readStamp(),
            commands: [{ kind: 'setProjectTitle', title: 'C' }],
          }),
        )
      })

      const outcome = outside.applyCommands({
        readStamp: outside.readStamp(),
        commands: [{ kind: 'setProjectTitle', title: 'B' }],
      })

      expect(outcome.accepted, JSON.stringify(outcome)).toBe(true)
      expect(nested, 'premise: the subscriber was told and wrote back').toHaveLength(1)
      const inner = nested[0] as AgentWriteOutcome
      expect(inner.accepted).toBe(false)
      if (!inner.accepted) expect(inner.refusal.reason).toBe('deliveringNotices')
      // WHY: the nested write reached neither WS-6 nor WS-7, so the document
      // held is the outer write's.
      expect(built.loop.document().schedule.project.title).toBe('B')

      // WHY: the window closes when the delivery ends (table T-286), so one
      // refusal does not wedge the path shut.
      const after = inside.applyCommands({
        readStamp: inside.readStamp(),
        commands: [{ kind: 'setProjectTitle', title: 'D' }],
      })
      expect(after.accepted, JSON.stringify(after)).toBe(true)
      expect(built.loop.document().schedule.project.title).toBe('D')
    } finally {
      unwatchChanges('use-case WS-2 subscriber')
      built.restore()
    }
  })

  it('opens the window for the delivery only, and closes it when a subscriber throws', () => {
    let held: HeldDocument = { document: documentOf(), history: EMPTY_HISTORY }
    const holder: DocumentHolder = {
      read: () => held,
      replace: (next) => {
        held = next
      },
    }
    const writeOf = (title: string, audience: ChangeAudience) =>
      applyDocumentChange(
        {
          defaultRowName: DEFAULT_ROW_NAME_FIXTURE,
          readStamp: held.document.documentStamp,
          commands: [{ kind: 'setProjectTitle', title }],
          moment: CALM,
          historyLimits: HISTORY_LIMITS,
          settingsLimits: LIMITS,
          editedBy: 'user',
          updatedUtc: '2026-08-17T01:00:00Z',
        },
        holder,
        audience,
      )

    expect(() =>
      writeOf('B', {
        deliver: () => {
          throw new Error('subscriber')
        },
      }),
    ).toThrow('subscriber')
    // WHY: that delivery ended, badly but it ended -- Chapter 5.5 refuses
    // writes during a delivery, not for the rest of the run.
    expect(writeOf('C', { deliver: () => undefined }).accepted).toBe(true)
  })
})
