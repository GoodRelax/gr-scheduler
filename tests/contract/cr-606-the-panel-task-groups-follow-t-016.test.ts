// CR-606 spec-only cases: the panel's rows are table T-016's rows -- filtered by appliesTo and, for a

import { describe, expect, it } from 'vitest'

import type { PropertiesPanel } from '../../src/adapter/screen-renderer/screen-renderer'
import type { ItemRef } from '../../src/entity/document-model/selection/selection'
import {
  COLOR_KIND,
  PROPERTY_ITEMS_TABLE,
  REQUIREMENTS,
  T_016,
  appliesToOf,
  commandsOf,
  dependencyEndOf,
  documentOf,
  fieldOf,
  itemOf,
  panelOf,
  propertyLabelOf,
  recordOf,
  taskItem,
  taskOf,
  visualOf,
} from './cr-606-stage'
import { specTable } from './spec-table'

// see FR-006
const FR_006_SHOWN_FOR = '⭐ 対象が `Task` の行は、さらに同表の `出す種類` の欄で絞ること（MUST）'
const FR_006_BY_MILESTONE =
  '`Task.milestone`（`_assets/fig-erd-detail.md` の `AT-30`）が真のタスクには `milestone` か `both` の行だけを、偽のタスクには `task` か `both` の行だけを出す。'
const FR_006_NOT_BY_SHAPE = '⛔ 絞る鍵を図形の列に取ってはならない（MUST NOT）'
const FR_006_ONLY_SAME_TARGET = '⛔ いま選ばれているものと同じ「対象」を持つ行だけを出すこと（MUST）。'
const FR_006_PR_1_BY_KIND =
  '名が何の名かを言う行（同表の `PR-1`）は、`FR-038` の辞書がマイルストーンのときの名も同じ行 ID で持ち、選んでいるものの種類の名で出すこと（MUST）'
const FR_006_COLOR_NAME_LEFT =
  '⭐ 色の行（入力の型が `色` の行）も同じであり、項目名は色の欄の 1 段目の左に置き、色の欄の 2 つの段は値の欄の左端から始めること（MUST）'
const FR_006_VISUAL_ORDER =
  '⭐ 見た目の行どうしは、どの対象でも 枠線の幅 → 枠線の色 → 塗りの色 → 塗りの透過率 → 字の色 の順に並べ、1 つの行に色を 1 つだけ持たせること（MUST）'
// see FR-009
const FR_009_ROWS =
  '依存線を選んだときにプロパティパネルへ出す項目は、表 T-016 の `対象` が `Dependency` の行（種別・ラグ・両端）とすること（MUST）'
const FR_009_LAG_ONLY = '⭐ 編集できるのはラグだけであり、種別と両端は同表が読み取り専用と記す'
const FR_009_ABBREVIATION_AND_ENDS =
  '⭐ 種別は本要求の 表 T-018 の `名` の欄の略号で、両端はタスクの名と `uid` で示すこと（MUST）'
const T_018_ABBREVIATION =
  '⭐ 画面に依存の種別を出すときは、本表の `名` の欄の略号（括弧の前の `FS` / `SF` / `FF` / `SS`）で出すこと（MUST）。'
const T_018_NO_NUMBER = '⛔ 保存した数（`linkType`）をそのまま出してはならない（MUST NOT）'
// see PR-37, PR-38
const PR_37_ORDER = '並びは先行の `uid` の昇順。'
const PR_38_ORDER = '並びは後続の `uid` の昇順。'
const NONE_IS_EMPTY = '依存が無いときは空の欄とする'

describe('CR-606 premise -- the clauses these cases quote still stand', () => {
  it.each([
    ['FR-006 shownFor', FR_006_SHOWN_FOR],
    ['FR-006 by Task.milestone', FR_006_BY_MILESTONE],
    ['FR-006 not by shape', FR_006_NOT_BY_SHAPE],
    ['FR-006 only the same target', FR_006_ONLY_SAME_TARGET],
    ['FR-006 PR-1 by kind', FR_006_PR_1_BY_KIND],
    ['FR-006 color name left', FR_006_COLOR_NAME_LEFT],
    ['FR-006 visual order', FR_006_VISUAL_ORDER],
    ['FR-009 rows', FR_009_ROWS],
    ['FR-009 lag only', FR_009_LAG_ONLY],
    ['FR-009 abbreviation and ends', FR_009_ABBREVIATION_AND_ENDS],
    ['T-018 abbreviation', T_018_ABBREVIATION],
    ['T-018 no number', T_018_NO_NUMBER],
  ])('01-04 holds %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each([PR_37_ORDER, PR_38_ORDER, NONE_IS_EMPTY])('table T-016 holds %s', (clause) => {
    expect(PROPERTY_ITEMS_TABLE).toContain(clause)
  })

  it('every Task row of the manuscript carries shownFor, and no other row does', () => {
    for (const item of T_016) {
      if (appliesToOf(item) === 'Task') expect(['task', 'milestone', 'both'], item.id).toContain(item.shownFor)
      else expect(item.shownFor, item.id).toBeUndefined()
    }
    expect(T_016.some((one) => one.shownFor === 'task')).toBe(true)
    expect(T_016.some((one) => one.shownFor === 'milestone')).toBe(true)
  })
})

const PLAIN = 1
const MILESTONE = 2
const MILESTONE_DRAWN_AS_BAR = 3
const TASK_DRAWN_AS_MILESTONE = 4

const ONE_DAY = { start: '2026-04-08T08:00:00', finish: '2026-04-08T08:00:00' }

const KINDS = documentOf({
  tasks: [
    taskOf(PLAIN, { milestone: false }),
    taskOf(MILESTONE, { milestone: true, ...ONE_DAY }),
    taskOf(MILESTONE_DRAWN_AS_BAR, { milestone: true, ...ONE_DAY }),
    taskOf(TASK_DRAWN_AS_MILESTONE, { milestone: false }),
  ],
  visuals: [
    visualOf(PLAIN, { shapeKind: 'rectangle' }),
    visualOf(MILESTONE, { shapeKind: 'milestone', milestoneGlyph: 'diamond' }),
    visualOf(MILESTONE_DRAWN_AS_BAR, { shapeKind: 'rectangle' }),
    visualOf(TASK_DRAWN_AS_MILESTONE, { shapeKind: 'milestone', milestoneGlyph: 'diamond' }),
  ],
})

// see FR-006, T-016
const rowsFor = (kind: 'task' | 'milestone'): readonly string[] =>
  T_016.filter((one) => appliesToOf(one) === 'Task' && (one.shownFor === kind || one.shownFor === 'both')).map(
    (one) => one.id,
  )

const rowsOf = (panel: PropertiesPanel): readonly string[] => panel.fields.map((one) => one.row)

describe(`FR-006 -- ${FR_006_SHOWN_FOR}`, () => {
  it(`${FR_006_BY_MILESTONE} -- a task (milestone false) gets exactly the task and both rows, in T-016 order`, () => {
    expect(rowsOf(panelOf(KINDS, taskItem(PLAIN)))).toEqual(rowsFor('task'))
  })

  it(`${FR_006_BY_MILESTONE} -- a milestone (milestone true) gets exactly the milestone and both rows, in T-016 order`, () => {
    expect(rowsOf(panelOf(KINDS, taskItem(MILESTONE)))).toEqual(rowsFor('milestone'))
  })

  it(`${FR_006_NOT_BY_SHAPE} -- Task.milestone true drawn as a rectangle still gets the milestone rows`, () => {
    expect(rowsOf(panelOf(KINDS, taskItem(MILESTONE_DRAWN_AS_BAR)))).toEqual(rowsFor('milestone'))
  })

  it(`${FR_006_NOT_BY_SHAPE} -- Task.milestone false drawn as a milestone still gets the task rows`, () => {
    expect(rowsOf(panelOf(KINDS, taskItem(TASK_DRAWN_AS_MILESTONE)))).toEqual(rowsFor('task'))
  })

  it.each([
    ['task', PLAIN, 'milestone'],
    ['milestone', MILESTONE, 'task'],
  ] as const)(`${FR_006_ONLY_SAME_TARGET} -- a %s shows no row that T-016 keeps for the other kind`, (_kind, uid, other) => {
    const shown = rowsOf(panelOf(KINDS, taskItem(uid)))
    const others = T_016.filter((one) => one.shownFor === other).map((one) => one.id)
    expect(others.length, 'premise: T-016 has rows of the other kind').toBeGreaterThan(0)
    for (const id of others) expect(shown, id).not.toContain(id)
  })

  it(`${FR_006_ONLY_SAME_TARGET} -- no row of another target (TaskGroup, boxes, Dependency) reaches a task's panel`, () => {
    const foreign = T_016.filter((one) => appliesToOf(one) !== 'Task').map((one) => one.id)
    for (const uid of [PLAIN, MILESTONE]) {
      const shown = rowsOf(panelOf(KINDS, taskItem(uid)))
      for (const id of foreign) expect(shown, `${id} on task ${uid}`).not.toContain(id)
    }
  })

  it(`${FR_006_VISUAL_ORDER} -- a task ends with outline width, outline color, fill color on both kinds`, () => {
    for (const uid of [PLAIN, MILESTONE]) {
      const shown = rowsOf(panelOf(KINDS, taskItem(uid)))
      const lastThree = shown.slice(-3).map((row) => itemOf(row).columns)
      expect(lastThree, `task ${uid}`).toEqual([['strokeWidthPx'], ['strokeColor'], ['fillColor']])
    }
  })
})

describe(`FR-006 -- ${FR_006_PR_1_BY_KIND}`, () => {
  it('a task names PR-1 with properties[PR-1].label', () => {
    expect(fieldOf(panelOf(KINDS, taskItem(PLAIN)), 'PR-1').name).toBe(propertyLabelOf('PR-1', 'label'))
  })

  it('a milestone names PR-1 with properties[PR-1].milestoneLabel', () => {
    expect(fieldOf(panelOf(KINDS, taskItem(MILESTONE)), 'PR-1').name).toBe(propertyLabelOf('PR-1', 'milestoneLabel'))
  })

  it(`${FR_006_NOT_BY_SHAPE} -- the name follows Task.milestone, not the drawn shape`, () => {
    expect(fieldOf(panelOf(KINDS, taskItem(MILESTONE_DRAWN_AS_BAR)), 'PR-1').name).toBe(
      propertyLabelOf('PR-1', 'milestoneLabel'),
    )
    expect(fieldOf(panelOf(KINDS, taskItem(TASK_DRAWN_AS_MILESTONE)), 'PR-1').name).toBe(propertyLabelOf('PR-1', 'label'))
  })

  it('control: the two names differ', () => {
    expect(propertyLabelOf('PR-1', 'label')).not.toBe(propertyLabelOf('PR-1', 'milestoneLabel'))
  })
})

describe(`FR-006 -- ${FR_006_COLOR_NAME_LEFT}`, () => {
  it.each([
    ['task', PLAIN],
    ['milestone', MILESTONE],
  ] as const)('on a %s: a color row carries no name-above flag, like every other row (CR-689)', (_kind, uid) => {
    const panel = panelOf(KINDS, taskItem(uid))
    let colorRows = 0
    for (const field of panel.fields) {
      if (itemOf(field.row).inputKinds.includes(COLOR_KIND)) colorRows += 1
      expect(Object.keys(field), `${field.row}`).not.toContain('isNameAbove')
    }
    expect(colorRows, 'premise: the panel has color rows').toBeGreaterThan(0)
  })
})

describe('T-016 -- read-only rows show text only', () => {
  it.each([
    ['task', PLAIN],
    ['milestone', MILESTONE],
  ] as const)('on a %s: every row T-016 marks read-only is not editable and has no control', (_kind, uid) => {
    const panel = panelOf(KINDS, taskItem(uid))
    const readOnly = panel.fields.filter((one) => itemOf(one.row).isReadOnly === true)
    expect(readOnly.length, 'premise: a read-only row is shown').toBeGreaterThan(0)
    for (const field of readOnly) {
      expect(field.isEditable, field.row).toBe(false)
      expect(field.controls, field.row).toEqual([])
    }
  })

  it('PR-34 shows the task uid as its text', () => {
    expect(itemOf('PR-34').columns).toEqual(['uid'])
    for (const uid of [PLAIN, MILESTONE]) {
      expect(fieldOf(panelOf(KINDS, taskItem(uid)), 'PR-34').text, `task ${uid}`).toBe(String(uid))
    }
  })
})

const linkOf = (predecessorUid: number, linkType = 1): Record<string, unknown> => ({
  predecessorUid,
  linkType,
  lag: 0,
  lagFormat: null,
  carry: {},
  carryElements: [],
})

// WHY: task 5's links are held in the order 4, 1, 3 and task 5 precedes task 2 in the array,
// so only the uid order passes.
const LINKED = documentOf({
  tasks: [
    taskOf(5, { dependencies: [linkOf(4), linkOf(1), linkOf(3)] }),
    taskOf(1),
    taskOf(2, { dependencies: [linkOf(1)] }),
    taskOf(3),
    taskOf(4),
    taskOf(6, { milestone: true, ...ONE_DAY, dependencies: [linkOf(2)] }),
  ],
  visuals: [visualOf(6, { shapeKind: 'milestone', milestoneGlyph: 'diamond' })],
})

const endsOf = (uids: readonly number[]): string => uids.map((uid) => dependencyEndOf(`Task${uid}`, uid)).join('\n')

describe(`T-016 PR-37 / PR-38 -- one line per dependency, ${PR_37_ORDER} ${PR_38_ORDER}`, () => {
  it('PR-37 of task 5 lists its three predecessors by uid ascending', () => {
    expect(fieldOf(panelOf(LINKED, taskItem(5)), 'PR-37').text).toBe(endsOf([1, 3, 4]))
  })

  it('PR-38 of task 1 lists its two successors by uid ascending', () => {
    expect(fieldOf(panelOf(LINKED, taskItem(1)), 'PR-38').text).toBe(endsOf([2, 5]))
  })

  it(`${NONE_IS_EMPTY} -- task 5 has no successor, task 1 no predecessor`, () => {
    expect(fieldOf(panelOf(LINKED, taskItem(5)), 'PR-38').text).toBe('')
    expect(fieldOf(panelOf(LINKED, taskItem(1)), 'PR-37').text).toBe('')
  })

  it('a milestone shows its predecessors and successors too (both rows)', () => {
    expect(itemOf('PR-37').shownFor).toBe('both')
    expect(fieldOf(panelOf(LINKED, taskItem(6)), 'PR-37').text).toBe(endsOf([2]))
    expect(fieldOf(panelOf(LINKED, taskItem(2)), 'PR-38').text).toBe(endsOf([6]))
  })

  it('control: the dictionary form carries both the name and the uid', () => {
    const line = dependencyEndOf('Task4', 4)
    expect(line).toContain('Task4')
    expect(line).toContain('4')
    expect(line).not.toBe('Task4')
  })
})

const T_018 = specTable('T-018')
const LINK_TYPES: readonly (readonly [string, number, string])[] = T_018.rows.map((row) => {
  const number = Number((row.by['`linkType`'] ?? '').trim())
  const abbreviation = (row.by['名'] ?? '').split('（')[0]?.trim() ?? ''
  return [row.id, number, abbreviation] as const
})

const FROM = 10
const successorOf = (index: number): number => 11 + index

const LINES = documentOf({
  tasks: [
    taskOf(FROM),
    ...LINK_TYPES.map(([, linkType], index) => taskOf(successorOf(index), { dependencies: [linkOf(FROM, linkType)] })),
  ],
})

const dependencyItem = (successorUid: number): ItemRef => ({ kind: 'dependency', successorUid, ordinal: 0 })

const DEPENDENCY_ROWS = T_016.filter((one) => appliesToOf(one) === 'Dependency')

describe(`FR-009 -- ${FR_009_ROWS}`, () => {
  it('premise: T-018 has four rows, each with a number and an abbreviation', () => {
    expect(LINK_TYPES).toHaveLength(4)
    for (const [id, number, abbreviation] of LINK_TYPES) {
      expect(Number.isInteger(number), id).toBe(true)
      expect(abbreviation, id).toMatch(/^[A-Z]{2}$/)
    }
    expect(DEPENDENCY_ROWS.map((one) => one.columns[0])).toEqual(['linkType', 'lag', 'predecessorUid', 'successorUid'])
  })

  it('the panel of a selected line holds exactly T-016\'s Dependency rows, in order', () => {
    expect(rowsOf(panelOf(LINES, dependencyItem(successorOf(0))))).toEqual(DEPENDENCY_ROWS.map((one) => one.id))
  })

  it.each(LINK_TYPES.map(([id, number, abbreviation], index) => [id, number, abbreviation, index] as const))(
    `${T_018_ABBREVIATION} -- %s: linkType %s shows as %s`,
    (_id, number, abbreviation, index) => {
      const field = fieldOf(panelOf(LINES, dependencyItem(successorOf(index))), rowOfColumn('linkType'))
      expect(field.text).toBe(abbreviation)
      expect(field.text, T_018_NO_NUMBER).not.toBe(String(number))
    },
  )

  it(`${FR_009_ABBREVIATION_AND_ENDS} -- the two ends read as propertyField.dependencyEnd`, () => {
    const panel = panelOf(LINES, dependencyItem(successorOf(1)))
    expect(fieldOf(panel, rowOfColumn('predecessorUid')).text).toBe(dependencyEndOf(`Task${FROM}`, FROM))
    expect(fieldOf(panel, rowOfColumn('successorUid')).text).toBe(dependencyEndOf(`Task${successorOf(1)}`, successorOf(1)))
  })

  it(`${FR_009_LAG_ONLY} -- only the lag row is editable; type and both ends have no control`, () => {
    const panel = panelOf(LINES, dependencyItem(successorOf(0)))
    for (const item of DEPENDENCY_ROWS) {
      const field = fieldOf(panel, item.id)
      if (item.columns[0] === 'lag') {
        expect(field.isEditable, item.id).toBe(true)
        expect(field.controls.length, item.id).toBeGreaterThan(0)
      } else {
        expect(item.isReadOnly, `T-016 marks ${item.id} read-only`).toBe(true)
        expect(field.isEditable, item.id).toBe(false)
        expect(field.controls, item.id).toEqual([])
      }
    }
  })

  it('the lag control commits CM-38 setDependencyLag on this line', () => {
    const panel = panelOf(LINES, dependencyItem(successorOf(0)))
    const field = fieldOf(panel, rowOfColumn('lag'))
    const control = field.controls[0]
    expect(control).toBeDefined()
    const commands = commandsOf(LINES, { row: field.row, key: control!.key, text: '2' })
    expect(commands.map((one) => recordOf(one)['kind'])).toEqual(['setDependencyLag'])
    expect(recordOf(commands[0]!)['predecessorUid']).toBe(FROM)
    expect(recordOf(commands[0]!)['successorUid']).toBe(successorOf(0))
  })
})

function rowOfColumn(column: string): string {
  const found = DEPENDENCY_ROWS.find((one) => one.columns[0] === column)
  if (found === undefined) throw new Error(`T-016 has no Dependency row of ${column}`)
  return found.id
}
