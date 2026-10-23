// CR-767 wave 3 spec-only cases: each guard's judgment is generated from its manuscript condition (5.5, SD-3, RA-2, RA-3).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  branchHolds,
  evaluateCondition,
  GUARD_REGIONS,
  guardHolds,
  guardRegion,
  type GuardScope,
  type GuardTerm,
} from './guard-language'
import { specTable, unbroken } from './spec-table'

type Loose = Record<string, unknown>
type RawBranch = { readonly to?: string; readonly guard?: readonly GuardTerm[]; readonly effect?: string; readonly effectArgument?: string }
type RawCell = RawBranch | readonly RawBranch[]
type RawMachine = {
  readonly name: string
  readonly states: readonly { readonly key: string; readonly parent: string | null; readonly initial: boolean }[]
  readonly transitions: Readonly<Record<string, Readonly<Record<string, RawCell>>>>
}
type RawRegion = {
  readonly region: string
  readonly root: { readonly transitions: Readonly<Record<string, RawCell>> }
  readonly machines: readonly RawMachine[]
}

const SPEC = join(process.cwd(), 'docs', 'spec')
const MANUSCRIPT = JSON.parse(readFileSync(join(SPEC, '_source', 'state-machines.json'), 'utf8')) as {
  readonly guardLanguage: unknown
  readonly regions: readonly RawRegion[]
}
const GUARD_LANGUAGE = JSON.stringify(MANUSCRIPT.guardLanguage)
const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))

const GUARDED = GUARD_REGIONS.filter((r) => r.holds !== 'documentData' && (r.guards ?? []).length > 0)
const DOCUMENT_DATA = GUARD_REGIONS.filter((r) => r.holds === 'documentData')

function rowText(table: string, id: string): string {
  const row = specTable(table).rows.find((r) => r.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' ')
}

function upperSnake(stem: string): string {
  return stem.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()
}

const GENERATED_OPEN = '// <generated -- do not edit by hand>'
const GENERATED_FROM = '// From docs/spec/_source/state-machines.json'
const GENERATED_CLOSE = '// </generated>'

// see SD-3, RA-2
function generatedRegionOf(unit: string): string {
  const text = readFileSync(join(process.cwd(), unit), 'utf8').replace(/\r\n/g, '\n')
  let at = text.indexOf(GENERATED_OPEN)
  while (at >= 0) {
    const next = text.slice(at + GENERATED_OPEN.length + 1)
    const end = text.indexOf(GENERATED_CLOSE, at)
    if (next.startsWith(GENERATED_FROM) && end >= 0) return text.slice(at, end)
    at = text.indexOf(GENERATED_OPEN, at + 1)
  }
  throw new Error(`${unit} has no generated region from state-machines.json`)
}

function guardTableKeys(generated: string, stem: string): string[] | null {
  const head = `const ${upperSnake(stem)}_GUARDS = {\n`
  const at = generated.indexOf(head)
  if (at < 0) return null
  const keys: string[] = []
  for (const line of generated.slice(at + head.length).split('\n')) {
    if (line === '}') return keys
    const key = /^ {2}([A-Za-z0-9]+): /.exec(line)
    if (key !== null) keys.push(key[1] as string)
  }
  throw new Error(`${stem}: the guard table never closes`)
}

function calledFunctions(condition: string): string[] {
  return [...condition.matchAll(/\b([A-Za-z]+)\(/g)].map((m) => m[1] as string).filter((n) => n !== 'in' && n !== 'inAfter' && n !== 'after')
}

describe('5.5, T-250 SD-3 and SD-5, T-285 RA-2 and RA-3: the clauses this file is driven by', () => {
  it('5.5 says: "ガードごとの判定をその条件の式から生成する"', () => {
    expect(DESIGN).toContain('TypeScript の判別共用体と初期値とガードの名の型を生成し、ガードごとの判定をその条件の式から生成する')
    expect(DESIGN).toContain('手で書くのは各領域の遷移の関数と、ガードの式が呼ぶ名の付いた関数（原稿の頭の関数の一覧）の本体だけである')
    expect(DESIGN).toContain('式が呼ぶ名の付いた関数は、領域のユニットが同じ名で手で書く（無ければ型の検査が止める）')
  })

  it('SD-3 says "コードの判定もその式から生成する"; SD-5 generates the events, tables, figures, the state list, the guard names, the judgments and the constant', () => {
    expect(rowText('T-250', 'SD-3')).toContain('コードの判定もその式から生成する')
    expect(rowText('T-250', 'SD-5')).toContain(
      'その領域は、出来事・状態遷移表・状態遷移図・状態の一覧と、ガードの名の型・ガードごとの判定・遷移表の定数だけを生成する',
    )
    expect(rowText('T-250', 'SD-5')).toContain(
      '判定は 1 つの入力（升が木の状態を決めるタスクグループ —— 根の升では無い ——、出来事が運ぶ値、式が呼ぶ名の付いた関数）を受け、遷移の関数は升のガードの名でその表から引く',
    )
  })

  it('RA-2 prints "ガードごとの判定"; RA-3 writes the named functions by hand under the same names', () => {
    expect(rowText('T-285', 'RA-2')).toContain('判別共用体・ガードの名の型・ガードごとの判定・遷移表の定数を刷る')
    expect(rowText('T-285', 'RA-3')).toContain('ガードの式が呼ぶ名の付いた関数も、同じ名で手で書く')
  })
})

describe('SD-3, RA-2: each guarded region prints const <STEM>_GUARDS keyed by its guards, in manuscript order', () => {
  it.each(GUARDED.map((r) => [r.region, r] as const))('region %s', (_, region) => {
    const keys = guardTableKeys(generatedRegionOf(region.unit), region.typeStem)
    expect(keys, `${region.unit} prints no ${upperSnake(region.typeStem)}_GUARDS`).not.toBeNull()
    expect(keys).toEqual((region.guards ?? []).map((g) => g.name))
  })

  it.each(GUARDED.map((r) => [r.region, r] as const))('RA-3, region %s: a named function a condition calls is called, not defined, in the generated region', (_, region) => {
    const generated = generatedRegionOf(region.unit)
    const called = [...new Set((region.guards ?? []).flatMap((g) => calledFunctions(g.condition)))]
    for (const name of called) {
      expect(generated, `${name} is called by the generated table`).toContain(`${name}(`)
      expect(generated, `${name} has its body outside the generated region`).not.toMatch(new RegExp(`function ${name}\\b|const ${name} =`))
    }
  })

  it.each(DOCUMENT_DATA.map((r) => [r.region, r] as const))('SD-5, region %s (documentData): the generated region prints its guard table too', (_, region) => {
    const keys = guardTableKeys(generatedRegionOf(region.unit), region.typeStem)
    expect(keys, `${region.unit} prints no ${upperSnake(region.typeStem)}_GUARDS`).not.toBeNull()
    expect(keys).toEqual((region.guards ?? []).map((g) => g.name))
  })
})


type Scene = {
  readonly label: string
  readonly values: Loose
  readonly event: Loose
  readonly also?: (before: Loose, after: Loose, truth: boolean) => void
}
type GuardCase = {
  readonly region: string
  readonly guard: string
  readonly machine: string | null
  readonly state: string | null
  readonly scenes: readonly Scene[]
}

function rawRegion(name: string): RawRegion {
  const region = MANUSCRIPT.regions.find((r) => r.region === name)
  if (region === undefined) throw new Error(`state-machines.json has no region "${name}"`)
  return region
}

function rawMachine(region: string, name: string): RawMachine {
  const machine = rawRegion(region).machines.find((m) => m.name === name)
  if (machine === undefined) throw new Error(`region ${region} has no machine ${name}`)
  return machine
}

function fieldOf(machine: string): string {
  return machine.replace(/Machine$/, '')
}

function branchesOf(cell: RawCell | undefined): readonly RawBranch[] {
  if (cell === undefined) return []
  return Array.isArray(cell) ? (cell as readonly RawBranch[]) : [cell as RawBranch]
}

function kindPath(value: unknown): string[] {
  const path: string[] = []
  let at = value as Loose | undefined
  while (at !== undefined && at !== null && typeof at === 'object') {
    path.push(String(at['kind']))
    at = at['child'] as Loose | undefined
  }
  return path
}

// WHY: a cell on a composite answers for every state below it; the innermost cell is read first.
function cellFor(machine: RawMachine, event: string, key: string): RawCell | undefined {
  const parts = key.split('.')
  for (let depth = parts.length; depth >= 1; depth -= 1) {
    const cell = machine.transitions[event]?.[parts.slice(0, depth).join('.')]
    if (cell !== undefined) return cell
  }
  return undefined
}

function completePath(machine: RawMachine, key: string): string[] {
  let at = key
  for (;;) {
    const child = machine.states.find((s) => s.parent === at && s.initial)
    if (child === undefined) return at.split('.')
    at = child.key
  }
}

function regionValues(session: ScreenSession, region: string): Loose {
  return (session as unknown as Loose)[region] as Loose
}

function sessionWith(region: string, values: Loose): ScreenSession {
  const base = emptyScreenSession as unknown as Loose
  return { ...base, [region]: { ...(base[region] as Loose), ...values } } as unknown as ScreenSession
}

type Ran = { truth: boolean; selected: RawBranch | undefined; before: Loose; after: Loose; effects: readonly Loose[]; cell: readonly RawBranch[] }

// WHY: inAfter / after read the machine after the same event's step; the step's own result is that
// value, and whether that machine itself landed right is the region contract test's business.
function run(c: GuardCase, scene: Scene): Ran {
  const session = sessionWith(c.region, scene.values)
  const before = regionValues(session, c.region)
  const result = advanceScreenSession(session, scene.event as unknown as SessionEvent)
  const after = regionValues(result.state, c.region)
  const scope: GuardScope = { region: c.region, values: before, event: scene.event, after: (m) => after[fieldOf(m)] }
  const type = String(scene.event['type'])
  const cell =
    c.machine === null
      ? branchesOf(rawRegion(c.region).root.transitions[type])
      : branchesOf(cellFor(rawMachine(c.region, c.machine), type, kindPath(before[fieldOf(c.machine)]).join('.')))
  return {
    truth: guardHolds(scope, c.guard),
    selected: cell.find((b) => branchHolds(scope, b)),
    before,
    after,
    effects: result.effects as unknown as readonly Loose[],
    cell,
  }
}

// see SD-3, SF-3
function expectSceneMatchesTable(c: GuardCase, scene: Scene): void {
  const ran = run(c, scene)
  expect(ran.cell.some((b) => (b.guard ?? []).some((g) => g.name === c.guard)), `the cell names ${c.guard}`).toBe(true)
  if (c.machine !== null) {
    const machine = rawMachine(c.region, c.machine)
    const field = fieldOf(c.machine)
    expect(kindPath(ran.before[field]).join('.').startsWith(c.state ?? '?'), `the scene stands on ${c.machine}.${String(c.state)}`).toBe(true)
    if (ran.selected === undefined) {
      expect(ran.after[field], 'no branch holds: the same reference').toBe(ran.before[field])
    } else {
      const to = String(ran.selected.to).replace(/\{(\w+)\}/g, (_, name: string) => String(scene.event[name]))
      expect(kindPath(ran.after[field]), `lands on ${to}`).toEqual(completePath(machine, to))
    }
  }
  const named = new Set(ran.cell.flatMap((b) => (b.effect === undefined ? [] : [b.effect])))
  const got = ran.effects.filter((e) => named.has(String(e['type'])))
  expect(got.map((e) => String(e['type'])), 'the effect of the branch the table selects').toEqual(
    ran.selected?.effect === undefined ? [] : [ran.selected.effect],
  )
  const argument = ran.selected?.effectArgument
  if (argument !== undefined) expect(Object.values(got[0] ?? {}), `the effect carries ${argument}`).toContain(argument)
  scene.also?.(ran.before, ran.after, ran.truth)
}

const sc = (label: string, values: Loose, event: Loose, also?: Scene['also']): Scene => ({
  label,
  values,
  event,
  ...(also === undefined ? {} : { also }),
})
const open = (surfaceName: string): Loose => ({ kind: 'open', surfaceName })
const esc = (rung: string): Loose => ({ type: 'escapePressed', rung })
const closeAsked = (target: string): Loose => ({ type: 'surfaceCloseAsked', target })

// see FR-085, FR-072
const ONE_ITEM = { items: [{ kind: 'task', uid: 1 }], isOrdered: false }
const TWO_ITEMS = { items: [{ kind: 'task', uid: 1 }, { kind: 'task', uid: 2 }], isOrdered: false }
const NO_ITEMS = { items: [], isOrdered: false }
const SUBJECT = { selection: ONE_ITEM, taskGroupIds: [] }
const subject = (selection: unknown, taskGroupIds: readonly string[]): Loose => ({ selection, taskGroupIds })
const SELECTION_SHOWN = { propertiesPanelContentState: { kind: 'selectionDisplayed', subject: SUBJECT } }
const SETTINGS_SHOWN = { propertiesPanelContentState: { kind: 'documentSettingsDisplayed' } }

// see WC-10, WC-8, IV-17
const CLEAN_DRAFT = { workingDayTypes: [2, 3, 4, 5, 6], weekStartDay: 1, ranges: [{ start: '8:00', end: '17:00' }], exceptions: [] }
const ONE_REFUSAL_DRAFT = { ...CLEAN_DRAFT, workingDayTypes: [] }
const TWO_REFUSALS_DRAFT = { ...CLEAN_DRAFT, workingDayTypes: [], ranges: [{ start: '17:00', end: '8:00' }] }
const drafted = (calendarDraft: unknown): Loose => ({ calendarDraftState: { kind: 'drafted', calendarDraft } })

const arm = (child: Loose): Loose => ({ armModeState: { kind: 'armed', child } })
const armEvent = (armKind: string, shapeKind: string | null, glyph: string | null): Loose => ({ type: 'armEntryPressed', armKind, shapeKind, glyph })

// see NT-3, NT-8, T-233
const OLDEST = { reason: 'RS-41', affectedCount: 3 }
const NEWEST = { reason: 'RS-2', affectedCount: null }
const TIMED = { reason: 'RS-65', affectedCount: null }
const WORDS_OWNER = { reason: 'RS-6', affectedCount: null }
const shown = (...standing: readonly Loose[]): Loose => ({ noticeDisplayState: { kind: 'shown', standing } })
const standingLength = (values: Loose): number => {
  const display = values['noticeDisplayState'] as Loose
  return display['kind'] === 'shown' ? (display['standing'] as readonly unknown[]).length : 0
}
// see NT-3
const bundledOrAppended = (before: Loose, after: Loose, truth: boolean): void => {
  expect(standingLength(after), truth ? 'the same words bundle into one card' : 'a new card stands').toBe(standingLength(before) + (truth ? 0 : 1))
}

// see AG-9, FR-018, FR-053, GR-19
const GRAB_SHAPE = { kind: 'grab', grabTaskGroup: 'GR-23', itemId: 'task1' }
const REPEATING = { kind: 'entry', entry: 'IC-12' }
const LAST_REPEATING = { kind: 'entry', entry: 'IC-15' }
const PLAIN_ENTRY = { kind: 'entry', entry: 'IC-17' }
const PALETTE_BAND = { kind: 'paletteBand' }
const THUMB = { kind: 'scrollbarThumb', axis: 'vertical' }
const STRIP = { kind: 'taskGroupGrabStrip', taskGroupId: 'group1' }
const press = (pressRow: string, pressedOn: Loose | null): Loose => ({ type: 'pointerPressed', pressRow, pressedOn })
const held = (kind: string, pressRow: string, pressedOn: Loose | null): Loose => ({ pointerPressState: { kind, pressRow, pressedOn } })

// see QN-1, QN-4, QN-5, NT-7, OP-16
const question = (row: string): Loose => ({ manner: 'NT-7', question: row, items: [{ name: 'Task A', isShownOnAnotherTaskGroup: false }] })
const OWED = { kind: 'changeDocument', writes: [[{ kind: 'CM-35' }]], created: null }
const INCOMING = { fileName: 'next.xml', byteCount: 120, documentName: null }
const CANDIDATES = [{ currentUid: 1, currentName: 'Task A', incomingUid: 7, incomingName: 'Task A' }]
const asked = (row: string, owedAction: unknown): Loose => ({ confirmationState: { kind: 'questionAsked', question: question(row), owedAction } })
const reading = (openRoute: string): Loose => ({ fileOperationState: { kind: 'readingDocumentFile', openRoute } })
const fileRead = (): Loose => ({ type: 'documentFileRead', question: question('QN-5'), incomingFile: INCOMING })
const landed = (dropped: readonly unknown[], missing: readonly unknown[], counts: readonly unknown[], openChoice = 'merge'): Loose => ({
  type: 'documentOpenLanded',
  droppedTaskNames: dropped,
  missingTaskNames: missing,
  reportedCounts: counts,
  openedFileName: null,
  openChoice,
})
const UNSAVED = { unsavedEditsState: { kind: 'editsUnsaved' } }
const SAVED = { unsavedEditsState: { kind: 'nothingUnsaved' } }
const MAPPING = { fileOperationState: { kind: 'awaitingMergeMapping', mergeCandidates: CANDIDATES, unreadColumns: ['Cost'] } }
const CHOOSING = { fileOperationState: { kind: 'awaitingOpenChoice', incomingFile: INCOMING } }
const REPORTED = { droppedTaskNames: ['Task B'], missingTaskNames: ['Task M'], reportedCounts: [{ reason: 'RS-14', count: 3 }] }

const SCREEN = 'screen'

// WHY: per guard, scenes on one or two cells naming it, with each comparison at its boundary;
// whether a scene is true or false is not written here -- the manuscript condition says it.
const GUARD_CASES: readonly GuardCase[] = [
  { region: SCREEN, guard: 'hasCalendarDraftRefusal', machine: 'calendarDraftStateMachine', state: 'drafted', scenes: [
    sc('a clean draft (0 refusals)', drafted(CLEAN_DRAFT), { type: 'calendarApplyEntryPressed' }),
    sc('no working weekday (1 refusal)', drafted(ONE_REFUSAL_DRAFT), { type: 'calendarApplyEntryPressed' }),
    sc('no working weekday and a reversed range (2 refusals)', drafted(TWO_REFUSALS_DRAFT), { type: 'calendarApplyEntryPressed' }),
  ] },
  { region: SCREEN, guard: 'hasChoice', machine: 'propertiesPanelContentStateMachine', state: 'selectionDisplayed', scenes: [
    sc('nothing chosen', SELECTION_SHOWN, { type: 'selectionMoved', subject: subject(NO_ITEMS, []) }),
    sc('one object', SELECTION_SHOWN, { type: 'selectionMoved', subject: subject(ONE_ITEM, []) }),
    sc('two objects', SELECTION_SHOWN, { type: 'selectionMoved', subject: subject(TWO_ITEMS, []) }),
    sc('one task group only', SELECTION_SHOWN, { type: 'selectionMoved', subject: subject(NO_ITEMS, ['group1']) }),
  ] },
  { region: SCREEN, guard: 'hasChoice', machine: 'propertiesPanelContentStateMachine', state: 'documentSettingsDisplayed', scenes: [
    sc('nothing chosen', SETTINGS_SHOWN, { type: 'selectionMoved', subject: subject(NO_ITEMS, []) }),
    sc('one object', SETTINGS_SHOWN, { type: 'selectionMoved', subject: subject(ONE_ITEM, []) }),
  ] },
  { region: SCREEN, guard: 'hasDaysToPlace', machine: 'dualCursorModeStateMachine', state: 'off', scenes: [
    sc('days to place', {}, { type: 'dualCursorEntryPressed', date: '2026-01-05', hasDaysToPlace: true }),
    sc('no days to place', {}, { type: 'dualCursorEntryPressed', date: '2026-01-05', hasDaysToPlace: false }),
  ] },
  { region: SCREEN, guard: 'hasDaysToPlace', machine: 'armModeStateMachine', state: 'armed', scenes: [
    sc('armed, days to place', arm({ kind: 'dependencyArmed' }), { type: 'dualCursorEntryPressed', date: '2026-01-05', hasDaysToPlace: true }),
    sc('armed, no days to place', arm({ kind: 'dependencyArmed' }), { type: 'dualCursorEntryPressed', date: '2026-01-05', hasDaysToPlace: false }),
  ] },
  ...(['hasSurfaceOrConfirmation', 'hasUnsettledEntry'] as const).map((guard) => ({
    region: SCREEN, guard, machine: 'propertiesPanelContentStateMachine', state: 'selectionDisplayed', scenes: [
      sc('neither', SELECTION_SHOWN, { type: 'settleKeyPressed', hasSurfaceOrConfirmation: false, hasUnsettledEntry: false }),
      sc('a surface or confirmation', SELECTION_SHOWN, { type: 'settleKeyPressed', hasSurfaceOrConfirmation: true, hasUnsettledEntry: false }),
      sc('an unsettled entry', SELECTION_SHOWN, { type: 'settleKeyPressed', hasSurfaceOrConfirmation: false, hasUnsettledEntry: true }),
    ] })),
  { region: SCREEN, guard: 'isAnotherSurface', machine: 'openSurfaceStateMachine', state: 'open', scenes: [
    sc('the same surface pressed', { openSurfaceState: open('U-30') }, { type: 'surfaceEntryPressed', surfaceName: 'U-30' }),
    sc('another surface pressed', { openSurfaceState: open('U-30') }, { type: 'surfaceEntryPressed', surfaceName: 'U-65' }),
    sc('another surface raised by a flow', { openSurfaceState: open('U-30') }, { type: 'surfaceRaisedByFlow', surfaceName: 'U-56' }),
    sc('the same surface raised by a flow', { openSurfaceState: open('U-56') }, { type: 'surfaceRaisedByFlow', surfaceName: 'U-56' }),
  ] },
  { region: SCREEN, guard: 'isFlowAwaitingAnswer', machine: 'openSurfaceStateMachine', state: 'open', scenes: [
    sc('U-56 awaits, another pressed', { openSurfaceState: open('U-56') }, { type: 'surfaceEntryPressed', surfaceName: 'U-30' }),
    sc('U-61 awaits, another pressed', { openSurfaceState: open('U-61') }, { type: 'surfaceEntryPressed', surfaceName: 'U-30' }),
    sc('U-30 open, another pressed', { openSurfaceState: open('U-30') }, { type: 'surfaceEntryPressed', surfaceName: 'U-65' }),
    sc('U-56 awaits, the watermark pressed', { openSurfaceState: open('U-56'), watermarkDisplayState: { kind: 'shown' } }, { type: 'watermarkEntryPressed' }),
    sc('U-30 open, the watermark pressed', { openSurfaceState: open('U-30'), watermarkDisplayState: { kind: 'shown' } }, { type: 'watermarkEntryPressed' }),
  ] },
  { region: SCREEN, guard: 'isFullScreen', machine: 'fullScreenModeStateMachine', state: 'normal', scenes: [
    sc('entered', {}, { type: 'fullScreenChanged', isFullScreen: true }),
    sc('not entered', {}, { type: 'fullScreenChanged', isFullScreen: false }),
  ] },
  { region: SCREEN, guard: 'isFullScreen', machine: 'fullScreenModeStateMachine', state: 'full', scenes: [
    sc('left', { fullScreenModeState: { kind: 'full' } }, { type: 'fullScreenChanged', isFullScreen: false }),
    sc('still full', { fullScreenModeState: { kind: 'full' } }, { type: 'fullScreenChanged', isFullScreen: true }),
  ] },
  { region: SCREEN, guard: 'isHelpTarget', machine: 'helpDisplayStateMachine', state: 'shown', scenes: [
    sc('the help is the target', { helpDisplayState: { kind: 'shown', child: { kind: 'normal' } } }, closeAsked('helpModal')),
    sc('the surface is the target', { helpDisplayState: { kind: 'shown', child: { kind: 'maximized' } } }, closeAsked('surface')),
  ] },
  ...(
    [
      ['baseTimeZoneDraftStateMachine', 'drafted', { baseTimeZoneDraftState: { kind: 'drafted', chosenRegion: 'UTC+09:00' } }],
      ['timeShiftDraftStateMachine', 'amountHeld', { timeShiftDraftState: { kind: 'amountHeld', shiftMinutes: 90 } }],
      ['wholeScheduleShiftDraftStateMachine', 'dateHeld', { wholeScheduleShiftDraftState: { kind: 'dateHeld', newStartDate: '2029-03-05' } }],
    ] as const
  ).map(([machine, state, draft]) => ({
    region: SCREEN, guard: 'isLeavingDocumentSettings', machine, state, scenes: [
      sc('the settings close on Esc', { ...draft, ...SETTINGS_SHOWN }, esc('propertiesPanel')),
      sc('Esc goes to the tooltip; the settings stay', { ...draft, ...SETTINGS_SHOWN }, esc('tooltip')),
      sc('the panel shows a selection, not the settings', { ...draft, ...SELECTION_SHOWN }, esc('propertiesPanel')),
      sc('the panel close asked', { ...draft, ...SETTINGS_SHOWN }, closeAsked('panel')),
    ] })),
  { region: SCREEN, guard: 'isLeavingHolidaySettings', machine: 'calendarDraftStateMachine', state: 'drafted', scenes: [
    sc('U-65 closed on Esc', { ...drafted(CLEAN_DRAFT), openSurfaceState: open('U-65') }, esc('surface')),
    sc('Esc goes elsewhere', { ...drafted(CLEAN_DRAFT), openSurfaceState: open('U-65') }, esc('tooltip')),
    sc('U-65 replaced by U-30', { ...drafted(CLEAN_DRAFT), openSurfaceState: open('U-65') }, { type: 'surfaceEntryPressed', surfaceName: 'U-30' }),
    sc('U-65 pressed on itself', { ...drafted(CLEAN_DRAFT), openSurfaceState: open('U-65') }, { type: 'surfaceEntryPressed', surfaceName: 'U-65' }),
  ] },
  { region: SCREEN, guard: 'isNewStartDateEmpty', machine: 'wholeScheduleShiftDraftStateMachine', state: 'dateHeld', scenes: [
    sc("emptied ('')", { wholeScheduleShiftDraftState: { kind: 'dateHeld', newStartDate: '2029-03-05' } }, { type: 'wholeScheduleShiftDateSettled', newStartDate: '' }),
    sc('another date', { wholeScheduleShiftDraftState: { kind: 'dateHeld', newStartDate: '2029-03-05' } }, { type: 'wholeScheduleShiftDateSettled', newStartDate: '2029-04-02' }),
  ] },
  { region: SCREEN, guard: 'isNewStartDateEmpty', machine: 'wholeScheduleShiftDraftStateMachine', state: 'empty', scenes: [
    sc("'' on empty", {}, { type: 'wholeScheduleShiftDateSettled', newStartDate: '' }),
    sc('a date on empty', {}, { type: 'wholeScheduleShiftDateSettled', newStartDate: '2029-03-05' }),
  ] },
  { region: SCREEN, guard: 'isOpenAccepted', machine: 'dropCueDisplayStateMachine', state: 'hidden', scenes: [
    sc('a file that opens', {}, { type: 'fileDragEntered', isOpenAccepted: true }),
    sc('a file that does not open', {}, { type: 'fileDragEntered', isOpenAccepted: false }),
  ] },
  { region: SCREEN, guard: 'isOtherThanShownBase', machine: 'baseTimeZoneDraftStateMachine', state: 'drafted', scenes: [
    sc('another zone', { baseTimeZoneDraftState: { kind: 'drafted', chosenRegion: 'UTC+09:00' } }, { type: 'baseTimeZoneChosen', chosenRegion: 'UTC+01:00', isOtherThanShownBase: true }),
    sc('the shown base again', { baseTimeZoneDraftState: { kind: 'drafted', chosenRegion: 'UTC+09:00' } }, { type: 'baseTimeZoneChosen', chosenRegion: 'UTC+00:00', isOtherThanShownBase: false }),
  ] },
  { region: SCREEN, guard: 'isPanelTarget', machine: 'propertiesPanelContentStateMachine', state: 'selectionDisplayed', scenes: [
    sc('the panel is the target', SELECTION_SHOWN, closeAsked('panel')),
    sc('the help is the target', SELECTION_SHOWN, closeAsked('helpModal')),
  ] },
  { region: SCREEN, guard: 'isProceeding', machine: 'openSurfaceStateMachine', state: 'open', scenes: [
    sc('U-60 answered: proceed', { openSurfaceState: open('U-60') }, { type: 'watermarkUnlockAnswered', isProceeding: true }),
    sc('U-60 answered: cancel', { openSurfaceState: open('U-60') }, { type: 'watermarkUnlockAnswered', isProceeding: false }),
  ] },
  ...(
    [
      ['isRungArmed', 'armModeStateMachine', 'armed', arm({ kind: 'dependencyArmed' }), 'armed'],
      ['isRungDualCursor', 'dualCursorModeStateMachine', 'on', { dualCursorModeState: { kind: 'on', child: { kind: 'placingCursorB' } } }, 'dualCursorMode'],
      ['isRungHelp', 'helpDisplayStateMachine', 'shown.normal', { helpDisplayState: { kind: 'shown', child: { kind: 'normal' } } }, 'helpModal'],
      ['isRungPropertiesPanel', 'propertiesPanelContentStateMachine', 'selectionDisplayed', SELECTION_SHOWN, 'propertiesPanel'],
      ['isRungSearchPanel', 'searchPanelDisplayStateMachine', 'shown.maximized', { searchPanelDisplayState: { kind: 'shown', child: { kind: 'maximized' } } }, 'searchPanel'],
      ['isRungSurface', 'openSurfaceStateMachine', 'open', { openSurfaceState: open('U-30') }, 'surface'],
      ['isRungTooltip', 'tooltipDisplayStateMachine', 'allowed', {}, 'tooltip'],
    ] as const
  ).map(([guard, machine, state, values, rung]) => ({
    region: SCREEN, guard, machine, state, scenes: [
      sc(`rung ${rung}`, values, esc(rung)),
      sc('rung selection', values, esc('selection')),
    ] })),
  { region: SCREEN, guard: 'isSameArm', machine: 'armModeStateMachine', state: 'armed', scenes: [
    sc('the same shape SH-1', arm({ kind: 'taskShapeArmed', shapeKind: 'SH-1' }), armEvent('taskShapeArmed', 'SH-1', null)),
    sc('another shape SH-2', arm({ kind: 'taskShapeArmed', shapeKind: 'SH-1' }), armEvent('taskShapeArmed', 'SH-2', null)),
    sc('the same glyph', arm({ kind: 'milestoneShapeArmed', glyph: 'SH-5' }), armEvent('milestoneShapeArmed', null, 'SH-5')),
    sc('another glyph', arm({ kind: 'milestoneShapeArmed', glyph: 'SH-5' }), armEvent('milestoneShapeArmed', null, 'SH-5b')),
    sc('the same dependency arm', arm({ kind: 'dependencyArmed' }), armEvent('dependencyArmed', null, null)),
    sc('another arm', arm({ kind: 'dependencyArmed' }), armEvent('commentBoxArmed', null, null)),
  ] },
  { region: SCREEN, guard: 'isShiftZero', machine: 'timeShiftDraftStateMachine', state: 'amountHeld', scenes: [
    sc('0 minutes', { timeShiftDraftState: { kind: 'amountHeld', shiftMinutes: 90 } }, { type: 'timeShiftAmountSettled', shiftMinutes: 0 }),
    sc('1 minute', { timeShiftDraftState: { kind: 'amountHeld', shiftMinutes: 90 } }, { type: 'timeShiftAmountSettled', shiftMinutes: 1 }),
    sc('-1 minute', { timeShiftDraftState: { kind: 'amountHeld', shiftMinutes: 90 } }, { type: 'timeShiftAmountSettled', shiftMinutes: -1 }),
  ] },
  { region: SCREEN, guard: 'isShiftZero', machine: 'timeShiftDraftStateMachine', state: 'empty', scenes: [
    sc('0 minutes on empty', {}, { type: 'timeShiftAmountSettled', shiftMinutes: 0 }),
    sc('1 minute on empty', {}, { type: 'timeShiftAmountSettled', shiftMinutes: 1 }),
  ] },
  { region: SCREEN, guard: 'isSurfaceTarget', machine: 'openSurfaceStateMachine', state: 'open', scenes: [
    sc('the surface is the target', { openSurfaceState: open('U-30') }, closeAsked('surface')),
    sc('the panel is the target', { openSurfaceState: open('U-30') }, closeAsked('panel')),
  ] },
  { region: SCREEN, guard: 'isWatermarkUnlockSurface', machine: 'openSurfaceStateMachine', state: 'open', scenes: [
    sc('U-60 open, a mismatch', { openSurfaceState: open('U-60') }, { type: 'watermarkUnlockMismatched' }),
    sc('U-30 open, a mismatch', { openSurfaceState: open('U-30') }, { type: 'watermarkUnlockMismatched' }),
  ] },
  { region: SCREEN, guard: 'isWatermarkUnlockSurface', machine: 'watermarkDisplayStateMachine', state: 'shown', scenes: [
    sc('U-60 open, matched', { openSurfaceState: open('U-60') }, { type: 'watermarkUnlockMatched' }),
    sc('U-30 open, matched', { openSurfaceState: open('U-30') }, { type: 'watermarkUnlockMatched' }),
  ] },

  { region: 'notices', guard: 'hasSilentWatcher', machine: 'changeDeliveryStateMachine', state: 'delivering', scenes: [
    sc('0 silent watchers', { changeDeliveryState: { kind: 'delivering' } }, { type: 'changeDelivered', silentWatchers: 0 }),
    sc('1 silent watcher', { changeDeliveryState: { kind: 'delivering' } }, { type: 'changeDelivered', silentWatchers: 1 }),
    sc('2 silent watchers', { changeDeliveryState: { kind: 'delivering' } }, { type: 'changeDelivered', silentWatchers: 2 }),
  ] },
  { region: 'notices', guard: 'isHiddenReason', machine: 'noticeDisplayStateMachine', state: 'hidden', scenes: [
    sc('RS-27 (hide)', {}, { type: 'noticeRaised', reason: 'RS-27', affectedCount: null }),
    sc('RS-41 (show)', {}, { type: 'noticeRaised', reason: 'RS-41', affectedCount: 2 }),
  ] },
  { region: 'notices', guard: 'isHiddenReason', machine: 'noticeDisplayStateMachine', state: 'shown', scenes: [
    sc('RS-27 (hide) over one card', shown(OLDEST), { type: 'noticeRaised', reason: 'RS-27', affectedCount: null }, (b, a) => expect(standingLength(a)).toBe(standingLength(b))),
    sc('RS-2 (show) over one card', shown(OLDEST), { type: 'noticeRaised', reason: 'RS-2', affectedCount: null }),
  ] },
  ...(['isLeavingNone', 'isLeavingSome'] as const).map((guard) => ({
    region: 'notices', guard, machine: 'noticeDisplayStateMachine', state: 'shown', scenes: [
      sc('the only card dismissed (1 standing)', shown(OLDEST), { type: 'noticeDismissPressed', reason: 'RS-41' }),
      sc('one of 2 dismissed', shown(OLDEST, NEWEST), { type: 'noticeDismissPressed', reason: 'RS-41' }),
      sc('a reason not standing', shown(OLDEST), { type: 'noticeDismissPressed', reason: 'RS-2' }),
    ] })),
  { region: 'notices', guard: 'isOnlyOneStanding', machine: 'noticeDisplayStateMachine', state: 'shown', scenes: [
    sc('1 standing', shown(OLDEST), { type: 'newestNoticeDismissAsked' }),
    sc('2 standing', shown(OLDEST, NEWEST), { type: 'newestNoticeDismissAsked' }, (b, a) => expect(standingLength(a)).toBe(standingLength(b) - 1)),
    sc('1 timed card, elapsed', shown(TIMED), { type: 'noticeTimeElapsed', reason: 'RS-65' }),
    sc('2 standing, the timed card elapsed', shown(OLDEST, TIMED), { type: 'noticeTimeElapsed', reason: 'RS-65' }),
  ] },
  { region: 'notices', guard: 'isSameReasonStanding', machine: 'noticeDisplayStateMachine', state: 'shown', scenes: [
    sc('the same reason again', shown(OLDEST), { type: 'noticeRaised', reason: 'RS-41', affectedCount: 2 }, bundledOrAppended),
    sc('RS-7 borrows the words of the standing RS-6', shown(WORDS_OWNER), { type: 'noticeRaised', reason: 'RS-7', affectedCount: null }, bundledOrAppended),
    sc('another reason', shown(OLDEST), { type: 'noticeRaised', reason: 'RS-2', affectedCount: null }, bundledOrAppended),
  ] },
  { region: 'notices', guard: 'isTimedCard', machine: 'noticeDisplayStateMachine', state: 'shown', scenes: [
    sc('the timed RS-65 elapsed', shown(TIMED), { type: 'noticeTimeElapsed', reason: 'RS-65' }),
    sc('RS-41 (show) elapsed', shown(OLDEST), { type: 'noticeTimeElapsed', reason: 'RS-41' }),
    sc('RS-65 elapsed but not standing', shown(OLDEST), { type: 'noticeTimeElapsed', reason: 'RS-65' }),
  ] },

  { region: 'gesture', guard: 'isDocumentChangingPress', machine: 'pointerPressStateMachine', state: 'notPressed', scenes: [
    sc('PTD-7 on a shape', {}, press('PTD-7', GRAB_SHAPE)),
    sc('PTD-3 on a shape', {}, press('PTD-3', GRAB_SHAPE)),
    sc('PTD-1, nothing hit', {}, press('PTD-1', null)),
    sc('PTD-3 on a scrollbar thumb', {}, press('PTD-3', THUMB)),
    sc('PTD-3 on a repeating entry', {}, press('PTD-3', REPEATING)),
  ] },
  { region: 'gesture', guard: 'isHeldOnRepeatingEntry', machine: 'pointerPressStateMachine', state: 'viewingDocument', scenes: [
    sc('held on IC-12', held('viewingDocument', 'PTD-3', REPEATING), { type: 'entryRepeatTimeElapsed' }),
    sc('held on IC-15', held('viewingDocument', 'PTD-3', LAST_REPEATING), { type: 'entryRepeatTimeElapsed' }),
    sc('held on IC-17', held('viewingDocument', 'PTD-3', PLAIN_ENTRY), { type: 'entryRepeatTimeElapsed' }),
  ] },
  { region: 'gesture', guard: 'isOnPaletteBand', machine: 'pointerPressStateMachine', state: 'changingDocument', scenes: [
    sc('on the palette band', held('changingDocument', 'PTD-3', PALETTE_BAND), { type: 'pressInterrupted' }),
    sc('on a shape', held('changingDocument', 'PTD-7', GRAB_SHAPE), { type: 'pressInterrupted' }),
  ] },
  { region: 'gesture', guard: 'isOnRepeatingEntry', machine: 'pointerPressStateMachine', state: 'notPressed', scenes: [
    sc('PTD-3 on IC-15', {}, press('PTD-3', LAST_REPEATING)),
    sc('PTD-3 on a scrollbar thumb', {}, press('PTD-3', THUMB)),
  ] },
  { region: 'gesture', guard: 'isTaskGroupGrabStrip', machine: 'taskGroupGrabStateMachine', state: 'notGrabbed', scenes: [
    sc('on a grab strip', {}, press('PTD-3', STRIP)),
    sc('on a shape', {}, press('PTD-7', GRAB_SHAPE)),
  ] },

  { region: 'fileFlow', guard: 'hasAnythingToReport', machine: null, state: null, scenes: [
    sc('nothing to report (0, 0, 0)', {}, landed([], [], [])),
    sc('1 dropped name', {}, landed(['Task C'], [], [])),
    sc('2 missing names', {}, landed([], ['Task M', 'Task N'], [])),
    sc('1 reported count', {}, landed([], [], [{ reason: 'RS-51', count: 2 }])),
  ] },
  { region: 'fileFlow', guard: 'isBackToSavedDocument', machine: 'unsavedEditsStateMachine', state: 'editsUnsaved', scenes: [
    sc('back to the saved document', UNSAVED, { type: 'documentEditLanded', isBackToSavedDocument: true }),
    sc('another edit', UNSAVED, { type: 'documentEditLanded', isBackToSavedDocument: false }),
  ] },
  ...(['isBaselineRoute', 'isReopenRoute'] as const).map((guard) => ({
    region: 'fileFlow', guard, machine: 'fileOperationStateMachine', state: 'readingDocumentFile', scenes: [
      sc('baseline route', { ...reading('baseline'), ...UNSAVED }, fileRead()),
      sc('reopen route, edits unsaved', { ...reading('reopen'), ...UNSAVED }, fileRead()),
      sc('reopen route, nothing unsaved', { ...reading('reopen'), ...SAVED }, fileRead()),
      sc('chooser route', { ...reading('chooser'), ...UNSAVED }, fileRead()),
    ] })),
  { region: 'fileFlow', guard: 'isReopenRoute', machine: 'confirmationStateMachine', state: 'notAsked', scenes: [
    sc('reopen route, edits unsaved', { ...reading('reopen'), ...UNSAVED }, fileRead()),
    sc('drop route, edits unsaved', { ...reading('drop'), ...UNSAVED }, fileRead()),
  ] },
  { region: 'fileFlow', guard: 'isDifferenceReviewSurface', machine: 'fileOperationStateMachine', state: 'awaitingMergeMapping', scenes: [
    sc('U-61 closed', MAPPING, { type: 'flowSurfaceClosed', surfaceName: 'U-61' }),
    sc('U-56 closed', MAPPING, { type: 'flowSurfaceClosed', surfaceName: 'U-56' }),
  ] },
  { region: 'fileFlow', guard: 'isFileOperationQuestion', machine: 'confirmationStateMachine', state: 'questionAsked', scenes: [
    sc('QN-4, nothing owed, proceed', asked('QN-4', null), { type: 'confirmationAnswered', isProceeding: true }),
    sc('QN-1, a change owed, proceed', asked('QN-1', OWED), { type: 'confirmationAnswered', isProceeding: true }),
  ] },
  { region: 'fileFlow', guard: 'isImportCanceled', machine: 'fileOperationStateMachine', state: 'awaitingMergeMapping', scenes: [
    sc('cancel the import', MAPPING, { type: 'mergeMappingAnswered', mergeMapping: { kind: 'cancelImport' } }),
    sc('all the same', MAPPING, { type: 'mergeMappingAnswered', mergeMapping: { kind: 'allSame' } }),
  ] },
  { region: 'fileFlow', guard: 'isImportReportSurface', machine: null, state: null, scenes: [
    ...['U-62', 'U-56'].map((surfaceName) =>
      sc(`${surfaceName} closed`, REPORTED, { type: 'flowSurfaceClosed', surfaceName }, (b, a, truth) => {
        for (const key of ['droppedTaskNames', 'missingTaskNames', 'reportedCounts']) {
          expect(a[key], `${key}: emptied only when the report closes (T-290 note)`).toEqual(truth ? [] : b[key])
        }
      })),
  ] },
  { region: 'fileFlow', guard: 'isOpenChooserSurface', machine: 'fileOperationStateMachine', state: 'awaitingOpenChoice', scenes: [
    sc('U-56 closed', CHOOSING, { type: 'flowSurfaceClosed', surfaceName: 'U-56' }),
    sc('U-62 closed', CHOOSING, { type: 'flowSurfaceClosed', surfaceName: 'U-62' }),
  ] },
  { region: 'fileFlow', guard: 'isOverwriteQuestion', machine: 'fileOperationStateMachine', state: 'writingDocumentFile', scenes: [
    sc('QN-4 answered', { fileOperationState: { kind: 'writingDocumentFile', fixBundle: null }, ...asked('QN-4', null) }, { type: 'confirmationAnswered', isProceeding: true }),
    sc('QN-5 answered', { fileOperationState: { kind: 'writingDocumentFile', fixBundle: null }, ...asked('QN-5', null) }, { type: 'confirmationAnswered', isProceeding: true }),
  ] },
  { region: 'fileFlow', guard: 'isProceeding', machine: 'fileOperationStateMachine', state: 'awaitingDiscardAnswer', scenes: [
    sc('proceed', { fileOperationState: { kind: 'awaitingDiscardAnswer' }, ...asked('QN-5', null) }, { type: 'confirmationAnswered', isProceeding: true }),
    sc('cancel', { fileOperationState: { kind: 'awaitingDiscardAnswer' }, ...asked('QN-5', null) }, { type: 'confirmationAnswered', isProceeding: false }),
  ] },
  { region: 'fileFlow', guard: 'isReplaceChoice', machine: 'fileOperationStateMachine', state: 'awaitingOpenChoice', scenes: [
    sc('replace, edits unsaved', { ...CHOOSING, ...UNSAVED }, { type: 'openChoiceAnswered', openChoice: 'replace', question: question('QN-5') }),
    sc('merge, edits unsaved', { ...CHOOSING, ...UNSAVED }, { type: 'openChoiceAnswered', openChoice: 'merge', question: question('QN-5') }),
  ] },
  { region: 'fileFlow', guard: 'isReplaceChoice', machine: 'unsavedEditsStateMachine', state: 'editsUnsaved', scenes: [
    sc('a replace landed', UNSAVED, landed([], [], [], 'replace')),
    sc('a merge landed', UNSAVED, landed([], [], [], 'merge')),
  ] },

  { region: 'fieldEntry', guard: 'isCreatedTask', machine: 'createdTaskNamingStateMachine', state: 'idle', scenes: [
    sc('a task created', {}, { type: 'creationLanded', created: { kind: 'task', uid: 7 } }),
    sc('a task group created', {}, { type: 'creationLanded', created: { kind: 'taskGroup', taskGroupId: 'group1' } }),
  ] },
  { region: 'fieldEntry', guard: 'isCreatedTask', machine: null, state: null, scenes: [
    sc('a task created', {}, { type: 'creationLanded', created: { kind: 'task', uid: 7 } }),
    sc('a task group created', {}, { type: 'creationLanded', created: { kind: 'taskGroup', taskGroupId: 'group1' } }),
  ] },
  { region: 'fieldEntry', guard: 'isEditedField', machine: 'fieldEditStateMachine', state: 'editingField', scenes: [
    sc('the edited field ended', { fieldEditState: { kind: 'editingField', fieldRow: 'PR-1' } }, { type: 'fieldEditEnded', fieldRow: 'PR-1' }),
    sc('another field ended', { fieldEditState: { kind: 'editingField', fieldRow: 'PR-1' } }, { type: 'fieldEditEnded', fieldRow: 'AT-53' }),
    sc('focus asked on the edited field', { fieldEditState: { kind: 'editingField', fieldRow: 'AT-53' } }, { type: 'fieldFocusAsked', fieldRow: 'AT-53' }),
    sc('focus asked on another field', { fieldEditState: { kind: 'editingField', fieldRow: 'AT-53' } }, { type: 'fieldFocusAsked', fieldRow: 'PR-1' }),
  ] },
  { region: 'fieldEntry', guard: 'isNameField', machine: 'createdTaskNamingStateMachine', state: 'namingCreatedTask', scenes: [
    sc('PR-1 ended', { createdTaskNamingState: { kind: 'namingCreatedTask', createdTaskUid: 7 } }, { type: 'fieldEditEnded', fieldRow: 'PR-1' }),
    sc('AT-53 ended', { createdTaskNamingState: { kind: 'namingCreatedTask', createdTaskUid: 7 } }, { type: 'fieldEditEnded', fieldRow: 'AT-53' }),
  ] },

  { region: 'selection', guard: 'hasPickedObjects', machine: 'selectionStateMachine', state: 'objectsSelected', scenes: [
    sc('0 picked', { selectionState: { kind: 'objectsSelected', selectedObjects: ONE_ITEM } }, { type: 'objectsPicked', pickedObjects: NO_ITEMS }),
    sc('1 picked', { selectionState: { kind: 'objectsSelected', selectedObjects: TWO_ITEMS } }, { type: 'objectsPicked', pickedObjects: ONE_ITEM }),
    sc('2 picked', { selectionState: { kind: 'objectsSelected', selectedObjects: ONE_ITEM } }, { type: 'objectsPicked', pickedObjects: TWO_ITEMS }),
  ] },
  { region: 'selection', guard: 'hasPickedObjects', machine: 'selectionStateMachine', state: 'nothingSelected', scenes: [
    sc('0 picked on nothing', {}, { type: 'objectsPicked', pickedObjects: NO_ITEMS }),
    sc('1 picked on nothing', {}, { type: 'objectsPicked', pickedObjects: ONE_ITEM }),
  ] },
  { region: 'selection', guard: 'hasRemainingObjects', machine: 'selectionStateMachine', state: 'objectsSelected', scenes: [
    sc('0 remain', { selectionState: { kind: 'objectsSelected', selectedObjects: TWO_ITEMS } }, { type: 'selectionPruned', remainingObjects: NO_ITEMS, chosenTaskGroups: [] }),
    sc('1 remains', { selectionState: { kind: 'objectsSelected', selectedObjects: TWO_ITEMS } }, { type: 'selectionPruned', remainingObjects: ONE_ITEM, chosenTaskGroups: [] }),
  ] },
  { region: 'selection', guard: 'isRungSelection', machine: 'selectionStateMachine', state: 'objectsSelected', scenes: [
    sc('rung selection', { selectionState: { kind: 'objectsSelected', selectedObjects: ONE_ITEM } }, { type: 'selectionEscapePressed', rung: 'selection' }),
    sc('rung tooltip', { selectionState: { kind: 'objectsSelected', selectedObjects: ONE_ITEM } }, { type: 'selectionEscapePressed', rung: 'tooltip' }),
  ] },
  { region: 'selection', guard: 'isRungSelection', machine: null, state: null, scenes: [
    ...['selection', 'tooltip'].map((rung) =>
      sc(`rung ${rung}`, { chosenTaskGroups: ['group1'] }, { type: 'selectionEscapePressed', rung }, (b, a, truth) => {
        expect(a['chosenTaskGroups'], 'the chosen task groups are emptied only on the selection rung (T-293 note)').toEqual(truth ? [] : b['chosenTaskGroups'])
      })),
  ] },

  { region: 'agentApi', guard: 'isRememberedEnabled', machine: 'agentApiEnablingStateMachine', state: 'disabled', scenes: [
    sc('remembered enabled', {}, { type: 'rememberedEnablingLoaded', isRememberedEnabled: true }),
    sc('remembered disabled', {}, { type: 'rememberedEnablingLoaded', isRememberedEnabled: false }),
  ] },
]

function caseName(c: GuardCase): string {
  return `${c.region}/${c.guard} on ${c.machine === null ? 'the root' : `${c.machine}.${String(c.state)}`}`
}

describe('SD-3 (T-250): "コードの判定もその式から生成する" -- every guard, true and false, through advanceScreenSession', () => {
  it('every guard of every guarded region has scenes in this file', () => {
    const covered = new Set(GUARD_CASES.map((c) => `${c.region}/${c.guard}`))
    const all = GUARDED.flatMap((r) => (r.guards ?? []).map((g) => `${r.region}/${g.name}`))
    expect(all.filter((g) => !covered.has(g))).toEqual([])
  })

  it.each(GUARDED.flatMap((r) => (r.guards ?? []).map((g) => [`${r.region}/${g.name}`, r.region, g.name] as const)))(
    '%s: the manuscript condition is true in one scene and false in another',
    (_, region, guard) => {
      const truths = GUARD_CASES.filter((c) => c.region === region && c.guard === guard).flatMap((c) => c.scenes.map((s) => run(c, s).truth))
      expect(new Set(truths)).toEqual(new Set([true, false]))
    },
  )

  it.each(GUARD_CASES.flatMap((c) => c.scenes.map((s) => [`${caseName(c)} x ${String(s.event['type'])}: ${s.label}`, c, s] as const)))(
    '%s',
    (_, c, scene) => {
      expectSceneMatchesTable(c, scene)
    },
  )
})


const NULL_CASES: readonly (readonly [string, boolean, GuardCase])[] = [
  [
    'いまの状態がその値を運ばなければ `null`',
    false,
    { region: SCREEN, guard: 'isLeavingHolidaySettings', machine: 'calendarDraftStateMachine', state: 'drafted', scenes: [
      sc('no surface open: openSurfaceStateMachine.surfaceName is null', drafted(CLEAN_DRAFT), esc('surface')),
    ] },
  ],
  [
    'いまの状態がその値を運ばなければ `null`',
    false,
    { region: 'fileFlow', guard: 'isReopenRoute', machine: 'confirmationStateMachine', state: 'notAsked', scenes: [
      sc('fileOperationStateMachine idle: openRoute is null', UNSAVED, fileRead()),
    ] },
  ],
  [
    'その後の状態がその値を運ばなければ `null`',
    true,
    { region: SCREEN, guard: 'isLeavingHolidaySettings', machine: 'calendarDraftStateMachine', state: 'drafted', scenes: [
      sc('U-65 closes: after(openSurfaceStateMachine.surfaceName) is null', { ...drafted(CLEAN_DRAFT), openSurfaceState: open('U-65') }, closeAsked('surface')),
    ] },
  ],
  [
    '`null` の欄は `null` である',
    false,
    { region: 'fileFlow', guard: 'isOverwriteQuestion', machine: 'fileOperationStateMachine', state: 'writingDocumentFile', scenes: [
      sc('no question asked: confirmationStateMachine.question.question is null', { fileOperationState: { kind: 'writingDocumentFile', fixBundle: null } }, { type: 'confirmationAnswered', isProceeding: true }),
    ] },
  ],
  [
    '`null` の欄は `null` である',
    false,
    { region: 'gesture', guard: 'isOnPaletteBand', machine: 'pointerPressStateMachine', state: 'changingDocument', scenes: [
      sc('PTD-4 held on nothing: pressedOn.kind is null', held('changingDocument', 'PTD-4', null), { type: 'pressInterrupted' }),
    ] },
  ],
  [
    '`null` の欄は `null` である',
    false,
    { region: 'gesture', guard: 'isHeldOnRepeatingEntry', machine: 'pointerPressStateMachine', state: 'viewingDocument', scenes: [
      sc('PTD-1 held on nothing: pressedOn.kind is null', held('viewingDocument', 'PTD-1', null), { type: 'entryRepeatTimeElapsed' }),
    ] },
  ],
  [
    '`null` の欄は `null` である',
    false,
    { region: 'gesture', guard: 'isTaskGroupGrabStrip', machine: 'taskGroupGrabStateMachine', state: 'notGrabbed', scenes: [
      sc('PTD-1 pressed on nothing: event.pressedOn.kind is null', {}, press('PTD-1', null)),
    ] },
  ],
  [
    '表に無い理由なら `null`',
    false,
    { region: 'notices', guard: 'isHiddenReason', machine: 'noticeDisplayStateMachine', state: 'hidden', scenes: [
      sc('a reason that is no row of T-233: noticeDisplay is null, not hide', {}, { type: 'noticeRaised', reason: 'not-a-reason', affectedCount: null }),
    ] },
  ],
  [
    '表に無い理由なら `null`',
    false,
    { region: 'notices', guard: 'isTimedCard', machine: 'noticeDisplayStateMachine', state: 'shown', scenes: [
      sc('a reason that is no row of T-233: noticeDisplay is null, not autoDismiss', shown({ reason: 'not-a-reason', affectedCount: null }), { type: 'noticeTimeElapsed', reason: 'not-a-reason' }),
    ] },
  ],
]

describe('guardLanguage null rules, observed through advanceScreenSession: the condition reads as the rule says and the table picks accordingly', () => {
  it.each([...new Set(NULL_CASES.map(([rule]) => rule))])('the manuscript states the rule: %s', (rule) => {
    expect(GUARD_LANGUAGE).toContain(JSON.stringify(rule).slice(1, -1))
  })

  it.each(NULL_CASES.flatMap(([rule, truth, c]) => c.scenes.map((s) => [`${rule} -- ${caseName(c)}: ${s.label}`, truth, c, s] as const)))(
    '%s',
    (_, truth, c, scene) => {
      expect(run(c, scene).truth, `${c.guard} reads ${String(truth)}`).toBe(truth)
      expectSceneMatchesTable(c, scene)
    },
  )
})

describe('guardLanguage rules no cell can reach through a step, read by the test-side evaluator', () => {
  const scope = (event: Loose): GuardScope => ({ region: 'notices', values: { noticeDisplayState: { kind: 'hidden' }, changeDeliveryState: { kind: 'idle' } }, event })

  it('"数の大小。どちらかが `null` なら偽": null > 0, 0 < null and null >= null are all false', () => {
    for (const condition of ['event.n > 0', '0 < event.n', 'event.n >= event.n', 'event.n <= 0']) {
      expect(evaluateCondition(condition, scope({ n: null })), condition).toBe(false)
    }
  })

  it('"x が `null` なら `null`": noticeDisplayStateMachine.standing.length is null while hidden', () => {
    expect(evaluateCondition('noticeDisplayStateMachine.standing.length == null', scope({}))).toBe(true)
    expect(evaluateCondition('noticeDisplayStateMachine.standing.length == 1', scope({}))).toBe(false)
  })

  it('"`null` を受けると空": reasonsOf, wordsRowsOf and calendarDraftRefusals of null are empty lists', () => {
    expect(evaluateCondition("reasonsOf(noticeDisplayStateMachine.standing) == []", scope({}))).toBe(true)
    expect(evaluateCondition("wordsRowsOf(noticeDisplayStateMachine.standing).length == 0", scope({}))).toBe(true)
    expect(evaluateCondition('calendarDraftRefusals(null).length == 0', scope({}))).toBe(true)
  })

  it('binding strength "! > comparison and in > && > ||" (the ( x ) row)', () => {
    expect(evaluateCondition('true || false && false', scope({}))).toBe(true)
    expect(evaluateCondition('!(1 < 2) || 1 < 2 && 2 in [1, 2]', scope({}))).toBe(true)
    expect(() => evaluateCondition('!1 < 2', scope({})), '! binds before <, so it meets a number').toThrow()
  })

  it('an unknown function or a term that does not resolve throws instead of reading false', () => {
    expect(() => evaluateCondition('unknownFunction(1) == 1', scope({}))).toThrow(/not in guardLanguage/)
    expect(() => evaluateCondition('event.missing == 1', scope({}))).toThrow(/no field/)
    expect(() => evaluateCondition('noSuchMachine.carry == 1', scope({}))).toThrow(/no term/)
    expect(() => evaluateCondition('noticeDisplayStateMachine.noSuchCarry == 1', scope({}))).toThrow(/carries/)
    expect(() => guardRegion('noSuchRegion')).toThrow()
  })
})
