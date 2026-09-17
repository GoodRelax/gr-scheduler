// CR-410: Ctrl + Shift + [+] / [-] step the display scale, Ctrl + Shift + [0] resets it and the chart zoom, and plain Ctrl stays the browser's.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { domInputSource, type InputHost } from '../../src/framework/dom-input-source/dom-input-source'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_039_THE_TWO_KEYS = '⭐ 表示の倍率を 1 段ずつ上げ下げする割当は、表 T-036 の `SK-22`（上げる）と `SK-23`（下げる）である。'
const FR_039_SK_17_RESETS_BOTH =
  '⭐ 表 T-036 の `SK-17` が押されたときは、表示の倍率を `S-234` の既定の段へ、日程表のズーム（同書の 表 T-203 の `S-75` / `S-76`）を等倍へ戻すこと（MUST）'
const T_036_PLAIN_CTRL_IS_THE_BROWSERS =
  '⚠️ `Shift` を伴わない `Ctrl` ＋ `+` / `-` / `0` は本表に置かない —— ブラウザの拡大・縮小と倍率を戻す機能であり（`FR-036` の 表 T-255）、表 T-023 の `MK-10` が、割り当てていない組を止めることを禁じている。'
const MK_10_STOPS_ASSIGNED = 'ブラウザの既定動作を画面全体で止めること（MUST）。'
const MK_10_KEEPS_UNASSIGNED = '割り当てていない組合せを止めてはならない（MUST NOT）'

describe('CR-410 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-039 -- SK-22 raises and SK-23 lowers the display scale', FR_039_THE_TWO_KEYS],
    ['FR-039 (MUST) -- SK-17 resets the display scale and the chart zoom', FR_039_SK_17_RESETS_BOTH],
    ['T-036 -- Ctrl + [+] / [-] / [0] without Shift stay out of the table', T_036_PLAIN_CTRL_IS_THE_BROWSERS],
    ['MK-10 (MUST) -- an assigned combination stops the browser default', MK_10_STOPS_ASSIGNED],
    ['MK-10 (MUST NOT) -- an unassigned one does not', MK_10_KEEPS_UNASSIGNED],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-036 spells SK-22, SK-23 and SK-17 with Ctrl and Shift, on IC-105, IC-104 and no entrance', () => {
    const rowOf = (id: string) => {
      const found = specTable('T-036').rows.find((one) => one.id === id)
      if (found === undefined) throw new Error(`table T-036 has no row ${id}`)
      return found
    }
    const spelt = (id: string): string => (rowOf(id).by['割当'] ?? '').replace(/[`\s]/g, '')
    expect(spelt('SK-22')).toBe('Ctrl＋Shift＋+')
    expect(spelt('SK-23')).toBe('Ctrl＋Shift＋-')
    expect(spelt('SK-17')).toBe('Ctrl＋Shift＋0')
    expect((rowOf('SK-22').by['入口'] ?? '').trim()).toBe('IC-105')
    expect((rowOf('SK-23').by['入口'] ?? '').trim()).toBe('IC-104')
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

interface Stage {
  readonly loop: FrameLoop
  press(input: HumanInput): boolean
  settings(): Record<string, unknown>
}

const stage = (settings: Record<string, unknown>): Stage => {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const document = {
    ...structuredClone(TEMPLATE),
    documentSettings: { ...TEMPLATE.documentSettings, ...settings },
    changeLog: [],
  } as unknown as Document
  const loop = frameLoop({ showSvg: () => undefined } as never, document, SCREEN, { surface, language: 'ja' })
  drain()
  return {
    loop,
    press: (input) => {
      const stopped = loop.isBrowserDefaultStopped(input)
      loop.receiveInput(input)
      drain()
      return stopped
    },
    settings: () => loop.document().documentSettings as unknown as Record<string, unknown>,
  }
}

const MODS = (part: Partial<InputModifiers>): InputModifiers => ({ ctrl: false, shift: false, alt: false, meta: false, ...part })
const key = (sign: string, part: Partial<InputModifiers>): KeyInput => ({ kind: 'key', key: sign, modifiers: MODS(part) })

const CTRL_SHIFT = { ctrl: true, shift: true }
const LOWEST = DISPLAY_SCALE_STEPS[0]!
const HIGHEST = DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!
const stepAfter = (scale: number, by: number): number => DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.indexOf(scale) + by]!

describe('SK-22 / SK-23 -- Ctrl + Shift + [+] / [-] move the display scale one step of S-234', () => {
  it('raises the default one step with SK-22, and stops the browser default (MK-10)', () => {
    const built = stage({ displayScale: DEFAULT_DISPLAY_SCALE })
    expect(built.press(key('+', CTRL_SHIFT)), MK_10_STOPS_ASSIGNED).toBe(true)
    expect(built.settings()['displayScale'], FR_039_THE_TWO_KEYS).toBe(stepAfter(DEFAULT_DISPLAY_SCALE, 1))
  })

  it('lowers the default one step with SK-23, and stops the browser default (MK-10)', () => {
    const built = stage({ displayScale: DEFAULT_DISPLAY_SCALE })
    expect(built.press(key('-', CTRL_SHIFT)), MK_10_STOPS_ASSIGNED).toBe(true)
    expect(built.settings()['displayScale'], FR_039_THE_TWO_KEYS).toBe(stepAfter(DEFAULT_DISPLAY_SCALE, -1))
  })

  it('walks every step in the order table T-202 spells, up and then down', () => {
    const built = stage({ displayScale: LOWEST })
    const up: number[] = [LOWEST]
    for (let at = 1; at < DISPLAY_SCALE_STEPS.length; at += 1) {
      built.press(key('+', CTRL_SHIFT))
      up.push(built.settings()['displayScale'] as number)
    }
    expect(up).toEqual([...DISPLAY_SCALE_STEPS])
    const down: number[] = [HIGHEST]
    for (let at = 1; at < DISPLAY_SCALE_STEPS.length; at += 1) {
      built.press(key('-', CTRL_SHIFT))
      down.push(built.settings()['displayScale'] as number)
    }
    expect(down).toEqual([...DISPLAY_SCALE_STEPS].reverse())
  })

  it('changes nothing past either end, and does not wrap', () => {
    const top = stage({ displayScale: HIGHEST })
    top.press(key('+', CTRL_SHIFT))
    expect(top.settings()['displayScale']).toBe(HIGHEST)
    const bottom = stage({ displayScale: LOWEST })
    bottom.press(key('-', CTRL_SHIFT))
    expect(bottom.settings()['displayScale']).toBe(LOWEST)
  })
})

describe('SK-17 (MUST) -- Ctrl + Shift + [0] resets the display scale and the chart zoom together', () => {
  it('takes 150 / zoomX 2 / zoomY 0.5 to the default step and 1 / 1, and stops the browser default', () => {
    const built = stage({ displayScale: 150, zoomX: 2, zoomY: 0.5 })
    expect(built.press(key('0', CTRL_SHIFT)), MK_10_STOPS_ASSIGNED).toBe(true)
    const after = built.settings()
    expect(after['displayScale'], FR_039_SK_17_RESETS_BOTH).toBe(DEFAULT_DISPLAY_SCALE)
    expect(after['zoomX'], FR_039_SK_17_RESETS_BOTH).toBe(1)
    expect(after['zoomY'], FR_039_SK_17_RESETS_BOTH).toBe(1)
  })

  it.skip('undoes both in one step -- open: CR-410 section 9 question 2 leaves FR-031 unread', () => {})
})

describe('MK-10 (MUST NOT) -- Ctrl + [+] / [-] / [0] without Shift are the browser zoom, and GRS takes none of them', () => {
  it.each(['+', '-', '0'])('leaves the document alone and the browser default running for Ctrl + %s', (sign) => {
    const start = { displayScale: 150, zoomX: 2, zoomY: 0.5 }
    const built = stage(start)
    expect(built.press(key(sign, { ctrl: true })), `${MK_10_KEEPS_UNASSIGNED} -- ${T_036_PLAIN_CTRL_IS_THE_BROWSERS}`).toBe(
      false,
    )
    const after = built.settings()
    expect({ displayScale: after['displayScale'], zoomX: after['zoomX'], zoomY: after['zoomY'] }).toEqual(start)
  })
})

describe('PND-93 -- the physical keys reach the loop as the three signs, with Ctrl and Shift held', () => {
  interface HostKey {
    readonly key: string
    readonly code: string
    readonly shift: boolean
  }

  const through = (settings: Record<string, unknown>, pressed: HostKey): { prevented: boolean; built: Stage } => {
    const built = stage(settings)
    const listeners = new Map<string, (event: unknown) => void>()
    const host = {
      addEventListener: (type: string, listener: unknown): void => {
        listeners.set(type, listener as (event: unknown) => void)
      },
      removeEventListener: (): void => undefined,
      innerWidth: SCREEN.width,
      innerHeight: SCREEN.height,
      document: {
        documentElement: {
          setPointerCapture: (): void => undefined,
          releasePointerCapture: (): void => undefined,
          hasPointerCapture: (): boolean => false,
        },
      },
    } as unknown as InputHost
    const source = domInputSource(host, (input) => built.loop.isBrowserDefaultStopped(input))
    const heard: HumanInput[] = []
    source.watchInput((input) => heard.push(input))
    let prevented = false
    const listener = listeners.get('keydown')
    if (listener === undefined) throw new Error('the source does not listen for keydown')
    listener({
      key: pressed.key,
      code: pressed.code,
      ctrlKey: true,
      shiftKey: pressed.shift,
      altKey: false,
      metaKey: false,
      timeStamp: 1,
      target: null,
      preventDefault: () => {
        prevented = true
      },
    })
    for (const input of heard) built.press(input)
    return { prevented, built }
  }

  it.each([
    { key: '+', code: 'Equal', shift: true, by: 1 },
    { key: '+', code: 'NumpadAdd', shift: true, by: 1 },
    { key: '_', code: 'Minus', shift: true, by: -1 },
    { key: '-', code: 'NumpadSubtract', shift: true, by: -1 },
  ])('moves the scale by $by and stops the default for $code with Ctrl + Shift', (one) => {
    const { prevented, built } = through({ displayScale: DEFAULT_DISPLAY_SCALE }, one)
    expect(prevented, MK_10_STOPS_ASSIGNED).toBe(true)
    expect(built.settings()['displayScale']).toBe(stepAfter(DEFAULT_DISPLAY_SCALE, one.by))
  })

  it.each([
    { key: ')', code: 'Digit0', shift: true },
    { key: '0', code: 'Numpad0', shift: true },
  ])('resets through $code with Ctrl + Shift', (one) => {
    const { prevented, built } = through({ displayScale: 150, zoomX: 2, zoomY: 0.5 }, one)
    expect(prevented, MK_10_STOPS_ASSIGNED).toBe(true)
    expect(built.settings()['displayScale'], FR_039_SK_17_RESETS_BOTH).toBe(DEFAULT_DISPLAY_SCALE)
  })

  it.each([
    { key: '=', code: 'Equal', shift: false },
    { key: '-', code: 'Minus', shift: false },
    { key: '0', code: 'Digit0', shift: false },
  ])('lets $code with Ctrl alone reach the browser', (one) => {
    const { prevented, built } = through({ displayScale: 150, zoomX: 2, zoomY: 0.5 }, one)
    expect(prevented, MK_10_KEEPS_UNASSIGNED).toBe(false)
    expect(built.settings()['displayScale']).toBe(150)
    expect(built.settings()['zoomX']).toBe(2)
  })
})

describe('FR-036 / T-255 -- the help lists both browser functions and the Ctrl + Shift keys on their entrances', () => {
  const ROSTER = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'help-roster.json'), 'utf8'),
  ) as { readonly entries: readonly { readonly row: string; readonly table: string; readonly keys: string | null }[] }

  const entryOf = (row: string) => {
    const found = ROSTER.entries.filter((one) => one.row === row)
    expect(found, `the help lists ${row} once`).toHaveLength(1)
    return found[0]!
  }

  it('lists BF-1 and BF-2 now that no row of T-036 holds Ctrl + 0', () => {
    expect(entryOf('BF-1').table).toBe('T-255')
    expect(entryOf('BF-2').table).toBe('T-255')
  })

  it.each([
    ['IC-105', '+'],
    ['IC-104', '-'],
  ])('carries Ctrl + Shift + the sign on %s', (row, sign) => {
    const keys = entryOf(row).keys ?? ''
    expect(keys).toContain('Ctrl')
    expect(keys).toContain('Shift')
    expect(keys).toContain(sign)
  })

  it('carries Ctrl + Shift + 0 on SK-17', () => {
    const keys = entryOf('SK-17').keys ?? ''
    expect(keys).toContain('Ctrl')
    expect(keys).toContain('Shift')
    expect(keys).toContain('0')
  })
})
