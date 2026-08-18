// Unit tests for UF-47 `single-html-shell.ts` and UF-48 `frame-loop.ts`
// (table T-075 of docs/spec/05-07-design.md).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ Written from docs/spec alone. `docs/development-rules/04-verification.md`
// §1 forbids the author of a unit from writing its tests, so nothing below was
// derived from the body of either unit -- only from the requirements, and from
// the declarations UF-48 publishes (`FrameEnvironment`, `FrameValues`,
// `FrameLoop`, `frameLoop`).
//
// ⚠️ UF-47 is the entry Vite reads. It publishes nothing (`export {}`) and boots
// against `window` and `document` the moment it is imported, so under vitest's
// node environment (vitest.config.ts) there is no host for it to boot into and
// nothing here imports it. Table T-077's BO-2 -- the order of table T-034,
// which FR-062 and FR-027 state -- is `chooseStartupDocument` (UF-23) and is
// driven by tests/unit/uf-23.test.ts; UF-48 receives the winner as its `first`
// argument, so BO-2 is out of reach from this file.
//
// ⚠️ `requestAnimationFrame` does not exist under node. Every case installs its
// own, so a frame runs when this file says it runs and never otherwise.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  compareDays,
  dayOf,
  textOfDay,
  type CalendarDay,
} from '../../src/entity/document-model/schedule/schedule'
import {
  frameLoop,
  type FrameEnvironment,
} from '../../src/framework/single-html-shell/frame-loop'
import { validateDocument } from '../fixtures/grs-document'

// ---------------------------------------------------------------------------
// The document under test
// ---------------------------------------------------------------------------

// BT-4 of table T-034 -- the template FR-027 keeps exactly one of. It is the
// one document the specification has actually decided the values of, so the
// cases below build on it rather than inventing a second idea of what a
// document looks like (the reason tests/fixtures/grs-document.ts gives for
// holding no sample).
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

/** UUIDs for the two rows the small document draws. */
const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'
/** A `TaskGroup.id` no row carries -- OP-10's "指す行が存在しない". */
const GONE = '99999999-9999-4999-8999-999999999999'

const FIRST_START = '2026-04-01'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Two rows, one Task on each, so what table T-068 draws can be named row by
 * row. Built out of the template, so the calendar (IV-7 / IV-17), the project
 * and the 97 settings are the ones the specification decided; only the rows,
 * the Tasks and whatever the case overrides differ.
 *
 * IV-1 (uids and ids unique), IV-2 (every reference resolves), IV-6 (each Task
 * named by exactly one member), IV-8 (every row has a label), IV-10 (finish is
 * not before start) all hold by construction, and `validateDocument` below
 * keeps the shape honest.
 */
function twoRowDocument(edit: (draft: any) => void = () => {}): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (uid: number, start: string, finish: string, name: string) => ({
    ...structuredClone(template.schedule.tasks[0]),
    uid,
    name,
    start,
    finish,
    milestone: false,
    percentComplete: 0,
    dependencies: [],
    wbsParentUid: null,
    wbsOrder: uid,
  })
  const row = (id: string, parentId: string | null, label: string) => ({
    id,
    parentId,
    label,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: false,
    isHidden: false,
    color: null,
    height: null,
  })
  const draft = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100 },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [task(1, FIRST_START, '2026-04-10', 'One'), task(2, '2026-04-06', '2026-04-20', 'Two')],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, 'Alpha'), row(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: 1, groupId: ALPHA, stackOrder: null },
        { taskUid: 2, groupId: BETA, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    revisionStamp: structuredClone(template.revisionStamp),
    changeLog: [],
  }
  edit(draft)
  return draft as unknown as Document
}

const settingsOf = (document: Document): any => (document as any).documentSettings
const rowsOf = (document: Document): any[] => (document as any).schedule.taskGroups

// ---------------------------------------------------------------------------
// The host UF-48 is given
// ---------------------------------------------------------------------------

/**
 * BO-1 has already settled these by the time a frame loop exists: FR-051 keeps
 * the last two out of the settings because they differ from one machine to the
 * next, and `appHeaderMaxHeight` (S-116) is their cap, not their value.
 */
const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  /** Every SVG the loop has put on the surface, oldest first. */
  readonly drawn: string[]
  readonly surface: { showSvg(svg: string): void }
  /** Run whatever the loop asked an animation frame for, until it asks for no more. */
  runAnimationFrames(): void
  /** How many frames the surface has been given. */
  frames(): number
}

const realRaf = (globalThis as any).requestAnimationFrame

function host(): Host {
  const drawn: string[] = []
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    drawn,
    surface: {
      showSvg: (svg: string) => {
        drawn.push(svg)
      },
    },
    runAnimationFrames: () => {
      // Bounded, so a loop that asks for a frame from inside a frame -- which
      // NFR-010 forbids -- ends the test instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
    frames: () => drawn.length,
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

/** Every vertex the SVG draws, which is where "the drawn shapes" can be measured. */
function drawnPoints(svg: string): { readonly x: number; readonly y: number }[] {
  const points: { x: number; y: number }[] = []
  for (const attribute of svg.matchAll(/points="([^"]+)"/g)) {
    for (const pair of (attribute[1] ?? '').trim().split(/\s+/)) {
      const [x, y] = pair.split(',').map(Number)
      if (x !== undefined && y !== undefined) points.push({ x, y })
    }
  }
  return points
}

const day = (text: string): CalendarDay => {
  const parsed = dayOf(text)
  if (parsed === null) throw new Error(`${text} is not a day`)
  return parsed
}

// ---------------------------------------------------------------------------

describe('the document these cases drive', () => {
  it('is a valid GRS JSON document', () => {
    const report = validateDocument(twoRowDocument())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })
})

describe('UF-48 frameLoop -- BO-5 of table T-077', () => {
  it('puts the first frame up as boot ends, not on the animation frame after it', () => {
    // Table T-078 closes with "⚠️ 最初の 1 枚は 表 T-077 の `BO-5` が起こす" --
    // the first frame belongs to the boot order, not to any of FT-1..FT-5. So
    // it is already on the surface before an animation frame has run.
    const pane = host()
    frameLoop(pane.surface, twoRowDocument(), SCREEN)
    expect(pane.frames()).toBe(1)
  })

  it('runs BO-5 exactly once -- boot does not owe a second frame', () => {
    const pane = host()
    frameLoop(pane.surface, twoRowDocument(), SCREEN)
    pane.runAnimationFrames()
    expect(pane.frames()).toBe(1)
  })

  it('NFR-011: that first frame is whole -- sized to the settled screen and carrying the shapes', () => {
    // NFR-011 (MUST NOT): "空白のまま残る画面も、内容が欠けたまま出る画面も
    // 出さないこと". BO-1 settles the size before BO-5 draws, so the picture is
    // the size the host reported and it already holds what the document draws.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const svg = pane.drawn[0] ?? ''

    expect(svg).toContain(`width="${SCREEN.width}"`)
    expect(svg).toContain(`height="${SCREEN.height}"`)
    expect(drawnPoints(svg).length).toBeGreaterThan(0)

    // BO-1 also settles ScreenRegions (CP-35) before anything is drawn, and
    // the first frame's values are built on that -- not on a 0x0 window.
    const values = loop.current()
    expect(values).not.toBeNull()
    expect(values!.regions.scheduleCanvas.width).toBe(SCREEN.width)
    expect(values!.regions.appHeader.height).toBe(SCREEN.appHeaderHeight)
    expect(values!.layout.placements).toHaveLength(2)
  })
})

describe('OP-10 of table T-024a -- a place the person has not chosen yet', () => {
  it('does not read a null scrollDate as 1970-01-01', () => {
    // S-77: "`null` は「人がまだ場所を決めていない」を表す". OP-10 (MUST):
    // "`FR-055` の全体表示が選ぶ倍率と表示位置にすること". Reading the null as
    // the zero of some day count puts the origin at the epoch and the whole
    // schedule fifty-six years off the right edge.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const origin = loop.current()!.layout.originDay

    expect(origin).not.toBeNull()
    expect(textOfDay(origin!)).not.toBe('1970-01-01')
    // FR-055 fits what is drawn, so the origin cannot be later than the first
    // day drawn either -- that would cut the left edge off.
    expect(compareDays(origin!, day(FIRST_START))).toBeLessThanOrEqual(0)
  })

  it('leaves every drawn shape inside the screen, which is what fitting to it means', () => {
    // FR-055: "縦横の倍率と表示位置を全体が収まる側へ合わせる". The two Tasks
    // span twenty days; at the stored 1x zoom they would not need fitting, so
    // what this measures is that OP-10 chose a place and a zoom at all.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const values = loop.current()!

    for (const point of drawnPoints(pane.drawn[0] ?? '')) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(SCREEN.width)
    }
    for (const placement of values.layout.placements) {
      expect(placement.x).toBeGreaterThanOrEqual(values.regions.rowArea.x)
      expect(placement.x + placement.width).toBeLessThanOrEqual(
        values.regions.rowArea.x + values.regions.rowArea.width,
      )
    }
  })

  it('is a reading rule: the stored place stays null, OP-6 does not fill it in', () => {
    // OP-10: "`null` は「人がまだ場所を決めていない」を表す値であって、欠けて
    // いるのではない（`OP-6` の補完に当たらない）". FR-051 puts the same thing
    // the other way round: "読む側の規則は表 T-024a の `OP-10` が持つ". So the
    // stored settings still say null after the first frame, and every later
    // frame decides again.
    const document = twoRowDocument()
    const pane = host()
    const loop = frameLoop(pane.surface, document, SCREEN)

    expect(settingsOf(loop.document()).scrollDate).toBeNull()
    expect(settingsOf(loop.document()).scrollGroupId).toBeNull()
    expect(settingsOf(loop.document()).zoomX).toBe(settingsOf(document).zoomX)
    expect(settingsOf(loop.document()).zoomY).toBe(settingsOf(document).zoomY)
  })

  it('holds when scrollGroupId names a row that is gone, even though scrollDate holds a day', () => {
    // OP-10 covers two cases in one row: "表示位置が `null`、または指す行が存在
    // しないとき". IV-3 says in as many words that the stored place is NOT kept
    // pointing at a live row, so this state is reachable in a valid document
    // (CD-2 makes it on purpose when a row is deleted).
    const stale = twoRowDocument((draft) => {
      draft.documentSettings.scrollDate = '2026-04-05'
      draft.documentSettings.scrollGroupId = GONE
    })
    expect(validateDocument(stale).valid).toBe(true)

    const pane = host()
    const fitted = frameLoop(pane.surface, twoRowDocument(), SCREEN).current()!
    const loop = frameLoop(pane.surface, stale, SCREEN)
    const values = loop.current()!

    // FR-055's answer, not the stored day: the same place and zoom the null
    // case above was given.
    expect(values.layout.originDay).toEqual(fitted.layout.originDay)
    expect(values.layout.pxPerDay).toBe(fitted.layout.pxPerDay)
  })

  it('does not hold when the stored place is good: that day and that zoom are kept', () => {
    // The other side of OP-10. S-77 and S-78 are what FR-050 saved, and WY-1
    // wants the same JSON to come back looking the same, so a place the person
    // did choose is used as it stands.
    const placed = twoRowDocument((draft) => {
      draft.documentSettings.scrollDate = '2026-04-05'
      draft.documentSettings.scrollGroupId = ALPHA
    })
    const pane = host()
    const values = frameLoop(pane.surface, placed, SCREEN).current()!

    expect(values.layout.originDay).toEqual(day('2026-04-05'))
    // FR-017: one day is `pxPerDayAt1x` times zoomX. Untouched by any fit.
    expect(values.layout.pxPerDay).toBe(
      settingsOf(placed).pxPerDayAt1x * settingsOf(placed).zoomX,
    )
  })
})

describe('HF-8 of table T-051 -- what boot must not do', () => {
  const collapsed = () =>
    twoRowDocument((draft) => {
      draft.schedule.taskGroups[0].isCollapsed = true
    })

  it('keeps the collapse the person saved', () => {
    // HF-8 (MUST NOT): "起動のときは働かせてはならない（MUST NOT。表 T-024a の
    // `OP-10`）". OP-10 gives the reason: "起動のたびに畳みを捨てると、`HR-6`
    // が `WY-1` のために保存させた状態が消える".
    const document = collapsed()
    expect(validateDocument(document).valid).toBe(true)

    const pane = host()
    const loop = frameLoop(pane.surface, document, SCREEN)

    expect(rowsOf(loop.document()).map((r) => r.isCollapsed)).toEqual([true, false])
  })

  it('and draws the picture that collapse means -- the row under it stays undrawn', () => {
    // The half that matters: HF-8 could be honoured in the document and still
    // be applied to the frame. LC-1 of table T-068 drops the collapsed rows
    // first, and HR-1a forbids drawing "畳んだ `TaskGroup` の配下の行と、その行
    // に載っている `Task`".
    const pane = host()
    const withCollapse = frameLoop(pane.surface, collapsed(), SCREEN).current()!
    const withoutCollapse = frameLoop(pane.surface, twoRowDocument(), SCREEN).current()!

    expect(withoutCollapse.layout.rows.map((r) => r.groupId)).toEqual([ALPHA, BETA])
    expect(withCollapse.layout.rows.map((r) => r.groupId)).toEqual([ALPHA])
    expect(withCollapse.layout.placements.map((p) => p.taskUid)).toEqual([1])
  })
})

describe('table T-078 -- the whole of what may wake a frame', () => {
  it('FT-3: a change of size runs exactly one more frame', () => {
    // FT-3: "画面の寸法が変わったこと ... `SingleHtmlShell`（`CP-25`）が自分で
    // 観測する". NFR-010 adds the MUST: "画面の寸法が変わったことは「操作」に
    // 数えること" -- the picture must be rebuilt, or the old size stays on
    // screen.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before + 1)
    expect(pane.drawn[before]).toContain('width="1400"')
    expect(loop.current()!.regions.scheduleCanvas.width).toBe(1400)
  })

  it('FT-2: replacing the current value runs exactly one more frame', () => {
    // FT-2: "現在値の差し替え（表 T-067 の `WS-6`）". LY-5 makes this layer the
    // only holder of a current value, so after WS-6 the loop answers with the
    // new document.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()
    const next = twoRowDocument((draft) => {
      draft.schedule.tasks[1].finish = '2026-05-29'
    })

    loop.replaceDocument(next)
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before + 1)
    expect(loop.document()).toBe(next)
  })

  it('NFR-010: with no trigger, no frame -- reading the current values is not one', () => {
    // NFR-010: "利用者が操作していない間、`GRS` は、画面を描き直さないこと".
    // Table T-078 closes with the MUST NOT that makes it concrete: "本表に無い
    // 契機でフレームを起こしてはならない". `current()` and `document()` are not
    // in the table.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()

    for (let turn = 0; turn < 5; turn += 1) {
      loop.current()
      loop.document()
      pane.runAnimationFrames()
    }

    expect(pane.frames()).toBe(before)
  })

  it('NFR-010: a resize that does not change the size is not FT-3', () => {
    // ⛔ FT-3's trigger is "画面の寸法が変わったこと" -- the change, not the
    // notice of one. When the size is what it already was, no row of table
    // T-078 has fired, and the MUST NOT after the table applies: "本表に無い
    // 契機でフレームを起こしてはならない". NFR-010's RATIONALE is the cost:
    // "電池と発熱に直に効き".
    //
    // ⚠️ The window fires `resize` for things that leave the box alone (a
    // scrollbar coming and going, the on-screen keyboard, devicePixelRatio),
    // and `appHeaderHeight` / `scrollbarThickness` are re-measured each time
    // and usually come back the same. Table T-075 gives UF-48 "フレームを起こす
    // 契機の観測（表 T-078）", and LY-5 makes it the only place holding the
    // previous size, so the comparison has nowhere else to live.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()

    loop.resize({ ...SCREEN })
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before)
  })
})

describe('ADR-001 and table T-071 -- computed once at the head of a frame', () => {
  it('CA-2: the three values are not rebuilt while the frame lasts', () => {
    // CA-2: "無効化の契機 ... **フレームの先頭。** そのフレームのあいだは作り
    // 直さない". MN-6 measured what the other way costs: table T-068's eleven
    // stages four times per pointer move.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)

    const first = loop.current()
    expect(first).not.toBeNull()
    expect(loop.current()).toBe(first)
    expect(loop.current()!.layout).toBe(first!.layout)
    expect(loop.current()!.geometry).toBe(first!.geometry)
    expect(loop.current()!.regions).toBe(first!.regions)
  })

  it('CA-4: all three are rebuilt together, so none of them is left stale', () => {
    // CA-4 (MUST NOT): "1 つだけが古いという状態を作ってはならない". CA-1 names
    // the three: the frame's ScreenRegions, its ScheduleLayout and its
    // ScheduleGeometry.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = loop.current()!

    loop.resize({ ...SCREEN, width: 1400 })
    pane.runAnimationFrames()
    const after = loop.current()!

    expect(after).not.toBe(before)
    // The regions are this frame's...
    expect(after.regions.scheduleCanvas.width).toBe(1400)
    // ...the layout was laid out on THOSE regions...
    expect(after.layout.originX).toBe(after.regions.rowArea.x)
    expect(after.layout.contentWidth).not.toBe(before.layout.contentWidth)
    // ...and the geometry was cut from THAT layout.
    const drawnFirst = after.geometry.tasks.find((t) => t.taskUid === 1)!
    const placedFirst = after.layout.placements.find((p) => p.taskUid === 1)!
    expect(drawnFirst.plan).not.toBeNull()
    const outline = drawnFirst.plan as { form: 'outline'; points: readonly { x: number }[] }
    expect(Math.min(...outline.points.map((p) => p.x))).toBeCloseTo(placedFirst.x, 6)
  })

  it('CA-2: two triggers before the frame head are still one calculation', () => {
    // "フレームの先頭で 1 回計算して配る" (CP-25, ADR-001). Two rows of table
    // T-078 firing between one animation frame and the next owe one frame, not
    // two -- the second would compute the same eleven stages again for the same
    // picture, which is the cost MN-6 says this decision exists to avoid.
    const pane = host()
    const loop = frameLoop(pane.surface, twoRowDocument(), SCREEN)
    const before = pane.frames()

    loop.resize({ ...SCREEN, width: 1400 })
    loop.replaceDocument(twoRowDocument((draft) => {
      draft.schedule.tasks[0].name = 'Renamed'
    }))
    pane.runAnimationFrames()

    expect(pane.frames()).toBe(before + 1)
    expect(pane.drawn[before]).toContain('width="1400"')
  })
})
