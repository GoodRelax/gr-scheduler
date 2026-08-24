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
// ⭐ BT-1 OF TABLE T-034 IS READ HERE, out of the container CP-25's own
// responsibility column says this component holds. FR-067's exactly-one check
// and its notify-then-descend are `embeddedStartupDocument`'s, and the id it
// looks for is fixed by the contract `app-shell-source.ts` carries.
// ⛔ The counterpart is still owed: UF-47 also owes `AppShellSource`'s
// implementation (IF-8), and nothing in `src/` implements it -- so this build
// can READ an embedded document and cannot WRITE one, and index.html ships no
// container for a writer to find.
//
// ⭐ THE PUBLIC POINT IS PLACED HERE, which is the other half of UF-47's row:
// `installAgentApi` (PI-17) builds the surface and refuses to place it, and
// FR-065 / FR-028 decide when the name is there and when it is gone. The
// section near the end of `boot` carries the whole of that reasoning.
//
// ⭐ IF-3 IS BUILT HERE AND USED IN THE LOOP. This file is the only one that
// may touch the host, so it is where the two pickers and the drop surface are
// gathered into `FileSystemAccessEnvironment` (PI-28) -- and the store then
// goes straight to the loop, because SK-11 writes out the current value LY-5 of
// table T-060 leaves with the loop alone. ⛔ This file keeps no copy of it: two
// holders of one store is two answers to 「which file is open」.

import { chooseStartupDocument } from '../../use-case/choose-startup-document/choose-startup-document'
import type { Document } from '../../entity/document-model/document/document'
// ⭐ THE ENTRY ITSELF, because this file CALLS it: PI-17 of table T-064
// publishes `installAgentApi`, and UF-47 of table T-075 gives 「公開点を置くこと」
// to this unit. ⛔ Nothing else of that component is imported -- the wiring's
// own shape is derived from this signature below, so no name crosses the folder
// that table T-064 has no row for.
import { installAgentApi } from '../../adapter/agent-api-endpoint/agent-api-endpoint'
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
  noWorkingWeekdayReason,
  startupDisplayLanguage,
  type FrameEnvironment,
  type FrameLoop,
  type StartupNoticeReason,
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
 * row forbids (MUST NOT). ⭐ A SUBSCRIBER CAN NOW BE INSTALLED -- AM-17 of table
 * T-107 is reachable the moment `installAgentApi` runs below -- and the two
 * still cannot collide, because it subscribes under `AGENT_API_WRITER` and that
 * name is not empty. Table T-229 does not settle this one either: it governs
 * `lastEditedBy`, and an utterance is not a write to the document (FR-066,
 * MUST NOT).
 */
const AUTHOR_NOT_HELD = ''

/**
 * BT-1 of table T-034 -- the `id` of the element the embedded document is read
 * out of, which the shell owns because CP-25's own responsibility column says
 * it holds the embedding container.
 *
 * ⭐ NOT MINTED HERE. The header of `app-shell-source.ts` carries the contract
 * that fixes this value, why it is not free to vary, and why it may not be a
 * constant exported from DocumentCodec instead -- section 5-1 of
 * previous-project-result/10-agent-interface/agent-interface-spec-ja.md is the
 * document it comes from, at rank 3 of section 6 of
 * docs/development-rules/03-implementation.md.
 * ⚠️ Written here rather than only being handed across IF-8, because BT-1 READS
 * it and IF-8 is the writing seam; the same spelling is what makes the writer
 * aim at the element the reader opens.
 */
const EMBEDDED_DOCUMENT_ELEMENT_ID = 'embedded-document'

/**
 * What that container holds when nobody has embedded a document.
 *
 * ⭐ THE CONTRACT'S OWN DEFAULT, not a convenience: the same section 5-1 ships
 * the artifact with the container in place holding the JSON literal `null`, and
 * its rule 7 makes 「入れ口が空かどうか」 the ONE test for 「誰かが意図して文書を
 * 入れた」. ⛔ So it may not be read as an unreadable document: `documentFromJson`
 * would refuse it (a `null` is not a `Document`) and FR-067's telling would then
 * fire on every ordinary run of an untouched artifact, which is a telling about
 * nothing.
 */
const EMBEDDED_DOCUMENT_ABSENT = 'null'

/**
 * Where the `Agent API` appears while it is on.
 *
 * ⭐ THE SETTLED IDENTIFIER, COPIED SPELLING AND ALL (rule 03 section 1):
 * section 3 of `_assets/tbl-glossary.md` fixes `grSchedulerAgentApi` on
 * `globalThis`, gives the reason for the product prefix, and forbids minting
 * another. ⛔ `installAgentApi` deliberately does not place it -- its own note
 * says choosing a place would be inventing a public name -- so the choosing is
 * this file's and the name is the glossary's.
 * ⚠️ `globalThis` and NOT `window`: the glossary says so, and a name bound to a
 * browser's own object would be a lie in any host that has no window.
 */
const AGENT_API_IDENTIFIER = 'grSchedulerAgentApi'

/**
 * The name every write and every utterance from the `Agent API` is recorded
 * under.
 *
 * STOP -- ⛔ ED-2 OF TABLE T-229 GIVES THIS NAME TO THE CALLER, and no member of
 * table T-107 lets a caller declare one: `installAgentApi` takes it once, at
 * install, and the eighteen members carry no place to say who is speaking. So
 * every caller of this build's API shares one name.
 * ⚠️ THE CONSEQUENCE IS ALREADY WRITTEN DOWN rather than being new here: LM-16
 * of table T-004 says two callers naming themselves alike cannot be told apart
 * and are woken by each other's writes, and records that closing it means
 * carrying an identity on the watching seam -- 「それは別の裁定である」.
 * ⛔ WHAT IS KEPT MEANWHILE. FR-063 (MUST) sends the word to table T-229, and
 * that table's MUST NOT forbids a caller to take the two words it reserves --
 * `user` for the screen (ED-1) and `template` for the shipped template (ED-3).
 * This is neither, so AG-6 tells this writer from both.
 */
const AGENT_API_WRITER = 'agent'

/**
 * The key BT-1's document would be filed under if anything filed it.
 *
 * STOP -- ⛔ NOTHING IN THIS BUILD DERIVES A DOCUMENT IDENTIFIER, and this file
 * does not invent one. `choose-startup-document.ts` carries the same STOP from
 * the far side: no requirement says what makes two documents the same one,
 * `Project.id` is not it (AT-1 is nullable and is marked as no primary key), and
 * S-99b of table T-206 names an identifier without defining one.
 * ⭐ IT IS COMPARED AGAINST NOTHING TODAY. UF-23 reads a key only to tell a
 * losing autosave's document from the winner's, and BT-3 hands `none` in this
 * build -- so the empty string travels and is never looked at.
 * ⛔ THE DAY BT-3 GAINS A PRODUCER THIS LINE HAS TO GAIN A KEY FIRST: two
 * documents filed under one empty key would read as the same document, which is
 * exactly the confusion FR-061 forbids (MUST NOT).
 */
const DOCUMENT_KEY_NOT_DERIVED = ''

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

/** UF-23's argument list, which is the one route to the candidate below. */
type StartupCandidates = Parameters<typeof chooseStartupDocument>[0]

/** BT-1's candidate, as UF-23 declares it (PI-14 publishes no name for it). */
type EmbeddedCandidate = StartupCandidates['embedded']

/** The codes UF-23 answers with, named through its own answer for the same reason. */
type StartupNoticeCode = ReturnType<typeof chooseStartupDocument>['notices'][number]['code']

/**
 * Which row of table T-233 each thing BO-2 has to tell is told on.
 *
 * ⭐ A CENSUS THE COMPILER KEEPS, the move `frame-loop.ts` makes for every other
 * reason it raises: a code added on UF-23's side is a compile error here rather
 * than a startup that decides in silence.
 * ⛔ TWO OF THE FOUR FALL TO `RS-15`, and that is the row FR-076 provides for
 * exactly this -- 「行の無い理由に落ち先を与えるのが `RS-15` である」. Table T-233
 * holds nothing for 「入れ口が 1 つでない」 and nothing for a file handed at
 * startup that could not be read: RS-4 and RS-11 .. RS-13 belong to OP-12's
 * dispatch of table T-024a, which BT-2 has not been through. ⚠️ A row of that
 * table for either is what is owed.
 * ⭐ The other two ARE rows of their own: RS-25 is 「読んだ `GRS JSON` の列が、
 * 決められた形に合わない」, which is what BT-1's container holds, and RS-17 is
 * FR-026's own 「自動保存した内容が壊れていて、復旧できない」.
 */
const STARTUP_NOTICE_REASON: Readonly<Record<StartupNoticeCode, StartupNoticeReason>> = {
  embeddedUnreadable: 'RS-25',
  embeddedEntryCountNotOne: 'RS-15',
  handedUnreadable: 'RS-15',
  autosaveBroken: 'RS-17',
}

/**
 * BT-1 of table T-034 -- the document embedded in this file, read out of its
 * container, with FR-088's gate held against it before it can win.
 *
 * ⭐ WHY ZERO CONTAINERS IS `none` AND NOT 「1 つでない」. FR-067's telling is
 * about a file whose embedding is ambiguous, and index.html in this repository
 * ships no container at all -- so zero is the ordinary first run of an ordinary
 * build, and reporting it as a fault would raise FR-067's notice on every one of
 * them. ⛔ TWO OR MORE IS THE REAL CASE that requirement names, and it descends
 * with a telling rather than picking a winner: the writer's side refuses the
 * same file for the same reason (`moreThanOneEntry` in `embedded-html-codec.ts`).
 *
 * ⭐ FR-088's GATE IS HELD HERE AND NOWHERE LATER. BT-1 is untrusted intake --
 * R-1 and R-3 of table T-008 -- and a calendar that works no weekday leaves
 * every count of working days with no day to reach, so the document has to be
 * turned away BEFORE it becomes the current one. `noWorkingWeekdayReason` is
 * where the invariant row and the notice row are joined, so neither is spelled
 * twice.
 *
 * STOP -- ⛔ FR-023's VALIDATION IS NOT RUN OVER IT, and that is not this
 * function's to fix. `validateImportedDocument` (PI-13) exists, but
 * `frame-loop.ts` records from the open path that its refusals reach nobody:
 * each names a row of table T-220, and `display-words.json` has no section keyed
 * on those, so there is nothing for the words to be read out of. ⚠️ The gate
 * above is the one check of the two that CAN be told.
 *
 * @purity semi-pure-b
 */
function embeddedStartupDocument(): {
  readonly candidate: EmbeddedCandidate
  /** FR-088's row when the gate turned BT-1 away, `null` otherwise. */
  readonly refusal: StartupNoticeReason | null
} {
  const containers = document.querySelectorAll(`#${EMBEDDED_DOCUMENT_ELEMENT_ID}`)
  if (containers.length === 0) return { candidate: { kind: 'none' }, refusal: null }
  if (containers.length > 1) {
    return {
      candidate: { kind: 'entryCountNotOne', entryCount: containers.length },
      refusal: null,
    }
  }
  const embedded = containers[0]?.textContent?.trim() ?? ''
  if (embedded === '' || embedded === EMBEDDED_DOCUMENT_ABSENT) {
    return { candidate: { kind: 'none' }, refusal: null }
  }
  // ⛔ Through the same reader every other intake takes (FR-023 calls every one
  // untrusted). ⚠️ NOTHING IS UN-ESCAPED FIRST: what the writer put in the
  // container is still JSON -- `embeddedJson` replaces each `<` with that
  // character's own JSON escape so that no `</script>` can end the tag early --
  // so the reader below gives the character back and a step here would corrupt
  // it.
  const read = documentFromJson(embedded)
  if (!read.ok) return { candidate: { kind: 'unreadable' }, refusal: null }
  const refusal = noWorkingWeekdayReason(read.document)
  // FR-067: a rank that yields nothing descends rather than starting empty, so
  // a refused BT-1 hands `none` and the telling travels beside it.
  if (refusal !== null) return { candidate: { kind: 'none' }, refusal }
  return {
    candidate: {
      kind: 'read',
      document: read.document,
      documentKey: DOCUMENT_KEY_NOT_DERIVED,
    },
    refusal: null,
  }
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
  // Table T-034's order. BT-1 IS READ NOW; the two after it are still missing
  // something different, and neither absence is a stand-in:
  //
  //   BT-2  ⛔ IF-3 HAS NO MEMBER FOR IT AND CANNOT. Table T-034 sends this
  //         rank to R-1 of table T-008 -- a file chooser or a drop -- and
  //         neither has happened at the moment BO-2 runs. `readFileToOpen`
  //         answers for a gesture the person has just made; nothing on that
  //         seam answers for a file the host handed the page as it started.
  //   BT-3  AutosaveGateway (IF-4) is not built in this build.
  //
  // ⛔ Saying `none` for those two is what is true of this build, and FR-067
  // already says a rank that yields nothing descends rather than starting empty.
  //
  // ⚠️ THE TEMPLATE IS BUILT ONCE AND HELD, because two things read it: BT-4 is
  // one, and AM-2's `schemaVersion` below is the other -- the greatest document
  // format version this build knows is the one its own generator wrote into the
  // bundled template, and rule 03 forbids typing a generated value again.
  const template = startupTemplateDocument()
  const embedded = embeddedStartupDocument()
  const chosen = chooseStartupDocument({
    embedded: embedded.candidate,
    handed: { kind: 'none' },
    autosave: { kind: 'none' },
    template,
  })

  // ⭐ FR-088's GATE IS ON THIS ROAD NOW, and both halves of 「受け付けずに通知
  // すること（MUST）」 are kept for the one rank that has a producer. The note
  // here used to say neither could be, and gave a reason for each; both reasons
  // are gone:
  //
  //   受け付けず   `embeddedStartupDocument` hands `none` for a refused BT-1, so
  //                FR-067's descent carries the boot to the next rank instead of
  //                the gate leaving it with no document at all.
  //   通知する     the telling waits for the loop and is raised below, which is
  //                the only order table T-077 admits -- BO-1's size is not
  //                settled here and nothing holds `ScreenSession.notices` yet.
  //
  // ⭐ BT-4 IS STILL NOT PUT THROUGH IT, and that is the judgement
  // `startupTemplateDocument` records for the same file: the template is
  // BUNDLED, so a fault in it is a build that shipped broken, and
  // `npm run gen:check` is where that is caught rather than at boot.
  // ⛔ WHAT IS OWED WHEN THE OTHER TWO RANKS GAIN PRODUCERS. BT-2's handed file
  // and BT-3's autosave are each R-1 / R-3 of table T-008 -- untrusted -- and
  // each of them needs this same gate before it may be handed over as `read`.

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
  const running = frameLoop(
    domSvgSurface(scheduleCanvas),
    chosen.document,
    nowEnvironment(),
    { surface: screenSurface, language: displayLanguage() },
    fileStore,
  )
  loop = running

  // FR-076 (MUST): what BO-2 decided and could not tell, told now that there is
  // somewhere to put it.
  // ⭐ UF-23's ANSWER FIRST, THEN THIS FILE'S, which is table T-034's own order:
  // a rank that could not be read is reported before the gate that turned a rank
  // away, and only one of the two can be about BT-1 in any one run.
  // ⚠️ NT-4 of table T-037 -- 「起動時の保留中の用件を 1 枚に集約」 -- is kept by
  // there being one list of raised tellings and one place that draws it.
  for (const notice of chosen.notices) {
    running.raiseStartupNotice(STARTUP_NOTICE_REASON[notice.code])
  }
  if (embedded.refusal !== null) running.raiseStartupNotice(embedded.refusal)

  // ---- FR-065 and FR-028: the public point --------------------------------
  //
  // ⭐ UF-47 OF TABLE T-075 GIVES THE PLACING TO THIS UNIT, and `installAgentApi`
  // deliberately does not place what it builds: its own note says that choosing
  // a global's name would be inventing a public name, so the component builds
  // the surface and the shell that turned it on decides where the reference
  // goes. Section 3 of `_assets/tbl-glossary.md` is what decided the name.
  //
  // ⛔ FR-028 (MUST): 「既定では公開しない」. The loop starts with the enabling
  // off and this watcher is set before any input can arrive, so the name is
  // absent until a person presses IC-20 -- and it is REMOVED again on the way
  // back, which is the half a toggle that installed and never uninstalled would
  // fail from the second press on.
  // ⚠️ REMOVING THE NAME IS NOT TAKING THE API BACK, and FR-065 (MUST) has that
  // said out loud rather than papered over: a reference already handed out goes
  // on working, `installAgentApi` says the same from its side, and the loop
  // raises RS-20 of table T-233 in NT-5's manner as the press is accepted.
  //
  // ⛔ NOT REMEMBERED PER DOCUMENT, which is FR-065's other MUST and the one
  // thing here that is NOT kept. S-99b of table T-206 keys that record by
  // 「文書の識別子」 and nothing in this build derives one -- `frame-loop.ts`
  // (`sessionOf`) and `choose-startup-document.ts` both carry the same STOP, and
  // `DOCUMENT_KEY_NOT_DERIVED` above says why this file does not invent one.
  // ⭐ So the enabling lasts as long as the page, which is the smallest honest
  // behaviour: a record filed under a made-up key would be remembered for the
  // WRONG document, and that is the outcome the MUST exists to forbid.
  // ⭐ THE MUST NOT BESIDE IT IS KEPT ALREADY -- `replaceHeldDocument` turns the
  // enabling off on the three rows of table T-230 that do not carry the history
  // forward, and this watcher hears that turn like any other.
  //
  // ⚠️ `globalThis` IS REACHED THROUGH ONE INDEX, because the host's own
  // declarations carry no such member and there is nothing to narrow: what goes
  // there is `installAgentApi`'s answer, whatever that is, and what is taken
  // away is the same key.
  const host = globalThis as unknown as Record<string, unknown>
  running.watchAgentApiEnabling((isEnabled) => {
    if (!isEnabled) {
      delete host[AGENT_API_IDENTIFIER]
      return
    }
    host[AGENT_API_IDENTIFIER] = installAgentApi({
      // IF-7 and the four seams PI-8 and PI-16 declare, all of them current
      // values LY-5 of table T-060 leaves with the loop -- so they are asked
      // for rather than a second holder of any of them being built here.
      ...running.agentApiSeams(),
      writerName: AGENT_API_WRITER,
      // AM-2 of table T-107. ⭐ Read off the bundled template rather than typed,
      // because its generator is what holds this value (rule 03 section 1).
      schemaVersion: template.schemaVersion,
    })
  })

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
