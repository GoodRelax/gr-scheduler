// CR-786 spec-only tests: the [Bring to Front] button rows PR-48 and PR-49 in the properties panel (T-016, FR-019).

import { describe, expect, it } from 'vitest'

import type { PropertiesPanel, PropertyControl, PropertyField } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { ItemRef } from '../../src/entity/document-model/selection/selection'
import { commandsOf } from './cr-606-stage'
import { COMMENT_ID, HIGHLIGHT_ID, OTHER_COMMENT_ID, commentRow, documentWith, highlightRow } from './cr-777-stage'
import {
  CM_100,
  CM_101,
  FR_019_FRONT,
  PR_48,
  PR_49,
  REQUIREMENTS,
  T_016_ORDER,
  accepted,
  tableNeighbourOf,
  tableRowsOf,
  commentIdsOf,
  fieldOf,
  highlightIdsOf,
  panelOf,
  pressOf,
  propertyWordOf,
  rowsOf,
  run,
  type Language,
} from './cr-786-stage'
import { bare, specTable } from './spec-table'

const OTHER_HIGHLIGHT_ID = '78600000-0000-4000-8000-0000000000b2'
const PR_21 = 'PR-21'
const COMMENT_BOX = 'CommentBox'
const HIGHLIGHT_BOX = 'HighlightBox'
const COMMAND_KIND = '命令'
const LANGUAGES: readonly Language[] = ['ja', 'en']
const BRING_TO_FRONT_EN = 'Bring to Front'

// WHY: the box to bring forward stands first, so pressing the button has something to move.
const document = (): Document =>
  documentWith(
    [commentRow({ id: COMMENT_ID }), commentRow({ id: OTHER_COMMENT_ID })],
    [highlightRow({ id: HIGHLIGHT_ID }), highlightRow({ id: OTHER_HIGHLIGHT_ID })],
  )

const COMMENT_ITEM: ItemRef = { kind: 'commentBox', id: COMMENT_ID }
const HIGHLIGHT_ITEM: ItemRef = { kind: 'highlightBox', id: HIGHLIGHT_ID }

const t016 = (id: string): Record<string, string> => specTable('T-016').rows.find((one) => one.id === id)?.by ?? {}

const pressControlOf = (field: PropertyField): PropertyControl => {
  const pressed = field.controls.filter((one) => one.press !== undefined)
  if (pressed.length !== 1) throw new Error(`expected one press entrance in ${field.row}, got ${pressed.length}`)
  return pressed[0] as PropertyControl
}

const indexOf = (panel: PropertiesPanel, row: string): number => rowsOf(panel).indexOf(row)

describe('CR-786 premise -- T-016 holds PR-48 and PR-49 as command rows with the dictionary word', () => {
  it('FR-019 holds the clause these cases quote', () => {
    expect(REQUIREMENTS).toContain(FR_019_FRONT)
  })

  it.each([
    [PR_48, COMMENT_BOX],
    [PR_49, HIGHLIGHT_BOX],
  ])('T-016 %s is a command row of %s', (row, target) => {
    expect(bare(t016(row)['入力の型'] ?? '')).toBe(COMMAND_KIND)
    expect(bare(t016(row)['対象'] ?? '')).toBe(target)
  })

  it('T-016 prints PR-48 right after PR-21 and PR-50 (PR-48 note: right below the text and font size fields)', () => {
    expect(T_016_ORDER.indexOf(PR_48)).toBe(T_016_ORDER.indexOf(PR_21) + 2)
    expect(T_016_ORDER.indexOf(PR_48)).toBe(T_016_ORDER.indexOf('PR-50') + 1)
  })

  it('T-016 prints PR-49 first among the HighlightBox rows (FR-006: the look rows close the rows of a target)', () => {
    expect(tableRowsOf(HIGHLIGHT_BOX)[0]).toBe(PR_49)
  })

  it('the dictionary word of PR-48 and PR-49 is Bring to Front in English', () => {
    expect([propertyWordOf(PR_48, 'en'), propertyWordOf(PR_49, 'en')]).toEqual([BRING_TO_FRONT_EN, BRING_TO_FRONT_EN])
  })
})

describe('T-016 -- the table order is the printed order of the panel', () => {
  it('a selected comment box shows PR-48 right after the row the table prints before it', () => {
    const before = tableNeighbourOf(PR_48, COMMENT_BOX, -1) as string
    const panel = panelOf(document(), COMMENT_ITEM, 'ja')
    expect(indexOf(panel, before), rowsOf(panel).join(' ')).toBeGreaterThanOrEqual(0)
    expect(indexOf(panel, PR_48)).toBe(indexOf(panel, before) + 1)
  })

  it('a selected highlight box shows PR-49 right before the row the table prints after it', () => {
    const after = tableNeighbourOf(PR_49, HIGHLIGHT_BOX, 1) as string
    const panel = panelOf(document(), HIGHLIGHT_ITEM, 'ja')
    expect(indexOf(panel, after), rowsOf(panel).join(' ')).toBeGreaterThanOrEqual(0)
    expect(indexOf(panel, PR_49)).toBe(indexOf(panel, after) - 1)
  })

  it.each([
    [COMMENT_BOX, COMMENT_ITEM],
    [HIGHLIGHT_BOX, HIGHLIGHT_ITEM],
  ])('the T-016 rows a selected %s shows stand in the table order', (target, item) => {
    const shown = rowsOf(panelOf(document(), item, 'ja'))
    const tableRows = tableRowsOf(target)
    expect(shown.filter((row) => tableRows.includes(row))).toEqual(tableRows.filter((row) => shown.includes(row)))
  })

  it('PR-48 is not shown for a highlight box, PR-49 not for a comment box', () => {
    expect(rowsOf(panelOf(document(), HIGHLIGHT_ITEM, 'ja'))).not.toContain(PR_48)
    expect(rowsOf(panelOf(document(), COMMENT_ITEM, 'ja'))).not.toContain(PR_49)
  })
})

describe('FR-038 -- the button shows the dictionary word of its row in the screen language', () => {
  it.each(LANGUAGES)('PR-48 in %s: one press entrance whose word is the display-words entry', (language) => {
    const field = fieldOf(panelOf(document(), COMMENT_ITEM, language), PR_48)
    expect(pressControlOf(field).press).toBe(propertyWordOf(PR_48, language))
  })

  it.each(LANGUAGES)('PR-49 in %s: one press entrance whose word is the display-words entry', (language) => {
    const field = fieldOf(panelOf(document(), HIGHLIGHT_ITEM, language), PR_49)
    expect(pressControlOf(field).press).toBe(propertyWordOf(PR_49, language))
  })
})

describe(`PR-48 / PR-49 -- ${FR_019_FRONT}`, () => {
  it('pressing PR-48 makes exactly CM-100 for the selected comment box', () => {
    const field = fieldOf(panelOf(document(), COMMENT_ITEM, 'ja'), PR_48)
    expect(commandsOf(document(), pressOf(field, pressControlOf(field)))).toEqual([{ kind: CM_100, commentBoxId: COMMENT_ID }])
  })

  it('pressing PR-49 makes exactly CM-101 for the selected highlight box', () => {
    const field = fieldOf(panelOf(document(), HIGHLIGHT_ITEM, 'ja'), PR_49)
    expect(commandsOf(document(), pressOf(field, pressControlOf(field)))).toEqual([{ kind: CM_101, highlightBoxId: HIGHLIGHT_ID }])
  })

  it('the command PR-48 makes, run by editDocument, moves the comment box to the end', () => {
    const field = fieldOf(panelOf(document(), COMMENT_ITEM, 'ja'), PR_48)
    const [command] = commandsOf(document(), pressOf(field, pressControlOf(field)))
    const moved = accepted(run(document(), command as unknown as Record<string, unknown>))
    expect(commentIdsOf(moved)).toEqual([OTHER_COMMENT_ID, COMMENT_ID])
  })

  it('the command PR-49 makes, run by editDocument, moves the highlight box to the end', () => {
    const field = fieldOf(panelOf(document(), HIGHLIGHT_ITEM, 'ja'), PR_49)
    const [command] = commandsOf(document(), pressOf(field, pressControlOf(field)))
    const moved = accepted(run(document(), command as unknown as Record<string, unknown>))
    expect(highlightIdsOf(moved)).toEqual([OTHER_HIGHLIGHT_ID, HIGHLIGHT_ID])
  })
})
