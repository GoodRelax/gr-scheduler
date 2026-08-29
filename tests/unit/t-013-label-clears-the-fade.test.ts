// The paragraph printed under table T-013: what a fade does to the name label.
//
// ⚠️ Chapter 9 does not admit `Unit` as a TEST_LEVEL, so these cases have no
// node in the specification. Table T-218 of Chapter 7 gives them their place:
// TS-6, tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (04-verification section 1). The
// imports, `settingsOf`, `taskOf`, `scheduleOf` and the `ENV` / regions
// fixture are COPIED FROM tests/unit/t-012-name-label-vertical.test.ts, which
// drives the same two units (ScheduleLayout PI-5 and ScheduleGeometry PI-6).
// ⛔ That file pins `fadeInDays` and `fadeOutDays` to `null` in every case and
// says nothing about either; this file owns the fade alone.
//
// THE LINE THIS FILE RESTS ON -- the prose after table T-013
// (docs/spec/01-04-requirements.md:1167):
//
//   「**フェードを持つ形状では、`NL-1` の「タスクの幅」を、形状の幅から
//    `fadeIn` と `fadeOut` を引いた残りとすること（MUST）。形状の中に書くとき
//    は、`fadeIn` が終わる位置から書き始めること（MUST）。フェードの上に名称
//    ラベルを重ねてはならない（MUST NOT）** …… ⚠️ **引くのは 表 T-012a の
//    `FD-6` / `FD-6b` が切り詰めた後の値とすること（MUST）** …… ⚠️ **フェード
//    を持つのは 表 T-012 の `SH-1` と `SH-2` だけである**（表 T-012a の
//    `FD-5`）ので、ほかの 3 つの形状で本規則は何も変えない。⛔ **幅を引かずに
//    書き始めだけを寄せてはならない（MUST NOT）** —— **`NL-1` が「収まる」と
//    判じたラベルが、形状の右端を越える。**」
//
//   T-013 NL-1 「打ち切った後のラベルがタスクの幅に収まる | 形状の中に書く」
//   T-013 NL-3 「収まらない | 形状の右に出す」
//   T-012a FD-6 「`fadeIn` を `[0, 期間]` に丸めた後、`fadeOut` を
//    `[0, 期間 − fadeIn]` に丸める（**`fadeIn` が勝つ**）。⛔ **本表の「期間」は
//    暦日で数えること（MUST）**」
//   T-012a FD-5 「適用する形状 | **矩形と矢羽根のみ**（表 T-012 の SH-1 / SH-2）」
//
// ⛔ WHAT IS NOT ASSERTED, AND WHY -- reported rather than guessed:
//
//   * THE CHEVRON'S HALF OF THE RULE. FD-5 gives the fade to SH-1 and SH-2,
//     and FD-6b shrinks a chevron's two fades 「同じ比で」 -- but SH-2 also has
//     「フェード長が切り込みの深さを置き換える」, and no row says where a
//     chevron's usable width begins once the notch is the fade. Every case
//     below is a rectangle (SH-1), whose FD-6 is stated in full.
//   * WHERE A LABEL PUSHED OUTSIDE BEGINS. NL-3 says 「形状の右に出す」 and the
//     paragraph's three rules are all about 「形状の中に書くとき」, so nothing
//     here claims a fadeOut clears an outside label.

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  layoutFromSchedule,
  taskPlacement,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRect,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

/** The generated defaults, read by their printed dotted keys. */
const FLAT = SETTINGS_DEFAULTS as unknown as Record<string, number>

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const SETTINGS = settingsOf({
  rulerFont: 12, // S-3
  rulerHeight: 42, // S-2
  stackDirection: 'down', // S-58
  scrollDate: '2026-01-01', // S-77
  // ⭐ S-35 IS HELD AT ITS CEILING ON PURPOSE. LC-4 cuts the label to
  // `truncateUnits` BEFORE table T-013 is evaluated, so at the default every
  // name long enough to overflow a wide bar would arrive at NL-1 already cut to
  // the same length -- and the room this file measures would stop moving. ⛔ No
  // case below asserts S-35 or anything derived from it.
  truncateUnits: 120,
  shapeHeightOf: {
    rectangle: FLAT['shapeHeightOf.rectangle'],
    chevron: FLAT['shapeHeightOf.chevron'],
    arrow: FLAT['shapeHeightOf.arrow'],
    endpointSpan: FLAT['shapeHeightOf.endpointSpan'],
    milestone: FLAT['shapeHeightOf.milestone'],
  },
})

const REGIONS = regionsFromScreen(ENV, SETTINGS)

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [],
    taskGroupMembers: [],
    taskVisuals: [],
    highlightBoxes: [],
    commentBoxes: [],
    ...part,
  }) as unknown as Schedule

/** A task starting on `from` and running `days` CALENDAR days -- FD-6's unit. */
const spanning = (days: number, part: Record<string, unknown> = {}): Task => {
  const from = '2026-01-05'
  const finish = new Date(new Date(from + 'T00:00:00Z').getTime() + days * 86400000)
  return taskOf({ uid: 1, start: from, finish: finish.toISOString().slice(0, 10), ...part })
}

/** One root row holding that one task, with a shape chosen for it. */
const oneTask = (task: Task, shapeKind: string | null = null): Schedule =>
  scheduleOf({
    tasks: [task],
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
    taskVisuals: shapeKind === null ? [] : [{ taskUid: 1, shapeKind }],
  })

interface Drawn {
  readonly placed: TaskPlacement
  readonly label: ScreenRect | null
  readonly pxPerDay: number
}

const drawnOf = (schedule: Schedule): Drawn => {
  const layout = layoutFromSchedule(schedule, SETTINGS, REGIONS)
  const placed = taskPlacement(layout, 1)
  if (placed === null) throw new Error('task 1 was not drawn at this zoom')
  const picture = geometryFromLayout(
    schedule,
    SETTINGS,
    layout,
    REGIONS,
    emptySelection(),
  ).tasks.find((one) => one.taskUid === 1)
  if (picture === undefined) throw new Error('task 1 has no picture')
  return { placed, label: picture.label, pxPerDay: layout.pxPerDay }
}

/** A rectangle of `days`, named `name`, with the fades given. */
const barOf = (
  days: number,
  name: string,
  fade: { readonly in?: number; readonly out?: number } = {},
): Drawn =>
  drawnOf(
    oneTask(
      spanning(days, {
        name,
        ...(fade.in === undefined ? {} : { fadeInDays: fade.in }),
        ...(fade.out === undefined ? {} : { fadeOutDays: fade.out }),
      }),
    ),
  )

/**
 * The longest half-width name this bar still writes INSIDE its shape.
 *
 * This is the unit's own answer to 「`NL-1` の「タスクの幅」」, read back through
 * the only thing the specification makes observable: which row of table T-013
 * fires. Every width case below compares two of these rather than naming a
 * number, because the paragraph states a RELATION (the shape's width less the
 * two fades) and no row anywhere fixes the width of one character.
 */
const roomOf = (
  days: number,
  fade: { readonly in?: number; readonly out?: number } = {},
): number => {
  for (let length = 1; length <= 200; length += 1) {
    if (barOf(days, 'x'.repeat(length), fade).placed.labelPlacement !== 'inside') return length - 1
  }
  throw new Error('no half-width name of any length was pushed out of this bar')
}

// ---------------------------------------------------------------------------

describe('the paragraph after table T-013 -- the label begins where the fade ends', () => {
  it('⭐ starts the label at the end of `fadeIn` (MUST)', () => {
    // 「形状の中に書くときは、`fadeIn` が終わる位置から書き始めること（MUST）」.
    //
    // ⛔ STATED AS THE MOVE, NOT AS AN ABSOLUTE x, AND THE REASON IS A HOLE.
    // The drawn label of a bar with no fade does NOT begin at the shape's left
    // edge -- it is inset -- and no row of docs/spec fixes that inset. So what
    // the MUST is asked for here is that the start moves right by exactly the
    // fade: 「`fadeIn` が終わる位置」 read against wherever the same label began
    // without one. ⚠️ The inset itself is reported, never asserted.
    const plain = barOf(60, 'ab')
    const faded = barOf(60, 'ab', { in: 10 })

    expect(plain.placed.labelPlacement).toBe('inside')
    expect(faded.placed.labelPlacement).toBe('inside')
    expect((faded.label?.x as number) - faded.placed.x).toBeCloseTo(
      (plain.label?.x as number) - plain.placed.x + 10 * faded.pxPerDay,
      6,
    )
  })

  it('moves the start by the fade and by nothing else -- twice the fade moves it twice as far', () => {
    // ⛔ Without this, "it moved by 10 days" could hold of a unit that moved
    // every faded label by one fixed amount.
    const plain = barOf(60, 'ab')
    const short = barOf(60, 'ab', { in: 5 })
    const long = barOf(60, 'ab', { in: 10 })

    const shift = (drawn: Drawn): number => (drawn.label?.x as number) - drawn.placed.x

    expect(shift(short) - shift(plain)).toBeCloseTo(5 * plain.pxPerDay, 6)
    expect(shift(long) - shift(plain)).toBeCloseTo(10 * plain.pxPerDay, 6)
  })

  it('⛔ writes nothing on top of either fade (MUST NOT)', () => {
    // 「フェードの上に名称ラベルを重ねてはならない（MUST NOT）」 —— both ends.
    const faded = barOf(60, 'ab', { in: 10, out: 8 })
    const label = faded.label
    expect(label, 'the label is drawn').not.toBeNull()

    const left = faded.placed.x + 10 * faded.pxPerDay
    const right = faded.placed.x + faded.placed.width - 8 * faded.pxPerDay

    expect((label as ScreenRect).x).toBeGreaterThanOrEqual(left - 1e-6)
    expect((label as ScreenRect).x + (label as ScreenRect).width).toBeLessThanOrEqual(right + 1e-6)
  })

})

describe('the paragraph after table T-013 -- NL-1 judges the width LESS the fades', () => {
  it('⭐ takes `fadeIn` off the width NL-1 measures against (MUST)', () => {
    // 「`NL-1` の「タスクの幅」を、形状の幅から `fadeIn` と `fadeOut` を引いた
    // 残りとすること（MUST）」. Stated as the relation it is: lengthening the bar
    // by exactly the days the fade takes leaves the room unchanged.
    expect(roomOf(60, { in: 10 })).toBe(roomOf(50))
  })

  it('⭐ takes `fadeOut` off it as well (MUST)', () => {
    expect(roomOf(60, { out: 10 })).toBe(roomOf(50))
  })

  it('⭐ takes BOTH off, not merely the larger of the two', () => {
    expect(roomOf(60, { in: 7, out: 9 })).toBe(roomOf(44))
  })

  it('⛔ a fade really does cost room -- the three cases above are not comparing a constant', () => {
    // ⚠️ 04-verification section 2: a relation that held because NOTHING moved
    // would be a green proving nothing. A bar of 60 days with no fade has to
    // hold MORE than the same bar with 10 days of fade.
    expect(roomOf(60)).toBeGreaterThan(roomOf(60, { in: 10 }))
    expect(roomOf(60)).toBeGreaterThan(roomOf(60, { out: 10 }))
  })

  it('⛔ pushes a name outside once the fades take the room it needed (MUST NOT: 幅を引かずに書き始めだけを寄せてはならない)', () => {
    // The failure the MUST NOT names, stated as the two answers of table T-013:
    // a name that NL-1 admits without a fade is refused with one, rather than
    // being written inside and running past the shape's right edge.
    const name = 'x'.repeat(roomOf(60))

    expect(barOf(60, name).placed.labelPlacement).toBe('inside')
    expect(barOf(60, name, { in: 10 }).placed.labelPlacement).toBe('right')
  })
})

describe('the paragraph after table T-013 -- the fade it subtracts is the TRUNCATED one', () => {
  it('⚠️ uses FD-6\'s clamped values, so a fade longer than the bar does not make the room negative (MUST)', () => {
    // 「引くのは 表 T-012a の `FD-6` / `FD-6b` が切り詰めた後の値とすること
    // (MUST) —— 切り詰める前の値で引くと、期間より長いフェードが残りを負にする」.
    // FD-6: 「`fadeIn` を `[0, 期間]` に丸めた後、`fadeOut` を
    // `[0, 期間 − fadeIn]` に丸める（`fadeIn` が勝つ）」, counted in CALENDAR
    // days -- so on a 20-day bar a fadeIn of 50 becomes 20 and the fadeOut 0.
    const swamped = barOf(20, 'ab', { in: 50, out: 50 })

    // ⛔ Whatever it answers, it may not be a label written on top of the bar
    // as though the fades had cost nothing.
    expect(swamped.placed.labelPlacement).toBe('right')
    // ⭐ AND THE ROOM IS ZERO, NOT NEGATIVE: no name of any length fits inside.
    expect(roomOf(20, { in: 50, out: 50 })).toBe(0)
  })

  it('⚠️ `fadeIn` wins the clamp, so a fadeOut past what is left costs nothing more (FD-6)', () => {
    // FD-6 rounds `fadeOut` into `[0, 期間 − fadeIn]`, so on a 20-day bar with
    // fadeIn 12 the fadeOut can only ever be 8 -- and asking for 40 is asking
    // for 8. ⭐ The room is therefore the same as asking for exactly 8.
    expect(roomOf(20, { in: 12, out: 40 })).toBe(roomOf(20, { in: 12, out: 8 }))
  })
})
