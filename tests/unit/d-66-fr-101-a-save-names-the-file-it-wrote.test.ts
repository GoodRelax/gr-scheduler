// Unit tests for the half of `FR-101` that only a SAVE can show: once a write
// to a file has succeeded, the header carries THAT file's name and the moment
// it was written -- and no longer the words that stand where the time would be
// while nothing has been written yet.
//
// Unit under test: UF-48 `frame-loop.ts` of 表 T-075 (`SingleHtmlShell`, CP-25
// of 表 T-062). It is the unit that holds the current value and drives the save
// road, so it is the only side that HAS a saved file to name; UF-62
// `app-header-items.ts` turns whatever it is handed into the two members
// (tests/unit/uf-62.test.ts owns that mapping) and UF-71 places them
// (tests/unit/fr-101-the-name-stands-above-the-time.test.ts owns the order).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE LEDGER ROW IT STANDS IN FOR
// ---------------------------------------------------------------------------
//
// `docs/development-records/defects.md` D-66: 「GRS の JSON を 2 回目に保存でき
// ない」（利用者の指摘 2026-08-27）, whose 詳細状況 column records that the save
// itself was never broken -- 「2 回目は保存できている —— 見えないだけである」 --
// and that the one line at fault threw the answer away: 「`saveHeldDocument
// ToFile` の `if (saving.ok) return` が `DocumentFileSaving.openedFile` を捨てて
// いた。**それがこの行の正体である。**」 CR-280 raised `FR-101` to say what the
// screen owes instead, and the row's own note says the fix is 「まだ半分しか見て
// いない」: nothing in tests/ presses save and asks what the header carries
// afterwards. ⭐ tests/unit/uf-62.test.ts:426 asks the neighbouring question --
// that a session ALREADY carrying a name and a moment reaches the two members --
// and can be green while no save ever fills that session in.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES ANSWER TO (rule 03 §3: name the row, do not copy it)
// ---------------------------------------------------------------------------
//
//   FR-101   ⭐ 「`GRS` は、**いま開いているファイルの名前**と、**そのファイルへ
//            最後に書いた時刻**を画面上に示すこと（MUST）」, 「**まだ 1 度もファ
//            イルへ書いていないときは、時刻の代わりにその旨を示すこと（MUST）**
//            —— 空欄では「書けたのに読めない」と区別がつかない」, and 「**保管は
//            UTC のままとすること（MUST）**」. ⚠️ Its MUST NOT: 「`Document
//            Title` … と混同してはならない（MUST NOT）—— あちらは文書が持つ値
//            （`Project/Title`）であり、本要求が出すのはファイルの名前である」
//   表 T-103 `U-58` `Opened File Name` 「開いているファイル名 … 規則は `FR-101`」
//            `U-59` `File Saved At` 「ファイル保存時刻。開いているファイルへ最後
//            に書いた時刻。規則は `FR-101`」
//   表 T-036 `SK-11` 「保存する（`FR-096` の定めにより `GRS JSON` で書く。上書き
//            先は `FR-060`）」, assignment `Ctrl+S` -- the door these cases press,
//            read out of the 割当 column rather than typed
//   `FR-096` 「表 T-036 の `SK-11`（保存する）は、どの形式から開いた文書であっても
//            `GRS JSON` で書くこと（MUST）」 and 「⚠️ **MSPDI で開いた文書の最初の
//            `SK-11` は上書きする先を持たない**ので、保存先を問うことになる」 --
//            why a document that has never been in a file takes the chosen-write
//            road on its first save
//   `FR-060` 「開いたファイルを保存するとき … 同じファイルへ上書きできるようにする
//            こと」, and 「⭐ **その速い道は 表 T-036 の `SK-11` である（MUST）**」
//   `FR-063` 「刻はいずれも `ISO 8601`・UTC・秒まで」 -- the spelling the stored
//            moment keeps, which `FR-101` (MUST) leaves alone
//   表 T-078 `FT-1` -- the trigger every frame these cases run stands on
//   表 T-034 `BT-4`, the bundled template: the one document whose values the
//            specification has actually decided
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WAS READ OF `src/`: NOT ONE FILE. The loop is reached through the
// declarations tests/unit/uf-47-48-choosers.test.ts already imports, and the
// bench below is that file's, trimmed to what a save needs. Every expectation
// comes from a row of docs/spec.
// ---------------------------------------------------------------------------
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, each searched for before being given up
//
//   1. ⛔⛔ THAT THE SAVE ITSELF REPAINTS. Measured while writing this file: one
//      `SK-11` on a document that has never been in a file writes the file, the
//      name and the moment ARE recorded -- and NO FRAME RUNS. The header does
//      not change until the next input arrives, which is the user's own words in
//      `FR-101`'s RATIONALE: 「⛔ **実測: 2 度目以降の保存は成功していたのに、
//      画素が 1 つも変わらないので利用者には失敗として見えていた。**」
//      ⭐ WHY IT IS STILL NOT ASSERTED. `FT-1` of 表 T-078 reads 「人の入力
//      （ポインタとキー）。⭐ **その入力の、待ち（表 T-066 の `CS-4`）をまたいだ
//      続きを含む**」, which would make the end of the save that press's own
//      frame -- but the paragraph that explains it (05-07-design.md, above
//      表 T-067) gives ONLY the case where a question goes up: 「⭐ **待ちが終わ
//      って問いが立つときのフレームは 表 T-078 の `FT-1` である**」. ⛔ No row says
//      what is owed when a wait ends and no question goes up, and `FR-101` states
//      what is shown rather than when it is redrawn. So the cases below let the
//      NEXT frame arrive on an ordinary press and assert what it carries,
//      and the gap is REPORTED rather than settled here. ⚠️ It is a hole in the
//      manuscript, not a reading of it.
//   2. WHERE THE TWO STAND ON THE SCREEN. `FR-101`'s 「名前を時刻の上に置くこと
//      （MUST）」 is UF-71's by 表 T-075, and
//      tests/unit/fr-101-the-name-stands-above-the-time.test.ts holds it.
//   3. THE SPELLING OF THE MOMENT ON THE SCREEN. `FR-101` says in as many words
//      「⚠️ **時刻の綴りそのものは本書が定めない**」, so nothing here reads the
//      drawn text; what is asserted is the STORED value, which the same
//      requirement (MUST) keeps in UTC.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type {
  ChosenFileWrite,
  FileReading,
  FileStore,
} from '../../src/adapter/file-gateway/file-gateway'
import type {
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
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

// ---------------------------------------------------------------------------
// The manuscript, read at read time rather than copied (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const T_036: SpecTable = specTable('T-036')
const T_103: SpecTable = specTable('T-103')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** ⛔ THE GROUND OF THIS FILE, read rather than typed. */
const THE_SHOW_MUST =
  '**いま開いているファイルの名前**と、**そのファイルへ最後に書いた時刻**を画面上に示すこと（MUST）'

/** `FR-101`'s other half -- what stands where the time would be until a save. */
const THE_NEVER_SAVED_MUST = 'まだ 1 度もファイルへ書いていないときは、時刻の代わりにその旨を示すこと（MUST）'

/** The keystroke 表 T-036 assigns one row, read out of its 割当 column. */
function keyOf(id: string): KeyInput {
  const parts = (bare(rowOf(T_036, id).by['割当'] ?? '').split('/')[0] ?? '')
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

/** `SK-11` -- 「保存する」. */
const SK_11 = keyOf('SK-11')

/** The settled name one row of 表 T-103 gives. */
function settledName(id: string): string {
  const COLUMN = '確定名（英）'
  if (!T_103.headings.includes(COLUMN)) {
    throw new Error(`table T-103 no longer has a ${COLUMN} column`)
  }
  const named = bare(rowOf(T_103, id).by[COLUMN] ?? '')
  if (named === '') throw new Error(`table T-103 row ${id} names no UI part`)
  return named
}

// ---------------------------------------------------------------------------
// The document. `BT-4` of 表 T-034.
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) {
    throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

// ---------------------------------------------------------------------------
// The host. `BO-1` of 表 T-077 has settled these by the time a loop exists.
// ---------------------------------------------------------------------------

const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

/**
 * Let every promise the loop is waiting on settle.
 *
 * ⚠️ Both kinds are drained: a chain of `await`s inside the loop resolves on the
 * microtask queue, and anything the host defers lands on the macrotask one.
 */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

interface Bench {
  readonly loop: FrameLoop
  /** Every chosen write the loop asked `IF-3` for, oldest first. */
  readonly written: ChosenFileWrite[]
  /** Run whatever the loop asked an animation frame for, until it asks for no more. */
  runFrames(): void
  /** The last description the loop put on the screen. */
  last(): ScreenView
  /** How many descriptions it has put up. */
  screens(): number
}

/**
 * ⚠️ `readOpenedFileState` answers `none`: this document has never been in a
 * file, which is the state `FR-096` speaks of when it says the first save has no
 * destination to overwrite -- so `SK-11` takes the chosen-write road.
 * ⭐ `writeChosenFile` SUCCEEDS and hands back the file it wrote, which is the
 * answer `saveHeldDocumentToFile` was throwing away.
 */
function bench(document: Document): Bench {
  const written: ChosenFileWrite[] = []
  const views: ScreenView[] = []
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }

  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    // Nothing here drives a panel field, so there is never a commit to take.
    readFieldCommit: () => null as never,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => null as ScreenPart | null,
  }

  const store: FileStore = {
    readFileToOpen: () => new Promise<FileReading>(() => {}),
    readOpenedFileState: async () => ({ kind: 'none' }),
    restoreOpenedFilePermission: async () => ({ kind: 'none' }),
    overwriteOpenedFile: async () => ({
      ok: false,
      fault: { reason: 'noOpenedFile', what: 'this document has never been in a file' },
    }),
    writeChosenFile: async (write) => {
      written.push(write)
      return { ok: true, openedFile: { kind: 'writable', fileName: write.suggestedFileName } }
    },
  }

  const wiring: ScreenWiring = { surface, language: 'ja' as DisplayLanguage }
  const loop = frameLoop(
    { showSvg: () => {} } as any,
    document,
    SCREEN,
    wiring,
    store,
  )

  return {
    loop,
    written,
    runFrames: () => {
      // Bounded, so a loop that asks for a frame from inside a frame -- which
      // `NFR-010` forbids -- ends the case instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    screens: () => views.length,
  }
}

/**
 * One press of `SK-11`, waited out.
 *
 * ⚠️ `CS-4` of 表 T-066 puts the file operation across frames, so the case has to
 * stand inside the wait and let it end.
 */
async function pressSave(one: Bench): Promise<void> {
  one.loop.receiveInput(SK_11)
  one.runFrames()
  await settle()
  one.runFrames()
}

/**
 * Let one more frame arrive, so that what the save recorded can be read off a
 * description.
 *
 * ⛔ A PRESS AND NOT A SAVE. See note 1 in the head comment: no row of docs/spec
 * says a wait that ends without a question owes a frame of its own, so these
 * cases do not require one -- they let an ordinary press raise the next frame
 * and ask what it carries. ⚠️ The press lands on the schedule and writes no
 * file; every case that uses it asserts the write count afterwards, so a second
 * save could not sneak in and answer for the first.
 */
function nextFrame(one: Bench): void {
  one.loop.receiveInput(pointer('down', 501, 301))
  one.loop.receiveInput(pointer('up', 501, 301))
  one.runFrames()
}

// ===========================================================================
// The manuscript still says what these cases read
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-101 still puts both the name and the moment on the screen', () => {
    expect(REQUIREMENTS).toContain(THE_SHOW_MUST)
  })

  it('⭐ FR-101 still has words standing where the time would be until a save', () => {
    expect(REQUIREMENTS).toContain(THE_NEVER_SAVED_MUST)
  })

  it('⭐ table T-103 still names the two parts, and table T-036 still assigns SK-11', () => {
    expect(settledName('U-58')).toBe('Opened File Name')
    expect(settledName('U-59')).toBe('File Saved At')
    expect(SK_11.key).not.toBe('')
    expect(SK_11.modifiers.ctrl).toBe(true)
  })
})

// ===========================================================================
// FR-101 -- before any save, and after one
// ===========================================================================

describe('FR-101 (MUST) -- a document that has never been in a file', () => {
  it('⭐ names no file and states no moment, and says so in words instead', () => {
    // 「まだ 1 度もファイルへ書いていないときは、時刻の代わりにその旨を示すこと
    //   （MUST）—— 空欄では「書けたのに読めない」と区別がつかない」. ⭐ THE
    // PREMISE OF EVERY CASE BELOW: what the save has to change has to start
    // unchanged.
    const one = bench(templateDocument())
    one.runFrames()

    const header = one.last().appHeaderItems
    expect(header.openedFileName).toBeNull()
    expect(header.fileSavedAt).toBeNull()
    expect(header.fileNeverSavedText.length).toBeGreaterThan(0)
  })
})

describe('FR-101 (MUST) -- once one save has succeeded', () => {
  it('⛔ the header names the very file that was written', async () => {
    // ⭐⭐ THE CASE D-66 ASKS FOR. 「いま開いているファイルの名前 … を画面上に示す
    // こと（MUST）」. The store answered the save with the file it wrote; an
    // implementation that returns as soon as the write succeeded -- 「`if
    // (saving.ok) return` が `DocumentFileSaving.openedFile` を捨てていた」 --
    // throws that answer away and the header goes on naming nothing.
    const one = bench(templateDocument())
    one.runFrames()
    await pressSave(one)
    nextFrame(one)

    // ⛔ EXACTLY ONE WRITE, so the name below can only have come from it.
    expect(one.written).toHaveLength(1)
    const wrote = one.written[0]?.suggestedFileName ?? ''
    expect(wrote.length).toBeGreaterThan(0)

    expect(one.last().appHeaderItems.openedFileName).toBe(wrote)
  })

  it('⛔ the header states the moment it was written, in place of the words', async () => {
    // 「そのファイルへ最後に書いた時刻を画面上に示すこと（MUST）」 -- and the
    // words that stood in for it are no longer what is shown, because the time
    // they stood in for now exists.
    const one = bench(templateDocument())
    one.runFrames()
    await pressSave(one)
    nextFrame(one)

    expect(one.written).toHaveLength(1)
    expect(one.last().appHeaderItems.fileSavedAt).not.toBeNull()
  })

  it('⛔ that moment is kept in UTC, to the second (FR-101 MUST / FR-063)', async () => {
    // 「**保管は UTC のままとすること（MUST）**」 and `FR-063`'s 「刻はいずれも
    // `ISO 8601`・UTC・秒まで」. ⚠️ The SPELLING ON THE SCREEN is deliberately
    // not asserted -- FR-101 says 「時刻の綴りそのものは本書が定めない」 -- so what
    // is read here is the value the header carries, not the text UF-71 draws.
    const one = bench(templateDocument())
    one.runFrames()
    await pressSave(one)
    nextFrame(one)

    const at = one.last().appHeaderItems.fileSavedAt ?? ''
    expect(at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  it('⛔ MUST NOT: the name it shows is the file’s, not the `Document Title`', async () => {
    // 「⚠️ **`Document Title` … と混同してはならない（MUST NOT）** —— あちらは文書
    //   が持つ値（`Project/Title`）であり、本要求が出すのは**ファイルの名前**で
    //   ある。**2 つが違う値になることは正常である。**」
    const one = bench(templateDocument())
    one.runFrames()
    const title = one.last().appHeaderItems.documentTitle

    await pressSave(one)
    nextFrame(one)

    const header = one.last().appHeaderItems
    expect(header.documentTitle).toBe(title)
    expect(header.openedFileName).not.toBe(title)
  })
})
