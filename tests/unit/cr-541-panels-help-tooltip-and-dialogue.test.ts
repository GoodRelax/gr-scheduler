// CR-541: what the screen shows -- document settings are read only in the properties panel (FR-072),
// a dependency kind is shown by its abbreviation (T-018), Enter in the dialogue field settles the
// utterance (T-036 SK-19), the help title row stays on top while the body scrolls (FR-036), and a
// task's tooltip stands at the pointer and takes no pointer (T-028 IN-3 / EZ-6).
// Expectations come from docs/spec only.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  OpenModal,
  ScreenView,
  ScreenViewReadings,
  Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, selectionWith } from '../../src/entity/document-model/selection/selection'
import { domScreenSurface, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, bareAll, specTable } from '../contract/spec-table'
import {
  descendants,
  FakeElement,
  oneByRole,
  selfAndDescendants,
  stage,
  styleMap,
  wiringOf,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { REQUIREMENTS, rowDocument, rowOf, taskOf } from './cr-541-stage'

const Q07 = '⭐ パネルが文書の設定を出しているあいだ、その欄は読むだけとすること（MUST）'
const Q08 = 'だけとすること（MUST）。⛔ 編集できると示してはならない（MUST NOT）'
const Q17 = '⭐ 画面に依存の種別を出すときは、本表の `名` の欄の略号（括弧の前の `FS` / `SF` / `FF` / `SS`）で出すこと（MUST）'
const Q18 = '（MUST）。⛔ 保存した数（`linkType`）をそのまま出してはならない（MUST NOT）'
const Q21 = '⭐ 焦点が対話欄（`FR-066`）にあるときは、打った発話を確定して送ること（MUST）'
const Q34 = '⭐ 本文を下へ送っても、題の行をヘルプの上端に留めて描くこと（MUST）'
const Q38 = '説明をポインタの点に出し、ポインタを受け取らせないこと（MUST）'

describe('CR-541 -- the clauses still stand in the manuscript', () => {
  it.each([Q07, Q08, Q17, Q18, Q21, Q34, Q38])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// ---------------------------------------------------------------------------
// The properties panel, as the screen renderer describes it
// ---------------------------------------------------------------------------

const READINGS = {
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: 'selection',
  notices: [],
  confirmation: null,
  rowBoxes: [],
} as unknown as ScreenViewReadings

const sessionShowing = (showing: 'selection' | 'documentSettings'): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    language: 'ja',
    propertiesPanelContentState:
      showing === 'documentSettings'
        ? { kind: 'documentSettingsDisplayed', returnSubject: null }
        : { kind: 'selectionDisplayed', subject: { selection: emptySelection(), groupIds: [] } },
  },
})

// T-018: the abbreviation is the 名 cell before its bracket, keyed by the linkType cell.
const KINDS = specTable('T-018').rows.map((one) => ({
  linkType: Number(bare(one.by['`linkType`'] ?? one.cells[1] ?? '')),
  abbreviation: (bare(one.by['名'] ?? one.cells[2] ?? '').split('（')[0] ?? '').trim(),
}))

// fig-erd-detail.md: `AT-46` is `Dependency.linkType`, the seat the panel's field is keyed by.
const LINK_TYPE_SEAT = 'AT-46'
const ERD_DETAIL = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'), 'utf8')

const dependencyDocument = (linkType: number) =>
  rowDocument([{ id: 'row-1', parentId: null }, { id: 'row-2', parentId: null }], {}, {
    tasks: [
      taskOf(1),
      taskOf(2, {
        start: '2026-04-13T08:00:00',
        finish: '2026-04-17T17:00:00',
        dependencies: [{ predecessorUid: 1, linkType, lag: null, lagFormat: null, carry: {}, carryElements: [] }],
      }),
    ],
  })

describe('FR-072 -- the document settings are read only in the panel', () => {
  const panel = () => {
    const document = rowDocument([{ id: 'row-1', parentId: null }])
    return propertiesPanelFromSelection(
      document.schedule as unknown as Schedule,
      document.documentSettings as never,
      emptySelection(),
      sessionShowing('documentSettings'),
      READINGS,
    )
  }

  it(Q07, () => {
    const described = panel()
    expect(described?.showing, 'premise: the panel shows the document settings').toBe('documentSettings')
    expect(described!.fields.length, 'premise: it shows some settings').toBeGreaterThan(0)
    const editable = described!.fields.filter((one) => one.isEditable).map((one) => one.row)
    expect(editable, 'no field is editable').toEqual([])
  })

  it(Q08, () => {
    const described = panel()
    const withControls = described!.fields.filter((one) => one.controls.length > 0).map((one) => one.row)
    expect(withControls, 'no field offers a control to change it').toEqual([])
  })
})

describe('T-018 -- a dependency kind on the screen', () => {
  it('premise: AT-46 is Dependency.linkType', () => {
    expect(ERD_DETAIL).toContain('| AT-46 | `Dependency` | `linkType` |')
  })

  it('premise: table T-018 gives the four abbreviations', () => {
    expect(KINDS.map((one) => one.abbreviation).sort()).toEqual(['FF', 'FS', 'SF', 'SS'])
    expect(KINDS.map((one) => one.linkType).sort()).toEqual([0, 1, 2, 3])
  })

  it.each(KINDS.map((one) => [one.abbreviation, one.linkType] as const))(`${Q17} -- %s (linkType %s)`, (abbreviation, linkType) => {
    const document = dependencyDocument(linkType)
    const described = propertiesPanelFromSelection(
      document.schedule as unknown as Schedule,
      document.documentSettings as never,
      selectionWith(emptySelection(), { kind: 'dependency', successorUid: 2, ordinal: 0 }),
      sessionShowing('selection'),
      READINGS,
    )
    const texts = (described?.fields ?? []).map((one) => one.text)
    expect(texts.some((one) => one.includes(abbreviation)), `the kind is shown as ${abbreviation}: ${JSON.stringify(texts)}`).toBe(true)
  })

  it.each(KINDS.map((one) => [one.abbreviation, one.linkType] as const))(`${Q18} -- %s (linkType %s)`, (_abbreviation, linkType) => {
    const document = dependencyDocument(linkType)
    const described = propertiesPanelFromSelection(
      document.schedule as unknown as Schedule,
      document.documentSettings as never,
      selectionWith(emptySelection(), { kind: 'dependency', successorUid: 2, ordinal: 0 }),
      sessionShowing('selection'),
      READINGS,
    )
    const kindFields = (described?.fields ?? []).filter((one) => one.row === LINK_TYPE_SEAT)
    expect(kindFields.length, `premise: the panel carries the ${LINK_TYPE_SEAT} field`).toBeGreaterThan(0)
    for (const one of kindFields) expect(one.text.trim(), 'the stored number is not shown as it is').not.toBe(String(linkType))
  })
})

// ---------------------------------------------------------------------------
// The DOM surface
// ---------------------------------------------------------------------------

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

function viewWith(part: Partial<ScreenView>): ScreenView {
  return {
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: { documentTitle: null, openedFileName: null, fileSavedAt: null, fileNeverSavedText: '', commands: [], language: 'ja' },
    rowTitlePanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
    ...part,
  }
}

function raise(built: Stage, node: FakeElement, type: string, extra: Record<string, unknown> = {}): void {
  const event = {
    type,
    key: '',
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
    ...extra,
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

describe('SK-19 -- Enter in the dialogue field', () => {
  it(Q21, () => {
    const DIALOGUE_FIELD = bare(rowOf('T-103', 'U-44').by['確定名（英）'] ?? '')
    const ENTER = bare(rowOf('T-036', 'SK-19').by['割当'] ?? '')
    expect(ENTER).toBe('Enter')
    const built = stage({ 'App Header': 37 })
    const surface = domScreenSurface(wiringOf(built, THEME))
    surface.showScreenView(viewWith({ dialogueField: { messages: [] } }))
    const field = oneByRole(built.root(), DIALOGUE_FIELD)
    const entry = descendants(field).find((one) => one.tagName === 'INPUT' || one.tagName === 'TEXTAREA')
    expect(entry, 'premise: the field has an entry').toBeDefined()
    entry!.focus()
    raise(built, entry!, 'focusin')
    entry!.value = 'move the review to Friday'
    raise(built, entry!, 'input')
    expect(surface.readDialogueInput(), 'premise: nothing is settled before Enter').toBeNull()
    raise(built, entry!, 'keydown', { key: ENTER })
    const said = surface.readDialogueInput()
    expect(said?.isSettled).toBe(true)
    expect(said?.text).toBe('move the review to Friday')
  })
})

describe('FR-036 -- the help title row stays on top', () => {
  it(Q34, () => {
    const HELP_MODAL = bareAll(rowOf('T-103', 'U-30').by['確定名（英）'] ?? '').find((one) => one.startsWith('Help')) ?? ''
    expect(HELP_MODAL).toBe('Help Modal')
    const HELP: OpenModal = {
      surface: HELP_MODAL,
      heading: 'Help heading',
      commands: [],
      legend: 'IC-22',
      language: 'ja',
      licenceText: 'Licence text',
      copyrightNotice: 'Copyright notice',
      attributions: ['An attribution'],
      entries: [
        { table: 'T-036', row: 'SK-19', text: 'Settle the edit', press: null, keys: 'Enter', icon: 'IC-5', kind: 'key', column: 'c1', block: 'b1', segment: null, glyphs: ['IC-5'], indent: false },
      ],
    } as unknown as OpenModal
    const built = stage({ 'App Header': 37 })
    domScreenSurface(wiringOf(built, THEME)).showScreenView(viewWith({ openModal: HELP }))
    const modal = oneByRole(built.root(), HELP_MODAL)
    const all = selfAndDescendants(modal)
    const holdsHeading = (one: FakeElement): boolean => one.textContent.includes('Help heading')
    const scrollers = all.filter((one) => /^(auto|scroll)$/.test(styleMap(one).get('overflow-y') ?? styleMap(one).get('overflow') ?? ''))
    expect(scrollers.length, 'premise: the help body scrolls vertically').toBeGreaterThan(0)
    const titleRow = all.filter(holdsHeading).pop()
    expect(titleRow, 'premise: the title is drawn').toBeDefined()
    const chain: FakeElement[] = []
    for (let at: FakeElement | null = titleRow!; at !== null && at !== modal.parentNode; at = at.parentNode) chain.push(at)
    const insideScroller = scrollers.some((one) => chain.includes(one) && one !== titleRow)
    const pinned = chain.some((one) => styleMap(one).get('position') === 'sticky' && /^0(px)?$/.test(styleMap(one).get('top') ?? ''))
    expect(!insideScroller || pinned, 'the title row is outside what scrolls, or held at its top').toBe(true)
  })
})

describe('IN-3 / EZ-6 -- a task tooltip', () => {
  it(Q38, () => {
    const TOOLTIP = bare(rowOf('T-103', 'U-53').by['確定名（英）'] ?? '')
    const tip: Tooltip = {
      anchor: { kind: 'task', taskUid: 3 },
      text: 'A task 2026-09-01 / 2026-09-12',
      assignment: null,
      at: { x: 200, y: 150 },
    }
    const built = stage({ 'App Header': 37 })
    domScreenSurface(wiringOf(built, THEME)).showScreenView(viewWith({ tooltips: [tip] }))
    const shown = oneByRole(built.root(), TOOLTIP).children[0] as FakeElement | undefined
    expect(shown, 'premise: the tooltip is drawn').toBeDefined()
    const style = styleMap(shown!)
    expect(style.get('pointer-events'), 'it takes no pointer').toBe('none')
    expect(Number.parseFloat(style.get('left') ?? 'NaN'), 'it stands at the pointer').toBe(200)
    expect(Number.parseFloat(style.get('top') ?? 'NaN')).toBe(150)
  })
})
