// DFC-1287: IN-3 -- with the Help and another surface standing together (UZ-7, UZ-13), the explanation of a close entrance (IC-52) shows under the one the pointer is on.

import { afterEach, describe, expect, it } from 'vitest'

import type { ScreenPart, ScreenSurface, ScreenView, ScreenViewReadings, Tooltip } from '../../src/adapter/screen-renderer/screen-renderer'
import { tooltipsFromScreenView } from '../../src/adapter/screen-renderer/tooltips'
import { SETTINGS_DEFAULTS, SETTINGS_CONSTANTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { anchorKey } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { byRole, selfAndDescendants, surfaceOf, wire, type FakeElement } from '../fixtures/fake-browser'
import { pointerOf, taskGroupDocument, SCREEN } from '../unit/cr-541-stage'
import { bare, specTable } from './spec-table'

const verticalIn = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// WHY: IN-3 and the two UZ rows are the clauses; their words are read from the tables so the cases follow the manuscript.
const IN_3_PER_PLACE = '押す場所ごとに'
const HELP_SURFACE = bare(verticalIn('T-103', 'U-30').by['確定名（英）'] ?? '')
const ROSTER_SURFACE = bare(verticalIn('T-103', 'U-49').by['確定名（英）'] ?? '')
const CLOSE = 'IC-52'

describe('DFC-1287 the manuscript these cases are driven by', () => {
  it('UZ-7 lets the Help stand beside other surfaces, UZ-13 lists the other surfaces', () => {
    expect(verticalIn('T-337', 'UZ-7').cells.join(' ')).toContain('ほかの面を開いても閉じない')
    expect(verticalIn('T-337', 'UZ-13').cells.join(' ')).toContain(ROSTER_SURFACE)
  })

  it('IN-3 still asks an explanation per entrance (EZ-2)', () => {
    expect(verticalIn('T-028', 'IN-3').cells.join(' ')).toContain('消せること')
    expect(IN_3_PER_PLACE.length).toBeGreaterThan(0)
  })
})

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const partOn = (part: string, entry: string | null): ScreenPart =>
  ({ part, entry, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null }) as unknown as ScreenPart

// WHY: the loop and the DOM surface are the real ones; only the pointer's part is aimed by the bench.
function bench() {
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
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readFieldEditNotices: () => [],
    readScreenPartAt: () => aimed,
  } as unknown as ScreenSurface
  const document = taskGroupDocument([{ id: 'g1', parentId: null }])
  const loop = frameLoop({ showSvg: () => undefined } as never, document as never, SCREEN, { surface, language: 'ja' })
  drain()
  return {
    built,
    drawn,
    press: (part: string, entry: string): void => {
      aimed = partOn(part, entry)
      loop.receiveInput(pointerOf('down', 80, 120))
      drain()
      loop.receiveInput(pointerOf('up', 80, 120))
      drain()
      aimed = null
    },
    view: (): ScreenView => views[views.length - 1] as ScreenView,
  }
}

const SETTINGS = SETTINGS_DEFAULTS as unknown as DocumentSettings
const SESSION: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: 'ja', helpLanguage: 'ja' },
}
const EMPTY_SCHEDULE = { tasks: [], resources: [], assignments: [], baselineTasks: [] } as unknown as Schedule

// WHY: a rested pointer on an icon: the dwell is past the wait, the pointer is somewhere, and the icon is the close entrance.
const resting = (isOnHelp: boolean): ScreenViewReadings =>
  ({
    pointer: { x: 400, y: 300 },
    pointerRestedMs: SETTINGS_CONSTANTS.iconHintDelayMs,
    hintTargetDwellMs: SETTINGS_CONSTANTS.iconHintDelayMs,
    iconUnderPointer: CLOSE,
    isPointerOnHelp: isOnHelp,
  }) as unknown as ScreenViewReadings

function tipsOn(view: ScreenView, isOnHelp: boolean): readonly Tooltip[] {
  const { tooltips: _spent, ...shown } = view
  return tooltipsFromScreenView(shown, SETTINGS, SESSION, resting(isOnHelp), EMPTY_SCHEDULE)
}

function bothStanding() {
  const built = bench()
  built.press('App Header', 'IC-22')
  built.press('Command Palette', 'IC-62')
  const view = built.view()
  return { built, view }
}

describe('IN-3 / UZ-7 / UZ-13 (MUST): the explanation of IC-52 is anchored to the surface the pointer is on (DFC-1287)', () => {
  it('premise: the Help and the Resource List stand together, each with its own IC-52', () => {
    const { built, view } = bothStanding()
    expect(view.helpModal, 'UZ-7: the Help stays when another surface opens').not.toBeNull()
    expect(view.openModal, 'UZ-13: the roster stands').not.toBeNull()
    for (const surface of [HELP_SURFACE, ROSTER_SURFACE]) {
      const root = byRole(built.built.root(), surface)[0] as FakeElement
      expect(selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') === CLOSE), surface).toHaveLength(1)
    }
  })

  it('the tooltip of IC-52 on the Help and the tooltip of IC-52 on the other surface do not share an anchor key', () => {
    const { view } = bothStanding()
    const onHelp = tipsOn(view, true)
    const onOther = tipsOn(view, false)
    expect(onHelp).toHaveLength(1)
    expect(onOther).toHaveLength(1)
    expect(anchorKey((onHelp[0] as Tooltip).anchor)).not.toBe(anchorKey((onOther[0] as Tooltip).anchor))
  })

  // WHY: each IC-52 is given a place of its own, so where a tooltip lands says which entrance it was drawn under.
  function tooltipPlaceFor(isOnHelp: boolean): { readonly left: number; readonly top: number } {
    const { built, view } = bothStanding()
    const helpClose = selfAndDescendants(byRole(built.built.root(), HELP_SURFACE)[0] as FakeElement).find((one) => one.getAttribute('data-icon') === CLOSE) as FakeElement
    const otherClose = selfAndDescendants(byRole(built.built.root(), ROSTER_SURFACE)[0] as FakeElement).find((one) => one.getAttribute('data-icon') === CLOSE) as FakeElement
    const rect = (left: number, bottom: number) => () => ({ x: left, y: bottom - 20, left, top: bottom - 20, right: left + 20, bottom, width: 20, height: 20 })
    ;(helpClose as unknown as { getBoundingClientRect: unknown }).getBoundingClientRect = rect(700, 60)
    ;(otherClose as unknown as { getBoundingClientRect: unknown }).getBoundingClientRect = rect(300, 400)
    built.drawn.showScreenView({ ...view, tooltips: tipsOn(view, isOnHelp) })
    const layer = byRole(built.built.root(), 'Tooltip')[0] as FakeElement
    const tip = layer.children[0] as FakeElement
    expect(tip, 'premise: a tooltip is drawn').toBeDefined()
    const style = tip.getAttribute('style') ?? ''
    const at = (name: string): number => Number(new RegExp(`(?:^|;)${name}:(-?[\\d.]+)px`).exec(style.replace(/\s/g, ''))?.[1])
    return { left: at('left'), top: at('top') }
  }

  it('resting on the close of the Help, the explanation stands under the Help\'s close', () => {
    expect(tooltipPlaceFor(true).left, 'within the Help close, x 700 to 720').toBeGreaterThanOrEqual(700)
    expect(tooltipPlaceFor(true).left).toBeLessThanOrEqual(720)
  })

  it('resting on the close of the other surface, the explanation stands under that surface\'s close', () => {
    expect(tooltipPlaceFor(false).left, 'within the other close, x 300 to 320').toBeGreaterThanOrEqual(300)
    expect(tooltipPlaceFor(false).left).toBeLessThanOrEqual(320)
  })
})
