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
  type ApplyOutcome,
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
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'

// Every key DocumentSettings declares, at the value the manuscript states.
//
// ⚠️ This used to be a hand-written list of the twenty keys these cases read,
// each with its default re-typed here. A key added to table T-201 then never
// reached the fixture: CR-200 added `rulerLabelPad` (S-136), S-2's default
// started to read it, and the band height came out NaN because the fixture had
// no such key -- the case below could not have caught the change it exists to
// catch. tests/unit/layout-engine.test.ts has taken its settings from
// SETTINGS_DEFAULTS since CR-175 for the same reason; this is that shape.
//
// SETTINGS_DEFAULTS writes a nested key with a dot (`fontScaleSizes.M`), so
// the dotted names are expanded into the nested objects the type declares.
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
      ...DEFAULT_SETTINGS,
      ...((part.documentSettings as Record<string, unknown>) ?? {}),
    },
    revisionStamp: { revision: 3, lastEditedBy: 'user', updatedAt: '2026-08-17T00:00:00' },
    changeLog: [],
  }) as unknown as Document

// `rowAreaWidthWithoutPanels` is what the caller reads off the frame's
// ScreenRegions (CS-1) and hands over: with a 1000px canvas, `canvasPadding`
// 10 and an 8px vertical scrollbar, regionsFromScreen leaves 982 once the two
// panels are added back. The arithmetic is layoutEngine's, not this file's.
const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }
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

describe('ApplyDocumentChange -- how big one undo step is (FR-031)', () => {
  // ⛔ FR-031 (MUST): 「1 段の大きさは、その段の保存形を UTF-8 で符号化した長さ
  // （バイト）で測ること」、and (MUST NOT) 「文字数で測ってはならない」. S-95 is
  // written in megabytes, so counting characters ran the bound about three
  // times loose on Japanese text -- which is what this file used to do, saying
  // in as many words that the measure was its own decision (CR-182).
  it('measures the stored form in bytes, not characters', () => {
    // ⚠️ The step measures the document BEFORE the edit -- that is what undo
    // restores -- so the two documents differ in their starting title.
    // Both titles are FIVE characters: counting characters makes the two steps
    // cost the same, counting UTF-8 bytes makes the Japanese one cost 2 more
    // per character. The difference IS the measure.
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
      return plan.history.done[0]!.size
    }

    // Each of the five characters is three bytes where a letter is one.
    expect(sizeOf(japanese) - sizeOf(ascii)).toBe([...japanese].length * 2)
  })
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
    // 982 - 600 - 400 leaves the Row Area at or below zero. The pair passes
    // one at a time (600 and 400 each fit on their own) and fails together,
    // which is the MUST NOT.
    const tooWide = editDocumentSettings(
      documentOf(),
      { kind: 'setPanelWidths', rowTitlePanelWidth: 600, propertyPanelWidth: 400 },
      LIMITS,
    )
    expect(tooWide.ok).toBe(false)
    if (!tooWide.ok) expect(tooWide.refusals[0]!.rule).toBe('FR-052')
  })

  it('FR-052 refuses a row title panel of zero, which SC-3 forbids', () => {
    // The scrollbar term is in `rowAreaWidthWithoutPanels`, so a pair that
    // only fits when the scrollbar is forgotten is refused: 982 - 972 - 10
    // is at zero, while the old screen-width copy left 1000 - 10 - 972 - 10.
    const grazing = editDocumentSettings(
      documentOf(),
      { kind: 'setPanelWidths', rowTitlePanelWidth: 972, propertyPanelWidth: 10 },
      LIMITS,
    )
    expect(grazing.ok).toBe(false)
    // MUST NOT: width 0 breaks SC-3's "showing at every zoom", so it is
    // refused even though the Row Area would be at its widest.
    const flat = editDocumentSettings(
      documentOf(),
      { kind: 'setPanelWidths', rowTitlePanelWidth: 0, propertyPanelWidth: 280 },
      LIMITS,
    )
    expect(flat.ok).toBe(false)
    if (!flat.ok) expect(flat.refusals[0]!.rule).toBe('FR-052')
    // S-80 puts no such floor under the properties panel: zero is legitimate.
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
    // ⛔ FR-039 (MUST): 「文字サイズの変更は目盛にも及ぶこと」 -- the ruler type
    // and the band height follow it and their saved values are rewritten, and
    // the requirement names the two rows that hold them: S-3 and S-2.
    //
    //   S-3  `fontScaleSizes[fontScale]`                    (S = 12 / M = 14 / L = 16)
    //   S-2  `rulerFont` x 3 + `rulerLabelPad` x 3          (S = 42 / M = 48 / L = 54)
    //
    // Three tiers of type plus three tiers of padding: the band carries "文字と
    // 余白" for each of its three tiers, and the padding is S-136's own key.
    // Only the two 3s are transcribed from the cell -- every number they
    // multiply is read from SETTINGS_DEFAULTS, which `npm run gen` prints from
    // the manuscript. ⚠️ This case used to spell the whole thing `16 * 3 + 6`,
    // and that 6 named nothing: when CR-200 replaced it with a key the copy
    // could only go stale.
    const sizeL = SETTINGS_DEFAULTS['fontScaleSizes.L'] as number
    const pad = SETTINGS_DEFAULTS['rulerLabelPad'] as number
    const result = editDocumentSettings(documentOf(), { kind: 'setFontScale', scale: 'L' }, LIMITS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(settingsOf(result.document).rulerFont).toBe(sizeL)
    expect(settingsOf(result.document).rulerHeight).toBe(sizeL * 3 + pad * 3)

    // 04-verification section 2: a value that comes from the manuscript is
    // only shown to ARRIVE when moving it moves the answer. A document that
    // saved a wider `rulerLabelPad` has to get a band three pixels taller per
    // pixel of padding; a bare 6 in the arithmetic leaves this flat.
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
      replace: (next) => {
        seen.push('replace')
        held = next
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

  it('WS-2 refuses a write made from inside the delivery, and swaps only once', () => {
    // Chapter 5.5 (MUST): 通知を配っているあいだの書き込みは拒否すること。
    // The subscriber cannot know -- it builds its own WriteMoment and says
    // deliveringNotices: false in perfect good faith -- so the refusal has to
    // come from the site that is running WS-7.
    const document = documentOf()
    let held: HeldDocument = { document, history: EMPTY_HISTORY }
    let replaced = 0
    const holder: DocumentHolder = {
      read: () => held,
      replace: (next) => {
        replaced += 1
        held = next
      },
    }
    const nested: ApplyOutcome[] = []
    const audience: ChangeAudience = {
      deliver: (given) => {
        nested.push(
          applyDocumentChange(
            {
              readStamp: given.revisionStamp,
              commands: [{ kind: 'setProjectTitle', title: 'C' }],
              moment: CALM,
              historyLimits: HISTORY_LIMITS,
              settingsLimits: LIMITS,
              editedBy: 'agent',
              updatedAt: '2026-08-17T02:00:00',
            },
            holder,
            audience,
          ),
        )
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
    // AG-9a's shape, refused at WS-2 exactly as the chapter says.
    expect(nested).toEqual([
      { accepted: false, refusal: { step: 'WS-2', reason: 'deliveringNotices' } },
    ])
    // The nested write reached neither WS-6 nor WS-7: one swap, and the
    // document the others are still being told about is the current one.
    expect(replaced).toBe(1)
    expect(held.document.schedule.project.title).toBe('B')
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
          readStamp: held.document.revisionStamp,
          commands: [{ kind: 'setProjectTitle', title }],
          moment: CALM,
          historyLimits: HISTORY_LIMITS,
          settingsLimits: LIMITS,
          editedBy: 'user',
          updatedAt: '2026-08-17T01:00:00',
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
    // That delivery ended, badly but it ended. Chapter 5.5 refuses writes
    // DURING the delivery, not for the rest of the run.
    expect(writeOf('C', { deliver: () => undefined }).accepted).toBe(true)
  })
})
