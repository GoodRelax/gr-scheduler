// CR-787 (spec-only): S-171..S-607, FR-156 two-line zone names and their list, RN-3's joined edge rows, and the WH-1 word.

import { describe, expect, it } from 'vitest'

import { timeZoneLinesOf, zoneOffsetTextOf } from '../../src/adapter/screen-renderer/notices'
import type { DisplayLanguage, PropertyControl, PropertyField } from '../../src/adapter/screen-renderer/screen-renderer'
import { fieldElement } from '../../src/framework/dom-screen-surface/properties-panel-drawing'
import { FakeElement, selfAndDescendants, stage, type FakeEvent, type World } from '../fixtures/fake-browser'
import { FIRST_GROUP_ID, LANGUAGES, partWord, REQUIREMENTS, SETTINGS_BOOK, settingsPanel, TEMPLATE, type Loose } from './cr-754-stage'
import { T_376_ROWS, WORDS, placeOf, timeZoneWord, zoneRowOfKey } from './cr-755-stage'
import { bare, specTable } from './spec-table'

// see FR-156
const FR_156_TWO_LINES =
  '見せる名は 2 行とし、1 行目は 表 T-376 の UTC の差と略称を `FR-038` の辞書の `timeZoneField` の `zoneHead` の形でつないだもの、2 行目は同じ辞書の `timeZones` が行ごとに持つ地名とすること（MUST）'
const FR_156_DIGITS = '差は時も分も 2 桁とし、0 は `±00:00` と書く'
const FR_156_NO_ABBREVIATION = '略称を持たない行は、1 行目の略称の部を詰める（例「UTC -12:00」／「日付変更線の西」）。'
const FR_156_COMMA = '英語の地名は、並べる国や都市を and でなく「,」で区切る'
const FR_156_LIST =
  '⭐ タイムゾーンを選ぶ欄（`FO-14`・`FO-15`）は、いま選んでいる名を同じ 2 行で見せ、押すと欄の下に 2 行の選択肢の一覧を開き、選択肢を押すとそれを選んで一覧を閉じること（MUST）'
const FR_156_OUTSIDE = '欄の外を押すと、選ばずに一覧を閉じる。'
const FR_156_WRAP =
  '⭐ 欄の幅は 1 行目が収まる幅を下限とし（`FR-006` の要る幅）、2 行目の地名が欄に入り切らないときは欄の中で折り返すこと（MUST）'
// see FR-052
const FR_052_STARTS = '⭐ プロパティパネルの幅は画面の値とし、出している中身の種の既定の幅から始めること（MUST）'
const FR_052_KIND_CHANGE = '⭐ 出す中身の種が変わったら、新しい種の既定の幅へ戻すこと（MUST）'
const FR_156_SCROLL = '一覧は、選択肢 `_assets/tbl-settings.md` の 表 T-206 の `S-607` 個ぶんの高さを超えると、中で縦に送る。'
// see T-380, T-369
const RN_3_JOINED =
  '⭐ 日程表の左端と上端は、保存では 2 つずつの値（`K-69` と `K-121`、`K-70` と `K-120`）で持つが、読むだけの行では 1 行ずつにまとめ、何の・どこかを 1 行で読ませる'
const RN_3_KEEPS_STORAGE = '保存の持ち方は変えない。'
// see FR-159, T-379
const FR_159_FIRST_START = '欄の上に最初のタスクの開始日（表 T-379 の `WH-1`）を見せること（MUST）'

const SECTION = 'readOnlySettings'

/** @purity pure */
const settingCell = (id: string, column: string): string => {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  return column === '値' ? row.cells.join(' ') : bare(row.by[column] ?? '')
}

/** @purity pure */
const settingNumberOf = (id: string): number => Number(/-?\d+(?:\.\d+)?/.exec(settingCell(id, '既定'))?.[0] ?? Number.NaN)

describe('CR-787 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-156 (MUST) -- two lines', FR_156_TWO_LINES],
    ['FR-156 -- two-digit hours, zero is +-00:00', FR_156_DIGITS],
    ['FR-156 -- a row without abbreviation closes up line 1', FR_156_NO_ABBREVIATION],
    ['FR-156 -- en places separate with a comma, not and', FR_156_COMMA],
    ['FR-156 (MUST) -- the two-line list', FR_156_LIST],
    ['FR-156 -- a press outside closes without choosing', FR_156_OUTSIDE],
    ['FR-156 -- S-607 choices before the list scrolls', FR_156_SCROLL],
    ['FR-156 (MUST) -- line 1 is the floor, the place wraps inside the field', FR_156_WRAP],
    ['FR-052 (MUST) -- the width starts at the default of the kind shown', FR_052_STARTS],
    ['FR-052 (MUST) -- a kind change goes back to the new default', FR_052_KIND_CHANGE],
    ['T-380 RN-3 -- the edges read as one row each', RN_3_JOINED],
    ['T-380 RN-3 -- storage unchanged', RN_3_KEEPS_STORAGE],
    ['FR-159 (MUST) -- the first task start above the field', FR_159_FIRST_START],
  ])('01-04 still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// see T-206, S-171, S-602, S-603, S-604, S-605, S-606, S-607, S-248
describe('T-206 -- S-171 and S-602..S-607 as table T-206 holds them', () => {
  it.each([
    ['S-171', '文書の設定の面を出したプロパティパネルの既定の幅'],
    ['S-602', 'タスク（マイルストーンを含む）を出したプロパティパネルの既定の幅'],
    ['S-603', 'タスクグループを出したプロパティパネルの既定の幅'],
    ['S-604', 'コメントボックスを出したプロパティパネルの既定の幅'],
    ['S-605', 'ハイライトボックスを出したプロパティパネルの既定の幅'],
    ['S-606', '依存線を出したプロパティパネルの既定の幅'],
  ])('FR-052: %s is the default width of the kind its row names, a px number at or above S-248', (id, kind) => {
    expect(settingCell(id, '値')).toContain(kind)
    expect(settingCell(id, '既定')).toMatch(/^\d+px$/)
    expect(settingNumberOf(id)).toBeGreaterThanOrEqual(settingNumberOf('S-248'))
  })

  it('FR-052: S-171 is the settings face default in 10 px steps, and the other defaults are their own rows', () => {
    expect(settingNumberOf('S-171') % 10).toBe(0)
    expect(SETTINGS_BOOK).toContain('ほかの中身の既定の幅は `S-602`〜`S-606` が持つ')
  })

  it('FR-156: S-607 is a whole count of choices, marked as not measured', () => {
    expect(settingCell('S-607', '値')).toContain('2 行の選択肢の一覧が、中で送らずに見せる選択肢の数')
    expect(Number.isInteger(settingNumberOf('S-607'))).toBe(true)
    expect(settingNumberOf('S-607')).toBeGreaterThan(0)
    expect(settingCell('S-607', '既定')).toContain('🔎')
  })
})

// see FR-156, T-376, FR-038
describe(`FR-156 -- ${FR_156_TWO_LINES}`, () => {
  it.each([
    ['ZN-61', 'ja', 'UTC +09:00 JST', '東京'],
    ['ZN-35', 'en', 'UTC -07:00 MST', 'Mountain Standard Time (US, Canada)'],
    ['ZN-29', 'ja', 'UTC -12:00', '日付変更線の西'],
    ['ZN-29', 'en', 'UTC -12:00', 'International Date Line West'],
    ['ZN-47', 'ja', 'UTC ±00:00 UTC', '協定世界時・ロンドン'],
    ['ZN-57', 'en', 'UTC +05:30 IST', 'India'],
    ['ZN-67', 'en', 'UTC +13:00 NZDT', 'Auckland Daylight Time'],
  ] as const)('FR-156 (MUST): %s in %s reads "%s" over "%s"', (rowId, language, head, place) => {
    const row = T_376_ROWS.find((one) => one.id === rowId)
    if (row === undefined) throw new Error(`table T-376 has no row ${rowId}`)
    expect(timeZoneLinesOf(row.key, language)).toEqual([head, place])
  })

  it('FR-156: line 1 is the zoneHead shape filled, and line 2 is the dictionary place, for every row in both languages', () => {
    for (const row of T_376_ROWS) {
      for (const language of LANGUAGES) {
        const shape = timeZoneWord('zoneHead', language)
        const head = (row.abbreviation === null ? shape.replace(' {abbreviation}', '') : shape.replace('{abbreviation}', row.abbreviation))
          .replace('{offset}', zoneOffsetTextOf(row.offsetMinutes))
        expect(timeZoneLinesOf(row.key, language), `${row.id} ${language}`).toEqual([head, placeOf(row.id, language)])
      }
    }
  })

  it(`FR-156: ${FR_156_DIGITS} -- zoneOffsetTextOf`, () => {
    expect([-720, -420, -60, 0, 330, 540, 780].map(zoneOffsetTextOf)).toEqual(['-12:00', '-07:00', '-01:00', '±00:00', '+05:30', '+09:00', '+13:00'])
  })

  it(`FR-156: ${FR_156_COMMA} -- no en place holds " and "`, () => {
    const places = (WORDS['timeZones'] as readonly Loose[]).map((one) => String(one['label']['en']))
    expect(places).toHaveLength(T_376_ROWS.length)
    expect(places.filter((one) => / and /i.test(one))).toEqual([])
  })

  it('FR-038: the dictionary keeps zoneHead and no longer holds zoneName', () => {
    const parts = (WORDS['timeZoneField'] as readonly Loose[]).map((one) => one['part'])
    expect(parts).toContain('zoneHead')
    expect(parts).not.toContain('zoneName')
  })
})

/** @purity pure */
const fieldOf = (language: DisplayLanguage, row: string, settings: Loose = {}): PropertyField => {
  const found = settingsPanel({ language, settings }).fields.find((one) => one.row === row)
  if (found === undefined) throw new Error(`the settings face draws no row ${row}`)
  return found
}

/** @purity pure */
const chooserOf = (field: PropertyField): PropertyControl => {
  const found = field.controls.find((one) => one.choiceLines !== undefined)
  if (found === undefined) throw new Error(`row ${field.row} carries no two-line chooser`)
  return found
}

// see FO-14, FO-15, FR-156
describe('FO-14 / FO-15 -- the zone fields carry their choices on two lines', () => {
  it.each(LANGUAGES)('FR-156 (MUST), %s: the base field (K-144) offers the standard rows as their two lines, beside choiceValues', (language) => {
    const chooser = chooserOf(fieldOf(language, 'K-144'))
    const standard = T_376_ROWS.filter((one) => !one.isDaylight)
    expect(chooser.choiceLines).toEqual(standard.map((one) => timeZoneLinesOf(one.key, language)))
    expect(chooser.choiceValues).toHaveLength(standard.length)
  })

  it.each(LANGUAGES)('FR-156 (MUST), %s: a display field (K-145:1) offers none and then every row on two lines', (language) => {
    const chooser = chooserOf(fieldOf(language, 'K-145:1'))
    expect(chooser.choiceLines?.slice(1)).toEqual(T_376_ROWS.map((one) => timeZoneLinesOf(one.key, language)))
    expect(chooser.choiceLines?.[0]?.join(' ')).toContain(timeZoneWord('none', language))
    expect(chooser.choiceValues).toHaveLength(T_376_ROWS.length + 1)
    expect(chooser.choices).toHaveLength(T_376_ROWS.length + 1)
  })
})

interface Rig {
  readonly mount: FakeElement
  readonly changes: string[]
  click(node: FakeElement): void
  pointerDownOn(node: FakeElement): void
}

// WHY: the element's own world, so a node drawn by any rig of this file bubbles through its own listeners.
const worldOf = (node: FakeElement): World => (node as unknown as { world: World }).world

// WHY: the shared fake has no dispatchEvent and its host no listeners; a browser bubbles from the node up, after the
// capturing listeners of the document.
function rig(): { readonly host: Document; readonly rigged: (field: HTMLElement) => Rig } {
  const built = stage()
  const hostListeners: { type: string; listener: (event: FakeEvent) => void }[] = []
  const fire = (source: FakeElement, type: string, withHost: boolean): void => {
    const event = { type, target: source, currentTarget: null, defaultPrevented: false, bubbles: true, preventDefault: () => undefined } as unknown as FakeEvent
    if (withHost) for (const one of [...hostListeners]) if (one.type === type) one.listener(event)
    for (let at: FakeElement | null = source; at !== null; at = at.parentNode) {
      for (const one of [...worldOf(at).registrations]) {
        if (one.node !== at || one.type !== type) continue
        ;(event as { currentTarget: FakeElement | null }).currentTarget = at
        one.listener(event)
      }
    }
  }
  // WHY: each element is given its own dispatchEvent, so no prototype changes for any other file (--no-isolate).
  const armed = (root: FakeElement): void => {
    for (const node of selfAndDescendants(root)) {
      if (typeof (node as unknown as Record<string, unknown>)['dispatchEvent'] === 'function') continue
      Object.defineProperty(node, 'dispatchEvent', {
        value: (event: Event): boolean => {
          fire(node, event.type, false)
          return true
        },
        configurable: true,
      })
      Object.defineProperty(node, 'parentElement', { get: () => node.parentNode, configurable: true })
    }
  }
  const host = {
    createElement: (tagName: string): FakeElement => new FakeElement(tagName, built.world),
    addEventListener: (type: string, listener: (event: FakeEvent) => void): void => {
      hostListeners.push({ type, listener })
    },
    removeEventListener: (type: string, listener: (event: FakeEvent) => void): void => {
      const at = hostListeners.findIndex((one) => one.type === type && one.listener === listener)
      if (at >= 0) hostListeners.splice(at, 1)
    },
  } as unknown as Document
  return {
    host,
    rigged: (field) => {
      const mount = new FakeElement('div', built.world)
      mount.isMount = true
      mount.append(field as unknown as FakeElement)
      const changes: string[] = []
      built.world.registrations.push({
        node: mount,
        type: 'change',
        listener: (event) => {
          changes.push((event.target as FakeElement | null)?.getAttribute('value') ?? '')
        },
      })
      return {
        mount,
        changes,
        click: (node) => {
          armed(mount)
          fire(node, 'click', true)
        },
        pointerDownOn: (node) => {
          armed(mount)
          fire(node, 'pointerdown', true)
        },
      }
    },
  }
}

// see FO-14, FR-156
describe(`FO-14 -- ${FR_156_LIST}`, () => {
  const ROW = 'K-144'

  const drawn = (language: DisplayLanguage = 'ja') => {
    const { host, rigged } = rig()
    const field = fieldOf(language, ROW)
    const line = fieldElement(host, field, null)
    const built = rigged(line)
    const twoLine = built.mount.querySelector(`[data-two-line-choice="${ROW}"]`)
    if (twoLine === null) throw new Error(`no data-two-line-choice="${ROW}" is drawn`)
    const shown = twoLine.children.find((one) => one.tagName === 'BUTTON')
    if (shown === undefined) throw new Error('the two-line field holds no button')
    const list = (): FakeElement | null => twoLine.querySelector(`[data-two-line-list="${ROW}"]`)
    // WHY: a list left open by an earlier case stays open across a redraw of the same field; start each case closed.
    if (list() !== null) built.click(shown)
    return { field, built, twoLine, shown, list }
  }

  it.each(LANGUAGES)('FR-156 (MUST), %s: the closed field shows the chosen zone on its two lines and no list', (language) => {
    const { shown, list } = drawn(language)
    // WHY: the startup document shows its schedule data zone (S-574 null), so the base field holds it.
    const base = String((TEMPLATE.documentSettings as Loose)['viewTimeZone'] ?? (TEMPLATE.schedule.project as Loose)['scheduleDataTimeZone'])
    const [head, place] = timeZoneLinesOf(base, language)
    expect(zoneRowOfKey(base).id, 'premise: the startup base is a T-376 row').toMatch(/^ZN-\d+$/)
    expect(shown.textContent).toContain(head)
    expect(shown.textContent).toContain(place)
    expect(list()).toBeNull()
  })

  it('FR-156 (MUST): pressing the field opens, inside it, one button per choice carrying the choice value and its two lines', () => {
    const { field, built, shown, list } = drawn()
    built.click(shown)
    const opened = list()
    expect(opened, 'the list is open').not.toBeNull()
    const chooser = chooserOf(field)
    const buttons = (opened as FakeElement).children.filter((one) => one.tagName === 'BUTTON')
    expect(buttons.map((one) => one.getAttribute('value'))).toEqual(chooser.choiceValues)
    buttons.forEach((one, at) => {
      const [head, place] = chooser.choiceLines?.[at] ?? ['', '']
      expect(one.textContent, `choice ${String(at)}`).toContain(head)
      expect(one.textContent, `choice ${String(at)}`).toContain(place)
    })
  })

  it('FR-156 (MUST): pressing a choice raises one change from that choice and closes the list', () => {
    const { field, built, shown, list } = drawn()
    built.click(shown)
    const values = chooserOf(field).choiceValues ?? []
    const target = values[3] ?? ''
    const choice = (list() as FakeElement).children.find((one) => one.getAttribute('value') === target)
    if (choice === undefined) throw new Error('premise: the fourth choice is drawn')
    built.click(choice)
    expect(built.changes).toEqual([target])
    expect(list(), 'the list closed').toBeNull()
  })

  it('FR-156: pressing the field again closes the open list without choosing', () => {
    const { built, shown, list } = drawn()
    built.click(shown)
    expect(list(), 'premise: the list is open').not.toBeNull()
    built.click(shown)
    expect(list()).toBeNull()
    expect(built.changes).toEqual([])
  })

  it(`FR-156: ${FR_156_OUTSIDE}`, () => {
    const { built, shown, list } = drawn()
    built.click(shown)
    expect(list(), 'premise: the list is open').not.toBeNull()
    const outside = new FakeElement('div', (built.mount as unknown as { world: never }).world)
    built.mount.append(outside)
    built.pointerDownOn(outside)
    expect(list()).toBeNull()
    expect(built.changes).toEqual([])
  })

  it('FR-156: a press inside the open list does not close it before a choice is made', () => {
    const { built, shown, list } = drawn()
    built.click(shown)
    const opened = list() as FakeElement
    built.pointerDownOn(opened)
    expect(list()).not.toBeNull()
  })
})

// see T-380, RN-3, T-369, JDG-2469
describe(`T-380 RN-3 -- ${RN_3_JOINED}`, () => {
  const groupName = (TEMPLATE.schedule.taskGroups as readonly Loose[]).find((one) => one['id'] === FIRST_GROUP_ID)?.['name'] as string
  const readOnly = (language: DisplayLanguage, settings: Loose): readonly PropertyField[] =>
    settingsPanel({ language, settings }).fields.filter((one) => one.readOnlyGroup !== undefined)

  it.each(LANGUAGES)('RN-3, %s: the left edge row (K-69) is named viewLeftEdge and reads yyyy/mm/dd hh:mm', (language) => {
    const fields = readOnly(language, { scrollDate: '2026-04-01T00:00:00', scrollDayOffset: 1 / 3 })
    const left = fields.find((one) => one.row === 'K-69')
    expect(left?.name).toBe(partWord(SECTION, 'viewLeftEdge', language))
    expect(left?.text).toBe('2026/04/01 08:00')
  })

  it('RN-3: the hour of the left edge takes two digits', () => {
    const left = readOnly('ja', { scrollDate: '2026-12-31T00:00:00', scrollDayOffset: 0.25 }).find((one) => one.row === 'K-69')
    expect(left?.text).toBe('2026/12/31 06:00')
  })

  it.each(LANGUAGES)('RN-3, %s: the top edge row (K-70) is named viewTopEdge and reads groupFromTop with the name and the percent', (language) => {
    const fields = readOnly(language, { scrollTaskGroupId: FIRST_GROUP_ID, scrollGroupOffset: 0.25 })
    const top = fields.find((one) => one.row === 'K-70')
    expect(top?.name).toBe(partWord(SECTION, 'viewTopEdge', language))
    const percent = partWord(SECTION, 'percent', language).replace('{n}', '25')
    expect(top?.text).toBe(partWord(SECTION, 'groupFromTop', language).replace('{name}', groupName).replace('{percent}', percent))
  })

  it('RN-3: 0% is written in the same shape (no topZero word)', () => {
    const top = readOnly('ja', { scrollTaskGroupId: FIRST_GROUP_ID, scrollGroupOffset: 0 }).find((one) => one.row === 'K-70')
    expect(top?.text).toBe(partWord(SECTION, 'groupFromTop', 'ja').replace('{name}', groupName).replace('{percent}', '0%'))
  })

  it.each(LANGUAGES)('RN-3, %s: no view place reads notSet and notSetFromTop; an id not in the document reads notSetFromTop', (language) => {
    const fields = readOnly(language, { scrollDate: null, scrollTaskGroupId: null })
    expect(fields.find((one) => one.row === 'K-69')?.text).toBe(partWord(SECTION, 'notSet', language))
    expect(fields.find((one) => one.row === 'K-70')?.text).toBe(partWord(SECTION, 'notSetFromTop', language))
    const stray = readOnly(language, { scrollTaskGroupId: '00000000-0000-4000-8000-00000000dead', scrollGroupOffset: 0.5 })
    expect(stray.find((one) => one.row === 'K-70')?.text).toBe(partWord(SECTION, 'notSetFromTop', language))
  })

  it.each(LANGUAGES)('RN-3, %s: the day offset (K-121) and the group offset (K-120) are not rows of their own', (language) => {
    const rows = readOnly(language, { scrollDate: '2026-04-01T00:00:00', scrollDayOffset: 0.5, scrollTaskGroupId: FIRST_GROUP_ID, scrollGroupOffset: 0.5 }).map(
      (one) => one.row,
    )
    expect(rows).toContain('K-69')
    expect(rows).toContain('K-70')
    expect(rows).not.toContain('K-121')
    expect(rows).not.toContain('K-120')
  })

  it('RN-3: the dictionary dropped dayOffset and topZero and holds the three new parts', () => {
    const parts = (WORDS[SECTION] as readonly Loose[]).map((one) => one['part'])
    expect(parts).toEqual(expect.arrayContaining(['viewLeftEdge', 'viewTopEdge', 'groupFromTop']))
    expect(parts).not.toContain('dayOffset')
    expect(parts).not.toContain('topZero')
  })

  it.each(LANGUAGES)('T-369, %s: the read-only heading is the readOnlySettings heading word', (language) => {
    expect(settingsPanel({ language }).readOnlyHeading).toBe(partWord(SECTION, 'heading', language))
  })

  it('CR-787: the heading words are 表示専用/変更不可 and Read-only, and the edge names are the ones the CR named', () => {
    expect([partWord(SECTION, 'heading', 'ja'), partWord(SECTION, 'heading', 'en')]).toEqual(['表示専用/変更不可', 'Read-only'])
    expect([partWord(SECTION, 'viewLeftEdge', 'en'), partWord(SECTION, 'viewTopEdge', 'en')]).toEqual(['Left Edge Date-Time', 'Top Edge Task Group'])
    expect([partWord(SECTION, 'viewLeftEdge', 'ja'), partWord(SECTION, 'viewTopEdge', 'ja')]).toEqual(['日程表の左端の日時', '日程表の上端のタスクグループ'])
  })
})

// see FR-159, T-379, WH-1, FO-17, TX-12
describe(`FR-159 -- ${FR_159_FIRST_START}`, () => {
  const word = (language: DisplayLanguage): string =>
    String((WORDS['wholeScheduleShiftField'] as readonly Loose[]).find((one) => one['part'] === 'currentStart')?.['text'][language])

  it('WH-1: the dictionary word is 最初のタスクの開始日: {date} / First task start: {date}', () => {
    expect([word('ja'), word('en')]).toEqual(['最初のタスクの開始日: {date}', 'First task start: {date}'])
  })

  it.each(LANGUAGES)('WH-1, %s: the FO-17 row reads the word with the earliest Task start of the document as yyyy/mm/dd', (language) => {
    const starts = (TEMPLATE.schedule.tasks as readonly Loose[]).map((one) => String(one['start'] ?? '')).filter((one) => /^\d{4}-\d{2}-\d{2}/.test(one))
    const earliest = [...starts].sort()[0] ?? ''
    expect(earliest, 'premise: the startup document holds a Task with a start').not.toBe('')
    const readout = settingsPanel({ language }).fields.find((one) => one.row === 'FO-17')?.readout ?? ''
    expect(readout.split('\n')[0]).toBe(word(language).replace('{date}', earliest.slice(0, 10).split('-').join('/')))
  })
})
