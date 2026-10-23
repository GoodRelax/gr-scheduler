// CR-767 wave 2 spec-only cases: composites armed / grabbed (JDG-2364), the panel's Esc rung (RG-14, DFC-2720), guard-name unions (RA-2).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { escapeTarget, type EscapeContext } from '../../src/entity/document-model/screen-state/screen-state'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { unbroken } from './spec-table'

type Loose = Record<string, unknown>
type RawGuard = { readonly name: string; readonly not?: boolean } | { readonly in: string }
type RawBranch = { readonly to: string; readonly guard?: readonly RawGuard[]; readonly effect?: string }
type RawCell = RawBranch | readonly RawBranch[]
type RawState = { readonly key: string; readonly parent: string | null; readonly initial: boolean; readonly carries: readonly { readonly name: string }[] }
type RawMachine = {
  readonly name: string
  readonly states: readonly RawState[]
  readonly transitions: Readonly<Record<string, Readonly<Record<string, RawCell>>>>
}
type RawRegion = {
  readonly region: string
  readonly unit: string
  readonly typeStem: string
  readonly guards?: readonly { readonly name: string; readonly condition: string }[]
  readonly machines: readonly RawMachine[]
}
type Rung = { readonly id: string; readonly states: readonly Loose[]; readonly note?: { readonly ja: string } }

const SPEC = join(process.cwd(), 'docs', 'spec')
const MANUSCRIPT = JSON.parse(readFileSync(join(SPEC, '_source', 'state-machines.json'), 'utf8')) as {
  readonly priorities: { readonly rungs: readonly Rung[] }
  readonly regions: readonly RawRegion[]
}
const SCHEMA = readFileSync(join(SPEC, '_source', 'state-machines.schema.json'), 'utf8')
const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))

function regionNamed(name: string): RawRegion {
  const region = MANUSCRIPT.regions.find((r) => r.region === name)
  if (region === undefined) throw new Error(`state-machines.json has no region "${name}"`)
  return region
}

function machineNamed(region: string, name: string): RawMachine {
  const machine = regionNamed(region).machines.find((m) => m.name === name)
  if (machine === undefined) throw new Error(`region ${region} has no machine ${name}`)
  return machine
}

function branchesOf(cell: RawCell | undefined): readonly RawBranch[] {
  if (cell === undefined) return []
  return Array.isArray(cell) ? (cell as readonly RawBranch[]) : [cell as RawBranch]
}

const ARM = machineNamed('screen', 'armModeStateMachine')
const GRAB = machineNamed('gesture', 'taskGroupGrabStateMachine')
const PANEL = machineNamed('screen', 'propertiesPanelContentStateMachine')
const SURFACE = machineNamed('screen', 'openSurfaceStateMachine')

const ARM_CHILDREN = ARM.states.filter((s) => s.parent === 'armed').map((s) => s.key.replace(/^armed\./, ''))

// see T-280, FR-016
const SHAPE_KIND = 'SH-1'
const OTHER_SHAPE_KIND = 'SH-2'
const GLYPH = 'SH-5'

function armEvent(armKind: string, shapeKind: string = SHAPE_KIND): Loose {
  return {
    type: 'armEntryPressed',
    armKind,
    shapeKind: armKind === 'taskShapeArmed' ? shapeKind : null,
    glyph: armKind === 'milestoneShapeArmed' ? GLYPH : null,
  }
}

function armedChild(armKind: string, shapeKind: string = SHAPE_KIND): Loose {
  if (armKind === 'taskShapeArmed') return { kind: armKind, shapeKind }
  if (armKind === 'milestoneShapeArmed') return { kind: armKind, glyph: GLYPH }
  return { kind: armKind }
}

function screenOf(session: ScreenSession): Loose {
  return (session as unknown as { screen: Loose }).screen
}

function gestureOf(session: ScreenSession): Loose {
  return (session as unknown as { gesture: Loose }).gesture
}

function withScreen(axes: Loose): ScreenSession {
  return { ...emptyScreenSession, screen: { ...emptyScreenSession.screen, ...axes } } as unknown as ScreenSession
}

function withGrab(state: Loose): ScreenSession {
  return { ...emptyScreenSession, gesture: { ...emptyScreenSession.gesture, taskGroupGrabState: state } } as unknown as ScreenSession
}

function step(session: ScreenSession, event: Loose): ReturnType<typeof advanceScreenSession> {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

function armedSession(armKind: string): ScreenSession {
  return withScreen({ armModeState: { kind: 'armed', child: armedChild(armKind) } })
}

describe('JDG-2364 (T-280): armModeStateMachine holds the six arms under the composite armed', () => {
  it('the manuscript states: "A composite every transition enters by naming a child (armModeStateMachine.armed) has no initial child."', () => {
    const comment = JSON.stringify((MANUSCRIPT as unknown as { $comment: unknown }).$comment)
    expect(comment).toContain('A composite every transition enters by naming a child (armModeStateMachine.armed) has no initial child.')
    expect(ARM.states.find((s) => s.key === 'armed')).toMatchObject({ parent: null, initial: false, carries: [] })
    expect(ARM.states.filter((s) => s.parent === 'armed' && s.initial)).toEqual([])
  })

  it('armed holds taskShapeArmed, milestoneShapeArmed, dependencyArmed, commentBoxArmed, highlightBoxArmed and parentTaskArmed', () => {
    expect(ARM_CHILDREN).toEqual([
      'taskShapeArmed',
      'milestoneShapeArmed',
      'dependencyArmed',
      'commentBoxArmed',
      'highlightBoxArmed',
      'parentTaskArmed',
    ])
    expect(ARM.states.find((s) => s.key === 'armed.taskShapeArmed')?.carries.map((c) => c.name)).toEqual(['shapeKind'])
    expect(ARM.states.find((s) => s.key === 'armed.milestoneShapeArmed')?.carries.map((c) => c.name)).toEqual(['glyph'])
  })

  it('"A cell on a composite state answers for every state below it": escapePressed, armEntryPressed and dualCursorEntryPressed stand once on armed', () => {
    expect(Object.keys(ARM.transitions['escapePressed'] ?? {})).toEqual(['armed'])
    expect(Object.keys(ARM.transitions['dualCursorEntryPressed'] ?? {})).toEqual(['armed'])
    expect(Object.keys(ARM.transitions['armEntryPressed'] ?? {})).toEqual(['notArmed', 'armed'])
    for (const row of Object.values(ARM.transitions)) {
      for (const key of Object.keys(row)) expect(key.startsWith('armed.'), `a cell on the child ${key}`).toBe(false)
    }
  })

  it('the schema: "parent.{name}, standing for any kind of that composite state but its initial one"', () => {
    expect(SCHEMA).toContain('parent.{name}, standing for any kind of that composite state but its initial one')
    expect(branchesOf(ARM.transitions['armEntryPressed']?.['notArmed']).map((b) => b.to)).toEqual(['armed.{armKind}'])
  })
})

describe('JDG-2364, FR-016, IN-4 (T-280): every armed child answers the one cell on armed', () => {
  it.each(ARM_CHILDREN)('armed.%s x escapePressed [isRungArmed] -> notArmed', (armKind) => {
    const after = screenOf(step(armedSession(armKind), { type: 'escapePressed', rung: 'armed' }).state)
    expect(after['armModeState']).toEqual({ kind: 'notArmed' })
  })

  it.each(ARM_CHILDREN)('armed.%s x escapePressed with another rung (not isRungArmed) keeps the arm', (armKind) => {
    const session = armedSession(armKind)
    for (const rung of ['surface', 'propertiesPanel', 'selection']) {
      expect(screenOf(step(session, { type: 'escapePressed', rung }).state)['armModeState'], rung).toBe(
        screenOf(session)['armModeState'],
      )
    }
  })

  it.each(ARM_CHILDREN)(
    'armed.%s x dualCursorEntryPressed [in dualCursorModeStateMachine.off & hasDaysToPlace] -> notArmed',
    (armKind) => {
      const event = { type: 'dualCursorEntryPressed', date: '2026-01-05', hasDaysToPlace: true }
      expect(screenOf(step(armedSession(armKind), event).state)['armModeState']).toEqual({ kind: 'notArmed' })
    },
  )

  it.each(ARM_CHILDREN)('armed.%s x dualCursorEntryPressed without hasDaysToPlace keeps the arm', (armKind) => {
    const session = armedSession(armKind)
    const event = { type: 'dualCursorEntryPressed', date: '2026-01-05', hasDaysToPlace: false }
    expect(screenOf(step(session, event).state)['armModeState']).toBe(screenOf(session)['armModeState'])
  })

  it.each(ARM_CHILDREN)('armed.%s x dualCursorEntryPressed while dualCursorModeStateMachine.on keeps the arm', (armKind) => {
    const session = withScreen({
      armModeState: { kind: 'armed', child: armedChild(armKind) },
      dualCursorModeState: { kind: 'on', child: { kind: 'placingCursorA' } },
    })
    const event = { type: 'dualCursorEntryPressed', date: '2026-01-05', hasDaysToPlace: true }
    expect(screenOf(step(session, event).state)['armModeState']).toBe(screenOf(session)['armModeState'])
  })
})

describe('FR-016, SP-4 (T-280): armEntryPressed enters armed with the child the event names', () => {
  it.each(ARM_CHILDREN)('notArmed x armEntryPressed(%s) -> armed.{armKind}, the carried value on the child', (armKind) => {
    const after = screenOf(step(emptyScreenSession, armEvent(armKind)).state)
    expect(after['armModeState']).toEqual({ kind: 'armed', child: armedChild(armKind) })
  })

  it.each(ARM_CHILDREN)('armed.%s x armEntryPressed of the same arm [isSameArm] -> notArmed', (armKind) => {
    expect(screenOf(step(armedSession(armKind), armEvent(armKind)).state)['armModeState']).toEqual({ kind: 'notArmed' })
  })

  const pairs = ARM_CHILDREN.flatMap((from) => ARM_CHILDREN.filter((to) => to !== from).map((to) => [from, to] as const))
  it.each(pairs)('armed.%s x armEntryPressed(%s) [not isSameArm] -> armed with the new child', (from, to) => {
    expect(screenOf(step(armedSession(from), armEvent(to)).state)['armModeState']).toEqual({
      kind: 'armed',
      child: armedChild(to),
    })
  })

  it('armed.taskShapeArmed(SH-1) x armEntryPressed(taskShapeArmed, SH-2) [not isSameArm] -> armed.taskShapeArmed carrying SH-2', () => {
    const after = screenOf(step(armedSession('taskShapeArmed'), armEvent('taskShapeArmed', OTHER_SHAPE_KIND)).state)
    expect(after['armModeState']).toEqual({ kind: 'armed', child: armedChild('taskShapeArmed', OTHER_SHAPE_KIND) })
  })
})

describe('T-283 RG-5: the arm rung names its states as the composite', () => {
  it("RG-5 states are [{in: 'armModeStateMachine.armed'}]", () => {
    expect(MANUSCRIPT.priorities.rungs.find((r) => r.id === 'RG-5')?.states).toEqual([{ in: 'armModeStateMachine.armed' }])
  })
})

describe('JDG-2364, HF-15 (T-289): taskGroupGrabStateMachine holds grabPressed and carrying under the composite grabbed', () => {
  it('grabbed is a top-level state whose initial child is grabbed.grabPressed', () => {
    expect(GRAB.states.map((s) => [s.key, s.parent, s.initial])).toEqual([
      ['notGrabbed', null, true],
      ['grabbed', null, false],
      ['grabbed.grabPressed', 'grabbed', true],
      ['grabbed.carrying', 'grabbed', false],
    ])
  })

  it('pointerPressed on notGrabbed leads to grabbed; pointerReleased and pressInterrupted are one cell on grabbed; the travel is on grabbed.grabPressed', () => {
    expect(branchesOf(GRAB.transitions['pointerPressed']?.['notGrabbed']).map((b) => b.to)).toEqual(['grabbed'])
    expect(Object.keys(GRAB.transitions['pointerReleased'] ?? {})).toEqual(['grabbed'])
    expect(Object.keys(GRAB.transitions['pressInterrupted'] ?? {})).toEqual(['grabbed'])
    expect(GRAB.transitions['taskGroupGrabTravelPassed']).toEqual({
      'grabbed.grabPressed': expect.objectContaining({ to: 'grabbed.carrying' }),
    })
  })
})

describe('HF-15, IN-1 (T-289): the grab against advanceScreenSession', () => {
  const PRESS = { type: 'pointerPressed', pressRow: 'PTD-3', pressedOn: { kind: 'taskGroupGrabStrip', taskGroupId: 'g1' } }
  const grabOf = (session: ScreenSession): unknown => gestureOf(session)['taskGroupGrabState']
  const PRESSED = { kind: 'grabbed', child: { kind: 'grabPressed' } }
  const CARRYING = { kind: 'grabbed', child: { kind: 'carrying' } }

  it('notGrabbed x pointerPressed [isTaskGroupGrabStrip] -> grabbed, entering its initial child grabPressed', () => {
    expect(grabOf(step(emptyScreenSession, PRESS).state)).toEqual(PRESSED)
  })

  it('grabbed.grabPressed x taskGroupGrabTravelPassed -> grabbed.carrying', () => {
    expect(grabOf(step(withGrab(PRESSED), { type: 'taskGroupGrabTravelPassed' }).state)).toEqual(CARRYING)
  })

  it('grabbed.carrying x taskGroupGrabTravelPassed: no cell, the grab kept', () => {
    const session = withGrab(CARRYING)
    expect(grabOf(step(session, { type: 'taskGroupGrabTravelPassed' }).state)).toBe(grabOf(session))
  })

  it.each([
    ['grabbed.grabPressed', 'pointerReleased', PRESSED],
    ['grabbed.carrying', 'pointerReleased', CARRYING],
    ['grabbed.grabPressed', 'pressInterrupted', PRESSED],
    ['grabbed.carrying', 'pressInterrupted', CARRYING],
  ] as const)('%s x %s -> notGrabbed (the one cell on grabbed)', (_, type, state) => {
    expect(grabOf(step(withGrab(state), { type }).state)).toEqual({ kind: 'notGrabbed' })
  })
})

const RG_14 = MANUSCRIPT.priorities.rungs.find((r) => r.id === 'RG-14')
const SCREEN_GUARDS = regionNamed('screen').guards ?? []

describe('T-283 RG-14, DFC-2720: the properties panel has its own escapePressed rung word propertiesPanel', () => {
  it('RG-14 note: "`escapePressed` の `rung` の語は `propertiesPanel`"', () => {
    expect(RG_14?.note?.ja ?? '').toContain('`escapePressed` の `rung` の語は `propertiesPanel`')
    expect(RG_14?.states).toEqual([{ machine: 'propertiesPanelContentStateMachine', except: 'hidden' }])
  })

  it("isRungPropertiesPanel is defined in the screen region as event.rung == 'propertiesPanel'", () => {
    expect(SCREEN_GUARDS.find((g) => g.name === 'isRungPropertiesPanel')?.condition).toBe("event.rung == 'propertiesPanel'")
  })

  it('the two propertiesPanelContentStateMachine escape cells are guarded by isRungPropertiesPanel alone', () => {
    const row = PANEL.transitions['escapePressed'] ?? {}
    expect(Object.keys(row).sort()).toEqual(['documentSettingsDisplayed', 'selectionDisplayed'])
    for (const [from, cell] of Object.entries(row)) {
      expect(branchesOf(cell).map((b) => [b.to, b.guard]), from).toEqual([['hidden', [{ name: 'isRungPropertiesPanel' }]]])
    }
  })

  it('isRungSurface stays on openSurfaceStateMachine.open only', () => {
    const named: string[] = []
    for (const machine of regionNamed('screen').machines) {
      for (const [event, row] of Object.entries(machine.transitions)) {
        for (const [from, cell] of Object.entries(row)) {
          for (const branch of branchesOf(cell)) {
            if ((branch.guard ?? []).some((g) => 'name' in g && g.name === 'isRungSurface')) named.push(`${machine.name}.${from} x ${event}`)
          }
        }
      }
    }
    expect(named).toEqual(['openSurfaceStateMachine.open x escapePressed'])
    expect(branchesOf(SURFACE.transitions['escapePressed']?.['open']).map((b) => b.to)).toEqual(['closed'])
  })
})

describe('T-283 RG-14, DFC-2720 (T-280): escapePressed against advanceScreenSession', () => {
  const SUBJECT = { selection: { items: [{ kind: 'task', uid: 1 }], isOrdered: false }, taskGroupIds: [] }
  const PANELS: readonly (readonly [string, Loose])[] = [
    ['selectionDisplayed', { kind: 'selectionDisplayed', subject: SUBJECT }],
    ['documentSettingsDisplayed', { kind: 'documentSettingsDisplayed' }],
  ]
  const OPEN = { kind: 'open', surfaceName: 'U-30' }
  const panelOf = (session: ScreenSession): unknown => screenOf(session)['propertiesPanelContentState']
  const surfaceOf = (session: ScreenSession): unknown => screenOf(session)['openSurfaceState']

  it.each(PANELS)("%s x escapePressed(rung='propertiesPanel') [isRungPropertiesPanel] -> hidden", (_, panel) => {
    const after = step(withScreen({ propertiesPanelContentState: panel }), { type: 'escapePressed', rung: 'propertiesPanel' }).state
    expect(panelOf(after)).toEqual({ kind: 'hidden' })
  })

  it.each(PANELS)("%s & openSurfaceStateMachine.open x escapePressed(rung='propertiesPanel'): the panel hides, the surface stays open", (_, panel) => {
    const session = withScreen({ propertiesPanelContentState: panel, openSurfaceState: OPEN })
    const after = step(session, { type: 'escapePressed', rung: 'propertiesPanel' }).state
    expect(panelOf(after)).toEqual({ kind: 'hidden' })
    expect(surfaceOf(after)).toBe(surfaceOf(session))
  })

  it.each(PANELS)("%s & openSurfaceStateMachine.open x escapePressed(rung='surface') [isRungSurface]: the surface closes, the panel stays", (_, panel) => {
    const session = withScreen({ propertiesPanelContentState: panel, openSurfaceState: OPEN })
    const after = step(session, { type: 'escapePressed', rung: 'surface' }).state
    expect(surfaceOf(after)).toEqual({ kind: 'closed' })
    expect(panelOf(after)).toBe(panelOf(session))
  })

  it.each(PANELS)("%s & openSurfaceStateMachine.closed x escapePressed(rung='surface'): the panel is not hidden", (_, panel) => {
    const session = withScreen({ propertiesPanelContentState: panel })
    expect(panelOf(step(session, { type: 'escapePressed', rung: 'surface' }).state)).toBe(panelOf(session))
  })
})

describe('IN-4, T-283 RG-14 (PI-36): escapeTarget gives propertiesPanel when only the panel stands', () => {
  const NOTHING: EscapeContext = {
    isTextEntryUnsettled: false,
    isSurfaceOpen: false,
    gestureInFlight: false,
    isArmed: false,
    dualCursorMode: false,
  }

  it("only the properties panel open -> 'propertiesPanel'", () => {
    expect(escapeTarget({ ...NOTHING, isPropertiesPanelOpen: true })).toBe('propertiesPanel')
  })

  it("an open surface stands above the panel (RG-3 before RG-14) -> 'surface'", () => {
    expect(escapeTarget({ ...NOTHING, isPropertiesPanelOpen: true, isSurfaceOpen: true })).toBe('surface')
  })

  it("the panel stands above the arm (RG-14 before RG-5) -> 'propertiesPanel'", () => {
    expect(escapeTarget({ ...NOTHING, isPropertiesPanelOpen: true, isArmed: true })).toBe('propertiesPanel')
  })
})

const GENERATED_OPEN = '// <generated -- do not edit by hand>'
const GENERATED_CLOSE = '// </generated>'

function generatedRegionOf(unit: string): string {
  const text = readFileSync(join(process.cwd(), unit), 'utf8').replace(/\r\n/g, '\n')
  const start = text.indexOf(GENERATED_OPEN)
  const end = text.indexOf(GENERATED_CLOSE, start)
  if (start < 0 || end < 0) throw new Error(`${unit} has no generated region`)
  return text.slice(start, end)
}

function guardNameUnion(generated: string, stem: string): string[] | null {
  const head = `export type ${stem}GuardName =\n`
  const at = generated.indexOf(head)
  if (at < 0) return null
  const names: string[] = []
  for (const line of generated.slice(at + head.length).split('\n')) {
    const member = /^\s*\| '([A-Za-z0-9]+)'$/.exec(line)
    if (member === null) break
    names.push(member[1] as string)
  }
  return names
}

describe('5.5, T-285 RA-2: every region\'s guard list is printed as the generated name union <Stem>GuardName', () => {
  it('5.5 says: "TypeScript の判別共用体と初期値とガードの名の型を生成する"', () => {
    expect(DESIGN).toContain('TypeScript の判別共用体と初期値とガードの名の型を生成する')
    expect(DESIGN).toContain('コードは領域ごとにガードと同じ名の判定を 1 つずつ持ち、その表を生成したガードの名の型で確かめる')
  })

  it.each(MANUSCRIPT.regions.map((r) => [r.region, r] as const))('region %s: the union lists exactly the manuscript guards', (_, region) => {
    const union = guardNameUnion(generatedRegionOf(region.unit), region.typeStem)
    const guards = (region.guards ?? []).map((g) => g.name)
    if (guards.length === 0) {
      expect(union, `${region.unit} prints a guard union for a region with no guards`).toBeNull()
      return
    }
    expect(union, `${region.unit} has no ${region.typeStem}GuardName`).not.toBeNull()
    expect(new Set(union).size, 'a name printed twice').toBe((union as string[]).length)
    expect([...(union as string[])].sort()).toEqual([...guards].sort())
  })

  it('the manuscript defines 65 guards across the regions, isRungPropertiesPanel among them', () => {
    const all = MANUSCRIPT.regions.flatMap((r) => (r.guards ?? []).map((g) => g.name))
    expect(all).toHaveLength(65)
    expect(all).toContain('isRungPropertiesPanel')
  })
})
