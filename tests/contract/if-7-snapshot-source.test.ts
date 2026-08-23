// Contract test: IF-7 `SnapshotSource` -- the seam between AgentApiEndpoint
// (Adapter, CP-17) and SingleHtmlShell (Framework, CP-25).
//
// Table T-218 row TS-5: a contract test belongs to neither side of a seam. The
// side that declares `SnapshotSource` holds no current value at all (LY-5 of
// table T-060 keeps every one of them in `Framework`), and the side that
// implements it has no Agent API member to answer with. Only the two joined can
// be asked whether what one hands over is what the other needs, so the question
// is asked here, once.
//
// The row under test is the export half of IF-7's supplies column. AM-13 of
// table T-107 is the member that consumes it, and IO-3 of table T-024 fixes the
// one thing about its answer a machine can measure: the output size, which is
// `S-81` of table T-204. FR-080 fixes the environment that size is reached
// from -- the properties panel and the command palette closed -- and that
// environment is a second run of table T-068, which ADR-001 / MN-6 of table
// T-070 leave to the side that already runs the first.
//
// The specification this file is held to:
//   T-065 IF-7   `SnapshotSource`, declared by AgentApiEndpoint, implemented by
//                SingleHtmlShell
//   T-107 AM-13  the member that answers with the picture, and its two sources
//   T-024 IO-3   SVG, write only, sized by `S-81`
//   T-204 S-81   `exportCanvas`
//   FR-080       the whole screen, one ratio on both axes, table T-076's parts,
//                and the two panels written as closed
//   FR-025       what is dropped down the page, and the blank remainder
//   T-041 WY-2   one state, one drawing
//   T-070 MN-6 / ADR-001   table T-068 is run once at the head of a frame and
//                the result handed round. A second run per frame is the cost
//                that decision refused
//   R7.4         the reading ends before the work starts (T-066 CS-3)
//   T-077 BO-1 / NFR-011   nothing is drawn before a size has settled
//   T-078        the whole of what makes a frame run (MUST NOT run on anything
//                else)
//   FR-028       accepted or refused, as a value; never a thrown exception
//
// Chapter 1.9 (:275) asks a test of a requirement that points at a table to be
// driven by the table. `spec-table.ts` reads T-024, T-065 and T-204 out of the
// specification at run time, so a changed manuscript value falls here.
//
// ⚠️ The environment is `node` (vitest.config.ts). The shell side is driven
// through `frameLoop`, which takes its surfaces as arguments, so no DOM is
// needed to run either half.

import { describe, expect, it } from 'vitest'

import { bare, specTable } from './spec-table'
import {
  installAgentApi,
  type AgentApi,
  type AgentApiWiring,
  type AgentExport,
  type AgentSnapshot,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { emptyDialogueLog } from '../../src/entity/document-model/dialogue-log/dialogue-log'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS } from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
} from '../../src/framework/single-html-shell/frame-loop'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'

// ---------------------------------------------------------------------------
// The rows this file is driven by, read out of the specification.
// ---------------------------------------------------------------------------

const rowOf = (tableId: string, rowId: string): Readonly<Record<string, string>> => {
  const found = specTable(tableId).rows.find((row) => row.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found.by
}

const IF_7 = rowOf('T-065', 'IF-7')
const IO_3 = rowOf('T-024', 'IO-3')
const S_81 = rowOf('T-204', 'S-81')

/** Every number in a cell, in the order the cell writes them. */
const numbersOf = (cell: string): number[] => (cell.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)

/**
 * `S-81`'s default, as the manuscript states it: the two numbers of the
 * `既定` column, width first, in the order the `型` column names them.
 *
 * ⛔ Not typed in. Rule 04 section 2 asks the acceptance of a value that
 * travels from a manuscript to be "change one value and watch the test fall",
 * and a number written here would not fall.
 */
const EXPORT_CANVAS = ((): { readonly width: number; readonly height: number } => {
  const pair = numbersOf(S_81['既定'] ?? '')
  const [width, height] = pair
  if (pair.length !== 2 || width === undefined || height === undefined) {
    throw new Error(`table T-204 row S-81: the default is not a pair, it is ${JSON.stringify(pair)}`)
  }
  return { width, height }
})()

// ---------------------------------------------------------------------------
// The two sides of the seam, each built the way its own layer is built.
// ---------------------------------------------------------------------------

/**
 * A window large enough for BO-1 to have settled, and narrower than `S-81`, so
 * that FR-080's ratio is a real shrink in one direction and the picture cannot
 * pass by accident at the size the screen happens to be.
 */
const WINDOW: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

/** BO-1 of table T-077: a host really can hand over a window of no size. */
const NO_WINDOW: FrameEnvironment = { ...WINDOW, width: 0, height: 0 }

const documentOf = (): Document => structuredClone(startupTemplate) as unknown as Document

/**
 * How wide the one case below holds the properties panel OPEN.
 *
 * ⛔ NOT A VALUE OF THE SPECIFICATION. S-80 of table T-204 states that no row
 * fixes what an open panel takes, so this number is this file's own and nothing
 * asserts it is anyone else's. What the case claims is the DIFFERENCE it makes,
 * which FR-080 does fix.
 */
const PROPERTY_PANEL_OPEN = 300

/**
 * The starting document with the properties panel open.
 *
 * ⚠️ S-80's default is the CLOSED panel -- `0` is what closed means -- so the
 * document this file starts from has nothing for FR-080 to close. A document
 * that carries an open one is a real one to be handed: FR-024 writes every
 * setting out, so a file read back in can carry any width S-80's range admits.
 */
const documentWithPanelOpen = (): Document => {
  const one = documentOf()
  return {
    ...one,
    documentSettings: { ...one.documentSettings, propertyPanelWidth: PROPERTY_PANEL_OPEN },
  }
}

/** The Framework side, with the one surface it paints through recorded. */
interface Shell {
  readonly loop: FrameLoop
  /** Every string the loop put on the screen, in order. One entry is one paint. */
  readonly painted: readonly string[]
}

function shell(env: FrameEnvironment = WINDOW, document: Document = documentOf()): Shell {
  const painted: string[] = []
  const loop = frameLoop({ showSvg: (svg) => painted.push(svg) }, document, env)
  return { loop, painted }
}

/** The Adapter side, over one shell. `reads` counts what crosses IF-7. */
interface Endpoint {
  readonly api: AgentApi
  readonly shell: Shell
  /** How many times a member went through IF-7. R7.4 wants one per call. */
  readonly reads: () => number
  /** The last snapshot the seam handed over, for the cases about its shape. */
  readonly last: () => AgentSnapshot | null
}

/**
 * The same, over a seam that hands over no export environment while the shell
 * behind it has one. The state an implementor is in before BO-1 has settled,
 * held still so that the case about R7.4 can ask what the Adapter does with it.
 */
function endpointWithoutScene(over: Shell): Endpoint {
  return endpoint(over, true)
}

function endpoint(over: Shell = shell(), withholdScene = false): Endpoint {
  let reads = 0
  let last: AgentSnapshot | null = null
  const dialogue = emptyDialogueLog()

  const readSnapshot = (): AgentSnapshot => {
    reads += 1
    const document = over.loop.document()
    const frame = over.loop.current()
    const snapshot: AgentSnapshot = {
      document,
      selection: emptySelection(),
      dialogue,
      frame: frame === null ? null : { ...frame },
      // The export half of IF-7's supplies column, and the whole reason this
      // file joins the two sides: the answer is the shell's, and it is read
      // here, before the member starts its work (R7.4).
      exportScene: withholdScene ? null : over.loop.exportScene(),
      isGestureInFlight: false,
      isEditingInPlace: false,
      historyLimits: {
        maxSteps: NOT_STORED_LIMITS['S-94'],
        // S-95 is stated in megabytes; the plan counts bytes.
        maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
      },
      settingsLimits: {
        zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
        zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
        // FR-052's sum, which the caller of PI-9 is the side that holds. Zero
        // while no frame has settled: nothing this file asks reads it.
        rowAreaWidthWithoutPanels:
          frame === null
            ? 0
            : frame.regions.rowArea.width +
              document.documentSettings.rowTitlePanelWidth +
              document.documentSettings.propertyPanelWidth,
      },
      readAt: '2026-08-20T08:30:00Z',
    }
    last = snapshot
    return snapshot
  }

  // ⭐ EXACTLY ONE MEMBER IS OFFERED. If the seam ever grew a second way to
  // reach the shell, AM-13 taking it would throw here rather than pass -- which
  // is what R7.4 (MUST) and CS-3 of table T-066 forbid: one collection, before
  // the work, and no second reading of the outside inside one call.
  const source = { readSnapshot }

  const wiring: AgentApiWiring = {
    source,
    holder: {
      read: () => ({ document: over.loop.document(), history: { done: [], undone: [] } }),
      replace: () => undefined,
    },
    audience: { deliver: () => undefined },
    dialogueHolder: { read: () => dialogue, replace: () => undefined },
    dialogueAudience: { deliver: () => undefined },
    writerName: 'the contract test for IF-7',
    schemaVersion: (startupTemplate as { readonly schemaVersion: string }).schemaVersion,
  }

  return { api: installAgentApi(wiring), shell: over, reads: () => reads, last: () => last }
}

// ---------------------------------------------------------------------------
// Reading an answer without asserting it into place.
// ---------------------------------------------------------------------------

function exported<TValue>(answer: AgentExport<TValue>): TValue {
  if (!answer.ok) throw new Error(`expected a value, was refused: ${JSON.stringify(answer.refusal)}`)
  return answer.value
}

/** The `width`/`height` of a picture's outermost element, as numbers. */
function rootSizeOf(svg: string): { readonly width: number; readonly height: number } {
  const root = /<svg((?:[^<>"]|"[^"]*")*)>/.exec(svg)?.[1] ?? ''
  const attr = (name: string): number =>
    Number.parseFloat(new RegExp(`${name}="([^"]*)"`).exec(root)?.[1] ?? 'NaN')
  return { width: attr('width'), height: attr('height') }
}

// ---------------------------------------------------------------------------

describe(`IF-7 ${bare(IF_7['インターフェース'] ?? '')} -- the picture that crosses it`, () => {
  it('AM-13 answers with a picture the size table T-204 row S-81 fixes (IO-3 of table T-024)', () => {
    // ⚠️ THE THREE LINES BELOW ARE GUARDS, NOT THE CLAIM. They say that this
    // file is still pointed at the row it was written for: IF-7 still runs
    // between these two components, and IO-3's 備考 column still sends the size
    // question to S-81. If any of them moved, the case after them would be the
    // wrong one to be writing rather than a failure of the code.
    expect(bare(IF_7['宣言するコンポーネント'] ?? '')).toBe('AgentApiEndpoint')
    expect(bare(IF_7['実装するコンポーネント'] ?? '')).toBe('SingleHtmlShell')
    expect(IO_3['備考']).toContain('S-81')
    expect(bare(S_81['キー'] ?? '')).toBe('exportCanvas')

    const svg = exported(endpoint().api.exportSvg())
    expect(rootSizeOf(svg)).toEqual(EXPORT_CANVAS)
  })

  it('the size it takes is the one the running document carries, not one chosen at the call', () => {
    // FR-025 (MUST NOT) forbids asking at each export and fixes the size at
    // S-81, and FR-063 keeps the value in the presentation group -- so the
    // number the picture takes has to be the document's own.
    const one = endpoint()
    expect(one.shell.loop.document().documentSettings.exportCanvas).toEqual(EXPORT_CANVAS)
    expect(rootSizeOf(exported(one.api.exportSvg()))).toEqual(EXPORT_CANVAS)
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
    // FR-080 (MUST) writes the properties panel as closed for the export and
    // (MUST NOT) leaves its place blank: 「閉じたぶんの場所は日程に使う —— 画面で
    // 閉じたときと同じ絵になる」.
    //
    // ⚠️ ASKED OF A DOCUMENT THAT HAS THE PANEL OPEN, WHICH THE DEFAULT NO
    // LONGER IS. S-80 now defaults to the closed panel, so a shell built from
    // the starting document has a screen that already agrees with the export --
    // and a screen that agrees says nothing about whether the export ran the
    // second environment at all. The claim only has teeth where the two differ.
    const one = shell(WINDOW, documentWithPanelOpen())
    const frame = one.loop.current()
    const scene = one.loop.exportScene()

    expect(frame).not.toBeNull()
    expect(scene).not.toBeNull()
    if (frame === null || scene === null) return

    expect(frame.regions.propertiesPanel.width).toBe(PROPERTY_PANEL_OPEN)
    expect(scene.regions.propertiesPanel.width).toBe(0)
    // ⛔ EXACTLY the closed panel's room, and not merely more: room that went
    // anywhere else would leave the picture a different one from the screen
    // with the panel shut, which is the whole of what FR-080 asks for.
    expect(scene.regions.rowArea.width - frame.regions.rowArea.width).toBe(PROPERTY_PANEL_OPEN)
  })

  it('leaves the schedule alone when the screen already has the panel closed', () => {
    // The other side of the same MUST, at S-80's own default. FR-080 closes the
    // panel for the export; closing what is already closed may not move the
    // schedule, or the picture would stop being the screen's own.
    const one = shell()
    const frame = one.loop.current()
    const scene = one.loop.exportScene()

    expect(frame).not.toBeNull()
    expect(scene).not.toBeNull()
    if (frame === null || scene === null) return

    expect(one.loop.document().documentSettings.propertyPanelWidth).toBe(0)
    expect(scene.regions.rowArea.width).toBe(frame.regions.rowArea.width)
  })

  it('the picture that goes out is not the picture that was painted', () => {
    // The consequence of the case above, at the far end of the seam: the paint
    // is the screen's own and the export is FR-080's, so a member that answered
    // with the frame's picture would be answering with the wrong environment
    // even when the two happen to be the same size.
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
    // R7.4 (MUST) ends the collecting before the work starts, and CS-3 of table
    // T-066 makes the whole call one unit. So a snapshot that carries no export
    // environment is refused EVEN THOUGH the shell behind it could build one:
    // a member that reached for the shell after its reading -- through a call
    // handed over the seam, or a value remembered between calls -- would answer
    // here, and that reaching is what the rule forbids.
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
    // Table T-078 holds the whole of what makes a frame run and forbids running
    // one on anything else (MUST NOT). ⚠️ This is the half of MN-6 of table
    // T-070 that a value test can see: THAT the two runs are separate. The cost
    // MN-6 was weighed against (NFR-002 / NFR-003) is measured by the gates of
    // table T-043, which table T-218 puts under `tests/nfr/`, not here.
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
    // BO-1 of table T-077 (MUST) forbids drawing before the dimensions have
    // settled, and a host can hand over a window of no size.
    expect(shell(NO_WINDOW).loop.exportScene()).toBeNull()
  })

  it('AM-13 refuses as a value naming its own row (FR-028, AG-9a of table T-035)', () => {
    // FR-028 (MUST NOT) forbids the Agent API to throw, so the absence of a
    // picture is an answer and not an exception.
    const answer = endpoint(shell(NO_WINDOW)).api.exportSvg()

    expect(answer.ok).toBe(false)
    if (answer.ok) return
    expect(answer.refusal.target).toBe('AM-13')
    expect(Object.keys(answer).sort()).toEqual(['ok', 'refusal'])
  })
})
