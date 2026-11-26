// Unit tests: a double click on a task group name opens the panel at the name field.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  PropertiesPanel,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the document is read as untyped JSON */

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// Spec: T-103, U-27
const TASK_GROUP_PANEL = ((): string => {
  const found = specTable('T-103').rows.find(
    (row) => bare(row.by['確定名（英）'] ?? '') === 'Task Group Panel',
  )
  if (found === undefined) throw new Error('table T-103 settles no `Task Group Panel`')
  return bare(found.by['確定名（英）'] ?? '')
})()

// Spec: T-023, MK-13
const MK_13 = rowOf('T-023', 'MK-13').cells.join(' ')

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

// Spec: FR-085
const FR_085_THE_RENAME_PATH =
  'タスクグループパネルでタスクグループ名をダブルクリックしたとき（表 T-023 の `MK-13`）、`GRS` はプロパティパネルを出すこと。'
// Spec: FR-042
const FR_042_THE_NAME_IS_ON_THE_PANEL =
  '`GRS` は、タスクグループ名（`_assets/fig-erd-detail.md` の `AT-53`）もプロパティパネルで編集できるようにすること。'
// Why: FR-042 overrode this note; it may stay quoted as history, never as a
// live rule.
const THE_OVERRIDDEN_SENTENCE =
  '⚠️ **タスクグループ名はここで扱わない** —— 名前を付ける・変える入口は `FR-085` のタスクグループパネル 1 つとする（`FR-029`）。'

// Why: AT-53 is read from the ERD, not typed, because the row ID is the join
// across IF-9 (focusPropertyField takes one).
const TASK_GROUP_NAME_FIELD = ((): string => {
  const detail = unbroken(readFileSync(
    join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'),
    'utf8',
  ))
  const line = detail.split('\n').find((one) => one.includes('`TaskGroup` | `name`'))
  if (line === undefined) throw new Error('the ERD holds no `TaskGroup`.`name` row')
  const id = line.split('|')[1]?.trim() ?? ''
  if (!/^AT-\d+$/.test(id)) throw new Error(`the row for TaskGroup.name reads "${id}"`)
  return id
})()


const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'

const ALPHA_NAME = 'AlphaTaskGroupName'
const BETA_NAME = 'BetaTaskGroupName'

function twoTaskGroupDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const row = (id: string, parentId: string | null, label: string, order: number) => ({
    id,
    parentId,
    name: label,
    derivedFromTaskUid: null,
    order,
    treeState: 'auto', color: null,
    minHeightPx: null,
  })
  return {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, ALPHA_NAME, 0), row(BETA, null, BETA_NAME, 1)],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

function host(): { readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }; runAnimationFrames(): void } {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showMarqueeOverlaySvg: () => undefined, showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
  focusAsks(): readonly string[]
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  const asked: string[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  }
  return {
    // Trap: focusPropertyField is optional; a fake without it would let the focus
    // ask of MK-13 go missing in silence.
    wiring: { surface, language, focusPropertyField: (row) => asked.push(row) },
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    focusAsks: () => asked,
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton; readonly clickCount?: number } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: options.clickCount ?? 1,
})

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  panel(): PropertiesPanel | null
  aimAtTaskGroup(taskGroupId: string): void
  aimAtNothing(): void
  labelOf(taskGroupId: string): string | null
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, twoTaskGroupDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  pen.runAnimationFrames()
  return {
    loop,
    screen,
    send,
    panel: () => screen.last().propertiesPanel,
    // Why: entry is null because that is a press on the name: each control T-051
    // draws on a task group carries a T-109 row, and the name carries none.
    aimAtTaskGroup: (taskGroupId) => {
      screen.drawAt({
        part: TASK_GROUP_PANEL,
        entry: null,
        format: null,
        taskGroupId: taskGroupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
    },
    aimAtNothing: () => {
      screen.drawAt(null)
    },
    labelOf: (taskGroupId) =>
      ((loop.document() as any).schedule.taskGroups.find((one: any) => one.id === taskGroupId)?.name ??
        null) as string | null,
  }
}

function pressRow(built: Stage, taskGroupId: string): void {
  built.aimAtTaskGroup(taskGroupId)
  built.send(pointer('down', 80, 200))
  built.send(pointer('up', 80, 200))
  built.aimAtNothing()
}

// Why: both clicks are sent, as a browser delivers them: clickCount 1 chooses
// the task group and clickCount 2 is MK-13's.
function doubleClickTaskGroupName(built: Stage, taskGroupId: string): void {
  built.aimAtTaskGroup(taskGroupId)
  built.send(pointer('down', 80, 200))
  built.send(pointer('up', 80, 200))
  built.send(pointer('down', 80, 200, { clickCount: 2 }))
  built.send(pointer('up', 80, 200, { clickCount: 2 }))
  built.aimAtNothing()
}

const fieldOf = (panel: PropertiesPanel | null, row: string) =>
  panel?.fields.find((one) => one.row === row)

describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-085 states the rename path, and MK-13 names the タスクグループ見出し', () => {
    expect(REQUIREMENTS).toContain(FR_085_THE_RENAME_PATH)
    expect(MK_13).toContain('タスクグループ見出し')
  })

  it('⛔ FR-042 now puts the task group name on the panel, and the sentence it overrode is gone', () => {
    expect(REQUIREMENTS).toContain(FR_042_THE_NAME_IS_ON_THE_PANEL)
    expect(REQUIREMENTS).not.toContain(THE_OVERRIDDEN_SENTENCE)
  })

  it('⭐ AT-53 is `TaskGroup`.`name`, read from the ERD and not typed', () => {
    expect(TASK_GROUP_NAME_FIELD).toBe('AT-53')
  })
})

// Spec: FR-042, FR-072, AT-53
describe('FR-042 (MUST): the task group s name is a field of the panel', () => {
  it('⭐ the panel a chosen task group puts up carries AT-53, editable, with the name in it', () => {
    const built = stage()
    doubleClickTaskGroupName(built, ALPHA)

    const name = fieldOf(built.panel(), TASK_GROUP_NAME_FIELD)
    expect(name, `the panel drew ${TASK_GROUP_NAME_FIELD}`).toBeDefined()
    expect(name?.text).toBe(ALPHA_NAME)
    expect(name?.isEditable, 'FR-042 (MUST): the name can be edited here').toBe(true)
  })

  it('⭐ it stands FIRST, where the most frequently touched item goes', () => {
    const built = stage()
    doubleClickTaskGroupName(built, ALPHA)
    expect(built.panel()?.fields[0]?.row).toBe(TASK_GROUP_NAME_FIELD)
  })

  it('⚠️ the color and the height are still there beside it', () => {
    const built = stage()
    doubleClickTaskGroupName(built, ALPHA)
    const rows = built.panel()?.fields.map((one) => one.row) ?? []
    expect(rows).toContain('PR-19')
    expect(rows).toContain('PR-20')
  })
})

// Spec: FR-085, MK-13, FR-042, FR-031, UN-3
// Why: no case presses Enter: SK-19 already puts the panel away, and FR-085
// forbids restating it here.
describe('FR-085 (MUST): a double click on the name opens the panel at that field', () => {
  it('⭐ puts the panel up and asks for AT-53', () => {
    // Why: the focus itself belongs to the side that drew the control (LR-6), so
    // this unit owes only the ask.
    const built = stage()
    doubleClickTaskGroupName(built, ALPHA)

    expect(built.panel(), 'FR-085 (MUST): the panel is up').not.toBeNull()
    expect(built.screen.focusAsks()).toEqual([TASK_GROUP_NAME_FIELD])
  })

  it('⛔ a single press chooses the task group and asks for no field (FR-042, MUST NOT)', () => {
    // Why: the control case: a shell that asked for the field on every press
    // would otherwise pass the case above.
    const built = stage()
    pressRow(built, ALPHA)
    expect(built.screen.focusAsks(), 'a plain press asks for no field').toEqual([])
  })

  it('⭐ the panel turns to the task group that was double clicked', () => {
    const built = stage()
    doubleClickTaskGroupName(built, ALPHA)
    expect(fieldOf(built.panel(), TASK_GROUP_NAME_FIELD)?.text).toBe(ALPHA_NAME)
    doubleClickTaskGroupName(built, BETA)
    expect(fieldOf(built.panel(), TASK_GROUP_NAME_FIELD)?.text).toBe(BETA_NAME)
  })

  it('⛔ the press itself writes nothing to the document', () => {
    // Why: the name is written by the field's commit; a press that wrote would put
    // a step on the undo history for an edit nobody made.
    const built = stage()
    doubleClickTaskGroupName(built, ALPHA)
    expect(built.labelOf(ALPHA)).toBe(ALPHA_NAME)
    expect(built.labelOf(BETA)).toBe(BETA_NAME)
  })
})
