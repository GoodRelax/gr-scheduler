// Unit tests: UF-47 single-html-shell.ts and UF-48 frame-loop.ts, driven through the frame loop.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  compareDays,
  dayOf,
  planActualState,
  textOfDay,
  type CalendarDay,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
import {
  rulerWeekdayWords,
  type DisplayLanguage,
  type ScreenSurface,
  type ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type {
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type HeldDocumentCall,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { validateDocument } from '../fixtures/grs-document'
// Why: borrowed from the contract kind, as it reads a table from the .md at run time, so T-230's columns cannot fall behind.
import { specTable } from '../contract/spec-table'
import { displayRatioAt } from '../fixtures/display-scale'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'

// Why: BT-4 (FR-027) is the one document whose values the specification decided, so the cases build on it
// rather than invent a second idea of what a document looks like.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readRepoFile(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'
// Why: an id no task group carries, for OP-10's case of a stored task group that is gone.
const GONE = '99999999-9999-4999-8999-999999999999'

const FIRST_START = '2026-04-01T00:00:00'

// Why: an actual that starts after its plan has finished (OC-5, drawn by FR-084), long enough to end beyond
// every plan bar and short enough to leave the fit a readable zoom.
const LATE_ACTUAL_START = '2026-04-20T00:00:00'
const LATE_ACTUAL_LAST_DAY = '2026-05-15T00:00:00'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture edits a cloned template and the host fakes browser globals */

// Why: IV-1, IV-2, IV-6, IV-8 and IV-10 hold by construction and validateDocument keeps the shape honest; the calendar
// (IV-7, IV-17), project and settings come from the template, whose two premises the cases at the head pin.
function twoTaskGroupDocument(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  // Trap: every Task column is named here; spreading the template's Task instead once grew an unseen actual bar that shrank
  // the fit (FR-055, OC-5), and the schema's additionalProperties false catches a dropped or stray column.
  const task = (uid: number, start: string, finish: string, name: string): Task => ({
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name,
    start,
    finish,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
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
  const row = (id: string, parentId: string | null, label: string) => ({
    id,
    parentId,
    name: label,
    derivedFromTaskUid: null,
    order: 0,
    treeState: 'auto', editPermission: null,
    color: null,
    minHeightPx: null,
  })
  const draft = {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100 },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [task(1, FIRST_START, '2026-04-10T00:00:00', 'One'), task(2, '2026-04-06T00:00:00', '2026-04-20T00:00:00', 'Two')],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, 'Alpha'), row(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: 1, taskGroupId: ALPHA },
        { taskUid: 2, taskGroupId: BETA },
      ],
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
  edit(draft)
  return draft as unknown as Document
}

const settingsOf = (document: Document): any => (document as any).documentSettings
const rowsOf = (document: Document): any[] => (document as any).schedule.taskGroups

const T_230 = specTable('T-230')

const headingWith = (needle: string): string => {
  const found = T_230.headings.find((heading) => heading.includes(needle))
  if (found === undefined) throw new Error(`table T-230 has no column mentioning ${needle}`)
  return found
}

const COL_WS3 = headingWith('WS-3')
const COL_HISTORY = headingWith('履歴')
const COL_STAMP = headingWith('刻印')
const COL_UNDO_STEP = headingWith('取り消し')

const cellOf = (row: string, column: string): string => {
  const found = T_230.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-230 has no row ${row}`)
  return found.by[column] ?? ''
}

// Why: the rows are read from the table, not typed, so a manuscript that moves another caller into this column reaches this file.
const HELD_TASK_GROUPS = T_230.rows
  .filter((row) => row.by[COL_WS3] === '呼び手が持って来る')
  .map((row) => row.id)

// Why: a replacement that names no row is not asserted here: HeldDocumentCall narrows the argument
// to the named rows, so typed code cannot write one.
const bringing = (row: string, document: Document): HeldDocumentCall =>
  ({ row, document }) as unknown as HeldDocumentCall

// Why: RD-6 is the only row whose WS-3 says the caller brings the document; these cases count frames, and name
// the row only because T-230 forbids a replacement that names none.
const RESTORED = (document: Document): HeldDocumentCall => bringing('RD-6', document)

// Why: read rather than typed; the shell publishes no history, so pressing a key is the only way a test can ask what it holds.
function keyOf(row: string): KeyInput {
  const found = specTable('T-036').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  const assignment = (found.by['割当'] ?? '').split('/')[0] ?? ''
  const parts = assignment
    .replace(/`/g, '')
    .replace(/＋/g, '+')
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const last = parts[parts.length - 1]
  if (last === undefined) throw new Error(`table T-036 row ${row} states no assignment`)
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

// Spec: SK-20, UN-13, SK-6
const SK_20 = keyOf('SK-20')
const SK_6 = keyOf('SK-6')

const stateOf = (loop: FrameLoop) => ({
  title: (loop.document() as any).schedule.project.title as string | null,
  statusDate: (loop.document() as any).schedule.project.statusDate as string | null,
})

// Why: BO-1 settles these before a frame loop exists; FR-051 keeps the last two out of the settings as they differ
// from one machine to the next, and S-116 is their cap, not their value.
const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly drawn: string[]
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
  frames(): number
}

const realRaf = (globalThis as any).requestAnimationFrame

// Why: requestAnimationFrame does not exist under node, so each case installs its own and a frame
// runs only when the case says it runs.
function host(): Host {
  const drawn: string[] = []
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    drawn,
    surface: {
      showMarqueeOverlaySvg: () => undefined,
      showSvg: (svg: string) => {
        drawn.push(svg)
      },
    },
    runAnimationFrames: () => {
      // Why: bounded, so a loop that asks for a frame from inside a frame (NFR-010 forbids it) ends the test instead of hanging.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
    frames: () => drawn.length,
  }
}

afterEach(() => {
  // Why: only the weekday case pins the clock; restoring it here rather than in a finally hands the real clock back
  // even when that case fails.
  vi.useRealTimers()
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

function drawnPoints(svg: string): { readonly x: number; readonly y: number }[] {
  const points: { x: number; y: number }[] = []
  for (const attribute of svg.matchAll(/points="([^"]+)"/g)) {
    for (const pair of (attribute[1] ?? '').trim().split(/\s+/)) {
      const [x, y] = pair.split(',').map(Number)
      if (x !== undefined && y !== undefined) points.push({ x, y })
    }
  }
  return points
}

const labelsInOrder = (svg: string): readonly string[] =>
  [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((hit) => (hit[1] ?? '').trim())

// Summary: the picture with every printed word taken out, which is the part FR-038 lets no language reach.
const withoutWords = (svg: string): string =>
  svg.replace(/(<text\b[^>]*>)[\s\S]*?(<\/text>)/g, '$1$2')

// Why: carries rather than is, since FR-038 forbids writing a weekday into a table, so only the dictionary's roster
// is asked; an empty entry is skipped, as FR-038's fallback for an unwritten word matches every label.
const weekdaySlotIn = (label: string, roster: readonly string[]): number =>
  roster.findIndex((word) => word !== '' && label.includes(word))

const day = (text: string): CalendarDay => {
  const parsed = dayOf(text)
  if (parsed === null) throw new Error(`${text} is not a day`)
  return parsed
}

// Spec: BT-4, FR-027, FR-062, IV-1, IV-2, IV-6, IV-7, IV-8, IV-10, IV-17, OP-10
// Why: UF-47 boots against window the moment it is imported, so nothing here imports it; UF-48 receives the
// startup winner as its first argument, so BO-2 is out of reach from this file.
describe('the document these cases drive', () => {
  it('is a valid GRS JSON document', () => {
    const report = validateDocument(twoTaskGroupDocument())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('carries no actual: every Task is PS-1 of table T-019a', () => {
    // Why: a premise: FR-055 fits the drawn extent and OC-5 counts an actual outside its plan, so an actual nobody
    // asked for moves the zoom every case below stands on.
    for (const task of (twoTaskGroupDocument() as any).schedule.tasks) {
      expect(planActualState(task)).toBe('notStarted')
      expect(task.actualStart).toBeNull()
      expect(task.stop).toBeNull()
      expect(task.actualFinish).toBeNull()
    }
  })

  it('stores no place: the OP-10 cases below really drive the null side', () => {
    // Why: OP-10 branches on whether S-77 and S-78 are null, so a template that filled either would send the OP-10 cases down the other branch.
    const settings = settingsOf(twoTaskGroupDocument())
    expect(settings.scrollDate).toBeNull()
    expect(settings.scrollTaskGroupId).toBeNull()
  })
})

// Spec: BO-5, NFR-011
describe('UF-48 frameLoop -- BO-5 of table T-077', () => {
  it('puts the first frame up as boot ends, not on the animation frame after it', () => {
    // Why: the first frame belongs to BO-5, not to a trigger of T-078, so it is up before any animation frame has run.
    const pane = host()
    frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    expect(pane.frames()).toBe(1)
  })

  it('runs BO-5 exactly once -- boot does not owe a second frame', () => {
    const pane = host()
    frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    pane.runAnimationFrames()
    expect(pane.frames()).toBe(1)
  })

  it('NFR-011: that first frame is whole -- sized to the settled screen and carrying the shapes', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const svg = pane.drawn[0] ?? ''

    expect(svg).toContain(`width="${SCREEN.width}"`)
    expect(svg).toContain(`height="${SCREEN.height}"`)
    expect(drawnPoints(svg).length).toBeGreaterThan(0)

    const values = loop.current()
    expect(values).not.toBeNull()
    expect(values!.regions.scheduleCanvas.width).toBe(SCREEN.width)
    expect(values!.regions.appHeader.height).toBe(SCREEN.appHeaderHeight)
    expect(values!.layout.placements).toHaveLength(2)
  })
})

// Spec: OP-10, OP-6, FR-055, FR-084, OC-5, OC-6, IV-3, FR-017, FR-039, DS-4, FR-051, WY-1
describe('OP-10 of table T-024a -- a place the person has not chosen yet', () => {
  it('does not read a null scrollDate as 1970-01-01', () => {
    // Why: reading the null as day zero would put the origin at the epoch and the schedule decades off the right edge.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const origin = loop.current()!.layout.originDay

    expect(origin).not.toBeNull()
    expect(textOfDay(origin!)).not.toBe('1970-01-01')
    expect(compareDays(origin!, day(FIRST_START))).toBeLessThanOrEqual(0)
  })

  it('leaves every drawn shape inside the screen, which is what fitting to it means', () => {
    // Why: at the stored 1x zoom the twenty days would need no fitting, so this measures that OP-10 chose a place and zoom at all.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const values = loop.current()!

    for (const point of drawnPoints(pane.drawn[0] ?? '')) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(SCREEN.width)
    }
    for (const placement of values.layout.placements) {
      expect(placement.x).toBeGreaterThanOrEqual(values.regions.taskGroupArea.x)
      expect(placement.x + placement.width).toBeLessThanOrEqual(
        values.regions.taskGroupArea.x + values.regions.taskGroupArea.width,
      )
    }
  })

  it('FR-055: an actual bar that runs past its plan is inside the screen too', () => {
    // Why: the sibling cases drive plan-only Tasks, and a fit on plans alone still puts every plan bar on screen;
    // what leaves the screen is the actual, so the fit must count the part of it sticking out (OC-5).
    const late = twoTaskGroupDocument((draft) => {
      draft.schedule.tasks[0].actualStart = LATE_ACTUAL_START
      draft.schedule.tasks[0].stop = LATE_ACTUAL_LAST_DAY
    })
    expect(validateDocument(late).valid).toBe(true)

    const pane = host()
    const values = frameLoop(pane.surface, late, SCREEN).current()!
    const placement = values.layout.placements.find((onePoint) => onePoint.taskUid === 1)!
    const taskGroupArea = values.regions.taskGroupArea
    const actualEnd = placement.actualX! + placement.actualWidth

    // Why: a premise: OC-6 takes a below-shifted actual out of the count, so this case means what it says only while
    // the actual is drawn on the plan and runs past it.
    expect(placement.actualPlacement).toBe('inside')
    expect(placement.actualX).not.toBeNull()
    expect(actualEnd).toBeGreaterThan(placement.x + placement.width)

    expect(placement.occupiedX1).toBeGreaterThanOrEqual(actualEnd)

    // Why: compared on NS-3's 0.01 px grid, below which WY-3 measures nothing; the fit divides and multiplies back,
    // so its last unit can land off by a float error, while any overhang a reader could see still fails.
    const onNs3Grid = (px: number): number => Math.round(px * 100) / 100
    expect(placement.actualX!).toBeGreaterThanOrEqual(taskGroupArea.x)
    expect(onNs3Grid(actualEnd)).toBeLessThanOrEqual(onNs3Grid(taskGroupArea.x + taskGroupArea.width))

    // Why: the extent grew, so the fit gives a day less room than for the plan alone; a plan-only measure would draw the overhang off the edge.
    const planOnly = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN).current()!
    expect(values.layout.pxPerDay).toBeLessThan(planOnly.layout.pxPerDay)
  })

  it('is a reading rule: the stored place stays null, OP-6 does not fill it in', () => {
    const document = twoTaskGroupDocument()
    const pane = host()
    const loop = frameLoop(pane.surface, document, SCREEN)

    expect(settingsOf(loop.document()).scrollDate).toBeNull()
    expect(settingsOf(loop.document()).scrollTaskGroupId).toBeNull()
    expect(settingsOf(loop.document()).zoomX).toBe(settingsOf(document).zoomX)
    expect(settingsOf(loop.document()).zoomY).toBe(settingsOf(document).zoomY)
  })

  it('holds when scrollTaskGroupId names a task group that is gone, even though scrollDate holds a day', () => {
    // Why: IV-3 does not keep the stored place pointing at a live task group, so this state is reachable in a valid
    // document; CD-2 makes it on purpose when a task group is deleted.
    const stale = twoTaskGroupDocument((draft) => {
      draft.documentSettings.scrollDate = '2026-04-05T00:00:00'
      draft.documentSettings.scrollTaskGroupId = GONE
    })
    expect(validateDocument(stale).valid).toBe(true)

    const pane = host()
    const fitted = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN).current()!
    const loop = frameLoop(pane.surface, stale, SCREEN)
    const values = loop.current()!

    expect(values.layout.originDay).toEqual(fitted.layout.originDay)
    expect(values.layout.pxPerDay).toBe(fitted.layout.pxPerDay)
  })

  it('does not hold when the stored place is good: that day and that zoom are kept', () => {
    // Why: S-77 and S-78 are what FR-051 writes, and WY-1 wants the same JSON back looking the same, so a chosen place is used as it stands.
    const placed = twoTaskGroupDocument((draft) => {
      draft.documentSettings.scrollDate = '2026-04-05T00:00:00'
      draft.documentSettings.scrollTaskGroupId = ALPHA
    })
    const pane = host()
    const values = frameLoop(pane.surface, placed, SCREEN).current()!

    expect(values.layout.originDay).toEqual(day('2026-04-05'))
    expect(
      values.layout.pxPerDay,
      'FR-039 の 表 T-252 の DS-4: 描く 1 日の幅は S-1 x zoomX に描く比を掛けた値',
    ).toBe(
      SETTINGS_CONSTANTS.pxPerDayAt1x *
        settingsOf(placed).zoomX *
        displayRatioAt(settingsOf(placed).displayScale),
    )
  })
})

// Spec: HF-8, OP-10, HR-6, WY-1, HR-1a
describe('HF-8 of table T-051 -- what boot must not do', () => {
  const collapsed = () =>
    twoTaskGroupDocument((draft) => {
      draft.schedule.taskGroups[0].treeState = 'collapsed'
    })

  it('keeps the collapse the person saved', () => {
    const document = collapsed()
    expect(validateDocument(document).valid).toBe(true)

    const pane = host()
    const loop = frameLoop(pane.surface, document, SCREEN)

    expect(rowsOf(loop.document()).map((oneRect) => oneRect.treeState)).toEqual(['collapsed', 'auto'])
  })

  it('and draws the picture that collapse means -- the task group under it stays undrawn', () => {
    // Why: HF-8 could be honored in the document and still be applied to the frame, so the drawn picture is compared too.
    const pane = host()
    const withCollapse = frameLoop(pane.surface, collapsed(), SCREEN).current()!
    const withoutCollapse = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN).current()!

    expect(withoutCollapse.layout.taskGroups.map((oneRect) => oneRect.taskGroupId)).toEqual([ALPHA, BETA])
    expect(withCollapse.layout.taskGroups.map((oneRect) => oneRect.taskGroupId)).toEqual([ALPHA])
    expect(withCollapse.layout.placements.map((onePoint) => onePoint.taskUid)).toEqual([1])
  })
})

// Spec: FT-2, FT-3, NFR-010
describe('table T-078 -- the whole of what may wake a frame', () => {
  it('FT-3: a change of size runs exactly one more frame', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const before = pane.frames()

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before + 1)
    expect(pane.drawn[before]).toContain('width="1400"')
    expect(loop.current()!.regions.scheduleCanvas.width).toBe(1400)
  })

  it('FT-2: replacing the current value runs exactly one more frame', () => {
    // Why: the call names its RD-6 row, as T-230 requires; that row's caller-brought document and kept stamp
    // make the very document handed over the one that lands.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const before = pane.frames()
    const next = twoTaskGroupDocument((draft) => {
      draft.schedule.tasks[1].finish = '2026-05-29T00:00:00'
    })

    loop.holdDocument(RESTORED(next))
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before + 1)
    expect(loop.document()).toBe(next)
  })

  it('NFR-010: with no trigger, no frame -- reading the current values is not one', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const before = pane.frames()

    for (let turn = 0; turn < 5; turn += 1) {
      loop.current()
      loop.document()
      pane.runAnimationFrames()
    }

    expect(pane.frames()).toBe(before)
  })

  it('NFR-010: a resize that does not change the size is not FT-3', () => {
    // Why: the window fires resize for things that leave the box alone, and the header height and scrollbar thickness
    // usually come back the same; LY-5 makes UF-48 the only holder of the previous size, so the comparison lives here.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const before = pane.frames()

    loop.resize({ ...SCREEN })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before)
  })
})

// Spec: CA-2, CA-4
describe('ADR-001 and table T-071 -- computed once at the head of a frame', () => {
  it('CA-2: the three values are not rebuilt while the frame lasts', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    const first = loop.current()
    expect(first).not.toBeNull()
    expect(loop.current()).toBe(first)
    expect(loop.current()!.layout).toBe(first!.layout)
    expect(loop.current()!.geometry).toBe(first!.geometry)
    expect(loop.current()!.regions).toBe(first!.regions)
  })

  it('CA-4: all three are rebuilt together, so none of them is left stale', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const before = loop.current()!

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()
    const after = loop.current()!

    expect(after).not.toBe(before)
    expect(after.regions.scheduleCanvas.width).toBe(1400)
    // Spec: S-177, FR-055
    // Why: the fit keeps the left edge inside a day (scrollDate plus scrollDateFraction, never snapped to
    // the day boundary), so the origin stands up to one day left of the Task Group Area and never right of it.
    const dayOffset = (after.regions.taskGroupArea.x - after.layout.originX) / after.layout.pxPerDay
    expect(dayOffset).toBeGreaterThanOrEqual(0)
    expect(dayOffset).toBeLessThan(1)
    expect(after.layout.contentWidth).not.toBe(before.layout.contentWidth)
    const drawnFirst = after.geometry.tasks.find((drawnText) => drawnText.taskUid === 1)!
    const placedFirst = after.layout.placements.find((onePoint) => onePoint.taskUid === 1)!
    expect(drawnFirst.plan).not.toBeNull()
    const outline = drawnFirst.plan as { form: 'outline'; points: readonly { x: number }[] }
    expect(Math.min(...outline.points.map((onePoint) => onePoint.x))).toBeCloseTo(placedFirst.x, 6)
  })

  it('CA-2: two triggers before the frame head are still one calculation', () => {
    // Why: two triggers before one frame head owe one frame; a second would compute the same stages again for the same picture (MN-6).
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const before = pane.frames()

    loop.resize({ ...SCREEN, width: 1400 })
    loop.holdDocument(
      RESTORED(
        twoTaskGroupDocument((draft) => {
          draft.schedule.tasks[0].name = 'Renamed'
        }),
      ),
    )
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before + 1)
    expect(pane.drawn[before]).toContain('width="1400"')
  })
})

// Trap: S-116 is copied from table T-212, not read from it; a change to that row must be made here too.
const APP_HEADER_MAX_HEIGHT = 56

interface ScreenPane {
  readonly views: ScreenView[]
  readonly wiring: ScreenWiring
  screens(): number
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    // Why: this fake draws nothing, which readScreenPartAt answers as "the schedule below is exposed".
    readFieldCommit: () => null,
    readScreenPartAt: () => null,
  }
  return {
    views,
    wiring: { surface, language },
    screens: () => views.length,
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

const scrollbarOf = (view: ScreenView, axis: 'horizontal' | 'vertical') =>
  view.frame.scrollbars.find((bar) => bar.axis === axis)

// Why: pinned ones first, since FR-098 lifts those out of the list.
const titlesOf = (view: ScreenView) => [
  ...view.taskGroupPanel.pinnedTitles,
  ...view.taskGroupPanel.titles,
]

// Why: one working week buys a large px/day under FR-055, so FR-017's finest tier (S-85) gives the weekday its own band;
// the twenty-day document fits too close to S-85 for the tier to be certain.
const shortDocument = () =>
  twoTaskGroupDocument((draft) => {
    draft.schedule.tasks[0].start = FIRST_START
    draft.schedule.tasks[0].finish = '2026-04-03T00:00:00'
    draft.schedule.tasks[1].start = '2026-04-02T00:00:00'
    draft.schedule.tasks[1].finish = '2026-04-08T00:00:00'
  })

const emptyDocument = () =>
  twoTaskGroupDocument((draft) => {
    draft.schedule.tasks = []
    draft.schedule.taskGroups = []
    draft.schedule.taskGroupMembers = []
  })

// Spec: IF-9, MN-8, BO-5, NFR-010, NFR-011
describe('IF-9 of table T-065 -- the frame draws on a second surface', () => {
  it('GIVEN a screen wiring WHEN boot ends THEN the first description is already on the surface (BO-5)', () => {
    // Why: one screen at boot, not the schedule now and the parts around it on some later frame.
    const pane = host()
    const screen = screenPane()

    frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)

    expect(pane.frames()).toBe(1)
    expect(screen.screens()).toBe(1)
  })

  it('GIVEN a screen wiring WHEN boot ends THEN BO-5 owes no second description', () => {
    const pane = host()
    const screen = screenPane()

    frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    pane.runAnimationFrames()

    expect(screen.screens()).toBe(1)
  })

  it('GIVEN no screen wiring WHEN boot ends THEN the schedule alone is drawn (the omitted case)', () => {
    // Why: ScreenWiring is optional on purpose, and T-077 governs the schedule whether or not the caller had a surface.
    const pane = host()

    expect(() => frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)).not.toThrow()
    expect(pane.frames()).toBe(1)
  })

  it('GIVEN no screen wiring WHEN a frame is woken THEN it still runs (FT-3 without IF-9)', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(2)
    expect(pane.drawn[1]).toContain('width="1400"')
  })

  it('MN-8: GIVEN one frame THEN each of the two surfaces is fed exactly once', () => {
    // Why: MN-8 rejected one renderer for both, so two surfaces are fed, and CA-4 forbids filling them from different frames.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()
    loop.holdDocument(
      RESTORED(
        twoTaskGroupDocument((draft) => {
          draft.schedule.tasks[0].name = 'Renamed'
        }),
      ),
    )
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(3)
    expect(screen.screens()).toBe(3)
  })

  it('NFR-010: GIVEN a screen wiring WHEN nothing in table T-078 fires THEN no description is made', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)

    for (let turn = 0; turn < 5; turn += 1) {
      loop.current()
      loop.document()
      loop.resize({ ...SCREEN })
      pane.runAnimationFrames()
    }

    expect(screen.screens()).toBe(1)
    expect(pane.frames()).toBe(1)
  })
})

// Spec: SC-4, FR-051, NFR-011, U-32
describe('SC-4 of table T-031 -- both scrollbars, always', () => {
  it('GIVEN the two-task-group document WHEN the first description is made THEN it carries both scrollbars', () => {
    const pane = host()
    const screen = screenPane()
    frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)

    const view = screen.last()
    expect(view.frame.scrollbars).toHaveLength(2)
    expect(scrollbarOf(view, 'horizontal')).toBeDefined()
    expect(scrollbarOf(view, 'vertical')).toBeDefined()
  })

  it('GIVEN a document with no task groups and no tasks THEN both scrollbars are still drawn (the empty case)', () => {
    // Why: the empty case is the one SC-4 was written for: nothing fits more completely than nothing.
    const document = emptyDocument()
    expect(validateDocument(document).valid).toBe(true)

    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, document, SCREEN, screen.wiring)

    const view = screen.last()
    expect(view.frame.scrollbars).toHaveLength(2)
    expect(scrollbarOf(view, 'horizontal')).toBeDefined()
    expect(scrollbarOf(view, 'vertical')).toBeDefined()
    expect(loop.current()!.layout.taskGroups).toEqual([])
    expect(titlesOf(view)).toEqual([])
  })

  it('FR-051: GIVEN a frame THEN the scrollbar lanes take their place FROM the Task Group Area, not over it', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const taskGroupArea = loop.current()!.regions.taskGroupArea
    const canvas = loop.current()!.regions.scheduleCanvas
    const view = screen.last()

    const vertical = scrollbarOf(view, 'vertical')!
    const horizontal = scrollbarOf(view, 'horizontal')!
    expect(vertical.track.x).toBeGreaterThanOrEqual(taskGroupArea.x + taskGroupArea.width)
    expect(horizontal.track.y).toBeGreaterThanOrEqual(taskGroupArea.y + taskGroupArea.height)

    for (const bar of view.frame.scrollbars) {
      expect(bar.track.x).toBeGreaterThanOrEqual(canvas.x)
      expect(bar.track.y).toBeGreaterThanOrEqual(canvas.y)
      expect(bar.track.x + bar.track.width).toBeLessThanOrEqual(canvas.x + canvas.width)
      expect(bar.track.y + bar.track.height).toBeLessThanOrEqual(canvas.y + canvas.height)
    }
  })
})

// Spec: SC-1, HF-8, HR-1a
describe('SC-1 of table T-031 -- the panel follows the body, sideways it does not', () => {
  it('GIVEN two drawn task groups THEN each title stands at the y and height the body task group has', () => {
    // Why: the panel and the Task Group Area must be the same numbers, so a title takes its box from this frame's measurement.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const taskGroups = loop.current()!.layout.taskGroups
    const titles = titlesOf(screen.last())

    // Why: a premise, so the comparison below is not vacuous.
    expect(taskGroups).toHaveLength(2)
    expect(titles).toHaveLength(2)
    expect(titles.map((title) => title.taskGroupId)).toEqual(taskGroups.map((taskGroup) => taskGroup.taskGroupId))
    for (const taskGroup of taskGroups) {
      const title = titles.find((candidate) => candidate.taskGroupId === taskGroup.taskGroupId)!
      expect(title.box.y).toBe(taskGroup.y)
      expect(title.box.height).toBe(taskGroup.height)
    }
  })

  it('GIVEN a collapsed task group THEN the panel drops the same task group the body drops (HF-8 / HR-1a)', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(
      pane.surface,
      twoTaskGroupDocument((draft) => {
        draft.schedule.taskGroups[0].treeState = 'collapsed'
      }),
      SCREEN,
      screen.wiring,
    )

    expect(loop.current()!.layout.taskGroups.map((taskGroup) => taskGroup.taskGroupId)).toEqual([ALPHA])
    expect(titlesOf(screen.last()).map((title) => title.taskGroupId)).toEqual([ALPHA])
  })

  it('GIVEN the body standing at a different day THEN the titles have not moved sideways', () => {
    // Why: the stored place puts one body on 2026-04-05 and OP-10's fit decides the other, so the two frames look at different days.
    const scrolled = twoTaskGroupDocument((draft) => {
      draft.documentSettings.scrollDate = '2026-04-05T00:00:00'
      draft.documentSettings.scrollTaskGroupId = ALPHA
    })
    expect(validateDocument(scrolled).valid).toBe(true)

    const pane = host()
    const fittedScreen = screenPane()
    const scrolledScreen = screenPane()
    const fittedLoop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, fittedScreen.wiring)
    const scrolledLoop = frameLoop(pane.surface, scrolled, SCREEN, scrolledScreen.wiring)

    expect(scrolledLoop.current()!.layout.originDay).not.toEqual(
      fittedLoop.current()!.layout.originDay,
    )

    const fittedTitles = titlesOf(fittedScreen.last())
    const scrolledTitles = titlesOf(scrolledScreen.last())
    expect(scrolledTitles.map((title) => title.taskGroupId)).toEqual(
      fittedTitles.map((title) => title.taskGroupId),
    )
    for (const [index, title] of scrolledTitles.entries()) {
      expect(title.box.x).toBe(fittedTitles[index]!.box.x)
      expect(title.box.width).toBe(fittedTitles[index]!.box.width)
    }
  })
})

// Spec: SC-1, HF-10, OP-10
describe('SC-1 of table T-031 -- the panel and the body hold the SAME task groups', () => {
  // Why: anchored well down a stack taller than the area, so task groups above it are off the top; S-78 is how a person
  // ordinarily leaves the schedule, so this is no contrived frame.
  const manyTaskGroups = (anchorAt: number): Document =>
    twoTaskGroupDocument((draft) => {
      const taskGroups: unknown[] = []
      const members: unknown[] = []
      const tasks = [...draft.schedule.tasks]
      // Why: 48, not 24: the 24px lattice lets 24 task groups fit the Task Group Area whole, and nothing would be clipped.
      for (let index = 0; index < 48; index += 1) {
        const id = `row-${index}`
        taskGroups.push({
          id,
          parentId: null,
          name: `Row ${index}`,
          derivedFromTaskUid: null,
          order: index,
          treeState: 'auto', editPermission: null,
          color: null,
          minHeightPx: null,
        })
        members.push({ taskUid: 1, taskGroupId: id })
      }
      draft.schedule.tasks = tasks.slice(0, 1)
      draft.schedule.taskGroups = taskGroups
      draft.schedule.taskGroupMembers = members
      draft.documentSettings.scrollTaskGroupId = `row-${anchorAt}`
    })

  it('GIVEN the stack is anchored below its top THEN some task groups really do fall outside the Task Group Area', () => {
    // Why: the premise of the case below: with nothing clipped, an equality of counts says nothing.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, manyTaskGroups(12), SCREEN, screen.wiring)
    const values = loop.current()!
    const area = values.regions.taskGroupArea

    const outside = values.layout.taskGroups.filter(
      (taskGroup) =>
        Math.min(taskGroup.y + taskGroup.height, area.y + area.height) <= Math.max(taskGroup.y, area.y),
    )
    expect(outside.length, 'no task group is off the Task Group Area, so nothing is being clipped').toBeGreaterThan(
      0,
    )
  })

  it('GIVEN task groups fall outside the Task Group Area THEN the panel holds exactly the task groups the body draws', () => {
    // Why: a title painted where the body has no band stands up in the Time Ruler, over the corner HF-10's control needs.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, manyTaskGroups(12), SCREEN, screen.wiring)
    const values = loop.current()!
    const area = values.regions.taskGroupArea

    const showing = values.layout.taskGroups.filter(
      (taskGroup) => Math.min(taskGroup.y + taskGroup.height, area.y + area.height) > Math.max(taskGroup.y, area.y),
    )
    const titles = titlesOf(screen.last())

    expect(titles.map((title) => title.taskGroupId)).toEqual(showing.map((taskGroup) => taskGroup.taskGroupId))
    expect(titles.length).toBe(showing.length)
  })

  it('GIVEN a title is drawn THEN its band lies inside the Task Group Area, cut the same way the body is', () => {
    // Why: a title that kept its whole height while its band was cut would stand taller than the task group it names.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, manyTaskGroups(12), SCREEN, screen.wiring)
    const values = loop.current()!
    const area = values.regions.taskGroupArea

    for (const title of titlesOf(screen.last())) {
      const taskGroup = values.layout.taskGroups.find((one) => one.taskGroupId === title.taskGroupId)!
      expect(title.box.y, `${title.taskGroupId} starts above the Task Group Area`).toBeGreaterThanOrEqual(area.y)
      expect(
        title.box.y + title.box.height,
        `${title.taskGroupId} runs past the foot of the Task Group Area`,
      ).toBeLessThanOrEqual(area.y + area.height)
      expect(title.box.y, `${title.taskGroupId} is not the body's own top`).toBe(
        Math.max(taskGroup.y, area.y),
      )
      expect(title.box.height, `${title.taskGroupId} is not the body's own height`).toBe(
        Math.min(taskGroup.y + taskGroup.height, area.y + area.height) - Math.max(taskGroup.y, area.y),
      )
    }
  })
})

// Spec: CA-4, FR-051, FT-3, NFR-011, S-116
describe('CA-4 and FR-051 -- one frame of screen, at the size that frame settled', () => {
  it('GIVEN FT-3 WHEN the frame runs THEN the description is built on the regions of THAT frame', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const before = scrollbarOf(screen.last(), 'vertical')!.track.x

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()

    expect(screen.screens()).toBe(2)
    expect(pane.drawn[1]).toContain('width="1400"')
    const after = scrollbarOf(screen.last(), 'vertical')!.track.x
    expect(after).toBeGreaterThan(before)
    expect(after).toBeGreaterThanOrEqual(
      loop.current()!.regions.taskGroupArea.x + loop.current()!.regions.taskGroupArea.width,
    )
  })

  it('FT-3: GIVEN only the App Header height changed THEN a frame runs', () => {
    // Why: FR-051 subtracts the header height from the schedule, so a changed header changes the screen size FT-3 means.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const before = loop.current()!.regions.scheduleCanvas.height

    loop.resize({ ...SCREEN, appHeaderHeight: 40 })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(2)
    expect(screen.screens()).toBe(2)
    expect(loop.current()!.regions.appHeader.height).toBe(40)
    expect(loop.current()!.regions.scheduleCanvas.height).toBeGreaterThan(before)
  })

  it('FT-3: GIVEN only the scrollbar thickness changed THEN a frame runs', () => {
    // Why: the thickness takes its place from the Task Group Area, so a thicker bar shrinks the drawing area.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
    const before = loop.current()!.regions.taskGroupArea.width

    loop.resize({ ...SCREEN, scrollbarThickness: 16 })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(2)
    expect(screen.screens()).toBe(2)
    expect(loop.current()!.regions.taskGroupArea.width).toBeLessThan(before)
  })

  it('FR-051: GIVEN a host reporting a header taller than S-116 THEN the cap is what is used', () => {
    // Why: S-116 is the cap, not the height, so 40 above is used as it stands and 80 here is not.
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(
      pane.surface,
      twoTaskGroupDocument(),
      { ...SCREEN, appHeaderHeight: 80 },
      screen.wiring,
    )
    const regions = loop.current()!.regions

    expect(regions.appHeader.height).toBe(APP_HEADER_MAX_HEIGHT)
    expect(regions.scheduleCanvas.y).toBe(APP_HEADER_MAX_HEIGHT)
    expect(regions.scheduleCanvas.height).toBe(SCREEN.height - APP_HEADER_MAX_HEIGHT)
  })

  it('FR-051: GIVEN a header of exactly S-116 THEN it is used whole (the boundary)', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(
      pane.surface,
      twoTaskGroupDocument(),
      { ...SCREEN, appHeaderHeight: APP_HEADER_MAX_HEIGHT },
      screen.wiring,
    )

    expect(loop.current()!.regions.appHeader.height).toBe(APP_HEADER_MAX_HEIGHT)
  })
})

// Spec: FR-038, FR-017, FR-020, FR-063, S-99
describe('FR-038 -- the display language is the environment, not the document', () => {
  it('GIVEN either language WHEN the frame is drawn THEN the document holds no language', () => {
    // Why: S-99 language lives in localStorage, so no key of T-203 carries it and the loop may not put one there.
    for (const language of ['ja', 'en'] as const) {
      const pane = host()
      const screen = screenPane(language)
      // Why: the baseline is a copy taken before the loop ran, since the loop answers with the very object it was handed.
      const opened = twoTaskGroupDocument()
      const asOpened = structuredClone(settingsOf(opened))
      const loop = frameLoop(pane.surface, opened, SCREEN, screen.wiring)
      pane.runAnimationFrames()

      expect(screen.screens()).toBe(1)
      expect(Object.keys(settingsOf(loop.document()))).not.toContain('language')
      expect(settingsOf(loop.document())).toEqual(asOpened)
    }
  })

  it('GIVEN the language chosen for this session THEN it reaches the 曜日 and nothing else of the picture', () => {
    // Why: the picture carries a watermark stamped once per loop (FR-020, FR-063) to the second, so two loops in different
    // seconds differ in every watermark label; pinning the clock makes the two stamps identical (DFC-506).
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-12T00:00:00Z'))

    const pane = host()
    const japanese = screenPane('ja')
    const english = screenPane('en')

    // Why: a premise asked of the dictionary: two languages that spelled a weekday alike would make every expectation below vacuous.
    const inJa = rulerWeekdayWords('ja')
    const inEn = rulerWeekdayWords('en')
    expect([inJa.length, inEn.length], 'PI-37: 曜日 7 語、表示言語ごと').toEqual([7, 7])
    expect(
      inJa.filter((word) => inEn.includes(word)),
      'FR-038: 2 言語が同じ綴りの曜日を持つと、以下は何も測らない',
    ).toEqual([])

    const inJapanese = frameLoop(pane.surface, shortDocument(), SCREEN, japanese.wiring)
    const drawnInJapanese = pane.drawn[0] ?? ''
    const inEnglish = frameLoop(pane.surface, shortDocument(), SCREEN, english.wiring)
    const drawnInEnglish = pane.drawn[1] ?? ''

    expect(
      withoutWords(drawnInEnglish),
      'FR-038: 語のほかに言語で動くものは無い',
    ).toBe(withoutWords(drawnInJapanese))

    expect(inEnglish.current()!.layout).toEqual(inJapanese.current()!.layout)
    expect(inEnglish.current()!.regions).toEqual(inJapanese.current()!.regions)

    // Why: the case needs the finest tier, where FR-017 gives the weekday a band, and shortDocument buys it;
    // the layout equality above already covers the tier, which is a member of the layout.
    const printedInJapanese = labelsInOrder(drawnInJapanese)
    const printedInEnglish = labelsInOrder(drawnInEnglish)
    expect(printedInEnglish.length, '同じ 段階 なので目盛ラベルの数は同じである').toBe(
      printedInJapanese.length,
    )

    // Why: carries, not equals: whether the weekday stands alone on its band is FR-017's to drive; UF-48's is which words got there.
    for (const one of [
      { language: 'ja', printed: printedInJapanese, own: inJa, other: inEn },
      { language: 'en', printed: printedInEnglish, own: inEn, other: inJa },
    ]) {
      expect(
        one.printed.filter((label) => weekdaySlotIn(label, one.own) >= 0).length,
        `FR-017 / FR-038: ${one.language} の画面の第 4 段は ${one.language} の曜日を刷る`,
      ).toBeGreaterThan(0)
      expect(
        one.printed.filter((label) => weekdaySlotIn(label, one.other) >= 0),
        `FR-038: ヘルプの中を除く画面の文字をその言語で示すこと -- ${one.language} の画面に他方の語は出ない`,
      ).toEqual([])
    }

    const moved = printedInJapanese
      .map((label, at) => ({ at, label, other: printedInEnglish[at] ?? '' }))
      .filter((one) => one.label !== one.other)
    for (const one of moved) {
      const slot = weekdaySlotIn(one.label, inJa)
      expect(
        slot,
        `FR-038: ${one.at} 番目のラベルが言語で動いた -- 曜日を含まねばならない`,
      ).toBeGreaterThanOrEqual(0)
      expect(
        weekdaySlotIn(one.other, inEn),
        `FR-038: ${one.at} 番目のラベルは、他方の言語では同じ曜日である`,
      ).toBe(slot)
      expect(
        one.other.replace(inEn[slot] ?? '', '').trim(),
        `FR-038: ${one.at} 番目のラベルは、曜日のほかは言語で動かない`,
      ).toBe(one.label.replace(inJa[slot] ?? '', '').trim())
    }
  })
})

// Spec: NFR-011, FT-2, FR-072, NT-7, U-22, U-27
describe('NFR-011 and FT-2 -- the description is whole, and it describes THIS document', () => {
  const named = (title: string) =>
    twoTaskGroupDocument((draft) => {
      draft.schedule.project.title = title
    })

  it('NFR-011: GIVEN the first frame THEN no member of the description is missing', () => {
    // Why: the members that may be null are the ones a requirement says are absent: a closed panel (FR-072), a hidden palette,
    // no open surface, nothing waiting to be answered (NT-7); the rest are always there.
    const pane = host()
    const screen = screenPane()
    frameLoop(pane.surface, named('Under test'), SCREEN, screen.wiring)
    const view = screen.last()

    expect(view.frame).toBeDefined()
    expect(view.appHeaderItems).toBeDefined()
    expect(view.taskGroupPanel).toBeDefined()
    expect(Array.isArray(view.notices)).toBe(true)
    expect(Array.isArray(view.tooltips)).toBe(true)
  })

  it('GIVEN a document with a title and two task groups THEN the description carries both', () => {
    // Why: a loop that handed the surface an empty schedule, or last frame's, would answer with neither.
    const pane = host()
    const screen = screenPane()
    frameLoop(pane.surface, named('Under test'), SCREEN, screen.wiring)
    const view = screen.last()

    expect(view.appHeaderItems.documentTitle).toBe('Under test')
    expect(titlesOf(view).map((title) => title.wholeLabel)).toEqual(['Alpha', 'Beta'])
  })

  it('FT-2: GIVEN the current value is replaced THEN the next description is of the new document', () => {
    const pane = host()
    const screen = screenPane()
    const loop = frameLoop(pane.surface, named('First'), SCREEN, screen.wiring)
    expect(screen.last().appHeaderItems.documentTitle).toBe('First')

    loop.holdDocument(RESTORED(named('Second')))
    pane.runAnimationFrames()

    expect(screen.screens()).toBe(2)
    expect(screen.last().appHeaderItems.documentTitle).toBe('Second')
  })
})

// Spec: RD-1, RD-2, RD-3, RD-4, RD-6, RD-7, FR-062, FR-063, FR-095, SK-20, SK-6, UN-13
// Why: the shell publishes neither the history nor its depth, so a case writes, undoes and watches the current value,
// after asserting the cell it is about; RD-4's discard is not told apart from RD-6's emptying.
describe('表 T-230 -- the row the caller names settles the history, the stamp and the undo step', () => {
  const titled = (title: string) =>
    twoTaskGroupDocument((draft) => {
      draft.schedule.project.title = title
    })

  // Summary: writeOneStep presses SK-20 and refuses to go on if it left no step behind.
  const writeOneStep = (loop: FrameLoop, what: string): void => {
    const before = stateOf(loop)
    loop.receiveInput(SK_20)
    expect(stateOf(loop), `${what}: SK-20 moved nothing, so it left no 段 to undo`).not.toEqual(
      before,
    )
  }

  it('the rows this member may stand in are the ones whose WS-3 column says the caller brings the document', () => {
    // Why: HeldDocumentCall is declared as exactly these rows, so this case pins the declaration and the manuscript to each other.
    expect(HELD_TASK_GROUPS).toEqual(['RD-6'])
    expect(cellOf('RD-6', COL_WS3)).toBe('呼び手が持って来る')
    // Why: RD-1 and RD-2 are reached from inside the loop, and RD-3 and RD-4 need an ImportDocument call nothing hands it.
    expect(T_230.rows.map((row) => row.id)).toEqual([
      'RD-1',
      'RD-2',
      'RD-3',
      'RD-4',
      'RD-6',
      'RD-7',
    ])
  })

  it('RD-7 also has the caller bring the document, and this member does not offer it', () => {
    // Why: RD-7's caller (FR-095, pressed inside the shell) also brings a document, yet HeldDocumentCall admits one row;
    // nothing in docs/spec hands that road to a caller outside the loop, so this is a pin that fails the day the shell grows one.
    const brings = T_230.rows
      .filter((row) => (row.by[COL_WS3] ?? '').startsWith('呼び手が持って来る'))
      .map((row) => row.id)
    expect(brings, '表 T-230: the rows whose WS-3 column has the caller bring it').toEqual([
      'RD-6',
      'RD-7',
    ])
    expect(cellOf('RD-7', COL_WS3)).toBe('呼び手が持って来る（`01-04-requirements.md` の 表 T-342 の空の文書）')
    for (const column of [COL_HISTORY, COL_UNDO_STEP]) {
      expect(cellOf('RD-7', column), `表 T-230 RD-7 / ${column}`).toBe(cellOf('RD-4', column))
    }
    expect(cellOf('RD-7', COL_STAMP)).toBe('進める')
    expect(HELD_TASK_GROUPS, 'this member still stands in one row of the two').toEqual(['RD-6'])
  })

  for (const row of HELD_TASK_GROUPS) {
    describe(`${row} -- ${cellOf(row, COL_HISTORY)} / ${cellOf(row, COL_STAMP)} / ${cellOf(row, COL_UNDO_STEP)}`, () => {
      it('履歴: what was there to undo before the replacement is not there after it', () => {
        // Why: RD-6's history cell is not RD-3's keep-what-is-there, so the step the write leaves cannot survive the replacement.
        expect(['捨てる', '空にする'], `表 T-230 ${row} の履歴`).toContain(
          cellOf(row, COL_HISTORY),
        )
        expect(cellOf(row, COL_HISTORY)).not.toBe(cellOf('RD-3', COL_HISTORY))

        const pane = host()
        const loop = frameLoop(pane.surface, titled('Before'), SCREEN)
        writeOneStep(loop, row)

        loop.holdDocument(bringing(row, titled('Brought')))
        const landed = stateOf(loop)
        expect(landed.title).toBe('Brought')

        loop.receiveInput(SK_6)

        expect(stateOf(loop), 'the 段 written before the replacement was still there').toEqual(
          landed,
        )
      })

      it('取り消しの 1 段: the replacement itself is not a step, so one write leaves exactly one', () => {
        expect(cellOf(row, COL_UNDO_STEP), `表 T-230 ${row} の取り消しの 1 段`).toBe('積まない')

        const pane = host()
        const loop = frameLoop(pane.surface, titled('Before'), SCREEN)
        writeOneStep(loop, row)

        loop.holdDocument(bringing(row, titled('Brought')))
        const landed = stateOf(loop)
        writeOneStep(loop, row)

        loop.receiveInput(SK_6)
        expect(stateOf(loop)).toEqual(landed)
        // Why: a replacement that pushed a step of its own would walk back to 'Before' here, and a surviving history to the first write.
        loop.receiveInput(SK_6)
        expect(stateOf(loop), 'the replacement left a 段 of its own').toEqual(landed)
      })

      it('刻印: the stamp that lands is the one the document came in with', () => {
        expect(cellOf(row, COL_STAMP), `表 T-230 ${row} の刻印`).toBe('入ってきたまま')

        const stamp = {
          scheduleUpdatedAt: '2026-01-02T03:04:05Z',
          settingsUpdatedAt: '2026-01-02T03:04:05Z',
          lastEditedBy: 'whoever wrote the file',
          fileSavedAt: null,
        }
        const brought = twoTaskGroupDocument((draft) => {
          draft.schedule.project.title = 'Brought'
          draft.documentStamp = { ...stamp }
        })
        expect(validateDocument(brought).valid).toBe(true)

        const pane = host()
        const loop = frameLoop(pane.surface, titled('Before'), SCREEN)
        // Why: a premise: the loop's own write has already moved the stamp, so a stamp advanced again would differ in all three members.
        writeOneStep(loop, row)
        expect((loop.document() as any).documentStamp).not.toEqual(stamp)

        loop.holdDocument(bringing(row, brought))

        expect((loop.document() as any).documentStamp).toEqual(stamp)
      })
    })
  }
})
