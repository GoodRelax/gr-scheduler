// Unit tests for UF-71 `dom-screen-surface.ts` -- table T-075 of
// docs/spec/05-07-design.md, component `DomScreenSurface` (CP-38 of table
// T-062), published as PI-38 of table T-064. It is the implementation of
// `ScreenSurface` (IF-9 of table T-065).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, §1). What was read: docs/spec/ for every rule below, the
// seam declaration `src/adapter/screen-renderer/screen-surface.ts`, the
// `ScreenView` family in `src/adapter/screen-renderer/screen-renderer.ts`, and
// of the unit itself only its head comment, the exported interface
// `ScreenSurfaceWiring` and the one signature
// `domScreenSurface(wiring): ScreenSurface`. Every expected value here comes
// from a requirement, a table, or a recorded provisional decision -- never from
// the implementation.
//
// ⭐ WHY THE FAKE IS SHAPED THE WAY IT IS. This is a Framework unit: it builds
// nodes, and `npm test` runs under Node with no DOM at all (vitest.config.ts
// sets `environment: 'node'`). R7.3 and LY-5 of table T-060 ask for the browser
// to be handed in rather than reached for, so the unit takes a `Document` as an
// argument and these cases hand it `fakeWorld()` instead.
// ⚠️ R6.3 warns that a fake can quietly become the thing under test, so the
// cases below assert what the unit DID to the fake -- which nodes it made, with
// which attributes, which node it measured, which listeners it registered and
// on what, what it wrote where, and in what order -- and not merely that a call
// came back. The host is a Proxy that records every member the unit reaches
// for, so a unit that reached past `createElement` is visible rather than
// silent. `innerHTML` is an accessor that records, so FR-023's MUST NOT is
// observable rather than assumed.
//
// The rules these cases answer to:
//   表 T-065 IF-9   the seam this unit implements, and the rule that its supply
//                   is not widened -- exactly the members that cell names, with
//                   the purities the declaration fixes. ⚠️ CR-192 added a third
//                   supply to that cell（画面上の点がどの UI パーツのどの入口の
//                   上かを答える）, so the count below is three
//   表 T-077 BO-1   the dimensions are settled first, and 「寸法が確定するまで
//                   1 枚も描かない」; NFR-011's rationale names the 0×0 window
//                   as one of the two things this ordering exists to stop
//   FR-051          the `App Header`'s height is settled FROM THE ENVIRONMENT
//                   at startup and MUST NOT be held as a setting;
//                   `appHeaderMaxHeight` (S-116 of 表 T-212) is the upper bound
//                   and not the height
//   表 T-078 FT-3   a changed screen dimension is a trigger the shell observes;
//                   with NFR-010, nothing this table does not list may wake a
//                   frame -- so no timer and no listener that draws
//   表 T-035 AG-11  what has not been settled MUST NOT be read as an utterance
//   FR-066          the field is up only while the `Agent API` is on
//   FR-029          用途を言葉ではなくアイコンで伝える; 「各アイコンの図形は
//                   同書の 図 F-019 に従うこと（MUST）」; and what cannot be used
//                   is drawn faint and gives its reason, rather than going quiet
//   表 T-028 IN-3   a tooltip can be dismissed, can be pointed at, and does not
//                   go away by itself
//   表 T-040 EZ-2   the explanation belongs to the entry the pointer rests on,
//                   so the entry has to be findable -- `data-icon` is the join
//   表 T-103        the settled names of the UI parts, so the parts can be found
//   表 T-031        SC-1 / SC-4 / SC-5 -- what scrolls with what, and that both
//                   scrollbars are drawn whether things fit or not
//   FR-099 / 表 T-037  the roster shows unassigned tasks BY NAME (MUST NOT
//                   reduce them to a count); NT-1 / NT-3 / NT-3a fix what a
//                   notice has to carry
//   FR-023          nothing that arrived from a document may become markup
//   FR-038          the words are carried, not chosen; which language is on has
//                   to be readable BEFORE the toggle is pressed
//   表 T-060 LY-5   the Framework is the only layer that holds a current value,
//                   and the browser and the clock arrive as arguments
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
// be driven by a fixed copy of that table. `T_103_PARTS` and `T_212_S_116` are
// those copies, and both are checked against the .md at read time so that they
// cannot fall behind the table.
//
// ⭐ THE SHAPES ARRIVED, AND THESE CASES FOLLOWED THE REQUIREMENT RATHER THAN
// THE CODE. FR-029 (MUST) has this product tell what a menu is for 「言葉では
// なくアイコンで」 and makes 図 F-019 the authority for every icon's shape
// (MUST). Until that figure was carried into `src/` there was nothing to draw,
// and PD-154 wrote down the retreat taken meanwhile: 「行 ID を `data-icon` に
// 置き、図形は描かない」 -- so an entry printed its ROW ID as its body, three
// cases below measured that text, and two more counted the members the host was
// asked for. ⛔ The figure is generated into `src/` now
// (`tools/generate_icon_glyphs.py`, `npm run gen:check`), the entries draw the
// shape, and those five cases were false against FR-029 the moment it landed.
// What replaced them is what the requirement actually asks for:
//   - the ROW ID stays reachable for the machine, in `data-icon` (EZ-2 of 表
//     T-040 needs it, and IF-9's `readScreenPartAt` walks it);
//   - the WORD is the entry's accessible name, which is what
//     `CommandItem.label` is declared to be, taken from FR-038's per-language
//     dictionary -- with the row id as the fallback while PD-160 leaves every
//     cell of that dictionary empty;
//   - the SHAPE is the figure's, carried and not invented.
// ⚠️ PD-154 in docs/development-records/pending-decisions.md still records the
// retreat as its provisional decision. A record is not the specification, and
// FR-029 is a MUST; where the two disagree the requirement is followed here.
//
// ⚠️ SIX THINGS ARE DELIBERATELY NOT ASSERTED, because no requirement decides
// them. Each is written down where it would otherwise have been tested, so a
// reader can tell an untested question from an untested unit:
//   - how a tooltip node NAMES the entry it is anchored to (EZ-2 fixes that the
//     explanation belongs to that entry, and nothing fixes the spelling of the
//     link); see the note in the IN-3 describe
//   - what a measured height ABOVE S-116's bound does here -- FR-051 makes
//     S-116 the bound and 表 T-077's BO-1 puts the clamp in `ScreenRegions`,
//     so this unit's share is only that the number is the measurement
//   - which CSS property carries a place (PD-151 records the choice as display
//     only); the cases below assert that the numbers the description carries
//     REACH the drawn node, never which property spells them
//   - what the `Row Title Tree` draws for a row whose `label` is `null`
//     (FR-058 forbids the document to hold one, and no requirement says what to
//     draw when one arrives anyway)
//   - whether the entry keeps what was typed across a frame in which the field
//     is down; FR-066 settles only that the field is not up
//   - what the `Row Title Panel` draws when the frame lists no `Panel Divider`
//     for it. PD-155's fallback (the window's edge and the contents' width) is
//     a provisional decision, and SC-3 of 表 T-031 speaks of the panel not
//     scrolling away rather than of a background, so nothing here decides it

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  dialogueMessageFromInput,
  type AppHeaderItems,
  type CommandItem,
  type CommandPalette,
  type DialogueField,
  type Notice,
  type OpenModal,
  type PropertiesPanel,
  type PropertyField,
  type RowTitle,
  type ScreenFrame,
  type ScreenSurface,
  type ScreenView,
  type Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that
// takes the copy from the .md at read time, which is what keeps the two rosters
// below from falling behind a row.
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * 表 T-103 — UI パーツ, for the parts this unit draws.
 *
 * ⭐ The settled name is what reaches the DOM as `data-role`, so a part can be
 * found by the name the specification gave it rather than by a shape. The `row`
 * column is here so that a failure names one line of the specification (1.9
 * :274), and `readsFromTable` below checks every name against the table itself.
 *
 * ⚠️ `U-30` spells two names in one cell and `U-34` / `U-35` do the same, which
 * is why the copy is a list of names rather than a list of rows.
 */
const T_103_PARTS = [
  { row: 'U-21', name: 'Scrollbars' },
  { row: 'U-22', name: 'Row Title Panel' },
  { row: 'U-23', name: 'Row Title Tree' },
  { row: 'U-24', name: 'Panel Divider' },
  { row: 'U-25', name: 'Properties Panel' },
  { row: 'U-26', name: 'Command Palette' },
  { row: 'U-27', name: 'Document Title' },
  { row: 'U-58', name: 'Opened File Name' },
  { row: 'U-59', name: 'File Saved At' },
  { row: 'U-30', name: 'Help Modal' },
  { row: 'U-30', name: 'AI Export Modal' },
  { row: 'U-31', name: 'App Header' },
  { row: 'U-34', name: 'Palette Groups' },
  { row: 'U-34', name: 'Palette Commands' },
  { row: 'U-35', name: 'Header Commands' },
  { row: 'U-44', name: 'Dialogue Field' },
  { row: 'U-46', name: 'Pinned Row' },
  { row: 'U-47', name: 'Row Expander' },
  { row: 'U-48', name: 'Row Pin' },
  { row: 'U-49', name: 'Resource Roster' },
  { row: 'U-53', name: 'Tooltip' },
  { row: 'U-57', name: 'Notification Area' },
] as const

/**
 * The settled name 表 T-103 gives one row, out of the copy above.
 *
 * ⭐ W-4 of 表 T-006a (MUST) has a `data-role` that carries a settled name carry
 * it in `W-6`'s form, so a case looks a part up by its ROW and never by a
 * spelling typed into the case itself. `readsFromTable` checks the copy against
 * the .md, so a name that moves in the table moves here too.
 *
 * ⚠️ `U-30` / `U-34` / `U-35` spell two names in one cell; this returns the
 * first of them, so it is for the rows that name exactly one part.
 */
function partName(row: string): string {
  const found = T_103_PARTS.find((one) => one.row === row)
  if (found === undefined) throw new Error(`the copy of 表 T-103 no longer holds ${row}`)
  return found.name
}

/**
 * `S-116` of 表 T-212, read from the .md.
 *
 * ⭐ FR-051 says in as many words that this is the UPPER BOUND and not the
 * height. The cases use the VALUE only to prove the reported number is not it,
 * and the two bounds only to keep the measurements they drive with inside the
 * band -- so that no clamp can be confused with a measurement.
 */
function s116(): { readonly value: number; readonly min: number; readonly max: number } {
  const row = specTable('T-212').rows.find((one) => one.id === 'S-116')
  if (row === undefined) throw new Error('表 T-212 no longer holds S-116')
  const digits = (cell: string | undefined): number => {
    const found = /-?\d+(?:\.\d+)?/.exec(cell ?? '')
    if (found === null) throw new Error(`S-116 cell holds no number: ${String(cell)}`)
    return Number(found[0])
  }
  return { value: digits(row.cells[1]), min: digits(row.cells[2]), max: digits(row.cells[3]) }
}

const S_116 = s116()

/**
 * `S-138` of 表 T-206 -- the side of the box FR-029 (MUST) draws an entry's
 * shape in.
 *
 * ⭐ READ FROM THE MANUSCRIPT AT READ TIME, not typed here. FR-029 points at a
 * table for this number （「図形を描く箱の一辺は `_assets/tbl-settings.md` の
 * 表 T-206 の `S-138` に従うこと（MUST）」）, and Chapter 1.9 (:275) asks a case
 * that drives such a requirement to be driven by a copy of that table. Taking
 * the copy out of the .md is that rule read as strictly as it can be: move the
 * row and every case below moves with it.
 *
 * ⚠️ 表 T-206's columns are 行 ID | 値 | 既定 | 保存しない理由, so the number is
 * in 既定 and NOT in 値 -- that column holds the row's description.
 */
function s138(): { readonly px: number; readonly cell: string } {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-138')
  if (row === undefined) throw new Error('表 T-206 no longer holds S-138')
  const cell = row.by['既定'] ?? ''
  const found = /(\d+(?:\.\d+)?)\s*px/.exec(cell)
  if (found === null) throw new Error(`S-138 states no px value in its 既定 column: ${cell}`)
  return { px: Number(found[1]), cell }
}

const S_138 = s138()

/**
 * `S-141` of 表 T-206 -- the LEAST gap FR-029 (MUST) keeps between an entry's
 * shape and the entrance's frame.
 *
 * ⭐ READ FROM THE MANUSCRIPT for the reason `s138` gives: FR-029 points at the
 * table for this number too （「図形と入口の枠のあいだに、… 表 T-206 の
 * `S-141` が定める隙間を最低限あけること（MUST）」）.
 */
function s141(): { readonly px: number; readonly cell: string } {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-141')
  if (row === undefined) throw new Error('表 T-206 no longer holds S-141')
  const cell = row.by['既定'] ?? ''
  const found = /(\d+(?:\.\d+)?)\s*px/.exec(cell)
  if (found === null) throw new Error(`S-141 states no px value in its 既定 column: ${cell}`)
  return { px: Number(found[1]), cell }
}

const S_141 = s141()

/**
 * 図 F-019 — the authority FR-029 names for every icon's shape (MUST), as it
 * reaches `src/`.
 *
 * ⭐ READ, NOT COPIED, AND NOT INVENTED HERE. `docs/spec/_assets/fig-icons.svg`
 * is the figure itself; `tools/generate_icon_glyphs.py` carries it into
 * `icon-glyphs.json` cross-checked against table T-109, and `npm run gen:check`
 * is what fails when the figure moves on without it. So a case that compares
 * what was DRAWN against this file is asking whether the unit put the figure's
 * shape on the page or one of its own -- which is the MUST -- while the
 * figure-to-`src/` step stays the generator's to guard.
 */
interface GlyphElement {
  readonly tag: string
  readonly attributes: readonly { readonly name: string; readonly value: string }[]
}

const ICON_GLYPHS = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'icon-glyphs.json'),
    'utf8',
  ),
) as {
  readonly viewBox: string
  readonly glyphs: readonly { readonly rowId: string; readonly elements: readonly GlyphElement[] }[]
}

const glyphFor = (row: string): readonly GlyphElement[] => {
  const found = ICON_GLYPHS.glyphs.find((one) => one.rowId === row)
  if (found === undefined) throw new Error(`図 F-019 draws no shape for ${row}`)
  return found.elements
}

// ---------------------------------------------------------------------------
// The fake browser.
// ---------------------------------------------------------------------------

interface FakeEvent {
  readonly type: string
  readonly key: string
  readonly isComposing: boolean
  readonly shiftKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
  target: FakeElement | null
  currentTarget: FakeElement | null
  defaultPrevented: boolean
  preventDefault(): void
  stopPropagation(): void
}

interface Registration {
  readonly node: FakeElement
  readonly type: string
  readonly listener: (event: FakeEvent) => void
}

/** One write to an element's inline style, in the order the unit made it. */
type StyleWrite = { readonly kind: 'reset'; readonly css: string } | { readonly kind: 'set'; readonly property: string; readonly value: string }

class FakeText {
  parentNode: FakeElement | null = null
  constructor(public data: string) {}
}

type FakeNode = FakeElement | FakeText

class FakeElement {
  readonly tagName: string
  readonly attributes = new Map<string, string>()
  readonly childNodes: FakeNode[] = []
  readonly styleWrites: StyleWrite[] = []
  parentNode: FakeElement | null = null
  /** Only an `input` really has one; harmless elsewhere and it keeps the fake small. */
  value = ''
  isMount = false

  constructor(
    tagName: string,
    private readonly world: World,
  ) {
    this.tagName = tagName.toUpperCase()
  }

  // -- attributes ---------------------------------------------------------

  setAttribute(name: string, value: string): void {
    if (name === 'style') {
      this.styleWrites.push({ kind: 'reset', css: value })
      return
    }
    this.attributes.set(name, String(value))
  }

  getAttribute(name: string): string | null {
    if (name === 'style') return inlineStyle(this)
    return this.attributes.get(name) ?? null
  }

  hasAttribute(name: string): boolean {
    if (name === 'style') return this.styleWrites.length > 0
    return this.attributes.has(name)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  get dataset(): Record<string, string> {
    const element = this
    return new Proxy(
      {},
      {
        get(_target, property): string | undefined {
          if (typeof property !== 'string') return undefined
          return element.attributes.get(`data-${kebab(property)}`)
        },
        set(_target, property, value): boolean {
          if (typeof property === 'string') {
            element.attributes.set(`data-${kebab(property)}`, String(value))
          }
          return true
        },
      },
    ) as Record<string, string>
  }

  get id(): string {
    return this.attributes.get('id') ?? ''
  }

  set id(value: string) {
    this.attributes.set('id', value)
  }

  get className(): string {
    return this.attributes.get('class') ?? ''
  }

  set className(value: string) {
    this.attributes.set('class', value)
  }

  get classList(): {
    add: (...names: string[]) => void
    remove: (...names: string[]) => void
    contains: (name: string) => boolean
    toggle: (name: string, force?: boolean) => void
  } {
    const element = this
    const names = (): Set<string> =>
      new Set(element.className.split(/\s+/).filter((one) => one.length > 0))
    const write = (set: Set<string>): void => {
      element.className = [...set].join(' ')
    }
    return {
      add: (...added) => {
        const set = names()
        for (const one of added) set.add(one)
        write(set)
      },
      remove: (...removed) => {
        const set = names()
        for (const one of removed) set.delete(one)
        write(set)
      },
      contains: (name) => names().has(name),
      toggle: (name, force) => {
        const set = names()
        const on = force ?? !set.has(name)
        if (on) set.add(name)
        else set.delete(name)
        write(set)
      },
    }
  }

  /** ⛔ FR-023: an assignment here would be markup. It is recorded, never obeyed. */
  get innerHTML(): string {
    this.world.markupWrites.push({ node: this, value: '(read)' })
    return ''
  }

  set innerHTML(value: string) {
    this.world.markupWrites.push({ node: this, value })
  }

  get style(): Record<string, string> {
    const element = this
    return new Proxy(
      {},
      {
        get(_target, property): unknown {
          if (property === 'setProperty') {
            return (name: string, value: string): void => {
              element.styleWrites.push({ kind: 'set', property: name, value })
            }
          }
          if (typeof property !== 'string') return undefined
          return styleMap(element).get(kebab(property)) ?? ''
        },
        set(_target, property, value): boolean {
          if (typeof property !== 'string') return true
          if (property === 'cssText') {
            element.styleWrites.push({ kind: 'reset', css: String(value) })
            return true
          }
          element.styleWrites.push({ kind: 'set', property: kebab(property), value: String(value) })
          return true
        },
      },
    ) as Record<string, string>
  }

  /**
   * ⚠️ Mirrors the real property so that a unit which wrote `el.disabled = true`
   * instead of `setAttribute` is caught by the same case: FR-029 asks for the
   * entry to stay pointable, and either spelling takes it out of the tree.
   */
  get disabled(): boolean {
    return this.attributes.has('disabled')
  }

  set disabled(value: boolean) {
    if (value) this.attributes.set('disabled', '')
    else this.attributes.delete('disabled')
  }

  // -- the tree -----------------------------------------------------------

  private adopt(node: FakeNode | string): FakeNode {
    if (typeof node === 'string') return new FakeText(node)
    node.parentNode?.detach(node)
    return node
  }

  private detach(node: FakeNode): void {
    const at = this.childNodes.indexOf(node)
    if (at >= 0) this.childNodes.splice(at, 1)
    node.parentNode = null
  }

  append(...nodes: (FakeNode | string)[]): void {
    for (const one of nodes) {
      const node = this.adopt(one)
      node.parentNode = this
      this.childNodes.push(node)
    }
  }

  appendChild(node: FakeNode): FakeNode {
    this.append(node)
    return node
  }

  replaceChildren(...nodes: (FakeNode | string)[]): void {
    for (const one of [...this.childNodes]) this.detach(one)
    this.append(...nodes)
  }

  removeChild(node: FakeNode): FakeNode {
    this.detach(node)
    return node
  }

  insertBefore(node: FakeNode, reference: FakeNode | null): FakeNode {
    const adopted = this.adopt(node)
    const at = reference === null ? this.childNodes.length : this.childNodes.indexOf(reference)
    this.childNodes.splice(at < 0 ? this.childNodes.length : at, 0, adopted)
    adopted.parentNode = this
    return adopted
  }

  remove(): void {
    this.parentNode?.detach(this)
  }

  get children(): FakeElement[] {
    return this.childNodes.filter((one): one is FakeElement => one instanceof FakeElement)
  }

  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null
  }

  get lastChild(): FakeNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null
  }

  get textContent(): string {
    return this.childNodes
      .map((one) => (one instanceof FakeText ? one.data : one.textContent))
      .join('')
  }

  set textContent(value: string) {
    for (const one of [...this.childNodes]) this.detach(one)
    if (value !== '') this.append(new FakeText(value))
  }

  get isConnected(): boolean {
    let at: FakeElement | null = this
    while (at !== null) {
      if (at.isMount) return true
      at = at.parentNode
    }
    return false
  }

  contains(node: FakeElement): boolean {
    let at: FakeElement | null = node
    while (at !== null) {
      if (at === this) return true
      at = at.parentNode
    }
    return false
  }

  closest(selector: string): FakeElement | null {
    let at: FakeElement | null = this
    while (at !== null) {
      if (matches(at, selector)) return at
      at = at.parentNode
    }
    return null
  }

  querySelector(selector: string): FakeElement | null {
    this.world.selectors.push(selector)
    return descendants(this).find((one) => matches(one, selector)) ?? null
  }

  querySelectorAll(selector: string): FakeElement[] {
    this.world.selectors.push(selector)
    return descendants(this).filter((one) => matches(one, selector))
  }

  // -- what only a browser can answer -------------------------------------

  getBoundingClientRect(): {
    x: number
    y: number
    width: number
    height: number
    top: number
    left: number
    right: number
    bottom: number
  } {
    this.world.measured.push(this)
    const role = this.attributes.get('data-role') ?? ''
    const height = this.world.heightsByRole.get(role) ?? 0
    const width = this.world.widthsByRole.get(role) ?? 0
    return { x: 0, y: 0, width, height, top: 0, left: 0, right: width, bottom: height }
  }

  focus(): void {
    this.world.activeElement = this
  }

  blur(): void {
    if (this.world.activeElement === this) this.world.activeElement = null
  }

  // -- events -------------------------------------------------------------

  addEventListener(type: string, listener: (event: FakeEvent) => void): void {
    this.world.registrations.push({ node: this, type, listener })
  }

  removeEventListener(type: string, listener: (event: FakeEvent) => void): void {
    const at = this.world.registrations.findIndex(
      (one) => one.node === this && one.type === type && one.listener === listener,
    )
    if (at >= 0) this.world.registrations.splice(at, 1)
  }

  dispatchEvent(event: FakeEvent): boolean {
    event.target = this
    let stopped = false
    const stop = event.stopPropagation.bind(event)
    Object.defineProperty(event, 'stopPropagation', {
      configurable: true,
      value: (): void => {
        stopped = true
        stop()
      },
    })
    let at: FakeElement | null = this
    while (at !== null && !stopped) {
      const here: FakeElement = at
      for (const one of [...this.world.registrations]) {
        if (one.node === here && one.type === event.type) {
          event.currentTarget = here
          one.listener(event)
        }
      }
      at = at.parentNode
    }
    return !event.defaultPrevented
  }
}

interface World {
  readonly created: FakeElement[]
  readonly registrations: Registration[]
  readonly measured: FakeElement[]
  readonly selectors: string[]
  readonly markupWrites: { node: FakeElement; value: string }[]
  readonly hostMembers: string[]
  readonly heightsByRole: Map<string, number>
  readonly widthsByRole: Map<string, number>
  activeElement: FakeElement | null
}

interface Stage {
  readonly world: World
  readonly host: Document
  readonly mount: FakeElement
  /** Every number `onAppHeaderHeightPx` was told, in order. */
  readonly reportedHeights: number[]
  /** ⭐ Whether the surface existed yet when each report arrived (contract line 1). */
  readonly reportedBeforeFactoryReturned: boolean[]
  readonly authors: string[]
  clockMs: number
  author: string
  surface: ScreenSurface | undefined
  /**
   * The one way in the unit hands over for putting a person into a field of the
   * `Properties Panel`, or `null` while it has handed nothing over.
   *
   * ⭐ IT DOES NOT TRAVEL ON IF-9, AND THE MANUSCRIPT IS WHY. 表 T-065's cell for
   * IF-9 names five supplies and every one of them is a QUESTION the shell asks,
   * so a state of the page cannot be asked for across that seam; the Framework's
   * own wiring is the arrangement `onAppHeaderHeightPx` already travels on.
   * ⭐⭐ HF-14 OF 表 T-051 SHARES IT RATHER THAN GROWING ONE OF ITS OWN, which is
   * that row's (MUST NOT): 「**改名と別の道を作ってはならない（MUST NOT）。道は
   * `FR-085` が改名について定めるものと同じものとすること（MUST）**」.
   */
  focusField: ((row: string) => void) | null
  /** The tree the unit built inside the mount. */
  root(): FakeElement
}

/**
 * A browser that is only what `ScreenSurfaceWiring` says it is.
 *
 * ⚠️ The host is a Proxy so that every member the unit reaches for is recorded:
 * the wiring says 「Only `createElement` is called on it」, and a claim of that
 * shape is worth nothing unless the fake can tell.
 */
function stage(heightsByRole: Record<string, number> = {}): Stage {
  const world: World = {
    created: [],
    registrations: [],
    measured: [],
    selectors: [],
    markupWrites: [],
    hostMembers: [],
    heightsByRole: new Map(Object.entries(heightsByRole)),
    widthsByRole: new Map(),
    activeElement: null,
  }

  const document = {
    createElement(tagName: string): FakeElement {
      const made = new FakeElement(tagName, world)
      world.created.push(made)
      return made
    },
  }
  const host = new Proxy(document, {
    get(target, property, receiver): unknown {
      if (typeof property === 'string') world.hostMembers.push(property)
      return Reflect.get(target, property, receiver)
    },
  }) as unknown as Document

  const mount = new FakeElement('div', world)
  mount.isMount = true

  const made: Stage = {
    world,
    host,
    mount,
    reportedHeights: [],
    reportedBeforeFactoryReturned: [],
    authors: [],
    clockMs: Date.UTC(2026, 7, 20, 3, 4, 5),
    author: 'Watcher',
    surface: undefined,
    focusField: null,
    root(): FakeElement {
      const first = mount.children[0]
      if (first === undefined) throw new Error('the unit mounted nothing')
      return first
    },
  }
  return made
}

/**
 * The rendering and hue every case below wires the surface with.
 *
 * ⛔ NEITHER VALUE IS TYPED HERE. Rule 03 section 1 keeps a value the manuscript
 * holds in one place: S-72's default arrives through the generated
 * `SETTINGS_DEFAULTS`, and S-73's is read out of table T-216 at load time,
 * because DR-5 of table T-052 keeps the hue on `Project` rather than in the
 * settings and no generated constant carries it.
 *
 * ⭐ THE DEFAULT RENDERING IS THE HONEST NEUTRAL HERE. No case in this file
 * reads a colour back: `readTheme` is a REQUIRED member of
 * `ScreenSurfaceWiring` (FR-041 MUST NOT leaves the environment no say), so the
 * cases need a theme to build the surface at all, not a particular one. A file
 * that meant dark would say dark.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME: ScreenTheme = {
  preference: SETTINGS_DEFAULTS['themePreference'] as ScreenTheme['preference'],
  hue: Number(bare(S_73.by['既定'] ?? '')),
}

function wiringOf(built: Stage): ScreenSurfaceWiring {
  return {
    host: built.host,
    mount: built.mount as unknown as Element,
    readAuthor: (): string => {
      built.authors.push(built.author)
      return built.author
    },
    readClockMs: (): number => built.clockMs,
    onAppHeaderHeightPx: (heightPx: number): void => {
      built.reportedHeights.push(heightPx)
      built.reportedBeforeFactoryReturned.push(built.surface === undefined)
    },
    // 表 T-023's MK-13 and FR-085 (MUST): the way a person is put into the name
    // field of the `Properties Panel`. ⭐ HF-14 of 表 T-051 (MUST) names THIS
    // road for the row it stands up -- 「**道は `FR-085` が改名について定めるもの
    // と同じものとすること（MUST）**」 -- and forbids a second one.
    holdFocusPropertyField: (focus: (row: string) => void): void => {
      built.focusField = focus
    },
    readTheme: (): ScreenTheme => THEME,
  }
}

/** Wire the unit up the way contract line 1 asks the caller to. */
function wire(heightsByRole: Record<string, number> = {}): Stage {
  const built = stage(heightsByRole)
  const surface = domScreenSurface(wiringOf(built))
  built.surface = surface
  return built
}

function surfaceOf(built: Stage): ScreenSurface {
  if (built.surface === undefined) throw new Error('the surface was not built')
  return built.surface
}

// ---------------------------------------------------------------------------
// Reading the tree the unit built.
// ---------------------------------------------------------------------------

const kebab = (name: string): string => name.replace(/[A-Z]/g, (one) => `-${one.toLowerCase()}`)

function styleMap(element: FakeElement): Map<string, string> {
  const held = new Map<string, string>()
  for (const write of element.styleWrites) {
    if (write.kind === 'reset') {
      held.clear()
      for (const one of write.css.split(';')) {
        const at = one.indexOf(':')
        if (at < 0) continue
        held.set(one.slice(0, at).trim().toLowerCase(), one.slice(at + 1).trim())
      }
      continue
    }
    held.set(write.property.toLowerCase(), write.value)
  }
  return held
}

/** The inline style as it stands now, with later writes winning over earlier ones. */
function inlineStyle(element: FakeElement): string {
  return [...styleMap(element)].map(([property, value]) => `${property}:${value}`).join(';')
}

/** ⚠️ Whitespace-free and lower case, so a case never depends on how a value was spaced. */
const styleOf = (element: FakeElement): string =>
  inlineStyle(element).replace(/\s+/g, '').toLowerCase()

function descendants(element: FakeElement): FakeElement[] {
  const found: FakeElement[] = []
  for (const child of element.children) {
    found.push(child, ...descendants(child))
  }
  return found
}

const selfAndDescendants = (element: FakeElement): FakeElement[] => [
  element,
  ...descendants(element),
]

const byRole = (root: FakeElement, role: string): FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.getAttribute('data-role') === role)

function oneByRole(root: FakeElement, role: string): FakeElement {
  const found = byRole(root, role)
  if (found.length !== 1) {
    throw new Error(`expected exactly one [data-role="${role}"], found ${found.length}`)
  }
  const first = found[0]
  if (first === undefined) throw new Error('unreachable')
  return first
}

/** Hidden the way BO-1 asks for: laid out (so it can be measured) but not shown. */
const isHiddenHere = (element: FakeElement): boolean => {
  const style = styleOf(element)
  return style.includes('visibility:hidden') || style.includes('display:none')
}

const isShown = (element: FakeElement): boolean => {
  let at: FakeElement | null = element
  while (at !== null) {
    if (isHiddenHere(at)) return false
    at = at.parentNode
  }
  return true
}

/** Attributes and text together, for a case that asks whether something reached the page at all. */
function serialize(element: FakeElement): string {
  const attributes = [...element.attributes].map(([name, value]) => ` ${name}="${value}"`).join('')
  const style = inlineStyle(element)
  const inside = element.childNodes
    .map((one) => (one instanceof FakeText ? one.data : serialize(one)))
    .join('')
  return `<${element.tagName.toLowerCase()}${attributes}${style === '' ? '' : ` style="${style}"`}>${inside}</${element.tagName.toLowerCase()}>`
}

/**
 * What this node's `color` was WRITTEN as, lower case.
 *
 * ⚠️ Written and not resolved: FR-041 (MUST) has one declaration on the root
 * carry 表 T-236 for the whole tree, so a part states which colour it takes and
 * this answers that name. `paintedColour` below resolves it.
 */
const colourOf = (element: FakeElement): string =>
  (styleMap(element).get('color') ?? '').trim().toLowerCase()

/**
 * The one shape an entry draws -- FR-029's 「アイコンで伝える」, whose figure is
 * F-019.
 *
 * ⚠️ Found by the tag the figure is drawn in rather than by an attribute of the
 * unit's choosing: F-019 is an SVG figure, so a carried shape is an `svg`
 * element or it is not the figure's.
 */
function shapeIn(entry: FakeElement): FakeElement {
  const found = selfAndDescendants(entry).filter((one) => one.tagName === 'SVG')
  if (found.length !== 1) {
    throw new Error(`the entry draws ${found.length} shapes, and FR-029 gives it one`)
  }
  return found[0] as FakeElement
}

/** Only what a person can still see: a hidden subtree contributes nothing. */
function shownText(element: FakeElement): string {
  if (isHiddenHere(element)) return ''
  return element.childNodes
    .map((one) => (one instanceof FakeText ? one.data : shownText(one)))
    .join('')
}

/** Every node between `from` (included) and `stopAt` (excluded), walking upwards. */
function chainUpTo(from: FakeElement, stopAt: FakeElement): FakeElement[] {
  const found: FakeElement[] = []
  let at: FakeElement | null = from
  while (at !== null && at !== stopAt) {
    found.push(at)
    at = at.parentNode
  }
  return found
}

const withText = (root: FakeElement, text: string): FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.textContent === text)

function theOneWithText(root: FakeElement, text: string): FakeElement {
  const found = withText(root, text)
  const deepest = found[found.length - 1]
  if (deepest === undefined) throw new Error(`nothing on the screen reads "${text}"`)
  return deepest
}

function keyPress(
  target: FakeElement,
  key: string,
  extra: Partial<FakeEvent> = {},
): FakeEvent {
  const event: FakeEvent = {
    type: 'keydown',
    key,
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: null,
    currentTarget: null,
    defaultPrevented: false,
    preventDefault(): void {
      ;(this as { defaultPrevented: boolean }).defaultPrevented = true
    },
    stopPropagation(): void {},
    ...extra,
  }
  target.dispatchEvent(event)
  return event
}

/**
 * A tiny selector engine: enough for `[attr]`, `[attr="value"]`, a tag name and
 * a descendant combinator. ⭐ It exists so that a unit which DID query is not
 * failed for it -- the cases assert what was queried, not that nothing was.
 */
function matches(element: FakeElement, selector: string): boolean {
  const parts = selector.trim().split(/\s+(?![^[]*\])/)
  const last = parts[parts.length - 1]
  if (last === undefined) return false
  if (!matchesSimple(element, last)) return false
  let at = element.parentNode
  for (let index = parts.length - 2; index >= 0; index -= 1) {
    const want = parts[index]
    if (want === undefined) continue
    let found = false
    while (at !== null) {
      if (matchesSimple(at, want)) {
        found = true
        at = at.parentNode
        break
      }
      at = at.parentNode
    }
    if (!found) return false
  }
  return true
}

function matchesSimple(element: FakeElement, selector: string): boolean {
  const attribute = /^\[([^\]=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/.exec(selector)
  if (attribute !== null) {
    const name = attribute[1] ?? ''
    const wanted = attribute[2] ?? attribute[3] ?? attribute[4]
    const held = element.getAttribute(name)
    if (held === null) return false
    return wanted === undefined || held === wanted
  }
  if (selector.startsWith('#')) return element.id === selector.slice(1)
  if (selector.startsWith('.')) return element.classList.contains(selector.slice(1))
  return element.tagName === selector.toUpperCase()
}

// ---------------------------------------------------------------------------
// Descriptions to draw. Every one is a value of `ScreenView` and nothing else.
// ---------------------------------------------------------------------------

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [],
  // FR-038 (MUST): the header says which language is on. The same value the
  // view carries -- `ScreenSession.language` (S-99) is where both come from.
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

/** ⭐ Every optional part null and every list empty -- the boundary BO-1 starts from. */
const EMPTY_VIEW: ScreenView = {
  // S-99. UF-71 draws what it is handed and chooses no word of its own, so this
  // member is inert for every case below.
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

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...EMPTY_VIEW, ...patch })

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  // FR-053: the entrance is not armed. ⛔ A separate member from `isPressed`,
  // because IC-54 says the palette entry is not a button and FR-053 (MUST NOT)
  // bars the pressed form -- so an arm may not travel on the toggle.
  isArmed: false,
  label: patch.icon,
  ...patch,
})

const ROW_TITLE_INDENT = SETTINGS_DEFAULTS['rowTitleIndent'] as number

const rowTitle = (patch: Partial<RowTitle> & { groupId: string }): RowTitle => ({
  depth: patch.depth ?? 1,
  // `FR-085` takes 「その行の深さぶんのインデント（`rowTitleIndent`。
  // 表 T-201 の `S-37`）」 off the usable width, so a row at depth n carries n
  // of them. ⭐ The description carries the number; this unit invents none.
  indentPx: (patch.depth ?? 1) * ROW_TITLE_INDENT,
  box: rect(0, 0, 170, 24),
  label: patch.groupId,
  // Nothing is cut here, and the `RowTitle` contract fixes that case as
  // `wholeLabel === label` with `isLabelTruncated` false.
  wholeLabel: patch.groupId,
  isLabelTruncated: false,
  // ⭐ A ROW WITH NOTHING TO FOLD, WHICH IS NOT A ROW WITHOUT CONTROLS. This
  // read `null` until 2026-08-30, when `RowTitle.expander` stopped being
  // nullable: 表 T-051 の `HF-1` puts the three on 「各行」 and the closing
  // paragraph under that table gives 「対象が 1 つも無い」 as a STATE the three
  // carry -- which `FR-029` (MUST) then draws 薄く -- rather than as their
  // absence. ⚠️ The neutral fixture is therefore the three with none armed.
  expander: { canOpen: false, canClose: false, canCloseBelow: false },
  isPinned: false,
  isSelected: false,
  ...patch,
})

const notice = (patch: Partial<Notice> & { manner: string; text: string }): Notice => ({
  // `mannerText` is the word UF-67 reads for the manner; no case here varies it.
  mannerText: '',
  nextSteps: [],
  affectedCount: null,
  // NT-8 (MUST): every telling carries the entrance that puts it away, and the
  // key that says WHICH telling a press on it put away. Cases that mean them
  // hand over their own.
  dismissText: 'OK',
  dismissKey: patch.manner,
  ...patch,
})

const PALETTE: CommandPalette = {
  // ⭐ A CORNER, NOT A RECTANGLE. FR-053 (MUST) makes the palette's size follow
  // its contents and (MUST NOT) bars the settings table from holding one, so
  // the description carries the place it floats at and nothing else; what it
  // measures out to is this unit's own answer.
  at: { x: 400, y: 300 },
  // GR-19 of 表 T-023d -- how far down the band along the palette's top edge
  // reaches. ⚠️ THE NUMBER IS THIS FILE'S OWN and no case here means it: 表
  // T-206 states the height at `S-135a`, and rule 03 section 1 keeps that value
  // in one place -- `tests/unit/uf-65.test.ts` is the bench that holds a
  // described band to the manuscript. What THIS unit owes the band is where it
  // is drawn and what it is marked with, not how tall the description says it is.
  grabBandHeight: 10,
  minimise: {
    icon: 'IC-75',
    label: 'IC-75',
    isEnabled: true,
    isPressed: false,
    isArmed: false,
  },
  isMinimised: false,
  groups: [
    {
      name: 'PaletteGroupOne',
      commands: [command({ icon: 'IC-61', label: 'PaletteCommandOne' })],
    },
  ],
  armedText: 'ArmedNothing',
}

/**
 * ⛔ NO HEADING IS OFFERED. FR-072 (MUST NOT) refuses the panel one -- 「⛔ **パネ
 * ルの先頭に見出しの行を置いてはならない（MUST NOT）**（利用者の指示 2026-08-27）」
 * (CR-272) -- so the only word this description carries is its field's item name,
 * which FR-006 (MUST) does put on the screen: 「項目名は値の欄の左に置き、右詰めに
 * すること（MUST）」. The cases below that used to look for the heading look for
 * that name instead.
 *
 * ⚠️ THE CAST IS DELIBERATE AND NARROW: whether the published description still
 * declares a member for a heading is the implementation's answer, and a fixture
 * that turned either answer into a COMPILE error would take every case in this
 * file down with it. Rule 04 section 1 asks a disagreement to arrive as a test
 * that falls, and tests/unit/uf-64.test.ts is where that one falls.
 */
const PROPERTIES: PropertiesPanel = {
  showing: 'selection',
  isSubjectGone: false,
  fields: [{ row: 'PR-3', name: 'start', text: '2026-08-20', isEditable: true, controls: [] }],
  commands: [],
} as PropertiesPanel

const DIALOGUE: DialogueField = {
  messages: [{ sequence: 1, author: 'Someone', text: 'MessageOne', settledAt: '2026-08-19T00:00:00Z' }],
}

const HELP_MODAL: OpenModal = {
  surface: 'Help Modal',
  heading: 'HelpHeading',
  commands: [command({ icon: 'IC-52', label: 'CloseHelp' })],
  entries: [{ table: 'T-036', row: 'MK-1', text: 'HelpEntryOne', press: null, keys: null, icon: null }],
  language: 'en',
  licenceText: 'LicenceTextHere',
  copyrightNotice: 'CopyrightNoticeHere',
  attributions: ['AttributionOne'],
}

/**
 * ⭐ `EZ-2` of 表 T-040 (MUST) puts the row's assignment BEHIND the words, and
 * `FR-036` says of a row that has neither key nor mouse operation 「どちらも
 * 持たない行は、その場所を空ける」 -- so the member is always there and empty
 * is `null`, never an absent member.
 */
const iconTooltip = (icon: string, text: string, assignment: string | null = null): Tooltip => ({
  anchor: { kind: 'icon', icon },
  text,
  assignment,
})

/** A description that draws every part this unit owns, for the T-103 roster. */
const RICH_VIEW: ScreenView = viewWith({
  frame: {
    isFullScreen: false,
    dividers: [
      { panel: 'rowTitlePanel', band: rect(170, 40, 6, 700), line: rect(172, 40, 1, 700) },
      { panel: 'propertiesPanel', band: rect(800, 40, 6, 700), line: rect(802, 40, 1, 700) },
    ],
    scrollbars: [
      { axis: 'horizontal', track: rect(176, 730, 620, 8), thumb: rect(176, 730, 200, 8) },
      { axis: 'vertical', track: rect(788, 40, 8, 690), thumb: rect(788, 40, 8, 300) },
    ],
  },
  appHeaderItems: {
    documentTitle: 'DocumentTitleHere',
    // FR-101 (MUST): the name of the file that is open, and the moment it was
    // last written to. ⚠️ The name is NOT the `Document Title` -- U-58 of
    // 表 T-103 says in as many words that the two are different values and that
    // differing is normal, so the two fixtures here differ.
    openedFileName: 'OpenedFileNameHere.grs.json',
    fileSavedAt: '2026-08-29T01:02:03Z',
    fileNeverSavedText: 'FileNeverSavedHere',
    commands: [command({ icon: 'IC-20', label: 'HeaderCommandOne' })],
    // FR-038: the same language the view carries.
    language: 'ja',
  },
  rowTitlePanel: {
    pinnedTitles: [rowTitle({ groupId: 'g-pinned', label: 'PinnedRowOne', isPinned: true })],
    titles: [
      rowTitle({
        groupId: 'g-1',
        label: 'RowOne',
        depth: 1,
        box: rect(0, 40, 170, 24),
        expander: { canOpen: true, canClose: false, canCloseBelow: false },
      }),
    ],
  },
  propertiesPanel: PROPERTIES,
  commandPalette: PALETTE,
  openModal: HELP_MODAL,
  notices: [notice({ manner: 'NT-6', text: 'NoticeTextOne' })],
  dialogueField: DIALOGUE,
  tooltips: [iconTooltip('IC-20', 'TooltipTextOne')],
})

/** The one `input` inside the `Dialogue Field` -- the head comment's own landmark. */
function dialogueEntry(root: FakeElement): FakeElement {
  const field = oneByRole(root, 'Dialogue Field')
  const inputs = descendants(field).filter((one) => one.tagName === 'INPUT')
  const first = inputs[0]
  if (first === undefined) throw new Error('the Dialogue Field holds no entry')
  expect(inputs).toHaveLength(1)
  return first
}

const isoSeconds = (ms: number): string => `${new Date(ms).toISOString().slice(0, 19)}Z`

// ===========================================================================

describe('the tables these cases copy still say what the copies say', () => {
  it('表 T-103 spells every settled name the cases look for', () => {
    const rows = specTable('T-103').rows
    for (const part of T_103_PARTS) {
      const row = rows.find((one) => one.id === part.row)
      expect(row, `表 T-103 no longer holds ${part.row}`).toBeDefined()
      expect(row?.cells[0]).toContain(`\`${part.name}\``)
    }
  })

  it('表 T-212 still holds S-116 as a bound with a value inside it', () => {
    expect(S_116.min).toBeLessThan(S_116.value)
    expect(S_116.value).toBeLessThan(S_116.max)
  })
})

describe('IF-9 / PI-38 -- the seam is realised and not widened', () => {
  // ⭐ ONE MEMBER PER SUPPLY THE IF-9 CELL NAMES, and the cell names five.
  // 表 T-065's IF-9 reads 「作った記述を画面に載せ、対話欄で確定した発話を返し、
  // **プロパティパネルの欄で確定した値を、その欄が名乗る行 ID とともに返し**、
  // **まだ確定していない文字入力があるかを答え**、
  // **画面上の点がどの UI パーツ（表 T-103）のどの入口（表 T-109）の上か、および
  // 書き出しの選択面では 表 T-024 のどの形式の上かを答える**」 -- five duties, in
  // that order:
  //
  //   put the description on the screen        showScreenView
  //   hand back the settled utterance          readDialogueInput
  //   hand back the settled field value        readFieldCommit
  //   answer whether text stands unsettled     hasUnsettledTextEntry
  //   answer what is drawn at a point          readScreenPartAt
  //
  // ⛔ THE LIST IS NAMED AND NOT COUNTED, on purpose. A case that only counted
  // would go green on a member swapped for another, and one that read the keys
  // off the very surface under test would agree with any surface at all. The
  // names come from `screen-surface.ts`, which is the declaration a tester may
  // read (rule 04 section 1) and which pairs each member with the clause of the
  // cell it serves -- so this stays red the day a supply is added or dropped.
  const IF_9_MEMBERS = [
    'hasUnsettledTextEntry',
    'readDialogueInput',
    'readFieldCommit',
    'readScreenPartAt',
    'showScreenView',
  ] as const

  it('gives back exactly the members the IF-9 cell has supplies', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    expect(Object.keys(surface).sort()).toEqual([...IF_9_MEMBERS])
    for (const member of IF_9_MEMBERS) {
      expect(typeof (surface as unknown as Record<string, unknown>)[member], member).toBe(
        'function',
      )
    }
  })

  it('reports the measured height on the FACTORY, never as a member of the seam', () => {
    const built = wire({ 'App Header': 37 })

    // ⛔ The move dom-input-source made with `isBrowserDefaultStopped`: what the
    // caller has to supply travels on the wiring, so 表 T-065's IF-9 keeps only
    // the members that cell names, and the height is not one of them.
    // ⚠️ Asserted against the NAMED roster and not against a COUNT -- a count
    // says nothing about which members those are and has to be re-typed every
    // time the IF-9 cell gains a supply, which is how this case came to be red.
    expect(built.reportedHeights).toEqual([37])
    expect(Object.keys(surfaceOf(built)).sort()).toEqual([...IF_9_MEMBERS])
  })
})

describe('BO-1 of 表 T-077 (MUST) -- nothing is drawn until the dimensions are settled', () => {
  it('mounts one root, marked with its own unit and hidden, before any description arrives', () => {
    const built = wire({ 'App Header': 37 })

    expect(built.mount.children).toHaveLength(1)
    // ⚠️ 表 T-103 has no row for the whole screen, so no name is minted for it.
    expect(built.root().getAttribute('data-unit')).toBe('UF-71')
    expect(built.root().getAttribute('data-role')).toBeNull()
    expect(isShown(built.root())).toBe(false)
  })

  it('hides with visibility, not display -- a box that is not laid out has no height', () => {
    const built = wire({ 'App Header': 37 })

    expect(styleOf(built.root())).toContain('visibility:hidden')
    expect(styleOf(built.root())).not.toContain('display:none')
  })

  it('has the App Header in the tree already, because BO-1 settles its dimension', () => {
    const built = wire({ 'App Header': 37 })

    expect(byRole(built.root(), 'App Header')).toHaveLength(1)
  })

  it('shows the screen only once a description has arrived', () => {
    const built = wire({ 'App Header': 37 })
    expect(isShown(built.root())).toBe(false)

    surfaceOf(built).showScreenView(EMPTY_VIEW)

    expect(isShown(built.root())).toBe(true)
  })

  it('⛔ still settles the dimension when the host lays the header out at 0', () => {
    // ⚠️ NFR-011's rationale names this exact event -- 「寸法が確定する前の 1
    // フレームで 0×0 の窓が出ること」 -- as one of the two the startup order
    // exists to stop, and a preview pane in this project really does cold-start
    // at 0 x 0. So the measurement of 0 is the case that matters MOST, not the
    // one to skip: BO-1 has to be told what the environment answered, and
    // `ScreenSurfaceWiring` says onAppHeaderHeightPx is called once BEFORE this
    // factory returns. ⛔ Measured behaviour: nothing is reported at all, and
    // the number first arrives at the redraw that measures something else -- so
    // whatever the caller's own starting value is stands in for the
    // measurement, which is FR-051's MUST NOT.
    const built = wire()

    expect(built.reportedHeights).toEqual([0])
    expect(isShown(built.root())).toBe(false)
  })
})

describe('FR-051 (MUST / MUST NOT) -- the App Header height is measured, not held', () => {
  it('measures the App Header itself rather than taking a number', () => {
    const built = wire({ 'App Header': 37 })

    const header = oneByRole(built.root(), 'App Header')
    expect(built.world.measured).toContain(header)
  })

  it('reports the height before the factory returns, so BO-1 has it', () => {
    const built = wire({ 'App Header': 37 })

    expect(built.reportedHeights).toEqual([37])
    // ⛔ Contract line 1: the caller may not reach for the surface inside the
    // callback, because there is not one yet.
    expect(built.reportedBeforeFactoryReturned).toEqual([true])
  })

  it('answers with the environment, so two machines report two numbers', () => {
    const small = wire({ 'App Header': 33 })
    const large = wire({ 'App Header': 90 })

    expect(small.reportedHeights).toEqual([33])
    expect(large.reportedHeights).toEqual([90])
  })

  it('⛔ never substitutes appHeaderMaxHeight for the measurement (MUST NOT)', () => {
    // S-116's own value, and a measurement that is inside its band but not it.
    const measured = S_116.min + 5
    expect(measured).not.toBe(S_116.value)

    const built = wire({ 'App Header': measured })

    expect(built.reportedHeights).toEqual([measured])
    expect(built.reportedHeights).not.toContain(S_116.value)
  })

  it('treats S-116 as a bound: a measurement at the bound itself is reported as it stands', () => {
    const atMin = wire({ 'App Header': S_116.min })
    const atMax = wire({ 'App Header': S_116.max })

    expect(atMin.reportedHeights).toEqual([S_116.min])
    expect(atMax.reportedHeights).toEqual([S_116.max])
  })

  it('FT-3: reports again when a redraw measured a different height, and not otherwise', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    expect(built.reportedHeights).toEqual([37])

    // The machine's text got bigger between two frames.
    built.world.heightsByRole.set('App Header', 44)
    surface.showScreenView(EMPTY_VIEW)
    expect(built.reportedHeights).toEqual([37, 44])

    // ⛔ Nothing changed, so nothing is reported: NFR-010 forbids waking a frame
    // on anything 表 T-078 does not list.
    surface.showScreenView(EMPTY_VIEW)
    surface.showScreenView(RICH_VIEW)
    expect(built.reportedHeights).toEqual([37, 44])
  })
})

describe('表 T-078 / NFR-010 (MUST NOT) -- nothing in this unit wakes a frame', () => {
  it('listens only where IF-9 gives it something to notice, and never on the host', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    // ⛔ THE COUNT OF LISTENERS IS NOT THE RIGHT THING TO ASSERT, and asserting
    // it is what made this case red. No row anywhere fixes how many DOM events a
    // browser needs to notice one settling -- 表 T-078 forbids RAISING A FRAME
    // on a trigger it does not list (「本表に無い契機でフレームを起こしてはなら
    // ない（MUST NOT）」), which is a rule about what leaves this unit, not about
    // how many listeners it holds. ⚠️ Pinning the count also punishes the seam
    // for growing: IF-9 gained 「プロパティパネルの欄で確定した値を…返し」 and a
    // value that is READ rather than pushed still has to be noticed being
    // settled, so more listeners with no more frames is exactly right.
    //
    // ⭐ WHAT IS ASSERTED INSTEAD IS WHERE THEY SIT. IF-9 names two things this
    // unit hands BACK from what a person did -- the utterance settled in the
    // 対話欄 and the value settled in a プロパティパネルの欄 -- so a listener has
    // a duty to serve only inside those two parts. ⚠ THERE WAS ONE ELSEWHERE:
    // it sat on a control inside a tooltip that put the tooltip away, and `IN-4`
    // of 表 T-028 (MUST) has since taken that job -- its ladder ends 「出ている
    // 説明」 and says why: 「説明を最後に置くのは、`IN-3` が求める「消せること」
    // を果たす手立てがほかに 1 つも無いからである」. A press is on the side that
    // reads keys, not here. This case still falls the day one comes back.
    // ⭐⭐ A THIRD PART JOINED THE TWO ON 2026-08-30 AND LEFT AGAIN ON 2026-09-04,
    // AND BOTH TIMES THE MANUSCRIPT DECIDED IT. HF-14 of 表 T-051 (MUST) used to
    // read 「名前は空で立て、その場で打たせること（MUST）」, and 「その場」 is
    // among the rows -- so a third field took characters, inside the `Row Title
    // Tree`, and a listener serving it was not this unit widening its supply.
    // ⛔ ALL THREE OF THAT ROW'S MUSTS WERE WITHDRAWN (利用者の裁定 2026-09-04,
    // quoted in the row itself). It now reads 「押された瞬間に、既定の名前で行を
    // 立てること（MUST）。その行のプロパティパネルを出し、名前の欄で名づけさせる
    // こと（MUST）」 with 「改名と別の道を作ってはならない（MUST NOT）」 beside it
    // ⇒ THE NAMING HAPPENS IN THE `Properties Panel`, which was already one of
    // the two parts IF-9 names, so the roster goes back to two.
    // ⭐ THE LIST IS DERIVED AND NOT COUNTED: it is exactly the parts the IF-9
    // cell names as carrying something a PERSON settled -- 「対話欄で確定した
    // 発話を返し、プロパティパネルの欄で確定した値を…返し」 -- and nothing else.
    // ⛔ A listener among the rows now falls this case, which is how the row's
    // own MUST NOT is held down from here.
    const root = built.root()
    const noticing = [oneByRole(root, 'Dialogue Field'), oneByRole(root, 'Properties Panel')]

    expect(built.world.registrations.length).toBeGreaterThan(0)

    // ⭐ THE ONE LISTENER THE SPECIFICATION PUTS OUTSIDE THOSE TWO PARTS, and it
    // is named here rather than the rule being widened. `IN-6` of 表 T-028
    // (MUST, 利用者の裁定 2026-08-30) settles the edit standing in a field when
    // a press lands OUTSIDE that field -- and 「欄の外」 is the schedule, the
    // canvas, the header: every place but the two parts above. ⛔ It cannot be
    // heard from inside them, and no other member of IF-9 is asked in time --
    // which is the same 「nowhere else can spend it」 the `Esc` and `Enter`
    // listeners of that unit already record.
    // ⛔ IT IS STILL NOT A SECOND SOURCE OF INPUT: FT-1's supply is untouched,
    // nothing is reported to the shell from it and no frame is raised -- the
    // value it settles leaves by `readFieldCommit`, which the shell was already
    // going to read. ⚠️ 表 T-078 forbids RAISING A FRAME on a trigger it does
    // not list, and this raises none.
    // ⛔ IT IS NOT ON A NODE AT ALL, which is why it does not appear in
    // `registrations`: the press IN-6 is about lands on the schedule, and the
    // schedule goes up through IF-1 as its own surface BESIDE this unit's tree
    // -- measured in the shipped build, where `body` holds the `Schedule Canvas`
    // and the mount as two children and a press on a bar never passes this
    // unit's root. So the listener is on the HOST, and the case below is what
    // holds it to exactly one.
    for (const one of built.world.registrations) {
      // ⛔ FT-1 of 表 T-078 has the human input reach the shell through IF-2 and
      // says the supply is not widened, so a listener OUTSIDE these two parts
      // would be this unit becoming a second source of input.
      expect(
        noticing.some((part) => part.contains(one.node)),
        `${one.type} on [data-role="${one.node.getAttribute('data-role') ?? ''}"]`,
      ).toBe(true)
    }
  })

  it('registers nothing for a size change, and asks the host for one listener and no more', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    expect(built.world.registrations.map((one) => one.type)).not.toContain('resize')
    // ⛔ FT-3 is the shell's to observe (表 T-060 LY-5), not this unit's. ⚠️ The
    // set grew a second member when the shapes arrived: FR-029 (MUST) makes 図
    // F-019 the authority for every icon, that figure is SVG, and an SVG element
    // made with `createElement` is an unknown HTML element that draws nothing.
    // ⛔⛔ AND A THIRD ON 2026-08-30 (CR-295), WHICH IS THE ONE THAT OBSERVES.
    // IN-6 of 表 T-028 (MUST) has a press OUTSIDE a field settle the edit
    // standing in it; 「欄の外」 includes the schedule, which IF-1 puts up as its
    // own surface beside this unit's tree, so no node this unit owns is on the
    // way from that press. ⚠️ WHAT THE CASE IS STILL ABOUT IS UNCHANGED: FT-3's
    // size change is not watched, and the one listener that IS taken reports
    // nothing to the shell and raises no frame -- what it settles leaves by
    // `readFieldCommit`, which the shell was already going to read.
    // ⛔ ONE AND NO MORE, which is what the count below is for. ⚠️ This fake
    // host offers no `addEventListener` AT ALL, so what the count sees is the
    // guard reading the member once and registering nothing -- which is the
    // other half of the claim, and the one this harness can make: 表 T-075
    // leaves the unit runnable against a host that is not a browser, and a unit
    // that called an absent member would throw here instead of counting.
    // ⛔ A SECOND LISTENER WOULD SHOW UP AS A SECOND TOUCH.
    expect(new Set(built.world.hostMembers)).toEqual(
      new Set(['createElement', 'createElementNS', 'addEventListener']),
    )
    expect(built.world.hostMembers.filter((one) => one === 'addEventListener')).toHaveLength(1)
  })

  it('sets no timer -- FT-4 puts the clock in the shell', () => {
    vi.useFakeTimers()
    try {
      const built = wire({ 'App Header': 37 })
      surfaceOf(built).showScreenView(RICH_VIEW)
      expect(vi.getTimerCount()).toBe(0)

      vi.advanceTimersByTime(60_000)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

// ===========================================================================
// HF-14 of 表 T-051 (MUST) -- the row is stood up AT THE PRESS, with the default
// name, and named in its own `Properties Panel`.
//
// ⭐ WHAT THE MANUSCRIPT SAYS NOW (docs/spec/01-04-requirements.md, 表 T-051 の
// `HF-14`; the ruling of 2026-09-03 is quoted verbatim inside the row):
//   「**押された瞬間に、既定の名前で行を立てること（MUST）。その行のプロパティ
//   パネルを出し、名前の欄で名づけさせること（MUST）**」 —— ⛔ 「**改名と別の道を
//   作ってはならない（MUST NOT）。道は `FR-085` が改名について定めるものと同じ
//   ものとすること（MUST）**」 —— ⛔ 「**その作法をここに書き写してはならない
//   （MUST NOT）**」 —— ⭐ 「**既定の名前は表示語として持つこと（MUST）。仕様書に
//   綴りを刷ってはならない（MUST NOT）**」（置き場は `FR-038` の辞書）。
//
// ⛔⛔ THREE MUSTS WERE WITHDRAWN ON 2026-09-04, and the cases that carried them
// went with them: 「名前は空で立て、その場で打たせること」「既定の名を与えては
// ならない」「名前が空のまま確定されたときは、その行を立てないこと」. The row
// says why in its own words -- 「**その禁止の理由は「改名の入口が 1 つも無い」で
// あり、`FR-085` が 2026-09-01 に改名の道を得た時点で失われていた**」.
// ⛔ ONE OF THEM HAS NO SUCCESSOR AT ALL, AND NONE WAS INVENTED. 「空のまま確定
// されたら立てない」 was a rule about a settling that can no longer happen: the
// row is already standing when the panel opens, so there is nothing left to
// withhold. Nothing in HF-14 as it now stands replaces it.
//
// ⛔ WHAT THIS UNIT CANNOT CARRY, WRITTEN DOWN RATHER THAN ASSERTED:
//   - 「押された瞬間に…行を立てること」 and 「足した行は末子とすること」 are the
//     WRITE. This unit holds no document and makes no command; a `ScreenView`
//     reaches it with the row already in it.
//   - 「既定の名前は表示語として持つこと」 is the naming side's. The word travels
//     into this unit inside `RowTitle.label`, so a case here could assert only
//     what the fixture typed. ⭐ What CAN be held from here is that the word has
//     a home and that the specification does not spell it -- the last case reads
//     the pointer the manuscript does state and then asks FR-038's dictionary.
//   - 「立てた行が…詳しさの段（`FR-018`）で落ちる深さになるときは、その行が描かれ
//     るまで詳しさの段を開くこと（MUST）。表示位置を送るだけで済ませてはならない
//     （MUST NOT）」 IS NOT CARRIABLE HERE, and is deliberately not asserted. This
//     unit is HANDED a `ScreenView`: which rows survived the detail tier, and
//     where the viewport was sent, are both settled before the description
//     arrives. ⛔ A case here could only check that a row the fixture itself put
//     into the view was drawn, which says nothing at all about a tier being
//     opened. That MUST belongs to the side that chooses the tier.
//   - 「薄いまま押されたときは、行を立てずに理由を告げること（MUST）。理由は 表
//     T-233 の `RS-46`」 is likewise raised elsewhere; this unit draws whatever
//     `notices` it is handed.
//
// ⭐ WHAT IS LEFT HERE IS THE ROAD, AND THE ROAD IS THE WHOLE OF THE (MUST NOT).
// FR-085 and 表 T-023's `MK-13` put a person into the name field of the
// `Properties Panel`, this unit is the only side that can (LR-6 keeps the
// browser out of every other layer), and HF-14 says its own naming goes THAT
// way and no other. ⚠️ How that road behaves in detail -- which control answers,
// and every character already there chosen -- is held by
// tests/unit/mk-13-the-name-field-is-armed.test.ts. What is held HERE is that
// there is exactly one of it, and that it does not stand among the rows.
// ===========================================================================

describe('HF-14 of 表 T-051 (MUST) -- 既定の名前で行を立て、プロパティパネルの名前の欄で名づけさせること', () => {
  /**
   * The row of the name field, READ OUT OF 表 T-023's `MK-13` and never typed.
   *
   * ⭐ HF-14 (MUST NOT) forbids its own cell to write the manner down -- 「**その
   * 作法をここに書き写してはならない（MUST NOT）**」 -- and points at `FR-085`
   * instead; `FR-085` and `MK-13` both call the field 「名前の欄（`AT-53`）」. So
   * the row id has a home already, and a cell that stopped naming one fails here
   * in one line rather than leaving every case below asking about nothing.
   */
  const NAME_ROW = ((): string => {
    const mk13 = specTable('T-023').rows.find((one) => one.id === 'MK-13')
    const found = /行見出し（行の名前）[^`]*`[^`]*`[^`]*`(AT-\d+)`/.exec(mk13?.cells.join(' ') ?? '')
    if (found === null) throw new Error('表 T-023 MK-13 no longer names the row-name field')
    return found[1] as string
  })()

  /** The row the description below is about -- the first the rich view draws. */
  const GROUP_ID = RICH_VIEW.rowTitlePanel.titles[0]?.groupId ?? ''

  /**
   * The name standing in that field.
   *
   * ⚠️ THIS FILE'S OWN AND IT DECIDES NOTHING. The default name is FR-038's
   * dictionary's (`defaultNames` の `row`) and reaches this unit inside the
   * description; what a case here needs is a value it can tell apart from every
   * other word on the screen.
   */
  const THE_NAME_STANDING_THERE = 'RowNameStandingHere'

  /** The `Properties Panel` of a row, with the one field HF-14 sends a person to. */
  const panelWithName = (): PropertiesPanel =>
    ({
      showing: 'selection',
      isSubjectGone: false,
      fields: [
        {
          row: NAME_ROW,
          name: 'label',
          text: THE_NAME_STANDING_THERE,
          isEditable: true,
          controls: [
            {
              key: { holder: 'taskGroup', groupId: GROUP_ID, column: 'label' },
              kind: 'text',
              text: THE_NAME_STANDING_THERE,
              choices: null,
              min: null,
              max: null,
              widthInFontSizes: 8,
            },
          ],
        } as PropertyField,
      ],
      commands: [],
    }) as PropertiesPanel

  /** The controls a person edits a field through -- a form element and nothing else. */
  const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
  const controlsIn = (part: FakeElement): FakeElement[] =>
    selfAndDescendants(part).filter((one) => CONTROL_TAGS.has(one.tagName))

  /** Everything a failure needs to be read without opening the unit. */
  const whatWasDrawn = (part: FakeElement): string =>
    controlsIn(part)
      .map((one) => `${one.tagName}[value=${JSON.stringify(one.value)}]`)
      .join(' ; ')

  /**
   * The rows drawn WITH the panel of one of them up -- the picture HF-14 asks
   * for the instant the entrance is pressed.
   *
   * ⚠️ `notices` is drawn empty: `NT-8` of 表 T-037 (MUST) puts the newest
   * telling away 「`Enter` と `Esc` のどの階層よりも先に」, and no case here is
   * about that rung.
   */
  const drawn = (): Stage => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView({
      ...RICH_VIEW,
      notices: [],
      propertiesPanel: panelWithName(),
    })
    return built
  }

  it('⭐ MUST: GIVEN the row is standing WHEN the naming is looked for THEN it is in the `Properties Panel` -- 「その行のプロパティパネルを出し、名前の欄で名づけさせること」', () => {
    const built = drawn()
    const panel = oneByRole(built.root(), partName('U-25'))

    // ⭐ THE FIELD IS THE ONE `FR-085` ALREADY DEFINES, asked for by the row id
    // that requirement names -- not by a mark invented here.
    expect(controlsIn(panel).map((one) => one.value), whatWasDrawn(panel)).toContain(
      THE_NAME_STANDING_THERE,
    )
  })

  it('⛔ MUST NOT: GIVEN the rows are drawn WHEN the tree is read THEN nothing among them takes characters -- 「改名と別の道を作ってはならない（MUST NOT）」', () => {
    // ⛔ THIS IS THE CASE THE WITHDRAWN MUSTS TURNED INSIDE OUT. Until 2026-09-04
    // the row asked for a field 「その場」, among the rows; it now forbids one,
    // because a second place to type a name IS a second road. ⚠️ 表 T-103's
    // `U-23` is where the rows stand (「**`Row Title Panel` の中身**」), so that
    // is the part read.
    const built = drawn()
    const tree = oneByRole(built.root(), partName('U-23'))

    expect(controlsIn(tree), whatWasDrawn(tree)).toEqual([])
    expect(
      selfAndDescendants(tree).filter((one) => one.hasAttribute('contenteditable')),
      'a node among the rows takes characters without being a form control',
    ).toEqual([])
  })

  it('⭐ MUST: GIVEN the surface is built WHEN the road is looked for THEN it is FR-085 の道, handed over once and landing in the panel', () => {
    // ⛔ THE PREMISE THE WHOLE ROW RESTS ON, and the reason it is not on IF-9:
    // 表 T-065's cell names five supplies and every one of them is a QUESTION,
    // so a state of the page cannot be asked for across that seam.
    const built = wire({ 'App Header': 37 })
    expect(built.focusField, 'the unit handed over no way to put a person in the name field').not.toBeNull()

    surfaceOf(built).showScreenView({
      ...RICH_VIEW,
      notices: [],
      propertiesPanel: panelWithName(),
    })
    // ⭐ The premise without which 「it took the focus」 says nothing.
    expect(built.world.activeElement).toBeNull()

    built.focusField?.(NAME_ROW)

    const panel = oneByRole(built.root(), partName('U-25'))
    const active = built.world.activeElement
    expect(active, 'nothing took the focus').not.toBeNull()
    expect(
      panel.contains(active as FakeElement),
      `the focus landed outside the Properties Panel: ${whatWasDrawn(panel)}`,
    ).toBe(true)
    // ⛔ AND NOT AMONG THE ROWS, which is the same (MUST NOT) from the other end.
    expect(oneByRole(built.root(), partName('U-23')).contains(active as FakeElement)).toBe(false)
  })

  it('⛔ MUST: GIVEN a telling stands WHEN Enter is pressed in the name field THEN the telling goes and the name is NOT settled (NT-8 of 表 T-037)', () => {
    // 「⛔⛔ **この消去を、`Enter` と `Esc` のどの階層よりも先に行うこと（MUST）**」
    // ——「**階層は 表 T-028 の `IN-4` と 表 T-036 の `SK-19` が持ち、どちらも本行を
    // 先頭に置く**」. ⭐ The user's own words: 「タスク名の確定の Enter より、
    // エラーメッセージの消去を優先しろ」.
    // ⚠️ ONE RUNG PER PRESS, which is what `IN-4` has always asked of `Esc`.
    // ⭐ THE FIELD IS THE PANEL'S NOW, not one standing among the rows: HF-14's
    // 「その場で打たせること」 was withdrawn on 2026-09-04 and the naming moved
    // onto FR-085's road, so the rung this case is about is reached in the
    // control the panel drew.
    const built = wire({ 'App Header': 37 })
    // ⚠️ `RICH_VIEW` carries one telling, which is the whole premise here.
    surfaceOf(built).showScreenView({ ...RICH_VIEW, propertiesPanel: panelWithName() })
    const panel = oneByRole(built.root(), partName('U-25'))
    const control = controlsIn(panel)[0]
    expect(control, whatWasDrawn(panel)).toBeDefined()

    // ⚠️ A PERSON PUTTING THE CARET IN, TYPING, AND PRESSING THE KEY -- all
    // three, because a bare keystroke on a field nobody entered settles nothing
    // and a case that sent one alone would be green for the wrong reason.
    const field = control as FakeElement
    field.focus()
    keyPress(field, '', { type: 'focusin' })
    field.value = 'RowNamedWhileATellingStood'
    keyPress(field, '', { type: 'input' })
    keyPress(field, 'Enter')

    expect(
      surfaceOf(built).readFieldCommit(),
      'the value was settled while a telling stood',
    ).toBeNull()
  })

  it('GIVEN the specification is re-read WHEN HF-14 and SK-19 are looked up THEN HF-14 stands the row up WITH the default name and names it in the Properties Panel, settled with Enter', () => {
    const hf14 = specTable('T-051').rows.find((one) => one.id === 'HF-14')
    expect(hf14, '表 T-051 no longer holds HF-14').toBeDefined()
    const cells = hf14?.cells.join(' ') ?? ''

    // ⭐⭐ THE RULING OF 2026-09-03, IN THE ROW'S OWN WORDS: 「**No name という
    // タスクグループを追加してそれを編集するプロパティーウインドウを開け。
    // つまり、現在タスクグループ名を変更する際の操作と操作感を合わせろ。**」
    expect(cells).toContain('押された瞬間に、既定の名前で行を立てること（MUST）')
    expect(cells).toContain('その行のプロパティパネルを出し、名前の欄で名づけさせること（MUST）')
    // ⛔ ONE ROAD, AND IT IS THE ONE `FR-085` ALREADY DEFINES FOR RENAMING -- so
    // this unit may not grow a second way of asking for the name.
    expect(cells).toContain('改名と別の道を作ってはならない（MUST NOT）')
    expect(cells).toContain('道は `FR-085` が改名について定めるものと同じものとすること（MUST）')
    // ⛔ AND THE SPELLING OF THAT DEFAULT NAME IS NOT HERE TO BE COPIED FROM.
    expect(cells).toContain('既定の名前は表示語として持つこと（MUST）')
    expect(cells).toContain('仕様書に綴りを刷ってはならない（MUST NOT）')

    // ⛔⛔ THE THREE MUSTS THIS CASE USED TO HOLD DOWN WERE WITHDRAWN ON
    // 2026-09-04, and the row says why: 「**その禁止の理由は「改名の入口が 1 つも
    // 無い」であり、`FR-085` が 2026-09-01 に改名の道を得た時点で失われていた。**」
    // ⚠️ HELD NEGATIVELY ON PURPOSE: the row keeps a history note that repeats
    // those words WITHOUT their （MUST）, so a quiet revival of the rules
    // themselves -- and only that -- turns this case red again.
    expect(cells).not.toContain('名前は空で立て、その場で打たせること（MUST）')
    expect(cells).not.toContain('既定の名を与えてはならない（MUST NOT）')
    expect(cells).not.toContain('名前が空のまま確定されたときは、その行を立てないこと（MUST）')

    // ⭐⭐ THE DEFAULT NAME HAS A HOME, AND THE SPELLING IS NOT READ OUT OF THIS
    // FILE. HF-14 (MUST NOT) forbids the specification to print it, so the only
    // honest way to reach it is the POINTER the manuscript does state -- the
    // invariant under 表 T-050 (MUST): 「**名前は `FR-038` の辞書の
    // `defaultNames` の `row` の語とすること（MUST）**」 -- followed into the
    // dictionary FR-038 keeps. ⛔ Nothing here types 「No name」: the two names
    // that ARE typed are the two the manuscript itself spells, and the word is
    // whatever the dictionary holds under them.
    const requirements = readFileSync(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    )
    const pointer = /名前は `FR-038` の辞書の `([A-Za-z]+)` の `([A-Za-z]+)` の語とすること（MUST）/.exec(
      requirements,
    )
    expect(pointer, '表 T-050 no longer points at the dictionary for the default name').not.toBeNull()
    const dictionary = JSON.parse(
      readFileSync(
        join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'),
        'utf8',
      ),
    ) as Record<string, readonly Record<string, unknown>[]>
    const section = dictionary[(pointer as RegExpExecArray)[1] as string]
    expect(section, 'FR-038 の辞書 no longer holds the section 表 T-050 names').toBeDefined()
    const entry = section?.find((one) =>
      Object.values(one).includes((pointer as RegExpExecArray)[2] as string),
    )
    expect(entry, 'FR-038 の辞書 no longer holds the word 表 T-050 names').toBeDefined()
    const word = entry?.['text'] as Record<string, string> | undefined
    expect(word?.['ja'], 'the default name has no word to stand a row up with').toBeTruthy()
    expect(word?.['en'], 'the default name has no word to stand a row up with').toBeTruthy()
    // ⚠️ 「**仕様書に綴りを刷ってはならない（MUST NOT）**」 IS DELIBERATELY NOT
    // ASSERTED AS A SUBSTRING, and what was measured is written down rather than
    // guessed at: HF-14's cell DOES hold the word, inside the verbatim quotation
    // of the ruling that put the rule there (「**No name というタスクグループを
    // 追加して…**」). ⛔ A case that searched the cell would be red on the day the
    // rule landed, and would be asking the manuscript to stop quoting the person
    // who gave it -- which no requirement asks for. The MUST NOT is about where
    // the value LIVES, and that half is what the lines above hold: it lives in
    // FR-038's dictionary, and this file reads it from there.

    const sk19 = specTable('T-036').rows.find((one) => one.id === 'SK-19')
    expect(sk19, '表 T-036 no longer holds SK-19').toBeDefined()
    // ⭐ 行名 is this field by name, and `Enter` is the key the row gives it.
    expect(sk19?.cells.join(' ')).toContain('行名')
    expect(sk19?.cells.join(' ')).toContain('Enter')
    // ⭐ AND THE TELLING STANDS AHEAD OF IT SINCE 2026-08-31.
    expect(sk19?.cells.join(' ')).toContain('出ている通知があるときは、それを 1 つ消すこと（MUST）')
  })
})

describe('AG-11 of 表 T-035 (MUST NOT) -- an unsettled line is not an utterance', () => {
  function typed(text: string): { built: Stage; surface: ScreenSurface; entry: FakeElement } {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    surface.showScreenView(viewWith({ dialogueField: DIALOGUE }))
    const entry = dialogueEntry(built.root())
    entry.value = text
    return { built, surface, entry }
  }

  it('answers null while the person has entered nothing', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    expect(surface.readDialogueInput()).toBeNull()

    surface.showScreenView(viewWith({ dialogueField: DIALOGUE }))
    expect(surface.readDialogueInput()).toBeNull()
  })

  it('⛔ reports a half-typed line as unsettled, with no moment to name (PD-156)', () => {
    const { surface } = typed('half a thou')

    const read = surface.readDialogueInput()

    expect(read).not.toBeNull()
    expect(read?.text).toBe('half a thou')
    expect(read?.isSettled).toBe(false)
    expect(read?.settledAt).toBe('')
  })

  it('dialogueMessageFromInput (PI-37) refuses the half-typed line', () => {
    const { surface } = typed('half a thou')

    const read = surface.readDialogueInput()

    expect(read).not.toBeNull()
    expect(read === null ? null : dialogueMessageFromInput(read)).toBeNull()
  })

  it('PD-150: a plain Enter settles it, with the author and the clock of that moment', () => {
    const { built, surface, entry } = typed('please wait')
    built.author = 'Reader'
    const at = Date.UTC(2026, 7, 20, 9, 30, 0)
    built.clockMs = at

    keyPress(entry, 'Enter')
    // The clock moves on; the stamp still names the press.
    built.clockMs = at + 120_000

    const read = surface.readDialogueInput()

    expect(read?.isSettled).toBe(true)
    expect(read?.text).toBe('please wait')
    expect(read?.author).toBe('Reader')
    expect(read?.settledAt).toBe(isoSeconds(at))
    expect(read?.settledAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  it('PD-150: ⛔ an Enter an input method is confirming settles nothing', () => {
    const { surface, entry } = typed('half a thou')

    keyPress(entry, 'Enter', { isComposing: true })

    expect(surface.readDialogueInput()?.isSettled).toBe(false)
  })

  it('PD-150: an Enter with a modifier settles nothing', () => {
    const { surface, entry } = typed('half a thou')

    keyPress(entry, 'Enter', { shiftKey: true })
    keyPress(entry, 'Enter', { ctrlKey: true })

    expect(surface.readDialogueInput()?.isSettled).toBe(false)
  })

  it('reads the author each time rather than taking it once at wiring', () => {
    const { built, surface, entry } = typed('one')
    built.author = 'First'
    keyPress(entry, 'Enter')
    expect(surface.readDialogueInput()?.author).toBe('First')

    surface.showScreenView(viewWith({ dialogueField: DIALOGUE }))
    const again = dialogueEntry(built.root())
    again.value = 'two'
    built.author = 'Second'
    keyPress(again, 'Enter')

    expect(surface.readDialogueInput()?.author).toBe('Second')
  })

  it('semi-pure-b: the read does not take the settled line away -- the draw does', () => {
    const { surface, entry } = typed('please wait')
    keyPress(entry, 'Enter')

    // ⭐ Contract line 2: read BEFORE drawing. Two reads answer the same, so a
    // caller cannot lose the utterance by looking twice.
    expect(surface.readDialogueInput()?.isSettled).toBe(true)
    expect(surface.readDialogueInput()?.isSettled).toBe(true)

    surface.showScreenView(viewWith({ dialogueField: DIALOGUE }))

    // ⛔ and the draw is what takes it away, so the same utterance is not handed
    // to postDialogueMessage twice.
    const after = surface.readDialogueInput()
    expect(after === null || after.isSettled === false).toBe(true)
  })
})

describe('FR-066 -- no dialogue field while the Agent API is off', () => {
  it('draws no field, and reads nothing, while ScreenView.dialogueField is null', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    surface.showScreenView(viewWith({ dialogueField: null }))

    for (const one of byRole(built.root(), 'Dialogue Field')) {
      expect(isShown(one)).toBe(false)
    }
    expect(surface.readDialogueInput()).toBeNull()
  })

  it('draws the field, and its settled utterances, while it is non-null', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    surface.showScreenView(viewWith({ dialogueField: DIALOGUE }))

    const field = oneByRole(built.root(), 'Dialogue Field')
    expect(isShown(field)).toBe(true)
    expect(field.textContent).toContain('MessageOne')
    expect(field.textContent).toContain('Someone')
  })

  it('⛔ stops reading the field again once the Agent API goes off', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    surface.showScreenView(viewWith({ dialogueField: DIALOGUE }))
    const entry = dialogueEntry(built.root())
    entry.value = 'please wait'
    keyPress(entry, 'Enter')

    surface.showScreenView(viewWith({ dialogueField: null }))

    expect(surface.readDialogueInput()).toBeNull()
  })
})

/**
 * 表 T-236 — the colours the screen is painted in, in the rendering `THEME`
 * wired, read from the manuscript at load time.
 *
 * ⛔ NO COLOUR IS TYPED HERE, for the reason rule 03 section 1 gives. The rows
 * that follow the hue write it as the letter `H`, which the table's own 色相追随
 * column marks and which S-73 fills in -- so the hue read for `THEME` is
 * substituted the once, exactly as the manuscript writes it.
 *
 * ⚠️ TWO ROWS STATE ANOTHER ROW INSTEAD OF A COLOUR (`S-146` に同じ) and are
 * left out: they are not a second colour, and resolving them here would be this
 * file deciding what a cell means. That only ever makes the set SMALLER, which
 * is the safe direction for a membership check.
 */
const T_236_AS_WIRED = new Set(
  specTable('T-236')
    .rows.map((row) =>
      bare(row.by[THEME.preference === 'dark' ? '暗いテーマ' : '明るいテーマ'] ?? ''),
    )
    .filter((written) => /^(#|hsl\(|rgba?\()/.test(written))
    .map((written) => written.replace('H', String(THEME.hue)).replace(/\s+/g, '').toLowerCase()),
)

/**
 * The colour a node is painted, resolved through the theme declaration the unit
 * wrote on its own root.
 *
 * ⭐ WHY IT HAS TO BE RESOLVED. FR-041 (MUST) has one declaration carry 表 T-236
 * for the whole tree, so a part states which colour it takes and not what that
 * colour is. Reading the part alone would compare a NAME with a colour and fail
 * whatever the unit painted.
 *
 * ⚠️ No fallback is honoured (`var(--x, y)` is left unresolved and will not be
 * found in the table). FR-041 (MUST NOT) is what forbids one, so a case that
 * quietly accepted it would sleep through the very defect the requirement names.
 */
function paintedColour(built: Stage, element: FakeElement): string {
  const written = colourOf(element)
  const named = /^var\((--[a-z0-9-]+)\)$/.exec(written)
  if (named === null) return written.replace(/\s+/g, '')
  const property = named[1] as string
  return (styleMap(built.root()).get(property) ?? `(the root declares no ${property})`)
    .replace(/\s+/g, '')
    .toLowerCase()
}

describe('FR-029 (MUST) -- the shape tells, the word names, and what cannot be used is faint rather than silent', () => {
  const disabledView = viewWith({
    appHeaderItems: {
      ...EMPTY_HEADER,
      commands: [
        command({ icon: 'IC-20', label: 'CannotBeUsed', isEnabled: false }),
        command({ icon: 'IC-21', label: 'CanBeUsed', isEnabled: true }),
      ],
    },
  })

  function entryFor(root: FakeElement, icon: string): FakeElement {
    const found = selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') === icon)
    const first = found[0]
    if (first === undefined) throw new Error(`nothing carries data-icon="${icon}"`)
    return first
  }

  it('still draws the entry, with its words -- nothing goes quiet', () => {
    // FR-029's RATIONALE: 「無反応だと故障に見える」, so an entry that cannot be
    // used is still drawn and still says what it is.
    //
    // ⛔ THE WORD IS THE ENTRY'S NAME AND NOT ITS BODY, and that is the
    // requirement rather than a habit of the code: FR-029 (MUST) has the product
    // tell what a menu is for 「言葉ではなくアイコンで」, and `CommandItem.label`
    // is declared as 「The accessible name of the entry, in the display language
    // already」. ⚠️ This case used to read `entry.textContent`, which was true
    // only while PD-154's retreat left the row id standing in for a shape.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(disabledView)

    const entry = entryFor(built.root(), 'IC-20')
    expect(isShown(entry)).toBe(true)
    expect(entry.getAttribute('aria-label')).toBe('CannotBeUsed')
    // ⭐ And it is drawn as an icon, which is the other half of the same MUST.
    expect(isShown(shapeIn(entry))).toBe(true)
    // ⛔ The shape prints no word of its own: FR-038 (MUST) puts every word the
    // screen prints in one per-language dictionary, so a word that appeared here
    // would be one no dictionary holds and no language switch reaches.
    expect(shapeIn(entry).textContent).toBe('')
  })

  it('draws it faint -- a colour of its own, and one 表 T-236 states for the rendering that was wired', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(disabledView)

    // ⚠️ The COLOUR the words are drawn in, not any use of the value: an entry
    // that can be used may still be BORDERED in a subdued colour, and a border
    // is not 「薄く描く」.
    const cannot = paintedColour(built, entryFor(built.root(), 'IC-20'))
    const can = paintedColour(built, entryFor(built.root(), 'IC-21'))

    // ⛔ FR-029 (MUST): 「使えないものは薄く描く」. Two entries painted alike are
    // one of them told apart from nothing.
    expect(cannot, 'the entry that cannot be used is painted like the one that can').not.toBe(can)
    // ⛔ FR-041 (MUST): 「画面の色は `_assets/tbl-settings.md` の 表 T-236 に従う
    // こと」, and (MUST NOT) 「閲覧環境のシステム色に委ねてはならない」. 表 T-236
    // holds no system colour, so membership IS that MUST NOT: a `GrayText` here
    // would follow the OPERATING SYSTEM's light or dark and not the
    // `themePreference` the reader chose.
    expect(
      T_236_AS_WIRED.has(cannot),
      `${cannot} is not a colour 表 T-236 states for the rendering ${THEME.preference}`,
    ).toBe(true)
  })

  it('⛔ says WHY with aria-disabled and never with the disabled attribute', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(disabledView)

    const cannot = entryFor(built.root(), 'IC-20')
    // ⛔ `disabled` would take the entry out of the accessibility tree and stop
    // it taking the pointer, killing the tooltip IN-3 lets a person point at and
    // the `data-icon` answer EZ-2 needs.
    expect(cannot.hasAttribute('disabled')).toBe(false)
    expect(cannot.getAttribute('aria-disabled')).toBe('true')
    expect(entryFor(built.root(), 'IC-21').getAttribute('aria-disabled')).not.toBe('true')
  })

  it('an entry whose dictionary cell is empty is NAMED by its row of 表 T-109', () => {
    // ⭐ THE FALLBACK MOVED WITH THE WORD, AND ONLY WITH IT. `CommandItem.label`
    // 「is declared as the accessible name of the entry」 and comes from FR-038's
    // dictionary, whose every cell is empty today (PD-160) -- so the unit that
    // fills the member hands over the empty string, and something still has to
    // name the entry. ⛔ The row id is what names it, in the same place the word
    // would have gone: an entry with NO accessible name at all is the 「無反応」
    // FR-029's RATIONALE is about, and printing the id as the body would put a
    // word where FR-029 (MUST) says a shape goes.
    // ⚠️ PD-154 said 「行 ID を `data-icon` に置き、図形は描かない」 while there
    // was no figure in `src/`. There is one now, so the id keeps only the half
    // FR-029 and EZ-2 need of it.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        appHeaderItems: {
          ...EMPTY_HEADER,
          commands: [command({ icon: 'IC-7', label: '' }), command({ icon: 'IC-20', label: 'Named' })],
        },
      }),
    )

    const unnamed = entryFor(built.root(), 'IC-7')
    const named = entryFor(built.root(), 'IC-20')

    expect(unnamed.getAttribute('aria-label')).toBe('IC-7')
    expect(named.getAttribute('aria-label')).toBe('Named')
    // ⛔ The fallback does not eat the word: a unit that always named the entry
    // after its row would pass the line above and fail this one.
    expect(named.getAttribute('aria-label')).not.toBe('IC-20')
    // ⭐ And the row id is still where the machine reads it (EZ-2 of 表 T-040,
    // and IF-9's `readScreenPartAt`), whether the entry has a word or not.
    expect(unnamed.getAttribute('data-icon')).toBe('IC-7')
    expect(named.getAttribute('data-icon')).toBe('IC-20')
  })

  it('FR-029 (MUST): the shape an entry draws is the one 図 F-019 gives its row', () => {
    // 「各アイコンの図形は同書の 図 F-019 に従うこと（MUST）」, and 「図 F-019 の
    // 図形を第三者のアイコン集から差し替えてはならない（MUST NOT）」. What is
    // compared is the figure as it reaches `src/` -- element for element, in the
    // order the figure drew them, with the geometry it drew them with -- so a
    // unit that re-drew, re-scaled or substituted a shape is caught here rather
    // than only in the generator that carries the figure.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        appHeaderItems: { ...EMPTY_HEADER, commands: [command({ icon: 'IC-7', label: '' })] },
      }),
    )

    const shape = shapeIn(entryFor(built.root(), 'IC-7'))
    const drawn = glyphFor('IC-7')

    expect(shape.getAttribute('viewBox')).toBe(ICON_GLYPHS.viewBox)
    expect(shape.children.map((one) => one.tagName.toLowerCase())).toEqual(
      drawn.map((one) => one.tag),
    )
    for (const [at, element] of drawn.entries()) {
      const node = shape.children[at] as FakeElement
      for (const attribute of element.attributes) {
        // ⚠️ `style` is compared declaration by declaration, because a browser
        // is free to respell one and the fake respells them the way a browser
        // does. Everything else -- the geometry, which is the shape -- is
        // compared character for character.
        const said = (text: string | null): string =>
          attribute.name === 'style'
            ? (text ?? '')
                .split(';')
                .map((one) => one.replace(/\s+/g, ''))
                .filter((one) => one.length > 0)
                .sort()
                .join(';')
            : (text ?? '')
        expect(said(node.getAttribute(attribute.name)), `${element.tag} ${attribute.name}`).toBe(
          said(attribute.value),
        )
      }
    }
  })
})

describe('EZ-2 of 表 T-040 -- the entry the pointer rests on can be found', () => {
  // ⚠️ NOT ASSERTED: how a tooltip NAMES the entry it hangs on. EZ-2 fixes that
  // the explanation is the one for that icon and 表 T-078's FT-4 puts the WAIT
  // (S-124) in the shell, but no table spells the link, so nothing here checks
  // one. What is checked is PD-141's premise: the DOM can be read back.
  it('gives every drawn entry its row of 表 T-109 in data-icon', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const icons = selfAndDescendants(built.root())
      .map((one) => one.getAttribute('data-icon'))
      .filter((one): one is string => one !== null)

    for (const wanted of ['IC-20', 'IC-61', 'IC-52']) {
      expect(icons).toContain(wanted)
    }
  })

  it('counts one entry per CommandItem, so the shell can name what is under the pointer', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        appHeaderItems: {
          ...EMPTY_HEADER,
          commands: [command({ icon: 'IC-20' }), command({ icon: 'IC-21' }), command({ icon: 'IC-52' })],
        },
      }),
    )

    const header = oneByRole(built.root(), 'Header Commands')
    const icons = selfAndDescendants(header)
      .map((one) => one.getAttribute('data-icon'))
      .filter((one): one is string => one !== null)
    expect(icons.sort()).toEqual(['IC-20', 'IC-21', 'IC-52'])
  })
})

describe('IN-3 of 表 T-028 -- a tooltip is pointable and does not go by itself', () => {
  const tooltipView = viewWith({ tooltips: [iconTooltip('IC-20', 'TooltipTextOne')] })

  const tooltipsBox = (root: FakeElement): FakeElement => oneByRole(root, 'Tooltip')

  function draw(view: ScreenView = tooltipView): { built: Stage; surface: ScreenSurface } {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    surface.showScreenView(view)
    return { built, surface }
  }

  it('takes the pointer, so a person can reach into it', () => {
    const { built } = draw()

    const box = tooltipsBox(built.root())
    expect(box.textContent).toContain('TooltipTextOne')
    const styles = selfAndDescendants(box).map((one) => styleOf(one)).join(' ')
    expect(styles).toContain('pointer-events:auto')
  })

  it('⛔ does not go away by itself -- no clock of its own takes it', () => {
    vi.useFakeTimers()
    try {
      const { built } = draw()
      expect(vi.getTimerCount()).toBe(0)

      vi.advanceTimersByTime(600_000)

      expect(tooltipsBox(built.root()).textContent).toContain('TooltipTextOne')
    } finally {
      vi.useRealTimers()
    }
  })

  it('⛔ carries no on-screen control that puts it away, and no `x` to press', () => {
    // `IN-3` (MUST) asks 「消せること —— ポインタもフォーカスも動かさずに消す手立てが
    // あること」, and a mark drawn inside the tooltip cannot answer it: reaching
    // the mark IS moving the pointer. ⛔ `IN-4` (MUST) is where the dismissal
    // lives now -- its ladder ends 「出ている説明」 -- so a second entrance drawn
    // here would also be a second entrance to one operation, which FR-029
    // forbids (MUST NOT).
    const { built } = draw()
    const box = tooltipsBox(built.root())

    const pressable = selfAndDescendants(box).filter((one) =>
      built.world.registrations.some(
        (registration) => registration.type === 'click' && registration.node === one,
      ),
    )
    expect(pressable).toEqual([])
    // Nothing but the explanation's own words stands in the box.
    expect(box.textContent).toBe('TooltipTextOne')
  })

  it('⛔ never uses the title attribute the browser owns, which breaks IN-3 twice', () => {
    const { built } = draw()

    const titled = selfAndDescendants(built.root()).filter((one) => one.hasAttribute('title'))
    expect(titled).toEqual([])
  })
})

describe('表 T-103 -- the settled names reach the DOM so the parts can be found', () => {
  const NOT_IN_A_HELP_VIEW = new Set(['AI Export Modal', 'Resource Roster'])

  it('draws every part under the name 表 T-103 settled for it', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const root = built.root()
    for (const part of T_103_PARTS) {
      if (NOT_IN_A_HELP_VIEW.has(part.name)) continue
      expect(byRole(root, part.name).length, `${part.row} ${part.name}`).toBeGreaterThan(0)
    }
  })

  it('names the open surface by 表 T-103 where that table has a row for it', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    surface.showScreenView(
      viewWith({
        openModal: {
          surface: 'AI Export Modal',
          heading: 'AiHeading',
          commands: [],
          documentText: 'DocumentTextHere',
        },
      }),
    )
    expect(byRole(built.root(), 'AI Export Modal').length).toBeGreaterThan(0)

    surface.showScreenView(
      viewWith({
        openModal: {
          surface: 'Resource Roster',
          heading: 'RosterHeading',
          commands: [],
          resources: [],
        },
      }),
    )
    expect(byRole(built.root(), 'Resource Roster').length).toBeGreaterThan(0)
  })

  it('⛔ mints no name for a surface 表 T-103 has not named -- the requirement UID stands in', () => {
    const built = wire({ 'App Header': 37 })

    surfaceOf(built).showScreenView(
      viewWith({
        openModal: {
          surface: 'FR-074',
          heading: 'ExchangeHeading',
          commands: [],
          fields: [{ row: 'PF-9', name: 'CreationDate', text: '2026-08-20', isEditable: false, controls: [] }],
        },
      }),
    )

    expect(byRole(built.root(), 'FR-074').length).toBeGreaterThan(0)
  })

  it('names U-57 by 表 T-103, which no longer leaves that part unnamed', () => {
    // ⚠️ THIS CASE ONCE RECORDED AN ABSENCE. 表 T-103 had no row for the part
    // the notices stand in, so the member name PI-37 publishes stood in for it
    // and the DOM carried a lowercase spelling that no table had settled. The
    // row landed, so the absence is filled and what is owed is W-4 of 表 T-006a
    // (MUST): a `data-role` that carries a settled name carries it in `W-6`'s
    // form. The name is read out of the copy above rather than typed here.
    //
    // ⛔ U-57 also says what the part is NOT: it is not a `Confirmation`, and it
    // is not a 「面」 in the sense `S-99g` gives that word -- so it is not
    // something opened over the screen. The view below opens nothing (`viewWith`
    // leaves `openModal` null) and the part is drawn all the same.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({ notices: [notice({ manner: 'NT-6', text: 'NoticeTextOne' })] }),
    )

    expect(byRole(built.root(), partName('U-57')).length).toBeGreaterThan(0)
  })
})

describe('SC-1 / SC-4 / SC-5 of 表 T-031 -- what is placed by what', () => {
  it('SC-4: draws both scrollbars, lanes and grips, whether things fit or not', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        frame: {
          isFullScreen: false,
          dividers: [],
          // Everything fits: the grip is the whole lane. SC-4 still draws both.
          scrollbars: [
            { axis: 'horizontal', track: rect(176, 730, 620, 8), thumb: rect(176, 730, 620, 8) },
            { axis: 'vertical', track: rect(788, 40, 8, 690), thumb: rect(788, 40, 8, 690) },
          ],
        },
      }),
    )

    const lanes = byRole(built.root(), 'Scrollbars')
    expect(lanes).toHaveLength(2)
    const drawn = lanes.map((one) => selfAndDescendants(one).map(styleOf).join(' '))
    expect(drawn.join(' ')).toContain('620')
    expect(drawn.join(' ')).toContain('690')
  })

  it('FR-051: the Panel Divider is drawn from the band and the line the frame carries', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const bands = byRole(built.root(), 'Panel Divider')
    expect(bands).toHaveLength(2)
    const drawn = bands.map((one) => selfAndDescendants(one).map(styleOf).join(' ')).join(' ')
    // ⛔ FR-051 (MUST NOT): the band takes no width of its own from the Row
    // Area, so the only numbers it may be drawn with are the ones it arrived
    // with.
    expect(drawn).toContain('170')
    expect(drawn).toContain('800')
  })

  it('SC-1: a row title is placed by the box the description carries, not by a measurement', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [],
          titles: [rowTitle({ groupId: 'g-1', label: 'RowAlpha', box: rect(0, 137, 170, 29) })],
        },
      }),
    )

    const tree = oneByRole(built.root(), 'Row Title Tree')
    const label = theOneWithText(tree, 'RowAlpha')
    const placed = chainUpTo(label, tree).map(styleOf).join(' ')
    expect(placed).toContain('137')
    expect(placed).toContain('29')
  })

  it('sets a row in by the `indentPx` its description carries, and by no measure of its own', () => {
    // ⭐ PD-152 is closed (CR-287): `RowTitle` carries `indentPx`, so the screen,
    // the export and `FR-085`'s truncation all read ONE number. ⛛ The `1em` per
    // level this unit used to invent is gone -- an em is the reader's font size
    // and `S-37` is px, so the two drifted apart at every font size but one.
    // ⚠️ The boxes below avoid 24 and 36 on purpose, so that the two indents
    // cannot be confused with a height or an offset in the joined styles.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [],
          titles: [
            rowTitle({ groupId: 'g-2', label: 'RowAtTwo', depth: 2, box: rect(0, 41, 171, 29) }),
            rowTitle({ groupId: 'g-3', label: 'RowAtThree', depth: 3, box: rect(0, 70, 171, 29) }),
          ],
        },
      }),
    )

    const tree = oneByRole(built.root(), 'Row Title Tree')
    const two = chainUpTo(theOneWithText(tree, 'RowAtTwo'), tree).map(styleOf).join(' ')
    const three = chainUpTo(theOneWithText(tree, 'RowAtThree'), tree).map(styleOf).join(' ')

    // `FR-085`: 「その行の深さぶんのインデント」 -- two of `S-37` at depth 2,
    // three of it at depth 3.
    expect(two).toContain(`${2 * ROW_TITLE_INDENT}px`)
    expect(three).toContain(`${3 * ROW_TITLE_INDENT}px`)
    expect(two).not.toContain(`${3 * ROW_TITLE_INDENT}px`)
    expect(three).not.toContain(`${2 * ROW_TITLE_INDENT}px`)
    // ⛛ Nothing sized in ems decides the indent any more.
    expect(two).not.toContain('1em')
    expect(three).not.toContain('2em')
  })

  // -------------------------------------------------------------------------
  // D-116 -- the room the row's name is ACTUALLY given
  //
  // ⛔ THE DEFECT THESE CASES STAND IN FOR. Measured on the shipped build of
  // 2026-08-30: the row's three controls sat in the row's own flow with
  // `visibility:hidden`, holding 48 of a 170px panel, while `S-140` of 表 T-206
  // -- 「行の操作子に確保する場所（`FR-085`）」-- states 0px. So `FR-085` cut the
  // name against 158px and the browser was handed 90, and the difference went
  // into the browser's own ellipsis, which `isLabelTruncated` cannot record.
  //
  // THE TWO MUSTs THAT SETTLE IT:
  //   表 T-051 `HF-6`  ⭐「**操作子は、行の名前の上へ重ねて描くこと（MUST）** ——
  //     確保する場所は 0 だからである（`S-140`）」, and ⛔「**描かないあいだも、
  //     確保する場所を変えてはならない（MUST NOT）** —— 規則と理由は `FR-085` が
  //     持つ」
  //   `FR-085`         「使える幅は、`rowTitlePanelWidth` から、その行の深さぶん
  //     のインデント（`S-37`）と、行の操作子…に確保した場所と、**行の掴み代
  //     （表 T-023d の `GR-20`）に確保した場所（`S-138`）とその隔たり（`S-218`）**
  //     を引いた残りとすること（MUST）」
  //
  // ⇒ Of the four terms, exactly three may show up as room taken beside the
  // name: the indent, the grab strip and its gap. The controls' term is 0, so a
  // control that stands in the row's flow takes room the sum does not know about
  // -- which is the defect, stated as something a case can see.
  //
  // ⚠️ WHAT THESE CASES DO NOT ASSERT. A fake DOM lays nothing out, so the 90 vs
  // 158 that was measured in the browser cannot be measured here; what is asked
  // is which elements are IN the flow and what the flow spends. The pixels are
  // tests/system's.
  // -------------------------------------------------------------------------

  /** `S-218` -- 「行の掴み代と行の名前のあいだ（表 T-023d の `GR-20`）」. */
  const s218 = (): number => {
    const row = specTable('T-206').rows.find((one) => one.id === 'S-218')
    if (row === undefined) throw new Error('表 T-206 no longer holds S-218')
    const found = /(\d+(?:\.\d+)?)\s*px/.exec(row.by['既定'] ?? '')
    if (found === null) throw new Error('S-218 states no px value in its 既定 column')
    return Number(found[1])
  }

  /** `S-140` -- 「行の操作子に確保する場所（`FR-085`）」. */
  const s140 = (): number => {
    const row = specTable('T-206').rows.find((one) => one.id === 'S-140')
    if (row === undefined) throw new Error('表 T-206 no longer holds S-140')
    const found = /(\d+(?:\.\d+)?)\s*px/.exec(row.by['既定'] ?? '')
    if (found === null) throw new Error('S-140 states no px value in its 既定 column')
    return Number(found[1])
  }

  /** The one row the panel drew, and its direct children. */
  const drawnRow = (title: RowTitle): { row: FakeElement; children: FakeElement[] } => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({ rowTitlePanel: { pinnedTitles: [], titles: [title] } }),
    )
    const tree = oneByRole(built.root(), 'Row Title Tree')
    const row = tree.children[0]
    if (row === undefined) throw new Error('the panel drew no row')
    return { row, children: [...row.children] }
  }

  /** A child that is taken out of the flow takes no room from the name. */
  const isOutOfFlow = (element: FakeElement): boolean =>
    styleOf(element).includes('position:absolute')

  it('⛔ D-116 / HF-6 (MUST): every row control is laid OVER the name, not beside it', () => {
    // 「⭐ **操作子は、行の名前の上へ重ねて描くこと（MUST）** —— 確保する場所は 0
    // だからである」, with `S-140` read out of 表 T-206 to hold that 0 to the
    // manuscript rather than to this comment.
    // GOES RED IF: a control goes back into the row's flow, which is what took
    // 48px of a 170px panel away from the name on 2026-08-30.
    expect(s140(), '表 T-206 の `S-140`: 行の操作子に確保する場所').toBe(0)

    const { children } = drawnRow(
      rowTitle({
        groupId: 'g-1',
        label: 'RowAlpha',
        box: rect(0, 137, 170, 29),
        expander: { canOpen: true, canClose: true, canCloseBelow: true },
      }),
    )
    const inFlow = children.filter((child) => !isOutOfFlow(child))
    // The grab strip (`GR-20`) and the name itself, and nothing else.
    // ⚠️ NOT A PINNED ROW: 表 T-023d の `GR-20` (MUST NOT) says a pinned row
    // cannot be grabbed —— 「⛔ **ピン止めしている行は掴めないこと（MUST NOT）**」
    // —— so it draws no strip and this count would be one for a reason that has
    // nothing to do with the controls.
    expect(
      inFlow.length,
      `表 T-051 の \`HF-6\`: ${inFlow.map(styleOf).join(' / ')} stand in the row's flow`,
    ).toBe(2)
  })

  it('⛔ FR-085 (MUST): what the flow spends beside the name is the indent, `S-138` and `S-218`', () => {
    // 「その行の深さぶんのインデント（`S-37`）と …… **行の掴み代（`GR-20`）に確保
    // した場所（`S-138`）とその隔たり（`S-218`）**を引いた残り」. ⭐ Three terms,
    // three numbers on the row, all read from the manuscript.
    // GOES RED IF: the strip stops being `S-138` wide, the gap stops being
    // `S-218`, or the indent stops being the `indentPx` the description carries.
    const depth = 3
    const { row, children } = drawnRow(
      rowTitle({ groupId: 'g-3', label: 'RowAtThree', depth, box: rect(0, 70, 170, 29) }),
    )
    // ⚠️ THE RAW STYLE, not `styleOf`: that helper strips every space, and the
    // padding this case reads is a four-value shorthand whose spaces are what
    // says WHICH side the indent is on.
    const style = inlineStyle(row)

    // 「その行の深さぶんのインデント」 -- and `RowTitle.indentPx` is that product.
    expect(style, 'FR-085: the row is set in by its own `indentPx`').toContain(
      `padding:0 0 0 ${depth * ROW_TITLE_INDENT}px`,
    )
    // 「その隔たり（`S-218`）」 -- the space between the strip and the name.
    expect(style, 'FR-085: `S-218` stands between the grab strip and the name').toContain(
      `gap:${s218()}px`,
    )

    // 「行の掴み代（表 T-023d の `GR-20`）に確保した場所（`S-138`）」. `HF-15`
    // (MUST) draws it always -- 「⛔ **`HF-6` の対象ではない**」 -- so it is the
    // one thing that may stand in the flow ahead of the name.
    const inFlow = children.filter((child) => !isOutOfFlow(child))
    const strip = inFlow[0]
    expect(strip, 'the row drew nothing in its flow').toBeDefined()
    expect(styleOf(strip as FakeElement), '表 T-023d の `GR-20`: 幅は `S-138`').toContain(
      `width:${S_138.px}px`,
    )
  })

  it('⛔ HF-6 (MUST NOT): the room does not change with whether the controls can act', () => {
    // 「⛔ **描かないあいだも、確保する場所を変えてはならない（MUST NOT）** ——
    // 規則と理由は `FR-085` が持つ」, and `S-140` の備考: 「⚠️ **打ち切りの位置が
    // 動かないことが、この規則の目的である**」.
    // ⭐ Two rows that differ ONLY in what their controls can do: the row's own
    // box and the name's box have to come out the same, or the cut moves with
    // the state of the controls.
    // GOES RED IF: the row reserves room per control, or the name's flex share
    // is written from the control count.
    const shape = { groupId: 'g-1', label: 'RowAlpha', box: rect(0, 137, 170, 29) } as const
    const quiet = drawnRow(
      rowTitle({ ...shape, expander: { canOpen: false, canClose: false, canCloseBelow: false } }),
    )
    // ⚠️ `isPinned` IS HELD EQUAL ON BOTH SIDES. `FR-098` gives a pinned row a
    // ground of its own, which is a colour and not room; letting it vary here
    // would make this case about that instead.
    const busy = drawnRow(
      rowTitle({ ...shape, expander: { canOpen: true, canClose: true, canCloseBelow: true } }),
    )

    expect(styleOf(busy.row), 'FR-085 (MUST NOT): the row itself changed size').toBe(
      styleOf(quiet.row),
    )

    const nameOf = (one: { children: FakeElement[] }): string => {
      const found = one.children.filter((child) => !isOutOfFlow(child))[1]
      if (found === undefined) throw new Error('the row drew no name in its flow')
      return styleOf(found)
    }
    expect(nameOf(busy), 'FR-085 (MUST NOT): the name was given a different share').toBe(
      nameOf(quiet),
    )
  })

  it('SC-5: the Properties Panel scrolls its own contents and is slaved to nothing', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const panel = oneByRole(built.root(), 'Properties Panel')
    const style = selfAndDescendants(panel).map(styleOf).join(' ')
    expect(style).toContain('overflow-y:auto')
  })

  it('PD-155: the Properties Panel starts at the line of its own Panel Divider', () => {
    const at = (lineX: number): number => {
      const built = wire({ 'App Header': 37 })
      surfaceOf(built).showScreenView(
        viewWith({
          frame: {
            isFullScreen: false,
            dividers: [
              {
                panel: 'propertiesPanel',
                band: rect(lineX - 4, 40, 6, 700),
                line: rect(lineX, 40, 1, 700),
              },
            ],
            scrollbars: [],
          },
          propertiesPanel: PROPERTIES,
        }),
      )
      const left = styleMap(oneByRole(built.root(), 'Properties Panel')).get('left')
      return Number((left ?? '').replace('px', ''))
    }

    // ⚠️ Which side of the one-pixel line the panel begins on is display only
    // (PD-151), so the case asks only that the edge comes FROM the line: drag
    // the divider 506 px and the panel's edge moves 506 px.
    expect(at(806) - at(300)).toBe(506)
    expect(Math.abs(at(806) - 806)).toBeLessThanOrEqual(1)
  })
})

describe('FR-099 / NT-1 / NT-3 / NT-3a of 表 T-037', () => {
  const roster = (unassignedTaskNames: readonly (string | null)[]): ScreenView =>
    viewWith({
      openModal: {
        surface: 'Resource Roster',
        heading: 'RosterHeading',
        commands: [],
        resources: [{ uid: 7, name: 'ResourceOne', isReferenced: true, isSelected: false, unassignedTaskNames }],
      },
    })

  it('⛔ shows what a deletion would unassign BY NAME, never as a count', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(roster(['TaskAlpha', 'TaskBeta']))

    const box = oneByRole(built.root(), 'Resource Roster')
    expect(box.textContent).toContain('TaskAlpha')
    expect(box.textContent).toContain('TaskBeta')
  })

  it('gives each name an element of its own, so two of one name are two lines', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(roster(['TaskAlpha', 'TaskAlpha']))

    const box = oneByRole(built.root(), 'Resource Roster')
    expect(withText(box, 'TaskAlpha')).toHaveLength(2)
  })

  it('⛔ does not lose a Task that carries no name of its own', () => {
    const withNull = wire({ 'App Header': 37 })
    surfaceOf(withNull).showScreenView(roster(['TaskAlpha', null]))
    const named = wire({ 'App Header': 37 })
    surfaceOf(named).showScreenView(roster(['TaskAlpha']))

    // ⭐ One more element for the nameless one: losing it between separators is
    // exactly what turns the list back into the count FR-099 forbids.
    const counted = (built: Stage): number =>
      selfAndDescendants(oneByRole(built.root(), 'Resource Roster')).length
    expect(counted(withNull)).toBe(counted(named) + 1)
  })

  it('NT-1 / NT-3 / NT-3a: a notice draws its words, its manner, its next steps and its count', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        notices: [
          notice({
            manner: 'NT-3a',
            text: 'NoticeWordsHere',
            nextSteps: ['NextStepOne', 'NextStepTwo'],
            affectedCount: 12,
          }),
        ],
      }),
    )

    const box = oneByRole(built.root(), partName('U-57'))
    expect(box.textContent).toContain('NoticeWordsHere')
    expect(box.textContent).toContain('NextStepOne')
    expect(box.textContent).toContain('NextStepTwo')
    // ⛔ NT-3 asks the COUNT to be added to what the person is told. Measured
    // behaviour: it reaches the page only as `data-affected-count`, which no
    // reader can see -- and NT-1, in the same table, forbids telling by
    // anything but words (MUST NOT). The next steps beside it are drawn as
    // words, so drawing this one was available.
    expect(box.textContent).toContain('12')
    // ⭐ NT-5 asks a warning to be told apart from NT-1's refusal, and the row
    // is what tells them apart -- so it travels with the notice.
    expect(serialize(box)).toContain('NT-3a')
  })

  it('draws no count where the row does not ask for one', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({ notices: [notice({ manner: 'NT-6', text: 'NoticeWordsHere' })] }),
    )

    const box = oneByRole(built.root(), partName('U-57'))
    expect(box.textContent).not.toContain('null')
    expect(box.textContent).not.toContain('NaN')
  })
})

describe('FR-038 -- the words are carried, and the language is readable before the toggle', () => {
  it('draws headings, labels and notice words exactly as they arrived', () => {
    // What this measures is that every word the description carried reached the
    // page unaltered -- this unit chooses none of them.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const text = built.root().textContent
    // ⚠️ THE PANEL'S WORD IS AN ITEM NAME AND NO LONGER A HEADING (CR-272):
    // FR-072 (MUST NOT) leaves the panel without a heading row, and FR-006
    // (MUST) is what still puts the item name on the screen.
    for (const word of ['DocumentTitleHere', 'start', 'HelpHeading', 'NoticeTextOne']) {
      expect(text).toContain(word)
    }
    // ⛔ AN ENTRY'S WORD IS ITS NAME, NOT ITS BODY. FR-029 (MUST) has an entry
    // tell what it is for 「言葉ではなくアイコンで」, so the two words below are
    // the ACCESSIBLE names of the two entries that carry them -- `CommandItem.
    // label` is declared as exactly that -- and asking `textContent` for them
    // would be asking FR-029 to be broken. ⚠️ Naming the entry each word belongs
    // to is stronger than the old blanket text search: a word landing on the
    // wrong entry used to pass.
    const commandFor = (icon: string): FakeElement => {
      const found = selfAndDescendants(built.root()).filter(
        (one) => one.getAttribute('data-icon') === icon,
      )
      const first = found[0]
      if (first === undefined) throw new Error(`nothing carries data-icon="${icon}"`)
      return first
    }
    expect(commandFor('IC-20').getAttribute('aria-label')).toBe('HeaderCommandOne')
    expect(commandFor('IC-61').getAttribute('aria-label')).toBe('PaletteCommandOne')
  })

  it('makes the language the help surface is in readable without pressing anything', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const help = oneByRole(built.root(), 'Help Modal')
    const named = selfAndDescendants(help).flatMap((one) =>
      [...one.attributes].filter(([name, value]) => name.includes('lang') && value === 'en'),
    )
    expect(named.length).toBeGreaterThan(0)
  })

  it('carries the three licence values FR-069 asks for into the help surface', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const help = oneByRole(built.root(), 'Help Modal')
    expect(help.textContent).toContain('LicenceTextHere')
    expect(help.textContent).toContain('CopyrightNoticeHere')
    expect(help.textContent).toContain('AttributionOne')
  })
})

describe('FR-053 (MUST) -- a minimised palette shows the grab band and nothing else', () => {
  // ⭐ THE USER'S RULING OF 2026-09-01: 「コマンドパレットを最小化した時は、コマン
  // ドパレットの掴みどころ `::` と `-` の部分 だけを表示しろ」 -- it overrode the
  // 2026-08-28 ruling that had also kept the armed reading on a minimised
  // palette. FR-053 now says 「最小化しているあいだに出すのは掴み帯だけとし、ほか
  // は何も出さないこと（MUST）」 and (MUST NOT) that the armed reading is not
  // drawn there.
  //
  // ⛔ WHAT THIS UNIT OWES AND WHAT IT DOES NOT. UF-65 decides that a minimised
  // palette carries no `armedText` -- that is the adapter's answer and
  // tests/unit/fr-053-minimised-shows-the-band-alone.test.ts holds it. What THIS
  // unit owes is that a description carrying no reading draws no box for one:
  // an empty word laid out is still something on the screen beside the band.

  const minimised = (armedText: string | null): ScreenView =>
    viewWith({
      commandPalette: { ...PALETTE, isMinimised: true, groups: [], armedText },
    })

  it('⭐ prints no word at all when the description carries none', () => {
    // GOES RED IF: the reading comes back as an empty box, or the entries are
    // drawn again while minimised. ⚠️ The word compared against is the one the
    // NOT-minimised fixture carries, so this case cannot pass by the fixture
    // going silent.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(minimised(null))

    const palette = oneByRole(built.root(), 'Command Palette')
    expect(shownText(palette), 'the band alone, with no word beside it').toBe('')
    expect(byRole(palette, 'Palette Groups')).toHaveLength(0)
    expect(byRole(palette, 'Palette Commands')).toHaveLength(0)
  })

  it('⛔ draws the band and no second box beside it', () => {
    // 「最小化しているあいだに出すのは掴み帯だけとし、ほかは何も出さないこと
    //   （MUST）」 -- 「ほか」 is anything at all, and an EMPTY box is something:
    // it carries its own room, which is measured height under the band.
    //
    // ⛔ WHY THE CASE ABOVE IS NOT ENOUGH. That one reads the WORDS and the
    // group roles, and an empty contents box carries neither -- so a drawing
    // side that laid one out anyway passed it in silence. Measured on the
    // shipped build of 2026-09-02: the minimised palette is 44x26 with one
    // child; with the empty box drawn it is 44x42 with two, which is 16px of
    // nothing under a band the user asked to be alone.
    // GOES RED IF: a second child is appended to a minimised palette.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(minimised(null))

    const palette = oneByRole(built.root(), 'Command Palette')
    expect(palette.children, 'the band, and nothing beside it').toHaveLength(1)
    const band = palette.children[0] as FakeElement
    expect(
      selfAndDescendants(band).map((one) => one.getAttribute('data-icon')),
      'and the one child IS the band -- IC-53 is drawn on it',
    ).toContain('IC-53')
  })

  it('⛔ still draws the band, so the palette can be moved again (GR-19)', () => {
    // ⚠️ THE HALF OF THE 2026-08-28 RULING THAT SURVIVED. FR-053 keeps the band
    // 「⛔ 帯を消すと最小化したパレットを動かせなくなる」, and IC-75 rides on it in
    // both states.
    // GOES RED IF: the drawing side reads "show only the grab area" as "show
    // less", and takes the band's own marks with the word.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(minimised(null))

    const palette = oneByRole(built.root(), 'Command Palette')
    const marks = selfAndDescendants(palette)
      .map((one) => one.getAttribute('data-icon'))
      .filter((one): one is string => one !== null)
    expect(marks, 'IC-53 (掴みどころ) and IC-75 (最小化) are what the band carries')
      .toEqual(expect.arrayContaining(['IC-53', 'IC-75']))
  })

  it('⭐ prints the word again as soon as the description carries one', () => {
    // ⚠️ THE CONTROL CASE. Without it a unit that never printed `armedText` at
    // all would pass the first case, and FR-053 still makes the reading a MUST
    // everywhere but the minimised state.
    // GOES RED IF: the null branch is written as "never draw the reading".
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(viewWith({ commandPalette: PALETTE }))

    const palette = oneByRole(built.root(), 'Command Palette')
    expect(shownText(palette)).toContain(PALETTE.armedText)
  })
})

describe('FR-023 -- nothing that arrived from a document becomes markup', () => {
  const HOSTILE = '<img src=x onerror="boom">'

  it('⛔ writes no markup anywhere', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        appHeaderItems: { ...EMPTY_HEADER, documentTitle: HOSTILE },
        rowTitlePanel: { pinnedTitles: [], titles: [rowTitle({ groupId: 'g-1', label: HOSTILE })] },
      }),
    )

    expect(built.world.markupWrites).toEqual([])
  })

  it('draws a hostile name as the words it is', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({ appHeaderItems: { ...EMPTY_HEADER, documentTitle: HOSTILE } }),
    )

    expect(oneByRole(built.root(), 'Document Title').textContent).toBe(HOSTILE)
  })

  it('builds no selector out of what a document said', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        appHeaderItems: { ...EMPTY_HEADER, documentTitle: HOSTILE },
        rowTitlePanel: { pinnedTitles: [], titles: [rowTitle({ groupId: HOSTILE, label: HOSTILE })] },
        tooltips: [{ anchor: { kind: 'rowTitle', groupId: HOSTILE }, text: HOSTILE, assignment: null }],
      }),
    )

    for (const selector of built.world.selectors) {
      expect(selector).not.toContain('img')
      expect(selector).not.toContain('onerror')
    }
  })

  it('adds no element for the markup a name contains', () => {
    const hostile = wire({ 'App Header': 37 })
    surfaceOf(hostile).showScreenView(
      viewWith({ appHeaderItems: { ...EMPTY_HEADER, documentTitle: HOSTILE } }),
    )
    const plain = wire({ 'App Header': 37 })
    surfaceOf(plain).showScreenView(
      viewWith({ appHeaderItems: { ...EMPTY_HEADER, documentTitle: 'PlainTitle' } }),
    )

    expect(selfAndDescendants(hostile.root())).toHaveLength(
      selfAndDescendants(plain.root()).length,
    )
  })
})

describe('showScreenView twice -- the whole description each time', () => {
  const first = viewWith({
    appHeaderItems: { ...EMPTY_HEADER, documentTitle: 'TitleOne' },
    propertiesPanel: PROPERTIES,
    commandPalette: PALETTE,
    openModal: HELP_MODAL,
    notices: [
      notice({ manner: 'NT-1', text: 'NoticeOne' }),
      notice({ manner: 'NT-6', text: 'NoticeTwo' }),
      notice({ manner: 'NT-3a', text: 'NoticeThree', nextSteps: ['StepOne'] }),
    ],
    dialogueField: DIALOGUE,
    tooltips: [iconTooltip('IC-20', 'TooltipOne')],
  })

  const second = viewWith({
    appHeaderItems: { ...EMPTY_HEADER, documentTitle: 'TitleTwo' },
    notices: [notice({ manner: 'NT-6', text: 'NoticeFour' })],
  })

  it('leaves nothing of the first description that the second does not carry', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    surface.showScreenView(first)
    expect(built.root().textContent).toContain('TitleOne')

    surface.showScreenView(second)

    const text = shownText(built.root())
    // ⚠️ `start` stands where `PropertiesHeading` did: FR-072 (MUST NOT) leaves
    // the panel no heading row, so the word the closed panel has to take away
    // with it is its field's item name (CR-272).
    for (const gone of ['TitleOne', 'NoticeOne', 'NoticeTwo', 'NoticeThree', 'StepOne', 'HelpHeading', 'LicenceTextHere', 'PaletteCommandOne', 'start', 'MessageOne', 'TooltipOne']) {
      expect(text, gone).not.toContain(gone)
    }
    expect(text).toContain('TitleTwo')
    expect(text).toContain('NoticeFour')
  })

  it('takes the closed parts off the screen rather than leaving them showing', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    surface.showScreenView(first)

    surface.showScreenView(second)

    for (const role of ['Help Modal', 'Command Palette', 'Properties Panel', 'Dialogue Field']) {
      for (const one of byRole(built.root(), role)) {
        expect(isShown(one), role).toBe(false)
      }
    }
  })

  it('replaces the title rather than adding to it', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    surface.showScreenView(first)

    surface.showScreenView(second)

    expect(oneByRole(built.root(), 'Document Title').textContent).toBe('TitleTwo')
  })

  it('keeps one root, however many descriptions arrive', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    surface.showScreenView(first)
    surface.showScreenView(second)
    surface.showScreenView(RICH_VIEW)
    surface.showScreenView(EMPTY_VIEW)

    expect(built.mount.children).toHaveLength(1)
    expect(byRole(built.root(), 'App Header')).toHaveLength(1)
  })
})

describe('boundaries', () => {
  it('draws an empty description without complaint, and shows the screen', () => {
    const built = wire({ 'App Header': 37 })

    expect(() => surfaceOf(built).showScreenView(EMPTY_VIEW)).not.toThrow()

    expect(isShown(built.root())).toBe(true)
    expect(byRole(built.root(), partName('U-57')).every((one) => one.textContent === '')).toBe(true)
    expect(byRole(built.root(), 'Tooltip').every((one) => one.textContent === '')).toBe(true)
  })

  it('⛔ substitutes nothing for a document that carries no title', () => {
    const built = wire({ 'App Header': 37 })

    surfaceOf(built).showScreenView(viewWith({ appHeaderItems: EMPTY_HEADER }))

    // ⛔ FR-035 fixes `Untitled` for the BROWSER TAB and says nothing about the
    // header, so nothing is invented here.
    expect(oneByRole(built.root(), 'Document Title').textContent).toBe('')
    expect(built.root().textContent).not.toContain('Untitled')
  })

  it('draws a description whose every optional part is null', () => {
    const built = wire({ 'App Header': 37 })

    surfaceOf(built).showScreenView(
      viewWith({
        propertiesPanel: null,
        commandPalette: null,
        openModal: null,
        dialogueField: null,
        appHeaderItems: { ...EMPTY_HEADER, documentTitle: null },
        rowTitlePanel: {
          pinnedTitles: [],
          // ⚠️ `expander` LEFT THIS LIST ON 2026-08-30 AND IS NOT AN OMISSION:
          // `RowTitle.expander` stopped being nullable when 表 T-051 の `HF-1`
          // 「各行に… 1 つずつ置く」 was read into the type, so it is no longer
          // one of the description's optional parts. ⭐ `label` still is -- `FR-058`
          // and `AT-54` make a row's own name genuinely absent -- and that is what
          // this row is here to carry.
          titles: [rowTitle({ groupId: 'g-1', label: null })],
        },
      }),
    )

    expect(isShown(built.root())).toBe(true)
    expect(built.world.markupWrites).toEqual([])
  })

  it('draws the same description twice without doubling anything', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    surface.showScreenView(RICH_VIEW)
    const once = selfAndDescendants(built.root()).length
    const readingTheTitleOnce = withText(built.root(), 'DocumentTitleHere').length
    surface.showScreenView(RICH_VIEW)

    expect(selfAndDescendants(built.root())).toHaveLength(once)
    // ⚠️ The count is taken from the FIRST draw rather than written here: how
    // many boxes end up reading exactly the title is a nesting no requirement
    // fixes, and pinning it would make this case fail whenever the band gains a
    // wrapper. What the case is for is that the second draw adds none of them.
    expect(withText(built.root(), 'DocumentTitleHere')).toHaveLength(readingTheTitleOnce)
    // ⭐ W-4 of 表 T-006a: exactly ONE box carries the settled name `U-27`, and
    // it reads the title. `oneByRole` throws if there is a second.
    expect(oneByRole(built.root(), 'Document Title').textContent).toBe('DocumentTitleHere')
  })
})

describe('LY-5 of 表 T-060 / R7.3 -- the outside arrives as an argument', () => {
  it('reaches for no global browser', () => {
    // ⭐ vitest.config.ts runs these under Node with no DOM, so a unit that
    // reached for one would throw rather than pass quietly. The assertion is
    // here so that a later change of environment cannot make the case vacuous.
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined')

    const built = wire({ 'App Header': 37 })
    expect(() => surfaceOf(built).showScreenView(RICH_VIEW)).not.toThrow()
  })

  it('calls nothing on the host it was handed but the two makers and IN-6 listener', () => {
    // R7.3 / LY-5: the browser arrives as an argument. ⛔ The claim is that the
    // unit asks the handed-in host for a CLOSED set of members -- no
    // `querySelector`, no `defaultView`, no `body` -- and the fake's Proxy
    // records every member reached for, so a unit that reached past them is
    // visible rather than silent. ⭐ THE CLOSEDNESS IS THE CLAIM, not the size.
    // ⚠️ `createElementNS` joined `createElement` when the icons started being
    // drawn as 図 F-019 gives them (FR-029, MUST): the figure is SVG, and an SVG
    // element made with `createElement` is an unknown HTML element that draws
    // nothing at all.
    // ⚠️ `addEventListener` joined them on 2026-08-30 for IN-6 of 表 T-028
    // (MUST, 利用者の裁定): a press outside a field settles the edit in it, and
    // the press that ruling names lands on the schedule -- which IF-1 puts up
    // beside this unit's tree, so the document is the nearest node on its way.
    // See the case above for why FT-1 and 表 T-078 are untouched by it.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)
    surfaceOf(built).readDialogueInput()

    expect([...new Set(built.world.hostMembers)].sort()).toEqual([
      'addEventListener',
      'createElement',
      'createElementNS',
    ])
  })

  it('never writes on the element it was given to mount in', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    expect([...built.mount.attributes]).toEqual([])
    expect(built.mount.styleWrites).toEqual([])
  })

  it('holds what is current here, so a second surface starts clean', () => {
    const one = wire({ 'App Header': 37 })
    surfaceOf(one).showScreenView(viewWith({ dialogueField: DIALOGUE }))
    const entry = dialogueEntry(one.root())
    entry.value = 'please wait'
    keyPress(entry, 'Enter')

    const other = wire({ 'App Header': 37 })
    surfaceOf(other).showScreenView(viewWith({ dialogueField: DIALOGUE }))

    expect(surfaceOf(other).readDialogueInput()).toBeNull()
    expect(surfaceOf(one).readDialogueInput()?.isSettled).toBe(true)
  })
})

// ===========================================================================
// FR-029 (MUST) -- the box a shape is drawn in, and the MUST NOT that keeps it
// the same on every surface.
//
// docs/spec/01-04-requirements.md:3699 (FR-029 STATEMENT):
//   「図形を描く箱の一辺は `_assets/tbl-settings.md` の 表 T-206 の `S-138` に
//    従うこと（MUST）。載る面によって変えてはならない（MUST NOT）」
//   —— 同じ図形が面ごとに違う大きさで出ると、同じものだと読めなくなる。
//   ⚠️ 「一辺が定めるのは図形の箱であって、それを載せる入口の外形ではない」
//      —— 枠と余白と行送りは入口の側が決める。
//
// So the cases below read the SHAPE's box and never the entry's outline: an
// entry that measures more than the box because of its border, its padding and
// the line it sits on is not a fault, and asserting otherwise would test the
// sentence the requirement wrote down to exclude.
//
// docs/spec/_assets/tbl-settings.md:245 (表 T-206, S-138):
//   | S-138 | 入口の図形を描く箱の一辺（`FR-029`） | 12px 🔎 | ... |
//   ⛔ 「閲覧者の文字サイズに追随させない」 -- which is why a box stated in `em`
//      is a failure here and not a difference of spelling.
//   ⭐ Why the row is in 表 T-206 at all: 「書き出す絵に入口は出ない（表 T-076
//      の `EP-1` と `EP-4`）ので、渡した相手の絵はこの値で変わらない」. EP-1
//      draws the header's band and its `Document Title` and nothing else of it;
//      EP-4 draws no row control at all. So this number is a dimension of the
//      screen's tools and never of the document. ⛔ Nothing below asks this unit
//      about the export: 表 T-076 belongs to ImageExporter (CP-21) and UF-71
//      draws the screen.
//
// ⭐ MEASURED, NOT ASSUMED. `S-138` was changed in the manuscript
// (`docs/spec/_source/settings.json`, 12 -> 21) and `npm run gen:settings` was
// re-run: 8 of the cases below turned red and 82 stayed green, each failure
// naming the row and the surface it was drawn on and reporting the 12px the
// unit had drawn. Putting the 12 back and re-running the generator restored
// both files byte for byte (sha256 unchanged; 78,301 and 37,581 bytes). So the
// expectations here really are the manuscript's, and not a number typed twice.
// ===========================================================================

/** 表 T-051 HF-5's first MUST, copied from docs/spec/01-04-requirements.md:1312. */
const T_051_HF5_SAME_SIZE_HERE = '操作子を同じ大きさで描くこと（MUST）'

/** FR-029's two sentences about the box, copied from docs/spec/01-04-requirements.md:3699. */
const FR_029_THE_BOX = '図形を描く箱の一辺は'
const FR_029_NOT_BY_SURFACE = '載る面によって変えてはならない（MUST NOT）'

/**
 * One entry per surface a shape is drawn on, each with the row of 表 T-109 that
 * names it and the 面 that table puts it on.
 *
 * ⭐ 表 T-109 (docs/spec/_assets/tbl-glossary.md:465, 497, 503-506):
 *   | IC-20 | `App Header`       | ... | `Agent API` を有効にする・無効にする |
 *   | IC-52 | `Help Modal` / ... | ... | 開いている面を閉じる |
 *   | IC-58 | `Row Title Panel`  | ... | 行の配下をすべて開く |
 *   | IC-59 | `Row Title Panel`  | ... | その行自身を畳む |
 *   | IC-60 | `Row Title Panel`  | ... | 行をピン止めし、同じ入口で外す |
 *   | IC-61 | `Command Palette`  | ... | 依存線を構える |
 * ⛔ Four different 面 on purpose: the header, the floating palette, a surface
 * opened OVER the screen, and the controls on a row. That is the whole of what
 * FR-029's MUST NOT is about, and one surface would not test it.
 */
const T_109_ONE_PER_SURFACE = [
  { row: 'IC-20', surface: 'App Header' },
  { row: 'IC-61', surface: 'Command Palette' },
  { row: 'IC-52', surface: 'Help Modal' },
  { row: 'IC-58', surface: 'Row Title Panel' },
  { row: 'IC-59', surface: 'Row Title Panel' },
  { row: 'IC-60', surface: 'Row Title Panel' },
] as const

/** A description that puts an entry on each of the four surfaces above at once. */
const EVERY_SURFACE_VIEW: ScreenView = viewWith({
  appHeaderItems: {
    ...EMPTY_HEADER,
    commands: [command({ icon: 'IC-20', label: 'AgentApiOnOff' })],
  },
  commandPalette: PALETTE,
  openModal: HELP_MODAL,
  rowTitlePanel: {
    pinnedTitles: [],
    titles: [
      rowTitle({
        groupId: 'g-1',
        label: 'RowOne',
        expander: { canOpen: true, canClose: true, canCloseBelow: false },
      }),
    ],
  },
})

/** The one node carrying a row of 表 T-109, anywhere under the node given. */
function iconEntry(root: FakeElement, icon: string): FakeElement {
  const found = selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') === icon)
  const first = found[0]
  if (first === undefined) throw new Error(`nothing carries data-icon="${icon}"`)
  return first
}

/**
 * What the shape's box measures on one axis, as the node states it.
 *
 * ⚠️ Read off the SVG element itself, which is the box FR-029 means -- 「一辺が
 * 定めるのは図形の箱であって、それを載せる入口の外形ではない」. Either spelling
 * counts, because no table settles one: SVG carries `width` / `height` as
 * presentation attributes and a declaration overrides them, so the declaration
 * is read first and the attribute behind it.
 */
function glyphSide(shape: FakeElement, axis: 'width' | 'height'): string {
  const declared = styleMap(shape).get(axis)
  if (declared !== undefined && declared.trim() !== '') return declared.trim().toLowerCase()
  const attribute = shape.getAttribute(axis)
  if (attribute !== null && attribute.trim() !== '') return attribute.trim().toLowerCase()
  throw new Error(`the shape states no ${axis} at all: ${serialize(shape)}`)
}

/**
 * That length in CSS pixels, or `null` where it is stated in anything else.
 *
 * ⛔ `null` for `em`, `rem`, `%` and `ex` is the point rather than a limitation:
 * S-138's cell says 「閲覧者の文字サイズに追随させない」, so a box that follows
 * the reader's text size is the failure that sentence names.
 */
function pixelsOf(value: string): number | null {
  const found = /^(-?\d+(?:\.\d+)?)(?:px)?$/.exec(value.trim())
  return found === null ? null : Number(found[1])
}

/** Both sides of one entry's box, for a comparison across surfaces. */
const glyphBoxOf = (entry: FakeElement): { readonly width: string; readonly height: string } => {
  const shape = shapeIn(entry)
  return { width: glyphSide(shape, 'width'), height: glyphSide(shape, 'height') }
}

describe('the manuscript still says what the S-138 cases copy', () => {
  it('表 T-206 still holds S-138 as the side of the box, in px', () => {
    // ⭐ THE CASE THAT MAKES THE OTHERS HONEST. Every expectation below is
    // `S_138.px`, read out of 表 T-206 when this file is read. If the row ever
    // stops stating a px length the reader throws, and this case says so in one
    // line instead of six failing somewhere else.
    expect(S_138.px).toBeGreaterThan(0)
    expect(S_138.cell).toContain('px')
    // ⛔ 表 T-206 is 「保存しないもの」 -- the row is there BECAUSE the export
    // draws no entrance (EP-1 / EP-4 of 表 T-076), so the picture a reader was
    // handed cannot differ by this number.
    expect(specTable('T-206').caption).toContain('保存しないもの')
    const row = specTable('T-206').rows.find((one) => one.id === 'S-138')
    expect(row?.by['値']).toContain('FR-029')
    expect(row?.by['保存しない理由']).toContain('EP-1')
    expect(row?.by['保存しない理由']).toContain('EP-4')
  })

  it('FR-029 still points at S-138 and still forbids the surface to change it', () => {
    const requirements = readFileSync(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    )
    expect(requirements).toContain(FR_029_THE_BOX)
    expect(requirements).toContain('S-138')
    expect(requirements).toContain(FR_029_NOT_BY_SURFACE)
    // ⚠️ And the sentence that keeps these cases off the entry's outline.
    expect(requirements).toContain('一辺が定めるのは図形の箱であって')
  })

  it('表 T-206 still holds S-141 as the least gap, in px', () => {
    // The twin of the case above, for the number the gap cases below copy.
    expect(S_141.px).toBeGreaterThan(0)
    expect(S_141.cell).toContain('px')
    const row = specTable('T-206').rows.find((one) => one.id === 'S-141')
    expect(row?.by['値']).toContain('FR-029')
  })

  it("FR-029 still forbids the gap to follow the reader's text size", () => {
    const requirements = readFileSync(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    )
    expect(requirements).toContain('S-141')
    expect(requirements).toContain(
      'その隙間を読む人の文字サイズに追随させてはならない（MUST NOT）',
    )
  })

  it('表 T-051 HF-5 still asks for one size whatever the name is', () => {
    const hf5 = specTable('T-051').rows.find((one) => one.id === 'HF-5')
    expect(hf5, '表 T-051 no longer holds HF-5').toBeDefined()
    expect(hf5?.cells.join(' ')).toContain(T_051_HF5_SAME_SIZE_HERE)
  })

  it('表 T-109 still puts each of these entries on the surface its case expects', () => {
    const rows = specTable('T-109').rows
    for (const one of T_109_ONE_PER_SURFACE) {
      const row = rows.find((held) => held.id === one.row)
      expect(row, `表 T-109 no longer holds ${one.row}`).toBeDefined()
      expect(row?.by['面'], `${one.row} left the ${one.surface}`).toContain(one.surface)
    }
    // ⛔ Four different 面, or the MUST NOT below is not being tested.
    expect(new Set(T_109_ONE_PER_SURFACE.map((one) => one.surface)).size).toBe(4)
  })
})

/**
 * The lengths a CSS declaration states, in px, with `calc()` worked out.
 *
 * \u26a0 ONLY ARITHMETIC AND `px` ARE ADMITTED. Anything else in the expression --
 * `em`, `rem`, `%`, `ex`, `ch`, a viewport unit, a custom property -- comes back
 * as `null`, which is precisely the answer FR-029's MUST NOT wants: a length the
 * reader's own text size can move is not a length this rule allows.
 */
function pxExpression(value: string): number | null {
  const bare = value.trim().toLowerCase().replace(/\bcalc\b/g, '').replace(/px\b/g, '')
  if (bare.trim() === '') return null
  if (!/^[\d\s+*/.()-]+$/.test(bare)) return null
  try {
    // eslint-disable-next-line no-new-func
    const answer: unknown = new Function(`return (${bare});`)()
    return typeof answer === 'number' && Number.isFinite(answer) ? answer : null
  } catch {
    return null
  }
}

/** The four sides a `padding` shorthand states, top / right / bottom / left. */
function paddingSides(value: string): readonly string[] {
  const parts = value.trim().split(/\s+/)
  const [one, two, three, four] = parts
  if (parts.length === 1) return [one as string, one as string, one as string, one as string]
  if (parts.length === 2) return [one as string, two as string, one as string, two as string]
  if (parts.length === 3)
    return [one as string, two as string, three as string, two as string]
  return [one as string, two as string, three as string, four as string]
}

describe("FR-029 (MUST) -- S-141's least gap between a shape and its entrance's frame", () => {
  /**
   * \u26a0 THE RULE NAMES A FRAME, so the entrances it reaches are the ones that
   * DREW one: FR-029 fixes the gap \u300c\u56f3\u5f62\u3068\u5165\u53e3\u306e\u67a0\u306e\u3042\u3044\u3060\u300d and S-141's cell
   * adds \u300c\u67a0\u306e\u5074\u306f\u52d5\u304b\u3055\u306a\u3044 \u2014\u2014 \u5b9a\u3081\u308b\u306e\u306f\u9699\u9593\u3060\u3051\u3067\u3042\u308b\u300d. \u8868 T-109 settles
   * which entry sits on which \u9762 and never which of them carries an outline, so
   * that is read off the drawn entry rather than listed here.
   */
  const framed = (): readonly { row: string; surface: string; entry: FakeElement }[] => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(EVERY_SURFACE_VIEW)
    return T_109_ONE_PER_SURFACE.map((one) => ({
      row: one.row,
      surface: one.surface,
      entry: iconEntry(built.root(), one.row),
    })).filter((one) => {
      const border = styleMap(one.entry).get('border') ?? 'none'
      return border.trim() !== 'none' && border.trim() !== '0'
    })
  }

  it('at least one entrance carries a frame, or the rule below is asked of nothing', () => {
    expect(framed().length).toBeGreaterThan(0)
  })

  it('\u2b50 keeps at least S-141 between the shape and the frame, on both axes', () => {
    // \u300c\u56f3\u5f62\u3068\u5165\u53e3\u306e\u67a0\u306e\u3042\u3044\u3060\u306b\u3001\u2026 `S-141` \u304c\u5b9a\u3081\u308b\u9699\u9593\u3092\u6700\u4f4e\u9650\u3042\u3051\u308b\u3053\u3068
    // \uff08MUST\uff09\u300d. Sideways the entrance's own padding is the gap; downwards the
    // room it reserves has to hold the shape (S-138) with the gap on each side,
    // which is what S-138's side plus twice S-141 comes to.
    for (const one of framed()) {
      const held = styleMap(one.entry)
      const sides = paddingSides(held.get('padding') ?? '0')
      const where = `${one.row} on the ${one.surface}`
      expect(pxExpression(sides[1] as string), `${where}: right of the shape`).toBeGreaterThanOrEqual(
        S_141.px,
      )
      expect(pxExpression(sides[3] as string), `${where}: left of the shape`).toBeGreaterThanOrEqual(
        S_141.px,
      )

      const room = held.get('min-height') ?? held.get('height')
      expect(room, `${where}: the entrance reserves no room downwards`).toBeDefined()
      expect(
        pxExpression(room as string),
        `${where}: the room downwards is "${room ?? ''}"`,
      ).toBeGreaterThanOrEqual(S_138.px + S_141.px * 2)
    }
  })

  it("\u26d4 states that room in px alone, so the gap cannot follow the reader's text size (FR-029 MUST NOT)", () => {
    // \u300c\u305d\u306e\u9699\u9593\u3092\u8aad\u3080\u4eba\u306e\u6587\u5b57\u30b5\u30a4\u30ba\u306b\u8ffd\u968f\u3055\u305b\u3066\u306f\u306a\u3089\u306a\u3044\uff08MUST NOT\uff09\u300d, and the
    // reason the row gives is measurable: \u300c\u56f3\u5f62\u306e\u4e00\u8fba\u306f `S-138` \u3067\u56fa\u5b9a\u3067\u3042\u308a\u3001
    // \u8ffd\u968f\u3055\u305b\u308b\u3068\u6587\u5b57\u3092\u5927\u304d\u304f\u3057\u305f\u4eba\u306e\u753b\u9762\u3067\u3060\u3051\u5165\u53e3\u304c\u9593\u5ef6\u3073\u3059\u308b\u300d.
    // \u26a0 `pxExpression` answers null for every relative unit, so a gap written
    // in `em` fails here whatever number it holds.
    for (const one of framed()) {
      const held = styleMap(one.entry)
      const where = `${one.row} on the ${one.surface}`
      for (const property of ['padding', 'padding-left', 'padding-right', 'padding-top',
        'padding-bottom', 'min-height', 'height']) {
        const stated = held.get(property)
        if (stated === undefined) continue
        for (const side of property === 'padding' ? paddingSides(stated) : [stated]) {
          expect(
            pxExpression(side),
            `${where}: ${property} states "${side}", which follows the reader's text size`,
          ).not.toBeNull()
        }
      }
    }
  })

  it('\u2b50 the gap is the same on every 面 the entry is drawn on', () => {
    // The same reading FR-029 gives the box (\u300c\u8f09\u308b\u9762\u306b\u3088\u3063\u3066\u5909\u3048\u3066\u306f\u306a\u3089\u306a\u3044\u300d):
    // a clearance that differed by surface would make one shape sit tighter in
    // its entrance than the same shape elsewhere.
    const spelled = framed().map((one) => {
      const held = styleMap(one.entry)
      return `${held.get('padding') ?? ''}|${held.get('min-height') ?? ''}`
    })
    expect(new Set(spelled).size, spelled.join(' / ')).toBe(1)
  })
})

describe('FR-029 (MUST) -- the box a shape is drawn in is S-138, on whatever surface it sits', () => {
  const drawEverySurface = (): Stage => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(EVERY_SURFACE_VIEW)
    return built
  }

  it.each(T_109_ONE_PER_SURFACE)(
    '⭐ GIVEN $row is drawn on the $surface WHEN the box its shape is drawn in is read THEN both sides are S-138 (FR-029 MUST, 表 T-206 S-138) -- $row',
    ({ row, surface }) => {
      const built = drawEverySurface()
      const box = glyphBoxOf(iconEntry(built.root(), row))

      expect(pixelsOf(box.width), `${row} on the ${surface} draws its shape ${box.width} wide`).toBe(
        S_138.px,
      )
      expect(
        pixelsOf(box.height),
        `${row} on the ${surface} draws its shape ${box.height} tall`,
      ).toBe(S_138.px)
    },
  )

  it('⛔ GIVEN entries on the header, the palette, an open surface and a row WHEN their boxes are compared THEN not one of them differs (FR-029: 載る面によって変えてはならない -- MUST NOT)', () => {
    // ⛔ THE MUST NOT, TESTED AS ONE COMPARISON RATHER THAN AS FOUR EQUALITIES
    // AGAINST A NUMBER. 「同じ図形が面ごとに違う大きさで出ると、同じものだと読め
    // なくなる」 is about the four being the SAME, so a drawing side that had
    // settled on one WRONG number everywhere is caught by the case above while
    // this one stays true -- which is the honest division between the two rules.
    const built = drawEverySurface()
    const boxes = T_109_ONE_PER_SURFACE.map((one) => ({
      row: one.row,
      surface: one.surface,
      ...glyphBoxOf(iconEntry(built.root(), one.row)),
    }))

    const spelled = boxes.map((one) => `${one.width} x ${one.height}`)
    expect(
      new Set(spelled).size,
      `the surfaces draw different boxes: ${boxes
        .map((one) => `${one.row} on the ${one.surface} = ${one.width} x ${one.height}`)
        .join(' | ')}`,
    ).toBe(1)
  })

  it("⛔ GIVEN a box is read WHEN its unit is examined THEN it is stated in px and not in the reader's own text size (表 T-206 S-138: 閲覧者の文字サイズに追随させない)", () => {
    const built = drawEverySurface()

    for (const one of T_109_ONE_PER_SURFACE) {
      const box = glyphBoxOf(iconEntry(built.root(), one.row))
      for (const [axis, stated] of Object.entries(box)) {
        // ⚠️ `pixelsOf` answers null for `em` / `rem` / `%` / `ex`, which is the
        // whole of this case: a shape sized in `em` grows with the machine's
        // text size, and the row says in as many words that it must not.
        expect(
          pixelsOf(stated),
          `${one.row} states its ${axis} as "${stated}", which follows the reader's text size`,
        ).not.toBeNull()
      }
    }
  })

  it('⭐ GIVEN two rows at different depths WHEN their controls are read THEN the box is the same on both, and neither is set down (表 T-051 HF-5 MUST: 行の名前の文字サイズにかかわらず、操作子を同じ大きさで描くこと)', () => {
    // ⚠️ WHAT THIS UNIT CAN BE ASKED. `RowTitle` carries no text size -- the
    // name's size follows the depth through S-36 and S-38, which live on the far
    // side of IF-9 -- so the only thing about the name's size that reaches here
    // is the DEPTH. If that moved the box, HF-5's first MUST would be broken on
    // this side of the seam.
    //
    // ⭐ AND HF-5 (MUST) NOW LEVELS THE CONTROLS WITH THE TOP OF THE NAME,
    // forbidding both centring them and setting them down from it (MUST NOT).
    // Nothing on IF-9 carries a set-down any more (S-139 of 表 T-206 is
    // retired), so the two things this side can be held to are asserted below:
    // no control carries a top offset of its own, and the row that holds them
    // starts them at its top rather than centring them.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [],
          titles: [
            rowTitle({
              groupId: 'g-shallow',
              label: 'ShallowRow',
              depth: 1,
              box: rect(0, 40, 170, 40),
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
            rowTitle({
              groupId: 'g-deep',
              label: 'DeepRow',
              depth: 5,
              box: rect(0, 80, 170, 18),
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    const rows = selfAndDescendants(built.root()).filter((one) => one.hasAttribute('data-group-id'))
    expect(rows, 'the panel did not draw two rows').toHaveLength(2)

    for (const icon of ['IC-58', 'IC-59', 'IC-60']) {
      const boxes = rows.map((one) => glyphBoxOf(iconEntry(one, icon)))
      expect(boxes[0], `${icon} is drawn in two different boxes`).toEqual(boxes[1])
      expect(pixelsOf(boxes[0]?.width ?? ''), `${icon} is not S-138 wide`).toBe(S_138.px)
      expect(pixelsOf(boxes[0]?.height ?? ''), `${icon} is not S-138 tall`).toBe(S_138.px)
      // HF-5 (MUST NOT): 上端から下げてはならない. A control that carried a top
      // offset of its own would be set down from the name's top edge, which is
      // exactly what that row forbids.
      for (const row of rows) {
        const control = iconEntry(row, icon)
        expect(styleMap(control).get('margin-top'), `${icon} is set down`).toBeUndefined()
        expect(styleMap(control).get('padding-top'), `${icon} is set down`).toBeUndefined()
      }
    }

    // HF-5 (MUST): 名前の上端に揃えること, and (MUST NOT) 中央で揃えてはならない.
    // The row lays its name and its controls out in one line box, so where that
    // box starts its items IS where the controls sit against the name's top
    // edge -- `center` is what HF-5 forbids in as many words.
    for (const row of rows) {
      expect(styleMap(row).get('align-items'), 'the row does not start its controls at the top')
        .toBe('flex-start')
    }
  })

  it("⭐ GIVEN a row whose name is far bigger than its controls WHEN the row is read THEN the controls are LEVEL with the name's top and are neither centred nor set down (表 T-051 HF-5)", () => {
    // HF-5 states the condition in as many words -- 「名前が操作子より大きいとき
    // は、名前の上端に揃えること（MUST）」 -- so the row here is drawn far
    // taller than S-138, which is the case the row is about.
    // ⛔ 「中央で揃えてはならない（MUST NOT）」 and ⛔ 「上端から下げては
    // ならない（MUST NOT）」 are the two ways of failing it, and both are
    // asked below: nothing may pull the trio down the band, and nothing may
    // centre it in one.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [],
          titles: [
            rowTitle({
              groupId: 'g-tall',
              label: 'A row whose name is drawn much larger than the controls beside it',
              depth: 1,
              // Six times S-138 tall, so a centred trio would sit a long way
              // from the top and a set-down one a long way from where it does.
              box: rect(0, 0, 170, S_138.px * 6),
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    const rows = selfAndDescendants(built.root()).filter((one) => one.hasAttribute('data-group-id'))
    expect(rows, 'the panel drew no row').toHaveLength(1)
    const row = rows[0] as FakeElement

    // ⛔ THE MUST NOT AGAINST CENTRING, read on the box that lays the name and
    // the controls out together: whatever spelling it takes, it is not a middle
    // one and not a bottom one.
    const alignment = styleMap(row).get('align-items')
    expect(alignment, 'the row states no cross-axis alignment at all').toBeDefined()
    expect(['center', 'baseline', 'last baseline', 'flex-end', 'end'], `align-items:${alignment ?? ''}`)
      .not.toContain(alignment)

    // ⛔ THE MUST NOT AGAINST SETTING THEM DOWN: no control carries room or a
    // shift of its own above it, and none aligns itself away from the start.
    for (const icon of ['IC-58', 'IC-59', 'IC-60']) {
      const control = styleMap(iconEntry(row, icon))
      for (const property of ['margin-top', 'padding-top', 'top', 'transform']) {
        expect(control.get(property), `${icon} states ${property}`).toBeUndefined()
      }
      const self = control.get('align-self')
      if (self !== undefined) {
        expect(['center', 'baseline', 'flex-end', 'end'], `${icon} align-self:${self}`).not.toContain(
          self,
        )
      }
    }
  })

  it('GIVEN the same entry drawn on two different 面 WHEN both are read THEN neither scales it (FR-029 MUST NOT) -- IC-52', () => {
    // ⚠️ 表 T-109 puts IC-52 on FIVE surfaces at once（`Help Modal` / `AI Export
    // Modal` / `Resource Roster` / `Export Chooser` / `Open Chooser`）, so it is
    // the one row that can be drawn on two different 面 and compared without a
    // second row entering the comparison.
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    surface.showScreenView(viewWith({ openModal: HELP_MODAL }))
    const onHelp = glyphBoxOf(iconEntry(built.root(), 'IC-52'))

    surface.showScreenView(
      viewWith({
        openModal: {
          surface: 'Resource Roster',
          heading: 'RosterHeading',
          commands: [command({ icon: 'IC-52', label: 'CloseRoster' })],
          resources: [],
        },
      }),
    )
    const onRoster = glyphBoxOf(iconEntry(built.root(), 'IC-52'))

    expect(onRoster).toEqual(onHelp)
    expect(pixelsOf(onRoster.width)).toBe(S_138.px)
    expect(pixelsOf(onRoster.height)).toBe(S_138.px)
  })
})


