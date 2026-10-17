// CR-788 (spec-only): AS-5 drawn -- one closed field, a list with a filter, IC-125/IC-126/IC-123/IC-124 and one checked row per person.

import { describe, expect, it } from 'vitest'

import { ASSIGNEE_LIST_SEPARATOR, type FieldCommit, type PropertiesPanel, type ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { domScreenSurface } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { MORE_ASSIGNEES_MARK } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { commandsOf, documentOf, fieldOf, panelOf, personOf, propertyFieldWordOf, seatOf, taskItem, taskOf } from '../contract/cr-606-stage'
import { selfAndDescendants, stage, wiringOf, type FakeElement, type FakeEvent, type Stage } from '../fixtures/fake-browser'

const ASSIGNEE_ROW = 'PR-16'
const ALPHA = { uid: 1, name: 'Alpha' }
const BRAVO = { uid: 2, name: 'Bravo' }
const CHARLIE = { uid: 3, name: 'Charlie' }
const ALPHONSE = { uid: 4, name: 'Alphonse' }
const TWIN_HIGH = { uid: 9, name: 'Twin' }
const TWIN_LOW = { uid: 5, name: 'Twin' }
const ROSTER = [CHARLIE, TWIN_HIGH, BRAVO, ALPHONSE, ALPHA, TWIN_LOW]
// see AS-5
const BY_NAME = [ALPHA, ALPHONSE, BRAVO, CHARLIE, TWIN_LOW, TWIN_HIGH]

const NOBODY = 20
const TWO_SEATED = 21

const DOCUMENT = documentOf({
  tasks: [taskOf(NOBODY), taskOf(TWO_SEATED)],
  resources: ROSTER.map((one) => personOf(one.uid, one.name)),
  assignments: [seatOf(30, TWO_SEATED, CHARLIE.uid), seatOf(31, TWO_SEATED, ALPHA.uid)],
})

const viewOf = (panel: PropertiesPanel): ScreenView =>
  ({
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: { documentTitle: null, openedFileName: null, fileSavedAt: null, fileNeverSavedText: '', commands: [], language: 'ja' },
    taskGroupPanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: panel,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }) as unknown as ScreenView

interface Drawn {
  readonly built: Stage
  field(): FakeElement
  shown(): FakeElement
  list(): FakeElement | null
  filter(): FakeElement
  personRows(): readonly FakeElement[]
  addRows(): readonly FakeElement[]
  entry(icon: string): FakeElement
  isChecked(row: FakeElement): boolean
  click(node: FakeElement): void
  pointerDown(node: FakeElement): void
  type(text: string): void
  key(which: string): void
  pressOutside(): void
  commit(): FieldCommit | null
  focus(row: string): boolean
}

// WHY: the shared fake has no dispatchEvent; each element is given one that bubbles through its own listeners, so no
// prototype is changed for any other file.
function armed(root: FakeElement, built: Stage): void {
  for (const node of selfAndDescendants(root)) {
    const record = node as unknown as Record<string, unknown>
    if (typeof record['dispatchEvent'] === 'function') continue
    Object.defineProperty(node, 'dispatchEvent', { value: (event: Event): boolean => fire(built, node, { type: event.type }), configurable: true })
    Object.defineProperty(node, 'parentElement', { get: () => node.parentNode, configurable: true })
    if (!('ownerDocument' in record)) {
      Object.defineProperty(node, 'ownerDocument', {
        get: () => ({ activeElement: built.world.activeElement, defaultView: null }),
        configurable: true,
      })
    }
  }
}

// WHY: the capturing listeners of the document run first, then the target and its ancestors, as a browser does.
function fire(built: Stage, target: FakeElement, init: Readonly<Record<string, unknown>>): boolean {
  let stopped = false
  const event = {
    ...init,
    target,
    currentTarget: null as FakeElement | null,
    defaultPrevented: false,
    bubbles: true,
    preventDefault(): void {
      event.defaultPrevented = true
    },
    stopPropagation(): void {
      stopped = true
    },
    stopImmediatePropagation(): void {
      stopped = true
    },
  } as unknown as FakeEvent & { defaultPrevented: boolean }
  for (const one of [...(built.hostListeners ?? [])]) if (one.type === event.type) one.listener(event)
  for (let at: FakeElement | null = target; at !== null && !stopped; at = at.parentNode) {
    const node = at
    ;(event as { currentTarget: FakeElement | null }).currentTarget = node
    for (const one of [...built.world.registrations]) if (one.node === node && one.type === event.type) one.listener(event)
  }
  return !event.defaultPrevented
}

function drawn(taskUid: number): Drawn {
  const built = stage({ 'App Header': 37 })
  let held: ((row: string) => boolean) | null = null
  built.surface = domScreenSurface({
    ...wiringOf(built, { preference: 'light', hue: 214 }),
    holdFocusPropertyField: (focus) => {
      held = focus
    },
  })
  built.surface.showScreenView(viewOf(panelOf(DOCUMENT, taskItem(taskUid))))
  armed(built.root(), built)
  const field = (): FakeElement => {
    const found = selfAndDescendants(built.root()).find((one) => one.getAttribute('data-assignee-field') === ASSIGNEE_ROW)
    if (found === undefined) throw new Error('no data-assignee-field is drawn')
    return found
  }
  const list = (): FakeElement | null => selfAndDescendants(field()).find((one) => one.hasAttribute('data-assignee-list')) ?? null
  const inList = (): readonly FakeElement[] => {
    const open = list()
    return open === null ? [] : selfAndDescendants(open)
  }
  const act = (node: FakeElement, init: Readonly<Record<string, unknown>>): void => {
    armed(built.root(), built)
    fire(built, node, init)
    armed(built.root(), built)
  }
  // WHY: a list left open by an earlier case stays open across a redraw of the same field; start each case closed.
  const opened = list()
  if (opened !== null) act(field().children.find((one) => one.tagName === 'BUTTON') as FakeElement, { type: 'click' })
  return {
    built,
    field,
    shown: () => {
      const found = field().children.find((one) => one.tagName === 'BUTTON' && one.textContent !== '' && !one.hasAttribute('hidden'))
      return found ?? (field().children.find((one) => one.tagName === 'BUTTON') as FakeElement)
    },
    list,
    filter: () => {
      const found = inList().find((one) => one.hasAttribute('data-assignee-filter'))
      if (found === undefined) throw new Error('the open list holds no filter')
      return found
    },
    personRows: () => inList().filter((one) => one.hasAttribute('data-assignee-person')),
    addRows: () => inList().filter((one) => one.hasAttribute('data-assignee-add')),
    entry: (icon) => {
      const found = inList().find((one) => one.getAttribute('data-icon') === icon)
      if (found === undefined) throw new Error(`the open list holds no ${icon}`)
      return found
    },
    isChecked: (row) =>
      selfAndDescendants(row).some(
        (one) => (one.tagName === 'INPUT' && (one as unknown as { checked: boolean }).checked) || one.getAttribute('aria-checked') === 'true' || one.hasAttribute('checked'),
      ),
    click: (node) => act(node, { type: 'click' }),
    pointerDown: (node) => act(node, { type: 'pointerdown', button: 0 }),
    type: (text) => {
      const box = selfAndDescendants(field()).find((one) => one.hasAttribute('data-assignee-filter'))
      if (box === undefined) throw new Error('the open list holds no filter')
      box.value = text
      act(box, { type: 'input' })
    },
    key: (which) => {
      const box = selfAndDescendants(field()).find((one) => one.hasAttribute('data-assignee-filter'))
      if (box === undefined) throw new Error('the open list holds no filter')
      act(box, { type: 'keydown', key: which, code: which, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, isComposing: false })
    },
    pressOutside: () => act(built.root(), { type: 'pointerdown', button: 0 }),
    commit: () => built.surface?.readFieldCommit() ?? null,
    focus: (row) => {
      if (held === null) throw new Error('the surface handed over no focus seam')
      return (held as (row: string) => boolean)(row)
    },
  }
}

// WHY: the closed field shows its word, then a drop-down glyph that is no letter or digit.
const wordShown = (view: Drawn): string => view.shown().textContent.replace(/[^\p{L}\p{N}\s,.\u2026()\uff08\uff09]+$/u, '')

// WHY: SV-4 folds full width and case, so the full-width upper-case ALPH finds the same people as alph.
const FULL_WIDTH_ALPH = '\uff21\uff2c\uff30\uff28'

const uidsOf = (rows: readonly FakeElement[]): readonly number[] => rows.map((one) => Number(one.getAttribute('data-assignee-person')))
const ids = (...people: readonly { readonly uid: number }[]): readonly number[] => people.map((one) => one.uid)

describe('AS-5 -- the closed field shows the primary, the mark when others are seated, and nothing for nobody', () => {
  it('AS-5 (MUST): two seated (Charlie first) -> the field reads the primary and the FR-059 mark', () => {
    const view = drawn(TWO_SEATED)
    expect(wordShown(view)).toBe(fieldOf(panelOf(DOCUMENT, taskItem(TWO_SEATED)), ASSIGNEE_ROW).controls[0]?.assignee?.fieldWord)
    expect(wordShown(view)).toBe(`Charlie${MORE_ASSIGNEES_MARK}`)
    expect(view.list()).toBeNull()
  })

  it('AS-5: nobody seated -> the field shows nothing', () => {
    expect(wordShown(drawn(NOBODY))).toBe('')
  })
})

describe('AS-5 -- pressing the field opens the list; pressing it again, or outside, closes it', () => {
  it('AS-5 (MUST): a press opens the list under the field, in the order filter, IC-125, IC-126, IC-123, IC-124, then the rows', () => {
    const view = drawn(TWO_SEATED)
    view.click(view.shown())
    const open = view.list()
    expect(open, 'the list is open').not.toBeNull()
    const order = selfAndDescendants(open as FakeElement)
      .map((one) => (one.hasAttribute('data-assignee-filter') ? 'filter' : one.getAttribute('data-icon') ?? (one.hasAttribute('data-assignee-person') ? 'row' : null)))
      .filter((one): one is string => one !== null && (one === 'filter' || one === 'row' || /^IC-12[3-6]$/.test(one)))
    const firstRow = order.indexOf('row')
    expect(order.slice(0, firstRow)).toEqual(['filter', 'IC-125', 'IC-126', 'IC-123', 'IC-124'])
  })

  it('AS-5: every person of the roster has a row, name ascending, the same name by uid; the seated are checked', () => {
    const view = drawn(TWO_SEATED)
    view.click(view.shown())
    expect(uidsOf(view.personRows())).toEqual(ids(...BY_NAME))
    const checked = view.personRows().filter((one) => view.isChecked(one))
    expect([...uidsOf(checked)].sort()).toEqual([...ids(ALPHA, CHARLIE)].sort())
  })

  it('IC-124 turns the rows to descending, IC-123 back to ascending, and neither writes', () => {
    const view = drawn(NOBODY)
    view.click(view.shown())
    view.pointerDown(view.entry('IC-124'))
    expect(uidsOf(view.personRows())).toEqual(ids(TWIN_LOW, TWIN_HIGH, CHARLIE, BRAVO, ALPHONSE, ALPHA))
    view.pointerDown(view.entry('IC-123'))
    expect(uidsOf(view.personRows())).toEqual(ids(...BY_NAME))
    expect(view.commit()).toBeNull()
  })

  it('AS-5 (MUST): pressing the field again closes the list', () => {
    const view = drawn(TWO_SEATED)
    view.click(view.shown())
    view.click(view.shown())
    expect(view.list()).toBeNull()
  })

  it('AS-5 (MUST): a press outside the field and the list closes it, writing nothing', () => {
    const view = drawn(TWO_SEATED)
    view.click(view.shown())
    view.pressOutside()
    expect(view.list()).toBeNull()
    expect(view.commit()).toBeNull()
  })
})

describe('AS-5 -- the filter narrows by SV-4 and never changes a check', () => {
  it('AS-5 (MUST): a part of a name keeps only the people whose names hold it (full width and case folded, SV-4)', () => {
    const view = drawn(TWO_SEATED)
    view.click(view.shown())
    view.type(FULL_WIDTH_ALPH)
    expect(uidsOf(view.personRows())).toEqual(ids(ALPHA, ALPHONSE))
    expect(view.commit(), 'AS-5 (MUST NOT): typing changes no check').toBeNull()
    expect(uidsOf(view.personRows().filter((one) => view.isChecked(one)))).toEqual(ids(ALPHA))
  })

  it('AS-5 (MUST): a text no name equals brings one add item last; "-" brings none (AS-4)', () => {
    const view = drawn(NOBODY)
    view.click(view.shown())
    view.type('Alph')
    expect(view.addRows().map((one) => one.getAttribute('data-assignee-add'))).toEqual(['Alph'])
    expect(view.addRows()[0]?.textContent).toContain(propertyFieldWordOf('addResource').replace('{name}', 'Alph'))
    view.type('-')
    expect(view.addRows()).toEqual([])
    view.type('Alpha')
    expect(view.addRows(), 'an equal name brings no add item').toEqual([])
  })
})

describe('AS-5 -- one press writes once, and the list stays open', () => {
  it('AS-12: pressing an unchecked person seats them; the list stays open with the typed text', () => {
    const view = drawn(TWO_SEATED)
    view.click(view.shown())
    view.type('bra')
    const row = view.personRows().find((one) => one.getAttribute('data-assignee-person') === String(BRAVO.uid)) as FakeElement
    view.pointerDown(row)
    const commit = view.commit()
    expect(commit?.key).toEqual({ holder: 'assignment', taskUid: TWO_SEATED, resourceUid: null, column: 'resourceUid' })
    expect(commandsOf(DOCUMENT, commit as FieldCommit).map((one) => (one as unknown as Record<string, unknown>)['kind'])).toEqual(['createAssignment'])
    expect(view.list(), 'the list stays open').not.toBeNull()
    expect(view.filter().value).toBe('bra')
  })

  it('AS-3: pressing a checked person releases that person only', () => {
    const view = drawn(TWO_SEATED)
    view.click(view.shown())
    const row = view.personRows().find((one) => one.getAttribute('data-assignee-person') === String(ALPHA.uid)) as FakeElement
    view.pointerDown(row)
    const commands = commandsOf(DOCUMENT, view.commit() as FieldCommit).map((one) => one as unknown as Record<string, unknown>)
    expect(commands.map((one) => [one['kind'], one['resourceUid']])).toEqual([['deleteAssignment', ALPHA.uid]])
  })

  it('AS-7: pressing the add item makes the person and seats them', () => {
    const view = drawn(NOBODY)
    view.click(view.shown())
    view.type('Nobody')
    view.pointerDown(view.addRows()[0] as FakeElement)
    const kinds = commandsOf(DOCUMENT, view.commit() as FieldCommit).map((one) => (one as unknown as Record<string, unknown>)['kind'])
    expect(kinds).toEqual(['createResource', 'createAssignment'])
  })

  it('AS-5 (MUST): IC-125 seats the listed unseated people in the list order, in one commit', () => {
    const view = drawn(TWO_SEATED)
    view.click(view.shown())
    view.type('a')
    view.pointerDown(view.entry('IC-125'))
    const commit = view.commit() as FieldCommit
    expect(commit.pick).toBe('all')
    const seated = commandsOf(DOCUMENT, commit).map((one) => (one as unknown as Record<string, unknown>)['resourceUid'])
    // WHY: 'a' (folded) holds Alpha, Alphonse, Bravo and Charlie; Alpha and Charlie are already seated.
    expect(seated).toEqual(ids(ALPHONSE, BRAVO))
  })

  it('AS-5 (MUST): IC-126 releases the listed seated people in one commit, and leaves an unlisted one seated', () => {
    const view = drawn(TWO_SEATED)
    view.click(view.shown())
    view.type('alph')
    view.pointerDown(view.entry('IC-126'))
    const commit = view.commit() as FieldCommit
    expect(commit.pick).toBe('none')
    expect(commit.text.split(ASSIGNEE_LIST_SEPARATOR).map(Number)).toEqual(expect.arrayContaining([ALPHA.uid]))
    const released = commandsOf(DOCUMENT, commit).map((one) => (one as unknown as Record<string, unknown>)['resourceUid'])
    expect(released).toEqual(ids(ALPHA))
  })
})

describe('AS-5 -- Enter in the filter', () => {
  it('AS-5 (MUST): Enter on a name equal to an unseated person seats that person', () => {
    const view = drawn(TWO_SEATED)
    view.click(view.shown())
    view.type('Bravo')
    view.key('Enter')
    const commands = commandsOf(DOCUMENT, view.commit() as FieldCommit).map((one) => one as unknown as Record<string, unknown>)
    expect(commands.map((one) => [one['kind'], one['resourceUid']])).toEqual([['createAssignment', BRAVO.uid]])
  })

  it('AS-8: Enter on the twins name seats the smaller uid', () => {
    const view = drawn(NOBODY)
    view.click(view.shown())
    view.type('Twin')
    view.key('Enter')
    const commands = commandsOf(DOCUMENT, view.commit() as FieldCommit).map((one) => one as unknown as Record<string, unknown>)
    expect(commands.map((one) => one['resourceUid'])).toEqual([TWIN_LOW.uid])
  })

  it.each([
    ['a name nobody holds (AS-7: only the add item makes a person)', NOBODY, 'Nobody'],
    ['a part of a name', NOBODY, 'Alph'],
    ['a name already seated (AS-10)', TWO_SEATED, 'Alpha'],
  ] as const)('AS-5 (MUST): Enter on %s writes nothing', (_name, taskUid, text) => {
    const view = drawn(taskUid)
    view.click(view.shown())
    view.type(text)
    view.key('Enter')
    const commit = view.commit()
    expect(commit === null ? [] : commandsOf(DOCUMENT, commit)).toEqual([])
  })
})

describe('AS-1 -- focusing the row opens the list and puts the focus in its filter', () => {
  it('AS-1 (MUST): the focus seam on PR-16 opens the list and focuses the filter', () => {
    const view = drawn(TWO_SEATED)
    expect(view.focus(ASSIGNEE_ROW)).toBe(true)
    expect(view.list()).not.toBeNull()
    expect(view.built.world.activeElement).toBe(view.filter())
  })
})
