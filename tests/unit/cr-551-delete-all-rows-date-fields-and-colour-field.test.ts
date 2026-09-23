// CR-551 items 13-16: deleting every row from the head (HF-20, CD-6, QN-10), the date fields and the colour rows

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
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
    hasUnsettledTextEntry: () => drawn.hasUnsettledTextEntry(),
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
      { taskUid: 1, shapeKind: null, milestoneGlyph: null, fillColor: null, strokeColor: null, lineWeight: null, ...visual },
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

const T_016 = specTable('T-016')
const kindOf = (row: (typeof T_016.rows)[number]): string => row.by['入力の型'] ?? ''
const subjectOf = (row: (typeof T_016.rows)[number]): string => bare(row.by['対象'] ?? '')

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
  it('FR-006: 色の行は同じ対象の行の並びの末尾 -- table T-016 (every object)', () => {
    // see FR-006, T-016
    const subjects = [...new Set(T_016.rows.map(subjectOf))]
    for (const subject of subjects) {
      const rows = T_016.rows.filter((row) => subjectOf(row) === subject)
      const firstColour = rows.findIndex((row) => kindOf(row).includes('色'))
      if (firstColour < 0) continue
      expect(rows.slice(firstColour).every((row) => kindOf(row).includes('色')), `${subject}: ${rows.map((row) => row.id).join(' ')}`).toBe(true)
    }
  })

  it('FR-006: the panel on a Task shows its colour row last', () => {
    // see FR-006
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const rows = built.view().propertiesPanel?.fields.map((one) => one.row) ?? []
    const colourRows = T_016.rows.filter((row) => subjectOf(row) === 'Task' && kindOf(row).includes('色')).map((row) => row.id)
    expect(rows.slice(rows.length - colourRows.length)).toEqual(colourRows)
  })
})


const CV_9_ORDER =
  '並べ方は、透明を除く名を同表の行の順に、1 段に `_assets/tbl-settings.md` の 表 T-206 の `S-338` 個ずつ並べ、その下の段にカスタムカラーの入口、透明の順に置くこと（MUST）'
const CV_9_HOST_INPUT = '閲覧環境の色の入力（`input type=color`）は、カスタムカラーの入口を押したときにだけ出すこと（MUST）'
const CV_9_EMPTY_SLOT = 'その欄に並べない名（下の 2 つ）の場所は空けたままとし、後ろの名を詰めてはならない（MUST NOT）'
const CV_9_VALUE = '値は、`#rrggbb` の側は英大文字の 16 進、名の側はその名の語とする。'
const CV_9_TRANSPARENT = '透明の側は、値を透明の語とし、見本を市松で示すこと（MUST）'
const CV_9_UNSET = '未定義の側は、値を空け、見本を縁だけの破線で示し、`CV-3` で描く値がどちらの側と同じかを語で添えること（MUST）'

const CUSTOM_WORD = wordOf('custom')

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
  it('CV-9 still says: S-338 個ずつ / その下の段にカスタムカラーの入口、透明 / 押したときにだけ / 空けたまま / 英大文字 / 市松 / 破線', () => {
    for (const clause of [CV_9_ORDER, CV_9_HOST_INPUT, CV_9_EMPTY_SLOT, CV_9_VALUE, CV_9_TRANSPARENT, CV_9_UNSET]) {
      expect(REQUIREMENTS).toContain(clause)
    }
  })

  it('CV-9: 透明を除く名を同表の行の順に、1 段に S-338 個ずつ -- then Custom, then Transparent below', () => {
    // see CV-9, S-338, T-294
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha']))
    const { grid, below } = paletteOf(built, 'PR-12')
    expect((styleMap(grid).get('grid-template-columns') ?? '').replace(/\s/g, '')).toMatch(new RegExp(`^repeat\\(${S_338},`))
    expect(grid.children.map(choiceOf)).toEqual(NAMED)
    const next = below.filter((one) => one.getAttribute('data-colour-custom-entry') !== null || choiceOf(one) === TRANSPARENT)
    expect(next.map((one) => (choiceOf(one) === TRANSPARENT ? TRANSPARENT : one.textContent))).toEqual([CUSTOM_WORD, TRANSPARENT])
  })

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
      inField(built, 'PR-12').flatMap((field) =>
        selfAndDescendants(field).filter((one) => one.tagName === 'INPUT' && one.getAttribute('type') === 'color'),
      )
    expect(hostInputs(), 'before [Custom] is pressed').toEqual([])
    const drawnNow = new Set(inField(built, 'PR-12').flatMap((field) => selfAndDescendants(field)))
    const custom = [...drawnNow].find((one) => one.textContent === CUSTOM_WORD && one.children.length === 0)
    expect(custom, 'premise: the Custom entrance is drawn with its word').toBeDefined()
    raise(built.built, custom as FakeElement, 'click')
    expect(hostInputs().length, 'after [Custom] is pressed').toBeGreaterThan(0)
  })

  it('CV-9: #rrggbb の側は英大文字の 16 進 -- both sides of a custom colour', () => {
    // see CV-9, CV-2
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { fillColor: '#aabbcc/#112233' }))
    const text = sidesText(built, 'PR-12').join(' | ')
    expect(text).toContain('#AABBCC')
    expect(text).toContain('#112233')
    expect(text).not.toContain('#aabbcc')
  })

  it('CV-9: 名の側はその名の語', () => {
    // see CV-9
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { strokeColor: 'red' }))
    expect(sidesText(built, 'PR-12').join(' | ')).toContain(colourWord('red'))
  })

  it('CV-9: 透明の側は、値を透明の語とし、見本を市松 (S-335 cells a side, S-336 / S-337)', () => {
    // see CV-9, S-335, S-336, S-337
    const built = panelOnTask(documentWith([{ id: 'g1', parentId: null }], ['Alpha'], { fillColor: TRANSPARENT }))
    expect(sidesText(built, 'PR-12').join(' | ')).toContain(colourWord(TRANSPARENT))
    const checkered = sideSwatches(built, 'PR-12').filter((one) => /gradient\(/.test(styleMap(one).get('background') ?? ''))
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
    const text = sidesText(built, 'PR-12').join(' | ')
    expect(text).toContain('#AABBCC')
    expect(text).toContain(wordOf('sameAsLight'))
    const dashed = sideSwatches(built, 'PR-12').filter((one) =>
      ['border', 'border-style', 'outline', 'outline-style'].some((name) => (styleMap(one).get(name) ?? '').includes('dashed')),
    )
    expect(dashed.length, 'the unset side is a dashed edge').toBeGreaterThanOrEqual(1)
  })
})
