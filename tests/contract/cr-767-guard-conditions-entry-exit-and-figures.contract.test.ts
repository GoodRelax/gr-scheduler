// CR-767 spec-only contract: guard conditions printed from each region's list, entry / exit effects in UML order, and the fig-sm-<machine>.svg diagrams (5.5, T-250 SD-1 / SD-3).

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { unbroken } from './spec-table'

type Loose = Record<string, unknown>
type GuardTerm = { readonly name: string; readonly not?: boolean } | { readonly in: string }
type Branch = {
  readonly to?: string
  readonly guard?: readonly GuardTerm[]
  readonly effect?: string
  readonly effectArgument?: string
}
type Cell = Branch | readonly Branch[]
type StateEffect = { readonly effect: string; readonly effectArgument?: string }
type RawState = {
  readonly key: string
  readonly parent: string | null
  readonly initial: boolean
  readonly entry?: StateEffect
  readonly exit?: StateEffect
}
type RawMachine = {
  readonly name: string
  readonly states: readonly RawState[]
  readonly transitions: Readonly<Record<string, Readonly<Record<string, Cell>>>>
}
type RawGuard = { readonly name: string; readonly condition: string }
type RawRegion = {
  readonly region: string
  readonly root: { readonly transitions: Readonly<Record<string, Cell>> }
  readonly guards?: readonly RawGuard[]
  readonly machines: readonly RawMachine[]
}

const SPEC = join(process.cwd(), 'docs', 'spec')
const ASSETS = join(SPEC, '_assets')
const MANUSCRIPT_PATH = 'docs/spec/_source/state-machines.json'
const REGIONS = (
  JSON.parse(readFileSync(join(SPEC, '_source', 'state-machines.json'), 'utf8')) as { readonly regions: readonly RawRegion[] }
).regions
const PRINTED = readFileSync(join(ASSETS, 'tbl-state-machines.md'), 'utf8').replace(/\r\n/g, '\n')
const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8'))

const SECTION_5_5_GENERATES =
  '原稿から、ガードの式の書き方、領域ごとの出来事の定義・ガードの一覧・優先順の表と、状態機械ごとの状態遷移図（UML）・状態遷移表・状態の一覧を生成し'
const SECTION_5_5_NO_HAND_EDIT = '状態遷移図と状態遷移表を手で直してはならない（MUST NOT）'
// WHY: wave 2 of CR-767 continues the sentence with the generated guard-name type.
const SECTION_5_5_CONDITIONS = 'ガードの条件は原稿が持ち、コードの判定はそれに従う'
const SD_1_ENTRY_EXIT = '入るとき・出るときに必ず起きる副作用（entry ／ exit）'
const SD_3_CONDITIONS =
  'ガードの条件は領域ごとのガードの一覧が式で持ち（式の書き方は原稿の頭に 1 度だけ定める）、升と一覧はその式を刷る。'
const SD_3_NOT_REPEATED = 'entry ／ exit の副作用は、その状態へ入る（出る）升に重ねて書かない。'
const UML_ORDER = 'as UML runs them: exit, then the transition\'s effect, then entry. A transition to itself neither enters nor leaves.'
const SCHEMA = readFileSync(join(SPEC, '_source', 'state-machines.schema.json'), 'utf8')

describe('CR-767 -- the clauses these cases are driven by', () => {
  it.each([SECTION_5_5_GENERATES, SECTION_5_5_NO_HAND_EDIT, SECTION_5_5_CONDITIONS, SD_1_ENTRY_EXIT, SD_3_CONDITIONS, SD_3_NOT_REPEATED])(
    '05-07-design.md 5.5 / T-250 still says: %s',
    (clause) => {
      expect(DESIGN).toContain(clause)
    },
  )

  it('the manuscript schema still runs entry / exit in UML order (stateEffect)', () => {
    expect(SCHEMA).toContain(UML_ORDER)
  })
})

function branchesOf(cell: Cell | undefined): readonly Branch[] {
  if (cell === undefined) return []
  return Array.isArray(cell) ? (cell as readonly Branch[]) : [cell as Branch]
}

function namedGuards(branch: Branch): string[] {
  return (branch.guard ?? []).flatMap((g) => ('name' in g ? [g.name] : []))
}

type CellAt = { readonly where: string; readonly event: string; readonly from: string | null; readonly branch: Branch }

// see SD-3
function cellsOf(region: RawRegion): CellAt[] {
  const root = Object.entries(region.root.transitions).flatMap(([event, cell]) =>
    branchesOf(cell).map((branch) => ({ where: 'root', event, from: null, branch })),
  )
  const machines = region.machines.flatMap((m) =>
    Object.entries(m.transitions).flatMap(([event, row]) =>
      Object.entries(row).flatMap(([from, cell]) => branchesOf(cell).map((branch) => ({ where: m.name, event, from, branch }))),
    ),
  )
  return [...root, ...machines]
}

function sectionAfter(heading: string, text: string): string {
  const at = text.indexOf(`${heading}\n`)
  if (at < 0) return ''
  const rest = text.slice(at + heading.length + 1)
  const next = rest.search(/^#{2,3} /m)
  return next < 0 ? rest : rest.slice(0, next)
}

function regionSection(region: string): string {
  const match = new RegExp(`^## .*（\`${region}\`）$`, 'm').exec(PRINTED)
  if (match === null) return ''
  const rest = PRINTED.slice(match.index + match[0].length)
  const next = rest.search(/^## /m)
  return next < 0 ? rest : rest.slice(0, next)
}

function rowOf(section: string, region: string, event: string): string | undefined {
  return section.split('\n').find((line) => line.startsWith(`| \`${region}/${event}\` |`))
}

// WHY: a condition holding `|` cannot sit in backticks inside a Markdown table cell, so it is
// printed as <code> with the HTML escapes; either form is the same expression.
function printedForms(condition: string): string[] {
  const escaped = condition.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;')
  return [`\`${condition}\``, `<code>${escaped}</code>`]
}

function showsGuard(text: string, name: string, condition: string): boolean {
  return printedForms(condition).some((form) => text.includes(`\`${name}\`（${form}）`))
}

describe('SD-3: each region defines every guard its cells name exactly once, and names every guard it defines', () => {
  it.each(REGIONS.map((r) => [r.region, r] as const))('%s', (_, region) => {
    const defined = (region.guards ?? []).map((g) => g.name)
    expect(new Set(defined).size, 'a guard defined twice').toBe(defined.length)
    const used = new Set(cellsOf(region).flatMap((c) => namedGuards(c.branch)))
    expect([...used].filter((name) => !defined.includes(name)), 'named by a cell but not defined').toEqual([])
    expect(defined.filter((name) => !used.has(name)), 'defined but named by no cell').toEqual([])
    for (const g of region.guards ?? []) expect(g.condition.trim().length, `${g.name} has a condition`).toBeGreaterThan(0)
  })
})

describe('SD-3: the region guard list prints each guard with its condition', () => {
  const cases = REGIONS.flatMap((r) => (r.guards ?? []).map((g) => [`${r.region}: ${g.name}`, r.region, g] as const))
  it.each(cases)('%s', (_, region, guard) => {
    const row = regionSection(region).split('\n').find((line) => line.startsWith(`| \`${guard.name}\` |`))
    expect(row, `a row for ${guard.name} in the guard list of ${region}`).toBeDefined()
    const cell = (row ?? '').split(' | ')[1] ?? ''
    const printed = printedForms(guard.condition).some((form) => cell === form || cell.startsWith(`${form}（`))
    expect(printed, `${guard.name}'s printed condition: ${cell.slice(0, 80)}`).toBe(true)
  })
})

describe('SD-3: every printed cell that names a guard prints it as `name`（`condition`） from its region list', () => {
  const cases = REGIONS.flatMap((r) =>
    cellsOf(r)
      .filter((c) => namedGuards(c.branch).length > 0)
      .map((c) => [`${r.region}: ${c.where} x ${c.event}${c.from === null ? '' : ` @ ${c.from}`}`, r, c] as const),
  )
  it.each(cases)('%s', (_, region, cell) => {
    const heading = cell.where === 'root' ? `### 根 \`${region.region}\` の値` : `### 状態機械 \`${cell.where}\``
    const row = rowOf(sectionAfter(heading, regionSection(region.region)), region.region, cell.event)
    expect(row, `${heading}: a row for ${region.region}/${cell.event}`).toBeDefined()
    for (const name of namedGuards(cell.branch)) {
      const guard = (region.guards ?? []).find((g) => g.name === name)
      expect(guard, `${name} is in the guard list`).toBeDefined()
      expect(showsGuard(row ?? '', name, guard?.condition ?? ''), `${name}（${guard?.condition ?? ''}）`).toBe(true)
    }
  })

  it('no printed guard shows a condition other than its own list entry', () => {
    const wrong: string[] = []
    for (const region of REGIONS) {
      const tables = [`### 根 \`${region.region}\` の値`, ...region.machines.map((m) => `### 状態機械 \`${m.name}\``)]
      const section = tables.map((heading) => sectionAfter(heading, regionSection(region.region))).join('\n')
      for (const guard of region.guards ?? []) {
        const shown = section.split(`\`${guard.name}\`（`).slice(1)
        for (const tail of shown) {
          if (!printedForms(guard.condition).some((form) => tail.startsWith(`${form}）`))) {
            wrong.push(`${region.region}: ${guard.name}（${tail.slice(0, 60)}`)
          }
        }
      }
    }
    expect(wrong).toEqual([])
  })
})

type HeldState = { readonly region: RawRegion; readonly machine: RawMachine; readonly state: RawState }

const HELD: HeldState[] = REGIONS.flatMap((region) =>
  region.machines.flatMap((machine) =>
    machine.states.filter((s) => s.entry !== undefined || s.exit !== undefined).map((state) => ({ region, machine, state })),
  ),
)

function isWithin(key: string, top: string): boolean {
  return key === top || key.startsWith(`${top}.`)
}

type Crossing = 'enters' | 'leaves' | 'self' | 'inside'

// see SD-1, SD-3
function crossingOf(from: string, branch: Branch, held: string): Crossing | null {
  const to = branch.to
  if (to === undefined || to === from) return isWithin(from, held) ? 'self' : null
  const fromIn = isWithin(from, held)
  const toIn = isWithin(to, held)
  if (fromIn && toIn) return 'inside'
  if (toIn) return 'enters'
  if (fromIn) return 'leaves'
  return null
}

function crossingCells(h: HeldState): { readonly key: string; readonly crossing: Crossing }[] {
  return Object.entries(h.machine.transitions).flatMap(([event, row]) =>
    Object.entries(row).flatMap(([from, cell]) =>
      branchesOf(cell).flatMap((branch, i) => {
        const crossing = crossingOf(from, branch, h.state.key)
        return crossing === null ? [] : [{ key: `${event} @ ${from} #${i}`, crossing }]
      }),
    ),
  )
}

describe('SD-3: a cell entering (leaving) a state with an entry (exit) does not repeat that effect', () => {
  it.each(HELD.map((h) => [`${h.machine.name}.${h.state.key}`, h] as const))('%s', (_, h) => {
    const repeated: string[] = []
    for (const [event, row] of Object.entries(h.machine.transitions)) {
      for (const [from, cell] of Object.entries(row)) {
        for (const branch of branchesOf(cell)) {
          const crossing = crossingOf(from, branch, h.state.key)
          const own = branch.effect
          if (own !== undefined && crossing === 'enters' && own === h.state.entry?.effect) repeated.push(`${event} @ ${from} (entry)`)
          if (own !== undefined && crossing === 'leaves' && own === h.state.exit?.effect) repeated.push(`${event} @ ${from} (exit)`)
        }
      }
    }
    expect(repeated).toEqual([])
  })
})

const QN_5 = { manner: 'NT-7', question: 'QN-5', items: [{ name: 'Task A', isShownOnAnotherTaskGroup: false }] }
const CANDIDATES = [{ currentUid: 1, currentName: 'Task A', incomingUid: 7, incomingName: 'Task A' }]

function screenWith(axes: Loose): ScreenSession {
  const base = emptyScreenSession as unknown as Loose
  return { ...base, screen: { ...(base['screen'] as Loose), ...axes } } as unknown as ScreenSession
}

function flowWith(fields: Loose): ScreenSession {
  const base = emptyScreenSession as unknown as Loose
  return { ...base, fileFlow: { ...(base['fileFlow'] as Loose), ...fields } } as unknown as ScreenSession
}

const DUAL_ON_A = { dualCursorModeState: { kind: 'on', child: { kind: 'placingCursorA' } } }
const DUAL_ON_B = { dualCursorModeState: { kind: 'on', child: { kind: 'placingCursorB' } } }
const SCALE_SHOWN = { scaleMessageDisplayState: { kind: 'shown', percent: 100, end: 'max' } }
const IDLE_NOT_ASKED = { fileOperationState: { kind: 'idle' }, confirmationState: { kind: 'notAsked' } }
const operation = (kind: string, carried: Loose = {}): Loose => ({ fileOperationState: { kind, ...carried } })

type Sample = {
  readonly region: string
  readonly field: string
  readonly session: ScreenSession
  readonly event: Loose
  readonly lands: readonly string[]
}

const SAMPLES: Readonly<Record<string, Readonly<Record<string, Sample>>>> = {
  'dualCursorModeStateMachine.on': {
    'escapePressed @ on #0': {
      region: 'screen',
      field: 'dualCursorModeState',
      session: screenWith(DUAL_ON_A),
      event: { type: 'escapePressed', rung: 'dualCursorMode' },
      lands: ['off'],
    },
    'dualCursorEntryPressed @ off #0': {
      region: 'screen',
      field: 'dualCursorModeState',
      session: screenWith({}),
      event: { type: 'dualCursorEntryPressed', date: '2026-01-05', hasDaysToPlace: true },
      lands: ['on', 'placingCursorA'],
    },
    'dualCursorEntryPressed @ on #0': {
      region: 'screen',
      field: 'dualCursorModeState',
      session: screenWith(DUAL_ON_B),
      event: { type: 'dualCursorEntryPressed', date: '2026-01-05', hasDaysToPlace: true },
      lands: ['off'],
    },
    'guideCursorEntryPressed @ on #0': {
      region: 'screen',
      field: 'dualCursorModeState',
      session: screenWith(DUAL_ON_A),
      event: { type: 'guideCursorEntryPressed', guideCursor: 'crosshair' },
      lands: ['off'],
    },
    'dualCursorPlaced @ on.placingCursorA #0': {
      region: 'screen',
      field: 'dualCursorModeState',
      session: screenWith(DUAL_ON_A),
      event: { type: 'dualCursorPlaced', date: '2026-01-05' },
      lands: ['on', 'placingCursorB'],
    },
    'dualCursorPlaced @ on.placingCursorB #0': {
      region: 'screen',
      field: 'dualCursorModeState',
      session: screenWith(DUAL_ON_B),
      event: { type: 'dualCursorPlaced', date: '2026-01-05' },
      lands: ['on', 'placingCursorA'],
    },
  },
  'scaleMessageDisplayStateMachine.shown': {
    'displayScaleStepped @ hidden #0': {
      region: 'screen',
      field: 'scaleMessageDisplayState',
      session: screenWith({}),
      event: { type: 'displayScaleStepped', percent: 100, end: 'max' },
      lands: ['shown'],
    },
    'displayScaleStepped @ shown #0': {
      region: 'screen',
      field: 'scaleMessageDisplayState',
      session: screenWith(SCALE_SHOWN),
      event: { type: 'displayScaleStepped', percent: 100, end: 'max' },
      lands: ['shown'],
    },
    'verticalZoomEndReached @ hidden #0': {
      region: 'screen',
      field: 'scaleMessageDisplayState',
      session: screenWith({}),
      event: { type: 'verticalZoomEndReached', percent: 100, end: 'max' },
      lands: ['shown'],
    },
    'verticalZoomEndReached @ shown #0': {
      region: 'screen',
      field: 'scaleMessageDisplayState',
      session: screenWith(SCALE_SHOWN),
      event: { type: 'verticalZoomEndReached', percent: 100, end: 'max' },
      lands: ['shown'],
    },
    'scaleMessageTimeElapsed @ shown #0': {
      region: 'screen',
      field: 'scaleMessageDisplayState',
      session: screenWith(SCALE_SHOWN),
      event: { type: 'scaleMessageTimeElapsed' },
      lands: ['hidden'],
    },
  },
  'fileOperationStateMachine.readingDocumentFile': {
    'documentOpenAsked @ idle #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(IDLE_NOT_ASKED),
      event: { type: 'documentOpenAsked', openRoute: 'chooser' },
      lands: ['readingDocumentFile'],
    },
    'documentOpenAsked @ readingDocumentFile #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('readingDocumentFile', { openRoute: 'chooser' })),
      event: { type: 'documentOpenAsked', openRoute: 'drop' },
      lands: ['readingDocumentFile'],
    },
    'agentDocumentHanded @ idle #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(IDLE_NOT_ASKED),
      event: { type: 'agentDocumentHanded' },
      lands: ['readingDocumentFile'],
    },
    'documentFileWriteAsked @ readingDocumentFile #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('readingDocumentFile', { openRoute: 'chooser' })),
      event: { type: 'documentFileWriteAsked', writeForm: { kind: 'save' }, fixBundle: null },
      lands: ['readingDocumentFile'],
    },
    'documentFileRead @ readingDocumentFile #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith({
        ...operation('readingDocumentFile', { openRoute: 'reopen' }),
        unsavedEditsState: { kind: 'editsUnsaved' },
      }),
      event: { type: 'documentFileRead', question: QN_5 },
      lands: ['awaitingDiscardAnswer'],
    },
    'documentFileRead @ readingDocumentFile #1': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('readingDocumentFile', { openRoute: 'reopen' })),
      event: { type: 'documentFileRead', question: QN_5 },
      lands: ['importingDocument'],
    },
    'documentFileRead @ readingDocumentFile #2': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('readingDocumentFile', { openRoute: 'baseline' })),
      event: { type: 'documentFileRead', question: QN_5 },
      lands: ['importingDocument'],
    },
    'documentFileRead @ readingDocumentFile #3': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('readingDocumentFile', { openRoute: 'chooser' })),
      event: { type: 'documentFileRead', question: QN_5 },
      lands: ['awaitingOpenChoice'],
    },
    'documentOpenFailed @ readingDocumentFile #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('readingDocumentFile', { openRoute: 'chooser' })),
      event: { type: 'documentOpenFailed' },
      lands: ['idle'],
    },
  },
  'fileOperationStateMachine.importingDocument': {
    'documentOpenAsked @ importingDocument #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('importingDocument')),
      event: { type: 'documentOpenAsked', openRoute: 'chooser' },
      lands: ['importingDocument'],
    },
    'documentFileWriteAsked @ importingDocument #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('importingDocument')),
      event: { type: 'documentFileWriteAsked', writeForm: { kind: 'save' }, fixBundle: null },
      lands: ['importingDocument'],
    },
    'documentFileRead @ readingDocumentFile #1': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('readingDocumentFile', { openRoute: 'reopen' })),
      event: { type: 'documentFileRead', question: QN_5 },
      lands: ['importingDocument'],
    },
    'documentFileRead @ readingDocumentFile #2': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('readingDocumentFile', { openRoute: 'baseline' })),
      event: { type: 'documentFileRead', question: QN_5 },
      lands: ['importingDocument'],
    },
    'documentOpenFailed @ importingDocument #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('importingDocument')),
      event: { type: 'documentOpenFailed' },
      lands: ['idle'],
    },
    'openChoiceAnswered @ awaitingOpenChoice #1': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('awaitingOpenChoice')),
      event: { type: 'openChoiceAnswered', openChoice: 'replace', question: QN_5 },
      lands: ['importingDocument'],
    },
    'openChoiceAnswered @ awaitingOpenChoice #2': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('awaitingOpenChoice')),
      event: { type: 'openChoiceAnswered', openChoice: 'merge', question: QN_5 },
      lands: ['importingDocument'],
    },
    'confirmationAnswered @ awaitingDiscardAnswer #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('awaitingDiscardAnswer')),
      event: { type: 'confirmationAnswered', isProceeding: true },
      lands: ['importingDocument'],
    },
    'mergeMappingAsked @ importingDocument #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('importingDocument')),
      event: { type: 'mergeMappingAsked', mergeCandidates: CANDIDATES, unreadColumns: ['Notes'] },
      lands: ['awaitingMergeMapping'],
    },
    'mergeMappingAnswered @ awaitingMergeMapping #1': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('awaitingMergeMapping', { mergeCandidates: CANDIDATES, unreadColumns: ['Cost'] })),
      event: { type: 'mergeMappingAnswered', mergeMapping: { kind: 'allSame' } },
      lands: ['importingDocument'],
    },
    'documentOpenLanded @ importingDocument #0': {
      region: 'fileFlow',
      field: 'fileOperationState',
      session: flowWith(operation('importingDocument')),
      event: {
        type: 'documentOpenLanded',
        droppedTaskNames: [],
        missingTaskNames: [],
        reportedCounts: [],
        openedFileName: null,
        openChoice: 'replace',
      },
      lands: ['idle'],
    },
  },
}

function kindPathOf(value: unknown): string[] {
  const path: string[] = []
  for (let at = value as Loose | undefined; at !== undefined && at !== null && typeof at === 'object'; at = at['child'] as Loose | undefined) {
    path.push(String(at['kind']))
  }
  return path
}

describe('SD-1 sample list: every cell entering, leaving or staying in a state with entry / exit has a sample', () => {
  it.each(HELD.map((h) => [`${h.machine.name}.${h.state.key}`, h] as const))('%s', (id, h) => {
    expect(Object.keys(SAMPLES[id] ?? {}).sort()).toEqual(crossingCells(h).map((c) => c.key).sort())
  })
})

describe('SD-1 / SD-3 (UML): entering runs the entry once, leaving runs the exit once, a self transition runs neither', () => {
  const cases = HELD.flatMap((h) => {
    const id = `${h.machine.name}.${h.state.key}`
    return crossingCells(h).map((c) => [`${id}: ${c.crossing} -- ${c.key}`, h, c, SAMPLES[id]?.[c.key]] as const)
  })
  it.each(cases)('%s', (_, h, c, sample) => {
    expect(sample, 'a sample for this cell').toBeDefined()
    if (sample === undefined) return
    const result = advanceScreenSession(sample.session, sample.event as unknown as SessionEvent)
    const landed = kindPathOf(((result.state as unknown as Loose)[sample.region] as Loose)[sample.field])
    expect(landed, 'precondition: the sample fires the cell it names').toEqual(sample.lands)
    const types = result.effects.map((e) => String((e as unknown as Loose)['type']))
    const count = (effect: string | undefined): number => (effect === undefined ? 0 : types.filter((t) => t === effect).length)
    const entry = h.state.entry?.effect
    const exit = h.state.exit?.effect
    if (entry !== undefined) expect(count(entry), `entry ${entry}`).toBe(c.crossing === 'enters' ? 1 : 0)
    if (exit !== undefined) expect(count(exit), `exit ${exit}`).toBe(c.crossing === 'leaves' ? 1 : 0)
  })
})

const MACHINES = REGIONS.flatMap((r) => r.machines.map((m) => [r.region, m.name] as const))

// WHY: a hand edit of a figure or a table is caught by the printers' gen:check, which re-prints
// both from the manuscript; a test sees only what is printed, so it checks the link and banner.
describe('5.5: each machine section links its UML diagram fig-sm-<machine>.svg, drawn from the manuscript', () => {
  it.each(MACHINES)('%s: %s', (region, name) => {
    const section = sectionAfter(`### 状態機械 \`${name}\``, regionSection(region))
    expect(section, `the section of ${name}`).not.toBe('')
    expect(section).toContain(`[![${name}](fig-sm-${name}.svg)](fig-sm-${name}.svg)`)
    const file = join(ASSETS, `fig-sm-${name}.svg`)
    expect(existsSync(file), `fig-sm-${name}.svg exists`).toBe(true)
    const banner = /<!--([\s\S]*?)-->/.exec(readFileSync(file, 'utf8'))?.[1] ?? ''
    expect(banner, 'the banner names the manuscript').toContain(MANUSCRIPT_PATH)
    expect(banner, 'the banner carries a fingerprint').toMatch(/fingerprint sha256:[0-9a-f]{64}/)
  })

  it('no fig-sm-*.svg is left without a machine, and no Mermaid block remains in the printed tables', () => {
    const figures = readdirSync(ASSETS).filter((f) => /^fig-sm-.*\.svg$/.test(f)).sort()
    expect(figures).toEqual(MACHINES.map(([, name]) => `fig-sm-${name}.svg`).sort())
    expect(PRINTED).not.toMatch(/```mermaid/)
    expect(PRINTED).not.toMatch(/stateDiagram/)
  })
})
