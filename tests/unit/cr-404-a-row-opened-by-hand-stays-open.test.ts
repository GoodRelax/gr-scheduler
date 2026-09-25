// see CR-404, CR-570, T-328, T-329, AT-153, FR-018, FR-016, HF-13

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/json-codec'
import { mspdiFromDocument } from '../../src/adapter/document-codec/mspdi-codec'
import {
  commandFromInput,
  rowBandCeilingOf,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { editTaskGroup } from '../../src/use-case/edit-document/edit-task-group'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'
import { validateDocument, validateEntity } from '../fixtures/grs-document'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)
const ROW_TREE_SECTION = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8'),
).split('## 行の木（`rowTree`）')[1] ?? ''

const FR_018_BY_T_329 = '⭐ 行の木の状態（`_assets/fig-erd-detail.md` の `AT-153`、`TaskGroup.treeState`）によって、本要求の対象から外す行を 表 T-329 に従って決めること（MUST）'
const FR_018_ONLY_T_328 = '⭐ 値を書き換える入口と先の値は、段 0 の畳み（`_assets/tbl-settings.md` の 表 T-203 の `S-418`）を含めて、`_assets/tbl-state-machines.md` の 表 T-328 に従うこと（MUST） —— 同表に無い操作で値を書き換えてはならない（MUST NOT）'
const T_329_HOW_TO_READ = '⭐ 行を描くのは、種類が「すべて要る」の行がすべて成り立ち、「どれか 1 つ」の行が 1 つでも成り立つときだけとすること（MUST）'
const FR_016_TALLEST_AMONG_DRAWN = '⭐ いちばん高い行は、調べる倍率で `FR-018` が描く行から選ぶこと（MUST）'
const HF_13_BY_T_328 = '⭐ 押した行と隠した直下の子が取る値は 表 T-328 の `oneLevelOpenPressed` の行に従うこと（MUST）'
const HF_13_OPENABLE_CHILDREN = '⭐ 開ける直下の子は、`FR-018` の 表 T-329 で描かれていない子と、`temporarilyExpanded` の行があるから描かれているだけの子とすること（MUST）'
const HF_13_WEIGHT_AGREES = '⛔ 描いた濃さと、押して起きることを食い違わせてはならない（MUST NOT）'
const HF_3_BY_T_328 = '⭐ 隠すときに行が取る値は `_assets/tbl-state-machines.md` の 表 T-328 の `hidePressed` の行に従うこと（MUST）'
const HF_11_BY_T_328 = '⭐ 畳むときに行が取る値は 表 T-328 の `allBelowFoldPressed` の行に従うこと（MUST）'
const HF_8_BY_T_328 = '人が全体表示（`FR-055`）を求めたとき、行と段 0 の値を `_assets/tbl-state-machines.md` の 表 T-328 の `fitPressed` の行と根の升に従って戻すこと（MUST）'
const UN_14_ONE_PRESS_ONE_STEP = '⭐ 1 回の押下が書き換える行の木の状態は、行がいくつでも同じ 1 段に入れること（MUST）'
const UN_14_LEVEL_ZERO_SAME_STEP = '⭐ 段 0 の畳み（`S-418`）は見せ方の群の鍵だが、同じ押下が書く行の木の状態と同じ段に入れること（MUST）'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const ROW_TITLE_PANEL = bare(rowOf('T-103', 'U-22').by['確定名（英）'] ?? '')
const T_109_ON_THE_PANEL = specTable('T-109').rows.filter((one) =>
  bareAll(one.by['面'] ?? '').includes(ROW_TITLE_PANEL),
)

function entranceFor(rule: string): string {
  const found = T_109_ON_THE_PANEL.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  if (found.length !== 1) throw new Error(`table T-109 gives ${rule} ${found.length} entrances`)
  return found[0]!.id
}

const OPEN_ONE_LEVEL = entranceFor('HF-13')
const OPEN_ALL_BELOW = entranceFor('HF-2')
const HEAD_OPEN_EVERY_ROW = entranceFor('HF-10')
const HIDE = entranceFor('HF-3')
const FOLD_BELOW = entranceFor('HF-11')
const HEAD_FOLD_EVERY_ROW = entranceFor('HF-12')
const HEAD_OPEN_ONE_LEVEL = entranceFor('HF-16')

interface ReasonWords {
  readonly rowId: string
  readonly text: Readonly<Record<'ja' | 'en', string>>
}
const REASON_WORDS: readonly ReasonWords[] = (
  JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as { reasons: ReasonWords[] }
).reasons
const wordsOf = (rowId: string): string => {
  const found = REASON_WORDS.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`no words for ${rowId}`)
  return found.text.ja
}

const numberIn = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}
const S_54 = numberIn(rowOf('T-201', 'S-54').by['既定値'] ?? '')
const S_55 = numberIn(rowOf('T-201', 'S-55').by['既定値'] ?? '')
const S_53 = numberIn(rowOf('T-201', 'S-53').by['既定値'] ?? '')

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, any>

const TREE_STATES = ['auto', 'collapsed', 'expanded', 'temporarilyExpanded', 'hidden'] as const
type TreeState = (typeof TREE_STATES)[number]

const withTreeState = (group: Record<string, any>, treeState: TreeState): Record<string, any> => ({ ...group, treeState })
const TEMPLATE_SETTINGS = { ...TEMPLATE.documentSettings, levelZeroTreeState: 'auto' }

const thresholdOf = (depth: number, settings: Record<string, any> = TEMPLATE_SETTINGS): number =>
  settings.groupLevelOfDetailBase * settings.groupLevelOfDetailRatio ** (depth - 2)

describe('CR-404 / CR-570 -- the manuscript these cases are driven by', () => {
  it.each([
    FR_018_BY_T_329,
    FR_018_ONLY_T_328,
    T_329_HOW_TO_READ,
    FR_016_TALLEST_AMONG_DRAWN,
    HF_13_BY_T_328,
    HF_13_OPENABLE_CHILDREN,
    HF_13_WEIGHT_AGREES,
    HF_3_BY_T_328,
    HF_11_BY_T_328,
    HF_8_BY_T_328,
    UN_14_ONE_PRESS_ONE_STEP,
    UN_14_LEVEL_ZERO_SAME_STEP,
  ])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-328 names the entrances this file presses as the sources of its events', () => {
    const sourceOf = (event: string): string => {
      const line = ROW_TREE_SECTION.split('\n').find((one) => one.startsWith(`| \`rowTree/${event}\` | 入力`))
      if (line === undefined) throw new Error(`table T-328 has no event ${event}`)
      return line
    }
    expect(sourceOf('oneLevelOpenPressed')).toContain('HF-13')
    expect(sourceOf('allBelowOpenPressed')).toContain('HF-2')
    expect(sourceOf('everyRowOpenPressed')).toContain('HF-10')
    expect(sourceOf('hidePressed')).toContain('HF-3')
    expect(sourceOf('allBelowFoldPressed')).toContain('HF-11')
    expect(sourceOf('everyRowFoldPressed')).toContain('HF-12')
    expect(sourceOf('topLevelOpenPressed')).toContain('HF-16')
    expect(sourceOf('fitPressed')).toContain('FR-055')
    expect(sourceOf('rowZoomShrinkPressed')).toContain('SK-16c')
    expect(new Set([OPEN_ONE_LEVEL, OPEN_ALL_BELOW, HEAD_OPEN_EVERY_ROW, HIDE, FOLD_BELOW, HEAD_FOLD_EVERY_ROW, HEAD_OPEN_ONE_LEVEL]).size).toBe(7)
  })

  it('AT-153 is TaskGroup.treeState: five values, not null, default auto; S-418 is levelZeroTreeState', () => {
    const erd = JSON.parse(
      readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'erd.json'), 'utf8'),
    )
    expect(JSON.stringify(erd)).toContain('"seat":153,"name":"treeState"')
    const schema = JSON.parse(
      readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'grs-document.schema.json'), 'utf8'),
    )
    const taskGroup = schema.$defs.TaskGroup
    expect(taskGroup.required).toContain('treeState')
    expect(taskGroup.properties.treeState).toMatchObject({ enum: [...TREE_STATES], default: 'auto' })
    expect(JSON.stringify(schema)).toContain('"levelZeroTreeState"')
  })

  it('the ladder premises: depth 3 at 0.48, depth 4 at 0.72, depth 2 at 0.32 (S-87 / S-88)', () => {
    expect(thresholdOf(2)).toBeCloseTo(0.32, 9)
    expect(thresholdOf(3)).toBeCloseTo(0.48, 9)
    expect(thresholdOf(4)).toBeCloseTo(0.72, 9)
  })
})

const TREE: readonly { readonly id: string; readonly parentId: string | null }[] = [
  { id: 'aaaaaaaa-0000-4000-8000-000000000001', parentId: null },
  { id: 'aaaaaaaa-0000-4000-8000-000000000002', parentId: 'aaaaaaaa-0000-4000-8000-000000000001' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000003', parentId: 'aaaaaaaa-0000-4000-8000-000000000002' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000004', parentId: 'aaaaaaaa-0000-4000-8000-000000000003' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000005', parentId: 'aaaaaaaa-0000-4000-8000-000000000004' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000006', parentId: 'aaaaaaaa-0000-4000-8000-000000000003' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000007', parentId: 'aaaaaaaa-0000-4000-8000-000000000002' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000008', parentId: 'aaaaaaaa-0000-4000-8000-000000000007' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000009', parentId: 'aaaaaaaa-0000-4000-8000-000000000001' },
  { id: 'aaaaaaaa-0000-4000-8000-00000000000a', parentId: 'aaaaaaaa-0000-4000-8000-000000000009' },
  { id: 'aaaaaaaa-0000-4000-8000-00000000000b', parentId: null },
  { id: 'aaaaaaaa-0000-4000-8000-00000000000c', parentId: 'aaaaaaaa-0000-4000-8000-00000000000b' },
]
const [A, B, R, C1, G1, C2, S, S1, B2, B2a, Z, Z1] = TREE.map((one) => one.id) as [
  string, string, string, string, string, string, string, string, string, string, string, string,
]
const NAMES: Record<string, string> = { [A]: 'A', [B]: 'B', [R]: 'R', [C1]: 'C1', [G1]: 'G1', [C2]: 'C2', [S]: 'S', [S1]: 'S1', [B2]: 'B2', [B2a]: 'B2a', [Z]: 'Z', [Z1]: 'Z1' }
const named = (ids: readonly string[]): string[] => ids.map((id) => NAMES[id] ?? id)
const ALL = TREE.map((one) => one.id)
const subtreeOf = (id: string): string[] => [id, ...TREE.filter((one) => one.parentId === id).flatMap((one) => subtreeOf(one.id))]

interface Fixture {
  readonly zoomY: number
  readonly folded?: readonly string[]
  readonly hidden?: readonly string[]
  readonly expanded?: readonly string[]
  readonly temporarily?: readonly string[]
  readonly levelZero?: 'auto' | 'collapsed'
}

const stateIn = (part: Fixture, id: string): TreeState => {
  if ((part.hidden ?? []).includes(id)) return 'hidden'
  if ((part.folded ?? []).includes(id)) return 'collapsed'
  if ((part.expanded ?? []).includes(id)) return 'expanded'
  if ((part.temporarily ?? []).includes(id)) return 'temporarilyExpanded'
  return 'auto'
}

function smallDocument(part: Fixture): Record<string, any> {
  const task = (uid: number) => ({
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name: `Task${uid}`,
    start: '2026-04-01T08:00:00',
    finish: '2026-04-10T17:00:00',
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  })
  return {
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      project: { ...structuredClone(TEMPLATE.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: TREE.map((_one, index) => task(index + 1)),
      resources: [],
      assignments: [],
      taskGroups: TREE.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: NAMES[one.id],
        derivedFromTaskUid: null,
        order: index,
        treeState: stateIn(part, one.id),
        editGroup: null,
        color: null,
        height: null,
      })),
      taskGroupMembers: TREE.map((one, index) => ({ taskUid: index + 1, groupId: one.id, stackOrder: null })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE_SETTINGS),
      scrollDate: '2026-04-01',
      scrollGroupId: A,
      zoomY: part.zoomY,
      levelZeroTreeState: part.levelZero ?? 'auto',
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }
}

const SCREEN = { width: 1400, height: 800, appHeaderHeight: 56, scrollbarThickness: 8 }
const realRaf = (globalThis as any).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODS = { ctrl: false, shift: false, alt: false, meta: false }
const pointer = (phase: 'down' | 'up') => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: 80,
  y: 120,
  modifiers: { ...NO_MODS },
  clickCount: 1,
})
const key = (k: string, mods: Partial<typeof NO_MODS> = {}) => ({ kind: 'key', key: k, modifiers: { ...NO_MODS, ...mods } })

interface Stage {
  readonly loop: any
  press(entry: string, groupId: string | null): void
  key(k: string, mods?: Partial<typeof NO_MODS>): void
  undo(): void
  drawn(): string[]
  notices(): string[]
  title(groupId: string): any
  groups(): any[]
  stateOf(groupId: string): unknown
  states(): Record<string, unknown>
  withState(treeState: TreeState): string[]
  levelZero(): unknown
  zoomY(): number
}

const statesOf = (groups: readonly any[]): Record<string, unknown> =>
  Object.fromEntries(groups.map((one) => [NAMES[one.id] ?? one.id, one.treeState]))

function stage(document: Record<string, any>): Stage {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  const run = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const views: any[] = []
  let part: any = null
  const surface = {
    showScreenView: (view: any) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  const loop: any = frameLoop({ showSvg: () => undefined } as any, document as any, SCREEN, {
    surface: surface as any,
    language: 'ja',
  })
  run()
  const send = (input: any): void => {
    loop.receiveInput(input)
    run()
  }
  const last = (): any => {
    const view = views[views.length - 1]
    if (view === undefined) throw new Error('the surface was given no description')
    return view
  }
  const groups = (): any[] => loop.document().schedule.taskGroups
  return {
    loop,
    press: (entry, groupId) => {
      part = {
        part: ROW_TITLE_PANEL,
        entry,
        format: null,
        rowGroupId: groupId,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      }
      send(pointer('down'))
      send(pointer('up'))
    },
    key: (k, mods = {}) => send(key(k, mods)),
    undo: () => send(key('Z', { ctrl: true })),
    drawn: () => (loop.current()?.layout.rows ?? []).map((one: any) => one.groupId),
    notices: () => last().notices.map((one: any) => one.text),
    title: (groupId) => {
      const panel = last().rowTitlePanel
      const found = [...panel.pinnedTitles, ...panel.titles].find((one: any) => one.groupId === groupId)
      if (found === undefined) throw new Error(`the panel drew no title for ${NAMES[groupId] ?? groupId}`)
      return found
    },
    groups,
    stateOf: (groupId) => groups().find((one) => one.id === groupId)?.treeState,
    states: () => statesOf(groups()),
    withState: (treeState) => groups().filter((one) => one.treeState === treeState).map((one) => one.id),
    levelZero: () => loop.document().documentSettings.levelZeroTreeState,
    zoomY: () => loop.document().documentSettings.zoomY,
  }
}

const stateAmong = (groups: readonly any[], id: string): unknown => groups.find((one) => one.id === id)?.treeState

function layoutOf(doc: Record<string, any>, env = SCREEN): string[] {
  const regions = regionsFromScreen(env as any, doc.documentSettings)
  return layoutFromSchedule(doc.schedule, doc.documentSettings, regions).rows.map((one) => one.groupId)
}

describe('CR-404 -- premises of the fixture', () => {
  it('the small fixture is a valid GRS JSON document under the schema in docs/spec', () => {
    const report = validateDocument(smallDocument({ zoomY: 1, expanded: [R], temporarily: [Z], folded: [B2], hidden: [S1] }))
    expect(report.errors).toEqual([])
  })

  it('with every row auto, the depth rule of FR-018 alone decides what is drawn (0.6: depth <= 3)', () => {
    const layout = layoutOf(smallDocument({ zoomY: 0.6 }))
    expect(named(layout)).toEqual(named([A, B, R, S, B2, B2a, Z, Z1]))
  })
})

describe('FR-018 table T-329 -- an expanded row, its ancestors and its direct children are drawn', () => {
  it('TD-6 / TD-7: between the depth-3 and depth-4 thresholds, R expanded draws C1 and C2 but not the grandchild G1', () => {
    const zoomY = 0.6
    expect(zoomY).toBeLessThan(thresholdOf(4))
    expect(zoomY).toBeGreaterThanOrEqual(thresholdOf(3))
    const drawn = layoutOf(smallDocument({ zoomY, expanded: [R] }))
    expect(named(drawn)).toContain('C1')
    expect(named(drawn)).toContain('C2')
    expect(named(drawn)).not.toContain('G1')
    expect(named(drawn)).not.toContain('S1')
  })

  it('TD-7: below the depth-2 threshold, R, its ancestors A and B, and C1 / C2 are drawn; auto branches fall', () => {
    const zoomY = 0.25
    expect(zoomY).toBeLessThan(thresholdOf(2))
    const drawn = named(layoutOf(smallDocument({ zoomY, expanded: [R] })))
    for (const one of ['A', 'B', 'R', 'C1', 'C2']) expect(drawn, one).toContain(one)
    for (const one of ['G1', 'S', 'S1', 'B2', 'B2a', 'Z1']) expect(drawn, one).not.toContain(one)
    expect(drawn).toContain('Z')
  })

  it('TD-6: expanded and temporarilyExpanded draw the same rows at every zoom', () => {
    for (const zoomY of [1.2, 0.8, 0.6, 0.4, 0.25, S_54]) {
      for (const id of [R, C1, B2, Z]) {
        const expanded = layoutOf(smallDocument({ zoomY, expanded: [id] }))
        const temporarily = layoutOf(smallDocument({ zoomY, temporarily: [id] }))
        expect(named(temporarily), `${NAMES[id]} at ${zoomY}`).toEqual(named(expanded))
      }
    }
  })

  it('TD-1 .. TD-3 beat TD-5 .. TD-7: an ancestor fold, a hidden ancestor and a folded level zero win', () => {
    const zoomY = 0.8
    const underFold = named(layoutOf(smallDocument({ zoomY, expanded: [R], folded: [B] })))
    expect(underFold).not.toContain('R')
    expect(underFold).not.toContain('C1')
    const underHidden = named(layoutOf(smallDocument({ zoomY, expanded: [C1], hidden: [R] })))
    expect(underHidden).not.toContain('R')
    expect(underHidden).not.toContain('C1')
    expect(underHidden).not.toContain('G1')
    const rFolded = named(layoutOf(smallDocument({ zoomY, expanded: [C1], folded: [R] })))
    expect(rFolded).not.toContain('C1')
    expect(rFolded).not.toContain('G1')
    expect(layoutOf(smallDocument({ zoomY, expanded: [R], levelZero: 'collapsed' }))).toEqual([])
  })

  it('with the values fixed, lowering zoomY never draws more rows (monotonic)', () => {
    const zooms = [4, 2.2, 2, 1.2, 1.1, 0.8, 0.59, 0.4, 0.31, 0.1, S_54]
    for (const fixture of [
      { expanded: [R] },
      { expanded: [C1] },
      { expanded: [B2, R] },
      { expanded: [Z] },
      { temporarily: [R, C1] },
      { temporarily: [B2], expanded: [C1] },
    ]) {
      let before = Number.POSITIVE_INFINITY
      for (const zoomY of zooms) {
        const count = layoutOf(smallDocument({ zoomY, ...fixture })).length
        expect(count, `${JSON.stringify(fixture)} at ${zoomY}`).toBeLessThanOrEqual(before)
        before = count
      }
    }
  })

  it('TD-6 (distinguishing half): an expanded C1 draws its child G1 at 0.25, which no depth rule does', () => {
    const drawn = named(layoutOf(smallDocument({ zoomY: 0.25, expanded: [C1] })))
    for (const one of ['A', 'B', 'R', 'C1', 'G1']) expect(drawn, one).toContain(one)
    expect(drawn).not.toContain('C2')
  })

  it('FR-055 lower bound: at zoomMin (S-54) the rows the expanded row draws are still drawn', () => {
    const drawn = named(layoutOf(smallDocument({ zoomY: S_54, expanded: [R] })))
    for (const one of ['A', 'B', 'R', 'C1', 'C2']) expect(drawn, one).toContain(one)
    expect(drawn).not.toContain('B2')
  })
})

describe("the user's failure (JDG-145) -- the startup template, zoomed down, [v] on a depth-3 row", () => {
  const byId = new Map<string, any>(TEMPLATE.schedule.taskGroups.map((one: any) => [one.id, one]))
  const depthOf = (one: any): number => (one.parentId === null ? 1 : 1 + depthOf(byId.get(one.parentId)))
  const childrenOf = (id: string): any[] => TEMPLATE.schedule.taskGroups.filter((one: any) => one.parentId === id)
  const target = TEMPLATE.schedule.taskGroups.find(
    (one: any) => depthOf(one) === 3 && childrenOf(one.id).some((kid: any) => childrenOf(kid.id).length > 0),
  )
  const ancestorsOf = (id: string): string[] => {
    const row = byId.get(id)
    return row.parentId === null ? [] : [row.parentId, ...ancestorsOf(row.parentId)]
  }

  function templateDocument(): Record<string, any> {
    const doc = structuredClone(TEMPLATE)
    doc.schedule.taskGroups = doc.schedule.taskGroups.map((one: any) => withTreeState(one, 'auto'))
    doc.documentSettings = { ...TEMPLATE_SETTINGS, scrollDate: '2026-01-05', scrollGroupId: target.id }
    return doc
  }

  it('the template holds a depth-3 row whose child has children (premise)', () => {
    expect(target).toBeDefined()
  })

  it('[v] draws the children, answers no RS-30, saves expanded through JSON, keeps them while zooming down, and [^^] gives the depth rule back', () => {
    const built = stage(templateDocument())
    for (let step = 0; step < 60 && built.zoomY() >= thresholdOf(4); step++) built.key('-', { alt: true })
    const kids = childrenOf(target.id).map((one: any) => one.id)
    const grandKids = kids.flatMap((id: string) => childrenOf(id).map((one: any) => one.id))
    expect(built.zoomY(), 'premise: below the depth-4 threshold').toBeLessThan(thresholdOf(4))
    expect(built.zoomY(), 'premise: the depth-3 row itself is drawn').toBeGreaterThanOrEqual(thresholdOf(3))
    expect(built.drawn(), 'premise: the depth-3 row is drawn').toContain(target.id)
    for (const kid of kids) expect(built.drawn(), 'premise: its children vanished').not.toContain(kid)
    expect(built.title(target.id).canOpenOneLevel, HF_13_OPENABLE_CHILDREN).toBe(true)

    built.press(OPEN_ONE_LEVEL, target.id)
    expect(built.notices(), HF_13_WEIGHT_AGREES).not.toContain(wordsOf('RS-30'))
    expect(built.notices()).toEqual([])
    for (const kid of kids) expect(built.drawn(), 'TD-6: the children are drawn').toContain(kid)
    for (const grand of grandKids) expect(built.drawn(), 'grandchildren stay under zoom').not.toContain(grand)
    expect(built.stateOf(target.id), HF_13_BY_T_328).toBe('expanded')
    expect(built.title(target.id).canOpenOneLevel, 'HF-13: nothing is left to open, so [v] is thin').toBe(false)

    const decoded = documentFromJson(jsonFromDocument(built.loop.document()))
    expect(decoded.ok, 'the saved document reads back').toBe(true)
    if (decoded.ok) expect(stateAmong((decoded.document.schedule as any).taskGroups, target.id)).toBe('expanded')

    for (let step = 0; step < 60 && built.zoomY() >= thresholdOf(2); step++) built.key('-', { alt: true })
    expect(built.zoomY(), 'premise: under the depth-2 threshold').toBeLessThan(thresholdOf(2))
    expect(built.stateOf(target.id), 'T-328: a row-zoom shrink leaves expanded alone').toBe('expanded')
    for (const id of [target.id, ...ancestorsOf(target.id), ...kids]) {
      expect(built.drawn(), `TD-6 / TD-7 keep ${byId.get(id).label}`).toContain(id)
    }

    built.press(FOLD_BELOW, target.id)
    expect(built.stateOf(target.id), HF_11_BY_T_328).toBe('collapsed')
    expect(built.drawn(), 'the depth rule drops the depth-3 row again').not.toContain(target.id)
    for (const kid of kids) expect(built.drawn()).not.toContain(kid)

    built.undo()
    expect(built.stateOf(target.id)).toBe('expanded')
    for (const kid of kids) expect(built.stateOf(kid)).toBe('auto')
    for (const kid of kids) expect(built.drawn()).toContain(kid)
  })

  it('[^] (HF-3) on the expanded row makes it hidden', () => {
    const built = stage(templateDocument())
    for (let step = 0; step < 60 && built.zoomY() >= thresholdOf(4); step++) built.key('-', { alt: true })
    built.press(OPEN_ONE_LEVEL, target.id)
    expect(built.stateOf(target.id)).toBe('expanded')
    built.press(HIDE, target.id)
    expect(built.stateOf(target.id), HF_3_BY_T_328).toBe('hidden')
  })
})

describe('HF-13 -- [v] is drawn armed exactly when pressing it does something', () => {
  it('a row whose children fell to zoom is armed; the press writes expanded in one step, draws them, and Ctrl+Z undoes it', () => {
    const built = stage(smallDocument({ zoomY: 0.6 }))
    expect(built.drawn()).not.toContain(C1)
    expect(built.title(R).canOpenOneLevel).toBe(true)
    built.press(OPEN_ONE_LEVEL, R)
    expect(built.notices()).toEqual([])
    expect(named(built.drawn())).toEqual(expect.arrayContaining(['C1', 'C2']))
    expect(built.withState('expanded')).toEqual([R])
    built.undo()
    expect(built.withState('expanded'), UN_14_ONE_PRESS_ONE_STEP).toEqual([])
    expect(built.drawn()).not.toContain(C1)
  })

  it(`${HF_13_OPENABLE_CHILDREN} -- children drawn only because R is temporarilyExpanded are openable, and the press keeps them through a shrink`, () => {
    const built = stage(smallDocument({ zoomY: 0.6, temporarily: [R] }))
    expect(named(built.drawn()), 'premise: TD-6 draws C1 and C2').toEqual(expect.arrayContaining(['C1', 'C2']))
    expect(built.title(R).canOpenOneLevel).toBe(true)
    built.press(OPEN_ONE_LEVEL, R)
    expect(built.notices()).toEqual([])
    expect(built.stateOf(R)).toBe('expanded')
    built.key('-', { alt: true })
    expect(built.stateOf(R)).toBe('expanded')
    expect(named(built.drawn())).toEqual(expect.arrayContaining(['C1', 'C2']))

    const control = stage(smallDocument({ zoomY: 0.6, temporarily: [R] }))
    control.key('-', { alt: true })
    expect(control.stateOf(R), 'control: the shrink returns temporarilyExpanded to auto').toBe('auto')
    expect(control.drawn()).not.toContain(C1)
  })

  it('all direct children drawn by the depth rule and none hidden -> thin, RS-30, no write', () => {
    const built = stage(smallDocument({ zoomY: 1.2 }))
    expect(built.drawn()).toEqual(expect.arrayContaining([C1, C2]))
    expect(built.title(R).canOpenOneLevel).toBe(false)
    const before = JSON.stringify(built.groups())
    built.press(OPEN_ONE_LEVEL, R)
    expect(built.notices()).toEqual([wordsOf('RS-30')])
    expect(JSON.stringify(built.groups())).toBe(before)
    expect(built.stateOf(R)).toBe('auto')
  })

  it(`${HF_13_WEIGHT_AGREES} -- swept: every drawn title arms [v] exactly when its press writes, and a spent press answers RS-30`, () => {
    const disagree: string[] = []
    for (const fixture of [
      { zoomY: 1.2 },
      { zoomY: 0.8 },
      { zoomY: 0.4 },
      { zoomY: 0.25, expanded: [R] },
      { zoomY: 0.8, folded: [B2] },
      { zoomY: 0.8, hidden: [C1] },
      { zoomY: 0.6, temporarily: [R] },
      { zoomY: 0.6, temporarily: [B] },
      { zoomY: 0.6, temporarily: [C1] },
    ] as Fixture[]) {
      const probe = stage(smallDocument(fixture))
      for (const id of probe.drawn()) {
        const armed = probe.title(id).canOpenOneLevel === true
        const built = stage(smallDocument(fixture))
        const before = JSON.stringify(built.groups())
        built.press(OPEN_ONE_LEVEL, id)
        const acted = JSON.stringify(built.groups()) !== before
        const told = built.notices().includes(wordsOf('RS-30'))
        if (armed !== acted || acted === told) {
          disagree.push(`${JSON.stringify(fixture)} ${NAMES[id]}: armed=${armed} acted=${acted} RS-30=${told}`)
        }
      }
    }
    expect(disagree, HF_13_WEIGHT_AGREES).toEqual([])
  })
})

describe('HF-13 / UN-14 -- [v] writes every value of the press in one step', () => {
  it('a folded R becomes expanded after one press; one Ctrl+Z gives collapsed back', () => {
    const built = stage(smallDocument({ zoomY: 1.2, folded: [R] }))
    built.press(OPEN_ONE_LEVEL, R)
    expect(built.stateOf(R)).toBe('expanded')
    built.undo()
    expect(built.stateOf(R)).toBe('collapsed')
  })

  it(`${HF_13_BY_T_328} -- a hidden direct child becomes collapsed with the pressed row expanded, and one Ctrl+Z restores both`, () => {
    const built = stage(smallDocument({ zoomY: 1.2, hidden: [C1] }))
    const before = built.states()
    built.press(OPEN_ONE_LEVEL, R)
    expect(built.stateOf(R)).toBe('expanded')
    expect(built.stateOf(C1)).toBe('collapsed')
    expect(built.stateOf(C2), 'a child that was not hidden is not written').toBe('auto')
    built.undo()
    expect(built.states(), UN_14_ONE_PRESS_ONE_STEP).toEqual(before)
  })
})

describe('HF-2 / HF-10 -- [vv] gives temporarilyExpanded and leaves expanded alone', () => {
  it('HF-2 on a folded R: R and the non-leaf rows below become temporarilyExpanded, leaves under it auto, expanded stays, rows elsewhere untouched', () => {
    const fixture: Fixture = { zoomY: 1.2, folded: [R, S], expanded: [A, C1], hidden: [G1] }
    const built = stage(smallDocument(fixture))
    const before = built.states()
    built.press(OPEN_ALL_BELOW, R)
    expect(built.notices()).toEqual([])
    expect(built.states()).toEqual({
      ...before,
      R: 'temporarilyExpanded',
      C1: 'expanded',
      G1: 'auto',
      C2: 'auto',
    })
    expect(built.stateOf(S), 'a folded row outside the subtree stays').toBe('collapsed')
    built.undo()
    expect(built.states(), UN_14_ONE_PRESS_ONE_STEP).toEqual(before)
  })

  it('HF-10 at the head: every non-leaf row but expanded / temporarilyExpanded becomes temporarilyExpanded, folded and hidden leaves become auto', () => {
    const built = stage(smallDocument({ zoomY: 1.2, folded: [B2, Z1], expanded: [R], temporarily: [C1], hidden: [G1] }))
    const before = built.states()
    built.press(HEAD_OPEN_EVERY_ROW, null)
    expect(built.notices()).toEqual([])
    expect(built.states()).toEqual({
      A: 'temporarilyExpanded',
      B: 'temporarilyExpanded',
      R: 'expanded',
      C1: 'temporarilyExpanded',
      G1: 'auto',
      C2: 'auto',
      S: 'temporarilyExpanded',
      S1: 'auto',
      B2: 'temporarilyExpanded',
      B2a: 'auto',
      Z: 'temporarilyExpanded',
      Z1: 'auto',
    })
    built.undo()
    expect(built.states(), UN_14_ONE_PRESS_ONE_STEP).toEqual(before)
  })

  it(`${UN_14_LEVEL_ZERO_SAME_STEP} -- head [vv] opens a folded level zero with the rows, and one Ctrl+Z folds it again`, () => {
    const built = stage(smallDocument({ zoomY: 1.2, folded: [A, Z], levelZero: 'collapsed' }))
    expect(built.drawn(), 'premise: TD-1 draws nothing').toEqual([])
    const before = built.states()
    built.press(HEAD_OPEN_EVERY_ROW, null)
    expect(built.levelZero()).toBe('auto')
    expect(built.stateOf(A)).toBe('temporarilyExpanded')
    expect(built.drawn()).toHaveLength(ALL.length)
    built.undo()
    expect(built.levelZero()).toBe('collapsed')
    expect(built.states()).toEqual(before)
  })

  it('after head [vv], the first row-zoom shrink returns every temporarilyExpanded row to auto, and expanded stays', () => {
    const built = stage(smallDocument({ zoomY: 1.2, folded: [B2], expanded: [R] }))
    built.press(HEAD_OPEN_EVERY_ROW, null)
    expect(built.withState('temporarilyExpanded').length, 'premise').toBeGreaterThan(0)
    built.key('-', { alt: true })
    expect(built.withState('temporarilyExpanded')).toEqual([])
    expect(built.withState('expanded')).toEqual([R])
    for (let step = 0, was = Number.NaN; step < 200 && built.zoomY() > S_54 && built.zoomY() !== was; step++) {
      was = built.zoomY()
      built.key('-', { alt: true })
    }
    expect(built.drawn().length).toBeLessThan(ALL.length)
    expect(named(built.drawn())).toEqual(expect.arrayContaining(['C1', 'C2']))
  })
})

describe('HF-3 / HF-11 / HF-12 -- [^], [^^] and head [^^] fold what is below', () => {
  const OPENED: Fixture = { zoomY: 0.25, expanded: [A, B, R, Z], temporarily: [C1], hidden: [S1] }

  it(`${HF_3_BY_T_328} -- [^] on R: R hidden, every row below collapsed, the ancestors keep theirs`, () => {
    const built = stage(smallDocument(OPENED))
    built.press(HIDE, R)
    expect(built.states()).toMatchObject({ A: 'expanded', B: 'expanded', R: 'hidden', C1: 'collapsed', G1: 'collapsed', C2: 'collapsed', Z: 'expanded', S1: 'hidden' })
  })

  it(`${HF_11_BY_T_328} -- [^^] on R: R and every row below collapsed, the ancestors keep theirs`, () => {
    const built = stage(smallDocument(OPENED))
    built.press(FOLD_BELOW, R)
    expect(built.states()).toMatchObject({ A: 'expanded', B: 'expanded', R: 'collapsed', C1: 'collapsed', G1: 'collapsed', C2: 'collapsed', Z: 'expanded' })
  })

  it.each([
    ['[^]', HIDE, 'hidden'],
    ['[^^]', FOLD_BELOW, 'collapsed'],
  ])('%s on the ancestor A folds everything under it, keeps a hidden row hidden, and leaves Z', (_name, entry, pressed) => {
    const built = stage(smallDocument(OPENED))
    built.press(entry, A)
    const states = built.states()
    expect(states['A']).toBe(pressed)
    for (const id of subtreeOf(A).slice(1)) {
      expect(states[NAMES[id]!], NAMES[id]).toBe(id === S1 ? 'hidden' : 'collapsed')
    }
    expect(states['Z']).toBe('expanded')
    expect(states['Z1']).toBe('auto')
  })

  it('[^^] on a descendant C1 leaves R expanded', () => {
    const built = stage(smallDocument({ zoomY: 0.25, expanded: [R, C1] }))
    built.press(FOLD_BELOW, C1)
    expect(built.stateOf(R)).toBe('expanded')
    expect(built.stateOf(C1)).toBe('collapsed')
    expect(built.stateOf(G1)).toBe('collapsed')
  })

  it(`${UN_14_LEVEL_ZERO_SAME_STEP} -- head [^^] folds every row but collapsed / hidden and level zero in one step`, () => {
    const built = stage(smallDocument(OPENED))
    const before = built.states()
    built.press(HEAD_FOLD_EVERY_ROW, null)
    expect(built.levelZero()).toBe('collapsed')
    for (const [name, value] of Object.entries(built.states())) {
      expect(value, name).toBe(name === 'S1' ? 'hidden' : 'collapsed')
    }
    expect(built.drawn()).toEqual([])
    built.undo()
    expect(built.levelZero(), 'one undo brings the rows back, not a folded level zero').toBe('auto')
    expect(built.states()).toEqual(before)
    expect(built.drawn().length).toBeGreaterThan(0)
  })
})

describe('HF-8 / FR-031 / UN-17 -- fit returns every value but hidden to auto in its second write', () => {
  function contextOf(doc: Record<string, any>): any {
    const regions = regionsFromScreen(SCREEN as any, doc.documentSettings)
    const layout = layoutFromSchedule(doc.schedule, doc.documentSettings, regions)
    return {
      document: doc,
      layout,
      geometry: geometryFromLayout(doc.schedule, doc.documentSettings, layout, regions, emptySelection()),
      regions,
      screen: emptyScreenSession.screen,
      selection: emptySelection(),
      zoomStep: S_53,
      zoomMin: S_54,
      zoomMax: S_55,
      pressed: null,
      isTextEntryUnsettled: false,
      isSurfaceStanding: false,
      dualCursorFollowing: null,
      today: '2026-03-01T00:00:00',
      newGroupId: 'row-minted-outside',
      newCommentBoxId: 'comment-box-minted-outside',
      newHighlightBoxId: 'highlight-box-minted-outside',
    }
  }

  it('F stays two writes: the zoom first, then CM-72 (and CM-86 when level zero is folded)', () => {
    for (const levelZero of ['auto', 'collapsed'] as const) {
      const doc = smallDocument({ zoomY: 0.8, expanded: [R], folded: [B2], levelZero })
      const action = commandFromInput(key('F') as any, contextOf(doc)).action as any
      expect(action?.kind).toBe('changeDocument')
      expect(action.writes).toHaveLength(2)
      expect(action.writes[0].map((one: any) => one.kind)).toEqual(['fitScheduleToScreen'])
      const second: any[] = action.writes[1]
      expect(second.map((one) => one.kind)).toContain('resetTaskGroupTreeStates')
      for (const one of second) expect(['resetTaskGroupTreeStates', 'setLevelZeroTreeState']).toContain(one.kind)
      if (levelZero === 'collapsed') {
        expect(second.find((one) => one.kind === 'setLevelZeroTreeState')?.levelZeroTreeState).toBe('auto')
      }
    }
  })

  it(`${HF_8_BY_T_328} -- after F every value but hidden is auto; one Ctrl+Z restores them while the zoom stays new`, () => {
    const built = stage(smallDocument({ zoomY: 0.8, expanded: [R], folded: [B2], temporarily: [Z], hidden: [S1] }))
    const before = built.states()
    built.key('F')
    for (const [name, value] of Object.entries(built.states())) {
      expect(value, name).toBe(name === 'S1' ? 'hidden' : 'auto')
    }
    const fittedZoomY = built.zoomY()
    built.undo()
    expect(built.states(), 'UN-17: the values come back in the same step').toEqual(before)
    expect(built.zoomY(), 'UN-8: the zoom stays new').toBe(fittedZoomY)
  })

  it('F opens a folded level zero; one Ctrl+Z folds it again with the rows while the zoom stays new', () => {
    const built = stage(smallDocument({ zoomY: 0.8, folded: [A], levelZero: 'collapsed' }))
    built.key('F')
    expect(built.levelZero()).toBe('auto')
    expect(built.stateOf(A)).toBe('auto')
    expect(built.drawn().length).toBeGreaterThan(0)
    const fittedZoomY = built.zoomY()
    built.undo()
    expect(built.levelZero()).toBe('collapsed')
    expect(built.stateOf(A)).toBe('collapsed')
    expect(built.zoomY()).toBe(fittedZoomY)
  })

  it('CM-72 resetTaskGroupTreeStates, applied on its own, returns every row but hidden to auto', () => {
    const doc = smallDocument({ zoomY: 0.8, expanded: [R, Z], folded: [B2], temporarily: [C1], hidden: [S1] })
    const result = editTaskGroup(doc as any, { kind: 'resetTaskGroupTreeStates' } as any, 'Row')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const states = statesOf((result.document.schedule as any).taskGroups)
    for (const [name, value] of Object.entries(states)) expect(value, name).toBe(name === 'S1' ? 'hidden' : 'auto')
  })

  it('CM-85 setTaskGroupTreeState, applied on its own, writes one row and nothing else', () => {
    const doc = smallDocument({ zoomY: 0.8 })
    const on = editTaskGroup(doc as any, { kind: 'setTaskGroupTreeState', taskGroupId: R, treeState: 'expanded' } as any, 'Row')
    expect(on?.ok, 'CM-85 is answered by the task group command module').toBe(true)
    if (!on?.ok) return
    const groups = (on.document.schedule as any).taskGroups
    expect(groups.filter((one: any) => one.treeState !== 'auto').map((one: any) => one.id)).toEqual([R])
    const off = editTaskGroup(on.document, { kind: 'setTaskGroupTreeState', taskGroupId: R, treeState: 'auto' } as any, 'Row')
    expect(off.ok).toBe(true)
    if (off.ok) expect(stateAmong((off.document.schedule as any).taskGroups, R)).toBe('auto')
  })
})

describe('HF-16 -- head [v] opens level zero and writes neither expanded nor temporarilyExpanded', () => {
  it('head [^^] then head [v] brings the shallowest level back and leaves every row collapsed or auto', () => {
    const built = stage(smallDocument({ zoomY: 1.2 }))
    built.press(HEAD_FOLD_EVERY_ROW, null)
    built.press(HEAD_OPEN_ONE_LEVEL, null)
    expect(built.levelZero()).toBe('auto')
    expect(built.drawn()).toEqual(expect.arrayContaining([A, Z]))
    expect(built.withState('expanded')).toEqual([])
    expect(built.withState('temporarilyExpanded')).toEqual([])
  })

  it('head [v] turns a hidden top-level row into collapsed (T-328 topLevelOpenPressed)', () => {
    const built = stage(smallDocument({ zoomY: 1.2, hidden: [Z], levelZero: 'collapsed' }))
    built.press(HEAD_OPEN_ONE_LEVEL, null)
    expect(built.levelZero()).toBe('auto')
    expect(built.stateOf(Z)).toBe('collapsed')
    expect(built.drawn()).toContain(Z)
  })
})

describe('FR-029 -- a thin press writes nothing', () => {
  it('HF-2: [vv] over rows dropped by zoom only is armed now (T-329) and draws them', () => {
    const built = stage(smallDocument({ zoomY: 0.8 }))
    expect(built.drawn(), 'premise: G1 fell to zoom').not.toContain(G1)
    built.press(OPEN_ALL_BELOW, R)
    expect(built.notices()).toEqual([])
    expect(built.drawn()).toContain(G1)
    expect(built.stateOf(R)).toBe('temporarilyExpanded')
  })

  it('HF-2: [vv] whose descendants are all drawn is thin, answers RS-28 and writes nothing', () => {
    const built = stage(smallDocument({ zoomY: 1.2 }))
    const before = JSON.stringify(built.groups())
    built.press(OPEN_ALL_BELOW, R)
    expect(built.notices()).toEqual([wordsOf('RS-28')])
    expect(JSON.stringify(built.groups())).toBe(before)
  })

  it('HF-13: a thin [v] on a leaf writes nothing', () => {
    const built = stage(smallDocument({ zoomY: 1.2 }))
    built.press(OPEN_ONE_LEVEL, C2)
    expect(built.notices()).toEqual([wordsOf('RS-30')])
    expect(built.withState('expanded')).toEqual([])
    expect(built.stateOf(C2)).toBe('auto')
  })
})

describe(`FR-018 -- ${FR_018_ONLY_T_328}`, () => {
  it('a row-zoom shrink returns temporarilyExpanded to auto and leaves expanded; one Ctrl+Z gives the rows back and keeps the new zoom', () => {
    const built = stage(smallDocument({ zoomY: 0.8, expanded: [R, Z], temporarily: [B2, C1] }))
    const before = built.states()
    built.key('-', { alt: true })
    const shrunk = built.zoomY()
    expect(shrunk).toBeLessThan(0.8)
    expect(built.withState('temporarilyExpanded')).toEqual([])
    expect(named(built.withState('expanded')).sort()).toEqual(['R', 'Z'])
    built.undo()
    expect(built.states(), 'UN-14: the tree write is one step').toEqual(before)
    expect(built.zoomY(), 'UN-8: the zoom is no step').toBe(shrunk)
  })

  it('an enlarge leaves every value alone', () => {
    const built = stage(smallDocument({ zoomY: 0.8, expanded: [R, Z], temporarily: [B2] }))
    const before = built.states()
    built.key('+', { alt: true })
    built.key('+', { alt: true })
    expect(built.zoomY()).not.toBe(0.8)
    expect(built.states()).toEqual(before)
  })

  it('createTaskGroup adds a row whose value is auto (AT-153), and the others keep theirs', () => {
    const doc = smallDocument({ zoomY: 0.8, expanded: [R] })
    const fresh = 'bbbbbbbb-0000-4000-8000-000000000001'
    const result = editTaskGroup(
      doc as any,
      { kind: 'createTaskGroup', id: fresh, parentId: R, label: 'New', derivedFromTaskUid: null, order: 99 },
      'Row',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const groups = (result.document.schedule as any).taskGroups
    expect(stateAmong(groups, fresh)).toBe('auto')
    expect(groups.filter((one: any) => one.treeState === 'expanded').map((one: any) => one.id)).toEqual([R])
  })

  it('moveTaskGroup keeps the moved row value and every other', () => {
    const doc = smallDocument({ zoomY: 0.8, expanded: [R, C1] })
    const result = editTaskGroup(doc as any, { kind: 'moveTaskGroup', groupId: C1, parentId: S, order: 99 }, 'Row')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const groups = (result.document.schedule as any).taskGroups
    expect(named(groups.filter((one: any) => one.treeState === 'expanded').map((one: any) => one.id)).sort()).toEqual(['C1', 'R'])
  })

  // WHY: DU-2 does not say whether a copied row keeps its treeState or is created auto (AT-153),
  // so only the originals are asserted here; the gap is reported, not decided.
  it('a pasted subtree leaves the values of the originals alone', () => {
    const doc = smallDocument({ zoomY: 0.8, expanded: [R, C1] })
    const newIds: Record<string, string> = {}
    subtreeOf(R).forEach((id, index) => {
      newIds[id] = `cccccccc-0000-4000-8000-00000000000${index}`
    })
    const result = editTaskGroup(
      doc as any,
      { kind: 'pasteTaskGroupSubtree', sourceGroupId: R, targetGroupId: B2, newGroupIds: newIds },
      'Row',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const groups = (result.document.schedule as any).taskGroups
    for (const copy of Object.values(newIds)) expect(TREE_STATES, copy).toContain(stateAmong(groups, copy))
    const originals = groups.filter((one: any) => ALL.includes(one.id))
    expect(statesOf(originals)).toEqual(statesOf(doc.schedule.taskGroups))
  })
})

describe('AT-153 -- saved in the document, required by the schema, not exported', () => {
  it('the schema rejects a TaskGroup without treeState, a null one, an unknown value and a column it does not define', () => {
    const row = smallDocument({ zoomY: 1 }).schedule.taskGroups[0]
    expect(validateEntity('TaskGroup', row).valid).toBe(true)
    for (const value of TREE_STATES) expect(validateEntity('TaskGroup', { ...row, treeState: value }).valid, value).toBe(true)
    const { treeState: _dropped, ...without } = row
    expect(validateEntity('TaskGroup', without).valid).toBe(false)
    expect(validateEntity('TaskGroup', { ...row, treeState: null }).valid).toBe(false)
    expect(validateEntity('TaskGroup', { ...row, treeState: 'open' }).valid).toBe(false)
    expect(validateEntity('TaskGroup', { ...row, keptOpen: true }).valid).toBe(false)
  })

  it('a JSON round trip keeps every value and level zero', () => {
    const doc = smallDocument({ zoomY: 1, expanded: [R], temporarily: [Z], folded: [B2], hidden: [S1], levelZero: 'collapsed' })
    const decoded = documentFromJson(jsonFromDocument(doc as any))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(statesOf((decoded.document.schedule as any).taskGroups)).toEqual(statesOf(doc.schedule.taskGroups))
    expect((decoded.document.documentSettings as any).levelZeroTreeState).toBe('collapsed')
  })

  it('the MSPDI export carries no treeState, and the values do not change its text', () => {
    const plain = mspdiFromDocument(smallDocument({ zoomY: 1 }) as any).text
    const opened = mspdiFromDocument(smallDocument({ zoomY: 1, expanded: ALL }) as any).text
    expect(opened).not.toMatch(/treeState|temporarilyExpanded/i)
    expect(opened).toBe(plain)
  })
})

describe(`FR-016 -- ${FR_016_TALLEST_AMONG_DRAWN}`, () => {
  const FULL_HD = { width: 1920, height: 1080, appHeaderHeight: 56, scrollbarThickness: 17 }

  function ceilingOf(doc: Record<string, any>): number {
    const settings = doc.documentSettings
    const regions = regionsFromScreen(FULL_HD as any, settings)
    const layout = layoutFromSchedule(doc.schedule, settings, regions)
    return rowBandCeilingOf({
      document: doc,
      layout,
      geometry: geometryFromLayout(doc.schedule, settings, layout, regions, emptySelection()),
      regions,
      screen: emptyScreenSession.screen,
      selection: emptySelection(),
      zoomStep: S_53,
      zoomMin: S_54,
      zoomMax: S_55,
      isPictureAtStoredZoom: true,
      pressed: null,
      isTextEntryUnsettled: false,
      isSurfaceStanding: false,
      dualCursorFollowing: null,
      today: '2026-03-01T00:00:00',
      newGroupId: 'row-minted-outside',
      newCommentBoxId: 'comment-box-minted-outside',
      newHighlightBoxId: 'highlight-box-minted-outside',
    } as any)
  }

  function deepDenseDocument(parentState: TreeState): Record<string, any> {
    const doc = structuredClone(TEMPLATE)
    const groups = doc.schedule.taskGroups
    const byId = new Map<string, any>(groups.map((one: any) => [one.id, one]))
    const depthOf = (one: any): number => (one.parentId === null ? 1 : 1 + depthOf(byId.get(one.parentId)))
    const deep = groups.find((one: any) => depthOf(one) === 4)
    doc.schedule.taskGroups = groups.map((one: any) => withTreeState(one, one.id === deep.parentId ? parentState : 'auto'))
    doc.schedule.taskGroupMembers = doc.schedule.taskGroupMembers.map((one: any) => ({ ...one, groupId: deep.id }))
    doc.documentSettings = { ...TEMPLATE_SETTINGS, scrollDate: '2026-01-05', scrollGroupId: groups[0].id }
    return doc
  }

  it.each(['expanded', 'temporarilyExpanded'] as const)(
    'the dense row drawn because its parent is %s lowers the ceiling below the auto one',
    (parentState) => {
      const unopened = ceilingOf(deepDenseDocument('auto'))
      const opened = ceilingOf(deepDenseDocument(parentState))
      expect(unopened, 'premise: the auto ceiling is above the lower end').toBeGreaterThan(S_54)
      expect(opened, FR_016_TALLEST_AMONG_DRAWN).toBeLessThan(unopened)
    },
  )
})
