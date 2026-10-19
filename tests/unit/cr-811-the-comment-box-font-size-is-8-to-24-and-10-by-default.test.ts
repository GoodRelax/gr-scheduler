// CR-811: the comment box font size is CommentBox.fontSizePx (AT-168), 8..24 px (S-624), and 10 px when null.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { HumanInput, PointerInput, PointerPhase } from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { CommentGeometry, Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { editAnnotation } from '../../src/use-case/edit-document/edit-annotation'
import { commandsOf, commentBoxOf, documentOf, fieldOf, panelOf, itemOf, propertyLabelOf } from '../contract/cr-606-stage'
import { specTable, unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_RATIO } from '../fixtures/display-scale'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))
const DESIGN = unbroken(readFileSync(join(SPEC, '05-07-design.md'), 'utf8').replace(/\r\n/g, '\n'))
const ERD_DETAIL = unbroken(readFileSync(join(SPEC, '_assets', 'fig-erd-detail.md'), 'utf8').replace(/\r\n/g, '\n'))
const DOCUMENT_COMMANDS = readFileSync(join(SPEC, '_assets', 'tbl-document-commands.md'), 'utf8').replace(/\r\n/g, '\n')

// see FR-019
const NULL_DRAWS_DEFAULT =
  '字の大きさの列（`AT-168`）が `null` のときは 表 T-217 の `S-624` の既定で描くこと（MUST）'
const DEFAULT_NOT_STEP = '字の大きさの既定は文書の文字サイズ（表 T-215）に従わない'
const PLACED_WITH_NULLS = '置くとき（`_assets/tbl-document-commands.md` の 表 T-108 の `CM-46`）は 6 列を `null` とすること（MUST）'
// see FR-097
const SIZE_IS_OWN_OR_DEFAULT =
  '文字の大きさは、その箱の `CommentBox.fontSizePx`（`_assets/fig-erd-detail.md` の `AT-168`）が `null` でなければその値（px）、`null` なら `_assets/tbl-settings.md` の 表 T-217 の `S-624` の既定とし、**1 行の高さは文字の大きさに等しいものとして数えること（MUST）。**'
const RANGE_IS_S_624 =
  '⭐ `AT-168` の範囲は `_assets/tbl-settings.md` の 表 T-217 の `S-624` とすること（MUST） —— 範囲の外の値を置く命令（`_assets/tbl-document-commands.md` の 表 T-108 の `CM-103`）は拒み、読んだ値は範囲へ寄せて描く（`FR-019` の太さと同じ規則）。'
const WIDTH_FROM_ESTIMATE = '幅は `FR-093` の概算で求め、**文字の実寸を測ってはならない（MUST NOT）。**'
const BELOW_FONT_MIN = '⚠️ 既定と下限は `fontMin`（表 T-201 の `S-8`）を割る'
// see FR-077
const FLOOR_NOT_APPLIED = '`FR-077` の可読の下限は、この選んだ大きさには当てない。'
const BOX_FONT_NOT_FLOORED = 'コメントボックスの字は本要求の下限に当てない（`FR-097`、利用者が定めた）。'
// see FR-006
const FR_006_FONT_SIZE_BELOW_BODY = 'コメントボックスの字の大きさ（表 T-016 の `PR-50`）は見た目の行に数えず、本文の欄（`PR-21`）のすぐ下に置くこと（MUST）'
const FR_006_LOOK_ORDER = '見た目の行どうしは、どの対象でも 枠線の幅 → 枠線の色 → 塗りの色 → 塗りの透過率 → 字の色 の順に並べ'
// see PR-48
const PR_48_BELOW_FONT_SIZE = '本文の欄とフォントサイズの欄（`PR-50`）のすぐ下に置く'
// see PR-50
const PR_50_SHOWS_DEFAULT = '列が `null` の箱は、既定の値（`_assets/tbl-settings.md` の表 T-217 の `S-624`）を欄に出す'
const PR_50_EMPTY_IS_NULL = '欄を空にして確定すると `null` に戻る。'
// see AT-168
const MISSING_COLUMNS_READ_AS_NULL =
  '`AT-148` 〜 `AT-152` と `AT-168` の列を持たない `CommentBox` の項には、その列を `null` として足して読むこと（MUST）'
const MISSING_COLUMN_DEFAULT_DIFFERS =
  '`AT-168` だけは、列を足す前の造りが文書の文字サイズで描いていた大きさと違う既定（同表の `S-624`）で描く'

const cellOf = (table: string, row: string, heading: string): string => {
  const found = specTable(table).rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`table ${table} has no row ${row}`)
  const cell = found.by[heading]
  if (cell === undefined) throw new Error(`table ${table} has no column ${heading}`)
  return cell
}

const oneNumberIn = (cell: string, what: string): number => {
  const numbers = cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/g) ?? []
  if (numbers.length !== 1) throw new Error(`${what} does not hold one number: ${cell}`)
  return Number(numbers[0])
}

// see S-624
const LOW = oneNumberIn(cellOf('T-217', 'S-624', '下限'), 'S-624 lower bound')
const HIGH = oneNumberIn(cellOf('T-217', 'S-624', '上限'), 'S-624 upper bound')
const DEFAULT = oneNumberIn(cellOf('T-217', 'S-624', '既定'), 'S-624 default')

// see T-215
const STEP_SIZE = {
  S: oneNumberIn(cellOf('T-215', 'S-121', '値'), 'S-121'),
  M: oneNumberIn(cellOf('T-215', 'S-122', '値'), 'S-122'),
  L: oneNumberIn(cellOf('T-215', 'S-123', '値'), 'S-123'),
} as const
type Step = keyof typeof STEP_SIZE

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
type Letter = (typeof LETTERS)[number]
const ROW: Readonly<Record<Letter, string>> = Object.fromEntries(
  LETTERS.map((letter, index) => [letter, `3a000000-0000-4000-8000-00000000000${String(index + 1)}`]),
) as Record<Letter, string>

const NOTE_ID = '3c000000-0000-4000-8000-000000000001'
const OTHER_NOTE_ID = '3c000000-0000-4000-8000-000000000002'

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`
const PX_PER_DAY_AT_1X = 20 / DEFAULT_DISPLAY_RATIO

interface NoteSpec {
  readonly id?: string
  readonly text?: string
  readonly fontSizePx?: number | null
}

interface Fixture {
  readonly notes?: readonly NoteSpec[]
  readonly step?: Step
  readonly zoomFactor?: number
}

const noteRecord = (spec: NoteSpec): Record<string, unknown> => ({
  id: spec.id ?? NOTE_ID,
  leaderShapeKind: 'polyline',
  text: spec.text ?? 'Note',
  anchorDate: day(10),
  anchorTaskGroupId: ROW.E,
  anchorBandFraction: null,
  anchorTaskUid: null,
  anchorTaskFigure: null,
  anchorHighlightBoxId: null,
  anchorSnapPoint: null,
  bodyOffsetPx: { dx: 60, dy: -60 },
  strokeColor: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
  textColor: null,
  fontSizePx: spec.fontSizePx ?? null,
})

function fixtureDocument(fixture: Fixture = {}): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  return {
    '$schema': template['$schema'],
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...(schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100 },
      calendars: schedule['calendars'],
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: LETTERS.map((letter, order) => ({
        id: ROW[letter],
        parentId: null,
        name: `task group ${letter}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: (fixture.notes ?? [{}]).map(noteRecord),
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      ...(fixture.step === undefined ? {} : { fontSizeStep: fixture.step }),
      zoomX: (PX_PER_DAY_AT_1X / SETTINGS_CONSTANTS.pxPerDayAt1x) * (fixture.zoomFactor ?? 1),
      scrollDate: '2026-04-01',
      scrollDateFraction: 0,
      scrollTaskGroupId: ROW.A,
      scrollTaskGroupFraction: 0,
      pinnedTaskGroupIds: [],
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  commitField(commit: unknown): void
  lastSvg(): string
}

function stageOf(document: Document): Stage {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  let commit: unknown = null
  const surface: ScreenSurface = {
    showScreenView: (_view: ScreenView) => undefined,
    readFieldCommit: () => {
      const one = commit
      commit = null
      return one as never
    },
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  let svg = ''
  const loop = frameLoop({ showSvg: (drawn: string) => void (svg = drawn) } as never, document, SCREEN, wiring)
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    commitField: (one) => {
      commit = one
      loop.receiveInput({ kind: 'key', key: 'Enter', modifiers: { ctrl: false, shift: false, alt: false, meta: false } })
      drain()
    },
    lastSvg: () => svg,
  }
}

const stage = (fixture: Fixture = {}): Stage => stageOf(fixtureDocument(fixture))

const NO_MODIFIERS = { ctrl: false, shift: false, alt: false, meta: false }
const pointer = (phase: PointerPhase, at: Point): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})
const undo = (built: Stage): void => built.send({ kind: 'key', key: 'Z', modifiers: { ...NO_MODIFIERS, ctrl: true } })

const drawnNote = (loop: FrameLoop, id: string = NOTE_ID): CommentGeometry => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  const found = values.geometry.commentBoxes.find((one) => one.id === id)
  if (found === undefined) throw new Error(`the frame drew no comment box ${id}`)
  return found
}

const centerOf = (box: ScreenRect): Point => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })

const storedNote = (document: Document, id: string = NOTE_ID): Record<string, unknown> => {
  const found = (document.schedule.commentBoxes as unknown as readonly Record<string, unknown>[]).find((one) => one['id'] === id)
  if (found === undefined) throw new Error(`the document has no comment box ${id}`)
  return structuredClone(found)
}

const attributeOf = (tag: string, name: string): string | null => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null

describe('CR-811 premises: the clauses these cases read, and the numbers they stand on', () => {
  it('FR-019, FR-097, FR-077, FR-006, T-016 PR-50 and 05-07-design say it, word for word', () => {
    for (const clause of [NULL_DRAWS_DEFAULT, DEFAULT_NOT_STEP, PLACED_WITH_NULLS, SIZE_IS_OWN_OR_DEFAULT, RANGE_IS_S_624, WIDTH_FROM_ESTIMATE, BELOW_FONT_MIN, FLOOR_NOT_APPLIED, BOX_FONT_NOT_FLOORED, FR_006_FONT_SIZE_BELOW_BODY, FR_006_LOOK_ORDER]) {
      expect(REQUIREMENTS, 'the requirements lost a clause').toContain(clause)
    }
    expect(DESIGN, 'the design lost the read clause').toContain(MISSING_COLUMNS_READ_AS_NULL)
    expect(DESIGN, 'the design lost the default clause').toContain(MISSING_COLUMN_DEFAULT_DIFFERS)
    const items = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-property-items.md'), 'utf8').replace(/\r\n/g, '\n').replace(/<br>/g, ''))
    expect(items, 'T-016 lost the PR-50 default clause').toContain(PR_50_SHOWS_DEFAULT)
    expect(items, 'T-016 lost the PR-50 empty clause').toContain(PR_50_EMPTY_IS_NULL)
    expect(items, 'T-016 lost the PR-48 placing clause').toContain(PR_48_BELOW_FONT_SIZE)
  })

  it('AT-168 is CommentBox.fontSizePx, an integer that takes null; CM-103 is setCommentBoxFontSizePx; S-624 is 8..24 with default 10; T-215 is S 12 / M 14 / L 16', () => {
    expect(ERD_DETAIL).toContain('| AT-168 | `CommentBox` | `fontSizePx` | 整数（px） | 可（`null` = 表 T-217 の既定）')
    expect(DOCUMENT_COMMANDS).toContain('| CM-103 | `CommentBox` | `setCommentBoxFontSizePx` |')
    expect([LOW, HIGH, DEFAULT]).toEqual([8, 24, 10])
    expect(STEP_SIZE).toEqual({ S: 12, M: 14, L: 16 })
  })
})

describe(`FR-019: ${NULL_DRAWS_DEFAULT}`, () => {
  for (const step of ['S', 'M', 'L'] as const) {
    it(`null at font step ${step} draws ${String(DEFAULT)} px, not the step size ${String(STEP_SIZE[step])} (${DEFAULT_NOT_STEP})`, () => {
      const built = stage({ step, notes: [{ fontSizePx: null }] })
      expect(drawnNote(built.loop).fontSize).toBe(DEFAULT)
      expect(drawnNote(built.loop).fontSize).not.toBe(STEP_SIZE[step])
    })
  }

  it(`a value of its own wins over the default: 18 px at step S, M and L (${SIZE_IS_OWN_OR_DEFAULT.slice(0, 40)}...)`, () => {
    for (const step of ['S', 'M', 'L'] as const) {
      const built = stage({ step, notes: [{ fontSizePx: 18 }] })
      expect(drawnNote(built.loop).fontSize, `step ${step}`).toBe(18)
    }
  })

  it('the text lines of the picture carry the drawn size', () => {
    const svg = stage({ notes: [{ fontSizePx: 20, text: 'one\ntwo' }] }).lastSvg()
    const lines = [...svg.matchAll(/<text\b[^>]*data-figure="comment-[^"]*-line-\d+"[^>]*>/g)].map((one) => one[0])
    expect(lines.length).toBeGreaterThanOrEqual(2)
    for (const tag of lines) expect(Number(attributeOf(tag, 'font-size')), tag).toBe(20)
  })

  it(`${NULL_DRAWS_DEFAULT} -- a null box and a box holding exactly the default draw the same body, at every step`, () => {
    for (const step of ['S', 'M', 'L'] as const) {
      const nullBox = drawnNote(stage({ step, notes: [{ fontSizePx: null }] }).loop)
      const defaultBox = drawnNote(stage({ step, notes: [{ fontSizePx: DEFAULT }] }).loop)
      expect(defaultBox.body, `step ${step}`).toEqual(nullBox.body)
      expect(defaultBox.fontSize, `step ${step}`).toEqual(nullBox.fontSize)
    }
  })

  it('the size does not follow the zoom: the same box at half and twice the zoom draws the same size', () => {
    for (const zoomFactor of [0.5, 1, 2]) {
      expect(drawnNote(stage({ zoomFactor, notes: [{ fontSizePx: 17 }] }).loop).fontSize, `zoom x${zoomFactor}`).toBe(17)
    }
  })
})

describe(`FR-097: ${RANGE_IS_S_624}`, () => {
  it('a stored value inside the range is drawn as it stands, at both bounds', () => {
    for (const size of [LOW, 12, HIGH]) {
      expect(drawnNote(stage({ notes: [{ fontSizePx: size }] }).loop).fontSize, `stored ${size}`).toBe(size)
    }
  })

  it('a stored 30 draws 24 and a stored 5 draws 8, and the document keeps the stored value', () => {
    for (const [stored, drawn] of [[30, 24], [5, 8]] as const) {
      const built = stage({ notes: [{ fontSizePx: stored }] })
      expect(drawnNote(built.loop).fontSize, `stored ${stored}`).toBe(drawn)
      expect(storedNote(built.loop.document())['fontSizePx'], 'the document was rewritten').toBe(stored)
    }
  })

  it('the clamped box has the same body as a box holding the bound itself', () => {
    expect(drawnNote(stage({ notes: [{ fontSizePx: 30 }] }).loop).body).toEqual(drawnNote(stage({ notes: [{ fontSizePx: HIGH }] }).loop).body)
    expect(drawnNote(stage({ notes: [{ fontSizePx: 5 }] }).loop).body).toEqual(drawnNote(stage({ notes: [{ fontSizePx: LOW }] }).loop).body)
  })

  it(`${FLOOR_NOT_APPLIED} -- 8, 9 and the default 10 are below fontMin 12 and are still drawn as they stand (${BELOW_FONT_MIN})`, () => {
    for (const step of ['S', 'M', 'L'] as const) {
      for (const size of [8, 9, 10]) {
        expect(drawnNote(stage({ step, notes: [{ fontSizePx: size }] }).loop).fontSize, `step ${step} size ${size}`).toBe(size)
      }
    }
  })

  it(`${BOX_FONT_NOT_FLOORED} -- the default 10 is not raised to the floor for a null box`, () => {
    expect(drawnNote(stage({ step: 'L', notes: [{ fontSizePx: null }] }).loop).fontSize).toBe(10)
  })
})

describe(`FR-097: ${SIZE_IS_OWN_OR_DEFAULT.slice(0, 80)}... -- the body box follows the box's own size`, () => {
  const TEXT = 'Note about this task\nsecond line'
  const bodyAt = (size: number | null): ScreenRect => drawnNote(stage({ notes: [{ text: TEXT, fontSizePx: size }] }).loop).body

  it('a bigger size gives a taller and a wider body for the same text', () => {
    const small = bodyAt(10)
    const big = bodyAt(22)
    expect(big.height, 'taller').toBeGreaterThan(small.height)
    expect(big.width, 'wider').toBeGreaterThan(small.width)
  })

  it('one line height is the size: the height grows by lines x the size difference (2 lines, 10 to 22 px)', () => {
    expect(bodyAt(22).height - bodyAt(10).height).toBeCloseTo(2 * (22 - 10), 6)
  })

  it(`${WIDTH_FROM_ESTIMATE} -- the estimate scales with the size: the text width at 24 px is twice the text width at 12 px`, () => {
    // WHY: the inner margin is drawn at the display ratio, so it is read off the height (2 lines x size + 2 margins).
    const margin = (bodyAt(12).height - 2 * 12) / 2
    expect(margin, 'premise: a positive inner margin').toBeGreaterThan(0)
    const text = (size: number): number => bodyAt(size).width - 2 * margin
    expect(text(24)).toBeCloseTo(2 * text(12), 6)
    expect(text(18)).toBeCloseTo(1.5 * text(12), 6)
  })

  it('a null box takes the default: the body at step L equals the body of a 10 px box (not a 16 px box)', () => {
    const built = stage({ step: 'L', notes: [{ text: TEXT, fontSizePx: null }] })
    expect(drawnNote(built.loop).body).toEqual(bodyAt(DEFAULT))
    expect(drawnNote(built.loop).body).not.toEqual(bodyAt(STEP_SIZE.L))
  })

  it('an empty text still gets a body no smaller than its own font size, in both directions (FR-097 floor)', () => {
    const body = drawnNote(stage({ notes: [{ text: '', fontSizePx: 20 }] }).loop).body
    expect(body.width).toBeGreaterThanOrEqual(20)
    expect(body.height).toBeGreaterThanOrEqual(20)
  })
})

describe(`T-108 CM-103: ${RANGE_IS_S_624.slice(0, 60)}...`, () => {
  type Command = Parameters<typeof editAnnotation>[1]

  const refusalOf = (command: Command): { command?: string; rule: string } | null => {
    const result = editAnnotation(fixtureDocument(), command)
    if (result.ok) return null
    expect(result.refusals).toHaveLength(1)
    return result.refusals[0] as { command?: string; rule: string }
  }

  const acceptedNote = (command: Command): Record<string, unknown> => {
    const result = editAnnotation(fixtureDocument(), command)
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
    return storedNote(result.document)
  }

  it('CM-103 places 8 and 24 (the bounds), a size in between, and null', () => {
    for (const size of [8, 24, 10, 14, 17, null]) {
      expect(acceptedNote({ kind: 'setCommentBoxFontSizePx', commentBoxId: NOTE_ID, fontSizePx: size })['fontSizePx'], `size ${String(size)}`).toBe(size)
    }
  })

  it('CM-103 refuses 7, 25 and 12.5 (outside 8..24 or not whole)', () => {
    for (const size of [7, 25, 12.5]) {
      expect(refusalOf({ kind: 'setCommentBoxFontSizePx', commentBoxId: NOTE_ID, fontSizePx: size }), `size ${size}`).toEqual(
        expect.objectContaining({ command: 'CM-103', rule: 'S-624' }),
      )
    }
  })

  it('CM-103 also refuses 0, a negative size and 100', () => {
    for (const size of [0, -12, 100]) {
      expect(refusalOf({ kind: 'setCommentBoxFontSizePx', commentBoxId: NOTE_ID, fontSizePx: size }), `size ${size}`).not.toBeNull()
    }
  })

  it('a refusal leaves the document as it was', () => {
    const before = fixtureDocument()
    const result = editAnnotation(before, { kind: 'setCommentBoxFontSizePx', commentBoxId: NOTE_ID, fontSizePx: 25 })
    expect(result.ok).toBe(false)
    expect(storedNote(before)['fontSizePx']).toBeNull()
  })

  it('CM-103 refuses a note that does not exist (AT-110)', () => {
    expect(refusalOf({ kind: 'setCommentBoxFontSizePx', commentBoxId: '3c000000-0000-4000-8000-0000000000ff', fontSizePx: 12 })).toEqual(
      expect.objectContaining({ command: 'CM-103', rule: 'AT-110' }),
    )
  })

  it('CM-103 writes the other box not at all', () => {
    const document = fixtureDocument({ notes: [{}, { id: OTHER_NOTE_ID }] })
    const result = editAnnotation(document, { kind: 'setCommentBoxFontSizePx', commentBoxId: NOTE_ID, fontSizePx: 20 })
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
    expect(storedNote(result.document, NOTE_ID)['fontSizePx']).toBe(20)
    expect(storedNote(result.document, OTHER_NOTE_ID)['fontSizePx']).toBeNull()
  })

  it(`${PLACED_WITH_NULLS} -- createCommentBox (CM-46) leaves fontSizePx null`, () => {
    const result = editAnnotation(fixtureDocument(), { kind: 'createCommentBox', commentBoxId: OTHER_NOTE_ID, anchor: { date: day(20), taskGroupId: ROW.E } })
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
    const made = storedNote(result.document, OTHER_NOTE_ID)
    expect(Object.prototype.hasOwnProperty.call(made, 'fontSizePx'), 'fontSizePx is missing').toBe(true)
    expect(made['fontSizePx']).toBeNull()
  })

  it('a placed size is drawn at once: the box takes the new size and one undo (FR-031) brings the old one back', () => {
    const built = stage({ step: 'M', notes: [{ fontSizePx: 14 }] })
    const note = drawnNote(built.loop)
    built.send(pointer('down', centerOf(note.body)))
    built.send(pointer('up', centerOf(note.body)))
    built.commitField({ row: 'PR-50', key: { holder: 'commentBox', id: NOTE_ID, column: 'fontSizePx' }, text: '20' })
    expect(storedNote(built.loop.document())['fontSizePx'], 'premise: the commit wrote 20').toBe(20)
    expect(drawnNote(built.loop).fontSize).toBe(20)
    undo(built)
    expect(storedNote(built.loop.document())['fontSizePx'], 'one undo left the new size').toBe(14)
    expect(drawnNote(built.loop).fontSize).toBe(14)
  })

  it('one undo of a first size on a null box brings back null, which draws the default again', () => {
    const built = stage({ step: 'M', notes: [{ fontSizePx: null }] })
    const note = drawnNote(built.loop)
    built.send(pointer('down', centerOf(note.body)))
    built.send(pointer('up', centerOf(note.body)))
    built.commitField({ row: 'PR-50', key: { holder: 'commentBox', id: NOTE_ID, column: 'fontSizePx' }, text: '20' })
    expect(drawnNote(built.loop).fontSize, 'premise: 20 was drawn').toBe(20)
    undo(built)
    expect(storedNote(built.loop.document())['fontSizePx']).toBeNull()
    expect(drawnNote(built.loop).fontSize).toBe(DEFAULT)
  })
})

describe(`05-07-design: ${MISSING_COLUMNS_READ_AS_NULL}`, () => {
  const withoutColumn = (schemaVersion?: string): string => {
    const document = JSON.parse(JSON.stringify(fixtureDocument())) as Record<string, any>
    for (const note of document['schedule']['commentBoxes'] as Record<string, unknown>[]) delete note['fontSizePx']
    if (schemaVersion !== undefined) document['schemaVersion'] = schemaVersion
    return JSON.stringify(document)
  }

  for (const [label, version] of [['the version this build writes', undefined], ['an older version', '2026-08-20']] as const) {
    it(`a comment box without fontSizePx opens with the column null (${label}), told as neither unread nor clamped`, () => {
      const read = documentFromJson(withoutColumn(version))
      if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults)}`)
      const note = storedNote(read.document)
      expect(Object.prototype.hasOwnProperty.call(note, 'fontSizePx'), 'fontSizePx was not added').toBe(true)
      expect(note['fontSizePx']).toBeNull()
      expect(read.unreadColumns).toEqual([])
      expect(read.clampedCount).toBe(0)
    })
  }

  it(`${MISSING_COLUMN_DEFAULT_DIFFERS} -- a note read without the column draws like one holding null, at ${String(DEFAULT)} px even at step L`, () => {
    const read = documentFromJson(withoutColumn('2026-08-20'))
    if (!read.ok) throw new Error(`refused: ${JSON.stringify(read.faults)}`)
    expect(stageOf(read.document).lastSvg()).toEqual(stage().lastSvg())
    const large = documentFromJson(withoutColumn())
    if (!large.ok) throw new Error(`refused: ${JSON.stringify(large.faults)}`)
    const withStepL = { ...large.document, documentSettings: { ...large.document.documentSettings, fontSizeStep: 'L' } } as unknown as Document
    expect(drawnNote(stageOf(withStepL).loop).fontSize).toBe(DEFAULT)
  })

  it('a stored size inside the range is read as it stands, and one outside it is read as it stands too (drawn clamped, not rewritten)', () => {
    for (const size of [8, 24, 14, 30, 5]) {
      const read = documentFromJson(JSON.stringify(fixtureDocument({ notes: [{ fontSizePx: size }] })))
      if (!read.ok) throw new Error(`size ${size} refused: ${JSON.stringify(read.faults)}`)
      expect(storedNote(read.document)['fontSizePx'], `size ${size}`).toBe(size)
    }
  })
})

describe('T-016 PR-50 and FR-006: the Font Size row sits right after the body row in the comment box panel', () => {
  const NOTE = 'c1'
  const panelWith = (fontSizePx: number | null) =>
    panelOf(documentOf({ tasks: [], commentBoxes: [commentBoxOf(NOTE, { fontSizePx })] }), { kind: 'commentBox', id: NOTE })

  it('PR-50 is a CommentBox row on fontSizePx taking a number', () => {
    const item = itemOf('PR-50')
    expect(item.columns).toEqual(['fontSizePx'])
    expect(item.appliesTo).toBe('CommentBox')
    expect(item.inputKinds).toEqual(['数値'])
  })

  it(`${FR_006_FONT_SIZE_BELOW_BODY} -- the comment box panel lists PR-50 immediately after PR-21`, () => {
    const rows = panelWith(null).fields.map((one) => one.row)
    expect(rows).toContain('PR-21')
    expect(rows).toContain('PR-50')
    expect(rows.indexOf('PR-50')).toBe(rows.indexOf('PR-21') + 1)
    expect(rows.filter((one) => one === 'PR-50')).toHaveLength(1)
  })

  it(`${PR_48_BELOW_FONT_SIZE} -- the comment box panel lists PR-48 immediately after PR-50`, () => {
    const rows = panelWith(null).fields.map((one) => one.row)
    expect(rows).toContain('PR-48')
    expect(rows.indexOf('PR-48')).toBe(rows.indexOf('PR-50') + 1)
  })

  it('the row carries one number control on CommentBox.fontSizePx, labelled フォントサイズ', () => {
    const field = fieldOf(panelWith(null), 'PR-50')
    expect(field.name).toBe(propertyLabelOf('PR-50'))
    expect(field.name).toBe('フォントサイズ')
    expect(field.isEditable).toBe(true)
    expect(field.controls).toHaveLength(1)
    const control = field.controls[0]!
    expect(control.kind).toBe('number')
    expect(control.key).toEqual({ holder: 'commentBox', id: NOTE, column: 'fontSizePx' })
  })

  it('the row shows the px unit', () => {
    const field = fieldOf(panelWith(null), 'PR-50')
    expect(field.unit ?? '', 'the unit word').toContain('px')
  })

  it(`${PR_50_SHOWS_DEFAULT} -- a null box shows ${String(DEFAULT)}, not an empty text; a held size shows as its number`, () => {
    expect(fieldOf(panelWith(null), 'PR-50').controls[0]!.text).toBe(String(DEFAULT))
    expect(fieldOf(panelWith(18), 'PR-50').controls[0]!.text).toBe('18')
  })

  it('the row does not appear for another holder: a task group panel has no PR-50', () => {
    const rows = panelOf(documentOf({ tasks: [], commentBoxes: [commentBoxOf(NOTE, { fontSizePx: null })] }), null, ['g1']).fields.map((one) => one.row)
    expect(rows).not.toContain('PR-50')
  })

  it('a committed number writes setCommentBoxFontSizePx', () => {
    const document = documentOf({ tasks: [], commentBoxes: [commentBoxOf(NOTE, { fontSizePx: 14 })] })
    const key = { holder: 'commentBox', id: NOTE, column: 'fontSizePx' } as never
    expect(commandsOf(document, { row: 'PR-50', key, text: '18' })).toEqual([{ kind: 'setCommentBoxFontSizePx', commentBoxId: NOTE, fontSizePx: 18 }])
  })

  it(`${PR_50_EMPTY_IS_NULL} -- an emptied field writes setCommentBoxFontSizePx null, and the field then shows ${String(DEFAULT)} again`, () => {
    const document = documentOf({ tasks: [], commentBoxes: [commentBoxOf(NOTE, { fontSizePx: 18 })] })
    const key = { holder: 'commentBox', id: NOTE, column: 'fontSizePx' } as never
    const emptied = commandsOf(document, { row: 'PR-50', key, text: '' })
    expect(emptied).toEqual([{ kind: 'setCommentBoxFontSizePx', commentBoxId: NOTE, fontSizePx: null }])
    const applied = editAnnotation(document, emptied[0] as Parameters<typeof editAnnotation>[1])
    if (!applied.ok) throw new Error(`refused: ${JSON.stringify(applied.refusals)}`)
    expect(fieldOf(panelOf(applied.document, { kind: 'commentBox', id: NOTE }), 'PR-50').controls[0]!.text).toBe(String(DEFAULT))
  })
})

describe('control -- the checks here can go red', () => {
  it('two sizes draw two different bodies', () => {
    const a = drawnNote(stage({ notes: [{ fontSizePx: 10 }] }).loop).body
    const b = drawnNote(stage({ notes: [{ fontSizePx: 20 }] }).loop).body
    expect(a).not.toEqual(b)
  })

  it('one character off a quoted clause is not in the manuscript', () => {
    expect(REQUIREMENTS).not.toContain(RANGE_IS_S_624.replace('とすること（MUST）', 'とすること（MUST NOT）'))
  })
})
