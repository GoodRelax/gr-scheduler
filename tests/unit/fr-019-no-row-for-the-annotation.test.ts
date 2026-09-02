// FR-019 (MUST, 利用者の裁定 2026-09-02, CR-334, ledger row D-193): 「指す
// `TaskGroup` が無い縦位置で注記を置こうとしたときは、作らずに理由を告げること」
// -- 「作法は `FR-029` に従い、理由は 表 T-233 の `RS-44` とする」.
//
// Unit under test: UF-48 of table T-075 (`frame-loop.ts`, component CP-25 of
// table T-062). It is the one place in `src/` that spells a row of table T-233
// (rule 03 section 1), so the join between the situation the translator
// measured and the row the reader is told with is this unit's.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⭐ THE HOST, THE FIXTURE DOCUMENT AND THE STAGE ARE COPIED from
// tests/unit/fr-053-re-showing-clears-the-minimise.test.ts, which drives this
// same unit through the same seams.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-019   the refusal, its 作法 and its 理由; and 「行を 1 つ作って載せては
//            ならない（MUST NOT）」.
//   FR-029   「押されたときに限り、行えない理由を通知すること（MUST）」 and
//            「当たる行があるのに落ち先を運んではならない（MUST NOT）」.
//   T-233    RS-44 -- 「注記を置こうとした所に、指す行が無い」, manner NT-1;
//            and RS-15, the fallback that MUST NOT be carried in its place.
//   T-037    NT-1 -- the manner a refused input is told in.
//   T-038    the one dictionary FR-038 keeps the words in, in both display
//            languages.
//   T-109    IC-35 -- the entrance that arms AR-5.
//   T-023b   AR-5, and 「構えは持続すること（MUST）」.
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
  Notice,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
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

const SURFACE_COLUMN = '面'
const ARM_COLUMN = '構え'

/** AR-5 of table T-023b -- the arm FR-019 places a comment box from. */
const COMMENT_BOX_ARM = 'AR-5'

/** The one entrance of table T-109 whose 構え column names AR-5. */
const ARMING_ENTRY = ((): { readonly row: string; readonly surface: string } => {
  const found = specTable('T-109').rows.filter(
    (row) => bare(row.by[ARM_COLUMN] ?? '') === COMMENT_BOX_ARM,
  )
  if (found.length !== 1) {
    throw new Error(`table T-109 arms ${COMMENT_BOX_ARM} from ${found.length} entrances`)
  }
  const row = found[0] as (typeof found)[number]
  return { row: row.id, surface: bare(row.by[SURFACE_COLUMN] ?? '') }
})()

/** The words FR-038's one dictionary holds for one row of table T-233. */
const wordsOf = (rowId: string): { readonly ja: string; readonly en: string } => {
  const found = (displayWords as any).reasons.find((one: any) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${rowId}`)
  return found.text
}

/** RS-44 -- 「注記を置こうとした所に、指す行が無い」. */
const RS_44 = 'RS-44'
/** RS-15 -- the fallback FR-029 (MUST NOT) forbids where a row of its own fits. */
const RS_15 = 'RS-15'

/** The manner table T-233 writes RS-44 against. */
const RS_44_MANNER = ((): string => {
  const row = specTable('T-233').rows.find((one) => one.id === RS_44)
  if (row === undefined) throw new Error('table T-233 no longer has row RS-44')
  return bare(row.cells[1] ?? '')
})()

/** FR-019's sentence these cases stand on, quoted from the manuscript. */
const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)
const FR_019_REFUSES_AND_SAYS_WHY =
  '指す `TaskGroup` が無い縦位置で置こうとしたときは、作らずに理由を告げること（MUST）'

// ---------------------------------------------------------------------------
// The document these cases drive -- one with no row at all, so that every
// point in the `Row Area` is a point with no `TaskGroup` under it.
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
 * in this layer. ⛔ Nothing in this fake decides anything about a telling.
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

function screenPane(language: DisplayLanguage): ScreenPane {
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
  view(): ScreenView
  notices(): readonly Notice[]
  /** Press one entry of table T-109, aimed the way CS-2 freezes it at the press. */
  pressEntry(surface: string, entry: string): void
  /** Press a bare point of the schedule -- no entry, no surface. */
  pressGround(x: number, y: number): void
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, emptyDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  pen.runAnimationFrames()
  return {
    loop,
    send,
    view: () => screen.last(),
    notices: () => screen.last().notices,
    pressEntry: (surface, entry) => {
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
    pressGround: (x, y) => {
      screen.drawAt(null)
      send(pointer('down', x, y))
      send(pointer('up', x, y))
    },
  }
}

/** A point inside the `Row Area` of a document that has no rows at all. */
const GROUND = { x: 700, y: 400 }

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-019 still refuses the placement and still says why', () => {
    // GOES RED IF: the ruling of 2026-09-02 is reversed, which would put the
    // whole of this file back to the silence CR-334 was written against.
    expect(REQUIREMENTS).toContain(FR_019_REFUSES_AND_SAYS_WHY)
  })

  it('⭐ table T-233 still writes RS-44 against NT-1, and the words are there', () => {
    // ⛔ THE MANNER IS THE HALF THAT IS EASY TO GET WRONG. CR-334 says why NT-1
    // and not NT-3a: the person's input was not accepted, and nothing of ours
    // failed. GOES RED IF: the manner column moves.
    expect(RS_44_MANNER).toBe('NT-1')
    expect(wordsOf(RS_44).ja.length).toBeGreaterThan(0)
    expect(wordsOf(RS_44).en.length).toBeGreaterThan(0)
  })

  it('⭐ IC-35 is the one entrance that arms AR-5', () => {
    // GOES RED IF: a second entrance is given the same arm, which FR-029
    // (MUST NOT) forbids -- and which would make the press below ambiguous.
    expect(ARMING_ENTRY.row).toBe('IC-35')
    expect(ARMING_ENTRY.surface).toBe('Command Palette')
  })
})

// ===========================================================================
// The rule
// ===========================================================================

describe('FR-019 (MUST): an annotation with no row under it is refused, and told why', () => {
  it('⛔ the control: with nothing armed, the same press tells nothing', () => {
    // ⚠️ WITHOUT THIS, A UNIT THAT TOLD RS-44 ON EVERY PRESS WOULD PASS BELOW.
    // FR-029 (MUST) has the reason 「押されたときに限り」, and this press is not
    // an attempt to place anything.
    const built = stage()
    built.pressGround(GROUND.x, GROUND.y)
    expect(built.notices().length).toBe(0)
  })

  for (const language of ['ja', 'en'] as const) {
    it(`⭐ tells RS-44's own words in ${language}, and NOT RS-15's`, () => {
      // ⛔⛔ THE DEFECT THIS CASE IS WRITTEN FOR. With no entry for the
      // situation, the row read out is `undefined`, the dictionary answers with
      // its fallback, and the reader is told RS-15 -- 「操作を終えられませんで
      // した／もう一度行ってください」. That is a lie about a press that CAN
      // never act there, and FR-029 (MUST NOT) forbids carrying the fallback
      // where a row of its own fits.
      // GOES RED IF: `NOTICE_REASON_OF_SPENT_ENTRANCE` loses its entry for the
      // situation FR-019's refusal travels on.
      const built = stage(language)
      built.pressEntry(ARMING_ENTRY.surface, ARMING_ENTRY.row)
      built.pressGround(GROUND.x, GROUND.y)
      const told = built.notices()
      expect(told.length, 'FR-029 (MUST): the press is told a reason').toBe(1)
      expect(told[0]?.text).toBe(wordsOf(RS_44)[language])
      expect(told[0]?.text).not.toBe(wordsOf(RS_15)[language])
    })
  }

  it('⭐ tells it in NT-1s manner, which is the manner table T-233 writes it against', () => {
    // ⛔ NT-3a WOULD SAY SOMETHING UNTRUE: that manner is the failure of an
    // operation, and nothing here failed -- the place was not one an annotation
    // can stand on.
    // GOES RED IF: the pair in `NOTICE_MANNER_OF_REASON` is written the other
    // way, which no compiler can catch.
    const built = stage()
    built.pressEntry(ARMING_ENTRY.surface, ARMING_ENTRY.row)
    built.pressGround(GROUND.x, GROUND.y)
    expect(built.notices()[0]?.manner).toBe('NT-1')
  })

  it('⛔ creates nothing -- 行を 1 つ作って載せてはならない (MUST NOT)', () => {
    // ⭐ THE OTHER HALF OF THE SAME RULING, and the half FR-001's neighbouring
    // sentence could have been borrowed for. A row minted for an annotation
    // would carry neither a name nor a 導出元 (AT-54, FR-058).
    // GOES RED IF: the refusal is turned into FR-001's answer for a Task.
    const built = stage()
    const before = JSON.stringify(built.loop.document())
    built.pressEntry(ARMING_ENTRY.surface, ARMING_ENTRY.row)
    built.pressGround(GROUND.x, GROUND.y)
    expect(JSON.stringify(built.loop.document())).toBe(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })
})
