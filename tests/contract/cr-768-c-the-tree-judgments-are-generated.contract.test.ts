// CR-768 part C spec-only cases: the task group tree's guard judgments are generated from the manuscript (SD-5, T-328).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Schedule, TaskGroup } from '../../src/entity/document-model/schedule/schedule-entities'
import {
  levelZeroWritesFor,
  treeStateWritesFor,
  type TreeStateEvent,
} from '../../src/use-case/edit-document/task-group-folding'
import { treeFunctions, type TreeRow } from './guard-functions'
import { guardHolds, guardRegion, termHolds, type GuardScope, type GuardTerm } from './guard-language'
import { specTable, unbroken } from './spec-table'

type TreeState = TaskGroup['treeState']
type LevelZero = 'auto' | 'collapsed'
type Branch = { readonly to: string; readonly guard?: readonly GuardTerm[]; readonly effect?: string }
type Cell = Branch | readonly Branch[]
type RootCell = { readonly guard?: readonly GuardTerm[]; readonly effect: string }
type RawRegion = {
  readonly region: string
  readonly typeStem: string
  readonly unit: string
  readonly holds?: string
  readonly guards: readonly { readonly name: string; readonly condition: string }[]
  readonly events: readonly { readonly key: string; readonly carries: readonly { readonly name: string }[] }[]
  readonly root: { readonly transitions: Readonly<Record<string, RootCell>> }
  readonly machines: readonly {
    readonly name: string
    readonly transitions: Readonly<Record<string, Readonly<Record<string, Cell>>>>
  }[]
}

const SPEC = join(process.cwd(), 'docs', 'spec')
const MANUSCRIPT = JSON.parse(readFileSync(join(SPEC, '_source', 'state-machines.json'), 'utf8')) as {
  readonly guardLanguage: { readonly terms: readonly { readonly form: string; readonly meaning: { readonly ja: string } }[] }
  readonly regions: readonly RawRegion[]
}
const REGION = ((): RawRegion => {
  const found = MANUSCRIPT.regions.find((r) => r.region === 'taskGroupTree')
  if (found === undefined) throw new Error('state-machines.json has no region "taskGroupTree"')
  return found
})()
const MACHINE = ((): RawRegion['machines'][number] => {
  const found = REGION.machines.find((m) => m.name === 'treeStateMachine')
  if (found === undefined) throw new Error('region taskGroupTree has no treeStateMachine')
  return found
})()
const GUARD_NAMES = REGION.guards.map((g) => g.name)

const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))
const SD_5_GENERATES =
  'その領域は、出来事・状態遷移表・状態遷移図・状態の一覧と、ガードの名の型・ガードごとの判定・遷移表の定数だけを生成する'
const SD_5_ONE_INPUT =
  '判定は 1 つの入力（升が木の状態を決めるタスクグループ —— 根の升では無い ——、出来事が運ぶ値、式が呼ぶ名の付いた関数）を受け、遷移の関数は升のガードの名でその表から引く'
const TASK_GROUP_TERM_NULL = '根の升にはタスクグループが無く、`null` を読む'

// see SD-5, RA-2
// WHY: JDG-139 stage 3 -- the unit keeps its generated tables unexported, so they are read as the printed text.
const GENERATED = ((): string => {
  const text = readFileSync(join(process.cwd(), REGION.unit), 'utf8').replace(/\r\n/g, '\n')
  const open = text.indexOf('// <generated -- do not edit by hand>\n// From docs/spec/_source/state-machines.json')
  const close = text.indexOf('// </generated>', open)
  if (open < 0 || close < 0) throw new Error(`${REGION.unit} has no generated region from state-machines.json`)
  return text.slice(open, close)
})()

// see SD-5
// WHY: one printed entry runs from its "  name: (" line to the next one or the closing brace.
function printedGuardEntries(): readonly { readonly name: string; readonly text: string }[] {
  const head = 'const TREE_STATE_GUARDS = {\n'
  const at = GENERATED.indexOf(head)
  if (at < 0) throw new Error(`${REGION.unit} prints no TREE_STATE_GUARDS`)
  const entries: { name: string; text: string }[] = []
  for (const line of GENERATED.slice(at + head.length).split('\n')) {
    if (line === '}') return entries
    const key = /^ {2}([A-Za-z0-9]+): /.exec(line)
    if (key !== null) entries.push({ name: key[1] as string, text: line })
    else if (entries.length > 0) (entries[entries.length - 1] as { text: string }).text += `\n${line}`
  }
  throw new Error('TREE_STATE_GUARDS never closes')
}

// see T-328
// WHY: one tree holds every relation the seven guards tell apart: R and A are top level, P has a leaf child (L)
// and a child with children (C), G sits three deep with a child GG, S is a leaf beside P.
const TREE: readonly TreeRow[] = [
  { id: 'R', parentId: null },
  { id: 'P', parentId: 'R' },
  { id: 'C', parentId: 'P' },
  { id: 'G', parentId: 'C' },
  { id: 'GG', parentId: 'G' },
  { id: 'L', parentId: 'P' },
  { id: 'S', parentId: 'R' },
  { id: 'A', parentId: null },
]
const ABSENT = 'Z'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Schedule }
const TEMPLATE_GROUP: TaskGroup = ((): TaskGroup => {
  const first = TEMPLATE.schedule.taskGroups[0]
  if (first === undefined) throw new Error('the startup template holds no task group')
  return first
})()

/** @purity pure */
function scheduleWith(rest: TreeState, states: Readonly<Record<string, TreeState>>): Schedule {
  const taskGroups: TaskGroup[] = TREE.map((row, order) => ({
    ...TEMPLATE_GROUP,
    id: row.id,
    parentId: row.parentId,
    name: row.id,
    order,
    treeState: states[row.id] ?? rest,
  }))
  return { ...TEMPLATE.schedule, taskGroups, taskGroupMembers: [], tasks: [] }
}

// see SD-5, T-328
// WHY: the manuscript's taskGroup.<column> term reads the cell's task group; in a root cell it reads null.
/** @purity pure */
function scopeOf(taskGroup: TreeRow | null, event: Readonly<Record<string, unknown>>, levelZero: LevelZero): GuardScope {
  return {
    region: 'taskGroupTree',
    values: {},
    event,
    taskGroup: taskGroup as unknown as Readonly<Record<string, unknown>>,
    functions: treeFunctions(TREE, { 'S-418': levelZero }),
  }
}

/** @purity pure */
function branchesOf(cell: Cell | undefined): readonly Branch[] {
  if (cell === undefined) return []
  return Array.isArray(cell) ? (cell as readonly Branch[]) : [cell as Branch]
}

/** @purity pure */
function carriedOf(event: TreeStateEvent): Readonly<Record<string, unknown>> {
  const { type: _type, ...carried } = event as unknown as Record<string, unknown>
  return carried
}

type Written = { readonly id: string; readonly to: string }

// WHY: the expected writes come from the manuscript's conditions over the same tree, never from the code;
// a task group whose cell leaves it where it is writes nothing (SD-3, the same reference).
/** @purity pure */
function manuscriptWrites(schedule: Schedule, event: TreeStateEvent): Written[] {
  const out: Written[] = []
  for (const group of schedule.taskGroups) {
    const row = TREE.find((one) => one.id === group.id) ?? null
    const scope = scopeOf(row, carriedOf(event), 'auto')
    const taken = branchesOf(MACHINE.transitions[event.type]?.[group.treeState]).filter((b) =>
      (b.guard ?? []).every((term) => termHolds(scope, term)),
    )
    if (taken.length > 1) throw new Error(`T-328 gives ${group.id} in ${group.treeState} on ${event.type} ${taken.length} branches`)
    const to = taken[0]?.to
    if (to !== undefined && to !== group.treeState) out.push({ id: group.id, to })
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

/** @purity pure */
function writesOf(schedule: Schedule, event: TreeStateEvent): Written[] {
  return treeStateWritesFor(schedule, event)
    .map((command) => {
      const loose = command as unknown as { kind: string; taskGroupId?: string; treeState?: string }
      expect(loose.kind, 'CM-85: every write is setTaskGroupTreeState').toBe('setTaskGroupTreeState')
      return { id: String(loose.taskGroupId), to: String(loose.treeState) }
    })
    .sort((a, b) => a.id.localeCompare(b.id))
}

/** @purity pure */
function eventOf(type: string, carried: Readonly<Record<string, unknown>>): TreeStateEvent {
  return { type, ...carried } as unknown as TreeStateEvent
}

type Scene = {
  readonly label: string
  readonly guard: string
  // WHY: the truth the clause gives the subject task group, written by hand; the manuscript condition must agree.
  readonly holds: boolean
  readonly subject: string
  readonly rest: TreeState
  readonly states: Readonly<Record<string, TreeState>>
  readonly event: TreeStateEvent
}

const press = (type: string, pressedRowId: string | null): TreeStateEvent => eventOf(type, { pressedRowId })
const reveal = (revealedRowId: string): TreeStateEvent => eventOf('taskGroupRevealAsked', { revealedRowId })

// see HR-3, HR-4, HR-6, HR-7, HR-8, HF-13, HF-14, HF-16, IC-93, SJ-2, TD-6
// WHY: each guard is read in a cell that names it, with the other task groups in a value that cell leaves alone,
// so the subject's write is decided by that guard's truth alone.
const SCENES: readonly Scene[] = [
  // WHY: isPressedTaskGroup is read in the cell childTaskGroupAddPressed x auto -> temporarilyExpanded (HR-8, HF-14)
  { label: 'the pressed task group has children', guard: 'isPressedTaskGroup', holds: true, subject: 'P', rest: 'auto', states: {}, event: press('childTaskGroupAddPressed', 'P') },
  { label: 'the pressed task group is a leaf', guard: 'isPressedTaskGroup', holds: true, subject: 'L', rest: 'auto', states: {}, event: press('childTaskGroupAddPressed', 'L') },
  { label: 'a child of the pressed task group', guard: 'isPressedTaskGroup', holds: false, subject: 'C', rest: 'auto', states: {}, event: press('childTaskGroupAddPressed', 'P') },
  { label: 'the head add (IC-93) presses null', guard: 'isPressedTaskGroup', holds: false, subject: 'R', rest: 'auto', states: {}, event: press('childTaskGroupAddPressed', null) },
  { label: 'the pressed id is absent from the tree', guard: 'isPressedTaskGroup', holds: false, subject: 'P', rest: 'auto', states: {}, event: press('childTaskGroupAddPressed', ABSENT) },
  // WHY: isChildOfPressedTaskGroup is read in the cell oneLevelOpenPressed x hidden -> collapsed (HR-7, HF-13)
  { label: 'a child with children of the pressed task group', guard: 'isChildOfPressedTaskGroup', holds: true, subject: 'C', rest: 'auto', states: { C: 'hidden' }, event: press('oneLevelOpenPressed', 'P') },
  { label: 'a leaf child of the pressed task group', guard: 'isChildOfPressedTaskGroup', holds: true, subject: 'L', rest: 'auto', states: { L: 'hidden' }, event: press('oneLevelOpenPressed', 'P') },
  { label: 'a grandchild of the pressed task group', guard: 'isChildOfPressedTaskGroup', holds: false, subject: 'G', rest: 'auto', states: { G: 'hidden' }, event: press('oneLevelOpenPressed', 'P') },
  { label: 'the pressed task group itself', guard: 'isChildOfPressedTaskGroup', holds: false, subject: 'P', rest: 'auto', states: { P: 'hidden' }, event: press('oneLevelOpenPressed', 'P') },
  { label: 'a top-level task group when null is pressed', guard: 'isChildOfPressedTaskGroup', holds: false, subject: 'A', rest: 'auto', states: { A: 'hidden' }, event: press('oneLevelOpenPressed', null) },
  { label: 'a top-level task group when an absent id is pressed', guard: 'isChildOfPressedTaskGroup', holds: false, subject: 'A', rest: 'auto', states: { A: 'hidden' }, event: press('oneLevelOpenPressed', ABSENT) },
  // WHY: isLeafTaskGroup is read in the cell everyTaskGroupOpenPressed x collapsed: leaf -> auto, parent -> temporarilyExpanded (HR-1, TD-6)
  { label: 'a leaf below a parent', guard: 'isLeafTaskGroup', holds: true, subject: 'L', rest: 'expanded', states: { L: 'collapsed' }, event: eventOf('everyTaskGroupOpenPressed', {}) },
  { label: 'a top-level leaf', guard: 'isLeafTaskGroup', holds: true, subject: 'A', rest: 'expanded', states: { A: 'collapsed' }, event: eventOf('everyTaskGroupOpenPressed', {}) },
  { label: 'a parent of one child', guard: 'isLeafTaskGroup', holds: false, subject: 'G', rest: 'expanded', states: { G: 'collapsed' }, event: eventOf('everyTaskGroupOpenPressed', {}) },
  { label: 'a top-level parent', guard: 'isLeafTaskGroup', holds: false, subject: 'R', rest: 'expanded', states: { R: 'collapsed' }, event: eventOf('everyTaskGroupOpenPressed', {}) },
  // WHY: isBelowPressedTaskGroup is read in the cell hidePressed x auto: pressed -> hidden, below -> collapsed (HR-6, HR-1a)
  { label: 'a child of the pressed task group', guard: 'isBelowPressedTaskGroup', holds: true, subject: 'C', rest: 'hidden', states: { C: 'auto' }, event: press('hidePressed', 'P') },
  { label: 'a leaf three below the pressed task group', guard: 'isBelowPressedTaskGroup', holds: true, subject: 'GG', rest: 'hidden', states: { GG: 'auto' }, event: press('hidePressed', 'P') },
  { label: 'the pressed task group itself', guard: 'isBelowPressedTaskGroup', holds: false, subject: 'P', rest: 'hidden', states: { P: 'auto' }, event: press('hidePressed', 'P') },
  { label: 'an ancestor of the pressed task group', guard: 'isBelowPressedTaskGroup', holds: false, subject: 'R', rest: 'hidden', states: { R: 'auto' }, event: press('hidePressed', 'P') },
  { label: 'a task group beside the pressed one', guard: 'isBelowPressedTaskGroup', holds: false, subject: 'S', rest: 'hidden', states: { S: 'auto' }, event: press('hidePressed', 'P') },
  { label: 'a task group below a pressed leaf -- none exists', guard: 'isBelowPressedTaskGroup', holds: false, subject: 'GG', rest: 'hidden', states: { GG: 'auto', L: 'auto' }, event: press('hidePressed', 'L') },
  { label: 'a top-level task group when null is pressed', guard: 'isBelowPressedTaskGroup', holds: false, subject: 'A', rest: 'hidden', states: { A: 'auto' }, event: press('hidePressed', null) },
  { label: 'a task group when an absent id is pressed', guard: 'isBelowPressedTaskGroup', holds: false, subject: 'C', rest: 'hidden', states: { C: 'auto' }, event: press('hidePressed', ABSENT) },
  // WHY: isRevealedTaskGroupOrAncestor is read in the cell taskGroupRevealAsked x collapsed -> expanded (SJ-2)
  { label: 'the task group revealed', guard: 'isRevealedTaskGroupOrAncestor', holds: true, subject: 'G', rest: 'expanded', states: { G: 'collapsed' }, event: reveal('G') },
  { label: 'an ancestor of the task group revealed', guard: 'isRevealedTaskGroupOrAncestor', holds: true, subject: 'R', rest: 'expanded', states: { R: 'collapsed' }, event: reveal('G') },
  { label: 'a revealed top-level task group itself', guard: 'isRevealedTaskGroupOrAncestor', holds: true, subject: 'A', rest: 'expanded', states: { A: 'collapsed' }, event: reveal('A') },
  { label: 'a descendant of the task group revealed', guard: 'isRevealedTaskGroupOrAncestor', holds: false, subject: 'GG', rest: 'expanded', states: { GG: 'collapsed' }, event: reveal('G') },
  { label: 'a task group unrelated to the one revealed', guard: 'isRevealedTaskGroupOrAncestor', holds: false, subject: 'S', rest: 'expanded', states: { S: 'collapsed' }, event: reveal('G') },
  { label: 'a task group when the revealed id is absent', guard: 'isRevealedTaskGroupOrAncestor', holds: false, subject: 'P', rest: 'expanded', states: { P: 'collapsed' }, event: reveal(ABSENT) },
  // WHY: isTopLevelTaskGroup is read in the cell topLevelOpenPressed x hidden -> collapsed (HF-16)
  { label: 'a top-level parent', guard: 'isTopLevelTaskGroup', holds: true, subject: 'R', rest: 'auto', states: { R: 'hidden' }, event: eventOf('topLevelOpenPressed', {}) },
  { label: 'a top-level leaf', guard: 'isTopLevelTaskGroup', holds: true, subject: 'A', rest: 'auto', states: { A: 'hidden' }, event: eventOf('topLevelOpenPressed', {}) },
  { label: 'a child of a top-level task group', guard: 'isTopLevelTaskGroup', holds: false, subject: 'P', rest: 'auto', states: { P: 'hidden' }, event: eventOf('topLevelOpenPressed', {}) },
  { label: 'a leaf four deep', guard: 'isTopLevelTaskGroup', holds: false, subject: 'GG', rest: 'auto', states: { GG: 'hidden' }, event: eventOf('topLevelOpenPressed', {}) },
]

const ROOT_EFFECT_VALUE: Readonly<Record<string, LevelZero>> = { writeLevelZeroCollapsed: 'collapsed', writeLevelZeroAuto: 'auto' }

/** @purity pure */
function levelZeroAfter(levelZero: LevelZero, event: TreeStateEvent): LevelZero {
  let value = levelZero
  for (const command of levelZeroWritesFor(levelZero, event)) {
    const loose = command as unknown as { kind: string; levelZeroTreeState?: string }
    expect(loose.kind, 'S-418: the root cell writes levelZeroTreeState').toBe('setLevelZeroTreeState')
    value = loose.levelZeroTreeState as LevelZero
  }
  return value
}

/** @purity pure */
function rootEventOf(key: string): TreeStateEvent {
  const carries = REGION.events.find((e) => e.key === key)?.carries ?? []
  const carried: Record<string, unknown> = {}
  for (const c of carries) carried[c.name] = c.name === 'pressedRowId' ? null : 'G'
  return eventOf(key, carried)
}

describe('SD-5, 5.5: the clauses this file is driven by', () => {
  it('SD-5 says the tree region generates its guard names and its judgments, each taking one input', () => {
    const sd5 = specTable('T-250').rows.find((r) => r.id === 'SD-5')?.cells.join(' ') ?? ''
    expect(sd5).toContain(SD_5_GENERATES)
    expect(sd5).toContain(SD_5_ONE_INPUT)
    expect(DESIGN).toContain('領域ごとに、ガードと同じ名の判定を 1 つずつ持つ表をその式から生成し、遷移の関数はその表を通して呼ぶ')
  })

  it('guardLanguage: the taskGroup.<column> term reads null in a root cell', () => {
    const term = MANUSCRIPT.guardLanguage.terms.find((t) => t.form === 'taskGroup.<column>')
    expect(term?.meaning.ja).toContain(TASK_GROUP_TERM_NULL)
    // STEP: the evaluator reads the term as the rule says -- a root cell's taskGroup.id is null, not an error
    expect(termHolds(scopeOf(null, {}, 'auto'), { name: 'isTopLevelTaskGroup' })).toBe(true)
  })
})

describe('SD-5, RA-2: the generated region prints const TREE_STATE_GUARDS', () => {
  it('keyed by exactly the region guard names, in manuscript order', () => {
    expect(REGION.holds).toBe('documentData')
    expect(printedGuardEntries().map((e) => e.name)).toEqual(GUARD_NAMES)
  })

  it('SD-5: each judgment takes one input and reads only the task group, the event and the functions its condition calls', () => {
    for (const guard of REGION.guards) {
      const entry = printedGuardEntries().find((e) => e.name === guard.name)
      const input = /^ {2}[A-Za-z0-9]+: \(\{ ([^}]*) \}: TreeStateGuardInput\): boolean =>/.exec(entry?.text ?? '')
      expect(input, `${guard.name} takes one destructured TreeStateGuardInput`).not.toBeNull()
      const read = (input?.[1] ?? '').split(',').map((n) => n.trim())
      const called = [...guard.condition.matchAll(/\b([A-Za-z]+)\(/g)].map((m) => m[1] as string)
      const allowed = new Set(['taskGroup', 'event', ...called])
      for (const name of read) expect(allowed.has(name), `${guard.name} reads ${name}`).toBe(true)
    }
  })

  it('RA-3: a named function a tree condition calls is called, not defined, in the generated region', () => {
    const called = [...new Set(REGION.guards.flatMap((g) => [...g.condition.matchAll(/\b([A-Za-z]+)\(/g)].map((m) => m[1] as string)))]
    expect(called.sort()).toEqual(['ancestors', 'childTaskGroups', 'setting'])
    for (const name of called) {
      expect(GENERATED).toContain(`${name}(`)
      expect(GENERATED).not.toMatch(new RegExp(`function ${name}\\b|const ${name} =`))
    }
  })
})

describe('SD-5, T-328: every tree guard, true and false, through treeStateWritesFor and levelZeroWritesFor', () => {
  it('T-328: every guard of the region has a true and a false scene in this file', () => {
    const machineGuards = GUARD_NAMES.filter((n) => n !== 'isLevelZeroCollapsed')
    for (const name of machineGuards) {
      expect(SCENES.some((s) => s.guard === name && s.holds), `${name} true`).toBe(true)
      expect(SCENES.some((s) => s.guard === name && !s.holds), `${name} false`).toBe(true)
    }
    // WHY: isLevelZeroCollapsed is read only in root cells; its scenes are the level zero 'auto' / 'collapsed' cases below.
    expect(Object.values(REGION.root.transitions).some((c) => (c.guard ?? []).some((g) => g.name === 'isLevelZeroCollapsed'))).toBe(true)
  })

  it.each(SCENES.map((s) => [`${s.guard}: ${s.label} (${String(s.holds)})`, s] as const))('%s', (_, scene) => {
    const row = TREE.find((one) => one.id === scene.subject) ?? null
    // STEP: the manuscript condition reads the subject as the clause says
    expect(guardHolds(scopeOf(row, carriedOf(scene.event), 'auto'), scene.guard)).toBe(scene.holds)
    // STEP: the writes are exactly what the manuscript cells give over the same tree
    const schedule = scheduleWith(scene.rest, scene.states)
    const expected = manuscriptWrites(schedule, scene.event)
    expect(writesOf(schedule, scene.event)).toEqual(expected)
    // STEP: the subject moves exactly when its guard holds, so the scene is a boundary of that guard
    const from = scene.states[scene.subject] ?? scene.rest
    const scope = scopeOf(row, carriedOf(scene.event), 'auto')
    const positive = branchesOf(MACHINE.transitions[scene.event.type]?.[from]).filter((b) =>
      (b.guard ?? []).some((g) => g.name === scene.guard && g.not !== true),
    )
    expect(positive.length, `${scene.event.type} x ${from} names ${scene.guard}`).toBeGreaterThan(0)
    const taken = positive.find((b) => (b.guard ?? []).every((t) => termHolds(scope, t)))
    const moved = expected.find((w) => w.id === scene.subject)
    if (scene.holds) {
      expect(taken, `${scene.subject} takes a ${scene.guard} branch`).toBeDefined()
      expect(moved?.to, `${scene.subject} is written to that branch's target`).toBe(taken?.to)
    } else {
      expect(taken, `${scene.subject} takes no ${scene.guard} branch`).toBeUndefined()
    }
  })

  describe('isLevelZeroCollapsed (S-418, HR-2): every guarded root cell', () => {
    const guarded = Object.entries(REGION.root.transitions).filter(([, c]) => (c.guard ?? []).some((g) => g.name === 'isLevelZeroCollapsed'))
    it.each(guarded.flatMap(([key]) => (['auto', 'collapsed'] as const).map((lz) => [key, lz] as const)))(
      '%s with level zero %s',
      (key, levelZero) => {
        const event = rootEventOf(key)
        const holds = guardHolds(scopeOf(null, carriedOf(event), levelZero), 'isLevelZeroCollapsed')
        expect(holds, 'S-418: the guard holds exactly when level zero is collapsed').toBe(levelZero === 'collapsed')
        if (holds) expect(levelZeroAfter(levelZero, event)).toBe(ROOT_EFFECT_VALUE[REGION.root.transitions[key]?.effect ?? ''])
        // WHY: T-328 prints the other case as no change, so no write at all
        else expect(levelZeroWritesFor(levelZero, event)).toEqual([])
      },
    )
  })
})

describe('T-328 root cells: every event x level zero gives the value the manuscript cell gives', () => {
  // WHY: tree-state-machine.contract.test.ts already walks every machine cell (event x value x task group relation)
  // over a tree that reaches every branch; the root cells, written through levelZeroWritesFor, are walked here.
  it.each(REGION.events.flatMap((e) => (['auto', 'collapsed'] as const).map((lz) => [e.key, lz] as const)))(
    '%s with level zero %s',
    (key, levelZero) => {
      const event = rootEventOf(key)
      const cell = REGION.root.transitions[key]
      const takes = cell !== undefined && (cell.guard ?? []).every((t) => termHolds(scopeOf(null, carriedOf(event), levelZero), t))
      // WHY: a cell's effect writes its value; writing the value level zero already holds changes nothing (SD-3).
      const expected = takes ? (ROOT_EFFECT_VALUE[cell.effect] ?? 'unknown effect') : levelZero
      expect(levelZeroAfter(levelZero, event)).toBe(expected)
      if (!takes) expect(levelZeroWritesFor(levelZero, event)).toEqual([])
    },
  )

  it('T-328: every root effect the manuscript names has a value this file knows', () => {
    for (const cell of Object.values(REGION.root.transitions)) expect(Object.keys(ROOT_EFFECT_VALUE)).toContain(cell.effect)
  })

  it('SD-5: the guard-language reader sees the same seven guards the generated table prints', () => {
    expect((guardRegion('taskGroupTree').guards ?? []).map((g) => g.name)).toEqual(GUARD_NAMES)
    expect(GUARD_NAMES).toHaveLength(7)
  })
})
