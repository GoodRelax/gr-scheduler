// SingleHtmlShell: the page entry and the boot of table T-077; the only unit that touches the host.
// @unit      UF-47   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-25

import { chooseStartupDocument } from '../../use-case/choose-startup-document/choose-startup-document'
import { NOT_STORED_SCROLLBAR_SIZES } from './frame-loop'
import { browserClipboard } from '../browser-clipboard/browser-clipboard'
import { canvasRasterizer } from '../canvas-rasterizer/canvas-rasterizer'
import type { Document } from '../../entity/document-model/document/document'
import { installAgentApi } from '../../adapter/agent-api-endpoint/agent-api-endpoint'
import {
  documentFromJson,
  type AppShellSource,
} from '../../adapter/document-codec/document-codec'
import type {
  DisplayLanguage,
  ScreenSurface,
} from '../../adapter/screen-renderer/screen-renderer'
import { domInputSource } from '../dom-input-source/dom-input-source'
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
  GREATEST_KNOWN_SCHEMA_VERSION,
  FOCUS_ON_DOCUMENT_BODY,
  type FrameEnvironment,
  type FrameLoop,
  type FullScreenHost,
  type PointerShape,
  type StartupNoticeReason,
} from './frame-loop'
import startupTemplate from './startup-template.json'

const SCHEDULE_CANVAS_ROLE = 'Schedule Canvas'

const AT_WINDOW_ORIGIN = 'position:fixed;left:0;top:0;right:0;bottom:0;'

const SCROLLBAR_PROBE_PX = 100

// DEVIATION: spec says the person writes as user (ED-1); here the name is empty (DFC-560)
// TRAP: AG-6 tells writers apart by name alone, so a subscriber under an empty name is woken by the person's own lines.
const AUTHOR_NOT_HELD = ''

const EMBEDDED_DOCUMENT_ELEMENT_ID = 'embedded-document'

const EMBEDDED_DOCUMENT_ABSENT = 'null'

// WHY: taken once at boot: fetch(location.href) fails on file:// (LM-14), and the live DOM carries the drawn screen.
let deliveredAppShellHtml: string | null = null

/** @purity semi-pure-b */
function readDeliveredHtml(): string {
  const prologue = document.doctype === null ? '' : `<!DOCTYPE ${document.doctype.name}>\n`
  return `${prologue}${document.documentElement.outerHTML}\n`
}

// see FR-102, IR-1
// TRAP: the two attributes dom-screen-surface.ts draws; a field answers its T-016 row, an entrance
// its T-109 row, and nothing of the value is read, so no document contents reach the record.
const FOCUS_ROW_ATTRIBUTES: readonly string[] = ['data-field-row', 'data-icon']

/** @purity semi-pure-b */
function focusPositionOfPage(): string {
  const focused = document.activeElement
  if (focused === null) return FOCUS_ON_DOCUMENT_BODY
  for (const attribute of FOCUS_ROW_ATTRIBUTES) {
    const row = focused.getAttribute(attribute)
    if (row !== null && row !== '') return row
  }
  return FOCUS_ON_DOCUMENT_BODY
}

// see FR-071
/** @purity semi-pure-b */
function isPageFullScreen(): boolean {
  // TRAP: undefined, not null, where the Fullscreen API is absent; that must read as not full screen.
  return (document.fullscreenElement ?? null) !== null
}

// see FT-6, FT-1, CV-9
// WHY: Space presses a button on the key's release, so its click and change arrive after the frame keydown asked.
/** @purity non-pure */
function watchPageHappenings(loopOf: () => FrameLoop | null): void {
  document.addEventListener('fullscreenchange', () => loopOf()?.fullScreenChanged(isPageFullScreen()))
  window.addEventListener('keyup', () => loopOf()?.pressContinued())
  window.addEventListener('change', (event) => {
    if (isHostPickerValue(event.target)) loopOf()?.pressContinued()
  })
}

const HOST_PICKER_INPUT_TYPES: ReadonlySet<string> = new Set(['color', 'date'])

// see FT-1
// WHY: a value chosen in the host's own picker window arrives with no pointer or key event of the page.
/** @purity pure */
function isHostPickerValue(target: EventTarget | null): boolean {
  const type = (target as { readonly type?: unknown } | null)?.type
  return typeof type === 'string' && HOST_PICKER_INPUT_TYPES.has(type)
}

/** @purity non-pure */
function askFullScreenOf(call: (() => Promise<void> | undefined) | undefined): Promise<void> {
  if (typeof call !== 'function') return Promise.reject(new Error('the Fullscreen API is absent'))
  try {
    return Promise.resolve(call())
  } catch (error) {
    return Promise.reject(error)
  }
}

// see FR-071, UF-48
/** @purity non-pure */
function pageFullScreenHost(): FullScreenHost {
  const root = document.documentElement
  return {
    isFullScreen: isPageFullScreen,
    /** @purity non-pure */
    requestFullScreen: () => askFullScreenOf(root.requestFullscreen?.bind(root)),
    /** @purity non-pure */
    exitFullScreen: () => askFullScreenOf(document.exitFullscreen?.bind(document)),
  }
}

// see IF-8
/** @purity semi-pure-b */
function appShellSource(): AppShellSource {
  return {
    /** @purity semi-pure-b */
    async readAppShell() {
      const delivered = deliveredAppShellHtml
      if (delivered === null || delivered === '') {
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

const AGENT_API_IDENTIFIER = 'grSchedulerAgentApi'

// DEVIATION: spec says the caller declares its writer name (ED-2); here every caller is agent (DFC-560)
const AGENT_API_WRITER = 'agent'

// see BT-4, FR-027, FR-023
/** @purity semi-pure-a */
function startupTemplateDocument(): Document {
  // TRAP: pass the version although it always answers known; omitting it reports notCompared.
  const read = documentFromJson(
    JSON.stringify(startupTemplate),
    GREATEST_KNOWN_SCHEMA_VERSION,
  )
  if (!read.ok) {
    throw new Error(
      'the bundled startup template is not a GRS JSON document: ' +
        read.faults.map((one) => `${one.at} ${one.what}`).join('; '),
    )
  }
  return read.document
}

type StartupCandidates = Parameters<typeof chooseStartupDocument>[0]

type EmbeddedCandidate = StartupCandidates['embedded']

type StartupNoticeCode = ReturnType<typeof chooseStartupDocument>['notices'][number]['code']

const STARTUP_NOTICE_REASON: Readonly<Record<StartupNoticeCode, StartupNoticeReason>> = {
  embeddedUnreadable: 'RS-25',
  embeddedEntryCountNotOne: 'RS-15',
  handedUnreadable: 'RS-26',
}

// see BT-1, FR-088, FR-067
// STOP: spec does not decide running FR-023's validation over BT-1. Looked in FR-023, FR-067, OP-5, T-008 (PND-452)
/** @purity semi-pure-b */
function embeddedStartupDocument(): {
  readonly candidate: EmbeddedCandidate
  readonly refusal: StartupNoticeReason | null
  readonly clampedCount: number
  readonly unreadColumns: readonly string[]
} {
  // TRAP: CSS.escape, since an id may begin with a digit; querySelectorAll, since FR-067 needs the count.
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
  // TRAP: do not un-escape first: embeddedJson wrote JSON escapes, which the reader gives back.
  const read = documentFromJson(embedded, GREATEST_KNOWN_SCHEMA_VERSION)
  if (!read.ok) {
    return { candidate: { kind: 'unreadable' }, refusal: null, clampedCount: 0, unreadColumns: [] }
  }
  const refusal = noWorkingWeekdayReason(read.document)
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

// see FR-051, S-205
/** @purity non-pure */
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

// see FR-038
/** @purity semi-pure-b */
function displayLanguage(): DisplayLanguage {
  return startupDisplayLanguage()
}

const DROP_SURFACE: DropSurface = {
  /** @purity non-pure */
  addEventListener(type, listener, options): void {
    window.addEventListener(type, (event) => listener(event as unknown as DropEvent), options)
  },
}

// TRAP: bind(window): both pickers are window methods that lose their receiver when passed.
/** @purity semi-pure-b */
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

/** @purity semi-pure-b */
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

// see T-077
/** @purity non-pure */
function boot(): void {
  // TRAP: must stay the first statement; the lines below write the screen into the page IF-8 hands out.
  deliveredAppShellHtml = readDeliveredHtml()

  const scheduleCanvas = document.createElement('div')
  scheduleCanvas.dataset.role = SCHEDULE_CANVAS_ROLE
  scheduleCanvas.setAttribute('style', AT_WINDOW_ORIGIN)
  const screenParts = document.createElement('div')
  document.body.append(scheduleCanvas, screenParts)

  const scrollbarThickness = measuredScrollbarThickness()
  let appHeaderHeightPx = 0
  let rowControlsHeightPx = 0
  let loop: FrameLoop | null = null
  const nowEnvironment = (): FrameEnvironment =>
    environmentOf(appHeaderHeightPx, scrollbarThickness, rowControlsHeightPx)

  // TRAP: read before BO-2: readTheme is asked while the surface factory runs, before chosen exists,
  // and reading chosen there throws a ReferenceError that stops the whole boot.
  const template = startupTemplateDocument()

  let themeDocument: Document = template

  /** @purity semi-pure-b */
  function heldTheme(): ScreenTheme {
    const held = loop === null ? themeDocument : loop.document()
    return {
      preference: held.documentSettings.themePreference,
      hue: held.schedule.project.themeHue,
    }
  }

  let pageGroundWritten = ''

  /** @purity non-pure */
  function paintPageGround(): void {
    const written = pageGroundStyle(heldTheme())
    if (written === pageGroundWritten) return
    pageGroundWritten = written
    document.documentElement.setAttribute('style', written)
  }

  let documentLanguageWritten = ''

  /** @purity non-pure */
  function nameDocumentLanguage(language: string): void {
    if (language === documentLanguageWritten) return
    documentLanguageWritten = language
    document.documentElement.setAttribute('lang', language)
  }

  const UNTITLED_TAB_HEADING = 'Untitled'

  // TRAP: null, not '': a sentinel that could be a heading leaves that document with the build's own tab heading.
  let browserTabHeadingWritten: string | null = null

  // WHY: here, not in the renderer, whose redraw stops during an in-place edit, when the name is typed.
  /** @purity non-pure */
  function nameBrowserTab(documentTitle: string | null): void {
    const heading = documentTitle ?? UNTITLED_TAB_HEADING
    if (heading === browserTabHeadingWritten) return
    browserTabHeadingWritten = heading
    document.title = heading
  }

  paintPageGround()

  let focusPropertyFieldHeld: ((row: string) => boolean) | null = null

  let readWatermarkUnlockAnswerHeld: (() => string) | null = null

  const screenSurface = domScreenSurface({
    host: document,
    mount: screenParts,
    readAuthor: () => AUTHOR_NOT_HELD,
    readClockMs: () => Date.now(),
    readTheme: heldTheme,
    /** @purity non-pure */
    holdFocusPropertyField: (focus) => {
      focusPropertyFieldHeld = focus
    },
    /** @purity non-pure */
    holdReadWatermarkUnlockAnswer: (read) => {
      readWatermarkUnlockAnswerHeld = read
    },
    /** @purity non-pure */
    onRowControlsHeightPx: (heightPx) => {
      rowControlsHeightPx = heightPx
      loop?.resize(nowEnvironment())
    },
    /** @purity non-pure */
    onAppHeaderHeightPx: (heightPx) => {
      appHeaderHeightPx = heightPx
      loop?.resize(nowEnvironment())
    },
  })

  // TRAP: build before BO-2: until its drop listeners exist, a dropped file navigates away (OP-4).
  const fileStore = fileSystemAccessFileStore(fileSystemAccessEnvironment())

  const embedded = embeddedStartupDocument()
  const chosen = chooseStartupDocument({
    embedded: embedded.candidate,
    handed: { kind: 'none' },
    template,
  })
  themeDocument = chosen.document
  paintPageGround()

  // TRAP: when BT-2 gains a producer, its file (CHN-1, untrusted) needs FR-088's gate too.

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
  let pointerShapeShown = ''
  const showPointerShape = (shape: PointerShape | null): void => {
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
      // TRAP: both members are optional on both sides, so a dropped line fails silently (FR-020's watermark never hides).
      /** @purity non-pure */
      focusPropertyField: (row) => focusPropertyFieldHeld?.(row),
      /** @purity semi-pure-b */
      readWatermarkUnlockAnswer: () => readWatermarkUnlockAnswerHeld?.() ?? '',
      /** @purity semi-pure-b */
      readFocusPosition: focusPositionOfPage,
    },
    fileStore,
    showPointerShape,
    browserClipboard(globalThis.navigator?.clipboard),
    chosen.row === 'BT-4',
    canvasRasterizer(document),
    appShellSource(),
    template,
    pageFullScreenHost(),
  )
  loop = running
  running.fullScreenChanged(isPageFullScreen())

  // TRAP: run the frame, not resize(): a scheduled animation frame lands late and draws against the unmeasured header.
  loop.settleFirstFrameEnvironment(nowEnvironment())

  for (const notice of chosen.notices) {
    running.raiseStartupNotice(STARTUP_NOTICE_REASON[notice.code])
  }
  if (embedded.refusal !== null) running.raiseStartupNotice(embedded.refusal)
  if (chosen.row === 'BT-1' && embedded.clampedCount > 0) {
    running.raiseStartupNotice('RS-51', embedded.clampedCount)
  }
  // DEVIATION: spec says unread columns ask whether to go on (FR-073, U-61); here only RS-48 is told (DFC-561)
  if (chosen.row === 'BT-1' && embedded.unreadColumns.length > 0) {
    running.raiseStartupNotice('RS-48')
  }

  const host = globalThis as unknown as Record<string, unknown>
  running.watchAgentApiEnabling((isEnabled) => {
    if (!isEnabled) {
      delete host[AGENT_API_IDENTIFIER]
      return
    }
    host[AGENT_API_IDENTIFIER] = installAgentApi({
      ...running.agentApiSeams(),
      writerName: AGENT_API_WRITER,
      schemaVersion: template.schemaVersion,
    })
  })

  const inputSource = domInputSource(
    window,
    (input) => loop?.isBrowserDefaultStopped(input) ?? false,
  )
  inputSource.watchInput((input) => loop?.receiveInput(input))

  window.addEventListener('resize', () => loop?.resize(nowEnvironment()))

  watchPageHappenings(() => loop)

  // WHY: returnValue too, because older browsers of table T-003 gate the prompt on it.
  window.addEventListener('beforeunload', (event) => {
    if (loop?.hasUnsavedEdits() !== true) return
    event.preventDefault()
    event.returnValue = ''
  })

  // WHY: a host can lay the page out at 0 x 0 and size it later without a resize event (NFR-011).
  new ResizeObserver(() => loop?.resize(nowEnvironment())).observe(document.documentElement)
}

boot()

export {}
