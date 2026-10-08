// W3 tester 4: FR-056 table T-032 MG-14 -- a landed merge tells what it overwrote, kept and missed, and never a reason whose count is 0.

import { describe, expect, it } from 'vitest'

import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  HERE_ROW,
  OPEN_CHOOSER,
  REQUIREMENTS,
  jsonBytes,
  oneRowDocument,
  reasonWords,
  shellStage,
  there,
} from './cr-610-file-flow-stage'

const MG_14_NO_ZERO =
  '。`FR-023` が落とした `Task` を告げるときと同じ面であり、両方あるときは 1 つの面に理由ごとに並べる。⛔ 件数が 0 の理由を告げてはならない（MUST NOT）'
const MG_14_TELL =
  '上書きしたもの・残したもの・届かなかったものを、表 T-233 の行で告げること（MUST） —— 上書きした `Task`（`MG-8` ／ `MG-8a`）は `RS-71`、取込側に無く残した `Task`（`MG-7`）は `RS-72`、前回は届いていて今回届かなかった `Task`（`MG-11`）は `RS-73` である。'

const MERGE_REASONS = ['RS-71', 'RS-72', 'RS-73'] as const

// see T-233, NT-9
// WHY: read from the raised rows and from the words anywhere in the description, so RS-73 on its own surface counts too.
/** @purity pure */
function toldReasons(view: ScreenView): readonly string[] {
  const raised = view.notices.flatMap((one) => one.raisedNotices.map((two) => two.reason))
  const spoken = JSON.stringify(view)
  const worded = MERGE_REASONS.filter((row) => spoken.includes(reasonWords(row).text.ja))
  return [...new Set([...raised.filter((row) => (MERGE_REASONS as readonly string[]).includes(row)), ...worded])].sort()
}

/** @purity pure */
function countOf(view: ScreenView, reason: string): number | null {
  const report = view.openModal as { readonly reportLines?: readonly { reason: string; count: number | null }[] } | null
  const line = report?.reportLines?.find((one) => one.reason === reason)
  if (line !== undefined) return line.count
  for (const one of view.notices) {
    const found = one.raisedNotices.find((two) => two.reason === reason)
    if (found !== undefined) return found.affectedCount
  }
  return null
}

describe('MG-14 -- the manuscript these cases are driven by', () => {
  it.each([MG_14_NO_ZERO, MG_14_TELL])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe(`MG-14 -- ${MG_14_NO_ZERO}`, () => {
  it('a merge that only keeps one Task the file did not carry tells RS-72 with 1, and neither RS-71 nor RS-73', async () => {
    const built = await shellStage()
    await built.open(built.file('theirs.json', jsonBytes(there())))
    await built.press(OPEN_CHOOSER(), 'IC-72')
    const view = built.last()
    expect(toldReasons(view), `${MG_14_TELL} / ${MG_14_NO_ZERO}`).toEqual(['RS-72'])
    expect(countOf(view, 'RS-72'), MG_14_TELL).toBe(1)
  })

  it('a merge that only overwrites the one Task tells RS-71 with 1, and neither RS-72 nor RS-73', async () => {
    const built = await shellStage()
    const incoming = oneRowDocument('Here', HERE_ROW, 1) as unknown as { schedule: { tasks: { name: string }[] } }
    const first = incoming.schedule.tasks[0]
    if (first === undefined) throw new Error('the bench document holds no Task')
    first.name = 'Renamed by the import'
    await built.open(built.file('same.json', jsonBytes(incoming)))
    await built.press(OPEN_CHOOSER(), 'IC-72')
    expect((built.last().openModal as { surface?: string } | null)?.surface, 'premise: a matched Task asks first (MG-8)').toBe(
      'Difference Review',
    )
    await built.press('Difference Review', 'IC-95')
    expect(built.loop.document().schedule.tasks.map((one) => one.name), 'premise: the file value was taken').toEqual([
      'Renamed by the import',
    ])
    const view = built.last()
    expect(toldReasons(view), `${MG_14_TELL} / ${MG_14_NO_ZERO}`).toEqual(['RS-71'])
    expect(countOf(view, 'RS-71'), MG_14_TELL).toBe(1)
  })
})
