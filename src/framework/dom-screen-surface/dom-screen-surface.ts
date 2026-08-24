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
// palette, the surfaces that open over the screen, the notices, the confirmation
// (U-55), the dialogue field and the tooltips -- and it is `pure`, so the
// description is a value and nothing in it is a node. ⛔ Until this file existed
// none of it reached the screen: the application drew a schedule (UF-49 over
// IF-1) and nothing else.
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
//     `data-role` / `data-icon` / `data-format` / `data-group-id` / `data-uid`
//     are what it walks: the entry a point is on, the format choice a point is
//     on, the row and the person it is on, and the part all four were drawn in.
//     ⚠️ The last two are read off the ROW and the roster LINE, neither of
//     which is an entry -- the entrances HF-1 and FR-099 draw once per row and
//     once per person sit INSIDE them, so one walk answers both WHICH KIND of
//     control was pressed and WHOSE.
//     ⭐ Chapter 5.3 states under table T-065 (MUST) that the side which DREW an
//     entry is the side that answers where it is -- which is this unit, and is
//     why the answer leaves through the seam rather than being read out of this
//     markup by whoever holds the page.
//     `ScreenSession.iconUnderPointer` (PD-141) is the shell's, and the shell
//     fills it from this member.
//   - ⚠️ `data-format` IS NOT A THIRD SPELLING OF `data-icon`. FR-096 (MUST)
//     allows the whole act of writing a document out ONE entrance and forbids
//     one per format (MUST NOT), so the choices on `Export Chooser` (U-54) are
//     not rows of table T-109 and cannot travel as ones. They carry the row of
//     table T-024 instead, which is the only join that table admits.
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
// ⭐ NO COLOUR IS INVENTED, AND NO SYSTEM COLOUR IS LEFT ANYWHERE. FR-041
// (MUST) has this product paint its own ground and chrome and (MUST NOT) forbids
// leaving them to the viewing environment, because a system colour follows the
// OPERATING SYSTEM and not the reader's `themePreference` (S-72) -- so a dark
// theme chosen in the document came out light. Table T-236 holds the colours in
// both renderings and reaches this file generated (`SCREEN_COLOURS` at the
// foot); `PAINT` below names which row paints what, and `themeStyle` resolves
// one rendering onto the root as custom properties, together with the
// `color-scheme` the same requirement (MUST) has told to the environment.
//
// ⭐ SO THE THEME IS PART OF THE WIRING AND NOT AN EXTRA. `readTheme` is a
// REQUIRED member of `ScreenSurfaceWiring`, and the declaration is written on
// the root both when the tree is built and on every frame after. ⛔ The
// alternative -- an optional reader with a system colour behind each `var()` --
// IS the defect: a unit that can be built without knowing the rendering cannot
// obey FR-041 at all, and every fallback it keeps is the environment deciding.
// ⚠️ A rendering chosen here instead would be that same defect with the evidence
// hidden, and S-73's hue could not be invented in any case (rule 03 section 1).
//
// ⛔ WHAT IS STILL OWED, AND IT IS NOT A CHOICE MADE HERE:
//   - NEITHER VALUE CROSSES IF-9, WHICH IS WHY THEY ARRIVE THROUGH THE WIRING.
//     `themePreference` (S-72) and `themeHue` (S-73) are the document's, and no
//     member of `ScreenView`, `ScreenFrame` or `AppHeaderItems` carries either
//     -- `isPressed` is declared 「a toggle that is on」 and UF-62 says in as many
//     words that a choice between two values has no off side to report IC-16 by.
//     ⚠️ `ScreenSession` DOES hold the pair now, and it is not a way in: that
//     type is ScreenRenderer's ARGUMENT, filled by the shell on the way to UF-60,
//     and what comes back out of UF-60 is `ScreenView`. So the shell hands this
//     unit the same two values it already reads for the session.
//   - THE GROUND (S-146) IS NOT THIS UNIT'S TO PAINT, AND NAMING THE OWNER IS
//     NOT DECLINING IT. This root is `position:fixed` over the whole viewport
//     and the schedule is drawn by another surface UNDERNEATH it, so a
//     background on anything this unit owns would hide the schedule.
//     ⭐ THE GROUND BELONGS ON THE PAGE ELEMENT -- the shell's own
//     `documentElement` -- which is the one box behind the schedule rather than
//     over it. This unit paints S-146 on every ground it does own (the header,
//     the notices, the tooltips, the dialogue field, the surfaces that stop the
//     reading), writes the property so the value is stated once and inherits
//     down, and tells the environment the `color-scheme`. ⛔ The page's own
//     ground is painted by nobody -- measured 2026-08-25: no file in `src/`
//     writes a background on `documentElement` or on `body` -- and FR-041 makes
//     painting it a MUST.
//
// ⭐ THE ENTRIES ARE DRAWN AS SHAPES, AND THE SHAPES ARRIVE THE WAY THE ROSTER
// DOES. FR-029 (MUST) has this product tell what a menu is for with an icon
// rather than a word, makes figure F-019 the authority for every icon's shape
// (MUST), and forbids taking one from a third party's set (MUST NOT).
// `tools/generate_icon_glyphs.py` carries that figure into
// `icon-glyphs.json` -- cross-checked against table T-109, so a row without a
// shape and a shape without a row both stop the build -- and `glyphElement`
// below puts one on the page. ⛔ Nothing here re-draws, re-scales or tidies a
// path: what is set on each node is what the figure holds.
//
//   - THE WORD IS THE NAME, NOT THE BODY. `CommandItem.label` is declared as
//     the ACCESSIBLE name of the entry, so it leaves through `aria-label` and
//     the shape is what is seen. ⚠️ The shape is hidden from the accessibility
//     tree (`aria-hidden`) precisely so the name still comes from the word,
//     with the row id as the fallback the dictionary's empty cells (PD-160)
//     leave in use today.
//   - THE COLOUR IS THE APP'S. The figure paints `currentColor` and switches its
//     own `color` on the viewer's light / dark preference; ⛔ that media query
//     is NOT carried -- FR-041 (MUST NOT) forbids the environment to decide the
//     theme -- so a shape takes the colour of the entry it sits in (S-147 of
//     table T-236, or FR-029's faint S-148), with no rule of its own.
//   - ⚠️ `createElementNS` IS THE ONE MEMBER BESIDES `createElement`. A shape
//     made with `createElement` would be an unknown HTML element and would draw
//     nothing at all, so there is no doing this without it. It is asked for
//     rather than assumed, the way `elementFromPoint` is: a host that lays
//     nothing out (R7.3 hands one in) has no namespaces either, and an element
//     with the same tag and the same attributes is enough for it to be read
//     back.
//
// ⭐ TWO THINGS ARE NOT INLINE DECLARATIONS, AND ONLY TWO. Both are rules about
// where the pointer is, and a `style` attribute can state neither: HF-6's
// 「その行の名前にポインタが乗っているあいだだけ描く」 and FR-053's
// 「ポインタが乗っていないあいだは薄く透明に描く」. So the unit hangs ONE `style`
// element off its own root (`HOVER_CSS`), scoped by the root's `data-unit`.
// ⛔ It is built from constants and never from a description, it paints nothing
// itself, and nothing else in this file is placed or painted by a sheet.
//   - ⭐ `:hover` IS THE PART UNDER THE POINTER, WHICH IS WHAT FR-053 (MUST)
//     ASKS THE JUDGEMENT BE MADE ON. It is the environment's own hit test --
//     the same one `elementFromPoint` answers `readScreenPartAt` with, obeying
//     the same `pointer-events` -- so nothing here tests a point against a
//     rectangle, and ⛔ there is no second hit test to disagree with the first.
//     ⚠️ It matches an ANCESTOR of the node under the pointer too, which is
//     what makes `Palette Groups` and `Palette Commands` (U-34) count as the
//     palette: a pointer on either is a pointer on the part that holds them.
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
  Confirmation,
  DialogueField,
  DialogueInput,
  DisplayLanguage,
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
import iconGlyphs from '../../adapter/screen-renderer/icon-glyphs.json'

// ------------------------------------------------------- the settled names ---

/**
 * This unit's own row of table T-075, which the root carries and which scopes
 * `HOVER_CSS` to the tree this unit built.
 *
 * ⚠️ Not a name for a part: table T-103 has no row for the whole screen.
 */
const UNIT_ROW = 'UF-71'

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
 * of docs/development-rules is satisfied where it was not. `Confirmation`
 * (U-55) arrived already named, and is the spelling table T-109 joins IC-69 and
 * IC-70 to it by.
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
  notices: 'Notification Area',
  confirmation: 'Confirmation',
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

/**
 * IC-21 of table T-109 -- the entrance FR-038 (MUST) places at the top of the
 * screen, and the one entry of the header that draws something no other entry
 * does (`AppHeaderItems.language`).
 *
 * ⭐ Carried as a row id, which is the only join table T-109 admits, and named
 * here for the same reason IC-58 .. IC-60 are named further down: this unit has
 * to put something on THAT entry and on no other. ⛔ Not a name for the icon --
 * that table has no English column on purpose.
 */
const DISPLAY_LANGUAGE_ENTRY = 'IC-21'

/**
 * IC-53 of table T-109 -- the row GR-19 of table T-023d lays along the top edge
 * of U-26, and the one row this unit draws that is NOT an entry: that table says
 * of it 「掴んで動かせることを示す。ボタンではない」.
 *
 * ⭐ Carried as a row id, which is the only join table T-109 admits, and named
 * here for the same reason `DISPLAY_LANGUAGE_ENTRY` is: this unit has to put
 * something on THAT row and on no other. ⚠️ It is a row of that table all the
 * same, which is why `readScreenPartAt` answers it on `ScreenPart.entry` -- that
 * member is the row a point is ON and not the entry that can be pressed.
 */
const PALETTE_GRAB_BAND_ENTRY = 'IC-53'

/**
 * IC-67 and IC-68 of table T-109 -- the ONE entrance FR-099 draws against each
 * person in U-49, in the two states that table gives it. IC-67 says the person
 * is chosen and lets go by the same entrance; IC-68 says the person is not and
 * takes hold by it.
 *
 * ⭐ Carried as row ids, for the reason `DISPLAY_LANGUAGE_ENTRY` is: a row id is
 * the only join table T-109 admits, and this unit has to put something on THOSE
 * rows and on no others. ⚠️ Only one of the two stands against a person at a
 * time -- `RosterResource.isSelected` is which -- because both rows are written
 * 「同じ入口で」 and drawing the pair would offer two.
 */
const ROSTER_CHOSEN_ENTRY = 'IC-67'
const ROSTER_UNCHOSEN_ENTRY = 'IC-68'

/**
 * IC-74 of table T-109 -- the ONE entrance HF-10 of table T-051 (MUST) puts at
 * the top right of the `Row Title Panel`, which opens every row (HR-1 of table
 * T-015).
 *
 * ⭐ Carried as a row id, for the reason `DISPLAY_LANGUAGE_ENTRY` is: a row id
 * is the only join table T-109 admits, and this unit has to put something on
 * THAT row and on no other. ⚠️ It is drawn once per PANEL and not once per row,
 * which is why it is named here beside the other panel-wide entrances instead of
 * standing in `rowTitleElement` with IC-58 .. IC-60.
 */
const OPEN_EVERY_ROW_ENTRY = 'IC-74'

// -------------------------------------------------------------- the paint ---

/**
 * Which row of table T-236 paints what, and the custom property that carries
 * it.
 *
 * ⭐ THE ROW ID IS THE JOIN, exactly as `data-icon` is for table T-109: the
 * value itself is generated into `SCREEN_COLOURS` at the foot of this file, so
 * ⛔ no colour is written here and none can go stale. The mapping IS a judgement
 * and is declared as one -- table T-236 names what each colour is FOR in prose
 * (「地」「主たる文字」「区切りの線」「行見出しパネル・プロパティパネル・パレットの地」
 * 「パレットと面」) and no table joins a row of T-236 to a row of table T-103.
 *
 * ⛔ THREE ROWS OF `SCREEN_COLOURS` ARE NOT USED HERE, AND THAT IS NOT AN
 * OVERSIGHT. S-152 / S-153 / S-154 (良 / 注意 / 不良) reach no part this unit
 * draws -- nothing on this side reports a state in colour, and NT-1 (MUST NOT)
 * forbids colour alone from carrying a meaning.
 *
 * ⚠️ AN EARLIER NOTE HERE COUNTED SIX AND PUT S-151, S-168 AND S-169 AMONG
 * THEM. It was wrong, and the generated block at the foot of this file is what
 * refutes it: nine rows stand there and none of those three is one of them --
 * `tools/generate_entity_types.py` routes all three to SvgRenderer instead.
 * ⛔ Counted against that block, not assumed.
 *
 * ⚠️ S-170 IS A COLOUR AND NOT A SHADOW. Table T-236 gives 「浮いた層の影」 its
 * paint and 「パレットと面」 as where it falls, and no row anywhere states an
 * offset, a blur or a spread -- so those are this unit's, under the same
 * `@provisional` mark the rest of its placing carries, and only the colour comes
 * from the specification. Searched: table T-236, table T-201, table T-206 and
 * FR-041.
 *
 * ⛔ NO `var()` HERE CARRIES A FALLBACK, AND THE ABSENCE IS THE REQUIREMENT.
 * Each one used to name the system colour this file painted with before
 * (`Canvas` / `CanvasText` / `GrayText` / `ButtonFace` / `ButtonText`), and a
 * system colour follows the OPERATING SYSTEM rather than S-72 -- which is what
 * FR-041 (MUST NOT) forbids in as many words, and why a reader who chose dark
 * stayed light. ⭐ They can go because the properties are now always written:
 * `readTheme` is required and the root carries the declaration from the moment
 * it is made.
 */
const PAINT_ROW = {
  ground: 'S-146',
  ink: 'S-147',
  quiet: 'S-148',
  rule: 'S-149',
  panel: 'S-150',
  shadow: 'S-170',
} as const

/** How a declaration names one of them. @purity pure */
function painted(name: keyof typeof PAINT_ROW): string {
  return `var(--gr-${name})`
}

/**
 * ⚠️ SIX NAMES AND NOT EIGHT. An entrance's ground and an entrance's word used
 * to stand as members of their own, because table T-236 has one 地 and one
 * 文字の色 while the system colours had a separate pair for a button
 * (`ButtonFace` / `ButtonText`). ⛔ With the fallbacks gone the two pairs are
 * the same string, and rule 03 section 1 forbids one concept two names.
 */
const PAINT = {
  ground: painted('ground'),
  ink: painted('ink'),
  quiet: painted('quiet'),
  rule: painted('rule'),
  panel: painted('panel'),
  shadow: painted('shadow'),
} as const

/**
 * The room an entrance keeps at its sides, in the reader's own text size.
 *
 * ⛔ NOT A VALUE OF THE SPECIFICATION: no table states an entrance's padding,
 * and `STYLE` says of every length in it why it is relative. It is named here
 * only because `entryGlyphRoom` has to hold S-141 against it.
 *
 * @provisional PD-151
 */
const ENTRY_SIDE_ROOM = '0.375em'

/**
 * The room one entrance keeps around the shape it holds.
 *
 * ⭐ WHAT THIS IS FOR. FR-029 (MUST) asks for a minimum gap between the shape
 * and the ENTRANCE'S FRAME, and S-141 of table T-206 says of that gap 「枠の側は
 * 動かさない —— 定めるのは隙間だけである」: the row settles the clearance and not
 * the outline. ⛔ The way an entrance was built before could not keep either
 * promise. The shape is an `inline-block` of S-138 on a side sitting in the
 * entrance's LINE BOX, so the line box grows to hold it as soon as the reader's
 * text gets small -- the frame moves, which is the one thing S-141 says does
 * not happen -- and until it does the clearance is whatever the leading happens
 * to leave, which is not a minimum at all.
 *
 * ⭐ SO THE SHAPE IS TAKEN OUT OF THE LINE BOX AND CENTRED, AND THE FRAME IS
 * PINNED WHERE THE LINE BOX HAD IT. The `1.5em` floor reproduces exactly the
 * height `line-height:1.5` used to make, so the entrance measures what it
 * measured before at the size it is read at; the shape now sits inside that box
 * instead of setting it, so it can no longer push the frame outwards.
 * ⚠️ The row controls take neither of these -- their frame is their own box,
 * and this only stops the shape from driving it.
 *
 * ⭐ AND THE GAP IS NOW STATED, WHICH IT COULD NOT BE BEFORE. S-141 reaches this
 * file generated (`NOT_STORED_ICON_SIZES` at the foot), so each axis is written
 * as a `max()` of the room the entrance already kept against that row: the
 * relative room wins wherever it is the larger, and S-141 is the floor under it.
 * ⛔ The doubling is left to `calc()` rather than done here -- the gap falls on
 * both sides of the shape, and a `4` written in this file would be a value the
 * specification never printed.
 *
 * ⛔ A FUNCTION AND NOT A `const`, for the first of the two reasons `glyphStyle`
 * gives: the value arrives in the generated block at the foot of this file,
 * which a `const` evaluated above it cannot read.
 *
 * @purity pure
 */
function entryGlyphRoom(): string {
  const side = NOT_STORED_ICON_SIZES['S-138']
  const gap = NOT_STORED_ICON_SIZES['S-141']
  return (
    'display:inline-flex;align-items:center;justify-content:center;' +
    `padding:0 max(${ENTRY_SIDE_ROOM}, ${gap}px);` +
    `min-height:max(1.5em, calc(${side}px + ${gap}px * 2));`
  )
}

/**
 * One entrance's frame, in the state FR-029 (MUST) draws what CAN be used.
 *
 * ⛔ A FUNCTION AND NOT A MEMBER OF `STYLE`, for both of the reasons
 * `glyphStyle` gives: it reaches the generated block through `entryGlyphRoom`,
 * and `STYLE` states that every length in it is relative, which S-138 and S-141
 * are not.
 *
 * @purity pure
 */
function entryStyle(): string {
  return (
    `font:inherit;background:${PAINT.panel};color:${PAINT.ink};` +
    `border:1px solid ${PAINT.rule};border-radius:0.25em;cursor:pointer;` +
    entryGlyphRoom()
  )
}

/**
 * The same frame for an entrance FR-029 (MUST) draws faint, which is the one
 * declaration that differs.
 *
 * ⛔ `aria-disabled` AND NOT `disabled` is what `commandEntry` writes beside
 * this: a disabled control leaves the accessibility tree and stops taking the
 * pointer, which would take away both the tooltip IN-3 lets a person point at
 * and the answer PD-141 reads out of `data-icon`.
 *
 * @purity pure
 */
function entryFaintStyle(): string {
  return (
    `font:inherit;background:${PAINT.panel};color:${PAINT.quiet};` +
    `border:1px solid ${PAINT.rule};border-radius:0.25em;cursor:default;` +
    entryGlyphRoom()
  )
}

// -------------------------------------------------------------- the styles ---

/**
 * The box a part that STOPS THE READING takes: in the middle of the screen, over
 * everything under it, and taking the pointer.
 *
 * ⭐ Written once and used by the two parts that stop the reading -- the surface
 * IN-4 of table T-028 defines by what Esc closes, and U-55 `Confirmation`, which
 * NT-7 (MUST) holds until it is answered. ⛔ They are not the same part and the
 * specification does not say they look alike; what they share is the reason for
 * the place, so a change to it is meant to reach both.
 *
 * @provisional PD-151
 */
const STOPPING_BOX =
  'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
  'box-sizing:border-box;max-width:92%;max-height:92%;overflow:auto;padding:1em;' +
  `background:${PAINT.ground};color:${PAINT.ink};border:1px solid ${PAINT.rule};` +
  `box-shadow:0 0.5em 1.5em ${PAINT.shadow};pointer-events:auto;`

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
    `visibility:hidden;font:inherit;color:${PAINT.ink};`,
  // The same box once a description has arrived. ⛔ BO-1 of table T-077 is the
  // whole difference between the two: 「寸法が確定するまで 1 枚も描かない」.
  rootShown:
    'position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;' +
    `font:inherit;color:${PAINT.ink};`,
  layer: 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;',
  // The height this box measures to is the whole point (FR-051): 1.5 line plus
  // 0.75em of padding, in the machine's own text size, and nothing inside can
  // stretch it.
  appHeader:
    'position:absolute;left:0;top:0;right:0;box-sizing:border-box;display:flex;' +
    'align-items:center;gap:0.75em;padding:0.375em 0.75em;line-height:1.5;' +
    `overflow:hidden;white-space:nowrap;background:${PAINT.ground};color:${PAINT.ink};` +
    `border-bottom:1px solid ${PAINT.rule};pointer-events:auto;`,
  documentTitle: 'font-weight:600;overflow:hidden;text-overflow:ellipsis;',
  autosaveStatus: `margin-left:auto;color:${PAINT.quiet};`,
  headerCommands: 'display:flex;align-items:center;gap:0.25em;',
  // ⚠️ NEITHER AN ENTRANCE'S FRAME NOR THE BOX ITS SHAPE IS DRAWN IN IS A
  // MEMBER HERE: `entryStyle`, `entryFaintStyle` and `glyphStyle` state them,
  // and each says why it cannot stand in this object.

  // The reading FR-038 (MUST) asks to be legible BEFORE the entry is pressed,
  // set beside the shape and not in place of it: the shape says what the entry
  // is FOR and the two characters say which value it is ON.
  //
  // ⛔ NO COLOUR OF ITS OWN, so it darkens and goes faint with the entry it sits
  // in (FR-029) instead of carrying a second rule. ⚠️ Smaller than the entry's
  // own text and set on a line box of its own height, so the header FR-051
  // measures at BO-1 keeps the height the surrounding text already made.
  // ⛔ `pointer-events:none` for the same reason the shape has it: IF-9's third
  // member reads the entry a point is on off the button, and a child that took
  // the pointer would answer in its place.
  languageCode:
    'display:inline-block;vertical-align:middle;margin-left:0.25em;' +
    'font-family:monospace;font-size:0.8em;line-height:1;pointer-events:none;',
  // EP-9 of table T-076: the boundary is the same one line as `Group Grid
  // Lines`, so the band that is grabbed carries no paint of its own.
  dividerBand: 'cursor:col-resize;pointer-events:auto;',
  dividerLine: `background:${PAINT.rule};pointer-events:none;`,
  scrollbarTrack: `background:${PAINT.panel};pointer-events:auto;`,
  scrollbarThumb: `position:absolute;background:${PAINT.quiet};border-radius:0.25em;`,
  rowTitlePanel: `position:absolute;background:${PAINT.panel};`,
  // HF-10 of table T-051 (MUST): 「行見出しパネルの最上部の右端」. ⛔ The two
  // edges are the whole of what that row states about the place, and nothing is
  // added: no inset, no margin, no size.
  //
  // ⛔ `pointer-events:auto` IS NOT DECORATION. The root is `pointer-events:none`
  // and the panel does not take the pointer back -- only the rows do
  // (`STYLE.rowTitle`) -- so without this the one entrance HF-10 requires could
  // be neither pressed nor answered by IF-9's third member.
  panelCornerEntry: 'position:absolute;top:0;right:0;pointer-events:auto;',
  // HF-5 of table T-051 (MUST NOT): the row's controls are not levelled with the
  // middle of the name. ⛔ `align-items:center` is what that row forbids in as
  // many words, and it is answered on the row rather than on each control
  // because HF-5 measures the set-down FROM THE TOP OF THE NAME -- so the name's
  // top has to be a place this unit can name, and the top of the band is the
  // only one it has. The set-down itself is `RowTitle.controlTopOffsetPx`, put
  // on each control by `rowControlElement`.
  //
  // ⚠️ WHAT THIS MOVES. In a band taller than one line of the name -- which is
  // every band with a bar in it, since a plan bar's own height (S-4) already
  // exceeds a line of it -- the name stood in the middle and now stands at the
  // top. ⛔ That is not a choice made freely: nothing on IF-9 carries how tall
  // the name is drawn or where in the band it sits, so a set-down measured from
  // a name held in the middle is a length this side cannot state at all.
  rowTitle:
    'box-sizing:border-box;display:flex;align-items:flex-start;gap:0.25em;' +
    `overflow:hidden;white-space:nowrap;background:${PAINT.panel};color:${PAINT.ink};` +
    'pointer-events:auto;',
  // HF-4 of table T-051 (MUST): the controls keep the panel's right edge
  // whatever the name's length, so the NAME is what takes every pixel left over
  // -- `flex:1` is the whole of that, and the controls drawn after it are held
  // at the edge by what is left. ⚠️ The row's own left padding carries the
  // depth (`ROW_INDENT_EM`), so an indented row moves its name and not its
  // controls, which is what HF-4's 「名前ごとに位置が変わると狙えない」 asks for
  // on the other axis.
  rowLabel: 'flex:1;overflow:hidden;text-overflow:ellipsis;',
  // HF-6 of table T-051, AS THAT ROW NOW READS: 「操作子は、その行の名前にポインタ
  // が乗っているあいだだけ描くこと（MUST）」. ⚠️ It used to read 「薄く描き、乗って
  // いるあいだだけ濃く」 and the row records the change itself (利用者の裁定,
  // 2026-08-25) -- so this declaration no longer paints anything faint, and the
  // control takes the ordinary ink like the rest of the panel. WHETHER it is
  // drawn is `ROW_CONTROL_SHOWN_CSS` below, because ⛔ an inline declaration
  // cannot state a rule about where the pointer is. FR-098 sends the `Row Pin`
  // to this same row rather than restating it, so one declaration covers all
  // three controls.
  //
  // ⛔ `entryGlyphRoom` IS NOT ADDED HERE, AND THE REASON IS THE FRAME. FR-029
  // fixes a gap 「図形と入口の枠のあいだ」 and this control has no frame at all
  // (`border:none`), so there is no edge for the shape to be held off. ⚠️ It is
  // also the one entrance HF-5 (MUST NOT) forbids to be centred, and a box that
  // centres its own content reads as exactly that to anyone holding the drawn
  // control against that row.
  rowControl:
    `font:inherit;background:transparent;color:${PAINT.ink};border:none;` +
    'padding:0 0.125em;cursor:pointer;',
  // SC-5 of table T-031: only the contents scroll, and never in step with the
  // drawing area.
  propertiesPanel:
    'position:absolute;box-sizing:border-box;overflow-y:auto;padding:0.5em;' +
    `background:${PAINT.panel};color:${PAINT.ink};border-left:1px solid ${PAINT.rule};` +
    'pointer-events:auto;',
  heading: 'font-weight:600;margin:0 0 0.5em 0;',
  field: 'display:flex;gap:0.5em;line-height:1.6;',
  fieldName: `color:${PAINT.quiet};min-width:9em;`,
  // ⛔ NO WIDTH AND NO HEIGHT, AND NOT BECAUSE NONE ARRIVED. FR-053 (MUST) has
  // the palette's size follow its contents and (MUST NOT) forbids a settings row
  // from holding one, so `cornerStyle` places it and stops -- an absolutely
  // placed box with neither extent nor a facing edge takes the size of what is
  // inside it, which is the requirement itself and not a rule invented here.
  //
  // ⛔ `overflow:auto` IS GONE, AND IT IS WHAT CLIPPED THE PALETTE. It made a
  // scroll box out of the extent the placing declaration gave -- so while that
  // extent was nothing, everything inside was scrolled out of an empty box.
  // ⚠️ It does not belong back now that the extent follows the contents: SC-6 of
  // table T-031 is the palette's own row, and it grants the palette no scrolling
  // of its own, where SC-5 grants exactly that to the properties panel in as
  // many words. A box that is as big as its contents has nothing to overflow.
  //
  // STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: what a palette does when its
  // contents come out bigger than the window. FR-053 (MUST) makes the size
  // follow the contents and (MUST NOT) forbids a held one, SC-6 grants no
  // scrolling, and nothing bounds where a drag may leave the corner. Searched:
  // FR-053, FR-029, table T-031, table T-103 and table T-109.
  // ⭐ Nothing is done about it, which is the only reading that breaks no rule:
  // the part that ran past the edge is what a person would then drag into view.
  // ⚠️ A scroll box or a bound would each answer a question no requirement asks.
  //
  // ⛔ NO PADDING ON THIS BOX EITHER, AND THAT ONE IS GR-19 OF TABLE T-023d.
  // The grab band is 「パレットの上端に敷く帯」, and a padding here would inset it
  // on three sides -- a strip floating inside the palette rather than a band
  // along its edge. So the room the entries sit in moved one box further in
  // (`paletteContents`), where it still counts towards the size FR-053 (MUST)
  // makes follow the contents.
  commandPalette:
    `box-sizing:border-box;background:${PAINT.panel};color:${PAINT.ink};` +
    `border:1px solid ${PAINT.rule};border-radius:0.25em;` +
    `box-shadow:0 0.5em 1.5em ${PAINT.shadow};pointer-events:auto;`,
  // GR-19 of table T-023d, which stands FIRST in that table under a preamble
  // reading 「上の行ほど優先すること（MUST）」. Laid as the palette's first child,
  // so its width is whatever the entries measured out to and no width is
  // written -- FR-053 (MUST) makes the size follow the contents and (MUST NOT)
  // keeps any table from holding one. ⛔ Its HEIGHT is not here either: it
  // arrives on the description and is written per frame, because rule 03
  // section 1 forbids that number being typed in `src/`.
  //
  // STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: how the band is PAINTED. GR-19
  // states where it goes and what grabbing it does, table T-206 states its
  // height and says in as many words that the height is the only thing it
  // states, and no row gives the band a colour, a background or a boundary.
  // Searched: GR-19 and the preamble of table T-023d, FR-053, FR-029, table
  // T-051 (HF-6), table T-076 (EP-9) and `_assets/tbl-settings.md`.
  // ⭐ So it carries NO paint of its own, which is the answer EP-9's band gets
  // a few rows above (`dividerBand`). What tells a person it can be grabbed is
  // instead two things the specification already holds: the shape table T-109
  // gives IC-53 (drawn by `grabBandElement`) and the environment's own cursor
  // for 掴む. ⚠️ A tint or a hairline would each be a look that reads as
  // measured, and neither was measured.
  // ⚠️ `cursor:grab` and not `move`: what the band offers is being HELD, which
  // is the state that keyword names -- the same distinction `col-resize` makes
  // for the band FR-052 has a person drag.
  paletteGrabBand:
    'display:flex;align-items:center;justify-content:center;' +
    'cursor:grab;pointer-events:auto;',
  // Where the palette's own room went, so that the band above can reach its
  // edges. ⛔ NOT A PART: table T-103 has no row for it and it carries no
  // `data-role`, so `readScreenPartAt` walks straight past it to the palette --
  // it is the box the entries always sat in, one level down.
  paletteContents: 'padding:0.5em;',
  paletteGroup: 'margin-bottom:0.5em;',
  paletteGroupName: `color:${PAINT.quiet};`,
  paletteCommands: 'display:flex;flex-wrap:wrap;gap:0.25em;',
  // ⚠️ S-147 AND NOT S-151. 強調の色 is 「選択と現在位置」 by table T-236's own
  // note, and what is armed is neither -- FR-053 (MUST) asks only that it be
  // readable. ⛔ Nothing is emphasised here that the requirement did not ask to
  // be emphasised.
  armedText: `color:${PAINT.ink};`,
  modal: STOPPING_BOX,
  modalHeader: 'display:flex;align-items:center;gap:0.75em;margin-bottom:0.5em;',
  // The choices FR-096 (MUST) has the author pick one of, held together and
  // apart from the heading above them. ⛔ Nothing here says which order they
  // stand in: they are drawn in the order the description carries, which is
  // table T-024's own.
  formatChoices: 'display:flex;flex-wrap:wrap;gap:0.25em;margin-top:0.5em;',
  notices: 'position:absolute;left:50%;transform:translateX(-50%);max-width:60%;',
  notice:
    `box-sizing:border-box;margin:0.25em 0;padding:0.5em 0.75em;background:${PAINT.ground};` +
    `color:${PAINT.ink};border:1px solid ${PAINT.rule};pointer-events:auto;`,
  // ⛔ `pointer-events:auto` is not decoration here: without it the point-to-part
  // answer (IF-9) never sees this surface, the press falls through to the
  // schedule underneath, and NT-7's two answers cannot be pressed at all.
  confirmation: STOPPING_BOX,
  // NT-7 (MUST): the names of what would go, one element each.
  confirmationItem: 'display:block;line-height:1.6;',
  // FR-032's mark (PD-175), held off the name it follows. ⛔ Nothing but the gap
  // is declared here: the word carries the meaning, and NT-1 (MUST NOT) forbids
  // colour or a border from being what does.
  confirmationMark: 'margin-left:0.5em;',
  // The two answers, held apart from the names above them so that the choice
  // does not read as one more thing that would go.
  confirmationAnswers: 'display:flex;align-items:center;gap:0.5em;margin-top:0.5em;',
  dialogueField:
    'position:absolute;box-sizing:border-box;display:flex;flex-direction:column;' +
    `width:24em;height:14em;padding:0.5em;background:${PAINT.ground};color:${PAINT.ink};` +
    `border:1px solid ${PAINT.rule};pointer-events:auto;`,
  dialogueMessages: 'flex:1;overflow-y:auto;',
  dialogueMessage: 'line-height:1.5;',
  dialogueAuthor: `color:${PAINT.quiet};margin-right:0.5em;`,
  dialogueEntry: 'font:inherit;margin-top:0.25em;',
  // IN-3 of table T-028: it can be pointed at, so it takes the pointer.
  tooltip:
    `position:absolute;max-width:24em;padding:0.25em 0.5em;background:${PAINT.ground};` +
    `color:${PAINT.ink};border:1px solid ${PAINT.rule};pointer-events:auto;` +
    'display:flex;gap:0.5em;align-items:flex-start;',
  tooltipDismiss:
    `font:inherit;background:transparent;color:${PAINT.ink};border:none;cursor:pointer;`,
  hidden: 'display:none;',
} as const

/**
 * The box one shape of figure F-019 is drawn in, and the whole of what this
 * unit decides about a shape -- the paint is the figure's own.
 *
 * ⭐ FR-029 (MUST) names the side of that box: S-138 of table T-206. ⛔ The
 * same requirement forbids it to differ with the surface the shape sits on
 * (MUST NOT), and this is the one declaration there is -- every entrance
 * reaches it through `fillEntry`, so the header, the palette, a surface open
 * over the screen and a row's controls take the same box. ⚠️ It states the
 * SHAPE's box and not the entrance's outline, which FR-029 says in as many
 * words: the border, the padding and the line box stay the entrance's own, so
 * the height FR-051 measures at BO-1 is unchanged by this.
 *
 * ⛔ A FUNCTION, AND NOT A MEMBER OF `STYLE`, for two reasons: the value arrives
 * in the generated block at the foot of this file, which a `const` declared
 * above it cannot read while the module is being evaluated; and `STYLE` states
 * that every length in it is relative, which this one is not.
 *
 * ⚠️ `inline-block` and `vertical-align` are for the ONE place a shape is still
 * laid out on a line: the palette's grab band and any host that does not lay a
 * flex box out. Inside an entrance the box `entryGlyphRoom` makes, the shape
 * is a flex item and is centred by that box instead -- which is what keeps it
 * from setting the entrance's height (FR-029, S-141). ⛔ `pointer-events:none`
 * so the ANSWER does not move: IF-9's third member reads back the entry a point
 * is on, and the button is what carries `data-icon`.
 *
 * @purity pure
 */
function glyphStyle(): string {
  const side = NOT_STORED_ICON_SIZES['S-138']
  return (
    'display:inline-block;vertical-align:middle;' +
    `width:${side}px;height:${side}px;pointer-events:none;`
  )
}

/**
 * Which of table T-236's two renderings the reader chose, and the hue the rows
 * that follow it are to be solved with.
 *
 * ⭐ BOTH ARE THE DOCUMENT'S, NOT THIS UNIT'S. `themePreference` is S-72 and
 * `themeHue` is S-73 (AT-19), and FR-041 keeps exactly those two saved and
 * forbids a derived colour to be saved beside them (MUST NOT). ⛔ The names are
 * the specification's own spellings, which rule 03 section 1 requires; the
 * VALUES are never written here.
 *
 * ⚠️ `preference` IS AN ENUMERATION AND NOT A NUMBER. S-72 admits `light` and
 * `dark` and nothing else, so the two words are names of the specification and
 * not values copied out of it -- the same bargain `DisplayLanguage` keeps for
 * `ja` / `en`.
 */
export interface ScreenTheme {
  /** S-72. */
  readonly preference: 'light' | 'dark'
  /** S-73, 0..359. */
  readonly hue: number
}

/**
 * The letter `H` a row of table T-236 writes, solved.
 *
 * ⭐ THE MANUSCRIPT WRITES A LETTER ON PURPOSE, and the generated block at the
 * foot of this file says so in as many words: a row whose `followsHue` is true
 * states its hue as `H` so that S-73's value is written ONCE instead of being
 * copied into every row, and the consumer substitutes. ⛔ A row with
 * `followsHue` false states its own hue and is used exactly as written.
 *
 * ⚠️ ONE OCCURRENCE AND NOT A GLOBAL REPLACE. Every row that follows the hue
 * writes `hsl(H ...)`, where `H` stands alone as the first component; the
 * function names are lower case and no other capital `H` appears in any cell,
 * so replacing the first is replacing the hue.
 *
 * @purity pure
 */
function hued(written: string, followsHue: boolean, hue: number): string {
  return followsHue ? written.replace('H', String(hue)) : written
}

/**
 * FR-041 (MUST), both halves, as one declaration for the root.
 *
 * ⭐ WHAT IT WRITES. Every row of `PAINT_ROW` in the rendering the reader chose,
 * as the custom property each `PAINT` member reads -- so one declaration repaints
 * every part this unit drew, and ⛔ no part carries a colour of its own to be
 * kept in step. Beside them, the `color-scheme` the same requirement (MUST) has
 * told to the environment: without it the scrollbars of the properties panel,
 * the palette and the open surface stay light while everything around them goes
 * dark, and FR-041 says in as many words that painting alone is not enough.
 *
 * ⛔ S-146 IS RESOLVED AND NOT PAINTED ON THE ROOT. The root is
 * `position:fixed` over the whole viewport with the schedule drawn UNDER it, so
 * a background here would hide the schedule; the property is still written, and
 * the parts that ARE this unit's grounds (the header, the notices, the tooltips,
 * the dialogue field, the surfaces that stop the reading) take it.
 * ⭐ WHERE THE PAGE'S OWN GROUND BELONGS, since FR-041 (MUST) leaves it nowhere
 * else: on the shell's `documentElement`, which is the one box behind the
 * schedule instead of over it. ⛔ Not this unit's to write -- it never touches an
 * element it was not given (`mount`'s own note says so) -- and it is unpainted
 * today, which the head of this file records as measured.
 *
 * @purity pure
 */
function themeStyle(theme: ScreenTheme): string {
  let written = `color-scheme:${theme.preference};`
  for (const [name, rowId] of Object.entries(PAINT_ROW)) {
    const row = SCREEN_COLOURS[rowId]
    if (row === undefined) continue
    const chosen = theme.preference === 'dark' ? row.dark : row.light
    written += `--gr-${name}:${hued(chosen, row.followsHue, theme.hue)};`
  }
  return written
}

/**
 * HF-6 of table T-051 (MUST): 「操作子は、その行の名前にポインタが乗っている
 * あいだだけ描くこと」, which FR-098 binds the `Row Pin` to as well.
 *
 * ⭐ `visibility` AND NOT `display`, WHICH IS THE MUST NOT OF THE SAME ROW.
 * 「描かないあいだも、確保する場所を変えてはならない」, and FR-085 holds the rule
 * and the reason: the room kept for the controls (S-140) is what the row's name
 * was cut against, so a control that stopped taking up room would move the cut
 * every time the pointer crossed a row. ⛔ `display:none` takes the room away;
 * `visibility:hidden` keeps the box and draws nothing in it. ⚠️ It also stops
 * the control taking the pointer, which is right: an undrawn control is not one
 * a person can press, and IF-9's third member answers what `elementFromPoint`
 * answers.
 *
 * ⛔ THE ROW AND NOT THE NAME'S OWN BOX IS WHAT IS TESTED, and the difference
 * matters. HF-4 (MUST) holds the controls at the panel's RIGHT EDGE whatever the
 * name's length, so they stand outside the name's box -- a rule keyed on the
 * name alone would take the control away at the instant the pointer reached it,
 * and HF-1 .. HF-3 (MUST) all require it to be pressable. `[data-group-id]` is
 * the row, which is the band that name is drawn in and the smallest thing this
 * unit draws that holds both the name and its controls.
 *
 * ⛔ WHY A RULE AND NOT A LISTENER. A `pointerover` / `pointerout` pair would
 * answer for the node under the pointer, not the ROW under it: a row is rebuilt
 * whenever `RowTitlePanel`'s description changed, and the press that opens a
 * level changes it -- so the fresh node would stand undrawn under a pointer that
 * never moved, which is the one state HF-6 is about. ⭐ `:hover` is the
 * environment's own answer to 「乗っているあいだ」 and survives the rebuild.
 * ⚠️ It also wakes nothing: NFR-010 (MUST NOT) forbids running a frame on a
 * trigger table T-078 does not name, and FR-048 names HF-6 among the four it
 * excuses from its own MUST NOT -- an excuse this side does not have to spend,
 * because no frame is run at all.
 *
 * ⛔ NO `!important` IS NEEDED. `STYLE.rowControl` states no `visibility` of its
 * own, so there is no inline declaration for either selector to be outranked by
 * -- which is the same reason `PALETTE_FAINT_CSS` needs none.
 *
 * ⛔ NOTHING IS FETCHED AND NOTHING IS INVENTED. The sheet is built from the
 * names of tables T-103 and T-075 that this unit already writes, and it is put
 * on the page by the same script the single `.html` carries (FR-067, CN-1 and
 * CN-6). ⚠️ CN-8's `CSP` is not written yet; when it is, a policy that allows
 * this unit's inline `style` attributes at all allows this element too.
 * ⭐ It draws nothing: a `style` element has no box, so table T-076's EP-4 --
 * an export draws no row control -- has nothing more to answer for here.
 */
const ROW_CONTROL_SHOWN_CSS =
  `[data-unit="${UNIT_ROW}"] [data-role="${ROLE.rowExpander}"],` +
  `[data-unit="${UNIT_ROW}"] [data-role="${ROLE.rowPin}"]` +
  '{visibility:hidden;}' +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [data-role="${ROLE.rowExpander}"],` +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [data-role="${ROLE.rowPin}"]` +
  '{visibility:visible;}'

/**
 * How faint the palette stands while the pointer is not on it.
 *
 * STOP -- ⛔ NOT HELD ANYWHERE: how faint 「薄く透明に」 is. FR-053 states the
 * state and no degree of it, and no settings row carries one -- S-131's
 * `dummyOpacity` is FR-013's and FR-043's value for the schedule's own faint
 * marks and belongs to the surface that draws those, so borrowing it here would
 * give this unit a number its requirement does not have. Searched: FR-053,
 * FR-029, table T-031, table T-051 (HF-6) and `_assets/tbl-settings.md`.
 * ⭐ Carried over unchanged from the inline declaration this rule replaces, so
 * that moving WHERE the judgement is made changes nothing about how it looks.
 * ⚠️ It is a transparency and not a colour, which is where FR-053 parts company
 * with FR-029's 「薄く描く」: that one takes table T-236's 控えめな文字の色
 * (S-148, `PAINT.quiet`), and FR-053 asks
 * for something a colour cannot state.
 */
const PALETTE_FAINTNESS = '0.6'

/**
 * FR-053 (MUST): 「ポインタが乗っていないあいだは薄く透明に描く」.
 *
 * ⭐ WHY THIS IS A RULE AND NOT A MEMBER OF THE DESCRIPTION. FR-053 (MUST)
 * requires the judgement to be made on WHICH PART the pointer is on, and this
 * unit is the side that drew the parts -- Chapter 5.3 states under table T-065
 * (MUST) that no one else may work out where a part is. `:hover` is the
 * environment's own answer to that, resolved against the very boxes that were
 * laid out and obeying the same `pointer-events` as `elementFromPoint`, so
 * ⛔ nothing is measured twice and no rectangle is tested. That matters more
 * here than it did for HF-6: FR-053 (MUST) now has the palette's size follow
 * its contents, so there is no rectangle for anyone to test against.
 *
 * ⚠️ THE PARTS INSIDE THE PALETTE COUNT AS THE PALETTE. `:hover` matches an
 * ancestor of the node under the pointer, so a pointer on `Palette Groups` or
 * `Palette Commands` (U-34) -- or on an entry inside them -- keeps the palette
 * bright, which is what 「乗っている」 means for a part that holds other parts.
 *
 * ⛔ NO `!important` HERE EITHER. Nothing paints the palette's transparency
 * inline, so there is no inline declaration for a selector to be outranked by --
 * the same reason `ROW_CONTROL_SHOWN_CSS` needs none.
 *
 * ⚠️ It wakes nothing. NFR-010 (MUST NOT) forbids running a frame on a trigger
 * table T-078 does not name; FR-048 names FR-053 among the four it excuses from
 * its own MUST NOT, and this side does not have to spend that excuse either --
 * the pointer moving on or off the palette runs no frame at all.
 */
const PALETTE_FAINT_CSS =
  `[data-unit="${UNIT_ROW}"] [data-role="${ROLE.commandPalette}"]:not(:hover)` +
  `{opacity:${PALETTE_FAINTNESS};}`

/**
 * Everything this unit states as a rule rather than as an inline declaration --
 * two requirements about where the pointer is, and nothing else.
 *
 * ⛔ BUILT FROM CONSTANTS AND NEVER FROM A DESCRIPTION, so the sheet is written
 * once and never rewritten: neither rule depends on what is on the screen.
 */
const HOVER_CSS = ROW_CONTROL_SHOWN_CSS + PALETTE_FAINT_CSS

/**
 * The namespace a shape has to be made in.
 *
 * ⭐ NOT A VALUE OF THE SPECIFICATION, so rule 03 section 1 has nothing to say
 * about it: it is the name the SVG standard gives itself, and it is written
 * here because an element made outside it is an unknown HTML element that draws
 * nothing at all.
 */
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

/**
 * The shapes of figure F-019, by the row of table T-109 printed under each.
 *
 * ⭐ WHERE THE SHAPES COME FROM. FR-029 (MUST) makes that figure the authority
 * for every icon's shape and forbids a third party's set (MUST NOT);
 * `icon-glyphs.json` beside the roster is that figure generated into `src/` by
 * `tools/generate_icon_glyphs.py`, which refuses to write at all unless every
 * row of table T-109 has a shape and every shape has a row. ⛔ So no shape is
 * drawn here and none is chosen here: the row id arrives on the description and
 * the figure answers what it looks like.
 *
 * ⚠️ Reading it no more makes this unit's builders `semi-pure-a` than reading
 * `STYLE` does -- it is a module constant compiled into the program, not state
 * read while running.
 *
 * ⭐ A `Map` rather than a scan per entry: a description is built for every
 * frame, and rule 05 of docs/development-rules forbids a linear search on that
 * path (NFR-013).
 */
const GLYPH_BY_ROW = new Map(iconGlyphs.glyphs.map((one) => [one.rowId, one.elements]))

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
 * The two numbers of a corner, as a place on the screen -- and NO size.
 *
 * ⭐ WHY A SECOND PLACING FUNCTION. `boxStyle` above states an extent, which is
 * the whole of what FR-053 (MUST NOT) keeps the palette from having: its size
 * is to follow its contents (MUST). An absolutely placed box given one corner
 * and neither a size nor the facing edge takes the size of what is inside it,
 * so the requirement is met by what is NOT written here.
 * ⚠️ `position:absolute` is not optional decoration: FR-053 (MUST) floats the
 * palette and lets the person drag it, and SC-6 of table T-031 keeps it still
 * against the screen while the schedule scrolls under it.
 *
 * ⚠️ Window coordinates, like `boxStyle` and for the same reason: every layer
 * these are put into spans the whole root, and the root is pinned to the
 * viewport.
 *
 * @purity pure
 */
function cornerStyle(at: { readonly x: number; readonly y: number }): string {
  return `position:absolute;left:${at.x}px;top:${at.y}px;`
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
 * One node of a shape, made in the namespace SVG needs.
 *
 * ⚠️ `createElementNS` IS ASKED FOR RATHER THAN ASSUMED, the way
 * `elementFromPoint` is in `readScreenPartAt`. R7.3 hands the host in instead
 * of reaching for one, and these cases run under Node with no DOM: a host that
 * lays nothing out has no namespaces either. ⛔ The fallback is NOT a way of
 * drawing -- an element of the same tag outside the SVG namespace draws nothing
 * in a browser. It is what lets a host that never paints still be handed the
 * same tag and the same attributes, and read them back.
 *
 * @purity non-pure
 */
function shapeNode(host: Document, tag: string): Element {
  if (typeof (host as Partial<Document>).createElementNS !== 'function') {
    return host.createElement(tag)
  }
  return host.createElementNS(SVG_NAMESPACE, tag)
}

/**
 * The body of one entry: the shape figure F-019 draws for its row.
 *
 * ⭐ FR-029 (MUST) tells what a menu is for with an icon and not with a word,
 * and makes that figure the authority for every shape (MUST). Each node is set
 * with the tag and the attributes `icon-glyphs.json` carries and with nothing
 * else -- ⛔ no path is re-drawn, re-scaled or tidied here, and no colour is
 * chosen: the figure paints `currentColor`, so a shape takes the colour of the
 * entry it sits in (S-147 of table T-236, or FR-029's faint S-148) and brings no
 * rule of its own.
 *
 * ⚠️ THE SHAPE IS HIDDEN FROM THE ACCESSIBILITY TREE. It is an image and not a
 * word, and the entry's name is `CommandItem.label` -- declared as the
 * ACCESSIBLE name of the entry -- so `aria-hidden` is what keeps the name
 * coming from the dictionary. `focusable="false"` beside it is for the hosts
 * that would otherwise put the shape in the tab order.
 *
 * ⛔ THE ROW ID IS STILL THE BODY WHERE THERE IS NO SHAPE, and that branch is
 * unreachable for a row of table T-109: the generator refuses to write unless
 * every row has one. It is here because `IconId` is a bare `string`, and an
 * entry with no body at all collapses to zero height -- unreachable by pointer
 * and by IF-9's third member alike.
 *
 * @purity non-pure
 */
function fillEntry(host: Document, entry: HTMLElement, icon: string): void {
  const drawn = GLYPH_BY_ROW.get(icon)
  if (drawn === undefined) {
    entry.replaceChildren(icon)
    return
  }
  const shape = shapeNode(host, 'svg')
  shape.setAttribute('viewBox', iconGlyphs.viewBox)
  shape.setAttribute('style', glyphStyle())
  shape.setAttribute('aria-hidden', 'true')
  shape.setAttribute('focusable', 'false')
  for (const element of drawn) {
    const node = shapeNode(host, element.tag)
    for (const attribute of element.attributes) {
      node.setAttribute(attribute.name, attribute.value)
    }
    shape.append(node)
  }
  entry.replaceChildren(shape)
}

/**
 * One entry a person can press, wherever table T-109 places it.
 *
 * ⭐ THE WORD IS THE NAME AND THE SHAPE IS THE BODY. FR-029 (MUST) has the
 * purpose told by an icon rather than by a word, and `CommandItem.label` is
 * declared as the ACCESSIBLE name of the entry -- so the word leaves through
 * `aria-label` and figure F-019 is what is seen. ⚠️ The row id is the name
 * while the dictionary holds no word (every cell is still empty, PD-160), which
 * is the same fallback the body took while there were no shapes.
 *
 * ⭐ PD-154'S MARK IS GONE FROM THIS FILE, because both halves of what held it
 * here are answered. ⛔ What the row itself records -- that figure F-019 is not
 * generated into `src/` -- stopped being so when `icon-glyphs.json` arrived, the
 * way that row said would let the drawing side be swapped; and the box a shape
 * is drawn in, chosen here while no table settled one, is now S-138 of table
 * T-206 (`glyphStyle`). ⚠️ The state of the decision itself is kept where the
 * decision is written down, not here.
 *
 * @purity non-pure
 */
function commandEntry(host: Document, item: CommandItem): HTMLElement {
  const entry = made(host, 'button', item.isEnabled ? entryStyle() : entryFaintStyle())
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
  // ⛔ WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`, the same way UF-65 writes
  // the fallback it reads out of the dictionary: those two read an empty word
  // as absent, and PD-160 makes empty the state every cell is in today.
  entry.setAttribute('aria-label', item.label === '' ? item.icon : item.label)
  fillEntry(host, entry, item.icon)
  return entry
}

/**
 * The current display language, put ON the entry that switches it (IC-21).
 *
 * ⭐ THE SHAPE SAYS WHAT, THE CODE SAYS WHICH. FR-038 (MUST) requires the
 * language in force to be readable BEFORE this entry is pressed, and FR-029
 * (MUST) has the entry's purpose told by an icon rather than by a word -- so the
 * globe figure F-019 already draws for IC-21 stays the body and the two
 * characters are set beside it. ⛔ No shape is invented for this: table T-109
 * gives IC-21 one and figure F-019 is its only authority (FR-029, MUST NOT).
 *
 * ⭐ THE CODE IS PRINTED AS IT ARRIVES, IN LOWER CASE. `DisplayLanguage` admits
 * `ja` and `en` and nothing else, and those are the values S-99 of table T-206
 * holds -- ⛔ not words of the screen, so the dictionary's empty cells (PD-160)
 * do not reach this and nothing is upper-cased, expanded or translated here.
 *
 * ⚠️ THE ACCESSIBLE NAME IS LEFT ALONE. `CommandItem.label` is declared as the
 * name of the entry and `commandEntry` has already set it, so the code is drawn
 * as text and the name still comes from the dictionary -- composing one here
 * would mint a name the description does not carry. `data-language` beside it
 * is what lets the drawn header be read back against the description, the same
 * attribute `modalElement` writes for `HelpModal.language`.
 *
 * @purity non-pure
 */
function drawLanguageReading(host: Document, entry: HTMLElement, language: DisplayLanguage): void {
  entry.setAttribute('data-language', language)
  const code = made(host, 'span', STYLE.languageCode)
  code.textContent = language
  entry.append(code)
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
  // which this folder may not read (Chapter 5.3, MUST NOT). ⚠️ Having the
  // SHAPES within reach changes nothing about that: `GLYPH_BY_ROW` answers what
  // a row id looks like, and what is missing here is WHICH ROW a kind is --
  // which is the far side's to say, on the description.
  status.setAttribute('data-status', items.autosaveStatus.kind)
  // FR-061 (MUST): the time is shown with the saved state.
  status.textContent = 'at' in items.autosaveStatus ? items.autosaveStatus.at : ''

  const commands = part(host, 'span', ROLE.headerCommands, STYLE.headerCommands)
  for (const item of items.commands) {
    const entry = commandEntry(host, item)
    // FR-038 (MUST): the header is the first of the two entrances, and this is
    // the one entry of table T-109 that has to say which value it is on.
    // ⚠️ AFTER `commandEntry`, never inside it: `fillEntry` replaces the body
    // with the shape, so a code added first would be thrown away.
    if (item.icon === DISPLAY_LANGUAGE_ENTRY) {
      drawLanguageReading(host, entry, items.language)
    }
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
 * ⭐ DRAWN AS A SHAPE, WHICH IS WHAT FR-098 ASKS FOR IN AS MANY WORDS (MUST)
 * for the `Row Pin`, and what FR-029 (MUST) makes figure F-019 the one
 * authority for while forbidding a third party's set (MUST NOT). The shape
 * comes from `icon-glyphs.json` through `fillEntry`, the same way an entry of
 * the header or the palette gets one.
 *
 * ⛔ NO WORD IS INVENTED FOR ONE. Table T-109 deliberately has no English
 * column and the dictionary holds no word for these three rows yet (PD-160), so
 * the row id is the accessible name -- the only join that table admits, and the
 * same fallback `commandEntry` takes.
 *
 * ⛔ WITHOUT A BODY THE CONTROL CANNOT BE PRESSED AT ALL. An empty `button`
 * with no length of its own collapses to zero height, so every entrance drawn
 * here would be unreachable by pointer and by IF-9's third member alike -- which
 * is the supply that table T-065 promises above, made undeliverable by having
 * nothing to hit. ⚠️ That is why the shape carries a box of its own
 * (`glyphStyle`) rather than being left to size itself, and that box is the one
 * every other surface draws in (FR-029, MUST NOT).
 *
 * ⭐ SET DOWN FROM THE TOP OF THE NAME, WHICH IS HF-5 OF TABLE T-051 (MUST).
 * The amount is `RowTitle.controlTopOffsetPx` and arrives per row, because HF-5
 * has it follow THAT row's name size and the sizes S-36 and S-38 give a name do
 * not cross IF-9 -- the same absence `ROW_INDENT_EM` records for the indent.
 * ⛔ A margin and not a padding: what a person aims at is the control HF-6 draws
 * while the pointer is on the row, and padding would grow the target while
 * moving it.
 *
 * STOP -- ⛔ THE SET-DOWN IS IN PROPORTION TO A SIZE THE DRAWN NAME DOES NOT
 * HAVE. HF-5 has the amount follow the name's own size, and it was resolved
 * against S-36 and S-38; but `STYLE.rowLabel` sets no size, so a name is drawn
 * in the environment's text size here. ⚠️ The two are not the same size and
 * nothing makes them so: one follows the reader's machine and the other follows
 * the document. Nothing is invented in place of the missing one -- the seam that
 * withholds the indent (PD-152) withholds this for the same reason.
 *
 * @purity non-pure
 */
function rowControlElement(
  host: Document,
  role: string,
  icon: string,
  topOffsetPx: number,
): HTMLElement {
  const control = part(host, 'button', role, STYLE.rowControl + `margin-top:${topOffsetPx}px;`)
  control.setAttribute('type', 'button')
  control.setAttribute('data-icon', icon)
  control.setAttribute('aria-label', icon)
  fillEntry(host, control, icon)
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

  const label = made(host, 'span', STYLE.rowLabel)
  // ⛔ `null` is a row FR-058 leaves with no name at all -- a document that
  // broke that requirement, or a derivation whose `Task` carries none. Nothing
  // is invented in its place.
  label.textContent = title.label
  row.append(label)

  // ⭐ THE NAME FIRST AND THE THREE CONTROLS AFTER IT, WHICH IS HF-4 OF TABLE
  // T-051 (MUST): 「行の名前の長さにかかわらず、操作子を行見出しパネルの右端に
  // 揃えること」. The name takes the leftover (`STYLE.rowLabel`), so the trio
  // ends at the panel's edge whatever the name is and whatever the row's depth
  // -- the depth is the row's own left padding and moves the name alone.
  //
  // ⚠️ HF-4 FIXES THE EDGE AND NOT THE ORDER, so the order is the
  // specification's own print order and not a choice made here: HF-2 (IC-58)
  // before HF-3 (IC-59) because HF-1 counts the opening control first, and the
  // `Row Pin` after both because FR-098 is where it is written and table T-109
  // prints IC-60 after them.
  //
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
  // and no row says what then. HF-6 of table T-051 governs WHETHER the controls
  // are drawn at all and turns on the POINTER, not on reach; FR-029 asks for
  // faintness of an endpoint that cannot be grabbed, and the palette's answer
  // (`commandEntry`: faint plus `aria-disabled`) is FR-029's `isEnabled` and not
  // this. ⛔ So neither half is dimmed or disabled here and nothing is invented:
  // the two flags are put on the DOM under their own names, and whoever settles
  // the look reads them back.
  if (title.expander !== null) {
    const open = rowControlElement(host, ROLE.rowExpander, 'IC-58', title.controlTopOffsetPx)
    open.setAttribute('data-can-open', String(title.expander.canOpen))
    row.append(open)

    const close = rowControlElement(host, ROLE.rowExpander, 'IC-59', title.controlTopOffsetPx)
    close.setAttribute('data-can-close', String(title.expander.canClose))
    row.append(close)
  }

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
  // ⭐ THE KEY OF THE ROW IT PINS NOW CROSSES THE SEAM, on `ScreenPart.rowGroupId`
  // -- so a press says both which KIND of control it was and WHICH row's, which
  // is what `pinTaskGroup` / `unpinTaskGroup` are keyed by.
  // ⛔ IT IS NOT WRITTEN ON THIS CONTROL. `readScreenPartAt` takes the innermost
  // `data-group-id` on the way up and the row this sits in already carries one,
  // so a copy here would state one row's key in two places.
  const pin = rowControlElement(host, ROLE.rowPin, 'IC-60', title.controlTopOffsetPx)
  pin.setAttribute('data-pinned', String(title.isPinned))
  pin.setAttribute('aria-pressed', String(title.isPinned))
  row.append(pin)
  return row
}

/**
 * The one entrance HF-10 of table T-051 (MUST) puts at the top right of the
 * `Row Title Panel`, which opens every row -- HR-1 of table T-015.
 *
 * ⭐ WHY IT EXISTS AT ALL, IN THE ROW'S OWN WORDS: 「最上位の行が自分を畳むと、
 * それを開く操作子がどこにも無くなる」. HF-3 (MUST) has the closing control fold
 * the row ITSELF, and HF-2's opening control belongs to the row above -- which a
 * top-level row does not have. ⚠️ It moves neither the zoom nor the view
 * position; HF-8's whole-view is a different operation and HF-10 says so.
 *
 * ⭐ ONCE PER PANEL AND NOT ONCE PER ROW, which is why it is built here and not
 * in `rowTitleElement`: IC-58 .. IC-60 are drawn against a row and this one is
 * drawn against the panel, so it carries no `data-group-id` and IF-9 answers it
 * with `rowGroupId: null` -- an operation on every row needs no row named.
 *
 * ⛔ IT CARRIES NO `data-role` OF ITS OWN. Table T-103 has no row for it, and
 * U-23 (MUST) has an entrance for an operation named by the PANEL -- so the walk
 * in `readScreenPartAt` takes `data-icon` from here and `data-role` from the
 * panel it sits in, and answers `{ part: 'Row Title Panel', entry: 'IC-74' }`.
 *
 * ⛔ NO WORD IS INVENTED FOR IT, the same bargain the row controls keep: table
 * T-109 has no English column, the dictionary's cell is empty (PD-160), and the
 * row id is the accessible name until a word crosses the seam.
 *
 * @purity non-pure
 */
function openEveryRowElement(host: Document): HTMLElement {
  const entry = made(host, 'button', entryStyle() + STYLE.panelCornerEntry)
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', OPEN_EVERY_ROW_ENTRY)
  entry.setAttribute('aria-label', OPEN_EVERY_ROW_ENTRY)
  fillEntry(host, entry, OPEN_EVERY_ROW_ENTRY)
  return entry
}

/**
 * The top of the topmost row the panel draws, or `null` when it draws none.
 *
 * ⭐ WHAT IT IS FOR: HF-10 (MUST NOT) forbids the entrance above to overlap the
 * pinned rows' controls, and FR-098 puts the pinned rows at the top of the panel
 * while HF-4 (MUST) holds their controls at its right edge -- so the two want
 * the same corner. ⚠️ The rows arrive placed (`RowTitle.box`), so where they
 * begin is a number this side has, and the band above the first of them is the
 * room the entrance stands in.
 *
 * STOP -- ⛔ THE BAND ITSELF IS NOT ON THE SEAM. `ScreenRegions` records that
 * this panel runs the full height of the canvas and that a corner block sits
 * above the row area, but `ScreenFrame` carries neither that rectangle nor the
 * ruler's height, so the band can only be INFERRED from where the rows were
 * put. Searched: `ScreenView`, `ScreenFrame`, `RowTitlePanel`, `RowTitle` and
 * table T-051. ⭐ Nothing is invented in its place: the inferred band is written
 * on the DOM as `data-corner-band`, so what this unit believed can be read back
 * and held against the description (rule 04).
 *
 * @purity pure
 */
function rowsTopPx(panel: RowTitlePanel): number | null {
  let top: number | null = null
  for (const title of panel.pinnedTitles) {
    if (top === null || title.box.y < top) top = title.box.y
  }
  for (const title of panel.titles) {
    if (top === null || title.box.y < top) top = title.box.y
  }
  return top
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
 * GR-19 of table T-023d -- the band a person grabs to move U-26.
 *
 * ⭐ WHY IT IS DRAWN HERE AND NOWHERE ELSE. `CommandPalette` carries the band's
 * HEIGHT and nothing more, because FR-053 (MUST) makes the palette's size follow
 * its contents: how wide the entries came out is known only where they were laid
 * out, which is this unit, and Chapter 5.3 states under table T-065 (MUST) that
 * the side which drew a part is the side that answers for it. So the height is
 * taken as it arrives -- ⛔ no number is written and none is adjusted -- and the
 * width is nothing at all: a block box inside the palette already spreads to
 * whatever the palette came out as.
 *
 * ⭐ INSIDE THE PART THAT CARRIES THE PALETTE'S ROLE, NEVER BESIDE IT.
 * `PALETTE_FAINT_CSS` reads FR-053's 「ポインタが乗っていないあいだは薄く透明に
 * 描く」 off that very element, so a band drawn as a sibling would leave the
 * palette faint at the one moment a person has hold of it. ⚠️ Drawn inside, the
 * same rule works the other way round: `:hover` matches an ancestor of the node
 * under the pointer, so a pointer on the band IS a pointer on the palette.
 *
 * ⛔ NOT A BUTTON, WHICH TABLE T-109 SAYS OF IC-53 IN AS MANY WORDS
 * (「掴んで動かせることを示す。ボタンではない」). So it is a plain box: UF-65 keeps
 * the row out of `CommandPalette.groups` and this side mints no entry for it
 * either. `data-icon` is what lets it be reached all the same -- the walk in
 * `readScreenPartAt` takes the innermost `data-icon` and the OUTERMOST
 * `data-role`, so a point on the band answers `{ part: 'Command Palette', entry:
 * 'IC-53' }` without this band having to be a part or an entry, and the press
 * `input-command-translator.ts` assigns to that row has somewhere to arrive.
 * ⚠️ GR-19's 「帯の下に何が描かれていても帯が勝つ」 needs nothing more here: the
 * palette floats over the schedule, and the topmost drawn node at a point is
 * what `elementFromPoint` already answers with.
 *
 * ⭐ HOW IT READS AS GRABBABLE, WHICH IS THE 「示す」 HALF OF THE ROW. Two
 * answers, both of them the specification's own or the environment's:
 *   - THE SHAPE. FR-029 (MUST) has this product say what something is for with
 *     an icon rather than with a word and makes figure F-019 the one authority
 *     for it (MUST NOT for a third party's set), and that figure draws IC-53.
 *     It arrives through `fillEntry`, the same road every other shape takes, and
 *     is centred because a band is wider than a shape and no row says where in
 *     it the shape stands.
 *   - THE CURSOR (`STYLE.paletteGrabBand`), which is the environment's own way
 *     of saying 掴める and the same road the other draggable band takes.
 *   - ⛔ AND NOTHING ELSE: the STOP note on that style says what the
 *     specification does not decide, and why no paint is invented in its place.
 *
 * ⛔ THE BAND HAS NO ACCESSIBLE NAME, AND WHAT IS MISSING IS ON THE SEAM RATHER
 * THAN IN THE SPECIFICATION. `CommandItem.label` is how a word reaches a drawn
 * row of table T-109, and the band is not a `CommandItem` -- `CommandPalette`
 * carries the height and no word, so there is nothing here to name it with. ⛔ A
 * word is NOT invented: the shape is hidden from the accessibility tree by
 * `fillEntry` like every other shape, so the band is a silent box to a reader
 * who cannot see it, and FR-053's drag is out of that reader's reach.
 * ⚠️ The dictionary DOES hold a word for IC-53, so what is owed is a member on
 * `CommandPalette` to carry it across IF-9, not a ruling. Searched: FR-053,
 * FR-029, GR-19 of table T-023d, table T-109 and `CommandPalette`.
 *
 * @purity non-pure
 */
function grabBandElement(host: Document, heightPx: number): HTMLElement {
  const band = made(host, 'div', STYLE.paletteGrabBand + `height:${heightPx}px;`)
  band.setAttribute('data-icon', PALETTE_GRAB_BAND_ENTRY)
  fillEntry(host, band, PALETTE_GRAB_BAND_ENTRY)
  return band
}

/**
 * U-26 `Command Palette` (UF-65).
 *
 * ⭐ PLACED AND NOT SIZED. The description carries a corner and no extent,
 * because FR-053 (MUST) has the size follow the contents and (MUST NOT) keeps
 * any table from holding one -- so `cornerStyle` writes where it stands and the
 * entries below decide how big it comes out. ⛔ No number is added on the way.
 *
 * ⭐ TWO CHILDREN AND IN THIS ORDER. The band GR-19 of table T-023d lays along
 * the top edge comes first because that is where the row puts it, and the
 * entries follow inside the box that carries the room the palette itself no
 * longer has -- `grabBandElement` says why the band cannot be a sibling.
 *
 * ⚠️ FR-053 also draws it faintly while the pointer is off it, and ⛔ nothing
 * here says whether it is: that MUST is judged on which PART the pointer is on,
 * which is `PALETTE_FAINT_CSS` -- see its note for why the answer is the
 * environment's and not a member of the description. It is also ⛔ not a
 * selection: table T-023c's SL-1 does not admit the palette, so there would be
 * no state to clear.
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
    cornerStyle(palette.at) + STYLE.commandPalette,
  )
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

  // GR-19 of table T-023d, FIRST because the band is the palette's top edge and
  // FIRST because that row stands first in its table -- see `grabBandElement`.
  // ⚠️ Drawn on every frame the palette is, and on no condition of its own: the
  // row states a place and not a state, so `CommandPalette` carries the height
  // whenever it carries anything at all.
  const band = grabBandElement(host, palette.grabBandHeight)
  // EZ-2 of table T-040 (MUST) shows THAT icon's explanation, and IC-53 is now a
  // row the pointer can rest on -- `readScreenPartAt` answers it, so PD-141
  // reports it and a tooltip raised for it has to be placed against the node it
  // was drawn on, exactly as an entry's is.
  anchors.set(anchorKey({ kind: 'icon', icon: PALETTE_GRAB_BAND_ENTRY }), band)

  // The room that used to be the palette's own padding, one box further in, so
  // that the band above reaches the palette's edges (`STYLE.paletteContents`).
  const contents = made(host, 'div', STYLE.paletteContents)
  contents.replaceChildren(...groups, armed)

  drawn.replaceChildren(band, contents)
  return drawn
}

/**
 * IC-67 / IC-68 of table T-109 -- the entrance FR-099 draws against ONE person
 * in U-49, which is the only entrance of that surface that is not drawn once in
 * its header.
 *
 * ⛔ UNTIL THIS EXISTED THE TWO ROWS WERE ON NO ELEMENT AT ALL, so a press on a
 * person could not be reported: `readScreenPartAt` answers `entry` out of
 * `data-icon`, the roster's line carried the person's key and no icon, and the
 * one entrance table T-109 gives a person had nowhere to arrive.
 *
 * ⭐ ONE ENTRANCE AND NOT TWO. Both rows are written 「同じ入口で」, so which of
 * the two a person is looking at is `RosterResource.isSelected` and never both
 * at once -- and the STATE is told by WHICH row is drawn, which is the half of
 * each row that begins 「選ばれていることを示し」. ⛔ So no second mark is
 * invented for the state and no `aria-pressed` is set: the shape figure F-019
 * draws for the row differs, and the row id is the accessible name.
 *
 * ⭐ THE ROW ID IS THAT NAME, the same fallback `rowControlElement` takes and for
 * the same reason: an entrance drawn once per person is reached by no
 * `CommandItem`, so no word of the dictionary reaches it either (PD-160).
 *
 * ⛔ NOT DECIDED BY THE SPECIFICATION: where on the line it stands. HF-4 of
 * table T-051 fixes the edge for the row title controls and reaches nothing on
 * U-49, and FR-099 says nothing of placement -- so it is appended after the
 * name, in the line's own order, and no alignment is invented.
 *
 * ⚠️ THE PERSON IS NOT WRITTEN ON IT. The walk takes the innermost `data-uid`
 * on the way up and the line already carries one, so a copy here would state
 * one person's key in two places.
 *
 * @purity non-pure
 */
function rosterSelectionEntry(host: Document, isSelected: boolean): HTMLElement {
  const icon = isSelected ? ROSTER_CHOSEN_ENTRY : ROSTER_UNCHOSEN_ENTRY
  const entry = made(host, 'button', entryStyle())
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', icon)
  entry.setAttribute('aria-label', icon)
  fillEntry(host, entry, icon)
  return entry
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
 * T-103's settled spellings or the UID of the requirement that opens it
 * (FR-074, FR-088) -- both are the specification's own joins, and no name is
 * minted here for the two it has not named.
 * ⛔ AND IT IS NOT KEBAB-CASED ON THE WAY. `W-4` of table T-006a sends a
 * `data-role` that carries a UI part's settled name to `W-6` instead, in as many
 * words, because translating one would give the same thing a second spelling.
 * So the name arrives from `ScreenState.surface` (S-99g) and is written down
 * unchanged.
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
    // pressed. ⚠️ This is the SECOND of the two entrances -- the header's own
    // entry (IC-21) now draws the same reading beside its shape, out of
    // `AppHeaderItems.language`, so neither half of that MUST rests on a label
    // (every cell of the dictionary is still empty, PD-160).
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

  if ('formats' in modal) {
    // FR-096 (MUST): the author picks one of the rows table T-024 gives an out
    // direction, and U-54 is the surface that asks.
    //
    // ⛔ THESE ARE NOT ENTRIES OF TABLE T-109 AND MAY NOT BE DRAWN AS ONES. The
    // same requirement allows the whole act one entrance (MUST) and forbids one
    // per format (MUST NOT) -- IC-3 is that entrance, and it is what OPENED this
    // surface. So a choice here carries no row of table T-109, no shape of
    // figure F-019 and no `data-icon`; drawing one would be the second entrance
    // that MUST NOT forbids.
    //
    // ⛔ THE NAME FR-096 (MUST) HAS THIS SURFACE PROPOSE IS NOT DRAWN HERE,
    // because the description carries none: no member of `OpenModal` holds it,
    // and table T-024 leaves most of these rows without the extension one would
    // be built from. ⛔ Nothing is composed in its place -- what the platform's
    // own picker is handed is the shell's, and a second proposal drawn here
    // would be a second answer to the same MUST.
    const choices = made(host, 'div', STYLE.formatChoices)
    for (const format of modal.formats) {
      // ⛔ NOT DECIDED BY THE SPECIFICATION: nothing says how a format is marked
      // in the page. What IS settled is that a format is carried by its row id
      // and by nothing else -- table T-024 has no English column -- so the row
      // id is the marking, which is the same bargain `data-icon` keeps for an
      // entry of table T-109 and `exchange-formats.json` for a format.
      //
      // ⛔ AND THE DICTIONARY HAS NO WORD FOR ONE. FR-038 (MUST) keeps every
      // word of the screen in the one generated dictionary, which holds no group
      // for these, so the row id is the body and the accessible name alike --
      // the same fallback `commandEntry` takes for a cell PD-160 left empty.
      // ⛔ The format column of table T-024 is NOT read in its place: that
      // column is the manuscript's own wording, in one language, and printing it
      // would be the second store of translated words FR-038 forbids (MUST NOT).
      //
      // ⚠️ Painted as an entry is painted, because this unit paints everything
      // that can be pressed that way (R4) -- it is not a claim that this is one.
      const choice = made(host, 'button', entryStyle())
      choice.setAttribute('type', 'button')
      choice.setAttribute('data-format', format)
      choice.setAttribute('aria-label', format)
      choice.textContent = format
      choices.append(choice)
    }
    body.push(choices)
  }

  if ('resources' in modal) {
    for (const resource of modal.resources) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-uid', String(resource.uid))
      line.setAttribute('data-referenced', String(resource.isReferenced))
      line.setAttribute('data-selected', String(resource.isSelected))
      const name = made(host, 'span', STYLE.fieldName)
      name.textContent = resource.name
      line.append(name, rosterSelectionEntry(host, resource.isSelected))
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
 * U-55 `Confirmation` (UF-67), the question NT-7 of table T-037 puts before
 * something goes ahead.
 *
 * ⭐ MODELLED ON THE OPEN SURFACE AND NOT ON A NOTICE. NT-7 (MUST) has the
 * person CHOOSE between going on and calling it off, so this one stops until it
 * is answered, while a notice is told and read past -- which is also why it
 * takes the pointer and a notice's box only happens to.
 *
 * ⛔ THE NAMES ARE ONE ELEMENT EACH AND ARE NEVER JOINED INTO ONE STRING, the
 * same reasoning `modalElement` writes for FR-099's unassigned task names: a
 * `Task` that carries no name of its own (AT-27) would be lost between two
 * separators, and losing it turns the list back into a count -- which FR-032 and
 * FR-099 each forbid in as many words (MUST NOT).
 *
 * ⭐ FR-032's MARK IS A WORD AND IT IS DRAWN. A `Task` that goes with the row
 * being deleted but is drawn on ANOTHER row -- HM-10 of table T-015a is what
 * puts it there -- has to be shown as such (MUST), and PD-175 settled that the
 * showing is a word. ⛔ No shape is raised for it: table T-109 is the whole of
 * the icons (FR-029 MUST) and RC-13 of table T-026 keeps a new one the user's
 * decision. The word itself is UF-67's, read out of the one dictionary FR-038
 * names, so nothing here writes one in either language.
 *
 * @purity non-pure
 */
function confirmationElement(
  host: Document,
  confirmation: Confirmation,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const drawn = part(host, 'div', ROLE.confirmation, STYLE.confirmation)
  // ⚠️ `alertdialog` and not `dialog`: it is the one this description matches --
  // a question that stops the reading until it is answered.
  drawn.setAttribute('role', 'alertdialog')
  drawn.setAttribute('aria-modal', 'true')
  // The join to table T-037, carried the way a notice carries its own.
  drawn.setAttribute('data-manner', confirmation.manner)

  // NT-7 (MUST): what is about to happen, in words. It arrives already in the
  // display language -- only the asker knows what it names.
  const text = made(host, 'div', '')
  text.textContent = confirmation.text

  const items = confirmation.items.map((item) => {
    const line = made(host, 'div', STYLE.confirmationItem)
    line.setAttribute('data-unnamed', String(item.name === null))
    // ⛔ THE ATTRIBUTE IS NOT WHAT TELLS THE PERSON -- no reader can see one, the
    // same reason `noticeElement` gives for NT-3's count. It is kept BESIDE the
    // word for the read-back rule 04 asks for after anything that draws.
    line.setAttribute('data-shown-on-another-row', String(item.isShownOnAnotherRow))
    // ⚠️ Set before the mark is appended, not after: the setter replaces every
    // child, so the other order would drop the mark it had just been given.
    line.textContent = item.name
    if (item.isShownOnAnotherRow) {
      // FR-032 (MUST). ⛔ Its own element rather than joined onto the name, for
      // the reason the names are one element each: a `Task` with no name of its
      // own (AT-27) would otherwise show the mark as though it were the name.
      const mark = made(host, 'span', STYLE.confirmationMark)
      mark.textContent = confirmation.shownOnAnotherRowMark
      line.append(mark)
    }
    return line
  })

  // IC-69 and IC-70 of table T-109, in that table's own order, which UF-67 read
  // out of the generated roster. ⛔ Neither is spent and neither is a toggle:
  // NT-7 makes the choice between the two the whole of this surface.
  const answers = made(host, 'div', STYLE.confirmationAnswers)
  for (const item of confirmation.entries) {
    const entry = commandEntry(host, item)
    anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
    answers.append(entry)
  }

  drawn.replaceChildren(text, ...items, answers)
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
  /**
   * The document the nodes are made in.
   *
   * ⛔ Only `createElement`, `createElementNS` and `elementFromPoint` are called
   * on it, and each is there because nothing else can do its job:
   * `createElementNS` because FR-029's shapes are SVG and an element made
   * outside that namespace draws nothing, and `elementFromPoint` because IF-9
   * of table T-065 has the side that DREW an entrance answer where it is.
   * ⚠️ Both are asked for rather than assumed, so a host that lays nothing out
   * still works (`shapeNode`, `readScreenPartAt`).
   */
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
  /**
   * FR-041 (MUST): which of table T-236's two renderings to paint in, and the
   * hue the rows that follow the theme are solved with.
   *
   * ⭐ READ EACH FRAME AND NEVER TAKEN ONCE, like `readAuthor`: IC-16 switches
   * S-72 while the document is open, so a value taken at wiring time would be
   * the one the document was opened with for ever. ⚠️ It IS also read once while
   * this factory runs, because the header is built and measured there and a box
   * that has never been painted would be painted for the first time one frame
   * later.
   *
   * ⛔ REQUIRED, AND THE OPTIONALITY IS WHAT THE DEFECT WAS. Neither S-72 nor
   * S-73 crosses IF-9 -- `ScreenView`, `ScreenFrame` and `AppHeaderItems` carry
   * no member for either, and UF-62 states in as many words that IC-16's
   * `isPressed` cannot report a choice between two values -- so while this
   * member could be left out, every `var()` in the file kept a system colour
   * behind it and a reader who chose dark stayed light. ⭐ Requiring it is what
   * lets those fallbacks go: FR-041 (MUST NOT) forbids the environment to decide
   * the theme, and a surface that can be built without the theme has no other
   * answer to give.
   *
   * ⭐ THE CALLER ALREADY HOLDS BOTH VALUES. `documentSettings.themePreference`
   * and `schedule.project.themeHue` are what the shell reads at the head of
   * every frame for `ScreenSession`; this member takes the same pair. ⚠️ The
   * session is NOT a way in -- it is ScreenRenderer's argument, and what comes
   * back across IF-9 is `ScreenView`. Searched: FR-041, S-72 / S-73,
   * `ScreenView`, `ScreenFrame`, `AppHeaderItems`, `ScreenSession`, table T-064.
   *
   * ⚠️ MAKING IT REQUIRED BREAKS EVERY CALLER UNTIL EACH ADDS ONE LINE, and the
   * compiler names them rather than leaving it to be found. ⛔ That is the
   * cheaper of the two failures: the other one is a screen whose chrome has no
   * colour at all, shipped quietly, because a `var()` with nothing behind it
   * resolves to `unset` and a background then falls to `transparent`.
   */
  readonly readTheme: () => ScreenTheme
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
  const { host, readAuthor, readClockMs, onAppHeaderHeightPx, readTheme } = wiring

  // ⛔ LY-5 of table T-060 puts these here because there is nowhere further in
  // they are allowed: the tree that has been built, what has been drawn into
  // it, what the person settled, and what they dismissed.
  // FR-041 (MUST), from the first moment there is a root to carry it: the
  // header is built and measured inside this factory, so a theme written only
  // on the first frame would leave that one box unpainted until then.
  const root = made(host, 'div', STYLE.root + themeStyle(readTheme()))
  // ⚠️ Not a name for a part: table T-103 has no row for the whole screen, so
  // the root carries the unit's own row of table T-075 instead of a minted one.
  // ⭐ It is also what scopes `HOVER_CSS` to this tree.
  root.setAttribute('data-unit', UNIT_ROW)

  // HF-6's 「乗っているあいだだけ描く」 and the faint half of FR-053, neither of
  // which an inline declaration can state. ⭐ Hung off the root so that it lives and dies
  // with the tree this unit built, and it is never rewritten: neither rule
  // depends on any description.
  const hoverSheet = host.createElement('style')
  hoverSheet.textContent = HOVER_CSS

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
  // ⛔ NOT itself a part: the `data-role` U-55 answers to is written on the
  // surface this layer holds, so that a point on the layer's own emptiness is
  // answered as nothing rather than as the confirmation.
  const confirmationLayer = made(host, 'div', STYLE.layer)
  const tooltipLayer = part(host, 'div', ROLE.tooltips, STYLE.layer)

  // HF-10 of table T-051 (MUST): one entrance, and it lives as long as the panel
  // does. ⛔ Built once and never rebuilt -- it takes nothing from a description,
  // so rebuilding it with the tree would throw away the browser's work on it for
  // no gain, and it would leave the panel for a frame in which the tree changed.
  const openEveryRow = openEveryRowElement(host)
  rowTitlePanel.append(openEveryRow)

  dialogueEntry.setAttribute('type', 'text')
  dialogueEntry.setAttribute('style', STYLE.dialogueEntry)
  dialogueField.append(dialogueMessages, dialogueEntry)

  // The order is the stacking order: the frame and the panels first, the header
  // over them, and what is meant to be read over everything last. ⚠️ The
  // tooltip layer is last because IN-3 lets a person point at a tooltip, which
  // it cannot do through something drawn on top of it. ⛔ The confirmation is
  // second to last, ABOVE the notices and BELOW the tooltips: a notice lying
  // over the two answers would take away the choice NT-7 (MUST) requires, and
  // covering a tooltip would take away what IN-3 lets a person point at.
  // ⭐ The sheet is not in that order at all -- it has no box and paints nothing
  // of its own.
  root.append(
    hoverSheet,
    frameLayer,
    rowTitlePanel,
    rowTitleTree,
    propertiesPanel,
    paletteLayer,
    dialogueField,
    appHeader,
    modalLayer,
    noticeLayer,
    confirmationLayer,
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
      confirmation: described(view.confirmation),
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
      // HF-10 (MUST NOT): the entrance may not overlap the pinned rows' controls,
      // and the band above the topmost row is where it does not. ⚠️ Recorded and
      // not enforced: the entrance stays where HF-10 (MUST) puts it, and this
      // says how much room was there -- `rowsTopPx` holds why the band cannot be
      // asked for outright. ⛔ Absent when the panel draws no row, because then
      // there is nothing for it to overlap and no first row to measure from.
      const rowsTop = rowsTopPx(view.rowTitlePanel)
      if (rowsTop === null) openEveryRow.removeAttribute('data-corner-band')
      else openEveryRow.setAttribute('data-corner-band', String(rowsTop - headerHeightPx))
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
    if (changed('confirmation')) {
      const asked = view.confirmation
      const anchors = anchorsOf('confirmation')
      confirmationLayer.replaceChildren(
        ...(asked === null ? [] : [confirmationElement(host, asked, anchors)]),
      )
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

    // The nine above may have moved what a tooltip is anchored to, so the
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
    // FR-041 (MUST), both halves, on the one element every part of this unit
    // hangs off. ⛔ Written with the root's own placement and not on a second
    // element: a custom property is inherited, so one declaration reaches every
    // part, and `color-scheme` reaches the scrollbars the environment paints
    // inside them. ⚠️ Read again here and not carried over from the factory:
    // IC-16 switches S-72 while the document is open.
    root.setAttribute('style', STYLE.rootShown + themeStyle(readTheme()))

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
   * ⭐ THE FORMAT IS THE THIRD THING READ BACK, AND IT IS NOT AN ENTRY. FR-096
   * (MUST NOT) forbids a second entrance per format, so a choice on U-54 has no
   * row of table T-109 to be answered as -- it carries a row of table T-024, and
   * that is what leaves here. ⚠️ The two never stand on one element, so a press
   * settles at most one of them; the surface still comes back on both, because a
   * point on this surface is a point table T-023a's decision order may not
   * reach.
   *
   * ⭐ THE ROW AND THE PERSON ARE READ ON THE SAME WALK, and that is R7.4 rather
   * than thrift: the reading is finished before the deciding starts, so one
   * element chain is inspected once and every member of the answer comes out of
   * it. ⛔ A second query would ask a screen that had had time to move, and the
   * two answers would then be about different frames. ⚠️ Neither is an entry:
   * the row of the `Row Title Panel` and the roster's line each carry the key
   * and no `data-icon`, and it is the entrances INSIDE them (IC-58 .. IC-60,
   * IC-67 / IC-68) that carry the row of table T-109.
   *
   * @purity semi-pure-b
   */
  function readScreenPartAt(x: number, y: number): ScreenPart | null {
    const ask = (host as Partial<Document>).elementFromPoint
    if (typeof ask !== 'function') return null

    let node: Element | null = ask.call(host, x, y)
    let entry: string | null = null
    let format: string | null = null
    let group: string | null = null
    let uid: string | null = null
    let part: string | null = null
    // ⭐ The innermost `data-icon`, `data-format`, `data-group-id` and
    // `data-uid`, and the OUTERMOST `data-role`: an entry sits inside its part,
    // and table T-109's surface column names the containing surface rather than
    // the grouping inside it (U-34 / U-35). So the four are each taken once and
    // the role keeps being replaced on the way up.
    // ⚠️ INNERMOST FOR THE KEYS TOO, and not merely by symmetry: a row of the
    // `Row Title Panel` is drawn inside the panel and a roster line inside the
    // surface, so the nearest one on the way up is the one the point is on. A
    // key taken from further out would name whatever container happened to
    // carry one.
    while (node !== null && node !== root) {
      const icon = node.getAttribute('data-icon')
      if (icon !== null && entry === null) entry = icon
      const chosen = node.getAttribute('data-format')
      if (chosen !== null && format === null) format = chosen
      const groupId = node.getAttribute('data-group-id')
      if (groupId !== null && group === null) group = groupId
      const resource = node.getAttribute('data-uid')
      if (resource !== null && uid === null) uid = resource
      const role = node.getAttribute('data-role')
      if (role !== null) part = role
      node = node.parentElement
    }
    // The walk ran off the top instead of reaching the root, so the point is on
    // something this unit did not draw -- the schedule, or the page around it.
    if (node !== root || part === null) return null
    // U-23 (MUST): an entrance for an operation is named by the panel, not by
    // the tree inside it. Table T-109 puts IC-58 .. IC-60 on the panel too.
    // ⚠️ `Resource.uid` (AT-85) is a number and an attribute is text, so the one
    // conversion on this seam happens here rather than on the reading side --
    // the side that WROTE the attribute is the side that knows what it wrote
    // (`String(resource.uid)` in `modalElement`).
    return {
      part: part === ROLE.rowTitleTree ? ROLE.rowTitlePanel : part,
      entry,
      format,
      rowGroupId: group,
      resourceUid: uid === null ? null : Number(uid),
    }
  }

  // BO-1: settled before the first frame, and before this factory returns.
  reportHeaderHeight()

  return { showScreenView, readDialogueInput, readScreenPartAt }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (tables T-206 and T-236)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them,
 * and the export draws no entrance at all (EP-1 and EP-4 of table
 * T-076), so a reader handed this document sees the same picture
 * whatever this value is.
 */
export const NOT_STORED_ICON_SIZES: {
  /** S-138, in px */
  readonly 'S-138': number
  /** S-141, in px */
  readonly 'S-141': number
} = {
  'S-138': 12,
  'S-141': 2,
}

/**
 * The colours of table T-236, by row ID, in both renderings.
 *
 * ⭐ Table T-236 holds constants baked into the artifact. FR-041 (MUST
 * NOT) forbids saving a derived colour, so none of these is a document
 * setting and none may become one.
 *
 * ⛔ `H` IN A HUE IS NOT A TYPO. Where `followsHue` is true the row
 * follows themeHue (S-73), and the manuscript writes the letter so that
 * S-73's value is stated once rather than copied into every row. Solve it
 * by putting the hue in before use. A row with `followsHue` false states
 * its own hue and is used exactly as written -- the dependency and
 * progress lines are the two of those (FR-041).
 */
export const SCREEN_COLOURS: {
  readonly [rowId: string]: {
    readonly light: string
    readonly dark: string
    readonly followsHue: boolean
  }
} = {
  /* S-146 */
  'S-146': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  /* S-147 */
  'S-147': { light: '#16181d', dark: '#e8eaee', followsHue: false },
  /* S-148 */
  'S-148': { light: '#5b6068', dark: '#9aa1ab', followsHue: false },
  /* S-149 */
  'S-149': { light: 'hsl(H 14% 87%)', dark: 'hsl(H 12% 23%)', followsHue: true },
  /* S-150 */
  'S-150': { light: 'hsl(H 20% 97%)', dark: 'hsl(H 14% 13%)', followsHue: true },
  /* S-152 */
  'S-152': { light: '#1f7a3d', dark: '#6fc98d', followsHue: false },
  /* S-153 */
  'S-153': { light: '#a8600f', dark: '#e0a353', followsHue: false },
  /* S-154 */
  'S-154': { light: '#a02b2b', dark: '#e07a7a', followsHue: false },
  /* S-170 */
  'S-170': { light: 'rgba(0,0,0,0.28)', dark: 'rgba(0,0,0,0.6)', followsHue: false },
}
// </generated>
