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
  setStatusDate: ['statusDate:column:Project.statusDate:nonNull'],
  clearStatusDate: [],
  setThemeHue: ['themeHue:column:Project.themeHue:'],
  setParentTaskProgressToleranceDays: ['parentTaskProgressToleranceDays:column:Project.parentTaskProgressToleranceDays:'],
  setScheduleDataTimeZone: ['scheduleDataTimeZone:column:Project.scheduleDataTimeZone:'],
  shiftScheduleTimes: ['minutes:own::'],
  shiftScheduleToStartDate: ['newStartDate:own::'],
  createTask: [
    'shapeKind:column:TaskVisual.shapeKind:nonNull',
    'start:column:Task.start:nonNull',
    'finish:column:Task.finish:nonNull',
    'taskGroupId:column:TaskGroupMember.taskGroupId:',
  ],
  deleteTask: ['taskUid:key:Task.uid:'],
  pasteTasks: [
    'sourceUids:key:Task.uid:many',
    'landing:own::optional',
    'landing.shiftMinutes:own::',
    'landing.taskGroupIdOf:own::',
  ],
  setTaskName: ['taskUid:key:Task.uid:', 'name:column:Task.name:'],
  setTaskNotes: ['taskUid:key:Task.uid:', 'notes:column:Task.notes:'],
  setTaskPlanDates: [
    'taskUid:key:Task.uid:',
    'start:column:Task.start:nonNull',
    'finish:column:Task.finish:nonNull',
  ],
  setTaskDeadline: ['taskUid:key:Task.uid:', 'deadline:column:Task.deadline:'],
  setTaskPlanActualState: ['taskUid:key:Task.uid:', 'place:own::'],
  beginTaskActual: [
    'taskUid:key:Task.uid:',
    'grabbed:own::',
    'released:own::',
    'released.start:own::',
    'released.finish:own::',
    'snapMinutes:own::',
  ],
  cycleTaskPlanActualState: [
    'taskUid:key:Task.uid:',
    'remembered:own::',
    'remembered.actualStart:column:Task.actualStart:',
    'remembered.actualFinish:column:Task.actualFinish:',
    'remembered.stop:column:Task.stop:',
    'remembered.carriedActualDuration:own::',
    'snapMinutes:own::optional',
  ],
  setTaskFadeInDays: ['taskUid:key:Task.uid:', 'fadeInDays:column:Task.fadeInDays:'],
  setTaskFadeOutDays: ['taskUid:key:Task.uid:', 'fadeOutDays:column:Task.fadeOutDays:'],
  setTaskParentTask: ['taskUid:key:Task.uid:', 'parentTaskUid:column:Task.parentTaskUid:'],
  moveTaskToTaskGroup: ['taskUid:key:Task.uid:', 'taskGroupId:column:TaskGroupMember.taskGroupId:'],
  setTaskVisualShapeKind: ['taskUid:key:Task.uid:', 'shapeKind:column:TaskVisual.shapeKind:nonNull'],
  setTaskVisualMilestoneGlyph: ['taskUid:key:Task.uid:', 'milestoneGlyph:column:TaskVisual.milestoneGlyph:'],
  setTaskVisualColors: [
    'taskUid:key:Task.uid:',
    'fillColor:column:TaskVisual.fillColor:',
    'strokeColor:column:TaskVisual.strokeColor:',
  ],
  resetTaskVisualColors: ['taskUid:key:Task.uid:'],
  setTaskVisualStrokeWidthPx: ['taskUid:key:Task.uid:', 'strokeWidthPx:column:TaskVisual.strokeWidthPx:'],
  createTaskGroup: [
    'id:column:TaskGroup.id:',
    'parentId:column:TaskGroup.parentId:',
    'name:column:TaskGroup.name:',
    'derivedFromTaskUid:column:TaskGroup.derivedFromTaskUid:',
    'order:column:TaskGroup.order:',
  ],
  deleteTaskGroup: ['taskGroupId:key:TaskGroup.id:', 'newTaskGroupId:own::'],
  pasteTaskGroupSubtree: [
    'sourceTaskGroupId:key:TaskGroup.id:',
    'parentId:column:TaskGroup.parentId:',
    'newTaskGroupIds:own::',
  ],
  setTaskGroupName: ['taskGroupId:key:TaskGroup.id:', 'name:column:TaskGroup.name:'],
  setTaskGroupColor: ['taskGroupId:key:TaskGroup.id:', 'color:column:TaskGroup.color:nonNull'],
  resetTaskGroupColor: ['taskGroupId:key:TaskGroup.id:'],
  setTaskGroupMinHeightPx: ['taskGroupId:key:TaskGroup.id:', 'minHeightPx:column:TaskGroup.minHeightPx:'],
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
  setResourceName: ['resourceUid:key:Resource.uid:', 'name:column:Resource.name:'],
  deleteResources: ['resourceUids:key:Resource.uid:many'],
  deleteUnreferencedResources: [],
  createAssignment: [
    'taskUid:column:Assignment.taskUid:nonNull',
    'resourceUid:column:Assignment.resourceUid:nonNull',
  ],
  deleteAssignment: [
    'taskUid:key:Assignment.taskUid:nonNull',
    'resourceUid:key:Assignment.resourceUid:nonNull',
  ],
  createCommentBox: [
    'commentBoxId:column:CommentBox.id:',
    'anchor:own::',
    'anchor.date:column:CommentBox.anchorDate:nonNull',
    'anchor.taskGroupId:column:CommentBox.anchorTaskGroupId:nonNull',
    'anchor.bandFraction:column:CommentBox.anchorBandFraction:optional',
    'anchor.taskUid:column:CommentBox.anchorTaskUid:optional',
    'anchor.taskFigure:column:CommentBox.anchorTaskFigure:optional',
    'anchor.highlightBoxId:column:CommentBox.anchorHighlightBoxId:optional',
    'anchor.snapPoint:column:CommentBox.anchorSnapPoint:optional',
  ],
  deleteCommentBox: ['commentBoxId:key:CommentBox.id:'],
  setCommentBoxText: ['commentBoxId:key:CommentBox.id:', 'text:column:CommentBox.text:'],
  setCommentBoxLeaderShapeKind: [
    'commentBoxId:key:CommentBox.id:',
    'leaderShapeKind:column:CommentBox.leaderShapeKind:nonNull',
  ],
  setCommentBoxAnchor: [
    'commentBoxId:key:CommentBox.id:',
    'anchor:own::',
    'anchor.date:column:CommentBox.anchorDate:nonNull',
    'anchor.taskGroupId:column:CommentBox.anchorTaskGroupId:nonNull',
    'anchor.bandFraction:column:CommentBox.anchorBandFraction:optional',
    'anchor.taskUid:column:CommentBox.anchorTaskUid:optional',
    'anchor.taskFigure:column:CommentBox.anchorTaskFigure:optional',
    'anchor.highlightBoxId:column:CommentBox.anchorHighlightBoxId:optional',
    'anchor.snapPoint:column:CommentBox.anchorSnapPoint:optional',
  ],
  setCommentBoxBodyOffsetPx: ['commentBoxId:key:CommentBox.id:', 'dx:own::', 'dy:own::'],
  setCommentBoxStrokeColor: ['commentBoxId:key:CommentBox.id:', 'strokeColor:column:CommentBox.strokeColor:'],
  setCommentBoxStrokeWidthPx: ['commentBoxId:key:CommentBox.id:', 'strokeWidthPx:column:CommentBox.strokeWidthPx:'],
  setCommentBoxFillColor: ['commentBoxId:key:CommentBox.id:', 'fillColor:column:CommentBox.fillColor:'],
  setCommentBoxFillTransparencyPercent: [
    'commentBoxId:key:CommentBox.id:',
    'fillTransparencyPercent:column:CommentBox.fillTransparencyPercent:',
  ],
  setCommentBoxTextColor: ['commentBoxId:key:CommentBox.id:', 'textColor:column:CommentBox.textColor:'],
  setCommentBoxFontSizePx: ['commentBoxId:key:CommentBox.id:', 'fontSizePx:column:CommentBox.fontSizePx:'],
  bringCommentBoxToFront: ['commentBoxId:key:CommentBox.id:'],
  createHighlightBox: [
    'highlightBoxId:column:HighlightBox.id:',
    'range:own::',
    'range.start:column:HighlightBox.start:nonNull',
    'range.finish:column:HighlightBox.finish:nonNull',
    'range.topTaskGroupId:column:HighlightBox.topTaskGroupId:nonNull',
    'range.bottomTaskGroupId:column:HighlightBox.bottomTaskGroupId:nonNull',
  ],
  deleteHighlightBox: ['highlightBoxId:key:HighlightBox.id:'],
  setHighlightBoxRange: [
    'highlightBoxId:key:HighlightBox.id:',
    'range:own::',
    'range.start:column:HighlightBox.start:nonNull',
    'range.finish:column:HighlightBox.finish:nonNull',
    'range.topTaskGroupId:column:HighlightBox.topTaskGroupId:nonNull',
    'range.bottomTaskGroupId:column:HighlightBox.bottomTaskGroupId:nonNull',
  ],
  setHighlightBoxStrokeColor: ['highlightBoxId:key:HighlightBox.id:', 'strokeColor:column:HighlightBox.strokeColor:'],
  setHighlightBoxStrokeWidthPx: ['highlightBoxId:key:HighlightBox.id:', 'strokeWidthPx:column:HighlightBox.strokeWidthPx:'],
  setHighlightBoxFillColor: ['highlightBoxId:key:HighlightBox.id:', 'fillColor:column:HighlightBox.fillColor:'],
  setHighlightBoxFillTransparencyPercent: [
    'highlightBoxId:key:HighlightBox.id:',
    'fillTransparencyPercent:column:HighlightBox.fillTransparencyPercent:',
  ],
  bringHighlightBoxToFront: ['highlightBoxId:key:HighlightBox.id:'],
  setStackDirection: ['stackDirection:column:stackDirection:'],
  setVisibilitySetting: ['setting:own::', 'isVisible:own::'],
  setFontSizeStep: ['fontSizeStep:column:fontSizeStep:'],
  setThemeMonochrome: ['isThemeMonochrome:column:isThemeMonochrome:'],
  setZoom: ['zoomX:column:zoomX:', 'zoomY:column:zoomY:'],
  setScrollPosition: [
    'scrollDate:column:scrollDate:',
    'scrollTaskGroupId:column:scrollTaskGroupId:',
    'scrollDateFraction:column:scrollDateFraction:',
    'scrollTaskGroupFraction:column:scrollTaskGroupFraction:',
  ],
  setTaskGroupPanelWidthPx: ['taskGroupPanelWidthPx:column:taskGroupPanelWidthPx:'],
  pinTaskGroup: ['taskGroupId:key:TaskGroup.id:'],
  unpinTaskGroup: ['taskGroupId:key:TaskGroup.id:'],
  fitScheduleToScreen: [
    'zoomX:column:zoomX:',
    'zoomY:column:zoomY:',
    'scrollDate:column:scrollDate:',
    'scrollTaskGroupId:column:scrollTaskGroupId:',
    'scrollDateFraction:column:scrollDateFraction:',
    'scrollTaskGroupFraction:column:scrollTaskGroupFraction:',
  ],
  fitScheduleToScreenOnPage: [],
  resetTaskGroupTreeStates: [],
  moveTaskGroup: [
    'taskGroupId:key:TaskGroup.id:',
    'parentId:column:TaskGroup.parentId:',
    'order:column:TaskGroup.order:',
  ],
  setDisplayScale: ['displayScale:column:displayScale:'],
  setFitSpan: ['fitSpanStart:column:fitSpanStart:', 'fitSpanFinish:column:fitSpanFinish:'],
  clearFitSpan: [],
  setFitSpanFixed: ['isFitSpanFixed:column:isFitSpanFixed:', 'shownStart:own::', 'shownFinish:own::'],
  setTaskGroupPanelWidthFixed: ['isTaskGroupPanelWidthFixed:column:isTaskGroupPanelWidthFixed:'],
  setTableView: [
    'table:own::',
    'view:own::',
    'view.visibility:own::',
    'view.columnFilters:own::',
    'view.sort:own::',
  ],
  setViewTimeZone: ['viewTimeZone:own::'],
  setDisplayTimeZones: ['displayTimeZones:column:displayTimeZones:'],
  setTimeOfDayVisible: ['isTimeOfDayVisible:column:isTimeOfDayVisible:'],
  setTaskGroupTreeState: ['taskGroupId:key:TaskGroup.id:', 'treeState:column:TaskGroup.treeState:'],
  setTaskGroupEditPermission: ['taskGroupId:key:TaskGroup.id:', 'editPermission:column:TaskGroup.editPermission:'],
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
  it('it names the 93 commands of the table, in its order', () => {
    expect(Object.keys(PRINTED_VALUES)).toEqual(commands.map((command) => command.name))
  })

  it.each(commands.map((command) => [command.id, command.name, command] as const))('%s %s', (_id, name, command) => {
    expect([...(PRINTED_VALUES as Record<string, readonly string[]>)[name] ?? []]).toEqual(linesOf(command))
  })
})

describe('DocumentCommand is the union of the 93 commands of table T-108', () => {
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
    expect(place?.variants.map((variant) => variant.tag)).toEqual(['notStarted', 'inProgress', 'suspendedWithResumeDate', 'suspendedWithoutResumeDate', 'finished'])
    expectTypeOf<keyof Extract<PlanActualPlacement, { state: 'suspendedWithResumeDate' }>>().toEqualTypeOf<'state' | 'actualStart' | 'stop' | 'resume'>()
    expectTypeOf<keyof Extract<PlanActualPlacement, { state: 'finished' }>>().toEqualTypeOf<'state' | 'actualStart' | 'actualFinish'>()
  })
})

describe('CM-76: the union holds it as not implemented, and a write of it is refused', () => {
  const GROUP = 'aaaaaaaa-0000-4000-8000-000000000001'
  const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

  it('UnimplementedDocumentCommand is CM-76 setTaskGroupEditPermission, the one row the table marks as not implemented', () => {
    expectTypeOf<UnimplementedDocumentCommand['kind']>().toEqualTypeOf<'setTaskGroupEditPermission'>()
    expect(commands.filter(isUnimplemented).map((command) => command.name)).toEqual(['setTaskGroupEditPermission'])
  })

  it('editing the document with it refuses under table T-108 and leaves the document as it was', () => {
    const document = taskGroupDocument([{ id: GROUP, parentId: null }]) as unknown as Document
    const command: DocumentCommand = { kind: 'setTaskGroupEditPermission', taskGroupId: GROUP, editPermission: null }
    const result = editDocument(document, command, LIMITS, 'row')
    expect(JSON.stringify(result)).toContain('T-108')
    expect(JSON.stringify(result)).toContain('setTaskGroupEditPermission')
    expect(document.schedule.taskGroups[0]?.editPermission ?? null).toBeNull()
  })
})
