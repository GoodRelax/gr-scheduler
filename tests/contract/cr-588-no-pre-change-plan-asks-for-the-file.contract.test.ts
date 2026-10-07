// CR-588 contract: IC-4 with no pre-change plan asks for the file (OP-15), and the overlay import turns S-69 on (FR-015).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  NOT_STORED_LIMITS,
  emptyHistory,
  stepCount,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { ScreenPart } from '../../src/adapter/screen-renderer/screen-surface'
import {
  commandFromInput,
  screenEventFromInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  replaceDocument,
  type ChangeAudience,
  type ChangeStep,
  type DocumentHolder,
  type HeldDocument,
  type ImportCall,
  type ReplacementCall,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { importDocument, type ImportRequest } from '../../src/use-case/import-document/import-document'
import { bare, specTable, unbroken } from './spec-table'

type Loose = Record<string, unknown>

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const GLOSSARY = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-glossary.md'), 'utf8'))
const SETTINGS_TABLE = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-settings.md'), 'utf8'))

const IC_4_ASKS = '⭐ **重ねる予定が無いときは切り替えず、変更前の予定にするファイルを選ばせる**（表 T-024a の `OP-15`）'
const OP_15_OPENS_THE_CHOOSER = '**`OP-2` のファイル選択と同じ画面を開き、選んだファイルを重ねる用途で開くこと（MUST）**'
const OP_15_NO_OP_3 = '**`OP-3` の 3 択は問わず、重ねに定めること（MUST）**'
const OP_15_NO_OP_4 = '⚠️ `OP-4` の確認は掛けない —— 現在の文書を捨てない。'
const OP_15_CLOSED_WITHOUT_A_FILE = '⚠️ 選ばずに閉じたときは何も変えない —— `S-69` も書き換えない。'
const OP_15_NO_PLAN_MEANS_ZERO =
  '⭐ 「重ねる予定が無い」とは、文書の `BaselineTask`（`_assets/fig-erd-detail.md` の `ET-18`）が 0 件であることとする —— `OP-9` の「一致が 1 つも無いときは枠が空になる」の後もこれに当たる。'
const OP_15_WITH_A_PLAN_ONLY_TOGGLES = '⚠️ 重ねる予定が在るときの `IC-4` は `S-69` を切り替えるだけであり、本行に当たらない'
const FR_015_TURNS_S_69_ON =
  '⭐ 重ねを読み込んだときは、`_assets/tbl-settings.md` の 表 T-202 の `S-69` を真にすること（MUST）'
const UN_18_ONE_STEP = '| UN-18 | 対象 | 重ねの取り込み（表 T-024a の `OP-9`、`FR-015`）。取り込み 1 回を 1 段とする'
const UN_7_TOGGLES_OUTSIDE = '| UN-7 | 対象外 | 表示の切り替え（各トグル） |'
const S_69_ROW = '| S-69 | `baselineVisible` | 真偽 | `false` |'

type RawGuard = { readonly name?: string; readonly not?: boolean; readonly in?: string }
type RawBranch = { readonly to?: string; readonly guard?: readonly RawGuard[]; readonly effect?: string }
type RawMachine = {
  readonly name: string
  readonly transitions: Readonly<Record<string, Readonly<Record<string, RawBranch | readonly RawBranch[]>>>>
}
type RawRegion = {
  readonly region: string
  readonly events: readonly { readonly key: string; readonly carries: readonly { readonly name: string; readonly note?: { readonly ja?: string } }[] }[]
  readonly machines: readonly RawMachine[]
}

const FLOW_REGION = (
  JSON.parse(readFileSync(join(SPEC, '_source', 'state-machines.json'), 'utf8')) as { readonly regions: readonly RawRegion[] }
).regions.find((r) => r.region === 'fileFlow')

const branchesOf = (cell: RawBranch | readonly RawBranch[] | undefined): readonly RawBranch[] =>
  cell === undefined ? [] : Array.isArray(cell) ? (cell as readonly RawBranch[]) : [cell as RawBranch]

const OPERATION_MACHINE = FLOW_REGION?.machines.find((m) => m.name === 'fileOperationStateMachine')

const BASELINE_READ_BRANCH = branchesOf(OPERATION_MACHINE?.transitions['documentFileRead']?.['readingDocumentFile']).find(
  (b) => (b.guard ?? []).some((g) => g.name === 'isBaselineRoute' && g.not !== true),
)

describe('CR-588 premises -- the clauses these cases quote still stand', () => {
  it('T-109 IC-4 still asks for the file when there is no pre-change plan', () => {
    expect(GLOSSARY).toContain(IC_4_ASKS)
  })

  it('T-024a OP-15 still opens the chooser, fixes the overlay, skips OP-4 and keeps S-69 on a close', () => {
    for (const clause of [
      OP_15_OPENS_THE_CHOOSER,
      OP_15_NO_OP_3,
      OP_15_NO_OP_4,
      OP_15_CLOSED_WITHOUT_A_FILE,
      OP_15_NO_PLAN_MEANS_ZERO,
      OP_15_WITH_A_PLAN_ONLY_TOGGLES,
    ]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
  })

  it('FR-015 still turns S-69 on when an overlay is read', () => {
    expect(REQUIREMENTS).toContain(FR_015_TURNS_S_69_ON)
  })

  it('T-027 still makes the overlay import one step (UN-18) and the toggles 対象外 (UN-7)', () => {
    expect(REQUIREMENTS).toContain(UN_18_ONE_STEP)
    expect(REQUIREMENTS).toContain(UN_7_TOGGLES_OUTSIDE)
  })

  it('T-202 S-69 is still baselineVisible, 真偽, default false', () => {
    expect(SETTINGS_TABLE).toContain(S_69_ROW)
  })

  it('the fileFlow manuscript still routes documentFileRead under isBaselineRoute to importingDocument', () => {
    expect(BASELINE_READ_BRANCH?.to).toBe('importingDocument')
    expect(BASELINE_READ_BRANCH?.effect).toBe('importIncomingDocument')
    const openAsked = FLOW_REGION?.events.find((e) => e.key === 'documentOpenAsked')
    expect(openAsked?.carries.find((c) => c.name === 'openRoute')?.note?.ja ?? '').toContain('`baseline`')
  })
})

function valuesUnder(value: unknown, key: string, out: unknown[] = []): unknown[] {
  if (value === null || typeof value !== 'object') return out
  if (Array.isArray(value)) {
    for (const one of value) valuesUnder(one, key, out)
    return out
  }
  for (const [k, v] of Object.entries(value as Loose)) {
    if (k === key) out.push(v)
    valuesUnder(v, key, out)
  }
  return out
}

const S_69_KEY = 'baselineVisible'

const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const ROW_ID = 'r-alfa'

const settingsWith = (baselineVisible: boolean): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    ...NESTED,
    scrollDate: '2026-01-01',
    scrollGroupId: ROW_ID,
    stackDirection: 'down',
    baselineVisible,
  }) as unknown as DocumentSettings

const ONE_BASELINE_TASK = { uid: 1, name: 'before', start: '2026-01-05T08:00:00', finish: '2026-01-09T17:00:00', milestone: false }

const scheduleWith = (baselineTasks: readonly unknown[]): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null, themeHue: 214, title: null, uidHighWaterMark: 0, outlineBase: 1 },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [{ id: ROW_ID, parentId: null, label: 'row', order: 0, minHeight: null }],
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks,
  }) as unknown as Schedule

const documentWith = (baselineTasks: readonly unknown[], baselineVisible: boolean): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule: scheduleWith(baselineTasks),
    documentSettings: settingsWith(baselineVisible),
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointerOf = (phase: PointerInput['phase']): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: 1,
  y: 1,
  modifiers: NO_MODS,
  clickCount: 1,
})

const IC_4_SURFACE = ((): string => {
  const row = specTable('T-109').rows.find((one) => one.id === 'IC-4')
  if (row === undefined) throw new Error('table T-109 has no row IC-4')
  return bare(row.cells[0] ?? '')
})()

const IC_4_PART = {
  part: IC_4_SURFACE,
  entry: 'IC-4',
  format: null,
  rowGroupId: null,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
} as unknown as ScreenPart

interface PressAnswer {
  readonly answered: readonly unknown[]
  readonly s69Writes: readonly unknown[]
  readonly openRoutes: readonly unknown[]
}

// WHY: the seam names the value, not the carrier, so both translator members get the down and the up
// and any openRoute in what they answer counts.
function pressIc4(document: Document): PressAnswer {
  const settings = document.documentSettings
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(document.schedule, settings, regions)
  const down = pointerOf('down')
  const press: PointerPress = { at: down, hit: null, on: IC_4_PART, pressRow: 'PTD-5' }
  const context: InputContext = {
    document,
    layout,
    geometry: geometryFromLayout(document.schedule, settings, layout, regions, emptySelection(), null),
    regions,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: press,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  }
  const answered: unknown[] = []
  for (const input of [down, pointerOf('up')]) {
    answered.push(commandFromInput(input, context).action)
    answered.push(screenEventFromInput(input, context))
  }
  const s69Writes: unknown[] = []
  for (const action of answered) {
    const writes = (action as Loose | null)?.['kind'] === 'changeDocument' ? ((action as Loose)['writes'] as unknown[][]).flat() : []
    for (const write of writes as Loose[]) {
      if (write['element'] === S_69_KEY) s69Writes.push(write['visible'])
      else if (S_69_KEY in write) s69Writes.push(write[S_69_KEY])
    }
  }
  return { answered, s69Writes, openRoutes: valuesUnder(answered, 'openRoute') }
}

describe('T-109 IC-4 / OP-15 -- with no BaselineTask, IC-4 asks for the file instead of toggling S-69', () => {
  it.each([false, true])(
    'OP-15 「「重ねる予定が無い」とは … BaselineTask … が 0 件」 + IC-4 「切り替えず」: S-69 %s is not written',
    (before) => {
      const answer = pressIc4(documentWith([], before))
      expect(answer.s69Writes, JSON.stringify(answer.answered)).toEqual([])
    },
  )

  it.each([false, true])(
    'OP-15 「OP-2 のファイル選択と同じ画面を開き、選んだファイルを重ねる用途で開くこと（MUST）」: S-69 %s asks with openRoute baseline',
    (before) => {
      const answer = pressIc4(documentWith([], before))
      expect(answer.openRoutes, JSON.stringify(answer.answered)).toContain('baseline')
    },
  )
})

describe('T-109 IC-4 / OP-15 (control) -- with a BaselineTask held, IC-4 only toggles S-69', () => {
  it.each([false, true])(
    'OP-15 「重ねる予定が在るときの IC-4 は S-69 を切り替えるだけ」: S-69 %s is written to its opposite',
    (before) => {
      const answer = pressIc4(documentWith([ONE_BASELINE_TASK], before))
      expect(answer.s69Writes, JSON.stringify(answer.answered)).toEqual([!before])
    },
  )

  it.each([false, true])(
    'OP-15 「… 本行に当たらない」: S-69 %s asks for no file with openRoute baseline',
    (before) => {
      const answer = pressIc4(documentWith([ONE_BASELINE_TASK], before))
      expect(answer.openRoutes, JSON.stringify(answer.answered)).not.toContain('baseline')
    },
  )
})

function flowOf(session: ScreenSession): Loose {
  return (session as unknown as Loose)['fileFlow'] as Loose
}

function withFlow(fields: Loose): ScreenSession {
  return {
    ...(emptyScreenSession as unknown as Loose),
    fileFlow: { ...flowOf(emptyScreenSession), ...fields },
  } as unknown as ScreenSession
}

function step(session: ScreenSession, event: Loose): ReturnType<typeof advanceScreenSession> {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

const QN_5 = { manner: 'NT-7', question: 'QN-5', items: [{ name: 'Task A', isShownOnAnotherRow: false }] }

const readingWith = (openRoute: string): ScreenSession =>
  withFlow({
    fileOperationState: { kind: 'readingDocumentFile', openRoute },
    confirmationState: { kind: 'notAsked' },
  })

const FILE_READ: Loose = { type: 'documentFileRead', question: QN_5 }

const kindOf = (value: unknown): string => String((value as Loose)['kind'])
const effectsOf = (result: ReturnType<typeof advanceScreenSession>): Loose[] => [...result.effects].map((e) => e as unknown as Loose)

describe('fileFlow (S-5, OP-15) -- the baseline route asks nothing and imports as the overlay', () => {
  it('OP-15 「OP-2 のファイル選択と同じ画面を開き」: documentOpenAsked(baseline) reads a file on the baseline route', () => {
    const result = step(emptyScreenSession, { type: 'documentOpenAsked', openRoute: 'baseline' })
    const operation = flowOf(result.state)['fileOperationState'] as Loose
    expect(kindOf(operation)).toBe('readingDocumentFile')
    expect(operation['openRoute']).toBe('baseline')
    expect(effectsOf(result)).toEqual([{ type: 'readDocumentFile', openRoute: 'baseline' }])
  })

  it('OP-15 「OP-3 の 3 択は問わず、重ねに定めること（MUST）」: documentFileRead on the baseline route lands in importingDocument', () => {
    const result = step(readingWith('baseline'), FILE_READ)
    expect(kindOf(flowOf(result.state)['fileOperationState'])).toBe(BASELINE_READ_BRANCH?.to)
  })

  it('OP-15 「OP-3 の 3 択は問わず」: documentFileRead on the baseline route raises no U-56', () => {
    const result = step(readingWith('baseline'), FILE_READ)
    const surfaces = effectsOf(result).filter((e) => e['type'] === 'raiseFlowSurface')
    expect(surfaces).toEqual([])
  })

  it('OP-15 「重ねに定めること（MUST）」: the import it starts is the overlay (openChoice baseline)', () => {
    const result = step(readingWith('baseline'), FILE_READ)
    const imports = effectsOf(result).filter((e) => e['type'] === 'importIncomingDocument')
    expect(imports).toHaveLength(1)
    expect(valuesUnder(imports, 'openChoice')).toEqual(['baseline'])
  })

  it('OP-15 「OP-4 の確認は掛けない」: documentFileRead on the baseline route asks no question', () => {
    const result = step(readingWith('baseline'), FILE_READ)
    expect(kindOf(flowOf(result.state)['confirmationState'])).toBe('notAsked')
    expect(kindOf(flowOf(result.state)['fileOperationState'])).not.toBe('awaitingDiscardAnswer')
  })

  it('OP-15 「選ばずに閉じたときは何も変えない —— S-69 も書き換えない」: a baseline read that fails imports nothing', () => {
    const result = step(readingWith('baseline'), { type: 'documentOpenFailed' })
    expect(kindOf(flowOf(result.state)['fileOperationState'])).toBe('idle')
    expect(effectsOf(result).filter((e) => e['type'] === 'importIncomingDocument')).toEqual([])
  })
})

describe('fileFlow (control) -- the chooser and reopen routes keep OP-3 and OP-4', () => {
  it('OP-3 via U-56: documentFileRead on the chooser route raises U-56 and imports nothing yet', () => {
    const result = step(readingWith('chooser'), FILE_READ)
    expect(kindOf(flowOf(result.state)['fileOperationState'])).toBe('awaitingOpenChoice')
    expect(effectsOf(result)).toEqual([{ type: 'raiseFlowSurface', surfaceName: 'U-56' }])
  })

  it('OP-13 「OP-4 の確認は掛かること（MUST）」: documentFileRead on the reopen route asks QN-5', () => {
    const result = step(readingWith('reopen'), FILE_READ)
    expect(kindOf(flowOf(result.state)['fileOperationState'])).toBe('awaitingDiscardAnswer')
    expect(kindOf(flowOf(result.state)['confirmationState'])).toBe('questionAsked')
  })
})

const TEMPLATE_PATH = join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json')

const START = ((): Document => {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
})()

const s69Of = (document: Document): unknown => (document.documentSettings as unknown as Loose)[S_69_KEY]

const BASELINE_CALL: ImportCall<'baseline'> = {
  incoming: START,
  format: 'grsJson',
  choice: 'baseline',
  validationPassed: true,
  anotherOpenInProgress: false,
  unsavedEditsDiscardConfirmed: true,
  merge: null,
  defaultSettings: START.documentSettings,
  importSessionId: 'l1-588-baseline',
}

const STEP_BYTES = Buffer.byteLength(JSON.stringify(START), 'utf8')
const ROOMY_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: STEP_BYTES * (NOT_STORED_LIMITS['S-94'] + 4),
}
const CALM = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }

function replacedBy(from: HeldDocument, call: ReplacementCall): HeldDocument {
  let held = from
  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      held = next
    },
  }
  const audience: ChangeAudience = { deliver: () => {} }
  const outcome = replaceDocument(
    {
      defaultRowName: 'fixture default row name',
      newGroupId: 'fresh-row',
      readStamp: from.document.documentStamp,
      moment: CALM,
      call,
    },
    holder,
    audience,
  )
  if (!outcome.accepted) throw new Error(`${call.row} was refused: ${JSON.stringify(outcome.refusal)}`)
  return held
}

function heldAfterOverlay(): { before: HeldDocument; after: HeldDocument } {
  const before: HeldDocument = { document: START, history: emptyHistory<ChangeStep>() }
  const after = replacedBy(before, {
    row: 'RD-3',
    importing: BASELINE_CALL,
    historyLimits: ROOMY_LIMITS,
    editedBy: 'the case at the keyboard',
    updatedUtc: '2026-09-27T00:00:00Z',
  })
  return { before, after }
}

describe('FR-015 / UN-18 / UN-7 (S-6) -- the overlay import turns S-69 on, in one step that does not rewind it', () => {
  it('premise: the starting document holds no BaselineTask and S-69 at its default false', () => {
    expect(START.schedule.baselineTasks).toEqual([])
    expect(s69Of(START)).toBe(false)
  })

  it('FR-015 「重ねを読み込んだときは … S-69 を真にすること（MUST）」: importDocument(baseline) lands S-69 true', () => {
    const request: ImportRequest = { ...BASELINE_CALL, current: START }
    const outcome = importDocument(request)
    if (!outcome.ok) throw new Error(`the overlay was refused: ${JSON.stringify(outcome.refusal)}`)
    expect(outcome.document.schedule.baselineTasks.length, 'OP-9: the frame holds the matching tasks').toBeGreaterThan(0)
    expect(s69Of(outcome.document)).toBe(true)
  })

  it('FR-015 「S-69 を真にすること（MUST）」: the RD-3 write path lands S-69 true as well', () => {
    const { after } = heldAfterOverlay()
    expect(after.document.schedule.baselineTasks.length).toBeGreaterThan(0)
    expect(s69Of(after.document)).toBe(true)
  })

  it('UN-18 「取り込み 1 回を 1 段とする」: the overlay import (with its S-69 write) is exactly one step', () => {
    const { before, after } = heldAfterOverlay()
    expect(stepCount(after.history) - stepCount(before.history)).toBe(1)
    const outcome = importDocument({ ...BASELINE_CALL, current: START })
    if (!outcome.ok) throw new Error(`the overlay was refused: ${JSON.stringify(outcome.refusal)}`)
    expect(outcome.report.undo).toBe('oneStep')
  })

  it('UN-18 + UN-7 「表示の切り替え（各トグル）」 対象外: one undo takes the tasks back and leaves S-69 true', () => {
    const { after } = heldAfterOverlay()
    const back = replacedBy(after, { row: 'RD-1' })
    expect(stepCount(back.history), 'UN-18: nothing is left to undo').toBe(0)
    expect(back.document.schedule.baselineTasks, 'UN-18: the one step rewinds the overlay').toEqual([])
    expect(s69Of(back.document), 'UN-7: S-69 is not rewound').toBe(true)
  })
})
