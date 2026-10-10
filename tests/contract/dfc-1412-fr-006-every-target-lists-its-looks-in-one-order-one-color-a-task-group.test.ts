// DFC-1412 spec-only cases: FR-006 -- on every target the look rows run outline width, outline color, fill color, fill transparency, text color, and a color row holds one color.

import { describe, expect, it } from 'vitest'

import type { PropertiesPanel } from '../../src/adapter/screen-renderer/screen-renderer'
import type { ItemRef } from '../../src/entity/document-model/selection/selection'
import {
  GROUP_ID,
  REQUIREMENTS,
  T_016,
  commentBoxOf,
  documentOf,
  highlightBoxOf,
  panelOf,
  taskItem,
  taskOf,
  visualOf,
} from './cr-606-stage'

// see FR-006
const FR_006_VISUAL_ORDER =
  '⭐ 見た目の行どうしは、どの対象でも 枠線の幅 → 枠線の色 → 塗りの色 → 塗りの透過率 → 字の色 の順に並べ、1 つの行に色を 1 つだけ持たせること（MUST）'

// WHY: the manuscript names the five looks by their words; table T-016 names the column each one is.
const LOOK_ORDER = [
  ['枠線の幅', 'strokeWidthPx'],
  ['枠線の色', 'strokeColor'],
  ['塗りの色', 'fillColor'],
  ['塗りの透過率', 'fillTransparencyPercent'],
  ['字の色', 'textColor'],
] as const
const LOOK_COLUMNS: readonly string[] = LOOK_ORDER.map(([, column]) => column)

const TASK = 1
const BOX = 'box-1'
const NOTE = 'note-1'

const DOCUMENT = documentOf({
  tasks: [taskOf(TASK)],
  visuals: [visualOf(TASK, { shapeKind: 'rectangle' })],
  highlightBoxes: [highlightBoxOf(BOX)],
  commentBoxes: [commentBoxOf(NOTE)],
})

const SCENES: readonly (readonly [string, ItemRef | null, readonly string[]])[] = [
  ['a task', taskItem(TASK), []],
  ['a highlight box', { kind: 'highlightBox', id: BOX }, []],
  ['a comment box', { kind: 'commentBox', id: NOTE }, []],
  ['a task group', null, [GROUP_ID]],
]

const looksOf = (panel: PropertiesPanel): readonly string[] =>
  panel.fields.flatMap((field) => itemOf(field.row).columns.filter((column) => LOOK_COLUMNS.includes(column)))

// WHY: a task group's panel also holds the task group name (AT-53), which is no row of table T-016.
const itemOf = (row: string) => T_016.find((one) => one.id === row) ?? { id: row, columns: [], inputKinds: [] }

const rank = (column: string): number => LOOK_COLUMNS.indexOf(column)

describe('DFC-1412 premise -- the clause these cases press still stands', () => {
  it(FR_006_VISUAL_ORDER, () => {
    expect(REQUIREMENTS).toContain(FR_006_VISUAL_ORDER)
  })
})

describe(`FR-006 -- ${FR_006_VISUAL_ORDER}`, () => {
  // WHY: a task group has one color (TaskGroup.color), which is none of the five looks, so it has no order to keep.
  it.each(SCENES.filter(([name]) => name !== 'a task group'))('%s: the look rows the panel shows keep the order of the clause', (_name, item, groupIds) => {
    const shown = looksOf(panelOf(DOCUMENT, item, groupIds))
    expect(shown.length, 'premise: the target shows at least one look row').toBeGreaterThan(0)
    expect(shown, 'the look rows, in the order the panel draws them').toEqual(
      [...shown].sort((a, b) => rank(a) - rank(b)),
    )
  })

  it('the highlight box shows outline width, outline color, fill color, fill transparency, and no text color', () => {
    expect(looksOf(panelOf(DOCUMENT, { kind: 'highlightBox', id: BOX }, []))).toEqual([
      'strokeWidthPx',
      'strokeColor',
      'fillColor',
      'fillTransparencyPercent',
    ])
  })

  it('the comment box shows all five looks, ending with the text color', () => {
    expect(looksOf(panelOf(DOCUMENT, { kind: 'commentBox', id: NOTE }, []))).toEqual(LOOK_COLUMNS)
  })

  it.each(SCENES)('%s: every color row holds exactly one color control', (_name, item, groupIds) => {
    const panel = panelOf(DOCUMENT, item, groupIds)
    let colorRows = 0
    for (const field of panel.fields) {
      if (!itemOf(field.row).inputKinds.includes('色')) continue
      colorRows += 1
      expect(
        field.controls.filter((control) => control.kind === 'color').length,
        `${FR_006_VISUAL_ORDER} -- row ${field.row}`,
      ).toBe(1)
    }
    expect(colorRows, 'premise: the target shows a color row').toBeGreaterThan(0)
  })

  it('no color row of a box shares its row with another look: one row, one column', () => {
    for (const item of [{ kind: 'highlightBox', id: BOX }, { kind: 'commentBox', id: NOTE }] as const) {
      for (const field of panelOf(DOCUMENT, item, []).fields) {
        const looks = itemOf(field.row).columns.filter((column) => LOOK_COLUMNS.includes(column))
        expect(looks.length, `row ${field.row} of ${item.kind}`).toBeLessThanOrEqual(1)
      }
    }
  })
})
