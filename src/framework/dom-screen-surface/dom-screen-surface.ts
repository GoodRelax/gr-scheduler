// DomScreenSurface -- public entry of this folder.
//
// @unit      UF-71   (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-38
//
// The implementation of ScreenSurface (table T-065 IF-9). CP-38 gives it two
// jobs, which are the two halves of what that row says the seam supplies: put
// the description ScreenRenderer built onto the page, and hand back the
// utterance a person settled in the dialogue field.
//
// ⭐ WHY THIS UNIT EXISTS. ScreenRenderer (UF-60) describes every UI part
// OUTSIDE the schedule -- the header, the row titles, the properties panel, the
// palette, the surfaces that open over the screen, the notices, the dialogue
// field and the tooltips -- and it is `pure`, so the description is a value and
// nothing in it is a node. ⛔ Until this file existed none of it reached the
// screen: the application drew a schedule (UF-49 over IF-1) and nothing else.
//
// ⭐ THE DEPENDENCY POINTS INWARD (LR-5 of table T-061). `ScreenSurface` is
// declared by ScreenRenderer, an Adapter, and realised here because LR-5 puts
// the implementation of an inner layer's interface in the outer layer and LY-5
// of table T-060 makes this the layer that may touch the browser. ⛔ The
// declaration is imported and never edited from here, and nothing inner imports
// this file.
//
// ⭐ THE APP HEADER'S HEIGHT IS MEASURED HERE, WHICH IS WHY THE FACTORY TAKES A
// CALLBACK. FR-051 (MUST): the height of the `App Header` and the thickness of
// the `Scrollbars` are settled FROM THE ENVIRONMENT at startup and may not be
// held as a setting (MUST NOT), because both differ from one machine to the
// next; `appHeaderMaxHeight` (S-116) is the UPPER BOUND and not the height, and
// BO-1 of table T-077 is where they are settled. The header is the only one of
// the two this unit draws, so it is the only one it can measure.
//
//   1. THE HEADER IS BUILT AND MEASURED BEFORE THE FIRST FRAME. The skeleton is
//      mounted while the factory runs and its height is handed back through
//      `onAppHeaderHeightPx` BEFORE that factory returns -- so a caller that
//      wires this unit up first has the number BO-1 asks for before it computes
//      one `ScreenRegions`. ⛔ Nothing is SHOWN then: the root carries
//      `visibility:hidden` until the first `showScreenView`, which is BO-1's
//      「寸法が確定するまで 1 枚も描かない」 read as strictly as it can be read
//      on this side. ⚠️ `visibility:hidden` and not `display:none`, because a
//      box that is not laid out has no height to measure.
//   1a. ⛔ 0 IS HANDED BACK LIKE ANY OTHER ANSWER. A host that lays the header
//      out at 0 has answered, and NFR-011's rationale names 「寸法が確定する前
//      の 1 フレームで 0×0 の窓が出ること」 as one of the two events the startup
//      order exists to stop -- so 0 is the case that matters most, not the one
//      to skip. ⚠️ Withholding it would leave BO-1 waiting on a step that can
//      never finish, and NFR-011 forbids 「空白のまま残る画面」 in the same
//      MUST NOT as the one that forbids the half-drawn one. ⭐ WHAT to draw at
//      that size is not settled here: BO-1's 「寸法が確定するまで 1 枚も描かな
//      い」 is kept by the root staying out of sight until a description
//      arrives, and the caller decides what its regions are worth showing.
//   2. THE HEIGHT COMES FROM THE ENVIRONMENT'S OWN TEXT METRICS. The header's
//      box is fixed by `line-height` and a padding written in `em`, so what it
//      measures to is whatever the machine's text size makes it -- which is
//      exactly the quantity FR-051 refuses to let a settings number stand in
//      for. ⛔ Its content cannot change it (`overflow:hidden` and a header that
//      does not wrap), so the number settled at BO-1 stays true.
//   3. A LATER CHANGE IS REPORTED THE SAME WAY. `onAppHeaderHeightPx` is called
//      again only when a redraw of the header measured a DIFFERENT height. That
//      is FT-3 of table T-078 -- 「画面の寸法が変わったこと」 -- and the caller
//      is the shell, which is the party table T-078 names as observing it.
//      ⛔ The callback must do nothing but record the number and let the shell's
//      own resize path decide: waking a frame on anything else would break
//      NFR-010's MUST NOT.
//
// ⛔ WHAT MAY WAKE A FRAME, AND WHY NOTHING HERE DOES. NFR-010 forbids running
// a frame on a trigger table T-078 does not name (MUST NOT). Two listeners are
// registered below and NEITHER schedules anything:
//
//   - `keydown` on the dialogue entry only REMEMBERS that the person settled a
//     line. The frame that carries it away is FT-1's: the same press reaches
//     DomInputSource on the window.
//   - the press on a tooltip's dismiss control only takes that tooltip off the
//     screen and remembers the dismissal. The same press is FT-1 as well.
//
// ⛔ There is no timer here. FT-4 counts three waits -- `iconHintDelayMs`
// (S-124) for EZ-2, NT-2's expiry and the autosave's -- and the note under table
// T-078 puts the clock in the shell. A tooltip that appeared or vanished on a
// timer of this unit's own would be both an NFR-010 violation and an IN-3 one.
//
// ⭐ WHAT THE DOM IS FOR, BESIDES BEING LOOKED AT. Every part carries
// `data-role` with the settled name table T-103 gives it, and every entry
// carries `data-icon` with its row of table T-109 -- including the `Row
// Expander`, which is ONE part (U-47) drawn as the TWO controls HF-1 counts
// (IC-58 / IC-59; see `rowTitleElement`). That is not decoration:
//
//   - `readScreenPartAt` reads them back. It is the third member of IF-9, and
//     `data-role` / `data-icon` are what it walks: the entry a point is on, and
//     the part that entry was drawn in. ⭐ Chapter 5.3 states under table T-065
//     (MUST) that the side which DREW an entry is the side that answers where it
//     is -- which is this unit, and is why the answer leaves through the seam
//     rather than being read out of this markup by whoever holds the page.
//     `ScreenSession.iconUnderPointer` (PD-141) is the shell's, and the shell
//     fills it from this member.
//   - IN-5a's 「文字入力を確定していない間」 is answerable the same way: the
//     entry is the only `input` inside `[data-role="Dialogue Field"]`, so the
//     shell can tell from `activeElement` that text is being entered.
//   - the live DOM can be read back and checked against the description, which
//     rule 04 asks for after anything that draws.
//
// ⭐ NOTHING FROM A DOCUMENT EVER BECOMES MARKUP. Only `textContent` and
// `setAttribute` are written -- there is no `innerHTML` anywhere in this file,
// unlike DomSvgSurface, whose one string is escaped by the unit that built it.
// FR-023 calls everything that arrived from outside untrusted, and a task name
// is one of those things.
//
// ⭐ NO COLOUR IS INVENTED. The specification's colours (`themeHue` and S-73's
// family) belong to the schedule and none of them crosses this seam, so the
// parts are painted in the environment's own system colours -- `Canvas`,
// `CanvasText`, `GrayText`, `Highlight`. ⚠️ `GrayText` is also what FR-029's
// 「薄く描く」 asks for, and it is the one faint colour that follows the reader's
// own contrast settings instead of guessing at them.
//
// ⛔ WHAT THE CALLER MUST SUPPLY is `ScreenSurfaceWiring` below: the document
// the nodes are made in, the element they are mounted in, who is speaking, the
// clock, and where the header's height is to be reported. The browser ARRIVES
// rather than being reached for (R7.3, and LY-5 again), which is also why this
// unit can be exercised where there is no DOM to reach for.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  DialogueField,
  DialogueInput,
  Notice,
  OpenModal,
  PropertiesPanel,
  PropertyField,
  RowTitle,
  RowTitlePanel,
  ScreenFrame,
  ScreenPart,
  ScreenSurface,
  ScreenView,
  Tooltip,
  TooltipAnchor,
} from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'

// ------------------------------------------------------- the settled names ---

/**
 * The names table T-103 settles, spelled as that table spells them.
 *
 * ⭐ Copied, not invented: rule 03 of docs/development-rules requires the
 * specification's own spelling for a concept it has named, and these are the
 * only names the DOM is allowed to call these parts by.
 *
 * ⚠️ ONE OF THEM IS NOT IN TABLE T-103. Notices have no row there, so they
 * carry the member name PI-37 publishes for them on `ScreenView` -- `notices` --
 * which is also a settled name, of the seam rather than of the glossary. ⛔ No
 * third spelling is minted for it.
 * ⭐ Tooltips used to be the second. Table T-103 settled `Tooltip` (U-53) on
 * 2026-08-21, so the layer now carries the glossary's own spelling and rule 03
 * of docs/development-rules is satisfied where it was not.
 */
const ROLE = {
  appHeader: 'App Header',
  documentTitle: 'Document Title',
  autosaveStatus: 'Autosave Status',
  headerCommands: 'Header Commands',
  panelDivider: 'Panel Divider',
  scrollbars: 'Scrollbars',
  rowTitlePanel: 'Row Title Panel',
  rowTitleTree: 'Row Title Tree',
  pinnedRow: 'Pinned Row',
  rowExpander: 'Row Expander',
  rowPin: 'Row Pin',
  propertiesPanel: 'Properties Panel',
  commandPalette: 'Command Palette',
  paletteGroups: 'Palette Groups',
  paletteCommands: 'Palette Commands',
  dialogueField: 'Dialogue Field',
  notices: 'notices',
  tooltips: 'Tooltip',
} as const

/**
 * The one key the host and the tool spell differently is not here: this unit
 * hears only the key that settles an entry.
 *
 * SK-19 of table T-036 assigns `Enter` to 「その場の編集を確定する」. ⚠️ Its
 * list -- name, assignee, row name, document title, a property -- does not name
 * the `Dialogue Field`, so this is the nearest settled assignment rather than
 * one written for this field. ⛔ Nothing else settles an utterance: table T-109
 * holds no row for a control that would, which is the same hole `AiExportModal`
 * records for its copy control.
 *
 * @provisional PD-150
 */
const HOST_ENTER = 'Enter'

// -------------------------------------------------------------- the styles ---

/**
 * How the parts are placed and painted.
 *
 * ⛔ NOT VALUES OF THE SPECIFICATION. Every length here is relative (`em`, a
 * percentage, a hairline) precisely because FR-051 refuses to let the header's
 * height be a number held anywhere: what these produce is the environment's
 * answer, measured back out at BO-1. ⚠️ The PLACES the parts without a
 * rectangle take -- the panels, the surfaces, the notices, the field -- are
 * chosen here because `ScreenView` leaves them to the surface in as many words;
 * they leave no trace in the saved form.
 *
 * @provisional PD-151
 */
const STYLE = {
  root:
    'position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;' +
    'visibility:hidden;font:inherit;color:CanvasText;',
  // The same box once a description has arrived. ⛔ BO-1 of table T-077 is the
  // whole difference between the two: 「寸法が確定するまで 1 枚も描かない」.
  rootShown:
    'position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;' +
    'font:inherit;color:CanvasText;',
  layer: 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;',
  // The height this box measures to is the whole point (FR-051): 1.5 line plus
  // 0.75em of padding, in the machine's own text size, and nothing inside can
  // stretch it.
  appHeader:
    'position:absolute;left:0;top:0;right:0;box-sizing:border-box;display:flex;' +
    'align-items:center;gap:0.75em;padding:0.375em 0.75em;line-height:1.5;' +
    'overflow:hidden;white-space:nowrap;background:Canvas;color:CanvasText;' +
    'border-bottom:1px solid GrayText;pointer-events:auto;',
  documentTitle: 'font-weight:600;overflow:hidden;text-overflow:ellipsis;',
  autosaveStatus: 'margin-left:auto;color:GrayText;',
  headerCommands: 'display:flex;align-items:center;gap:0.25em;',
  // FR-029 (MUST): what cannot be used is drawn faint and keeps its reason
  // reachable. ⛔ `aria-disabled` and not `disabled`: a disabled control leaves
  // the accessibility tree and stops taking the pointer, which would take away
  // both the tooltip IN-3 lets a person point at and the answer PD-141 reads
  // out of `data-icon`.
  entry:
    'font:inherit;background:ButtonFace;color:ButtonText;border:1px solid GrayText;' +
    'border-radius:0.25em;padding:0 0.375em;line-height:1.5;cursor:pointer;',
  entryFaint:
    'font:inherit;background:ButtonFace;color:GrayText;border:1px solid GrayText;' +
    'border-radius:0.25em;padding:0 0.375em;line-height:1.5;cursor:default;',
  // EP-9 of table T-076: the boundary is the same one line as `Group Grid
  // Lines`, so the band that is grabbed carries no paint of its own.
  dividerBand: 'cursor:col-resize;pointer-events:auto;',
  dividerLine: 'background:GrayText;pointer-events:none;',
  scrollbarTrack: 'background:ButtonFace;pointer-events:auto;',
  scrollbarThumb: 'position:absolute;background:GrayText;border-radius:0.25em;',
  rowTitlePanel: 'position:absolute;background:Canvas;',
  rowTitle:
    'box-sizing:border-box;display:flex;align-items:center;gap:0.25em;' +
    'overflow:hidden;white-space:nowrap;background:Canvas;color:CanvasText;' +
    'pointer-events:auto;',
  rowControl:
    'font:inherit;background:transparent;color:CanvasText;border:none;' +
    'padding:0 0.125em;cursor:pointer;',
  // SC-5 of table T-031: only the contents scroll, and never in step with the
  // drawing area.
  propertiesPanel:
    'position:absolute;box-sizing:border-box;overflow-y:auto;padding:0.5em;' +
    'background:Canvas;color:CanvasText;border-left:1px solid GrayText;' +
    'pointer-events:auto;',
  heading: 'font-weight:600;margin:0 0 0.5em 0;',
  field: 'display:flex;gap:0.5em;line-height:1.6;',
  fieldName: 'color:GrayText;min-width:9em;',
  commandPalette:
    'box-sizing:border-box;padding:0.5em;background:Canvas;color:CanvasText;' +
    'border:1px solid GrayText;border-radius:0.25em;overflow:auto;pointer-events:auto;',
  paletteGroup: 'margin-bottom:0.5em;',
  paletteGroupName: 'color:GrayText;',
  paletteCommands: 'display:flex;flex-wrap:wrap;gap:0.25em;',
  armedText: 'color:CanvasText;',
  modal:
    'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
    'box-sizing:border-box;max-width:92%;max-height:92%;overflow:auto;padding:1em;' +
    'background:Canvas;color:CanvasText;border:1px solid CanvasText;pointer-events:auto;',
  modalHeader: 'display:flex;align-items:center;gap:0.75em;margin-bottom:0.5em;',
  notices: 'position:absolute;left:50%;transform:translateX(-50%);max-width:60%;',
  notice:
    'box-sizing:border-box;margin:0.25em 0;padding:0.5em 0.75em;background:Canvas;' +
    'color:CanvasText;border:1px solid CanvasText;pointer-events:auto;',
  dialogueField:
    'position:absolute;box-sizing:border-box;display:flex;flex-direction:column;' +
    'width:24em;height:14em;padding:0.5em;background:Canvas;color:CanvasText;' +
    'border:1px solid GrayText;pointer-events:auto;',
  dialogueMessages: 'flex:1;overflow-y:auto;',
  dialogueMessage: 'line-height:1.5;',
  dialogueAuthor: 'color:GrayText;margin-right:0.5em;',
  dialogueEntry: 'font:inherit;margin-top:0.25em;',
  // IN-3 of table T-028: it can be pointed at, so it takes the pointer.
  tooltip:
    'position:absolute;max-width:24em;padding:0.25em 0.5em;background:Canvas;' +
    'color:CanvasText;border:1px solid CanvasText;pointer-events:auto;' +
    'display:flex;gap:0.5em;align-items:flex-start;',
  tooltipDismiss:
    'font:inherit;background:transparent;color:CanvasText;border:none;cursor:pointer;',
  hidden: 'display:none;',
} as const

/**
 * How far a row is set in for each level below the root.
 *
 * ⛔ NOT `rowTitleIndent` (S-37), WHICH IS THE VALUE THAT BELONGS HERE. FR-085
 * cuts a row's name to `rowTitlePanelWidth` less that indent less the room kept
 * for the controls, and `RowTitle` carries the CUT name and its `depth` but not
 * the indent -- `DocumentSettings` does not cross IF-9. ⚠️ So the length below
 * and the length the name was cut against are two numbers that cannot be made
 * to agree from this side. It is drawn anyway because FR-005's tree is
 * unreadable flat, and it is one line to change when the indent crosses.
 *
 * @provisional PD-152
 */
const ROW_INDENT_EM = 1

/** What a tooltip's dismiss control shows while no word for it is settled. @provisional PD-153 */
const DISMISS_TEXT = 'x'

// --------------------------------------------------------------------- pure --

/**
 * The four numbers of a rectangle, as a place on the screen.
 *
 * ⚠️ Window coordinates, not the parent's: every layer these are put into
 * spans the whole root, and the root is pinned to the viewport, so the numbers
 * `ScreenSession.rowBoxes` and `ScreenRegions` speak in are the numbers here.
 *
 * @purity pure
 */
function boxStyle(box: ScreenRect): string {
  return (
    `position:absolute;left:${box.x}px;top:${box.y}px;` +
    `width:${box.width}px;height:${box.height}px;`
  )
}

/**
 * What a tooltip is anchored to, as one comparable string.
 *
 * ⭐ Built out of the row id or the id the anchor already carries, which is the
 * join the specification admits -- so a dismissal remembered under this key
 * survives a redraw and is forgotten the moment the anchor changes.
 *
 * @purity pure
 */
function anchorKey(anchor: TooltipAnchor): string {
  if (anchor.kind === 'icon') return `icon ${anchor.icon}`
  if (anchor.kind === 'rowTitle') return `rowTitle ${anchor.groupId}`
  return `scrollbar ${anchor.axis}`
}

/**
 * One part's description, as one comparable string.
 *
 * ⭐ Why a description is compared at all: rebuilding a subtree throws away the
 * browser's own layout and paint work for it, and a frame that redraws the
 * identical part is not rare -- FT-4 of table T-078 wakes one for a wait that
 * may change nothing visible. DomSvgSurface compares its one string for the
 * same reason.
 *
 * ⚠️ The key order is the builder's own and is the same every frame, because
 * the same `pure` unit builds the value each time.
 *
 * @purity pure
 */
function described(part: unknown): string {
  return JSON.stringify(part) ?? ''
}

/**
 * The stamp AT-129 spells: ISO 8601, UTC, to the second.
 *
 * ⚠️ Cut rather than formatted by hand, so nothing here can disagree with the
 * spelling the document model already uses for a stamp.
 *
 * @purity pure
 */
function stampOf(atMs: number): string {
  return `${new Date(atMs).toISOString().slice(0, 19)}Z`
}

/**
 * Where the boundary of a panel is drawn, or `null` when the frame names no
 * divider for it.
 *
 * ⭐ FR-052 has the person drag this band to change that panel's width, so its
 * line IS the panel's edge -- which is the only thing on this side that says
 * where the `Properties Panel` and the `Row Title Panel` reach to.
 * `ScreenView` carries no rectangle for either.
 *
 * @purity pure
 */
function panelEdge(
  frame: ScreenFrame,
  panel: 'rowTitlePanel' | 'propertiesPanel',
): ScreenRect | null {
  const divider = frame.dividers.find((one) => one.panel === panel)
  return divider === undefined ? null : divider.line
}

// ----------------------------------------------------------- the builders ----

/**
 * One element with its place already written on it.
 *
 * @purity non-pure
 */
function made(host: Document, tag: string, style: string): HTMLElement {
  const node = host.createElement(tag)
  node.setAttribute('style', style)
  return node
}

/**
 * One element that IS one of the named parts.
 *
 * @purity non-pure
 */
function part(host: Document, tag: string, role: string, style: string): HTMLElement {
  const node = made(host, tag, style)
  node.setAttribute('data-role', role)
  return node
}

/**
 * One entry a person can press, wherever table T-109 places it.
 *
 * ⛔ THE SHAPE IS NOT REACHABLE FROM `src/`. FR-029 makes figure F-019 the
 * authority for every icon's shape (MUST) and forbids taking one from a
 * third-party set (MUST NOT); that figure is `_assets/fig-icons.svg` and
 * nothing generates it into `src/` the way `icon-roster.json` is generated. So
 * the entry is drawn with the words it was given, and with its row id where
 * there are none -- `CommandItem.label` arrives empty until FR-038's translated
 * strings have a home (the hole `app-header-items.ts` records). ⚠️ Either the
 * figure reaches the code the way the roster does, or a hand-drawn copy goes
 * stale in silence.
 *
 * @provisional PD-154
 * @purity non-pure
 */
function commandEntry(host: Document, item: CommandItem): HTMLElement {
  const entry = made(host, 'button', item.isEnabled ? STYLE.entry : STYLE.entryFaint)
  entry.setAttribute('type', 'button')
  // The join table T-109 admits, and what PD-141 has the shell read back.
  entry.setAttribute('data-icon', item.icon)
  entry.setAttribute('data-enabled', String(item.isEnabled))
  entry.setAttribute('data-pressed', String(item.isPressed))
  // FR-029 (MUST): faint and still reachable, never quiet.
  if (!item.isEnabled) entry.setAttribute('aria-disabled', 'true')
  // ⚠️ Only when it IS on: `isPressed` is a toggle that is on, and writing
  // `aria-pressed="false"` on every entry would announce each of them as a
  // toggle -- FR-065's IC-20 and FR-072's IC-17 are the ones that are.
  if (item.isPressed) entry.setAttribute('aria-pressed', 'true')
  if (item.label !== '') entry.setAttribute('aria-label', item.label)
  entry.textContent = item.label === '' ? item.icon : item.label
  return entry
}

/**
 * U-31 `App Header` (UF-62), filled in place.
 *
 * ⚠️ The header ELEMENT is not rebuilt, only its contents: the box whose height
 * FR-051 settles at BO-1 has to be the same box from one frame to the next.
 *
 * @purity non-pure
 */
function fillAppHeader(
  host: Document,
  header: HTMLElement,
  items: AppHeaderItems,
  anchors: Map<string, HTMLElement>,
): void {
  const title = part(host, 'span', ROLE.documentTitle, STYLE.documentTitle)
  // ⛔ Nothing is substituted for a document that carries no title: FR-035
  // fixes `Untitled` for the BROWSER TAB and says nothing about the header.
  title.textContent = items.documentTitle

  const status = part(host, 'span', ROLE.autosaveStatus, STYLE.autosaveStatus)
  // FR-061 (MUST): the three states are told apart. ⛔ Their icons (which the
  // declaration of `AutosaveStatus` names) cannot be drawn from here -- the
  // value carries a kind and no `IconId`, and the mapping lives in table T-109,
  // which this folder may not read (Chapter 5.3, MUST NOT).
  status.setAttribute('data-status', items.autosaveStatus.kind)
  // FR-061 (MUST): the time is shown with the saved state.
  status.textContent = 'at' in items.autosaveStatus ? items.autosaveStatus.at : ''

  const commands = part(host, 'span', ROLE.headerCommands, STYLE.headerCommands)
  for (const item of items.commands) {
    const entry = commandEntry(host, item)
    // EZ-2 of table T-040 (MUST) shows THAT icon's explanation, so the entry
    // that was drawn for it is what the tooltip has to be placed against.
    anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
    commands.append(entry)
  }

  header.replaceChildren(title, status, commands)
}

/**
 * U-24 `Panel Divider` and U-21 `Scrollbars` (UF-61).
 *
 * ⚠️ SC-4 of table T-031 (MUST) keeps both bars drawn whether the content fits
 * or not, so nothing here decides to leave one out -- what is drawn is what the
 * description holds.
 *
 * @purity non-pure
 */
function fillScreenFrame(
  host: Document,
  layer: HTMLElement,
  frame: ScreenFrame,
  anchors: Map<string, HTMLElement>,
): void {
  const drawn: HTMLElement[] = []
  for (const divider of frame.dividers) {
    const band = part(host, 'div', ROLE.panelDivider, boxStyle(divider.band) + STYLE.dividerBand)
    band.setAttribute('data-panel', divider.panel)
    drawn.push(band)
    drawn.push(made(host, 'div', boxStyle(divider.line) + STYLE.dividerLine))
  }
  for (const bar of frame.scrollbars) {
    const track = part(host, 'div', ROLE.scrollbars, boxStyle(bar.track) + STYLE.scrollbarTrack)
    track.setAttribute('data-axis', bar.axis)
    // The grip, which SC-4 keeps drawn even when everything fits. Placed in the
    // window's own numbers like everything else, so the lane it sits in does
    // not have to become its frame of reference.
    track.append(made(host, 'div', boxStyle(bar.thumb) + STYLE.scrollbarThumb))
    // FR-037: the faster way of doing the same thing, shown while the pointer
    // rests on a lane -- so the lane is what its tooltip is placed against.
    anchors.set(anchorKey({ kind: 'scrollbar', axis: bar.axis }), track)
    drawn.push(track)
  }
  layer.replaceChildren(...drawn)
}

/**
 * One control of a row of the `Row Title Panel` -- U-47 `Row Expander`'s two
 * halves and U-48 `Row Pin`.
 *
 * ⭐ EVERY ONE OF THEM CARRIES ITS ROW OF TABLE T-109. IF-9 of table T-065 has
 * this seam answer which part of table T-103 and which entrance of table T-109
 * a point is on, and states under that table (MUST) that the side which DREW an
 * entrance is the side that answers where it is -- so an entrance this unit
 * draws and leaves unmarked is a supply the seam promises and cannot deliver.
 *
 * ⚠️ Two of them share `role` on purpose: U-47 of table T-103 is ONE part made
 * of an opening side and a closing side, and it is `icon` that tells the halves
 * apart.
 *
 * ⛔ THE SHAPE IS NOT REACHABLE FROM `src/`, SO THE ROW ID IS THE BODY. FR-098
 * asks for the `Row Pin` to be DRAWN AS A SHAPE (MUST) and FR-029 makes figure
 * F-019 the one authority for every shape (MUST) while forbidding a third-party
 * set (MUST NOT); that figure is `_assets/fig-icons.svg` and nothing generates
 * it into `src/` the way `icon-roster.json` is generated -- and that roster
 * carries a row id, the surfaces, the group, what the row is an entrance to and
 * the authority, and NO glyph, because table T-109 deliberately holds none.
 * ⛔ So no glyph and no word is invented here: the row id itself is put in as
 * the body, which is the same fallback `commandEntry` already takes, and which
 * the shape replaces on the day F-019 reaches the code the way the roster does.
 *
 * ⛔ WITHOUT A BODY THE CONTROL CANNOT BE PRESSED AT ALL. An empty `button`
 * with no length of its own collapses to zero height, so every entrance drawn
 * here was unreachable by pointer and by IF-9's third member alike -- which is
 * the supply that table T-065 promises above, made undeliverable by having
 * nothing to hit. ⚠️ The words are NOT what FR-029 asks the entrance to say;
 * they are what keeps it a target until the shape arrives.
 *
 * @provisional PD-154
 * @purity non-pure
 */
function rowControlElement(host: Document, role: string, icon: string): HTMLElement {
  const control = part(host, 'button', role, STYLE.rowControl)
  control.setAttribute('type', 'button')
  control.setAttribute('data-icon', icon)
  control.textContent = icon
  return control
}

/**
 * One row of U-23 `Row Title Tree`.
 *
 * ⭐ Placed by the box the description carries, never by one worked out here:
 * SC-1 of table T-031 slaves the panel to the body vertically, so the panel and
 * the `Row Area` have to be the SAME numbers.
 *
 * @purity non-pure
 */
function rowTitleElement(host: Document, title: RowTitle, isPinned: boolean): HTMLElement {
  const indentEm = (title.depth - 1) * ROW_INDENT_EM
  const row = made(
    host,
    'div',
    boxStyle(title.box) + STYLE.rowTitle + `padding:0 0.25em 0 calc(0.25em + ${indentEm}em);`,
  )
  if (isPinned) row.setAttribute('data-role', ROLE.pinnedRow)
  row.setAttribute('data-group-id', title.groupId)
  row.setAttribute('data-depth', String(title.depth))
  row.setAttribute('data-pinned', String(title.isPinned))
  row.setAttribute('data-selected', String(title.isSelected))
  // FR-085 (MUST): what was cut is shown whole in a tooltip. Which rows were
  // cut has to be readable for that tooltip to be raised at all, and UF-69 is
  // what raises it.
  row.setAttribute('data-truncated', String(title.isLabelTruncated))
  if (title.isSelected) row.setAttribute('aria-selected', 'true')

  // U-47 `Row Expander`, drawn as the TWO controls the specification counts.
  //
  // ⭐ HF-1 of table T-051 puts one opening control AND one closing control on
  // a row, U-47 of table T-103 counts the same two as one part, and table T-109
  // gives them a row EACH -- IC-58 opens one level (HF-2), IC-59 closes all of
  // them (HF-3). ⛔ They are NOT one control in two states: the two operations
  // differ in reach, so one of the pair can be spent while the other is not,
  // which is why `RowExpander` carries two flags and not one.
  //
  // ⚠️ The order is the specification's own print order (HF-2 before HF-3,
  // IC-58 before IC-59): a table's order is kept in the code that follows it,
  // because a reader who knows the table reads this list against it.
  //
  // ⛔ `null` is a row with nothing under it, and neither half is drawn then --
  // that judgement is `expanderOf`'s (UF-63) and is not repeated here.
  //
  // STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: how a SPENT half is drawn.
  // `canOpen` / `canClose` are false when that half has nothing left to reach,
  // and no row says what then. HF-6 of table T-051 governs the faintness of the
  // controls as such and turns on the POINTER, not on reach; FR-029 asks for
  // faintness of an endpoint that cannot be grabbed, and the palette's answer
  // (`commandEntry`: faint plus `aria-disabled`) is FR-029's `isEnabled` and not
  // this. ⛔ So neither half is dimmed or disabled here and nothing is invented:
  // the two flags are put on the DOM under their own names, and whoever settles
  // the look reads them back.
  if (title.expander !== null) {
    const open = rowControlElement(host, ROLE.rowExpander, 'IC-58')
    open.setAttribute('data-can-open', String(title.expander.canOpen))
    row.append(open)

    const close = rowControlElement(host, ROLE.rowExpander, 'IC-59')
    close.setAttribute('data-can-close', String(title.expander.canClose))
    row.append(close)
  }

  const label = made(host, 'span', 'overflow:hidden;text-overflow:ellipsis;')
  // ⛔ `null` is a row FR-058 leaves with no name at all -- a document that
  // broke that requirement, or a derivation whose `Task` carries none. Nothing
  // is invented in its place.
  label.textContent = title.label
  row.append(label)

  // U-48 `Row Pin` (FR-098): the control sits on every row, and the same one
  // lets go.
  //
  // ⭐ IC-60 IS ITS ROW OF TABLE T-109: that table places it on the `Row Title
  // Panel` with FR-098 as its authority, and FR-098 puts exactly ONE `Row Pin`
  // on each row and unpins by that same one (MUST) -- so the control and the
  // entrance are one thing, and one attribute on one node states the whole join.
  // ⚠️ This is where U-47 above differs: HF-1 counts TWO controls there, so one
  // node could never have stated it.
  //
  // ⚠️ The KEY of the row it pins is deliberately not on this seam (`ScreenPart`
  // carries the part and the entry and no key, R4's YAGNI), which is why
  // `input-command-translator.ts` still lists IC-60 among the entries it cannot
  // act on. ⭐ That is a different question from whether the entry can be NAMED,
  // and table T-109 is 「アイコンの全数」 that FR-029 (MUST) joins on.
  const pin = rowControlElement(host, ROLE.rowPin, 'IC-60')
  pin.setAttribute('data-pinned', String(title.isPinned))
  pin.setAttribute('aria-pressed', String(title.isPinned))
  row.append(pin)
  return row
}

/**
 * U-22 `Row Title Panel` and its tree (UF-63).
 *
 * ⚠️ FR-098 (MUST NOT) forbids a pinned row to appear at its natural place as
 * well, and the description already keeps the two lists apart -- so the two are
 * drawn one after the other and neither is filtered here.
 *
 * @purity non-pure
 */
function fillRowTitleTree(
  host: Document,
  tree: HTMLElement,
  panel: RowTitlePanel,
  anchors: Map<string, HTMLElement>,
): void {
  const drawn: HTMLElement[] = []
  for (const title of panel.pinnedTitles) {
    const row = rowTitleElement(host, title, true)
    anchors.set(anchorKey({ kind: 'rowTitle', groupId: title.groupId }), row)
    drawn.push(row)
  }
  for (const title of panel.titles) {
    const row = rowTitleElement(host, title, false)
    anchors.set(anchorKey({ kind: 'rowTitle', groupId: title.groupId }), row)
    drawn.push(row)
  }
  tree.replaceChildren(...drawn)
}

/**
 * One item of table T-016, of table T-058's two row columns, or of table T-104.
 *
 * @purity non-pure
 */
function fieldElement(host: Document, field: PropertyField): HTMLElement {
  const line = made(host, 'div', STYLE.field)
  // The row that holds the item -- `PR-n`, `AT-58` / `AT-59`, or `K-n`.
  line.setAttribute('data-field-row', field.row)
  line.setAttribute('data-editable', String(field.isEditable))
  const name = made(host, 'span', STYLE.fieldName)
  // ⚠️ Not translated, and table T-016 says why it keeps its item names in
  // English (FR-038 leaves them alone).
  name.textContent = field.name
  const value = made(host, 'span', '')
  value.textContent = field.text
  line.append(name, value)
  return line
}

/**
 * U-25 `Properties Panel` (UF-64), contents and all.
 *
 * ⚠️ FR-072 (MUST): when the subject went away the panel KEEPS its fields and
 * says so in the heading. The heading is the description's, so nothing is added
 * to it here; `data-subject-gone` is what makes that state readable back.
 *
 * @purity non-pure
 */
function fillPropertiesPanel(
  host: Document,
  panel: HTMLElement,
  description: PropertiesPanel,
): void {
  panel.setAttribute('data-showing', description.showing)
  panel.setAttribute('data-subject-gone', String(description.isSubjectGone))
  const heading = made(host, 'h2', STYLE.heading)
  heading.textContent = description.heading
  const fields = description.fields.map((field) => fieldElement(host, field))
  panel.replaceChildren(heading, ...fields)
}

/**
 * U-26 `Command Palette` (UF-65).
 *
 * ⚠️ FR-053 draws it faintly while the pointer is off it, and that is the
 * condition the requirement states -- ⛔ not a selection: table T-023c's SL-1
 * does not admit the palette, so there would be no state to clear.
 *
 * @purity non-pure
 */
function paletteElement(
  host: Document,
  palette: CommandPalette,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const drawn = part(
    host,
    'div',
    ROLE.commandPalette,
    boxStyle(palette.box) + STYLE.commandPalette + (palette.isPointerOver ? '' : 'opacity:0.6;'),
  )
  drawn.setAttribute('data-pointer-over', String(palette.isPointerOver))
  const groups: HTMLElement[] = []
  for (const group of palette.groups) {
    const box = part(host, 'div', ROLE.paletteGroups, STYLE.paletteGroup)
    const name = made(host, 'div', STYLE.paletteGroupName)
    name.textContent = group.name
    const commands = part(host, 'div', ROLE.paletteCommands, STYLE.paletteCommands)
    for (const item of group.commands) {
      const entry = commandEntry(host, item)
      anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
      commands.append(entry)
    }
    box.append(name, commands)
    groups.push(box)
  }
  // FR-053 (MUST): what is armed has to be readable on the screen.
  const armed = made(host, 'div', STYLE.armedText)
  armed.textContent = palette.armedText
  drawn.replaceChildren(...groups, armed)
  return drawn
}

/**
 * The surface open over the screen (UF-66).
 *
 * ⭐ NARROWED BY WHAT A MEMBER CARRIES, never by comparing the name -- the
 * declaration of `OpenModal` says why: its last member takes any name S-99g
 * holds, a `string` discriminant compares equal to every literal, and
 * TypeScript would keep that member in every comparison.
 *
 * ⚠️ `data-role` takes the surface's own name, which is either one of table
 * T-103's four settled spellings or the UID of the requirement that opens it
 * (FR-074, FR-088) -- both are the specification's own joins, and no name is
 * minted here for the two it has not named.
 *
 * @purity non-pure
 */
function modalElement(
  host: Document,
  modal: OpenModal,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const drawn = part(host, 'div', modal.surface, STYLE.modal)
  drawn.setAttribute('role', 'dialog')
  drawn.setAttribute('aria-modal', 'true')

  const header = made(host, 'div', STYLE.modalHeader)
  const heading = made(host, 'h2', STYLE.heading)
  heading.textContent = modal.heading
  header.append(heading)
  // IC-52 closes it, and the first level of Esc does the same (IN-4).
  for (const item of modal.commands) {
    const entry = commandEntry(host, item)
    anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
    header.append(entry)
  }
  const body: HTMLElement[] = []

  if ('entries' in modal) {
    // FR-038 (MUST): which language is on NOW, readable before the toggle is
    // pressed. ⚠️ The header entry that also toggles it carries no such word --
    // its label is the one that arrives empty.
    drawn.setAttribute('data-language', modal.language)
    for (const line of modal.entries) {
      const row = made(host, 'div', STYLE.field)
      row.setAttribute('data-table', line.table)
      row.setAttribute('data-row', line.row)
      const name = made(host, 'span', STYLE.fieldName)
      name.textContent = line.row
      const text = made(host, 'span', '')
      text.textContent = line.text
      row.append(name, text)
      body.push(row)
    }
    // FR-069 (MUST): the whole licence text, the copyright notice and the
    // third-party attributions, which the help is where one reads.
    for (const text of [modal.licenceText, modal.copyrightNotice, ...modal.attributions]) {
      const line = made(host, 'p', 'white-space:pre-wrap;')
      line.textContent = text
      body.push(line)
    }
  }

  if ('documentText' in modal) {
    // FR-068: the document that would be handed to an AI, shown as it is.
    // ⛔ No control beside it: table T-109 holds no row for a copy entry, and
    // FR-029 makes that table the whole of the icons (MUST).
    const text = made(host, 'pre', 'white-space:pre-wrap;overflow:auto;')
    text.textContent = modal.documentText
    body.push(text)
  }

  if ('resources' in modal) {
    for (const resource of modal.resources) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-uid', String(resource.uid))
      line.setAttribute('data-referenced', String(resource.isReferenced))
      line.setAttribute('data-selected', String(resource.isSelected))
      const name = made(host, 'span', STYLE.fieldName)
      name.textContent = resource.name
      line.append(name)
      // FR-099 (MUST NOT): what a deletion would unassign is shown BY NAME, and
      // reducing it to a count is forbidden in as many words. ⛔ One element
      // each, not one joined line: a `Task` that carries no name of its own
      // (AT-27) would otherwise be lost between two separators, and losing it
      // is what turns the list back into a count.
      for (const taskName of resource.unassignedTaskNames) {
        const unassigned = made(host, 'span', 'margin-right:0.5em;')
        unassigned.setAttribute('data-unnamed', String(taskName === null))
        unassigned.textContent = taskName
        line.append(unassigned)
      }
      body.push(line)
    }
  }

  if ('fields' in modal) {
    for (const field of modal.fields) body.push(fieldElement(host, field))
  }

  if ('weekDays' in modal) {
    // ⛔ Carried as the columns hold them and NOT renumbered: `WeekDay.dayType`
    // (AT-73) makes Sunday 1 and `Project.weekStartDay` (AT-17) makes Sunday 0,
    // so converting either here would put one weekday under two numbers on one
    // surface.
    drawn.setAttribute('data-week-start-day', String(modal.weekStartDay))
    for (const day of modal.weekDays) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-ordinal', String(day.ordinal))
      line.setAttribute('data-day-type', String(day.dayType))
      line.setAttribute('data-day-working', String(day.dayWorking))
      body.push(line)
    }
    for (const exception of modal.exceptions) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-ordinal', String(exception.ordinal))
      line.setAttribute('data-day-working', String(exception.dayWorking))
      line.setAttribute('data-recurrence-kind', String(exception.recurrenceKind))
      const name = made(host, 'span', STYLE.fieldName)
      name.textContent = exception.name
      const span = made(host, 'span', '')
      span.textContent = `${exception.fromDate ?? ''} ${exception.toDate ?? ''}`
      line.append(name, span)
      body.push(line)
    }
  }

  drawn.replaceChildren(header, ...body)
  return drawn
}

/**
 * One thing told to the person (UF-67).
 *
 * ⛔ NT-1 of table T-037 (MUST NOT): colour or a border alone may not carry it,
 * so the words are drawn and the manner rides along as its row id -- NT-5 (MUST)
 * needs 「accepted, with a warning」 to look unlike NT-1's refusal, and told
 * apart by the row the two cannot end up wearing one look.
 *
 * ⛔ EVERYTHING THE ROWS ASK FOR IS DRAWN AS CHARACTERS, THE COUNT INCLUDED.
 * NT-1 asks the person to be told 「文字で」 and forbids anything short of that
 * from carrying the meaning (MUST NOT); an attribute is exactly what it
 * forbids, since no reader can see one. ⚠️ So `data-affected-count` is kept for
 * the read-back rule 04 asks for after anything that draws, and it is NOT what
 * tells the person.
 *
 * @purity non-pure
 */
function noticeElement(host: Document, notice: Notice): HTMLElement {
  const drawn = made(host, 'div', STYLE.notice)
  drawn.setAttribute('data-manner', notice.manner)
  drawn.setAttribute('role', 'status')
  const text = made(host, 'div', '')
  text.textContent = notice.text
  drawn.append(text)
  if (notice.affectedCount !== null) {
    // NT-3: how many things a destructive result reaches. Drawn right after the
    // words it qualifies, and before NT-3a's next steps, so it is read as part
    // of what happened rather than as one of the things to do.
    //
    // ⛔ THE NUMBER STANDS ALONE, WITH NO WORD BESIDE IT. FR-038 (MUST) asks
    // for the display language and no table holds a word to say what the count
    // counts -- the same hole PD-3 and PD-4 already record -- so a word written
    // here would be one this specification has not settled. ⭐ The digits are
    // the part NT-3 does settle, and they are drawn.
    // @provisional PD-157
    const count = made(host, 'div', '')
    count.textContent = String(notice.affectedCount)
    drawn.append(count)
    drawn.setAttribute('data-affected-count', String(notice.affectedCount))
  }
  // NT-3a (MUST NOT): a failure told without what can be done next is forbidden.
  for (const step of notice.nextSteps) {
    const line = made(host, 'div', STYLE.fieldName)
    line.textContent = step
    drawn.append(line)
  }
  return drawn
}

/**
 * The settled utterances, oldest first (UF-68).
 *
 * ⚠️ Ordered by `DialogueMessage.sequence` on the far side (AG-11 makes it an
 * order of its own), so they are drawn in the order they arrive in and nothing
 * here sorts them again.
 *
 * @purity non-pure
 */
function fillDialogueMessages(host: Document, box: HTMLElement, field: DialogueField): void {
  const drawn = field.messages.map((message) => {
    const line = made(host, 'div', STYLE.dialogueMessage)
    line.setAttribute('data-sequence', String(message.sequence))
    line.setAttribute('data-author', message.author)
    line.setAttribute('data-settled-at', message.settledAt)
    const who = made(host, 'span', STYLE.dialogueAuthor)
    who.textContent = message.author
    const said = made(host, 'span', '')
    said.textContent = message.text
    line.append(who, said)
    return line
  })
  box.replaceChildren(...drawn)
}

// -------------------------------------------------------------- the wiring ---

/**
 * What the caller hands over once, at wiring time.
 *
 * ⭐ Every member is something LY-5 of table T-060 leaves to this layer: the
 * browser, the clock, who is speaking, and where a measurement of the machine
 * is to be reported. ⛔ None of them is reached for globally, which is R7.3's
 * injection and what lets this unit be exercised where there is no DOM.
 */
export interface ScreenSurfaceWiring {
  /** The document the nodes are made in. ⛔ Only `createElement` is called on it. */
  readonly host: Document
  /**
   * Where the screen is put. ⚠️ The surface makes a root of its own inside it
   * and never writes on the element it was given.
   *
   * ⛔ IT HAS TO BE IN THE DOCUMENT ALREADY. FR-051's height is a measurement
   * of a box that has been laid out, and a mount that is not attached measures
   * to nothing. ⚠️ A host really can lay one out at 0 x 0 -- a preview pane
   * that has not been sized yet does exactly that -- and the height reported
   * then is the truth about that moment, not a fault; the caller's own BO-1
   * guard is what keeps a frame from being drawn against it.
   */
  readonly mount: Element
  /**
   * Who is speaking, for a line this person settles. AG-6 of table T-035
   * selects on 「自分以外の書き手」, so this is the name a watcher compares
   * against its own.
   *
   * ⭐ Read each time rather than taken once: LY-5 leaves the current value with
   * the caller, and nothing in the specification settles where a person's own
   * name is kept.
   */
  readonly readAuthor: () => string
  /**
   * The machine's clock, in milliseconds since the epoch.
   *
   * ⚠️ Read at the MOMENT a line is settled, not when it is asked for: the
   * stamp AT-129 spells is when the person settled it.
   */
  readonly readClockMs: () => number
  /**
   * FR-051 (MUST): the height the `App Header` measures to, which BO-1 of table
   * T-077 settles before anything is drawn.
   *
   * ⛔ Called once BEFORE this factory returns, so the caller may not reach for
   * the surface inside it -- there is not one yet. ⚠️ Called again only when a
   * redraw measured a different height, which is FT-3 of table T-078; it must
   * do nothing but record the number and leave the deciding to the shell's own
   * resize path, because NFR-010 forbids waking a frame on anything else.
   */
  readonly onAppHeaderHeightPx: (heightPx: number) => void
}

/** What the person settled, until the draw that follows takes it away. */
interface Settlement {
  readonly text: string
  readonly settledAt: string
}

/**
 * The one implementation of `ScreenSurface` (PI-38 of table T-064, CP-38).
 *
 * ⛔ THE CALLER'S HALF OF THE CONTRACT, in two lines:
 *
 *   1. Wire this up BEFORE BO-1's regions are computed. `onAppHeaderHeightPx`
 *      fires while this function runs and is the only place FR-051's measured
 *      height comes from.
 *   2. In a frame that reads, read BEFORE drawing. `readDialogueInput` is
 *      `semi-pure-b` -- it may not take the settled line away -- so the draw is
 *      what takes it away, and a read with no draw after it would hand the same
 *      utterance over twice.
 *
 * @purity non-pure
 */
export function domScreenSurface(wiring: ScreenSurfaceWiring): ScreenSurface {
  const { host, readAuthor, readClockMs, onAppHeaderHeightPx } = wiring

  // ⛔ LY-5 of table T-060 puts these here because there is nowhere further in
  // they are allowed: the tree that has been built, what has been drawn into
  // it, what the person settled, and what they dismissed.
  const root = made(host, 'div', STYLE.root)
  // ⚠️ Not a name for a part: table T-103 has no row for the whole screen, so
  // the root carries the unit's own row of table T-075 instead of a minted one.
  root.setAttribute('data-unit', 'UF-71')

  const frameLayer = made(host, 'div', STYLE.layer)
  const rowTitlePanel = part(host, 'div', ROLE.rowTitlePanel, STYLE.hidden)
  const rowTitleTree = part(host, 'div', ROLE.rowTitleTree, STYLE.layer)
  const propertiesPanel = part(host, 'div', ROLE.propertiesPanel, STYLE.hidden)
  const paletteLayer = made(host, 'div', STYLE.layer)
  const dialogueField = part(host, 'div', ROLE.dialogueField, STYLE.hidden)
  const dialogueMessages = made(host, 'div', STYLE.dialogueMessages)
  const dialogueEntry = host.createElement('input')
  const appHeader = part(host, 'div', ROLE.appHeader, STYLE.appHeader)
  const modalLayer = made(host, 'div', STYLE.layer)
  const noticeLayer = part(host, 'div', ROLE.notices, STYLE.layer)
  const tooltipLayer = part(host, 'div', ROLE.tooltips, STYLE.layer)

  dialogueEntry.setAttribute('type', 'text')
  dialogueEntry.setAttribute('style', STYLE.dialogueEntry)
  dialogueField.append(dialogueMessages, dialogueEntry)

  // The order is the stacking order: the frame and the panels first, the header
  // over them, and what is meant to be read over everything last. ⚠️ The
  // tooltip layer is last because IN-3 lets a person point at a tooltip, which
  // it cannot do through something drawn on top of it.
  root.append(
    frameLayer,
    rowTitlePanel,
    rowTitleTree,
    propertiesPanel,
    paletteLayer,
    dialogueField,
    appHeader,
    modalLayer,
    noticeLayer,
    tooltipLayer,
  )
  wiring.mount.append(root)

  let lastKeys: Readonly<Record<string, string>> = {}
  let headerHeightPx = 0
  // ⛔ Held apart from the number, and not folded into it as a 0 meaning 「not
  // measured yet」: 0 is a height a host really does answer, so the two must be
  // told apart or the first measurement is swallowed by the starting value --
  // which is the number FR-051 (MUST NOT) refuses to let anyone hold.
  let isHeaderHeightSettled = false
  let settled: Settlement | null = null
  let isFieldUp = false
  let dismissedAnchor: string | null = null

  /**
   * What each part's tooltips are anchored to, kept one map per part.
   *
   * ⛔ NOT one map for the whole screen. A part is rebuilt only when its
   * description changed, so a single map would go on holding the elements of
   * the parts that WERE rebuilt -- detached nodes, which measure to nothing and
   * would put a tooltip in the top-left corner of the screen.
   */
  const anchorsByPart = new Map<string, Map<string, HTMLElement>>()

  /**
   * The map a part records into, emptied because that part is being rebuilt.
   *
   * @purity non-pure
   */
  function anchorsOf(name: string): Map<string, HTMLElement> {
    const held = anchorsByPart.get(name) ?? new Map<string, HTMLElement>()
    held.clear()
    anchorsByPart.set(name, held)
    return held
  }

  /**
   * The element one tooltip explains, wherever it was drawn.
   *
   * @purity semi-pure-b
   */
  function anchorFor(key: string): HTMLElement | undefined {
    for (const held of anchorsByPart.values()) {
      const found = held.get(key)
      if (found !== undefined) return found
    }
    return undefined
  }

  /**
   * FR-051 (MUST): the height is taken from the environment, not from a
   * settings key. ⚠️ Reported only when it CHANGED, so that the caller's own
   * FT-3 path is not told about a frame that moved nothing.
   *
   * ⛔ THE FIRST MEASUREMENT IS ALWAYS REPORTED, 0 INCLUDED -- see 1a at the top
   * of this file. 「Changed」 is measured against whether anything has been
   * settled yet, never against the starting number, so that a host laying the
   * header out at 0 still settles BO-1 of table T-077 instead of leaving it
   * waiting on a step that can never finish.
   *
   * @purity non-pure
   */
  function reportHeaderHeight(): boolean {
    const measured = appHeader.getBoundingClientRect().height
    if (isHeaderHeightSettled && measured === headerHeightPx) return false
    isHeaderHeightSettled = true
    headerHeightPx = measured
    onAppHeaderHeightPx(measured)
    return true
  }

  /**
   * AG-11 (MUST NOT): what has not been settled may not be read as an
   * utterance. This is the one place on this side that decides a line HAS been
   * settled, and it refuses three ways of being asked.
   *
   * ⛔ `isComposing` is not a nicety. A person entering Japanese presses Enter
   * to accept what the input method offers, and that press means 「this is the
   * word I meant」 and not 「send it」 -- reading it as an utterance would post a
   * half-typed line, which is exactly what AG-11 forbids.
   *
   * ⛔ `preventDefault` is NOT called here. MK-10 of table T-023 lets the
   * browser's own behaviour be stopped only for what the tool assigned, and
   * only `commandFromInput` knows which is which -- so the press is left to
   * travel to DomInputSource untouched, which is also the frame that carries
   * this settlement away (FT-1).
   *
   * @purity non-pure
   */
  function onEntryKeyDown(event: KeyboardEvent): void {
    if (event.key !== HOST_ENTER || event.isComposing) return
    // ⚠️ A modified Enter is left alone: MK-10 keeps combinations the tool did
    // not assign for the browser, and a later multi-line entry would want one.
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
    if (!isFieldUp) return
    settled = { text: dialogueEntry.value, settledAt: stampOf(readClockMs()) }
    dialogueEntry.value = ''
  }

  dialogueEntry.addEventListener('keydown', onEntryKeyDown)

  /**
   * IN-3 of table T-028: a tooltip can be DISMISSED.
   *
   * ⭐ Remembered on this side because there is nowhere else for it to live: no
   * member of `ScreenView` says a tooltip was dismissed, and LY-5 makes this the
   * layer that may hold a current value. ⚠️ The node is taken off at once
   * rather than at the next frame -- the frame the same press wakes (FT-1) would
   * otherwise draw it again for the length of that frame.
   *
   * @purity non-pure
   */
  function dismissTooltip(key: string, drawn: HTMLElement): void {
    dismissedAnchor = key
    drawn.remove()
  }

  /**
   * One explanation shown against something (UF-69).
   *
   * ⚠️ IN-3 governs all of them: it can be dismissed, it can be pointed at, and
   * ⛔ it does not go away by itself -- which is why the browser's own `title`
   * attribute is nowhere in this file. That tooltip cannot be pointed at and
   * does go away by itself, so using it would break the row twice over.
   *
   * @purity non-pure
   */
  function tooltipElement(tip: Tooltip): HTMLElement {
    const key = anchorKey(tip.anchor)
    const drawn = made(host, 'div', STYLE.tooltip)
    drawn.setAttribute('role', 'tooltip')
    drawn.setAttribute('data-anchor', key)
    const text = made(host, 'span', '')
    text.textContent = tip.text
    const dismiss = made(host, 'button', STYLE.tooltipDismiss)
    dismiss.setAttribute('type', 'button')
    dismiss.textContent = DISMISS_TEXT
    dismiss.addEventListener('click', () => dismissTooltip(key, drawn))
    drawn.append(text, dismiss)

    // Placed against the very element that carries the anchor -- the entry that
    // was drawn for EZ-2's icon, the row FR-085 cut, or the lane FR-037's hint
    // belongs to. ⚠️ Read from the live tree rather than from a rectangle in the
    // description, because `ScreenView` carries no rectangle for an entry: that
    // is the same absence `ScreenSession.iconUnderPointer` records.
    const anchored = anchorFor(key)
    if (anchored === undefined) {
      drawn.setAttribute('style', STYLE.tooltip + 'left:0;top:0;')
      return drawn
    }
    const at = anchored.getBoundingClientRect()
    drawn.setAttribute('style', STYLE.tooltip + `left:${at.left}px;top:${at.bottom}px;`)
    return drawn
  }

  /**
   * U-22 and U-25 have no rectangle in the description, and this is where the
   * one thing that does say where they reach to is used: FR-052 has the person
   * drag a `Panel Divider` to change that panel's width, so the divider's line
   * is the panel's own edge.
   *
   * ⚠️ With no divider for it the panel is placed against the edge of the
   * window and sized by its contents, which will NOT agree with the width
   * `regionsFromScreen` reserved for it (`propertyPanelWidth`, S-80).
   *
   * @provisional PD-155
   * @purity non-pure
   */
  function placePanels(view: ScreenView): void {
    const titleEdge = panelEdge(view.frame, 'rowTitlePanel')
    rowTitlePanel.setAttribute(
      'style',
      titleEdge === null
        ? STYLE.hidden
        : STYLE.rowTitlePanel +
            `left:0;top:${headerHeightPx}px;width:${titleEdge.x}px;bottom:0;`,
    )
    // UF-64's `null` is a panel that is closed, which is also how it goes into
    // an export (EP-8) -- so it is not drawn rather than drawn empty.
    if (view.propertiesPanel === null) {
      propertiesPanel.setAttribute('style', STYLE.hidden)
      return
    }
    const propertiesEdge = panelEdge(view.frame, 'propertiesPanel')
    const place =
      propertiesEdge === null
        ? `right:0;top:${headerHeightPx}px;bottom:0;width:max-content;`
        : `left:${propertiesEdge.x + propertiesEdge.width}px;` +
          `top:${headerHeightPx}px;right:0;bottom:0;`
    propertiesPanel.setAttribute('style', STYLE.propertiesPanel + place)
  }

  /**
   * Where the `Dialogue Field` stands. ⭐ Inside the drawing area's own corner:
   * SC-4 keeps both scrollbars drawn at all times, so the field is kept clear of
   * the lane the frame gave them rather than covering one.
   *
   * @provisional PD-151
   * @purity non-pure
   */
  function placeDialogueField(view: ScreenView): void {
    // FR-066 puts the field up only while the `Agent API` is on.
    if (view.dialogueField === null) {
      dialogueField.setAttribute('style', STYLE.hidden)
      return
    }
    const lane = view.frame.scrollbars.find((one) => one.axis === 'horizontal')
    const propertiesLine = panelEdge(view.frame, 'propertiesPanel')
    const bottom = lane === undefined ? '100%' : `${lane.track.y}px`
    const right = propertiesLine === null ? '100%' : `${propertiesLine.x}px`
    dialogueField.setAttribute(
      'style',
      STYLE.dialogueField + `left:calc(${right} - 24em);top:calc(${bottom} - 14em);`,
    )
  }

  /**
   * Put the description on the screen (the first half of IF-9).
   *
   * ⭐ THE WHOLE DESCRIPTION EACH TIME, which is what the declaration asks for.
   * What is skipped is only the REBUILDING of a part whose description did not
   * change, which throws away no information and keeps the browser's own paint
   * work for that part. ⛔ The dialogue entry is never rebuilt at all: removing
   * a focused input takes the focus and the caret with it, and the person would
   * lose the line they are typing every frame.
   *
   * STOP -- ⛔ ONE MEMBER IS NOT DRAWN: `view.confirmation`, the question NT-7 of
   * table T-037 puts before something goes ahead. ⭐ It reaches this side now,
   * which it did not before, and the two things it would need to be DRAWN are
   * both unsettled: the words on the two choices (FR-038 places no store of
   * translated strings, the same hole `OpenModal.heading` sits in) and an entry
   * to press (table T-109 has no row on a confirmation, and table T-103 has
   * settled no name for one -- so it is not a surface either). ⛔ Nothing is
   * invented here; `notices.ts` holds the same STOP note on the way back.
   *
   * @purity non-pure
   */
  function showScreenView(view: ScreenView): void {
    const keys: Record<string, string> = {
      frame: described(view.frame),
      appHeaderItems: described(view.appHeaderItems),
      rowTitlePanel: described(view.rowTitlePanel),
      propertiesPanel: described(view.propertiesPanel),
      commandPalette: described(view.commandPalette),
      openModal: described(view.openModal),
      notices: described(view.notices),
      dialogueField: described(view.dialogueField),
      tooltips: described(view.tooltips),
    }
    const changed = (name: string): boolean => keys[name] !== lastKeys[name]

    // ⛔ FIRST, because the height it measures is what everything below it is
    // placed against. FR-051 makes that height a measurement rather than a
    // number anyone holds, and the header is the only part whose own size is
    // one -- so it is the only part re-measured after being rewritten.
    let isHeaderMoved = false
    if (changed('appHeaderItems')) {
      fillAppHeader(host, appHeader, view.appHeaderItems, anchorsOf('appHeaderItems'))
      isHeaderMoved = reportHeaderHeight()
    }
    if (changed('frame')) {
      fillScreenFrame(host, frameLayer, view.frame, anchorsOf('frame'))
      // S-99f. FR-071 leaves full screen by the entry it entered by, and IN-4a
      // lets Esc through to the browser -- ⛔ neither of which this unit can
      // carry out: nothing published lets a surface ask the browser for full
      // screen or hear that it left. The state is written where it can be read.
      root.setAttribute('data-full-screen', String(view.frame.isFullScreen))
    }
    if (changed('rowTitlePanel')) {
      fillRowTitleTree(host, rowTitleTree, view.rowTitlePanel, anchorsOf('rowTitlePanel'))
    }
    if (changed('propertiesPanel') && view.propertiesPanel !== null) {
      fillPropertiesPanel(host, propertiesPanel, view.propertiesPanel)
    }
    if (changed('commandPalette')) {
      const palette = view.commandPalette
      const anchors = anchorsOf('commandPalette')
      paletteLayer.replaceChildren(
        ...(palette === null ? [] : [paletteElement(host, palette, anchors)]),
      )
    }
    if (changed('openModal')) {
      const modal = view.openModal
      const anchors = anchorsOf('openModal')
      modalLayer.replaceChildren(...(modal === null ? [] : [modalElement(host, modal, anchors)]))
    }
    if (changed('notices')) {
      noticeLayer.replaceChildren(...view.notices.map((one) => noticeElement(host, one)))
    }
    if (changed('dialogueField')) {
      const field = view.dialogueField
      // ⚠️ The entry NODE is kept whether the field is up or not, so that a
      // frame in which it is down does not throw away what is in it.
      isFieldUp = field !== null
      if (field !== null) fillDialogueMessages(host, dialogueMessages, field)
    }

    // The parts that carry no rectangle of their own hang off the header's
    // height and off the frame's dividers and lanes, so they are placed again
    // whenever either moved.
    if (isHeaderMoved || changed('frame') || changed('propertiesPanel')) placePanels(view)
    if (isHeaderMoved || changed('frame') || changed('dialogueField')) placeDialogueField(view)
    if (isHeaderMoved || changed('notices')) {
      noticeLayer.setAttribute('style', STYLE.notices + `top:${headerHeightPx}px;`)
    }

    // The eight above may have moved what a tooltip is anchored to, so the
    // tooltips are placed last and whenever anything moved -- which is the same
    // order `screenViewFromRegions` builds in, and for the same reason.
    if (isHeaderMoved || Object.keys(keys).some(changed)) {
      const shown = view.tooltips.filter((one) => anchorKey(one.anchor) !== dismissedAnchor)
      // The dismissal is forgotten the moment its anchor stops being explained:
      // IN-3 keeps the tooltip a person put away from coming back, not the
      // next explanation of something else.
      if (shown.length === view.tooltips.length) dismissedAnchor = null
      tooltipLayer.replaceChildren(...shown.map((one) => tooltipElement(one)))
    }

    lastKeys = keys
    // BO-1 of table T-077 (MUST): 「寸法が確定するまで 1 枚も描かない」. Nothing
    // has been SHOWN until here -- the header was mounted so that FR-051 could
    // measure it, and the root was kept out of sight until a description
    // arrived. ⚠️ Made visible synchronously, never inside a frame callback: a
    // first paint that waits for one leaves a white screen until an input
    // arrives.
    root.setAttribute('style', STYLE.rootShown)

    // ⭐ THE SETTLED LINE IS TAKEN AWAY HERE, and this is the only member that
    // may take it: `readDialogueInput` is `semi-pure-b` on the declaration, so
    // it may read and change nothing. The frame that DREW a description is the
    // frame that has already read the utterance out of it -- which is why the
    // caller's half of the contract is to read before it draws.
    settled = null
  }

  /**
   * What stands in the dialogue field, or `null` while the person has entered
   * nothing (the second half of IF-9).
   *
   * ⛔ `isSettled` is what crosses, and the half-typed line stays on this side
   * in the sense AG-11 means: `dialogueMessageFromInput` (PI-37) refuses it
   * while the flag is false, and it is this side that decides the flag -- see
   * `onEntryKeyDown` for the three ways of being asked that it refuses.
   *
   * ⚠️ Reads the field as it stands now, so it is not deterministic: two calls
   * one keystroke apart answer differently. ⛔ It also changes NOTHING, which is
   * what `semi-pure-b` means on the declaration -- the settled line is taken
   * away by the draw that follows, not by this read.
   *
   * @purity semi-pure-b
   */
  function readDialogueInput(): DialogueInput | null {
    // FR-066: with the field not up there is nothing standing in it.
    if (!isFieldUp) return null
    const held = settled
    if (held !== null) {
      return { text: held.text, isSettled: true, author: readAuthor(), settledAt: held.settledAt }
    }
    const typed = dialogueEntry.value
    if (typed === '') return null
    // ⛔ `settledAt` is empty because nothing has been settled and so there is no
    // moment to name. ⚠️ It is never read in this state: `dialogueMessageFromInput`
    // answers `null` before it looks. Nothing in the specification says what an
    // unsettled line should carry there.
    // @provisional PD-156
    return { text: typed, isSettled: false, author: readAuthor(), settledAt: '' }
  }

  /**
   * What this surface has drawn at (x, y) -- the third member of IF-9.
   *
   * ⭐ THE BROWSER ANSWERS "WHAT IS ON TOP", which is the whole reason this is
   * asked of the surface rather than computed anywhere else: the parts overlap
   * (a modal covers the palette, the palette covers the row titles), several are
   * placed by `em` and by percentages, and `pointer-events` decides which of
   * them takes a press. ⛔ Nothing outside this unit can reproduce that, and
   * Chapter 5.3 forbids it to try (MUST NOT, under table T-065).
   *
   * ⛔ `null` FOR A POINT THIS UNIT DID NOT DRAW ON, including one outside the
   * window and one over the schedule. That is what tells the caller that table
   * T-023a's decision order applies -- its own note limits that order to the
   * schedule's drawing area (MUST), and the palette, the open surface, the
   * notices and the dialogue field are drawn over that area while
   * `ScreenRegions` (PI-35) holds a rectangle for none of them.
   *
   * ⚠️ `elementFromPoint` may be absent -- these cases run under Node with no
   * DOM (R7.3 hands the host in rather than reaching for one), and a host that
   * lays nothing out has nothing at any point. Absent is answered as `null`,
   * which is the same answer as "nothing of mine is there".
   *
   * @purity semi-pure-b
   */
  function readScreenPartAt(x: number, y: number): ScreenPart | null {
    const ask = (host as Partial<Document>).elementFromPoint
    if (typeof ask !== 'function') return null

    let node: Element | null = ask.call(host, x, y)
    let entry: string | null = null
    let part: string | null = null
    // ⭐ The innermost `data-icon` and the OUTERMOST `data-role`: an entry sits
    // inside its part, and table T-109's surface column names the containing
    // surface rather than the grouping inside it (U-34 / U-35). So the icon is
    // taken once and the role keeps being replaced on the way up.
    while (node !== null && node !== root) {
      const icon = node.getAttribute('data-icon')
      if (icon !== null && entry === null) entry = icon
      const role = node.getAttribute('data-role')
      if (role !== null) part = role
      node = node.parentElement
    }
    // The walk ran off the top instead of reaching the root, so the point is on
    // something this unit did not draw -- the schedule, or the page around it.
    if (node !== root || part === null) return null
    // U-23 (MUST): an entrance for an operation is named by the panel, not by
    // the tree inside it. Table T-109 puts IC-58 .. IC-60 on the panel too.
    return { part: part === ROLE.rowTitleTree ? ROLE.rowTitlePanel : part, entry }
  }

  // BO-1: settled before the first frame, and before this factory returns.
  reportHeaderHeight()

  return { showScreenView, readDialogueInput, readScreenPartAt }
}
