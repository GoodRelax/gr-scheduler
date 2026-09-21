// Contract test: table T-250 SD-3 -- the gesture manuscript (T-289) against advanceScreenSession.

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
type RawGuard = { readonly name: string; readonly not?: boolean }
type RawBranch = { readonly to: string; readonly guard?: readonly RawGuard[]; readonly effect?: string }
type RawCell = RawBranch | readonly RawBranch[]
type RawState = { readonly key: string; readonly parent: string | null; readonly initial: boolean }
type RawMachine = {
  readonly name: string
  readonly states: readonly RawState[]
  readonly transitions: Readonly<Record<string, Readonly<Record<string, RawCell>>>>
}
type RawEvent = { readonly key: string; readonly carries: readonly { readonly name: string }[] }
type RawRegion = { readonly region: string; readonly events: readonly RawEvent[]; readonly machines: readonly RawMachine[] }

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

const GESTURE = regionNamed('gesture')

// see T-289
function fieldOf(machine: RawMachine): string {
  return machine.name.replace(/Machine$/, '')
}

function branchesOf(cell: RawCell | undefined): readonly RawBranch[] {
  if (cell === undefined) return []
  return Array.isArray(cell) ? (cell as readonly RawBranch[]) : [cell as RawBranch]
}

function regionsOf(session: ScreenSession): Loose {
  return session as unknown as Loose
}

function gestureOf(session: ScreenSession): Loose {
  return regionsOf(session)['gesture'] as Loose
}

function kindOf(value: unknown): string {
  return String((value as Loose)['kind'])
}

function step(session: ScreenSession, event: Loose): ReturnType<typeof advanceScreenSession> {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

function withGesture(fields: Loose): ScreenSession {
  return { ...regionsOf(emptyScreenSession), gesture: { ...gestureOf(emptyScreenSession), ...fields } } as unknown as ScreenSession
}

// see FR-018, IC-12, IC-13, IC-14, IC-15, S-172
const REPEATING_ENTRIES: readonly string[] = ['IC-12', 'IC-13', 'IC-14', 'IC-15']
const REPEATING_ENTRY = 'IC-12'
const PLAIN_ENTRY = 'IC-17'

const PRESSED_ON: Record<string, Loose> = {
  scheduleShape: { kind: 'grab', grabRow: 'GR-23', itemId: 'task1' },
  box: { kind: 'grab', grabRow: 'GR-14', itemId: 'box1' },
  repeatingEntry: { kind: 'entry', entry: REPEATING_ENTRY },
  plainEntry: { kind: 'entry', entry: PLAIN_ENTRY },
  paletteBand: { kind: 'paletteBand' },
  panelBorder: { kind: 'panelBorder', panel: 'propertiesPanel' },
  rowGrabStrip: { kind: 'rowGrabStrip', rowGroupId: 'group1' },
  scrollbarThumb: { kind: 'scrollbarThumb', axis: 'vertical' },
}

// WHY: PTD-3 is the only row that hit something, so only it carries a pressedOn;
// PTD-1 pans whatever is under it and PTD-2 does no hit test (T-023a).
const PRESSES: readonly { label: string; pressRow: string; pressedOn: Loose | null }[] = [
  { label: 'PTD-1', pressRow: 'PTD-1', pressedOn: null },
  { label: 'PTD-2', pressRow: 'PTD-2', pressedOn: null },
  ...Object.entries(PRESSED_ON).map(([label, on]) => ({ label: `PTD-3 ${label}`, pressRow: 'PTD-3', pressedOn: on })),
  { label: 'PTD-4', pressRow: 'PTD-4', pressedOn: null },
  { label: 'PTD-4a', pressRow: 'PTD-4a', pressedOn: null },
  { label: 'PTD-5', pressRow: 'PTD-5', pressedOn: null },
]

// WHY: AG-9 limits the refusal to drags that change the document, matched to the undo
// rows of T-027: UN-1 / UN-2 / UN-4 / UN-5 are in; UN-8 / UN-9 / UN-12 / UN-16 are out.
const DOCUMENT_CHANGING: Readonly<Record<string, boolean>> = {
  'PTD-1': false,
  'PTD-2': false,
  'PTD-3 scheduleShape': true,
  'PTD-3 box': true,
  'PTD-3 repeatingEntry': false,
  'PTD-3 plainEntry': false,
  'PTD-3 paletteBand': false,
  'PTD-3 panelBorder': false,
  'PTD-3 rowGrabStrip': true,
  'PTD-3 scrollbarThumb': false,
  'PTD-4': true,
  'PTD-4a': false,
  'PTD-5': false,
}

function pressLabel(pressRow: unknown, pressedOn: unknown): string {
  const found = PRESSES.find((p) => p.pressRow === pressRow && p.pressedOn === pressedOn)
  if (found === undefined) throw new Error('a press outside the sample list')
  return found.label
}

function isOnEntry(pressedOn: unknown, entry: string): boolean {
  const on = pressedOn as Loose | null
  return on !== null && on['kind'] === 'entry' && on['entry'] === entry
}

function isOnRepeatingEntry(pressedOn: unknown): boolean {
  return REPEATING_ENTRIES.some((entry) => isOnEntry(pressedOn, entry))
}

// see AG-9, FR-018, FR-053, GR-19, HF-15
function guardHolds(name: string, gesture: Loose, event: Loose): boolean {
  const pressedOnNow = (gesture['pointerPressState'] as Loose)['pressedOn']
  switch (name) {
    case 'isDocumentChangingPress':
      return DOCUMENT_CHANGING[pressLabel(event['pressRow'], event['pressedOn'])] === true
    case 'isRowGrabStrip':
      return (event['pressedOn'] as Loose | null)?.['kind'] === 'rowGrabStrip'
    case 'isOnRepeatingEntry':
      return isOnRepeatingEntry(event['type'] === 'pointerPressed' ? event['pressedOn'] : pressedOnNow)
    case 'isOnPaletteBand':
      return (pressedOnNow as Loose | null | undefined)?.['kind'] === 'paletteBand'
    case 'isPositionAxis':
      return event['axis'] === 'position'
    default:
      throw new Error(`guard ${name} is named by the manuscript but not by this file's oracle`)
  }
}

type Fired = { machine: RawMachine; branch: RawBranch }

function firing(gesture: Loose, event: Loose): Fired[] {
  const fired: Fired[] = []
  for (const machine of GESTURE.machines) {
    const now = kindOf(gesture[fieldOf(machine)])
    const branch = branchesOf(machine.transitions[String(event['type'])]?.[now]).find((b) =>
      (b.guard ?? []).every((g) => guardHolds(g.name, gesture, event) !== (g.not === true)),
    )
    if (branch !== undefined) fired.push({ machine, branch })
  }
  return fired
}

// see SD-3, SF-3, SS-5
function expectGestureStep(session: ScreenSession, event: Loose): void {
  const before = gestureOf(session)
  const fired = firing(before, event)
  const result = step(session, event)
  const after = gestureOf(result.state)

  for (const other of ['screen', 'notices']) {
    expect(regionsOf(result.state)[other], `SS-5: a gesture event leaves ${other} at the same reference`).toBe(
      regionsOf(session)[other],
    )
  }
  if (fired.length === 0) {
    expect(result.state, 'no cell: the same session reference').toBe(session)
    expect(result.effects, 'no cell: the shared NO_EFFECTS').toBe(NO_EFFECTS)
    return
  }

  for (const machine of GESTURE.machines) {
    const field = fieldOf(machine)
    const f = fired.find((x) => x.machine === machine)
    if (f === undefined) {
      expect(after[field], `no cell for ${machine.name}: its value is kept`).toBe(before[field])
      continue
    }
    expect(kindOf(after[field]), `${machine.name} lands on ${f.branch.to}`).toBe(f.branch.to)
  }

  const pointer = after['pointerPressState'] as Loose
  if (fired.some((f) => f.machine.name === 'pointerPressStateMachine' && event['type'] === 'pointerPressed')) {
    expect(pointer['pressRow'], 'the press row the event carried').toBe(event['pressRow'])
    expect(pointer['pressedOn'], 'what the event says was pressed').toEqual(event['pressedOn'])
  }

  const expected = fired.flatMap((f) => (f.branch.effect === undefined ? [] : [f.branch.effect])).sort()
  expect(result.effects.map((e) => String((e as unknown as Loose)['type'])).sort()).toEqual(expected)
}

function pointerValues(kind: string): { label: string; value: Loose }[] {
  if (kind === 'notPressed') return [{ label: 'notPressed', value: { kind } }]
  return PRESSES.filter((p) => (DOCUMENT_CHANGING[p.label] === true) === (kind === 'changingDocument')).map((p) => ({
    label: `${kind}(${p.label})`,
    value: { kind, pressRow: p.pressRow, pressedOn: p.pressedOn },
  }))
}

function crossedSessions(): { name: string; session: ScreenSession }[] {
  const pointer = GESTURE.machines.find((m) => m.name === 'pointerPressStateMachine')
  const rowGrab = GESTURE.machines.find((m) => m.name === 'rowGrabStateMachine')
  if (pointer === undefined || rowGrab === undefined) throw new Error('T-289 lost a machine this file reads')
  return pointer.states.flatMap((p) =>
    pointerValues(p.key).flatMap((pv) =>
      rowGrab.states.map((r) => ({
        name: `${pv.label} & ${r.key}`,
        session: withGesture({ pointerPressState: pv.value, rowGrabState: { kind: r.key } }),
      })),
    ),
  )
}

function gestureEvents(): Loose[] {
  const samples: Record<string, readonly Loose[]> = {
    pointerPressed: PRESSES.map((p) => ({ pressRow: p.pressRow, pressedOn: p.pressedOn })),
    rowGrabAxisSettled: [{ axis: 'position' }, { axis: 'depth' }],
  }
  return GESTURE.events.flatMap((ev) => (samples[ev.key] ?? [{}]).map((v) => ({ type: ev.key, ...v })))
}

function describeEvent(event: Loose): string {
  if (event['type'] === 'pointerPressed') return `pointerPressed(${pressLabel(event['pressRow'], event['pressedOn'])})`
  const { type, ...rest } = event
  const shown = Object.entries(rest).map(([k, v]) => `${k}=${String(v)}`)
  return `${String(type)}${shown.length === 0 ? '' : `(${shown.join(', ')})`}`
}

describe('T-289 initial kinds: emptyScreenSession holds each gesture machine in its initial state', () => {
  it.each(GESTURE.machines.map((m) => [m.name, m] as const))('%s', (_, m) => {
    const initial = m.states.find((s) => s.initial)
    expect(kindOf(gestureOf(emptyScreenSession)[fieldOf(m)])).toBe(initial?.key)
  })
})

const VIEWING_PRESSES_READ_AS_CHANGING = new Set(['PTD-2', 'PTD-3 plainEntry', 'PTD-3 paletteBand', 'PTD-3 panelBorder', 'PTD-4a'])

function isPinnedByDfc687(session: ScreenSession, event: Loose): boolean {
  if (event['type'] !== 'pointerPressed') return false
  if (kindOf(gestureOf(session)['pointerPressState']) !== 'notPressed') return false
  return VIEWING_PRESSES_READ_AS_CHANGING.has(pressLabel(event['pressRow'], event['pressedOn']))
}

describe('SD-3 (T-289): every gesture state (both machines crossed) x every gesture event', () => {
  const cases = crossedSessions().flatMap((s) =>
    gestureEvents().map((event) => [`${s.name} x ${describeEvent(event)}`, s.session, event] as const),
  )
  it.each(cases.filter(([, session, event]) => !isPinnedByDfc687(session, event)))('%s', (_, session, event) => {
    expectGestureStep(session, event)
  })

  // DEVIATION: AG-9 keeps these presses out of changingDocument; the region copies today's
  // shell until the move is shown equal (DFC-687, JDG-57).
  it.fails.each(cases.filter(([, session, event]) => isPinnedByDfc687(session, event)))('%s (DFC-687)', (_, session, event) => {
    expectGestureStep(session, event)
  })
})

describe('SS-5: screen and notice events leave the gesture region at the same reference', () => {
  const sample: Record<string, unknown> = {
    surfaceName: 'U-30',
    target: 'surface',
    rung: 'gesture',
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
    reason: 'RS-41',
    affectedCount: null,
    silentWatchers: 1,
  }
  const held = withGesture({
    pointerPressState: { kind: 'changingDocument', pressRow: 'PTD-3', pressedOn: PRESSED_ON['rowGrabStrip'] },
    rowGrabState: { kind: 'axisUndecided' },
  })
  const cases = ['screen', 'notices'].flatMap((name) =>
    regionNamed(name).events.map((ev) => {
      const event: Loose = { type: ev.key }
      for (const c of ev.carries) event[c.name] = c.name in sample ? sample[c.name] : true
      return [`${name}: ${ev.key}`, event] as const
    }),
  )
  it.each(cases)('%s', (_, event) => {
    expect(gestureOf(step(held, event).state)).toBe(gestureOf(held))
  })
})

describe('FR-018: each entry that repeats while held (IC-12..IC-15) starts the repeat, and nothing else does', () => {
  const pressEntry = (entry: string): void => {
    const event = { type: 'pointerPressed', pressRow: 'PTD-3', pressedOn: { kind: 'entry', entry } }
    const result = step(emptyScreenSession, event)
    expect(kindOf(gestureOf(result.state)['pointerPressState'])).toBe('viewingDocument')
    const started = result.effects.some((e) => (e as unknown as Loose)['type'] === 'startEntryRepeat')
    expect(started).toBe(REPEATING_ENTRIES.includes(entry))
  }

  it.each(REPEATING_ENTRIES)('pointerPressed on entry %s', pressEntry)

  // DEVIATION: AG-9 keeps an entry press out of changingDocument; the region copies today's
  // shell until the move is shown equal (DFC-687, JDG-57).
  it.fails.each(['IC-104', 'IC-105', PLAIN_ENTRY])('pointerPressed on entry %s (DFC-687)', pressEntry)
})
