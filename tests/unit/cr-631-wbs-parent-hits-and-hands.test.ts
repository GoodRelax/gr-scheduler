// CR-631 spec-only cases: what a pointer or a key on the WBS parent arrows and the armed bars does (table T-351).

import { describe, expect, it } from 'vitest'

import {
  armedByEntry,
  commandFromInput,
  isParentPickingCtrlClick,
  KEY,
  pressRowOf,
  selectionFromInput,
  type HumanInput,
  type InputContext,
  type PointerPress,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { wbsParentResolutionsOf } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, selectionOfAll, type Selection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { itemsInMarquee } from '../../src/entity/layout-engine/item-hit-area/marquee'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  arrowOf,
  barOf,
  C,
  centreOf,
  cellOf,
  D,
  emptyPoint,
  F,
  FAMILY,
  G,
  M,
  MODS,
  midOfArrow,
  P,
  pointerAt,
  pressOf,
  Q,
  rowText,
  sceneOf,
  scheduleOf,
  type Loose,
  type Pt,
  type Scene,
} from './cr-631-scene'

const flat = (text: string): string => text.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

describe('CR-631 -- the rows of table T-351 these cases are driven by', () => {
  it.each([
    ['WL-1', '構える。'],
    ['WL-2', '構えを解く。'],
    ['WL-4', '取るのはバーと実線の矢印であり、破線の矢印は黙って除く'],
    ['WL-5', 'S の `Task` すべての親を、離した先のバーの `Task` にする'],
    ['WL-6', '選択を引き始めたバー 1 つに替えてから、`WL-5` と同じく結ぶ'],
    ['WL-7', '何もしない'],
    ['WL-8', '表 T-233 の `RS-69` を `NT-1` の通知として告げ'],
    ['WL-10', '矢印を選ぶ（`SL-1`）'],
    ['WL-11', '選んだ矢印の子の `wbsParentUid` を `null` にする'],
    ['WL-12', '選ばずに、表 T-233 の `RS-70` を告げる'],
  ] as const)('T-351 %s still says it', (id, clause) => {
    expect(flat(rowText('T-351', id)), clause).toContain(flat(clause))
  })

  it('T-023b AR-7, T-023a PTD-5 and T-023c SL-1 / SL-4 still say it', () => {
    expect(flat(rowText('T-023b', 'AR-7'))).toContain('**WBS の親を結ぶ**'.replace(/\*\*/g, ''))
    expect(flat(rowText('T-023a', 'PTD-5'))).toContain('WBS の親を構えている（AR-7）')
    expect(flat(rowText('T-023c', 'SL-1'))).toContain('破線の矢印（表 T-318 で導いた親）を選んではならない（MUST NOT）')
    expect(flat(rowText('T-023c', 'SL-4'))).toContain('動かさない `Ctrl` ＋クリックも `Shift` と同じく 1 つずつ増減する')
    expect(cellOf('T-109', 'IC-142', '構え')).toContain('AR-7')
  })
})

// WHY: the owners whose families draw every arrow these cases press: P's (P -> G, C -> P, F -> P) and D's (D -> Q).
const DRAWN = { ownerUids: [P, D] }

const link = (childUid: number) => ({ kind: 'wbsParentLink', childUid }) as const
const task = (uid: number) => ({ kind: 'task', uid }) as const

const pick = (...items: readonly Loose[]): Selection => selectionOfAll(items as unknown as Parameters<typeof selectionOfAll>[0])

const itemsOf = (selection: Selection): readonly Loose[] => (selection as unknown as { readonly items: readonly Loose[] }).items

const kindsOf = (selection: Selection): string[] =>
  itemsOf(selection).map((one) => (one['kind'] === 'task' ? `task ${one['uid']}` : `${one['kind']} ${one['childUid']}`)).sort()

interface Gesture {
  readonly press: PointerPress
  readonly out: TranslatedInput
  readonly selection: Selection
}

const gesture = (scene: Scene, from: Pt, to: Pt = from, modifiers: Partial<typeof MODS> = {}): Gesture => {
  const bare = pressOf(scene, from, modifiers)
  const press = { ...bare, pressRow: pressRowOf(bare, scene.context) } as PointerPress
  const context = { ...scene.context, pressed: press } as InputContext
  const up = pointerAt('up', to, modifiers) as HumanInput
  return { press, out: commandFromInput(up, context), selection: selectionFromInput(up, context) }
}

const actionOf = (out: TranslatedInput): Loose | null => out.action as unknown as Loose | null

const writeGroupsOf = (out: TranslatedInput): readonly (readonly Loose[])[] => {
  const action = actionOf(out)
  if (action === null || action['kind'] !== 'changeDocument') return []
  return (action['writes'] as readonly (readonly Loose[])[]).filter((group) => group.length > 0)
}

describe('WL-10 / WL-12 / FR-135 -- the arrow as a thing to press', () => {
  it('WL-10: a point on a drawn solid arrow, away from every bar, answers the arrow', () => {
    const scene = sceneOf(DRAWN)
    const at = midOfArrow(scene, P)
    const hit = itemAtPointer(scene.geometry, at.x, at.y, grabSizesOf())
    expect(hit?.item).toEqual({ kind: 'wbsParentLink', childUid: P, isStated: true })
    expect(hit?.grab).toBe('WL-10')
  })

  it('FR-135: where a bar answers, the arrow does not -- the start of the arrow on the child bar is the bar', () => {
    const scene = sceneOf(DRAWN)
    const start = arrowOf(scene, P).points[0]!
    const inside = { x: start.x, y: start.y + barOf(scene, P).height / 2 }
    const hit = itemAtPointer(scene.geometry, inside.x, inside.y, grabSizesOf())
    expect(hit?.item.kind).toBe('task')
  })

  it('FR-135: an arrow not in a drawn family answers nothing', () => {
    const drawn = sceneOf(DRAWN)
    const at = midOfArrow(drawn, P)
    const bare = sceneOf(null)
    expect(itemAtPointer(bare.geometry, at.x, at.y, grabSizesOf())?.item.kind).not.toBe('wbsParentLink')
  })

  it('WL-10 / SL-1: a still release on a solid arrow selects that arrow', () => {
    const scene = sceneOf(DRAWN)
    const done = gesture(scene, midOfArrow(scene, P))
    expect(kindsOf(done.selection)).toEqual([`wbsParentLink ${P}`])
    expect(writeGroupsOf(done.out)).toEqual([])
  })

  it('WL-10 / SL-4: Shift adds a second arrow to the picked one', () => {
    const scene = sceneOf({ ...DRAWN, selectedLinkChildUids: [F] }, pick(link(F)))
    const done = gesture(scene, midOfArrow(scene, P), midOfArrow(scene, P), { shift: true })
    expect(kindsOf(done.selection)).toEqual([`wbsParentLink ${F}`, `wbsParentLink ${P}`].sort())
  })

  it('SL-4: an unmoved Ctrl click on a solid arrow adds it as Shift does, and does not pan', () => {
    const scene = sceneOf({ ...DRAWN, selectedLinkChildUids: [F] }, pick(link(F)))
    const at = midOfArrow(scene, P)
    const done = gesture(scene, at, at, { ctrl: true })
    expect(isParentPickingCtrlClick(done.press, at, scene.context)).toBe(true)
    expect(kindsOf(done.selection)).toEqual([`wbsParentLink ${F}`, `wbsParentLink ${P}`].sort())
    expect(writeGroupsOf(done.out), 'no PTD-1 pan writes').toEqual([])
  })

  it('WL-12 / RS-70: a still release on a dashed arrow selects nothing and tells derivedParentCannotBePicked', () => {
    const scene = sceneOf(DRAWN, pick(task(F)))
    const done = gesture(scene, midOfArrow(scene, D))
    expect(actionOf(done.out)).toEqual({ kind: 'tellEntryHasNothingToDo', situation: 'derivedParentCannotBePicked' })
    expect(kindsOf(done.selection)).not.toContain(`wbsParentLink ${D}`)
  })

  it('SL-1 / WL-4: a marquee takes the solid arrows and silently leaves the dashed ones', () => {
    const scene = sceneOf(DRAWN)
    const caught = itemsInMarquee(scene.geometry, { x: 0, y: 0, width: 4000, height: 4000 }) as unknown as readonly Loose[]
    const links = caught.filter((one) => one['kind'] === 'wbsParentLink')
    expect(links.map((one) => one['childUid']).sort()).toEqual([P, F].sort())
    for (const one of links) expect(one['isStated']).toBe(true)
  })

  it('WL-4 / PTD-5: armed, a drag from empty ground is a marquee that takes bars and solid arrows, no dashed one', () => {
    const scene = sceneOf(DRAWN, emptySelection(), true)
    const from = emptyPoint(scene)
    const press = pressOf(scene, from)
    expect(pressRowOf(press, scene.context), 'PTD-5').toBe('PTD-5')
    const done = gesture(scene, from, { x: 1, y: barOf(scene, C).y + barOf(scene, C).height + 4 })
    const picked = kindsOf(done.selection)
    expect(picked).toContain(`task ${C}`)
    expect(picked).toContain(`wbsParentLink ${P}`)
    expect(picked).not.toContain(`wbsParentLink ${D}`)
    expect(picked).not.toContain(`wbsParentLink ${C}`)
  })
})

describe('WL-11 -- Delete on picked arrows unlinks their children', () => {
  const unlinkBy = (key: string, selection: Selection): readonly (readonly Loose[])[] => {
    const scene = sceneOf(DRAWN, selection)
    const input = { kind: 'key', key, modifiers: MODS } as HumanInput
    return writeGroupsOf(commandFromInput(input, scene.context))
  }

  it('WL-11 / SK-3: Delete writes setTaskWbsParent with parentUid null for the picked arrow child', () => {
    const groups = unlinkBy(KEY.del, pick(link(P)))
    expect(groups.flat()).toEqual([{ kind: 'setTaskWbsParent', uid: P, parentUid: null }])
  })

  it('WL-11 / SK-3: Backspace does the same', () => {
    const groups = unlinkBy(KEY.backspace, pick(link(F)))
    expect(groups.flat()).toEqual([{ kind: 'setTaskWbsParent', uid: F, parentUid: null }])
  })

  it('WL-11 / FR-135: two picked arrows are unlinked in one call (one writes entry)', () => {
    const groups = unlinkBy(KEY.del, pick(link(P), link(F)))
    expect(groups.length).toBe(1)
    expect([...groups[0]!].sort((a, b) => Number(a['uid']) - Number(b['uid']))).toEqual([
      { kind: 'setTaskWbsParent', uid: P, parentUid: null },
      { kind: 'setTaskWbsParent', uid: F, parentUid: null },
    ])
  })

  it('WL-11 / IP-2: an unlinked child that derives a parent keeps a dashed arrow', () => {
    const tasks = FAMILY.tasks.map(([one, row]) => [one['uid'] === P ? { ...one, wbsParentUid: null } : one, row] as const)
    const spec = { groups: FAMILY.groups, tasks }
    const resolutions = wbsParentResolutionsOf({ schedule: scheduleOf(spec) } as unknown as Parameters<typeof wbsParentResolutionsOf>[0])
    expect(resolutions.get(P)).toEqual({ kind: 'derived', parentUid: G })
    const arrow = arrowOf(sceneOf({ ownerUids: [P] }, emptySelection(), false, spec), P)
    expect(arrow.isStated).toBe(false)
    expect(arrow.dash).not.toBeNull()
  })
})

describe('WL-1 / WL-2 / AR-7 -- arming the parent link', () => {
  const pressed = (session: ScreenSession): ScreenSession =>
    advanceScreenSession(session, { type: 'armEntryPressed', armKind: 'wbsParentArmed', shapeKind: null, glyph: null } as never).state

  it('IC-142 / AR-7: the palette entry arms the WBS parent link', () => {
    expect(armedByEntry('IC-142')).toEqual({ kind: 'wbsParentArmed' })
  })

  it('WL-1: pressing IC-142 arms, and the selection stays', () => {
    const before = emptyScreenSession
    const after = pressed(before)
    expect(after.screen.armModeState).toEqual({ kind: 'wbsParentArmed' })
    expect(after.selection).toEqual(before.selection)
  })

  it('WL-2: pressing IC-142 again disarms', () => {
    expect(pressed(pressed(emptyScreenSession)).screen.armModeState.kind).toBe('notArmed')
  })

  it('WL-2: Esc disarms', () => {
    const armed = pressed(emptyScreenSession)
    const after = advanceScreenSession(armed, { type: 'escapePressed', rung: 'armed' } as never).state
    expect(after.screen.armModeState.kind).toBe('notArmed')
    expect(after.selection).toEqual(armed.selection)
  })
})

describe('WL-3 / WL-5 .. WL-8 -- armed, a release picks and a drag links', () => {
  it('PTD-3 / AR-7: armed, a press on a bar is PTD-3, not a T-023d grab row', () => {
    const scene = sceneOf(DRAWN, emptySelection(), true)
    expect(pressRowOf(pressOf(scene, centreOf(barOf(scene, C))), scene.context)).toBe('PTD-3')
  })

  it('WL-3: armed, a still release on a bar selects it and writes nothing', () => {
    const scene = sceneOf(DRAWN, pick(task(F)), true)
    const done = gesture(scene, centreOf(barOf(scene, C)))
    expect(kindsOf(done.selection)).toEqual([`task ${C}`])
    expect(writeGroupsOf(done.out)).toEqual([])
  })

  it('WL-3 / SL-4: armed, an unmoved Ctrl click on a bar adds it as Shift does', () => {
    const scene = sceneOf(DRAWN, pick(task(F)), true)
    const at = centreOf(barOf(scene, C))
    const done = gesture(scene, at, at, { ctrl: true })
    expect(isParentPickingCtrlClick(done.press, at, scene.context)).toBe(true)
    expect(kindsOf(done.selection)).toEqual([`task ${C}`, `task ${F}`].sort())
  })

  it('WL-5: a drag from a bar in S to another bar links every task of S in one writes entry; the selection stays', () => {
    const selection = pick(task(C), task(F))
    const scene = sceneOf(DRAWN, selection, true)
    const done = gesture(scene, centreOf(barOf(scene, C)), centreOf(barOf(scene, Q)))
    const groups = writeGroupsOf(done.out)
    expect(groups.length, 'FR-135: one call').toBe(1)
    expect([...groups[0]!].sort((a, b) => Number(a['uid']) - Number(b['uid']))).toEqual([
      { kind: 'setTaskWbsParent', uid: C, parentUid: Q },
      { kind: 'setTaskWbsParent', uid: F, parentUid: Q },
    ])
    expect(kindsOf(done.selection)).toEqual([`task ${C}`, `task ${F}`].sort())
  })

  it('WL-6: a drag from a bar outside S replaces the selection with that bar and links it alone', () => {
    const scene = sceneOf(DRAWN, pick(task(F)), true)
    const done = gesture(scene, centreOf(barOf(scene, C)), centreOf(barOf(scene, Q)))
    expect(writeGroupsOf(done.out).flat()).toEqual([{ kind: 'setTaskWbsParent', uid: C, parentUid: Q }])
    expect(kindsOf(done.selection)).toEqual([`task ${C}`])
  })

  it('WL-7: a drag released where nothing answers does nothing', () => {
    const scene = sceneOf(DRAWN, pick(task(C)), true)
    const done = gesture(scene, centreOf(barOf(scene, C)), emptyPoint(scene))
    expect(writeGroupsOf(done.out)).toEqual([])
    expect(actionOf(done.out)?.['kind'] ?? null).not.toBe('tellEntryHasNothingToDo')
  })

  it('WL-8 / RS-69: a drag released on a milestone writes nothing and tells milestoneCannotBeAParent once', () => {
    const scene = sceneOf(DRAWN, pick(task(C), task(F)), true)
    const done = gesture(scene, centreOf(barOf(scene, C)), centreOf(barOf(scene, M)))
    expect(actionOf(done.out)).toEqual({ kind: 'tellEntryHasNothingToDo', situation: 'milestoneCannotBeAParent' })
    expect(writeGroupsOf(done.out)).toEqual([])
  })
})
