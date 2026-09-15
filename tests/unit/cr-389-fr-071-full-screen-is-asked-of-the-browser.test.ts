// CR-389 / FR-071 / UF-48 / FT-6: full screen is asked of the browser, and S-99f copies what the browser answers.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  CommandItem,
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const FR_071_FULLSCREEN_API =
  '全画面表示には、ブラウザの全画面表示の機能（Fullscreen API）を使い、文書全体（`document.documentElement`）を全画面にすること（MUST）'
const FR_071_NOT_WIDENED_INSIDE = 'アプリの中で描く領域を広げることを、全画面表示に代えてはならない（MUST NOT）'
const FR_071_ENTER_OR_LEAVE =
  '入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-11` と、表 T-036 の `SK-15`）が押されたとき、いまブラウザが全画面でなければ入ることを、全画面なら出ることを、ブラウザに求めること（MUST）'
const FR_071_JUDGED_BY_ELEMENT = 'いまブラウザが全画面かどうかは、`document.fullscreenElement` の有無で判じること（MUST）'
const FR_071_S_99F_ON_CHANGE =
  '`_assets/tbl-settings.md` の 表 T-206 の `S-99f` は、ブラウザが全画面表示に入ったこと・出たことを告げたとき（`fullscreenchange`）に、`document.fullscreenElement` の有無へ合わせること（MUST）'
const FR_071_NOT_ON_ASKING = '求めただけで `S-99f` を変えてはならない（MUST NOT）'
const FR_071_RS_59 =
  'ブラウザが求めを拒んだとき、またはブラウザが全画面表示の機能を持たないときは、表 T-233 の `RS-59` を運ぶ通知を出すこと（MUST）'
const FR_071_F11_DEFAULT = '`SK-15` の `F11` について、ブラウザの既定動作を止めること（MUST）'
const UF_48_INSIDE_THE_CALL =
  '全画面表示の求めは、入口の入力（表 T-078 の `FT-1`）を受けたその呼び出しの中で、フレームを待たずに出すこと（MUST）'
const IN_4A_REASON = '本ツールが何もしない `Esc` を止めると、ブラウザが `Esc` に持たせた働きを奪う'
const IN_4A_BROWSER_LEAVES = '全画面表示を `Esc` で解くのはブラウザであり、本行が渡すかどうかに左右されない'

const REQUIREMENT_CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-071 (MUST) -- the Fullscreen API on document.documentElement', FR_071_FULLSCREEN_API],
  ['FR-071 (MUST NOT) -- no widening inside the app in its place', FR_071_NOT_WIDENED_INSIDE],
  ['FR-071 (MUST) -- IC-11 / SK-15 ask to enter, or to leave', FR_071_ENTER_OR_LEAVE],
  ['FR-071 (MUST) -- full screen or not is document.fullscreenElement', FR_071_JUDGED_BY_ELEMENT],
  ['FR-071 (MUST) -- S-99f follows fullscreenchange', FR_071_S_99F_ON_CHANGE],
  ['FR-071 (MUST NOT) -- asking alone does not move S-99f', FR_071_NOT_ON_ASKING],
  ['FR-071 (MUST) -- a refusal or a missing feature carries RS-59', FR_071_RS_59],
  ['FR-071 (MUST) -- the default of F11 is stopped', FR_071_F11_DEFAULT],
  ['T-028 IN-4a -- the reason Esc with nothing to consume goes to the browser', IN_4A_REASON],
  ['T-028 IN-4a -- leaving full screen by Esc is the browser, whatever the row hands on', IN_4A_BROWSER_LEAVES],
]

describe('CR-389 -- the manuscript these cases are driven by', () => {
  it.each(REQUIREMENT_CLAUSES)('01-04 still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('05-07 still says it, word for word: UF-48 (MUST) -- the ask leaves inside the input call', () => {
    expect(DESIGN).toContain(UF_48_INSIDE_THE_CALL)
  })

  it('names IC-11 on the App Header, SK-15 on F11, FT-6 and RS-59 (NT-3a), each governed by FR-071', () => {
    const ic11 = specTable('T-109').rows.find((row) => row.id === FULL_SCREEN_ENTRY)
    expect(bare(ic11?.by['面'] ?? '')).toBe(APP_HEADER)
    expect(ic11?.cells.join(' ')).toContain('`FR-071`')
    const sk15 = specTable('T-036').rows.find((row) => row.id === 'SK-15')
    expect(sk15?.cells.join(' ')).toContain('`F11`')
    expect(sk15?.cells.join(' ')).toContain('`FR-071`')
    const ft6 = specTable('T-078').rows.find((row) => row.id === 'FT-6')
    expect(ft6?.cells.join(' ')).toContain('`fullscreenchange`')
    expect(ft6?.cells.join(' ')).toContain('`FR-071`')
    const rs59 = specTable('T-233').rows.find((row) => row.id === REFUSED_REASON)
    expect(bare(rs59?.by['作法'] ?? '')).toBe('NT-3a')
    expect(rs59?.cells.join(' ')).toContain('`FR-071`')
  })

  it('the dictionary manuscript holds words and a next step for RS-59 in both languages', () => {
    const words = reasonWords(REFUSED_REASON)
    expect(words.text.ja).not.toBe('')
    expect(words.text.en).not.toBe('')
    expect(words.nextStep?.ja ?? '').not.toBe('')
    expect(words.nextStep?.en ?? '').not.toBe('')
  })
})

const FULL_SCREEN_ENTRY = 'IC-11'
const REFUSED_REASON = 'RS-59'

// see T-109
const APP_HEADER = ((): string => {
  const row = specTable('T-109').rows.find((one) => one.id === FULL_SCREEN_ENTRY)
  if (row === undefined) throw new Error(`table T-109 has no row ${FULL_SCREEN_ENTRY}`)
  return bare(row.by['面'] ?? '')
})()

// see S-99e, T-109
const PALETTE_ENTRY_ON_THE_HEADER = ((): string => {
  const found = specTable('T-109').rows.filter(
    (row) => bareAll(row.by['面'] ?? '').includes(APP_HEADER) && (row.by['何の入口か'] ?? '').includes('`S-99e`'),
  )
  if (found.length !== 1) throw new Error(`table T-109 has ${found.length} App Header entries for S-99e`)
  return (found[0] as { readonly id: string }).id
})()

interface Words {
  readonly ja: string
  readonly en: string
}

interface ReasonWords {
  readonly rowId: string
  readonly text: Words
  readonly nextStep?: Words
}

// see FR-038, T-233
const reasonWords = (rowId: string): ReasonWords => {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { readonly reasons: readonly ReasonWords[] }
  const found = raw.reasons.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary manuscript holds no reason ${rowId}`)
  return found
}

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Document

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const ANYWHERE = { x: 200, y: 20 }

const key = (which: string): KeyInput => ({ kind: 'key', key: which, modifiers: { ...NO_MODIFIERS } })

const pointer = (phase: PointerPhase): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: ANYWHERE.x,
  y: ANYWHERE.y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

interface Asked {
  readonly insideReceiveInput: boolean
  readonly framesRunSinceTheInput: number
}

interface BrowserSide {
  isFullScreen: boolean
  refuses: boolean
  readonly requests: Asked[]
  readonly exits: Asked[]
}

// WHY: the host is passed by shape and the loop is called through a widened signature, so this
// WHY: file compiles against a FrameLoop that does not yet take a twelfth argument.
type LoopWithHost = (...args: readonly unknown[]) => FrameLoop

interface Stage {
  readonly loop: FrameLoop
  readonly browser: BrowserSide
  aimAt(entry: string | null): void
  send(input: HumanInput): void
  runFrames(): void
  frames(): number
  view(): ScreenView
  tellFullScreen(isFullScreen: boolean): void
}

const realRaf = (globalThis as any).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// see UF-48, T-078
function stage(options: { readonly withHost?: boolean; readonly language?: DisplayLanguage } = {}): Stage {
  const waiting: ((time: number) => void)[] = []
  let insideReceiveInput = false
  let framesRunSinceTheInput = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  const browser: BrowserSide = { isFullScreen: false, refuses: false, requests: [], exits: [] }
  const host = {
    isFullScreen: (): boolean => browser.isFullScreen,
    requestFullScreen: (): Promise<void> => {
      browser.requests.push({ insideReceiveInput, framesRunSinceTheInput })
      return browser.refuses ? Promise.reject(new Error('refused by the fake browser')) : Promise.resolve()
    },
    exitFullScreen: (): Promise<void> => {
      browser.exits.push({ insideReceiveInput, framesRunSinceTheInput })
      return Promise.resolve()
    },
  }
  const drawn: string[] = []
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => void views.push(view),
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  const loop = (frameLoop as unknown as LoopWithHost)(
    { showSvg: (svg: string) => void drawn.push(svg) },
    structuredClone(TEMPLATE),
    SCREEN,
    { surface, language: options.language ?? 'ja' },
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    options.withHost === false ? undefined : host,
  )
  const runFrames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) {
        framesRunSinceTheInput += 1
        callback(turn)
      }
    }
  }
  runFrames()
  return {
    loop,
    browser,
    aimAt: (entry) => {
      part =
        entry === null
          ? null
          : {
              part: APP_HEADER,
              entry,
              format: null,
              rowGroupId: null,
              resourceUid: null,
              dividerPanel: null,
              noticeDismissKey: null,
            }
    },
    send: (input) => {
      framesRunSinceTheInput = 0
      insideReceiveInput = true
      try {
        loop.receiveInput(input)
      } finally {
        insideReceiveInput = false
      }
    },
    runFrames,
    frames: () => drawn.length,
    view: () => {
      const last = views[views.length - 1]
      if (last === undefined) throw new Error('the surface was given no description')
      return last
    },
    tellFullScreen: (isFullScreen) => {
      const member = (loop as unknown as { fullScreenChanged?: (isFullScreen: boolean) => void }).fullScreenChanged
      if (typeof member !== 'function') {
        throw new Error('FrameLoop has no fullScreenChanged(isFullScreen) for the shell to relay fullscreenchange by')
      }
      member.call(loop, isFullScreen)
    },
  }
}

const entryOf = (view: ScreenView, icon: string): CommandItem => {
  const found = view.appHeaderItems.commands.find((one) => one.icon === icon)
  if (found === undefined) throw new Error(`the App Header describes no entry ${icon}`)
  return found
}

// see FR-071, IC-11
function pressFullScreenEntry(built: Stage): void {
  built.aimAt(FULL_SCREEN_ENTRY)
  built.send(pointer('down'))
  built.send(pointer('up'))
}

const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 4; turn += 1) await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('the bench -- a press on the App Header reaches the entry it is aimed at', () => {
  it('CONTROL: the App Header entry naming S-99e switches the Command Palette through this harness', () => {
    const built = stage()
    const before = built.view().commandPalette === null
    built.aimAt(PALETTE_ENTRY_ON_THE_HEADER)
    built.send(pointer('down'))
    built.runFrames()
    built.send(pointer('up'))
    built.runFrames()
    expect(built.view().commandPalette === null, `${PALETTE_ENTRY_ON_THE_HEADER} pressed once`).toBe(!before)
  })

  it('premise: nothing is full screen and nothing is told before anything is pressed', () => {
    const built = stage()
    expect(built.view().frame.isFullScreen).toBe(false)
    expect(entryOf(built.view(), FULL_SCREEN_ENTRY).isPressed).toBe(false)
    expect(built.view().notices).toEqual([])
    expect(built.browser.requests).toEqual([])
    expect(built.browser.exits).toEqual([])
  })
})

describe(`FR-071 (MUST) -- ${FR_071_ENTER_OR_LEAVE}`, () => {
  it(`IC-11 while not full screen asks to enter exactly once, and asks nothing else: ${FR_071_JUDGED_BY_ELEMENT}`, () => {
    const built = stage()
    pressFullScreenEntry(built)
    expect(built.browser.requests, FR_071_ENTER_OR_LEAVE).toHaveLength(1)
    expect(built.browser.exits, FR_071_ENTER_OR_LEAVE).toHaveLength(0)
  })

  it('IC-11 while full screen asks to leave exactly once, and asks nothing else', () => {
    const built = stage()
    built.browser.isFullScreen = true
    pressFullScreenEntry(built)
    expect(built.browser.exits, FR_071_ENTER_OR_LEAVE).toHaveLength(1)
    expect(built.browser.requests, FR_071_ENTER_OR_LEAVE).toHaveLength(0)
  })

  it(`F11 while not full screen asks to enter exactly once: ${FR_071_ENTER_OR_LEAVE}`, () => {
    const built = stage()
    built.send(key('F11'))
    expect(built.browser.requests).toHaveLength(1)
    expect(built.browser.exits).toHaveLength(0)
  })

  it('F11 while full screen asks to leave exactly once', () => {
    const built = stage()
    built.browser.isFullScreen = true
    built.send(key('F11'))
    expect(built.browser.exits).toHaveLength(1)
    expect(built.browser.requests).toHaveLength(0)
  })

  it(`F11 has its browser default stopped: ${FR_071_F11_DEFAULT}`, () => {
    const built = stage()
    expect(built.loop.isBrowserDefaultStopped(key('F11')), FR_071_F11_DEFAULT).toBe(true)
  })
})

describe(`UF-48 (MUST) -- ${UF_48_INSIDE_THE_CALL}`, () => {
  it('IC-11: the ask is made inside receiveInput, before any animation frame runs', () => {
    const built = stage()
    pressFullScreenEntry(built)
    expect(built.browser.requests, UF_48_INSIDE_THE_CALL).toEqual([
      { insideReceiveInput: true, framesRunSinceTheInput: 0 },
    ])
  })

  it('F11 while full screen: the leave is made inside receiveInput, before any animation frame runs', () => {
    const built = stage()
    built.browser.isFullScreen = true
    built.send(key('F11'))
    expect(built.browser.exits, UF_48_INSIDE_THE_CALL).toEqual([{ insideReceiveInput: true, framesRunSinceTheInput: 0 }])
  })
})

describe(`FR-071 (MUST NOT) -- ${FR_071_NOT_ON_ASKING}`, () => {
  it('IC-11 accepted by the browser but not yet told: S-99f and the pressed look of IC-11 stay as they were', () => {
    const built = stage()
    pressFullScreenEntry(built)
    built.runFrames()
    expect(built.browser.requests, 'premise: the browser was asked').toHaveLength(1)
    expect(built.view().frame.isFullScreen, FR_071_NOT_ON_ASKING).toBe(false)
    expect(entryOf(built.view(), FULL_SCREEN_ENTRY).isPressed, FR_071_NOT_ON_ASKING).toBe(false)
  })

  it('F11 while full screen but not yet told it left: S-99f stays true', async () => {
    const built = stage()
    built.browser.isFullScreen = true
    built.tellFullScreen(true)
    built.runFrames()
    built.send(key('F11'))
    await settle()
    built.runFrames()
    expect(built.browser.exits, 'premise: the browser was asked to leave').toHaveLength(1)
    expect(built.view().frame.isFullScreen, FR_071_NOT_ON_ASKING).toBe(true)
    expect(entryOf(built.view(), FULL_SCREEN_ENTRY).isPressed, FR_071_NOT_ON_ASKING).toBe(true)
  })
})

describe(`FR-071 (MUST) / FT-6 -- ${FR_071_S_99F_ON_CHANGE}`, () => {
  it('told it entered: S-99f and the pressed look of IC-11 turn true, in exactly one frame', () => {
    const built = stage()
    const before = built.frames()
    built.tellFullScreen(true)
    built.runFrames()
    expect(built.frames(), 'FT-6 wakes one frame').toBe(before + 1)
    expect(built.view().frame.isFullScreen, FR_071_S_99F_ON_CHANGE).toBe(true)
    expect(entryOf(built.view(), FULL_SCREEN_ENTRY).isPressed, FR_071_S_99F_ON_CHANGE).toBe(true)
  })

  it('told it left, with no press of this tool at all: both return to false, in exactly one frame', () => {
    const built = stage()
    built.tellFullScreen(true)
    built.runFrames()
    const before = built.frames()
    built.tellFullScreen(false)
    built.runFrames()
    expect(built.frames(), 'FT-6 wakes one frame').toBe(before + 1)
    expect(built.view().frame.isFullScreen, FR_071_S_99F_ON_CHANGE).toBe(false)
    expect(entryOf(built.view(), FULL_SCREEN_ENTRY).isPressed, FR_071_S_99F_ON_CHANGE).toBe(false)
  })

  it('a press, then the word from the browser: the look follows the word and not the press', () => {
    const built = stage()
    pressFullScreenEntry(built)
    built.runFrames()
    built.browser.isFullScreen = true
    built.tellFullScreen(true)
    built.runFrames()
    expect(built.view().frame.isFullScreen).toBe(true)
    expect(built.view().notices, 'an accepted ask tells nothing').toEqual([])
  })
})

describe(`FR-071 (MUST) -- ${FR_071_RS_59}`, () => {
  it('the browser refuses IC-11: one RS-59 notice with its NT-3a words, and S-99f unchanged', async () => {
    const built = stage()
    built.browser.refuses = true
    pressFullScreenEntry(built)
    await settle()
    built.runFrames()
    const words = reasonWords(REFUSED_REASON)
    const notices = built.view().notices
    expect(notices, FR_071_RS_59).toHaveLength(1)
    expect(notices[0]?.text, FR_071_RS_59).toBe(words.text.ja)
    expect(notices[0]?.manner).toBe('NT-3a')
    expect(notices[0]?.nextSteps ?? []).toContain(words.nextStep?.ja)
    expect(built.view().frame.isFullScreen, FR_071_NOT_ON_ASKING).toBe(false)
    expect(entryOf(built.view(), FULL_SCREEN_ENTRY).isPressed, FR_071_NOT_ON_ASKING).toBe(false)
  })

  it('the browser refuses F11: one RS-59 notice, in the language the screen is in', async () => {
    const built = stage({ language: 'en' })
    built.browser.refuses = true
    built.send(key('F11'))
    await settle()
    built.runFrames()
    const notices = built.view().notices
    expect(notices, FR_071_RS_59).toHaveLength(1)
    expect(notices[0]?.text, FR_071_RS_59).toBe(reasonWords(REFUSED_REASON).text.en)
    expect(built.view().frame.isFullScreen).toBe(false)
  })

  it('no full-screen feature is handed in: IC-11 tells RS-59 and S-99f stays false', async () => {
    const built = stage({ withHost: false })
    pressFullScreenEntry(built)
    await settle()
    built.runFrames()
    const notices = built.view().notices
    expect(notices, FR_071_RS_59).toHaveLength(1)
    expect(notices[0]?.text, FR_071_RS_59).toBe(reasonWords(REFUSED_REASON).text.ja)
    expect(built.view().frame.isFullScreen, FR_071_NOT_ON_ASKING).toBe(false)
    expect(entryOf(built.view(), FULL_SCREEN_ENTRY).isPressed, FR_071_NOT_ON_ASKING).toBe(false)
  })

  it('no full-screen feature is handed in: F11 tells RS-59 too, and still has its default stopped', async () => {
    const built = stage({ withHost: false })
    expect(built.loop.isBrowserDefaultStopped(key('F11')), FR_071_F11_DEFAULT).toBe(true)
    built.send(key('F11'))
    await settle()
    built.runFrames()
    expect(built.view().notices.map((one) => one.text), FR_071_RS_59).toEqual([
      reasonWords(REFUSED_REASON).text.ja,
    ])
    expect(built.view().frame.isFullScreen).toBe(false)
  })

  it('an accepted ask tells nothing', async () => {
    const built = stage()
    pressFullScreenEntry(built)
    await settle()
    built.runFrames()
    expect(built.browser.requests, 'premise: the browser was asked').toHaveLength(1)
    expect(built.view().notices).toEqual([])
  })
})
