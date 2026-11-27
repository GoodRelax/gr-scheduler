// Contract tests: IF-7 SnapshotSource, the seam between AgentApiEndpoint and SingleHtmlShell.

import { emptyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { describe, expect, it } from 'vitest'
import { settingNumber } from '../fixtures/setting-number'

import { bare, specTable } from './spec-table'
import {
  installAgentApi,
  type AgentApi,
  type AgentApiWiring,
  type AgentExport,
  type AgentSnapshot,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS } from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
} from '../../src/framework/single-html-shell/frame-loop'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'

const rowOf = (tableId: string, specTableRowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === specTableRowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${specTableRowId}`)
  return found.by
}

const IF_7 = rowOf('T-065', 'IF-7')
const IO_3 = rowOf('T-024', 'IO-3')
const S_81 = rowOf('T-204', 'S-81')

const numbersOf = (cell: string): number[] => (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

// Spec: S-81
const EXPORT_CANVAS = ((): { readonly width: number; readonly height: number } => {
  const pair = numbersOf(S_81['既定'] ?? '')
  const [width, height] = pair
  if (pair.length !== 2 || width === undefined || height === undefined) {
    throw new Error(`table T-204 row S-81: the default is not a pair, it is ${JSON.stringify(pair)}`)
  }
  return { width, height }
})()

// Why: narrower than S-81, so the FR-080 ratio is a real shrink and the picture cannot pass
// at the size the screen happens to be.
const WINDOW: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

// Spec: BO-1
const NO_WINDOW: FrameEnvironment = { ...WINDOW, width: 0, height: 0 }

const documentOf = (): Document => structuredClone(startupTemplate) as unknown as Document

// Why: the panel is held open at its start width so a case can measure the room FR-080 frees.
const PROPERTY_PANEL_OPEN = settingNumber('S-602')

interface Shell {
  readonly loop: FrameLoop
  readonly painted: readonly string[]
}

function shell(env: FrameEnvironment = WINDOW, document: Document = documentOf()): Shell {
  const painted: string[] = []
  const loop = frameLoop({ showMarqueeOverlaySvg: () => undefined, showSvg: (svg) => painted.push(svg) }, document, env)
  return { loop, painted }
}

// Spec: MK-13
// Why: the panel width is a screen value, so no document can hand the shell an open panel.
function openThePanel(one: Shell): void {
  const frame = one.loop.current()
  const task = frame?.geometry.tasks.find((each) => each.plan !== null && each.plan.form === 'outline')
  if (task === undefined || task.plan === null || task.plan.form !== 'outline') throw new Error('no Task bar is drawn')
  const xs = task.plan.points.map((each) => each.x)
  const ys = task.plan.points.map((each) => each.y)
  const at = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  const modifiers = { ctrl: false, shift: false, alt: false, meta: false }
  for (const phase of ['down', 'up'] as const) {
    one.loop.receiveInput({ kind: 'pointer', phase, button: 'left', x: at.x, y: at.y, modifiers, clickCount: 2 })
  }
}

interface Endpoint {
  readonly api: AgentApi
  readonly shell: Shell
  // Summary: reads() returns how many times a member went through IF-7.
  readonly reads: () => number
  readonly last: () => AgentSnapshot | null
}

// Summary: the endpoint's seam hands over no export environment while its shell has one.
function endpointWithoutScene(over: Shell): Endpoint {
  return endpoint(over, true)
}

function endpoint(over: Shell = shell(), withholdScene = false): Endpoint {
  let reads = 0
  let last: AgentSnapshot | null = null

  const readSnapshot = (): AgentSnapshot => {
    reads += 1
    const document = over.loop.document()
    const frame = over.loop.current()
    const snapshot: AgentSnapshot = {
      defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
      document,
      documentAsWritten: document,
      selection: emptySelection(),
      frame: frame === null ? null : { ...frame },
      // Why: the answer is the shell's and is read here, before the member starts its work (R7.4).
      exportScene: withholdScene ? null : over.loop.exportScene(),
      isGestureInFlight: false,
      isEditingInPlace: false,
      isQuestionAsked: false,
      isDeliveringNotices: false,
      historyLimits: {
        maxSteps: NOT_STORED_LIMITS['S-94'],
        // Why: S-95 is stated in megabytes; the plan counts bytes.
        maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
      },
      settingsLimits: {
        zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
        zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
        // Spec: FR-052, PI-9
        // Why: zero while no frame has settled; nothing this file asks reads it.
        taskGroupAreaWidthWithoutPanels:
          frame === null
            ? 0
            : frame.regions.taskGroupArea.width +
              document.documentSettings.taskGroupPanelWidthPx +
              frame.regions.propertiesPanel.width,
      },
      readAt: '2026-08-20T08:30:00Z',
      localReadAt: '2026-10-03T09:00:00',
    }
    last = snapshot
    return snapshot
  }

  // Why: only readSnapshot is offered, so an AM-13 that reached the shell a second way
  // throws here instead of passing (R7.4, CS-3).
  const source = { readSnapshot }

  const wiring: AgentApiWiring = {
    changeWatchers: emptyChangeWatchers(),
    source,
    holder: {
      read: () => ({ document: over.loop.document(), history: { done: [], undone: [] } }),
      replace: () => undefined,
    },
    audience: { deliver: () => undefined },
    // Why: AgentApiWiring requires IF-6 and IF-8 but allows undefined, the shape of a loop that
    // touches no picture, so AM-14 and AM-15 answer notAvailable.
    rasterizer: undefined,
    takeInDocument: undefined,
    shownTasks: undefined,
    appShell: undefined,
    writerName: 'the contract test for IF-7',
    schemaVersion: (startupTemplate as { readonly schemaVersion: string }).schemaVersion,
  }

  return { api: installAgentApi(wiring), shell: over, reads: () => reads, last: () => last }
}

function exported<TValue>(answer: AgentExport<TValue>): TValue {
  if (!answer.ok) throw new Error(`expected a value, was refused: ${JSON.stringify(answer.refusal)}`)
  return answer.value
}

function rootSizeOf(svg: string): { readonly width: number; readonly height: number } {
  const root = /<svg((?:[^<>"]|"[^"]*")*)>/.exec(svg)?.[1] ?? ''
  const attr = (name: string): number =>
    Number.parseFloat(new RegExp(`${name}="([^"]*)"`).exec(root)?.[1] ?? 'NaN')
  return { width: attr('width'), height: attr('height') }
}

describe(`IF-7 ${bare(IF_7['インターフェース'] ?? '')} -- the picture that crosses it`, () => {
  it('AM-13 answers with a picture the size table T-204 row S-81 fixes (IO-3 of table T-024)', () => {
    // Why: the three lines below are guards that the file still points at its rows, not the claim;
    // if one moved, the case would be the wrong one rather than a failure of the code.
    expect(bare(IF_7['宣言するコンポーネント'] ?? '')).toBe('AgentApiEndpoint')
    expect(bare(IF_7['実装するコンポーネント'] ?? '')).toBe('SingleHtmlShell')
    expect(IO_3['備考']).toContain('S-81')
    expect(bare(S_81['キー'] ?? '')).toBe('exportCanvas')

    const one = endpoint()
    const svg = exported(one.api.exportSvg())
    // Spec: FR-025, S-217
    const size = rootSizeOf(svg)
    expect(size.width).toBe(EXPORT_CANVAS.width)
    expect(size.height).toBeGreaterThanOrEqual(EXPORT_CANVAS.height)
    expect(size.height).toBeLessThanOrEqual(SETTINGS_CONSTANTS.exportCanvasHeightCap)
  })

  it('the size it takes is the tool constant S-81, not one chosen at the call', () => {
    // Spec: FR-025, S-81
    const one = endpoint()
    expect(SETTINGS_CONSTANTS.exportCanvas).toEqual(EXPORT_CANVAS)
    expect(one.shell.loop.document().documentSettings).not.toHaveProperty('exportCanvas')
    // Spec: FR-025, S-217
    const size = rootSizeOf(exported(one.api.exportSvg()))
    expect(size.width).toBe(EXPORT_CANVAS.width)
    expect(size.height).toBeGreaterThanOrEqual(EXPORT_CANVAS.height)
    expect(size.height).toBeLessThanOrEqual(SETTINGS_CONSTANTS.exportCanvasHeightCap)
  })

  it('what comes back is one SVG document, not a fragment', () => {
    const svg = exported(endpoint().api.exportSvg())
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
  })

  it('one state answers with one drawing, however often it is asked (WY-2 of table T-041)', () => {
    const one = endpoint()
    expect(exported(one.api.exportSvg())).toBe(exported(one.api.exportSvg()))
  })
})

describe('IF-7 -- the environment the picture is built in is not the one on the screen', () => {
  it('the shell closes the properties panel and gives its room to the schedule (FR-080, MUST)', () => {
    // Spec: FR-080
    // Why: a shell starts with the panel shut (S-99h), and a screen that already agrees says
    // nothing about whether the export ran its own environment.
    const one = shell()
    openThePanel(one)
    const frame = one.loop.current()
    const scene = one.loop.exportScene()

    expect(frame).not.toBeNull()
    expect(scene).not.toBeNull()
    if (frame === null || scene === null) return

    expect(frame.regions.propertiesPanel.width).toBe(PROPERTY_PANEL_OPEN)
    expect(scene.regions.propertiesPanel.width).toBe(0)
    // Why: exactly the closed panel's room, not merely more: room gone elsewhere would make the
    // picture differ from the screen with the panel shut.
    expect(scene.regions.taskGroupArea.width - frame.regions.taskGroupArea.width).toBe(PROPERTY_PANEL_OPEN)
  })

  it('leaves the schedule alone when the screen already has the panel closed', () => {
    // Spec: FR-080, S-99h
    const one = shell()
    const frame = one.loop.current()
    const scene = one.loop.exportScene()

    expect(frame).not.toBeNull()
    expect(scene).not.toBeNull()
    if (frame === null || scene === null) return

    expect(frame.regions.propertiesPanel.width).toBe(0)
    expect(scene.regions.taskGroupArea.width).toBe(frame.regions.taskGroupArea.width)
  })

  it('the picture that goes out is not the picture that was painted', () => {
    // Why: the paint is the screen's and the export is FR-080's, so answering with the frame's
    // picture is the wrong environment even when the two are the same size.
    const one = endpoint()
    const picture = exported(one.api.exportSvg())
    const lastPaint = one.shell.painted.at(-1)

    expect(lastPaint).toBeDefined()
    expect(picture).not.toBe(lastPaint)
    expect(rootSizeOf(picture)).not.toEqual(rootSizeOf(lastPaint ?? ''))
  })
})

describe('IF-7 -- one reading, and nothing fetched after it (R7.4, CS-3 of table T-066)', () => {
  it('one call of AM-13 reads the seam exactly once', () => {
    const one = endpoint()
    one.api.exportSvg()
    expect(one.reads()).toBe(1)
  })

  it('the one reading is the whole of what the answer may be built from', () => {
    // Why: refused even though the shell could build one: a member that reached for the shell
    // after its one reading would answer here, which R7.4 forbids.
    const over = shell()
    expect(over.loop.exportScene()).not.toBeNull()

    const answer = endpointWithoutScene(over).api.exportSvg()

    expect(answer.ok).toBe(false)
    if (answer.ok) return
    expect(answer.refusal.target).toBe('AM-13')
  })
})

describe('IF-7 -- asking for a picture is not a trigger of table T-078', () => {
  it('the shell runs no frame when it is asked for an export environment', () => {
    // Spec: T-078, MN-6
    // Why: a value test sees only that the two runs are separate; the cost NFR-002 and NFR-003
    // weigh is measured by the gates under tests/nfr/.
    const one = shell()
    const before = one.painted.length
    expect(before).toBeGreaterThan(0)

    one.loop.exportScene()
    one.loop.exportScene()

    expect(one.painted.length).toBe(before)
  })

  it('an Agent API call that reaches the seam runs no frame either', () => {
    const one = endpoint()
    const before = one.shell.painted.length

    one.api.exportSvg()

    expect(one.shell.painted.length).toBe(before)
  })
})

describe('IF-7 -- before BO-1 has settled a size (NFR-011)', () => {
  it('the shell answers with no export environment', () => {
    // Spec: BO-1
    expect(shell(NO_WINDOW).loop.exportScene()).toBeNull()
  })

  it('AM-13 refuses as a value naming its own row (FR-028, AG-9a of table T-035)', () => {
    const answer = endpoint(shell(NO_WINDOW)).api.exportSvg()

    expect(answer.ok).toBe(false)
    if (answer.ok) return
    expect(answer.refusal.target).toBe('AM-13')
    expect(Object.keys(answer).sort()).toEqual(['ok', 'refusal'])
  })
})
