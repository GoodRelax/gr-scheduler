// CR-754 spec-only cases: FR-006 / S-589 / S-590 -- every date field is given the room its host format and calendar button need (DFC-2518, DFC-2525).

import { describe, expect, it } from 'vitest'

import { holidaySettingsOf } from '../../src/adapter/screen-renderer/holiday-settings'
import { dateEntryWidthOf as panelDateEntryWidthOf } from '../../src/adapter/screen-renderer/properties-panel'
import { dateEntryWidthOf, type PropertiesPanel, type PropertyControl } from '../../src/adapter/screen-renderer/screen-renderer'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { selfAndDescendants, styleMap, type FakeElement } from '../fixtures/fake-browser'
import { bare, specTable } from './spec-table'
import {
  dateControlsOf,
  drawnPanel,
  FIRST_TASK_UID,
  LANGUAGES,
  REQUIREMENTS,
  settingsPanel,
  settingValue,
  taskPanel,
  TEMPLATE,
} from './cr-754-stage'

// see FR-006
const FR_006_EMPTY_IS_AS_WIDE = '`S-590` を掛けた幅とすること（MUST）。⭐ 値が空でも同じ幅とすること（MUST）'
const FR_006_NOT_THE_ESTIMATE = '⛔ 書式の字を `FR-093` の概算で測ってはならない（MUST NOT）'
const FR_006_OTHER_DATE_FIELDS = '⭐ 本段の日付と日時の要る幅は、`GRS` が描くほかの日付の欄にも当てること（MUST）'
const FR_006_DATE_ROOM =
  '⭐ ただし 表 T-016 の `入力の型` が `日付` の操作子の要る幅は、`FR-093` の概算によらず、その操作子の字の大きさに `_assets/tbl-settings.md` の 表 T-206 の `S-589` を掛けた幅とし'
const FR_006_ACTUAL_LENGTH = 'その幅は、並ぶ日付の欄と同じ行（時刻を表示しているときは `S-590`）の幅である。'

// see S-589, S-590
const DATE_ROOM = settingValue('S-589')
const DATE_TIME_ROOM = settingValue('S-590')

// see S-30, S-199
// WHY: the estimate FR-093 gives the ten half-width characters of yyyy/mm/dd, with S-199 on top -- what the clause forbids.
const LABEL_COEF = Number(/\d+(?:\.\d+)?/.exec(bare(specTable('T-201').rows.find((one) => one.id === 'S-30')?.by['既定値'] ?? ''))?.[0])
const FIELD_ROOM = settingValue('S-199')
const HALF_WIDTH_DATE_CHARACTERS = 10
const ESTIMATE_OF_A_DATE = HALF_WIDTH_DATE_CHARACTERS * LABEL_COEF + FIELD_ROOM

// see T-016
const TASK_DATE_ROWS = ['PR-3', 'PR-47', 'PR-4', 'PR-6', 'PR-7', 'PR-10']
const ACTUAL_LENGTH_ROW = 'PR-5'
const SHOWN_TIME = { showsTimeOfDay: true }
const HIDDEN_TIME = { showsTimeOfDay: false }

// WHY: the first task of the startup document with its empty date columns filled, to compare a full field with an empty one.
const FILLED_TASK = { [FIRST_TASK_UID]: { actualFinish: '2026-05-01T17:00:00', resume: '2026-05-10T08:00:00', deadline: '2026-06-01T17:00:00' } }
const EMPTIED_TASK = { [FIRST_TASK_UID]: { actualStart: null, actualFinish: null, resume: null, deadline: null } }

/** @purity pure */
const roomOf = (control: PropertyControl): number => (control.isDateTime === true ? DATE_TIME_ROOM : DATE_ROOM)

/** @purity pure */
function taskDateControl(panel: PropertiesPanel, row: string): PropertyControl {
  const found = panel.fields.filter((one) => one.row === row).flatMap((one) => one.controls.filter((control) => control.kind === 'date'))
  if (found.length !== 1) throw new Error(`premise: row ${row} draws one date control, got ${found.length}`)
  return found[0] as PropertyControl
}

/** @purity pure */
function emOf(element: FakeElement, property: string): number {
  const written = styleMap(element).get(property) ?? ''
  const found = /^([\d.]+)em$/.exec(written.trim())
  return found === null ? Number.NaN : Number(found[1])
}

/** @purity pure */
const dateInputsOf = (drawn: FakeElement): readonly FakeElement[] =>
  selfAndDescendants(drawn).filter((one) => one.tagName === 'INPUT' && ['date', 'datetime-local'].includes(one.getAttribute('type') ?? ''))

describe('CR-754 premise -- the clauses and the rows these cases read', () => {
  it.each([FR_006_EMPTY_IS_AS_WIDE, FR_006_NOT_THE_ESTIMATE, FR_006_OTHER_DATE_FIELDS, FR_006_DATE_ROOM, FR_006_ACTUAL_LENGTH])(
    '01-04 holds %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )

  it('table T-206 gives a date 9.5 and a date with time 12.5 font sizes, and the time takes more', () => {
    expect([DATE_ROOM, DATE_TIME_ROOM]).toEqual([9.5, 12.5])
  })

  it('the estimate FR-093 would give a date is narrower than S-589, so a case below can tell them apart', () => {
    expect(Number.isFinite(ESTIMATE_OF_A_DATE)).toBe(true)
    expect(ESTIMATE_OF_A_DATE).toBeLessThan(DATE_ROOM)
  })
})

describe('PI-37 -- dateEntryWidthOf answers the room of S-589 and S-590, re-exported by the screen renderer', () => {
  it('a date takes S-589 and a date with time S-590', () => {
    expect(dateEntryWidthOf(false)).toBe(DATE_ROOM)
    expect(dateEntryWidthOf(true)).toBe(DATE_TIME_ROOM)
  })

  it('the screen renderer hands out the same function properties-panel.ts defines', () => {
    expect(dateEntryWidthOf).toBe(panelDateEntryWidthOf)
  })
})

describe(`FR-006 -- ${FR_006_DATE_ROOM}`, () => {
  it.each(LANGUAGES)('the document settings (%s): every date field takes at least its room', (language) => {
    const found = dateControlsOf(settingsPanel({ language }))
    expect(found.length, 'premise: the settings face draws IC-44, K-141 (two) and FO-17').toBeGreaterThanOrEqual(4)
    for (const { field, control } of found) expect(control.widthInFontSizes, field.row).toBeGreaterThanOrEqual(roomOf(control))
  })

  it.each(TASK_DATE_ROWS)('a Task with the time hidden: %s takes at least S-589', (row) => {
    expect(taskDateControl(taskPanel({ settings: HIDDEN_TIME }), row).widthInFontSizes).toBeGreaterThanOrEqual(DATE_ROOM)
  })

  it.each(TASK_DATE_ROWS)('DFC-2525: a Task with the time shown (TX-3): %s, a date and time field, takes at least S-590', (row) => {
    expect(taskDateControl(taskPanel({ settings: SHOWN_TIME }), row).widthInFontSizes).toBeGreaterThanOrEqual(DATE_TIME_ROOM)
  })

  it.each([HIDDEN_TIME, SHOWN_TIME])('the drawn date inputs carry the room as a floor in font sizes (%o)', (settings) => {
    for (const panel of [settingsPanel({ settings }), taskPanel({ settings })]) {
      const inputs = dateInputsOf(drawnPanel(panel))
      expect(inputs.length, 'premise: date inputs are drawn').toBeGreaterThan(0)
      for (const input of inputs) {
        const room = input.getAttribute('type') === 'datetime-local' ? DATE_TIME_ROOM : DATE_ROOM
        const floor = Math.max(emOf(input, 'min-width'), Number.isNaN(emOf(input, 'width')) ? 0 : emOf(input, 'width'))
        expect(floor, `${input.getAttribute('data-field-row')}: ${styleMap(input).get('min-width')}`).toBeGreaterThanOrEqual(room)
      }
    }
  })
})

describe(`FR-006 -- ${FR_006_EMPTY_IS_AS_WIDE}`, () => {
  it.each(TASK_DATE_ROWS)('%s is as wide empty as filled, the time hidden and shown', (row) => {
    for (const settings of [HIDDEN_TIME, SHOWN_TIME]) {
      const empty = taskDateControl(taskPanel({ settings, tasks: EMPTIED_TASK }), row).widthInFontSizes
      const filled = taskDateControl(taskPanel({ settings, tasks: FILLED_TASK }), row).widthInFontSizes
      expect(empty, JSON.stringify(settings)).toBe(filled)
    }
  })

  it('the two fit span dates (K-141) are as wide empty as filled', () => {
    const widthsOf = (settings: Record<string, unknown>): readonly number[] =>
      dateControlsOf(settingsPanel({ settings })).filter(({ field }) => field.row === 'K-141').map(({ control }) => control.widthInFontSizes)
    const empty = widthsOf({ fitSpanStart: null, fitSpanFinish: null })
    expect(empty).toHaveLength(2)
    expect(widthsOf({ fitSpanStart: '2026-04-01T00:00:00', fitSpanFinish: '2027-03-31T00:00:00' })).toEqual(empty)
  })
})

describe(`FR-006 -- ${FR_006_NOT_THE_ESTIMATE}`, () => {
  it.each(TASK_DATE_ROWS)('%s, empty, is wider than the estimate of its format', (row) => {
    const control = taskDateControl(taskPanel({ settings: HIDDEN_TIME, tasks: EMPTIED_TASK }), row)
    expect(control.widthInFontSizes).toBeGreaterThan(ESTIMATE_OF_A_DATE)
  })
})

describe(`FR-006 -- ${FR_006_ACTUAL_LENGTH}`, () => {
  it('the time hidden: the actual length (PR-5) is as wide as the date fields beside it', () => {
    const panel = taskPanel({ settings: HIDDEN_TIME })
    const length = panel.fields.find((one) => one.row === ACTUAL_LENGTH_ROW)?.controls[0]
    expect(length?.widthInFontSizes).toBe(taskDateControl(panel, 'PR-4').widthInFontSizes)
  })

  // DEVIATION: spec says PR-5 is as wide as its date fields, S-590 with the time shown (FR-006); here it keeps its text estimate (DFC-2870)
  it.fails('the time shown: the actual length (PR-5) is as wide as the date and time fields beside it (S-590)', () => {
    const panel = taskPanel({ settings: SHOWN_TIME })
    const length = panel.fields.find((one) => one.row === ACTUAL_LENGTH_ROW)?.controls[0]
    expect(length?.widthInFontSizes).toBe(taskDateControl(panel, 'PR-4').widthInFontSizes)
  })
})

describe(`FR-006 -- ${FR_006_OTHER_DATE_FIELDS}`, () => {
  // see FR-088, WC-4
  it('Holiday Settings: every exception date (WC-4) takes at least S-589', () => {
    const session = { ...emptyScreenSession } as unknown as ScreenSession
    const surface = holidaySettingsOf(session, TEMPLATE.schedule, '', [], 'ja')
    const cells = surface.holidaySettings.exceptions.flatMap((line) => [line.from, line.to]).filter((one) => one !== null)
    expect(cells.length, 'premise: the startup calendar holds exception rows').toBeGreaterThan(0)
    for (const cell of cells) {
      expect(cell?.control.kind).toBe('date')
      expect(cell?.control.widthInFontSizes, cell?.row).toBeGreaterThanOrEqual(DATE_ROOM)
    }
  })
})
