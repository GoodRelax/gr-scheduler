// CR-754 spec-only cases: FR-072 / T-369 / T-380 -- the read-only rows of the settings face, grouped, named and worded (DFC-2527), and FO-12's unit.

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage, PropertiesPanel, PropertyField } from '../../src/adapter/screen-renderer/screen-renderer'
import { selfAndDescendants, type FakeElement } from '../fixtures/fake-browser'
import { specTable } from './spec-table'
import {
  drawnPanel,
  FIRST_GROUP_ID,
  iconLabel,
  LANGUAGES,
  MARKED_WORDS,
  partWord,
  REQUIREMENTS,
  settingLabel,
  settingsPanel,
  surfaceHeading,
  TEMPLATE,
  type Loose,
} from './cr-754-stage'

// see FR-072, T-369, T-380
const T_369_AFTER_FO_16 = '本表に行を持たない設定の値は、本要求の読むだけの行として `FO-16` の後に、表 T-380 の組と並びで置くこと（MUST）'
const T_369_HEADINGS = '⭐ 読むだけの行の前に、`FR-038` の辞書の `readOnlySettings` の `heading` の語の 1 行を置き、組ごとに見出しを置くこと（MUST）'
const T_369_FOLDABLE = '見出しを押すとその組を畳め、初めはどの組も開いている。'
const T_369_WORDS = '⭐ 行の名は 表 T-380 の「名の語」、値は同表の「値の見せ方」の字とすること（MUST）'
const T_369_NO_RAW =
  '⛔ 値を保存の字のまま（`true`・`auto`・`0.8666666666666667`・`2026-03-29T00:00:00` など）見せてはならない（MUST NOT）'
const T_369_NO_CONTROL = '⛔ 読むだけの行に操作子を置いてはならない（MUST NOT）'
const T_369_FO_12 = '⭐ 数の欄の右に単位の語を置く —— 名からは単位を外し、名は 2 行（`FR-006` の折り方）に収める'

const SECTION = 'readOnlySettings'
const TIME_SHIFT = 'IC-162'
const DELAY_TOLERANCE = 'K-140'

// see T-380
// WHY: CR-787 (JDG-2469) -- a row may join two stored keys in one cell segment; partner is the second of them.
interface ReadOnlyRow {
  readonly rowId: string
  readonly group: string
  readonly section: string | null
  readonly key: string
  readonly partner: string | null
  readonly name: string
}

/** @purity pure */
const ticked = (cell: string): readonly string[] => [...cell.matchAll(/`([^`]+)`/g)].map((one) => one[1] ?? '')

// WHY: T-380 read row by row; "the same group" and "the same as RN-6" are resolved against the rows above.
const T_380: readonly ReadOnlyRow[] = (() => {
  const rows: ReadOnlyRow[] = []
  let group = ''
  const keysOf = new Map<string, readonly (readonly string[])[]>()
  const namesOf = new Map<string, readonly string[]>()
  for (const row of specTable('T-380').rows) {
    const groupCell = row.by['組'] ?? ''
    group = ticked(groupCell).find((one) => one.startsWith('group')) ?? group
    const section = /小見出しは `([^`]+)`/.exec(groupCell)?.[1] ?? null
    const keyCell = row.by['行（設定の鍵、上から）'] ?? ''
    const keyTokens = ticked(keyCell)
    const reusedKeys = keyTokens.find((one) => /^RN-\d+$/.test(one))
    const prefix = keyTokens[0]?.startsWith('tableViews.') === true ? `${keyTokens[0]}.` : ''
    // WHY: one displayed row per segment of the key cell; a segment of two keys is one row (T-380, RN-3, CR-787).
    const segments: readonly (readonly string[])[] = keyCell
      .split('・')
      .map((segment) => ticked(segment).filter((one) => !one.startsWith('tableViews.')))
      .filter((segment) => segment.length > 0)
    const own = reusedKeys !== undefined ? (keysOf.get(reusedKeys) ?? []) : segments
    // WHY: the section name readOnlySettings in the name cell says where the words live; it names no row.
    const nameTokens = ticked(row.by['名の語'] ?? '').filter((one) => one !== 'readOnlySettings')
    const reusedNames = nameTokens.find((one) => /^RN-\d+$/.test(one))
    const names = reusedNames !== undefined ? (namesOf.get(reusedNames) ?? []) : nameTokens
    keysOf.set(row.id, own)
    namesOf.set(row.id, names)
    own.forEach((keys, at) =>
      rows.push({
        rowId: row.id,
        group,
        section,
        key: `${prefix}${keys[0] ?? ''}`,
        partner: keys[1] === undefined ? null : `${prefix}${keys[1]}`,
        name: names[at] ?? `(no name for ${keys.join(' + ')})`,
      }),
    )
  }
  return rows
})()

/** @purity pure */
const nameWordOf = (name: string, language: DisplayLanguage): string =>
  /^K-\d+$/.test(name) ? settingLabel(name, language) : partWord(SECTION, name, language)

/** @purity pure */
const word = (part: string, language: DisplayLanguage, fill: Record<string, string> = {}): string =>
  Object.entries(fill).reduce((text, [slot, value]) => text.split(`{${slot}}`).join(value), partWord(SECTION, part, language))

/** @purity pure */
function columnWord(rowId: string, language: DisplayLanguage): string {
  for (const section of ['searchColumns', 'resourceListColumns', 'delayReportColumns']) {
    const found = (MARKED_WORDS[section] as readonly Loose[]).find((one) => one['rowId'] === rowId)
    if (found !== undefined) return found['text'][language] as string
  }
  throw new Error(`no table heading word for column ${rowId}`)
}

/** @purity pure */
const valueAt = (settings: Loose, key: string): unknown => key.split('.').reduce<unknown>((at, part) => (at as Loose | undefined)?.[part], settings)

/** @purity pure */
const percentOf = (ratio: number): string => String(Math.round(ratio * 100))

/** @purity pure */
const twoDigits = (n: number): string => String(n).padStart(2, '0')

// see T-380, RN-3
// WHY: the date of scrollDate and the ratio of the day scrollDateFraction as a time from 0:00, hours two digits.
/** @purity pure */
function leftEdgeText(date: string, dayOffset: number): string {
  const minutes = Math.round(dayOffset * 24 * 60)
  return `${date.slice(0, 10).split('-').join('/')} ${twoDigits(Math.floor(minutes / 60))}:${twoDigits(minutes % 60)}`
}

// see T-380
/** @purity pure */
function expectedValue(key: string, settings: Loose, language: DisplayLanguage): string | RegExp {
  const value = valueAt(settings, key)
  const leaf = key.split('.').pop() ?? key
  if (leaf === 'isBaselineVisible') return word(value === true ? 'overlaid' : 'notOverlaid', language)
  if (leaf === 'isThemeMonochrome') return word(value === true ? 'monochrome' : 'color', language)
  if (leaf === 'isScheduleFilterApplied') return word(value === true ? 'filterOn' : 'filterOff', language)
  if (leaf === 'isUnassignedHidden') return word(value === true ? 'hidden' : 'shown', language)
  if (typeof value === 'boolean') return word(value ? 'shown' : 'hidden', language)
  if (leaf === 'zoomX' || leaf === 'zoomY') return word('percent', language, { n: percentOf(value as number) })
  // WHY: CR-787 -- RN-3 joins scrollDate with scrollDateFraction, and scrollTaskGroupId with scrollTaskGroupFraction.
  if (leaf === 'scrollDate') return value === null ? word('notSet', language) : leftEdgeText(String(value), Number(settings['scrollDateFraction']))
  if (leaf === 'scrollTaskGroupId') {
    const name = (TEMPLATE.schedule.taskGroups as readonly Loose[]).find((one) => one['id'] === value)?.['name']
    if (value === null || name === undefined) return word('notSetFromTop', language)
    const percent = word('percent', language, { n: percentOf(Number(settings['scrollTaskGroupFraction'])) })
    return word('groupFromTop', language, { name: String(name), percent })
  }
  if (leaf === 'levelZeroTreeState') return word(value === 'collapsed' ? 'collapsed' : 'expandedAuto', language)
  if (leaf === 'rulerFontSizePx' || leaf === 'rulerHeightPx') return word('pixels', language, { n: String(value) })
  if (leaf === 'stackDirection') return word(value === 'down' ? 'stackDown' : 'stackUp', language)
  if (leaf === 'columnFilters') {
    const count = (value as readonly unknown[]).length
    if (count === 0) return word('none', language)
    return word(count === 1 ? 'columnCountOne' : 'columnCount', language, { n: String(count) })
  }
  if (Array.isArray(value)) return value.length === 0 ? word('none', language) : word('itemCount', language, { n: String(value.length) })
  if (leaf === 'sort') {
    if (value === null) return word('defaultOrder', language)
    const sort = value as { readonly column: string; readonly direction: string }
    return word(sort.direction === 'descending' ? 'sortDescending' : 'sortAscending', language, { column: columnWord(sort.column, language) })
  }
  throw new Error(`T-380 states no value form for ${key}`)
}

const FILTER = { column: 'SQ-5', hiddenValues: ['x'], fromDate: null, toDate: null }

// WHY: every value of T-380 moved off the startup document's, so each value form is pressed at least once off its default.
const MOVED: Loose = {
  isPlanVisible: false,
  isActualVisible: false,
  isProgressMarkerVisible: false,
  isDependencyVisible: false,
  isProgressLineVisible: true,
  isBaselineVisible: true,
  isAssigneeVisible: true,
  isPercentCompleteVisible: true,
  isPlanDatesVisible: true,
  zoomX: 1.5,
  zoomY: 0.75,
  scrollDate: '2026-03-29T00:00:00',
  scrollDateFraction: 0.5,
  scrollTaskGroupId: FIRST_GROUP_ID,
  scrollTaskGroupFraction: 0.25,
  pinnedTaskGroupIds: [FIRST_GROUP_ID],
  levelZeroTreeState: 'collapsed',
  isDateGridLinesVisible: true,
  isGroupGridLinesVisible: false,
  isThemeMonochrome: true,
  rulerFontSizePx: 18,
  rulerHeightPx: 60,
  stackDirection: 'down',
  tableViews: {
    searchPanel: { isScheduleFilterApplied: true, hiddenTaskUids: [1, 2, 3], columnFilters: [FILTER], sort: { column: 'SQ-5', direction: 'descending' } },
    resourceList: {
      isScheduleFilterApplied: true,
      hiddenResourceUids: [7],
      isUnassignedHidden: true,
      columnFilters: [
        { ...FILTER, column: 'RQ-2' },
        { ...FILTER, column: 'RQ-3' },
      ],
      sort: { column: 'RQ-2', direction: 'ascending' },
    },
    delayDiagnosticsReport: { isScheduleFilterApplied: false, hiddenTaskUids: [], columnFilters: [], sort: { column: 'DT-1', direction: 'ascending' } },
  },
}

const STARTUP = TEMPLATE.documentSettings as unknown as Loose
const LOOKS: readonly (readonly [string, Loose])[] = [
  ['the startup document', STARTUP],
  ['every value moved', { ...STARTUP, ...MOVED }],
]

/** @purity pure */
const readOnlyFieldsOf = (panel: PropertiesPanel): readonly PropertyField[] => panel.fields.filter((one) => one.readOnlyGroup !== undefined)

/** @purity pure */
const panelOf = (language: DisplayLanguage, settings: Loose = STARTUP): PropertiesPanel => settingsPanel({ language, settings })

const RAW = /^(?:true|false|auto|collapsed|up|down|null|undefined|\[\])$/
const RAW_INSTANT = /T\d{2}:\d{2}:\d{2}/
const RAW_FRACTION = /\d\.\d{3,}/

describe('CR-754 premise -- the clauses and table T-380 these cases read', () => {
  it.each([T_369_AFTER_FO_16, T_369_HEADINGS, T_369_FOLDABLE, T_369_WORDS, T_369_NO_RAW, T_369_NO_CONTROL, T_369_FO_12])('01-04 holds %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-380 reads as six groups, RN-6 to RN-8 sharing one, the table views headed by three windows', () => {
    expect([...new Set(T_380.map((one) => one.group))]).toEqual([
      'groupShowHide',
      'groupLabels',
      'groupView',
      'groupGridLinesAndColor',
      'groupRulerAndStack',
      'groupTableViews',
    ])
    expect([...new Set(T_380.map((one) => one.section).filter((one) => one !== null))]).toEqual([
      'Search Panel',
      'Resource List',
      'Delay Diagnostics Report',
    ])
    expect(T_380.filter((one) => one.rowId === 'RN-8').map((one) => one.key.split('.').pop())).toEqual(
      T_380.filter((one) => one.rowId === 'RN-6').map((one) => one.key.split('.').pop()),
    )
  })

  it('JDG-2103: the column filters read "列ごとのフィルタ"', () => {
    expect(partWord(SECTION, 'columnFilters', 'ja')).toBe('列ごとのフィルタ')
  })

  it('JDG-2234 / JDG-2240: the en words are Shown / Hidden, View, Hidden Resources, and the eleven true-false rows read as the things', () => {
    expect([partWord(SECTION, 'shown', 'en'), partWord(SECTION, 'hidden', 'en')]).toEqual(['Shown', 'Hidden'])
    expect(partWord(SECTION, 'groupView', 'en')).toBe('View')
    expect(partWord(SECTION, 'hiddenResources', 'en')).toBe('Hidden Resources')
    const things = ['K-122', 'K-123', 'K-78', 'K-77', 'K-79', 'K-84', 'K-75', 'K-76', 'K-124', 'K-82', 'K-83'].map((one) => settingLabel(one, 'en'))
    expect(things).toEqual([
      'Plan',
      'Actual',
      'Progress Marker',
      'Dependency Lines',
      'Progress Line',
      'Baseline',
      'Assignee Label',
      'Percent Complete Label',
      'Planned Dates',
      'Date Grid Lines',
      'Group Grid Lines',
    ])
  })
})

describe(`T-369 -- ${T_369_AFTER_FO_16}`, () => {
  it.each(LANGUAGES)('%s: the read-only rows come after FO-16 and nothing else does', (language) => {
    const fields = panelOf(language).fields
    const shift = fields.findIndex((one) => one.name === iconLabel(TIME_SHIFT, language))
    expect(shift, 'premise: FO-16 is a field of the settings face').toBeGreaterThanOrEqual(0)
    const firstReadOnly = fields.findIndex((one) => one.readOnlyGroup !== undefined)
    expect(firstReadOnly).toBe(shift + 1)
    expect(fields.slice(firstReadOnly).every((one) => one.readOnlyGroup !== undefined)).toBe(true)
  })

  it.each(LANGUAGES)('%s: the rows stand in the groups and the order of T-380, every group and window named by the dictionary', (language) => {
    const drawn = readOnlyFieldsOf(panelOf(language)).map((one) => ({
      group: one.readOnlyGroup?.name,
      section: one.readOnlyGroup?.section ?? null,
      name: one.name,
    }))
    const expected = T_380.map((one) => ({
      group: partWord(SECTION, one.group, language),
      section: one.section === null ? null : surfaceHeading(one.section, language),
      name: nameWordOf(one.name, language),
    }))
    expect(drawn).toEqual(expected)
  })

  it('a group keeps one key across its rows, and no two groups share one', () => {
    const fields = readOnlyFieldsOf(panelOf('ja'))
    const keyOfGroup = new Map<string, string>()
    fields.forEach((field, at) => {
      const group = T_380[at]?.group ?? ''
      const key = field.readOnlyGroup?.key ?? ''
      expect(keyOfGroup.get(group) ?? key, field.name).toBe(key)
      keyOfGroup.set(group, key)
    })
    expect(new Set(keyOfGroup.values()).size).toBe(keyOfGroup.size)
  })
})

describe(`T-369 -- ${T_369_WORDS}`, () => {
  it.each(LOOKS.flatMap(([name, settings]) => LANGUAGES.map((language) => [name, language, settings] as const)))(
    '%s, %s: every value is shown in the words of T-380',
    (_name, language, settings) => {
      const fields = readOnlyFieldsOf(panelOf(language, settings))
      expect(fields).toHaveLength(T_380.length)
      fields.forEach((field, at) => {
        const row = T_380[at] as ReadOnlyRow
        const expected = expectedValue(row.key, settings, language)
        if (expected instanceof RegExp) expect(field.text, row.key).toMatch(expected)
        else expect(field.text, row.key).toBe(expected)
      })
    },
  )
})

describe(`T-369 -- ${T_369_NO_RAW}`, () => {
  it.each(LOOKS.flatMap(([name, settings]) => LANGUAGES.map((language) => [name, language, settings] as const)))(
    '%s, %s: no value is the stored text',
    (_name, language, settings) => {
      for (const field of readOnlyFieldsOf(panelOf(language, settings))) {
        expect(field.text, field.name).not.toMatch(RAW)
        expect(field.text, field.name).not.toMatch(RAW_INSTANT)
        expect(field.text, field.name).not.toMatch(RAW_FRACTION)
        expect(field.text.trim(), field.name).not.toBe('')
      }
    },
  )

  it('a scroll offset of the day such as 0.8666666666666667 reads as a time on the left edge row (RN-3, CR-787)', () => {
    const settings = { ...STARTUP, scrollDate: '2026-03-29T00:00:00', scrollDateFraction: 0.8666666666666667 }
    const field = readOnlyFieldsOf(panelOf('ja', settings)).find((one) => one.name === partWord(SECTION, 'viewLeftEdge', 'ja'))
    expect(field?.text).toBe(expectedValue('scrollDate', settings, 'ja'))
    expect(field?.text).toBe('2026/03/29 20:48')
  })
})

describe(`T-369 -- ${T_369_NO_CONTROL}`, () => {
  it.each(LANGUAGES)('%s: no read-only row carries a control or reads as editable', (language) => {
    for (const field of readOnlyFieldsOf(panelOf(language))) {
      expect(field.controls, field.name).toEqual([])
      expect(field.isEditable, field.name).toBe(false)
    }
  })

  it('drawn: no input, select, text area or button stands inside a read-only group', () => {
    const groups = selfAndDescendants(drawnPanel(panelOf('ja'))).filter((one) => one.getAttribute('data-read-only-group') !== null)
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      const entries = selfAndDescendants(group).filter((one) => ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(one.tagName))
      expect(entries.map((one) => one.tagName), group.getAttribute('data-read-only-group') ?? '').toEqual([])
    }
  })
})

describe(`T-369 -- ${T_369_HEADINGS}`, () => {
  it.each(LANGUAGES)('%s: the panel carries the heading word of readOnlySettings', (language) => {
    expect(panelOf(language).readOnlyHeading).toBe(partWord(SECTION, 'heading', language))
  })

  it.each(LANGUAGES)(`%s drawn: the heading line, then each group as an open box headed by its name -- ${T_369_FOLDABLE}`, (language) => {
    const drawn = drawnPanel(panelOf(language))
    const children = drawn.children
    const heading = children.findIndex((one) => one.getAttribute('data-read-only-heading') !== null)
    expect(heading, 'premise: the heading line is drawn').toBeGreaterThan(0)
    expect(children[heading]?.textContent).toBe(partWord(SECTION, 'heading', language))
    const boxes = children.slice(heading + 1)
    const groups = [...new Set(T_380.map((one) => one.group))]
    expect(boxes.map((one) => one.tagName)).toEqual(groups.map(() => 'DETAILS'))
    boxes.forEach((box, at) => {
      expect(box.getAttribute('data-read-only-group'), groups[at]).not.toBeNull()
      expect(box.hasAttribute('open'), `${groups[at]} starts open`).toBe(true)
      const summary = box.children[0] as FakeElement
      expect(summary.tagName).toBe('SUMMARY')
      expect(summary.textContent).toBe(partWord(SECTION, groups[at] ?? '', language))
    })
  })

  it.each(LANGUAGES)('%s drawn: the table views group heads each window with its name and no row carries the window name', (language) => {
    const drawn = drawnPanel(panelOf(language))
    const box = drawn.children.find((one) => one.tagName === 'DETAILS' && one.textContent.startsWith(partWord(SECTION, 'groupTableViews', language)))
    expect(box, 'premise: the table views group is drawn').toBeDefined()
    const headings = selfAndDescendants(box as FakeElement).filter((one) => one.getAttribute('data-read-only-section') !== null)
    expect(headings.map((one) => one.textContent)).toEqual(
      ['Search Panel', 'Resource List', 'Delay Diagnostics Report'].map((one) => surfaceHeading(one, language)),
    )
    const windowNames = headings.map((one) => one.textContent)
    for (const field of readOnlyFieldsOf(panelOf(language)).filter((one) => one.readOnlyGroup?.section !== undefined)) {
      for (const name of windowNames) expect(field.name, field.name).not.toContain(name)
    }
  })
})

describe(`T-369 FO-12 -- ${T_369_FO_12}`, () => {
  it.each(LANGUAGES)('%s: the unit is the dictionary word workingDaysUnit, and the name holds no unit', (language) => {
    const field = panelOf(language).fields.find((one) => one.name === settingLabel(DELAY_TOLERANCE, language))
    expect(field, 'premise: FO-12 is a field').toBeDefined()
    const unit = partWord('propertyField', 'workingDaysUnit', language)
    expect(field?.unit).toBe(unit)
    expect(field?.name).not.toContain(unit)
  })

  it.each(LANGUAGES)('%s drawn: the unit word stands right of the number field', (language) => {
    const drawn = drawnPanel(panelOf(language))
    const row = drawn.children.find((one) => one.children[0]?.textContent.split(' ').join(' ') === settingLabel(DELAY_TOLERANCE, language))
    expect(row, 'premise: the FO-12 row is drawn').toBeDefined()
    const nodes = selfAndDescendants(row as FakeElement)
    const input = nodes.findIndex((one) => one.tagName === 'INPUT')
    const unit = nodes.findIndex((one) => one.children.length === 0 && one.textContent === partWord('propertyField', 'workingDaysUnit', language))
    expect(input).toBeGreaterThan(0)
    expect(unit).toBeGreaterThan(input)
  })
})
