// What ONE FIELD of the `Properties Panel` (U-25 of table T-103) actually draws
// -- how much room the field gives the value it shows, and what a 選択 field
// puts in front of a person against what it hands back.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062, published as PI-38 of table T-064). It is the side of
// IF-9 that turns a `ScreenView` into nodes, so it is the only side that states
// a width or builds a chooser at all -- UF-64 (`properties-panel.ts`, CP-37)
// says WHICH items the panel holds and what each one's words are, and
// tests/unit/uf-64.test.ts already drives that half.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-006      「パネルの寸法・余白・配置は `_assets/tbl-settings.md` の 表
//               T-206 の `S-186` 〜 `S-193` と `S-197` / `S-198` に従うこと
//               （MUST）。」 ⛔ 「パネルの文字を宿主の既定の大きさで描いてはなら
//               ない（MUST NOT）」 -- 「大きさは `S-197` を宿主が与える地の文字の
//               大きさに掛けて求め」. ⛔ 「px の定数として持ってはならない（MUST
//               NOT）」.
//   FR-093      ⛔ 「`GRS` は、ラベルが占める幅を、全角 2・半角 1 で数えた単位数 ×
//               フォントサイズ × `labelCoef` で概算すること。文字の実寸を測っては
//               ならない（MUST NOT）。」 ⭐ THIS IS THE MANUSCRIPT'S OWN ANSWER TO
//               "how much room does this text need", and it is the only one --
//               so it is what a field's room is measured against here.
//   S-30        table T-201, `labelCoef` -- 「全角 1 文字 = フォント × 2 × 係数。
//               実測しない方針なので、この 1 値がレイアウト精度を単独で決める」.
//   S-197       table T-206, 「プロパティパネルの文字の大きさの係数」 -- ⭐ 「px で
//               はなく係数である」.
//   S-189       table T-206, 「項目名の欄が取る割合」 -- ⭐ 「px ではなく割合であ
//               る —— パネルの幅は `S-80` で人が動かすので、絶対値で持つと広げた
//               ときに入力欄だけが伸びる」. ⭐ READ HERE FOR ITS REASON rather
//               than for its number: it says in as many words that the panel's
//               width is the READER'S, dragged through S-80.
//   S-80        table T-203, `propertyPanelWidth` -- the width a person drags,
//               saved with the document. ⭐ Together with S-189 this is why a
//               share cannot answer the question below; see THE ARGUABLE CASE.
//   S-186       table T-206, the LOWER BOUND on a field's height -- ⛔ 「「高さ」
//               ではなく「下限」である —— 読む人がブラウザで文字を大きくしたと
//               き、固定の高さは文字を切り落とす（`NFR-007`）」. ⭐ The manuscript
//               states the failure in as many words: a fixed measure CUTS THE
//               TEXT OFF. This file asks the same question of the other axis.
//   EX-7        table T-033: 「`GRS` が書く日付の時刻は `00:00:00` とすること
//               （MUST）。綴りは交換相手の型（`xsd:dateTime`）に合わせる。」 ⭐ The
//               ONE spelling of a date the manuscript settles anywhere; its date
//               part is ten characters, which is what the fixture below carries.
//   T-016 PR-3  `start` / `finish`, 入力の型 日付 / 日付 -- ONE row carrying TWO
//               columns, which is why this field draws two controls.
//   T-016 PR-16 `assignee`, 入力の型 選択, no read-only mark -- 「編集できる。入口
//               と選び方は `FR-008` の表 T-225 が持つ」.
//   T-225 AS-5  ⛔ 「編集できること（MUST）。名簿から選ばせる形とし、ドロップダウン
//               と部分一致の検索を添えること（MUST）」.
//   T-225 AS-6  ⛔ 「人に見せるのは担当者名、文書に書くのは `uid` とすること
//               （MUST）。利用者に `uid` を覚えさせてはならない（MUST NOT）」.
//   T-225 AS-9  ⛔ 「プロパティパネルで `uid` を選んだ …… その `uid` の `Resource`
//               へ割り当て、担当者名は名簿から引き当てて示すこと（MUST）—— 同姓
//               同名を見分ける経路はここだけである」.
//   T-032 MG-5  ⛔ 「画面で同名を入力したときは統合してはならない（MUST NOT）」 --
//               so two same-named people stay two candidates in the chooser.
//   T-103 U-25  the settled name `Properties Panel`, which W-4 of table T-006a
//               (MUST) carries into the DOM as a `data-role`.
//   FR-072      ⛔ 「**パネルの先頭に見出しの行を置いてはならない（MUST NOT）**
//               （利用者の指示 2026-08-27）—— **押下状態が同じことを既に示してお
//               り、見出しは同じ答えを 2 か所で言っていた。**⭐ **落とした高さは、
//               最も頻繁に触る項目が上へ来るぶんである**（表 T-016 の刷る順）。」
//               ⭐ WHAT IS SHOWING IS THE ENTRANCE'S TO SAY -- 「いま何を出してい
//               るかを、入口の押下状態で示すこと（MUST）」 -- and that entrance is
//               IC-17 in the `App Header`, which is UF-62's and not this seam's.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above, docs/development-rules/, and
// of `src/` nothing but the exported declarations these cases must call or name
// -- `domScreenSurface`, `ScreenSurfaceWiring`, `ScreenTheme`, the `ScreenView`
// family (`PropertiesPanel`, `PropertyField`, `PropertyControl`) and
// `SETTINGS_DEFAULTS`. ⛔ NO BODY WAS READ: not which element a control becomes,
// not which CSS property carries a width, not whether a share is stated at all.
// Every number below comes from a table.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. The fake browser, `stage` / `wiringOf` /
// `wire` / `surfaceOf`, the tree readers (`styleMap`, `inlineStyle`,
// `descendants`, `byRole`, `oneByRole`, `matches`), `shorthandParts`,
// `declaredFontSize`, `expandVariables`, `lengthPx` and the `ScreenView`
// fixtures are copied from tests/unit/fr-006-panel-typography.test.ts, which
// drives this same unit against this same fake for the same requirement.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT THESE CASES CAN AND CANNOT SEE, SO NO FAILURE IS MISREAD
// ---------------------------------------------------------------------------
//
// `npm test` runs under Node with no DOM (vitest.config.ts sets `environment:
// 'node'`), so there is no layout engine here. What the fake records is what the
// unit WROTE: inline declarations, attributes and text, in order. A width that
// arrives through a style sheet is invisible here, and that failure would be
// this file's blindness rather than a defect -- ⚠️ REPORT IT, do not tune the
// case. The neighbours' evidence is that this unit styles inline.
//
// ⛔ THE ARGUABLE CASE, AND IT IS THE ONE THAT MATTERS. "Every digit fits" is
// asked as 「the control states room for at least the units its text carries」,
// with the room resolved at two host bases, and a room stated as a PERCENTAGE is
// deliberately NOT accepted. The ground is that S-189's own note and S-80 say
// the panel's width belongs to the reader -- 「パネルの幅は `S-80` で人が動かす」
// -- so a share of it settles nothing about whether ten digits fit; and this
// seam never learns that width, so a share cannot even be resolved here. ⚠️ IF
// THE RULING IS THAT A SHARE SUFFICES, this case is wrong and the manuscript
// needs the sentence that says how narrow the panel may be dragged. Reported
// rather than dropped, because FR-093 is the only room-for-text rule the
// specification has and a panel that answers to none of it is the defect S-186's
// note describes on the other axis.
//
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED:
//   1. WHICH PROPERTY carries the room, and which element a control becomes. No
//      table names either; the cases ask what the control RESOLVES TO.
//   2. WHETHER THE TWO DATE CONTROLS SHARE A LINE OR TAKE ONE EACH. No row
//      settles it. The room is asked of each control separately, which is true
//      under either arrangement.
//   3. THAT THE ASSIGNEE'S NAME IS SHOWN EXACTLY ONCE. ⛔ NO ROW SAYS SO. AS-6
//      (MUST) requires the name to be SHOWN and forbids a `uid` being shown;
//      neither half forbids showing the name twice. Both halves are asserted;
//      the count is reported as a hole.
//   4. THE PARTIAL-MATCH SEARCH AS-5 makes a MUST. `PropertyControl` publishes
//      nothing that could carry one and no table gives it a shape --
//      tests/unit/t-225-choosing-who-is-on-a-task.test.ts already reports it.
//   5. ANY WORD SHOWN TO A PERSON. FR-038 puts the panel in the chosen language
//      and no table holds a translated string; every word below is this file's.
//   6. AN EMPTY ROW STANDING ABOVE THE FIRST FIELD. FR-072's MUST NOT is asked
//      here as "what is drawn above the first item", so a heading row that draws
//      NO TEXT AT ALL passes. ⚠️ That is this file's blindness and not a reading
//      of the rule: the height such a row would take is a layout fact, and there
//      is no layout engine here (see above). ⛔ Nor could it be asked as "which
//      element is a heading" -- no row of docs/spec names an element for one.

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  ScreenFrame,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const T_206 = specTable('T-206')
const T_201 = specTable('T-201')
const T_016 = specTable('T-016')

/** The first number a cell states, however the cell decorates it. */
function numberIn(written: string, where: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(written)
  if (found === null) throw new Error(`${where} states no number: ${written}`)
  return Number.parseFloat(found[0] as string)
}

function cellOf(table: ReturnType<typeof specTable>, id: string, heading: string): string {
  const row = table.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table.id} no longer has row ${id}`)
  const held = row.by[heading]
  if (held === undefined) {
    throw new Error(`table ${table.id} no longer has a ${heading} column: ${table.headings.join(' | ')}`)
  }
  return bare(held)
}

/** S-197 -- the panel's text against the base the host gives (table T-206). */
const S_197 = numberIn(cellOf(T_206, 'S-197', '既定'), "table T-206's S-197")

/** S-30 -- `labelCoef`, the one coefficient FR-093's estimate turns on (table T-201). */
const S_30 = numberIn(cellOf(T_201, 'S-30', '既定値'), "table T-201's S-30")

/** S-189 as the table writes it, so a case can say the cell states a share. */
const S_189_CELL = cellOf(T_206, 'S-189', '既定')

/** U-25 of table T-103 -- the settled name that reaches the DOM as `data-role`. */
const U_25 = cellOf(specTable('T-103'), 'U-25', '確定名（英）')

/** Table T-016's own heading for the item-name column. */
const ITEM_NAME_COLUMN = '項目名（英語・画面表示）'

/** Table T-016's own heading for the column FR-006's paragraph makes a MUST. */
const INPUT_KIND_COLUMN = '入力の型'

/** Every code span in a cell, so PR-3's two column names both come back. */
function namesIn(cell: string): readonly string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((one) => one[1] as string)
}

function rowOf(id: string): Readonly<Record<string, string>> {
  const row = T_016.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-016 no longer has row ${id}`)
  return row.by
}

/** PR-3's two column names, in the table's own order. */
const PR_3_NAMES = namesIn(rowOf('PR-3')[ITEM_NAME_COLUMN] ?? '')

/** PR-16's one column name. */
const PR_16_NAME = namesIn(rowOf('PR-16')[ITEM_NAME_COLUMN] ?? '')[0] ?? ''

/** 表 T-016's word for the form PR-16 takes. */
const PR_16_INPUT_KIND = (rowOf('PR-16')[INPUT_KIND_COLUMN] ?? '').trim()

/** The word the table writes for a 選択, kept here only to be compared against. */
const CHOICE_WORD = '選択'

// ---------------------------------------------------------------------------
// The fake browser. Copied from tests/unit/fr-006-panel-typography.test.ts.
// ---------------------------------------------------------------------------

interface FakeEvent {
  readonly type: string
  target: FakeElement | null
  currentTarget: FakeElement | null
  defaultPrevented: boolean
}

interface Registration {
  readonly node: FakeElement
  readonly type: string
  readonly listener: (event: FakeEvent) => void
}

/** One write to an element's inline style, in the order the unit made it. */
type StyleWrite =
  | { readonly kind: 'reset'; readonly css: string }
  | { readonly kind: 'set'; readonly property: string; readonly value: string }

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
  readonly reportedHeights: number[]
  clockMs: number
  author: string
  surface: ScreenSurface | undefined
  root(): FakeElement
}

/** A browser that is only what `ScreenSurfaceWiring` says it is. */
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

  return {
    world,
    host,
    mount,
    reportedHeights: [],
    clockMs: Date.UTC(2026, 7, 27, 3, 4, 5),
    author: 'Watcher',
    surface: undefined,
    root(): FakeElement {
      const first = mount.children[0]
      if (first === undefined) throw new Error('the unit mounted nothing')
      return first
    },
  }
}

/**
 * The rendering and hue every case below wires the surface with.
 *
 * ⛔ NEITHER VALUE IS TYPED HERE (rule 03 section 1): S-72's default arrives
 * through the generated `SETTINGS_DEFAULTS` and S-73's is read out of table
 * T-216 at load time.
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
    readAuthor: (): string => built.author,
    readClockMs: (): number => built.clockMs,
    onAppHeaderHeightPx: (heightPx: number): void => {
      built.reportedHeights.push(heightPx)
    },
    readTheme: (): ScreenTheme => THEME,
  }
}

function wire(heightsByRole: Record<string, number> = {}): Stage {
  const built = stage(heightsByRole)
  built.surface = domScreenSurface(wiringOf(built))
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

function inlineStyle(element: FakeElement): string {
  return [...styleMap(element)].map(([property, value]) => `${property}:${value}`).join(';')
}

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

/** A tiny selector engine, so a unit which DID query is not failed for it. */
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
// FR-093's estimate, and the room a node states for itself.
// ---------------------------------------------------------------------------

/**
 * FR-093's count: 「全角 2・半角 1 で数えた単位数」.
 *
 * ⚠️ The requirement names the two widths and not a code range, so the split is
 * taken at the boundary the term means: a character drawn on the half-width
 * advance counts 1 and anything else counts 2. Every string this file drives
 * with is ASCII, so no case turns on where the boundary falls.
 */
function unitsOf(text: string): number {
  let units = 0
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    units += code < 0x0080 || (code >= 0xff61 && code <= 0xff9f) ? 1 : 2
  }
  return units
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

/**
 * The same expression with every `var(--x)` replaced by what the tree declares.
 *
 * ⚠️ NO FALLBACK IS HONOURED -- a resolver that accepted `var(--x, 1em)`'s
 * fallback would report a length the page never draws.
 */
function expandVariables(element: FakeElement, value: string, depth = 0): string | null {
  if (depth > 8) return null
  const named = /var\(\s*(--[a-z0-9-]+)\s*\)/i.exec(value)
  if (named === null) return value
  const held = customProperty(element, named[1] as string)
  if (held === null) return null
  return expandVariables(element, value.replace(named[0] as string, `(${held})`), depth + 1)
}

/**
 * A length in px, given the size an `em` is against and the host's base.
 *
 * ⛔ A PERCENTAGE COMES BACK `null` HERE, unlike the typography file's resolver
 * which reads one against the inherited size. A share of a width is a share of
 * the width a person dragged (S-80), which this seam never learns -- see THE
 * ARGUABLE CASE in the head comment.
 */
function lengthPx(expression: string, emPx: number, basePx: number): number | null {
  const arithmetic = expression
    .trim()
    .toLowerCase()
    .replace(/\bcalc\b/g, '')
    .replace(/([\d.]+)\s*rem\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * basePx})`)
    .replace(/([\d.]+)\s*em\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * emPx})`)
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

/** The properties that could carry the room a control has for its value. */
const ROOM_PROPERTIES = ['width', 'min-width', 'inline-size', 'min-inline-size', 'flex-basis']

/** Everything the node states for its room, whether or not it can be resolved. */
function statedRoom(element: FakeElement): string[] {
  const declared = styleMap(element)
  const found: string[] = []
  for (const property of ROOM_PROPERTIES) {
    const written = (declared.get(property) ?? '').trim()
    if (written !== '') found.push(`${property}: ${written}`)
  }
  return found
}

interface Room {
  /** The largest room this node could be shown to have, in px. */
  readonly px: number
  /** The node that stated it -- the control itself, or the nearest box above it. */
  readonly statedBy: FakeElement
}

/**
 * The room the control has for its value at a host base of `basePx`.
 *
 * ⭐ THE NEAREST BOX THAT STATES ONE WINS, walking from the control up to but
 * NOT INCLUDING the panel. A room stated on a box that holds BOTH of PR-3's
 * controls is credited to each of them, which OVER-states rather than
 * under-states it -- deliberate, so that a panel which did give the room is
 * never failed for where it said so. ⛔ THE PANEL ITSELF IS EXCLUDED: its own
 * width is what S-80 lets a person drag, and reading it here would credit a
 * control with the whole surface it sits on.
 *
 * ⚠️ `em` is resolved against the size FR-006 REQUIRES of the panel (S-197 x the
 * base) rather than against the size the tree happens to state. The two are the
 * same thing on a panel that obeys FR-006, and tests/unit/
 * fr-006-panel-typography.test.ts is where they are compared; keeping this file
 * to one rule means a wrong font size fails there and only there.
 */
function roomOf(control: FakeElement, panel: FakeElement, basePx: number): Room | null {
  const emPx = S_197 * basePx
  let walker: FakeElement | null = control
  while (walker !== null && walker !== panel) {
    const here: FakeElement = walker
    const stated = statedRoom(here)
    if (stated.length > 0) {
      const lengths = stated
        .map((one) => {
          const written = one.slice(one.indexOf(':') + 1).trim()
          const expanded = expandVariables(here, written)
          return expanded === null ? null : lengthPx(expanded, emPx, basePx)
        })
        .filter((one): one is number => one !== null)
      if (lengths.length > 0) return { px: Math.max(...lengths), statedBy: here }
      return null
    }
    walker = here.parentNode
  }
  return null
}

/** Everything a failure needs to be read without opening the unit. */
function whatWasStated(panel: FakeElement, control: FakeElement): string {
  const chain: string[] = []
  let walker: FakeElement | null = control
  while (walker !== null) {
    const here: FakeElement = walker
    const stated = statedRoom(here)
    chain.push(
      `${here.tagName}[${here.getAttribute('data-role') ?? '-'}]` +
        `{${stated.join('; ') || 'no room stated'}}`,
    )
    if (here === panel) break
    walker = here.parentNode
  }
  return chain.join(' <- ')
}

/** The controls a person edits a field through -- a form element, and nothing else. */
const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const controlsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => CONTROL_TAGS.has(one.tagName))

/**
 * The candidates a chooser offers.
 *
 * ⭐ SEARCHED OVER THE WHOLE PANEL, not inside the control. AS-5 asks for 「ドロッ
 * プダウンと部分一致の検索」 in one breath, and a browser gives those two together
 * as a text field pointed at a separate list -- so the candidates need not be
 * inside the element a person types in. ⛔ NO CASE BELOW NAMES THE ELEMENT the
 * control becomes: no table settles it, and pinning one would fail an
 * implementation that read AS-5's two halves as one control.
 */
const optionsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => one.tagName === 'OPTION')

/** What one candidate hands back -- the attribute, or the property. */
const optionValueOf = (option: FakeElement): string =>
  option.getAttribute('value') ?? option.value

// ---------------------------------------------------------------------------
// Descriptions to draw. Every one is a value of `ScreenView` and nothing else.
// ---------------------------------------------------------------------------

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  autosaveStatus: { kind: 'saving' },
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

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...EMPTY_VIEW, ...patch })

const controlOf = (
  patch: Partial<PropertyControl> & Pick<PropertyControl, 'key' | 'kind'>,
): PropertyControl => ({
  text: '',
  choices: null,
  min: null,
  max: null,
  ...patch,
})

/**
 * A date written the one way the manuscript settles a date anywhere: EX-7 of
 * table T-033 pins the spelling to the exchange partner's `xsd:dateTime`, whose
 * date part is ten characters.
 *
 * ⚠️ NO ROW SETTLES WHAT THE PANEL SPELLS ON SCREEN, and this file does not
 * pretend one does -- the assertion below is about ROOM FOR WHAT IS SHOWN, and
 * counts the units of whatever the control carries. The spelling is pinned only
 * so that the fixture is the manuscript's rather than this file's.
 */
const START_TEXT = '2026-08-27'
const FINISH_TEXT = '2026-12-31'

/** PR-3 -- ONE row of table T-016 carrying TWO columns, so ONE field with two controls. */
const DATE_FIELD: PropertyField = {
  row: 'PR-3',
  name: PR_3_NAMES.join(' / '),
  text: `${START_TEXT} / ${FINISH_TEXT}`,
  isEditable: true,
  controls: [
    controlOf({
      key: { holder: 'task', uid: 1, column: 'start' },
      kind: 'date',
      text: START_TEXT,
    }),
    controlOf({
      key: { holder: 'task', uid: 1, column: 'finish' },
      kind: 'date',
      text: FINISH_TEXT,
    }),
  ],
}

/**
 * The roster PR-16's chooser offers.
 *
 * ⭐ THE UIDS ARE FOUR DIGITS AND SHARE NO DIGIT RUN WITH THE NAMES, so that a
 * case asking whether a `uid` was DRAWN AS A WORD (AS-6 MUST NOT) cannot be
 * satisfied or defeated by a number that happened to be somewhere else.
 * ⭐ THE LAST TWO SHARE A NAME: that pair is AS-8 (MUST NOT merge) and it is the
 * whole reason AS-9 exists.
 */
const SEATED_NAME = 'Ariadne'
const TWIN_NAME = 'Bertrand'
const ROSTER_WORDS: readonly string[] = [SEATED_NAME, TWIN_NAME, TWIN_NAME]
const ROSTER_VALUES: readonly string[] = ['4242', '4243', '4244']

/** PR-16 -- 入力の型 選択, and AS-5 (MUST) makes it the roster in a dropdown. */
const ASSIGNEE_FIELD: PropertyField = {
  row: 'PR-16',
  name: PR_16_NAME,
  text: SEATED_NAME,
  isEditable: true,
  controls: [
    controlOf({
      // ⛔ THE KEY IS MINTED, AND IT HAS TO BE. 表 T-016's own remark on PR-16
      // says 「`Task` の列ではない —— 実体は `Assignment` であり」, and no member of
      // `PropertyFieldKey` can name one. That absence is already reported by
      // tests/unit/t-225-choosing-who-is-on-a-task.test.ts; nothing below turns
      // on which key rides along.
      key: { holder: 'task', uid: 1, column: 'assignee' } as unknown as PropertyControl['key'],
      kind: 'choice',
      text: SEATED_NAME,
      choices: ROSTER_WORDS,
      choiceValues: ROSTER_VALUES,
    }),
  ],
}

/**
 * ⛔ NO HEADING IS OFFERED, because FR-072 (MUST NOT) refuses the panel one:
 * 「⛔ **パネルの先頭に見出しの行を置いてはならない（MUST NOT）**（利用者の指示
 * 2026-08-27）—— **押下状態が同じことを既に示しており、見出しは同じ答えを 2 か所
 * で言っていた。**」 (CR-272; the fixture carried one until that row moved.)
 *
 * ⚠️ THE ASSERTION IS WHY THE CAST IS HERE. Whether the published description
 * still declares a member for a heading is the implementation's answer, not this
 * file's, and a fixture that turned either answer into a COMPILE error would take
 * every case in this file down with it -- including the one below that is the
 * finding. Rule 04 section 1 asks a disagreement to arrive as a test that falls.
 * ⛔ Nothing else is cast away: every member FR-006's panel is asked for is
 * spelled here.
 */
const panelWith = (fields: readonly PropertyField[]): PropertiesPanel =>
  ({
    showing: 'selection',
    isSubjectGone: false,
    fields,
    commands: [],
  }) as PropertiesPanel

/** The App Header measures to something, so BO-1's dimension is settled. */
const HEADER_HEIGHT = { 'App Header': 37 }

/** ⭐ Bases of this file's own choosing; the base never reaches this unit. */
const BASES = [16, 32]

function drawPanel(fields: readonly PropertyField[]): { built: Stage; panel: FakeElement } {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ propertiesPanel: panelWith(fields) }))
  return { built, panel: oneByRole(built.root(), U_25) }
}

// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // CASE BELOW AGREE WITH ANYTHING (rule 04 section 2).
    expect(S_197).toBeGreaterThan(0)
    expect(S_197).toBeLessThan(1)
    expect(S_30, "table T-201's S-30 is a coefficient between its own bounds").toBeGreaterThan(0)
    expect(S_30).toBeLessThanOrEqual(1)
    expect(U_25).toBe('Properties Panel')
  })

  it('⛔ S-189 is a share of the width, which is why a share cannot answer this file', () => {
    // ⭐ 「px ではなく割合である —— パネルの幅は `S-80` で人が動かすので、絶対値で
    // 持つと広げたときに入力欄だけが伸びる」.
    expect(S_189_CELL).toContain('%')
    expect(S_189_CELL).not.toContain('px')
  })

  it('PR-3 is one row carrying two columns, and PR-16 is a 選択', () => {
    expect(PR_3_NAMES, 'table T-016 PR-3 still writes two column names in one cell').toHaveLength(2)
    expect(PR_16_INPUT_KIND, 'table T-016 PR-16 入力の型').toContain(CHOICE_WORD)
    expect(PR_16_NAME.length).toBeGreaterThan(0)
  })

  it('counts units the way FR-093 does', () => {
    // 「全角 2・半角 1 で数えた単位数」. ⭐ The ten of `2026-08-27` is the date part
    // of the spelling EX-7 pins, counted by the rule FR-093 states.
    expect(unitsOf(START_TEXT)).toBe(10)
    expect(unitsOf('あ')).toBe(2)
  })
})

describe('FR-006 / FR-093 -- PR-3 gives each date the room its digits need', () => {
  it('draws one control per column of the row', () => {
    // 表 T-016's PR-3 is ONE item with TWO columns, and the paragraph under the
    // table makes 「入力の形は同表の「入力の型」の欄に従うこと（MUST）」 -- 日付 /
    // 日付, so two controls. ⚠️ Nothing here says whether they share a line.
    const { panel } = drawPanel([DATE_FIELD])
    expect(controlsIn(panel)).toHaveLength(DATE_FIELD.controls.length)
  })

  it('⛔ MUST give each control at least the room FR-093 estimates for its text', () => {
    // ⛔ EXPECTED RED (the user's report of 2026-08-27: the dates are cut off).
    //
    // FR-093 (MUST) is the manuscript's only answer to how much room a piece of
    // text needs: 「ラベルが占める幅を、全角 2・半角 1 で数えた単位数 × フォント
    // サイズ × `labelCoef` で概算すること」. The font size is FR-006's own:
    // 「大きさは `S-197` を宿主が与える地の文字の大きさに掛けて求め」. So the room a
    // date control needs is units x (S-197 x base) x S-30, and a control given
    // less than that cannot show every digit.
    //
    // ⚠️ S-186's note states the same failure on the other axis in as many words:
    // 「固定の高さは文字を切り落とす」. Nothing in the manuscript says a width may
    // do what a height may not.
    const { panel } = drawPanel([DATE_FIELD])
    const controls = controlsIn(panel)
    expect(controls.length, 'the panel drew controls at all').toBeGreaterThan(0)

    for (const base of BASES) {
      for (let index = 0; index < controls.length; index += 1) {
        const control = controls[index] as FakeElement
        const shown = DATE_FIELD.controls[index]?.text ?? ''
        const needed = unitsOf(shown) * (S_197 * base) * S_30
        const room = roomOf(control, panel, base)
        expect(
          room,
          `FR-093 (MUST): nothing this seam can read gives ${JSON.stringify(shown)} a room. ` +
            `A share of the panel is not one -- S-189's note says the width is dragged through ` +
            `S-80. What was stated: ${whatWasStated(panel, control)}`,
        ).not.toBe(null)
        expect(
          (room as Room).px,
          `${JSON.stringify(shown)} needs ${needed}px at a host base of ${base}px; ` +
            `stated by ${(room as Room).statedBy.tagName}. ${whatWasStated(panel, control)}`,
        ).toBeGreaterThanOrEqual(needed)
      }
    }
  })

  it('⛔ MUST NOT hold that room as a px constant', () => {
    // ⛔ 「px の定数として持ってはならない（MUST NOT）」 -- 「読む人がブラウザで文字
    // を大きくしたとき、パネルだけが取り残される」（WCAG 2.1 の 1.4.4。要求としては
    // `FR-039`）. ⭐ A room that does not double when the base doubles is a
    // constant however it was written, and the digits it held at 16px are cut
    // off at 32px.
    const { panel } = drawPanel([DATE_FIELD])

    for (const control of controlsIn(panel)) {
      const small = roomOf(control, panel, 16)
      const large = roomOf(control, panel, 32)
      expect(small, whatWasStated(panel, control)).not.toBe(null)
      expect(large, whatWasStated(panel, control)).not.toBe(null)
      expect(
        (large as Room).px / (small as Room).px,
        `the room follows the reader rather than a constant. ${whatWasStated(panel, control)}`,
      ).toBeCloseTo(2, 9)
    }
  })
})

describe('表 T-225 AS-5 / AS-6 / AS-9 -- what the drawn assignee field says and hands back', () => {
  it('⛔ AS-5 (MUST) -- the field offers ONE control for the one column it has', () => {
    // FR-006 (MUST) makes every item not marked 読み取り専用 editable, the
    // paragraph under 表 T-016 makes 「入力の形は同表の「入力の型」の欄に従うこと
    // （MUST）」 and PR-16's word there is 選択, and AS-5 (MUST) says 「編集できる
    // こと。名簿から選ばせる形とし」. ⚠️ ONE, because PR-16 writes ONE column name
    // where PR-3 writes two -- the count comes from the table, not from a guess
    // about which element a chooser is.
    const { panel } = drawPanel([ASSIGNEE_FIELD])
    expect(controlsIn(panel)).toHaveLength(ASSIGNEE_FIELD.controls.length)
  })

  it('⛔ AS-5 / AS-9 -- every person on the roster is a candidate, same-named ones twice', () => {
    // AS-5: 「名簿から選ばせる形とし」. ⛔ AS-9: 「同姓同名を見分ける経路はここだけ
    // である」, and MG-5 of 表 T-032 (MUST NOT): 「画面で同名を入力したときは統合し
    // てはならない —— 統合するのは合流の経路だけである」. A chooser that folded the
    // twins to one entry would delete the only route the manuscript has.
    const { panel } = drawPanel([ASSIGNEE_FIELD])
    const options = optionsIn(panel)

    expect(options).toHaveLength(ROSTER_WORDS.length)
    expect(options.filter((one) => one.textContent.includes(TWIN_NAME))).toHaveLength(2)
  })

  it('⛔ AS-6 (MUST) -- the drawn field names the person who is seated', () => {
    // 「人に見せるのは担当者名」. ⭐ Asked of the DRAWN TREE and not of the
    // description: tests/unit/uf-64.test.ts already asks it of the description,
    // and a surface that dropped the name on the way to the nodes would leave
    // that case green.
    const { panel } = drawPanel([ASSIGNEE_FIELD])
    expect(panel.textContent).toContain(SEATED_NAME)
  })

  it('⛔ AS-6 (MUST NOT) -- no uid is drawn as a word', () => {
    // 「利用者に `uid` を覚えさせてはならない（MUST NOT）」. ⚠️ TEXT ONLY. What an
    // option HANDS BACK is the next case, and AS-9 requires that to be the uid --
    // so a uid in an attribute is the rule being kept, not broken.
    const { panel } = drawPanel([ASSIGNEE_FIELD])
    for (const uid of ROSTER_VALUES) {
      expect(panel.textContent, `AS-6 (MUST NOT): the uid ${uid} was drawn as a word`).not.toContain(
        uid,
      )
    }
  })

  it('⛔ AS-9 (MUST) -- what a candidate hands back is its uid, not its name', () => {
    // 「プロパティパネルで `uid` を選んだ …… その `uid` の `Resource` へ割り当て」,
    // with AS-6's 「文書に書くのは `uid`」. ⭐ THE TWINS ARE WHY: two candidates
    // showing one word have to carry two different values, or the panel cannot
    // be the route AS-9 says it is.
    const { panel } = drawPanel([ASSIGNEE_FIELD])
    const options = optionsIn(panel)

    expect(options.map((one) => optionValueOf(one))).toEqual([...ROSTER_VALUES])
    expect(
      new Set(options.map((one) => optionValueOf(one))).size,
      'AS-9: two same-named people are told apart by what they hand back',
    ).toBe(ROSTER_VALUES.length)
  })
})

// ===========================================================================

/** Whether a string carries a word at all, rather than punctuation and space. */
const hasWord = (text: string): boolean => /[\p{L}\p{N}]/u.test(text)

/** The text an element draws ITSELF -- its own text nodes, not its subtree's. */
function ownWords(element: FakeElement): string {
  return element.childNodes
    .filter((node): node is FakeText => node instanceof FakeText)
    .map((node) => node.data)
    .join('')
    .trim()
}

/**
 * The words of the FIRST element inside the panel that draws any of its own.
 *
 * ⭐ Its own text and not `textContent`, which would hand back everything below
 * it and so answer the same for the panel as for its first field. The walk is in
 * document order, so "first" is the head of the panel.
 */
function firstWordsDrawn(panel: FakeElement): string {
  for (const element of descendants(panel)) {
    const own = ownWords(element)
    // ⚠️ Punctuation alone is passed over, for the reason the second case states.
    if (hasWord(own)) return own
  }
  return ''
}

describe('FR-072 (MUST NOT) -- no heading row stands at the head of the panel', () => {
  it('⛔ draws the panel\'s first item first, and nothing above it', () => {
    // FR-072: 「⛔ **パネルの先頭に見出しの行を置いてはならない（MUST NOT）**
    // （利用者の指示 2026-08-27）—— **押下状態が同じことを既に示しており、見出しは
    // 同じ答えを 2 か所で言っていた。**⭐ **落とした高さは、最も頻繁に触る項目が上
    // へ来るぶんである**（表 T-016 の刷る順）。」 ⭐ THE HEIGHT IS THE POINT: what
    // the dropped row buys is the most-touched item standing at the top, which is
    // the same MUST NOT the paragraph under table T-016 writes against scrolling
    // -- 「最も頻繁に触る値のためにスクロールさせてはならない（MUST NOT）」.
    //
    // ⚠️ THE DESCRIPTION OFFERS NO ENTRY HERE (`commands: []`), on purpose. Table
    // T-109 does place one row on this surface -- IC-52, closing an open surface
    // on IN-4's authority -- and no row anywhere says where on the panel it sits,
    // so an entry drawn above the first field would be a gap in the specification
    // rather than a breach of this MUST NOT. With none offered, whatever stands
    // above the first field is a heading and nothing else.
    //
    // ⭐ CONTAINMENT EITHER WAY, NEVER EQUALITY: the claim is about ORDER, which
    // FR-006 fixes (「項目名は値の欄の左に置き」), and never about spelling. No
    // row settles whether a colon follows an item name, and PR-3's name carries
    // the table's own ' / ' between its two columns, which the unit may draw as
    // one string or as parts. ⛔ A heading is neither part of the name nor made
    // of it, so it fails here whichever of those the unit does.
    const { panel } = drawPanel([DATE_FIELD])
    const first = firstWordsDrawn(panel)
    expect(
      first !== '' && (first.includes(DATE_FIELD.name) || DATE_FIELD.name.includes(first)),
      `FR-072 (MUST NOT): ${JSON.stringify(first)} is drawn above the panel's first item`,
    ).toBe(true)
  })

  it('⛔ writes no word into the panel that no field of it carries', () => {
    // ⭐ THE SAME RULE ASKED OF THE WHOLE PANEL rather than of its head, so a
    // heading moved down instead of dropped is caught too. Every word offered is
    // this fixture's, so a word that is neither an item name nor a value came
    // from somewhere the description did not.
    const { panel } = drawPanel([DATE_FIELD])
    const carried = [
      DATE_FIELD.name,
      DATE_FIELD.text,
      ...DATE_FIELD.controls.map((one) => one.text),
    ].filter((one) => one !== '')

    // ⚠️ ONLY TEXT WITH A LETTER OR A DIGIT IN IT IS ASKED ABOUT. A separator or
    // a bracket is punctuation the unit is free to add -- no row settles one --
    // and failing it for that would be pinning a rendering rather than the rule.
    for (const drawn of descendants(panel)) {
      const own = ownWords(drawn)
      if (!hasWord(own)) continue
      expect(
        carried.some((word) => own.includes(word) || word.includes(own)),
        `FR-072 (MUST NOT): ${JSON.stringify(own)} is drawn in the panel and no field carries it`,
      ).toBe(true)
    }
  })
})
