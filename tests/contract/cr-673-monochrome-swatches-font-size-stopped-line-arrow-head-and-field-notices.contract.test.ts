// CR-673 spec-only cases: FR-041 grey hue swatches, the IC-127 word, FR-109 stopped actual line, PK-4 head width, IF-9 notices.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  AppHeaderItems,
  PropertiesPanel,
  ScreenFrame,
  ScreenPart,
  ScreenSurface,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { BarGeometry } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { frameLoop, type FrameEnvironment, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { pointerImageOf } from '../../src/framework/single-html-shell/pointer-shape'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  descendants,
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  type FakeElement,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_041_ALL_GREY =
  '画面の枠（罫 `S-149`・パネルの地 `S-150`・強調 `S-151`・掴み代の印 `S-231`・文字 `S-147`・押下の緑 `S-183` ほか）にも、無彩色にして描くこと（MUST）'
const FR_041_SWATCH_PAINT =
  '各行の見本は、その行の色相で解いた `_assets/tbl-settings.md` の 表 T-236 の `S-151` を、いま描いている明暗の値で塗ること（MUST）'
const FR_041_SWATCH_GREY =
  '⚠️ モノクロ（`S-74`）が入っているあいだは、見本も次の段落のとおり灰で描く —— 灰は HSL の明度を保つので（`_assets/tbl-settings.md` の 表 T-294 の前文）、どの行の見本も `S-151` の明度の同じ灰になり'
const FR_041_NO_EXCEPTION = '⚠️ 例外を置かない —— 上の段落のテーマ色の欄の見本も灰で描く。'
const FR_109_STOPPED =
  '⭐ 実績を隠しても、実績が無くても、3 段目を取っておくこと（MUST）。⭐ 中断のあいだの実績の線は、停止日で矢じり（端点スパンは終わりの点）を付けずに止めること（MUST）'
const IF_9_NOTICES = '文字入力を受ける欄で編集が始まったことと終わったことを、その欄が名乗る行 ID とともに知らせ'
const IF_9_HAND_OVER =
  '`WS-2`）は、この状態を読み、宿主に問わない。⛔ 読む側は、状態を読む前に届いている知らせをすべて状態機械へ渡すこと（MUST）'
const PK_4_HEAD = '矢じりの幅（軸に直角の広さ）は一辺の 4 分の 1 とする（一辺を 24 に割った格子で 6）'

describe('CR-673 -- the clauses these cases are driven by', () => {
  it('FR-041, FR-109, IF-9 and PK-4 still read this way', () => {
    for (const clause of [FR_041_ALL_GREY, FR_041_SWATCH_PAINT, FR_041_SWATCH_GREY, FR_041_NO_EXCEPTION, FR_109_STOPPED]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
    expect(REQUIREMENTS, 'the retired FR-041 exception is gone').not.toContain('見本にモノクロ（`S-74`）を効かせてはならない')
    for (const clause of [IF_9_NOTICES, IF_9_HAND_OVER]) expect(DESIGN, clause).toContain(clause)
    expect(unbroken(rowOf('T-269', 'PK-4').cells.join(' '))).toContain(PK_4_HEAD)
  })
})

const K_60 = 'K-60'
const PREFERENCES = ['light', 'dark'] as const
type Preference = (typeof PREFERENCES)[number]
type Rgb = readonly [number, number, number]
const CHANNEL_MAX = 255
const CHANNEL_TOLERANCE = 1
const PERCENT = 100
const HUE_TURN = 360
const SEXTANT = 30
const WHEEL = 12

// see T-216
const S_73_DEFAULT = Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? ''))

// see T-305
const ROSTER = specTable('T-305').rows.map((row) => {
  const cell = row.by['色相'] ?? ''
  return { rowId: row.id, hue: cell.includes('S-73') ? S_73_DEFAULT : Number(bare(cell)) }
})

function rgbOfHsl(hue: number, saturationPercent: number, lightnessPercent: number): Rgb {
  const s = saturationPercent / PERCENT
  const l = lightnessPercent / PERCENT
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number): number => {
    const k = (n + hue / SEXTANT) % WHEEL
    return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * CHANNEL_MAX
  }
  return [channel(0), channel(8), channel(4)]
}

function rgbOf(paint: string): Rgb | null {
  const text = paint.trim().toLowerCase()
  const hex = /^#([0-9a-f]{6})$/.exec(text)
  if (hex !== null) {
    const n = Number.parseInt(hex[1] ?? '', 16)
    return [(n >> 16) & CHANNEL_MAX, (n >> 8) & CHANNEL_MAX, n & CHANNEL_MAX]
  }
  const hsl = /^hsl\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/.exec(text)
  if (hsl !== null) {
    return rgbOfHsl(((Number(hsl[1]) % HUE_TURN) + HUE_TURN) % HUE_TURN, Number(hsl[2]), Number(hsl[3]))
  }
  const rgb = /^rgb\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*\)$/.exec(text)
  return rgb === null ? null : [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
}

const isAchromatic = (rgb: Rgb): boolean =>
  Math.max(...rgb) - Math.min(...rgb) <= CHANNEL_TOLERANCE

const TEMPLATE_PATH = join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json')

const TEMPLATE_DOCUMENT = ((): Document => {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
})()

const READINGS_BASE = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: 'documentSettings',
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

function settingsPanel(preference: Preference, monochrome: boolean): PropertiesPanel {
  const schedule = { ...TEMPLATE_DOCUMENT.schedule, project: { ...TEMPLATE_DOCUMENT.schedule.project, themeHue: S_73_DEFAULT } }
  const settings = { ...TEMPLATE_DOCUMENT.documentSettings, themeMonochrome: monochrome }
  const session = {
    ...emptyScreenSession,
    screen: {
      ...emptyScreenSession.screen,
      screenLanguage: 'ja',
      helpLanguage: 'ja',
      themePreference: preference,
      propertiesPanelContentState: { kind: 'documentSettingsDisplayed' },
    },
  } as unknown as ScreenSession
  const readings = { ...READINGS_BASE, themePreference: preference, themeHue: S_73_DEFAULT } as unknown as ScreenViewReadings
  const panel = propertiesPanelFromSelection(schedule, settings as never, emptySelection(), session, readings)
  if (panel === null) throw new Error('premise: the panel showing the document settings is drawn')
  return panel
}

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
} as unknown as ScreenView

// see U-25
const U_25 = bare(rowOf('T-103', 'U-25').by['確定名（英）'] ?? '')

const HEADER_HEIGHT = { 'App Header': 37 }

// WHY: a var() ground is read through the root's custom property, as the browser would.
function groundsOf(built: Stage, element: FakeElement): string[] {
  const style = styleMap(element)
  const written = ['background-color', 'background', 'fill']
    .map((property) => style.get(property) ?? '')
    .concat(element.getAttribute('fill') ?? '')
    .filter((one) => one.trim() !== '')
  return written.map((one) => {
    const named = /^var\((--[A-Za-z0-9-]+)\)$/.exec(one.trim())
    return named === null ? one.trim() : (styleMap(built.root()).get(named[1] ?? '') ?? one).trim()
  })
}

// see T-236, T-294
// WHY: the grey keeps the HSL lightness (T-294's preamble), so S-151's written lightness is the grey every hue gives.
function s151LightnessOf(preference: Preference): number {
  const written = bare(rowOf('T-236', 'S-151').by[preference === 'light' ? '明るいテーマ' : '暗いテーマ'] ?? '')
  const lightness = /([\d.]+)%\s*\)$/.exec(written)
  if (lightness === null) throw new Error(`premise: S-151 (${preference}) is written as hsl(), got ${written}`)
  return Number(lightness[1])
}

// see K-60
function swatchColours(preference: Preference, monochrome: boolean): Rgb[] {
  const built = wire({ preference, hue: S_73_DEFAULT, monochrome }, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, propertiesPanel: settingsPanel(preference, monochrome) })
  const panel = oneByRole(built.root(), U_25)
  const inField = (node: FakeElement): boolean => {
    let at: FakeElement | null = node
    while (at !== null && at !== panel) {
      if (at.getAttribute('data-field-row') === K_60) return true
      at = at.parentNode
    }
    return false
  }
  const buttons = descendants(panel)
    .filter(inField)
    .filter((one) => one.tagName === 'BUTTON' && one.getAttribute('data-icon') === null)
  return buttons.map((button, index) => {
    const painted = selfAndDescendants(button)
      .flatMap((one) => groundsOf(built, one))
      .map(rgbOf)
      .filter((one): one is Rgb => one !== null)
    const first = painted[0]
    if (first === undefined) throw new Error(`swatch ${index} (${preference}) carries no paint this file can read`)
    return first
  })
}

describe(`CR-673 FR-041 "${FR_041_SWATCH_GREY}"`, () => {
  for (const preference of PREFERENCES) {
    it(`${preference}: with S-74 on, every K-60 swatch is achromatic`, () => {
      const colours = swatchColours(preference, true)
      expect(colours, 'one swatch per T-305 row').toHaveLength(ROSTER.length)
      colours.forEach((rgb, index) => {
        expect(isAchromatic(rgb), `${ROSTER[index]?.rowId}: rgb(${rgb.map(Math.round).join(',')}) is grey`).toBe(true)
      })
    })

    it(`${preference}: with S-74 on, every K-60 swatch is the one grey of S-151's lightness`, () => {
      const grey = CHANNEL_MAX * s151LightnessOf(preference) / PERCENT
      const colours = swatchColours(preference, true)
      expect(colours).toHaveLength(ROSTER.length)
      colours.forEach((rgb, index) => {
        rgb.forEach((channel) => {
          expect(Math.abs(channel - grey), `${ROSTER[index]?.rowId}: rgb(${rgb.map(Math.round).join(',')})`).toBeLessThanOrEqual(CHANNEL_TOLERANCE)
        })
      })
    })

    it(`${preference}: with S-74 off, the swatches keep their hues (the grey comes from S-74, not from the field)`, () => {
      const colours = swatchColours(preference, false)
      expect(colours).toHaveLength(ROSTER.length)
      expect(colours.filter((rgb) => !isAchromatic(rgb)).length, 'coloured swatches').toBeGreaterThan(0)
    })
  }
})

type Word = { readonly ja: string; readonly en: string }
type IconWord = { readonly rowId: string; readonly label: Word; readonly hint: Word }

const iconsIn = (path: string): readonly IconWord[] =>
  (JSON.parse(readFileSync(path, 'utf8')) as { readonly icons: readonly IconWord[] }).icons

const labelIn = (icons: readonly IconWord[], row: string): Word => {
  const found = icons.find((one) => one.rowId === row)
  if (found === undefined) throw new Error(`the dictionary has no icon ${row}`)
  return found.label
}

describe('CR-673 IC-127 -- the dictionary names IC-127 as it names IC-99', () => {
  const sources = {
    manuscript: join(SPEC, '_source', 'display-words.json'),
    shipped: join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'),
  }
  for (const [where, path] of Object.entries(sources)) {
    it(`${where}: IC-127's label equals IC-99's in ja and in en`, () => {
      const icons = iconsIn(path)
      const ic99 = labelIn(icons, 'IC-99')
      expect(ic99, 'IC-99 reads 文字サイズ / Font size').toEqual({ ja: '文字サイズ', en: 'Font size' })
      expect(labelIn(icons, 'IC-127')).toEqual(ic99)
    })
  }
})

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

const TEMPLATE_RAW = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, Record<string, unknown>>

const ACTUAL_START = '2026-04-06'
const STOP_DAY = '2026-04-08'

// see PS-3, PS-4, T-019a
const SHAPES = ['arrow', 'endpointSpan'] as const
type Shape = (typeof SHAPES)[number]
const STATES = ['PS-3', 'PS-4', 'PS-2'] as const
type State = (typeof STATES)[number]

const uidOf = (shape: Shape, state: State): number => (SHAPES.indexOf(shape) * STATES.length) + STATES.indexOf(state) + 1

function actualsFor(state: State): Partial<Task> {
  switch (state) {
    case 'PS-3':
      return { actualStart: ACTUAL_START, stop: STOP_DAY, resumeValid: false, percentComplete: 30 }
    case 'PS-4':
      return { actualStart: ACTUAL_START, stop: STOP_DAY, resume: '2026-04-13', resumeValid: true, percentComplete: 30 }
    case 'PS-2':
      return { actualStart: ACTUAL_START, actualFinish: STOP_DAY, resumeValid: false, percentComplete: 100 }
  }
}

function taskFor(shape: Shape, state: State): Task {
  const uid = uidOf(shape, state)
  return {
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name: `${shape} ${state}`,
    start: '2026-04-06',
    finish: '2026-04-17',
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
    ...actualsFor(state),
  } as unknown as Task
}

function suspendedDocument(): Document {
  const template = structuredClone(TEMPLATE_RAW)
  const schedule = template['schedule'] as Record<string, unknown>
  const tasks = SHAPES.flatMap((shape) => STATES.map((state) => taskFor(shape, state)))
  const groupIdOf = (uid: number): string => `67300000-0000-4000-8000-${String(uid).padStart(12, '0')}`
  return {
    '$schema': template['$schema'],
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...(schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100, statusDate: null },
      calendars: schedule['calendars'],
      tasks,
      resources: [],
      assignments: [],
      taskGroups: tasks.map((one, order) => ({
        id: groupIdOf(one.uid),
        parentId: null,
        label: `row ${order}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: tasks.map((one) => ({ taskUid: one.uid, groupId: groupIdOf(one.uid) })),
      taskVisuals: SHAPES.flatMap((shape) =>
        STATES.map((state) => ({
          taskUid: uidOf(shape, state),
          shapeKind: shape,
          milestoneGlyph: null,
          fillColor: null,
          strokeColor: null,
          strokeWidthPx: null,
        })),
      ),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      zoomX: 20 / SETTINGS_CONSTANTS.pxPerDayAt1x,
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1400, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

type LineBar = Extract<BarGeometry, { form: 'line' }>

function actualLines(): ReadonlyMap<number, LineBar> {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const loop = frameLoop({ showSvg: () => undefined } as never, suspendedDocument(), SCREEN, wiring, undefined, () => undefined)
  for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
    for (const callback of waiting.splice(0, waiting.length)) callback(turn)
  }
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  const lines = new Map<number, LineBar>()
  for (const one of values.geometry.tasks) {
    const actual = one.actual
    if (actual === null || actual.form !== 'line') continue
    lines.set(one.taskUid, actual)
  }
  return lines
}

const lineOf = (lines: ReadonlyMap<number, LineBar>, shape: Shape, state: State): LineBar => {
  const found = lines.get(uidOf(shape, state))
  if (found === undefined) throw new Error(`the ${shape} Task in ${state} drew no actual line`)
  return found
}

// WHY: the Task finished on the stop day marks where that day ends: its head tip or its end dot.
const finishedEndX = (bar: LineBar): number => bar.head?.[0]?.x ?? bar.dots[bar.dots.length - 1]?.at.x ?? bar.to.x

describe(`CR-673 FR-109 "${FR_109_STOPPED}"`, () => {
  const lines = actualLines()
  for (const state of ['PS-3', 'PS-4'] as const) {
    it(`arrow, ${state}: the actual line has no head and runs flat to the stop day`, () => {
      const bar = lineOf(lines, 'arrow', state)
      const finished = lineOf(lines, 'arrow', 'PS-2')
      expect(finished.head, 'premise: the Task finished on the stop day draws a head').not.toBeNull()
      expect(bar.head, 'no head while suspended').toBeNull()
      expect(bar.to.y, 'flat').toBeCloseTo(bar.from.y, 6)
      expect(bar.to.x, 'the line stops where the stop day ends').toBeCloseTo(finishedEndX(finished), 3)
      expect(bar.dots).toEqual([])
    })

    it(`endpointSpan, ${state}: the actual line keeps the start dot, has no end dot, and runs flat to the stop day`, () => {
      const bar = lineOf(lines, 'endpointSpan', state)
      const finished = lineOf(lines, 'endpointSpan', 'PS-2')
      expect(finished.dots.length, 'premise: the Task finished on the stop day draws two dots').toBe(2)
      expect(bar.head).toBeNull()
      expect(bar.dots.length, 'only the start dot').toBe(1)
      expect(bar.dots[0]?.at.x).toBeCloseTo(bar.from.x, 6)
      expect(bar.to.y, 'flat').toBeCloseTo(bar.from.y, 6)
      expect(bar.to.x, 'the line stops where the stop day ends').toBeCloseTo(finishedEndX(finished), 3)
    })
  }
})

describe(`CR-673 PK-4 "${PK_4_HEAD}"`, () => {
  it('the drawn head spans 1/N of the picture side, N read from the PK-4 cell', () => {
    const cell = unbroken(rowOf('T-269', 'PK-4').cells.join(' '))
    const fraction = /一辺の (\d+) 分の 1/.exec(cell)
    expect(fraction, 'PK-4 states the head width as a fraction of a side').not.toBeNull()
    const n = Number(fraction?.[1])
    const image = String(pointerImageOf('PK-4'))
    const encoded = /data:image\/svg\+xml,([^)\s]+)/.exec(image)?.[1]
    expect(encoded, 'PK-4 is a drawn picture').toBeDefined()
    const svg = decodeURIComponent(encoded ?? '')
    const box = /viewBox='0 0 ([\d.]+) ([\d.]+)'/.exec(svg)
    const side = Number(box?.[1])
    expect(side).toBeGreaterThan(0)
    const d = /<path d='([^']+)'/.exec(svg)?.[1] ?? ''
    const ys: number[] = []
    let x = 0
    let y = 0
    for (const [, op, args] of d.matchAll(/([MLHVZ])\s*([^MLHVZ]*)/g)) {
      const values = (args ?? '').trim().split(/[\s,]+/).filter((one) => one !== '').map(Number)
      if (op === 'M' || op === 'L') [x, y] = [values[0] ?? x, values[1] ?? y]
      else if (op === 'H') x = values[0] ?? x
      else if (op === 'V') y = values[0] ?? y
      else continue
      ys.push(y)
    }
    expect(ys.length, 'the path has points').toBeGreaterThan(2)
    expect(Math.max(...ys) - Math.min(...ys), 'the head across').toBeCloseTo(side / n, 6)
  })
})

const T_016 = specTable('T-016')
const TYPED_ROW = 'PR-1'
const columnOf = (id: string): string => bare(T_016.rows.find((one) => one.id === id)?.by['列（`GRS JSON`）'] ?? '')

const PANEL: PropertiesPanel = {
  showing: 'selection',
  isSubjectGone: false,
  fields: [
    {
      row: TYPED_ROW,
      name: columnOf(TYPED_ROW),
      text: 'a name',
      isEditable: true,
      controls: [
        {
          key: { holder: 'task', uid: 1, column: columnOf(TYPED_ROW) },
          kind: 'text',
          text: 'a name',
          choices: null,
          min: null,
          max: null,
          widthInFontSizes: 8,
        },
      ],
    },
  ],
  commands: [],
} as unknown as PropertiesPanel

function raise(built: Stage, node: FakeElement, type: string): void {
  const event = {
    type,
    key: '',
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: null,
    defaultPrevented: false,
    preventDefault(): void {
      ;(this as { defaultPrevented: boolean }).defaultPrevented = true
    },
    stopPropagation(): void {},
  } as unknown as FakeEvent
  let at: FakeElement | null = node
  while (at !== null) {
    for (const one of [...built.world.registrations]) {
      if (one.node === at && one.type === type) {
        ;(event as { currentTarget: FakeElement | null }).currentTarget = at
        one.listener(event)
      }
    }
    at = at.parentNode
  }
}

describe(`CR-673 IF-9 "${IF_9_NOTICES}"`, () => {
  it('the surface carries no unsettled-text question; the notices are its only word on an open field', () => {
    const built = wire({ preference: 'light', hue: S_73_DEFAULT }, HEADER_HEIGHT)
    const surface = surfaceOf(built)
    expect('hasUnsettledTextEntry' in surface, 'the retired seam is gone').toBe(false)
    expect(typeof surface.readFieldEditNotices).toBe('function')
  })

  it('entering a field tells began with its row, leaving it tells ended with its row', () => {
    const built = wire({ preference: 'light', hue: S_73_DEFAULT }, HEADER_HEIGHT)
    const surface = surfaceOf(built)
    surface.showScreenView({ ...EMPTY_VIEW, propertiesPanel: PANEL })
    const read = (): readonly { kind: string; row: string }[] =>
      (surface.readFieldEditNotices?.() ?? []).map((one) => ({ kind: one.kind, row: one.row }))
    expect(read(), 'nothing open yet').toEqual([])
    const control = descendants(oneByRole(built.root(), U_25)).find(
      (one) => (one.tagName === 'INPUT' || one.tagName === 'TEXTAREA') && one.getAttribute('data-field-row') === TYPED_ROW,
    )
    if (control === undefined) throw new Error(`the panel drew no control for ${TYPED_ROW}`)
    control.focus()
    raise(built, control, 'focusin')
    expect(read()).toEqual([{ kind: 'began', row: TYPED_ROW }])
    raise(built, control, 'focusout')
    expect(read()).toEqual([{ kind: 'ended', row: TYPED_ROW }])
    expect(read(), 'a read takes the notices').toEqual([])
  })
})
