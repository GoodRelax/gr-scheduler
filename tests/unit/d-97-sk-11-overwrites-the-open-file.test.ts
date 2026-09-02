// Unit tests for the arm of `SK-11` that only a document ALREADY IN A FILE can
// show: `Ctrl` ＋ `S` writes straight over that file, opens nothing, and asks
// nothing.
//
// Unit under test: UF-48 `frame-loop.ts` of 表 T-075 (`SingleHtmlShell`, CP-25
// of 表 T-062). It is the unit that holds the current document and drives the
// save road, so it is the side that HAS an opened file to overwrite.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE LEDGER ROW IT STANDS IN FOR
// ---------------------------------------------------------------------------
//
// `docs/development-records/defects.md` D-97, from the reader's ruling of
// 2026-08-27: 「その代わり Ctrl+S で簡単保存してもらう。」 The row was written as
// a thing to build and then measured to be already built -- 「足す必要が無かった
// …… `Ctrl` ＋ `S` は 表 T-036 の `SK-11`「保存する」として既に仕様に在る」 -- so
// what is owed is not code but a case that would fall if the road came apart.
//
// ⛔ THE HALF THAT WAS UNCOVERED. tests/unit/uf-50.test.ts holds the KEY (that a
// host press of `Ctrl` ＋ `S` becomes `SK-11`), tests/unit/uf-30-31.test.ts holds
// the COMMAND, and tests/unit/uf-47-48-choosers.test.ts and
// tests/unit/d-66-fr-101-a-save-names-the-file-it-wrote.test.ts both drive
// `SK-11` on a document that has NEVER been in a file -- the arm FR-096 sends to
// the chooser. Nothing pressed it on a document that HAS one, which is the whole
// of FR-060 and the only place DI-5's MUST can be read.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES ANSWER TO (rule 03 §3: name the row, do not copy it)
// ---------------------------------------------------------------------------
//
//   表 T-036 `SK-11` 「保存する（`FR-096` の定めにより `GRS JSON` で書く。上書き
//            先は `FR-060`）」, 割当 `Ctrl+S` -- the key these cases press, read
//            out of that column rather than typed
//   `FR-060` 「作成者が開いたファイルを保存するとき、`GRS` は、**同じファイルへ上書
//            きできるようにすること。**」, with ⭐「**その速い道は 表 T-036 の
//            `SK-11` である（MUST）** —— **`IC-2` は `FR-096` の選択面を開く**の
//            で、問わずに上書きする経路は鍵のほうが持つ」
//   表 T-227 `DI-5` 「開いたファイルへの上書き保存 | **`FR-060` の経路では問わない
//            こと（MUST）** —— **開いたファイルは、定義によりこの文書のファイルで
//            ある。** 問うと、プロジェクト名を直しただけで毎回問われる」
//   `FR-096` 「表 T-036 の `SK-11`（保存する）は、どの形式から開いた文書であっても
//            `GRS JSON` で書くこと（MUST）」
//   表 T-024 `IO-2` -- `GRS JSON`, the form those bytes are in
//   表 T-034 `BT-4`, the bundled template: the one document whose values the
//            specification has actually decided
//   表 T-066 `CS-4` -- the file operation crosses frames, so a case has to stand
//            inside the wait and let it end
//
// ---------------------------------------------------------------------------
// ⛔ WHAT WAS READ OF `src/`: NOT ONE BODY (docs/development-rules/
// 04-verification.md, section 1). The loop is reached through the declarations
// tests/unit/d-66-fr-101-a-save-names-the-file-it-wrote.test.ts already imports,
// and the bench below is that file's with one difference that is the whole
// subject: `readOpenedFileState` answers `writable`, so the document HAS a file.
// ---------------------------------------------------------------------------
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED
//
//   1. THE SPELLING OF THE BYTES. `FR-024` owns what a written `GRS JSON`
//      document contains and tests/unit/uf-37-38.test.ts drives it; all that is
//      asked here is that what landed on the file reads back as a document, so
//      that "wrote something" cannot pass for "wrote the document".
//   2. WHAT THE HEADER SHOWS AFTERWARDS. `FR-101` is
//      tests/unit/d-66-fr-101-a-save-names-the-file-it-wrote.test.ts's.
//   3. WHETHER THE SAVE REPAINTS. That file's head comment records the gap in
//      the manuscript, and it is not reopened here.

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
const T_024: SpecTable = specTable('T-024')
const T_227: SpecTable = specTable('T-227')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** `FR-060`'s ⭐ clause -- the reason the KEY and not the icon is pressed here. */
const THE_FAST_ROAD_MUST = 'その速い道は 表 T-036 の `SK-11` である（MUST）'

/** `FR-096`'s clause that fixes the form those bytes are in. */
const THE_FORM_MUST =
  '表 T-036 の `SK-11`（保存する）は、どの形式から開いた文書であっても `GRS JSON` で書くこと（MUST）'

/**
 * The keystroke 表 T-036 assigns one row, read out of its 割当 column.
 *
 * ⚠️ The column spells a modifier with `＋` in some rows and `+` in others, and
 * a row with two spellings separates them with `/`; the first is taken.
 */
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

/** The file this document was opened from, and the one FR-060 writes back to. */
const OPEN_FILE_NAME = 'plan-of-record.grs.json'

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

/** Let every promise the loop is waiting on settle, on both queues (`CS-4`). */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

interface Bench {
  readonly loop: FrameLoop
  /** Every overwrite of the opened file the loop asked `IF-3` for, oldest first. */
  readonly overwritten: Uint8Array[]
  /** Every CHOSEN write -- the chooser road, which FR-060 does not take. */
  readonly chosen: ChosenFileWrite[]
  runFrames(): void
  /** Every description the loop has put up, oldest first. */
  views(): readonly ScreenView[]
  last(): ScreenView
}

/**
 * IF-3's far side, with a document that HAS a file.
 *
 * ⭐ THIS IS THE ONE DIFFERENCE FROM THE `D-66` BENCH: `readOpenedFileState`
 * answers `writable`, which is the state `FR-060` is about. `writeChosenFile`
 * still works, so a road that took the chooser would land a file and be seen --
 * it is not stubbed out into silence.
 *
 * @purity non-pure
 */
function bench(document: Document): Bench {
  const overwritten: Uint8Array[] = []
  const chosen: ChosenFileWrite[] = []
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
    readFieldCommit: () => null as never,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => null as ScreenPart | null,
  }

  const opened = { kind: 'writable', fileName: OPEN_FILE_NAME } as const

  const store: FileStore = {
    readFileToOpen: () => new Promise<FileReading>(() => {}),
    readOpenedFileState: async () => opened,
    restoreOpenedFilePermission: async () => opened,
    overwriteOpenedFile: async (bytes: Uint8Array) => {
      overwritten.push(bytes)
      return { ok: true, openedFile: opened } as never
    },
    writeChosenFile: async (write) => {
      chosen.push(write)
      return {
        ok: true,
        openedFile: { kind: 'writable', fileName: write.suggestedFileName },
      } as never
    },
  }

  const wiring: ScreenWiring = { surface, language: 'ja' as DisplayLanguage }
  const loop = frameLoop({ showSvg: () => {} } as any, document, SCREEN, wiring, store)

  return {
    loop,
    overwritten,
    chosen,
    runFrames: () => {
      // Bounded, so a loop that asks for a frame from inside a frame -- which
      // `NFR-010` forbids -- ends the case instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
    views: () => views,
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

/** One press of `SK-11`, waited out across the frames `CS-4` puts it over. */
async function pressSave(one: Bench): Promise<void> {
  one.loop.receiveInput(SK_11)
  one.runFrames()
  await settle()
  one.runFrames()
}

// ===========================================================================
// The manuscript still says what these cases read
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ 表 T-036 still assigns `Ctrl` ＋ `S` to SK-11, and points it at FR-060', () => {
    expect(SK_11.key).toBe('S')
    expect(SK_11.modifiers.ctrl, 'table T-036 no longer spells SK-11 with Ctrl').toBe(true)
    expect(SK_11.modifiers.shift).toBe(false)
    expect(SK_11.modifiers.alt).toBe(false)
    // ⚠️ The raw cell, not `bare`: that helper answers the FIRST code span of a
    // cell, and this claim is about a phrase the cell holds further along.
    const action = rowOf(T_036, 'SK-11').by['操作'] ?? ''
    expect(action, '表 T-036 の `SK-11`: 上書き先は `FR-060`').toContain('上書き先は `FR-060`')
  })

  it('⭐ FR-060 still calls SK-11 the fast road, and FR-096 still fixes the form', () => {
    expect(REQUIREMENTS).toContain(THE_FAST_ROAD_MUST)
    expect(REQUIREMENTS).toContain(THE_FORM_MUST)
    expect(bare(rowOf(T_024, 'IO-2').by['形式'] ?? '')).toBe('GRS JSON')
  })

  it('⭐ DI-5 still forbids a question on this road', () => {
    const di5 = rowOf(T_227, 'DI-5').by['規則'] ?? ''
    expect(di5, '表 T-227 の `DI-5`').toContain('`FR-060` の経路では問わないこと（MUST）')
  })
})

// ===========================================================================
// FR-060 (MUST) -- the key writes over the file the document came from
// ===========================================================================

describe('FR-060 -- `Ctrl` ＋ `S` on a document that is already in a file', () => {
  it('⛔ writes over that very file, through the member that names it', async () => {
    // 「同じファイルへ上書きできるようにすること」, and ⭐「その速い道は 表 T-036 の
    // `SK-11` である（MUST）」.
    // GOES RED IF: the press takes the chooser road, or takes no road at all --
    // both leave `overwritten` empty.
    const one = bench(templateDocument())
    await pressSave(one)

    expect(one.overwritten, 'FR-060 (MUST): the opened file was not written to').toHaveLength(1)
  })

  it('⛔ opens no chooser to do it -- that road is `IC-2`, not the key', async () => {
    // 「⭐ **`IC-2` は `FR-096` の選択面を開く**ので、問わずに上書きする経路は鍵の
    // ほうが持つ」. ⭐ The store below WOULD have taken a chosen write and
    // recorded it, so an empty roster is the claim and not a stub.
    // GOES RED IF: the key is wired to the same road the export icon takes.
    const one = bench(templateDocument())
    await pressSave(one)

    expect(one.chosen.map((write) => write.suggestedFileName)).toEqual([])
    expect(one.last().openModal, 'FR-060: the fast road opened a surface').toBeNull()
  })

  it('⛔ DI-5 (MUST): asks nothing, on any frame of the press', async () => {
    // 「**`FR-060` の経路では問わないこと（MUST）** —— **開いたファイルは、定義に
    // よりこの文書のファイルである。** 問うと、プロジェクト名を直しただけで毎回問
    // われる」. ⭐ EVERY description is read, not only the last: a question that
    // went up and came down again inside the wait would still have been asked.
    // GOES RED IF: the overwrite is sent through DI-4's confirmation.
    const one = bench(templateDocument())
    await pressSave(one)

    expect(one.views().length, 'the surface was given no description at all').toBeGreaterThan(0)
    for (const [at, view] of one.views().entries()) {
      expect(view.confirmation, `表 T-227 の \`DI-5\`: frame ${at} put a question up`).toBeNull()
    }
  })

  it('⛔ FR-096 (MUST): what lands on that file is GRS JSON, the whole document', async () => {
    // 「どの形式から開いた文書であっても `GRS JSON` で書くこと（MUST）」, and
    // 表 T-024 の `IO-2` is that form. ⭐ Read back through the codec rather than
    // matched against a string, so "wrote something" cannot pass for "wrote the
    // document".
    // GOES RED IF: the bytes are MSPDI, a picture, or an empty file.
    const one = bench(templateDocument())
    await pressSave(one)

    const bytes = one.overwritten[0]
    expect(bytes, 'FR-060 (MUST): nothing was written to read back').toBeDefined()
    const back = documentFromJson(new TextDecoder().decode(bytes as Uint8Array))
    expect(back.ok, 'FR-096 (MUST): the bytes on the opened file are not GRS JSON').toBe(true)
  })

  it('⛔ D-66 lives on the other side of this: a second press writes again', async () => {
    // `FR-060`'s RATIONALE: 「往復が同じファイルで閉じないと、どれが最新かを人が管
    // 理することになる。」 A road that overwrites once and then falls back to the
    // chooser -- or to nothing -- does not close the round trip.
    // GOES RED IF: the second press writes no bytes, or writes them somewhere
    // else.
    const one = bench(templateDocument())
    await pressSave(one)
    await pressSave(one)

    expect(one.overwritten, 'FR-060: the round trip did not close on the same file').toHaveLength(2)
    expect(one.chosen).toEqual([])
  })
})
