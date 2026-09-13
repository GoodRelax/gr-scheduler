// SingleHtmlShell -- public entry of this folder.
//
// @unit      UF-47   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-25
//
// The entry Vite reads, and the boot of table T-077 (there is no main.ts).
// PI-25 publishes nothing: what leaves this file leaves through the page.
//
// The wiring order follows from FR-051: the header's height and the scrollbar
// thickness are measured, so neither exists before its owner is built:
//
//   1. the scrollbar probe is measured (it needs no part of this tool),
//   2. BT-4 is read and the page's ground is painted,
//   3. DomScreenSurface (PI-38) is built, which mounts the header and hands its
//      measured height back BEFORE its factory returns,
//   4. only then is BO-1's `ScreenRegions` asked for.
//
// Step 3 shows nothing: PI-38 keeps its root hidden until the first
// `showScreenView`.
//
// Step 2 exists because both drawn layers are `position:fixed` over the page
// element, which is this unit's, and the environment's own ground follows the
// OS rather than `themePreference` (FR-041). Reading BT-4 there is not BO-2
// running early: BO-2 is the choosing.
//
// This file is the only one that may touch the host, so the input source
// (FT-1), the file store (IF-3), the clipboard, the rasterizer and the
// `Agent API`'s global name are built or placed here and handed to the loop,
// which holds the current values (LY-5 of table T-060). No copy is kept here:
// two holders of one store would be two answers to which file is open.
// An input arriving before the first frame is dropped by the loop, not here.
// index.html ships no embedding container, so the first export of an embedded
// document takes the writer's add-one branch.

import { chooseStartupDocument } from '../../use-case/choose-startup-document/choose-startup-document'
import { NOT_STORED_SCROLLBAR_SIZES } from './frame-loop'
import { browserClipboard } from '../browser-clipboard/browser-clipboard'
// Framework to Framework through the folder's public entry: LR-1 of table T-061
// forbids only outward arrows.
import { canvasRasterizer } from '../canvas-rasterizer/canvas-rasterizer'
import type { Document } from '../../entity/document-model/document/document'
// Only the entry: the wiring's shape is derived from its signature, so no name
// without a row in table T-064 crosses the folder.
import { installAgentApi } from '../../adapter/agent-api-endpoint/agent-api-endpoint'
// `AppShellReading` is not imported: PI-20 of table T-064 does not publish it
// (check 26b), so the answer below is typed by the seam's own member.
import {
  documentFromJson,
  type AppShellSource,
} from '../../adapter/document-codec/document-codec'
import type {
  DisplayLanguage,
  ScreenSurface,
} from '../../adapter/screen-renderer/screen-renderer'
import { domInputSource } from '../dom-input-source/dom-input-source'
// The page ground's colour is resolved there (table T-236) and written here, the
// one unit that may touch the page element.
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
  // FR-073. Derived in frame-loop.ts from startup-template.json, not typed here.
  GREATEST_KNOWN_SCHEMA_VERSION,
  type FrameEnvironment,
  type FrameLoop,
  type PointerShape,
  type StartupNoticeReason,
} from './frame-loop'
import startupTemplate from './startup-template.json'

/**
 * U-32's settled name, spelled as `_assets/tbl-glossary.md` spells it (rule 03
 * section 1) -- the spelling DomScreenSurface writes for its parts too.
 */
const SCHEDULE_CANVAS_ROLE = 'Schedule Canvas'

/**
 * Both drawn layers stand at the window's origin: `ScreenRegions` (PI-35), the
 * SVG and every `PointerInput` coordinate share the window's frame, and a layer
 * in normal flow would be offset by the body's margin.
 */
const AT_WINDOW_ORIGIN = 'position:fixed;left:0;top:0;right:0;bottom:0;'

/**
 * Any box wider than a scrollbar answers the same, since the difference of two
 * widths is read. Named so it is not taken for one of table T-206's sizes.
 */
const SCROLLBAR_PROBE_PX = 100

/**
 * Who is speaking, for a line settled in the `Dialogue Field`.
 *
 * STOP -- not decided by the specification: nothing holds the reader's own
 * name. Looked in S-99a of table T-206 and AG-6 of table T-035. Empty means no
 * name is held, not a name invented here.
 * S-99a may not be borrowed: it names who OPENED the document (FR-086), which
 * is no evidence of who is speaking.
 * The cost: AG-6 tells writers apart by name alone, so a subscriber under an
 * equally empty name would be woken by the person's own lines. The one this
 * file installs subscribes as `AGENT_API_WRITER`, which is not empty. Table
 * T-229 does not settle this either: it governs `lastEditedBy`.
 */
const AUTHOR_NOT_HELD = ''

/**
 * BT-1 of table T-034: the `id` the embedded document is read out of.
 *
 * Not minted here: `app-shell-source.ts` carries the contract that fixes it.
 * Written here as well as handed across IF-8 (the writing seam) so the writer
 * aims at the element the reader opens.
 */
const EMBEDDED_DOCUMENT_ELEMENT_ID = 'embedded-document'

/**
 * What the container holds when nobody embedded a document: JSON `null`, the
 * contract's own default (`app-shell-source.ts`).
 *
 * Not an unreadable document: `documentFromJson` would refuse it, and FR-067's
 * telling would fire on every run of an untouched artifact.
 */
const EMBEDDED_DOCUMENT_ABSENT = 'null'

/**
 * The application as the host delivered it -- IF-8's one value.
 *
 * Taken at the head of `boot` and never again: a serialization of the live DOM
 * would carry the drawn screen and grow with every export of an export.
 * `fetch(location.href)` is not used: it fails on a `file://` page (LM-14).
 * Given up: byte-for-byte fidelity, since this is the parsed page serialized
 * again. Kept: a `<script>` element's text serializes verbatim, so CN-8's
 * `script-src` hash still matches.
 */
let deliveredAppShellHtml: string | null = null

/**
 * The page as it stands, with the doctype `outerHTML` leaves out -- a file
 * without it is parsed in quirks mode.
 *
 * @purity semi-pure-b
 */
function readDeliveredHtml(): string {
  const prologue = document.doctype === null ? '' : `<!DOCTYPE ${document.doctype.name}>\n`
  return `${prologue}${document.documentElement.outerHTML}\n`
}

/**
 * IF-8's implementation (table T-065).
 *
 * Answers from what `boot` took, never from the page again. Still a promise
 * because the seam is: another implementation might have to fetch.
 *
 * @purity semi-pure-b
 */
function appShellSource(): AppShellSource {
  return {
    /** @purity semi-pure-b */
    async readAppShell() {
      const delivered = deliveredAppShellHtml
      if (delivered === null || delivered === '') {
        // Reachable only if asked before `boot`; answered, not thrown (FR-028).
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
 * Where the `Agent API` appears while it is on: the name section 3 of
 * `_assets/tbl-glossary.md` fixes on `globalThis`. `installAgentApi` does not
 * place it, so the placing is this file's.
 */
const AGENT_API_IDENTIFIER = 'grSchedulerAgentApi'

/**
 * The name every write and utterance from the `Agent API` is recorded under.
 *
 * STOP -- ED-2 of table T-229 gives the name to the caller, but no member of
 * table T-107 lets a caller declare one, so every caller shares this one (LM-16
 * of table T-004). It is neither `user` (ED-1) nor `template` (ED-3), so AG-6
 * tells this writer from both.
 */
const AGENT_API_WRITER = 'agent'

/**
 * BT-4 of table T-034: the bundled template (FR-027), read as `GRS JSON`.
 * tools/generate_startup_template.py writes it; `npm run gen:check` catches drift.
 *
 * Read through `documentFromJson`, not asserted into shape (FR-023). A fault is
 * a build that shipped broken, with nobody to tell and nothing below BT-4 to
 * fall back to, so it throws.
 *
 * @purity semi-pure-a
 */
function startupTemplateDocument(): Document {
  // The version is passed although it always answers `known` (the template's
  // own `schemaVersion` is the greatest known): omitting it reports `notCompared`.
  const read = documentFromJson(
    JSON.stringify(startupTemplate),
    GREATEST_KNOWN_SCHEMA_VERSION,
  )
  // `read.clampedCount` is dropped: the template is bundled, so an out-of-range
  // value is a broken build, and `RS-51` tells a person about THEIR file. The
  // clamp itself still ran.
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
 * Which row of table T-233 each BO-2 notice is told on; a code added on UF-23's
 * side fails to compile here.
 *
 * `embeddedEntryCountNotOne` falls to `RS-15` (FR-076): table T-233 has no row
 * for it, and RS-4 / RS-11 .. RS-13 belong to OP-12's dispatch, which BT-2 has
 * not been through.
 */
const STARTUP_NOTICE_REASON: Readonly<Record<StartupNoticeCode, StartupNoticeReason>> = {
  embeddedUnreadable: 'RS-25',
  embeddedEntryCountNotOne: 'RS-15',
  handedUnreadable: 'RS-26',
}

/**
 * BT-1 of table T-034: the embedded document, with FR-088's gate held before it
 * can win and become the current document.
 *
 * Zero containers is `none`: index.html ships none, so that is an ordinary run.
 * Two or more descends with a telling, as the writer refuses the same file
 * (`moreThanOneEntry` in `embedded-html-codec.ts`).
 * `noWorkingWeekdayReason` joins the invariant row to the notice row.
 *
 * STOP -- FR-023's validation (`validateImportedDocument`, PI-13) is not run
 * over BT-1: its refusals name table T-220 rows that no notice can word yet
 * (see the open-path STOP in `frame-loop.ts`).
 *
 * @purity semi-pure-b
 */
function embeddedStartupDocument(): {
  readonly candidate: EmbeddedCandidate
  /** FR-088's row when the gate turned BT-1 away, `null` otherwise. */
  readonly refusal: StartupNoticeReason | null
  /**
  /**
   * `RS-51`'s number: settings keys the read had to clamp, or `0`. Carried even
   * when BT-1 loses; the caller knows which rank won.
   */
  readonly clampedCount: number
  /**
  /**
   * FR-073: the columns of BT-1's text this build could not read, or empty.
   * Carried even when BT-1 loses, as `clampedCount` is.
   */
  readonly unreadColumns: readonly string[]
} {
  // `CSS.escape` because a CSS identifier may not begin with a digit and
  // `#2024-plan` throws; the writer (`embedded-html-codec.ts`) lets such ids
  // through, leaving the CSS grammar to this reader. Not `getElementById`:
  // FR-067 needs the COUNT to tell "not exactly one" from "none".
  const containers = document.querySelectorAll(`#${CSS.escape(EMBEDDED_DOCUMENT_ELEMENT_ID)}`)
  if (containers.length === 0) {
    return { candidate: { kind: 'none' }, refusal: null, clampedCount: 0, unreadColumns: [] }
  }
  if (containers.length > 1) {
    return {
      candidate: { kind: 'entryCountNotOne', entryCount: containers.length },
      refusal: null,
      clampedCount: 0,
      unreadColumns: [],
    }
  }
  const embedded = containers[0]?.textContent?.trim() ?? ''
  if (embedded === '' || embedded === EMBEDDED_DOCUMENT_ABSENT) {
    return { candidate: { kind: 'none' }, refusal: null, clampedCount: 0, unreadColumns: [] }
  }
  // Nothing is un-escaped first: `embeddedJson` wrote JSON (each `<` as its JSON
  // escape), so the reader gives the character back and a step here would
  // corrupt it.
  // The unread columns are carried so the caller can raise `RS-48` (FR-073).
  // FR-073's question on `U-61` is not asked on this road: every entrance table
  // T-109 puts on that surface (IC-95 .. IC-97) answers a merge's question, and
  // BO-2 has no document to merge against. Searched: FR-073, FR-022, table
  // T-103 `U-61`, table T-109, table T-032a, table T-034, table T-077 BO-2.
  // The columns themselves stay on the document `documentFromJson` returns.
  const read = documentFromJson(embedded, GREATEST_KNOWN_SCHEMA_VERSION)
  if (!read.ok) {
    return { candidate: { kind: 'unreadable' }, refusal: null, clampedCount: 0, unreadColumns: [] }
  }
  const refusal = noWorkingWeekdayReason(read.document)
  // FR-067: a refused BT-1 descends as `none`, and the telling travels beside it.
  if (refusal !== null) {
    return {
      candidate: { kind: 'none' },
      refusal,
      clampedCount: read.clampedCount,
      unreadColumns: read.unreadColumns,
    }
  }
  return {
    candidate: {
      kind: 'read',
      document: read.document,
    },
    refusal: null,
    clampedCount: read.clampedCount,
    unreadColumns: read.unreadColumns,
  }
}

/**
 * FR-051: half the environment's default scrollbar thickness, floored at S-205.
 *
 * Overlay scrollbars measure 0, and a band 0 thick cannot be pointed at or
 * grabbed, hence the floor. Halve first, then floor, so a thick default is still
 * halved. Measured once, at BO-1: the default does not change with the window.
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
 * FR-038: the stored choice (S-99), else the browser's language. The loop holds
 * the `localStorage` keys, so the answer is asked for rather than the keys typed
 * here again (R4).
 *
 * @purity semi-pure-b
 */
function displayLanguage(): DisplayLanguage {
  return startupDisplayLanguage()
}

/**
 * `DropSurface` of PI-28 on the window: OP-2 of table T-024a treats a drop as
 * one surface, and the window is the only one the whole app sits on.
 *
 * Cast because PI-28 declares the event as plain data so it runs under Node; the
 * store reads only `preventDefault`, `dataTransfer.types` and
 * `dataTransfer.items`, which a real drag event has.
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
 * `lib.dom` does not declare the two pickers, so they are read as unknown and
 * admitted only where the host has a function; `undefined` becomes LM-14's
 * `unavailable`. The keys are required even when the value is missing: an
 * absent key would read as a browser that has the API. `bind` is needed because
 * both are window methods that lose their receiver when passed.
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
 * What BO-1 settles before anything is drawn. The measured sizes differ between
 * machines and may not be settings (FR-051); the header's height comes from the
 * unit that drew the header.
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
  // Must stay the first statement: IF-8 answers with the application as
  // delivered, and the lines below start building a screen into the page.
  deliveredAppShellHtml = readDeliveredHtml()

  const scheduleCanvas = document.createElement('div')
  scheduleCanvas.dataset.role = SCHEDULE_CANVAS_ROLE
  scheduleCanvas.setAttribute('style', AT_WINDOW_ORIGIN)
  const screenParts = document.createElement('div')
  // The screen parts are drawn over the schedule, so they are appended after it.
  document.body.append(scheduleCanvas, screenParts)

  // ---- BO-1 ---------------------------------------------------------------
  const scrollbarThickness = measuredScrollbarThickness()
  let appHeaderHeightPx = 0
  // LF-3 of table T-221: not measurable at BO-1, since no row is drawn yet; the
  // surface reports it after the first panel, as it does the header's height.
  let rowControlsHeightPx = 0
  let loop: FrameLoop | null = null
  const nowEnvironment = (): FrameEnvironment =>
    environmentOf(appHeaderHeightPx, scrollbarThickness, rowControlsHeightPx)

  // BT-4 is read above BO-2 (the choosing, below) because `readTheme` is asked
  // while the surface factory runs, before `chosen` exists -- reading `chosen`
  // there throws a ReferenceError that stops the whole boot. The template carries
  // S-72's and S-73's defaults, so no pair is typed here.
  const template = startupTemplateDocument()

  /**
   * The document FR-041's two values are read off while there is no loop: BT-4
   * until BO-2 chooses, then BO-2's answer. Read only while `loop` is null.
   */
  let themeDocument: Document = template

  /**
   * FR-041: S-72 and S-73 as they stand when asked -- read at each call, since
   * both move while the page is open (IC-16).
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
   * FR-041: the ground on the page element, the one box behind the schedule;
   * both drawn layers are fixed over it, so a background on either would hide
   * what is under it. Written only when it changed: this runs every frame.
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
   * FR-038: the root element's `lang`, written here because the root element is
   * the bound document's, not the surface's. It rides on the drawing since table
   * T-078 names no trigger for a language. Written only when it changed.
   *
   * @purity non-pure
   */
  function nameDocumentLanguage(language: string): void {
    if (language === documentLanguageWritten) return
    documentLanguageWritten = language
    document.documentElement.setAttribute('lang', language)
  }

  /**
   * FR-035's tab heading for a document with no title. A constant, not a
   * dictionary key: FR-035 forbids switching it with the display language.
   */
  const UNTITLED_TAB_HEADING = 'Untitled'

  /**
   * What the tab already carries. `null` until the first frame, not `''`: a
   * sentinel that could be a heading would leave that document with the build's
   * own tab heading.
   */
  let browserTabHeadingWritten: string | null = null

  /**
   * FR-035: the tab's heading, from `ScreenView.appHeaderItems.documentTitle`
   * every frame, so a rename, undo, re-open or merge moves it with no trigger of
   * its own (NFR-010). Not in `dom-screen-surface.ts`, which may not reach for
   * `document.title`, and not on the renderer's side, whose redraw stops during
   * an in-place edit -- exactly when the name is being typed. Written only when
   * it changed.
   *
   * @purity non-pure
   */
  function nameBrowserTab(documentTitle: string | null): void {
    const heading = documentTitle ?? UNTITLED_TAB_HEADING
    if (heading === browserTabHeadingWritten) return
    browserTabHeadingWritten = heading
    document.title = heading
  }

  // First paint before anything is built: BO-1 holds the first frame back until
  // the size settles (NFR-011), and until then the page would show the OS colour.
  paintPageGround()

  /**
   * What the screen surface handed over for MK-13, or `null` until it has; filled
   * while the factory below runs.
   */
  let focusPropertyFieldHeld: ((row: string) => void) | null = null

  /**
   * The way to read U-60's masked field (FR-020), or `null` until handed over.
   * The answer itself is never held here (FR-020).
   */
  let readWatermarkUnlockAnswerHeld: (() => string) | null = null

  const screenSurface = domScreenSurface({
    host: document,
    mount: screenParts,
    readAuthor: () => AUTHOR_NOT_HELD,
    // The wall clock: AT-129 is a moment, not an elapsed time (R3.6).
    readClockMs: () => Date.now(),
    // FR-041: `ScreenView` carries no theme, so this is the one road. Asked while
    // this factory runs, so `heldTheme` may not depend on BO-2.
    readTheme: heldTheme,
    // MK-13: the field is the surface's, so it hands over the way to reach it.
    // Not on IF-9, whose supplies are all questions (`screen-surface.ts`).
    /** @purity non-pure */
    holdFocusPropertyField: (focus) => {
      focusPropertyFieldHeld = focus
    },
    // FR-020: the masked field is the surface's too; not on IF-9, as above.
    /** @purity non-pure */
    holdReadWatermarkUnlockAnswer: (read) => {
      readWatermarkUnlockAnswerHeld = read
    },
    // LF-3's row-control floor, taken like the header's height: HF-19 keeps the
    // number out of the manuscript, so only the side that drew the lattice knows it.
    /** @purity non-pure */
    onRowControlsHeightPx: (heightPx) => {
      rowControlsHeightPx = heightPx
      // FT-3 of table T-078: record, and let `resize` judge whether anything changed.
      loop?.resize(nowEnvironment())
    },
    /** @purity non-pure */
    onAppHeaderHeightPx: (heightPx) => {
      appHeaderHeightPx = heightPx
      // FT-3 of table T-078: record, and let `resize` judge whether it changed.
      // `loop` is null for the first TWO calls -- BO-1's measurement and BO-5's
      // frame inside `frameLoop`'s factory; `settleFirstFrameEnvironment` below
      // hands both on.
      loop?.resize(nowEnvironment())
    },
  })

  // ---- IF-3, BEFORE BO-2 --------------------------------------------------
  // IF-3 before BO-2 for its listeners: PI-28 makes the window a drop target on
  // construction, and without that a dropped file navigates away and discards
  // the document (OP-4 of table T-024a). They live as long as the page.
  const fileStore = fileSystemAccessFileStore(fileSystemAccessEnvironment())

  // ---- BO-2 ---------------------------------------------------------------
  // BO-2. BT-2 is `none`: its file comes from a chooser or a drop (CHN-1 of
  // table T-008), neither of which can have happened yet, and IF-3 has no member
  // for a file handed over at startup.
  const embedded = embeddedStartupDocument()
  const chosen = chooseStartupDocument({
    embedded: embedded.candidate,
    handed: { kind: 'none' },
    template,
  })
  // FR-041: BO-2 may have chosen a document with a different S-72 or S-73.
  themeDocument = chosen.document
  paintPageGround()

  // FR-088's gate: `embeddedStartupDocument` hands `none` for a refused BT-1, and
  // the telling is raised once the loop exists (table T-077). BT-4 is not gated:
  // it is bundled, and `npm run gen:check` catches a broken one. When BT-2 gains a
  // producer, its file (CHN-1, untrusted) needs this same gate.

  // No offer to restore a remembered file's permission at startup: FR-060 forbids it.

  // ---- BO-3, BO-4, BO-5 ---------------------------------------------------
  // BO-3 reads zoom and scroll off `documentSettings` (FR-024); BO-4 and BO-5 are
  // the first frame. IF-3 goes to the loop, which holds the document.
  //
  // FR-041 rides on the drawing, as table T-078 names no trigger for a theme: the
  // surface is wrapped rather than given a second watcher (NFR-010), and the
  // ground is painted before the frame it belongs to.
  const painting: ScreenSurface = {
    ...screenSurface,
    /** @purity non-pure */
    showScreenView: (view) => {
      paintPageGround()
      nameDocumentLanguage(view.language)
      nameBrowserTab(view.appHeaderItems.documentTitle)
      screenSurface.showScreenView(view)
    },
  }
  // IN-2 of table T-028: the loop decides the shape, this unit writes it on the
  // `Schedule Canvas` element. Not a member of `SvgSurface` (IF-1 carries the
  // picture only). Written only when it moved: a style write per pointer move
  // costs a style recalculation.
  let pointerShapeShown = ''
  const showPointerShape = (shape: PointerShape | null): void => {
    // The empty string hands the shape back to the host, which is what `null` means.
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
      // MK-13. Optional on both sides, so a dropped line here fails silently.
      /** @purity non-pure */
      focusPropertyField: (row) => focusPropertyFieldHeld?.(row),
      // FR-020. Optional on both sides too: a dropped line reads every answer as
      // '', which never matches, so the watermark would never be hidden.
      /** @purity semi-pure-b */
      readWatermarkUnlockAnswer: () => readWatermarkUnlockAnswerHeld?.() ?? '',
    },
    fileStore,
    showPointerShape,
    // IF-5 (CP-30). `navigator.clipboard` only: a browser without it hands
    // `undefined`, and the seam answers `unsupported` rather than throwing (FR-028).
    browserClipboard(globalThis.navigator?.clipboard),
    // OP-10 of table T-024a: whether BO-2 fell to the template.
    chosen.row === 'BT-4',
    // IF-6 (CP-31). The document and nothing wider: `canvasRasterizer` only calls
    // `createElement`, so that unit is testable without a browser.
    canvasRasterizer(document),
    // IF-8 (UF-47).
    appShellSource(),
    // FR-095's reset target: the template already read above, not a second
    // reading, which also keeps a broken bundle's `throw` at boot.
    template,
  )
  loop = running

  // BO-5's frame ran inside `frameLoop`'s factory while `loop` was null, so the
  // header and row-control heights it measured reached nobody. They are handed on
  // here and the frame is RUN, not asked for: `resize` would schedule a
  // `requestAnimationFrame` that landed 44 to 1614 ms later in ten cold browser
  // processes, leaving the first picture drawn against the unmeasured header.
  // Nothing runs when no measurement moved (NFR-010).
  loop.settleFirstFrameEnvironment(nowEnvironment())

  // FR-076: what BO-2 decided and could not tell. UF-23's notices first, then the
  // gate's, in table T-034's order.
  for (const notice of chosen.notices) {
    running.raiseStartupNotice(STARTUP_NOTICE_REASON[notice.code])
  }
  if (embedded.refusal !== null) running.raiseStartupNotice(embedded.refusal)
  // `RS-51` only when BT-1 actually won: a count from a rank that lost describes a
  // document nobody is looking at. BT-4 is never told (`startupTemplateDocument`).
  if (chosen.row === 'BT-1' && embedded.clampedCount > 0) {
    running.raiseStartupNotice('RS-51', embedded.clampedCount)
  }
  // `RS-48` (FR-073), only when BT-1 won, as above. No count: FR-073 asks for the
  // columns themselves, which `raiseStartupNotice` has nowhere to put.
  if (chosen.row === 'BT-1' && embedded.unreadColumns.length > 0) {
    running.raiseStartupNotice('RS-48')
  }

  // ---- FR-065 and FR-028: the public point --------------------------------
  //
  // `installAgentApi` does not place what it builds, so the shell places it under
  // the glossary's name when enabled and removes it when disabled. Removing the
  // name does not revoke a reference already handed out (FR-065).
  // The enabling is remembered per origin in `frame-loop.ts`, so the loop may
  // start enabled; the watcher is told the standing value as soon as it is set,
  // before any input can arrive.
  // `globalThis` is reached through one index: the host declares no such member.
  const host = globalThis as unknown as Record<string, unknown>
  running.watchAgentApiEnabling((isEnabled) => {
    if (!isEnabled) {
      delete host[AGENT_API_IDENTIFIER]
      return
    }
    host[AGENT_API_IDENTIFIER] = installAgentApi({
      // IF-7 and the seams of PI-8 and PI-16, all held by the loop (LY-5).
      ...running.agentApiSeams(),
      writerName: AGENT_API_WRITER,
      // AM-2 of table T-107, read off the bundled template (rule 03 section 1).
      schemaVersion: template.schemaVersion,
    })
  })

  // FT-1 of table T-078. MK-10's answer goes to the factory and happenings to the
  // watcher, since `InputWatcher` returns nothing. `unwatchInput` is never
  // called: the listeners live exactly as long as the page, and `boot` returns no
  // way to stop.
  const inputSource = domInputSource(
    window,
    (input) => loop?.isBrowserDefaultStopped(input) ?? false,
  )
  inputSource.watchInput((input) => loop?.receiveInput(input))

  // FT-3 of table T-078: the size is the host's value, not an input device's.
  window.addEventListener('resize', () => loop?.resize(nowEnvironment()))

  // FR-100: `preventDefault` is all a page may do here, since browsers ignore a
  // supplied string; `returnValue` too, because older browsers of table T-003
  // gate the prompt on it. Not a row of table T-234: the question is the host's.
  window.addEventListener('beforeunload', (event) => {
    if (loop?.hasUnsavedEdits() !== true) return
    event.preventDefault()
    event.returnValue = ''
  })

  // FT-3 watched a second way: a host can lay the page out at 0 x 0 and size it
  // later without a resize event (a pane hidden at load), and BO-1 would then hold
  // the first frame back for ever (NFR-011). `resize` returns without a frame
  // when nothing changed.
  new ResizeObserver(() => loop?.resize(nowEnvironment())).observe(document.documentElement)
}

boot()

export {}
