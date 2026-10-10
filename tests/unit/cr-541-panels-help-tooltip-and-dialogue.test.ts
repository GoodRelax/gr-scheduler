// CR-541: what the screen shows in the properties panel, the help, the tooltip and the dialogue.

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
import {
  NOT_STORED_HELP_SIZES,
  domScreenSurface,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
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
import { REQUIREMENTS, taskGroupDocument, rowOf, taskOf } from './cr-541-stage'

const Q07 = '⭐ パネルが文書の設定を出しているあいだ、その欄は読むだけとすること（MUST）'
const Q08 = 'だけとすること（MUST）。⛔ 編集できると示してはならない（MUST NOT）'
const Q08A = '⭐ ただし、別の要求がその入口を本面の欄として置いたときは、その欄だけは、その要求に従って選ばせること（MUST） —— `FR-041` のテーマ色の欄がこれである。'
// WHY: CR-690 -- the order of the face's fields moved to table T-369, and no placing requirement names another field.
const Q08B = '⭐ 本面の欄の並びと欄の名は 表 T-369 に従うこと（MUST）'
const THEME_HUE_FIELD = 'K-60'
// WHY: table T-369 (CR-690) places under K-60: display scale, font size, the width's fix and width (T-368),
// the status date, the fit span's fix and span (T-367), then the parent progress tolerance (FR-131).
const LATER_PLACED_FIELDS = ['K-125', 'K-85', 'K-143', 'K-71', 'IC-44', 'K-142', 'K-141', 'K-140']
// WHY: FO-11's read-out holds the copy entrance (FX-7), a control on a field that is itself read only.
const SHOWN_SPAN_FIELD = 'FX-6'
const Q17 = '⭐ 画面に依存の種別を出すときは、本表の `名` の欄の略号（括弧の前の `FS` / `SF` / `FF` / `SS`）で出すこと（MUST）'
const Q18 = '（MUST）。⛔ 保存した数（`linkType`）をそのまま出してはならない（MUST NOT）'
const Q21 = '⭐ 焦点が対話欄（`FR-066`）にあるときは、打った発話を確定して送ること（MUST）'
const Q34 = '⛔ タイトルバーを本文のスクロールの中に置いてはならない（MUST NOT）'
const Q38 = '説明をポインタの点に出すこと（MUST）'
const IN_3_TAKES_NO_POINTER = '⭐ ツールチップはポインタを受け取らず、下へ通すこと（MUST）'
const IN_7_BELOW =
  '左上の隅を、ポインタの点と同じ横の位置で、点から `_assets/tbl-settings.md` の 表 T-206 の `S-460` だけ下に置く'

describe('CR-541 -- the clauses still stand in the manuscript', () => {
  it.each([Q07, Q08, Q08A, Q08B, Q17, Q18, Q21, Q34, Q38, IN_3_TAKES_NO_POINTER, IN_7_BELOW])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const READINGS = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  isMilestoneListOpen: false,
  isPaletteMinimized: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: 'selection',
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
} as unknown as ScreenViewReadings

const sessionShowing = (showing: 'selection' | 'documentSettings'): ScreenSession => ({
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage: 'ja',
    helpLanguage: 'ja',
    propertiesPanelContentState:
      showing === 'documentSettings'
        ? { kind: 'documentSettingsDisplayed' }
        : { kind: 'selectionDisplayed', subject: { selection: emptySelection(), groupIds: [] } },
  },
})

const KINDS = specTable('T-018').rows.map((one) => ({
  linkType: Number(bare(one.by['`linkType`'] ?? one.cells[1] ?? '')),
  abbreviation: (bare(one.by['名'] ?? one.cells[2] ?? '').split('（')[0] ?? '').trim(),
}))

// see T-016, IR-1
// WHY: a field carries its T-016 row id; the dependency kind is the Dependency row of linkType.
const LINK_TYPE_SEAT =
  specTable('T-016').rows.find(
    (one) => bare(one.by['対象'] ?? '') === 'Dependency' && (one.by['列（`GRS JSON`）'] ?? '').trim() === '`linkType`',
  )?.id ?? 'no T-016 row for Dependency.linkType'
const ERD_DETAIL = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'), 'utf8')

const dependencyDocument = (linkType: number) =>
  taskGroupDocument([{ id: 'task-group-1', parentId: null }, { id: 'task-group-2', parentId: null }], {}, {
    tasks: [
      taskOf(1),
      taskOf(2, {
        start: '2026-04-13T08:00:00',
        finish: '2026-04-17T17:00:00',
        dependencies: [{ predecessorUid: 1, linkType, lag: null, lagFormat: null, carry: {}, carryElements: [] }],
      }),
    ],
  })

describe('FR-072 -- the document settings are read only in the panel, but for the field FR-041 places there', () => {
  const panel = () => {
    const document = taskGroupDocument([{ id: 'task-group-1', parentId: null }])
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
    expect(editable, 'no field is editable but the fields table T-369 places')
      .toEqual([THEME_HUE_FIELD, ...LATER_PLACED_FIELDS])
  })

  it(Q08, () => {
    const described = panel()
    const withControls = described!.fields.filter((one) => one.controls.length > 0).map((one) => one.row)
    const placedWithControls = [THEME_HUE_FIELD, ...LATER_PLACED_FIELDS.slice(0, -1), SHOWN_SPAN_FIELD, ...LATER_PLACED_FIELDS.slice(-1)]
    expect(withControls, 'no field offers a control to change it but the fields table T-369 places')
      .toEqual(placedWithControls)
  })

  it(Q08A, () => {
    const described = panel()
    const hue = described!.fields.find((one) => one.row === THEME_HUE_FIELD)
    expect(hue?.isEditable, 'the excepted field is the one FR-041 places').toBe(true)
    expect(hue?.controls.map((one) => one.key), 'and it writes the theme hue').toEqual([
      { holder: 'project', column: 'themeHue' },
    ])
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

const THEME: ScreenTheme = { preference: 'light', hue: 214 }

function viewWith(part: Partial<ScreenView>): ScreenView {
  return {
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: { documentTitle: null, openedFileName: null, fileSavedAt: null, fileSavedByteLength: null, fileNeverSavedText: '', commands: [], language: 'ja' },
    taskGroupPanel: { pinnedTitles: [], titles: [] },
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
    surface.showScreenView(viewWith({ dialogueField: { messages: [], heading: '', shown: 'normal', titleEntries: [], place: { at: null, size: null }, canvas: { x: 0, y: 0, width: 800, height: 600 } } }))
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

describe('FR-036 -- the help title row stands outside what scrolls', () => {
  it(Q34, () => {
    const HELP_MODAL = bareAll(rowOf('T-103', 'U-30').by['確定名（英）'] ?? '').find((one) => one.startsWith('Help')) ?? ''
    expect(HELP_MODAL).toBe('Help Modal')
    const HELP: OpenModal = {
      surface: HELP_MODAL,
      heading: 'Help heading',
      commands: [],
      legend: 'IC-22',
      language: 'ja',
      helpLanguage: 'ja',
      windowState: 'normal',
      licenseText: 'License text',
      copyrightNotice: 'Copyright notice',
      attributions: ['An attribution'],
      helpLegal: { licensedUnder: 'LicensedUnderHere', fullText: 'FullTextHere' },
      area: { belowAppHeader: { x: 0, y: 37, width: 1280, height: 763 } },
      footnotes: [],
      entries: [
        { table: 'T-036', row: 'SK-19', text: 'Settle the edit', press: null, keys: 'Enter', icon: 'IC-5', kind: 'key', column: 'c1', block: 'b1', segment: null, glyphs: ['IC-5'] },
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
    const insideScroller = scrollers.filter((one) => chain.includes(one) && one !== titleRow)
    expect(insideScroller.length, 'the title row is outside what scrolls').toBe(0)
  })
})

describe('IN-3 / EZ-6 -- a task tooltip', () => {
  it(Q38, () => {
    const TOOLTIP = bare(rowOf('T-103', 'U-53').by['確定名（英）'] ?? '')
    const tip: Tooltip = {
      anchor: { kind: 'task', taskUid: 3 },
      text: 'A task',
      assignment: null,
      at: { x: 200, y: 150 },
    }
    // WHY: a window the tip fits in below and to the right, so IN-7 leaves it at its first place.
    const built = stage({ 'App Header': 37, [TOOLTIP]: 700 })
    built.world.widthsByRole.set(TOOLTIP, 1000)
    domScreenSurface(wiringOf(built, THEME)).showScreenView(viewWith({ tooltips: [tip] }))
    const shown = oneByRole(built.root(), TOOLTIP).children[0] as FakeElement | undefined
    expect(shown, 'premise: the tooltip is drawn').toBeDefined()
    const style = styleMap(shown!)
    expect(style.get('pointer-events'), IN_3_TAKES_NO_POINTER).toBe('none')
    expect(Number.parseFloat(style.get('left') ?? 'NaN'), 'it stands at the pointer').toBe(200)
    expect(Number.parseFloat(style.get('top') ?? 'NaN'), IN_7_BELOW).toBe(150 + NOT_STORED_HELP_SIZES['S-460'])
  })
})
