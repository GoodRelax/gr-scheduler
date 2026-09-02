// OP-14 of table T-024a (CR-299, ledger row D-124):
//
//   「**起動時に渡された文書が読めなかったとき**（表 T-034 の `BT-2`） | **黙って
//    捨てずに通知すること（MUST）。** 作法は 表 T-037 の `NT-1`（入力を受け付けない
//    とき）とし、運ぶ理由は 表 T-233 の `RS-26` とする。**そのうえで 表 T-034 の次
//    の順位へ降りること（MUST）。空で起動してはならない（MUST NOT）**」
//
//   T-233 RS-26   「起動時に渡された文書が読めなかった | `NT-1` | 表 T-024a の
//                 `OP-14`」
//   T-037 NT-1    「入力を受け付けないとき | どの項目が、なぜ誤りかを文字で示すこと
//                 （MUST）。訂正の手がかりを添えること。色や枠だけで示してはならない
//                 （MUST NOT）」
//   T-034 BT-2    「起動時に渡された文書。渡す経路は表 T-008 の `R-1`、開いた後の
//                 扱いは `FR-087`」
//   FR-062        「起動したとき、`GRS` は、表 T-034 の順で最初に開く文書を決める
//                 こと」
//
// Units under test: UF-23 `ChooseStartupDocument` (CP-14) for the first half,
// and UF-48 `frame-loop.ts` (CP-25) for the telling.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md, section 1). ⛔ NO FILE UNDER src/ WAS READ. The host and
// the fake surface are copied from tests/unit/fr-029-the-reason-a-press-
// carries.test.ts; the candidates are shaped as tests/unit/uf-23.test.ts shapes
// them; `startup-template.json` is a generated document read as data.
//
// ---------------------------------------------------------------------------
// ⛔⛔ THE LINK IN THE MIDDLE THAT NO TEST HERE CAN REACH
// ---------------------------------------------------------------------------
//
// OP-14's road has three links:
//
//   1. UF-23 answers with the notice code for a handed document that could not
//      be read, and descends to the next row of table T-034.   ⭐ CASE BELOW
//   2. the shell turns that code into the row of table T-233.  ⛔ OUT OF REACH
//   3. the loop tells it, in NT-1's manner, in the dictionary's words for that
//      row.                                                     ⭐ CASE BELOW
//
// ⛔ Link 2 lives in `src/framework/single-html-shell/single-html-shell.ts`,
// WHICH EXPORTS NOTHING -- the module has no public member, so no Vitest case
// can import the map, call it, or watch it being used. What holds it today is
// the type alone (`StartupNoticeCode` -> `StartupNoticeReason` is a `Record`),
// which is what ledger row D-124 already records. ⇒ Showing link 2 needs a case
// that drives the page itself: table T-218's TS-1 / TS-3, under Playwright.
//
// ⚠️ AND THE ROW'S OWN CAVEAT STANDS. D-124 records that the shell hands
// `{ kind: 'none' }` for the handed candidate unconditionally, so link 1 never
// fires in the shipped build. ⛔ THAT IS A DEFECT AND NOT A REASON TO WEAKEN A
// CASE: FR-062 (MUST) makes the startup follow table T-034, BT-2 is a row of
// that table with a route of its own (R-1 of table T-008), and OP-14 (MUST)
// says what to do when it fails -- a requirement that can never fire is a
// requirement that is not met. No case below pretends otherwise; they hold the
// two links that are reachable and name the one that is not.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { bare, specTable } from '../contract/spec-table'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  chooseStartupDocument,
  type StartupCandidates,
} from '../../src/use-case/choose-startup-document/choose-startup-document'
import {
  frameLoop,
  type FrameEnvironment,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'

// ---------------------------------------------------------------------------
// The manuscript, read at run time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const T_233 = specTable('T-233')

/** Table T-233 prints the situation first, then the row of table T-037. */
const T_233_MANNER = 1

const reasonRow = (rowId: string): readonly string[] => {
  const row = T_233.rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-233 has no row ${rowId}`)
  return row.cells
}

/** The manner table T-233 gives one reason. */
const mannerOf = (rowId: string): string => bare(reasonRow(rowId)[T_233_MANNER] ?? '')

interface ReasonWords {
  readonly rowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
  readonly nextStep: Readonly<Record<DisplayLanguage, string>>
}

/**
 * FR-038's dictionary, as the manuscript keeps it.
 *
 * ⭐ IT IS WHAT LETS A NOTICE BE PINNED TO ONE ROW OF TABLE T-233: the notice
 * that reaches the screen carries the manner and the WORDS, so a case reads the
 * row's words out of here and asks whether those are the words that arrived.
 * The road from here to `src/` is `npm run words:check`, not this file.
 */
const MANUSCRIPT_WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as { reasons: ReasonWords[] }

const wordsFor = (rowId: string): ReasonWords => {
  const found = MANUSCRIPT_WORDS.reasons.find((one) => one.rowId === rowId)
  if (found === undefined) {
    throw new Error(`table T-233 row ${rowId} has no entry in FR-038's dictionary`)
  }
  return found
}

// ---------------------------------------------------------------------------
// The fixtures
// ---------------------------------------------------------------------------

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const templateDocument = (): Document => structuredClone(TEMPLATE) as unknown as Document

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as unknown as { requestAnimationFrame?: unknown })
  .requestAnimationFrame

function host(): { surface: { showSvg(svg: string): void }; runAnimationFrames(): void } {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = (
    callback: (time: number) => void,
  ): number => {
    waiting.push(callback)
    return waiting.length
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
    },
  }
}

function screenPane(language: DisplayLanguage): {
  wiring: ScreenWiring
  last(): ScreenView
} {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => null as ScreenPart | null,
  }
  return {
    wiring: { surface, language },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) {
    delete (globalThis as unknown as { requestAnimationFrame?: unknown }).requestAnimationFrame
  } else {
    ;(globalThis as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = realRaf
  }
})

// ===========================================================================
// Link 1 -- the startup does not drop it in silence, and does not start empty
// ===========================================================================

describe('OP-14 -- a document handed at startup that cannot be read', () => {
  it('⭐ MUST: is not dropped in silence, and the startup descends rather than starting empty', () => {
    // 「黙って捨てずに通知すること（MUST）… そのうえで 表 T-034 の次の順位へ
    // 降りること（MUST）。空で起動してはならない（MUST NOT）」. ⭐ ONE answer
    // carries both: the row that was opened and the telling that is owed.
    const template = templateDocument()
    const candidates: StartupCandidates = {
      embedded: { kind: 'none' },
      handed: { kind: 'unreadable' },
      template,
    }

    const choice = chooseStartupDocument(candidates)

    expect(choice.notices.length, 'the handed document was dropped in silence').toBe(1)
    expect(choice.row, 'BT-4 is the next rank of table T-034 below BT-2').toBe('BT-4')
    expect(choice.document, 'FR-027 (MUST): the startup never ends empty').toBe(template)
  })

  it('⛔ and a handed document that CAN be read is told nothing -- so the telling is about the failure', () => {
    // ⛔ WITHOUT THIS the case above would be green over a startup that told
    // something whatever happened. FR-062: 表 T-034 の順で最初に開く文書を決める
    // -- a candidate that yields wins its rank and nothing is owed.
    const handed = templateDocument()
    const choice = chooseStartupDocument({
      embedded: { kind: 'none' },
      handed: { kind: 'read', document: handed },
      template: templateDocument(),
    })

    expect(choice.row).toBe('BT-2')
    expect(choice.document).toBe(handed)
    expect(choice.notices).toEqual([])
  })
})

// ===========================================================================
// Link 3 -- RS-26 reaches the screen as words, in NT-1's manner
// ===========================================================================

describe('OP-14 -- the notice it raises is table T-233 row RS-26', () => {
  it('⭐ table T-233 holds RS-26, and OP-14 gives it NT-1 as its manner', () => {
    // Read rather than copied: if the row is retired or its manner changes,
    // this file fails here rather than asserting a row of its own invention.
    expect(reasonRow('RS-26').length, 'table T-233 has no row RS-26').toBeGreaterThan(0)
    expect(mannerOf('RS-26')).toBe('NT-1')
  })

  it.each(['ja', 'en'] as const)(
    '⭐ MUST: raising it puts NT-1 up in the dictionary s own words (%s)',
    (language) => {
      // 「作法は 表 T-037 の `NT-1`（入力を受け付けないとき）とし、運ぶ理由は 表
      // T-233 の `RS-26` とする」, and 表 T-233's closing sends the words to
      // FR-038's dictionary: 「理由の語は `FR-038` の辞書が持ち、辞書は行 ID で
      // 引く」. ⛔ The dictionary's word for RS-26 is read at run time and never
      // typed here.
      const pen = host()
      const screen = screenPane(language)
      const loop = frameLoop(pen.surface, templateDocument(), SCREEN, screen.wiring)
      pen.runAnimationFrames()

      expect(screen.last().notices, 'nothing was raised yet').toEqual([])

      loop.raiseStartupNotice('RS-26')
      pen.runAnimationFrames()

      const notices = screen.last().notices
      expect(notices.length, 'OP-14 (MUST): the failure was not told').toBe(1)
      expect(notices[0]?.text).toBe(wordsFor('RS-26').text[language])
      expect(notices[0]?.manner).toBe(mannerOf('RS-26'))
    },
  )

  it('⛔ and it is RS-26 s own words, not a word any reason would have done for', () => {
    // ⛔ WITHOUT THIS, the case above would be green over a loop that answered
    // with the same sentence for every row of table T-233 -- which is exactly
    // what `src/` did before CR-299: `handedUnreadable` pointed at `RS-15`, the
    // 落ち先 for a reason with no row of its own (ledger D-124).
    const pen = host()
    const screen = screenPane('ja')
    const loop = frameLoop(pen.surface, templateDocument(), SCREEN, screen.wiring)
    pen.runAnimationFrames()

    loop.raiseStartupNotice('RS-26')
    pen.runAnimationFrames()

    const told = screen.last().notices[0]?.text
    expect(told).not.toBe(wordsFor('RS-15').text['ja'])
    expect(told).not.toBe(wordsFor('RS-25').text['ja'])
    expect(told).not.toBe(wordsFor('RS-21').text['ja'])
  })
})
