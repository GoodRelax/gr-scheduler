// CR-606 spec-only stage: one document, the panel it describes, and the commands a field commit makes.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  commandFromFieldCommit,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
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
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, selectionWith, type ItemRef } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import { taskGroupDocument, taskOf as seedTaskOf } from '../unit/cr-541-stage'
import { unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const readSpec = (...parts: string[]): string => readFileSync(join(SPEC, ...parts), 'utf8').replace(/\r\n/g, '\n')

export const REQUIREMENTS = unbroken(readSpec('01-04-requirements.md'))
export const DESIGN = unbroken(readSpec('05-07-design.md'))
export const PROPERTY_ITEMS_TABLE = unbroken(readSpec('_assets', 'tbl-property-items.md'))

export interface T016Item {
  readonly id: string
  readonly columns: readonly string[]
  readonly inputKinds: readonly string[]
  readonly isReadOnly?: boolean
  readonly appliesTo?: string
  readonly shownFor?: 'task' | 'milestone' | 'both'
  readonly oneInput?: boolean
}

export const T_016: readonly T016Item[] = (
  JSON.parse(readSpec('_source', 'property-items.json')) as { readonly items: readonly T016Item[] }
).items

export const appliesToOf = (item: T016Item): string => item.appliesTo ?? 'Task'

export const itemOf = (id: string): T016Item => {
  const found = T_016.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table T-016 has no row ${id}`)
  return found
}

export const COLOUR_KIND = '色'

type Words = { readonly ja: string; readonly en: string }
type Part = { readonly part: string; readonly text: Words }

const DICTIONARY = JSON.parse(readSpec('_source', 'display-words.json')) as {
  readonly properties: readonly { readonly rowId: string; readonly label: Words; readonly milestoneLabel?: Words }[]
  readonly colourField: readonly Part[]
  readonly propertyField: readonly Part[]
}

export const LANGUAGE = 'ja' as const

export const propertyLabelOf = (rowId: string, which: 'label' | 'milestoneLabel' = 'label'): string => {
  const entry = DICTIONARY.properties.find((one) => one.rowId === rowId)
  const words = entry?.[which]
  if (words === undefined) throw new Error(`display-words properties has no ${which} for ${rowId}`)
  return words[LANGUAGE]
}

const partOf = (section: readonly Part[], name: string, part: string): string => {
  const found = section.find((one) => one.part === part)
  if (found === undefined) throw new Error(`display-words ${name} has no part ${part}`)
  return found.text[LANGUAGE]
}

export const colourWordOf = (part: string): string => partOf(DICTIONARY.colourField, 'colourField', part)
export const propertyFieldWordOf = (part: string): string => partOf(DICTIONARY.propertyField, 'propertyField', part)

export const dependencyEndOf = (name: string | null, uid: number): string =>
  propertyFieldWordOf('dependencyEnd').replace('{name}', name ?? '').replace('{uid}', String(uid))

export const GROUP_ID = 'g1'

export interface Seed {
  readonly tasks: readonly Record<string, unknown>[]
  readonly visuals?: readonly Record<string, unknown>[]
  readonly resources?: readonly Record<string, unknown>[]
  readonly assignments?: readonly Record<string, unknown>[]
  readonly highlightBoxes?: readonly Record<string, unknown>[]
  readonly commentBoxes?: readonly Record<string, unknown>[]
}

export const taskOf = (uid: number, part: Record<string, unknown> = {}): Record<string, unknown> =>
  seedTaskOf(uid, part)

export const visualOf = (taskUid: number, part: Record<string, unknown> = {}): Record<string, unknown> => ({
  taskUid,
  shapeKind: null,
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  strokeWidthPx: null,
  ...part,
})

export const personOf = (uid: number, name: string): Record<string, unknown> => ({
  uid,
  name,
  resourceKind: 1,
  isCostResource: false,
  calendarUid: null,
  carry: {},
  carryElements: [],
})

export const seatOf = (uid: number, taskUid: number, resourceUid: number): Record<string, unknown> => ({
  uid,
  taskUid,
  resourceUid,
  carry: {},
  carryElements: [],
})

export const highlightBoxOf = (id: string, part: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  startDate: '2026-04-02T08:00:00',
  endDate: '2026-04-20T17:00:00',
  topGroupId: GROUP_ID,
  bottomGroupId: GROUP_ID,
  strokeColor: null,
  cornerRadiusPx: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
  ...part,
})

export const commentBoxOf = (id: string, part: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  leaderShapeKind: null,
  text: 'a note',
  anchorDate: '2026-04-08',
  anchorGroupId: GROUP_ID,
  bodyOffsetPx: null,
  strokeColor: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
  textColor: null,
  ...part,
})

export function documentOf(seed: Seed): Document {
  const built = taskGroupDocument([{ id: GROUP_ID, parentId: null }], {}, {
    tasks: seed.tasks,
    taskGroupMembers: seed.tasks.map((one) => ({ taskUid: one['uid'], groupId: GROUP_ID })),
    taskVisuals: seed.visuals ?? [],
    resources: seed.resources ?? [],
    assignments: seed.assignments ?? [],
    highlightBoxes: seed.highlightBoxes ?? [],
    commentBoxes: seed.commentBoxes ?? [],
  })
  return built as unknown as Document
}

const readingsOf = (schedule: Schedule, groupIds: readonly string[]): ScreenViewReadings =>
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
    themeHue: schedule.project.themeHue ?? 0,
    selectedGroupIds: [...groupIds],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }) as ScreenViewReadings

const sessionOf = (item: ItemRef | null, groupIds: readonly string[]): ScreenSession => {
  const selection = item === null ? emptySelection() : selectionWith(emptySelection(), item)
  return {
    ...emptyScreenSession,
    screen: {
      ...emptyScreenSession.screen,
      screenLanguage: LANGUAGE,
      helpLanguage: LANGUAGE,
      propertiesPanelContentState: { kind: 'selectionDisplayed', subject: { selection, groupIds: [...groupIds] } },
    },
  } as ScreenSession
}

export function panelOf(document: Document, item: ItemRef | null, groupIds: readonly string[] = []): PropertiesPanel {
  const selection = item === null ? emptySelection() : selectionWith(emptySelection(), item)
  const panel = propertiesPanelFromSelection(
    document.schedule,
    document.documentSettings as DocumentSettings,
    selection,
    sessionOf(item, groupIds),
    readingsOf(document.schedule, groupIds),
  )
  if (panel === null) throw new Error('premise: the panel describes the selection')
  return panel
}

export const fieldOf = (panel: PropertiesPanel, row: string): PropertyField => {
  const found = panel.fields.filter((one) => one.row === row)
  if (found.length !== 1) {
    throw new Error(`expected one field of row ${row}, got ${found.length}: ${panel.fields.map((one) => one.row).join(' ')}`)
  }
  return found[0] as PropertyField
}

export const taskItem = (uid: number): ItemRef => ({ kind: 'task', uid })

export const controlsOf = (panel: PropertiesPanel): readonly PropertyControl[] =>
  panel.fields.flatMap((field) => field.controls)

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }

export function contextOf(document: Document): InputContext {
  const settings = document.documentSettings as DocumentSettings
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(document.schedule, settings, regions)
  const geometry = geometryFromLayout(document.schedule, settings, layout, regions, emptySelection(), null)
  return {
    document,
    layout,
    geometry,
    regions,
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
    newGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  }
}

export const commandsOf = (document: Document, commit: FieldCommit): readonly DocumentCommand[] =>
  commandFromFieldCommit(commit, contextOf(document))

export const recordOf = (command: DocumentCommand): Readonly<Record<string, unknown>> =>
  command as unknown as Readonly<Record<string, unknown>>
