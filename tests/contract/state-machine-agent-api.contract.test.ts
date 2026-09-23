// Contract test: table T-296 agentApiEnablingStateMachine (figure F-042) against advanceScreenSession.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'

type Loose = Record<string, unknown>
type RawBranch = {
  readonly to?: string
  readonly guard?: readonly { readonly name: string }[]
  readonly effect?: string
  readonly effectArgument?: string
}
type RawState = { readonly key: string; readonly initial: boolean; readonly parent: string | null; readonly carries: readonly unknown[] }
type RawMachine = {
  readonly name: string
  readonly states: readonly RawState[]
  readonly transitions: Readonly<Record<string, Readonly<Record<string, RawBranch>>>>
}
type RawEvent = { readonly key: string; readonly carries: readonly { readonly name: string }[] }
type RawRegion = {
  readonly region: string
  readonly events: readonly RawEvent[]
  readonly machines: readonly RawMachine[]
  readonly root: { readonly carries: readonly unknown[]; readonly transitions: Readonly<Record<string, RawBranch>> }
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

const AGENT = regionNamed('agentApi')
const OTHER_REGIONS = REGIONS.map((r) => r.region).filter((name) => name !== AGENT.region)
const MACHINE = AGENT.machines[0] as RawMachine
const FIELD = MACHINE.name.replace(/Machine$/, '')
const PRESS = { type: 'agentApiEntryPressed' }
const loaded = (isRememberedEnabled: boolean): Loose => ({ type: 'rememberedEnablingLoaded', isRememberedEnabled })
const AGENT_EFFECTS = ['storeAgentApiEnabling']
const STORE = { type: 'storeAgentApiEnabling' }
const NOTICE_RS20 = { type: 'raiseNotice', reason: 'RS-20' }

function regionsOf(session: ScreenSession): Loose {
  return session as unknown as Loose
}

function agentOf(session: ScreenSession): Loose {
  return regionsOf(session)[AGENT.region] as Loose
}

function enablingOf(session: ScreenSession): Loose {
  return agentOf(session)[FIELD] as Loose
}

function step(session: ScreenSession, event: Loose): ReturnType<typeof advanceScreenSession> {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

function effectsOf(result: ReturnType<typeof advanceScreenSession>): Loose[] {
  return result.effects.map((e) => e as unknown as Loose)
}

function effectTypes(result: ReturnType<typeof advanceScreenSession>): string[] {
  return effectsOf(result).map((e) => String(e['type']))
}

const byType = (a: Loose, b: Loose): number => String(a['type']).localeCompare(String(b['type']))

function withEnabling(kind: string, base: ScreenSession = emptyScreenSession): ScreenSession {
  return { ...regionsOf(base), [AGENT.region]: { ...agentOf(base), [FIELD]: { kind } } } as unknown as ScreenSession
}

const RUNGS = ['notice', 'textEntry', 'confirmation', 'surface', 'gesture', 'propertiesPanel', 'armed', 'selection', 'dualCursorMode', 'tooltip']
const PICKED = { items: [{ kind: 'task', uid: 3 }], ordered: false }

const SAMPLE: Record<string, unknown> = {
  surfaceName: 'U-56',
  target: 'surface',
  rung: 'surface',
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
  pickedObjects: PICKED,
  remainingObjects: PICKED,
  createdTaskUid: 3,
  chosenRows: ['group1'],
  createdGroupId: 'group1',
  chosenResources: [1],
  copiedForPaste: { kind: 'task', uids: [3] },
}

function sampleOf(ev: RawEvent): Loose {
  const event: Loose = { type: ev.key }
  for (const c of ev.carries) event[c.name] = c.name in SAMPLE ? SAMPLE[c.name] : true
  return event
}

function otherEvents(): (readonly [string, Loose])[] {
  return OTHER_REGIONS.flatMap((name) =>
    regionNamed(name).events.flatMap((ev) => {
      if (ev.key === 'escapePressed' || ev.key === 'selectionEscapePressed') {
        return RUNGS.map((rung) => [`${name}/${ev.key}(rung=${rung})`, { ...sampleOf(ev), rung }] as const)
      }
      return [[`${name}/${ev.key}`, sampleOf(ev)] as const]
    }),
  )
}

function busySession(): ScreenSession {
  const moves: Loose[] = [
    { type: 'paletteToggled' },
    { type: 'documentEditLanded' },
    { type: 'objectsPicked', pickedObjects: PICKED },
    { type: 'rowsPicked', chosenRows: ['group1'] },
    { type: 'interactionRecordToggled' },
  ]
  return moves.reduce<ScreenSession>((s, e) => step(s, e).state, emptyScreenSession)
}

const BASES: readonly (readonly [string, ScreenSession])[] = [
  ['empty', emptyScreenSession],
  ['busy', busySession()],
]

const OWN_EVENTS: readonly (readonly [string, Loose])[] = [
  ['agentApiEntryPressed', PRESS],
  ['rememberedEnablingLoaded(true)', loaded(true)],
  ['rememberedEnablingLoaded(false)', loaded(false)],
]

describe('T-296 manuscript: agentApiEnablingStateMachine holds two flat states and two events', () => {
  it('states disabled (initial) and enabled, flat, carrying no values', () => {
    expect(AGENT.machines.map((m) => m.name)).toEqual(['agentApiEnablingStateMachine'])
    expect(MACHINE.states.map((s) => [s.key, s.initial, s.parent, s.carries.length])).toEqual([
      ['disabled', true, null, 0],
      ['enabled', false, null, 0],
    ])
  })

  it('agentApiEntryPressed carries nothing; rememberedEnablingLoaded carries isRememberedEnabled', () => {
    expect(AGENT.events.map((e) => [e.key, e.carries.map((c) => c.name)])).toEqual([
      ['agentApiEntryPressed', []],
      ['rememberedEnablingLoaded', ['isRememberedEnabled']],
    ])
  })

  it('the cells are exactly those of T-296', () => {
    expect(MACHINE.transitions['agentApiEntryPressed']).toMatchObject({
      disabled: { to: 'enabled' },
      enabled: { to: 'disabled', effect: 'raiseNotice', effectArgument: 'RS-20' },
    })
    expect(MACHINE.transitions['agentApiEntryPressed']?.['disabled']?.effect).toBeUndefined()
    expect(Object.keys(MACHINE.transitions['rememberedEnablingLoaded'] ?? {})).toEqual(['disabled'])
    expect(MACHINE.transitions['rememberedEnablingLoaded']?.['disabled']).toMatchObject({
      to: 'enabled',
      guard: [{ name: 'isRememberedEnabled' }],
    })
  })

  it('the root carries no values and has one cell: storeAgentApiEnabling on agentApiEntryPressed', () => {
    expect(AGENT.root.carries).toEqual([])
    expect(Object.keys(AGENT.root.transitions)).toEqual(['agentApiEntryPressed'])
    expect(AGENT.root.transitions['agentApiEntryPressed']?.effect).toBe('storeAgentApiEnabling')
  })
})

describe('SS-6 (T-296): the root\'s empty session holds disabled and nothing else', () => {
  it('emptyScreenSession.agentApi is { agentApiEnablingState: { kind: disabled } }', () => {
    expect(agentOf(emptyScreenSession)).toEqual({ [FIELD]: { kind: MACHINE.states.find((s) => s.initial)?.key } })
  })
})

describe('SD-3 (T-296): every cell of the table', () => {
  describe.each(BASES)('%s base', (_, base) => {
    it('disabled x agentApiEntryPressed -> enabled / storeAgentApiEnabling (root cell only)', () => {
      const result = step(withEnabling('disabled', base), PRESS)
      expect(agentOf(result.state)).toEqual({ [FIELD]: { kind: 'enabled' } })
      expect(effectsOf(result)).toEqual([STORE])
    })

    it('enabled x agentApiEntryPressed -> disabled / raiseNotice(RS-20) and the root cell storeAgentApiEnabling', () => {
      const result = step(withEnabling('enabled', base), PRESS)
      expect(agentOf(result.state)).toEqual({ [FIELD]: { kind: 'disabled' } })
      expect(effectsOf(result).sort(byType)).toEqual([NOTICE_RS20, STORE].sort(byType))
    })

    it('disabled x rememberedEnablingLoaded [isRememberedEnabled] -> enabled, no effect', () => {
      const result = step(withEnabling('disabled', base), loaded(true))
      expect(agentOf(result.state)).toEqual({ [FIELD]: { kind: 'enabled' } })
      expect(result.effects).toEqual([])
    })

    it.each([
      ['disabled x rememberedEnablingLoaded (not isRememberedEnabled): それ以外 -> —', 'disabled', false],
      ['enabled x rememberedEnablingLoaded(true): —', 'enabled', true],
      ['enabled x rememberedEnablingLoaded(false): —', 'enabled', false],
    ] as const)('%s returns the same session reference and no effect (SF-3 / NFR-010)', (_, kind, remembered) => {
      const session = withEnabling(kind, base)
      const result = step(session, loaded(remembered))
      expect(result.state).toBe(session)
      expect(result.effects).toEqual([])
      expect(step(session, loaded(remembered)).effects).toBe(result.effects)
    })
  })
})

describe('T-296 root cell: storeAgentApiEnabling fires on every press, from either state', () => {
  it('four presses from empty alternate the state and each emits storeAgentApiEnabling once', () => {
    let session = emptyScreenSession
    const trail = Array.from({ length: 4 }, () => {
      const result = step(session, PRESS)
      session = result.state
      return [String(enablingOf(session)['kind']), effectTypes(result).filter((t) => t === 'storeAgentApiEnabling').length]
    })
    expect(trail).toEqual([
      ['enabled', 1],
      ['disabled', 1],
      ['enabled', 1],
      ['disabled', 1],
    ])
  })

  it('rememberedEnablingLoaded never emits storeAgentApiEnabling', () => {
    for (const kind of ['disabled', 'enabled']) {
      for (const remembered of [true, false]) {
        expect(effectTypes(step(withEnabling(kind), loaded(remembered)))).not.toContain('storeAgentApiEnabling')
      }
    }
  })
})

describe('RS-20: raiseNotice with reason RS-20 only on enabled -> disabled', () => {
  it.each(MACHINE.states.flatMap((s) => OWN_EVENTS.map(([label, event]) => [`${s.key} x ${label}`, s.key, event] as const)))(
    '%s',
    (_, kind, event) => {
      const notices = effectsOf(step(withEnabling(kind), event)).filter((e) => e['type'] === 'raiseNotice')
      const expected = kind === 'enabled' && event['type'] === 'agentApiEntryPressed' ? [NOTICE_RS20] : []
      expect(notices).toEqual(expected)
    },
  )
})

describe('SS-5: this region\'s events never change another region', () => {
  const cases = BASES.flatMap(([name, base]) =>
    MACHINE.states.flatMap((s) => OWN_EVENTS.map(([label, event]) => [`${name} & ${s.key} x ${label}`, s.key, base, event] as const)),
  )

  it.each(cases)('%s', (_, kind, base, event) => {
    const session = withEnabling(kind, base)
    const result = step(session, event)
    for (const other of OTHER_REGIONS) {
      expect(regionsOf(result.state)[other], `leaves ${other} at the same reference`).toBe(regionsOf(session)[other])
    }
  })
})

describe('SF-3 / NFR-010 (T-296): every event of every other region leaves agentApi at the same reference', () => {
  const cases = BASES.flatMap(([name, base]) =>
    MACHINE.states.flatMap((s) => otherEvents().map(([label, event]) => [`${name} & ${s.key} x ${label}`, s.key, base, event] as const)),
  )

  it.each(cases)('%s', (_, kind, base, event) => {
    const session = withEnabling(kind, base)
    const result = step(session, event)
    expect(agentOf(result.state), 'the whole region is the same reference').toBe(agentOf(session))
    expect(enablingOf(result.state)).toBe(enablingOf(session))
    for (const name of effectTypes(result)) expect(AGENT_EFFECTS, `${name} is not a T-296 effect of this cell`).not.toContain(name)
  })
})

describe('orthogonality: no other region reads agentApiEnablingState', () => {
  const cases = BASES.flatMap(([name, base]) => otherEvents().map(([label, event]) => [`${name} x ${label}`, base, event] as const))

  it.each(cases)('%s gives the same other regions and effects whether enabled or not', (_, base, event) => {
    const off = step(withEnabling('disabled', base), event)
    const on = step(withEnabling('enabled', base), event)
    for (const other of OTHER_REGIONS) {
      expect(regionsOf(on.state)[other], other).toEqual(regionsOf(off.state)[other])
    }
    expect(on.effects).toEqual(off.effects)
  })
})

describe('FR-065: one entrance enables and disables, remembered per browser', () => {
  it('人が `Agent API` を画面上で有効にできるようにし、**有効であるあいだ、そのことを画面上に示すこと（MUST）', () => {
    const once = step(emptyScreenSession, PRESS).state
    expect(enablingOf(emptyScreenSession)).toEqual({ kind: 'disabled' })
    expect(enablingOf(once)).toEqual({ kind: 'enabled' })
    expect(enablingOf(step(once, loaded(false)).state)).toEqual({ kind: 'enabled' })
  })

  it('**有効化はブラウザ（オリジン）ごとに記憶すること（MUST）', () => {
    const on = step(emptyScreenSession, PRESS)
    const off = step(on.state, PRESS)
    expect(effectTypes(on)).toContain('storeAgentApiEnabling')
    expect(effectTypes(off)).toContain('storeAgentApiEnabling')
    expect(enablingOf(step(emptyScreenSession, loaded(true)).state)).toEqual({ kind: 'enabled' })
    expect(step(emptyScreenSession, loaded(false)).state).toBe(emptyScreenSession)
  })

  it('⛔ **有効化を文書ごとに記憶する形にしてはならない（MUST NOT）', () => {
    const enabled = withEnabling('enabled', busySession())
    for (const [label, event] of otherEvents().filter(([l]) => l.startsWith('fileFlow/'))) {
      expect(agentOf(step(enabled, event).state), label).toBe(agentOf(enabled))
    }
    expect(AGENT.root.carries).toEqual([])
    expect(effectsOf(step(emptyScreenSession, PRESS))).toEqual([STORE])
  })

  it('無効にしても、既に渡した参照は取り消せないことを利用者に示すこと（MUST）', () => {
    const on = step(emptyScreenSession, PRESS).state
    expect(effectsOf(step(on, PRESS))).toContainEqual(NOTICE_RS20)
    expect(effectsOf(step(emptyScreenSession, PRESS))).not.toContainEqual(NOTICE_RS20)
  })
})

describe('FR-066: the enabling is its own value', () => {
  it('⛔ `Agent API` の有効・無効（`FR-065`）と 1 つの値で兼ねてはならない（MUST NOT）', () => {
    expect(Object.keys(agentOf(emptyScreenSession))).toEqual([FIELD])
    const session = busySession()
    const pressed = step(session, PRESS).state
    for (const other of OTHER_REGIONS) expect(regionsOf(pressed)[other], other).toBe(regionsOf(session)[other])
  })
})
