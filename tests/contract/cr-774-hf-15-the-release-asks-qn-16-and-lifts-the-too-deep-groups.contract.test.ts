// CR-774 spec-only cases: a release past the depth cap asks QN-16; No writes nothing, Yes moves and lifts the too-deep task groups in one undo step (HF-15, UF-97, QN-16).

import { afterEach, describe, expect, it } from 'vitest'

import { WORDS } from './cr-731-stage'
import { key, type Shell } from './cr-772-shell-stage'
import {
  S_125,
  actionOf,
  applyMoves,
  bundlesOf,
  carryUnder,
  childrenIn,
  deepestIn,
  dragUnder,
  groupsOf,
  idsDeeperThan,
  landingAt,
  liftMovesAfter,
  releaseAt,
  shellOf,
  under,
  type TaskGroupRow,
} from './cr-774-stage'

const realRaf = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame
  else (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = realRaf
})

const answerKey = (answer: 'proceed' | 'cancel'): string => {
  const words = (WORDS['confirmation'] as { answer: string; text: { ja: string } }[]).find((one) => one.answer === answer)
  return (words?.text.ja ?? '').slice(0, 1).toUpperCase()
}

const sentenceOf = (language: 'ja' | 'en'): string => {
  const entry = (WORDS['questions'] as { rowId: string; text: Record<string, string> }[]).find((one) => one.rowId === 'QN-16')
  return (entry?.text[language] ?? '').split('{maxGroupDepth}').join(String(S_125))
}

describe('UF-97 -- a release past the limit returns the move and the lifts as one bundle, tagged with QN-16', () => {
  it('H let go at depth 2 under P: one changeDocument with question QN-16, the move first, then the lifts of H4a and H4b', () => {
    const landing = landingAt('H', 1, under('P1'))
    expect(landing?.isPastDepthCap).toBe(true)
    const result = releaseAt('H', 1, under('P1'))
    const action = actionOf(result)
    expect(action?.kind).toBe('changeDocument')
    expect(action?.question).toBe('QN-16')
    const bundles = bundlesOf(result)
    expect(bundles, 'the move and the lifts are ONE bundle, which is one undo step').toHaveLength(1)
    const [move, ...lifts] = bundles[0] ?? []
    expect(move).toMatchObject({ kind: 'moveTaskGroup', taskGroupId: 'H', parentId: landing?.parentId, order: landing?.order })
    expect(lifts.map((one) => [one.kind, one.taskGroupId])).toEqual([
      ['moveTaskGroup', 'H4a'],
      ['moveTaskGroup', 'H4b'],
    ])
  })

  it('the lifts are exactly what taskGroupLiftMovesAfter gives for the landing', () => {
    const landing = landingAt('H', 1, under('P1'))
    expect(landing).not.toBeNull()
    const lifts = liftMovesAfter('H', landing as NonNullable<typeof landing>)
    expect(bundlesOf(releaseAt('H', 1, under('P1')))[0]?.slice(1)).toEqual(lifts)
  })

  it('a release within the limit asks nothing and has no lifts', () => {
    const landing = landingAt('H', 0, under('T4'))
    expect(landing?.isPastDepthCap).toBe(false)
    expect(actionOf(releaseAt('H', 0, under('T4')))?.question).toBeUndefined()
    expect(bundlesOf(releaseAt('H', 0, under('T4')))[0]).toHaveLength(1)
    expect(liftMovesAfter('H', landing as NonNullable<typeof landing>)).toEqual([])
  })
})

interface Case {
  readonly held: string
  readonly above: string
  readonly steps: number
  readonly parent: string
  readonly shape: Readonly<Record<string, readonly string[]>>
}

// WHY: with a limit of 5. Lifted ones become children of the group at limit - 1, straight after the group at the limit, in tree order.
const CASES: readonly Case[] = [
  {
    held: 'S',
    above: 'P1',
    steps: 1,
    parent: 'P',
    shape: { P: ['P1', 'S'], S: ['S1'], S1: ['S2'], S2: ['S3', 'S4'], S3: [], S4: [] },
  },
  {
    held: 'H',
    above: 'P1',
    steps: 1,
    parent: 'P',
    shape: { P: ['P1', 'H'], H2: ['H3', 'H4a', 'H4b'], H3: [], H4a: [], H4b: [] },
  },
  {
    held: 'H',
    above: 'P1',
    steps: 2,
    parent: 'P1',
    shape: { P1: ['H'], H: ['H1'], H1: ['H2', 'H3', 'H4a', 'H4b'], H2: [], H3: [], H4a: [], H4b: [] },
  },
  {
    held: 'S',
    above: 'T4',
    steps: 9,
    parent: 'T3',
    shape: { T3: ['T4', 'S', 'S1', 'S2', 'S3', 'S4'], S: [], S1: [], S2: [], S3: [], S4: [] },
  },
  {
    held: 'H',
    above: 'T4',
    steps: 9,
    parent: 'T3',
    shape: { T3: ['T4', 'H', 'H1', 'H2', 'H3', 'H4a', 'H4b'], H: [], H1: [], H2: [], H3: [], H4a: [], H4b: [] },
  },
]

function afterTheBundle(held: string, above: string, steps: number): readonly TaskGroupRow[] {
  const landing = landingAt(held, steps, under(above))
  if (landing === null) throw new Error('premise: the gap has a landing')
  const move = { kind: 'moveTaskGroup', taskGroupId: held, parentId: landing.parentId, order: landing.order }
  return applyMoves(groupsOf(), [move, ...liftMovesAfter(held, landing)])
}

describe('HF-15 -- the lift: group at limit - 1 becomes the parent, straight after the group at the limit, in tree order', () => {
  it.each(CASES.map((one) => [`${one.held} under ${one.above} by ${one.steps}`, one] as const))('%s', (_name, one) => {
    const after = afterTheBundle(one.held, one.above, one.steps)
    expect(childrenIn(after, one.parent)).toContain(one.held)
    for (const [parent, children] of Object.entries(one.shape)) expect(childrenIn(after, parent), `the children of ${parent}`).toEqual(children)
    expect(idsDeeperThan(after, S_125), 'nothing stays past the limit').toEqual([])
    expect(deepestIn(after)).toBe(S_125)
  })

  it('only moves of task groups come back, so a Task stays on the task group that carries it (HM-3)', () => {
    const landing = landingAt('H', 1, under('P1'))
    const lifts = liftMovesAfter('H', landing as NonNullable<typeof landing>)
    expect(lifts.length).toBeGreaterThan(0)
    expect(lifts.every((one) => one.kind === 'moveTaskGroup')).toBe(true)
  })

  it('a task group that does not go past the limit is not moved', () => {
    const landing = landingAt('H', 1, under('P1'))
    const moved = liftMovesAfter('H', landing as NonNullable<typeof landing>).map((one) => one.taskGroupId)
    expect(moved).toEqual(['H4a', 'H4b'])
    expect(moved).not.toContain('H3')
  })
})

function confirmationOf(built: Shell): { question: string; text: string; items: readonly unknown[] } | null {
  return built.lastView().confirmation as unknown as { question: string; text: string; items: readonly unknown[] } | null
}

describe('HF-15 / QN-16 -- let go past the limit, the screen asks before it writes anything', () => {
  it('premise: every row of the tree is drawn, so the drag can be aimed at any gap', () => {
    const built = shellOf()
    for (const one of groupsOf()) expect(() => built.stripPoint(one.id), `${one.id} is drawn`).not.toThrow()
  })

  it('while the group is carried to a gap past the limit, the cue says so; let go, QN-16 is up and nothing is written yet', () => {
    const built = shellOf()
    const before = structuredClone(built.loop.document().schedule.taskGroups)
    const to = carryUnder(built, 'S', 'P1', 1)
    const cue = built.lastView().taskGroupPanel?.dropCue as unknown as { isPastDepthCap?: boolean } | null | undefined
    expect(cue?.isPastDepthCap).toBe(true)
    built.release(to.x, to.y)
    expect(confirmationOf(built)?.question).toBe('QN-16')
    expect(built.loop.document().schedule.taskGroups, 'nothing is written before the answer').toEqual(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
  })

  it.each(['ja', 'en'] as const)('the sentence is the dictionary %s sentence, with {maxGroupDepth} filled with S-125 and no name', (language) => {
    const built = shellOf(language)
    dragUnder(built, 'S', 'P1', 1)
    const asked = confirmationOf(built)
    expect(asked?.question).toBe('QN-16')
    expect(asked?.text).toContain(sentenceOf(language))
    expect(asked?.text).not.toContain('{')
    expect(asked?.text).toContain(String(S_125))
    expect(asked?.items, 'QN-16 names no task group').toEqual([])
  })

  it('a release within the limit is written at once, with no question', () => {
    const built = shellOf()
    dragUnder(built, 'P1', 'T4', 9)
    expect(confirmationOf(built)).toBeNull()
    expect(built.loop.hasUnsavedEdits()).toBe(true)
    expect(deepestIn(groupsOf(built.loop.document()))).toBe(S_125)
    expect(childrenIn(groupsOf(built.loop.document()), 'T3')).toEqual(['T4', 'P1'])
  })
})

describe('HF-15 / QN-16 -- No (cancel) changes nothing and adds no undo step', () => {
  it('the document stays as it was, no question stays up, and an undo has nothing of this to take back', () => {
    const built = shellOf()
    const before = structuredClone(built.loop.document())
    dragUnder(built, 'S', 'P1', 1)
    expect(confirmationOf(built)?.question).toBe('QN-16')
    built.send(key(answerKey('cancel')))
    expect(confirmationOf(built)).toBeNull()
    expect(built.loop.document()).toEqual(before)
    expect(built.loop.hasUnsavedEdits()).toBe(false)
    built.send(key('Z', { ctrl: true }))
    expect(built.loop.document()).toEqual(before)
  })
})

describe('HF-15 / QN-16 -- Yes (proceed) moves the group and lifts the too-deep ones, and one undo takes both back', () => {
  it('S put under P as its last child: P > S > S1 > S2 > {S3, S4}, the tasks stay where they were', () => {
    const built = shellOf()
    const before = structuredClone(built.loop.document().schedule)
    dragUnder(built, 'S', 'P1', 1)
    built.send(key(answerKey('proceed')))
    expect(confirmationOf(built)).toBeNull()
    const after = groupsOf(built.loop.document())
    expect(childrenIn(after, 'P')).toEqual(['P1', 'S'])
    expect(childrenIn(after, 'S')).toEqual(['S1'])
    expect(childrenIn(after, 'S1')).toEqual(['S2'])
    expect(childrenIn(after, 'S2')).toEqual(['S3', 'S4'])
    expect(deepestIn(after)).toBe(S_125)
    expect(built.loop.document().schedule.taskGroupMembers, 'a Task stays on the task group that carries it').toEqual(before.taskGroupMembers)
    // WHY: HM-9 (MUST) re-ranks wbsOrder by the task group tree on every move, so the Task is compared without it.
    const withoutRank = (tasks: typeof before.tasks) => tasks.map(({ wbsOrder: _rank, ...rest }) => rest)
    expect(withoutRank(built.loop.document().schedule.tasks)).toEqual(withoutRank(before.tasks))
  })

  it('two task groups past the limit are lifted in tree order, the second after the first', () => {
    const built = shellOf()
    dragUnder(built, 'H', 'P1', 1)
    built.send(key(answerKey('proceed')))
    const after = groupsOf(built.loop.document())
    expect(childrenIn(after, 'P')).toEqual(['P1', 'H'])
    expect(childrenIn(after, 'H2')).toEqual(['H3', 'H4a', 'H4b'])
    expect(idsDeeperThan(after, S_125)).toEqual([])
  })

  it('two levels past the limit all end flat on the same level', () => {
    const built = shellOf()
    dragUnder(built, 'H', 'P1', 2)
    built.send(key(answerKey('proceed')))
    const after = groupsOf(built.loop.document())
    expect(childrenIn(after, 'P1')).toEqual(['H'])
    expect(childrenIn(after, 'H1')).toEqual(['H2', 'H3', 'H4a', 'H4b'])
    expect(deepestIn(after)).toBe(S_125)
  })

  it('one undo puts the moved group and the lifted ones back together; nothing is half undone', () => {
    const built = shellOf()
    const before = structuredClone(built.loop.document().schedule.taskGroups)
    dragUnder(built, 'H', 'P1', 2)
    built.send(key(answerKey('proceed')))
    expect(built.loop.document().schedule.taskGroups).not.toEqual(before)
    built.send(key('Z', { ctrl: true }))
    expect(built.loop.document().schedule.taskGroups).toEqual(before)
  })
})
