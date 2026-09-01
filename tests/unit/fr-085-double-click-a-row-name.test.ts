// FR-085 (MUST) as the user ruled it on 2026-09-01: 「タスクグループ名をダブル
// クリックしたら、プロパティパネルを開き、タスクグループ名編集モードとせよ。編集後
// Enter でプロパティーパネルを閉じれ」「(タスク名編集モードと同様の動作)」.
//
// The requirement now reads: 「行の名前を変える経路は、行見出しパネルでその名前を
// ダブルクリックすること（表 T-023 の `MK-13`）とし、`GRS` はプロパティパネルを出
// し、名前の欄（`AT-53`）を編集できる状態にして焦点を置き、既にある文字をすべて選
// んだ状態にすること（MUST）」.
//
// ⛔ THE `Enter` IS NOT A NEW RULE, AND NO CASE HERE MINTS ONE. SK-19 of table
// T-036 already puts the panel away on an `Enter` raised with no unsettled edit
// standing, and FR-085 (MUST NOT) forbids restating it -- so what these cases
// ask is that the row's name arrives on the very panel SK-19 already closes.
// tests/unit/fr-072-the-two-entrances-to-the-panel.test.ts owns that key.
//
// Unit under test: UF-48 of table T-075 (`frame-loop.ts`, component CP-25 of
// table T-062). It is the layer that holds the current values (LY-5 of table
// T-060), so putting the panel up and asking for the field are both its answer.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- MEASURED, NOT ASSUMED
// ---------------------------------------------------------------------------
//
// On 2026-09-01 a probe drove the shipped `dist/index.html`: a double click on a
// row's name in the `Row Title Panel` DID put the panel up, and the panel held
// exactly two fields, `AT-58` and `AT-59`. No name. Nothing focused
// (`document.activeElement` was BODY). ⇒ The gap was a MISSING FIELD first, and
// the missing focus and the missing commit followed from it. That is the
// ledger's D-180.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-085   the sentence quoted above (MUST), and 「行の名前を変える経路は …
//            ダブルクリックすること」.
//   FR-042   ⭐ 「行の名前（`AT-53`）もこのパネルで編集できるようにすること
//            （MUST）」 -- the 2026-09-01 ruling overrode 「行の名前はここで扱わ
//            ない」. ⛔ 「行を選んだだけで名前の欄へ焦点を移してはならない
//            （MUST NOT）」.
//   T-023    MK-13's 行見出し entry.
//   T-036    SK-19, which closes the panel and is NOT restated here.
//   AT-53    `TaskGroup.label`, the row's name.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). What was read of `src/`: the exported
// declarations named in the imports below. ⛔ NO FUNCTION BODY WAS READ.
//
// ⭐ THE DOCUMENT, THE HOST, THE PANE AND THE STAGE ARE COPIED from
// tests/unit/fr-072-the-two-entrances-to-the-panel.test.ts, which drives this
// same unit through the same seams.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  PropertiesPanel,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  NOT_STORED_PROPERTIES_PANEL_SIZES,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// What the manuscript says, read at run time rather than copied
// ---------------------------------------------------------------------------

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** U-27 of table T-103 -- the settled spelling of the `Row Title Panel`. */
const ROW_TITLE_PANEL = ((): string => {
  const found = specTable('T-103').rows.find(
    (row) => bare(row.by['確定名（英）'] ?? '') === 'Row Title Panel',
  )
  if (found === undefined) throw new Error('table T-103 settles no `Row Title Panel`')
  return bare(found.by['確定名（英）'] ?? '')
})()

/** Everything MK-13 writes, as one string. */
const MK_13 = rowOf('T-023', 'MK-13').cells.join(' ')

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** FR-085's sentence these cases stand on, quoted from the manuscript. */
const FR_085_THE_RENAME_PATH =
  '行の名前を変える経路は、行見出しパネルでその名前をダブルクリックすること'
/** FR-042's, the half that puts the name on the panel at all. */
const FR_042_THE_NAME_IS_ON_THE_PANEL =
  'もこのパネルで編集できるようにすること（MUST）'
/** ⛔ The one it overrode. It may stand as history, never as a live rule. */
const THE_OVERRIDDEN_SENTENCE =
  '⚠️ **行の名前はここで扱わない** —— 名前を付ける・変える入口は `FR-085` の行見出しパネル 1 つとする（`FR-029`）。'

/**
 * `AT-53` -- the row's name, read out of the ERD rather than typed.
 *
 * ⭐ THE ROW ID IS THE JOIN across IF-9 (`focusPropertyField` takes one), so it
 * is read from the table that owns it and asserted to be `TaskGroup.label`.
 */
const ROW_NAME_FIELD = ((): string => {
  const detail = readFileSync(
    join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'),
    'utf8',
  )
  const line = detail.split('\n').find((one) => one.includes('`TaskGroup` | `label`'))
  if (line === undefined) throw new Error('the ERD holds no `TaskGroup`.`label` row')
  const id = line.split('|')[1]?.trim() ?? ''
  if (!/^AT-\d+$/.test(id)) throw new Error(`the row for TaskGroup.label reads "${id}"`)
  return id
})()

const S_171 = NOT_STORED_PROPERTIES_PANEL_SIZES['S-171']

// ---------------------------------------------------------------------------
// The document these cases drive. Copied from
// tests/unit/fr-072-the-two-entrances-to-the-panel.test.ts.
// ---------------------------------------------------------------------------

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'

const ALPHA_NAME = 'AlphaRowName'
const BETA_NAME = 'BetaRowName'

function twoRowDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const row = (id: string, parentId: string | null, label: string, order: number) => ({
    id,
    parentId,
    label,
    derivedFromTaskUid: null,
    order,
    isCollapsed: false,
    isHidden: false,
    color: null,
    height: null,
  })
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, ALPHA_NAME, 0), row(BETA, null, BETA_NAME, 1)],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      propertyPanelWidth: S_171,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

// ---------------------------------------------------------------------------
// The host UF-48 is given. Copied from the same file.
// ---------------------------------------------------------------------------

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Nothing in it
 * decides anything about the panel or the field.
 */
function host(): { readonly surface: { showSvg(svg: string): void }; runAnimationFrames(): void } {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

interface ScreenPane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  last(): ScreenView
  /** Every row `focusPropertyField` was asked for, in order. */
  focusAsks(): readonly string[]
}

function screenPane(language: DisplayLanguage = 'ja'): ScreenPane {
  const views: ScreenView[] = []
  const asked: string[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  return {
    // ⭐ THE SEAM MEMBER IS OPTIONAL, so a fake that did not carry it would let
    // the whole of MK-13's second half go missing in silence. It is filled here
    // for exactly that reason -- the shell's own note says nothing else watches it.
    wiring: { surface, language, focusPropertyField: (row) => asked.push(row) },
    drawAt: (next) => {
      part = next
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    focusAsks: () => asked,
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

// ---------------------------------------------------------------------------
// Spelling one happening
// ---------------------------------------------------------------------------

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton; readonly clickCount?: number } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: options.clickCount ?? 1,
})

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  panel(): PropertiesPanel | null
  /** Aim the next press at one row of the `Row Title Panel`, on its name. */
  aimAtRow(groupId: string): void
  aimAtNothing(): void
  /** The name the document holds for one row. */
  labelOf(groupId: string): string | null
}

function stage(): Stage {
  const pen = host()
  const screen = screenPane()
  const loop = frameLoop(pen.surface, twoRowDocument(), SCREEN, screen.wiring)
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  pen.runAnimationFrames()
  return {
    loop,
    screen,
    send,
    panel: () => screen.last().propertiesPanel,
    // ⚠️ `entry` IS NULL, which is what a press on the row's NAME is: the three
    // controls table T-051 draws on a row each carry a row of table T-109, and
    // the name carries none.
    aimAtRow: (groupId) => {
      screen.drawAt({
        part: ROW_TITLE_PANEL,
        entry: null,
        format: null,
        rowGroupId: groupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
    },
    aimAtNothing: () => {
      screen.drawAt(null)
    },
    labelOf: (groupId) =>
      ((loop.document() as any).schedule.taskGroups.find((one: any) => one.id === groupId)?.label ??
        null) as string | null,
  }
}

/** One plain press on a row -- FR-085's choosing, and nothing more. */
function pressRow(built: Stage, groupId: string): void {
  built.aimAtRow(groupId)
  built.send(pointer('down', 80, 200))
  built.send(pointer('up', 80, 200))
  built.aimAtNothing()
}

/**
 * MK-13 on a row's name: the double click FR-085 makes the rename path.
 *
 * ⛔ BOTH CLICKS ARE SENT, WHICH IS WHAT A BROWSER DELIVERS. The first carries
 * `clickCount: 1` and is the press that chooses the row (FR-085); the second
 * carries 2 and is MK-13's. ⚠️ A case that sent only the second would be asking
 * the shell to choose a row AND rename it on one press, which the branch says in
 * as many words it does not do -- and it would pass or fail for the wrong reason.
 */
function doubleClickRowName(built: Stage, groupId: string): void {
  built.aimAtRow(groupId)
  built.send(pointer('down', 80, 200))
  built.send(pointer('up', 80, 200))
  built.send(pointer('down', 80, 200, { clickCount: 2 }))
  built.send(pointer('up', 80, 200, { clickCount: 2 }))
  built.aimAtNothing()
}

/** The field the panel drew for one row of table T-058, or undefined. */
const fieldOf = (panel: PropertiesPanel | null, row: string) =>
  panel?.fields.find((one) => one.row === row)

// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ FR-085 states the rename path, and MK-13 names the 行見出し', () => {
    // GOES RED IF: the ruling of 2026-09-01 is reversed, or MK-13 stops naming
    // the row title as one of its destinations.
    expect(REQUIREMENTS).toContain(FR_085_THE_RENAME_PATH)
    expect(MK_13).toContain('行見出し')
  })

  it('⛔ FR-042 now puts the row name on the panel, and the sentence it overrode is gone', () => {
    // ⚠️ THE OVERRIDE ITSELF. FR-042 keeps the old wording INSIDE quotation
    // marks as history; what may not stand again is the ⚠️-marked note it used
    // to be.
    // GOES RED IF: someone reads the recorded history as a live rule.
    expect(REQUIREMENTS).toContain(FR_042_THE_NAME_IS_ON_THE_PANEL)
    expect(REQUIREMENTS).not.toContain(THE_OVERRIDDEN_SENTENCE)
  })

  it('⭐ AT-53 is `TaskGroup`.`label`, read from the ERD and not typed', () => {
    // GOES RED IF: the row a name lives on is renumbered, which would send the
    // focus at a row the panel does not draw.
    expect(ROW_NAME_FIELD).toBe('AT-53')
  })
})

describe('FR-042 (MUST): the row s name is a field of the panel', () => {
  it('⭐ the panel a chosen row puts up carries AT-53, editable, with the name in it', () => {
    // ⭐ THE MEASURED GAP OF 2026-09-01, ASKED AT THE UNIT: the shipped panel
    // held AT-58 and AT-59 and no name at all.
    // GOES RED IF: AT-53 leaves `GROUP_ITEMS`, or arrives read-only.
    const built = stage()
    doubleClickRowName(built, ALPHA)

    const name = fieldOf(built.panel(), ROW_NAME_FIELD)
    expect(name, `the panel drew ${ROW_NAME_FIELD}`).toBeDefined()
    expect(name?.text).toBe(ALPHA_NAME)
    expect(name?.isEditable, 'FR-042 (MUST): the name can be edited here').toBe(true)
  })

  it('⭐ it stands FIRST, where the most frequently touched item goes', () => {
    // FR-072's RATIONALE puts the most frequently touched item at the top --
    // 「落とした高さは、最も頻繁に触る項目が上へ来るぶんである」 -- which is the
    // place PR-1 takes among a Task's.
    // GOES RED IF: the name is appended after the colour and the height.
    const built = stage()
    doubleClickRowName(built, ALPHA)
    expect(built.panel()?.fields[0]?.row).toBe(ROW_NAME_FIELD)
  })

  it('⚠️ the colour and the height are still there beside it', () => {
    // ⛔ THE RULING ADDED A FIELD AND TOOK NONE AWAY. FR-042's first sentence
    // still (MUST) puts the row's colour and height on this panel.
    // GOES RED IF: the name is put in place of one of them.
    const built = stage()
    doubleClickRowName(built, ALPHA)
    const rows = built.panel()?.fields.map((one) => one.row) ?? []
    expect(rows).toContain('AT-58')
    expect(rows).toContain('AT-59')
  })
})

describe('FR-085 (MUST): a double click on the name opens the panel at that field', () => {
  it('⭐ puts the panel up and asks for AT-53', () => {
    // ⭐ THE RULING, MEASURED AT THE UNIT: 「プロパティパネルを開き、タスクグループ
    // 名編集モードとせよ」. The focus itself belongs to the side that drew the
    // control (LR-6), so what this unit owes is the ASK -- and the seam member
    // it travels on is optional, which is why nothing else would notice it going.
    // GOES RED IF: the double click stops reaching `editInPlace`, or the ask is
    // sent for PR-1 (a Task's name) on a row.
    const built = stage()
    doubleClickRowName(built, ALPHA)

    expect(built.panel(), 'FR-085 (MUST): the panel is up').not.toBeNull()
    expect(built.screen.focusAsks()).toEqual([ROW_NAME_FIELD])
  })

  it('⛔ a single press chooses the row and asks for no field (FR-042, MUST NOT)', () => {
    // ⚠️ THE CONTROL CASE, and a rule of its own: 「行を選んだだけで名前の欄へ焦点
    // を移してはならない（MUST NOT）」. Without it, a shell that asked for the
    // field on EVERY press on a row would pass the case above.
    // GOES RED IF: the ask is hung on the press rather than on the double click.
    const built = stage()
    pressRow(built, ALPHA)
    expect(built.screen.focusAsks(), 'a plain press asks for no field').toEqual([])
  })

  it('⭐ the panel turns to the row that was double clicked', () => {
    // ⛔ NOTHING IS CHOSEN BY THE SECOND CLICK: the first one already moved the
    // chosen rows, so the panel shows what was pressed. A second row double
    // clicked after the first must move the panel with it.
    // GOES RED IF: the panel keeps the row the FIRST double click chose.
    const built = stage()
    doubleClickRowName(built, ALPHA)
    expect(fieldOf(built.panel(), ROW_NAME_FIELD)?.text).toBe(ALPHA_NAME)
    doubleClickRowName(built, BETA)
    expect(fieldOf(built.panel(), ROW_NAME_FIELD)?.text).toBe(BETA_NAME)
  })

  it('⛔ the press itself writes nothing to the document', () => {
    // ⚠️ THE NAME IS WRITTEN BY THE FIELD S COMMIT AND NOT BY THIS PRESS. A
    // double click that wrote would put a step on the undo history for an edit
    // nobody made (FR-031 with UN-3 of table T-027).
    // GOES RED IF: the branch mints a `setTaskGroupLabel` on the press.
    const built = stage()
    doubleClickRowName(built, ALPHA)
    expect(built.labelOf(ALPHA)).toBe(ALPHA_NAME)
    expect(built.labelOf(BETA)).toBe(BETA_NAME)
  })
})
