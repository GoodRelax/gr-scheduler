// DFC-1991 spec-only cases: Shift adds or removes one item only on a click (SL-4); a drag keeps or narrows the selection (T-270, SL-7a).

import { describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressRowOf,
  selectionFromInput,
  type HumanInput,
  type InputContext,
  type PointerPress,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { selectionOfAll, type Selection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { barOf, cellOf, centreOf, G, MODS, numberIn, pointerAt, pressOf, Q, rowText, sceneOf, type Loose, type Pt, type Scene } from './cr-631-scene'

const flat = (text: string): string => text.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

// WHY: the three grabs of a task body -- a press on any of them moves the whole selection (table T-270 PE-1).
const BODY_GRABS = ['GA-9', 'GA-14', 'GA-15']

// WHY: the boundary between a click and a drag is the settings row S-208 of table T-206, never a number held here.
const S_208 = numberIn(cellOf('T-206', 'S-208', '既定'))

describe('DFC-1991 -- the rows these cases are driven by', () => {
  it('SL-4: Shift adds or removes one at a time on a click, and adds what a range selection encloses', () => {
    const text = flat(rowText('T-023c', 'SL-4'))
    expect(text).toContain('`Shift` を併用する。')
    expect(text).toContain('クリックなら 1 つずつ増減し')
  })

  it('SL-7a: dragging an end narrows the selection to the grabbed one', () => {
    expect(flat(rowText('T-023c', 'SL-7a'))).toContain('選択を掴んだ 1 つに絞り、そのタスクだけをリサイズすること（MUST）')
  })

  it('S-208: the row of table T-206 is a positive number', () => {
    expect(S_208).toBeGreaterThan(0)
  })

  it('TC-5: a move past S-208 is a drag and a move within it is a click', () => {
    expect(flat(rowText('T-239', 'TC-5'))).toContain('`S-208` を超えて動いたときをドラッグとし、超えないときをクリックとすること（MUST）')
  })
})

const task = (uid: number) => ({ kind: 'task', uid }) as const

const pick = (...items: readonly Loose[]): Selection => selectionOfAll(items as unknown as Parameters<typeof selectionOfAll>[0])

const uidsOf = (selection: Selection): number[] =>
  (selection as unknown as { readonly items: readonly Loose[] }).items
    .filter((one) => one['kind'] === 'task')
    .map((one) => one['uid'] as number)
    .sort((a, b) => a - b)

const gesture = (
  scene: Scene,
  from: Pt,
  to: Pt = from,
  modifiers: Partial<typeof MODS> = {},
): { readonly out: TranslatedInput; readonly selection: Selection } => {
  const bare = pressOf(scene, from, modifiers)
  const press = { ...bare, pressRow: pressRowOf(bare, scene.context) } as PointerPress
  const context = { ...scene.context, pressed: press } as InputContext
  const up = pointerAt('up', to, modifiers) as HumanInput
  return { out: commandFromInput(up, context), selection: selectionFromInput(up, context) }
}

const grabAt = (scene: Scene, at: Pt): string | undefined => {
  const hit = itemAtPointer(scene.geometry, at.x, at.y, grabSizesOf())
  return hit === null ? undefined : (hit.grab as string)
}

const A = G
const B = Q

const bodyOf = (scene: Scene, uid: number): Pt => {
  const at = centreOf(barOf(scene, uid))
  expect(BODY_GRABS, `the centre of task ${uid} is a body grab`).toContain(grabAt(scene, at))
  return at
}

// WHY: a point on the bar's end, found by the hit test itself so the case does not assume the grab's size.
const endOf = (scene: Scene, uid: number): Pt => {
  const bar = barOf(scene, uid)
  const middle = bar.y + bar.height / 2
  const candidates: Pt[] = []
  for (let offset = 0; offset <= 12; offset += 1) {
    candidates.push({ x: bar.x - offset, y: middle }, { x: bar.x + offset, y: middle })
    candidates.push({ x: bar.x + bar.width - offset, y: middle }, { x: bar.x + bar.width + offset, y: middle })
  }
  const found = candidates.find((at) => {
    const hit = itemAtPointer(scene.geometry, at.x, at.y, grabSizesOf())
    return hit !== null && hit.item.kind === 'task' && (hit.item as unknown as Loose)['taskUid'] === uid && !BODY_GRABS.includes(hit.grab as string)
  })
  if (found === undefined) throw new Error(`no point on an end of task ${uid} answers a non-body grab`)
  return found
}

const farFrom = (at: Pt): Pt => ({ x: at.x + S_208 * 4 + 40, y: at.y })

describe('T-270 / SL-4 / SL-7a -- Shift with a press on a selected task', () => {
  const both = (): Scene => sceneOf(null, pick(task(A), task(B)))

  it('T-270 / SL-4: a Shift press on the body of a selected task, dragged well past S-208, leaves both selected', () => {
    const scene = both()
    const from = bodyOf(scene, A)
    const done = gesture(scene, from, farFrom(from), { shift: true })
    expect(uidsOf(done.selection)).toEqual([A, B].sort((a, b) => a - b))
  })

  it('SL-4: a Shift press and release on the body of a selected task, unmoved, removes it and keeps the other', () => {
    const scene = both()
    const at = bodyOf(scene, A)
    const done = gesture(scene, at, at, { shift: true })
    expect(uidsOf(done.selection)).toEqual([B])
  })

  it('SL-4: a Shift click on the body of an unselected task adds it to the selection', () => {
    const scene = sceneOf(null, pick(task(B)))
    const at = bodyOf(scene, A)
    const done = gesture(scene, at, at, { shift: true })
    expect(uidsOf(done.selection)).toEqual([A, B].sort((a, b) => a - b))
  })

  it('T-270 / SL-7a: a Shift press on an end of a selected task, dragged past S-208, narrows the selection to that task', () => {
    const scene = both()
    const from = endOf(scene, A)
    const done = gesture(scene, from, farFrom(from), { shift: true })
    expect(uidsOf(done.selection)).toEqual([A])
  })
})
