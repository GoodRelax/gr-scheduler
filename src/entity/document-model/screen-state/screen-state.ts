// ScreenState -- public entry of this folder.
//
// @unit      UF-59   (docs/spec/05-07-design.md, table T-075)
// @component ScreenState, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-36
//
// The values the screen uses that the document does NOT keep: what is armed
// (table T-023b), whether the palette is showing (S-99e), whether the view is
// full screen (S-99f), which surface is open (S-99g) and whether the watermark
// is drawn (S-144). U-51 of the glossary forbids calling this "the screen's
// state" in prose, because table T-203 and the K-67..K-72 rows already use that
// name for values that ARE saved.
//
// Held as one immutable value and replaced whole (LY-1), so this file publishes
// no setter -- every function returns a new state.

/** What the palette has armed. Table T-023b, AR-1 to AR-6. */
export type Armed =
  /** AR-1 */ | { readonly kind: 'none' }
  /** AR-2 -- the shape it will draw. Its spellings are SH-1..SH-5 of table T-012. */
  | { readonly kind: 'taskShape'; readonly shapeKind: string }
  /** AR-3 -- the glyph it will draw. The specification has not spelled these out. */
  | { readonly kind: 'milestoneShape'; readonly glyph: string }
  /** AR-4 */ | { readonly kind: 'dependency' }
  /** AR-5 */ | { readonly kind: 'commentBox' }
  /** AR-6 */ | { readonly kind: 'highlightBox' }

/**
 * A surface opened over the screen. S-99g calls it "a surface", and defines it
 * as what Esc closes at its first level; UF-66 of Chapter 5 holds which ones
 * there are, so the name is carried rather than enumerated here.
 *
 * ⛔ NOT EVERY SURFACE IS HELD HERE, AND S-99g'S DEFINITION IS WHY THAT IS NOT
 * A CONTRADICTION. U-55 `Confirmation` of table T-103 is a surface by that same
 * definition, and the Framework holds it beside this value rather than in it --
 * `EscapeContext` below says why, and `escapeTarget` gives it the surface's own
 * level of IN-4 all the same. ⚠️ So a reader who finds a surface Esc reaches and
 * this value does not name has not found a defect.
 * ⛔ S-99g STILL SPELLS THAT LEVEL 「`Esc` の第 1 階層」 AND IN-4 NO LONGER DOES.
 * The ladder gained 出ている通知 at its head on 2026-08-31, so the surface's rung
 * is IN-4's third and S-99g's wording is one revision behind. ⚠️ Reported and
 * not resolved here: what the setting DEFINES -- a thing opened over the screen
 * that Esc closes -- is unchanged, and only the ordinal moved.
 */
export type OpenSurface = string | null

export interface ScreenState {
  /** Table T-023b. */
  readonly armed: Armed
  /** S-99e. Its default is showing. */
  readonly paletteShown: boolean
  /** S-99f. Its default is the ordinary view. */
  readonly fullScreen: boolean
  /** S-99g. Its default is that none is open. */
  readonly surface: OpenSurface
  /**
   * S-144 of table T-206 -- whether FR-020's watermark is drawn. Its default is
   * 出す.
   *
   * ⛔⛔ NOT A DOCUMENT SETTING, AND MAY NOT BECOME ONE. FR-020's STATEMENT
   * (MUST NOT): 「透かしの設定を文書に保存してはならない」, and the row sat in
   * table T-202 -- the saved side -- until 2026-09-02 (利用者の裁定, CR-335).
   * ⚠️ WHY SAVING IT IS THE DEFECT AND NOT A CONVENIENCE: what the watermark
   * shows is who had the schedule on screen and when, so it is remade every
   * time a document is opened and is not a property OF the document. Burnt into
   * the file, one person who knows the unlock password takes the trace away
   * from everyone downstream, permanently; held here, hiding it lasts only as
   * long as the screen it was hidden on.
   */
  readonly watermarkVisible: boolean
}

const NONE: Armed = { kind: 'none' }

const EMPTY: ScreenState = {
  armed: NONE,
  paletteShown: true,
  fullScreen: false,
  surface: null,
  // S-144's 既定値 is 出す. ⭐ THE SAFE DIRECTION IS ALSO THE ROW'S: a state
  // that comes up showing can only be taken away by the password FR-020 asks
  // for, while a state that came up hidden would take the trace off every
  // document opened in a fresh screen without anyone asking.
  watermarkVisible: true,
}

/** @purity pure */
export function emptyScreenState(): ScreenState {
  return EMPTY
}

/** @purity pure */
export function screenStateWithArmed(state: ScreenState, armed: Armed): ScreenState {
  return { ...state, armed }
}

/** @purity pure */
export function screenStateWithSurface(state: ScreenState, surface: OpenSurface): ScreenState {
  return { ...state, surface }
}

/** @purity pure */
export function screenStateWithPalette(state: ScreenState, shown: boolean): ScreenState {
  return { ...state, paletteShown: shown }
}

/** @purity pure */
export function screenStateWithFullScreen(state: ScreenState, on: boolean): ScreenState {
  return { ...state, fullScreen: on }
}

/**
 * S-144 -- put the watermark on the screen, or take it off it.
 *
 * ⛔ THE GATE IS NOT HERE AND MAY NOT BE. FR-020 (MUST) asks the watermark
 * unlock password on the HIDING side only, and the match is a SHA-256
 * comparison against typed characters, which no pure member can compute
 * (LR-6). ⭐ So this file holds the value and the side that asked holds the
 * question -- the same split `screenStateWithFullScreen` takes, where the
 * browser is asked elsewhere and the flag lives here.
 *
 * ⛔⛔ NOTHING CALLS IT YET, AND THE ROW THAT IS MISSING IS TABLE T-064's.
 * Both sides that owe a write to S-144 stand in other component folders -- the
 * way back is `screenStateFromEntry` in `InputCommandTranslator` and the way
 * out is `matchWatermarkUnlock` in the shell -- and Chapter 5.3 (MUST NOT) lets
 * no name cross that table does not publish. `PI-36` was not widened when
 * CR-335 moved S-144 out of the document, so this member cannot be called from
 * either side until that cell names it. ⚠️ Check 26b measures exactly that and
 * refuses the import; the call site in the translator carries the same STOP.
 * ⭐ IT IS WRITTEN AND NOT DEFERRED because the value it writes is this
 * component's, and a caller that spread the state itself would put a second
 * writer of one value in a second component (rule 03 section 1).
 *
 * @purity pure
 */
export function screenStateWithWatermark(state: ScreenState, visible: boolean): ScreenState {
  return { ...state, watermarkVisible: visible }
}

/**
 * What one press of Esc takes.
 *
 * ⚠️ NINE MEMBERS, SEVEN LEVELS AND ONE MEMBER WITH NO LEVEL. IN-4 of table
 * T-028 fixes seven, and this value now carries all seven: two of the members
 * below are that ladder's THIRD level (開いている面), and `escapeTarget` says
 * why there are two of them and why they are answered in this order.
 * ⭐ `'notice'` IS THE HEAD OF THE LADDER SINCE 2026-08-31 (利用者の指示), and
 * NT-8 of table T-037 (MUST) is the row that puts it there. ⚠️ SO THE COUNTS
 * ABOVE MOVED BY ONE: what was the first level (確定していないその場の編集) is
 * now the second, and the shared level is the third rather than the second.
 * ⛔ `'propertiesPanel'` IS THE MEMBER WITH NO LEVEL OF ITS OWN. Table T-109
 * puts the panel on this ladder and IN-4 gives it no rung, so the rung is chosen
 * where the answer is given rather than claimed here.
 * ⭐ `'tooltip'` IS IN-4's LAST LEVEL -- 出ている説明 -- AND IT IS A LEVEL THE
 * LADDER MUST HOLD. That row (MUST) ends the order with it and states the
 * reason in as many words: 「説明を最後に置くのは、`IN-3` が求める『消せること』
 * を果たす手立てがほかに 1 つも無いからである」. ⛔ SO ITS ABSENCE WAS NOT A
 * REPORT BUT A BREACH: with no rung here, IN-3's 「消せること」 -- 「ポインタも
 * フォーカスも動かさずに消す手立てがあること」 -- had no way to be met at all
 * (D-307). ⚠️ IT IS OPTIONAL FOR THE REASON THE THREE MEMBERS BELOW IT ARE: the
 * explanations are a current value the Framework holds (LY-5 of table T-060),
 * so a caller that cannot see them leaves it out and absence reads as
 * 「出ていない」 -- which keeps IN-4a, because the press then reaches the
 * browser instead of being swallowed by a level nobody can spend.
 */
export type EscapeTarget =
  | 'notice'
  | 'textEntry'
  | 'confirmation'
  | 'surface'
  | 'gesture'
  | 'propertiesPanel'
  | 'armed'
  | 'dualCursorMode'
  | 'tooltip'

/**
 * Which of the two dates S-65 holds is meant -- the two spellings are the
 * setting's own, and DC-1 of table T-029a names them that way.
 *
 * ⚠️ WRITTEN OUT A SECOND TIME, letter for letter, in `svg-renderer.ts`.
 * ⛔ NOT AN OVERSIGHT: `_source/components.json` gives SvgRenderer no edge to
 * this component, so that unit cannot import this name, and its own note says
 * so where it declares `DualCursorFollow`. ⚠️ What holds the two in step is the
 * compiler -- `frame-loop.ts` hands ONE value along both seams, so a drift is a
 * type error at that call site rather than something review has to catch.
 */
export type DualCursorSide = 'date1' | 'date2'

/**
 * What is happening outside this value that Esc may also consume.
 *
 * ⚠️ BOTH ARE THE FRAMEWORK'S CURRENT VALUES (LY-5 of table T-060), which is
 * why neither can be read from here. ⛔ THE NOTE THAT STOOD HERE WAS FALSE: it
 * called the Dual Cursor mode 「a saved setting」, and `dualCursor` (S-65) holds
 * the two DATES and has never held whether the mode is up. The user ruled the
 * one missing bit -- which side is following -- into the session rather than
 * into the document (2026-08-26), and `null` there IS "not in the mode".
 */
export interface EscapeContext {
  /**
   * IN-4's FIRST level -- whether anything told to the person is still standing
   * (FR-076, table T-037).
   *
   * ⭐ A QUESTION AND NOT THE TELLINGS THEMSELVES. NT-8 (MUST) has the newest of
   * them put away, and WHICH one that is cannot be answered from here: the list
   * is a current value the Framework holds (LY-5 of table T-060), the same
   * reason the three members below are questions rather than values.
   *
   * ⚠️ OPTIONAL, AND ABSENT READS AS 「立っていない」, for the reason
   * `isConfirmationStanding` gives below -- the `EscapeContext` literals already
   * written go on compiling. ⛔ THAT IS THE DIRECTION NT-8 (MUST NOT) REQUIRES:
   * 「消すものが 1 つも無いときに、この階層で `Enter` や `Esc` を消費しては
   * ならない」, so a caller that cannot see the tellings falls through to the
   * rung below rather than swallowing the press.
   */
  readonly isNoticeStanding?: boolean
  /**
   * IN-4's SECOND level -- text being typed in place that has not been settled.
   *
   * ⭐ THE INNERMOST THING ON SCREEN, WHICH IS WHY IT LEADS EVERYTHING DRAWN.
   * ⚠️ ONE ROW NOW STANDS AHEAD OF IT, and it is not a drawn thing being closed:
   * NT-8 (MUST) puts the reading-and-clearing of a telling before every level of
   * this ladder. Without this level an `Esc`
   * pressed while typing over an open surface would close the surface and take
   * the half-typed characters with it, and the reader would have no way at all
   * to abandon an edit -- table T-233's `RS-8` already prints
   * 「確定するか取り消すか」 as its next step, so the wording promised a
   * cancellation the ladder did not have.
   *
   * ⚠️ THE SAME STATE `AG-9` OF TABLE T-035 NAMES, and the same one `IN-5a`
   * swallows single-character keys for. One question, asked in three places.
   */
  readonly isTextEntryUnsettled: boolean
  /** A drag under way, or an arrow half drawn. */
  readonly gestureInFlight: boolean
  /**
   * IN-4's last level -- whether the Dual Cursor mode is up at all.
   *
   * ⭐ A QUESTION AND NOT THE VALUE ITSELF. What the holder keeps is the
   * following side (`DualCursorSide | null`); this row asks only whether one
   * stands, because IN-4 spends a press on the MODE and DC-4 takes the whole of
   * it -- an `Esc` does not move which side follows.
   */
  readonly dualCursorMode: boolean
  /**
   * Whether a `Confirmation` (U-55 of table T-103) stands -- the surface NT-7
   * of table T-037 puts its question on.
   *
   * ⭐ OUTSIDE THIS VALUE FOR THE SAME REASON THE TWO ABOVE ARE: it is a current
   * value, and LY-5 of table T-060 leaves those with the Framework. ⛔ It is not
   * in `surface` because S-99g holds ONE name and the drawing side turns any
   * name there into a modal of its own, so a second question would be drawn over
   * the one already on screen.
   *
   * ⚠️ OPTIONAL BECAUSE ONE CALLER CANNOT SEE IT. `screenStateFromInput` (PI-18)
   * is pure and holds nothing, so it reports the levels it can see and leaves
   * this one out. ⛔ THE PRICE IS A RULE THE CALLERS MUST KEEP: a press whose
   * level is `'confirmation'` may be reckoned ONCE, by the holder of the
   * question -- asking a second caller that cannot see it would get the NEXT
   * level down and spend two on one press, which IN-4 forbids (1 階層, MUST).
   */
  readonly isConfirmationStanding?: boolean
  /**
   * Whether the `Properties Panel` (U-25 of table T-103) is on the screen.
   *
   * ⭐ THAT IT IS ON THIS LADDER AT ALL IS THE MANUSCRIPT'S OWN JOIN: table
   * T-109 stands its closing entry on the panel among the six surfaces of that
   * entry's 面 column, and that entry's 正 column names IN-4. ⛔ WHICH RUNG IT
   * TAKES IS NOT, and `escapeTarget` is where the rung is chosen and reasoned.
   *
   * ⛔ OUTSIDE `ScreenState` FOR THE REASON `isConfirmationStanding` IS: which
   * of FR-072's two contents the panel shows is a current value, and LY-5 of
   * table T-060 leaves those with the Framework. ⚠️ It is not in `surface`
   * either -- S-99g holds ONE name and the drawing side turns any name there
   * into a modal, so a panel put there would be drawn as one.
   *
   * ⚠️ OPTIONAL FOR THE REASON THE MEMBER ABOVE IS: a caller that cannot see
   * the panel leaves it out, and absence reads as 「not open」 and never as a
   * level of its own. ⛔ THE SAME PRICE, AND THE SAME RULE: a press whose level
   * is `'propertiesPanel'` may be reckoned ONCE, by the holder of the panel --
   * a second caller that cannot see it would answer the NEXT level down and
   * spend two levels on one press, which IN-4 forbids (1 階層, MUST).
   */
  readonly isPropertiesPanelOpen?: boolean
  /**
   * IN-4's LAST level -- whether an explanation (U-53) is standing on the
   * screen.
   *
   * ⭐ THE ONLY WAY IN-3 OF TABLE T-028 CAN BE KEPT. That row (MUST) asks a
   * tooltip to be dismissible 「ポインタもフォーカスも動かさずに」, and IN-4
   * states in as many words that it is placed last because no other means
   * exists. So this is not one convenience among several: it is the whole of
   * that MUST.
   *
   * ⛔ OUTSIDE `ScreenState` FOR THE REASON THE THREE MEMBERS ABOVE ARE. What
   * explanations one frame carries is `ScreenView.tooltips`, built afresh per
   * frame by UF-69 out of where the pointer rests -- a current value, and LY-5
   * of table T-060 leaves those with the Framework.
   *
   * ⚠️ OPTIONAL, AND THE SAME PRICE THE TWO ABOVE PAY: a press whose level is
   * `'tooltip'` may be reckoned ONCE, by the holder of the explanations, and a
   * second caller that cannot see them answers `null` and hands the key to the
   * browser (IN-4a) rather than spending a level twice.
   *
   * ⛔ THE HOLDER MUST ALSO BE ABLE TO ACT ON THE ANSWER, AND IN THIS BUILD IT
   * CANNOT YET. `frame-loop.ts` already knows whether one stands
   * (`isTooltipStanding`, read off the description it last drew) and so can
   * REPORT this level -- but putting the explanation away needs a value UF-69
   * reads, and `ScreenSession` (table T-075) carries none: EZ-2 and EZ-6 of
   * table T-040 raise a tooltip purely from the rest and the place, so the next
   * frame would raise the very one this level just took. What is missing is one
   * member on `ScreenSession` saying the standing explanation has been
   * dismissed, cleared by the next pointer move (IN-3's 「引き金が外れるまで」).
   */
  readonly isTooltipStanding?: boolean
}

/**
 * What the next Esc consumes, or null when it consumes nothing.
 *
 * IN-4 fixes the order -- the standing telling, then the unsettled in-place
 * edit, then the open surface,
 * then the gesture in flight, then what is armed, then the Dual Cursor mode,
 * then the standing explanation --
 * and the two answers that share its 開いている面 are the standing question and
 * the surface S-99g holds, in that order. The `Properties Panel` is answered
 * after the gesture, for the reason given where it is answered.
 * IN-4a is the reason null matters:
 * with nothing to consume the key MUST reach the browser, because leaving full
 * screen is the browser's own behaviour and would otherwise be unreachable.
 *
 * ⭐ THE `Confirmation` IS THE 開いている面 LEVEL AND NOT A LEVEL OF ITS OWN.
 * U-55 of table T-103 calls it a surface, and S-99g of table T-206 defines a
 * surface as what IN-4 closes when it reaches that rung -- so the level is
 * already IN the ladder and nothing is added to it here.
 * ⚠️ ANSWERED BEFORE `state.surface` BECAUSE TWO SURFACES CAN STAND AT ONCE IN
 * THIS BUILD, WHICH THE SPECIFICATION DOES NOT CONTEMPLATE: S-99g holds exactly
 * one, and the question is raised outside it, so IN-4 orders no two surfaces
 * against each other and cannot be quoted for this. ⭐ The question is raised
 * OVER whatever stood, so taking the one behind it first would leave the
 * question standing over a screen that changed underneath it.
 *
 * @purity pure
 */
export function escapeTarget(state: ScreenState, context: EscapeContext): EscapeTarget | null {
  // IN-4's first level (利用者の指示 2026-08-31). ⛔ AHEAD OF EVERY OTHER RUNG,
  // WHICH IS NT-8 OF TABLE T-037 (MUST) AND NOT A PREFERENCE: 「この消去を、
  // `Enter` と `Esc` のどの階層よりも先に行うこと」. ⚠️ Two reasons the row gives:
  // a telling left standing cannot be told apart from the next one, and reading
  // and clearing what was told comes before anything else.
  // ⛔ `=== true` AND NOT A TRUTHY TEST, the reading the optional members take:
  // absent is 「立っていない」, so a caller that cannot see the tellings falls
  // through to the rung below instead of swallowing the press (NT-8, MUST NOT).
  if (context.isNoticeStanding === true) return 'notice'
  // IN-4's second level (利用者の裁定 2026-08-27). ⛔ AHEAD OF THE CONFIRMATION
  // TOO: a question is raised OVER the screen, and a reader typing when one
  // arrives still owns the characters they were putting in.
  if (context.isTextEntryUnsettled) return 'textEntry'
  if (context.isConfirmationStanding === true) return 'confirmation'
  if (state.surface !== null) return 'surface'
  if (context.gestureInFlight) return 'gesture'
  // ⛔ BELOW THE GESTURE AND NOT ABOVE IT, WHICH IS MEASURED RATHER THAN
  // PREFERRED. S-99g defines a 面 as what 「画面の上に重ねて開き」 -- what opens
  // OVER the screen -- and this panel does not: FR-052 takes its width OUT of
  // the `Schedule Canvas`, so the schedule stands beside it and never under it.
  // Table T-109 places the closing entry on the panel and names IN-4 for its
  // authority, which is what puts the panel on this ladder at all; it does not
  // make the panel the 開いている面 whose rung S-99g fixes.
  // ⛔ ABOVE THE GESTURE THIS RUNG WOULD MAKE A MUST UNREACHABLE. FR-075 (MUST)
  // draws the fade grab points on the SELECTED Task alone, and choosing a Task
  // is what puts this panel up (FR-006) -- so every drag on those points
  // happens with the panel showing, and IN-1's 「中断は `Esc` で行い」 could
  // never be reached even once.
  // ⚠️ NO ROW ORDERS THE PANEL AGAINST ANYTHING. The rung is chosen here, out of
  // the two rules above, and a ruling that disagrees moves this one line.
  if (context.isPropertiesPanelOpen === true) return 'propertiesPanel'
  if (state.armed.kind !== 'none') return 'armed'
  if (context.dualCursorMode) return 'dualCursorMode'
  // IN-4's LAST level (MUST): 出ている説明. ⛔ BELOW EVERY OTHER RUNG AND ABOVE
  // `null`, which is the order that row prints and not a choice made here --
  // and the row gives the reason itself: 「説明を最後に置くのは、`IN-3` が求める
  // 『消せること』を果たす手立てがほかに 1 つも無いからである」.
  // ⛔ `=== true` AND NOT A TRUTHY TEST, the reading every optional member here
  // takes: a caller that cannot see the explanations falls through to `null`,
  // so IN-4a still hands the key to the browser (MUST) instead of losing it to
  // a level nobody can spend.
  if (context.isTooltipStanding === true) return 'tooltip'
  return null
}
