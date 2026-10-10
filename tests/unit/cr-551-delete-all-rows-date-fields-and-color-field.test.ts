// CR-551 items 13-16: deleting every task group from the head (HF-20, CD-6, QN-10), the date fields and the color rows

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'
import {
  byRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  type FakeElement,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { NO_MODS, pointerOf, taskGroupDocument, taskOf, SCREEN } from './cr-541-stage'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  questions: { rowId: string; text: { ja: string } }[]
  confirmation: { answer: string; text: { ja: string } }[]
  colorNames: { spelling: string; text: { ja: string } }[]
  colorField: { part: string; text: { ja: string } }[]
}

const verticalIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}
const numberOf = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}
const hexIn = (cell: string): string => (/#[0-9a-fA-F]{6}/.exec(cell)?.[0] ?? '').toLowerCase()
const wordOf = (part: string): string => WORDS.colorField.find((one) => one.part === part)?.text.ja ?? ''
const colorWord = (spelling: string): string => WORDS.colorNames.find((one) => one.spelling === spelling)?.text.ja ?? ''

// see S-335, S-336, S-337, S-338
const S_335 = numberOf(verticalIn('T-206', 'S-335').by['既定'] ?? '')
const S_336 = hexIn(verticalIn('T-236', 'S-336').by['明るいテーマ'] ?? '')
const S_337 = hexIn(verticalIn('T-236', 'S-337').by['明るいテーマ'] ?? '')
const S_338 = numberOf(verticalIn('T-206', 'S-338').by['既定'] ?? '')

// see T-294
const T_294 = specTable('T-294').rows.map((row) => bare(row.cells[1] ?? ''))
const TRANSPARENT = bare(verticalIn('T-294', 'S-324').cells[1] ?? '')
const BLACK = bare(verticalIn('T-294', 'S-315').cells[1] ?? '')
const NAMED = T_294.filter((one) => one !== TRANSPARENT)


const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const partOn = (part: string, entry: string | null, taskGroupId: string | null = null): ScreenPart =>
  ({ part, entry, format: null, taskGroupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null }) as unknown as ScreenPart

interface Bench {
  readonly loop: FrameLoop
  readonly built: Stage
  press(part: string, entry: string | null, taskGroupId?: string | null): void
  doubleClickAt(x: number, y: number, part?: ScreenPart | null): void
  key(key: string): void
  frame(): void
  view(): ScreenView
}

function bench(document: Record<string, unknown>): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': SCREEN.appHeaderHeight })
  const drawn = surfaceOf(built)
  const views: ScreenView[] = []
  let aimed: ScreenPart | null = null
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
      drawn.showScreenView(view)
    },
    readDialogueInput: () => drawn.readDialogueInput(),
    readFieldCommit: () => drawn.readFieldCommit(),
    readFieldEditNotices: () => (drawn as unknown as { readFieldEditNotices?: () => unknown[] }).readFieldEditNotices?.() ?? [],
    readScreenPartAt: () => aimed,
  } as unknown as ScreenSurface
  const loop = frameLoop({ showSvg: () => undefined } as never, document as never, SCREEN, { surface, language: 'ja' })
  drain()
  const send = (input: Parameters<FrameLoop['receiveInput']>[0]): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    built,
    press: (part, entry, taskGroupId = null) => {
      aimed = partOn(part, entry, taskGroupId)
      send(pointerOf('down', 80, 120))
      send(pointerOf('up', 80, 120))
      aimed = null
    },
    doubleClickAt: (x, y, part = null) => {
      aimed = part
      send(pointerOf('down', x, y))
      send(pointerOf('up', x, y))
      send({ ...pointerOf('down', x, y), clickCount: 2 } as never)
      send({ ...pointerOf('up', x, y), clickCount: 2 } as never)
      aimed = null
    },
    key: (key) => send({ kind: 'key', key, modifiers: { ...NO_MODS } }),
    frame: () => send(pointerOf('move', 5, SCREEN.height - 20)),
    view: () => views[views.length - 1] as ScreenView,
  }
}

// WHY: the same event raiser tests/unit/property-date-field-delete-empties-the-date.test.ts uses on this fake.
function raise(built: Stage, node: FakeElement, type: string, extra: Record<string, unknown> = {}): FakeEvent {
  const event = {
    type,
    key: '',
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: null,
    relatedTarget: null,
    defaultPrevented: false,
    preventDefault(): void {
      ;(this as { defaultPrevented: boolean }).defaultPrevented = true
    },
    stopPropagation(): void {},
    ...extra,
  } as unknown as FakeEvent
  let at: FakeElement | null = node
  while (at !== null) {
    for (const one of [...built.world.registrations]) {
      if (one.node === at && one.type === type) {
        ;(event as { currentTarget: FakeElement | null }).currentTarget = at
        one.listener(event)
      }
    }
    at = at.parentNode
  }
  return event
}

const PROPERTIES_PANEL = bare(verticalIn('T-103', 'U-25').by['確定名（英）'] ?? '')

interface TaskGroupSeed {
  readonly id: string
  readonly parentId: string | null
}

function documentWith(rows: readonly TaskGroupSeed[], names: readonly string[], visual: Record<string, unknown> | null = null) {
  const document = taskGroupDocument(rows, { progressMarkerVisible: false })
  document.schedule.tasks = rows.map((_one, index) =>
    taskOf(index + 1, { name: names[index] ?? null, start: '2026-04-06T08:00:00', finish: '2026-04-30T17:00:00' }),
  )
  if (visual !== null) {
    document.schedule.taskVisuals = [
      { taskUid: 1, shapeKind: null, milestoneGlyph: null, fillColor: null, strokeColor: null, strokeWidthPx: null, ...visual },
    ]
  }
  return document
}

// see MK-13
function panelOnTask(document: Record<string, unknown>): Bench {
  const built = bench(document)
  const placement = built.loop.current()?.layout.placements.find((one) => one.taskUid === 1)
  if (placement === undefined) throw new Error('the task is not drawn')
  built.doubleClickAt(placement.x + placement.width / 2, placement.y + placement.height / 2)
  if (built.view().propertiesPanel === null) throw new Error('MK-13 did not put the property panel up')
  return built
}

const panelRoot = (built: Bench): FakeElement => byRole(built.built.root(), PROPERTIES_PANEL)[0] as FakeElement
const inField = (built: Bench, row: string): FakeElement[] =>
  selfAndDescendants(panelRoot(built)).filter((one) => one.getAttribute('data-field-row') === row)


const HF_20 = '`HF-10` の操作子の並びに、すべてのタスクグループを消す操作子を 1 つ置くこと（MUST）'
const CD_6_ONE_TASK_GROUP = 'タスクグループが 0 になるので、本表の後の段により、同じ操作の一部として深さ `L1` のタスクグループが 1 つ作られる（取り消し 1 回で戻る）'
const E_36_HEAD = '頭が持つ入口が 5 つ、タスクグループが持つ入口が 7 つであることは、この 1 つの違いから出る（MUST）'

const QN_10 = WORDS.questions.find((one) => one.rowId === 'QN-10')?.text.ja ?? ''
const YES = (WORDS.confirmation.find((one) => one.answer === 'proceed')?.text.ja ?? '').slice(0, 1).toUpperCase()

const TASK_GROUPS: readonly TaskGroupSeed[] = [
  { id: 'g1', parentId: null },
  { id: 'g2', parentId: 'g1' },
  { id: 'g3', parentId: null },
]
const NAMES = ['Alpha', 'Beta', 'Gamma']

// see T-109, HF-10, HF-12, HF-16, HF-17, HF-20
const HEAD_ENTRANCES = ['IC-74', 'IC-78', 'IC-92', 'IC-93', 'IC-106']
const TASK_GROUP_ONLY_ENTRANCES = ['IC-59', 'IC-60']

describe('HF-20 / CD-6 / QN-10 -- the head deletes every task group', () => {
  it('HF-20 / CD-6 / E-36 still say: すべてのタスクグループを消す操作子 / 深さ L1 のタスクグループが 1 つ作られる / 頭が持つ入口が 5 つ', () => {
    expect(REQUIREMENTS).toContain(HF_20)
    expect(REQUIREMENTS).toContain(CD_6_ONE_TASK_GROUP)
    expect(REQUIREMENTS).toContain(E_36_HEAD)
    expect(QN_10).not.toBe('')
    for (const icon of HEAD_ENTRANCES) expect(bare(verticalIn('T-109', icon).cells[0] ?? '')).toBe('Task Group Panel')
  })

  it('E-36: 頭が持つ入口が 5 つ -- the head carries IC-106 and none of the hide / pin entrances', () => {
    // see HF-20, E-36, IC-106
    const built = bench(documentWith(TASK_GROUPS, NAMES))
    const panel = byRole(built.built.root(), 'Task Group Panel')[0] as FakeElement
    const inRow = (node: FakeElement): boolean => {
      for (let at = node.parentNode; at !== null; at = at.parentNode) if (at.getAttribute('data-group-id') !== null) return true
      return false
    }
    const head = selfAndDescendants(panel)
      .filter((one) => one.getAttribute('data-icon') !== null && !inRow(one))
      .map((one) => one.getAttribute('data-icon') as string)
    expect([...new Set(head)].sort()).toEqual([...HEAD_ENTRANCES].sort())
    for (const icon of TASK_GROUP_ONLY_ENTRANCES) expect(head).not.toContain(icon)
  })

  it('QN-10 / NT-7: pressing IC-106 asks QN-10 and lists the task names before anything is deleted', () => {
    // see HF-20, QN-10, NT-7
    const built = bench(documentWith(TASK_GROUPS, NAMES))
    const before = built.loop.document()
    built.press('Task Group Panel', 'IC-106')
    const asked = built.view().confirmation
    // WHY: the confirmation carries the T-234 row as its question and the dictionary words as its text.
    expect(asked?.question).toBe('QN-10')
    expect(asked?.text).toBe(QN_10)
    expect((asked?.items ?? []).map((one) => one.name).sort()).toEqual([...NAMES].sort())
    expect(built.loop.document(), 'nothing is deleted before the answer').toBe(before)
  })

  it('CD-6: 深さ L1 のすべてのタスクグループに CD-2 を当てた和 -- every task group and every task goes, and one L1 task group is made', () => {
    // see CD-6, CD-2
    const built = bench(documentWith(TASK_GROUPS, NAMES))
    built.press('Task Group Panel', 'IC-106')
    built.key(YES)
    const schedule = built.loop.document().schedule
    expect(schedule.tasks).toEqual([])
    expect(schedule.taskGroups.length, CD_6_ONE_TASK_GROUP).toBe(1)
    expect(schedule.taskGroups[0]?.parentId, 'the made task group is at depth L1').toBeNull()
    for (const id of TASK_GROUPS.map((one) => one.id)) {
      expect(schedule.taskGroups.map((one) => one.id)).not.toContain(id)
    }
  })

  it('CD-6: 取り消し 1 回で戻る -- one undo brings every task group and task back', () => {
    // see CD-6, SK-6
    const built = bench(documentWith(TASK_GROUPS, NAMES))
    const before = built.loop.document().schedule
    built.press('Task Group Panel', 'IC-106')
    built.key(YES)
    expect(built.loop.document().schedule.tasks, 'premise: the answer deleted every task').toEqual([])
    built.press('App Header', 'IC-5')
    const after = built.loop.document().schedule
    expect(after.tasks.map((one) => one.name)).toEqual(before.tasks.map((one) => one.name))
    expect(after.taskGroups.map((one) => one.id)).toEqual(before.taskGroups.map((one) => one.id))
  })
})


const FR_006_DELETE = '日付の欄（表 T-016 の入力の型が `日付` の行）を編集しているあいだに `Delete` か `Backspace` を押したときは、欄の字をすべて消して空にすること（MUST）'
const FR_006_EMPTY_COMMIT =
  '空のまま確定したときは、`start` ／ `finish` の欄なら何も書かずに欄を元の値へ戻し、それ以外の日付の欄なら `null` を書くこと（MUST）'
const FR_006_COLOR_LAST =
  '見た目の行（表 T-016 の入力の型に `色` を含む行と、塗りの透過率・枠線の幅の行）は、同じ対象の行の並びの末尾に置くこと（MUST）'
const FR_006_WIDTH_AFTER =
  '見た目の行どうしは、どの対象でも 枠線の幅 → 枠線の色 → 塗りの色 → 塗りの透過率 → 字の色 の順に並べ、1 つの行に色を 1 つだけ持たせること（MUST）'
// WHY: the columns of the look rows in FR-006's order; TaskGroup.color is the task group band's fill.
const LOOK_ORDER: readonly string[] = ['strokeWidthPx', 'strokeColor', 'fillColor', 'fillTransparencyPercent', 'textColor']
const LOOK_ALIAS: Readonly<Record<string, string>> = { color: 'fillColor' }

const T_016 = specTable('T-016')
const kindOf = (row: (typeof T_016.rows)[number]): string => row.by['入力の型'] ?? ''
const subjectOf = (row: (typeof T_016.rows)[number]): string => bare(row.by['対象'] ?? '')
const columnsOf = (row: (typeof T_016.rows)[number]): readonly string[] => bareAll(row.cells[0] ?? '')
const shownForOf = (row: (typeof T_016.rows)[number]): string => bare(row.by['出す種類'] ?? '')
// see FR-006, T-016
// WHY: the Task outline width row is the Task row whose column is strokeWidthPx.
const isTaskWidthRow = (row: (typeof T_016.rows)[number]): boolean =>
  subjectOf(row) === 'Task' && columnsOf(row).length === 1 && columnsOf(row)[0] === 'strokeWidthPx'

function dateEntry(built: Bench, row: string, column: string): FakeElement {
  const entries = inField(built, row).filter((one) => one.tagName === 'INPUT')
  const found = entries.find((one) => (one.getAttribute('data-field-column') ?? column) === column && one.getAttribute('type') === 'date')
  const chosen = found ?? entries[column === 'finish' ? 1 : 0]
  if (chosen === undefined) throw new Error(`the panel drew no date entry for ${row} ${column}`)
  // WHY: a browser reflects the type attribute onto the property; the shared fake does not.
  ;(chosen as unknown as { type: string | null }).type = chosen.getAttribute('type')
  return chosen
}

function pressInDate(built: Bench, row: string, column: string, key: string, value: string): FakeElement {
  const entry = dateEntry(built, row, column)
  entry.value = value
  entry.focus()
  raise(built.built, entry, 'focusin')
  raise(built.built, entry, 'keydown', { key })
  return entry
}

describe('FR-006 -- the date fields', () => {
  it('FR-006 still says: Delete か Backspace ... 空に / null を許す列なら null / start ・ finish は元の値へ / 色の行は末尾', () => {
    expect(REQUIREMENTS).toContain(FR_006_DELETE)
    expect(REQUIREMENTS).toContain(FR_006_EMPTY_COMMIT)
    expect(REQUIREMENTS).toContain(FR_006_COLOR_LAST)
    expect(REQUIREMENTS).toContain(FR_006_WIDTH_AFTER)
  })

  for (const key of ['Delete', 'Backspace']) {
    it(`FR-006 E-28: ${key} while editing a date field empties it (欄の字をすべて消して空にする)`, () => {
      // see FR-006
      const document = documentWith([{ id: 'g1', parentId: null }], ['Alpha'])
      document.schedule.tasks[0] = { ...document.schedule.tasks[0], deadline: '2026-05-08T17:00:00' }
      const built = panelOnTask(document)
      const entry = pressInDate(built, 'PR-10', 'deadline', key, '2026-05-08')
      expect(entry.value).toBe('')
    })
  }

  it('FR-006 E-41: それ以外の日付の欄なら null を書く -- deadline is written null', () => {
    // see FR-006, T-016, PR-10
    const document = documentWith([{ id: 'g1', parentId: null }], ['Alpha'])
    document.schedule.tasks[0] = { ...document.schedule.tasks[0], deadline: '2026-05-08T17:00:00' }
    const built = panelOnTask(document)
    pressInDate(built, 'PR-10', 'deadline', 'Delete', '2026-05-08')
    built.frame()
    expect(built.loop.document().schedule.tasks[0]?.deadline).toBeNull()
  })

  for (const [column, row] of [['start', 'PR-3'], ['finish', 'PR-47']] as const) {
    it(`FR-006 E-41: ${column} の欄 (${row}) なら何も書かずに欄を元の値へ戻す`, () => {
      // see FR-006, T-016, PR-3, PR-47
      const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
      const before = built.loop.document().schedule.tasks[0]?.[column]
      const shownBefore = built.view().propertiesPanel?.fields.find((one) => one.row === row)?.text
      pressInDate(built, row, column, 'Delete', String(before).slice(0, 10))
      built.frame()
      expect(built.loop.document().schedule.tasks[0]?.[column], '何も書かずに').toBe(before)
      expect(built.view().propertiesPanel?.fields.find((one) => one.row === row)?.text, '欄を元の値へ戻す').toBe(shownBefore)
    })
  }
})

describe('FR-006 E-28 -- the look rows are last in their object order', () => {
  it('FR-006: 見た目の行は同じ対象の行の並びの末尾、枠線の幅 → 枠線の色 → 塗り → 透過率 → 字の色 -- table T-016 (every object)', () => {
    // see FR-006, T-016
    const lookRank = (row: (typeof T_016.rows)[number]): number => {
      const columns = columnsOf(row)
      if (columns.length !== 1) return kindOf(row).includes('色') ? Number.NaN : -1
      const column = columns[0] ?? ''
      return LOOK_ORDER.indexOf(LOOK_ALIAS[column] ?? column)
    }
    const subjects = [...new Set(T_016.rows.map(subjectOf))]
    for (const subject of subjects) {
      const all = T_016.rows.filter((row) => subjectOf(row) === subject)
      const listed = `${subject}: ${all.map((row) => row.id).join(' ')}`
      const ranks = all.map(lookRank)
      expect(ranks.some(Number.isNaN), `${FR_006_WIDTH_AFTER} (one color per row); ${listed}`).toBe(false)
      const first = ranks.findIndex((rank) => rank >= 0)
      if (first < 0) continue
      const tail = ranks.slice(first)
      expect(tail.every((rank) => rank >= 0), `${FR_006_COLOR_LAST}; ${listed}`).toBe(true)
      expect(tail, `${FR_006_WIDTH_AFTER}; ${listed}`).toEqual([...tail].sort((a, b) => a - b))
    }
  })

  it('FR-006: the panel on a (non-milestone) Task shows the outline width row, then its color rows, last', () => {
    // STEP: the rows T-016 shows for this kind (FR-006)
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const rows = built.view().propertiesPanel?.fields.map((one) => one.row) ?? []
    const taskRows = T_016.rows.filter((row) => subjectOf(row) === 'Task' && ['task', 'both'].includes(shownForOf(row)))
    const colorRows = taskRows.filter((row) => kindOf(row).includes('色')).map((row) => row.id)
    const widthRow = taskRows.filter(isTaskWidthRow).map((row) => row.id)
    expect(colorRows.length, 'premise: a task shows color rows').toBeGreaterThan(0)
    const tail = [...widthRow, ...colorRows]
    expect(rows.slice(rows.length - tail.length)).toEqual(tail)
  })
})


const CV_9_TWO_ROWS = '⭐ 欄は見本の 2 段だけとし、項目名は 1 段目の左に置くこと（MUST）（`FR-006`）'
const CV_9_ORDER =
  '⭐ 並べ方は次のとおりとすること（MUST）: ① 1 段目 —— 透明を除く名を同表の行の順に前から `_assets/tbl-settings.md` の 表 T-206 の `S-338` 個並べ、その後ろにテーマに戻す入口を置く。'
const CV_9_ORDER_SECOND_ROW = '② 2 段目 —— 残りの名を同じ順に並べ、その後ろに透明の入口、カスタムカラーの入口をこの順に置く。'
const CV_9_NO_WORD = '⭐ 入口はどれも名の見本と同じ寸法の見本とし、語を見本の外に書いてはならない（MUST NOT）'
const CV_9_TRANSPARENT_WORD =
  '透明の入口は、塗りの欄（`fillColor` と `TaskGroup.color`）では塗りの無いことを、線の欄（`strokeColor`）では線の無いことを言う語'
const CV_9_CHOSEN =
  '⭐ 欄の値を示す見本を、太い縁で囲むこと（MUST） —— 値が `null` ならテーマに戻す入口、透明なら透明の入口、パレット色ならその名の見本、カスタムカラーならカスタムカラーの入口である。'
const CV_9_THEME =
  'テーマに戻す入口は `CV-5` の「戻す入口」（`FR-007`）であり、押したらその欄の色をテーマ追随（`null`）へ戻すこと（MUST）'
const CV_9_HOST_INPUT = '閲覧環境の色の入力（`input type=color`）は、カスタムカラーの入口を押したときにだけ出すこと（MUST）'
const CV_9_EMPTY_SLOT = 'その欄に並べない名と入口（下の 2 つ）の場所は空けたままとし、後ろの名や入口を詰めてはならない（MUST NOT）'
const CV_9_CUSTOM_VALUE =
  '⭐ 欄の値がカスタムカラーのときは、カスタムカラーの入口の見本を、`CV-3` で決まった、いま描いている明暗の値で塗り、そのツールチップに値を添えること（MUST）'
const CV_9_CHECKER =
  '透明の入口の見本は市松とする —— 1 辺を 表 T-206 の `S-335` 個のますに割り、ますを 表 T-236 の `S-336` と `S-337` で交互に塗る。'

const THEME_GLYPH = wordOf('themeGlyph')
const CUSTOM_GLYPH = wordOf('customGlyph')
const THEME_HINT = wordOf('themeHint')
const NO_FILL_WORD = wordOf('noFill')
const NO_LINE_WORD = wordOf('noLine')
const S_530 = numberOf(verticalIn('T-206', 'S-530').by['既定'] ?? '')
const S_531 = numberOf(verticalIn('T-206', 'S-531').by['既定'] ?? '')

// see T-016
// WHY: the Task color rows are found by the column they edit, whatever row id they carry.
const taskRowOf = (column: string): string => {
  const found = T_016.rows.find((row) => subjectOf(row) === 'Task' && columnsOf(row).length === 1 && columnsOf(row)[0] === column)
  if (found === undefined) throw new Error(`table T-016 has no Task row for ${column}`)
  return found.id
}
const TASK_FILL = taskRowOf('fillColor')
const TASK_LINE = taskRowOf('strokeColor')

const tipOf = (one: FakeElement): string => one.getAttribute('title') ?? ''

// see CV-9
// WHY: one grid per color field holds both rows; a cell reads as its name, an entrance, or '' for an empty place.
function gridOf(built: Bench, row: string): FakeElement {
  const field = inField(built, row)[0]
  if (field === undefined) throw new Error(`the panel drew no field ${row}`)
  const grids = selfAndDescendants(field).filter((one) => /grid/.test(styleMap(one).get('display') ?? ''))
  if (grids.length !== 1) throw new Error(`the field ${row} lays out ${grids.length} grids, not one`)
  return grids[0] as FakeElement
}
const cellOf = (one: FakeElement): string => {
  if (one.getAttribute('data-color-theme-entry') !== null) return 'theme'
  if (one.getAttribute('data-color-custom-entry') !== null) return 'custom'
  if (one.getAttribute('data-color-transparent-slot') !== null) return 'transparent slot'
  return one.getAttribute('data-color-choice') ?? ''
}
const cellsOf = (built: Bench, row: string): string[] => gridOf(built, row).children.map(cellOf)
const entranceOf = (built: Bench, row: string, cell: string): FakeElement => {
  const found = gridOf(built, row).children.find((one) => cellOf(one) === cell)
  if (found === undefined) throw new Error(`the field ${row} draws no ${cell} cell`)
  return found
}
const chosenOf = (built: Bench, row: string): string[] =>
  gridOf(built, row).children.filter((one) => one.getAttribute('data-color-chosen') === 'true').map(cellOf)

// WHY: CV-9's two rows, read in order: S-338 names and the theme entrance, then the rest, transparent, custom.
const twoTiers = (): string[] => {
  const first = [...NAMED.slice(0, S_338), 'theme']
  const second = [...NAMED.slice(S_338), TRANSPARENT, 'custom']
  const width = Math.max(first.length, second.length)
  return [...first, ...Array<string>(width - first.length).fill(''), ...second]
}

// WHY: the shared fake has no dispatchEvent, so the change a browser would bubble from the pressed
// entrance is raised here after the click, as the host would deliver it.
function pressEntry(built: Bench, node: FakeElement): void {
  raise(built.built, node, 'click')
  raise(built.built, node, 'change')
}

function taskGroupPanelBox(built: Bench): string {
  const box = built.view().taskGroupPanel.titles[0]?.box
  if (box === undefined) throw new Error('the task group title is not drawn')
  built.doubleClickAt(box.x + box.width / 2, box.y + box.height / 2, partOn('Task Group Panel', null, 'g1'))
  const fields = built.view().propertiesPanel?.fields ?? []
  const found = fields.find((one) => one.controls.some((control) => control.key.holder === 'taskGroup' && control.key.column === 'color'))
  if (found === undefined) throw new Error('the task group properties panel shows no task group color')
  return found.row
}

describe('CV-9 -- the color field', () => {
  it('CV-9 still says: 2 段だけ / 並べ方 / 語を見本の外に書かない / 透明の入口の語 / 太い縁 / テーマ追随へ戻す / 押したときにだけ / 空けたまま / ツールチップに値 / 市松', () => {
    for (const clause of [
      CV_9_TWO_ROWS,
      CV_9_ORDER,
      CV_9_ORDER_SECOND_ROW,
      CV_9_NO_WORD,
      CV_9_TRANSPARENT_WORD,
      CV_9_CHOSEN,
      CV_9_THEME,
      CV_9_HOST_INPUT,
      CV_9_EMPTY_SLOT,
      CV_9_CUSTOM_VALUE,
      CV_9_CHECKER,
    ]) {
      expect(REQUIREMENTS).toContain(clause)
    }
    expect([THEME_GLYPH, CUSTOM_GLYPH, THEME_HINT, NO_FILL_WORD, NO_LINE_WORD].every((one) => one !== '')).toBe(true)
  })

  it(`${CV_9_ORDER} -- the task fill field is two rows of one grid`, () => {
    // see CV-9, S-338, T-294
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const cells = twoTiers()
    expect((styleMap(gridOf(built, TASK_FILL)).get('grid-template-columns') ?? '').replace(/\s/g, '')).toMatch(
      new RegExp(`^repeat\\(${cells.length / 2},`),
    )
    expect(cellsOf(built, TASK_FILL), CV_9_TWO_ROWS).toEqual(cells)
  })

  it(`${CV_9_TWO_ROWS} -- the line holds the name, then the grid; no sides line is drawn`, () => {
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { fillColor: '#aabbcc/' }))
    const field = inField(built, TASK_FILL)[0] as FakeElement
    const name = built.view().propertiesPanel?.fields.find((one) => one.row === TASK_FILL)?.name ?? ''
    expect(field.children[0]?.textContent, 'the name is the first thing on the line').toBe(name)
    const drawn = selfAndDescendants(field)
    expect(drawn.filter((one) => one.getAttribute('data-color-sides') !== null || one.getAttribute('data-color-swatch') !== null)).toEqual([])
  })

  it('CV-9 (2): transparent then custom closes the second row of every color field (task fill, task line, task group color)', () => {
    // see CV-9, CV-5, FR-007
    const task = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    for (const row of [TASK_FILL, TASK_LINE]) expect(cellsOf(task, row).slice(-2), row).toEqual([TRANSPARENT, 'custom'])
    const row = bench(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    expect(cellsOf(row, taskGroupPanelBox(row)).slice(-2)).toEqual([TRANSPARENT, 'custom'])
  })

  it(`${CV_9_NO_WORD} -- ${CV_9_TRANSPARENT_WORD}: no fill on fillColor and TaskGroup.color, no line on strokeColor`, () => {
    // see CV-9, FR-038, IN-3
    const task = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    for (const [row, word] of [
      [TASK_FILL, NO_FILL_WORD],
      [TASK_LINE, NO_LINE_WORD],
    ] as const) {
      const entrance = entranceOf(task, row, TRANSPARENT)
      expect(tipOf(entrance), row).toBe(word)
      expect((entrance.textContent ?? '').trim(), `${row}: no word beside the swatch`).toBe('')
    }
    const row = bench(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    expect(tipOf(entranceOf(row, taskGroupPanelBox(row), TRANSPARENT)), 'TaskGroup.color').toBe(NO_FILL_WORD)
  })

  it('CV-9: the theme entrance carries the glyph T and the themeHint tooltip; the custom one the glyph O', () => {
    // see CV-9, FR-007, FR-038
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    for (const row of [TASK_FILL, TASK_LINE]) {
      const theme = entranceOf(built, row, 'theme')
      expect((theme.textContent ?? '').trim()).toBe(THEME_GLYPH)
      expect([theme.getAttribute('title'), theme.getAttribute('aria-label')]).toEqual([THEME_HINT, THEME_HINT])
      expect((entranceOf(built, row, 'custom').textContent ?? '').trim()).toBe(CUSTOM_GLYPH)
    }
  })

  for (const [what, visual, row, chosen] of [
    ['null', null, TASK_FILL, 'theme'],
    ['a palette name', { strokeColor: 'red' }, TASK_LINE, 'red'],
    ['transparent', { fillColor: TRANSPARENT }, TASK_FILL, TRANSPARENT],
    ['a custom color', { fillColor: '#aabbcc/#112233' }, TASK_FILL, 'custom'],
  ] as const) {
    it(`${CV_9_CHOSEN} -- a value of ${what} outlines the ${chosen} cell alone (S-530, S-531)`, () => {
      // see CV-9, S-530, S-531
      const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], visual))
      expect(chosenOf(built, row)).toEqual([chosen])
      const cell = entranceOf(built, row, chosen)
      expect(cell.getAttribute('aria-pressed')).toBe('true')
      expect(styleMap(cell).get('outline') ?? '').toContain(`${S_530}px`)
      expect(styleMap(cell).get('outline-offset') ?? '').toBe(`${S_531}px`)
    })
  }

  it('CV-9 control: pressing a named swatch in this harness writes that name (CV-1)', () => {
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { strokeColor: 'red' }))
    pressEntry(built, entranceOf(built, TASK_LINE, 'blue'))
    built.frame()
    expect(built.loop.document().schedule.taskVisuals.find((one) => one.taskUid === 1)?.strokeColor).toBe('blue')
  })

  for (const [name, column, row, value] of [
    ['a custom color', 'fillColor', TASK_FILL, '#aabbcc/#112233'],
    ['a palette name', 'strokeColor', TASK_LINE, 'red'],
  ] as const) {
    it(`CV-9 / CV-5 E-44: 押したらその欄の色をテーマ追随（null）へ戻す -- ${name} on ${column}, undone in one step`, () => {
      // see CV-9, CV-5, SK-6
      const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { [column]: value }))
      const visual = (): Record<string, unknown> =>
        (built.loop.document().schedule.taskVisuals.find((one) => one.taskUid === 1) ?? {}) as Record<string, unknown>
      expect(visual()[column], 'premise: the color is set').toBe(value)
      pressEntry(built, entranceOf(built, row, 'theme'))
      built.frame()
      expect(visual()[column] ?? null, CV_9_THEME).toBeNull()
      built.press('App Header', 'IC-5')
      expect(visual()[column], 'one undo brings the color back').toBe(value)
    })
  }

  it(`${CV_9_EMPTY_SLOT} -- the task group color field keeps black's place empty and every later cell in its place`, () => {
    // see CV-9, S-315
    const built = bench(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const rowColor = taskGroupPanelBox(built)
    const fields = built.view().propertiesPanel?.fields ?? []
    expect(fields[fields.length - 1]?.row, 'FR-006: the color row is last for a TaskGroup too').toBe(rowColor)
    const expected = twoTiers().map((cell) => (cell === BLACK ? '' : cell))
    expect(expected, 'premise: black is one of the names').not.toEqual(twoTiers())
    expect(cellsOf(built, rowColor), CV_9_EMPTY_SLOT).toEqual(expected)
  })

  it('CV-9 (JDG-397): 閲覧環境の色の入力は、カスタムカラーの入口を押したときにだけ出す', () => {
    // see CV-9
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const hostInputs = (): FakeElement[] =>
      inField(built, TASK_FILL).flatMap((field) =>
        selfAndDescendants(field).filter((one) => one.tagName === 'INPUT' && one.getAttribute('type') === 'color'),
      )
    expect(hostInputs(), 'before [Custom] is pressed').toEqual([])
    raise(built.built, entranceOf(built, TASK_FILL, 'custom'), 'click')
    expect(hostInputs().length, 'after [Custom] is pressed').toBeGreaterThan(0)
  })

  it(`${CV_9_CUSTOM_VALUE} -- the light value, in upper-case hex, painted and named on the custom entrance`, () => {
    // see CV-9, CV-2, CV-3
    for (const stored of ['#aabbcc/#112233', '#aabbcc/']) {
      const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { fillColor: stored }))
      const custom = entranceOf(built, TASK_FILL, 'custom')
      expect(tipOf(custom), stored).toBe(wordOf('customValue').replace('{value}', '#AABBCC'))
      expect((styleMap(custom).get('background') ?? '').toLowerCase(), stored).toContain('#aabbcc')
    }
  })

  it('CV-9: a name swatch is named by its word, as a tooltip', () => {
    // see CV-9, IN-3
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { strokeColor: 'red' }))
    expect(tipOf(entranceOf(built, TASK_LINE, 'red'))).toBe(colorWord('red'))
  })

  it(`${CV_9_CHECKER} (S-335 cells a side, S-336 / S-337)`, () => {
    // see CV-9, S-335, S-336, S-337
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const swatch = entranceOf(built, TASK_FILL, TRANSPARENT)
    const background = (styleMap(swatch).get('background') ?? '').toLowerCase()
    expect(background).toMatch(/gradient\(/)
    expect(background).toContain(S_336)
    expect(background).toContain(S_337)
    // WHY: a conic checker tile holds 2 x 2 cells; cells a side = 2 x side / tile.
    const side = parseFloat(styleMap(swatch).get('width') ?? '')
    const tile = /\/\s*(?:calc\(([^)]*)\)|([\d.]+[a-z%]*))/.exec(background)
    const tileSize = tile?.[1] !== undefined ? Function(`return (${tile[1].replace(/[a-z%]+/g, '')})`)() as number : parseFloat(tile?.[2] ?? '')
    expect((2 * side) / tileSize, `cells a side in ${background}`).toBeCloseTo(S_335, 3)
  })
})
