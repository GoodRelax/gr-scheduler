// CR-406: the Resource Roster is drawn at S-240 of the host text, ruled at S-241, and scrolls as T-257 says.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  WheelInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  CommandItem,
  OpenModal,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import {
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-099 (MUST) -- the roster follows T-257', '一覧（`_assets/tbl-glossary.md` の `U-49`）の字の大きさ・スクロール・罫線は 表 T-257 に従うこと（MUST）'],
  ['T-257 RR-1 (MUST) -- the text is S-240 of the host text', '宿主が与える地の文字の大きさに `_assets/tbl-settings.md` の 表 T-206 の `S-240` を掛けた大きさで描くこと（MUST）'],
  ['T-257 RR-2 (MUST) -- only the assignee rows scroll', 'スクロールするのは担当者の行の並びだけとすること（MUST）'],
  ['T-257 RR-2 (MUST NOT) -- the heading row does not scroll', '⛔ 面の見出しの行（題と、担当者の行に載らない入口）をスクロールさせてはならない（MUST NOT）'],
  ['T-257 RR-3 (MUST) -- MK-5 over the roster scrolls it sideways', 'ポインタが一覧の上にあるとき、表 T-023 の `MK-5` の組で一覧を横に送ること（MUST）'],
  ['T-257 RR-3 (MUST NOT) -- the chart does not move', '⛔ 後ろの日程表を動かしてはならない（MUST NOT）'],
  ['T-257 RR-3 (MUST) -- that combination is stopped in the browser', '⭐ その組のブラウザの既定動作を止めること（MUST）'],
  ['T-257 RR-4 (MUST) -- the name column stays at the left', '横に送るあいだ、担当者名の欄を一覧の左端に固定すること（MUST）'],
  ['T-257 RR-5 (MUST) -- lines between every cell', '一覧のすべての欄のあいだに、縦と横の線を引くこと（MUST）'],
  ['T-257 RR-5 (MUST) -- S-241 screen px', '太さは 表 T-206 の `S-241` とし、画面の px で描くこと（MUST）'],
  ['T-023 closing rule (MUST) -- RR-3 is its one exception', '⭐ ただし `Resource Roster`（`U-49`）が立ち、ポインタがその上にあるときの `MK-5` は、`FR-099` の 表 T-257 の `RR-3` に従うこと（MUST）'],
]

describe('CR-406 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const H_DEFAULT = String.fromCodePoint(0x65e2, 0x5b9a)
const H_SURFACE = String.fromCodePoint(0x9762)
const H_OPERATION = String.fromCodePoint(0x64cd, 0x4f5c)

const T_206 = specTable('T-206')
const T_109 = specTable('T-109')

const cellOf = (id: string): string => {
  const row = T_206.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  return bare(row.by[H_DEFAULT] ?? '')
}

const numberIn = (cell: string): number => Number(/-?\d+(?:\.\d+)?/.exec(cell)?.[0] ?? Number.NaN)

const S_240 = numberIn(cellOf('S-240'))
const S_241_CELL = cellOf('S-241')
const S_241 = numberIn(S_241_CELL)

const ROSTER = 'Resource Roster'

const onRoster = (icon: string): boolean => {
  const row = T_109.rows.find((one) => one.id === icon)
  return bareAll(row?.by[H_SURFACE] ?? '').includes(ROSTER)
}

const ROW_ENTRANCES = ['IC-67', 'IC-68'] as const
const HEADER_ENTRANCES = ['IC-63', 'IC-64', 'IC-65', 'IC-66'] as const

describe('CR-406 -- the premises read from the manuscript', () => {
  it('S-240 is 0.75 and S-241 is 1px', () => {
    expect(S_240).toBe(0.75)
    expect(S_241_CELL).toContain('px')
    expect(S_241).toBe(1)
  })

  it('T-109 puts IC-63 to IC-68 on the Resource Roster', () => {
    for (const icon of [...HEADER_ENTRANCES, ...ROW_ENTRANCES]) expect(onRoster(icon), icon).toBe(true)
  })

  it('T-023 MK-5 is Ctrl + Shift + wheel', () => {
    const row = specTable('T-023').rows.find((one) => one.id === 'MK-5')
    const operation = row?.by[H_OPERATION] ?? ''
    expect(operation).toContain('Ctrl')
    expect(operation).toContain('Shift')
  })
})

const command = (icon: string): CommandItem => ({ icon, label: `Label${icon}`, isEnabled: true, isPressed: false, isArmed: false }) as CommandItem

const HEADING = 'RosterHeadingToken'
const NAMES = ['AssigneeNameAlpha', 'AssigneeNameBeta', 'AssigneeNameGamma'] as const
const TASK_NAME = 'UnassignedTaskName'

const rosterModal = (count = NAMES.length): OpenModal =>
  ({
    surface: ROSTER,
    heading: HEADING,
    commands: ['IC-52', ...HEADER_ENTRANCES].map(command),
    resources: Array.from({ length: count }, (_unused, index) => ({
      uid: 10 + index,
      name: NAMES[index % NAMES.length] as string,
      isReferenced: index === 0,
      isSelected: index === 1,
      unassignedTaskNames: index === 0 ? [TASK_NAME] : [],
    })),
  }) as unknown as OpenModal

const EMPTY_VIEW: ScreenView = {
  language: 'en',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null, openedFileName: null, fileSavedAt: null,
    fileNeverSavedText: '', commands: [], language: 'en',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

function drawnRoster(): { built: Stage; roster: FakeElement } {
  const built = wire(THEME, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, openModal: rosterModal() })
  return { built, roster: oneByRole(built.root(), ROSTER) }
}

function innermostShowing(root: FakeElement, text: string): FakeElement {
  const showing = selfAndDescendants(root).filter((one) => one.textContent.includes(text))
  const innermost = showing.filter((one) => !one.children.some((child) => child.textContent.includes(text)))
  if (innermost.length !== 1) throw new Error(`${innermost.length} nodes show ${text}: ${whatWasDrawn(root)}`)
  return innermost[0] as FakeElement
}

const entrancesOf = (root: FakeElement, icon: string): readonly FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') === icon)

function shorthandParts(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let at = ''
  for (const character of value.trim()) {
    if (character === '(') depth += 1
    if (character === ')') depth -= 1
    if (/\s/.test(character) && depth === 0) {
      if (at !== '') parts.push(at)
      at = ''
      continue
    }
    at += character
  }
  if (at !== '') parts.push(at)
  return parts
}

function declaredFontSize(element: FakeElement): string {
  const declared = styleMap(element)
  const longhand = (declared.get('font-size') ?? '').trim()
  if (longhand !== '') return longhand
  const shorthand = (declared.get('font') ?? '').trim()
  if (shorthand === '' || shorthand.toLowerCase() === 'inherit') return shorthand
  for (const part of shorthandParts(shorthand)) {
    const size = part.split('/')[0] ?? ''
    if (/^(calc\(|var\(|[.\d])/i.test(size)) return size
  }
  return ''
}

function customProperty(element: FakeElement, name: string): string | null {
  for (let at: FakeElement | null = element; at !== null; at = at.parentNode) {
    const held = styleMap(at).get(name)
    if (held !== undefined && held.trim() !== '') return held.trim()
  }
  return null
}

function expandVariables(element: FakeElement, value: string, depth = 0): string | null {
  if (depth > 8) return null
  const named = /var\(\s*(--[a-z0-9-]+)\s*\)/i.exec(value)
  if (named === null) return value
  const held = customProperty(element, named[1] as string)
  if (held === null) return null
  return expandVariables(element, value.replace(named[0] as string, `(${held})`), depth + 1)
}

function lengthPx(expression: string, inheritedPx: number, basePx: number): number | null {
  const arithmetic = expression
    .trim()
    .toLowerCase()
    .replace(/\bcalc\b/g, '')
    .replace(/([\d.]+)\s*rem\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * basePx})`)
    .replace(/([\d.]+)\s*em\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * inheritedPx})`)
    .replace(/([\d.]+)\s*%/g, (_whole, n: string) => `(${(Number.parseFloat(n) / 100) * inheritedPx})`)
    .replace(/([\d.]+)\s*px\b/g, '($1)')
  if (arithmetic.trim() === '' || !/^[\d\s+*/.()-]+$/.test(arithmetic)) return null
  try {
    const answer: unknown = new Function(`return (${arithmetic});`)()
    return typeof answer === 'number' && Number.isFinite(answer) ? answer : null
  } catch {
    return null
  }
}

function fontSizeAt(element: FakeElement, basePx: number): number | null {
  if (element.isMount) return basePx
  const parent = element.parentNode
  const inherited = parent === null ? basePx : fontSizeAt(parent, basePx)
  if (inherited === null) return null
  const written = declaredFontSize(element)
  if (written === '' || written.toLowerCase() === 'inherit') return inherited
  const expanded = expandVariables(element, written)
  return expanded === null ? null : lengthPx(expanded, inherited, basePx)
}

const BASES = [12, 16, 20, 32]

describe('T-257 RR-1 (MUST) -- the roster text is S-240 of the text the host gives', () => {
  const texts = [
    ['an assignee name', NAMES[0]],
    ['the task name beside it', TASK_NAME],
    ['the surface title', HEADING],
  ] as const

  it.each(texts)('%s computes to S-240 x base at every base', (_what, text) => {
    const { roster } = drawnRoster()
    const node = innermostShowing(roster, text)
    for (const base of BASES) expect(fontSizeAt(node, base), `base ${base}px`).toBeCloseTo(S_240 * base, 9)
  })

  it('(MUST NOT) doubling the base doubles the name size, so no px constant is held', () => {
    const { roster } = drawnRoster()
    const node = innermostShowing(roster, NAMES[0])
    const small = fontSizeAt(node, 16) ?? Number.NaN
    const large = fontSizeAt(node, 32) ?? Number.NaN
    expect(large / small).toBeCloseTo(2, 9)
  })

  it.skip('RR-1: the entrance glyph box is not shrunk with the text -- left to the FR-029 benches, no box size reaches this seam', () => {})
})

const scrollsOn = (element: FakeElement, axis: 'x' | 'y'): boolean => {
  const style = styleMap(element)
  const shorthand = (style.get('overflow') ?? '').trim().split(/\s+/)
  const fromShorthand = axis === 'x' ? shorthand[0] : (shorthand[1] ?? shorthand[0])
  const value = (style.get(`overflow-${axis}`) ?? fromShorthand ?? '').trim()
  return value === 'auto' || value === 'scroll'
}

function nearestScroller(from: FakeElement, stop: FakeElement, axis: 'x' | 'y'): FakeElement | null {
  for (let at: FakeElement | null = from; at !== null; at = at.parentNode) {
    if (scrollsOn(at, axis)) return at
    if (at === stop) return null
  }
  return null
}

describe('T-257 RR-2 (MUST / MUST NOT) -- only the assignee rows scroll', () => {
  it('the rows of assignees, with IC-67 / IC-68, sit inside a box that scrolls vertically', () => {
    const { roster } = drawnRoster()
    const name = innermostShowing(roster, NAMES[0])
    const scroller = nearestScroller(name, roster, 'y')
    expect(scroller, whatWasDrawn(roster).slice(0, 1200)).not.toBeNull()
    for (const icon of ROW_ENTRANCES) {
      for (const entrance of entrancesOf(roster, icon)) expect((scroller as FakeElement).contains(entrance), icon).toBe(true)
    }
  })

  it('the title and IC-63 to IC-66 stand outside that box', () => {
    const { roster } = drawnRoster()
    const scroller = nearestScroller(innermostShowing(roster, NAMES[0]), roster, 'y')
    expect(scroller).not.toBeNull()
    expect((scroller as FakeElement).contains(innermostShowing(roster, HEADING)), 'the title scrolls away').toBe(false)
    for (const icon of HEADER_ENTRANCES) {
      const found = entrancesOf(roster, icon)
      expect(found.length, `${icon} is drawn`).toBeGreaterThan(0)
      for (const one of found) expect((scroller as FakeElement).contains(one), `${icon} scrolls away`).toBe(false)
    }
  })
})

describe('T-257 RR-4 (MUST) -- the assignee name column is held at the left edge', () => {
  it('the cell of a name is sticky at left 0 inside the box that scrolls sideways', () => {
    const { roster } = drawnRoster()
    const name = innermostShowing(roster, NAMES[0])
    const scroller = nearestScroller(name, roster, 'x')
    expect(scroller, 'no box scrolls the roster sideways').not.toBeNull()
    const chain: FakeElement[] = []
    for (let at: FakeElement | null = name; at !== null && at !== scroller; at = at.parentNode) chain.push(at)
    const sticky = chain.find((one) => (styleMap(one).get('position') ?? '').trim() === 'sticky')
    expect(sticky, chain.map(whatWasDrawn).join('\n').slice(0, 800)).toBeDefined()
    expect(['0', '0px']).toContain((styleMap(sticky as FakeElement).get('left') ?? '').trim())
  })

  it.skip('RR-4: after a sideways scroll the name column left edge equals the roster left edge -- needs layout, only a browser can measure it', () => {})
})

const BORDER_PROPERTIES = ['border', 'border-left', 'border-right', 'border-top', 'border-bottom', 'border-width', 'border-inline', 'border-block', 'border-inline-start', 'border-inline-end', 'border-block-start', 'border-block-end']
const VERTICAL_LINE = new Set(['border', 'border-left', 'border-right', 'border-inline', 'border-inline-start', 'border-inline-end', 'border-width'])
const HORIZONTAL_LINE = new Set(['border', 'border-top', 'border-bottom', 'border-block', 'border-block-start', 'border-block-end', 'border-width'])

const widthTokenOf = (value: string): string | null =>
  shorthandParts(value).find((part) => /^(calc\(|var\(|[\d.]+(px|em|rem|%|pt)?$|thin|medium|thick)/i.test(part)) ?? null

describe('T-257 RR-5 (MUST / MUST NOT) -- lines of S-241 screen px between every cell', () => {
  function lines(roster: FakeElement) {
    const scroller = nearestScroller(innermostShowing(roster, NAMES[0]), roster, 'y') ?? roster
    const found: { property: string; width: string | null; at: FakeElement }[] = []
    const names = NAMES.map((name) => innermostShowing(roster, name))
    const insideEntrance = (one: FakeElement): boolean => {
      for (let at: FakeElement | null = one; at !== null && at !== scroller; at = at.parentNode) {
        if (at.getAttribute('data-icon') !== null) return true
      }
      return false
    }
    for (const one of selfAndDescendants(scroller)) {
      if (insideEntrance(one) || one === scroller) continue
      if (!names.some((name) => one.contains(name)) && !one.parentNode?.children.some((row) => names.some((name) => row.contains(name)))) continue
      for (const [property, value] of styleMap(one)) {
        if (BORDER_PROPERTIES.includes(property) && !/^(none|0|0px)$/.test(value.trim())) {
          found.push({ property, width: widthTokenOf(value), at: one })
        }
        if (['gap', 'row-gap', 'column-gap'].includes(property)) found.push({ property, width: value.trim(), at: one })
      }
    }
    return found
  }

  it('draws both vertical and horizontal lines among the rows', () => {
    const { roster } = drawnRoster()
    const drawn = lines(roster)
    const properties = new Set(drawn.map((one) => one.property))
    const gapBoth = properties.has('gap') || (properties.has('row-gap') && properties.has('column-gap'))
    const vertical = [...properties].some((one) => VERTICAL_LINE.has(one)) || gapBoth || properties.has('column-gap')
    const horizontal = [...properties].some((one) => HORIZONTAL_LINE.has(one)) || gapBoth || properties.has('row-gap')
    expect(vertical, whatWasDrawn(roster).slice(0, 1200)).toBe(true)
    expect(horizontal, whatWasDrawn(roster).slice(0, 1200)).toBe(true)
  })

  it('every line is written as S-241 px, never scaled by em, calc or a variable', () => {
    const { roster } = drawnRoster()
    const drawn = lines(roster)
    expect(drawn.length).toBeGreaterThan(0)
    for (const one of drawn) expect(one.width, `${one.property} on ${whatWasDrawn(one.at).slice(0, 200)}`).toBe(`${S_241}px`)
  })

  it.skip('RR-5: at display scale S-234 50 and 200 the line is still 1 device px -- the scale is applied by the browser zoom of the chart only; a browser must prove it', () => {})
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, unknown>

function documentWithResources(): Document {
  const draft = structuredClone(TEMPLATE) as { schedule: Record<string, unknown> }
  draft.schedule['resources'] = NAMES.map((name, index) => ({
    uid: 40 + index, name, resourceKind: null, isCostResource: null, calendarUid: null, carry: {}, carryElements: [],
  }))
  return draft as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const MK_5: InputModifiers = { ...NO_MODIFIERS, ctrl: true, shift: true }

const partOn = (part: string, entry: string | null): ScreenPart =>
  ({ part, entry, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null }) as unknown as ScreenPart

interface LoopStage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  aim(part: ScreenPart | null): void
  view(): ScreenView
  snapshot(): string
  wheel(): WheelInput
}

function loopStage(): LoopStage {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const views: ScreenView[] = []
  let aimed: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => aimed,
  }
  const loop = frameLoop({ showSvg: () => undefined } as unknown as Parameters<typeof frameLoop>[0], documentWithResources(), SCREEN, { surface, language: 'en' })
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    aim: (part) => {
      aimed = part
    },
    view: () => views[views.length - 1] as ScreenView,
    snapshot: () => JSON.stringify(loop.document()),
    wheel: () => ({ kind: 'wheel', x: 300, y: 300, modifiers: MK_5, notches: 1, scrollPx: { x: 0, y: 120 } }),
  }
}

const pointer = (phase: PointerInput['phase'], x: number, y: number): PointerInput => ({
  kind: 'pointer', phase, button: 'left', x, y, modifiers: NO_MODIFIERS, clickCount: 1,
})

function withTheRosterUp(): LoopStage {
  const built = loopStage()
  built.aim(partOn('Command Palette', 'IC-62'))
  built.send(pointer('down', 80, 120))
  built.send(pointer('up', 80, 120))
  built.aim(null)
  const modal = built.view().openModal as unknown as { surface?: string } | null
  if (modal?.surface !== ROSTER) throw new Error('IC-62 did not put the Resource Roster up')
  return built
}

interface WheelTurn {
  readonly type: string
  target: FakeElement | null
  currentTarget: FakeElement | null
  defaultPrevented: boolean
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
  readonly deltaX: number
  readonly deltaY: number
  readonly deltaMode: number
  readonly clientX: number
  readonly clientY: number
  preventDefault(): void
  stopPropagation(): void
}

// see RR-3
function turnWheelOver(built: Stage, target: FakeElement, ctrl: boolean, shift: boolean): WheelTurn {
  let stopped = false
  const turn: WheelTurn = {
    type: 'wheel', target, currentTarget: null, defaultPrevented: false,
    ctrlKey: ctrl, shiftKey: shift, altKey: false, metaKey: false,
    deltaX: 0, deltaY: 120, deltaMode: 0, clientX: 300, clientY: 300,
    preventDefault() {
      this.defaultPrevented = true
    },
    stopPropagation() {
      stopped = true
    },
  }
  for (let at: FakeElement | null = target; at !== null && !stopped; at = at.parentNode) {
    for (const one of built.world.registrations.filter((entry) => entry.node === at && entry.type === 'wheel')) {
      turn.currentTarget = at
      one.listener(turn as unknown as Parameters<typeof one.listener>[0])
    }
  }
  return turn
}

function sidewaysTravel(roster: FakeElement): () => number {
  const calls: number[] = []
  for (const one of selfAndDescendants(roster)) {
    Object.assign(one, {
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: 4000,
      clientWidth: 400,
      scrollBy: (x: number | { left?: number }) => {
        calls.push(typeof x === 'number' ? x : (x.left ?? 0))
      },
    })
  }
  return () =>
    calls.reduce((sum, one) => sum + Math.abs(one), 0) +
    selfAndDescendants(roster).reduce((sum, one) => sum + Math.abs(Number((one as unknown as { scrollLeft: number }).scrollLeft) || 0), 0)
}

describe('T-257 RR-3 (MUST) -- Ctrl + Shift + wheel over the roster, on the drawn page', () => {
  it('stops the browser default for the turn', () => {
    const { built, roster } = drawnRoster()
    const turn = turnWheelOver(built, innermostShowing(roster, NAMES[0]), true, true)
    expect(turn.defaultPrevented).toBe(true)
  })

  it('moves the roster sideways', () => {
    const { built, roster } = drawnRoster()
    const travelled = sidewaysTravel(roster)
    turnWheelOver(built, innermostShowing(roster, NAMES[0]), true, true)
    expect(travelled()).toBeGreaterThan(0)
  })

  it('a bare turn over the roster is left to the browser (T-023 closing rule)', () => {
    const { built, roster } = drawnRoster()
    const turn = turnWheelOver(built, innermostShowing(roster, NAMES[0]), false, false)
    expect(turn.defaultPrevented).toBe(false)
  })
})

describe('T-257 RR-3 (MUST NOT) + T-023 closing rule -- the chart stays still', () => {

  it('(MUST NOT) leaves the chart where it was', () => {
    const built = withTheRosterUp()
    built.aim(partOn(ROSTER, null))
    const before = built.snapshot()
    built.send(built.wheel())
    expect(built.snapshot()).toBe(before)
  })

  it('(MUST) outside the roster, the turn still goes to the browser and the chart stays still', () => {
    const built = withTheRosterUp()
    built.aim(null)
    const before = built.snapshot()
    expect(built.loop.isBrowserDefaultStopped(built.wheel())).toBe(false)
    built.send(built.wheel())
    expect(built.snapshot()).toBe(before)
  })
})
