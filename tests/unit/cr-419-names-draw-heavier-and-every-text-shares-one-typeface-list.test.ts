// CR-419: task and milestone names draw at S-245, and every text GRS draws uses the S-246 typeface list.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { KeyInput, PointerInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import { svgFromSchedule, type SchedulePicture } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop, type FrameEnvironment } from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from '../contract/spec-table'
import {
  FakeText,
  selfAndDescendants,
  stage as fakeBrowser,
  styleMap,
  wiringOf,
  type FakeElement,
} from '../fixtures/fake-browser'
import { DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_039_ONE_TYPEFACE_LIST =
  '⭐ 画面に描くすべての字と、書き出す絵の字を、`_assets/tbl-settings.md` の 表 T-206 の `S-246` の書体の並びで描くこと（MUST）'
const FR_039_NOT_PER_SURFACE = '⛔ 面ごとに書体の並びを変えてはならない（MUST NOT）'
const FR_039_NAMES_ARE_HEAVIER =
  '⭐ 表 T-012 の形状の名称ラベル（表 T-038 の `OC-1`）だけを、同書の 表 T-206 の `S-245` の太さで描くこと（MUST）'
const FR_039_NOTHING_ELSE_IS_HEAVIER =
  'タスクとマイルストーンの名前を、行見出しの名前や担当と完了率の札より目立たせる。⛔ ほかの字をその太さで描いてはならない（MUST NOT）'

const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.by[column] ?? ''
}

// see S-246
const familyOf = (written: string): string =>
  written
    .replace(/`/g, '')
    .replace(/'/g, '"')
    .split(',')
    .map((one) => one.trim())
    .filter((one) => one !== '')
    .join(', ')

const S_245 = Number(/\d+/.exec(cellOf('T-206', 'S-245', '既定'))?.[0] ?? Number.NaN)
const S_246 = familyOf(cellOf('T-206', 'S-246', '既定'))

describe('table T-206 -- the two rows CR-419 added', () => {
  it('holds S-245 at 600 and S-246 as the Yu Gothic, BIZ UDPGothic, sans-serif list', () => {
    expect(S_245).toBe(600)
    expect(S_246).toBe('"Yu Gothic UI", "Yu Gothic", YuGothic, "BIZ UDPGothic", sans-serif')
  })

  it.each([FR_039_ONE_TYPEFACE_LIST, FR_039_NOT_PER_SURFACE, FR_039_NAMES_ARE_HEAVIER, FR_039_NOTHING_ELSE_IS_HEAVIER])(
    'still says it, word for word: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )
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

const settingsOf = (): DocumentSettings =>
  ({
    ...nestedDefaults(),
    scrollDate: '2026-01-01',
    displayScale: DEFAULT_DISPLAY_SCALE,
    assigneeVisible: true,
    percentCompleteVisible: true,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1600, height: 900, appHeaderHeight: 56, scrollbarThickness: 8 }

const taskOf = (uid: number, name: string, start: string, finish: string, milestone: boolean | null): Task =>
  ({
    uid,
    name,
    start,
    finish,
    milestone,
    percentComplete: 30,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
  }) as unknown as Task

const SHAPES = ['rectangle', 'chevron', 'arrow', 'endpointSpan', 'milestone'] as const

const SCHEDULE: Schedule = {
  project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
  calendars: [],
  resources: [{ uid: 50, name: 'Bob' }],
  assignments: SHAPES.map((_shape, index) => ({ taskUid: index + 1, resourceUid: 50 })),
  highlightBoxes: [],
  commentBoxes: [],
  tasks: SHAPES.map((shape, index) =>
    shape === 'milestone'
      ? taskOf(index + 1, `name${index + 1}`, '2026-01-20', '2026-01-20', true)
      : taskOf(index + 1, `name${index + 1}`, '2026-01-05', '2026-02-05', null),
  ),
  taskGroups: SHAPES.map((_shape, index) => ({
    id: `g${index + 1}`,
    parentId: null,
    label: `row${index + 1}`,
    derivedFromTaskUid: null,
    order: index,
    isCollapsed: null,
    isHidden: null,
    isKeptOpen: false,
    editGroup: null,
    color: null,
    height: null,
  })),
  taskGroupMembers: SHAPES.map((_shape, index) => ({ groupId: `g${index + 1}`, taskUid: index + 1 })),
  taskVisuals: SHAPES.map((shapeKind, index) => ({ taskUid: index + 1, shapeKind })),
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const pictureOf = (picture: SchedulePicture): string => {
  const settings = settingsOf()
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(SCHEDULE, settings, regions)
  const geometry = geometryFromLayout(SCHEDULE, settings, layout, regions, emptySelection())
  return svgFromSchedule(SCHEDULE, settings, layout, geometry, regions, emptySelection(), picture)
}

interface SvgText {
  readonly figure: string
  readonly family: string | null
  readonly weight: string | null
}

const attributeOf = (tag: string, name: string): string | null =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null

const styleOf = (tag: string, property: string): string | null => {
  const style = attributeOf(tag, 'style') ?? ''
  const found = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`).exec(style)
  return found?.[1]?.trim() ?? null
}

const ownOf = (tag: string, property: string): string | null =>
  styleOf(tag, property) ?? attributeOf(tag, property)?.replace(/&quot;/g, '"') ?? null

// see FR-039
const textsOf = (svg: string): readonly SvgText[] => {
  const texts: SvgText[] = []
  const stack: { family: string | null; weight: string | null; name: string }[] = []
  for (const match of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [whole, closing, name, , selfClosing] = match
    if (closing === '/') {
      stack.pop()
      continue
    }
    const parent = stack[stack.length - 1]
    const family = ownOf(whole, 'font-family') ?? parent?.family ?? null
    const weight = ownOf(whole, 'font-weight') ?? parent?.weight ?? null
    if (name === 'text') texts.push({ figure: attributeOf(whole, 'data-figure') ?? '', family, weight })
    if (selfClosing !== '/') stack.push({ family, weight, name: name! })
  }
  return texts
}

const isNameLabel = (text: SvgText): boolean => /^task-\d+-label$/.test(text.figure)

describe.each(['screen', 'export'] as const)(`FR-039 (MUST) -- the %s picture`, (picture) => {
  const texts = textsOf(pictureOf(picture))

  it('premise: the picture holds the five name labels, cards and ruler text', () => {
    expect(texts.filter(isNameLabel)).toHaveLength(SHAPES.length)
    expect(texts.some((one) => one.figure.startsWith('ruler-'))).toBe(true)
    expect(texts.some((one) => /-oc2-label$/.test(one.figure))).toBe(true)
  })

  it(`draws every text in the S-246 list: ${FR_039_ONE_TYPEFACE_LIST}`, () => {
    for (const text of texts) {
      expect(text.family === null ? null : familyOf(text.family), `${text.figure}: ${FR_039_ONE_TYPEFACE_LIST}`).toBe(
        S_246,
      )
    }
  })

  it(`draws the SH-1 to SH-5 name labels at S-245: ${FR_039_NAMES_ARE_HEAVIER}`, () => {
    for (const text of texts.filter(isNameLabel)) {
      expect(text.weight, `${text.figure}: ${FR_039_NAMES_ARE_HEAVIER}`).toBe(String(S_245))
    }
  })

  it(`does not draw the cards or the ruler at that weight: ${FR_039_NOTHING_ELSE_IS_HEAVIER}`, () => {
    for (const text of texts.filter((one) => !isNameLabel(one))) {
      expect(text.weight, `${text.figure}: ${FR_039_NOTHING_ELSE_IS_HEAVIER}`).not.toBe(String(S_245))
    }
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

const MODS = { ctrl: false, shift: false, alt: false, meta: false }
const F1: KeyInput = { kind: 'key', key: 'F1', modifiers: MODS }
const pointer = (phase: 'down' | 'up'): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: 500,
  y: 20,
  modifiers: MODS,
  clickCount: 1,
})

const domDrawn = (): { readonly mount: FakeElement; readonly svg: string } => {
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
  let part: ScreenPart | null = null
  let svg = ''
  const surface: ScreenSurface = {
    showScreenView: (view) => real.showScreenView(view),
    readDialogueInput: () => real.readDialogueInput(),
    readFieldCommit: () => real.readFieldCommit(),
    hasUnsettledTextEntry: () => real.hasUnsettledTextEntry(),
    readScreenPartAt: () => part,
  }
  const document = {
    ...structuredClone(TEMPLATE),
    schedule: { ...TEMPLATE.schedule, ...SCHEDULE, project: TEMPLATE.schedule.project, calendars: TEMPLATE.schedule.calendars },
    changeLog: [],
  } as unknown as Document
  const loop = frameLoop(
    { showSvg: (drawn: string) => void (svg = drawn) } as never,
    document,
    SCREEN,
    { surface, language: 'ja' },
  )
  drain()
  part = { part: 'App Header', entry: 'IC-17', format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null }
  loop.receiveInput(pointer('down'))
  loop.receiveInput(pointer('up'))
  part = null
  drain()
  loop.receiveInput(F1)
  drain()
  return { mount: browser.mount, svg }
}

const parentOf = (element: FakeElement): FakeElement | null => element.parentNode

const effectiveOf = (element: FakeElement, property: string): string | null => {
  for (let at: FakeElement | null = element; at !== null; at = parentOf(at)) {
    const written = styleMap(at).get(property)
    if (written !== undefined && written !== '') return written
  }
  return null
}

const ownText = (element: FakeElement): string =>
  element.childNodes
    .map((node) => (node instanceof FakeText ? node.data : ''))
    .join('')
    .trim()

describe('FR-039 (MUST) -- the DOM surfaces: App Header, Command Palette, help and the property panel', () => {
  it(`gives every element holding text the S-246 list: ${FR_039_ONE_TYPEFACE_LIST}`, () => {
    const { mount } = domDrawn()
    const holding = selfAndDescendants(mount).filter((one) => ownText(one) !== '')
    expect(holding.length, 'premise: the surfaces drew text').toBeGreaterThan(0)
    const wrong = holding
      .map((one) => ({ text: ownText(one).slice(0, 20), family: effectiveOf(one, 'font-family') }))
      .filter((one) => one.family === null || familyOf(one.family) !== S_246)
    expect(wrong.slice(0, 5), FR_039_ONE_TYPEFACE_LIST).toEqual([])
  })

  it(`writes no other typeface list anywhere in the surfaces: ${FR_039_NOT_PER_SURFACE}`, () => {
    const { mount } = domDrawn()
    const families = selfAndDescendants(mount)
      .map((one) => styleMap(one).get('font-family'))
      .filter((one): one is string => one !== undefined && one !== '')
      .map(familyOf)
    expect(families.length, `premise: ${FR_039_ONE_TYPEFACE_LIST}`).toBeGreaterThan(0)
    expect(new Set(families), FR_039_NOT_PER_SURFACE).toEqual(new Set([S_246]))
  })

  it(`does not draw the row names at S-245: ${FR_039_NOTHING_ELSE_IS_HEAVIER}`, () => {
    const { mount } = domDrawn()
    const rowNames = selfAndDescendants(mount).filter((one) => /^row[1-5]$/.test(ownText(one)))
    expect(rowNames.length, 'premise: the row title panel names the rows').toBeGreaterThan(0)
    for (const name of rowNames) {
      expect(effectiveOf(name, 'font-weight'), FR_039_NOTHING_ELSE_IS_HEAVIER).not.toBe(String(S_245))
    }
  })

  it('draws the screen picture it hands to the SVG surface with the S-246 list on every text', () => {
    const { svg } = domDrawn()
    const texts = textsOf(svg)
    expect(texts.length, 'premise: the frame showed a picture with text').toBeGreaterThan(0)
    for (const text of texts) {
      expect(text.family === null ? null : familyOf(text.family), `${text.figure}: ${FR_039_ONE_TYPEFACE_LIST}`).toBe(
        S_246,
      )
    }
  })
})
