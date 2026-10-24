// The bench every frame-loop case runs on: recording fakes for every host seam the loop is handed,
// a pinned clock, a manual animation-frame pump, and a running hash of everything that happened.
//
// Only the public entry is used: src/framework/single-html-shell/frame-loop.ts (frameLoop and its
// exports). The fakes follow the shapes the unit tests give the loop (tests/unit/uf-48-input.test.ts,
// tests/contract/cr-610-file-flow-stage.ts), but record every call with its arguments.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { vi } from 'vitest'

import { CaseHash, canon, errorRecord, sha256 } from './canon'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any

export const KIT = process.env['COMPARATOR_KIT'] ?? ''
const INPUTS = join(KIT, 'data', 'inputs')

export const CLOCK_START = Date.UTC(2026, 9, 24, 9, 0, 0)

export interface Modifiers {
  readonly ctrl: boolean
  readonly shift: boolean
  readonly alt: boolean
  readonly meta: boolean
}
export const NO_MODS: Modifiers = { ctrl: false, shift: false, alt: false, meta: false }
export const mods = (spec: string): Modifiers => ({
  ctrl: spec.includes('c'),
  shift: spec.includes('s'),
  alt: spec.includes('a'),
  meta: spec.includes('m'),
})

export const keyInput = (key: string, modifiers: Modifiers = NO_MODS): Any => ({ kind: 'key', key, modifiers })
export const pointerInput = (
  phase: 'down' | 'move' | 'up' | 'lost',
  x: number,
  y: number,
  options: { button?: 'left' | 'middle' | 'right'; modifiers?: Modifiers; clickCount?: number } = {},
): Any => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: options.modifiers ?? NO_MODS,
  clickCount: options.clickCount ?? 1,
})
export const wheelInput = (x: number, y: number, notches: number, scroll: { x: number; y: number }, modifiers: Modifiers = NO_MODS): Any => ({
  kind: 'wheel',
  x,
  y,
  modifiers,
  notches,
  scrollPx: scroll,
})

export interface Part {
  readonly part: string
  readonly entry: string | null
  readonly format: string | null
  readonly taskGroupId: string | null
  readonly resourceUid: number | null
  readonly dividerPanel: string | null
  readonly noticeDismissKey: string | null
  readonly [extra: string]: unknown
}
export const part = (name: string, extra: Partial<Part> = {}): Part => ({
  part: name,
  entry: null,
  format: null,
  taskGroupId: null,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
  ...extra,
})

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const templateText = readFileSync(join(INPUTS, 'startup-template.json'), 'utf8')
const emptyText = readFileSync(join(INPUTS, 'empty-document.json'), 'utf8')
export const TEMPLATE_TEXT = templateText

export function templateDocument(): Any {
  return JSON.parse(templateText)
}
export function emptyDocument(): Any {
  return JSON.parse(emptyText)
}

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'
const GAMMA = '33333333-3333-4333-8333-333333333333'
const DELTA = '44444444-4444-4444-8444-444444444444'

function bareTask(uid: number, start: string | null, finish: string | null, name: string, extra: Record<string, unknown> = {}): Any {
  return {
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name,
    start,
    finish,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...extra,
  }
}

function groupRow(id: string, parentId: string | null, name: string, extra: Record<string, unknown> = {}): Any {
  return {
    id,
    parentId,
    name,
    derivedFromTaskUid: null,
    order: 0,
    treeState: 'auto',
    editPermission: null,
    color: null,
    minHeightPx: null,
    ...extra,
  }
}

// Two task groups, one Task each, no status date: the document tests/unit/uf-48-input.test.ts drives.
export function twoGroupDocument(): Any {
  const template = templateDocument()
  return {
    $schema: template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
      tasks: [
        bareTask(1, '2026-04-01T00:00:00', '2026-04-10T00:00:00', 'One'),
        bareTask(2, '2026-05-06T00:00:00', '2026-05-20T00:00:00', 'Two'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [groupRow(ALPHA, null, 'Alpha'), groupRow(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: 1, taskGroupId: ALPHA },
        { taskUid: 2, taskGroupId: BETA },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: template.documentSettings,
    documentStamp: template.documentStamp,
    changeLog: [],
  }
}

// Four task groups, started / stopped / finished / late Tasks, a milestone, links, a resource,
// a comment box and a highlight box: enough for drags, diagnostics and the panel.
export function richDocument(): Any {
  const base = twoGroupDocument()
  const tasks = [
    bareTask(1, '2026-04-01T08:00:00', '2026-04-10T17:00:00', 'Design', {
      actualStart: '2026-04-01T08:00:00', actualFinish: '2026-04-13T17:00:00', percentComplete: 100,
    }),
    bareTask(2, '2026-04-13T08:00:00', '2026-04-30T17:00:00', 'Build', {
      actualStart: '2026-04-15T08:00:00', percentComplete: 40,
      dependencies: [{ predecessorUid: 1, linkType: 1, linkLag: 0, lagFormat: 7, carry: {}, carryElements: [] }],
    }),
    bareTask(3, '2026-05-01T08:00:00', '2026-05-15T17:00:00', 'Test', {
      deadline: '2026-05-12T17:00:00',
      dependencies: [{ predecessorUid: 2, linkType: 1, linkLag: 480, lagFormat: 7, carry: {}, carryElements: [] }],
    }),
    bareTask(4, '2026-05-15T17:00:00', '2026-05-15T17:00:00', 'Release', {
      milestone: true,
      dependencies: [{ predecessorUid: 3, linkType: 1, linkLag: 0, lagFormat: 7, carry: {}, carryElements: [] }],
    }),
    bareTask(5, '2026-04-06T08:00:00', '2026-04-24T17:00:00', 'Docs', {
      actualStart: '2026-04-06T08:00:00', stop: '2026-04-10T17:00:00', resume: '2026-04-20T08:00:00', resumeValid: true, percentComplete: 20,
      dependencies: [{ predecessorUid: 1, linkType: 0, linkLag: 0, lagFormat: 7, carry: {}, carryElements: [] }],
    }),
    bareTask(6, '2026-05-18T08:00:00', '2026-06-05T17:00:00', 'Rollout', {
      dependencies: [{ predecessorUid: 4, linkType: 1, linkLag: 0, lagFormat: 7, carry: {}, carryElements: [] }],
    }),
    bareTask(7, null, null, 'Unplanned'),
  ]
  return {
    ...base,
    schedule: {
      ...base.schedule,
      project: { ...base.schedule.project, statusDate: '2026-04-22T17:00:00', uidHighWaterMark: 200 },
      tasks,
      resources: [{ uid: 101, name: 'Ann', resourceKind: 1, isCostResource: false, calendarUid: null, carry: {}, carryElements: [] }],
      assignments: [{ uid: 201, taskUid: 2, resourceUid: 101, carry: {}, carryElements: [] }],
      taskGroups: [
        groupRow(ALPHA, null, 'Alpha'),
        groupRow(BETA, ALPHA, 'Beta'),
        groupRow(GAMMA, null, 'Gamma', { order: 1 }),
        groupRow(DELTA, GAMMA, 'Delta', { treeState: 'collapsed' }),
      ],
      taskGroupMembers: [
        { taskUid: 1, taskGroupId: ALPHA },
        { taskUid: 2, taskGroupId: BETA },
        { taskUid: 3, taskGroupId: BETA },
        { taskUid: 4, taskGroupId: GAMMA },
        { taskUid: 5, taskGroupId: ALPHA },
        { taskUid: 6, taskGroupId: DELTA },
        { taskUid: 7, taskGroupId: GAMMA },
      ],
      taskVisuals: [
        { taskUid: 4, shapeKind: 'milestone', milestoneGlyph: 'diamond', fillColor: null, strokeColor: null, strokeWidthPx: null },
        { taskUid: 5, shapeKind: 'chevron', milestoneGlyph: null, fillColor: '#ff8800', strokeColor: null, strokeWidthPx: 2 },
      ],
      commentBoxes: [{
        id: 'c0000000-0000-4000-8000-000000000001', leaderShapeKind: 'calloutBox', text: 'Note', anchorDate: '2026-04-20T00:00:00',
        anchorTaskGroupId: ALPHA, bodyOffsetPx: { dx: 40, dy: -30 }, anchorBandFraction: 0.5, anchorTaskUid: null, anchorTaskFigure: null,
        anchorHighlightBoxId: null, anchorSnapPoint: null, strokeColor: null, strokeWidthPx: null, fillColor: null,
        fillTransparencyPercent: null, textColor: null, fontSizePx: null,
      }],
      highlightBoxes: [{
        id: 'h0000000-0000-4000-8000-000000000001', start: '2026-04-27T00:00:00', finish: '2026-05-08T00:00:00',
        topTaskGroupId: BETA, bottomTaskGroupId: GAMMA, strokeColor: null, cornerRadiusPx: null, strokeWidthPx: null,
        fillColor: null, fillTransparencyPercent: null,
      }],
    },
  }
}

// The template cut down to its first two top-level task groups and what hangs under them.
export function trimmedTemplateDocument(): Any {
  const doc = templateDocument()
  const s = doc.schedule
  const groups = s.taskGroups as Any[]
  const roots = groups.filter((g) => g.parentId === null).slice(0, 2).map((g) => g.id)
  const keep = new Set<string>(roots)
  for (let grew = true; grew; ) {
    grew = false
    for (const g of groups) if (g.parentId !== null && keep.has(g.parentId) && !keep.has(g.id)) { keep.add(g.id); grew = true }
  }
  const members = (s.taskGroupMembers as Any[]).filter((m) => keep.has(m.taskGroupId))
  const uids = new Set<number>(members.map((m) => m.taskUid))
  for (let grew = true; grew; ) {
    grew = false
    for (const t of s.tasks as Any[]) if (uids.has(t.uid) && t.parentTaskUid !== null && !uids.has(t.parentTaskUid)) { uids.add(t.parentTaskUid); grew = true }
  }
  const tasks = (s.tasks as Any[]).filter((t) => uids.has(t.uid)).map((t) => ({ ...t, dependencies: t.dependencies.filter((d: Any) => uids.has(d.predecessorUid)) }))
  return {
    ...doc,
    schedule: {
      ...s,
      tasks,
      taskGroups: groups.filter((g) => keep.has(g.id)),
      taskGroupMembers: members,
      taskVisuals: (s.taskVisuals as Any[]).filter((v) => uids.has(v.taskUid)),
      assignments: (s.assignments as Any[]).filter((a) => uids.has(a.taskUid)),
    },
  }
}

// The rich document with a fixed fit span, so pictures are laid on the span (FX-1, FX-2).
export function spanDocument(): Any {
  const doc = richDocument()
  return { ...doc, documentSettings: { ...doc.documentSettings, isFitSpanFixed: true, fitSpanStart: "2026-04-01T00:00:00", fitSpanFinish: "2026-06-10T00:00:00" } }
}

export const DOCUMENTS: Readonly<Record<string, () => Any>> = {
  span: spanDocument,
  two: twoGroupDocument,
  rich: richDocument,
  trimmed: trimmedTemplateDocument,
  template: templateDocument,
  empty: emptyDocument,
}

// ---------------------------------------------------------------------------
// Environments
// ---------------------------------------------------------------------------

export const SCREEN = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
export const WIDE = { width: 1600, height: 900, appHeaderHeight: 56, scrollbarThickness: 12, taskGroupControlsHeightPx: 24, commandPaletteBandPx: { width: 120, height: 400 } }
export const UNSETTLED = { width: 0, height: 0, appHeaderHeight: 0, scrollbarThickness: 0 }

// ---------------------------------------------------------------------------
// The bench
// ---------------------------------------------------------------------------

export interface BenchOptions {
  readonly doc?: string
  readonly document?: Any
  readonly env?: Any
  readonly language?: 'ja' | 'en'
  readonly theme?: 'light' | 'dark' | 'system'
  readonly screen?: boolean
  readonly optionalSeams?: boolean
  readonly files?: boolean
  readonly clipboard?: boolean
  readonly clipboardFault?: string
  readonly rasterizer?: boolean
  readonly rasterFault?: string
  readonly appShell?: boolean | 'fault'
  readonly emptyDocument?: boolean
  readonly fullScreen?: boolean
  readonly pageReload?: boolean
  readonly pointerShape?: boolean
  readonly startedFromTemplate?: boolean
  readonly storage?: Readonly<Record<string, string>>
}

export type FileReply = Any

const MARK_HEADS = new Set(["no-point", "no-row", "no-field", "select.missing", "scenario.threw", "threw", "raf.left"])

export class Bench {
  readonly log = new CaseHash()
  loop: Any = null
  partAt: (x: number, y: number) => Part | null = () => null
  readonly commits: Any[] = []
  readonly editNotices: Any[] = []
  readonly searchWords: (string | null)[] = []
  readonly filterChanges: Any[] = []
  readonly reportInputs: Any[] = []
  readonly resourceInputs: Any[] = []
  watermarkAnswer = ''
  focusPosition = 'body'
  focusedWindow: string | null = null
  focusInPanel = false
  focusAccepts: unknown = true
  readonly fileReads: FileReply[] = []
  openedState: Any = { kind: 'none' }
  readonly overwriteReplies: Any[] = []
  readonly chosenReplies: Any[] = []
  writeOverDestination: Any = { kind: 'empty' }
  restoreReply: Any = null
  fullScreenState = false
  private raf: ((time: number) => void)[] = []
  private uuid = 0
  private lastDocument: unknown = null
  private lastValues: unknown = null
  private storage = new Map<string, string>()
  lastView: Any = null
  agent: Any = null
  readonly watched: Any[] = []

  constructor(private readonly options: BenchOptions) {}

  readonly marks = new Map<string, number>()
  record(...entry: unknown[]): void {
    this.log.add(...entry)
    const head = String(entry[0])
    if (MARK_HEADS.has(head)) this.marks.set(head + (head === "threw" ? ":" + String(entry[1]) : ""), (this.marks.get(head) ?? 0) + 1)
  }

  install(): void {
    vi.useFakeTimers({ now: CLOCK_START, toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] })
    for (const [k, v] of Object.entries(this.options.storage ?? {})) this.storage.set(k, v)
    const storage = this.storage
    const self = this
    vi.stubGlobal('localStorage', {
      getItem(key: string): string | null {
        const value = storage.get(key) ?? null
        self.record('localStorage.getItem', key, value)
        return value
      },
      setItem(key: string, value: string): void {
        self.record('localStorage.setItem', key, value)
        storage.set(key, String(value))
      },
      removeItem(key: string): void {
        self.record('localStorage.removeItem', key)
        storage.delete(key)
      },
      get length(): number {
        return storage.size
      },
      key(at: number): string | null {
        return [...storage.keys()][at] ?? null
      },
      clear(): void {
        storage.clear()
      },
    })
    vi.stubGlobal('navigator', { language: 'en-US' })
    vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void): number => {
      this.raf.push(callback)
      this.record('raf.request', this.raf.length)
      return this.raf.length
    })
    vi.stubGlobal('cancelAnimationFrame', (handle: number): void => {
      this.record('raf.cancel', handle)
    })
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
      this.uuid += 1
      const id = `00000000-0000-4000-8000-${String(this.uuid).padStart(12, '0')}` as `${string}-${string}-${string}-${string}-${string}`
      this.record('crypto.randomUUID', id)
      return id
    })
    ;(globalThis as Any).__comparatorLog = this.log
  }

  uninstall(): void {
    ;(globalThis as Any).__comparatorLog = null
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }

  private svgSurface(): Any {
    return {
      showSvg: (svg: string) => this.record('svg.showSvg', sha256(svg), svg.length),
      showMarqueeOverlaySvg: (svg: string) => this.record('svg.showMarqueeOverlaySvg', svg),
    }
  }

  private screenWiring(): Any {
    const self = this
    const surface: Any = {
      showScreenView(view: Any): void {
        self.lastView = view
        self.record('screen.showScreenView', view)
      },
      readFieldCommit(): Any {
        const commit = self.commits.shift() ?? null
        self.record('screen.readFieldCommit', commit)
        return commit
      },
      readScreenPartAt(x: number, y: number): Any {
        const answer = self.partAt(x, y)
        self.record('screen.readScreenPartAt', x, y, answer)
        return answer
      },
    }
    const optional = this.options.optionalSeams !== false
    if (optional) {
      surface.readFieldEditNotices = (): Any => {
        const taken = self.editNotices.splice(0)
        self.record('screen.readFieldEditNotices', taken)
        return taken
      }
      surface.readSearchWord = (): string | null => {
        const word = self.searchWords.length > 0 ? (self.searchWords.shift() ?? null) : null
        self.record('screen.readSearchWord', word)
        return word
      }
    }
    const wiring: Any = { surface, language: this.options.language ?? 'en' }
    if (this.options.theme !== undefined) wiring.themePreference = this.options.theme
    if (optional) {
      wiring.focusPropertyField = (row: string): unknown => {
        self.record('wiring.focusPropertyField', row)
        return self.focusAccepts
      }
      wiring.readWatermarkUnlockAnswer = (): string => {
        self.record('wiring.readWatermarkUnlockAnswer', self.watermarkAnswer)
        return self.watermarkAnswer
      }
      wiring.readFocusPosition = (): string => {
        self.record('wiring.readFocusPosition', self.focusPosition)
        return self.focusPosition
      }
      wiring.readFocusedWindow = (): string | null => {
        self.record('wiring.readFocusedWindow', self.focusedWindow)
        return self.focusedWindow
      }
      wiring.isFocusInPropertiesPanel = (): boolean => {
        self.record('wiring.isFocusInPropertiesPanel', self.focusInPanel)
        return self.focusInPanel
      }
      wiring.readSearchFilterChanges = (): Any => {
        const taken = self.filterChanges.splice(0)
        self.record('wiring.readSearchFilterChanges', taken)
        return taken
      }
      wiring.readDelayDiagnosticsReportInput = (): Any => {
        const taken = self.reportInputs.shift() ?? { word: null, changes: [] }
        self.record('wiring.readDelayDiagnosticsReportInput', taken)
        return taken
      }
      wiring.readResourceListInput = (): Any => {
        const taken = self.resourceInputs.shift() ?? { word: null, changes: [] }
        self.record('wiring.readResourceListInput', taken)
        return taken
      }
    }
    return wiring
  }

  private fileStore(): Any {
    const self = this
    return {
      async readFileToOpen(route: string): Promise<Any> {
        const reply = self.fileReads.shift() ?? { ok: false, fault: { reason: 'canceled', what: 'no file queued' } }
        self.record('files.readFileToOpen', route, reply)
        return reply
      },
      adoptFileReadToOpen(): void {
        self.record('files.adoptFileReadToOpen')
      },
      forgetOpenedFile(): void {
        self.record('files.forgetOpenedFile')
        self.openedState = { kind: 'none' }
      },
      async readOpenedFileState(): Promise<Any> {
        self.record('files.readOpenedFileState', self.openedState)
        return self.openedState
      },
      async restoreOpenedFilePermission(): Promise<Any> {
        const reply = self.restoreReply ?? self.openedState
        self.record('files.restoreOpenedFilePermission', reply)
        return reply
      },
      async overwriteOpenedFile(bytes: Uint8Array): Promise<Any> {
        const reply = self.overwriteReplies.shift() ?? { ok: true, openedFile: self.openedState }
        self.record('files.overwriteOpenedFile', sha256(Buffer.from(bytes).toString('latin1')), bytes.length, reply)
        return reply
      },
      async writeChosenFile(write: Any): Promise<Any> {
        self.record('files.writeChosenFile', sha256(Buffer.from(write.bytes).toString('latin1')), write.bytes.length, write.suggestedFileName, write.extension, write.shouldBecomeOpenedFile)
        const allowed = await write.askToWriteOver(self.writeOverDestination)
        self.record('files.writeChosenFile.askToWriteOver', allowed)
        const reply = self.chosenReplies.shift() ?? { ok: true, openedFile: write.shouldBecomeOpenedFile ? { kind: 'writable', fileName: write.suggestedFileName } : self.openedState }
        if (reply.ok && write.shouldBecomeOpenedFile) self.openedState = reply.openedFile
        self.record('files.writeChosenFile.reply', reply)
        return reply
      },
      downloadFile(fileName: string, bytes: Uint8Array): void {
        self.record('files.downloadFile', fileName, sha256(Buffer.from(bytes).toString('latin1')), bytes.length)
      },
    }
  }

  build(): void {
    this.install()
    const o = this.options
    const document = o.document ?? DOCUMENTS[o.doc ?? 'two']?.()
    const env = o.env ?? SCREEN
    const self = this
    const screen = o.screen === false ? undefined : this.screenWiring()
    const files = o.files === false ? undefined : this.fileStore()
    const showPointerShape = o.pointerShape === false ? undefined : (shape: Any) => this.record('pointerShape', shape)
    const clipboard = o.clipboard === false ? undefined : {
      async writeClipboardContent(content: Any): Promise<Any> {
        self.record('clipboard.write', content)
        return o.clipboardFault === undefined ? { ok: true } : { ok: false, fault: o.clipboardFault }
      },
    }
    const rasterizer = o.rasterizer === false ? undefined : {
      async rasterizePng(svg: string, size: Any): Promise<Any> {
        self.record('rasterizer.rasterizePng', sha256(svg), size)
        return o.rasterFault === undefined ? { ok: true, pngBytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) } : { ok: false, fault: { reason: o.rasterFault, what: 'fake' } }
      },
    }
    const appShell = o.appShell === false ? undefined : {
      async readAppShell(): Promise<Any> {
        self.record('appShell.readAppShell')
        if (o.appShell === 'fault') return { ok: false, what: 'no shell' }
        return {
          ok: true,
          appShell: {
            html: '<!doctype html><html><head><title>GRS</title></head><body><script id="embedded-document" type="application/json"></script><script id="grs-startup-template" type="application/json">{}</script></body></html>',
            embeddedDocumentElementId: 'embedded-document',
            omittedElementIds: ['grs-startup-template'],
          },
        }
      },
    }
    const fullScreen = o.fullScreen === false ? undefined : {
      isFullScreen: (): boolean => {
        self.record('fullScreen.isFullScreen', self.fullScreenState)
        return self.fullScreenState
      },
      requestFullScreen: async (): Promise<void> => {
        self.record('fullScreen.request')
        self.fullScreenState = true
      },
      exitFullScreen: async (): Promise<void> => {
        self.record('fullScreen.exit')
        self.fullScreenState = false
      },
    }
    const pageReload = o.pageReload === false ? undefined : () => this.record('pageReload')
    const empty = o.emptyDocument === false ? undefined : emptyDocument()
    this.record('build', o)
    this.call('frameLoop', () => {
      this.loop = this.frameLoopFn(
        this.svgSurface(), document, env, screen, files, showPointerShape, clipboard,
        o.startedFromTemplate ?? false, rasterizer, appShell, empty, fullScreen, pageReload,
      )
    })
  }

  frameLoopFn: Any = null

  call<T>(name: string, run: () => T): T | undefined {
    try {
      const value = run()
      this.record('return', name, value instanceof Promise ? '$promise' : value)
      return value
    } catch (error) {
      this.record('threw', name, errorRecord(error))
      return undefined
    }
  }

  async callAsync<T>(name: string, run: () => Promise<T>): Promise<T | undefined> {
    try {
      const value = await run()
      this.record('return', name, value)
      return value
    } catch (error) {
      this.record('threw', name, errorRecord(error))
      return undefined
    }
  }

  // Runs whatever the loop asked an animation frame for, the microtasks and the zero-delay timers,
  // until nothing more is owed (bounded, so a loop that keeps asking ends the case).
  async flush(advanceMs = 0): Promise<void> {
    await this.settle()
    if (advanceMs > 0) {
      await vi.advanceTimersByTimeAsync(advanceMs)
      this.record('clock.advanced', advanceMs)
      await this.settle()
    }
    this.snapshot()
  }

  private async settle(): Promise<void> {
    for (let turn = 0; turn < 12; turn += 1) {
      for (let micro = 0; micro < 6; micro += 1) await Promise.resolve()
      await vi.advanceTimersByTimeAsync(0)
      if (this.raf.length === 0) break
      const callbacks = this.raf.splice(0)
      this.record('raf.run', callbacks.length)
      for (const callback of callbacks) {
        try {
          callback(Date.now())
        } catch (error) {
          this.record('threw', 'raf', errorRecord(error))
        }
      }
    }
    if (this.raf.length > 0) {
      this.record('raf.left', this.raf.length)
      // WHY: kept, not dropped: a loop that asks every frame (edge scroll) goes on at the next flush, after time passed.
    }
  }

  snapshot(): void {
    const loop = this.loop
    if (loop === null) return
    const document = safe(() => loop.document())
    if (document !== this.lastDocument) {
      this.lastDocument = document
      this.record('state.document', sha256(canon(document)))
    }
    const values = safe(() => loop.current())
    if (values !== this.lastValues) {
      this.lastValues = values
      this.record('state.current', values === null ? null : sha256(canon(values)))
    }
    this.record('state.flags', safe(() => loop.hasUnsavedEdits()), safe(() => loop.themePreference()))
  }

  // One human input, asked first whether the browser default stops (as the shell asks), then received.
  input(input: Any): void {
    this.record('step.input', input)
    this.call('isBrowserDefaultStopped', () => this.loop.isBrowserDefaultStopped(input))
    this.call('receiveInput', () => this.loop.receiveInput(input))
  }

  async key(key: string, modifiers: Modifiers = NO_MODS): Promise<void> {
    this.input(keyInput(key, modifiers))
    await this.flush()
  }

  async click(x: number, y: number, on: Part | null = null, options: { modifiers?: Modifiers; clickCount?: number; button?: 'left' | 'middle' | 'right' } = {}): Promise<void> {
    this.partAt = () => on
    this.input(pointerInput('move', x, y, options))
    this.input(pointerInput('down', x, y, options))
    await this.flush()
    this.input(pointerInput('up', x, y, options))
    await this.flush()
  }

  async drag(from: { x: number; y: number }, to: { x: number; y: number }, options: { modifiers?: Modifiers; steps?: number; on?: Part | null; onAt?: (x: number, y: number) => Part | null; end?: 'up' | 'lost' | 'esc' } = {}): Promise<void> {
    const steps = options.steps ?? 3
    this.partAt = options.onAt ?? (() => options.on ?? null)
    const m = { modifiers: options.modifiers ?? NO_MODS }
    this.input(pointerInput('move', from.x, from.y, m))
    this.input(pointerInput('down', from.x, from.y, m))
    await this.flush()
    for (let step = 1; step <= steps; step += 1) {
      const x = from.x + ((to.x - from.x) * step) / steps
      const y = from.y + ((to.y - from.y) * step) / steps
      this.input(pointerInput('move', Math.round(x * 100) / 100, Math.round(y * 100) / 100, m))
      await this.flush()
    }
    if (options.end === 'esc') {
      this.input(keyInput('Esc'))
      await this.flush()
      this.input(pointerInput('up', to.x, to.y, m))
    } else {
      this.input(pointerInput(options.end ?? 'up', to.x, to.y, m))
    }
    await this.flush()
  }

  async wheel(x: number, y: number, notches: number, scroll: { x: number; y: number }, modifiers: Modifiers = NO_MODS, on: Part | null = null): Promise<void> {
    this.partAt = () => on
    this.input(wheelInput(x, y, notches, scroll, modifiers))
    await this.flush()
  }

  async entry(entry: string, surface: string, extra: Partial<Part> = {}, at = { x: 900, y: 300 }): Promise<void> {
    await this.click(at.x, at.y, part(surface, { entry, ...extra }))
  }

  values(): Any {
    return safe(() => this.loop.current())
  }

  // Points derived from the frame the loop drew: bar bodies, ends and markers of each Task.
  barPoints(): Any[] {
    const values = this.values()
    if (values === null || values === undefined) return []
    const out: Any[] = []
    for (const task of values.geometry.tasks as Any[]) {
      for (const [figure, bar] of [['plan', task.plan], ['actual', task.actual], ['milestone', task.milestoneFigure]] as const) {
        if (bar === null || bar === undefined || !Array.isArray(bar.points) || bar.points.length === 0) continue
        const xs = bar.points.map((p: Any) => p.x)
        const ys = bar.points.map((p: Any) => p.y)
        const left = Math.min(...xs)
        const right = Math.max(...xs)
        const top = Math.min(...ys)
        const bottom = Math.max(...ys)
        const y = (top + bottom) / 2
        out.push({ uid: task.taskUid, figure, where: 'middle', x: (left + right) / 2, y })
        out.push({ uid: task.taskUid, figure, where: 'left', x: left + 1, y })
        out.push({ uid: task.taskUid, figure, where: 'right', x: right - 1, y })
      }
      if (task.marker !== null && task.marker !== undefined) out.push({ uid: task.taskUid, figure: 'marker', where: 'center', x: task.marker.center.x, y: task.marker.center.y })
      if (task.label !== null && task.label !== undefined) out.push({ uid: task.taskUid, figure: 'label', where: 'center', x: task.label.x + task.label.width / 2, y: task.label.y + task.label.height / 2 })
    }
    return out
  }

  boxPoints(): Any[] {
    const values = this.values()
    if (values === null || values === undefined) return []
    const out: Any[] = []
    for (const box of (values.geometry.commentBoxes ?? []) as Any[]) {
      const b = box.body
      out.push({ kind: 'comment', id: box.id, where: 'body', x: b.x + b.width / 2, y: b.y + b.height / 2 })
      out.push({ kind: 'comment', id: box.id, where: 'body-edge', x: b.x + 1, y: b.y + b.height / 2 })
      out.push({ kind: 'comment', id: box.id, where: 'anchor', x: box.anchor.x, y: box.anchor.y })
    }
    for (const box of (values.geometry.highlightBoxes ?? []) as Any[]) {
      const b = box.box
      out.push({ kind: 'highlight', id: box.id, where: 'center', x: b.x + b.width / 2, y: b.y + b.height / 2 })
      out.push({ kind: 'highlight', id: box.id, where: 'left', x: b.x + 1, y: b.y + b.height / 2 })
      out.push({ kind: 'highlight', id: box.id, where: 'top', x: b.x + b.width / 2, y: b.y + 1 })
      out.push({ kind: 'highlight', id: box.id, where: 'corner', x: b.x + b.width - 1, y: b.y + b.height - 1 })
    }
    for (const link of (values.geometry.dependencies ?? []) as Any[]) {
      const points = (link.drawnPoints ?? link.points ?? []) as Any[]
      if (points.length < 2) continue
      const k = Math.floor((points.length - 1) / 2)
      const a = points[k]
      const c = points[k + 1]
      out.push({ kind: 'link', id: `${link.predecessorUid}-${link.successorUid}`, where: 'middle', x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 })
    }
    return out
  }

  rowPoints(): Any[] {
    const values = this.values()
    if (values === null || values === undefined) return []
    const panel = values.regions.taskGroupPanel
    return (values.layout.taskGroups as Any[]).map((row) => ({
      taskGroupId: row.taskGroupId ?? row.id,
      x: panel.x + Math.min(40, panel.width / 2),
      y: (row.y ?? row.top ?? 0) + (row.height ?? 0) / 2,
    }))
  }

  installAgentApi(install: Any): void {
    this.agent = this.call('installAgentApi', () => install({ ...this.loop.agentApiSeams(), writerName: 'agent', schemaVersion: '2026-10-19T00:35:37Z' }))
  }

  finish(): string {
    this.snapshot()
    return this.log.digest()
  }
}

function safe<T>(run: () => T): T | { threw: string; message: string } {
  try {
    return run()
  } catch (error) {
    return errorRecord(error)
  }
}
