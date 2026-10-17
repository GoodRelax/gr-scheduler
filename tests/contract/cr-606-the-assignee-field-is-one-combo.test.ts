// CR-606 spec-only cases, moved to CR-788: the assignee field (T-225 AS-5) is one field over a checked list; its candidates

import { describe, expect, it } from 'vitest'

import { assigneeCandidatesOf } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  AssigneeCombo,
  FieldCommit,
  PropertiesPanel,
  PropertyControl,
  PropertyFieldKey,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import { domScreenSurface } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { selfAndDescendants, stage, wiringOf, type FakeElement } from '../fixtures/fake-browser'
import {
  commandsOf,
  documentOf,
  fieldOf,
  itemOf,
  panelOf,
  personOf,
  propertyFieldWordOf,
  recordOf,
  seatOf,
  taskItem,
  taskOf,
} from './cr-606-stage'
import { specTable, unbroken } from './spec-table'

// see AS-5
// WHY: CR-788 replaced the one-line-per-person combo with one field and an Excel-style checked list (JDG-2472).
const AS_5_ONE_FIELD =
  '⭐ 担当の欄はタスクに 1 つとし、閉じているあいだは主担当（`AS-13`）の名を出し、ほかにも就いているときはその後に `FR-059` の印「, …」を続けること（MUST）'
const AS_5_NOBODY = '就いている担当がいないときは何も出さない。'
const AS_5_OPENS = '⭐ 欄を押すと欄の下に担当の一覧を開き、欄をもう一度押すか一覧と欄の外を押すと閉じること（MUST）'
const AS_5_LIST_SHAPE =
  '⭐ 一覧は、上から、絞り込みの欄、操作の段（`IC-125`・`IC-126`・`IC-123`・`IC-124`）、担当ごとのチェックと名の行とすること（MUST）。'
const AS_5_ROWS = '担当の行は担当リストのすべての担当とし、名の昇順に並べ、`IC-123`（昇順）と `IC-124`（降順）で向きを変える。'
const AS_5_SAME_NAME = '同じ名の担当は `uid` の昇順とする（`uid` を添えるのは `AS-6`）。'
const AS_5_FILTER = '⭐ 絞り込みの欄は、打つたびに、名が打った字を含む担当だけを一覧に出すこと（MUST）'
const AS_5_SV_4 = '比べ方は 表 T-330 の `SV-4` と同じとすること（MUST）'
const AS_5_ADD_ITEM =
  '⭐ 打った字と等しい名の担当がいないときは、一覧の末尾に、打った字を名とする担当を足す項目を 1 つ出すこと（MUST）（語は `FR-038` の辞書）。'
const AS_5_NOT_ON_DASH = '⛔ 打った字が `-` のときは出してはならない（MUST NOT）'
const AS_5_ONE_PRESS = '⭐ チェックを付けると就け（`AS-12`）、外すと解き（`AS-3`）、どちらも押した 1 回で書くこと（MUST）'
// see AS-3, AS-6, AS-7, AS-12
const AS_3_ONLY_THAT_ONE = '⭐ 解くのはチェックを外した担当の割当だけであり、ほかの割当を解いてはならない（MUST NOT）。'
const AS_6_ONLY_COLLAPSING = '⚠️ **添えてよいのは潰れる候補だけである**'
const AS_7_ONLY_THE_ADD_ITEM = '⛔ `Resource` を作るのは、`AS-5` の足す項目を選んだときだけとすること（MUST）。'
const AS_7_NOT_BY_TYPING =
  '打っただけの字（何も選ばずに `Enter` を押した・焦点が欄を離れた）で作ってはならない（MUST NOT）'
const AS_12_ADDS = 'ほかの割当を解いてはならない（MUST NOT） —— チェックを付けるのは足すことである。'
// see SV-4
const SV_4_FOLD = '比べる前に両方を `NFKC` で正規化し、大文字と小文字を畳む —— 全角と半角、大文字と小文字を区別しない。'
const SV_4_EMPTY = '語が空のときはすべての行を載せる。'

const cellOf = (table: string, id: string): string =>
  unbroken((specTable(table).rows.find((one) => one.id === id)?.cells ?? []).join(' '))

describe('CR-606 premise -- the clauses these cases quote still stand', () => {
  it.each([
    ['AS-5', AS_5_ONE_FIELD],
    ['AS-5', AS_5_NOBODY],
    ['AS-5', AS_5_OPENS],
    ['AS-5', AS_5_LIST_SHAPE],
    ['AS-5', AS_5_ROWS],
    ['AS-5', AS_5_SAME_NAME],
    ['AS-5', AS_5_FILTER],
    ['AS-5', AS_5_SV_4],
    ['AS-5', AS_5_ADD_ITEM],
    ['AS-5', AS_5_NOT_ON_DASH],
    ['AS-5', AS_5_ONE_PRESS],
    ['AS-3', AS_3_ONLY_THAT_ONE],
    ['AS-6', AS_6_ONLY_COLLAPSING],
    ['AS-7', AS_7_ONLY_THE_ADD_ITEM],
    ['AS-7', AS_7_NOT_BY_TYPING],
    ['AS-12', AS_12_ADDS],
  ])('T-225 %s holds the clause', (id, clause) => {
    expect(cellOf('T-225', id)).toContain(clause)
  })

  it.each([SV_4_FOLD, SV_4_EMPTY])('T-330 SV-4 holds %s', (clause) => {
    expect(cellOf('T-330', 'SV-4')).toContain(clause)
  })
})

const ALPHA = { uid: 1, name: 'Alpha' }
const BRAVO = { uid: 2, name: 'Bravo' }
const TWIN_LOW = { uid: 3, name: 'Twin' }
const CHARLIE = { uid: 5, name: 'Charlie' }
const ALPHONSE = { uid: 6, name: 'Alphonse' }
const TWIN_HIGH = { uid: 8, name: 'Twin' }
// WHY: insertion order and uid order both disagree with name order, and the twins are held high uid first.
const ROSTER = [CHARLIE, TWIN_HIGH, BRAVO, ALPHONSE, ALPHA, TWIN_LOW]

const NOBODY_SEATED = 20
const BRAVO_SEATED = 21
const NEW_NAME = 'Nobody'
const UNASSIGN = '-'
const ASSIGNEE_ROW = 'PR-16'

const DOCUMENT = documentOf({
  tasks: [taskOf(NOBODY_SEATED), taskOf(BRAVO_SEATED)],
  resources: ROSTER.map((one) => personOf(one.uid, one.name)),
  assignments: [seatOf(30, BRAVO_SEATED, BRAVO.uid)],
})

const linesOf = (taskUid: number): readonly PropertyControl[] =>
  fieldOf(panelOf(DOCUMENT, taskItem(taskUid)), ASSIGNEE_ROW).controls

const comboOf = (taskUid: number): AssigneeCombo => {
  const combo = linesOf(taskUid)[0]?.assignee
  if (combo === undefined) throw new Error('premise: the assignee line carries its combo')
  return combo
}

type Entry = { readonly pick: 'candidate' | 'add'; readonly value: string; readonly word: string }

const listOf = (typed: string, isDescending = false): readonly Entry[] =>
  assigneeCandidatesOf(comboOf(NOBODY_SEATED), typed, isDescending)

const candidateUids = (entries: readonly Entry[]): readonly string[] =>
  entries.filter((one) => one.pick === 'candidate').map((one) => one.value)

const uids = (...people: readonly { readonly uid: number }[]): readonly string[] => people.map((one) => String(one.uid))

const addItemsOf = (entries: readonly Entry[]): readonly Entry[] => entries.filter((one) => one.pick === 'add')

const addWordFor = (name: string): string => propertyFieldWordOf('addResource').replace('{name}', name)

describe(`AS-5 -- ${AS_5_ONE_FIELD}`, () => {
  it('T-016 PR-16 is the assignee row', () => {
    expect(itemOf(ASSIGNEE_ROW).columns).toEqual(['assignee'])
  })

  it.each([
    ['nobody seated', NOBODY_SEATED, ''],
    ['Bravo seated', BRAVO_SEATED, 'Bravo'],
  ] as const)('%s: one control carrying the field over the whole roster, closed on "%s"', (_name, taskUid, word) => {
    const lines = linesOf(taskUid)
    expect(lines).toHaveLength(1)
    expect(lines[0]?.key).toEqual(lineKey(taskUid, null))
    expect(lines[0]?.assignee?.people).toHaveLength(ROSTER.length)
    expect(lines[0]?.assignee?.fieldWord).toBe(word)
  })
})

describe(`AS-5 -- ${AS_5_OPENS}`, () => {
  // WHY: drawn through the real DOM surface; the closed field is one assignee field with no typed box until opened.
  const viewOf = (panel: PropertiesPanel): ScreenView =>
    ({
      language: 'ja',
      frame: { isFullScreen: false, dividers: [], scrollbars: [] },
      appHeaderItems: { documentTitle: null, openedFileName: null, fileSavedAt: null, fileNeverSavedText: '', commands: [], language: 'ja' },
      taskGroupPanel: { pinnedTitles: [], titles: [] },
      propertiesPanel: panel,
      commandPalette: null,
      openModal: null,
      notices: [],
      confirmation: null,
      dialogueField: null,
      tooltips: [],
    }) as unknown as ScreenView

  it.each([
    ['nobody seated', NOBODY_SEATED],
    ['Bravo seated', BRAVO_SEATED],
  ] as const)('%s: the drawn PR-16 row holds one closed assignee field, and no list or typed box yet', (_name, taskUid) => {
    const built = stage({ 'App Header': 37 })
    built.surface = domScreenSurface(wiringOf(built, { preference: 'light', hue: 214 }))
    built.surface.showScreenView(viewOf(panelOf(DOCUMENT, taskItem(taskUid))))
    const all = selfAndDescendants(built.root())
    const fields = all.filter((one) => one.getAttribute('data-assignee-field') === ASSIGNEE_ROW)
    expect(fields).toHaveLength(1)
    const inField = selfAndDescendants(fields[0] as FakeElement)
    expect(inField.filter((one) => one.hasAttribute('data-assignee-list'))).toEqual([])
    expect(inField.filter((one) => ['INPUT', 'SELECT', 'DATALIST'].includes(one.tagName))).toEqual([])
  })
})

describe(`AS-5 -- ${AS_5_FILTER} ${AS_5_SV_4}`, () => {
  it(`${SV_4_EMPTY} -- nothing typed lists the whole roster`, () => {
    expect(candidateUids(listOf(''))).toEqual(uids(ALPHA, ALPHONSE, BRAVO, CHARLIE, TWIN_LOW, TWIN_HIGH))
  })

  it('a part of the name narrows to the names that hold it', () => {
    expect(candidateUids(listOf('alph'))).toEqual(uids(ALPHA, ALPHONSE))
    expect(candidateUids(listOf('win'))).toEqual(uids(TWIN_LOW, TWIN_HIGH))
  })

  it(`${SV_4_FOLD} -- full-width upper case finds the same candidates`, () => {
    expect(candidateUids(listOf('ＡＬＰＨ'))).toEqual(uids(ALPHA, ALPHONSE))
  })

  it('a text no name holds lists no candidate', () => {
    expect(candidateUids(listOf('Zed'))).toEqual([])
  })
})

describe(`AS-5 -- ${AS_5_ROWS}`, () => {
  it(`ascending by name; ${AS_5_SAME_NAME}`, () => {
    expect(candidateUids(listOf('', false))).toEqual(uids(ALPHA, ALPHONSE, BRAVO, CHARLIE, TWIN_LOW, TWIN_HIGH))
  })

  it(`descending by name (IC-124); ${AS_5_SAME_NAME}`, () => {
    expect(candidateUids(listOf('', true))).toEqual(uids(TWIN_LOW, TWIN_HIGH, CHARLIE, BRAVO, ALPHONSE, ALPHA))
  })

  it('the combo carries the two sort entries and the two check entries the list heads with', () => {
    expect(comboOf(NOBODY_SEATED).sortEntries).toHaveLength(2)
    expect(comboOf(NOBODY_SEATED).checkEntries).toHaveLength(2)
  })

  it(`${AS_6_ONLY_COLLAPSING} -- a unique name is shown by its name alone, the two Twins apart`, () => {
    const entries = listOf('')
    const wordOf = (person: { readonly uid: number }): string =>
      entries.find((one) => one.pick === 'candidate' && one.value === String(person.uid))?.word ?? ''
    for (const person of [ALPHA, ALPHONSE, BRAVO, CHARLIE]) expect(wordOf(person)).toBe(person.name)
    expect(wordOf(TWIN_LOW)).not.toBe(wordOf(TWIN_HIGH))
  })
})

describe(`AS-5 -- ${AS_5_ADD_ITEM}`, () => {
  it('a text no name holds: the add item alone, naming the typed text', () => {
    expect(listOf(NEW_NAME)).toEqual([{ pick: 'add', value: NEW_NAME, word: addWordFor(NEW_NAME) }])
  })

  it('only partial matches: the add item still comes, last (JDG-965)', () => {
    const entries = listOf('Alph')
    expect(candidateUids(entries)).toEqual(uids(ALPHA, ALPHONSE))
    expect(entries[entries.length - 1]).toEqual({ pick: 'add', value: 'Alph', word: addWordFor('Alph') })
    expect(addItemsOf(entries)).toHaveLength(1)
  })

  it('the add item stays last in descending order', () => {
    const entries = listOf('Alph', true)
    expect(candidateUids(entries)).toEqual(uids(ALPHONSE, ALPHA))
    expect(entries[entries.length - 1]?.pick).toBe('add')
  })

  it('a text equal to a name: no add item', () => {
    const entries = listOf('Alpha')
    expect(candidateUids(entries)).toEqual(uids(ALPHA))
    expect(addItemsOf(entries)).toEqual([])
  })

  it('a text equal to the twins\' name: both twins, no add item', () => {
    const entries = listOf('Twin')
    expect(candidateUids(entries)).toEqual(uids(TWIN_LOW, TWIN_HIGH))
    expect(addItemsOf(entries)).toEqual([])
  })

  it(`${AS_5_NOT_ON_DASH} -- "-" brings no add item`, () => {
    expect(addItemsOf(listOf(UNASSIGN))).toEqual([])
  })
})

const lineKey = (taskUid: number, resourceUid: number | null): PropertyFieldKey => ({
  holder: 'assignment',
  taskUid,
  resourceUid,
  column: 'resourceUid',
})

type Shape = Readonly<Record<string, unknown>>
const shapeOf = (command: DocumentCommand): Shape => {
  const record = recordOf(command)
  if (record['kind'] === 'createResource') return { kind: 'createResource', name: record['name'] }
  return { kind: record['kind'], taskUid: record['taskUid'], resourceUid: record['resourceUid'] }
}
const seats = (taskUid: number, resourceUid: number): Shape => ({ kind: 'createAssignment', taskUid, resourceUid })
const releases = (taskUid: number, resourceUid: number): Shape => ({ kind: 'deleteAssignment', taskUid, resourceUid })
const makes = (name: string): Shape => ({ kind: 'createResource', name })

const committed = (
  taskUid: number,
  lineUid: number | null,
  text: string,
  pick?: 'candidate' | 'add',
): readonly Shape[] => {
  const commit: FieldCommit =
    pick === undefined
      ? { row: ASSIGNEE_ROW, key: lineKey(taskUid, lineUid), text }
      : { row: ASSIGNEE_ROW, key: lineKey(taskUid, lineUid), text, pick }
  return commandsOf(DOCUMENT, commit).map(shapeOf)
}

const kindsOf = (shapes: readonly Shape[]): readonly unknown[] => shapes.map((one) => one['kind'])

describe(`AS-5 -- ${AS_5_ONE_PRESS}`, () => {
  it('a person checked on an unseated task seats that person', () => {
    expect(committed(NOBODY_SEATED, null, String(CHARLIE.uid), 'candidate')).toEqual([seats(NOBODY_SEATED, CHARLIE.uid)])
  })

  it(`${AS_12_ADDS} -- Charlie checked beside a seated Bravo seats Charlie and keeps Bravo`, () => {
    expect(committed(BRAVO_SEATED, null, String(CHARLIE.uid), 'candidate')).toEqual([seats(BRAVO_SEATED, CHARLIE.uid)])
  })

  it('the higher-uid twin checked is the one seated', () => {
    expect(committed(NOBODY_SEATED, null, String(TWIN_HIGH.uid), 'candidate')).toEqual([seats(NOBODY_SEATED, TWIN_HIGH.uid)])
  })

  it(`${AS_3_ONLY_THAT_ONE} -- Bravo unchecked releases Bravo`, () => {
    expect(committed(BRAVO_SEATED, BRAVO.uid, UNASSIGN)).toEqual([releases(BRAVO_SEATED, BRAVO.uid)])
  })

  it(`${AS_7_ONLY_THE_ADD_ITEM} -- the add item makes the person, then seats them`, () => {
    const shapes = committed(NOBODY_SEATED, null, NEW_NAME, 'add')
    expect(kindsOf(shapes)).toEqual(['createResource', 'createAssignment'])
    expect(shapes[0]).toEqual(makes(NEW_NAME))
    expect(shapes[1]?.['taskUid']).toBe(NOBODY_SEATED)
  })

  it('the add item beside a seated Bravo makes and seats, and releases nobody (AS-12)', () => {
    const shapes = committed(BRAVO_SEATED, null, NEW_NAME, 'add')
    expect(kindsOf(shapes)).toEqual(['createResource', 'createAssignment'])
  })
})

describe(`AS-7 -- ${AS_7_NOT_BY_TYPING}`, () => {
  it.each([
    ['a name the roster does not hold', NOBODY_SEATED, NEW_NAME],
    ['a name the roster does not hold, beside Bravo', BRAVO_SEATED, NEW_NAME],
    ['a part of a name only', NOBODY_SEATED, 'Alph'],
  ] as const)('%s, committed with nothing chosen: nothing is written', (_name, taskUid, text) => {
    expect(committed(taskUid, null, text)).toEqual([])
  })

  it('control: the same new name with the add item chosen does write', () => {
    expect(committed(NOBODY_SEATED, null, NEW_NAME, 'add')).not.toEqual([])
  })
})
