// CR-712 wave 2 spec-only cases: a report row raised inside one reading reaches U-62 as a count, not as a notice.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEffect,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const FR_076_REPORT_ROWS_GO_TO_U_62 =
  '表示の仕方が「`U-62` に並べる」の理由は、1 回の読込（開く・開き直す・合流させる・重ねる、起動時に渡された文書を読む 表 T-024a の `OP-14` を含む）の中で上がったら、通知の欄に立てず、読込が着地したときに `_assets/tbl-glossary.md` の `U-62` に 1 行として並べること（MUST）'
const FR_076_OUTSIDE_A_READING_IT_IS_A_NOTICE =
  '読込の外で上がったら、「出す」と同じ 1 枚の通知とする —— 暦を変えて完了率を数え直したとき（`RS-52`、`FR-012`）がその場合である'
const U_62_WHAT_IT_IS = '1 回の読込（開く・開き直す・合流させる・重ねる・起動時に渡された文書を読む）の結果を、理由ごとに並べて告げる面。'
const U_62_A_COUNT_ROW =
  '件数を持つ理由（`RS-14`・`RS-16`・`RS-51`・`RS-52`・`RS-60`・`RS-71`・`RS-72`）は、その理由の語と件数と次の一手を 1 行に並べる。'
const U_62_A_NAME_TASK_GROUP = '名前を持つ理由（`RS-50`・`RS-73`）は、その理由の語の下に名前を並べる。'
const U_62_ONCE_ON_LANDING =
  '読込が着地したときに 1 度だけ立てる —— 途中で上がった理由は着地まで運び、着地しなかった読込（取りやめ・拒否）の理由は捨てる。'
const U_62_NO_ZERO_COUNT = '件数が 0 の理由を並べてはならない（MUST NOT、`MG-14`）'
const MG_14_COUNTS_IN_U_62 = '前の 2 つも、件数を添えて `U-62` に 1 行ずつ並べる（表 T-233 の表示の仕方）'
const MG_14_OLD_PLACE = '件数を添えて通知の欄（`_assets/tbl-glossary.md` の 表 T-103 の `U-57`）に告げる'
const EP_22_ONE_READING = '1 回の読込の結果を告げる面（`FR-023`・`FR-076`）'

interface ReasonEntry {
  readonly id: string
  readonly scene: { readonly ja: string }
}

const ROSTER = JSON.parse(readFileSync(join(SPEC, '_source', 'notice-reasons.json'), 'utf8')) as {
  readonly reasons: readonly ReasonEntry[]
}

interface Branch {
  readonly guard?: readonly { readonly name?: string }[]
}

interface Region {
  readonly region: string
  readonly root: { readonly carries: readonly { readonly name: string }[]; readonly transitions: Readonly<Record<string, Branch | readonly Branch[]>> }
  readonly events: readonly { readonly key: string; readonly carries: readonly { readonly name: string }[] }[]
}

const MACHINES = JSON.parse(readFileSync(join(SPEC, '_source', 'state-machines.json'), 'utf8')) as {
  readonly regions: readonly Region[]
}

/** @purity pure */
function cellOf(table: string, id: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' ')
}

/** @purity pure */
function stepped(session: ScreenSession, events: readonly SessionEvent[]): ScreenSession {
  return events.reduce((now, event) => advanceScreenSession(now, event).state, session)
}

const QUESTION = { manner: 'NT-7', question: 'QN-5', items: [] } as const

const INCOMING = { fileName: 'incoming.json', byteLength: 2, documentTitle: null } as const

// see T-290
const MERGING: readonly SessionEvent[] = [
  { type: 'documentOpenAsked', openRoute: 'drop' },
  { type: 'documentFileRead', question: QUESTION, incomingFile: INCOMING },
  { type: 'openChoiceAnswered', openChoice: 'merge', question: QUESTION },
]

const COUNTED = [{ reason: 'RS-51', count: 2 }]

// WHY: reportedCounts is new in CR-712 and the generated event may not hold it yet; the cast keeps a missing name a red case.
/** @purity pure */
function landed(reportedCounts: unknown): SessionEvent {
  return {
    type: 'documentOpenLanded',
    droppedTaskNames: [],
    missingTaskNames: [],
    openedFileName: 'incoming.json',
    openChoice: 'merge',
    reportedCounts,
  } as unknown as SessionEvent
}

/** @purity pure */
function surfacesRaised(effects: readonly SessionEffect[]): readonly string[] {
  return effects.flatMap((one) => (one.type === 'raiseFlowSurface' ? [one.surfaceName] : []))
}

/** @purity pure */
function reportedOf(session: ScreenSession): unknown {
  return (session.fileFlow as unknown as Readonly<Record<string, unknown>>)['reportedCounts']
}

/** @purity pure */
function isEmptyHeld(held: unknown): boolean {
  return held !== undefined && held !== null && Object.keys(held as object).length === 0
}

describe('FR-076, U-62, MG-14, RS-51 and EP-22 read as CR-712 E-05 wrote them', () => {
  it('FR-076 sends a report row to U-62 inside one reading, and to a notice outside it', () => {
    expect(REQUIREMENTS).toContain(FR_076_REPORT_ROWS_GO_TO_U_62)
    expect(REQUIREMENTS).toContain(FR_076_OUTSIDE_A_READING_IT_IS_A_NOTICE)
  })

  it('U-62 is the result of one reading, a count on one line, names under their words, once, never a zero', () => {
    const u62 = cellOf('T-103', 'U-62')
    expect(u62).toContain(U_62_WHAT_IT_IS)
    expect(u62).toContain(U_62_A_COUNT_ROW)
    expect(u62).toContain(U_62_A_NAME_TASK_GROUP)
    expect(u62).toContain(U_62_ONCE_ON_LANDING)
    expect(u62).toContain(U_62_NO_ZERO_COUNT)
  })

  it('MG-14 puts RS-71 and RS-72 in U-62 and no longer in the notification area', () => {
    const mg14 = cellOf('T-032', 'MG-14')
    expect(mg14).toContain(MG_14_COUNTS_IN_U_62)
    expect(mg14).not.toContain(MG_14_OLD_PLACE)
  })

  it('RS-51 is told on one line of U-62, no longer in the notification area', () => {
    const rs51 = ROSTER.reasons.find((one) => one.id === 'RS-51')?.scene.ja ?? ''
    expect(rs51).toContain('告げる先は `U-62` の 1 行である')
    expect(rs51).not.toContain('告げる先は通知の欄でよい')
  })

  it('EP-22 names U-62 as the result of one reading', () => {
    expect(cellOf('T-076', 'EP-22')).toContain(EP_22_ONE_READING)
  })
})

describe('table T-290 manuscript: the landing carries reportedCounts and asks hasAnythingToReport', () => {
  const fileFlow = MACHINES.regions.find((one) => one.region === 'fileFlow')

  it('fileFlow/documentOpenLanded carries reportedCounts, and the root holds it', () => {
    const event = fileFlow?.events.find((one) => one.key === 'documentOpenLanded')
    expect(event?.carries.map((one) => one.name)).toContain('reportedCounts')
    expect(fileFlow?.root.carries.map((one) => one.name)).toContain('reportedCounts')
  })

  it('the root cell is guarded by hasAnythingToReport, and hasTasksToReport is gone', () => {
    const cell = fileFlow?.root.transitions['documentOpenLanded']
    const branches: readonly Branch[] = cell === undefined ? [] : Array.isArray(cell) ? cell : [cell as Branch]
    const names = branches.flatMap((one) => (one.guard ?? []).map((guard) => guard.name))
    expect(names).toContain('hasAnythingToReport')
    expect(names).not.toContain('hasTasksToReport')
  })
})

describe(`a landed reading with counts raises U-62 -- ${FR_076_REPORT_ROWS_GO_TO_U_62.slice(-60)}`, () => {
  it('a merge landing with only a count raises U-62 and holds the count', () => {
    const before = stepped(emptyScreenSession, MERGING)
    const step = advanceScreenSession(before, landed(COUNTED))
    expect(surfacesRaised(step.effects)).toEqual(['U-62'])
    expect(reportedOf(step.state)).toEqual(COUNTED)
  })

  it('a landing with nothing to report raises no surface', () => {
    const before = stepped(emptyScreenSession, MERGING)
    const step = advanceScreenSession(before, landed([]))
    expect(surfacesRaised(step.effects)).toEqual([])
  })

  it(`closing U-62 empties the counts -- ${U_62_ONCE_ON_LANDING}`, () => {
    const before = stepped(emptyScreenSession, MERGING)
    const shown = advanceScreenSession(before, landed(COUNTED)).state
    const closed = stepped(shown, [{ type: 'flowSurfaceClosed', surfaceName: 'U-62' }])
    expect(isEmptyHeld(reportedOf(closed)), 'reportedCounts is held and empty after U-62 closes').toBe(true)
  })

  it('a reading that never lands leaves no count in the session', () => {
    const cancelled = stepped(emptyScreenSession, [
      ...MERGING.slice(0, 2),
      { type: 'flowSurfaceClosed', surfaceName: 'U-56' },
    ])
    expect(isEmptyHeld(reportedOf(cancelled)), 'reportedCounts starts empty and stays empty').toBe(true)
  })
})
