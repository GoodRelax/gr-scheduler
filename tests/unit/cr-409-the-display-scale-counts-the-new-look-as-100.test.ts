// CR-409: the display scale steps run 50 .. 200 around a default of 100, drawn at S-234 / 100 x S-236.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  displayRatioOf,
  regionsFromScreen,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { frameLoop, type FrameEnvironment } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS, S_236, displayRatioAt } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_039_THE_RATIO =
  '描く比は、`S-234` を 100 で割り、同書の 表 T-206 の `S-236` を掛けた値とすること（MUST） —— 既定の 100 で 2026-09-16 の出荷ビルドの 1/2（100 ÷ 100 × 0.5）、200 で出荷ビルドと同じ大きさ（200 ÷ 100 × 0.5 ＝ 1）に立つ。'
const FR_039_OPEN_AT_THE_STORED_STEP = '⭐ 文書を開いたときは、文書が保存している `S-234` の値で描くこと（MUST） —— 既定の 100 に置き換えない。'
const FR_039_NO_ROUNDING_TO_A_STEP = '⛔ `S-234` の型の欄の段に無い値を、近い段へ読み替えてはならない（MUST NOT）'
const FR_077_HALF_THE_SHIPPED_BUILD =
  '既定の倍率で字を 2026-09-16 の出荷ビルドの 1/2 まで縮めることを利用者が定めた（既定の 100 の描く比は `_assets/tbl-settings.md` の 表 T-206 の `S-236` の 0.5）'

describe('CR-409 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-039 (MUST) -- the drawn ratio is S-234 / 100 x S-236, 0.5 at the default', FR_039_THE_RATIO],
    ['FR-039 (MUST) -- a document opens at the step it stored', FR_039_OPEN_AT_THE_STORED_STEP],
    ['FR-039 (MUST NOT) -- a value off the steps is not read as a near step', FR_039_NO_ROUNDING_TO_A_STEP],
    ['FR-077 -- the default is half the shipped build', FR_077_HALF_THE_SHIPPED_BUILD],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('S-234 -- the steps and the default of table T-202', () => {
  it('spells the ten steps 50 .. 200 in order, with 100 as the default', () => {
    expect(DISPLAY_SCALE_STEPS).toEqual([50, 67, 75, 90, 100, 110, 125, 150, 175, 200])
    expect(DEFAULT_DISPLAY_SCALE).toBe(100)
  })

  it('generates the default the table prints', () => {
    expect(SETTINGS_DEFAULTS['displayScale']).toBe(DEFAULT_DISPLAY_SCALE)
  })

  it('holds S-236 at exactly 0.5', () => {
    expect(S_236).toBe(0.5)
  })

  it('carries the same ten steps as the enum of the GRS JSON schema', () => {
    const schema = JSON.parse(
      readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'grs-document.schema.json'), 'utf8'),
    ) as { readonly properties: Record<string, { readonly properties?: Record<string, { readonly enum?: unknown }> }> }
    expect(schema.properties['documentSettings']?.properties?.['displayScale']?.enum).toEqual([...DISPLAY_SCALE_STEPS])
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const textWith = (settings: Record<string, unknown>): string =>
  JSON.stringify({ ...TEMPLATE, documentSettings: { ...TEMPLATE.documentSettings, ...settings } })

const ENV: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }

describe('FR-039 (MUST) -- the drawn ratio', () => {
  it.each([
    [DEFAULT_DISPLAY_SCALE, 0.5],
    [200, 1],
    [50, 0.25],
  ])('answers %s -> %s', (scale, ratio) => {
    expect(displayRatioAt(scale), 'the manuscript alone').toBeCloseTo(ratio, 12)
    const settings = { ...(TEMPLATE.documentSettings as object), displayScale: scale } as unknown as DocumentSettings
    expect(displayRatioOf(settings), FR_039_THE_RATIO).toBeCloseTo(ratio, 12)
  })

  it('draws one day at S-1 x the default ratio when the generated defaults are laid out', () => {
    const nested: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
      const [head, tail] = key.split('.')
      if (tail === undefined) nested[head!] = value
      else nested[head!] = { ...((nested[head!] as object | undefined) ?? {}), [tail]: value }
    }
    const settings = { ...nested, scrollDate: '2026-01-01', zoomX: 1 } as unknown as DocumentSettings
    const layout = layoutFromSchedule(
      TEMPLATE.schedule as Document['schedule'],
      settings,
      regionsFromScreen(ENV, settings),
    )
    const s1 = Number(bare(specTable('T-201').rows.find((one) => one.id === 'S-1')?.by['既定値'] ?? '').replace(/[^\d.]/g, ''))
    expect(layout.pxPerDay, FR_077_HALF_THE_SHIPPED_BUILD).toBeCloseTo(s1 * displayRatioAt(DEFAULT_DISPLAY_SCALE), 9)
  })
})

describe('FR-039 (MUST) -- a document opens at the step it stored', () => {
  it('reads a stored 150 as 150 and draws it at 0.75', () => {
    const read = documentFromJson(textWith({ displayScale: 150 }))
    if (!read.ok) throw new Error(`${FR_039_OPEN_AT_THE_STORED_STEP} -- refused: ${JSON.stringify(read.faults)}`)
    expect(read.document.documentSettings.displayScale, FR_039_OPEN_AT_THE_STORED_STEP).toBe(150)
    expect(displayRatioOf(read.document.documentSettings)).toBeCloseTo(0.75, 12)
  })
})

describe('FR-039 (MUST NOT) -- a value off the steps is refused with RS-25, not read as a near step', () => {
  it.each([33, 66, 85])('refuses a stored %s', (scale) => {
    const read = documentFromJson(textWith({ displayScale: scale }))
    expect(read.ok, `${FR_039_NO_ROUNDING_TO_A_STEP} -- ${scale}`).toBe(false)
    if (!read.ok) expect(read.reason).toBe('RS-25')
  })
})

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

// see FR-029, IC-104, IC-105
const headerAt = (scale: number): ScreenView => {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const document = {
    ...structuredClone(TEMPLATE),
    documentSettings: { ...TEMPLATE.documentSettings, displayScale: scale },
    changeLog: [],
  } as unknown as Document
  frameLoop({ showSvg: () => undefined } as never, document, ENV, { surface, language: 'ja' })
  for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
    for (const callback of waiting.splice(0, waiting.length)) callback(turn)
  }
  const last = views[views.length - 1]
  if (last === undefined) throw new Error('the loop drew no screen')
  return last
}

const enabledOf = (view: ScreenView, icon: string): boolean => {
  const found = view.appHeaderItems.commands.find((one) => one.icon === icon)
  if (found === undefined) throw new Error(`the header carries no ${icon}`)
  return found.isEnabled
}

describe('FR-029 / FR-039 -- the two entrances are faint at the two ends of the new steps', () => {
  it('draws IC-104 faint at the lowest step and IC-105 live', () => {
    const view = headerAt(DISPLAY_SCALE_STEPS[0]!)
    expect(enabledOf(view, 'IC-104')).toBe(false)
    expect(enabledOf(view, 'IC-105')).toBe(true)
  })

  it('draws IC-105 faint at the highest step and IC-104 live', () => {
    const view = headerAt(DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!)
    expect(enabledOf(view, 'IC-105')).toBe(false)
    expect(enabledOf(view, 'IC-104')).toBe(true)
  })

  it('draws both live at the default step', () => {
    const view = headerAt(DEFAULT_DISPLAY_SCALE)
    expect(enabledOf(view, 'IC-104')).toBe(true)
    expect(enabledOf(view, 'IC-105')).toBe(true)
  })
})
