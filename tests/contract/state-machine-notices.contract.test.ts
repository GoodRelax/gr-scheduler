// Contract test: table T-250 SD-3 -- the notices manuscript (T-286..T-288) against advanceScreenSession.

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
type Notice = { readonly reason: string; readonly affectedCount: number | null }

const REGIONS = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8')) as {
    readonly regions: readonly Region[]
  }
).regions

function regionNamed(name: string): Region {
  const region = REGIONS.find((r) => r.region === name)
  if (region === undefined) throw new Error(`state-machines.json has no region "${name}"`)
  return region
}

const NOTICES = regionNamed('notices')
const SCREEN = regionNamed('screen')

function leavesOf(region: Region): SmRow[] {
  return region.states.filter((s) => s.parent !== null && !region.states.some((t) => t.parent === s.key))
}

function axisAndPath(key: string): { axis: string; path: string[] } {
  const [axis, ...path] = key.split('.').slice(1)
  if (axis === undefined) throw new Error(`state key ${key} has no axis`)
  return { axis, path }
}

function regionsOf(session: ScreenSession): Loose {
  return session as unknown as Loose
}

function noticesOf(session: ScreenSession): Loose {
  return regionsOf(session)['notices'] as Loose
}

function kindOf(value: unknown): string {
  return String((value as Loose)['kind'])
}

function step(session: ScreenSession, event: Loose): ReturnType<typeof advanceScreenSession> {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

// see NT-3, T-233
const OLDEST: Notice = { reason: 'RS-41', affectedCount: 3 }
const NEWEST: Notice = { reason: 'RS-35', affectedCount: null }
const ABSENT_REASON = 'RS-9'

const ON_SCREEN_VARIANTS: Record<string, readonly { label: string; value: Loose }[]> = {
  none: [{ label: 'none', value: { kind: 'none' } }],
  standing: [
    { label: 'standing[RS-41]', value: { kind: 'standing', standing: [OLDEST] } },
    { label: 'standing[RS-41, RS-35]', value: { kind: 'standing', standing: [OLDEST, NEWEST] } },
  ],
}

function valuesOf(sm: SmRow): readonly { label: string; value: Loose }[] {
  const { axis, path } = axisAndPath(sm.key)
  const kind = path[0] as string
  if (axis === 'onScreen') return ON_SCREEN_VARIANTS[kind] ?? []
  return [{ label: kind, value: { kind } }]
}

function withNotices(axes: Loose): ScreenSession {
  return { ...regionsOf(emptyScreenSession), notices: { ...noticesOf(emptyScreenSession), ...axes } } as unknown as ScreenSession
}

// see SS-6, T-286
function orthogonalSessions(): { name: string; session: ScreenSession }[] {
  const byAxis = new Map<string, { name: string; axes: Loose }[]>()
  for (const sm of leavesOf(NOTICES)) {
    const { axis } = axisAndPath(sm.key)
    const list = byAxis.get(axis) ?? []
    for (const v of valuesOf(sm)) list.push({ name: `${sm.id} ${v.label}`, axes: { [axis]: v.value } })
    byAxis.set(axis, list)
  }
  let combos: { name: string; axes: Loose }[] = [{ name: '', axes: {} }]
  for (const list of byAxis.values()) {
    combos = combos.flatMap((c) =>
      list.map((v) => ({ name: c.name === '' ? v.name : `${c.name} & ${v.name}`, axes: { ...c.axes, ...v.axes } })),
    )
  }
  return combos.map((c) => ({ name: c.name, session: withNotices(c.axes) }))
}

const NOTICE_EVENT_VARIANTS: Record<string, readonly Loose[]> = {
  noticeRaised: [
    { reason: OLDEST.reason, affectedCount: 2 },
    { reason: OLDEST.reason, affectedCount: null },
    { reason: ABSENT_REASON, affectedCount: 4 },
    { reason: ABSENT_REASON, affectedCount: null },
  ],
  newestNoticeDismissAsked: [{}],
  noticeDismissPressed: [{ reason: OLDEST.reason }, { reason: NEWEST.reason }, { reason: ABSENT_REASON }],
  documentReplaced: [{}],
  changeDelivered: [{ silentWatchers: 0 }, { silentWatchers: 2 }],
}

function noticeEvents(): Loose[] {
  return NOTICES.events.flatMap((ev) => {
    const variants = NOTICE_EVENT_VARIANTS[ev.key]
    if (variants === undefined) throw new Error(`no sample for ${ev.id} ${ev.key}`)
    return variants.map((v) => ({ type: ev.key, ...v }))
  })
}

function describeEvent(event: Loose): string {
  const { type, ...rest } = event
  const shown = Object.entries(rest).map(([k, v]) => `${k}=${String(v)}`)
  const row = [...NOTICES.events, ...SCREEN.events].find((e) => e.key === type)
  return `${row?.id ?? '?'} ${String(type)}${shown.length === 0 ? '' : `(${shown.join(', ')})`}`
}

function standingOf(notices: Loose): readonly Notice[] {
  const onScreen = notices['onScreen'] as Loose
  return onScreen['kind'] === 'standing' ? (onScreen['standing'] as readonly Notice[]) : []
}

// see NT-3, NT-8, AG-6
function guardHolds(name: string, notices: Loose, event: Loose): boolean {
  const standing = standingOf(notices)
  const reasonStands = standing.some((n) => n.reason === event['reason'])
  switch (name) {
    case 'isSameReasonStanding':
      return reasonStands
    case 'isOnlyOneStanding':
      return standing.length === 1
    case 'leavesNone':
      return reasonStands && standing.length === 1
    case 'leavesSome':
      return reasonStands && standing.length > 1
    case 'hasSilentWatcher':
      return Number(event['silentWatchers']) > 0
    default:
      throw new Error(`guard ${name} is named by the manuscript but not by this file's oracle`)
  }
}

function holds(notices: Loose, key: string): boolean {
  if (key === NOTICES.region) return true
  const { axis, path } = axisAndPath(key)
  return kindOf(notices[axis]) === path[0]
}

function firingRows(notices: Loose, event: Loose): TnRow[] {
  return NOTICES.transitions.filter(
    (row) =>
      row.event === event['type'] &&
      row.from.some((conj) => conj.every((key) => holds(notices, key))) &&
      (row.guard ?? []).every((g) => guardHolds(g.name, notices, event) !== (g.not === true)),
  )
}

// WHY: T-288 notes carry what a self row does to the list; NT-3 says the bundled one
// becomes the newest and its count grows, NT-8 says the newest goes first.
function expectedStanding(row: TnRow, before: readonly Notice[], event: Loose): readonly Notice[] | undefined {
  const reason = event['reason'] as string
  switch (row.id) {
    case 'TN-54':
      return [{ reason, affectedCount: event['affectedCount'] as number | null }]
    case 'TN-56':
      return [...before, { reason, affectedCount: event['affectedCount'] as number | null }]
    case 'TN-58':
      return before.slice(0, -1)
    case 'TN-60':
      return before.filter((n) => n.reason !== reason)
    default:
      return undefined
  }
}

// see SD-3, SF-3, SS-5
function expectNoticeStep(session: ScreenSession, event: Loose): void {
  const before = noticesOf(session)
  const rows = firingRows(before, event)
  const result = step(session, event)
  const after = noticesOf(result.state)

  expect(regionsOf(result.state)['screen'], 'SS-5: a notice event leaves screen at the same reference').toBe(
    regionsOf(session)['screen'],
  )
  if (rows.length === 0) {
    expect(result.state, 'no TN row: the same session reference').toBe(session)
    expect(result.effects, 'no TN row: the shared NO_EFFECTS').toBe(NO_EFFECTS)
    return
  }

  for (const axis of Object.keys(before)) {
    const row = rows.find((r) => r.to !== 'self' && r.to.some((k) => axisAndPath(k).axis === axis))
    const selfRow = rows.find((r) => r.to === 'self' && r.from.flat().some((k) => axisAndPath(k).axis === axis))
    if (row !== undefined) {
      const to = (row.to as readonly string[]).find((k) => axisAndPath(k).axis === axis) as string
      expect(kindOf(after[axis]), `${row.id}: ${axis} lands on ${to}`).toBe(axisAndPath(to).path[0])
    } else if (selfRow !== undefined) {
      expect(kindOf(after[axis]), `${selfRow.id}: ${axis} stays in its kind`).toBe(kindOf(before[axis]))
    } else {
      expect(after[axis], `no row names ${axis}: its value is kept`).toBe(before[axis])
    }
  }

  for (const row of rows) {
    const standing = expectedStanding(row, standingOf(before), event)
    if (standing !== undefined) expect(standingOf(after), `${row.id}: the standing list`).toEqual(standing)
  }

  const expected = rows.flatMap((r) => (r.effect === null ? [] : [r.effect]))
  const effects = result.effects.map((e) => e as unknown as Loose)
  expect(effects.map((e) => String(e['type'])).sort()).toEqual(expected.map((e) => e.name).sort())
  for (const e of expected) {
    if (e.row === undefined) continue
    expect(effects.find((x) => x['type'] === e.name)?.['reason'], `the notice carries ${e.row}`).toBe(e.row)
  }
}

describe('T-286 initial kinds: emptyScreenSession holds the notices region in its initial kinds', () => {
  it.each(leavesOf(NOTICES).filter((s) => s.initial).map((s) => [s.id, s] as const))('%s', (_, sm) => {
    const { axis, path } = axisAndPath(sm.key)
    expect(kindOf(noticesOf(emptyScreenSession)[axis])).toBe(path[0])
  })
})

describe('SD-3 (T-288): every notices kind (both axes crossed) x every notice event', () => {
  const cases = orthogonalSessions().flatMap((s) =>
    noticeEvents().map((event) => [`${s.name} x ${describeEvent(event)}`, s.session, event] as const),
  )
  it.each(cases)('%s', (_, session, event) => {
    expectNoticeStep(session, event)
  })
})

describe('TN-55 (NT-3): a notice with a reason already standing is bundled into that one', () => {
  const session = withNotices({ onScreen: { kind: 'standing', standing: [OLDEST, NEWEST] } })

  it('TN-55: the bundled notice becomes the newest, and no second notice for the reason is stacked', () => {
    const after = standingOf(noticesOf(step(session, { type: 'noticeRaised', reason: OLDEST.reason, affectedCount: 2 }).state))
    expect(after.map((n) => n.reason)).toEqual([NEWEST.reason, OLDEST.reason])
  })

  it('TN-55: with both counts given, the count grows by the raised count', () => {
    const after = standingOf(noticesOf(step(session, { type: 'noticeRaised', reason: OLDEST.reason, affectedCount: 2 }).state))
    expect(after.at(-1)?.affectedCount).toBe(5)
  })

  it.each([
    ['standing 3, raised null', OLDEST.reason, null, 3],
    ['standing null, raised 4', NEWEST.reason, 4, null],
    ['standing null, raised null', NEWEST.reason, null, null],
  ] as const)('TN-55: the count grows (%s)', (_, reason, raised, standingCount) => {
    const after = standingOf(noticesOf(step(session, { type: 'noticeRaised', reason, affectedCount: raised }).state))
    const bundled = after.at(-1)
    expect(bundled?.reason).toBe(reason)
    expect(bundled?.affectedCount).toBeGreaterThan(standingCount ?? 0)
  })

  it('TN-56 (NT-3 MUST NOT): the count of standing notices has no ceiling', () => {
    let s = withNotices({})
    for (let i = 1; i <= 50; i += 1) s = step(s, { type: 'noticeRaised', reason: `RS-${i}`, affectedCount: null }).state
    expect(standingOf(noticesOf(s))).toHaveLength(50)
  })
})

describe('SS-5: screen events leave the notices region at the same reference', () => {
  const screenSample: Record<string, unknown> = {
    surfaceName: 'U-30',
    target: 'surface',
    rung: 'surface',
    armKind: 'dependency',
    shapeKind: null,
    glyph: null,
    subject: { selection: { items: [], ordered: false }, groupIds: [] },
    date: '2026-01-05',
    percent: 100,
    end: 'max',
    language: 'en',
    taskUid: 1,
    rememberedActual: null,
  }
  const standingSession = withNotices({
    onScreen: { kind: 'standing', standing: [OLDEST] },
    delivery: { kind: 'delivering' },
  })
  const cases = SCREEN.events.map((ev) => {
    const event: Loose = { type: ev.key }
    for (const c of ev.carries) event[c.name] = c.name in screenSample ? screenSample[c.name] : true
    return [describeEvent(event), event] as const
  })
  it.each(cases)('%s', (_, event) => {
    const result = step(standingSession, event)
    expect(regionsOf(result.state)['notices']).toBe(regionsOf(standingSession)['notices'])
  })
})

describe('SS-5: notice events leave every screen kind at the same reference', () => {
  const screenLeaves = leavesOf(SCREEN)
  const cases = screenLeaves.flatMap((sm) =>
    noticeEvents().map((event) => [`${sm.id} ${sm.key} x ${describeEvent(event)}`, sm, event] as const),
  )
  it.each(cases)('%s', (_, sm, event) => {
    const { axis, path } = axisAndPath(sm.key)
    let value: Loose = { kind: path.at(-1) }
    for (let i = path.length - 2; i >= 0; i -= 1) value = { kind: path[i], child: value }
    const screen = { ...(regionsOf(emptyScreenSession)['screen'] as Loose), [axis]: value }
    const session = { ...regionsOf(emptyScreenSession), screen } as unknown as ScreenSession
    expect(regionsOf(step(session, event).state)['screen']).toBe(screen)
  })
})
