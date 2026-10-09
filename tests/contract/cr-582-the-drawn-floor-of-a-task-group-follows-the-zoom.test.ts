// CR-582 / CR-689 spec-only cases: a row's min height is drawn scaled by S-234 / 100, never by zoomY or S-236.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { taskGroupPlacesAtZoomY } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS, S_236, displayRatioAt } from '../fixtures/display-scale'
import { specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const FR_042_FLOOR = '指定した最小の高さは下限として扱うこと（MUST）。'
const FR_042_WIDEN = '段数がそれより高い帯を要するときは、指定を超えて広げること（MUST）。'
const FR_042_HELD_AS_PX =
  '指定した最小の高さは、表示の倍率（`_assets/tbl-settings.md` の 表 T-202 の `S-234`）が 100 のときの画面の px として持ち、描くときは `FR-039` の 表 T-252 の `DS-13` のとおり、表示の倍率に比例して伸縮させること（MUST）'
const FR_042_NOT_ZOOM_Y = '⛔ 縦のズーム（同書の 表 T-203 の `S-76`）で縮めてはならない（MUST NOT）'
const DS_13_MULTIPLY = '`_assets/tbl-settings.md` の 表 T-202 の `S-234` を 100 で割った値を掛ける。'
const DS_13_NOT_S_236 = '⛔ 縦のズーム（同書の 表 T-203 の `S-76`）と、同書の 表 T-206 の `S-236` を掛けてはならない（MUST NOT）'
const MH_1_VALUE = '欄の値は、表示の倍率が 100 のときの画面の px の整数とすること（MUST）。'
const DS_8_KEEP = '保存する倍率を書き換えず、描く縦の寸法に両方を掛ける'

describe('CR-582 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-042 (MUST) -- a lower bound', FR_042_FLOOR],
    ['FR-042 (MUST) -- widened past it', FR_042_WIDEN],
    ['FR-042 (MUST) -- held as screen px, drawn scaled', FR_042_HELD_AS_PX],
    ['FR-042 (MUST NOT) -- never shrunk by the vertical zoom', FR_042_NOT_ZOOM_Y],
    ['T-338 MH-1 (MUST) -- the value', MH_1_VALUE],
    ['T-252 DS-8', DS_8_KEEP],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-252 row DS-13 multiplies S-234 / 100, and forbids zoomY and S-236', () => {
    const row = specTable('T-252').rows.find((one) => one.id === 'DS-13')
    expect(row, 'table T-252 holds DS-13').toBeDefined()
    const cell = row?.cells.join(' ') ?? ''
    expect(cell).toContain(DS_13_MULTIPLY)
    expect(cell).toContain(DS_13_NOT_S_236)
  })
})

interface SettingRow {
  readonly id: string
  readonly default?: { readonly num?: string }
}

const SETTING_ROWS: readonly SettingRow[] = (
  JSON.parse(readFileSync(join(SPEC, '_source', 'settings.json'), 'utf8')) as { blocks: { rows?: SettingRow[] }[] }
).blocks.flatMap((block) => block.rows ?? [])

function setting(id: string): number {
  const value = Number(SETTING_ROWS.find((one) => one.id === id)?.default?.num ?? Number.NaN)
  if (!Number.isFinite(value)) throw new Error(`settings.json holds no number for ${id}`)
  return value
}

const S_53 = setting('S-53')
const S_76_DEFAULT = setting('S-76')

// see DS-13
// WHY: S-234 / 100 is the drawn ratio of FR-039 without its S-236.
const scaleOf = (displayScale: number): number => displayRatioAt(displayScale) / S_236

// see DS-13
const drawnFloor = (minHeight: number, displayScale: number): number => minHeight * scaleOf(displayScale)

// WHY: the zooms are S-53 notches around S-76's default, the steps FR-016 moves zoomY by.
const ZOOMS: readonly number[] = [-2, -1, 0, 1, 2].map((notch) => S_76_DEFAULT * S_53 ** notch)

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const FLOORED = 'aaaaaaaa-0000-4000-8000-000000000001'
const OTHER = 'aaaaaaaa-0000-4000-8000-000000000002'

function taskOf(uid: number): Record<string, unknown> {
  return {
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name: `Task${uid}`,
    start: '2026-04-06T08:00:00',
    finish: '2026-04-10T17:00:00',
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  }
}

function documentText(minHeight: number | null): string {
  const rows = [FLOORED, OTHER]
  return JSON.stringify({
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: rows.map((_one, index) => taskOf(index + 1)),
      resources: [],
      assignments: [],
      taskGroups: rows.map((id, index) => ({
        id,
        parentId: null,
        label: `Row${index + 1}`,
        derivedFromTaskUid: null,
        order: index,
        treeState: 'auto',
        editGroup: null,
        color: null,
        minHeight: id === FLOORED ? minHeight : null,
      })),
      taskGroupMembers: rows.map((id, index) => ({ taskUid: index + 1, groupId: id })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      scrollDate: '2026-04-01',
      scrollGroupId: FLOORED,
      scrollGroupOffset: 0,
      levelZeroTreeState: 'auto',
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  })
}

function documentOf(minHeight: number | null): Document {
  const read = documentFromJson(documentText(minHeight))
  if (!read.ok) throw new Error(`the case document is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const ENV: ScreenEnvironment = { width: 1400, height: 4000, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }

// see LF-2, LF-3, MH-3
// WHY: the band height of the row, without taskGroupGap.
function bandOf(document: Document, displayScale: number, zoomY: number, groupId = FLOORED): number {
  const settings = { ...document.documentSettings, displayScale } as Document['documentSettings']
  const taskGroups = taskGroupPlacesAtZoomY(document.schedule, settings, regionsFromScreen(ENV, settings), zoomY)
  const found = taskGroups.find((one) => one.groupId === groupId)
  if (found === undefined) throw new Error(`row ${groupId} is not placed at scale ${displayScale}, zoomY ${zoomY}`)
  return found.height
}

const EMPTY = documentOf(null)
// WHY: the band the content alone asks for: packed lanes, empty lane and task-group-name floor.
const contentBand = (displayScale: number, zoomY: number): number => bandOf(EMPTY, displayScale, zoomY)

const GRID = DISPLAY_SCALE_STEPS.flatMap((scale) => ZOOMS.map((zoomY) => [scale, zoomY] as const))

describe('T-252 DS-13 -- the drawn floor is minHeight x (S-234 / 100), whatever zoomY is', () => {
  it('premise: S-236 is not 1, so a floor multiplied by it is told apart', () => {
    expect(S_236).not.toBe(1)
    expect(DISPLAY_SCALE_STEPS).toContain(DEFAULT_DISPLAY_SCALE)
  })

  it(`FR-042 "${FR_042_HELD_AS_PX}" -- at display scale ${DEFAULT_DISPLAY_SCALE} and zoomY ${S_76_DEFAULT} the band is the typed px exactly`, () => {
    const content = contentBand(DEFAULT_DISPLAY_SCALE, S_76_DEFAULT)
    const typed = Math.ceil(content) * 2
    expect(bandOf(documentOf(typed), DEFAULT_DISPLAY_SCALE, S_76_DEFAULT), MH_1_VALUE).toBeCloseTo(typed, 9)
  })

  it.each(GRID)(
    `"${DS_13_MULTIPLY}" "${DS_13_NOT_S_236}" -- a floor above the content, display scale %d, zoomY %d`,
    (displayScale, zoomY) => {
      const content = contentBand(displayScale, zoomY)
      const typed = Math.ceil((2 * content) / scaleOf(displayScale)) + 1
      const expected = Math.max(content, drawnFloor(typed, displayScale))
      const withS236 = Math.max(content, drawnFloor(typed, displayScale) * S_236)
      const withZoomY = Math.max(content, drawnFloor(typed, displayScale) * zoomY)
      expect(expected, 'premise: the floor governs the band').toBeGreaterThan(content)
      expect(Math.abs(expected - withS236), 'premise: S-236 would draw another band').toBeGreaterThan(1)
      if (zoomY !== S_76_DEFAULT) {
        expect(Math.abs(expected - withZoomY), 'premise: zoomY would draw another band').toBeGreaterThan(1)
      }
      expect(bandOf(documentOf(typed), displayScale, zoomY), `${FR_042_HELD_AS_PX}`).toBeCloseTo(expected, 6)
    },
  )

  it.each(GRID)(`FR-042 "${FR_042_FLOOR}" "${FR_042_WIDEN}" -- a floor below the content, display scale %d, zoomY %d`, (displayScale, zoomY) => {
    const content = contentBand(displayScale, zoomY)
    const typed = Math.max(1, Math.floor(content / (2 * scaleOf(displayScale))))
    expect(drawnFloor(typed, displayScale), 'premise: the floor is below the content').toBeLessThan(content)
    expect(bandOf(documentOf(typed), displayScale, zoomY)).toBeCloseTo(content, 6)
  })

  it(`"${DS_13_MULTIPLY}" -- only the floored row changes: the other row keeps its content band`, () => {
    const content = contentBand(DEFAULT_DISPLAY_SCALE, S_76_DEFAULT)
    const typed = Math.ceil(content) * 3
    const floored = documentOf(typed)
    expect(bandOf(floored, DEFAULT_DISPLAY_SCALE, S_76_DEFAULT, OTHER)).toBeCloseTo(
      bandOf(EMPTY, DEFAULT_DISPLAY_SCALE, S_76_DEFAULT, OTHER),
      9,
    )
  })

  it(`FR-042 "${FR_042_NOT_ZOOM_Y}" -- a tall floored row keeps its typed band at every notch the zoom goes down`, () => {
    const content = contentBand(DEFAULT_DISPLAY_SCALE, ZOOMS[ZOOMS.length - 1]!)
    const typed = Math.ceil(content) * 4
    const floored = documentOf(typed)
    for (const zoomY of [...ZOOMS].reverse()) {
      expect(bandOf(floored, DEFAULT_DISPLAY_SCALE, zoomY), `the band at zoomY ${zoomY}`).toBeCloseTo(
        drawnFloor(typed, DEFAULT_DISPLAY_SCALE),
        9,
      )
    }
  })
})

describe('FR-042 -- the stored value is the typed px, whatever the zoom', () => {
  it(`"${FR_042_HELD_AS_PX}" -- written and read back, the value and the key are the same`, () => {
    const content = contentBand(DEFAULT_DISPLAY_SCALE, S_76_DEFAULT)
    const typed = Math.ceil(content) * 2
    const text = jsonFromDocument(documentOf(typed))
    const again = documentFromJson(text)
    expect(again.ok).toBe(true)
    if (!again.ok) return
    const group = again.document.schedule.taskGroups.find((one) => one.id === FLOORED) as unknown as Record<string, unknown>
    expect(group['minHeight']).toBe(typed)
    const written = (JSON.parse(text) as { schedule: { taskGroups: Record<string, unknown>[] } }).schedule.taskGroups
    expect(written.every((one) => Object.hasOwn(one, 'minHeight'))).toBe(true)
    expect(written.filter((one) => Object.hasOwn(one, 'height'))).toEqual([])
  })

  it(`"${DS_8_KEEP}" -- drawing at another display scale and zoom leaves the document's value as typed`, () => {
    const typed = Math.ceil(contentBand(DEFAULT_DISPLAY_SCALE, S_76_DEFAULT)) * 2
    const document = documentOf(typed)
    for (const [displayScale, zoomY] of GRID) bandOf(document, displayScale, zoomY)
    const group = document.schedule.taskGroups.find((one) => one.id === FLOORED) as unknown as Record<string, unknown>
    expect(group['minHeight']).toBe(typed)
  })
})
