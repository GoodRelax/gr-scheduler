// Unit tests for FR-016's bound on the zoom -- every command of table T-108
// that writes S-75 / S-76, not just the wheel's.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, and of `edit-document-settings.ts` only its published command type and
// the signature of `editDocumentSettings`. Every expected value here comes from
// a requirement, a table row or a generated carrier -- never from the
// implementation.
//
// The rows these cases answer to (rule 03: name the row, never copy its value):
//   FR-016   the MUST that holds the zoom inside a range
//   T-203    S-75 `zoomX` / S-76 `zoomY` -- the two keys, whose 下限 / 上限
//            columns name `zoomMin` and `zoomMax` rather than carrying figures
//   T-201    S-53 `zoomStep` / S-54 `zoomMin` / S-55 `zoomMax` -- where the two
//            figures actually stand
//   T-206    S-96 / S-97 / S-98 -- the same three, marked as values the
//            document does NOT store, each pointing back at table T-201
//   T-108    CM-65 `setZoom` / CM-71 `fitScheduleToScreen` -- the roster below
//   T-036    SK-18 (`F`) and T-109 IC-10 -- the two entrances to CM-71
//   T-220    IV-16 -- the invariant over a bound column that names a setting
//   FR-028   both entrances, one document
//
// ⛔ TWO CASES ARE LEFT FAILING. They are findings, not chores
// (04-verification.md section 1): the expected values state what FR-016 says
// and the requirement is quoted where they stand. Search for `FINDING`.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  NOT_STORED_ZOOM_BOUNDS,
  editDocumentSettings,
  type DocumentSettingsCommand,
  type SettingsLimits,
} from '../../src/use-case/edit-document/edit-document'

// ---------------------------------------------------------------------------
// The bounds. READ, NEVER TYPED.
// ---------------------------------------------------------------------------

// ⛔ 表 T-203 の `S-75` / `S-76` は下限・上限の欄に `zoomMin` / `zoomMax` という
// NAME しか持たず、その値は 表 T-201 の `S-54` / `S-55` にある。表 T-206 の
// `S-97` / `S-98` がその 2 行を名指しており、`npm run gen` がこの carrier を
// 原稿から刷る -- so re-ruling S-54 or S-55 moves every case in this file.
// ⚠️ 04-verification.md section 2: a value typed into a fixture proves nothing
// about the manuscript, because the manuscript can move without it.
const FLOOR = NOT_STORED_ZOOM_BOUNDS['S-97']
const CEILING = NOT_STORED_ZOOM_BOUNDS['S-98']

/**
 * One generated default, read as the number it is -- the idiom
 * tests/unit/layout-engine.test.ts uses. `SETTINGS_DEFAULTS` is published as
 * `Record<string, unknown>`, so a key that stopped being a number would reach
 * arithmetic as `NaN` and leave a case green for the wrong reason.
 */
const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

/**
 * How wide these cases say the Row Area would be with both panels at zero.
 *
 * ⛔ NOT A VALUE OF THE SPECIFICATION, and not asserted as one. FR-052's own
 * arithmetic belongs to `regionsFromScreen`, and CM-67 is the only command that
 * judges a pair of panel widths against it -- no case in this file writes one.
 * It is stated here only because `SettingsLimits` requires the member.
 */
const ROW_AREA_WITHOUT_PANELS = 982

const LIMITS: SettingsLimits = {
  zoomMin: FLOOR,
  zoomMax: CEILING,
  rowAreaWidthWithoutPanels: ROW_AREA_WITHOUT_PANELS,
}

// ---------------------------------------------------------------------------
// The document these cases write to. Same idiom as tests/unit/use-case.test.ts:
// every key comes from SETTINGS_DEFAULTS, which is generated from the
// manuscript, and the dotted names it prints are expanded into the nested
// objects the type declares.
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: Record<string, unknown> = (() => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out
})()

const documentOf = (): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: { title: 'A', statusDate: null, themeHue: 214, startDate: null },
      taskGroups: [],
      tasks: [],
    },
    documentSettings: { ...DEFAULT_SETTINGS },
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-26T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-26T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

// ---------------------------------------------------------------------------
// 表 T-108 -- the commands whose written columns are S-75 and S-76.
// ---------------------------------------------------------------------------

type ZoomWriter = {
  /** The row of table T-108. */
  readonly row: string
  /** Its 確定名, spelled as the table spells it. */
  readonly named: string
  readonly commandOf: (zoomX: number, zoomY: number) => DocumentSettingsCommand
}

/**
 * ⭐ BOTH ENTRANCES, ONE DOCUMENT. FR-016's sentence is about the 倍率, not
 * about the wheel: 「ズームの倍率は表 T-203 の `S-75` / `S-76` が持つ範囲へ
 * 収めること（MUST）」. Whatever writes those two keys therefore answers to it,
 * and table T-108 names exactly two commands that do.
 *
 * ⭐ CM-71 IS INSIDE FR-016's REACH, and by three roads: SK-18 of table T-036
 * assigns the fit to `F` and IC-10 of table T-109 gives it a control, both of
 * which are 割当 FR-016 governs; and IV-16 of table T-220 exempts only a
 * setting whose bound column names a SCREEN dimension -- neither `zoomMin` nor
 * `zoomMax` is one, they are rows of table T-201.
 */
const T_108_ZOOM_WRITERS: readonly ZoomWriter[] = [
  {
    row: 'CM-65',
    named: 'setZoom',
    commandOf: (zoomX, zoomY) => ({ kind: 'setZoom', zoomX, zoomY }),
  },
  {
    row: 'CM-71',
    named: 'fitScheduleToScreen',
    commandOf: (zoomX, zoomY) => ({
      kind: 'fitScheduleToScreen',
      zoomX,
      zoomY,
      // 表示位置 is four values since CR-260 (S-77 / S-78 and S-176 / S-177).
      // A fit lands on the top left of the anchors it chose, so both fractions
      // are 0; none of the cases in this file reads them.
      scrollDate: null,
      scrollGroupId: null,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    }),
  },
]

/** The zoom the document holds after one command, or a thrown refusal. */
function zoomAfter(
  command: DocumentSettingsCommand,
): { readonly zoomX: number; readonly zoomY: number } {
  const result = editDocumentSettings(documentOf(), command, LIMITS)
  // ⛔ 収める, not 拒む. FR-016 says 「範囲へ収めること」 -- a notch past the end
  // is an ordinary thing to ask for, not an error, and FR-028 has the Agent API
  // able to do what the screen can, so a refusal would leave the two entrances
  // unequal.
  expect(result.ok, `${command.kind} was refused`).toBe(true)
  if (!result.ok) throw new Error('refused')
  const settings = result.document.documentSettings
  return { zoomX: settings.zoomX, zoomY: settings.zoomY }
}

// ---------------------------------------------------------------------------

describe('the roster and the bounds these cases are driven by', () => {
  it('carries the two rows of table T-108 that write S-75 / S-76', () => {
    expect(T_108_ZOOM_WRITERS).toHaveLength(2)
    expect(T_108_ZOOM_WRITERS.map((one) => one.row)).toEqual(['CM-65', 'CM-71'])
  })

  it('reads a usable range out of the manuscript, so no walk below is vacuous', () => {
    expect(FLOOR).toBeGreaterThan(0)
    expect(CEILING).toBeGreaterThan(FLOOR)
    // S-75 and S-76 both default to 1, and IV-16 of table T-220 requires a
    // setting whose bound column names another setting to satisfy that column.
    expect(settingNumber('zoomX')).toBeGreaterThanOrEqual(FLOOR)
    expect(settingNumber('zoomX')).toBeLessThanOrEqual(CEILING)
    expect(settingNumber('zoomY')).toBeGreaterThanOrEqual(FLOOR)
    expect(settingNumber('zoomY')).toBeLessThanOrEqual(CEILING)
  })
})

describe('FR-016 (MUST) -- 「ズームの倍率は表 T-203 の S-75 / S-76 が持つ範囲へ収めること」', () => {
  // ⭐ THE WALK IS THE REQUIREMENT. Chapter 1.9 asks a test of a requirement
  // that points at a table to be driven by a fixed copy of that table, one case
  // walking every row. FR-016 points at S-75 / S-76 and does not name a
  // command, so the roster is every command of table T-108 that writes them.
  it('holds a zoom under the floor up to zoomMin, whichever command wrote it', () => {
    for (const writer of T_108_ZOOM_WRITERS) {
      const held = zoomAfter(writer.commandOf(FLOOR / 10, FLOOR / 10))
      expect(held.zoomX, `${writer.row} ${writer.named} zoomX`).toBe(FLOOR)
      expect(held.zoomY, `${writer.row} ${writer.named} zoomY`).toBe(FLOOR)
    }
  })

  it('holds a zoom over the ceiling down to zoomMax, whichever command wrote it', () => {
    for (const writer of T_108_ZOOM_WRITERS) {
      const held = zoomAfter(writer.commandOf(CEILING * 10, CEILING * 10))
      expect(held.zoomX, `${writer.row} ${writer.named} zoomX`).toBe(CEILING)
      expect(held.zoomY, `${writer.row} ${writer.named} zoomY`).toBe(CEILING)
    }
  })

  it('leaves a zoom already inside the range exactly where it was put', () => {
    // ⛔ Without this the two cases above are satisfied by a command that
    // always answers a bound.
    const inside = (FLOOR + CEILING) / 2
    for (const writer of T_108_ZOOM_WRITERS) {
      const held = zoomAfter(writer.commandOf(inside, inside))
      expect(held.zoomX, `${writer.row} ${writer.named} zoomX`).toBe(inside)
      expect(held.zoomY, `${writer.row} ${writer.named} zoomY`).toBe(inside)
    }
  })

  it('keeps the two axes apart, so one bound does not drag the other', () => {
    for (const writer of T_108_ZOOM_WRITERS) {
      const held = zoomAfter(writer.commandOf(CEILING * 10, FLOOR / 10))
      expect(held.zoomX, `${writer.row} zoomX`).toBe(CEILING)
      expect(held.zoomY, `${writer.row} zoomY`).toBe(FLOOR)
    }
  })
})

describe('CM-71 alone -- the fit is not exempt from FR-016', () => {
  // ⛔ FINDING (D-23). The two cases below are the same sentence as the walk
  // above, said of `fitScheduleToScreen` on its own, so that a red run names
  // the command rather than the roster.
  //
  // ⛔ There is no exemption to lean on. IV-16 of table T-220 excuses a
  // setting 「欄が画面の寸法を指すもの」 only -- and the columns of S-75 / S-76
  // name `zoomMin` and `zoomMax`, which are rows of table T-201, not screen
  // dimensions. FR-055 may leave an axis to scroll (「必ず収まることを保証
  // しない。収まらない軸にはスクロールを残すこと」), and that IS what a clamped
  // fit does: the bound bites, the axis keeps its scrollbar. It is not licence
  // to write a 倍率 outside the range.

  it('FINDING: a fit that measured a picture 10x too wide is still held at zoomMin', () => {
    const fit = T_108_ZOOM_WRITERS[1]!
    expect(fit.row).toBe('CM-71')
    expect(zoomAfter(fit.commandOf(FLOOR / 10, 1)).zoomX).toBe(FLOOR)
  })

  it('FINDING: a fit that measured a picture 10x too narrow is still held at zoomMax', () => {
    const fit = T_108_ZOOM_WRITERS[1]!
    expect(fit.row).toBe('CM-71')
    expect(zoomAfter(fit.commandOf(1, CEILING * 10)).zoomY).toBe(CEILING)
  })
})
