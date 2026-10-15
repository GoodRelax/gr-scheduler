// CR-740 spec-only stage: one shell with its surfaces swapped, a press on any T-109 entrance, and the empty ground of T-071 CA-1 (3).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Clipboard, ClipboardContent } from '../../src/adapter/clipboard-gateway/clipboard'
import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { SvgSurface } from '../../src/adapter/svg-renderer/svg-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
export const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))
export const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
export function wholeRow(table: string, id: string): string {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(found.cells.join(' ')).replace(/`/g, '')
}
export function surfaceOfEntrance(entry: string): string {
  const found = specTable('T-109').rows.find((one) => one.id === entry)
  if (found === undefined) throw new Error(`table T-109 has no row ${entry}`)
  return bare(found.cells[0] ?? '')
}

interface Template {
  readonly $schema: unknown
  readonly schemaVersion: unknown
  readonly schedule: { readonly project: object; readonly calendars: unknown }
  readonly documentSettings: object
  readonly documentStamp: unknown
}

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Template

export const GROUPS = [1, 2, 3, 4, 5, 6].map((n) => `4a000000-0000-4000-8000-00000000000${n}`)
export const ALPHA_UID = 1

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

// WHY: no actual start, so the task is not started -- FR-043 draws its Actual Operation Dummy and
// T-023d GA-18 puts its progress marker outside the end grab, the two figures CA-1 (3) names.
function notStartedTask(uid: number, name: string, start: number, finish: number): Task {
  return {
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name,
    start: day(start),
    finish: day(finish),
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  } as unknown as Task
}

export function stageDocument(): Document {
  const template = structuredClone(TEMPLATE)
  return {
    $schema: template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [notStartedTask(ALPHA_UID, 'Alpha', 8, 16)],
      resources: [],
      assignments: [],
      taskGroups: GROUPS.map((id, order) => ({
        id,
        parentId: null,
        name: `R${order + 1}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: [{ taskUid: ALPHA_UID, taskGroupId: GROUPS[2] }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      zoomX: 20 / SETTINGS_CONSTANTS.pxPerDayAt1x,
      stackDirection: 'down',
      scrollDate: '2026-04-01',
      scrollDayOffset: 0,
      scrollTaskGroupId: GROUPS[0],
      scrollGroupOffset: 0,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

export const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

export const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

export interface Point {
  readonly x: number
  readonly y: number
}

export interface SurfaceCall {
  readonly mouth: 'showSvg' | 'showMarqueeOverlaySvg'
  readonly svg: string
}

const globals = globalThis as unknown as { requestAnimationFrame?: (callback: (time: number) => void) => number }
const realRaf = globals.requestAnimationFrame
export function restoreAnimationFrame(): void {
  if (realRaf === undefined) delete globals.requestAnimationFrame
  else globals.requestAnimationFrame = realRaf
}

export interface StageOptions {
  readonly surface?: SvgSurface
}

// see S-100, T-207
/** @purity pure */
export function watermarkUnlockAnswer(): string {
  const row = specTable('T-207').rows.find((one) => one.id === 'S-100')
  return (row?.by['値'] ?? '').replace(/[`*]/g, '').trim()
}

// see T-103
/** @purity pure */
export function partNameOf(uid: string): string {
  const found = specTable('T-103').rows.find((one) => one.id === uid)
  if (found === undefined) throw new Error(`no UI part ${uid}`)
  return bare(found.cells[0] ?? '')
}

export interface Stage {
  readonly loop: FrameLoop
  readonly calls: SurfaceCall[]
  readonly records: string[]
  send(input: HumanInput): void
  press(entry: string): void
  pressOn(part: Readonly<Record<string, unknown>>): void
  beneathNow(): string
  overlayNow(): string
  framesRun(): number
  drain(): void
  ground(): readonly Point[]
  alphaDummyPoint(): Point
  alphaMarkerPoint(): Point
  taskGroupAreaPoint(share: number): Point
}

export function stage(options: StageOptions = {}): Stage {
  const waiting: ((time: number) => void)[] = []
  let ran = 0
  let handle = 0
  globals.requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) {
        ran += 1
        callback(turn)
      }
    }
  }
  const calls: SurfaceCall[] = []
  const records: string[] = []
  const inner = options.surface
  const surface: SvgSurface = {
    showSvg: (svg) => {
      calls.push({ mouth: 'showSvg', svg })
      inner?.showSvg(svg)
    },
    showMarqueeOverlaySvg: (svg) => {
      calls.push({ mouth: 'showMarqueeOverlaySvg', svg })
      inner?.showMarqueeOverlaySvg(svg)
    },
  }
  let aimed: ScreenPart | null = null
  const screenSurface: ScreenSurface = {
    showScreenView: (_view: ScreenView) => {},
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => aimed,
  }
  const wiring: ScreenWiring = { surface: screenSurface, language: 'en', readWatermarkUnlockAnswer: watermarkUnlockAnswer }
  const clipboard: Clipboard = {
    writeClipboardContent: (content: ClipboardContent) => {
      if (content.kind === 'record') records.push(content.text)
      return Promise.resolve({ ok: true })
    },
  }
  const loop = frameLoop(surface, stageDocument(), SCREEN, wiring, undefined, undefined, clipboard)
  drain()
  const last = (mouth: SurfaceCall['mouth']): string => [...calls].reverse().find((one) => one.mouth === mouth)?.svg ?? ''
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  const values = (): any => {
    const now = loop.current()
    if (now === null) throw new Error('the loop has run no frame')
    return now
  }
  const alpha = (): any => {
    const found = values().geometry.tasks.find((one: any) => one.taskUid === ALPHA_UID)
    if (found === undefined) throw new Error('Alpha is not drawn')
    return found
  }
  const band = (taskGroupId: string): { y: number; height: number } => {
    const found = values().layout.taskGroups.find((one: any) => one.taskGroupId === taskGroupId)
    if (found === undefined) throw new Error(`no band for ${taskGroupId}`)
    return { y: found.y, height: found.height }
  }
  return {
    loop,
    calls,
    records,
    send,
    press: (entry) => {
      aimed = {
        part: surfaceOfEntrance(entry),
        entry,
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as unknown as ScreenPart
      send(pointer('down', 600, 20))
      send(pointer('up', 600, 20))
      aimed = null
    },
    pressOn: (part) => {
      aimed = {
        entry: null,
        format: null,
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
        ...part,
      } as unknown as ScreenPart
      send(pointer('down', 600, 20))
      send(pointer('up', 600, 20))
      aimed = null
    },
    drain,
    beneathNow: () => last('showSvg'),
    overlayNow: () => last('showMarqueeOverlaySvg'),
    framesRun: () => ran,
    // WHY: left of Alpha's plan bar, in bands that hold no task -- nothing the picture reads from the
    // pointer (CA-1 (3)) is under any of these points.
    ground: () => {
      const plan = alpha().plan
      const left = Math.min(...(plan.form === 'outline' ? plan.points : [plan.from, plan.to]).map((one: Point) => one.x))
      const mid = (id: string): number => band(id).y + band(id).height / 2
      return [
        { x: left - 90, y: mid(GROUPS[0] as string) },
        { x: left - 90, y: mid(GROUPS[1] as string) },
        { x: left - 100, y: mid(GROUPS[1] as string) + 4 },
        { x: left - 110, y: mid(GROUPS[3] as string) },
        { x: left - 120, y: mid(GROUPS[4] as string) },
      ]
    },
    alphaDummyPoint: () => {
      const dummy = alpha().dummies[0]
      if (dummy === undefined) throw new Error('premise: FR-043 draws a dummy on a task that is not started')
      return { x: dummy.ink.x + Math.min(1, dummy.ink.width / 4), y: dummy.ink.y + dummy.ink.height / 2 }
    },
    alphaMarkerPoint: () => {
      const marker = alpha().marker
      if (marker === null || marker === undefined) throw new Error('premise: T-023d GA-18 places a progress marker on Alpha')
      return { x: marker.center.x + marker.radius / 2, y: marker.center.y }
    },
    taskGroupAreaPoint: (share) => {
      const area = values().regions.taskGroupArea
      return { x: area.x + area.width * share, y: area.y + area.height * 0.15 }
    },
  }
}
export function elementCounts(svg: string): ReadonlyMap<string, number> {
  const counts = new Map<string, number>()
  for (const found of svg.matchAll(/<([A-Za-z][A-Za-z0-9:-]*)\b/g)) {
    const name = found[1] as string
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return counts
}
