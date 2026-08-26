// Unit cases for the two surfaces UF-47 `single-html-shell.ts` and UF-48
// `frame-loop.ts` have to put up: the one table T-024a's OP-3 asks its question
// on, and the one FR-096 writes a document out through.
//
// Table T-218 of Chapter 7 (docs/spec/05-07-design.md) gives these their place:
//
//   TS-6 | unit test | no node in the specification | Unit | tests/unit/ | Vitest
//
// ⛔ WRITTEN FROM docs/spec ALONE. `docs/development-rules/04-verification.md`
// section 1 forbids the author of a unit from writing its tests, and forbids
// deriving an expectation from the body under test. What was read of
// `frame-loop.ts` BEFORE these cases were written is its exported declarations
// -- `FrameEnvironment`, `FrameLoop`, `ScreenWiring`, `frameLoop` -- and
// nothing else. Every value asserted below comes from a numbered table, read
// out of the manuscript at read time by `tests/contract/spec-table.ts`
// (Chapter 1.9, :275).
// ⚠️ THE BODY WAS SEARCHED AFTERWARDS, ONCE, and only to name in the handover
// why the red cases are red. Not one expectation was moved onto what was found
// there: section 1 forbids it in as many words, and a case that disagrees with
// the unit is left disagreeing.
//
// WHAT THE CASES ANSWER TO.
//
//   OP-3  of table T-024a: what becomes of the current document is the PERSON'S
//         answer, out of three, and GRS may not settle it (MUST NOT).
//   U-56  of table T-103: the surface that question stands on.
//   IC-71 / IC-72 / IC-73 of table T-109: its three entries.
//   OP-4  of table T-024a: replacing asks before it discards (MUST) and may not
//         discard in silence (MUST NOT); joining is exempt in as many words.
//   U-55  of table T-103 and NT-7 of table T-037: the surface that question
//         stands on, and IC-69 / IC-70 of table T-109, its two answers.
//   OP-9  of table T-024a: what goes into the overlay frame is only what the
//         current document has a `UID` for (MUST).
//   RD-3 / RD-4 of table T-230: where each answer lands, and what becomes of
//         the undo history on the way.
//   CS-4  of table T-066: a file operation that waits for a person collects
//         what it needs BEFORE the wait, shows nothing while waiting (MUST
//         NOT), and lands through `replaceDocument` (MUST).
//   FT-1 / FT-3 of table T-078: the frame that paints a question raised after a
//         wait is the input's own continuation, and a resize during the wait
//         still runs a frame.
//   U-54  of table T-103 and FR-096: the surface a document is written out
//         through, and the name it proposes.
//   FR-076 and table T-233: what a notice carries as its reason -- a row of
//         that table and nothing else (MUST / MUST NOT) -- and table T-037's
//         row that is its manner.
//
// ⚠️ THE LOOP PUBLISHES NEITHER THE HISTORY NOR THE SCREEN STATE, so the only
// currency these cases have is the application's own: press a key or an entry,
// and read what reached `ScreenSurface` and `FileStore`. That is the same road
// tests/unit/uf-47-48.test.ts and tests/unit/uf-48-input.test.ts take.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  ChosenFileWrite,
  FileReading,
  FileStore,
  FileStoreFaultReason,
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
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// The tables, read out of the manuscript rather than copied (Chapter 1.9, :275)
// ---------------------------------------------------------------------------

const T_024: SpecTable = specTable('T-024')
const T_024A: SpecTable = specTable('T-024a')
const T_036: SpecTable = specTable('T-036')
const T_037: SpecTable = specTable('T-037')
const T_103: SpecTable = specTable('T-103')
const T_109: SpecTable = specTable('T-109')
const T_230: SpecTable = specTable('T-230')
const T_233: SpecTable = specTable('T-233')

/**
 * One row of a table, by its ID.
 *
 * @purity pure
 */
function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/**
 * One cell of a row, by the position the table prints it in.
 *
 * ⭐ BY POSITION AND NOT BY HEADING, the way
 * tests/system/mspdi-normalization.sws.test.ts reads the same tables: every
 * heading in these six is Japanese prose, and rule 03 section 5 keeps that out
 * of the tree. The guard describe at the foot of this file pins each table's
 * column count, so a column inserted upstream reaches this file rather than
 * quietly shifting what is read.
 *
 * @purity pure
 */
function cellOf(table: SpecTable, id: string, at: number): string {
  const cells = rowOf(table, id).cells
  const cell = cells[at]
  if (cell === undefined) throw new Error(`table ${table.id} row ${id} has no cell ${at}`)
  return cell
}

/** Table T-103 prints the settled English name first, after the row ID. */
const T_103_NAME = 0
/** Table T-109 prints the surface an entry stands on first, after the row ID. */
const T_109_SURFACE = 0
/**
 * Table T-109 prints the requirement that is the authority for an entry fourth,
 * after the surface, the group and what the entrance is for.
 * ⚠️ NO LONGER LAST: 構え (the row of table T-023b the entrance arms) now stands
 * after it, so the guard describe at the foot of this file pins position 3 by
 * what stands in it rather than by counting from the end.
 */
const T_109_AUTHORITY = 3
/** Table T-024 prints format, direction, extension -- the last two are read here. */
const T_024_DIRECTION = 1
const T_024_EXTENSION = 2
/** Table T-024 prints the first non-blank character after the extension. */
const T_024_FIRST_CHARACTER = 3
/** Table T-230 prints caller, what stands at WS-3, then the history column. */
const T_230_HISTORY = 2
/** Table T-036 prints what the shortcut does, then its assignment. */
const T_036_ASSIGNMENT = 1
/** Table T-233 prints the situation first, then the row of table T-037 that is its manner. */
const T_233_MANNER = 1

/**
 * The settled name table T-103 gives one UI part.
 *
 * @purity pure
 */
function partNameOf(id: string): string {
  const name = bare(cellOf(T_103, id, T_103_NAME))
  if (name === '') throw new Error(`table T-103 row ${id} names no UI part`)
  return name
}

/** U-56 -- the surface OP-3's question stands on. */
const OPEN_CHOOSER = partNameOf('U-56')
/** U-54 -- the surface FR-096 writes a document out through. */
const EXPORT_CHOOSER = partNameOf('U-54')
/** U-55 -- the surface NT-7's question stands on, which OP-4 (MUST) sends the replacement to. */
const CONFIRMATION = partNameOf('U-55')

/**
 * The rows of table T-109 that stand on one surface, in that table's own print
 * order (rule 03 section 4 keeps the manuscript's order).
 *
 * ⚠️ A row may name several surfaces -- IC-52 names every surface IN-4 of table
 * T-028 closes -- so every code span in the cell is read rather than the cell
 * as a whole.
 *
 * @purity pure
 */
function entriesOn(surface: string): readonly string[] {
  return T_109.rows
    .filter((row) =>
      [...(row.cells[T_109_SURFACE] ?? '').matchAll(/`([^`]+)`/g)].some(
        (found) => found[1] === surface,
      ),
    )
    .map((row) => row.id)
}

/**
 * The rows of table T-024 whose direction column carries an out direction --
 * what FR-096 (MUST) has the author choose between.
 *
 * ⚠️ THE ONE PLACE A JAPANESE WORD IS MATCHED, and rule 03 section 5 admits it
 * for exactly this: the direction column is Japanese prose and there is no
 * other join. Table T-024's own note says why the neighbouring columns cannot
 * stand in -- the extension and the first character belong to the two rows OP-1
 * accepts on intake, and the write-only rows carry an em dash in both.
 */
const OUT_DIRECTION = '書出'

/**
 * @purity pure
 */
function outDirectionRows(): readonly string[] {
  return T_024.rows
    .filter((row) => (row.cells[T_024_DIRECTION] ?? '').includes(OUT_DIRECTION))
    .map((row) => row.id)
}

/**
 * The extension table T-024 gives one row, or `null` where it gives none.
 *
 * @purity pure
 */
function extensionOf(id: string): string | null {
  const cell = cellOf(T_024, id, T_024_EXTENSION)
  const found = /`([^`]+)`/.exec(cell)
  return found === null ? null : (found[1] ?? null)
}

/**
 * The first non-blank character table T-024 gives one row, or `null` where it
 * gives none -- which is every row OP-1 does not take in.
 *
 * @purity pure
 */
function firstCharacterOf(id: string): string | null {
  const cell = cellOf(T_024, id, T_024_FIRST_CHARACTER)
  const found = /`([^`]+)`/.exec(cell)
  return found === null ? null : (found[1] ?? null)
}

/**
 * The roster the shell reads table T-024's two joining columns out of.
 *
 * ⭐ READ, NOT TRUSTED. FR-096 (MUST NOT) forbids an extension being written
 * anywhere but table T-024, and this file is generated FROM that table -- so a
 * case that drove the proposed name from it alone would be green on a generator
 * that had drifted. Every case below that uses a value from here is joined back
 * to the table by `the roster of formats agrees with table T-024` at the foot of
 * this file, which is what makes the two one value rather than two.
 */
interface ExchangeFormat {
  readonly rowId: string
  readonly extension: string | null
  readonly firstCharacter: string | null
}

const EXCHANGE_FORMATS: readonly ExchangeFormat[] = (
  JSON.parse(
    readFileSync(
      join(process.cwd(), 'src', 'adapter', 'document-codec', 'exchange-formats.json'),
      'utf8',
    ),
  ) as { formats: ExchangeFormat[] }
).formats

/**
 * FR-038's dictionary, as the manuscript keeps it.
 *
 * ⭐ THE MANUSCRIPT'S COPY AND NOT THE BUILT ONE. `docs/spec/_source/` is where
 * the words are written; `src/adapter/screen-renderer/display-words.json` is
 * printed from it. Rule 04 section 1 has these cases driven from docs/spec, and
 * the two are held together by `npm run words:check`, not by this file.
 *
 * ⚠️ IT IS WHAT LETS A NOTICE BE PINNED TO ONE ROW OF TABLE T-233. `Notice`
 * carries the manner and the WORDS; only `RaisedNotice` carries the reason, and
 * the loop publishes neither its session nor its raised half. So a case reads
 * the row's words out of here and asks whether those are the words that
 * reached the screen.
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

/**
 * The words FR-038's dictionary holds for one row of table T-233.
 *
 * @purity pure
 */
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

/**
 * The row of table T-037 that table T-233 makes one reason's manner.
 *
 * @purity pure
 */
function mannerFor(rowId: string): string {
  const manner = bare(cellOf(T_233, rowId, T_233_MANNER))
  if (manner === '') throw new Error(`table T-233 row ${rowId} names no manner`)
  return manner
}

/**
 * One row of table T-036, spelt as its assignment column spells it.
 *
 * ⭐ Read rather than typed, and taken from tests/unit/uf-47-48.test.ts, which
 * drives the same table for the same reason.
 *
 * @purity pure
 */
function keyOf(id: string): KeyInput {
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

/** SK-10 -- the one entrance FR-087 and OP-2 allow for opening a document. */
const SK_10 = keyOf('SK-10')
/** SK-11 -- saving, which FR-096 (MUST) makes a `GRS JSON` write whatever was opened. */
const SK_11 = keyOf('SK-11')
/** SK-12 -- FR-096's export, which begins with the choice of a format. */
const SK_12 = keyOf('SK-12')
/** SK-6 -- undoing, the only currency a test has for asking what the history holds. */
const SK_6 = keyOf('SK-6')
/** SK-20 -- a write UN-13 of table T-027 makes an undoable step either way round. */
const SK_20 = keyOf('SK-20')

// ---------------------------------------------------------------------------
// The documents these cases drive
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const HERE_ROW = '11111111-1111-4111-8111-111111111111'
const THERE_ROW = '22222222-2222-4222-8222-222222222222'

/**
 * One Task with every column table T-058 gives it named, so that nothing rides
 * in from the bundled template unstated.
 *
 * ⭐ No actual at all: PS-1 of table T-019a, a Task nobody has started. FR-055
 * fits the drawn extent, so an actual nobody asked for moves the zoom every
 * case here stands on.
 *
 * @purity pure
 */
function task(uid: number, start: string, finish: string, name: string): Task {
  return {
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name,
    start,
    finish,
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
 * @purity pure
 */
function row(id: string, label: string): Record<string, unknown> {
  return {
    id,
    parentId: null,
    label,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: false,
    isHidden: false,
    color: null,
    height: null,
  }
}

/**
 * A small valid document: one row, one Task, the calendar and the settings the
 * specification has actually decided (taken from the template FR-027 keeps).
 *
 * ⚠️ The project profile is the template's own in BOTH documents these cases
 * build, so that MG-4 of table T-032 has nothing to ask about -- the ten rows
 * of table T-224 it compares are equal, and OP-3 is the only question left.
 *
 * @purity pure
 */
function documentWith(
  title: string | null,
  rowId: string,
  rowLabel: string,
  uids: readonly number[],
): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        title,
        uidHighWaterMark: 100,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: uids.map((uid) => task(uid, '2026-04-01', '2026-04-10', `Task ${uid}`)),
      resources: [],
      assignments: [],
      taskGroups: [row(rowId, rowLabel)],
      taskGroupMembers: uids.map((uid) => ({ taskUid: uid, groupId: rowId, stackOrder: null })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  return draft as unknown as Document
}

/** What is already open when a case starts. */
const here = (title: string | null = 'Here'): Document =>
  documentWith(title, HERE_ROW, 'Here', [1, 2])

/** What the file hands over. ⚠️ No uid it carries is one the current document has. */
const there = (): Document => documentWith('There', THERE_ROW, 'There', [11, 12])

/**
 * The same file, with ONE `UID` the current document also has.
 *
 * ⭐ OP-9 of table T-024a (MUST) makes the overlay frame hold only what matches
 * by `UID`, so a fixture that matches nothing can only ever show the empty
 * answer. This one is the other side of that row: exactly one of its two tasks
 * is a task `here()` has, so the frame's contents are a stated number rather
 * than "all" or "none".
 */
const HERE_AND_THERE = 1
const overlapping = (): Document =>
  documentWith('There', THERE_ROW, 'There', [HERE_AND_THERE, 12])

const uidsOf = (document: Document): number[] =>
  (document as any).schedule.tasks.map((one: Task) => one.uid).sort((a: number, b: number) => a - b)

const titleOf = (document: Document): string | null =>
  (document as any).schedule.project.title as string | null

const baselineCountOf = (document: Document): number =>
  ((document as any).schedule.baselineTasks as unknown[]).length

const baselineUidsOf = (document: Document): number[] =>
  ((document as any).schedule.baselineTasks as { uid: number }[])
    .map((one) => one.uid)
    .sort((a, b) => a - b)

// ---------------------------------------------------------------------------
// The host
// ---------------------------------------------------------------------------

/**
 * BO-1 of table T-077 has already settled these by the time a loop exists;
 * FR-051 keeps the last two out of the settings because they differ from one
 * machine to the next.
 */
const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly surface: { showSvg(svg: string): void }
  /** Run whatever the loop asked an animation frame for, until it asks for no more. */
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * @purity non-pure
 */
function host(): Host {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  return {
    surface: { showSvg: () => {} },
    runAnimationFrames: () => {
      // Bounded, so a loop that asks for a frame from inside a frame -- which
      // NFR-010 forbids -- ends the case instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  /** What `readScreenPartAt` answers from now on. The case decides; the fake does not. */
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
  screens(): number
}

/**
 * @purity non-pure
 */
function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    screens: () => views.length,
  }
}

interface StoreProbe {
  readonly store: FileStore
  /** Every chosen write the loop asked for, oldest first. */
  readonly written: ChosenFileWrite[]
  /** How many opens are waiting for a file. */
  pendingOpens(): number
  /** Hand one waiting open the text of a file. */
  handOver(text: string, fileName: string): void
  /**
   * Hand one waiting open the BYTES of a file.
   *
   * ⭐ RS-4 of table T-233 is about a byte sequence that is not UTF-8, and CN-5
   * of table T-003 is what makes it one. Text cannot express it: everything
   * this file encodes is UTF-8 by construction.
   */
  handOverBytes(bytes: Uint8Array, fileName: string, ignoredFileCount?: number): void
  /** Answer one waiting open with a fault of the store's, the way IF-3 reports one. */
  failOpen(reason: FileStoreFaultReason): void
}

/**
 * What one case wants the store to do differently.
 *
 * ⛔ The default is a store that works: a case that asks for a fault says so,
 * so that a fault never rides in unnoticed.
 */
interface StoreBehaviour {
  /** Make every chosen write fail with this reason instead of landing. */
  readonly chosenWriteFault?: FileStoreFaultReason
}

/**
 * IF-3's far side, stood in for.
 *
 * ⭐ `readFileToOpen` does NOT answer at once. CS-4 of table T-066 is about the
 * stretch between asking and being answered, so a case has to be able to stand
 * inside it -- which a promise the case resolves gives it and an immediate
 * answer does not.
 *
 * ⚠️ `readOpenedFileState` answers `none`: these documents have never been in a
 * file, which is the state FR-096 speaks of when it says the first save has no
 * destination to overwrite.
 *
 * @purity non-pure
 */
function fileStore(behaviour: StoreBehaviour = {}): StoreProbe {
  const written: ChosenFileWrite[] = []
  const waiting: ((reading: FileReading) => void)[] = []
  const store: FileStore = {
    readFileToOpen: () =>
      new Promise<FileReading>((resolve) => {
        waiting.push(resolve)
      }),
    readOpenedFileState: async () => ({ kind: 'none' }),
    restoreOpenedFilePermission: async () => ({ kind: 'none' }),
    overwriteOpenedFile: async () => ({
      ok: false,
      fault: { reason: 'noOpenedFile', what: 'this document has never been in a file' },
    }),
    writeChosenFile: async (write) => {
      written.push(write)
      if (behaviour.chosenWriteFault !== undefined) {
        return {
          ok: false,
          fault: { reason: behaviour.chosenWriteFault, what: 'the case asked the store to fail' },
        }
      }
      return { ok: true, openedFile: { kind: 'writable', fileName: write.suggestedFileName } }
    },
  }
  const answerOne = (reading: FileReading): void => {
    const answer = waiting.shift()
    if (answer === undefined) {
      throw new Error(
        'OP-2 of table T-024a makes SK-10 the one entrance for opening a document, and ' +
          'taking it asked IF-3 for no file -- so OP-3 has nothing to put a question about',
      )
    }
    answer(reading)
  }
  return {
    store,
    written,
    pendingOpens: () => waiting.length,
    handOver: (text, fileName) => {
      answerOne({ ok: true, file: { bytes: new TextEncoder().encode(text), fileName } })
    },
    handOverBytes: (bytes, fileName, ignoredFileCount) => {
      // ⚠️ THE MEMBER IS LEFT OFF RATHER THAN SET TO NOTHING. `FileReading`
      // makes the count optional and `openDocumentFile` reads its absence as
      // `0`, which is what OP-11 calls an ordinary open -- so a case that does
      // not ask for a caution has to hand over a reading that does not carry
      // the member at all.
      answerOne(
        ignoredFileCount === undefined
          ? { ok: true, file: { bytes, fileName } }
          : { ok: true, file: { bytes, fileName }, ignoredFileCount },
      )
    },
    failOpen: (reason) => {
      answerOne({ ok: false, fault: { reason, what: 'the case asked the store to fail' } })
    },
  }
}

/**
 * Let every promise the loop is waiting on settle.
 *
 * ⚠️ Both kinds are drained: a chain of `await`s inside the loop resolves on
 * the microtask queue, and anything the host defers lands on the macrotask one.
 *
 * @purity non-pure
 */
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

/**
 * Take one entry of table T-109 that stands on an open surface.
 *
 * ⚠️ CS-2 of table T-066 settles the gesture on what was drawn AT THE PRESS, so
 * the surface is told what it has drawn before the button goes down and the
 * release is what the entry answers to.
 *
 * @purity non-pure
 */
function takeEntry(loop: FrameLoop, screen: ScreenPane, surface: string, entry: string): void {
  screen.drawAt({ part: surface, entry, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null })
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  screen.drawAt(null)
}

/**
 * Press one format of table T-024 on the `Export Chooser`.
 *
 * ⭐ A SECOND MEMBER AND NOT AN ENTRY. FR-029 (MUST) makes table T-109 the whole
 * of the icons and it places nothing but IC-52 on U-54 -- FR-096 (MUST NOT)
 * forbids an entrance per format -- so what is pressed here is a row of table
 * T-024, which `ScreenPart.format` is the member for.
 *
 * @purity non-pure
 */
function takeFormat(loop: FrameLoop, screen: ScreenPane, format: string): void {
  screen.drawAt({ part: EXPORT_CHOOSER, entry: null, format, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null })
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  screen.drawAt(null)
}

/**
 * Answer the question NT-7 put up, with one of table T-109's two entries.
 *
 * @purity non-pure
 */
function answerQuestion(loop: FrameLoop, screen: ScreenPane, entry: string): void {
  takeEntry(loop, screen, CONFIRMATION, entry)
}

/**
 * Open a file and stand at the moment OP-3's question is owed.
 *
 * @purity non-pure
 */
async function openAFile(
  loop: FrameLoop,
  pane: Host,
  files: StoreProbe,
  incoming: Document = there(),
): Promise<void> {
  loop.receiveInput(SK_10)
  pane.runAnimationFrames()
  await settle()
  files.handOver(JSON.stringify(incoming), 'there.json')
  await settle()
  pane.runAnimationFrames()
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// ===========================================================================

describe('the documents these cases drive', () => {
  it('are valid GRS JSON documents', () => {
    for (const document of [here(), here(null), there()]) {
      const report = validateDocument(document)
      expect(report.errors).toEqual([])
      expect(report.valid).toBe(true)
    }
  })

  it('share nothing OP-3 does not ask about: no uid is in both, and the profiles are equal', () => {
    // ⛔ A premise, not decoration. FR-022 gathers merge candidates by `UID` and
    // MG-4 of table T-032 asks about the ten rows of table T-224 -- either would
    // put a SECOND question in the way of the one these cases are about.
    expect(uidsOf(here()).filter((uid) => uidsOf(there()).includes(uid))).toEqual([])
    const profile = (document: Document): Record<string, unknown> => {
      const project = { ...((document as any).schedule.project as Record<string, unknown>) }
      delete project['title']
      delete project['uidHighWaterMark']
      return project
    }
    expect(profile(here())).toEqual(profile(there()))
  })
})

// ===========================================================================
// OP-3 of table T-024a -- the three-way question
// ===========================================================================
//
// 「OP-3 | 現在の文書 | **読んだ内容をどう扱うかを人に選ばせること（MUST）** ——
//   **置き換える**（現在の文書を捨てて新しい日程を出す）か、**合流させる**（現在
//   の文書へ足す）か、**重ねる**（`FR-015`。現在の文書を変えずに変更前の予定とし
//   て重ねて描く）かの 3 つとする。**どちらになるかを`GRS` が勝手に決めてはなら
//   ない（MUST NOT）。**」
//
// U-56 of table T-103 names the surface it stands on, and IC-71 / IC-72 / IC-73
// of table T-109 are its three entries.

describe('OP-3 -- reading a file puts the three-way question up', () => {
  it('U-56: taking SK-10 and handing over a file leaves the Open Chooser standing', async () => {
    // 「U-56 | `Open Chooser` | 読んだ内容の扱い方を選ぶ面。選ばせる規則は 表
    //   T-024a の `OP-3`、3 つの入口は表 T-109 の `IC-71` 〜 `IC-73` が持つ」
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)

    expect(
      screen.last().openModal?.surface,
      `OP-3 (MUST): the file was read and no ${OPEN_CHOOSER} stands, so nobody is being asked`,
    ).toBe(OPEN_CHOOSER)
  })

  it('IC-71 / IC-72 / IC-73: the surface carries the entries table T-109 places on it', async () => {
    // 「本表がアイコンの全数である」 -- table T-109's surface column IS the
    // placement (FR-029, MUST), so what stands on U-56 is that table's answer
    // and not the shell's. ⚠️ Read out of the table, in its print order.
    const placed = entriesOn(OPEN_CHOOSER)
    expect(placed, 'table T-109 places nothing on the surface U-56 names').not.toEqual([])

    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)

    const modal = screen.last().openModal
    expect(modal?.commands.map((entry) => entry.icon)).toEqual(placed)
    // FR-029: nothing here is spent or held down -- a person has to be able to
    // take any of the three.
    for (const entry of modal?.commands ?? []) {
      expect(entry.isEnabled, `${entry.icon} is drawn faint`).toBe(true)
      expect(entry.isPressed, `${entry.icon} is drawn as held down`).toBe(false)
    }
  })

  it('OP-3 (MUST NOT): while the question stands, GRS has settled nothing', async () => {
    // 「どちらになるかを`GRS` が勝手に決めてはならない（MUST NOT）」 -- the read
    // content has not replaced, joined or overlaid anything until a person says
    // which.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)

    expect(uidsOf(loop.document())).toEqual([1, 2])
    expect(titleOf(loop.document())).toBe('Here')
    expect(baselineCountOf(loop.document())).toBe(0)
  })
})

// ===========================================================================
// Where each of the three answers lands (table T-230)
// ===========================================================================

describe('OP-3 answered -- table T-230 says where each of the three lands', () => {
  it('IC-71 (RD-4): the read content replaces the current document, once OP-4 has been answered', async () => {
    // 「IC-71 | `Open Chooser` | — | 読んだ内容で現在の文書を置き換える | 表
    //   T-024a の `OP-3`」, and OP-3's first of three is 「置き換える（現在の文書
    //   を捨てて新しい日程を出す）」.
    //
    // ⚠️ TWO PRESSES, NOT ONE, and the second is not decoration: OP-4 (MUST)
    // puts a question between the choice and the discarding, so a case that
    // takes IC-71 and looks straight at the document is looking one answer too
    // early. The describe below drives the question itself.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()
    answerQuestion(loop, screen, 'IC-69')
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual([11, 12])
    expect(titleOf(loop.document())).toBe('There')
  })

  it('IC-71 (RD-4): the history does not come across', async () => {
    // 「RD-4 | `OP-3` の置き換え | `ImportDocument`（`PI-10`） | 捨てる | 入って
    //   きたまま | 積まない | `OP-4` ／ `UN-6`」, and OP-4 states the same thing
    //   as a rule: 「取り消しの履歴は引き継がない」.
    expect(cellOf(T_230, 'RD-4', T_230_HISTORY)).not.toBe(
      cellOf(T_230, 'RD-3', T_230_HISTORY),
    )

    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)
    // SK-20 -- 「基準日線を出す / 消す」, which UN-13 of table T-027 makes an
    // undoable step either way round. It is the currency this file has for
    // asking whether a history is there: the loop publishes neither.
    loop.receiveInput(SK_20)
    pane.runAnimationFrames()

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()
    // OP-4 (MUST) -- the replacement is owed a question before it discards.
    answerQuestion(loop, screen, 'IC-69')
    await settle()
    pane.runAnimationFrames()

    const landed = uidsOf(loop.document())
    expect(landed, 'the replacement never landed, so there is no history to ask about').toEqual([
      11, 12,
    ])
    loop.receiveInput(SK_6)
    pane.runAnimationFrames()

    expect(
      uidsOf(loop.document()),
      'the step written before the open was still there to undo',
    ).toEqual(landed)
  })

  it('IC-72: joining does not throw the current document away', async () => {
    // 「IC-72 | `Open Chooser` | — | 読んだ内容を現在の文書へ合流させる」, and
    // OP-4 says why nothing is confirmed first: 「合流を選んだときは現在の文書を
    // 捨てないので、この確認は要らない」.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-72')
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual(expect.arrayContaining([1, 2]))
  })

  it('IC-72 (RD-3): what was read is added to the current document', async () => {
    // OP-3's second of three is 「合流させる（現在の文書へ足す）」, and RD-3 of
    // table T-230 is where it lands: 「取り込み（合流と重ね） | `ImportDocument`
    //   （`PI-10`） | いまのものを残す | 進める | 表 T-027 に従う」.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-72')
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual([1, 2, 11, 12])
  })

  it('IC-73 (OP-9): overlaying changes neither the schedule nor the current document', async () => {
    // 「OP-9 | **重ねる用途で開いたとき** | **現在の文書を置き換えも合流もしない
    //   こと（MUST NOT）。** …… **合流させず、重ね専用の枠へ入れること（MUST）**」
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual([1, 2])
    expect(titleOf(loop.document())).toBe('Here')
  })

  it('IC-73 (OP-9): only a task the current document has by `UID` goes into the frame', async () => {
    // 「その枠へ入れるのは、現在の文書のタスクと `UID` が一致するものだけとする
    //   （MUST）—— 本行の「入れる」が指すのは重ねて描く対象であって、読んだ
    //   ファイルの全体ではない」, and FR-015 states the same as a MUST NOT:
    // 「片側にしか存在しない `Task` は描いてはならない（MUST NOT）」.
    //
    // ⚠️ ONE MATCH OUT OF TWO, so that neither "all of them" nor "none of them"
    // can pass. `overlapping()` shares exactly one uid with `here()`.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files, overlapping())
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    expect(baselineUidsOf(loop.document())).toEqual([HERE_AND_THERE])
  })

  it('IC-73 (OP-9): nothing matching leaves the frame empty, which is not "no overlay"', async () => {
    // 「⚠️ **一致が 1 つも無いときは枠が空になる** —— 重ねを行わなかったのでは
    //   ない」. ⭐ THE CASE THIS FILE USED TO GET BACKWARDS: `there()` shares no
    // uid with `here()`, so the empty frame is what the row now answers, not a
    // sign the overlay never ran.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    expect(baselineUidsOf(loop.document())).toEqual([])
  })

  it('FR-015 (MUST): a task the overlay could not match is told, not silently dropped', async () => {
    // 「対応するタスクが無い重ねる側のタスクは、描かずに通知すること（MUST）」,
    // and OP-9 points at the same requirement for it: 「一致しなかったタスクを人
    //   へ通知する規則も同要求が持つ（MUST）」.
    //
    // ⚠️ THE ROW EXISTS NOW AND THIS CASE STILL DOES NOT NAME IT. When this
    // case was written table T-233 had no situation for "an overlaid task
    // matched nothing"; it has one since. What is driven here is the MUST
    // itself -- something was told, in words -- so the case stays true whichever
    // row carries it. ⭐ A case that pins the row and the words belongs beside
    // the one that does it for OP-11, and is owed.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    const notices = screen.last().notices
    expect(
      notices.length,
      'FR-015 (MUST): two tasks of the read file matched nothing and nobody was told',
    ).toBeGreaterThan(0)
    // ⛔ THE MANNER IS NOT ASSERTED. Which row of table T-037 this telling
    // follows is not stated anywhere: it is neither a refusal (the open was
    // accepted) nor a failure, and table T-233 has no situation for it. What
    // every row of that table does share is that the person is told IN WORDS,
    // so that much is driven and no more.
    for (const notice of notices) {
      expect(notice.text, 'NT-1 (MUST): the notice says nothing in words').not.toBe('')
    }
  })

  it('the question is no longer standing once it has been answered', async () => {
    // ⛔ NOT SPELT BY ANY ROW: no line of docs/spec says the surface closes when
    // one of the three is taken. What IS stated is that OP-3 of table T-024a
    // (MUST) has a person choose one of three, and that OP-8 (MUST NOT) refuses
    // another open while one is in progress -- so a question still standing
    // after its answer would hold that refusal open with nothing left to ask.
    // This case drives that reading; if it is wrong, the row that says so is
    // missing.
    //
    // ⚠️ THE OLD READING IS GONE. This case used to argue from U-56 having no
    // way off it, and asserted that IC-52 did not stand there. CR-226 put U-56
    // on IC-52's row of table T-109, so the surface now has one. ⛔ Taking
    // IC-52 is IN-4 of table T-028 closing a surface, which is not an answer to
    // OP-3 -- what this case drives is the answer, not the closing.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()

    expect(screen.last().openModal?.surface).not.toBe(OPEN_CHOOSER)
  })
})

// ===========================================================================
// OP-4 of table T-024a -- the question the replacement is owed
// ===========================================================================
//
// 「OP-4 | 未保存の編集 | **置き換えを選んだときは、捨てる前に確認を求めること
//   （MUST）。** 黙って捨ててはならない（MUST NOT）。取り消しの履歴は引き継が
//   ない（`LM-9` と同じ理由）。**合流を選んだときは現在の文書を捨てないので、この
//   確認は要らない**」
//
// U-55 of table T-103 names the surface it stands on and NT-7 of table T-037 is
// how it is put; IC-69 and IC-70 of table T-109 are its two answers.

describe('OP-4 -- replacing asks before it discards', () => {
  it('U-55 / NT-7: choosing IC-71 puts the question up and discards nothing yet', async () => {
    // 「黙って捨ててはならない（MUST NOT）」 -- so at this moment the current
    // document is still the current document, and something is being asked.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()

    const question = screen.last().confirmation
    expect(
      question,
      'OP-4 (MUST NOT): IC-71 was taken and nothing was asked, so the document would go in silence',
    ).not.toBeNull()
    // 「U-55 | `Confirmation` | 続けてよいかを問う面。問い方は表 T-037 の `NT-7`」
    expect(question?.manner).toBe('NT-7')
    expect(uidsOf(loop.document())).toEqual([1, 2])
    expect(titleOf(loop.document())).toBe('Here')
  })

  it('IC-69 / IC-70: the question carries the two entries table T-109 places on U-55', async () => {
    // 「本表がアイコンの全数である」 -- which entries stand on `Confirmation` is
    // table T-109's answer, read out of it in its own print order.
    const placed = entriesOn(CONFIRMATION)
    expect(placed, 'table T-109 places nothing on the surface U-55 names').not.toEqual([])

    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()

    const question = screen.last().confirmation
    expect(question?.entries.map((entry) => entry.icon)).toEqual(placed)
    // NT-7 (MUST) makes choosing between the two the whole of the surface, so
    // neither may be spent or held down.
    for (const entry of question?.entries ?? []) {
      expect(entry.isEnabled, `${entry.icon} is drawn faint`).toBe(true)
      expect(entry.isPressed, `${entry.icon} is drawn as held down`).toBe(false)
    }
  })

  it('IC-70: calling the question off leaves the current document exactly as it was', async () => {
    // 「IC-70 | `Confirmation` | — | 問いに「取りやめる」と答える | 表 T-037 の
    //   `NT-7`」, and NT-7 (MUST) is what makes calling it off one of the two
    // answers: 「続けるか取りやめるかを選ばせること（MUST）」. ⛔ The MUST NOT
    // OP-4 states is about discarding in silence; discarding after being told
    // "no" is the same discarding.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()
    answerQuestion(loop, screen, 'IC-70')
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual([1, 2])
    expect(titleOf(loop.document())).toBe('Here')
    expect(baselineCountOf(loop.document())).toBe(0)
    expect(
      screen.last().confirmation,
      'the question was answered and is still standing',
    ).toBeNull()
  })

  it('IC-72: joining is exempt, so no question stands', async () => {
    // 「**合流を選んだときは現在の文書を捨てないので、この確認は要らない**」, and
    // FR-031 (MUST NOT) is why "not needed" reads as "not asked": it admits
    // confirmations only where something undo cannot give back would be lost.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-72')
    await settle()
    pane.runAnimationFrames()

    expect(
      screen.last().confirmation,
      'OP-4 exempts joining in as many words, and FR-031 (MUST NOT) forbids asking anyway',
    ).toBeNull()
    expect(uidsOf(loop.document())).toEqual([1, 2, 11, 12])
  })

  it('IC-73: overlaying is exempt for the same reason -- nothing of the current document goes', async () => {
    // ⛔ NOT SPELT BY OP-4, which names only 置き換え and 合流. What settles it
    // is OP-9 (MUST NOT) -- 「現在の文書を置き換えも合流もしないこと（MUST NOT）」
    // -- together with FR-031 (MUST NOT), which limits confirmations to losing
    // what undoing cannot give back. Nothing of the current document is lost, so
    // there is nothing for the question to be about.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files, overlapping())
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    expect(screen.last().confirmation).toBeNull()
  })
})

// ===========================================================================
// CS-4 of table T-066 and FT-1 / FT-3 of table T-078 -- the wait
// ===========================================================================
//
// 「CS-4 | **人の応答を待つ 1 回のファイル操作**（開く・書き出す） | その操作が
//   現在値から要るものの全部 | **操作を始めた時点** | 待っているあいだに動いた値
//   と、始めた時点の値とが混ざった文書が着地する」
//
// 「⛔ **待つことそのものは画面を何も変えない** —— 表 T-078 に契機が無いからで
//   ある。**待っていることを示す表示を出してはならない（MUST NOT）。** ⭐ **待ち
//   が終わって問いが立つときのフレームは 表 T-078 の `FT-1` である** —— その押下
//   の、遅れて来た残りだからである。 ⭐ **凍らせるのではない** —— 待っているあい
//   だに寸法が変われば `FT-3` が走る（`NFR-011`）。」

describe('CS-4 -- what the screen does while the person is being waited on', () => {
  it('CS-4 (MUST NOT): nothing on the screen says the tool is waiting', async () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    expect(files.pendingOpens(), 'SK-10 asked the store for no file').toBe(1)

    const showing = screen.screens()
    pane.runAnimationFrames()

    expect(
      screen.screens(),
      '表 T-078 lists no trigger for waiting, so waiting may raise no frame',
    ).toBe(showing)
    expect(screen.last().notices, 'a notice was raised to say the tool is waiting').toEqual([])
    expect(screen.last().openModal).toBeNull()
  })

  it('FT-1: the frame that paints the question is the press coming back, with no second input', async () => {
    // 「FT-1 | 人の入力（ポインタとキー）。⭐ **その入力の、待ち（表 T-066 の
    //   `CS-4`）をまたいだ続きを含む** | …… ⚠️ **待ちをまたいだ続きを起こすのは
    //   シェル自身である**」
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    const beforeTheAnswer = screen.screens()

    files.handOver(JSON.stringify(there()), 'there.json')
    await settle()
    pane.runAnimationFrames()

    expect(
      screen.screens(),
      'the file came back and no frame was raised, so the question was never painted',
    ).toBeGreaterThan(beforeTheAnswer)
    expect(screen.last().openModal?.surface).toBe(OPEN_CHOOSER)
  })

  it('FT-3: the screen is not frozen while the question is owed', async () => {
    // 「⭐ **凍らせるのではない** —— 待っているあいだに寸法が変われば `FT-3` が走
    //   る（`NFR-011`）」
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    // ⛔ GUARDED, or this case is green for the wrong reason: a resize runs a
    // frame whether or not anything is being waited for, and what the row is
    // about is the resize running WHILE the wait is on.
    expect(files.pendingOpens(), 'SK-10 asked the store for no file, so nothing is being waited for').toBe(1)
    const showing = screen.screens()

    loop.resize({ ...SCREEN, width: SCREEN.width + 200 })
    pane.runAnimationFrames()

    expect(screen.screens(), 'FT-3 did not run while the open was waiting').toBeGreaterThan(showing)
  })

  it('CS-4 (MUST): the answer lands on what the current value was, not on what it became', async () => {
    // 「待っているあいだ、現在値を読み直してはならない（MUST NOT）。着地は
    //   `replaceDocument` で行うこと（MUST）」, and the row states the cost:
    // 「待っているあいだに動いた値と、始めた時点の値とが混ざった文書が着地する」.
    //
    // ⚠️ WHAT IS DRIVEN IS THE OUTCOME THE ROW PROTECTS: one whole document
    // lands, and not a mixture of the value as it stood when the question went
    // up and the value as it stands now. The write below is made WHILE the
    // question stands, and the overlay is the answer used because OP-9 keeps
    // the current schedule -- so a landing assembled out of a copy taken before
    // the wait shows up here as that write having gone missing.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    // ⚠️ THE OVERLAPPING FIXTURE, so that the landing has something in it. OP-9
    // (MUST) puts only a matching `UID` into the frame, and a frame that came
    // back empty either way would say nothing about which copy it was built on.
    await openAFile(loop, pane, files, overlapping())
    loop.receiveInput(SK_20)
    pane.runAnimationFrames()
    const written = (loop.document() as any).documentSettings

    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-73')
    await settle()
    pane.runAnimationFrames()

    expect(uidsOf(loop.document())).toEqual([1, 2])
    expect(baselineUidsOf(loop.document())).toEqual([HERE_AND_THERE])
    expect((loop.document() as any).documentSettings).toEqual(written)
  })
})

// ===========================================================================
// FR-096 -- the surface a document is written out through
// ===========================================================================
//
// 「作成者が書き出しを選んだとき、`GRS` は、**表 T-024 のうち書出の方向を持つ形式**
//   から選ばせ、選ばれた形式の規約に従って書き出すこと。**入口を 1 つとすること
//   （MUST）。形式ごとに別の入口を設けてはならない（MUST NOT）。**」
//
// 「**選択面が提案する名は、文書名（`FR-035`）に 表 T-024 が定める拡張子を付けた
//   ものとすること（MUST）。文書名が空のときは拡張子だけを提案すること。**」

describe('FR-096 -- the Export Chooser', () => {
  it('U-54: SK-12 puts the surface up', () => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_12)
    pane.runAnimationFrames()

    expect(screen.last().openModal?.surface).toBe(EXPORT_CHOOSER)
  })

  it('FR-096 (MUST): the surface offers every format table T-024 gives an out direction', () => {
    // ⛔ NOT DECIDED BY THE SPECIFICATION: no row says WHICH member of the
    // description carries the formats, and table T-024 has no English column, so
    // a format is carried by its row ID and by nothing else -- the bargain
    // `src/adapter/document-codec/exchange-formats.json` and
    // tests/system/mspdi-normalization.sws.test.ts both already keep. So this
    // case looks for the row ID ANYWHERE in the description rather than minting
    // a member name for it.
    const offered = outDirectionRows()
    expect(offered.length, 'table T-024 gives no row an out direction').toBeGreaterThan(1)

    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_12)
    pane.runAnimationFrames()

    const described = JSON.stringify(screen.last().openModal)
    for (const format of offered) {
      expect(
        described,
        `FR-096 (MUST): the ${EXPORT_CHOOSER} names no way to choose table T-024 row ${format}`,
      ).toContain(format)
    }
  })

  it('IC-52: an entry taken on an open surface reaches the loop, and IN-4 closes it', () => {
    // IC-52 of table T-109 is the way off whichever surface is open, and IN-4
    // of table T-028 is the authority its last column names.
    //
    // ⭐ THE ONE CASE HERE THAT IS ABOUT THE ROAD RATHER THAN THE RULE. Every
    // case above that answers OP-3 presses an entry drawn on an open surface, so
    // this pins the road those depend on: a press that IF-9 answers with a part
    // and an entry reaches the loop and moves S-99g. When this one is green and
    // one of those is red, the road is not what is missing.
    expect(entriesOn(EXPORT_CHOOSER)).toContain('IC-52')

    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_12)
    pane.runAnimationFrames()
    expect(screen.last().openModal?.surface).toBe(EXPORT_CHOOSER)

    takeEntry(loop, screen, EXPORT_CHOOSER, 'IC-52')
    pane.runAnimationFrames()

    expect(screen.last().openModal).toBeNull()
  })

  it('IC-3: table T-109 gives the whole act exactly one entry', () => {
    // 「入口を 1 つとすること（MUST）。形式ごとに別の入口を設けてはならない（MUST
    //   NOT）。」 Table T-109 is the whole of the icons (FR-029, MUST), so the
    // count is that table's answer.
    const writingOut = T_109.rows.filter((row) => (row.cells[T_109_AUTHORITY] ?? '').includes('`FR-096`'))
    expect(writingOut.map((row) => row.id)).toEqual(['IC-3'])
  })
})

describe('FR-096 -- the name the chooser proposes', () => {
  /**
   * SK-11 on a document that has never been in a file.
   *
   * 「⚠️ **MSPDI で開いた文書の最初の `SK-11` は上書きする先を持たない**ので、
   *   保存先を問うことになる」 -- and a document that came from the startup
   * template has no destination either.
   *
   * @purity non-pure
   */
  const saveOnce = async (document: Document): Promise<StoreProbe> => {
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, document, SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_11)
    pane.runAnimationFrames()
    await settle()
    return files
  }

  it('SK-11 writes GRS JSON, so the extension is the one table T-024 gives that row', async () => {
    // 「表 T-036 の `SK-11`（保存する）は、どの形式から開いた文書であっても
    //   `GRS JSON` で書くこと（MUST）」, and table T-024 row IO-2 is `GRS JSON`.
    const extension = extensionOf('IO-2')
    expect(extension, 'table T-024 row IO-2 gives no extension').not.toBeNull()

    const files = await saveOnce(here('Plan of record'))

    expect(
      files.written.length,
      'FR-096: the document has no file to overwrite, so a destination was owed',
    ).toBe(1)
    expect(
      files.written[0]?.suggestedFileName,
      'FR-096 (MUST): 「選択面が提案する名は、文書名（`FR-035`）に 表 T-024 が定める' +
        '拡張子を付けたものとすること（MUST）」',
    ).toBe(`Plan of record${extension}`)
  })

  it('FR-035 empty: the extension alone is proposed', async () => {
    // 「文書名が空のときは拡張子だけを提案すること。」 FR-035 keeps `title` from
    // ever being the empty string (MUST NOT), so `null` is the one way a
    // document has no name.
    const extension = extensionOf('IO-2')

    const files = await saveOnce(here(null))

    expect(files.written.length).toBe(1)
    expect(
      files.written[0]?.suggestedFileName,
      'FR-096 (MUST): 「文書名が空のときは拡張子だけを提案すること」',
    ).toBe(extension)
  })

  it('⛔ the extension is not written out here: table T-024 is the one place it stands', () => {
    // 「⛔ **拡張子を本要求に書き写してはならない（MUST NOT）** —— 正は 表 T-024
    //   ただ 1 か所である。」 The two cases above read it out of the table for the
    // same reason; this one holds them to it.
    expect(extensionOf('IO-2')).toBe(bare(cellOf(T_024, 'IO-2', T_024_EXTENSION)))
    // ⭐ AND IT NOW REACHES EVERY ROW THAT COMES OUT AS A FILE. Table T-024's
    // own note says which rows those are -- 「拡張子の欄は、ファイルとして出る行
    // がすべて持つ」 -- and names the two that do not, because a store key and a
    // clipboard are not files and have no name to put an extension on. So the
    // set FR-096 can propose a name for is every out-direction row but those.
    const unnamed = outDirectionRows().filter((id) => extensionOf(id) === null)
    expect(
      unnamed.length,
      'table T-024 leaves a file-bearing out-direction row without an extension, so FR-096 ' +
        'has no name to propose for it',
    ).toBe(1)
  })

  it('FR-096 (MUST): the name proposed for a chosen format is the one that format is given', async () => {
    // 「選択面が提案する名は、文書名（`FR-035`）に 表 T-024 が定める拡張子を付け
    //   たものとすること（MUST）」 -- 表 T-024 が定める, which is per ROW, so the
    // name follows whichever format was chosen and not whichever one SK-11
    // writes.
    //
    // ⛔ TWO OF THE FIVE FILE-BEARING ROWS CANNOT BE DRIVEN HERE. `ImageExporter`
    // (PI-21) is a stub in this build, so nothing is handed to the store for the
    // two picture rows, and there is no proposed name to read. ⛔ No rasteriser
    // is invented to reach them and no expectation is softened -- the rows are
    // named below, and the case fails if the roster stops carrying one of them
    // so that this exclusion cannot outlive the stub silently.
    const cannotBeWritten = ['IO-3', 'IO-4', 'IO-7']
    for (const id of cannotBeWritten) {
      expect(
        EXCHANGE_FORMATS.some((format) => format.rowId === id),
        `${id} is recorded as unwritable in this build but is no longer a format of table T-024`,
      ).toBe(true)
    }

    const drivable = EXCHANGE_FORMATS.filter(
      (format) => format.extension !== null && !cannotBeWritten.includes(format.rowId),
    )
    expect(drivable.length, 'no format of table T-024 can be written in this build').toBeGreaterThan(
      1,
    )

    for (const format of drivable) {
      const pane = host()
      const screen = screenPane()
      const files = fileStore()
      const loop = frameLoop(pane.surface, here('Plan of record'), SCREEN, screen.wiring, files.store)

      loop.receiveInput(SK_12)
      pane.runAnimationFrames()
      takeFormat(loop, screen, format.rowId)
      await settle()
      pane.runAnimationFrames()

      expect(
        files.written.length,
        `FR-096 (MUST): choosing table T-024 row ${format.rowId} handed the store nothing`,
      ).toBe(1)
      expect(
        files.written[0]?.suggestedFileName,
        `FR-096 (MUST): the name proposed for table T-024 row ${format.rowId}`,
      ).toBe(`Plan of record${format.extension}`)
    }
  })

  it('FR-035 empty: the extension of the chosen format alone is proposed', async () => {
    // 「文書名が空のときは拡張子だけを提案すること。」 -- again per row, so the
    // same sweep with no document name.
    const drivable = EXCHANGE_FORMATS.filter(
      (format) => format.extension !== null && !['IO-3', 'IO-4', 'IO-7'].includes(format.rowId),
    )

    for (const format of drivable) {
      const pane = host()
      const screen = screenPane()
      const files = fileStore()
      const loop = frameLoop(pane.surface, here(null), SCREEN, screen.wiring, files.store)

      loop.receiveInput(SK_12)
      pane.runAnimationFrames()
      takeFormat(loop, screen, format.rowId)
      await settle()
      pane.runAnimationFrames()

      expect(
        files.written[0]?.suggestedFileName,
        `FR-096 (MUST): the name proposed for table T-024 row ${format.rowId} with no document name`,
      ).toBe(format.extension)
    }
  })
})

// ===========================================================================
// FR-076 and table T-233 -- what a notice carries as its reason
// ===========================================================================
//
// 「⭐ **通知が運ぶ理由は 表 T-233 の行とすること（MUST）。同表に無い理由を運ん
//   ではならない（MUST NOT）** —— 理由の語は `FR-038` の辞書が持ち、辞書は行 ID で
//   引く。⚠️ **行の無い理由に落ち先を与えるのが `RS-15` である**」
//
// ⚠️ HOW A CASE PINS A ROW WITHOUT BEING ABLE TO READ ONE. `RaisedNotice`
// carries the reason and the loop publishes neither its session nor its raised
// half; what reaches the screen is a `Notice`, which carries the manner and the
// WORDS. So each case below reads the row's words out of FR-038's dictionary
// and asks whether those are the words that arrived -- which is the same join,
// taken from the other end.
//
// ⛔ SOME ROWS ARE NOT DRIVEN FROM THIS FILE, and none of them is unreachable in
// principle -- they are reached from roads this file does not drive. RS-1, RS-2
// and RS-5 are faults of the overwrite road (`FR-060`), which needs an opened
// file this file's store never has; RS-6 .. RS-10 are the refusals of table
// T-067, which are raised where a write is refused rather than where a file is
// chosen; RS-15 is a fallback and has no situation of its own to stage. ⛔ Named
// rather than counted, so that a row added upstream does not make this note
// wrong in silence -- and recorded rather than guessed at, because a case driven
// through a road this file does not own would be asserting somebody else's seam.

describe('FR-076 -- a notice raised while a file is opened carries a row of table T-233', () => {
  it('RS-4: bytes that are not UTF-8 are told in that row of the table, in its own words', async () => {
    // 「RS-4 | バイト列が UTF-8 でないので、文字として読めない | `NT-1` | 表
    //   T-003 の `CN-5`」
    const words = wordsFor('RS-4')
    const pane = host()
    const screen = screenPane('ja')
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    // ⭐ Lone continuation bytes: no UTF-8 sequence may hold one where these
    // stand, so this is not a byte string that decodes oddly -- it decodes to
    // nothing at all, which is the situation the row names.
    files.handOverBytes(new Uint8Array([0x7b, 0xff, 0xfe]), 'there.json')
    await settle()
    pane.runAnimationFrames()

    const notices = screen.last().notices
    expect(
      notices.length,
      'FR-076 (MUST): the file could not be read as characters and nobody was told',
    ).toBe(1)
    expect(notices[0]?.manner, 'the manner table T-233 gives RS-4').toBe(mannerFor('RS-4'))
    expect(notices[0]?.text, 'the words FR-038 holds for RS-4').toBe(words.text.ja)
    expect(notices[0]?.nextSteps, 'NT-3a: the next step FR-038 holds for RS-4').toContain(
      words.nextStep.ja,
    )
    // ⚠️ AND NOTHING WAS READ. OP-5 (MUST) puts the verification before OP-3's
    // question, and a file that is not characters never got as far as being a
    // format -- so there is nothing to ask about.
    expect(screen.last().openModal?.surface).not.toBe(OPEN_CHOOSER)
  })

  it('RS-4 in the other language: the words come from the dictionary, not from this loop', async () => {
    // FR-038 (MUST NOT) forbids a second store of translated strings, so the
    // same reason in the other language is the same row read out of the same
    // dictionary -- and the two words differ, which is what makes this a test.
    const words = wordsFor('RS-4')
    expect(words.text.en, 'FR-038: RS-4 has one word for two languages').not.toBe(words.text.ja)

    const pane = host()
    const screen = screenPane('en')
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    files.handOverBytes(new Uint8Array([0x7b, 0xff, 0xfe]), 'there.json')
    await settle()
    pane.runAnimationFrames()

    expect(screen.last().notices[0]?.text).toBe(words.text.en)
  })

  it('⛔ cancelled is owed nothing: IF-3 keeps it apart so that it is not reported', async () => {
    // 「`cancelled` is in the list precisely so that it can be told apart from
    //   the other three and left un-notified」 -- and table T-233 gives it no
    // row, which FR-076 (MUST NOT) makes decisive: a reason the table does not
    // hold may not be carried, and RS-15's fallback is for reasons that OUGHT to
    // be told.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    files.failOpen('cancelled')
    await settle()
    pane.runAnimationFrames()

    expect(
      screen.last().notices,
      'the person stopped the chooser and was told they had failed at something',
    ).toEqual([])
    expect(screen.last().confirmation).toBeNull()
    expect(screen.last().openModal).toBeNull()
    expect(uidsOf(loop.document())).toEqual([1, 2])
  })

  it('RS-14: several files at once is a caution, and OP-11 (MUST NOT) keeps the first one open', async () => {
    // 「OP-11 | **一度に 2 つ以上のファイルが渡されたとき** | **先頭の 1 つだけを
    //   受け入れ、残りを無視したことを告げること（MUST）。** 作法は 表 T-037 の
    //   `NT-5` …… **1 つは開いているので、受け付けなかったことにしてはならない
    //   （MUST NOT）。**」
    const words = wordsFor('RS-14')
    const pane = host()
    const screen = screenPane('ja')
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    files.handOverBytes(new TextEncoder().encode(JSON.stringify(there())), 'there.json', 2)
    await settle()
    pane.runAnimationFrames()

    const notices = screen.last().notices
    expect(notices.length, 'OP-11 (MUST): two files were left behind and nobody was told').toBe(1)
    expect(notices[0]?.manner, 'the manner table T-233 gives RS-14').toBe(mannerFor('RS-14'))
    expect(notices[0]?.text).toBe(words.text.ja)
    // 「受け付けなかったことにしてはならない（MUST NOT）」 -- the file that WAS
    // accepted is open, so OP-3's question stands beside the caution.
    expect(
      screen.last().openModal?.surface,
      'OP-11 (MUST NOT): the caution was raised and the accepted file was not opened',
    ).toBe(OPEN_CHOOSER)
  })

  it('⛔ no caution where none is owed: an ordinary open leaves the notices empty', async () => {
    // 「`0` where none were, which is every ordinary open」. ⭐ The guard that
    // keeps the case above from being green on a loop that cautions every time.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files)

    expect(screen.last().notices).toEqual([])
  })
})

describe('FR-076 -- OP-12 of table T-024a tells its three refusals apart', () => {
  /**
   * The rows of table T-024 a file may be read AS -- the two OP-1 accepts.
   *
   * @purity pure
   */
  const readableFormats = (): readonly ExchangeFormat[] =>
    EXCHANGE_FORMATS.filter((one) => one.firstCharacter !== null)

  /**
   * Open one file and answer with what the screen was told.
   *
   * @purity non-pure
   */
  const openAndRead = async (text: string, fileName: string): Promise<ScreenView> => {
    const pane = host()
    const screen = screenPane('ja')
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_10)
    pane.runAnimationFrames()
    await settle()
    files.handOver(text, fileName)
    await settle()
    pane.runAnimationFrames()
    return screen.last()
  }

  it('the rows a file may be read as are the two OP-1 accepts', () => {
    // ⭐ A premise for the three cases below, and read rather than typed:
    // 「先頭の非空白 1 文字の欄を持つのは、`OP-1` が取込で受け付ける 2 行だけ
    //   である」.
    expect(readableFormats().length).toBe(2)
    for (const format of readableFormats()) {
      expect(firstCharacterOf(format.rowId), `table T-024 row ${format.rowId}`).not.toBeNull()
      expect(extensionOf(format.rowId), `table T-024 row ${format.rowId}`).not.toBeNull()
    }
  })

  it('RS-11: an extension no row of table T-024 carries', async () => {
    // 「RS-11 | 拡張子が 表 T-024 のどの行にも当たらない | `NT-1` | 表 T-024a の
    //   `OP-12`」
    const words = wordsFor('RS-11')
    const readable = readableFormats()[0]
    const view = await openAndRead(`${readable?.firstCharacter ?? ''}}`, 'there.rtf')

    expect(view.notices.length, 'OP-12 (MUST NOT): the file was read anyway').toBe(1)
    expect(view.notices[0]?.manner).toBe(mannerFor('RS-11'))
    expect(view.notices[0]?.text).toBe(words.text.ja)
    expect(view.openModal?.surface).not.toBe(OPEN_CHOOSER)
  })

  it('RS-12: a first character no row of table T-024 carries', async () => {
    // 「RS-12 | 先頭の非空白の文字が 表 T-024 のどの行にも当たらない」
    const words = wordsFor('RS-12')
    const readable = readableFormats()[0]
    const view = await openAndRead('zzz', `there${readable?.extension ?? ''}`)

    expect(view.notices.length, 'OP-12 (MUST NOT): the file was read anyway').toBe(1)
    expect(view.notices[0]?.manner).toBe(mannerFor('RS-12'))
    expect(view.notices[0]?.text).toBe(words.text.ja)
    expect(view.openModal?.surface).not.toBe(OPEN_CHOOSER)
  })

  it('RS-13: the extension and the first character point at different rows', async () => {
    // 「RS-13 | 拡張子と先頭の文字が別の行を指す」 -- 「どちらか一方でも違うファ
    //   イルを読んではならない（MUST NOT）—— 片方だけで決めると、壊れた
    //   `GRS JSON` を MSPDI の誤りとして人に見せることになる」.
    const words = wordsFor('RS-13')
    const one = readableFormats()[0]
    const other = readableFormats()[1]
    const view = await openAndRead(
      `${other?.firstCharacter ?? ''}whatever`,
      `there${one?.extension ?? ''}`,
    )

    expect(view.notices.length, 'OP-12 (MUST NOT): the file was read anyway').toBe(1)
    expect(view.notices[0]?.manner).toBe(mannerFor('RS-13'))
    expect(view.notices[0]?.text).toBe(words.text.ja)
    expect(view.openModal?.surface).not.toBe(OPEN_CHOOSER)
  })
})

describe('FR-076 -- a notice raised while a document is written out', () => {
  it('RS-3: a write the environment could not do is told with a next step', async () => {
    // 「RS-3 | 書き込みを試みたが、この環境では行えなかった | `NT-3a` | 表 T-004
    //   の `LM-14`」, and NT-3a (MUST) is what makes the next step compulsory:
    // 「失敗したことだけを伝えて手段を示さない通知を出してはならない（MUST NOT）」.
    const words = wordsFor('RS-3')
    const pane = host()
    const screen = screenPane('ja')
    const files = fileStore({ chosenWriteFault: 'unavailable' })
    const loop = frameLoop(pane.surface, here('Plan of record'), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_11)
    pane.runAnimationFrames()
    await settle()
    pane.runAnimationFrames()

    const notices = screen.last().notices
    expect(notices.length, 'FR-076 (MUST): the write failed and nobody was told').toBe(1)
    expect(notices[0]?.manner, 'the manner table T-233 gives RS-3').toBe(mannerFor('RS-3'))
    expect(notices[0]?.text).toBe(words.text.ja)
    expect(
      notices[0]?.nextSteps,
      'NT-3a (MUST NOT): told it failed with nothing to do next',
    ).toContain(words.nextStep.ja)
  })

  it('⛔ a write that lands tells nobody anything', async () => {
    // ⭐ The guard for the case above: NT-3a is a FAILURE notice, so a loop that
    // raised one on the way past would be telling a person that a save they
    // watched succeed had failed.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here('Plan of record'), SCREEN, screen.wiring, files.store)

    loop.receiveInput(SK_11)
    pane.runAnimationFrames()
    await settle()
    pane.runAnimationFrames()

    expect(files.written.length, 'the write never reached the store').toBe(1)
    expect(screen.last().notices).toEqual([])
  })
})

// ===========================================================================
// The guards that keep the readings above honest
// ===========================================================================

describe('the tables are read by position, so the positions are pinned', () => {
  it('table T-024 prints format, direction and extension in that order', () => {
    expect(T_024.headings.length).toBe(7)
    expect(outDirectionRows()).toEqual(['IO-1', 'IO-2', 'IO-3', 'IO-4', 'IO-7', 'IO-6'])
    expect(extensionOf('IO-1')).toBe('.xml')
    expect(extensionOf('IO-2')).toBe('.json')
  })

  it('table T-103 prints the settled English name first', () => {
    expect(T_103.headings.length).toBe(3)
    expect(OPEN_CHOOSER).toBe('Open Chooser')
    expect(EXPORT_CHOOSER).toBe('Export Chooser')
  })

  it('table T-109 prints the surface an entry stands on first', () => {
    // ⚠️ IC-52 LEADS BOTH ROSTERS because `entriesOn` keeps the table's print
    // order and that row comes before IC-71. ⭐ It reaches U-56 by CR-226,
    // which is the cell that gave the surface OP-3 asks on a way off it.
    // ⚠️ SIX, NOT FIVE, SINCE 構え WAS APPENDED AFTER 正. Table T-109's preamble
    // states it: 「⭐ **`構え` の欄は、その入口が押されたときポインタが入る 表
    // T-023b の行である。**」 -- appended, so neither position read below moved.
    expect(T_109.headings.length).toBe(6)
    // ⛔ THE COUNT ALONE IS NOT THE GUARD `cellOf` ASKS FOR. A column inserted
    // in the middle while another is dropped leaves the count where it was and
    // shifts every reading by one, so the two positions this file reads are
    // pinned by what stands in them: IC-1 stands on U-31 and rests on FR-087.
    expect(cellOf(T_109, 'IC-1', T_109_SURFACE)).toContain('`' + partNameOf('U-31') + '`')
    expect(cellOf(T_109, 'IC-1', T_109_AUTHORITY)).toContain('`FR-087`')
    expect(entriesOn(OPEN_CHOOSER)).toEqual(['IC-52', 'IC-71', 'IC-72', 'IC-73'])
    expect(entriesOn(EXPORT_CHOOSER)).toEqual(['IC-52'])
    // ⚠️ NO IC-52 ON `Confirmation`: NT-7 (MUST) makes the two answers the whole
    // of the surface, and calling the question off IS one of them.
    expect(entriesOn(CONFIRMATION)).toEqual(['IC-69', 'IC-70'])
  })

  it('table T-233 prints the manner second, and every row of it has words to be told in', () => {
    // 「⛔ **行を足すときは、辞書の原稿にも項を足すこと（MUST）** —— 生成器が本表
    //   から名簿を起こすので、片方だけを書けば黙らずに落ちる。」 ⭐ This is that
    // failure made loud: a row without an entry cannot be told, and NT-1's
    // 「文字で示すこと（MUST）」 is unkeepable for it.
    expect(T_233.headings.length).toBe(4)
    expect(T_233.rows.length).toBe(REASON_WORDS.length)
    const manners = new Set(T_037.rows.map((row) => row.id))
    for (const row of T_233.rows) {
      const words = wordsFor(row.id)
      for (const language of ['ja', 'en'] as const) {
        expect(words.text[language], `table T-233 row ${row.id} has no word in ${language}`).not.toBe(
          '',
        )
        expect(
          words.nextStep[language],
          `table T-233 row ${row.id} has no next step in ${language}`,
        ).not.toBe('')
      }
      expect(
        manners.has(mannerFor(row.id)),
        `table T-233 row ${row.id} names ${mannerFor(row.id)}, which is not a row of table T-037`,
      ).toBe(true)
    }
  })

  it('the roster of formats agrees with table T-024, column for column', () => {
    // ⛔ 「拡張子を本要求に書き写してはならない（MUST NOT）—— 正は 表 T-024 ただ
    //   1 か所である」. `exchange-formats.json` is printed FROM that table, and
    // this is what keeps the cases above from being driven by a copy that has
    // drifted away from it: a generator that stopped running reaches this line.
    expect(EXCHANGE_FORMATS.map((one) => one.rowId)).toEqual(outDirectionRows())
    for (const format of EXCHANGE_FORMATS) {
      expect(format.extension, `table T-024 row ${format.rowId} extension`).toBe(
        extensionOf(format.rowId),
      )
      expect(format.firstCharacter, `table T-024 row ${format.rowId} first character`).toBe(
        firstCharacterOf(format.rowId),
      )
    }
  })

  it('table T-230 prints the history column third', () => {
    expect(T_230.headings.length).toBe(7)
    expect(cellOf(T_230, 'RD-4', T_230_HISTORY)).toBe('捨てる')
    expect(cellOf(T_230, 'RD-3', T_230_HISTORY)).toBe(
      'いまのものを残す',
    )
  })

  it('table T-036 prints the assignment second, and OP-2 keeps opening to one row', () => {
    expect(T_036.headings.length).toBe(3)
    expect(SK_10).toEqual({
      kind: 'key',
      key: 'O',
      modifiers: { ctrl: true, shift: false, alt: false, meta: false },
    })
    expect(SK_12).toEqual({
      kind: 'key',
      key: 'E',
      modifiers: { ctrl: true, shift: true, alt: false, meta: false },
    })
  })

  it('table T-024a still asks OP-3 before anything of the file is applied', () => {
    // 「OP-5 | 検証 | 経路によらず `FR-023` の検証を通すこと（MUST）。**`OP-3` を
    //   問う前に通すこと（MUST）**」 -- recorded so that a manuscript that moves
    // the order reaches this file.
    expect(rowOf(T_024A, 'OP-5').cells.join(' ')).toContain('`OP-3`')
  })
})
