// CR-786: the clauses, the commands, the undo bench and the panel helpers the cr-786-*.contract.test.ts files share.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  FieldCommit,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import {
  NOT_STORED_LIMITS,
  emptyHistory,
  stepCount,
  type HistoryLimits,
} from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection, selectionWith, type ItemRef } from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  applyDocumentChange,
  replaceDocument,
  type ApplyOutcome,
  type ChangeAudience,
  type ChangeStep,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { editDocument, type EditResult } from '../../src/use-case/edit-document/edit-document'
import { LIMITS } from './cr-777-stage'
import { unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const readSpec = (...parts: string[]): string => readFileSync(join(SPEC, ...parts), 'utf8').replace(/\r\n/g, '\n')

export const REQUIREMENTS = unbroken(readSpec('01-04-requirements.md'))

// see FR-019
export const FR_019_ORDER =
  '同じ種類の注記どうし（コメントボックスどうし、ハイライトボックスどうし）は、文書の並び（`commentBoxes`・`highlightBoxes` の配列の順）で後のものほど前に描き、重なった所では前に描いたものを当たりの先にすること（MUST）'
export const FR_019_FRONT =
  '[最前面に配置]（`_assets/tbl-property-items.md` の 表 T-016 の `PR-48`・`PR-49`）は、その箱を同じ種類の並びの最後へ移す（`_assets/tbl-document-commands.md` の 表 T-108 の `CM-100`・`CM-101`） —— 1 つの命令なので、1 度の取り消し（`FR-031`）で戻る。'
export const FR_019_SHAPE = '並びは `GRS JSON` の配列の順そのものであり、文書の形は変わらない。'
export const FR_019_SHOWN_DATE =
  '線先が立つ日時は、吸着していれば吸着先のその点の日時（対象を消したときに ① へ書く日時と同じ求め方）、そうでなければ ① の日時（`AT-113`）とする —— 検索の表の `SQ-9` と飛び先（表 T-332 の `SJ-6`）もこれを読む。'
// see FR-031
export const FR_031_NO_STEP = '⛔ 書き込みが文書の値を 1 つも変えなかったときは、取り消しの段を残さないこと（MUST）'

// see CM-100, CM-101
export const CM_100 = 'bringCommentBoxToFront'
export const CM_101 = 'bringHighlightBoxToFront'

// see PR-48, PR-49
export const PR_48 = 'PR-48'
export const PR_49 = 'PR-49'

const ROW_NAME = 'cr-786 row'

/** @purity pure */
export function run(document: Document, command: Record<string, unknown>): EditResult {
  return editDocument(document, command as unknown as DocumentCommand, LIMITS, ROW_NAME)
}

/** @purity pure */
export function accepted(result: EditResult): Document {
  if (!result.ok) throw new Error(`premise: accepted, was ${JSON.stringify(result.refusals)}`)
  return result.document
}

/** @purity pure */
export function commentIdsOf(document: Document): readonly string[] {
  return document.schedule.commentBoxes.map((one) => one.id)
}

/** @purity pure */
export function highlightIdsOf(document: Document): readonly string[] {
  return document.schedule.highlightBoxes.map((one) => one.id)
}

// see FR-031, T-027
const HISTORY: HistoryLimits = { maxSteps: NOT_STORED_LIMITS['S-94'], maxTotalSizeBytes: Number.MAX_SAFE_INTEGER }
const CALM = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }
const DEFAULT_TASK_GROUP_NAME = 'cr-786 default task group name'
const UNDO_ROW = 'RD-1'

export interface Bench {
  readonly document: () => Document
  write(commands: readonly DocumentCommand[]): ApplyOutcome
  undo(): Document
  depth(): number
}

/** @purity non-pure */
export function bench(start: Document): Bench {
  let held: HeldDocument = { document: start, history: emptyHistory<ChangeStep>() }
  let writes = 0
  const holder: DocumentHolder = {
    read: () => held,
    replace: (next) => {
      held = next
    },
  }
  const audience: ChangeAudience = { deliver: () => {} }
  return {
    document: () => held.document,
    write: (commands) => {
      writes += 1
      return applyDocumentChange(
        {
          defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
          expectedStamp: held.document.documentStamp,
          commands,
          moment: CALM,
          historyLimits: HISTORY,
          settingsLimits: LIMITS,
          editedBy: 'the cr-786 case',
          updatedAt: new Date(Date.UTC(2026, 9, 17, 0, 0, writes)).toISOString().replace(/\.\d{3}Z$/, 'Z'),
        },
        holder,
        audience,
      )
    },
    undo: () => {
      const outcome = replaceDocument(
        {
          defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
          newTaskGroupId: 'cr-786-fresh-task-group',
          expectedStamp: held.document.documentStamp,
          moment: CALM,
          call: { row: UNDO_ROW },
        },
        holder,
        audience,
      )
      if (!outcome.ok) throw new Error(`the undo was refused: ${JSON.stringify(outcome.refusal)}`)
      return outcome.document
    },
    depth: () => stepCount(held.history),
  }
}

// see FR-038
export type Language = 'ja' | 'en'
type Words = Readonly<Record<Language, string>>
const DICTIONARY = JSON.parse(readSpec('_source', 'display-words.json')) as {
  readonly properties: readonly { readonly rowId: string; readonly label: Words }[]
}

/** @purity pure */
export function propertyWordOf(rowId: string, language: Language): string {
  const found = DICTIONARY.properties.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`display-words properties has no ${rowId}`)
  return found.label[language]
}

// see T-016
const T_016_ROWS = (
  JSON.parse(readSpec('_source', 'property-items.json')) as {
    readonly items: readonly { readonly id: string; readonly appliesTo?: string }[]
  }
).items
const TASK_TARGET = 'Task'

export const T_016_ORDER: readonly string[] = T_016_ROWS.map((one) => one.id)

// WHY: the table order is the printed order, and a panel shows only the rows of the selected target (FR-006).
/** @purity pure */
export function tableRowsOf(target: string): readonly string[] {
  return T_016_ROWS.filter((one) => (one.appliesTo ?? TASK_TARGET) === target).map((one) => one.id)
}

/** @purity pure */
export function tableNeighbourOf(row: string, target: string, step: -1 | 1): string | null {
  const rows = tableRowsOf(target)
  const at = rows.indexOf(row)
  if (at < 0) throw new Error(`table T-016 has no ${target} row ${row}`)
  return rows[at + step] ?? null
}

const readingsOf = (document: Document): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer: null,
    pointerRestedMs: 0,
    hintTargetDwellMs: 0,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: 'light',
    themeHue: document.schedule.project.themeHue ?? 0,
    selectedTaskGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }) as unknown as ScreenViewReadings

const sessionOf = (item: ItemRef, language: Language): ScreenSession => {
  const selection = selectionWith(emptySelection(), item)
  return {
    ...emptyScreenSession,
    screen: {
      ...emptyScreenSession.screen,
      screenLanguage: language,
      helpLanguage: language,
      propertiesPanelContentState: { kind: 'selectionDisplayed', subject: { selection, taskGroupIds: [] } },
    },
  } as unknown as ScreenSession
}

/** @purity pure */
export function panelOf(document: Document, item: ItemRef, language: Language): PropertiesPanel {
  const panel = propertiesPanelFromSelection(
    document.schedule,
    document.documentSettings as DocumentSettings,
    selectionWith(emptySelection(), item),
    sessionOf(item, language),
    readingsOf(document),
  )
  if (panel === null) throw new Error('premise: the panel describes the selection')
  return panel
}

/** @purity pure */
export function fieldOf(panel: PropertiesPanel, row: string): PropertyField {
  const found = panel.fields.filter((one) => one.row === row)
  if (found.length !== 1) {
    throw new Error(`expected one field of row ${row}, got ${found.length}: ${panel.fields.map((one) => one.row).join(' ')}`)
  }
  return found[0] as PropertyField
}

/** @purity pure */
export function rowsOf(panel: PropertiesPanel): readonly string[] {
  return panel.fields.map((one) => one.row)
}

// WHY: a pressed word entrance commits its row, its key and its own text (the DOM surface's press entrance).
/** @purity pure */
export function pressOf(field: PropertyField, control: PropertyControl): FieldCommit {
  return { row: field.row, key: control.key, text: control.text }
}
