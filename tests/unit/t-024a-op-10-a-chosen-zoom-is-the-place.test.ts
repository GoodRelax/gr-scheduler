// Unit tests: a zoom or place a person chooses becomes the place, and OP-10 is not redone every frame.

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture edits a cloned template and the host fakes browser globals */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
} from '../../src/adapter/input-command-translator/input-source'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

const T_024A = specTable('T-024a')

const RULE_COLUMN = ((): string => {
  const found = T_024A.headings.find((heading) => heading.includes('規則'))
  if (found === undefined) throw new Error('table T-024a has no 規則 column')
  return found
})()

// Why: table T-024a puts each row's condition in the subject column, not in the rule column.
const SUBJECT_COLUMN = ((): string => {
  const found = T_024A.headings.find((heading) => heading.includes('事項'))
  if (found === undefined) throw new Error('table T-024a has no 事項 column')
  return found
})()

const OP_10_ROW = ((): { readonly by: Readonly<Record<string, string>> } => {
  const found = T_024A.rows.find((row) => row.id === 'OP-10')
  if (found === undefined) throw new Error('table T-024a has no row OP-10')
  return found
})()

const OP_10 = OP_10_ROW.by[RULE_COLUMN] ?? ''
const OP_10_WHEN = OP_10_ROW.by[SUBJECT_COLUMN] ?? ''

// Spec: OP-10
const A_CHOICE_IS_THE_PLACE =
  '⛔ **人が倍率か表示位置を選んだときは、それを表示位置とすること（MUST）**'

const NOT_EVERY_FRAME = '⛔ **本行を毎フレームやり直してはならない（MUST NOT）**'

const BECAUSE_THE_CONDITION_STOPS_HOLDING =
  '選んだ時点で「人がまだ場所を決めていない」ではなくなるので、本行の条件は成り立たなくなり、全体表示はやり直されない。'

const THE_CONDITION = '表示位置が `null`、または指すタスクグループが存在しないとき'

const T_036 = specTable('T-036')
// Spec: S-53
const ZOOM_STEP = Number(/\d+(?:\.\d+)?/.exec(specTable('T-201').rows.find((row) => row.id === 'S-53')?.by['既定値'] ?? '')?.[0] ?? '')

const ENTRANCE_COLUMN = ((): string => {
  const found = T_036.headings.find((heading) => heading.includes('入口'))
  if (found === undefined) throw new Error('table T-036 has no 入口 column')
  return found
})()

const entrancesOf = (row: string): string => {
  const found = T_036.rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table T-036 has no row ${row}`)
  return found.by[ENTRANCE_COLUMN] ?? ''
}

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

// Why: the spelling is this file's reading of the T-036 assignment column; a premise case checks each row
// still names its entrance, so a reassigned key fails there by name instead of pressing the wrong thing.
const SHIFT_PLUS: KeyInput = { kind: 'key', key: '+', modifiers: { ...NO_MODS, shift: true } }
const SHIFT_MINUS: KeyInput = { kind: 'key', key: '-', modifiers: { ...NO_MODS, shift: true } }
const ALT_PLUS: KeyInput = { kind: 'key', key: '+', modifiers: { ...NO_MODS, alt: true } }
const PRESS_F: KeyInput = { kind: 'key', key: 'F', modifiers: NO_MODS }

// Why: BT-4 lends a valid calendar, project and settings, but startedFromTemplate is left off,
// so OP-10's exclusion for the template never operates here.
const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const stored = (day: string): string => `${day}T00:00:00`

const TASK_GROUP_ONE = '3a000000-0000-4000-8000-000000000001'
const TASK_GROUP_TWO = '3a000000-0000-4000-8000-000000000002'

function task(over: Partial<Task> & { readonly uid: number }): Task {
  return {
    parentTaskUid: null,
    wbsOrder: over.uid,
    name: null,
    start: null,
    finish: null,
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
    ...over,
  } as unknown as Task
}

const group = (id: string, order: number, label: string): unknown => ({
  id,
  parentId: null,
  name: label,
  derivedFromTaskUid: null,
  order,
  treeState: 'auto', editPermission: null,
  color: null,
  minHeightPx: null,
})

// Summary: the fixture holds two task groups, two Tasks and no stored place, so OP-10 draws every first frame.
function fixtureDocument(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100 },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task({ uid: 1, name: 'One', start: stored('2026-04-06'), finish: stored('2026-04-24') }),
        task({ uid: 2, name: 'Two', start: stored('2026-04-10'), finish: stored('2026-05-29') }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [group(TASK_GROUP_ONE, 0, 'One'), group(TASK_GROUP_TWO, 1, 'Two')],
      taskGroupMembers: [
        { taskUid: 1, taskGroupId: TASK_GROUP_ONE },
        { taskUid: 2, taskGroupId: TASK_GROUP_TWO },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      scrollDate: null,
      scrollTaskGroupId: null,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  edit(draft)
  return draft as unknown as Document
}

const settingsOf = (document: Document): DocumentSettings =>
  (document as unknown as { readonly documentSettings: DocumentSettings }).documentSettings

const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 700,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

const realRaf = (globalThis as any).requestAnimationFrame

// Summary: the fake host drains the animation-frame queue and counts the turns, so a case can ask for more frames.
function host(): {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(turns?: number): number
} {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  let clock = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => {} },
    runAnimationFrames: (turns = 8): number => {
      let ran = 0
      for (let turn = 0; turn < turns && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) {
          clock += 16
          ran += 1
          callback(clock)
        }
      }
      return ran
    },
  }
}

function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
  const surface: ScreenSurface = {
    showScreenView: (_view: ScreenView) => {},
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  return { surface, language }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// Spec: S-1, FR-017
interface Picture {
  readonly pxPerDay: number
  readonly rectangleHeight: number
  readonly firstTaskGroupHeight: number
}

interface Booted {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  idle(turns?: number): number
  picture(): Picture
  place(): { readonly scrollDate: unknown; readonly scrollTaskGroupId: unknown }
}

function boot(document: Document = fixtureDocument()): Booted {
  const pen = host()
  const loop = frameLoop(pen.surface as any, document, SCREEN, screenPane())
  // Why: the first frame is owed by making the loop, not by an input of FT-3, so drain it before any case reads current().
  pen.runAnimationFrames()
  const picture = (): Picture => {
    const values = loop.current()
    if (values === null) throw new Error('BO-1 settled no size, so no frame was drawn')
    const first = values.layout.taskGroups[0]
    if (first === undefined) throw new Error('the fixture drew no task group')
    return {
      pxPerDay: values.layout.pxPerDay,
      rectangleHeight: values.layout.rectangleHeight,
      firstTaskGroupHeight: first.height,
    }
  }
  return {
    loop,
    send: (input: HumanInput) => {
      loop.receiveInput(input)
      pen.runAnimationFrames()
    },
    idle: (turns = 8) => pen.runAnimationFrames(turns),
    picture,
    place: () => {
      const settings = settingsOf(loop.document()) as unknown as Record<string, unknown>
      return {
        scrollDate: settings['scrollDate'],
        scrollTaskGroupId: settings['scrollTaskGroupId'],
      }
    },
  }
}

// Spec: OP-10, SK-16, SK-16a, SK-16b, SK-16c, SK-18, IC-14, BT-4
describe('表 T-024a OP-10 -- the manuscript this file is driven by', () => {
  it('still carries the rule that a choice becomes the place', () => {
    expect(OP_10).toContain(A_CHOICE_IS_THE_PLACE)
    expect(OP_10).toContain(BECAUSE_THE_CONDITION_STOPS_HOLDING)
  })

  it('still forbids redoing the row every frame', () => {
    expect(OP_10).toContain(NOT_EVERY_FRAME)
    expect(OP_10).toContain('本行は結果を定めるものであって、頻度を定めるものではない。')
  })

  it('still keeps IC-14 out of the four entrances this row names', () => {
    expect(OP_10).toContain('**`IC-14`（縮小）が動かないのは本行と別である**')
  })

  it('still reads the place as the condition, so the fixture below is on the branch', () => {
    expect(OP_10_WHEN).toContain(THE_CONDITION)
  })

  it('leaves table T-036 pointing the pressed keys at those same entrances', () => {
    // Why: what is asserted is the tie between the row pressed here and the entrance OP-10 names, not the assignment column.
    expect(entrancesOf('SK-16')).toContain('IC-13')
    expect(entrancesOf('SK-16')).not.toContain('IC-12')
    expect(entrancesOf('SK-16b')).toContain('IC-12')
    expect(entrancesOf('SK-16a')).toContain('IC-15')
    expect(entrancesOf('SK-18')).toContain('IC-10')
  })

  it('drives a document that is a document, with no place stored', () => {
    const document = fixtureDocument()
    expect(validateDocument(document).valid).toBe(true)
    const settings = settingsOf(document) as unknown as Record<string, unknown>
    expect(settings['scrollDate']).toBeNull()
    expect(settings['scrollTaskGroupId']).toBeNull()
  })
})

// Spec: OP-10, IC-10, IC-12, IC-13, IC-15, FR-055, ZE-1, ZE-6, S-53, S-77, S-78
// Why: IC-14 is not pressed: OP-10 says its not moving is another row's matter (LF-3), so a case on it
// would either contradict the row or hold another file's row.
describe('OP-10 (MUST) -- what a person chose becomes the place', () => {
  it('IC-13: a press of the time-axis zoom-in moves the picture', () => {
    const one = boot()
    const before = one.picture()
    one.send(SHIFT_PLUS)
    expect(one.picture().pxPerDay).toBeGreaterThan(before.pxPerDay)
  })

  it('IC-12: a press of the time-axis zoom-out moves the picture', () => {
    const one = boot()
    const before = one.picture()
    one.send(SHIFT_MINUS)
    expect(one.picture().pxPerDay).toBeLessThan(before.pxPerDay)
  })

  // Why: the fit may land inside the shrinking end (ZE-1), where ZE-6 writes more than one S-53
  // step; OP-10 fixes only that the zoom is taken from the fit's zoom, so the step is a floor here.
  it('IC-15: a press of the vertical-axis zoom-in writes at least one S-53 step up from the fit zoom, and keeps it', () => {
    const one = boot()
    const scene = one.loop.exportScene() as unknown as { settings: { zoomY: number } } | null
    if (scene === null) throw new Error('the loop had no scene to export')
    const fitted = scene.settings.zoomY
    one.send(ALT_PLUS)
    const chosen = (settingsOf(one.loop.document()) as unknown as { zoomY: number }).zoomY
    expect(chosen, 'FR-055 / OP-10 / ZE-6: the step is taken from the zoom the fit chose').toBeGreaterThanOrEqual(
      fitted * ZOOM_STEP * (1 - Number.EPSILON),
    )
    one.idle()
    expect((settingsOf(one.loop.document()) as unknown as { zoomY: number }).zoomY, 'OP-10 (MUST NOT): no later frame redoes the fit').toBe(chosen)
  })

  it('IC-10: the fit is still reachable, and moves the picture back after a zoom', () => {
    // Why: FR-055 makes the fit a choice of place too, so it is on this clause's side of the row
    // and must move the picture back when the person stands elsewhere.
    const one = boot()
    const fitted = one.picture()
    one.send(SHIFT_PLUS)
    expect(one.picture().pxPerDay).not.toBe(fitted.pxPerDay)
    one.send(PRESS_F)
    // Why: FR-055 names where the fit lands, not a bit-exact float; a zoom and back may differ in the last ulp.
    expect(one.picture().pxPerDay).toBeCloseTo(fitted.pxPerDay, 9)
  })

  it('fills in 表示位置, so the condition of OP-10 stops holding', () => {
    // Why: which day and task group a press settles on is not asserted: the ruling says the choice becomes the place,
    // not that it is the fit's place; nor is HF-8, which the ruling leaves unmoved.
    const one = boot()
    expect(one.place().scrollDate).toBeNull()
    expect(one.place().scrollTaskGroupId).toBeNull()

    one.send(SHIFT_PLUS)

    const after = one.place()
    expect(after.scrollDate, 'S-77 still says the person has not chosen a place').not.toBeNull()
    expect(after.scrollTaskGroupId, 'S-78 still says the person has not chosen a place').not.toBeNull()
    expect([TASK_GROUP_ONE, TASK_GROUP_TWO]).toContain(after.scrollTaskGroupId)
  })

  it('fills it in for the vertical axis and for the fit as well, not only for the time axis', () => {
    // Why: a pressed fit (SK-18) is read as choosing the place, unlike OP-10 firing at boot, which leaves the pair null
    // (not an OP-6 completion); if a ruling says a pressed fit is no choice, PRESS_F leaves this list and nothing else.
    for (const press of [ALT_PLUS, PRESS_F, SHIFT_MINUS]) {
      const one = boot()
      one.send(press)
      const after = one.place()
      expect(after.scrollDate, `${String(press.key)} left S-77 null`).not.toBeNull()
      expect(after.scrollTaskGroupId, `${String(press.key)} left S-78 null`).not.toBeNull()
    }
  })
})

// Spec: OP-10
describe('OP-10 (MUST NOT) -- the row is not redone every frame', () => {
  it('does not overwrite the zoom the person wrote on the frames that follow', () => {
    // Why: redoing the row every frame overwrote the person's zoom on the next frame, so the case presses once
    // and then drains more frames than the press asked for, with nothing pressed.
    const one = boot()
    one.send(SHIFT_PLUS)
    const chosen = one.picture()

    for (let frame = 0; frame < 12; frame += 1) {
      one.idle(1)
      expect(
        one.picture().pxPerDay,
        `frame ${frame + 1} after the press redid OP-10 and overwrote the person's zoom`,
      ).toBe(chosen.pxPerDay)
    }
  })

  it('holds the vertical axis the same way', () => {
    const one = boot()
    one.send(ALT_PLUS)
    const chosen = one.picture()
    one.idle(12)
    expect(one.picture().rectangleHeight).toBe(chosen.rectangleHeight)
    expect(one.picture().firstTaskGroupHeight).toBe(chosen.firstTaskGroupHeight)
  })

  it('keeps the zoom working AFTER the fit, which is where the row used to come back', () => {
    // Why: the fit writes a place of its own, and frames after it must not re-enter the row, or the next press is lost.
    const one = boot()
    one.send(PRESS_F)
    const fitted = one.picture()
    one.send(SHIFT_PLUS)
    const zoomed = one.picture()
    expect(zoomed.pxPerDay).toBeGreaterThan(fitted.pxPerDay)
    one.idle(12)
    expect(one.picture().pxPerDay).toBe(zoomed.pxPerDay)
  })

  it('does not move the picture at all while nothing is pressed', () => {
    // Why: redoing the row with nothing changed draws the same picture, so this case cannot see that defect;
    // it is kept for a picture that drifts with the clock while nothing is pressed, asserted from the first frame.
    const one = boot()
    const first = one.picture()
    one.idle(12)
    expect(one.picture()).toEqual(first)
  })
})
