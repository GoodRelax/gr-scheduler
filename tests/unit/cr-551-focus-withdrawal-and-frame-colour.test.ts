// CR-551 JDG-406 / JDG-408: a withdrawn focus request lets its keys go (IN-5a), and the highlight box frame colour field (PR-22, CV-9).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { InputModifiers } from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { frameLoop, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import {
  byRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  type FakeElement,
  type FakeEvent,
  type Stage,
} from '../fixtures/fake-browser'
import { pointerOf, rowDocument, taskOf, SCREEN } from './cr-541-stage'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  properties: { rowId: string; label: { ja: string } }[]
  colourField: { part: string; text: { ja: string } }[]
}

const rowIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}
const wordOf = (part: string): string => WORDS.colourField.find((one) => one.part === part)?.text.ja ?? ''

const IN_5A_WITHDRAWN =
  '焦点を置く求めが取り下げられたとき（`IN-4` の `Esc`、欄の外の押し、パネルを閉じたとき、人が焦点を別の所へ動かしたとき、選択が変わったとき、求めた欄がパネルに無いとき）は、本段を当てない。'
const IN_5A_NOT_IN_PANEL = '求めた欄がパネルに無いこと（例: 行を 2 つ選ぶと行名の欄は描かれない）も取り下げに数える'
const CV_9_FRAME = 'その欄では透明の場所は空けたままとし、テーマに戻す入口はその後ろに置く（枠の色もテーマ追随へ戻せる）。'

// see SK-14
const PALETTE_KEY = bare(rowIn('T-036', 'SK-14').cells[1] ?? '')
// see T-016, PR-22
const PR_22 = rowIn('T-016', 'PR-22')
const FRAME_ROW = PR_22.id
const FRAME_WORD = WORDS.properties.find((one) => one.rowId === FRAME_ROW)?.label.ja ?? ''
// see T-294
const TRANSPARENT = bare(rowIn('T-294', 'S-324').cells[1] ?? '')
const BLUE = bare(rowIn('T-294', 'S-319').cells[1] ?? '')
const NAMED = specTable('T-294').rows.map((row) => bare(row.cells[1] ?? '')).filter((one) => one !== TRANSPARENT)
const CUSTOM_WORD = wordOf('custom')
const THEME_WORD = wordOf('theme')
const PROPERTIES_PANEL = bare(rowIn('T-103', 'U-25').by['確定名（英）'] ?? '')

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const partOn = (part: string, entry: string | null, rowGroupId: string | null = null): ScreenPart =>
  ({ part, entry, format: null, rowGroupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null }) as unknown as ScreenPart

interface Bench {
  readonly loop: FrameLoop
  readonly built: Stage
  click(x: number, y: number, part?: ScreenPart | null, mods?: Partial<InputModifiers>): void
  doubleClick(x: number, y: number, part?: ScreenPart | null, mods?: Partial<InputModifiers>): void
  pressOnPanel(): void
  press(part: string, entry: string): void
  key(key: string): void
  drain(): void
  view(): ScreenView
}

function fieldDrawn(built: Stage, row: string): boolean {
  let root: FakeElement
  try {
    root = built.root()
  } catch {
    return false
  }
  const panel = byRole(root, PROPERTIES_PANEL)[0]
  return panel !== undefined && selfAndDescendants(panel).some((one) => one.getAttribute('data-field-row') === row)
}

// WHY: the host never lets the focus into a drawn field here, so a focus request stays pending until withdrawn.
function bench(document: Record<string, unknown>): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': SCREEN.appHeaderHeight })
  const drawn = surfaceOf(built)
  const views: ScreenView[] = []
  let aimed: ScreenPart | null = null
  const surface = {
    showScreenView: (view: ScreenView) => {
      views.push(view)
      drawn.showScreenView(view)
    },
    readDialogueInput: () => drawn.readDialogueInput(),
    readFieldCommit: () => drawn.readFieldCommit(),
    hasUnsettledTextEntry: () => drawn.hasUnsettledTextEntry(),
    readFieldEditNotices: () => (drawn as unknown as { readFieldEditNotices?: () => unknown[] }).readFieldEditNotices?.() ?? [],
    readScreenPartAt: () => aimed,
  } as unknown as ScreenSurface
  const loop = frameLoop({ showSvg: () => undefined } as never, document as never, SCREEN, {
    surface,
    language: 'ja',
    // WHY: a field the panel drew keeps the focus out (false, asked again); a field it did not draw is told
    // as not there (null), the way a host that cannot find the element answers.
    focusPropertyField: (row: string) => (fieldDrawn(built, row) ? false : null),
  })
  drain()
  const send = (input: Parameters<FrameLoop['receiveInput']>[0]): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    built,
    click: (x, y, part = null, mods = {}) => {
      aimed = part
      send(pointerOf('down', x, y, mods))
      send(pointerOf('up', x, y, mods))
      aimed = null
    },
    doubleClick: (x, y, part = null, mods = {}) => {
      aimed = part
      send(pointerOf('down', x, y, mods))
      send(pointerOf('up', x, y, mods))
      send({ ...pointerOf('down', x, y, mods), clickCount: 2 } as never)
      send({ ...pointerOf('up', x, y, mods), clickCount: 2 } as never)
      aimed = null
    },
    pressOnPanel: () => {
      aimed = partOn(PROPERTIES_PANEL, null)
      send(pointerOf('down', SCREEN.width - 40, 200))
      // WHY: the release is heard before the next frame, and the click it causes lands before that frame too.
      loop.receiveInput(pointerOf('up', SCREEN.width - 40, 200))
      aimed = null
    },
    press: (part, entry) => {
      aimed = partOn(part, entry)
      send(pointerOf('down', 80, 120))
      send(pointerOf('up', 80, 120))
      aimed = null
    },
    key: (key) => send({ kind: 'key', key, modifiers: { ...NO_MODS } }),
    drain,
    view: () => views[views.length - 1] as ScreenView,
  }
}

// WHY: the same event raiser tests/unit/property-date-field-delete-empties-the-date.test.ts uses on this fake.
function raise(built: Stage, node: FakeElement, type: string): FakeEvent {
  const event = {
    type,
    key: '',
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
  return event
}

// WHY: a pointer press reaches the shell as pointer input and the page as click, before the next frame; the
// shared fake has no dispatchEvent, so what the page dispatches is routed through raise().
function pointerPress(built: Bench, node: FakeElement): void {
  ;(node as unknown as { dispatchEvent: (event: Event) => boolean }).dispatchEvent = (event) => {
    raise(built.built, node, event.type)
    return true
  }
  built.pressOnPanel()
  raise(built.built, node, 'click')
  built.drain()
}

const ROWS = [
  { id: 'g1', parentId: null },
  { id: 'g2', parentId: null },
  { id: 'g3', parentId: null },
]

function documentOf(highlight: Record<string, unknown> | null = null) {
  const document = rowDocument(ROWS, { progressMarkerVisible: false })
  document.schedule.tasks = ROWS.map((_one, index) =>
    taskOf(index + 1, { name: `Task${index + 1}`, start: '2026-04-06T08:00:00', finish: '2026-04-30T17:00:00' }),
  )
  if (highlight !== null) document.schedule.highlightBoxes = [highlight]
  return document
}

const titleBox = (built: Bench, groupId: string) => {
  const found = built.view().rowTitlePanel.titles.find((one) => one.groupId === groupId)?.box
  if (found === undefined) throw new Error(`the row ${groupId} is not drawn`)
  return found
}
const rowPart = (groupId: string): ScreenPart => partOn('Row Title Panel', null, groupId)
const paletteShown = (built: Bench): boolean => built.view().commandPalette !== null

describe('IN-5a -- a withdrawn focus request lets its keys go', () => {
  it('IN-5a still says: 選択が変わったとき、求めた欄がパネルに無いとき ... 本段を当てない / 取り下げに数える', () => {
    expect(REQUIREMENTS).toContain(IN_5A_WITHDRAWN)
    expect(REQUIREMENTS).toContain(IN_5A_NOT_IN_PANEL)
    expect(PALETTE_KEY).toBe('P')
  })

  it('IN-5a: while the row-name focus request is pending, the key is held (premise of the two cases below)', () => {
    // see IN-5a, MK-13
    const built = bench(documentOf())
    const box = titleBox(built, 'g1')
    built.doubleClick(box.x + box.width / 2, box.y + box.height / 2, rowPart('g1'))
    const before = paletteShown(built)
    built.key(PALETTE_KEY)
    expect(paletteShown(built), 'the key is held for the field, not taken as SK-14').toBe(before)
  })

  it('IN-5a: 選択が変わったとき -- the request is withdrawn and the key works as SK-14 again', () => {
    // see IN-5a, SK-14
    const built = bench(documentOf())
    const first = titleBox(built, 'g1')
    built.doubleClick(first.x + first.width / 2, first.y + first.height / 2, rowPart('g1'))
    const second = titleBox(built, 'g3')
    built.click(second.x + second.width / 2, second.y + second.height / 2, rowPart('g3'))
    const before = paletteShown(built)
    built.key(PALETTE_KEY)
    expect(paletteShown(built), IN_5A_WITHDRAWN).toBe(!before)
  })

  it('IN-5a control: two rows chosen with Shift and no focus request -- the key works as SK-14', () => {
    // see IN-5a, SK-14
    const built = bench(documentOf())
    const first = titleBox(built, 'g1')
    built.click(first.x + first.width / 2, first.y + first.height / 2, rowPart('g1'))
    const second = titleBox(built, 'g2')
    built.click(second.x + second.width / 2, second.y + second.height / 2, rowPart('g2'), { shift: true })
    const before = paletteShown(built)
    built.key(PALETTE_KEY)
    expect(paletteShown(built)).toBe(!before)
  })

  it('IN-5a: 求めた欄がパネルに無いとき (two rows chosen with Shift, no row-name field) -- the key works as SK-14 again', () => {
    // see IN-5a, SK-14, SL-1
    const built = bench(documentOf())
    const first = titleBox(built, 'g1')
    built.click(first.x + first.width / 2, first.y + first.height / 2, rowPart('g1'))
    const second = titleBox(built, 'g2')
    built.doubleClick(second.x + second.width / 2, second.y + second.height / 2, rowPart('g2'), { shift: true })
    const fields = built.view().propertiesPanel?.fields.map((one) => one.row) ?? []
    expect(fields, 'premise: with two rows chosen the row-name field is not drawn').not.toContain('AT-53')
    const before = paletteShown(built)
    built.key(PALETTE_KEY)
    expect(paletteShown(built), IN_5A_NOT_IN_PANEL).toBe(!before)
  })
})

const HIGHLIGHT = {
  id: 'h1',
  startDate: '2026-04-06T08:00:00',
  endDate: '2026-04-30T17:00:00',
  topGroupId: 'g1',
  bottomGroupId: 'g2',
  strokeColor: null,
  cornerRadiusPx: null,
}

// see GR-14, MK-13
function panelOnHighlight(): Bench {
  const built = bench(documentOf(HIGHLIGHT))
  const box = built.loop.current()?.geometry.highlightBoxes.find((one) => one.id === 'h1')?.box
  if (box === undefined) throw new Error('the highlight box is not drawn')
  built.doubleClick(box.x, box.y + box.height / 2)
  if (built.view().propertiesPanel === null) {
    const placement = built.loop.current()?.layout.placements.find((one) => one.taskUid === 3)
    if (placement === undefined) throw new Error('the task is not drawn')
    built.doubleClick(placement.x + placement.width / 2, placement.y + placement.height / 2)
    built.click(box.x, box.y + box.height / 2)
  }
  return built
}

const frameField = (built: Bench): FakeElement[] => {
  const panel = byRole(built.built.root(), PROPERTIES_PANEL)[0]
  if (panel === undefined) return []
  return [...new Set(selfAndDescendants(panel).filter((one) => one.getAttribute('data-field-row') === FRAME_ROW).flatMap((one) => selfAndDescendants(one)))]
}
const frameGrid = (built: Bench): FakeElement => {
  const found = frameField(built).find((one) => /grid/.test(styleMap(one).get('display') ?? ''))
  if (found === undefined) throw new Error('the frame colour field lays out no palette')
  return found
}
const choiceOf = (node: FakeElement): string => node.getAttribute('data-colour-choice') ?? ''

// WHY: the second line, element by element: Custom, the empty slot where transparent would stand, Theme.
function secondLine(built: Bench): string[] {
  const custom = frameField(built).find((one) => one.getAttribute('data-colour-custom-entry') !== null)
  if (custom === undefined) throw new Error('the frame colour field draws no Custom entrance')
  const line = (custom.parentNode as FakeElement).children
  const read = line.map((one) => {
    if (one === custom) return 'custom'
    if (choiceOf(one) !== '') return choiceOf(one)
    if (one.children.length === 0 && one.textContent === THEME_WORD) return 'theme'
    return one.children.length === 0 && (one.textContent ?? '') === '' ? 'empty' : 'other'
  })
  return read.slice(0, read.indexOf('theme') + 1)
}

describe('PR-22 / CV-9 -- the highlight box frame colour field', () => {
  it('PR-22 / CV-9 still say: HighlightBox strokeColor, 透明は取らない / 透明の場所は空けたまま、テーマに戻す入口はその後ろ', () => {
    expect(bare(PR_22.by['対象'] ?? '')).toBe('HighlightBox')
    expect(PR_22.by['列（`GRS JSON`）'] ?? '').toContain('`strokeColor`')
    expect(REQUIREMENTS).toContain(CV_9_FRAME)
    expect(FRAME_WORD).not.toBe('')
  })

  it('PR-22: selecting a highlight box shows the frame colour field under the dictionary words', () => {
    // see PR-22, FR-038, IR-1
    const built = panelOnHighlight()
    const field = built.view().propertiesPanel?.fields.find((one) => one.row === FRAME_ROW)
    expect(field, `fields: ${(built.view().propertiesPanel?.fields ?? []).map((one) => one.row).join(' ')}`).toBeDefined()
    expect(field?.name).toBe(FRAME_WORD)
  })

  it('CV-9: the frame field offers the names, then Custom, an empty slot where transparent would stand, and Theme', () => {
    // see CV-9, FR-019
    const built = panelOnHighlight()
    expect(frameGrid(built).children.map(choiceOf)).toEqual(NAMED)
    expect(secondLine(built)).toEqual(['custom', 'empty', 'theme'])
    expect(frameField(built).some((one) => choiceOf(one) === TRANSPARENT), 'no transparent in the frame field').toBe(false)
    expect(frameField(built).some((one) => one.textContent === CUSTOM_WORD)).toBe(true)
  })

  it('PR-22 / CM-55: a choice writes the box strokeColor, and one undo takes it back', () => {
    // see PR-22, CM-55, SK-6
    const built = panelOnHighlight()
    const stroke = (): unknown => built.loop.document().schedule.highlightBoxes.find((one) => one.id === 'h1')?.strokeColor ?? null
    expect(stroke(), 'premise: the frame follows the theme').toBeNull()
    const blue = frameGrid(built).children.find((one) => choiceOf(one) === BLUE)
    if (blue === undefined) throw new Error('the frame field offers no blue')
    pointerPress(built, blue)
    expect(stroke()).toBe(BLUE)
    built.press('App Header', 'IC-5')
    expect(stroke(), 'one undo step').toBeNull()
  })
})
