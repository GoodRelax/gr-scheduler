// FR-101 (MUST): the name of the open file stands ABOVE the moment it was last
// written to -- 「名前を時刻の上に置くこと（MUST）」（利用者の裁定 2026-08-29）.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062). It is the side of IF-9 that turns a `ScreenView` into
// nodes, so it is the side that PLACES anything -- UF-62 (`app-header.ts`) says
// WHICH values the header carries and places none of them.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE LEDGER ROW IT STANDS IN FOR
// ---------------------------------------------------------------------------
//
// `docs/development-records/defects.md` D-126: 「`FR-101` の『名前を時刻の上に置く
// こと（MUST）』を、誰も主張できない」. CR-280 put `Opened File Name` (U-58) and
// `File Saved At` (U-59) into the `EP-1` row of 表 T-076 and FR-101 states the
// order as a MUST, but `AppHeaderItems` carries no member for an order -- so
// UF-62 has nothing to be held to. ⭐ CR-299 settled who owes it: 表 T-075's
// 責務 for UF-71 now reads 「`FR-101` の「名前を時刻の上に置く」を満たすのは本ユ
// ニットである」, and the ledger's own closing note says 「残るのは試験だけである
// —— その MUST を主張する試験はまだ 0 件」. This file is that test.
//
// ⚠️ U-58 AND U-59 APPEAR IN FIXTURES ALREADY -- tests/unit/uf-71.test.ts:175
// lists both in its copy of 表 T-103 and its `RICH_VIEW` carries values for
// both -- but no case anywhere compares their positions.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-101   ⭐ 「`GRS` は、**いま開いているファイルの名前**と、**そのファイルへ最後
//            に書いた時刻**を画面上に示すこと（MUST）。**名前を時刻の上に置くこと
//            （MUST）**（利用者の裁定 2026-08-29）。」
//            ⚠️ 「`Document Title`（... `U-27`）と混同してはならない（MUST NOT）
//            —— あちらは文書が持つ値（`Project/Title`）であり、本要求が出すのは
//            ファイルの名前である。**2 つが違う値になることは正常である。**」
//   T-103    U-58 `Opened File Name` 「開いているファイル名 ... 規則は `FR-101`」
//            U-59 `File Saved At` 「ファイル保存時刻。開いているファイルへ最後に
//            書いた時刻。規則は `FR-101`」
//            ⭐ The settled name is what reaches the DOM as a `data-role`, so
//            each part is found by the name the specification gave it.
//   T-075    UF-71's 責務 (CR-299): 「`FR-101` の「名前を時刻の上に置く」を満たす
//            のは本ユニットである」 -- which is why the case is put HERE.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above, and of `src/` NOT ONE FILE.
// The unit is reached through the declarations tests/unit/uf-71.test.ts already
// imports, and the fixtures (`EMPTY_VIEW`, `EMPTY_HEADER`) are copied from that
// file, which drives this same unit against this same fake.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, each searched for before being given up
// ---------------------------------------------------------------------------
//
//   1. HOW FAR APART the two are drawn, or where in the header the pair sits.
//      ⛔ No row states either. FR-101 states an order and nothing else about
//      placement; 表 T-206's `S-210` states the size of the moment alone.
//   2. HOW THE MOMENT IS SPELLED. FR-101 says in as many words 「時刻の綴りその
//      ものは本書が定めない —— 読む人の暗黙の綴りに従う」.
//   3. THAT THE NAME IS SMALLER OR LARGER THAN ANYTHING. `S-210` is 「ヘッダー
//      の更新日時の文字の大きさの係数」 and its own note says ⚠️ 「ファイルの名前
//      には掛けない」, so the pair's relative size is a rule about the MOMENT
//      only and belongs to a case about `S-210`, not about the order.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
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
} from '../fixtures/fake-browser'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// its copy from the .md at read time, so a name that moves in table T-103 moves
// here too instead of going stale.
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscripts, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

const DESIGN = readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8')

/** ⛔ THE GROUND OF THIS WHOLE FILE, read rather than typed. */
const THE_ORDER_MUST = '名前を時刻の上に置くこと（MUST）'

/** The settled name one row of table T-103 gives, which reaches the DOM as `data-role`. */
function settledName(rowId: string): string {
  const table = specTable('T-103')
  const COLUMN = '確定名（英）'
  if (!table.headings.includes(COLUMN)) {
    throw new Error(`table T-103 no longer has a ${COLUMN} column: ${table.headings.join(' | ')}`)
  }
  const row = table.rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-103 no longer has row ${rowId}`)
  return bare(row.by[COLUMN] ?? '')
}

/** U-58 -- the name of the file that is open. */
const U_58 = settledName('U-58')

/** U-59 -- the moment it was last written to. */
const U_59 = settledName('U-59')

/** U-31 -- the surface both stand on. */
const U_31 = settledName('U-31')

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

/**
 * A header carrying both values FR-101 puts on the screen.
 *
 * ⚠️ THE NAME IS NOT THE `Document Title` -- U-58 says in as many words that the
 * two are different values and that differing is normal, so the fixture gives
 * all three different words and no case can pass by confusing them.
 */
const HEADER_WITH_A_SAVED_FILE: AppHeaderItems = {
  ...EMPTY_HEADER,
  documentTitle: 'DocumentTitleHere',
  openedFileName: 'OpenedFileNameHere.grs.json',
  fileSavedAt: '2026-08-29T01:02:03Z',
  fileNeverSavedText: 'FileNeverSavedHere',
}

/** The same file, never written to -- 「時刻の代わりにその旨を示すこと（MUST）」. */
const HEADER_NEVER_SAVED: AppHeaderItems = {
  ...HEADER_WITH_A_SAVED_FILE,
  fileSavedAt: null,
}

/** The App Header measures to something, so BO-1's dimension is settled. */
const HEADER_HEIGHT = { 'App Header': 37 }

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

function drawn(header: AppHeaderItems): FakeElement {
  const built = wire(THEME, HEADER_HEIGHT)
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, appHeaderItems: header })
  return built.root()
}

// ---------------------------------------------------------------------------
// Reading the placement back
// ---------------------------------------------------------------------------

/** The nearest node holding both, which is the box that decides their order. */
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
  throw new Error('the two parts of FR-101 share no ancestor at all')
}

/**
 * Whether the box that holds the two stacks them DOWN THE PAGE, so that the
 * earlier one is the higher one.
 *
 * ⭐ WHY THIS IS ASKED AT ALL. 「上に置く」 is a statement about the vertical, and
 * document order alone answers it only where the box stacks its children. A box
 * that lays its children out in a ROW puts the name BESIDE the moment, not above
 * it, and the order case below would pass while the MUST was broken.
 *
 * ⚠️ SILENCE IS ACCEPTED, and it is the only silence that is. Normal flow stacks
 * block boxes down the page in document order, so a box that states no layout of
 * its own already satisfies the MUST. What is refused is a box that states a
 * layout which is NOT a downward stack.
 */
function stacksDownThePage(box: FakeElement): { readonly stacked: boolean; readonly why: string } {
  const declared = styleMap(box)
  const value = (name: string): string => (declared.get(name) ?? '').trim().toLowerCase()

  const display = value('display')
  if (display === 'flex' || display === 'inline-flex') {
    const direction = value('flex-direction')
    if (direction === '') return { stacked: false, why: 'a flex box with no direction lays out in a ROW' }
    if (direction === 'column') return { stacked: true, why: 'flex-direction: column' }
    return { stacked: false, why: `flex-direction: ${direction}` }
  }
  if (display === 'grid' || display === 'inline-grid') {
    if (value('grid-auto-flow').startsWith('column')) {
      return { stacked: false, why: 'grid-auto-flow: column' }
    }
    const columns = value('grid-template-columns')
    if (columns !== '' && columns.split(/\s+/).length > 1) {
      return { stacked: false, why: `grid-template-columns: ${columns}` }
    }
    return { stacked: true, why: 'a grid that flows in rows' }
  }
  return { stacked: true, why: display === '' ? 'normal flow' : `display: ${display}` }
}

/** ⛔ `order` moves a box away from where the document put it. */
const orderStatedOn = (element: FakeElement): string =>
  (styleMap(element).get('order') ?? '').trim()

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⭐ FR-101 still puts the name above the time', () => {
    // ⛔ THE GROUND OF THIS WHOLE FILE. If the ruling of 2026-08-29 is ever
    // reversed, this line says so before any case below asserts it.
    // GOES RED IF: the sentence leaves the requirement.
    expect(REQUIREMENTS).toContain(THE_ORDER_MUST)
  })

  it('⭐ the design still hands that MUST to UF-71, which is the unit driven here', () => {
    // ⚠️ CR-299 CHOSE THE OWNER. D-126 offered two ways to close: a member on
    // `AppHeaderItems` that carried an order, or the drawing side owning the
    // rule. The second was taken, and 表 T-075's 責務 for UF-71 records it --
    // so a case placed on UF-62 instead would be asserting the way that was
    // REJECTED.
    // GOES RED IF: the responsibility moves back to the describing side.
    const at = DESIGN.indexOf('| UF-71 |')
    expect(at, '表 T-075 still has a row for UF-71').toBeGreaterThanOrEqual(0)
    const row = DESIGN.slice(at, DESIGN.indexOf('\n', at))
    expect(row).toContain('FR-101')
  })

  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // CASE BELOW LOOK FOR A PART THAT IS NOT THERE -- rule 04 section 2.
    expect(U_58).toBe('Opened File Name')
    expect(U_59).toBe('File Saved At')
    expect(U_31).toBe('App Header')
  })
})

// ===========================================================================
// D-126 -- the MUST nobody could assert
// ===========================================================================

describe('FR-101 (MUST) -- the name stands above the time', () => {
  it('⭐ both parts are drawn, each exactly once', () => {
    // 「いま開いているファイルの名前 ... と ... 最後に書いた時刻 ... を画面上に示す
    //   こと（MUST）」. ⚠️ The control case: without it, a header that drew
    // NEITHER would pass every ordering case below by vacuity.
    // GOES RED IF: either part stops being drawn, or is drawn twice.
    const root = drawn(HEADER_WITH_A_SAVED_FILE)

    expect(oneByRole(root, U_58).textContent).toContain('OpenedFileNameHere.grs.json')
    expect(oneByRole(root, U_59).textContent.length).toBeGreaterThan(0)
  })

  it('⛔ MUST: the name comes before the time in the document', () => {
    // 「名前を時刻の上に置くこと（MUST）」（利用者の裁定 2026-08-29）.
    // ⚠️ WHAT THIS SEAM CAN SEE IS THE ORDER THE NODES WERE PUT IN. There is no
    // layout engine here to ask where a box landed, so the case below asks the
    // other half -- that the box holding them stacks down the page -- and the
    // two together are what 「上に置く」 comes to.
    // GOES RED IF: the two are drawn the other way round.
    const root = drawn(HEADER_WITH_A_SAVED_FILE)
    const order = selfAndDescendants(root)

    const name = order.indexOf(oneByRole(root, U_58))
    const time = order.indexOf(oneByRole(root, U_59))

    expect(name).toBeGreaterThanOrEqual(0)
    expect(time, `the header reads ${whatWasDrawn(oneByRole(root, U_31))}`).toBeGreaterThan(name)
  })

  it('⛔ MUST: the box holding the two stacks them down the page', () => {
    // ⭐ THE HALF DOCUMENT ORDER CANNOT ANSWER. 「上に置く」 is about the
    // vertical: a box that lays its children out in a row would put the name
    // BESIDE the moment, and the case above would still pass. Normal flow is
    // accepted -- it already stacks block boxes down the page in document order
    // -- and a stated layout that is not a downward stack is not.
    // GOES RED IF: the pair is laid out side by side, or the stack is reversed.
    const root = drawn(HEADER_WITH_A_SAVED_FILE)
    const box = commonAncestor(oneByRole(root, U_58), oneByRole(root, U_59))

    const { stacked, why } = stacksDownThePage(box)
    expect(stacked, `the box holding the name and the time: ${why}`).toBe(true)
  })

  it('⛔ MUST NOT: neither part is pulled out of that order by `order`', () => {
    // ⚠️ THE ONE WAY A PAGE CAN AGREE WITH BOTH CASES ABOVE AND STILL DRAW THE
    // TIME FIRST. `order` moves a flex or grid child away from where the
    // document put it, so a header that stated one on either part would have
    // put the moment above the name while every case above passed.
    // GOES RED IF: either part states an `order` the other does not.
    const root = drawn(HEADER_WITH_A_SAVED_FILE)

    const nameOrder = orderStatedOn(oneByRole(root, U_58))
    const timeOrder = orderStatedOn(oneByRole(root, U_59))

    expect(nameOrder, 'the two are left where the document put them').toBe(timeOrder)
  })

  it('⭐ the same order holds when the file has never been written to', () => {
    // 「まだ 1 度もファイルへ書いていないときは、時刻の代わりにその旨を示すこと
    //   （MUST）」 -- 「空欄では『書けたのに読めない』と区別がつかない」. ⚠️ FR-101
    // carves out no exception to the order for that state: what changes is WHAT
    // stands in the lower place, not WHICH place it is.
    // GOES RED IF: the never-saved wording is drawn somewhere else, or above
    // the name.
    const root = drawn(HEADER_NEVER_SAVED)
    const order = selfAndDescendants(root)

    const name = order.indexOf(oneByRole(root, U_58))
    const time = order.indexOf(oneByRole(root, U_59))

    expect(time, `the header reads ${whatWasDrawn(oneByRole(root, U_31))}`).toBeGreaterThan(name)
    expect(oneByRole(root, U_59).textContent).toContain('FileNeverSavedHere')
  })
})
