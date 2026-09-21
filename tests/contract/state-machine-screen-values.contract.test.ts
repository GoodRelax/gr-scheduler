// Contract test: table T-250 SD-3 -- the screen-values manuscript (T-280..T-282) against advanceScreenSession.

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

// WHY: the manuscript, not the generated table, is read: it is the single source, and
// generated-vs-manuscript drift is gen:check's job.
const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8'),
) as { readonly regions: readonly Region[] }

const REGION = MANUSCRIPT.regions.find((r) => r.region === 'screen')
if (REGION === undefined) throw new Error('state-machines.json has no region "screen"')
const ROOT = REGION.region
const STATES = REGION.states
const EVENTS = REGION.events
const TRANSITIONS = REGION.transitions

const leafStates = STATES.filter((s) => s.parent !== null && !STATES.some((t) => t.parent === s.key))

function axisAndPath(key: string): { axis: string; path: string[] } {
  const [axis, ...path] = key.split('.').slice(1)
  if (axis === undefined) throw new Error(`state key ${key} has no axis`)
  return { axis, path }
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

// see TN-2, TN-40
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

// see SM-2, SM-3, SM-16, SM-20, SM-21, SM-31
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
  const prefix = `${ROOT}.${axisAndPath(key).axis}`
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
  noSurfaceNoConfirmation: [true, false],
  noUnsettledEntry: [true, false],
  agentApiEnabled: [true, false],
  hasDaysToPlace: [true, false],
}

const ARM_KINDS = STATES.filter((s) => s.parent === ROOT && s.key.startsWith(`${ROOT}.armed.`) && !s.initial).map(
  (s) => axisAndPath(s.key).path[0] as string,
)

// see EV-10, FR-016
function armEvent(armKind: string, carried = 'SH-1'): Loose {
  return {
    type: 'armEntryPressed',
    armKind,
    shapeKind: armKind === 'taskShape' ? carried : null,
    glyph: armKind === 'milestoneShape' ? (carried === 'SH-1' ? 'SH-5' : carried) : null,
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
    case 'noSurfaceNoConfirmation':
    case 'noUnsettledEntry':
    case 'agentApiEnabled':
    case 'hasDaysToPlace':
      return event[name] === true
    case 'isSameArm': {
      const armed = screen['armed'] as Loose
      if (armed['kind'] !== event['armKind']) return false
      if (armed['kind'] === 'taskShape') return armed['shapeKind'] === event['shapeKind']
      if (armed['kind'] === 'milestoneShape') return armed['glyph'] === event['glyph']
      return true
    }
    // WHY: entering the mode is TN-40 (dualCursor.off with hasDaysToPlace); FR-016's
    // last sentence disarms on entering, so leaving the mode (TN-43) keeps the arm.
    case 'entersDualCursor':
      return holds(session, `${ROOT}.dualCursor.off`) && event['hasDaysToPlace'] === true
    case 'isWatermarkUnlockSurface': {
      const surface = screen['surface'] as Loose
      return surface['kind'] === 'open' && surface['surfaceName'] === UNLOCK_SURFACE
    }
    case 'rungIsSurface':
      return event['rung'] === 'surface'
    case 'rungIsArmed':
      return event['rung'] === 'armed'
    case 'rungIsDualCursor':
      return event['rung'] === 'dualCursorMode'
    case 'rungIsTooltip':
      return event['rung'] === 'tooltip'
    case 'isSurfaceTarget':
      return event['target'] === 'surface'
    case 'isPanelTarget':
      return event['target'] === 'panel'
    // WHY: req:4194 sends the closing hand to a standing surface, not the panel
    // behind it, so the panel is topmost only while no surface is open.
    case 'isPanelTopmost':
      return holds(session, `${ROOT}.surface.none`)
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
    expect(result.state, 'no TN row: the same session reference').toBe(session)
    expect(result.effects, 'no TN row: the shared NO_EFFECTS').toBe(NO_EFFECTS)
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

describe('T-280 initial kinds: emptyScreenSession holds every axis in its initial kind', () => {
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
        const name = `${sm.id} ${sm.key}${describeCarried(value, 'kind')} x ${ev.id} ${ev.key}${describeCarried(event, 'type')}`
        pairCases.push({ name, session, event })
      }
    }
  }
}

describe('SD-3 (T-282): every kind x every event lands where the TN rows say, or returns the same reference', () => {
  it.each(pairCases.map((c) => [c.name, c] as const))('%s', (_, c) => {
    expectStepMatchesManuscript(c.session, c.event)
  })
})

describe('SD-3 conjunctive sources: TN-19 and TN-23 with the combination built', () => {
  const unlockOpen = (): ScreenSession =>
    withAxes(emptyScreenSession, { surface: { kind: 'open', surfaceName: UNLOCK_SURFACE } })

  it('TN-19: watermark.shown & surface.none x watermarkEntryPressed opens the U-60 surface', () => {
    const session = sessionIn(`${ROOT}.watermark.shown`, `${ROOT}.surface.none`)
    expectStepMatchesManuscript(session, { type: 'watermarkEntryPressed' })
    const surface = screenOf(step(session, { type: 'watermarkEntryPressed' }).state)['surface'] as Loose
    expect(surface['surfaceName']).toBe(UNLOCK_SURFACE)
  })

  it('TN-19 unmet: watermark.shown & surface.open x watermarkEntryPressed returns the same reference', () => {
    expectStepMatchesManuscript(sessionIn(`${ROOT}.watermark.shown`, `${ROOT}.surface.open`), {
      type: 'watermarkEntryPressed',
    })
  })

  it('TN-20 not TN-19: watermark.hidden & surface.none x watermarkEntryPressed opens nothing', () => {
    const session = sessionIn(`${ROOT}.watermark.hidden`, `${ROOT}.surface.none`)
    expectStepMatchesManuscript(session, { type: 'watermarkEntryPressed' })
    expect(kindPath(screenOf(step(session, { type: 'watermarkEntryPressed' }).state)['surface'])).toEqual(['none'])
  })

  it('TN-23: watermark.shown & surface.open(U-60) x watermarkUnlockMatched hides and closes', () => {
    const result = step(unlockOpen(), { type: 'watermarkUnlockMatched' })
    expect(kindPath(screenOf(result.state)['watermark'])).toEqual(['hidden'])
    expect(kindPath(screenOf(result.state)['surface'])).toEqual(['none'])
    expectStepMatchesManuscript(unlockOpen(), { type: 'watermarkUnlockMatched' })
  })

  it('TN-23 unmet: watermark.hidden & surface.open(U-60) x watermarkUnlockMatched returns the same reference', () => {
    const session = withAxes(unlockOpen(), { watermark: valueFor(`${ROOT}.watermark.hidden`) })
    expectStepMatchesManuscript(session, { type: 'watermarkUnlockMatched' })
  })
})

describe('SD-3 guards across two axes: TN-13 and TN-32 on escapePressed, TN-12 and TN-31 on surfaceCloseAsked', () => {
  const surfaceAndPanel = [
    ['selection', sessionIn(`${ROOT}.surface.open`, `${ROOT}.properties.selection`)],
    ['documentSettings', sessionIn(`${ROOT}.surface.open`, `${ROOT}.properties.documentSettings`)],
  ] as const

  it.each(surfaceAndPanel.flatMap(([p, s]) => RUNGS.map((rung) => [`surface.open & properties.${p} x rung=${rung}`, s, rung] as const)))(
    'TN-13 / TN-32 (isPanelTopmost): %s',
    (_, session, rung) => {
      expectStepMatchesManuscript(session, { type: 'escapePressed', rung })
    },
  )

  it.each(surfaceAndPanel.flatMap(([p, s]) => (['surface', 'panel'] as const).map((t) => [`surface.open & properties.${p} x target=${t}`, s, t] as const)))(
    'TN-12 / TN-31: %s',
    (_, session, target) => {
      expectStepMatchesManuscript(session, { type: 'surfaceCloseAsked', target })
    },
  )
})

describe('SD-3 guard isSameArm (TN-15 / TN-16): same kind and same carried value', () => {
  it('TN-16: armed.taskShape(SH-1) x armEntryPressed(taskShape, SH-2) stays armed on SH-2', () => {
    const session = sessionIn(`${ROOT}.armed.taskShape`)
    expectStepMatchesManuscript(session, armEvent('taskShape', 'SH-2'))
    expect((screenOf(step(session, armEvent('taskShape', 'SH-2')).state)['armed'] as Loose)['shapeKind']).toBe('SH-2')
  })

  it('TN-16: armed.milestoneShape(SH-5) x armEntryPressed(milestoneShape, other glyph) stays armed on it', () => {
    const session = sessionIn(`${ROOT}.armed.milestoneShape`)
    expectStepMatchesManuscript(session, armEvent('milestoneShape', 'SH-5b'))
    expect((screenOf(step(session, armEvent('milestoneShape', 'SH-5b')).state)['armed'] as Loose)['glyph']).toBe('SH-5b')
  })
})
