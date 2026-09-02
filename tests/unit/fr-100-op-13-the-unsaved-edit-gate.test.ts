// The two guards CR-280 put in when the autosave went (ledger row D-98):
//
//   FR-100 (MUST)      未保存の編集を持ったままページを離れようとしたとき、宿主の
//                      警告が出るようにすること。⛔ 未保存の編集が無いときに出させ
//                      てはならない（MUST NOT）。⛔ 警告の文言を `GRS` が決めては
//                      ならない（MUST NOT）
//   T-024a OP-13 (MUST) 開いているファイルを読み直すとき（表 T-036 の `SK-21`）：
//                      「**選ばせる面を開かずに、同じファイルをもう一度読むこと
//                      （MUST）** —— 開き直すたびに場所を選ばせるなら、`Ctrl` ＋
//                      `R` は「開く」と同じものになる。**`OP-3` の 3 択は問わず、
//                      置き換えに定めること（MUST）** …⛔ **`OP-4` の確認は掛かる
//                      こと（MUST）** —— 捨てるのは未保存の編集であり、置き換えで
//                      ある以上ここだけ免れる理由が無い。⚠️ **開いているファイルが
//                      無いときは何もしないこと（MUST）**」
//   T-024a OP-4 (MUST)  「置き換えを選んだときは、捨てる前に確認を求めること
//                      （MUST）。黙って捨ててはならない（MUST NOT）」
//   T-234 QN-5          「未保存の編集を捨てて置き換えるとき | 挙げる —— 捨てる
//                      文書の名前 | 表 T-024a の `OP-4`」
//   T-037 NT-7          the manner that question is put in.
//
// Unit under test: UF-48 of table T-075 (`frame-loop.ts`, component CP-25 of
// table T-062) -- the layer that holds the current value (LY-5 of table T-060)
// and therefore the only one that can say whether an edit is unsaved.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md, section 1). ⛔ NO FILE UNDER src/ WAS READ. The host, the
// fake surface, the fake `FileStore` and the way a key of table T-036 is spelt
// are copied from tests/unit/uf-47-48-choosers.test.ts and
// tests/unit/fr-029-the-reason-a-press-carries.test.ts, which are tests;
// `startup-template.json` is a generated document read as data.
//
// ---------------------------------------------------------------------------
// ⛔⛔ WHAT NO TEST IN THIS DIRECTORY CAN REACH -- FR-100's REGISTRATION
// ---------------------------------------------------------------------------
//
// FR-100's MUST is about the HOST's warning, which a page arranges by taking
// `beforeunload`. That belongs to the shell, and
// `src/framework/single-html-shell/single-html-shell.ts` EXPORTS NOTHING -- the
// module has no public member at all, so no Vitest case can import it, drive it
// or watch what it registers. ⇒ 「離れる前に宿主の警告が出るようにすること」 can
// only be shown through the page itself, which is table T-218's TS-1 / TS-3
// (Playwright), not TS-6.
//
// ⭐ WHAT THIS FILE HOLDS INSTEAD is the CONDITION the whole of FR-100 is
// written on -- 「未保存の編集を持ったまま」 and its MUST NOT 「未保存の編集が無い
// ときに出させてはならない」. `FrameLoop.hasUnsavedEdits()` is the only judgement
// of it anywhere below the shell; a shell that asked no one would have to invent
// a second one, and a warning raised on a wrong answer is wrong however faithful
// the registration is.
//
// ⛔ ALSO NOT ASSERTED: 「警告の文言を `GRS` が決めてはならない（MUST NOT）」. The
// requirement itself says the words are the host's and adds 「辞書に語を持たせて
// はならない（MUST NOT）」 -- and the dictionary is walked, entry by entry, by
// tests/contract/display-words.contract.test.ts. There is nothing left here to
// weigh.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { bare, specTable } from '../contract/spec-table'
import type {
  FileReading,
  FileStore,
  FileStoreFaultReason,
  OpenRoute,
  OpenedFileState,
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

// ---------------------------------------------------------------------------
// The manuscript, read at run time (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const T_036 = specTable('T-036')
const T_103 = specTable('T-103')
const T_234 = specTable('T-234')

/** Table T-036 prints what the shortcut does, then its assignment. */
const T_036_ASSIGNMENT = 1
/** Table T-103 prints the settled English name first, after the row ID. */
const T_103_NAME = 0
/** Table T-234 prints the 場面 first, then whether the names are listed. */
const T_234_NAMES = 1

const cellOf = (table: { rows: readonly { id: string; cells: readonly string[] }[] }, id: string, at: number): string => {
  const row = table.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`no row ${id}`)
  const cell = row.cells[at]
  if (cell === undefined) throw new Error(`row ${id} has no cell ${at}`)
  return cell
}

/** One row of table T-036, spelt as its assignment column spells it. */
const keyOf = (id: string): KeyInput => {
  const parts = (cellOf(T_036, id, T_036_ASSIGNMENT).split('/')[0] ?? '')
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

/** SK-10 -- the one entrance OP-2 allows for opening a document. */
const SK_10 = keyOf('SK-10')
/** SK-11 -- writing the document out. */
const SK_11 = keyOf('SK-11')
/** SK-21 -- 「開いているファイルを読み直す」, the key OP-13 hangs on. */
const SK_21 = keyOf('SK-21')

/** U-56 -- the surface OP-3's three-way question stands on. */
const OPEN_CHOOSER = bare(cellOf(T_103, 'U-56', T_103_NAME))
/** U-55 -- the surface NT-7's question stands on. */
const CONFIRMATION = bare(cellOf(T_103, 'U-55', T_103_NAME))

/** The manuscript's two answers to a question of table T-234. */
const PROCEED_ANSWER = 'proceed'
const CANCEL_ANSWER = 'cancel'

// ---------------------------------------------------------------------------
// The document, the host and the two fakes
// ---------------------------------------------------------------------------

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

/** FR-027's template, which is a whole document and carries a Task to rename. */
const templateDocument = (): Document => structuredClone(TEMPLATE) as unknown as Document

/** The uid of the Task these cases edit -- read off the template, never typed. */
const firstTaskUid = (document: Document): number => {
  const uid = (document as unknown as { schedule: { tasks: { uid: number }[] } }).schedule.tasks[0]
    ?.uid
  if (uid === undefined) throw new Error('FR-027 template carries no Task to edit')
  return uid
}

const titleOf = (document: Document): string =>
  String(
    (document as unknown as { schedule: { project: { title: unknown } } }).schedule.project.title,
  )

const firstTaskName = (document: Document): string =>
  String(
    (document as unknown as { schedule: { tasks: { name: unknown }[] } }).schedule.tasks[0]?.name,
  )

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as unknown as { requestAnimationFrame?: unknown })
  .requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

function host(): Host {
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

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  /** What IF-9's `readFieldCommit` answers once, and once only. */
  commitField(value: unknown): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  let commit: unknown = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => {
      const one = commit
      commit = null
      return one as never
    },
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    commitField: (value) => {
      commit = value
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

interface StoreProbe {
  readonly store: FileStore
  /** The route of every read the loop asked IF-3 for, oldest first. */
  readonly routes: OpenRoute[]
  /** How many writes landed. */
  readonly written: number[]
  pendingOpens(): number
  handOver(document: Document, fileName: string): void
  failOpen(reason: FileStoreFaultReason): void
}

/**
 * IF-3's far side, stood in for.
 *
 * ⭐ `readFileToOpen` does not answer at once, so a case can stand in the
 * stretch between the asking and the answer -- which is where OP-13's question
 * either does or does not appear.
 */
function fileStore(opened: OpenedFileState): StoreProbe {
  const routes: OpenRoute[] = []
  const written: number[] = []
  const waiting: ((reading: FileReading) => void)[] = []
  const store: FileStore = {
    readFileToOpen: (route) => {
      routes.push(route)
      return new Promise<FileReading>((resolve) => {
        waiting.push(resolve)
      })
    },
    readOpenedFileState: async () => opened,
    restoreOpenedFilePermission: async () => opened,
    overwriteOpenedFile: async () => {
      written.push(written.length)
      return { ok: true, openedFile: opened } as never
    },
    writeChosenFile: async (write) => {
      written.push(written.length)
      return {
        ok: true,
        openedFile: { kind: 'writable', fileName: write.suggestedFileName },
      } as never
    },
  }
  const answerOne = (reading: FileReading): void => {
    const answer = waiting.shift()
    if (answer === undefined) throw new Error('no read of a file is waiting for an answer')
    answer(reading)
  }
  return {
    store,
    routes,
    written,
    pendingOpens: () => waiting.length,
    handOver: (document, fileName) => {
      answerOne({
        ok: true,
        file: { bytes: new TextEncoder().encode(JSON.stringify(document)), fileName },
      })
    },
    failOpen: (reason) => {
      answerOne({ ok: false, fault: { reason, what: 'the case asked the store to fail' } })
    },
  }
}

/** Let every promise the loop is waiting on settle, on both queues. */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 16; turn += 1) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

const ENTER: KeyInput = { kind: 'key', key: 'Enter', modifiers: { ...NO_MODIFIERS } }

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  readonly files: StoreProbe
  frames(): void
  send(input: KeyInput | PointerInput): void
  /** Settle every promise and draw whatever came of it. */
  turn(): Promise<void>
  /** One in-place edit, committed the way IF-9 reports one. */
  rename(text: string): Promise<void>
  /** Take one entry of table T-109 on an open surface (CS-2: settled at the press). */
  takeEntry(surface: string, entry: string): void
  /** Answer the question NT-7 put up. */
  answer(which: string): void
}

async function stage(opened: OpenedFileState): Promise<Stage> {
  const pane = host()
  const screen = screenPane()
  const files = fileStore(opened)
  const document = templateDocument()
  const uid = firstTaskUid(document)
  const loop = frameLoop(pane.surface, document, SCREEN, screen.wiring, files.store)
  pane.runAnimationFrames()
  await settle()
  pane.runAnimationFrames()

  const send = (input: KeyInput | PointerInput): void => {
    loop.receiveInput(input as never)
    pane.runAnimationFrames()
  }
  const turn = async (): Promise<void> => {
    await settle()
    pane.runAnimationFrames()
  }
  const at = (surface: string, entry: string | null, answerKey?: string): void => {
    screen.drawAt({
      part: surface,
      entry,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
      ...(answerKey === undefined ? {} : { confirmationAnswer: answerKey }),
    } as unknown as ScreenPart)
    send(pointer('down', 500, 300))
    send(pointer('up', 500, 300))
    screen.drawAt(null)
  }
  return {
    loop,
    screen,
    files,
    frames: () => pane.runAnimationFrames(),
    send,
    turn,
    rename: async (text) => {
      // IF-9's third answer: an in-place edit that has been settled. PR-1 of
      // table T-016 is the Task's name.
      screen.commitField({ row: 'PR-1', key: { holder: 'task', uid, column: 'name' }, text })
      send(ENTER)
      await turn()
    },
    takeEntry: (surface, entry) => at(surface, entry),
    answer: (which) => at(CONFIRMATION, null, which),
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
// FR-100 -- the condition the host warning is hung on
// ===========================================================================

describe('FR-100 -- whether there is an unsaved edit to be warned about', () => {
  it('⛔ MUST NOT: a document nobody has touched has no unsaved edit', async () => {
    // 「未保存の編集が無いときに出させてはならない（MUST NOT）—— 毎回出る警告は
    // 読まれなくなる」. The shell has one place to ask, and on a document just
    // handed to it the answer has to be no.
    const built = await stage({ kind: 'none' })
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })

  it('⭐ MUST: one settled edit is an unsaved edit', async () => {
    // 「未保存の編集を持ったまま作成者がページを離れようとしたとき … 離れる前に
    // 宿主の警告が出るようにすること（MUST）」. ⛔ Without this case the one
    // above would be green over a loop that answered `false` for ever, which is
    // the failure FR-100 exists to stop: 表 T-004 の `LM-11`,
    // 「タブを閉じる誤操作 1 回で最後の保存以降のすべてが消える」.
    const built = await stage({ kind: 'none' })
    await built.rename('Renamed by the case')

    expect(firstTaskName(built.loop.document()), 'the edit did not land at all').toBe(
      'Renamed by the case',
    )
    expect(built.loop.hasUnsavedEdits()).toBe(true)
  })

  it('⭐ and writing the document out clears it again', async () => {
    // The other side of the MUST NOT: once the edit is in the file there is
    // nothing to lose by leaving, and a warning then is one of the warnings
    // 「読まれなくなる」.
    const built = await stage({ kind: 'writable', fileName: 'plan-a.json' })
    await built.rename('Renamed by the case')
    expect(built.loop.hasUnsavedEdits()).toBe(true)

    built.send(SK_11)
    await built.turn()

    expect(built.files.written.length, 'SK-11 wrote nothing, so nothing was saved').toBeGreaterThan(
      0,
    )
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })
})

// ===========================================================================
// QN-5 -- the gate itself, driven end to end
// ===========================================================================

describe('T-234 QN-5 -- the question that stands before an unsaved edit is discarded', () => {
  it('⭐ MUST: replacing a document that holds an unsaved edit puts QN-5 up', async () => {
    // OP-4: 「置き換えを選んだときは、捨てる前に確認を求めること（MUST）。黙って
    // 捨ててはならない（MUST NOT）」, and 表 T-234's QN-5 is the question:
    // 「未保存の編集を捨てて置き換えるとき | 挙げる —— 捨てる文書の名前」.
    const built = await stage({ kind: 'none' })
    await built.rename('Renamed by the case')
    const discarded = titleOf(built.loop.document())

    built.send(SK_10)
    await built.turn()
    built.files.handOver(templateDocument(), 'there.json')
    await built.turn()
    built.takeEntry(OPEN_CHOOSER, 'IC-71')
    await built.turn()

    const question = built.screen.last().confirmation
    expect(question, 'OP-4 (MUST NOT): the document would go in silence').not.toBeNull()
    // ⭐ WHICH question -- the row of table T-234, not merely that one stands.
    expect(question?.question).toBe('QN-5')
    // 「U-55 | `Confirmation` | 続けてよいかを問う面。問い方は表 T-037 の `NT-7`」
    expect(question?.manner).toBe('NT-7')
    // 「挙げる —— 捨てる文書の名前」: the 名前を挙げるか column of table T-234,
    // read out of the manuscript rather than assumed.
    expect(cellOf(T_234, 'QN-5', T_234_NAMES)).toContain('挙げる')
    expect(question?.items.map((one) => one.name)).toEqual([discarded])
  })

  it('⛔ answering "no" keeps the document AND the unsaved edit', async () => {
    // NT-7 makes calling it off one of the two answers, and OP-4's MUST NOT is
    // about the discarding, not about the silence alone -- an edit thrown away
    // after a "no" is thrown away just the same.
    const built = await stage({ kind: 'none' })
    await built.rename('Renamed by the case')

    built.send(SK_10)
    await built.turn()
    built.files.handOver(templateDocument(), 'there.json')
    await built.turn()
    built.takeEntry(OPEN_CHOOSER, 'IC-71')
    await built.turn()
    built.answer(CANCEL_ANSWER)
    await built.turn()

    expect(firstTaskName(built.loop.document())).toBe('Renamed by the case')
    expect(built.loop.hasUnsavedEdits()).toBe(true)
    expect(built.screen.last().confirmation, 'the answered question is still standing').toBeNull()
  })

  it('⭐ answering "yes" is what discards it -- so the gate is a gate', async () => {
    // ⛔ WITHOUT THIS the case above would be green over a loop that never
    // replaced anything at all.
    const built = await stage({ kind: 'none' })
    await built.rename('Renamed by the case')

    built.send(SK_10)
    await built.turn()
    built.files.handOver(templateDocument(), 'there.json')
    await built.turn()
    built.takeEntry(OPEN_CHOOSER, 'IC-71')
    await built.turn()
    built.answer(PROCEED_ANSWER)
    await built.turn()

    expect(firstTaskName(built.loop.document())).not.toBe('Renamed by the case')
    expect(built.screen.last().confirmation).toBeNull()
  })
})

// ===========================================================================
// OP-13 -- Ctrl + R, the road CR-280 added
// ===========================================================================

describe('T-024a OP-13 -- reading the open file again', () => {
  it('⭐ SK-21 is the key table T-036 assigns, and it reaches IF-3 by the reopen route', async () => {
    // 「開いているファイルを読み直すとき（表 T-036 の `SK-21`）… 同じファイルを
    // もう一度読むこと（MUST）」. The route is the one thing that tells this
    // read apart from OP-2's two, and IF-3 is handed it.
    expect(SK_21.modifiers.ctrl, 'table T-036 no longer spells SK-21 with Ctrl').toBe(true)

    const built = await stage({ kind: 'writable', fileName: 'plan-a.json' })
    await built.rename('Renamed by the case')

    built.send(SK_21)
    await built.turn()

    expect(built.files.routes).toEqual(['reopen'])
  })

  it('⛔⛔ MUST: no surface asks which of OP-3 s three to do -- the answer is settled', async () => {
    // 「**選ばせる面を開かずに、同じファイルをもう一度読むこと（MUST）** ——
    // 開き直すたびに場所を選ばせるなら、`Ctrl` ＋ `R` は「開く」と同じものに
    // なる。**`OP-3` の 3 択は問わず、置き換えに定めること（MUST）**」.
    //
    // ⛔⛔ MEASURED RED ON 2026-09-03, and left standing (rule 04 section 1:
    // 「期待値をコードに合わせて書き換えてはならない。仕様が明確ならコードを直す」).
    // What the loop does today: the reading arrives and the `Open Chooser`
    // (U-56) stands, exactly as it does for SK-10 -- so `Ctrl` + `R` IS 「開く」
    // と同じもの, which is the failure this MUST names in its own reason.
    const built = await stage({ kind: 'writable', fileName: 'plan-a.json' })
    await built.rename('Renamed by the case')

    built.send(SK_21)
    await built.turn()
    built.files.handOver(templateDocument(), 'plan-a.json')
    await built.turn()

    expect(
      built.screen.last().openModal?.surface ?? null,
      'OP-13 (MUST): the reopen opened the surface that asks which of the three to do',
    ).toBeNull()
  })

  it('⛔⛔ MUST: the re-read file replaces the document, through OP-4 s question', async () => {
    // 「`OP-3` の 3 択は問わず、置き換えに定めること（MUST）」 and 「⛔ `OP-4` の
    // 確認は掛かること（MUST）—— 捨てるのは未保存の編集であり、置き換えである
    // 以上ここだけ免れる理由が無い」. ⇒ ONE question (QN-5) and then the
    // replacement, with no three-way choice in between.
    //
    // ⛔⛔ MEASURED RED ON 2026-09-03: no question of table T-234 is put at all
    // on this road, and the document is not replaced -- the reading stops at
    // the chooser the case above measures.
    const built = await stage({ kind: 'writable', fileName: 'plan-a.json' })
    await built.rename('Renamed by the case')

    built.send(SK_21)
    await built.turn()
    built.files.handOver(templateDocument(), 'plan-a.json')
    await built.turn()

    expect(
      built.screen.last().confirmation?.question ?? null,
      'OP-13 (MUST): OP-4 の確認は掛かること -- and the unsaved edit is what it is about',
    ).toBe('QN-5')

    built.answer(PROCEED_ANSWER)
    await built.turn()

    expect(firstTaskName(built.loop.document())).not.toBe('Renamed by the case')
  })

  it('⚠️ nothing is replaced when there is no open file to re-read (MUST)', async () => {
    // 「開いているファイルが無いときは何もしないこと（MUST）—— 読み直す相手が
    // 無い」. ⚠️ WHAT IS ASSERTED IS THE OUTCOME. IF-3 is the seam that holds
    // FR-060's file, and docs/spec does not say whether the loop may ask it
    // before deciding there is nothing to re-read -- so this case answers the
    // read with the store's own `noOpenedFile` and asks that the document, the
    // edit and the surfaces all stand as they were.
    const built = await stage({ kind: 'none' })
    await built.rename('Renamed by the case')

    built.send(SK_21)
    await built.turn()
    if (built.files.pendingOpens() > 0) built.files.failOpen('noOpenedFile')
    await built.turn()

    expect(firstTaskName(built.loop.document())).toBe('Renamed by the case')
    expect(built.loop.hasUnsavedEdits()).toBe(true)
    expect(built.screen.last().openModal?.surface ?? null).toBeNull()
    expect(built.screen.last().confirmation).toBeNull()
  })
})
