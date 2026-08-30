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
// a frame on a trigger table T-078 does not name (MUST NOT). FOUR listeners are
// registered below and not one of them schedules anything:
//
//   - `keydown` on the dialogue entry only REMEMBERS that the person settled a
//     line. The frame that carries it away is FT-1's: the same press reaches
//     DomInputSource on the window.
//   - `change` on the properties panel only REMEMBERS the value a person
//     settled in one of its controls, which is IF-9's return direction. ⭐ The
//     same bargain: the blur or the Enter that raised it IS a happening that
//     reaches DomInputSource, and the shell collects the commit on that frame.
//     ⛔ `change` and not `input`, because FR-031 (with UN-3 of table T-027)
//     makes one property change ONE step of the undo history.
//   - `focusin` / `focusout` on the same panel only REMEMBER whether a person
//     has hold of one of its controls, so that a redraw does not sweep away
//     what is half typed. ⚠️ They are watched rather than read off
//     `document.activeElement` because `ScreenSurfaceWiring` says only
//     `createElement` is called on the host.
//
// ⚠️ There WAS a second, on the control that put a tooltip away, and it is gone
// with that control -- `tooltipElement` carries the STOP that says why, and
// where IN-3's 「消せること」 belongs now.
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
//     `data-role` / `data-icon` / `data-format` / `data-group-id` / `data-uid` /
//     `data-panel` are what it walks: the entry a point is on, the format choice
//     a point is on, the row and the person it is on, the panel a press on a
//     boundary would resize (FR-052), and the part they were all drawn in.
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
//   - ⚠️ `data-notice` IS NOT A FOURTH SPELLING OF IT EITHER, and for the same
//     reason: NT-8 of table T-037 (MUST) has a person put a telling away where
//     it stands, CR-259 settled that its entrance is a WORD and gets no row of
//     table T-109, so what a press there says is WHICH telling
//     (`Notice.dismissKey`) and not which entry. ⛔ THE WALK DOES NOT READ IT
//     BACK YET -- `ScreenPart` holds a member for each of the five above and
//     none for this one, and that declaration is `screen-surface.ts`'s. The
//     entrance is drawn and marked all the same, because the alternative is a
//     MUST with no entrance at all; `frame-loop.ts` is where the press is spent.
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
//   - THE GROUND (S-146) IS NOT PAINTED ON THIS UNIT'S OWN ROOT, AND THAT IS
//     GEOMETRY RATHER THAN A DECLINING. This root is `position:fixed` over the
//     whole viewport and the schedule is drawn by another surface UNDERNEATH
//     it, so a background here would hide the schedule.
//     ⭐ THE GROUND BELONGS ON THE PAGE ELEMENT -- the shell's own
//     `documentElement` -- which is the one box behind the schedule rather than
//     over it. This unit paints S-146 on every ground it does own (the header,
//     the notices, the tooltips, the dialogue field, the surfaces that stop the
//     reading), writes the property so the value is stated once and inherits
//     down, and tells the environment the `color-scheme`.
//     ⭐ AND IT RESOLVES THE PAGE'S GROUND FOR THE ONE UNIT THAT MAY WRITE IT:
//     `pageGroundStyle` below is exported for SingleHtmlShell, so the row and
//     the rendering are read in ONE place while the element is written by the
//     party that owns it. ⛔ It was painted by nobody until 2026-08-25 -- no
//     file in `src/` wrote a background on `documentElement` or on `body` --
//     and FR-041 makes painting it a MUST.
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
//     table T-236, or FR-029's faint S-149), with no rule of its own.
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
  FieldCommit,
  Notice,
  OpenModal,
  PropertiesPanel,
  PropertyControl,
  PropertyControlKind,
  PropertyField,
  PropertyFieldKey,
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
  fileStatus: 'File Status',
  openedFileName: 'Opened File Name',
  fileSavedAt: 'File Saved At',
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

/**
 * IC-78 of table T-109 -- the entrance HF-12 of table T-051 (MUST) puts beside
 * IC-74, which folds every row (HR-2 of table T-015).
 *
 * ⭐ HF-12 TAKES HF-10'S PLACEMENT RATHER THAN STATING ITS OWN, so everything
 * said of `OPEN_EVERY_ROW_ENTRY` above holds of this one word for word: one per
 * panel, carried by row id, and drawn against the panel rather than a row.
 * ⛔ IT IS NOT HF-8. That row DISCARDS the folds a person made, as part of the
 * whole-view (FR-055); this one makes them, and moves neither the zoom nor the
 * viewport.
 */
const COLLAPSE_EVERY_ROW_ENTRY = 'IC-78'

/**
 * IC-92 of table T-109 -- the entrance HF-16 of table T-051 (MUST) puts in the
 * same lineup as IC-74: 「最も浅い段を 1 階層だけ開く」, which is HR-7 of table
 * T-015 pressed at 段 0.
 *
 * ⭐ IT IS THE WAY BACK FROM TWO THINGS, and both rows name it: HR-2 (「`HR-7`
 * を頭で押せば最も浅い段が戻る」) and HR-6 (「親を持たない最上位の行は、段 0 の
 * 同じ操作子で戻せること」).
 * ⛔ NOT IC-74 UNDER A SECOND NAME (HF-16, MUST NOT): 「`HF-10`（すべて開く）に
 * 兼ねさせてはならない」.
 */
const OPEN_LEVEL_ZERO_ENTRY = 'IC-92'

/**
 * IC-93 of table T-109 -- HF-17 of table T-051 (MUST): 「最も浅い段へ行を 1 つ
 * 足す」, which is HR-8 pressed at 段 0.
 *
 * ⭐⭐ WITHOUT IT A DOCUMENT WITH NO ROWS CAN NEVER GET ONE, which is that row's
 * own reason: HR-8 adds 「配下に」 and 「行が 1 つも無い文書では押す相手が存在
 * しない」, while FR-085 requires a top-level row to be creatable.
 * ⚠️ THE NAME IS TYPED IN PLACE, exactly as IC-91's is -- 「名前の扱いは `HF-14`
 * に従う」 -- so this entrance opens the same field.
 */
const ADD_TOP_ROW_ENTRY = 'IC-93'

/**
 * IC-82 of table T-109 -- FR-032's deletion, drawn once per ROW on the
 * `Row Title Panel`.
 *
 * ⛔ IT CARRIES NO `data-role`, and that is `OPEN_EVERY_ROW_ENTRY`'s reason
 * rather than a shortcut: table T-103 names a part for the expander (U-47) and
 * for the pin (U-48) and names none for this one, so nothing may be invented
 * here -- `readScreenPartAt` takes the OUTERMOST `data-role` in any case, so
 * the answer is `{ part: 'Row Title Panel', entry: 'IC-82' }` either way, and
 * the row's own `data-group-id` says which row it stands on.
 * ⚠️ WHICH IS WHY THE RULE BELOW REACHES IT BY `data-icon`. HF-6 of table T-051
 * draws the row's controls only while the pointer is on the row, and this one
 * has to obey that for a reason of its own: `S-140` reserves no room at all, so
 * a control drawn at rest would sit over the row's name for ever.
 * ⚠️ HF-6 IS TABLE T-051'S, AND THAT TABLE IS THE FOLDING FACE -- deleting is
 * not folding, so this is the pin's precedent (FR-098 has no such row either)
 * carried one step further. @provisional PD-353
 */
const DELETE_ROW_ENTRY = 'IC-82'

/**
 * IC-91 -- HF-14 of table T-051 (MUST): 「配下に行を足す操作子を、行ごとに 1 つ
 * 置くこと」, which is HR-8 of table T-015.
 *
 * ⭐ NAMED BESIDE `DELETE_ROW_ENTRY` BECAUSE IT IS THE SAME KIND OF ENTRANCE,
 * and HF-14 says so in its own last sentence: 「枠の有無で分ける先例は `IC-52`
 * と `IC-82` が既に持っている」. Table T-103 names no part for it either -- it
 * MAKES a row rather than folding one -- so the rule below reaches it by
 * `data-icon`, exactly as it reaches IC-82.
 * ⛔ NOT IC-74's BARE `＋`. HF-14 (MUST NOT) refuses that shape here and the
 * figure gives this one a frame; the shapes are figure F-019's and nothing is
 * chosen in this file.
 */
const ADD_CHILD_ROW_ENTRY = 'IC-91'

/**
 * IC-90 -- HF-13 of table T-051 (MUST): 「1 階層だけ開く操作子を、行ごとに 1 つ
 * 置くこと」, which is HR-7 of table T-015.
 *
 * ⭐ IT IS PART OF U-47 `Row Expander` AND SO NEEDS NO RULE OF ITS OWN: it
 * carries that part's `data-role`, and HF-6's rule above reaches it with the
 * three HF-1 counts. ⛔ WHAT IT DOES NOT SHARE IS WHEN IT IS DRAWN -- HF-13
 * places it 「行ごとに」 without HF-1's condition, so it stands on a leaf row
 * where those three do not, drawn faint (FR-029).
 */
const OPEN_ONE_LEVEL_ENTRY = 'IC-90'

/**
 * What the entrance NT-8 of table T-037 (MUST) requires carries the telling it
 * puts away -- `Notice.dismissKey`.
 *
 * ⛔ NOT `data-icon`, AND FOR THE REASON `data-format` IS NOT EITHER. That
 * attribute carries a row of table T-109, FR-029 (MUST) makes that table the
 * whole of the icons, and CR-259 settled that NT-8's entrance gets NO row of it
 * -- it is a word, exactly as NT-7's two answers are answered in words. So this
 * entrance is not a row of that table and cannot travel as one: a reading side
 * handed both on one attribute could not say which table it had been given.
 *
 * ⛔ NOR IS IT `data-group-id`, `data-uid` OR `data-panel`. Each of those names
 * a thing of the person's document or of the frame; this names one telling in
 * `ScreenView.notices`, which is neither.
 *
 * ⚠️ THE WALK IN `readScreenPartAt` DOES NOT YET CARRY IT ACROSS, and it cannot
 * from inside this unit: `ScreenPart` is declared in
 * `src/adapter/screen-renderer/screen-surface.ts` and has a member for each of
 * the five attributes the walk reads. ⛔ So this is drawn and answerable, and
 * the loop is closed by two files that are not this one -- that declaration
 * gains the sixth member, and `src/framework/single-html-shell/frame-loop.ts`
 * spends it by taking the named notices off `raisedNotices`, which is the list
 * its own STOP note records as one nothing shortens.
 */
const NOTICE_DISMISS_KEY_ATTRIBUTE = 'data-notice'

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
 * draws -- no part of it reports a SCHEDULE'S state, and NT-1 (MUST NOT)
 * forbids colour alone from carrying a meaning.
 * ⚠️ WHAT USED TO STAND HERE SAID NOTHING ON THIS SIDE REPORTS A STATE IN
 * COLOUR AT ALL, and S-183 made that false: table T-237 of FR-029 gives the
 * armed entrance a FILL of S-183 (EN-1) and FR-053 (MUST) points at that row.
 * ⛔ It is not the counter-example NT-1 refuses either, and the ground is now
 * the requirement's own: FR-029 has the glyph knocked out in S-146 while the
 * box behind it is filled, so 「塗ると地と図形の明暗が入れ替わるので、色の差を
 * 読めない人にも反転として読める」 -- the second signal is the REVERSAL, not a
 * thickness. ⚠️ S-183 borrows S-152's pair and is still its own row, so the
 * count above did not change.
 * ⚠️ `pressed` AND `pinned` REPORT A STATE THE SAME WAY, and by the same
 * paragraph of the same requirement: table T-237 holds four rows, they take the
 * one shape `entranceStateFill` draws, and only the colour differs between them
 * (「形は 1 つ、意味は色」).
 *
 * ⚠️ AN EARLIER NOTE HERE COUNTED SIX AND PUT S-151, S-168 AND S-169 AMONG
 * THEM, AND WAS REFUTED AGAINST THE GENERATED BLOCK -- at the time none of the
 * three stood in it. ⭐ S-151 STANDS IN IT AGAIN SINCE CR-311, and not because
 * the old note was right: EN-3 of table T-237 fills a PINNED row's `Row Pin`
 * with that row and HF-6 of table T-051 (MUST) sends the pin there, so a part
 * this unit draws reads it now. S-168 and S-169 still have no reader here --
 * `tools/generate_entity_types.py` routes both to SvgRenderer.
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
  // ⭐ NOT A JUDGEMENT MADE HERE, WHICH IS WHAT PARTS IT FROM THE SIX ABOVE.
  // Table T-236 names S-183 「構えている入口の塗りの色」 and EN-1 of table T-237
  // fills the armed entrance with it, which FR-053 (MUST) points at -- so the
  // row and the part it paints are joined by the specification, not by this
  // file. ⚠️ THAT ROW'S NAME SAID 「縁の色」 UNTIL 2026-08-30 and every faithful
  // implementation drew a rim; CR-311 renamed the row and the requirement, and
  // nothing here may say 「縁」 again.
  armed: 'S-183',
  // ⭐ THE ROW IS THE SPECIFICATION'S NOW, WHICH IS WHAT CHANGED. This member
  // used to be a borrowed colour under `@provisional PD-340`, because FR-072
  // (MUST) had the panel's contents shown 「入口の押下状態で」 and FR-049 made a
  // toggle of every boolean row of table T-202 while table T-236 held no colour
  // for either. ⭐ Table T-237 is that row's home: EN-2 (the entrance's own
  // feature is ON) and EN-4 (the properties panel is showing it) both state
  // S-183, and FR-072 (MUST) sends its pressed state to EN-4 by name. ⛔ SO THE
  // MARK IS GONE -- what PD-340 asked for exists, and a mark left standing would
  // claim an open question that has been answered.
  // ⚠️ IT IS NOT THE ARMED MEMBER UNDER A SECOND NAME, even though the two rows
  // resolve to one colour. EN-1 and EN-2 are two rows of table T-237 with two
  // meanings and a stated precedence between them, and `entranceStateFill` is
  // where that precedence is kept; folding them into one member would throw the
  // order away the day either colour moves.
  pressed: 'S-183',
  // ⭐ EN-3 OF TABLE T-237, AND IT REACHES THIS UNIT THROUGH HF-6 OF TABLE
  // T-051 (MUST): 「ピン止めしている行の `IC-60` は、`FR-029` の 表 T-237 の
  // `EN-3` に従って塗ること」. ⛔ Not the per-control ground the same row's MUST
  // NOT forbids -- that row says so itself: 「地は上の 1 枚（`S-150`）のままで
  // あり、`EN-3` の塗りはその地の上に載る状態の印である」.
  // ⚠️ S-151 IS 「強調の色」 (selection and the current position) and is shared
  // with the unit that draws the picture; ONE row of table T-236 read by two
  // units is not the copy rule 03 section 1 forbids.
  pinned: 'S-151',
  // ⭐ HF-15's TWO BANDS (MUST): 「上下の軸が生きているときは行の左右の辺に、
  // 左右の軸が生きているときは行の上下の辺に、帯を 1 本ずつ描くこと。色は 表
  // T-236 の `S-151`（上下）と `S-152`（左右）とする」. ⛔ NOT `pinned` UNDER A
  // SECOND READING, though S-151 is the row both name: that member is EN-3's
  // fill on a pinned row's IC-60 and this is the axis a held row is moving on,
  // and one member for two rules would join what the specification keeps apart.
  grabAxisPosition: 'S-151',
  grabAxisDepth: 'S-152',
  // ⭐ HF-18 (MUST): 「色は 表 T-236 の `S-153` とする —— 注意であって不良では
  // ない」, for the count a row shows of the rows it holds folded, and for the
  // same count at 段 0 (HF-12).
  caution: 'S-153',
} as const

/** How a declaration names one of them. @purity pure */
function painted(name: keyof typeof PAINT_ROW): string {
  return `var(--gr-${name})`
}

/**
 * ⚠️ SIX OF THESE ARE NOT NINE. An entrance's ground and an entrance's word
 * used to stand as members of their own, because table T-236 has one 地 and one
 * 文字の色 while the system colours had a separate pair for a button
 * (`ButtonFace` / `ButtonText`). ⛔ With the fallbacks gone the two pairs are
 * the same string, and rule 03 section 1 forbids one concept two names.
 *
 * ⭐ THE LAST THREE ARE TABLE T-237'S, and they joined for one reason: that
 * table gives a state of an entrance a FILL, and a fill is a colour this unit
 * has to hold. `armed` came on 2026-08-26 (then as a rim), `pressed` on
 * 2026-08-28 and `pinned` with CR-311 on 2026-08-30. Each reads a row like the
 * rest, so `themeStyle` repaints all three in both renderings without a second
 * path. ⚠️ Two of them resolve to one colour today (S-183 stands on EN-1, EN-2
 * and EN-4); they are kept apart because table T-237 keeps them apart, and
 * `entranceStateFill` is what reads the order between them.
 */
const PAINT = {
  ground: painted('ground'),
  ink: painted('ink'),
  quiet: painted('quiet'),
  rule: painted('rule'),
  panel: painted('panel'),
  shadow: painted('shadow'),
  armed: painted('armed'),
  pressed: painted('pressed'),
  pinned: painted('pinned'),
  grabAxisPosition: painted('grabAxisPosition'),
  grabAxisDepth: painted('grabAxisDepth'),
  caution: painted('caution'),
} as const

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
 * ⭐ SO THE SHAPE IS TAKEN OUT OF THE LINE BOX AND CENTRED, and the box the
 * entrance keeps around it is S-138 with S-141 on each side of it, on both axes
 * and in no other unit. ⛔ NOTHING RELATIVE IS LEFT IN EITHER LENGTH, and that
 * is the whole of what FR-029 (MUST NOT) added: the shape's side is fixed at
 * S-138, so a gap stated in the reader's own text size is the only thing left
 * that can grow, and it grew alone -- ⚠️ measured in the live tree, a reader at
 * twice the machine's text size had twice the gap the row states while the
 * shape stayed the size it is. Both lengths now come from the generated block
 * at the foot of this file, so the entrance measures the same whatever text the
 * page is read at.
 * ⚠️ THE FRAME IS NOT TOUCHED HERE, which S-141 requires: its border and its
 * corner stay `entryStyle`'s, and an entrance is a `button`, whose box the
 * environment measures border-and-all -- so the height below is the frame's
 * outer edge while the sides are its inner one. ⛔ Not corrected by adding the
 * frame's own thickness to the height: that thickness is not a value of the
 * specification, and adding it would move the frame.
 * ⚠️ The row controls take neither of these -- their frame is their own box,
 * and this only stops the shape from driving it.
 * ⛔ The doubling is left to `calc()` rather than done here -- the gap falls on
 * both sides of the shape, and a doubled number written in this file would be a
 * value the specification never printed.
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
    `padding:0 ${gap}px;` +
    `min-height:calc(${side}px + ${gap}px * 2);`
  )
}

/**
 * The lengths and the two ratios FR-006's property fields are drawn at, each
 * named once so that the declarations below read as what they are rather than
 * as row ids.
 *
 * ⛔ NO NUMBER IS WRITTEN HERE. Every one is a row of table T-206 reaching this
 * file through `NOT_STORED_PROPERTY_FIELD_SIZES`, which `npm run gen` builds
 * from `_source/settings.json` -- rule 03 section 1 forbids re-typing a value
 * the specification holds, and the manuscript is where each would move.
 * ⚠️ Every one of them is marked 🔎 in that table: they are the reference
 * implementation's measured values, and nothing has ruled on them.
 *
 * ⛔ S-188 IS THE ONE ROW OF THE RUN THAT IS NOT READ, and that is FR-006's
 * doing rather than an omission: that requirement (MUST NOT) forbids the current
 * value to be drawn in front of the control that shows it, so nothing on this
 * panel draws a swatch and the row's side and gap have no reader. ⚠️ The row
 * is NOT retired -- it still holds a swatch's dimensions for whatever draws one.
 *
 * ⛔ THE LAST TWO ARE RATIOS AND NOT LENGTHS, which is why they leave this
 * function as bare numbers and are written into a declaration with `em` after
 * them. FR-006 (MUST NOT) forbids the panel's text size to be held as a px
 * constant, because a reader who makes the browser's text bigger would then have
 * this one panel left behind (WCAG 2.1's 1.4.4, which NFR-007 carries).
 *
 * ⛔ A FUNCTION AND NOT A `const`, for the reason `entryGlyphRoom` gives: the
 * values arrive in the generated block at the foot of this file, which a `const`
 * evaluated above it cannot read.
 *
 * @purity pure
 */
function fieldSizes(): {
  readonly controlMinHeight: number
  readonly colorMinHeight: number
  readonly namePercent: number
  readonly nameGap: number
  readonly rowGap: number
  readonly panelPadY: number
  readonly panelPadX: number
  readonly multilineRows: number
  readonly textScale: number
  readonly nameTextScale: number
} {
  const [panelPadY, panelPadX] = NOT_STORED_PROPERTY_FIELD_SIZES['S-192']
  return {
    /** S-186: the least a control may be tall. */
    controlMinHeight: NOT_STORED_PROPERTY_FIELD_SIZES['S-186'],
    /** S-187: the same for a colour control, which that row keeps apart. */
    colorMinHeight: NOT_STORED_PROPERTY_FIELD_SIZES['S-187'],
    /** S-189: the share of the width the name column takes. */
    namePercent: NOT_STORED_PROPERTY_FIELD_SIZES['S-189'],
    /** S-190: across, between the name and the control. */
    nameGap: NOT_STORED_PROPERTY_FIELD_SIZES['S-190'],
    /** S-191: down, between one field and the next. */
    rowGap: NOT_STORED_PROPERTY_FIELD_SIZES['S-191'],
    panelPadY,
    panelPadX,
    /** S-193: how many lines a multi-line control shows. */
    multilineRows: NOT_STORED_PROPERTY_FIELD_SIZES['S-193'],
    /** S-197: what the host's own base text size is multiplied by. */
    textScale: NOT_STORED_PROPERTY_FIELD_SIZES['S-197'],
    /** S-198: what an item name is multiplied by ON TOP of S-197. */
    nameTextScale: NOT_STORED_PROPERTY_FIELD_SIZES['S-198'],
  }
}

/**
 * U-25's own box, padded by S-192 of table T-206 and lettered by S-197.
 *
 * ⭐ THIS IS THE ONE DECLARATION THAT CARRIES THE PANEL'S TEXT SIZE, and it is
 * on the panel's own box because `font-size` is an inherited property: every
 * descendant that states none of its own computes from this one. FR-006 (MUST)
 * has the size be S-197 times 「宿主が与える地の文字の大きさ」, and `em` on this
 * box is exactly that -- it resolves against the box's parent, which states no
 * size of its own, so what it multiplies IS the host's base.
 * ⛔ NOT `fontScaleSizes[fontScale]` OF TABLE T-215, which FR-006 rules out in
 * as many words: `fontScale` sizes the SCHEDULE's letters (S-3's `rulerFont` and
 * the labels of table T-201), and this panel is the frame around the schedule
 * rather than part of it. Multiplied by that roster the largest step would come
 * out at 11.2px and the smallest at 8.4px.
 * ⛔ AND NOT A PX CONSTANT (MUST NOT), which is why the ratio is written with
 * `em` after it rather than solved here: a reader who makes the browser's text
 * bigger has to take this panel with them (WCAG 2.1's 1.4.4, carried by
 * NFR-007). Nothing on this side may know what the host's base actually is.
 *
 * ⚠️ TWO KINDS OF DESCENDANT REACH IT, AND NEITHER BY ACCIDENT:
 *   - the plain value span of a field, which states no font at all and so
 *     inherits;
 *   - every control, because `propertyControlStyle`, `propertyColorStyle` and
 *     `propertyCheckStyle` each open with `font:inherit` -- a form control does
 *     NOT inherit by default, the host gives it a font of its own, and that
 *     declaration is what takes this one instead.
 * ⚠️ There were three until 2026-08-27: an `h2` heading carried the host's own
 * `1.5em` and had to put `font-size:inherit` back over it. FR-072 (MUST NOT)
 * took that row away (CR-272), so the case is gone with it.
 *
 * ⛔ A FUNCTION AND NOT A MEMBER OF `STYLE`, for both of the reasons
 * `entryStyle` gives: the values arrive in the generated block, and `STYLE`
 * states that every length in it is relative, which S-192 is not.
 *
 * @purity pure
 */
function propertiesPanelStyle(): string {
  const size = fieldSizes()
  return (
    `${STYLE.propertiesPanel}padding:${size.panelPadY}px ${size.panelPadX}px;` +
    `font-size:${size.textScale}em;`
  )
}

/**
 * Where the entries table T-109 places on U-25 stand, now that FR-072 (MUST NOT)
 * leaves them no heading row to sit beside.
 *
 * ⭐ `margin-left:auto` AND NOT A COORDINATE. `fillPropertiesPanel` puts this
 * box on the first field's line, and that line is the flex row
 * `propertyFieldStyle` states -- so "at the far end" is said as "take whatever
 * room is left on the left of me", which holds at every width S-80 can be
 * dragged to.
 * ⛔ No length is written: the S-186 .. S-198 run of table T-206 gives this
 * panel's FIELDS their lengths and gives an entry none.
 * ⚠️ `justify-content` is for the one frame where there is no field to ride
 * on and the box stands alone across the panel; as a flex ITEM it sizes to its
 * contents and the declaration does nothing.
 * ⭐ The gap between two entries is S-190, the same across-the-line gap the
 * fields use -- no second spacing is invented for a second kind of neighbour.
 *
 * @purity pure
 */
function propertyWayOutStyle(): string {
  return (
    'display:flex;align-items:flex-start;justify-content:flex-end;' +
    `gap:${fieldSizes().nameGap}px;margin-left:auto;`
  )
}

/**
 * One field of U-25: the name across from its controls.
 *
 * ⭐ S-190 ACROSS AND S-191 DOWN, which S-190's own row insists on ("`S-190` が
 * 横で `S-191` が縦である"): a field lays its name and its controls out side by
 * side and the fields stack, so the two gaps are on different axes.
 * ⛔ `align-items:flex-start` because a multi-line control (S-193) is taller
 * than its name, and centring would set the name down beside it -- a reader
 * scans the names down a column, so each stays at the top of its own field.
 *
 * @purity pure
 */
function propertyFieldStyle(): string {
  const size = fieldSizes()
  return (
    `display:flex;align-items:flex-start;gap:${size.nameGap}px;` +
    `margin-bottom:${size.rowGap}px;line-height:1.6;`
  )
}

/**
 * The name half of one field.
 *
 * ⭐ S-189 IS A PERCENTAGE AND NOT A WIDTH, and its row says why: FR-052 has a
 * person drag this panel wider (S-80), so a name column held in px would leave
 * every pixel gained to the controls.
 *
 * ⭐ RIGHT-ALIGNED, WHICH FR-006 (MUST) ASKS FOR IN AS MANY WORDS 「項目名は値の
 * 欄の左に置き、右詰めにすること」 (利用者の裁定 2026-08-27). Where the name STANDS
 * needs nothing here -- `fieldElement` appends it before the controls -- so what
 * was missing was only the alignment, and the requirement's ground is that a
 * border between name and value which is not straight makes the eye hunt for it
 * once per field.
 *
 * ⭐ S-198 IS MULTIPLIED ON TOP OF S-197, NOT INSTEAD OF IT, which that row
 * states: 「掛ける相手は `S-197` を適用したあとの大きさであって、`fontScaleSizes`
 * ではない」. `em` here resolves against the panel's own computed size, which
 * `propertiesPanelStyle` has already set to S-197 of the host's base -- so the
 * two ratios compound exactly as the two rows describe, and neither is solved
 * into a px number this side has no right to know.
 *
 * @purity pure
 */
function propertyFieldNameStyle(): string {
  const size = fieldSizes()
  return (
    `color:${PAINT.quiet};flex:0 0 ${size.namePercent}%;` +
    `text-align:right;font-size:${size.nameTextScale}em;`
  )
}

/** What the controls of one field stand in -- a row of table T-016 can hold three. @purity pure */
/**
 * EZ-2 of table T-040 (MUST): the tooltip letters itself at S-204's
 * coefficient of the host's own text -- 「2 段階」 read as 14 ÷ 16.
 *
 * ⛔ A COEFFICIENT AND NEVER A px, for the reason `helpStyle` gives.
 *
 * @purity pure
 */
function tooltipStyle(): string {
  return `${STYLE.tooltip}font-size:${NOT_STORED_HELP_SIZES['S-204']}em;`
}

function helpColumnsStyle(): string {
  // ⭐ THE COUNT IS S-202'S AND IS NEVER TYPED HERE (rule 03 section 1). FR-036
  // (MUST NOT) also forbids it to be held in pixels, which `column-count`
  // obeys by construction: the browser divides whatever width the surface came
  // out at.
  return `column-count:${NOT_STORED_HELP_SIZES['S-202']};column-gap:1.5em;`
}

function helpStyle(): string {
  // ⭐ S-201 IS A SHARE AND IS APPLIED TO THE VIEWPORT, which FR-036 (MUST)
  // asks for in both directions -- the width AND the height of the screen.
  // ⚠️ `vw` / `vh` and not the window read through script: the share has to
  // follow a resize, and a number measured once would not.
  // ⛔ A SIZE AND NOT A MAXIMUM ON BOTH AXES. FR-036 (MUST) has the help OPEN
  // at that share of the width AND the height, so a height the contents fall
  // short of would not be the share the requirement names -- measured
  // 2026-08-29 at 1920x1080, where a maximum left it 0.885 tall. ⚠️ Scrolling
  // is still allowed and still reached: the same requirement permits it below
  // MC-6 of table T-025, which `overflow` is what serves.
  // ⛔ THE TWO MAXIMA OF `STOPPING_BOX` ARE OVERRIDDEN AND THAT IS THE POINT.
  // Every other surface is capped at 92% of the screen; FR-036 gives THIS one a
  // share of its own, and a cap left standing would silently win over it --
  // measured 2026-08-29 at 1920x1080, where the box came out 0.92 wide against
  // the 0.95 the requirement asks for.
  const share = NOT_STORED_HELP_SIZES['S-201'] * 100
  // FR-036 (MUST): the size of the letters is S-203's coefficient of the
  // host's own text. ⛔ NOT A px (MUST NOT) -- NFR-007 carries WCAG 2.1's
  // 1.4.4, and a fixed size leaves behind the reader who enlarged the
  // browser's text. ⚠️ It is set on the BOX, so the entries inherit it and
  // the shapes -- drawn in `em` -- come down with the words, which is what
  // 「アイコンと合わせろ」 asks for.
  return (
    `width:${share}vw;max-width:${share}vw;` +
    `height:${share}vh;max-height:${share}vh;overflow:auto;` +
    `font-size:${NOT_STORED_HELP_SIZES['S-203']}em;`
  )
}

function propertyControlsStyle(): string {
  return `flex:1;display:flex;flex-wrap:wrap;align-items:flex-start;gap:${fieldSizes().nameGap}px;min-width:0;`
}

/**
 * One control that takes room.
 *
 * ⛔ A MINIMUM AND NOT A HEIGHT, which S-186 says of itself in as many words: a
 * reader who makes the browser's text bigger would have a fixed height cut the
 * letters off, and NFR-007 forbids exactly that.
 *
 * STOP -- ⛔ THE SAME QUESTION ON THE OTHER AXIS HAS NO ANSWER IN THE
 * SPECIFICATION: how narrow a control may be drawn before its value is cut off.
 * PR-3 of table T-016 is where a reader meets it, being the one row that carries
 * two date columns, so its two controls halve whatever the value side came out
 * as. ⚠️ FR-093's estimate is not that answer by itself, and that was measured
 * rather than assumed: at S-171, with S-189 and S-190 taking their share and at
 * the base a host gives by default, each of PR-3's two controls ALREADY has more
 * room than FR-093 estimates for a date -- and the user still reports the dates
 * cut off (D-58 of docs/development-records/defects.md). ⚠️ At a base a reader
 * has enlarged, the same arithmetic turns the other way and the estimate is the
 * larger of the two, so FR-093 is part of the answer and not the whole of it.
 * What is missing is a row for the room a control's own frame and the host's own
 * date editor take BESIDE the value, and for what a field does when its controls
 * cannot all be given it. Searched: FR-006, FR-093, FR-029, table T-016 (PR-3),
 * and the S-186 .. S-198 run of table T-206 beside S-171 and S-80. ⛔ No width
 * is invented here in their place.
 *
 * @purity pure
 */
function propertyControlStyle(widthInFontSizes: number): string {
  return (
    `font:inherit;box-sizing:border-box;flex:1;min-width:${widthInFontSizes}em;` +
    `min-height:${fieldSizes().controlMinHeight}px;` +
    `background:${PAINT.ground};color:${PAINT.ink};border:1px solid ${PAINT.rule};`
  )
}

/**
 * A colour control.
 *
 * ⛔ S-187 AND NOT S-186, which that row states outright: the reference
 * implementation holds a separate number for a colour, one px lower, because
 * the swatch takes the difference there.
 * ⚠️ NOTHING DRAWS THAT SWATCH HERE ANY MORE (FR-006, MUST NOT), and the row
 * is still S-187's: the difference is what the reference implementation
 * MEASURED, and this side may not solve a row away because it stopped drawing
 * the thing the row's note explains.
 *
 * @purity pure
 */
function propertyColorStyle(): string {
  return (
    'font:inherit;box-sizing:border-box;flex:1;min-width:0;padding:0;' +
    `min-height:${fieldSizes().colorMinHeight}px;` +
    `background:${PAINT.ground};border:1px solid ${PAINT.rule};`
  )
}

/**
 * A truth value, which is the one control that does not stretch.
 *
 * ⚠️ A checkbox drawn the width of the field would read as a box to type in;
 * the host draws it at its own size and this only keeps the surrounding font.
 * ⛔ S-186 is deliberately absent: that row is 「入力欄の高さの下限」, and a
 * checkbox is not a 欄 a value is typed into.
 *
 * @purity pure
 */
function propertyCheckStyle(): string {
  return 'font:inherit;'
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
 * ⭐ THE COLOUR IS S-149 (`PAINT.rule`) AND IS NOT THIS FILE'S CHOICE. FR-029
 * (MUST) names the row: 「薄さは … 表 T-236 の `S-149` の色で示すこと」.
 * ⛔ IT WAS S-148 (`PAINT.quiet`) UNTIL 2026-08-30 AND THAT WAS MEASURED WRONG
 * ON THE SHIPPED BUILD -- 5.91 : 1 against the panel's ground, which the user
 * read as a usable entrance (CR-307). S-149 is the same table's rule colour,
 * chosen to be present without asserting itself, and it is what the requirement
 * now points at.
 * ⚠️ SO THE FRAME AND THE SHAPE ARE ONE COLOUR HERE, where `entryStyle` has
 * them two. ⛔ 「枠」 and never 「縁」: what CR-311 retired is the ARM's rim, and
 * this is the entrance's own border, which every entrance has always had. That follows from the row FR-029 names and is not a second decision.
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
    `font:inherit;background:${PAINT.panel};color:${PAINT.rule};` +
    `border:1px solid ${PAINT.rule};border-radius:0.25em;cursor:default;` +
    entryGlyphRoom()
  )
}

/**
 * The four states of an entrance table T-237 of FR-029 gives a FILL, in that
 * table's own order, with the colour each row states.
 *
 * ⭐ THE ORDER IS THE TABLE'S AND IS LOAD-BEARING. That table closes with 「1 つ
 * の入口に 2 行が同時に当たるときは、上の行が勝つこと（MUST）」, so this list is
 * read from the top and the first row that stands wins. ⛔ Written as an ordered
 * list and never as an object read with `Object.keys`: the precedence would then
 * be a property of how the host enumerates keys rather than of what the table
 * prints.
 * ⚠️ THE SAME TABLE (MUST NOT) REFUSES TO SAY THE ROWS CANNOT MEET -- 「同時に
 * 当たることはない」とは書かない -- so nothing here may take a pair for
 * impossible and skip the comparison.
 *
 * ⭐ TWO ROWS RESOLVE TO ONE COLOUR TODAY (EN-1, EN-2 and EN-4 all state S-183)
 * AND ARE STILL FOUR ROWS. The table's own note says why: 「`S-183` が 3 行に
 * 立つのは、いずれも「いま効いている」を意味するからである」 -- one meaning, three
 * places it can arise, and a colour that may move for one of them alone.
 */
const ENTRANCE_STATE_FILL = [
  ['EN-1', PAINT.armed],
  ['EN-2', PAINT.pressed],
  ['EN-3', PAINT.pinned],
  ['EN-4', PAINT.pressed],
] as const

/** One row id of table T-237. */
type EntranceStateRow = (typeof ENTRANCE_STATE_FILL)[number][0]

/**
 * What FR-029 (MUST) draws on an entrance that is IN EFFECT, so that it can be
 * told from the entrances that are not.
 *
 * ⭐ A FILL AND NEVER A RIM, WHICH IS THE WHOLE OF THIS FUNCTION. FR-029 (MUST):
 * 「図形を描く箱を塗りつぶし、図形そのものを 表 T-236 の `S-146`（地の色）で抜く
 * こと」, and the same sentence (MUST NOT) 「縁の色や太さで示してはならない」.
 * ⚠️ UNTIL 2026-08-30 THIS FILE DREW A RIM AND WAS RIGHT TO: table T-236 named
 * S-183 「構えている入口の縁の色」 and FR-053 named the rim, so three rounds of a
 * faithful implementation drew one. CR-311 moved the specification, S-185 (the
 * rim's thickness) has no row any more, and ⛔ nothing here may argue for a
 * width again.
 *
 * ⛔ AN ATTRIBUTE PAINTS NOTHING, WHICH IS WHY THIS EXISTS. `data-armed`,
 * `data-pressed` and `data-pinned` are written beside every entry for the shell
 * to read back, and there is no `.css` file anywhere under `src/` for a selector
 * to live in -- every rule this unit draws is an inline declaration. So a state
 * that is only an attribute is a state nobody can see. ⚠️ `data-pinned` is the
 * one that went unpainted longest: it was written on IC-60 and read by nothing.
 *
 * ⭐ THE KNOCK-OUT COLOUR IS S-146 AND NOT WHITE, and that is stated rather than
 * chosen: FR-029 (MUST NOT) 「抜き色に白を使ってはならない」 because the dark
 * rendering's fill is a LIGHT green (`#6fc98d`), on which white does not stand.
 * ⭐ `PAINT.ground` is that row, so both renderings separate themselves.
 * ⚠️ ONE DECLARATION COLOURS THE WHOLE GLYPH: figure F-019 paints
 * `currentColor` and chooses no colour of its own (`fillEntry`), so `color:`
 * here is what knocks the shape out of the box `background:` filled.
 *
 * ⛔ NOT A CASE OF SHOWING A STATE 「色だけで」. FR-029 answers that itself --
 * 「塗ると地と図形の明暗が入れ替わるので、色の差を読めない人にも反転として読める」
 * -- so the second signal is the REVERSAL of ground and shape and no width is
 * needed beside the colour. ⚠️ `aria-pressed` carries it in the other tree, and
 * `commandEntry` has always written it; ⛔ never on the ARMED entry, which table
 * T-109 says of IC-54 「ボタンではない」 and FR-053 (MUST NOT) refuses to draw
 * 「押されている形」.
 *
 * ⛔ APPENDED ONLY TO AN ENTRANCE THAT CAN BE USED, AND THE ORDER IS THE RULE.
 * FR-029 (MUST) draws faint the entrance that cannot be used and closes the fill
 * paragraph with 「上の薄く描く入口には当ててはならない（MUST NOT）」 -- 「効いて
 * いて、かついま何も変えられない入口が濃くなると、薄さの意味が消える」. An entry
 * can be both at once (S-59 at `'plan-only'` leaves IC-8 on and unusable, and
 * S-59 at `'actual-only'` does the same to IC-9, which is where this was
 * measured), so an entrance that is in effect and unusable reports only that it
 * cannot be used. ⚠️ THAT NOW REACHES THE ARMED ENTRY TOO: while the rim was a
 * rule of FR-053 alone it was drawn on the faint entry as well, and the MUST NOT
 * that governs the fill is FR-029's and reaches every row of table T-237.
 * ⛔ The caller decides it, not this function -- `commandEntry` never offers a
 * row for an entrance it drew faint.
 *
 * ⭐ ONE SHAPE FOR ALL FOUR ROWS, WHICH IS THE RULING'S OWN WORDS: 「形は 1 つ、
 * 意味は色」. ⛔ So there is no second function beside this one -- the two that
 * used to stand here (`entryArmedRim` and `entryPressedInk`) drew two different
 * pictures for what table T-237 now says is one.
 *
 * ⚠️ AN EMPTY STRING WHEN NO ROW STANDS, so a caller may append the answer
 * unconditionally and no combination needs a style of its own.
 *
 * @purity pure
 */
function entranceStateFill(standing: readonly EntranceStateRow[]): string {
  for (const [rowId, colour] of ENTRANCE_STATE_FILL) {
    if (standing.includes(rowId)) return `background:${colour};color:${PAINT.ground};`
  }
  return ''
}

/**
 * The line FR-053 (MUST) shows the boundary between two groups of the palette
 * with, in place of the caption the same requirement (MUST NOT) forbids.
 *
 * ⭐ BOTH LENGTHS ARE THE SPECIFICATION'S. S-143 of table T-206 states the
 * rule's thickness and the clearance around it, and the pair arrives in that
 * order -- ⛔ neither number is written here, which is what rule 03 section 1
 * requires.
 *
 * ⭐ THE COLOUR IS S-149 AND IS NOT A CHOICE MADE HERE EITHER. Table T-236
 * gives that row 「区切りの線」 as what it paints, and a boundary between two
 * groups is one; `dividerLine` reads the same row for the boundary EP-9 draws.
 * ⛔ No row gives this rule a colour of its own, and inventing one would put a
 * second paint against the one already settled for a separating line.
 *
 * ⭐ THE SECOND NUMBER REACHES ALL FOUR SIDES, which is what that row now says
 * of itself -- 「線の太さとまわりの空き」, and 「2 つ目の数は上下左右のすべてに
 * 当たる」 (the user's ruling of 2026-08-29). ⛔ IT IS NOT A SECOND NUMBER
 * INVENTED FOR THE VERTICAL: the ruling was 「上下も左右と同じ 6px」, so the
 * clearance is one value applied four ways and the row stays a pair.
 * ⚠️ UNTIL THAT RULING THE CLEARANCE WAS SIDEWAYS ONLY, and the measurement is
 * what settled it: the rules came out 1px tall with 0px above and below, so a
 * group's buttons touched the line on both sides. ⚠️ A `margin-bottom:0.5em`
 * used to stand in for the rule while it could not be drawn; it went with this
 * function, because a made-up gap kept beside the real boundary reads as a rule
 * that was measured. ⭐ The 6px that replaced it is measured -- it is the same
 * number the sides already had.
 *
 * ⛔ A FUNCTION AND NOT A MEMBER OF `STYLE`, for the reason `entryStyle`
 * gives: it reads the generated block at the foot of this file, which a `const`
 * evaluated above it cannot.
 *
 * ⛔ `pointer-events:none` FOR THE REASON `dividerLine` HAS IT: the rule is a
 * decoration table T-103 gives no row and table T-109 no entrance, so a point
 * on it belongs to the palette and IF-9's third member must answer that.
 *
 * @purity pure
 */
function paletteGroupRuleStyle(): string {
  const [thickness, clearance] = NOT_STORED_PALETTE_GROUP_RULE_SIZES['S-143']
  return (
    `height:${thickness}px;margin:${clearance}px;` +
    `background:${PAINT.rule};pointer-events:none;`
  )
}

// -------------------------------------------------------------- the styles ---

/**
 * What the `Autosave Status`'s letters multiply the host's own base by.
 *
 * ⛔ THE ROW THIS IS WAITING FOR DOES NOT EXIST, AND NO REASON FOR THE NUMBER IS
 * WRITTEN HERE. Table T-206 holds no coefficient for the `App Header` or for any
 * part of it: S-197 and S-198 are the `Properties Panel`'s and FR-006 is what
 * places them there, and S-116 caps the header's HEIGHT and says nothing about
 * its letters. FR-061 (MUST) asks for the time to be shown beside the saved
 * state and settles no size for it either. PD-326 names the row that must exist
 * and what it must say; until it does, this value is not the specification's.
 *
 * ⚠️ IT WAS `AUTOSAVE_STATUS_TEXT_SCALE` until CR-280 retired the autosave;
 * the same box now carries FR-101's two cues and the same ruling is owed.
 * ⛔ A COEFFICIENT AND NEVER A px, for the reason `propertiesPanelStyle` gives
 * for S-197: NFR-007 carries WCAG 2.1's 1.4.4, and a size fixed in px leaves the
 * reader who enlarged the browser's own text behind. What this multiplies is
 * that base, which is what an `em` on a box stating no size of its own resolves
 * against.
 * ⛔ AND NOT `fontScaleSizes[fontScale]` OF TABLE T-215, which FR-006 rules out
 * in as many words for the frame AROUND the schedule -- and the header is that
 * frame rather than part of the schedule, the same ground S-197 stands on.
 *
 * @provisional PD-326
 */
const FILE_STATUS_TEXT_SCALE = 0.75

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
 * How much stands between a row control's shape and each side of its box.
 *
 * ⛔ NOT A VALUE OF THE SPECIFICATION, and not S-141 either: that row is the gap
 * FR-029 fixes 「図形と入口の枠のあいだ」 and a row control has no frame at all
 * (`STYLE.rowControl` says why). ⚠️ It is named rather than written twice
 * because the ground HF-6 (MUST) lays under the controls has to reach the LEFT
 * EDGE of the leftmost one, and that edge is this padding away from its shape --
 * so a number written in two places would put the band and the control it must
 * cover on two different answers.
 *
 * @provisional PD-151
 */
const ROW_CONTROL_PAD_EM = 0.125

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
  // ⭐ SMALLER THAN THE REST OF THE HEADER, AND THE RATIO IS NOT SETTLED --
  // `FILE_STATUS_TEXT_SCALE` carries the whole of why, and the row it waits
  // for. ⚠️ What FR-051 measures at BO-1 is the height this box comes out at,
  // NOT a number stated here, so a part that letters itself smaller cannot make
  // that height wrong -- but it CAN lower it, if this box was ever the tallest
  // thing in the header, and everything below the header is placed against it.
  // ⛔ TWO LINES, THE NAME ABOVE THE TIME (FR-101, MUST). A column is what
  // puts one over the other without either being placed at a stated offset.
  fileStatus:
    `margin-left:auto;color:${PAINT.quiet};display:flex;` +
    `flex-direction:column;align-items:flex-end;line-height:1.2;` +
    `font-size:${FILE_STATUS_TEXT_SCALE}em;`,
  openedFileName: 'overflow:hidden;text-overflow:ellipsis;max-width:24ch;',
  fileSavedAt: '',
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
  // be neither pressed nor answered by IF-9's fourth member.
  panelCornerEntry: 'position:absolute;top:0;right:0;pointer-events:auto;',
  // HF-5 of table T-051 (MUST NOT): the row's controls are not levelled with the
  // middle of the name. ⛔ `align-items:center` is what that row forbids in as
  // many words, and `flex-start` is the whole of what it asks for instead --
  // that row now LEVELS the controls with the top of the name (MUST) and
  // forbids setting them down from it (MUST NOT), so no control carries an
  // offset of its own.
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
  // depth (`RowTitle.indentPx`), so an indented row moves its name and not its
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
  // ⭐ AND NO BOX IS STATED FOR THE FILL EN-3 OF TABLE T-237 PUTS ON THE PIN
  // EITHER, WHICH WAS MEASURED RATHER THAN ASSUMED. A stated box was written
  // and taken out again: HF-5 (MUST NOT) 「中央で揃えてはならない。上端から
  // 下げてはならない」 refuses every declaration that would give this control a
  // box of its own without moving the shape inside it -- a centring, a
  // `margin-top`, a `padding-top`, a `top`. ⛔ So the fill takes the box the
  // control already has, and that box is not left to chance: measured on the
  // shipped build of 2026-08-30 it is 20 x 24px, which is S-138 (16) with
  // `ROW_CONTROL_PAD_EM` on each side and the line box the shape's own 16px
  // makes -- a filled icon, not a band across the row. ⚠️ A height written
  // here would be one the specification never printed and, on a row set larger
  // (S-36 / S-38 by depth), one the shape would hang out of.
  // ⛔ OUT OF THE FLOW, AND THAT IS THE POINT. These three are drawn only while
  // the pointer is on the row's name (HF-6), and S-140 of table T-206 -- the
  // room FR-085 subtracts before cutting that name -- is 0px. Left in the flex
  // row they still held a box each, so the name was given 48px less than
  // FR-085 had judged it against and the browser's own ellipsis cut it. That
  // cut left `isLabelTruncated` false, so the tooltip FR-085 (MUST) raises for
  // a cut name could never be raised for it: the rest of the name was
  // unreachable. Reported by the user with a screenshot: 「Whole Product って
  // 表示するスペースはあるよね？ あらかじめ操作子が出る部分を確保していて、
  // その分が無駄になっている」.
  // ⭐ HF-4 IS UNTOUCHED: 「行の名前の長さにかかわらず、操作子を行見出しパネルの
  // 右端に揃えること（MUST）」 -- pinned to the row's right edge here, which is
  // that edge, and no longer moved by the name's length at all.
  // ⚠️ FR-085's MUST NOT is kept too. It forbids the reserved room CHANGING with
  // whether the controls are drawn; the room is now 0 whether they are drawn,
  // not drawn, or absent (EP-4 draws none in the export), which is one amount
  // in all three -- and it is the amount S-140 states.
  rowControl:
    // ⛔ NO `top` IS STATED, AND THAT IS HF-5 OF TABLE T-051 (MUST NOT): an
    // out-of-flow box with no vertical offset keeps its STATIC position, which
    // for a child of this flex row is the row's content top -- 「名前の上端に
    // 揃えること（MUST）。中央で揃えてはならない（MUST NOT）」. Writing
    // `top:0` would say the same thing and take the decision away from the row.
    // ⛔ THE CONTROL ITSELF STAYS TRANSPARENT, AND THAT IS HF-6 (MUST NOT):
    // 「操作子ごとに別々の地を敷いてはならない」. Painting `PAINT.panel` here
    // would be a box per control and the row's name would show through the
    // steps between them, which is the very drawing the ruling of 2026-08-30
    // threw out. The one ground the row (MUST) lays instead is
    // `rowControlGroundStyle`, and it is a box of its own behind all five.
    `position:absolute;font:inherit;background:transparent;color:${PAINT.ink};` +
    `border:none;padding:0 ${ROW_CONTROL_PAD_EM}em;cursor:pointer;`,
  // FR-029 (MUST), as that requirement now reads: an entrance that can change
  // nothing right now is drawn faint, in table T-236's S-149 -- which is
  // `PAINT.rule`, the same colour `entryFaintStyle` takes for the entrances
  // that stand in a frame. ⚠️ 「載る面によって薄くしない入口があってはならない
  // （MUST NOT）」, so the row's controls take the palette's answer rather than
  // one of their own. ⛔ IT WAS S-148 UNTIL 2026-08-30 -- see `entryFaintStyle`
  // for what the shipped build measured and why the requirement moved.
  //
  // ⭐ APPENDED AND NEVER A SECOND WHOLE DECLARATION, the move `commandEntry`
  // makes with `entranceStateFill`: whether a control can act is one fact about
  // it, and a declaration per combination would be four where one and an
  // override do.
  // ⛔ NOTHING HERE DISABLES IT. FR-029 (MUST NOT) forbids the faint entrance to
  // be disabled in the host's own sense, because a disabled control stops taking
  // the press -- and the press is the one trigger that (MUST) tells the person
  // why nothing happened. `rowControlElement` writes `aria-disabled` and never
  // `disabled`, for the reason `entryFaintStyle` states at length.
  // ⚠️ THE CURSOR MOVES WITH THE INK, which is `entryFaintStyle`'s answer too:
  // the two faint entrances would otherwise differ by a cursor, and that is the
  // difference by surface the same MUST NOT refuses.
  rowControlFaintInk: `color:${PAINT.rule};cursor:default;`,
  // SC-5 of table T-031: only the contents scroll, and never in step with the
  // drawing area.
  //
  // ⛔ NO PADDING HERE, AND NOT BECAUSE IT HAS NONE. S-192 of table T-206 is
  // what the panel is padded by, and it is in px, which this object states it
  // does not hold -- `propertiesPanelStyle` is where it stands, for the reason
  // `entryStyle` gives about a value that arrives in the generated block.
  propertiesPanel:
    'position:absolute;box-sizing:border-box;overflow-y:auto;' +
    `background:${PAINT.panel};color:${PAINT.ink};border-left:1px solid ${PAINT.rule};` +
    'pointer-events:auto;',
  heading: 'font-weight:600;margin:0 0 0.5em 0;',
  // ⚠️ THE LINE EVERY OTHER SURFACE LAYS A NAME AND A VALUE OUT ON, and NOT the
  // property panel's own field: FR-006's fields are drawn at S-189 .. S-191 of
  // table T-206, which are px and which `propertyFieldStyle` states. ⛔ The two
  // were one declaration until the rows existed, and joining them again would
  // put FR-006's lengths on the resource roster and on FR-088's weekdays.
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
    'cursor:grab;pointer-events:auto;position:relative;',
  // ⛔ THE TOGGLE SITS AT THE BAND'S RIGHT END AND THE GRAB MARK STAYS CENTRED.
  // FR-053 (MUST) puts IC-53 on the band with the minimise entrance to ITS
  // right; taking the toggle out of the flow is what keeps IC-53 centred on the
  // band rather than pushed off-centre by the toggle's own width.
  // ⚠️ `cursor:pointer` and not the band's `grab`: this one is pressed, not
  // dragged, and the band's own cursor would say the wrong thing about it.
  paletteMinimise:
    'position:absolute;right:0;top:0;bottom:0;display:flex;align-items:center;' +
    'cursor:pointer;pointer-events:auto;',
  // Where the palette's own room went, so that the band above can reach its
  // edges. ⛔ NOT A PART: table T-103 has no row for it and it carries no
  // `data-role`, so `readScreenPartAt` walks straight past it to the palette --
  // it is the box the entries always sat in, one level down.
  paletteContents: 'padding:0.5em;',
  // ⛔ THE GROUP'S CAPTION HAD A DECLARATION HERE AND NO LONGER DOES. FR-053
  // (MUST NOT) stopped the caption being printed, and a style kept for a node
  // nothing makes is a rule that reads as in force.
  // ⛔ AND NEITHER DOES THE GAP THAT STOOD IN FOR THE BOUNDARY. A
  // `margin-bottom:0.5em` sat here while S-143's line could not be drawn; the
  // line is drawn now (`paletteGroupRuleStyle`), and a made-up gap left beside
  // it would be a second boundary that no row states. ⚠️ So a group carries no
  // declaration of its own, and the empty string is what says so.
  paletteGroup: '',
  paletteCommands: 'display:flex;flex-wrap:wrap;gap:0.25em;',
  // ⚠️ S-147 AND NOT S-151. 強調の色 is 「選択と現在位置」 by table T-236's own
  // note, and what is armed is neither -- FR-053 (MUST) asks only that it be
  // readable. ⛔ Nothing is emphasised here that the requirement did not ask to
  // be emphasised.
  armedText: `color:${PAINT.ink};`,
  modal: STOPPING_BOX,
  // A heading with the entries table T-109 places on that surface beside it.
  // ⚠️ THE PROPERTIES PANEL IS NO LONGER ONE OF THEM. It shared this row until
  // 2026-08-27, when FR-072 (MUST NOT) forbade a heading at the head of U-25
  // (CR-272); the surfaces table T-103 names still carry one, and `modalElement`
  // is now the only caller. ⛔ The name stays `surfaceHeader` all the same --
  // the row belongs to a SURFACE and not to the modals, and renaming it back
  // would have to be undone the next time a surface gains one.
  surfaceHeader: 'display:flex;align-items:center;gap:0.75em;margin-bottom:0.5em;',
  // ⭐ ONE LINE PER ROW OF THE SIX TABLES FR-036 NAMES, laid out so that the
  // column break can never fall inside one: `break-inside:avoid` is what makes
  // the multi-column list above a list of ENTRIES rather than of lines.
  // ⚠️ THE LINE HEIGHT IS WHAT MAKES THE LIST FIT, and it was measured rather
  // than chosen: FR-036 (MUST) asks the whole of it to stand without scrolling
  // at MC-6 of table T-025 (1920 x 1080), and at 1.6 the 110 entries came out
  // 998px against the 1024px the surface has -- which left no room for the
  // heading above them and scrolled. ⛔ Nothing smaller than this is warranted
  // either: NFR-007 refuses to let text be cut off, and the entries carry two
  // scripts.
  helpEntry: 'display:flex;align-items:baseline;gap:0.5em;break-inside:avoid;line-height:1.35;',
  // The description. ⭐ It takes the room that is left, so the keys and the
  // shape keep their places at the right however long the words come out --
  // which they do differently per language (FR-038).
  helpText: 'flex:1;min-width:0;',
  // ⚠️ The place is kept for a row with no assignment, which is why a width is
  // stated at all; `modalElement` says why nothing is drawn in it.
  helpKeys: 'flex:0 0 auto;opacity:0.75;white-space:nowrap;',
  // FR-036 (MUST): the size is the coefficient S-203, never a px. ⛔ The
  // value is not typed here -- `helpListStyle` reads it from the settings
  // the frame carries, the move `propertiesPanelStyle` makes for S-197.
  // FR-036 (MUST): to the right of the description.
  helpGlyph: 'flex:0 0 auto;display:inline-flex;align-items:center;',
  // FR-069's three, folded under the copyright line so that FR-036's list is
  // what the help shows when it opens. `modalElement` says why.
  helpLegal: 'margin-top:0.75em;border-top:1px solid currentColor;padding-top:0.5em;',
  helpLegalSummary: 'cursor:pointer;',
  helpLegalText: 'white-space:pre-wrap;margin:0.5em 0 0;',
  // The choices FR-096 (MUST) has the author pick one of, held together and
  // apart from the heading above them. ⛔ Nothing here says which order they
  // stand in: they are drawn in the order the description carries, which is
  // table T-024's own.
  formatChoices: 'display:flex;flex-wrap:wrap;gap:0.25em;margin-top:0.5em;',
  notices: 'position:absolute;left:50%;transform:translateX(-50%);max-width:60%;',
  notice:
    `box-sizing:border-box;margin:0.25em 0;padding:0.5em 0.75em;background:${PAINT.ground};` +
    `color:${PAINT.ink};border:1px solid ${PAINT.rule};pointer-events:auto;`,
  // NT-8's entrance, held under the words it puts away so that it does not read
  // as one more thing being said -- the placement `confirmationAnswers` below
  // gives NT-7's two answers, for the same reason. ⚠️ ONLY THE GAP IS DECLARED:
  // the frame is `entryStyle`'s, so this entrance stands like every other one
  // and no second look is invented for it.
  noticeDismiss: 'margin-top:0.5em;',
  // ⛔ `pointer-events:auto` is not decoration here: without it the point-to-part
  // answer (IF-9) never sees this surface, the press falls through to the
  // schedule underneath, and NT-7's two answers cannot be pressed at all.
  // ⛔⛔ THE COLUMN IS WHAT KEEPS NT-7's CHOICE REACHABLE (MUST), and it was
  // measured rather than preferred (D-134). `STOPPING_BOX` caps the box at 92%
  // of the screen and lets the whole of it scroll -- so with FR-032's names
  // filling 7050px of content the two answers sat at y = 7054 on a screen 1080
  // tall, outside the box and outside the window, and no pointer could reach
  // 「続ける」 at all. Laying the box out as a column, with the names in a
  // region that scrolls and the answers in one that does not, is what puts them
  // back on the screen whatever the list's length. ⛔ NO NEW SIZE IS INVENTED:
  // every length here is still `STOPPING_BOX`'s, and the specification holds no
  // row that gives this surface one (searched: table T-206's S- rows, table
  // T-212, table T-103, FR-032, NT-7).
  confirmation: STOPPING_BOX + 'display:flex;flex-direction:column;',
  // The half of the surface that MAY scroll: what would happen, in words, and
  // FR-032's names. ⛔ `min-height:0` is not decoration -- without it a flex
  // child refuses to shrink below its content and the region grows the box
  // instead of scrolling inside it, which is the very thing being fixed.
  confirmationNames: 'flex:1 1 auto;min-height:0;overflow:auto;',
  // NT-7 (MUST): the names of what would go, one element each.
  confirmationItem: 'display:block;line-height:1.6;',
  // FR-032's mark (PD-175), held off the name it follows. ⛔ Nothing but the gap
  // is declared here: the word carries the meaning, and NT-1 (MUST NOT) forbids
  // colour or a border from being what does.
  confirmationMark: 'margin-left:0.5em;',
  // The two answers, held apart from the names above them so that the choice
  // does not read as one more thing that would go. ⛔ `flex:0 0 auto` is what
  // keeps them out of the scrolling region beside `confirmationNames` -- see the
  // note on `confirmation` for what happened while they were inside it.
  confirmationAnswers:
    'flex:0 0 auto;display:flex;align-items:center;gap:0.5em;margin-top:0.5em;',
  dialogueField:
    'position:absolute;box-sizing:border-box;display:flex;flex-direction:column;' +
    `width:24em;height:14em;padding:0.5em;background:${PAINT.ground};color:${PAINT.ink};` +
    `border:1px solid ${PAINT.rule};pointer-events:auto;`,
  dialogueMessages: 'flex:1;overflow-y:auto;',
  dialogueMessage: 'line-height:1.5;',
  dialogueAuthor: `color:${PAINT.quiet};margin-right:0.5em;`,
  dialogueEntry: 'font:inherit;margin-top:0.25em;',
  // IN-3 of table T-028: it can be pointed at, so it takes the pointer.
  // ⚠️ NOTHING LAYS TWO THINGS OUT SIDE BY SIDE HERE ANY MORE -- the flex row
  // was for the control that used to sit beside the reading, and `tooltipElement`
  // says why that control is gone.
  // ⚠️ THE SIZE IS NOT HERE. EZ-2 of table T-040 (MUST) sets it from S-204,
  // which lives in the generated block below and is not in scope while this
  // object is being built -- `tooltipStyle` is where it is added, the shape
  // `helpStyle` already has for S-201.
  tooltip:
    `position:absolute;max-width:24em;padding:0.25em 0.5em;background:${PAINT.ground};` +
    `color:${PAINT.ink};border:1px solid ${PAINT.rule};pointer-events:auto;`,
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
 * so the ANSWER does not move: IF-9's fourth member reads back the entry a point
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
 * schedule instead of over it -- and `pageGroundStyle` below is what the shell
 * writes there. ⛔ Still not this unit's to WRITE: it never touches an element
 * it was not given (`mount`'s own note says so).
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
 * FR-041 (MUST): 「地の色を自分で塗ること（MUST）。閲覧環境のシステム色に委ねては
 * ならない（MUST NOT）」 and 「選んだ明暗を `color-scheme` として閲覧環境へ伝える
 * こと（MUST）」, for the one box that lies BEHIND the schedule.
 *
 * ⭐ RESOLVED HERE AND WRITTEN BY THE SHELL, which is the only split that keeps
 * both rules. The row and the two renderings are table T-236's and reach `src/`
 * through `SCREEN_COLOURS` alone, so stating them anywhere else would be a
 * second copy to keep in step (rule 03 section 1); the page element belongs to
 * SingleHtmlShell, and this unit writes on nothing it was not given. ⛔ So the
 * value crosses and the element does not.
 *
 * ⚠️ `color-scheme` IS WRITTEN AGAIN HERE, and it is not the same declaration
 * twice over. `themeStyle` tells it to this unit's own subtree so that the
 * surface stands up wherever it is mounted; the page element is where the
 * environment paints the window's own scrollbars and its default canvas, and
 * neither of those is inside this unit's root.
 *
 * ⛔ NO ANSWER IS KEPT FOR A MISSING ROW. Every other reader of
 * `SCREEN_COLOURS` may skip a row it cannot find and leave that one part
 * unpainted, but the ground has no such second best: FR-041 (MUST NOT) names
 * the environment's own colour as the thing that may not decide it, and a
 * `background` left off falls to exactly that. A generated block without S-146
 * is a build that shipped broken, which `npm run gen:check` is where to catch.
 *
 * @purity pure
 */
export function pageGroundStyle(theme: ScreenTheme): string {
  const ground = SCREEN_COLOURS[PAINT_ROW.ground]
  if (ground === undefined) {
    throw new Error(`table T-236 has no ${PAINT_ROW.ground}: rebuild with npm run gen`)
  }
  const chosen = theme.preference === 'dark' ? ground.dark : ground.light
  return (
    `color-scheme:${theme.preference};` +
    `background:${hued(chosen, ground.followsHue, theme.hue)};`
  )
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
 * a person can press, and IF-9's fourth member answers what `elementFromPoint`
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
/**
 * What marks the one ground HF-6 of table T-051 (MUST) lays under the row's
 * controls.
 *
 * ⛔ NOT A `data-role` AND NOT A `data-icon`. Table T-103 holds no part for it
 * and table T-109 no entrance: it is a painted box and nothing a person can
 * press, so borrowing either name would answer `readScreenPartAt` with a part
 * that was never described. ⭐ A mark of its own is the move `data-corner-band`
 * already makes for the band this unit infers -- what was drawn can be read back
 * and held against the specification (rule 04), without claiming to BE a row of
 * any table.
 */
const ROW_CONTROL_GROUND_MARK = 'data-row-control-ground'

/**
 * What marks HF-14's name field for the row that does not exist yet, and which
 * row it will stand under.
 *
 * ⛔ NOT A `data-role` AND NOT A `data-icon`, for the reason
 * `ROW_CONTROL_GROUND_MARK` above gives: table T-103 holds no part for it and
 * table T-109 no entrance -- the entrance is IC-91, the control that opened it.
 * ⭐ It carries the parent's `TaskGroup.id` rather than merely saying that the
 * field is up, so that what this unit believed about the pending row can be read
 * back and held against the description (rule 04).
 * ⛔ IT IS NOT `data-group-id`. That attribute is what `readScreenPartAt` walks
 * to answer WHICH ROW a press was on, and this field stands on no row -- writing
 * it here would make a press in the field report the parent as the row pressed.
 */
const NEW_ROW_NAME_MARK = 'data-new-row-under'

/**
 * What marks the grab strip GR-20 of table T-023d lays along a row's left edge.
 *
 * ⛔ NOT A `data-icon`, AND THAT IS MEASURED RATHER THAN CHOSEN. Table T-109
 * holds no row for a grab strip -- it is no entrance, it carries no shape of
 * figure F-019, and nothing about it is pressed -- so writing one here would
 * answer `readScreenPartAt` with a row of that table that does not exist. ⭐ The
 * exact precedent is `data-panel`: U-24 `Panel Divider` is not in table T-109
 * either, and the band FR-052's drag is taken on is marked and read back the
 * same way. ⚠️ `ScreenPart.isRowGrabStrip` is the member this arrives on.
 *
 * ⛔ NOT A `data-role` EITHER. Table T-103 gives U-47 to the expander and U-48
 * to the pin and holds no part for a strip, and U-23 (MUST) has the panel name
 * an operation drawn on it -- so the walk takes the role from the row's panel,
 * exactly as it does for IC-91 and IC-82.
 * ⛔ AND NOT `data-group-id`. The row this strip sits in already carries the
 * key, and the walk takes the innermost one on its way up -- a copy here would
 * state one row's key in two places.
 */
const ROW_GRAB_STRIP_MARK = 'data-row-grab'

/**
 * How HF-14's name field is drawn: on the grid the rows are drawn on, set in one
 * step deeper than its parent, and taking the ordinary ink of the panel.
 *
 * ⭐ THE SAME BOX A ROW TAKES, which is what 「その場で打たせる」 means here: the
 * person types where the name is going to be read. ⚠️ The indent is the row's
 * own left padding, exactly as `rowTitleElement` sets it -- see
 * `newRowNameEntryBox` for where that step comes from and why it is derived.
 *
 * @purity pure
 */
function newRowNameEntryStyle(box: ScreenRect, indentPx: number): string {
  // ⚠️ A HEIGHT OF NONE IS THE PANEL THAT DREW NO ROW, and there the field takes
  // the height the environment's own text gives it: no row of the specification
  // states a row's height for a row that does not exist yet, and FR-042 lets
  // every row carry its own (AT-59), so there is nothing to copy. ⛔ Inventing
  // one would put the field at a size no row is drawn at.
  const placed =
    box.height > 0
      ? boxStyle(box)
      : `position:absolute;left:${box.x}px;top:${box.y}px;width:${box.width}px;`
  return (
    placed +
    'box-sizing:border-box;font:inherit;pointer-events:auto;' +
    `padding:0 0 0 ${indentPx}px;` +
    `background:${PAINT.panel};color:${PAINT.ink};border:0;outline:0;`
  )
}

const ROW_CONTROL_SHOWN_CSS =
  `[data-unit="${UNIT_ROW}"] [data-role="${ROLE.rowExpander}"],` +
  `[data-unit="${UNIT_ROW}"] [data-role="${ROLE.rowPin}"],` +
  `[data-unit="${UNIT_ROW}"] [${ROW_CONTROL_GROUND_MARK}],` +
  `[data-unit="${UNIT_ROW}"] [data-icon="${ADD_CHILD_ROW_ENTRY}"],` +
  `[data-unit="${UNIT_ROW}"] [data-icon="${DELETE_ROW_ENTRY}"]` +
  '{visibility:hidden;}' +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [data-role="${ROLE.rowExpander}"],` +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [data-role="${ROLE.rowPin}"],` +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [${ROW_CONTROL_GROUND_MARK}],` +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [data-icon="${ADD_CHILD_ROW_ENTRY}"],` +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [data-icon="${DELETE_ROW_ENTRY}"]` +
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
 * (S-149, `PAINT.rule`), and FR-053 asks
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
 * join the specification admits -- so the element an explanation is placed
 * against is found again after a redraw, and only while the anchor is the same.
 *
 * @purity pure
 */
function anchorKey(anchor: TooltipAnchor): string {
  if (anchor.kind === 'icon') return `icon ${anchor.icon}`
  // ⚠️ EZ-6's Task is drawn into the schedule's picture, which goes up over
  // IF-1 -- so this key never finds an element here, and the description
  // carries the point instead (`Tooltip.at`). It is still built, because it is
  // what tells one Task's explanation from another's between frames.
  if (anchor.kind === 'task') return `task ${anchor.taskUid}`
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

// ---------------------------------------------------------------- semi-pure --
//
// ⚠️ ITS OWN SECTION, BETWEEN THE PURE ONES AND THE BUILDERS, because R7.7 of
// the review standards orders the members pure -> semi-pure -> non-pure and the
// header above states that everything under it is pure. One member stands here,
// and what it reads from the outside is named in its own note.

/**
 * The stamp AT-129 holds, read in the zone the person reading it is in.
 *
 * ⭐ WHY THE DRAWING SIDE CONVERTS AND THE SEAM DOES NOT. `AutosaveStatus.at`
 * goes on carrying the spelling AT-129 fixes -- ISO 8601, UTC, to the second --
 * so nothing on IF-9 moves and no value of table T-065 changes shape. FR-061
 * (MUST) asks only that the saved state be shown 「時刻を併記」 and settles
 * neither a zone nor a spelling, which leaves what a READER is shown to this
 * side.
 * ⭐ AND THE ZONE IS THE READER'S BECAUSE THAT IS WHAT THE ONE ROW WHICH DOES
 * SETTLE A ZONE ASKS FOR: FR-046 (MUST) has today's date be 「読む人の機のロー
 * カルの暦の日」 and (MUST NOT) forbids UTC's. `readToday` in the shell is built
 * from the local getters for that row; this is the same reading of the same
 * question, one requirement over.
 *
 * ⛔ THE TRAILING `Z` IS DROPPED BECAUSE IT IS A CLAIM AND NOT A DECORATION:
 * that letter says "this is UTC", and after the conversion the claim is false.
 * ⚠️ An offset is not put in its place either -- that is the other half of the
 * same undecided spelling (PD-325), and writing one would settle it here.
 *
 * ⛔ NO WORD IS PRINTED, IN EITHER DISPLAY LANGUAGE. FR-038 (MUST NOT) keeps one
 * dictionary as the only store of translated strings, and a month or a weekday
 * spelled here would be a second one -- so the shape stays AT-129's own, with
 * the `T` opened out, and comes out the same in `ja` and in `en`.
 *
 * ⚠️ A STAMP THIS CANNOT READ IS HANDED BACK UNTOUCHED rather than replaced:
 * the local getters of an unreadable date answer `NaN`, and `NaN-NaN-NaN` reads
 * as a time to anyone glancing at the header.
 * ⚠️ The `+ 1` on the month is the host's own numbering (`getMonth` counts from
 * zero) and not a figure of the specification's -- the same note `readToday`
 * carries.
 *
 * @provisional PD-325
 * @purity semi-pure-b
 */
function readableStamp(utc: string): string {
  const foundAt = new Date(utc)
  if (Number.isNaN(foundAt.getTime())) return utc
  const padded = (part: number, width: number): string => String(part).padStart(width, '0')
  const year = padded(foundAt.getFullYear(), 4)
  const month = padded(foundAt.getMonth() + 1, 2)
  const day = padded(foundAt.getDate(), 2)
  const hour = padded(foundAt.getHours(), 2)
  const minute = padded(foundAt.getMinutes(), 2)
  const second = padded(foundAt.getSeconds(), 2)
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
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
 * entry it sits in (S-147 of table T-236, or FR-029's faint S-149) and brings no
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
 * and by IF-9's fourth member alike.
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
 * while the dictionary holds no word (PD-160), which is the same fallback the
 * body took while there were no shapes.
 * ⚠️ WHAT USED TO STAND HERE ADDED 'every cell is still empty', AND THAT WAS
 * MEASURED FALSE ON 2026-08-28: `display-words.json` carries a word in both
 * languages for every one of table T-109's rows, with none left blank. ⭐ The
 * fallback stays for the reason UF-65 keeps its own -- a generated file edited
 * by hand -- and no count is written here, which is what went stale.
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
  // ⭐ THE FILL IS APPENDED AND NEVER A THIRD WHOLE STYLE. Table T-237's states
  // and FR-029's faint state are different facts about one entrance -- an entry
  // can be armed whether or not it can be used now -- so a style per
  // combination would be eight where two and one override do.
  //
  // ⭐ WHICH ROWS OF TABLE T-237 STAND IS DECIDED HERE; WHICH ONE WINS IS NOT.
  // That order is the table's own (「上の行が勝つ」) and `entranceStateFill`
  // keeps it once, so no caller may reach a different answer by testing the
  // flags in a different order.
  // ⛔ NEITHER ROW IS OFFERED FOR AN ENTRANCE DRAWN FAINT. FR-029 (MUST NOT):
  // 「上の薄く描く入口には当ててはならない」 -- an entrance that is in effect and
  // can change nothing reports only that it can change nothing.
  // ⚠️ THAT NOW REACHES THE ARMED ENTRY AS WELL. While the rim was FR-053's own
  // rule it was drawn on the faint entry too; the fill is FR-029's, and that
  // requirement's MUST NOT governs every row of the table.
  // ⚠️ `isPressed` IS OFFERED AS EN-2 AND COULD BE EN-4. FR-049 makes a toggle
  // of every boolean row of table T-202 (EN-2) and FR-072 shows the properties
  // panel's state on IC-17 (EN-4), and both cross this seam as the one flag
  // `CommandItem.isPressed` -- the description never says which. ⛔ Nothing is
  // invented to tell them apart: the two rows state the SAME colour, and the
  // only row between them (EN-3) falls on a row control that is never a
  // `CommandItem` at all, so the drawing is the same either way.
  // ⛔ Written as flat steps and never as one nested condition, which rule 03
  // section 4 of docs/development-rules refuses.
  const base = item.isEnabled ? entryStyle() : entryFaintStyle()
  const standing: EntranceStateRow[] = []
  if (item.isEnabled && item.isArmed) standing.push('EN-1')
  if (item.isEnabled && item.isPressed) standing.push('EN-2')
  const entry = made(host, 'button', base + entranceStateFill(standing))
  entry.setAttribute('type', 'button')
  // The join table T-109 admits, and what PD-141 has the shell read back.
  entry.setAttribute('data-icon', item.icon)
  entry.setAttribute('data-enabled', String(item.isEnabled))
  entry.setAttribute('data-pressed', String(item.isPressed))
  // ⭐ WRITTEN FOR EVERY ENTRY, unlike `aria-pressed` below: this one is not an
  // announcement but the same read-back path `data-enabled` and `data-pressed`
  // are on, and an attribute only the armed entry carried could not be told
  // from an entry the description never reached.
  entry.setAttribute('data-armed', String(item.isArmed))
  // FR-029 (MUST): faint and still reachable, never quiet.
  if (!item.isEnabled) entry.setAttribute('aria-disabled', 'true')
  // ⚠️ Only when it IS on: `isPressed` is a toggle that is on, and writing
  // `aria-pressed="false"` on every entry would announce each of them as a
  // toggle -- FR-065's IC-20 and FR-072's IC-17 are the ones that are.
  if (item.isPressed) entry.setAttribute('aria-pressed', 'true')
  // ⛔ WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`, the same way UF-65 writes
  // the fallback it reads out of the dictionary: those two read an empty word
  // as absent, which PD-160 says are different things. ⚠️ What used to stand
  // here said empty was the state every cell is in today; measured against
  // `display-words.json` on 2026-08-28, no cell is.
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

  // FR-101 (MUST): the name of the open file, and the time it was last written
  // to, with the name ABOVE the time. The two are one box so that the order is
  // the box's own rather than two independently placed parts.
  const fileStatus = part(host, 'span', ROLE.fileStatus, STYLE.fileStatus)
  const fileName = part(host, 'span', ROLE.openedFileName, STYLE.openedFileName)
  // ⛔ NOTHING IS SUBSTITUTED FOR A DOCUMENT THAT IS OPEN FROM NO FILE. FR-101
  // asks for a substitute for the TIME alone, and an empty name line makes no
  // claim; a word here would have to be invented.
  fileName.textContent = items.openedFileName
  fileStatus.append(fileName)
  const savedAt = part(host, 'span', ROLE.fileSavedAt, STYLE.fileSavedAt)
  // ⭐ SHOWN IN THE READER'S OWN ZONE, HELD IN UTC. `readableStamp` carries both
  // halves of why; what matters here is that the value the description brought
  // is untouched, and only what a person LOOKS at was converted.
  // ⚠️ THE WORD FOR "never written" IS NOT MADE HERE (FR-038, MUST NOT): the
  // description brings it already in the language the session is on.
  savedAt.textContent =
    items.fileSavedAt === null
      ? items.fileNeverSavedText
      : readableStamp(items.fileSavedAt)
  fileStatus.append(savedAt)

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

  header.replaceChildren(title, fileStatus, commands)
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
 * column, so the row id is the accessible name -- the only join that table
 * admits, and the same fallback `commandEntry` takes.
 * ⛔⛔ AND THE REASON GIVEN FOR IT WAS MEASURED FALSE ON 2026-08-28. What stood
 * here said the dictionary holds no word for these three rows yet; it holds one
 * in both languages for IC-58, IC-59 and IC-60, as it does for every row of that
 * table. ⚠️ So these three controls are announced by row id while a word for
 * them exists, and the row id is no longer a fallback but the only thing tried.
 * ⛔ NOT CLOSED HERE: the words live in ScreenRenderer's own generated file,
 * which Chapter 5.3 (MUST NOT) keeps this folder out of, and nothing on IF-9
 * carries a word for a row control -- `RowTitle` has no member for one.
 *
 * ⛔ WITHOUT A BODY THE CONTROL CANNOT BE PRESSED AT ALL. An empty `button`
 * with no length of its own collapses to zero height, so every entrance drawn
 * here would be unreachable by pointer and by IF-9's fourth member alike -- which
 * is the supply that table T-065 promises above, made undeliverable by having
 * nothing to hit. ⚠️ That is why the shape carries a box of its own
 * (`glyphStyle`) rather than being left to size itself, and that box is the one
 * every other surface draws in (FR-029, MUST NOT).
 *
 * ⭐ LEVEL WITH THE TOP OF THE NAME, WHICH IS HF-5 OF TABLE T-051 (MUST). That
 * row levels the controls with the name's top edge and forbids both centring
 * them and setting them down from it (MUST NOT), so nothing is added here: the
 * row's own `align-items:flex-start` is the whole of the placement.
 * ⛔ THE SET-DOWN THIS FUNCTION USED TO TAKE IS GONE, and the STOP that stood
 * here with it. That amount was a proportion of a size the drawn name does not
 * have -- `STYLE.rowLabel` sets none, so a name is drawn in the environment's
 * text size -- and the row it came from (S-139) is retired (利用者の裁定,
 * 2026-08-25).
 *
 * @purity non-pure
 */
/**
 * How far apart the row's seven controls stand, measured from the row's right
 * edge outward -- the pin nearest it, then IC-82, IC-91, IC-58, IC-77, IC-90,
 * IC-59.
 *
 * ⭐⭐ THE ORDER IS RULED AND NO LONGER TABLE T-109's PRINT ORDER (利用者の裁定
 * 2026-08-30). HF-4 (MUST): 「折り畳みの 4 つ（`HF-1` の格子）、足す、消す、
 * ピン止めの順に、左から右へ置くこと」, and HF-1 (MUST) fixes the four inside that
 * lattice: 「並びは 2 × 2 の格子とすること —— 左から 隠す・1 階層開く・配下を
 * すべて畳む・配下をすべて開く」. ⇒ Left to right: IC-59, IC-90, IC-77, IC-58,
 * IC-91, IC-82, IC-60.
 * ⭐ WHAT THE LATTICE MEANS, in HF-1's own words: 「上下に読めば動作、左右に読めば
 * 範囲」 -- IC-59 / IC-90 are the near pair (this row, one level) and IC-77 /
 * IC-58 the far pair (the whole subtree), each pair folding then opening. ⛔
 * 「1 本と 2 本を混ぜて並べてはならない（MUST NOT）」 -- the two shapes may not be
 * interleaved, which is exactly what the old print order did.
 * ⛔ HF-4's TWO FIXED ENDS ARE UNCHANGED: the pin is 「いちばん外（右端）」 and
 * 「足すと消すのあいだに他の操作子を挟んではならない（MUST NOT）」, since 「枠つきの
 * `＋` と `×` は対として読ませるものである」.
 *
 * ⭐ THE TWO PANEL-WIDE ENTRANCES STEP BY THE SAME AMOUNT (IC-74 and IC-78; see
 * `panelCornerEntryElement`), because it is the same quantity: two controls of
 * one glyph box standing side by side.
 *
 * ⛔ IN `em`, NOT PIXELS. FR-039 carries the reader's own text size through the
 * panel (S-197), and a gap in pixels would leave the controls behind the moment
 * a reader enlarged the text. ⚠️ It is a step, not a width: each control is
 * sized by its own glyph, and this is only where the next one starts.
 *
 * @provisional PD-348
 */
const ROW_CONTROL_RIGHT_EM = 1.25

/**
 * How far in from the row's right edge the NEAREST control stands.
 *
 * ⭐ HF-4's edge and not a step in from it -- see `rowControlRight`. ⚠️ Named
 * here for the reason `ROW_CONTROL_PAD_EM` is named: the ground HF-6 (MUST) lays
 * reaches from the leftmost control, so this term is read twice and may not be
 * written twice.
 *
 * @provisional PD-348
 */
const ROW_CONTROL_EDGE_EM = 0.25

/**
 * Where the control `stepsFromEdge` places from the row's right edge stands.
 *
 * ⭐ The row's own right padding is the first term, so the nearest control
 * sits exactly where the name's box ends -- HF-4's 「行見出しパネルの右端に
 * 揃えること（MUST）」 -- rather than a step in from it.
 *
 * @purity pure
 */
function rowControlRight(stepsFromEdge: number): string {
  return `right:${rowControlRightEm(stepsFromEdge)}em;`
}

/**
 * The same distance as a number, which the ground below needs and a declaration
 * cannot be asked for.
 *
 * ⭐ ONE ARITHMETIC AND NOT TWO. HF-6 (MUST) runs the ground 「いちばん左の操作子
 * の左端から行の右端まで」, so where that control stands and how wide the ground
 * is are two readings of one number -- and a second copy of it would drift the
 * day PD-348 is ruled on.
 *
 * @purity pure
 */
function rowControlRightEm(stepsFromEdge: number): number {
  return ROW_CONTROL_EDGE_EM + ROW_CONTROL_RIGHT_EM * stepsFromEdge
}

/**
 * Which step from the row's right edge each of the seven controls stands at.
 *
 * ⭐ NAMED RATHER THAN COUNTED AT EACH CALL, and the reason is the ground: HF-6
 * (MUST) reaches the LEFTMOST control's left edge, so the width of that band and
 * the placement of that control have to name the same step. ⚠️ The order itself
 * is HF-4's ruling of 2026-08-30 and is not chosen here -- the declaration above
 * carries it word for word.
 *
 * ⭐⭐ THE PIN STANDS AT THE EDGE AND THE DELETION ONE STEP IN, WHICH IS HF-4
 * (MUST): 「**ピン止めの操作子（表 T-109 の `IC-60`）を、並びのいちばん外（右端）
 * に置くこと**」（利用者の裁定 2026-08-30）. ⛔ The two reasons are that row's
 * own: 「**削除（`IC-82`）がいちばん外に在ると、右から流し込んだポインタが最初に
 * 触るのが削除になる**」 and 「**押す頻度はピンのほうが高く、削除は一度きりで
 * ある**」. ⚠️ Until 2026-08-30 `remove` held step 0 and this table carried a
 * note saying the swap was HF-4's own repair; the repair is done here because
 * the row is a MUST and the entrance count moving from five to seven is what
 * made the wrong one reachable on every row.
 *
 * ⚠️ AND THE REST OF THE ORDER IS RULED TOO SINCE 2026-08-30. The sentence
 * 「本行が定めるのはこの 1 つだけであり、ほかの操作子の前後は定めない」 still stands
 * in HF-4, and the ruling printed after it settles the whole left-to-right run
 * -- so nothing here is invented and table T-109's print order is no longer
 * what the row is read by.
 */
const ROW_CONTROL_STEPS = {
  /** IC-58 -- HF-2, which is HR-3: the whole subtree opens. */
  open: 3,
  /** IC-59 -- HF-3, which is HR-6 since 2026-08-30: the row is hidden. */
  close: 6,
  /** IC-77 -- HF-11, which is HR-4: the whole subtree folds. */
  closeBelow: 4,
  /** IC-90 -- HF-13, which is HR-7 of table T-015. */
  openOneLevel: 5,
  /** IC-91 -- HF-14, which is HR-8. */
  addChild: 2,
  /** IC-82 -- one step in from the edge, so a pointer meets the pin first. */
  remove: 1,
  /** IC-60 -- the outermost, which HF-4 (MUST) fixes. */
  pin: 0,
} as const

/**
 * The one ground HF-6 of table T-051 (MUST) lays under the row's controls while
 * they are drawn.
 *
 * ⭐ ONE BOX FOR ALL OF THEM (MUST NOT: 「操作子ごとに別々の地を敷いてはならない」)
 * -- the ruling of 2026-08-30 threw out a rounded box per control because the
 * row's name showed through the steps between them, and the controls stand ON
 * that name (the same row has them drawn 「行の名前の上へ重ねて」).
 * ⭐ THE COLOUR IS S-150 (MUST), which is `PAINT.panel` -- the colour the row
 * itself is already painted, so the band is not a plate that floats: what
 * changes is that the name's tail goes under the controls instead of through
 * them, and FR-085 already sends whoever wants the whole of it to FR-052.
 *
 * ⭐ THE EXTENT IS THE ROW'S, WHICH IS THE ROW (MUST): the row's right edge is
 * `right:0` -- the edge HF-4 pins the controls to -- and its height is `top:0`
 * with `bottom:0`, so a name set larger than the controls (S-36 / S-38 by depth)
 * cannot put its descenders out from under the band the way a band the height of
 * a control would.
 * ⛔ NO GAP BETWEEN THE CONTROLS IS WRITTEN HERE (MUST NOT), and none is needed:
 * the width is read out of where the leftmost control was placed, so whatever
 * PD-348 is ruled to be, the band follows it without being told.
 *
 * ⛔ IT TAKES NO ROOM. S-140 of table T-206 is 0 and stays 0: this is an
 * out-of-flow box like the controls it stands behind, so FR-085's cut of the
 * name is not moved by a pixel.
 * ⛔ IT TAKES NO POINTER EITHER. A box over the name that answered
 * `elementFromPoint` would put a part the description never carried under every
 * press near the row's right edge.
 * ⚠️ IT IS NOT IN THE EXPORT. EP-4 of table T-076 draws no row control, and the
 * export is not drawn by this unit at all -- what draws the band is the row that
 * draws the controls, so the two appear and vanish together.
 *
 * @purity pure
 */
function rowControlGroundStyle(leftmostStepsFromEdge: number): string {
  const side = NOT_STORED_ICON_SIZES['S-138']
  // The leftmost control's LEFT edge, measured from the row's right edge: where
  // that control's right edge stands, plus its own width -- its shape (S-138)
  // with `ROW_CONTROL_PAD_EM` on either side of it.
  const reach = rowControlRightEm(leftmostStepsFromEdge) + ROW_CONTROL_PAD_EM * 2
  return (
    'position:absolute;top:0;bottom:0;right:0;' +
    `width:calc(${reach}em + ${side}px);` +
    `background:${PAINT.panel};pointer-events:none;`
  )
}

/**
 * What marks the count HF-18 (MUST) shows on a row, and HF-12 at 段 0.
 *
 * ⛔ NOT A `data-icon` AND NOT A `data-role`: table T-109 holds no entrance for
 * a count -- nothing about it is pressed -- and table T-103 no part, so a mark
 * of its own is what lets what was drawn be read back (rule 04), exactly as
 * `data-corner-band` and `ROW_GRAB_STRIP_MARK` are.
 * ⭐ AND IT IS WHAT KEEPS THE COUNT OUT OF HF-6's HOVER RULE: that rule reaches
 * the row's controls by `data-role` and `data-icon`, and HF-18 (MUST NOT) says
 * the count is not one of them -- 「ポインタが乗っているあいだだけでは、抱えて
 * いる行を探して回ることになる」.
 */
const FOLDED_ROW_COUNT_MARK = 'data-folded-rows'

/**
 * How thick a band drawn on a row's edge is -- `S-213` of table T-206, in
 * pixels.
 *
 * ⭐⭐ ONE NUMBER FOR BOTH BANDS, which is what that row states in as many
 * words: HF-15's live axis and HF-18's holding mark are both 「行の辺に引く 1 本
 * の帯」 and have no reason to differ.
 * ⛔ THEY DID DIFFER UNTIL 2026-08-31 -- 2px for the axis and 3px for the
 * holding mark, both invented here because no row of the specification held
 * either. The sample draws both at 3.
 * ⛔ A FUNCTION AND NOT A CONSTANT, for the reason `rowControlRightEm`'s note
 * gives: the generated block that declares `NOT_STORED_ROW_BAND_SIZES` stands
 * at the foot of this file, and a module-level `const` would read it inside its
 * own temporal dead zone.
 *
 * @purity pure
 */
function rowBandPx(): number {
  return NOT_STORED_ROW_BAND_SIZES['S-213']
}

/**
 * How a row that HF-15's grab is holding is drawn: a ground under it, and one
 * band on each of the two edges the LIVE axis is named by.
 *
 * ⭐ THE BANDS ARE THE MUST (HF-15): 「いまどちらの軸が生きているかを、掴んでいる
 * 行に描くこと —— 上下の軸が生きているときは行の左右の辺に、左右の軸が生きている
 * ときは行の上下の辺に、帯を 1 本ずつ描くこと」, in S-151 (上下) and S-152 (左右).
 * ⛔ THE EDGES ARE CROSSWISE TO THE AXIS, which is what those words say: a grab
 * that moves the row UP AND DOWN is marked on the left and right edges, so the
 * band lies along the way the row is travelling rather than across it.
 * ⛔ WHY AT ALL: 「描かないと、動かせない向きへ引いたときに壊れた操作子と見分けが
 * つかない」 -- FR-029's RATIONALE, read on a drag.
 *
 * ⭐ THE GROUND IS A MUST WITH NO COLOUR (HF-15): 「掴んでいる行には地を敷くこと」,
 * because 「どれを持っているかが読めなくなる」. ⛔ NO ROW OF TABLE T-236 NAMES ONE.
 * Searched: HF-15, GR-20 and the preamble of table T-023d, table T-206 and table
 * T-236. ⇒ S-149 (「区切りの線」) is taken, as the one neutral screen colour that
 * says nothing else: S-151 and S-152 are spent on the bands by this very row,
 * S-152 / S-153 / S-154 are judgements about a schedule (良 / 注意 / 不良), and
 * S-183 is an entrance's state. ⚠️ Reported rather than settled here.
 *
 * @purity pure
 */
function rowGrabbedStyle(axis: 'position' | 'depth'): string {
  const paint = axis === 'position' ? PAINT.grabAxisPosition : PAINT.grabAxisDepth
  const band = `${rowBandPx()}px solid ${paint}`
  return (
    `background:${PAINT.rule};` +
    (axis === 'position'
      ? `border-left:${band};border-right:${band};`
      : `border-top:${band};border-bottom:${band};`)
  )
}

/**
 * How the count HF-18 (MUST) shows is drawn: the number, on a mark of its own.
 *
 * ⭐ ONE THING ANSWERING BOTH OF THAT ROW'S MUSTS. It asks for 「その行数を行に
 * 示すこと」 AND 「その行自身にも印を付けること」, and gives the reason for the
 * second: 「数だけでは、どの行が抱えているかを目で追うのに読む必要がある」. ⇒ The
 * number is set on a filled mark: the FILL is what a reader picks out without
 * reading, and the digits are the count. ⛔ A bare number would meet the first
 * MUST and not the second.
 * ⭐ THE FILL IS S-153 (MUST): 「注意であって不良ではない」. ⚠️ The digits take the
 * panel's own ground colour (S-150) so that they read as cut out of the mark --
 * ⛔ not a colour of their own: table T-236 names one colour for this and NFR-007
 * wants the two apart, and the panel's ground is the one that is light where
 * S-153 is dark and dark where it is light, in both renderings.
 *
 * @purity pure
 */
function foldedRowCountStyle(rightPx: string): string {
  const side = NOT_STORED_ICON_SIZES['S-138']
  // ⭐ A WORD BESIDE THE NAME, NOT A PAINTED TAB. HF-18 (MUST) puts the number
  // 「行の名前の隣に語として」 and (MUST NOT) refuses a painted tab -- 「行の名前
  // より目立つと、何の行かを読む前に数が目に入る」.
  // ⛔ IT WAS A FILLED PILL UNTIL 2026-08-30 -- an S-153 ground with the digits
  // knocked out of it, which is what that MUST NOT names.
  // ⭐ THE INK IS S-153 AND THE GROUND IS THE ROW'S OWN, so the count reads as
  // an aside rather than as a badge.
  //
  // ⚠️ `rightPx` IS AN `em` OFFSET AND THIS ELEMENT SETS ITS OWN `font-size`,
  // so the two resolve together: a step counted here is three quarters of a
  // step on the row. ⛔ THAT IS WHY THE COUNT MUST STAND AT STEP 0 and nowhere
  // else -- at the edge, three quarters of 0.25em is 1px out and invisible,
  // while at step 7 it was 37px out and over the row's name.
  return (
    'position:absolute;top:0;pointer-events:none;' +
    rightPx +
    `min-width:${side}px;height:${side}px;line-height:${side}px;` +
    'text-align:center;font-size:0.75em;white-space:nowrap;' +
    `color:${PAINT.caution};`
  )
}

/**
 * The mark HF-18 (MUST) puts before the number: U+25BE BLACK DOWN-POINTING
 * SMALL TRIANGLE, and one space after it.
 *
 * ⛔ NOT A DISPLAY WORD, for the reason `TRUNCATION_MARK` of `row-title-panel`
 * carries: FR-038 holds one dictionary per language and this mark is the same
 * one character in every one of them.
 * ⛔ AND NOT A GLYPH OF FIGURE F-019 (MUST NOT, HF-18's neighbour HF-15 states
 * the same for the grab mark): that figure holds the shapes of ENTRANCES, and
 * nothing about this count is pressed.
 * ⚠️ Written as a code point rather than typed, which is what rule 03 section 5
 * asks of a string the program prints.
 */
const FOLD_COUNT_MARK = '\u25be\u0020'

/**
 * The head's count, put back on the element that was built with the panel --
 * HF-12 (MUST): 「そのときは、頭にいま何行を畳み込んでいるかを示すこと」.
 *
 * ⚠️ THE SAME SHAPE THE ROWS USE -- the mark and the number -- and HF-12 states
 * no shape at all. The sample writes a phrase there instead (「・N 行を畳み込み
 * 中」), which its own panel is wide enough for and S-79's 170px is not.
 * @provisional PD-415
 *
 * ⛔ WRITTEN ON EVERY FRAME AND NOT ONCE, exactly as `markPanelCornerEntry` is
 * and for the same reason: the head's furniture is built with the panel and
 * never rebuilt, so what it SAYS has to be put on it again whenever the panel's
 * description moves.
 * ⚠️ A COUNT OF ZERO IS SHOWN AS NOTHING. HF-12 asks for the count 「そのときは」
 * -- when rows are folded away -- and a head holding none has nothing to say.
 *
 * @purity non-pure
 */
function markFoldedRowCount(mark: HTMLElement, count: number, rightPx: string): void {
  mark.setAttribute(FOLDED_ROW_COUNT_MARK, String(count))
  mark.textContent = FOLD_COUNT_MARK + String(count)
  mark.setAttribute('style', count > 0 ? foldedRowCountStyle(rightPx) : STYLE.hidden)
}

/**
 * The count itself, as an element -- HF-18 on a row, HF-12 at 段 0.
 *
 * @purity non-pure
 */
function foldedRowCountElement(host: Document, count: number, rightPx: string): HTMLElement {
  const mark = made(host, 'span', foldedRowCountStyle(rightPx))
  mark.setAttribute(FOLDED_ROW_COUNT_MARK, String(count))
  mark.setAttribute('aria-hidden', 'true')
  mark.textContent = FOLD_COUNT_MARK + String(count)
  return mark
}

/**
 * How the grab strip GR-20 of table T-023d is laid: 「行の左端に敷く掴み代」,
 * `S-138` wide, over the whole height of the row.
 *
 * ⭐ A FUNCTION AND NOT A MEMBER OF `STYLE`, for the reason
 * `rowControlGroundStyle` above is one: the width is `S-138`, which arrives in
 * the generated block at the foot of this file, and a `STYLE` member would read
 * that constant while the module was still evaluating.
 *
 * ⭐ THE WHOLE HEIGHT OF THE ROW AND NOT THE HEIGHT OF A GLYPH BOX. GR-20 says
 * the strip is laid 「行の左端に」 and gives a WIDTH alone -- so the other axis
 * is the row's, which `top:0;bottom:0` is. ⛔ Taking `S-138` on both axes would
 * be a square in the row's corner, and a person dragging the lower half of a
 * tall row (FR-042 lets a row be as tall as its lanes need) would miss it.
 *
 * ⛔ IT TAKES NO ROOM. Out of the flow, exactly as the controls and their ground
 * are, so FR-085's cut of the name is not moved by a pixel and the indent
 * `RowTitle.indentPx` states is the indent drawn. ⚠️ It therefore LIES OVER the
 * first `S-138` of the name on a root row; that is what 「行の左端に敷く」 asks
 * for, and table T-023d's preamble settles the collision in the strip's favour
 * -- a press there is the strip's, and the name is not an entrance in any case.
 *
 * ⭐⭐ IT IS PAINTED, AND SINCE 2026-08-30 THAT IS A MUST. HF-15: 「掴み代は常に
 * 描くこと（MUST）—— ⛔ `HF-6`（操作子はポインタが乗っているあいだだけ）の対象では
 * ない —— 掴めることが読めなければ、掴もうとする手が動かない」. ⛔ THE NOTE THAT
 * STOOD HERE LEFT IT `transparent`, on the reading that the paint was undecided
 * and the environment's own 掴む cursor was enough; measured on the shipped
 * build, the strip was invisible and there was nothing to move a hand towards.
 * ⚠️ WHICH COLOUR IS STILL NOT STATED. Searched: HF-15, GR-20 and the preamble
 * of table T-023d, FR-029, FR-085, table T-076 (EP-3 / EP-4), table T-206 and
 * table T-236. ⇒ S-149 (「区切りの線」) is taken, for the reason `rowGrabbedStyle`
 * gives at length: it is the one neutral screen colour that makes no claim of
 * its own. ⭐ It is not in the export either way -- EP-4 draws no row control,
 * and the export is not drawn by this unit at all.
 * ⚠️ `cursor:grab` and not `move`: what the strip offers is being HELD, the
 * distinction `paletteGrabBand` already draws.
 *
 * @purity pure
 */
function rowGrabStripStyle(): string {
  const width = NOT_STORED_ICON_SIZES['S-138']
  // ⭐ A SMALL MARK, NOT A PAINTED BAND. HF-15 (MUST) draws the strip 「掴める
  // ことを表す小さな印として」 and (MUST NOT) refuses to paint its ground --
  // 「行の高さいっぱいに地を塗ると、日程より掴み代が目立つ」.
  //
  // ⭐⭐ AND IT STANDS IN THE ROW'S OWN FLOW, JUST BEFORE THE NAME. GR-20
  // (MUST): 「行の左端とは、その行の字下げの後ろである。掴み代は行の名前の直前
  // に立ち、段の字下げとともに動くこと」, and (MUST NOT): 「パネルの左端に揃えて
  // はならない —— 揃えると、どの段の行を掴んでいるのかが掴み代から読めない」.
  // ⛔ IT WAS `position:absolute;left:0` UNTIL 2026-08-30, so every row's strip
  // stood at the panel's edge whatever its depth.
  //
  // ⭐ THE HEIGHT IS ONE LINE, WHICH IS THE NAME'S. HF-15 (MUST) puts the mark
  // 「行の名前と同じ高さに」 and (MUST NOT) spreads it over the row's box --
  // 「行の高さは `FR-042` で行ごとに違い、広げると印が名前の行から離れていく」.
  // ⛔ IT WAS `top:0;bottom:0` and centred in a box measured at 64 to 148px.
  //
  // ⚠️ THE WIDTH IS STILL `S-138` -- what GR-20 fixes and what a hand aims at.
  return (
    `flex:none;width:${width}px;cursor:grab;pointer-events:auto;` +
    'text-align:center;' +
    `color:${PAINT.rule};font-size:0.75em;user-select:none;`
  )
}

/**
 * @purity non-pure
 */
function rowControlElement(
  host: Document,
  role: string | null,
  icon: string,
  canAct: boolean,
): HTMLElement {
  // FR-029 (MUST): faint while there is nothing this control could change.
  const style = canAct ? STYLE.rowControl : STYLE.rowControl + STYLE.rowControlFaintInk
  // ⛔ `null` IS A CONTROL TABLE T-103 NAMES NO PART FOR, and it is not an
  // omission: IC-82 and IC-91 make and unmake a row rather than folding one, so
  // neither belongs to U-47 `Row Expander` or U-48 `Row Pin`, and claiming
  // either name would answer `readScreenPartAt` with a part that was never
  // described. ⭐ The walk still answers 「行見出しパネルの `IC-91`」 for such a
  // control, because it takes `data-role` from the panel it sits in and
  // `data-icon` from the control itself.
  const control = role === null ? made(host, 'button', style) : part(host, 'button', role, style)
  control.setAttribute('type', 'button')
  control.setAttribute('data-icon', icon)
  control.setAttribute('aria-label', icon)
  // ⛔ `aria-disabled` AND NEVER `disabled`, which FR-029 (MUST NOT) now states
  // as a rule rather than leaving it to this file: a disabled control stops
  // taking the press, and the press is the one moment that requirement (MUST)
  // has the reason told. ⭐ The same bargain `commandEntry` keeps, and the same
  // one `entryFaintStyle` sets out at length.
  if (!canAct) control.setAttribute('aria-disabled', 'true')
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
  // PD-152 closed: the indent is `RowTitle.indentPx`, which is the very product
  // FR-085 subtracted before cutting the name, so the cut and the indent are one
  // number. It used to be one em worked out here, which agreed with neither the
  // cut nor the export -- the same row was set in three different ways.
  const row = made(
    host,
    'div',
    // ⛔ THE INSET IS THE INDENT AND NOTHING ELSE, so the room the name is
    // given here is the very number FR-085 cut it against:
    // `rowTitlePanelWidth` less `depth` x `rowTitleIndent` less S-140, which is
    // 0. A padding of its own on either side used to make the DOM 8px meaner
    // than the judgement, and the browser's own ellipsis took the difference --
    // silently, because `isLabelTruncated` records FR-085's cut and not this
    // one, so no tooltip was raised for what it ate.
    boxStyle(title.box) +
      STYLE.rowTitle +
      `padding:0 0 0 ${title.indentPx}px;` +
      // HF-15 (MUST): the row a hand is holding carries a ground and the band
      // that says which axis is live. ⛔ Nothing is drawn on any other row --
      // `RowTitle.heldOnAxis` is filled for the held row alone.
      (title.heldOnAxis == null ? '' : rowGrabbedStyle(title.heldOnAxis)),
  )
  if (title.heldOnAxis != null) row.setAttribute('data-held-axis', title.heldOnAxis)
  // ⚠️ A PINNED ROW TAKES NO GROUND OF ITS OWN. FR-098 (MUST) asks that the
  // pinned rows be readable 「行を一覧しただけで」 and says the rule is HF-6's --
  // which is the pin's own always-drawn fill (EN-3, S-151), and that is what is
  // drawn here. The sample tints the whole row as well.
  // @provisional PD-414
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

  // GR-20 of table T-023d: 「行の左端に敷く掴み代」, which HF-15 of table T-051
  // (MUST) has a person grab to move the row.
  //
  // ⛔⛔ NOT ON A PINNED ROW, AND THAT IS A MUST NOT. GR-20: 「ピン止めしている
  // 行は掴めないこと（MUST NOT）」 -- FR-098 (MUST) lifts a pinned row out of the
  // scrolling list and holds it at the head of the panel, so 「上げられた位置で
  // 掴むと、木の順ではなく描く順を触ることになる」. ⭐ THE ONE TEST COVERS BOTH
  // COPIES because there is only ever one: FR-098 (MUST NOT) forbids the same
  // row to be drawn at its natural place as well, so a row whose `isPinned` is
  // true is drawn in the band and nowhere else.
  // ⛔ `isPinned` OF THE ROW AND NOT THE `isPinned` ARGUMENT. That argument says
  // which LIST this element is being built for, and the row's own state is what
  // GR-20 speaks of -- reading the argument would leave the strip on a pinned
  // row that some later reading drew in the scrolling list.
  // ⭐ THE REFUSAL IS THE DRAWING SIDE'S AND COULD BE NOWHERE ELSE. The pin is
  // `ScreenSession`'s (S-126 of table T-203 keeps it out of the document), so
  // the translator that answers the press cannot see it; drawing no strip is
  // what makes the point unreachable, which is what 「掴めない」 says.
  if (!title.isPinned) {
    const grab = made(host, 'div', rowGrabStripStyle())
    grab.setAttribute(ROW_GRAB_STRIP_MARK, 'true')
    // ⭐ THE MARK ITSELF -- two vertical ellipses, which is what the working
    // sample draws and what HF-15 (MUST) asks for as 「掴めることを表す小さな
    // 印」. ⛔ It carries no row of table T-109 and no glyph of figure F-019,
    // because GR-20 is a grab area and not an entrance.
    // ⚠️ `aria-hidden`: it is decoration on a box that already takes the
    // pointer.
    grab.textContent = '⋮⋮'
    grab.setAttribute('aria-hidden', 'true')
    row.append(grab)
  }

  const label = made(host, 'span', STYLE.rowLabel)
  // ⛔ `null` is a row FR-058 leaves with no name at all -- a document that
  // broke that requirement, or a derivation whose `Task` carries none. Nothing
  // is invented in its place.
  label.textContent = title.label

  // HF-6 of table T-051 (MUST): 「描いているあいだ、操作子の下に地を 1 枚敷くこと」.
  //
  // ⭐ BEFORE EVERY CONTROL IN TREE ORDER, which is the whole of what puts it
  // BEHIND them: this band and the five controls are all out of the flow and
  // none of them takes a `z-index`, so they paint in the order they are added
  // and the one added first is the one under the rest.
  // ⭐ AND STILL OVER THE NAME, though it is added BEFORE it: the name is an
  // in-flow inline box and every one of these is positioned, and a positioned
  // box paints over in-flow content whatever the tree order -- which is the very
  // overlap HF-6 has the controls drawn 「行の名前の上へ重ねて」 and this band
  // exists to make readable.
  // ⛔ NOT ADDED BETWEEN THE NAME AND THE CONTROLS. HF-4 (MUST) is read off this
  // row as 「the controls are its last children and the cell before them is the
  // name」, and a box slipped in there would stand where the name is looked for.
  //
  // ⭐ HOW FAR LEFT IT REACHES IS THE LEFTMOST CONTROL THAT IS ACTUALLY DRAWN,
  // and on a row with nothing under it that is the pin: HF-1 puts the folding
  // controls only on a row that has something below it, so a band drawn to
  // IC-58's step on a leaf row would cover a stretch of the name no control
  // stands on.
  const ground = made(
    host,
    'div',
    rowControlGroundStyle(
      // ⚠️ THE LEFTMOST IS IC-59 SINCE HF-4's RULING OF 2026-08-30 -- 「左から
      // 隠す・1 階層開く・配下をすべて畳む・配下をすべて開く」 -- so the band reaches
      // that control's step and not IC-58's, which now stands fourth from the
      // left. ⛔ A band drawn to the old step would leave IC-59 and IC-90
      // standing on the bare name, which is the very overlap HF-6 lays it for.
      title.expander !== null ? ROW_CONTROL_STEPS.close : ROW_CONTROL_STEPS.openOneLevel,
    ),
  )
  ground.setAttribute(ROW_CONTROL_GROUND_MARK, 'true')
  ground.setAttribute('aria-hidden', 'true')
  row.append(ground)
  row.append(label)

  // ⭐ THE NAME FIRST AND THE FIVE CONTROLS AFTER IT, WHICH IS HF-4 OF TABLE
  // T-051 (MUST): 「行の名前の長さにかかわらず、操作子を行見出しパネルの右端に
  // 揃えること」. The name takes the leftover (`STYLE.rowLabel`), so the group
  // ends at the panel's edge whatever the name is and whatever the row's depth
  // -- the depth is the row's own left padding and moves the name alone.
  //
  // ⚠️ HF-4 FIXES THE EDGE AND NOT THE ORDER, so the order is the
  // specification's own print order and not a choice made here: HF-2 (IC-58)
  // before HF-3 (IC-59) because HF-1 counts the opening control first, and the
  // `Row Pin` after both because FR-098 is where it is written and table T-109
  // prints IC-60 after them.
  //
  // U-47 `Row Expander`, drawn as the THREE controls the specification counts.
  //
  // ⭐ HF-1 of table T-051 puts an opening control, a control that folds the row
  // itself and one that folds everything under it on a row; U-47 of table T-103
  // counts the three as one part, and table T-109 gives them a row EACH --
  // IC-58 opens the subtree (HF-2, which is HR-3), IC-59 folds the row itself
  // (HF-3, HR-5) and IC-77 folds the subtree (HF-11, HR-4). ⛔ They are NOT one
  // control in three states: the operations differ in reach, so one can be spent
  // while the others are not, which is why `RowExpander` carries three flags.
  //
  // ⚠️ The order is the specification's own print order (IC-58, IC-59, IC-77):
  // a table's order is kept in the code that follows it, because a reader who
  // knows the table reads this list against it.
  //
  // ⛔ `null` is a row with nothing under it, and neither half is drawn then --
  // that judgement is `expanderOf`'s (UF-63) and is not repeated here.
  //
  // ⭐ THE STOP THAT STOOD HERE IS CLOSED, and by the requirement rather than by
  // this file. It read 「how a SPENT half is drawn ... no row says what then」;
  // FR-029 now (MUST) draws an entrance faint 「押しても、いま文書にも画面にも何も
  // 変えられないとき」 in S-149, (MUST NOT) leaves it disabled in the host's own
  // sense, and (MUST) tells the reason only when it is PRESSED -- and it reaches
  // 「表 T-109 の全行」, so the row controls take the palette's answer instead of
  // being an exception to it. `canOpen` / `canClose` / `canCloseBelow` are that
  // condition, one per control, exactly as `RowExpander` declares them.
  // ⚠️ THE FLAGS STAY ON THE DOM AS WELL. They were put there for whoever
  // settled the look; they are now also what the look is read back against.
  //
  // ⭐ THE STOP THAT STOOD HERE IS CLOSED, AND ON THE OTHER SIDE OF THE SEAM.
  // It read 「NOT WIRED HERE ... the telling FR-029 (MUST) raises when such a
  // control IS pressed」, and the reading was right: nothing on this side raises
  // a telling. The press leaves through `readScreenPartAt`,
  // `input-command-translator.ts` answers it with `tellEntryHasNothingToDo`, and
  // `frame-loop.ts` raises RS-27 of table T-233 in table T-037's manner NT-1.
  // ⛔ SO WHAT THIS SIDE OWES IS STILL ONLY THAT THE ENTRANCE STAY PRESSABLE:
  // `aria-disabled` and never `disabled`, which FR-029 (MUST NOT) now states as
  // a rule -- a disabled control takes no press, and the press is the one moment
  // the reason is told.
  if (title.expander !== null) {
    const open = rowControlElement(host, ROLE.rowExpander, 'IC-58', title.expander.canOpen)
    open.setAttribute('data-can-open', String(title.expander.canOpen))
    // ⚠️ Placed from the RIGHT, because that is the edge HF-4 pins them to and
    // they no longer sit in the flex flow that used to do it.
    open.setAttribute(
      'style',
      open.getAttribute('style') + rowControlRight(ROW_CONTROL_STEPS.open),
    )
    row.append(open)

    const close = rowControlElement(host, ROLE.rowExpander, 'IC-59', title.expander.canClose)
    close.setAttribute('data-can-close', String(title.expander.canClose))
    close.setAttribute(
      'style',
      close.getAttribute('style') + rowControlRight(ROW_CONTROL_STEPS.close),
    )
    row.append(close)

    // IC-77 -- HF-11 (MUST): the row's 配下 folds, and the row itself does not
    // (MUST NOT). ⭐ The third control HF-1 counts since the ruling of
    // 2026-08-30; until then HR-4 of table T-015 had no entrance at all.
    // ⚠️ Its own flag and not `canClose` inverted: `RowExpander` says why the
    // two are not inverses.
    const closeBelow = rowControlElement(
      host,
      ROLE.rowExpander,
      'IC-77',
      title.expander.canCloseBelow,
    )
    closeBelow.setAttribute('data-can-close-below', String(title.expander.canCloseBelow))
    closeBelow.setAttribute(
      'style',
      closeBelow.getAttribute('style') + rowControlRight(ROW_CONTROL_STEPS.closeBelow),
    )
    row.append(closeBelow)
  }

  // IC-90 -- HF-13 (MUST), which names HR-7 of table T-015: the row's DIRECT
  // children open and 「孫より下は畳んだまま」.
  //
  // ⛔⛔ OUTSIDE THE BLOCK ABOVE, AND THAT IS THE ONE THING THIS CONTROL DOES
  // DIFFERENTLY. HF-1 places its three on a row that has something under it, so
  // `expander` is `null` on a leaf and the three are not drawn; HF-13 says
  // 「行ごとに 1 つ置くこと」 with no such condition and settles the leaf case the
  // other way -- 「開ける直下の子が 1 つも無いときは、`FR-029` に従って薄く描く
  // こと（MUST）」. ⇒ Drawn on every row, and faint where there is nothing to
  // open. Hung inside the block it would not be drawn at all, and HF-13's MUST
  // would be unmet on exactly the rows its own MUST names.
  // ⛔ A SEPARATE ENTRANCE FROM IC-58 (HF-13, MUST NOT): 「同じ入口に兼ねさせて
  // はならない」, because 「押すたびに違う量が開く入口は、何が起きるかを押す前に
  // 読めない」.
  // ⚠️ `undefined` IS DRAWN AS USABLE, the same reading `markPanelCornerEntry`
  // makes of its own optional member: a description that carries no answer is
  // not an answer of 「使えない」, and a false claim of faint is the worse error.
  const openOneLevel = rowControlElement(
    host,
    ROLE.rowExpander,
    OPEN_ONE_LEVEL_ENTRY,
    title.canOpenOneLevel ?? true,
  )
  openOneLevel.setAttribute('data-can-open-one-level', String(title.canOpenOneLevel ?? true))
  openOneLevel.setAttribute(
    'style',
    openOneLevel.getAttribute('style') + rowControlRight(ROW_CONTROL_STEPS.openOneLevel),
  )
  row.append(openOneLevel)

  // IC-91 -- HF-14 (MUST), which names HR-8: 「配下に行を足す操作子を、行ごとに
  // 1 つ置くこと」.
  //
  // ⛔ NO `data-role`, THE SAME ANSWER IC-82 GIVES: table T-103 names a part for
  // the expander (U-47) and for the pin (U-48) and none for a control that makes
  // or unmakes a row, so nothing is invented here -- see `ADD_CHILD_ROW_ENTRY`.
  // ⭐ ON EVERY ROW AND NOT ONLY ON A PARENT: HF-14 puts it 「行ごとに」, and a
  // leaf row is precisely where a first child is likeliest to be wanted.
  // ⚠️ SPENT ONLY AT THE DEPTH CAP -- `RowTitle.canAddChildRow` carries why, and
  // HR-8 (MUST NOT) leaves the cap itself to FR-085.
  const addChild = rowControlElement(
    host,
    null,
    ADD_CHILD_ROW_ENTRY,
    title.canAddChildRow ?? true,
  )
  addChild.setAttribute('data-can-add-child-row', String(title.canAddChildRow ?? true))
  addChild.setAttribute(
    'style',
    addChild.getAttribute('style') + rowControlRight(ROW_CONTROL_STEPS.addChild),
  )
  row.append(addChild)

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
  //
  // ⭐ IT IS NEVER FAINT, and that is not an exemption from FR-029: that
  // requirement draws faint the entrance that 「いま文書にも画面にも何も
  // 変えられない」, and FR-098 (MUST) has this one control both pin the row and
  // let it go -- so on a row that is drawn it always has the other of the two
  // left to do. ⛔ Nothing carries a flag for it because nothing spends it.
  //
  // ⭐ AND IT IS THE ONE ROW CONTROL THAT IS PAINTED FOR ITS STATE. HF-6 of
  // table T-051 (MUST): 「ピン止めしている行の `IC-60` は、`FR-029` の 表 T-237
  // の `EN-3` に従って塗ること」. ⛔ `data-pinned` HAS BEEN WRITTEN HERE SINCE
  // THE CONTROL EXISTED AND NOTHING PAINTED IT -- an attribute paints nothing,
  // which is the same hole `data-pressed` sat in until 2026-08-28.
  // ⛔ IT IS NOT THE PER-CONTROL GROUND THAT ROW'S MUST NOT FORBIDS, and the
  // row says so itself: 「地は上の 1 枚（`S-150`）のままであり、`EN-3` の塗りは
  // その地の上に載る状態の印である」 -- `rowControlGroundStyle` still lays the one
  // band behind all five, and this rides on it. ⭐ The row adds why no crumb of
  // the name can show through: 「状態の印は 1 つの操作子にしか立たない」.
  // ⚠️ EN-3 IS THE ONLY ROW OF TABLE T-237 THAT CAN STAND HERE, so the
  // precedence `entranceStateFill` keeps decides nothing on this control -- it
  // is still asked, because a list of one is where the second row would go.
  // ⭐⭐ AND A PINNED ROW'S PIN IS DRAWN WITH NO POINTER ON THE ROW, which is
  // HF-6's own exception (MUST): 「⛔⛔ **ピン止めしている行の `IC-60` だけは、
  // ポインタが乗っていなくても描くこと（MUST）**（利用者の裁定 2026-08-30）——
  // ⛔ **本行の最初の MUST の唯一の例外である。**」 with its reason: 「描かなけ
  // れば、どの行が留まっているかは全行を撫でるしか読む手が無い」.
  // ⛔ IT WAS NOT DRAWN UNTIL 2026-08-30 AND THE NOTE HERE SAID WHY -- that the
  // ruling was 「not yet written into the requirement」. ⚠️ That note had gone
  // false: the requirement carries the exception now, and the sheet UF-71 lays
  // hid the pin at rest on a pinned row exactly as on any other.
  // ⭐ THE DECLARATION IS WRITTEN ON THE CONTROL rather than added to the
  // sheet, because the sheet's rule is keyed on the ROW being hovered and this
  // has to outrank it for one control on one kind of row.
  // ⚠️ ONLY WHILE IT IS PINNED. The row says so -- 「この例外が当たるのは留まっ
  // ているあいだだけであり、外せばほかの操作子と同じに戻る」 -- so an unpinned
  // row's pin carries nothing and falls back under the resting rule, and the
  // MUST NOT beside it (「ほかの操作子を常時描いてはならない」) is untouched.
  const pin = rowControlElement(host, ROLE.rowPin, 'IC-60', true)
  pin.setAttribute('data-pinned', String(title.isPinned))
  pin.setAttribute('aria-pressed', String(title.isPinned))
  pin.setAttribute(
    'style',
    pin.getAttribute('style') +
      rowControlRight(ROW_CONTROL_STEPS.pin) +
      entranceStateFill(title.isPinned ? ['EN-3'] : []) +
      (title.isPinned ? 'visibility:visible;' : ''),
  )
  row.append(pin)

  // IC-82 -- FR-032's deletion, on every row and answering for the row it is
  // drawn on. ⛔ NOT UNDER `title.expander`: that judgement is HF-1's, which
  // places the folding controls on a row that has something BELOW it, and a
  // leaf row is as deletable as any other.
  //
  // ⭐ NOTHING SAYS WHETHER IT IS SPENT, because nothing spends it. The pair
  // above carries `canOpen` / `canClose` because a fold can already stand;
  // a row that is drawn is a row CM-27 can delete. ⚠️ So FR-029's faint state
  // never falls on it either, for the reason the pin's note gives.
  // ⚠️ NO `data-role` AND NO KEY OF ITS OWN -- see `DELETE_ROW_ENTRY`. The row
  // this sits in carries the `data-group-id` that says which row goes, and
  // writing a copy here would state one row's key in two places.
  const remove = made(host, 'button', STYLE.rowControl)
  remove.setAttribute('type', 'button')
  remove.setAttribute('data-icon', DELETE_ROW_ENTRY)
  remove.setAttribute('aria-label', DELETE_ROW_ENTRY)
  fillEntry(host, remove, DELETE_ROW_ENTRY)
  remove.setAttribute(
    'style',
    remove.getAttribute('style') + rowControlRight(ROW_CONTROL_STEPS.remove),
  )
  row.append(remove)

  // HF-18 (MUST): 「配下に畳み込んでいる行があるとき、その行数を行に示すこと」, and
  // 「その行自身にも印を付けること」.
  //
  // ⭐⭐ AT THE ROW'S RIGHT END, WHICH HF-18 (MUST) STATES: 「置く先は行の右端と
  // すること」, 「`HF-4` が操作子を留めるのと同じ端である」 -- so it reads the same
  // step the pin does rather than a step of its own.
  // ⛔ IT STOOD SEVEN STEPS IN UNTIL 2026-08-31, which put it over the row's
  // NAME: measured at x=46 on a 170-wide panel, on the second character of
  // 「Mobile Client」. ⚠️ The note that stood here said the place was chosen so
  // HF-6's ground would not cover the count -- it did cover it anyway, and
  // `elementFromPoint` answered `BUTTON IC-90`. ⭐ HF-18 (MUST NOT) keeps the
  // count out of HF-6's HOVER RULE -- it is drawn whether or not a pointer is
  // on the row -- and says nothing about being over-drawn while one is, which
  // is what the sample does too.
  // ⚠️ NOTHING IS DRAWN FOR A COUNT OF ZERO -- 「畳み込んでいる行があるとき」 is the
  // condition, and a row holding none has nothing to show.
  // ⛔ IT TAKES NO ROOM (FR-085, MUST NOT): out of the flow like the controls,
  // so `S-140` stays 0 and the cut of the name does not move.
  const foldedRows = title.foldedRowCount ?? 0
  if (foldedRows > 0) {
    row.append(
      foldedRowCountElement(
        host,
        foldedRows,
        rowControlRight(ROW_CONTROL_STEPS.pin),
      ),
    )
    // ⭐ AND THE ROW ITSELF IS MARKED. HF-18 (MUST): 「その行自身にも印を付ける
    // こと。印は行の左の辺に帯を 1 本引くこと」, in S-153 like the count, so a
    // reader picks the holding rows out without reading any digit.
    // ⛔ AN INSET SHADOW AND NOT A BORDER: a border would take room, and FR-085
    // (MUST NOT) refuses to change the room the name is cut against.
    row.setAttribute(
      'style',
      (row.getAttribute('style') ?? '') +
        `box-shadow:inset ${rowBandPx()}px 0 0 0 ${PAINT.caution};`,
    )
  }
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
 * T-109 has no English column and the row id is the accessible name until a
 * word crosses the seam. ⚠️ What stood here said the dictionary's cell is
 * empty; measured on 2026-08-28 it holds a word for IC-74 in both languages, so
 * what is missing is the seam and never the word -- `rowControlElement` carries
 * the whole of that finding.
 *
 * @purity non-pure
 */
function openEveryRowElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, OPEN_EVERY_ROW_ENTRY, 1)
}

/**
 * The two entrances the panel draws for itself -- IC-74 (HF-10) and IC-78
 * (HF-12), which stand side by side at the top right.
 *
 * ⭐ ONE BUILDER FOR BOTH, because HF-12 states no placement of its own: it puts
 * its control beside HF-10's and leaves that row to say where the pair sits, so
 * a second builder here would be a second answer to a question one row owns.
 *
 * ⚠️ `stepsFromEdge` IS THE ROW CONTROLS' STEP, and it is the same quantity:
 * how far apart two controls of one glyph box (S-138) stand. ⛔ Not a new
 * number -- see `ROW_CONTROL_RIGHT_EM` for why it is in `em` and for the
 * pending decision it is held under (PD-348).
 *
 * @purity non-pure
 */
function panelCornerEntryElement(host: Document, icon: string, stepsFromEdge: number): HTMLElement {
  const entry = made(host, 'button', panelCornerEntryStyle(stepsFromEdge, true))
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', icon)
  entry.setAttribute('aria-label', icon)
  fillEntry(host, entry, icon)
  return entry
}

/**
 * What one of those two entrances is drawn in, usable or spent.
 *
 * ⭐ `entryFaintStyle` AND NOT A THIRD PAINT. FR-029 (MUST) states the faint
 * with one setting (S-149) and (MUST NOT) forbids an entrance that is not made
 * faint 「載る面によって」 -- so the panel's own entrances take the very
 * declarations the header's and the palette's take. ⚠️ The row controls reach
 * the same paint by a different road (`STYLE.rowControlFaintInk` over
 * `STYLE.rowControl`), because those carry no frame to begin with.
 *
 * @purity pure
 */
function panelCornerEntryStyle(stepsFromEdge: number, canAct: boolean): string {
  return (
    (canAct ? entryStyle() : entryFaintStyle()) +
    STYLE.panelCornerEntry +
    `right:${panelCornerStepPx() * stepsFromEdge}px;`
  )
}

/**
 * How far apart the panel's own two entrances stand, in pixels.
 *
 * ⛔⛔ NOT THE ROW CONTROLS' STEP, WHICH IS WHAT IT USED TO BE. Measured on the
 * shipped build (2026-08-30, 1920 x 1080): IC-78 spanned 120..146 and IC-74
 * 140..166 -- the two OVERLAPPED BY 6px, so a press in that strip reached
 * whichever the browser stacked on top. ⚠️ The cause is that they are not the
 * same quantity: a row's control carries no frame and is 20px across, while
 * these two are entrances with a frame and are 26px.
 *
 * ⭐ THE WIDTH IS BUILT FROM WHAT `entryStyle` AND `entryGlyphRoom` ALREADY
 * BUILD THEM FROM -- `S-138` on a side, `S-141` of padding on each side, and
 * the entrance's own 1px border on each side. ⛔ No number is typed here: both
 * rows reach this file generated, which is what rule 03 asks.
 *
 * ⚠️ IN PIXELS AND NOT `em`, unlike the row controls, and for the reason those
 * are in `em`: what scales with the reader's text there is the row's name, and
 * these entrances are sized by `S-138`, which FR-029 (MUST NOT) forbids
 * following the reader's text size.
 *
 * @purity pure
 */
function panelCornerStepPx(): number {
  const side = NOT_STORED_ICON_SIZES['S-138']
  const gap = NOT_STORED_ICON_SIZES['S-141']
  return side + gap * 2 + PANEL_CORNER_BORDER_PX * 2
}

/**
 * Where the head's count stands: one step outside the outermost of the four
 * entrances HF-10, HF-12, HF-16 and HF-17 put there.
 *
 * ⚠️ THE ENTRANCES' OWN STEP AND NOT THE ROW CONTROLS', for the reason
 * `panelCornerStepPx` gives: those two are different widths, and a count placed
 * by the row's step would sit under IC-93.
 *
 * @purity pure
 */
function headFoldedRowCountRight(): string {
  return `right:${panelCornerStepPx() * 4}px;`
}

/**
 * The 1px `entryStyle` puts around every entrance, on each side.
 *
 * ⛔ THE SPECIFICATION HOLDS NO ROW FOR IT. `S-138` is the glyph box and `S-141`
 * the gap between the glyph and the frame; the frame's own thickness is stated
 * nowhere, and `FR-029`'s remark on the outer form says only that the entrance
 * decides it. ⚠️ It is named here rather than left as a bare 1 so that the
 * arithmetic above reads as what it is.
 */
const PANEL_CORNER_BORDER_PX = 1

/**
 * FR-029's faint, written onto one of the two entrances the panel draws for
 * itself, on the frame that says whether it has anything left to do.
 *
 * ⛔ WRITTEN ON EVERY SUCH FRAME AND NOT ONCE. The pair is built with the panel
 * and never rebuilt (see where they are mounted), so what says how they stand
 * has to be put on them again whenever the description of the panel moves.
 * ⛔ `aria-disabled` AND NEVER `disabled`, which FR-029 (MUST NOT) states as a
 * rule: a disabled control stops taking the press, and the press is the one
 * moment that requirement (MUST) has the reason told (RS-27 of table T-233).
 * ⚠️ `undefined` IS DRAWN AS USABLE. The member is optional and a description
 * that carries no answer is not an answer of 「使えない」 -- see its declaration.
 *
 * @purity non-pure
 */
function markPanelCornerEntry(
  entry: HTMLElement,
  stepsFromEdge: number,
  canAct: boolean | undefined,
): void {
  const usable = canAct !== false
  entry.setAttribute('style', panelCornerEntryStyle(stepsFromEdge, usable))
  entry.setAttribute('data-enabled', String(usable))
  if (usable) entry.removeAttribute('aria-disabled')
  else entry.setAttribute('aria-disabled', 'true')
}

/**
 * IC-78 -- HF-12 of table T-051 (MUST): every row folds.
 *
 * @purity non-pure
 */
function collapseEveryRowElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, COLLAPSE_EVERY_ROW_ENTRY, 2)
}

/**
 * IC-92 -- HF-16 (MUST): 段 0 opens one level.
 *
 * ⚠️ PLACED IN THE SAME LINEUP AND NOT AT A PLACE OF ITS OWN. HF-16 and HF-17
 * both say 「`HF-10` の操作子の並びに」 and state no order among themselves, so the
 * two arrivals of 2026-08-30 take the next two steps outward and the pair that
 * was already there does not move. ⛔ No order is invented for them: HF-4's
 * ruling settles the ROW's controls and says nothing of the head's.
 *
 * @purity non-pure
 */
function openLevelZeroElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, OPEN_LEVEL_ZERO_ENTRY, 3)
}

/**
 * IC-93 -- HF-17 (MUST): a row is added at 段 0.
 *
 * @purity non-pure
 */
function addTopRowElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, ADD_TOP_ROW_ENTRY, 0)
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
/**
 * Where HF-14's field for the new row's name stands: under the LAST row the
 * parent's subtree drew, set in one step deeper than the parent's own name.
 *
 * ⭐⭐ WHY IT IS PLACED AT ALL RATHER THAN OPENED IN A DIALOGUE. HF-14 (MUST)
 * has the row 「名前は空で立て、その場で打たせること」, and 「その場」 is where the
 * row is going to be: the panel, under its parent, at its own depth. ⛔ A box in
 * the middle of the screen would be the two-step 「選び直してからパネルを開く」
 * that FR-091's own MUST refuses for the same act on a `Task`.
 *
 * ⭐ UNDER THE WHOLE SUBTREE AND NOT UNDER THE PARENT'S OWN LINE, because HF-14
 * (MUST) makes the new row the LAST child: 「足した行は末子とすること」. The rows
 * arrive in the order they are drawn, so the parent's subtree is the run that
 * follows it while the depth stays greater -- the first row at or above the
 * parent's depth is the next thing that is not under it.
 * ⚠️ A parent that drew no child at all (a leaf, or a folded row -- HR-1a)
 * leaves the run empty, and the field stands directly under the parent's line.
 *
 * ⛔ THE INDENT STEP IS DERIVED AND NOT READ, and this is the price of the seam
 * rather than a choice: `rowTitleIndent` (S-37) is a document setting and
 * `DocumentSettings` does not cross IF-9. What DOES cross is the product
 * FR-085 cut the name against -- `RowTitle.indentPx`, which is that setting
 * times the row's own `depth` -- so one step is that product over that depth,
 * and the depth is never 0 (a root row is depth 1). ⭐ Reading it back this way
 * keeps the field on the very grid the drawn rows use, which a number invented
 * here could not.
 *
 * ⚠️ `null` WHERE THE PANEL DREW NO SUCH PARENT. The row may have left the
 * picture between the press and the paint (FR-018 drops rows, HR-1a hides a
 * folded row's descendants), and a field placed against a row that is not there
 * would stand at an invented place.
 *
 * @purity pure
 */
function newRowNameEntryBox(
  panel: RowTitlePanel,
  parentGroupId: string | null,
): { readonly box: ScreenRect; readonly indentPx: number } | null {
  // ⭐ 段 0's OWN FIELD (HF-17, MUST): 「最も浅い段へ行を 1 つ足す」, and 「足した行
  // は最も浅い段の末子とすること」 -- so it stands under the LAST row the panel
  // drew, at the depth of the shallowest level.
  // ⛔ THE STEP IS READ BACK OFF A DRAWN ROW, exactly as the branch below reads
  // it: `RowTitle.indentPx` is `rowTitleIndent` times the row's own depth, and
  // a root row's depth is 1 -- so the first row of depth 1 states one step
  // outright, and nothing is invented. ⚠️ A panel of no rows cannot be measured
  // at all, which is the one case this answers `null` for; the field then does
  // not open, and nothing is written.
  if (parentGroupId === null) {
    const last = panel.titles[panel.titles.length - 1]
    if (last === undefined) return null
    const first = panel.titles[0] ?? last
    return {
      box: {
        x: first.box.x,
        y: last.box.y + last.box.height,
        width: first.box.width,
        height: first.box.height,
      },
      indentPx: first.indentPx / first.depth,
    }
  }
  const at = panel.titles.findIndex((one) => one.groupId === parentGroupId)
  if (at === -1) return null
  const parent = panel.titles[at]
  if (parent === undefined) return null
  let last = parent
  for (let next = at + 1; next < panel.titles.length; next += 1) {
    const under = panel.titles[next]
    if (under === undefined || under.depth <= parent.depth) break
    last = under
  }
  return {
    box: {
      x: parent.box.x,
      y: last.box.y + last.box.height,
      width: parent.box.width,
      height: parent.box.height,
    },
    indentPx: parent.indentPx + parent.indentPx / parent.depth,
  }
}

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
 * Where the value a person settles is put until the shell collects it.
 *
 * ⭐ WHY A `WeakMap` AND NOT AN ATTRIBUTE TO PARSE. `PropertyControl.key` is a
 * VALUE that says which column of which thing the control edits, and the side
 * that DREW the control is the side that answers for it (Chapter 5.3, MUST,
 * under table T-065). Spelling that value into an attribute would mean taking
 * it apart again on the way back, and a row id or a uuid holding the separator
 * would be taken apart wrongly. ⚠️ Weak so that a control thrown away with a
 * redrawn panel is not held alive by this map.
 *
 * ⛔ NOT A SECOND ANSWER TO `readScreenPartAt`. That member answers about a
 * POINT; this one is looked up by the very element a `change` happening names,
 * which no coordinate is involved in.
 */
const CONTROL_KEYS = new WeakMap<Element, { row: string; key: PropertyFieldKey }>()

/**
 * What a control's kind asks the host to draw.
 *
 * ⛔ THE TAG AND THE TYPE ARE THE ENVIRONMENT'S OWN, not a rule invented here.
 * Table T-016's 入力の型 column names the form -- 文字, 日付, 数値, 真偽, 選択,
 * 色, 複数行 -- and each of the seven has one plain control in the host, which
 * is what FR-029's 「環境の作法に従う」 asks for elsewhere. ⚠️ A control the host
 * draws itself also brings the reader's own way of entering a date or picking a
 * colour, which nothing here could rebuild.
 */
const CONTROL_TAG: Readonly<Record<PropertyControlKind, string>> = {
  text: 'input',
  multiline: 'textarea',
  date: 'input',
  number: 'input',
  boolean: 'input',
  choice: 'select',
  color: 'input',
}

/** The `type` an `input` of each kind takes. `null` where the tag is not an input. */
const CONTROL_INPUT_TYPE: Readonly<Record<PropertyControlKind, string | null>> = {
  text: 'text',
  multiline: null,
  date: 'date',
  number: 'number',
  boolean: 'checkbox',
  choice: null,
  color: 'color',
}

/**
 * The spelling a truth value arrives and leaves in.
 *
 * ⛔ NOT A WORD OF ITS OWN. `textOfValue` in properties-panel.ts writes a
 * boolean with `String`, so these are that spelling read back -- a second pair
 * invented here would be a value the panel never writes.
 */
const TRUE_TEXT = String(true)

/**
 * The name the host gives the key table T-036's SK-8 calls `Esc`.
 *
 * ⚠️ SPELLED AGAIN RATHER THAN SHARED. `dom-input-source.ts` holds the same
 * string for the same reason, and the two units are different components --
 * `_source/components.json` draws no edge between them, so neither may import
 * the other's. ⛔ It is the HOST's spelling either way and not the tool's: what
 * arrives on a `KeyboardEvent` is `Escape`, and `Esc` is what the seam carries.
 */
const HOST_ESCAPE_KEY = 'Escape'

/**
 * Which kinds of control a person puts CHARACTERS into.
 *
 * ⛔ A RECORD OVER THE KIND AND NOT A LIST OF NAMES, so that a kind added to
 * `PropertyControl` cannot be forgotten here -- the compiler asks for it. ⚠️ The
 * three that are false hold values a person picks rather than types: a checkbox
 * is toggled, a chooser is chosen from, and the host's colour control opens a
 * picker of its own. ⛔ IN-5a's reason is what draws the line -- 「`SK-3`（選択の
 * 削除）と 1 文字消す操作が同じキーに重なる」 -- and on the three that are false
 * there is no character for `Delete` to take, so swallowing it there would take
 * SK-3 away for nothing.
 */
const IS_KIND_TYPED_INTO: Readonly<Record<PropertyControlKind, boolean>> = {
  text: true,
  multiline: true,
  date: true,
  number: true,
  boolean: false,
  choice: false,
  color: false,
}

/**
 * A control this unit drew that a person types into, as much of it as the two
 * rules below need.
 *
 * ⛔ NOT `HTMLInputElement`. Table T-075 leaves this unit runnable against a
 * host that is not a browser, so the type is stated as what is actually used.
 */
interface TextEntryControl {
  value: string
  blur?: () => void
  /**
   * ⚠️ BOTH OPTIONAL FOR THE REASON THE TYPE ITSELF GIVES: table T-075 leaves
   * this unit runnable against a host that lays nothing out, and such a host
   * need give its elements neither. `focusPropertyField` is what asks for them,
   * and it asks with a guard.
   */
  focus?: () => void
  select?: () => void
}

/**
 * The controls of `IS_KIND_TYPED_INTO`, remembered as they are drawn.
 *
 * ⛔ NOT READ BACK OFF `data-field-kind`. That attribute is written for a reader
 * of the built page and for a check (rule 04), and taking a decision back out of
 * it would make a display detail load-bearing. ⚠️ Weak, like `CONTROL_KEYS` and
 * for the same reason: the controls are thrown away by the next redraw.
 */
const TYPED_CONTROLS = new WeakSet<object>()

/**
 * The control a happening landed on, where that is one this unit drew and one a
 * person types into -- otherwise `null`.
 *
 * ⚠️ NOT `instanceof Element`, the reason `onFieldChange` gives: `Element` is a
 * global the host need not have, and what says this was one of ours is the set
 * `controlElement` put it in.
 *
 * @purity pure
 */
function textEntryControlOf(target: unknown): TextEntryControl | null {
  if (target === null || typeof target !== 'object') return null
  if (!TYPED_CONTROLS.has(target)) return null
  const drawn = target as Partial<TextEntryControl>
  return typeof drawn.value === 'string' ? (target as TextEntryControl) : null
}

/**
 * One control of one field, drawn as the host's own.
 *
 * ⭐ A COMMIT IS A `change`, NEVER A KEYSTROKE. FR-031 (with UN-3 of table
 * T-027) makes one property change ONE step of the undo history, so a value
 * carried away per keystroke would put a step on that history for every letter
 * and taking the name back would take back one letter of it. The host raises
 * `change` when the field is LEFT, which is one of the two moments a person
 * settles on a value.
 *
 * ⛔ THE OTHER MOMENT IS SK-19's `Enter`, AND THE HOST DOES NOT RAISE IT. It
 * would -- but that row is an assignment, so MK-10 has the input seam stop the
 * default action on that very press. The panel's own `keydown` listener settles
 * it instead; see the listener beside `hasUnsettledTextEntry`.
 *
 * STOP -- ⛔ THE HOST'S COLOUR CONTROL HOLDS ONLY `#rrggbb`, AND TWO SPELLINGS
 * OF TABLE T-058's COLOUR COLUMNS ARE NOT THAT. `transparent` is P-19 of the
 * glossary and FR-030 (MUST NOT) forbids the outline and the fill to be it at
 * once, and AT-58's `null` means the row follows the theme -- neither of which
 * a `#rrggbb` box can show or offer. Looked in table T-016 (which says 色 and
 * no more), FR-007, FR-030, table T-058 and table T-109. ⭐ Nothing is invented
 * in its place, and nothing is drawn beside it either: a swatch used to paint
 * what the document actually held, so that a reader saw `transparent` as
 * nothing painted, and FR-006 (MUST NOT) took that away on 2026-08-27 (CR-272)
 * because it drew the ordinary colours twice. ⛔ SO THE GAP IS NOW WIDER THAN
 * IT WAS: neither spelling can be REACHED through this control, and neither can
 * be SEEN any more -- a surface with `透明` and 「テーマに従う」 on it is what
 * table T-016 would have to gain a row for, and it now carries both halves.
 *
 * @provisional PD-270
 * @purity non-pure
 */
function controlElement(
  host: Document,
  row: string,
  control: PropertyControl,
  typedByRow: Map<string, TextEntryControl> | null,
): HTMLElement {
  const tag = CONTROL_TAG[control.kind]
  const drawn = host.createElement(tag)
  // ⛔ THE ROOM IS STATED IN `em` AND NEVER IN PIXELS. FR-006 (MUST NOT) gives
  // a control no less room than its value needs and (MUST NOT) refuses to let
  // that room be a px constant, for WCAG 2.1's 1.4.4 -- a panel whose fields do
  // not grow with the reader's text is the one surface left behind. ⭐ Both
  // terms of the room are proportional to the font size, so the estimating side
  // divides that size out (`PropertyControl.widthInFontSizes`) and this
  // multiplies it back in by spelling the unit `em`, which resolves against the
  // control's own font -- `font:inherit` above makes that the panel's.
  // ⛔ NOT COMPUTED HERE. `labelCoef` (S-30) is a document setting and this side
  // does not read the document (table T-061); FR-006 (MUST NOT) forbids this
  // side a coefficient of its own for the same reason.
  //
  // ⚠️ THE TWO CONTROLS THAT DRAW NO TEXT ARE LEFT ALONE. FR-006 asks for the
  // room 「その値を出すのに要る幅」 -- a checkbox and a colour control paint
  // their value rather than spelling it, so reserving room for the digits of
  // `false` or of a hex triple would be room for text neither of them draws.
  const style =
    control.kind === 'color'
      ? propertyColorStyle()
      : control.kind === 'boolean'
        ? propertyCheckStyle()
        : propertyControlStyle(control.widthInFontSizes)
  drawn.setAttribute('style', style)
  // ⚠️ Written for the reader of the built page as well as for a check that
  // holds the drawn tree against the description (rule 04). The value the
  // commit travels by is CONTROL_KEYS -- these say what was drawn, not how it
  // comes back.
  drawn.setAttribute('data-field-row', row)
  drawn.setAttribute('data-field-kind', control.kind)

  const inputType = CONTROL_INPUT_TYPE[control.kind]
  if (inputType !== null) drawn.setAttribute('type', inputType)

  if (control.kind === 'choice') {
    // ⛔ The empty spelling is offered only where the candidates hold it: a
    // column that admits no empty value must not be given one here.
    //
    // ⭐ THE WORD AND THE VALUE ARE TWO THINGS. `choiceValues` carries what a
    // candidate commits where that is not the word it shows -- AS-6 of table
    // T-225 (MUST / MUST NOT) has PR-16 show a name and write a `uid` -- and the
    // two are paired by position, which is what that member declares. ⚠️ A
    // control that carries none is one whose words ARE its values, so the word
    // stands in both places, which is what every other chooser here does.
    const values = control.choiceValues ?? null
    const choices = control.choices ?? []
    for (let index = 0; index < choices.length; index += 1) {
      const choice = choices[index] ?? ''
      const option = host.createElement('option')
      option.setAttribute('value', values?.[index] ?? choice)
      option.textContent = choice
      drawn.append(option)
    }
    ;(drawn as HTMLSelectElement).value = control.text
  } else if (control.kind === 'boolean') {
    ;(drawn as HTMLInputElement).checked = control.text === TRUE_TEXT
  } else {
    if (control.kind === 'multiline') {
      drawn.setAttribute('rows', String(fieldSizes().multilineRows))
    }
    if (control.kind === 'number') {
      // ⛔ The bounds are the schema's, and only where it states one: an absent
      // bound is left absent rather than filled with a number from here.
      if (control.min !== null) drawn.setAttribute('min', String(control.min))
      if (control.max !== null) drawn.setAttribute('max', String(control.max))
    }
    ;(drawn as HTMLInputElement).value = control.text
  }

  CONTROL_KEYS.set(drawn, { row, key: control.key })
  // IF-9's fifth answer is about the controls a person types INTO, and this is
  // where the two are told apart -- the kind is in hand here and nowhere later.
  if (IS_KIND_TYPED_INTO[control.kind]) {
    TYPED_CONTROLS.add(drawn)
    // ⭐ WHAT `focusPropertyField` REACHES THE CONTROL BY, recorded where the
    // row and the control are in hand together and nowhere later.
    // ⛔ NOT LOOKED UP OFF `data-field-row` WHEN THE TIME COMES. That attribute
    // is written for a reader of the built page and for a check (rule 04), and
    // the note above says why a decision may not be taken back out of one.
    // ⚠️ THE FIRST CONTROL OF A ROW WINS. One row of table T-016 can draw two
    // entrances -- AS-5 gives PR-16 a chooser and a search box -- and the first
    // is the one the row's own value stands in.
    // ⛔ `null` IS A CALLER THAT IS NOT THE PANEL. `modalElement` draws fields
    // of table T-104 through this same builder, and MK-13's field is a row of
    // table T-016 on the `Properties Panel` -- so a modal's control recorded
    // here would answer for a row the panel never drew.
    if (typedByRow !== null && !typedByRow.has(row)) {
      typedByRow.set(row, drawn as unknown as TextEntryControl)
    }
  }
  return drawn as HTMLElement
}

/**
 * The id the search box and its roster are joined by.
 *
 * ⛔ DERIVED FROM THE ROW AND NOT COUNTED UP. One row of table T-016 carries at
 * most one searchable chooser, and a redraw throws the whole panel away
 * (`replaceChildren`), so a counter would only make the same element answer to a
 * different name each frame -- which a reader of the built page could not follow.
 * ⚠️ Prefixed because the id lives in the host's one document-wide namespace,
 * which the page shares with whatever else the shell put there.
 */
function rosterId(row: string): string {
  return `grs-roster-${row}`
}

/**
 * AS-5's second half: the partial-match search attached beside a chooser.
 *
 * ⭐ THE HOST'S OWN, WHICH IS THE WHOLE REASON IT NEEDS NO WORD. FR-038 (MUST)
 * keeps every word printed on the screen in one dictionary per language and
 * (MUST NOT) forbids one to be minted anywhere else -- a filter written here
 * would need a label, a placeholder or a heading, and each of those is a word.
 * ⚠️ `input` + `datalist` is the host's roster entry: it draws its own way in,
 * narrows the roster on what has been typed, and carries no text of its own --
 * so the surface gains a search and the dictionary gains nothing.
 * ⚠️ WHETHER THE HOST NARROWS ON A FRAGMENT OR ON A PREFIX IS THE HOST'S ANSWER,
 * and FR-029's 「環境の作法に従う」 is what hands it that: rebuilding the match
 * here would be this side holding a rule no requirement states.
 *
 * ⭐ IT COMMITS THROUGH THE SAME KEY AS THE CHOOSER BESIDE IT. `CONTROL_KEYS`
 * carries `{ row, key }` and both entrances carry the one PR-16 holds, so a
 * settled value reaches `commandFromFieldCommit` by the row id IF-9 fixes
 * whichever of the two a person used. ⚠️ What travels differs and is meant to:
 * the chooser settles a candidate's `uid` (AS-9) and this settles the NAME that
 * was typed, which is the spelling AS-7 (a person the roster does not hold),
 * AS-8 (a name several people carry) and AS-3's `-` are all written about.
 *
 * ⛔ THE ROOM IS THE CHOOSER'S OWN, and for FR-006's (MUST NOT) reason: the
 * widest candidate is what either entrance has to be able to show, so the one
 * estimate covers both. The field's line wraps when the two will not stand side
 * by side, which `propertyControlsStyle` already does (FR-006, MUST).
 *
 * @purity non-pure
 */
function searchElements(
  host: Document,
  row: string,
  control: PropertyControl,
  words: readonly string[],
): readonly HTMLElement[] {
  const id = rosterId(row)
  const roster = host.createElement('datalist')
  roster.setAttribute('id', id)
  for (const word of words) {
    const option = host.createElement('option')
    option.setAttribute('value', word)
    roster.append(option)
  }

  const box = made(host, 'input', propertyControlStyle(control.widthInFontSizes))
  box.setAttribute('type', 'text')
  box.setAttribute('list', id)
  // Written for the reader of the built page and for a check, like the ones
  // `controlElement` writes -- the commit still travels by `CONTROL_KEYS`.
  box.setAttribute('data-field-row', row)
  box.setAttribute('data-field-search', 'true')
  ;(box as HTMLInputElement).value = ''

  CONTROL_KEYS.set(box, { row, key: control.key })
  // A person puts CHARACTERS into this one, which is the whole of what it is --
  // so it is settled by `Enter` and abandoned by `Esc` like every other such
  // control, and IN-5a's `Delete` is swallowed while it holds the pointer.
  TYPED_CONTROLS.add(box)
  return [roster as HTMLElement, box]
}

/**
 * One item of table T-016, of table T-058's two row columns, or of table T-104.
 *
 * ⛔ A FIELD WITH NO CONTROL IS STILL WRITTEN OUT AS TEXT. `controls` is empty
 * where this side has none to offer -- the settings roster, FR-074's surface,
 * and `PR-9`, which table T-016 marks read-only -- and each of those has a note
 * where it is built saying why. ⚠️ So the fallback below is not a leftover: it
 * is what a field looks like until its surface exists.
 * ⚠️ `PR-16` WAS ON THAT LIST AND IS NOT ANY MORE: it carries a chooser, and
 * `properties-panel.ts` records why the row's own text is drawn beside it rather
 * than inside it.
 *
 * @purity non-pure
 */
function fieldElement(
  host: Document,
  field: PropertyField,
  typedByRow: Map<string, TextEntryControl> | null,
): HTMLElement {
  const line = made(host, 'div', propertyFieldStyle())
  // The row that holds the item -- `PR-n`, `AT-58` / `AT-59`, or `K-n`.
  line.setAttribute('data-field-row', field.row)
  line.setAttribute('data-editable', String(field.isEditable))
  const name = made(host, 'span', propertyFieldNameStyle())
  // ⚠️ Not translated, and table T-016 says why it keeps its item names in
  // English (FR-038 leaves them alone).
  name.textContent = field.name

  if (field.controls.length === 0) {
    const value = made(host, 'span', '')
    value.textContent = field.text
    line.append(name, value)
    return line
  }

  const controls = made(host, 'div', propertyControlsStyle())
  // ⭐ A CONTROL THAT CARRIES NO VALUE OF ITS OWN DOES NOT HIDE THE FIELD'S.
  // Every other control of table T-016 holds the item's value as its own text,
  // so drawing the control drew the value. PR-16 does not: AS-6 of table T-225
  // (MUST) shows the assignee NAMES while AS-9 has the chooser answer a person,
  // and a task may carry several -- so the field's text is the several names and
  // the control's is what one press of it would settle. ⛔ Dropping the text
  // here would leave a reader unable to see who is on the task at all, which is
  // FR-006's STATEMENT (MUST) and AS-6 together.
  // ⚠️ Keyed on the CONTROL having no text rather than on the row id: a row id
  // here would be this file holding a copy of table T-016.
  if (field.text !== '' && field.controls.every((one) => one.text === '')) {
    const shown = made(host, 'span', '')
    shown.textContent = field.text
    controls.append(shown)
  }
  for (const control of field.controls) {
    // ⛔ NO SWATCH IN FRONT OF A COLOUR CONTROL. FR-006 (MUST NOT) forbids the
    // current value to be drawn over the front of the control that shows that
    // value (the user's report of 2026-08-27, D-82) -- the host's colour control
    // paints the colour it holds, so a span in front of it drew the same colour
    // twice.
    // ⚠️ S-188 has NOT moved and is not retired: that row holds a swatch's side
    // and gap, and the same requirement says in as many words that how many
    // times a value may be drawn is FR-006's and not that row's.
    controls.append(controlElement(host, field.row, control, typedByRow))
    // ⭐ AS-5 OF TABLE T-225 (MUST) ATTACHES TWO THINGS, NOT ONE: 「ドロップダウン
    // と部分一致の検索を添えること」. The chooser above is the first and this is
    // the second, and it stands BESIDE it rather than in its place -- a search
    // settles a name, and AS-9 (MUST) calls the chooser the only surface on which
    // two same-named people can be told apart.
    // ⚠️ Keyed on the control declaring words rather than on the row id, for the
    // reason the text fallback above gives: a row id here would be this file
    // holding a copy of table T-016.
    const words = control.searchWords
    if (words !== undefined) {
      controls.append(...searchElements(host, field.row, control, words))
    }
  }
  line.append(name, controls)
  return line
}

/**
 * Which of FR-072's two the panel is on, written whether or not its contents are
 * being redrawn this frame.
 *
 * ⭐ APART FROM `fillPropertiesPanel` FOR EXACTLY THAT REASON. No control holds
 * either of these two facts, so a frame that leaves the drawn fields alone
 * (because a person has hold of one) still has to say them, and a check reads
 * them back off the panel.
 *
 * @purity non-pure
 */
function markPropertiesPanel(panel: HTMLElement, description: PropertiesPanel): void {
  panel.setAttribute('data-showing', description.showing)
  panel.setAttribute('data-subject-gone', String(description.isSubjectGone))
}

/**
 * U-25 `Properties Panel` (UF-64), contents and all.
 *
 * ⛔ NO HEADING ROW, WHICH FR-072 (MUST NOT) FORBIDS OUTRIGHT (the user's
 * instruction of 2026-08-27, carried by CR-272). The same requirement (MUST)
 * puts which of the two is showing on the PRESSED STATE of the entrance
 * instead, which `app-header-items.ts` writes for IC-17 -- so the description
 * carries no word for a heading and none is minted here.
 * ⚠️ FR-072 (MUST) still has the panel KEEP its fields when the subject went
 * away; `data-subject-gone` is what `markPropertiesPanel` writes so that state
 * can be read back, and that requirement's RATIONALE records that nothing on
 * the screen says so any more.
 *
 * ⭐ THE WAY OUT RIDES ON THE FIRST FIELD'S LINE. Table T-109 stands one entry
 * on this surface -- closing an open surface, on the authority of IN-4 of table
 * T-028 -- and FR-029 (MUST) makes that table's 面 column the whole of the
 * placement. ⛔ It arrives in `PropertiesPanel.commands` already chosen: which
 * row it is, whether it may be pressed and what it is called are UF-64's
 * answers, and this side draws them through `commandEntry` like every other
 * entry on the screen.
 *
 * STOP -- ⛔ STILL NOT DECIDED BY THE SPECIFICATION: WHERE ON THE PANEL IT
 * SITS. No table holds a rectangle for an entry -- `ScreenSession.iconUnderPointer`
 * records that gap (PD-141) -- so no row can be quoted for a corner. Searched:
 * FR-006, FR-029, FR-072, table T-109, table T-103 and the S-186 .. S-198 run of
 * table T-206, which gives the panel's fields their lengths and gives its header
 * none. ⭐ What is followed instead is the user's own instruction of 2026-08-27,
 * recorded as D-57 in docs/development-records/defects.md: bring the way out
 * onto the line the first item is on. So the entry stands at the far end of the
 * FIRST field's line, which is table T-016's first printed row.
 * ⚠️ With no field to ride on it stands alone, because a surface a reader
 * cannot put away would be the worse failure.
 *
 * @provisional PD-327
 * @provisional PD-271
 * @purity non-pure
 */
function fillPropertiesPanel(
  host: Document,
  panel: HTMLElement,
  description: PropertiesPanel,
  anchors: Map<string, HTMLElement>,
  typedByRow: Map<string, TextEntryControl>,
): void {
  // ⛔ EMPTIED BEFORE THE PANEL IS BUILT, for the reason `anchorsOf` empties the
  // anchors: `replaceChildren` below throws the old controls away, and a row
  // left over from the frame before would name a control no longer on the page.
  typedByRow.clear()
  const drawn = description.fields.map((field) => fieldElement(host, field, typedByRow))
  const entries = description.commands.map((item) => {
    const entry = commandEntry(host, item)
    anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
    return entry
  })
  if (entries.length > 0) {
    const wayOut = made(host, 'div', propertyWayOutStyle())
    wayOut.append(...entries)
    const first = drawn[0]
    if (first === undefined) drawn.push(wayOut)
    else first.append(wayOut)
  }
  panel.replaceChildren(...drawn)
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
function grabBandElement(
  host: Document,
  heightPx: number,
  minimise: CommandItem,
  isMinimised: boolean,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const band = made(host, 'div', STYLE.paletteGrabBand + `height:${heightPx}px;`)
  band.setAttribute('data-icon', PALETTE_GRAB_BAND_ENTRY)
  fillEntry(host, band, PALETTE_GRAB_BAND_ENTRY)

  // ⭐ IC-75 IS DRAWN INSIDE THE BAND, WHICH IS WHAT FR-053 (MUST) ASKS FOR:
  // 「掴み帯の右端に IC-53 を置き、その右に最小化の入口を置くこと」. ⛔ Inside
  // and not beside, for the reason the band itself is inside the palette: the
  // faintness MUST is judged on which PART the pointer is on, and a sibling
  // would leave the palette faint at the moment its own toggle is pressed.
  // ⚠️ IT IS A `CommandItem` AND SO CARRIES ITS OWN WORD, which is the half the
  // band has never had -- the note above records that gap for IC-53, and this
  // row does not share it.
  const toggle = commandEntry(host, minimise)
  toggle.setAttribute('style', toggle.getAttribute('style') + STYLE.paletteMinimise)
  // ⭐ THE STATE IS SAID AND NOT ONLY DRAWN. Table T-109 gives IC-75 one shape
  // for both states (「同じ入口で戻す」), so a reader who cannot see it has
  // nothing to tell the two apart by unless the pressed state is written.
  toggle.setAttribute('aria-pressed', String(isMinimised))
  // EZ-2 of table T-040 again, for the row drawn inside the band: a tooltip
  // raised for IC-75 is placed against the node IT was drawn on, and never
  // against the band it sits in. ⚠️ Set here rather than by the caller because
  // the band's first child is IC-53's own shape -- `fillEntry` above puts it
  // there -- so the toggle cannot be found from outside by position.
  anchors.set(anchorKey({ kind: 'icon', icon: minimise.icon }), toggle)
  band.append(toggle)
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
 * ⛔ THE GROUP'S CAPTION IS NOT PRINTED (FR-053, MUST NOT). It used to be, in a
 * node of its own above each group's entries; the requirement forbids it as of
 * 2026-08-25 because FR-029 tells a person what an entrance is for with a shape
 * and a caption is a word -- a word that FR-038 would then have to hold per
 * language. ⚠️ WHAT STOPS IS THE PRINTING AND NOTHING ELSE: `PaletteGroup.name`
 * still arrives and is still filled in by UF-65, because table T-109's 群 column
 * decides the ORDER of the groups and the help (FR-036) lists the entrances by
 * word. ⛔ So the member is not read here rather than being removed.
 *
 * ⭐ THE RULE THAT REPLACES THE CAPTION IS DRAWN HERE. FR-053 (MUST) has the
 * boundary between groups shown as a line and sends its thickness and side gaps
 * to S-143 of table T-206; `paletteGroupRuleStyle` is that line.
 * ⚠️ A STOP note stood here from 2026-08-25 to 2026-08-27 reporting the value as
 * unreachable, and it was right about where it had landed: the generator wrote
 * S-143 into `command-palette.ts`, the unit that DESCRIBES the palette and says
 * in its own note that the rule is the drawing side's -- so nothing read it,
 * and this unit may not, that file not being ScreenRenderer's public entry
 * (Chapter 5.3 MUST NOT, LR-2 of `tools/check_layer_rules.py`). ⭐ The row is
 * routed to this file now, and nothing new is asked of the description:
 * `palette.groups` already IS the boundary list, one element per group.
 *
 * ⛔ ONE LINE PER BOUNDARY AND NEVER ONE PER GROUP. A boundary is where two
 * groups meet, so there is one fewer of them than there are groups and the line
 * stands BEFORE every group but the first. ⚠️ A line per group would draw one
 * above the first entry, where nothing meets anything, and FR-053 asks for the
 * boundary rather than for a frame. ⛔ No count is written here, for the reason
 * rule 03 section 3 gives: how many groups table T-109 places is that table's
 * to change.
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
  // ⚠️ The rules stand in this list beside the group boxes, which is why it is
  // not named for the groups alone: what goes into the palette is the groups
  // with a boundary between each pair, in that one order.
  const laid: HTMLElement[] = []
  for (const group of palette.groups) {
    // FR-053 (MUST): the boundary between two groups is shown by a line. ⭐ The
    // list is empty only before the first group, so this draws one line per
    // boundary and none above the first entry.
    if (laid.length > 0) laid.push(made(host, 'div', paletteGroupRuleStyle()))
    const box = part(host, 'div', ROLE.paletteGroups, STYLE.paletteGroup)
    const commands = part(host, 'div', ROLE.paletteCommands, STYLE.paletteCommands)
    for (const item of group.commands) {
      const entry = commandEntry(host, item)
      anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
      commands.append(entry)
    }
    box.append(commands)
    laid.push(box)
  }
  // FR-053 (MUST): what is armed has to be readable on the screen.
  const armed = made(host, 'div', STYLE.armedText)
  armed.textContent = palette.armedText

  // GR-19 of table T-023d, FIRST because the band is the palette's top edge and
  // FIRST because that row stands first in its table -- see `grabBandElement`.
  // ⚠️ Drawn on every frame the palette is, and on no condition of its own: the
  // row states a place and not a state, so `CommandPalette` carries the height
  // whenever it carries anything at all.
  const band = grabBandElement(
    host,
    palette.grabBandHeight,
    palette.minimise,
    palette.isMinimised,
    anchors,
  )
  // EZ-2 of table T-040 (MUST) shows THAT icon's explanation, and IC-53 is now a
  // row the pointer can rest on -- `readScreenPartAt` answers it, so PD-141
  // reports it and a tooltip raised for it has to be placed against the node it
  // was drawn on, exactly as an entry's is.
  anchors.set(anchorKey({ kind: 'icon', icon: PALETTE_GRAB_BAND_ENTRY }), band)

  // The room that used to be the palette's own padding, one box further in, so
  // that the band above reaches the palette's edges (`STYLE.paletteContents`).
  const contents = made(host, 'div', STYLE.paletteContents)
  contents.replaceChildren(...laid, armed)

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
  // FR-036 (MUST) gives the help a share of the screen that no other surface
  // is given, so the box it opens in is the modal's plus that share.
  const drawn = part(
    host,
    'div',
    modal.surface,
    STYLE.modal + ('entries' in modal ? helpStyle() : ''),
  )
  drawn.setAttribute('role', 'dialog')
  drawn.setAttribute('aria-modal', 'true')

  const header = made(host, 'div', STYLE.surfaceHeader)
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
    // `AppHeaderItems.language`, so neither half of that MUST rests on a label.
    // ⚠️ The reason given for that used to be that every cell of the
    // dictionary is still empty (PD-160), and it was measured false on
    // 2026-08-28. ⭐ Neither half rests on a label all the same: FR-038 asks for
    // the reading to be legible BEFORE the entry is pressed, and an accessible
    // name is not read before pressing.
    drawn.setAttribute('data-language', modal.language)
    // FR-036 (MUST): 「同表の `S-202` が定める段に分けて並べること」, and the
    // share of the screen the same requirement asks for is written on the
    // surface's own box (`helpStyle`).
    // ⭐ COLUMNS AND NOT A GRID OF CELLS. The requirement asks for the whole of
    // six tables to stand without scrolling at MC-6 of table T-025, and an
    // entry is one line however long its words are -- so the browser is asked
    // to break the ONE list into that many columns and left to decide where,
    // which is what keeps the columns even as the words change with the
    // language (FR-038).
    const columns = made(host, 'div', helpColumnsStyle())
    for (const line of modal.entries) {
      const row = made(host, 'div', STYLE.helpEntry)
      row.setAttribute('data-table', line.table)
      row.setAttribute('data-row', line.row)

      // FR-036 (MUST): the SHAPE, then the description, then the assignment,
      // in that order (the user's instruction of 2026-08-29 -- 「アイコン 説明
      // マウス操作/ショートカットキー の順」). ⚠️ CR-279 had it the other way
      // round and CR-282 turned it over.
      // ⛔ THE ROW ID IS NOT DRAWN, and it used to be: the closing rule of
      // table T-023b (MUST NOT) keeps a row id off the screen, and the help is
      // the one surface that would otherwise print a hundred of them. It stays
      // on the element as `data-row`, which is a description read back and not
      // a thing anybody sees.
      // ⚠️ Only where table T-109 places exactly one entrance for the row --
      // `HelpEntry.icon` says why.
      const glyph = made(host, 'span', STYLE.helpGlyph)
      if (line.icon !== null) fillEntry(host, glyph, line.icon)
      row.append(glyph)

      const text = made(host, 'span', STYLE.helpText)
      text.textContent = line.text
      row.append(text)

      // FR-036 (MUST): the assignment is the key OR the mouse operation, and
      // a row may carry either. ⚠️ THE PLACE IS KEPT WHETHER OR NOT THERE IS
      // ONE -- the three sit in one order, and a row that shifted left when it
      // had none would leave the column ragged. ⛔ Nothing is written in it:
      // a dash would read as an assignment deliberately withheld, which is
      // what SK-1 says in WORDS and no other row means.
      // ⛔ NOT BOTH AT ONCE: no row of table T-023 is also a row of table
      // T-036, so at most one of the two is ever non-null.
      const assignment = made(host, 'span', STYLE.helpKeys)
      assignment.textContent = line.keys ?? line.press ?? null
      row.append(assignment)

      columns.append(row)
    }
    body.push(columns)
    // FR-069 (MUST): the whole licence text, the copyright notice and the
    // third-party attributions, which the help is where one reads.
    //
    // ⛔ FOLDED AWAY, AND FR-036 IS WHY. That requirement (MUST) has the whole
    // of six tables stand without scrolling at MC-6 of table T-025, and the
    // licence alone measured 4824px on 2026-08-29 -- laid out beside the list
    // it made the one thing FR-036 asks for impossible. ⭐ FR-069 asks for the
    // text to be READ FROM the help and not to be in sight at all times, which
    // a disclosure satisfies: it is here, in the help, and it opens.
    // ⚠️ The host's own `details` and not a toggle of this tool's: it opens
    // with no script, which is what keeps it readable in the one case FR-069
    // exists for -- a file opened with nothing else available.
    const legal = made(host, 'details', STYLE.helpLegal)
    const summary = made(host, 'summary', STYLE.helpLegalSummary)
    // ⚠️ NOT A WORD OF THE DICTIONARY, and it may not be one: FR-038 (MUST)
    // keeps printed words in the manuscript, and the copyright notice IS the
    // line NOTICE carries -- the same in every language, like a key name.
    summary.textContent = modal.copyrightNotice
    legal.append(summary)
    for (const text of [modal.licenceText, ...modal.attributions]) {
      const line = made(host, 'p', STYLE.helpLegalText)
      line.textContent = text
      legal.append(line)
    }
    body.push(legal)
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
      choice.setAttribute('data-format', format.row)
      // FR-096 (MUST): the format is shown by the word the description brought,
      // with the extension table T-024 gives it. ⛔ THE ROW ID IS NOT DRAWN
      // (MUST NOT) -- printing it is what the user reported as D-118 -- and it
      // stays on `data-format`, which is where a press reads it back from.
      const shown = `${format.name} ${format.extension}`
      choice.setAttribute('aria-label', shown)
      choice.textContent = shown
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
    // ⛔ `null`: these are table T-104's fields on a modal, not table T-016's on
    // the `Properties Panel`, and `focusPropertyField` answers for the panel.
    for (const field of modal.fields) body.push(fieldElement(host, field, null))
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
 * ⭐ AND IT CAN BE PUT AWAY. NT-8 (MUST) is the row that says so, and it is the
 * one row of table T-037 that asks this unit for an ENTRANCE rather than for
 * something said. ⛔ It is drawn on the telling and never on the question:
 * `confirmationElement` below builds no such entrance, because NT-8 (MUST NOT)
 * forbids one there -- a question is answered by IC-69 or IC-70, and a third way
 * out would be 「どちらでもない」.
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
  // NT-8 (MUST): the person can put this telling away where it stands. Drawn
  // LAST, under everything the telling says, because it is what is done about
  // the telling rather than part of it -- the place `confirmationElement` gives
  // NT-7's two answers.
  //
  // ⛔ A WORD IS THE BODY, AND NO SHAPE IS DRAWN. `fillEntry` is not called and
  // no `data-icon` is set: table T-109 is the whole of the icons (FR-029, MUST)
  // and CR-259 added no row to it, so there is no figure F-019 shape to draw and
  // minting one would be RC-13 of table T-026's decision to make, not this
  // unit's. ⚠️ The word itself is UF-67's, read out of the one dictionary FR-038
  // names -- ⛔ nothing here writes one in either language, and NT-8 (MUST) has
  // it spelled the same in both.
  const dismiss = made(host, 'button', entryStyle() + STYLE.noticeDismiss)
  dismiss.setAttribute('type', 'button')
  // WHICH telling a press here put away, and the whole of what this unit
  // reports about it: `NOTICE_DISMISS_KEY_ATTRIBUTE` says why it is on an
  // attribute of its own and which file closes the loop.
  dismiss.setAttribute(NOTICE_DISMISS_KEY_ATTRIBUTE, notice.dismissKey)
  // ⚠️ Empty only while the dictionary holds no word (PD-160), and ⛔ the key is
  // NOT printed in its place: a row id on the screen is a string FR-038 (MUST)
  // does not hold, the same in both display languages. The frame `entryStyle`
  // gives keeps the entrance pressable meanwhile.
  dismiss.textContent = notice.dismissText
  drawn.append(dismiss)
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
 * ⛔ AND NT-8's ENTRANCE IS NOT DRAWN HERE (MUST NOT). `noticeElement` above puts
 * one on every telling; this surface gets none, because it asks for an answer
 * and the two `entries` are the whole of it. ⚠️ `Confirmation` carries neither
 * `dismissText` nor `dismissKey`, so there is nothing here to draw one from --
 * the type is where that MUST NOT is kept, and this is only where it shows.
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

  // ⛔⛔ THE WORDS AND THE NAMES SCROLL; THE TWO ANSWERS DO NOT (D-134). NT-7
  // (MUST) has the person choose between going on and calling it off, and a
  // choice that has been pushed off the bottom of the screen is no choice --
  // measured on the shipped build 2026-08-30: deleting one row named 9,341
  // characters' worth of `Task`, and IC-69 stood at y = 7054 on a screen 1080
  // tall. ⚠️ NOTHING IS TAKEN OUT OF THE SURFACE and no name is capped: FR-032
  // (MUST NOT) forbids a count in their place, so the list stays whole and it is
  // the BOX that is laid out to hold it. ⭐ `Confirmation` still carries the
  // `data-role`, so what a point on this surface answers is unchanged.
  const names = made(host, 'div', STYLE.confirmationNames)
  names.replaceChildren(text, ...items)
  drawn.replaceChildren(names, answers)
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
   * ⛔ Only `createElement`, `createElementNS`, `elementFromPoint` and one
   * `addEventListener` are called on it, and each is there because nothing else
   * can do its job: `createElementNS` because FR-029's shapes are SVG and an
   * element made outside that namespace draws nothing, and `elementFromPoint`
   * because IF-9 of table T-065 has the side that DREW an entrance answer where
   * it is.
   * ⛔⛔ THE FOURTH IS IN-6 OF TABLE T-028 (MUST, 利用者の裁定 2026-08-30), and
   * it is the one member that WATCHES rather than makes or asks. That row has a
   * press OUTSIDE a field settle the edit standing in it, 「欄の外」 includes the
   * schedule, and the schedule is not inside the tree this unit builds: IF-1
   * puts the whole picture up as its own surface beside this one. ⇒ No node
   * this unit owns is on the way from that press to anywhere, so the document is
   * the nearest thing that is. See `settleOnPressOutside` for what it does and
   * what it deliberately does not do (it reports nothing and raises no frame,
   * so FT-1 of table T-078 is untouched).
   * ⚠️ All four are asked for rather than assumed, so a host that lays nothing
   * out still works (`shapeNode`, `readScreenPartAt`, `settleOnPressOutside`).
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
   * MK-13's second half, handed to the caller once, before this factory returns
   * -- a way to put the person into the control this surface drew for one row of
   * table T-016: focus it, and leave every character already in it selected.
   *
   * ⛔⛔ ON THE WIRING AND NOT ON IF-9, WHICH IS WHERE THIS WAS SETTLED. That
   * row (MUST, CR-304) reads 「タスク ... ＝ プロパティパネルを出し、名称の欄
   * （表 T-016 の `PR-1`）を編集できる状態にして焦点を置き、既にある文字をすべて
   * 選んだ状態にすること」, and only the side that DREW the field can do it (LR-6
   * keeps the browser out of every other layer). ⛔ But `ScreenSurface` may not
   * carry it: the IF-9 cell of table T-065 names FIVE supplies and every one of
   * them is a question, so a sixth member would be that seam claiming a duty the
   * specification did not give it. ⭐ The wiring is the arrangement the Framework
   * already makes for exactly this -- `onAppHeaderHeightPx` above travels here
   * for the same reason, and `screen-surface.ts` records the bargain from the
   * seam's own side.
   *
   * ⛔⛔ ASK IT AFTER THE DESCRIPTION HAS BEEN DRAWN AND NOT BEFORE. The control
   * does not exist until `showScreenView` has built it, so a request made while
   * a frame is still being decided reaches the panel of the frame before.
   * ⚠️ A ROW THIS SURFACE DID NOT DRAW, or one whose control takes no characters,
   * does nothing. ⛔ That is not an error: what the panel came out as is the
   * drawing side's answer and not the asker's.
   *
   * ⛔⛔ OPTIONAL, AND THE FORGETTING IS SILENT (利用者の裁定 2026-08-30). It is
   * declared optional so that the callers already wiring this unit up go on
   * compiling; the cost is that a caller which never passes it leaves MK-13 half
   * done and neither the compiler nor a reader will say so. ⭐ The tests written
   * from the specification are what watch it.
   */
  readonly holdFocusPropertyField?: (focus: (row: string) => void) => void
  /**
   * HF-14's 「その場で打たせること（MUST）」, handed over the same way and at the
   * same moment: a way to open an EMPTY name field where the new row is going to
   * stand, under the row whose `TaskGroup.id` (AT-51) is passed in.
   *
   * ⭐⭐ WHY IT TRAVELS HERE AND NOT ON IF-9 -- the same bargain
   * `holdFocusPropertyField` above sets out at length: table T-065 names five
   * supplies for that seam and every one of them is a QUESTION, and this is a
   * request. ⛔ HF-14 cannot be met without it: the field is this unit's (LR-6),
   * the press is answered three layers away, and the row being named does not
   * exist yet, so there is nothing in `ScreenView` for a description to carry.
   *
   * ⛔ EMPTY, AND NOT MERELY CLEARED (HF-14, MUST NOT): 「既定の名を与えては
   * ならない」, because 「改名の入口が表 T-109 に 1 つも無い」ので、既定の名で立てる
   * と直せない行ができる.
   * ⚠️ ASK IT AFTER THE DESCRIPTION HAS BEEN DRAWN, for the reason above: the
   * field is placed against the rows the last paint put on the screen.
   * ⚠️ A ROW THIS SURFACE DID NOT DRAW does nothing, and quietly -- see
   * `newRowNameEntryBox`.
   *
   * ⛔⛔ OPTIONAL AND SILENTLY FORGOTTEN, exactly as the member above.
   */
  readonly holdOpenNewRowName?: (open: (parentGroupId: string | null) => void) => void
  /**
   * The name the person settled in that field, with the row it is to stand
   * under -- the other half of HF-14, going the other way.
   *
   * ⭐ PUSHED AND NOT PULLED, WHICH IS WHERE IT PARTS FROM `readFieldCommit`.
   * That member is IF-9's and is collected once a frame; this one is not on IF-9
   * at all (see the member above), and the settling is a happening the caller
   * has to answer with a write -- `onAppHeaderHeightPx` is the precedent for a
   * measurement leaving this unit the same way.
   *
   * ⛔ THE EMPTY NAME IS REPORTED TOO, AND THAT IS DELIBERATE. HF-14 (MUST):
   * 「名前が空のまま確定されたときは、その行を立てないこと」 -- which is a rule
   * about what to WRITE, and what to write is the caller's. ⭐ Reporting it lets
   * that caller put the field away and drop the pending row in one place;
   * swallowing it here would leave the caller waiting for a settling that never
   * comes. ⚠️ Whether a name of nothing but spaces is 「空」 is NOT decided here
   * or there: the text is carried exactly as it was typed, and no row of the
   * specification says which characters count as empty.
   *
   * ⛔⛔ OPTIONAL AND SILENTLY FORGOTTEN, exactly as the two above.
   */
  /*
   * ⚠️ `null` IS 段 0 AND NOT A MISSING ANSWER. HF-17 (MUST) adds a row at the
   * shallowest level through IC-93 and 「名前の扱いは `HF-14` に従う」, so this one
   * seam carries both namings and a row of that level has no parent (AT-52).
   * ⚠️ WRITTEN AS A METHOD AND NOT AS A FUNCTION-TYPED PROPERTY, which is the
   * one place in this interface that does so: a caller written before HF-17
   * annotates its own parameter `string`, and a method's parameters are
   * compared bivariantly -- so the widening does not force every such caller to
   * be rewritten in step. ⛔ THE COST IS REAL AND IS THE SAME ONE THE OPTIONAL
   * MEMBERS OF THIS SEAM CARRY: such a caller is handed `null` for a 段 0
   * naming and no compiler says so.
   */
  onNewRowNameSettled?(parentGroupId: string | null, name: string): void
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
  // it, and what the person settled.
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
  // HF-14 of table T-051 (MUST): 「名前は空で立て、その場で打たせること」. ⭐ Built
  // with the tree and never rebuilt, the same bargain `dialogueEntry` takes --
  // a node made at the moment it is wanted would be made after the paint that
  // was supposed to place it, and a node thrown away with the tree would take
  // the characters and the focus with it.
  const newRowNameEntry = host.createElement('input')
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
  // HF-12 (MUST): the folding entrance stands beside it, built and mounted the
  // same way and for the same reason.
  const collapseEveryRow = collapseEveryRowElement(host)
  // HF-16 and HF-17 (MUST), which joined that lineup on 2026-08-30: 段 0 opens
  // one level, and a row is added at 段 0. ⭐ Built and mounted the same way and
  // for the same reason as the two above.
  const openLevelZero = openLevelZeroElement(host)
  const addTopRow = addTopRowElement(host)
  // HF-12 (MUST): 「頭にいま何行を畳み込んでいるかを示すこと」. ⭐ Beside the
  // entrances and one step outside the outermost of them, built once with them
  // and written on every frame -- see `markFoldedRowCount`.
  const headFoldedRows = foldedRowCountElement(host, 0, headFoldedRowCountRight())
  rowTitlePanel.append(openEveryRow, collapseEveryRow, openLevelZero, addTopRow, headFoldedRows)

  dialogueEntry.setAttribute('type', 'text')
  dialogueEntry.setAttribute('style', STYLE.dialogueEntry)
  dialogueField.append(dialogueMessages, dialogueEntry)

  newRowNameEntry.setAttribute('type', 'text')
  // ⛔ NO `data-role` AND NO `data-icon`. Table T-103 names no part for a field
  // that stands in for a row not yet made and table T-109 no entrance -- the
  // entrance is IC-91, which is the control that OPENED this. ⭐ A mark of its
  // own instead, the move `data-corner-band` and `ROW_CONTROL_GROUND_MARK`
  // already make: what was drawn can be read back and held against the
  // specification (rule 04) without claiming to be a row of any table.
  newRowNameEntry.setAttribute(NEW_ROW_NAME_MARK, 'true')
  // ⛔ NO WORD IS INVENTED FOR IT, the same bargain the row controls keep:
  // FR-038 (MUST NOT) holds one dictionary and nothing on the wiring carries a
  // word, so the entrance that opened this field is its accessible name.
  newRowNameEntry.setAttribute('aria-label', ADD_CHILD_ROW_ENTRY)
  newRowNameEntry.setAttribute('style', STYLE.hidden)
  // ⛔ NOT MOUNTED HERE. The tree holds the rows the description carries and
  // nothing else -- a hidden node standing in it at all times would be one more
  // child on every frame for a field that is wanted on almost none, and what is
  // drawn is what is read back against the description (rule 04). ⭐ It is put in
  // when a naming begins and taken out when one ends.

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

  // STOP -- ⛔⛔ THE NAMES PAST THE FIRST SCREENFUL CANNOT BE BROUGHT INTO VIEW,
  // AND NOTHING THIS UNIT MAY DO REACHES IT. FR-032 (MUST) has the names of what
  // would go SHOWN, and with 300 of them the region above scrolls -- but neither
  // the wheel nor the scrollbar moves it (measured 2026-08-30 on the shipped
  // build: forty turns moved `scrollTop` by 0, and a drag down the scrollbar
  // moved it by 0). Both are stopped by `preventDefault`, which the input seam
  // calls because `isWheelHere` (PD-12) reads the pointer against the SCHEDULE's
  // regions and cannot know a surface floats above them, and because a press
  // anywhere carries an assignment.
  // ⛔ MK-10 IS NOT WHAT ASKS FOR THAT. Verbatim, its subject is 「**本ツールが
  // 割り当てた**修飾キーの付いた入力」 -- both its MUST (stop the browser's
  // default screen-wide) and its MUST NOT (do not stop a combination the tool
  // did not assign) speak only of inputs that CARRY A MODIFIER. A plain wheel
  // carries none, so no row asks for the environment's own scrolling to be taken
  // away here.
  // ⛔ AND THE TWO REPAIRS OPEN TO IT ARE BOTH SHUT. A listener on this layer
  // that stopped the turn from reaching the window is refused by uf-71's 「listens
  // only where IF-9 gives it something to notice」 (every listener must sit
  // inside the `Dialogue Field` or the `Properties Panel`), and one on the host
  // by the same file's 「asks the host for one listener and no more」. The other
  // seam -- letting `isWheelHere` answer false while a `Confirmation` stands --
  // needs a member of `InputContext` that only the shell can fill, and
  // `frame-loop.ts` is another body's this round.
  // ⭐ WHAT IS FIXED HERE IS NT-7's OWN MUST: the two answers no longer ride
  // inside the scrolling region, so 「続ける」 can be reached and pressed however
  // long the list is. ⚠️ PD-380 RECORDS THE REST AND NOTHING HERE IMPLEMENTS IT
  // -- the row is class F (wait for a ruling), so no provisional mark is claimed.

  let lastKeys: Readonly<Record<string, string>> = {}
  // ⛔ HELD SO THAT THE ATTRIBUTE IS WRITTEN ONLY WHEN IT MOVED. Every happening
  // of table T-078 runs a frame, and an attribute written again with the value
  // it already carries still costs the environment a style recalculation for
  // the whole subtree under it -- on the path NFR-002 measures. `showPointerShape`
  // in the shell holds its own last value for exactly this, and this is that
  // bargain on this side. ⚠️ The empty string is not a language, so the first
  // description always writes.
  let langShown = ''
  let headerHeightPx = 0
  /**
   * How wide the `Row Title Panel` was drawn last, in pixels -- the one number
   * HF-17's field has to stand against when the panel drew no row at all.
   *
   * ⚠️ THE PANEL'S OWN, taken where the panel is placed rather than measured a
   * second time: `panelEdge` reads U-24's divider (FR-052), which is what says
   * how far the panel reaches. ⛔ Zero until the first placement, and a field
   * placed then is a field of no width -- which is what a panel of no width is.
   */
  let rowTitlePanelWidthPx = 0
  // ⛔ Held apart from the number, and not folded into it as a 0 meaning 「not
  // measured yet」: 0 is a height a host really does answer, so the two must be
  // told apart or the first measurement is swallowed by the starting value --
  // which is the number FR-051 (MUST NOT) refuses to let anyone hold.
  let isHeaderHeightSettled = false
  let settled: Settlement | null = null
  let isFieldUp = false
  /**
   * The `Row Title Panel` as it was last DRAWN -- what HF-14's name field is
   * placed against.
   *
   * ⛔ THE DRAWN ONE AND NOT THE OFFERED ONE, which is the same distinction
   * `drawnKeys` is kept for: a frame that declines to redraw the tree (because
   * this very field is up) leaves the rows of the frame before on the screen,
   * and a field placed against a description that was never drawn would stand
   * where nothing is. ⚠️ `null` until the first paint, which is why the caller
   * is told to ask for the field only after a description has been drawn.
   */
  let lastRowTitlePanel: RowTitlePanel | null = null
  // ⛔ ONE AT A TIME AND THE LAST ONE WINS. A person can only have hold of one
  // control, and `change` is raised as the previous one is left -- so a second
  // commit before the shell has collected the first is a commit the shell would
  // have collected on the next frame anyway. ⚠️ Held here rather than on the
  // element because the element is thrown away by the next redraw.
  let fieldCommit: FieldCommit | null = null

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
  function anchorFor(key: string, anchor: TooltipAnchor): HTMLElement | undefined {
    for (const held of anchorsByPart.values()) {
      const found = held.get(key)
      if (found !== undefined) return found
    }
    // ⭐ AND THEN THE TREE ITSELF, BY THE ROW ID. EZ-2 of table T-040 (MUST)
    // reaches every row of table T-109 and (MUST NOT) lets one go quiet because
    // of the surface it stands on -- and the entrances drawn per ROW and per
    // PERSON (IC-58 .. IC-60, IC-77, IC-82, IC-63 ..) are built where no
    // `anchors` map is threaded, so the maps above hold none of them and the
    // explanation landed in the top-left corner. Measured on the shipped page.
    // ⭐ NOT A SECOND JOIN: `data-icon` carries the very row id `anchorKey`
    // is built out of, which is what the head of this file calls the join.
    // ⚠️ THE FIRST ONE DRAWN. FR-029 (MUST NOT) forbids one entrance to stand
    // in two places, so a row with two nodes is a fault where it is HELD.
    if (anchor.kind !== 'icon') return undefined
    return root.querySelector<HTMLElement>(`[data-icon="${anchor.icon}"]`) ?? undefined
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
   * One explanation shown against something (UF-69).
   *
   * ⚠️ IN-3 governs all of them: it can be dismissed, it can be pointed at, and
   * ⛔ it does not go away by itself -- which is why the browser's own `title`
   * attribute is nowhere in this file. That tooltip cannot be pointed at and
   * does go away by itself, so using it would break the row twice over.
   *
   * STOP -- ⛔ IN-3'S 「消せること」 HAS NO IMPLEMENTATION, HERE OR ANYWHERE.
   * A control inside the tooltip used to carry it, and the user ruled that
   * pressing a mark to put an explanation away is the wrong answer -- so the
   * control, the letter it showed and the anchor this side remembered are all
   * gone, and nothing took their place.
   * ⛔ NOTHING HERE MAY INVENT ONE. IN-4 of table T-028 (MUST) ends its ladder
   * of what `Esc` consumes with the explanation that is showing, and says in as
   * many words that it is placed last because it is the only means IN-3's
   * 「消せること」 has -- so that key is where the dismissal belongs, on the side
   * that reads keys, and it is not built this round. ⚠️ A second way of putting
   * a tooltip away, added here, would be a second entrance to one operation,
   * which FR-029 forbids (MUST NOT).
   *
   * @purity non-pure
   */
  function tooltipElement(tip: Tooltip): HTMLElement {
    const key = anchorKey(tip.anchor)
    const drawn = made(host, 'div', tooltipStyle())
    drawn.setAttribute('role', 'tooltip')
    drawn.setAttribute('data-anchor', key)
    // EZ-2 of table T-040 (MUST): the explanation, then the assignment.
    // ⛔ JOINED HERE AND NOT ON THE FAR SIDE. The description keeps the two
    // apart because the explanation IS the dictionary's word and has to be
    // readable as that word; putting them together is a drawing decision.
    // ⚠️ A space and nothing else -- a separator with meaning would be a
    // word, and FR-038 (MUST) keeps every word of the screen in the one
    // dictionary.
    // ⚠️ ASKED FOR TRUTH, NOT FOR `!== null`. A description that reaches this
    // unit without the member at all -- which the type forbids and a caller
    // can still do -- would otherwise put the word `undefined` in front of a
    // person. An empty string means the same as none, the reading every
    // other consumer of the dictionary takes.
    drawn.textContent = tip.assignment
      ? `${tip.text} ${tip.assignment}`
      : tip.text

    // ⭐ THE POINT THE DESCRIPTION CARRIES WINS, AND ONLY EZ-6's Task CARRIES
    // ONE. That explanation is anchored to a bar drawn into the schedule's own
    // picture, which goes up whole over IF-1 -- so there is no element of this
    // surface's to stand against, and `anchorFor` below would put it in the
    // top-left corner. ⚠️ Read rather than measured, for the reason the icons
    // are: the side that drew the bar is the side that can say where it is.
    // @provisional PD-391
    if (tip.at !== undefined) {
      // STOP -- ⚠️ IN-3 of table T-028 GRANTS EVERY TOOLTIP 「ポインタを乗せ
      // られること」, AND THIS ONE REFUSES THE POINTER. Measured on the shipped
      // page: standing at the point the pointer rests on, the box becomes the
      // element under that pointer, `readScreenPartAt` answers `Tooltip` for it,
      // and `grabAtPointer` turns away every point the screen surface answered
      // for -- so the bar underneath went unreachable and the explanation, once
      // taken away by a move, never came back.
      // ⭐ EZ-6 IS THE ROW THAT SETTLES IT for this raiser: 「ポインタが動いたら
      // 消すこと（MUST）」 means the very move that would carry the pointer onto
      // this box is the move that takes the box away, so the hovering IN-3
      // grants cannot be reached here whatever this line says. ⛔ The other two
      // raisers keep it: they stand against an element of their own, away from
      // the point, and this branch is not theirs.
      // ⚠️ REPORTED, NOT SETTLED HERE -- see PD-391.
      drawn.setAttribute(
        'style',
        tooltipStyle() + `pointer-events:none;left:${tip.at.x}px;top:${tip.at.y}px;`,
      )
      return drawn
    }

    // Placed against the very element that carries the anchor -- the entry that
    // was drawn for EZ-2's icon, the row FR-085 cut, or the lane FR-037's hint
    // belongs to. ⚠️ Read from the live tree rather than from a rectangle in the
    // description, because `ScreenView` carries no rectangle for an entry: that
    // is the same absence `ScreenSession.iconUnderPointer` records.
    const anchored = anchorFor(key, tip.anchor)
    if (anchored === undefined) {
      drawn.setAttribute('style', tooltipStyle() + 'left:0;top:0;')
      return drawn
    }
    const foundAt = anchored.getBoundingClientRect()
    drawn.setAttribute('style', tooltipStyle() + `left:${foundAt.left}px;top:${foundAt.bottom}px;`)
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
    // ⚠️ KEPT because HF-17's field has nothing else to stand against when the
    // panel drew no row -- see `openNewRowName`. ⛔ Not a second placing: it is
    // the very number written on the panel one line down.
    rowTitlePanelWidthPx = titleEdge === null ? 0 : titleEdge.x
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
    propertiesPanel.setAttribute('style', propertiesPanelStyle() + place)
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
    /**
     * What was actually PUT ON THE SCREEN this frame, which is what the next
     * frame compares against.
     *
     * ⛔⛔ NOT `keys`, AND THE DIFFERENCE IS A DEFECT THAT WAS MEASURED (D-133).
     * One part -- the `Properties Panel` -- may decline to redraw on a frame
     * whose description DID change, because a control of it is held and a
     * rebuild would take the characters and the caret with it. Recording the
     * description it declined to draw made the next frame answer `changed`
     * false, so the panel went on showing the description from BEFORE the
     * settling for as long as the person kept the field -- and after they let
     * it go as well, because by then nothing had changed any more.
     * ⇒ 完了率 stayed at its pre-Enter reading while the document held the new
     * one (measured 2026-08-30: the panel said 91, the document said 7).
     * ⭐ A part that skipped keeps its LAST DRAWN description, so the very next
     * frame that may draw it sees a difference and draws it. NFR-010 asks for
     * a redraw that follows what changed, and what changed is measured against
     * what is on the screen rather than against what was offered to it.
     */
    const drawnKeys: Record<string, string> = { ...keys }

    // FR-038 (MUST): one language for the WHOLE screen -- and this is the half
    // of that the dictionary cannot reach. Every control table T-016's 入力の型
    // column asks the host to draw (`CONTROL_INPUT_TYPE`) brings the
    // environment's own words with it: the calendar a `date` control opens is
    // the host's, and the host chooses which language to draw it in from the
    // `lang` the control inherits. ⛔ FR-038 (MUST NOT) keeps one dictionary as
    // the only store of translated strings, so those words are not GRS's to
    // hold -- what is left is to tell the environment which language the person
    // is reading in, and this attribute is how that is said.
    //
    // ⛔ ON THIS UNIT'S OWN ROOT AND NOT ON THE HOST'S `documentElement`.
    // `ScreenSurfaceWiring` says only `createElement` is called on the host,
    // and every control this unit draws hangs off this root, so one write
    // reaches all of them without breaking that promise. ⚠️ The PAGE's own
    // `lang` is therefore left as whoever built the page wrote it: carrying the
    // language out that far needs a second channel from the loop to the shell
    // -- the twin of `showPointerShape` -- which is not built here.
    // ⚠️ Not a `data-` attribute like the two `data-language`s already written
    // for the entry (IC-21) and the help: those are the DESCRIPTION read back,
    // and this one is what the environment itself acts on.
    //
    // ⛔ BEFORE THE HEADER IS REDRAWN AND RE-MEASURED, and that ordering is not
    // free: which language a box states can change which faces the environment
    // falls back to, and the very next block measures the height FR-051 (MUST)
    // takes from the environment. Written after it, the first frame in a new
    // language would report a height measured in the old one.
    //
    // ⚠️ WHICH ELEMENT CARRIES IT IS UNDECIDED, NOT THE FACT THAT ONE DOES.
    // FR-038 settles the state and WCAG 2.1 asks about the page and about its
    // parts in two separate rules, and no row of the manuscript says which of
    // the two this is -- PD-323 holds the question and the recommendation.
    //
    // @provisional PD-323
    if (view.language !== langShown) {
      langShown = view.language
      root.setAttribute('lang', view.language)
    }

    // ⛔ THE FIRST PART REDRAWN, because the height it measures is what
    // everything below it is placed against. FR-051 makes that height a
    // measurement rather than a number anyone holds, and the header is the only
    // part whose own size is one -- so it is the only part re-measured after
    // being rewritten. ⚠️ Only the `lang` above stands before it, and its note
    // says why it has to.
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
      // ⛔⛔ A REDRAW MAY NOT TAKE WHAT IS BEING TYPED, the same guard the
      // `Properties Panel` keeps below and for a reason measured there: table
      // T-078 runs a frame on every happening and `replaceChildren` detaches
      // every child of this tree -- and a detached `input` loses the focus, so
      // HF-14's field would come away between two letters with half a name in
      // it. While it is up the rows are left exactly as they stand; the frame
      // after the name is settled draws them again from the description.
      // ⛔ THE DESCRIPTION THAT WAS NOT DRAWN IS NOT RECORDED AS DRAWN (D-133).
      // See `drawnKeys`.
      if (newRowNaming !== null) {
        drawnKeys.rowTitlePanel = lastKeys.rowTitlePanel ?? ''
      } else {
        fillRowTitleTree(host, rowTitleTree, view.rowTitlePanel, anchorsOf('rowTitlePanel'))
        lastRowTitlePanel = view.rowTitlePanel
      }
      // HF-10 (MUST NOT): the entrance may not overlap the pinned rows' controls,
      // and the band above the topmost row is where it does not. ⚠️ Recorded and
      // not enforced: the entrance stays where HF-10 (MUST) puts it, and this
      // says how much room was there -- `rowsTopPx` holds why the band cannot be
      // asked for outright. ⛔ Absent when the panel draws no row, because then
      // there is nothing for it to overlap and no first row to measure from.
      const rowsTop = rowsTopPx(view.rowTitlePanel)
      // ⚠️ WRITTEN ON BOTH, because HF-12 takes HF-10's placement and so takes
      // its MUST NOT with it: the pair of them is what may not overlap the
      // pinned rows' controls.
      for (const corner of [openEveryRow, collapseEveryRow, openLevelZero, addTopRow]) {
        if (rowsTop === null) corner.removeAttribute('data-corner-band')
        else corner.setAttribute('data-corner-band', String(rowsTop - headerHeightPx))
      }
      // FR-029 (MUST): the two entrances the panel draws for itself are made
      // faint where they have nothing left to do, exactly as the three drawn on
      // each row are -- 「表 T-109 の全行」, and 「載る面によって薄くしない
      // 入口があってはならない（MUST NOT）」.
      // ⛔ THE STEPS ARE THE ONES THE PAIR WAS BUILT WITH: HF-12 takes HF-10's
      // placement, and the style carries the placement, so it is restated with
      // the paint rather than kept in two places.
      markPanelCornerEntry(openEveryRow, 1, view.rowTitlePanel.canOpenEveryRow)
      markPanelCornerEntry(collapseEveryRow, 2, view.rowTitlePanel.canCloseEveryRow)
      // HF-16 (MUST): 「開ける段が無いときは、`FR-029` に従って薄く描くこと」.
      markPanelCornerEntry(openLevelZero, 3, view.rowTitlePanel.canOpenLevelZero)
      // ⛔ IC-93 IS NEVER FAINT AND NOTHING SPENDS IT. FR-029 draws faint the
      // entrance that can change neither document nor screen, and adding a row
      // at 段 0 always changes the document -- FR-085 allows a row of the
      // shallowest level, so S-125's cap cannot refuse depth 1.
      markPanelCornerEntry(addTopRow, 0, true)
      // HF-12 (MUST): what the head is holding folded right now, 段 0's own
      // fold included -- `RowTitlePanel.foldedRowCount` carries the number and
      // 「示さないと、行が消えたのか畳まれたのかが読めない」 is why.
      markFoldedRowCount(
        headFoldedRows,
        view.rowTitlePanel.foldedRowCount ?? 0,
        headFoldedRowCountRight(),
      )
    }
    if (changed('propertiesPanel') && view.propertiesPanel !== null) {
      markPropertiesPanel(propertiesPanel, view.propertiesPanel)
      // ⛔ A REDRAW MAY NOT TAKE WHAT IS BEING TYPED. Table T-078 runs a frame on
      // every happening, and `replaceChildren` throws away the very control the
      // person has hold of -- so half a name would be swept away between two
      // letters, and the caret with it. While a control of this panel is held the
      // fields it drew are left exactly as they stand; the frame after the person
      // leaves the control draws them again from the description.
      // ⚠️ The two attributes above are still written: they say which of FR-072's
      // two the panel is on, which no control holds and which a check reads back.
      // ⛔ THE ANSWER IS NOT READ OFF THE HOST. `ScreenSurfaceWiring` says only
      // `createElement` is called on it, and asking for `activeElement` would
      // break that promise for a fact the panel watches for itself -- `focusin`
      // and `focusout` bubble to it.
      // ⛔ `anchorsOf` IS ASKED FOR ONLY ON THE FRAMES THAT REALLY REDRAW, and
      // that is why the test stands out here rather than inside: it EMPTIES the
      // map, and a frame that leaves the drawn header alone would then have
      // thrown away the anchor of an entry still on the screen.
      if (isFieldHeld) {
        // ⛔ THE DESCRIPTION THAT WAS NOT DRAWN IS NOT RECORDED AS DRAWN (D-133).
        // See `drawnKeys`: putting `keys` here is what left the panel showing a
        // reading the document no longer held, for good.
        drawnKeys.propertiesPanel = lastKeys.propertiesPanel ?? ''
      } else {
        fillPropertiesPanel(
          host,
          propertiesPanel,
          view.propertiesPanel,
          anchorsOf('propertiesPanel'),
          typedControlsByRow,
        )
      }
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
      // ⛔ NOTHING IS HELD BACK: what is drawn is what the description holds.
      // A tooltip a person had put away used to be filtered out here, and
      // `tooltipElement` carries the STOP that says why that is gone and where
      // IN-3's 「消せること」 belongs instead.
      tooltipLayer.replaceChildren(...view.tooltips.map((one) => tooltipElement(one)))
    }

    lastKeys = drawnKeys
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
   * What a settled control is worth, as the row of table T-016 it names and the
   * text that crosses -- or `null` for something this unit did not draw as a
   * control.
   *
   * ⚠️ A checkbox carries its value in `checked` and every other control in
   * `value`; the spelling a truth value crosses in is the one `textOfValue`
   * writes on the other side, so nothing new is minted.
   *
   * ⭐ TAKEN OUT OF `onFieldChange` SO THE TWO WAYS OF SETTLING BUILD THE SAME
   * VALUE. SK-19's `Enter` and the host's own `change` are two ways into one
   * answer of IF-9, and a second reading written beside the first would be a
   * second place for the row and the text to be decided.
   *
   * @purity pure
   */
  function fieldCommitOf(target: unknown): FieldCommit | null {
    // ⚠️ NOT `instanceof Element`. Table T-075 leaves this unit runnable
    // against a host that is not a browser, and `Element` is a global that host
    // need not have at all -- so what the map holds is what says this was one
    // of the controls drawn here.
    if (target === null || typeof target !== 'object') return null
    const named = CONTROL_KEYS.get(target as Element)
    if (named === undefined) return null
    const input = target as HTMLInputElement
    const text = input.type === 'checkbox' ? String(input.checked) : input.value
    return { row: named.row, key: named.key, text }
  }

  /**
   * A person settled a value in one of the property fields.
   *
   * ⭐ ONE LISTENER ON THE PANEL AND NOT ONE PER CONTROL. `change` bubbles, the
   * fields are rebuilt on nearly every frame, and a listener per control would
   * be registered and dropped dozens of times a second. ⚠️ It is hung on the
   * panel once, where it lives as long as the panel does -- the same bargain
   * `openEveryRow` takes.
   *
   * ⛔ `change` AND NOT `input`, which is the whole of the difference between
   * one undo step and one per letter: see `controlElement`.
   *
   * ⚠️ A `change` on something this unit did not draw as a control is ignored
   * rather than guessed at -- `CONTROL_KEYS` holds only what `controlElement`
   * put there.
   *
   * ⛔ A `change` THAT ONLY SAYS AGAIN WHAT `Enter` ALREADY SETTLED IS DROPPED.
   * The host raises `change` on leaving a control whose value differs from the
   * one it was focused with, and SK-19's listener below moves that baseline as
   * it settles -- so a person who presses `Enter` and then leaves the field
   * would otherwise put TWO writes of one value on the undo history, which
   * FR-031 (MUST) with UN-3 of table T-027 forbids: 一つの変更は一段である.
   * ⚠️ MEASURED, NOT REASONED: with `Enter` stopped from reaching the browser
   * (MK-10, and see that listener), the host still raises the `change` on the
   * LEAVING, and it carries the very text `Enter` settled.
   *
   * @purity non-pure
   */
  function onFieldChange(event: Event): void {
    const commit = fieldCommitOf(event.target)
    if (commit === null) return
    const target: unknown = event.target
    if (target === (heldTextControl as unknown) && commit.text === heldTextValueAtFocus) return
    fieldCommit = commit
  }

  propertiesPanel.addEventListener('change', onFieldChange)

  /**
   * The control this panel drew for each row of table T-016 that a person types
   * into, as the last redraw left it -- what `focusPropertyField` reaches one by.
   *
   * ⛔ REBUILT WITH THE PANEL AND NOT KEPT ACROSS IT. `fillPropertiesPanel`
   * empties it before it draws, because `replaceChildren` throws every control
   * of the frame before away -- a row left standing would name a node that is no
   * longer on the page.
   * ⚠️ A STRONG MAP AND NOT A WEAK ONE, unlike `CONTROL_KEYS`: the key here is
   * the ROW and the control is the value, so nothing is kept alive that the
   * clearing above does not release.
   */
  const typedControlsByRow = new Map<string, TextEntryControl>()

  /**
   * MK-13's second half (MUST), carried out where the field is: the control of
   * one row of table T-016 is given the focus and everything already in it is
   * left selected.
   *
   * ⭐ WHY IT IS ASKED FOR AT ALL rather than watched for: `ScreenSurface` says
   * it at length. The shell decides that MK-13 happened and this side is the
   * only one that can reach a control (LR-6).
   *
   * ⛔ A ROW THAT WAS NOT DRAWN DOES NOTHING, and quietly: the asker asks before
   * the description it asked for was on the screen, so what the panel came out
   * as is this side's answer and not a fault of the asking.
   * ⚠️ Both calls are guarded, the reason `blur` is: table T-075 leaves this
   * unit runnable against a host that lays nothing out, and such a host need
   * give its elements neither.
   * ⭐ NOTHING IS RECORDED HERE ABOUT THE HOLD. The host raises `focusin` on the
   * panel of its own accord, and that listener is the one place `heldTextControl`
   * and IN-4's 「編集を始める前の値」 are written -- a second writer here would be
   * a second opinion about which control is held.
   *
   * @purity non-pure
   */
  function focusPropertyField(row: string): void {
    const control = typedControlsByRow.get(row)
    if (control === undefined) return
    if (typeof control.focus === 'function') control.focus()
    // 「既にある文字をすべて選んだ状態にすること（MUST）」 -- after the focus, so
    // that the host's own focus handling does not move the caret afterwards.
    if (typeof control.select === 'function') control.select()
  }

  /**
   * Whether a person has hold of one of this panel's controls.
   *
   * ⛔ WATCHED RATHER THAN ASKED FOR. `ScreenSurfaceWiring` states that only
   * `createElement` is called on the host, and `focusin` / `focusout` bubble to
   * the panel -- so the panel answers for its own controls, which is the same
   * bargain Chapter 5.3 states under table T-065 about the side that drew a
   * part. ⚠️ `focusout` runs before `focusin` when the focus moves from one
   * control to the next, which is harmless: what the flag guards is a redraw,
   * and a redraw between the two would draw the description that is true then.
   */
  let isFieldHeld = false
  /**
   * The control the person is typing in, or `null` while none is held -- what
   * `hasUnsettledTextEntry` answers from, and what an `Esc` puts back.
   *
   * ⛔ A NARROWER THING THAN `isFieldHeld`, AND THE TWO ARE NOT ONE VALUE. That
   * flag guards a REDRAW and so is raised by a checkbox and a chooser as well;
   * this one is IF-9's 「まだ確定していない文字入力」, and a checkbox holds no
   * characters at all. Folded together, `Delete` would be swallowed (IN-5a) on
   * a control where it takes nothing back, and SK-3 would be unreachable while
   * a chooser had the focus.
   */
  let heldTextControl: TextEntryControl | null = null
  /**
   * What stood in that control when the person took hold of it -- IN-4's
   * 「編集を始める前の値」.
   *
   * ⛔ READ AT `focusin` AND NOT AT THE REDRAW. The panel leaves a held control
   * exactly as it stands (see `showScreenView`), so the description is no
   * record of what the person started from; the moment they took hold of it is.
   */
  let heldTextValueAtFocus = ''
  /**
   * Whether the characters in the held control have already been taken back by
   * an `Esc`, and nothing has been typed since.
   *
   * ⭐ THIS IS WHAT KEEPS IN-4 AT 1 階層 PER PRESS (MUST). The first `Esc`
   * puts the value back and the level is spent on the edit -- so this side goes
   * on answering `true`, and the shell, which reads that answer AFTER this
   * listener has run, stops the ladder at 「確定していないその場の編集」 and
   * takes nothing else. The SECOND `Esc` finds nothing left unsettled, this side
   * lets the control go, and the ladder moves on to the rung below.
   * ⚠️ MEASURED, NOT REASONED: with the control released on the first press the
   * panel came away on that same press, because the shell read `false` from a
   * flag this listener had just cleared.
   *
   * ⛔ `Enter` DOES NOT USE THIS FLAG, AND MUST NOT BE FOLDED INTO IT. That key
   * lets the control GO (see its listener), which is a different end to the
   * unsettled edit from `Esc`'s: IN-4 spends a press per level and needs the
   * field kept, while SK-19 needs it gone -- and IN-5a reads the very same
   * answer, so a flag that said 「確定済み」 with the field still focused would
   * hand every single-character key back to table T-036 while a person was
   * still typing in it.
   */
  let isHeldTextTakenBack = false
  propertiesPanel.addEventListener('focusin', (event: Event) => {
    isFieldHeld = true
    heldTextControl = textEntryControlOf(event.target)
    heldTextValueAtFocus = heldTextControl === null ? '' : heldTextControl.value
    isHeldTextTakenBack = false
  })
  propertiesPanel.addEventListener('focusout', () => {
    isFieldHeld = false
    heldTextControl = null
    heldTextValueAtFocus = ''
    isHeldTextTakenBack = false
  })
  // ⚠️ `input` AND NOT `change`, which is the one place in this unit where that
  // is right: this is not a commit -- it is the person putting characters in
  // again after a cancellation, which makes the edit unsettled once more.
  propertiesPanel.addEventListener('input', () => {
    isHeldTextTakenBack = false
  })

  /**
   * IN-4's FIRST level of table T-028, spent where the characters are.
   *
   * ⛔ SPENT HERE BECAUSE NOWHERE ELSE CAN SPEND IT. `escapeTarget` (PI-36) puts
   * 「確定していないその場の編集」 at the head of the ladder and answers
   * `'textEntry'` for it, and the shell that reads that answer holds no field --
   * the control is this unit's, and LR-6 keeps the browser out of every layer
   * that could otherwise reach it. So the ladder names the level and this side
   * carries it out, the same division `'gesture'` and `'confirmation'` already
   * stand in.
   *
   * ⛔ 取り消したときは、編集を始める前の値へ戻すこと（MUST）。書きかけの文字を
   * 文書へ書いてはならない（MUST NOT） -- IN-4 with FR-031. Putting the value
   * back BEFORE leaving the control is what keeps the second half: the host
   * raises `change` on leaving only where the value differs from the one the
   * control was focused with, so a restored value raises none and no commit is
   * ever built from the abandoned characters.
   *
   * ⛔ THE CONTROL IS NOT LET GO ON THIS PRESS, and that is measured rather
   * than preferred: this listener runs BEFORE the shell's, so a flag cleared
   * here is the value the shell reads, and the ladder then took the
   * `Properties Panel` away on the very press that cancelled the edit -- two
   * levels for one press, which IN-4 forbids (1 階層, MUST). The level is
   * spent on the edit, the person keeps the field, and the NEXT `Esc` finds
   * nothing unsettled and moves on.
   *
   * ⛔ `preventDefault` IS NOT CALLED HERE. MK-10's answer for the whole
   * happening is `TranslatedInput.isBrowserDefaultStopped`, which the input seam
   * (IF-2) reports and its own listener acts on; a second opinion raised here
   * would put the decision in two places.
   *
   * @purity non-pure
   */
  propertiesPanel.addEventListener('keydown', (event: Event) => {
    const held = heldTextControl
    if (held === null) return
    if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
    if (isHeldTextTakenBack) {
      // Nothing stands unsettled any more, so this press is not the edit's.
      // ⚠️ Guarded rather than assumed: table T-075 leaves this unit runnable
      // against a host that is not a browser, and one that lays nothing out
      // need not give its elements a `blur` at all.
      if (typeof held.blur === 'function') held.blur()
      heldTextControl = null
      heldTextValueAtFocus = ''
      isFieldHeld = false
      isHeldTextTakenBack = false
      return
    }
    held.value = heldTextValueAtFocus
    isHeldTextTakenBack = true
  })

  /**
   * SK-19 of table T-036, spent where the characters are: `Enter` settles the
   * in-place edit, and that row's own list names 「プロパティの入力」.
   *
   * ⛔⛔ SETTLED HERE BECAUSE NOWHERE ELSE CAN SETTLE IT, and this was measured
   * rather than reasoned. The host raises `change` on `Enter` of its own accord
   * -- but SK-19 IS an assignment, so `commandFromKey` answers it and MK-10 then
   * has the input seam call `preventDefault`, WHICH IS EXACTLY WHAT STOPS THE
   * HOST FROM RAISING THAT `change`. ⇒ The tool took the key away from the
   * browser and put nothing in its place, so no `Enter` ever reached the
   * document and 表 T-016's items were editable in appearance only (FR-006).
   *
   * ⭐ THIS LISTENER RUNS BEFORE THE SHELL'S, which is what makes one press
   * enough: `DomInputSource` listens on the window and this is hung on the
   * panel, so the commit is standing by the time `spendFieldCommit` reads it at
   * the head of the same happening. ⚠️ The `Esc` listener above already rests on
   * that same order and records that it was measured.
   *
   * ⭐⭐ THE CONTROL IS LET GO, AND THAT REVERSES WHAT STOOD HERE. The note
   * that stood in its place said releasing it would take the `Properties Panel`
   * away on the very press that settled the value; that is no longer so, and
   * the shell's `settleTextEntry` case is why -- it returns on
   * `didSettleFieldEntry`, which is raised by the very commit this listener has
   * just left standing. ⛔ AND KEEPING IT MADE SK-19's SECOND STAGE
   * UNREACHABLE: that row (MUST) puts the panel away on an `Enter` with
   * 「確定していないその場の編集が 1 つも無いとき」, `hasUnsettledTextEntry`
   * answers from the control being HELD, and a control never let go answers
   * 「あり」 for ever -- so a second `Enter` found the same state as the first
   * and the stage could not be raised.
   * ⭐ IT ALSO CLOSES A WRITE NOBODY ASKED FOR. With the control kept, a second
   * `Enter` built a second commit carrying the SAME text, which put a second
   * `setTaskName` on the undo history for an edit nobody made -- FR-031 with
   * UN-3 of table T-027 (一つの変更は一段である) and IN-6's 「始めた値と同じ値を
   * 書いてはならない」 both refuse it. Released, the second press finds nothing
   * held and returns at the first line.
   * ⛔ THE BASELINE IS MOVED BEFORE THE RELEASE, and the order is what keeps the
   * host's own `change` from becoming that second write: the host raises it on
   * leaving a control whose value differs from the one it was focused with, and
   * `onFieldChange` drops the one that says again what is already settled -- but
   * only while `heldTextControl` still names the control it is comparing.
   * ⚠️ Guarded rather than assumed, the reason IN-4's listener gives: table
   * T-075 leaves this unit runnable against a host that lays nothing out.
   *
   * ⚠️ A modified `Enter` is left alone, the same bargain `onEntryKeyDown`
   * takes: MK-10 keeps combinations the tool did not assign for the browser,
   * and `commandFromKey` assigns SK-19 to the plain press only.
   *
   * @purity non-pure
   */
  propertiesPanel.addEventListener('keydown', (event: Event) => {
    const held = heldTextControl
    if (held === null) return
    const key = event as Partial<KeyboardEvent>
    if (key.key !== HOST_ENTER || key.isComposing === true) return
    if (key.ctrlKey === true || key.altKey === true) return
    if (key.metaKey === true || key.shiftKey === true) return
    const commit = fieldCommitOf(event.target)
    if (commit === null) return
    // ⛔ A VALUE THAT DID NOT MOVE IS NOT WRITTEN, the same rule IN-6's listener
    // keeps and for the same reason (FR-031 with UN-3): the person may settle a
    // field they never changed.
    if (commit.text !== heldTextValueAtFocus) fieldCommit = commit
    // IN-4's 「編集を始める前の値」 is now the value just settled, which is what
    // the `change` raised by the release below is compared against.
    heldTextValueAtFocus = commit.text
    if (typeof held.blur === 'function') held.blur()
    heldTextControl = null
    heldTextValueAtFocus = ''
    isFieldHeld = false
    isHeldTextTakenBack = false
  })

  /**
   * IN-6 of table T-028, spent where the characters are: a press OUTSIDE the
   * field settles the edit standing in it (MUST) and does not take it back
   * (MUST NOT) -- the ruling of 2026-08-30 (CR-295).
   *
   * ⛔⛔ WHY THE PRESS HAS TO DO IT AT ALL, AND THIS WAS MEASURED. The press
   * carries an assignment, so MK-10 has the input seam call `preventDefault` --
   * and that is exactly what stops the host moving the focus off the field. The
   * field therefore kept it however far away a person pressed, IF-9's fifth
   * answer went on saying 「まだ確定していない文字入力がある」 for ever, and on
   * that answer WS-2 of table T-067 refused every write of the `Agent API` and
   * IN-5a swallowed every `Delete`. ⇒ One field held two mechanisms shut.
   *
   * ⛔⛔ HUNG ON THE HOST, AND THAT IS THE ONE PLACE IT CAN HANG -- measured in
   * the shipped build on 2026-08-30, not reasoned. 「欄の外」 includes the
   * schedule, which is what the ruling names, and the schedule does NOT go up
   * inside this unit's tree: IF-1 hands the whole picture over as its own
   * surface, so the built page has TWO children under `body` -- the `Schedule
   * Canvas` and the mount this unit draws in. A press at (600, 291) reports the
   * path `polygon < svg < div[Schedule Canvas] < body`, in which this unit's
   * root does not appear at all. ⇒ A listener on the root hears every press but
   * the ones the ruling is about.
   * ⛔ THIS IS THE ONE MEMBER OF THE HOST THIS UNIT ASKS FOR BEYOND MAKING A
   * NODE AND ASKING ABOUT A POINT, and it is asked for because IN-6 (MUST)
   * cannot be carried out without it: the field is this unit's (LR-6 keeps
   * every other layer away from it), and no member of IF-9 is asked at the
   * moment of the press -- `readScreenPartAt` is asked on a HOVER as well, so
   * settling there would end an edit whenever the pointer crossed the screen.
   * ⚠️ Guarded, the same way `blur` is: table T-075 leaves this unit runnable
   * against a host that is not a browser.
   * ⭐ IT RUNS BEFORE THE SHELL'S, the same order `Enter` above rests on:
   * `DomInputSource` listens on the window and this is hung on the document, so
   * the commit is standing by the time `spendFieldCommit` reads it at the head
   * of the same happening.
   *
   * ⛔ THE PRESS ITSELF IS NOT TOUCHED. IN-6 (MUST NOT) forbids stopping what
   * the press does -- the settling rides ON the press rather than replacing it
   * -- so nothing here calls `preventDefault`, `stopPropagation` or
   * `stopImmediatePropagation`, and what the press does is left to table T-023a
   * and IN-1.
   * ⛔ A VALUE THAT DID NOT MOVE IS NOT WRITTEN (IN-6, MUST NOT): writing the
   * value the field was focused with would put a step on the undo history for an
   * edit nobody made (FR-031 with UN-3), which is the very guard `onFieldChange`
   * keeps and `Enter` moves the baseline for.
   *
   * ⚠️ A PRESS ON ANOTHER FIELD OF THIS SAME PANEL SETTLES BUT DOES NOT RELEASE.
   * That press is assigned too, so the host's own focus move is stopped as well
   * -- letting go here would leave the person with the focus nowhere at all,
   * which is worse than where they started. ⛔ No row settles this corner; only
   * 「欄の外」 is ruled on.
   * @provisional PD-352
   *
   * @purity non-pure
   */
  if (typeof host.addEventListener === 'function') {
    host.addEventListener('pointerdown', settleOnPressOutside)
  }

  /** @purity non-pure */
  function settleOnPressOutside(event: Event): void {
    // IN-6 of table T-028 (MUST) reaches HF-14's field as well: a press outside
    // it settles what stands in it. ⛔ Answered BEFORE the properties panel's
    // own field below and not inside it -- the two fields are held by two
    // different variables, and a press outside both has to settle both.
    // ⚠️ A press INSIDE the field settles nothing, the same first test the
    // panel's field makes.
    if (
      newRowNaming !== null &&
      (event as { target?: unknown }).target !== (newRowNameEntry as unknown)
    ) {
      settleNewRowName()
    }
    const held = heldTextControl
    if (held === null) return
    const pressedOn: unknown = (event as { target?: unknown }).target
    // The press is INSIDE the field it would settle, so there is nothing
    // outside it to settle from.
    if (pressedOn === (held as unknown)) return

    const commit = fieldCommitOf(held)
    if (commit !== null && commit.text !== heldTextValueAtFocus) {
      fieldCommit = commit
      // IN-4's 「編集を始める前の値」 moves to what was just settled, exactly as
      // `Enter` moves it -- so the host's `change` on leaving carries nothing
      // new and `onFieldChange` drops it.
      heldTextValueAtFocus = commit.text
    }
    isHeldTextTakenBack = false

    // PD-352: another field of this panel keeps the person's place.
    if (textEntryControlOf(pressedOn) !== null) return

    // ⚠️ Guarded rather than assumed, the reason IN-4's listener gives: table
    // T-075 leaves this unit runnable against a host that lays nothing out, and
    // such a host need not give its elements a `blur` at all -- so the flags are
    // cleared here as well and not left to a `focusout` that may never come.
    if (typeof held.blur === 'function') held.blur()
    heldTextControl = null
    heldTextValueAtFocus = ''
    isFieldHeld = false
  }

  // ------------------------------------------------- HF-14's name field ---

  /**
   * The row HF-14's field is naming a child OF -- `TaskGroup.id` (AT-51) -- or
   * `null` while no such naming is in flight.
   *
   * ⭐ ONE VALUE FOR TWO QUESTIONS: whether the field is up, and whose child it
   * will make. A second flag for the first of them would be a second opinion
   * about the same fact.
   */
  // ⭐ A BOX AROUND THE PARENT AND NOT THE PARENT ITSELF, because the parent
  // may itself be `null`: HF-17 (MUST) has IC-93 add a row at 段 0, whose
  // parent is none (AT-52) -- so a bare `string | null` could not tell 「no
  // field is up」 from 「a field is up at the shallowest level」.
  let newRowNaming: { readonly parentGroupId: string | null } | null = null
  /**
   * Whether an `Esc` has already taken the characters back and nothing has been
   * typed since -- IN-4's 1 階層 per press (MUST), kept exactly as the
   * properties panel's `isHeldTextTakenBack` keeps it and for the same measured
   * reason: released on the first press, the field came away on the very press
   * that cancelled the edit, which spends two levels of table T-028 on one.
   * ⚠️ THE VALUE PUT BACK IS THE EMPTY ONE, because HF-14 (MUST NOT) starts the
   * row with no name at all -- so IN-4's 「編集を始める前の値へ戻すこと」 is a
   * clearing here, and nothing of what was typed reaches the document.
   */
  let isNewRowNameTakenBack = false

  /**
   * HF-14's 「その場で打たせること（MUST）」, carried out where the field is.
   *
   * ⭐ PLACED AGAINST THE ROWS THE LAST PAINT DREW, which is why the caller is
   * told to ask AFTER a description has been drawn: `newRowNameEntryBox` reads
   * the parent's own box and depth out of that description.
   * ⛔ A ROW THIS SURFACE DID NOT DRAW DOES NOTHING, and quietly -- the row may
   * have left the picture between the press and the paint, and a field placed
   * against a row that is not there would stand at an invented place. ⚠️ Nothing
   * is reported back then: no name was settled, so there is nothing to settle.
   *
   * @purity non-pure
   */
  function openNewRowName(parentGroupId: string | null): void {
    const panel = lastRowTitlePanel
    if (panel === null) return
    // ⭐⭐ THE EMPTY PANEL IS 段 0's OWN CASE AND MUST NOT BE REFUSED. HF-17
    // (MUST) exists precisely for it -- 「本行が無いと、最も浅い段の行を作る道が
    // 画面から消える ... 行が 1 つも無い文書では押す相手が存在しない」 -- and with
    // no row drawn there is no row to measure the field against. ⇒ It is placed
    // against the PANEL instead: the panel's own left edge and width, under the
    // band the head's entrances stand in.
    // ⛔ STILL NOTHING FOR A ROW'S OWN FIELD (IC-91): that one goes under a
    // parent, and a parent that left the picture is the case
    // `newRowNameEntryBox` answers `null` for.
    const placed =
      newRowNameEntryBox(panel, parentGroupId) ??
      (parentGroupId === null && panel.titles.length === 0 && panel.pinnedTitles.length === 0
        ? {
            box: {
              x: 0,
              y: headerHeightPx + panelCornerStepPx(),
              width: rowTitlePanelWidthPx,
              height: 0,
            },
            indentPx: 0,
          }
        : null)
    if (placed === null) return
    newRowNaming = { parentGroupId }
    isNewRowNameTakenBack = false
    // ⛔ EMPTY (HF-14, MUST NOT): 「既定の名を与えてはならない」.
    newRowNameEntry.value = ''
    // ⚠️ AN EMPTY VALUE IS 段 0. The mark's name is 「the row this field's row
    // goes under」 and HF-17's row goes under none, so nothing is written in it
    // -- ⛔ no stand-in id is minted, which would name a row that does not exist.
    newRowNameEntry.setAttribute(NEW_ROW_NAME_MARK, parentGroupId ?? '')
    newRowNameEntry.setAttribute('style', newRowNameEntryStyle(placed.box, placed.indentPx))
    // ⭐ PUT INTO THE TREE ONLY NOW, and it stays until the naming ends: the
    // frame after this one declines to redraw the tree while the field is up
    // (see `showScreenView`), so `replaceChildren` cannot take it away under the
    // person's hand.
    rowTitleTree.append(newRowNameEntry)
    // ⚠️ Guarded rather than assumed, the reason IN-4's listener gives: table
    // T-075 leaves this unit runnable against a host that lays nothing out, and
    // such a host need give its elements no `focus` at all.
    if (typeof newRowNameEntry.focus === 'function') newRowNameEntry.focus()
  }

  /**
   * The settling: what stands in the field goes to the caller, and the field
   * comes away.
   *
   * ⛔ THE EMPTY NAME TRAVELS TOO. HF-14 (MUST) refuses to stand the row up when
   * 「名前が空のまま確定された」, and that is a rule about the WRITE -- which is
   * the caller's. Swallowing the settling here would leave that caller holding a
   * pending row that never resolves. ⚠️ `onNewRowNameSettled` records that no
   * side trims the text: no row says which characters count as 「空」.
   *
   * @purity non-pure
   */
  function settleNewRowName(): void {
    const naming = newRowNaming
    if (naming === null) return
    const settled = newRowNameEntry.value
    newRowNaming = null
    isNewRowNameTakenBack = false
    newRowNameEntry.value = ''
    newRowNameEntry.removeAttribute(NEW_ROW_NAME_MARK)
    newRowNameEntry.setAttribute('style', STYLE.hidden)
    if (typeof newRowNameEntry.blur === 'function') newRowNameEntry.blur()
    // ⚠️ Guarded rather than assumed, the reason `blur` is: table T-075 leaves
    // this unit runnable against a host that lays nothing out, and such a host
    // need give its elements no `remove` either. ⛔ The hidden declaration above
    // is what covers that host, and the next redraw of the tree takes the node
    // out in any case -- this only keeps the tree the rows alone until then.
    if (typeof newRowNameEntry.remove === 'function') newRowNameEntry.remove()
    wiring.onNewRowNameSettled?.(naming.parentGroupId, settled)
  }

  /**
   * SK-19 and IN-4 of table T-028, spent where the characters are -- the same
   * two the properties panel's own listeners carry and for the same measured
   * reasons, which those listeners set out at length.
   *
   * ⭐ HUNG ON THE FIELD AND NOT ON THE PANEL. This field is one control rather
   * than a drawn set of them, so there is nothing for a listener further out to
   * tell apart; the panel's listeners hang where they do because `focusin`
   * bubbles from many controls to one place.
   * ⛔ `preventDefault` IS NOT CALLED HERE, the same bargain the panel's `Esc`
   * listener keeps: MK-10's answer for the whole happening is
   * `TranslatedInput.isBrowserDefaultStopped`, and a second opinion raised here
   * would put that decision in two places.
   *
   * @purity non-pure
   */
  newRowNameEntry.addEventListener('keydown', (event: Event) => {
    if (newRowNaming === null) return
    const key = event as Partial<KeyboardEvent>
    if (key.key === HOST_ESCAPE_KEY) {
      // IN-4's FIRST level: the characters go back to what the edit started
      // from, which HF-14 makes the empty name. ⭐ The field is NOT let go on
      // this press -- IN-4 spends one level per press, and the next `Esc` finds
      // nothing unsettled and moves the ladder on.
      if (isNewRowNameTakenBack) {
        settleNewRowName()
        return
      }
      newRowNameEntry.value = ''
      isNewRowNameTakenBack = true
      return
    }
    if (key.key !== HOST_ENTER || key.isComposing === true) return
    // ⚠️ A modified `Enter` is left alone, the same bargain the panel's listener
    // takes: `commandFromKey` assigns SK-19 to the plain press only.
    if (key.ctrlKey === true || key.altKey === true) return
    if (key.metaKey === true || key.shiftKey === true) return
    settleNewRowName()
  })

  // ⚠️ `input` AND NOT `change`: this is the person putting characters in again
  // after a cancellation, which makes the edit unsettled once more -- the very
  // reading the properties panel's own `input` listener records.
  newRowNameEntry.addEventListener('input', () => {
    isNewRowNameTakenBack = false
  })

  /**
   * IF-9's fifth answer -- whether characters stand in a field of this surface
   * that the person has not settled.
   *
   * ⛔ ONE TRUTH VALUE AND NOT THE FIELD (MUST NOT, under table T-065): see the
   * declaration. ⚠️ Held rather than measured: `ScreenSurfaceWiring` states that
   * only `createElement` is called on the host, so `activeElement` is not this
   * unit's to read -- `focusin` / `focusout` bubble to the panel and the panel
   * answers for its own controls.
   *
   * ⚠️ WHAT IT DOES NOT COVER, MEASURED AND NOT ASSUMED: the `Dialogue Field`'s
   * own entry is drawn by this unit as well and is deliberately outside this
   * answer. AG-9 of table T-035 names 「プロパティパネルで入力中など」 and
   * IN-5a names the five things typed in place (名称・担当者名・行名・文書名・
   * 注記の本文), all of which are this panel's; what an utterance in flight
   * should do to IN-5a and to WS-2 is a question no row settles, and inventing
   * an answer would decide it here.
   *
   * @purity semi-pure-b
   */
  function hasUnsettledTextEntry(): boolean {
    // ⭐⭐ HF-14's FIELD COUNTS, AND IN-5a IS WHY. That row names the five things
    // typed in place -- 名称・担当者名・行名・文書名・注記の本文 -- and a row's
    // name is one of them; left out, every single character a person typed into
    // it would be handed back to table T-036 as a shortcut, which is exactly the
    // swallowing IN-5a (MUST) exists to require. ⚠️ It also answers WS-2 of table
    // T-067 and IN-4's first level, both of which ask nothing but 「入力中か」.
    // ⛔ STILL ONE TRUTH VALUE AND NOT WHICH FIELD (MUST NOT, under table T-065).
    return heldTextControl !== null || newRowNaming !== null
  }

  /**
   * The value settled in a property field since this was last asked -- the
   * third member of IF-9, and the one that carries a value BACK.
   *
   * ⛔ READING IT TAKES IT, which the declaration states and which FR-031 (with
   * UN-3) is why: a commit answered twice would be written twice and put a
   * second step on the undo history for an edit nobody made.
   *
   * @purity semi-pure-b
   */
  function readFieldCommit(): FieldCommit | null {
    const held = fieldCommit
    fieldCommit = null
    return held
  }

  /**
   * What this surface has drawn at (x, y) -- the fourth member of IF-9.
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
   * ⭐ AND THE BOUNDARY IS READ ON THAT SAME WALK. Every `Panel Divider` is one
   * part under table T-103, so `part` alone says a press was on A boundary and
   * never WHICH -- and FR-052 has a drag on it change THAT panel's width, so
   * the caller cannot act on the press without knowing the panel. The band was
   * already drawn with it (`fillScreenFrame`); ⛔ the answer simply did not
   * carry it, which left the two boundaries indistinguishable to everyone
   * outside this unit.
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
    let panel: string | null = null
    let part: string | null = null
    let dismissKey: string | null = null
    // GR-20 of table T-023d. ⛔ A TRUTH VALUE AND NOT A KEY: the strip carries
    // no `data-group-id` of its own, because the row it sits in already does
    // and the walk takes the innermost one.
    let onGrabStrip = false
    // ⭐ The innermost `data-icon`, `data-format`, `data-group-id`, `data-uid`,
    // `data-panel` and `data-notice`, and the OUTERMOST `data-role`: an entry
    // sits inside its part, and table T-109's surface column names the
    // containing surface rather than the grouping inside it (U-34 / U-35). So
    // the six are each taken once and the role keeps being replaced on the way
    // up.
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
      const resized = node.getAttribute('data-panel')
      if (resized !== null && panel === null) panel = resized
      // NT-8 of table T-037: which telling this entrance puts away. ⛔ Read
      // back here and not as an entry -- that row of table T-037 has no row of
      // table T-109, because its entrance is a word (CR-259).
      const told = node.getAttribute(NOTICE_DISMISS_KEY_ATTRIBUTE)
      if (told !== null && dismissKey === null) dismissKey = told
      // GR-20 of table T-023d: the grab strip HF-15's drag is taken on. ⚠️ Read
      // on this same walk and not by a second query, for the reason the note
      // above gives -- a second query would ask a screen that had moved.
      if (node.getAttribute(ROW_GRAB_STRIP_MARK) !== null) onGrabStrip = true
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
    // ⭐ THE SAME BARGAIN IS WHAT LETS THE PANEL BE NARROWED: `fillScreenFrame`
    // in this file writes `PanelDivider.panel` and nothing else onto
    // `data-panel`, so the two spellings FR-052 resizes are the only ones this
    // can come back as -- ⛔ and they are NOT written out here, because a value
    // typed into this file is a value that stops following its declaration.
    return {
      part: part === ROLE.rowTitleTree ? ROLE.rowTitlePanel : part,
      entry,
      format,
      rowGroupId: group,
      resourceUid: uid === null ? null : Number(uid),
      dividerPanel: panel === null ? null : (panel as ScreenPart['dividerPanel']),
      // GR-20 of table T-023d.
      // ⛔ NEVER TRUE ON A PINNED ROW, and nothing here has to test for that:
      // GR-20 (MUST NOT) is kept by `rowTitleElement`, which draws no strip on
      // one, so there is no marked element for this walk to find.
      // ⚠️ THE KEY IS PUT ON THE ANSWER ONLY WHERE THE POINT IS ON A STRIP. The
      // member is optional and its own declaration fixes absent as `false`, so
      // the two spellings are one answer -- and a reader that compares whole
      // answers is left unchanged for every point that is on no strip. ⛔ It is
      // not a third state: nothing may read the absence as anything but "not on
      // a strip".
      ...(onGrabStrip ? { isRowGrabStrip: true } : {}),
      noticeDismissKey: dismissKey,
    }
  }

  // BO-1: settled before the first frame, and before this factory returns.
  reportHeaderHeight()

  // MK-13's second half, handed over the same way and at the same moment.
  // ⛔ THE CALLER MAY NOT USE IT YET: nothing has been drawn, so the panel holds
  // no control until the first `showScreenView`.
  wiring.holdFocusPropertyField?.(focusPropertyField)

  // HF-14's 「その場で打たせること（MUST）」, handed over the same way and at the
  // same moment, and under the same caution: nothing has been drawn yet, so the
  // panel holds no row for the field to be placed against until the first
  // `showScreenView`.
  wiring.holdOpenNewRowName?.(openNewRowName)

  return {
    showScreenView,
    readDialogueInput,
    readFieldCommit,
    readScreenPartAt,
    hasUnsettledTextEntry,
    // ⛔ `focusPropertyField` IS DELIBERATELY NOT HERE. The IF-9 cell of table
    // T-065 names five supplies and this object carries exactly those five; what
    // MK-13 needs travels on the wiring instead (`holdFocusPropertyField`).
  }
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
  'S-138': 16,
  'S-141': 4,
}

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
export const NOT_STORED_ROW_BAND_SIZES: {
  /** S-213, in px */
  readonly 'S-213': number
} = {
  'S-213': 3,
}

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
export const NOT_STORED_HELP_SIZES: {
  /** S-201 */
  readonly 'S-201': number
  /** S-202 */
  readonly 'S-202': number
  /** S-203 */
  readonly 'S-203': number
  /** S-204 */
  readonly 'S-204': number
} = {
  'S-201': 0.95,
  'S-202': 3,
  'S-203': 0.80,
  'S-204': 0.875,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ It is not a document
 * setting and may not become one: table T-206 is where the
 * specification records that the document does not keep it. ⚠️ The
 * closing sentence of the entrance rows does NOT fit -- EP-1 and EP-4
 * of table T-076 keep an ENTRANCE out of an exported picture, and this
 * row is no entrance: table T-206 says of it that the boundary is a
 * line rather than a word and not a shape either, so it has no row of
 * table T-109 and no shape of figure F-019. ⭐ What keeps it out of an
 * export is EP-11, which draws no `Command Palette` at all.
 */
export const NOT_STORED_PALETTE_GROUP_RULE_SIZES: {
  /** S-143, in px */
  readonly 'S-143': readonly [number, number]
} = {
  'S-143': [1, 6],
}

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
export const NOT_STORED_PROPERTY_FIELD_SIZES: {
  /** S-186, in px */
  readonly 'S-186': number
  /** S-187, in px */
  readonly 'S-187': number
  /** S-188, in px */
  readonly 'S-188': readonly [number, number]
  /** S-189, in % */
  readonly 'S-189': number
  /** S-190, in px */
  readonly 'S-190': number
  /** S-191, in px */
  readonly 'S-191': number
  /** S-192, in px */
  readonly 'S-192': readonly [number, number]
  /** S-193 */
  readonly 'S-193': number
  /** S-197 */
  readonly 'S-197': number
  /** S-198 */
  readonly 'S-198': number
} = {
  'S-186': 17,
  'S-187': 16,
  'S-188': [14, 3],
  'S-189': 42,
  'S-190': 6,
  'S-191': 2,
  'S-192': [6, 8],
  'S-193': 2,
  'S-197': 0.70,
  'S-198': 0.90,
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
  /* S-151 */
  'S-151': { light: 'hsl(H 59% 32%)', dark: 'hsl(H 62% 68%)', followsHue: true },
  /* S-152 */
  'S-152': { light: '#1f7a3d', dark: '#6fc98d', followsHue: false },
  /* S-183 */
  'S-183': { light: '#1f7a3d', dark: '#6fc98d', followsHue: false },
  /* S-153 */
  'S-153': { light: '#a8600f', dark: '#e0a353', followsHue: false },
  /* S-154 */
  'S-154': { light: '#a02b2b', dark: '#e07a7a', followsHue: false },
  /* S-170 */
  'S-170': { light: 'rgba(0,0,0,0.28)', dark: 'rgba(0,0,0,0.6)', followsHue: false },
}
// </generated>
