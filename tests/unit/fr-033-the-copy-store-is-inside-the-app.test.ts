// `FR-033`（コピーして貼り付ける）-- the store the duplication uses, and the two
// subtrees it can duplicate.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by someone who read only docs/spec.
//
// ⭐ THE CLAUSE, VERBATIM (docs/spec/01-04-requirements.md:1785, `FR-033`):
//
//   「**複製に使う置き場はアプリの中に持つこと（MUST）。OS のクリップボードから
//    読み込んではならない（MUST NOT）**」——「外から来た文字列をタスクとして解釈
//    すると、データの正確性を保証できない。」
//   「⚠️ **禁じているのは読むことだけである** —— クリップボードへ送る経路は表
//    T-008 の `R-9` が持つ」
//
//   STATEMENT: 「作成者がタスクを選んでコピーし貼り付けたとき、`GRS` は、**選ばれ
//   た `Task` とその WBS の子孫を部分木ごと**複製すること。行見出しパネルでは、
//   選ばれた `TaskGroup` を**部分木ごと**複製すること。」
//
// ⛔ THE BRIEF THAT ASKED FOR THIS FILE FIRST NAMED `FR-045` AND THEN CORRECTED
// ITSELF TO `FR-033`. `FR-033` is the right one: `FR-045` is a different
// requirement entirely and states nothing about a copy store.
//
// ⛔ WHAT IS DELIBERATELY NOT TESTED HERE: 表 T-223's cascade (`DU-1` / `DU-2`),
// the UID rule and the dependency rule already have cases in
// tests/unit/edit-task.test.ts and tests/unit/edit-task-group.test.ts. This
// file asks the half those do not: WHERE the copy comes from, that BOTH kinds
// of subtree can be pasted at all, and what happens when the source is gone.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type {
  Schedule,
  Task,
  TaskGroup,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import {
  editTask,
  editTaskGroup,
  type EditResult,
  type TaskCommand,
  type TaskGroupCommand,
} from '../../src/use-case/edit-document/edit-document'
import * as clipboardGateway from '../../src/adapter/clipboard-gateway/clipboard-gateway'
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const jan = (day: number): string => `2026-01-${String(day).padStart(2, '0')}T00:00:00`

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    uid: 1,
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: jan(5),
    finish: jan(9),
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...part,
  }) as unknown as Task

const visualOf = (part: Record<string, unknown>): TaskVisual =>
  ({
    taskUid: 1,
    nameAnchor: null,
    nameAlign: null,
    shapeKind: null,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
    ...part,
  }) as unknown as TaskVisual

const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    id: 'g1',
    parentId: null,
    label: 'row',
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      title: 'A',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      themeHue: 214,
      uidHighWaterMark: 10,
      importSeq: 0,
      revision: 1,
      carry: {},
      carryElements: [],
    },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
    ...part,
  }) as unknown as Schedule

const SETTINGS = {
  importMinDate: '1970-01-01',
  importMaxDate: '2200-12-31',
  maxGroupDepth: 5, // S-125
  stackSafetyCap: 255, // S-89
} as unknown as DocumentSettings

const documentOf = (schedule: Record<string, unknown> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: scheduleOf(schedule),
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

/** One row `src` holding task 1, a child row `kid` holding task 2, and `target`. */
const DOCUMENT = documentOf({
  tasks: [
    taskOf({ uid: 1, name: 'Design' }),
    taskOf({ uid: 2, wbsParentUid: 1, name: 'Draft' }),
  ],
  taskGroups: [
    groupOf({ id: 'src', label: 'source' }),
    groupOf({ id: 'kid', parentId: 'src', label: 'source child' }),
    groupOf({ id: 'target', label: 'target' }),
  ],
  taskGroupMembers: [
    { taskUid: 1, groupId: 'src', stackOrder: null },
    { taskUid: 2, groupId: 'kid', stackOrder: null },
  ],
  taskVisuals: [visualOf({ taskUid: 1 }), visualOf({ taskUid: 2 })],
})

const accepted = (result: EditResult): Document => {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.refusals.map((one) => `${one.rule}: ${one.what}`).join('; '))
  return result.document
}

// ---------------------------------------------------------------------------
// The store is inside the app
// ---------------------------------------------------------------------------

describe('FR-033 -- 複製に使う置き場はアプリの中に持つこと（MUST）', () => {
  it('CM-8 and CM-28 name what to copy by identifier, so the payload never comes from outside', () => {
    // ⭐ THE SHAPE IS THE PROOF. 「置き場はアプリの中に持つ」 and 「OS のクリップ
    // ボードから読み込んではならない（MUST NOT）」 are satisfied by a paste that
    // takes an IDENTIFIER INTO THE CURRENT DOCUMENT and reads the content out
    // of that document. A command carrying the tasks themselves would be a
    // command that could be filled from anything, including a string that came
    // from outside -- which is exactly the reading the requirement forbids
    // (「外から来た文字列をタスクとして解釈すると、データの正確性を保証できない」).
    const pasted = accepted(editTask(DOCUMENT, { kind: 'pasteTaskSubtree', sourceUid: 1 }))
    // The copy carries the source's own name, which only the document knew.
    const copies = pasted.schedule.tasks.filter((task) => ![1, 2].includes(task.uid))
    expect(copies.map((one) => one.name).sort()).toEqual(['Design', 'Draft'])
  })

  it('the ClipboardGateway publishes a way OUT and no way IN (PI-24, table T-008 R-9)', () => {
    // 表 T-008 の `R-9`（OS のクリップボード）: 「**送信のみ・読まない**（検証の対象
    // にならない）」, and 表 T-064 の `PI-24` publishes 「`Clipboard`（表 T-065）／
    // `writeClipboard`」 -- a write and nothing else. A published reader would be
    // the entrance the MUST NOT refuses, whether or not anyone called it.
    const published = Object.keys(clipboardGateway)
    expect(published).toContain('writeClipboard')
    for (const name of published) {
      expect(/read|paste/i.test(name), `ClipboardGateway publishes ${name}`).toBe(false)
    }
  })

  it('table T-008 R-9 states the route is send-only', () => {
    const row = specTable('T-008').rows.find((one) => one.id === 'R-9')
    expect(row, 'table T-008 has no row R-9').toBeDefined()
    expect(JSON.stringify(row!.cells)).toContain('送信のみ')
    expect(JSON.stringify(row!.cells)).toContain('読まない')
  })

  it('src/ must not read the OS clipboard anywhere (MUST NOT)', () => {
    // ⛔ THE PROHIBITION IS ABOUT THE WHOLE PRODUCT, not about one seam: 「OS の
    // クリップボードから読み込んではならない（MUST NOT）」. The three browser
    // spellings of reading one are searched for across `src/`.
    //
    // ⚠️ Comments are stripped first, so a file that EXPLAINS the prohibition --
    // several do -- is not mistaken for a file that breaks it.
    const files = sourceFiles(join(process.cwd(), 'src'))
    expect(files.length, 'no TypeScript found under src/').toBeGreaterThan(0)
    const offenders: string[] = []
    for (const path of files) {
      const code = withoutComments(readFileSync(path, 'utf8'))
      // `navigator.clipboard.readText()` / `.read()`, the paste event, and the
      // `DataTransfer` a paste event carries.
      if (/clipboard\s*\.\s*read/.test(code)) offenders.push(`${path}: clipboard.read`)
      if (/clipboardData/.test(code)) offenders.push(`${path}: clipboardData`)
      if (/['"`]paste['"`]/.test(code)) offenders.push(`${path}: a 'paste' event`)
    }
    expect(offenders).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Both subtrees can be duplicated
// ---------------------------------------------------------------------------

describe('FR-033 -- both a Task subtree and a row subtree can be duplicated', () => {
  it('table T-108 gives FR-033 exactly two commands, one per subtree', () => {
    // ⭐ DRIVEN FROM THE TABLE, not from a typed pair: 表 T-108 は
    // 「`DocumentCommand` の全数」 and its 正 column names the requirement.
    const owned = specTable('T-108').rows.filter((one) => (one.by['正'] ?? '').includes('FR-033'))
    const byGroup = new Map(owned.map((one) => [bare(one.by['群'] ?? ''), bare(one.by['確定名'] ?? '')]))
    expect(byGroup.get('Task'), 'no Task command answers to FR-033').toBe('pasteTaskSubtree')
    expect(byGroup.get('TaskGroup'), 'no TaskGroup command answers to FR-033').toBe(
      'pasteTaskGroupSubtree',
    )
    expect(owned).toHaveLength(2)
  })

  it('the STATEMENT duplicates a Task with its WBS descendants, 部分木ごと', () => {
    const after = accepted(editTask(DOCUMENT, { kind: 'pasteTaskSubtree', sourceUid: 1 })).schedule
    const copies = after.tasks.filter((task) => ![1, 2].includes(task.uid))
    expect(copies).toHaveLength(2)
    const child = copies.find((copy) => copies.some((other) => other.uid === copy.wbsParentUid))!
    const root = copies.find((copy) => copy !== child)!
    expect(child.wbsParentUid).toBe(root.uid)
  })

  it('the STATEMENT duplicates a row with the rows under it, 部分木ごと', () => {
    const after = accepted(
      editTaskGroup(DOCUMENT, {
        kind: 'pasteTaskGroupSubtree',
        sourceGroupId: 'src',
        targetGroupId: 'target',
        newGroupIds: { src: 'c1', kid: 'c2' },
      } as unknown as TaskGroupCommand),
    ).schedule
    const ids = after.taskGroups.map((group) => group.id)
    expect(ids).toContain('c1')
    expect(ids).toContain('c2')
    // 「貼り付け先は、選んでいる行の子とすること（MUST）」
    expect(after.taskGroups.find((group) => group.id === 'c1')!.parentId).toBe('target')
    // `DU-2`: 「配下の行」 keeps its own place inside the copied subtree.
    expect(after.taskGroups.find((group) => group.id === 'c2')!.parentId).toBe('c1')
  })
})

// ---------------------------------------------------------------------------
// When there is nothing to paste
// ---------------------------------------------------------------------------

describe('FR-033 -- an empty store, and a source that is gone', () => {
  /**
   * The row of 表 T-108 a command name stands on.
   *
   * ⚠️ `Refusal.command` publishes the ROW ID (`CM-8`), not the 確定名, so the
   * expectation is read off the table rather than typed -- 1.9 (:274) makes the
   * first column the row ID precisely so a failure names one line of the
   * specification.
   */
  const rowFor = (settledName: string): string => {
    const row = specTable('T-108').rows.find((one) => bare(one.by['確定名'] ?? '') === settledName)
    if (row === undefined) throw new Error(`table T-108 has no command named ${settledName}`)
    return row.id
  }

  it('refuses a paste whose source Task is no longer in the document, as a value', () => {
    // ⭐ THE STORE HOLDS AN IDENTIFIER (see the first case), so "the store is
    // empty" and "what it named has been deleted" are the same state seen from
    // the document's side: nothing answers to the identifier. `FR-028` (MUST
    // NOT) forbids the exception, so the answer is a refusal VALUE.
    const result = editTask(DOCUMENT, { kind: 'pasteTaskSubtree', sourceUid: 99 } as TaskCommand)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.refusals.length).toBeGreaterThan(0)
    expect(result.refusals[0]!.command).toBe(rowFor('pasteTaskSubtree'))
  })

  it('refuses a paste whose source row is no longer in the document, as a value', () => {
    const result = editTaskGroup(DOCUMENT, {
      kind: 'pasteTaskGroupSubtree',
      sourceGroupId: 'gone',
      targetGroupId: 'target',
      newGroupIds: { gone: 'c1' },
    } as unknown as TaskGroupCommand)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.refusals[0]!.command).toBe(rowFor('pasteTaskGroupSubtree'))
  })

  it('must not throw for either empty case (FR-028, MUST NOT)', () => {
    expect(() =>
      editTask(DOCUMENT, { kind: 'pasteTaskSubtree', sourceUid: 99 } as TaskCommand),
    ).not.toThrow()
    expect(() =>
      editTaskGroup(DOCUMENT, {
        kind: 'pasteTaskGroupSubtree',
        sourceGroupId: 'gone',
        targetGroupId: 'target',
        newGroupIds: {},
      } as unknown as TaskGroupCommand),
    ).not.toThrow()
  })

  it('leaves the document untouched when it refuses', () => {
    const before = JSON.stringify(DOCUMENT)
    editTask(DOCUMENT, { kind: 'pasteTaskSubtree', sourceUid: 99 } as TaskCommand)
    expect(JSON.stringify(DOCUMENT)).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// The two shortcuts
// ---------------------------------------------------------------------------

describe('表 T-036 の SK-4 / SK-5 -- the two keys FR-033 is reached by', () => {
  it('SK-4 copies with Ctrl+C and SK-5 pastes with Ctrl+V', () => {
    // ⭐ Driven from the table rather than typed: 表 T-036 は
    // 「ショートカットキーの割当」 and its 割当 column is the assignment itself.
    const rows = specTable('T-036').rows
    const assignment = (id: string): string => {
      const row = rows.find((one) => one.id === id)
      if (row === undefined) throw new Error(`table T-036 has no row ${id}`)
      return bare(row.by['割当'] ?? '')
    }
    expect(assignment('SK-4')).toBe('Ctrl+C')
    expect(assignment('SK-5')).toBe('Ctrl+V')
  })

  it('IN-5a hands both keys to the browser while an in-place edit is uncommitted', () => {
    // 表 T-028 の `IN-5a`: 「⚠️ **`SK-4` / `SK-5`（`Ctrl+C` / `Ctrl+V`）も同様に効か
    // せず、文字への操作としてブラウザへ渡すこと（MUST）**」——渡さないと、その場で
    // 入力している文字をコピーも貼り付けもできない。
    const row = specTable('T-028').rows.find((one) => one.id === 'IN-5a')
    expect(row, 'table T-028 has no row IN-5a').toBeDefined()
    const text = JSON.stringify(row!.cells)
    expect(text).toContain('SK-4')
    expect(text).toContain('SK-5')
    expect(text).toContain('ブラウザへ渡す')
  })
})

// ---------------------------------------------------------------------------
// Helpers for the source scan
// ---------------------------------------------------------------------------

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path))
    else if (path.endsWith('.ts')) out.push(path)
  }
  return out
}

/** Block and line comments removed, so an explanation is not read as code. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}
