// CR-411: every press that changes the display scale shows its percentage for S-244, as a message that is not a notice (table T-260).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { selfAndDescendants, stage as fakeBrowser, wiringOf, type FakeElement } from '../fixtures/fake-browser'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_039_A_MESSAGE_EVERY_PRESS =
  '⭐ 表示の倍率を変える入口と割当が押されるたびに、いまの倍率を示すメッセージを 表 T-260 に従って出すこと（MUST）'
const SE_1_EVERY_PRESS = '`IC-104` / `IC-105` と 表 T-036 の `SK-22` / `SK-23` / `SK-17` が押されるたびに出すこと（MUST）'
const SE_1_EVEN_UNCHANGED =
  '押しても倍率が変わらなかったとき（いちばん大きい段で上げる側、いちばん小さい段で下げる側、既定の段で `SK-17`）も出すこと（MUST）'
const SE_2_THE_PERCENTAGE = '押したあとの `S-234` の値に `%` を付けて示すこと（MUST）'
const SE_2_THE_END_WORD =
  '⭐ いちばん大きい段で上げる側を押して倍率が変わらなかったときは最大であることを示す語を、いちばん小さい段で下げる側を押して変わらなかったときは最小であることを示す語を、数の後に添えること（MUST）'
const SE_3_IT_GOES_BY_ITSELF =
  '出した時点から `_assets/tbl-settings.md` の 表 T-206 の `S-244` が経ったら、人の操作を待たずに消すこと（MUST）'
const SE_4_REWRITE_AND_RESTART =
  '出ているあいだに次の押しがあったときは、2 つ目を出さず、出ているメッセージの中身を押したあとの値に書き換え、`S-244` をその時点から数え直すこと（MUST）'
const SE_4_NEVER_STACKED = '⛔ メッセージを積んではならない（MUST NOT）'
const SE_5_NOT_A_NOTICE = '⛔ `FR-076` の通知として扱ってはならない（MUST NOT）'

describe('CR-411 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-039 (MUST) -- a message on every press, by table T-260', FR_039_A_MESSAGE_EVERY_PRESS],
    ['SE-1 (MUST) -- on IC-104 / IC-105 / SK-22 / SK-23 / SK-17', SE_1_EVERY_PRESS],
    ['SE-1 (MUST) -- also when the press changed nothing', SE_1_EVEN_UNCHANGED],
    ['SE-2 (MUST) -- the value after the press, with %', SE_2_THE_PERCENTAGE],
    ['SE-2 (MUST) -- the maximum / minimum word at an end', SE_2_THE_END_WORD],
    ['SE-3 (MUST) -- gone S-244 after it was shown', SE_3_IT_GOES_BY_ITSELF],
    ['SE-4 (MUST) -- a later press rewrites it and restarts S-244', SE_4_REWRITE_AND_RESTART],
    ['SE-4 (MUST NOT) -- never stacked', SE_4_NEVER_STACKED],
    ['SE-5 (MUST NOT) -- not a notice of FR-076', SE_5_NOT_A_NOTICE],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// see T-206
const S_244 = (() => {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-244')
  if (row === undefined) throw new Error('table T-206 has no row S-244')
  const found = /\d+/.exec(bare(row.by['既定'] ?? ''))
  if (found === null) throw new Error('S-244 states no number')
  return Number(found[0])
})()

describe('S-244 -- the time the message stays', () => {
  it('is 1500 ms in table T-206', () => {
    expect(S_244).toBe(1500)
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
const THEME: ScreenTheme = { preference: 'light', hue: 214 }

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
    now: Date.UTC(2026, 8, 17, 3, 0, 0),
  })
})

afterEach(() => {
  vi.useRealTimers()
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

interface Bench {
  readonly loop: FrameLoop
  press(input: HumanInput): void
  pressEntrance(icon: string): void
  wait(ms: number): void
  messages(): readonly string[]
  notices(): number
  scale(): number
}

const MODS = (part: Partial<InputModifiers> = {}): InputModifiers => ({
  ctrl: false,
  shift: false,
  alt: false,
  meta: false,
  ...part,
})
const key = (sign: string, part: Partial<InputModifiers> = {}): KeyInput => ({ kind: 'key', key: sign, modifiers: MODS(part) })
const CTRL_SHIFT = { ctrl: true, shift: true }
const SK_22 = key('+', CTRL_SHIFT)
const SK_23 = key('-', CTRL_SHIFT)
const SK_17 = key('0', CTRL_SHIFT)

const pointer = (phase: 'down' | 'up'): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: 500,
  y: 20,
  modifiers: MODS(),
  clickCount: 1,
})

const isShown = (one: FakeElement): boolean =>
  one.getAttribute('hidden') === null &&
  !/display\s*:\s*none/.test(one.getAttribute('style') ?? '') &&
  one.textContent.trim() !== ''

const bench = (displayScale: number): Bench => {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(performance.now())
    }
  }
  const browser = fakeBrowser({ 'App Header': 37 })
  const real = domScreenSurface({ ...wiringOf(browser, THEME), readClockMs: () => Date.now() })
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
      real.showScreenView(view)
    },
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
  return {
    loop,
    press: (input) => {
      loop.receiveInput(input)
      drain()
    },
    pressEntrance: (icon) => {
      part = { part: 'App Header', entry: icon, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null }
      loop.receiveInput(pointer('down'))
      loop.receiveInput(pointer('up'))
      part = null
      drain()
    },
    wait: (ms) => {
      vi.advanceTimersByTime(ms)
      drain()
    },
    messages: () =>
      selfAndDescendants(browser.mount)
        .filter((one) => one.getAttribute('data-scale-message') !== null && isShown(one))
        .map((one) => one.textContent.trim()),
    notices: () => views[views.length - 1]?.notices.length ?? 0,
    scale: () => loop.document().documentSettings.displayScale as number,
  }
}

const LOWEST = DISPLAY_SCALE_STEPS[0]!
const HIGHEST = DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!
const stepAfter = (scale: number, by: number): number => DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.indexOf(scale) + by]!

describe('SE-1 / SE-2 (MUST) -- one message with the value after the press', () => {
  it.each([
    ['IC-105', 1],
    ['IC-104', -1],
  ] as const)('shows it for the %s entrance', (icon, by) => {
    const built = bench(DEFAULT_DISPLAY_SCALE)
    expect(built.messages(), 'premise: no message before a press').toEqual([])
    built.pressEntrance(icon)
    expect(built.scale(), 'premise: the entrance moved the scale').toBe(stepAfter(DEFAULT_DISPLAY_SCALE, by))
    expect(built.messages(), `${SE_1_EVERY_PRESS} -- ${SE_2_THE_PERCENTAGE}`).toEqual([`${stepAfter(DEFAULT_DISPLAY_SCALE, by)}%`])
  })

  it.each([
    ['SK-22', SK_22, 1],
    ['SK-23', SK_23, -1],
  ] as const)('shows it for %s', (_name, input, by) => {
    const built = bench(DEFAULT_DISPLAY_SCALE)
    built.press(input)
    expect(built.messages(), `${SE_1_EVERY_PRESS} -- ${SE_2_THE_PERCENTAGE}`).toEqual([`${stepAfter(DEFAULT_DISPLAY_SCALE, by)}%`])
  })

  it('shows the default step for SK-17 pressed at the default step, which changes nothing', () => {
    const built = bench(DEFAULT_DISPLAY_SCALE)
    built.press(SK_17)
    expect(built.messages(), SE_1_EVEN_UNCHANGED).toEqual([`${DEFAULT_DISPLAY_SCALE}%`])
  })
})

describe('SE-1 / SE-2 (MUST) -- at an end the press changes nothing, and the message says which end', () => {
  it.each([
    ['IC-105', null],
    ['SK-22', SK_22],
  ] as const)('shows the highest step and the maximum word for %s at the highest step', (icon, input) => {
    const built = bench(HIGHEST)
    if (input === null) built.pressEntrance(icon)
    else built.press(input)
    expect(built.scale()).toBe(HIGHEST)
    const shown = built.messages()
    expect(shown, SE_1_EVEN_UNCHANGED).toHaveLength(1)
    expect(shown[0]!.startsWith(`${HIGHEST}%`), `${SE_2_THE_END_WORD} -- ${shown[0]}`).toBe(true)
    expect(shown[0], SE_2_THE_END_WORD).toContain('最大')
  })

  it.each([
    ['IC-104', null],
    ['SK-23', SK_23],
  ] as const)('shows the lowest step and the minimum word for %s at the lowest step', (icon, input) => {
    const built = bench(LOWEST)
    if (input === null) built.pressEntrance(icon)
    else built.press(input)
    expect(built.scale()).toBe(LOWEST)
    const shown = built.messages()
    expect(shown, SE_1_EVEN_UNCHANGED).toHaveLength(1)
    expect(shown[0]!.startsWith(`${LOWEST}%`), `${SE_2_THE_END_WORD} -- ${shown[0]}`).toBe(true)
    expect(shown[0], SE_2_THE_END_WORD).toContain('最小')
  })

  it('adds no end word to a press that did change the scale', () => {
    const built = bench(DEFAULT_DISPLAY_SCALE)
    built.press(SK_22)
    expect(built.messages()).toEqual([`${stepAfter(DEFAULT_DISPLAY_SCALE, 1)}%`])
  })
})

describe('SE-3 (MUST) -- the message goes by itself after S-244', () => {
  it('stands 1 ms before S-244 and is gone at S-244, with nothing pressed', () => {
    const built = bench(DEFAULT_DISPLAY_SCALE)
    built.press(SK_22)
    built.wait(S_244 - 1)
    expect(built.messages(), SE_3_IT_GOES_BY_ITSELF).toHaveLength(1)
    built.wait(1)
    expect(built.messages(), SE_3_IT_GOES_BY_ITSELF).toEqual([])
  })
})

describe('SE-4 (MUST) -- a press while it stands rewrites it and restarts S-244', () => {
  it('keeps one message holding the last value, and counts S-244 from the last press', () => {
    const built = bench(DEFAULT_DISPLAY_SCALE)
    const half = Math.floor(S_244 / 2)
    built.pressEntrance('IC-105')
    built.wait(half)
    built.pressEntrance('IC-105')
    built.wait(half)
    built.pressEntrance('IC-105')
    const last = stepAfter(DEFAULT_DISPLAY_SCALE, 3)
    expect(built.messages(), `${SE_4_NEVER_STACKED} -- ${SE_4_REWRITE_AND_RESTART}`).toEqual([`${last}%`])
    built.wait(S_244 - 1)
    expect(built.messages(), SE_4_REWRITE_AND_RESTART).toEqual([`${last}%`])
    built.wait(1)
    expect(built.messages(), SE_3_IT_GOES_BY_ITSELF).toEqual([])
  })
})

describe('SE-5 (MUST NOT) -- the message is not a notice', () => {
  it('adds nothing to the notices the screen view carries', () => {
    const built = bench(DEFAULT_DISPLAY_SCALE)
    const before = built.notices()
    built.press(SK_22)
    expect(built.messages(), 'premise: the message stands').toHaveLength(1)
    expect(built.notices(), SE_5_NOT_A_NOTICE).toBe(before)
  })

  it.each(['Esc', 'Enter'])('is not taken away by %s', (sign) => {
    const built = bench(DEFAULT_DISPLAY_SCALE)
    built.press(SK_22)
    built.press(key(sign))
    expect(built.messages(), SE_5_NOT_A_NOTICE).toEqual([`${stepAfter(DEFAULT_DISPLAY_SCALE, 1)}%`])
  })

  it('lets Esc dismiss a standing notice and leaves the message', () => {
    const built = bench(DEFAULT_DISPLAY_SCALE)
    built.loop.raiseStartupNotice('RS-25')
    built.wait(0)
    expect(built.notices(), 'premise: one notice stands').toBe(1)
    built.press(SK_22)
    built.press(key('Esc'))
    expect(built.notices(), 'Esc takes the notice (SK-19 / IN-4)').toBe(0)
    expect(built.messages(), SE_5_NOT_A_NOTICE).toEqual([`${stepAfter(DEFAULT_DISPLAY_SCALE, 1)}%`])
  })
})
