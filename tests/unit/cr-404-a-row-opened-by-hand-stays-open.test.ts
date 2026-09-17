// CR-404: a row opened by hand stays open at every row zoom (T-254 KO-1..KO-7, AT-142, FR-018, FR-016, HF-13).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/json-codec'
import { mspdiFromDocument } from '../../src/adapter/document-codec/mspdi-codec'
import {
  commandFromInput,
  rowBandCeilingOf,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { emptyScreenState } from '../../src/entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { editTaskGroup } from '../../src/use-case/edit-document/edit-task-group'
import { bare, bareAll, specTable } from '../contract/spec-table'
import { validateDocument, validateEntity } from '../fixtures/grs-document'

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

const thresholdOf = (depth: number, settings: Record<string, any> = TEMPLATE.documentSettings): number =>
  settings.groupLevelOfDetailBase * settings.groupLevelOfDetailRatio ** (depth - 2)

describe('CR-404 -- the manuscript these cases are driven by', () => {
  it('table T-254 holds KO-1 .. KO-7 and names the entrances this file presses', () => {
    const t254 = specTable('T-254')
    expect(t254.rows.map((one) => one.id)).toEqual(['KO-1', 'KO-2', 'KO-3', 'KO-4', 'KO-5', 'KO-6', 'KO-7'])
    const said = (id: string): string => rowOf('T-254', id).cells.join(' ')
    expect(said('KO-1')).toContain('HF-13')
    expect(said('KO-2')).toContain('HF-2')
    expect(said('KO-3')).toContain('HF-10')
    expect(said('KO-4')).toContain('HF-3')
    expect(said('KO-5')).toContain('HF-11')
    expect(said('KO-6')).toContain('HF-12')
    expect(said('KO-7')).toContain('FR-055')
    expect(new Set([OPEN_ONE_LEVEL, OPEN_ALL_BELOW, HEAD_OPEN_EVERY_ROW, HIDE, FOLD_BELOW, HEAD_FOLD_EVERY_ROW, HEAD_OPEN_ONE_LEVEL]).size).toBe(7)
  })

  it('AT-142 is TaskGroup.isKeptOpen: boolean, not null, default false, not exported (TaskGroup export false)', () => {
    const erd = JSON.parse(
      readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'erd.json'), 'utf8'),
    )
    const text = JSON.stringify(erd)
    expect(text).toContain('"seat":142,"name":"isKeptOpen"')
    const schema = JSON.parse(
      readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'grs-document.schema.json'), 'utf8'),
    )
    const taskGroup = schema.$defs.TaskGroup
    expect(taskGroup.required).toContain('isKeptOpen')
    expect(taskGroup.properties.isKeptOpen).toEqual({ type: 'boolean', default: false })
  })

  it('the ladder premises: depth 3 at 0.6, depth 4 at 1.125, depth 2 at 0.32 (S-87 / S-88)', () => {
    expect(thresholdOf(2)).toBeCloseTo(0.32, 9)
    expect(thresholdOf(3)).toBeCloseTo(0.6, 9)
    expect(thresholdOf(4)).toBeCloseTo(1.125, 9)
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
  readonly kept?: readonly string[]
}

function smallDocument(part: Fixture): Record<string, any> {
  const folded = new Set(part.folded ?? [])
  const hidden = new Set(part.hidden ?? [])
  const kept = new Set(part.kept ?? [])
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
        isCollapsed: folded.has(one.id),
        isHidden: hidden.has(one.id),
        isKeptOpen: kept.has(one.id),
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
      ...structuredClone(TEMPLATE.documentSettings),
      scrollDate: '2026-04-01',
      scrollGroupId: A,
      zoomY: part.zoomY,
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
  kept(): string[]
  zoomY(): number
}

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
    kept: () => groups().filter((one) => one.isKeptOpen === true).map((one) => one.id),
    zoomY: () => loop.document().documentSettings.zoomY,
  }
}

const markOf = (groups: readonly any[], id: string): unknown => groups.find((one) => one.id === id)?.isKeptOpen

describe('CR-404 -- premises of the fixture', () => {
  it('the small fixture is a valid GRS JSON document under the schema in docs/spec', () => {
    const report = validateDocument(smallDocument({ zoomY: 1, kept: [R] }))
    expect(report.errors).toEqual([])
  })

  it('with no mark, the depth rule of FR-018 alone decides what is drawn (0.8: depth <= 3)', () => {
    const doc = smallDocument({ zoomY: 0.8 })
    const layout = layoutOf(doc)
    expect(named(layout)).toEqual(named([A, B, R, S, B2, B2a, Z, Z1]))
  })
})

function layoutOf(doc: Record<string, any>, env = SCREEN): string[] {
  const regions = regionsFromScreen(env as any, doc.documentSettings)
  return layoutFromSchedule(doc.schedule, doc.documentSettings, regions).rows.map((one) => one.groupId)
}

describe('FR-018 exemption -- a kept-open row, its ancestors and its direct children are drawn', () => {
  it('claim 1 (MUST): between the depth-3 and depth-4 thresholds, R marked draws C1 and C2 but not the grandchild G1', () => {
    const zoomY = 0.8
    expect(zoomY).toBeLessThan(thresholdOf(4))
    expect(zoomY).toBeGreaterThanOrEqual(thresholdOf(3))
    const drawn = layoutOf(smallDocument({ zoomY, kept: [R] }))
    expect(named(drawn)).toContain('C1')
    expect(named(drawn)).toContain('C2')
    expect(named(drawn)).not.toContain('G1')
    expect(named(drawn)).not.toContain('S1')
  })

  it('claim 2 (MUST): below the depth-2 threshold, R, its ancestors A and B, and C1 / C2 are drawn; unmarked branches fall', () => {
    const zoomY = 0.25
    expect(zoomY).toBeLessThan(thresholdOf(2))
    const drawn = named(layoutOf(smallDocument({ zoomY, kept: [R] })))
    for (const one of ['A', 'B', 'R', 'C1', 'C2']) expect(drawn, one).toContain(one)
    for (const one of ['G1', 'S', 'S1', 'B2', 'B2a', 'Z1']) expect(drawn, one).not.toContain(one)
    expect(drawn).toContain('Z')
  })

  it('claim 3 (MUST NOT): the mark does not beat a fold of an ancestor, nor R being hidden', () => {
    const zoomY = 0.8
    const underFold = named(layoutOf(smallDocument({ zoomY, kept: [R], folded: [B] })))
    expect(underFold).not.toContain('R')
    expect(underFold).not.toContain('C1')
    const hidden = named(layoutOf(smallDocument({ zoomY, kept: [R], hidden: [R] })))
    expect(hidden).not.toContain('R')
    expect(hidden).not.toContain('C1')
    const rFolded = named(layoutOf(smallDocument({ zoomY, kept: [R], folded: [R] })))
    expect(rFolded).not.toContain('C1')
  })

  it('claim 4: with marks, lowering zoomY never draws more rows (monotonic)', () => {
    const zooms = [4, 2.2, 2, 1.2, 1.1, 0.8, 0.59, 0.4, 0.31, 0.1, S_54]
    for (const kept of [[R], [C1], [B2, R], [Z]]) {
      let before = Number.POSITIVE_INFINITY
      for (const zoomY of zooms) {
        const count = layoutOf(smallDocument({ zoomY, kept })).length
        expect(count, `kept ${named(kept)} at ${zoomY}`).toBeLessThanOrEqual(before)
        before = count
      }
    }
  })

  it('claim 4 (distinguishing half): a marked C1 draws its child G1 at 0.25, which no depth rule does', () => {
    const drawn = named(layoutOf(smallDocument({ zoomY: 0.25, kept: [C1] })))
    for (const one of ['A', 'B', 'R', 'C1', 'G1']) expect(drawn, one).toContain(one)
    expect(drawn).not.toContain('C2')
  })

  it('claim 17 (FR-055 lower bound): at zoomMin (S-54) the rows the mark draws are still drawn', () => {
    const drawn = named(layoutOf(smallDocument({ zoomY: S_54, kept: [R] })))
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
    doc.schedule.taskGroups = doc.schedule.taskGroups.map((one: any) => ({ ...one, isKeptOpen: false }))
    doc.documentSettings = { ...doc.documentSettings, scrollDate: '2026-01-05', scrollGroupId: target.id }
    return doc
  }

  it('the template holds a depth-3 row whose child has children (premise)', () => {
    expect(target).toBeDefined()
  })

  it('[v] draws the children, answers no RS-30, saves the mark through JSON, keeps them while zooming down, and [^^] gives the depth rule back', () => {
    const built = stage(templateDocument())
    built.key('-', { alt: true })
    built.key('-', { alt: true })
    const kids = childrenOf(target.id).map((one: any) => one.id)
    const grandKids = kids.flatMap((id: string) => childrenOf(id).map((one: any) => one.id))
    expect(built.zoomY(), 'premise: below the depth-4 threshold').toBeLessThan(thresholdOf(4))
    expect(built.zoomY(), 'premise: the depth-3 row itself is drawn').toBeGreaterThanOrEqual(thresholdOf(3))
    expect(built.drawn(), 'premise: the depth-3 row is drawn').toContain(target.id)
    for (const kid of kids) expect(built.drawn(), 'premise: its children vanished').not.toContain(kid)
    expect(built.title(target.id).canOpenOneLevel, 'HF-13: an armed [v]').toBe(true)

    built.press(OPEN_ONE_LEVEL, target.id)
    expect(built.notices(), 'HF-13 (MUST NOT): an armed [v] must not answer RS-30').not.toContain(wordsOf('RS-30'))
    expect(built.notices()).toEqual([])
    for (const kid of kids) expect(built.drawn(), 'KO-1: the children are drawn').toContain(kid)
    for (const grand of grandKids) expect(built.drawn(), 'decision 4: grandchildren stay under zoom').not.toContain(grand)
    expect(markOf(built.groups(), target.id), 'KO-1: the mark is written').toBe(true)
    expect(built.title(target.id).canOpenOneLevel, 'HF-13: nothing is left to open, so [v] is thin').toBe(false)

    const decoded = documentFromJson(jsonFromDocument(built.loop.document()))
    expect(decoded.ok, 'the saved document reads back').toBe(true)
    if (decoded.ok) expect(markOf((decoded.document.schedule as any).taskGroups, target.id)).toBe(true)

    for (let step = 0; step < 60 && built.zoomY() >= thresholdOf(2); step++) built.key('-', { alt: true })
    expect(built.zoomY(), 'premise: under the depth-2 threshold').toBeLessThan(thresholdOf(2))
    expect(markOf(built.groups(), target.id), 'decision 13: a zoom change does not touch the mark').toBe(true)
    for (const id of [target.id, ...ancestorsOf(target.id), ...kids]) {
      expect(built.drawn(), `FR-018 exemption keeps ${byId.get(id).label}`).toContain(id)
    }

    built.press(FOLD_BELOW, target.id)
    expect(markOf(built.groups(), target.id), 'KO-5').toBe(false)
    expect(built.drawn(), 'the depth rule drops the depth-3 row again').not.toContain(target.id)
    for (const kid of kids) expect(built.drawn()).not.toContain(kid)

    built.undo()
    expect(markOf(built.groups(), target.id)).toBe(true)
    expect(built.groups().find((one) => one.id === target.id).isCollapsed).toBe(false)
    for (const kid of kids) expect(built.drawn()).toContain(kid)
  })

  it('[^] (hide, KO-4) on the kept-open row releases the mark as well', () => {
    const built = stage(templateDocument())
    built.key('-', { alt: true })
    built.key('-', { alt: true })
    built.press(OPEN_ONE_LEVEL, target.id)
    expect(markOf(built.groups(), target.id)).toBe(true)
    built.press(HIDE, target.id)
    expect(markOf(built.groups(), target.id)).toBe(false)
    expect(built.groups().find((one) => one.id === target.id).isHidden).toBe(true)
  })
})

describe('HF-13 -- [v] is drawn armed exactly when pressing it does something', () => {
  it('claim 5: a row whose children fell to zoom is armed; the press writes the mark in one step, draws them, and Ctrl+Z undoes both', () => {
    const built = stage(smallDocument({ zoomY: 0.8 }))
    expect(built.drawn()).not.toContain(C1)
    expect(built.title(R).canOpenOneLevel).toBe(true)
    built.press(OPEN_ONE_LEVEL, R)
    expect(built.notices()).toEqual([])
    expect(named(built.drawn())).toEqual(expect.arrayContaining(['C1', 'C2']))
    expect(built.kept()).toEqual([R])
    built.undo()
    expect(built.kept(), 'UN-14: one undo removes the mark').toEqual([])
    expect(built.drawn()).not.toContain(C1)
  })

  it('claim 6: all direct children drawn and none hidden -> thin, RS-30, no write', () => {
    const built = stage(smallDocument({ zoomY: 1.2 }))
    expect(built.drawn()).toEqual(expect.arrayContaining([C1, C2]))
    expect(built.title(R).canOpenOneLevel).toBe(false)
    const before = JSON.stringify(built.groups())
    built.press(OPEN_ONE_LEVEL, R)
    expect(built.notices()).toEqual([wordsOf('RS-30')])
    expect(JSON.stringify(built.groups())).toBe(before)
    expect(markOf(built.groups(), R)).toBe(false)
  })

  it('iff, swept: at each zoom, every drawn title arms [v] exactly when its press changes the drawn rows, and a spent press answers RS-30', () => {
    const disagree: string[] = []
    for (const fixture of [
      { zoomY: 1.2 },
      { zoomY: 0.8 },
      { zoomY: 0.4 },
      { zoomY: 0.25, kept: [R] },
      { zoomY: 0.8, folded: [B2] },
      { zoomY: 0.8, hidden: [C1] },
    ] as Fixture[]) {
      const probe = stage(smallDocument(fixture))
      for (const id of probe.drawn()) {
        const armed = probe.title(id).canOpenOneLevel === true
        const built = stage(smallDocument(fixture))
        const before = built.drawn().join(',')
        built.press(OPEN_ONE_LEVEL, id)
        const acted = built.drawn().join(',') !== before
        const told = built.notices().includes(wordsOf('RS-30'))
        if (armed !== acted || acted === told) {
          disagree.push(`${JSON.stringify(fixture)} ${NAMES[id]}: armed=${armed} acted=${acted} RS-30=${told}`)
        }
      }
    }
    expect(disagree, 'HF-13 (MUST NOT): drawn weight and the press must agree').toEqual([])
  })
})

describe('KO-1 / UN-14 -- [v] on a folded row writes the unfold and the mark in one step', () => {
  it('claim 7: isCollapsed false and isKeptOpen true after one press; one Ctrl+Z restores both', () => {
    const built = stage(smallDocument({ zoomY: 1.2, folded: [R] }))
    built.press(OPEN_ONE_LEVEL, R)
    const row = built.groups().find((one) => one.id === R)
    expect(row.isCollapsed).toBe(false)
    expect(row.isKeptOpen).toBe(true)
    built.undo()
    const back = built.groups().find((one) => one.id === R)
    expect(back.isCollapsed).toBe(true)
    expect(back.isKeptOpen).toBe(false)
  })
})

describe('KO-2 / KO-3 -- [vv] and header [vv] set the mark', () => {
  it('claim 8 KO-2: [vv] on a folded R marks R and every row under it, and nothing else', () => {
    const built = stage(smallDocument({ zoomY: 1.2, folded: [R] }))
    built.press(OPEN_ALL_BELOW, R)
    expect(built.notices()).toEqual([])
    expect(named(built.kept()).sort()).toEqual(named(subtreeOf(R)).sort())
  })

  it('claim 8 KO-3 (CR-404 q1 as recommended): header [vv] marks every row', () => {
    const built = stage(smallDocument({ zoomY: 1.2, folded: [B2] }))
    built.press(HEAD_OPEN_EVERY_ROW, null)
    expect(built.notices()).toEqual([])
    expect(named(built.kept()).sort()).toEqual(named(ALL).sort())
  })

  it('after KO-3, zooming to zoomMin drops no row (decision 6 cost)', () => {
    const built = stage(smallDocument({ zoomY: 1.2, folded: [B2] }))
    built.press(HEAD_OPEN_EVERY_ROW, null)
    for (let step = 0; step < 200 && built.zoomY() > S_54; step++) built.key('-', { alt: true })
    expect(named(built.drawn()).sort()).toEqual(named(ALL).sort())
  })
})

describe('KO-4 / KO-5 / KO-6 -- [^], [^^] and header [^^] clear the mark', () => {
  const MARKED = [A, B, R, C1, Z]

  it.each([
    ['KO-4 [^]', HIDE],
    ['KO-5 [^^]', FOLD_BELOW],
  ])('claim 9 %s on R clears R and its subtree; the ancestors keep theirs', (_name, entry) => {
    const built = stage(smallDocument({ zoomY: 0.25, kept: MARKED }))
    built.press(entry, R)
    expect(named(built.kept()).sort()).toEqual(named([A, B, Z]).sort())
  })

  it.each([
    ['KO-4 [^]', HIDE],
    ['KO-5 [^^]', FOLD_BELOW],
  ])('claim 9 %s on the ancestor A clears A and everything under it, and leaves Z', (_name, entry) => {
    const built = stage(smallDocument({ zoomY: 0.25, kept: MARKED }))
    built.press(entry, A)
    expect(named(built.kept())).toEqual(['Z'])
  })

  it('claim 9: [^^] on a descendant C1 leaves the mark of R', () => {
    const built = stage(smallDocument({ zoomY: 0.25, kept: [R, C1] }))
    built.press(FOLD_BELOW, C1)
    expect(named(built.kept())).toEqual(['R'])
  })

  it('claim 10 KO-6: header [^^] clears every mark', () => {
    const built = stage(smallDocument({ zoomY: 0.25, kept: MARKED }))
    built.press(HEAD_FOLD_EVERY_ROW, null)
    expect(built.kept()).toEqual([])
  })
})

describe('KO-7 / FR-031 / UN-17 -- fit-all clears every mark in its second write', () => {
  it('claim 11: F stays two writes, the second is exactly expandAllTaskGroups', () => {
    const doc = smallDocument({ zoomY: 0.8, kept: [R], folded: [B2] })
    const regions = regionsFromScreen(SCREEN as any, doc.documentSettings)
    const layout = layoutFromSchedule(doc.schedule, doc.documentSettings, regions)
    const context = {
      document: doc,
      layout,
      geometry: geometryFromLayout(doc.schedule, doc.documentSettings, layout, regions, emptySelection()),
      regions,
      screenState: emptyScreenState(),
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
    const action = commandFromInput(key('F') as any, context as any).action as any
    expect(action?.kind).toBe('changeDocument')
    expect(action.writes).toHaveLength(2)
    expect(action.writes[0].map((one: any) => one.kind)).toEqual(['fitScheduleToScreen'])
    expect(action.writes[1].map((one: any) => one.kind)).toEqual(['expandAllTaskGroups'])
  })

  it('claim 11: after F every mark is false; one Ctrl+Z restores the fold and the mark while the zoom stays new', () => {
    const built = stage(smallDocument({ zoomY: 0.8, kept: [R], folded: [B2] }))
    built.key('F')
    expect(built.kept(), 'KO-7').toEqual([])
    expect(built.groups().find((one) => one.id === B2).isCollapsed).toBe(false)
    const fittedZoomY = built.zoomY()
    built.undo()
    expect(built.kept(), 'UN-17: the mark comes back in the same step').toEqual([R])
    expect(built.groups().find((one) => one.id === B2).isCollapsed).toBe(true)
    expect(built.zoomY(), 'UN-8: the zoom stays new').toBe(fittedZoomY)
  })

  it('CM-72 expandAllTaskGroups, applied on its own, opens every fold and clears every mark', () => {
    const doc = smallDocument({ zoomY: 0.8, kept: [R, Z], folded: [B2] })
    const result = editTaskGroup(doc as any, { kind: 'expandAllTaskGroups' } as any, 'Row')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const groups = (result.document.schedule as any).taskGroups
    expect(groups.filter((one: any) => one.isKeptOpen === true)).toEqual([])
    expect(groups.every((one: any) => one.isKeptOpen === false)).toBe(true)
    expect(groups.filter((one: any) => one.isCollapsed === true)).toEqual([])
  })

  it('CM-75 setTaskGroupKeptOpen, applied on its own, writes one row and nothing else', () => {
    // WHY: the spec does not name the value member of CM-75, so both spellings of its neighbours' form are sent.
    const doc = smallDocument({ zoomY: 0.8 })
    const on = editTaskGroup(doc as any, { kind: 'setTaskGroupKeptOpen', groupId: R, keptOpen: true, isKeptOpen: true } as any, 'Row')
    expect(on?.ok, 'CM-75 is answered by the task group command module').toBe(true)
    if (!on?.ok) return
    const groups = (on.document.schedule as any).taskGroups
    expect(groups.filter((one: any) => one.isKeptOpen === true).map((one: any) => one.id)).toEqual([R])
    const off = editTaskGroup(on.document, { kind: 'setTaskGroupKeptOpen', groupId: R, keptOpen: false, isKeptOpen: false } as any, 'Row')
    expect(off.ok).toBe(true)
    if (off.ok) expect(markOf((off.document.schedule as any).taskGroups, R)).toBe(false)
  })
})

describe('HF-16 -- header [v] writes no mark', () => {
  it('claim 12: header [^^] then header [v] brings the shallowest level back and leaves every mark false', () => {
    const built = stage(smallDocument({ zoomY: 1.2 }))
    built.press(HEAD_FOLD_EVERY_ROW, null)
    built.press(HEAD_OPEN_ONE_LEVEL, null)
    expect(built.drawn()).toEqual(expect.arrayContaining([A, Z]))
    expect(built.groups().every((one) => one.isKeptOpen === false)).toBe(true)
  })
})

describe('T-254 closing rule -- a thin press writes no mark', () => {
  it('claim 14 (CR-404 q2 as recommended): [vv] over rows dropped by zoom only is thin, answers RS-28 and writes nothing', () => {
    const built = stage(smallDocument({ zoomY: 0.8 }))
    const before = JSON.stringify(built.groups())
    built.press(OPEN_ALL_BELOW, R)
    expect(built.notices()).toEqual([wordsOf('RS-28')])
    expect(JSON.stringify(built.groups())).toBe(before)
  })

  it('claim 14: a thin [v] on a leaf writes no mark', () => {
    const built = stage(smallDocument({ zoomY: 1.2 }))
    built.press(OPEN_ONE_LEVEL, C2)
    expect(built.notices()).toEqual([wordsOf('RS-30')])
    expect(built.kept()).toEqual([])
    expect(markOf(built.groups(), C2)).toBe(false)
  })
})

describe('FR-018 decision 13 -- zoom, adding and moving rows leave the marks alone; a created row is false', () => {
  it('claim 13: Alt+plus / Alt+minus change zoomY and no mark', () => {
    const built = stage(smallDocument({ zoomY: 0.8, kept: [R, Z] }))
    built.key('-', { alt: true })
    built.key('+', { alt: true })
    built.key('+', { alt: true })
    expect(built.zoomY()).not.toBe(0.8)
    expect(named(built.kept()).sort()).toEqual(['R', 'Z'])
  })

  it('claim 13: createTaskGroup adds a row whose mark is false, and the others keep theirs', () => {
    const doc = smallDocument({ zoomY: 0.8, kept: [R] })
    const fresh = 'bbbbbbbb-0000-4000-8000-000000000001'
    const result = editTaskGroup(
      doc as any,
      { kind: 'createTaskGroup', id: fresh, parentId: R, label: 'New', derivedFromTaskUid: null, order: 99 },
      'Row',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const groups = (result.document.schedule as any).taskGroups
    expect(markOf(groups, fresh)).toBe(false)
    expect(groups.filter((one: any) => one.isKeptOpen === true).map((one: any) => one.id)).toEqual([R])
  })

  it('claim 13: moveTaskGroup keeps the moved row mark and every other', () => {
    const doc = smallDocument({ zoomY: 0.8, kept: [R, C1] })
    const result = editTaskGroup(doc as any, { kind: 'moveTaskGroup', groupId: C1, parentId: S, order: 99 }, 'Row')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const groups = (result.document.schedule as any).taskGroups
    expect(named(groups.filter((one: any) => one.isKeptOpen === true).map((one: any) => one.id)).sort()).toEqual(['C1', 'R'])
  })

  it('claim 13 (CR-404 q3 as recommended): a copied subtree carries no mark', () => {
    const doc = smallDocument({ zoomY: 0.8, kept: [R, C1] })
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
    for (const copy of Object.values(newIds)) expect(markOf(groups, copy), copy).toBe(false)
    expect(named(groups.filter((one: any) => one.isKeptOpen === true).map((one: any) => one.id)).sort()).toEqual(['C1', 'R'])
  })
})

describe('AT-142 -- saved in the document, required by the schema, not exported', () => {
  it('claim 15: the schema rejects a TaskGroup without isKeptOpen, and a null one', () => {
    const row = smallDocument({ zoomY: 1 }).schedule.taskGroups[0]
    expect(validateEntity('TaskGroup', row).valid).toBe(true)
    const { isKeptOpen: _dropped, ...without } = row
    expect(validateEntity('TaskGroup', without).valid).toBe(false)
    expect(validateEntity('TaskGroup', { ...row, isKeptOpen: null }).valid).toBe(false)
  })

  it('claim 15: a JSON round trip keeps the mark', () => {
    const doc = smallDocument({ zoomY: 1, kept: [R, Z] })
    const decoded = documentFromJson(jsonFromDocument(doc as any))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    const groups = (decoded.document.schedule as any).taskGroups
    expect(named(groups.filter((one: any) => one.isKeptOpen === true).map((one: any) => one.id)).sort()).toEqual(['R', 'Z'])
    expect(groups.filter((one: any) => one.isKeptOpen === false)).toHaveLength(ALL.length - 2)
  })

  it('claim 15 (FR-018 MUST): an older-version GRS JSON without the key opens with every mark false', () => {
    const doc = smallDocument({ zoomY: 1 })
    doc.schemaVersion = '2026-09-14'
    doc.schedule.taskGroups = doc.schedule.taskGroups.map(({ isKeptOpen: _gone, ...rest }: any) => rest)
    const decoded = documentFromJson(JSON.stringify(doc))
    expect(decoded.ok, JSON.stringify((decoded as any).faults ?? [])).toBe(true)
    if (!decoded.ok) return
    const groups = (decoded.document.schedule as any).taskGroups
    expect(groups).toHaveLength(ALL.length)
    for (const one of groups) expect(one.isKeptOpen, NAMES[one.id]).toBe(false)
  })

  it('claim 15: the MSPDI export carries no isKeptOpen, and marks do not change its text', () => {
    const plain = mspdiFromDocument(smallDocument({ zoomY: 1 }) as any).text
    const marked = mspdiFromDocument(smallDocument({ zoomY: 1, kept: ALL }) as any).text
    expect(marked).not.toMatch(/kept\s*open/i)
    expect(marked).toBe(plain)
  })
})

describe('FR-016 -- a kept-open row counts in the row band ceiling', () => {
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
      screenState: emptyScreenState(),
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
      isLevelZeroFolded: false,
    } as any)
  }

  function deepDenseDocument(marked: boolean): Record<string, any> {
    const doc = structuredClone(TEMPLATE)
    const groups = doc.schedule.taskGroups
    const byId = new Map<string, any>(groups.map((one: any) => [one.id, one]))
    const depthOf = (one: any): number => (one.parentId === null ? 1 : 1 + depthOf(byId.get(one.parentId)))
    const deep = groups.find((one: any) => depthOf(one) === 4)
    doc.schedule.taskGroups = groups.map((one: any) => ({
      ...one,
      isKeptOpen: marked && one.id === deep.parentId,
    }))
    doc.schedule.taskGroupMembers = doc.schedule.taskGroupMembers.map((one: any) => ({ ...one, groupId: deep.id }))
    doc.documentSettings = { ...doc.documentSettings, scrollDate: '2026-01-05', scrollGroupId: groups[0].id }
    return doc
  }

  it('claim 16 (MUST): the dense row drawn by the mark lowers the ceiling below the unmarked one', () => {
    const unmarked = ceilingOf(deepDenseDocument(false))
    const marked = ceilingOf(deepDenseDocument(true))
    expect(unmarked, 'premise: the unmarked ceiling is above the lower end').toBeGreaterThan(S_54)
    expect(marked, 'FR-016: the tallest row is chosen among the rows the mark draws').toBeLessThan(unmarked)
  })
})
