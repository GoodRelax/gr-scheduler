// CR-631 spec-only cases: how a WBS parent is resolved (table T-318) and which family arrows FR-135 draws.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  diagnoseDelay,
  wbsParentResolutionsOf,
  workingCalendarOf,
} from '../../src/entity/document-model/schedule/schedule'
import { selectionWith, emptySelection } from '../../src/entity/document-model/selection/selection'
import { unbroken } from '../contract/spec-table'
import {
  arrowOf,
  barOf,
  C,
  cellOf,
  D,
  E,
  F,
  FAMILY,
  G,
  iso,
  M,
  numberIn,
  numbersIn,
  P,
  Q,
  R,
  rowText,
  sceneOf,
  scheduleOf,
  taskOf,
  wbsParentsOf,
  type Pt,
  type SceneSpec,
} from './cr-631-scene'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const flat = (text: string): string => text.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

const IP_5_ROOT = '上に行の無い行（最上位の行）に載る `Task` は、`wbsParentUid` が `null` なら親なし（根）とする。'
const IP_5_NO_VO_4 = '候補を求めず、表 T-312 の `VO-4` にしない。'
const FR_135_FAMILY = '家族とは、持ち主の `Task` から親への矢印と、持ち主の子からその `Task` への矢印である。'
const FR_135_NOT_ALL = '⛔ すべての親子を一度に描いてはならない（MUST NOT）'
const FR_135_SHAPE = '矢印は、子のバーの上辺の中ほどから縦に上がり、矢じりが親のバーの下辺に触れる形とし'
const FR_135_BEND = '子の中ほどが親の幅の外にあれば、子の上で 1 度折れて親の幅の中へ寄ること（MUST）'
const FR_135_INK = '明記の親（`wbsParentUid`）への矢印は実線、表 T-318 で導いた親への矢印は `_assets/tbl-settings.md` の 表 T-206 の `S-486` の刻みの破線とし'
const FR_135_HEAD = '矢じりは依存線と同じ大きさ（表 T-201 の `S-19` ・ `S-300`）とすること（MUST）'
const FR_135_HIT = '矢印の当たりの太さは 表 T-206 の `S-485` とする。'
const FR_135_QUERY = '子の上に `?` を、表 T-318 の `IP-4` の並びの頭 3 つの候補に破線の枠と並びの番号を'
const FR_135_LABEL = 'その `Task` の親（明記または導いたもの）の名称ラベルを `S-398` の色と `S-399` の太さで描くこと（MUST）'

describe('CR-631 -- the manuscript these cases are driven by', () => {
  it.each([
    ['T-318 IP-5 (root)', rowText('T-318', 'IP-5'), IP_5_ROOT],
    ['T-318 IP-5 (no VO-4)', rowText('T-318', 'IP-5'), IP_5_NO_VO_4],
  ] as const)('%s still says it', (_name, cell, clause) => {
    expect(flat(cell), clause).toContain(flat(clause))
  })

  it('FR-135 still says what the arrow cases test', () => {
    for (const clause of [FR_135_FAMILY, FR_135_NOT_ALL, FR_135_SHAPE, FR_135_BEND, FR_135_INK, FR_135_HEAD, FR_135_HIT,
      FR_135_QUERY, FR_135_LABEL]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
  })
})

type Resolutions = ReturnType<typeof wbsParentResolutionsOf>

const resolutionsOf = (spec: SceneSpec = FAMILY): Resolutions =>
  wbsParentResolutionsOf({ schedule: scheduleOf(spec) } as unknown as Parameters<typeof wbsParentResolutionsOf>[0])

describe('T-318 -- how a parent not written down is resolved', () => {
  it('IP-5: a task on a top row with wbsParentUid null is a root, and asks for no candidates', () => {
    const resolutions = resolutionsOf()
    expect(resolutions.get(G)).toEqual({ kind: 'root' })
    expect(resolutions.get(R)).toEqual({ kind: 'root' })
  })

  it('IP-5: a root is not reported as VO-4, while an undecided child below still is', () => {
    const schedule = scheduleOf(FAMILY, iso(15))
    const report = diagnoseDelay(
      { schedule } as unknown as Parameters<typeof diagnoseDelay>[0],
      workingCalendarOf(schedule),
    )
    const vo4 = report.findings.filter((one) => one.row === 'VO-4').map((one) => one.uid)
    expect(vo4, 'IP-5: no VO-4 for the top-row roots').not.toContain(G)
    expect(vo4, 'IP-5: no VO-4 for the top-row roots').not.toContain(R)
    expect(vo4, 'IP-3: the child with two candidates is VO-4').toContain(E)
  })

  it('FR-135: a written wbsParentUid is the stated parent', () => {
    const resolutions = resolutionsOf()
    expect(resolutions.get(P)).toEqual({ kind: 'stated', parentUid: G })
    expect(resolutions.get(F)).toEqual({ kind: 'stated', parentUid: P })
  })

  it('IP-1 / IP-2: exactly one bar one depth up that encloses both ends is the derived parent', () => {
    const resolutions = resolutionsOf()
    expect(resolutions.get(C)).toEqual({ kind: 'derived', parentUid: P })
    expect(resolutions.get(D)).toEqual({ kind: 'derived', parentUid: Q })
    expect(resolutions.get(Q)).toEqual({ kind: 'derived', parentUid: G })
  })

  it('IP-3 / IP-4: no enclosing bar leaves the parent undecided, the overlapping bar before the near one, never a milestone', () => {
    const found = resolutionsOf().get(E)
    expect(found?.kind).toBe('undecided')
    const candidates = found?.kind === 'undecided' ? [...found.candidates] : []
    expect(candidates, 'IP-4 (2) overlapping P before (3) near Q; FR-135 a milestone is never a parent').toEqual([P, Q])
    expect(candidates).not.toContain(M)
  })
})

const FR_135_NO_MILESTONE_PARENT = '⛔ マイルストーンを親にしてはならない（MUST NOT） —— `wbsParentUid` が明記していても同じである。'
const FR_135_READ_AS_NULL = '診断は、マイルストーンを指す `wbsParentUid` を親として読まず、その子を `wbsParentUid` が `null` の `Task` として 表 T-318 で親を導くこと（MUST）'

// WHY: X, Y and Z each state a milestone as their parent; X is enclosed by P alone, Y by nothing, Z sits on the top row.
const X = 10
const Y = 11
const Z = 12
const N = 13
const MILESTONE_PARENTS: SceneSpec = {
  groups: FAMILY.groups,
  tasks: [
    ...FAMILY.tasks,
    [taskOf(N, 44, 44, null, true), 'top'],
    [taskOf(Z, 46, 50, N), 'top'],
    [taskOf(X, 5, 9, M), 'low'],
    [taskOf(Y, 19, 23, M), 'low'],
  ],
}

describe('FR-135 / JDG-1118 -- "マイルストーンを親にしてはならない", even when wbsParentUid states one', () => {
  it('FR-135 still says a stated milestone parent is read as null and the child derived by T-318', () => {
    expect(REQUIREMENTS, FR_135_NO_MILESTONE_PARENT).toContain(FR_135_NO_MILESTONE_PARENT)
    expect(REQUIREMENTS, FR_135_READ_AS_NULL).toContain(FR_135_READ_AS_NULL)
  })

  it('FR-135 / JDG-1118: no child is resolved as stated with a milestone for its parent', () => {
    const resolutions = resolutionsOf(MILESTONE_PARENTS)
    for (const uid of [X, Y, Z]) {
      expect(resolutions.get(uid)?.kind, `task ${String(uid)} states a milestone parent`).not.toBe('stated')
    }
  })

  it('FR-135 / JDG-1118: a child stating a milestone parent falls to T-318 -- derived, undecided or root', () => {
    const resolutions = resolutionsOf(MILESTONE_PARENTS)
    expect(resolutions.get(X), 'IP-2: P alone encloses X').toEqual({ kind: 'derived', parentUid: P })
    const found = resolutions.get(Y)
    expect(found?.kind, 'IP-3: no bar encloses Y').toBe('undecided')
    expect(found?.kind === 'undecided' ? [...found.candidates] : [], 'IP-4: a milestone is never a candidate').not.toContain(M)
    expect(resolutions.get(Z), 'IP-5: Z on the top row is a root').toEqual({ kind: 'root' })
  })
})

const T201 = (id: string): number => numberIn(cellOf('T-201', id, '既定値'))
const T206 = (id: string): number => numberIn(cellOf('T-206', id, '既定'))
const DRAW_RATIO_AT_100 = T206('S-236')

const arrowPairs = (spec: Parameters<typeof sceneOf>[0]): string[] =>
  wbsParentsOf(sceneOf(spec)).arrows.map((one) => `${one.childUid}->${one.parentUid}`).sort()

const triangleSpan = (head: readonly Pt[]): { readonly along: number; readonly across: number } => {
  const ys = head.map((one) => one.y)
  const xs = head.map((one) => one.x)
  return { along: Math.max(...ys) - Math.min(...ys), across: Math.max(...xs) - Math.min(...xs) }
}

describe('FR-135 -- the family arrows', () => {
  it('FR-135: with no families handed over, nothing is drawn', () => {
    const drawing = wbsParentsOf(sceneOf(null))
    expect(drawing.arrows).toEqual([])
    expect(drawing.queries).toEqual([])
    expect(drawing.highlightedParentUid).toBeNull()
  })

  it('FR-135: the owner P draws P -> its parent and each child of P -> P, and no other pair', () => {
    expect(arrowPairs({ ownerUids: [P] })).toEqual([`${C}->${P}`, `${F}->${P}`, `${P}->${G}`].sort())
  })

  it('FR-135: the owner C draws only C -> P, not its sibling F -> P nor the grandparent', () => {
    expect(arrowPairs({ ownerUids: [C] })).toEqual([`${C}->${P}`])
  })

  it('FR-135: the pointed task is an owner and its parent is the one whose name is highlighted', () => {
    const scene = sceneOf({ ownerUids: [], pointedUid: C })
    expect(wbsParentsOf(scene).highlightedParentUid).toBe(P)
    expect(wbsParentsOf(sceneOf({ ownerUids: [P], pointedUid: null })).highlightedParentUid, 'no pointed task').toBeNull()
  })

  it('FR-135: the arrow rises from the middle of the child top edge and its head touches the parent bottom edge', () => {
    const scene = sceneOf({ ownerUids: [P] })
    const arrow = arrowOf(scene, P)
    const child = barOf(scene, P)
    const parent = barOf(scene, G)
    const first = arrow.points[0]!
    expect(first.x).toBeCloseTo(child.x + child.width / 2, 3)
    expect(first.y).toBeCloseTo(child.y, 3)
    const tip = arrow.head.reduce((top, one) => (one.y < top.y ? one : top))
    expect(tip.y, 'the head touches the parent bottom edge').toBeCloseTo(parent.y + parent.height, 3)
    expect(tip.x).toBeGreaterThanOrEqual(parent.x)
    expect(tip.x).toBeLessThanOrEqual(parent.x + parent.width)
  })

  it('FR-135: a child whose middle lies outside the parent width jogs once above the child into the parent width', () => {
    const X = 10
    const spec: SceneSpec = {
      groups: FAMILY.groups,
      tasks: [...FAMILY.tasks, [taskOf(X, 38, 46, Q), 'low']],
    }
    const scene = sceneOf({ ownerUids: [X] }, emptySelection(), false, spec)
    const arrow = arrowOf(scene, X)
    const child = barOf(scene, X)
    const parent = barOf(scene, Q)
    const middle = child.x + child.width / 2
    expect(middle, 'premise: the child middle is right of the parent').toBeGreaterThan(parent.x + parent.width)
    const points = arrow.points
    const runs = points.slice(1).map((one, at) => ({ from: points[at]!, to: one }))
    const across = runs.filter((run) => Math.abs(run.to.x - run.from.x) > 1e-6)
    expect(points[0]!.x).toBeCloseTo(middle, 3)
    expect(points[1]!.y, 'it first rises from the child').toBeLessThan(points[0]!.y)
    expect(across.length, `one jog toward the parent in ${JSON.stringify(points)}`).toBe(1)
    expect(across[0]!.from.y, 'the jog sits above the child').toBeLessThan(child.y)
    for (const run of runs) expect(run.to.y, 'the route never descends').toBeLessThanOrEqual(run.from.y + 1e-6)
    const tip = arrow.head.reduce((top, one) => (one.y < top.y ? one : top))
    expect(tip.x).toBeGreaterThanOrEqual(parent.x)
    expect(tip.x).toBeLessThanOrEqual(parent.x + parent.width)
    expect(tip.y).toBeCloseTo(parent.y + parent.height, 3)
  })

  it('FR-135 / S-486: a stated arrow is solid, a derived one is dashed by the S-486 pair', () => {
    const scene = sceneOf({ ownerUids: [P, D] })
    expect(arrowOf(scene, P).isStated).toBe(true)
    expect(arrowOf(scene, P).dash).toBeNull()
    expect(arrowOf(scene, D).isStated).toBe(false)
    expect(arrowOf(scene, D).dash).toEqual(numbersIn(cellOf('T-206', 'S-486', '既定')).slice(0, 2))
  })

  it('FR-135 / S-19 / S-300: the head is the dependency head size', () => {
    const span = triangleSpan(arrowOf(sceneOf({ ownerUids: [P] }), P).head)
    expect(span.along).toBeCloseTo(T201('S-19') * DRAW_RATIO_AT_100, 3)
    expect(span.across).toBeCloseTo(T201('S-300') * DRAW_RATIO_AT_100, 3)
  })

  it('FR-135 / S-485: every arrow is hit within the S-485 width', () => {
    const hit = numberIn(cellOf('T-206', 'S-485', '既定'))
    for (const arrow of wbsParentsOf(sceneOf({ ownerUids: [P, D] })).arrows) expect(arrow.hitWidth).toBe(hit)
  })

  it('FR-135 / SL-8: an arrow whose child is a picked link is drawn as selected, the others are not', () => {
    const picked = selectionWith(emptySelection(), { kind: 'wbsParentLink', childUid: F })
    const scene = sceneOf({ ownerUids: [F], selectedLinkChildUids: [F] }, picked)
    for (const arrow of wbsParentsOf(scene).arrows) expect(arrow.isSelected, `${arrow.childUid}`).toBe(arrow.childUid === F)
  })
})

describe('FR-135 / VO-4 -- the marks of a child whose parent is undecided', () => {
  it('VO-4: an undecided owner gets a query whose candidates follow IP-4 and are numbered from 1', () => {
    const queries = wbsParentsOf(sceneOf({ ownerUids: [E] })).queries
    expect(queries.map((one) => one.childUid)).toEqual([E])
    const candidates = queries[0]!.candidates
    expect(candidates.map((one) => one.uid)).toEqual([P, Q])
    expect(candidates.map((one) => one.order)).toEqual([1, 2])
    expect(queries[0]!.dash.length).toBe(2)
  })

  it('VO-4: only the head three of the IP-4 order are marked', () => {
    const K = 20
    const spec: SceneSpec = {
      groups: [
        ['top', null],
        ['mid', 'top'],
        ['low', 'mid'],
      ],
      tasks: [
        [taskOf(25, 0, 40, null), 'top'],
        [taskOf(21, 5, 12, null), 'mid'],
        [taskOf(22, 18, 25, null), 'mid'],
        [taskOf(23, 0, 3, null), 'mid'],
        [taskOf(24, 30, 35, null), 'mid'],
        [taskOf(K, 10, 20, null), 'low'],
      ],
    }
    const found = resolutionsOf(spec).get(K)
    expect(found?.kind).toBe('undecided')
    const order = found?.kind === 'undecided' ? [...found.candidates] : []
    expect(new Set(order.slice(0, 2)), 'IP-4 (2) the two overlapping bars first').toEqual(new Set([21, 22]))
    expect(order.slice(2), 'IP-4 (3) then by the nearest ends').toEqual([23, 24])
    const query = wbsParentsOf(sceneOf({ ownerUids: [K] }, emptySelection(), false, spec)).queries[0]!
    expect(query.candidates.map((one) => one.uid)).toEqual(order.slice(0, 3))
    expect(query.candidates.map((one) => one.order)).toEqual([1, 2, 3])
  })
})
