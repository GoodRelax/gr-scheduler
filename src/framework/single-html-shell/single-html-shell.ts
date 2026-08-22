// SingleHtmlShell -- public entry of this folder.
//
// @unit      UF-47   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-25
//
// The entry Vite reads. 5.3 forbids a main.ts: booting is CP-25's job and this
// is where it lives.
//
// ⚠️ PI-25 publishes NOTHING to other components. What leaves this file leaves
// through the page, not through an import.
//
// Boots in the order table T-077 fixes: BO-1 settles the screen, BO-2 picks
// the document, BO-3 reads the zoom and the scroll out of it, BO-4 runs table
// T-068 and BO-5 puts the first frame up. ⛔ NFR-011 makes the order a MUST --
// skipping BO-1 draws a frame with no size and skipping BO-3 draws one in no
// particular place.
//
// ⭐ WHY THE WIRING IS IN THE ORDER IT IS, and not some other. FR-051 (MUST)
// settles the `App Header`'s height and the `Scrollbars`' thickness FROM THE
// ENVIRONMENT at BO-1 and forbids a setting to hold either (MUST NOT) --
// `appHeaderMaxHeight` (S-116) is their cap, not their value. Neither can be
// measured before the thing that has them exists, so:
//
//   1. the scrollbar probe is measured (it needs no part of this tool),
//   2. DomScreenSurface (PI-38) is built, which mounts the header and hands its
//      measured height back BEFORE its factory returns,
//   3. only then is BO-1's `ScreenRegions` asked for.
//
// ⛔ Nothing is SHOWN by step 2: PI-38 keeps its root out of sight until the
// first `showScreenView`, which is BO-1's 「寸法が確定するまで 1 枚も描かない」.
//
// STOP -- ⛔ FT-1 OF TABLE T-078 IS NOT WIRED, and what blocks it is a value
// with no route into `src/`, not a decision this file could make.
// DomInputSource (PI-27) takes MK-10's answer as a factory argument, and the
// only party that can give it is `commandFromInput` (PI-18); that member --
// and `selectionFromInput` and `screenStateFromInput` beside it -- takes an
// `InputContext`, whose `zoomStep` member is S-53.
// ⛔ S-53, S-54 (`zoomMin`) and S-55 (`zoomMax`) are marked 「文書に保存しない」
// in table T-201, and NO generated constant carries them: the targets in
// tools/generate_entity_types.py are NOT_STORED_SIZES (S-90 / S-92 / S-93),
// NOT_STORED_LIMITS (S-94 / S-95) and NOT_STORED_PANEL_DIVIDER_SIZES (S-134).
// Rule 03 section 1 forbids re-typing the manuscript's figure here, and
// `input-command-translator.ts` records the same absence on the member itself.
// ⭐ WHAT WOULD UNBLOCK IT: one more NOT_STORED_* target carrying S-53 .. S-55.
// ⚠️ `PointerSlop` is short in the same way and worse, so `PointerPress.hit`
// has nothing to be answered from either: S-91's manuscript cell is prose
// (「実績バーの帯」) rather than a figure, and how near a pointer counts as ON a
// line has no row in any table -- `item-hit-area.ts` holds that STOP.

import { chooseStartupDocument } from '../../use-case/choose-startup-document/choose-startup-document'
import type { Document } from '../../entity/document-model/document/document'
import { documentFromJson } from '../../adapter/document-codec/document-codec'
import type { DisplayLanguage } from '../../adapter/screen-renderer/screen-renderer'
import { domScreenSurface } from '../dom-screen-surface/dom-screen-surface'
import { domSvgSurface } from '../dom-svg-surface/dom-svg-surface'
import { frameLoop, type FrameEnvironment, type FrameLoop } from './frame-loop'
import startupTemplate from './startup-template.json'

/**
 * U-32's settled name, spelled as `_assets/tbl-glossary.md` spells it.
 *
 * ⭐ Copied rather than minted, which rule 03 section 1 requires for a concept
 * the specification has named -- and it is the same spelling DomScreenSurface
 * writes for every part it draws, so the whole page names its parts one way.
 */
const SCHEDULE_CANVAS_ROLE = 'Schedule Canvas'

/**
 * Both drawn layers stand at the window's own origin.
 *
 * ⭐ NOT decoration: `ScreenRegions` (PI-35), the SVG built from it and every
 * coordinate `PointerInput` will carry are one frame of reference -- the
 * window's. A layer left in the page's normal flow starts at whatever margin
 * the host gives the body, and then the picture and the rectangles that
 * describe it disagree by that much.
 */
const AT_WINDOW_ORIGIN = 'position:fixed;left:0;top:0;right:0;bottom:0;'

/**
 * How big the box that measures the environment's scrollbar is.
 *
 * ⚠️ Not a value of this tool's: any box wider than a scrollbar answers the
 * same, because what is read is the DIFFERENCE between the two widths. ⛔ It is
 * named rather than written into the style so that it cannot be read as one of
 * table T-206's sizes.
 */
const SCROLLBAR_PROBE_PX = 100

/**
 * Who is speaking, for a line settled in the `Dialogue Field`.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: nothing holds the reader's own
 * name. S-99a names 「透かしに出す開いた者の名前」 and is one of the four rows of
 * table T-206 kept in `localStorage` with no owner anywhere in `src/`
 * (`local-storage-document-store.ts` records that); AG-6 of table T-035 selects
 * on 「自分以外の書き手」 and never says where this side's name comes from.
 * ⚠️ Empty is 「no name is held」 rather than a name invented here. ⛔ It is not
 * read in this build: FR-066 puts the field up only while the `Agent API` is
 * on, and the record that would turn it on (S-99b) has no owner either.
 */
const AUTHOR_NOT_HELD = ''

/**
 * BT-4 of table T-034 -- the template FR-027 keeps exactly one of.
 *
 * ⭐ Bundled as a `GRS JSON` rather than assembled here, which FR-027 requires
 * in as many words, so the same reader the import path uses can be pointed at
 * it. tools/generate_startup_template.py writes it and `npm run gen:check`
 * fails when it drifts.
 *
 * ⭐ Read through `documentFromJson`, not asserted into shape: FR-023 calls
 * every intake untrusted, and a template that stopped being a document would
 * otherwise reach the layout as one. ⚠️ It is bundled, so a fault here is a
 * build that shipped broken -- there is nobody to tell, and nothing to fall
 * back to (FR-067 says a lost BT-1 descends, and BT-4 is the bottom).
 *
 * @purity semi-pure-a
 */
function startupTemplateDocument(): Document {
  const read = documentFromJson(JSON.stringify(startupTemplate))
  if (!read.ok) {
    throw new Error(
      'the bundled startup template is not a GRS JSON document: ' +
        read.faults.map((one) => `${one.at} ${one.what}`).join('; '),
    )
  }
  return read.document
}

/**
 * FR-051 (MUST): 「`Scrollbars` の太さは、起動時に環境から確定させること」, and
 * 「太さは環境の既定の半分とすること（MUST）」. So the environment's own default
 * is what is measured, and half of it is what the `Row Area` gives up (SC-4
 * keeps the lanes showing at all times, which is why they take the room).
 *
 * ⚠️ A host with overlay scrollbars measures 0. That is its answer, not a
 * fault -- the same way DomScreenSurface reports a header laid out at 0.
 *
 * ⭐ Measured ONCE. FR-051 settles it at BO-1 of table T-077, and the
 * environment's default does not change with the size of the window.
 *
 * @purity non-pure
 */
function measuredScrollbarThickness(): number {
  const probe = document.createElement('div')
  probe.setAttribute(
    'style',
    `position:fixed;visibility:hidden;overflow:scroll;` +
      `width:${SCROLLBAR_PROBE_PX}px;height:${SCROLLBAR_PROBE_PX}px;`,
  )
  document.body.append(probe)
  const environmentDefault = probe.offsetWidth - probe.clientWidth
  probe.remove()
  return environmentDefault / 2
}

/**
 * FR-038 (MUST): 「起動したときは前回選ばれた言語で開き、それを読み出せないとき
 * はブラウザの言語設定に従うこと」.
 *
 * STOP -- ⛔ ONLY THE SECOND HALF CAN RUN, and the first half is missing an
 * owner rather than a rule. The chosen language is S-99, one of the four rows
 * table T-206 keeps in `localStorage`, and NOTHING in `src/` reads or writes
 * one of those four -- `local-storage-document-store.ts` says they share the
 * place and the prefix but not its seam. So there is no previous choice to read
 * back, and reading a key nothing ever writes would only make it look as though
 * the rule were kept.
 *
 * ⚠️ A host set to neither language is answered `en`: FR-038 admits exactly two,
 * so the one that is not `ja` is the only other.
 *
 * @purity semi-pure-b
 */
function displayLanguage(): DisplayLanguage {
  return navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en'
}

/**
 * What BO-1 has to settle before anything is drawn.
 *
 * ⚠️ The last two are MEASURED and may not be held as a setting (FR-051, MUST
 * NOT): they differ from one machine to the next. The header's height is
 * measured by the unit that DREW it (DomScreenSurface, over IF-9) and reaches
 * this file through that unit's callback; the thickness is measured above.
 *
 * @purity semi-pure-b
 */
function environmentOf(appHeaderHeight: number, scrollbarThickness: number): FrameEnvironment {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    appHeaderHeight,
    scrollbarThickness,
  }
}

/** @purity non-pure */
function boot(): void {
  const scheduleCanvas = document.createElement('div')
  scheduleCanvas.dataset.role = SCHEDULE_CANVAS_ROLE
  scheduleCanvas.setAttribute('style', AT_WINDOW_ORIGIN)
  const screenParts = document.createElement('div')
  // The parts outside the schedule are drawn OVER it, so they are appended
  // after it -- the note under table T-023a says the same thing from the
  // reading side, which is why `readScreenPartAt` answers `null` for a point
  // where this unit drew nothing and the schedule below is exposed.
  document.body.append(scheduleCanvas, screenParts)

  // ---- BO-1 ---------------------------------------------------------------
  const scrollbarThickness = measuredScrollbarThickness()
  let appHeaderHeightPx = 0
  let loop: FrameLoop | null = null
  const nowEnvironment = (): FrameEnvironment =>
    environmentOf(appHeaderHeightPx, scrollbarThickness)

  const screenSurface = domScreenSurface({
    host: document,
    mount: screenParts,
    readAuthor: () => AUTHOR_NOT_HELD,
    // ⚠️ The wall clock, and rightly so: what AT-129 spells is the moment a
    // person settled a line, not an elapsed time (R3.6 sends only elapsed time
    // to a monotonic clock).
    readClockMs: () => Date.now(),
    /** @purity non-pure */
    onAppHeaderHeightPx: (heightPx) => {
      appHeaderHeightPx = heightPx
      // FT-3 of table T-078 and nothing else: this records the number and
      // hands the deciding to the shell's own resize path, which is the one
      // place that judges whether the size CHANGED. ⛔ NFR-010 forbids waking a
      // frame on anything the table does not name. ⚠️ `loop` is still null on
      // the first call -- that one is BO-1's measurement, not a change.
      loop?.resize(nowEnvironment())
    },
  })

  // ---- BO-2 ---------------------------------------------------------------
  // Table T-034's order. Only BT-4 can yield anything yet: the three ahead of
  // it are read by DocumentCodec, FileGateway and AutosaveGateway, and none of
  // those is wired. ⛔ Saying `none` is not a stand-in; it is what is true of
  // this build, and FR-067 already says a rank that yields nothing descends
  // rather than starting empty.
  const chosen = chooseStartupDocument({
    embedded: { kind: 'none' },
    handed: { kind: 'none' },
    autosave: { kind: 'none' },
    template: startupTemplateDocument(),
  })

  // ---- BO-3, BO-4, BO-5 ---------------------------------------------------
  // BO-3 is inside the document: zoomX / zoomY and scrollDate / scrollGroupId
  // are stored (FR-024 keeps all four, WY-1 needs them), so the loop reads
  // them off documentSettings rather than being told. BO-4 and BO-5 are the
  // first frame, which the loop runs as soon as BO-1's size is settled.
  loop = frameLoop(domSvgSurface(scheduleCanvas), chosen.document, nowEnvironment(), {
    surface: screenSurface,
    language: displayLanguage(),
  })

  // FT-3 of table T-078 -- the shell observes the window itself, because the
  // size is the host's value and not an input device's (IF-2 stays narrow).
  window.addEventListener('resize', () => loop?.resize(nowEnvironment()))

  // ⭐ THE SAME TRIGGER, WATCHED A SECOND WAY, and not a second trigger: table
  // T-078 names the shell as the party that observes FT-3 and leaves the means
  // to it, and `resize` alone misses the case NFR-011 is most emphatic about.
  // A host can lay this page out at 0 x 0 and give it a size later without the
  // window ever resizing -- a pane that was not visible when the page loaded
  // does exactly that -- and BO-1 holds the first frame back until the size is
  // settled, so the screen would stay 「空白のまま」, which NFR-011 forbids
  // (MUST NOT).
  // ⛔ NFR-010 is not widened by this: `FrameLoop.resize` compares the four
  // measurements against the ones in force and returns without waking a frame
  // when nothing changed, so an observation that moved nothing costs nothing.
  new ResizeObserver(() => loop?.resize(nowEnvironment())).observe(document.documentElement)
}

boot()

export {}
