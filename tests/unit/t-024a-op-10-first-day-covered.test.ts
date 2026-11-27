// Unit tests: the first day a document covers, from which OP-10 draws a template document.

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture drafts loose document shapes and the fake host patches a browser global */

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { textOfDay, type Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
} from '../../src/framework/single-html-shell/frame-loop'
import { dateAtX } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { specTable } from '../contract/spec-table'
import { settingNumber } from '../fixtures/setting-number'
import { displayRatioAt } from '../fixtures/display-scale'
import { validateDocument } from '../fixtures/grs-document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'

const T_024A = specTable('T-024a')

const RULE_COLUMN = ((): string => {
  const found = T_024A.headings.find((heading) => heading.includes('規則'))
  if (found === undefined) throw new Error('table T-024a has no 規則 column')
  return found
})()

const OP_10 = ((): string => {
  const found = T_024A.rows.find((row) => row.id === 'OP-10')
  if (found === undefined) throw new Error('table T-024a has no row OP-10')
  return found.by[RULE_COLUMN] ?? ''
})()

// Why: calendar, project and settings come from the BT-4 template (FR-027); the Tasks and
// annotations are written here so every day counted can be named.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readRepoFile(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const stored = (day: string): string => `${day}T00:00:00`

const dayPart = (value: string): string => value.slice(0, 10)

// Trap: not toISOString().slice(0, 10): that is the UTC day, which FR-054 forbids, and a host
// east of UTC then disagrees with the drawn frame for hours of every day.
const runDayOf = (at: Date): string =>
  `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(
    at.getDate(),
  ).padStart(2, '0')}`

const TASK_GROUP_ONE = '3a000000-0000-4000-8000-000000000001'
const TASK_GROUP_TWO = '3a000000-0000-4000-8000-000000000002'

// Why: EARLIEST_ACTUAL_START is earlier than every start, or the two counted columns
// could not be told apart.
const EARLIEST_START = '2026-04-06'
const LATER_START = '2026-04-10'
const EARLIEST_ACTUAL_START = '2026-04-03'

// Why: earlier than every counted day, so counting a column the definition does not name
// moves the answer and nothing else does.
const NOT_COUNTED = '2026-01-05'

// Why: not 1x, since a return to 1x says nothing on a document already at 1x, as the
// template is; the figures are this file's own.
const STORED_ZOOM_X = 3
const STORED_ZOOM_Y = 2

function task(over: Partial<Task> & { readonly uid: number }): Task {
  return {
    parentTaskUid: null,
    wbsOrder: over.uid,
    name: null,
    start: null,
    finish: null,
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
    ...over,
  } as unknown as Task
}

const group = (id: string, order: number, label: string): unknown => ({
  id,
  parentId: null,
  name: label,
  derivedFromTaskUid: null,
  order,
  treeState: 'auto', editPermission: null,
  color: null,
  minHeightPx: null,
})

// Why: IV-6, IV-2 and IV-10 hold by construction; the fixture case runs validateDocument, so
// a fixture that stops being a document fails there by name.
function documentOf(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100 },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task({ uid: 1, name: 'One', start: stored(EARLIEST_START), finish: stored('2026-04-24') }),
        task({
          uid: 2,
          name: 'Two',
          start: stored(LATER_START),
          finish: stored('2026-04-30'),
          actualStart: stored(EARLIEST_ACTUAL_START),
          // Why: the last day of 5 working days counted from 2026-04-03 (FR-011).
          stop: stored('2026-04-09'),
          percentComplete: 20,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [group(TASK_GROUP_ONE, 0, 'One'), group(TASK_GROUP_TWO, 1, 'Two')],
      taskGroupMembers: [
        { taskUid: 1, taskGroupId: TASK_GROUP_ONE },
        { taskUid: 2, taskGroupId: TASK_GROUP_TWO },
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

const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 700,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

const realRaf = (globalThis as any).requestAnimationFrame

// Summary: host drains the requestAnimationFrame queue that node lacks and decides nothing.
function host(): {
  readonly surface: { showSvg(svg: string): void }
  readonly drawn: string[]
  runAnimationFrames(): void
} {
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
      showSvg: (svg: string) => {
        drawn.push(svg)
      },
    },
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

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const STARTUP_MARGIN_PX = settingNumber('S-134') / 2 + settingNumber('S-268') / 2

interface DrawnPlace {
  readonly pxPerDay: number
  readonly origin: string | null
  readonly startupDay: string | null
  readonly topTaskGroup: string | null
}

// Why: startedFromTemplate tells the boot the document is BT-4, the only road to this branch;
// false stands for BT-1 / BT-2, an opened file.
function frameOfBoot(document: Document, fromTemplate: boolean): DrawnPlace {
  const pen = host()
  const loop = frameLoop(
    pen.surface as any,
    document,
    SCREEN,
    undefined,
    undefined,
    undefined,
    undefined,
    fromTemplate,
  )
  pen.runAnimationFrames()
  const values = loop.current()
  if (values === null) throw new Error('BO-1 settled no size, so no frame was drawn')
  const origin = values.layout.originDay
  const startupDay = dateAtX(values.layout, values.regions.taskGroupArea.x + STARTUP_MARGIN_PX)
  return {
    startupDay: startupDay === null ? null : dayPart(textOfDay(startupDay)),
    pxPerDay: values.layout.pxPerDay,
    // Why: textOfDay answers the stored spelling with a time part the schedule never reads
    // (FR-054); the day is what is compared.
    origin: origin === null ? null : dayPart(textOfDay(origin)),
    topTaskGroup: values.layout.taskGroups[0]?.taskGroupId ?? null,
  }
}

const originOfBoot = (document: Document): string | null => frameOfBoot(document, true).startupDay

// Spec: T-024a, OP-10, BT-4
describe('表 T-024a OP-10 -- the manuscript this file is driven by', () => {
  it('still defines 「その文書が覆う最初の日」 as the earliest `start` or `actualStart`', () => {
    expect(OP_10).toContain('その文書が覆う最初の日')
    expect(OP_10).toContain('`Task` が持つ `start` と `actualStart` のうち最も早い日')
  })

  it('still forbids counting the annotations and the calendar exception days (MUST NOT)', () => {
    expect(OP_10).toContain('数えてはならない（MUST NOT）')
    expect(OP_10).toContain('`HighlightBox`')
    expect(OP_10).toContain('`CommentBox`')
    expect(OP_10).toContain('`Exception.fromDate`')
  })

  it('still says what a document holding no `Task` does', () => {
    expect(OP_10).toContain('`Task` を 1 件も持たない文書')
    expect(OP_10).toContain('数える対象が無い')
    expect(OP_10).toContain('代わりの日を発明しない')
  })

  it('still excludes a BT-4 document from the fit, which is the branch these cases drive', () => {
    expect(OP_10).toContain('`BT-4`')
    expect(OP_10).toContain('働かせてはならない（MUST NOT）')
  })
})

// Spec: OP-10
describe('the fixture these cases stand on', () => {
  it('is a `GRS JSON` document', () => {
    const report = validateDocument(documentOf())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('stores no place, so OP-10 is the row that decides where the first frame starts', () => {
    // Why: a template that stored a place would send every case below down another branch
    // without changing a line of them.
    const settings = (documentOf() as any).documentSettings
    expect(settings.scrollDate).toBeNull()
    expect(settings.scrollTaskGroupId).toBeNull()
  })

  it('carries an `actualStart` earlier than every `start`, which is what makes the two columns tell apart', () => {
    const tasks = (documentOf() as any).schedule.tasks as Task[]
    const starts = tasks.map((one) => dayPart(one.start as string))
    const actuals = tasks.flatMap((one) =>
      one.actualStart === null ? [] : [dayPart(one.actualStart)],
    )
    expect(actuals).toContain(EARLIEST_ACTUAL_START)
    expect(starts.every((one) => one > EARLIEST_ACTUAL_START)).toBe(true)
  })
})

// Spec: OP-10
describe('OP-10 -- which days 「その文書が覆う最初の日」 counts', () => {
  it('takes an `actualStart` that begins before every `start`', () => {
    expect(originOfBoot(documentOf())).toBe(EARLIEST_ACTUAL_START)
  })

  it('takes the earliest `start` when no actual begins earlier', () => {
    const noActuals = documentOf((draft) => {
      for (const one of draft.schedule.tasks) {
        one.actualStart = null
        one.stop = null
        one.percentComplete = 0
      }
    })
    expect(originOfBoot(noActuals)).toBe(EARLIEST_START)
  })
})

// Spec: OP-10
describe('OP-10 -- the days it MUST NOT count', () => {
  it('does not count a `CommentBox` anchorDate (MUST NOT)', () => {
    const withNote = documentOf((draft) => {
      draft.schedule.commentBoxes.push({
        id: '3b000000-0000-4000-8000-000000000001',
        leaderShapeKind: 'polyline',
        text: 'Note',
        anchorDate: stored(NOT_COUNTED),
        anchorTaskGroupId: TASK_GROUP_ONE,
        bodyOffsetPx: null,
      })
    })
    expect(originOfBoot(withNote)).toBe(EARLIEST_ACTUAL_START)
  })

  it('does not count a `HighlightBox` startDate (MUST NOT)', () => {
    const withBox = documentOf((draft) => {
      draft.schedule.highlightBoxes.push({
        id: '3c000000-0000-4000-8000-000000000001',
        start: stored(NOT_COUNTED),
        finish: stored('2026-01-20'),
        topTaskGroupId: TASK_GROUP_ONE,
        bottomTaskGroupId: TASK_GROUP_TWO,
        strokeColor: null,
        cornerRadiusPx: null,
      })
    })
    expect(originOfBoot(withBox)).toBe(EARLIEST_ACTUAL_START)
  })

  it('does not count a calendar `Exception.fromDate` (MUST NOT)', () => {
    const withException = documentOf((draft) => {
      const calendar = draft.schedule.calendars[0]
      calendar.exceptions = [
        {
          ordinal: calendar.exceptions.length,
          name: 'A day the whole company is away',
          fromDate: stored(NOT_COUNTED),
          toDate: stored(NOT_COUNTED),
          dayWorking: false,
          recurrenceKind: 1,
          carry: {},
          carryElements: [],
        },
        ...calendar.exceptions,
      ]
    })
    expect(originOfBoot(withException)).toBe(EARLIEST_ACTUAL_START)
  })

  it('does not count `Task.deadline` -- the definition names two columns and that is not one', () => {
    // Why: a deadline already past is an ordinary document, and the one Task date column
    // that can stand before start.
    const withDeadline = documentOf((draft) => {
      draft.schedule.tasks[0].deadline = stored(NOT_COUNTED)
    })
    expect(originOfBoot(withDeadline)).toBe(EARLIEST_ACTUAL_START)
  })

  it('does not count `Project.startDate` -- the definition counts what a `Task` holds', () => {
    const withProjectStart = documentOf((draft) => {
      draft.schedule.project.startDate = stored(NOT_COUNTED)
    })
    expect(originOfBoot(withProjectStart)).toBe(EARLIEST_ACTUAL_START)
  })
})

// Spec: OP-10, FR-055
describe('OP-10 -- a document that holds no `Task`', () => {
  // Why: used only by the back-to-the-head case, a relation that needs no ruling on what is drawn.
  const emptyOfTasks = (): Document =>
    documentOf((draft) => {
      draft.schedule.tasks = []
      draft.schedule.taskGroupMembers = []
      // Why: a stored zoom that is not 1x, so a return to 1x would show.
      draft.documentSettings.zoomX = STORED_ZOOM_X
      draft.documentSettings.zoomY = STORED_ZOOM_Y
    })

  // Why: the task groups go too: table T-038 lists only Task parts, and no row settles
  // whether bands with no Task count as drawn.
  const nothingDrawn = (): Document =>
    documentOf((draft) => {
      draft.schedule.tasks = []
      draft.schedule.taskGroupMembers = []
      draft.schedule.taskGroups = []
      // Why: the Status Line goes too (FR-046), so nothing is drawn; Project.startDate stays,
      // as the last case asks whether it may decide the place.
      draft.schedule.project.statusDate = null
      draft.documentSettings.zoomX = STORED_ZOOM_X
      draft.documentSettings.zoomY = STORED_ZOOM_Y
    })

  it('is a `GRS JSON` document, so the cases below are about the row and not the shape', () => {
    for (const document of [emptyOfTasks(), nothingDrawn()]) {
      const report = validateDocument(document)
      expect(report.errors).toEqual([])
      expect(report.valid).toBe(true)
    }
  })

  it('still boots and still draws a frame', () => {
    const pen = host()
    const loop = frameLoop(
      pen.surface as any,
      nothingDrawn(),
      SCREEN,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    )
    pen.runAnimationFrames()
    expect(loop.current()).not.toBeNull()
    expect(pen.drawn.length).toBeGreaterThan(0)
  })

  it('goes back to the head of the row: BT-4 draws it exactly as a document with no exclusion would', () => {
    // Why: the head of the row is what a document not from BT-4 gets, so the two boots must
    // agree in zoom and place; a BT-4 branch acting on its own would part them.
    for (const document of [emptyOfTasks, nothingDrawn]) {
      expect(frameOfBoot(document(), true)).toEqual(frameOfBoot(document(), false))
    }
  })

  it('takes FR-055 zoom for a document with nothing drawn: 倍率を等倍に戻し (MUST)', () => {
    const drawn = frameOfBoot(nothingDrawn(), true)
    const settings = (nothingDrawn() as any).documentSettings
    expect(settings.zoomX, 'the fixture really stored a zoom that is not 等倍').toBe(STORED_ZOOM_X)
    expect(
      drawn.pxPerDay,
      '等倍に戻した 1 日の幅に、FR-039 の 表 T-252 の DS-4 が描く比を掛ける',
    ).toBe(SETTINGS_CONSTANTS.pxPerDayAt1x * displayRatioAt(settings.displayScale))
  })

  // Spec: FR-051, HF-8
  it('leaves the stored zoom alone while doing it -- OP-10 is on the reading side (FR-051)', () => {
    const pen = host()
    const loop = frameLoop(
      pen.surface as any,
      nothingDrawn(),
      SCREEN,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    )
    pen.runAnimationFrames()
    const held = (loop.document() as any).documentSettings
    expect(held.zoomX).toBe(STORED_ZOOM_X)
    expect(held.zoomY).toBe(STORED_ZOOM_Y)
    expect(held.scrollDate).toBeNull()
    expect(held.scrollTaskGroupId).toBeNull()
  })

  // Spec: OP-10, FR-055, PF-8
  it('takes FR-055 place too: 表示位置を `scrollDate` に合わせる, and `null` may only become 実行日', () => {
    // Why: the run day is sampled either side of the boot, so a boot across midnight passes
    // without the case accepting one further day.
    // Why: only the null side of scrollDate is driven; whether its day survives a place OP-10
    // has called unusable is settled nowhere.
    const before = runDayOf(new Date())
    const origin = frameOfBoot(nothingDrawn(), true).origin
    const after = runDayOf(new Date())
    expect(
      origin === null || origin === before || origin === after,
      `FR-055 (MUST/MAY) allows only null or the run day (${before} .. ${after}); ` +
        `the frame drew from ${origin}`,
    ).toBe(true)
  })
})
