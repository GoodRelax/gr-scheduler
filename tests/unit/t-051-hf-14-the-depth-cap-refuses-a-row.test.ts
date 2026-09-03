// 表 T-051 の `HF-14` (MUST, 利用者の裁定 2026-09-03, CR-340 then CR-348,
// ledger row D-206): the entrance that adds a child row is drawn FAINT on a row
// that has reached `FR-085`'s depth cap, and a press on it is answered with a
// reason instead of a row.
//
// ⚠️ THE ROW WAS REWRITTEN ON 2026-09-04 (CR-348) AND THIS FILE FOLLOWED IT.
// 「打ち込み口を出さずに」 became 「行を立てずに」 because the field it named was
// withdrawn from the same row: an ordinary press now raises the row with a
// default name and opens its properties panel (the `FR-085` rename road), so
// there is no name field left to withhold -- what the refusal withholds is the
// ROW. ⛔ Nothing in this file may be written from the withdrawn model.
//
// ⭐ THE THREE SENTENCES THIS FILE IS WRITTEN FROM, verbatim out of 表 T-051's
// `HF-14` (docs/spec/01-04-requirements.md):
//
//   ⛔ 「**その行の深さが `FR-085` の上限に達しているときは、`FR-029` に従って薄く
//    描くこと（MUST）**」 —— ⭐ 「**`HF-13` が「開ける直下の子が 1 つも無いとき」に
//    採るのと同じ形である。**」
//   ⛔⛔ 「**薄いまま押されたときは、行を立てずに理由を告げること（MUST）。理由は
//    表 T-233 の `RS-46` とすること（MUST）**」
//   ⛔ 「**行を立ててからパネルを開き、そこで拒んではならない（MUST NOT）**」 ——
//    「**押した人には、名づけを求められたうえで捨てられたようにしか見えない。**」
//
// and out of 表 T-233:
//
//   「| RS-46 | **これ以上深い段には行を足せない** | `NT-3a` | `FR-085` |」
//
// ⛔ AND THE ROW IT MUST NOT BE CONFUSED WITH, which CR-340 names outright:
//   「| RS-38 | 深さの上限に達しているので、これ以上深い段へは動かせない | `NT-1` |
//    `FR-085` |」 —— 「⛔ **`RS-38`（動かせない）を流用してはならない** —— **あちらは
//   `HF-15` の移動のためであり、足す押しには真でない。**」
//
// ---------------------------------------------------------------------------
// Unit under test: UF-48 of 表 T-075 (`frame-loop.ts`, component CP-25 of
// 表 T-062) -- the layer that turns a press into a raised telling and hands the
// frame that carries it to the surface.
//
// ⚠️ Chapter 9 admits no Unit as a TEST_LEVEL, so these cases have no node in
// the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). ⛔ NO FILE UNDER src/ WAS OPENED. The host, the
// fake surface and the fixture are copied from
// tests/unit/fr-029-the-reason-a-press-carries.test.ts and
// tests/unit/t-015-t-051-the-four-folding-controls.test.ts, which drive this
// same unit through the same seams; `startup-template.json` is a generated
// document and is read as data.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   1. WHAT AN ORDINARY (UNREFUSED) PRESS RAISES. 「既定の名前で行を立てること
//      （MUST）。その行のプロパティパネルを出し…（MUST）」 is HF-14's other half, and
//      it belongs to a file about the ordinary press -- this one is named for
//      the cap. ⛔ The old note here said the withheld half could not be read at
//      this seam because it was a NAME FIELD; CR-348 withdrew that field, and
//      what the refusal withholds is now the ROW and the PANEL, both of which
//      this seam carries (`FrameLoop.document()` and
//      `ScreenView.propertiesPanel`) and both of which are asserted below.
//   1b. WHETHER THE DETAIL TIER WAS OPENED. 「立てた行が…詳しさの段（`FR-018`）で
//      落ちる深さになるときは、その行が描かれるまで詳しさの段を開くこと（MUST）」 is a
//      2026-09-04 MUST about the press that SUCCEEDS. ⛔ It is not written here:
//      no press in this file raises a row, and choosing the seam it is read
//      through is the implementer's, not this file's.
//   2. HOW FAINT IS DRAWN. That is the surface's, and
//      tests/unit/uf-72-screen-part.test.ts already holds `canOpenOneLevel`'s
//      faintness there. Here the question is the one only this unit can answer:
//      whether the row AT the cap is described to the surface as having nothing
//      to add, while a shallower row is not.

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
  RowTitle,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// The manuscripts, read at run time rather than copied (Chapter 1.9)
// ===========================================================================

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** Everything one row of a table says, as one string. */
const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** 表 T-103's settled English name for U-22 -- the 面 a row's controls answer as. */
const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

/**
 * The entrance 表 T-109 gives one rule of 表 T-051.
 *
 * ⭐ THE JOIN IS THE SPECIFICATION'S OWN: 表 T-109's 正 column names the rule
 * that owns each entrance, so a case that means 「HF-14's control」 says so and
 * is told which icon that is, instead of typing `IC-91` and going quiet the day
 * the roster is renumbered.
 */
function entranceFor(rule: string): string {
  const onThePanel = specTable('T-109').rows.filter(
    (one) => bare(one.by['面'] ?? '') === ROW_TITLE_PANEL,
  )
  const found = onThePanel.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  const first = found[0]
  if (found.length !== 1 || first === undefined) {
    throw new Error(`表 T-109 gives ${rule} ${found.length} entrances on the panel, not one`)
  }
  return first.id
}

/** `HF-14`'s entrance -- the one that adds a row under this one. */
const ADD_CHILD_ROW = entranceFor('HF-14')

/** The manner 表 T-233 writes one reason against. */
const mannerOf = (reason: string): string => bare(rowOf('T-233', reason).by['作法'] ?? '')

/** RS-46 -- 「これ以上深い段には行を足せない」. */
const RS_46 = 'RS-46'
/** RS-38 -- the MOVE at the cap, which CR-340 forbids reusing for the ADD. */
const RS_38 = 'RS-38'
/** RS-15 -- FR-029's landing place for a reason 表 T-233 has no row for. */
const RS_15 = 'RS-15'

interface ReasonWords {
  readonly rowId: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
  readonly nextStep?: Readonly<Record<DisplayLanguage, string>>
}

/**
 * FR-038's dictionary, as the MANUSCRIPT keeps it.
 *
 * ⭐ docs/spec/_source/ is where the words are written and `src/` holds what is
 * printed from it; rule 04 section 1 has these cases driven from docs/spec.
 * tests/contract/t-233-reason-words-tell-the-row.contract.test.ts is what holds
 * the two copies together and holds each word to the row it is carried for.
 */
const REASON_WORDS: readonly ReasonWords[] = (
  JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons: ReasonWords[] }
).reasons

function wordsFor(rowId: string): ReasonWords {
  const found = REASON_WORDS.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`FR-038's dictionary holds no words for ${rowId}`)
  return found
}

/** S-125 -- `maxGroupDepth`, the cap `FR-085` states and 表 T-211 carries. */
const MAX_GROUP_DEPTH = ((): number => {
  const value = SETTINGS_DEFAULTS['maxGroupDepth']
  if (typeof value !== 'number') throw new Error('SETTINGS_DEFAULTS.maxGroupDepth is not a number')
  return value
})()

// ===========================================================================
// The document these cases drive: one chain, exactly as deep as S-125 allows.
// ===========================================================================

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

/** A `TaskGroup.id` -- AT-51 types the column as a UUID. */
const uuidOf = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/**
 * One chain of rows, the root at depth 1 and the last at exactly `S-125`.
 *
 * ⭐ THE DEPTH IS COUNTED FROM THE ROOT, which S-125 fixes and
 * tests/contract/document-invariants.contract.test.ts reads the same way. So
 * the last link is the row 「その行の深さが `FR-085` の上限に達している」 names, and
 * the one before it is the control: it is deep, and it may still take a child.
 */
const CHAIN: readonly { readonly id: string; readonly depth: number }[] = Array.from(
  { length: MAX_GROUP_DEPTH },
  (_unused, index) => ({ id: uuidOf(index + 1), depth: index + 1 }),
)

const linkAt = (depth: number): string => {
  const found = CHAIN.find((one) => one.depth === depth)
  if (found === undefined) throw new Error(`the chain has no link at depth ${depth}`)
  return found.id
}

/** The row that has reached the cap, and the one a step above it. */
const AT_THE_CAP = linkAt(MAX_GROUP_DEPTH)
const ONE_ABOVE_THE_CAP = linkAt(MAX_GROUP_DEPTH - 1)

function chainDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: CHAIN.map((one, index) => ({
        id: one.id,
        parentId: index === 0 ? null : (CHAIN[index - 1] as (typeof CHAIN)[number]).id,
        label: `depth ${one.depth}`,
        derivedFromTaskUid: null,
        order: index,
        isCollapsed: false,
        isHidden: false,
        color: null,
        height: null,
      })),
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

// ===========================================================================
// The host UF-48 is given.
// ===========================================================================

/** The px figure one settings row states in its 既定 column. */
const px = (table: string, id: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(rowOf(table, id).by['既定'] ?? '')
  if (found === null) throw new Error(`${id} states no number in its 既定 column`)
  return Number(found[0])
}

/**
 * The height 表 T-051 の `HF-1`'s 2 x 2 lattice takes, as far as docs/spec pins
 * it down: two entrances stacked, each `S-138 + S-141 × 2` tall.
 *
 * ⭐ COMPOSED FROM 表 T-206 AND NEVER TYPED. `LF-3` and `HF-19` (利用者の裁定
 * 2026-09-03) make it the floor under a row's band, and the host is what
 * measures it -- so a case that drives the loop has to hand one in.
 * ⚠️ Nothing in this file depends on the figure; it is here so the environment
 * is a lawful one, and tests/unit/lf-3-hf-19-a-row-is-never-shorter-than-its-
 * controls.test.ts is where the floor itself is asserted.
 */
const ROW_CONTROLS_TALL = (px('T-206', 'S-138') + px('T-206', 'S-141') * 2) * 2

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  rowControlsHeightPx: ROW_CONTROLS_TALL,
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Vitest runs under
 * node with no `requestAnimationFrame`, and LY-5 of 表 T-060 puts the browser in
 * this layer. ⛔ Nothing in this fake decides anything about a telling.
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

/** Somewhere inside the surface the fake answers for. */
const ON_THE_SURFACE = { x: 80, y: 120 }

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  /** Aim one entrance of one row and press it -- CS-2 freezes the aim at the press. */
  press(entry: string, groupId: string): void
  titleOf(groupId: string): RowTitle
  notices(): ScreenView['notices']
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, chainDocument(), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  return {
    loop,
    screen,
    send,
    press: (entry, groupId) => {
      screen.drawAt({
        part: ROW_TITLE_PANEL,
        entry: entry as any,
        format: null,
        rowGroupId: groupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
      // IN-1 settles a pointer operation on release, so a press is down then up.
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      screen.drawAt(null)
    },
    titleOf: (groupId) => {
      const panel = screen.last().rowTitlePanel
      const found = [...panel.pinnedTitles, ...panel.titles].find((one) => one.groupId === groupId)
      if (found === undefined) throw new Error(`the panel drew no title for ${groupId}`)
      return found
    },
    notices: () => screen.last().notices,
  }
}

/** How many rows the document holds -- the number a refused press may not move. */
const rowCount = (built: Stage): number =>
  ((built.loop.document().schedule as any).taskGroups as readonly unknown[]).length

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST A COLUMN WOULD MAKE EVERY CASE BELOW
    // AGREE WITH ANYTHING -- rule 04 section 2.
    expect(ROW_TITLE_PANEL).toBe('Row Title Panel')
    expect(ADD_CHILD_ROW).toBe('IC-91')
    expect(MAX_GROUP_DEPTH, 'S-125 no longer leaves room for a row above the cap').toBeGreaterThan(1)
    expect(CHAIN).toHaveLength(MAX_GROUP_DEPTH)
  })

  it('⛔ HF-14 still draws the capped entrance faint and still tells RS-46 when it is pressed', () => {
    // The three sentences the refusal path stands on, pinned so that a
    // manuscript which went back on any of them fails HERE rather than in a
    // case that would then be asserting a rule nobody holds.
    expect(says('T-051', 'HF-14')).toContain(
      'その行の深さが `FR-085` の上限に達しているときは、`FR-029` に従って薄く描くこと（MUST）',
    )
    expect(says('T-051', 'HF-14')).toContain(
      '薄いまま押されたときは、行を立てずに理由を告げること（MUST）。理由は 表 T-233 の `RS-46` とすること（MUST）',
    )
    // ⛔⛔ CR-348's own MUST NOT, and the reason the case below reads the row
    // count and the panel rather than the reason alone: raising the row and
    // refusing inside the panel would tell RS-46 and still be forbidden.
    expect(says('T-051', 'HF-14')).toContain(
      '行を立ててからパネルを開き、そこで拒んではならない（MUST NOT）',
    )
  })

  it('⛔ HF-14 no longer holds the model that was withdrawn on 2026-09-04', () => {
    // ⚠️ THE GUARD THAT KEEPS THIS FILE HONEST. CR-348 withdrew three MUSTs
    // (「名前は空で立てる」「既定の名を与えてはならない」「空のまま確定されたら立てない」)
    // and the row now says the opposite: 「**押された瞬間に、既定の名前で行を立てる
    // こと（MUST）。その行のプロパティパネルを出し、名前の欄で名づけさせること（MUST）**」.
    // ⛔ If a case in this file ever reads an empty name field or an empty-name
    // confirmation again, this is what says it is reading a rule nobody holds.
    expect(says('T-051', 'HF-14')).toContain(
      '押された瞬間に、既定の名前で行を立てること（MUST）。その行のプロパティパネルを出し、名前の欄で名づけさせること（MUST）',
    )
    expect(says('T-051', 'HF-14')).not.toContain('打ち込み口')
  })

  it('⛔ 表 T-233 still holds RS-46, against NT-3a, and its words are in the dictionary', () => {
    // ⭐ THE MANNER IS THE HALF THAT IS EASY TO GET WRONG, and CR-340 argued it:
    // the reader asked for something the tool cannot do, and a next step exists
    // (「もっと浅い行に足してください」), so NT-3a and not NT-1.
    expect(rowOf('T-233', RS_46).by['場面']).toContain('これ以上深い段には行を足せない')
    expect(mannerOf(RS_46)).toBe('NT-3a')
    expect(bare(rowOf('T-233', RS_46).by['正'] ?? '')).toBe('FR-085')
    for (const language of ['ja', 'en'] as const) {
      expect(wordsFor(RS_46).text[language].length, language).toBeGreaterThan(0)
      expect(wordsFor(RS_46).nextStep?.[language].length ?? 0, language).toBeGreaterThan(0)
    }
  })

  it('⛔ RS-38 is still the MOVE and not the ADD, so the two cannot be used for each other', () => {
    // ⭐ CR-340: 「⛔ **`RS-38`（動かせない）を流用してはならない** —— **あちらは
    // `HF-15` の移動のためであり、足す押しには真でない。**」 Both cite FR-085, so
    // the ONLY thing that parts them is the 場面 -- which is why it is read here.
    expect(rowOf('T-233', RS_38).by['場面']).toContain('これ以上深い段へは動かせない')
    expect(wordsFor(RS_38).text.ja).not.toBe(wordsFor(RS_46).text.ja)
  })

  it('⛔ FR-029 still ties the faint drawing and the telling into one rule', () => {
    expect(REQUIREMENTS).toContain('押されたときに限り、行えない理由を通知すること（MUST）')
    expect(REQUIREMENTS).toContain('当たる行があるのに落ち先を運んではならない（MUST NOT）')
  })
})

// ===========================================================================
// The rule
// ===========================================================================

describe('表 T-051 HF-14 (MUST): a row at FR-085s cap has no child to add', () => {
  it('⛔ the row AT the cap is described as having nothing to add, and the one above it is not', () => {
    // ⭐ 「その行の深さが `FR-085` の上限に達しているときは、`FR-029` に従って薄く描く
    // こと（MUST）」. Faintness is drawn by the surface; what this unit owes is the
    // answer the surface draws FROM -- and 「`HF-13` が「開ける直下の子が 1 つも無い
    // とき」に採るのと同じ形である」 is what says the two are read the same way.
    // ⛔ THE CONTROL IS THE HALF THAT MAKES THIS A TEST: a unit that answered
    // `false` for every row would pass the first expectation alone.
    const built = stage()
    expect(
      (built.titleOf(ONE_ABOVE_THE_CAP) as any).canAddChildRow,
      `the row at depth ${MAX_GROUP_DEPTH - 1} may still take a child, so it is not faint`,
    ).toBe(true)
    expect(
      (built.titleOf(AT_THE_CAP) as any).canAddChildRow,
      `the row at depth ${MAX_GROUP_DEPTH} has reached S-125, so HF-14 (MUST) draws it faint`,
    ).toBe(false)
  })

  for (const language of ['ja', 'en'] as const) {
    it(`⭐ a press at the cap is told RS-46's own words, and NOT RS-38's or RS-15's (${language})`, () => {
      // ⛔⛔ THE DEFECT THIS CASE IS WRITTEN FOR, measured in CR-340 and still
      // written into HF-14: 「⚠️ **実測（2026-09-03、出荷ビルド）: 深さ 5 で入口は
      // 薄いまま押せ、押した先は開き、確定しても行は増えず通知も出なかった。**」
      // ⇒ 「**押した人には、名づけを求められたうえで捨てられたようにしか見えない。**」
      const built = stage(language)

      built.press(ADD_CHILD_ROW, AT_THE_CAP)

      const texts = built.notices().map((one) => one.text)
      expect(texts, 'FR-029 (MUST): the press is told a reason').toContain(
        wordsFor(RS_46).text[language],
      )
      // ⛔ 「当たる行があるのに落ち先を運んではならない（MUST NOT）」 -- FR-029.
      expect(texts, 'RS-38 is the MOVE at the cap, not the ADD').not.toContain(
        wordsFor(RS_38).text[language],
      )
      expect(texts, 'RS-15 is for a reason 表 T-233 has no row for').not.toContain(
        wordsFor(RS_15).text[language],
      )
    })
  }

  it('⭐ and it is told in NT-3as manner, with the next step that manner requires', () => {
    // 表 T-037 `NT-3a`: 「次に取れる手段を添えること（MUST）—— … 失敗したことだけを
    // 伝えて手段を示さない通知を出してはならない（MUST NOT）」. The manner is read off
    // 表 T-233's 作法 column, never typed.
    const built = stage()
    built.press(ADD_CHILD_ROW, AT_THE_CAP)
    const told = built.notices().filter((one) => one.text === wordsFor(RS_46).text.ja)
    expect(told.length, 'nothing carrying RS-46 arrived').toBeGreaterThan(0)
    for (const notice of told) {
      expect(notice.manner).toBe(mannerOf(RS_46))
      expect(notice.nextSteps).toContain(wordsFor(RS_46).nextStep?.ja)
    }
  })

  it('⛔ the refused press leaves the document exactly as it was', () => {
    // ⭐ 「**薄いまま押されたときは、行を立てずに理由を告げること（MUST）**」. Since
    // CR-348 this is the WHOLE of that half, and it is readable right here: the
    // row is what the refusal withholds, so the row count is the assertion.
    const built = stage()
    const before = JSON.stringify(built.loop.document())
    const rowsBefore = rowCount(built)

    built.press(ADD_CHILD_ROW, AT_THE_CAP)

    expect(rowCount(built), 'a row was added past S-125').toBe(rowsBefore)
    expect(JSON.stringify(built.loop.document())).toBe(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
    // ⛔ 「**行を立ててからパネルを開き、そこで拒んではならない（MUST NOT）**」 -- the
    // ordinary press opens the properties panel (`UF-64`), so a refusal that
    // opened it too would be the very shape CR-348 forbids.
    expect(
      built.screen.last().propertiesPanel,
      'the capped press opened the panel it was refused in',
    ).toBeNull()
  })

  it('⛔ the control: the same press one level above the cap is NOT answered with a reason', () => {
    // ⚠️ WITHOUT THIS, A UNIT THAT TOLD RS-46 ON EVERY PRESS OF IC-91 WOULD PASS
    // EVERY CASE ABOVE. FR-029 (MUST) ties the telling to an entrance that can
    // do nothing, and one level above the cap the entrance has work.
    const built = stage()

    built.press(ADD_CHILD_ROW, ONE_ABOVE_THE_CAP)

    expect(
      built.notices().map((one) => one.text),
      'a row that may still take a child was told it may not',
    ).not.toContain(wordsFor(RS_46).text.ja)
  })
})
