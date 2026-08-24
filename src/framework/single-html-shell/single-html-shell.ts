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
// ⭐ FT-1 OF TABLE T-078 IS WIRED HERE, in two statements and no more.
// DomInputSource (PI-27) watches the window and hands each happening over; the
// loop turns it into an operation, because LY-5 of table T-060 leaves the
// Framework as the only layer that may hold a current value and ADR-001 has the
// loop compute the frame's values. MK-10's answer travels the other way as the
// factory argument PI-27 declares, and is asked BEFORE the watcher runs.
// ⚠️ Started AFTER the loop exists, so `loop` is never null by the time a
// happening can arrive. ⛔ One that arrives before the first frame is dropped
// by the loop and not by this file: BO-1 has not settled the size, so there is
// no frame of reference to read a coordinate against.
//
// ⭐ THE FIGURES THAT MADE THIS POSSIBLE ARRIVE GENERATED, none of them typed
// anywhere in `src/`: the zoom step (S-96), its bounds (S-97 / S-98), the grab
// slop of table T-023d (S-90 .. S-93 and S-137) and the history bounds (S-94 /
// S-95) all reach the loop through NOT_STORED_* constants that
// `tools/generate_entity_types.py` prints from the manuscript.
//
// ⭐ IF-3 IS BUILT HERE AND USED IN THE LOOP. This file is the only one that
// may touch the host, so it is where the two pickers and the drop surface are
// gathered into `FileSystemAccessEnvironment` (PI-28) -- and the store then
// goes straight to the loop, because SK-11 writes out the current value LY-5 of
// table T-060 leaves with the loop alone. ⛔ This file keeps no copy of it: two
// holders of one store is two answers to 「which file is open」.

import { chooseStartupDocument } from '../../use-case/choose-startup-document/choose-startup-document'
import type { Document } from '../../entity/document-model/document/document'
import { documentFromJson } from '../../adapter/document-codec/document-codec'
import type { DisplayLanguage } from '../../adapter/screen-renderer/screen-renderer'
import { domInputSource } from '../dom-input-source/dom-input-source'
import { domScreenSurface } from '../dom-screen-surface/dom-screen-surface'
import { domSvgSurface } from '../dom-svg-surface/dom-svg-surface'
import {
  fileSystemAccessFileStore,
  type DropEvent,
  type DropSurface,
  type FileSystemAccessEnvironment,
  type OpenFilePicker,
  type SaveFilePicker,
} from '../file-system-access-file-store/file-system-access-file-store'
import {
  frameLoop,
  startupDisplayLanguage,
  type FrameEnvironment,
  type FrameLoop,
} from './frame-loop'
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
 * ⚠️ Empty is 「no name is held」 rather than a name invented here.
 *
 * ⛔ IT IS READ IN THIS BUILD, WHICH IT WAS NOT BEFORE IC-20 LANDED. The note
 * here used to say the opposite and gave S-99b as the reason; that reason is
 * gone. FR-066 puts the field up while the `Agent API` is on, `dialogue-field.ts`
 * gates on `ScreenSession.isAgentApiEnabled`, and IC-20 turns that on -- so
 * every line a person settles now carries this empty name.
 * ⚠️ WHAT THAT COSTS, stated rather than papered over: AG-6 of table T-035
 * tells writers apart by the name alone, so a subscriber installed under an
 * equally empty name would be woken by the person's own utterances, which that
 * row forbids (MUST NOT). ⛔ Nothing installs a subscriber yet -- see the STOP
 * in `boot` -- so the two cannot collide today. Table T-229 does not settle
 * this name either: it governs `lastEditedBy`, and an utterance is not a write
 * to the document (FR-066, MUST NOT).
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
 * ⭐ BOTH HALVES RUN NOW. The stored choice is S-99, one of the four rows table
 * T-206 keeps in `localStorage`, and the loop holds those keys because they are
 * current values LY-5 leaves to this layer -- so the answer is asked for rather
 * than the keys being typed a second time here (R4).
 *
 * ⛔ STILL HALF DONE, AND ON THE OTHER SIDE: nothing WRITES S-99 back, because
 * no path settles a new display language yet -- `input-command-translator.ts`
 * records IC-21's press among the entries it cannot answer for. So a first run
 * follows the host, and a later run will follow the person only once that path
 * exists (PD-173).
 *
 * @purity semi-pure-b
 */
function displayLanguage(): DisplayLanguage {
  return startupDisplayLanguage()
}

/**
 * Where a drop lands (`DropSurface` of PI-28) -- the window, which is what OP-2
 * of table T-024a asks for: it treats a drop as ONE surface that does not apply
 * the schedule's hit-test order, and the window is the only surface the whole
 * app sits on.
 *
 * ⛔ CAST RATHER THAN HANDED OVER DIRECTLY. PI-28 declares the happening as
 * plain data so that the unit runs under Node (its own header says so, and
 * LR-6 is the same rule read from the other side), and the host's `DragEvent`
 * is a different type carrying the same members. ⚠️ Nothing is narrowed by the
 * cast -- the store reads only `preventDefault`, `dataTransfer.types` and
 * `dataTransfer.items`, and a real drag event has every one.
 */
const DROP_SURFACE: DropSurface = {
  /** @purity non-pure */
  addEventListener(type, listener, options): void {
    window.addEventListener(type, (event) => listener(event as unknown as DropEvent), options)
  },
}

/**
 * What the host offers of the API PI-28 is built on.
 *
 * ⛔ THE HOST'S OWN DECLARATIONS DO NOT CARRY THESE TWO. `lib.dom` has the
 * handle types and not the two functions that hand one over, so the members are
 * read off the window as unknown values and admitted only where the host really
 * has a function there -- which is also exactly the question CN-2 of table
 * T-003 and LM-14 of table T-004 leave open: Chromium is the baseline, Firefox
 * is checked only, and Safari is out of scope.
 * ⚠️ `undefined` is 「this browser has none」, and the store turns it into
 * LM-14's `unavailable` rather than throwing.
 * ⛔ `bind` is not decoration: both are methods of the window and lose their
 * receiver the moment they are passed as values.
 *
 * ⚠️ REQUIRED KEYS HOLDING A POSSIBLY-MISSING VALUE, which is what
 * `FileSystemAccessEnvironment` asks for in as many words -- a shell that left
 * the key out would read as a browser that has the API.
 *
 * @purity semi-pure-b
 */
function fileSystemAccessEnvironment(): FileSystemAccessEnvironment {
  const host = window as unknown as {
    readonly showOpenFilePicker?: unknown
    readonly showSaveFilePicker?: unknown
  }
  const opener = host.showOpenFilePicker
  const saver = host.showSaveFilePicker
  return {
    openFilePicker:
      typeof opener === 'function' ? (opener as OpenFilePicker).bind(window) : undefined,
    saveFilePicker:
      typeof saver === 'function' ? (saver as SaveFilePicker).bind(window) : undefined,
    dropSurface: DROP_SURFACE,
  }
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

  // ---- IF-3, BEFORE BO-2 --------------------------------------------------
  // ⭐ BUILT THIS EARLY BECAUSE OF WHAT IT LISTENS FOR, not because BO-2 needs
  // it. PI-28 declares this surface a drop target in its constructor, and
  // without that the browser leaves the page on the first dropped file and
  // takes the document with it -- which is precisely the silent discard OP-4 of
  // table T-024a forbids (MUST NOT). ⚠️ The listeners live as long as the page,
  // the same lifetime FT-1's watcher below takes.
  const fileStore = fileSystemAccessFileStore(fileSystemAccessEnvironment())

  // ---- BO-2 ---------------------------------------------------------------
  // Table T-034's order. Only BT-4 can yield anything yet, and the three ahead
  // of it are each missing something different:
  //
  //   BT-1  DocumentCodec's embedded document (FR-067) is not read here yet.
  //   BT-2  ⛔ IF-3 HAS NO MEMBER FOR IT AND CANNOT. Table T-034 sends this
  //         rank to R-1 of table T-008 -- a file chooser or a drop -- and
  //         neither has happened at the moment BO-2 runs. `readFileToOpen`
  //         answers for a gesture the person has just made; nothing on that
  //         seam answers for a file the host handed the page as it started.
  //   BT-3  AutosaveGateway (IF-4) is not built in this build.
  //
  // ⛔ Saying `none` is not a stand-in; it is what is true of this build, and
  // FR-067 already says a rank that yields nothing descends rather than
  // starting empty.
  const chosen = chooseStartupDocument({
    embedded: { kind: 'none' },
    handed: { kind: 'none' },
    autosave: { kind: 'none' },
    template: startupTemplateDocument(),
  })

  // STOP -- ⛔ FR-088's GATE IS NOT ON THIS ROAD, and it is left off on purpose.
  // `frame-loop.ts` runs `scheduleViolations` (PI-1) over an ARRIVING document
  // and turns away one whose resolved calendar works no weekday (IV-17 of table
  // T-220), because FR-088 says 「受け付けずに通知すること（MUST）」. Neither
  // half of that sentence can be kept here:
  //
  //   受け付けず   BO-2 has to yield a document. FR-067 lets a rank that yields
  //                nothing descend, and BT-4 is the bottom -- so refusing it
  //                leaves the boot with no document at all, which no row of
  //                table T-034 or table T-077 provides for.
  //   通知する     There is nothing to tell it on. The loop that holds
  //                `ScreenSession.notices` is built below this line, and BO-1's
  //                size is not settled either, so a telling raised now would
  //                reach no frame.
  //
  // ⭐ AND THE ONE CANDIDATE THIS BUILD HAS IS NOT UNTRUSTED INTAKE.
  // `startupTemplateDocument` records the same judgement for the same file: the
  // template is BUNDLED, so a fault in it is a build that shipped broken, and
  // `npm run gen:check` is where that is caught rather than at boot.
  // ⛔ WHAT IS OWED WHEN THE OTHER THREE RANKS GAIN PRODUCERS. BT-1's embedded
  // document, BT-2's handed file and BT-3's autosave are each R-1 / R-3 of
  // table T-008 -- untrusted -- and each of them needs this gate and a place to
  // tell on before it is wired. ⚠️ Passing the gate is not enough on its own:
  // FR-067's descent means a refused candidate has to fall to the next rank,
  // and `chooseStartupDocument` (UF-23) is where that choosing lives.

  // STOP -- ⛔ FR-060's SECOND MUST IS NOT KEPT, and the piece that is missing
  // is not on this side. That MUST is the startup offer to win back a lost
  // permission, and it needs the store to still know WHICH file was open --
  // but PI-28 holds its handle in a value that dies with the page: nothing puts
  // one away and nothing brings one back, so `readOpenedFileState` answers
  // `none` on the first press of every run and there is nothing to offer.
  // ⚠️ NT-4 of table T-037 is where the offer would stand, and table T-077
  // already puts it outside the boot order, so no step of that table is being
  // skipped here.

  // ---- BO-3, BO-4, BO-5 ---------------------------------------------------
  // BO-3 is inside the document: zoomX / zoomY and scrollDate / scrollGroupId
  // are stored (FR-024 keeps all four, WY-1 needs them), so the loop reads
  // them off documentSettings rather than being told. BO-4 and BO-5 are the
  // first frame, which the loop runs as soon as BO-1's size is settled.
  // ⚠️ IF-3 IS HANDED OVER, NOT REACHED FOR. SK-11 writes out a value the loop
  // holds, and LY-5 of table T-060 leaves that value with the loop -- so the
  // store goes to the party that has the document rather than the boot file
  // keeping it and asking for the document back.
  loop = frameLoop(
    domSvgSurface(scheduleCanvas),
    chosen.document,
    nowEnvironment(),
    { surface: screenSurface, language: displayLanguage() },
    fileStore,
  )

  // STOP -- ⛔ FR-065'S FIRST MUST IS UNMET, AND THE PIECE THAT IS MISSING IS
  // NOT IN THIS FILE. `installAgentApi` (PI-17) has no caller anywhere in
  // `src/`, so a person can press IC-20 and no entrance appears.
  //
  // ⭐ TWO THINGS THAT ARE NOT WHAT IS BLOCKING IT, both measured rather than
  // assumed, because both have been offered as the reason before:
  //
  //   * FR-028's 「既定では公開しないこと（MUST）」 does NOT need a flag on the
  //     launching side. Its RATIONALE offers that flag OR a person's enabling
  //     on screen, joined by 「か」, so the on-screen path alone satisfies it.
  //   * FR-065's second MUST -- that the screen shows the API is on while it
  //     is -- is ALREADY DRAWN. UF-62 of table T-075 owns it and
  //     `app-header-items.ts` reports IC-20 pressed while
  //     `ScreenSession.isAgentApiEnabled` is true. Nothing is owed there.
  //
  // ⛔ WHAT IS ACTUALLY BLOCKING IT IS ON THE OTHER SIDE OF UT-6 OF TABLE
  // T-063. Placing the public point is this unit's (UF-47 of table T-075), and
  // the identifier it goes under is settled -- `_assets/tbl-glossary.md`
  // section 3 spells it `grSchedulerAgentApi`, on `globalThis`, and forbids
  // minting another. What cannot be placed is the VALUE. `installAgentApi`
  // takes an `AgentApiWiring` whose `source` is IF-7 of table T-065, and UF-48
  // gives IF-7's implementation to `frame-loop.ts` -- which does not have one.
  // `FrameLoop` publishes `current`, `document` and `exportScene` and no more,
  // so the selection, the dialogue log, AG-9's two in-flight flags and the two
  // limit sets an `AgentSnapshot` names cannot be reached from here. ⛔ Neither
  // can the toggle itself: `isAgentApiEnabled` is a local of `frameLoop` that
  // is reported to nobody, so this file cannot even see it turn.
  // ⚠️ Building a second `DocumentHolder` here instead is not the way round it
  // -- two holders of one document is two answers to 「which document is open」,
  // the same objection this file's header already makes about IF-3's store.
  //
  // ⭐ WHAT IS OWED, so that the next owner has it in one place: `frame-loop.ts`
  // gains the `SnapshotSource` UF-48 already assigns it and hands out the
  // `DocumentHolder`, the `ChangeAudience` and PI-16's two dialogue seams it
  // already builds, plus a way to hear `isAgentApiEnabled` turn. THEN this file
  // installs on the turn to true, drops its reference on the turn to false, and
  // raises RS-20 of table T-233 in NT-5's manner, which is how FR-065's third
  // MUST is kept: disabling cannot take back a reference already handed over,
  // and `installAgentApi`'s own note says the same from the far side.
  //
  // ⛔ S-99b STAYS SHORT OF HALF ITS KEY, and it is not this file's to invent.
  // FR-065 makes the enabling a per-document memory (MUST) and S-99b keys the
  // record by the document; `frame-loop.ts` records that nothing in this build
  // derives a document identifier. ⭐ Until one exists the enabling lasts as
  // long as the page, which is the smallest honest behaviour -- a record filed
  // under a made-up key would be remembered for the wrong document, which is
  // the one outcome that MUST forbids.

  // FT-1 of table T-078 -- the person operating the tool.
  // ⭐ `window` is what `InputHost` asks for: the seam names the five members
  // it touches, and a real window has every one. ⚠️ MK-10's answer is handed to
  // the FACTORY and the happenings to the WATCHER, because PI-27's
  // `InputWatcher` returns nothing -- so the answer cannot come back the way it
  // was asked, and the question has to be asked before the watcher runs.
  // ⚠️ `unwatchInput` is never called, and that is not a leak left behind: the
  // listeners live exactly as long as the page that boots this file, which is
  // the same lifetime the two FT-3 observations below take. R3.5's pairing has
  // nowhere else to end -- `boot` runs once and never returns a way to stop.
  const inputSource = domInputSource(
    window,
    (input) => loop?.isBrowserDefaultStopped(input) ?? false,
  )
  inputSource.watchInput((input) => loop?.receiveInput(input))

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
