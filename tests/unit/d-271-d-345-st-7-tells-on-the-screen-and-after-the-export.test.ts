// 表 T-014 の `ST-7` -- the half of the safety valve that is a TELLING, on both
// of the roads the row names.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: `TS-6`,
// tests/unit/, written by someone who read only docs/spec. The unit is `UF-48`
// of 表 T-075 (`frame-loop.ts`, `CP-25` of 表 T-062) -- 表 T-060's `LY-5` makes
// it the only layer that may hold a current value, so it is the side that can
// see a layout reach the valve and put a telling up.
//
// ---------------------------------------------------------------------------
// ⭐ THE CLAUSE, VERBATIM (docs/spec/01-04-requirements.md, 表 T-014 の `ST-7`)
// ---------------------------------------------------------------------------
//
//   「ただし 1 つの `TaskGroup` あたりの段数に安全弁を置き、達したらそこで処理を
//    止め、達したことを判別できる値で返して人に通知すること（MUST）。例外を投げ
//    てはならない（MUST NOT）」
//   「⛔⛔ 通知先を画面を描く経路に限ってはならない（MUST NOT） —— 絵を書き出す
//    経路（`FR-080`）で達したときも、書き出しを終えたあとで同じ通知を画面に上げ
//    ること（MUST）」（利用者の裁定 2026-09-06）
//   「安全弁の値（`S-89`）は「許される段数の上限」であること（MUST）」
//
// and the reason it hands the person (表 T-233):
//
//   | RS-24 | 1 つの `TaskGroup` の段数が安全弁に達したので、これ以上積めない
//           | `NT-3a` | 表 T-014 の `ST-7` |
//
// and the entrance the picture takes to the clipboard (`FR-025`):
//
//   「`IO-6`（クリップボード）の入口は 表 T-109 の `IC-3` とし、選択面を開かずに
//    直ちに送ること（MUST）」
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS BESIDE tests/unit/st-7-rs-24-the-stack-safety-valve-
//    returns-a-value.test.ts, WHICH ANOTHER BODY WROTE
// ---------------------------------------------------------------------------
// That file asks the LAYOUT's half of `ST-7`: the member is always there, it is
// null up to `S-89` and named past it, nothing is thrown, nothing is squeezed or
// dropped, and 表 T-233 holds `RS-24` with `NT-3a`. ⛔ Its last case is 「ST-7
// raises no reason while no row reached the valve」 -- the NEGATIVE half only.
// ⇒ Nothing anywhere asks the two things the ledger rows below are about:
//
//   D-271 「段数の安全弁に達しても、人に何も告げない」 -- that a telling carrying
//         `RS-24` actually STANDS when a row reaches the valve.
//   D-345 「止まった書き出しが人に告げるかを、どの条項も定めていない」 -- settled
//         by CR-368 with the MUST NOT / MUST quoted above, and its own record
//         closes with 「⛔ 試験はまだ無い」.
//
// ⛔ THIS FILE DOES NOT RE-ASK ANYTHING THAT FILE ASKS. The boundary either side
// of `S-89` is asked HERE ONLY as the premise of a telling, because a telling
// that stood one stack too early would be a different defect from one that never
// stands at all.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: only the head, the
// published types and the signatures.)
//
//   frame-loop.ts        `FrameEnvironment`, `FrameLoop`, `ScreenWiring` and the
//                        signature `frameLoop(surface, first, env, screen?,
//                        files?, showPointerShape?, clipboard?, ...)`
//   screen-renderer.ts   `DisplayLanguage`, `ScreenPart`, `ScreenSurface`,
//                        `ScreenView`, `Notice`
//   clipboard-gateway.ts `Clipboard`, `ClipboardContent`, `ClipboardWriting`
//   file-store.ts        `FileStore`, `FileReading`, `ChosenFileWrite`
//   input-command-translator.ts  `HumanInput`, `InputModifiers`, `KeyInput`,
//                        `PointerInput`, `PointerPhase`
// ⛔ NO FUNCTION BODY WAS READ. Nothing was read of where or how a telling is
// raised; every expectation below is `ST-7`'s, 表 T-233's and `FR-025`'s.
// ⭐ THE HOST, THE FAKE SURFACE, THE FAKE STORE AND THE FAKE CLIPBOARD ARE
// COPIED, NOT INVENTED: tests/unit/uf-47-48-choosers.test.ts drives this same
// unit through the export chooser, tests/unit/d-337-fr-029-the-three-file-gates-
// say-why-on-a-second-press.test.ts drives it for a telling, and
// tests/unit/uf-45-46.test.ts is where a `Clipboard` seam is stood in for.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//  1. HOW OFTEN the screen road tells. D-271's record says 「告げるのは `null`
//     から止まりに変わった回だけ」, and NOTHING IN docs/spec SAYS SO: `RS-24`'s
//     作法 names `NT-3a` alone, and the one rule about piling the same reason up
//     stands on `NT-3`, whose 場面 is 「破壊的な結果を伴うとき」. Asserting a
//     once-per-turn gate here would be this file writing specification.
//  2. WHETHER A NON-PICTURE EXPORT TELLS. The clause scopes the second road to
//     「絵を書き出す経路（`FR-080`）」, and says nothing of `IO-1` / `IO-2` /
//     `IO-7`. A case demanding silence there would be an invention.
//  3. THE PICTURE'S OWN CONTENT. `FR-025` and 表 T-041's `WY-2` own that, and
//     tests/unit/uf-45-46.test.ts asks it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  Clipboard,
  ClipboardContent,
  ClipboardWriting,
} from '../../src/adapter/clipboard-gateway/clipboard-gateway'
import type {
  ChosenFileWrite,
  FileReading,
  FileStore,
} from '../../src/adapter/file-gateway/file-store'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  Notice,
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
import { bare, specTable, type SpecRow, type SpecTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// 1. The manuscript, read at run time rather than copied
// ===========================================================================

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

/**
 * ⚠️ Japanese literals in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- these strings ARE the
 * clauses, and matching them against the manuscript is what makes the cases
 * below cases about the specification.
 *
 * ⭐ EACH ENDS AT ITS OWN MARKER's CLOSING PARENTHESIS, so the trailing window
 * check 39 takes is a window this file actually holds.
 */
const ST_7_STOP_AND_TELL_ON_A_VALUE =
  '達したらそこで処理を止め、達したことを判別できる値で返して人に通知すること（MUST）'

const ST_7_NO_EXCEPTION = '例外を投げてはならない（MUST NOT）'

/** ⭐⭐ THE CLAUSE CR-368 ADDED, which is the whole of D-345. */
const ST_7_NOT_ONLY_THE_SCREEN_ROAD =
  '通知先を画面を描く経路に限ってはならない（MUST NOT）'

const ST_7_TELL_AFTER_THE_EXPORT =
  '絵を書き出す経路（`FR-080`）で達したときも、書き出しを終えたあとで同じ通知を画面に上げること（MUST）'

/** The boundary the row states, so 「reached」 is not read two ways here either. */
const ST_7_CAP_IS_THE_HIGHEST_ALLOWED =
  '安全弁の値（`S-89`）は「許される段数の上限」であること（MUST）'

/** `FR-025`'s entrance for `IO-6` -- why `IC-3` is what these cases press. */
const FR_025_IC_3_SENDS_AT_ONCE =
  '`IO-6`（クリップボード）の入口は 表 T-109 の `IC-3` とし、選択面を開かずに直ちに送ること（MUST）'

/** `SK-19`'s first duty -- how a standing telling is taken down between roads. */
const SK_19_DISMISSES_ONE =
  '出ている通知があるときは、それを 1 つ消すこと（MUST）'

const T_036: SpecTable = specTable('T-036')
const T_037: SpecTable = specTable('T-037')
const T_109: SpecTable = specTable('T-109')
const T_233: SpecTable = specTable('T-233')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/** The reason 表 T-233 gives the valve. */
const RS_24 = 'RS-24'

/** The manner 表 T-233 puts on that row. ⛔ Read, never typed. */
const MANNER_OF_RS_24 = bare(rowOf(T_233, RS_24).by['作法'] ?? '')

/**
 * The keystroke 表 T-036 assigns one row, read out of its 割当 column.
 * ⚠️ Copied from tests/unit/d-337-....test.ts, including its warning against
 * `bare`: `SK-21`'s 割当 is 「`Ctrl` ＋ `R`」 and `bare` would answer `Ctrl`.
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

/** `SK-12` -- `FR-096`'s one entrance, which begins with the choice of a format. */
const SK_12 = keyOf('SK-12')
/** `SK-19` -- 「出ている通知があるときは、それを 1 つ消すこと（MUST）」. */
const SK_19 = keyOf('SK-19')

/**
 * The 表 T-103 面 one entrance of 表 T-109 stands on, read out of its 面 column.
 *
 * ⭐ 「**`面` の欄は 表 T-103 の確定名である。**」 (表 T-109's own preamble), so
 * the surface a press reports is the table's answer and not this file's.
 */
const surfaceOf = (entry: string): string => bare(rowOf(T_109, entry).by['面'] ?? '')

/** U-54 -- the surface `FR-096` writes a document out through, named by 表 T-103. */
const EXPORT_CHOOSER = bare(rowOf(specTable('T-103'), 'U-54').by['確定名（英）'] ?? '')

/**
 * FR-038's dictionary, as the MANUSCRIPT keeps it.
 *
 * ⭐ `docs/spec/_source/` is where the words are written; the copy under
 * `src/adapter/screen-renderer/` is printed from it. Rule 04 section 1 has these
 * cases driven from docs/spec, and the two are held together by
 * `npm run words:check`, not by this file.
 */
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
  if (found === undefined) {
    throw new Error(
      `FR-076 (MUST): table T-233 row ${rowId} has no entry in FR-038's dictionary, so a notice ` +
        'carrying it cannot be told in words',
    )
  }
  return found
}

// ===========================================================================
// 2. The documents. One row, `howMany` tasks that all cover the same days.
// ===========================================================================

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

/**
 * The valve these cases are driven at.
 *
 * ⛔ NOT `S-89`'s own 255. That row's remark says the figure 「測って決めた値では
 * ない」 and 「これだけの本数が 1 つの行で同時に重なるのは実務では起きない」, so a
 * fixture of 256 overlapping tasks would be measuring the fixture. `ST-7` states
 * the BEHAVIOUR at the cap and puts the NUMBER in `S-89`, and the sibling file
 * (`st-7-rs-24-...`) is where the number itself is held to the manuscript.
 */
const CAP = 3

const ROW_ID = '11111111-2222-3333-4444-555555555555'

function task(uid: number): Record<string, unknown> {
  return {
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name: `Task ${uid}`,
    start: '2026-04-01T00:00:00',
    finish: '2026-04-10T00:00:00',
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  }
}

/**
 * `howMany` tasks that all cover the same days, on ONE row, under a cap of `CAP`.
 *
 * ⭐ `ST-10` keeps a merely touching pair off the same stack; these overlap
 * outright, so `ST-3`'s greedy assignment has to open one stack per task and the
 * row's stack count IS `howMany`.
 */
function documentOfOverlaps(howMany: number, cap: number = CAP): Document {
  const template = structuredClone(TEMPLATE) as any
  const uids = Array.from({ length: howMany }, (_, index) => index + 1)
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        title: 'A row that reaches the valve',
        uidHighWaterMark: 1000,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: uids.map((uid) => task(uid)),
      resources: [],
      assignments: [],
      taskGroups: [
        {
          id: ROW_ID,
          parentId: null,
          label: 'One row',
          derivedFromTaskUid: null,
          order: 0,
          isCollapsed: false,
          isHidden: false,
          color: null,
          height: null,
        },
      ],
      taskGroupMembers: uids.map((uid) => ({ taskUid: uid, groupId: ROW_ID, stackOrder: null })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...structuredClone(template.documentSettings), stackSafetyCap: cap },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

// ===========================================================================
// 3. The host UF-48 is given
// ===========================================================================

const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
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
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
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

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  } as unknown as ScreenSurface
  return {
    wiring: { surface, language } as unknown as ScreenWiring,
    drawAt: (next) => {
      part = next
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
  readonly written: ChosenFileWrite[]
}

/** IF-3's far side, stood in for. Copied from tests/unit/uf-47-48-choosers.test.ts. */
function fileStore(): StoreProbe {
  const written: ChosenFileWrite[] = []
  const store: FileStore = {
    readFileToOpen: () => new Promise<FileReading>(() => undefined),
    readOpenedFileState: async () => ({ kind: 'none' }),
    restoreOpenedFilePermission: async () => ({ kind: 'none' }),
    overwriteOpenedFile: async () => ({
      ok: false,
      fault: { reason: 'noOpenedFile', what: 'this document has never been in a file' },
    }),
    writeChosenFile: async (write: ChosenFileWrite) => {
      written.push(write)
      return { ok: true, openedFile: { kind: 'writable', fileName: write.suggestedFileName } }
    },
  } as unknown as FileStore
  return { store, written }
}

interface ClipboardProbe {
  readonly clipboard: Clipboard
  readonly received: ClipboardContent[]
}

/** IF-5's far side, stood in for. Copied from tests/unit/uf-45-46.test.ts. */
function clipboardProbe(): ClipboardProbe {
  const received: ClipboardContent[] = []
  return {
    received,
    clipboard: {
      writeClipboardContent: (content: ClipboardContent): Promise<ClipboardWriting> => {
        received.push(content)
        return Promise.resolve({ ok: true })
      },
    },
  }
}

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
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

const partAt = (part: string, entry: string | null, format: string | null): ScreenPart =>
  ({
    part,
    entry,
    format,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  }) as unknown as ScreenPart

// ===========================================================================
// 4. One stage, with every road these cases take
// ===========================================================================

interface Stage {
  readonly loop: FrameLoop
  readonly written: ChosenFileWrite[]
  readonly clipped: ClipboardContent[]
  press(input: HumanInput): Promise<void>
  /** Press one entrance of 表 T-109 on the 面 that table gives it. */
  take(entry: string): Promise<void>
  /** Press one row of 表 T-024 on `FR-096`'s chooser. */
  takeFormat(format: string): Promise<void>
  notices(): readonly Notice[]
  /** `SK-19` (MUST): take every standing telling down, so the next road starts clean. */
  clearNotices(): Promise<void>
}

function stage(document: Document, language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const files = fileStore()
  const board = clipboardProbe()
  const loop = frameLoop(
    pen.surface,
    document,
    SCREEN,
    screen.wiring,
    files.store,
    undefined,
    board.clipboard,
  )
  pen.runAnimationFrames()
  const press = async (input: HumanInput): Promise<void> => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
    await settle()
    pen.runAnimationFrames()
  }
  const pressAt = async (part: ScreenPart): Promise<void> => {
    // CS-2 of 表 T-066 settles the gesture on what was drawn AT THE PRESS.
    screen.drawAt(part)
    loop.receiveInput(pointer('down', 500, 300))
    loop.receiveInput(pointer('up', 500, 300))
    screen.drawAt(null)
    pen.runAnimationFrames()
    await settle()
    pen.runAnimationFrames()
  }
  const notices = (): readonly Notice[] => screen.last().notices
  return {
    loop,
    written: files.written,
    clipped: board.received,
    press,
    take: (entry) => pressAt(partAt(surfaceOf(entry), entry, null)),
    takeFormat: (format) => pressAt(partAt(EXPORT_CHOOSER, null, format)),
    notices,
    clearNotices: async () => {
      for (let turn = 0; turn < 8 && notices().length > 0; turn += 1) await press(SK_19)
    },
  }
}

/** Whether one telling is the valve's, judged from the dictionary end. */
const isTheValve = (notice: Notice, language: DisplayLanguage): boolean =>
  notice.text === wordsFor(RS_24).text[language]

// ===========================================================================
// 5. The premises every case below stands on
// ===========================================================================

describe('表 T-014 の ST-7 -- the manuscript this file is driven by', () => {
  it('still asks for a VALUE and a TELLING, and still forbids the exception', () => {
    expect(REQUIREMENTS).toContain(ST_7_STOP_AND_TELL_ON_A_VALUE)
    expect(REQUIREMENTS).toContain(ST_7_NO_EXCEPTION)
  })

  it('⭐⭐ still forbids the telling being the screen road’s alone, and asks for it after an export', () => {
    // ⛔ THE WHOLE OF D-345. CR-368 put both halves on `ST-7` on 2026-09-06; a
    // manuscript that lost them would make every case in section 7 an invention.
    expect(REQUIREMENTS).toContain(ST_7_NOT_ONLY_THE_SCREEN_ROAD)
    expect(REQUIREMENTS).toContain(ST_7_TELL_AFTER_THE_EXPORT)
  })

  it('still makes S-89 the HIGHEST ALLOWED count, so the boundary below is the row’s', () => {
    expect(REQUIREMENTS).toContain(ST_7_CAP_IS_THE_HIGHEST_ALLOWED)
  })

  it('表 T-233 still holds RS-24 with NT-3a and ST-7 for its 正, and the dictionary holds its words', () => {
    expect(rowOf(T_233, RS_24).cells.join(' ')).toContain('安全弁')
    expect(MANNER_OF_RS_24).toBe('NT-3a')
    expect(rowOf(T_233, RS_24).by['正'] ?? '').toContain('ST-7')
    expect(T_037.rows.map((one) => one.id)).toContain(MANNER_OF_RS_24)
    expect(wordsFor(RS_24).text.ja.length).toBeGreaterThan(0)
    expect(wordsFor(RS_24).text.en.length).toBeGreaterThan(0)
  })

  it('⭐ RS-24 says something no other row of 表 T-233 says', () => {
    // ⛔ WITHOUT THIS, 「the telling carried RS-24」 would pass on a loop that
    // carried any row at all, because the words would collide.
    const mine = wordsFor(RS_24).text.ja
    const others = T_233.rows
      .filter((one) => one.id !== RS_24)
      .map((one) => REASON_WORDS.find((word) => word.rowId === one.id)?.text.ja)
      .filter((one): one is string => one !== undefined)
    expect(others).not.toContain(mine)
    expect(wordsFor(RS_24).text.en).not.toBe(mine)
  })

  it('FR-025 still sends the picture to the clipboard through IC-3, with no chooser', () => {
    expect(REQUIREMENTS).toContain(FR_025_IC_3_SENDS_AT_ONCE)
    // 「**`面` の欄は 表 T-103 の確定名である。**」 -- so the press below lands on
    // the surface the table names and not on one this file chose.
    expect(surfaceOf('IC-3').length).toBeGreaterThan(0)
    expect(rowOf(T_109, 'IC-3').by['正'] ?? '').toContain('IO-6')
  })

  it('SK-19 still takes one standing telling down, which is how a road is started clean', () => {
    expect(REQUIREMENTS).toContain(SK_19_DISMISSES_ONE)
  })

  it('nothing is told about a document that does not reach the valve', () => {
    // The control every case below leans on: a telling that stood on ANY
    // document would make all of them pass for nothing.
    expect(stage(documentOfOverlaps(1)).notices()).toEqual([])
  })
})

// ===========================================================================
// 6. D-271 -- the screen road: 「達したことを…人に通知すること（MUST）」
// ===========================================================================

describe('ST-7 (MUST) -- a row that reaches the valve is TOLD, not merely stopped', () => {
  it('⭐⭐ a document past the cap puts a telling carrying RS-24 on the screen', async () => {
    // 「達したらそこで処理を止め、達したことを判別できる値で返して人に通知すること
    //  （MUST）」 -- the second verb. ⛔ D-271: 「段数の安全弁に達しても、人に何も
    // 告げない」, measured as 「`grep -rn "RS-24" src/` は 0 件」.
    const built = stage(documentOfOverlaps(CAP + 1))

    const told = built.notices()
    expect(
      told.length,
      'a row went past the safety valve and the screen said nothing -- ST-7 (MUST) asks for the ' +
        'person to be told, and 表 T-233 の RS-24 is the reason it names',
    ).toBeGreaterThan(0)
    expect(told.some((one) => isTheValve(one, 'ja'))).toBe(true)
  })

  it('and it follows NT-3a: the manner is the row’s, and a next step travels with it', () => {
    // 表 T-233 gives `RS-24` the manner `NT-3a`, and `NT-3a` reads 「**次に取れる
    // 手段を添えること（MUST）**」「失敗したことだけを伝えて手段を示さない通知を出
    // してはならない（MUST NOT）」.
    const told = stage(documentOfOverlaps(CAP + 1))
      .notices()
      .find((one) => isTheValve(one, 'ja'))

    expect(told, 'no telling carried RS-24, so its manner cannot be read').toBeDefined()
    expect(told?.manner).toBe(MANNER_OF_RS_24)
    expect(
      told?.nextSteps ?? [],
      'NT-3a (MUST NOT): a failure told with no next step',
    ).toContain(wordsFor(RS_24).nextStep.ja)
  })

  it('⭐ the boundary: exactly at S-89 nothing is told, and one stack past it something is', () => {
    // 「安全弁の値（`S-89`）は「許される段数の上限」であること（MUST）」 -- so a
    // telling that stood AT the cap would be as wrong as one that never stands.
    expect(
      stage(documentOfOverlaps(CAP)).notices(),
      'the screen told the person about a row that stacked exactly to the cap, which ST-7 allows',
    ).toEqual([])
    expect(stage(documentOfOverlaps(CAP + 1)).notices().length).toBeGreaterThan(0)
  })

  it('⭐ the words follow the display language, so a ROW travelled and not a sentence', () => {
    // ⛔ WITHOUT THIS, a loop that wrote the Japanese sentence at the point it
    // raises would pass every case above. FR-038 (MUST NOT) keeps the words in
    // one dictionary and the row id is the join.
    const told = stage(documentOfOverlaps(CAP + 1), 'en').notices()
    expect(told.some((one) => isTheValve(one, 'en'))).toBe(true)
  })
})

// ===========================================================================
// 7. D-345 -- 「通知先を画面を描く経路に限ってはならない（MUST NOT）」
// ===========================================================================
//
// ⭐ HOW THE TWO ROADS ARE TOLD APART. A telling left standing from the screen
// road would make an export road that says nothing look like one that speaks, so
// every case here takes the standing tellings down with `SK-19` FIRST and then
// exports. ⛔ That is the MUST NOT read literally: a build whose only raiser is
// the drawing road has nothing left to say once its telling has been dismissed.

describe('ST-7 (MUST NOT) -- the telling is not the screen road’s alone', () => {
  it('the premise: SK-19 does take the screen road’s telling down', async () => {
    // ⛔ WITHOUT THIS, every case below would pass on a screen that simply
    // cannot be quietened, and none of them would be about the export road.
    const built = stage(documentOfOverlaps(CAP + 1))
    expect(built.notices().length).toBeGreaterThan(0)

    await built.clearNotices()

    expect(
      built.notices(),
      'SK-19 (MUST): 「出ている通知があるときは、それを 1 つ消すこと」 -- the tellings would not go down',
    ).toEqual([])
  })

  it('⭐⭐ the premise that makes the two roads two: a dismissed telling does not come back on its own', async () => {
    // ⛔ WITHOUT THIS, EVERY CASE BELOW WOULD BE VACUOUS. A drawing road that
    // raised the valve on every frame would put `RS-24` back up during the
    // frames an export runs, and the export road could stay silent unnoticed.
    // ⭐ `SK-17` 「等倍へ戻す」 is driven because it makes frames and exports
    // nothing, so what it measures is the drawing road alone.
    const built = stage(documentOfOverlaps(CAP + 1))
    await built.clearNotices()

    await built.press(keyOf('SK-17'))

    expect(
      built.notices().some((one) => isTheValve(one, 'ja')),
      'the drawing road puts RS-24 back up on every frame, so the export cases below cannot tell ' +
        'the two roads apart -- report them rather than believe them',
    ).toBe(false)
  })

  it('⭐⭐ IO-6: after the picture goes to the clipboard, the valve is told again', async () => {
    // 「絵を書き出す経路（`FR-080`）で達したときも、書き出しを終えたあとで同じ通知
    //  を画面に上げること（MUST）」, and `FR-025`: 「`IO-6`（クリップボード）の入口
    //  は 表 T-109 の `IC-3` とし、選択面を開かずに直ちに送ること（MUST）」.
    const built = stage(documentOfOverlaps(CAP + 1))
    await built.clearNotices()

    await built.take('IC-3')

    expect(
      built.clipped.length,
      'IC-3 sent nothing to the clipboard, so no export finished and this case measured nothing',
    ).toBeGreaterThan(0)
    expect(
      built.notices().some((one) => isTheValve(one, 'ja')),
      'the picture left by IO-6 with a row past the safety valve and the person was told nothing ' +
        'afterwards -- ST-7 (MUST NOT) forbids the telling being the drawing road’s alone',
    ).toBe(true)
  })

  it('⭐ IO-6 control: a document under the cap sends the picture and tells nobody', async () => {
    // ⛔ THE CASE THAT KEEPS THE ONE ABOVE FROM PASSING ON AN EXPORT THAT SHOUTS
    // EVERY TIME. `RS-24`'s 場面 is 「安全弁に達した」 and nothing else.
    const built = stage(documentOfOverlaps(CAP))
    await built.clearNotices()

    await built.take('IC-3')

    expect(built.clipped.length).toBeGreaterThan(0)
    expect(
      built.notices().some((one) => isTheValve(one, 'ja')),
      'IO-6 told the person the valve was reached on a document that stacked exactly to the cap',
    ).toBe(false)
  })

  it('⭐ IO-6: the words are the dictionary’s in English too', async () => {
    const built = stage(documentOfOverlaps(CAP + 1), 'en')
    await built.clearNotices()

    await built.take('IC-3')

    expect(built.notices().some((one) => isTheValve(one, 'en'))).toBe(true)
  })

  it('⭐⭐ IO-3: after the picture is written to a file, the valve is told again', async () => {
    // The other half of 「絵を書き出す経路」: 表 T-024's `IO-3` is the SVG a person
    // saves, reached through `FR-096`'s one entrance (`SK-12`) and its chooser.
    const built = stage(documentOfOverlaps(CAP + 1))
    await built.press(SK_12)
    await built.clearNotices()

    await built.takeFormat('IO-3')

    expect(
      built.written.length,
      'choosing IO-3 wrote no file, so no export finished and this case measured nothing',
    ).toBeGreaterThan(0)
    expect(
      built.notices().some((one) => isTheValve(one, 'ja')),
      'a picture was written to a file with a row past the safety valve and the person was told ' +
        'nothing afterwards -- ST-7 (MUST)',
    ).toBe(true)
  })

  it('⭐ IO-3 control: a document under the cap writes the picture and tells nobody', async () => {
    const built = stage(documentOfOverlaps(CAP))
    await built.press(SK_12)
    await built.clearNotices()

    await built.takeFormat('IO-3')

    expect(built.written.length).toBeGreaterThan(0)
    expect(
      built.notices().some((one) => isTheValve(one, 'ja')),
      'IO-3 told the person the valve was reached on a document that stacked exactly to the cap',
    ).toBe(false)
  })
})
