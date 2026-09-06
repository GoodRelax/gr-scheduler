// `FR-028`'s STATEMENT (docs/spec/01-04-requirements.md:3616):
//
//   「`Agent API` が有効化されているとき、`GRS` は、人が UI で行える編集・確認・
//    出力と同じことを関数の呼び出しで行えるようにし、**受理したか否かを値で
//    返すこと。例外を投げてはならない（MUST NOT）。**」
//
// and 表 T-035 の `AG-9a` (:3688):
//
//   「**拒否の値には、拒否された対象・理由の区分・現在の刻印を含めること
//    （MUST）。**」
//
// ⭐⭐ THE MUST NOT IS UNCONDITIONAL, AND THAT IS THE WHOLE OF LEDGER ROW
// D-325. The sentence does not say 「正しい形の引数を渡されたとき」; it says the
// API answers with a value. ⇒ A caller outside this build that hands `AM-7` a
// shape 表 T-107 does not declare must be TOLD SO, not have an exception thrown
// at it -- and `AG-9a` already says what being told looks like.
// ⚠️ The categories are not enumerated anywhere: AG-9a asks for 「理由の区分」
// and stops. So no case below asserts WHICH category comes back, only that one
// does -- naming a spelling the specification does not hold would be this file
// deciding a value it has no authority over.
//
// ---------------------------------------------------------------------------
// ⛔ THE LEDGER'S OWN DIAGNOSIS WAS WRONG, AND THIS FILE IS SHAPED BY THAT
// ---------------------------------------------------------------------------
// D-325 was filed as 「どの引数の形でも例外を投げる」. A later body measured that
// as false: `{readStamp, commands}` was always accepted, and only the missing
// `readStamp` threw. ⇒ Section 5 below is not decoration. A file that only
// asked about malformed shapes could pass on a build where `AM-7` refused
// EVERYTHING, which would break FR-028 in the other direction -- 「人が UI で
// 行える編集…と同じことを関数の呼び出しで行えるようにし」.
//
// ---------------------------------------------------------------------------
// ⛔⛔ SIX CASES IN THIS FILE ARE RED ON PURPOSE (measured 2026-09-06)
// ---------------------------------------------------------------------------
// ONE of the fourteen shapes in `MALFORMED` below still throws, and it takes
// six of the parameterised cases with it: `{readStamp, commands: [null]}`
// raises `TypeError: Cannot read properties of null (reading 'kind')` from
// edit-document.ts:399. The comment beside that entry names the class and the
// path. ⭐ NOTHING HERE IS SOFTENED TO MAKE IT GREEN: FR-028's MUST NOT admits
// no exceptions, and a case rewritten to expect a throw would be this file
// agreeing with the build against the manuscript.
// ⇒ The ledger's account of D-325's 2026-09-06 repair -- 「壊れた引数でも投げずに
// 答える」 -- holds for thirteen of the fourteen shapes and fails for that one.
//
// ---------------------------------------------------------------------------
// WHERE TABLE T-218 PUTS THIS FILE
// ---------------------------------------------------------------------------
// `TS-6`, tests/unit/ -- the inside of one unit, decided by values alone
// (vitest.config.ts lists the three Vitest places). Chapter 9 does not admit
// Unit as a TEST_LEVEL, so these cases have no node in the specification.
// ⛔ NOT tests/system/: nothing about a thrown exception needs a browser, and
// the argument shapes below cannot be produced through a UI at all -- which is
// exactly why the seam is where they have to be asked.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1.)
//
// Exported declarations read, and nothing else:
//   agent-api-endpoint.ts  `installAgentApi(wiring)`, `AgentApi`,
//                          `AgentApiWiring`, `AgentSnapshot`,
//                          `AgentWriteOutcome`, `AgentWriteRequest`
//   edit-history.ts        `NOT_STORED_LIMITS`, `EditHistory`
//   apply-document-change  `ChangeStep`, `SettingsLimits`
// ⛔ NOT READ: the body of `applyCommands`, and not the `AgentRefusalReason`
// union either -- the categories are the build's, not the specification's, and
// this file must not pin one.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   FR-028       the clause at the head
//   T-107 AM-7   「書く | `applyCommands` | 動詞＋目的語・`non-pure` | 一括の
//                書き込み。原子的に適用し、受理したか否かを値で返す |
//                `FR-028` ／ 表 T-035 の `AG-3` / `AG-9a` |」
//   T-035 AG-9a  what a refusal carries
//   T-035 AG-2   the optimistic lock, which is why a request declares a stamp
//                at all -- and therefore why one that declares none is not a
//                request AM-7 can act on
//   T-067 WS-1   the three-field stamp match

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  installAgentApi,
  type AgentApi,
  type AgentApiWiring,
  type AgentSnapshot,
  type AgentWriteOutcome,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { emptyDialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  NOT_STORED_LIMITS,
  type EditHistory,
} from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type {
  ChangeStep,
  SettingsLimits,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { specTable } from '../contract/spec-table'

// ===========================================================================
// 1. The sentences, read out of the manuscript rather than believed
// ===========================================================================

/**
 * ⚠️ Japanese literals in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- these strings ARE the
 * clauses, quoted to the character.
 */
const FR_028_NEVER_THROWS =
  'TEMENT**: `Agent API` が有効化されているとき、`GRS` は、人が UI で行える編集・確認・出力と同じことを関数の呼び出しで行えるようにし、**受理したか否かを値で返すこと。例外を投げてはならない（MUST NOT）'

const AG_9A_WHAT_A_REFUSAL_CARRIES =
  'ードのダイアログを出さずに値で返せること |\n| AG-8 | 画像化に失敗したときも、呼び出した側が**失敗を値で受け取れること** |\n| AG-9a | **拒否の値には、拒否された対象・理由の区分・現在の刻印を含めること（MUST）'

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

const GLOSSARY = readFileSync(
  join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-glossary.md'),
  'utf8',
)

// ===========================================================================
// 2. The bench: one Agent API over one document
// ===========================================================================

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

/** The stamp the document starts every case with. AT-127 to AT-129 name the three. */
const STARTING_STAMP = {
  scheduleUpdatedUtc: '2026-08-19T10:00:00Z',
  lastEditedBy: 'a person at the keyboard',
  settingsUpdatedUtc: '2026-08-19T10:00:00Z',
} as const

/** The name the document starts with, so a write that lands is visible. */
const NAME_BEFORE = 'the name it started with'

const startingDocument = (): Document =>
  ({
    ...structuredClone(TEMPLATE),
    documentStamp: { ...STARTING_STAMP },
    changeLog: [],
  }) as unknown as Document

const HISTORY_LIMITS = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  // S-95 is stated in megabytes; the plan counts bytes.
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
}

/**
 * ⛔ INERT FIGURES. LY-5 of table T-060 keeps these outside the three inner
 * layers, so they arrive through IF-7 as values; no case here reads one back,
 * and the files that measure S-97 / S-98 own the real ones.
 */
const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: 0.02,
  zoomMax: 64,
  rowAreaWidthWithoutPanels: 982,
}

/** CS-1 of table T-066 keeps the clock on the Framework's side. */
const READ_AT = '2026-08-20T08:30:00Z'

interface Bench {
  readonly api: AgentApi
  readonly titleNow: () => string | null
  readonly stampNow: () => Document['documentStamp']
}

let benchCount = 0

/**
 * One installed API over one document.
 *
 * ⭐ `frame` and `exportScene` are BOTH null, and they travel together: an
 * implementor that has settled no size (BO-1 of table T-077) has neither. No
 * member this file calls draws anything, so that is the honest state.
 */
function bench(): Bench {
  benchCount += 1
  const state = {
    document: (() => {
      const start = startingDocument()
      return {
        ...start,
        schedule: { ...start.schedule, project: { ...start.schedule.project, title: NAME_BEFORE } },
      } as unknown as Document
    })(),
    history: { done: [], undone: [] } as EditHistory<ChangeStep>,
    dialogue: emptyDialogueLog(),
  }

  const readSnapshot = (): AgentSnapshot => ({
    document: state.document,
    selection: emptySelection(),
    dialogue: state.dialogue,
    frame: null,
    exportScene: null,
    isGestureInFlight: false,
    isEditingInPlace: false,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: SETTINGS_LIMITS,
    readAt: READ_AT,
  })

  const wiring: AgentApiWiring = {
    source: { readSnapshot },
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next) => {
        state.document = next.document
        state.history = next.history
      },
    },
    // ⚠️ A RECORDER AND NOT A REAL AUDIENCE. AG-6's wake-up rules are held by
    // tests/unit/uf-27-28-29.test.ts; what this file measures is what AM-7
    // ANSWERS, and a watcher on the far side cannot change that.
    audience: { deliver: () => undefined },
    dialogueHolder: {
      read: () => state.dialogue,
      replace: (next) => {
        state.dialogue = next
      },
    },
    dialogueAudience: {
      deliver: (log) => {
        state.dialogue = log
      },
    },
    writerName: `agent under test ${benchCount}`,
    schemaVersion: TEMPLATE['schemaVersion'] as string,
  }

  return {
    api: installAgentApi(wiring),
    titleNow: () => state.document.schedule.project.title,
    stampNow: () => state.document.documentStamp,
  }
}

// ===========================================================================
// 3. The shapes a caller outside this build can hand AM-7
// ===========================================================================

/**
 * ⛔ EVERY ONE OF THESE IS A LIE TO THE COMPILER, DELIBERATELY. `AgentWriteRequest`
 * declares two members and TypeScript would reject each of these at the call
 * site -- which is exactly why FR-028's MUST NOT exists: the Agent API is
 * reached by callers the compiler never saw (AG-1 gives it a version for that
 * very reason), and a JavaScript caller can hand it anything at all.
 */
const MALFORMED: ReadonlyArray<{ readonly what: string; readonly request: unknown }> = [
  { what: 'nothing at all', request: undefined },
  { what: 'null', request: null },
  { what: 'a request with neither member', request: {} },
  // ⭐⭐ THE ONE D-325 MEASURED: 「`readStamp` が無いまま素通しされ、
  // `document-stamp.ts` の比較が `Cannot read properties of undefined` を
  // 投げていた」.
  { what: 'commands without a readStamp', request: { commands: [] } },
  {
    what: 'a non-empty bundle without a readStamp',
    request: { commands: [{ kind: 'setProjectTitle', title: 'written by a malformed call' }] },
  },
  { what: 'a readStamp without commands', request: { readStamp: { ...STARTING_STAMP } } },
  { what: 'a readStamp that is not an object', request: { readStamp: 'not a stamp', commands: [] } },
  { what: 'a readStamp missing one of AT-127..AT-129', request: {
    readStamp: { scheduleUpdatedUtc: STARTING_STAMP.scheduleUpdatedUtc },
    commands: [],
  } },
  {
    what: 'commands that are not a list',
    request: { readStamp: { ...STARTING_STAMP }, commands: 'not a list' },
  },
  // ⛔⛔ RED ON PURPOSE, AND THE ASSERTION MUST NOT BE WEAKENED (measured
  // 2026-09-06). This shape still THROWS: `TypeError: Cannot read properties of
  // null (reading 'kind')`, raised at edit-document.ts:399 (`ROUTES.get(
  // command.kind)`), reached from applyCommands -> writeThroughTheOnePath ->
  // applyDocumentChange -> planDocumentChange.
  // ⭐ WHY IT IS HERE RATHER THAN DROPPED: FR-028's MUST NOT is unconditional,
  // and the ledger's own account of the 2026-09-06 repair claims exactly that
  // -- 「壊れた引数でも投げずに答える」. It is true for twelve of the thirteen
  // shapes below and false for this one, so the row's repair is incomplete
  // rather than absent. ⚠️ THE CLASS IS `null` / `undefined` INSIDE THE BUNDLE,
  // not "not an object": the row below it (`{ kind: 'no such row' }`) is
  // refused correctly, and so would a string be -- reading `.kind` off either
  // yields `undefined` and `ROUTES.get(undefined)` answers no route. Only a
  // nullish element reaches the property access itself.
  // ⛔ NOT this file's to fix: the guard at agent-api-members.ts:785 checks the
  // REQUEST's two members and nothing inside `commands`, and `src/` belongs to
  // other bodies this round.
  {
    what: 'a command that is null',
    request: { readStamp: { ...STARTING_STAMP }, commands: [null] },
  },
  {
    what: 'a command naming no row of table T-108',
    request: { readStamp: { ...STARTING_STAMP }, commands: [{ kind: 'no such row' }] },
  },
  // ⭐ THE NEIGHBOUR THAT PASSES, kept so the red above is read as the narrow
  // fact it is: a command that is a string is refused correctly, because
  // reading `.kind` off it is merely `undefined`.
  {
    what: 'a command that is a string',
    request: { readStamp: { ...STARTING_STAMP }, commands: ['setProjectTitle'] },
  },
  { what: 'a string where a request belongs', request: 'apply my commands please' },
  { what: 'a list where a request belongs', request: [] },
]

const applying = (api: AgentApi, request: unknown): AgentWriteOutcome =>
  api.applyCommands(request as never)

// ===========================================================================
// 4. The premises every case below stands on
// ===========================================================================

describe('D-325 -- the manuscript these cases are driven by', () => {
  it('still forbids the Agent API to throw, without qualifying it', () => {
    expect(REQUIREMENTS).toContain(FR_028_NEVER_THROWS)
    // ⭐ THE UNCONDITIONALITY, ASSERTED AND NOT ASSUMED. The clause carries no
    // 「〜のとき」 between the promise and the prohibition; if a future edit
    // adds one, this case is where that shows up.
    expect(FR_028_NEVER_THROWS).toContain('受理したか否かを値で返すこと。例外を投げてはならない（MUST NOT）')
  })

  it('still requires a refusal to carry the target, the category and the stamp', () => {
    expect(REQUIREMENTS).toContain(AG_9A_WHAT_A_REFUSAL_CARRIES)
  })

  it('still puts applyCommands on AM-7, answering by value, and points it at FR-028', () => {
    const row = specTable('T-107').rows.find((one) => one.id === 'AM-7')
    expect(row?.cells.join(' ')).toContain('`applyCommands`')
    expect(row?.cells.join(' ')).toContain('受理したか否かを値で返す')
    expect(row?.cells.join(' ')).toContain('`FR-028`')
    expect(GLOSSARY).toContain('| AM-7 | 書く | `applyCommands` |')
  })
})

// ===========================================================================
// 5. ⛔⛔ THE CONTROL, FIRST. Every case in section 6 asserts a REFUSAL, and a
//    build that refused everything would sail through all of them.
// ===========================================================================

describe('FR-028 / AM-7 -- the well-formed shape still works', () => {
  it('accepts a bundle whose readStamp matches, and writes it', () => {
    const it_ = bench()
    expect(it_.titleNow()).toBe(NAME_BEFORE)
    const answer = applying(it_.api, {
      readStamp: it_.stampNow(),
      commands: [{ kind: 'setProjectTitle', title: 'a name the agent chose' }],
    })
    expect(answer.accepted, JSON.stringify(answer)).toBe(true)
    expect(it_.titleNow()).toBe('a name the agent chose')
  })

  it('accepts an empty bundle whose readStamp matches', () => {
    // ⭐ AG-3 makes the bundle atomic and says nothing about it being non-empty,
    // so zero commands is a well-formed request and not a malformed one. ⛔ THE
    // BOUNDARY: `{commands: []}` WITHOUT a stamp is in section 6, and the only
    // difference between the two is the member FR-028's caller must declare.
    const it_ = bench()
    const answer = applying(it_.api, { readStamp: it_.stampNow(), commands: [] })
    expect(answer.accepted, JSON.stringify(answer)).toBe(true)
  })

  it('answers accepted with the stamp a caller holds for its next AG-2 check', () => {
    const it_ = bench()
    const answer = applying(it_.api, {
      readStamp: it_.stampNow(),
      commands: [{ kind: 'setProjectTitle', title: 'another name' }],
    })
    expect(answer.accepted).toBe(true)
    if (answer.accepted) {
      expect(answer.stamp).toEqual(it_.stampNow())
      expect(answer.stamp.scheduleUpdatedUtc).not.toBe(STARTING_STAMP.scheduleUpdatedUtc)
    }
  })
})

// ===========================================================================
// 6. 「例外を投げてはならない（MUST NOT）」 -- unconditionally
// ===========================================================================

describe('FR-028 (MUST NOT) -- a malformed request is refused, never thrown', () => {
  it.each(MALFORMED)('does not throw for $what', ({ request }) => {
    const it_ = bench()
    expect(() => applying(it_.api, request)).not.toThrow()
  })

  it.each(MALFORMED)('answers a REFUSAL for $what', ({ request }) => {
    // 「受理したか否かを値で返すこと」 -- the answer is a value, and for a shape
    // 表 T-107 does not declare that value cannot be 受理.
    const it_ = bench()
    const answer = applying(it_.api, request)
    expect(answer.accepted, JSON.stringify(answer)).toBe(false)
  })

  it.each(MALFORMED)('leaves the document untouched for $what', ({ request }) => {
    // ⭐ AG-3's atomicity read from the far end: a request that was not accepted
    // wrote nothing. ⛔ The fifth shape above carries a command that WOULD change
    // the name if it were let through, which is what stops this case from being
    // vacuous.
    const it_ = bench()
    const before = it_.titleNow()
    const stampBefore = it_.stampNow()
    applying(it_.api, request)
    expect(it_.titleNow()).toBe(before)
    expect(it_.stampNow()).toEqual(stampBefore)
  })
})

// ===========================================================================
// 7. 「拒否の値には、拒否された対象・理由の区分・現在の刻印を含めること（MUST）」
// ===========================================================================

describe('T-035 AG-9a (MUST) -- what every refusal carries', () => {
  it.each(MALFORMED)('names the target that was refused, for $what', ({ request }) => {
    const it_ = bench()
    const answer = applying(it_.api, request)
    expect(answer.accepted).toBe(false)
    if (answer.accepted) return
    expect(typeof answer.refusal.target).toBe('string')
    expect(answer.refusal.target.length).toBeGreaterThan(0)
  })

  it.each(MALFORMED)('carries a category for the reason, for $what', ({ request }) => {
    // ⚠️ WHICH category is not asserted, and cannot be: AG-9a asks for 「理由の
    // 区分」 and no row of any table enumerates the categories. What the row
    // does require is that there BE one, and that it be usable for retrying --
    // so it has to be a value a caller can branch on rather than a sentence.
    const it_ = bench()
    const answer = applying(it_.api, request)
    expect(answer.accepted).toBe(false)
    if (answer.accepted) return
    expect(typeof answer.refusal.reason).toBe('string')
    expect(answer.refusal.reason.length).toBeGreaterThan(0)
  })

  it.each(MALFORMED)('carries the CURRENT stamp, all three values, for $what', ({ request }) => {
    // 「現在の刻印」 with FR-063's three (AT-127 to AT-129): 「そのまま再試行に
    // 使える形にする」 means the caller can put this straight back into
    // `readStamp`, which WS-1 compares in full.
    const it_ = bench()
    const answer = applying(it_.api, request)
    expect(answer.accepted).toBe(false)
    if (answer.accepted) return
    expect(answer.refusal.stamp).toEqual(it_.stampNow())
    expect(Object.keys(answer.refusal.stamp).sort()).toEqual([
      'lastEditedBy',
      'scheduleUpdatedUtc',
      'settingsUpdatedUtc',
    ])
  })

  it('the stamp a refusal carries is good enough to retry with', () => {
    // ⭐⭐ THE ROW'S OWN TEST OF ITSELF: 「そのまま再試行に使える形にする
    // （`UC-012` 拡張 3a）」. A stamp that came back from a refusal and did not
    // then work as a `readStamp` would satisfy the letter of AG-9a and none of
    // its purpose.
    const it_ = bench()
    const refused = applying(it_.api, { commands: [] })
    expect(refused.accepted).toBe(false)
    if (refused.accepted) return
    const retried = applying(it_.api, {
      readStamp: refused.refusal.stamp,
      commands: [{ kind: 'setProjectTitle', title: 'the retry landed' }],
    })
    expect(retried.accepted, JSON.stringify(retried)).toBe(true)
    expect(it_.titleNow()).toBe('the retry landed')
  })
})
