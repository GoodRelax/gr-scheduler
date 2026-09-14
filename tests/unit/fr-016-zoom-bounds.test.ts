// Unit tests for FR-016's bound on the zoom -- every command of table T-108 that writes S-75 / S-76, not just the wheel's.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  NOT_STORED_ZOOM_BOUNDS,
  editDocumentSettings,
  type DocumentSettingsCommand,
  type SettingsLimits,
} from '../../src/use-case/edit-document/edit-document'

const FLOOR = NOT_STORED_ZOOM_BOUNDS['S-97']
const CEILING = NOT_STORED_ZOOM_BOUNDS['S-98']

const settingNumber = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

const ROW_AREA_WITHOUT_PANELS = 982

const LIMITS: SettingsLimits = {
  zoomMin: FLOOR,
  zoomMax: CEILING,
  rowAreaWidthWithoutPanels: ROW_AREA_WITHOUT_PANELS,
}

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

type ZoomWriter = {
  readonly row: string
  readonly named: string
  readonly commandOf: (zoomX: number, zoomY: number) => DocumentSettingsCommand
}

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
      scrollDate: null,
      scrollGroupId: null,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    }),
  },
]

function zoomAfter(
  command: DocumentSettingsCommand,
): { readonly zoomX: number; readonly zoomY: number } {
  const result = editDocumentSettings(documentOf(), command, LIMITS)
  expect(result.ok, `${command.kind} was refused`).toBe(true)
  if (!result.ok) throw new Error('refused')
  const settings = result.document.documentSettings
  return { zoomX: settings.zoomX, zoomY: settings.zoomY }
}

describe('the roster and the bounds these cases are driven by', () => {
  it('carries the two rows of table T-108 that write S-75 / S-76', () => {
    expect(T_108_ZOOM_WRITERS).toHaveLength(2)
    expect(T_108_ZOOM_WRITERS.map((one) => one.row)).toEqual(['CM-65', 'CM-71'])
  })

  it('reads a usable range out of the manuscript, so no walk below is vacuous', () => {
    expect(FLOOR).toBeGreaterThan(0)
    expect(CEILING).toBeGreaterThan(FLOOR)
    expect(settingNumber('zoomX')).toBeGreaterThanOrEqual(FLOOR)
    expect(settingNumber('zoomX')).toBeLessThanOrEqual(CEILING)
    expect(settingNumber('zoomY')).toBeGreaterThanOrEqual(FLOOR)
    expect(settingNumber('zoomY')).toBeLessThanOrEqual(CEILING)
  })
})

describe('FR-016 (MUST) -- 「ズームの倍率は表 T-203 の S-75 / S-76 が持つ範囲へ収めること」', () => {
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
