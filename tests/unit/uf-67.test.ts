// Unit tests for `noticesFromSession` (unit UF-67 of table T-075, component
// CP-37 of table T-062, which table T-064 publishes as PI-37).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN AGAINST THE SPECIFICATION (docs/development-rules/
// 04-verification.md, 1.). Every expected value below comes from a requirement
// or a table, never from what the unit happens to produce.
//
// ⭐ WHERE THE SPECIFICATION DECIDES NOTHING, NOTHING IS ASSERTED. Three
// questions have no answer in docs/spec, and no case here invents one:
//   * the ORDER several shown notices stand in -- no row of table T-037 ranks
//     one manner above another, and the note under table T-077 puts the
//     gathered surface outside the boot order. So the cases below assert
//     membership and counts, never a position.
//   * WHAT STANDS BETWEEN two gathered texts -- NT-4 fixes that all of them go
//     and fixes nothing about the writing, and `_assets/tbl-settings.md` holds
//     no notice row at all. A case therefore asks that each text is THERE and
//     that no WORD was added, not what the joiner is.
//   * WHAT COUNT the gathered surface carries -- NT-3 asks a count of a
//     destructive result and NT-4 asks for none, so `affectedCount` on the
//     gathered surface is asserted nowhere.
//
// The rules these cases answer to:
//   FR-076    「表 T-037 の作法に従うこと」-- the table binds every telling
//   NT-4      「1 枚に集約して出すこと（全数）」／「別々の面で順に出さない」
//   NT-1      「どの項目が、なぜ誤りかを文字で示すこと（MUST）」-- a joined
//             text stops naming WHICH item is wrong, so nothing but NT-4's own
//             run may ever be collapsed
//   NT-3      「対象の件数を添えること」
//   NT-3a     「次に取れる手段を添えること（MUST）」
//   NT-5      「`NT-1`（受け付けないとき）と見分けがつく形にすること（MUST）」
//   NT-6      「続けられないことと、いま何ができるかを示すこと（MUST）」
//   FR-038    the display language, with no store of translated strings named
//             anywhere -- so no word may be written here
//   NT-2/FT-4 a notice that goes away with time is the shell's (table T-078),
//             and CS-1 of table T-066 keeps the clock away from a `pure` unit
//   R7.1      `pure` in table T-075. 引数の書き換え is a non-pure effect
//
// ⭐ Chapter 1.9 asks a test of a requirement that points at a table to be
// driven by a fixed copy of the table, with one test walking every row. T_037
// below is that copy.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import type {
  CommandItem,
  Confirmation,
  ConfirmationItem,
  DisplayLanguage,
  Notice,
  RaisedConfirmation,
  ScreenSession,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  confirmationFromSession,
  noticesFromSession,
} from '../../src/adapter/screen-renderer/notices'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The fixed copy of the table these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * 表 T-037 — 知らせるときの作法, in the order the table prints its rows.
 *
 * `binds` says whose duty the row is. Every row but one can only be satisfied
 * where the notice is MADE -- the words, the next step, the count, the look --
 * and none of them can be decided from a notice that already exists. NT-4 is
 * the only row that speaks about SEVERAL notices at once, so it is the only row
 * with work to do where they are chosen.
 */
const T_037 = [
  { row: 'NT-1', when: '入力を受け付けないとき', binds: 'raiser' },
  { row: 'NT-2', when: '時間で消える通知', binds: 'raiser' },
  { row: 'NT-3', when: '破壊的な結果を伴うとき', binds: 'raiser' },
  { row: 'NT-3a', when: '失敗の通知', binds: 'raiser' },
  { row: 'NT-4', when: '起動時の保留中の用件', binds: 'shown' },
  { row: 'NT-6', when: '資源の上限に達したとき', binds: 'raiser' },
  { row: 'NT-5', when: '受け付けたうえで注意を伝えるとき', binds: 'raiser' },
  { row: 'NT-7', when: '続けてよいかを問うとき', binds: 'raiser' },
] as const

/** The row of table T-037 whose several notices become one surface. */
const STARTUP_PENDING = 'NT-4'

const OTHER_ROWS = T_037.filter((entry) => entry.row !== STARTUP_PENDING)

// ---------------------------------------------------------------------------
// Inputs. `Notice` has four members and `ScreenSession` has nine; a case pins
// the notices it means and every other member of the session is inert here,
// because UF-67 fills one member of `ScreenView` and reads none of the others.
// ---------------------------------------------------------------------------

const noticeOf = (
  manner: string,
  text: string,
  nextSteps: readonly string[] = [],
  affectedCount: number | null = null,
): Notice => ({ manner, text, nextSteps, affectedCount })

const sessionOf = (notices: readonly Notice[]): ScreenSession => ({
  language: 'ja',
  autosave: { kind: 'saved', at: '2026-08-19T09:00:00Z' },
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  propertiesShowing: null,
  notices,
  confirmation: null,
  rowBoxes: [],
})

// The four raisers NT-4 names by hand: 復帰・復旧の確認・`Agent API` の有効化・
// 透かしに出す名前の設定（FR-086）. Each carries a next step of its own so that
// NT-3a's MUST can be watched across the gathering.
const PENDING_RESTORE = noticeOf(STARTUP_PENDING, 'the file permission was lost', ['grant it again'])
const PENDING_RECOVERY = noticeOf(STARTUP_PENDING, 'a newer autosave was found', [
  'open the autosave',
  'discard the autosave',
])
const PENDING_AGENT_API = noticeOf(STARTUP_PENDING, 'the Agent API is off', ['turn the API on'])
const PENDING_WATERMARK = noticeOf(STARTUP_PENDING, 'the watermark has no name', ['type a name'])

const REFUSAL = noticeOf('NT-1', 'finish stands before start', ['put finish after start'])
const WARNING = noticeOf('NT-5', 'the assignee name spread to three tasks', ['undo the spread'], 3)
const DESTRUCTIVE = noticeOf('NT-3', 'deleting this reaches twelve rows', ['undo the delete'], 12)
const FAILURE = noticeOf('NT-3a', 'the autosave did not finish', ['save the file by hand'])
const AT_LIMIT = noticeOf('NT-6', 'no more rows can be pinned', ['unpin a row first'])

// ---------------------------------------------------------------------------
// Reading the answer.
// ---------------------------------------------------------------------------

const isStartupPending = (notice: Notice): boolean => notice.manner === STARTUP_PENDING

/** The one surface NT-4 asks for. Fails the case when there is not exactly one. */
const gatheredOf = (shown: readonly Notice[]): Notice => {
  const pending = shown.filter(isStartupPending)
  expect(pending.length, 'NT-4: 保留中の用件は 1 枚に集約して出す').toBe(1)
  return pending[0] as Notice
}

/**
 * What is left of `whole` once each of `parts` has been taken out of it once.
 *
 * ⭐ This is how a case can ask FR-038's question -- "was a word written here?"
 * -- without knowing what the specification leaves open, namely what stands
 * between two texts. A separator carries no letter and no digit; a heading,
 * a bullet's label or a count would, in either display language.
 */
const residueAfterRemoving = (whole: string, parts: readonly string[]): string => {
  let rest = whole
  for (const part of parts) {
    const at = rest.indexOf(part)
    expect(at, `NT-4（全数）: 「${part}」が 1 枚の上に無い`).toBeGreaterThanOrEqual(0)
    rest = rest.slice(0, at) + rest.slice(at + part.length)
  }
  return rest
}

const hasWord = (text: string): boolean => /[\p{L}\p{N}]/u.test(text)

// ---------------------------------------------------------------------------

describe('UF-67 -- NT-4 (MUST): 起動時の保留中の用件を 1 枚に集約して出す（全数）', () => {
  it('shows the several pending items as ONE surface, keeping the other rows apart', () => {
    // NT-4: 「1 枚に集約して出すこと（全数）」。The two notices that follow
    // other rows are not part of that run and stay two.
    const shown = noticesFromSession(
      sessionOf([REFUSAL, PENDING_RESTORE, WARNING, PENDING_RECOVERY, PENDING_AGENT_API]),
    )

    expect(shown.filter(isStartupPending).length).toBe(1)
    expect(shown.length, 'NT-1 と NT-5 の 2 つに、集約した 1 枚を足した数').toBe(3)
  })

  it('never shows the pending items 別々の面で順に, however many were raised', () => {
    // NT-4: 「復帰・復旧の確認・`Agent API` の有効化・透かしに出す名前の設定
    // （`FR-086`）を別々の面で順に出さない」。
    const raisers = [PENDING_RESTORE, PENDING_RECOVERY, PENDING_AGENT_API, PENDING_WATERMARK]
    for (let count = 2; count <= raisers.length; count += 1) {
      const shown = noticesFromSession(sessionOf(raisers.slice(0, count)))
      expect(shown.filter(isStartupPending).length, `保留中 ${count} 件でも面は 1 つ`).toBe(1)
      expect(shown.length, `保留中 ${count} 件のほかに知らせは無い`).toBe(1)
    }
  })

  it('puts the text of every pending item on that one surface', () => {
    const raised = [PENDING_RESTORE, PENDING_RECOVERY, PENDING_AGENT_API, PENDING_WATERMARK]
    const gathered = gatheredOf(noticesFromSession(sessionOf(raised)))
    for (const pending of raised) {
      expect(gathered.text, `NT-4（全数）: ${pending.text}`).toContain(pending.text)
    }
  })

  it('has no cap on how many pending items reach the one surface', () => {
    // ⛔ No row of table T-037, no line of FR-076 and no key of
    // `_assets/tbl-settings.md` names a number of notices, so 全数 is 全数.
    const many = Array.from({ length: 12 }, (_, index) =>
      noticeOf(STARTUP_PENDING, `pending item number ${index}`, [`step number ${index}`]),
    )
    const gathered = gatheredOf(noticesFromSession(sessionOf(many)))

    for (const pending of many) expect(gathered.text).toContain(pending.text)
    expect([...gathered.nextSteps].sort()).toEqual([...many.flatMap((n) => n.nextSteps)].sort())
  })

  it('loses no next step on the way onto the one surface (NT-3a, MUST NOT)', () => {
    // NT-3a: 「失敗したことだけを伝えて手段を示さない通知を出してはならない
    // （MUST NOT）」。Every next step raised is distinct here, so nothing about
    // duplicates is being asked.
    const raised = [PENDING_RESTORE, PENDING_RECOVERY, PENDING_AGENT_API]
    const gathered = gatheredOf(noticesFromSession(sessionOf(raised)))

    expect([...gathered.nextSteps].sort()).toEqual([...raised.flatMap((n) => n.nextSteps)].sort())
  })

  it('writes no word of its own onto the one surface (FR-038)', () => {
    // FR-038 names no store of translated strings, so a heading, a label or a
    // number written here would be a word in one language only. What may stand
    // between two texts is left open; what may NOT stand there is a word.
    const raised = [PENDING_RESTORE, PENDING_RECOVERY, PENDING_AGENT_API]
    const gathered = gatheredOf(noticesFromSession(sessionOf(raised)))

    const residue = residueAfterRemoving(
      gathered.text,
      raised.map((notice) => notice.text),
    )
    expect(hasWord(residue), `1 枚の上に足された語: ${JSON.stringify(residue)}`).toBe(false)
  })

  it('gives the one surface words to be read (NT-1 forbids colour alone)', () => {
    const gathered = gatheredOf(noticesFromSession(sessionOf([PENDING_RESTORE, PENDING_RECOVERY])))
    expect(gathered.text.length).toBeGreaterThan(0)
    expect(gathered.manner, '集約した 1 枚が従う行は 起動時の保留中の用件').toBe(STARTUP_PENDING)
  })

  it('gathers a pending item that arrived with no next step, rather than dropping it', () => {
    // NT-4 asks for 全数. A pending item without a next step is still one of
    // them, so its text goes on. ⚠️ What becomes of a FAILURE raised with no
    // next step at all is a separate question the specification does not
    // answer, and no case here asserts it.
    const bare = noticeOf(STARTUP_PENDING, 'the watermark has no name', [])
    const gathered = gatheredOf(noticesFromSession(sessionOf([PENDING_RESTORE, bare])))

    expect(gathered.text).toContain(bare.text)
    expect(gathered.text).toContain(PENDING_RESTORE.text)
  })
})

describe('UF-67 -- 表 T-037: 集約するのは NT-4 の run だけである', () => {
  it('carries a notice of every other row through untouched (one case, every row)', () => {
    // Chapter 1.9: one test walks every row of the table it is driven by.
    // NT-1 (MUST) has to say WHICH item is wrong, NT-5 (MUST) has to stay
    // distinguishable from NT-1, NT-3 carries a count and NT-6 carries what can
    // be done now -- none of which survives being rewritten here.
    for (const entry of OTHER_ROWS) {
      const one = noticeOf(entry.row, `${entry.row}: ${entry.when}`, [`${entry.row} の次の手`], 4)
      const shown = noticesFromSession(
        sessionOf([PENDING_RESTORE, one, PENDING_RECOVERY, PENDING_AGENT_API]),
      )
      const carried = shown.filter((notice) => notice.manner === entry.row)

      expect(carried.length, `${entry.row} は 1 つのまま出る`).toBe(1)
      expect(carried[0], `${entry.row} は書き換えられずに出る`).toEqual(one)
    }
  })

  it('never merges two notices that follow one and the same other row', () => {
    for (const entry of OTHER_ROWS) {
      const first = noticeOf(entry.row, `${entry.row} the first item`, ['the first step'])
      const second = noticeOf(entry.row, `${entry.row} the second item`, ['the second step'])
      const shown = noticesFromSession(
        sessionOf([first, PENDING_RESTORE, second, PENDING_RECOVERY]),
      )
      const both = shown.filter((notice) => notice.manner === entry.row)

      expect(both.length, `${entry.row} の 2 つは 2 つのまま`).toBe(2)
      expect(both.map((notice) => notice.text).sort()).toEqual(
        [first.text, second.text].sort(),
      )
    }
  })

  it('keeps NT-5 telling apart from NT-1 (NT-5, MUST)', () => {
    // NT-5: 「受け付けた事実と注意を同じ面で示し、`NT-1`（受け付けないとき）と
    // 見分けがつく形にすること（MUST）」。The manner is what tells the two
    // apart, so neither may end up wearing the other's.
    const shown = noticesFromSession(sessionOf([REFUSAL, WARNING, PENDING_RESTORE]))
    const manners = shown.map((notice) => notice.manner).sort()

    expect(manners).toEqual(['NT-1', 'NT-4', 'NT-5'])
  })

  it('carries the count NT-3 added, and the absence of one, untouched', () => {
    // NT-3: 「対象の件数を添えること」。`Notice.affectedCount` is `null` where
    // the row asks for no count, so both values have to survive as they are.
    const none = noticeOf('NT-3', 'nothing is reached', ['undo it'], 0)
    const shown = noticesFromSession(
      sessionOf([DESTRUCTIVE, none, REFUSAL, PENDING_RESTORE, PENDING_RECOVERY]),
    )
    const countOf = (text: string): number | null =>
      (shown.find((notice) => notice.text === text) as Notice).affectedCount

    expect(countOf(DESTRUCTIVE.text)).toBe(12)
    expect(countOf(none.text)).toBe(0)
    expect(countOf(REFUSAL.text)).toBeNull()
  })

  it('withholds nothing that was raised', () => {
    // Every row of table T-037 states its duty as something GRS shows the
    // person; a raised notice that is never shown discharges none of them. The
    // one change NT-4 asks for is that its own run arrives as one surface, so
    // each of those texts is looked for there instead.
    const raised = [REFUSAL, FAILURE, PENDING_RESTORE, AT_LIMIT, PENDING_RECOVERY, DESTRUCTIVE]
    const shown = noticesFromSession(sessionOf(raised))
    const gathered = gatheredOf(shown)

    for (const notice of raised) {
      const told = isStartupPending(notice)
        ? gathered.text.includes(notice.text)
        : shown.some((one) => one.manner === notice.manner && one.text === notice.text)
      expect(told, `raised but never told: ${notice.manner} / ${notice.text}`).toBe(true)
    }
    expect(shown.length, '集約した 1 枚と、集約しない 4 つ').toBe(5)
  })

  it('drops nothing for having run out of time (NT-2 belongs to the shell)', () => {
    // FT-4 of table T-078 leaves the reading of the clock to `SingleHtmlShell`,
    // and CS-1 of table T-066 keeps it out of a `pure` unit. So a notice that
    // follows NT-2 is shown exactly like any other while it is raised.
    const fading = noticeOf('NT-2', 'the export finished', ['dismiss it'])
    const shown = noticesFromSession(sessionOf([fading]))

    expect(shown).toEqual([fading])
  })
})

describe('UF-67 -- boundaries', () => {
  it('tells nothing when nothing was raised', () => {
    expect(noticesFromSession(sessionOf([]))).toEqual([])
  })

  it('tells one notice that follows no gathering row exactly as it was raised', () => {
    expect(noticesFromSession(sessionOf([REFUSAL]))).toEqual([REFUSAL])
  })

  it('leaves a LONE pending item as the one surface it already is', () => {
    // NT-4 asks for 1 枚; with one pending item there is nothing to gather.
    // ⚠️ Whether its own count would survive being rebuilt is a question the
    // specification does not answer, so only the text, the manner and the next
    // steps -- all of which NT-4 and NT-3a do fix -- are asserted.
    const shown = noticesFromSession(sessionOf([PENDING_RECOVERY]))

    expect(shown.length).toBe(1)
    const only = shown[0] as Notice
    expect(only.manner).toBe(STARTUP_PENDING)
    expect(only.text).toBe(PENDING_RECOVERY.text)
    expect([...only.nextSteps].sort()).toEqual([...PENDING_RECOVERY.nextSteps].sort())
  })

  it('leaves a lone pending item alone while other rows stand beside it', () => {
    const shown = noticesFromSession(sessionOf([REFUSAL, PENDING_WATERMARK, AT_LIMIT]))

    expect(shown.length).toBe(3)
    expect(shown.filter(isStartupPending).length).toBe(1)
    expect(shown.map((notice) => notice.manner).sort()).toEqual(['NT-1', 'NT-4', 'NT-6'])
  })

  it('keeps an empty next-step list empty', () => {
    // ⛔ FR-038 puts no words anywhere this unit could reach, so a missing next
    // step cannot be manufactured -- it may only stay missing.
    const bare = noticeOf('NT-5', 'accepted, with a warning', [])
    const shown = noticesFromSession(sessionOf([bare]))

    expect((shown[0] as Notice).nextSteps).toEqual([])
  })

  it('gathers pending items that carry no next step at all into an empty list', () => {
    const first = noticeOf(STARTUP_PENDING, 'the first pending item', [])
    const second = noticeOf(STARTUP_PENDING, 'the second pending item', [])
    const gathered = gatheredOf(noticesFromSession(sessionOf([first, second])))

    expect(gathered.nextSteps).toEqual([])
    expect(gathered.text).toContain(first.text)
    expect(gathered.text).toContain(second.text)
  })
})

describe('UF-67 -- @purity pure (table T-075, R7.1)', () => {
  it('rewrites none of what it was given', () => {
    // R7.1 counts 引数の書き換え among the non-pure effects, and table T-075
    // makes UF-67 `pure`.
    const raised: Notice[] = [REFUSAL, PENDING_RESTORE, WARNING, PENDING_RECOVERY]
    const before = structuredClone(raised)
    const session = sessionOf(raised)

    noticesFromSession(session)

    expect(raised).toEqual(before)
    expect(session.notices).toEqual(before)
  })

  it('answers the same session the same way twice (参照透過)', () => {
    const session = sessionOf([REFUSAL, PENDING_RESTORE, DESTRUCTIVE, PENDING_AGENT_API])

    expect(noticesFromSession(session)).toEqual(noticesFromSession(session))
  })
})

// ===========================================================================
// Added for `confirmationFromSession` -- NT-7 of table T-037, the row that asks
// rather than tells -- and for NT-5, the manner OP-11 of table T-024a sends its
// telling to. Written against docs/spec only; the unit's body was not read.
//
// ⭐ WHAT MOVED, AND IN WHICH DIRECTION. These cases were written when a
// question reached the screen exactly as it had been raised, and they asserted
// deep equality against the raised value itself. Version 0.88 of the
// specification (CR-211, A-appendix.md:116) settled the two answers:
// 「確認の 2 択に入口を与えた —— 表 T-103 に `U-55`（`Confirmation`）、表 T-109
// に `IC-69` / `IC-70`、図 F-019 に図形 2 つ」, and table T-109 now prints
//
//     | IC-69 | `Confirmation` | — | 問いに「続ける」と答える | 表 T-037 の `NT-7` |
//     | IC-70 | `Confirmation` | — | 問いに「取りやめる」と答える | 表 T-037 の `NT-7` |
//
// The preamble of section 8 of `_assets/tbl-glossary.md` makes that second
// column the placement -- 「`面` の欄は 表 T-103 の確定名である。新しい面の名を
// 作らない」-- so WHICH entries stand on the `Confirmation` surface is the
// roster's answer and not the asker's. What reaches the screen is therefore
// wider than what was raised.
//
// ⛔ THAT IS THE MANUSCRIPT MOVING, NOT THESE EXPECTATIONS BEING BENT TO THE
// CODE. Nothing below was relaxed: every case still demands that the raised
// half comes back WHOLE and UNTOUCHED. What changed is that the expected value
// is now "what was raised, PLUS the entries table T-109 places on that surface,
// in that table's print order" -- and the entries are read out of the roster,
// never typed here, so an entry added to or taken off U-55 in the manuscript
// moves these cases with it instead of leaving them agreeing with stale code.
//
// ⚠️ HONEST NOTE ON WHAT WAS SEEN. `notices.ts` was not opened at all. What was
// read is `screen-renderer.ts` -- the file table T-064 makes the contract -- for
// the declarations of `RaisedConfirmation`, `Confirmation` and `CommandItem`,
// which is where the two halves and the four members of an entry are declared.
// ⭐ The VALUES below are not taken from those doc comments: each one is argued
// from a sentence of docs/spec named beside it, and the row ids and the words
// are read out of the generated roster and dictionary rather than typed.
//
// The rules these cases answer to:
//   表 T-109  its preamble makes the 面 column table T-103's settled names, and
//             IC-69 / IC-70 are the two rows it places on `Confirmation`
//   FR-029   「アイコンの名簿と置き場は…表 T-109 に…従うこと（MUST）」, and
//             (MUST) what cannot be used is drawn faint with its reason
//   U-55     表 T-103: 「続けてよいかを問う面。…2 択の入口は表 T-109 の `IC-69`
//             / `IC-70` が持つ」
//   FR-038   「画面に刷る語は、言語ごとの辞書として 1 か所に持つこと（MUST）」--
//             so an entry's word is the dictionary's, keyed by its row id, and
//             「対象は `ja` と `en` の 2 言語とする」. ⚠️ Every word in that
//             dictionary is empty today (PD-160), so a case that read it and
//             compared could not fail -- see the block above the cases: they
//             hand the unit a dictionary this file BUILDS, whose words differ by
//             row and by language, and ask which one came out
//   NT-7   「何が起きるかを示したうえで、続けるか取りやめるかを選ばせること
//          （MUST）」／「消えるもの・解かれるものがあるときは、その名前を挙げる
//          こと（MUST）」／「問うてよいのは、要求が確認を求めると定めた場面だけ
//          とすること（MUST）」
//   DI-4   表 T-227:「同じとみなせない相手へ書き出そうとするときは、上書きして
//          よいかを問うこと（MUST）—— 作法は 表 T-037 の `NT-7`。消えるものの
//          名前を挙げる義務はここには無い」-- so an EMPTY list of names is a
//          real answer and a question carrying one may not be dropped
//   FR-031 「場面を列挙してはならない（MUST NOT）」-- so nothing here may sort
//          the questions by which requirement raised them
//   NT-5   「操作を止めないこと（MUST）」／「`NT-1`（受け付けないとき）と見分け
//          がつく形にすること（MUST）」-- OP-11 of table T-024a sends its
//          telling here: 先頭の 1 つだけを受け入れ、残りを無視したことを告げる
//   NT-3   「対象の件数を添えること」-- the count OP-11 has to carry
//   R7.1   `pure` in table T-075
// ===========================================================================

/**
 * The three places a requirement says 確認を求める, as of table T-227.
 *
 * ⛔ A roster of INPUTS, never of what may be shown: FR-031 forbids enumerating
 * the places that may ask (MUST NOT), so these cases prove that each of the
 * three comes back UNCHANGED -- which is what a unit that does not know the
 * roster does. `items` is copied from what each requirement asks for by name:
 * FR-032 the row and its WBS descendants, FR-099 the tasks an unassignment
 * reaches, and DI-4 nothing at all.
 */
const NT_7_ASKING_SITES = [
  {
    by: 'FR-032',
    text: 'this row and its WBS descendants would go',
    items: [
      { name: 'foundation work', isShownOnAnotherRow: false },
      { name: 'steel delivery', isShownOnAnotherRow: true },
    ],
  },
  {
    by: 'FR-099',
    text: 'the assignments on these tasks would be released',
    items: [{ name: 'painting', isShownOnAnotherRow: false }],
  },
  {
    by: 'DI-4',
    text: 'the file at that place is not this document and would be written over',
    items: [],
  },
] as const satisfies readonly {
  readonly by: string
  readonly text: string
  readonly items: readonly ConfirmationItem[]
}[]

/** The row of table T-037 a question follows. */
const ASKING = 'NT-7'

/** U-55 of 表 T-103 -- the settled name of the surface a question stands on. */
const U_55_CONFIRMATION = 'Confirmation'

const SRC_SCREEN_RENDERER = join(process.cwd(), 'src', 'adapter', 'screen-renderer')

const readJson = (file: string): unknown =>
  JSON.parse(readFileSync(join(SRC_SCREEN_RENDERER, file), 'utf8')) as unknown

/**
 * 表 T-109 as it reaches `src/`, read at load time rather than copied by hand.
 *
 * ⭐ Chapter 1.9 asks a test of a requirement pointing at a table to be driven
 * by that table. `icon-roster.json` is generated from the manuscript's own rows
 * (its `$comment` names the source and the generator, and `npm run gen:check`
 * fails on drift), so reading it re-types nothing -- rule 03 of
 * docs/development-rules forbids re-typing a value the specification holds.
 * ⚠️ It is also the file the unit reads, so agreement with it alone would not
 * prove agreement with the manuscript. That is what the first case below is
 * for: it holds this roster against `_assets/tbl-glossary.md` itself.
 */
const ROSTER = (readJson('icon-roster.json') as {
  readonly icons: readonly { readonly rowId: string; readonly surfaces: readonly string[] }[]
}).icons

/**
 * 表 T-109's rows whose 面 column places them on U-55, in the table's own print
 * order -- which the roster preserves, being generated row by row.
 */
const T_109_ON_CONFIRMATION = ROSTER.filter((icon) =>
  icon.surfaces.includes(U_55_CONFIRMATION),
).map((icon) => icon.rowId)

/** The same question asked of the manuscript, so the two can be held together. */
const T_109_ON_CONFIRMATION_IN_MANUSCRIPT = specTable('T-109')
  .rows.filter((row) =>
    (row.by['面'] ?? '')
      .split('/')
      .map((one) => bare(one.trim()))
      .includes(U_55_CONFIRMATION),
  )
  .map((row) => row.id)

/**
 * The one dictionary FR-038 (MUST) puts every printed word in, keyed by the row
 * of 表 T-109 -- `_source/display-words.json` as Chapter 6.2 generates it into
 * `src/`. ⛔ No word is written here: 「要求にも表にも語そのものを書いてはならない
 * （MUST NOT）」, and the same reason bars a test from minting one.
 */
const DISPLAY_WORDS = (readJson('display-words.json') as {
  readonly icons: readonly {
    readonly rowId: string
    readonly label: Readonly<Record<DisplayLanguage, string>>
  }[]
}).icons

const labelOf = (rowId: string, language: DisplayLanguage): string => {
  const word = DISPLAY_WORDS.find((one) => one.rowId === rowId)
  expect(word, `FR-038: the dictionary has no row for ${rowId}`).toBeDefined()
  return (word as { readonly label: Readonly<Record<DisplayLanguage, string>> }).label[language]
}

/**
 * The entries 表 T-109 places on U-55, as `CommandItem`s, in that table's order.
 *
 * ⭐ `isEnabled` is true on both. NT-7 (MUST) 「続けるか取りやめるかを選ばせる
 * こと」-- choosing between the two IS this surface, so neither can be spent;
 * FR-029 (MUST) reserves the faint drawing for what cannot be used, and nothing
 * makes either of these unusable.
 * ⭐ `isPressed` is false on both. It says a TOGGLE IS ON, which 表 T-109 marks
 * with 「出す・しまう」 in its 何の入口か column (IC-4, IC-7, IC-8 ...). These two
 * read 「問いに「続ける」と答える」/「問いに「取りやめる」と答える」-- an answer
 * given once, with no off.
 * ⭐ `label` is the dictionary's word for that row in the display language,
 * which is where FR-038 (MUST) puts every word the screen prints.
 */
const entriesOnConfirmation = (language: DisplayLanguage): readonly CommandItem[] =>
  T_109_ON_CONFIRMATION.map((rowId) => ({
    icon: rowId,
    isEnabled: true,
    isPressed: false,
    label: labelOf(rowId, language),
  }))

/**
 * The raised half -- what an asker can know. ⛔ It carries no entries: the two
 * answers are 表 T-109's, so an asker naming them would be writing the roster's
 * answer.
 */
const confirmationOf = (
  text: string,
  items: readonly ConfirmationItem[],
  manner: string = ASKING,
): RaisedConfirmation => ({ manner, text, items })

/**
 * What the screen owes for a question that was raised: what was raised, plus
 * the entries 表 T-109 places on the surface it stands on, in that order.
 */
const shownFor = (
  raised: RaisedConfirmation,
  language: DisplayLanguage = 'ja',
): Confirmation => ({ ...raised, entries: entriesOnConfirmation(language) })

const sessionAsking = (
  confirmation: RaisedConfirmation | null,
  notices: readonly Notice[] = [],
): ScreenSession => ({ ...sessionOf(notices), confirmation })

/**
 * OP-11 of table T-024a as it reaches this unit: 受け付けたうえで注意を伝える
 * (NT-5), with 表 T-037 の NT-3 の件数 standing for 無視した残りの数.
 */
const OP_11_TELLING = noticeOf(
  'NT-5',
  'the first file was opened; the rest of the hand-over was ignored',
  ['hand the others over one at a time'],
  2,
)

// ---------------------------------------------------------------------------
// A dictionary this file BUILDS, and the way it is put in front of the unit.
// ---------------------------------------------------------------------------

/** FR-038: 「対象は `ja` と `en` の 2 言語とする」. */
const LANGUAGES = ['ja', 'en'] as const satisfies readonly DisplayLanguage[]

/**
 * ⛔ WHY A DICTIONARY IS BUILT AT ALL. Every word in the one FR-038 names is the
 * empty string today (PD-160: the manuscript is unwritten and an agent may not
 * invent a word), so a case that READ that dictionary and held the answer
 * against it would be holding '' against '' -- which is equally true of a unit
 * that keys by the wrong row, of one that never looks at the display language,
 * and of one that writes a constant. Such a case cannot fail, whatever its title
 * says. So these cases hand the unit a dictionary whose every word is DISTINCT
 * by row and by language, and then ask WHICH word came out.
 *
 * ⛔ NO WORD OF EITHER LANGUAGE IS MINTED HERE. FR-038's MUST NOT bars writing
 * the word itself into a requirement or a table, and a test may not settle one
 * either. What is below is not a word: it is the row id and the language spelled
 * back, made to be told apart. Which entry of the dictionary an entry of the
 * screen was read from is the whole of what FR-038 fixes while every word is
 * empty, and it is exactly what a mark can measure.
 */
const markForRow = (rowId: string, language: DisplayLanguage): string =>
  `<${language}/${rowId}/label>`

/**
 * A mark keyed the way the `confirmation` section of that same dictionary is
 * keyed -- by the ANSWER (`proceed` / `cancel`), not by a row of 表 T-109.
 *
 * ⚠️ A DECOY, and why laying one is fair: the preamble above 表 T-109 says
 * 「繋ぎ目は行 ID `IC-nn` だけである」, and nothing in docs/spec joins the words
 * `proceed` / `cancel` to a row of that table. An entry that came back wearing
 * one of these was joined by something the specification has not settled, and
 * the case below says so rather than passing.
 */
const markForAnswer = (answer: string, language: DisplayLanguage): string =>
  `<${language}/${answer}/text>`

/** The module the unit reads its words from -- Chapter 6.2's generated file. */
const DISPLAY_WORDS_MODULE = '../../src/adapter/screen-renderer/display-words.json'

interface DictionaryShape {
  readonly icons: readonly { readonly rowId: string }[]
  readonly confirmation: readonly { readonly answer: string }[]
}

/**
 * The generated dictionary with every word replaced by a mark of this file's.
 *
 * ⭐ The SHAPE is the real file's, read off the disk rather than typed here, so
 * the unit is handed the very keys it always gets and only the words move. ⛔ No
 * row id is written down: which rows exist is still 表 T-109's answer.
 */
function dictionaryOfMarks(): unknown {
  const onDisk = readJson('display-words.json') as DictionaryShape & Record<string, unknown>
  const inBothLanguages = (
    word: (language: DisplayLanguage) => string,
  ): Record<DisplayLanguage, string> => ({ ja: word('ja'), en: word('en') })

  return {
    ...onDisk,
    icons: onDisk.icons.map((entry) => ({
      ...entry,
      label: inBothLanguages((language) => markForRow(entry.rowId, language)),
      hint: inBothLanguages((language) => `<${language}/${entry.rowId}/hint>`),
    })),
    confirmation: onDisk.confirmation.map((entry) => ({
      ...entry,
      text: inBothLanguages((language) => markForAnswer(entry.answer, language)),
    })),
  }
}

/**
 * The question as the screen receives it, with the built dictionary standing
 * where the generated one stands.
 *
 * ⚠️ The unit reads the dictionary as a MODULE, so the module is what is
 * replaced, and only for the length of one case. The cases that hold the answer
 * against the REAL dictionary (`shownFor`) go on reading the file on disk and
 * are untouched by this.
 */
async function shownWithMarkedDictionary(language: DisplayLanguage): Promise<Confirmation> {
  vi.resetModules()
  vi.doMock(DISPLAY_WORDS_MODULE, () => ({ default: dictionaryOfMarks() }))
  try {
    const fresh = await import('../../src/adapter/screen-renderer/notices')
    const asked = confirmationOf('two tasks would go', [])
    const shown = fresh.confirmationFromSession({ ...sessionAsking(asked), language })
    expect(shown, 'a raised question came back as none').not.toBeNull()
    return shown as Confirmation
  } finally {
    vi.doUnmock(DISPLAY_WORDS_MODULE)
    vi.resetModules()
  }
}

// ---------------------------------------------------------------------------

describe('UF-67 -- NT-7 (MUST): 続けてよいかを問う', () => {
  it('GIVEN no question was raised WHEN the view is filled THEN there is none to answer (the empty case)', () => {
    expect(confirmationFromSession(sessionAsking(null))).toBeNull()
  })

  it('GIVEN a question was raised WHEN the view is filled THEN it comes back exactly as it was raised', () => {
    // NT-7 asks for 何が起きるか in words and for the names of what would go,
    // and neither can be known anywhere but where the question is raised.
    const asked = confirmationOf('twelve rows would go', [
      { name: 'foundation work', isShownOnAnotherRow: false },
    ])

    expect(confirmationFromSession(sessionAsking(asked))).toEqual(shownFor(asked))
  })

  it('GIVEN each place a requirement asks WHEN the view is filled THEN each comes back untouched (one case walks the roster; FR-031 MUST NOT)', () => {
    // FR-031 no longer counts the places that may ask, so filtering by WHICH
    // requirement raised the question is exactly what its MUST NOT bars.
    for (const site of NT_7_ASKING_SITES) {
      const asked = confirmationOf(site.text, site.items)

      expect(confirmationFromSession(sessionAsking(asked)), site.by).toEqual(shownFor(asked))
    }
  })

  it('GIVEN DI-4 question, which takes nothing with it WHEN the view is filled THEN it is still asked (empty items is an answer, not a missing one)', () => {
    // 表 T-227 DI-4:「消えるものの名前を挙げる義務はここには無い」。Dropping a
    // question for having no names would silence the one MUST of that table.
    const asked = confirmationOf('that file is not this document', [])

    const shown = confirmationFromSession(sessionAsking(asked))

    expect(shown).not.toBeNull()
    expect((shown as Confirmation).items).toEqual([])
    expect((shown as Confirmation).text).toBe('that file is not this document')
  })

  it('GIVEN a thing that carries no name WHEN the question is shown THEN the null name survives rather than the item being dropped', () => {
    // `Task.name` is optional in the document, so a nameless task has to stay
    // describable. A count may not stand in for the names (FR-032, FR-099).
    const asked = confirmationOf('two tasks would go', [
      { name: null, isShownOnAnotherRow: false },
      { name: 'painting', isShownOnAnotherRow: true },
    ])

    const shown = confirmationFromSession(sessionAsking(asked)) as Confirmation

    expect(shown.items).toHaveLength(2)
    expect(shown.items.map((item) => item.name)).toEqual([null, 'painting'])
    expect(shown.items.map((item) => item.isShownOnAnotherRow)).toEqual([false, true])
  })

  it('GIVEN many things would go WHEN the question is shown THEN every name reaches it (no cap; the count may not stand in)', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      name: `task number ${index}`,
      isShownOnAnotherRow: index % 2 === 0,
    }))
    const asked = confirmationOf('twelve tasks would go', many)

    expect((confirmationFromSession(sessionAsking(asked)) as Confirmation).items).toEqual(many)
  })

  it('GIVEN a question raised WHEN it is shown THEN the row of table T-037 it follows travels with it', () => {
    // `Confirmation.manner` is the join to the table, carried rather than
    // assumed -- the same move `Notice.manner` makes for NT-5 against NT-1.
    const asked = confirmationOf('that file would be written over', [])

    expect((confirmationFromSession(sessionAsking(asked)) as Confirmation).manner).toBe(ASKING)
  })

  it('GIVEN notices raised beside the question WHEN both members are filled THEN neither becomes the other (a question is not a notice)', () => {
    // NT-7 stops until it is answered and NT-1 .. NT-6 do not, so a question
    // wearing a notice's shape would let a caller show one nobody can answer.
    const asked = confirmationOf('that file would be written over', [])
    const session = sessionAsking(asked, [REFUSAL, PENDING_RESTORE, WARNING])

    const shown = noticesFromSession(session)

    expect(shown.map((notice) => notice.manner).sort()).toEqual(['NT-1', 'NT-4', 'NT-5'])
    expect(shown.some((notice) => notice.text === asked.text)).toBe(false)
    expect(confirmationFromSession(session)).toEqual(shownFor(asked))
  })

  it('GIVEN pending startup items being gathered WHEN a question stands beside them THEN NT-4 gathering does not reach it', () => {
    // NT-4 (MUST) is the only row that speaks about several at once, and it is
    // about notices. Nothing here gathers or orders questions.
    const asked = confirmationOf('a newer autosave would be discarded', [
      { name: 'the autosave of 09:00', isShownOnAnotherRow: false },
    ])
    const session = sessionAsking(asked, [PENDING_RESTORE, PENDING_RECOVERY, PENDING_AGENT_API])

    expect(noticesFromSession(session)).toHaveLength(1)
    expect(confirmationFromSession(session)).toEqual(shownFor(asked))
  })

  it('GIVEN nothing was raised at all WHEN both members are filled THEN there is nothing to tell and nothing to answer', () => {
    const session = sessionAsking(null, [])

    expect(noticesFromSession(session)).toEqual([])
    expect(confirmationFromSession(session)).toBeNull()
  })
})

describe('UF-67 -- 表 T-109: the answers the roster places on the `Confirmation` surface', () => {
  it('GIVEN the manuscript of table T-109 WHEN the generated roster is read THEN both place the same entries on U-55, in the same order', () => {
    // ⛔ WHY THIS CASE EXISTS. The roster the cases below are driven by is the
    // file the unit reads, so agreement with it alone could not tell drift from
    // agreement. This one holds it against `_assets/tbl-glossary.md` itself,
    // whose section 8 preamble says 「`面` の欄は 表 T-103 の確定名である」-- the
    // column that decides the placement.
    expect(T_109_ON_CONFIRMATION).toEqual(T_109_ON_CONFIRMATION_IN_MANUSCRIPT)
    expect(
      T_109_ON_CONFIRMATION.length,
      'U-55 of 表 T-103: 「2 択の入口は表 T-109 の `IC-69` / `IC-70` が持つ」',
    ).toBeGreaterThan(0)
  })

  it('GIVEN a question raised with no entries of its own WHEN it is shown THEN it carries the entries table T-109 places on U-55, in that table order', () => {
    // The asker cannot know them: 表 T-109 decides which entries stand on a
    // surface, so composing them onto the raised half is the unit's work.
    const asked = confirmationOf('that file would be written over', [])

    const shown = confirmationFromSession(sessionAsking(asked)) as Confirmation

    expect(shown.entries.map((entry) => entry.icon)).toEqual(T_109_ON_CONFIRMATION)
  })

  it('GIVEN the entries of that surface WHEN they are shown THEN each can be pressed and none is a toggle that is on', () => {
    // NT-7 (MUST): 「続けるか取りやめるかを選ばせること」-- an answer that could
    // not be given would leave the question unanswerable, and FR-029 (MUST)
    // keeps the faint drawing for what cannot be used. 表 T-109 marks a toggle
    // with 「出す・しまう」; these two are answers, given once, with no off.
    const shown = confirmationFromSession(
      sessionAsking(confirmationOf('twelve rows would go', [])),
    ) as Confirmation

    for (const entry of shown.entries) {
      expect(entry.isEnabled, `FR-029: ${entry.icon}`).toBe(true)
      expect(entry.isPressed, `${entry.icon} is not a toggle`).toBe(false)
    }
  })

  it('GIVEN the dictionary on disk WHEN the entries are shown THEN each carries the word it holds for that row and language, whatever it is', () => {
    // FR-038 (MUST): 「画面に刷る語は、言語ごとの辞書として 1 か所に持つこと」.
    // ⚠️ WHAT THIS CASE CAN AND CANNOT CATCH. It reads the generated dictionary
    // and every word in it is '' (PD-160), so while the manuscript is unwritten
    // the two languages have the same answer and a unit that wrote a constant
    // '' would pass. It is kept because it is the only case that watches the
    // REAL file -- the moment a word is written into the manuscript it starts
    // telling. The two cases that follow are the ones with teeth: they hand the
    // unit a dictionary this file built, so they can fail today.
    for (const language of LANGUAGES) {
      const session: ScreenSession = {
        ...sessionAsking(confirmationOf('two tasks would go', [])),
        language,
      }

      const shown = confirmationFromSession(session) as Confirmation

      expect(shown.entries, language).toEqual(entriesOnConfirmation(language))
    }
  })

  it('GIVEN a dictionary that holds a distinct word for every row and language WHEN the entries are shown THEN each word is the one that dictionary holds, keyed by its row (FR-038)', async () => {
    // FR-038 (MUST): 「画面に刷る語は、言語ごとの辞書として 1 か所に持つこと」--
    // so the word an entry carries is READ, from that one place, and the join is
    // 表 T-109's row id (its preamble: 「繋ぎ目は行 ID `IC-nn` だけである」).
    // ⭐ Every word below differs by row AND by language, so a unit that keyed by
    // the wrong row, never looked at `ScreenSession.language`, read the
    // `confirmation` section's `proceed` / `cancel` instead, or wrote a word of
    // its own, answers with something this case can name.
    const byLanguage = new Map<DisplayLanguage, readonly string[]>()

    for (const language of LANGUAGES) {
      const shown = await shownWithMarkedDictionary(language)

      expect(
        shown.entries.map((entry) => entry.label),
        language,
      ).toEqual(T_109_ON_CONFIRMATION.map((rowId) => markForRow(rowId, language)))
      byLanguage.set(
        language,
        shown.entries.map((entry) => entry.label),
      )
    }

    // FR-038: 「利用者が表示言語を選んだとき…その言語で示すこと」-- the two
    // display languages may not come back as one and the same word.
    expect(byLanguage.get('ja')).not.toEqual(byLanguage.get('en'))
  })

  it('GIVEN the entries 表 T-109 places on this surface WHEN their words are read THEN each carries the word that dictionary holds for ITS OWN row, and no two of them share one (FR-038)', async () => {
    // ⭐ THIS IS WHERE THE TWO ANSWERS THEMSELVES ARE COVERED. The case above
    // walks the roster in order, so a unit that handed both entries the FIRST
    // row's word would still have to be caught by something; here each entry is
    // looked up by the row IT carries, so a swap or a shared word is named.
    // ⛔ The row ids are not written here either -- `entry.icon` is the row the
    // entry says it is, and the dictionary is asked for that row.
    const shown = await shownWithMarkedDictionary('ja')

    expect(shown.entries.length, 'U-55: 「2 択の入口は表 T-109 の 2 行が持つ」').toBeGreaterThan(1)
    for (const entry of shown.entries) {
      expect(entry.label, entry.icon).toBe(markForRow(entry.icon, 'ja'))
    }
    expect(
      new Set(shown.entries.map((entry) => entry.label)).size,
      '2 つの答えが同じ語を着て出てはならない',
    ).toBe(shown.entries.length)
  })

  it('GIVEN a question is shown WHEN the raised half is looked at again THEN the entries were added on the way, not to what the asker holds', () => {
    // ⛔ `ScreenSession.confirmation` is the RAISED half. Widening it in place
    // would let a caller settle a placement 表 T-109 settles.
    const asked = confirmationOf('a newer autosave would be discarded', [])
    const session = sessionAsking(asked)

    expect((confirmationFromSession(session) as Confirmation).entries.length).toBeGreaterThan(0)
    expect(session.confirmation).not.toHaveProperty('entries')
    expect(asked).not.toHaveProperty('entries')
  })

  it('GIVEN no question was raised WHEN the member is filled THEN there is no surface, and so no entries to place on one', () => {
    // 表 T-109 places the two entries on U-55; U-55 is the surface a question
    // stands on, and NT-7 admits none where nothing was asked.
    expect(confirmationFromSession(sessionAsking(null))).toBeNull()
  })
})

describe('UF-67 -- NT-5: OP-11 of table T-024a is told, not refused', () => {
  it('GIVEN files were left out of a hand-over WHEN the telling is shown THEN it stands apart from NT-1 refusal (NT-5 MUST)', () => {
    // OP-11:「先頭の 1 つだけを受け入れ、残りを無視したことを告げること
    // （MUST）。作法は 表 T-037 の `NT-5`」／「受け付けなかったことにしては
    // ならない（MUST NOT）」。
    const shown = noticesFromSession(sessionOf([REFUSAL, OP_11_TELLING]))

    expect(shown).toHaveLength(2)
    expect(shown.map((notice) => notice.manner).sort()).toEqual(['NT-1', 'NT-5'])
    const told = shown.find((notice) => notice.manner === 'NT-5') as Notice
    expect(told).toEqual(OP_11_TELLING)
  })

  it('GIVEN the count of what was ignored WHEN the telling is shown THEN the count survives (NT-3)', () => {
    const shown = noticesFromSession(sessionOf([OP_11_TELLING]))

    expect((shown[0] as Notice).affectedCount).toBe(2)
  })

  it('GIVEN nothing was left behind WHEN a count of zero is told THEN zero survives as zero, not as absent', () => {
    const none = noticeOf('NT-5', 'the whole hand-over was accepted', ['carry on'], 0)
    const shown = noticesFromSession(sessionOf([none]))

    expect((shown[0] as Notice).affectedCount).toBe(0)
  })

  it('GIVEN the OP-11 telling raised at startup beside pending items WHEN the surfaces are chosen THEN it is not swept into NT-4 gathering', () => {
    // Merging it would put it under another row's manner, and NT-5 (MUST) has
    // to stay tellable apart from NT-1's refusal.
    const shown = noticesFromSession(sessionOf([PENDING_RESTORE, OP_11_TELLING, PENDING_RECOVERY]))

    expect(shown).toHaveLength(2)
    expect(shown.filter((notice) => notice.manner === 'NT-5')).toEqual([OP_11_TELLING])
  })
})

describe('UF-67 -- confirmationFromSession is @purity pure (table T-075, R7.1)', () => {
  it('GIVEN a question and its items WHEN the view is filled THEN nothing it was given is rewritten', () => {
    const asked = confirmationOf('two tasks would go', [
      { name: 'foundation work', isShownOnAnotherRow: false },
      { name: null, isShownOnAnotherRow: true },
    ])
    const before = structuredClone(asked)
    const session = sessionAsking(asked, [REFUSAL, PENDING_RESTORE])

    confirmationFromSession(session)

    expect(asked).toEqual(before)
    expect(session.confirmation).toEqual(before)
  })

  it('GIVEN the same session WHEN it is asked twice THEN it answers the same way both times', () => {
    const session = sessionAsking(confirmationOf('that file would be written over', []), [REFUSAL])

    expect(confirmationFromSession(session)).toEqual(confirmationFromSession(session))
  })
})
