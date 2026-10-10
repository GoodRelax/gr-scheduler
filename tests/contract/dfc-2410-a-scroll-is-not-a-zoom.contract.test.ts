// DFC-2410: a scroll on a document that has no view position is not a zoom (T-023 MK-1 / MK-5, OP-10, FR-051, T-329 TD-4).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { commandFromWheel } from '../../src/adapter/input-command-translator/wheel-input'
import { panTo, type HumanInput, type InputContext } from '../../src/adapter/input-command-translator/input-command-translator'
import { NO_MODS, REQUIREMENTS, shell, taskGroupDocument, type ShellBench, type TaskGroupSeed } from '../unit/cr-541-stage'
import { sceneOf, type Loose, type SceneSpec } from '../unit/cr-631-scene'
import { specTable } from './spec-table'

const OP_10_CHOSEN = '人が倍率か表示位置を選んだときは、それを表示位置とすること（MUST）'
const OP_10_PAIR = 'どちらか一方でも `null` なら、表示位置が `null` であるとすること（MUST）'
const FR_051_BAR = 'スクロールバーの操作でも表示位置を変えられるようにすること（MUST）'
const FR_051_POINTS =
  '表示位置が変わったときは、`_assets/tbl-settings.md` の表 T-203 の `S-77` と `S-78` が新しい表示位置を指すようにすること（MUST）'

describe('DFC-2410 -- the clauses the cases below answer to still stand in the manuscript', () => {
  it.each([OP_10_CHOSEN, OP_10_PAIR, FR_051_BAR, FR_051_POINTS])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-023 MK-1: the plain wheel is a vertical scroll, and it is not a zoom', () => {
    const row = specTable('T-023').rows.find((one) => one.id === 'MK-1')
    expect(row?.cells.join(' ')).toContain('縦スクロール')
    expect(row?.cells.join(' ')).toContain('ズームではない')
  })

  it('T-023 MK-5: Ctrl + Shift + wheel is a sideways scroll', () => {
    const row = specTable('T-023').rows.find((one) => one.id === 'MK-5')
    expect(row?.cells.join(' ')).toContain('横スクロール')
  })

  it('T-329 TD-4: what is drawn depends on the vertical zoom that is drawn', () => {
    const row = specTable('T-329').rows.find((one) => one.id === 'TD-4')
    expect(row?.cells.join(' ')).toContain('描く縦の倍率で本要求が描く深さ以内である')
  })
})

const benches: ShellBench[] = []
const keep = (built: ShellBench): ShellBench => {
  benches.push(built)
  return built
}
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

// WHY: forty roots of three children of two grandchildren each, every treeState 'auto': the whole-view zoom (FR-055) picks a shallow
// depth, and the stored zoomY of 1 would draw the deeper ones (T-329 TD-4), so a scroll that changes the zoom shows in the count.
function family(roots: number): TaskGroupSeed[] {
  const rows: TaskGroupSeed[] = []
  for (let r = 0; r < roots; r += 1) {
    const root = `g-${String(r)}`
    rows.push({ id: root, parentId: null })
    for (let c = 0; c < 3; c += 1) {
      const child = `${root}-${String(c)}`
      rows.push({ id: child, parentId: root })
      for (let d = 0; d < 2; d += 1) rows.push({ id: `${child}-${String(d)}`, parentId: child })
    }
  }
  return rows
}

const VIEWLESS = { scrollDate: null, scrollGroupId: null, scrollGroupOffset: 0, scrollDayOffset: 0, zoomX: 1, zoomY: 1 }

const settingsOf = (built: ShellBench): Record<string, any> => built.loop.document().documentSettings as unknown as Record<string, any>

interface Picture {
  readonly drawn: readonly string[]
  readonly band: number
  readonly barWidth: number
}

// WHY: the drawn zoom is read off the picture -- how many task groups are drawn, how tall a band is, how wide a plan bar is.
function pictureOf(built: ShellBench): Picture {
  const frame = built.loop.current()
  if (frame === null) throw new Error('premise: a frame was drawn')
  const placements = (frame.layout as unknown as { readonly placements: readonly { readonly width: number }[] }).placements
  return {
    drawn: frame.layout.taskGroups.map((one) => one.groupId),
    band: frame.layout.taskGroups[0]?.height ?? Number.NaN,
    barWidth: placements[0]?.width ?? Number.NaN,
  }
}

const centreOfArea = (built: ShellBench): { readonly x: number; readonly y: number } => {
  const area = built.loop.current()!.regions.taskGroupArea
  return { x: area.x + area.width / 2, y: area.y + area.height / 2 }
}

const wheel = (
  built: ShellBench,
  modifiers: Partial<typeof NO_MODS>,
  scrollPx: { readonly x: number; readonly y: number },
  notches = 1,
): void => {
  const at = centreOfArea(built)
  built.send({ kind: 'wheel', x: at.x, y: at.y, modifiers: { ...NO_MODS, ...modifiers }, notches, scrollPx } as HumanInput)
}

const SCROLL_DOWN = { x: 0, y: 70 }
const SCROLL_SIDEWAYS = { x: 90, y: 0 }

const viewless = (): ShellBench => keep(shell(taskGroupDocument(family(40), VIEWLESS)))

describe('DFC-2410 -- MK-1: a plain wheel on a document with no view position scrolls and does not zoom', () => {
  it('premise: the document has no view position, and the whole-view picture shows fewer task groups than the stored zoom would', () => {
    const built = viewless()
    expect(settingsOf(built)['scrollDate'], 'OP-10: a view position of null').toBeNull()
    expect(settingsOf(built)['scrollGroupId']).toBeNull()
    const placed = keep(shell(taskGroupDocument(family(40), { ...VIEWLESS, scrollDate: '2026-04-01T00:00:00', scrollGroupId: 'g-0' })))
    expect(pictureOf(built).drawn.length, 'FR-055 draws a shallower depth than the stored zoomY of 1 draws').toBeLessThan(
      pictureOf(placed).drawn.length,
    )
  })

  it(`${OP_10_CHOSEN} -- the picture is the same after one notch (TD-4: a scroll is not a zoom)`, () => {
    const built = viewless()
    const before = pictureOf(built)
    wheel(built, {}, SCROLL_DOWN)
    const after = pictureOf(built)
    expect(after.drawn, 'the drawn task groups').toEqual(before.drawn)
    expect(after.band, 'the drawn vertical zoom').toBeCloseTo(before.band, 9)
    expect(after.barWidth, 'the drawn horizontal zoom').toBeCloseTo(before.barWidth, 9)
  })

  it('the picture is still the same after several more notches', () => {
    const built = viewless()
    const before = pictureOf(built)
    for (let turn = 0; turn < 4; turn += 1) wheel(built, {}, SCROLL_DOWN)
    const after = pictureOf(built)
    expect(after.drawn).toEqual(before.drawn)
    expect(after.band).toBeCloseTo(before.band, 9)
    expect(after.barWidth).toBeCloseTo(before.barWidth, 9)
  })

  it(`${OP_10_CHOSEN} -- the turn is a chosen place, so the view position stops being null`, () => {
    const built = viewless()
    wheel(built, {}, SCROLL_DOWN)
    expect(settingsOf(built)['scrollDate']).not.toBeNull()
    expect(settingsOf(built)['scrollGroupId']).not.toBeNull()
  })

  it(`${OP_10_CHOSEN} -- the zoom the picture was drawn at becomes the stored zoom (the frame seam unstoredZoom)`, () => {
    const built = viewless()
    const frame = built.loop.current()!
    expect(frame.isPictureAtStoredZoom, 'premise: a view-less document is drawn at the whole-view zoom').toBe(false)
    const drawnAt = frame.unstoredZoom
    expect(drawnAt, 'premise: the whole-view zoom is told to the caller').not.toBeNull()
    wheel(built, {}, SCROLL_DOWN)
    expect(settingsOf(built)['zoomX']).toBeCloseTo(drawnAt!.zoomX, 9)
    expect(settingsOf(built)['zoomY']).toBeCloseTo(drawnAt!.zoomY, 9)
    expect(built.loop.current()!.isPictureAtStoredZoom, 'the picture is now at the stored zoom').toBe(true)
  })

  it('opening and closing is not a scroll: no treeState changes', () => {
    const built = viewless()
    const before = JSON.stringify(built.groups().map((one: any) => [one.id, one.treeState]))
    wheel(built, {}, SCROLL_DOWN)
    expect(JSON.stringify(built.groups().map((one: any) => [one.id, one.treeState]))).toBe(before)
  })

  it('the scroll moved forward: the top task group is no longer the first at the same offset', () => {
    const built = viewless()
    const ids = pictureOf(built).drawn
    wheel(built, {}, SCROLL_DOWN)
    const settings = settingsOf(built)
    const position = ids.indexOf(String(settings['scrollGroupId'])) + Number(settings['scrollGroupOffset'])
    expect(position, 'the view moved down the list').toBeGreaterThan(0)
  })

  it('a document that HAS a view position keeps the zoom it stores through the same wheel (the control)', () => {
    const built = keep(
      shell(taskGroupDocument(family(40), { ...VIEWLESS, scrollDate: '2026-04-01T00:00:00', scrollGroupId: 'g-0', zoomX: 3, zoomY: 1 })),
    )
    const before = pictureOf(built)
    wheel(built, {}, SCROLL_DOWN)
    const after = pictureOf(built)
    expect(settingsOf(built)['zoomX']).toBe(3)
    expect(settingsOf(built)['zoomY']).toBe(1)
    expect(after.drawn).toEqual(before.drawn)
    expect(after.band).toBeCloseTo(before.band, 9)
  })
})

describe('DFC-2410 -- MK-5: a sideways wheel on a document with no view position scrolls and does not zoom', () => {
  it(`${OP_10_CHOSEN} -- the picture is the same after one notch`, () => {
    const built = viewless()
    const before = pictureOf(built)
    wheel(built, { ctrl: true, shift: true }, SCROLL_SIDEWAYS)
    const after = pictureOf(built)
    expect(after.drawn).toEqual(before.drawn)
    expect(after.band).toBeCloseTo(before.band, 9)
    expect(after.barWidth).toBeCloseTo(before.barWidth, 9)
  })

  it('MK-5 points at a place even though the view position was null: the group is a drawn one', () => {
    const built = viewless()
    const ids = pictureOf(built).drawn
    wheel(built, { ctrl: true, shift: true }, SCROLL_SIDEWAYS)
    const settings = settingsOf(built)
    expect(settings['scrollGroupId'], 'S-78 points at a task group').not.toBeNull()
    expect(ids, 'the task group is one that was drawn').toContain(String(settings['scrollGroupId']))
    expect(settings['scrollDate'], 'S-77 points at a day').not.toBeNull()
  })

  it('MK-5 moves no task group: the top one is the first drawn, with no offset', () => {
    const built = viewless()
    const first = pictureOf(built).drawn[0]
    wheel(built, { ctrl: true, shift: true }, SCROLL_SIDEWAYS)
    expect(settingsOf(built)['scrollGroupId']).toBe(first)
    expect(Number(settingsOf(built)['scrollGroupOffset'])).toBe(0)
  })

  it('the picture is the same after several more notches', () => {
    const built = viewless()
    const before = pictureOf(built)
    for (let turn = 0; turn < 3; turn += 1) wheel(built, { ctrl: true, shift: true }, SCROLL_SIDEWAYS)
    const after = pictureOf(built)
    expect(after.drawn).toEqual(before.drawn)
    expect(after.barWidth).toBeCloseTo(before.barWidth, 9)
  })
})

describe('DFC-2410 -- the real progress table, which stores no view position', () => {
  const PATH = join(process.cwd(), 'previous-project-result', '38-project-progress', 'gr-scheduler-progress-2026-10-10c.json')
  const real = (): Record<string, any> => JSON.parse(readFileSync(PATH, 'utf8')) as Record<string, any>

  it('premise: the file stores no scrollDate (OP-10)', () => {
    expect(real().documentSettings.scrollDate).toBeNull()
  })

  it.each([
    ['MK-1', {}, SCROLL_DOWN],
    ['MK-5', { ctrl: true, shift: true }, SCROLL_SIDEWAYS],
  ] as const)(`${OP_10_CHOSEN} -- %s leaves the drawn task groups and the drawn zoom as they were`, (_row, modifiers, scrollPx) => {
    const built = keep(shell(real()))
    const before = pictureOf(built)
    expect(before.drawn.length, 'premise: something is drawn').toBeGreaterThan(0)
    wheel(built, modifiers, scrollPx)
    const after = pictureOf(built)
    expect(after.drawn.length).toBe(before.drawn.length)
    expect(after.band).toBeCloseTo(before.band, 9)
  })
})

describe('DFC-2410 -- FR-051: the scrollbar drag changes the view position and not the zoom', () => {
  // WHY: a drag on a bar is a long press-move-up; its translation is panTo (the seam the implementer named), so it is called with a
  // context whose picture is, or is not, at the stored zoom.
  const SCENE: SceneSpec = {
    groups: Array.from({ length: 30 }, (_one, index) => [`root-${String(index)}`, null] as const),
    tasks: Array.from({ length: 30 }, (_one, index) => [
      {
        uid: index + 1,
        parentTaskUid: null,
        wbsOrder: null,
        name: `t${String(index + 1)}`,
        start: `2026-02-${String(2 + (index % 20)).padStart(2, '0')}`,
        finish: `2026-02-${String(3 + (index % 20)).padStart(2, '0')}`,
        milestone: null,
        deadline: null,
        notes: null,
        calendarUid: null,
        actualStart: null,
        stop: null,
        actualFinish: null,
        resume: null,
        resumeValid: null,
        percentComplete: null,
        fadeInDays: null,
        fadeOutDays: null,
        dependencies: [],
        carry: {},
        carryElements: [],
      } as Loose,
      `root-${String(index)}`,
    ]),
  }

  const contextOf = (isPictureAtStoredZoom: boolean): InputContext => ({ ...sceneOf(null, undefined, false, SCENE).context, isPictureAtStoredZoom })
  const kindsOf = (answer: ReturnType<typeof panTo>): string[] => {
    const action = answer.action as { readonly kind: string; readonly writes?: readonly (readonly { readonly kind: string }[])[] } | null
    return (action?.writes ?? []).flat().map((one) => one.kind)
  }

  it(`${FR_051_POINTS} -- at the stored zoom the answer is setScrollPosition only`, () => {
    expect(kindsOf(panTo(contextOf(true), 80, 60))).toEqual(['setScrollPosition'])
  })

  it(`${OP_10_CHOSEN} -- off the stored zoom the answer is setZoom, then setScrollPosition`, () => {
    expect(kindsOf(panTo(contextOf(false), 80, 60))).toEqual(['setZoom', 'setScrollPosition'])
  })

  it('the setZoom of the answer is the zoom the picture is drawn at (the document zoom would be the jump)', () => {
    const context = contextOf(false)
    const answer = panTo(context, 80, 60)
    const writes = ((answer.action as { writes: readonly (readonly Loose[])[] }).writes ?? []).flat()
    const zoom = writes.find((one) => one['kind'] === 'setZoom')
    expect(Number.isFinite(zoom?.['zoomX'])).toBe(true)
    expect(Number.isFinite(zoom?.['zoomY'])).toBe(true)
    expect(Number(zoom?.['zoomX'])).toBeGreaterThan(0)
    expect(Number(zoom?.['zoomY'])).toBeGreaterThan(0)
  })

  describe('commandFromWheel, the same two answers (MK-1 and MK-5)', () => {
    const wheelOn = (context: InputContext, modifiers: Partial<typeof NO_MODS>, scrollPx: { x: number; y: number }) => {
      const area = context.regions.taskGroupArea
      return commandFromWheel(
        { kind: 'wheel', x: area.x + area.width / 2, y: area.y + area.height / 2, modifiers: { ...NO_MODS, ...modifiers }, notches: 1, scrollPx } as never,
        context,
      )
    }

    it.each([
      ['MK-1', {}, { x: 0, y: 200 }],
      ['MK-5', { ctrl: true, shift: true }, { x: 150, y: 0 }],
    ] as const)('%s: off the stored zoom, setZoom comes first and setScrollPosition last', (_row, modifiers, scrollPx) => {
      expect(kindsOf(wheelOn(contextOf(false), modifiers, scrollPx))).toEqual(['setZoom', 'setScrollPosition'])
    })

    it.each([
      ['MK-1', {}, { x: 0, y: 200 }],
      ['MK-5', { ctrl: true, shift: true }, { x: 150, y: 0 }],
    ] as const)('%s: at the stored zoom, only setScrollPosition', (_row, modifiers, scrollPx) => {
      expect(kindsOf(wheelOn(contextOf(true), modifiers, scrollPx))).toEqual(['setScrollPosition'])
    })
  })
})
