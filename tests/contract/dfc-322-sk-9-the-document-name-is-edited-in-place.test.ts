// Contract tests: the document name is opened by F2 and edited in place.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { FieldCommit } from '../../src/adapter/screen-renderer/screen-surface'
import {
  commandFromFieldCommit,
  commandFromInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
  type TranslatedInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  editProject,
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { specTable, unbroken } from './spec-table'

const FR_035_STATEMENT = '**STATEMENT**: 作成者が文書名を選んだとき、`GRS` は、文書名をその場で編集できるようにすること。'

const FR_035_NO_EMPTY_STRING =
  '`GRS` は、`title` に空文字を受け付けないこと。'

const IN_4_NOTHING_HALF_TYPED_IS_WRITTEN =
  'S-8` の次の一手が「確定するか取り消すか」と既に述べており、取り消す手立てが 1 つも定まっていなかった。⛔ 取り消したときは、編集を始める前の値へ戻すこと（MUST）。書きかけの文字を文書へ書いてはならない（MUST NOT）'

const SK_19_SETTLES_THE_IN_PLACE_EDIT =
  '出ている通知が無い間、 `Enter` を押したとき、`GRS` は、その場の編集（名称・担当名・タスクグループ名・文書名・プロパティの入力）を確定すること。'

const IF_9_THE_FIELD_NAMES_U_27 = 'ヘッダーの文書名の欄は 表 T-103 の `U-27` を名乗る'

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const DESIGN = unbroken(readRepoFile(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const U_27 = 'U-27'

const SK_9_KEY = ((): string => {
  const row = specTable('T-036').rows.find((one) => one.id === 'SK-9')
  if (row === undefined) throw new Error('table T-036 has no row SK-9')
  const cell = row.cells.find((text) => /`F\d+`/.test(text))
  const key = cell === undefined ? undefined : /`(F\d+)`/.exec(cell)?.[1]
  if (key === undefined) throw new Error(`table T-036 SK-9 assigns no function key: ${row.cells}`)
  return key
})()

const NESTED = {
  exportCanvas: { width: 1600, height: 900 },
  fontSizeStepSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...NESTED, ...part }) as unknown as DocumentSettings

const ROW_ID = 'r-alfa'

const SETTINGS = settingsOf({
  scrollDate: '2026-01-01',
  scrollTaskGroupId: ROW_ID,
  stackDirection: 'down',
})

// Why: never the empty string, or the cases on an emptied name could not tell it from the start.
const NAME_BEFORE = 'the name it started with'

const scheduleWithTitle = (title: string | null): Schedule =>
  ({
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title,
      uidHighWaterMark: 0,
      outlineBase: 1,
    },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: [{ id: ROW_ID, parentId: null, label: 'task group', order: 0, minHeight: null }],
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const documentWithTitle = (title: string | null): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule: scheduleWithTitle(title),
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedAt: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedAt: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  propertyPanelWidth: 0,
}

const REGIONS = regionsFromScreen(ENV, SETTINGS)

const contextFor = (document: Document, part: Partial<InputContext> = {}): InputContext => {
  const layout = layoutFromSchedule(document.schedule, SETTINGS, REGIONS)
  return {
    document,
    layout,
    geometry: geometryFromLayout(
      document.schedule,
      SETTINGS,
      layout,
      REGIONS,
      emptySelection(),
      null,
    ),
    regions: REGIONS,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newTaskGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
    ...part,
  }
}

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const keyOf = (key: string, modifiers: InputModifiers = NO_MODS): KeyInput => ({
  kind: 'key',
  key,
  modifiers,
})

const pressing = (key: string, part: Partial<InputContext> = {}): TranslatedInput =>
  commandFromInput(keyOf(key), contextFor(documentWithTitle(NAME_BEFORE), part))

const writesOf = (answer: TranslatedInput): readonly DocumentCommand[] => {
  const action = answer.action
  if (action === null || action.kind !== 'changeDocument') return []
  return action.writes.flat()
}

// Why: the key is the document's own Project and not a row of T-016: FR-074 keeps the document name
// out of the basic information and names FR-035 as its one entrance.
const commitOf = (text: string): FieldCommit => ({
  row: U_27,
  key: { holder: 'project', column: 'title' },
  text,
})

const titleAfterCommitting = (text: string, from: string | null = NAME_BEFORE): string | null => {
  let document = documentWithTitle(from)
  for (const command of commandFromFieldCommit(commitOf(text), contextFor(document))) {
    // Why: only the Project aggregate is asked, as only its commands reach Project.title; a command
    // from another row arriving here is a defect to surface, not to route around.
    const result = editProject(document, command as never)
    if (result.ok) document = result.document
  }
  return document.schedule.project.title
}

// Spec: FR-035, SK-9, IN-4, SK-19, IF-9, U-27
describe('DFC-322 -- the manuscript these cases are driven by', () => {
  it('still asks FR-035 for an in-place edit of the document name', () => {
    expect(REQUIREMENTS).toContain(FR_035_STATEMENT)
  })

  it('still assigns F2 to SK-9, and still calls it 文書名を編集する', () => {
    const row = specTable('T-036').rows.find((one) => one.id === 'SK-9')
    expect(row?.cells.join(' ')).toContain('文書名を編集する')
    expect(SK_9_KEY).toBe('F2')
  })

  it('still forbids the empty string as a document name', () => {
    expect(REQUIREMENTS).toContain(FR_035_NO_EMPTY_STRING)
  })

  it('still forbids half-typed text reaching the document when the edit is canceled', () => {
    expect(REQUIREMENTS).toContain(IN_4_NOTHING_HALF_TYPED_IS_WRITTEN)
  })

  it('still names 文書名 among what Enter settles', () => {
    expect(REQUIREMENTS).toContain(SK_19_SETTLES_THE_IN_PLACE_EDIT)
    expect(SK_19_SETTLES_THE_IN_PLACE_EDIT).toContain('文書名')
  })

  it('still has IF-9 admit a field that names U-27 rather than a row of table T-016', () => {
    expect(DESIGN).toContain(IF_9_THE_FIELD_NAMES_U_27)
  })
})

// Spec: SK-9, FR-035, IN-4, IN-5a, FR-031
// Why: no case asks focus and select-all: MK-13 and FR-085 say it of task and group names,
// and neither SK-9 nor FR-035 says it of the document name.
describe('T-036 SK-9 / FR-035 -- F2 opens the document name for editing in place', () => {
  it('answers editInPlace with the documentTitle target', () => {
    expect(pressing(SK_9_KEY).action).toEqual({
      kind: 'editInPlace',
      target: { kind: 'documentTitle' },
    })
  })

  it('opens the field and writes NOTHING by itself', () => {
    // Why: an edit that had already written would leave the cancel of IN-4 with nothing to return to.
    expect(writesOf(pressing(SK_9_KEY))).toEqual([])
  })

  it('opens it whatever the document name is now, including none at all', () => {
    // Why: FR-035 gives a null title a meaning of its own, so a never-named document still opens.
    for (const before of [NAME_BEFORE, null]) {
      const answer = commandFromInput(
        keyOf(SK_9_KEY),
        contextFor(documentWithTitle(before)),
      )
      expect(answer.action, String(before)).toEqual({
        kind: 'editInPlace',
        target: { kind: 'documentTitle' },
      })
    }
  })

  it('does not open it while a field is already unsettled (IN-5a)', () => {
    // Why: IN-5a is about single characters and F2 is not one, so only the absence of a write is asked,
    // which is the half IN-4 and FR-031 both turn on.
    expect(writesOf(pressing(SK_9_KEY, { isTextEntryUnsettled: true }))).toEqual([])
  })
})

// Why: the control: every case above would pass on a build that answered
// editInPlace{documentTitle} to every key pressed.
// Spec: SK-9, IN-4
describe('T-036 -- F2 and only F2 opens the document name', () => {
  const OTHER_FUNCTION_KEYS = specTable('T-036')
    .rows.filter((one) => one.id !== 'SK-9')
    .flatMap((one) => one.cells.flatMap((cell) => [...cell.matchAll(/`(F\d+)`/g)].map((m) => m[1]!)))

  it('table T-036 still assigns function keys other than F2', () => {
    // Why: an empty list of other function keys would make the case below vacuous.
    expect(new Set(OTHER_FUNCTION_KEYS).size).toBeGreaterThan(1)
    expect(OTHER_FUNCTION_KEYS).not.toContain(SK_9_KEY)
  })

  // Spec: SK-13, SK-15
  it('no other function key of table T-036 opens the document name', () => {
    for (const key of new Set(OTHER_FUNCTION_KEYS)) {
      const action = pressing(key).action
      const opensTheName =
        action !== null &&
        action.kind === 'editInPlace' &&
        action.target.kind === 'documentTitle'
      expect(opensTheName, `${key} opened the document name`).toBe(false)
    }
  })

  it('Esc does not open it, and Esc does not write it either', () => {
    const answer = pressing('Esc', { isTextEntryUnsettled: true })
    expect(answer.action).not.toEqual({
      kind: 'editInPlace',
      target: { kind: 'documentTitle' },
    })
    expect(writesOf(answer), 'Esc planned a write').toEqual([])
  })
})

// Spec: IF-9, FR-035, SK-19, U-27
describe('IF-9 + FR-035 -- a settled name reaches Project.title', () => {
  it('writes the typed name', () => {
    expect(titleAfterCommitting('a new name')).toBe('a new name')
  })

  it('plans exactly the row of table T-108 that owns the document name', () => {
    const planned = commandFromFieldCommit(
      commitOf('a new name'),
      contextFor(documentWithTitle(NAME_BEFORE)),
    )
    expect(planned).toEqual([{ kind: 'setProjectTitle', title: 'a new name' }])
  })

  it('writes a name that differs from the one it started with -- not a no-op', () => {
    // Why: the control: a commandFromFieldCommit that answered [] for everything would pass
    // the never-empty cases below and write nothing at all.
    expect(titleAfterCommitting('a new name')).not.toBe(NAME_BEFORE)
  })
})

// Spec: FR-035, CM-1
describe('FR-035 (MUST NOT) -- an emptied name is never committed', () => {
  it('leaves the name it started with when the field is settled empty', () => {
    // Why: the whole path is asked, not one member: FR-035 forbids the result, whichever member refuses.
    expect(titleAfterCommitting('')).toBe(NAME_BEFORE)
  })

  it('never leaves the empty string behind, from any starting name', () => {
    for (const before of [NAME_BEFORE, null]) {
      expect(titleAfterCommitting('', before), String(before)).not.toBe('')
    }
  })

  it('the aggregate refuses CM-1 with an empty title, naming FR-035', () => {
    const refused = editProject(documentWithTitle(NAME_BEFORE), {
      kind: 'setProjectTitle',
      title: '',
    })
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.refusals.map((one) => one.rule)).toContain('FR-035')
  })

  it('still accepts null, which FR-035 gives a meaning of its own', () => {
    // Why: null is a state the document may hold and only the empty string is forbidden;
    // this case holds that the two absences are not the same.
    const cleared = editProject(documentWithTitle(NAME_BEFORE), {
      kind: 'setProjectTitle',
      title: null,
    })
    expect(cleared.ok).toBe(true)
    if (cleared.ok) expect(cleared.document.schedule.project.title).toBeNull()
  })
})
