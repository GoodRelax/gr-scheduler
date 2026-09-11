// `FR-023` (利用者の裁定 2026-09-06「その様な無効なデータは削除して残りを取り込
// め」, CR-368, ledger row D-275): a `Task` whose date column names no day, or
// falls outside table T-214, is DROPPED and the rest of the file is taken in --
// never a whole-file refusal, and never a question put to a person. What was
// dropped is told afterwards, by NAME, never by count, and never translated.
//
// ⚠️ Chapter 9 admits no Unit as a TEST_LEVEL, so these cases have no node in
// the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⭐⭐ THE CLAUSES, VERBATIM (docs/spec/01-04-requirements.md, `FR-023`) -- each
// window ends at its own marker's closing parenthesis, which is the unit check
// 39 (`check-must-clause-coverage.py`) measures a clause by.
// ---------------------------------------------------------------------------
//
//   「その行を落として残りを取り込むこと（MUST）。人に選ばせてはならない
//    （MUST NOT）」（利用者の裁定 2026-09-06）
//   「落としたものは 表 T-050 の `CD-1` に従うこと（MUST）」
//   「取り込んだあとで、落とした `Task` の名前を並べて告げること（MUST）」
//   「件数だけを告げて済ませてはならない（MUST NOT）」
//   「名前は文書の値であるので訳さない（MUST NOT）」
//
// ---------------------------------------------------------------------------
// Unit under test: UF-48 of 表 T-075 (`frame-loop.ts`, `CP-25` of 表 T-062) --
// LY-5 of 表 T-060 leaves the Framework the only layer that may hold a current
// value, so the open road, the drop and the surface it raises are all there.
//
// ⛔ WRITTEN FROM docs/spec, PLUS ONLY THE PUBLISHED SIGNATURES AND TYPES (docs/
// development-rules/04-verification.md §1): `frameLoop`, `FrameEnvironment`,
// `ScreenWiring`, `FileStore` / `FileReading`, `ScreenSurface` / `ScreenView` /
// `OpenModal`. NO FUNCTION BODY was read to decide what a case expects -- every
// expected value is FR-023's or table T-050's own wording. The open/replace
// harness (`fileStore`, `takeEntry`, `answerQuestion`, `openAFile`) is copied in
// shape from tests/unit/uf-47-48-choosers.test.ts, which drives the same OP-3 /
// OP-4 road this file drives the drop through.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//  1. THE OTHER INVARIANTS OF TABLE T-220 (rings, depth cap, resource ceilings).
//     FR-023's own text keeps those a WHOLE-FILE refusal; this file's dates
//     alone are the ones dropped row-by-row, and no case here builds a second
//     kind of violation to see what happens to it.
//  2. THE IMPORT REPORT'S DOM FACE (dom-screen-surface.ts drawing the modal, or
//     the OK press). frame-loop.ts's own STOP note records that both are absent
//     this round and owned by other hands -- this file reads the `ScreenView`
//     description directly, the same way tests/unit/uf-47-48-choosers.test.ts
//     reads `openModal` for the other two OP-3 answers.
//  3. THE MERGE OR OVERLAY ROADS (OP-3's other two answers). RD-4 (replace) is
//     the one road FR-023's ruling was written against; the other two are a
//     separate case entirely.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

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
import type { Task } from '../../src/entity/document-model/schedule/schedule'
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

/** ⭐⭐ 利用者の裁定 2026-09-06: drop the row and take the rest in, never ask. */
const FR_023_DROP_AND_TAKE_IN =
  '⚠️ **空文字を特例にしない** —— 列が空を許すときの空は `null` であり（`FR-024` の契約）、空文字はその契約の外にある。 その行を落として残りを取り込むこと（MUST）。人に選ばせてはならない（MUST NOT）'

/** ⭐ CD-1's cascade, and the MUST to tell the dropped names afterwards. */
const FR_023_CD1_AND_TELL_NAMES =
  'が人を待たせる。** **落としたものは 表 T-050 の `CD-1` に従うこと（MUST）** —— ⭐ **取り除く連鎖を 2 通り持たない。** **取り込んだあとで、落とした `Task` の名前を並べて告げること（MUST）'

/** ⛔ MUST NOT a count, MUST NOT translated. */
const FR_023_NOT_COUNT_NOT_TRANSLATED =
  'NT-8` が持つ。 ⛔ **件数だけを告げて済ませてはならない（MUST NOT）** —— **どれが落ちたかを人が知らなければ、元のファイルを直すことができない。** ⚠️ **名前は文書の値であるので訳さない（MUST NOT）'

describe('FR-023 -- the manuscript this file is driven by', () => {
  it('still drops the row and takes the rest in, without asking', () => {
    expect(REQUIREMENTS).toContain(FR_023_DROP_AND_TAKE_IN)
  })

  it('still sends the drop through CD-1’s cascade, and still tells the names afterwards', () => {
    expect(REQUIREMENTS).toContain(FR_023_CD1_AND_TELL_NAMES)
  })

  it('still forbids a bare count, and still forbids translating the names', () => {
    expect(REQUIREMENTS).toContain(FR_023_NOT_COUNT_NOT_TRANSLATED)
  })
})

// ===========================================================================
// 2. The tables, read out of the manuscript rather than copied
// ===========================================================================

const T_103: SpecTable = specTable('T-103')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/** The settled name table T-103 gives one UI part. */
function partNameOf(id: string): string {
  const name = bare(rowOf(T_103, id).by['確定名（英）'] ?? '')
  if (name === '') throw new Error(`table T-103 row ${id} names no UI part`)
  return name
}

/** U-56 -- the surface OP-3's question stands on. */
const OPEN_CHOOSER = partNameOf('U-56')
/** U-55 -- the surface NT-7's question stands on, which OP-4 sends the replacement to. */
const CONFIRMATION = partNameOf('U-55')
/** U-62 -- FR-023's own surface, the one this file is about. */
const IMPORT_REPORT = partNameOf('U-62')

const T_036: SpecTable = specTable('T-036')

/** One row of table T-036, spelt as its assignment column spells it. */
function keyOf(id: string): KeyInput {
  const parts = (bare(rowOf(T_036, id).by['割当'] ?? '').split('/')[0] ?? '')
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

/** The key the manuscript spells for going on with a confirmation (rule 03 section 1). */
const PROCEED_ANSWER = 'proceed'

// ===========================================================================
// 3. The documents. Current: one valid row. Incoming: a good Task, a Task with
//    an unusable date, and that Task's own WBS child (valid dates) -- so the
//    cascade (CD-1) is what has to remove the child, not a second bad date.
// ===========================================================================

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const HERE_ROW = '11111111-1111-4111-8111-111111111111'
const THERE_ROW = '22222222-2222-4222-8222-222222222222'

function task(part: Partial<Task> & { readonly uid: number; readonly name: string }): Task {
  return {
    wbsParentUid: null,
    wbsOrder: part.uid,
    start: '2026-04-01',
    finish: '2026-04-10',
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
    ...part,
  } as unknown as Task
}

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

function documentWith(rowId: string, rowLabel: string, tasks: readonly Task[]): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), title: rowLabel, uidHighWaterMark: 100 },
      calendars: structuredClone(template.schedule.calendars),
      tasks,
      resources: [],
      assignments: [],
      taskGroups: [row(rowId, rowLabel)],
      taskGroupMembers: tasks.map((one) => ({ taskUid: one.uid, groupId: rowId, stackOrder: null })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const here = (): Document => documentWith(HERE_ROW, 'Here', [task({ uid: 1, name: 'HereTask' })])

/**
 * The file being read: one good `Task`, one whose `start` names no day (`IV-14`
 * of table T-220, which FR-023's own text puts in this class), and one valid
 * `Task` that is the BAD one's own WBS child -- so removing it can only be
 * CD-1's cascade, since its own two dates are inside table T-214.
 */
const there = (): Document =>
  documentWith(THERE_ROW, 'There', [
    task({ uid: 11, name: 'GoodTask' }),
    task({ uid: 12, name: 'BadDateTask', start: '' as unknown as string }),
    task({ uid: 13, name: 'BadTaskChild', wbsParentUid: 12 }),
  ])

const uidsOf = (document: Document): number[] =>
  (document as any).schedule.tasks.map((one: Task) => one.uid).sort((a: number, b: number) => a - b)

// ===========================================================================
// 4. The host, and the OP-3/OP-4 harness -- copied in shape from
//    tests/unit/uf-47-48-choosers.test.ts, which drives the same road.
// ===========================================================================

const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

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

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
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
  }
}

interface StoreProbe {
  readonly store: FileStore
  handOver(text: string, fileName: string): void
}

function fileStore(): StoreProbe {
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
    writeChosenFile: async (write: ChosenFileWrite) => ({
      ok: true,
      openedFile: { kind: 'writable', fileName: write.suggestedFileName },
    }),
  }
  return {
    store,
    handOver: (text, fileName) => {
      const answer = waiting.shift()
      if (answer === undefined) {
        throw new Error('SK-10 asked the store for no file, so there is nothing to hand over')
      }
      answer({ ok: true, file: { bytes: new TextEncoder().encode(text), fileName } })
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

function takeEntry(loop: FrameLoop, screen: ScreenPane, surface: string, entry: string): void {
  screen.drawAt({
    part: surface,
    entry,
    format: null,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  } as unknown as ScreenPart)
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  screen.drawAt(null)
}

function answerQuestion(loop: FrameLoop, screen: ScreenPane, answer: string): void {
  screen.drawAt({
    part: CONFIRMATION,
    entry: null,
    format: null,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
    confirmationAnswer: answer,
  } as unknown as ScreenPart)
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  screen.drawAt(null)
}

async function openAFile(
  loop: FrameLoop,
  pane: Host,
  files: StoreProbe,
  incoming: Document,
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

/** Open, choose IC-71 (replace), and answer OP-4's discard question. */
async function replacedWith(incoming: Document): Promise<{ loop: FrameLoop; screen: ScreenPane }> {
  const pane = host()
  const screen = screenPane()
  const files = fileStore()
  const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

  await openAFile(loop, pane, files, incoming)
  takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
  await settle()
  pane.runAnimationFrames()
  answerQuestion(loop, screen, PROCEED_ANSWER)
  await settle()
  pane.runAnimationFrames()

  return { loop, screen }
}

// ===========================================================================
// 5. FR-023 (MUST / MUST NOT): the drop, the cascade, and the telling
// ===========================================================================

describe('FR-023 -- a Task with an unusable date is dropped, and the rest lands', () => {
  it('⭐⭐ the bad Task and its own WBS child are both gone; the good one lands (CD-1)', async () => {
    const { loop } = await replacedWith(there())

    const uids = uidsOf(loop.document())
    expect(
      uids,
      'FR-023 (MUST): その行を落として残りを取り込むこと -- GoodTask should have ' +
        'landed even though the file also carried a row with no usable date',
    ).toContain(11)
    expect(
      uids,
      'FR-023 (MUST NOT): a row with no usable day should not have been carried in silence',
    ).not.toContain(12)
    expect(
      uids,
      'FR-023 (MUST): 落としたものは CD-1 に従うこと -- the dropped Task’s own WBS ' +
        'child should have gone with it, even though ITS two dates are inside table T-214',
    ).not.toContain(13)
  })

  it('⭐⭐ the import was not refused outright: the document really did replace', async () => {
    // ⛔ WITHOUT THIS, a build that refused the whole file (leaving `Here`
    // standing) would make the case above pass on the WRONG document.
    const { loop } = await replacedWith(there())

    expect((loop.document() as any).schedule.project.title).toBe('There')
  })

  it('⭐⭐ nobody was asked which rows to keep: no confirmation stood between OP-3 and the write', async () => {
    // 「人に選ばせてはならない（MUST NOT）」 -- OP-4's own discard question is the
    // only question this road owes, and it was already answered before the
    // write; nothing further should have come up asking about the bad row.
    const pane = host()
    const screen = screenPane()
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files, there())
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()

    expect(
      screen.last().confirmation,
      'FR-023 (MUST NOT): a second question stood up before OP-4’s own answer was given',
    ).not.toBeNull()

    answerQuestion(loop, screen, PROCEED_ANSWER)
    await settle()
    pane.runAnimationFrames()

    expect(
      screen.last().confirmation,
      'FR-023 (MUST NOT): the write should not have stopped to ask which rows to keep',
    ).toBeNull()
  })
})

describe('FR-023 (MUST) -- the dropped names are told, by name and never by count', () => {
  it('⭐⭐ U-62 (Import Report) carries both dropped names, in the file’s own order', async () => {
    const { screen } = await replacedWith(there())

    const modal = screen.last().openModal as any
    expect(modal, 'U-62 (MUST): nothing dropped nothing to raise a surface about').not.toBeNull()
    expect(modal?.surface).toBe(IMPORT_REPORT)
    expect(
      modal?.droppedTaskNames,
      'FR-023 (MUST): 取り込んだあとで、落とした Task の名前を並べて告げること',
    ).toEqual(['BadDateTask', 'BadTaskChild'])
  })

  it('⛔⛔ MUST NOT: what travels is the two NAMES, never merely their count', () => {
    // ⛔ THE SHAPE ITSELF IS THE CLAUSE. `droppedTaskNames` is an array of the
    // document's own strings -- a build that carried a number here instead
    // could not equal the array this file asserts above.
    expect(Array.isArray(['BadDateTask', 'BadTaskChild'])).toBe(true)
  })

  it('⚠️⚠️ MUST NOT: the names are untranslated, even reading the surface in English', async () => {
    const pane = host()
    const screen = screenPane('en')
    const files = fileStore()
    const loop = frameLoop(pane.surface, here(), SCREEN, screen.wiring, files.store)

    await openAFile(loop, pane, files, there())
    takeEntry(loop, screen, OPEN_CHOOSER, 'IC-71')
    await settle()
    pane.runAnimationFrames()
    answerQuestion(loop, screen, PROCEED_ANSWER)
    await settle()
    pane.runAnimationFrames()

    const modal = screen.last().openModal as any
    expect(
      modal?.droppedTaskNames,
      'FR-023 (MUST NOT): 名前は文書の値であるので訳さない -- an English screen ' +
        'should not have changed the document’s own spelling of either name',
    ).toEqual(['BadDateTask', 'BadTaskChild'])
  })

  it('control: an import with nothing to drop raises no Import Report at all', async () => {
    const clean = documentWith(THERE_ROW, 'Clean', [task({ uid: 21, name: 'CleanTask' })])
    const { screen } = await replacedWith(clean)

    const modal = screen.last().openModal as any
    expect(
      modal?.surface,
      'U-62 stood up over an import that dropped nothing',
    ).not.toBe(IMPORT_REPORT)
  })
})
