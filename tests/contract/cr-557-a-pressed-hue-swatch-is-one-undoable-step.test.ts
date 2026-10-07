// CR-557 seams S-3 and S-4: a pressed theme hue swatch issues CM-5 once, and one undo takes it back.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { commandFromFieldCommit } from '../../src/adapter/input-command-translator/field-commit'
import type { InputContext } from '../../src/adapter/input-command-translator/input-command-translator'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  AppHeaderItems,
  FieldCommit,
  PropertiesPanel,
  ScreenFrame,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  NOT_STORED_LIMITS,
  emptyHistory,
  stepCount,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  applyDocumentChange,
  replaceDocument,
  type ApplyOutcome,
  type ChangeAudience,
  type ChangeStep,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type SettingsLimits,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import {
  descendants,
  oneByRole,
  surfaceOf,
  wire,
  type FakeElement,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const CLAUSE_ONE_CM_5 =
  'その欄には 表 T-305 の行を同表の順に、1 段に `_assets/tbl-settings.md` の 表 T-206 の `S-368` 個ずつ並べ、押された行の色相で 表 T-108 の `CM-5` を 1 回発行すること（MUST）。'
const CLAUSE_UN_13 = '取り消しの段は 表 T-027 の `UN-13` に従う。'
const CLAUSE_NO_STEP = '⛔ 書き込みが文書の値を 1 つも変えなかったときは、取り消しの段を残さないこと（MUST）'
const CLAUSE_EXCEPTION =
  '⭐ ただし、別の要求がその入口を本面の欄として置いたときは、その欄だけは、その要求に従って選ばせること（MUST） —— `FR-041` のテーマ色の欄がこれである。'

const K_60 = 'K-60'
const HUE_KEY = { holder: 'project', column: 'themeHue' } as const
const INSIDE = '対象'

// see T-216
const S_73 = specTable('T-216').rows.find((one) => one.id === 'S-73')
const S_73_DEFAULT = Number(bare(S_73?.by['既定'] ?? ''))
const HUE_MIN = Number(bare(S_73?.by['下限'] ?? ''))
const HUE_MAX = Number(bare(S_73?.by['上限'] ?? ''))

// see T-305
const ROSTER = specTable('T-305').rows.map((row) => {
  const cell = row.by['色相'] ?? ''
  return { rowId: row.id, hue: cell.includes('S-73') ? S_73_DEFAULT : Number(bare(cell)) }
})

// see T-108
const CM_5 = bare(specTable('T-108').rows.find((one) => one.id === 'CM-5')?.by['確定名'] ?? '')

// see T-027
const UN_13_CLASS = bare(specTable('T-027').rows.find((one) => one.id === 'UN-13')?.by['区分'] ?? '')

const TEMPLATE_PATH = join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json')

function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

const withHue = (document: Document, hue: number): Document => ({
  ...document,
  schedule: { ...document.schedule, project: { ...document.schedule.project, themeHue: hue } },
})

const START = withHue(templateDocument(), S_73_DEFAULT)

const hueOf = (document: Document): number => document.schedule.project.themeHue

const contextOf = (document: Document): InputContext =>
  ({ document, screen: { ...emptyScreenSession.screen, themePreference: 'light' }, selection: emptySelection() }) as unknown as InputContext

const translate = (text: string, document: Document = START): readonly DocumentCommand[] =>
  commandFromFieldCommit({ row: K_60, key: HUE_KEY, text } as FieldCommit, contextOf(document))

const SETTINGS_LIMITS: SettingsLimits = {
  zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
  zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
  rowAreaWidthWithoutPanels: 982,
}

const STEP_BYTES = Buffer.byteLength(JSON.stringify(START), 'utf8')

const ROOMY_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: STEP_BYTES * (NOT_STORED_LIMITS['S-94'] + 2),
}

const CALM = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }

interface Bench {
  readonly held: HeldDocument
  write(commands: readonly DocumentCommand[]): ApplyOutcome
  undo(): Document
  depth(): number
}

// see FR-031, T-027
function bench(document: Document = START): Bench {
  let held: HeldDocument = { document, history: emptyHistory<ChangeStep>() }
  let writes = 0
  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      held = next
    },
  }
  const audience: ChangeAudience = { deliver: () => {} }
  return {
    get held() {
      return held
    },
    write: (commands) => {
      writes += 1
      return applyDocumentChange(
        {
          defaultRowName: 'fixture default row name',
          readStamp: held.document.documentStamp,
          commands,
          moment: CALM,
          historyLimits: ROOMY_LIMITS,
          settingsLimits: SETTINGS_LIMITS,
          editedBy: 'the case at the panel',
          updatedUtc: new Date(Date.UTC(2026, 8, 27, 0, 0, writes)).toISOString().replace(/\.\d{3}Z$/, 'Z'),
        },
        holder,
        audience,
      )
    },
    undo: () => {
      const outcome = replaceDocument(
        {
          defaultRowName: 'fixture default row name',
          newGroupId: 'fresh-row',
          readStamp: held.document.documentStamp,
          moment: CALM,
          call: { row: 'RD-1' },
        },
        holder,
        audience,
      )
      if (!outcome.accepted) throw new Error(`the undo was refused: ${JSON.stringify(outcome.refusal)}`)
      return outcome.document
    },
    depth: () => stepCount(held.history),
  }
}

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
} as unknown as ScreenView

// see U-25
const U_25 = bare(specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '')

function settingsPanel(document: Document): PropertiesPanel {
  const session = {
    ...emptyScreenSession,
    screen: {
      ...emptyScreenSession.screen,
      screenLanguage: 'ja',
      helpLanguage: 'ja',
      themePreference: 'light',
      propertiesPanelContentState: { kind: 'documentSettingsDisplayed' },
    },
  } as unknown as ScreenSession
  const readings = {
    themePreference: 'light',
    themeHue: hueOf(document),
    selectedGroupIds: [],
    selectedResourceUids: [],
    propertiesSubject: null,
    propertiesShowing: 'documentSettings',
    notices: [],
    rowBoxes: [],
  } as unknown as ScreenViewReadings
  const panel = propertiesPanelFromSelection(
    document.schedule,
    document.documentSettings,
    emptySelection(),
    session,
    readings,
  )
  if (panel === null) throw new Error('premise: the panel showing the document settings is drawn')
  return panel
}

function drawn(document: Document): Stage {
  const built = wire({ preference: 'light', hue: hueOf(document) }, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, propertiesPanel: settingsPanel(document) })
  return built
}

// WHY: the panel's own commands are icon entries (data-icon) and may be drawn beside the first
// field; only the field's own buttons are swatches.
function swatchesOf(built: Stage): FakeElement[] {
  const panel = oneByRole(built.root(), U_25)
  const inField = (node: FakeElement): boolean => {
    let at: FakeElement | null = node
    while (at !== null && at !== panel) {
      if (at.getAttribute('data-field-row') === K_60) return true
      at = at.parentNode
    }
    return false
  }
  return descendants(panel).filter(
    (one) => one.tagName === 'BUTTON' && one.getAttribute('data-icon') === null && inField(one),
  )
}

function raise(built: Stage, node: FakeElement, type: string): void {
  const event = {
    type,
    key: '',
    button: 0,
    detail: 1,
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: null,
    defaultPrevented: false,
    preventDefault(): void {
      ;(this as { defaultPrevented: boolean }).defaultPrevented = true
    },
    stopPropagation(): void {},
  } as unknown as FakeEvent
  let at: FakeElement | null = node
  while (at !== null) {
    for (const one of [...built.world.registrations]) {
      if (one.node === at && one.type === type) {
        ;(event as { currentTarget: FakeElement | null }).currentTarget = at
        one.listener(event)
      }
    }
    at = at.parentNode
  }
}

// WHY: the shared fake has no dispatchEvent, so the change a browser would bubble from the pressed
// entrance is raised after the click, the way tests of the colour field press a swatch.
function press(built: Stage, node: FakeElement): FieldCommit | null {
  raise(built, node, 'click')
  raise(built, node, 'change')
  return surfaceOf(built).readFieldCommit()
}

describe('CR-557 -- the manuscript still says what these cases read', () => {
  it.each([CLAUSE_ONE_CM_5, CLAUSE_UN_13, CLAUSE_NO_STEP, CLAUSE_EXCEPTION])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('premise: table T-108 names CM-5 and table T-027 files UN-13 as undoable', () => {
    expect(CM_5).not.toBe('')
    expect(UN_13_CLASS).toBe(INSIDE)
  })
})

describe('CR-557 S-3 -- the committed hue translates to CM-5 alone', () => {
  it.each(ROSTER.map((one) => [one.rowId, one.hue] as const))(
    `FR-041 "${CLAUSE_ONE_CM_5}" -- %s (hue %s)`,
    (_rowId, hue) => {
      expect(translate(String(hue))).toEqual([{ kind: CM_5, hue }])
    },
  )

  it('the S-73 bounds themselves translate', () => {
    expect(translate(String(HUE_MIN))).toEqual([{ kind: CM_5, hue: HUE_MIN }])
    expect(translate(String(HUE_MAX))).toEqual([{ kind: CM_5, hue: HUE_MAX }])
  })

  it.each([String(HUE_MIN - 1), String(HUE_MAX + 1), '12.5', 'abc', ''])(
    'a text outside the integers of S-73 translates to nothing: %j',
    (text) => {
      expect(translate(text)).toEqual([])
    },
  )
})

describe('CR-557 S-4 -- pressing a swatch hands back the commit of its row', () => {
  it(`FR-041 "${CLAUSE_ONE_CM_5}" -- each swatch commits its own T-305 hue`, () => {
    ROSTER.forEach((row, index) => {
      const built = drawn(START)
      const swatches = swatchesOf(built)
      expect(swatches, 'one swatch per T-305 row').toHaveLength(ROSTER.length)
      const commit = press(built, swatches[index] as FakeElement)
      expect(commit, `${row.rowId}: nothing was handed back`).not.toBeNull()
      expect(commit?.row).toBe(K_60)
      expect(commit?.key).toEqual(HUE_KEY)
      expect(commit?.text).toBe(String(row.hue))
    })
  })
})

describe('CR-557 -- the press, the document and the history (CM-5, UN-13)', () => {
  const target = ROSTER.find((one) => one.hue !== S_73_DEFAULT)

  it(`FR-041 "${CLAUSE_ONE_CM_5}" / "${CLAUSE_UN_13}" -- one press sets themeHue in one step, one undo returns it`, () => {
    if (target === undefined) throw new Error('premise: table T-305 has a row off the S-73 default')
    const built = drawn(START)
    const index = ROSTER.indexOf(target)
    const commit = press(built, swatchesOf(built)[index] as FakeElement)
    expect(commit).not.toBeNull()
    if (commit === null) return
    const one = bench()
    const commands = commandFromFieldCommit(commit, contextOf(one.held.document))
    expect(commands).toEqual([{ kind: CM_5, hue: target.hue }])
    expect(one.write(commands).accepted).toBe(true)
    expect(hueOf(one.held.document)).toBe(target.hue)
    expect(one.depth()).toBe(1)
    expect(hueOf(one.undo())).toBe(S_73_DEFAULT)
    expect(one.depth()).toBe(0)
  })

  it(`FR-031 T-027 "${CLAUSE_NO_STEP}" -- pressing the swatch of the current hue leaves no step`, () => {
    const built = drawn(START)
    const current = ROSTER.findIndex((one) => one.hue === hueOf(START))
    expect(current, 'premise: the document hue is on the roster').toBeGreaterThanOrEqual(0)
    const commit = press(built, swatchesOf(built)[current] as FakeElement)
    expect(commit).not.toBeNull()
    if (commit === null) return
    const one = bench()
    const outcome = one.write(commandFromFieldCommit(commit, contextOf(one.held.document)))
    expect(outcome.accepted).toBe(true)
    expect(hueOf(one.held.document)).toBe(S_73_DEFAULT)
    expect(one.depth()).toBe(0)
  })

  it(`FR-031 T-027 "${CLAUSE_NO_STEP}" -- a second press of the same swatch adds no second step`, () => {
    if (target === undefined) throw new Error('premise: table T-305 has a row off the S-73 default')
    const one = bench()
    expect(one.write(translate(String(target.hue), one.held.document)).accepted).toBe(true)
    expect(one.write(translate(String(target.hue), one.held.document)).accepted).toBe(true)
    expect(one.depth()).toBe(1)
    expect(hueOf(one.undo())).toBe(S_73_DEFAULT)
  })
})
