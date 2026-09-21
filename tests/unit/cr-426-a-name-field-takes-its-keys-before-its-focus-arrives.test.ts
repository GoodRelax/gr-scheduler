// CR-426: while a name field is asked for focus, one-character keys are not shortcuts; the ask is retried; the record writes table T-263.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Clipboard, ClipboardContent } from '../../src/adapter/clipboard-gateway/clipboard'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  FOCUS_ON_DOCUMENT_BODY,
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const IN_5A_NOT_A_SHORTCUT =
  '本行のキー（単文字キーと `Delete` / `Backspace`）をショートカットとして扱ってはならない（MUST NOT）'
const IN_5A_DELIVERED = 'そのあいだに押したそれらのキーは、焦点が入った欄への打鍵として届けること（MUST）'
const IN_5B_RETRY =
  '欄に焦点を置くことを要求が求めたときは、置いたあとにその欄に焦点が入ったことを確かめ、入っていなければ次に描くときに置き直すこと（MUST）'
const IN_5B_UNTIL = '置き直しは、焦点が入るか、求めが取り下げられる（`IN-5a` の後の段）まで続けること（MUST）'
const IN_5B_NOT_STOLEN = '⛔ 置き直すために、人が別の欄や入口へ動かした焦点を奪ってはならない（MUST NOT）'
const FR_102_ONLY_THESE =
  '**記録するのは、操作と、描かれた絵の形と、表 T-263 の画面の状態だけとする（MUST）。**⭐ 画面の状態は、描いたフレームごとに書くこと（MUST）'
const IR_1_FOCUS = '| IR-1 | 焦点の位置 | 焦点を持つ要素の種類を書くこと（MUST）'
const IR_1_NO_CONTENT = 'どれでもなければ文書の本体。⛔ 欄の中身を書いてはならない（MUST NOT）'
const IR_2_PANEL =
  '出しているときの中身が選択物か文書の設定か（`_assets/tbl-settings.md` の 表 T-206 の `S-99h`）を書くこと（MUST）'
const IR_3_REASON = '| IR-3 | 出ている通知の理由 | 出ている通知ごとに、その理由の行 ID（表 T-233 の `RS-` の行、または Chapter 6.1 の 表 T-220 の行）を書くこと（MUST）'

describe('CR-426 -- the manuscript these cases are driven by', () => {
  it.each([
    IN_5A_NOT_A_SHORTCUT,
    IN_5A_DELIVERED,
    IN_5B_RETRY,
    IN_5B_UNTIL,
    IN_5B_NOT_STOLEN,
    FR_102_ONLY_THESE,
    IR_1_FOCUS,
    IR_1_NO_CONTENT,
    IR_2_PANEL,
    IR_3_REASON,
  ])('still says it, word for word: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('names MK-13 and HF-14 as the asks, and T-263 as IR-1 to IR-3', () => {
    const in5a = specTable('T-028').rows.find((one) => one.id === 'IN-5a')?.cells.join(' ') ?? ''
    expect(in5a).toContain('`MK-13`')
    expect(in5a).toContain('`HF-14`')
    expect(specTable('T-263').rows.map((one) => one.id)).toEqual(['IR-1', 'IR-2', 'IR-3'])
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const SECRET_NAME = 'SecretTaskName77'
const TASK_UID = 1

const oneTaskDocument = (): Document =>
  ({
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: [
        {
          uid: TASK_UID,
          wbsParentUid: null,
          wbsOrder: 1,
          name: SECRET_NAME,
          start: '2026-04-06',
          finish: '2026-05-08',
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
        } as unknown as Task,
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        {
          id: 'g1',
          parentId: null,
          label: 'row',
          derivedFromTaskUid: null,
          order: 0,
          isCollapsed: false,
          isHidden: false,
          isKeptOpen: false,
          editGroup: null,
          color: null,
          height: null,
        },
      ],
      taskGroupMembers: [{ taskUid: TASK_UID, groupId: 'g1', stackOrder: null }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      pxPerDayAt1x: 20,
      scrollDate: '2026-04-01T00:00:00',
      scrollGroupId: 'g1',
      zoomX: 1,
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }) as unknown as Document

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }
const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const key = (which: string): KeyInput => ({ kind: 'key', key: which, modifiers: NO_MODIFIERS })
const pointer = (phase: PointerPhase, at: Point, clickCount = 1): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: NO_MODIFIERS,
  clickCount,
})

interface Bench {
  readonly loop: FrameLoop
  readonly asked: string[]
  readonly records: string[]
  send(input: HumanInput): void
  aimAt(part: ScreenPart | null): void
  last(): ScreenView
  paletteIsUp(): boolean
  taskCount(): number
}

// see IN-5b, IF-9
const benchWith = (answers: (asked: number) => boolean): Bench => {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => void views.push(view),
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  const asked: string[] = []
  const records: string[] = []
  // WHY: stands in for the host, as focusPropertyField does: a taken ask moves the focus, a press puts it back.
  let focusAt = FOCUS_ON_DOCUMENT_BODY
  const clipboard: Clipboard = {
    writeClipboardContent: (content: ClipboardContent) => {
      if (content.kind === 'record') records.push(content.text)
      return Promise.resolve({ ok: true })
    },
  }
  const loop = frameLoop(
    { showSvg: () => undefined } as never,
    oneTaskDocument(),
    SCREEN,
    {
      surface,
      language: 'en',
      focusPropertyField: (row: string) => {
        asked.push(row)
        const took = answers(asked.length)
        if (took) focusAt = row
        return took
      },
      readFocusPosition: () => focusAt,
    },
    undefined,
    undefined,
    clipboard,
  )
  drain()
  const last = (): ScreenView => {
    const view = views[views.length - 1]
    if (view === undefined) throw new Error('the loop described no screen')
    return view
  }
  return {
    loop,
    asked,
    records,
    send: (input) => {
      if (input.kind === 'pointer' && input.phase === 'down') focusAt = FOCUS_ON_DOCUMENT_BODY
      loop.receiveInput(input)
      drain()
    },
    aimAt: (next) => {
      part = next
    },
    last,
    paletteIsUp: () => last().commandPalette !== null,
    taskCount: () => loop.document().schedule.tasks.length,
  }
}

// see MK-13, T-023d
const bodyOfTheBar = (loop: FrameLoop): Point => {
  const drawn = loop.current()?.geometry.tasks.find((one) => one.taskUid === TASK_UID)
  if (drawn === undefined || drawn.plan === null || drawn.plan.form !== 'outline') {
    throw new Error('the task has no plan outline in this frame')
  }
  const xs = drawn.plan.points.map((one) => one.x)
  const ys = drawn.plan.points.map((one) => one.y)
  const marker = drawn.marker
  const left = marker === null ? Math.min(...xs) : Math.max(Math.min(...xs), marker.centre.x + marker.radius)
  return { x: (left + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

const emptyCanvas = (loop: FrameLoop): Point => {
  const area = loop.current()!.regions.rowArea
  return { x: area.x + area.width - 4, y: area.y + area.height - 4 }
}

const doubleClickTheTask = (built: Bench): void => {
  const at = bodyOfTheBar(built.loop)
  built.send(pointer('down', at))
  built.send(pointer('up', at))
  built.send(pointer('down', at, 2))
  built.send(pointer('up', at, 2))
}

const NEVER = (): boolean => false

describe(`T-028 IN-5a (MUST NOT) -- while the name field is asked for focus: ${IN_5A_NOT_A_SHORTCUT}`, () => {
  it('premise: MK-13 asks the name field for focus and the field has not taken it', () => {
    const built = benchWith(NEVER)
    doubleClickTheTask(built)
    expect(built.asked.length, 'MK-13 asked focusPropertyField').toBeGreaterThan(0)
    expect(built.last().propertiesPanel, 'MK-13 raised the panel').not.toBeNull()
  })

  it(`does not toggle the Command Palette on P (SK-14): ${IN_5A_NOT_A_SHORTCUT}`, () => {
    const built = benchWith(NEVER)
    doubleClickTheTask(built)
    const before = built.paletteIsUp()
    built.send(key('P'))
    expect(built.paletteIsUp(), IN_5A_NOT_A_SHORTCUT).toBe(before)
  })

  it(`does not fit the schedule to the screen on F (SK-18): ${IN_5A_NOT_A_SHORTCUT}`, () => {
    const built = benchWith(NEVER)
    doubleClickTheTask(built)
    const before = built.loop.document().documentSettings
    built.send(key('F'))
    const after = built.loop.document().documentSettings
    expect([after.zoomX, after.zoomY, after.scrollDate], IN_5A_NOT_A_SHORTCUT).toEqual([
      before.zoomX,
      before.zoomY,
      before.scrollDate,
    ])
  })

  it(`does not delete the selected task on Delete (SK-3): ${IN_5A_NOT_A_SHORTCUT}`, () => {
    const built = benchWith(NEVER)
    doubleClickTheTask(built)
    built.send(key('Delete'))
    expect(built.taskCount(), IN_5A_NOT_A_SHORTCUT).toBe(1)
  })

  it('lets P act as SK-14 again once Esc has withdrawn the ask', () => {
    const built = benchWith(NEVER)
    doubleClickTheTask(built)
    for (let press = 0; press < 3 && built.last().propertiesPanel !== null; press += 1) built.send(key('Esc'))
    expect(built.last().propertiesPanel, 'premise: Esc put the panel away, which withdraws the ask').toBeNull()
    const before = built.paletteIsUp()
    built.send(key('P'))
    expect(built.paletteIsUp(), 'SK-14 after the ask was withdrawn').toBe(!before)
  })

  it.skip(`hands the held keys to the field once focus lands -- browser-only: IF-9 names no seam that carries a key into the field: ${IN_5A_DELIVERED}`, () => {})
})

describe(`T-028 IN-5b (MUST) -- ${IN_5B_RETRY}`, () => {
  it(`asks again on the next frames until the field takes focus: ${IN_5B_UNTIL}`, () => {
    const built = benchWith((asked) => asked >= 3)
    doubleClickTheTask(built)
    const away = emptyCanvas(built.loop)
    for (let frame = 0; frame < 6 && built.asked.length < 3; frame += 1) built.send(pointer('move', away))
    expect(built.asked.length, IN_5B_UNTIL).toBeGreaterThanOrEqual(3)
    const settled = built.asked.length
    built.send(pointer('move', away))
    built.send(pointer('move', away))
    expect(built.asked.length, 'no further ask once focus landed').toBe(settled)
  })

  it(`stops asking once a press outside the field withdraws the ask: ${IN_5B_NOT_STOLEN}`, () => {
    const built = benchWith(NEVER)
    doubleClickTheTask(built)
    const away = emptyCanvas(built.loop)
    built.send(pointer('down', away))
    built.send(pointer('up', away))
    const withdrawn = built.asked.length
    built.send(pointer('move', away))
    built.send(pointer('move', away))
    expect(built.asked.length, IN_5B_NOT_STOLEN).toBe(withdrawn)
  })
})

const RECORD_ENTRANCE: ScreenPart = {
  part: 'Command Palette',
  entry: 'IC-76',
  format: null,
  rowGroupId: null,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
} as ScreenPart

const pressRecordEntrance = (built: Bench): void => {
  const at = { x: 30, y: 650 }
  built.aimAt(RECORD_ENTRANCE)
  built.send(pointer('down', at))
  built.send(pointer('up', at))
  built.aimAt(null)
}

const frameLinesOf = (record: string): readonly string[] =>
  record.split('\n').filter((line) => line.split('\t')[2] === 'frame')

// see T-263, T-016, T-109, S-99h, T-233
// TRAP: T-263 names what a frame line holds, not how it is spelled; the keys below are frame-loop.ts's.
const FOCUS_KINDS: ReadonlySet<string> = new Set([
  ...specTable('T-016').rows.map((one) => one.id),
  ...specTable('T-109').rows.map((one) => one.id),
  FOCUS_ON_DOCUMENT_BODY,
])
const PANEL_STATES: ReadonlySet<string> = new Set(['selection', 'documentSettings', 'none'])
const REASON_ROWS: ReadonlySet<string> = new Set(specTable('T-233').rows.map((one) => one.id))

const valueIn = (line: string, name: string): string | null =>
  new RegExp(`(?:^|\\s)${name}=(\\S+)`).exec(line)?.[1] ?? null

const holdsRow: Record<string, (line: string) => boolean> = {
  'IR-1': (line) => FOCUS_KINDS.has(valueIn(line, 'focus') ?? ''),
  'IR-2': (line) => PANEL_STATES.has(valueIn(line, 'panel') ?? ''),
  'IR-3': (line) => {
    const reasons = valueIn(line, 'noticeReasons')
    const many = Number(valueIn(line, 'notices'))
    if (reasons === null) return false
    if (reasons === '-') return many === 0
    const each = reasons.split(',')
    return each.length === many && each.every((one) => REASON_ROWS.has(one))
  },
}

describe(`FR-102 (MUST) -- ${FR_102_ONLY_THESE}`, () => {
  const recorded = (): string => {
    const built = benchWith((asked) => asked >= 1)
    pressRecordEntrance(built)
    doubleClickTheTask(built)
    built.loop.raiseStartupNotice('RS-25')
    built.send(pointer('move', emptyCanvas(built.loop)))
    pressRecordEntrance(built)
    const record = built.records[built.records.length - 1]
    if (record === undefined) throw new Error('premise: stopping the record handed it to the clipboard')
    return record
  }

  it('premise: the record holds frame lines', () => {
    expect(frameLinesOf(recorded()).length).toBeGreaterThan(0)
  })

  it.each([
    ['IR-1', IR_1_FOCUS],
    ['IR-2', IR_2_PANEL],
    ['IR-3', IR_3_REASON],
  ])('writes %s on every frame line', (row, clause) => {
    for (const line of frameLinesOf(recorded())) expect(holdsRow[row]!(line), `${clause} -- ${line}`).toBe(true)
  })

  it(`writes the name field row PR-1 as the focus once the name field holds it: ${IR_1_FOCUS}`, () => {
    const lines = frameLinesOf(recorded())
    expect(lines.some((line) => line.includes('PR-1')), IR_1_FOCUS).toBe(true)
  })

  it(`writes the reason RS-25 of the notice that is up: ${IR_3_REASON}`, () => {
    const lines = frameLinesOf(recorded())
    expect(lines.some((line) => line.includes('RS-25')), IR_3_REASON).toBe(true)
  })

  it(`never writes the task name: ${IR_1_NO_CONTENT}`, () => {
    expect(recorded(), IR_1_NO_CONTENT).not.toContain(SECRET_NAME)
  })
})
