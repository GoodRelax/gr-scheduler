// CR-722 spec-only contract: the schedule draws the product of the tables whose Schedule Filter is on (TV-1, TV-2), the Resource List judges by any shown assignee and the (Unassigned) row (TV-13), and a task made while filtering stays drawn (TV-7, JDG-1775).

import { describe, expect, it } from 'vitest'

import {
  ALL_TASKS,
  ALPHA,
  BRAVO,
  CHARLIE,
  DELTA,
  ECHO,
  REQUIREMENTS,
  SATO,
  TANAKA,
  drawn,
  scheduleWith,
  visibility,
} from './cr-722-stage'
import { specTable, unbroken } from './spec-table'

const cellOf = (id: string): string => unbroken(specTable('T-353').rows.find((one) => one.id === id)?.by['定め'] ?? '')

const TV_1_PRODUCT = '日程表には、スケジュールフィルタを掛けた表のどれもが「表示」とするタスク（積）だけを描く —— スケジュールフィルタを掛けた表が 1 つも無ければ、すべてを描く'
const TV_1_TOOLS_ONLY = '⭐ 列のフィルタと語は表の中を探す道具であり、日程表に効かない。'
const TV_2_FIRST_SHOW = '表の行ごとの「表示」か「非表示」であり、初めはどの表のどの行も「表示」。'
const TV_2_REPORT_ONLY = 'レポートの表ではそのタスクがレポートに載り、その行が「表示」であること（レポートに載らないタスクは描かない —— 利用者が定めた）'
const TV_2_INDEPENDENT = '⭐ 表の行は、ほかの表の表示の列やスケジュールフィルタに左右されずに作る（利用者が定めた）。'
const TV_7_CREATED = 'レポートの表の判定からは、次の診断でレポートに載るまで外す（描く） —— 作った途端に絵から消えない（利用者が定めた）。'
const TV_13_ANY_ONE = '担当リストの表がタスクを「表示」とするのは、そのタスクの担当（`Assignment` が指す `Resource`）のうち 1 人でも行が「表示」のとき —— 担当のいないタスクは（担当なし）の行が「表示」のとき（利用者が定めた）。'
const TV_13_CREATED = '⭐ どれかの表のスケジュールフィルタを掛けているあいだに作ったタスク・コピー（`TV-7`）は、担当が付くまで担当リストの判定から外す（描く）。'
const TV_13_AFTER = '担当が付いたあとは、その担当の行に従う。'

describe('CR-722 the manuscript these cases are driven by', () => {
  it.each([
    ['TV-1', TV_1_PRODUCT],
    ['TV-1', TV_1_TOOLS_ONLY],
    ['TV-2', TV_2_FIRST_SHOW],
    ['TV-2', TV_2_REPORT_ONLY],
    ['TV-2', TV_2_INDEPENDENT],
    ['TV-7', TV_7_CREATED],
    ['TV-13', TV_13_ANY_ONE],
    ['TV-13', TV_13_CREATED],
    ['TV-13', TV_13_AFTER],
  ] as const)('T-353 %s still says it, word for word', (id, clause) => {
    expect(cellOf(id)).toContain(clause)
  })

  it('FR-151 still names table T-353 for the three tables and their entrance IC-143', () => {
    expect(REQUIREMENTS).toContain('表 T-353')
  })
})

describe(`FR-151 T-353 TV-1 -- ${TV_1_PRODUCT.slice(0, 40)}`, () => {
  it('no table has its Schedule Filter on: nothing narrows (null), whatever rows are Hide', () => {
    expect(drawn({})).toBeNull()
    expect(drawn({ search: visibility({ hiddenKeys: [ALPHA] }), resourceList: visibility({ hiddenKeys: [TANAKA] }) })).toBeNull()
  })

  it('a table with its Schedule Filter on and no Hide row still narrows: every task is drawn, not null', () => {
    expect(drawn({ search: visibility({ isApplied: true }) })).toEqual(ALL_TASKS)
  })

  it('the Search table alone draws its Show rows', () => {
    expect(drawn({ search: visibility({ hiddenKeys: [ALPHA], isApplied: true }) })).toEqual([BRAVO, CHARLIE, DELTA, ECHO])
  })

  it('JDG-1814: Hide Alpha in the search table and Tanaka in the Resource List, both on -- neither Alpha nor the task only Tanaka carries is drawn', () => {
    const both = drawn({
      search: visibility({ hiddenKeys: [ALPHA], isApplied: true }),
      resourceList: visibility({ hiddenKeys: [TANAKA], isApplied: true }),
    })
    expect(both).toEqual([CHARLIE, DELTA, ECHO])
  })

  it('JDG-1814: turning the search table off brings Alpha back; only the Resource List narrows', () => {
    const one = drawn({
      search: visibility({ hiddenKeys: [ALPHA], isApplied: false }),
      resourceList: visibility({ hiddenKeys: [TANAKA], isApplied: true }),
    })
    expect(one).toEqual([ALPHA, CHARLIE, DELTA, ECHO])
  })

  it('TV-5: the Hide rows of a table whose Schedule Filter is off do not narrow', () => {
    expect(
      drawn({ search: visibility({ hiddenKeys: [BRAVO] }), report: visibility({ hiddenKeys: [ALPHA], isApplied: true }), reportTaskUids: ALL_TASKS }),
    ).toEqual([BRAVO, CHARLIE, DELTA, ECHO])
  })
})

describe(`FR-151 T-353 TV-2 -- ${TV_2_REPORT_ONLY.slice(0, 40)}`, () => {
  it('the report table on draws only the tasks the report lists', () => {
    expect(drawn({ report: visibility({ isApplied: true }), reportTaskUids: [ALPHA, BRAVO] })).toEqual([ALPHA, BRAVO])
  })

  it('and of those, only the rows that are Show', () => {
    expect(drawn({ report: visibility({ hiddenKeys: [BRAVO], isApplied: true }), reportTaskUids: [ALPHA, BRAVO] })).toEqual([ALPHA])
  })

  it('the three tables on together draw the intersection', () => {
    const three = drawn({
      search: visibility({ hiddenKeys: [DELTA], isApplied: true }),
      report: visibility({ isApplied: true }),
      reportTaskUids: [ALPHA, BRAVO, CHARLIE, DELTA],
      resourceList: visibility({ hiddenKeys: [SATO], isApplied: true }),
    })
    expect(three).toEqual([BRAVO, CHARLIE])
  })
})

describe(`FR-151 T-353 TV-13 -- ${TV_13_ANY_ONE.slice(0, 40)}`, () => {
  it('a task with two assignees is drawn while one of them is Show', () => {
    expect(drawn({ resourceList: visibility({ hiddenKeys: [SATO], isApplied: true }) })).toContain(CHARLIE)
    expect(drawn({ resourceList: visibility({ hiddenKeys: [TANAKA], isApplied: true }) })).toContain(CHARLIE)
  })

  it('and is not drawn when every assignee is Hide', () => {
    expect(drawn({ resourceList: visibility({ hiddenKeys: [SATO, TANAKA], isApplied: true }) })).toEqual([DELTA, ECHO])
  })

  it('a task with no assignee follows the (Unassigned) row', () => {
    expect(drawn({ resourceList: visibility({ isApplied: true }) })).toEqual(ALL_TASKS)
    expect(drawn({ resourceList: visibility({ isUnassignedHidden: true, isApplied: true }) })).toEqual([ALPHA, BRAVO, CHARLIE])
  })

  it('the (Unassigned) row Hide narrows nothing while the Resource List is off', () => {
    expect(drawn({ resourceList: visibility({ isUnassignedHidden: true }) })).toBeNull()
  })
})

describe(`FR-151 T-353 TV-7 and TV-13 -- JDG-1775: ${TV_13_CREATED.slice(0, 40)}`, () => {
  it('a task made while filtering, with no assignee, is drawn although (Unassigned) is Hide', () => {
    expect(drawn({ resourceList: visibility({ isUnassignedHidden: true, isApplied: true }), created: [ECHO] })).toEqual([ALPHA, BRAVO, CHARLIE, ECHO])
  })

  it('a task made while filtering is drawn although the report does not list it yet', () => {
    expect(drawn({ report: visibility({ isApplied: true }), reportTaskUids: [ALPHA], created: [ECHO] })).toEqual([ALPHA, ECHO])
  })

  it('a task made while filtering is a Show row of the search table', () => {
    expect(drawn({ search: visibility({ hiddenKeys: [ALPHA], isApplied: true }), created: [ECHO] })).toContain(ECHO)
  })

  it(`${TV_13_AFTER} -- once Tanaka (Hide) is assigned to it, it is not drawn`, () => {
    const assigned = scheduleWith([
      [ALPHA, SATO],
      [BRAVO, TANAKA],
      [CHARLIE, SATO],
      [CHARLIE, TANAKA],
      [ECHO, TANAKA],
    ])
    const narrowed = drawn({ resourceList: visibility({ hiddenKeys: [TANAKA], isUnassignedHidden: true, isApplied: true }), created: [ECHO] }, assigned)
    expect(narrowed).toEqual([ALPHA, CHARLIE])
  })

  it('once Sato (Show) is assigned to it, it stays drawn', () => {
    const assigned = scheduleWith([
      [ALPHA, SATO],
      [BRAVO, TANAKA],
      [ECHO, SATO],
    ])
    const narrowed = drawn({ resourceList: visibility({ hiddenKeys: [TANAKA], isUnassignedHidden: true, isApplied: true }), created: [ECHO] }, assigned)
    expect(narrowed).toEqual([ALPHA, ECHO])
  })
})
