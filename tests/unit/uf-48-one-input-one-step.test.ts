// UF-48 / SF-3 / SF-6 / SF-7: one input is one step, and its effects run inside the same call.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type FullScreenHost,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const UF_48_ONE_ROAD =
  '出来事は 1 本の送り口 `sendToSession` だけを通し、`advanceScreenSession` で 1 段進めて参照を差し替え、返った副作用をその同じ呼び出しの中で `UF-123` の実行に渡す —— `SF-6` ・ `SF-7`。'
const UF_48_ESC_ONE_RUNG = '`Esc` の段は `escapeTarget` で決めて 1 段 1 行で送る（表 T-283）。'
const UF_48_INSIDE_THE_CALL =
  '全画面表示の求めは、入口の入力（表 T-078 の `FT-1`）を受けたその呼び出しの中で、フレームを待たずに出すこと（MUST）'
const SF_3_SAME_REFERENCE = '何も変わらない出来事では、受け取った状態と同じ参照を返す。'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Document

const SCREEN: FrameEnvironment = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const key = (which: string): KeyInput => ({ kind: 'key', key: which, modifiers: { ...NO_MODIFIERS } })

// see SK-8, SK-13, SK-14, SK-15
const keyOf = (row: string): string => {
  const found = specTable('T-036').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  return bare(found.by['割当'] ?? '')
}

interface Asked {
  readonly insideReceiveInput: boolean
  readonly framesRunSinceTheInput: number
}

interface Stage {
  readonly loop: FrameLoop
  readonly requests: Asked[]
  readonly exits: Asked[]
  send(input: HumanInput): void
  runFrames(): void
  drawn(): readonly string[]
  views(): readonly ScreenView[]
  waitingFrames(): number
}

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
afterEach(() => {
  const scope = globalThis as { requestAnimationFrame?: unknown }
  if (realRaf === undefined) delete scope.requestAnimationFrame
  else scope.requestAnimationFrame = realRaf
})

// see UF-48, T-078
function stage(): Stage {
  const waiting: ((time: number) => void)[] = []
  let insideReceiveInput = false
  let framesRunSinceTheInput = 0
  ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (
    callback: (time: number) => void,
  ): number => {
    waiting.push(callback)
    return waiting.length
  }
  const requests: Asked[] = []
  const exits: Asked[] = []
  let isFullScreen = false
  const host: FullScreenHost = {
    isFullScreen: () => isFullScreen,
    requestFullScreen: () => {
      requests.push({ insideReceiveInput, framesRunSinceTheInput })
      return Promise.resolve()
    },
    exitFullScreen: () => {
      exits.push({ insideReceiveInput, framesRunSinceTheInput })
      isFullScreen = false
      return Promise.resolve()
    },
  }
  const drawn: string[] = []
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => void views.push(view),
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => null,
  }
  const loop = frameLoop(
    { showSvg: (svg: string) => void drawn.push(svg) },
    structuredClone(TEMPLATE),
    SCREEN,
    { surface, language: 'ja' },
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    host,
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
    requests,
    exits,
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
    drawn: () => drawn,
    views: () => views,
    waitingFrames: () => waiting.length,
  }
}

const lastView = (built: Stage): ScreenView => {
  const last = built.views()[built.views().length - 1]
  if (last === undefined) throw new Error('the surface was given no description')
  return last
}

describe('UF-48 -- the manuscript these cases are driven by', () => {
  it.each([
    ['UF-48 -- one road, one step, effects in the same call', UF_48_ONE_ROAD],
    ['UF-48 -- one Esc sends one rung (T-283)', UF_48_ESC_ONE_RUNG],
    ['UF-48 (MUST) -- the full-screen ask leaves inside the input call', UF_48_INSIDE_THE_CALL],
    ['SF-3 -- nothing changed, the same reference', SF_3_SAME_REFERENCE],
  ])('05-07 still says it, word for word: %s', (_name, clause) => {
    expect(DESIGN).toContain(clause)
  })
})

describe(`UF-48 (MUST) / SF-6 -- ${UF_48_INSIDE_THE_CALL}`, () => {
  it('SK-15: the effect the step returns (the ask to enter) runs inside receiveInput, before any frame', () => {
    const built = stage()
    built.send(key(keyOf('SK-15')))
    expect(built.requests, UF_48_ONE_ROAD).toEqual([{ insideReceiveInput: true, framesRunSinceTheInput: 0 }])
    expect(built.exits).toEqual([])
  })

  it('SK-15 pressed twice without the browser telling anything: each press is its own step, asked once each', () => {
    const built = stage()
    built.send(key(keyOf('SK-15')))
    built.runFrames()
    built.send(key(keyOf('SK-15')))
    expect(built.requests.length + built.exits.length, 'one ask per input, never two, never none').toBe(2)
    for (const one of [...built.requests, ...built.exits]) {
      expect(one, UF_48_INSIDE_THE_CALL).toEqual({ insideReceiveInput: true, framesRunSinceTheInput: 0 })
    }
  })
})

describe(`UF-48 / SF-7 -- ${UF_48_ONE_ROAD}`, () => {
  it('SK-14 pressed once moves the Command Palette exactly one step; pressed again it moves back', () => {
    const built = stage()
    const before = lastView(built).commandPalette === null
    built.send(key(keyOf('SK-14')))
    built.runFrames()
    expect(lastView(built).commandPalette === null, 'one press, one step').toBe(!before)
    built.send(key(keyOf('SK-14')))
    built.runFrames()
    expect(lastView(built).commandPalette === null, 'a second press, a second step').toBe(before)
  })

  it(`Esc spends one rung per press: ${UF_48_ESC_ONE_RUNG}`, () => {
    const built = stage()
    built.send(key(keyOf('SK-13')))
    built.runFrames()
    expect(lastView(built).openModal, 'premise: SK-13 put a surface up').not.toBeNull()
    const esc = key(keyOf('SK-8'))
    expect(built.loop.isBrowserDefaultStopped(esc), 'a surface stands, so Esc is consumed').toBe(true)
    built.send(esc)
    built.runFrames()
    expect(lastView(built).openModal, 'the surface rung was spent').toBeNull()
    expect(built.loop.isBrowserDefaultStopped(esc), 'nothing is left for the next Esc (IN-4a)').toBe(false)
  })
})

describe(`SF-3 / NFR-010 -- ${SF_3_SAME_REFERENCE}`, () => {
  it('with nothing pressed, no frame is owed and nothing is redrawn', () => {
    const built = stage()
    expect(built.waitingFrames(), 'the start-up frames have settled').toBe(0)
    const drawnBefore = built.drawn().length
    built.runFrames()
    expect(built.drawn().length).toBe(drawnBefore)
  })

  it('an input that changes nothing leaves the picture and the screen description as they were', () => {
    const built = stage()
    const svgBefore = built.drawn()[built.drawn().length - 1]
    const viewBefore = lastView(built)
    built.send(key('F20'))
    built.runFrames()
    const drawnAfter = built.drawn()
    expect(drawnAfter[drawnAfter.length - 1], 'NFR-010: nothing changed, nothing redrawn differently').toBe(svgBefore)
    expect(lastView(built), SF_3_SAME_REFERENCE).toEqual(viewBefore)
  })
})
