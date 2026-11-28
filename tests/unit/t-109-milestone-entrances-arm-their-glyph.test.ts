// Unit tests: on UF-48, every milestone entrance of table T-109 places the figure its row names.

/* eslint-disable @typescript-eslint/no-explicit-any -- the fake host patches a browser global and the fixtures reach into loose shapes */

import { readRepoFile } from '../spec-files'
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
import { bare, bareAll, paragraphsOf, specTable, unbroken } from '../contract/spec-table'

// Why: no case names a row: the rows are read from table T-109 at run time, so
// a sixteenth row is driven here rather than slipping past.
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

const MARKS: readonly string[] = ((): readonly string[] => {
  const row = T_012.rows.find((one) => one.id === 'SH-5')
  if (row === undefined) throw new Error('表 T-012 no longer has row SH-5')
  return (row.by[MARK_COLUMN] ?? '').split(/\s+/u).filter((one) => one.length > 0)
})()

const NOTE_PAIRING: ReadonlyMap<string, string> = ((): ReadonlyMap<string, string> => {
  const text = unbroken(readRepoFile(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
  const lines = paragraphsOf(text).filter(
    (one) => one.includes('`SH-5`') && one.includes('milestoneGlyph') && one.includes('＝'),
  )
  if (lines.length !== 1) {
    throw new Error(
      `01-04-requirements.md holds ${lines.length} paragraphs pairing SH-5's marks to ` +
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

const COMMAND_PALETTE = 'Command Palette'
const MILESTONE_ARM = 'AR-3'
// Why: the one row ID named here: table T-109 gives the toggle no arm, so
// nothing in the fifteen rows leads to it.
const GLYPH_LIST_TOGGLE = 'IC-50'

interface Entrance {
  readonly row: string
  readonly mark: string
  readonly glyph: string
}

const ENTRANCES: readonly Entrance[] = T_109.rows
  .filter((row) => bareAll(row.by[SURFACE_COLUMN] ?? '').includes(COMMAND_PALETTE))
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

const ROSTER: readonly { readonly specTableRowId: string; readonly armsShape?: string | null }[] = (
  JSON.parse(
    readRepoFile(
      join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'icon-roster.json'),
      'utf8',
    ),
  ) as { readonly icons: readonly { readonly specTableRowId: string; readonly armsShape?: string | null }[] }
).icons

const rosterShapeOf = (row: string): string | null => {
  const found = ROSTER.find((one) => one.specTableRowId === row)
  if (found === undefined) throw new Error(`icon-roster.json has no row ${row}`)
  return found.armsShape ?? null
}

// Why: the calendar, project and settings come from FR-027's template (BT-4).
const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ROW = '4a000000-0000-4000-8000-0000000000aa'
const STANDING_UID = 1

function documentWith(tasks: readonly unknown[], taskVisuals: readonly unknown[]): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    '$schema': template['$schema'],
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
          name: 'Alpha',
          derivedFromTaskUid: null,
          order: 0,
          treeState: 'auto', color: null,
          minHeightPx: null,
        },
      ],
      taskGroupMembers: tasks.map((one) => ({
        taskUid: (one as any).uid as number,
        taskGroupId: ROW,
      })),
      taskVisuals,
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      // Why: pinned so a pressed point is the same every run: OP-10 sends a null
      // place to FR-055's fit, which measures what is drawn.
      scrollDate: '2026-04-01T00:00:00',
      scrollTaskGroupId: ROW,
      scrollDateFraction: 0,
      scrollTaskGroupFraction: 0,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const milestoneTask = (uid: number, day: string): unknown => ({
  uid,
  parentTaskUid: null,
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

// Why: milestoneGlyph null is the premise: a spelling at the end was put there
// by the entrance, even for the one figure that is AT-101's default.
const unchosenVisual = (uid: number): unknown => ({
  taskUid: uid,
  shapeKind: 'milestone',
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  strokeWidthPx: null,
})

const emptyTaskGroupDocument = (): Document => documentWith([], [])

const oneMilestoneDocument = (): Document =>
  documentWith([milestoneTask(STANDING_UID, '2026-04-08')], [unchosenVisual(STANDING_UID)])

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

// Summary: The fake host shall drain the animation-frame queue and decide nothing.
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
  // Summary: The fake shall answer readScreenPartAt with the part the case set last.
  drawAt(part: ScreenPart | null): void
  view(): ScreenView | null
}

// Why: the side that drew an entry says where it is, so a case names the entry
// it presses here rather than aiming at a pixel.
function screenPane(language: DisplayLanguage = 'ja'): Pane {
  let part: ScreenPart | null = null
  let last: ScreenView | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      last = view
    },
    readFieldCommit: () => null,
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
  take(entry: string): void
  clickOnTask(uid: number): void
  clickEmptyCanvas(): void
}

function stage(document: Document): Stage {
  const frames = host()
  const pane = screenPane()
  const loop = frameLoop(frames.surface as any, document, SCREEN, pane.wiring)
  // Why: the first frame is owed by making the loop, so it is drained first.
  frames.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    frames.runAnimationFrames()
  }
  const click = (x: number, y: number): void => {
    // Why: down and up on one point: IN-1 settles a pointer operation on release,
    // and FR-001 makes a press with no drag the zero-length one.
    send(pointer('down', x, y))
    send(pointer('up', x, y))
  }
  const take = (entry: string): void => {
    // Why: CS-2 settles a gesture on what was drawn at the press, so the surface is
    // told what it drew before the button goes down.
    pane.drawAt({
      part: COMMAND_PALETTE,
      entry,
      format: null,
      taskGroupId: null,
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
    // Why: the point comes from the loop's own answer for the Task Group Area, so
    // no rectangle is computed twice.
    pane.drawAt(null)
    const values = loop.current()
    if (values === null) throw new Error('the loop has run no frame')
    const area = values.regions.taskGroupArea
    click(Math.round(area.x + area.width / 2), Math.round(area.y + 8))
  }
  return { loop, pane, send, take, clickOnTask, clickEmptyCanvas }
}

const paletteEntries = (pane: Pane): readonly CommandItem[] =>
  (pane.view()?.commandPalette?.groups ?? []).flatMap((group) => group.commands)

const armedEntrances = (pane: Pane): readonly string[] =>
  paletteEntries(pane)
    .filter((entry) => entry.isArmed)
    .map((entry) => entry.icon)

const scheduleOf = (loop: FrameLoop): any => (loop.document() as any).schedule

const storedGlyphOf = (loop: FrameLoop, uid: number): string | null => {
  const visual = (scheduleOf(loop).taskVisuals as readonly any[]).find((one) => one.taskUid === uid)
  return (visual?.milestoneGlyph ?? null) as string | null
}

const drawnGlyphOf = (loop: FrameLoop, uid: number): string | null => {
  const values = loop.current()
  if (values === null) return null
  return (taskPlacement(values.layout, uid)?.milestoneGlyph ?? null) as string | null
}

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // Why: without this, a parse that matched nothing would make the census below
    // a census of nothing.
    expect(ENTRANCES.length).toBeGreaterThan(1)
    expect(NOTE_PAIRING.size).toBeGreaterThan(1)
  })

  it('the census covers every mark SH-5 prints, once each', () => {
    // Why: entrances and marks are the same set, so a mark with no entrance or an
    // entrance arming a dropped mark fails here rather than going undriven.
    expect([...ENTRANCES.map((one) => one.mark)].sort()).toEqual([...MARKS].sort())
    expect(new Set(ENTRANCES.map((one) => one.glyph)).size).toBe(ENTRANCES.length)
  })

  it('what each entrance arms is what its roster row names', () => {
    // Why: stated on its own so a roster drifted from the manuscript (FR-053) is
    // named apart from a road that ignores what the roster carries.
    for (const entrance of ENTRANCES) {
      expect(rosterShapeOf(entrance.row), `${entrance.row} (${entrance.mark})`).toBe(entrance.glyph)
    }
  })
})

describe('表 T-109 IC-50 -- the list a person opens the figures with', () => {
  it('draws an entry for every one of the fifteen once the list is open', () => {
    // Why: an entrance that is not drawn cannot be pressed, and FR-029 makes table
    // T-109 the whole of the icons.
    const app = stage(emptyTaskGroupDocument())
    app.take(GLYPH_LIST_TOGGLE)
    const drawn = paletteEntries(app.pane).map((entry) => entry.icon)
    const missing = ENTRANCES.filter((one) => !drawn.includes(one.row))
    expect(missing.map((one) => `${one.row} (${one.mark})`), 'not on the palette').toEqual([])
  })
})

describe('⛔ every milestone entrance sets the figure its row names (SP-2 of FR-083)', () => {
  it('all fifteen -- the entrance pressed, the figure read back off the document', () => {
    // Why: one case walks the fifteen and collects every failed row, so one
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

  // Spec: IMPS-1894
  it('⭐ pressing one of them with a milestone selected ALSO arms it (SP-2)', () => {
    // Why: the document half proves the click selected: an unselected milestone
    // cannot have had its figure changed by a palette press.
    const first = ENTRANCES[0] as Entrance
    const app = stage(oneMilestoneDocument())
    app.take(GLYPH_LIST_TOGGLE)
    app.clickOnTask(STANDING_UID)
    app.take(first.row)
    expect(storedGlyphOf(app.loop, STANDING_UID), 'the selected one did not change').toBe(
      first.glyph,
    )
    expect(armedEntrances(app.pane), `${first.row} changed but did not arm`).toEqual([first.row])
  })

  it('⭐ the same entrance pressed again disarms, whatever is selected (SP-4)', () => {
    // Why: the selected side is the control: a build keeping the old guard would
    // pass the empty case and fail this one.
    const first = ENTRANCES[0] as Entrance
    for (const selected of [false, true]) {
      const app = stage(selected ? oneMilestoneDocument() : emptyTaskGroupDocument())
      app.take(GLYPH_LIST_TOGGLE)
      if (selected) app.clickOnTask(STANDING_UID)
      app.take(first.row)
      expect(armedEntrances(app.pane), `selected=${selected}: first press did not arm`).toEqual([
        first.row,
      ])
      app.take(first.row)
      expect(armedEntrances(app.pane), `selected=${selected}: second press did not disarm`).toEqual(
        [],
      )
    }
  })

  it('⛔ with nothing selected the same press ARMS instead, which is SP-1', () => {
    // Why: the other half of the split, so the two premises are told apart by
    // measurement and a road that armed nothing fails here.
    const wrong: string[] = []
    for (const entrance of ENTRANCES) {
      const app = stage(emptyTaskGroupDocument())
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

// Spec: TC-1, PTD-4
describe('⛔ a milestone is placed with the figure that is armed (FR-001)', () => {
  it('placing while armed makes a milestone at all', () => {
    const first = ENTRANCES[0] as Entrance
    const app = stage(emptyTaskGroupDocument())
    app.take(GLYPH_LIST_TOGGLE)
    app.take(first.row)
    app.clickEmptyCanvas()
    const tasks = scheduleOf(app.loop).tasks as readonly any[]
    expect(tasks).toHaveLength(1)
    expect(tasks[0].milestone).toBe(true)
    expect(tasks[0].start).toBe(tasks[0].finish)
  })

  it('⛔ with nothing armed, a click on empty canvas makes nothing', () => {
    // Why: keeps the case below honest: with AR-1 nothing is armed and MK-11 only
    // clears the selection, so a road placing whatever is armed fails here.
    const app = stage(emptyTaskGroupDocument())
    app.clickEmptyCanvas()
    expect(scheduleOf(app.loop).tasks).toHaveLength(0)
  })

  it('the figure placed is the figure armed, for all fifteen', () => {
    // Why: FR-078 keeps AT-101's default for an unchosen figure only; this road
    // armed one, so the default may not stand in.
    const wrong: string[] = []
    for (const entrance of ENTRANCES) {
      const app = stage(emptyTaskGroupDocument())
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
