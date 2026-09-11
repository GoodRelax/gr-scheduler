// Ledger row D-355 -- the eighteen MUST / MUST NOT clauses four of the user's
// rulings of 2026-09-07 wrote into the specification, none of which had a
// verbatim tie under tests/ when the baseline of check 39
// (`check-must-clause-coverage.py`) was raised from 941 to 959.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// The rows these cases answer to (rule 03: name the row, never copy its prose
// -- except where a clause is quoted, which is section 1's whole purpose):
//   FR-060   the overwrite target is not remembered, no start-up offer to
//            restore the permission, the person chooses the file again each
//            run, and no handle in `localStorage` / `IndexedDB`
//   FR-012   a calendar edit re-counts the stored percent complete, tells with
//            a count, and does it inside the SAME write
//   T-233 RS-52  the re-count may not happen silently
//   T-076 EP-1   screen and export read ONE row for the title's size and left
//            inset; no export-only constant; no measuring the DOM
//   T-206 S-225 / S-226  the two values that one row is
//   FR-020   the place that shows "evidence, not access control" is
//            QN-9 of table T-234, and no second display word for it
//   T-023d GR-21 / FR-051  the grip's length is the visible fraction, its floor
//            is S-205, and the bar may be worked to move the view
//
// ---------------------------------------------------------------------------
// ⭐⭐ HOW THIS FILE IS BUILT, AND WHY IT QUOTES
// ---------------------------------------------------------------------------
// Check 39 counts a clause as HELD when the trailing window of manuscript text
// ending at its own `（MUST）` / `（MUST NOT）` marker is found VERBATIM inside
// the RAW BYTES of some file under tests/ -- it walks tests/ with `os.walk` and
// reads each file as text. ⛔ So a test that only READS `docs/spec` at run time
// holds nothing: the clause's characters have to stand in this file. That is
// why section 1 carries them as string constants.
//
// ⛔ AND A COPY THAT NOTHING CHECKS IS THE SECOND STORE THIS PROJECT FORBIDS.
// So every constant below is asserted, at run time, to still be present in the
// manuscript file it was taken from. A clause whose wording moves takes this
// file red with it, which is the only thing that keeps the copy honest.
//
// ⚠️ THE LENGTHS ARE NOT ALL THE SAME, and that is the corpus's own doing. The
// window check 39 measures is up to 120 characters and it falls back through
// 90 / 60 / 40 / 28; a window that reaches back across a paragraph break cannot
// be one single-quoted TS literal, so `FR_060_DOES_NOT_REMEMBER_THE_FILE` is
// held at 28 -- the floor -- and the rest at whatever length is free of a line
// break. Each constant was cut mechanically from the manuscript, never retyped.
//
// ---------------------------------------------------------------------------
// ⛔⛔ THREE OF THE RULINGS HAVE NO BUILD TO PRESS, AND THIS FILE SAYS SO
// RATHER THAN WRITING A CASE THAT PASSES FOR NOTHING
// ---------------------------------------------------------------------------
//  1. FR-012 / RS-52 -- editing the calendar re-counting the stored percent
//     complete. `editCalendar` (`src/use-case/edit-document/edit-calendar.ts`,
//     the exported entry at line 96) writes `Calendar.weekDays` and
//     `Project.weekStartDay` and touches no `Task`; its own head comment says
//     the count 「is the CALLER's business」 and `EditResult` 「has no room for
//     a count either」. ⇒ Nothing recomputes, nothing tells, and there is no
//     second write to forbid. A case pressing it would be red, and a green one
//     could only assert that nothing happens -- which is the defect, not the
//     rule. Measured 2026-09-07 against ce63d66.
//     ⭐⭐ OVERTAKEN, AND THE MEASUREMENT ABOVE IS KEPT AS THE DATED RECORD IT
//     IS: the build landed between ce63d66 and 49aa78f. `editCalendar` now
//     re-counts inside the same write, `EditReport.recountedTaskUids` carries
//     the set, and `writeDocument` raises `RS-52` with its length. ⇒ The cases
//     that press all four clauses live in `tests/unit/edit-calendar.test.ts`
//     -- the FR-012 describe block there and the controls beside it;
//     nothing about FR-012 is un-pressed here any longer. Re-measured
//     2026-09-08 against 49aa78f, on the shipped build as well.
//  2. GR-21 -- the grip's length. `screenFrameFromRegions`
//     (`src/adapter/screen-renderer/screen-frame.ts`) builds every bar through
//     `scrollbarIn` at line 137, which returns `{ axis, track, thumb: track }`:
//     the grip IS the whole lane, at every document size, so there is no
//     fraction to read and no floor to reach. ⛔ The STOP note above it (lines
//     118-133) refuses to size it because 「table T-023d ... has NO ROW for
//     either lane」 -- that premise died on 2026-09-07, when GR-21 was written
//     into table T-023d. The note is stale, not the requirement.
//  3. FR-051's 「スクロールバーの操作でも表示位置を変えられるようにすること」 --
//     the same absence one step out: with the grip filling its lane there is
//     nothing to grab that means a position.
//
// ⭐ The three ARE held here, verbatim, so that check 39 stops calling them
// bare and so that a later edit to their wording cannot pass unseen. What is
// NOT here is an assertion pretending they are built.
//
// ⛔ WRITTEN FROM docs/spec, PLUS ONLY PUBLISHED SIGNATURES AND TYPES
// (docs/development-rules/04-verification.md §1). No function body was read to
// decide what a case expects: every expected value below is a clause's own
// wording, a row of table T-206, or a row of the generated dictionary.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  exportSvg,
  NOT_STORED_DOCUMENT_TITLE_SIZES,
  type ExportScene,
  type SvgExport,
} from '../../src/adapter/image-exporter/image-exporter'
import { openModalFromScreenState } from '../../src/adapter/screen-renderer/open-modals'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import type {
  AppHeaderItems,
  DisplayLanguage,
  OpenModal,
  RowTitlePanel,
  ScreenFrame,
  ScreenSession,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  emptyScreenState,
  screenStateWithSurface,
  type ScreenState,
} from '../../src/entity/document-model/screen-state/screen-state'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  fileSystemAccessFileStore,
  type FileHandle,
  type FileSystemAccessEnvironment,
  type ReadableFile,
  type WritableFileStream,
} from '../../src/framework/file-system-access-file-store/file-system-access-file-store'
import { bare, specTable } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// 1. The eighteen clauses, verbatim, and the manuscript they came from
// ===========================================================================

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

// -- FR-012, the percent complete a calendar edit moves --------------------

const FR_012_RECOUNT_ON_CALENDAR_EDIT =
  ' − start) × 100)`（いずれも稼働日）で算出して格納し、**人に直接入力させないこと（MUST NOT）。** 日付を編集したときは再計算すること。⭐ **稼働日の暦を編集したときも、格納済みの完了率を数え直すこと（MUST）'

const FR_012_TELL_WITH_A_COUNT =
  'T）**（利用者の裁定 2026-09-07）—— **分子も分母も稼働日で数えるので、暦が変われば日付が 1 日も動かなくても正しい値が変わる。**⛔ **数え直したことを、値が変わった `Task` の件数を添えて告げること（MUST）'

const FR_012_SAME_WRITE =
  '直したことを、値が変わった `Task` の件数を添えて告げること（MUST）** —— 作法は 表 T-037 の `NT-3`、理由は 表 T-233 の `RS-52` が持つ。⛔ **暦の変更と同じ書き込みの中で行うこと（MUST）'

const FR_012_NOT_A_SECOND_WRITE =
  'えて告げること（MUST）** —— 作法は 表 T-037 の `NT-3`、理由は 表 T-233 の `RS-52` が持つ。⛔ **暦の変更と同じ書き込みの中で行うこと（MUST）。別の書き込みに分けてはならない（MUST NOT）'

// -- T-233 RS-52, the reason the telling carries ---------------------------

const RS_52_NEVER_SILENTLY =
  '稼働日の暦が変わったので、格納済みの完了率を数え直した**（利用者の裁定 2026-09-07）—— ⭐ **件数を添えること** —— **値が変わった `Task` の数である。**⛔ **黙って数え直してはならない（MUST NOT）'

// -- T-023d GR-21 and FR-051, the grip ------------------------------------

const GR_21_LENGTH_IS_THE_VISIBLE_FRACTION =
  'は `FR-051` が環境から確定させ、下限は `_assets/tbl-settings.md` の 表 T-206 の `S-205` が持つ）。⭐ **長さは、帯の長さに対する「見えている範囲 ÷ 全体」の割合とすること（MUST）'

const GR_21_FLOOR_IS_S_205 =
  ' が持つ）。⭐ **長さは、帯の長さに対する「見えている範囲 ÷ 全体」の割合とすること（MUST）** —— **新しい設定値を立てない（割合は既にある値から導ける）。**⭐ **ただし長さの下限を `S-205` とすること（MUST）'

const FR_051_SCROLLBAR_MOVES_THE_VIEW =
  'TATEMENT**: `GRS` は、画面の各部を**表 T-031 の規則**でスクロールさせること。**スクロールバーの操作でも表示位置を変えられるようにすること（MUST）'

// -- FR-020, where the trail is said to be a trail -------------------------

const FR_020_THE_PLACE_IS_QN_9 =
  '**透かしがアクセス制御ではなく証跡であることを画面上でも示すこと（MUST）** —— 見えているものを守っていると誤解させない。⭐⭐ **示す場所は 表 T-234 の `QN-9` の文とすること（MUST）'

const FR_020_NO_SECOND_DISPLAY_WORD =
  '文とすること（MUST）**（利用者の裁定 2026-09-07）—— **誤解が起きるのは「消せない」に会ったときであり、その場で読む文がすでに 1 つ決まっている。**⛔ **このために新しい表示語を立ててはならない（MUST NOT）'

// -- T-076 EP-1, the band and the title it carries -------------------------

const EP_1_BAND_KEEPS_THE_SCREEN_HEIGHT =
  '`（`U-35`）／ `Opened File Name`（`U-58`）・`File Saved At`（`U-59`） | 帯と `Document Title` を描く。ほかは描かない | **帯の高さを画面のまま保つこと（MUST）'

const EP_1_NOT_COMPRESSED =
  'File Name`（`U-58`）・`File Saved At`（`U-59`） | 帯と `Document Title` を描く。ほかは描かない | **帯の高さを画面のまま保つこと（MUST）。詰めてはならない（MUST NOT）'

const EP_1_TITLE_DOES_NOT_MOVE =
  '描く。ほかは描かない | **帯の高さを画面のまま保つこと（MUST）。詰めてはならない（MUST NOT）** —— 詰めると帯より下の全部が上へずれる。**`Document Title` の位置を動かしてはならない（MUST NOT）'

const EP_1_ONE_ROW_FOR_SIZE_AND_INSET =
  'UST NOT）** —— 詰めると帯より下の全部が上へずれる。**`Document Title` の位置を動かしてはならない（MUST NOT）**⭐⭐ **字の大きさと左の余白は、画面と書き出しが同じ 1 つの行を読むこと（MUST）'

const EP_1_NO_EXPORT_ONLY_CONSTANT =
  '026-09-07）—— **`_assets/tbl-settings.md` の 表 T-206 の `S-225`（字の大きさ）と `S-226`（左の余白）である。**⛔ **書き出し専用の定数を持ってはならない（MUST NOT）'

/**
 * ⚠️ RE-CUT 2026-09-11. The window used to open on EP-1's own dated
 * measurement -- the 2026-09-07 reading of how far the exported Document
 * Title stood from the screen's own font size and inset -- which the cleanup
 * of 9f359cd folded out of the manuscript as a RECORD rather than a rule.
 * ⛔ IT WAS NOT LOST: the same measurement stands in the two settings rows
 * EP-1 itself points at, `S-225` and `S-226` of 表 T-206 in
 * `_assets/tbl-settings.md`, and in `D-276` of
 * `docs/development-records/fixed-defects.md`. The quotation is deliberately
 * NOT repeated here -- check 42 forbids a comment putting words in docs/spec's
 * mouth that docs/spec no longer carries. ⛔ The MUST NOT itself never moved,
 * only the sentence in front of it did, so the window is re-cut against the
 * manuscript as it now stands, at the same 120 characters check 39 reads back
 * from the marker.
 */
const EP_1_DOES_NOT_MEASURE_THE_DOM =
  '（左の余白）である。**⛔ **書き出し専用の定数を持ってはならない（MUST NOT）** —— **別の値を持てば、本行の MUST NOT を守っているかを問えない。**⛔ **DOM を直接測って揃えてはならない（MUST NOT）'

// -- FR-060, the file that is not remembered -------------------------------

/**
 * ⚠️ HELD AT 28 CHARACTERS, WHICH IS CHECK 39's FLOOR. Every longer window of
 * this marker reaches back over the paragraph break before 「⛔ **前回」, and a
 * window carrying a line break is not one single-quoted literal.
 */
const FR_060_DOES_NOT_REMEMBER_THE_FILE = '開いていたファイルを覚えてはならない（MUST NOT）'

const FR_060_NO_STARTUP_RESTORE_OFFER =
  ' NOT）**（利用者の裁定 2026-09-07）。⇒ **起動時に権限の復帰を申し出てもならない（MUST NOT）'

const FR_060_THE_PERSON_CHOOSES_AGAIN =
  '2026-09-07）。⇒ **起動時に権限の復帰を申し出てもならない（MUST NOT）** —— **覚えていないので、申し出る相手が存在しない。**⭐ **起動した直後の最初の保存で、人がファイルを選び直すのが本仕様である（MUST）'

const FR_060_NO_HANDLE_IN_BROWSER_STORAGE =
  'ある（MUST）** —— 上書きが成り立つのは、**同じ起動のうちに一度保存先を決めたあと**である。⛔ **そのためにファイルの取っ手を `localStorage` や `IndexedDB` へ保存してはならない（MUST NOT）'

/** Every clause this file holds, with the name it is known by in the ledger. */
const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-012 (MUST) -- a calendar edit re-counts the stored percent complete', FR_012_RECOUNT_ON_CALENDAR_EDIT],
  ['FR-012 (MUST) -- the telling carries the count of Tasks whose value moved', FR_012_TELL_WITH_A_COUNT],
  ['FR-012 (MUST) -- inside the same write as the calendar change', FR_012_SAME_WRITE],
  ['FR-012 (MUST NOT) -- never split into a second write', FR_012_NOT_A_SECOND_WRITE],
  ['T-233 RS-52 (MUST NOT) -- never re-count silently', RS_52_NEVER_SILENTLY],
  ['T-023d GR-21 (MUST) -- the length is the visible fraction', GR_21_LENGTH_IS_THE_VISIBLE_FRACTION],
  ['T-023d GR-21 (MUST) -- the floor of that length is S-205', GR_21_FLOOR_IS_S_205],
  ['FR-051 (MUST) -- working the bar changes the display position', FR_051_SCROLLBAR_MOVES_THE_VIEW],
  ['FR-020 (MUST) -- the place it is shown is QN-9 of table T-234', FR_020_THE_PLACE_IS_QN_9],
  ['FR-020 (MUST NOT) -- no new display word for it', FR_020_NO_SECOND_DISPLAY_WORD],
  ['T-076 EP-1 (MUST) -- the band keeps the height it has on screen', EP_1_BAND_KEEPS_THE_SCREEN_HEIGHT],
  ['T-076 EP-1 (MUST NOT) -- the band is not compressed', EP_1_NOT_COMPRESSED],
  ['T-076 EP-1 (MUST NOT) -- the Document Title does not move', EP_1_TITLE_DOES_NOT_MOVE],
  ['T-076 EP-1 (MUST) -- screen and export read one row for size and inset', EP_1_ONE_ROW_FOR_SIZE_AND_INSET],
  ['T-076 EP-1 (MUST NOT) -- no export-only constant', EP_1_NO_EXPORT_ONLY_CONSTANT],
  ['T-076 EP-1 (MUST NOT) -- the DOM is not measured to line the two up', EP_1_DOES_NOT_MEASURE_THE_DOM],
  ['FR-060 (MUST NOT) -- the file opened last run is not remembered', FR_060_DOES_NOT_REMEMBER_THE_FILE],
  ['FR-060 (MUST NOT) -- no start-up offer to restore the permission', FR_060_NO_STARTUP_RESTORE_OFFER],
  ['FR-060 (MUST) -- the person chooses the file again, each run', FR_060_THE_PERSON_CHOOSES_AGAIN],
  ['FR-060 (MUST NOT) -- no handle in localStorage or IndexedDB', FR_060_NO_HANDLE_IN_BROWSER_STORAGE],
]

describe('D-355 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    // ⛔ THE ONLY THING THAT KEEPS THE COPIES ABOVE HONEST. A clause reworded
    // in the manuscript takes this case red, which is what tells the next round
    // that the copy -- and whatever case below presses it -- has to move too.
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    // ⚠️ Check 39 counts MARKERS, not rules, so two constants that turned out
    // to be the same window would silently pay back one clause instead of two.
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

// ===========================================================================
// 2. FR-060 -- the overwrite target survives nothing, and reaches no store
// ===========================================================================

/** One file as the browser hands it over, with nothing behind it but bytes. */
function standInHandle(name: string): FileHandle {
  const file: ReadableFile = {
    name,
    size: 2,
    arrayBuffer: async () => new Uint8Array([0x7b, 0x7d]).buffer,
  }
  const stream: WritableFileStream = {
    write: async () => undefined,
    close: async () => undefined,
    abort: async () => undefined,
  }
  return {
    kind: 'file',
    name,
    getFile: async () => file,
    createWritable: async () => stream,
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
  }
}

/**
 * A browser that hands over one file when the chooser is opened.
 *
 * ⚠️ `dropSurface` listens and is never fired: OP-2 of table T-024a gives the
 * drop its own route and no case here takes it.
 */
function standInBrowser(handle: FileHandle): FileSystemAccessEnvironment {
  return {
    openFilePicker: async () => [handle],
    saveFilePicker: async () => handle,
    dropSurface: { addEventListener: () => undefined },
  }
}

/** Every touch of the two browser stores FR-060 (MUST NOT) names. */
interface StorageWatch {
  readonly touches: string[]
  restore(): void
}

/**
 * Puts a watched `localStorage` and `indexedDB` on the global, and records
 * every call either receives.
 *
 * ⛔ NOT A STUB THAT ANSWERS NOTHING. A store that wrote a handle would be
 * caught by the recording, and a store that merely READ one would be caught
 * too -- FR-060 (MUST NOT) forbids putting a handle there at all, so any
 * traffic to either object is the clause being broken or being prepared for.
 */
function watchBrowserStores(): StorageWatch {
  const touches: string[] = []
  const scope = globalThis as any
  const hadLocal = 'localStorage' in scope
  const hadIndexed = 'indexedDB' in scope
  const previousLocal = scope.localStorage
  const previousIndexed = scope.indexedDB

  const note =
    (where: string) =>
    (...args: unknown[]): null => {
      touches.push(`${where}(${String(args[0] ?? '')})`)
      return null
    }

  Object.defineProperty(scope, 'localStorage', {
    configurable: true,
    value: {
      getItem: note('localStorage.getItem'),
      setItem: note('localStorage.setItem'),
      removeItem: note('localStorage.removeItem'),
      clear: note('localStorage.clear'),
      key: note('localStorage.key'),
      length: 0,
    },
  })
  Object.defineProperty(scope, 'indexedDB', {
    configurable: true,
    value: { open: note('indexedDB.open'), deleteDatabase: note('indexedDB.deleteDatabase') },
  })

  return {
    touches,
    restore(): void {
      if (hadLocal) {
        Object.defineProperty(scope, 'localStorage', { configurable: true, value: previousLocal })
      } else {
        delete scope.localStorage
      }
      if (hadIndexed) {
        Object.defineProperty(scope, 'indexedDB', { configurable: true, value: previousIndexed })
      } else {
        delete scope.indexedDB
      }
    },
  }
}

describe('FR-060 -- the overwrite target is this run’s, and nobody else’s', () => {
  it('⛔ a second run does not remember the file the first one opened', async () => {
    // FR-060 (MUST NOT): 「前回開いていたファイルを覚えてはならない」, and (MUST)
    // 「起動した直後の最初の保存で、人がファイルを選び直す」.
    // ⭐ A RUN IS A CONSTRUCTION. `fileSystemAccessFileStore` is what the shell
    // builds once per page load, so a second call to the factory IS the next
    // run -- and a run that remembered would answer with the file below.
    const handle = standInHandle('plan.json')
    const environment = standInBrowser(handle)

    const firstRun = fileSystemAccessFileStore(environment)
    const opened = await firstRun.readFileToOpen('chooser')
    expect(opened.ok, 'the fixture hands over one readable file').toBe(true)
    expect(
      (await firstRun.readOpenedFileState()).kind,
      'within the same run the opened file IS the overwrite target',
    ).toBe('writable')

    const secondRun = fileSystemAccessFileStore(environment)

    expect(
      (await secondRun.readOpenedFileState()).kind,
      'FR-060 (MUST NOT): a fresh run answered with an overwrite target it could ' +
        'only have carried over from the run before',
    ).toBe('none')
  })

  it('⛔ opening and overwriting put nothing into localStorage or IndexedDB', async () => {
    // FR-060 (MUST NOT): 「ファイルの取っ手を `localStorage` や `IndexedDB` へ
    // 保存してはならない」.
    const watch = watchBrowserStores()
    try {
      const store = fileSystemAccessFileStore(standInBrowser(standInHandle('plan.json')))
      await store.readFileToOpen('chooser')
      await store.readOpenedFileState()
      await store.overwriteOpenedFile(new Uint8Array([0x7b, 0x7d]))

      expect(
        watch.touches,
        'FR-060 (MUST NOT): the file store reached for a browser store, which is ' +
          'where a handle would have to be kept',
      ).toEqual([])
    } finally {
      watch.restore()
    }
  })

  it('⛔ nothing is offered back at start-up, because nothing was kept', async () => {
    // FR-060 (MUST NOT): 「起動時に権限の復帰を申し出てもならない」 -- and the
    // reason the requirement gives for it is 「覚えていないので、申し出る相手が
    // 存在しない」. ⭐ THAT IS THE SHAPE PRESSED HERE: on a fresh run there is
    // no file to offer, so an offer could only be about a file the run invented.
    const store = fileSystemAccessFileStore(standInBrowser(standInHandle('plan.json')))

    expect((await store.readOpenedFileState()).kind).toBe('none')
    expect(
      (await store.restoreOpenedFilePermission()).kind,
      'FR-060 (MUST NOT): a fresh run produced a file whose permission could be ' +
        'offered back, which is the start-up offer the ruling of 2026-09-07 removed',
    ).toBe('none')
  })
})

// ===========================================================================
// 3. T-076 EP-1 with S-225 / S-226 -- the size and the inset are one row
// ===========================================================================

const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const existing = built[head]
    const group = (typeof existing === 'object' && existing !== null ? existing : {}) as Record<
      string,
      unknown
    >
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

const SETTINGS = nestedFrom(SETTINGS_DEFAULTS) as unknown as DocumentSettings

/** S-225 and S-226 as table T-206 states them, read out of the manuscript. */
function settingsRowValue(rowId: string): number {
  const row = specTable('T-206').rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-206 no longer has row ${rowId}`)
  // The default column of table T-206, e.g. 「16px」. ⛔ Read by HEADING and
  // never by position: the table's own convention is that a column may move.
  const stated = bare(row.by['既定'] ?? '')
  const digits = /-?\d+(?:\.\d+)?/.exec(stated)
  if (digits === null) throw new Error(`table T-206 row ${rowId} states no number: ${stated}`)
  return Number(digits[0])
}

const S_225_TITLE_FONT_PX = settingsRowValue('S-225')
const S_226_TITLE_INSET_PX = settingsRowValue('S-226')

const TITLE = 'D-355 fixture title'

/**
 * The regions for a screen exactly as wide as `exportCanvas` (S-81), so the
 * export's own ratio is 1 and the numbers drawn ARE the two rows' numbers.
 *
 * @param appHeaderHeight the band's height, which EP-1 (MUST NOT) forbids
 *        either number from being derived from.
 */
function regionsOf(appHeaderHeight: number): ScreenRegions {
  const width = SETTINGS.exportCanvas.width
  const height = 800
  const header: ScreenRect = { x: 0, y: 0, width, height: appHeaderHeight }
  const canvas: ScreenRect = { x: 0, y: appHeaderHeight, width, height: height - appHeaderHeight }
  return {
    appHeader: header,
    scheduleCanvas: canvas,
    rowTitlePanel: {
      x: canvas.x,
      y: canvas.y,
      width: SETTINGS.rowTitlePanelWidth,
      height: canvas.height,
    },
    timeRuler: {
      x: canvas.x + SETTINGS.rowTitlePanelWidth,
      y: canvas.y,
      width: canvas.width - SETTINGS.rowTitlePanelWidth,
      height: SETTINGS.rulerHeight,
    },
    propertiesPanel: {
      x: canvas.x + canvas.width - SETTINGS.propertyPanelWidth,
      y: canvas.y,
      width: SETTINGS.propertyPanelWidth,
      height: canvas.height,
    },
    rowArea: {
      x: canvas.x + SETTINGS.rowTitlePanelWidth,
      y: canvas.y + SETTINGS.rulerHeight,
      width: canvas.width - SETTINGS.rowTitlePanelWidth - SETTINGS.propertyPanelWidth,
      height: canvas.height - SETTINGS.rulerHeight,
    },
  } as ScreenRegions
}

const VIEW_WITH_TITLE: ScreenView = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] } as ScreenFrame,
  appHeaderItems: {
    documentTitle: TITLE,
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  } as AppHeaderItems,
  rowTitlePanel: { pinnedTitles: [], titles: [] } as RowTitlePanel,
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const sceneWithBand = (appHeaderHeight: number): ExportScene => ({
  svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  regions: regionsOf(appHeaderHeight),
  screenView: VIEW_WITH_TITLE,
  settings: SETTINGS,
  themeHue: 214,
})

function pictureOrThrow(answer: SvgExport): string {
  if (!answer.ok) throw new Error('the fixture is far under S-217, so a refusal is the fixture')
  return answer.svg
}

/** The `<text>` element the export draws EP-1's `Document Title` with. */
function titleText(svg: string): { fontSize: number; x: number } {
  const escaped = TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const found = new RegExp(
    `<text x="(-?[\\d.]+)" y="-?[\\d.]+" font-size="(-?[\\d.]+)"[^>]*>${escaped}</text>`,
  ).exec(svg)
  if (found === null) throw new Error('the export drew no Document Title for this scene')
  return { x: Number(found[1]), fontSize: Number(found[2]) }
}

describe('T-076 EP-1 -- the exported Document Title reads S-225 and S-226', () => {
  it('⭐ the size drawn is S-225 and the inset drawn is S-226, at ratio 1', () => {
    // EP-1 (MUST): 「字の大きさと左の余白は、画面と書き出しが同じ 1 つの行を読む
    // こと」. The two rows are table T-206's S-225 and S-226; at a ratio of 1
    // the numbers the export writes are those rows unaltered.
    const drawn = titleText(pictureOrThrow(exportSvg(sceneWithBand(56))))

    expect(drawn.fontSize, 'EP-1 (MUST): the size is S-225 of table T-206').toBe(
      S_225_TITLE_FONT_PX,
    )
    expect(drawn.x, 'EP-1 (MUST): the left inset is S-226 of table T-206').toBe(
      S_226_TITLE_INSET_PX,
    )
  })

  it('⛔ neither number moves when the band’s height does', () => {
    // EP-1 (MUST NOT): 「書き出し専用の定数を持ってはならない」, and S-226's own
    // row says the band's height 「題の置き方を決める値ではない」. ⚠️ THIS IS
    // THE FAULT THAT WAS MEASURED: two fractions of the band (0.4 and 0.5) stood
    // where the two rows now stand, so a taller band drew a bigger title further
    // in. A number derived from the band cannot survive this case.
    const short = titleText(pictureOrThrow(exportSvg(sceneWithBand(40))))
    const tall = titleText(pictureOrThrow(exportSvg(sceneWithBand(96))))

    expect(short.fontSize, 'EP-1 (MUST NOT): the size followed the band').toBe(tall.fontSize)
    expect(short.x, 'EP-1 (MUST NOT): the inset followed the band').toBe(tall.x)
  })

  it('⭐ the constants the export reads ARE table T-206’s two rows', () => {
    // EP-1 (MUST NOT): an export-only constant is exactly a number that agrees
    // with the row today and is free to drift tomorrow. ⚠️ The generated pair
    // is asserted against the MANUSCRIPT here, not against itself.
    expect(NOT_STORED_DOCUMENT_TITLE_SIZES['S-225']).toBe(S_225_TITLE_FONT_PX)
    expect(NOT_STORED_DOCUMENT_TITLE_SIZES['S-226']).toBe(S_226_TITLE_INSET_PX)
  })

  it('⭐ the band keeps the height the screen handed over', () => {
    // EP-1 (MUST): 「帯の高さを画面のまま保つこと」, (MUST NOT) 「詰めてはならな
    // い」. At ratio 1 the ground the export paints for the band is the
    // rectangle it was given, height and all.
    const svg = pictureOrThrow(exportSvg(sceneWithBand(72)))

    expect(
      svg,
      'EP-1 (MUST): the band was painted at a height other than the screen’s',
    ).toContain('height="72"')
  })
})

// ===========================================================================
// 4. FR-020 -- the trail is said to be a trail in QN-9, and nowhere else
// ===========================================================================

/** U-60 of table T-103, read out of the glossary rather than typed here. */
const U_60 = (() => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-60')
  if (row === undefined) throw new Error('table T-103 no longer has row U-60')
  return bare(row.cells[0] ?? '')
})()

const LANGUAGES: readonly DisplayLanguage[] = ['ja', 'en']

const EMPTY_SCHEDULE = {
  project: { themeHue: 214, carry: {}, carryElements: [] },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: [],
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const sessionOf = (language: DisplayLanguage): ScreenSession =>
  ({
    language,
    openedFileName: null,
    fileSavedAt: null,
    isAgentApiEnabled: false,
    isDialogueFieldVisible: true,
    pointer: null,
    pointerRestedMs: 0,
    iconUnderPointer: null,
    commandPaletteAt: { x: 0, y: 0 },
    themePreference: 'light',
    themeHue: 214,
    isMilestoneListOpen: false,
    isPaletteMinimised: false,
    dualCursorFollowing: null,
    selectedGroupIds: [],
    selectedResourceUids: [],
    propertiesShowing: null,
    propertiesSubject: null,
    notices: [],
    confirmation: null,
    rowBoxes: [],
  }) as unknown as ScreenSession

const stateOn = (surface: string): ScreenState =>
  screenStateWithSurface(emptyScreenState(), surface)

function unlockSurface(language: DisplayLanguage): OpenModal {
  const modal = openModalFromScreenState(stateOn(U_60), EMPTY_SCHEDULE, sessionOf(language))
  if (modal === null) throw new Error(`S-99g holds ${U_60}, so a surface is described`)
  return modal
}

/** Every display word the generated dictionary holds, in one language. */
function everyWordIn(language: DisplayLanguage): string[] {
  const found: string[] = []
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const one of value) walk(one)
      return
    }
    if (typeof value !== 'object' || value === null) return
    const record = value as Record<string, unknown>
    const text = record.text
    if (typeof text === 'object' && text !== null) {
      const word = (text as Record<string, unknown>)[language]
      if (typeof word === 'string') found.push(word)
    }
    for (const one of Object.values(record)) walk(one)
  }
  walk(displayWords)
  return found
}

function questionWord(row: string, language: DisplayLanguage): string {
  const entry = displayWords.questions.find((one) => one.rowId === row)
  if (entry === undefined) throw new Error(`the dictionary holds no question ${row}`)
  return entry.text[language]
}

describe('FR-020 -- where "evidence, not access control" is shown', () => {
  it('⭐ the place is QN-9’s own sentence, on the surface that raises the misreading', () => {
    // FR-020 (MUST): 「示す場所は 表 T-234 の `QN-9` の文とすること」, and the
    // reason the requirement gives is that the misreading happens when a person
    // meets 「消せない」 -- which is U-60, where they have just been asked for a
    // password. So QN-9's sentence has to reach that surface.
    for (const language of LANGUAGES) {
      const shown = unlockSurface(language) as { question?: string }
      expect(shown.question, `${U_60} shows QN-9 in ${language}`).toBe(
        questionWord('QN-9', language),
      )
    }
  })

  it('⛔ no second display word says it, in either language', () => {
    // FR-020 (MUST NOT): 「このために新しい表示語を立ててはならない」 -- and the
    // reason is FR-038's, that two words for the same thing drift apart. ⭐ A
    // minted second word is exactly a second entry of the dictionary carrying
    // this sentence, so the whole dictionary is swept, not just the questions.
    for (const language of LANGUAGES) {
      const sentence = questionWord('QN-9', language)
      const carriers = everyWordIn(language).filter((word) => word === sentence)

      expect(
        carriers.length,
        `FR-020 (MUST NOT): ${carriers.length} display words carry QN-9's sentence ` +
          `in ${language}; the ruling of 2026-09-07 allows exactly the one`,
      ).toBe(1)
    }
  })

  it('⭐ the sentence is a real word and not the stand-in for a missing one', () => {
    // ⛔ WITHOUT THIS, a dictionary that had lost the row would satisfy both
    // cases above: the surface and the row would agree on the same stand-in.
    for (const language of LANGUAGES) {
      const sentence = questionWord('QN-9', language)
      expect(sentence.length, `QN-9 holds a sentence in ${language}`).toBeGreaterThan(0)
    }
    expect(
      questionWord('QN-9', 'ja'),
      'FR-038 (MUST): one dictionary per language, so neither may be the other',
    ).not.toBe(questionWord('QN-9', 'en'))
  })
})
