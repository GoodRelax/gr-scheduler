// Unit test: a write that changes nothing answers the same document (DFC-378).

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
import { specTable } from '../contract/spec-table'

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'

// see S-3, T-201
const RULER_FONT_FACTOR = ((): number => {
  const cell = specTable('T-201').rows.find((one) => one.id === 'S-3')?.by['既定値'] ?? ''
  const found = /×\s*(\d+(?:\.\d+)?)/.exec(cell)
  if (found === null) throw new Error(`S-3 states no factor: ${cell}`)
  return Number(found[1])
})()

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
      // WHY: the pair agrees with fontScale M (S-3 x the T-201 factor, S-2 = x3 + pad x3), so CM-62 on M changes nothing.
      rulerFont: 14 * RULER_FONT_FACTOR,
      rulerLabelPad: 2,
      rulerHeight: 14 * RULER_FONT_FACTOR * 3 + 2 * 3,
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
    defaultRowName: DEFAULT_ROW_NAME_FIXTURE,
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

const bothWays = (
  run: (document: Document, command: never) => { ok: boolean; document?: Document },
  standing: unknown,
  moving: unknown,
  document: Document = documentOf(),
): void => {
  const same = run(document, standing as never)
  expect(same.ok).toBe(true)
  expect(same.document).toBe(document)
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
    // TRAP: a write path that checked the value before the refusal would
    // answer ok: true here instead of failing FR-035's MUST NOT.
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
    // TRAP: an arm that gave up after the first equal field would leave
    // revision at 1 instead of writing the one field that moved.
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
    // WHY: the two documents are swapped here -- the state where this command
    // already had its way is the one with no line, not the default fixture.
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
    // WHY: bothWays cannot reach this arm -- the value written is built fresh,
    // so a plain reference compare would call every write a change.
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
    // WHY: fontScale drives rulerFont and rulerHeight too (FR-039), so a
    // drifted derived pair must be repaired -- tested as a whole, not one key.
    bothWays(
      settings as never,
      { kind: 'setFontScale', scale: 'M' },
      { kind: 'setFontScale', scale: 'L' },
    )
  })

  it('CM-62 still repairs a document whose derived pair drifted from the scale it names', () => {
    // TRAP: an arm comparing fontScale alone would answer this document
    // untouched and leave rulerFont at 99.
    const drifted = documentOf({ documentSettings: { fontScale: 'M', rulerFont: 99 } })
    const result = editDocumentSettings(drifted, { kind: 'setFontScale', scale: 'M' }, LIMITS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document).not.toBe(drifted)
    const sizeM = (drifted.documentSettings.fontScaleSizes as unknown as Record<string, number>)['M']!
    expect(result.document.documentSettings.rulerFont, 'S-3: fontScaleSizes[fontScale] x the T-201 factor').toBe(
      sizeM * RULER_FONT_FACTOR,
    )
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
    // TRAP: an arm comparing the value it was handed, not the clamped result,
    // would answer a new document even though the clamp writes nothing.
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
    // WHY: the refusal check runs before the no-op rule, so FR-052's MUST NOT
    // still applies no matter what the document already holds.
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
    // TRAP: the case below (a write that DOES move the title) must stay
    // green, or an arm that always answers the same document would pass this too.
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
    // WHY: hasMovedSchedule is already false for this arm; what this case
    // adds is the DOCUMENT reference, which is what FR-020's trail reads.
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
