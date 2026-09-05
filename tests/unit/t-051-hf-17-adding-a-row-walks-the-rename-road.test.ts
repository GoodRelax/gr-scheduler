// 表 T-051 の `HF-17` and `HF-14` (MUST, 利用者の裁定 2026-09-03, CR-346 then
// CR-348, ledger row D-243): 「行を足す操作が、行の名前を変える操作と同じ操作感で
// あること」 -- adding a row at 段 0 (the panel's head, `HF-17`) must feel exactly
// like renaming one already on the panel (`FR-085`'s double-click path).
//
// ⭐⭐ THE RULING THIS FILE IS WRITTEN FROM (quoted in 表 T-051's `HF-14`,
// 利用者の裁定 2026-09-03; the one clause naming an example row's placeholder
// text is deliberately not quoted here -- HF-14 itself forbids printing that
// spelling, so this file does not print it either):
//
//   「⋯つまり、現在タスクグループ名を変更する際の操作と操作感を合わせろ。」
//
// ⚠️ THE MODEL THIS SUPERSEDED (withdrawn 2026-09-04, CR-348): a press used to
// open an EMPTY name field and wait for `Enter`; three MUSTs said so
// (「名前は空で立てる」「既定の名を与えてはならない」「空のまま確定されたら立てな
// い」). ⛔ If a case below ever reads an empty field or an empty-name
// confirmation, that is this file drifting back onto a rule nobody holds --
// see the guard in "the manuscript still says..." below.
//
// ⭐ THE THREE SENTENCES THIS FILE IS WRITTEN FROM, verbatim out of 表 T-051's
// `HF-14` (docs/spec/01-04-requirements.md):
//
//   ⭐⭐ 「**押された瞬間に、既定の名前で行を立てること（MUST）。その行のプロパティ
//    パネルを出し、名前の欄で名づけさせること（MUST）**」
//   ⛔ 「**改名と別の道を作ってはならない（MUST NOT）。道は `FR-085` が改名につい
//    て定めるものと同じものとすること（MUST）。**」
//   ⭐ 「**既定の名前は表示語として持つこと（MUST）。仕様書に綴りを刷ってはならない
//    （MUST NOT）**」 -- so this file reads the word from the dictionary at run
//    time and never types it.
//
// and out of `HF-17` (the same table): 「**足した行は最も浅い段の末子とすること
// （MUST）。名前の扱いは `HF-14` に従う。**」 and 「**`HF-14`（配下に足す）も同じと
// すること（MUST）**」 -- one naming MUST, read by two entrances.
//
// and out of `FR-085` (the road `HF-14` points to): 「**行の名前を変える経路は、
// 行見出しパネルでその名前をダブルクリックすること（表 T-023 の `MK-13`）とし、
// `GRS` はプロパティパネルを出し、名前の欄（`_assets/fig-erd-detail.md` の
// `AT-53`）を編集できる状態にして焦点を置き、既にある文字をすべて選んだ状態にする
// こと（MUST）**」.
//
// and out of `FR-072`, which now counts this entrance among the ones that may
// put the panel up: 「**`FR-091`（2026-09-03）と 表 T-051 の `HF-14`（2026-09-04）
// がさらに求めている。**」
//
// ---------------------------------------------------------------------------
// Unit under test: UF-48 of 表 T-075 (`frame-loop.ts`, component CP-25 of
// 表 T-062) -- the layer that holds the current values (LY-5 of 表 T-060), so
// raising the row, putting the panel up and asking for the field are all its
// answer.
//
// ⚠️ Chapter 9 admits no Unit as a TEST_LEVEL, so these cases have no node in
// the specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). ⛔ NO FILE UNDER src/ WAS OPENED. The host,
// the fake surface, the fixture shape and the double-click helper are copied
// from tests/unit/fr-085-double-click-a-row-name.test.ts and
// tests/unit/t-051-hf-14-the-depth-cap-refuses-a-row.test.ts, which drive this
// same unit through the same seams; `startup-template.json` is a generated
// document and is read as data.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   1. WHETHER THE DETAIL TIER OR A FOLDED ANCESTOR IS OPENED so the new row is
//      visible. Those are `HF-14`'s OWN separate MUSTs (「その行が描かれるまで
//      詳しさの段を開くこと」 and 「立てた行が…畳んだ親の下に入るときは、その親を
//      開くこと」), argued and measured independently (`D-237`); they are not
//      part of what makes the OPERATION feel like a rename, which is this
//      file's one question.
//   2. THE DEPTH-CAP REFUSAL (`RS-46`, faint entrance). That is
//      tests/unit/t-051-hf-14-the-depth-cap-refuses-a-row.test.ts's file, named
//      for the cap; this file is named for the ordinary press.
//   3. WHETHER THE EXISTING TEXT IS SELECTED once focus lands
//      (`FR-085`: 「既にある文字をすべて選んだ状態にすること」). The seam this
//      unit is driven through, `focusPropertyField`, carries only the row ID
//      being asked for (tests/unit/fr-085-double-click-a-row-name.test.ts's own
//      fake proves this -- its `asked.push(row)` takes one argument). Selection
//      range is drawn by the DOM surface (UF-71), not decided here.
//   4. HF-9's SCROLL-INTO-VIEW when the new row lands off-screen. A separate
//      MUST of `HF-17` / `HF-14`, not part of the operation's FEEL at the
//      moment of the press.
//   5. A DOCUMENT WITH ZERO ROWS. `HF-17`'s own RATIONALE names this case
//      (「行が 1 つも無い文書では押す相手が存在しない」), but whether `frameLoop`
//      normalizes such a document on load is not established by any file this
//      one is allowed to read, so no case here assumes an answer either way.

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

// ===========================================================================
// The manuscripts, read at run time rather than copied (Chapter 1.9)
// ===========================================================================

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** Everything one row of a table says, as one string. */
const says = (table: string, id: string): string => rowOf(table, id).cells.join(' ')

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** 表 T-103's settled English name for U-22 -- the 面 both entrances sit on. */
const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')

/**
 * The entrance 表 T-109 gives one rule of 表 T-051.
 *
 * ⭐ THE JOIN IS THE SPECIFICATION'S OWN: 表 T-109's 正 column names the rule
 * that owns each entrance, so a case that means 「HF-17's control」 says so and
 * is told which icon that is, instead of typing `IC-93` and going quiet the
 * day the roster is renumbered.
 */
function entranceFor(rule: string): string {
  const onThePanel = specTable('T-109').rows.filter(
    (one) => bare(one.by['面'] ?? '') === ROW_TITLE_PANEL,
  )
  const found = onThePanel.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  const first = found[0]
  if (found.length !== 1 || first === undefined) {
    throw new Error(`表 T-109 gives ${rule} ${found.length} entrances on the panel, not one`)
  }
  return first.id
}

/** `HF-17`'s entrance -- adds a row to 段 0, the panel's own head. */
const HEAD_ADD_ROW = entranceFor('HF-17')
/** `HF-14`'s entrance -- adds a row under whichever row is pressed. */
const ADD_CHILD_ROW = entranceFor('HF-14')

/**
 * `AT-53` -- the row's name, read out of the ERD rather than typed.
 *
 * ⭐ THE ROW ID IS THE JOIN across `focusPropertyField`'s argument, so a case
 * that means 「the name field was asked for」 is told which row that is instead
 * of typing `AT-53` and going quiet the day the ERD is renumbered.
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

interface DefaultRowName {
  readonly use: string
  readonly text: Readonly<Record<DisplayLanguage, string>>
}

/**
 * FR-038's dictionary word for a freshly stood-up row, as the MANUSCRIPT
 * keeps it -- never as `src/` prints it, and never typed here.
 *
 * ⭐ docs/spec/_source/ is where the word is written; `src/` holds what is
 * generated from it (Chapter 1.9 / rule 04 section 1).
 */
const DEFAULT_ROW_NAME_WORD: DefaultRowName = ((): DefaultRowName => {
  const manuscript = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { defaultNames?: readonly DefaultRowName[] }
  const found = (manuscript.defaultNames ?? []).find((one) => one.use === 'row')
  if (found === undefined) throw new Error('the dictionary has no defaultNames entry for `row`')
  return found
})()

const S_171 = NOT_STORED_PROPERTIES_PANEL_SIZES['S-171']

// ===========================================================================
// The document these cases drive: two roots, one of them already a parent, so
// a press can be told apart from every row already standing.
//
//   Alpha            (root)
//     AlphaChild
//   Beta             (a second root)
//
// Copied in shape from tests/unit/fr-085-double-click-a-row-name.test.ts and
// tests/unit/t-015-t-051-the-four-folding-controls.test.ts.
// ===========================================================================

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const uuidOf = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const ALPHA = uuidOf(1)
const ALPHA_CHILD = uuidOf(2)
const BETA = uuidOf(3)

const ALPHA_NAME = 'AlphaRowName'
const ALPHA_CHILD_NAME = 'AlphaChildRowName'
const BETA_NAME = 'BetaRowName'

interface StoredRow {
  readonly id: string
  readonly parentId: string | null
  readonly label: string | null
  readonly order: number
}

function threeRowDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const row = (id: string, parentId: string | null, label: string, order: number): StoredRow => ({
    id,
    parentId,
    label,
    order,
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
      taskGroups: [
        { ...row(ALPHA, null, ALPHA_NAME, 0), derivedFromTaskUid: null, isCollapsed: false, isHidden: false, color: null, height: null },
        { ...row(ALPHA_CHILD, ALPHA, ALPHA_CHILD_NAME, 0), derivedFromTaskUid: null, isCollapsed: false, isHidden: false, color: null, height: null },
        { ...row(BETA, null, BETA_NAME, 1), derivedFromTaskUid: null, isCollapsed: false, isHidden: false, color: null, height: null },
      ],
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

// ===========================================================================
// The host UF-48 is given. Copied from the same two files.
// ===========================================================================

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const realRaf = (globalThis as any).requestAnimationFrame

/**
 * ⚠️ THE HOST IS A FAKE, AND THE FAKE IS NOT THE TEST (R6.3). Nothing in it
 * decides anything about a row, the panel or the field.
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
  options: { readonly clickCount?: number } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left' as PointerButton,
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: options.clickCount ?? 1,
})

/** Somewhere inside the surface the fake answers for. */
const ON_THE_SURFACE = { x: 80, y: 120 }

interface Stage {
  readonly loop: FrameLoop
  readonly screen: ScreenPane
  send(input: HumanInput): void
  aim(entry: string | null, groupId: string | null): void
  aimAtNothing(): void
  /** Aim one control entrance and press it -- CS-2 freezes the aim at the press. */
  press(entry: string, groupId: string | null): void
  /** `MK-13` on a row's name: the rename road `HF-14` points at. */
  doubleClickName(groupId: string): void
  panel(): PropertiesPanel | null
  rows(): readonly StoredRow[]
}

function stage(language: DisplayLanguage = 'ja'): Stage {
  const pen = host()
  const screen = screenPane(language)
  const loop = frameLoop(pen.surface, threeRowDocument(), SCREEN, screen.wiring)
  pen.runAnimationFrames()
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  const aim = (entry: string | null, groupId: string | null): void => {
    screen.drawAt({
      part: ROW_TITLE_PANEL,
      entry: entry as any,
      format: null,
      rowGroupId: groupId,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  }
  const aimAtNothing = (): void => screen.drawAt(null)
  return {
    loop,
    screen,
    send,
    aim,
    aimAtNothing,
    press: (entry, groupId) => {
      aim(entry, groupId)
      // IN-1 settles a pointer operation on release, so a press is down then up.
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      aimAtNothing()
    },
    doubleClickName: (groupId) => {
      // ⛔ BOTH CLICKS ARE SENT, WHICH IS WHAT A BROWSER DELIVERS. The first
      // (clickCount 1) chooses the row; the second (clickCount 2) is `MK-13`'s.
      aim(null, groupId)
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
      send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y, { clickCount: 2 }))
      send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y, { clickCount: 2 }))
      aimAtNothing()
    },
    panel: () => screen.last().propertiesPanel,
    rows: () => (loop.document().schedule as any).taskGroups as readonly StoredRow[],
  }
}

/** The field the panel drew for one row of table T-058, or undefined. */
const fieldOf = (panel: PropertiesPanel | null, row: string) =>
  panel?.fields.find((one) => one.row === row)

/** The one row present after a press that was not present before it. */
function newRowSince(before: readonly StoredRow[], after: readonly StoredRow[]): StoredRow {
  const knownIds = new Set(before.map((one) => one.id))
  const created = after.filter((one) => !knownIds.has(one.id))
  if (created.length !== 1) {
    throw new Error(`expected exactly one new row, found ${created.length}`)
  }
  return created[0]!
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST A COLUMN WOULD MAKE EVERY CASE BELOW
    // AGREE WITH ANYTHING -- rule 04 section 2.
    expect(ROW_TITLE_PANEL).toBe('Row Title Panel')
    expect(HEAD_ADD_ROW).toBe('IC-93')
    expect(ADD_CHILD_ROW).toBe('IC-91')
    expect(ROW_NAME_FIELD).toBe('AT-53')
  })

  it('⭐⭐ HF-14 (MUST): a press raises the row at once, named from the dictionary, on FR-085s own road', () => {
    expect(says('T-051', 'HF-14')).toContain(
      '押された瞬間に、既定の名前で行を立てること（MUST）。その行のプロパティパネルを出し、名前の欄で名づけさせること（MUST）',
    )
    expect(says('T-051', 'HF-14')).toContain(
      '改名と別の道を作ってはならない（MUST NOT）。道は `FR-085` が改名について定めるものと同じものとすること（MUST）。',
    )
    expect(says('T-051', 'HF-14')).toContain(
      '既定の名前は表示語として持つこと（MUST）。仕様書が規則として綴りを刷ってはならない（MUST NOT）',
    )
  })

  it('⛔ HF-14 no longer holds the model withdrawn on 2026-09-04 (guards this file against drifting back)', () => {
    // ⚠️ CR-348 withdrew three MUSTs about an EMPTY name field, and the row now
    // says the opposite (quoted above). ⛔ If a case in this file ever reads an
    // empty name field or a confirm-to-create step, this is what says it is
    // reading a rule nobody holds.
    expect(says('T-051', 'HF-14')).not.toContain('打ち込み口')

    // ⭐⭐ ASK WHETHER THE RULE IS LIVE, NOT WHETHER THE WORDS APPEAR. The
    // manuscript keeps a withdrawn rule as a dated note on purpose -- 「2026-09-04
    // までは…と定めていた」 -- because that is how this project records what
    // moved and why. Measured 2026-09-05: a guard reading for the words alone
    // went red against a manuscript that says the opposite of them. So the
    // withdrawn wording must appear ONLY inside that dated note.
    const hf14 = says('T-051', 'HF-14')
    const withdrawn = '名前は空で立て'
    const at = hf14.indexOf(withdrawn)
    if (at !== -1) {
      expect(
        hf14.slice(Math.max(0, at - 40), at),
        'the withdrawn wording stands outside the dated note that withdrew it',
      ).toContain('までは')
    }
    expect(hf14).not.toContain(withdrawn + 'ること（MUST）')
  })

  it('⭐⭐ HF-17 (MUST): 段 0s own add-row entrance defers its naming to HF-14, word for word', () => {
    expect(says('T-051', 'HF-17')).toContain('名前の扱いは `HF-14` に従う。')
    expect(says('T-051', 'HF-17')).toContain('`HF-14`（配下に足す）も同じとすること（MUST）')
  })

  it('⭐ FR-085 states the very road HF-14 points HF-17 at', () => {
    expect(REQUIREMENTS).toContain(
      '行の名前を変える経路は、行見出しパネルでその名前をダブルクリックすること',
    )
    expect(REQUIREMENTS).toContain(
      '名前の欄（`_assets/fig-erd-detail.md` の `AT-53`）を編集できる状態にして焦点を置き、既にある文字をすべて選んだ状態にすること（MUST）',
    )
  })

  it('⭐ FR-072 now counts HF-14 among the rules allowed to put the panel up', () => {
    expect(REQUIREMENTS).toContain(
      '`FR-091`（2026-09-03）と 表 T-051 の `HF-14`（2026-09-04）がさらに求めている。',
    )
  })

  it('⭐ PI-9 of table T-064 is the one place the spelling lives, so this file reads the dictionary instead', () => {
    expect(says('T-064', 'PI-9')).toContain('DEFAULT_ROW_NAME')
    expect(says('T-064', 'PI-9')).toContain('仕様書が規則として綴りを刷ってはならない（MUST NOT）')
  })

  it('⭐ the dictionary holds exactly one word for a row, spelled alike in both languages', () => {
    expect(DEFAULT_ROW_NAME_WORD.text.ja.length).toBeGreaterThan(0)
    expect(DEFAULT_ROW_NAME_WORD.text.ja).toBe(DEFAULT_ROW_NAME_WORD.text.en)
  })

  it('⭐ AT-55 scopes order to siblings under the same parent, which is what 末子 is measured against', () => {
    // ⭐ WHY THE FIXTURE IS SAFE: Alpha (a root, order 0) and AlphaChild (Alpha's
    // own child, also order 0) can share an order value because AT-55 scopes it
    // per parent -- so 「末子」 for a press at 段 0 is read against the OTHER
    // ROOTS only, never against a deeper row that happens to share a number.
    const at55 = readFileSync(
      join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'),
      'utf8',
    )
    expect(at55).toContain('| AT-55 | `TaskGroup` | `order` |')
    expect(at55).toContain('同じ親の下での並び')
  })
})

// ===========================================================================
// HF-17 / HF-14 (MUST): the row exists the instant the entrance is pressed
// ===========================================================================

describe('表 T-051 HF-17 and HF-14 (MUST): the press raises the row at once', () => {
  for (const language of ['ja', 'en'] as const) {
    it(`⭐⭐ HF-17 at 段 0: a new root row appears, last among the roots, named from the dictionary (${language})`, () => {
      const built = stage(language)
      const before = built.rows()
      const rootsBefore = before.filter((one) => one.parentId === null)
      const highestRootOrder = Math.max(...rootsBefore.map((one) => one.order))

      built.press(HEAD_ADD_ROW, null)

      const after = built.rows()
      expect(after, 'exactly one row was raised').toHaveLength(before.length + 1)
      const created = newRowSince(before, after)
      expect(created.parentId, '足した行は最も浅い段の末子 -- no parent, like the other roots').toBeNull()
      expect(created.label, 'named from FR-038s dictionary, not left empty').toBe(
        DEFAULT_ROW_NAME_WORD.text[language],
      )
      expect(created.order, '末子: after every root that stood before the press').toBeGreaterThan(
        highestRootOrder,
      )
    })
  }

  it('⭐⭐ HF-14 on an existing row: a new child appears under it, named from the same dictionary', () => {
    const built = stage()
    const before = built.rows()

    built.press(ADD_CHILD_ROW, ALPHA)

    const after = built.rows()
    expect(after, 'exactly one row was raised').toHaveLength(before.length + 1)
    const created = newRowSince(before, after)
    expect(created.parentId, 'HR-8: 足す先は配下 -- under the pressed row, not beside it').toBe(ALPHA)
    expect(created.label).toBe(DEFAULT_ROW_NAME_WORD.text.ja)
  })

  it('⛔ neither press needs a second input to create the row -- one press is the whole operation', () => {
    // ⚠️ THE DEFECT THIS GUARDS AGAINST (D-237 / the withdrawn model): a press
    // used to open an input box that created nothing until a later `Enter`.
    // `press()` above sends only pointer down and up -- if a case needed more
    // than that to see the row count change, this line would have said so.
    const built = stage()
    const before = built.rows()
    built.press(HEAD_ADD_ROW, null)
    expect(built.rows()).toHaveLength(before.length + 1)
  })
})

// ===========================================================================
// The core of D-243: the road is FR-085s own -- same ask, same editable field
// ===========================================================================

describe('D-243 (利用者の裁定 2026-09-03): adding a row feels exactly like renaming one', () => {
  it('⭐⭐ HF-17: the press opens the panel already turned to the new row, asking to focus AT-53', () => {
    const built = stage()
    expect(built.panel(), 'nothing is open before the press').toBeNull()
    const before = built.rows()

    built.press(HEAD_ADD_ROW, null)

    const created = newRowSince(before, built.rows())

    expect(built.panel(), 'FR-072/HF-14 (MUST): the panel is up').not.toBeNull()
    const field = fieldOf(built.panel(), ROW_NAME_FIELD)
    expect(field, `the panel drew ${ROW_NAME_FIELD}`).toBeDefined()
    expect(field?.text, 'the panel shows the row it just raised').toBe(created.label)
    expect(field?.isEditable, 'FR-085 (MUST): the name can be edited here').toBe(true)
    expect(built.screen.focusAsks(), 'the same ask FR-085 sends for a double click').toEqual([
      ROW_NAME_FIELD,
    ])
  })

  it('⭐⭐ HF-14: the same is true one level down, adding a child under an existing row', () => {
    const built = stage()

    built.press(ADD_CHILD_ROW, ALPHA)

    const field = fieldOf(built.panel(), ROW_NAME_FIELD)
    expect(field?.isEditable).toBe(true)
    expect(built.screen.focusAsks()).toEqual([ROW_NAME_FIELD])
  })

  it('⭐⭐⭐ the literal comparison: HF-17s press and FR-085s rename ask the SAME thing of the SAME field', () => {
    // ⭐ THIS IS D-243 ITSELF, MADE OBSERVABLE: two different presses, on two
    // different rows, land on identical shapes at this seam -- which is what
    // 「操作感を合わせろ」 asks for at the one seam a Unit test can read it at.
    const added = stage()
    added.press(HEAD_ADD_ROW, null)

    const renamed = stage()
    renamed.doubleClickName(ALPHA)

    expect(added.screen.focusAsks(), 'HF-17s ask').toEqual([ROW_NAME_FIELD])
    expect(renamed.screen.focusAsks(), 'FR-085s ask, for comparison').toEqual([ROW_NAME_FIELD])
    expect(added.screen.focusAsks()).toEqual(renamed.screen.focusAsks())

    const addedField = fieldOf(added.panel(), ROW_NAME_FIELD)
    const renamedField = fieldOf(renamed.panel(), ROW_NAME_FIELD)
    expect(addedField?.isEditable).toBe(true)
    expect(renamedField?.isEditable).toBe(true)
    expect(addedField?.isEditable).toBe(renamedField?.isEditable)
    // ⛔ THE TEXT IS NOT EXPECTED TO MATCH -- one shows the dictionary's word
    // for a new row, the other shows Alpha's own name. What must match is the
    // SHAPE of the road (which field, editable, asked for by name), not the
    // value sitting in it.
    expect(addedField?.text).not.toBe(renamedField?.text)
  })

  it('⭐⭐⭐ the same comparison holds for HF-14 (adding a child) against the rename road', () => {
    const added = stage()
    added.press(ADD_CHILD_ROW, ALPHA)

    const renamed = stage()
    renamed.doubleClickName(BETA)

    expect(added.screen.focusAsks()).toEqual(renamed.screen.focusAsks())
    expect(fieldOf(added.panel(), ROW_NAME_FIELD)?.isEditable).toBe(
      fieldOf(renamed.panel(), ROW_NAME_FIELD)?.isEditable,
    )
  })

  it('⛔ a plain press that only chooses a row (no double click, no add) asks for no field', () => {
    // ⚠️ THE CONTROL CASE. Without it, a build that asked `focusPropertyField`
    // on every press touching the Row Title Panel would pass every case above
    // for the wrong reason.
    const built = stage()
    built.aim(null, BETA)
    built.send(pointer('down', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
    built.send(pointer('up', ON_THE_SURFACE.x, ON_THE_SURFACE.y))
    expect(built.screen.focusAsks(), 'a single press on a row asks for no field').toEqual([])
  })
})
