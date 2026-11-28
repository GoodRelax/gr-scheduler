// Unit tests: adding a task group walks the same road as renaming one.

import { readRepoFile } from '../spec-files'
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
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any -- the document is read as untyped JSON */

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

// Spec: T-103, U-22
const TASK_GROUP_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

// Why: the entrance is joined through the T-109 column that names its rule, so
// a renumbered icon roster cannot leave a typed IC id silent.
function entranceFor(rule: string): string {
  const onThePanel = specTable('T-109').rows.filter(
    (one) => bareAll(one.by['面'] ?? '').includes(TASK_GROUP_PANEL),
  )
  const found = onThePanel.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  const first = found[0]
  if (found.length !== 1 || first === undefined) {
    throw new Error(`表 T-109 gives ${rule} ${found.length} entrances on the panel, not one`)
  }
  return first.id
}

// Spec: T-109, HF-17, HF-14
const HEAD_ADD_TASK_GROUP = entranceFor('HF-17')
const ADD_CHILD_TASK_GROUP = entranceFor('HF-14')

// Why: AT-53 is read from the ERD, not typed, so a renumbered ERD reaches the
// cases instead of leaving them silent.
const TASK_GROUP_NAME_FIELD = ((): string => {
  const detail = unbroken(readRepoFile(
    join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'),
    'utf8',
  ))
  const line = detail.split('\n').find((one) => one.includes('`TaskGroup` | `name`'))
  if (line === undefined) throw new Error('the ERD holds no `TaskGroup`.`name` row')
  const id = line.split('|')[1]?.trim() ?? ''
  if (!/^AT-\d+$/.test(id)) throw new Error(`the row for TaskGroup.name reads "${id}"`)
  return id
})()

interface DefaultTaskGroupName {
  readonly use: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
}

// Spec: FR-038
// Why: the word is read from docs/spec/_source, where it is written; src holds
// only what is generated from it.
const DEFAULT_TASK_GROUP_NAME_WORD: DefaultTaskGroupName = ((): DefaultTaskGroupName => {
  const manuscript = JSON.parse(
    readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { defaultNames?: readonly DefaultTaskGroupName[] }
  const found = (manuscript.defaultNames ?? []).find((one) => one.use === 'taskGroup')
  if (found === undefined) throw new Error('the dictionary has no defaultNames entry for `taskGroup`')
  return found
})()


// Why: two roots, one of them already a parent, so a new task group can be told
// apart from every one already standing.
const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const uuidOf = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const ALPHA = uuidOf(1)
const ALPHA_CHILD = uuidOf(2)
const BETA = uuidOf(3)

const ALPHA_NAME = 'AlphaTaskGroupName'
const ALPHA_CHILD_NAME = 'AlphaChildTaskGroupName'
const BETA_NAME = 'BetaTaskGroupName'

interface StoredRow {
  readonly id: string
  readonly parentId: string | null
  readonly name: string | null
  readonly order: number
}

function threeTaskGroupDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const row = (id: string, parentId: string | null, label: string, order: number): StoredRow => ({
    id,
    parentId,
    name: label,
    order,
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
      taskGroups: [
        { ...row(ALPHA, null, ALPHA_NAME, 0), derivedFromTaskUid: null, treeState: 'auto', color: null, minHeightPx: null },
        { ...row(ALPHA_CHILD, ALPHA, ALPHA_CHILD_NAME, 0), derivedFromTaskUid: null, treeState: 'auto', color: null, minHeightPx: null },
        { ...row(BETA, null, BETA_NAME, 1), derivedFromTaskUid: null, treeState: 'auto', color: null, minHeightPx: null },
      ],
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
  options: { readonly clickCount?: number } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left' as PointerButton,
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: options.clickCount ?? 1,
})

const ON_THE_SURFACE = { x: 80, y: 120 }

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  aim(entry: string | null, taskGroupId: string | null): void
  aimAtNothing(): void
  // Why: the aim is set before the press because CS-2 freezes it at the press.
  press(entry: string, taskGroupId: string | null): void
  doubleClickName(taskGroupId: string): void
  panel(): PropertiesPanel | null
  rows(): readonly StoredRow[]
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, threeTaskGroupDocument(), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  const aim = (entry: string | null, taskGroupId: string | null): void => {
    screen.drawAt({
      part: TASK_GROUP_PANEL,
      entry: entry as any,
      format: null,
      taskGroupId: taskGroupId,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  }
  const aimAtNothing = (): void => screen.drawAt(null)
  return {
    loop,
    screen,
    send,
    aim,
    aimAtNothing,
    press: (entry, taskGroupId) => {
      aim(entry, taskGroupId)
      // Why: IN-1 settles a pointer operation on release, so a press is down then up.
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      aimAtNothing()
    },
    doubleClickName: (taskGroupId) => {
      // Why: both clicks are sent, as a browser delivers them: clickCount 1 chooses
      // the task group and clickCount 2 is MK-13's.
      aim(null, taskGroupId)
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y, { clickCount: 2 }))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y, { clickCount: 2 }))
      aimAtNothing()
    },
    panel: () => screen.last().propertiesPanel,
    rows: () => (loop.document().schedule as any).taskGroups as readonly StoredRow[],
  }
}

const fieldOf = (panel: PropertiesPanel | null, row: string) =>
  panel?.fields.find((one) => one.row === row)

function newTaskGroupSince(before: readonly StoredRow[], after: readonly StoredRow[]): StoredRow {
  const knownIds = new Set(before.map((one) => one.id))
  const created = after.filter((one) => !knownIds.has(one.id))
  if (created.length !== 1) {
    throw new Error(`expected exactly one new task group, found ${created.length}`)
  }
  return created[0]!
}

// Spec: T-051, HF-14, HF-17, FR-085, FR-072, FR-038, AT-55, T-064, PI-37
describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: without this premise, a parse that lost a column would make every case
    // below agree with anything.
    expect(TASK_GROUP_PANEL).toBe('Task Group Panel')
    expect(HEAD_ADD_TASK_GROUP).toBe('IC-93')
    expect(ADD_CHILD_TASK_GROUP).toBe('IC-91')
    expect(TASK_GROUP_NAME_FIELD).toBe('AT-53')
  })

  it('⭐⭐ HF-14 (MUST): a press raises the task group at once, named from the dictionary, on FR-085s own road', () => {
    expect(says('T-051', 'HF-14')).toContain(
      '配下に足す操作子を押したとき、`GRS` は、押した瞬間に既定の名前でタスクグループを立てること。配下に足す操作子を押したとき、`GRS` は、立てたタスクグループのプロパティパネルを出し、名前の欄で名づけさせること。',
    )
    expect(says('T-051', 'HF-14')).toContain(
      '`GRS` は、名づけの道を、`FR-085` が改名について定める道と同じものにすること。`GRS` は、改名と別の名づけの道を作らないこと。',
    )
    expect(says('T-051', 'HF-14')).toContain(
      '`GRS` は、既定の名前を表示語として持つこと（置き場は `FR-038` の辞書）。',
    )
  })

  it('⛔ HF-14 no longer holds the model withdrawn on 2026-09-04 (guards this file against drifting back)', () => {
    expect(says('T-051', 'HF-14')).not.toContain('打ち込み口')

    // Why: the manuscript keeps a withdrawn rule as a dated note, so the guard asks
    // that the withdrawn words stand only inside that note.
    const hf14 = says('T-051', 'HF-14')
    const withdrawn = '名前は空で立て'
    const at = hf14.indexOf(withdrawn)
    if (at !== -1) {
      expect(
        hf14.slice(Math.max(0, at - 40), at),
        'the withdrawn wording stands outside the dated note that withdrew it',
      ).toContain('までは')
    }
    expect(hf14).not.toContain(withdrawn + 'ること（MUST）')
  })

  it('⭐⭐ HF-17 (MUST): 段 0s own add-task-group entrance defers its naming to HF-14, word for word', () => {
    expect(says('T-051', 'HF-17')).toContain('`GRS` は、`HF-17` で足したタスクグループの名前の扱いを `HF-14` に従わせること。')
    expect(says('T-051', 'HF-17')).toContain('`HF-14`（配下に足す）で足したタスクグループが描かれていないときも、`GRS` は、足したタスクグループが見える位置まで表示位置を送ること。')
  })

  it('⭐ FR-085 states the very road HF-14 points HF-17 at', () => {
    expect(REQUIREMENTS).toContain(
      'タスクグループパネルでタスクグループ名をダブルクリックしたとき（表 T-023 の `MK-13`）、`GRS` はプロパティパネルを出すこと。',
    )
    expect(REQUIREMENTS).toContain(
      'タスクグループ名をダブルクリックしたとき、`GRS` は、名前の欄（`_assets/fig-erd-detail.md` の `AT-53`）を編集できる状態にして焦点を置くこと。',
    )
  })

  it('⭐ FR-072 forbids enumerating the entrances that put the panel up', () => {
    expect(REQUIREMENTS).toContain(
      '⛔ **その入口を本要求が数え上げてはならない（MUST NOT）**',
    )
  })

  it('⭐ PI-37 of table T-064 is the one place the spelling is published, so this file reads the dictionary instead', () => {
    expect(says('T-064', 'PI-37')).toContain('DEFAULT_TASK_GROUP_NAME')
    expect(says('T-064', 'PI-37')).toContain('仕様書が規則として綴りを刷ってはならない（MUST NOT）')
    expect(says('T-064', 'PI-9')).not.toContain('DEFAULT_TASK_GROUP_NAME')
  })

  it('⭐ the dictionary holds exactly one word for a task group, spelled alike in both languages', () => {
    expect(DEFAULT_TASK_GROUP_NAME_WORD.text.ja.length).toBeGreaterThan(0)
    expect(DEFAULT_TASK_GROUP_NAME_WORD.text.ja).toBe(DEFAULT_TASK_GROUP_NAME_WORD.text.en)
  })

  it('⭐ AT-55 scopes order to siblings under the same parent, which is what 末子 is measured against', () => {
    // Why: Alpha and AlphaChild may share order 0 because AT-55 scopes order per
    // parent, so the last child at level 0 is read against the other roots only.
    const at55 = unbroken(readRepoFile(
      join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'),
      'utf8',
    ))
    expect(at55).toContain('| AT-55 | `TaskGroup` | `order` |')
    expect(at55).toContain('同じ親の下での並び')
  })
})

// Spec: T-051, HF-17, HF-14, HR-8
describe('表 T-051 HF-17 and HF-14 (MUST): the press raises the task group at once', () => {
  for (const language of ['ja', 'en'] as const) {
    // Spec: IMPS-1952
    it(`⭐⭐ HF-17 at 段 0: a new root task group appears, last among the roots, named from the dictionary (${language})`, () => {
      const built = stage(language)
      const before = built.rows()
      const rootsBefore = before.filter((one) => one.parentId === null)
      const highestRootOrder = Math.max(...rootsBefore.map((one) => one.order))

      built.press(HEAD_ADD_TASK_GROUP, null)

      const after = built.rows()
      expect(after, 'exactly one task group was raised').toHaveLength(before.length + 1)
      const created = newTaskGroupSince(before, after)
      expect(created.parentId, '足したタスクグループは最も浅い段の末子 -- no parent, like the other roots').toBeNull()
      expect(created.name, 'named from FR-038s dictionary, not left empty').toBe(
        DEFAULT_TASK_GROUP_NAME_WORD.text[language],
      )
      expect(created.order, '末子: after every root that stood before the press').toBeGreaterThan(
        highestRootOrder,
      )
    })
  }

  it('⭐⭐ HF-14 on an existing task group: a new child appears under it, named from the same dictionary', () => {
    const built = stage()
    const before = built.rows()

    built.press(ADD_CHILD_TASK_GROUP, ALPHA)

    const after = built.rows()
    expect(after, 'exactly one task group was raised').toHaveLength(before.length + 1)
    const created = newTaskGroupSince(before, after)
    expect(created.parentId, 'HR-8: 足す先は配下 -- under the pressed task group, not beside it').toBe(ALPHA)
    expect(created.name).toBe(DEFAULT_TASK_GROUP_NAME_WORD.text.ja)
  })

  it('⛔ neither press needs a second input to create the task group -- one press is the whole operation', () => {
    // Why: press() sends only pointer down and up, so a changed count proves one
    // press is the whole operation, with no later Enter.
    const built = stage()
    const before = built.rows()
    built.press(HEAD_ADD_TASK_GROUP, null)
    expect(built.rows()).toHaveLength(before.length + 1)
  })
})

// Spec: HF-17, HF-14, FR-085, FR-072, FR-091, MK-13, AT-53
// Why: the selection of the existing text is not asserted: the focus seam carries
// only the row ID.
describe('DFC-243 (利用者の裁定 2026-09-03): adding a task group feels exactly like renaming one', () => {
  it('⭐⭐ HF-17: the press opens the panel already turned to the new task group, asking to focus AT-53', () => {
    const built = stage()
    expect(built.panel(), 'nothing is open before the press').toBeNull()
    const before = built.rows()

    built.press(HEAD_ADD_TASK_GROUP, null)

    const created = newTaskGroupSince(before, built.rows())

    expect(built.panel(), 'FR-072/HF-14 (MUST): the panel is up').not.toBeNull()
    const field = fieldOf(built.panel(), TASK_GROUP_NAME_FIELD)
    expect(field, `the panel drew ${TASK_GROUP_NAME_FIELD}`).toBeDefined()
    expect(field?.text, 'the panel shows the task group it just raised').toBe(created.name)
    expect(field?.isEditable, 'FR-085 (MUST): the name can be edited here').toBe(true)
    expect(built.screen.focusAsks(), 'the same ask FR-085 sends for a double click').toEqual([
      TASK_GROUP_NAME_FIELD,
    ])
  })

  it('⭐⭐ HF-14: the same is true one level down, adding a child under an existing task group', () => {
    const built = stage()

    built.press(ADD_CHILD_TASK_GROUP, ALPHA)

    const field = fieldOf(built.panel(), TASK_GROUP_NAME_FIELD)
    expect(field?.isEditable).toBe(true)
    expect(built.screen.focusAsks()).toEqual([TASK_GROUP_NAME_FIELD])
  })

  it('⭐⭐⭐ the literal comparison: HF-17s press and FR-085s rename ask the SAME thing of the SAME field', () => {
    const added = stage()
    added.press(HEAD_ADD_TASK_GROUP, null)

    const renamed = stage()
    renamed.doubleClickName(ALPHA)

    expect(added.screen.focusAsks(), 'HF-17s ask').toEqual([TASK_GROUP_NAME_FIELD])
    expect(renamed.screen.focusAsks(), 'FR-085s ask, for comparison').toEqual([TASK_GROUP_NAME_FIELD])
    expect(added.screen.focusAsks()).toEqual(renamed.screen.focusAsks())

    const addedField = fieldOf(added.panel(), TASK_GROUP_NAME_FIELD)
    const renamedField = fieldOf(renamed.panel(), TASK_GROUP_NAME_FIELD)
    expect(addedField?.isEditable).toBe(true)
    expect(renamedField?.isEditable).toBe(true)
    expect(addedField?.isEditable).toBe(renamedField?.isEditable)
    // Why: the text is not expected to match: one holds the dictionary word, the
    // other Alpha's name; only the shape of the road must match.
    expect(addedField?.text).not.toBe(renamedField?.text)
  })

  it('⭐⭐⭐ the same comparison holds for HF-14 (adding a child) against the rename road', () => {
    const added = stage()
    added.press(ADD_CHILD_TASK_GROUP, ALPHA)

    const renamed = stage()
    renamed.doubleClickName(BETA)

    expect(added.screen.focusAsks()).toEqual(renamed.screen.focusAsks())
    expect(fieldOf(added.panel(), TASK_GROUP_NAME_FIELD)?.isEditable).toBe(
      fieldOf(renamed.panel(), TASK_GROUP_NAME_FIELD)?.isEditable,
    )
  })

  it('⛔ a plain press that only chooses a task group (no double click, no add) asks for no field', () => {
    // Why: the control case: a build that asked for the field on every press on the
    // Task Group Panel would otherwise pass every case above.
    const built = stage()
    built.aim(null, BETA)
    built.send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
    built.send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
    expect(built.screen.focusAsks(), 'a single press on a task group asks for no field').toEqual([])
  })
})
