// A CENSUS: every palette entrance 表 T-109 gives the milestone arm to places
// the very figure its row names -- all fifteen of them, the seven added on
// 2026-08-29 among them.
//
// The unit driven is UF-48 `frame-loop.ts` (CP-25 of 表 T-062), which takes FT-1
// of 表 T-078 on `receiveInput` and answers what the document says on
// `document()`. ⭐ The result is read where it LANDS -- on the document -- and
// not on the arm, because an arm that is set and then dropped on the way to the
// document is exactly the fault this file was written for.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY A CENSUS AND NOT A SPOT CHECK
// ---------------------------------------------------------------------------
// 表 T-109 gained IC-83 .. IC-89 on 2026-08-29, 図 F-019 gained their shapes,
// `_source/erd.json` gained their spellings and the generated roster gained
// their `armsShape` -- and every check in the repository stayed green while a
// press on one of the seven armed NOTHING, because the road from an entrance to
// an arm was a map written by hand that stopped at IC-34. The seven entries were
// DRAWN AND INERT. ⭐ So no case here names a row: the list of rows is read out
// of 表 T-109 at run time and every row it yields is driven, which is what makes
// a sixteenth row arrive here rather than slip past.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to, quoted from the manuscripts
// ---------------------------------------------------------------------------
//
//   FR-078   「作成者がマイルストーンを置くとき、`GRS` は、表 T-012 の `SH-5` が
//            挙げる図形から選べるようにすること。選ばれていないときは 表 T-058 の
//            `AT-101` が持つ既定に従うこと（MUST）」
//   FR-001   「作成者がタスク形状を構えた状態で、どのアイテムにも当たらない場所を
//            ドラッグしたとき、`GRS` は、構えている形状でその期間のタスクを作る
//            こと（表 T-023a の PD-4）。構えている形状がマイルストーンのときは
//            `Task.milestone` を真……として作ること（MUST）」、「ドラッグせずに
//            クリックしたとき……は、開始日と終了日が同じタスクを作ること（MUST）」
//            RATIONALE: ⛔ 「作るものはコマンドパレットで構えているものが決める。
//            `GRS` が形状を勝手に読み替えてはならない（MUST NOT）」
//   FR-029   「アイコンの名簿と置き場は `_assets/tbl-glossary.md` の 表 T-109 に
//            ……従うこと（MUST）」 -- 表 T-109 is 「アイコンの全数」.
//   FR-053   「どの入口がどの構えかは 表 T-109 の `構え` の欄が持つ」
//   表 T-109 IC-50  「マイルストーンの図形の一覧を、同じ入口で開閉する（`S-142`）。
//            ⭐ トグルは 1 つである」 -- the entrance a person opens the fifteen
//            with, and the one these cases open them with too.
//   the note under 表 T-012  ⛔ 「`SH-5` が並べる 15 の印と
//            `TaskVisual.milestoneGlyph` の綴りの対応は次のとおりとすること
//            （MUST）」 -- where every expected spelling below comes from.
//   表 T-028 IN-1  「ポインタ操作は……離した時点で確定する」 -- why each press is a
//            down and an up.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
// Every expected spelling is the one the note under 表 T-012 pairs to the mark
// the entrance's own 何の入口か cell prints -- read out of
// `docs/spec/01-04-requirements.md` and `docs/spec/_assets/tbl-glossary.md` at
// run time. ⛔ NOT ONE SPELLING AND NOT ONE ROW ID IS TYPED IN THIS FILE, apart
// from IC-50, which is named because it is the toggle a person opens the list
// with and 表 T-109 gives it no arm to be found by.
//
// What was read of `src/`: the exported declarations these cases call or name --
// `frameLoop`, `FrameEnvironment`, `FrameLoop`, `ScreenWiring`, the `Document`
// type, the `HumanInput` / `PointerInput` / `PointerPhase` / `PointerButton` /
// `InputModifiers` types, and the `ScreenPart` / `ScreenSurface` / `ScreenView` /
// `CommandItem` / `DisplayLanguage` types -- plus the generated data files
// `startup-template.json` and `icon-roster.json`, which are artifacts and not
// bodies. ⛔ No function body was read. ⚠️ The fixture document, the `host()`
// fake, `screenPane()` and the way an entry is taken are COPIED from
// tests/unit/uf-48-write-moment.test.ts, which drives this same unit through the
// same seam.
//
// ⚠️ ONE MORE `src/` FILE WAS OPENED AND IS DECLARED RATHER THAN CLAIMED AWAY:
// the hand-written entrance-to-arm map of `input-command-translator.ts` was
// looked at to see WHETHER it still stopped at IC-34. ⭐ THAT SET NO EXPECTED
// VALUE -- every spelling below comes out of the manuscript, and a map that had
// been filled in wrongly would fail these cases rather than agree with them.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - WHICH `DocumentCommand` carried the placement, and how many steps of undo
//     it cost. 表 T-108 owns the commands and tests/unit/edit-task.test.ts owns
//     them; these cases read the document, which is where FR-001's MUST lands.
//   - WHERE the milestone landed -- the day, the row, the UID. FR-001 states all
//     three and tests elsewhere drive them; the census is about the FIGURE.
//   - What a palette looks like while the list is folded away and a glyph is
//     armed. No row of the specification answers it, so no case asks.
//   - SP-3 of FR-083 (several selected at once). SP-1 and SP-2 are both driven
//     below because the two are the roads an entrance reaches the document by;
//     SP-3 is the same road with more subjects, and how many change at once is
//     not what this census is about.
//   - The box the palette draws the figure in -- S-138 of 表 T-206, the palette
//     half of the ruling of 2026-08-29. FR-029 states it and
//     tests/unit/uf-71.test.ts and
//     tests/contract/fr-029-glyph-coordinate-system.contract.test.ts drive it;
//     this file reaches no drawing surface.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  CommandItem,
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { taskPlacement } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'

// ===========================================================================
// The manuscripts, read at run time rather than copied (Chapter 1.9 :275)
// ===========================================================================

const T_012 = specTable('T-012')
const T_109 = specTable('T-109')

const MARK_COLUMN = '表記'
const SURFACE_COLUMN = '面'
const ARM_COLUMN = '構え'
const ENTRANCE_COLUMN = '何の入口か'

for (const [table, headings, column] of [
  ['T-012', T_012.headings, MARK_COLUMN],
  ['T-109', T_109.headings, SURFACE_COLUMN],
  ['T-109', T_109.headings, ARM_COLUMN],
  ['T-109', T_109.headings, ENTRANCE_COLUMN],
] as const) {
  if (!headings.includes(column)) {
    throw new Error(`表 ${table} no longer has a ${column} column: ${headings.join(' | ')}`)
  }
}

/** The marks SH-5 prints, in the order it prints them. */
const MARKS: readonly string[] = ((): readonly string[] => {
  const row = T_012.rows.find((one) => one.id === 'SH-5')
  if (row === undefined) throw new Error('表 T-012 no longer has row SH-5')
  return (row.by[MARK_COLUMN] ?? '').split(/\s+/u).filter((one) => one.length > 0)
})()

/**
 * The note under 表 T-012: mark -> `TaskVisual.milestoneGlyph` spelling.
 *
 * ⭐ THE ONE LINE OF THE MANUSCRIPT THAT PAIRS THEM, and the reason the census
 * below can state an expected spelling at all. Its own words: 「本注が持つのは
 * 印との対応だけである」.
 */
const NOTE_PAIRING: ReadonlyMap<string, string> = ((): ReadonlyMap<string, string> => {
  const text = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')
  const lines = text
    .split('\n')
    .filter(
      (line) => line.includes('`SH-5`') && line.includes('milestoneGlyph') && line.includes('＝'),
    )
  if (lines.length !== 1) {
    throw new Error(
      `01-04-requirements.md holds ${lines.length} lines pairing SH-5's marks to ` +
        '`milestoneGlyph` spellings, and exactly one must',
    )
  }
  return new Map(
    [...(lines[0] as string).matchAll(/([^\s／—*`]+)\s*＝\s*`([^`]+)`/gu)].map((found) => [
      found[1] as string,
      found[2] as string,
    ]),
  )
})()

/** U-26 of 表 T-103, as 表 T-109's 面 column spells it. */
const COMMAND_PALETTE = 'Command Palette'
/** The row of 表 T-023b the milestone entrances arm. */
const MILESTONE_ARM = 'AR-3'
/**
 * IC-50 of 表 T-109 -- 「マイルストーンの図形の一覧を、同じ入口で開閉する」.
 *
 * ⚠️ THE ONE ROW ID THIS FILE NAMES. The table gives it no arm and no mark, so
 * nothing in the fifteen rows below leads to it; it is the toggle that has to be
 * pressed before the fifteen are on the screen at all.
 */
const GLYPH_LIST_TOGGLE = 'IC-50'

interface Entrance {
  /** The row of 表 T-109. */
  readonly row: string
  /** The mark of SH-5 its 何の入口か cell prints. */
  readonly mark: string
  /** The spelling the note under 表 T-012 pairs to that mark. */
  readonly glyph: string
}

const ENTRANCES: readonly Entrance[] = T_109.rows
  .filter((row) => bare(row.by[SURFACE_COLUMN] ?? '') === COMMAND_PALETTE)
  .filter((row) => bare(row.by[ARM_COLUMN] ?? '') === MILESTONE_ARM)
  .map((row): Entrance => {
    const cell = row.by[ENTRANCE_COLUMN] ?? ''
    const printed = MARKS.filter((mark) => cell.includes(mark))
    if (printed.length !== 1) {
      throw new Error(`表 T-109's ${row.id} prints ${printed.length} of SH-5's marks: ${cell}`)
    }
    const mark = printed[0] as string
    const glyph = NOTE_PAIRING.get(mark)
    if (glyph === undefined) {
      throw new Error(`the note under 表 T-012 pairs no spelling to ${mark} (${row.id})`)
    }
    return { row: row.id, mark, glyph }
  })

// ===========================================================================
// What the generator carried into `src/` -- the roster row each entrance names
// ===========================================================================

const ROSTER: readonly { readonly rowId: string; readonly armsShape?: string | null }[] = (
  JSON.parse(
    readFileSync(
      join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'icon-roster.json'),
      'utf8',
    ),
  ) as { readonly icons: readonly { readonly rowId: string; readonly armsShape?: string | null }[] }
).icons

const rosterShapeOf = (row: string): string | null => {
  const found = ROSTER.find((one) => one.rowId === row)
  if (found === undefined) throw new Error(`icon-roster.json has no row ${row}`)
  return found.armsShape ?? null
}

// ===========================================================================
// The documents these cases drive
// ===========================================================================

// BT-4 of 表 T-034 -- the template FR-027 keeps exactly one of. The calendar,
// the project and the settings come from it.
const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ROW = '4a000000-0000-4000-8000-0000000000aa'
/** The milestone the selection road presses an entrance against. */
const STANDING_UID = 1

/** One row, holding the Tasks and the TaskVisuals given. */
function documentWith(tasks: readonly unknown[], taskVisuals: readonly unknown[]): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks,
      resources: [],
      assignments: [],
      taskGroups: [
        {
          id: ROW,
          parentId: null,
          label: 'Alpha',
          derivedFromTaskUid: null,
          order: 0,
          isCollapsed: false,
          isHidden: false,
          color: null,
          height: null,
        },
      ],
      taskGroupMembers: tasks.map((one) => ({
        taskUid: (one as any).uid as number,
        groupId: ROW,
        stackOrder: null,
      })),
      taskVisuals,
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      // ⭐ PINNED so the point a case presses on is the same point every run:
      // OP-10 of 表 T-024a sends a null place to FR-055's fit, which measures
      // what is drawn.
      scrollDate: '2026-04-01T00:00:00',
      scrollGroupId: ROW,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const milestoneTask = (uid: number, day: string): unknown => ({
  uid,
  wbsParentUid: null,
  wbsOrder: uid,
  name: null,
  start: `${day}T00:00:00`,
  finish: `${day}T00:00:00`,
  milestone: true,
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
})

/**
 * The columns `TaskVisual` holds, with the figure UNCHOSEN.
 *
 * ⛔ `milestoneGlyph: null` IS THE PREMISE OF THE SELECTION ROAD. AT-101 reads
 * `null` as 「選ばれていない」, so a case that ends with a spelling in that column
 * has watched the entrance put it there -- including the one entrance whose
 * figure IS AT-101's default, which a case starting from the default could not
 * tell apart from a road that wrote nothing at all.
 */
const unchosenVisual = (uid: number): unknown => ({
  taskUid: uid,
  nameAnchor: null,
  nameAlign: null,
  shapeKind: 'milestone',
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  lineWeight: null,
})

/** ⛔ NOTHING SELECTED and no Task at all -- SP-1's premise (FR-083). */
const emptyRowDocument = (): Document => documentWith([], [])

/** One milestone standing on the row, its figure unchosen -- SP-2's premise. */
const oneMilestoneDocument = (): Document =>
  documentWith([milestoneTask(STANDING_UID, '2026-04-08')], [unchosenVisual(STANDING_UID)])

// ===========================================================================
// The host UF-48 is given
// ===========================================================================

/** BO-1 of 表 T-077 has already settled these by the time a loop exists. */
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

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of 表 T-060 puts the browser in
 * this layer. ⛔ Nothing in this fake decides anything: it drains the queue.
 */
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
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

interface Pane {
  readonly wiring: ScreenWiring
  /** What `readScreenPartAt` answers from now on. The case decides; the fake does not. */
  drawAt(part: ScreenPart | null): void
  /** The last description the loop handed the surface. */
  view(): ScreenView | null
}

/**
 * IF-9's far side, stood in for.
 *
 * ⚠️ Chapter 5.3 states under 表 T-065 (MUST) that the side which DREW an entry
 * is the side that says where it is, and no one else may compute the same
 * rectangle -- so a case that wants a press to land on an entry says so here
 * rather than aiming at a pixel.
 */
function screenPane(language: DisplayLanguage = 'ja'): Pane {
  let part: ScreenPart | null = null
  let last: ScreenView | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      last = view
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
    view: () => last,
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// ===========================================================================
// Spelling one happening
// ===========================================================================

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  readonly pane: Pane
  send(input: HumanInput): void
  /** Press one entry of 表 T-109 on the palette. */
  take(entry: string): void
  /** Click on the figure of the Task named. */
  clickOnTask(uid: number): void
  /** Click where nothing has been drawn -- PD-4 of 表 T-023a. */
  clickEmptyCanvas(): void
}

function stage(document: Document): Stage {
  const frames = host()
  const pane = screenPane()
  const loop = frameLoop(frames.surface as any, document, SCREEN, pane.wiring)
  // The first frame is owed by the loop being made (BO-5 of 表 T-077).
  frames.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    frames.runAnimationFrames()
  }
  const click = (x: number, y: number): void => {
    // IN-1 of 表 T-028: 「ポインタ操作は……離した時点で確定する」, and FR-001 makes
    // a press with no drag the zero-length one -- so both go on one point.
    send(pointer('down', x, y))
    send(pointer('up', x, y))
  }
  const take = (entry: string): void => {
    // ⚠️ CS-2 of 表 T-066 settles a gesture on what was drawn AT THE PRESS, so
    // the surface is told what it has drawn before the button goes down.
    pane.drawAt({
      part: COMMAND_PALETTE,
      entry,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
    click(500, 300)
    pane.drawAt(null)
  }
  const placedOf = (uid: number) => {
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame')
    const found = taskPlacement(values.layout, uid)
    if (found === null) throw new Error(`Task ${uid} is not drawn in this frame`)
    return found
  }
  const clickOnTask = (uid: number): void => {
    pane.drawAt(null)
    const placed = placedOf(uid)
    click(Math.round(placed.x + placed.width / 2), Math.round(placed.y + placed.height / 2))
  }
  const clickEmptyCanvas = (): void => {
    // ⛔ `drawAt(null)` is the premise: 「どのアイテムにも当たらない場所」. The
    // point is taken from the loop's own answer for where the Row Area is, so
    // no rectangle is computed twice.
    pane.drawAt(null)
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame')
    const area = values.regions.rowArea
    click(Math.round(area.x + area.width / 2), Math.round(area.y + 8))
  }
  return { loop, pane, send, take, clickOnTask, clickEmptyCanvas }
}

/** Every entry the palette is describing right now. */
const paletteEntries = (pane: Pane): readonly CommandItem[] =>
  (pane.view()?.commandPalette?.groups ?? []).flatMap((group) => group.commands)

/** The entrances the description marks as armed, by row of 表 T-109. */
const armedEntrances = (pane: Pane): readonly string[] =>
  paletteEntries(pane)
    .filter((entry) => entry.isArmed)
    .map((entry) => entry.icon)

const scheduleOf = (loop: FrameLoop): any => (loop.document() as any).schedule

/** What the document stores as one Task's figure -- `null` while unchosen (AT-101). */
const storedGlyphOf = (loop: FrameLoop, uid: number): string | null => {
  const visual = (scheduleOf(loop).taskVisuals as readonly any[]).find((one) => one.taskUid === uid)
  return (visual?.milestoneGlyph ?? null) as string | null
}

/** The figure the layout resolved through AT-101 -- what is actually drawn. */
const drawnGlyphOf = (loop: FrameLoop, uid: number): string | null => {
  const values = loop.current()
  if (values === null) return null
  return (taskPlacement(values.layout, uid)?.milestoneGlyph ?? null) as string | null
}

// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT MATCHED NOTHING WOULD MAKE THE CENSUS BELOW
    // A CENSUS OF NOTHING (rule 04 section 2).
    expect(ENTRANCES.length).toBeGreaterThan(1)
    expect(NOTE_PAIRING.size).toBeGreaterThan(1)
  })

  it('the census covers every mark SH-5 prints, once each', () => {
    // ⭐ THE POINT OF A CENSUS. 表 T-109 is 「アイコンの全数」 (FR-029) and SH-5 is
    // the whole of the figures, so the entrances and the marks are the same set
    // -- and a mark that gained no entrance, or an entrance that arms a mark
    // SH-5 dropped, fails HERE rather than being quietly left undriven.
    expect([...ENTRANCES.map((one) => one.mark)].sort()).toEqual([...MARKS].sort())
    expect(new Set(ENTRANCES.map((one) => one.glyph)).size).toBe(ENTRANCES.length)
  })

  it('what each entrance arms is what its roster row names', () => {
    // FR-053: 「どの入口がどの構えかは 表 T-109 の `構え` の欄が持つ」, and the finer
    // half of that join reaches `src/` as `armsShape` of the generated roster.
    // ⭐ Stated on its own so that a roster which drifted from the manuscript is
    // named as a DIFFERENT fault from a road that ignores what it carries.
    for (const entrance of ENTRANCES) {
      expect(rosterShapeOf(entrance.row), `${entrance.row} (${entrance.mark})`).toBe(entrance.glyph)
    }
  })
})

describe('表 T-109 IC-50 -- the list a person opens the figures with', () => {
  it('draws an entry for every one of the fifteen once the list is open', () => {
    // ⛔ AN ENTRANCE THAT IS NOT DRAWN CANNOT BE PRESSED, and FR-029 (MUST) makes
    // 表 T-109 the whole of the icons. ⚠️ This is HALF of what went wrong with the
    // seven: they were drawn, and inert. The other half is below.
    const app = stage(emptyRowDocument())
    app.take(GLYPH_LIST_TOGGLE)
    const drawn = paletteEntries(app.pane).map((entry) => entry.icon)
    const missing = ENTRANCES.filter((one) => !drawn.includes(one.row))
    expect(missing.map((one) => `${one.row} (${one.mark})`), 'not on the palette').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The census on the road FR-083 opens: an entrance pressed with a milestone
// selected. ⭐ This is the road the fault of 2026-08-29 was measured on --
// 「setting IC-88 on a selected milestone left a ◇ while IC-32 turned it into a ☆」.
// ---------------------------------------------------------------------------

describe('⛔ every milestone entrance sets the figure its row names (SP-2 of FR-083)', () => {
  it('all fifteen -- the entrance pressed, the figure read back off the document', () => {
    // FR-083: 「作成者がタスクまたはマイルストーンを選んだ状態でパレットの形状を
    // 押したとき、`GRS` は、選んでいるものすべての形状をその形状に変えること」, with
    // SP-2 「1 つ選んでいる | その 1 つの形状を変える。構えは変えない」.
    // ⭐ ONE CASE WALKS THE FIFTEEN, which is what Chapter 1.9 (:275) asks of a
    // test driven by a table -- and it collects EVERY row that failed, so one
    // failure names all of them instead of stopping at the first.
    const wrong: string[] = []
    for (const entrance of ENTRANCES) {
      const app = stage(oneMilestoneDocument())
      app.take(GLYPH_LIST_TOGGLE)
      app.clickOnTask(STANDING_UID)
      app.take(entrance.row)
      const stored = storedGlyphOf(app.loop, STANDING_UID)
      const drawn = drawnGlyphOf(app.loop, STANDING_UID)
      if (stored !== entrance.glyph || drawn !== entrance.glyph) {
        wrong.push(
          `${entrance.row} (${entrance.mark}): wanted ${entrance.glyph}, ` +
            `stored ${String(stored)}, drew ${String(drawn)}`,
        )
      }
    }
    expect(wrong, wrong.join('; ')).toEqual([])
  })

  it('⚠️ pressing one of them with a milestone selected does NOT arm it (SP-2)', () => {
    // SP-2 of FR-083: 「構えは変えない」 -- and this case is also what proves the
    // case above drove SP-2 at all. ⛔ If the click on the figure had failed to
    // select it, every press would have fallen through to SP-1 and ARMED, and
    // the case above would have been measuring a road that never reached the
    // document. Reading the arm back is what tells the two roads apart.
    const first = ENTRANCES[0] as Entrance
    const app = stage(oneMilestoneDocument())
    app.take(GLYPH_LIST_TOGGLE)
    app.clickOnTask(STANDING_UID)
    app.take(first.row)
    expect(armedEntrances(app.pane), `${first.row} armed instead of changing`).toEqual([])
  })

  it('⛔ with nothing selected the same press ARMS instead, which is SP-1', () => {
    // SP-1: 「何も選んでいない | その形状を構える」. ⭐ The other half of the split,
    // so the two premises are told apart by measurement rather than by
    // assumption -- and so a road that armed nothing at all (which is what
    // IC-83 .. IC-89 did until 2026-08-29) fails here.
    const wrong: string[] = []
    for (const entrance of ENTRANCES) {
      const app = stage(emptyRowDocument())
      app.take(GLYPH_LIST_TOGGLE)
      app.take(entrance.row)
      const armed = armedEntrances(app.pane)
      if (armed.length !== 1 || armed[0] !== entrance.row) {
        wrong.push(`${entrance.row} (${entrance.mark}) armed ${JSON.stringify(armed)}`)
      }
    }
    expect(wrong, wrong.join('; ')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The census on the road FR-001 opens: an entrance armed, then a milestone
// placed with it.
// ---------------------------------------------------------------------------

describe('⛔ a milestone is placed with the figure that is armed (FR-001)', () => {
  it('placing while armed makes a milestone at all', () => {
    // FR-001 (MUST): 「構えている形状がマイルストーンのときは `Task.milestone` を真、
    // それ以外の形状のときは偽として作ること」, and 「ドラッグせずにクリックしたとき
    // ……は、開始日と終了日が同じタスクを作ること」.
    const first = ENTRANCES[0] as Entrance
    const app = stage(emptyRowDocument())
    app.take(GLYPH_LIST_TOGGLE)
    app.take(first.row)
    app.clickEmptyCanvas()
    const tasks = scheduleOf(app.loop).tasks as readonly any[]
    expect(tasks).toHaveLength(1)
    expect(tasks[0].milestone).toBe(true)
    expect(tasks[0].start).toBe(tasks[0].finish)
  })

  it('⛔ with nothing armed, a click on empty canvas makes nothing', () => {
    // ⭐ THE CASE THAT KEEPS THE ONE BELOW HONEST. AR-1 of 表 T-023b is 「なし
    // （既定）」 and MK-11 of 表 T-023 makes a click on empty canvas clear the
    // selection rather than place anything. Without it, a road that placed a
    // milestone whatever was armed would look like a road that honoured the arm.
    const app = stage(emptyRowDocument())
    app.clickEmptyCanvas()
    expect(scheduleOf(app.loop).tasks).toHaveLength(0)
  })

  it('the figure placed is the figure armed, for all fifteen', () => {
    // FR-001's RATIONALE (MUST NOT): 「作るものはコマンドパレットで構えているものが
    // 決める。`GRS` が形状を勝手に読み替えてはならない（MUST NOT）」, and FR-078
    // (MUST): 「作成者がマイルストーンを置くとき、`GRS` は、表 T-012 の `SH-5` が
    // 挙げる図形から選べるようにすること。選ばれていないときは 表 T-058 の `AT-101`
    // が持つ既定に従うこと」 -- the default being reserved for 「選ばれていないとき」,
    // which is NOT this road: the person armed a figure and then placed one.
    //
    // ⛔ THIS CASE IS RED, AND IT IS RED ABOUT THE IMPLEMENTATION AND NOT ABOUT
    // THE MANUSCRIPT. Measured 2026-08-30: the placement writes a `TaskVisual`
    // whose `milestoneGlyph` is `null` for every one of the fifteen, so AT-101's
    // default is what gets drawn and a person who armed ☆ is handed ◇.
    // ⚠️ IT IS NOT THE FAULT THE SEVEN NEW ENTRANCES HAD. The arm itself is
    // right for all fifteen -- the SP-1 case above passes, and so does the whole
    // SP-2 census -- so this is one seam further along, where the arm should
    // reach the NEW Task. ⛔ No case here was softened to make it pass: the two
    // requirements settle the answer between them.
    // ⭐ THE SAME FAULT IS ALREADY WRITTEN DOWN, and this case is the machine
    // record the ledger says it has not got: D-140 of
    // `docs/development-records/defects.md` (「パレットから置いたマイルストーンが、
    // 構えた図形にならず必ず菱形になる」, 試験の欄 「⛔ 未」), left unfixed on
    // purpose by CR-303 because how the new `Task`'s `uid` reaches CM-21 is a
    // design ruling and not a repair. ⚠️ The ledger notes the way round -- select
    // what was placed and press the entrance -- which is the SP-2 census above,
    // and it is green.
    const wrong: string[] = []
    for (const entrance of ENTRANCES) {
      const app = stage(emptyRowDocument())
      app.take(GLYPH_LIST_TOGGLE)
      app.take(entrance.row)
      app.clickEmptyCanvas()
      const tasks = scheduleOf(app.loop).tasks as readonly any[]
      if (tasks.length !== 1) {
        wrong.push(`${entrance.row} (${entrance.mark}): placed ${tasks.length} Tasks`)
        continue
      }
      const uid = tasks[0].uid as number
      const stored = storedGlyphOf(app.loop, uid)
      const drawn = drawnGlyphOf(app.loop, uid)
      if (stored !== entrance.glyph || drawn !== entrance.glyph) {
        wrong.push(
          `${entrance.row} (${entrance.mark}): wanted ${entrance.glyph}, ` +
            `stored ${String(stored)}, drew ${String(drawn)}`,
        )
      }
    }
    expect(wrong, wrong.join('; ')).toEqual([])
  })
})
