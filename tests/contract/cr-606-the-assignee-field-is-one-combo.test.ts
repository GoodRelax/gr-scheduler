// CR-606 spec-only cases: the assignee field (T-225 AS-5) is one combo input per line; its candidates

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
import { selfAndDescendants, stage, wiringOf } from '../fixtures/fake-browser'
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
const AS_5_ONE_LINE_EACH = '⭐ 担当の欄は、そのタスクに就いている担当 1 人につき 1 つ出し、その下に空の欄を常に 1 つ出すこと（MUST）'
const AS_5_ONE_INPUT = '⭐ 1 つの欄は、字を打てて候補の一覧（ドロップダウン）を開ける 1 つの入力とすること（MUST）。'
const AS_5_NOT_TWO_INPUTS = '⛔ 1 つの欄に、選ぶ器と打つ器を別々に置いてはならない（MUST NOT）'
const AS_5_FILTER = '⭐ 候補は担当リストの担当とし、打った字を担当名の一部と比べて、当たる候補だけに絞ること（MUST）。'
const AS_5_SV_4 = '比べ方は 表 T-330 の `SV-4` と同じとすること（MUST）'
const AS_5_ORDER =
  '⭐ 候補は名の昇順に並べ、一覧の頭に置く `IC-123`（昇順）と `IC-124`（降順）で向きを変えさせること（MUST）'
const AS_5_SAME_NAME = '同じ名の候補は `uid` の昇順とする（`uid` を添えるのは `AS-6`）。'
const AS_5_ADD_ITEM =
  '⭐ 打った字と等しい名の担当がいないときは、候補の末尾に、打った字を名とする担当を足す項目を 1 つ出すこと（MUST）（語は `FR-038` の辞書）。'
const AS_5_NOT_ON_DASH = '⛔ 打った字が `-` のときは出してはならない（MUST NOT）'
const AS_5_WRITES_ONLY =
  '⭐ 欄が書くのは、候補か足す項目を選んだとき（押す、または矢印で強調して `Enter`）と、`AS-3` の `-` を確定したときだけとすること（MUST）。'
const AS_5_UNHIGHLIGHTED =
  '⭐ 何も強調せずに確定したとき（`Enter`、表 T-028 の `IN-6` の外の押下）は、打った字と等しい名の候補があればそれを選んだものとし（同じ名が 2 つ以上なら `AS-8`）、無ければ何も書かないこと（MUST）。'
// see AS-6, AS-7, AS-8, AS-12
const AS_6_ONLY_COLLAPSING = '⚠️ **添えてよいのは潰れる候補だけである**'
const AS_7_ONLY_THE_ADD_ITEM = '⛔ `Resource` を作るのは、`AS-5` の足す項目を選んだときだけとすること（MUST）。'
const AS_7_NOT_BY_TYPING =
  '打っただけの字（何も選ばずに `Enter` を押した・焦点が欄を離れた）で作ってはならない（MUST NOT）'
const AS_8_SMALLER_UID = '`uid` の小さいほうへ割り当てること（MUST）。'
const AS_12_SEATED_LINE =
  '就いている担当の欄で受け取ったときは、受け取った担当を就け（表 T-108 の `CM-44`）、その欄の担当の割当を解くことを、1 回の呼び出しで行うこと（MUST）'
// see SV-4
const SV_4_FOLD = '比べる前に両方を `NFKC` で正規化し、大文字と小文字を畳む —— 全角と半角、大文字と小文字を区別しない。'
const SV_4_EMPTY = '語が空のときはすべての行を載せる。'

const cellOf = (table: string, id: string): string =>
  unbroken((specTable(table).rows.find((one) => one.id === id)?.cells ?? []).join(' '))

describe('CR-606 premise -- the clauses these cases quote still stand', () => {
  it.each([
    ['AS-5', AS_5_ONE_LINE_EACH],
    ['AS-5', AS_5_ONE_INPUT],
    ['AS-5', AS_5_NOT_TWO_INPUTS],
    ['AS-5', AS_5_FILTER],
    ['AS-5', AS_5_SV_4],
    ['AS-5', AS_5_ORDER],
    ['AS-5', AS_5_SAME_NAME],
    ['AS-5', AS_5_ADD_ITEM],
    ['AS-5', AS_5_NOT_ON_DASH],
    ['AS-5', AS_5_WRITES_ONLY],
    ['AS-5', AS_5_UNHIGHLIGHTED],
    ['AS-6', AS_6_ONLY_COLLAPSING],
    ['AS-7', AS_7_ONLY_THE_ADD_ITEM],
    ['AS-7', AS_7_NOT_BY_TYPING],
    ['AS-8', AS_8_SMALLER_UID],
    ['AS-12', AS_12_SEATED_LINE],
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

describe(`AS-5 -- ${AS_5_ONE_LINE_EACH}`, () => {
  it('T-016 PR-16 is the assignee row', () => {
    expect(itemOf(ASSIGNEE_ROW).columns).toEqual(['assignee'])
  })

  it.each([
    ['nobody seated', NOBODY_SEATED, 1],
    ['Bravo seated', BRAVO_SEATED, 2],
  ] as const)('%s: %s line(s), each carrying the same one combo', (_name, taskUid, count) => {
    const lines = linesOf(taskUid)
    expect(lines).toHaveLength(count)
    for (const line of lines) expect(line.assignee, 'every line is the combo input').toBeDefined()
  })
})

describe(`AS-5 -- ${AS_5_NOT_TWO_INPUTS}`, () => {
  // WHY: drawn through the real DOM surface; a line drawn as a chooser AND a typed box has two inputs.
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
  ] as const)('%s: the drawn PR-16 field holds one input element per line', (_name, taskUid) => {
    const built = stage({ 'App Header': 37 })
    built.surface = domScreenSurface(wiringOf(built, { preference: 'light', hue: 214 }))
    const panel = panelOf(DOCUMENT, taskItem(taskUid))
    built.surface.showScreenView(viewOf(panel))
    const inRow = selfAndDescendants(built.root()).filter((one) => one.getAttribute('data-field-row') === ASSIGNEE_ROW)
    expect(inRow.length, 'premise: the PR-16 field is drawn').toBeGreaterThan(0)
    const inputs = new Set(
      inRow.flatMap((one) => selfAndDescendants(one)).filter((one) => one.tagName === 'INPUT' || one.tagName === 'SELECT'),
    )
    expect(inputs.size).toBe(linesOf(taskUid).length)
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

describe(`AS-5 -- ${AS_5_ORDER}`, () => {
  it(`ascending by name; ${AS_5_SAME_NAME}`, () => {
    expect(candidateUids(listOf('', false))).toEqual(uids(ALPHA, ALPHONSE, BRAVO, CHARLIE, TWIN_LOW, TWIN_HIGH))
  })

  it(`descending by name (IC-124); ${AS_5_SAME_NAME}`, () => {
    expect(candidateUids(listOf('', true))).toEqual(uids(TWIN_LOW, TWIN_HIGH, CHARLIE, BRAVO, ALPHONSE, ALPHA))
  })

  it('the combo carries the two sort entries the list heads with', () => {
    expect(comboOf(NOBODY_SEATED).sortEntries).toHaveLength(2)
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
const releases = (taskUid: number, resourceUid: number): Shape => ({ kind: 'unassignResource', taskUid, resourceUid })
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

describe(`AS-5 -- ${AS_5_WRITES_ONLY}`, () => {
  it('a candidate chosen on the empty line seats that person', () => {
    expect(committed(NOBODY_SEATED, null, String(CHARLIE.uid), 'candidate')).toEqual([seats(NOBODY_SEATED, CHARLIE.uid)])
  })

  it(`${AS_12_SEATED_LINE} -- a candidate chosen on Bravo's line seats Charlie and releases Bravo`, () => {
    expect(committed(BRAVO_SEATED, BRAVO.uid, String(CHARLIE.uid), 'candidate')).toEqual([
      seats(BRAVO_SEATED, CHARLIE.uid),
      releases(BRAVO_SEATED, BRAVO.uid),
    ])
  })

  it('the higher-uid twin chosen as a candidate is the one seated', () => {
    expect(committed(NOBODY_SEATED, null, String(TWIN_HIGH.uid), 'candidate')).toEqual([
      seats(NOBODY_SEATED, TWIN_HIGH.uid),
    ])
  })

  it(`${AS_7_ONLY_THE_ADD_ITEM} -- the add item chosen on the empty line makes the person, then seats them`, () => {
    const shapes = committed(NOBODY_SEATED, null, NEW_NAME, 'add')
    expect(kindsOf(shapes)).toEqual(['createResource', 'createAssignment'])
    expect(shapes[0]).toEqual(makes(NEW_NAME))
    expect(shapes[1]?.['taskUid']).toBe(NOBODY_SEATED)
  })

  it('the add item chosen on Bravo\'s line makes, seats and releases Bravo', () => {
    const shapes = committed(BRAVO_SEATED, BRAVO.uid, NEW_NAME, 'add')
    expect(kindsOf(shapes)).toEqual(['createResource', 'createAssignment', 'unassignResource'])
    expect(shapes[0]).toEqual(makes(NEW_NAME))
    expect(shapes[2]).toEqual(releases(BRAVO_SEATED, BRAVO.uid))
  })

  it('"-" committed on Bravo\'s line releases Bravo (AS-3)', () => {
    expect(committed(BRAVO_SEATED, BRAVO.uid, UNASSIGN)).toEqual([releases(BRAVO_SEATED, BRAVO.uid)])
  })
})

describe(`AS-5 -- ${AS_5_UNHIGHLIGHTED}`, () => {
  it('an unhighlighted commit of an equal name seats that person', () => {
    expect(committed(NOBODY_SEATED, null, CHARLIE.name)).toEqual([seats(NOBODY_SEATED, CHARLIE.uid)])
  })

  it(`${AS_8_SMALLER_UID} -- an unhighlighted commit of the twins' name seats the smaller uid`, () => {
    expect(committed(NOBODY_SEATED, null, TWIN_LOW.name)).toEqual([seats(NOBODY_SEATED, TWIN_LOW.uid)])
  })

  it('an unhighlighted commit of an equal name on Bravo\'s line replaces Bravo', () => {
    expect(committed(BRAVO_SEATED, BRAVO.uid, CHARLIE.name)).toEqual([
      seats(BRAVO_SEATED, CHARLIE.uid),
      releases(BRAVO_SEATED, BRAVO.uid),
    ])
  })

  it.each([
    ['a name the roster does not hold, empty line', NOBODY_SEATED, null, NEW_NAME],
    ['a name the roster does not hold, Bravo\'s line', BRAVO_SEATED, BRAVO.uid, NEW_NAME],
    ['a part of a name only, empty line', NOBODY_SEATED, null, 'Alph'],
  ] as const)(`${AS_7_NOT_BY_TYPING} -- %s: nothing is written`, (_name, taskUid, lineUid, text) => {
    expect(committed(taskUid, lineUid, text)).toEqual([])
  })

  it('control: the same new name with the add item chosen does write', () => {
    expect(committed(NOBODY_SEATED, null, NEW_NAME, 'add')).not.toEqual([])
  })
})
