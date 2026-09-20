// CR-408: the property panel boundary is held by GR-22 and counts from the drawn width; text fields wrap inside the panel.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { HumanInput, PointerInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import {
  FakeElement,
  selfAndDescendants,
  stage,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wiringOf,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-052 (MUST) -- the property panel counts from the width drawn at the press', '⭐ プロパティパネルの幅は、境界を押した時点に描かれていた幅から、ポインタが動いたぶんだけ変えること（MUST）'],
  ['FR-052 (MUST NOT) -- not from the stored S-80', '⛔ 保存された `S-80` から数えてはならない（MUST NOT）'],
  ['FR-052 (MUST) -- the held boundary is drawn where the pointer names', '境界を掴んでいるあいだ、その時点のポインタ位置が決める 2 つの幅で画面を描いて示すこと（MUST）'],
  ['FR-052 (MUST NOT) -- no pair leaving Row Area at 0 or less', 'これが 0 以下になる組を受け付けてはならない（MUST NOT）'],
  ['T-023d GR-22 (MUST NOT) -- no part of the band misses the band', '⛔ 帯の幅のうち、押しても帯に届かない所を残してはならない（MUST NOT）'],
  ['FR-006 (MUST) -- text and multiline fit inside the panel', '⭐ ただし 表 T-016 の `入力の型` が `文字` と `複数行` の操作子には、上の「要る幅より狭い幅を割ってはならない」を当てず、パネルの幅の中に収めること（MUST）'],
  ['FR-006 (MUST NOT) -- they do not run out to the right', '⛔ その操作子をパネルの右へはみ出させてはならない（MUST NOT）'],
  ['FR-006 (MUST) -- a long value wraps and the field grows down', '⭐ 幅に入り切らない値は欄の中で折り返し、欄を縦に伸ばすこと（MUST）'],
  ['FR-006 (MUST NOT) -- wrapping adds no line break to the value', '⛔ 折り返しは見せ方であり、値に改行を足してはならない（MUST NOT）'],
  ['FR-006 (MUST NOT) -- the close entrance lies on no field', '⛔ パネルの閉じる入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-52`）を、どの欄にも重ねてはならない（MUST NOT）'],
]

describe('CR-408 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const H_DEFAULT = String.fromCodePoint(0x65e2, 0x5b9a)
const H_PLACE = String.fromCodePoint(0x5834, 0x6240)
const H_KIND = String.fromCodePoint(0x5165, 0x529b, 0x306e, 0x578b)
const KIND_TEXT = String.fromCodePoint(0x6587, 0x5b57)
const KIND_MULTILINE = String.fromCodePoint(0x8907, 0x6570, 0x884c)

const settingOf = (id: string): number => {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  return Number(/-?\d+(?:\.\d+)?/.exec(bare(row.by[H_DEFAULT] ?? ''))?.[0] ?? Number.NaN)
}

const S_134 = settingOf('S-134')
const S_171 = settingOf('S-171')
const S_193 = settingOf('S-193')

const T_023D = specTable('T-023d')
const T_016 = specTable('T-016')

const kindOf = (row: string): string => (T_016.rows.find((one) => one.id === row)?.by[H_KIND] ?? '').trim()

describe('CR-408 -- the premises read from the manuscript', () => {
  it('T-023d prints GR-22 directly after GR-19, on the Panel Divider band of S-134', () => {
    const ids = T_023D.rows.map((one) => one.id)
    expect(ids.indexOf('GR-22')).toBe(ids.indexOf('GR-19') + 1)
    expect(T_023D.rows.find((one) => one.id === 'GR-22')?.by[H_PLACE] ?? '').toContain('S-134')
  })

  it('S-134 is 8, S-171 is 280 and S-193 is 2', () => {
    expect([S_134, S_171, S_193]).toEqual([8, 280, 2])
  })

  it('T-016 makes PR-1 and PR-18 text, and PR-2 and PR-21 multiline', () => {
    expect([kindOf('PR-1'), kindOf('PR-18')]).toEqual([KIND_TEXT, KIND_TEXT])
    expect([kindOf('PR-2'), kindOf('PR-21')]).toEqual([KIND_MULTILINE, KIND_MULTILINE])
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, unknown>

const ROW_ID = '11111111-1111-4111-8111-111111111111'
const TASK_UID = 1

function documentWithPanelWidth(propertyPanelWidth: number): Document {
  const template = structuredClone(TEMPLATE) as {
    schemaVersion: unknown
    schedule: Record<string, unknown>
    documentSettings: Record<string, unknown>
    documentStamp: unknown
  }
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      ...template.schedule,
      project: { ...(template.schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100, statusDate: null },
      tasks: [
        {
          uid: TASK_UID, wbsParentUid: null, wbsOrder: 1, name: 'Held', start: '2026-04-06', finish: '2026-04-20',
          milestone: false, deadline: null, notes: null, calendarUid: null, actualStart: null, stop: null,
          actualFinish: null, resume: null, resumeValid: null, percentComplete: 0, fadeInDays: null,
          fadeOutDays: null, dependencies: [], carry: {}, carryElements: [],
        },
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        { id: ROW_ID, parentId: null, label: 'Alpha', derivedFromTaskUid: null, order: 0, isCollapsed: false, isHidden: false, isKeptOpen: false, editGroup: null, color: null, height: null },
      ],
      taskGroupMembers: [{ taskUid: TASK_UID, groupId: ROW_ID, stackOrder: null }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...template.documentSettings, propertyPanelWidth },
    documentStamp: template.documentStamp,
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const pointer = (phase: PointerInput['phase'], x: number, y: number, clickCount = 1): PointerInput => ({
  kind: 'pointer', phase, button: 'left', x, y, modifiers: { ctrl: false, shift: false, alt: false, meta: false }, clickCount,
})

interface LoopStage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  view(): ScreenView
}

function loopStage(propertyPanelWidth: number): LoopStage {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (x, y) => {
      const view = views[views.length - 1]
      const divider = view?.frame.dividers.find(
        (one) => x >= one.band.x && x < one.band.x + one.band.width && y >= one.band.y && y < one.band.y + one.band.height,
      )
      if (divider === undefined) return null
      return {
        part: 'Panel Divider', entry: null, format: null, rowGroupId: null, resourceUid: null,
        dividerPanel: divider.panel, noticeDismissKey: null,
      } as unknown as ScreenPart
    },
  }
  const loop = frameLoop({ showSvg: () => undefined } as unknown as Parameters<typeof frameLoop>[0], documentWithPanelWidth(propertyPanelWidth), SCREEN, { surface, language: 'en' })
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    view: () => views[views.length - 1] as ScreenView,
  }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const storedWidth = (loop: FrameLoop): number =>
  (loop.document() as unknown as { documentSettings: { propertyPanelWidth: number } }).documentSettings.propertyPanelWidth

const drawnWidth = (loop: FrameLoop): number => frameOf(loop).regions.propertiesPanel.width

// see MK-13, FR-072
function withThePanelOpen(propertyPanelWidth: number): LoopStage {
  const built = loopStage(propertyPanelWidth)
  const task = frameOf(built.loop).geometry.tasks.find((one) => one.taskUid === TASK_UID)
  if (task === undefined || task.plan === null || task.plan.form !== 'outline') throw new Error('the task bar is not drawn')
  const xs = task.plan.points.map((one) => one.x)
  const ys = task.plan.points.map((one) => one.y)
  const at = { x: Math.max(...xs) - 6, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  built.send(pointer('down', at.x, at.y, 2))
  built.send(pointer('up', at.x, at.y, 2))
  if (built.view().propertiesPanel === null) throw new Error('the double click did not open the panel')
  return built
}

function boundary(built: LoopStage): { x: number; y: number } {
  const band = built.view().frame.dividers.find((one) => one.panel === 'propertiesPanel')?.band
  if (band === undefined) throw new Error('no Panel Divider band is drawn for the property panel')
  return { x: band.x + band.width / 2, y: band.y + band.height / 2 }
}

function drag(built: LoopStage, travel: number): { held: number; storedWhileHeld: number } {
  const at = boundary(built)
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('move', at.x + travel / 2, at.y))
  built.send(pointer('move', at.x + travel, at.y))
  const held = drawnWidth(built.loop)
  const storedWhileHeld = storedWidth(built.loop)
  built.send(pointer('up', at.x + travel, at.y))
  return { held, storedWhileHeld }
}

const TRAVEL = 40

describe('FR-052 (MUST / MUST NOT) -- the property panel width counts from the width drawn at the press', () => {
  it('premise: with S-80 at 0 the opened panel is drawn at S-171', () => {
    const built = withThePanelOpen(0)
    expect(storedWidth(built.loop)).toBe(0)
    expect(drawnWidth(built.loop)).toBeCloseTo(S_171, 6)
  })

  it('pulled right by d from S-171, the panel is drawn and stored at S-171 - d', () => {
    const built = withThePanelOpen(0)
    const { held, storedWhileHeld } = drag(built, TRAVEL)
    expect(held, 'the held picture').toBeCloseTo(S_171 - TRAVEL, 6)
    expect(storedWhileHeld, 'nothing is written while held').toBe(0)
    expect(storedWidth(built.loop), 'the release').toBeCloseTo(S_171 - TRAVEL, 6)
    expect(drawnWidth(built.loop)).toBeCloseTo(S_171 - TRAVEL, 6)
  })

  it('pulled left by d from S-171, the panel is drawn and stored at S-171 + d, not at d', () => {
    const built = withThePanelOpen(0)
    const { held } = drag(built, -TRAVEL)
    expect(held, 'the held picture').toBeCloseTo(S_171 + TRAVEL, 6)
    expect(storedWidth(built.loop), 'the release').toBeCloseTo(S_171 + TRAVEL, 6)
  })

  it('with S-80 at 300, a press released where it began leaves 300', () => {
    const built = withThePanelOpen(300)
    expect(drawnWidth(built.loop)).toBeCloseTo(300, 6)
    drag(built, 0)
    expect(storedWidth(built.loop)).toBeCloseTo(300, 6)
    expect(drawnWidth(built.loop)).toBeCloseTo(300, 6)
  })

  it('with S-80 at 300, a pull left by d stores 300 + d', () => {
    const built = withThePanelOpen(300)
    drag(built, -TRAVEL)
    expect(storedWidth(built.loop)).toBeCloseTo(300 + TRAVEL, 6)
  })

  it('a pull right past the whole drawn width never stores a negative width', () => {
    const built = withThePanelOpen(0)
    drag(built, S_171 + 100)
    expect(storedWidth(built.loop)).toBeGreaterThanOrEqual(0)
    expect(drawnWidth(built.loop)).toBeGreaterThanOrEqual(0)
  })

  it('a pull left past the Row Area never leaves the Row Area at 0 or less', () => {
    const built = withThePanelOpen(0)
    drag(built, -SCREEN.width)
    expect(frameOf(built.loop).regions.rowArea.width).toBeGreaterThan(0)
  })
})

const WINDOW = { width: 1200, height: 800 }

const pxOf = (value: string | undefined, whole: number): number | null => {
  const written = (value ?? '').trim()
  const px = /^(-?[\d.]+)px$/.exec(written)
  if (px !== null) return Number(px[1])
  const percent = /^(-?[\d.]+)%$/.exec(written)
  if (percent !== null) return (Number(percent[1]) / 100) * whole
  if (written === '0') return 0
  return null
}

const isPlaced = (element: FakeElement): boolean =>
  ['absolute', 'fixed'].includes((styleMap(element).get('position') ?? '').trim())

function containerOf(element: FakeElement): ScreenRect {
  for (let at = element.parentNode; at !== null; at = at.parentNode) {
    if (isPlaced(at)) {
      const box = boxOf(at)
      if (box !== null) return box
    }
  }
  return { x: 0, y: 0, width: WINDOW.width, height: WINDOW.height }
}

// WHY: a browser places these parts from the inline left/top/right/bottom/width/height the surface writes;
// a part written some other way takes the union of what it holds, as a plain box does.
function boxOf(element: FakeElement): ScreenRect | null {
  const style = styleMap(element)
  if (isPlaced(element)) {
    const outer = containerOf(element)
    const left = pxOf(style.get('left'), outer.width)
    const right = pxOf(style.get('right'), outer.width)
    const top = pxOf(style.get('top'), outer.height)
    const bottom = pxOf(style.get('bottom'), outer.height)
    let width = pxOf(style.get('width'), outer.width)
    let height = pxOf(style.get('height'), outer.height)
    if (width === null && left !== null && right !== null) width = outer.width - left - right
    if (height === null && top !== null && bottom !== null) height = outer.height - top - bottom
    const x = left !== null ? outer.x + left : right !== null && width !== null ? outer.x + outer.width - right - width : null
    const y = top !== null ? outer.y + top : bottom !== null && height !== null ? outer.y + outer.height - bottom - height : null
    if (x !== null && y !== null && width !== null && height !== null) return { x, y, width, height }
  }
  let union: ScreenRect | null = null
  for (const child of element.children) {
    const inside = boxOf(child)
    if (inside === null || inside.width <= 0 || inside.height <= 0) continue
    if (union === null) union = inside
    else {
      const x = Math.min(union.x, inside.x)
      const y = Math.min(union.y, inside.y)
      union = {
        x, y,
        width: Math.max(union.x + union.width, inside.x + inside.width) - x,
        height: Math.max(union.y + union.height, inside.y + inside.height) - y,
      }
    }
  }
  return union
}

const takesPointer = (element: FakeElement): boolean => {
  for (let at: FakeElement | null = element; at !== null; at = at.parentNode) {
    const style = styleMap(at)
    if ((style.get('display') ?? '').trim() === 'none' || (style.get('visibility') ?? '').trim() === 'hidden') return false
  }
  for (let at: FakeElement | null = element; at !== null; at = at.parentNode) {
    const events = (styleMap(at).get('pointer-events') ?? '').trim()
    if (events === 'none') return false
    if (events !== '') return true
  }
  return true
}

const stackingPath = (element: FakeElement): readonly number[] => {
  const path: number[] = []
  for (let at: FakeElement | null = element; at !== null; at = at.parentNode) {
    const z = (styleMap(at).get('z-index') ?? '').trim()
    if (z !== '' && z !== 'auto' && (isPlaced(at) || (styleMap(at).get('position') ?? '').trim() === 'relative')) path.unshift(Number(z))
  }
  return path
}

const comparePaths = (a: readonly number[], b: readonly number[]): number => {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

function stackAt(mount: FakeElement, x: number, y: number): FakeElement[] {
  const all = selfAndDescendants(mount).slice(1)
  const hit = all
    .map((element, index) => ({ element, index, box: boxOf(element) }))
    .filter((one) => one.box !== null && x >= one.box.x && x < one.box.x + one.box.width && y >= one.box.y && y < one.box.y + one.box.height)
    .filter((one) => takesPointer(one.element))
  hit.sort((a, b) => comparePaths(stackingPath(b.element), stackingPath(a.element)) || b.index - a.index)
  return hit.map((one) => one.element)
}

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({ x, y, width, height })

const LINE_X = 900
const ROW_AREA_TOP = 88
const ROW_AREA_HEIGHT = 600

const control = (row: string, kind: PropertyControl['kind'], text: string, widthInFontSizes: number): PropertyControl =>
  ({
    key: { holder: 'task', uid: TASK_UID, column: row === 'PR-1' ? 'name' : 'notes' },
    kind, text, choices: null, min: null, max: null, widthInFontSizes,
  }) as PropertyControl

const LONG_NAME = 'AVeryLongTaskName '.repeat(20).trim()
const LONG_NOTES = 'NotesWordsThatRunOn '.repeat(30).trim()

const panelWith = (nameWidth: number, notesWidth: number): PropertiesPanel =>
  ({
    showing: 'selection',
    isSubjectGone: false,
    fields: [
      { row: 'PR-1', name: 'NameLabelToken', text: LONG_NAME, isEditable: true, controls: [control('PR-1', 'text', LONG_NAME, nameWidth)] },
      { row: 'PR-2', name: 'NotesLabelToken', text: LONG_NOTES, isEditable: true, controls: [control('PR-2', 'multiline', LONG_NOTES, notesWidth)] },
    ] as PropertyField[],
    commands: [{ icon: 'IC-52', label: 'ClosePanel', isEnabled: true, isPressed: false, isArmed: false }],
  }) as unknown as PropertiesPanel

const viewWith = (propertiesPanel: PropertiesPanel | null): ScreenView => ({
  language: 'en',
  frame: {
    isFullScreen: false,
    dividers: [
      { panel: 'rowTitlePanel', band: rect(200 - S_134 / 2, 40, S_134, 740), line: rect(200, 40, 1, 740) },
      { panel: 'propertiesPanel', band: rect(LINE_X - S_134 / 2, 40, S_134, 740), line: rect(LINE_X, 40, 1, 740) },
    ],
    scrollbars: [
      { axis: 'vertical', track: rect(LINE_X - 8, ROW_AREA_TOP, 8, ROW_AREA_HEIGHT), thumb: rect(LINE_X - 8, ROW_AREA_TOP, 8, 200) },
      { axis: 'horizontal', track: rect(200, ROW_AREA_TOP + ROW_AREA_HEIGHT, LINE_X - 208, 8), thumb: rect(200, ROW_AREA_TOP + ROW_AREA_HEIGHT, 300, 8) },
    ],
  },
  appHeaderItems: { documentTitle: null, openedFileName: null, fileSavedAt: null, fileNeverSavedText: '', commands: [], language: 'en' },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
})

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

// WHY: a browser element answers parentElement, and the shared fake does not; the walk from a hit point needs it.
if (!('parentElement' in FakeElement.prototype)) {
  Object.defineProperty(FakeElement.prototype, 'parentElement', {
    get(this: FakeElement): FakeElement | null {
      return this.parentNode
    },
  })
}

function drawnSurface(view: ScreenView): Stage {
  const built = stage({ 'App Header': 37 })
  Object.assign(built.host, {
    elementFromPoint: (x: number, y: number): FakeElement | null => stackAt(built.mount, x, y)[0] ?? null,
    elementsFromPoint: (x: number, y: number): FakeElement[] => stackAt(built.mount, x, y),
  })
  built.surface = domScreenSurface(wiringOf(built, THEME))
  surfaceOf(built).showScreenView(view)
  return built
}

const OFFSETS = Array.from({ length: S_134 }, (_unused, index) => index - S_134 / 2)

describe('T-023d GR-22 (MUST NOT) -- every point of the band answers the band, whatever lies under it', () => {
  it.each(OFFSETS)('the property panel boundary %ipx from the line, at mid Row Area height', (offset) => {
    const built = drawnSurface(viewWith(panelWith(10, 10)))
    const y = ROW_AREA_TOP + ROW_AREA_HEIGHT / 2
    const answer = surfaceOf(built).readScreenPartAt(LINE_X + offset, y)
    expect(answer?.dividerPanel ?? null, `${answer?.part ?? 'nothing'} answered at ${LINE_X + offset}`).toBe('propertiesPanel')
  })

  it.each(OFFSETS)('the row title panel boundary %ipx from the line', (offset) => {
    const built = drawnSurface(viewWith(panelWith(10, 10)))
    const answer = surfaceOf(built).readScreenPartAt(200 + offset, ROW_AREA_TOP + ROW_AREA_HEIGHT / 2)
    expect(answer?.dividerPanel ?? null, `${answer?.part ?? 'nothing'} answered`).toBe('rowTitlePanel')
  })

  it('control: the fake browser does place the vertical scrollbar and the panel over the band', () => {
    const built = drawnSurface(viewWith(panelWith(10, 10)))
    const y = ROW_AREA_TOP + ROW_AREA_HEIGHT / 2
    const roles = (x: number): string[] =>
      stackAt(built.mount, x, y).map((one) => one.getAttribute('data-role') ?? '').filter((one) => one !== '')
    expect(roles(LINE_X - 2)).toContain('Scrollbars')
    expect(roles(LINE_X + 2)).toContain('Properties Panel')
  })
})

const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function controlOf(built: Stage, fieldName: string): { control: FakeElement; row: FakeElement } {
  const panel = selfAndDescendants(built.root()).find((one) => one.getAttribute('data-role') === 'Properties Panel')
  if (panel === undefined) throw new Error('no Properties Panel is drawn')
  const label = selfAndDescendants(panel).find(
    (one) => one.textContent.includes(fieldName) && !one.children.some((child) => child.textContent.includes(fieldName)),
  )
  if (label === undefined) throw new Error(`no field shows ${fieldName}: ${whatWasDrawn(panel)}`)
  let row: FakeElement | null = label
  while (row !== null && !selfAndDescendants(row).some((one) => CONTROL_TAGS.has(one.tagName) || one.hasAttribute('contenteditable'))) {
    row = row.parentNode
  }
  if (row === null) throw new Error(`no control stands with ${fieldName}`)
  const found = selfAndDescendants(row).find((one) => CONTROL_TAGS.has(one.tagName) || one.hasAttribute('contenteditable'))
  return { control: found as FakeElement, row }
}

const minWidthOf = (element: FakeElement): string => (styleMap(element).get('min-width') ?? '').trim()

describe('FR-006 (MUST / MUST NOT) -- text and multiline fields stay inside the panel and wrap', () => {
  it.each([
    ['PR-1', 'NameLabelToken'],
    ['PR-2', 'NotesLabelToken'],
  ])('%s: the width it needs does not widen the control', (_row, label) => {
    const narrow = controlOf(drawnSurface(viewWith(panelWith(5, 5))), label).control
    const wide = controlOf(drawnSurface(viewWith(panelWith(80, 80))), label).control
    expect(minWidthOf(wide), `${whatWasDrawn(wide)} against ${whatWasDrawn(narrow)}`).toBe(minWidthOf(narrow))
  })

  it('PR-1 (text): the control can wrap -- it is not a one-line input', () => {
    const { control } = controlOf(drawnSurface(viewWith(panelWith(80, 80))), 'NameLabelToken')
    expect(control.tagName === 'TEXTAREA' || control.hasAttribute('contenteditable'), whatWasDrawn(control)).toBe(true)
    expect((styleMap(control).get('white-space') ?? '').trim()).not.toBe('nowrap')
  })

  it('PR-2 (multiline): at least S-193 lines are shown, and no fixed height holds a long value to them', () => {
    const { control } = controlOf(drawnSurface(viewWith(panelWith(80, 80))), 'NotesLabelToken')
    const rows = Number(control.getAttribute('rows') ?? '0')
    const minHeight = (styleMap(control).get('min-height') ?? '').trim()
    expect(rows >= S_193 || minHeight !== '', whatWasDrawn(control)).toBe(true)
    expect(/^[\d.]+(px|em|rem)$/.test((styleMap(control).get('height') ?? '').trim()), whatWasDrawn(control)).toBe(false)
  })

  it.each([
    ['PR-1', 'NameLabelToken', LONG_NAME],
    ['PR-2', 'NotesLabelToken', LONG_NOTES],
  ])('%s: the long value is shown as it is, with no line break added', (_row, label, text) => {
    const { control } = controlOf(drawnSurface(viewWith(panelWith(80, 80))), label)
    const shown = control.tagName === 'TEXTAREA' || control.tagName === 'INPUT' ? control.value : control.textContent
    expect(shown).toBe(text)
    expect(shown.includes('\n')).toBe(false)
  })

  it.skip('FR-006: the control right edge stays inside the panel and the control grows taller than one line -- needs layout, only a browser can measure it', () => {})
})

describe('FR-006 (MUST NOT) -- the close entrance IC-52 lies on no field', () => {
  it('IC-52 is drawn on the panel, apart from every field control', () => {
    const built = drawnSurface(viewWith(panelWith(80, 80)))
    const close = selfAndDescendants(built.root()).filter((one) => one.getAttribute('data-icon') === 'IC-52')
    expect(close.length, 'IC-52 is drawn on the panel').toBeGreaterThan(0)
    for (const label of ['NameLabelToken', 'NotesLabelToken']) {
      const { control } = controlOf(built, label)
      for (const one of close) expect(control.contains(one) || one.contains(control), label).toBe(false)
    }
  })

  // WHY: browser only: geometric overlap (FR-006); the MUST NOT forbids boxes overlapping on the screen,
  // and which DOM row holds the entrance decides nothing about that without layout.
  it.skip('browser only: geometric overlap (FR-006) -- the IC-52 box intersects no field box, also with a long name', () => {})
})
