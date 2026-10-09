// CR-631 spec-only cases: what a pointer or a key on the parent task arrows and the armed bars does (table T-351).

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
import { parentTaskResolutionsOf } from '../../src/entity/document-model/schedule/schedule'
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
    ['PTL-1', '構える。'],
    ['PTL-2', '構えを解く。'],
    ['PTL-4', '取るのはバーと実線の矢印であり、破線の矢印は黙って除く'],
    ['PTL-5', 'S の `Task` すべての親を、離した先のバーの `Task` にする'],
    ['PTL-6', '選択を引き始めたバー 1 つに替えてから、`PTL-5` と同じく結ぶ'],
    ['PTL-7', '何もしない'],
    ['PTL-8', '表 T-233 の `RS-69` を `NT-1` の通知として告げ'],
    ['PTL-10', '矢印を選ぶ（`SL-1`）'],
    ['PTL-11', '選んだ矢印の子の `parentTaskUid` を `null` にする'],
    ['PTL-12', '選ばずに、表 T-233 の `RS-70` を告げる'],
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

const link = (childUid: number) => ({ kind: 'parentTaskLink', childUid }) as const
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

describe('PTL-10 / PTL-12 / FR-135 -- the arrow as a thing to press', () => {
  it('PTL-10: a point on a drawn solid arrow, away from every bar, answers the arrow', () => {
    const scene = sceneOf(DRAWN)
    const at = midOfArrow(scene, P)
    const hit = itemAtPointer(scene.geometry, at.x, at.y, grabSizesOf())
    expect(hit?.item).toEqual({ kind: 'parentTaskLink', childUid: P, isStated: true })
    expect(hit?.grab).toBe('PTL-10')
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
    expect(itemAtPointer(bare.geometry, at.x, at.y, grabSizesOf())?.item.kind).not.toBe('parentTaskLink')
  })

  it('PTL-10 / SL-1: a still release on a solid arrow selects that arrow', () => {
    const scene = sceneOf(DRAWN)
    const done = gesture(scene, midOfArrow(scene, P))
    expect(kindsOf(done.selection)).toEqual([`parentTaskLink ${P}`])
    expect(writeGroupsOf(done.out)).toEqual([])
  })

  it('PTL-10 / SL-4: Shift adds a second arrow to the picked one', () => {
    const scene = sceneOf({ ...DRAWN, selectedLinkChildUids: [F] }, pick(link(F)))
    const done = gesture(scene, midOfArrow(scene, P), midOfArrow(scene, P), { shift: true })
    expect(kindsOf(done.selection)).toEqual([`parentTaskLink ${F}`, `parentTaskLink ${P}`].sort())
  })

  it('SL-4: an unmoved Ctrl click on a solid arrow adds it as Shift does, and does not pan', () => {
    const scene = sceneOf({ ...DRAWN, selectedLinkChildUids: [F] }, pick(link(F)))
    const at = midOfArrow(scene, P)
    const done = gesture(scene, at, at, { ctrl: true })
    expect(isParentPickingCtrlClick(done.press, at, scene.context)).toBe(true)
    expect(kindsOf(done.selection)).toEqual([`parentTaskLink ${F}`, `parentTaskLink ${P}`].sort())
    expect(writeGroupsOf(done.out), 'no PTD-1 pan writes').toEqual([])
  })

  it('PTL-12 / RS-70: a still release on a dashed arrow selects nothing and tells derivedParentCannotBePicked', () => {
    const scene = sceneOf(DRAWN, pick(task(F)))
    const done = gesture(scene, midOfArrow(scene, D))
    expect(actionOf(done.out)).toEqual({ kind: 'tellEntryHasNothingToDo', situation: 'derivedParentCannotBePicked' })
    expect(kindsOf(done.selection)).not.toContain(`parentTaskLink ${D}`)
  })

  it('SL-1 / PTL-4: a marquee takes the solid arrows and silently leaves the dashed ones', () => {
    const scene = sceneOf(DRAWN)
    const caught = itemsInMarquee(scene.geometry, { x: 0, y: 0, width: 4000, height: 4000 }) as unknown as readonly Loose[]
    const links = caught.filter((one) => one['kind'] === 'parentTaskLink')
    expect(links.map((one) => one['childUid']).sort()).toEqual([P, F].sort())
    for (const one of links) expect(one['isStated']).toBe(true)
  })

  it('PTL-4 / PTD-5: armed, a drag from empty ground is a marquee that takes bars and solid arrows, no dashed one', () => {
    const scene = sceneOf(DRAWN, emptySelection(), true)
    const from = emptyPoint(scene)
    const press = pressOf(scene, from)
    expect(pressRowOf(press, scene.context), 'PTD-5').toBe('PTD-5')
    const done = gesture(scene, from, { x: 1, y: barOf(scene, C).y + barOf(scene, C).height + 4 })
    const picked = kindsOf(done.selection)
    expect(picked).toContain(`task ${C}`)
    expect(picked).toContain(`parentTaskLink ${P}`)
    expect(picked).not.toContain(`parentTaskLink ${D}`)
    expect(picked).not.toContain(`parentTaskLink ${C}`)
  })
})

describe('PTL-11 -- Delete on picked arrows unlinks their children', () => {
  const unlinkBy = (key: string, selection: Selection): readonly (readonly Loose[])[] => {
    const scene = sceneOf(DRAWN, selection)
    const input = { kind: 'key', key, modifiers: MODS } as HumanInput
    return writeGroupsOf(commandFromInput(input, scene.context))
  }

  it('PTL-11 / SK-3: Delete writes setTaskParentTask with parentUid null for the picked arrow child', () => {
    const groups = unlinkBy(KEY.del, pick(link(P)))
    expect(groups.flat()).toEqual([{ kind: 'setTaskParentTask', uid: P, parentUid: null }])
  })

  it('PTL-11 / SK-3: Backspace does the same', () => {
    const groups = unlinkBy(KEY.backspace, pick(link(F)))
    expect(groups.flat()).toEqual([{ kind: 'setTaskParentTask', uid: F, parentUid: null }])
  })

  it('PTL-11 / FR-135: two picked arrows are unlinked in one call (one writes entry)', () => {
    const groups = unlinkBy(KEY.del, pick(link(P), link(F)))
    expect(groups.length).toBe(1)
    expect([...groups[0]!].sort((a, b) => Number(a['uid']) - Number(b['uid']))).toEqual([
      { kind: 'setTaskParentTask', uid: P, parentUid: null },
      { kind: 'setTaskParentTask', uid: F, parentUid: null },
    ])
  })

  it('PTL-11 / IP-2: an unlinked child that derives a parent keeps a dashed arrow', () => {
    const tasks = FAMILY.tasks.map(([one, row]) => [one['uid'] === P ? { ...one, parentTaskUid: null } : one, row] as const)
    const spec = { groups: FAMILY.groups, tasks }
    const resolutions = parentTaskResolutionsOf({ schedule: scheduleOf(spec) } as unknown as Parameters<typeof parentTaskResolutionsOf>[0])
    expect(resolutions.get(P)).toEqual({ kind: 'derived', parentUid: G })
    const arrow = arrowOf(sceneOf({ ownerUids: [P] }, emptySelection(), false, spec), P)
    expect(arrow.isStated).toBe(false)
    expect(arrow.dash).not.toBeNull()
  })
})

describe('PTL-1 / PTL-2 / AR-7 -- arming the parent link', () => {
  const pressed = (session: ScreenSession): ScreenSession =>
    advanceScreenSession(session, { type: 'armEntryPressed', armKind: 'parentTaskArmed', shapeKind: null, glyph: null } as never).state

  it('IC-142 / AR-7: the palette entry arms the parent task link', () => {
    expect(armedByEntry('IC-142')).toEqual({ kind: 'parentTaskArmed' })
  })

  it('PTL-1: pressing IC-142 arms, and the selection stays', () => {
    const before = emptyScreenSession
    const after = pressed(before)
    expect(after.screen.armModeState).toEqual({ kind: 'parentTaskArmed' })
    expect(after.selection).toEqual(before.selection)
  })

  it('PTL-2: pressing IC-142 again disarms', () => {
    expect(pressed(pressed(emptyScreenSession)).screen.armModeState.kind).toBe('notArmed')
  })

  it('PTL-2: Esc disarms', () => {
    const armed = pressed(emptyScreenSession)
    const after = advanceScreenSession(armed, { type: 'escapePressed', rung: 'armed' } as never).state
    expect(after.screen.armModeState.kind).toBe('notArmed')
    expect(after.selection).toEqual(armed.selection)
  })
})

describe('PTL-3 / PTL-5 .. PTL-8 -- armed, a release picks and a drag links', () => {
  it('PTD-3 / AR-7: armed, a press on a bar is PTD-3, not a T-023d grab row', () => {
    const scene = sceneOf(DRAWN, emptySelection(), true)
    expect(pressRowOf(pressOf(scene, centreOf(barOf(scene, C))), scene.context)).toBe('PTD-3')
  })

  it('PTL-3: armed, a still release on a bar selects it and writes nothing', () => {
    const scene = sceneOf(DRAWN, pick(task(F)), true)
    const done = gesture(scene, centreOf(barOf(scene, C)))
    expect(kindsOf(done.selection)).toEqual([`task ${C}`])
    expect(writeGroupsOf(done.out)).toEqual([])
  })

  it('PTL-3 / SL-4: armed, an unmoved Ctrl click on a bar adds it as Shift does', () => {
    const scene = sceneOf(DRAWN, pick(task(F)), true)
    const at = centreOf(barOf(scene, C))
    const done = gesture(scene, at, at, { ctrl: true })
    expect(isParentPickingCtrlClick(done.press, at, scene.context)).toBe(true)
    expect(kindsOf(done.selection)).toEqual([`task ${C}`, `task ${F}`].sort())
  })

  it('PTL-5: a drag from a bar in S to another bar links every task of S in one writes entry; the selection stays', () => {
    const selection = pick(task(C), task(F))
    const scene = sceneOf(DRAWN, selection, true)
    const done = gesture(scene, centreOf(barOf(scene, C)), centreOf(barOf(scene, Q)))
    const groups = writeGroupsOf(done.out)
    expect(groups.length, 'FR-135: one call').toBe(1)
    expect([...groups[0]!].sort((a, b) => Number(a['uid']) - Number(b['uid']))).toEqual([
      { kind: 'setTaskParentTask', uid: C, parentUid: Q },
      { kind: 'setTaskParentTask', uid: F, parentUid: Q },
    ])
    expect(kindsOf(done.selection)).toEqual([`task ${C}`, `task ${F}`].sort())
  })

  it('PTL-6: a drag from a bar outside S replaces the selection with that bar and links it alone', () => {
    const scene = sceneOf(DRAWN, pick(task(F)), true)
    const done = gesture(scene, centreOf(barOf(scene, C)), centreOf(barOf(scene, Q)))
    expect(writeGroupsOf(done.out).flat()).toEqual([{ kind: 'setTaskParentTask', uid: C, parentUid: Q }])
    expect(kindsOf(done.selection)).toEqual([`task ${C}`])
  })

  it('PTL-7: a drag released where nothing answers does nothing', () => {
    const scene = sceneOf(DRAWN, pick(task(C)), true)
    const done = gesture(scene, centreOf(barOf(scene, C)), emptyPoint(scene))
    expect(writeGroupsOf(done.out)).toEqual([])
    expect(actionOf(done.out)?.['kind'] ?? null).not.toBe('tellEntryHasNothingToDo')
  })

  it('PTL-8 / RS-69: a drag released on a milestone writes nothing and tells milestoneCannotBeAParent once', () => {
    const scene = sceneOf(DRAWN, pick(task(C), task(F)), true)
    const done = gesture(scene, centreOf(barOf(scene, C)), centreOf(barOf(scene, M)))
    expect(actionOf(done.out)).toEqual({ kind: 'tellEntryHasNothingToDo', situation: 'milestoneCannotBeAParent' })
    expect(writeGroupsOf(done.out)).toEqual([])
  })
})
