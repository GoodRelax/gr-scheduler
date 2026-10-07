// W3 tester 3: T-023d -- while a schedule shape, a highlight box or the Status Line is held, nothing reaches the document.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { documentOf, highlightBoxOf, taskOf } from './cr-606-stage'
import { unbroken } from './spec-table'
import { exportStage, restoreAnimationFrames, type ExportStage } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'),
)

const CLAUSE_NO_WRITE_WHILE_HELD =
  '⛔ 日程の形（`GR-23`）・`GR-14`・`GR-16` を掴んでいるあいだ値を文書へ書いてはならない（MUST NOT）'

const HIGHLIGHT = 'highlight-one'
// WHY: two whole weeks, so a moved plan lands on the same weekdays it left.
const MOVE_DAYS = 14

// WHY: a long plan, so the body centre stands clear of the progress marker and dummy that answer first (T-266).
const DOCUMENT = ((): Document => {
  const built = documentOf({
    tasks: [taskOf(1, { start: '2026-04-06T08:00:00', finish: '2026-06-26T17:00:00' })],
    highlightBoxes: [highlightBoxOf(HIGHLIGHT, { startDate: '2026-07-06T08:00:00', endDate: '2026-07-24T17:00:00' })],
  })
  return { ...built, schedule: { ...built.schedule, project: { ...built.schedule.project, statusDate: '2026-08-05T17:00:00' } } }
})()

const scheduleText = (stage: ExportStage): string => JSON.stringify(stage.loop.document().schedule)

interface Grab {
  readonly name: string
  at(stage: ExportStage): { readonly x: number; readonly y: number }
}

const GRABS: readonly Grab[] = [
  {
    name: 'GR-23 (a task body)',
    at: (stage) => {
      const placement = stage.loop.current()?.layout.placements.find((one) => one.taskUid === 1)
      if (placement === undefined) throw new Error('premise: the task is laid out')
      return { x: placement.x + placement.width / 2, y: placement.y + placement.height / 2 }
    },
  },
  {
    name: 'GR-14 (a highlight box frame)',
    at: (stage) => {
      const box = stage.loop.current()?.geometry.highlightBoxes.find((one) => one.id === HIGHLIGHT)?.box
      if (box === undefined) throw new Error('premise: the highlight box is drawn')
      return { x: box.x, y: box.y + box.height / 2 }
    },
  },
  {
    name: 'GR-16 (the Status Line)',
    at: (stage) => {
      const line = stage.loop.current()?.geometry.statusLine
      if (line === null || line === undefined) throw new Error('premise: the Status Line is drawn')
      return { x: line.x, y: (line.top + line.bottom) / 2 }
    },
  },
]

describe('W3-T3 -- the manuscript still says what these cases read', () => {
  it(CLAUSE_NO_WRITE_WHILE_HELD, () => {
    expect(REQUIREMENTS).toContain(CLAUSE_NO_WRITE_WHILE_HELD)
  })
})

describe('T-023d -- a held grab draws, and writes only on release', () => {
  it.each(GRABS)(`"${CLAUSE_NO_WRITE_WHILE_HELD}" -- %s`, async (grab) => {
    const stage = exportStage(DOCUMENT)
    const before = scheduleText(stage)
    const from = grab.at(stage)
    const movePx = MOVE_DAYS * (stage.loop.current()?.layout.pxPerDay ?? Number.NaN)
    stage.pointer('down', from.x, from.y)
    stage.pointer('move', from.x + movePx / 2, from.y)
    stage.pointer('move', from.x + movePx, from.y)
    expect(scheduleText(stage), 'the document changed while the grab was held').toBe(before)
    expect(stage.loop.hasUnsavedEdits()).toBe(false)
    await stage.press({
      kind: 'pointer',
      phase: 'up',
      button: 'left',
      x: from.x + movePx,
      y: from.y,
      modifiers: { ctrl: false, shift: false, alt: false, meta: false },
      clickCount: 1,
    })
    expect(scheduleText(stage), 'premise: the release wrote the move').not.toBe(before)
  })
})
