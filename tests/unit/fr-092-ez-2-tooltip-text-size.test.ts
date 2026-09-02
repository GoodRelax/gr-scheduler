// `EZ-2` of 表 T-040 (FR-092), (MUST): the size a tooltip's text is drawn at --
// 「字の大きさは 表 T-206 の `S-204` が定める係数で決めること（MUST）」.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062). It is the side of IF-9 that turns a `ScreenView` into
// nodes, so it is the side that states a size at all -- UF-69 (`tooltips.ts`)
// says WHICH tooltip stands and what it says, and carries no dimension.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE LEDGER ROW IT STANDS IN FOR
// ---------------------------------------------------------------------------
//
// `docs/development-records/defects.md` D-106: 「Tips のフォントが大きい」（利用者の
// 指摘 2026-08-29）. The user's ruling of the same day settled what 「2 段階」 meant
// -- 「仮に 16pt なら 14pt ぐらいに小さくしろ」 -- CR-282 turned that into `S-204`
// (0.875 = 14 / 16) and hung it on the tooltip, and the row has stood at
// 「試験待ち」 since. ⛔ NOTHING IN tests/ ASKS FOR IT: tests/unit/uf-71.test.ts
// (IN-3 of 表 T-028) holds the tooltip to being pointable and to not going by
// itself, and tests/unit/fr-036-assignment-of-an-entrance.test.ts holds the
// WORDS it carries -- neither asks how big they are.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   EZ-2     表 T-040 (FR-092): 「アイコンにポインタを合わせて一定時間が経ったら、
//            そのアイコンの説明を出すこと（MUST）。説明の後ろに、その行の割当も出
//            すこと（MUST）」 —— ⭐ 「**字の大きさは 表 T-206 の `S-204` が定める
//            係数で決めること（MUST）。**」 待ち時間は `S-124` が持つ。
//   S-204    表 T-206 「ツールチップの文字の大きさの係数（`FR-092` の `EZ-2`）」 --
//            ⭐ 「利用者の指示を比にしたものである（2026-08-29「仮に 16pt なら
//            14pt ぐらいに小さくしろ」＝ 14 ÷ 16）」。⛔ 「px で持たない理由は
//            `S-203` と同じである」 —— `S-203`: 「⛔ px で持たない理由は `FR-036`
//            が持つ」, and FR-036 gives it: 「`NFR-007` が負う WCAG 2.1 の 1.4.4
//            は、字を大きくした読者を置き去りにしない」。
//            ⚠️ 「「2 段階」は 表 T-215 の段ではない —— 利用者が同じ発言で「フォン
//            トサイズのことだ」と述べている」。
//   T-103    U-53 `Tooltip` -- the settled name that reaches the DOM as a
//            `data-role`.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above, and of `src/` NOT ONE FILE.
// The unit is reached through the declarations tests/unit/uf-71.test.ts already
// imports, and the fixtures (`EMPTY_VIEW`, `EMPTY_HEADER`, `iconTooltip`) are
// copied from that file, which drives this same unit against this same fake.
// ⭐ THE SIZE READER (`declaredFontSize` / `expandVariables` / `lengthPx` /
// `fontSizeAt`) is copied from tests/unit/fr-006-panel-typography.test.ts,
// which asks the same question of `S-197` on another surface.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, each searched for before being given up
// ---------------------------------------------------------------------------
//
//   1. WHERE THE TOOLTIP IS DRAWN -- beside the entrance, above it, or anywhere
//      in particular. ⛔ No row states it. `EP-15` of 表 T-076 says only that a
//      tooltip is not drawn into an exported picture and that 「場所は空けない
//      —— 浮いて重なるだけ」.
//   2. HOW THE EXPLANATION AND THE ASSIGNMENT ARE JOINED. `EZ-2` says 「説明の
//      後ろに」 and stops; tests/unit/fr-036-assignment-of-an-entrance.test.ts
//      records the same silence.
//   3. THAT THE TOOLTIP IS SMALLER THAN ANY NEIGHBOUR IN PARTICULAR. The ruling
//      that produced `S-204` is a RATIO against the host's own base, which is
//      what the cases below drive; 「2 段階」 names no other part of the screen.
//   4. THE WAIT BEFORE IT APPEARS. `S-124` holds it (「⚠️ `S-124` は 3000ms なの
//      で、2.5 秒しか待たない測り方では 1 度も出なかった」, D-106's own note), and
//      that is a rule about UF-69, which decides WHETHER a tooltip stands.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  ScreenFrame,
  ScreenView,
  Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  type FakeElement,
  type Stage,
} from '../fixtures/fake-browser'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// its copy from the .md at read time, so a ratio that moves in table T-206
// moves here too instead of going stale.
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscripts, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** ⛔ THE GROUND OF THIS WHOLE FILE, read rather than typed. */
const THE_SIZE_MUST = '字の大きさは 表 T-206 の `S-204` が定める係数で決めること（MUST）'

const T_206 = specTable('T-206')
const VALUE_COLUMN = '既定'

if (!T_206.headings.includes(VALUE_COLUMN)) {
  throw new Error(`table T-206 no longer has a ${VALUE_COLUMN} column: ${T_206.headings.join(' | ')}`)
}

/** One row's value cell, as the table writes it. */
function cellOf(id: string): string {
  const row = T_206.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 no longer has row ${id}`)
  return bare(row.by[VALUE_COLUMN] ?? '')
}

/**
 * The number one row of table T-206 states.
 *
 * ⚠️ The cells carry a 🔎 beside the number (the mark that says it was measured
 * off the reference implementation), so the number is read out of the cell
 * rather than the cell parsed whole.
 */
function numberOf(id: string): number {
  const written = cellOf(id)
  const found = /-?\d+(?:\.\d+)?/.exec(written)
  if (found === null) throw new Error(`table T-206's ${id} states no number: ${written}`)
  return Number.parseFloat(found[0] as string)
}

/** S-204 -- the tooltip's text against the base the host gives. */
const S_204 = numberOf('S-204')

/** S-203 -- the help's ratio. ⚠️ A DIFFERENT SURFACE AND A DIFFERENT NUMBER. */
const S_203 = numberOf('S-203')

/** `fontScaleSizes` (S-121 / S-122 / S-123 of table T-215) -- what 「2 段階」 is NOT. */
const FONT_SCALE_SIZES = ((): readonly number[] => {
  const table = specTable('T-215')
  return ['S-121', 'S-122', 'S-123'].map((id) => {
    const row = table.rows.find((one) => one.id === id)
    if (row === undefined) throw new Error(`table T-215 no longer has row ${id}`)
    return Number.parseFloat(bare(row.by['値'] ?? ''))
  })
})()

/** U-53 of table T-103 -- the settled name that reaches the DOM as `data-role`. */
const U_53 = ((): string => {
  const table = specTable('T-103')
  const row = table.rows.find((one) => one.id === 'U-53')
  if (row === undefined) throw new Error('table T-103 no longer has row U-53')
  return bare(row.by['確定名（英）'] ?? '')
})()

// ---------------------------------------------------------------------------
// Descriptions to draw. Copied from tests/unit/uf-71.test.ts.
// ---------------------------------------------------------------------------

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const EXPLANATION = 'TooltipExplanationHere'
const ASSIGNMENT = 'Ctrl+Shift+T'

/**
 * ⭐ `EZ-2` (MUST) puts the row's assignment BEHIND the words, and FR-036 says
 * of a row that has neither key nor mouse operation 「どちらも持たない行は、その
 * 場所を空ける」 -- so the member is always there and empty is `null`.
 */
const iconTooltip = (icon: string, text: string, assignment: string | null = null): Tooltip => ({
  anchor: { kind: 'icon', icon },
  text,
  assignment,
})

/** The App Header measures to something, so BO-1's dimension is settled. */
const HEADER_HEIGHT = { 'App Header': 37 }

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

function drawn(tooltips: readonly Tooltip[]): { built: Stage; tooltip: FakeElement } {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, tooltips })
  return { built, tooltip: oneByRole(built.root(), U_53) }
}

// ---------------------------------------------------------------------------
// Reading a size out of what was written. Copied from fr-006-panel-typography.
// ---------------------------------------------------------------------------

/** Split a shorthand at the top level, so `calc(0.875 * 1em)` stays ONE value. */
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
  if (shorthand === '') return ''
  if (shorthand.toLowerCase() === 'inherit') return 'inherit'
  for (const part of shorthandParts(shorthand)) {
    const size = part.split('/')[0] ?? ''
    if (/^(calc\(|var\(|[.\d])/i.test(size)) return size
  }
  return ''
}

/** The nearest declaration of a custom property, walking upwards from this node. */
function customProperty(element: FakeElement, name: string): string | null {
  let at: FakeElement | null = element
  while (at !== null) {
    const held = styleMap(at).get(name)
    if (held !== undefined && held.trim() !== '') return held.trim()
    at = at.parentNode
  }
  return null
}

/** ⚠️ NO FALLBACK IS HONOURED -- `var(--x, 1em)` is left alone and refused below. */
function expandVariables(element: FakeElement, value: string, depth = 0): string | null {
  if (depth > 8) return null
  const named = /var\(\s*(--[a-z0-9-]+)\s*\)/i.exec(value)
  if (named === null) return value
  const held = customProperty(element, named[1] as string)
  if (held === null) return null
  return expandVariables(element, value.replace(named[0] as string, `(${held})`), depth + 1)
}

/**
 * A length in px, given the size it inherits and the base the host gives.
 *
 * ⭐ `px` IS ADMITTED ON PURPOSE -- the point of these cases is to see whether a
 * px constant is in there, and a resolver that refused px could not tell a
 * fixed size from an unreadable one.
 */
function lengthPx(expression: string, inheritedPx: number, basePx: number): number | null {
  const arithmetic = expression
    .trim()
    .toLowerCase()
    .replace(/\bcalc\b/g, '')
    .replace(/([\d.]+)\s*rem\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * basePx})`)
    .replace(/([\d.]+)\s*em\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * inheritedPx})`)
    .replace(/([\d.]+)\s*%/g, (_whole, n: string) => `(${(Number.parseFloat(n) / 100) * inheritedPx})`)
    .replace(/([\d.]+)\s*px\b/g, '($1)')
  if (arithmetic.trim() === '') return null
  if (!/^[\d\s+*/.()-]+$/.test(arithmetic)) return null
  try {
    // eslint-disable-next-line no-new-func
    const answer: unknown = new Function(`return (${arithmetic});`)()
    return typeof answer === 'number' && Number.isFinite(answer) ? answer : null
  } catch {
    return null
  }
}

/** What this node's text COMPUTES TO, if the host's base text size were `basePx`. */
function fontSizeAt(element: FakeElement, basePx: number): number | null {
  if (element.isMount) return basePx
  const parent = element.parentNode
  const inherited = parent === null ? basePx : fontSizeAt(parent, basePx)
  if (inherited === null) return null
  const written = declaredFontSize(element)
  if (written === '' || written.toLowerCase() === 'inherit') return inherited
  const expanded = expandVariables(element, written)
  if (expanded === null) return null
  return lengthPx(expanded, inherited, basePx)
}

/** Everything a failure needs to be read without opening the unit. */
const whatWasWritten = (built: Stage): string =>
  selfAndDescendants(built.root())
    .filter((one) => declaredFontSize(one) !== '')
    .map((one) => `${one.tagName}[${one.getAttribute('data-role') ?? '-'}]=${declaredFontSize(one)}`)
    .join(', ')

function sizeOf(built: Stage, element: FakeElement, basePx: number): number {
  const size = fontSizeAt(element, basePx)
  if (size === null) {
    throw new Error(
      'EZ-2 (MUST): 「字の大きさは 表 T-206 の `S-204` が定める係数で決めること」 -- ' +
        `no size could be resolved at a base of ${basePx}px. Stated sizes: ${whatWasWritten(built)}`,
    )
  }
  return size
}

/** The nearest node that shows this text and has no child that shows it too. */
function theCellShowing(root: FakeElement, text: string): FakeElement {
  const showing = selfAndDescendants(root).filter((one) => one.textContent.includes(text))
  const innermost = showing.filter(
    (one) => !one.children.some((child) => child.textContent.includes(text)),
  )
  const first = innermost[0]
  if (first === undefined) throw new Error(`nothing in the tooltip shows ${JSON.stringify(text)}`)
  if (innermost.length !== 1) {
    throw new Error(`${innermost.length} separate nodes show ${JSON.stringify(text)}`)
  }
  return first
}

/**
 * Every node in the tooltip that actually draws WORDS.
 *
 * ⭐ THE RULE IS ABOUT 「字」, SO THE CHARACTERS ARE WHAT IS MEASURED, and not a
 * box chosen by name. A node counts when it shows something and no child of it
 * shows that same something -- which is the node whose computed size the reader
 * sees. ⚠️ A box that holds only other boxes is left out on purpose: its own
 * size reaches nothing, because every word under it is drawn by a node that
 * states, or inherits, a size of its own.
 */
function everyWordyNode(tooltip: FakeElement): FakeElement[] {
  const found = selfAndDescendants(tooltip).filter((one) => one.textContent.trim() !== '')
  const innermost = found.filter(
    (one) => !one.children.some((child) => child.textContent.trim() !== ''),
  )
  if (innermost.length === 0) throw new Error('the tooltip drew no words at all')
  return innermost
}

/** ⭐ Bases of this file's own choosing, none of them a `fontScaleSizes` number. */
const BASES = [12, 16, 20, 24, 32]

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ EZ-2 still sends the tooltip’s size to S-204', () => {
    // ⛔ THE GROUND OF THIS WHOLE FILE, read rather than typed. If CR-282's
    // sentence is ever withdrawn, this line says so before any case below
    // asserts it.
    // GOES RED IF: the sentence leaves 表 T-040, or names another row.
    expect(REQUIREMENTS).toContain(THE_SIZE_MUST)
  })

  it('⛔ S-204 is a ratio, states no px, and is 14 / 16', () => {
    // ⭐ 「利用者の指示を比にしたものである（2026-08-29「仮に 16pt なら 14pt ぐらい
    //   に小さくしろ」＝ 14 ÷ 16）」. ⛔ 「px で持たない理由は `S-203` と同じである」.
    // ⭐ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // CASE BELOW AGREE WITH ANYTHING -- rule 04 section 2. `S-205` in the same
    // column states a px, so a read that returned the value column can be told
    // from one that returned a heading or a reason.
    // ⚠️ THE ARITHMETIC IS THE ROW'S OWN, not a number typed here: what is
    // compared is the cell against the division the cell itself writes.
    expect(cellOf('S-204')).not.toContain('px')
    expect(cellOf('S-205')).toContain('px')
    expect(S_204).toBeCloseTo(14 / 16, 9)
    expect(S_204).toBeGreaterThan(0)
    expect(S_204).toBeLessThan(1)
    expect(U_53).toBe('Tooltip')
  })

  it('⛔ S-204 is the tooltip’s own ratio, and not the help’s', () => {
    // ⚠️ TWO RATIOS ARRIVED IN THE SAME CHANGE REQUEST (CR-282) FOR TWO
    // SURFACES, and the ledger's D-106 closes with 「⭐ `D-105` と同じ面の話では
    // ない（あちらはヘルプ、こちらはツールチップ）」. A unit that applied one to
    // both would be wrong on one surface, and these cases could not see it if
    // the two numbers were equal.
    expect(S_204, 'S-203 and S-204 are two different ratios').not.toBe(S_203)
  })
})

// ===========================================================================
// D-106 -- the size nobody asked for
// ===========================================================================

describe('EZ-2 (MUST) -- the tooltip’s text is S-204 of the base the host gives', () => {
  it('computes to S-204 of the base, at every base a reader might set', () => {
    // 「字の大きさは 表 T-206 の `S-204` が定める係数で決めること（MUST）」. ⭐ The
    // base never reaches this unit -- `ScreenSurfaceWiring` has no member for
    // it -- so the only way a tooltip can satisfy this at every base is to
    // state a ratio and let the browser do the multiplying.
    // GOES RED IF: the tooltip is drawn at the host's own size, or at any other
    // ratio of it -- which is the defect D-106 names.
    //
    // ⚠️ EVERY NODE THAT DRAWS WORDS IS ASKED, and no box is asked by name: no
    // row of the specification says which node of a tooltip states the size,
    // and asking the one that carries the `data-role` would fail a tooltip that
    // stated the ratio one node further in and drew the reader exactly what
    // EZ-2 asks for.
    const { built, tooltip } = drawn([iconTooltip('IC-20', EXPLANATION, ASSIGNMENT)])

    for (const base of BASES) {
      for (const wordy of everyWordyNode(tooltip)) {
        expect(
          sizeOf(built, wordy, base),
          `${JSON.stringify(wordy.textContent)} at a host base of ${base}px`,
        ).toBeCloseTo(S_204 * base, 9)
      }
    }
  })

  it('⭐ the words themselves are drawn at that size, not just the box', () => {
    // ⚠️ A RATIO STATED ON A BOX WHOSE WORDS THEN STATE THEIR OWN SIZE would
    // satisfy the case above and draw the reader something else, so the node
    // that actually shows the explanation is asked as well.
    // GOES RED IF: the explanation, or the assignment behind it, is given a
    // size of its own.
    const { built, tooltip } = drawn([iconTooltip('IC-20', EXPLANATION, ASSIGNMENT)])

    for (const base of BASES) {
      expect(
        sizeOf(built, theCellShowing(tooltip, EXPLANATION), base),
        `the explanation, at a host base of ${base}px`,
      ).toBeCloseTo(S_204 * base, 9)
      expect(
        sizeOf(built, theCellShowing(tooltip, ASSIGNMENT), base),
        `the assignment, at a host base of ${base}px`,
      ).toBeCloseTo(S_204 * base, 9)
    }
  })

  it('⛔ MUST NOT: doubling the base doubles what the tooltip computes to', () => {
    // ⛔ 「px で持たない理由は `S-203` と同じである」, and FR-036 gives that reason:
    // 「`NFR-007` が負う WCAG 2.1 の 1.4.4 は、字を大きくした読者を置き去りにしな
    // い」.
    // ⭐ THIS IS THE CASE THE RATIO IS FOR. A px constant -- written on the
    // tooltip, or hidden behind a custom property, or stated on an ancestor it
    // inherits from -- gives the same number under both bases, and a ratio
    // cannot.
    const { built, tooltip } = drawn([iconTooltip('IC-20', EXPLANATION, ASSIGNMENT)])
    const words = theCellShowing(tooltip, EXPLANATION)

    const small = sizeOf(built, words, 16)
    const large = sizeOf(built, words, 32)

    expect(large / small, 'the tooltip follows the reader, rather than a constant').toBeCloseTo(2, 9)
  })

  it('⛔ MUST NOT: 「2 段階」 is not a step of table T-215', () => {
    // ⚠️ 「「2 段階」は 表 T-215 の段ではない —— 利用者が同じ発言で「フォントサイズ
    //   のことだ」と述べている」（`S-204`'s own note）. ⭐ D-106 records that the
    // question was open before the ruling: 「表 T-215 の `fontScaleSizes` の段か、
    // `S-197` のような係数か。問う前に測ること」 -- and the ruling chose the ratio.
    // ⭐ The base below is deliberately none of table T-215's own numbers, so a
    // tooltip that multiplied the wrong thing cannot come out right by
    // accident.
    const base = 20
    expect(FONT_SCALE_SIZES, 'the base this case drives with is not one of them').not.toContain(base)

    const { built, tooltip } = drawn([iconTooltip('IC-20', EXPLANATION, ASSIGNMENT)])
    const size = sizeOf(built, theCellShowing(tooltip, EXPLANATION), base)

    expect(size).toBeCloseTo(S_204 * base, 9)
    for (const wrong of FONT_SCALE_SIZES) {
      expect(size, `S-204 x fontScaleSizes = ${S_204 * wrong}`).not.toBeCloseTo(S_204 * wrong, 9)
    }
  })
})
