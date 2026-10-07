// DFC-1721: MK-13 -- a double click on the Document Title (U-27) opens the same in-place field as SK-9 (F2); one press does not.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { AppHeaderItems, ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { brandingPlaceOf } from '../../src/adapter/screen-renderer/app-header-items'
import { domScreenSurface } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import {
  FakeElement,
  oneByRole,
  selfAndDescendants,
  stage,
  wiringOf,
} from '../fixtures/fake-browser'
import { keyOf, pointerOf, rowDocument, SCREEN, taskOf } from '../unit/cr-541-stage'
import { bare, specTable, unbroken } from './spec-table'

// WHY: the DOM surface walks parentElement; the fake element has only parentNode.
if (!Object.getOwnPropertyDescriptor(FakeElement.prototype, 'parentElement')) {
  Object.defineProperty(FakeElement.prototype, 'parentElement', {
    get(this: FakeElement): FakeElement | null {
      return this.parentNode
    },
  })
}

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const rowIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// WHY: each clause is cut from the manuscript as check 39 reads it, so the cases cannot drift from the words they test.
const MK_13_DOCUMENT_TITLE =
  '表 T-036 の `SK-9` が開くのと同じ、その場で編集する欄（`FR-035`）を開くこと（MUST）'
const MK_13_NOT_ONE_PRESS = '⛔ 1 回の押下で開いてはならない（MUST NOT） —— ヘッダーの押し違いで欄が開く'

describe('DFC-1721 the manuscript these cases are driven by', () => {
  it('MK-13 still names the Document Title and the F2 field', () => {
    expect(rowIn('T-023', 'MK-13').cells.join(' ')).toContain(MK_13_DOCUMENT_TITLE)
  })

  it('MK-13 still forbids opening it on one press', () => {
    expect(rowIn('T-023', 'MK-13').cells.join(' ')).toContain(MK_13_NOT_ONE_PRESS)
    expect(REQUIREMENTS).toContain('SK-9')
  })
})

// see T-103
const DOCUMENT_TITLE = bare(rowIn('T-103', 'U-27').by['確定名（英）'] ?? '')
const APP_HEADER = bare(rowIn('T-103', 'U-31').by['確定名（英）'] ?? '')
// WHY: IF-9 has the header's field name itself by U-27, so the row the host is asked to focus is U-27.
const TITLE_FIELD_ROW = 'U-27'

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const part = (name: string): ScreenPart => ({
  part: name,
  entry: null,
  format: null,
  rowGroupId: null,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
})

// WHY: the surface is a stub that answers the part under the pointer; the host seam records which field row it was asked to focus.
function bench(under: ScreenPart | null) {
  const waiting: ((time: number) => void)[] = []
  GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
  }
  const asked: string[] = []
  const surface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readFieldEditNotices: () => [],
    readScreenPartAt: () => under,
  } as unknown as ScreenSurface
  const document = rowDocument([{ id: 'g1', parentId: null }])
  document['schedule'].tasks = [taskOf(1, { name: 'T1' })]
  const loop = frameLoop({ showSvg: () => undefined } as never, document as never, SCREEN, {
    surface,
    language: 'ja',
    focusPropertyField: (row: string) => {
      asked.push(row)
      return true
    },
  })
  drain()
  const send = (input: Parameters<typeof loop.receiveInput>[0]): void => {
    loop.receiveInput(input)
    drain()
  }
  // WHY: both presses are sent, as a browser delivers them: clickCount 1 chooses, clickCount 2 is MK-13's.
  const press = (clickCount: 1 | 2): void => {
    send({ ...pointerOf('down', 300, 10), clickCount } as never)
    send({ ...pointerOf('up', 300, 10), clickCount } as never)
  }
  return { asked, press, send }
}

describe('MK-13 (MUST): a double click on the Document Title opens the in-place field, as SK-9 does (DFC-1721)', () => {
  it('F2 (SK-9) asks the host to focus the title field -- the premise the double click is compared with', () => {
    const { asked, send } = bench(null)
    send(keyOf('F2'))
    expect(asked).toEqual([TITLE_FIELD_ROW])
  })

  it('a double click on the Document Title asks the host to focus the same field as F2', () => {
    const { asked, press } = bench(part(DOCUMENT_TITLE))
    press(1)
    press(2)
    expect(asked).toEqual([TITLE_FIELD_ROW])
  })

  it('MK-13 (MUST NOT): one press on the Document Title does not open the field', () => {
    const { asked, press } = bench(part(DOCUMENT_TITLE))
    press(1)
    expect(asked).toEqual([])
  })

  it('a double click on the rest of the App Header (not the title) does not open the title field', () => {
    const { asked, press } = bench(part(APP_HEADER))
    press(1)
    press(2)
    expect(asked).not.toContain(TITLE_FIELD_ROW)
  })
})

// WHY: the translator can only tell the title from the header's empty space if the surface answers the title's own name.
describe('IF-9 / MK-13: the surface answers the Document Title for a point on the title, not the App Header around it', () => {
  const THEME = { preference: 'light', hue: 214 } as const
  const items = {
    brandingText: 'GRS',
    ...brandingPlaceOf(),
    documentTitle: 'Plan of the year',
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: 'not saved',
    commands: [],
    language: 'ja',
  } as AppHeaderItems

  const view = (): ScreenView => ({
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: items,
    rowTitlePanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }) as unknown as ScreenView

  it('a point on the title element reads as the Document Title', () => {
    const built = stage({ [APP_HEADER]: 37 })
    const surface = domScreenSurface(wiringOf(built, THEME))
    surface.showScreenView(view())
    const title = selfAndDescendants(oneByRole(built.root(), APP_HEADER)).find((one) => one.getAttribute('data-role') === DOCUMENT_TITLE)
    expect(title, 'premise: the header draws the Document Title').toBeDefined()
    ;(built.host as unknown as { elementFromPoint: () => FakeElement | undefined }).elementFromPoint = () => title
    expect(surface.readScreenPartAt(1, 1)?.part).toBe(DOCUMENT_TITLE)
  })

  it('a point on the header itself, beside the title, reads as the App Header', () => {
    const built = stage({ [APP_HEADER]: 37 })
    const surface = domScreenSurface(wiringOf(built, THEME))
    surface.showScreenView(view())
    const header = oneByRole(built.root(), APP_HEADER)
    ;(built.host as unknown as { elementFromPoint: () => FakeElement }).elementFromPoint = () => header
    expect(surface.readScreenPartAt(1, 1)?.part).toBe(APP_HEADER)
  })
})
