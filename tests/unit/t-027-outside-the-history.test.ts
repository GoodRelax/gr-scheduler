// Table T-027: what the undo history does not hold.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { ROOT_KEYS, type Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  NOT_STORED_LIMITS,
  emptyHistory,
  stepCount,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
import {
  applyDocumentChange,
  replaceDocument,
  type ApplyOutcome,
  type ChangeAudience,
  type ChangeStep,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type ReplaceOutcome,
  type SettingsLimits,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { bare, bareAll, specTable } from '../contract/spec-table'

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'


const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const commandKindOf = (commandRow: string): string => {
  const named = bare(rowOf('T-108', commandRow).by['確定名'] ?? '')
  if (named === '') throw new Error(`table T-108 row ${commandRow} names no command`)
  return named
}

const T_027_OUTSIDE_ROWS = specTable('T-027')
  .rows.filter((row) => bare(row.by['区分'] ?? '') === '対象外')
  .map((row) => row.id)

const T_027_INSIDE_ROWS = specTable('T-027')
  .rows.filter((row) => bare(row.by['区分'] ?? '') === '対象')
  .map((row) => row.id)

const isBooleanRow = (row: { readonly by: Readonly<Record<string, string>> }): boolean => {
  const types = bareAll(row.by['型'] ?? '')
  return types.length === 1 && types[0] === '真偽'
}

const T_202_BOOLEAN_ROWS: readonly { readonly id: string; readonly key: string }[] = specTable(
  'T-202',
)
  .rows.filter(isBooleanRow)
  .map((row) => ({ id: row.id, key: bare(row.by['キー'] ?? '') }))

const T_202_OTHER_ROWS: readonly string[] = specTable('T-202')
  .rows.filter((row) => !isBooleanRow(row))
  .map((row) => row.id)


const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) {
    throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const START = templateDocument()

const FIRST_GROUP_ID = START.schedule.taskGroups[0]?.id ?? ''
const FIRST_TASK_UID = START.schedule.tasks[0]?.uid ?? 0

const settingOf = (document: Document, key: string): unknown =>
  (document.documentSettings as unknown as Record<string, unknown>)[key]

const settingsOf = (document: Document): string => JSON.stringify(document.documentSettings)


const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  rowAreaWidthWithoutPanels: 982,
}

const STEP_BYTES = Buffer.byteLength(JSON.stringify(START), 'utf8')

const ROOMY_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: STEP_BYTES * (NOT_STORED_LIMITS['S-94'] + 2),
}

const WRITER = 'the case at the keyboard'

const instantOf = (nth: number): string =>
  new Date(Date.UTC(2026, 7, 27, 0, 0, 0) + nth * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')

interface Bench {
  held: HeldDocument
  write(commands: readonly DocumentCommand[]): ApplyOutcome
  undo(): ReplaceOutcome
  depth(): number
}

function bench(): Bench {
  let held: HeldDocument = { document: START, history: emptyHistory<ChangeStep>() }
  let writes = 0

  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      held = next
    },
  }
  const audience: ChangeAudience = { deliver: () => {} }

  return {
    get held() {
      return held
    },
    write: (commands) => {
      writes += 1
      return applyDocumentChange(
        {
          defaultRowName: DEFAULT_ROW_NAME_FIXTURE,
          readStamp: held.document.documentStamp,
          commands,
          moment: { gestureInFlight: false, editingInPlace: false, deliveringNotices: false },
          historyLimits: ROOMY_LIMITS,
          settingsLimits: SETTINGS_LIMITS,
          editedBy: WRITER,
          updatedUtc: instantOf(writes),
        },
        holder,
        audience,
      )
    },
    undo: () =>
      replaceDocument(
        {
          defaultRowName: DEFAULT_ROW_NAME_FIXTURE,
          readStamp: held.document.documentStamp,
          moment: { gestureInFlight: false, editingInPlace: false, deliveringNotices: false },
          call: { row: 'RD-1' },
        },
        holder,
        audience,
      ),
    depth: () => stepCount(held.history),
  }
}

function mustWrite(one: Bench, commands: readonly DocumentCommand[], why: string): void {
  const outcome = one.write(commands)
  if (!outcome.accepted) {
    throw new Error(`${why} was refused: ${JSON.stringify(outcome.refusal)}`)
  }
}

function mustUndo(one: Bench, why: string): Document {
  const outcome = one.undo()
  if (!outcome.accepted) {
    throw new Error(`${why}: the undo was refused: ${JSON.stringify(outcome.refusal)}`)
  }
  return outcome.document
}

function writeUnrelatedEdit(one: Bench, name: string): void {
  mustWrite(
    one,
    [{ kind: commandKindOf('CM-9'), uid: FIRST_TASK_UID, name } as unknown as DocumentCommand],
    `CM-9 ${JSON.stringify(name)}`,
  )
}


interface OutsideCase {
  readonly undoRow: string
  readonly commandRow: string
  readonly settingRows: readonly string[]
  readonly keys: readonly string[]
  readonly expected: readonly unknown[]
  readonly command: DocumentCommand
  readonly before: readonly DocumentCommand[]
}

const UN_7_CASES: readonly OutsideCase[] = T_202_BOOLEAN_ROWS.map((row) => {
  const wanted = !(settingOf(START, row.key) as boolean)
  return {
    undoRow: 'UN-7',
    commandRow: 'CM-58',
    settingRows: [row.id],
    keys: [row.key],
    expected: [wanted],
    command: {
      kind: commandKindOf('CM-58'),
      element: row.key,
      visible: wanted,
    } as unknown as DocumentCommand,
    before: [],
  }
})

const KEYED_CASES: readonly OutsideCase[] = [
  {
    undoRow: 'UN-8',
    commandRow: 'CM-65',
    settingRows: ['S-75', 'S-76'],
    keys: ['zoomX', 'zoomY'],
    expected: [3, 3],
    command: { kind: commandKindOf('CM-65'), zoomX: 3, zoomY: 3 } as unknown as DocumentCommand,
    before: [],
  },
  {
    undoRow: 'UN-8',
    commandRow: 'CM-66',
    settingRows: ['S-77', 'S-78', 'S-176', 'S-177'],
    keys: ['scrollDate', 'scrollGroupId', 'scrollDayOffset', 'scrollGroupOffset'],
    expected: ['2026-05-01', FIRST_GROUP_ID, 0, 0],
    command: {
      kind: commandKindOf('CM-66'),
      scrollDate: '2026-05-01',
      scrollGroupId: FIRST_GROUP_ID,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    } as unknown as DocumentCommand,
    before: [],
  },
  {
    undoRow: 'UN-8',
    commandRow: 'CM-71',
    settingRows: ['S-75', 'S-76', 'S-77', 'S-78'],
    keys: ['zoomX', 'zoomY', 'scrollDate', 'scrollGroupId'],
    expected: [4, 4, '2026-06-01', FIRST_GROUP_ID],
    command: {
      kind: commandKindOf('CM-71'),
      zoomX: 4,
      zoomY: 4,
      scrollDate: '2026-06-01',
      scrollGroupId: FIRST_GROUP_ID,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    } as unknown as DocumentCommand,
    before: [],
  },
  {
    undoRow: 'UN-12',
    commandRow: 'CM-60',
    settingRows: ['S-65'],
    keys: ['dualCursor'],
    expected: [{ date1: '2026-05-01', date2: '2026-06-01' }],
    command: {
      kind: commandKindOf('CM-60'),
      date1: '2026-05-01',
      date2: '2026-06-01',
    } as unknown as DocumentCommand,
    before: [],
  },
  {
    undoRow: 'UN-16',
    commandRow: 'CM-67',
    settingRows: ['S-79', 'S-80'],
    keys: ['rowTitlePanelWidth', 'propertyPanelWidth'],
    expected: [200, 300],
    command: {
      kind: commandKindOf('CM-67'),
      rowTitlePanelWidth: 200,
      propertyPanelWidth: 300,
    } as unknown as DocumentCommand,
    before: [],
  },
]

const OUTSIDE_CASES: readonly OutsideCase[] = [...UN_7_CASES, ...KEYED_CASES]

const ROWS_WITH_NO_DOCUMENT_COLUMN = ['UN-9', 'UN-10', 'UN-11'] as const


describe('表 T-027 -- the 対象外 half, and this file covering all of it', () => {
  it('every 対象外 row is either driven through a command here or has no document column', () => {
    const driven = [...new Set(OUTSIDE_CASES.map((one) => one.undoRow))]
    const covered = [...driven, ...ROWS_WITH_NO_DOCUMENT_COLUMN].sort()
    expect([...T_027_OUTSIDE_ROWS].sort()).toEqual(covered)
  })

  it('UN-13 and UN-3 are 対象, so the other direction below has something to prove', () => {
    expect(T_027_INSIDE_ROWS).toContain('UN-13')
    expect(T_027_INSIDE_ROWS).toContain('UN-3')
  })

  it('UN-7 covers exactly the 真偽 rows of 表 T-202, and 多値 rows are left to UN-13 and UN-12', () => {
    expect(T_202_BOOLEAN_ROWS.length).toBeGreaterThan(0)
    expect(UN_7_CASES).toHaveLength(T_202_BOOLEAN_ROWS.length)
    expect([...T_202_OTHER_ROWS].sort()).toEqual(['S-58', 'S-65', 'S-66', 'S-70'])
  })
})


describe('表 T-067 WS-4 -- an 対象外 write pushes no 段 of its own', () => {
  for (const one of OUTSIDE_CASES) {
    const name = `${one.undoRow} / ${one.commandRow} (${one.keys.join(', ')})`
    it(`${name}: changes the document and leaves the history empty`, () => {
      const run = bench()
      for (const first of one.before) mustWrite(run, [first], `${one.commandRow}'s precondition`)

      const settingsBefore = settingsOf(run.held.document)
      const outcome = run.write([one.command])

      expect(outcome.accepted, `${name}: ${JSON.stringify(outcome)}`).toBe(true)
      expect(settingsOf(run.held.document), `${name}: the write moved nothing`).not.toBe(
        settingsBefore,
      )
      one.keys.forEach((key, at) => {
        expect(settingOf(run.held.document, key), `${name}: ${key}`).toEqual(one.expected[at])
      })

      expect(run.depth(), `${name}: 表 T-027 ${one.undoRow} is 対象外`).toBe(0)
    })
  }
})


describe('FR-031 -- 対象外 の値は、無関係な編集の取り消しで戻ってはならない', () => {
  for (const one of OUTSIDE_CASES) {
    const name = `${one.undoRow} / ${one.commandRow} (${one.keys.join(', ')})`

    it(`${name}: set BEFORE the unrelated edit, it survives that edit's undo`, () => {
      const run = bench()
      for (const first of one.before) mustWrite(run, [first], `${one.commandRow}'s precondition`)
      mustWrite(run, [one.command], one.commandRow)

      writeUnrelatedEdit(run, 'a name the case will undo')
      expect(run.depth(), `${name}: the 対象 edit pushed its 段`).toBe(1)

      const back = undoEdit(run.held)
      expect(back.undone, name).toBe(true)
      one.keys.forEach((key, at) => {
        expect(settingOf(back.next.document, key), `${name}: ${key}`).toEqual(one.expected[at])
      })
    })

    it(`${name}: set AFTER the unrelated edit, it STILL survives that edit's undo`, () => {
      const run = bench()
      for (const first of one.before) mustWrite(run, [first], `${one.commandRow}'s precondition`)

      writeUnrelatedEdit(run, 'a name the case will undo')
      expect(run.depth(), `${name}: the 対象 edit pushed its 段`).toBe(1)

      mustWrite(run, [one.command], one.commandRow)
      expect(run.depth(), `${name}: the 対象外 write added no 段`).toBe(1)

      const after = mustUndo(run, name)

      expect(
        after.schedule.tasks.find((task) => task.uid === FIRST_TASK_UID)?.name,
        `${name}: UN-3 is 対象 and must have been rewound`,
      ).toBe(START.schedule.tasks.find((task) => task.uid === FIRST_TASK_UID)?.name)

      one.keys.forEach((key, at) => {
        expect(
          settingOf(after, key),
          `${name}: ${key} (${one.settingRows.join(' / ')}) was rewound by an undo`,
        ).toEqual(one.expected[at])
      })
    })
  }

  it('UN-3 writes nothing in the 見せ方の群, so undoing it may move none of it', () => {
    const run = bench()
    writeUnrelatedEdit(run, 'a name the case will undo')
    for (const one of KEYED_CASES) mustWrite(run, [one.command], one.commandRow)
    expect(run.depth(), 'only the UN-3 edit earned a 段').toBe(1)

    const beforeUndo = settingsOf(run.held.document)
    const after = mustUndo(run, 'the UN-3 edit')
    expect(
      after.schedule.tasks.find((task) => task.uid === FIRST_TASK_UID)?.name,
      'UN-3 is 対象 and must have been rewound',
    ).toBe(START.schedule.tasks.find((task) => task.uid === FIRST_TASK_UID)?.name)
    expect(settingsOf(after)).toBe(beforeUndo)
  })
})


interface InsideCase {
  readonly commandRow: string
  readonly settingRow: string
  readonly key: string
  readonly wanted: unknown
  readonly command: DocumentCommand
}

const UN_13_CASES: readonly InsideCase[] = [
  {
    commandRow: 'CM-56',
    settingRow: 'S-58',
    key: 'stackDirection',
    wanted: 'down',
    command: { kind: commandKindOf('CM-56'), direction: 'down' } as unknown as DocumentCommand,
  },
  {
    commandRow: 'CM-59',
    settingRow: 'S-66',
    key: 'guideCursorMode',
    wanted: 'crosshair',
    command: { kind: commandKindOf('CM-59'), mode: 'crosshair' } as unknown as DocumentCommand,
  },
  {
    commandRow: 'CM-62',
    settingRow: 'S-70',
    key: 'fontScale',
    wanted: 'L',
    command: { kind: commandKindOf('CM-62'), scale: 'L' } as unknown as DocumentCommand,
  },
]

describe('表 T-027 UN-13 -- a 見せ方 column the table does NOT exclude IS rewound', () => {
  for (const one of UN_13_CASES) {
    const name = `UN-13 / ${one.commandRow} (${one.key}, ${one.settingRow})`

    it(`${name}: pushes one 段, and the undo puts the template's value back`, () => {
      const run = bench()
      const started = settingOf(START, one.key)
      expect(one.wanted, `${name}: the case must actually change something`).not.toEqual(started)

      mustWrite(run, [one.command], one.commandRow)
      expect(settingOf(run.held.document, one.key), name).toEqual(one.wanted)
      expect(run.depth(), `${name}: UN-13 is 対象`).toBe(1)

      const back = undoEdit(run.held)
      expect(back.undone, name).toBe(true)
      expect(settingOf(back.next.document, one.key), `${name}: the undo must rewind it`).toEqual(
        started,
      )
    })
  }
})


describe('表 T-027 UN-9 / UN-10 / UN-11 -- outside the document, not merely outside the history', () => {
  it('表 T-108 holds no command for the selection, the display language or the 構え', () => {
    const duties = specTable('T-108').rows.map((row) => row.by['何を担うか'] ?? '')
    for (const word of ['選択', '表示言語', '構え']) {
      expect(duties.filter((duty) => duty.includes(word)), word).toHaveLength(0)
    }
    const owners = specTable('T-108').rows.map((row) => bare(row.by['正'] ?? ''))
    expect(owners).not.toContain('FR-038')
  })

  it('the document root and the 見せ方の群 hold no key for any of the three', () => {
    const named = ['selection', 'selectedIds', 'language', 'displayLanguage', 'armed', 'stance']
    const keys = [...ROOT_KEYS, ...Object.keys(SETTINGS_DEFAULTS)]
    for (const key of named) expect(keys, key).not.toContain(key)
  })
})
