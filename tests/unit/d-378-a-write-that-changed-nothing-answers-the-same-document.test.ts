// Unit tests for the rule ledger row DFC-378 was raised against: an accepted
// write that changed no value answers the document it was handed, so that
// nothing downstream reads it as a change.
//
// Units under test: UF-17 `edit-project.ts` (CM-1 to CM-5) and the presentation
// aggregate `edit-document-settings.ts` (CM-56 to CM-71). The annotation
// aggregate's one arm of the same shape (CM-49) is asserted beside its siblings
// in tests/unit/edit-annotation.test.ts.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES ANSWER TO (rule 03 §3: name the row, do not copy it)
// ---------------------------------------------------------------------------
//
//   FR-020 -- the trail's two stamping moments, and the sentence that says a
//             refused write and a write that changed nothing are neither of
//             them. `frame-loop.ts` keeps it by comparing the DOCUMENT
//             reference, which is why the answer has to BE the same object.
//   FR-063 -- the schedule instant moves for a write that moved the schedule
//             group and MUST NOT move for one that did not.
//             `document-change-plan.ts` reads that off the SCHEDULE reference.
//   NFR-013 -- why the comparison is per-field here rather than a deep one
//             where the references are tested.
//   表 T-108 CM-1..CM-5 (`Project`), CM-56..CM-71 (見せ方の群)
//   表 T-052 DR-2 / DR-3 -- which group each of those two writes into
//
// ---------------------------------------------------------------------------
// ⭐ THE CONTROL EVERY CASE CARRIES
// ---------------------------------------------------------------------------
//
// Each case asserts BOTH directions of the same arm, so that either wrong
// build goes red:
//
//   ① the value ALREADY HELD  -> the SAME object comes back.
//      ⛔ Red on the build being fixed, which answers a new document for every
//         write. That build is what DFC-378 measured.
//   ② a value that MOVES      -> a DIFFERENT object comes back, holding it.
//      ⛔ Red on the opposite wrong build -- an arm that answers the document
//         it was handed whatever it was asked. A fix that stops the trail
//         moving at all is worse than the defect, and this is the half that
//         says so.
//
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED, each searched for before being given up
//
//   1. THAT THE WATERMARK ITSELF DOES NOT MOVE. That is `frame-loop.ts`'s, and
//      it is measured on the shipped build rather than here.
//   2. HOW MANY UNDO STEPS THE NO-OP LEAVES. WS-4 of table T-067 chooses by
//      the command's KIND alone (`isUndoable`), never by whether the document
//      moved, so it is not this rule's to change -- and no row of docs/spec
//      says what a write that changed nothing should leave behind. 表 T-028's
//      IN-6 rules on the in-place field, which is a different entrance.
//      Reported rather than settled here.
//   3. `settingsUpdatedUtc` AND `lastEditedBy` ON A NO-OP. WS-5 advances both
//      unconditionally, which is outside this folder; case ① below asserts what
//      the aggregate owes and stops there.

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
import {
  editDocumentSettings,
  editProject,
  type DocumentSettingsCommand,
  type ProjectCommand,
} from '../../src/use-case/edit-document/edit-document'

// ---- fixtures --------------------------------------------------------------
//
// The same idiom the other unit files in this folder use: a whole Document is
// far more than these cases read, so the fixture carries the keys the two
// aggregates touch.

const documentOf = (part: Record<string, unknown> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: {
        title: 'Three-Year Product Plan',
        statusDate: '2026-03-02',
        themeHue: 214,
        startDate: null,
        name: 'a name',
        subject: null,
        category: null,
        company: null,
        manager: null,
        author: null,
        revision: 1,
        weekStartDay: 1,
        uidHighWaterMark: 9,
        calendarUid: null,
      },
      calendars: [],
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: [{ id: 'g1' }, { id: 'g2' }],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
      ...((part.schedule as Record<string, unknown>) ?? {}),
    },
    documentSettings: {
      stackDirection: 'up',
      guideCursorMode: 'none',
      dualCursor: null,
      fontScale: 'M',
      fontScaleSizes: { S: 12, M: 14, L: 16 },
      rulerFont: 14,
      // S-136 and the rule SETTINGS_DERIVED carries for the band: 14 * 3 + 2 * 3.
      rulerLabelPad: 2,
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
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
      themePreference: 'light',
      themeMonochrome: false,
      dependencyVisible: true,
      ...((part.documentSettings as Record<string, unknown>) ?? {}),
    },
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'template',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

const planOf = (document: Document, commands: readonly DocumentCommand[]) =>
  planDocumentChange({
    document,
    readStamp: document.documentStamp,
    commands,
    moment: CALM,
    history: EMPTY_HISTORY,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'agent',
    updatedUtc: '2026-08-17T01:00:00Z',
  })

/**
 * The two halves of the rule, run over one arm.
 *
 * `standing` is the command that writes what the document already holds, and
 * `moving` the one that writes something else. Both are asserted every time --
 * see the control note at the head of this file.
 */
const bothWays = (
  run: (document: Document, command: never) => { ok: boolean; document?: Document },
  standing: unknown,
  moving: unknown,
  document: Document = documentOf(),
): void => {
  // ① the value already held: the SAME object.
  const same = run(document, standing as never)
  expect(same.ok).toBe(true)
  expect(same.document).toBe(document)
  // ② a value that moves: a DIFFERENT object.
  const moved = run(document, moving as never)
  expect(moved.ok).toBe(true)
  expect(moved.document).not.toBe(document)
}

const project = (document: Document, command: ProjectCommand) => editProject(document, command)
const settings = (document: Document, command: DocumentSettingsCommand) =>
  editDocumentSettings(document, command, LIMITS)

describe('EditProject (UF-17) -- CM-1 to CM-5 answer the same document when nothing moves', () => {
  it('CM-1 setProjectTitle -- the row DFC-378 was measured on', () => {
    bothWays(
      project as never,
      { kind: 'setProjectTitle', title: 'Three-Year Product Plan' },
      { kind: 'setProjectTitle', title: 'Another Plan' },
    )
  })

  it('CM-1 still REFUSES the empty string, which is a different answer again', () => {
    // FR-035's MUST NOT is not softened by the rule above: a refused write and
    // a write that changed nothing are two answers, and FR-028 has the caller
    // told which one it got. ⛔ Control: an arm that tested the value BEFORE
    // the refusal would answer `ok: true` here.
    const result = editProject(documentOf(), { kind: 'setProjectTitle', title: '' })
    expect(result.ok).toBe(false)
  })

  it('CM-2 setProjectProfile -- a bundle of columns that all say what they said', () => {
    bothWays(
      project as never,
      { kind: 'setProjectProfile', fields: { name: 'a name', revision: 1, startDate: null } },
      { kind: 'setProjectProfile', fields: { name: 'a name', revision: 2, startDate: null } },
    )
  })

  it('CM-2 writes only the columns that moved, and leaves the rest as they stand', () => {
    // The other half of the sweep: the arm answers a new document because ONE
    // of the three moved, and the two that did not are still what they were.
    // ⛔ Control: an arm that gave up on the first equal field would leave
    // `revision` at 1.
    const document = documentOf()
    const result = editProject(document, {
      kind: 'setProjectProfile',
      fields: { name: 'a name', revision: 2 },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.document.schedule.project as unknown as Record<string, unknown>
    expect(after.revision).toBe(2)
    expect(after.name).toBe('a name')
    expect(after.title).toBe('Three-Year Product Plan')
  })

  it('CM-3 setStatusDate -- the day the line already stands on', () => {
    bothWays(
      project as never,
      { kind: 'setStatusDate', date: '2026-03-02' },
      { kind: 'setStatusDate', date: '2026-03-03' },
    )
  })

  it('CM-4 clearStatusDate -- erasing a line that is not there', () => {
    // ⚠️ The two documents are the other way round here, because the state in
    // which this command has already had its way is the one with NO line.
    const empty = documentOf({ schedule: { project: { statusDate: null, themeHue: 214 } } })
    const cleared = editProject(empty, { kind: 'clearStatusDate' })
    expect(cleared.ok && cleared.document === empty).toBe(true)
    const standing = documentOf()
    const erased = editProject(standing, { kind: 'clearStatusDate' })
    expect(erased.ok).toBe(true)
    if (!erased.ok) return
    expect(erased.document).not.toBe(standing)
    expect(erased.document.schedule.project.statusDate).toBe(null)
  })

  it('CM-5 setThemeHue -- the hue the document already carries', () => {
    bothWays(
      project as never,
      { kind: 'setThemeHue', hue: 214 },
      { kind: 'setThemeHue', hue: 210 },
    )
  })
})

describe('EditDocumentSettings -- the presentation arms answer the same document too', () => {
  it('CM-56 setStackDirection', () => {
    bothWays(
      settings as never,
      { kind: 'setStackDirection', direction: 'up' },
      { kind: 'setStackDirection', direction: 'down' },
    )
  })

  it('CM-58 setElementVisible -- the key the command names, and no other', () => {
    bothWays(
      settings as never,
      { kind: 'setElementVisible', element: 'dependencyVisible', visible: true },
      { kind: 'setElementVisible', element: 'dependencyVisible', visible: false },
    )
  })

  it('CM-59 setGuideCursorMode', () => {
    bothWays(
      settings as never,
      { kind: 'setGuideCursorMode', mode: 'none' },
      { kind: 'setGuideCursorMode', mode: 'crosshair' },
    )
  })

  it('CM-60 setDualCursor -- the pair is compared by its two DATES, not by the object', () => {
    // ⛔ THE ONE ARM THE SHARED TEST CANNOT REACH: the value written is built
    // fresh, so a reference comparison would call every write a change. This
    // case is what keeps that arm's own test in place.
    const placed = documentOf({
      documentSettings: { dualCursor: { date1: '2026-03-01', date2: '2026-03-05' } },
    })
    bothWays(
      settings as never,
      { kind: 'setDualCursor', date1: '2026-03-01', date2: '2026-03-05' },
      { kind: 'setDualCursor', date1: '2026-03-01', date2: '2026-03-06' },
      placed,
    )
  })

  it('CM-61 clearDualCursor -- clearing a pair that is not there', () => {
    const empty = documentOf()
    const already = editDocumentSettings(empty, { kind: 'clearDualCursor' }, LIMITS)
    expect(already.ok && already.document === empty).toBe(true)
    const placed = documentOf({
      documentSettings: { dualCursor: { date1: '2026-03-01', date2: '2026-03-05' } },
    })
    const cleared = editDocumentSettings(placed, { kind: 'clearDualCursor' }, LIMITS)
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) return
    expect(cleared.document).not.toBe(placed)
    expect(cleared.document.documentSettings.dualCursor).toBe(null)
  })

  it('CM-62 setFontScale -- the three keys it writes are judged together', () => {
    // ⚠️ Not `fontScale` alone: the arm also writes `rulerFont` and
    // `rulerHeight`, and FR-039 has both FOLLOW the scale. A document whose
    // derived pair had drifted must still be repaired, which is why the test
    // is on the whole part rather than on the one key a person chose.
    bothWays(
      settings as never,
      { kind: 'setFontScale', scale: 'M' },
      { kind: 'setFontScale', scale: 'L' },
    )
  })

  it('CM-62 still repairs a document whose derived pair drifted from the scale it names', () => {
    // ⛔ Control for the case above: an arm that compared `fontScale` alone
    // would answer this document untouched and leave `rulerFont` at 99.
    const drifted = documentOf({ documentSettings: { fontScale: 'M', rulerFont: 99 } })
    const result = editDocumentSettings(drifted, { kind: 'setFontScale', scale: 'M' }, LIMITS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document).not.toBe(drifted)
    expect(result.document.documentSettings.rulerFont).toBe(14)
  })

  it('CM-63 setThemePreference', () => {
    bothWays(
      settings as never,
      { kind: 'setThemePreference', preference: 'light' },
      { kind: 'setThemePreference', preference: 'dark' },
    )
  })

  it('CM-64 setThemeMonochrome', () => {
    bothWays(
      settings as never,
      { kind: 'setThemeMonochrome', monochrome: false },
      { kind: 'setThemeMonochrome', monochrome: true },
    )
  })

  it('CM-65 setZoom -- compared AFTER the clamp, because the clamp is what is written', () => {
    bothWays(
      settings as never,
      { kind: 'setZoom', zoomX: 1, zoomY: 1 },
      { kind: 'setZoom', zoomX: 2, zoomY: 1 },
    )
    // ⛔ Control: a zoom past S-98 is clamped to the value already held, so
    // the write moves nothing and the same document has to come back. An arm
    // that compared the value it was HANDED would answer a new one.
    const document = documentOf({ documentSettings: { zoomX: 64, zoomY: 1 } })
    const result = editDocumentSettings(
      document,
      { kind: 'setZoom', zoomX: 1000, zoomY: 1 },
      LIMITS,
    )
    expect(result.ok && result.document === document).toBe(true)
  })

  it('CM-66 setScrollPosition -- the anchor pair and its two fractions', () => {
    bothWays(
      settings as never,
      {
        kind: 'setScrollPosition',
        scrollDate: null,
        scrollGroupId: null,
        scrollDayOffset: 0,
        scrollGroupOffset: 0,
      },
      {
        kind: 'setScrollPosition',
        scrollDate: '2026-03-02',
        scrollGroupId: 'g1',
        scrollDayOffset: 0,
        scrollGroupOffset: 0,
      },
    )
  })

  it('CM-67 setPanelWidths -- the two widths the document already stands at', () => {
    bothWays(
      settings as never,
      { kind: 'setPanelWidths', rowTitlePanelWidth: 170, propertyPanelWidth: 280 },
      { kind: 'setPanelWidths', rowTitlePanelWidth: 171, propertyPanelWidth: 280 },
    )
  })

  it('CM-67 still REFUSES a pair that would take the Row Area to zero', () => {
    // ⛔ Control: the refusals come first, so the rule above cannot swallow
    // one. FR-052's MUST NOT is judged on the pair, whatever the document
    // already holds.
    const result = editDocumentSettings(
      documentOf(),
      { kind: 'setPanelWidths', rowTitlePanelWidth: 0, propertyPanelWidth: 280 },
      LIMITS,
    )
    expect(result.ok).toBe(false)
  })

  it('CM-71 fitScheduleToScreen -- a fit onto the view the document already describes', () => {
    bothWays(
      settings as never,
      {
        kind: 'fitScheduleToScreen',
        zoomX: 1,
        zoomY: 1,
        scrollDate: null,
        scrollGroupId: null,
        scrollDayOffset: 0,
        scrollGroupOffset: 0,
      },
      {
        kind: 'fitScheduleToScreen',
        zoomX: 3,
        zoomY: 1,
        scrollDate: null,
        scrollGroupId: null,
        scrollDayOffset: 0,
        scrollGroupOffset: 0,
      },
    )
  })
})

describe('FR-063 -- what the write path reads off the reference the arms keep', () => {
  it('a no-op CM-1 moves neither hasMovedSchedule nor the schedule instant', () => {
    // ⭐ THE MEASUREMENT DFC-378 RECORDED, as a case. The shipped build answered
    // `hasMovedSchedule: true` for this very write, because the arm rebuilt
    // `document.schedule` and `hasMovedScheduleGroup` compares that reference.
    // ⛔ Control: the ② case below must stay true, or an arm that answered the
    // same document whatever it was asked would pass this one.
    const document = documentOf()
    const plan = planOf(document, [
      { kind: 'setProjectTitle', title: 'Three-Year Product Plan' } as DocumentCommand,
    ])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.hasMovedSchedule).toBe(false)
    expect(plan.document.documentStamp.scheduleUpdatedUtc).toBe('2026-08-17T00:00:00Z')
  })

  it('a CM-1 that DOES move the title still moves both', () => {
    const plan = planOf(documentOf(), [
      { kind: 'setProjectTitle', title: 'Another Plan' } as DocumentCommand,
    ])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.hasMovedSchedule).toBe(true)
    expect(plan.document.documentStamp.scheduleUpdatedUtc).toBe('2026-08-17T01:00:00Z')
  })

  it('a no-op on the presentation group leaves the schedule instant alone either way', () => {
    // ⚠️ `hasMovedSchedule` was already false for this arm before DFC-378 -- the
    // presentation group is not the schedule group -- so what this case adds is
    // the DOCUMENT reference: FR-020's trail is read off that one, not off the
    // schedule's. ⛔ Control: the ② half is the case above it in this file.
    const document = documentOf()
    const plan = planOf(document, [
      { kind: 'setThemePreference', preference: 'light' } as DocumentCommand,
    ])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.hasMovedSchedule).toBe(false)
    expect(plan.document.schedule).toBe(document.schedule)
    expect(plan.document.documentSettings).toBe(document.documentSettings)
  })
})
