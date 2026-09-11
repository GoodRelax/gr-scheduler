// FR-029 (MUST) -- open, reload and save each SAY WHY when a press can do
// nothing, instead of returning in silence.
//
// ---------------------------------------------------------------------------
// THE CLAUSE, QUOTED VERBATIM (docs/spec/01-04-requirements.md:3833)
// ---------------------------------------------------------------------------
//
//   **押されたときに限り、行えない理由を通知すること（MUST）。作法は `FR-076` の
//   表 T-037 の `NT-1` に従い、運ぶ理由は、押された入口の場面に当たる同要求の
//   表 T-233 の行とすること（MUST）。**
//
// and the closing rule of 表 T-233 (docs/spec/01-04-requirements.md:3896):
//
//   ⭐ **通知が運ぶ理由は 表 T-233 の行とすること（MUST）。同表に無い理由を運んでは
//   ならない（MUST NOT）** —— 理由の語は `FR-038` の辞書が持ち、辞書は行 ID で引く。
//
// ⭐ THE REASON THE THREE GATES LAND ON `RS-27` and not on a row of their own is
// FR-029's own fall-through: 「⚠️ **どの入口にも当たる行が無いときの落ち先が
// `RS-27` である。**」, and 表 T-233 spells that row 「押した入口が、いま行えること
// を持たない | `NT-1` | `FR-029`」.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE LEDGER ROW IT STANDS IN FOR
// ---------------------------------------------------------------------------
// D-337: 「⛔ **開く・読み直す・保存の 3 つの門が、待ちの最中に黙って戻る**」, with
// 「実測: 待ちの最中に `Ctrl`＋`O` / `Ctrl`＋`S` を 2 度押しても、通知は 0 件」.
// ⭐ D-334 had already closed the FOURTH gate of the same family -- the export
// one -- and its ⚠️ column said 「同じ「黙って戻る」門が、開く・読み直す・保存にも
// 在る。⇒ 次の巡でまとめて閉じること」. ⛔ THE ROW ALSO CORRECTED ITSELF ABOUT THE
// KEYS: 「読み直しは `Ctrl`＋`R`（`SK-21`）であり、先の実測が打った 3 つの鍵では
// 読み直しの門に届いていなかった」 -- so the three keys are read out of 表 T-036
// below rather than typed, and `SK-11a` (which that row also found does not
// exist) is not driven.
//
// ---------------------------------------------------------------------------
// WHERE 表 T-218 PUTS THIS FILE
// ---------------------------------------------------------------------------
// `TS-6`, tests/unit/ -- 「単体テスト | 持たない | —— | Unit | `tests/unit/` |
// Vitest」. The unit is `UF-48` of 表 T-075 (`frame-loop.ts`, `CP-25` of 表
// T-062): 表 T-060's `LY-5` makes it the only layer that may hold a current
// value, so it is the side that knows a file operation is already in flight.
// ⛔ NOT tests/system/: `TS-3` takes 「`SWS-xxx`」 for a parent and what is
// measured here is one unit's answer to a press, not a drawn screen.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: only the head, the
// published types and the signatures.)
//
//   frame-loop.ts       `FrameEnvironment`, `FrameLoop`, `ScreenWiring` and the
//                       signature `frameLoop(surface, first, env, screen?,
//                       files?)`
//   screen-renderer.ts  `DisplayLanguage`, `ScreenPart`, `ScreenSurface`,
//                       `ScreenView`
//   input-command-translator.ts  `HumanInput`, `InputModifiers`, `KeyInput`
//   file-store.ts       `FileStore`, `FileReading`, `FileWriting`,
//                       `OpenedFileState`, `OpenRoute`, `ChosenFileWrite`
// ⛔ NO FUNCTION BODY WAS READ. Nothing was read of how a gate decides to
// return; every expectation below is FR-029's and 表 T-233's.
// ⭐ THE HOST, THE FAKE SURFACE AND THE FAKE STORE ARE COPIED, NOT INVENTED:
// tests/unit/uf-47-48-choosers.test.ts drives this same unit with a store whose
// reads are left unanswered, and tests/unit/fr-029-the-reason-a-press-carries.
// test.ts is where a notice is pinned to a row of 表 T-233 through FR-038's
// dictionary.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   `FR-029`      the clause above, and its fall-through to `RS-27`.
//   表 T-233 RS-27 「押した入口が、いま行えることを持たない | `NT-1` | `FR-029`」.
//   表 T-233 の結び the closing rule above.
//   表 T-036      `SK-10` 「開く | `Ctrl+O`」, `SK-11` 「保存する……」 and `SK-21`
//                 「**開いているファイルを読み直す**（規則は表 T-024a の `OP-13`）|
//                 `Ctrl` ＋ `R`」 -- the three keys, READ from the 割当 column.
//   表 T-024a OP-13 「**選ばせる面を開かずに、同じファイルをもう一度読むこと
//                 （MUST）**」 and 「⚠️ **開いているファイルが無いときは何もしない
//                 こと（MUST）**」 -- why the reload gate is driven with a file
//                 already open, and not otherwise.
//   `FR-038`      the dictionary the words come from, keyed by the row id.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   1. THE FAINT HALF OF FR-029. The same requirement asks the entrance to be
//      DRAWN faint while it can do nothing; D-334's ledger row records that half
//      as not built (「薄く描く半分（案②）は入っていない」), and it is the
//      renderer's, not this unit's.
//   2. WHICH ROW OF 表 T-233 A GATE "OUGHT" TO HAVE. FR-029 (MUST NOT) forbids
//      carrying the fall-through where a matching row exists -- and 表 T-233
//      holds no row for 「別のファイル操作が待ちの最中である」, so `RS-27` is what
//      its own fall-through sentence names. ⭐ A table that later grows such a
//      row would make these cases wrong, which is why the premise below asserts
//      that `RS-27` is still the fall-through FR-029 names.
//   3. WHAT HAPPENS WHEN THE WAIT ENDS. `CS-4` of 表 T-066 owns the landing and
//      tests/unit/uf-47-48-choosers.test.ts drives it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  ChosenFileWrite,
  FileReading,
  FileStore,
  FileWriting,
  OpenedFileState,
} from '../../src/adapter/file-gateway/file-store'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// 1. The manuscript, read at run time rather than copied
// ===========================================================================

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/**
 * ⚠️ Japanese literals in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- these strings ARE the
 * clauses, and matching them against the manuscript is what makes the cases
 * below cases about the specification.
 *
 * ⭐ EACH ENDS AT ITS MARKER'S OWN CLOSING PARENTHESIS. Check 39 takes the
 * trailing window that ENDS at `（MUST）` / `（MUST NOT）` and looks for it under
 * tests/; a quote that began at the sentence and stopped before the marker
 * would hold nothing at all.
 */
const FR_029_TELL_ON_A_PRESS =
  '金が消える。 押されたときに限り、行えない理由を通知すること（MUST）。作法は `FR-076` の 表 T-037 の `NT-1` に従い、運ぶ理由は、押された入口の場面に当たる同要求の 表 T-233 の行とすること（MUST）'

/** ⭐ The closing rule of 表 T-233, which is what makes `RS-27` a row and not a sentence. */
const T_233_ONLY_ITS_OWN_ROWS =
  ' 通知が運ぶ理由は 表 T-233 の行とすること（MUST）。同表に無い理由を運んではならない（MUST NOT）'

/** FR-029's own fall-through -- why these three gates land on `RS-27`. */
const FR_029_RS_27_IS_THE_FALLBACK = 'どの入口にも当たる行が無いときの落ち先が `RS-27` である'

/** `OP-13`'s guard, which is why the reload gate is driven with a file already open. */
const OP_13_NOTHING_TO_REREAD = '開いているファイルが無いときは何もしないこと（MUST）'

const T_036: SpecTable = specTable('T-036')
const T_233: SpecTable = specTable('T-233')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/**
 * The keystroke 表 T-036 assigns one row, read out of its 割当 column.
 *
 * ⭐ READ AND NOT TYPED, which is exactly what D-337's own correction was about:
 * the first measurement pressed three keys and 「読み直しの門に届いていなかった」
 * because one of them was not the key the table assigns.
 * ⚠️ Copied from tests/unit/uf-47-48-choosers.test.ts.
 *
 * ⛔⛔ THE RAW CELL, NEVER `bare`. That helper answers with the FIRST backticked
 * token, and `SK-21`'s 割当 is 「`Ctrl` ＋ `R`」 -- so `bare` turns the reload key
 * into `Ctrl` alone. ⚠️ Measured here on 2026-09-06: a first draft of this file
 * used `bare` and pressed a bare `Ctrl` at the reload gate, which is the SAME
 * shape of mistake D-337's ledger row records against the measurement before it.
 */
function keyOf(id: string): KeyInput {
  const parts = ((rowOf(T_036, id).by['割当'] ?? '').split('/')[0] ?? '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/＋/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${id} states no assignment`)
  const named = (name: string): boolean => parts.slice(0, -1).includes(name)
  return {
    kind: 'key',
    key: last,
    modifiers: {
      ctrl: named('Ctrl'),
      shift: named('Shift'),
      alt: named('Alt'),
      meta: named('Cmd'),
    } satisfies InputModifiers,
  }
}

/** The manner 表 T-233 gives one row -- `NT-1` for `RS-27`. */
const mannerOf = (reason: string): string => bare(rowOf(T_233, reason).by['作法'] ?? '')

/** FR-038's dictionary, as the manuscript keeps it. Copied from the fr-029 file. */
interface ReasonWords {
  readonly rowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
  readonly nextStep: Readonly<Record<DisplayLanguage, string>>
}

const REASON_WORDS: readonly ReasonWords[] = (
  JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons: ReasonWords[] }
).reasons

function wordsFor(rowId: string): ReasonWords {
  const found = REASON_WORDS.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`FR-038's dictionary holds no words for ${rowId}`)
  return found
}

/** FR-029's fall-through. */
const RS_27 = 'RS-27'

// ===========================================================================
// 2. The three gates
// ===========================================================================

interface Gate {
  /** The row of 表 T-036 whose key is pressed. */
  readonly key: string
  /** For the case name. */
  readonly what: string
  /**
   * Whether the reload gate's premise applies -- `OP-13` (MUST) has a reread do
   * nothing at all while no file is open, so that gate is driven only with one.
   */
  readonly needsAnOpenedFile: boolean
}

const GATES: readonly Gate[] = [
  { key: 'SK-10', what: 'open', needsAnOpenedFile: false },
  { key: 'SK-21', what: 'reload', needsAnOpenedFile: true },
  { key: 'SK-11', what: 'save', needsAnOpenedFile: true },
]

// ===========================================================================
// 3. A store that answers nothing, so every road stays in flight
// ===========================================================================

interface StoreProbe {
  readonly store: FileStore
  /** How many roads are still waiting -- the state the gates are pressed in. */
  pending(): number
}

/**
 * ⭐⭐ EVERY ROAD THAT CAN BE WAITED ON RETURNS A PROMISE NOBODY RESOLVES, which
 * is the whole of the fixture: D-337's 場面 is 「別のファイル操作が待ちの最中」 and
 * the only way to hold a loop there is a seam that never answers.
 *
 * ⚠️ `readOpenedFileState` DOES answer, and has to. `OP-13` (MUST) makes a
 * reread do nothing while no file is open, and `FR-060`'s overwrite needs
 * somewhere to go -- so the question 「what may be overwritten right now」 is
 * answered at once and it is the WORK that is left hanging.
 */
function fileStore(opened: OpenedFileState): StoreProbe {
  const waiting: (() => void)[] = []
  const never = <T,>(): Promise<T> =>
    new Promise<T>(() => {
      waiting.push(() => undefined)
    })
  const store: FileStore = {
    askToWriteOver: async () => true,
    readFileToOpen: () => never<FileReading>(),
    readOpenedFileState: async () => opened,
    restoreOpenedFilePermission: async () => opened,
    overwriteOpenedFile: (_bytes: Uint8Array) => never<FileWriting>(),
    writeChosenFile: (_write: ChosenFileWrite) => never<FileWriting>(),
  } as unknown as FileStore
  return { store, pending: () => waiting.length }
}

/** A file is already open, so `OP-13`'s guard does not swallow the reread. */
const A_FILE_IS_OPEN: OpenedFileState = { kind: 'writable', fileName: 'here.grs.json' }
const NO_FILE_IS_OPEN: OpenedFileState = { kind: 'none' }

// ===========================================================================
// 4. The host UF-48 is given. Copied from tests/unit/uf-47-48-choosers.test.ts.
// ===========================================================================

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

function host(): Host {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
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

interface ScreenPane {
  readonly wiring: ScreenWiring
  last(): ScreenView | null
}

function screenPane(language: DisplayLanguage): ScreenPane {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => null as ScreenPart | null,
  } as unknown as ScreenSurface
  return {
    wiring: { surface, language } as unknown as ScreenWiring,
    last: () => views[views.length - 1] ?? null,
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

/** Let every promise the loop is waiting on settle. Copied from the choosers file. */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

interface Stage {
  readonly loop: FrameLoop
  readonly files: StoreProbe
  press(input: HumanInput): Promise<void>
  notices(): ScreenView['notices']
}

function stage(opened: OpenedFileState, language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const files = fileStore(opened)
  const loop = frameLoop(
    pen.surface,
    structuredClone(TEMPLATE),
    SCREEN,
    screen.wiring,
    files.store,
  )
  pen.runAnimationFrames()
  return {
    loop,
    files,
    press: async (input) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
      await settle()
      pen.runAnimationFrames()
    },
    notices: () => screen.last()?.notices ?? [],
  }
}

const openedFor = (gate: Gate): OpenedFileState =>
  gate.needsAnOpenedFile ? A_FILE_IS_OPEN : NO_FILE_IS_OPEN

// ===========================================================================
// 5. The premises every case below stands on
// ===========================================================================

describe('FR-029 / 表 T-233 -- the manuscript this file is driven by', () => {
  it('still ties the telling to a press and to the MATCHING row, and still names RS-27 as the fall-through', () => {
    expect(REQUIREMENTS).toContain(FR_029_TELL_ON_A_PRESS)
    expect(REQUIREMENTS).toContain(FR_029_RS_27_IS_THE_FALLBACK)
    expect(REQUIREMENTS).toContain(T_233_ONLY_ITS_OWN_ROWS)
  })

  it('表 T-233 still holds RS-27 with FR-029 for its 正 and NT-1 for its 作法', () => {
    expect(rowOf(T_233, RS_27).cells.join(' ')).toContain('いま行えることを持たない')
    expect(mannerOf(RS_27)).toBe('NT-1')
    expect(bare(rowOf(T_233, RS_27).by['正'] ?? '')).toBe('FR-029')
  })

  it('⭐ RS-27 says something no other row of 表 T-233 says', () => {
    // ⛔ WITHOUT THIS, "the telling carried RS-27" would pass on a loop that
    // carried any row at all, because the words would collide.
    const mine = wordsFor(RS_27).text.ja
    const others = T_233.rows
      .filter((one) => one.id !== RS_27)
      .map((one) => REASON_WORDS.find((word) => word.rowId === one.id)?.text.ja)
      .filter((one): one is string => one !== undefined)
    expect(mine.length).toBeGreaterThan(0)
    expect(others).not.toContain(mine)
    // ⭐ And two languages, so the case below that presses in English is a case.
    expect(wordsFor(RS_27).text.en.length).toBeGreaterThan(0)
    expect(wordsFor(RS_27).text.en).not.toBe(mine)
  })

  it('表 T-036 still assigns the three keys D-337 corrected itself about', () => {
    expect(keyOf('SK-10')).toEqual({
      kind: 'key',
      key: 'O',
      modifiers: { ctrl: true, shift: false, alt: false, meta: false },
    })
    expect(keyOf('SK-11').modifiers.ctrl).toBe(true)
    // ⛔ THE ONE THE LEDGER GOT WRONG. 「読み直しは `Ctrl`＋`R`（`SK-21`）であり、
    // 先の実測が打った 3 つの鍵では読み直しの門に届いていなかった」.
    expect(keyOf('SK-21')).toEqual({
      kind: 'key',
      key: 'R',
      modifiers: { ctrl: true, shift: false, alt: false, meta: false },
    })
    expect(rowOf(T_036, 'SK-21').cells.join(' ')).toContain('読み直す')
  })

  it('表 T-024a OP-13 still refuses to reread while no file is open', () => {
    // ⭐ THE REASON THE RELOAD GATE IS DRIVEN WITH A FILE ALREADY OPEN. Without
    // it, the second press would be silent for OP-13's reason rather than for
    // the gate's, and this file would report a defect that is not one.
    expect(REQUIREMENTS).toContain(OP_13_NOTHING_TO_REREAD)
  })

  it('nothing is being told before anything is pressed', () => {
    for (const gate of GATES) {
      expect(stage(openedFor(gate)).notices(), gate.what).toEqual([])
    }
  })
})

// ===========================================================================
// 6. 「押されたときに限り」 -- the FIRST press is silent, and starts the work
// ===========================================================================

describe('FR-029 -- the first press is answered by doing the work, not by a telling', () => {
  for (const gate of GATES) {
    it(`${gate.key} (${gate.what}): one press raises no telling and leaves a road in flight`, async () => {
      const built = stage(openedFor(gate))

      await built.press(keyOf(gate.key))

      expect(
        built.notices(),
        `${gate.key} told the person something on the first press -- FR-029 raises a reason only ` +
          'where the press can do nothing',
      ).toEqual([])
      expect(
        built.files.pending(),
        `${gate.key} started no file operation at all, so the second press below is not measuring ` +
          'a wait',
      ).toBeGreaterThan(0)
    })
  }
})

// ===========================================================================
// 7. ⭐⭐ THE SECOND PRESS -- 「押した入口が、いま行えることを持たない」
// ===========================================================================

describe('FR-029 (MUST) -- a second press while a write is pending carries RS-27', () => {
  for (const gate of GATES) {
    it(`${gate.key} (${gate.what}): the second press raises exactly one telling`, async () => {
      const built = stage(openedFor(gate))

      await built.press(keyOf(gate.key))
      expect(built.notices(), 'the first press was not silent').toEqual([])
      await built.press(keyOf(gate.key))

      expect(
        built.notices().length,
        `${gate.key} returned in silence while a file operation was in flight -- FR-029 (MUST): ` +
          '「押されたときに限り、行えない理由を通知すること」',
      ).toBe(1)
    })

    it(`${gate.key} (${gate.what}): and the telling it carries is 表 T-233 の RS-27`, async () => {
      const built = stage(openedFor(gate))

      await built.press(keyOf(gate.key))
      await built.press(keyOf(gate.key))
      const told = built.notices()[0]

      expect(told?.text, `${gate.key} carried a reason that is not RS-27`).toBe(
        wordsFor(RS_27).text.ja,
      )
      expect(told?.manner, '表 T-233 gives RS-27 the manner NT-1').toBe(mannerOf(RS_27))
    })
  }

  it('⭐ the words follow the display language, so the row and not a sentence is what travelled', async () => {
    // ⛔ WITHOUT THIS, A LOOP THAT WROTE THE JAPANESE SENTENCE ITSELF WOULD PASS
    // every case above. FR-038 (MUST NOT) keeps the words in one dictionary and
    // the row id is the join.
    const built = stage(NO_FILE_IS_OPEN, 'en')

    await built.press(keyOf('SK-10'))
    await built.press(keyOf('SK-10'))

    expect(built.notices()[0]?.text).toBe(wordsFor(RS_27).text.en)
  })

  it('⭐⭐ the control: the same key on a loop with no store raises no RS-27 for THIS reason', async () => {
    // ⛔ THE CASE THAT KEEPS THE SIX ABOVE FROM PASSING ON A GATE THAT SHOUTS AT
    // EVERY PRESS. A press that starts work must be silent, and it is measured
    // twice: once here as the FIRST press of a fresh loop, and once as the
    // "first press was not silent" guard inside each case above.
    const first = stage(NO_FILE_IS_OPEN)
    await first.press(keyOf('SK-10'))

    expect(
      first.notices(),
      'the gate answered a press that had work to do with a telling, which FR-029 does not ask for',
    ).toEqual([])
  })

  it('⭐ the control: the three gates are three roads, not one', async () => {
    // ⛔ A LOOP THAT RAISED RS-27 FOR ANY SECOND KEYPRESS WHATEVER would pass
    // every case above. Here the FIRST press is one gate and the SECOND is a
    // different one -- still a wait, so `RS-27` is still owed -- and the count
    // shows the three share the state rather than each owning a private flag.
    const built = stage(A_FILE_IS_OPEN)

    await built.press(keyOf('SK-10'))
    expect(built.notices(), 'the opening press was not silent').toEqual([])
    await built.press(keyOf('SK-11'))

    expect(
      built.notices().length,
      'a save pressed while an open was in flight returned in silence',
    ).toBe(1)
    expect(built.notices()[0]?.text).toBe(wordsFor(RS_27).text.ja)
  })
})
