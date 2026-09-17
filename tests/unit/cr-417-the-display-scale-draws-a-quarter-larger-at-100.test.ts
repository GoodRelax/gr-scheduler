// CR-417: the display scale draws at S-236 = 0.625 per 100, while the App Header and the Command Palette keep their S-235 size.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { KeyInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import { dayOf, type Schedule, type Task } from '../../src/entity/document-model/schedule/schedule'
import { layoutFromSchedule, taskPlacement, xFromDay } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  displayRatioOf,
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop, type FrameEnvironment } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import {
  iconEntry,
  stage as fakeBrowser,
  styleMap,
  whatWasDrawn,
  wiringOf,
  type FakeElement,
} from '../fixtures/fake-browser'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS, S_235, S_236 } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_039_THE_DRAWN_RATIO =
  '描く比は、`S-234` を 100 で割り、同書の 表 T-206 の `S-236` を掛けた値とすること（MUST） —— 既定の 100 で 2026-09-16 の出荷ビルドの 5/8（100 ÷ 100 × 0.625）、200 で出荷ビルドの 5/4（200 ÷ 100 × 0.625 ＝ 1.25）に立つ。'
const FR_039_HEADER_AND_PALETTE_KEEP_THEIR_SIZE =
  '⚠️ `App Header` と `Command Palette` の大きさは描く比を読まないので、`S-236` を変えても動かない'
const FR_077_THE_FLOOR =
  '⭐ 可読の下限は、`_assets/tbl-settings.md` の 表 T-201 の `S-8` に、`FR-039` の表示の倍率の描く比を掛けた値とすること（MUST）'

// see T-201, T-206
const firstNumber = (table: string, id: string, column: string): number => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const found = /-?\d+(?:\.\d+)?/.exec(bare(row.by[column] ?? '').replace(/`/g, ''))
  if (found === null) throw new Error(`table ${table} row ${id} column ${column} holds no number`)
  return Number(found[0])
}

const S_1 = firstNumber('T-201', 'S-1', '既定値')
const S_7 = firstNumber('T-201', 'S-7', '既定値')
const S_8 = firstNumber('T-201', 'S-8', '既定値')
const S_54 = firstNumber('T-201', 'S-54', '既定値')
const S_138 = firstNumber('T-206', 'S-138', '既定')
const S_141 = firstNumber('T-206', 'S-141', '既定')
const S_237 = firstNumber('T-206', 'S-237', '既定')
const ENTRANCE_OUTER_WIDTH = (S_138 + S_141 * 2 + S_237 * 2) * S_235

describe('CR-417 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-039 (MUST) -- the drawn ratio, 0.625 at 100 and 1.25 at 200', FR_039_THE_DRAWN_RATIO],
    ['FR-039 -- the header and the palette do not read the ratio', FR_039_HEADER_AND_PALETTE_KEEP_THEIR_SIZE],
    ['FR-077 (MUST) -- the legible floor is S-8 x the drawn ratio', FR_077_THE_FLOOR],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds S-236 at 0.625 and keeps S-235 at 0.6667', () => {
    expect(S_236).toBe(0.625)
    expect(S_235).toBe(0.6667)
  })

  it('works the entrance outer width out to 17.3342px from S-138, S-141, S-237 and S-235', () => {
    expect(ENTRANCE_OUTER_WIDTH).toBeCloseTo(17.3342, 6)
  })
})

// see T-252
const nestedDefaults = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const path = key.split('.')
    let into = out
    for (const step of path.slice(0, -1)) {
      into[step] = { ...((into[step] as Record<string, unknown> | undefined) ?? {}) }
      into = into[step] as Record<string, unknown>
    }
    into[path[path.length - 1]!] = value
  }
  return out
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...nestedDefaults(),
    scrollDate: '2026-01-01',
    stackDirection: 'down',
    displayScale: DEFAULT_DISPLAY_SCALE,
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1600, height: 900, appHeaderHeight: 56, scrollbarThickness: 8 }

const ONE_TASK: Schedule = {
  project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
  calendars: [],
  resources: [],
  assignments: [],
  highlightBoxes: [],
  commentBoxes: [],
  tasks: [
    {
      uid: 1,
      name: 'alpha',
      start: '2026-01-05',
      finish: '2026-02-05',
      milestone: null,
      percentComplete: null,
      actualStart: null,
      stop: null,
      actualFinish: null,
      resume: null,
      resumeValid: null,
      fadeInDays: null,
      fadeOutDays: null,
      dependencies: [],
    } as unknown as Task,
  ],
  taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
  taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
  taskVisuals: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

describe(`FR-039 (MUST) -- ${FR_039_THE_DRAWN_RATIO}`, () => {
  it.each([
    [100, 0.625],
    [200, 1.25],
    [50, 0.3125],
  ])('answers display scale %s with the drawn ratio %s', (scale, ratio) => {
    expect((scale / 100) * S_236, 'the manuscript alone').toBeCloseTo(ratio, 12)
    expect(displayRatioOf(settingsOf({ displayScale: scale })), FR_039_THE_DRAWN_RATIO).toBeCloseTo(ratio, 12)
  })

  it.each(DISPLAY_SCALE_STEPS)('draws one day at S-1 x zoomX x (step / 100 x S-236), at step %s', (scale) => {
    const settings = settingsOf({ displayScale: scale, zoomX: 1 })
    const layout = layoutFromSchedule(ONE_TASK, settings, regionsFromScreen(ENV, settings))
    const one = xFromDay(layout, dayOf('2026-01-06')!) - xFromDay(layout, dayOf('2026-01-05')!)
    expect(one, FR_039_THE_DRAWN_RATIO).toBeCloseTo(S_1 * ((scale / 100) * S_236), 6)
  })
})

describe(`FR-077 (MUST) -- ${FR_077_THE_FLOOR}`, () => {
  it('lets a name fall to S-8 x 0.625 = 7.5px at the default step, and no further', () => {
    expect(S_8 * displayRatioOf(settingsOf()), FR_077_THE_FLOOR).toBeCloseTo(
      S_8 * S_236,
      9,
    )
    const settings = settingsOf({ actualMin: S_8 / S_7, zoomY: S_54 })
    const layout = layoutFromSchedule(ONE_TASK, settings, regionsFromScreen(ENV, settings))
    expect(taskPlacement(layout, 1)!.labelFontSize, FR_077_THE_FLOOR).toBeCloseTo(S_8 * S_236, 6)
  })
})

describe('FR-039 -- a document saved at display scale 100 opens at the new ratio and keeps 100', () => {
  const template = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
  ) as Record<string, any>

  it('reads displayScale 100 back as 100 and draws it at 0.625', () => {
    const text = JSON.stringify({
      ...template,
      documentSettings: { ...template.documentSettings, displayScale: 100 },
    })
    const read = documentFromJson(text)
    expect(read.ok, JSON.stringify(read.ok ? '' : read.faults)).toBe(true)
    if (!read.ok) return
    expect(read.document.documentSettings.displayScale, 'the stored value is not rewritten').toBe(100)
    expect(displayRatioOf(read.document.documentSettings), FR_039_THE_DRAWN_RATIO).toBeCloseTo(0.625, 12)
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }
const THEME: ScreenTheme = { preference: 'light', hue: 214 }
const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

const P_KEY: KeyInput = { kind: 'key', key: 'P', modifiers: { ctrl: false, shift: false, alt: false, meta: false } }

const drawnAt = (displayScale: number): FakeElement => {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(0)
    }
  }
  const browser = fakeBrowser({ 'App Header': 37 })
  const real = domScreenSurface(wiringOf(browser, THEME))
  const part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => real.showScreenView(view),
    readDialogueInput: () => real.readDialogueInput(),
    readFieldCommit: () => real.readFieldCommit(),
    hasUnsettledTextEntry: () => real.hasUnsettledTextEntry(),
    readScreenPartAt: () => part,
  }
  const document = {
    ...structuredClone(TEMPLATE),
    documentSettings: { ...TEMPLATE.documentSettings, displayScale },
    changeLog: [],
  } as unknown as Document
  const loop = frameLoop({ showSvg: () => undefined } as never, document, SCREEN, { surface, language: 'ja' })
  drain()
  const hasPalette = (): boolean => {
    try {
      iconEntry(browser.mount, 'IC-61')
      return true
    } catch {
      return false
    }
  }
  if (!hasPalette()) {
    loop.receiveInput(P_KEY)
    drain()
  }
  return browser.mount
}

const outerWidthOf = (entry: FakeElement): number => {
  const written = styleMap(entry).get('min-width') ?? styleMap(entry).get('width') ?? ''
  const found = /^(-?\d+(?:\.\d+)?)(px)?$/.exec(written.trim())
  if (found === null) throw new Error(`the entrance states no px width: ${whatWasDrawn(entry)}`)
  return Number(found[1])
}

describe(`DS-6 -- ${FR_039_HEADER_AND_PALETTE_KEEP_THEIR_SIZE}`, () => {
  const lowest = DISPLAY_SCALE_STEPS[0]!
  const highest = DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!

  it.each([lowest, DEFAULT_DISPLAY_SCALE, highest])(
    'draws the App Header entrance IC-17 17.3342px wide at display scale %s',
    (scale) => {
      const entry = iconEntry(drawnAt(scale), 'IC-17')
      expect(outerWidthOf(entry), `${FR_039_HEADER_AND_PALETTE_KEEP_THEIR_SIZE} -- ${whatWasDrawn(entry)}`).toBeCloseTo(
        ENTRANCE_OUTER_WIDTH,
        3,
      )
    },
  )

  it.each([lowest, DEFAULT_DISPLAY_SCALE, highest])(
    'draws the Command Palette entrance IC-61 17.3342px wide at display scale %s',
    (scale) => {
      const entry = iconEntry(drawnAt(scale), 'IC-61')
      expect(outerWidthOf(entry), `${FR_039_HEADER_AND_PALETTE_KEEP_THEIR_SIZE} -- ${whatWasDrawn(entry)}`).toBeCloseTo(
        ENTRANCE_OUTER_WIDTH,
        3,
      )
    },
  )
})
