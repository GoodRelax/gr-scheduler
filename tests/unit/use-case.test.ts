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
// ⭐ RD-1 of table T-230 puts UndoEdit in WS-3's position, so one press of undo
// is `undoEdit` over the held pair. The pair-of-writes case below needs it.
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
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
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

// `rowAreaWidthWithoutPanels` is what the caller reads off the frame's
// ScreenRegions (CS-1) and hands over: with a 1000px canvas, `canvasPadding`
// 10 and an 8px vertical scrollbar, regionsFromScreen leaves 982 once the two
// panels are added back. The arithmetic is layoutEngine's, not this file's.
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
      return plan.history.done[0]!.sizeBytes
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
  it('WS-1 turns away a writer that read a stamp that is not this one', () => {
    // AG-2: 「食い違えば書き込みを拒否して現在の文書を返すこと（MUST）」.
    const document = documentOf()
    const plan = planOf(document, [{ kind: 'clearStatusDate' }], {
      readStamp: { ...document.documentStamp, scheduleUpdatedUtc: '2026-08-17T00:00:02Z' },
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.refusal).toEqual({ step: 'WS-1', reason: 'staleStamp' })
  })

  it('WS-1 refuses on any ONE of the three differing, EARLIER stamps included', () => {
    // AG-2: 「照合は刻印の 3 つすべての等値で行うこと（MUST）。1 つでも違えば拒否
    // すること（MUST）」. FR-063 leaves the schedule instant alone for a
    // presentation write, so only lastEditedBy and settingsUpdatedUtc can tell
    // that one happened -- and FR-063 forbids reading any of the three as an
    // order (MUST NOT), so a stamp that reads EARLIER is a mismatch just the
    // same, not a stale-but-harmless one.
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

  it('WS-5 moves the schedule instant for the schedule group and not for the presentation group', () => {
    const document = documentOf()
    const schedule = planOf(document, [{ kind: 'setProjectTitle', title: 'B' }])
    expect(schedule.ok && schedule.hasMovedSchedule).toBe(true)
    expect(schedule.ok && schedule.document.documentStamp.scheduleUpdatedUtc).toBe(
      '2026-08-17T01:00:00Z',
    )

    const presentation = planOf(document, [{ kind: 'setStackDirection', direction: 'down' }])
    expect(presentation.ok && presentation.hasMovedSchedule).toBe(false)
    // FR-063 (MUST NOT): 「見せ方の群だけを変える更新で、日程データの群の刻を
    // 動かしてはならない」 -- so it still reads as it did before the write.
    expect(presentation.ok && presentation.document.documentStamp.scheduleUpdatedUtc).toBe(
      document.documentStamp.scheduleUpdatedUtc,
    )
    // FR-063 (MUST): who wrote last and the instant EITHER group moved at are
    // replaced either way.
    expect(presentation.ok && presentation.document.documentStamp.settingsUpdatedUtc).toBe(
      '2026-08-17T01:00:00Z',
    )
  })

  // ---- one fit press, two writes (FR-031) ---------------------------------
  //
  // ⛔ FR-031 (MUST / MUST NOT): 「全体表示の 1 回の押下は、2 つの書き込みに
  // 分けて行うこと（MUST）。順序を入れ替えてはならない（MUST NOT）」 ——
  // 「① 倍率と表示位置を置く（表 T-108 の `CM-71`。表 T-027 の `UN-8` により段を
  // 積まない） ② 畳んだ行をすべて開く（同 `CM-72`。`UN-17` により段を 1 つ積む）」.
  //
  // The three cases below are that sentence, one half at a time and then the
  // pair. ⚠️ The two cases they replace read the OLD shape, in which CM-71
  // did both halves in one write: one of them asserted that a lone fit moved
  // the schedule instant and pushed a step, which the sentence above now makes
  // wrong, and the other ("no collapse to discard") had a premise that CM-71
  // can no longer have at all -- it is folded into the CM-71 case, which now
  // asserts the stronger thing: the schedule instant stays put even when there
  // IS a collapsed row sitting in the document.

  it('CM-71 over a document with a collapsed row places zoom and scroll only, pushing no step (UN-8) and leaving the schedule instant (FR-063)', () => {
    // ⛔ T-108 CM-71 reads 「全体が収まる倍率と表示位置を置く」 -- the collapse
    // half of the press is CM-72's, so a row that is collapsed stays collapsed
    // through this write.
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
        // FR-080 (MUST): the anchors carry a fraction of their own extent as
        // well, so 表示位置 is four values and not two. A whole-view fit lands
        // on the top-left of the anchors it chose, so both fractions are 0.
        scrollDayOffset: 0,
        scrollGroupOffset: 0,
      },
    ])
    expect(plan.ok).toBe(true)
    if (!plan.ok) return

    // 「倍率と表示位置を置く」: S-75 / S-76 and S-77 / S-78.
    expect(plan.document.documentSettings.zoomX).toBe(2)
    expect(plan.document.documentSettings.zoomY).toBe(2)
    expect(plan.document.documentSettings.scrollDate).toBe('2026-03-01')
    expect(plan.document.documentSettings.scrollGroupId).toBe('g1')
    // ...and nothing else. The collapse is CM-72's half.
    expect(plan.document.schedule.taskGroups[0]!.isCollapsed).toBe(true)

    // ⛔ UN-8 of table T-027 lists ズーム・スクロール・パン as 対象外, and WS-4
    // (MUST NOT) 「本表の欄が『積まない』の行で取り消しの 1 段を積んではならない」.
    expect(plan.history.done).toHaveLength(0)

    // ⛔ FR-063 (MUST NOT): 「見せ方の群だけを変える更新で、日程データの群の刻を
    // 動かしてはならない」. CM-71 is filed under 見せ方の群 in T-108's group
    // column, and this write touches nothing else -- so the answer is no even
    // with a collapsed row in the document, which is what the case this
    // replaces was reaching for with its "no collapse to discard" premise.
    expect(plan.hasMovedSchedule).toBe(false)
    expect(plan.document.documentStamp.scheduleUpdatedUtc).toBe(
      document.documentStamp.scheduleUpdatedUtc,
    )
    // FR-063 (MUST): 「どちらの群であれ動いた刻と、最後に書いた者は、見せ方の群
    // だけを変えたときも更新すること」.
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

    // ⛔ T-108 CM-72 reads 「畳んだ行をすべて開く」 and HF-8 (MUST) 「人が全体表示
    // （`FR-055`）を求めたとき、人が畳んだ状態をすべて捨てること」 -- every row,
    // not the first one. ⚠️ Whether "discarded" lands on `false` or on `null`
    // is not settled anywhere: AT-56 makes the column nullable and no rule
    // picks between the two, so the case asserts what the rule does say (the
    // row is not collapsed) and refuses a missing key, which FR-024 forbids.
    for (const group of plan.document.schedule.taskGroups) {
      expect([false, null]).toContain(group.isCollapsed)
    }
    // ⛔ HF-8: 「捨てるのは畳みだけであり、隠した状態は残す」.
    expect(plan.document.schedule.taskGroups[1]!.isHidden).toBe(true)

    // ⛔ FR-031 (MUST): 「1 回の全体表示（`FR-055`）も 1 段にまとめること」 ——
    // 「捨てた畳みを 1 行ずつ戻すことになると、積む段数がその文書の行数で決まって
    // しまう」. Two rows were opened; ONE step is the whole press.
    expect(plan.history.done).toHaveLength(1)

    // ⛔ UN-17 of table T-027 files 「全体表示が人の畳んだ状態を捨てること」 under
    // 対象, and `isCollapsed` is a `TaskGroup` column -- the schedule-data
    // group -- so FR-063 (MUST) 「日程データの群の刻を動かすのは、日程データの群
    // を変える更新とすること」 applies.
    expect(plan.hasMovedSchedule).toBe(true)
    expect(plan.document.documentStamp.scheduleUpdatedUtc).toBe('2026-08-17T01:00:00Z')
  })

  it('one press written CM-71 then CM-72 and undone once brings the collapse back while the new zoom stays (FR-031, UN-8 + UN-17)', () => {
    // ⭐ THE ORDER IS THE POINT. FR-031: 「表 T-067 の `WS-4` が積むのは、その
    // 書き込みの前の文書である。したがって ② が積む段は既に新しい倍率を持って
    // おり、取り消すと倍率は新しいまま畳みだけが戻る」. ⚠️ And the reason the
    // reverse is a MUST NOT: 「1 つにまとめて書くと、段が古い倍率ごと持つので、
    // 取り消しが `UN-8` を破る」.
    const start = documentOf({
      schedule: { taskGroups: [{ id: 'g1', isCollapsed: true, isHidden: false }] },
    })

    // ① CM-71 -- 倍率と表示位置を置く. UN-8: no step.
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

    // ② CM-72 -- 畳んだ行をすべて開く, written against what ① left. A second
    // WRITE, not a second command in ①'s bundle: FR-031 says 「2 つの書き込みに
    // 分けて行うこと（MUST）」.
    const second = planOf(first.document, [{ kind: 'expandAllTaskGroups' }], {
      history: first.history,
      updatedUtc: '2026-08-17T02:00:00Z',
    })
    expect(second.ok).toBe(true)
    if (!second.ok) return

    // The whole press left exactly one step (FR-031: 1 段にまとめること).
    expect(second.history.done).toHaveLength(1)
    // ⭐ WS-4 pushes the document as it stood BEFORE ②, and ① had already
    // written the zoom -- so the step carries the NEW zoom, not the old one.
    // This is the assertion the MUST NOT on the order lives or dies by.
    expect(second.history.done[0]!.step.document.documentSettings.zoomX).toBe(4)

    // One press of undo (FR-031 / RD-1 of table T-230, whose WS-3 is UndoEdit).
    const undone = undoEdit({ document: second.document, history: second.history })
    expect(undone.undone).toBe(true)
    // ⛔ UN-17: 「全体表示が人の畳んだ状態を捨てること」 is 対象, so the collapse
    // comes back.
    expect(undone.next.document.schedule.taskGroups[0]!.isCollapsed).toBe(true)
    // ⛔ UN-17's own ⚠️ note: 「戻るのは畳みだけであり、倍率と表示位置は `UN-8` の
    // まま対象外である」. The zoom stays where ① put it.
    expect(undone.next.document.documentSettings.zoomX).toBe(4)
    expect(undone.next.document.documentSettings.zoomY).toBe(4)
    // Nothing is left to undo: the press was one step, not two.
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
        // The subscriber must be able to read the NEW document, which is the
        // whole reason table T-067 fixes this order.
        expect(given.schedule.project.title).toBe('B')
        expect(held.document).toBe(given)
        // ⭐ AG-6 selects a live watcher by WS-5's judgement (MUST), and R2.7
        // keeps that judgement in ONE place: it is carried out to the audience
        // rather than derived a second time from the stamp. The title is
        // schedule data, so it is true here.
        expect(hasMovedSchedule).toBe(true)
      },
    }
    const outcome = applyDocumentChange(
      {
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
              readStamp: given.documentStamp,
              commands: [{ kind: 'setProjectTitle', title: 'C' }],
              moment: CALM,
              historyLimits: HISTORY_LIMITS,
              settingsLimits: LIMITS,
              editedBy: 'agent',
              updatedUtc: '2026-08-17T02:00:00Z',
            },
            holder,
            audience,
          ),
        )
      },
    }

    const outcome = applyDocumentChange(
      {
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
    // That delivery ended, badly but it ended. Chapter 5.5 refuses writes
    // DURING the delivery, not for the rest of the run.
    expect(writeOf('C', { deliver: () => undefined }).accepted).toBe(true)
  })
})
