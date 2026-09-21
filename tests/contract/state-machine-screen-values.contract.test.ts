// Contract test: table T-250 SD-3 -- the screen-values manuscript (T-280) against advanceScreenSession.

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

type Carried = { readonly name: string }
type SmRow = {
  readonly id: string
  readonly key: string
  readonly parent: string | null
  readonly initial: boolean
  readonly carries: readonly Carried[]
}
type EvRow = { readonly id: string; readonly key: string; readonly carries: readonly Carried[] }
type Guard = { readonly name: string; readonly not?: boolean }
type TnRow = {
  readonly id: string
  readonly from: readonly (readonly string[])[]
  readonly event: string
  readonly guard: readonly Guard[] | null
  readonly to: readonly string[] | 'self'
  readonly effect: { readonly name: string; readonly row?: string } | null
}
type Region = {
  readonly region: string
  readonly states: readonly SmRow[]
  readonly events: readonly EvRow[]
  readonly transitions: readonly TnRow[]
}
type Loose = Record<string, unknown>
type RawGuard = { readonly name: string; readonly not?: boolean } | { readonly in: string }
type RawBranch = {
  readonly to?: string
  readonly guard?: readonly RawGuard[]
  readonly effect?: string
  readonly effectArgument?: string
}
type RawCell = RawBranch | readonly RawBranch[]
type RawRegion = {
  readonly region: string
  readonly root: { readonly carries: readonly Carried[]; readonly transitions: Readonly<Record<string, RawCell>> }
  readonly events: readonly { readonly key: string; readonly carries: readonly Carried[] }[]
  readonly machines: readonly {
    readonly name: string
    readonly states: readonly { readonly key: string; readonly parent: string | null; readonly initial: boolean; readonly carries: readonly Carried[] }[]
    readonly transitions: Readonly<Record<string, Readonly<Record<string, RawCell>>>>
  }[]
}

function branchesOf(cell: RawCell): readonly RawBranch[] {
  return Array.isArray(cell) ? cell : [cell as RawBranch]
}

function guardWords(guard: readonly RawGuard[]): string {
  return guard.map((g) => ('in' in g ? `in ${g.in}` : g.not === true ? `not ${g.name}` : g.name)).join(' & ')
}

function tnRow(raw: RawRegion, state: string, event: string, branch: RawBranch, others: readonly string[]): TnRow {
  const guard = branch.guard ?? null
  return {
    id: `${state} x ${raw.region}/${event}${guard === null ? '' : ` [${guardWords(guard)}]`}`,
    from: [[state, ...others]],
    event,
    guard: guard === null ? null : guard.flatMap((g) => ('in' in g ? [] : [g])),
    to: branch.to === undefined || `${state.split('.')[0] ?? ''}.${branch.to}` === state ? 'self' : [`${state.split('.')[0] ?? ''}.${branch.to}`],
    effect: branch.effect === undefined ? null : { name: branch.effect, ...(branch.effectArgument === undefined ? {} : { row: branch.effectArgument }) },
  }
}

// WHY: the manuscript holds one table per machine (JDG-286); this reads it back into the state,
// event and transition rows the oracle walks. An `in` guard term joins the source conjunction.
function regionOf(raw: RawRegion): Region {
  const states: SmRow[] = [{ id: raw.region, key: raw.region, parent: null, initial: true, carries: raw.root.carries }]
  for (const m of raw.machines) {
    for (const s of m.states) {
      const key = `${m.name}.${s.key}`
      states.push({ id: key, key, parent: s.parent === null ? raw.region : `${m.name}.${s.parent}`, initial: s.initial, carries: s.carries })
    }
  }
  const rootRows = Object.entries(raw.root.transitions).flatMap(([event, cell]) =>
    branchesOf(cell).map((b) => tnRow(raw, raw.region, event, b, [])),
  )
  const machineRows = raw.machines.flatMap((m) =>
    Object.entries(m.transitions).flatMap(([event, row]) =>
      Object.entries(row).flatMap(([key, cell]) =>
        branchesOf(cell).map((b) =>
          tnRow(raw, `${m.name}.${key}`, event, b, (b.guard ?? []).flatMap((g) => ('in' in g ? [g.in] : []))),
        ),
      ),
    ),
  )
  const events = raw.events.map((e) => ({ id: `${raw.region}/${e.key}`, key: e.key, carries: e.carries }))
  return { region: raw.region, states, events, transitions: [...rootRows, ...machineRows] }
}

// WHY: the manuscript, not the generated table, is read: it is the single source, and
// generated-vs-manuscript drift is gen:check's job.
const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8'),
) as { readonly regions: readonly RawRegion[] }

const RAW_REGION = MANUSCRIPT.regions.find((r) => r.region === 'screen')
if (RAW_REGION === undefined) throw new Error('state-machines.json has no region "screen"')
const REGION = regionOf(RAW_REGION)
const ROOT = REGION.region
const STATES = REGION.states
const EVENTS = REGION.events
const TRANSITIONS = REGION.transitions

const leafStates = STATES.filter((s) => s.parent !== null && !STATES.some((t) => t.parent === s.key))

function axisAndPath(key: string): { axis: string; path: string[] } {
  const [machine, ...path] = key.split('.')
  if (machine === undefined) throw new Error(`state key ${key} has no machine`)
  // WHY: the machine is named `...StateMachine` and the value holding its current state `...State` (R4.4).
  return { axis: machine.replace(/Machine$/, ''), path }
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

// see T-280
function completePath(key: string): string[] {
  let at = key
  for (;;) {
    const child = STATES.find((s) => s.parent === at && s.initial)
    if (child === undefined) return axisAndPath(at).path
    at = child.key
  }
}

const UNLOCK_SURFACE = 'U-60'
const CHOICE = { selection: { items: [{ kind: 'task', uid: 1 }], ordered: false }, groupIds: [] }
const NO_CHOICE = { selection: { items: [], ordered: false }, groupIds: [] }

// see T-280
const STATE_CARRIED_VARIANTS: Record<string, readonly unknown[]> = {
  shapeKind: ['SH-1'],
  glyph: ['SH-5'],
  surfaceName: ['U-30', UNLOCK_SURFACE],
  subject: [CHOICE],
  returnSubject: [CHOICE, null],
  percent: [100],
  end: ['max'],
}

function memberFor(row: SmRow | undefined, kind: string): Loose[] {
  let members: Loose[] = [{ kind }]
  for (const c of row?.carries ?? []) {
    const values = STATE_CARRIED_VARIANTS[c.name]
    if (values === undefined) throw new Error(`no sample for carried value ${c.name}`)
    members = members.flatMap((m) => values.map((v) => ({ ...m, [c.name]: v })))
  }
  return members
}

function valuesFor(key: string): Loose[] {
  const path = completePath(key)
  const prefix = key.split('.')[0] ?? ''
  let built: Loose[] = []
  for (let depth = path.length; depth >= 1; depth -= 1) {
    const row = STATES.find((s) => s.key === `${prefix}.${path.slice(0, depth).join('.')}`)
    const members = memberFor(row, path[depth - 1] as string)
    built = built.length === 0 ? members : members.flatMap((m) => built.map((b) => ({ ...m, child: b })))
  }
  return built
}

function valueFor(key: string): Loose {
  return valuesFor(key)[0] as Loose
}

function screenOf(session: ScreenSession): Loose {
  return (session as unknown as { screen: Loose }).screen
}

function withAxes(base: ScreenSession, axes: Record<string, Loose>): ScreenSession {
  return { ...base, screen: { ...screenOf(base), ...axes } } as unknown as ScreenSession
}

function sessionIn(...keys: string[]): ScreenSession {
  const axes: Record<string, Loose> = {}
  for (const key of keys) axes[axisAndPath(key).axis] = valueFor(key)
  return withAxes(emptyScreenSession, axes)
}

function step(session: ScreenSession, event: Loose): ReturnType<typeof advanceScreenSession> {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

const RUNGS = [
  'notice',
  'textEntry',
  'confirmation',
  'surface',
  'gesture',
  'propertiesPanel',
  'armed',
  'selection',
  'dualCursorMode',
  'tooltip',
] as const

const EVENT_CARRIED_VARIANTS: Record<string, readonly unknown[]> = {
  surfaceName: ['U-30'],
  target: ['surface', 'panel'],
  rung: RUNGS,
  subject: [CHOICE, NO_CHOICE],
  date: ['2026-01-05'],
  percent: [100],
  end: ['max'],
  language: ['en'],
  taskUid: [1],
  rememberedActual: [null],
  isFullScreen: [true, false],
  isProceeding: [true, false],
  hasNoSurfaceOrConfirmation: [true, false],
  hasNoUnsettledEntry: [true, false],
  isAgentApiEnabled: [true, false],
  hasDaysToPlace: [true, false],
}

const ARM_KINDS = STATES.filter((s) => s.parent === ROOT && s.key.startsWith('armModeStateMachine.') && !s.initial).map(
  (s) => axisAndPath(s.key).path[0] as string,
)

// see T-280, FR-016
function armEvent(armKind: string, carried = 'SH-1'): Loose {
  return {
    type: 'armEntryPressed',
    armKind,
    shapeKind: armKind === 'taskShapeArmed' ? carried : null,
    glyph: armKind === 'milestoneShapeArmed' ? (carried === 'SH-1' ? 'SH-5' : carried) : null,
  }
}

function eventVariants(ev: EvRow): Loose[] {
  if (ev.key === 'armEntryPressed') return ARM_KINDS.map((k) => armEvent(k))
  let variants: Loose[] = [{ type: ev.key }]
  for (const c of ev.carries) {
    const values = EVENT_CARRIED_VARIANTS[c.name]
    if (values === undefined) throw new Error(`no sample for carried value ${c.name}`)
    variants = variants.flatMap((v) => values.map((x) => ({ ...v, [c.name]: x })))
  }
  return variants
}

function describeValue(v: unknown): string {
  if (v === CHOICE) return 'choice'
  if (v === NO_CHOICE) return 'noChoice'
  return typeof v === 'object' && v !== null ? 'value' : String(v)
}

function describeCarried(value: Loose, skip: string): string {
  const shown = Object.entries(value)
    .filter(([k]) => k !== skip && k !== 'child')
    .map(([k, v]) => `${k}=${describeValue(v)}`)
  return shown.length === 0 ? '' : `(${shown.join(', ')})`
}

function holds(session: ScreenSession, key: string): boolean {
  if (key === ROOT) return true
  const { axis, path } = axisAndPath(key)
  const now = kindPath(screenOf(session)[axis])
  return path.every((segment, i) => now[i] === segment)
}

function hasChoice(subject: unknown): boolean {
  const s = subject as { selection: { items: readonly unknown[] }; groupIds: readonly unknown[] }
  return s.selection.items.length > 0 || s.groupIds.length > 0
}

// see IN-4, FR-016, FR-070, WM-6, WM-8, FR-072
function guardHolds(name: string, session: ScreenSession, event: Loose): boolean {
  const screen = screenOf(session)
  switch (name) {
    case 'isFullScreen':
    case 'isProceeding':
    case 'hasNoSurfaceOrConfirmation':
    case 'hasNoUnsettledEntry':
    case 'isAgentApiEnabled':
    case 'hasDaysToPlace':
      return event[name] === true
    case 'isSameArm': {
      const armed = screen['armModeState'] as Loose
      if (armed['kind'] !== event['armKind']) return false
      if (armed['kind'] === 'taskShapeArmed') return armed['shapeKind'] === event['shapeKind']
      if (armed['kind'] === 'milestoneShapeArmed') return armed['glyph'] === event['glyph']
      return true
    }
    // WHY: entering the mode is dualCursorModeStateMachine.off with hasDaysToPlace; FR-016 disarms
    // on entering, so leaving the mode (from dualCursorModeStateMachine.on) keeps the arm.
    case 'canEnterDualCursor':
      return holds(session, 'dualCursorModeStateMachine.off') && event['hasDaysToPlace'] === true
    case 'isWatermarkUnlockSurface': {
      const surface = screen['openSurfaceState'] as Loose
      return surface['kind'] === 'open' && surface['surfaceName'] === UNLOCK_SURFACE
    }
    case 'isRungSurface':
      return event['rung'] === 'surface'
    case 'isRungArmed':
      return event['rung'] === 'armed'
    case 'isRungDualCursor':
      return event['rung'] === 'dualCursorMode'
    case 'isRungTooltip':
      return event['rung'] === 'tooltip'
    case 'isSurfaceTarget':
      return event['target'] === 'surface'
    case 'isPanelTarget':
      return event['target'] === 'panel'
    // WHY: req:4194 sends the closing hand to a standing surface, not the panel
    // behind it, so the panel is topmost only while no surface is open.
    case 'isPanelTopmost':
      return holds(session, 'openSurfaceStateMachine.closed')
    case 'hasChoice':
      return hasChoice(event['subject'])
    default:
      throw new Error(`guard ${name} is named by the manuscript but not by this file's oracle`)
  }
}

type Firing = { row: TnRow; axes: string[] }

function firingRows(session: ScreenSession, event: Loose): Firing[] {
  const fired: Firing[] = []
  for (const row of TRANSITIONS) {
    if (row.event !== event['type']) continue
    if (!row.from.some((conj) => conj.every((key) => holds(session, key)))) continue
    if (!(row.guard ?? []).every((g) => guardHolds(g.name, session, event) !== (g.not === true))) continue
    fired.push({ row, axes: row.to === 'self' ? [] : row.to.map((k) => axisAndPath(k).axis) })
  }
  return fired
}

function targetPath(key: string, event: Loose): string[] {
  return completePath(key.replace(/\{(\w+)\}/g, (_, name: string) => String(event[name])))
}

function isAxis(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'kind' in value
}

// see SD-3, SF-3
function expectStepMatchesManuscript(session: ScreenSession, event: Loose): void {
  const rows = firingRows(session, event)
  const claimed = rows.flatMap((f) => f.axes)
  expect(new Set(claimed).size, `rows share an axis: ${rows.map((f) => f.row.id).join(', ')}`).toBe(claimed.length)

  const result = step(session, event)
  if (rows.length === 0) {
    expect(result.state, 'no cell: the same session reference').toBe(session)
    expect(result.effects, 'no cell: the shared NO_EFFECTS').toBe(NO_EFFECTS)
    return
  }

  const before = screenOf(session)
  const after = screenOf(result.state)
  for (const axis of Object.keys(before).filter((k) => isAxis(before[k]))) {
    const row = rows.find((f) => f.axes.includes(axis))?.row
    if (row !== undefined) {
      const to = (row.to as readonly string[]).find((k) => axisAndPath(k).axis === axis) as string
      expect(kindPath(after[axis]), `${row.id}: ${axis} lands on ${to}`).toEqual(targetPath(to, event))
      continue
    }
    const selfRow = rows.find(
      (f) => f.row.to === 'self' && f.row.from.flat().some((k) => k !== ROOT && axisAndPath(k).axis === axis),
    )
    if (selfRow !== undefined) {
      expect(kindPath(after[axis]), `${selfRow.row.id}: ${axis} stays in its kind`).toEqual(kindPath(before[axis]))
    } else {
      expect(after[axis], `no row names ${axis}: its value is kept`).toBe(before[axis])
    }
  }

  const expected = rows.flatMap((f) => (f.row.effect === null ? [] : [f.row.effect])).map((e) => e.name).sort()
  const effects = result.effects.map((e) => e as unknown as Loose)
  expect(effects.map((e) => String(e['type'])).sort(), `effects of ${rows.map((f) => f.row.id).join(', ')}`).toEqual(
    expected,
  )
  for (const f of rows) {
    const reason = f.row.effect?.row
    if (reason === undefined) continue
    const effect = effects.find((e) => e['type'] === f.row.effect?.name)
    expect(effect?.['reason'], `${f.row.id}: the notice carries ${reason}`).toBe(reason)
  }
}

describe('T-280 initial kinds: emptyScreenSession holds every machine in its initial kind', () => {
  const axes = [...new Set(leafStates.map((s) => axisAndPath(s.key).axis))]
  it.each(axes)('axis %s', (axis) => {
    const initialTop = STATES.find((s) => s.parent === ROOT && s.initial && axisAndPath(s.key).axis === axis)
    expect(initialTop).toBeDefined()
    expect(kindPath(screenOf(emptyScreenSession)[axis])).toEqual(completePath((initialTop as SmRow).key))
  })
})

type PairCase = { name: string; session: ScreenSession; event: Loose }
const pairCases: PairCase[] = []
for (const sm of leafStates) {
  const { axis } = axisAndPath(sm.key)
  for (const value of valuesFor(sm.key)) {
    const session = withAxes(emptyScreenSession, { [axis]: value })
    for (const ev of EVENTS) {
      for (const event of eventVariants(ev)) {
        const name = `${sm.id}${describeCarried(value, 'kind')} x ${ev.id}${describeCarried(event, 'type')}`
        pairCases.push({ name, session, event })
      }
    }
  }
}

describe('SD-3 (T-280): every kind x every event lands where the table cells say, or returns the same reference', () => {
  it.each(pairCases.map((c) => [c.name, c] as const))('%s', (_, c) => {
    expectStepMatchesManuscript(c.session, c.event)
  })
})

describe('SD-3 guards on another machine: watermarkEntryPressed and watermarkUnlockMatched with the combination built', () => {
  const unlockOpen = (): ScreenSession =>
    withAxes(emptyScreenSession, { openSurfaceState: { kind: 'open', surfaceName: UNLOCK_SURFACE } })

  it('openSurfaceStateMachine.closed x watermarkEntryPressed [in watermarkDisplayStateMachine.shown] opens the U-60 surface', () => {
    const session = sessionIn('watermarkDisplayStateMachine.shown', 'openSurfaceStateMachine.closed')
    expectStepMatchesManuscript(session, { type: 'watermarkEntryPressed' })
    const surface = screenOf(step(session, { type: 'watermarkEntryPressed' }).state)['openSurfaceState'] as Loose
    expect(surface['surfaceName']).toBe(UNLOCK_SURFACE)
  })

  it('unmet: watermarkDisplayStateMachine.shown & openSurfaceStateMachine.open x watermarkEntryPressed returns the same reference', () => {
    expectStepMatchesManuscript(sessionIn('watermarkDisplayStateMachine.shown', 'openSurfaceStateMachine.open'), {
      type: 'watermarkEntryPressed',
    })
  })

  it('watermarkDisplayStateMachine.hidden & openSurfaceStateMachine.closed x watermarkEntryPressed opens nothing', () => {
    const session = sessionIn('watermarkDisplayStateMachine.hidden', 'openSurfaceStateMachine.closed')
    expectStepMatchesManuscript(session, { type: 'watermarkEntryPressed' })
    expect(kindPath(screenOf(step(session, { type: 'watermarkEntryPressed' }).state)['openSurfaceState'])).toEqual(['closed'])
  })

  it('watermarkDisplayStateMachine.shown & openSurfaceStateMachine.open(U-60) x watermarkUnlockMatched hides and closes', () => {
    const result = step(unlockOpen(), { type: 'watermarkUnlockMatched' })
    expect(kindPath(screenOf(result.state)['watermarkDisplayState'])).toEqual(['hidden'])
    expect(kindPath(screenOf(result.state)['openSurfaceState'])).toEqual(['closed'])
    expectStepMatchesManuscript(unlockOpen(), { type: 'watermarkUnlockMatched' })
  })

  it('unmet: watermarkDisplayStateMachine.hidden & openSurfaceStateMachine.open(U-60) x watermarkUnlockMatched returns the same reference', () => {
    const session = withAxes(unlockOpen(), { watermarkDisplayState: valueFor('watermarkDisplayStateMachine.hidden') })
    expectStepMatchesManuscript(session, { type: 'watermarkUnlockMatched' })
  })
})

describe('SD-3 guards across two machines: openSurfaceState and propertiesPanelContentState on escapePressed and surfaceCloseAsked', () => {
  const surfaceAndPanel = [
    ['selectionDisplayed', sessionIn('openSurfaceStateMachine.open', 'propertiesPanelContentStateMachine.selectionDisplayed')],
    ['documentSettingsDisplayed', sessionIn('openSurfaceStateMachine.open', 'propertiesPanelContentStateMachine.documentSettingsDisplayed')],
  ] as const

  it.each(surfaceAndPanel.flatMap(([p, s]) => RUNGS.map((rung) => [`surface.open & properties.${p} x rung=${rung}`, s, rung] as const)))(
    'escapePressed (isPanelTopmost): %s',
    (_, session, rung) => {
      expectStepMatchesManuscript(session, { type: 'escapePressed', rung })
    },
  )

  it.each(surfaceAndPanel.flatMap(([p, s]) => (['surface', 'panel'] as const).map((t) => [`surface.open & properties.${p} x target=${t}`, s, t] as const)))(
    'surfaceCloseAsked: %s',
    (_, session, target) => {
      expectStepMatchesManuscript(session, { type: 'surfaceCloseAsked', target })
    },
  )
})

describe('SD-3 guard isSameArm (armModeState x armEntryPressed): same kind and same carried value', () => {
  it('not isSameArm: armModeStateMachine.taskShapeArmed(SH-1) x armEntryPressed(taskShapeArmed, SH-2) stays armed on SH-2', () => {
    const session = sessionIn('armModeStateMachine.taskShapeArmed')
    expectStepMatchesManuscript(session, armEvent('taskShapeArmed', 'SH-2'))
    expect((screenOf(step(session, armEvent('taskShapeArmed', 'SH-2')).state)['armModeState'] as Loose)['shapeKind']).toBe('SH-2')
  })

  it('not isSameArm: armModeStateMachine.milestoneShapeArmed(SH-5) x armEntryPressed(milestoneShapeArmed, other glyph) stays armed on it', () => {
    const session = sessionIn('armModeStateMachine.milestoneShapeArmed')
    expectStepMatchesManuscript(session, armEvent('milestoneShapeArmed', 'SH-5b'))
    expect((screenOf(step(session, armEvent('milestoneShapeArmed', 'SH-5b')).state)['armModeState'] as Loose)['glyph']).toBe('SH-5b')
  })
})
