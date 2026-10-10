// CR-666 / IN-4 / IN-4a / FR-071 / T-283 RG-17: full screen is the last Esc rung, a held Esc consumes no rung, Escape is locked.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { HumanInput } from '../../src/adapter/input-command-translator/input-command-translator'
import {
  escapeTarget,
  type EscapeContext,
  type EscapeTarget,
} from '../../src/entity/document-model/screen-state/screen-state'
import {
  domInputSource,
  escapeKeyLockOf,
  type InputHost,
  type PointerCaptureTarget,
} from '../../src/framework/dom-input-source/dom-input-source'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { wire, type FakeElement } from '../fixtures/fake-browser'
import { specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const IN_4_ORDER =
  '消費する階層は 出ている通知 → 確定していないその場の編集 → 開いている面 → 進行中のドラッグ・引きかけの矢印 → 開いているウィンドウ → プロパティパネル → 構え → 選択 → `Dual Cursor` モード → 出ている説明 → 全画面表示 の順とすること（MUST）'
const IN_4_FULL_SCREEN_LAST =
  '⭐ **全画面表示を最後に置くのは、利用者が「もう何もキャンセルできない状態になってから」全画面表示を出ると定めたからである**'
const IN_4_FULL_SCREEN_RUNG_ASKS =
  '全画面表示の段は、全画面表示を出ることをブラウザに求める（`FR-071` の入口の押下と同じ求め）。'
const IN_4_NO_REPEAT =
  '⛔ 押しっぱなしの `Esc` の繰り返し（`KeyboardEvent.repeat` が真の押下）で段を消費してはならない（MUST NOT）'
const IN_4A_PASS_ON = '**消費する対象が 1 つも無いときは、必ずブラウザへ渡すこと（MUST）**'
const IN_4A_FULL_SCREEN_ALWAYS_STANDS =
  '⚠️ 全画面表示のあいだは、`IN-4` の全画面表示の段がいつも立つので、本行の「渡す」は起きない。'
const FR_071_ESCAPE_LOCKED =
  '閲覧環境が Keyboard Lock（`navigator.keyboard`）を持つなら `Escape` の鍵をかけることを求め、全画面表示を出たことを受けたら鍵を放すこと（MUST）'
const FR_071_LOCK_REFUSAL_UNTOLD = '鍵を断られたこと・閲覧環境が持たないことを通知してはならない（MUST NOT）'
const FR_071_LAST_RUNG = '`Esc` で全画面表示を出るのは、アプリの `Esc` の階層の最後の段である（表 T-028 の `IN-4`）。'

const MANUSCRIPT_CLAUSES: readonly (readonly [string, string])[] = [
  ['T-028 IN-4 (MUST) -- the order of the Esc rungs', IN_4_ORDER],
  ['T-028 IN-4 -- full screen is last by the user ruling', IN_4_FULL_SCREEN_LAST],
  ['T-028 IN-4 -- the full screen rung asks the browser to leave', IN_4_FULL_SCREEN_RUNG_ASKS],
  ['T-028 IN-4 (MUST NOT) -- a repeated Esc consumes no rung', IN_4_NO_REPEAT],
  ['T-028 IN-4a (MUST) -- with nothing to consume, Esc goes to the browser', IN_4A_PASS_ON],
  ['T-028 IN-4a -- in full screen the full screen rung always stands', IN_4A_FULL_SCREEN_ALWAYS_STANDS],
  ['FR-071 (MUST) -- Escape is locked on entering and unlocked on leaving', FR_071_ESCAPE_LOCKED],
  ['FR-071 (MUST NOT) -- a refused or absent lock is not told', FR_071_LOCK_REFUSAL_UNTOLD],
  ['FR-071 -- leaving full screen by Esc is the last rung', FR_071_LAST_RUNG],
]

describe('CR-666 -- the manuscript these cases are driven by', () => {
  it.each(MANUSCRIPT_CLAUSES)('01-04 still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-283 holds RG-17 (full screen, Esc) right after RG-8, as the last Esc row', () => {
    const rows = specTable('T-283').rows
    const ids = rows.map((r) => r.id)
    expect(ids).toContain('RG-17')
    expect(ids.indexOf('RG-17')).toBe(ids.indexOf('RG-8') + 1)
    const rg17 = rows.find((r) => r.id === 'RG-17')
    expect(rg17?.by['奪い合う出来事']).toBe('`Esc`')
    expect(rg17?.by['段']).toBe('全画面表示')
    expect(rg17?.by['順を決めた行']).toContain('`IN-4`')
    expect(rg17?.by['順を決めた行']).toContain('`FR-071`')
    const escRows = rows.filter((r) => r.by['奪い合う出来事'] === '`Esc`')
    expect(escRows[escRows.length - 1]?.id).toBe('RG-17')
  })
})

type Flag = Exclude<keyof EscapeContext, 'focusedWindow' | 'isDelayDiagnosticsReportInFront' | 'isResourceListInFront' | 'isFocusInPropertiesPanel'>

const NOTHING_ON: Required<Pick<EscapeContext, Flag>> = {
  isNoticeStanding: false,
  isTextEntryUnsettled: false,
  isConfirmationStanding: false,
  isSurfaceOpen: false,
  gestureInFlight: false,
  isSearchPanelStanding: false,
  isHelpStanding: false,
  isDelayDiagnosticsReportStanding: false,
  isResourceListStanding: false,
  isDialogueFieldStanding: false,
  isPropertiesPanelOpen: false,
  isArmed: false,
  isSelectionStanding: false,
  dualCursorMode: false,
  isTooltipStanding: false,
  isFullScreen: false,
}

const on = (...flags: readonly Flag[]): EscapeContext => {
  const context: Record<string, unknown> = { ...NOTHING_ON, focusedWindow: null }
  for (const flag of flags) context[flag] = true
  return context as unknown as EscapeContext
}

// see IN-4
const RUNGS_ABOVE_FULL_SCREEN: readonly (readonly [string, Flag, EscapeTarget])[] = [
  ['a standing notice', 'isNoticeStanding', 'notice'],
  ['an unsettled text entry', 'isTextEntryUnsettled', 'textEntry'],
  ['a standing confirmation', 'isConfirmationStanding', 'confirmation'],
  ['an open surface', 'isSurfaceOpen', 'surface'],
  ['a gesture in flight', 'gestureInFlight', 'gesture'],
  ['the search panel', 'isSearchPanelStanding', 'searchPanel'],
  ['the help modal', 'isHelpStanding', 'helpModal'],
  ['the delay diagnostics report', 'isDelayDiagnosticsReportStanding', 'delayDiagnosticsReport'],
  ['the dialogue field', 'isDialogueFieldStanding', 'dialogueField'],
  ['the properties panel', 'isPropertiesPanelOpen', 'propertiesPanel'],
  ['an armed tool', 'isArmed', 'armed'],
  ['a selection', 'isSelectionStanding', 'selection'],
  ['Dual Cursor mode', 'dualCursorMode', 'dualCursorMode'],
  ['a standing tooltip', 'isTooltipStanding', 'tooltip'],
]

describe(`IN-4 (MUST): ${IN_4_ORDER}`, () => {
  it('full screen alone: the answer is fullScreen', () => {
    expect(escapeTarget(on('isFullScreen'))).toBe('fullScreen')
  })

  it.each(RUNGS_ABOVE_FULL_SCREEN)('full screen with %s: the other rung wins', (_name, flag, word) => {
    expect(escapeTarget(on(flag)), 'the rung alone').toBe(word)
    expect(escapeTarget(on(flag, 'isFullScreen')), 'with full screen beside it').toBe(word)
  })

  it('full screen with every other rung on: full screen is still not the answer', () => {
    const all = RUNGS_ABOVE_FULL_SCREEN.map(([, flag]) => flag)
    expect(escapeTarget(on(...all, 'isFullScreen'))).not.toBe('fullScreen')
    expect(escapeTarget(on(...all, 'isFullScreen'))).toBe('notice')
  })
})

describe(`IN-4a (MUST): ${IN_4A_PASS_ON}`, () => {
  it('nothing on and not full screen: null (the Esc goes to the browser)', () => {
    expect(escapeTarget(on())).toBeNull()
  })

  it(`${IN_4A_FULL_SCREEN_ALWAYS_STANDS}`, () => {
    expect(escapeTarget(on('isFullScreen'))).not.toBeNull()
  })
})

interface Registration {
  readonly type: string
  readonly listener: EventListenerOrEventListenerObject
}

function fakeHost(): { host: InputHost; send(type: string, event: object): void } {
  const registered: Registration[] = []
  const capture: PointerCaptureTarget = {
    setPointerCapture(): void {},
    releasePointerCapture(): void {},
    hasPointerCapture: () => false,
  }
  const host: InputHost = {
    addEventListener(type, listener): void {
      registered.push({ type, listener })
    },
    removeEventListener(type, listener): void {
      const at = registered.findIndex((one) => one.type === type && one.listener === listener)
      if (at >= 0) registered.splice(at, 1)
    },
    innerWidth: 1280,
    innerHeight: 800,
    document: { documentElement: capture },
  }
  return {
    host,
    send(type, event): void {
      for (const one of [...registered].filter((each) => each.type === type)) {
        if (typeof one.listener === 'function') one.listener(event as unknown as Event)
        else one.listener.handleEvent(event as unknown as Event)
      }
    },
  }
}

function escapeEvent(target: FakeElement, repeat: boolean): object {
  return {
    key: 'Escape',
    code: 'Escape',
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    repeat,
    timeStamp: 1000,
    target,
    preventDefault(): void {},
  }
}

function escHarness(): { heardKeys(): string[]; press(repeat: boolean): void } {
  const fake = fakeHost()
  const heard: HumanInput[] = []
  const source = domInputSource(fake.host, () => true)
  source.watchInput((input) => heard.push(input))
  const target = wire({ preference: 'light', hue: 214 } as ScreenTheme).root()
  return {
    heardKeys: () =>
      heard.filter((one): one is Extract<HumanInput, { kind: 'key' }> => one.kind === 'key').map((one) => one.key),
    press(repeat): void {
      fake.send('keydown', escapeEvent(target, repeat))
    },
  }
}

describe(`IN-4 (MUST NOT): ${IN_4_NO_REPEAT}`, () => {
  it('the first Esc keydown (repeat false) is reported as Esc', () => {
    const run = escHarness()
    run.press(false)
    expect(run.heardKeys()).toEqual(['Esc'])
  })

  it('a repeated Esc keydown (repeat true) is not reported', () => {
    const run = escHarness()
    run.press(true)
    expect(run.heardKeys()).toEqual([])
  })

  it('holding Esc: the first press is reported once, the repeats after it are not', () => {
    const run = escHarness()
    run.press(false)
    run.press(true)
    run.press(true)
    run.press(true)
    expect(run.heardKeys()).toEqual(['Esc'])
  })

  it('a fresh press after the held one is reported again', () => {
    const run = escHarness()
    run.press(false)
    run.press(true)
    run.press(false)
    expect(run.heardKeys()).toEqual(['Esc', 'Esc'])
  })
})

const settle = async (): Promise<void> => {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

async function withUnhandledWatch(body: () => Promise<void>): Promise<unknown[]> {
  const caught: unknown[] = []
  const listener = (reason: unknown): void => {
    caught.push(reason)
  }
  process.on('unhandledRejection', listener)
  try {
    await body()
    await settle()
  } finally {
    process.off('unhandledRejection', listener)
  }
  return caught
}

describe(`FR-071 (MUST): ${FR_071_ESCAPE_LOCKED}`, () => {
  it("lock() asks the keyboard to lock ['Escape']", async () => {
    const calls: unknown[][] = []
    const keyboard = {
      lock: (...args: unknown[]): Promise<void> => {
        calls.push(args)
        return Promise.resolve()
      },
      unlock: (): void => {},
    }
    escapeKeyLockOf(keyboard).lock()
    await settle()
    expect(calls).toEqual([[['Escape']]])
  })

  it('unlock() asks the keyboard to unlock', () => {
    let unlocked = 0
    const keyboard = {
      lock: (): Promise<void> => Promise.resolve(),
      unlock: (): void => {
        unlocked += 1
      },
    }
    escapeKeyLockOf(keyboard).unlock()
    expect(unlocked).toBe(1)
  })
})

const REFUSING_KEYBOARDS: readonly (readonly [string, () => unknown])[] = [
  ['undefined (no Keyboard Lock)', () => undefined],
  ['null', () => null],
  ['an empty object', () => ({})],
  [
    'a keyboard whose lock throws',
    () => ({
      lock: (): never => {
        throw new Error('refused')
      },
      unlock: (): void => {},
    }),
  ],
  [
    'a keyboard whose lock returns a rejected promise',
    () => ({
      lock: (): Promise<void> => Promise.reject(new Error('refused')),
      unlock: (): void => {},
    }),
  ],
]

describe(`FR-071 (MUST NOT): ${FR_071_LOCK_REFUSAL_UNTOLD}`, () => {
  it.each(REFUSING_KEYBOARDS)('%s: neither lock() nor unlock() throws, and nothing is left unhandled', async (_name, make) => {
    const caught = await withUnhandledWatch(async () => {
      const lock = escapeKeyLockOf(make())
      expect(() => lock.lock()).not.toThrow()
      await settle()
      expect(() => lock.unlock()).not.toThrow()
    })
    expect(caught).toEqual([])
  })
})
