// Contract test: table T-250 SD-3 -- the selection manuscript (T-293) against advanceScreenSession.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NO_EFFECTS } from '../../src/use-case/advance-screen-session/session-step'

type Loose = Record<string, unknown>
type RawGuard = { readonly name?: string; readonly not?: boolean; readonly in?: string }
type RawBranch = { readonly to?: string; readonly guard?: readonly RawGuard[]; readonly effect?: string }
type RawCell = RawBranch | readonly RawBranch[]
type RawState = { readonly key: string; readonly initial: boolean }
type RawMachine = {
  readonly name: string
  readonly states: readonly RawState[]
  readonly transitions: Readonly<Record<string, Readonly<Record<string, RawCell>>>>
}
type RawEvent = { readonly key: string; readonly carries: readonly { readonly name: string }[] }
type RawRegion = {
  readonly region: string
  readonly events: readonly RawEvent[]
  readonly machines: readonly RawMachine[]
  readonly root: { readonly carries: readonly { readonly name: string }[]; readonly transitions: Readonly<Record<string, RawCell>> }
}

const REGIONS = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8')) as {
    readonly regions: readonly RawRegion[]
  }
).regions

function regionNamed(name: string): RawRegion {
  const region = REGIONS.find((r) => r.region === name)
  if (region === undefined) throw new Error(`state-machines.json has no region "${name}"`)
  return region
}

const SELECTION = regionNamed('selection')
const OTHER_REGIONS = REGIONS.map((r) => r.region).filter((name) => name !== SELECTION.region)
const SELECTION_MACHINE = SELECTION.machines[0] as RawMachine

// see T-293
function fieldOf(machineName: string): string {
  return machineName.replace(/Machine$/, '')
}

function branchesOf(cell: RawCell | undefined): readonly RawBranch[] {
  if (cell === undefined) return []
  return Array.isArray(cell) ? (cell as readonly RawBranch[]) : [cell as RawBranch]
}

function regionsOf(session: ScreenSession): Loose {
  return session as unknown as Loose
}

function selectionOf(session: ScreenSession): Loose {
  return regionsOf(session)['selection'] as Loose
}

function screenOf(session: ScreenSession): Loose {
  return regionsOf(session)['screen'] as Loose
}

function kindOf(value: unknown): string {
  return String((value as Loose)['kind'])
}

function step(session: ScreenSession, event: Loose): ReturnType<typeof advanceScreenSession> {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

function withSelection(fields: Loose, screen: Loose = {}): ScreenSession {
  const base = regionsOf(emptyScreenSession)
  return {
    ...base,
    screen: { ...(base['screen'] as Loose), ...screen },
    selection: { ...selectionOf(emptyScreenSession), ...fields },
  } as unknown as ScreenSession
}

// see SL-7b, T-023c
const PICKED = { items: [{ kind: 'task', uid: 3 }, { kind: 'commentBox', id: 'box1' }], ordered: true }
const OTHER_PICK = { items: [{ kind: 'dependency', successorUid: 4, ordinal: 1 }], ordered: false }
const NOTHING = { items: [], ordered: false }

const SELECTION_VALUES: Readonly<Record<string, readonly Loose[]>> = {
  nothingSelected: [{}],
  objectsSelected: [{ selectedObjects: PICKED }],
}

const ROWS = ['group1', 'group2']
const RESOURCES = [1, 2]
const COPIED = { kind: 'task', uids: [3] }

const ROOT_VALUES: readonly Loose[] = [
  { chosenRows: [], chosenResources: [], copiedForPaste: null },
  { chosenRows: ROWS, chosenResources: RESOURCES, copiedForPaste: COPIED },
  { chosenRows: ['group9'], chosenResources: [], copiedForPaste: { kind: 'row', groupId: 'group9' } },
]

const RUNGS = ['notice', 'textEntry', 'confirmation', 'surface', 'gesture', 'propertiesPanel', 'armed', 'selection', 'dualCursorMode', 'tooltip']

// WHY: the same-reference variants (PICKED, ROWS, RESOURCES, COPIED) are what SF-3 is
// about; a value equal in content but a fresh object is not asserted either way.
const EVENT_VARIANTS: Readonly<Record<string, readonly Loose[]>> = {
  objectsPicked: [{ pickedObjects: PICKED }, { pickedObjects: OTHER_PICK }, { pickedObjects: NOTHING }],
  emptyAreaClicked: [{}],
  selectionEscapePressed: RUNGS.map((rung) => ({ rung })),
  selectionSettleKeyPressed: [{}],
  selectionCleared: [{}],
  selectionPruned: [{ remainingObjects: PICKED }, { remainingObjects: OTHER_PICK }, { remainingObjects: NOTHING }],
  createdTaskSelected: [{ createdTaskUid: 3 }, { createdTaskUid: 8 }],
  rowsPicked: [{ chosenRows: ROWS }, { chosenRows: ['group3'] }, { chosenRows: [] }],
  createdRowSelected: [{ createdGroupId: 'group9' }, { createdGroupId: 'group4' }],
  resourcesPicked: [{ chosenResources: RESOURCES }, { chosenResources: [5] }, { chosenResources: [] }],
  copyTaken: [{ copiedForPaste: COPIED }, { copiedForPaste: { kind: 'row', groupId: 'group3' } }],
}

function selectionEvents(): Loose[] {
  return SELECTION.events.flatMap((ev) => {
    const variants = EVENT_VARIANTS[ev.key]
    if (variants === undefined) throw new Error(`no sample for selection/${ev.key}`)
    return variants.map((v) => ({ type: ev.key, ...v }))
  })
}

function describeCarried(value: Loose): string {
  const parts = Object.entries(value)
    .filter(([k]) => k !== 'kind' && k !== 'type')
    .map(([k, v]) => `${k}=${typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}`)
  return parts.length === 0 ? '' : `(${parts.join(', ')})`
}

function crossedSessions(): { name: string; session: ScreenSession }[] {
  return SELECTION_MACHINE.states.flatMap((s) =>
    (SELECTION_VALUES[s.key] ?? []).flatMap((carried) =>
      ROOT_VALUES.map((root, i) => ({
        name: `${s.key}${describeCarried(carried)} & root${i}`,
        session: withSelection({ ...root, selectionState: { kind: s.key, ...carried } }),
      })),
    ),
  )
}

function itemsOf(selection: unknown): readonly unknown[] {
  return (selection as { items: readonly unknown[] }).items
}

// see IN-4, FR-072, SL-7b
function guardHolds(guard: RawGuard, event: Loose): boolean {
  switch (guard.name) {
    case 'hasPickedObjects':
      return itemsOf(event['pickedObjects']).length > 0
    case 'hasRemainingObjects':
      return itemsOf(event['remainingObjects']).length > 0
    case 'isRungSelection':
      return event['rung'] === 'selection'
    default:
      throw new Error(`guard ${String(guard.name)} is named by the manuscript but not by this file's oracle`)
  }
}

function pick(cell: RawCell | undefined, event: Loose): RawBranch | undefined {
  return branchesOf(cell).find((b) => (b.guard ?? []).every((g) => guardHolds(g, event) !== (g.not === true)))
}

// WHY: the T-293 notes say what each cell writes; a created task is selected alone (FR-091),
// and its order flag is not decided by SL-7b for one item, so only the items are held.
function expectedSelected(event: Loose): { items: unknown; ordered?: unknown; same?: unknown } {
  switch (event['type']) {
    case 'objectsPicked':
      return { items: itemsOf(event['pickedObjects']), same: event['pickedObjects'] }
    case 'selectionPruned':
      return { items: itemsOf(event['remainingObjects']), same: event['remainingObjects'] }
    case 'createdTaskSelected':
      return { items: [{ kind: 'task', uid: event['createdTaskUid'] }] }
    default:
      throw new Error(`no oracle for what ${String(event['type'])} selects`)
  }
}

function expectedRoot(event: Loose, before: Loose): Loose {
  const kept = { chosenRows: before['chosenRows'], chosenResources: before['chosenResources'], copiedForPaste: before['copiedForPaste'] }
  if (SELECTION.root.transitions[String(event['type'])] === undefined) return kept
  switch (event['type']) {
    case 'rowsPicked':
      return { ...kept, chosenRows: event['chosenRows'] }
    case 'createdRowSelected':
      return { ...kept, chosenRows: [event['createdGroupId']] }
    case 'resourcesPicked':
      return { ...kept, chosenResources: event['chosenResources'] }
    case 'copyTaken':
      return { ...kept, copiedForPaste: event['copiedForPaste'] }
    default:
      throw new Error(`root cell for ${String(event['type'])} has no oracle`)
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b)
}

// see SD-3, SF-3, SS-5
function expectSelectionStep(session: ScreenSession, event: Loose): void {
  const before = selectionOf(session)
  const field = fieldOf(SELECTION_MACHINE.name)
  const now = before[field] as Loose
  const branch = pick(SELECTION_MACHINE.transitions[String(event['type'])]?.[kindOf(now)], event)
  const rootAfter = expectedRoot(event, before)
  const rootChanges = Object.keys(rootAfter).filter((k) => !sameValue(rootAfter[k], before[k]))
  const want = branch?.to === 'objectsSelected' ? expectedSelected(event) : undefined
  const machineChanges =
    branch !== undefined &&
    (branch.to !== kindOf(now) || (want !== undefined && want.same !== now['selectedObjects'] && !sameValue(want.items, itemsOf(now['selectedObjects']))))

  const result = step(session, event)
  const after = selectionOf(result.state)
  for (const other of OTHER_REGIONS) {
    expect(regionsOf(result.state)[other], `SS-5: leaves ${other} at the same reference`).toBe(regionsOf(session)[other])
  }
  expect(result.effects, 'T-293 names no effect').toBe(NO_EFFECTS)
  if (!machineChanges && rootChanges.length === 0) {
    expect(result.state, 'nothing changes: the same session reference').toBe(session)
    return
  }

  if (!machineChanges) {
    expect(after[field], 'no written cell: selectionState is kept').toBe(now)
  } else {
    const value = after[field] as Loose
    expect(kindOf(value), `selection lands on ${String(branch?.to)}`).toBe(branch?.to)
    if (want !== undefined) expect(itemsOf(value['selectedObjects'])).toEqual(want.items)
  }
  for (const [k, v] of Object.entries(rootAfter)) {
    if (rootChanges.includes(k)) expect(after[k], k).toEqual(v)
    else expect(after[k], `${k} is kept`).toBe(before[k])
  }
}

describe('T-293 initial kinds: emptyScreenSession holds nothing selected and empty root values', () => {
  it('selectionState starts in its initial state', () => {
    expect(kindOf(selectionOf(emptyScreenSession)[fieldOf(SELECTION_MACHINE.name)])).toBe(
      SELECTION_MACHINE.states.find((s) => s.initial)?.key,
    )
  })

  it('the root starts with no chosen rows, no chosen resources and nothing copied', () => {
    const root = selectionOf(emptyScreenSession)
    expect([root['chosenRows'], root['chosenResources'], root['copiedForPaste']]).toEqual([[], [], null])
  })
})

describe('SD-3 (T-293): every selection state (with root values) x every selection event', () => {
  const cases = crossedSessions().flatMap((s) =>
    selectionEvents().map((event) => [`${s.name} x ${String(event['type'])}${describeCarried(event)}`, s.session, event] as const),
  )
  it.each(cases)('%s', (_, session, event) => {
    expectSelectionStep(session, event)
  })
})

const SAMPLE: Record<string, unknown> = {
  surfaceName: 'U-56',
  target: 'surface',
  rung: 'selection',
  armKind: 'dependencyArmed',
  shapeKind: null,
  glyph: null,
  subject: { selection: { items: [], ordered: false }, groupIds: [] },
  date: '2026-01-05',
  percent: 100,
  end: 'max',
  language: 'en',
  taskUid: 1,
  rememberedActual: null,
  reason: 'RS-27',
  affectedCount: null,
  silentWatchers: 1,
  pressRow: 'PTD-5',
  pressedOn: null,
  axis: 'position',
  openRoute: 'chooser',
  writeForm: { kind: 'save' },
  openChoice: 'merge',
  question: { manner: 'NT-7', question: 'QN-5', items: [] },
  mergeMapping: { kind: 'allSame' },
  isProceeding: false,
  owedAction: { kind: 'startNewDocument' },
  hasStartupTemplate: false,
  mergeCandidates: [],
  unreadColumns: [],
  droppedTaskNames: [],
  openedFileName: null,
  fieldRow: 'PR-1',
  created: { kind: 'task', uid: 3 },
}

describe('SS-5: every event of the other regions leaves the selection region at the same reference', () => {
  const busy = withSelection({
    selectionState: { kind: 'objectsSelected', selectedObjects: PICKED },
    chosenRows: ROWS,
    chosenResources: RESOURCES,
    copiedForPaste: COPIED,
  })
  const cases = OTHER_REGIONS.flatMap((name) =>
    regionNamed(name).events.map((ev) => {
      const event: Loose = { type: ev.key }
      for (const c of ev.carries) event[c.name] = c.name in SAMPLE ? SAMPLE[c.name] : true
      return [`${name}/${ev.key}`, event] as const
    }),
  )
  it.each(cases)('%s', (_, event) => {
    expect(selectionOf(step(busy, event).state)).toBe(selectionOf(busy))
  })
})

// see SP-1, SP-2, SP-3, SP-4, JDG-289
const ARM_VALUES: readonly Loose[] = [
  { kind: 'notArmed' },
  { kind: 'taskShapeArmed', shapeKind: 'SH-1' },
  { kind: 'milestoneShapeArmed', glyph: 'SH-5' },
  { kind: 'dependencyArmed' },
  { kind: 'commentBoxArmed' },
  { kind: 'highlightBoxArmed' },
]

function armEvent(armKind: string): Loose {
  return {
    type: 'armEntryPressed',
    armKind,
    shapeKind: armKind === 'taskShapeArmed' ? 'SH-1' : null,
    glyph: armKind === 'milestoneShapeArmed' ? 'SH-5' : null,
  }
}

describe('JDG-289: the selection is orthogonal to armModeStateMachine (6 x 2)', () => {
  const combos = ARM_VALUES.flatMap((arm) =>
    SELECTION_MACHINE.states.map((s) => ({
      name: `${kindOf(arm)} & ${s.key}`,
      session: withSelection({ selectionState: { kind: s.key, ...(SELECTION_VALUES[s.key]?.[0] ?? {}) } }, { armModeState: arm }),
    })),
  )
  const armEvents = [...ARM_VALUES.slice(1).map((a) => armEvent(kindOf(a))), { type: 'escapePressed', rung: 'armed' }]

  it.each(combos.flatMap((c) => armEvents.map((e) => [`${c.name} x ${describeCarried(e)} ${String(e['type'])}`, c.session, e] as const)))(
    'an arm event leaves the selection: %s',
    (_, session, event) => {
      expect(selectionOf(step(session, event).state)).toBe(selectionOf(session))
    },
  )

  it.each(combos.flatMap((c) => selectionEvents().map((e) => [`${c.name} x ${String(e['type'])}${describeCarried(e)}`, c.session, e] as const)))(
    'a selection event leaves the arm: %s',
    (_, session, event) => {
      expect(screenOf(step(session, event).state)['armModeState']).toBe(screenOf(session)['armModeState'])
    },
  )
})

describe('IN-4: with an arm and a selection both held, Esc clears the arm first and the selection second', () => {
  const both = ARM_VALUES.slice(1).map((arm) => [
    kindOf(arm),
    withSelection({ selectionState: { kind: 'objectsSelected', selectedObjects: PICKED } }, { armModeState: arm }),
  ] as const)

  it.each(both)('%s & objectsSelected: the armed rung clears the arm and keeps the selection', (_, session) => {
    const first = step(session, { type: 'escapePressed', rung: 'armed' })
    expect(kindOf(screenOf(first.state)['armModeState'])).toBe('notArmed')
    expect(selectionOf(first.state)).toBe(selectionOf(session))
    const ignored = step(session, { type: 'selectionEscapePressed', rung: 'armed' })
    expect(ignored.state).toBe(session)
  })

  it.each(both)('%s & objectsSelected: the selection rung comes next, clears the selection and keeps the arm', (_, session) => {
    const disarmed = step(session, { type: 'escapePressed', rung: 'armed' }).state
    const second = step(disarmed, { type: 'selectionEscapePressed', rung: 'selection' })
    expect(kindOf(selectionOf(second.state)['selectionState'])).toBe('nothingSelected')
    expect(screenOf(second.state)['armModeState']).toBe(screenOf(disarmed)['armModeState'])
    const direct = step(session, { type: 'selectionEscapePressed', rung: 'selection' })
    expect(screenOf(direct.state)['armModeState']).toBe(screenOf(session)['armModeState'])
  })
})
