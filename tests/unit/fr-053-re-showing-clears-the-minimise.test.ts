// FR-053 (MUST) as the user ruled it on 2026-09-01: 「ヘッダーでコマンドパレット
// を再表示した時、コマンドパレットは標準サイズで表示しろ」 -- when S-99e goes from
// hidden to shown, S-200 goes back to not minimised.
//
// Unit under test: UF-48 of table T-075 (`frame-loop.ts`, component CP-25 of
// table T-062). It is the only layer that may hold a current value (LY-5 of
// table T-060), so S-200 is its to move and it is the side that answers what a
// press did.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). What was read of `src/`: the exported
// declarations of `frame-loop.ts` (`FrameEnvironment`, `FrameLoop`,
// `ScreenWiring`) and the one signature `frameLoop(surface, first, env,
// screen?)`; the exported types of `screen-renderer.ts` (`CommandPalette`,
// `ScreenPart`, `ScreenSurface`, `ScreenView`, `DisplayLanguage`) and of
// `input-command-translator.ts` (`HumanInput`, `KeyInput`, `PointerInput`,
// `InputModifiers`, `PointerButton`, `PointerPhase`). ⛔ NO FUNCTION BODY WAS
// READ.
//
// ⭐ THE HOST, THE FIXTURE DOCUMENT AND THE STAGE ARE COPIED from
// tests/unit/fr-072-the-two-entrances-to-the-panel.test.ts, which drives this
// same unit through the same seams.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-053   ⭐ 「`S-99e` が非表示から表示へ変わったとき、`S-200` を最小化して
//            いない側へ戻すこと（MUST）」 —— 利用者の裁定 2026-09-01.
//            ⭐ 「最小化と復帰は 1 つの入口（表 T-109 の `IC-75`）が同じ場所で
//            担い ... 既定は最小化していない」.
//            ⚠️ 「非表示（`S-99e`）とは別の状態である」 -- which is why the
//            clearing is one direction only, and why a case below holds the
//            minimise itself standing when nothing hid the palette.
//   T-109    IC-7 (`App Header`, 「コマンドパレットを表示する・非表示にする
//            （`S-99e`）」) and IC-75 (the minimise toggle, `S-200`).
//   T-036    SK-14, which moves the same row from the keyboard.
//   T-206    S-99e (表示状態、既定は表示) and S-200 (最小化しているか、既定は
//            最小化していない).
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  CommandPalette,
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// What the manuscript says, read at run time rather than copied
// ---------------------------------------------------------------------------

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const ENTRANCE_COLUMN = '何の入口か'
const SURFACE_COLUMN = '面'

/** S-99e -- whether the palette is shown. The join both sides spell. */
const PALETTE_SHOWN_SETTING = 'S-99e'
/** S-200 -- whether it is minimised. */
const PALETTE_MINIMISED_SETTING = 'S-200'

/** The one entrance of table T-109 that moves S-99e, and the surface it is on. */
const SHOW_HIDE = ((): { readonly row: string; readonly surface: string } => {
  const found = specTable('T-109').rows.filter((row) =>
    (row.by[ENTRANCE_COLUMN] ?? '').includes(PALETTE_SHOWN_SETTING),
  )
  if (found.length !== 1) {
    throw new Error(`table T-109 names ${PALETTE_SHOWN_SETTING} in ${found.length} rows`)
  }
  const row = found[0] as (typeof found)[number]
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
})()

/** The one entrance that moves S-200, and the surface it rides on. */
const MINIMISE = ((): { readonly row: string; readonly surface: string } => {
  const found = specTable('T-109').rows.filter((row) =>
    (row.by[ENTRANCE_COLUMN] ?? '').includes(PALETTE_MINIMISED_SETTING),
  )
  if (found.length !== 1) {
    throw new Error(`table T-109 names ${PALETTE_MINIMISED_SETTING} in ${found.length} rows`)
  }
  const row = found[0] as (typeof found)[number]
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
})()

/**
 * The key SK-14 of table T-036 assigns, read out of the row.
 *
 * ⭐ NOT TYPED: 「割当の綴りも入口の説明も写してはならない（MUST NOT）」 is stated
 * of that table's 入口 column, so the spelling has one home.
 */
const PALETTE_KEY = ((): string => {
  const cell = bare(rowOf('T-036', 'SK-14').by['割当'] ?? '')
  const first = cell.split('/')[0]?.trim() ?? ''
  if (first === '') throw new Error('table T-036 SK-14 states no assignment')
  return first
})()

/** FR-053's sentence these cases stand on, quoted from the manuscript. */
const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)
const FR_053_RE_SHOWING_CLEARS_IT =
  '`S-99e` が非表示から表示へ変わったとき、`S-200` を最小化していない側へ戻すこと（MUST）'

// ---------------------------------------------------------------------------
// The document these cases drive. Copied from
// tests/unit/fr-072-the-two-entrances-to-the-panel.test.ts.
// ---------------------------------------------------------------------------

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

function emptyDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: template.documentSettings,
    documentStamp: template.documentStamp,
    changeLog: [],
  } as unknown as Document
}

// ---------------------------------------------------------------------------
// The host UF-48 is given. Copied from the same file.
// ---------------------------------------------------------------------------

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of table T-060 puts the browser
 * in this layer. ⛔ Nothing in this fake decides anything about the palette.
 */
function host(): { readonly surface: { showSvg(svg: string): void }; runAnimationFrames(): void } {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language },
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// ---------------------------------------------------------------------------
// Spelling one happening
// ---------------------------------------------------------------------------

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const key = (which: string): KeyInput => ({
  kind: 'key',
  key: which,
  modifiers: { ...NO_MODIFIERS },
})

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left' as PointerButton,
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  /** The palette this frame described, or `null` while S-99e says it is hidden. */
  palette(): CommandPalette | null
  /** Press one entry of table T-109, aimed the way CS-2 freezes it at the press. */
  press(surface: string, entry: string): void
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, emptyDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  pen.runAnimationFrames()
  return {
    loop,
    send,
    palette: () => screen.last().commandPalette,
    press: (surface, entry) => {
      screen.drawAt({
        part: surface,
        entry: entry as any,
        format: null,
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      screen.drawAt(null)
    },
  }
}

/** Whether the frame just drawn says the palette is minimised. */
function isMinimised(built: Stage): boolean {
  const drawn = built.palette()
  if (drawn === null) throw new Error('the palette is hidden, so it says nothing about S-200')
  return drawn.isMinimised
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // GOES RED IF: a second entrance for either state is added to table T-109,
    // or SK-14 loses its assignment.
    expect(SHOW_HIDE.surface).toBe('App Header')
    expect(MINIMISE.surface).toBe('Command Palette')
    expect(SHOW_HIDE.row).not.toBe(MINIMISE.row)
    expect(PALETTE_KEY.length).toBeGreaterThan(0)
  })

  it('⛔ FR-053 still says that re-showing clears the minimise', () => {
    // ⭐ THE GROUND OF THIS WHOLE FILE, read rather than typed: if the ruling of
    // 2026-09-01 is ever reversed, this case says so in one line.
    expect(REQUIREMENTS).toContain(FR_053_RE_SHOWING_CLEARS_IT)
  })
})

// ===========================================================================
// The rule
// ===========================================================================

describe('FR-053 (MUST): S-99e going from hidden to shown clears S-200', () => {
  it('⭐ the palette starts shown and not minimised, as table T-206 states', () => {
    // GOES RED IF: either default is turned round, which would make every case
    // below start from a state the manuscript does not describe.
    const built = stage()
    expect(built.palette()).not.toBeNull()
    expect(isMinimised(built)).toBe(false)
  })

  it('⭐ the minimise entrance still minimises, and nothing else undoes it', () => {
    // ⚠️ THE CONTROL CASE. Without it, a unit that simply never minimised would
    // pass the case below.
    // GOES RED IF: IC-75 stops moving S-200, or something clears it on a frame
    // where the palette was never hidden.
    const built = stage()
    built.press(MINIMISE.surface, MINIMISE.row)
    expect(isMinimised(built)).toBe(true)
    built.send(pointer('down', 700, 400))
    built.send(pointer('up', 700, 400))
    expect(isMinimised(built), 'S-200 stands until something moves it').toBe(true)
  })

  it('⭐ showing it again from the header brings it back at its standard size', () => {
    // ⭐ THE USER'S RULING, MEASURED AT THE UNIT: 「ヘッダーでコマンドパレットを
    // 再表示した時、コマンドパレットは標準サイズで表示しろ」.
    // GOES RED IF: the two states go back to being independent, which is what
    // they were until 2026-09-01 -- the palette then came back minimised and
    // the only way out was to find the toggle on the band again.
    const built = stage()
    built.press(MINIMISE.surface, MINIMISE.row)
    expect(isMinimised(built)).toBe(true)
    built.press(SHOW_HIDE.surface, SHOW_HIDE.row)
    expect(built.palette(), 'the palette is hidden now').toBeNull()
    built.press(SHOW_HIDE.surface, SHOW_HIDE.row)
    expect(built.palette(), 'and shown again').not.toBeNull()
    expect(isMinimised(built)).toBe(false)
  })

  it('⭐ the key SK-14 assigns brings it back the same way', () => {
    // ⭐ THE REQUIREMENT IS WRITTEN ABOUT S-99e AND NOT ABOUT ONE ENTRANCE, and
    // table T-036's SK-14 moves the same row -- so the two entrances may not
    // answer differently.
    // GOES RED IF: the clearing is hung on the header press rather than on the
    // change of state.
    const built = stage()
    built.press(MINIMISE.surface, MINIMISE.row)
    built.send(key(PALETTE_KEY))
    expect(built.palette(), 'the palette is hidden now').toBeNull()
    built.send(key(PALETTE_KEY))
    expect(isMinimised(built)).toBe(false)
  })

  it('⛔ the entries come back with it, so the palette is whole again', () => {
    // ⚠️ 「標準サイズ」 is what the person sees, and what makes the palette its
    // standard size is that FR-053's entrance list is offered again -- 「入口の
    // 並びは最小化のあいだ出さない」 is the sentence the minimise stands on.
    // GOES RED IF: S-200 is cleared on the description while the entries are
    // still withheld, which would clear the flag and change nothing on screen.
    const built = stage()
    const whole = built.palette()?.groups.length ?? 0
    expect(whole, 'the palette offers entrances at all').toBeGreaterThan(0)
    built.press(MINIMISE.surface, MINIMISE.row)
    expect(built.palette()?.groups.length, 'minimised withdraws them').toBe(0)
    built.press(SHOW_HIDE.surface, SHOW_HIDE.row)
    built.press(SHOW_HIDE.surface, SHOW_HIDE.row)
    expect(built.palette()?.groups.length).toBe(whole)
  })
})
