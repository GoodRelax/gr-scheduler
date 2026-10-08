// W3 tester 4: FR-025 table T-241 IX-4 .. IX-13, FX-1 / FX-5 and the export chooser's span line -- a fixed fit span.

// WHY: the shell is driven through its public frame loop and the Agent API (PI-17); the picture is read from
// exportSvg (PI-21). Every number asserted comes from docs/spec; the document is built here.

import { describe, expect, it, vi } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { exportSvg, type ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { pointerOf, rowDocument, SCREEN, taskOf } from '../unit/cr-541-stage'
import {
  REQUIREMENTS,
  TEMPLATE_TEXT,
  jsonBytes,
  keyOfRow,
  reasonWords,
  replaceWith,
  settingNumber,
  settingRow,
  shellStage,
  surfaceOfEntrance,
  templateDocument,
  type ShellStage,
} from './cr-610-file-flow-stage'
import { bare, specTable } from './spec-table'

const IX_12 =
  '`S-78`・`S-176`・`S-177`）・横と縦のズーム（同表の `S-75`・`S-76`）・プロパティパネルとコマンドパレットの開閉で変えてはならない（MUST NOT）'
const IX_13 =
  '画と横 | ⭐ 絵の区画は、画面と同じ区画の組み方で、閲覧環境の幅の代わりに `S-81` の幅を、プロパティパネルとコマンドパレットを閉じた状態として与えて求めること（MUST）'
const IX_13_DAY =
  '1 日の幅を、`Row Area` の幅 ÷ `S-518` の日から `S-519` の日までを両端を含めて数えた暦日の数とすること（MUST）'
const IX_4_CAP =
  'い —— 行を足して埋めない規則は `IX-10` が持つ。固定しているときの高さは `IX-15` が持つ。⛔ **伸ばしてよいのはその `S-217` までとすること（MUST）'
const IX_10 =
  'りの空白 | 絵の高さ（全体表示時の期間を固定していなければ縮めた絵の高さ、固定していれば `IX-15` の高さ）が `S-81` の高さに満たないときは、余りを空白のままとすること（MUST）'
const IX_10_NO_ROWS = '行を足して埋めてはならない（MUST NOT） —— 画面に無いものが出る。'
// WHY: CR-690 -- the old span row retired; its rules are FX-1 and FX-5 of table T-367, and the span reaches the picture only fixed.
const IX_17_BOTH = '⭐ `S-518` と `S-519` は、ともに `null` か、ともに日付を持つこと（MUST）'
const IX_17_COPY = '読んだ文書と、片方だけが日付を持つ 表 T-108 の `CM-88` は、もう片方に同じ日を写す。'
const IX_17_REFUSE = '⭐ 欄と命令は、`S-519` が `S-518` より前の値を拒み、表 T-233 の `RS-58` を告げること（MUST）'
const IX_17_FIELD =
  '名を辞書が 表 T-104 の `K-141` に持つ語とし、開始日と終了日の 2 つを、宿主の日付の入力'
const FR_096_NO_NOTICE =
  '同じ日の書き方で、年まで読ませる。固定していないときは、行を出さず、場所も空けないこと（MUST）。⛔ 期間を固定した書き出しのたびに、そのことを告げる知らせを立ててはならない（MUST NOT）'

const BUILT_VERSION = (JSON.parse(TEMPLATE_TEXT) as { schemaVersion: string }).schemaVersion

// see S-81, S-217
const [S_81_WIDTH, S_81_HEIGHT] = (settingRow('S-81')['default']?.['pair'] ?? []).map(Number) as [number, number]
const S_217 = settingNumber('S-217')

// see T-108
const kindOf = (id: string): string => {
  const row = specTable('T-108').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-108 has no row ${id}`)
  const kind = row.cells.map(bare).find((cell) => /^[a-z][A-Za-z]+$/.test(cell))
  if (kind === undefined) throw new Error(`table T-108 row ${id} names no command`)
  return kind
}

const SPAN_START_DAY = '2026-04-13'
const SPAN_FINISH_DAY = '2026-04-24'
// WHY: both ends are counted (IX-13), so 13 .. 24 April is twelve calendar days.
const SPAN_DAYS = 12
const SPANNED_TASK = 2

/** @purity pure */
function twoRowDraft(): Record<string, any> {
  const draft = rowDocument([
    { id: 'g1', parentId: null },
    { id: 'g2', parentId: null },
  ])
  draft['schedule'].tasks[1] = taskOf(SPANNED_TASK, { start: `${SPAN_START_DAY}T08:00:00`, finish: `${SPAN_FINISH_DAY}T17:00:00` })
  return draft
}

/** @purity pure */
function documentOf(draft: Record<string, any>): Document {
  const read = documentFromJson(JSON.stringify(draft))
  if (!read.ok) throw new Error(`the bench document is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

type Api = ReturnType<typeof installAgentApi>

const agentOf = (built: ShellStage): Api =>
  installAgentApi({ ...built.loop.agentApiSeams(), writerName: 'w3-t4-tester', schemaVersion: BUILT_VERSION } as never)

const apply = (api: Api, commands: readonly Record<string, unknown>[]) =>
  api.applyCommands({ readStamp: api.readStamp(), commands: commands as never })

// see CM-88
const spanCommand = (start: string | null, finish: string | null): Record<string, unknown> => ({
  kind: kindOf('CM-88'),
  fitSpanStart: start,
  fitSpanFinish: finish,
})

// see CM-90, FX-4
const fixCommand = (): Record<string, unknown> => ({
  kind: kindOf('CM-90'),
  fitSpanFixed: true,
  shownStart: null,
  shownFinish: null,
})

const dayOf = (value: unknown): string | null => (typeof value === 'string' ? value.slice(0, 10) : null)

const spanOf = (document: Document): [string | null, string | null] => [
  dayOf(document.documentSettings.fitSpanStart),
  dayOf(document.documentSettings.fitSpanFinish),
]

/** @purity non-pure */
async function spannedStage(document: Document = documentOf(twoRowDraft())): Promise<{ built: ShellStage; api: Api }> {
  const built = await shellStage({ document })
  const api = agentOf(built)
  const outcome = apply(api, [spanCommand(SPAN_START_DAY, SPAN_FINISH_DAY), fixCommand()])
  expect(outcome.accepted, `premise: CM-88 sets a span and CM-90 fixes it -- ${JSON.stringify(outcome)}`).toBe(true)
  await built.repaint()
  return { built, api }
}

const sceneOf = (built: ShellStage): ExportScene => {
  const scene = built.loop.exportScene()
  if (scene === null) throw new Error('the frame loop gave no export scene')
  return scene
}

const pictureOf = (built: ShellStage): { svg: string; heightPx: number } => {
  const answer = exportSvg(sceneOf(built))
  if (!answer.ok) throw new Error(`exportSvg refused a two-row picture: ${answer.fault.reason}`)
  return answer
}

const planXs = (svg: string, uid: number): readonly number[] => {
  const found = new RegExp(`<polygon\\b[^>]*points="([^"]+)"[^>]*data-figure="task-${uid}-plan"`).exec(svg)
  if (found === null) throw new Error(`the picture draws no plan for Task ${uid}`)
  return (found[1] ?? '').split(/\s+/).map((pair) => Number(pair.split(',')[0]))
}

const rootSize = (svg: string): [number, number] => {
  const root = /<svg\b[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"/.exec(svg)
  return [Number(root?.[1] ?? NaN), Number(root?.[2] ?? NaN)]
}

interface FieldRig {
  press(surfaceName: string, entry: string): void
  settle(commit: { row: string; key: unknown; text: string }): void
  last(): ScreenView
  document(): Document
}

// see IF-9
// WHY: the shared stage answers no field commit, so this rig hands the shell one settled value the way a host does.
/** @purity non-pure */
function fieldRig(document: Document): FieldRig {
  const views: ScreenView[] = []
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return waiting.length
  }
  let held: unknown = null
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readDialogueInput: () => null,
    readFieldCommit: () => {
      const one = held
      held = null
      return one as never
    },
    readScreenPartAt: () => part,
  }
  const loop = frameLoop({ showSvg: () => undefined } as never, document, SCREEN, { surface, language: 'ja' })
  const run = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  run()
  return {
    press: (surfaceName, entry) => {
      part = { part: surfaceName, entry, format: null, rowGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null } as unknown as ScreenPart
      loop.receiveInput(pointerOf('down', 500, 300))
      run()
      loop.receiveInput(pointerOf('up', 500, 300))
      run()
      part = null
    },
    settle: (commit) => {
      held = commit
      loop.receiveInput(pointerOf('move', 501, 301))
      run()
    },
    last: () => {
      const view = views[views.length - 1]
      if (view === undefined) throw new Error('the surface was given no description')
      return view
    },
    document: () => loop.document(),
  }
}

describe('FR-025 / FR-096 -- the manuscript these cases are driven by', () => {
  it.each([IX_12, IX_13, IX_13_DAY, IX_4_CAP, IX_10, IX_10_NO_ROWS, IX_17_BOTH, IX_17_COPY, IX_17_REFUSE, IX_17_FIELD, FR_096_NO_NOTICE])(
    '01-04 still says: %s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )
})

describe(`IX-12 -- ${IX_12}`, () => {
  it('the span picture is the same after the window is resized, both zooms move and both panels open', async () => {
    // WHY: the picture carries the edit time; the zoom write lands a second later under load and differs by it alone.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-04-01T09:00:00Z'))
    try {
    const { built, api } = await spannedStage()
    const first = pictureOf(built).svg

    built.loop.resize({ width: 1100, height: 650, appHeaderHeight: 56, scrollbarThickness: 8 })
    await built.repaint()
    expect(pictureOf(built).svg, `${IX_12}: a smaller window (S-77, S-78)`).toBe(first)

    // see CM-65
    expect(apply(api, [{ kind: kindOf('CM-65'), zoomX: 3, zoomY: 2 }]).accepted, 'premise: CM-65 moves both zooms').toBe(true)
    await built.repaint()
    expect(pictureOf(built).svg, `${IX_12}: zoomed (S-75, S-76)`).toBe(first)

    await built.press(surfaceOfEntrance('IC-17'), 'IC-17')
    expect(built.last().propertiesPanel, 'premise: IC-17 opened the Properties Panel').not.toBeNull()
    await built.key(keyOfRow('SK-14'))
    await built.repaint()
    expect(pictureOf(built).svg, `${IX_12}: with the Properties Panel and the Command Palette toggled`).toBe(first)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe(`IX-13 -- ${IX_13}`, () => {
  it('the picture is S-81 wide, its regions are those of a S-81 screen with the panels closed, whatever the window', async () => {
    const { built } = await spannedStage()
    const wide = sceneOf(built).regions
    await built.press(surfaceOfEntrance('IC-17'), 'IC-17')
    built.loop.resize({ width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 })
    await built.repaint()
    const narrow = sceneOf(built).regions
    expect(rootSize(pictureOf(built).svg)[0], `${IX_13}: the picture is S-81 wide`).toBe(S_81_WIDTH)
    expect(narrow.propertiesPanel.width, `${IX_13}: the Properties Panel is given closed`).toBe(0)
    expect(narrow.appHeader.width, `${IX_13}: laid out at the S-81 width, not the window's`).toBe(S_81_WIDTH)
    expect(narrow.rowArea, IX_13).toEqual(wide.rowArea)
  })

  it(`the Row Area runs from the S-518 day's left edge to the day after S-519 -- ${IX_13_DAY}`, async () => {
    const { built } = await spannedStage()
    const { rowArea } = sceneOf(built).regions
    const xs = planXs(pictureOf(built).svg, SPANNED_TASK)
    expect(Math.min(...xs), `${IX_13_DAY}: the span's first day opens the Row Area`).toBeCloseTo(rowArea.x, 1)
    expect(Math.max(...xs), `${IX_13_DAY}: the span's last day closes the Row Area`).toBeCloseTo(rowArea.x + rowArea.width, 1)
    const firstTaskXs = planXs(pictureOf(built).svg, 1)
    const dayWidth = rowArea.width / SPAN_DAYS
    // WHY: Task 1 runs 6 .. 10 April, five calendar days; its width is five of the span's days.
    expect(Math.max(...firstTaskXs) - Math.min(...firstTaskXs), IX_13_DAY).toBeCloseTo(5 * dayWidth, 1)
  })
})

describe(`IX-10 -- ${IX_10}`, () => {
  it('a two-row span picture keeps the S-81 height and draws only the two rows of the document', async () => {
    const { built } = await spannedStage()
    const picture = pictureOf(built)
    expect(picture.heightPx, `${IX_10}: shorter than S-81, the picture keeps the S-81 height`).toBe(S_81_HEIGHT)
    expect(rootSize(picture.svg)[1], IX_10).toBe(S_81_HEIGHT)
    const bands = [...picture.svg.matchAll(/data-figure="row-([^"]+)-band"/g)].map((one) => one[1])
    expect(bands, `${IX_10_NO_ROWS}: no row is added to fill the blank`).toEqual(['g1', 'g2'])
  })
})

describe(`IX-4 -- ${IX_4_CAP}`, () => {
  it('a span over the thousand-task template is never drawn taller than S-217', async () => {
    const template = templateDocument()
    const { built } = await spannedStage(template)
    const answer = exportSvg(sceneOf(built))
    const height = answer.ok ? answer.heightPx : null
    if (height !== null) expect(height, IX_4_CAP).toBeLessThanOrEqual(S_217)
    if (answer.ok) expect(rootSize(answer.svg)[1], IX_4_CAP).toBeLessThanOrEqual(S_217)
    else expect(answer.fault.reason, `${IX_4_CAP}: refused rather than drawn taller`).toBe('tooTall')
  })
})

describe(`FX-1 -- ${IX_17_BOTH}`, () => {
  it('a CM-88 that names only the start leaves both ends dated, on the same day', async () => {
    const { built, api } = await spannedStage()
    const outcome = apply(api, [spanCommand('2026-04-15', null)])
    const [start, finish] = spanOf(built.loop.document())
    expect(start === null, `${IX_17_BOTH}: ${JSON.stringify(outcome)}`).toBe(finish === null)
    if (outcome.accepted) expect([start, finish], IX_17_COPY).toEqual(['2026-04-15', '2026-04-15'])
  })

  it('a document read with only the start dated is opened with both ends on that day', async () => {
    const built = await shellStage({ document: documentOf(twoRowDraft()) })
    const oneSided = twoRowDraft()
    oneSided['documentSettings'].fitSpanStart = `${SPAN_START_DAY}T00:00:00`
    oneSided['documentSettings'].fitSpanFinish = null
    await replaceWith(built, built.file('one-sided.json', jsonBytes(oneSided)))
    expect(spanOf(built.loop.document()), `${IX_17_BOTH} -- ${IX_17_COPY}`).toEqual([SPAN_START_DAY, SPAN_START_DAY])
  })
})

describe(`FX-1 -- ${IX_17_REFUSE}`, () => {
  it('the command: a CM-88 whose finish is before its start is refused and the span stays', async () => {
    const { built, api } = await spannedStage()
    const outcome = apply(api, [spanCommand('2026-04-20', '2026-04-13')])
    expect(outcome.accepted, IX_17_REFUSE).toBe(false)
    expect(spanOf(built.loop.document()), IX_17_REFUSE).toEqual([SPAN_START_DAY, SPAN_FINISH_DAY])
  })

  it('the field: K-141 offers two date entrances, and a finish settled before the start is told RS-58', () => {
    const draft = twoRowDraft()
    draft['documentSettings'].fitSpanStart = `${SPAN_START_DAY}T00:00:00`
    draft['documentSettings'].fitSpanFinish = `${SPAN_FINISH_DAY}T23:59:00`
    // WHY: FX-5 lets the two entrances be written only while the span is fixed.
    draft['documentSettings'].fitSpanFixed = true
    const rig = fieldRig(documentOf(draft))
    rig.press(surfaceOfEntrance('IC-17'), 'IC-17')
    const fields = ((rig.last().propertiesPanel as { fields?: any[] } | null)?.fields ?? []).filter((one) => one.row === 'K-141')
    const controls = fields.flatMap((one) => (one.controls ?? []) as { kind: string; key: unknown }[])
    expect(
      controls.map((one) => one.kind),
      `${IX_17_FIELD} -- seen ${fields.length} K-141 field(s), editable: ${JSON.stringify(fields.map((one) => one.isEditable))}`,
    ).toEqual(['date', 'date'])
    rig.settle({ row: 'K-141', key: controls[1]?.key, text: '2026-04-01' })
    expect(spanOf(rig.document()), IX_17_REFUSE).toEqual([SPAN_START_DAY, SPAN_FINISH_DAY])
    const told = rig.last().notices.map((one) => (one as { text?: string }).text)
    expect(told, IX_17_REFUSE).toContain(reasonWords('RS-58').text.ja)
  })
})

describe(`FR-096 -- ${FR_096_NO_NOTICE}`, () => {
  it('an SVG export with a span raises no notice the same export without a span does not raise', async () => {
    const plain = await shellStage({ document: documentOf(twoRowDraft()) })
    await plain.exportAs('IO-3', plain.file('plain.svg', new Uint8Array(0)))
    const toldPlain = plain.last().notices.map((one) => (one as { text?: string }).text)

    const { built } = await spannedStage()
    const chosen = built.file('spanned.svg', new Uint8Array(0))
    await built.exportAs('IO-3', chosen)
    expect(chosen.bytes().byteLength, 'premise: the span export was written').toBeGreaterThan(0)
    const toldSpanned = built.last().notices.map((one) => (one as { text?: string }).text)
    expect(toldSpanned, FR_096_NO_NOTICE).toEqual(toldPlain)
  })
})
