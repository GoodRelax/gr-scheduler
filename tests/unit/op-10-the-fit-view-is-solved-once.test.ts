import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { frameLoop, type FrameEnvironment } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

type Loose = Record<string, any>

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)
const DESIGN = readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8')

const sectionOf = (uid: string): string => {
  const start = REQUIREMENTS.indexOf(`**UID**: ${uid}`)
  if (start < 0) throw new Error(`01-04-requirements.md no longer holds ${uid}`)
  const end = REQUIREMENTS.indexOf('\n#### ', start)
  return end < 0 ? REQUIREMENTS.slice(start) : REQUIREMENTS.slice(start, end)
}

const OP_10_IS_THE_FIT =
  '| OP-10 | **表示位置が `null`、または指す行が存在しないとき** | `FR-055` の全体表示が選ぶ倍率と表示位置にすること（MUST）。'
const OP_10_NOT_EVERY_FRAME =
  '⛔ **本行を毎フレームやり直してはならない（MUST NOT）** —— **本行は結果を定めるものであって、頻度を定めるものではない。'
const OP_10_A_PERSON_CHOOSES =
  '⛔ **人が倍率か表示位置を選んだときは、それを表示位置とすること（MUST）**—— 選んだ時点で「人がまだ場所を決めていない」ではなくなるので、本行の条件は成り立たなくなり、全体表示はやり直されない。'
const OP_10_MEASURED =
  '⚠️ 実測（出荷ビルドで `IC-12` / `IC-13` / `IC-15` / `IC-10` を押した）: 毎フレームやり直すと、人が書いた倍率が次のフレームで上書きされ、4 つとも絵を 1 度も動かさない。'
const OP_10_ANOTHER_DOCUMENT = '⚠️ **別の文書を開いた時点でこの除外は解けること（MUST）**'
const OP_10_NOT_UNDO_REDO_MERGE =
  '⭐ **取り消し・やり直し・合流では解けない** —— 表 T-230 の 履歴 の欄が「別の文書になったか」を既に答えており、`FR-065` の判定と同じ列を使う'
const FR_080_SAME_AS_THE_SCREEN =
  '表示の切り替え・表示の倍率（`FR-039` の `S-234`）・ズームの段階・LOD による増減の結果を、書き出しでも同じにすること。'
const FR_091_CLOSES_THE_PANEL =
  '⭐ 作った直後の名称を `Enter` で確定したときは、同じ 1 回の押下でプロパティパネルを閉じ、その選択を解くこと（MUST）'
const FR_052_JUDGES_ON_THE_ROW_AREA =
  '判定は `Row Area` の幅が 0 より大きいことをもって行うこと（MUST）'
const BO_3_READS_THE_ZOOM_AND_THE_VIEW_PLACE = '| BO-3 | 3 | 見せ方の群から倍率と表示位置を読む。'

const NOTHING_OF_THE_VIEW_PLACE = [
  '表示位置',
  '倍率',
  'scrollDate',
  'scrollGroupId',
  'zoomX',
  'zoomY',
  'FR-055',
] as const

const HISTORY_COLUMN = '履歴'
const SURFACE_COLUMN = '面'
const DEFAULT_COLUMN = '既定'

const rowOf = (table: string, id: string): Loose => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found as unknown as Loose
}
const historyOf = (id: string): string => bare(rowOf('T-230', id).by[HISTORY_COLUMN] ?? '')
const surfaceOf = (id: string): string => bare(rowOf('T-109', id).by[SURFACE_COLUMN] ?? '')

const numberIn = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}
// see S-53
const ZOOM_STEP = numberIn(rowOf('T-201', 'S-53').by['既定値'] ?? '')

const FIT = 'IC-10'
const NARROW_THE_TIME_AXIS = 'IC-12'
const WIDEN_THE_TIME_AXIS = 'IC-13'
const WIDEN_THE_ROW_AXIS = 'IC-15'

const RECTANGLE = ((): string => {
  const found = specTable('T-109').rows.filter(
    (one) => bare(one.by['構え'] ?? '') === 'AR-2' && bare(one.by['何の入口か'] ?? '') === 'SH-1',
  )
  if (found.length !== 1) throw new Error(`table T-109 arms SH-1 from ${found.length} entrances`)
  return (found[0] as unknown as Loose).id as string
})()

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Loose

const SCREEN: FrameEnvironment = {
  width: 1400,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const PANEL_WIDTH_WHEN_OPENED = numberIn(rowOf('T-206', 'S-171').by[DEFAULT_COLUMN] ?? '')

const NARROWER: FrameEnvironment = { ...SCREEN, width: SCREEN.width - PANEL_WIDTH_WHEN_OPENED }

const GROUPS: readonly { readonly id: string; readonly parentId: string | null }[] = [
  { id: 'aaaaaaaa-0000-4000-8000-000000000001', parentId: null },
  { id: 'aaaaaaaa-0000-4000-8000-000000000002', parentId: 'aaaaaaaa-0000-4000-8000-000000000001' },
  { id: 'aaaaaaaa-0000-4000-8000-000000000003', parentId: null },
]

const SPANS: readonly (readonly [string, string])[] = [
  ['2026-04-01T08:00:00', '2026-04-30T17:00:00'],
  ['2026-05-01T08:00:00', '2026-06-30T17:00:00'],
  ['2026-07-01T08:00:00', '2026-09-30T17:00:00'],
]

const LAST_DAY_OF_A_LONGER_DOCUMENT = '2027-09-30T17:00:00'

function documentWithNoViewPlace(lastFinish: string | null = null): Loose {
  const task = (uid: number, start: string, finish: string): Loose => ({
    uid,
    wbsParentUid: null,
    wbsOrder: uid,
    name: `Task${uid}`,
    start,
    finish,
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
      project: {
        ...structuredClone(TEMPLATE.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(TEMPLATE.schedule.calendars),
      tasks: SPANS.map((span, index) =>
        task(
          index + 1,
          span[0] as string,
          index === SPANS.length - 1 && lastFinish !== null ? lastFinish : (span[1] as string),
        ),
      ),
      resources: [],
      assignments: [],
      taskGroups: GROUPS.map((one, index) => ({
        id: one.id,
        parentId: one.parentId,
        label: `G${index + 1}`,
        derivedFromTaskUid: null,
        order: index,
        treeState: 'auto', editGroup: null,
        color: null,
        height: null,
      })),
      taskGroupMembers: GROUPS.map((one, index) => ({
        taskUid: index + 1,
        groupId: one.id,
        stackOrder: null,
      })),
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE.documentSettings),
      scrollDate: null,
      scrollGroupId: null,
    },
    documentStamp: structuredClone(TEMPLATE.documentStamp),
    changeLog: [],
  }
}

const realRequestAnimationFrame = (globalThis as Loose).requestAnimationFrame
afterEach(() => {
  if (realRequestAnimationFrame === undefined) delete (globalThis as Loose).requestAnimationFrame
  else (globalThis as Loose).requestAnimationFrame = realRequestAnimationFrame
})

interface Pump {
  run(): void
}

function pump(): Pump {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Loose).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  return {
    run: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

const SVG: Loose = { showSvg: () => undefined }

const NO_MODIFIERS = { ctrl: false, shift: false, alt: false, meta: false }
const pointer = (phase: string, x: number, y: number): Loose => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})
const key = (which: string, mods: Partial<typeof NO_MODIFIERS> = {}): Loose => ({
  kind: 'key',
  key: which,
  modifiers: { ...NO_MODIFIERS, ...mods },
})

interface Picture {
  readonly pxPerDay: number
  readonly firstDay: string
  readonly rectangleHeight: number
  readonly rowAreaWidth: number
  readonly propertiesPanelWidth: number
}

interface ViewPlace {
  readonly zoomX: number
  readonly zoomY: number
  readonly scrollDate: string | null
  readonly scrollGroupId: string | null
  readonly scrollDayOffset: number
  readonly scrollGroupOffset: number
}

interface Bench {
  picture(): Picture
  storedViewPlace(): ViewPlace
  exportedViewPlace(): ViewPlace
  panelIsShown(): boolean
  taskCount(): number
  press(entrance: string): void
  drawATask(): void
  undo(): void
  redo(): void
  oneMoreFrame(): void
  resizeTo(env: FrameEnvironment): void
  read(document: Loose): void
}

const dayTextOf = (day: Loose | null): string =>
  day === null ? 'no day' : `${String(day.year)}-${String(day.month)}-${String(day.day)}`

const viewPlaceOf = (settings: Loose): ViewPlace => ({
  zoomX: settings.zoomX as number,
  zoomY: settings.zoomY as number,
  scrollDate: (settings.scrollDate ?? null) as string | null,
  scrollGroupId: (settings.scrollGroupId ?? null) as string | null,
  scrollDayOffset: settings.scrollDayOffset as number,
  scrollGroupOffset: settings.scrollGroupOffset as number,
})

function bench(document: Loose, env: FrameEnvironment = SCREEN, pen: Pump = pump()): Bench {
  const views: Loose[] = []
  let part: Loose | null = null
  const surface: Loose = {
    showScreenView: (view: Loose) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  const loop: Loose = frameLoop(
    SVG as never,
    document as never,
    env,
    { surface, language: 'ja' } as never,
  )
  pen.run()
  const send = (input: Loose): void => {
    loop.receiveInput(input)
    pen.run()
  }
  const press = (entrance: string, x: number, y: number): void => {
    part = {
      part: surfaceOf(entrance),
      entry: entrance,
      format: null,
      rowGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    }
    send(pointer('down', x, y))
    send(pointer('up', x, y))
    part = null
  }
  return {
    picture: () => {
      const values = loop.current() as Loose
      return {
        pxPerDay: values.layout.pxPerDay as number,
        firstDay: dayTextOf((values.layout.originDay ?? null) as Loose | null),
        rectangleHeight: values.layout.rectangleHeight as number,
        rowAreaWidth: values.regions.rowArea.width as number,
        propertiesPanelWidth: values.regions.propertiesPanel.width as number,
      }
    },
    storedViewPlace: () => viewPlaceOf((loop.document() as Loose).documentSettings as Loose),
    exportedViewPlace: () => {
      const scene = loop.exportScene() as Loose | null
      if (scene === null) throw new Error('the loop had no scene to export')
      return viewPlaceOf(scene.settings as Loose)
    },
    panelIsShown: () => ((views[views.length - 1] as Loose)?.propertiesPanel ?? null) !== null,
    taskCount: () => ((loop.document() as Loose).schedule as Loose).tasks.length as number,
    press: (entrance) => press(entrance, 300, 20),
    drawATask: () => {
      press(RECTANGLE, 700, 20)
      send(pointer('down', 500, 300))
      send(pointer('move', 640, 300))
      send(pointer('up', 640, 300))
    },
    undo: () => send(key('Z', { ctrl: true })),
    redo: () => send(key('Y', { ctrl: true })),
    oneMoreFrame: () => send(pointer('move', 700, 400)),
    resizeTo: (next) => {
      loop.resize(next)
      pen.run()
    },
    read: (next) => {
      loop.holdDocument({ row: 'RD-6', document: next } as never)
      pen.run()
    },
  }
}

describe('表 T-024a の OP-10 -- 本ファイルを動かす条文', () => {
  it('OP-10 は全体表示の答えを定め、同じ行が毎フレームのやり直しを禁じている', () => {
    expect(REQUIREMENTS).toContain(OP_10_IS_THE_FIT)
    expect(REQUIREMENTS).toContain(OP_10_NOT_EVERY_FRAME)
    expect(REQUIREMENTS).toContain(OP_10_MEASURED)
  })

  it('OP-10 は、人が倍率か表示位置を選んだ時点で本行の条件が成り立たなくなると定めている', () => {
    expect(REQUIREMENTS).toContain(OP_10_A_PERSON_CHOOSES)
  })

  it('OP-10 は、別の文書を開いた時点で解け、取り消し・やり直し・合流では解けないと定めている', () => {
    expect(REQUIREMENTS).toContain(OP_10_ANOTHER_DOCUMENT)
    expect(REQUIREMENTS).toContain(OP_10_NOT_UNDO_REDO_MERGE)
  })

  it('表 T-230 の 履歴 の欄が、その 2 つを機械で分けている', () => {
    expect(historyOf('RD-1')).toBe('問う先が答えたものを据える')
    expect(historyOf('RD-2')).toBe(historyOf('RD-1'))
    expect(historyOf('RD-3')).toBe('いまのものを残す')
    expect(historyOf('RD-4')).toBe('捨てる')
    expect(historyOf('RD-7')).toBe(historyOf('RD-4'))
    expect(historyOf('RD-6')).toBe('空にする')
    for (const row of ['RD-4', 'RD-6', 'RD-7']) {
      expect(historyOf(row), `表 T-230 の ${row}`).not.toBe(historyOf('RD-3'))
      expect(historyOf(row), `表 T-230 の ${row}`).not.toBe(historyOf('RD-1'))
    }
  })

  it('倍率と表示位置を読むのは起動の 1 段（表 T-077 の BO-3）であり、毎フレームの段ではない', () => {
    expect(DESIGN).toContain(BO_3_READS_THE_ZOOM_AND_THE_VIEW_PLACE)
  })

  it('FR-091 はパネルを開かせ、FR-052 は Row Area の幅で判定する -- どちらも表示位置と倍率について何も言わない', () => {
    expect(REQUIREMENTS).toContain(FR_091_CLOSES_THE_PANEL)
    expect(REQUIREMENTS).toContain(FR_052_JUDGES_ON_THE_ROW_AREA)
    for (const uid of ['FR-091', 'FR-072', 'FR-052']) {
      for (const word of NOTHING_OF_THE_VIEW_PLACE) {
        expect(sectionOf(uid), `${uid} が ${word} を持つ`).not.toContain(word)
      }
    }
  })

  it('FR-080 は、書き出す絵を画面と同じ倍率で描くと定めている', () => {
    expect(REQUIREMENTS).toContain(FR_080_SAME_AS_THE_SCREEN)
  })

  it('パネルが開いたときに取る幅は 表 T-206 の S-171 が持つ', () => {
    expect(String(rowOf('T-206', 'S-171').by['値'] ?? '')).toContain(
      'プロパティパネルが開いたときに取る幅',
    )
    expect(PANEL_WIDTH_WHEN_OPENED).toBeGreaterThan(0)
  })

  it('本ファイルが読ませる文書は docs/spec のスキーマで妥当であり、表示位置を持たない', () => {
    const document = documentWithNoViewPlace()
    expect(validateDocument(document as never).errors).toEqual([])
    expect((document.documentSettings as Loose).scrollDate).toBeNull()
    expect((document.documentSettings as Loose).scrollGroupId).toBeNull()
  })
})

describe('OP-10 の答えは 1 度だけ求める -- 求め直す出来事が来るまで', () => {
  it('前提: 同じ文書でも Row Area が狭ければ全体表示は別の答えを出す', () => {
    const pen = pump()
    const wide = bench(documentWithNoViewPlace(), SCREEN, pen)
    const narrow = bench(documentWithNoViewPlace(), NARROWER, pen)
    expect(narrow.picture().rowAreaWidth).toBe(
      wide.picture().rowAreaWidth - PANEL_WIDTH_WHEN_OPENED,
    )
    expect(narrow.picture().pxPerDay).not.toBe(wide.picture().pxPerDay)
  })

  it('タスクを描いてパネルが開き Row Area が狭まっても、描く日の幅も最初の日も動かない', () => {
    const pen = pump()
    const built = bench(documentWithNoViewPlace(), SCREEN, pen)
    const before = built.picture()
    const narrowAnswer = bench(documentWithNoViewPlace(), NARROWER, pen).picture()

    built.drawATask()

    expect(built.taskCount(), 'the drag made no task, so nothing narrowed').toBe(SPANS.length + 1)
    expect(built.panelIsShown(), 'the panel did not open, so nothing narrowed').toBe(true)
    expect(built.picture().rowAreaWidth).toBe(before.rowAreaWidth - PANEL_WIDTH_WHEN_OPENED)
    expect(built.picture().pxPerDay).toBe(before.pxPerDay)
    expect(built.picture().firstDay).toBe(before.firstDay)
    expect(built.picture().pxPerDay).not.toBe(narrowAnswer.pxPerDay)
  })

  it('取り消しでも、やり直しでも解けない（表 T-230 の RD-1 / RD-2）', () => {
    const built = bench(documentWithNoViewPlace())
    const before = built.picture()
    built.drawATask()
    built.undo()
    expect(built.taskCount(), 'the undo did not reach the document').toBe(SPANS.length)
    expect(built.picture().pxPerDay).toBe(before.pxPerDay)
    expect(built.picture().firstDay).toBe(before.firstDay)
    built.redo()
    expect(built.taskCount(), 'the redo did not reach the document').toBe(SPANS.length + 1)
    expect(built.picture().pxPerDay).toBe(before.pxPerDay)
    expect(built.picture().firstDay).toBe(before.firstDay)
  })

  it('答えを持つあいだ、文書の表示位置は `null` のままである', () => {
    const built = bench(documentWithNoViewPlace())
    expect(built.storedViewPlace().scrollDate).toBeNull()
    built.drawATask()
    expect(built.storedViewPlace().scrollDate).toBeNull()
    expect(built.storedViewPlace().scrollGroupId).toBeNull()
  })
})

describe('OP-10 の答えを取り直す出来事', () => {
  it('別の文書を読んだとき -- 答えはその文書自身の全体表示になる（表 T-230 の RD-6）', () => {
    const pen = pump()
    const built = bench(documentWithNoViewPlace(), SCREEN, pen)
    const before = built.picture()
    const other = documentWithNoViewPlace(LAST_DAY_OF_A_LONGER_DOCUMENT)
    expect(validateDocument(other as never).errors).toEqual([])
    const freshlyOpened = bench(
      documentWithNoViewPlace(LAST_DAY_OF_A_LONGER_DOCUMENT),
      SCREEN,
      pen,
    ).picture()
    expect(freshlyOpened.pxPerDay).not.toBe(before.pxPerDay)

    built.read(other)

    expect(built.picture().pxPerDay).toBe(freshlyOpened.pxPerDay)
    expect(built.picture().firstDay).toBe(freshlyOpened.firstDay)
  })

  it('画面の環境が変わったとき -- 答えは新しい画面の全体表示になる', () => {
    const pen = pump()
    const built = bench(documentWithNoViewPlace(), SCREEN, pen)
    const before = built.picture()
    const freshlyNarrow = bench(documentWithNoViewPlace(), NARROWER, pen).picture()

    built.resizeTo(NARROWER)

    expect(built.picture().rowAreaWidth).toBe(freshlyNarrow.rowAreaWidth)
    expect(built.picture().pxPerDay).not.toBe(before.pxPerDay)
    expect(built.picture().pxPerDay).toBe(freshlyNarrow.pxPerDay)
  })

  it('人が時間軸の倍率を選んだとき -- 絵が動き、次のフレームがそれを上書きしない', () => {
    for (const entrance of [NARROW_THE_TIME_AXIS, WIDEN_THE_TIME_AXIS]) {
      const built = bench(documentWithNoViewPlace())
      const before = built.picture()
      built.press(entrance)
      const chosen = built.picture()
      expect(chosen.pxPerDay, `${entrance} を押しても絵が動かない`).not.toBe(before.pxPerDay)
      expect(built.storedViewPlace().scrollDate).not.toBeNull()
      built.oneMoreFrame()
      expect(built.picture().pxPerDay, `${entrance} の次のフレームが上書きした`).toBe(
        chosen.pxPerDay,
      )
      expect(built.picture().firstDay).toBe(chosen.firstDay)
    }
  })

  // WHY: the fit may land inside the shrinking end (ZE-1), where a wider zoom need not move the
  // picture; OP-10 and FR-055 fix the zoom stepped from, the spec is silent on the picture there.
  it('人が行軸の倍率を選んだとき -- 全体表示の倍率から S-53 で刻んだ値が文書へ着き、次のフレームがそれを上書きしない', () => {
    const built = bench(documentWithNoViewPlace())
    const fitted = built.exportedViewPlace().zoomY
    built.press(WIDEN_THE_ROW_AXIS)
    const chosen = built.storedViewPlace()
    expect(chosen.zoomY, 'FR-055 / OP-10: the step is taken from the zoom the fit chose').toBeCloseTo(fitted * ZOOM_STEP, 9)
    expect(chosen.scrollDate, 'OP-10: the choice becomes the place').not.toBeNull()
    built.oneMoreFrame()
    expect(built.storedViewPlace().zoomY).toBe(chosen.zoomY)
  })

  it('人が全体表示を押したとき -- 選ばれた表示位置が文書へ着き、次のフレームが消さない', () => {
    const built = bench(documentWithNoViewPlace())
    expect(built.storedViewPlace().scrollDate).toBeNull()
    built.press(FIT)
    const chosen = built.storedViewPlace()
    expect(chosen.scrollDate).not.toBeNull()
    expect(chosen.scrollGroupId).not.toBeNull()
    built.oneMoreFrame()
    expect(built.storedViewPlace()).toEqual(chosen)
  })
})

describe('FR-080 -- 書き出す絵は、画面が立っている答えで描く', () => {
  it('パネルが開いて Row Area が狭まっても、書き出す絵の倍率と表示位置は画面の答えのままである', () => {
    const pen = pump()
    const built = bench(documentWithNoViewPlace(), SCREEN, pen)
    const onTheScreen = built.picture()
    const exported = built.exportedViewPlace()
    const narrowAnswer = bench(documentWithNoViewPlace(), NARROWER, pen).picture()

    built.drawATask()

    expect(built.picture().propertiesPanelWidth).toBe(PANEL_WIDTH_WHEN_OPENED)
    expect(built.exportedViewPlace()).toEqual(exported)
    expect(built.picture().pxPerDay).toBe(onTheScreen.pxPerDay)
    expect(built.picture().pxPerDay).not.toBe(narrowAnswer.pxPerDay)
  })

  it('書き出す絵は OP-10 の答えの 6 つの値を持つ -- 文書が持つ `null` ではない', () => {
    const built = bench(documentWithNoViewPlace())
    const exported = built.exportedViewPlace()
    expect(exported.scrollDate).not.toBeNull()
    expect(exported.scrollGroupId).not.toBeNull()
    expect(exported.zoomX).not.toBe(built.storedViewPlace().zoomX)
    expect(Number.isFinite(exported.scrollDayOffset)).toBe(true)
    expect(Number.isFinite(exported.scrollGroupOffset)).toBe(true)
  })
})
