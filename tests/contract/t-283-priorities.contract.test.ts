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
const PUBLISHED = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-published-entries.md'), 'utf8'),
)

const IN_4_ORDER =
  '消費する階層は 出ている通知 → 確定していないその場の編集 → 開いている面 → 進行中のドラッグ・引きかけの矢印 → 開いているウィンドウ → プロパティパネル → 構え → 選択 → `Dual Cursor` モード → 出ている説明 → 全画面表示 の順とすること（MUST）'
const IN_4_QUESTION_THEN_SURFACE =
  '⭐ 開いている面の段では、問いが先、立っている面が後である —— 手前のものから閉じる（`FR-152` の 表 T-337）。'
const IN_4_SEARCH_PANEL_RUNG =
  '⭐ 閉じる番の検索パネル（`FR-151`）は、列のフィルタが開いていればフィルタだけを閉じ、次の `Esc` でパネルを閉じる（表 T-330 の `SV-14`）。'
const IN_4_ONE_WINDOW =
  '1 度の `Esc` で閉じるウィンドウは 1 つとし、焦点がその中にあるウィンドウを先に、ほかは `FR-152` の 表 T-337 の手前のものから閉じること（MUST）。'
const IN_4_FOCUS_OUTSIDE =
  '⛔ 焦点がウィンドウの外にあることを理由に、開いているウィンドウを段から外してはならない（MUST NOT）'
const IN_4_PANEL_FOCUS_FIRST =
  '⭐ ただし焦点がプロパティパネル（`FR-006`）の中にあるあいだは、開いているウィンドウはこの段に立たず、プロパティパネルの段が先に受けること（MUST）'
const SV_14_FILTER_FIRST = '列のフィルタが開いていれば、`Esc` はまずフィルタだけを閉じ、次の `Esc` でパネルを閉じる。'
const IN_4_SELECTION_AFTER_ARM = '⭐ **選択は構えの次に置く** —— ⛔ **構えより前に置いてはならない（MUST NOT）'
const NT_8_FIRST = '⛔ この消去を、`Enter` と `Esc` のどの階層よりも先に行うこと（MUST）'
const NT_8_NOTHING_TO_CLEAR = '⛔ 消すものが 1 つも無いときに、この階層で `Enter` や `Esc` を消費してはならない（MUST NOT）'
const NT_7_ORDER = '順位は `NT-8` の消去の次、表 T-028 の `IN-4` と 表 T-036 の `SK-19` の階層より先とする（MUST）'
const NT_7_KEYS_HELD = '⛔ 問いが立っているあいだ、この 2 つのキーをほかの何にも渡してはならない（MUST NOT）'
const SK_19_NOTICE = '⭐ **出ている通知があるときは、それを 1 つ消すこと（MUST）'
const SK_19_PANEL =
  '確定していないその場の編集が 1 つも無いときは、プロパティパネルを出しているならば出すのをやめること（MUST）'
const SK_19_SELECTION = '⭐ プロパティパネルも出していないときは、選ばれているものがあればその選択を解除すること（MUST）'
const PI_36_ESCAPE_TARGET = [
  '`escapeTarget`',
  '`EscapeContext` だけから、`Esc` が次に消費する段を答える。',
  '消費するものが無ければ `null`',
]
const UNDER_THE_NAME = String.fromCharCode(0x3000).repeat(2)

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
  [REQUIREMENTS, DESIGN, PUBLISHED].some((text) => text.includes(`| ${id} |`) || text.includes(`**UID**: ${id}\n`))

// see IN-4
const IN_4_WORDS = IN_4_ORDER.replace('消費する階層は ', '')
  .replace(' の順とすること（MUST）', '')
  .split(' → ')

describe('table T-283 -- the manuscript and the printed table agree', () => {
  it('the priorities block names table T-283 and holds RG-1..RG-14, RG-16 and RG-17, RG-16 after RG-4, RG-14 after RG-16 and RG-17 after RG-8', () => {
    expect(MANUSCRIPT.priorities.table.id).toBe('T-283')
    expect(RUNGS.map((r) => r.id)).toEqual([
      'RG-1', 'RG-2', 'RG-3', 'RG-4', 'RG-16', 'RG-14', 'RG-5', 'RG-6', 'RG-7', 'RG-8', 'RG-17', 'RG-9', 'RG-10', 'RG-11', 'RG-12', 'RG-13',
    ])
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

describe(`table T-283, Esc (RG-1..RG-8, RG-14, RG-16 and RG-17) -- IN-4 (MUST): ${IN_4_ORDER}`, () => {
  it('the requirement still says it, word for word', () => {
    expect(REQUIREMENTS).toContain(IN_4_ORDER)
  })

  it('the Esc rungs, top to bottom, are the IN-4 rungs one for one', () => {
    expect(rungsOf('Esc').map((r) => r.rung.ja)).toEqual(IN_4_WORDS)
    expect(rungsOf('Esc').map((r) => r.id)).toEqual([
      'RG-1', 'RG-2', 'RG-3', 'RG-4', 'RG-16', 'RG-14', 'RG-5', 'RG-6', 'RG-7', 'RG-8', 'RG-17',
    ])
  })

  it(IN_4_SELECTION_AFTER_ARM, () => {
    expect(REQUIREMENTS).toContain(IN_4_SELECTION_AFTER_ARM)
    const ids = rungsOf('Esc').map((r) => r.id)
    expect(ids.indexOf('RG-5')).toBeLessThan(ids.indexOf('RG-6'))
    expect(RUNGS.find((r) => r.id === 'RG-5')?.states).toEqual([{ machine: 'armModeStateMachine', except: 'notArmed' }])
    expect(RUNGS.find((r) => r.id === 'RG-6')?.states).toEqual([{ in: 'selectionStateMachine.objectsSelected' }])
  })

  it(`RG-3 holds, inside the one rung, the question, then the surface -- ${IN_4_QUESTION_THEN_SURFACE}`, () => {
    expect(REQUIREMENTS).toContain(IN_4_QUESTION_THEN_SURFACE)
    const rg3 = RUNGS.find((r) => r.id === 'RG-3')
    expect(rg3?.states).toEqual([
      { in: 'confirmationStateMachine.questionAsked' },
      { in: 'openSurfaceStateMachine.open' },
    ])
  })

  it(`RG-16 is every window shown and not minimized, and cites SV-14 -- ${IN_4_SEARCH_PANEL_RUNG}`, () => {
    expect(REQUIREMENTS).toContain(IN_4_SEARCH_PANEL_RUNG)
    expect(REQUIREMENTS).toContain(SV_14_FILTER_FIRST)
    const rg16 = RUNGS.find((r) => r.id === 'RG-16')
    expect(rg16?.keys).toEqual(['Esc'])
    expect(rg16?.states).toEqual(
      ['searchPanel', 'help', 'dialogueField'].flatMap((window) => [
        { in: `${window}DisplayStateMachine.shown.normal` },
        { in: `${window}DisplayStateMachine.shown.maximized` },
      ]),
    )
    expect(rg16?.evidence).toEqual(['IN-4', 'SV-14', 'HN-2', 'FR-066', 'FR-152', 'RW-1', 'RO-1'])
    expect(rg16?.note?.ja ?? '').toContain('`SV-14`')
  })

  it('the properties panel is RG-14, after the drag', () => {
    expect(RUNGS.find((r) => r.id === 'RG-14')?.states).toEqual([
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
    const at = ['出ている通知', 'その場の編集を確定する', '出すのをやめること', 'その選択を解除すること'].map((w) => sk19.indexOf(w))
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
      { in: 'createdTaskNamingStateMachine.createdNameEnded' },
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

describe(`PI-36 -- ${PI_36_ESCAPE_TARGET.join(' ')}`, () => {
  it('the design still says it, word for word', () => {
    expect(PUBLISHED).toContain(PI_36_ESCAPE_TARGET.join(UNDER_THE_NAME))
  })
})

type Flag = Exclude<keyof EscapeContext, 'focusedWindow' | 'isDelayDiagnosticsReportInFront' | 'isResourceListInFront' | 'isFocusInPropertiesPanel'>

const NOTHING_ON: Required<Pick<EscapeContext, Flag>> = {
  isNoticeStanding: false,
  isTextEntryUnsettled: false,
  isSurfaceOpen: false,
  gestureInFlight: false,
  isSearchPanelStanding: false,
  isDelayDiagnosticsReportStanding: false,
  isResourceListStanding: false,
  isHelpStanding: false,
  isDialogueFieldStanding: false,
  isArmed: false,
  isSelectionStanding: false,
  dualCursorMode: false,
  isConfirmationStanding: false,
  isPropertiesPanelOpen: false,
  isTooltipStanding: false,
  isFullScreen: false,
}

// see T-283, IN-4, RG-16
// WHY: inside RG-16 the windows stand in the order of table T-337 (UZ-6, UZ-7, UZ-9) while no window
// holds the focus; the search panel is in front of the report window until RW-5 says otherwise.
const LADDER: readonly (readonly [string, EscapeTarget, Flag])[] = [
  ['RG-1', 'notice', 'isNoticeStanding'],
  ['RG-2', 'textEntry', 'isTextEntryUnsettled'],
  ['RG-3', 'confirmation', 'isConfirmationStanding'],
  ['RG-3', 'surface', 'isSurfaceOpen'],
  ['RG-4', 'gesture', 'gestureInFlight'],
  ['RG-16', 'searchPanel', 'isSearchPanelStanding'],
  ['RG-16', 'delayDiagnosticsReport', 'isDelayDiagnosticsReportStanding'],
  ['RG-16', 'resourceList', 'isResourceListStanding'],
  ['RG-16', 'helpModal', 'isHelpStanding'],
  ['RG-16', 'dialogueField', 'isDialogueFieldStanding'],
  ['RG-14', 'propertiesPanel', 'isPropertiesPanelOpen'],
  ['RG-5', 'armed', 'isArmed'],
  ['RG-6', 'selection', 'isSelectionStanding'],
  ['RG-7', 'dualCursorMode', 'dualCursorMode'],
  ['RG-8', 'tooltip', 'isTooltipStanding'],
  ['RG-17', 'fullScreen', 'isFullScreen'],
]

// WHY: a word of EscapeTarget with no row here fails to compile, so the ladder cannot skip one.
const EVERY_WORD: Record<EscapeTarget, true> = {
  notice: true,
  searchPanel: true,
  delayDiagnosticsReport: true,
  resourceList: true,
  dialogueField: true,
  textEntry: true,
  confirmation: true,
  surface: true,
  helpModal: true,
  gesture: true,
  propertiesPanel: true,
  armed: true,
  selection: true,
  dualCursorMode: true,
  tooltip: true,
  fullScreen: true,
}

const on = (...flags: readonly Flag[]): EscapeContext => {
  const context: Record<string, boolean> = { ...NOTHING_ON }
  for (const flag of flags) context[flag] = true
  return context as unknown as EscapeContext
}

describe(`PI-36 escapeTarget against table T-283 -- IN-4 (MUST): ${IN_4_ORDER}`, () => {
  it('the ladder covers every rung word and every flag', () => {
    expect(LADDER.map(([, word]) => word).sort()).toEqual(Object.keys(EVERY_WORD).sort())
    expect(LADDER.map(([, , flag]) => flag).sort()).toEqual(Object.keys(NOTHING_ON).sort())
  })

  it('the ladder holds every Esc row of T-283 in table order', () => {
    expect(
      [...new Set(LADDER.map(([id]) => id))],
      'an Esc row of T-283 with no escapeTarget word',
    ).toEqual(rungsOf('Esc').map((r) => r.id))
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

  it.each(pairs)('%s: both on, the earlier row wins', earlierRowWins)

  it(`${NT_8_FIRST} -- everything on answers the notice`, () => {
    expect(escapeTarget(on(...LADDER.map(([, , flag]) => flag)))).toBe('notice')
  })

  const withEveryLower = LADDER.map(([id, word, flag], i) => [`${id} ${word}`, i, word, flag] as const)
  const stillWins = (_name: string, i: number, word: EscapeTarget, flag: Flag): void => {
    const below = LADDER.slice(i + 1).map(([, , one]) => one)
    expect(escapeTarget(on(flag, ...below))).toBe(word)
  }

  it.each(withEveryLower)('%s with every lower rung on still wins', stillWins)

  it(`${IN_4_SELECTION_AFTER_ARM} -- armed and selected, Esc drops the arm first`, () => {
    expect(escapeTarget(on('isArmed', 'isSelectionStanding'))).toBe('armed')
  })
})

describe(`RG-16, one window per Esc -- IN-4 (MUST): ${IN_4_ONE_WINDOW}`, () => {
  const everyWindow = on('isSearchPanelStanding', 'isDelayDiagnosticsReportStanding', 'isHelpStanding', 'isDialogueFieldStanding')

  it('the requirement still says it, word for word', () => {
    expect(REQUIREMENTS).toContain(IN_4_ONE_WINDOW)
    expect(REQUIREMENTS).toContain(IN_4_FOCUS_OUTSIDE)
    expect(REQUIREMENTS).toContain(IN_4_PANEL_FOCUS_FIRST)
  })

  it.each(['delayDiagnosticsReport', 'helpModal', 'dialogueField'] as const)('the focused %s closes before the front-most window', (window) => {
    expect(escapeTarget({ ...everyWindow, focusedWindow: window })).toBe(window)
  })

  it('a focused window that does not stand gives way to the front-most one', () => {
    expect(escapeTarget({ ...on('isHelpStanding', 'isDialogueFieldStanding'), focusedWindow: 'searchPanel' })).toBe('helpModal')
  })

  it('RW-5: the report window opened after the search panel is in front of it', () => {
    expect(escapeTarget({ ...everyWindow, isDelayDiagnosticsReportInFront: true })).toBe('delayDiagnosticsReport')
    expect(escapeTarget({ ...everyWindow, isDelayDiagnosticsReportInFront: false })).toBe('searchPanel')
  })

  it(`${IN_4_FOCUS_OUTSIDE} -- the panel open with the focus elsewhere, the window still goes first`, () => {
    expect(escapeTarget(on('isSearchPanelStanding', 'isPropertiesPanelOpen'))).toBe('searchPanel')
  })

  it(`${IN_4_PANEL_FOCUS_FIRST} -- the next Esc, focus out of the panel, closes the window`, () => {
    const panelFocused = { ...on('isSearchPanelStanding', 'isPropertiesPanelOpen'), isFocusInPropertiesPanel: true }
    expect(escapeTarget(panelFocused)).toBe('propertiesPanel')
    expect(escapeTarget(on('isSearchPanelStanding'))).toBe('searchPanel')
  })
})
