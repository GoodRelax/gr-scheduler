// CR-551 follow-ups: the row fields carry their T-016 IDs (IR-1), and the custom colour input settles (CV-9).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

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
  colourNames: { spelling: string; text: { ja: string } }[]
  colourField: { part: string; text: { ja: string } }[]
}

const rowIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}
const wordOf = (part: string): string => WORDS.colourField.find((one) => one.part === part)?.text.ja ?? ''

// see T-016
const T_016 = specTable('T-016')
const t016RowOf = (subject: string, column: string): string => {
  const found = T_016.rows.find(
    (row) => bare(row.by['対象'] ?? '') === subject && [...(row.by['列（`GRS JSON`）'] ?? '').matchAll(/`([^`]+)`/g)].some((one) => one[1] === column),
  )
  if (found === undefined) throw new Error(`table T-016 has no ${subject} row for ${column}`)
  return found.id
}

// see T-294
const TRANSPARENT = bare(rowIn('T-294', 'S-324').cells[1] ?? '')
const BLUE = bare(rowIn('T-294', 'S-319').cells[1] ?? '')

const CUSTOM_WORD = wordOf('custom')
const THEME_WORD = wordOf('theme')

const IR_1 =
  '欄なら 表 T-016 の行 ID、入口なら `_assets/tbl-glossary.md` の 表 T-109 の行 ID、プロパティパネルの行の名前の欄なら `_assets/fig-erd-detail.md` の `AT-53`、どれでもなければ文書の本体。'
const CV_9_HOST_INPUT = '閲覧環境の色の入力（`input type=color`）は、カスタムカラーの入口を押したときにだけ出すこと（MUST）'

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const partOn = (part: string, entry: string | null, rowGroupId: string | null = null): ScreenPart =>
  ({ part, entry, format: null, rowGroupId, resourceUid: null, dividerPanel: null, noticeDismissKey: null }) as unknown as ScreenPart

interface Bench {
  readonly loop: FrameLoop
  readonly built: Stage
  doubleClickAt(x: number, y: number, part?: ScreenPart | null): void
  pressOnPanel(): void
  drain(): void
  settle(): Promise<void>
  view(): ScreenView
  svg(): string
}

// WHY: settle() lets time pass and runs only the frames the page itself asked for, with no further input.
function bench(document: Record<string, unknown>): Bench {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': SCREEN.appHeaderHeight })
  const drawn = surfaceOf(built)
  const views: ScreenView[] = []
  const svgs: string[] = []
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
  const loop = frameLoop({ showSvg: (svg: string) => svgs.push(svg) } as never, document as never, SCREEN, { surface, language: 'ja' })
  drain()
  const send = (input: Parameters<FrameLoop['receiveInput']>[0]): void => {
    loop.receiveInput(input)
    drain()
  }
  return {
    loop,
    built,
    doubleClickAt: (x, y, part = null) => {
      aimed = part
      send(pointerOf('down', x, y))
      send(pointerOf('up', x, y))
      send({ ...pointerOf('down', x, y), clickCount: 2 } as never)
      send({ ...pointerOf('up', x, y), clickCount: 2 } as never)
      aimed = null
    },
    pressOnPanel: () => {
      aimed = partOn(PROPERTIES_PANEL, null)
      send(pointerOf('down', SCREEN.width - 40, 200))
      // WHY: the release is heard before the next frame, and the click it causes lands before that frame too.
      loop.receiveInput(pointerOf('up', SCREEN.width - 40, 200))
      aimed = null
    },
    drain,
    settle: async () => {
      for (let turn = 0; turn < 10; turn += 1) {
        await new Promise((done) => setTimeout(done, 50))
        drain()
      }
    },
    view: () => views[views.length - 1] as ScreenView,
    svg: () => svgs[svgs.length - 1] ?? '',
  }
}

// WHY: the same event raiser tests/unit/property-date-field-delete-empties-the-date.test.ts uses on this fake.
function raise(built: Stage, node: FakeElement, type: string, extra: Record<string, unknown> = {}): FakeEvent {
  const event = {
    type,
    key: '',
    code: '',
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: node,
    currentTarget: null,
    relatedTarget: null,
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
  return event
}

// WHY: the shared fake has no dispatchEvent; what the page dispatches on a node is routed through raise().
function routeDispatch(built: Bench, node: FakeElement): void {
  ;(node as unknown as { dispatchEvent: (event: Event) => boolean }).dispatchEvent = (event) => {
    raise(built.built, node, event.type)
    return true
  }
}

// WHY: a pointer press reaches the shell as pointer input and the page as click, before the next frame.
function pointerPress(built: Bench, node: FakeElement): void {
  routeDispatch(built, node)
  built.pressOnPanel()
  raise(built.built, node, 'click')
  built.drain()
}

function documentWith(visual: Record<string, unknown> | null = null) {
  const document = rowDocument([{ id: 'g1', parentId: null }], { progressMarkerVisible: false })
  document.schedule.tasks = [taskOf(1, { name: 'Alpha', start: '2026-04-06T08:00:00', finish: '2026-04-30T17:00:00' })]
  if (visual !== null) {
    document.schedule.taskVisuals = [
      { taskUid: 1, shapeKind: null, milestoneGlyph: null, fillColor: null, strokeColor: null, lineWeight: null, ...visual },
    ]
  }
  return document
}

// see MK-13
function panelOnTask(visual: Record<string, unknown> | null = null): Bench {
  const built = bench(documentWith(visual))
  const placement = built.loop.current()?.layout.placements.find((one) => one.taskUid === 1)
  if (placement === undefined) throw new Error('the task is not drawn')
  built.doubleClickAt(placement.x + placement.width / 2, placement.y + placement.height / 2)
  if (built.view().propertiesPanel === null) throw new Error('MK-13 did not put the property panel up')
  return built
}

const PROPERTIES_PANEL = bare(rowIn('T-103', 'U-25').by['確定名（英）'] ?? '')
const LINE_ROW = t016RowOf('Task', 'strokeColor')

const fieldNodes = (built: Bench, row: string): FakeElement[] =>
  selfAndDescendants(byRole(built.built.root(), PROPERTIES_PANEL)[0] as FakeElement).filter(
    (one) => one.getAttribute('data-field-row') === row,
  )
const inField = (built: Bench, row: string): FakeElement[] => [...new Set(fieldNodes(built, row).flatMap((one) => selfAndDescendants(one)))]
const hostInputs = (built: Bench, row: string): FakeElement[] =>
  inField(built, row).filter((one) => one.tagName === 'INPUT' && one.getAttribute('type') === 'color')
const linePalette = (built: Bench): FakeElement => {
  const grids = inField(built, LINE_ROW).filter((one) => /grid/.test(styleMap(one).get('display') ?? ''))
  if (grids[0] === undefined) throw new Error('the line colour field lays out no palette')
  return grids[0]
}
const lastLine = (grid: FakeElement): FakeElement[] => {
  const palette = grid.parentNode as FakeElement
  return palette.children.slice(palette.children.indexOf(grid) + 1).flatMap((one) => selfAndDescendants(one))
}
const entryWith = (grid: FakeElement, word: string): FakeElement => {
  const found = lastLine(grid).find((one) => one.children.length === 0 && one.textContent === word)
  if (found === undefined) throw new Error(`the palette draws no entrance ${word}`)
  return found
}
const transparentOf = (grid: FakeElement): FakeElement => {
  const found = lastLine(grid).find((one) => one.getAttribute('data-colour-choice') === TRANSPARENT)
  if (found === undefined) throw new Error('the palette draws no transparent entrance')
  return found
}
const swatchOf = (grid: FakeElement, name: string): FakeElement => {
  const found = grid.children.find((one) => one.getAttribute('data-colour-choice') === name)
  if (found === undefined) throw new Error(`the palette draws no ${name}`)
  return found
}

function openCustom(built: Bench): FakeElement {
  pointerPress(built, entryWith(linePalette(built), CUSTOM_WORD))
  const input = hostInputs(built, LINE_ROW)[0]
  if (input === undefined) throw new Error('pressing Custom drew no host colour input')
  return input
}

describe('IR-1 -- the row fields carry their T-016 row IDs', () => {
  it('IR-1 still says: 欄なら 表 T-016 の行 ID ... プロパティパネルの行の名前の欄なら AT-53', () => {
    expect(REQUIREMENTS).toContain(IR_1)
  })

  it('IR-1: the row colour field is the T-016 color row, the height field the T-016 height row, the name field AT-53', () => {
    // see IR-1, T-016, AT-53
    const built = bench(documentWith())
    const box = built.view().rowTitlePanel.titles[0]?.box
    if (box === undefined) throw new Error('the row title is not drawn')
    built.doubleClickAt(box.x + box.width / 2, box.y + box.height / 2, partOn('Row Title Panel', null, 'g1'))
    const fields = built.view().propertiesPanel?.fields ?? []
    const rowOf = (column: string): string | undefined =>
      fields.find((one) => one.controls.some((control) => control.key.holder === 'taskGroup' && control.key.column === column))?.row
    expect(rowOf('color')).toBe(t016RowOf('TaskGroup', 'color'))
    expect(rowOf('height')).toBe(t016RowOf('TaskGroup', 'height'))
    expect(rowOf('label')).toBe('AT-53')
    for (const row of [t016RowOf('TaskGroup', 'color'), t016RowOf('TaskGroup', 'height'), 'AT-53']) {
      expect(fieldNodes(built, row).length, `the drawn field carries ${row}`).toBeGreaterThan(0)
    }
  })
})

describe('CV-9 / JDG-397 -- the custom colour input', () => {
  it('CV-9 still says: 押したときにだけ出す', () => {
    expect(REQUIREMENTS).toContain(CV_9_HOST_INPUT)
  })

  for (const [name, press] of [
    [TRANSPARENT, (grid: FakeElement) => transparentOf(grid)],
    ['theme', (grid: FakeElement) => entryWith(grid, THEME_WORD)],
    [BLUE, (grid: FakeElement) => swatchOf(grid, BLUE)],
  ] as const) {
    it(`CV-9: pressing ${name} while the Custom input is open removes the host input`, async () => {
      // see CV-9
      const built = panelOnTask({ strokeColor: 'red' })
      openCustom(built)
      pointerPress(built, press(linePalette(built)))
      await built.settle()
      expect(hostInputs(built, LINE_ROW)).toEqual([])
    })
  }

  it('CV-9: opening the Custom input does not change the size of the swatches', () => {
    // see CV-9
    const built = panelOnTask({ strokeColor: 'red' })
    const sizes = (): string[] =>
      linePalette(built).children.map((one) => `${styleMap(one).get('width') ?? ''}x${styleMap(one).get('height') ?? ''}`)
    const before = sizes()
    openCustom(built)
    expect(sizes()).toEqual(before)
  })
})
