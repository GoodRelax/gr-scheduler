// The anchor for SK-19's LAST stage: a plain `Enter` with nothing else standing
// lets the selection go.
//
// ⛔⛔ WHAT WAS MEASURED BEFORE THIS (2026-09-10, 出荷ビルド, FR-102 の記録).
// 「プロパティーパネルを開かず、タスクやマイルストーンをアクティブにした状態で、
// Enter を押下しても何も起きない。」 The record shows the press arriving with
// `act=-`: `commandFromKey` reached its last line with the panel down and
// answered UNASSIGNED, and no member anywhere named the selection for `Enter`.
// ⇒ 確定の鍵で確定できない状態が残っていた。
//
// Units under test:
//   UF-30  `input-command-translator.ts` -- `commandFromInput` (which of the
//          row's stages the press spends, and MK-10's half of the answer)
//   UF-31  the same unit's `selectionFromInput` (SL-5 / IN-4 / SK-19 are all
//          decided there, because UN-9 keeps the selection out of the document)
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// THE CLAUSES THESE CASES EXIST FOR (rule 03 section 3: quoted because holding
// them verbatim IS the point)
// ---------------------------------------------------------------------------
//
//   T-036 SK-19 (MUST, 利用者の裁定 2026-09-10) -- the stage these cases are for,
//     and the MUST NOT that keeps it from swallowing every bare `Enter`.
//
//   T-023 MK-10 -- 「割り当てていない組合せを止めてはならない（MUST NOT）」, which
//     is why an `Enter` with nothing selected must reach the browser.
//
//   FR-072 -- 「パネルを出すのをやめても、選択を解いてはならない（MUST NOT）」,
//     which is what the ORDER of the stages keeps.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - That the Properties Panel goes away. That is the stage ABOVE this one and
//     `frame-loop.ts` spends it; these cases only show that this stage does not
//     run while that one can.
//   - Which words or shapes the reader sees. Nothing here reads a spelling.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  commandFromInput,
  selectionFromInput,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { KeyInput } from '../../src/adapter/input-command-translator/input-source'
import {
  emptySelection,
  selectionWith,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'

import { unbroken } from '../contract/spec-table'

// ===========================================================================
// 1. The sentences, read out of the manuscript rather than believed
// ===========================================================================

/**
 * ⚠️ Japanese literals in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- these strings ARE the
 * clauses, quoted to the character so that a re-wording of the manuscript takes
 * this file red rather than leaving it holding a rule nobody writes any more.
 */
const SK_19_LAST_STAGE =
  'プロパティパネルも出していないときは、選ばれているものがあればその選択を解くこと（MUST）'

/** The same row's MUST NOT, which is what the second case below is for. */
const SK_19_NO_SELECTION_NO_STAGE =
  '**選ばれているものが 1 つも無いときは、この段も無い**'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

describe('the clauses are still written', () => {
  it('SK-19 still carries the stage these cases hold', () => {
    expect(REQUIREMENTS).toContain(SK_19_LAST_STAGE)
  })

  it('SK-19 still carries the MUST NOT that bounds it', () => {
    expect(REQUIREMENTS).toContain(SK_19_NO_SELECTION_NO_STAGE)
  })
})

// ===========================================================================
// 2. The harness
// ===========================================================================

const NO_MODS = { ctrl: false, shift: false, alt: false, meta: false } as const

const ENTER_KEY = {
  kind: 'key',
  key: 'Enter',
  modifiers: NO_MODS,
} as unknown as KeyInput

/** One `Task` picked, which is the smallest thing table T-023c calls a selection. */
const selectionWithOneTask = (): Selection =>
  selectionWith(emptySelection(), { kind: 'task', uid: 7 })

/**
 * ⛔ NOTHING OF THE SCHEDULE IS READ ON THIS ROAD: a key input leaves both
 * members at the stages of SK-19, all of which read the selection and the
 * questions `InputContext` carries about what is standing.
 */
const contextWithSelection = (
  selection: Selection,
  part: Partial<InputContext> = {},
): InputContext =>
  ({
    document: { schedule: { tasks: [], commentBoxes: [], highlightBoxes: [] } },
    layout: { rows: [], pxPerDay: 0 },
    geometry: { items: [] },
    regions: {},
    screenState: emptyScreenState(),
    selection,
    zoomStep: 0.1,
    zoomMin: 0.2,
    zoomMax: 5,
    newCommentBoxId: 'a',
    newHighlightBoxId: 'b',
    pressed: null,
    isTextEntryUnsettled: false,
    dualCursorFollowing: null,
    ...part,
  }) as unknown as InputContext

// ===========================================================================
// 3. The cases
// ===========================================================================

describe('T-036 SK-19 (MUST, 利用者の裁定 2026-09-10) -- Enter lets the selection go', () => {
  it('empties the selection when nothing above the stage stands', () => {
    const held = selectionWithOneTask()
    expect(held.items.length, 'the control: something IS selected before the press').toBe(1)
    expect(selectionFromInput(ENTER_KEY, contextWithSelection(held)).items).toEqual([])
  })

  it('stops the browser default for that press (MK-10)', () => {
    const answered = commandFromInput(ENTER_KEY, contextWithSelection(selectionWithOneTask()))
    expect(answered.isBrowserDefaultStopped).toBe(true)
  })

  it('⛔ MK-10 (MUST NOT): with nothing selected the press reaches the browser', () => {
    // 「選ばれているものが 1 つも無いときは、この段も無い」. ⛔ Stopping every bare
    // `Enter` would take keyboard activation away from every control a person
    // has tabbed to, which is the reason MK-10 gives.
    const answered = commandFromInput(ENTER_KEY, contextWithSelection(emptySelection()))
    expect(answered.isBrowserDefaultStopped).toBe(false)
    expect(answered.action).toBeNull()
  })

  it('⛔ FR-072 (MUST NOT): the press that puts the panel away leaves the selection alone', () => {
    // The stage above this one runs instead, so this member answers with the
    // selection it was handed -- 「パネルを出すのをやめても、選択を解いてはなら
    // ない（MUST NOT）」.
    const held = selectionWithOneTask()
    const answered = selectionFromInput(
      ENTER_KEY,
      contextWithSelection(held, { isPropertiesPanelShowing: true } as Partial<InputContext>),
    )
    expect(answered).toBe(held)
  })

  it('leaves the selection alone while a field is being typed into', () => {
    // 確定していないその場の編集 is the stage above; that press settles the field.
    const held = selectionWithOneTask()
    const answered = selectionFromInput(
      ENTER_KEY,
      contextWithSelection(held, { isTextEntryUnsettled: true }),
    )
    expect(answered).toBe(held)
  })

  it('leaves the selection alone while a telling stands', () => {
    // NT-8 (MUST) puts the telling ahead of every stage of both ladders.
    const held = selectionWithOneTask()
    const answered = selectionFromInput(
      ENTER_KEY,
      contextWithSelection(held, { isNoticeStanding: true } as Partial<InputContext>),
    )
    expect(answered).toBe(held)
  })
})
