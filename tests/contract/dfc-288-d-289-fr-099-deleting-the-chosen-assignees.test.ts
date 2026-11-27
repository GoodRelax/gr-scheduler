// Contract tests: FR-099 deletes the chosen assignees and first names the tasks an unassignment reaches.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
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
import { bare, specTable, type SpecRow, type SpecTable, unbroken } from './spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fake host patches a browser global and the fixtures reach into loose shapes */

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const FR_099_TWO_WAYS_OF_DELETING =
  '`GRS` は、担当の消し方を、どの割当からも参照されていない担当をまとめて消すことと、選んだ担当を消すことの 2 つにすること。'

const FR_099_NAME_THE_TASKS = 'もし担当を消すことで割当が解ける場合、`GRS` は、確認で、割当が解けるタスクの名前を示すこと。'

const FR_099_NOT_A_COUNT =
  '`GRS` は、担当の削除で解かれる割当を確認するとき、タスクを件数だけで示さないこと。'

const FR_099_ONE_ENTRANCE = '未参照の担当の全員をまとめて選ぶ操作と、選んだ担当を消す操作の 2 手で果たすこと。'

const T_109: SpecTable = specTable('T-109')
const T_234: SpecTable = specTable('T-234')
const T_233: SpecTable = specTable('T-233')
const T_050: SpecTable = specTable('T-050')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

// Why: the surface column is read, not typed: it joins an entrance to the
// surface a press on it is answered as, and a typed copy would drift.
function surfaceOf(icon: string): string {
  const cell = bare(rowOf(T_109, icon).by['面'] ?? '')
  const first = cell.split('/')[0]?.trim() ?? ''
  if (first === '') throw new Error(`表 T-109 ${icon} names no 面`)
  return first
}

interface DictionaryWords {
  readonly reasons: readonly {
    readonly specTableRowId: string
    readonly text: Readonly<Record<DisplayLanguage, string>>
  }[]
  readonly confirmation: readonly {
    readonly answer: string
    readonly text: Readonly<Record<DisplayLanguage, string>>
  }[]
}

const WORDS = JSON.parse(
  readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
) as DictionaryWords

const reasonWords = (specTableRowId: string): string => {
  const found = WORDS.reasons.find((one) => one.specTableRowId === specTableRowId)
  if (found === undefined) throw new Error(`FR-038's dictionary holds no words for ${specTableRowId}`)
  return found.text.ja
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

function answerKeyFor(answer: string): KeyInput {
  const word = WORDS.confirmation.find((one) => one.answer === answer)?.text.ja ?? ''
  if (word === '') throw new Error(`FR-038: the manuscript holds no word for the answer ${answer}`)
  return { kind: 'key', key: word.slice(0, 1).toUpperCase(), modifiers: { ...NO_MODIFIERS } }
}

const PROCEED = 'proceed'
const CANCEL = 'cancel'
const QN_3 = 'QN-3'
const RS_27 = 'RS-27'

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ROW_ID = '11111111-1111-4111-8111-111111111111'

// Why: two assignees, so a case that deleted all of them is caught by the other.
const ANNA = 41
const BORIS = 42

// Why: ANNA holds ALPHA, BETA and GAMMA and BORIS holds GAMMA, so deleting ANNA
// lists three task names, never one assignee name and never a count.
const ALPHA = 1
const BETA = 2
const GAMMA = 3
const TASK_NAMES: Readonly<Record<number, string>> = {
  [ALPHA]: 'Alpha task',
  [BETA]: 'Beta task',
  [GAMMA]: 'Gamma task',
}
const RESOURCE_NAMES: Readonly<Record<number, string>> = {
  [ANNA]: 'Anna the assignee',
  [BORIS]: 'Boris the assignee',
}

function documentWithRoster(): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (uid: number, start: string, finish: string) =>
    ({
      uid,
      parentTaskUid: null,
      wbsOrder: uid,
      name: TASK_NAMES[uid],
      start,
      finish,
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
    }) as unknown as Record<string, unknown>
  const resource = (uid: number) => ({
    uid,
    name: RESOURCE_NAMES[uid],
    resourceKind: null,
    isCostResource: null,
    calendarUid: null,
    carry: {},
    carryElements: [],
  })
  const assignment = (uid: number, taskUid: number, resourceUid: number) => ({
    uid,
    taskUid,
    resourceUid,
    carry: {},
    carryElements: [],
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
      tasks: [
        task(ALPHA, '2026-04-01', '2026-04-10'),
        task(BETA, '2026-05-06', '2026-05-20'),
        task(GAMMA, '2026-06-01', '2026-06-12'),
      ],
      resources: [resource(ANNA), resource(BORIS)],
      assignments: [
        assignment(91, ALPHA, ANNA),
        assignment(92, BETA, ANNA),
        assignment(93, GAMMA, BORIS),
        assignment(94, GAMMA, ANNA),
      ],
      taskGroups: [
        {
          id: ROW_ID,
          parentId: null,
          name: 'One row',
          derivedFromTaskUid: null,
          order: 0,
          treeState: 'auto', color: null,
          minHeightPx: null,
        },
      ],
      taskGroupMembers: [ALPHA, BETA, GAMMA].map((taskUid) => ({
        taskUid,
        taskGroupId: ROW_ID,
      })),
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

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
}

function host(): Host {
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
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  } as unknown as ScreenSurface
  return {
    wiring: { surface, language } as unknown as ScreenWiring,
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left' as PointerButton,
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

const ON_THE_SURFACE = { x: 80, y: 120 }

interface Stage {
  readonly loop: FrameLoop
  take(icon: string, options?: { readonly resourceUid?: number }): void
  send(input: HumanInput): void
  view(): ScreenView
  document(): Document
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, documentWithRoster(), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  return {
    loop,
    take: (icon, options = {}) => {
      // Why: CS-2 settles a gesture on what was drawn at the press, so the surface is
      // told what it drew before the button goes down.
      screen.drawAt({
        part: surfaceOf(icon),
        entry: icon as any,
        format: null,
        taskGroupId: null,
        resourceUid: options.resourceUid ?? null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as unknown as ScreenPart)
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      screen.drawAt(null)
    },
    send,
    view: () => screen.last(),
    document: () => loop.document(),
  }
}

function rosterWith(chosen: readonly number[], language: DisplayLanguage = 'ja'): Stage {
  const built = stage(language)
  built.take('IC-62')
  for (const uid of chosen) built.take('IC-68', { resourceUid: uid })
  return built
}

const rosterOf = (view: ScreenView): any => view.resourceList ?? null

const namesOf = (document: Document, of: 'tasks' | 'resources'): readonly (string | null)[] =>
  ((document as any).schedule[of] as { name: string | null }[]).map((one) => one.name)

const assignmentCount = (document: Document): number =>
  ((document as any).schedule.assignments as unknown[]).length

describe('FR-099 -- the manuscript this file is driven by', () => {
  it('still states the two ways of deleting, each ending at its own （MUST）', () => {
    expect(REQUIREMENTS).toContain(FR_099_TWO_WAYS_OF_DELETING)
    expect(REQUIREMENTS).toContain(FR_099_ONE_ENTRANCE)
  })

  it('still asks for the TASK names before the delete, and forbids a bare count', () => {
    expect(REQUIREMENTS).toContain(FR_099_NAME_THE_TASKS)
    expect(REQUIREMENTS).toContain(FR_099_NOT_A_COUNT)
  })

  it('表 T-234 QN-3 still lists the tasks, and names FR-099 for its 正', () => {
    const row = rowOf(T_234, QN_3).cells.join(' ')
    expect(row).toContain('解かれる割当のタスクの名前')
    expect(bare(rowOf(T_234, QN_3).by['正'] ?? '')).toBe('FR-099')
    // Why: the raw cell, not bare: bare answers with the first backticked token,
    // which in this cell is the chain's own row id.
    expect(rowOf(T_234, QN_3).by['名前を挙げるか'] ?? '').toContain('挙げる')
  })

  it('表 T-050 CD-5 still says the Tasks themselves survive', () => {
    const row = rowOf(T_050, 'CD-5').cells.join(' ')
    expect(row).toContain('`GRS` は、担当を消すとき、消す担当の割当を持つ `Task` を消さないこと。')
  })

  it('表 T-109 still puts IC-62 on the palette and IC-66 / IC-68 on the roster', () => {
    expect(surfaceOf('IC-62')).toBe('Command Palette')
    expect(surfaceOf('IC-66')).toBe('Resource List')
    expect(surfaceOf('IC-68')).toBe('Resource List')
    expect(rowOf(T_109, 'IC-66').cells.join(' ')).toContain('選んだ担当を消す')
    expect(rowOf(T_109, 'IC-68').cells.join(' ')).toContain('同じ入口で選択する')
  })

  it('the fixture separates the counts FR-099 separates', () => {
    // Why: without this, three task names could be right for the wrong reason.
    const start = documentWithRoster()
    expect(namesOf(start, 'resources')).toHaveLength(2)
    expect(namesOf(start, 'tasks')).toHaveLength(3)
    expect(assignmentCount(start)).toBe(4)
    // Why: one assignee holds three of the four assignments and one Task is held
    // by both, so no count below can stand in for another.
    expect(new Set(namesOf(start, 'tasks')).size).toBe(3)
  })

  it('the roster opens at all', async () => {
    const built = stage()
    built.take('IC-62')

    const roster = rosterOf(built.view())
    expect(roster, '表 T-109 IC-62 did not open the Resource List').not.toBeNull()
    const keys = (roster.rows as { key: number | string }[]).map((one) => one.key)
    expect(keys.filter((key) => typeof key === 'number').sort((a, b) => (a as number) - (b as number))).toEqual([ANNA, BORIS])
    expect(keys).toHaveLength(3)
  })
})

describe('FR-099 (MUST) -- IC-66 deletes the CHOSEN assignees', () => {
  it('choosing one and taking IC-66 raises a question rather than writing at once', () => {
    const built = rosterWith([ANNA])
    const before = built.document()

    built.take('IC-66')

    expect(
      built.view().confirmation,
      'FR-099 (MUST): 「消すことで解かれる割当があるときは……確認を求めること」',
    ).not.toBeNull()
    expect(
      built.document(),
      'the assignees went before the question was answered',
    ).toBe(before)
  })

  // Spec: RO-10
  it('answering yes takes the chosen assignee and its assignments, and nothing else', () => {
    const built = rosterWith([ANNA])
    built.take('IC-66')

    built.send(answerKeyFor(PROCEED))
    const after = built.document()

    expect(namesOf(after, 'resources'), 'the chosen assignee is gone').toEqual([
      RESOURCE_NAMES[BORIS],
    ])
    expect(namesOf(after, 'tasks'), 'CD-5 (⚠️): a Task must not go with an assignee').toEqual([
      TASK_NAMES[ALPHA],
      TASK_NAMES[BETA],
      TASK_NAMES[GAMMA],
    ])
    expect(assignmentCount(after)).toBe(1)
  })

  it('⭐ the control: the assignee NOT chosen stays, with its assignment', () => {
    // Why: without this, a build that emptied the whole roster would pass the case
    // above.
    const built = rosterWith([BORIS])
    built.take('IC-66')
    built.send(answerKeyFor(PROCEED))
    const after = built.document()

    expect(namesOf(after, 'resources')).toEqual([RESOURCE_NAMES[ANNA]])
    expect(assignmentCount(after), 'ANNA held three of the four assignments').toBe(3)
  })

  it('⭐ the control: answering no leaves the document exactly as it was', () => {
    const built = rosterWith([ANNA])
    const before = built.document()
    built.take('IC-66')

    built.send(answerKeyFor(CANCEL))

    expect(built.document(), 'the canceling answer wrote something').toBe(before)
    expect(built.view().confirmation, 'the question stayed up after being answered').toBeNull()
  })
})

describe('表 T-234 QN-3 (MUST) -- the question names the TASKS, not the assignees', () => {
  it('the question raised is QN-3', () => {
    const built = rosterWith([ANNA])
    built.take('IC-66')

    expect(built.view().confirmation?.question).toBe(QN_3)
  })

  it('⭐⭐ one item per TASK whose assignment would be freed', () => {
    const built = rosterWith([ANNA])
    built.take('IC-66')

    const items = built.view().confirmation?.items ?? []
    expect(
      [...items].map((one) => one.name).sort(),
      '表 T-234 QN-3: 「挙げる —— **解かれる割当のタスクの名前**」',
    ).toEqual([TASK_NAMES[ALPHA], TASK_NAMES[BETA], TASK_NAMES[GAMMA]].sort())
  })

  it('⛔ and NOT one item per assignee', () => {
    // Why: ANNA is one assignee across three tasks, so a question listing the
    // chosen assignees would carry one item with her name.
    const built = rosterWith([ANNA])
    built.take('IC-66')

    const names = (built.view().confirmation?.items ?? []).map((one) => one.name)
    expect(names).not.toContain(RESOURCE_NAMES[ANNA])
    expect(names.length, 'one item arrived, which is the count of assignees and not of tasks').toBe(
      3,
    )
  })

  it('⭐ the control: choosing a different assignee lists a different set of tasks', () => {
    // Why: without this, a build listing every task would pass the case above:
    // ANNA reaches all three tasks, BORIS exactly one.
    const built = rosterWith([BORIS])
    built.take('IC-66')

    expect(
      (built.view().confirmation?.items ?? []).map((one) => one.name),
      'the question listed tasks an unassignment would not reach',
    ).toEqual([TASK_NAMES[GAMMA]])
  })

  it('⛔ a bare count is not offered in place of the names (MUST NOT)', () => {
    const built = rosterWith([ANNA])
    built.take('IC-66')

    for (const item of built.view().confirmation?.items ?? []) {
      expect(item.name, 'FR-099 (MUST NOT): 「件数だけを示してはならない」').not.toBeNull()
      expect(String(item.name).length).toBeGreaterThan(0)
    }
  })
})

describe('FR-029 / 表 T-233 RS-27 -- IC-66 with nobody chosen', () => {
  it('writes nothing', () => {
    const built = rosterWith([])
    const before = built.document()

    built.take('IC-66')

    expect(
      built.document(),
      'a press with nobody chosen moved the document -- 「空で書き通すと、何も言わずに「編集あり」' +
        'になる」',
    ).toBe(before)
    expect(built.view().confirmation, 'a question was asked about nothing').toBeNull()
  })

  it('and carries the reason RS-27, which table T-233 does not show (CR-712)', () => {
    const built = rosterWith([])

    built.take('IC-66')

    const told = built.view().notices.map((one) => one.text)
    expect(told).not.toContain(reasonWords(RS_27))
    expect(bare(rowOf(T_233, RS_27).by['表示の仕方'] ?? '')).toBe('出さない')
  })

  it('⭐ the control: with somebody chosen the same press is not answered with a telling', () => {
    // Why: keeps the two cases above from passing on an entrance that always
    // complains; only the choosing differs.
    const built = rosterWith([ANNA])

    built.take('IC-66')

    expect(built.view().notices, 'IC-66 complained although it had work to do').toEqual([])
    expect(built.view().confirmation).not.toBeNull()
  })
})
