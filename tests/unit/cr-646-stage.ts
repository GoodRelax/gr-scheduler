// CR-646: the documents, the MSPDI text and the frame-loop stage the cr-646-*.test.ts files share.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { unbroken } from '../contract/spec-table'

const ROOT = process.cwd()

export const REQUIREMENTS = unbroken(readFileSync(join(ROOT, 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
export const DESIGN = unbroken(readFileSync(join(ROOT, 'docs', 'spec', '05-07-design.md'), 'utf8'))
export const ERD_DETAIL = unbroken(readFileSync(join(ROOT, 'docs', 'spec', '_assets', 'fig-erd-detail.md'), 'utf8'))
export const SCHEMA_TEXT = readFileSync(join(ROOT, 'docs', 'spec', '_source', 'grs-document.schema.json'), 'utf8')
export const SCHEMA = JSON.parse(SCHEMA_TEXT) as Record<string, any>
export const ERD_TEXT = readFileSync(join(ROOT, 'docs', 'spec', '_source', 'erd.json'), 'utf8')
export const PUBLISHED_ENTRIES = JSON.parse(
  readFileSync(join(ROOT, 'docs', 'spec', '_source', 'published-entries.json'), 'utf8'),
) as { rows: { id: string; members: { name?: string }[] }[] }
export const MANIFEST = JSON.parse(
  readFileSync(join(ROOT, 'src', 'framework', 'single-html-shell', 'startup-template-manifest.json'), 'utf8'),
) as Record<string, any>

const SETTINGS = JSON.parse(readFileSync(join(ROOT, 'docs', 'spec', '_source', 'settings.json'), 'utf8')) as unknown

const TEMPLATE = JSON.parse(
  readFileSync(join(ROOT, 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

// see T-209
/** @purity pure */
export function settingLiteral(id: string): string {
  const seen: unknown[] = [SETTINGS]
  while (seen.length > 0) {
    const next = seen.pop()
    if (Array.isArray(next)) seen.push(...next)
    else if (next !== null && typeof next === 'object') {
      const row = next as Record<string, any>
      if (row['id'] === id && row['value'] !== undefined) return String(row['value'].lit ?? row['value'].num ?? row['value'])
      seen.push(...Object.values(row))
    }
  }
  throw new Error(`settings.json holds no row ${id}`)
}

export const S_482 = settingLiteral('S-482')
export const S_483 = settingLiteral('S-483')
export const DAY_START = '00:00:00'
export const DAY_END = '23:59:00'

export const KNOWN_VERSION = String(MANIFEST['schemaVersion'] ?? TEMPLATE['schemaVersion'])

/** @purity pure */
export function timeOf(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null
  const at = text.indexOf('T')
  return at < 0 ? '' : text.slice(at + 1)
}

/** @purity pure */
export function april(dayOfMonth: number, time = '00:00:00'): string {
  return `2026-04-${String(dayOfMonth).padStart(2, '0')}T${time}`
}

export const PI_1_SIDE_NAMES = [
  'textOfDayStart',
  'textOfDayEnd',
  'DAY_START_TIME',
  'DAY_END_TIME',
  'defaultStartTimeOf',
  'defaultFinishTimeOf',
  'textOfStartSide',
  'textOfFinishSide',
] as const

/** @purity pure */
export function published(name: (typeof PI_1_SIDE_NAMES)[number]): any {
  const found = (scheduleEntry as Record<string, unknown>)[name]
  if (found === undefined) throw new Error(`the Schedule entry (PI-1) does not publish ${name}`)
  return found
}

export const ROW_PREFIX = '64600000-0000-4000-8000-'

/** @purity pure */
export function rowIdOf(index: number): string {
  return `${ROW_PREFIX}${String(index + 1).padStart(12, '0')}`
}

/** @purity pure */
export function taskRow(uid: number, part: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name: `T${uid}`,
    start: april(6, S_482),
    finish: april(10, S_483),
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
    ...part,
  }
}

/** @purity pure */
export function visualOf(uid: number, part: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    taskUid: uid,
    shapeKind: null,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    strokeWidthPx: null,
    ...part,
  }
}

export interface DocumentParts {
  readonly tasks?: readonly Record<string, unknown>[]
  readonly visuals?: readonly Record<string, unknown>[]
  readonly members?: readonly Record<string, unknown>[]
  readonly project?: Record<string, unknown>
  readonly commentBoxes?: readonly Record<string, unknown>[]
  readonly highlightBoxes?: readonly Record<string, unknown>[]
  readonly settings?: Record<string, unknown>
}

/** @purity pure */
export function documentObject(parts: DocumentParts = {}): Record<string, any> {
  const template = structuredClone(TEMPLATE)
  const tasks = parts.tasks ?? []
  const project: Record<string, unknown> = {
    ...template.schedule.project,
    uidHighWaterMark: 100,
    statusDate: null,
    sourceFormat: 'grs',
    defaultStartTime: null,
    defaultFinishTime: null,
    ...parts.project,
  }
  delete project['lastSaved']
  return {
    schemaVersion: KNOWN_VERSION,
    schedule: {
      project,
      calendars: template.schedule.calendars,
      tasks,
      resources: [],
      assignments: [],
      taskGroups: tasks.map((_one, index) => ({
        id: rowIdOf(index),
        parentId: null,
        label: `row ${index + 1}`,
        derivedFromTaskUid: null,
        order: index,
        treeState: 'auto',
        editGroup: null,
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: parts.members ?? tasks.map((one, index) => ({ taskUid: one['uid'], groupId: rowIdOf(index) })),
      taskVisuals: parts.visuals ?? tasks.map((one) => visualOf(one['uid'] as number, one['milestone'] === true ? { shapeKind: 'milestone' } : {})),
      commentBoxes: parts.commentBoxes ?? [],
      highlightBoxes: parts.highlightBoxes ?? [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...template.documentSettings,
      scrollDate: april(1),
      scrollGroupId: tasks.length > 0 ? rowIdOf(0) : null,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
      ...parts.settings,
    },
    documentStamp: template.documentStamp,
    changeLog: [],
  }
}

/** @purity pure */
export function asDocument(parts: DocumentParts = {}): Document {
  return documentObject(parts) as unknown as Document
}

/** @purity pure */
export function taskOf(document: Document, uid: number): Task {
  const found = document.schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`the document has no Task ${uid}`)
  return found
}

export interface MspdiParts {
  readonly projectLeaves?: string
  readonly afterCalendarUid?: string
  readonly tasks: string
}

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7]
  .map((dayType) =>
    dayType === 1 || dayType === 7
      ? `<WeekDay><DayType>${dayType}</DayType><DayWorking>0</DayWorking></WeekDay>`
      : `<WeekDay><DayType>${dayType}</DayType><DayWorking>1</DayWorking><WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes></WeekDay>`,
  )
  .join('')

/** @purity pure */
export function mspdiText(parts: MspdiParts): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Project xmlns="http://schemas.microsoft.com/project">',
    '<SaveVersion>14</SaveVersion>',
    '<Name>Side times</Name>',
    parts.projectLeaves ?? '',
    '<StartDate>2026-04-06T08:00:00</StartDate>',
    '<CalendarUID>1</CalendarUID>',
    parts.afterCalendarUid ?? '',
    '<MinutesPerDay>480</MinutesPerDay>',
    '<WeekStartDay>1</WeekStartDay>',
    `<Calendars><Calendar><UID>1</UID><Name>Standard</Name><IsBaseCalendar>1</IsBaseCalendar><BaseCalendarUID>-1</BaseCalendarUID><WeekDays>${WEEK_DAYS}</WeekDays></Calendar></Calendars>`,
    `<Tasks>${parts.tasks}</Tasks>`,
    '</Project>',
  ].join('\n')
}

/** @purity pure */
export function mspdiTask(uid: number, start: string, finish: string, extra = ''): string {
  return `<Task><UID>${uid}</UID><ID>${uid}</ID><Name>M${uid}</Name><OutlineNumber>${uid}</OutlineNumber><OutlineLevel>1</OutlineLevel><Start>${start}</Start><Finish>${finish}</Finish><Duration>PT40H0M0S</Duration><DurationFormat>7</DurationFormat><Milestone>0</Milestone><Summary>0</Summary>${extra}</Task>`
}

/** @purity pure */
export function elementTexts(xml: string, name: string): string[] {
  return [...xml.matchAll(new RegExp(`<${name}>([^<]*)</${name}>`, 'g'))].map((one) => one[1] ?? '')
}

/** @purity pure */
export function projectLevelOf(xml: string): string {
  const cut = xml.search(/<(OutlineCodes|WBSMasks|ExtendedAttributes|Calendars|Tasks)\b/)
  return cut < 0 ? xml : xml.slice(0, cut)
}

/** @purity pure */
export function taskElementOf(xml: string, uid: number): string {
  const tasks = xml.slice(xml.indexOf('<Tasks'))
  const found = [...tasks.matchAll(/<Task>([\s\S]*?)<\/Task>/g)].find((one) =>
    (one[1] ?? '').startsWith(`<UID>${uid}</UID>`) || new RegExp(`^\\s*<UID>${uid}</UID>`).test(one[1] ?? ''),
  )
  if (found === undefined) throw new Error(`no Task with UID ${uid} was written`)
  return found[1] ?? ''
}

const SCREEN: FrameEnvironment = { width: 1400, height: 900, appHeaderHeight: 0, scrollbarThickness: 0 }
const REAL_RAF = (globalThis as Record<string, unknown>)['requestAnimationFrame']

/** @purity non-pure */
export function restoreAnimationFrames(): void {
  if (REAL_RAF === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = REAL_RAF
}

export const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

/** @purity pure */
export function pointer(phase: PointerPhase, x: number, y: number): PointerInput {
  return { kind: 'pointer', phase, button: 'left', x, y, modifiers: { ...NO_MODIFIERS }, clickCount: 1 }
}

export interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  pressEntry(surface: string, entry: string): void
  answer(answer: 'proceed' | 'cancel'): void
  drag(fromX: number, fromY: number, toX: number, toY?: number): void
  click(x: number, y: number): void
  lastView(): ScreenView | null
}

// WHY: the day width the cr-430 bench draws at, so 70 days of April and May are on the screen.
const PX_PER_DAY = 20

/** @purity non-pure */
export function stage(document: Document, emptyDocument?: Document): Stage {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number => {
    waiting.push(callback)
    handle += 1
    return handle
  }
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  let part: ScreenPart | null = null
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => part,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const drawn = structuredClone(document) as any
  drawn.documentSettings = {
    ...drawn.documentSettings,
    zoomX: PX_PER_DAY / SETTINGS_CONSTANTS.pxPerDayAt1x,
  }
  const loop = frameLoop(
    { showSvg: () => undefined } as never,
    drawn as Document,
    SCREEN,
    wiring,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    emptyDocument,
  )
  drain()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    send,
    pressEntry: (surfaceName, entry) => {
      part = {
        part: surfaceName,
        entry,
        format: null,
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as unknown as ScreenPart
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      part = null
    },
    answer: (answer) => {
      part = {
        part: 'Confirmation',
        entry: null,
        confirmationAnswer: answer,
        format: null,
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as unknown as ScreenPart
      send(pointer('down', 700, 20))
      send(pointer('up', 700, 20))
      part = null
    },
    drag: (fromX, fromY, toX, toY = fromY) => {
      part = null
      send(pointer('down', fromX, fromY))
      send(pointer('move', (fromX + toX) / 2, (fromY + toY) / 2))
      send(pointer('move', toX, toY))
      send(pointer('up', toX, toY))
      // WHY: a drag onto a rest day asks QN-13 (FR-154); these cases assert the No path of HW-11 (JDG-67).
      if (views[views.length - 1]?.confirmation?.question !== 'QN-13') return
      send({ kind: 'key', key: 'N', modifiers: { ...NO_MODIFIERS } })
    },
    click: (x, y) => {
      part = null
      send(pointer('down', x, y))
      send(pointer('up', x, y))
    },
    lastView: () => views[views.length - 1] ?? null,
  }
}
