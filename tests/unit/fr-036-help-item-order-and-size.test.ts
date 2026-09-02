// FR-036 (MUST): how one item of the help list is laid out -- the entrance's
// glyph, then that row's explanation, then that row's assignment, in that order
// -- and the size the list's text is drawn at (`S-203`).
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062). It is the side of IF-9 that turns a `ScreenView` into
// nodes, so it is the side that ORDERS and SIZES anything -- UF-66
// (`help-modal.ts`) says WHICH rows the help carries and carries neither an
// order on the page nor a dimension.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE LEDGER ROW IT STANDS IN FOR
// ---------------------------------------------------------------------------
//
// `docs/development-records/defects.md` D-105: 「ヘルプのフォントが大きすぎ、並び順
// も違う」（利用者の指摘 2026-08-29）. CR-282 closed the specification side on
// 2026-08-29 -- FR-036 now states the user's own order and sends the size to
// `S-203` -- and the ledger's own note says what is left: 「残るのは実物での 1 画面
// 確認だけである」. Nothing in tests/ asks for either. tests/unit/uf-66.test.ts
// refuses the neighbouring question in as many words (「THE ORDER two entries
// stand in on one surface」), and that is a different order: the order of the
// ITEMS, not the order of the three parts INSIDE one item.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-036   ⭐ 「一覧の各項目は、入口の図形・その行の説明・その行の割当の 3 つを、
//            この順に並べること（MUST）」（利用者の指示 2026-08-29「アイコン 説明
//            マウス操作/ショートカットキー の順に書け」）。
//            ⚠️ 「CR-279 は「説明・キー・図形」の順と定めていた。利用者の指示がそ
//            れを覆した。」
//            ⭐ 「ここでいう割当は、キー（表 T-036 の `割当`）とマウス操作（表
//            T-023 の `操作`）の両方を指すこと（MUST）」 —— ⛔ 「キーだけでは
//            `Shift ＋ ホイール` を言えない」。「どちらも持たない行は、その場所を
//            空ける。」
//            ⛔ 「図形を持つのは、表 T-109 がその行にちょうど 1 つの入口を置いて
//            いる行だけである。」
//            ⭐ 「一覧の字の大きさは ... 表 T-206 の `S-203` が定める係数で決める
//            こと（MUST）」（利用者の指示 2026-08-29「アイコンと合わせろ」）。
//            ⛔ 「px で持ってはならない（MUST NOT）」 —— 「理由は `S-197` と同じ
//            で、`NFR-007` が負う WCAG 2.1 の 1.4.4 は、字を大きくした読者を置き
//            去りにしない。」
//   S-203    表 T-206 「ヘルプの文字の大きさの係数（`FR-036`）」 -- ⚠️ 「掛ける相
//            手は宿主の地の文字であり、`fontScaleSizes`（表 T-215）ではない ——
//            ヘルプは日程の絵ではなく、その周りの枠である（`S-197` と同じ立場）」。
//   T-103    U-30 `Help Modal` -- the settled name that reaches the DOM as a
//            `data-role`.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above, and of `src/` NOT ONE FILE.
// The unit is reached through the declarations tests/unit/uf-71.test.ts already
// imports, and the fixtures (`EMPTY_VIEW`, `EMPTY_HEADER`, `command`,
// `HELP_MODAL`) are copied from that file, which drives this same unit against
// this same fake. ⭐ THE SIZE READER (`declaredFontSize` / `expandVariables` /
// `lengthPx` / `fontSizeAt`) is copied from
// tests/unit/fr-006-panel-typography.test.ts, which asks the same question of
// `S-197` on another surface.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, each searched for before being given up
// ---------------------------------------------------------------------------
//
//   1. WHAT SEPARATES the three parts on the screen, or how much room each
//      takes. ⛔ No row states either. FR-036 states an ORDER and stops.
//   2. WHETHER A ROW WITH NEITHER KEY NOR MOUSE OPERATION KEEPS A BOX. 「どちら
//      も持たない行は、その場所を空ける」 says the place is left empty; whether
//      「場所を空ける」 means an empty box is drawn or nothing is drawn at all is
//      not settled by any row, so no case asks. ⚠️ The same wording appears for
//      the glyph 「持たない行はその場所を空ける」, with the same silence.
//   3. THE NUMBER OF COLUMNS AND THE SHARE OF THE SCREEN THE HELP TAKES.
//      `S-201` and `S-202` hold those, and they are a different question from
//      the one D-105 names.
//   4. WHAT AN ITEM CARRYING BOTH A KEY AND A MOUSE OPERATION SHOWS. ⛔ No row
//      settles it. FR-036 says the assignment 「キー ... とマウス操作 ... の両方を
//      指す」, which says what COUNTS as an assignment, not that a row holding
//      both prints both; tests/unit/fr-036-assignment-of-an-entrance.test.ts
//      records the same silence for the tooltip 「WHICH of the two an entrance
//      shows when BOTH tables name it ... no line anywhere says which wins」. A
//      case was written asking that both stand after the explanation and was
//      WITHDRAWN when it failed: the page shows one of the two, and nothing in
//      docs/spec says it may not. Reported, not asserted.
//   5. THAT THE GLYPH ITSELF IS `S-138` ACROSS. FR-029 (MUST) states the box's
//      side and (MUST NOT) forbids it varying by surface, and
//      tests/unit/uf-71.test.ts is the bench that holds every entrance to it --
//      including the one on the `Help Modal` (IC-52).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  OpenModal,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
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

/** ⛔ THE ORDER, read rather than typed. The user's ruling of 2026-08-29. */
const THE_ORDER_MUST =
  '一覧の各項目は、入口の図形・その行の説明・その行の割当の 3 つを、この順に並べること（MUST）'

/** ⛔ The size, sent to a ratio and never to a px. */
const THE_SIZE_MUST = '一覧の字の大きさは `_assets/tbl-settings.md` の 表 T-206 の `S-203` が定める係数で決めること（MUST）'

/** ⚠️ The order CR-279 had written, which the user's instruction overrode. */
const THE_OVERRIDDEN_ORDER = 'CR-279 は「説明・キー・図形」の順と定めていた。利用者の指示がそれを覆した'

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

/** S-203 -- the help's text against the base the host gives. */
const S_203 = numberOf('S-203')

/**
 * `fontScaleSizes` (S-121 / S-122 / S-123 of table T-215) -- the multiplicand
 * S-203's own note rules out in as many words.
 */
const FONT_SCALE_SIZES = ((): readonly number[] => {
  const table = specTable('T-215')
  return ['S-121', 'S-122', 'S-123'].map((id) => {
    const row = table.rows.find((one) => one.id === id)
    if (row === undefined) throw new Error(`table T-215 no longer has row ${id}`)
    return Number.parseFloat(bare(row.by['値'] ?? ''))
  })
})()

/** U-30 of table T-103 -- the settled name that reaches the DOM as `data-role`. */
const U_30_HELP = ((): string => {
  const table = specTable('T-103')
  const row = table.rows.find((one) => one.id === 'U-30')
  if (row === undefined) throw new Error('table T-103 no longer has row U-30')
  const written = bare(row.by['確定名（英）'] ?? '')
  const found = written.split('/').map((one) => one.trim()).find((one) => one.includes('Help'))
  if (found === undefined) throw new Error(`table T-103's U-30 names no help surface: ${written}`)
  return found
})()

// ---------------------------------------------------------------------------
// Descriptions to draw. Copied from tests/unit/uf-71.test.ts.
// ---------------------------------------------------------------------------

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  label: patch.icon,
  ...patch,
})

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

/** The words this file drives with, all distinct so no case can confuse two. */
const EXPLANATION = 'HelpExplanationHere'
const KEYS = 'Ctrl+Shift+K'
const PRESS = 'HelpMousePressHere'

/** The row of table T-109 the item's glyph stands for. ⚠️ Not IC-52, which closes the help. */
const ITEM_ICON = 'IC-20'

/** The one entrance the help surface itself carries (表 T-109's IC-52). */
const CLOSE_ICON = 'IC-52'

/**
 * One item of the help list.
 *
 * ⚠️ SPELLED OUT HERE RATHER THAN TAKEN OFF `OpenModal`: that type is a union
 * over the surfaces 表 T-103's `U-30` names (the help and the AI export), so a
 * member read off the union would not compile. ⛔ Every member these cases drive
 * is named here, and the cast below is the narrow one rule 04 section 1 asks
 * for -- a fixture that turned a member's shape into a COMPILE error would take
 * every case in this file down with it, when what is wanted is a case that
 * falls.
 */
interface HelpItem {
  readonly table: string
  readonly row: string
  readonly text: string
  readonly press: string | null
  readonly keys: string | null
  readonly icon: string | null
}

const entry = (patch: Partial<HelpItem> = {}): HelpItem => ({
  table: 'T-036',
  row: 'SK-1',
  text: EXPLANATION,
  press: null,
  keys: null,
  icon: ITEM_ICON,
  ...patch,
})

const helpWith = (entries: readonly HelpItem[]): OpenModal =>
  ({
    surface: 'Help Modal',
    heading: 'HelpHeadingHere',
    commands: [command({ icon: CLOSE_ICON, label: 'CloseHelp' })],
    entries,
    language: 'ja',
    licenceText: 'LicenceTextHere',
    copyrightNotice: 'CopyrightNoticeHere',
    attributions: ['AttributionOne'],
  }) as unknown as OpenModal

/** The App Header measures to something, so BO-1's dimension is settled. */
const HEADER_HEIGHT = { 'App Header': 37 }

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

function drawn(entries: readonly HelpItem[]): { built: Stage; help: FakeElement } {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, openModal: helpWith(entries) })
  return { built, help: oneByRole(built.root(), U_30_HELP) }
}

// ---------------------------------------------------------------------------
// Reading the page back
// ---------------------------------------------------------------------------

/**
 * The nearest node that shows this text and has no child that shows it too.
 *
 * ⭐ FOUND BY WHAT IT SHOWS, NOT BY A ROLE. No table names a node for an item's
 * explanation or for its assignment, so a case that looked one up by name would
 * be asserting a spelling the manuscript never settled.
 *
 * Copied from tests/unit/fr-006-panel-typography.test.ts.
 */
function theCellShowing(root: FakeElement, text: string): FakeElement {
  const showing = selfAndDescendants(root).filter((one) => one.textContent.includes(text))
  const innermost = showing.filter(
    (one) => !one.children.some((child) => child.textContent.includes(text)),
  )
  const first = innermost[0]
  if (first === undefined) {
    throw new Error(`nothing in the help shows ${JSON.stringify(text)}: ${whatWasDrawn(root)}`)
  }
  if (innermost.length !== 1) {
    throw new Error(`${innermost.length} separate nodes show ${JSON.stringify(text)}`)
  }
  return first
}

/** The item box -- the nearest node that holds two of the item's own parts. */
function commonAncestor(one: FakeElement, other: FakeElement): FakeElement {
  const upwards = (from: FakeElement): FakeElement[] => {
    const chain: FakeElement[] = []
    let at: FakeElement | null = from
    while (at !== null) {
      chain.push(at)
      at = at.parentNode
    }
    return chain
  }
  const theirs = new Set(upwards(other))
  for (const at of upwards(one)) if (theirs.has(at)) return at
  throw new Error('two parts of one help item share no ancestor at all')
}

/**
 * The item's glyph -- the shape 図 F-019 gives the row of 表 T-109 the item
 * names.
 *
 * ⭐ FOUND BY THE SHAPE IT DRAWS, NOT BY AN ATTRIBUTE. FR-036 says the item
 * carries 「入口の図形」 and FR-029 (MUST) sends every icon's shape to 図 F-019;
 * no row says a help item's glyph carries a `data-icon`, so a case that looked
 * one up by attribute would be asserting a spelling nobody settled. What IS
 * settled is which shape belongs to which row, so the shape is what is matched.
 *
 * ⚠️ 図 F-019 IS READ, NOT COPIED: `docs/spec/_assets/fig-icons.svg` is the
 * figure, `tools/generate_icon_glyphs.py` carries it into `icon-glyphs.json`
 * cross-checked against 表 T-109, and `npm run gen:check` is what fails when the
 * figure moves on without it -- the same route
 * tests/unit/fr-029-palette-grab-marker.test.ts takes.
 */
interface GlyphElement {
  readonly tag: string
}

const ICON_GLYPHS = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'icon-glyphs.json'), 'utf8'),
) as {
  readonly glyphs: readonly { readonly rowId: string; readonly elements: readonly GlyphElement[] }[]
}

function shapeOf(rowId: string): readonly string[] {
  const found = ICON_GLYPHS.glyphs.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`図 F-019 draws no shape for ${rowId}`)
  return found.elements.map((one) => one.tag.toUpperCase())
}

function theGlyphIn(item: FakeElement, rowId: string): FakeElement {
  const wanted = shapeOf(rowId).join(',')
  const drawnShapes = selfAndDescendants(item).filter((one) => one.tagName === 'SVG')
  const matching = drawnShapes.filter(
    (one) => selfAndDescendants(one).slice(1).map((part) => part.tagName).join(',') === wanted,
  )
  const first = matching[0]
  if (first === undefined) {
    throw new Error(
      `no shape in this item is 図 F-019's ${rowId} (${wanted}): ${whatWasDrawn(item)}`,
    )
  }
  return first
}

// -- the size a node's text computes to. Copied from fr-006-panel-typography. --

/** Split a shorthand at the top level, so `calc(0.8 * 1em)` stays ONE value. */
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
function whatWasWritten(built: Stage): string {
  return selfAndDescendants(built.root())
    .filter((one) => declaredFontSize(one) !== '')
    .map((one) => `${one.tagName}[${one.getAttribute('data-role') ?? '-'}]=${declaredFontSize(one)}`)
    .join(', ')
}

function sizeOf(built: Stage, element: FakeElement, basePx: number): number {
  const size = fontSizeAt(element, basePx)
  if (size === null) {
    throw new Error(
      'FR-036 (MUST): 「一覧の字の大きさは ... `S-203` が定める係数で決めること」 -- ' +
        `no size could be resolved at a base of ${basePx}px. Stated sizes: ${whatWasWritten(built)}`,
    )
  }
  return size
}

/** ⭐ Bases of this file's own choosing, none of them a `fontScaleSizes` number. */
const BASES = [12, 16, 20, 24, 32]

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-036 still states the order the user asked for on 2026-08-29', () => {
    // ⛔ THE GROUND OF HALF THIS FILE. CR-279 had written the opposite order a
    // round earlier; CR-282 turned it round on the user's instruction. If it
    // ever turns back, this line says so before any case below asserts it.
    // GOES RED IF: the sentence leaves the requirement.
    expect(REQUIREMENTS).toContain(THE_ORDER_MUST)
    expect(REQUIREMENTS, 'the override is recorded, with the order it replaced').toContain(
      THE_OVERRIDDEN_ORDER,
    )
  })

  it('⭐ FR-036 still sends the list’s size to S-203', () => {
    // GOES RED IF: the sentence leaves the requirement, or names another row.
    expect(REQUIREMENTS).toContain(THE_SIZE_MUST)
  })

  it('⛔ S-203 is a ratio and states no px of its own', () => {
    // ⛔ 「px で持ってはならない（MUST NOT）」 -- 「`NFR-007` が負う WCAG 2.1 の
    // 1.4.4 は、字を大きくした読者を置き去りにしない」.
    // ⭐ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // SIZE CASE BELOW AGREE WITH ANYTHING -- rule 04 section 2. `S-201` in the
    // same column states a ratio too but a different one, and `S-205` states a
    // px, so a read that returned the value column can be told from one that
    // returned a heading or a reason.
    expect(cellOf('S-203')).not.toContain('px')
    expect(cellOf('S-205')).toContain('px')
    expect(S_203).toBeGreaterThan(0)
    expect(S_203).toBeLessThan(1)
    expect(FONT_SCALE_SIZES.every((one) => one > 0)).toBe(true)
    expect(U_30_HELP).toBe('Help Modal')
  })
})

// ===========================================================================
// D-105, first half -- the order of the three parts inside one item
// ===========================================================================

describe('FR-036 (MUST) -- glyph, then explanation, then assignment', () => {
  it('⛔ MUST: an item carrying all three draws them in that order', () => {
    // 「一覧の各項目は、入口の図形・その行の説明・その行の割当の 3 つを、この順に
    //   並べること（MUST）」（利用者の指示 2026-08-29「アイコン 説明 マウス操作/
    //   ショートカットキー の順に書け  例:  ⇔  時間軸を拡大  Shift ＋ ホイール」）.
    // ⚠️ WHAT THIS SEAM CAN SEE IS THE ORDER THE NODES WERE PUT IN, which is
    // what a reader reads for the writing direction this list is drawn in.
    // There is no layout engine here to ask where a box landed, and no row
    // settles which property may place an item's parts -- so a page that put
    // them in the manuscript's order and then moved one with `order` would pass
    // this case and fail a reader. Reported, not asserted.
    // GOES RED IF: the parts are drawn in any other order -- and CR-279's
    // 「説明・キー・図形」 is one of them.
    const { help } = drawn([entry({ keys: KEYS })])

    const explanationCell = theCellShowing(help, EXPLANATION)
    const assignmentCell = theCellShowing(help, KEYS)
    const item = commonAncestor(explanationCell, assignmentCell)
    const order = selfAndDescendants(item)

    const glyph = order.indexOf(theGlyphIn(item, ITEM_ICON))
    const explanation = order.indexOf(explanationCell)
    const assignment = order.indexOf(assignmentCell)

    expect(glyph, `the item reads ${whatWasDrawn(item)}`).toBeGreaterThanOrEqual(0)
    expect(explanation, 'the explanation comes after the glyph').toBeGreaterThan(glyph)
    expect(assignment, 'the assignment comes after the explanation').toBeGreaterThan(explanation)
  })

  it('⭐ a mouse operation stands in the same place a key would', () => {
    // 「ここでいう割当は、キー（表 T-036 の `割当`）とマウス操作（表 T-023 の
    //   `操作`）の両方を指すこと（MUST）」 -- ⛔ 「キーだけでは `Shift ＋ ホイール`
    // を言えない」（利用者の例）.
    // GOES RED IF: the mouse operation is drawn before the explanation, or is
    // not drawn at all.
    const { help } = drawn([entry({ press: PRESS })])

    const explanationCell = theCellShowing(help, EXPLANATION)
    const assignmentCell = theCellShowing(help, PRESS)
    const item = commonAncestor(explanationCell, assignmentCell)
    const order = selfAndDescendants(item)

    const glyph = order.indexOf(theGlyphIn(item, ITEM_ICON))
    const explanation = order.indexOf(explanationCell)
    const assignment = order.indexOf(assignmentCell)

    expect(explanation, `the item reads ${whatWasDrawn(item)}`).toBeGreaterThan(glyph)
    expect(assignment).toBeGreaterThan(explanation)
  })
})

// ===========================================================================
// D-105, second half -- the size the list is drawn at
// ===========================================================================

describe('FR-036 (MUST) -- the list’s text is S-203 of the base the host gives', () => {
  it('computes to S-203 of the base, at every base a reader might set', () => {
    // 「一覧の字の大きさは ... `S-203` が定める係数で決めること（MUST）」（利用者
    //   の指示 2026-08-29「アイコンと合わせろ」）. ⭐ The base never reaches this
    // unit -- `ScreenSurfaceWiring` has no member for it -- so the only way the
    // help can satisfy this at every base is to state a ratio and let the
    // browser do the multiplying.
    // GOES RED IF: the list is drawn at the host's own size, or at any other
    // ratio of it.
    const { built, help } = drawn([entry({ keys: KEYS })])
    const explanation = theCellShowing(help, EXPLANATION)

    for (const base of BASES) {
      expect(sizeOf(built, explanation, base), `a host base of ${base}px`).toBeCloseTo(
        S_203 * base,
        9,
      )
    }
  })

  it('⭐ the assignment beside it is drawn at that same size', () => {
    // 「一覧の字」 is the list, and the assignment is part of every item of it --
    // ⚠️ the MUST names no part of an item that is exempt.
    // GOES RED IF: the keys are given a size of their own.
    const { built, help } = drawn([entry({ keys: KEYS })])
    const assignment = theCellShowing(help, KEYS)

    for (const base of BASES) {
      expect(sizeOf(built, assignment, base), `a host base of ${base}px`).toBeCloseTo(
        S_203 * base,
        9,
      )
    }
  })

  it('⛔ MUST NOT: doubling the base doubles what the list computes to', () => {
    // ⛔ 「px で持ってはならない（MUST NOT）」 —— 「理由は `S-197` と同じで、
    // `NFR-007` が負う WCAG 2.1 の 1.4.4 は、字を大きくした読者を置き去りにしない」.
    // ⭐ THIS IS THE CASE THE MUST NOT IS FOR. A px constant -- written on the
    // help, or hidden behind a custom property, or stated on an ancestor the
    // help inherits from -- gives the same number under both bases, and a ratio
    // cannot.
    const { built, help } = drawn([entry({ keys: KEYS })])
    const explanation = theCellShowing(help, EXPLANATION)

    const small = sizeOf(built, explanation, 16)
    const large = sizeOf(built, explanation, 32)

    expect(large / small, 'the help follows the reader, rather than a constant').toBeCloseTo(2, 9)
  })

  it('⛔ MUST NOT: it is not `fontScaleSizes[fontScale]` that is multiplied', () => {
    // ⚠️ S-203's own note: 「掛ける相手は宿主の地の文字であり、`fontScaleSizes`
    //   （表 T-215）ではない —— ヘルプは日程の絵ではなく、その周りの枠である
    //   （`S-197` と同じ立場）」.
    // ⭐ The base below is deliberately none of table T-215's own numbers, so a
    // help that multiplied the wrong thing cannot come out right by accident.
    const base = 20
    expect(FONT_SCALE_SIZES, 'the base this case drives with is not one of them').not.toContain(base)

    const { built, help } = drawn([entry({ keys: KEYS })])
    const size = sizeOf(built, theCellShowing(help, EXPLANATION), base)

    expect(size).toBeCloseTo(S_203 * base, 9)
    for (const wrong of FONT_SCALE_SIZES) {
      expect(size, `S-203 x fontScaleSizes = ${S_203 * wrong}`).not.toBeCloseTo(S_203 * wrong, 9)
    }
  })
})
