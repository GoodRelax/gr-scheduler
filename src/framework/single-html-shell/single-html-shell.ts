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
import type { WindowName } from '../../entity/document-model/screen-state/screen-state'
import { installAgentApi } from '../../adapter/agent-api-endpoint/agent-api-endpoint'
import {
  documentFromEmbeddedHtml,
  documentFromJson,
  type AppShellSource,
} from '../../adapter/document-codec/document-codec'
import {
  UNTITLED_DOCUMENT_TITLE,
  dialogueMessageFromInput,
  type DisplayLanguage,
  type ScreenSurface,
  type SearchFilterChange,
} from '../../adapter/screen-renderer/screen-renderer'
import { postDialogueMessage } from '../../use-case/post-dialogue-message/post-dialogue-message'
import { domInputSource, escapeKeyLockOf, type EscapeKeyLock } from '../dom-input-source/dom-input-source'
import {
  domScreenSurface,
  pageGroundStyle,
  showPointerShapeOver,
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
  readLocalMoment,
  startedDocumentOf,
  startupDisplayLanguage,
  startupThemePreference,
  GREATEST_KNOWN_SCHEMA_VERSION,
  FOCUS_ON_DOCUMENT_BODY,
  type FrameEnvironment,
  type FrameLoop,
  type FullScreenHost,
  type PointerShape,
  type StartupNoticeReason,
} from './frame-loop'
import { EMBEDDED_DOCUMENT_ELEMENT_ID, STARTUP_TEMPLATE_ELEMENT_ID } from './document-file-flow'
import emptyDocumentRoot from './empty-document.json'
import { openAgentApiRelayLink, type AgentApiRelayLink } from './agent-api-relay-link'

const SCHEDULE_CANVAS_ROLE = 'Schedule Canvas'

const AT_WINDOW_ORIGIN = 'position:fixed;left:0;top:0;right:0;bottom:0;'

const SCROLLBAR_PROBE_PX = 100

// DEVIATION: spec says the person writes as user (ED-1); here the name is empty (DFC-560)
// TRAP: AG-6 tells writers apart by name alone, so a subscriber under an empty name is woken by the person's own lines.
const AUTHOR_NOT_HELD = ''

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

type WindowReaders = Parameters<NonNullable<Parameters<typeof domScreenSurface>[0]['holdWindowReaders']>>[0]

// see SV-7, SV-14, IF-9
/** @purity pure */
function windowReadersOf(read: () => WindowReaders | null) {
  return {
    /** @purity semi-pure-b */
    readFocusedWindow: (): WindowName | null => read()?.readFocusedWindow() ?? null,
    /** @purity semi-pure-b */
    isFocusInPropertiesPanel: (): boolean => read()?.isFocusInPropertiesPanel() === true,
    /** @purity semi-pure-b */
    readSearchFilterChanges: (): readonly SearchFilterChange[] => read()?.readFilterChanges() ?? [],
    /** @purity semi-pure-b */
    readDelayDiagnosticsReportInput: () => read()?.readReportInput() ?? { word: null, changes: [] },
    /** @purity semi-pure-b */
    readResourceListInput: () => read()?.readResourceListInput() ?? { word: null, changes: [] },
  }
}

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

// see FT-6, FT-1, CV-9, OP-2
// WHY: Space presses a button on the key's release, so its click and change arrive after the frame keydown asked.
/** @purity non-pure */
function watchPageHappenings(loopOf: () => FrameLoop | null): void {
  document.addEventListener('fullscreenchange', () => {
    if (!isPageFullScreen()) pageEscapeKeyLock().unlock()
    loopOf()?.fullScreenChanged(isPageFullScreen())
  })
  window.addEventListener('keyup', () => loopOf()?.pressContinued())
  window.addEventListener('change', (event) => {
    if (isHostPickerValue(event.target)) loopOf()?.pressContinued()
  })
  watchFileDrags(loopOf)
}

// see OP-17, OP-2, FT-1
// TRAP: dragenter and dragleave fire again on every element a drag crosses, so only the depth falling to 0 is leaving the window.
/** @purity non-pure */
function watchFileDrags(loopOf: () => FrameLoop | null): void {
  let depth = 0
  window.addEventListener('dragenter', (event) => {
    if (!isFileDrop(event)) return
    depth += 1
    if (depth === 1) loopOf()?.fileDragMoved(true)
  })
  window.addEventListener('dragleave', (event) => {
    if (!isFileDrop(event) || depth === 0) return
    depth -= 1
    if (depth === 0) loopOf()?.fileDragMoved(false)
  })
  window.addEventListener('drop', (event) => {
    if (!isFileDrop(event)) return
    depth = 0
    loopOf()?.fileDragMoved(false)
    loopOf()?.fileDropped()
  })
}

// WHY: bubble phase, so the file store's capture listener has already held the file and stopped navigation.
/** @purity pure */
function isFileDrop(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') === true
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

/** @purity semi-pure-b */
function pageEscapeKeyLock(): EscapeKeyLock {
  return escapeKeyLockOf((navigator as { readonly keyboard?: unknown }).keyboard)
}

// see FR-071, UF-48
/** @purity non-pure */
function pageFullScreenHost(): FullScreenHost {
  const root = document.documentElement
  return {
    isFullScreen: isPageFullScreen,
    /** @purity non-pure */
    // TRAP: the lock is asked before requestFullscreen, which spends the press's user activation.
    requestFullScreen: () => {
      const escapeKey = pageEscapeKeyLock()
      escapeKey.lock()
      return askFullScreenOf(root.requestFullscreen?.bind(root)).catch((error: unknown) => {
        escapeKey.unlock()
        throw error
      })
    },
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
          omittedElementIds: [STARTUP_TEMPLATE_ELEMENT_ID],
        },
      }
    },
  }
}

const AGENT_API_IDENTIFIER = 'grSchedulerAgentApi'

// DEVIATION: spec says the caller declares its writer name (ED-2); here every caller is agent (DFC-560)
const AGENT_API_WRITER = 'agent'

/** @purity pure */
function shippedDocumentOf(read: ReturnType<typeof documentFromJson>, what: string): Document {
  if (!read.ok) {
    throw new Error(`${what} is not a GRS JSON document: ` + read.faults.map((one) => `${one.at} ${one.what}`).join('; '))
  }
  return read.document
}

// see BT-4, FR-027, FR-023
// WHY: null where the page carries no template container, as an exported .html does.
/** @purity semi-pure-b */
function startupTemplateDocument(): Document | null {
  // TRAP: pass the version although it always answers known; omitting it reports notCompared.
  const read = documentFromEmbeddedHtml(
    deliveredAppShellHtml ?? '',
    [STARTUP_TEMPLATE_ELEMENT_ID],
    GREATEST_KNOWN_SCHEMA_VERSION,
  )
  if (!read.ok && read.reason === 'entryCountNotOne' && read.entryCount === 0) return null
  if (!read.ok && read.reason === 'entryCountNotOne') throw new Error('the page carries the startup template twice')
  return shippedDocumentOf(read, 'the startup template the page carries')
}

// see FR-095, T-342, BK-4
/** @purity semi-pure-b */
function emptyDocument(): Document {
  const read = shippedDocumentOf(
    documentFromJson(JSON.stringify(emptyDocumentRoot), GREATEST_KNOWN_SCHEMA_VERSION),
    'the bundled empty document',
  )
  return startedDocumentOf(read, readLocalMoment())
}

interface ShippedDocuments {
  readonly template: Document
  readonly isTemplateShipped: boolean
  readonly startingAfresh: Document
}

/** @purity pure */
function isStartedFromTemplate(row: StartupRow, shipped: ShippedDocuments): boolean {
  return row === 'BT-4' && shipped.isTemplateShipped
}

// see BT-4, FR-067
// WHY: an exported .html carries no template container, so its last startup choice is the empty document.
/** @purity semi-pure-b */
function shippedDocuments(): ShippedDocuments {
  const startingAfresh = emptyDocument()
  const shipped = startupTemplateDocument()
  return { template: shipped ?? startingAfresh, isTemplateShipped: shipped !== null, startingAfresh }
}

// see T-050, RD-6
// WHY: the empty document carries no task group; this replacement lands it with the one task group every document holds.
/** @purity non-pure */
function holdWithItsTaskGroup(running: FrameLoop, chosen: Document, shipped: ShippedDocuments): void {
  if (chosen === shipped.startingAfresh) running.holdDocument({ row: 'RD-6', document: chosen })
}

type StartupCandidates = Parameters<typeof chooseStartupDocument>[0]

type StartupRow = ReturnType<typeof chooseStartupDocument>['row']

type EmbeddedCandidate = StartupCandidates['embedded']

type StartupNoticeCode = ReturnType<typeof chooseStartupDocument>['notices'][number]['code']

const STARTUP_NOTICE_REASON: Readonly<Record<StartupNoticeCode, StartupNoticeReason>> = {
  embeddedUnreadable: 'RS-25',
  embeddedEntryCountNotOne: 'RS-67',
  handedUnreadable: 'RS-26',
}

const NEWER_FORMAT_UNREAD_REASON: StartupNoticeReason = 'RS-48'

const NEWER_FORMAT_OPENED_REASON: StartupNoticeReason = 'RS-63'

const NEWER_FORMAT_REFUSED_REASON: StartupNoticeReason = 'RS-64'

// see FR-073, RS-48, RS-63
/** @purity pure */
function newerFormatReasonOf(unreadColumns: readonly string[]): StartupNoticeReason {
  return unreadColumns.length > 0 ? NEWER_FORMAT_UNREAD_REASON : NEWER_FORMAT_OPENED_REASON
}

interface StartupReadings {
  readonly clampedCount: number
  readonly unreadColumns: readonly string[]
  readonly isNewerFormat: boolean
  readonly isRefusedAsNewer: boolean
}

const NOTHING_READ: StartupReadings = { clampedCount: 0, unreadColumns: [], isNewerFormat: false, isRefusedAsNewer: false }

/** @purity pure */
function startupReadingsOf(read: ReturnType<typeof documentFromJson>): StartupReadings {
  if (!read.ok) return { ...NOTHING_READ, isRefusedAsNewer: read.reason === NEWER_FORMAT_REFUSED_REASON }
  return {
    clampedCount: read.clampedCount,
    unreadColumns: read.unreadColumns,
    isNewerFormat: read.formatVersion === 'newerThanKnown',
    isRefusedAsNewer: false,
  }
}

// see FR-073, RS-64
/** @purity pure */
function startupNoticeReasonOf(code: StartupNoticeCode, isRefusedAsNewer: boolean): StartupNoticeReason {
  return code === 'embeddedUnreadable' && isRefusedAsNewer ? NEWER_FORMAT_REFUSED_REASON : STARTUP_NOTICE_REASON[code]
}

// see BT-1, FR-088, FR-067
// STOP: spec does not decide running FR-023's validation over BT-1. Looked in FR-023, FR-067, OP-5, T-008 (PND-452)
/** @purity semi-pure-b */
function embeddedStartupDocument(): StartupReadings & {
  readonly candidate: EmbeddedCandidate
  readonly refusal: StartupNoticeReason | null
} {
  const read = documentFromEmbeddedHtml(
    deliveredAppShellHtml ?? '',
    [EMBEDDED_DOCUMENT_ELEMENT_ID],
    GREATEST_KNOWN_SCHEMA_VERSION,
  )
  if (!read.ok && read.reason === 'entryCountNotOne') {
    const candidate: EmbeddedCandidate =
      read.entryCount === 0 ? { kind: 'none' } : { kind: 'entryCountNotOne', entryCount: read.entryCount }
    return { candidate, refusal: null, ...NOTHING_READ }
  }
  const readings = startupReadingsOf(read)
  if (!read.ok) return { candidate: { kind: 'unreadable' }, refusal: null, ...readings }
  const refusal = noWorkingWeekdayReason(read.document)
  if (refusal !== null) {
    return { candidate: { kind: 'none' }, refusal, ...readings }
  }
  return {
    candidate: {
      kind: 'read',
      document: read.document,
    },
    refusal: null,
    ...readings,
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
function screenLanguage(): DisplayLanguage {
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
  taskGroupControlsHeightPx: number,
  commandPaletteBandPx: { readonly width: number; readonly height: number },
): FrameEnvironment {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    appHeaderHeight,
    scrollbarThickness,
    taskGroupControlsHeightPx,
    commandPaletteBandPx,
  }
}

// see T-077, FR-065, AG-12
/** @purity non-pure */
function publishAgentApiWhileEnabled(running: FrameLoop, schemaVersion: string): void {
  const host = globalThis as unknown as Record<string, unknown>
  let relayLink: AgentApiRelayLink | null = null
  running.watchAgentApiEnabling((isEnabled) => {
    relayLink?.close()
    relayLink = null
    if (!isEnabled) {
      delete host[AGENT_API_IDENTIFIER]
      return
    }
    const agentApi = installAgentApi({
      ...running.agentApiSeams(),
      writerName: AGENT_API_WRITER,
      schemaVersion,
    })
    host[AGENT_API_IDENTIFIER] = agentApi
    relayLink = openAgentApiRelayLink(agentApi, window.location, (address) => new WebSocket(address))
  })
}

// see SF-10, AG-11, FR-066
// TRAP: read before the view is shown: showing it forgets the settled utterance (dom-screen-surface.ts).
/** @purity non-pure */
function postSettledUtterance(surface: ScreenSurface, running: FrameLoop | null): void {
  const input = surface.readDialogueInput()
  const utterance = input === null ? null : dialogueMessageFromInput(input)
  if (utterance === null || running === null) return
  const seams = running.agentApiSeams()
  postDialogueMessage(utterance, seams.dialogueHolder, seams.dialogueAudience)
}

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
  let taskGroupControlsHeightPx = 0
  let commandPaletteBandPx = { width: 0, height: 0 }
  let loop: FrameLoop | null = null
  // WHY: the reset's question (QN-11) named what is lost; a host prompt would keep the old page (FR-153).
  let isLeavingForReset = false
  /** @purity non-pure */
  const reloadAfterReset = (): void => {
    isLeavingForReset = true
    window.location.reload()
  }
  const nowEnvironment = (): FrameEnvironment =>
    environmentOf(appHeaderHeightPx, scrollbarThickness, taskGroupControlsHeightPx, commandPaletteBandPx)

  const shipped = shippedDocuments()
  const template = shipped.template

  // TRAP: read before BO-2: readTheme is asked while the surface factory runs, before chosen exists,
  // and reading chosen there throws a ReferenceError that stops the whole boot.
  let themeDocument: Document = template

  const startupTheme = startupThemePreference()

  /** @purity semi-pure-b */
  function heldTheme(): ScreenTheme {
    const held = loop === null ? themeDocument : loop.document()
    return {
      preference: loop === null ? startupTheme : loop.themePreference(),
      hue: held.schedule.project.themeHue,
      monochrome: held.documentSettings.themeMonochrome,
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

  // TRAP: null, not '': a sentinel that could be a heading leaves that document with the build's own tab heading.
  let browserTabHeadingWritten: string | null = null

  // WHY: here, not in the renderer, whose redraw stops during an in-place edit, when the name is typed.
  /** @purity non-pure */
  function nameBrowserTab(documentTitle: string | null): void {
    const heading = documentTitle ?? UNTITLED_DOCUMENT_TITLE
    if (heading === browserTabHeadingWritten) return
    browserTabHeadingWritten = heading
    document.title = heading
  }

  paintPageGround()

  let focusPropertyFieldHeld: ((row: string) => boolean) | null = null

  let readWatermarkUnlockAnswerHeld: (() => string) | null = null
  let windowReadersHeld: WindowReaders | null = null

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
    holdWindowReaders: (readers) => void (windowReadersHeld = readers),
    /** @purity non-pure */
    onSearchWordTyped: () => loop?.pressContinued(),
    /** @purity non-pure */
    onTaskGroupControlsHeightPx: (heightPx) => {
      taskGroupControlsHeightPx = heightPx
      loop?.resize(nowEnvironment())
    },
    /** @purity non-pure */
    onAppHeaderHeightPx: (heightPx) => {
      appHeaderHeightPx = heightPx
      loop?.resize(nowEnvironment())
    },
    /** @purity non-pure */
    onCommandPaletteBandPx: (bandPx) => {
      commandPaletteBandPx = bandPx
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
      postSettledUtterance(screenSurface, loop)
      screenSurface.showScreenView(view)
    },
  }
  let pointerShapeShown = ''
  const showPointerShape = (shape: PointerShape | null): void => {
    const spelling = shape ?? ''
    if (spelling === pointerShapeShown) return
    pointerShapeShown = spelling
    scheduleCanvas.style.cursor = showPointerShapeOver(screenParts, spelling)
  }

  const running = frameLoop(
    domSvgSurface(scheduleCanvas),
    chosen.document,
    nowEnvironment(),
    {
      surface: painting,
      language: screenLanguage(),
      themePreference: startupTheme,
      // TRAP: both members are optional on both sides, so a dropped line fails silently (FR-020's watermark never hides).
      /** @purity non-pure */
      focusPropertyField: (row) => focusPropertyFieldHeld?.(row),
      /** @purity semi-pure-b */
      readWatermarkUnlockAnswer: () => readWatermarkUnlockAnswerHeld?.() ?? '',
      /** @purity semi-pure-b */
      readFocusPosition: focusPositionOfPage,
      ...windowReadersOf(() => windowReadersHeld),
    },
    fileStore,
    showPointerShape,
    browserClipboard(globalThis.navigator?.clipboard),
    isStartedFromTemplate(chosen.row, shipped),
    canvasRasterizer(document),
    appShellSource(),
    shipped.startingAfresh,
    pageFullScreenHost(),
    reloadAfterReset,
  )
  loop = running
  holdWithItsTaskGroup(running, chosen.document, shipped)
  running.fullScreenChanged(isPageFullScreen())

  // TRAP: run the frame, not resize(): a scheduled animation frame lands late and draws against the unmeasured header.
  loop.settleFirstFrameEnvironment(nowEnvironment())

  for (const notice of chosen.notices) {
    running.raiseStartupNotice(startupNoticeReasonOf(notice.code, embedded.isRefusedAsNewer))
  }
  if (embedded.refusal !== null) running.raiseStartupNotice(embedded.refusal)
  if (chosen.row === 'BT-1' && embedded.clampedCount > 0) {
    running.raiseStartupNotice('RS-51', embedded.clampedCount)
  }
  // DEVIATION: spec says a recount on reading is told (FR-012, RS-52); here BT-1 recounts untold (DFC-1816)
  // DEVIATION: spec says unread columns ask whether to go on (FR-073, U-61); here only RS-48 is told (DFC-561)
  if (chosen.row === 'BT-1' && embedded.isNewerFormat) running.raiseStartupNotice(newerFormatReasonOf(embedded.unreadColumns))

  publishAgentApiWhileEnabled(running, GREATEST_KNOWN_SCHEMA_VERSION)

  const inputSource = domInputSource(
    window,
    (input) => loop?.isBrowserDefaultStopped(input) ?? false,
  )
  inputSource.watchInput((input) => loop?.receiveInput(input))

  window.addEventListener('resize', () => loop?.resize(nowEnvironment()))

  watchPageHappenings(() => loop)

  // WHY: returnValue too, because older browsers of table T-003 gate the prompt on it.
  window.addEventListener('beforeunload', (event) => {
    if (isLeavingForReset || loop?.hasUnsavedEdits() !== true) return
    event.preventDefault()
    event.returnValue = ''
  })

  // WHY: a host can lay the page out at 0 x 0 and size it later without a resize event (NFR-011).
  new ResizeObserver(() => loop?.resize(nowEnvironment())).observe(document.documentElement)
}

boot()

export {}
