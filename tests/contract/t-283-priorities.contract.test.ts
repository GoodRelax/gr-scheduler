// Contract test: table T-283 (the order Esc / Enter / y,n are consumed across regions) against its manuscript, its requirements and escapeTarget.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  escapeTarget,
  type EscapeContext,
  type EscapeTarget,
} from '../../src/entity/document-model/screen-state/screen-state'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const IN_4_ORDER =
  '消費する階層は 出ている通知 → 確定していないその場の編集 → 開いている面 → 進行中のドラッグ・引きかけの矢印 → 構え → 選択 → `Dual Cursor` モード → 出ている説明 の順とすること（MUST）'
const IN_4_SELECTION_AFTER_ARM = '⭐ **選択は構えの次に置く** —— ⛔ **構えより前に置いてはならない（MUST NOT）'
const NT_8_FIRST = '⛔ この消去を、`Enter` と `Esc` のどの階層よりも先に行うこと（MUST）'
const NT_8_NOTHING_TO_CLEAR = '⛔ 消すものが 1 つも無いときに、この階層で `Enter` や `Esc` を消費してはならない（MUST NOT）'
const NT_7_ORDER = '順位は `NT-8` の消去の次、表 T-028 の `IN-4` と 表 T-036 の `SK-19` の階層より先とする（MUST）'
const NT_7_KEYS_HELD = '⛔ 問いが立っているあいだ、この 2 つのキーをほかの何にも渡してはならない（MUST NOT）'
const SK_19_NOTICE = '⭐ **出ている通知があるときは、それを 1 つ消すこと（MUST）'
const SK_19_PANEL =
  '確定していないその場の編集が 1 つも無いときは、プロパティパネルを出しているならば出すのをやめること（MUST）'
const SK_19_SELECTION = '⭐ プロパティパネルも出していないときは、選ばれているものがあればその選択を解くこと（MUST）'
const PI_36_ESCAPE_TARGET =
  '`escapeTarget`（`EscapeContext` だけから、`Esc` が次に消費する段を答える。消費するものが無ければ `null`）'

interface StateRef {
  readonly in?: string
  readonly machine?: string
  readonly except?: string
}

interface Rung {
  readonly id: string
  readonly keys: readonly string[]
  readonly rung: { readonly ja: string }
  readonly states: readonly StateRef[]
  readonly evidence: readonly string[]
  readonly note?: { readonly ja: string }
}

interface Machine {
  readonly name: string
  readonly states: readonly { readonly key: string }[]
}

const MANUSCRIPT = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'state-machines.json'), 'utf8'),
) as {
  readonly priorities: { readonly table: { readonly id: string }; readonly rungs: readonly Rung[] }
  readonly regions: readonly { readonly machines: readonly Machine[] }[]
}

const RUNGS = MANUSCRIPT.priorities.rungs
const MACHINES = new Map(MANUSCRIPT.regions.flatMap((r) => r.machines).map((m) => [m.name, m] as const))
const TABLE = specTable('T-283')

const rungsOf = (key: string): readonly Rung[] => RUNGS.filter((r) => r.keys.includes(key))

const stateKeyExists = (ref: StateRef): boolean => {
  if (ref.in !== undefined) {
    const [machine, state] = ref.in.split('.')
    return MACHINES.get(machine ?? '')?.states.some((s) => s.key === state) ?? false
  }
  const machine = MACHINES.get(ref.machine ?? '')
  return machine !== undefined && machine.states.some((s) => s.key === ref.except)
}

const isSpecRow = (id: string): boolean =>
  [REQUIREMENTS, DESIGN].some((text) => text.includes(`| ${id} |`) || text.includes(`**UID**: ${id}\n`))

// see IN-4
const IN_4_WORDS = IN_4_ORDER.replace('消費する階層は ', '')
  .replace(' の順とすること（MUST）', '')
  .split(' → ')

describe('table T-283 -- the manuscript and the printed table agree', () => {
  it('the priorities block names table T-283 and holds RG-1..RG-13 in order', () => {
    expect(MANUSCRIPT.priorities.table.id).toBe('T-283')
    expect(RUNGS.map((r) => r.id)).toEqual(Array.from({ length: 13 }, (_, i) => `RG-${String(i + 1)}`))
  })

  it('the printed table carries the same rows in the same order', () => {
    expect(TABLE.rows.map((r) => r.id)).toEqual(RUNGS.map((r) => r.id))
    for (const [i, row] of TABLE.rows.entries()) {
      const rung = RUNGS[i] as Rung
      expect(row.by['段'], row.id).toBe(rung.rung.ja)
    }
  })

  it.each(RUNGS.map((r) => [r.id, r] as const))('%s: every state key names a state of a machine in the manuscript', (_id, rung) => {
    expect(rung.states.length).toBeGreaterThan(0)
    for (const ref of rung.states) expect(stateKeyExists(ref), JSON.stringify(ref)).toBe(true)
  })

  it.each(RUNGS.map((r) => [r.id, r] as const))('%s: every row it cites is a row of the specification', (_id, rung) => {
    for (const id of rung.evidence) expect(isSpecRow(id), id).toBe(true)
  })

  it('the three keys contended are Esc, Enter and y / n, and nothing else', () => {
    expect([...new Set(RUNGS.flatMap((r) => r.keys))].sort()).toEqual(['Enter', 'Esc', 'n', 'y'])
  })
})

describe(`table T-283, Esc (RG-1..RG-8) -- IN-4 (MUST): ${IN_4_ORDER}`, () => {
  it('the requirement still says it, word for word', () => {
    expect(REQUIREMENTS).toContain(IN_4_ORDER)
  })

  it('the Esc rungs, top to bottom, are the IN-4 rungs one for one', () => {
    expect(rungsOf('Esc').map((r) => r.rung.ja)).toEqual(IN_4_WORDS)
    expect(rungsOf('Esc').map((r) => r.id)).toEqual(['RG-1', 'RG-2', 'RG-3', 'RG-4', 'RG-5', 'RG-6', 'RG-7', 'RG-8'])
  })

  it(IN_4_SELECTION_AFTER_ARM, () => {
    expect(REQUIREMENTS).toContain(IN_4_SELECTION_AFTER_ARM)
    const ids = rungsOf('Esc').map((r) => r.id)
    expect(ids.indexOf('RG-5')).toBeLessThan(ids.indexOf('RG-6'))
    expect(RUNGS.find((r) => r.id === 'RG-5')?.states).toEqual([{ machine: 'armModeStateMachine', except: 'notArmed' }])
    expect(RUNGS.find((r) => r.id === 'RG-6')?.states).toEqual([{ in: 'selectionStateMachine.objectsSelected' }])
  })

  it('RG-3 holds, inside the one rung, the question, then the surface, then the panel', () => {
    const rg3 = RUNGS.find((r) => r.id === 'RG-3')
    expect(rg3?.states).toEqual([
      { in: 'confirmationStateMachine.questionAsked' },
      { in: 'openSurfaceStateMachine.open' },
      { machine: 'propertiesPanelContentStateMachine', except: 'hidden' },
    ])
  })
})

describe(`table T-283, notices first -- NT-8 (MUST): ${NT_8_FIRST}`, () => {
  it('the requirement still says it, word for word', () => {
    expect(REQUIREMENTS).toContain(NT_8_FIRST)
    expect(REQUIREMENTS).toContain(NT_8_NOTHING_TO_CLEAR)
  })

  it('the first Esc rung and the first Enter rung are both the standing notice', () => {
    for (const key of ['Esc', 'Enter']) {
      const first = rungsOf(key)[0]
      expect(first?.states, key).toEqual([{ in: 'noticeDisplayStateMachine.shown' }])
      expect(first?.evidence, key).toContain('NT-8')
    }
  })

  it(NT_8_NOTHING_TO_CLEAR, () => {
    const rg1 = RUNGS.find((r) => r.id === 'RG-1')
    expect(rg1?.states, 'the rung stands only while a notice is shown').toEqual([
      { in: 'noticeDisplayStateMachine.shown' },
    ])
    expect(rg1?.note?.ja ?? '').toContain('`NT-8`')
  })
})

describe(`table T-283, Enter (RG-9..RG-12) -- SK-19 (MUST): ${SK_19_SELECTION}`, () => {
  it('the requirement still says each rung, word for word', () => {
    expect(REQUIREMENTS).toContain(SK_19_NOTICE)
    expect(REQUIREMENTS).toContain(SK_19_PANEL)
    expect(REQUIREMENTS).toContain(SK_19_SELECTION)
  })

  it('the Enter rungs are RG-9..RG-12 in the order SK-19 states them', () => {
    expect(rungsOf('Enter').map((r) => r.id)).toEqual(['RG-9', 'RG-10', 'RG-11', 'RG-12'])
    const sk19 = specTable('T-036').rows.find((r) => r.id === 'SK-19')?.cells.join(' ') ?? ''
    const at = ['出ている通知', 'その場の編集を確定する', '出すのをやめること', 'その選択を解くこと'].map((w) => sk19.indexOf(w))
    for (const one of at) expect(one).toBeGreaterThanOrEqual(0)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it(SK_19_PANEL, () => {
    expect(RUNGS.find((r) => r.id === 'RG-11')?.states).toEqual([
      { machine: 'propertiesPanelContentStateMachine', except: 'hidden' },
    ])
  })

  it(SK_19_SELECTION, () => {
    expect(RUNGS.find((r) => r.id === 'RG-12')?.states).toEqual([{ in: 'selectionStateMachine.objectsSelected' }])
  })

  it('RG-10 settles either an unsettled field edit or the name of a task just made', () => {
    expect(RUNGS.find((r) => r.id === 'RG-10')?.states).toEqual([
      { in: 'fieldEditStateMachine.editingField' },
      { in: 'createdTaskNamingStateMachine.namingCreatedTask' },
    ])
  })
})

describe(`table T-283, y / n (RG-13) -- NT-7 (MUST): ${NT_7_ORDER}`, () => {
  it('the requirement still says it, word for word', () => {
    expect(REQUIREMENTS).toContain(NT_7_ORDER)
    expect(REQUIREMENTS).toContain(NT_7_KEYS_HELD)
  })

  it(NT_7_KEYS_HELD, () => {
    const rg13 = RUNGS.find((r) => r.id === 'RG-13')
    expect(rg13?.keys).toEqual(['y', 'n'])
    expect(rg13?.states).toEqual([{ in: 'confirmationStateMachine.questionAsked' }])
    expect(rg13?.evidence).toEqual(['NT-7'])
  })

  it('RG-13 names its place: after the NT-8 clearing, before the IN-4 and SK-19 ladders', () => {
    const note = RUNGS.find((r) => r.id === 'RG-13')?.note?.ja ?? ''
    expect(note).toContain('`NT-8` の消去の次')
    expect(note).toContain('`IN-4` と `SK-19` の階層より先')
    const printed = TABLE.rows.find((r) => r.id === 'RG-13')
    expect(bare(printed?.by['順を決めた行'] ?? '')).toBe('NT-7')
  })
})

describe(`PI-36 -- ${PI_36_ESCAPE_TARGET}`, () => {
  it('the design still says it, word for word', () => {
    expect(DESIGN).toContain(PI_36_ESCAPE_TARGET)
  })
})

type Flag = keyof EscapeContext

const NOTHING_ON: EscapeContext = {
  isNoticeStanding: false,
  isTextEntryUnsettled: false,
  isSurfaceOpen: false,
  gestureInFlight: false,
  isArmed: false,
  isSelectionStanding: false,
  dualCursorMode: false,
  isConfirmationStanding: false,
  isPropertiesPanelOpen: false,
  isTooltipStanding: false,
}

// see T-283, IN-4
const LADDER: readonly (readonly [string, EscapeTarget, Flag])[] = [
  ['RG-1', 'notice', 'isNoticeStanding'],
  ['RG-2', 'textEntry', 'isTextEntryUnsettled'],
  ['RG-3', 'confirmation', 'isConfirmationStanding'],
  ['RG-3', 'surface', 'isSurfaceOpen'],
  ['RG-3', 'propertiesPanel', 'isPropertiesPanelOpen'],
  ['RG-4', 'gesture', 'gestureInFlight'],
  ['RG-5', 'armed', 'isArmed'],
  ['RG-6', 'selection', 'isSelectionStanding'],
  ['RG-7', 'dualCursorMode', 'dualCursorMode'],
  ['RG-8', 'tooltip', 'isTooltipStanding'],
]

// WHY: a word of EscapeTarget with no row here fails to compile, so the ladder cannot skip one.
const EVERY_WORD: Record<EscapeTarget, true> = {
  notice: true,
  textEntry: true,
  confirmation: true,
  surface: true,
  gesture: true,
  propertiesPanel: true,
  armed: true,
  selection: true,
  dualCursorMode: true,
  tooltip: true,
}

// WHY: pinned, not dropped: CR-541 adds a panel rung after the drag, and these cases change with it.
const isPinnedByDfc570 = (upper: EscapeTarget, lower: readonly EscapeTarget[]): boolean =>
  upper === 'propertiesPanel' && lower.includes('gesture')

const on = (...flags: readonly Flag[]): EscapeContext => {
  const context: Record<string, boolean> = { ...NOTHING_ON }
  for (const flag of flags) context[flag] = true
  return context as unknown as EscapeContext
}

describe(`PI-36 escapeTarget against table T-283 -- IN-4 (MUST): ${IN_4_ORDER}`, () => {
  it('the ladder covers every rung word, and every Esc row of T-283 in table order', () => {
    expect(LADDER.map(([, word]) => word).sort()).toEqual(Object.keys(EVERY_WORD).sort())
    expect([...new Set(LADDER.map(([id]) => id))]).toEqual(rungsOf('Esc').map((r) => r.id))
    expect(LADDER.map(([, , flag]) => flag).sort()).toEqual(Object.keys(NOTHING_ON).sort())
  })

  it('escapeTarget reads the EscapeContext alone: it takes one argument', () => {
    expect(escapeTarget.length).toBe(1)
  })

  it(`nothing on answers null: ${NT_8_NOTHING_TO_CLEAR}`, () => {
    expect(escapeTarget(NOTHING_ON)).toBeNull()
  })

  it.each(LADDER.map(([id, word, flag]) => [`${id} ${word}`, word, flag] as const))(
    '%s alone is the rung Esc consumes',
    (_name, word, flag) => {
      expect(escapeTarget(on(flag))).toBe(word)
    },
  )

  const pairs = LADDER.slice(1).map((lower, i) => {
    const upper = LADDER[i] as (typeof LADDER)[number]
    return [`${upper[0]} ${upper[1]} over ${lower[0]} ${lower[1]}`, upper, lower] as const
  })
  const earlierRowWins = (_name: string, upper: (typeof LADDER)[number], lower: (typeof LADDER)[number]): void => {
    expect(escapeTarget(on(upper[2], lower[2]))).toBe(upper[1])
  }

  it.each(pairs.filter(([, upper, lower]) => !isPinnedByDfc570(upper[1], [lower[1]])))(
    '%s: both on, the earlier row wins',
    earlierRowWins,
  )

  // DEVIATION: spec says the panel rung is above the drag (IN-4); here the drag goes first (DFC-570)
  it.fails.each(pairs.filter(([, upper, lower]) => isPinnedByDfc570(upper[1], [lower[1]])))(
    '%s: both on, the earlier row wins',
    earlierRowWins,
  )

  it(`${NT_8_FIRST} -- everything on answers the notice`, () => {
    expect(escapeTarget(on(...LADDER.map(([, , flag]) => flag)))).toBe('notice')
  })

  const withEveryLower = LADDER.map(([id, word, flag], i) => [`${id} ${word}`, i, word, flag] as const)
  const belowOf = (i: number): readonly EscapeTarget[] => LADDER.slice(i + 1).map(([, one]) => one)
  const stillWins = (_name: string, i: number, word: EscapeTarget, flag: Flag): void => {
    const below = LADDER.slice(i + 1).map(([, , one]) => one)
    expect(escapeTarget(on(flag, ...below))).toBe(word)
  }

  it.each(withEveryLower.filter(([, i, word]) => !isPinnedByDfc570(word, belowOf(i))))(
    '%s with every lower rung on still wins',
    stillWins,
  )

  // DEVIATION: spec says the panel rung is above the drag (IN-4); here the drag goes first (DFC-570)
  it.fails.each(withEveryLower.filter(([, i, word]) => isPinnedByDfc570(word, belowOf(i))))(
    '%s with every lower rung on still wins',
    stillWins,
  )

  it(`${IN_4_SELECTION_AFTER_ARM} -- armed and selected, Esc drops the arm first`, () => {
    expect(escapeTarget(on('isArmed', 'isSelectionStanding'))).toBe('armed')
  })
})
