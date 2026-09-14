// CR-376: GRS JSON and MSPDI carry the last actual day as a date, and ActualDuration is counted from the dates.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import { specTable } from '../contract/spec-table'

const cellOf = (tableId: string, rowId: string, heading: string): string => {
  const row = specTable(tableId).rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  const cell = row.by[heading]
  if (cell === undefined) throw new Error(`table ${tableId} has no ${heading}; it has ${Object.keys(row.by).join(', ')}`)
  return cell
}

const numberIn = (cell: string): number => {
  const found = /\d+/.exec(cell)
  if (found === null) throw new Error(`no number in ${cell}`)
  return Number(found[0])
}

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const ymd = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}`
const stored = (iso: string): string => `${iso}T00:00:00`
const dayPart = (value: string | null | undefined): string | null =>
  value === null || value === undefined ? null : value.slice(0, 10)

// see S-106
const isWorkedDay = (iso: string): boolean => {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return weekday !== 0 && weekday !== 6
}

const dayAfter = (iso: string): string => {
  const next = new Date(`${iso}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

// see FR-011
const lengthOf = (start: string, last: string): number => {
  let count = 0
  for (let at = start; at <= last; at = dayAfter(at)) {
    if (at === start || at === last || isWorkedDay(at)) count += 1
  }
  return count
}

const taskRow = (uid: number, part: Record<string, unknown>): Record<string, unknown> => ({
  uid,
  wbsParentUid: null,
  wbsOrder: uid,
  name: `T${uid}`,
  start: stored(ymd(5)),
  finish: stored(ymd(30)),
  milestone: false,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
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
})

const ROW = '5c000000-0000-4000-8000-000000000376'

const documentObject = (tasks: readonly Record<string, unknown>[], minutesPerDay: number | null): Record<string, any> => {
  const template = structuredClone(TEMPLATE)
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, minutesPerDay, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
      tasks,
      resources: [],
      assignments: [],
      taskGroups: [
        { id: ROW, parentId: null, label: 'A', derivedFromTaskUid: null, order: 0, isCollapsed: false, isHidden: false, color: null, height: null },
      ],
      taskGroupMembers: tasks.map((one) => ({ taskUid: one['uid'], groupId: ROW, stackOrder: null })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: template.documentSettings,
    documentStamp: template.documentStamp,
    changeLog: [],
  }
}

const RUNNING = [
  { uid: 1, start: ymd(9), last: ymd(10), days: 2, what: 'Fri to Sat' },
  { uid: 2, start: ymd(10), last: ymd(10), days: 1, what: 'Sat to Sat' },
  { uid: 3, start: ymd(9), last: ymd(12), days: 2, what: 'Fri to Mon' },
  { uid: 4, start: ymd(10), last: ymd(12), days: 2, what: 'Sat to Mon' },
  { uid: 5, start: ymd(12), last: ymd(12), days: 1, what: 'Mon to Mon' },
  { uid: 6, start: ymd(8), last: ymd(13), days: 4, what: 'Thu to Tue' },
  { uid: 7, start: ymd(10), last: ymd(11), days: 2, what: 'Sat to Sun' },
] as const

const FINISHED = { uid: 8, start: ymd(9), last: ymd(10), days: 2 } as const

const exchangeTasks = (): Record<string, unknown>[] => [
  ...RUNNING.map((one) => taskRow(one.uid, { actualStart: stored(one.start), stop: stored(one.last), resumeValid: true })),
  taskRow(FINISHED.uid, { actualStart: stored(FINISHED.start), stop: null, actualFinish: stored(FINISHED.last), resumeValid: false }),
]

const taskBlock = (xml: string, uid: number): string => {
  for (const hit of xml.matchAll(/<Task>([\s\S]*?)<\/Task>/g)) {
    const body = hit[1] ?? ''
    if (new RegExp(`^\\s*<UID>${uid}</UID>`).test(body)) return body
  }
  throw new Error(`the written MSPDI holds no Task ${uid}`)
}

const childText = (block: string, name: string): string | null => {
  const hit = new RegExp(`<${name}>([^<]*)</${name}>`).exec(block)
  return hit === null ? null : (hit[1] ?? null)
}

const minutesOf = (duration: string | null): number => {
  const hit = /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(duration ?? '')
  if (hit === null) throw new Error(`not a duration: ${String(duration)}`)
  return Number(hit[1] ?? 0) * 60 + Number(hit[2] ?? 0) + Number(hit[3] ?? 0) / 60
}

const written = (minutesPerDay: number | null): string =>
  mspdiFromDocument(documentObject(exchangeTasks(), minutesPerDay) as unknown as Document).text

describe('CR-376 exchange premises read from the manuscript', () => {
  it('AT-141 maps stop to Task/Stop, DV-11 makes ActualDuration, and S-128 is a number of minutes', () => {
    expect(cellOf('T-058', 'AT-141', '列')).toContain('stop')
    expect(cellOf('T-058', 'AT-141', '交換相手の要素')).toContain('Task/Stop')
    expect(specTable('T-058').rows.map((one) => one.id)).not.toContain('AT-35')
    expect(cellOf('T-059', 'DV-11', '交換相手の要素')).toContain('Task/ActualDuration')
    expect(numberIn(cellOf('T-209', 'S-128', '値'))).toBeGreaterThan(0)
  })

  it('the oracle counts both end days and skips rest days between', () => {
    for (const one of [...RUNNING, FINISHED]) expect(lengthOf(one.start, one.last), `${one.uid}`).toBe(one.days)
  })
})

describe('Chapter 6.2 export: Stop is the last day itself, ActualDuration is DV-11', () => {
  const MINUTES = 420

  for (const one of RUNNING) {
    it(`${one.what}: Stop is ${one.last} at 00:00:00 and ActualDuration is ${one.days} days`, () => {
      const block = taskBlock(written(MINUTES), one.uid)
      expect(childText(block, 'Stop')).toBe(stored(one.last))
      expect(minutesOf(childText(block, 'ActualDuration'))).toBe(one.days * MINUTES)
    })
  }

  it('a finished task writes ActualFinish as its last day and ActualDuration from it', () => {
    const block = taskBlock(written(MINUTES), FINISHED.uid)
    expect(childText(block, 'ActualFinish')).toBe(stored(FINISHED.last))
    expect(minutesOf(childText(block, 'ActualDuration'))).toBe(FINISHED.days * MINUTES)
  })

  it('an empty minutesPerDay falls back to S-128', () => {
    const block = taskBlock(written(null), 1)
    expect(minutesOf(childText(block, 'ActualDuration'))).toBe(2 * numberIn(cellOf('T-209', 'S-128', '値')))
  })
})

describe('FR-011 import: Stop is read as stop; without Stop, ActualDuration places it', () => {
  const current = documentObject(exchangeTasks(), null) as unknown as Document
  const text = written(null)

  const importedTask = (source: string, uid: number): Task => {
    const read = documentFromMspdi(source, current)
    if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults)}`)
    const found = read.document.schedule.tasks.find((one) => one.uid === uid)
    if (found === undefined) throw new Error(`no Task ${uid}`)
    return found
  }

  it('a Saturday Stop comes back as that Saturday, not the Monday its ActualDuration would count to', () => {
    expect(dayPart(importedTask(text, 1).stop)).toBe(ymd(10))
  })

  it('with Stop removed, ActualDuration of 4 days from Thursday the 8th puts stop on Tuesday the 13th', () => {
    const block = taskBlock(text, 6)
    const withoutStop = text.replace(block, block.replace(/<Stop>[^<]*<\/Stop>/, ''))
    expect(withoutStop).not.toBe(text)
    const task = importedTask(withoutStop, 6)
    expect(dayPart(task.stop)).toBe(ymd(13))
    expect(task.actualFinish).toBeNull()
  })
})

describe('FR-011 / FR-073: an older GRS JSON with actualDuration and no stop still opens', () => {
  // WHY: the schema before CR-376 required actualDuration on every Task, a not-started one included.
  const OLDER_SCHEMA_VERSION = '2026-08-20'

  const older = (): string =>
    JSON.stringify({
      ...documentObject(
        [
          taskRow(1, { actualStart: stored(ymd(8)), actualDuration: 4, resumeValid: true }),
          taskRow(2, { actualStart: stored(ymd(10)), actualDuration: 1, resumeValid: true }),
          taskRow(3, { actualStart: stored(ymd(12)), actualDuration: 0, resumeValid: true }),
          taskRow(4, { actualStart: stored(ymd(8)), actualDuration: 2, actualFinish: stored(ymd(9)), resumeValid: false }),
          taskRow(5, { actualDuration: null }),
        ],
        null,
      ),
      schemaVersion: OLDER_SCHEMA_VERSION,
    })

  it('the fixture is older than the version this build writes', () => {
    expect(OLDER_SCHEMA_VERSION < String(TEMPLATE['schemaVersion'])).toBe(true)
  })

  const opened = (): Document => {
    const read = documentFromJson(older())
    if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults)}`)
    return read.document
  }

  const taskIn = (document: Document, uid: number): Task => {
    const found = document.schedule.tasks.find((one) => one.uid === uid)
    if (found === undefined) throw new Error(`no Task ${uid}`)
    return found
  }

  it('opens, and stop is placed n - 1 worked days after actualStart', () => {
    const document = opened()
    expect(dayPart(taskIn(document, 1).stop)).toBe(ymd(13))
    expect(dayPart(taskIn(document, 2).stop)).toBe(ymd(10))
  })

  it('n = 0 places stop on actualStart', () => {
    expect(dayPart(taskIn(opened(), 3).stop)).toBe(ymd(12))
  })

  it('a finished task keeps actualFinish and gets no stop; a not-started task gets none either', () => {
    const document = opened()
    expect(dayPart(taskIn(document, 4).actualFinish)).toBe(ymd(9))
    expect(taskIn(document, 4).stop).toBeNull()
    expect(taskIn(document, 5).stop).toBeNull()
  })

  it('the opened document holds no length column', () => {
    for (const task of opened().schedule.tasks) expect(Object.keys(task)).not.toContain('actualDuration')
  })
})
