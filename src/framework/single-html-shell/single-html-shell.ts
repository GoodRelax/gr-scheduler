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
//   2. BT-4 is read and the page's ground is painted (see the next paragraph),
//   3. DomScreenSurface (PI-38) is built, which mounts the header and hands its
//      measured height back BEFORE its factory returns,
//   4. only then is BO-1's `ScreenRegions` asked for.
//
// ⛔ Nothing is SHOWN by step 3: PI-38 keeps its root out of sight until the
// first `showScreenView`, which is BO-1's 「寸法が確定するまで 1 枚も描かない」.
//
// ⭐ WHY STEP 2 IS A STEP AT ALL. FR-041 (MUST) has this product paint the
// page's own ground and (MUST NOT) forbids leaving it to the viewing
// environment, whose colours follow the OPERATING SYSTEM and not the reader's
// `themePreference` (S-72) -- and the page element is this unit's, because both
// drawn layers stand `position:fixed` over it. So the ground is painted from
// the earliest moment the two values can be read, which is as soon as BT-4's
// bundled template is a `Document`, and again the moment BO-2 has chosen one.
// ⛔ THE VALUE IS NOT THIS FILE'S: `pageGroundStyle` (DomScreenSurface) resolves
// S-146 of table T-236 out of the one generated block that table reaches, so
// nothing of the colour is typed here.
// ⚠️ BT-4 BEING READ AT STEP 2 IS NOT BO-2 RUNNING EARLY -- BO-2 is the
// choosing, and it still stands where table T-077 puts it.
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
// ⭐⭐ THE COUNTERPART IS NO LONGER OWED. UF-47's other half -- `AppShellSource`
// (IF-8) -- is `appShellSource` below, so this build can WRITE an embedded
// document as well as read one, and IO-7 of table T-024 goes out as a file
// (D-173). ⚠️ index.html still ships no container, so the first export takes
// the writer's 「there is none yet, add one」 branch.
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
import { NOT_STORED_SCROLLBAR_SIZES } from './frame-loop'
import { browserClipboard } from '../browser-clipboard/browser-clipboard'
// ⭐ CP-31, THE ONE IMPLEMENTATION OF `Rasterizer` (IF-6), and this is its first
// caller. ⛔ It has been written since the unit was filled in and nothing in
// `src/` imported it, which is why IO-4 of table T-024 was offered on FR-096's
// chooser and wrote nothing (D-173, measured 2026-09-01). ⚠️ Framework reaching
// Framework, through the folder's public entry: LR-1 of table T-061 forbids an
// outward arrow, not a sideways one, and this file is the one that may hand the
// loop a host.
import { canvasRasterizer } from '../canvas-rasterizer/canvas-rasterizer'
import type { Document } from '../../entity/document-model/document/document'
// ⭐ THE ENTRY ITSELF, because this file CALLS it: PI-17 of table T-064
// publishes `installAgentApi`, and UF-47 of table T-075 gives 「公開点を置くこと」
// to this unit. ⛔ Nothing else of that component is imported -- the wiring's
// own shape is derived from this signature below, so no name crosses the folder
// that table T-064 has no row for.
import { installAgentApi } from '../../adapter/agent-api-endpoint/agent-api-endpoint'
// ⛔ `AppShellReading` IS NOT IMPORTED, AND THE ANSWER BELOW IS NOT ANNOTATED
// WITH IT. Table T-064's PI-20 is the full count of what DocumentCodec may be
// asked for and it names `AppShellSource` and not that type, so the name may not
// cross this folder (check 26b). The seam's own member declares the return
// type, and the object below is typed by it.
import {
  documentFromJson,
  type AppShellSource,
} from '../../adapter/document-codec/document-codec'
import type {
  DisplayLanguage,
  ScreenSurface,
} from '../../adapter/screen-renderer/screen-renderer'
import { domInputSource } from '../dom-input-source/dom-input-source'
// ⭐ TWO NAMES FROM ONE COMPONENT, AND THE SECOND IS THE COLOUR AND NOT THE
// ELEMENT. FR-041 (MUST) has this product paint the page's own ground, table
// T-236 holds it, and `SCREEN_COLOURS` is the one place that table reaches
// `src/` -- so the row is RESOLVED by the unit that holds it and WRITTEN by this
// one, which is the only unit that may touch the page element. ⛔ Neither half
// is copied to the other side (rule 03 section 1).
import {
  domScreenSurface,
  pageGroundStyle,
  type ScreenTheme,
} from '../dom-screen-surface/dom-screen-surface'
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
  type PointerShape,
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
 * The application as the host delivered it, taken before this file has built
 * anything -- IF-8's one value, and the other half of UF-47's row.
 *
 * ⛔⛔ TAKEN AT THE HEAD OF `boot` AND NEVER AGAIN, WHICH IS THE WHOLE OF WHAT
 * MAKES IT THE DELIVERED APPLICATION. `AppShell.html` says in as many words
 * that a serialization of the LIVE DOM would carry a screen's worth of nodes
 * FR-067 never asked for and would grow with every export of an export. At the
 * first statement of `boot` the parser has finished and this file has appended
 * nothing, so what stands in the page is exactly what the host was given --
 * and re-exporting an export starts from that same delivered text, so the file
 * does not grow. ⚠️ Measured 2026-09-02: 1,753,785 characters once the screen
 * is drawn against the artifact's own 1,116,570 bytes, which is the size of the
 * mistake this timing avoids.
 *
 * ⛔ `fetch(location.href)` IS NOT USED, AND IT IS NOT A MATTER OF TASTE. It
 * answers with the artifact's own bytes where it works, and it is refused
 * outright for a page opened from disk -- measured 2026-09-02, Chromium on a
 * `file://` page: `TypeError: Failed to fetch`. That is LM-14's environment and
 * the one this tool is meant to be carried around in, so the road that fails
 * exactly there cannot be the road.
 *
 * ⚠️ WHAT IS GIVEN UP is byte-for-byte fidelity: this is the parsed document
 * serialized again, so quoting and empty-element spelling are the browser's
 * rather than the file's. ⛔ The two things that would BREAK are both kept: a
 * `<script>` element's text is serialized verbatim, so CN-8's `script-src`
 * hash still matches, and no character reference is introduced inside it.
 */
let deliveredAppShellHtml: string | null = null

/**
 * The page as it stands, with the prologue `outerHTML` leaves out.
 *
 * ⚠️ THE DOCTYPE IS NOT DECORATION. `documentElement.outerHTML` begins at
 * `<html>`, and an exported file without the prologue is parsed in quirks
 * mode -- a different page from the one that was exported.
 *
 * @purity semi-pure-b
 */
function readDeliveredHtml(): string {
  const prologue = document.doctype === null ? '' : `<!DOCTYPE ${document.doctype.name}>\n`
  return `${prologue}${document.documentElement.outerHTML}\n`
}

/**
 * IF-8's implementation (table T-065), which UF-47 of table T-075 gives to this
 * unit.
 *
 * ⭐ IT ANSWERS FROM WHAT WAS TAKEN, and asking the page again is exactly what
 * `AppShell.html` forbids -- see `deliveredAppShellHtml`. The member is still a
 * promise because the seam is: an implementation that had to fetch its own file
 * would need one, and the caller may not be made to know which kind it got.
 * ⛔ THE ID IS THE SHELL'S TO SUPPLY AND NOT THE SHELL'S TO CHOOSE. It is the
 * same constant BT-1 reads with, which is what makes the writer aim at the
 * element the reader opens; `app-shell-source.ts` carries the contract that
 * fixes the value.
 *
 * @purity semi-pure-b
 */
function appShellSource(): AppShellSource {
  return {
    /** @purity semi-pure-b */
    async readAppShell() {
      const delivered = deliveredAppShellHtml
      if (delivered === null || delivered === '') {
        // ⚠️ Only reachable if this seam is asked before `boot` has run, which
        // no road of this build takes. It is answered rather than thrown
        // because FR-028 (MUST NOT) forbids the throw across the seam.
        return { ok: false, what: 'the application was not read before the screen was built' }
      }
      return {
        ok: true,
        appShell: {
          html: delivered,
          embeddedDocumentElementId: EMBEDDED_DOCUMENT_ELEMENT_ID,
        },
      }
    },
  }
}

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
 * ⚠️ NOTHING READS IT ANY MORE. UF-23 took a key only to tell a losing
 * autosave's document from the winner's, and CR-280 retired both, so the
 * constant went with them and only this note is kept -- S-99b of table T-206
 * still names an identifier nothing in this build derives.
 */

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
 * ⛔ ONE OF THE THREE FALLS TO `RS-15`, and that is the row FR-076 provides for
 * exactly this -- 「行の無い理由に落ち先を与えるのが `RS-15` である」. Table T-233
 * holds nothing for 「入れ口が 1 つでない」: RS-4 and RS-11 .. RS-13 belong to
 * OP-12's dispatch of table T-024a, which BT-2 has not been through. ⚠️ A row
 * of that table for it is what is owed.
 * ⭐ THE OTHER TWO ARE ROWS OF THEIR OWN: RS-25 is 「読んだ `GRS JSON` の列が、
 * 決められた形に合わない」, which is what BT-1's container holds, and RS-26 is
 * 「起動時に渡された文書が読めなかった」 (table T-024a's `OP-14`), which is what
 * BT-2's own read failure holds -- CR-299 gave it table T-024a's `OP-14` and
 * table T-233's `RS-26` so it would stop falling to `RS-15`.
 */
const STARTUP_NOTICE_REASON: Readonly<Record<StartupNoticeCode, StartupNoticeReason>> = {
  embeddedUnreadable: 'RS-25',
  embeddedEntryCountNotOne: 'RS-15',
  handedUnreadable: 'RS-26',
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
 * ⚠️ A HOST WITH OVERLAY SCROLLBARS MEASURES 0, AND HALF OF 0 IS 0. That is
 * the environment's honest answer and it is NOT one this tool can use: a band
 * 0 thick cannot be pointed at or grabbed, so FR-037 (the reading a scrollbar
 * carries) and table T-031 (「スクロールバーの操作でも表示位置を変えられること」,
 * MUST) both go unkept. ⛔ THE NOTE HERE USED TO CALL IT "not a fault"; the
 * user reported it as one (D-115) and they were right.
 * ⭐ FR-051 (MUST) now puts a floor under it -- S-205 -- and the order is the
 * requirement's: halve first, then floor, so a host with a thick default is
 * still halved.
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
  return Math.max(environmentDefault / 2, NOT_STORED_SCROLLBAR_SIZES['S-205'])
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
function environmentOf(
  appHeaderHeight: number,
  scrollbarThickness: number,
  rowControlsHeightPx: number,
): FrameEnvironment {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    appHeaderHeight,
    scrollbarThickness,
    rowControlsHeightPx,
  }
}

/** @purity non-pure */
function boot(): void {
  // ⛔ THE FIRST STATEMENT, AND IT HAS TO STAY THE FIRST. IF-8 answers with the
  // application AS DELIVERED, and the line below is where this file begins
  // building a screen into the same page.
  deliveredAppShellHtml = readDeliveredHtml()

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
  // LF-3 of table T-221 (MUST): the floor HF-1's lattice puts under a row's
  // band. ⛔ NOT MEASURED AT BO-1 LIKE THE THICKNESS ABOVE, because no row has
  // been drawn yet -- the surface answers it after the first panel, the way it
  // answers the header's height, and 0 until then is the floor every band had
  // before the ruling.
  let rowControlsHeightPx = 0
  let loop: FrameLoop | null = null
  const nowEnvironment = (): FrameEnvironment =>
    environmentOf(appHeaderHeightPx, scrollbarThickness, rowControlsHeightPx)

  // ⭐ BT-4 IS READ HERE, ABOVE BO-2, AND THAT IS NOT BO-2 HAPPENING EARLY.
  // Table T-077's BO-2 is the CHOOSING, and that still stands below; this only
  // turns the bundled `GRS JSON` into a `Document`, which needs no part of the
  // screen. ⛔ IT HAS TO BE READABLE BY NOW because `readTheme` is asked for
  // WHILE the surface is being built -- the header is made and measured inside
  // that factory -- and until 2026-08-25 the answer named `chosen`, which is
  // not initialised until BO-2. ⚠️ Measured, not reasoned about: the page threw
  // `ReferenceError: Cannot access 'chosen' before initialization` at the first
  // statement of `boot`, so NOTHING of this tool started at all.
  // ⛔ A typed pair is what rule 03 section 1 forbids; the template carries
  // S-72's and S-73's defaults because its own generator wrote them there.
  const template = startupTemplateDocument()

  /**
   * The document FR-041's two values are read off while there is no loop to
   * ask -- BT-4 until BO-2 has chosen, and BO-2's answer after that.
   *
   * ⛔ NOT A SECOND HOLDER OF THE CURRENT DOCUMENT, which this file refuses
   * elsewhere for IF-3 and for the same reason. It is read ONLY while `loop`
   * is null: the moment the loop exists it is the one answer, because LY-5 of
   * table T-060 leaves the current value with it.
   */
  let themeDocument: Document = template

  /**
   * FR-041 (MUST): S-72 and S-73 as they stand at the moment of asking.
   *
   * ⛔ THE READER'S CHOICE, NOT THE ENVIRONMENT'S. S-72 is what the person
   * picked and S-73 is the hue the document carries; the environment's own
   * system colours follow the OPERATING SYSTEM, which is exactly why picking
   * dark used to leave the screen light.
   * ⚠️ Read at each call rather than captured: both move while the page is
   * open (IC-16 switches S-72 with the document open), and a captured pair
   * would paint the theme the document was opened with for ever.
   *
   * @purity semi-pure-b
   */
  function heldTheme(): ScreenTheme {
    const held = loop === null ? themeDocument : loop.document()
    return {
      preference: held.documentSettings.themePreference,
      hue: held.schedule.project.themeHue,
    }
  }

  /** What the page element already carries, so an unchanged frame writes nothing. */
  let pageGroundWritten = ''

  /**
   * FR-041 (MUST): 「地の色を自分で塗ること」, on the one box that lies behind the
   * schedule instead of over it.
   *
   * ⭐ THE PAGE ELEMENT IS THIS UNIT'S AND THE COLOUR IS NOT. Both drawn layers
   * are `position:fixed` at the window's origin (`AT_WINDOW_ORIGIN`), so a
   * background on either would hide what is under it -- DomScreenSurface says
   * the same from its side and hands the resolved declaration over instead.
   * ⚠️ `color-scheme` rides along because FR-041 (MUST) says painting alone is
   * not enough: the window's own scrollbars and the environment's default
   * canvas are the page element's, not the surface's.
   *
   * ⚠️ WRITTEN ONLY WHEN IT CHANGED, the same bargain `onAppHeaderHeightPx`
   * keeps in the other direction: this runs at the head of every frame, and
   * NFR-010's care about the per-frame path is as good a reason here as R5's.
   *
   * @purity non-pure
   */
  function paintPageGround(): void {
    const written = pageGroundStyle(heldTheme())
    if (written === pageGroundWritten) return
    pageGroundWritten = written
    document.documentElement.setAttribute('style', written)
  }

  /** What the root element already names, so an unchanged frame writes nothing. */
  let documentLanguageWritten = ''

  /**
   * FR-038 (MUST): 「表示言語を替えたときは、綴じた文書自身が名乗る言語も同じもの
   * に替えること」 -- 「読み上げと自動翻訳がそれを見る」.
   *
   * ⭐ WRITTEN ON THE SAME ELEMENT `paintPageGround` WRITES ON, AND BY THE SAME
   * UNIT. The root element is the bound document's own, not the screen surface's
   * (`DomScreenSurface` says so from its side), so the one file that already
   * touches it is the one that names its language.
   * ⭐ RIDES ON THE DRAWING RATHER THAN ON A TRIGGER OF ITS OWN, exactly as the
   * ground does: the loop holds the chosen language (LY-5 of table T-060) and
   * hands it over on `ScreenView.language`, and table T-078 names no trigger for
   * a language either.
   * ⚠️ FR-038 (MUST NOT) keeps the choice out of the document's contents -- this
   * writes the ATTRIBUTE the bound file carries, which is what that requirement
   * calls 「綴じた文書自身が名乗る言語」, not a settings key.
   *
   * ⚠️ WRITTEN ONLY WHEN IT CHANGED, the bargain `paintPageGround` keeps for the
   * same reason: this runs at the head of every frame.
   *
   * @purity non-pure
   */
  function nameDocumentLanguage(language: string): void {
    if (language === documentLanguageWritten) return
    documentLanguageWritten = language
    document.documentElement.setAttribute('lang', language)
  }

  // ⭐ THE FIRST PAINT IS HERE, BEFORE ANYTHING IS BUILT. FR-041 (MUST) forbids
  // the environment's colour to stand in, and every moment before this one is a
  // moment it does -- BO-1 deliberately holds the first frame back until the
  // size settles (NFR-011), so a ground painted only from the first frame is a
  // page that opens in the OS's colour and changes under the reader.
  paintPageGround()

  /**
   * What the screen surface handed over for MK-13, or `null` until it has.
   *
   * ⚠️ Filled while the factory below runs and never afterwards, the same
   * moment `onAppHeaderHeightPx` reports BO-1's height.
   */
  let focusPropertyFieldHeld: ((row: string) => void) | null = null

  /**
   * What the screen surface handed over for FR-020, or `null` until it has --
   * the way to read what stands in U-60's masked field.
   *
   * ⚠️ Filled while the factory below runs, the same moment the two above are.
   * ⛔ THE ANSWER ITSELF IS NEVER HELD HERE. This is the way to ASK for it, and
   * FR-020 (MUST NOT) keeps the raw password out of code, model and output --
   * the characters live in the control the surface drew and nowhere else.
   */
  let readWatermarkUnlockAnswerHeld: (() => string) | null = null
  // ⛔ THE TWO HOLDERS FOR HF-14's FIELD STOOD HERE AND ARE GONE, with the seam
  // they served: `openNewRowNameHeld` (the way to open an empty name field where
  // a new row would stand) and `newRowNameSettledHeld` (where the settled name
  // was to be taken). 利用者の裁定 2026-09-04 withdrew the three MUSTs that
  // asked for that field, and the naming now goes out on `focusPropertyField`.

  const screenSurface = domScreenSurface({
    host: document,
    mount: screenParts,
    readAuthor: () => AUTHOR_NOT_HELD,
    // ⚠️ The wall clock, and rightly so: what AT-129 spells is the moment a
    // person settled a line, not an elapsed time (R3.6 sends only elapsed time
    // to a monotonic clock).
    readClockMs: () => Date.now(),
    // FR-041 (MUST): the theme has to reach the side that paints, and this is
    // the one road -- `ScreenView` carries no theme member, so the session
    // cannot bring it across IF-9.
    // ⛔ ASKED WHILE THIS FACTORY RUNS, which is why `heldTheme` may not depend
    // on anything BO-2 settles: the surface builds and measures the header
    // inside the call below and paints it in the rendering it is told. ⚠️ An
    // earlier note here claimed the opposite -- 「no paint can reach this before
    // there is a loop」 -- and the page threw on that claim.
    readTheme: heldTheme,
    // MK-13's second half (MUST, CR-304): the field the double click puts the
    // person into is the surface's, so the surface hands over the way to reach
    // it and this holds the handle for the loop.
    // ⛔ IT DOES NOT TRAVEL ON IF-9. That cell of table T-065 names five
    // supplies and every one is a question -- `screen-surface.ts` records the
    // bargain, and the wiring is where FR-051's measured height already travels
    // for the same reason.
    /** @purity non-pure */
    holdFocusPropertyField: (focus) => {
      focusPropertyFieldHeld = focus
    },
    // FR-020 (MUST): the masked field U-60 asks the watermark unlock password
    // into is the surface's, so the surface hands over the way to read it and
    // this holds the handle for the loop. ⛔ It does not travel on IF-9 either,
    // for the reason the two members above give.
    /** @purity non-pure */
    holdReadWatermarkUnlockAnswer: (read) => {
      readWatermarkUnlockAnswerHeld = read
    },
    // LF-3's row-control floor, taken the way the header's height is and for the
    // same reason: HF-19 (MUST NOT) keeps the number out of the manuscript, so
    // the side that drew the lattice is the only one that can answer it.
    /** @purity non-pure */
    onRowControlsHeightPx: (heightPx) => {
      rowControlsHeightPx = heightPx
      // FT-3 of table T-078, exactly as below: the number is recorded and the
      // deciding is left to the shell's own resize path, which is the one place
      // that judges whether anything CHANGED.
      loop?.resize(nowEnvironment())
    },
    /** @purity non-pure */
    onAppHeaderHeightPx: (heightPx) => {
      appHeaderHeightPx = heightPx
      // FT-3 of table T-078 and nothing else: this records the number and
      // hands the deciding to the shell's own resize path, which is the one
      // place that judges whether the size CHANGED. ⛔ NFR-010 forbids waking a
      // frame on anything the table does not name.
      // ⚠️⚠️ `loop` IS NULL FOR THE FIRST TWO CALLS AND NOT ONLY THE FIRST, and
      // the note that stood here said otherwise (D-230). The first is BO-1's
      // own measurement, which no loop is waiting for; the SECOND is BO-5's
      // frame filling the header from inside `frameLoop`'s factory, and that
      // one IS a change. Neither is lost: the line after `loop = running` hands
      // the settled measurements over the moment there is somewhere to put them.
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
  // ⚠️ THE TEMPLATE IS BUILT ONCE AND HELD, because three things read it: BT-4
  // is one, AM-2's `schemaVersion` below is another -- the greatest document
  // format version this build knows is the one its own generator wrote into the
  // bundled template, and rule 03 forbids typing a generated value again -- and
  // FR-041's theme is the third, which is why it is read above BO-1 rather than
  // here.
  const embedded = embeddedStartupDocument()
  const chosen = chooseStartupDocument({
    embedded: embedded.candidate,
    handed: { kind: 'none' },
    template,
  })
  // FR-041 (MUST): BO-2 may have chosen a document that carries a different
  // S-72 or S-73 from BT-4's, so the ground is settled again the moment there
  // is an answer -- and before the first frame, which BO-5 has not reached.
  themeDocument = chosen.document
  paintPageGround()

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
  //
  // ⭐ FR-041 (MUST) RIDES ON THE DRAWING AND NOT ON A TRIGGER OF ITS OWN, which
  // is the only place it can: the loop is what runs a frame when IC-16 switches
  // S-72, and table T-078 names no trigger for a theme. ⛔ So the surface is
  // handed over WRAPPED rather than a second listener being added -- one more
  // watcher would be one more party deciding when a frame happened, which is
  // exactly what NFR-010 keeps to the loop. ⚠️ The ground is painted BEFORE the
  // frame it belongs to, so no frame is ever drawn over the previous theme's
  // ground, and `paintPageGround` writes nothing when the pair did not move.
  const painting: ScreenSurface = {
    ...screenSurface,
    /** @purity non-pure */
    showScreenView: (view) => {
      paintPageGround()
      nameDocumentLanguage(view.language)
      screenSurface.showScreenView(view)
    },
  }
  // IN-2 of table T-028 (MUST): the shape goes on the element that IS the
  // `Schedule Canvas`, which is the element made at the head of this function.
  //
  // ⭐ THIS UNIT IS THE ONE THAT MAY TOUCH IT, the same rule `pageGroundStyle`
  // above follows: the loop decides WHICH shape (it holds the frame, the press
  // and the arming) and this side writes it, so neither half is duplicated.
  // ⛔ NOT A MEMBER OF `SvgSurface`. IF-1 of table T-065 carries the picture and
  // nothing else, and that table is a contract.
  // ⚠️ Written only when it MOVED. A style write on every pointer move costs a
  // style recalculation for a value that is the same as the one already there,
  // and the pointer rests on one place for most of its moves.
  let pointerShapeShown = ''
  const showPointerShape = (shape: PointerShape | null): void => {
    // ⛔ The empty string is how the element is given the shape BACK to the
    // host, which is what `null` means: IN-2 leaves a place it does not name
    // alone, and removing the declaration is what leaving it alone is.
    const spelling = shape ?? ''
    if (spelling === pointerShapeShown) return
    pointerShapeShown = spelling
    scheduleCanvas.style.cursor = spelling
  }

  const running = frameLoop(
    domSvgSurface(scheduleCanvas),
    chosen.document,
    nowEnvironment(),
    {
      surface: painting,
      language: displayLanguage(),
      // MK-13's second half. ⚠️ THE MEMBER IS OPTIONAL ON BOTH SIDES, so a
      // dropped line here would leave the name field unentered and nothing
      // would say so -- see `ScreenWiring.focusPropertyField`.
      /** @purity non-pure */
      focusPropertyField: (row) => focusPropertyFieldHeld?.(row),
      // ⛔⛔ HF-14's TWO HALVES WERE JOINED HERE AND ARE GONE (利用者の裁定
      // 2026-09-04). They carried an empty name field onto the screen and the
      // name settled in it back again, which that row asked for while it read
      // 「名前は空で立て、その場で打たせること」. The row now stands up on the
      // press and is named through `focusPropertyField` above, which is the road
      // 「改名と別の道を作ってはならない（MUST NOT）」 leaves as the only one.
      // FR-020's 「打ち込む文字」, joined here for the reason the bindings above
      // give: the surface is built before the loop, so neither side can name the
      // other directly. ⚠️ THE MEMBER IS OPTIONAL ON BOTH SIDES, so a dropped
      // line here would leave every answer reading as the empty string -- which
      // never matches, so the watermark would simply never be hidden.
      /** @purity semi-pure-b */
      readWatermarkUnlockAnswer: () => readWatermarkUnlockAnswerHeld?.() ?? '',
    },
    fileStore,
    showPointerShape,
    // IF-5 (CP-30). ⭐ ITS FIRST CALLER: the seam has been written since
    // CR-196 and nothing reached it until CR-281 gave IC-3 the clipboard.
    // ⚠️ `navigator.clipboard` and not a wider handle: CP-30 takes the one
    // member it uses, so a browser that has none hands `undefined` and the
    // seam answers `unsupported` rather than throwing (FR-028, MUST NOT).
    browserClipboard(globalThis.navigator?.clipboard),
    // OP-10 of table T-024a (MUST NOT). ⭐ `chosen.row` is BO-2's own answer,
    // narrowed here to the one bit that row asks about.
    chosen.row === 'BT-4',
    // IF-6 (CP-31). ⭐ ITS FIRST CALLER, for the reason CP-30's line above
    // gives: the unit was written and nothing reached it, so IO-4 of table
    // T-024 stood on FR-096's chooser and wrote nothing.
    // ⚠️ The document and nothing wider: `canvasRasterizer` calls
    // `createElement` on it and nothing else, which is what lets that unit be
    // tested where there is no browser.
    canvasRasterizer(document),
    // IF-8 (UF-47). ⭐ THE COUNTERPART THIS FILE OWED: BT-1 could READ an
    // embedded document and nothing could WRITE one, so IO-7 of table T-024
    // stood on FR-096's chooser and wrote nothing (D-173).
    appShellSource(),
  )
  loop = running

  // ⛔⛔ BO-5's FRAME RAN BEFORE THIS BINDING EXISTED, AND WHAT IT MEASURED WAS
  // THROWN AWAY (D-230). `frameLoop` runs table T-077's first frame inside its
  // own factory, and that frame is what fills the `App Header` and draws the
  // first row lattice -- so `onAppHeaderHeightPx` and `onRowControlsHeightPx`
  // both fire while `loop` is still null, and the `loop?.resize` each of them
  // ends with reaches nobody.
  // ⚠️ MEASURED ON THE SHIPPED BUILD AT 1920x1080, TEN COLD BROWSER PROCESSES:
  // BO-1 measured the header before anything was in it and got 13px, the drawn
  // header is 37px, and the corrected number reached the loop only when some
  // later happening read `nowEnvironment()` again -- 44ms to 1614ms afterwards,
  // with the whole `Row Title Tree` standing 24px too high until then and a
  // ninth row's 9px sliver inside the drawing area.
  // ⛔ FR-051 (MUST) IS WHY IT CANNOT BE MEASURED EARLIER: the height is the
  // environment's own, and an `App Header` with nothing in it is not the header
  // -- its parts carry their own boxes (measured: at a 12px text size the drawn
  // header is 24px of content where one line is 18px). So the first frame is
  // what settles BO-1's second measurement, and this is where its answer is
  // handed on.
  // ⛔⛔ AND NOT `resize`, WHICH WOULD ASK FOR THE FRAME INSTEAD OF RUNNING IT.
  // Measured, not reasoned about: handing these numbers to `resize` moved
  // nothing at all -- the frame it asks for is a `requestAnimationFrame`
  // callback, the environment ran it 44ms to 1614ms after this line in ten cold
  // browser processes, and the page held the picture drawn against the
  // unsettled header for the whole of that. `settleFirstFrameEnvironment` runs
  // it here, inside `boot`'s own task, so no other party ever sees it.
  // ⛔ NFR-010 IS NOT WIDENED. The member compares the five measurements
  // against the ones in force and runs nothing when none moved, so a startup
  // where the header measured the same twice costs one comparison.
  loop.settleFirstFrameEnvironment(nowEnvironment())

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
  // (`sessionOf`) carries the same STOP, and the note above says why this file
  // does not invent one.
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

  // FR-100 (MUST): unsaved edits are not lost to one mistaken press on the
  // tab. ⛔ THE WORDS ARE NOT OURS TO CHOOSE (MUST NOT) -- every current
  // browser ignores a string handed to this event and prints its own, so
  // `preventDefault` is the whole of what a page may say here and nothing is
  // read out of the dictionary. ⚠️ `returnValue` is set as well because the
  // older browsers of table T-003 gate the prompt on it rather than on
  // `preventDefault`; it is the same request twice, not a second warning.
  // ⛔ NOT A ROW OF TABLE T-234 (MUST NOT), and FR-100 says why: that table
  // holds the questions GRS itself words, and this one is the host's.
  window.addEventListener('beforeunload', (event) => {
    // FR-100 (MUST NOT): nothing is raised when nothing would be lost.
    if (loop?.hasUnsavedEdits() !== true) return
    event.preventDefault()
    event.returnValue = ''
  })

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
