// FR-020 (MUST, 利用者の裁定 2026-09-02, CR-335, ledger row D-196): 「同じ入口
// （表 T-109 の `IC-41`）が両方向を担うこと …… 透かしが出ているときは押すと面が
// 立ち、消えているときは押すと問わずに戻す」, together with the two MUST NOTs it
// stands between -- 「透かしを出し直す側は問わないこと（MUST）」 and
// 「`watermarkVisible` を文書に保存してはならない（MUST NOT）」.
//
// Unit under test: UF-48 of table T-075 (`frame-loop.ts`, component CP-25 of
// table T-062). S-144 is a row of table T-206 since 2026-09-02, and LY-5 of
// table T-060 leaves a current value with this layer.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⭐ THE HOST, THE FIXTURE DOCUMENT AND THE STAGE ARE COPIED from
// tests/unit/fr-053-re-showing-clears-the-minimise.test.ts, which drives this
// same unit through the same seams. ⚠️ tests/unit/fr-020-the-surface-that-asks-
// for-the-watermark-password.test.ts is the SURFACE's file; this one is the
// entrance's.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-020   the one entrance carrying both directions; the gate on the hiding
//            side alone; the match by SHA-256; and the MUST NOT against saving
//            S-144 in the document.
//   FR-029   「同じ機能の入口を増やさない」 -- why the way back may not have an
//            entrance of its own.
//   T-109    IC-41, and IC-75 beside it as the precedent FR-020 names.
//   T-103    U-60 `Watermark Unlock` -- the surface the hiding direction raises.
//   T-206    S-144 -- the row that left table T-202 on 2026-09-02, 既定は表示.
//   T-207    S-100 -- the default watermark unlock password.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
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

const SURFACE_COLUMN = '面'
const VALUE_COLUMN = '値'

/** IC-41 of table T-109, and the surface it is drawn on. */
const WATERMARK_ENTRY = ((): { readonly row: string; readonly surface: string } => {
  const row = rowOf('T-109', 'IC-41')
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
})()

/** U-60 of table T-103 -- the name S-99g carries while the question stands. */
const U_60 = bare(rowOf('T-103', 'U-60').cells[0] ?? '')

/** S-100 of table T-207 -- the default watermark unlock password. */
const DEFAULT_PASSWORD = bare(rowOf('T-207', 'S-100').by[VALUE_COLUMN] ?? '')

/** The two answers NT-7 gives, spelled as `display-words.json` spells the join. */
const PROCEED = 'proceed'

/** FR-020's sentences these cases stand on, quoted from the manuscript. */
const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)
const FR_020_ONE_ENTRANCE_BOTH_WAYS =
  '同じ入口（表 T-109 の `IC-41`）が両方向を担うこと（MUST）'
const FR_020_THE_WAY_BACK_IS_NOT_ASKED = '透かしを出し直す側は問わないこと（MUST）'
const FR_020_NOT_IN_THE_DOCUMENT =
  '`watermarkVisible` を文書に保存してはならない（MUST NOT）'

// ---------------------------------------------------------------------------
// The document these cases drive.
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
// The host UF-48 is given.
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
 * in this layer. ⛔ Nothing in this fake decides anything about the watermark.
 */
function host(): {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
} {
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

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// ---------------------------------------------------------------------------
// Spelling one happening
// ---------------------------------------------------------------------------

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

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
  view(): ScreenView
  /** The name S-99g carries this frame, or null while no surface stands. */
  surface(): string | null
  /** Press one entry of table T-109, aimed the way CS-2 freezes it at the press. */
  pressEntry(surface: string, entry: string): void
  /**
   * Press one of NT-7's two word buttons, and wait for the digest.
   *
   * ⚠️ AWAITED, WHICH THE ENTRY PRESSES ARE NOT: FR-020 matches by SHA-256 and
   * the environment answers that asynchronously, so the frame that carries the
   * outcome is not the frame the press ran in.
   */
  answer(which: string): Promise<void>
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
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
  const wiring: ScreenWiring = {
    surface,
    language,
    // FR-020: what stands in the masked field U-60 draws. ⭐ The default of
    // table T-207, so the match below is the one the manuscript describes.
    readWatermarkUnlockAnswer: () => DEFAULT_PASSWORD,
  }
  const loop = frameLoop(pen.surface, emptyDocument(), SCREEN, wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  const drawn = (at: ScreenPart | null): void => {
    part = at
  }
  pen.runAnimationFrames()
  const last = (): ScreenView => {
    const view = views[views.length - 1]
    if (view === undefined) throw new Error('the surface was given no description')
    return view
  }
  return {
    loop,
    view: last,
    surface: () => last().openModal?.surface ?? null,
    pressEntry: (on, entry) => {
      drawn({
        part: on,
        entry: entry as any,
        format: null,
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      drawn(null)
    },
    answer: async (which) => {
      drawn({
        part: U_60,
        entry: null,
        format: null,
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
        confirmationAnswer: which,
      } as any)
      send(pointer('down', 700, 400))
      send(pointer('up', 700, 400))
      drawn(null)
      // ⚠️ TWO TURNS OF THE MACROTASK QUEUE, not one: the digest is a promise of
      // the host's and the frame it asks for is scheduled after it settles.
      await new Promise((done) => setTimeout(done, 0))
      await new Promise((done) => setTimeout(done, 0))
      pen.runAnimationFrames()
    },
  }
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-020 still gives one entrance both directions, ungated on the way back', () => {
    // GOES RED IF: the ruling of 2026-09-02 is reversed, or the way back gains
    // a gate of its own.
    expect(REQUIREMENTS).toContain(FR_020_ONE_ENTRANCE_BOTH_WAYS)
    expect(REQUIREMENTS).toContain(FR_020_THE_WAY_BACK_IS_NOT_ASKED)
  })

  it('⛔ FR-020 still keeps `watermarkVisible` out of the document', () => {
    expect(REQUIREMENTS).toContain(FR_020_NOT_IN_THE_DOCUMENT)
  })

  it('⭐ IC-41 is on the palette, and U-60 and S-100 are still what they were', () => {
    expect(WATERMARK_ENTRY.surface).toBe('Command Palette')
    expect(U_60).toBe('Watermark Unlock')
    expect(DEFAULT_PASSWORD.length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// The rule
// ===========================================================================

describe('FR-020 (MUST): one entrance, and it turns the watermark both ways', () => {
  it('⭐ showing: the press raises U-60 and asks', async () => {
    // ⚠️ THE CONTROL. Without it, a unit that never raised the surface at all
    // would pass every case below.
    // GOES RED IF: the hiding direction stops raising the question, which is
    // the gate FR-020 (MUST) stands on that side.
    const built = stage()
    expect(built.surface()).toBeNull()
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    expect(built.surface()).toBe(U_60)
  })

  it('⛔ hidden: the press puts it back and does NOT ask', async () => {
    // ⭐⭐ THE RULING OF 2026-09-02, MEASURED AT THE UNIT: 「消えているときは押す
    // と問わずに戻す」 -- and 「透かしを出し直す側は問わないこと（MUST）」.
    // GOES RED IF: the entrance is left one-way (the press raises U-60 again,
    // which is a question the requirement forbids on this side), or if it is
    // made a symmetric toggle of the SURFACE rather than of S-144.
    const built = stage()
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    await built.answer(PROCEED)
    expect(built.surface(), 'the answered surface is gone').toBeNull()
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    expect(built.surface(), 'the way back is never asked').toBeNull()
  })

  it('⛔ and it is not a symmetric toggle: the NEXT press asks again', async () => {
    // ⭐ 「向きで振る舞いが変わることと、対称な切り替えは別である」. Once the
    // watermark is back, the entrance is on the hiding side again and the gate
    // stands.
    // GOES RED IF: the direction is read once and remembered, or the arm is
    // written as "close whatever surface stands".
    const built = stage()
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    await built.answer(PROCEED)
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    expect(built.surface()).toBe(U_60)
  })

  it('⛔⛔ neither direction touches the document (MUST NOT)', async () => {
    // ⭐⭐ THE HALF THAT MATTERS MOST, and the one CR-335 was written for: a
    // hiding saved into the document lets one person who knows the password
    // take the trail off every reader downstream, for good.
    // ⚠️ `hasUnsavedEdits` IS THE SECOND READING and not a repetition: a write
    // that landed and was then undone would leave the document equal and the
    // flag raised.
    // GOES RED IF: `setElementVisible` comes back on this road -- which is also
    // what would put the hiding into the undo history.
    const built = stage()
    const before = JSON.stringify(built.loop.document())
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    await built.answer(PROCEED)
    built.pressEntry(WATERMARK_ENTRY.surface, WATERMARK_ENTRY.row)
    expect(JSON.stringify(built.loop.document())).toBe(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })
})
