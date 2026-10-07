// CR-646 X-1..X-4: what the shell and the use cases write when a person or a command moves a date (T-350, FR-054).

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import { textOfDay, dayOf } from '../../src/entity/document-model/schedule/schedule'
import {
  editDocument,
  type DocumentCommand,
  type SettingsLimits,
} from '../../src/use-case/edit-document/edit-document'
import { pointAnswering, scanGrabAreas } from './cr-430-bench'
import { frameOf, planBox, xOfDay } from './cr-430-stage'
import {
  DAY_END,
  DAY_START,
  S_482,
  S_483,
  april,
  asDocument,
  restoreAnimationFrames,
  rowIdOf,
  stage,
  taskOf,
  taskRow,
  timeOf,
  type Stage,
} from './cr-646-stage'

afterEach(restoreAnimationFrames)

const BAR = 1
const MILESTONE = 2
const RUNNING = 3
const PAUSED = 4
const FRESH_MILESTONE = 5
const IMPORTED = 6

const STALE = '00:00:00'

const TASKS = [
  taskRow(BAR, { start: april(6, STALE), finish: april(10, STALE) }),
  taskRow(MILESTONE, { start: april(13, STALE), finish: april(13, STALE), milestone: true }),
  taskRow(RUNNING, {
    start: april(6, STALE),
    finish: april(17, STALE),
    actualStart: april(7, STALE),
    stop: april(8, STALE),
    resumeValid: true,
  }),
  taskRow(PAUSED, {
    start: april(6, STALE),
    finish: april(24, STALE),
    actualStart: april(7, STALE),
    stop: april(8, STALE),
    resume: april(14, STALE),
    resumeValid: true,
  }),
  taskRow(FRESH_MILESTONE, { start: april(15, STALE), finish: april(15, STALE), milestone: true }),
]

const ownTimes = { defaultStartTime: '09:00:00', defaultFinishTime: '18:00:00' }

/** @purity pure */
function grsDocument(project: Record<string, unknown> = {}): Document {
  return asDocument({ tasks: TASKS, project })
}

/** @purity pure */
function importedDocument(): Document {
  return asDocument({
    tasks: [taskRow(IMPORTED, { start: april(7, '09:00:00'), finish: april(10, '16:30:00') })],
    project: { sourceFormat: 'mspdi' },
  })
}

/** @purity pure */
function rowY(built: Stage, uid: number): number {
  const box = planBox(built.loop, uid)
  return (box.y0 + box.y1) / 2
}

/** @purity non-pure */
function grabAndRelease(built: Stage, uid: number, grabArea: string, toDay: number): void {
  const frame = frameOf(built.loop)
  const from = pointAnswering(scanGrabAreas(frame.geometry, uid, frame.rowArea), grabArea)
  built.drag(from.x, from.y, xOfDay(built.loop, april(toDay)), from.y)
}

/** @purity pure */
function changed(before: Task, after: Task, column: keyof Task): boolean {
  return before[column] !== after[column]
}

describe('X-1 WT-1 / WT-2: a task placed on the ground (IC-23, FR-083) takes the side times', () => {
  it('WT-1 / S-482: the new task starts at 08:00:00 when defaultStartTime is null', () => {
    const built = stage(grsDocument())
    const y = rowY(built, BAR)
    built.pressEntry('Command Palette', 'IC-23')
    built.drag(xOfDay(built.loop, april(20)), y, xOfDay(built.loop, april(24)), y)
    const made = built.loop.document().schedule.tasks.filter((one) => !TASKS.some((held) => held['uid'] === one.uid))
    expect(made.length, 'premise: the drag on the ground made one task').toBe(1)
    expect(timeOf(made[0]?.start)).toBe(S_482)
  })

  it('WT-2 / S-483: the new task finishes at 17:00:00 when defaultFinishTime is null', () => {
    const built = stage(grsDocument())
    const y = rowY(built, BAR)
    built.pressEntry('Command Palette', 'IC-23')
    built.drag(xOfDay(built.loop, april(20)), y, xOfDay(built.loop, april(24)), y)
    const made = built.loop.document().schedule.tasks.filter((one) => !TASKS.some((held) => held['uid'] === one.uid))
    expect(made.length, 'premise: the drag on the ground made one task').toBe(1)
    expect(timeOf(made[0]?.finish)).toBe(S_483)
  })

  it('AT-154 / AT-155: with defaultStartTime 09:00:00 the new task is written at 09:00:00 .. 18:00:00', () => {
    const built = stage(grsDocument(ownTimes))
    const y = rowY(built, BAR)
    built.pressEntry('Command Palette', 'IC-23')
    built.drag(xOfDay(built.loop, april(20)), y, xOfDay(built.loop, april(24)), y)
    const made = built.loop.document().schedule.tasks.filter((one) => !TASKS.some((held) => held['uid'] === one.uid))
    expect(made.length, 'premise: the drag on the ground made one task').toBe(1)
    expect([timeOf(made[0]?.start), timeOf(made[0]?.finish)]).toEqual(['09:00:00', '18:00:00'])
  })
})

describe('X-1 WT-1 / WT-2 / WT-5: a task moved by its grab areas (T-245) takes the side times', () => {
  it('GO-1 / WT-1: the plan start released is written at S-482', () => {
    const built = stage(grsDocument())
    grabAndRelease(built, BAR, 'GA-1', 3)
    const task = taskOf(built.loop.document(), BAR)
    expect(task.start?.slice(0, 10), 'premise: the start moved').toBe('2026-04-03')
    expect(timeOf(task.start)).toBe(S_482)
  })

  it('GO-2 / WT-2: the plan finish released is written at S-483', () => {
    const built = stage(grsDocument())
    grabAndRelease(built, BAR, 'GA-2', 14)
    const task = taskOf(built.loop.document(), BAR)
    expect(task.finish?.slice(0, 10), 'premise: the finish moved').toBe('2026-04-14')
    expect(timeOf(task.finish)).toBe(S_483)
  })

  it('GA-9 / WT-1 / WT-2: the body moved writes start at S-482 and finish at S-483', () => {
    const built = stage(grsDocument())
    const box = planBox(built.loop, BAR)
    const y = (box.y0 + box.y1) / 2
    const from = (box.x0 + box.x1) / 2
    built.drag(from, y, from + (xOfDay(built.loop, april(9)) - xOfDay(built.loop, april(7))), y)
    const task = taskOf(built.loop.document(), BAR)
    expect(task.start?.slice(0, 10), 'premise: the body moved two days').toBe('2026-04-08')
    expect([timeOf(task.start), timeOf(task.finish)]).toEqual([S_482, S_483])
  })

  it('GA-9 / AT-154 / AT-155: the body moved writes the project default times', () => {
    const built = stage(grsDocument(ownTimes))
    const box = planBox(built.loop, BAR)
    const y = (box.y0 + box.y1) / 2
    const from = (box.x0 + box.x1) / 2
    built.drag(from, y, from + (xOfDay(built.loop, april(9)) - xOfDay(built.loop, april(7))), y)
    const task = taskOf(built.loop.document(), BAR)
    expect(task.start?.slice(0, 10), 'premise: the body moved two days').toBe('2026-04-08')
    expect([timeOf(task.start), timeOf(task.finish)]).toEqual(['09:00:00', '18:00:00'])
  })

  it('GO-11 / WT-5: a milestone moved writes both ends at the finish time', () => {
    const built = stage(grsDocument())
    grabAndRelease(built, MILESTONE, 'GA-15', 16)
    const task = taskOf(built.loop.document(), MILESTONE)
    expect(task.start?.slice(0, 10), 'premise: the milestone moved').not.toBe('2026-04-13')
    expect([timeOf(task.start), timeOf(task.finish)]).toEqual([S_483, S_483])
  })

  it('GO-11 / WT-5 / AT-155: a milestone moved writes both ends at the project default finish time', () => {
    const built = stage(grsDocument(ownTimes))
    grabAndRelease(built, MILESTONE, 'GA-15', 16)
    const task = taskOf(built.loop.document(), MILESTONE)
    expect(task.start?.slice(0, 10), 'premise: the milestone moved').not.toBe('2026-04-13')
    expect([timeOf(task.start), timeOf(task.finish)]).toEqual(['18:00:00', '18:00:00'])
  })
})

describe('X-1 WT-3 / WT-4 / WT-5: actuals placed by their grab areas take the side times', () => {
  it('GO-7 / WT-3 / WT-4: the dummy end released writes actualStart at S-482 and stop at S-483', () => {
    const built = stage(grsDocument())
    grabAndRelease(built, BAR, 'GA-6', 8)
    const task = taskOf(built.loop.document(), BAR)
    expect(task.actualStart, 'premise: the actual was begun').not.toBeNull()
    const last = task.actualFinish ?? task.stop
    expect([timeOf(task.actualStart), timeOf(last)]).toEqual([S_482, S_483])
  })

  it('GO-3 / WT-4: the actual end released writes its last day at S-483', () => {
    const built = stage(grsDocument())
    grabAndRelease(built, RUNNING, 'GA-4', 10)
    const task = taskOf(built.loop.document(), RUNNING)
    const last = task.actualFinish ?? task.stop
    expect(last?.slice(0, 10), 'premise: the last actual day moved').toBe('2026-04-10')
    expect(timeOf(last)).toBe(S_483)
  })

  it('GO-5 / WT-3: the actual start released writes actualStart at S-482', () => {
    const built = stage(grsDocument())
    grabAndRelease(built, RUNNING, 'GA-3', 6)
    const task = taskOf(built.loop.document(), RUNNING)
    expect(task.actualStart?.slice(0, 10), 'premise: the actual start moved').toBe('2026-04-06')
    expect(timeOf(task.actualStart)).toBe(S_482)
  })

  it('GO-10 / WT-3: the resume icon released writes resume at S-482', () => {
    const built = stage(grsDocument())
    grabAndRelease(built, PAUSED, 'GA-20', 16)
    const task = taskOf(built.loop.document(), PAUSED)
    expect(task.resume?.slice(0, 10), 'premise: resume moved').toBe('2026-04-16')
    expect(timeOf(task.resume)).toBe(S_482)
  })

  it('GO-8 / WT-5: a milestone dummy released writes its actual start and last day at the finish time', () => {
    const built = stage(grsDocument())
    grabAndRelease(built, FRESH_MILESTONE, 'GA-17', 16)
    const task = taskOf(built.loop.document(), FRESH_MILESTONE)
    expect(task.actualStart?.slice(0, 10), 'premise: the milestone actual was placed').toBe('2026-04-16')
    expect([timeOf(task.actualStart), timeOf(task.actualFinish ?? task.stop)]).toEqual([S_483, S_483])
  })
})

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }

/** @purity pure */
function edited(document: Document, command: DocumentCommand): Document {
  const result = editDocument(document, command, LIMITS, 'Row')
  if (!result.ok) throw new Error(`premise: the command was refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

/** @purity pure */
function dayText(text: string): string {
  const day = dayOf(text)
  if (day === null) throw new Error(`${text} is not a day`)
  return textOfDay(day)
}

describe('X-1 WT-3 / WT-4 through the use case: the actual columns a command makes take the side times', () => {
  it('CM-14 beginTaskActual (GO-7) / WT-3 / WT-4: actualStart at S-482, the last day at S-483', () => {
    const after = taskOf(edited(grsDocument(), { kind: 'beginTaskActual', uid: BAR, grabbed: 'GA-6', droppedDay: dayText(april(8)) }), BAR)
    expect(after.actualStart, 'premise: the actual was begun').not.toBeNull()
    expect([timeOf(after.actualStart), timeOf(after.actualFinish ?? after.stop)]).toEqual([S_482, S_483])
  })

  it('CM-15 cycleTaskPlanActualState / WT-3 / WT-4 / WT-10: every actual column the cycle writes takes its side time', () => {
    let document = grsDocument()
    const startSide = ['actualStart', 'resume'] as const
    const finishSide = ['actualFinish', 'stop'] as const
    const seen: string[] = []
    for (let turn = 0; turn < 4; turn += 1) {
      const before = taskOf(document, BAR)
      document = edited(document, { kind: 'cycleTaskPlanActualState', uid: BAR, remembered: null })
      const after = taskOf(document, BAR)
      for (const column of startSide) {
        if (after[column] !== null && changed(before, after, column)) seen.push(`${column}=${timeOf(after[column])}`)
      }
      for (const column of finishSide) {
        if (after[column] !== null && changed(before, after, column)) seen.push(`${column}=${timeOf(after[column])}`)
      }
    }
    expect(seen.length, 'premise: the cycle wrote at least one actual column').toBeGreaterThan(0)
    const wanted = seen.map((one) => (one.startsWith('actualStart') || one.startsWith('resume') ? `${one.split('=')[0]}=${S_482}` : `${one.split('=')[0]}=${S_483}`))
    expect(seen).toEqual(wanted)
  })
})

describe('X-2 WT-6..WT-8: the whole-day columns an annotation or a scroll writes', () => {
  it('WT-6: a highlight box placed (IC-36) starts at 00:00:00', () => {
    const built = stage(grsDocument())
    built.pressEntry('Command Palette', 'IC-36')
    built.drag(xOfDay(built.loop, april(20)), rowY(built, BAR), xOfDay(built.loop, april(22)), rowY(built, MILESTONE))
    const boxes = built.loop.document().schedule.highlightBoxes
    expect(boxes.length, 'premise: the drag placed one highlight box').toBe(1)
    expect(timeOf(boxes[0]?.startDate)).toBe(DAY_START)
  })

  it('WT-7: a highlight box placed (IC-36) ends at 23:59:00', () => {
    const built = stage(grsDocument())
    built.pressEntry('Command Palette', 'IC-36')
    built.drag(xOfDay(built.loop, april(20)), rowY(built, BAR), xOfDay(built.loop, april(22)), rowY(built, MILESTONE))
    const boxes = built.loop.document().schedule.highlightBoxes
    expect(boxes.length, 'premise: the drag placed one highlight box').toBe(1)
    expect(timeOf(boxes[0]?.endDate)).toBe(DAY_END)
  })

  it('WT-8: a comment box placed (IC-35) is anchored at 00:00:00', () => {
    const built = stage(grsDocument(ownTimes))
    built.pressEntry('Command Palette', 'IC-35')
    built.click(xOfDay(built.loop, april(21)), rowY(built, BAR))
    const boxes = built.loop.document().schedule.commentBoxes
    expect(boxes.length, 'premise: the press placed one comment box').toBe(1)
    expect(timeOf(boxes[0]?.anchorDate)).toBe(DAY_START)
  })

  it('WT-8 / S-77: a horizontal scroll writes scrollDate at 00:00:00', () => {
    const built = stage(grsDocument(ownTimes))
    const before = built.loop.document().documentSettings.scrollDate
    built.send({
      kind: 'wheel',
      x: 700,
      y: rowY(built, BAR),
      modifiers: { ctrl: false, shift: true, alt: false, meta: false },
      notches: 3,
      scrollPx: { x: 300, y: 0 },
    })
    const after = built.loop.document().documentSettings.scrollDate
    expect(after?.slice(0, 10), 'premise: the scroll moved the day in view').not.toBe(before?.slice(0, 10))
    expect(timeOf(after)).toBe(DAY_START)
  })
})

describe('X-3 WT-10 / EX-4: an imported value the command did not move keeps its spelling', () => {
  it('GO-1 / WT-10: moving only the start of an imported task leaves its finish at T16:30:00', () => {
    const built = stage(importedDocument())
    grabAndRelease(built, IMPORTED, 'GA-1', 6)
    const task = taskOf(built.loop.document(), IMPORTED)
    expect(task.start?.slice(0, 10), 'premise: the start moved').toBe('2026-04-06')
    expect(task.finish).toBe(april(10, '16:30:00'))
  })

  it('GO-1 / WT-1: the start that was moved is written at S-482, not at the imported 09:00:00', () => {
    const built = stage(importedDocument())
    grabAndRelease(built, IMPORTED, 'GA-1', 6)
    const task = taskOf(built.loop.document(), IMPORTED)
    expect(task.start).toBe(april(6, S_482))
  })

  it('GO-2 / WT-10: moving only the finish leaves the imported start at T09:00:00', () => {
    const built = stage(importedDocument())
    grabAndRelease(built, IMPORTED, 'GA-2', 13)
    const task = taskOf(built.loop.document(), IMPORTED)
    expect(task.finish?.slice(0, 10), 'premise: the finish moved').toBe('2026-04-13')
    expect(task.start).toBe(april(7, '09:00:00'))
  })
})

describe('X-4 FR-054: dates are compared by their day', () => {
  const COMMENT_ID = '64600000-0000-4000-8000-0000000c0001'
  const HIGHLIGHT_ID = '64600000-0000-4000-8000-0000000c0002'

  /** @purity pure */
  function annotated(): Document {
    const base = grsDocument() as unknown as Record<string, any>
    base['schedule'].commentBoxes = [
      {
        id: COMMENT_ID,
        leaderShapeKind: 'straight',
        text: 'note',
        anchorDate: april(21, DAY_START),
        anchorGroupId: rowIdOf(0),
        bodyOffsetPx: { dx: 10, dy: -10 },
        strokeColor: null,
        strokeWidthPx: null,
        fillColor: null,
        fillTransparencyPercent: null,
        textColor: null,
      },
    ]
    base['schedule'].highlightBoxes = [
      {
        id: HIGHLIGHT_ID,
        startDate: april(20, DAY_START),
        endDate: april(22, DAY_END),
        topGroupId: rowIdOf(0),
        bottomGroupId: rowIdOf(1),
        strokeColor: null,
        cornerRadiusPx: null,
        strokeWidthPx: null,
        fillColor: null,
        fillTransparencyPercent: null,
      },
    ]
    return base as unknown as Document
  }

  it('FR-054 / CM-50: re-anchoring a comment box on the same day at another time changes nothing', () => {
    const before = annotated()
    const after = edited(before, {
      kind: 'setCommentBoxAnchor',
      id: COMMENT_ID,
      anchor: { date: april(21, '12:00:00'), groupId: rowIdOf(0) },
    })
    expect(after.schedule.commentBoxes).toEqual(before.schedule.commentBoxes)
  })

  it('FR-054 / CM-54: re-ranging a highlight box over the same days at other times changes nothing', () => {
    const before = annotated()
    const after = edited(before, {
      kind: 'setHighlightBoxRange',
      id: HIGHLIGHT_ID,
      range: {
        startDate: april(20, '08:00:00'),
        endDate: april(22, '17:00:00'),
        topGroupId: rowIdOf(0),
        bottomGroupId: rowIdOf(1),
      },
    })
    expect(after.schedule.highlightBoxes).toEqual(before.schedule.highlightBoxes)
  })
})
