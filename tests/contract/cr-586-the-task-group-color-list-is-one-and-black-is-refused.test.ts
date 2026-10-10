// CR-586 spec-only cases: the task group color list is one generated list (CV-9), CM-30 and the GRS JSON read refuse the rest.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  PropertyControl,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { COLUMN_SHAPES, type Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { editDocument, type TaskGroupCommand } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import { taskGroupDocument } from '../unit/cr-541-stage'
import { bare, specTable, unbroken, type SpecRow, type SpecTable } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const T_017B: SpecTable = specTable('T-017b')
const T_294: SpecTable = specTable('T-294')
const T_233: SpecTable = specTable('T-233')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

// see CV-9
const CV_9_ONE_LIST =
  '⭐ タスクグループの色の欄が並べる名を、`TaskGroup.color` が受ける名の唯一の一覧とすること（MUST） —— 一覧は、表 T-294 の名のうち、タスクグループの帯の欄が「—」でないものとする（透明は「描かない」を持つので一覧に入る）。'
const CV_9_REFUSED =
  '⛔ 一覧の外の名（黒）は、`CM-30`（`FR-042`）も、`GRS JSON` の取り込み（`05-07-design.md` の 表 T-220 の前文のスキーマ、拒んだときの理由は 表 T-233 の `RS-25`）も受けてはならない（MUST NOT）'
const CV_9_GENERATED =
  '⭐ 一覧は列の形（`_assets/fig-erd-detail.md` の `AT-58`）から生成し、欄・命令・取り込みのどれにも手で書き写してはならない（MUST NOT）。'
const CV_9_SLOTS_KEPT = 'その欄に並べない名と入口（下の 2 つ）の場所は空けたままとし、後ろの名や入口を詰めてはならない（MUST NOT）'
const CV_9_FRAME_TRANSPARENT = 'ハイライトボックスの枠の欄にも透明（線なし）を並べる —— 線が透明でも枠は掴める（`FR-016` の 表 T-246 の `HB-12`）。'
const CV_9_COMMENT_NO_TRANSPARENT = 'コメントボックスの線の欄と字の欄には透明を並べない（`FR-019`）。'
// see CV-2
const CV_2_TWO_VALUES = 'カスタムカラーは、明るいテーマの値と暗いテーマの値の 2 つを持つこと（MUST）。'
// see RS-25
const RS_25_SCENE = '読んだ `GRS JSON` の列が、決められた形に合わない'

const H_NAME = '保存する綴り'
const H_LIGHT_BAND = '明るいテーマのタスクグループの帯'
const H_DARK_BAND = '暗いテーマのタスクグループの帯'
const DASH = '—'

// see T-294, CV-9
const nameOf = (row: SpecRow): string => bare(row.by[H_NAME] ?? '')
const isBandless = (row: SpecRow): boolean =>
  (row.by[H_LIGHT_BAND] ?? '').startsWith(DASH) || (row.by[H_DARK_BAND] ?? '').startsWith(DASH)

const PALETTE: readonly string[] = T_294.rows.map(nameOf)
const TASK_GROUP_COLORS: readonly string[] = T_294.rows.filter((row) => !isBandless(row)).map(nameOf)
const BANDLESS: readonly string[] = T_294.rows.filter(isBandless).map(nameOf)
const TRANSPARENT = nameOf(rowOf(T_294, 'S-324'))

describe('CR-586 premise -- the clauses these cases are built from', () => {
  it('CV-9, CV-2, RS-25 and CM-30 still read as quoted', () => {
    const cv9 = rowOf(T_017B, 'CV-9').cells.join(' ')
    for (const clause of [CV_9_ONE_LIST, CV_9_REFUSED, CV_9_GENERATED, CV_9_SLOTS_KEPT]) {
      expect(cv9).toContain(clause)
    }
    expect(cv9).toContain(CV_9_FRAME_TRANSPARENT)
    expect(cv9).toContain(CV_9_COMMENT_NO_TRANSPARENT)
    expect(rowOf(T_017B, 'CV-2').cells.join(' ')).toContain(CV_2_TWO_VALUES)
    expect(rowOf(T_233, 'RS-25').cells.join(' ')).toContain(RS_25_SCENE)
    expect(REQUIREMENTS).toContain('`CM-30`')
  })

  it('T-294 leaves at least one name without a task group band (S-315), and transparent keeps one', () => {
    expect(BANDLESS).toContain(nameOf(rowOf(T_294, 'S-315')))
    expect(TASK_GROUP_COLORS).toContain(TRANSPARENT)
    expect(TASK_GROUP_COLORS.length + BANDLESS.length).toBe(PALETTE.length)
  })
})

describe(`CV-9: ${CV_9_GENERATED}`, () => {
  it(`${CV_9_ONE_LIST} -- the generated TaskGroup.color choices are exactly those names, in T-294 order`, () => {
    expect(COLUMN_SHAPES.TaskGroup['color']?.choices).toEqual(TASK_GROUP_COLORS)
  })

  it(`${CV_9_FRAME_TRANSPARENT} ${CV_9_COMMENT_NO_TRANSPARENT} -- the fill columns and the highlight frame take transparent, the comment line and text do not`, () => {
    expect(COLUMN_SHAPES.HighlightBox['fillColor']?.choices).toContain(TRANSPARENT)
    expect(COLUMN_SHAPES.HighlightBox['strokeColor']?.choices).toContain(TRANSPARENT)
    expect(COLUMN_SHAPES.CommentBox['fillColor']?.choices).toContain(TRANSPARENT)
    expect(COLUMN_SHAPES.CommentBox['strokeColor']?.choices).not.toContain(TRANSPARENT)
    expect(COLUMN_SHAPES.CommentBox['textColor']?.choices).not.toContain(TRANSPARENT)
  })
})

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const ROW_ID = 'g1'

const oneTaskGroup = (): Document =>
  taskGroupDocument([{ id: ROW_ID, parentId: null }]) as unknown as Document

const colorOf = (document: Document): string | null =>
  document.schedule.taskGroups.find((one) => one.id === ROW_ID)?.color ?? null

// see CM-30
const editWithSetTaskGroupColor = (color: string) => {
  const command: TaskGroupCommand = { kind: 'setTaskGroupColor', groupId: ROW_ID, color }
  return editDocument(oneTaskGroup(), command, LIMITS, 'row')
}

describe(`CM-30 setTaskGroupColor takes the one list (CV-9, CR-586 seam S-4)`, () => {
  it.each(TASK_GROUP_COLORS.map((name) => [name]))('every name the task group color field offers is accepted: %s', (name) => {
    const result = editWithSetTaskGroupColor(name)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) expect(colorOf(result.document)).toBe(name)
  })

  it.each(BANDLESS.map((name) => [name]))(`${CV_9_REFUSED} -- %s is refused with CM-30 / CV-9`, (name) => {
    const result = editWithSetTaskGroupColor(name)
    expect(result.ok, JSON.stringify(result)).toBe(false)
    if (result.ok) return
    expect(result.refusals.some((one) => one.command === 'CM-30' && one.rule === 'CV-9'), JSON.stringify(result.refusals)).toBe(true)
  })

  it(`${CV_2_TWO_VALUES} -- a custom color is still accepted`, () => {
    const custom = '#123456/#abcdef'
    const result = editWithSetTaskGroupColor(custom)
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) expect(colorOf(result.document)).toBe(custom)
  })

  it('a name that is neither on the list nor a custom color is refused', () => {
    expect(editWithSetTaskGroupColor('notAPaletteName').ok).toBe(false)
  })
})

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

function templateWithRowColor(color: string): string {
  const json = JSON.parse(TEMPLATE_TEXT) as Record<string, any>
  json['schedule']['taskGroups'][0]['color'] = color
  return JSON.stringify(json)
}

describe(`GRS JSON read (CV-9, RS-25, CR-586 seam S-5)`, () => {
  it.each(BANDLESS.map((name) => [name]))(`${CV_9_REFUSED} -- a task group colored %s is refused with RS-25`, (name) => {
    const read = documentFromJson(templateWithRowColor(name))
    expect(read.ok).toBe(false)
    if (read.ok) return
    expect(read.reason).toBe('RS-25')
    expect(read.faults.some((one) => one.at.includes('taskGroups/0/color')), JSON.stringify(read.faults)).toBe(true)
  })

  it.each(TASK_GROUP_COLORS.map((name) => [name]))('control: a task group colored %s is read', (name) => {
    const read = documentFromJson(templateWithRowColor(name))
    expect(read.ok, read.ok ? '' : JSON.stringify(read.faults)).toBe(true)
  })
})

const nested = (flat: Readonly<Record<string, unknown>>): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[path[path.length - 1] as string] = flat[key]
  }
  return out as unknown as DocumentSettings
}

const SETTINGS = nested(SETTINGS_DEFAULTS as Readonly<Record<string, unknown>>)

const HIGHLIGHT_ID = 'h1'
const COMMENT_ID = 'c1'

const PANEL_SCHEDULE: Schedule = taskGroupDocument([{ id: ROW_ID, parentId: null }], {}, {
  taskVisuals: [
    { taskUid: 1, shapeKind: null, milestoneGlyph: null, fillColor: null, strokeColor: null, strokeWidthPx: null },
  ],
  highlightBoxes: [
    {
      id: HIGHLIGHT_ID, startDate: '2026-04-02T08:00:00', endDate: '2026-04-20T17:00:00',
      topGroupId: ROW_ID, bottomGroupId: ROW_ID, strokeColor: null, cornerRadiusPx: null,
      strokeWidthPx: null, fillColor: null, fillTransparencyPercent: null,
    },
  ],
  commentBoxes: [
    {
      id: COMMENT_ID, leaderShapeKind: null, text: 'a note', anchorDate: '2026-04-08', anchorGroupId: ROW_ID,
      bodyOffsetPx: null, strokeColor: null, strokeWidthPx: null, fillColor: null,
      fillTransparencyPercent: null, textColor: null,
    },
  ],
})['schedule'] as Schedule

const READINGS = (groupIds: readonly string[]): ScreenViewReadings => ({
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: PANEL_SCHEDULE.project.themeHue ?? 0,
  selectedGroupIds: [...groupIds],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}) as ScreenViewReadings

const sessionShowing = (selection: Selection, groupIds: readonly string[]): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    propertiesPanelContentState: { kind: 'selectionDisplayed', subject: { selection, groupIds: [...groupIds] } },
  },
}) as ScreenSession

const ENTITY_OF_HOLDER: Readonly<Record<string, keyof typeof COLUMN_SHAPES>> = {
  taskVisual: 'TaskVisual',
  taskGroup: 'TaskGroup',
  highlightBox: 'HighlightBox',
  commentBox: 'CommentBox',
}

function colorControls(item: ItemRef | null, groupIds: readonly string[]): readonly PropertyControl[] {
  const selection = item === null ? emptySelection() : selectionWith(emptySelection(), item)
  const panel = propertiesPanelFromSelection(
    PANEL_SCHEDULE, SETTINGS, selection, sessionShowing(selection, groupIds), READINGS(groupIds),
  )
  if (panel === null) throw new Error('premise: the panel describes the selection')
  return panel.fields.flatMap((field) => field.controls).filter((control) => control.kind === 'color')
}

function choicesFor(control: PropertyControl): readonly string[] {
  const key = control.key as { readonly holder: string; readonly column: string }
  const entity = ENTITY_OF_HOLDER[key.holder]
  if (entity === undefined) throw new Error(`a color field of holder ${key.holder} has no mapped entity`)
  const shape = (COLUMN_SHAPES[entity] as Record<string, { readonly choices: readonly string[] | null }>)[key.column]
  return shape?.choices ?? []
}

const SCENES: readonly (readonly [string, ItemRef | null, readonly string[], string])[] = [
  ['a task group', null, [ROW_ID], 'taskGroup'],
  ['a task', { kind: 'task', uid: 1 }, [], 'taskVisual'],
  ['a highlight box', { kind: 'highlightBox', id: HIGHLIGHT_ID }, [], 'highlightBox'],
  ['a comment box', { kind: 'commentBox', id: COMMENT_ID }, [], 'commentBox'],
]

describe(`the panel's color fields offer each column's generated choices (CV-9, CR-586 seam S-4)`, () => {
  it.each(SCENES)(`${CV_9_SLOTS_KEPT} -- %s`, (_label, item, groupIds, holder) => {
    const controls = colorControls(item, groupIds).filter(
      (control) => (control.key as { readonly holder: string }).holder === holder,
    )
    expect(controls.length, `premise: the panel of ${_label} has a color field`).toBeGreaterThan(0)
    for (const control of controls) {
      const column = (control.key as { readonly column: string }).column
      const names = control.color?.names ?? []
      expect(names.map((one) => one.name), `${holder}.${column}: every T-294 slot, in order`).toEqual(PALETTE)
      expect(
        names.filter((one) => one.isOffered).map((one) => one.name),
        `${holder}.${column}: offered = the generated choices`,
      ).toEqual(choicesFor(control))
    }
  })

  it(`${CV_9_ONE_LIST} -- the task group color field offers the one list and not the bandless names`, () => {
    const control = colorControls(null, [ROW_ID]).find(
      (one) => (one.key as { readonly holder: string }).holder === 'taskGroup',
    )
    const offered = (control?.color?.names ?? []).filter((one) => one.isOffered).map((one) => one.name)
    expect(offered).toEqual(TASK_GROUP_COLORS)
    for (const name of BANDLESS) expect(offered).not.toContain(name)
  })
})
