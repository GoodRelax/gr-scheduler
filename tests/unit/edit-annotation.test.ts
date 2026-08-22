// Unit tests for EditAnnotation (UF-14), the annotation aggregate.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.
//
// ⭐ Every expectation below is read off docs/spec, never off the unit under
// test. The rows involved are CM-46 to CM-55 of table T-108, and the rules are
// FR-019 (whose MUSTs sit in its RATIONALE, not its STATEMENT), FR-097,
// FR-063 with DR-2 of table T-052, CD-4 of table T-050, S-132 of table T-217,
// and IV-1 / IV-2 of table T-220.
//
// ⚠️ The unit is imported through `edit-document.ts`, the folder's public
// entry: Chapter 5.3 forbids anything outside the folder reaching another file
// of it (MUST NOT).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import type { CommentBox, HighlightBox } from '../../src/entity/document-model/schedule/schedule'
import type {
  ChangeStep,
  DocumentCommand,
  SettingsLimits,
  WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import { editAnnotation, type AnnotationCommand } from '../../src/use-case/edit-document/edit-document'

// ---- fixtures --------------------------------------------------------------
//
// A whole Document is far more than these cases read, so they carry the keys
// the aggregate actually touches. Same idiom as the other unit files.

/** The six columns AT-110 to AT-115 give a `CommentBox`, every nullable one spelled. */
const commentBoxOf = (part: Partial<CommentBox> = {}): CommentBox => ({
  id: 'c1',
  leaderShapeKind: null,
  text: null,
  anchorDate: '2026-03-02',
  anchorGroupId: 'g1',
  bodyOffsetPx: null,
  ...part,
})

/** The seven columns AT-116 to AT-122 give a `HighlightBox`, every nullable one spelled. */
const highlightBoxOf = (part: Partial<HighlightBox> = {}): HighlightBox => ({
  id: 'h1',
  startDate: '2026-03-01',
  endDate: '2026-03-31',
  topGroupId: 'g1',
  bottomGroupId: 'g2',
  strokeColor: null,
  cornerRadiusPx: 4,
  ...part,
})

const documentOf = (part: Record<string, unknown> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      // DR-2 of table T-052 -- the twelve keys of the schedule group.
      project: { title: 'A', statusDate: null, themeHue: 214, startDate: null },
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
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const ANCHOR = { date: '2026-03-02', groupId: 'g2' }
const RANGE = {
  startDate: '2026-03-01',
  endDate: '2026-03-31',
  topGroupId: 'g1',
  bottomGroupId: 'g2',
}

/** P-19 of the glossary: `'transparent'` is a value a colour column can take, and is not `null`. */
const TRANSPARENT = 'transparent'

// The plan fixture, for the one case that asks what FR-063 does with an
// annotation. Same shape as tests/unit/use-case.test.ts.
const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSize: 64 * 1024 * 1024 }
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
    editedBy: 'user',
    updatedUtc: '2026-08-17T01:00:00Z',
  })

describe('EditAnnotation (UF-14) -- the CommentBox group, CM-46 to CM-51', () => {
  it('FR-019 pins a new comment box by a date and a row IDENTIFIER, never by the row ordinal', () => {
    const create = { kind: 'createCommentBox', id: 'c1', anchor: ANCHOR } as const
    const asWritten = editAnnotation(documentOf(), create)
    // MUST NOT (FR-019): 行を順番で参照してはならない -- 「順番で持つと並べ替え
    // で別の行を指す」. 'g2' sits at index 1 in one document and at index 0 in
    // the other, so a stored ordinal would make these two disagree.
    const reordered = editAnnotation(
      documentOf({ schedule: { taskGroups: [{ id: 'g2' }, { id: 'g1' }] } }),
      create,
    )
    expect(asWritten.ok && reordered.ok).toBe(true)
    if (!asWritten.ok || !reordered.ok) return
    const box = asWritten.document.schedule.commentBoxes[0]!
    // FR-019 STATEMENT: 「その位置を日付と行の識別子で持つこと」.
    expect(box.anchorDate).toBe('2026-03-02')
    expect(box.anchorGroupId).toBe('g2')
    expect(reordered.document.schedule.commentBoxes).toEqual([box])
  })

  it('AT-110..AT-115 give the new box all six columns, the unset ones null', () => {
    const result = editAnnotation(documentOf(), {
      kind: 'createCommentBox',
      id: 'c1',
      anchor: ANCHOR,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const box = result.document.schedule.commentBoxes[0]!
    expect(box.id).toBe('c1')
    // FR-024 keeps the null columns of the schedule group as keys ("値が `null`
    // の列も鍵ごと書き出すこと"), so the row a command creates has to hold them.
    // AT-111 / AT-112 / AT-115 are all 可 (nullable) and CM-46 sets none of them.
    expect(box.leaderShapeKind).toBeNull()
    expect(box.text).toBeNull()
    expect(box.bodyOffsetPx).toBeNull()
  })

  it('IV-1 refuses a comment box whose id is already in the array', () => {
    const document = documentOf({ schedule: { commentBoxes: [commentBoxOf({ id: 'c1' })] } })
    const result = editAnnotation(document, { kind: 'createCommentBox', id: 'c1', anchor: ANCHOR })
    expect(result.ok).toBe(false)
    // IV-1 of table T-220: 主キーの値が、それが並ぶ配列の中で重複しないこと。
    // `CommentBox.id` is the PK column (AT-110).
    if (!result.ok) expect(result.refusals[0]!.rule).toBe('IV-1')
    // AG-9a wants the refusal to name what was refused, and T-108 fixes the name.
    if (!result.ok) expect(result.refusals[0]!.command).toBe('CM-46')
  })

  it('IV-2 refuses an anchor row that is not in the document, on create and on move', () => {
    // IV-2 of table T-220: 外部キーが非 `null` のとき、それが指す先の行が同じ
    // 文書にあること。`anchorGroupId` (AT-114) is the FK to `TaskGroup` (RL-18).
    const created = editAnnotation(documentOf(), {
      kind: 'createCommentBox',
      id: 'c1',
      anchor: { date: '2026-03-02', groupId: 'ghost' },
    })
    expect(created.ok).toBe(false)
    if (!created.ok) expect(created.refusals[0]!.rule).toBe('IV-2')

    const document = documentOf({ schedule: { commentBoxes: [commentBoxOf()] } })
    const moved = editAnnotation(document, {
      kind: 'setCommentBoxAnchor',
      id: 'c1',
      anchor: { date: '2026-03-02', groupId: 'ghost' },
    })
    expect(moved.ok).toBe(false)
    if (!moved.ok) expect(moved.refusals[0]!.rule).toBe('IV-2')
  })

  it('CM-50 moves the anchor to another date and row identifier', () => {
    const document = documentOf({ schedule: { commentBoxes: [commentBoxOf()] } })
    const result = editAnnotation(document, {
      kind: 'setCommentBoxAnchor',
      id: 'c1',
      anchor: { date: '2026-04-09', groupId: 'g2' },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const box = result.document.schedule.commentBoxes[0]!
    expect([box.anchorDate, box.anchorGroupId]).toEqual(['2026-04-09', 'g2'])
  })

  it('FR-019 refuses an anchor date that is not a date', () => {
    // FR-019 STATEMENT holds the position as a date; IV-14 of table T-220 keeps
    // the date columns inside the range table T-214 admits. A string that is no
    // date at all cannot satisfy either.
    const result = editAnnotation(documentOf(), {
      kind: 'createCommentBox',
      id: 'c1',
      anchor: { date: 'soon', groupId: 'g1' },
    })
    expect(result.ok).toBe(false)
  })

  it('FR-097 holds the body text, and null erases it', () => {
    const document = documentOf({ schedule: { commentBoxes: [commentBoxOf()] } })
    const written = editAnnotation(document, {
      kind: 'setCommentBoxText',
      id: 'c1',
      text: 'shipment slips one week',
    })
    expect(written.ok).toBe(true)
    if (!written.ok) return
    // FR-097: 「それを保持してコメントボックスの中に描くこと」-- the text is held
    // verbatim. U-14 forbids calling it 「コメント」; it is the box's 本文.
    expect(written.document.schedule.commentBoxes[0]!.text).toBe('shipment slips one week')
    // AT-112 is nullable (可), so clearing the 本文 is a legitimate state.
    const cleared = editAnnotation(written.document, {
      kind: 'setCommentBoxText',
      id: 'c1',
      text: null,
    })
    expect(cleared.ok && cleared.document.schedule.commentBoxes[0]!.text).toBeNull()
  })

  it('FR-019 holds the body offset in screen pixels, so the zoom does not touch it', () => {
    // FR-019: 「吹き出しのずれだけは画面上の距離で持ち、ズームしても見た目の距離
    // が変わらないようにする」-- the stored value is screen pixels, so the same
    // command against a document at a different zoom must store the same pair.
    const move = { kind: 'setCommentBoxBodyOffsetPx', id: 'c1', dx: 40, dy: -18 } as const
    const atOne = editAnnotation(
      documentOf({ schedule: { commentBoxes: [commentBoxOf()] } }),
      move,
    )
    const atFour = editAnnotation(
      documentOf({
        schedule: { commentBoxes: [commentBoxOf()] },
        documentSettings: { zoomX: 4, zoomY: 4 },
      }),
      move,
    )
    expect(atOne.ok && atFour.ok).toBe(true)
    if (!atOne.ok || !atFour.ok) return
    expect(atOne.document.schedule.commentBoxes[0]!.bodyOffsetPx).toEqual({ dx: 40, dy: -18 })
    expect(atFour.document.schedule.commentBoxes[0]!.bodyOffsetPx).toEqual({ dx: 40, dy: -18 })
  })

  it('FR-028 refuses every entrance that names a comment box the document does not hold', () => {
    // ⚠️ The rule id is not asserted here: the specification names no single
    // requirement for "no such box" -- CM-47 answers to FR-032, CM-48 to
    // FR-097, CM-49 to FR-019 and CM-50 / CM-51 to FR-016. What FR-028 settles
    // is that the caller is TOLD, so a silent no-op is the failure to catch.
    const document = documentOf({ schedule: { commentBoxes: [commentBoxOf({ id: 'c1' })] } })
    const strangers: readonly AnnotationCommand[] = [
      { kind: 'deleteCommentBox', id: 'nope' },
      { kind: 'setCommentBoxText', id: 'nope', text: 'x' },
      { kind: 'setCommentBoxAnchor', id: 'nope', anchor: ANCHOR },
      { kind: 'setCommentBoxBodyOffsetPx', id: 'nope', dx: 1, dy: 1 },
      // CR-172 spelled AT-111's two members, so this case now says something:
      // the value is one the entrance accepts, and the refusal can only be
      // about the id. Before that it could not be told apart from a rejected
      // value, which is why it used to be left out.
      { kind: 'setCommentBoxLeaderShapeKind', id: 'nope', leaderShapeKind: 'calloutBox' },
    ]
    for (const command of strangers) {
      expect(editAnnotation(document, command).ok).toBe(false)
    }
  })

  it('FR-019 lets a comment box be set to either leader shape (CM-49)', () => {
    // FR-019: 「コメントボックスは引出し四角と折れ線の 2 種から選べること
    // （MUST）」-- so BOTH have to be reachable through CM-49, and the value
    // that arrives has to be the value stored. The two spellings are AT-111's,
    // named by CR-172; this case names them rather than reading them from the
    // implementation.
    for (const kind of ['calloutBox', 'polyline'] as const) {
      const document = documentOf({ schedule: { commentBoxes: [commentBoxOf({ id: 'c1' })] } })
      const result = editAnnotation(document, {
        kind: 'setCommentBoxLeaderShapeKind',
        id: 'c1',
        leaderShapeKind: kind,
      })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.document.schedule.commentBoxes[0]!.leaderShapeKind).toBe(kind)
    }
  })

  it('FR-019 keeps comment boxes and highlight boxes as different things', () => {
    // FR-019: 「コメントボックスは点を指し、ハイライトボックスは範囲を囲む。
    // 必要な情報が違うので別のものとして持つ」-- two arrays (DR-2), so an id
    // that names a highlight box is not reachable through CM-47.
    const document = documentOf({ schedule: { highlightBoxes: [highlightBoxOf({ id: 'h1' })] } })
    const result = editAnnotation(document, { kind: 'deleteCommentBox', id: 'h1' })
    expect(result.ok).toBe(false)
    expect(document.schedule.highlightBoxes).toHaveLength(1)
  })
})

describe('EditAnnotation (UF-14) -- the HighlightBox group, CM-52 to CM-55', () => {
  it('FR-019 surrounds a span of days and a span of row IDENTIFIERS', () => {
    const result = editAnnotation(documentOf(), {
      kind: 'createHighlightBox',
      id: 'h1',
      range: RANGE,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const box = result.document.schedule.highlightBoxes[0]!
    // UC-008 step 4 -- 範囲を日付の範囲と行の範囲で持つ (AT-117 to AT-120).
    expect([box.startDate, box.endDate]).toEqual(['2026-03-01', '2026-03-31'])
    expect([box.topGroupId, box.bottomGroupId]).toEqual(['g1', 'g2'])
    // AT-121 is nullable and CM-52 does not set it; FR-019 reads that absence
    // as 「指定が無ければ注記用の固定色で描く」, which is a drawing rule, not a
    // stored colour.
    expect(box.strokeColor).toBeNull()
  })

  it('S-132 gives a new highlight box the corner radius 4, and the zoom does not touch it', () => {
    const create = { kind: 'createHighlightBox', id: 'h1', range: RANGE } as const
    const atOne = editAnnotation(documentOf(), create)
    const atEight = editAnnotation(
      documentOf({ documentSettings: { zoomX: 8, zoomY: 8 } }),
      create,
    )
    expect(atOne.ok && atEight.ok).toBe(true)
    if (!atOne.ok || !atEight.ok) return
    // S-132 of table T-217: `cornerRadiusPx` の既定は 4。FR-019 adds 「角丸の
    // 半径もズームによらず一定に描く」, so the zoom leaves the stored value alone.
    expect(atOne.document.schedule.highlightBoxes[0]!.cornerRadiusPx).toBe(4)
    expect(atEight.document.schedule.highlightBoxes[0]!.cornerRadiusPx).toBe(4)
  })

  it('IV-1 refuses a highlight box whose id is already in the array', () => {
    const document = documentOf({ schedule: { highlightBoxes: [highlightBoxOf({ id: 'h1' })] } })
    const result = editAnnotation(document, { kind: 'createHighlightBox', id: 'h1', range: RANGE })
    expect(result.ok).toBe(false)
    // IV-1 of table T-220 over `HighlightBox.id` (AT-116, the PK column).
    if (!result.ok) expect(result.refusals[0]!.rule).toBe('IV-1')
  })

  it('IV-2 refuses a range whose top or bottom row is not in the document', () => {
    // RL-19 / RL-20: both ends are FKs to `TaskGroup` (AT-119 / AT-120), so
    // IV-2 covers each of them separately.
    for (const range of [
      { ...RANGE, topGroupId: 'ghost' },
      { ...RANGE, bottomGroupId: 'ghost' },
    ]) {
      const created = editAnnotation(documentOf(), {
        kind: 'createHighlightBox',
        id: 'h1',
        range,
      })
      expect(created.ok).toBe(false)
      if (!created.ok) expect(created.refusals[0]!.rule).toBe('IV-2')

      const moved = editAnnotation(
        documentOf({ schedule: { highlightBoxes: [highlightBoxOf()] } }),
        { kind: 'setHighlightBoxRange', id: 'h1', range },
      )
      expect(moved.ok).toBe(false)
      if (!moved.ok) expect(moved.refusals[0]!.rule).toBe('IV-2')
    }
  })

  it('CM-54 moves the surrounded span of days and rows', () => {
    const document = documentOf({ schedule: { highlightBoxes: [highlightBoxOf()] } })
    const result = editAnnotation(document, {
      kind: 'setHighlightBoxRange',
      id: 'h1',
      range: { startDate: '2026-05-01', endDate: '2026-05-20', topGroupId: 'g2', bottomGroupId: 'g2' },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const box = result.document.schedule.highlightBoxes[0]!
    expect([box.startDate, box.endDate, box.topGroupId, box.bottomGroupId]).toEqual([
      '2026-05-01',
      '2026-05-20',
      'g2',
      'g2',
    ])
  })

  it('FR-019 forbids a transparent highlight box outline', () => {
    // MUST NOT (FR-019): 「ハイライトボックスに透明を選ばせてはならない」--
    // 枠線が唯一の表現なので、透明にすると何も残らない。The value that means
    // transparent is P-19's `'transparent'`, which is NOT `null`.
    const document = documentOf({ schedule: { highlightBoxes: [highlightBoxOf()] } })
    const result = editAnnotation(document, {
      kind: 'setHighlightBoxStrokeColor',
      id: 'h1',
      strokeColor: TRANSPARENT,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.refusals[0]!.rule).toBe('FR-019')
    if (!result.ok) expect(result.refusals[0]!.command).toBe('CM-55')
  })

  it('FR-019 takes a stroke colour, and takes null as "no colour chosen"', () => {
    const document = documentOf({ schedule: { highlightBoxes: [highlightBoxOf()] } })
    const chosen = editAnnotation(document, {
      kind: 'setHighlightBoxStrokeColor',
      id: 'h1',
      strokeColor: '#c02040',
    })
    // FR-019: 「ハイライトボックスの線色を指定でき、指定が無ければ注記用の固定色
    // で描くこと（MUST）」-- so both a colour and its absence are legitimate.
    expect(chosen.ok && chosen.document.schedule.highlightBoxes[0]!.strokeColor).toBe('#c02040')
    const unset = editAnnotation(chosen.ok ? chosen.document : document, {
      kind: 'setHighlightBoxStrokeColor',
      id: 'h1',
      strokeColor: null,
    })
    expect(unset.ok).toBe(true)
    // P-19: `null`（選んでいない）は透明とは別物である。The fixed annotation
    // colour is what the drawing does with `null`; nothing is stored for it.
    expect(unset.ok && unset.document.schedule.highlightBoxes[0]!.strokeColor).toBeNull()
  })

  it('FR-028 refuses every entrance that names a highlight box the document does not hold', () => {
    const document = documentOf({ schedule: { highlightBoxes: [highlightBoxOf({ id: 'h1' })] } })
    const strangers: readonly AnnotationCommand[] = [
      { kind: 'deleteHighlightBox', id: 'nope' },
      { kind: 'setHighlightBoxRange', id: 'nope', range: RANGE },
      { kind: 'setHighlightBoxStrokeColor', id: 'nope', strokeColor: '#c02040' },
    ]
    for (const command of strangers) {
      expect(editAnnotation(document, command).ok).toBe(false)
    }
  })
})

describe('EditAnnotation (UF-14) -- what a deletion drags with it, and the revision', () => {
  it('CD-4 deletes the annotation and nothing else', () => {
    const document = documentOf({
      schedule: {
        commentBoxes: [commentBoxOf({ id: 'c1' }), commentBoxOf({ id: 'c2' })],
        highlightBoxes: [highlightBoxOf({ id: 'h1' })],
      },
    })
    const result = editAnnotation(document, { kind: 'deleteCommentBox', id: 'c1' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const schedule = result.document.schedule
    // CD-4 of table T-050: 注記を消すとき一緒に消えるものは「無し」.
    expect(schedule.commentBoxes.map((box) => box.id)).toEqual(['c2'])
    expect(schedule.highlightBoxes).toHaveLength(1)
    expect(schedule.taskGroups).toHaveLength(2)
  })

  it('CD-4 deletes a highlight box and nothing else', () => {
    const document = documentOf({
      schedule: {
        commentBoxes: [commentBoxOf({ id: 'c1' })],
        highlightBoxes: [highlightBoxOf({ id: 'h1' }), highlightBoxOf({ id: 'h2' })],
      },
    })
    const result = editAnnotation(document, { kind: 'deleteHighlightBox', id: 'h2' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.schedule.highlightBoxes.map((box) => box.id)).toEqual(['h1'])
    expect(result.document.schedule.commentBoxes).toHaveLength(1)
    expect(result.document.schedule.taskGroups).toHaveLength(2)
  })

  it('FR-063 raises the revision, because DR-2 files both arrays in the schedule group', () => {
    // DR-2 of table T-052 lists `commentBoxes` and `highlightBoxes` among the
    // twelve keys of `schedule`, and FR-063 says 版数を上げるのは日程データの
    // 群を変える更新とすること（MUST）. The judgement is made on the branch the
    // key sits on and admits no per-key exception.
    const document = documentOf()
    for (const command of [
      { kind: 'createCommentBox', id: 'c1', anchor: ANCHOR },
      { kind: 'createHighlightBox', id: 'h1', range: RANGE },
    ] as const) {
      const plan = planOf(document, [command as DocumentCommand])
      expect(plan.ok).toBe(true)
      if (!plan.ok) return
      expect(plan.hasMovedSchedule).toBe(true)
      expect(plan.document.documentStamp.scheduleUpdatedUtc).toBe('2026-08-17T01:00:00Z')
    }
  })
})
