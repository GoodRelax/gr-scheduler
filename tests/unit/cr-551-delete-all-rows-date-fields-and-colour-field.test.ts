// CR-551 items 13-16: deleting every row from the head (HF-20, CD-6, QN-10), the date fields and the colour rows

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
import { NO_MODS, pointerOf, rowDocument, taskOf, SCREEN } from './cr-541-stage'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  questions: { rowId: string; text: { ja: string } }[]
  confirmation: { answer: string; text: { ja: string } }[]
  colourNames: { spelling: string; text: { ja: string } }[]
  colourField: { part: string; text: { ja: string } }[]
}

const rowIn = (table: string, id: string) => {
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
const wordOf = (part: string): string => WORDS.colourField.find((one) => one.part === part)?.text.ja ?? ''
const colourWord = (spelling: string): string => WORDS.colourNames.find((one) => one.spelling === spelling)?.text.ja ?? ''

// see S-335, S-336, S-337, S-338
const S_335 = numberOf(rowIn('T-206', 'S-335').by['既定'] ?? '')
const S_336 = hexIn(rowIn('T-236', 'S-336').by['明るいテーマ'] ?? '')
const S_337 = hexIn(rowIn('T-236', 'S-337').by['明るいテーマ'] ?? '')
const S_338 = numberOf(rowIn('T-206', 'S-338').by['既定'] ?? '')

// see T-294
const T_294 = specTable('T-294').rows.map((row) => bare(row.cells[1] ?? ''))
const TRANSPARENT = bare(rowIn('T-294', 'S-324').cells[1] ?? '')
const BLACK = bare(rowIn('T-294', 'S-315').cells[1] ?? '')
const NAMED = T_294.filter((one) => one !== TRANSPARENT)


const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const partOn = (part: string, entry: string | null, rowGroupId: string | null = null): ScreenPart =>
  ({ part, entry, format: null, rowGroupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null }) as unknown as ScreenPart

interface Bench {
  readonly loop: FrameLoop
  readonly built: Stage
  press(part: string, entry: string | null, rowGroupId?: string | null): void
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
    press: (part, entry, rowGroupId = null) => {
      aimed = partOn(part, entry, rowGroupId)
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

const PROPERTIES_PANEL = bare(rowIn('T-103', 'U-25').by['確定名（英）'] ?? '')

interface RowSeed {
  readonly id: string
  readonly parentId: string | null
}

function documentWith(rows: readonly RowSeed[], names: readonly string[], visual: Record<string, unknown> | null = null) {
  const document = rowDocument(rows, { progressMarkerVisible: false })
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


const HF_20 = '`HF-10` の操作子の並びに、すべての行を消す操作子を 1 つ置くこと（MUST）'
const CD_6_ONE_ROW = '行が 0 になるので、本表の後の段により、同じ操作の一部として深さ `L1` の行が 1 つ作られる（取り消し 1 回で戻る）'
const E_36_HEAD = '頭が持つ入口が 5 つ、行が持つ入口が 7 つであることは、この 1 つの違いから出る（MUST）'

const QN_10 = WORDS.questions.find((one) => one.rowId === 'QN-10')?.text.ja ?? ''
const YES = (WORDS.confirmation.find((one) => one.answer === 'proceed')?.text.ja ?? '').slice(0, 1).toUpperCase()

const ROWS: readonly RowSeed[] = [
  { id: 'g1', parentId: null },
  { id: 'g2', parentId: 'g1' },
  { id: 'g3', parentId: null },
]
const NAMES = ['Alpha', 'Beta', 'Gamma']

// see T-109, HF-10, HF-12, HF-16, HF-17, HF-20
const HEAD_ENTRANCES = ['IC-74', 'IC-78', 'IC-92', 'IC-93', 'IC-106']
const ROW_ONLY_ENTRANCES = ['IC-59', 'IC-60']

describe('HF-20 / CD-6 / QN-10 -- the head deletes every row', () => {
  it('HF-20 / CD-6 / E-36 still say: すべての行を消す操作子 / 深さ L1 の行が 1 つ作られる / 頭が持つ入口が 5 つ', () => {
    expect(REQUIREMENTS).toContain(HF_20)
    expect(REQUIREMENTS).toContain(CD_6_ONE_ROW)
    expect(REQUIREMENTS).toContain(E_36_HEAD)
    expect(QN_10).not.toBe('')
    for (const icon of HEAD_ENTRANCES) expect(bare(rowIn('T-109', icon).cells[0] ?? '')).toBe('Row Title Panel')
  })

  it('E-36: 頭が持つ入口が 5 つ -- the head carries IC-106 and none of the hide / pin entrances', () => {
    // see HF-20, E-36, IC-106
    const built = bench(documentWith(ROWS, NAMES))
    const panel = byRole(built.built.root(), 'Row Title Panel')[0] as FakeElement
    const inRow = (node: FakeElement): boolean => {
      for (let at = node.parentNode; at !== null; at = at.parentNode) if (at.getAttribute('data-group-id') !== null) return true
      return false
    }
    const head = selfAndDescendants(panel)
      .filter((one) => one.getAttribute('data-icon') !== null && !inRow(one))
      .map((one) => one.getAttribute('data-icon') as string)
    expect([...new Set(head)].sort()).toEqual([...HEAD_ENTRANCES].sort())
    for (const icon of ROW_ONLY_ENTRANCES) expect(head).not.toContain(icon)
  })

  it('QN-10 / NT-7: pressing IC-106 asks QN-10 and lists the task names before anything is deleted', () => {
    // see HF-20, QN-10, NT-7
    const built = bench(documentWith(ROWS, NAMES))
    const before = built.loop.document()
    built.press('Row Title Panel', 'IC-106')
    const asked = built.view().confirmation
    // WHY: the confirmation carries the T-234 row as its question and the dictionary words as its text.
    expect(asked?.question).toBe('QN-10')
    expect(asked?.text).toBe(QN_10)
    expect((asked?.items ?? []).map((one) => one.name).sort()).toEqual([...NAMES].sort())
    expect(built.loop.document(), 'nothing is deleted before the answer').toBe(before)
  })

  it('CD-6: 深さ L1 のすべての行に CD-2 を当てた和 -- every row and every task goes, and one L1 row is made', () => {
    // see CD-6, CD-2
    const built = bench(documentWith(ROWS, NAMES))
    built.press('Row Title Panel', 'IC-106')
    built.key(YES)
    const schedule = built.loop.document().schedule
    expect(schedule.tasks).toEqual([])
    expect(schedule.taskGroups.length, CD_6_ONE_ROW).toBe(1)
    expect(schedule.taskGroups[0]?.parentId, 'the made row is at depth L1').toBeNull()
    for (const id of ROWS.map((one) => one.id)) {
      expect(schedule.taskGroups.map((one) => one.id)).not.toContain(id)
    }
  })

  it('CD-6: 取り消し 1 回で戻る -- one undo brings every row and task back', () => {
    // see CD-6, SK-6
    const built = bench(documentWith(ROWS, NAMES))
    const before = built.loop.document().schedule
    built.press('Row Title Panel', 'IC-106')
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
const FR_006_COLOUR_LAST = '色の行（表 T-016 の入力の型に `色` を含む行）は、同じ対象の行の並びの末尾に置くこと（MUST）'
const FR_006_WIDTH_AFTER = '`Task` の枠線幅の行は、色の行の後ろ（`Task` の行の最後）に置くこと（MUST）'

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
    expect(REQUIREMENTS).toContain(FR_006_COLOUR_LAST)
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

  for (const column of ['start', 'finish'] as const) {
    it(`FR-006 E-41: ${column} の欄なら何も書かずに欄を元の値へ戻す`, () => {
      // see FR-006, T-016, PR-3
      const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
      const before = built.loop.document().schedule.tasks[0]?.[column]
      const shownBefore = built.view().propertiesPanel?.fields.find((one) => one.row === 'PR-3')?.text
      pressInDate(built, 'PR-3', column, 'Delete', String(before).slice(0, 10))
      built.frame()
      expect(built.loop.document().schedule.tasks[0]?.[column], '何も書かずに').toBe(before)
      expect(built.view().propertiesPanel?.fields.find((one) => one.row === 'PR-3')?.text, '欄を元の値へ戻す').toBe(shownBefore)
    })
  }
})

describe('FR-006 E-28 -- the colour rows are last in their object order', () => {
  it('FR-006: 色の行は同じ対象の行の並びの末尾 -- table T-016 (every object), the Task outline width row after them', () => {
    // see FR-006, T-016
    const subjects = [...new Set(T_016.rows.map(subjectOf))]
    for (const subject of subjects) {
      const all = T_016.rows.filter((row) => subjectOf(row) === subject)
      const listed = `${subject}: ${all.map((row) => row.id).join(' ')}`
      const width = all.filter(isTaskWidthRow)
      if (subject === 'Task') {
        expect(width.length, `premise: T-016 holds one Task outline width row; ${listed}`).toBe(1)
        expect(all[all.length - 1], `${FR_006_WIDTH_AFTER}; ${listed}`).toBe(width[0])
      }
      const rows = all.filter((row) => !isTaskWidthRow(row))
      const firstColour = rows.findIndex((row) => kindOf(row).includes('色'))
      if (firstColour < 0) continue
      expect(rows.slice(firstColour).every((row) => kindOf(row).includes('色')), listed).toBe(true)
    }
  })

  it('FR-006: the panel on a (non-milestone) Task shows its colour rows, then the outline width row, last', () => {
    // STEP: the rows T-016 shows for this kind (FR-006)
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const rows = built.view().propertiesPanel?.fields.map((one) => one.row) ?? []
    const taskRows = T_016.rows.filter((row) => subjectOf(row) === 'Task' && ['task', 'both'].includes(shownForOf(row)))
    const colourRows = taskRows.filter((row) => kindOf(row).includes('色')).map((row) => row.id)
    const widthRow = taskRows.filter(isTaskWidthRow).map((row) => row.id)
    expect(colourRows.length, 'premise: a task shows colour rows').toBeGreaterThan(0)
    const tail = [...colourRows, ...widthRow]
    expect(rows.slice(rows.length - tail.length)).toEqual(tail)
  })
})


const CV_9_ORDER =
  '並べ方は、上から次の順とすること（MUST）: ⓪ 欄の名（`FR-006` の項目名）だけの 1 行、① 選んでいる色の側ごとの見本と値の 1 行（本行の後の段）、② テーマに戻す入口、③ 透明を除く名を同表の行の順に、1 段に `_assets/tbl-settings.md` の 表 T-206 の `S-338` 個ずつ並べた段、④ 透明の入口とカスタムカラーの入口をこの順に並べた 1 行'
const CV_9_TRANSPARENT_WORD =
  '透明の入口の語は、塗りの欄（`fillColor` と `TaskGroup.color`）では塗りの無いことを、線の欄（`strokeColor`）では線の無いことを言う語とすること（MUST）'
const CV_9_NULL_MARK =
  '欄の値が `null`（② を選んでいる）ときは、側ごとの見本を、その欄の `null` がいま描いている色（テーマの色か既定の色）で塗り、値の代わりに、テーマなら「(テーマ)」、既定なら「(既定)」の印を添えること（MUST）'
const CV_9_THEME =
  'テーマに戻す入口は `CV-5` の「戻す入口」（`FR-007`）であり、押したらその欄の色をテーマ追随（`null`）へ戻すこと（MUST）'
const CV_9_HOST_INPUT = '閲覧環境の色の入力（`input type=color`）は、カスタムカラーの入口を押したときにだけ出すこと（MUST）'
const CV_9_EMPTY_SLOT = 'その欄に並べない名（下の 2 つ）の場所は空けたままとし、後ろの名を詰めてはならない（MUST NOT）'
const CV_9_VALUE = '値は、`#rrggbb` の側は英大文字の 16 進、名の側はその名の語とする。'
const CV_9_TRANSPARENT = '透明の側は、値を透明の語とし、見本を市松で示すこと（MUST）'
const CV_9_UNSET = '未定義の側は、値を空け、見本を縁だけの破線で示し、`CV-3` で描く値がどちらの側と同じかを語で添えること（MUST）'

const CUSTOM_WORD = wordOf('custom')
const THEME_WORD = wordOf('theme')
const THEME_HINT = wordOf('themeHint')
const THEME_MARK = wordOf('themeMark')
const NO_FILL_WORD = wordOf('noFill')
const NO_LINE_WORD = wordOf('noLine')

// see T-016
// WHY: the Task colour rows are found by the column they edit, whatever row id they carry.
const taskRowOf = (column: string): string => {
  const found = T_016.rows.find((row) => subjectOf(row) === 'Task' && columnsOf(row).length === 1 && columnsOf(row)[0] === column)
  if (found === undefined) throw new Error(`table T-016 has no Task row for ${column}`)
  return found.id
}
const TASK_FILL = taskRowOf('fillColor')
const TASK_LINE = taskRowOf('strokeColor')

const isThemeEntrance = (one: FakeElement): boolean => one.getAttribute('data-colour-theme-entry') !== null
const wordIn = (one: FakeElement): string => (one.textContent ?? '').trim()

// WHY: the grid of names (CV-9 (3)) of every colour field of a row; one field holds one grid.
function everyPalette(built: Bench, row: string): FakeElement[] {
  const field = inField(built, row)[0]
  if (field === undefined) throw new Error(`the panel drew no field ${row}`)
  return selfAndDescendants(field).filter(
    (one) =>
      /grid/.test(styleMap(one).get('display') ?? '') &&
      one.children.some((child) => child.getAttribute('data-colour-choice') !== null || child.textContent === ''),
  )
}

// see CV-9
// WHY: the line below the grid: the transparent entrance (or its empty slot), then the custom one.
function lastLineOf(grid: FakeElement): string[] {
  const palette = grid.parentNode as FakeElement
  const after = palette.children.slice(palette.children.indexOf(grid) + 1).flatMap((one) => selfAndDescendants(one))
  return after
    .filter(
      (one) =>
        one.getAttribute('data-colour-custom-entry') !== null ||
        one.getAttribute('data-colour-transparent-slot') !== null ||
        one.getAttribute('data-colour-choice') === TRANSPARENT,
    )
    .map((one) => {
      if (one.getAttribute('data-colour-choice') === TRANSPARENT) return TRANSPARENT
      if (one.getAttribute('data-colour-transparent-slot') !== null) return ''
      return wordIn(one)
    })
}

// see CV-9
function transparentEntranceOf(grid: FakeElement): FakeElement {
  const palette = grid.parentNode as FakeElement
  const found = palette.children
    .slice(palette.children.indexOf(grid) + 1)
    .flatMap((one) => selfAndDescendants(one))
    .find((one) => one.getAttribute('data-colour-choice') === TRANSPARENT)
  if (found === undefined) throw new Error('the palette draws no transparent entrance')
  return found
}

// see CV-9
// WHY: the name line, the sides line, the theme entrance, the names, then transparent and custom.
function layoutOf(built: Bench, row: string): string[] {
  const field = inField(built, row)[0]
  if (field === undefined) throw new Error(`the panel drew no field ${row}`)
  const name = built.view().propertiesPanel?.fields.find((one) => one.row === row)?.name ?? ''
  return selfAndDescendants(field).flatMap((one): string[] => {
    if (one.parentNode === field && one.children.length === 0 && name !== '' && one.textContent === name) return ['name']
    if (one.getAttribute('data-colour-sides') !== null) return ['sides']
    if (isThemeEntrance(one)) return ['theme']
    if (/grid/.test(styleMap(one).get('display') ?? '') && one.children.some((child) => child.getAttribute('data-colour-choice') !== null)) {
      return ['names']
    }
    if (one.getAttribute('data-colour-choice') === TRANSPARENT && !/grid/.test(styleMap(one.parentNode as FakeElement).get('display') ?? '')) {
      return ['transparent']
    }
    if (one.getAttribute('data-colour-transparent-slot') !== null) return ['transparent slot']
    if (one.getAttribute('data-colour-custom-entry') !== null) return ['custom']
    return []
  })
}

// WHY: the shared fake has no dispatchEvent, so the change a browser would bubble from the pressed
// entrance is raised here after the click, as the host would deliver it.
function pressEntry(built: Bench, node: FakeElement): void {
  raise(built.built, node, 'click')
  raise(built.built, node, 'change')
}

// see CV-9
// WHY: the theme entrance stands above the grid of names.
function themeEntranceOf(grid: FakeElement): FakeElement {
  const palette = grid.parentNode as FakeElement
  const found = palette.children
    .slice(0, palette.children.indexOf(grid))
    .flatMap((one) => selfAndDescendants(one))
    .find(isThemeEntrance)
  if (found === undefined) throw new Error('the palette draws no theme entrance above the names')
  return found
}

function rowPanel(built: Bench): string {
  const box = built.view().rowTitlePanel.titles[0]?.box
  if (box === undefined) throw new Error('the row title is not drawn')
  built.doubleClickAt(box.x + box.width / 2, box.y + box.height / 2, partOn('Row Title Panel', null, 'g1'))
  const fields = built.view().propertiesPanel?.fields ?? []
  const found = fields.find((one) => one.controls.some((control) => control.key.holder === 'taskGroup' && control.key.column === 'color'))
  if (found === undefined) throw new Error('the row panel shows no row colour')
  return found.row
}

// WHY: the palette of a field is the element holding the named choices; a slot is one child of the grid of names.
function paletteOf(built: Bench, row: string, index = 0): { grid: FakeElement; below: FakeElement[] } {
  const field = inField(built, row)[0]
  if (field === undefined) throw new Error(`the panel drew no field ${row}`)
  const holders = selfAndDescendants(field).filter((one) =>
    one.children.some((child) => child.getAttribute('data-colour-choice') !== null || child.getAttribute('value') === NAMED[0]),
  )
  const grid = holders.find((one) => /grid/.test(styleMap(one).get('display') ?? '')) ?? holders[index]
  if (grid === undefined) throw new Error(`the field ${row} lays out no palette`)
  const palette = grid.parentNode as FakeElement
  const after = palette.children.slice(palette.children.indexOf(grid) + 1)
  return { grid: grid, below: after.flatMap((one) => [one, ...selfAndDescendants(one).slice(1)]) }
}

const choiceOf = (node: FakeElement): string => node.getAttribute('data-colour-choice') ?? node.getAttribute('value') ?? ''
const sidesText = (built: Bench, row: string): string[] =>
  inField(built, row).flatMap((field) =>
    selfAndDescendants(field)
      .filter((one) => one.getAttribute('data-colour-sides') !== null)
      .map((one) => selfAndDescendants(one).map((node) => (node.children.length === 0 ? node.textContent ?? '' : '')).join('')),
  )
const sideSwatches = (built: Bench, row: string): FakeElement[] =>
  inField(built, row).flatMap((field) => selfAndDescendants(field).filter((one) => one.getAttribute('data-colour-swatch') !== null))

describe('CV-9 -- the colour field', () => {
  it('CV-9 still says: 上から次の順 / 透明の入口の語 / の印を添える / テーマ追随へ戻す / 押したときにだけ / 空けたまま / 英大文字 / 市松 / 破線', () => {
    for (const clause of [
      CV_9_ORDER,
      CV_9_TRANSPARENT_WORD,
      CV_9_NULL_MARK,
      CV_9_THEME,
      CV_9_HOST_INPUT,
      CV_9_EMPTY_SLOT,
      CV_9_VALUE,
      CV_9_TRANSPARENT,
      CV_9_UNSET,
    ]) {
      expect(REQUIREMENTS).toContain(clause)
    }
    expect([THEME_WORD, THEME_HINT, THEME_MARK, NO_FILL_WORD, NO_LINE_WORD].every((one) => one !== '')).toBe(true)
  })

  it('CV-9: (0) name, (1) sides, (2) theme, (3) 透明を除く名を同表の行の順に (S-338 a line), (4) transparent then custom', () => {
    // see CV-9, S-338, T-294
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const { grid } = paletteOf(built, TASK_FILL)
    expect((styleMap(grid).get('grid-template-columns') ?? '').replace(/\s/g, '')).toMatch(new RegExp(`^repeat\\(${S_338},`))
    expect(grid.children.map(choiceOf)).toEqual(NAMED)
    expect(layoutOf(built, TASK_FILL), CV_9_ORDER).toEqual(['name', 'sides', 'theme', 'names', 'transparent', 'custom'])
    expect(lastLineOf(grid)).toEqual([TRANSPARENT, CUSTOM_WORD])
  })

  it('CV-9 (4): transparent then custom in every colour field (task fill, task line, row colour)', () => {
    // see CV-9, CV-5, FR-007
    const task = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    for (const row of [TASK_FILL, TASK_LINE]) {
      const taskPalettes = everyPalette(task, row)
      expect(taskPalettes.length, `premise: ${row} draws one palette`).toBe(1)
      for (const grid of taskPalettes) expect(lastLineOf(grid)).toEqual([TRANSPARENT, CUSTOM_WORD])
      expect(layoutOf(task, row)).toEqual(['name', 'sides', 'theme', 'names', 'transparent', 'custom'])
    }
    const row = bench(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const rowColour = rowPanel(row)
    const rowPalettes = everyPalette(row, rowColour)
    expect(rowPalettes.length, 'premise: the row colour draws one palette').toBe(1)
    for (const grid of rowPalettes) expect(lastLineOf(grid)).toEqual([TRANSPARENT, CUSTOM_WORD])
  })

  it('CV-9: 透明の入口の語 -- no fill on fillColor and TaskGroup.color, no line on strokeColor', () => {
    // see CV-9, FR-038
    const task = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    for (const [row, word] of [
      [TASK_FILL, NO_FILL_WORD],
      [TASK_LINE, NO_LINE_WORD],
    ] as const) {
      const grid = everyPalette(task, row)[0] as FakeElement
      expect(wordIn(transparentEntranceOf(grid)), `${CV_9_TRANSPARENT_WORD} (${row})`).toBe(word)
    }
    const row = bench(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const grid = everyPalette(row, rowPanel(row))[0] as FakeElement
    expect(wordIn(transparentEntranceOf(grid)), `${CV_9_TRANSPARENT_WORD} (TaskGroup.color)`).toBe(NO_FILL_WORD)
  })

  it('CV-9 (2): the theme entrance of a Task colour field speaks the dictionary words (colourField theme / themeHint)', () => {
    // STEP: a Task colour's null follows the theme (CV-9, FR-007, FR-038)
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    for (const row of [TASK_FILL, TASK_LINE]) {
      for (const grid of everyPalette(built, row)) {
        const entrance = themeEntranceOf(grid)
        expect(wordIn(entrance)).toBe(THEME_WORD)
        expect([entrance.getAttribute('title'), entrance.getAttribute('aria-label')]).toContain(THEME_HINT)
      }
    }
  })

  it('CV-9: 値の代わりに、テーマなら「(テーマ)」 -- an unset Task fill shows the theme mark on both sides', () => {
    // see CV-9, FR-007
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const text = sidesText(built, TASK_FILL).join(' | ')
    expect(text.split(THEME_MARK).length - 1, `${CV_9_NULL_MARK}: ${text}`).toBe(2)
    expect(sideSwatches(built, TASK_FILL).length, 'each side is painted with a swatch').toBe(2)
  })

  it('CV-9 control: pressing a named swatch in this harness writes that name (CV-1)', () => {
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { strokeColor: 'red' }))
    const grid = everyPalette(built, TASK_LINE)[0] as FakeElement
    const blue = grid.children.find((one) => choiceOf(one) === 'blue') as FakeElement
    pressEntry(built, blue)
    built.frame()
    expect(built.loop.document().schedule.taskVisuals.find((one) => one.taskUid === 1)?.strokeColor).toBe('blue')
  })

  for (const [name, column, row, value] of [
    ['a custom colour', 'fillColor', TASK_FILL, '#aabbcc/#112233'],
    ['a palette name', 'strokeColor', TASK_LINE, 'red'],
  ] as const) {
    it(`CV-9 / CV-5 E-44: 押したらその欄の色をテーマ追随（null）へ戻す -- ${name} on ${column}, undone in one step`, () => {
      // see CV-9, CV-5, SK-6
      const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { [column]: value }))
      const visual = (): Record<string, unknown> =>
        (built.loop.document().schedule.taskVisuals.find((one) => one.taskUid === 1) ?? {}) as Record<string, unknown>
      expect(visual()[column], 'premise: the colour is set').toBe(value)
      const grid = everyPalette(built, row)[0] as FakeElement
      pressEntry(built, themeEntranceOf(grid))
      built.frame()
      expect(visual()[column] ?? null, CV_9_THEME).toBeNull()
      built.press('App Header', 'IC-5')
      expect(visual()[column], 'one undo brings the colour back').toBe(value)
    })
  }

  it('CV-9: 並べない名の場所は空けたまま -- the row colour field keeps black\'s slot empty (後ろの名を詰めない)', () => {
    // see CV-9, S-315
    const built = bench(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const box = built.view().rowTitlePanel.titles[0]?.box
    if (box === undefined) throw new Error('the row title is not drawn')
    built.doubleClickAt(box.x + box.width / 2, box.y + box.height / 2, partOn('Row Title Panel', null, 'g1'))
    expect(built.view().propertiesPanel, 'premise: MK-13 put the panel up on the row').not.toBeNull()
    // WHY: the field is found by the column it edits (T-016 PR-19 `color` of `TaskGroup`), whatever row id it carries.
    const fields = built.view().propertiesPanel?.fields ?? []
    const rowColour = fields.find((one) => one.controls.some((control) => control.key.holder === 'taskGroup' && control.key.column === 'color'))
    expect(rowColour, `premise: the row panel shows the row colour; fields ${fields.map((one) => one.row).join(' ')}`).toBeDefined()
    expect(fields[fields.length - 1]?.row, 'FR-006: the colour row is last for a TaskGroup too').toBe(rowColour?.row)
    const { grid } = paletteOf(built, rowColour?.row ?? '')
    const slots = grid.children.map(choiceOf)
    expect(slots.length, CV_9_EMPTY_SLOT).toBe(NAMED.length)
    expect(slots[NAMED.indexOf(BLACK)], 'the black slot offers nothing').toBe('')
    expect(slots.filter((one) => one !== '')).toEqual(NAMED.filter((one) => one !== BLACK))
    expect(slots.indexOf(NAMED[NAMED.indexOf(BLACK) + 1] ?? ''), 'the names after black keep their places').toBe(NAMED.indexOf(BLACK) + 1)
  })

  it('CV-9 (JDG-397): 閲覧環境の色の入力は、カスタムカラーの入口を押したときにだけ出す', () => {
    // see CV-9
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const hostInputs = (): FakeElement[] =>
      inField(built, TASK_FILL).flatMap((field) =>
        selfAndDescendants(field).filter((one) => one.tagName === 'INPUT' && one.getAttribute('type') === 'color'),
      )
    expect(hostInputs(), 'before [Custom] is pressed').toEqual([])
    const drawnNow = new Set(inField(built, TASK_FILL).flatMap((field) => selfAndDescendants(field)))
    const custom = [...drawnNow].find((one) => one.textContent === CUSTOM_WORD && one.children.length === 0)
    expect(custom, 'premise: the Custom entrance is drawn with its word').toBeDefined()
    raise(built.built, custom as FakeElement, 'click')
    expect(hostInputs().length, 'after [Custom] is pressed').toBeGreaterThan(0)
  })

  it('CV-9: #rrggbb の側は英大文字の 16 進 -- both sides of a custom colour', () => {
    // see CV-9, CV-2
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { fillColor: '#aabbcc/#112233' }))
    const text = sidesText(built, TASK_FILL).join(' | ')
    expect(text).toContain('#AABBCC')
    expect(text).toContain('#112233')
    expect(text).not.toContain('#aabbcc')
  })

  it('CV-9: 名の側はその名の語', () => {
    // see CV-9
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { strokeColor: 'red' }))
    expect(sidesText(built, TASK_LINE).join(' | ')).toContain(colourWord('red'))
  })

  it('CV-9: 透明の側は、値を透明の語とし、見本を市松 (S-335 cells a side, S-336 / S-337)', () => {
    // see CV-9, S-335, S-336, S-337
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { fillColor: TRANSPARENT }))
    expect(sidesText(built, TASK_FILL).join(' | ')).toContain(colourWord(TRANSPARENT))
    const checkered = sideSwatches(built, TASK_FILL).filter((one) => /gradient\(/.test(styleMap(one).get('background') ?? ''))
    expect(checkered.length, 'both sides are drawn as a checkerboard').toBeGreaterThanOrEqual(2)
    for (const swatch of checkered) {
      const background = (styleMap(swatch).get('background') ?? '').toLowerCase()
      expect(background).toContain(S_336)
      expect(background).toContain(S_337)
      // WHY: a conic checker tile holds 2 x 2 cells; cells a side = 2 x side / tile.
      const side = parseFloat(styleMap(swatch).get('width') ?? '')
      const tile = /\/\s*(?:calc\(([^)]*)\)|([\d.]+[a-z%]*))/.exec(background)
      const tileSize = tile?.[1] !== undefined ? Function(`return (${tile[1].replace(/[a-z%]+/g, '')})`)() as number : parseFloat(tile?.[2] ?? '')
      expect((2 * side) / tileSize, `cells a side in ${background}`).toBeCloseTo(S_335, 3)
    }
  })

  it('CV-9: 未定義の側は、値を空け、見本を破線、CV-3 で描く値がどちらの側と同じかを語で添える', () => {
    // see CV-9, CV-3
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { fillColor: '#aabbcc/' }))
    const text = sidesText(built, TASK_FILL).join(' | ')
    expect(text).toContain('#AABBCC')
    expect(text).toContain(wordOf('sameAsLight'))
    const dashed = sideSwatches(built, TASK_FILL).filter((one) =>
      ['border', 'border-style', 'outline', 'outline-style'].some((name) => (styleMap(one).get(name) ?? '').includes('dashed')),
    )
    expect(dashed.length, 'the unset side is a dashed edge').toBeGreaterThanOrEqual(1)
  })
})
