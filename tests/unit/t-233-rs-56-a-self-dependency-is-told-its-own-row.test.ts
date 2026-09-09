// The anchor for ONE line of the shell: the row of table T-233 a dependency
// drawn from a task to ITSELF is told on (`REFUSAL_SITUATIONS` of
// `frame-loop.ts`, reached through `Refusal.reasonCategory`).
//
// ⛔⛔ WHAT WAS MEASURED BEFORE THIS (2026-09-09). Table T-233 held `RS-56`
// 「同じ `Task` を、依存の先行と後続の両方にしようとした」 and FR-038's dictionary
// held its words, and a person who drew a dependency line from a bar back onto
// the same bar was told `RS-10` 「命令が拒否されたので、束ごと落とした」 -- whose
// next step is 「拒まれた変更を取り除いて、もう一度」, and a person who drew ONE
// line has nothing to take out. The three rows seated beside it on the same day
// (`RS-55`, `RS-57`, `RS-58`) reached their seats; this one did not, because
// `edit-dependency.ts` spells FOUR different refusals as `CM-36` against
// `FR-009` and the road was keyed on that pair alone.
//
// Unit under test:
//   UF-48  `frame-loop.ts` (CP-25 of table T-062) -- the shell, which is the one
//          side that turns a refusal into a telling (FR-076).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// THE CLAUSES THESE CASES EXIST FOR (rule 03 section 3: quoted because holding
// them verbatim IS the point)
// ---------------------------------------------------------------------------
//
//   T-037's closing paragraph, under FR-076:
//     ⛔ 「拒否の理由を 1 つの行へ潰してはならない（MUST NOT）」
//     ⭐ 「本表に行を足す者は、その行へ振り分ける道が在ることまで確かめること
//        （MUST）」 -- 「行と辞書の項が揃っていても、運ぶ側が別を捨てていれば、
//        届くのは古い語である」
//
//   FR-009: 「次の依存を作ってはならない（MUST NOT）」, and what follows that
//     clause in the same sentence is THREE prohibitions with NO row ids -- the
//     self-reference (「自己参照」), the pair that already has a dependency, and
//     an end that is neither task nor milestone. Table T-233 gives the FIRST of
//     the three a row of its own and the other two none.
//
//   T-035 AG-9a: 「拒否の値には、拒否された対象・理由の区分・現在の刻印を含める
//     こと（MUST）」 -- 「理由の区分」 is what `Refusal.reasonCategory` carries.
//
//   T-023a PD-3: 「構えが依存線のときは表 T-023d を適用せず、当たったタスクの
//     左半分 / 右半分で依存の端点を決める」 -- the road these cases drive.
//   T-023b AR-4 / T-109 IC-61: the entrance that arms the dependency line.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - A row for FR-009's OTHER TWO prohibitions. Table T-233 gives them none,
//     and `RS-10` is true of them: a bundle was dropped and the person can take
//     the refused change out and try again. Giving them a row is the
//     specification's to do, not this build's.
//   - Which words the reader sees. FR-038 (MUST NOT) keeps them in one
//     dictionary; these cases compare against THAT, never against a spelling.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type {
  HumanInput,
  InputModifiers,
} from '../../src/adapter/input-command-translator/input-command-translator'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  frameLoop,
  type FrameEnvironment,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, type SpecRow, type SpecTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at read time rather than copied (Chapter 1.9)
// ---------------------------------------------------------------------------

const T_233: SpecTable = specTable('T-233')
const T_109: SpecTable = specTable('T-109')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

/** The manner column table T-233 writes one reason against. */
const mannerOf = (rowId: string): string => bare(rowOf(T_233, rowId).cells[1] ?? '')

/** The 正 column table T-233 gives one reason, as printed. */
const authorityOf = (rowId: string): string => rowOf(T_233, rowId).cells[2] ?? ''

/** The words FR-038's one dictionary holds for one row of table T-233. */
const wordsOf = (rowId: string): { readonly ja: string; readonly en: string } => {
  const found = (displayWords as any).reasons.find((one: any) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no row ${rowId}`)
  return found.text
}

const RS_10 = 'RS-10'
const RS_56 = 'RS-56'

/** `AR-4` of table T-023b -- the dependency line is armed. */
const DEPENDENCY_ARM = 'AR-4'

/** The one entrance of table T-109 that arms the dependency line. */
const DEPENDENCY_ENTRANCE = ((): { row: string; surface: string } => {
  const found = T_109.rows.filter((row) => bare(row.by['構え'] ?? '') === DEPENDENCY_ARM)
  if (found.length !== 1) {
    throw new Error(`table T-109 arms ${DEPENDENCY_ARM} from ${found.length} entrances`)
  }
  const row = found[0] as SpecRow
  return { row: row.id, surface: bare(row.by['面'] ?? '') }
})()

/** One entry of table T-109, as the side that DREW it answers for the point. */
const ENTRANCE_PART = {
  part: DEPENDENCY_ENTRANCE.surface,
  entry: DEPENDENCY_ENTRANCE.row,
  format: null,
  rowGroupId: null,
  resourceUid: null,
  dividerPanel: null,
  noticeDismissKey: null,
} as unknown as ScreenPart

// ---------------------------------------------------------------------------
// The loop, driven the way a person draws a dependency line
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

/** BT-4 of table T-034 -- the template FR-027 starts a reader with. */
function templateDocument(): Document {
  const read = documentFromJson(readFileSync(TEMPLATE_PATH, 'utf8'))
  if (!read.ok) {
    throw new Error(`the bundled template is not GRS JSON: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 900,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: string, x: number, y: number): HumanInput =>
  ({
    kind: 'pointer',
    phase,
    button: 'left',
    x,
    y,
    modifiers: { ...NO_MODIFIERS },
    clickCount: 1,
  }) as unknown as HumanInput

const realRaf = (globalThis as any).requestAnimationFrame

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * The box one drawn bar stands in.
 *
 * ⚠️ Read off the outline's own points rather than off a member: `BarGeometry`
 * carries the silhouette, and the box is what `dependencyEndAtPointer` halves.
 */
function boxOfOutline(bar: any): Box | null {
  if (bar === null || bar === undefined || bar.form !== 'outline') return null
  const xs = bar.points.map((one: any) => one.x)
  const ys = bar.points.map((one: any) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

interface Stage {
  /** Press the entrance of table T-109 that arms the dependency line. */
  armDependencyLine(): void
  /** Every drawn bar wide enough for two presses to fall in different halves. */
  bars(): readonly { readonly uid: number; readonly box: Box }[]
  /** One press and one release, with nothing of the screen under either. */
  drag(from: { x: number; y: number }, to: { x: number; y: number }): void
  /** The tellings the last drawn description carries. */
  notices(): readonly { readonly text: string; readonly manner: string }[]
  /** Every dependency the document holds, as pairs. */
  dependencyCount(): number
}

/**
 * UF-48, driven with a surface that answers for the palette entry when asked and
 * for nothing else.
 *
 * ⚠️ THE FAKE IS NOT THE TEST (R6.3). Nothing in it decides which row is told.
 */
function stage(): Stage {
  const views: ScreenView[] = []
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
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
  const wiring: ScreenWiring = { surface, language: 'ja' as DisplayLanguage }
  const loop = frameLoop({ showSvg: () => undefined } as any, templateDocument(), SCREEN, wiring)
  const runFrames = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
    expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
  }
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    runFrames()
  }
  runFrames()
  return {
    armDependencyLine: () => {
      part = ENTRANCE_PART
      send(pointer('down', 40, 200))
      send(pointer('up', 40, 200))
      part = null
    },
    bars: () => {
      const frame = loop.current()
      if (frame === null) throw new Error('no frame has run')
      const found: { uid: number; box: Box }[] = []
      for (const task of frame.geometry.tasks) {
        const box = boxOfOutline((task as any).plan) ?? boxOfOutline((task as any).actual)
        if (box !== null && box.width > 8) found.push({ uid: task.taskUid, box })
      }
      if (found.length === 0) {
        throw new Error('the bundled template drew no bar wide enough to press twice')
      }
      return found
    },
    drag: (from, to) => {
      send(pointer('down', from.x, from.y))
      send(pointer('up', to.x, to.y))
    },
    notices: () => (views[views.length - 1]?.notices ?? []) as any,
    dependencyCount: () =>
      loop.document().schedule.tasks.reduce((sum, one) => sum + one.dependencies.length, 0),
  }
}

// ===========================================================================
// The manuscript still says what these cases read
// ===========================================================================

describe('the rows this case is driven by are still in the manuscript', () => {
  it('⭐ table T-233 still holds RS-56 against NT-1, with FR-009 as its 正', () => {
    expect(mannerOf(RS_56)).toBe('NT-1')
    expect(authorityOf(RS_56)).toContain('FR-009')
  })

  it('⛔ the dictionary gives RS-56 and RS-10 different words', () => {
    // ⚠️ WITHOUT THIS THE CASE BELOW IS VACUOUS: telling `RS-56` and telling
    // `RS-10` would be indistinguishable, which is the whole defect.
    expect(wordsOf(RS_56).ja).not.toBe(wordsOf(RS_10).ja)
    expect(wordsOf(RS_56).ja.length).toBeGreaterThan(0)
  })

  it('⭐ table T-109 still arms AR-4 from exactly one entrance', () => {
    expect(DEPENDENCY_ENTRANCE.row.length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// The row a self-dependency is told on
// ===========================================================================

describe('table T-037 / T-233: a dependency drawn onto its own task is told RS-56', () => {
  it('⭐⭐ RS-56: both ends on one bar is told FR-009s own row and not RS-10', () => {
    const one = stage()
    one.armDependencyLine()
    const bar = one.bars()[0] as { uid: number; box: Box }
    const before = one.dependencyCount()

    // PD-3 with the dependency armed: the press names the predecessor by the
    // half of the bar it landed on, the release names the successor the same
    // way -- and both halves belong to the SAME bar, which is FR-009's 自己参照.
    one.drag(
      { x: bar.box.x + bar.box.width * 0.25, y: bar.box.y + bar.box.height / 2 },
      { x: bar.box.x + bar.box.width * 0.75, y: bar.box.y + bar.box.height / 2 },
    )

    expect(one.dependencyCount(), 'FR-009 (MUST NOT): nothing was written').toBe(before)
    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf(RS_56).ja)
    expect(told[0]?.text).not.toBe(wordsOf(RS_10).ja)
    expect(told[0]?.manner).toBe(mannerOf(RS_56))
  })

  it('⛔ THE CONTROL: a dependency between TWO tasks is told nothing at all', () => {
    // ⚠️ WITHOUT THIS, A BUILD THAT REFUSED EVERY DEPENDENCY DRAG WOULD PASS.
    // The same posture, the same two presses, two different bars.
    const one = stage()
    one.armDependencyLine()
    const drawn = one.bars()
    const first = drawn[0] as { uid: number; box: Box }
    // ⚠️ A bar that does not OVERLAP the first, because the release names its
    // task by the bar its point falls in and two boxes sharing a point would
    // leave which of them answers to the order of the walk.
    const second = drawn.find((bar) => bar.uid !== first.uid && !overlaps(bar.box, first.box))
    if (second === undefined) throw new Error('the bundled template drew only one usable bar')

    const before = one.dependencyCount()
    one.drag(
      { x: first.box.x + first.box.width * 0.75, y: first.box.y + first.box.height / 2 },
      { x: second.box.x + second.box.width * 0.25, y: second.box.y + second.box.height / 2 },
    )

    expect(one.dependencyCount(), 'the write landed').toBe(before + 1)
    expect(one.notices().length).toBe(0)
  })

  it('⭐⭐ THE WIDE HALF: FR-009s OTHER refusals keep RS-10 and do not borrow RS-56', () => {
    // ⛔⛔ THIS IS THE HALF THAT MAKES THE CATEGORY NECESSARY. `edit-dependency.ts`
    // spells all three of FR-009's prohibitions `CM-36` against `FR-009`, so a
    // road keyed on that pair alone would answer `RS-56` 「同じ `Task` を、依存の
    // 先行と後続の両方にしようとした」 to a person who drew a SECOND line between
    // two DIFFERENT tasks -- 「どの項目が、なぜ誤りか」 (NT-1, MUST) said, and said
    // wrongly. ⭐ Only `Refusal.reasonCategory` keeps the two apart.
    const one = stage()
    one.armDependencyLine()
    const drawn = one.bars()
    const first = drawn[0] as { uid: number; box: Box }
    const second = drawn.find((bar) => bar.uid !== first.uid && !overlaps(bar.box, first.box))
    if (second === undefined) throw new Error('the bundled template drew only one usable bar')

    const from = { x: first.box.x + first.box.width * 0.75, y: first.box.y + first.box.height / 2 }
    const into = {
      x: second.box.x + second.box.width * 0.25,
      y: second.box.y + second.box.height / 2,
    }
    one.drag(from, into)
    const written = one.dependencyCount()
    expect(one.notices().length, 'the first line landed').toBe(0)

    // 「既に同じ 2 つの間にある依存と同じ組」 -- FR-009's SECOND prohibition, which
    // table T-233 gives no row of its own.
    one.drag(from, into)

    expect(one.dependencyCount(), 'FR-009 (MUST NOT): nothing was written twice').toBe(written)
    const told = one.notices()
    expect(told.length, 'FR-076 (MUST): the refusal is told').toBe(1)
    expect(told[0]?.text).toBe(wordsOf(RS_10).ja)
    expect(told[0]?.text).not.toBe(wordsOf(RS_56).ja)
  })
})

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  )
}
