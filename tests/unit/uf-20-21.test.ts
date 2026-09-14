// Unit tests for UndoEdit (UF-20) and RedoEdit (UF-21).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  historyWithStep,
  type EditHistory,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
import type {
  ChangeStep,
  DocumentCommand,
  HeldDocument,
  SettingsLimits,
  WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import { redoEdit } from '../../src/use-case/redo-edit/redo-edit'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'

// WHY: a whole Document is far more than these cases read, so the fixture
// carries only the keys the write path touches.
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

const docNamed = (title: string): Document =>
  documentOf({ schedule: { project: { title, statusDate: null, themeHue: 214, startDate: null } } })

const titleOf = (document: Document): string | null => document.schedule.project.title

// WHY: S-94 / S-95 bound historyWithStep (PI-4), not these two units, so
// nothing here needs to push that far.
const HISTORY_LIMITS: HistoryLimits = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

// WHY: HeldStep is not published by PI-4, so history is built the way WS-4
// does: through historyWithStep, oldest first.
const stepOf = (document: Document, commands: readonly string[]): ChangeStep => ({
  document,
  commands,
})

const historyOf = (...steps: readonly ChangeStep[]): EditHistory<ChangeStep> =>
  steps.reduce<EditHistory<ChangeStep>>(
    (history, step) => historyWithStep(history, step, 1, HISTORY_LIMITS),
    EMPTY_HISTORY,
  )

const heldOf = (document: Document, history: EditHistory<ChangeStep>): HeldDocument => ({
  document,
  history,
})

// WHY: done + undone stays constant across a press -- one entry moves
// sides, none is made or dropped.
const entryCount = (history: EditHistory<ChangeStep>): number =>
  history.done.length + history.undone.length

describe('UndoEdit (UF-20) -- CP-11, 履歴を 1 段戻す', () => {
  it('FR-031 answers the document the previous edit was made from', () => {
    // WHY: a ChangeStep is the document as it stood BEFORE that write, so
    // undo answers with that document, not one computed here.
    const before = docNamed('A')
    const after = docNamed('B')
    const outcome = undoEdit(heldOf(after, historyOf(stepOf(before, ['setProjectTitle']))))

    expect(outcome.undone).toBe(true)
    if (!outcome.undone) return
    expect(outcome.next.document).toBe(before)
    // WHY: the step's own list, unchanged -- FR-031 asks this unit to
    // interpret nothing about which rows of table T-108 the write carried.
    expect(outcome.commands).toEqual(['setProjectTitle'])
  })

  it('CP-11 moves exactly one 段, and neither makes nor drops one', () => {
    // WHY: CP-11 moves exactly one entry -- not all of them, and not none.
    const held = heldOf(
      docNamed('D'),
      historyOf(
        stepOf(docNamed('A'), ['setProjectTitle']),
        stepOf(docNamed('B'), ['setProjectTitle']),
        stepOf(docNamed('C'), ['setProjectTitle']),
      ),
    )
    const outcome = undoEdit(held)

    expect(outcome.undone).toBe(true)
    expect(outcome.next.history.done).toHaveLength(2)
    expect(outcome.next.history.undone).toHaveLength(1)
    expect(entryCount(outcome.next.history)).toBe(entryCount(held.history))
  })

  it('FR-031 takes the LAST step, so repeated presses walk back in order', () => {
    // WHY: "the previous edit" is the most recent one, so three writes
    // A-B-C-D come back as C, then B, then A.
    const [a, b, c, d] = [docNamed('A'), docNamed('B'), docNamed('C'), docNamed('D')]
    let held = heldOf(
      d,
      historyOf(
        stepOf(a, ['setProjectTitle']),
        stepOf(b, ['setProjectTitle']),
        stepOf(c, ['setProjectTitle']),
      ),
    )
    const walked: (string | null)[] = []
    for (let press = 0; press < 3; press += 1) {
      const outcome = undoEdit(held)
      expect(outcome.undone).toBe(true)
      walked.push(titleOf(outcome.next.document))
      held = outcome.next
    }
    expect(walked).toEqual(['C', 'B', 'A'])
    // WHY: a fourth press finds nothing left -- the history is exhausted, not wrapped.
    expect(undoEdit(held).undone).toBe(false)
  })

  it('FR-031 makes an empty history a defined answer, not an error', () => {
    // WHY: FR-031 gives undo no failure mode, so the answer is a
    // discriminated `undone: false` (R7.10 -- a failure is a value).
    const document = docNamed('A')
    const held = heldOf(document, EMPTY_HISTORY)
    let outcome!: ReturnType<typeof undoEdit>
    expect(() => {
      outcome = undoEdit(held)
    }).not.toThrow()

    expect(outcome.undone).toBe(false)
    expect(outcome.next.document).toBe(document)
    expect(outcome.next.history.done).toHaveLength(0)
    expect(outcome.next.history.undone).toHaveLength(0)
  })

  it('CP-11 takes the step on top whatever it recorded, and skips nothing', () => {
    // WHY: AG-10 keeps an out-of-scope call from ever recording an empty
    // step, so undo must never scan past an entry to find "the previous edit".
    const before = docNamed('A')
    const outcome = undoEdit(
      heldOf(
        docNamed('C'),
        historyOf(stepOf(docNamed('Z'), ['setProjectTitle']), stepOf(before, [])),
      ),
    )
    expect(outcome.undone).toBe(true)
    expect(outcome.next.document).toBe(before)
    expect(outcome.next.history.done).toHaveLength(1)
  })

  it('LY-1 leaves the pair it was handed untouched (@purity pure)', () => {
    // WHY: the arrays are frozen, so a unit that pushed or spliced in place
    // would throw here rather than pass.
    const before = docNamed('A')
    const built = historyOf(stepOf(before, ['setProjectTitle']))
    const history: EditHistory<ChangeStep> = Object.freeze({
      done: Object.freeze([...built.done]),
      undone: Object.freeze([...built.undone]),
    })
    const held = heldOf(docNamed('B'), history)

    const outcome = undoEdit(held)
    expect(outcome.undone).toBe(true)
    // WHY: the handed-in pair still holds what it held -- the answer is a new value.
    expect(history.done).toHaveLength(1)
    expect(history.undone).toHaveLength(0)
    expect(outcome.next.history).not.toBe(history)
    expect(outcome.next.document).toBe(before)
  })
})

describe('RedoEdit (UF-21) -- CP-12, 履歴を 1 段進める', () => {
  it('FR-031 makes an empty redo side a defined answer, not an error', () => {
    // WHY: same shape as undo's -- FR-031 says nothing about failing when
    // there is no undone edit, so it is an answer.
    const document = docNamed('A')
    const held = heldOf(document, historyOf(stepOf(docNamed('Z'), ['setProjectTitle'])))
    let outcome!: ReturnType<typeof redoEdit>
    expect(() => {
      outcome = redoEdit(held)
    }).not.toThrow()

    expect(outcome.redone).toBe(false)
    expect(outcome.next.document).toBe(document)
    expect(outcome.next.history.done).toHaveLength(1)
    expect(outcome.next.history.undone).toHaveLength(0)
  })

  it('CP-12 moves exactly one 段 forward, and neither makes nor drops one', () => {
    const undone = undoEdit(
      heldOf(
        docNamed('C'),
        historyOf(
          stepOf(docNamed('A'), ['setProjectTitle']),
          stepOf(docNamed('B'), ['setProjectTitle']),
        ),
      ),
    )
    const outcome = redoEdit(undone.next)

    expect(outcome.redone).toBe(true)
    expect(outcome.next.history.done).toHaveLength(2)
    expect(outcome.next.history.undone).toHaveLength(0)
    expect(entryCount(outcome.next.history)).toBe(entryCount(undone.next.history))
  })

  it('LY-1 leaves the pair it was handed untouched (@purity pure)', () => {
    const undone = undoEdit(
      heldOf(docNamed('B'), historyOf(stepOf(docNamed('A'), ['setProjectTitle']))),
    )
    const history: EditHistory<ChangeStep> = Object.freeze({
      done: Object.freeze([...undone.next.history.done]),
      undone: Object.freeze([...undone.next.history.undone]),
    })

    expect(() => redoEdit(heldOf(undone.next.document, history))).not.toThrow()
    expect(history.done).toHaveLength(0)
    expect(history.undone).toHaveLength(1)
  })
})

describe('FR-031 -- 取り消した編集をやり直せる（the two units together）', () => {
  it('lands on the two documents that were current before and after that write', () => {
    // WHY: the document current when undo is pressed is held nowhere else,
    // so redo can only answer with it if the moved entry carries it.
    const before = docNamed('A')
    const after = docNamed('B')
    const held = heldOf(after, historyOf(stepOf(before, ['setProjectTitle'])))

    const undo = undoEdit(held)
    expect(undo.undone && undo.next.document).toBe(before)

    const redo = redoEdit(undo.next)
    expect(redo.redone).toBe(true)
    if (!redo.redone) return
    expect(redo.next.document).toBe(after)
    // WHY: command kinds stay with the write they name, so redo reports the
    // same list undo did.
    expect(redo.commands).toEqual(['setProjectTitle'])
    expect(redo.next.history.done).toHaveLength(1)
    expect(redo.next.history.undone).toHaveLength(0)
    expect(undoEdit(redo.next).next.document).toBe(before)
  })

  it('walks a three-step history all the way back and all the way forward', () => {
    const documents = ['A', 'B', 'C', 'D'].map(docNamed)
    const start = heldOf(
      documents[3]!,
      historyOf(...documents.slice(0, 3).map((one) => stepOf(one, ['setProjectTitle']))),
    )

    let held: HeldDocument = start
    const back: (string | null)[] = []
    for (let press = 0; press < 3; press += 1) {
      const outcome = undoEdit(held)
      expect(outcome.undone).toBe(true)
      held = outcome.next
      back.push(titleOf(held.document))
    }
    expect(back).toEqual(['C', 'B', 'A'])

    const forward: (string | null)[] = []
    for (let press = 0; press < 3; press += 1) {
      const outcome = redoEdit(held)
      expect(outcome.redone).toBe(true)
      held = outcome.next
      forward.push(titleOf(held.document))
    }
    // WHY: every undone write comes back, in the order it was made, and the
    // pair ends where it started.
    expect(forward).toEqual(['B', 'C', 'D'])
    expect(held.document).toBe(start.document)
    expect(held.history.done).toHaveLength(3)
    expect(held.history.undone).toHaveLength(0)
  })

  it('does not consume a 段 when there was nothing to move', () => {
    // WHY: neither answer is an error, so pressing the exhausted button at
    // any time must leave the history where it is.
    const held = heldOf(docNamed('B'), historyOf(stepOf(docNamed('A'), ['setProjectTitle'])))
    const noRedo = redoEdit(held)
    expect(noRedo.redone).toBe(false)
    expect(entryCount(noRedo.next.history)).toBe(1)
    expect(noRedo.next.history.done).toHaveLength(1)

    const undone = undoEdit(noRedo.next)
    const noUndo = undoEdit(undone.next)
    expect(noUndo.undone).toBe(false)
    expect(noUndo.next.history.undone).toHaveLength(1)
    expect(redoEdit(noUndo.next).redone).toBe(true)
  })
})

// WHY: rowAreaWidthWithoutPanels is what the caller reads off the frame's
// ScreenRegions (CS-1) and hands over; the arithmetic is layoutEngine's.
const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }
const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, deliveringNotices: false }

const planOf = (document: Document, command: DocumentCommand) =>
  planDocumentChange({
    defaultRowName: DEFAULT_ROW_NAME_FIXTURE,
    document,
    readStamp: document.documentStamp,
    commands: [command],
    moment: CALM,
    history: EMPTY_HISTORY,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'user',
    updatedUtc: '2026-08-17T01:00:00Z',
  })

// see T-027
const T_027 = [
  {
    row: 'UN-13',
    undoable: true,
    operation: '文書全体の設定の変更 —— 文書名（FR-035）',
    command: { kind: 'setProjectTitle', title: 'B' },
  },
  {
    row: 'UN-13',
    undoable: true,
    operation: '文書全体の設定の変更 —— 積む向き（FR-003）',
    command: { kind: 'setStackDirection', direction: 'down' },
  },
  {
    row: 'UN-13',
    undoable: true,
    operation: '文書全体の設定の変更 —— 文字サイズ（FR-039）',
    command: { kind: 'setFontScale', scale: 'L' },
  },
  {
    row: 'UN-7',
    undoable: false,
    operation: '表示の切り替え（各トグル）',
    command: { kind: 'setElementVisible', element: 'dependencyVisible', visible: false },
  },
  {
    row: 'UN-8',
    undoable: false,
    operation: 'ズーム・スクロール・パン',
    command: { kind: 'setZoom', zoomX: 2, zoomY: 2 },
  },
  {
    row: 'UN-16',
    undoable: false,
    operation: '見る場所の割り付け（FR-052）',
    command: { kind: 'setPanelWidths', rowTitlePanelWidth: 210, propertyPanelWidth: 310 },
  },
] as const satisfies readonly {
  row: string
  undoable: boolean
  operation: string
  command: DocumentCommand
}[]

describe('FR-031 -- 取り消しの対象は表 T-027 に従うこと', () => {
  for (const entry of T_027) {
    const region = entry.undoable ? '対象' : '対象外'
    it(`${entry.row} ${region}: ${entry.operation}`, () => {
      // WHY: WS-4 decides this (AG-10), not UF-20 -- the write runs through
      // the plan, and undo only reads what it left; it has no table to read.
      const document = documentOf()
      const plan = planOf(document, entry.command)
      expect(plan.ok).toBe(true)
      if (!plan.ok) return

      const outcome = undoEdit(heldOf(plan.document, plan.history))
      expect(outcome.undone).toBe(entry.undoable)
      if (entry.undoable) {
        expect(outcome.next.document).toEqual(document)
      } else {
        // WHY: an out-of-scope operation left no entry, so the press finds
        // nothing and the write stands (MUST NOT reverse it).
        expect(outcome.next.document).toBe(plan.document)
      }
    })
  }

  it('AG-10 leaves an out-of-scope call unable to bury the edit before it', () => {
    // WHY: the toggle ran and was not recorded, so the one press still finds
    // the title write underneath it and undoes that -- its own effect spends no entry.
    const document = documentOf()
    const edit = planOf(document, { kind: 'setProjectTitle', title: 'B' })
    expect(edit.ok).toBe(true)
    if (!edit.ok) return
    const toggle = planDocumentChange({
      defaultRowName: DEFAULT_ROW_NAME_FIXTURE,
      document: edit.document,
      readStamp: edit.document.documentStamp,
      commands: [{ kind: 'setElementVisible', element: 'dependencyVisible', visible: false }],
      moment: CALM,
      history: edit.history,
      historyLimits: HISTORY_LIMITS,
      settingsLimits: LIMITS,
      editedBy: 'user',
      updatedUtc: '2026-08-17T02:00:00Z',
    })
    expect(toggle.ok).toBe(true)
    if (!toggle.ok) return
    expect(toggle.history.done).toHaveLength(1)

    const outcome = undoEdit(heldOf(toggle.document, toggle.history))
    expect(outcome.undone).toBe(true)
    if (!outcome.undone) return
    expect(titleOf(outcome.next.document)).toBe('A')
    expect(outcome.commands).toHaveLength(1)
  })
})
