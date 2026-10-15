// CR-766 spec-only tests: the DocumentCommand unions carry the values table T-108 prints, under the names and columns it gives.

import { describe, expect, expectTypeOf, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type {
  Assignment,
  Calendar,
  CommentBox,
  Dependency,
  Exception,
  HighlightBox,
  Project,
  Resource,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskVisual,
  WeekDay,
} from '../../src/entity/document-model/schedule/schedule-entities'
import type { RememberedActual } from '../../src/entity/document-model/screen-state/screen-state'
import type { AnnotationAnchor, HighlightRange } from '../../src/use-case/edit-document/edit-annotation'
import type { TypedLag, WorkingDayLag } from '../../src/use-case/edit-document/edit-dependency'
import {
  editDocument,
  type DocumentCommand,
  type UnimplementedDocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits, TableView } from '../../src/use-case/edit-document/edit-document-settings'
import type { ProjectProfileFields } from '../../src/use-case/edit-document/edit-project'
import type { PasteLanding, PlanActualPlacement } from '../../src/use-case/edit-document/edit-task'
import { taskGroupDocument } from '../unit/cr-541-stage'
import { isUnimplemented, printedCommands, type PrintedCommand, type PrintedValue } from './cr-766-printed-commands'

// WHY: each carried value as table T-108 prints it, "name:role:column:flags"; a field of a shape is "value.field".
const PRINTED_VALUES = {
  setProjectTitle: ['title:column:Project.title:'],
  setProjectProfile: [
    'fields:own::',
    'fields.name:column:Project.name:optional',
    'fields.subject:column:Project.subject:optional',
    'fields.category:column:Project.category:optional',
    'fields.company:column:Project.company:optional',
    'fields.manager:column:Project.manager:optional',
    'fields.author:column:Project.author:optional',
    'fields.revision:column:Project.revision:optional',
    'fields.startDate:column:Project.startDate:optional',
  ],
  setStatusDate: ['date:column:Project.statusDate:nonNull'],
  clearStatusDate: [],
  setThemeHue: ['hue:column:Project.themeHue:'],
  setParentProgressTolerance: ['workingDays:column:Project.parentProgressToleranceDays:'],
  setScheduleDataTimeZone: ['timeZone:column:Project.scheduleDataTimeZone:'],
  shiftScheduleTimes: ['minutes:own::'],
  shiftScheduleToStartDate: ['newStartDate:own::'],
  createTask: [
    'shapeKind:column:TaskVisual.shapeKind:nonNull',
    'start:column:Task.start:nonNull',
    'finish:column:Task.finish:nonNull',
    'groupId:column:TaskGroupMember.groupId:',
  ],
  deleteTask: ['uid:key:Task.uid:'],
  pasteTasks: [
    'sourceUids:key:Task.uid:many',
    'landing:own::optional',
    'landing.shiftMinutes:own::',
    'landing.groupIdOf:own::',
  ],
  setTaskName: ['uid:key:Task.uid:', 'name:column:Task.name:'],
  setTaskNotes: ['uid:key:Task.uid:', 'notes:column:Task.notes:'],
  setTaskPlanDates: [
    'uid:key:Task.uid:',
    'start:column:Task.start:nonNull',
    'finish:column:Task.finish:nonNull',
  ],
  setTaskDeadline: ['uid:key:Task.uid:', 'deadline:column:Task.deadline:'],
  setTaskPlanActualState: ['uid:key:Task.uid:', 'place:own::'],
  beginTaskActual: [
    'uid:key:Task.uid:',
    'grabbed:own::',
    'released:own::',
    'released.start:own::',
    'released.finish:own::',
    'snapMinutes:own::',
  ],
  cycleTaskPlanActualState: [
    'uid:key:Task.uid:',
    'remembered:own::',
    'remembered.actualStart:column:Task.actualStart:',
    'remembered.actualFinish:column:Task.actualFinish:',
    'remembered.stop:column:Task.stop:',
    'remembered.carriedActualDuration:own::',
    'snapMinutes:own::optional',
  ],
  setTaskFadeInDays: ['uid:key:Task.uid:', 'days:column:Task.fadeInDays:'],
  setTaskFadeOutDays: ['uid:key:Task.uid:', 'days:column:Task.fadeOutDays:'],
  setTaskParentTask: ['uid:key:Task.uid:', 'parentUid:column:Task.parentTaskUid:'],
  moveTaskToTaskGroup: ['uid:key:Task.uid:', 'groupId:column:TaskGroupMember.groupId:'],
  setTaskVisualShapeKind: ['uid:key:Task.uid:', 'shapeKind:column:TaskVisual.shapeKind:nonNull'],
  setTaskVisualMilestoneGlyph: ['uid:key:Task.uid:', 'glyph:column:TaskVisual.milestoneGlyph:'],
  setTaskVisualColors: [
    'uid:key:Task.uid:',
    'fillColor:column:TaskVisual.fillColor:',
    'strokeColor:column:TaskVisual.strokeColor:',
  ],
  resetTaskVisualColors: ['uid:key:Task.uid:'],
  setTaskVisualStrokeWidth: ['uid:key:Task.uid:', 'strokeWidthPx:column:TaskVisual.strokeWidthPx:'],
  createTaskGroup: [
    'id:column:TaskGroup.id:',
    'parentId:column:TaskGroup.parentId:',
    'label:column:TaskGroup.label:',
    'derivedFromTaskUid:column:TaskGroup.derivedFromTaskUid:',
    'order:column:TaskGroup.order:',
  ],
  deleteTaskGroup: ['groupId:key:TaskGroup.id:', 'newGroupId:own::'],
  pasteTaskGroupSubtree: [
    'sourceGroupId:key:TaskGroup.id:',
    'targetGroupId:column:TaskGroup.parentId:',
    'newGroupIds:own::',
  ],
  setTaskGroupLabel: ['groupId:key:TaskGroup.id:', 'label:column:TaskGroup.label:'],
  setTaskGroupColor: ['groupId:key:TaskGroup.id:', 'color:column:TaskGroup.color:nonNull'],
  resetTaskGroupColor: ['groupId:key:TaskGroup.id:'],
  setTaskGroupMinHeight: ['groupId:key:TaskGroup.id:', 'minHeight:column:TaskGroup.minHeight:'],
  reorderTaskGroupSiblings: ['parentId:key:TaskGroup.parentId:', 'orderedIds:key:TaskGroup.id:many'],
  createDependency: [
    'predecessorUid:column:Dependency.predecessorUid:',
    'successorUid:key:Task.uid:',
    'predecessorEdge:own::',
    'successorEdge:own::',
  ],
  deleteDependency: ['predecessorUid:key:Dependency.predecessorUid:', 'successorUid:key:Task.uid:'],
  deleteDependencyAt: [
    'predecessorUid:key:Dependency.predecessorUid:',
    'successorUid:key:Task.uid:',
    'order:own::',
  ],
  setDependencyLag: [
    'predecessorUid:key:Dependency.predecessorUid:',
    'successorUid:key:Task.uid:',
    'lagWorkingDays:own::',
    'lagMinutes:own::',
    'lagUnit:own::',
  ],
  setCalendar: [
    'workingDayTypes:column:WeekDay.dayType:optional,nonNull,many',
    'weekStartDay:column:Project.weekStartDay:optional',
    'exceptions:column:Calendar.exceptions:optional',
    'workingTimes:own::optional',
  ],
  createResource: ['name:column:Resource.name:'],
  setResourceName: ['uid:key:Resource.uid:', 'name:column:Resource.name:'],
  deleteResource: ['uids:key:Resource.uid:many'],
  deleteUnreferencedResources: [],
  createAssignment: [
    'taskUid:column:Assignment.taskUid:nonNull',
    'resourceUid:column:Assignment.resourceUid:nonNull',
  ],
  unassignResource: [
    'taskUid:key:Assignment.taskUid:nonNull',
    'resourceUid:key:Assignment.resourceUid:nonNull',
  ],
  createCommentBox: [
    'id:column:CommentBox.id:',
    'anchor:own::',
    'anchor.date:column:CommentBox.anchorDate:nonNull',
    'anchor.groupId:column:CommentBox.anchorGroupId:nonNull',
  ],
  deleteCommentBox: ['id:key:CommentBox.id:'],
  setCommentBoxText: ['id:key:CommentBox.id:', 'text:column:CommentBox.text:'],
  setCommentBoxLeaderShapeKind: [
    'id:key:CommentBox.id:',
    'leaderShapeKind:column:CommentBox.leaderShapeKind:nonNull',
  ],
  setCommentBoxAnchor: [
    'id:key:CommentBox.id:',
    'anchor:own::',
    'anchor.date:column:CommentBox.anchorDate:nonNull',
    'anchor.groupId:column:CommentBox.anchorGroupId:nonNull',
  ],
  setCommentBoxBodyOffsetPx: ['id:key:CommentBox.id:', 'dx:own::', 'dy:own::'],
  setCommentBoxStrokeColor: ['id:key:CommentBox.id:', 'strokeColor:column:CommentBox.strokeColor:'],
  setCommentBoxStrokeWidth: ['id:key:CommentBox.id:', 'strokeWidthPx:column:CommentBox.strokeWidthPx:'],
  setCommentBoxFillColor: ['id:key:CommentBox.id:', 'fillColor:column:CommentBox.fillColor:'],
  setCommentBoxFillTransparency: [
    'id:key:CommentBox.id:',
    'fillTransparencyPercent:column:CommentBox.fillTransparencyPercent:',
  ],
  setCommentBoxTextColor: ['id:key:CommentBox.id:', 'textColor:column:CommentBox.textColor:'],
  createHighlightBox: [
    'id:column:HighlightBox.id:',
    'range:own::',
    'range.startDate:column:HighlightBox.startDate:nonNull',
    'range.endDate:column:HighlightBox.endDate:nonNull',
    'range.topGroupId:column:HighlightBox.topGroupId:nonNull',
    'range.bottomGroupId:column:HighlightBox.bottomGroupId:nonNull',
  ],
  deleteHighlightBox: ['id:key:HighlightBox.id:'],
  setHighlightBoxRange: [
    'id:key:HighlightBox.id:',
    'range:own::',
    'range.startDate:column:HighlightBox.startDate:nonNull',
    'range.endDate:column:HighlightBox.endDate:nonNull',
    'range.topGroupId:column:HighlightBox.topGroupId:nonNull',
    'range.bottomGroupId:column:HighlightBox.bottomGroupId:nonNull',
  ],
  setHighlightBoxStrokeColor: ['id:key:HighlightBox.id:', 'strokeColor:column:HighlightBox.strokeColor:'],
  setHighlightBoxStrokeWidth: ['id:key:HighlightBox.id:', 'strokeWidthPx:column:HighlightBox.strokeWidthPx:'],
  setHighlightBoxFillColor: ['id:key:HighlightBox.id:', 'fillColor:column:HighlightBox.fillColor:'],
  setHighlightBoxFillTransparency: [
    'id:key:HighlightBox.id:',
    'fillTransparencyPercent:column:HighlightBox.fillTransparencyPercent:',
  ],
  setStackDirection: ['direction:column:stackDirection:'],
  setElementVisible: ['element:own::', 'visible:own::'],
  setFontScale: ['scale:column:fontScale:'],
  setThemeMonochrome: ['monochrome:column:themeMonochrome:'],
  setZoom: ['zoomX:column:zoomX:', 'zoomY:column:zoomY:'],
  setScrollPosition: [
    'scrollDate:column:scrollDate:',
    'scrollGroupId:column:scrollGroupId:',
    'scrollDayOffset:column:scrollDayOffset:',
    'scrollGroupOffset:column:scrollGroupOffset:',
  ],
  setTaskGroupPanelWidth: ['taskGroupPanelWidth:column:taskGroupPanelWidth:'],
  pinTaskGroup: ['groupId:key:TaskGroup.id:'],
  unpinTaskGroup: ['groupId:key:TaskGroup.id:'],
  fitScheduleToScreen: [
    'zoomX:column:zoomX:',
    'zoomY:column:zoomY:',
    'scrollDate:column:scrollDate:',
    'scrollGroupId:column:scrollGroupId:',
    'scrollDayOffset:column:scrollDayOffset:',
    'scrollGroupOffset:column:scrollGroupOffset:',
  ],
  resetTaskGroupTreeStates: [],
  moveTaskGroup: [
    'groupId:key:TaskGroup.id:',
    'parentId:column:TaskGroup.parentId:',
    'order:column:TaskGroup.order:',
  ],
  setDisplayScale: ['scale:column:displayScale:'],
  setFitSpan: ['fitSpanStart:column:fitSpanStart:', 'fitSpanFinish:column:fitSpanFinish:'],
  clearFitSpan: [],
  setFitSpanFixed: ['fitSpanFixed:column:fitSpanFixed:', 'shownStart:own::', 'shownFinish:own::'],
  setTaskGroupPanelWidthFixed: ['taskGroupPanelWidthFixed:column:taskGroupPanelWidthFixed:'],
  setTableView: [
    'table:own::',
    'view:own::',
    'view.visibility:own::',
    'view.columnFilters:own::',
    'view.sort:own::',
  ],
  setViewTimeZone: ['timeZone:own::'],
  setDisplayTimeZones: ['timeZones:column:displayTimeZones:'],
  setShowsTimeOfDay: ['showsTimeOfDay:column:showsTimeOfDay:'],
  setTaskGroupTreeState: ['groupId:key:TaskGroup.id:', 'treeState:column:TaskGroup.treeState:'],
  setTaskGroupEditGroup: ['groupId:key:TaskGroup.id:', 'editGroup:column:TaskGroup.editGroup:'],
  setLevelZeroTreeState: ['levelZeroTreeState:column:levelZeroTreeState:'],
} as const

const { commands } = printedCommands()

const flagsOf = (value: PrintedValue): string =>
  [value.optional ? 'optional' : '', value.nonNull ? 'nonNull' : '', value.many ? 'many' : ''].filter(Boolean).join(',')
const lineOf = (name: string, value: PrintedValue): string => `${name}:${value.role}:${value.writes ?? ''}:${flagsOf(value)}`

// WHY: the same reading the constant above was written from -- the top values, the fields of a shape one level down
// (not of a T-019 alternative), and the fields of each shape of a choice as values of the command itself.
const linesOf = (command: PrintedCommand): string[] => [
  ...command.values.flatMap((value) => [
    lineOf(value.name, value),
    ...value.fields.map((field) => lineOf(`${value.name}.${field.name}`, field)),
  ]),
  ...(command.choice?.shapes.flatMap((shape) => shape.fields.map((field) => lineOf(field.name, field))) ?? []),
]

interface Entities {
  readonly Project: Project
  readonly Task: Task
  readonly Dependency: Dependency
  readonly TaskGroup: TaskGroup
  readonly TaskGroupMember: TaskGroupMember
  readonly Calendar: Calendar
  readonly WeekDay: WeekDay
  readonly Exception: Exception
  readonly Resource: Resource
  readonly Assignment: Assignment
  readonly TaskVisual: TaskVisual
  readonly CommentBox: CommentBox
  readonly HighlightBox: HighlightBox
}

type Printed = typeof PRINTED_VALUES
type Kind = DocumentCommand['kind']
type CommandOf<K> = Extract<DocumentCommand, { readonly kind: K }>
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type KeysOf<U> = U extends unknown ? Exclude<keyof U, 'kind'> : never
type OptionalKeysOf<U> = U extends unknown
  ? { [P in keyof U]-?: Record<never, never> extends Pick<U, P> ? P : never }[keyof U]
  : never
type FieldOf<U, F> = U extends unknown ? (F extends keyof U ? Required<U>[F] : never) : never
type ValueAt<K, N> = N extends `${infer P}.${infer F}` ? FieldOf<NonNullable<FieldOf<CommandOf<K>, P>>, F> : FieldOf<CommandOf<K>, N>

type LineName<L> = L extends `${infer N}:${string}` ? N : never
type TopName<L> = L extends unknown ? (LineName<L> extends `${string}.${string}` ? never : LineName<L>) : never
type OptionalTopName<L> = L extends `${string}:${string}:${string}:${infer F}`
  ? F extends `${string}optional${string}`
    ? TopName<L>
    : never
  : never

type ColumnType<W> = W extends `${infer E}.${infer C}`
  ? E extends keyof Entities
    ? C extends keyof Entities[E]
      ? Entities[E][C]
      : `no column ${C}`
    : `no entity ${E}`
  : W extends keyof DocumentSettings
    ? DocumentSettings[W]
    : `no setting ${W & string}`
type Wanted<W, F> = F extends `${string}many${string}`
  ? readonly (F extends `${string}nonNull${string}` ? NonNullable<ColumnType<W>> : ColumnType<W>)[]
  : F extends `${string}nonNull${string}`
    ? NonNullable<ColumnType<W>>
    : ColumnType<W>

type NameMismatch = {
  [K in Kind]: K extends keyof Printed ? (Equal<KeysOf<CommandOf<K>>, TopName<Printed[K][number]>> extends true ? never : K) : K
}[Kind]
type OptionalMismatch = {
  [K in Kind]: K extends keyof Printed
    ? Equal<OptionalKeysOf<CommandOf<K>>, OptionalTopName<Printed[K][number]>> extends true
      ? never
      : K
    : K
}[Kind]
type ColumnMismatchOf<K, L> = L extends `${infer N}:${infer R}:${infer W}:${infer F}`
  ? R extends 'own'
    ? never
    : Equal<ValueAt<K, N>, Wanted<W, F>> extends true
      ? never
      : `${K & string} ${N}`
  : never
type ColumnMismatch = { [K in keyof Printed]: ColumnMismatchOf<K, Printed[K][number]> }[keyof Printed]

describe('the constant these type checks read is table T-108 as printed', () => {
  it('it names the 89 commands of the table, in its order', () => {
    expect(Object.keys(PRINTED_VALUES)).toEqual(commands.map((command) => command.name))
  })

  it.each(commands.map((command) => [command.id, command.name, command] as const))('%s %s', (_id, name, command) => {
    expect([...(PRINTED_VALUES as Record<string, readonly string[]>)[name] ?? []]).toEqual(linesOf(command))
  })
})

describe('DocumentCommand is the union of the 89 commands of table T-108', () => {
  it('the kinds are exactly the printed command names', () => {
    expectTypeOf<Kind>().toEqualTypeOf<keyof Printed>()
  })

  it('every command carries exactly the values its row names, the optional ones optional', () => {
    expectTypeOf<NameMismatch>().toEqualTypeOf<never>()
    expectTypeOf<OptionalMismatch>().toEqualTypeOf<never>()
  })

  it('a value that is a key or writes a column is typed by that column (narrowed where the table says null is not taken)', () => {
    expectTypeOf<ColumnMismatch>().toEqualTypeOf<never>()
  })

  it('the shapes are exported under the names the table gives, as the commands carry them', () => {
    expectTypeOf<AnnotationAnchor>().toEqualTypeOf<FieldOf<CommandOf<'createCommentBox'>, 'anchor'>>()
    expectTypeOf<HighlightRange>().toEqualTypeOf<FieldOf<CommandOf<'createHighlightBox'>, 'range'>>()
    expectTypeOf<PasteLanding>().toEqualTypeOf<FieldOf<CommandOf<'pasteTasks'>, 'landing'>>()
    expectTypeOf<PlanActualPlacement>().toEqualTypeOf<FieldOf<CommandOf<'setTaskPlanActualState'>, 'place'>>()
    expectTypeOf<ProjectProfileFields>().toEqualTypeOf<FieldOf<CommandOf<'setProjectProfile'>, 'fields'>>()
    expectTypeOf<TableView>().toEqualTypeOf<FieldOf<CommandOf<'setTableView'>, 'view'>>()
    expectTypeOf<RememberedActual | null>().toEqualTypeOf<FieldOf<CommandOf<'cycleTaskPlanActualState'>, 'remembered'>>()
    expectTypeOf<keyof WorkingDayLag>().toEqualTypeOf<'lagWorkingDays'>()
    expectTypeOf<keyof TypedLag>().toEqualTypeOf<'lagMinutes' | 'lagUnit'>()
  })

  it('the two lag shapes are the ones the table prints for CM-38', () => {
    const lag = commands.find((command) => command.id === 'CM-38')
    expect(lag?.choice?.shapes.map((shape) => [shape.name, shape.fields.map((field) => field.name)])).toEqual([
      ['WorkingDayLag', ['lagWorkingDays']],
      ['TypedLag', ['lagMinutes', 'lagUnit']],
    ])
  })

  it('a T-019 alternative of PlanActualPlacement holds the columns its row prints', () => {
    const place = commands.find((command) => command.id === 'CM-13')?.values.find((value) => value.name === 'place')
    expect(place?.variants.map((variant) => variant.tag)).toEqual(['PA-1', 'PA-2', 'PA-3', 'PA-4', 'PA-5'])
    expectTypeOf<keyof Extract<PlanActualPlacement, { row: 'PA-3' }>>().toEqualTypeOf<'row' | 'actualStart' | 'stop' | 'resume'>()
    expectTypeOf<keyof Extract<PlanActualPlacement, { row: 'PA-5' }>>().toEqualTypeOf<'row' | 'actualStart' | 'actualFinish'>()
  })
})

describe('CM-76: the union holds it as not implemented, and a write of it is refused', () => {
  const GROUP = 'aaaaaaaa-0000-4000-8000-000000000001'
  const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

  it('UnimplementedDocumentCommand is CM-76 setTaskGroupEditGroup, the one row the table marks as not implemented', () => {
    expectTypeOf<UnimplementedDocumentCommand['kind']>().toEqualTypeOf<'setTaskGroupEditGroup'>()
    expect(commands.filter(isUnimplemented).map((command) => command.name)).toEqual(['setTaskGroupEditGroup'])
  })

  it('editing the document with it refuses under table T-108 and leaves the document as it was', () => {
    const document = taskGroupDocument([{ id: GROUP, parentId: null }]) as unknown as Document
    const command: DocumentCommand = { kind: 'setTaskGroupEditGroup', groupId: GROUP, editGroup: null }
    const result = editDocument(document, command, LIMITS, 'row')
    expect(JSON.stringify(result)).toContain('T-108')
    expect(JSON.stringify(result)).toContain('setTaskGroupEditGroup')
    expect(document.schedule.taskGroups[0]?.editGroup ?? null).toBeNull()
  })
})
