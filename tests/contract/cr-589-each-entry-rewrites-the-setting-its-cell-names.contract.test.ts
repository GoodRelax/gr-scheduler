// CR-589 contract: each display entry of table T-109 rewrites the setting its switch column names (FR-049, FR-048).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  InputModifiers,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { frameLoop, type FrameEnvironment, type FrameLoop } from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken, type SpecRow } from './spec-table'

const SURFACE = '面'
const RULE = '正'
const SWITCH = '切り替える設定値'
const STANCE = '構え'
const PURPOSE = '何の入口か'
const T_202_KEY = 'キー'
const T_202_TYPE = '型'
const T_206_VALUE = '値'

const EM_DASH = '—'
const TOGGLE_RULE = 'FR-049'
const GUIDE_RULE = 'FR-048'
const GUIDE_ROW = 'S-66'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const GLOSSARY = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-glossary.md'), 'utf8'))

const T109 = specTable('T-109')
const T202 = specTable('T-202')
const T206 = specTable('T-206')

const rowIn = (rows: readonly SpecRow[], id: string): SpecRow | undefined => rows.find((row) => row.id === id)

const leadingRule = (row: SpecRow): string => /^`([A-Z]+-\d+[a-z]?)`/.exec(row.by[RULE] ?? '')?.[1] ?? ''

interface Named {
  readonly row: string
  readonly value: string | null
}
const namedBy = (cell: string): Named | null => {
  const found = /^`(S-\d+[a-z]?)`(?:（`'([^']+)'`）)?$/.exec(cell)
  if (found === null) return null
  return { row: found[1] as string, value: found[2] ?? null }
}

const BOOLEAN_TYPE = '真偽'

const GUIDE_VALUES: readonly string[] = [
  ...(rowIn(T206.rows, GUIDE_ROW)?.by[T_206_VALUE] ?? '').matchAll(/`'([^']+)'`/g),
].map((hit) => hit[1] as string)
const NO_GUIDE = 'none'

const FILLED = T109.rows.filter((row) => (row.by[SWITCH] ?? '') !== EM_DASH)
const TOGGLES = T109.rows.filter((row) => leadingRule(row) === TOGGLE_RULE)
const GUIDES = T109.rows.filter((row) => leadingRule(row) === GUIDE_RULE)

describe('CR-589 T1 -- table T-109 holds the column in the form its preamble states', () => {
  it('still says the clauses these cases are driven by, word for word', () => {
    expect(GLOSSARY).toContain('⭐ `切り替える設定値` の欄は、表示の値を書き換える入口のうち、次の 2 種の入口が書く設定値の行である。')
    expect(GLOSSARY).toContain('ほかの入口の欄は `—` である')
    expect(GLOSSARY).toContain('同欄が名指す設定値の行を、同じ行の `何の入口か` に重ねて書かない')
    expect(REQUIREMENTS).toContain('対象は**型が真偽である行だけ**とすること（MUST）')
    expect(REQUIREMENTS).toContain('`\'none\'` は値として残るが自分の入口を持たない')
    expect(REQUIREMENTS).toContain('同じ機能の入口を画面上の 2 か所に置いてはならない（MUST NOT）。')
  })

  it('has seven columns, with 切り替える設定値 directly between 正 and 構え', () => {
    expect(T109.headings.length).toBe(7)
    const at = T109.headings.indexOf(SWITCH)
    expect(T109.headings[at - 1]).toBe(RULE)
    expect(T109.headings[at + 1]).toBe(STANCE)
  })

  it('every cell is an em dash, or a settings row with an optional value in full-width brackets', () => {
    const malformed = T109.rows.filter((row) => row.by[SWITCH] !== EM_DASH && namedBy(row.by[SWITCH] ?? '') === null)
    expect(malformed.map((row) => `${row.id}: ${row.by[SWITCH]}`)).toEqual([])
  })

  it('a cell is filled exactly when the 正 begins with FR-049 or FR-048', () => {
    expect(TOGGLES.length, 'premise: table T-109 has FR-049 entries').toBeGreaterThan(0)
    expect(GUIDES.length, 'premise: table T-109 has FR-048 entries').toBeGreaterThan(0)
    const expected = [...TOGGLES, ...GUIDES].map((row) => row.id).sort()
    expect(FILLED.map((row) => row.id).sort()).toEqual(expected)
  })

  it('an FR-049 cell names one boolean row of table T-202, and nothing in brackets', () => {
    for (const row of TOGGLES) {
      const named = namedBy(row.by[SWITCH] ?? '')
      expect(named, `${row.id}: ${row.by[SWITCH]}`).not.toBeNull()
      expect(named?.value, `${row.id} writes a boolean, not a value`).toBeNull()
      const settings = rowIn(T202.rows, named?.row ?? '')
      expect(settings, `${row.id} names ${named?.row}, which is not a row of table T-202`).toBeDefined()
      expect(bare(settings?.by[T_202_TYPE] ?? ''), `${row.id} names ${named?.row}, whose type is not boolean`).toBe(
        BOOLEAN_TYPE,
      )
    }
  })

  it('an FR-048 cell names S-66 and one of its values other than none', () => {
    expect(GUIDE_VALUES[0], "premise: S-66 still holds 'none'").toBe(NO_GUIDE)
    for (const row of GUIDES) {
      const named = namedBy(row.by[SWITCH] ?? '')
      expect(named?.row, `${row.id}: ${row.by[SWITCH]}`).toBe(GUIDE_ROW)
      expect(GUIDE_VALUES, `${row.id} writes a value S-66 does not hold`).toContain(named?.value)
      expect(named?.value, `${row.id}: 'none' has no entry of its own (FR-048)`).not.toBe(NO_GUIDE)
    }
    const written = GUIDES.map((row) => namedBy(row.by[SWITCH] ?? '')?.value).sort()
    expect(written).toEqual(GUIDE_VALUES.filter((value) => value !== NO_GUIDE).sort())
  })

  it('no two entries name the same row, or the same value of S-66 (FR-029 MUST NOT)', () => {
    const keys = FILLED.map((row) => {
      const named = namedBy(row.by[SWITCH] ?? '')
      return `${named?.row}${named?.value === null ? '' : `=${named?.value}`}`
    })
    const repeated = keys.filter((key, at) => keys.indexOf(key) !== at)
    expect(repeated).toEqual([])
  })

  it('the sentence of a filled row does not name the row its cell names a second time', () => {
    for (const row of FILLED) {
      const named = namedBy(row.by[SWITCH] ?? '')
      expect(row.by[PURPOSE] ?? '', `${row.id} names ${named?.row} twice`).not.toContain('`' + named?.row + '`')
    }
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const ROW_ID = '11111111-1111-4111-8111-111111111111'

// WHY: with no pre-change plan IC-4 asks for the file instead (OP-15), so every document here holds one.
const HELD_BASELINE = [{ uid: 1, name: 'One', start: '2026-03-25', finish: '2026-04-03', milestone: false }]

function documentWith(settings: Readonly<Record<string, unknown>>): Document {
  const template = structuredClone(TEMPLATE)
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...template.schedule.project, uidHighWaterMark: 100, statusDate: null },
      calendars: template.schedule.calendars,
      tasks: [
        {
          uid: 1,
          wbsParentUid: null,
          wbsOrder: 1,
          name: 'One',
          start: '2026-04-01',
          finish: '2026-04-10',
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
        },
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        {
          id: ROW_ID,
          parentId: null,
          label: 'Alpha',
          derivedFromTaskUid: null,
          order: 0,
          treeState: 'auto',
          editGroup: null,
          color: null,
          minHeight: null,
        },
      ],
      taskGroupMembers: [{ taskUid: 1, groupId: ROW_ID, stackOrder: null }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: HELD_BASELINE,
    },
    documentSettings: { ...template.documentSettings, ...settings },
    documentStamp: template.documentStamp,
    changeLog: [],
  } as unknown as Document
}

const SCREEN: FrameEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const PRESS_AT = { x: 500, y: 300 }
const LOOK_AT = { x: 433, y: 377 }
const pointer = (phase: PointerPhase, at: { readonly x: number; readonly y: number }): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

const realRaf = (globalThis as any).requestAnimationFrame
afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

interface Stage {
  readonly loop: FrameLoop
  press(row: SpecRow): void
  pictureWithPointerAt(at: { readonly x: number; readonly y: number }): string
}

function stage(settings: Readonly<Record<string, unknown>>): Stage {
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
  const pictures: string[] = []
  let part: ScreenPart | null = null
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => part,
  }
  const loop = frameLoop({ showSvg: (svg: string) => void pictures.push(svg) }, documentWith(settings), SCREEN, {
    surface,
    language: 'ja',
    themePreference: 'light',
  })
  run()
  return {
    loop,
    press: (row) => {
      part = {
        part: bare(row.by[SURFACE] ?? '') as ScreenPart['part'],
        entry: row.id,
        format: null,
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      } as ScreenPart
      loop.receiveInput(pointer('down', PRESS_AT))
      loop.receiveInput(pointer('up', PRESS_AT))
      part = null
      run()
    },
    pictureWithPointerAt: (at) => {
      loop.receiveInput(pointer('move', at))
      run()
      return pictures[pictures.length - 1] ?? ''
    },
  }
}

const settingsOf = (loop: FrameLoop): Record<string, unknown> =>
  loop.document().documentSettings as unknown as Record<string, unknown>

const without = (settings: Record<string, unknown>, key: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(settings).filter(([one]) => one !== key))

const keyOfRow = (id: string): string => bare(rowIn(T202.rows, id)?.by[T_202_KEY] ?? '')

describe('CR-589 T2 -- each FR-049 entry flips the T-202 row its cell names, from what the document holds', () => {
  for (const row of TOGGLES) {
    const named = namedBy(row.by[SWITCH] ?? '')
    const key = keyOfRow(named?.row ?? '')
    for (const from of [false, true]) {
      it(`${row.id} (${bare(row.by[SURFACE] ?? '')}) turns ${named?.row} ${key} from ${from} to ${!from}`, () => {
        expect(key, `table T-202 prints a key for ${named?.row}`).not.toBe('')
        const built = stage({ [key]: from })
        expect(settingsOf(built.loop)[key], 'premise').toBe(from)
        const others = without(settingsOf(built.loop), key)

        built.press(row)

        expect(settingsOf(built.loop)[key], `${row.id} names ${named?.row} in its 切り替える設定値 cell`).toBe(!from)
        expect(without(settingsOf(built.loop), key), `${row.id} rewrites ${named?.row} alone`).toEqual(others)
      })
    }
  }
})

// see CU-3
const LINES_OF_MODE: Readonly<Record<string, { readonly vertical: boolean; readonly horizontal: boolean }>> = {
  none: { vertical: false, horizontal: false },
  crosshair: { vertical: true, horizontal: true },
  'single-vertical': { vertical: true, horizontal: false },
}

// WHY: S-66 is a screen value (table T-206), so the mode is read from the lines drawn through the pointer.
const guideDrawn = (built: Stage): string => {
  const lines = [...built.pictureWithPointerAt(LOOK_AT).matchAll(/<line\b[^>]*>/g)].map((hit) => hit[0])
  const at = (line: string, name: string): number => Number(new RegExp(`\\s${name}="([^"]+)"`).exec(line)?.[1])
  const vertical = lines.some((line) => at(line, 'x1') === LOOK_AT.x && at(line, 'x2') === LOOK_AT.x)
  const horizontal = lines.some((line) => at(line, 'y1') === LOOK_AT.y && at(line, 'y2') === LOOK_AT.y)
  const mode = Object.entries(LINES_OF_MODE).find(([, drawn]) => drawn.vertical === vertical && drawn.horizontal === horizontal)
  return mode?.[0] ?? `vertical ${vertical}, horizontal ${horizontal}`
}

describe('CR-589 T3 -- each FR-048 entry writes the S-66 value its cell names', () => {
  it('the three modes read from the picture are the three values S-66 holds', () => {
    expect(Object.keys(LINES_OF_MODE).sort()).toEqual([...GUIDE_VALUES].sort())
  })

  for (const row of GUIDES) {
    const value = namedBy(row.by[SWITCH] ?? '')?.value ?? ''
    it(`${row.id} writes '${value}', and pressed again returns S-66 to 'none'`, () => {
      const built = stage({})
      expect(guideDrawn(built), 'premise: S-66 starts at its default').toBe(NO_GUIDE)
      const before = settingsOf(built.loop)

      built.press(row)
      expect(guideDrawn(built), `${row.id} names '${value}' in its 切り替える設定値 cell`).toBe(value)

      built.press(row)
      expect(guideDrawn(built), 'FR-048: the entry that put the cursor out puts it away').toBe(NO_GUIDE)
      expect(settingsOf(built.loop), 'S-66 stands in table T-206, 保存しないもの').toEqual(before)
    })
  }

  it("pressing the other guide entry moves S-66 straight to that entry's value (CU-3, exclusive)", () => {
    const [first, second] = GUIDES
    if (first === undefined || second === undefined) throw new Error('table T-109 has fewer than two FR-048 entries')
    const built = stage({})
    built.press(first)
    built.press(second)
    expect(guideDrawn(built)).toBe(namedBy(second.by[SWITCH] ?? '')?.value)
  })
})
