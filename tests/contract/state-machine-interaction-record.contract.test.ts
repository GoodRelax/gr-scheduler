// Contract test: table T-295 interactionRecordingStateMachine (figure F-041) against advanceScreenSession.

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
type RawBranch = { readonly to?: string; readonly guard?: readonly unknown[]; readonly effect?: string }
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
  readonly root: { readonly carries: readonly unknown[]; readonly transitions: Readonly<Record<string, unknown>> }
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

const RECORD = regionNamed('interactionRecord')
const OTHER_REGIONS = REGIONS.map((r) => r.region).filter((name) => name !== RECORD.region)
const MACHINE = RECORD.machines[0] as RawMachine
const FIELD = MACHINE.name.replace(/Machine$/, '')
const TOGGLE = { type: 'interactionRecordToggled' }
const RECORD_EFFECTS = ['beginInteractionRecord', 'handInteractionRecordToClipboard']

function regionsOf(session: ScreenSession): Loose {
  return session as unknown as Loose
}

function recordOf(session: ScreenSession): Loose {
  return regionsOf(session)[RECORD.region] as Loose
}

function recordingOf(session: ScreenSession): Loose {
  return recordOf(session)[FIELD] as Loose
}

function step(session: ScreenSession, event: Loose): ReturnType<typeof advanceScreenSession> {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

function effectTypes(result: ReturnType<typeof advanceScreenSession>): string[] {
  return result.effects.map((e) => String((e as unknown as Loose)['type']))
}

function withRecording(kind: string, base: ScreenSession = emptyScreenSession): ScreenSession {
  return { ...regionsOf(base), [RECORD.region]: { ...recordOf(base), [FIELD]: { kind } } } as unknown as ScreenSession
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

// WHY: S-206 says Esc does not stop the record, so every rung of both Esc events is crossed.
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
  ]
  return moves.reduce<ScreenSession>((s, e) => step(s, e).state, emptyScreenSession)
}

const BASES: readonly (readonly [string, ScreenSession])[] = [
  ['empty', emptyScreenSession],
  ['busy', busySession()],
]

describe('T-295 manuscript: interactionRecordingStateMachine holds two flat states and one event', () => {
  it('states notRecording (initial) and recordingInteractions, flat, carrying no values', () => {
    expect(RECORD.machines.map((m) => m.name)).toEqual(['interactionRecordingStateMachine'])
    expect(MACHINE.states.map((s) => [s.key, s.initial, s.parent, s.carries.length])).toEqual([
      ['notRecording', true, null, 0],
      ['recordingInteractions', false, null, 0],
    ])
  })

  it('the one event carries nothing, and only it has cells', () => {
    expect(RECORD.events.map((e) => [e.key, e.carries.length])).toEqual([['interactionRecordToggled', 0]])
    expect(Object.keys(MACHINE.transitions)).toEqual(['interactionRecordToggled'])
    expect(MACHINE.transitions['interactionRecordToggled']).toMatchObject({
      notRecording: { to: 'recordingInteractions', effect: 'beginInteractionRecord' },
      recordingInteractions: { to: 'notRecording', effect: 'handInteractionRecordToClipboard' },
    })
  })

  it('the root carries no values and has no cells', () => {
    expect(RECORD.root.carries).toEqual([])
    expect(RECORD.root.transitions).toEqual({})
  })
})

describe('SS-6 (T-295): the root\'s empty session holds notRecording and nothing else', () => {
  it('emptyScreenSession.interactionRecord is { interactionRecordingState: { kind: notRecording } }', () => {
    expect(recordOf(emptyScreenSession)).toEqual({ [FIELD]: { kind: MACHINE.states.find((s) => s.initial)?.key } })
  })
})

describe('SD-3 (T-295): the two cells of interactionRecordToggled', () => {
  const cases = BASES.flatMap(([name, base]) =>
    MACHINE.states.map((s) => [`${name} & ${s.key} x interactionRecordToggled`, s.key, base] as const),
  )

  it.each(cases)('%s', (_, kind, base) => {
    const cell = MACHINE.transitions['interactionRecordToggled']?.[kind]
    const session = withRecording(kind, base)
    const result = step(session, TOGGLE)
    expect(recordOf(result.state), 'the region carries no values').toEqual({ [FIELD]: { kind: cell?.to } })
    expect(effectTypes(result)).toEqual([cell?.effect])
    for (const other of OTHER_REGIONS) {
      expect(regionsOf(result.state)[other], `SS-5: leaves ${other} at the same reference`).toBe(regionsOf(session)[other])
    }
  })
})

describe('SF-3 / NFR-010 (T-295): every event of every other region leaves interactionRecordingState at the same reference', () => {
  const cases = BASES.flatMap(([name, base]) =>
    MACHINE.states.flatMap((s) => otherEvents().map(([label, event]) => [`${name} & ${s.key} x ${label}`, s.key, base, event] as const)),
  )

  it.each(cases)('%s', (_, kind, base, event) => {
    const session = withRecording(kind, base)
    const result = step(session, event)
    expect(recordOf(result.state), 'the whole region is the same reference').toBe(recordOf(session))
    expect(recordingOf(result.state)).toBe(recordingOf(session))
    for (const name of effectTypes(result)) expect(RECORD_EFFECTS, `${name} is not a T-295 effect of this cell`).not.toContain(name)
  })
})

describe('orthogonality: no other region reads interactionRecordingState', () => {
  const cases = BASES.flatMap(([name, base]) => otherEvents().map(([label, event]) => [`${name} x ${label}`, base, event] as const))

  it.each(cases)('%s gives the same other regions and effects whether recording or not', (_, base, event) => {
    const quiet = step(withRecording('notRecording', base), event)
    const busy = step(withRecording('recordingInteractions', base), event)
    for (const other of OTHER_REGIONS) {
      expect(regionsOf(busy.state)[other], other).toEqual(regionsOf(quiet.state)[other])
    }
    expect(busy.effects).toEqual(quiet.effects)
  })
})

describe('S-206 / IC-76: Esc does not stop the record; only the one entrance does', () => {
  it('every Esc rung keeps recordingInteractions', () => {
    const recording = withRecording('recordingInteractions', busySession())
    for (const rung of RUNGS) {
      expect(recordingOf(step(recording, { type: 'escapePressed', rung }).state), rung).toBe(recordingOf(recording))
      expect(recordingOf(step(recording, { type: 'selectionEscapePressed', rung }).state), rung).toBe(recordingOf(recording))
    }
  })
})

describe('FR-102: one toggle begins and stops the record', () => {
  const run = (count: number): [string, string[]][] => {
    let session = emptyScreenSession
    return Array.from({ length: count }, () => {
      const result = step(session, TOGGLE)
      session = result.state
      return [String(recordingOf(session)['kind']), effectTypes(result)]
    })
  }

  it('とき、`GRS` は、**人の操作と画面の描画の記録**を始めること（MUST）', () => {
    expect(run(1)).toEqual([['recordingInteractions', ['beginInteractionRecord']]])
  })

  it('面の描画の記録**を始めること（MUST）。**同じ入口で止めること（MUST）', () => {
    expect(run(4).map(([kind]) => kind)).toEqual(['recordingInteractions', 'notRecording', 'recordingInteractions', 'notRecording'])
  })

  it('IC-76` とし、**いま記録しているかどうかが画面上で読めること（MUST）', () => {
    const kinds = new Set(run(2).map(([kind]) => kind))
    expect(kinds).toEqual(new Set(MACHINE.states.map((s) => s.key)))
    expect(recordingOf(emptyScreenSession)).toEqual({ kind: 'notRecording' })
  })

  it('もりで記録が続く。**止めたとき、その記録をクリップボードへ渡すこと（MUST）', () => {
    expect(run(2)[1]).toEqual(['notRecording', ['handInteractionRecordToClipboard']])
  })

  it('出ていたかが読めない。⛔ **記録を文書に保存してはならない（MUST NOT）', () => {
    const session = withRecording('notRecording', busySession())
    const once = step(session, TOGGLE)
    const twice = step(once.state, TOGGLE)
    expect(regionsOf(once.state)['fileFlow']).toBe(regionsOf(session)['fileFlow'])
    expect(regionsOf(twice.state)['fileFlow']).toBe(regionsOf(session)['fileFlow'])
  })
})
