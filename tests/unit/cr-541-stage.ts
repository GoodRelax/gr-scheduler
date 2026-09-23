// CR-541: the shared bench the cr-541-*.test.ts files drive the shell and the use cases through.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type {
  HumanInput,
  InputModifiers,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  FieldEditNotice,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'

export const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)
export const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

export const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

export const DISPLAY_WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as Record<string, any>

export function rowOf(table: string, id: string) {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

export const numberIn = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

export const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
export const keyOf = (key: string, mods: Partial<InputModifiers> = {}): HumanInput => ({
  kind: 'key',
  key,
  modifiers: { ...NO_MODS, ...mods },
})
export const pointerOf = (
  phase: 'down' | 'move' | 'up',
  x: number,
  y: number,
  mods: Partial<InputModifiers> = {},
): HumanInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: { ...NO_MODS, ...mods },
  clickCount: 1,
})

export interface RowSeed {
  readonly id: string
  readonly parentId: string | null
  readonly isCollapsed?: boolean
  readonly isHidden?: boolean
  readonly isKeptOpen?: boolean
}

export function taskOf(uid: number, part: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name: `Task${uid}`,
    start: '2026-04-06T08:00:00',
    finish: '2026-04-10T17:00:00',
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

export function rowDocument(
  rows: readonly RowSeed[],
  settings: Record<string, unknown> = {},
  schedule: Record<string, unknown> = {},
): Record<string, any> {
  return {
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: rows.map((_one, index) => taskOf(index + 1)),
      resources: [],
      assignments: [],
      taskGroups: rows.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: `row ${index + 1}`,
        derivedFromTaskUid: null,
        order: index,
        isCollapsed: one.isCollapsed ?? false,
        isHidden: one.isHidden ?? false,
        isKeptOpen: one.isKeptOpen ?? false,
        editGroup: null,
        color: null,
        height: null,
      })),
      taskGroupMembers: rows.map((one, index) => ({ taskUid: index + 1, groupId: one.id, stackOrder: null })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
      ...schedule,
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      scrollDate: '2026-04-01',
      scrollGroupId: rows[0]?.id ?? null,
      scrollGroupOffset: 0,
      zoomY: 1,
      ...settings,
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }
}

export const SCREEN = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }

export interface ShellBench {
  readonly loop: FrameLoop
  aim(part: ScreenPart | null): void
  send(input: HumanInput): void
  click(x: number, y: number, mods?: Partial<InputModifiers>): void
  press(part: string, entry: string | null, groupId: string | null): void
  last(): ScreenView
  notices(): readonly string[]
  groups(): any[]
  restore(): void
}

export function shell(
  document: Record<string, unknown>,
  options: { readonly unsettledText?: boolean } = {},
): ShellBench {
  const realRaf = (globalThis as any).requestAnimationFrame
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  const run = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  // see IF-9, T-292, T-016
  // WHY: an unsettled text entry is told to the shell as a begin notice (CR-500
  // wave B), kept as `editingField`; PR-1 is the row the name field names.
  const pendingEdits: FieldEditNotice[] =
    options.unsettledText === true ? [{ kind: 'began', row: 'PR-1' }] : []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    // WHY: still declared by IF-9's surface; the shell no longer reads it.
    hasUnsettledTextEntry: () => options.unsettledText === true,
    readFieldEditNotices: () => pendingEdits.splice(0, pendingEdits.length),
    readScreenPartAt: () => part,
  } as ScreenSurface
  const loop = frameLoop({ showSvg: () => undefined } as never, document as never, SCREEN, {
    surface,
    language: 'ja',
  })
  run()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    run()
  }
  const last = (): ScreenView => {
    const view = views[views.length - 1]
    if (view === undefined) throw new Error('the surface was given no description')
    return view
  }
  return {
    loop,
    aim: (next) => {
      part = next
    },
    send,
    click: (x, y, mods = {}) => {
      send(pointerOf('down', x, y, mods))
      send(pointerOf('up', x, y, mods))
    },
    press: (surfaceName, entry, groupId) => {
      part = {
        part: surfaceName,
        entry,
        format: null,
        rowGroupId: groupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as ScreenPart
      send(pointerOf('down', 80, 120))
      send(pointerOf('up', 80, 120))
      part = null
    },
    last,
    notices: () => last().notices.map((one: any) => one.text),
    groups: () => (loop.document().schedule as any).taskGroups,
    restore: () => {
      if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
      else (globalThis as any).requestAnimationFrame = realRaf
    },
  }
}
